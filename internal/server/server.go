package server

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"time"

	"embsay/internal/engine"
	"embsay/internal/model"
)

type Server struct {
	svc                  *engine.Service
	webFS                fs.FS
	mux                  *http.ServeMux
	lastInteractionNanos atomic.Int64
	onExit               func()
	browseDirectory      func() string
}

func NewServer(svc *engine.Service, webFS fs.FS) *Server {
	s := &Server{
		svc:   svc,
		webFS: webFS,
		mux:   http.NewServeMux(),
	}
	s.lastInteractionNanos.Store(time.Now().UnixNano())
	s.routes()
	return s
}

func (s *Server) SetOnExit(fn func()) {
	s.onExit = fn
}

func (s *Server) SetBrowseDirectory(fn func() string) {
	s.browseDirectory = fn
}

func (s *Server) RecordActivity() {
	s.lastInteractionNanos.Store(time.Now().UnixNano())
}

func (s *Server) LastInteractionTime() time.Time {
	return time.Unix(0, s.lastInteractionNanos.Load())
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Don't reset idle timer on silent/background refresh requests
	isBackground := r.Header.Get("X-Background") == "true" ||
		(strings.HasPrefix(r.URL.Path, "/api/refresh/prices") && r.URL.Query().Get("silent") == "true")
	if !isBackground {
		s.RecordActivity()
	}
	s.mux.ServeHTTP(w, r)
}

func (s *Server) routes() {
	s.mux.HandleFunc("/api/state", s.handleState)
	s.mux.HandleFunc("/api/evaluate", s.handleEvaluate)
	s.mux.HandleFunc("/api/portfolio", s.handlePortfolio)
	s.mux.HandleFunc("/api/portfolio/backup", s.handleBackupPortfolio)
	s.mux.HandleFunc("/api/portfolio/create", s.handleCreatePortfolio)
	s.mux.HandleFunc("/api/holding/quick-update", s.handleQuickUpdateHolding)
	s.mux.HandleFunc("/api/account/rename", s.handleRenameAccount)
	s.mux.HandleFunc("/api/portfolio/amount-to-buy", s.handleSetAmountToBuy)
	s.mux.HandleFunc("/api/portfolio/apply-trades", s.handleApplyTrades)
	s.mux.HandleFunc("/api/portfolio/commit-trades", s.handleCommitTrades)
	s.mux.HandleFunc("/api/portfolio/import-csv", s.handleImportCSV)
	s.mux.HandleFunc("/api/refresh/prices", s.handleRefreshPrices)
	s.mux.HandleFunc("/api/refresh/metadata", s.handleRefreshMetadata)
	s.mux.HandleFunc("/api/cache", s.handleUpdateCache)
	s.mux.HandleFunc("/api/symbols", s.handleUpdateSymbols)
	s.mux.HandleFunc("/api/symbols/lookup", s.handleLookupSymbol)
	s.mux.HandleFunc("/api/divisions", s.handleUpdateDivisions)
	s.mux.HandleFunc("/api/config", s.handleUpdateConfig)
	s.mux.HandleFunc("/api/browse-directory", s.handleBrowseDirectory)
	s.mux.HandleFunc("/api/quit", s.handleQuit)
	s.mux.HandleFunc("/api/activity", s.handleActivity)

	s.mux.HandleFunc("/portfolios", s.handleIndex)
	s.mux.HandleFunc("/securities", s.handleIndex)
	s.mux.HandleFunc("/config", s.handleIndex)
	s.mux.HandleFunc("/p/", s.handleIndex)
	s.mux.HandleFunc("/p", s.handleIndex)
	fileServer := http.FileServer(http.FS(s.webFS))
	s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		fileServer.ServeHTTP(w, r)
	})
}

// handleIndex serves the SPA shell for rooted routes (/portfolios, /securities, /config, /p/{id}).
func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.URL.Path, ".") {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	http.ServeFileFS(w, r, s.webFS, "index.html")
}

func (s *Server) handleState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.svc.GetAppState())
}

func (s *Server) defaultPortfolioID() string {
	st := s.svc.GetAppState()
	for _, p := range st.Portfolios {
		if !p.IsGroup {
			return p.ID
		}
	}
	if len(st.Portfolios) > 0 {
		return st.Portfolios[0].ID
	}
	return ""
}

