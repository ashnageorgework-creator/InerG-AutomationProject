# InerG COVID-19 Tracker — Automated Tests

Playwright (TypeScript) test suite for the InerG COVID-19 Tracker - India dashboard at
https://inerg-test.web.app/. It clicks through the site the same way a person would, then
checks the numbers, charts, and interactive controls against what they're actually supposed
to do.

## Current result

**28 tests — 22 passed, 6 failed.** The 6 failures are real, confirmed bugs in the live site
(not flaky tests, not automation bugs) — see [Known failures](#known-failures-expected) below.
This result has stayed identical across every run of this suite.

## One-time setup

```bash
npm install
npx playwright install chromium
```

Copy `.env.example` to `.env` if it's missing — it just holds the site's base URL.

## Running the tests

Run everything:

```bash
npx playwright test
```

Run one category only:

```bash
npx playwright test tests/sanity
npx playwright test tests/regression
```

Run by tag (every test also carries a `@sanity` / `@functional` / `@data-validation` /
`@ui-validation` / `@regression` tag, independent of its folder):

```bash
npx playwright test --grep @regression
```

An HTML report opens automatically on failure. To reopen it later without rerunning anything:

```bash
npx playwright show-report
```

## Project structure

```
pages/
  trackerPage.ts          all selectors and actions for the site, in one place (Page Object Model)

utils/
  colors.ts                pulls colors out of plotly's inline styles, compares them (exact + hue-family)
  chartMath.ts              reconstructs a chart value from its pixel position on the y-axis

test-data/
  states.json               the 28 states the cross-state sweep (TC-10) loops through

tests/
  sanity/                   fast baseline checks — page loads clean, no console errors
  functional/               does the feature actually work (state select, chart display, every button)
  data-validation/          are the numbers actually correct (sums, percentages, chart values)
  ui-validation/             visual/rendering consistency (colors, titles, layout, formatting)
  regression/                broad sweeps and guards against previously-fine behavior breaking later

config.ts                    reads BASE_URL from .env
playwright.config.ts         timeouts, retries, screenshot/video/trace capture, HTML report
reports/
  InerG_Failure_Report.xlsx  Steps to Reproduce → Expected → Actual for each confirmed bug,
                              built from real test output
```

## Test case index

| TC | File | What it checks |
|---|---|---|
| TC-01 | sanity/pageLoad.spec.ts | Baseline: no result card, no charts, dropdown on placeholder, map with no marker |
| TC-02 | functional/stateSelect.spec.ts | Selecting a state updates the heading correctly, across several switches |
| TC-03 | data-validation/summaryBox.spec.ts | Active + Recovered + Deaths = Total |
| TC-04 | data-validation/pieChartPercentage.spec.ts | Pie slice % vs the real math (value ÷ Total) |
| TC-05 | ui-validation/pieChartColors.spec.ts | Pie legend colors match the pie's own slice colors |
| TC-06 | ui-validation/colorCrossCheck.spec.ts | Pie legend colors vs line chart legend colors |
| TC-07 | functional/lineChartDisplay.spec.ts | Line chart shows all 4 points + legend entries after Autoscale |
| TC-08 | ui-validation/lineChartColors.spec.ts | Line legend colors match the line's own point colors |
| TC-09 | data-validation/lineChartValues.spec.ts | Line chart point values, reconstructed from pixel position, vs the summary box |
| TC-10 | regression/allStatesSweep.spec.ts | Runs the core checks across all 28 states, logs a pass/fail table |
| TC-11 | ui-validation/polishChecks.spec.ts, sanity/consoleErrors.spec.ts | Formatting, titles, category order, layout at 4 screen widths, console errors |
| TC-13 | functional/interactiveControls.spec.ts | Every real button: map zoom, chart downloads, Zoom/Pan drag, Box/Lasso select, Autoscale vs Reset axes |
| TC-13.15 | regression/staleStateCheck.spec.ts | Switching states resets any zoom/pan/selection from the previous state |

## Known failures (expected)

These 6 tests are written to assert the *correct* behavior and are expected to fail until the
underlying site bug is fixed. A failure here is the test working correctly, not a broken test.

| Bug | Test | What's wrong |
|---|---|---|
| BUG-01 | TC-04 | Pie chart plots "Total" as its own slice instead of as the whole — every % is wrong |
| BUG-02 | TC-06 | Recovered and Active Cases legend colors are swapped between the pie and line charts |
| BUG-03 | TC-03 (+ TC-10) | Active + Recovered + Deaths doesn't equal Total on 11 of 28 states (e.g. Assam, off by 3) |
| BUG-04 | TC-11 | Amber summary box shows "204386", the chart tooltip shows "204,386" — inconsistent formatting |
| BUG-05 | TC-11 | Pie chart title is missing a space before the parenthesis |
| BUG-06 | TC-11 | Category order differs between the pie legend and the line chart's x-axis |

## Notes worth knowing before changing anything

- **`workers: 1` in `playwright.config.ts` is deliberate.** The live site mixes up data between
  states when hit with multiple concurrent sessions — confirmed directly by comparing a
  parallel run against a sequential one. Raising this will produce flaky, hard-to-debug
  failures. Re-test for the issue first if you ever need to change it.
- **TC-13 always runs with a visible browser window** (`headless: false`, `slowMo: 350`, plus
  short pauses between actions) so its button-by-button behavior can actually be watched. This
  is scoped to that one file via `test.use()` — the rest of the suite stays headless.
- **`test-results/` and `playwright-report/` are regenerated on every run** and are gitignored —
  don't rely on anything in either folder being version-controlled.
