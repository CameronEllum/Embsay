package store

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v3"
	"embsay/internal/model"
)

var nonAlnumRegex = regexp.MustCompile(`[^a-z0-9]+`)

type Store struct {
	mu           sync.RWMutex
	baseDir      string
	appConfig    model.AppConfig
	divisions    model.DivisionsConfig
	symbols      model.SymbolsConfig
	dataSources  model.DataSourcesConfig
	cache        model.CacheConfig
	portfolios   map[string]model.PortfolioConfig
	portfolioIDs []string
}

func NewStore(baseDir string) (*Store, error) {
	s := &Store{
		baseDir:    baseDir,
		portfolios: make(map[string]model.PortfolioConfig),
	}
	if err := s.ReloadAll(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) ReloadAll() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.appConfig = model.AppConfig{
		Language:       "en-CA",
		ThemeMode:      "system",
		LookupInterval: "1h",
		LookupOnLoad:   true,
		DriftThreshold: 0.01,
		IdleTimeoutHours: 1.0,
	}
	if err := loadYAML(filepath.Join(s.baseDir, "config", "config.yaml"), &s.appConfig); err != nil {
		if errEx := loadYAML(filepath.Join(s.baseDir, "config", "config.example.yaml"), &s.appConfig); errEx != nil {
			log.Printf("[store] Notice: unable to read config/config.yaml (%v), using defaults", err)
		}
	}
	if s.appConfig.Language == "" {
		s.appConfig.Language = "en-CA"
	}
	if s.appConfig.ThemeMode == "" {
		s.appConfig.ThemeMode = "system"
	}
	if s.appConfig.LookupInterval == "" {
		s.appConfig.LookupInterval = "1h"
	}
	if s.appConfig.DriftThreshold <= 0 {
		s.appConfig.DriftThreshold = 0.01
	}
	if s.appConfig.IdleTimeoutHours <= 0 {
		s.appConfig.IdleTimeoutHours = 1.0
	}

	if err := loadYAML(filepath.Join(s.baseDir, "config", "divisions.yaml"), &s.divisions); err != nil {
		return fmt.Errorf("loading divisions.yaml: %w", err)
	}
	if err := loadYAML(filepath.Join(s.baseDir, "config", "symbols.yaml"), &s.symbols); err != nil {
		return fmt.Errorf("loading symbols.yaml: %w", err)
	}
	if err := loadYAML(filepath.Join(s.baseDir, "config", "data_sources.yaml"), &s.dataSources); err != nil {
		return fmt.Errorf("loading data_sources.yaml: %w", err)
	}

	// Merge optional user drop-in plugin YAML recipes from plugins/*.yaml
	pluginsDir := filepath.Join(s.baseDir, "plugins")
	if entries, err := os.ReadDir(pluginsDir); err == nil {
		for _, entry := range entries {
			if entry.IsDir() || (!strings.HasSuffix(entry.Name(), ".yaml") && !strings.HasSuffix(entry.Name(), ".yml")) {
				continue
			}
			var pluginDS model.DataSourcesConfig
			if err := loadYAML(filepath.Join(pluginsDir, entry.Name()), &pluginDS); err == nil {
				s.dataSources.PriceSources = append(s.dataSources.PriceSources, pluginDS.PriceSources...)
				s.dataSources.FXSources = append(s.dataSources.FXSources, pluginDS.FXSources...)
				for k, v := range pluginDS.MetadataRecipes {
					if s.dataSources.MetadataRecipes == nil {
						s.dataSources.MetadataRecipes = make(map[string]model.MetadataRecipe)
					}
					s.dataSources.MetadataRecipes[k] = v
				}
				for k, v := range pluginDS.CSVImporters {
					if s.dataSources.CSVImporters == nil {
						s.dataSources.CSVImporters = make(map[string]model.CSVImporterRecipe)
					}
					s.dataSources.CSVImporters[k] = v
				}
			}
		}
	}

	if err := loadYAML(filepath.Join(s.baseDir, "config", "cache.yaml"), &s.cache); err != nil {
		return fmt.Errorf("loading cache.yaml: %w", err)
	}
	if s.cache.FXRates == nil {
		s.cache.FXRates = make(map[string]model.CachedFX)
	}
	if s.cache.Prices == nil {
		s.cache.Prices = make(map[string]model.CachedPrice)
	}
	if s.cache.SymbolMetadata == nil {
		s.cache.SymbolMetadata = make(map[string]model.CachedMetadata)
	}

	var priceCache model.PriceCacheConfig
	if err := loadYAML(filepath.Join(s.baseDir, "config", "price_cache.yaml"), &priceCache); err == nil {
		for k, v := range priceCache.FXRates {
			s.cache.FXRates[k] = v
		}
		for k, v := range priceCache.Prices {
			s.cache.Prices[k] = v
		}
	}

	if err := s.loadPortfolios(); err != nil {
		return err
	}
	return nil
}

