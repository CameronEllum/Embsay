package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"embsay/internal/datasource"
	"embsay/internal/engine"
	"embsay/internal/server"
	"embsay/internal/store"
)

//go:embed web
var embeddedWeb embed.FS

func main() {
	addr := flag.String("addr", "localhost:8080", "HTTP listen address")
	baseDir := flag.String("dir", ".", "Base directory containing config/ and portfolios/ YAML files")
	noBrowser := flag.Bool("no-browser", false, "Disable automatic browser launch on startup")
	flag.Parse()

	dir := *baseDir
	if dir == "." {
		if _, err := os.Stat(filepath.Join(".", "config", "config.yaml")); os.IsNotExist(err) {
			if exePath, err := os.Executable(); err == nil {
				exeDir := filepath.Dir(exePath)
				if _, err := os.Stat(filepath.Join(exeDir, "config", "config.yaml")); err == nil {
					dir = exeDir
				}
			}
		}
	}

	st, err := store.NewStore(dir)
	if err != nil {
		log.Fatalf("Failed to initialize YAML store in %q: %v", dir, err)
	}

	fetcher := datasource.NewFetcher()
	svc := engine.NewService(st, fetcher)
	svc.StartPriceAutoRefresh()
	svc.StartWeeklyBackupScheduler()

	webFS, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		log.Fatalf("Failed to mount embedded web assets: %v", err)
	}

	srv := server.NewServer(svc, webFS)
	srv.StartIdleTimeoutMonitor(nil)

	if runtime.GOOS == "windows" && !*noBrowser {
		go func() {
			time.Sleep(300 * time.Millisecond)
			targetURL := fmt.Sprintf("http://%s", *addr)
			_ = exec.Command("cmd", "/c", "start", targetURL).Start()
		}()
	}

	fmt.Printf("Embsay running at http://%s\n", *addr)
	fmt.Printf("Loaded portfolios: %v\n", st.PortfolioIDs())
	if err := http.ListenAndServe(*addr, srv); err != nil {
		log.Fatalf("Server stopped: %v", err)
	}
}