func (s *Server) handleEvaluate(w http.ResponseWriter, r *http.Request) {
	portfolioID := r.URL.Query().Get("portfolio")
	if portfolioID == "" {
		portfolioID = s.defaultPortfolioID()
	}
	filter := r.URL.Query().Get("filter")
	if filter == "" {
		filter = "all"
	}
	eval, err := s.svc.Evaluate(portfolioID, filter)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, eval)
}

func (s *Server) handlePortfolio(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		id := r.URL.Query().Get("id")
		if id == "" {
			id = s.defaultPortfolioID()
		}
		p, err := s.svc.GetPortfolioConfig(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err)
			return
		}
		writeJSON(w, http.StatusOK, p)
	case http.MethodPost, http.MethodPut:
		var p model.PortfolioConfig
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		if err := s.svc.UpdatePortfolio(p); err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		eval, err := s.svc.Evaluate(p.ID, "all")
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, eval)
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, http.ErrMissingFile)
			return
		}
		if err := s.svc.DeletePortfolio(id); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		writeJSON(w, http.StatusOK, s.svc.GetAppState())
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleCreatePortfolio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Name       string `json:"name"`
		CopyFromID string `json:"copy_from_id"`
		TargetDir  string `json:"target_dir"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	p, err := s.svc.CreatePortfolio(req.Name, req.CopyFromID, req.TargetDir)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Server) handleBackupPortfolio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		var req struct {
			ID string `json:"id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		id = req.ID
	}
	if id == "" {
		id = s.defaultPortfolioID()
	}
	if id == "" {
		writeError(w, http.StatusBadRequest, fmt.Errorf("missing portfolio id"))
		return
	}

	paths, err := s.svc.BackupPortfolio(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	filenames := make([]string, len(paths))
	for i, p := range paths {
		filenames[i] = filepath.Base(p)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"portfolio": id,
		"files":     paths,
		"filenames": filenames,
		"message":   fmt.Sprintf("Backup created: %s", strings.Join(filenames, ", ")),
	})
}

func (s *Server) handleBrowseDirectory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var chosenPath string
	if s.browseDirectory != nil {
		chosenPath = s.browseDirectory()
	} else if runtime.GOOS == "windows" {
		psScript := `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Portfolio Directory'; $f.ShowNewFolderButton = $true; if($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){ Write-Output $f.SelectedPath }`
		cmd := exec.Command("powershell", "-NoProfile", "-STA", "-Command", psScript)
		out, err := cmd.Output()
		if err == nil {
			chosenPath = strings.TrimSpace(string(out))
		}
	}
	writeJSON(w, http.StatusOK, map[string]string{"path": chosenPath})
}

func (s *Server) handleQuickUpdateHolding(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		PortfolioID        string    `json:"portfolio_id"`
		FilterAccount      string    `json:"filter_account"`
		HoldingID          string    `json:"holding_id"`
		Account            *string   `json:"account,omitempty"`
		AccountType        *string   `json:"account_type,omitempty"`
		Shares             *float64  `json:"shares,omitempty"`
		ProposedShares     *float64  `json:"proposed_shares,omitempty"`
		RebalanceDivisions *[]string `json:"rebalance_divisions,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.svc.QuickUpdateHolding(req.PortfolioID, req.HoldingID, req.Account, req.AccountType, req.Shares, req.ProposedShares, req.RebalanceDivisions); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	eval, err := s.svc.Evaluate(req.PortfolioID, req.FilterAccount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, eval)
}

func (s *Server) handleRenameAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		PortfolioID   string `json:"portfolio_id"`
		FilterAccount string `json:"filter_account"`
		OldName       string `json:"old_name"`
		NewName       string `json:"new_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	count, err := s.svc.RenameAccount(req.PortfolioID, req.OldName, req.NewName)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	filter := req.FilterAccount
	if filter == req.OldName {
		filter = req.NewName
	}
	eval, err := s.svc.Evaluate(req.PortfolioID, filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"evaluation":    eval,
		"updated_count": count,
		"new_filter":    filter,
	})
}