func (s *Store) resolveSearchDirs() []string {
	paths := s.appConfig.PortfolioPaths
	if len(paths) == 0 {
		return []string{
			filepath.Join(s.baseDir, "portfolios"),
			filepath.Join(s.baseDir, "examples"),
		}
	}
	var resolved []string
	for _, p := range paths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if filepath.IsAbs(p) {
			resolved = append(resolved, p)
		} else {
			resolved = append(resolved, filepath.Join(s.baseDir, p))
		}
	}
	if len(resolved) == 0 {
		resolved = append(resolved, filepath.Join(s.baseDir, "portfolios"))
	}
	return resolved
}

func (s *Store) loadPortfolios() error {
	searchDirs := s.resolveSearchDirs()
	s.portfolios = make(map[string]model.PortfolioConfig)
	s.portfolioIDs = nil

	for _, dir := range searchDirs {
		_ = os.MkdirAll(dir, 0755)
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() || (!strings.HasSuffix(entry.Name(), ".yaml") && !strings.HasSuffix(entry.Name(), ".yml")) {
				continue
			}
			if strings.Contains(entry.Name(), "_backup_") || strings.HasPrefix(entry.Name(), "backup_") || strings.HasSuffix(entry.Name(), ".backup.yaml") || strings.HasSuffix(entry.Name(), ".backup.yml") {
				continue
			}
			pPath := filepath.Join(dir, entry.Name())
			if strings.EqualFold(entry.Name(), "groups.yaml") || strings.EqualFold(entry.Name(), "portfolio_groups.yaml") || strings.HasSuffix(entry.Name(), ".group.yaml") {
				var grpCfg struct {
					PortfolioGroups []model.PortfolioGroupDef `yaml:"portfolio_groups"`
				}
				if err := loadYAML(pPath, &grpCfg); err == nil && len(grpCfg.PortfolioGroups) > 0 {
					existing := make(map[string]bool)
					for _, g := range s.divisions.PortfolioGroups {
						existing[g.ID] = true
					}
					for _, g := range grpCfg.PortfolioGroups {
						if !existing[g.ID] {
							s.divisions.PortfolioGroups = append(s.divisions.PortfolioGroups, g)
							existing[g.ID] = true
						}
					}
				}
				continue
			}
			var p model.PortfolioConfig
			if err := loadYAML(pPath, &p); err != nil {
				continue
			}
			fileSlug := strings.TrimSuffix(strings.TrimSuffix(entry.Name(), ".yaml"), ".yml")
			p.FilePath = pPath
			p.SourceDir = dir
			normalizePortfolio(&p, fileSlug, s.divisions.AccountTypes)
			s.portfolios[p.ID] = p
			s.portfolioIDs = append(s.portfolioIDs, p.ID)
		}
	}

	sort.Strings(s.portfolioIDs)
	return nil
}

func (s *Store) AppConfig() model.AppConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.appConfig
}

