import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

const STATE = 'Arunachal Pradesh';

test.describe('TC-07 line chart shows all 4 points after autoscale', { tag: '@functional' }, () => {
  test(`${STATE} - autoscale then check 4 points + 4 legend entries`, async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState(STATE);
    await tracker.clickAutoscale();

    const pointCount = await tracker.countLinePoints();
    expect(pointCount, 'should have exactly 4 points, one per category').toBe(4);

    const legend = await tracker.getLineLegend();
    expect(legend.length).toBe(4);
    const labels = legend.map(l => l.label);
    for (const expected of ['Total Cases', 'Recovered', 'Deaths', 'Active Cases']) {
      expect(labels, `legend should include ${expected}`).toContain(expected);
    }

    await page.screenshot({ path: 'test-results/screens/tc07-line-autoscale.png' });
  });
});
