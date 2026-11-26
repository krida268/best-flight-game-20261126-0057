// Flight model and the aircraft itself for Sky Courier: Island Run.
// Arcade physics with real trade-offs: throttle sets speed, speed sets
// climb, banking turns the nose, fuel is the clock, and a hard arrival
// on anything but the runway ends the sortie.

import { islandUnder, overRunway } from './world.js';

export function createPlane(mission) {
  return {
    // Position and motion (metres, metres/second, degrees).
    x: 0,
    z: 0,
    alt: 0,
    heading: 0,
    speed: 0,
    vspeed: 0,
    bank: 0,
    pitch: 0,
    throttle: 0.55,
    fuel: 100,
    // Run state.
    score: 0,
    ringsHit: 0,
    ringsMissed: 0,
    distance: 0,
    time: 0,
    crashed: null,
    landed: false,
    complete: false,
    outOfFuel: false,
    airborne: false,
    baseSpeed: mission.baseSpeed,
  };
}

// Steer the plane toward a target point (used by the autopilot in shot
// mode and by the title screen's attract flight). The roll follows the
// heading error to the target, so the nose stays pointed at it instead
// of wandering off the flight line; the pitch follows the altitude gap.
export function autopilotInput(plane, target) {
  const dx = target.x - plane.x;
  const dz = Math.max(50, (target.z ?? plane.z + 1000) - plane.z);
  const desiredHeading = (Math.atan2(dx, dz) * 180) / Math.PI;
  let headingError = desiredHeading - plane.heading;
  headingError = ((headingError + 540) % 360) - 180;
  const roll = Math.max(-0.8, Math.min(0.8, headingError / 18));
  const dy = target.y - plane.alt;
  const pitch = Math.max(-0.85, Math.min(0.85, dy / 120));
  return { roll, pitch, throttle: 0.62 };
}

export function updatePlane(plane, input, world, dt) {
  if (plane.crashed || plane.landed) return [];
  const events = [];
  const mission = world.mission;

  // Throttle: W/S or Up/Down adjust, clamped to idle..full.
  plane.throttle += input.throttleAxis * dt * 0.5;
  plane.throttle = Math.max(0.15, Math.min(1, plane.throttle));

  // Target speed follows the throttle; the airframe takes a moment to get there.
  const targetSpeed = 30 + plane.throttle * 62;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 0.7);

  // Banking turns the nose; the turn rate grows with bank and falls with speed.
  const targetBank = input.roll * 42;
  plane.bank += (targetBank - plane.bank) * Math.min(1, dt * 4);
  plane.heading += (plane.bank * 0.55 * (plane.speed / 60)) * dt;
  plane.heading = ((plane.heading + 540) % 360) - 180;

  // Pitch sets the climb. Climbing bleeds speed; too slow and she sinks.
  const stalled = plane.speed < 34;
  const targetPitch = stalled ? -6 : input.pitch * 10;
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, dt * 3);
  const climb = stalled
    ? -5
    : plane.pitch * (plane.speed / 55) - (plane.throttle < 0.3 ? 2 : 0);
  plane.vspeed += (climb - plane.vspeed) * Math.min(1, dt * 2.5);
  plane.alt += plane.vspeed * dt;
  if (plane.alt < 0) plane.alt = 0;

  // Forward motion, plus a gusty crosswind on the storm sortie.
  const headingRad = (plane.heading * Math.PI) / 180;
  const forward = plane.speed * dt;
  plane.z += Math.cos(headingRad) * forward;
  plane.x += Math.sin(headingRad) * forward;
  if (mission.wind > 0) {
    plane.x += Math.sin(plane.time * 0.9 + plane.z * 0.001) * mission.wind * dt;
  }
  plane.distance += forward;
  plane.time += dt;
  if (plane.alt > 30) plane.airborne = true;

  // Fuel burns with the throttle; empty tanks glide, they do not fly.
  plane.fuel -= (0.12 + plane.throttle * 0.34) * dt;
  if (plane.fuel <= 0) {
    plane.fuel = 0;
    plane.outOfFuel = true;
    plane.throttle = 0.15;
    if (plane.alt <= 0.5 && plane.speed < 20) {
      events.push({ type: 'ditch', reason: 'Out of fuel — ditched in the sea.' });
      plane.crashed = 'Out of fuel — ditched in the sea.';
    }
  }

  // Rings: crossing a ring's plane inside its circle scores, outside misses.
  const prevZ = plane.z - forward;
  for (const ring of world.rings) {
    if (ring.passed || ring.missed) continue;
    if (prevZ < ring.z && plane.z >= ring.z) {
      const dx = plane.x - ring.x;
      const dy = plane.alt - ring.y;
      if (Math.hypot(dx, dy) < ring.r) {
        ring.passed = true;
        plane.ringsHit += 1;
        plane.score += 100;
        events.push({ type: 'ring', ring });
      } else {
        ring.missed = true;
        plane.ringsMissed += 1;
        events.push({ type: 'miss', ring });
      }
    }
  }

  // Ring sorties end when the last ring is flown or missed.
  const allRingsDone = world.rings.every((ring) => ring.passed || ring.missed);
  if (
    allRingsDone &&
    !plane.complete &&
    (world.mission.id === 'rings' || world.mission.id === 'storm')
  ) {
    plane.complete = true;
    plane.score += Math.round(plane.fuel * 2);
    events.push({ type: 'complete' });
    return events;
  }

  // Terrain: a mountain peak above the plane's altitude ends the flight.
  const island = islandUnder(world, plane.x, plane.z);
  if (island && plane.alt < island.peak) {
    plane.crashed = `Clipped a ${Math.round(island.peak)} m peak on an island.`;
    events.push({ type: 'crash', reason: plane.crashed });
    return events;
  }

  // The sea: touching down anywhere but a runway is a crash. On a strip,
  // a gentle arrival after flying counts as a landing; a takeoff roll is
  // just the sortie getting going.
  if (plane.alt <= 0.5) {
    if (overRunway(world, plane.x, plane.z)) {
      if (!plane.airborne) {
        // Still on the takeoff roll — keep rolling, she will fly.
      } else if (Math.abs(plane.vspeed) <= 4.5 && plane.speed <= 78) {
        plane.landed = true;
        plane.score += 500 + Math.round(plane.fuel * 2);
        events.push({ type: 'landed' });
      } else {
        plane.crashed = 'Came in too hot — the runway ran out.';
        events.push({ type: 'crash', reason: plane.crashed });
      }
    } else if (plane.z > 50) {
      plane.crashed = 'Ditched in the sea.';
      events.push({ type: 'crash', reason: plane.crashed });
    }
  }

  return events;
}