func (s *Store) SaveAppConfig(cfg model.AppConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if cfg.ThemeMode == "" {
		cfg.ThemeMode = "system"
	}
	if cfg.LookupInterval == "" {
		cfg.LookupInterval = "1h"
	}
	if cfg.DriftThreshold <= 0 {
		cfg.DriftThreshold = 0.01
	}
	if cfg.IdleTimeoutHours <= 0 {
		cfg.IdleTimeoutHours = 1.0
	}
	cPath := filepath.Join(s.baseDir, "config", "config.yaml")
	if err := saveYAML(cPath, &cfg); err != nil {
		return err
	}
	s.appConfig = cfg
	return s.loadPortfolios()
}

func (s *Store) Divisions() model.DivisionsConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.divisions
}

func (s *Store) Symbols() model.SymbolsConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.symbols
}

func (s *Store) DataSources() model.DataSourcesConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.dataSources
}

func (s *Store) Cache() model.CacheConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cache
}

func (s *Store) PortfolioIDs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]string, len(s.portfolioIDs))
	copy(out, s.portfolioIDs)
	return out
}

func (s *Store) GetPortfolio(id string) (model.PortfolioConfig, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	p, ok := s.portfolios[id]
	return p, ok
}

func (s *Store) AllPortfolios() map[string]model.PortfolioConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make(map[string]model.PortfolioConfig, len(s.portfolios))
	for k, v := range s.portfolios {
		out[k] = v
	}
	return out
}

func (s *Store) SavePortfolio(p model.PortfolioConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	fallbackID := p.ID
	if fallbackID == "" {
		fallbackID = Slugify(p.Name)
	}
	if fallbackID == "" {
		return fmt.Errorf("portfolio name or ID cannot be empty")
	}
	normalizePortfolio(&p, fallbackID, s.divisions.AccountTypes)

	var pPath string
	if p.FilePath != "" {
		pPath = p.FilePath
	} else if existing, ok := s.portfolios[p.ID]; ok && existing.FilePath != "" {
		pPath = existing.FilePath
	} else {
		searchDirs := s.resolveSearchDirs()
		pPath = filepath.Join(searchDirs[0], p.ID+".yaml")
	}

	// Whenever portfolio holdings or configuration are modified, save a date-and-time postfixed backup
	if _, err := os.Stat(pPath); err == nil {
		_, _ = backupFileWithTimestamp(pPath)
	}

	if err := saveYAML(pPath, &p); err != nil {
		return err
	}
	s.portfolios[p.ID] = p
	found := false
	for _, id := range s.portfolioIDs {
		if id == p.ID {
			found = true
			break
		}
	}
	if !found {
		s.portfolioIDs = append(s.portfolioIDs, p.ID)
		sort.Strings(s.portfolioIDs)
	}
	return nil
}

func (s *Store) DeletePortfolio(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.portfolios[id]
	if !ok {
		return fmt.Errorf("portfolio %q not found", id)
	}
	pPath := existing.FilePath
	if pPath == "" {
		pPath = filepath.Join(s.baseDir, "portfolios", id+".yaml")
	}
	if err := os.Remove(pPath); err != nil && !os.IsNotExist(err) {
		return err
	}
	delete(s.portfolios, id)
	var nextIDs []string
	for _, pid := range s.portfolioIDs {
		if pid != id {
			nextIDs = append(nextIDs, pid)
		}
	}
	s.portfolioIDs = nextIDs
	return nil
}

// BackupPortfolio creates a date-and-time postfixed backup copy of a portfolio YAML file.
// Format: <base>_backup_<YYYY-MM-DD_HHMMSS>.yaml in the same directory as the portfolio.
func (s *Store) BackupPortfolio(id string) (string, error) {
	s.mu.RLock()
	existing, ok := s.portfolios[id]
	s.mu.RUnlock()
	if !ok {
		return "", fmt.Errorf("portfolio %q not found", id)
	}

	origPath := existing.FilePath
	if origPath == "" {
		origPath = filepath.Join(s.baseDir, "portfolios", id+".yaml")
	}

	return backupFileWithTimestamp(origPath)
}

