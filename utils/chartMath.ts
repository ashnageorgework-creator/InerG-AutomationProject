// math helpers for reconstructing line chart values from raw svg pixel positions

// axis labels come through as things like "0", "5k", "10k" - turn that into a real number
export function parseTickLabel(text: string) {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.endsWith('k')) {
    return parseFloat(trimmed.replace('k', '')) * 1000;
  }
  if (trimmed.endsWith('m')) {
    return parseFloat(trimmed.replace('m', '')) * 1000000;
  }
  return parseFloat(trimmed.replace(/,/g, ''));
}

// pulls the y number out of a "translate(x,y)" transform string
export function parseTranslateY(transform: string) {
  const m = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
  if (!m) return null;
  return Number(m[2]);
}

export function parseTranslateX(transform: string) {
  const m = transform.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
  if (!m) return null;
  return Number(m[1]);
}

// takes the axis ticks (value + pixel y) and gives back a function that converts
// any pixel y into a data value. just uses the first and last tick since plotly's
// axis is linear and evenly spaced anyway
export function buildYScale(ticks: { value: number; y: number }[]) {
  const first = ticks[0];
  const last = ticks[ticks.length - 1];
  const slope = (last.value - first.value) / (last.y - first.y);

  return function valueFromY(y: number) {
    return first.value + (y - first.y) * slope;
  };
}
