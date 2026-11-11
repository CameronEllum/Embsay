package store_test

import (
	"os"
	"path/filepath"
	"testing"
	"testing/fstest"

	"embsay/internal/store"
)

func TestCustomPortfolioPaths(t *testing.T) {
	tmpDir := t.TempDir()

	// Create subdirectories for config and custom portfolios
	configDir := filepath.Join(tmpDir, "config")
	customDir1 := filepath.Join(tmpDir, "my_portfolios")
	customDir2 := filepath.Join(tmpDir, "external_portfolios")
	_ = os.MkdirAll(configDir, 0755)
	_ = os.MkdirAll(customDir1, 0755)
	_ = os.MkdirAll(customDir2, 0755)

	// Create minimal config files
	_ = os.WriteFile(filepath.Join(configDir, "config.yaml"), []byte("language: en-CA\nportfolio_paths:\n  - my_portfolios\n  - "+customDir2+"\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "divisions.yaml"), []byte("categories: []\ndivisions: []\naccount_types: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "symbols.yaml"), []byte("symbols: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "cache.yaml"), []byte("fx_rates: {}\nprices: {}\nsymbol_metadata: {}\n"), 0644)
	_ = os.WriteFile(filepath.Join(configDir, "data_sources.yaml"), []byte("price_sources: []\n"), 0644)

	// Create a portfolio in customDir1
	p1Content := "name: Port One\nholdings: []\nstrategy:\n  mode: flat\n  divisions:\n    Equities: 1.0\n"
	_ = os.WriteFile(filepath.Join(customDir1, "port_one.yaml"), []byte(p1Content), 0644)

	// Create a portfolio in customDir2 (absolute path)
	p2Content := "name: Port Two\nholdings: []\nstrategy:\n  mode: flat\n  divisions:\n    Bonds: 1.0\n"
	_ = os.WriteFile(filepath.Join(customDir2, "port_two.yaml"), []byte(p2Content), 0644)

	st, err := store.NewStore(tmpDir)
	if err != nil {
		t.Fatalf("store.NewStore failed: %v", err)
	}

	p1, ok1 := st.GetPortfolio("port_one")
	if !ok1 {
		t.Errorf("Expected port_one to be loaded from relative path")
	} else if p1.Name != "Port One" {
		t.Errorf("port_one.Name = %q, want 'Port One'", p1.Name)
	}

	p2, ok2 := st.GetPortfolio("port_two")
	if !ok2 {
		t.Errorf("Expected port_two to be loaded from absolute path")
	} else if p2.Name != "Port Two" {
		t.Errorf("port_two.Name = %q, want 'Port Two'", p2.Name)
	}

	// Test saving portfolio updates file in correct directory
	p1.AmountToBuy = 500.0
	if err := st.SavePortfolio(p1); err != nil {
		t.Fatalf("SavePortfolio(p1) failed: %v", err)
	}
	savedP1, _ := st.GetPortfolio("port_one")
	if savedP1.AmountToBuy != 500.0 {
		t.Errorf("Saved AmountToBuy = %f, want 500.0", savedP1.AmountToBuy)
	}

	// Verify update to AppConfig with new search path reloads
	customDir3 := filepath.Join(tmpDir, "dir3")
	_ = os.MkdirAll(customDir3, 0755)
	p3Content := "name: Port Three\nholdings: []\n"
	_ = os.WriteFile(filepath.Join(customDir3, "port_three.yaml"), []byte(p3Content), 0644)

	cfg := st.AppConfig()
	cfg.PortfolioPaths = append(cfg.PortfolioPaths, customDir3)
	if err := st.SaveAppConfig(cfg); err != nil {
		t.Fatalf("SaveAppConfig failed: %v", err)
	}

	if _, ok3 := st.GetPortfolio("port_three"); !ok3 {
		t.Errorf("Expected port_three to be loaded after adding customDir3 to AppConfig. Loaded: %v", st.PortfolioIDs())
	}
}

func TestEnsureDefaultConfigsCreatesMissingFilesAndPreservesExisting(t *testing.T) {
	tmpDir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(tmpDir, "config"), 0755)
	existingSym := "symbols:\n  CUSTOM: { name: Custom }\n"
	_ = os.WriteFile(filepath.Join(tmpDir, "config", "symbols.yaml"), []byte(existingSym), 0644)

	defaults := fstest.MapFS{
		"config/divisions.yaml":     &fstest.MapFile{Data: []byte("categories: []\ndivisions: []\n")},
		"config/symbols.yaml":       &fstest.MapFile{Data: []byte("symbols: {}\n")},
		"config/data_sources.yaml":  &fstest.MapFile{Data: []byte("price_sources: []\n")},
		"config/cache.yaml":         &fstest.MapFile{Data: []byte("symbol_metadata: {}\n")},
		"examples/sample_demo.yaml": &fstest.MapFile{Data: []byte("name: Sample\nholdings: []\n")},
	}

	if err := store.EnsureDefaultConfigs(tmpDir, defaults); err != nil {
		t.Fatalf("EnsureDefaultConfigs failed: %v", err)
	}

	// Existing symbols.yaml must NOT be overwritten
	gotSym, err := os.ReadFile(filepath.Join(tmpDir, "config", "symbols.yaml"))
	if err != nil {
		t.Fatalf("read symbols.yaml: %v", err)
	}
	if string(gotSym) != existingSym {
		t.Errorf("existing symbols.yaml was overwritten: got %q, want %q", string(gotSym), existingSym)
	}

	// Missing files must be created
	for _, rel := range []string{"config/divisions.yaml", "config/data_sources.yaml", "config/cache.yaml", "examples/sample_demo.yaml"} {
		if _, err := os.Stat(filepath.Join(tmpDir, filepath.FromSlash(rel))); err != nil {
			t.Errorf("expected %s to be created: %v", rel, err)
		}
	}

	// If user deletes a file inside an existing examples/ dir, re-running does not recreate examples/
	_ = os.Remove(filepath.Join(tmpDir, "examples", "sample_demo.yaml"))
	if err := store.EnsureDefaultConfigs(tmpDir, defaults); err != nil {
		t.Fatalf("second EnsureDefaultConfigs failed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(tmpDir, "examples", "sample_demo.yaml")); !os.IsNotExist(err) {
		t.Errorf("expected deleted sample_demo.yaml not to be forced back when examples/ already exists")
	}
}
