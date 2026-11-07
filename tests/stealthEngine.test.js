import { describe, expect, it } from 'vitest';
import { HeatMap, ReplayTrack, angleDifference, hasLineOfSight, isInVision } from '../src/game/StealthEngine.js';

describe('guard vision', () => {
  const guard = { x: 0, y: 0, facing: 0 };

  it('sees targets inside its range and forward cone', () => {
    expect(isInVision(guard, { x: 80, y: 0 }, 100, Math.PI / 4)).toBe(true);
    expect(isInVision(guard, { x: 80, y: 80 }, 130, Math.PI / 4)).toBe(true);
  });

  it('rejects targets behind or beyond the guard', () => {
    expect(isInVision(guard, { x: -10, y: 0 }, 100, Math.PI / 3)).toBe(false);
    expect(isInVision(guard, { x: 120, y: 0 }, 100, Math.PI / 3)).toBe(false);
    expect(Math.abs(angleDifference(Math.PI, 0))).toBeCloseTo(Math.PI);
  });
});

describe('line of sight', () => {
  it('stops vision at a blocking point', () => {
    const wallAtMidpoint = (x, y) => x > 45 && x < 55 && Math.abs(y) < 5;
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 100, y: 0 }, wallAtMidpoint, 5)).toBe(false);
  });

  it('allows a clear path', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 100, y: 0 }, () => false, 10)).toBe(true);
  });
});

describe('adaptive heatmap', () => {
  it('uses repeated movement to select the hottest tile', () => {
    const heat = new HeatMap(5, 5);
    heat.add(2.2, 1.7, 4);
    heat.add(3.1, 3.1, 2);
    expect(heat.hottest()).toEqual({ x: 2, y: 1, value: 4 });
    heat.cool(1);
    expect(heat.hottest()).toEqual({ x: 2, y: 1, value: 3 });
  });
});

describe('echo replay track', () => {
  it('interpolates a recorded position and loops it', () => {
    const replay = new ReplayTrack([
      { t: 0, x: 0, y: 0, facing: 0 },
      { t: 2, x: 100, y: 40, facing: 1 },
    ]);
    expect(replay.sample(1)).toMatchObject({ x: 50, y: 20, facing: 0 });
    expect(replay.sample(3)).toMatchObject({ x: 50, y: 20, facing: 0 });
  });
});
