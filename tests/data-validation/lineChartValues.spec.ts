import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';
import { buildYScale } from '../../utils/chartMath';

const STATE = 'Arunachal Pradesh';

// maps the line chart's x-axis label text to the matching summary box field
function summaryFieldFor(label: string, summary: any) {
  if (label === 'Total Cases') return summary.total;
  if (label === 'Recovered') return summary.recovered;
  if (label === 'Deaths') return summary.deaths;
  if (label === 'Active Cases') return summary.active;
  return null;
}

test.describe('TC-09 line chart values reconstructed from pixel position', { tag: '@data-validation' }, () => {
  // this rebuilds each point's real value from where it sits on the y axis,
  // using the tick labels as a ruler. more reliable than trying to screenshot-diff
  // or OCR the numbers off the chart.
  test(`${STATE} - decoded point values should match the summary box`, async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState(STATE);

    const summary = await tracker.getSummary();
    const yTicks = await tracker.getYAxisTicks();
    const xLabels = await tracker.getLineXAxisLabels();
    const points = await tracker.getLinePoints();

    const valueFromY = buildYScale(yTicks);

    // points come out of the dom in the same left-to-right order as the x labels,
    // checked this by hand against the point colors and it lines up
    for (let i = 0; i < points.length; i++) {
      const label = xLabels[i];
      const decoded = Math.round(valueFromY(points[i].y));
      const expected = summaryFieldFor(label, summary);

      console.log(`${label}: decoded from chart=${decoded}, summary box says=${expected}`);

      expect(decoded, `${label}: decoded value ${decoded} should be close to summary box value ${expected}`).toBeGreaterThanOrEqual(expected - 2);
      expect(decoded, `${label}: decoded value ${decoded} should be close to summary box value ${expected}`).toBeLessThanOrEqual(expected + 2);
    }

    await page.screenshot({ path: 'test-results/screens/tc09-line-values.png' });
  });
});
