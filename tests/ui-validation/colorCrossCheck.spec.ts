import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';
import { isExactMatch, isSameHueFamily, colorToString } from '../../utils/colors';

const STATE = 'Arunachal Pradesh';

// TC-06 - pie legend colors vs line legend colors, same 4 categories.
// line chart calls it "Total Cases" instead of "Total" so mapping that here.
const categoryMap: Record<string, string> = {
  Total: 'Total Cases',
  Recovered: 'Recovered',
  'Active Cases': 'Active Cases',
  Deaths: 'Deaths',
};

test.describe('TC-06 pie vs line chart legend colors (BUG-02)', { tag: '@ui-validation' }, () => {
  test(`${STATE} - cross chart color check, using soft asserts so we see everything`, async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState(STATE);

    const pieLegend = await tracker.getPieLegend();
    const lineLegend = await tracker.getLineLegend();

    for (const pieLabel of Object.keys(categoryMap)) {
      const lineLabel = categoryMap[pieLabel];
      const pieEntry = pieLegend.find(e => e.label === pieLabel);
      const lineEntry = lineLegend.find(e => e.label === lineLabel);

      if (!pieEntry || !lineEntry || !pieEntry.color || !lineEntry.color) {
        console.log(`could not find both colors for ${pieLabel} / ${lineLabel}`);
        continue;
      }

      const exact = isExactMatch(pieEntry.color, lineEntry.color);
      console.log(`${pieLabel}: pie=${colorToString(pieEntry.color)} line=${colorToString(lineEntry.color)} exactMatch=${exact}`);

      // recovered and active cases are known to be swapped, so this is expected
      // to fail for those two - keeping the assert in anyway, that's the whole point
      expect.soft(exact, `${pieLabel}: pie color ${colorToString(pieEntry.color)} should exact-match line color ${colorToString(lineEntry.color)}`).toBe(true);

      // for total and deaths, also check the looser "same color family" comparison
      // and report it separately - this tells us if it's a real color swap or
      // just a slightly different shade of the same color
      if (pieLabel === 'Total' || pieLabel === 'Deaths') {
        const sameFamily = isSameHueFamily(pieEntry.color, lineEntry.color);
        console.log(`${pieLabel}: same hue family (loose check) = ${sameFamily}`);
        expect.soft(sameFamily, `${pieLabel}: pie and line colors should at least be the same hue family`).toBe(true);
      }
    }

    await page.screenshot({ path: 'test-results/screens/tc06-color-crosscheck.png' });
  });
});
