import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';
import { isExactMatch } from '../../utils/colors';

const STATE = 'Arunachal Pradesh';

test.describe('TC-05 pie legend colors match their own slice colors', { tag: '@ui-validation' }, () => {
  // this should just pass - plotly keeps a single chart's legend and slices
  // in sync internally, it's only cross-chart comparisons that get weird (TC-06)
  test(`${STATE} - legend colors line up with slice colors`, async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState(STATE);

    const legend = await tracker.getPieLegend();
    const slices = await tracker.getPieSlices();

    for (const entry of legend) {
      const matchFound = slices.some(s => s.color && entry.color && isExactMatch(s.color, entry.color));
      expect(matchFound, `legend entry "${entry.label}" (${JSON.stringify(entry.color)}) should match some slice color`).toBe(true);
    }
  });
});
