import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';
import { isExactMatch } from '../../utils/colors';

const STATE = 'Arunachal Pradesh';

test.describe('TC-08 line legend colors match the actual point colors', { tag: '@ui-validation' }, () => {
  // internal consistency check, same idea as TC-05 but for the line chart.
  // should pass, plotly doesn't mix these up within one chart.
  test(`${STATE} - legend colors line up with point colors`, async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState(STATE);

    const legend = await tracker.getLineLegend();
    const points = await tracker.getLinePoints();

    for (const entry of legend) {
      const found = points.some(p => p.color && entry.color && isExactMatch(p.color, entry.color));
      expect(found, `legend entry "${entry.label}" should match a point color`).toBe(true);
    }
  });
});