// backupFileWithTimestamp creates a date-and-time postfixed backup copy of any YAML file before it is modified.
// Format: <base>_backup_<YYYY-MM-DD_HHMMSS>.yaml in the same directory as the target file.
func backupFileWithTimestamp(filePath string) (string, error) {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return "", nil
	}
	rawBytes, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("reading file for backup %q: %w", filePath, err)
	}

	dir := filepath.Dir(filePath)
	ext := filepath.Ext(filePath)
	if ext == "" {
		ext = ".yaml"
	}
	base := strings.TrimSuffix(filepath.Base(filePath), ext)
	now := time.Now()
	timestamp := now.Format("2006-01-02_150405")
	backupFilename := fmt.Sprintf("%s_backup_%s%s", base, timestamp, ext)
	backupPath := filepath.Join(dir, backupFilename)

	if _, err := os.Stat(backupPath); err == nil {
		timestamp = strings.ReplaceAll(now.Format("2006-01-02_150405.000"), ".", "_")
		backupFilename = fmt.Sprintf("%s_backup_%s%s", base, timestamp, ext)
		backupPath = filepath.Join(dir, backupFilename)
	}

	if err := os.WriteFile(backupPath, rawBytes, 0644); err != nil {
		return "", fmt.Errorf("writing backup file %q: %w", backupPath, err)
	}

	log.Printf("[backup] Created backup: %s", backupPath)
	return backupPath, nil
}

// CheckAndRunWeeklyBackups ensures that each portfolio has a backup at least once a week.
// If the latest backup for a portfolio is older than 7 days (or none exists), a new backup is created.
func (s *Store) CheckAndRunWeeklyBackups() []string {
	s.mu.RLock()
	ports := make([]model.PortfolioConfig, 0, len(s.portfolios))
	for _, p := range s.portfolios {
		ports = append(ports, p)
	}
	s.mu.RUnlock()

	var created []string
	const sevenDays = 7 * 24 * time.Hour

	for _, p := range ports {
		if p.ID == "" || p.FilePath == "" {
			continue
		}
		dir := filepath.Dir(p.FilePath)
		ext := filepath.Ext(p.FilePath)
		if ext == "" {
			ext = ".yaml"
		}
		base := strings.TrimSuffix(filepath.Base(p.FilePath), ext)
		prefix := base + "_backup_"

		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}

		var latestBackupTime time.Time
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			name := entry.Name()
			if strings.HasPrefix(name, prefix) && (strings.HasSuffix(name, ".yaml") || strings.HasSuffix(name, ".yml")) {
				info, err := entry.Info()
				if err == nil {
					t := info.ModTime()
					if t.After(latestBackupTime) {
						latestBackupTime = t
					}
				}
			}
		}

		if latestBackupTime.IsZero() || time.Since(latestBackupTime) >= sevenDays {
			path, err := s.BackupPortfolio(p.ID)
			if err == nil {
				created = append(created, path)
				log.Printf("[backup] Weekly automatic backup created for %q: %s", p.ID, filepath.Base(path))
			} else {
				log.Printf("[backup] Weekly backup failed for %q: %v", p.ID, err)
			}
		}
	}
	return created
}

func (s *Store) SaveCache(c model.CacheConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if c.FXRates == nil {
		c.FXRates = make(map[string]model.CachedFX)
	}
	if c.Prices == nil {
		c.Prices = make(map[string]model.CachedPrice)
	}
	if c.SymbolMetadata == nil {
		c.SymbolMetadata = make(map[string]model.CachedMetadata)
	}

	pPath := filepath.Join(s.baseDir, "config", "price_cache.yaml")
	pc := model.PriceCacheConfig{
		FXRates: c.FXRates,
		Prices:  c.Prices,
	}
	if err := saveYAML(pPath, &pc); err != nil {
		return err
	}

	cPath := filepath.Join(s.baseDir, "config", "cache.yaml")
	if _, err := os.Stat(cPath); err == nil {
		_, _ = backupFileWithTimestamp(cPath)
	}
	mc := model.MetadataCacheConfig{
		SymbolMetadata: c.SymbolMetadata,
	}
	if err := saveYAML(cPath, &mc); err != nil {
		return err
	}

	s.cache = c
	return nil
}

