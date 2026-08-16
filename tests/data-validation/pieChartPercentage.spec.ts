import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

const STATE = 'Arunachal Pradesh';

test.describe('TC-04 pie slice percentages vs the real math (BUG-01)', { tag: '@data-validation' }, () => {
  // this one is SUPPOSED to fail right now. the app plots "Total" as its own slice
  // instead of using it as the denominator, so every % is wrong. logging the actual
  // vs expected numbers so it's clear how far off it is, not just "test failed".
  test(`${STATE} - slice percentages should match value/total`, async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);
    await tracker.selectState(STATE);

    const summary = await tracker.getSummary();
    const legend = await tracker.getPieLegend();
    const slices = await tracker.getPieSlices();

    // legend and slices come back in the same order, matched that up earlier by hand
    const results = legend.map((entry, i) => {
      const slice = slices[i];
      let expectedPct: number;

      if (entry.label === 'Total') {
        // total isn't really "a slice of itself" but the chart shows it as one,
        // so the correct expectation is it should read 100%, not ~50%
        expectedPct = 100;
      } else if (entry.label === 'Recovered') {
        expectedPct = (summary.recovered / summary.total) * 100;
      } else if (entry.label === 'Active Cases') {
        expectedPct = (summary.active / summary.total) * 100;
      } else {
        expectedPct = (summary.deaths / summary.total) * 100;
      }

      return {
        label: entry.label,
        displayedPct: slice.pctValue,
        expectedPct: Math.round(expectedPct * 100) / 100,
      };
    });

    for (const r of results) {
      const diff = Math.round((r.displayedPct - r.expectedPct) * 100) / 100;
      console.log(`${r.label}: displayed=${r.displayedPct}%, expected=${r.expectedPct}%, off by ${diff}pp`);
    }

    await page.screenshot({ path: 'test-results/screens/tc04-pie-percentages.png' });

    for (const r of results) {
      expect(r.displayedPct, `${r.label}: displayed ${r.displayedPct}% vs expected ${r.expectedPct}% (BUG-01)`).toBeCloseTo(r.expectedPct, 1);
    }
  });
});
