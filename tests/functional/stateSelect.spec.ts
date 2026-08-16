import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

// TC-02 - pick a state, make sure the heading actually matches what we picked.
// doing this a few times in a row without reloading, since stale-data bugs
// usually only show up after you've already changed the selection once.

test.describe('TC-02 select state and check heading', { tag: '@functional' }, () => {
  test('heading matches selected state, including after switching a few times', async ({ page }) => {
    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);

    // first real option, skipping the "Select a State" placeholder
    await tracker.selectState('Andhra Pradesh');
    let dropdownVal = await tracker.getSelectedDropdownValue();
    expect(dropdownVal).toBe('Andhra Pradesh');

    let heading = await tracker.getHeading();
    expect(heading).toBe('Results for Andhra Pradesh');
    let stateFromHeading = heading.replace('Results for ', '');
    expect(stateFromHeading, 'dropdown value and heading state should be the same').toBe(dropdownVal);

    const restOfThem = ['Kerala', 'Maharashtra', 'Tamil Nadu'];
    for (const stateName of restOfThem) {
      await tracker.selectState(stateName);
      dropdownVal = await tracker.getSelectedDropdownValue();
      heading = await tracker.getHeading();
      stateFromHeading = heading.replace('Results for ', '');

      expect(dropdownVal, `dropdown should say ${stateName}`).toBe(stateName);
      expect(heading, `heading should say Results for ${stateName}, not something stale`).toBe(`Results for ${stateName}`);
      expect(stateFromHeading).toBe(dropdownVal);
    }

    await page.screenshot({ path: 'test-results/screens/tc02-last-state.png' });
  });
});
