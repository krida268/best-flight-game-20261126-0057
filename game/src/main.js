// Sky Courier: Island Run — game loop, screens and missions.
// A chase-view flight game: pick a sortie, fly the rings, mind the fuel,
// and bring her home to the runway. Keyboard and mouse, offline, in one
// canvas.

import { buildWorld } from './world.js';
import { createPlane, updatePlane } from './plane.js';
import { drawScene, drawTitleScreen } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { setupShot } from './shots.js';

const WIDTH = 1280;
const HEIGHT = 720;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = WIDTH;
canvas.height = HEIGHT;

const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

let state = 'title'; // title | flying | paused | over
let world = buildWorld('rings', 20261126);
let plane = createPlane(world.mission);
let overReason = '';
let overScore = 0;
let muted = false;
let attractTime = 0;

function startMission(missionId) {
  const seed = (Date.now() % 100000) + 7;
  world = buildWorld(missionId, seed);
  plane = createPlane(world.mission);
  plane.throttle = 0.55;
  plane.speed = 40;
  state = 'flying';
  audio.unlock();
}

function readInput() {
  const roll =
    input.axis('ArrowLeft', 'ArrowRight') + input.axis('KeyA', 'KeyD');
  const pitch =
    input.axis('ArrowUp', 'ArrowDown') + input.axis('KeyW', 'KeyS');
  let throttleAxis = 0;
  if (input.pressed('ShiftLeft') || input.pressed('ShiftRight')) throttleAxis += 1;
  if (input.pressed('ControlLeft') || input.pressed('ControlRight')) throttleAxis -= 1;
  // Mouse: hold the pointer to steer toward it, like a yoke.
  let mouseRoll = 0;
  let mousePitch = 0;
  if (input.pointer.down && input.pointer.active) {
    mouseRoll = Math.max(-1, Math.min(1, (input.pointer.x - WIDTH / 2) / 320));
    mousePitch = Math.max(-1, Math.min(1, (HEIGHT * 0.55 - input.pointer.y) / 220));
  }
  return {
    roll: Math.max(-1, Math.min(1, roll + mouseRoll)),
    pitch: Math.max(-1, Math.min(1, -pitch + mousePitch)),
    throttleAxis,
  };
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'ring') {
      audio.ring();
    } else if (event.type === 'miss') {
      audio.miss();
    } else if (event.type === 'crash' || event.type === 'ditch') {
      audio.crash();
      state = 'over';
      overReason = event.reason;
      overScore = plane.score;
    } else if (event.type === 'landed') {
      audio.ring();
      state = 'over';
      overReason = 'Landed! The courier is home.';
      overScore = plane.score;
    } else if (event.type === 'complete') {
      audio.ring();
      state = 'over';
      overReason = `All ${world.rings.length} rings flown — ${plane.ringsHit} through, ${plane.ringsMissed} missed.`;
      overScore = plane.score;
    }
  }
}

function update(dt) {
  if (state === 'flying') {
    const events = updatePlane(plane, readInput(), world, dt);
    handleEvents(events);
    audio.setEngine(plane.throttle, true);
    if (input.consume('KeyP') || input.consume('Escape')) state = 'paused';
  } else if (state === 'paused') {
    audio.setEngine(0, false);
    if (input.consume('KeyP') || input.consume('Escape')) state = 'flying';
  } else if (state === 'title') {
    attractTime += dt;
    // Attract flight: the courier circles the islands on her own.
    if (!plane.autopilot) {
      plane.autopilot = true;
      plane.alt = 220;
      plane.speed = 55;
    }
    plane.z += plane.speed * dt;
    plane.heading = Math.sin(attractTime * 0.08) * 18;
    plane.x = Math.sin(attractTime * 0.12) * 160;
    plane.bank = Math.cos(attractTime * 0.12) * 14;
    plane.throttle = 0.55;
    if (plane.z > 9000) plane.z = 0;
    if (input.consume('Digit1')) startMission('rings');
    if (input.consume('Digit2')) startMission('hop');
    if (input.consume('Digit3')) startMission('storm');
  } else if (state === 'over') {
    audio.setEngine(0, false);
    if (input.consume('KeyR') || input.consume('Enter')) state = 'title';
  }
  if (input.consume('KeyM')) muted = audio.toggleMute();
}

function drawOver() {
  drawScene(ctx, plane, world, plane.time, WIDTH, HEIGHT);
  ctx.save();
  ctx.fillStyle = 'rgba(6, 18, 30, 0.55)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  const crashed = Boolean(plane.crashed);
  ctx.fillStyle = crashed ? '#ff5a3c' : '#37d67a';
  ctx.font = 'bold 44px monospace';
  ctx.fillText(crashed ? 'SORTIE OVER' : 'MISSION COMPLETE', WIDTH / 2, 260);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(overReason, WIDTH / 2, 310);
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`SCORE  ${overScore}`, WIDTH / 2, 360);
  ctx.fillStyle = '#cfe9f7';
  ctx.font = '18px monospace';
  ctx.fillText(
    `Rings ${plane.ringsHit}/${world.rings.length}  •  Distance ${Math.round(plane.distance / 100) / 10} km  •  Time ${Math.round(plane.time)} s`,
    WIDTH / 2,
    396,
  );
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('Press R or Enter to fly again', WIDTH / 2, 460);
  ctx.restore();
}

function frame(now) {
  const dt = Math.min(0.05, (now - frame.last) / 1000 || 0.016);
  frame.last = now;
  const time = now / 1000;
  update(dt);
  if (state === 'title') drawTitleScreen(ctx, plane, world, time, WIDTH, HEIGHT);
  else if (state === 'over') drawOver();
  else drawScene(ctx, plane, world, time, WIDTH, HEIGHT);
  if (state === 'paused') {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 18, 30, 0.5)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2);
    ctx.font = '18px monospace';
    ctx.fillText('Press P to keep flying', WIDTH / 2, HEIGHT / 2 + 40);
    ctx.restore();
  }
  requestAnimationFrame(frame);
}
frame.last = 0;

// Clicking a mission card on the title screen starts that sortie.
canvas.addEventListener('click', () => {
  audio.unlock();
  if (state !== 'title') return;
  const x = input.pointer.x;
  const y = input.pointer.y;
  if (y >= 300 && y <= 430) {
    if (x >= WIDTH / 2 - 390 && x < WIDTH / 2 - 120) startMission('rings');
    else if (x >= WIDTH / 2 - 120 && x < WIDTH / 2 + 150) startMission('hop');
    else if (x >= WIDTH / 2 + 150 && x < WIDTH / 2 + 420) startMission('storm');
  }
});

// Screenshot mode: render one frozen frame and stop, so the capture is
// exactly the game's own render and repeats every time.
if (shotName) {
  const shot = setupShot(ctx, canvas, shotName);
  if (shot) {
    state = shot.state;
    world = shot.world;
    plane = shot.plane;
  }
} else {
  requestAnimationFrame(frame);
}
