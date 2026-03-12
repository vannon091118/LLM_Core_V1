import { CITY_DISTRICTS, CITY_ROADS, findDistrict } from "./city.map.js";
import { gameModeFromState } from "./game.mode.js";

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function modeTint(mode) {
  if (mode === "COMBAT_ACTIVE") return [216, 91, 82, 0.12];
  if (mode === "COMBAT_PREP") return [234, 106, 61, 0.1];
  if (mode === "ENCOUNTER") return [199, 129, 68, 0.08];
  if (mode === "TRANSIT") return [127, 149, 168, 0.08];
  if (mode === "OUTCOME" || mode === "COMBAT_OUTCOME") return [120, 185, 141, 0.08];
  return [110, 130, 150, 0.05];
}

function chooseQuality(canvas, reducedMotion) {
  const w = canvas?.clientWidth || 0;
  const h = canvas?.clientHeight || 0;
  const area = w * h;
  if (reducedMotion || area < 180000) return "low";
  if (area < 420000) return "medium";
  return "high";
}

function maxParticlesForQuality(q) {
  if (q === "low") return 28;
  if (q === "medium") return 56;
  return 88;
}

function hashStringToU32(text) {
  let h = 2166136261 >>> 0;
  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function makeDeterministicRng(seedLike) {
  let x = hashStringToU32(seedLike) || 0x9e3779b9;
  return () => {
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    return (x >>> 0) / 0x100000000;
  };
}

function spawnParticle(p, w, h, rand01) {
  p.x = rand01() * w;
  p.y = rand01() * h;
  p.z = 0.4 + rand01() * 1.6;
  p.r = 0.6 + rand01() * 2.2;
  p.vx = (-4 + rand01() * 8) * (0.22 / p.z);
  p.vy = (6 + rand01() * 14) * (0.22 / p.z);
  p.a = 0.08 + rand01() * 0.25;
  p.kind = rand01() < 0.16 ? "ember" : "dust";
}

function spawnImpact(list, x, y, power = 1, rand01) {
  const count = Math.max(3, Math.min(10, 4 + power * 2));
  for (let i = 0; i < count; i++) {
    list.push({
      x,
      y,
      vx: -42 + rand01() * 84,
      vy: -30 + rand01() * 60,
      life: 0.24 + rand01() * 0.24,
      t: 0,
      r: 0.8 + rand01() * 2.8
    });
  }
}

export function createCanvasFxController() {
  let mapCanvas = null;
  let fxCanvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let quality = "medium";
  let reducedMotion = false;

  const particles = [];
  const impacts = [];
  const trail = [];

  let mode = "MENU";
  let modeMix = 1;
  let pulse = 0;
  let hazePhase = 0;
  let shakeT = 0;
  let time = 0;
  let rand01 = makeDeterministicRng("canvas-fx-default-seed");

  let prevPlayerHp = 0;
  let prevEnemyHp = 0;

  function attach(root, state) {
    mapCanvas = root?.querySelector?.('[data-city-map="1"]') || null;
    fxCanvas = root?.querySelector?.('[data-city-fx="1"]') || null;
    ctx = fxCanvas ? fxCanvas.getContext("2d") : null;
    reducedMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (state) {
      const seedText = `${state.meta?.seed || "default"}|${state.game?.playerDistrict ?? 0}`;
      rand01 = makeDeterministicRng(seedText);
      mode = gameModeFromState(state);
      prevPlayerHp = state.game?.hp || 0;
      prevEnemyHp = state.game?.combat?.enemyHp || 0;
    }
    resize();
  }

  function resize() {
    if (!fxCanvas || !ctx) return;
    const nextDpr = Math.max(1, Math.min(2, typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1));
    const cssW = Math.max(1, Math.floor(fxCanvas.clientWidth || 1));
    const cssH = Math.max(1, Math.floor(fxCanvas.clientHeight || 1));
    const pxW = Math.max(1, Math.floor(cssW * nextDpr));
    const pxH = Math.max(1, Math.floor(cssH * nextDpr));
    if (fxCanvas.width !== pxW || fxCanvas.height !== pxH) {
      fxCanvas.width = pxW;
      fxCanvas.height = pxH;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(nextDpr, nextDpr);
    width = cssW;
    height = cssH;
    dpr = nextDpr;
    quality = chooseQuality(fxCanvas, reducedMotion);

    const targetCount = maxParticlesForQuality(quality);
    while (particles.length < targetCount) {
      const p = {};
      spawnParticle(p, width, height, rand01);
      particles.push(p);
    }
    if (particles.length > targetCount) particles.length = targetCount;
  }

  function markerPosition(state) {
    if (!state || !mapCanvas) return { x: width * 0.5, y: height * 0.5 };
    if (state.game.transit.active) {
      const from = findDistrict(state.game.transit.from);
      const to = findDistrict(state.game.transit.to);
      const t = clamp01((state.game.transit.progress || 0) / 100);
      const fx = (from?.x ?? 0.5) * width;
      const fy = (from?.y ?? 0.5) * height;
      const tx = (to?.x ?? 0.5) * width;
      const ty = (to?.y ?? 0.5) * height;
      return { x: lerp(fx, tx, t), y: lerp(fy, ty, t) };
    }
    const cur = findDistrict(state.game.playerDistrict);
    return { x: (cur?.x ?? 0.5) * width, y: (cur?.y ?? 0.5) * height };
  }

  function step(dt, state, uiMemory = {}) {
    if (!fxCanvas || !ctx || !mapCanvas || !state || state.ui.screen !== "GAME") return;
    resize();
    time += dt;
    pulse += dt * 0.0042;
    hazePhase += dt * 0.0009;

    const nextMode = gameModeFromState(state);
    if (nextMode !== mode) {
      mode = nextMode;
      modeMix = 0;
    } else {
      modeMix = Math.min(1, modeMix + dt * 0.0035);
    }

    const hpLoss = Math.max(0, prevPlayerHp - (state.game.hp || 0));
    const enemyLoss = Math.max(0, prevEnemyHp - (state.game.combat.enemyHp || 0));
    if ((hpLoss > 0 || enemyLoss > 0) && mode === "COMBAT_ACTIVE") {
      const pos = markerPosition(state);
      spawnImpact(impacts, pos.x, pos.y, hpLoss + enemyLoss, rand01);
      shakeT = Math.min(220, shakeT + (hpLoss + enemyLoss) * 34);
    }
    prevPlayerHp = state.game.hp || 0;
    prevEnemyHp = state.game.combat.enemyHp || 0;

    const wind = mode === "TRANSIT" ? 1.3 : mode === "COMBAT_ACTIVE" ? 0.85 : 1;
    for (const p of particles) {
      p.x += p.vx * dt * 0.06 * wind;
      p.y += p.vy * dt * 0.06 * wind;
      if (p.x < -8 || p.x > width + 8 || p.y > height + 8) spawnParticle(p, width, height, rand01);
      if (p.y < -16) p.y = height + 4;
    }

    for (let i = impacts.length - 1; i >= 0; i--) {
      const fx = impacts[i];
      fx.t += dt * 0.001;
      fx.x += fx.vx * dt * 0.001;
      fx.y += fx.vy * dt * 0.001;
      if (fx.t >= fx.life) impacts.splice(i, 1);
    }

    const marker = markerPosition(state);
    const bob = Math.sin(time * 0.012) * (mode === "TRANSIT" ? 3.2 : 1.6);
    trail.unshift({ x: marker.x, y: marker.y + bob, t: 0 });
    if (trail.length > 16) trail.length = 16;
    for (const t of trail) t.t += dt * 0.001;

    const sx = shakeT > 0 ? (Math.sin(time * 0.12) * 1.5) : 0;
    const sy = shakeT > 0 ? (Math.cos(time * 0.095) * 1.2) : 0;
    shakeT = Math.max(0, shakeT - dt);

    render(state, uiMemory, marker, bob, sx, sy);
  }

  function render(state, uiMemory, marker, bob, sx, sy) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(sx, sy);

    const [r, g, b, a] = modeTint(mode);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a * modeMix})`;
    ctx.fillRect(0, 0, width, height);

    const hazeY = (Math.sin(hazePhase) * 0.5 + 0.5) * height * 0.25;
    const haze = ctx.createLinearGradient(0, hazeY, 0, height);
    haze.addColorStop(0, "rgba(255,255,255,0.03)");
    haze.addColorStop(1, "rgba(0,0,0,0.08)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      ctx.beginPath();
      if (p.kind === "ember") {
        ctx.fillStyle = `rgba(255, 142, 96, ${0.08 + p.a * 0.7})`;
      } else {
        ctx.fillStyle = `rgba(220, 220, 220, ${0.03 + p.a * 0.35})`;
      }
      ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
      ctx.fill();
    }

    drawRoutePulse(state);
    drawDistrictFocus(uiMemory);
    drawMarker(state, marker, bob);
    drawImpacts();
    drawVignette();
    ctx.restore();
  }

  function drawRoutePulse(state) {
    for (const road of CITY_ROADS) {
      const a = findDistrict(road.a);
      const b = findDistrict(road.b);
      if (!a || !b) continue;
      const ax = a.x * width;
      const ay = a.y * height;
      const bx = b.x * width;
      const by = b.y * height;
      if (!road.blocked) {
        ctx.strokeStyle = "rgba(120, 145, 166, 0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }

    if (!state.game.transit.active) return;
    const from = findDistrict(state.game.transit.from);
    const to = findDistrict(state.game.transit.to);
    if (!from || !to) return;
    const t = clamp01((state.game.transit.progress || 0) / 100);
    const fx = from.x * width;
    const fy = from.y * height;
    const tx = to.x * width;
    const ty = to.y * height;

    ctx.strokeStyle = `rgba(255, 157, 110, ${0.45 + Math.sin(pulse * 10) * 0.1})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    const mx = lerp(fx, tx, t);
    const my = lerp(fy, ty, t);
    ctx.fillStyle = "rgba(255,190,145,0.65)";
    ctx.beginPath();
    ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDistrictFocus(uiMemory) {
    const selected = Number(uiMemory.selectedDistrictId ?? -1);
    if (!Number.isFinite(selected) || selected < 0) return;
    const d = findDistrict(selected);
    if (!d) return;
    const x = d.x * width;
    const y = d.y * height;
    const radius = 14 + Math.sin(pulse * 8) * 2.2;
    ctx.strokeStyle = "rgba(255, 183, 146, 0.44)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMarker(state, marker, bob) {
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      const alpha = clamp01(0.22 - t.t * 0.18);
      if (alpha <= 0) continue;
      ctx.fillStyle = `rgba(255,145,92,${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2.2 + (trail.length - i) * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    const markerPulse = 6.5 + Math.sin(pulse * 12) * 1.2;
    const x = marker.x;
    const y = marker.y + bob;
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,127,72,0.95)";
    ctx.beginPath();
    ctx.arc(x, y, markerPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = mode === "COMBAT_ACTIVE" ? "rgba(255,96,80,0.75)" : "rgba(255,184,144,0.6)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, markerPulse + 5.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawImpacts() {
    for (const fx of impacts) {
      const life = clamp01(1 - fx.t / fx.life);
      ctx.fillStyle = `rgba(255,140,96,${0.45 * life})`;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.r * life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVignette() {
    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.46, Math.min(width, height) * 0.2, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function detach() {
    mapCanvas = null;
    fxCanvas = null;
    ctx = null;
    impacts.length = 0;
    trail.length = 0;
  }

  return { attach, step, detach };
}
