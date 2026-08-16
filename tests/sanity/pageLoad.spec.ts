import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

// TC-01 - just checking the page looks right before anyone touches the dropdown

test.describe('TC-01 initial page load', { tag: '@sanity' }, () => {
  test('no result card, no charts, just dropdown + map on first load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);

    await expect(page.locator('h1')).toHaveText('COVID-19 Tracker - India');

    const hasResultCard = await tracker.hasResultCard();
    expect(hasResultCard, 'result card should not exist before a state is picked').toBe(false);

    const hasCharts = await tracker.hasCharts();
    expect(hasCharts, 'no pie/line charts should exist before a state is picked').toBe(false);

    const dropdownVal = await tracker.getSelectedDropdownValue();
    expect(dropdownVal, 'dropdown should still be on the placeholder').toBe('');

    const mapVisible = await tracker.hasMap();
    expect(mapVisible, 'map should render even with nothing selected').toBe(true);

    const markerCount = await page.locator('.leaflet-marker-icon').count();
    expect(markerCount, 'no marker should show up until a state is picked').toBe(0);

    await page.screenshot({ path: 'test-results/screens/tc01-baseline.png' });

    expect(consoleErrors, `console errors on load: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });
});
