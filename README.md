# Embsay 🍁

[![Test & Build](https://github.com/CameronEllum/Embsay/actions/workflows/test.yml/badge.svg)](https://github.com/CameronEllum/Embsay/actions/workflows/test.yml)
[![Latest Release](https://img.shields.io/github/v/release/CameronEllum/Embsay?logo=github&color=blue)](https://github.com/CameronEllum/Embsay/releases)
[![Go Version](https://img.shields.io/github/go-mod/go-version/CameronEllum/Embsay?logo=go)](https://go.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Embsay** is a local-first portfolio visualizer, rebalance simulator, and after-tax asset location engine built specifically for Canadian DIY index investors.

It eliminates the spreadsheets and manual math required to coordinate Canadian accounts (**TFSA**, **RRSP/RRIF**, **Non-Registered/Margin**, **RESP**, and **FHSA**). Embsay automatically decomposes composite asset allocation ETFs (`XEQT`, `VEQT`, `XAW`, `VBAL`), normalizes US and Canadian dollars using live Bank of Canada daily exchange rates, tracks foreign withholding tax (FWT) drag, and calculates exact rebalancing trades when new savings arrive.

---

## Table of Contents

* [General Overview & Core Capabilities](#general-overview--core-capabilities)
* [Zero-Friction Desktop Experience](#zero-friction-desktop-experience)
* [How Portfolio Rebalancing Displays](#how-portfolio-rebalancing-displays)
* [Supported Portfolio Styles](#supported-portfolio-styles)
  * [1. Hierarchical Regional Decomposition (30% VAB / 70% XEQT)](#1-hierarchical-regional-decomposition-30-vab--70-xeqt)
  * [2. Classic Two-Fund Flat Allocation (30% VAB / 70% VEQT)](#2-classic-two-fund-flat-allocation-30-vab--70-veqt)
  * [3. Pure One-Ticket ETF (100% XEQT Across Accounts)](#3-pure-one-ticket-etf-100-xeqt-across-accounts)
  * [4. Master Securities Catalog & Tax Drag Reference](#4-master-securities-catalog--tax-drag-reference)
* [Advanced Feature: After-Tax Portfolio Allocation & The Plaid Strategy](#advanced-feature-after-tax-portfolio-allocation--the-plaid-strategy)
* [Quick Start Guide](#quick-start-guide)
  * [Running on Windows](#running-embsay-on-windows)
  * [Running on macOS or Linux](#running-on-macos-or-linux)
* [Privacy by Design](#privacy-by-design)
* [Disclaimer](#disclaimer)
* [License](#license)

---

## General Overview & Core Capabilities

* 🇨🇦 **Canadian Tax-Shelter Native**: Full support for TFSA, RRSP, Non-Registered, RESP, and FHSA account types.
* 🔍 **ETF Look-Through & Decomposition**: Composite funds like `XEQT` or `VEQT` are broken down into their underlying regional equity slices (Canada, US, Developed EAFE, Emerging Markets) and fixed income.
* 💸 **Foreign Withholding Tax Drag Tracking**: Visualizes unrecoverable Level 1 and Level 2 FWT drag across different account wrappers alongside fund MERs.
* 💱 **Multi-Currency Normalization**: Fetches daily Bank of Canada exchange rates to normalize CAD and USD holdings without manual conversion.
* 📁 **Custom Portfolio Paths & Folders**: Store your portfolio files anywhere on your computer—in your personal `Documents/`, a private `OneDrive` directory, or external storage. Embsay discovers all portfolios across your configured search paths.
* 👨‍👩‍👧 **Household Portfolio Groups**: Aggregate multiple portfolios (spouses, joint accounts, corporate entities, kids' RESPs) into a single consolidated view to rebalance the entire household as a unified team.
* 💾 **Automatic Timestamped Backups**: Every portfolio edit triggers an automatic date-stamped backup (e.g. `my_portfolio_backup_2026-11-09_210000.yaml`) in the same folder, plus scheduled weekly safety backups.
* 🔒 **100% Private & Local**: Zero accounts, zero cloud servers, and zero telemetry. All data is saved in simple, transparent YAML files on your local drive.

---

## Zero-Friction Desktop Experience

Embsay runs as a lightweight, zero-installation desktop utility:

* 🚀 **Automatic Browser Launch on Windows**: Just double-click `embsay.exe`. It automatically launches your default web browser directly to your portfolio dashboard—no need to type web addresses or remember port numbers.
* ⏻ **One-Click Quit**: A clean **Quit** button in the header closes the application completely.
* ⏱️ **Idle Auto-Shutdown**: If you leave Embsay open and step away, it automatically shuts down cleanly after a period of inactivity (defaults to 1 hour, fully customizable in the Config tab) so background processes never linger.

---

## How Portfolio Rebalancing Displays

When you contribute new savings or need to restore drifted asset classes, the **Rebalance Simulator** calculates the exact trades required.

![Portfolio Rebalancing Simulator and Trade Recommendations](docs/screenshots/02_rebalance_simulator_trades.png)

### Rebalancing in Action:
1. **Enter Cash to Invest**: In the banner, input your new deposit into **Cash to Invest / Withdraw ($ CAD)** (for example, `$15,000`).
2. **Instant Drift Detection**: Embsay compares actual weights against your target strategy. In the demo above:
   * **Bonds (VAB)** are sitting at **24.7%** against a **30.0% target** (**-5.3% drift** / `$27,684` underweight).
   * **Equities** are overweight at **75.3%** vs a **70.0% target**.
3. **Proposed Purchases**: Embsay calculates the exact dollar trade needed and recommends purchasing shares of the underweight asset (e.g., buying **+662 shares of VAB**).
4. **Deposit-Only Rebalancing**: New savings are channeled directly into underweight assets, nudging your portfolio back to target without triggering taxable sales or capital gains.
5. **One-Click Execution**: Click **Commit Executed Trades to Holdings** to automatically update your share quantities once your broker orders fill.

---

## Supported Portfolio Styles

Embsay supports any portfolio construction approach, from simple one-ticket solutions to multi-account Couch Potato models.

### 1. Hierarchical Regional Decomposition (30% VAB / 70% XEQT)
Hold an all-in-one equity fund alongside aggregate bonds? Embsay decomposes composite ETFs into their underlying regional equity slices (US, Canada, Developed EAFE, and Emerging Markets) so you can track and rebalance your true global geographic exposure.

![Hierarchical Regional Decomposition](docs/screenshots/03_hierarchical_regional_equities.png)

---

### 2. Classic Two-Fund Flat Allocation (30% VAB / 70% VEQT)
For classic Couch Potato simplicity, configure a direct flat strategy with two asset classes: Fixed Income and Equities.

![Classic Two-Fund Flat Allocation](docs/screenshots/04_flat_two_fund_couch_potato.png)

---

### 3. Pure One-Ticket ETF (100% XEQT Across Accounts)
For minimalist investors holding a single all-in-one fund across multiple accounts (TFSA, RRSP, Non-registered), Embsay monitors account weights, total household net worth, and underlying global allocations with zero drift.

![Pure One-Ticket XEQT](docs/screenshots/05_pure_one_ticket_xeqt.png)

---

### 4. Master Securities Catalog & Tax Drag Reference
View fund MERs, underlying regional breakdowns, and foreign withholding tax (FWT) drag estimates across different account wrappers (RRSP, TFSA, Non-registered, RESP). Embsay includes built-in price and exchange rate updates via the Bank of Canada Valet API and Yahoo Finance.

![Securities Catalog and Tax Drag](docs/screenshots/06_securities_and_tax.png)

---

## Advanced Feature: After-Tax Portfolio Allocation & The Plaid Strategy

Most portfolio trackers treat \$100,000 in an RRSP the same as \$100,000 in a TFSA. In reality, every dollar in an RRSP/RRIF carries an embedded future income tax liability upon withdrawal. Treating pre-tax and after-tax dollars as equal causes investors to inadvertently take on more equity risk than intended.

![Plaid Strategy Holdings by Account](docs/screenshots/01_plaid_asset_location.png)

### How Embsay Handles After-Tax Value:
1. **Configurable Withdrawal Tax Rate**: Set your expected effective retirement tax rate (e.g., 30% or 35%) per portfolio.
2. **True Net Worth Discounting**: Embsay discounts RRSP/RRIF holdings by your tax rate:
   $$\text{After-Tax Value} = \text{Market Value} \times (1 - \text{Tax Rate})$$
   while TFSA and taxable accounts remain at 100%.
3. **The Plaid Strategy**: Optimize asset location across household accounts:
   * **TFSA**: Canadian equities (**ZCN / XIC**) to eliminate foreign withholding tax and Canadian dividend tax.
   * **RRSP**: US-listed equities (**ITOT / VTI**) and Emerging Markets (**IEMG / VWO**) to eliminate US IRS withholding tax and capture ultra-low MERs. Holdings are grossed up to offset future retirement taxes.
   * **Taxable (Margin)**: Developed international equities (**XEF**) to recover foreign withholding tax credits via T3 Box 34, and discount bonds (**ZDB**) so registered accounts shelter 100% equities.

---

## Quick Start Guide

### Running Embsay on Windows
1. Download `embsay.exe` from the [latest release](https://github.com/CameronEllum/Embsay/releases).
2. Double-click `embsay.exe`.
3. Your default browser will automatically open to `http://localhost:8080`.
4. Explore the included demo portfolios or click **+ New Portfolio** to create your own.
5. When finished, click **Quit** in the header to close the application.

### Running on macOS or Linux
Run the standalone executable from your terminal:
```bash
./embsay
```
Then open `http://localhost:8080` in any web browser.

---

## Privacy by Design

Embsay was created with privacy as its primary tenet:

* **100% Local**: Runs entirely on your own machine. There are no user accounts, no cloud servers, and no trackers.
* **Safe by Default**: Your personal portfolio YAML files and local folder paths are excluded from version control by default.
* **Plain Text Transparency**: All portfolio data is saved in simple, readable YAML files that you can inspect, edit, or back up at any time.

---

## Disclaimer

*Embsay is a portfolio visualization and simulation tool intended for informational and educational purposes only. It does not provide financial, investment, legal, or tax advice. Calculations such as after-tax discounting and foreign withholding tax drag are estimates based on user-provided inputs and simplified models. Consult a qualified professional accountant or fee-only financial planner for your specific tax and investment situation.*

---

## License

This project is licensed under the [MIT License](LICENSE).
