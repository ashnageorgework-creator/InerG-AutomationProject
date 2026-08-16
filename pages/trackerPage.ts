import { Page } from '@playwright/test';
import { getFillColor } from '../utils/colors';
import { parseTickLabel, parseTranslateY, parseTranslateX } from '../utils/chartMath';

// keeps all the selectors and dom digging in one spot so the test files just read like plain checks
export class TrackerPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url);
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(800);
  }

  async getSelectedDropdownValue() {
    return await this.page.locator('select.data-filter-input').inputValue();
  }

  async selectState(name: string) {
    await this.page.selectOption('select.data-filter-input', { label: name });
    // wait for the actual data to show up instead of a blind timeout - a fixed wait
    // isn't always long enough on a slower network and was causing reads of an empty
    // page (summary values coming back undefined) before the site had finished rendering
    await this.page.locator('.resultCard').waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(300); // small settle buffer for the charts to finish painting
  }

  async hasResultCard() {
    return (await this.page.locator('.resultCard').count()) > 0;
  }

  async hasCharts() {
    return (await this.page.locator('.graph-representation').count()) > 0;
  }

  async hasMap() {
    return await this.page.locator('.mapview .leaflet-container').isVisible();
  }

  async getHeading() {
    return (await this.page.locator('.resultCard h2').textContent()) || '';
  }

  async getSummary() {
    // rows look like "Total Cases : 14391" - order is Total, Active, Recovered, Deaths
    const rows = await this.page.locator('.display-data p').allTextContents();
    const nums = rows.map(r => {
      const raw = r.split(':')[1] || '';
      return Number(raw.replace(/[^0-9.]/g, ''));
    });
    return {
      total: nums[0],
      active: nums[1],
      recovered: nums[2],
      deaths: nums[3],
    };
  }

  async getPieTitle() {
    const t = this.page.locator('.js-plotly-plot').nth(0).locator('.gtitle');
    return (await t.textContent()) || '';
  }

  async getLineTitle() {
    const t = this.page.locator('.js-plotly-plot').nth(1).locator('.gtitle');
    return (await t.textContent()) || '';
  }

  async getPieSlices() {
    const chart = this.page.locator('.js-plotly-plot').nth(0);
    const sliceEls = chart.locator('.pielayer .slice path.surface');
    const textEls = chart.locator('.slicetext text');

    const styles = await sliceEls.evaluateAll(els => els.map(e => e.getAttribute('style') || ''));
    const pctTexts = await textEls.evaluateAll(els => els.map(e => e.getAttribute('data-unformatted') || e.textContent || ''));

    return styles.map((style, i) => {
      const pctStr = pctTexts[i] || '0%';
      return {
        color: getFillColor(style),
        pctText: pctStr,
        pctValue: parseFloat(pctStr.replace('%', '')),
      };
    });
  }

  async getPieLegend() {
    const chart = this.page.locator('.js-plotly-plot').nth(0);
    const traces = chart.locator('.legend .traces');
    const count = await traces.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      const trace = traces.nth(i);
      const label = await trace.locator('text').first().getAttribute('data-unformatted');
      const swatch = trace.locator('.legendpie');
      const style = await swatch.getAttribute('style');
      out.push({ label: label || '', color: getFillColor(style || '') });
    }
    return out;
  }

  async getLineLegend() {
    const chart = this.page.locator('.js-plotly-plot').nth(1);
    const traces = chart.locator('.legend .traces');
    const count = await traces.count();
    const out = [];
    for (let i = 0; i < count; i++) {
      const trace = traces.nth(i);
      const label = await trace.locator('text').first().getAttribute('data-unformatted');
      const swatch = trace.locator('.scatterpts');
      const style = await swatch.getAttribute('style');
      out.push({ label: label || '', color: getFillColor(style || '') });
    }
    return out;
  }

  async getLineXAxisLabels() {
    return await this.page.locator('.js-plotly-plot').nth(1).locator('.xtick text').allTextContents();
  }

  // a point's own transform is relative to a parent <g class="xy"> that has its own translate
  // offset, while the axis tick labels don't have that offset. add the two together or the
  // decoded values come out way off - found this the hard way comparing against real totals.
  async getLinePointsRaw() {
    return await this.page.locator('.js-plotly-plot').nth(1).evaluate((chartEl) => {
      const xyGroup = chartEl.querySelector('.scatterlayer').closest('.xy') as SVGGElement;
      const xyTransform = xyGroup ? xyGroup.getAttribute('transform') : null;

      const points = Array.from(chartEl.querySelectorAll('.scatterlayer .point')) as SVGPathElement[];
      return points.map(p => ({
        ownTransform: p.getAttribute('transform') || '',
        style: p.getAttribute('style') || '',
        xyGroupTransform: xyTransform,
      }));
    });
  }

  async getLinePoints() {
    const raw = await this.getLinePointsRaw();
    return raw.map(p => {
      const ownX = parseTranslateX(p.ownTransform) || 0;
      const ownY = parseTranslateY(p.ownTransform) || 0;
      const offX = p.xyGroupTransform ? (parseTranslateX(p.xyGroupTransform) || 0) : 0;
      const offY = p.xyGroupTransform ? (parseTranslateY(p.xyGroupTransform) || 0) : 0;
      return {
        color: getFillColor(p.style),
        x: ownX + offX,
        y: ownY + offY,
      };
    });
  }

  async getYAxisTicks() {
    const ticks = await this.page.locator('.js-plotly-plot').nth(1).locator('.ytick text').evaluateAll(els =>
      els.map(e => ({ text: e.textContent || '', transform: e.getAttribute('transform') || '' }))
    );
    return ticks.map(t => ({
      value: parseTickLabel(t.text),
      y: parseTranslateY(t.transform) || 0,
    }));
  }

  async countLinePoints() {
    return await this.page.locator('.js-plotly-plot').nth(1).locator('.scatterlayer .point').count();
  }

  async clickAutoscale() {
    const lineChart = this.page.locator('.js-plotly-plot').nth(1);
    await lineChart.hover(); // modebar buttons don't register clicks without a hover first
    await this.page.locator('a[data-title="Autoscale"]').click();
    await this.page.waitForTimeout(500);
  }

  async getPieHoverTooltipText() {
    const chart = this.page.locator('.js-plotly-plot').nth(0);
    const slice = chart.locator('.pielayer .slice path.surface').first();
    await slice.hover();
    await this.page.waitForTimeout(300);
    const tooltip = chart.locator('.hoverlayer .hovertext text.nums');
    return (await tooltip.getAttribute('data-unformatted')) || '';
  }

  // modebar is invisible (opacity 0) until the chart is hovered - plotly default behavior
  async hoverChart(chartIndex: number) {
    await this.page.locator('.js-plotly-plot').nth(chartIndex).hover();
  }

  async getModebarButtonClass(chartIndex: number, title: string) {
    const chart = this.page.locator('.js-plotly-plot').nth(chartIndex);
    const btn = chart.locator(`a.modebar-btn[data-title="${title}"]`);
    return (await btn.getAttribute('class')) || '';
  }

  async clickModebarButton(chartIndex: number, title: string) {
    await this.hoverChart(chartIndex);
    const chart = this.page.locator('.js-plotly-plot').nth(chartIndex);
    await chart.locator(`a.modebar-btn[data-title="${title}"]`).click();
    await this.page.waitForTimeout(400);
  }

  async downloadChartPng(chartIndex: number, savePath: string) {
    await this.hoverChart(chartIndex);
    const chart = this.page.locator('.js-plotly-plot').nth(chartIndex);
    const downloadPromise = this.page.waitForEvent('download');
    await chart.locator('a.modebar-btn[data-title="Download plot as a png"]').click();
    const download = await downloadPromise;
    await download.saveAs(savePath);
    return download;
  }

  async getLineAxisRanges() {
    // reads plotly's own internal layout object - more reliable than measuring pixels
    return await this.page.locator('.js-plotly-plot').nth(1).evaluate((el: any) => ({
      x: el._fullLayout.xaxis.range.slice(),
      y: el._fullLayout.yaxis.range.slice(),
    }));
  }

  async dragOnLineChart(fromOffset: { x: number; y: number }, toOffset: { x: number; y: number }) {
    const chart = this.page.locator('.js-plotly-plot').nth(1);
    const box = await chart.boundingBox();
    if (!box) throw new Error('line chart has no bounding box, cant drag on it');

    const startX = box.x + fromOffset.x;
    const startY = box.y + fromOffset.y;
    const endX = box.x + toOffset.x;
    const endY = box.y + toOffset.y;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY, { steps: 10 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(400);
  }

  async getLinePointOpacities() {
    return await this.page.locator('.js-plotly-plot').nth(1).locator('.scatterlayer .point').evaluateAll(els =>
      els.map(e => {
        const style = e.getAttribute('style') || '';
        const m = style.match(/opacity:\s*([\d.]+)/);
        return m ? parseFloat(m[1]) : 1;
      })
    );
  }

  async clickMapZoomIn() {
    await this.page.locator('.leaflet-control-zoom-in').click();
    await this.page.waitForTimeout(800);
  }

  async clickMapZoomOut() {
    await this.page.locator('.leaflet-control-zoom-out').click();
    await this.page.waitForTimeout(800);
  }

  async getMapZoomLevel() {
    // zoom level is the first number in the tile image url: /Z/X/Y.png
    const src = await this.page.locator('.mapview .leaflet-tile-pane img').first().getAttribute('src');
    if (!src) return null;
    const m = src.match(/\/(\d+)\/\d+\/\d+\.png/);
    return m ? Number(m[1]) : null;
  }
}