func (s *Server) handleSetAmountToBuy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		PortfolioID   string  `json:"portfolio_id"`
		FilterAccount string  `json:"filter_account"`
		AmountToBuy   float64 `json:"amount_to_buy"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.svc.SetAmountToBuy(req.PortfolioID, req.AmountToBuy); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	eval, err := s.svc.Evaluate(req.PortfolioID, req.FilterAccount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, eval)
}

func (s *Server) handleApplyTrades(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		PortfolioID   string `json:"portfolio_id"`
		FilterAccount string `json:"filter_account"`
		RoundShares   bool   `json:"round_shares"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if _, err := s.svc.ApplyCalculatedTrades(req.PortfolioID, req.RoundShares); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	eval, err := s.svc.Evaluate(req.PortfolioID, req.FilterAccount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, eval)
}

func (s *Server) handleCommitTrades(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		PortfolioID   string `json:"portfolio_id"`
		FilterAccount string `json:"filter_account"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if _, err := s.svc.CommitProposedTrades(req.PortfolioID); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	eval, err := s.svc.Evaluate(req.PortfolioID, req.FilterAccount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, eval)
}

func (s *Server) handleImportCSV(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		PortfolioID string `json:"portfolio_id"`
		ImporterID  string `json:"importer_id"`
		CSVContent  string `json:"csv_content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	count, err := s.svc.ImportBrokerageCSV(req.PortfolioID, req.ImporterID, req.CSVContent)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	eval, err := s.svc.Evaluate(req.PortfolioID, "all")
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"updated_count": count,
		"evaluation":    eval,
	})
}

func (s *Server) handleRefreshPrices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if s.svc == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"updated_prices": map[string]float64{}})
		return
	}
	report, err := s.svc.RefreshPricesAndFX()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, report)
}

func (s *Server) handleRefreshMetadata(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	report, err := s.svc.RefreshMetadataRecipes()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, report)
}

func (s *Server) handleUpdateCache(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var c model.CacheConfig
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.svc.UpdateCache(c); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, s.svc.GetAppState())
}

func (s *Server) handleUpdateSymbols(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var sym model.SymbolsConfig
	if err := json.NewDecoder(r.Body).Decode(&sym); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.svc.UpdateSymbols(sym); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, s.svc.GetAppState())
}

func (s *Server) handleLookupSymbol(w http.ResponseWriter, r *http.Request) {
	sym := r.URL.Query().Get("symbol")
	exch := r.URL.Query().Get("exchange")
	res, err := s.svc.LookupSymbol(sym, exch)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) handleUpdateDivisions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var div model.DivisionsConfig
	if err := json.NewDecoder(r.Body).Decode(&div); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.svc.UpdateDivisions(div); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, s.svc.GetAppState())
}

func (s *Server) handleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var cfg model.AppConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := s.svc.UpdateAppConfig(cfg); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, s.svc.GetAppState())
}

func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	s.RecordActivity()
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleQuit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "shutting_down"})
	go func() {
		time.Sleep(300 * time.Millisecond)
		if s.onExit != nil {
			s.onExit()
		} else {
			os.Exit(0)
		}
	}()
}

// CheckIdleTimeout verifies whether the server has exceeded its idle timeout duration and exits cleanly if so.
func (s *Server) CheckIdleTimeout() bool {
	var timeoutHours float64 = 1.0
	if s.svc != nil {
		timeoutHours = s.svc.AppConfig().IdleTimeoutHours
	}
	if timeoutHours <= 0 {
		timeoutHours = 1.0
	}
	timeoutDur := time.Duration(timeoutHours * float64(time.Hour))
	lastNanos := s.lastInteractionNanos.Load()
	if lastNanos > 0 {
		idleFor := time.Since(time.Unix(0, lastNanos))
		if idleFor >= timeoutDur {
			log.Printf("[server] Application idle for %v (exceeds configured timeout of %v). Exiting cleanly...", idleFor.Round(time.Second), timeoutDur)
			if s.onExit != nil {
				s.onExit()
			} else {
				os.Exit(0)
			}
			return true
		}
	}
	return false
}

func (s *Server) SetLastInteractionTime(t time.Time) {
	s.lastInteractionNanos.Store(t.UnixNano())
}

// StartIdleTimeoutMonitor checks periodically for user inactivity and cleanly shuts down if idle time exceeds idle_timeout_hours.
func (s *Server) StartIdleTimeoutMonitor(stopCh <-chan struct{}) {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-stopCh:
				return
			case <-ticker.C:
				if s.CheckIdleTimeout() {
					return
				}
			}
		}
	}()
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