// Draw the aircraft in chase view: fuselage, wings, tail, spinning prop
// and navigation lights, banked with the turn.
export function drawPlane(ctx, plane, cx, cy, scale, time) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-plane.bank * Math.PI) / 180 / 2.4);
  ctx.scale(scale, scale);

  // Prop blur disc at the nose: a faint shimmer, not a spike.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#eef4f8';
  ctx.beginPath();
  ctx.ellipse(0, -46, 4, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wings.
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.moveTo(-78, 6);
  ctx.lineTo(-14, -4);
  ctx.lineTo(-14, 12);
  ctx.lineTo(-78, 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(78, 6);
  ctx.lineTo(14, -4);
  ctx.lineTo(14, 12);
  ctx.lineTo(78, 22);
  ctx.closePath();
  ctx.fill();

  // Tailplane and fin.
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-26, 34);
  ctx.lineTo(-8, 26);
  ctx.lineTo(-8, 38);
  ctx.lineTo(-26, 42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, 34);
  ctx.lineTo(8, 26);
  ctx.lineTo(8, 38);
  ctx.lineTo(26, 42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, 30);
  ctx.lineTo(0, 8);
  ctx.lineTo(7, 30);
  ctx.closePath();
  ctx.fill();

  // Fuselage.
  const body = ctx.createLinearGradient(0, -50, 0, 44);
  body.addColorStop(0, '#fdfefe');
  body.addColorStop(0.55, '#e8eef2');
  body.addColorStop(1, '#b9c6cf');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -2, 13, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red cheatline and cockpit.
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-13, -14, 26, 5);
  ctx.fillStyle = '#17324a';
  ctx.beginPath();
  ctx.ellipse(0, -26, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(-3, -30, 3, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Navigation lights: red port, green starboard, blinking white tail.
  ctx.fillStyle = '#ff2e2e';
  ctx.beginPath();
  ctx.arc(-80, 12, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2eff5e';
  ctx.beginPath();
  ctx.arc(80, 12, 3.4, 0, Math.PI * 2);
  ctx.fill();
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 42, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
