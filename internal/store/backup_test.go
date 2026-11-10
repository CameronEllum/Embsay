package store

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"embsay/internal/model"
)

func TestStoreBackupAndWeekly(t *testing.T) {
	tempDir := t.TempDir()
	configDir := filepath.Join(tempDir, "config")
	portsDir := filepath.Join(tempDir, "portfolios")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(portsDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Write minimum config files
	_ = os.WriteFile(filepath.Join(configDir, "config.yaml"), []byte("portfolio_paths: [portfolios]\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "divisions.yaml"), []byte("categories: []\ndivisions: []\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "symbols.yaml"), []byte("symbols: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "data_sources.yaml"), []byte("price_sources: []\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "cache.yaml"), []byte("symbol_metadata: {}\n"), 0644)

	// Create test portfolio
	portContent := `name: "My Test Portfolio"
amount_to_buy: 0.0
holdings: []
`
	if err := os.WriteFile(filepath.Join(portsDir, "testport.yaml"), []byte(portContent), 0644); err != nil {
		t.Fatal(err)
	}

	st, err := NewStore(tempDir)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	if _, ok := st.GetPortfolio("testport"); !ok {
		t.Fatalf("expected testport to be loaded")
	}

	// 1. Manual BackupPortfolio
	backupPath, err := st.BackupPortfolio("testport")
	if err != nil {
		t.Fatalf("BackupPortfolio error: %v", err)
	}
	if !strings.Contains(backupPath, "testport_backup_") || !strings.HasSuffix(backupPath, ".yaml") {
		t.Errorf("unexpected backupPath: %s", backupPath)
	}

	backupData, err := os.ReadFile(backupPath)
	if err != nil {
		t.Fatalf("read backup file error: %v", err)
	}
	if string(backupData) != portContent {
		t.Errorf("backup content mismatch:\ngot: %s\nwant: %s", string(backupData), portContent)
	}

	// 2. Verify loadPortfolios ignores backup files
	if err := st.ReloadAll(); err != nil {
		t.Fatalf("ReloadAll error: %v", err)
	}
	allPorts := st.AllPortfolios()
	if len(allPorts) != 1 {
		t.Errorf("expected exactly 1 active portfolio, got %d: %v", len(allPorts), st.PortfolioIDs())
	}

	// 3. CheckAndRunWeeklyBackups when recent backup exists -> should skip
	created := st.CheckAndRunWeeklyBackups()
	if len(created) != 0 {
		t.Errorf("expected 0 created backups since backup was just made, got %v", created)
	}

	// 4. Age the backup file by 8 days -> CheckAndRunWeeklyBackups should create a new backup
	eightDaysAgo := time.Now().Add(-8 * 24 * time.Hour)
	if err := os.Chtimes(backupPath, eightDaysAgo, eightDaysAgo); err != nil {
		t.Fatalf("Chtimes error: %v", err)
	}

	created = st.CheckAndRunWeeklyBackups()
	if len(created) != 1 {
		t.Errorf("expected 1 created weekly backup after aging previous backup, got %d (%v)", len(created), created)
	}

	// 5. Test ETF modifications automatically create backups
	// 5a. SaveSymbols
	symCfg := st.Symbols()
	if symCfg.Symbols == nil {
		symCfg.Symbols = make(map[string]model.SymbolDef)
	}
	symCfg.Symbols["XIC"] = model.SymbolDef{Name: "iShares S&P/TSX"}
	if err := st.SaveSymbols(symCfg); err != nil {
		t.Fatalf("SaveSymbols error: %v", err)
	}

	cfgEntries, _ := os.ReadDir(configDir)
	foundSymbolsBackup := false
	for _, e := range cfgEntries {
		if strings.HasPrefix(e.Name(), "symbols_backup_") && strings.HasSuffix(e.Name(), ".yaml") {
			foundSymbolsBackup = true
			break
		}
	}
	if !foundSymbolsBackup {
		t.Errorf("expected symbols_backup_* to be created on ETF modification")
	}

	// 5b. SaveCache
	cacheCfg := st.Cache()
	if cacheCfg.SymbolMetadata == nil {
		cacheCfg.SymbolMetadata = make(map[string]model.CachedMetadata)
	}
	cacheCfg.SymbolMetadata["XIC"] = model.CachedMetadata{MER: 0.0006}
	if err := st.SaveCache(cacheCfg); err != nil {
		t.Fatalf("SaveCache error: %v", err)
	}

	cfgEntries, _ = os.ReadDir(configDir)
	foundCacheBackup := false
	for _, e := range cfgEntries {
		if strings.HasPrefix(e.Name(), "cache_backup_") && strings.HasSuffix(e.Name(), ".yaml") {
			foundCacheBackup = true
			break
		}
	}
	if !foundCacheBackup {
		t.Errorf("expected cache_backup_* to be created on ETF cache modification")
	}
}
