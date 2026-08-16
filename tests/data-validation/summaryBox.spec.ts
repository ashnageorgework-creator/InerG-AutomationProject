import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

// TC-03 - active + recovered + deaths should add up to total.
// running this on two states on purpose - arunachal pradesh balances fine,
// assam is known to be off by 3. keeping them as separate tests so the report
// shows one green one red instead of hiding it in a single pass/fail.

async function checkSum(page, stateName: string) {
  const tracker = new TrackerPage(page);
  await tracker.goto(baseUrl);
  await tracker.selectState(stateName);

  const summary = await tracker.getSummary();
  expect(summary.total).toBeGreaterThanOrEqual(0);
  expect(summary.active).toBeGreaterThanOrEqual(0);
  expect(summary.recovered).toBeGreaterThanOrEqual(0);
  expect(summary.deaths).toBeGreaterThanOrEqual(0);

  const computedSum = summary.active + summary.recovered + summary.deaths;
  const delta = summary.total - computedSum;

  console.log(`${stateName}: total=${summary.total}, active+recovered+deaths=${computedSum}, delta=${delta}`);

  await page.screenshot({ path: `test-results/screens/tc03-${stateName.replace(/\s+/g, '-')}.png` });

  expect(delta, `${stateName}: total (${summary.total}) should equal active+recovered+deaths (${computedSum}), off by ${delta}`).toBe(0);
}

test.describe('TC-03 summary box arithmetic', { tag: '@data-validation' }, () => {
  test('Arunachal Pradesh - numbers should add up', async ({ page }) => {
    await checkSum(page, 'Arunachal Pradesh');
  });

  test('Assam - known to be off by 3 (BUG-03)', async ({ page }) => {
    await checkSum(page, 'Assam');
  });
});
