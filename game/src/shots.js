// Deterministic screenshot states for Sky Courier: Island Run.
// ?shot=start|play|ring|land&seed=1 renders one frozen frame of the
// game's own code: the autopilot flies the seeded world with scripted
// inputs, so every screenshot is a real render and repeats exactly.

import { buildWorld } from './world.js';
import { createPlane, autopilotInput, updatePlane } from './plane.js';
import { drawScene, drawTitleScreen } from './render.js';

const SHOT_SEED = 1;

function simulate(plane, world, seconds, steer) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i += 1) {
    const target = steer(plane, world, i);
    const input = target
      ? autopilotInput(plane, target)
      : { roll: 0, pitch: 0, throttle: 0.62 };
    updatePlane(
      plane,
      { roll: input.roll, pitch: input.pitch, throttleAxis: 0 },
      world,
      dt,
    );
    // Hold the scripted throttle by writing it back each step.
    plane.throttle = input.throttle;
    if (plane.crashed || plane.landed) break;
  }
}

function nextRingTarget(plane, world) {
  for (const ring of world.rings) {
    if (!ring.passed && !ring.missed && ring.z > plane.z) {
      return ring;
    }
  }
  return null;
}

export function setupShot(ctx, canvas, name) {
  const width = canvas.width;
  const height = canvas.height;
  const seed = SHOT_SEED;

  if (name === 'start') {
    // Title screen: the courier parked on the home strip at golden hour,
    // the runway stretching ahead under her nose.
    const world = buildWorld('hop', seed);
    const plane = createPlane(world.mission);
    plane.z = 250;
    plane.alt = 0;
    plane.speed = 0;
    drawTitleScreen(ctx, plane, world, 0, width, height);
    return { state: 'title', world, plane };
  }

  if (name === 'play') {
    // Mid-flight: chasing the third ring, instruments lit, sea below.
    // Forty seconds of autopilot settles her onto the ring line.
    const world = buildWorld('rings', seed);
    const plane = createPlane(world.mission);
    simulate(plane, world, 45, (p, w) => nextRingTarget(p, w));
    drawScene(ctx, plane, world, 45, width, height);
    return { state: 'flying', world, plane };
  }

  if (name === 'ring') {
    // A ring fills the frame a heartbeat before the pass.
    const world = buildWorld('rings', seed);
    const plane = createPlane(world.mission);
    const target = world.rings[2];
    simulate(plane, world, 1, () => target);
    plane.z = target.z - 260;
    plane.x = target.x - 26;
    plane.alt = target.y + 18;
    plane.heading = 0;
    drawScene(ctx, plane, world, 30, width, height);
    return { state: 'flying', world, plane };
  }

  if (name === 'land') {
    // Final approach: the runway ahead, low and slow, gear of the mind down.
    const world = buildWorld('hop', seed);
    const plane = createPlane(world.mission);
    simulate(plane, world, 60, (p, w) => {
      const ring = nextRingTarget(p, w);
      if (ring) return ring;
      return { x: 0, y: 60 };
    });
    plane.z = world.runway.z0 - 450;
    plane.alt = 32;
    plane.speed = 55;
    plane.throttle = 0.42;
    plane.vspeed = -2.5;
    plane.heading = 0;
    plane.x = 0;
    drawScene(ctx, plane, world, 60, width, height);
    return { state: 'flying', world, plane };
  }

  return null;
}
