/** Pure gameplay helpers. They are intentionally framework-independent for test coverage. */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function angleDifference(a, b) {
  let difference = (a - b + Math.PI) % (Math.PI * 2);
  if (difference < 0) difference += Math.PI * 2;
  return difference - Math.PI;
}

export function isInVision(guard, target, range, halfFovRadians) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > range || distance === 0) return false;
  const targetAngle = Math.atan2(dy, dx);
  return Math.abs(angleDifference(targetAngle, guard.facing)) <= halfFovRadians;
}

export function hasLineOfSight(start, end, isBlocked, step = 12) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const samples = Math.max(1, Math.ceil(distance / step));
  for (let index = 1; index < samples; index += 1) {
    const ratio = index / samples;
    if (isBlocked(start.x + dx * ratio, start.y + dy * ratio)) return false;
  }
  return true;
}

export class HeatMap {
  constructor(columns, rows) {
    this.columns = columns;
    this.rows = rows;
    this.values = Array.from({ length: rows }, () => Array(columns).fill(0));
  }

  add(x, y, amount = 1) {
    const col = clamp(Math.floor(x), 0, this.columns - 1);
    const row = clamp(Math.floor(y), 0, this.rows - 1);
    this.values[row][col] += amount;
  }

  cool(amount = 0.04) {
    this.values.forEach((row) => row.forEach((value, index) => { row[index] = Math.max(0, value - amount); }));
  }

  hottest(exclude = []) {
    const ignored = new Set(exclude.map(({ x, y }) => `${x},${y}`));
    let best = { x: 0, y: 0, value: -1 };
    this.values.forEach((row, y) => row.forEach((value, x) => {
      if (!ignored.has(`${x},${y}`) && value > best.value) best = { x, y, value };
    }));
    return best;
  }
}

export class ReplayTrack {
  constructor(samples = []) {
    this.samples = samples;
    this.duration = samples.at(-1)?.t ?? 0;
  }

  sample(time) {
    if (!this.samples.length) return null;
    const wrapped = this.duration > 0 ? time % this.duration : 0;
    let upper = this.samples.findIndex((point) => point.t >= wrapped);
    if (upper <= 0) return { ...this.samples[0] };
    if (upper === -1) return { ...this.samples.at(-1) };
    const before = this.samples[upper - 1];
    const after = this.samples[upper];
    const ratio = (wrapped - before.t) / (after.t - before.t || 1);
    return {
      x: before.x + (after.x - before.x) * ratio,
      y: before.y + (after.y - before.y) * ratio,
      facing: before.facing,
    };
  }
}
