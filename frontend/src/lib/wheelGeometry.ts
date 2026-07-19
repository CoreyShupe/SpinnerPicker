/**
 * Pure geometry helpers for rendering and spinning the SVG wheel.
 * Angles are measured in degrees, clockwise from the top (12 o'clock), which is
 * where the pointer sits.
 */

export interface Point {
  x: number;
  y: number;
}

/** Convert an angle (deg, clockwise from top) to a point on a circle. */
export function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

/** SVG path for a pie slice spanning [startAngle, endAngle] (deg, from top). */
export function slicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = pointOnCircle(cx, cy, r, startAngle);
  const end = pointOnCircle(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

/**
 * Compute the absolute rotation (deg) that lands the center of slice `index`
 * under the top pointer, spinning forward from `currentRotation` by at least
 * `spins` full turns. Equal-sized slices.
 */
export function rotationForIndex(
  currentRotation: number,
  index: number,
  count: number,
  spins = 5,
): number {
  const slice = 360 / count;
  const sliceCenter = index * slice + slice / 2; // clockwise from top
  // We need finalRotation ≡ -sliceCenter (mod 360) so the center sits at top.
  const targetMod = ((360 - (sliceCenter % 360)) % 360 + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta < 0) delta += 360;
  return currentRotation + spins * 360 + delta;
}
