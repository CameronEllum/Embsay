package datasource_test

import (
	"math"
	"testing"

	"embsay/internal/datasource"
	"embsay/internal/model"
)

func TestParseHoldingsCSVForDivisions(t *testing.T) {
	sampleBlackRockCSV := `iShares Core MSCI All Country World ex Canada Index ETF
Fund Holdings as of,"Nov 04, 2026"
Total Net Assets,"CAD 2,100,000,000"

Ticker,Name,Sector,Asset Class,Market Value,Weight (%),Notional Value,Shares
IVV,ISHARES CORE S&P 500 ETF,Equity,Equity,1000,56.40,1000,10
XEF,ISHARES CORE MSCI EAFE IMI INDEX ETF,Equity,Equity,500,24.70,500,10
IEMG,ISHARES CORE MSCI EMERGING MARKETS ETF,Equity,Equity,200,9.90,200,10
ITOT,ISHARES CORE S&P TOTAL U.S. STOCK MARKET ETF,Equity,Equity,150,9.00,150,10
CAD,CANADIAN DOLLAR,Cash,Cash,1,0.10,1,1
`
	recipe := model.MetadataRecipe{
		Name:         "BlackRock XAW Test",
		Type:         "csv_holdings",
		HeaderMatch:  "Ticker,Name,Sector",
		TickerColumn: "Ticker",
		WeightColumn: "Weight (%)",
		UnderlyingToDivision: map[string]string{
			"IVV":  "us",
			"ITOT": "us",
			"XEF":  "europe_asia",
			"IEMG": "emerging",
		},
	}

	ratios, err := datasource.ParseHoldingsCSVForDivisions(sampleBlackRockCSV, recipe)
	if err != nil {
		t.Fatalf("ParseHoldingsCSVForDivisions failed: %v", err)
	}
	if math.Abs(ratios["us"]-0.654) > 0.001 {
		t.Errorf("ratios[us] = %.4f, want 0.6540", ratios["us"])
	}
	if math.Abs(ratios["europe_asia"]-0.247) > 0.001 {
		t.Errorf("ratios[europe_asia] = %.4f, want 0.2470", ratios["europe_asia"])
	}
	if math.Abs(ratios["emerging"]-0.099) > 0.001 {
		t.Errorf("ratios[emerging] = %.4f, want 0.0990", ratios["emerging"])
	}
}

// Mirrors the structure of the server-side rendered Vanguard Canada product pages:
// Angular-style attributes, a caption in <h5>, thead with a blank key header,
// and unrelated tables before/after the target section. The intro paragraph
// mentioning the caption text before an unrelated table verifies that
// positionally-matching but unmapped tables are skipped.
const sampleVanguardPage = `<html><body>
<nav><a href="#portfolio-data">Fund holdings</a><a href="#prices">Prices</a></nav>
<p>Learn more about the Allocation to underlying Vanguard funds in the portfolio data section.</p>
<section>
  <h5 class="h-l">Characteristics</h5>
  <table _ngcontent-serverapp-c1="" class="data-table">
    <thead><tr><th>Fundamentals</th><th class="numeric">Fund</th></tr></thead>
    <tbody><tr><td>Number of stocks</td><td class="numeric"> 13,936 </td></tr></tbody>
  </table>
</section>
<section>
  <h5 _ngcontent-serverapp-c2="" class="h-l">Allocation to underlying Vanguard funds</h5>
  <p _ngcontent-serverapp-c2="" class="xxs-uppercase as-of-date"> As at Sep 30 2026 </p>
  <table _ngcontent-serverapp-c3="" class="data-table">
    <thead><tr><th _ngcontent-serverapp-c3=""></th><th _ngcontent-serverapp-c3="" class="numeric">Percentage</th></tr></thead>
    <tbody _ngcontent-serverapp-c3="">
      <tr _ngcontent-serverapp-c3=""><td _ngcontent-serverapp-c3=""> Morningstar U.S. Total Market Index ETF</td><td _ngcontent-serverapp-c3="" class="numeric"> 45.51% </td></tr>
      <tr _ngcontent-serverapp-c3=""><td _ngcontent-serverapp-c3=""> FTSE Canada All Cap Index ETF</td><td _ngcontent-serverapp-c3="" class="numeric"> 29.65% </td></tr>
      <tr _ngcontent-serverapp-c3=""><td _ngcontent-serverapp-c3=""> FTSE Developed All Cap ex North America Index ETF</td><td _ngcontent-serverapp-c3="" class="numeric"> 17.63% </td></tr>
      <tr _ngcontent-serverapp-c3=""><td _ngcontent-serverapp-c3=""> FTSE Emerging Markets All Cap Index ETF</td><td _ngcontent-serverapp-c3="" class="numeric"> 7.18% </td></tr>
    </tbody>
  </table>
</section>
<section>
  <h5 class="h-l">Top 10 Holdings</h5>
  <table class="data-table">
    <thead><tr><th>Holding name</th><th class="numeric">% of market value</th></tr></thead>
    <tbody><tr><td>NVIDIA Corp</td><td class="numeric"> 3.24002% </td></tr></tbody>
  </table>
</section>
</body></html>`

