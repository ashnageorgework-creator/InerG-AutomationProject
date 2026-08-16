import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';

// TC-13 Set A - clicking every real button on the page and checking it does what it says.
// always runs visible, no --headed flag needed, so it's easy to watch happen.
// (the stale-state check, 13.15, lives separately in regression/staleStateCheck.spec.ts)
test.use({
  headless: false,
  launchOptions: { slowMo: 350 },
});

// little pause so a human watching can register what just happened before the next click fires
async function pause(page: Page, ms = 1000) {
  await page.waitForTimeout(ms);
}

// Set A - button mechanics don't depend on which state is loaded, so one clean state is enough
const testState = 'Arunachal Pradesh';

test.describe('TC-13 interactive controls - button mechanics (Set A)', { tag: '@functional' }, () => {
  test(`${testState} - every button on the page does what it says`, async ({ page }) => {
    test.setTimeout(120000); // clicks through a dozen-ish buttons in a row, give it room

    const tracker = new TrackerPage(page);
    const downloadFolder = path.join('test-results', 'downloads-tc13');
    fs.mkdirSync(downloadFolder, { recursive: true });

    // 13.1 + 13.2
    await tracker.goto(baseUrl);
    await tracker.selectState(testState);
    expect(await tracker.hasResultCard()).toBe(true);
    expect(await tracker.hasCharts()).toBe(true);
    await pause(page, 1500); // let the charts settle on screen before we start clicking things

    // grab the original range before touching anything, need this later for 13.14
    const originalRange = await tracker.getLineAxisRanges();

    await test.step('13.3 map zoom in', async () => {
      const before = await tracker.getMapZoomLevel();
      await tracker.clickMapZoomIn();
      const after = await tracker.getMapZoomLevel();
      console.log(`map zoom in: ${before} -> ${after}`);
      expect(after, 'map zoom level should go up after clicking zoom in').toBeGreaterThan(before ?? 0);
    });
    await pause(page);

    await test.step('13.4 map zoom out', async () => {
      const before = await tracker.getMapZoomLevel();
      await tracker.clickMapZoomOut();
      const after = await tracker.getMapZoomLevel();
      console.log(`map zoom out: ${before} -> ${after}`);
      expect(after, 'map zoom level should go down after clicking zoom out').toBeLessThan(before ?? 999);
    });
    await pause(page);

    await test.step('13.5 pie chart download', async () => {
      const savePath = path.join(downloadFolder, 'pie-download.png');
      await tracker.downloadChartPng(0, savePath);
      expect(fs.existsSync(savePath)).toBe(true);
      expect(fs.statSync(savePath).size).toBeGreaterThan(0);
    });
    await pause(page);

    await test.step('13.6 line chart download', async () => {
      const savePath = path.join(downloadFolder, 'line-download.png');
      await tracker.downloadChartPng(1, savePath);
      expect(fs.existsSync(savePath)).toBe(true);
      expect(fs.statSync(savePath).size).toBeGreaterThan(0);
    });
    await pause(page);

    await test.step('13.7 line chart zoom mode (drag)', async () => {
      await tracker.clickModebarButton(1, 'Zoom');
      const cls = await tracker.getModebarButtonClass(1, 'Zoom');
      expect(cls).toContain('active');

      const before = await tracker.getLineAxisRanges();
      await tracker.dragOnLineChart({ x: 150, y: 150 }, { x: 350, y: 300 });
      const after = await tracker.getLineAxisRanges();
      console.log(`zoom drag: y range ${before.y} -> ${after.y}`);

      const spanBefore = Math.abs(before.y[1] - before.y[0]);
      const spanAfter = Math.abs(after.y[1] - after.y[0]);
      expect(spanAfter, 'dragging in zoom mode should narrow the range').toBeLessThan(spanBefore);
    });
    await pause(page);

    // reset before moving to pan, so pan starts from a known range
    await tracker.clickModebarButton(1, 'Reset axes');
    await pause(page);

    await test.step('13.8 line chart pan mode (drag)', async () => {
      await tracker.clickModebarButton(1, 'Pan');
      const panCls = await tracker.getModebarButtonClass(1, 'Pan');
      const zoomCls = await tracker.getModebarButtonClass(1, 'Zoom');
      expect(panCls).toContain('active');
      expect(zoomCls).not.toContain('active');

      const before = await tracker.getLineAxisRanges();
      await tracker.dragOnLineChart({ x: 150, y: 200 }, { x: 300, y: 200 });
      const after = await tracker.getLineAxisRanges();
      console.log(`pan drag: x range ${before.x} -> ${after.x}`);

      const spanBefore = Math.abs(before.x[1] - before.x[0]);
      const spanAfter = Math.abs(after.x[1] - after.x[0]);
      expect(spanAfter, 'panning should keep the same span, just shift it').toBeCloseTo(spanBefore, 1);
      expect(after.x[0], 'panning should actually move the range somewhere').not.toBeCloseTo(before.x[0], 1);
    });
    await pause(page);

    await tracker.clickModebarButton(1, 'Reset axes');
    await pause(page);

    // 13.9 box select - points inside the dragged box should stay full opacity, others should dim
    await test.step('13.9 line chart box select', async () => {
      await tracker.clickModebarButton(1, 'Box Select');
      const cls = await tracker.getModebarButtonClass(1, 'Box Select');
      expect(cls).toContain('active');

      await tracker.dragOnLineChart({ x: 100, y: 120 }, { x: 300, y: 330 });
      const opacities = await tracker.getLinePointOpacities();
      console.log(`box select point opacities: ${opacities}`);

      const distinctValues = new Set(opacities.map(o => Math.round(o * 100)));
      expect(distinctValues.size, 'box select should dim some points but not others').toBeGreaterThan(1);
    });
    await pause(page);

    await tracker.clickModebarButton(1, 'Reset axes');
    await pause(page);

    // 13.10 lasso select - same dimming mechanism as box select, just a freeform path
    await test.step('13.10 line chart lasso select', async () => {
      await tracker.clickModebarButton(1, 'Lasso Select');
      const cls = await tracker.getModebarButtonClass(1, 'Lasso Select');
      expect(cls).toContain('active');

      await tracker.dragOnLineChart({ x: 100, y: 120 }, { x: 300, y: 330 });
      const opacities = await tracker.getLinePointOpacities();
      console.log(`lasso select point opacities: ${opacities}`);

      const distinctValues = new Set(opacities.map(o => Math.round(o * 100)));
      expect(distinctValues.size, 'lasso select should dim some points but not others').toBeGreaterThan(1);
    });
    await pause(page);

    // back to a clean slate for the one-shot buttons
    await tracker.clickModebarButton(1, 'Reset axes');
    await tracker.clickModebarButton(1, 'Zoom');
    await pause(page);

    await test.step('13.11 line chart zoom in (one-shot)', async () => {
      const before = await tracker.getLineAxisRanges();
      await tracker.clickModebarButton(1, 'Zoom in');
      const after = await tracker.getLineAxisRanges();
      const spanBefore = Math.abs(before.y[1] - before.y[0]);
      const spanAfter = Math.abs(after.y[1] - after.y[0]);
      console.log(`zoom in: span ${spanBefore} -> ${spanAfter}`);
      expect(spanAfter, 'zoom in should narrow the range').toBeLessThan(spanBefore);
    });
    await pause(page);

    await test.step('13.12 line chart zoom out (one-shot)', async () => {
      const before = await tracker.getLineAxisRanges();
      await tracker.clickModebarButton(1, 'Zoom out');
      const after = await tracker.getLineAxisRanges();
      const spanBefore = Math.abs(before.y[1] - before.y[0]);
      const spanAfter = Math.abs(after.y[1] - after.y[0]);
      console.log(`zoom out: span ${spanBefore} -> ${spanAfter}`);
      expect(spanAfter, 'zoom out should widen the range').toBeGreaterThan(spanBefore);
    });
    await pause(page);

    // 13.13 autoscale - fits the current data, not necessarily the original view
    await test.step('13.13 line chart autoscale', async () => {
      // zoom into some random spot first so autoscale actually has something to undo
      await tracker.dragOnLineChart({ x: 150, y: 150 }, { x: 250, y: 250 });
      const zoomed = await tracker.getLineAxisRanges();

      await tracker.clickModebarButton(1, 'Autoscale');
      const afterAutoscale = await tracker.getLineAxisRanges();
      console.log(`autoscale: y range ${zoomed.y} -> ${afterAutoscale.y}`);

      // arunachal pradesh's total is 14391, so a properly autoscaled y-max should be in
      // that ballpark, not still stuck on whatever random spot we zoomed into above
      expect(afterAutoscale.y[1]).toBeGreaterThan(10000);
      expect(afterAutoscale.y[1]).not.toBeCloseTo(zoomed.y[1], 0);
    });
    await pause(page);

    // 13.14 reset axes - goes back to the ORIGINAL range, not just "fit the data" like autoscale does
    await test.step('13.14 line chart reset axes (vs autoscale)', async () => {
      await tracker.dragOnLineChart({ x: 150, y: 150 }, { x: 250, y: 250 }); // zoom away from default first
      await tracker.clickModebarButton(1, 'Reset axes');
      const afterReset = await tracker.getLineAxisRanges();
      console.log(`reset axes: back to ${afterReset.y}, original was ${originalRange.y}`);

      expect(afterReset.y[0], 'reset axes should restore the exact original range').toBeCloseTo(originalRange.y[0], 0);
      expect(afterReset.y[1], 'reset axes should restore the exact original range').toBeCloseTo(originalRange.y[1], 0);
    });
    await pause(page, 1500); // hold on the final state for a beat before the test ends
  });
});
