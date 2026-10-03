// Deffy, drawn live (from Deffy Studio: lib.js + deffy.js). Units: body width 100, origin = ground under the body.
// ===== core (vertical 9:16, flat vector style) =====
const W = 1080, H = 1920, FPS = 30;
let T = 0;
const PI = Math.PI, TAU = PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  lin: t => t, inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  out: t => 1 - Math.pow(1 - t, 3), out2: t => 1 - (1 - t) * (1 - t), in2: t => t * t, in: t => t * t * t,
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackS: t => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t), inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};
const ep = (a, b, x, fn = E.inOut) => fn(inv(a, b, x));
const bump = (a, b, x) => Math.sin(inv(a, b, x) * PI);
function hash(n) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function particles(n, seed) { const r = mulberry32(seed); const a = []; for (let i = 0; i < n; i++) a.push({ x: r(), y: r(), s: r(), v: r(), a: r(), c: r() }); return a; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// pop scale helper: 0 before t0, overshoot in, optional pop-out at t1
function pop(t, t0, d = .32, t1 = null, d1 = .22) { let s = E.outBack(inv(t0, t0 + d, t)); if (t1 != null) s *= 1 - E.in2(inv(t1, t1 + d1, t)); return s; }

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function shadow(ctx, a = .18, blur = 30, oy = 14) { ctx.shadowColor = `rgba(60,30,10,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = oy; }
function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
function withT(ctx, x, y, s, rot, fn) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (s !== 1) ctx.scale(s, s); fn(); ctx.restore(); }
function heartPath(ctx, s) { ctx.beginPath(); for (let i = 0; i <= 80; i++) { const t = i / 80 * TAU; const x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s); } ctx.closePath(); }
function sparkle(ctx, x, y, r, color, rot = 0, a = 1) { if (r <= .3 || a <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr_ = i % 2 ? r * .24 : r; const an = i * PI / 4; ctx.lineTo(Math.cos(an) * rr_, Math.sin(an) * rr_); } ctx.closePath(); ctx.fill(); ctx.restore(); }
const FONT = "'Nunito'", FONT_HAND = "'Patrick Hand'", FONT_SCRIPT = "'Caveat'";
function font(ctx, size, weight = 800, f = FONT) { ctx.font = `${weight} ${size}px ${f}`; }
function measure(ctx, text, size, weight = 800, f = FONT) { ctx.save(); font(ctx, size, weight, f); const w = ctx.measureText(text).width; ctx.restore(); return w; }
// grain overlay for a subtle filmic finish
let GRAIN = [];
function initGrain() { for (let v = 0; v < 3; v++) { const c = mkCanvas(540, 960), g = c.getContext('2d'); const id = g.createImageData(540, 960); const r = mulberry32(50 + v); for (let i = 0; i < id.data.length; i += 4) { const val = 128 + (r() - .5) * 90; id.data[i] = id.data[i + 1] = id.data[i + 2] = val; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); GRAIN.push(c); } }
function grain(ctx, a = .045) { ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(GRAIN[Math.floor(T * 15) % 3], 0, 0, W, H); ctx.restore(); }

// Deffy — flat vector, matches the official mascot. Units: body width 100, origin = ground under body centre.
const DC = { top: '#F6B184', bot: '#E98D61', page: '#FFF8F1', pageEdge: '#EAD5C0', limb: '#E1804F', ribbon: '#8FB6A4', eye: '#5C5346', spiral: '#C56B41', cheek: 'rgba(247,150,118,0.75)', hl: 'rgba(255,226,202,0.55)', mouth: '#5A3A30', tongue: '#F08A86' };
const DG = { bx: -50, by: -165.4, bw: 100, bh: 136.6, br: 21, eyeX: 17.5, eyeY: -105.2, eyeR: 14.4, mY: -76 };

function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); }

function drawDeffy(ctx, x, y, s, st = {}) {
  const t = st.t ?? T;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (st.alpha != null) ctx.globalAlpha *= st.alpha;
  const air = st.air ?? 0, sq = st.sq ?? 0, tilt = st.tilt ?? 0, bob = st.bob ?? 0;
  // ground shadow
  if (st.shadow !== false) { ctx.save(); ctx.globalAlpha *= clamp(.2 - air * .002, .06, .2); ctx.fillStyle = '#4a2a14'; ctx.filter = `blur(${2.5 * s}px)`; ell(ctx, 6, 1, 60 * (1 - air * .004), 7.5); ctx.fill(); ctx.filter = 'none'; ctx.restore(); }
  ctx.translate(0, -air);
  // feet
  const fl = st.footL ?? 0, fr = st.footR ?? 0;
  ctx.fillStyle = DC.limb; ell(ctx, -15.1, -9.2 - fl, 14.7, 9.2); ctx.fill(); ell(ctx, 24.9, -9.2 - fr, 14.7, 9.2); ctx.fill();
  // body group
  ctx.save(); ctx.translate(0, -28.8 + bob); ctx.rotate(tilt); ctx.scale(1 + sq * .6, 1 - sq); ctx.translate(0, 28.8);
  // ribbon
  ctx.fillStyle = DC.ribbon; ctx.beginPath(); ctx.moveTo(35.1, -32); ctx.lineTo(49.5, -32); ctx.lineTo(49.5, -4.3); ctx.lineTo(42.3, -10); ctx.lineTo(35.1, -4.3); ctx.closePath(); ctx.fill();
  // arms
  const wave = (st.wave ?? 0) * (1.6 + Math.sin(t * 15) * .3), waveL = (st.waveL ?? 0) * (1.6 + Math.sin(t * 15 + 1) * .3);
  const arm = (side, ang) => { ctx.save(); ctx.translate(side * 50, -99); ctx.rotate(-side * ang); ctx.translate(-side * 50, 99); ctx.fillStyle = DC.limb; ell(ctx, side * 58.9, -81, 8.7, 18.7, side * -.2); ctx.fill(); ctx.restore(); };
  arm(-1, (st.armL ?? 0) + waveL); arm(1, (st.armR ?? 0) + wave);
  // page block
  ctx.save(); ctx.shadowColor = 'rgba(90,40,10,.18)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 1.5 * s;
  ctx.fillStyle = DC.pageEdge; rr(ctx, DG.bx + 8.4, DG.by + 4, DG.bw, DG.bh, DG.br); ctx.fill(); ctx.restore();
  ctx.fillStyle = DC.page; rr(ctx, DG.bx + 7, DG.by + 3, DG.bw - 1, DG.bh - 1.6, DG.br); ctx.fill();
  // body
  ctx.save(); ctx.shadowColor = 'rgba(120,50,15,.22)'; ctx.shadowBlur = 5 * s; ctx.shadowOffsetX = 1 * s; ctx.shadowOffsetY = 1.5 * s;
  const g = ctx.createLinearGradient(0, DG.by, 0, DG.by + DG.bh); g.addColorStop(0, DC.top); g.addColorStop(1, DC.bot);
  ctx.fillStyle = g; rr(ctx, DG.bx, DG.by, DG.bw, DG.bh, DG.br); ctx.fill(); ctx.restore();
  // highlight pill
  ctx.fillStyle = DC.hl; rr(ctx, -39.6, -155.6, 31.6, 17, 8.5); ctx.fill();
  drawFace(ctx, st, t);
  if (st.glasses) drawGlasses(ctx, st.look);
  // spiral
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = DC.spiral; ctx.lineWidth = 3.8;
  ctx.beginPath(); for (const cx of [-32.7, -14.3, 4.2, 22.6, 41.1]) { ctx.moveTo(cx - 9.2, -160.8); ctx.arc(cx, -160.8, 9.2, PI, TAU); } ctx.stroke(); ctx.restore();
  if (st.hat === 'night') drawNightcap(ctx, t);
  if (window.drawCostumes && st.costume) drawCostumes(ctx, st, t);
  if (st.shh) { ctx.save(); ctx.fillStyle = DC.limb; ctx.shadowColor = 'rgba(120,50,15,.25)'; ctx.shadowBlur = 4 * s; ell(ctx, 4, -80 - (1 - st.shh) * 40, 7.5, 16, -.15); ctx.globalAlpha *= clamp(st.shh * 1.5); ctx.fill(); ctx.restore(); }
  ctx.restore();
  ctx.restore();
}

function drawFace(ctx, st, t) {
  const look = st.look || [0, 0]; const lx = look[0] * 4, ly = look[1] * 3.2;
  // cheeks
  const b = 1 + (st.blush ?? 0) * .5;
  for (const sd of [-1, 1]) { ctx.fillStyle = DC.cheek; ctx.globalAlpha *= 1; ell(ctx, sd * 32.4 + lx * .35, -85.9, 11.5 * b, 7.1 * b); ctx.fill(); }
  // brows
  if (st.brows) {
    ctx.save(); ctx.strokeStyle = 'rgba(92,83,70,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const bx = sd * DG.eyeX + lx, byy = DG.eyeY - 22 + ly * .5; let a0 = 0, dy = 0;
      if (st.brows === 'up') { dy = -5; a0 = sd * -.12; } else if (st.brows === 'down') { dy = 2; a0 = sd * .32; } else if (st.brows === 'sad') { a0 = sd * -.3; } else if (st.brows === 'sus') { a0 = sd > 0 ? -.25 : .1; dy = sd > 0 ? -4 : 3; }
      ctx.save(); ctx.translate(bx, byy + dy); ctx.rotate(a0); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -3, 8, 0); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  // eyes
  const mode = st.eyes || 'n'; const open = clamp(st.open ?? 1);
  for (const sd of [-1, 1]) {
    const ex = sd * DG.eyeX + lx, ey = DG.eyeY + ly; let m = mode;
    if (mode === 'wink') m = sd > 0 ? 'happy' : 'n';
    const er = DG.eyeR * (m === 'wide' ? 1.12 : 1) * (st.eyeScale ?? 1);
    if (m === 'heart') {
      ctx.save(); ctx.fillStyle = '#F2708A'; ctx.translate(ex, ey + 1); heartPath(ctx, .95); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ell(ctx, -5, -6, 3, 2.4); ctx.fill(); ctx.restore(); continue;
    }
    if (m === 'star') {
      ctx.save(); ctx.fillStyle = '#E9A93A'; ctx.translate(ex, ey); ctx.beginPath(); for (let i = 0; i < 10; i++) { const r_ = i % 2 ? 6.5 : 15; const a = -PI / 2 + i * PI / 5; ctx.lineTo(Math.cos(a) * r_, Math.sin(a) * r_); } ctx.closePath(); ctx.fill(); ctx.restore(); continue;
    }
    if (m === 'tight') { // squeezed-shut >< eyes (effort)
      ctx.save(); ctx.strokeStyle = DC.eye; ctx.lineWidth = 5.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(ex + sd * 9, ey - 8); ctx.lineTo(ex - sd * 7, ey); ctx.lineTo(ex + sd * 9, ey + 8); ctx.stroke(); ctx.restore(); continue;
    }
    if (m === 'happy' || (m !== 'closed' && open < .15 && false)) {
      ctx.save(); ctx.strokeStyle = DC.eye; ctx.lineWidth = 5.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 10, ey + 3); ctx.quadraticCurveTo(ex, ey - 11, ex + 10, ey + 3); ctx.stroke(); ctx.restore();
    } else if (m === 'closed' || open < .12) {
      ctx.save(); ctx.strokeStyle = DC.eye; ctx.lineWidth = 4.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - 10, ey); ctx.quadraticCurveTo(ex, ey + 6, ex + 10, ey); ctx.stroke(); ctx.restore();
    } else if (m === 'squint') {
      ctx.save(); ctx.beginPath(); ctx.rect(ex - er - 2, ey - er * .15 + sd * 1.5, er * 2 + 4, er * 2); ctx.clip();
      ctx.fillStyle = DC.eye; ell(ctx, ex, ey + 2, er * .92, er * .92); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, ex + 4 + look[0] * 1.5, ey + 1, 3.4, 3.4); ctx.fill(); ctx.restore();
      ctx.save(); ctx.strokeStyle = DC.eye; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - er * .95, ey - er * .15 - sd * 1.5); ctx.lineTo(ex + er * .95, ey - er * .15 + sd * 1.5); ctx.stroke(); ctx.restore();
    } else {
      ctx.save(); ctx.translate(ex, ey); ctx.scale(1, open); ctx.translate(-ex, -ey);
      ctx.fillStyle = DC.eye; ell(ctx, ex, ey, er, er); ctx.fill();
      ctx.fillStyle = '#fff'; ell(ctx, ex + 5.2 * er / DG.eyeR + look[0] * 1.5, ey - 5.8 + look[1] * 1, 4.6 * er / DG.eyeR, 4.6 * er / DG.eyeR); ctx.fill();
      if (m === 'wide' || st.sparkle) { ell(ctx, ex - 5, ey + 5, 2.1, 2.1); ctx.fill(); }
      ctx.restore();
      if (m === 'squint') { /* drawn below */ }
    }
  }
  if (st.tears) for (const sd of [-1, 1]) { const ph = (t * 1.3 + (sd > 0 ? .5 : 0)) % 1; ctx.save(); ctx.globalAlpha *= (1 - ph) * st.tears; ctx.fillStyle = '#BFE3F0'; ell(ctx, sd * (DG.eyeX + 12), DG.eyeY + 8 + ph * 26, 2.8, 4); ctx.fill(); ctx.restore(); }
  drawMouth(ctx, st.mouth || 'rest', st.mouthOpen ?? .6, lx * .5, ly * .4);
}
function drawMouth(ctx, m, o, mx, my) {
  const cy = DG.mY + my; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fillOpen = (w, h, curve = 3) => { // D-shaped open mouth with tongue
    ctx.beginPath(); ctx.moveTo(mx - w, cy - 3); ctx.quadraticCurveTo(mx, cy - 3 + curve, mx + w, cy - 3); ctx.bezierCurveTo(mx + w, cy - 3 + h * 1.1, mx - w, cy - 3 + h * 1.1, mx - w, cy - 3); ctx.closePath();
    ctx.fillStyle = DC.mouth; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = DC.tongue; ell(ctx, mx, cy - 3 + h * .95, w * .62, h * .42); ctx.fill(); ctx.restore();
  };
  if (m === 'rest' || m === 'smile') {
    ctx.strokeStyle = DC.eye; ctx.lineWidth = 6.3; ctx.beginPath(); ctx.moveTo(mx - 15, cy - 5); ctx.quadraticCurveTo(mx, cy + 11, mx + 15, cy - 5); ctx.stroke();
  } else if (m === 'M') {
    ctx.strokeStyle = DC.eye; ctx.lineWidth = 6.3; ctx.beginPath(); ctx.moveTo(mx - 11, cy - 1); ctx.quadraticCurveTo(mx, cy + 3, mx + 11, cy - 1); ctx.stroke();
  } else if (m === 'A') fillOpen(14, 8 + 16 * o, 2);
  else if (m === 'E') fillOpen(17, 5 + 10 * o, 5);
  else if (m === 'S') fillOpen(13, 4 + 8 * o, 4);
  else if (m === 'F') { fillOpen(12, 4 + 4 * o, 2); ctx.fillStyle = '#fff'; rr(ctx, mx - 8, cy - 4, 16, 4, 2); ctx.fill(); }
  else if (m === 'O') { ctx.fillStyle = DC.mouth; ell(ctx, mx, cy + 3, 8 + 3 * o, 7 + 9 * o); ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = DC.tongue; ell(ctx, mx, cy + 9 + 6 * o, 6, 4); ctx.fill(); ctx.restore(); }
  else if (m === 'U') { ctx.fillStyle = DC.mouth; ell(ctx, mx, cy + 2, 6, 5 + 4 * o); ctx.fill(); }
  else if (m === 'grin') fillOpen(18, 17, 4);
  else if (m === 'smirk') { ctx.strokeStyle = DC.eye; ctx.lineWidth = 6.3; ctx.beginPath(); ctx.moveTo(mx - 13, cy + 1); ctx.quadraticCurveTo(mx + 2, cy + 7, mx + 15, cy - 7); ctx.stroke(); }
  else if (m === 'bleh') { ctx.fillStyle = DC.tongue; ell(ctx, mx + 4, cy + 7, 7.5, 9.5); ctx.fill(); ctx.strokeStyle = 'rgba(170,70,70,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx + 4, cy + 3); ctx.lineTo(mx + 4, cy + 11); ctx.stroke(); ctx.strokeStyle = DC.eye; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(mx - 13, cy); ctx.quadraticCurveTo(mx, cy + 3, mx + 13, cy - 1); ctx.stroke(); }
  else if (m === 'wavy') { ctx.strokeStyle = DC.eye; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(mx - 17, cy); for (let i = 0; i < 4; i++) { const x0 = mx - 17 + i * 8.5; ctx.quadraticCurveTo(x0 + 4.25, cy + (i % 2 ? 6 : -6), x0 + 8.5, cy); } ctx.stroke(); }
  else if (m === 'grit') { ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = DC.mouth; ctx.lineWidth = 3.4; rr(ctx, mx - 16, cy - 8, 32, 15, 6); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx - 15, cy - .5); ctx.lineTo(mx + 15, cy - .5); ctx.moveTo(mx - 5, cy - 8); ctx.lineTo(mx - 5, cy + 7); ctx.moveTo(mx + 5, cy - 8); ctx.lineTo(mx + 5, cy + 7); ctx.stroke(); }
  else if (m === 'flat') { ctx.strokeStyle = DC.eye; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(mx - 10, cy + 1); ctx.lineTo(mx + 10, cy + 1); ctx.stroke(); }
  ctx.restore();
}
function drawGlasses(ctx, look = [0, 0]) {
  const lx = look[0] * 4, ly = look[1] * 3.2; ctx.save(); ctx.strokeStyle = '#4A3B30'; ctx.lineWidth = 2.8;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * DG.eyeX + lx, DG.eyeY + ly, 19, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-DG.eyeX + 19 + lx, DG.eyeY + ly - 2); ctx.quadraticCurveTo(lx, DG.eyeY - 7 + ly, DG.eyeX - 19 + lx, DG.eyeY + ly - 2); ctx.stroke();
  ctx.globalAlpha *= .22; ctx.fillStyle = '#fff'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * DG.eyeX + lx - 6, DG.eyeY + ly - 7, 6, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawNightcap(ctx, t) {
  const sw = Math.sin(t * 2.2) * 3; ctx.save();
  ctx.fillStyle = '#6F8FB8'; ctx.beginPath(); ctx.moveTo(-46, -160); ctx.quadraticCurveTo(-24, -210, 10, -216); ctx.quadraticCurveTo(46 + sw, -214, 62 + sw, -178); ctx.quadraticCurveTo(40, -190, 30, -186); ctx.quadraticCurveTo(40, -170, 44, -160); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(255,248,235,.55)'; ctx.lineWidth = 7; for (let i = -3; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-60 + i * 24, -150); ctx.lineTo(-20 + i * 24, -232); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = '#FFF6E8'; rr(ctx, -52, -168, 104, 14, 7); ctx.fill(); ell(ctx, 62 + sw, -174, 9.5, 9.5); ctx.fill();
  ctx.restore();
}