func (s *Store) SavePriceCache(fxRates map[string]model.CachedFX, prices map[string]model.CachedPrice) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if fxRates == nil {
		fxRates = make(map[string]model.CachedFX)
	}
	if prices == nil {
		prices = make(map[string]model.CachedPrice)
	}
	pPath := filepath.Join(s.baseDir, "config", "price_cache.yaml")
	pc := model.PriceCacheConfig{
		FXRates: fxRates,
		Prices:  prices,
	}
	if err := saveYAML(pPath, &pc); err != nil {
		return err
	}
	s.cache.FXRates = fxRates
	s.cache.Prices = prices
	return nil
}

func (s *Store) SaveMetadataCache(meta map[string]model.CachedMetadata) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if meta == nil {
		meta = make(map[string]model.CachedMetadata)
	}
	cPath := filepath.Join(s.baseDir, "config", "cache.yaml")
	if _, err := os.Stat(cPath); err == nil {
		_, _ = backupFileWithTimestamp(cPath)
	}
	mc := model.MetadataCacheConfig{
		SymbolMetadata: meta,
	}
	if err := saveYAML(cPath, &mc); err != nil {
		return err
	}
	s.cache.SymbolMetadata = meta
	return nil
}

func (s *Store) SaveSymbols(sym model.SymbolsConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sPath := filepath.Join(s.baseDir, "config", "symbols.yaml")
	if _, err := os.Stat(sPath); err == nil {
		_, _ = backupFileWithTimestamp(sPath)
	}
	if err := saveYAML(sPath, &sym); err != nil {
		return err
	}
	s.symbols = sym
	return nil
}

func (s *Store) SaveDivisions(div model.DivisionsConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dPath := filepath.Join(s.baseDir, "config", "divisions.yaml")
	if err := saveYAML(dPath, &div); err != nil {
		return err
	}
	s.divisions = div
	return nil
}

// normalizePortfolio automatically populates PortfolioConfig.ID, HoldingConfig.ID, and missing AccountType.
func normalizePortfolio(p *model.PortfolioConfig, fallbackID string, accTypes map[string]model.AccountTypeDef) {
	if p.ID == "" {
		p.ID = Slugify(fallbackID)
	}
	if p.Name == "" {
		p.Name = fallbackID
	}
	for i := range p.Holdings {
		h := &p.Holdings[i]
		if h.AccountType == "" {
			h.AccountType = InferAccountType(h.Account, accTypes)
		}
		h.ID = fmt.Sprintf("%s_%d_%s_%s", p.ID, i+1, Slugify(h.Account), Slugify(h.Symbol))
	}
}

func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = nonAlnumRegex.ReplaceAllString(s, "_")
	return strings.Trim(s, "_")
}

func InferAccountType(accName string, accTypes map[string]model.AccountTypeDef) string {
	upper := strings.ToUpper(strings.TrimSpace(accName))
	for id, def := range accTypes {
		for _, alias := range def.Aliases {
			if strings.EqualFold(alias, upper) || strings.Contains(upper, strings.ToUpper(alias)) {
				return id
			}
		}
	}
	if strings.Contains(upper, "TFSA") {
		return "tfsa"
	}
	if strings.Contains(upper, "RRSP") {
		return "rrsp"
	}
	if strings.Contains(upper, "RESP") {
		return "resp"
	}
	return "non_registered"
}

func loadYAML(path string, target interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return yaml.Unmarshal(data, target)
}

func saveYAML(path string, src interface{}) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	enc := yaml.NewEncoder(f)
	enc.SetIndent(2)
	if err := enc.Encode(src); err != nil {
		return err
	}
	return enc.Close()
}
