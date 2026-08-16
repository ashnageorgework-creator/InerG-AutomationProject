// helper stuff for pulling colors out of plotly's inline style attributes and comparing them

// plotly puts colors in style strings like "fill: rgb(31, 119, 180); fill-opacity: 1;"
// this just grabs the fill or stroke value out of that mess
export function getFillColor(styleStr: string) {
  const m = styleStr.match(/fill:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

export function getStrokeColor(styleStr: string) {
  const m = styleStr.match(/stroke:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

export function colorToString(c: { r: number; g: number; b: number }) {
  return `rgb(${c.r},${c.g},${c.b})`;
}

// straight up exact match, no wiggle room
export function isExactMatch(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) {
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
}

// converts rgb to a rough hue bucket like "blue" or "orange" so we can compare
// colors that are "basically the same family" even if the exact hex differs
function rgbToHsl(c: { r: number; g: number; b: number }) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
  }
  return { h, s, l };
}

// buckets: red, orange, yellow, green, cyan, blue, purple, pink, gray
export function getHueBucket(c: { r: number; g: number; b: number }) {
  const { h, s, l } = rgbToHsl(c);

  // low saturation / very light or dark = basically grayscale, not a real "hue"
  if (s < 0.1 || l < 0.08 || l > 0.95) return 'gray';

  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 200) return 'cyan';
  if (h < 260) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

export function isSameHueFamily(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) {
  return getHueBucket(c1) === getHueBucket(c2);
}
