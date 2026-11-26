// World generation for Sky Courier: Island Run.
// One seeded world per mission: islands over open sea, a runway, target
// rings and drifting clouds. Everything is placed in metres, z forward.

import { makeRng } from './random.js';

export const MISSIONS = {
  rings: {
    id: 'rings',
    name: 'Ring Run',
    blurb: 'Fly through 10 rings before the fuel runs out.',
    ringCount: 10,
    ringSpacing: 800,
    runwayAt: null,
    wind: 0,
    baseSpeed: 58,
  },
  hop: {
    id: 'hop',
    name: 'Island Hop',
    blurb: 'Reach the runway 12 km out and land her gently.',
    ringCount: 6,
    ringSpacing: 1500,
    runwayAt: 12000,
    wind: 0,
    baseSpeed: 58,
  },
  storm: {
    id: 'storm',
    name: 'Storm Dash',
    blurb: 'Twelve rings, gusting wind, no room for error.',
    ringCount: 12,
    ringSpacing: 700,
    runwayAt: null,
    wind: 9,
    baseSpeed: 66,
  },
};

export function buildWorld(missionId, seed) {
  const mission = MISSIONS[missionId] ?? MISSIONS.rings;
  const rng = makeRng(seed);

  // Islands: low green humps with a sand rim, scattered off the flight line
  // so a pilot can thread between them. A few are tall enough to matter.
  const islands = [];
  const islandCount = 26;
  for (let i = 0; i < islandCount; i += 1) {
    const z = 700 + i * 520 + rng.range(0, 380);
    const side = rng.next() < 0.5 ? -1 : 1;
    const x = side * rng.range(260, 900);
    const half = rng.range(90, 260);
    const peak = rng.next() < 0.22 ? rng.range(120, 220) : rng.range(18, 90);
    islands.push({
      x0: x - half,
      x1: x + half,
      z0: z,
      z1: z + rng.range(220, 520),
      peak,
      hue: rng.pick([0, 1, 2]),
    });
  }

  // Target rings wander across the flight line so the pilot must work.
  const rings = [];
  let ringX = 0;
  for (let i = 0; i < mission.ringCount; i += 1) {
    ringX += rng.range(-200, 200);
    ringX = Math.max(-380, Math.min(380, ringX));
    rings.push({
      z: 1200 + i * mission.ringSpacing,
      x: ringX,
      y: rng.range(140, 420),
      r: 56,
      passed: false,
      missed: false,
    });
  }

  // The runway sits on a long flat island straight ahead.
  const runway = mission.runwayAt
    ? { z0: mission.runwayAt, z1: mission.runwayAt + 900, x: 0, width: 70 }
    : null;

  // Every sortie starts on the home strip: throttle up, rotate, and go.
  const homeRunway = { z0: -100, z1: 900, x: 0, width: 70 };

  // Clouds drift far above the sea, three layers of parallax.
  const clouds = [];
  for (let i = 0; i < 22; i += 1) {
    clouds.push({
      x: rng.range(-1600, 1600),
      y: rng.range(420, 780),
      z: rng.range(400, 9000),
      s: rng.range(60, 190),
      speed: rng.range(2, 7),
    });
  }

  return { mission, islands, rings, runway, homeRunway, clouds, seed };
}

// The island, if any, whose footprint the plane is over right now.
export function islandUnder(world, x, z) {
  for (const island of world.islands) {
    if (z >= island.z0 && z <= island.z1 && x >= island.x0 && x <= island.x1) {
      return island;
    }
  }
  return null;
}

// The runway strip, if any, under the plane: home strip or destination.
export function runwayUnder(world, x, z) {
  const strips = [world.homeRunway, world.runway].filter(Boolean);
  for (const strip of strips) {
    if (z >= strip.z0 && z <= strip.z1 && Math.abs(x - strip.x) <= strip.width / 2) {
      return strip;
    }
  }
  return null;
}

// True when the plane is over any runway strip.
export function overRunway(world, x, z) {
  return runwayUnder(world, x, z) !== null;
}
