// Chase-view renderer and HUD for Sky Courier: Island Run.
// A perspective projection puts the sea, islands, runway and rings ahead
// of the aircraft, and the instruments stay lit on the glass.

const FOCAL = 620;

export function project(plane, dx, h, dz, width, height, horizonY) {
  const s = FOCAL / Math.max(dz, 12);
  return {
    x: width / 2 + dx * s,
    y: horizonY + (plane.alt - h) * s,
    s,
  };
}

function horizonYFor(plane, height) {
  return height * 0.4 - plane.pitch * 2.2;
}

export function drawScene(ctx, plane, world, time, width, height) {
  const horizonY = horizonYFor(plane, height);

  ctx.save();
  // The whole view rolls gently with the bank, the plane rolls harder.
  ctx.translate(width / 2, height * 0.62);
  ctx.rotate((-plane.bank * Math.PI) / 180 / 6);
  ctx.translate(-width / 2, -height * 0.62);

  drawSky(ctx, plane, time, width, height, horizonY);
  drawSea(ctx, width, height, horizonY);
  drawClouds(ctx, plane, world, time, width, height, horizonY);
  drawIslands(ctx, plane, world, width, height, horizonY);
  drawRunway(ctx, plane, world, width, height, horizonY);
  drawRings(ctx, plane, world, width, height, horizonY);

  // The aircraft, low and centred, in frame at all times.
  const planeScale = 1 + plane.speed / 260;
  drawPlaneOnScene(ctx, plane, width, height, planeScale, time);
  ctx.restore();

  drawHud(ctx, plane, world, time, width, height);
}

// Imported lazily to keep this module's own job the scene, not the plane.
import { drawPlane } from './plane.js';
function drawPlaneOnScene(ctx, plane, width, height, scale, time) {
  drawPlane(ctx, plane, width / 2, height * 0.74, scale, time);
}

function drawSky(ctx, plane, time, width, height, horizonY) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
  sky.addColorStop(0, '#2f6fb2');
  sky.addColorStop(0.55, '#79b4dc');
  sky.addColorStop(0.85, '#ffd9a3');
  sky.addColorStop(1, '#ffe9c4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizonY + 40);

  // Low sun with a soft halo.
  const sunX = width * 0.78;
  const sunY = horizonY - 70;
  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 130);
  halo.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  halo.addColorStop(0.25, 'rgba(255, 200, 110, 0.55)');
  halo.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

function drawSea(ctx, width, height, horizonY) {
  const sea = ctx.createLinearGradient(0, horizonY, 0, height);
  sea.addColorStop(0, '#2e7d9b');
  sea.addColorStop(0.4, '#1d5f7d');
  sea.addColorStop(1, '#123f57');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Sun glint on the water: a faint shimmer, fading as it nears the camera.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffe9b0';
  const glintY = horizonY + 24;
  for (let i = 0; i < 7; i += 1) {
    const w = 26 + i * 12;
    ctx.fillRect(width * 0.78 - w / 2, glintY + i * 11, w, 2);
  }
  ctx.restore();
}