const sampleVanguardBalancedPage = `<html><body>
<h5 class="h-l">Allocation to underlying Vanguard funds</h5>
<table class="data-table">
  <thead><tr><th></th><th class="numeric">Percentage</th></tr></thead>
  <tbody>
    <tr><td> Morningstar U.S. Total Market Index ETF</td><td class="numeric"> 27.98% </td></tr>
    <tr><td> Canadian Aggregate Bond Index ETF</td><td class="numeric"> 22.89% </td></tr>
    <tr><td> FTSE Canada All Cap Index ETF</td><td class="numeric"> 18.08% </td></tr>
    <tr><td> FTSE Developed All Cap ex North America Index ETF</td><td class="numeric"> 11.05% </td></tr>
    <tr><td> Global ex-U.S. Aggregate Bond Index ETF (CAD-hedged)</td><td class="numeric"> 7.84% </td></tr>
    <tr><td> U.S. Aggregate Bond Index ETF (CAD-hedged)</td><td class="numeric"> 7.43% </td></tr>
    <tr><td> FTSE Emerging Markets All Cap Index ETF</td><td class="numeric"> 4.70% </td></tr>
  </tbody>
</table>
</body></html>`

func vanguardTestRecipe() model.MetadataRecipe {
	return model.MetadataRecipe{
		Name:              "Vanguard Canada Product Page (Underlying Funds)",
		Type:              "html_table",
		URLTemplate:       "https://www.vanguard.ca/en/advisor/products/products-group/etfs/{symbol}",
		TableMatch:        "Allocation to underlying Vanguard funds",
		KeyColumnIndex:    0,
		WeightColumnIndex: 1,
		UnderlyingToDivision: map[string]string{
			"Morningstar U.S. Total Market Index ETF":              "America (US)",
			"FTSE Canada All Cap Index ETF":                        "Canada",
			"FTSE Developed All Cap ex North America Index ETF":    "Europe/Asia (EAFE)",
			"FTSE Emerging Markets All Cap Index ETF":              "Emerging Markets",
			"Canadian Aggregate Bond Index ETF":                    "GICs/Bonds",
			"Global ex-U.S. Aggregate Bond Index ETF (CAD-hedged)": "GICs/Bonds",
			"U.S. Aggregate Bond Index ETF (CAD-hedged)":           "GICs/Bonds",
		},
	}
}

func TestParseHoldingsHTMLTableForDivisions(t *testing.T) {
	recipe := vanguardTestRecipe()

	ratios, err := datasource.ParseHoldingsHTMLTableForDivisions(sampleVanguardPage, recipe)
	if err != nil {
		t.Fatalf("ParseHoldingsHTMLTableForDivisions failed: %v", err)
	}
	expected := map[string]float64{
		"America (US)":       45.51 / 99.97,
		"Canada":             29.65 / 99.97,
		"Europe/Asia (EAFE)": 17.63 / 99.97,
		"Emerging Markets":   7.18 / 99.97,
	}
	for div, want := range expected {
		if math.Abs(ratios[div]-want) > 0.001 {
			t.Errorf("ratios[%q] = %.4f, want %.4f", div, ratios[div], want)
		}
	}
}

func TestParseHoldingsHTMLTableForDivisionsBalanced(t *testing.T) {
	recipe := vanguardTestRecipe()

	ratios, err := datasource.ParseHoldingsHTMLTableForDivisions(sampleVanguardBalancedPage, recipe)
	if err != nil {
		t.Fatalf("ParseHoldingsHTMLTableForDivisions failed: %v", err)
	}
	expected := map[string]float64{
		"America (US)":       27.98 / 99.97,
		"GICs/Bonds":         38.16 / 99.97,
		"Canada":             18.08 / 99.97,
		"Europe/Asia (EAFE)": 11.05 / 99.97,
		"Emerging Markets":   4.70 / 99.97,
	}
	for div, want := range expected {
		if math.Abs(ratios[div]-want) > 0.001 {
			t.Errorf("ratios[%q] = %.4f, want %.4f", div, ratios[div], want)
		}
	}
}

func TestParseHoldingsHTMLTableForDivisionsNoMatch(t *testing.T) {
	recipe := vanguardTestRecipe()
	recipe.TableMatch = "Not Present Anywhere"

	if _, err := datasource.ParseHoldingsHTMLTableForDivisions(sampleVanguardPage, recipe); err == nil {
		t.Fatal("expected error for missing table_match, got nil")
	}
}
