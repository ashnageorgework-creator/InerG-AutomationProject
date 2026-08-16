import { test, expect, Page } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

// TC-13.15 (Set B) - does switching states wipe out a zoom/pan/select from before, or
// does it leak through? a regression guard, not a fresh functional check - making sure
// a previously-fine behavior (clean state reset) doesn't quietly break later.
test.use({
  headless: false,
  launchOptions: { slowMo: 350 },
});

async function pause(page: Page, ms = 1000) {
  await page.waitForTimeout(ms);
}

const transitionPairs = [
  { from: 'Arunachal Pradesh', to: 'Assam', note: 'low to high value transition' },
  { from: 'Andhra Pradesh', to: 'West Bengal', note: 'first dropdown option to last dropdown option' },
  { from: 'Assam', to: 'Assam', note: 'reselect the same state - does a no-op reselect still reset the view' },
];

test.describe('TC-13.15 stale-state check on switching states (Set B)', { tag: '@regression' }, () => {
  for (const pair of transitionPairs) {
    test(`${pair.from} -> ${pair.to} (${pair.note})`, async ({ page }) => {
      const tracker = new TrackerPage(page);
      await tracker.goto(baseUrl);

      await tracker.selectState(pair.from);
      await pause(page, 1200);
      await tracker.clickModebarButton(1, 'Zoom in'); // leave some zoom state behind on purpose
      await pause(page, 1200);
      const zoomedRange = await tracker.getLineAxisRanges();

      await tracker.selectState(pair.to);
      await pause(page, 1200);
      const rangeAfterSwitch = await tracker.getLineAxisRanges();

      // what SHOULD a fresh, un-zoomed view of stateTo look like? reset axes and compare.
      await tracker.clickModebarButton(1, 'Reset axes');
      await pause(page);
      const freshDefaultRange = await tracker.getLineAxisRanges();

      console.log(`${pair.from}->${pair.to}: zoomed on ${pair.from}=${zoomedRange.y}, right after switch=${rangeAfterSwitch.y}, fresh default=${freshDefaultRange.y}`);

      expect(rangeAfterSwitch.y[0], `switching to ${pair.to} should reset the view, not keep ${pair.from}'s zoom`).toBeCloseTo(freshDefaultRange.y[0], 0);
      expect(rangeAfterSwitch.y[1], `switching to ${pair.to} should reset the view, not keep ${pair.from}'s zoom`).toBeCloseTo(freshDefaultRange.y[1], 0);
    });
  }
});