function drawClouds(ctx, plane, world, time, width, height, horizonY) {
  ctx.save();
  for (const cloud of world.clouds) {
    const dz = cloud.z - plane.z;
    if (dz < 40 || dz > 9000) continue;
    const p = project(plane, cloud.x - plane.x, cloud.y, dz, width, height, horizonY);
    const drift = ((cloud.z * 0.02 + time * cloud.speed) % 4000) - 2000;
    const cx = p.x + drift * p.s * 0.12;
    if (cx < -260 || cx > width + 260) continue;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffffff';
    const r = cloud.s * p.s;
    ctx.beginPath();
    ctx.ellipse(cx, p.y, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - r * 0.55, p.y + r * 0.1, r * 0.6, r * 0.26, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.55, p.y + r * 0.08, r * 0.62, r * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawIslands(ctx, plane, world, width, height, horizonY) {
  // Only islands fully ahead of the camera: an edge already passed would
  // project behind the lens and blow up into a wall.
  const visible = world.islands
    .filter((island) => island.z0 > plane.z + 30 && island.z0 < plane.z + 9000)
    .sort((a, b) => b.z0 - a.z0);
  const greens = ['#4d8a58', '#5d9a4a', '#3f7d63'];
  for (const island of visible) {
    // z0 is the near edge (wide, low, at the waterline), z1 the far edge
    // (narrower, raised by the peak): a proper island rising from the sea.
    const near = project(plane, 0, 0, island.z0 - plane.z, width, height, horizonY);
    const farL = project(plane, island.x0 - plane.x, island.peak, island.z1 - plane.z, width, height, horizonY);
    const farR = project(plane, island.x1 - plane.x, island.peak, island.z1 - plane.z, width, height, horizonY);
    const nearL = project(plane, island.x0 - plane.x, 0, island.z0 - plane.z, width, height, horizonY);
    const nearR = project(plane, island.x1 - plane.x, 0, island.z0 - plane.z, width, height, horizonY);
    if (nearL.x > width + 80 && nearR.x > width + 80) continue;
    if (nearL.x < -80 && nearR.x < -80) continue;

    // Sand rim at the waterline, green body, darker peak.
    ctx.fillStyle = '#e6d49a';
    ctx.beginPath();
    ctx.moveTo(nearL.x, nearL.y + 4 * near.s);
    ctx.lineTo(nearR.x, nearR.y + 4 * near.s);
    ctx.lineTo(nearR.x, nearR.y - 2 * near.s);
    ctx.lineTo(nearL.x, nearL.y - 2 * near.s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = greens[island.hue];
    ctx.beginPath();
    ctx.moveTo(nearL.x, nearL.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(farL.x, farL.y);
    ctx.closePath();
    ctx.fill();
    // A peak ridge for the tall islands.
    if (island.peak > 100) {
      ctx.fillStyle = '#2e6b43';
      ctx.beginPath();
      ctx.moveTo(farL.x, farL.y);
      ctx.lineTo((farL.x + farR.x) / 2, farL.y - island.peak * farL.s * 0.5);
      ctx.lineTo(farR.x, farR.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRunway(ctx, plane, world, width, height, horizonY) {
  const strips = [world.homeRunway, world.runway].filter(Boolean);
  for (const runway of strips) {
    drawStrip(ctx, plane, runway, width, height, horizonY);
  }
}

function drawStrip(ctx, plane, runway, width, height, horizonY) {
  const z0 = runway.z0 - plane.z;
  const z1 = runway.z1 - plane.z;
  if (z1 < 20 || z0 > 9000) return;
  // The strip's near end may sit behind the camera (takeoff roll): start
  // the drawing just ahead of the lens instead of behind it.
  const nearZ = Math.max(z0, 20);
  const half = runway.width / 2;
  const nL = project(plane, runway.x - half - plane.x, 0, z1, width, height, horizonY);
  const nR = project(plane, runway.x + half - plane.x, 0, z1, width, height, horizonY);
  const fL = project(plane, runway.x - half - plane.x, 0, nearZ, width, height, horizonY);
  const fR = project(plane, runway.x + half - plane.x, 0, nearZ, width, height, horizonY);
  ctx.fillStyle = '#33383d';
  ctx.beginPath();
  ctx.moveTo(nL.x, nL.y);
  ctx.lineTo(nR.x, nR.y);
  ctx.lineTo(fR.x, fR.y);
  ctx.lineTo(fL.x, fL.y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes, one per 90 m of strip.
  ctx.fillStyle = '#f5f5f0';
  for (let z = runway.z0 + 60; z < runway.z1; z += 90) {
    const dz = z - plane.z;
    if (dz < 20) continue;
    const a = project(plane, runway.x - plane.x, 0, dz, width, height, horizonY);
    const b = project(plane, runway.x - plane.x, 0, dz + 45, width, height, horizonY);
    const w = Math.max(1.5, 3 * a.s);
    ctx.fillRect(a.x - w / 2, b.y, w, a.y - b.y);
  }
  // Threshold bars at the approach end (z0), the end the pilot sees first.
  ctx.fillStyle = '#ffffff';
  const t = project(plane, runway.x - plane.x, 0, nearZ, width, height, horizonY);
  ctx.fillRect(t.x - 14 * t.s, t.y - 2, 28 * t.s, 3);
}

function drawRings(ctx, plane, world, width, height, horizonY) {
  const rings = world.rings
    .filter((ring) => ring.z - plane.z > 20 && ring.z - plane.z < 9000)
    .sort((a, b) => b.z - a.z);
  for (const ring of rings) {
    const dz = ring.z - plane.z;
    const p = project(plane, ring.x - plane.x, ring.y, dz, width, height, horizonY);
    const rx = ring.r * p.s;
    const ry = ring.r * p.s * 0.92;
    if (rx < 1.5 || p.x < -rx - 60 || p.x > width + rx + 60) continue;
    const colour = ring.passed ? '#37d67a' : ring.missed ? '#8a97a3' : '#ff8c1a';
    ctx.save();
    ctx.globalAlpha = ring.passed ? 0.9 : 1;
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(2, 7 * p.s * 0.35);
    ctx.shadowColor = colour;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, 2 * p.s * 0.35);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// --- Title screen ----------------------------------------------------------

import { MISSIONS } from './world.js';

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}

export function drawTitleScreen(ctx, plane, world, time, width, height) {
  drawScene(ctx, plane, world, time, width, height);
  ctx.save();
  ctx.fillStyle = 'rgba(6, 18, 30, 0.45)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 64px monospace';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('SKY COURIER', width / 2, 150);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px monospace';
  ctx.fillText('— ISLAND RUN —', width / 2, 196);
  ctx.fillStyle = '#cfe9f7';
  ctx.font = '18px monospace';
  ctx.fillText('Fly the rings. Mind the fuel. Bring her home.', width / 2, 232);

  const cards = [
    ['1', MISSIONS.rings.name, MISSIONS.rings.blurb],
    ['2', MISSIONS.hop.name, MISSIONS.hop.blurb],
    ['3', MISSIONS.storm.name, MISSIONS.storm.blurb],
  ];
  cards.forEach(([key, name, blurb], i) => {
    const x = width / 2 - 390 + i * 270;
    const y = 300;
    ctx.fillStyle = 'rgba(8, 22, 34, 0.78)';
    ctx.strokeStyle = 'rgba(140, 220, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, 250, 130, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd24d';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(key, x + 125, y + 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px monospace';
    ctx.fillText(name, x + 125, y + 76);
    ctx.fillStyle = '#cfe9f7';
    ctx.font = '13px monospace';
    wrapText(ctx, blurb, x + 125, y + 102, 220, 16);
  });

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.fillText('Arrows / WASD — steer  •  Shift / Ctrl — throttle  •  Mouse — hold to steer', width / 2, 490);
  ctx.fillText('P — pause  •  M — mute  •  R — restart', width / 2, 516);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 18px monospace';
  if (Math.floor(time * 1.5) % 2 === 0) {
    ctx.fillText('Press 1, 2 or 3 to fly', width / 2, 566);
  }
  ctx.restore();
}

// --- HUD -----------------------------------------------------------------

function hudBox(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 22, 34, 0.72)';
  ctx.strokeStyle = 'rgba(140, 220, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, plane, world, time, width, height) {
  const mission = world.mission;
  const ringsTotal = world.rings.length;
  const ringsDone = plane.ringsHit + plane.ringsMissed;
  const knots = Math.round(plane.speed * 1.944);
  const feet = Math.round(plane.alt * 3.28084);
  const heading = Math.round(((plane.heading % 360) + 360) % 360);

  ctx.save();
  ctx.textBaseline = 'middle';

  // Top-left: altitude and speed, the two instruments that matter most.
  hudBox(ctx, 16, 14, 218, 92);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('ALTITUDE', 30, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`${feet.toLocaleString('en-US')} FT`, 30, 58);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('AIRSPEED', 30, 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`${knots} KT`, 132, 84);

  // Top-centre: heading compass tape with cardinal points.
  hudBox(ctx, width / 2 - 190, 14, 380, 56);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HEADING', width / 2, 30);
  const points = [
    [0, 'N'],
    [45, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
  ];
  ctx.font = 'bold 20px monospace';
  for (const [deg, label] of points) {
    let diff = ((deg - heading + 540) % 360) - 180;
    if (Math.abs(diff) > 70) continue;
    const x = width / 2 + diff * 2.4;
    ctx.fillStyle = diff === 0 || Math.abs(diff) < 3 ? '#ffd24d' : '#ffffff';
    ctx.fillText(label, x, 56);
  }
  ctx.fillStyle = '#ffd24d';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 6, 44);
  ctx.lineTo(width / 2 + 6, 44);
  ctx.lineTo(width / 2, 52);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'left';

  // Top-right: score, rings and the mission objective.
  hudBox(ctx, width - 234, 14, 218, 92);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('SCORE', width - 220, 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`${plane.score}`, width - 220, 58);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`RINGS ${plane.ringsHit}/${ringsTotal}`, width - 220, 84);
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(mission.name.toUpperCase(), width - 120, 84);

  // Bottom-left: fuel gauge, lit while there is fuel to burn.
  hudBox(ctx, 16, height - 66, 250, 50);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('FUEL', 30, height - 48);
  const fuelW = 150;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(96, height - 54, fuelW, 14);
  ctx.fillStyle = plane.fuel > 25 ? '#37d67a' : '#ff5a3c';
  ctx.fillRect(96, height - 54, fuelW * (plane.fuel / 100), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`${Math.ceil(plane.fuel)}%`, 252 - 2, height - 46);

  // Bottom-right: throttle bar and vertical speed.
  hudBox(ctx, width - 266, height - 66, 250, 50);
  ctx.fillStyle = '#8cdcff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('THROTTLE', width - 252, height - 48);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(width - 156, height - 54, 120, 14);
  ctx.fillStyle = '#ffb02e';
  ctx.fillRect(width - 156, height - 54, 120 * plane.throttle, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px monospace';
  const vs = plane.vspeed * 196.85;
  ctx.fillText(`${vs >= 0 ? '+' : ''}${Math.round(vs)} FPM`, width - 156, height - 30);

  // Objective line under the compass, and a low-fuel warning when it bites.
  // A dark halo keeps the text readable when a cloud drifts behind it.
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 14px monospace';
  const objective =
    mission.id === 'hop'
      ? `Land on the runway — ${Math.max(0, Math.round((world.runway.z0 - plane.z) / 100) / 10)} km to go`
      : `Fly through the rings — ${plane.ringsHit}/${ringsTotal} flown`;
  ctx.fillText(objective, width / 2, 92);
  ctx.shadowBlur = 0;
  if (plane.fuel <= 25 && !plane.crashed && !plane.landed) {
    ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? '#ff5a3c' : '#ffd24d';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('LOW FUEL', width / 2, 118);
  }
  ctx.restore();
}
