import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

test.describe('TC-11 console errors while switching states', { tag: '@sanity' }, () => {
  test('no js errors while clicking through a few states', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);

    for (const s of ['Andhra Pradesh', 'Bihar', 'Goa', 'Kerala', 'Punjab']) {
      await tracker.selectState(s);
    }

    expect(errors, `console errors while switching states: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
