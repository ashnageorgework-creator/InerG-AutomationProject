import { test, expect } from '@playwright/test';
import { TrackerPage } from '../../pages/trackerPage';
import { baseUrl } from '../../config';
import { isExactMatch } from '../../utils/colors';
import states from '../../test-data/states.json';

// TC-10 - run the main checks across every state in the dropdown (28 of them,
// doc said 27 but the actual site has 28 - see notes) and build a table so we
// know if the known bugs are one-off or happen everywhere.
//
// note: not re-running the full line chart coordinate math (TC-09) for all 28,
// that one's already proven to work and doesn't depend on which state's loaded.
// same story for TC-05/TC-08 internal color consistency. focusing this sweep on
// the stuff that can actually differ state to state: the sum check, and whether
// BUG-01/BUG-02 keep showing up everywhere.

test.describe('TC-10 cross state sweep', { tag: '@regression' }, () => {
  test('run sum check + bug reproduction check across all states', async ({ page }) => {
    test.setTimeout(10 * 60 * 1000); // this loops 28 states, needs a bigger clock

    const tracker = new TrackerPage(page);
    await tracker.goto(baseUrl);

    const rows: any[] = [];

    for (const stateName of states as string[]) {
      await tracker.selectState(stateName);

      const heading = await tracker.getHeading();
      const headingOk = heading === `Results for ${stateName}`;

      const summary = await tracker.getSummary();
      const computedSum = summary.active + summary.recovered + summary.deaths;
      const sumDelta = summary.total - computedSum;
      const sumOk = sumDelta === 0;

      const pieLegend = await tracker.getPieLegend();
      const lineLegend = await tracker.getLineLegend();

      const totalSlice = (await tracker.getPieSlices())[0]; // total is always first slice
      const bug01Delta = totalSlice ? Math.round((totalSlice.pctValue - 100) * 100) / 100 : null;

      const pieRecovered = pieLegend.find(e => e.label === 'Recovered');
      const lineRecovered = lineLegend.find(e => e.label === 'Recovered');
      const pieActive = pieLegend.find(e => e.label === 'Active Cases');
      const lineActive = lineLegend.find(e => e.label === 'Active Cases');

      const recoveredSwapped = pieRecovered && lineRecovered && pieRecovered.color && lineRecovered.color
        ? !isExactMatch(pieRecovered.color, lineRecovered.color)
        : null;
      const activeSwapped = pieActive && lineActive && pieActive.color && lineActive.color
        ? !isExactMatch(pieActive.color, lineActive.color)
        : null;

      rows.push({
        state: stateName,
        headingOk,
        sumDelta,
        sumOk,
        bug01Delta,
        recoveredSwapped,
        activeSwapped,
      });
    }

    // dump a readable table into the console/report
    console.log('\n--- TC-10 sweep results ---');
    console.log('state | headingOk | sumDelta | bug01Delta(pp) | recoveredSwapped | activeSwapped');
    for (const r of rows) {
      console.log(`${r.state} | ${r.headingOk} | ${r.sumDelta} | ${r.bug01Delta} | ${r.recoveredSwapped} | ${r.activeSwapped}`);
    }

    const failedSumStates = rows.filter(r => !r.sumOk).map(r => `${r.state} (off by ${r.sumDelta})`);
    console.log(`\nstates that failed the sum check: ${failedSumStates.length ? failedSumStates.join(', ') : 'none'}`);

    const notReproducingBug01 = rows.filter(r => r.bug01Delta !== null && Math.abs(r.bug01Delta) < 1);
    const notReproducingBug02 = rows.filter(r => r.recoveredSwapped === false || r.activeSwapped === false);
    console.log(`states where BUG-01 did NOT show up: ${notReproducingBug01.length}`);
    console.log(`states where BUG-02 did NOT show up: ${notReproducingBug02.length}`);

    await page.screenshot({ path: 'test-results/screens/tc10-sweep-last-state.png' });

    // headings should always be right, no reason for this to ever fail
    for (const r of rows) {
      expect.soft(r.headingOk, `${r.state}: heading should match selection`).toBe(true);
    }

    // per doc, expecting BUG-01 and BUG-02 to reproduce on basically every state.
    // if this soft-assert fails, that actually means the bug is NOT systemic, which
    // would be a useful (and different) finding than what we assumed going in.
    expect.soft(notReproducingBug01.length, 'BUG-01 should reproduce on every state').toBe(0);
    expect.soft(notReproducingBug02.length, 'BUG-02 should reproduce on every state').toBe(0);

    // not asserting sumOk here on purpose - we already know some states will fail
    // this and that's the whole point of the sweep, logging the list above is the deliverable
  });
});
