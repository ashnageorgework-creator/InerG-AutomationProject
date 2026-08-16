import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

// TC-11 - the leftover polish stuff. formatting, titles, category order,
// and layout at a few screen sizes. (console errors moved out to sanity/consoleErrors.spec.ts)

test.describe('TC-11 formatting and title checks', { tag: '@ui-validation' }, () => {
  test('amber box vs tooltip number formatting (BUG-04)', async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState('Assam');

    const summary = await tracker.getSummary();
    const amberBoxText = String(summary.total); // no separators, e.g. "204386"

    const tooltipRaw = await tracker.getPieHoverTooltipText(); // "Total<br>204,386<br>50%"
    const tooltipNumber = tooltipRaw.split('<br>')[1] || '';

    console.log(`amber box: "${amberBoxText}", tooltip: "${tooltipNumber}"`);

    // known issue - tooltip uses comma separators, amber box doesn't.
    // asserting they SHOULD match so this shows red until someone fixes it.
    expect(tooltipNumber.replace(/,/g, ''), 'BUG-04: tooltip number should match amber box once separators are stripped').toBe(amberBoxText);
    expect(tooltipNumber, 'BUG-04: tooltip formatting is inconsistent with the amber box (comma vs none)').toBe(amberBoxText);
  });

  test('chart title punctuation consistency (BUG-05)', async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState('Andhra Pradesh');

    const pieTitle = await tracker.getPieTitle();
    const lineTitle = await tracker.getLineTitle();
    console.log(`pie title: "${pieTitle}"`);
    console.log(`line title: "${lineTitle}"`);

    // line chart title spaces its punctuation, pie chart doesn't - inconsistent
    expect(pieTitle, 'BUG-05: pie title is missing a space before the parenthesis').toBe('COVID-19 Distribution (Pie Chart)');
  });

  test('category order matches between pie legend and line x-axis (BUG-06)', async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState('Andhra Pradesh');

    const pieOrder = (await tracker.getPieLegend()).map(e => e.label);
    const lineOrder = await tracker.getLineXAxisLabels();
    console.log(`pie legend order: ${pieOrder.join(', ')}`);
    console.log(`line x-axis order: ${lineOrder.join(', ')}`);

    // normalize "Total" vs "Total Cases" so we're comparing category order, not label wording
    const normalize = (arr: string[]) => arr.map(l => l.replace('Total Cases', 'Total'));

    expect(normalize(lineOrder), 'BUG-06: category order differs between the pie legend and the line chart x-axis').toEqual(normalize(pieOrder));
  });

  test('known static text spot check', async ({ page }) => {
    // not a full spelling pass, just pinning down the exact strings we know about
    // so a typo introduced later would get caught here
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await expect(page.locator('h1')).toHaveText('COVID-19 Tracker - India');
    await tracker.selectState('Andhra Pradesh');
    await expect(page.locator('.js-plotly-plot').nth(1).locator('.gtitle')).toHaveText('COVID-19 Cases : Line Chart Representation');
  });
});

test.describe('TC-11 layout check at a few screen widths', { tag: '@ui-validation' }, () => {
  // only checking 2 states here on purpose - this is about layout/css, not data,
  // so running it 28 times wouldn't tell us anything new. picked one normal length
  // name and the longest one to catch text truncation issues.
  const widths = [
    { name: '1920px', w: 1920, h: 1080 },
    { name: '1366px', w: 1366, h: 768 },
    { name: '768px', w: 768, h: 1024 },
    { name: '375px', w: 375, h: 812 },
  ];
  const statesToCheck = ['Andhra Pradesh', 'Arunachal Pradesh'];

  for (const stateName of statesToCheck) {
    for (const vp of widths) {
      test(`${stateName} at ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        const tracker = new TrackerPage(page);
        await tracker.goto(baseUrl);
        await tracker.selectState(stateName);

        // rough overflow check - the heading text shouldn't be wider than the viewport
        const headingBox = await page.locator('.resultCard h2').boundingBox();
        if (headingBox) {
          expect(headingBox.x + headingBox.width, `heading shouldn't overflow past the right edge at ${vp.name}`).toBeLessThanOrEqual(vp.w + 5);
        }

        const safeName = stateName.replace(/\s+/g, '-');
        await page.screenshot({ path: `test-results/screens/tc11-${safeName}-${vp.name}.png`, fullPage: true });
      });
    }
  }
});
