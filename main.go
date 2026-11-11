package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"time"

	"embsay/internal/datasource"
	"embsay/internal/engine"
	"embsay/internal/server"
	"embsay/internal/store"
)

//go:embed web
var embeddedWeb embed.FS

//go:embed config/config.example.yaml config/divisions.yaml config/data_sources.yaml config/symbols.yaml config/cache.yaml config/price_cache.yaml examples/plaid_strategy.yaml examples/pure_xeqt.yaml examples/vab_30_veqt_70.yaml examples/vab_30_xeqt_70.yaml examples/zag_30_zeqt_70.yaml
var embeddedDefaults embed.FS

func exitWithError(format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	log.Println(msg)
	if runtime.GOOS == "windows" {
		fmt.Printf("\nPress Enter to exit...")
		var b [1]byte
		_, _ = os.Stdin.Read(b[:])
	}
	os.Exit(1)
}

func createListener(preferredAddr string) (net.Listener, string, error) {
	// Try preferred address first
	l, err := net.Listen("tcp", preferredAddr)
	if err == nil {
		return l, preferredAddr, nil
	}

	host, portStr, splitErr := net.SplitHostPort(preferredAddr)
	if splitErr != nil {
		host = "localhost"
		portStr = "8080"
	}
	if host == "" {
		host = "localhost"
	}

	startPort, _ := strconv.Atoi(portStr)
	if startPort <= 0 {
		startPort = 8080
	}

	// Try next 20 ports in sequence (e.g. 8081..8100)
	for p := startPort + 1; p <= startPort+20; p++ {
		candidate := fmt.Sprintf("%s:%d", host, p)
		if l, err := net.Listen("tcp", candidate); err == nil {
			return l, candidate, nil
		}
	}

	// Dynamic fallback
	l, err = net.Listen("tcp", fmt.Sprintf("%s:0", host))
	if err != nil {
		return nil, "", err
	}
	return l, l.Addr().String(), nil
}

func main() {
	addr := flag.String("addr", "localhost:8080", "HTTP listen address")
	baseDir := flag.String("dir", ".", "Base directory containing config/ and portfolios/ YAML files")
	noBrowser := flag.Bool("no-browser", false, "Disable automatic browser launch on startup")
	flag.Parse()

	dir := *baseDir
	if dir == "." {
		if _, err := os.Stat(filepath.Join(".", "config", "divisions.yaml")); os.IsNotExist(err) {
			if exePath, err := os.Executable(); err == nil {
				exeDir := filepath.Dir(exePath)
				if _, err := os.Stat(filepath.Join(exeDir, "config", "divisions.yaml")); err == nil {
					dir = exeDir
				} else if _, err := os.Stat(filepath.Join(exeDir, "examples")); err == nil {
					dir = exeDir
				}
			}
		}
	}

	if err := store.EnsureDefaultConfigs(dir, embeddedDefaults); err != nil {
		exitWithError("Failed to initialize default config files in %q: %v", dir, err)
	}

	st, err := store.NewStore(dir)
	if err != nil {
		exitWithError("Failed to initialize YAML store in %q: %v", dir, err)
	}

	fetcher := datasource.NewFetcher()
	svc := engine.NewService(st, fetcher)
	svc.StartPriceAutoRefresh()
	svc.StartWeeklyBackupScheduler()

	webFS, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		exitWithError("Failed to mount embedded web assets: %v", err)
	}

	srv := server.NewServer(svc, webFS)

	listener, actualAddr, err := createListener(*addr)
	if err != nil {
		exitWithError("Failed to bind network port: %v", err)
	}

	srv.SetOnExit(func() {
		_ = listener.Close()
		os.Exit(0)
	})
	srv.StartIdleTimeoutMonitor(nil)

	targetURL := fmt.Sprintf("http://%s", actualAddr)

	if runtime.GOOS == "windows" && !*noBrowser {
		go func() {
			time.Sleep(300 * time.Millisecond)
			_ = exec.Command("cmd", "/c", "start", targetURL).Start()
		}()
	}

	fmt.Printf("Embsay running at %s\n", targetURL)
	if actualAddr != *addr {
		fmt.Printf(" (Port %s was busy; automatically switched to %s)\n", *addr, actualAddr)
	}
	fmt.Printf("Loaded portfolios: %v\n", st.PortfolioIDs())
	if err := http.Serve(listener, srv); err != nil {
		exitWithError("Server stopped: %v", err)
	}
}
