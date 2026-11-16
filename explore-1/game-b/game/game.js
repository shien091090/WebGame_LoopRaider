'use strict';
// 三職工坊 — 玩法驗證 Demo。邏輯固定 1/60 步進; 繪製全走 Art.drawXxx(ctx, state)。

const W = (window.Art && Art.canvas && Art.canvas.width) || 1280;
const H = (window.Art && Art.canvas && Art.canvas.height) || 720;
const TS = 40, COLS = 32, ROWS = 18;
const STEP = 1 / 60;
const CLS = ['hunter', 'miner', 'fairy'];
const CLS_NAME = { hunter: '獵人', miner: '礦工', fairy: '精靈' };
const CLS_TYPE = { hunter: 'fang', miner: 'ore', fairy: 'dew' };
const TYPES = ['fang', 'ore', 'dew'];
const POSES = ['idle', 'run', 'rise', 'fall', 'glide', 'hurt'];
const CLS_CD = { hunter: 3, miner: 0.4, fairy: 1 };
const AUTO = {
  hunter: { range: 240, every: 0.5 },
  miner: { range: 70, every: 0.6 },
  fairy: { range: 180, every: 0.8 }
};
const LEVEL_X = [30, 440, 850], LEVEL_Y = 60;
const CLASS_X = [30, 290, 550], CLASS_Y = 370;
const THUMB = 0.3;

// ---------- 關卡資料 ----------
const LEVEL_DEFS = [
  { name: '森林', veins: [7, 17, 24, 28], spikes: [], low: [9, 23], island: 4, mine: 2,
    wolves: [8, 20, 22, 26], beetles: [19], dWolves: [22, 25], dBeetles: [], cost: { fang: 0, ore: 0, dew: 0 } },
  { name: '礦谷', veins: [6, 17, 18, 26, 27], spikes: [22, 28], low: [9, 20], island: 5, mine: 3,
    wolves: [8, 9, 20, 24], beetles: [19, 25], dWolves: [22, 25], dBeetles: [], cost: { fang: 15, ore: 0, dew: 0 } },
  { name: '花崖', veins: [6, 17, 18, 26, 27], spikes: [21, 28], low: [8, 20, 29], island: 6, mine: 3,
    wolves: [19, 22, 23, 24, 25], beetles: [24, 25], dWolves: [22, 24], dBeetles: [25], cost: { fang: 0, ore: 20, dew: 15 } }
];
const CLASS_COST = {
  hunter: { fang: 0, ore: 0, dew: 0 },
  miner: { fang: 20, ore: 0, dew: 0 },
  fairy: { fang: 15, ore: 20, dew: 0 }
};
const GOAL_COST = { fang: 50, ore: 50, dew: 50 };

const KNOT = { x: 940, y: 620 };
const GOAL = { x: 1220, y: 600, w: 40, h: 80 };
const START = { x: 220, y: 618 };

function buildLevel(d) {
  const g = [];
  for (let r = 0; r < ROWS; r++) g.push(new Array(COLS).fill('.'));
  const set = (r, c, ch) => { g[r][c] = ch; };
  for (let c = 0; c < COLS; c++) { set(16, c, '#'); set(17, c, '#'); }
  for (let r = 1; r <= 15; r++) set(r, 31, '#');
  // 左側礦坑山體
  for (let r = 12; r <= 15; r++) for (let c = 0; c <= 3; c++) set(r, c, '#');
  for (let r = 14; r <= 15; r++) for (let c = 0; c <= 2; c++) set(r, c, '.');
  // 碎石牆只放一格(地面那格); 上方留空但只有 40px 高, 角色 44px 鑽不過, 敲碎後才進得去
  set(14, 3, '.'); set(15, 3, 'R');
  for (let i = 0; i < d.mine; i++) set(15, 2 - i, 'o');
  // 中段階梯
  for (let r = 14; r <= 15; r++) for (let c = 10; c <= 15; c++) set(r, c, '#');
  for (let r = 12; r <= 13; r++) for (let c = 12; c <= 15; c++) set(r, c, '#');
  for (let r = 10; r <= 11; r++) for (let c = 14; c <= 15; c++) set(r, c, '#');
  // 吊橋與獵人平台
  for (let c = 16; c <= 20; c++) set(10, c, 'B');
  for (let r = 10; r <= 11; r++) for (let c = 21; c <= 26; c++) set(r, c, '#');
  // 主路線地物
  d.veins.forEach(c => set(15, c, 'O'));
  d.spikes.forEach(c => set(15, c, '^'));
  // 浮空島
  for (let c = 2; c <= 7; c++) set(10, c, '#');
  const flowers = [];
  for (let i = 0; i < d.island; i++) flowers.push({ x: (7 - i) * TS + 20, y: 400 - 14 });
  d.low.forEach(c => flowers.push({ x: c * TS + 20, y: 640 - 14 }));
  const spawns = [];
  d.wolves.forEach(c => spawns.push({ kind: 'wolf', c, d: false }));
  d.beetles.forEach(c => spawns.push({ kind: 'beetle', c, d: false }));
  d.dWolves.forEach(c => spawns.push({ kind: 'wolf', c, d: true }));
  d.dBeetles.forEach(c => spawns.push({ kind: 'beetle', c, d: true }));
  return { grid: g, flowers, spawns };
}
const LEVEL_DATA = LEVEL_DEFS.map(buildLevel);

// ---------- 全域狀態 ----------
let canvas = null, ctx = null;
let mode = 'guide';           // guide | map | level | result | fail | ending
let paused = false;
let guidePage = 0;
const GUIDE = [
  { t: '衝到終點', s: '碰到旗子就過關' },
  { t: '操作', s: '←→ 走、Z 跳、X 技能' },
  { t: '自動攻擊', s: '怪物進圈就自動攻擊' },
  { t: '過關後一直重播', s: '過關的關卡會不停重播賺素材' },
  { t: '撿多還是跑快', s: '拿越多、跑越快, 重播賺越快' }
];
let stock, unlockedLevels, ownedClasses, curClass, tracks, popups, cur, totalTime, endTime, gameT;
let L = null;                 // 目前關卡進行狀態
let resultInfo = null;
let acc = 0;
const held = { left: false, right: false, x: false, z: false };
let pressZ = false, pressX = false;

function resetAll() {
  stock = { fang: 0, ore: 0, dew: 0 };
  unlockedLevels = [true, false, false];
  ownedClasses = { hunter: true, miner: false, fairy: false };
  curClass = 'hunter';
  tracks = [{}, {}, {}];
  popups = [];
  cur = { row: 0, col: 0 };
  totalTime = 0; endTime = 0; gameT = 0;
  L = null; resultInfo = null; paused = false;
  guidePage = 0;
}
resetAll();

// ---------- 工具 ----------
function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
}
function r1(v) { return Math.round(v * 10) / 10; }
function missingOf(cost) { return TYPES.filter(t => (cost[t] || 0) > stock[t]); }
function afford(cost) { return missingOf(cost).length === 0; }
function pay(cost) { TYPES.forEach(t => { stock[t] -= (cost[t] || 0); }); }
function incomeNow() {
  const inc = { fang: 0, ore: 0, dew: 0 };
  for (let i = 0; i < 3; i++) for (const k in tracks[i]) inc[CLS_TYPE[k]] += tracks[i][k].rate;
  TYPES.forEach(t => { inc[t] = r1(inc[t]); });
  return inc;
}

// ---------- 碰撞 ----------
function cellChar(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return '.';
  return L.grid[r][c];
}
function cellRect(r, c) {
  const ch = cellChar(r, c);
  if (ch === '#' || ch === 'O' || ch === 'o' || ch === 'R') return [c * TS, r * TS, TS, TS];
  if (ch === 'B' && L.bridgeDown) return [c * TS, r * TS, TS, 16];
  return null;
}
// 怪物視為障礙: 實心 + 尖刺
function blockedCell(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  const ch = L.grid[r][c];
  return ch === '#' || ch === 'O' || ch === 'o' || ch === 'R' || ch === '^' || (ch === 'B' && L.bridgeDown);
}
function moveAxis(b, dx, dy) {
  b.x += dx; b.y += dy;
  let hit = false;
  const c0 = Math.floor((b.x - b.w / 2) / TS), c1 = Math.floor((b.x + b.w / 2 - 0.001) / TS);
  const r0 = Math.floor((b.y - b.h / 2) / TS), r1c = Math.floor((b.y + b.h / 2 - 0.001) / TS);
  for (let r = r0; r <= r1c; r++) for (let c = c0; c <= c1; c++) {
    const q = cellRect(r, c);
    if (!q) continue;
    const bl = b.x - b.w / 2, br = b.x + b.w / 2, bt = b.y - b.h / 2, bb = b.y + b.h / 2;
    if (br > q[0] && bl < q[0] + q[2] && bb > q[1] && bt < q[1] + q[3]) {
      if (dx > 0) b.x = q[0] - b.w / 2;
      else if (dx < 0) b.x = q[0] + q[2] + b.w / 2;
      else if (dy > 0) b.y = q[1] - b.h / 2;
      else if (dy < 0) b.y = q[1] + q[3] + b.h / 2;
      hit = true;
    }
  }
  return hit;
}
function pointSolid(x, y) {
  const q = cellRect(Math.floor(y / TS), Math.floor(x / TS));
  return !!q && x >= q[0] && x < q[0] + q[2] && y >= q[1] && y < q[1] + q[3];
}

// ---------- 開關卡 ----------
function mkMon(s) {
  const wolf = s.kind === 'wolf';
  const w = wolf ? 44 : 48, h = wolf ? 30 : 32;
  const ground = s.d ? 400 : 640;
  return {
    kind: s.kind, x: s.c * TS + 20, y: ground - h / 2, w, h,
    hp: wolf ? 3 : 6, maxHp: wolf ? 3 : 6, speed: wolf ? 90 : 30,
    facing: (s.c % 2) ? 1 : -1, hurtT: 0.15, dead: false,
    bx0: s.d ? 840 : -1e9, bx1: s.d ? 1080 : 1e9
  };
}
function startLevel(idx) {
  const d = LEVEL_DATA[idx];
  const cls = curClass;
  L = {
    idx, cls,
    grid: d.grid.map(r => r.slice()),
    bridgeDown: false, knotCut: false,
    flowers: d.flowers.map(f => ({ x: f.x, y: f.y })),
    mons: d.spawns.map(mkMon),
    arrows: [], orbs: [], beams: [], poofs: [],
    steps: 0, count: 0, frames: [], events: [], t: 0,
    p: {
      x: START.x, y: START.y, w: 28, h: 44, vx: 0, vy: 0, facing: 1,
      onGround: false, air2: true, inv: 0, kb: 0, kbDir: 1, hp: 3,
      cd: 0, cdDur: CLS_CD[cls], autoCd: 0, autoT: 0.12, skillT: 0.15,
      jumpT: 1, cut: true, zUp: false, glide: false, autoAngle: 0, pose: 'idle'
    }
  };
  mode = 'level'; resultInfo = null; acc = 0;
  pressZ = false; pressX = false;
}

function gain(n, type) {
  L.count += n;
  L.events.push({ t: (L.steps - 1) * STEP, x: L.p.x, y: L.p.y, type, n });
}
function poofAt(x, y) { L.poofs.push({ x, y, t: 0 }); }
function dmg(m, n) {
  if (m.dead) return;
  m.hp -= n; m.hurtT = 0;
  if (m.hp <= 0) {
    m.dead = true;
    poofAt(m.x, m.y);
    if (L.cls === 'hunter') gain(m.kind === 'wolf' ? 1 : 2, 'fang');
  }
}
function nearestMon(range) {
  const p = L.p;
  let best = null, bd = Infinity;
  for (const m of L.mons) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d <= range && d < bd) { bd = d; best = m; }
  }
  return best;
}
function nearestAny(x, y) {
  let best = null, bd = Infinity;
  for (const m of L.mons) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

// ---------- 技能 ----------
function useSkill() {
  const p = L.p;
  if (L.cls === 'hunter') {
    if (p.cd > 0) return;
    p.cd = CLS_CD.hunter; p.skillT = 0;
    const dir = p.facing;
    L.beams.push({ x0: p.x, y: p.y, dir, t: 0, dur: 0.15 });
    for (const m of L.mons) {
      if (m.dead) continue;
      if ((m.x - p.x) * dir > 0 && Math.abs(m.y - p.y) < m.h / 2 + 8) dmg(m, 2);
    }
    if (!L.knotCut && (KNOT.x - p.x) * dir > 0 && Math.abs(KNOT.y - p.y) < 12 + 8) {
      L.knotCut = true; L.bridgeDown = true;
    }
  } else if (L.cls === 'miner') {
    if (p.cd > 0) return;
    p.cd = CLS_CD.miner; p.skillT = 0;
    const dir = p.facing;
    const edge = p.x + dir * (p.w / 2);
    const row = Math.floor(p.y / TS);
    for (const off of [8, 30]) {
      const c = Math.floor((edge + dir * off) / TS);
      const ch = cellChar(row, c);
      if (ch === 'O' || ch === 'o' || ch === 'R') {
        L.grid[row][c] = '.';
        poofAt(c * TS + 20, row * TS + 20);
        if (ch !== 'R') gain(1, 'ore');
        break;
      }
    }
    const fx = edge + dir * 25;
    for (const m of L.mons) {
      if (m.dead) continue;
      if (overlap(fx, p.y, 50, 40, m.x, m.y, m.w, m.h)) dmg(m, 2);
    }
  }
}

function autoAttack() {
  const p = L.p, a = AUTO[L.cls];
  if (p.autoCd > 0) return;
  const t = nearestMon(a.range);
  if (!t) return;
  p.autoCd = a.every; p.autoT = 0;
  p.autoAngle = Math.atan2(t.y - p.y, t.x - p.x);
  if (L.cls === 'hunter') {
    const ang = p.autoAngle;
    L.arrows.push({ x: p.x, y: p.y, vx: Math.cos(ang) * 700, vy: Math.sin(ang) * 700, angle: ang, life: 1.2 });
  } else if (L.cls === 'miner') {
    dmg(t, 2);
  } else {
    L.orbs.push({ x: p.x, y: p.y, vx: 0, vy: 0, target: t, age: 0 });
  }
}

// ---------- 每步更新 ----------
function monsterStep(m, dt) {
  m.hurtT = Math.min(m.hurtT + dt, 0.15);
  const nx = m.x + m.facing * m.speed * dt;
  let turn = false;
  const c0 = Math.floor((nx - m.w / 2) / TS), c1 = Math.floor((nx + m.w / 2 - 0.001) / TS);
  const r0 = Math.floor((m.y - m.h / 2 + 2) / TS), r1c = Math.floor((m.y + m.h / 2 - 2) / TS);
  for (let r = r0; r <= r1c && !turn; r++) for (let c = c0; c <= c1; c++) if (blockedCell(r, c)) { turn = true; break; }
  if (!turn) {
    const px = nx + m.facing * (m.w / 2), py = m.y + m.h / 2 + 4;
    if (!pointSolid(px, py)) turn = true;
  }
  if (!turn && (nx - m.w / 2 < m.bx0 || nx + m.w / 2 > m.bx1)) turn = true;
  if (turn) m.facing = -m.facing; else m.x = nx;
}

function stepLevel() {
  const dt = STEP, p = L.p;
  L.steps++; L.t += dt;
  p.inv = Math.max(0, p.inv - dt); p.kb = Math.max(0, p.kb - dt);
  p.skillT = Math.min(p.skillT + dt, 0.15); p.autoT = Math.min(p.autoT + dt, 0.12);
  p.cd = Math.max(0, p.cd - dt); p.autoCd = Math.max(0, p.autoCd - dt);
  p.jumpT += dt;

  // 輸入
  let dir = 0;
  if (held.left) dir -= 1;
  if (held.right) dir += 1;
  if (p.kb > 0) p.vx = p.kbDir * 80 / 0.15;
  else { p.vx = dir * 260; if (dir) p.facing = dir; }

  if (pressZ) {
    pressZ = false;
    if (p.kb <= 0) {
      if (p.onGround) { p.vy = -720; p.jumpT = 0; p.cut = false; p.onGround = false; }
      else if (L.cls === 'fairy' && p.air2) { p.vy = -720; p.air2 = false; p.cut = true; }
    }
  }
  if (p.zUp) {
    p.zUp = false;
    if (!p.cut && p.jumpT < 0.15 && p.vy < -360) p.vy = -360;
    p.cut = true;
  }
  if (pressX) { pressX = false; useSkill(); }

  // 物理
  p.vy = Math.min(p.vy + 2400 * dt, 900);
  p.glide = false;
  if (L.cls === 'fairy' && held.x && !p.onGround && p.vy > 70) { p.vy = 70; p.glide = true; }
  moveAxis(p, p.vx * dt, 0);
  p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));
  const wasFall = p.vy > 0;
  const hitY = moveAxis(p, 0, p.vy * dt);
  p.onGround = false;
  if (hitY) {
    if (wasFall) { p.onGround = true; p.air2 = true; }
    p.vy = 0;
  }
  if (p.onGround && L.cls === 'fairy') p.air2 = true;

  // 自動攻擊
  autoAttack();

  // 怪物
  for (const m of L.mons) if (!m.dead) monsterStep(m, dt);

  // 箭
  for (const a of L.arrows) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
    if (a.x < 0 || a.x > W || a.y < 0 || a.y > H || a.life <= 0 || pointSolid(a.x, a.y)) { a.gone = true; continue; }
    for (const m of L.mons) {
      if (m.dead) continue;
      if (overlap(a.x, a.y, 12, 6, m.x, m.y, m.w, m.h)) { dmg(m, 1); a.gone = true; break; }
    }
  }
  L.arrows = L.arrows.filter(a => !a.gone);
  // 光球
  for (const o of L.orbs) {
    o.age += dt;
    if (!o.target || o.target.dead) o.target = nearestAny(o.x, o.y);
    if (o.target) {
      const dx = o.target.x - o.x, dy = o.target.y - o.y, d = Math.hypot(dx, dy) || 1;
      o.vx = dx / d * 350; o.vy = dy / d * 350;
    }
    o.x += o.vx * dt; o.y += o.vy * dt;
    if (o.age > 3 || (!o.target && !o.vx && !o.vy) || o.x < -20 || o.x > W + 20 || o.y < -20 || o.y > H + 20) { o.gone = true; continue; }
    for (const m of L.mons) {
      if (m.dead) continue;
      if (overlap(o.x, o.y, 14, 14, m.x, m.y, m.w, m.h)) { dmg(m, 1); o.gone = true; break; }
    }
  }
  L.orbs = L.orbs.filter(o => !o.gone);
  L.mons = L.mons.filter(m => !m.dead);
  for (const b of L.beams) b.t += dt;
  L.beams = L.beams.filter(b => b.t < b.dur);
  for (const f of L.poofs) f.t += dt;
  L.poofs = L.poofs.filter(f => f.t < 0.3);

  // 發光花(精靈專屬)
  if (L.cls === 'fairy') {
    L.flowers = L.flowers.filter(f => {
      if (overlap(p.x, p.y, p.w, p.h, f.x, f.y, 28, 28)) { gain(1, 'dew'); return false; }
      return true;
    });
  }

  // 怪物碰撞
  if (p.inv <= 0) {
    for (const m of L.mons) {
      if (overlap(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)) {
        p.hp -= 1; p.inv = 1; p.kb = 0.15;
        p.kbDir = p.x < m.x ? -1 : 1;
        break;
      }
    }
  }

  // 姿勢
  if (p.kb > 0) p.pose = 'hurt';
  else if (p.glide) p.pose = 'glide';
  else if (!p.onGround) p.pose = p.vy < 0 ? 'rise' : 'fall';
  else p.pose = Math.abs(p.vx) > 1 ? 'run' : 'idle';

  // 錄影
  L.frames.push([p.x, p.y, p.facing, POSES.indexOf(p.pose)]);

  // 失敗條件
  let fail = p.hp <= 0 || p.y - p.h / 2 > H;
  if (!fail) {
    const c0 = Math.floor((p.x - p.w / 2) / TS), c1 = Math.floor((p.x + p.w / 2 - 0.001) / TS);
    const r0 = Math.floor((p.y - p.h / 2) / TS), r1c = Math.floor((p.y + p.h / 2 - 0.001) / TS);
    for (let r = r0; r <= r1c && !fail; r++) for (let c = c0; c <= c1; c++) {
      if (cellChar(r, c) === '^' && overlap(p.x, p.y, p.w, p.h, c * TS + 20, r * TS + 30, TS, 20)) { fail = true; break; }
    }
  }
  if (fail) { mode = 'fail'; clearInput(); return; }
  if (overlap(p.x, p.y, p.w, p.h, GOAL.x, GOAL.y, GOAL.w, GOAL.h)) finishLevel();
}

function finishLevel() {
  const dur = L.steps * STEP;
  const rate = r1(L.count / dur * 60);
  const old = tracks[L.idx][L.cls];
  let result;
  if (!old) result = 'first';
  else if (rate > old.rate) result = 'record';
  else result = 'kept';
  if (result !== 'kept') {
    tracks[L.idx][L.cls] = {
      cls: L.cls, rate, dur, frames: L.frames,
      events: L.events.map(e => ({ t: Math.min(e.t, dur - 1e-6), x: e.x, y: e.y, type: e.type, n: e.n })),
      phase: 0
    };
  }
  resultInfo = { cls: L.cls, time: r1(dur), count: L.count, type: CLS_TYPE[L.cls], rate, oldRate: old ? old.rate : null, result };
  // 過關時才入帳
  stock[CLS_TYPE[L.cls]] += L.count;
  mode = 'result';
  clearInput();
}

// ---------- 回放 ----------
function advanceReplays(dt) {
  for (let li = 0; li < 3; li++) {
    for (const k in tracks[li]) {
      const tr = tracks[li][k];
      if (!(tr.dur > 0)) continue;
      let a = tr.phase, left = dt;
      while (left > 0) {
        const seg = Math.min(left, tr.dur - a), b = a + seg;
        for (const e of tr.events) {
          if (e.t >= a && e.t < b) {
            stock[e.type] += e.n;
            popups.push({ x: LEVEL_X[li] + 8 + e.x * THUMB, y: LEVEL_Y + 8 + e.y * THUMB, t: 0, dur: 0.8, type: e.type, value: e.n });
          }
        }
        a = b; left -= seg;
        if (a >= tr.dur - 1e-9) a = 0;
      }
      tr.phase = a;
    }
  }
}

// ---------- 輸入 ----------
function clearInput() {
  held.left = held.right = held.x = held.z = false;
  pressZ = pressX = false;
}
function mapSelectedCost() {
  if (cur.row === 0) return LEVEL_DEFS[cur.col].cost;
  if (cur.row === 1) return CLASS_COST[CLS[cur.col]];
  return GOAL_COST;
}
function mapConfirm() {
  if (cur.row === 0) {
    const i = cur.col;
    if (unlockedLevels[i]) startLevel(i);
    else if (afford(LEVEL_DEFS[i].cost)) { pay(LEVEL_DEFS[i].cost); unlockedLevels[i] = true; }
  } else if (cur.row === 1) {
    const k = CLS[cur.col];
    if (ownedClasses[k]) curClass = k;
    else if (afford(CLASS_COST[k])) { pay(CLASS_COST[k]); ownedClasses[k] = true; }
  } else if (afford(GOAL_COST)) {
    pay(GOAL_COST);
    endTime = totalTime;
    mode = 'ending';
  }
}
function inputDown(k) {
  if (k === 'Esc') {
    if (mode === 'level' || mode === 'map') { paused = !paused; clearInput(); }
    return;
  }
  if (paused) {
    if (mode === 'level') {
      if (k === 'Z') { paused = false; startLevel(L.idx); }
      else if (k === 'X') { paused = false; mode = 'map'; L = null; }
    }
    return;
  }
  if (mode === 'guide') {
    if (k === 'Left') guidePage = Math.max(0, guidePage - 1);
    else if (k === 'Right') guidePage = Math.min(GUIDE.length - 1, guidePage + 1);
    else if (k === 'Z') {
      if (guidePage < GUIDE.length - 1) guidePage++;
      else { mode = 'map'; clearInput(); }
    }
  } else if (mode === 'map') {
    if (k === 'Up') cur.row = Math.max(0, cur.row - 1);
    else if (k === 'Down') cur.row = Math.min(2, cur.row + 1);
    else if (k === 'Left') cur.col = Math.max(0, cur.col - 1);
    else if (k === 'Right') cur.col = Math.min(2, cur.col + 1);
    else if (k === 'Space') { mode = 'guide'; guidePage = 0; }
    else if (k === 'Z') mapConfirm();
    if (cur.row === 2) cur.col = 0;
    cur.col = Math.min(cur.col, 2);
  } else if (mode === 'level') {
    if (k === 'Left') held.left = true;
    else if (k === 'Right') held.right = true;
    else if (k === 'Z') { held.z = true; pressZ = true; }
    else if (k === 'X') { held.x = true; pressX = true; }
  } else if (mode === 'result') {
    if (k === 'Z') { mode = 'map'; L = null; resultInfo = null; clearInput(); }
    else if (k === 'X') startLevel(L.idx);
  } else if (mode === 'fail') {
    if (k === 'Z') startLevel(L.idx);
    else if (k === 'X') { mode = 'map'; L = null; clearInput(); }
  } else if (mode === 'ending') {
    if (k === 'Z') { resetAll(); mode = 'guide'; clearInput(); }
  }
}
function inputUp(k) {
  if (k === 'Left') held.left = false;
  else if (k === 'Right') held.right = false;
  else if (k === 'X') held.x = false;
  else if (k === 'Z') {
    held.z = false;
    if (mode === 'level' && L && !paused) L.p.zUp = true;
  }
}
const KEYMAP = {
  ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down',
  KeyZ: 'Z', KeyX: 'X', Space: 'Space', Escape: 'Esc'
};
function onKeyDown(e) {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  inputDown(k);
}
function onKeyUp(e) {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  inputUp(k);
}

// ---------- 繪製 ----------
const FONT = '"Microsoft JhengHei", "PingFang TC", sans-serif';
function text(s, x, y, size, color, align, bold) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || '#fff';
  ctx.fillText(s, x, y);
}
function groundTop(g, r, c) { return !(r > 0 && g[r - 1][c] === '#'); }

function drawTerrain(g, bridgeLowered, thumb) {
  for (let r = 1; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = g[r][c];
    if (ch === '.') continue;
    const x = c * TS + 20, y = r * TS + 20;
    if (ch === '#') Art.drawGround(ctx, { x, y, top: groundTop(g, r, c) });
    else if (ch === '^') Art.drawSpike(ctx, { x, y });
    else if (ch === 'O' || ch === 'o') Art.drawOreVein(ctx, { x, y });
    else if (ch === 'R') Art.drawRubbleWall(ctx, { x, y });
    else if (ch === 'B') Art.drawBridge(ctx, { x, y, lowered: bridgeLowered });
  }
}

function drawLevelScene() {
  const p = L.p, g = L.grid;
  Art.drawBackground(ctx, {});
  drawTerrain(g, L.bridgeDown);
  Art.drawRopeKnot(ctx, { x: KNOT.x, y: KNOT.y, cut: L.knotCut });
  for (const f of L.flowers) Art.drawFlower(ctx, { x: f.x, y: f.y, t: gameT, collectible: L.cls === 'fairy' });
  Art.drawGoal(ctx, { x: GOAL.x, y: GOAL.y, reached: mode === 'result' });
  Art.drawRangeRing(ctx, { x: p.x, y: p.y, radius: AUTO[L.cls].range, cls: L.cls });
  for (const m of L.mons) {
    const s = { x: m.x, y: m.y, facing: m.facing, hp: m.hp, maxHp: m.maxHp, hurtT: m.hurtT, hurtDur: 0.15 };
    if (m.kind === 'wolf') Art.drawWolf(ctx, s); else Art.drawBeetle(ctx, s);
  }
  for (const a of L.arrows) Art.drawHunterArrow(ctx, { x: a.x, y: a.y, angle: a.angle });
  for (const o of L.orbs) Art.drawOrb(ctx, { x: o.x, y: o.y, t: o.age });
  for (const b of L.beams) Art.drawPierceShot(ctx, { x0: b.x0, y: b.y, dir: b.dir, t: b.t, dur: b.dur });
  Art.drawPlayer(ctx, {
    x: p.x, y: p.y, cls: L.cls, facing: p.facing, pose: p.pose,
    skillT: p.skillT, skillDur: 0.15, autoT: p.autoT, autoDur: 0.12,
    autoAngle: p.autoAngle, invuln: p.inv
  });
  for (const f of L.poofs) Art.drawPoof(ctx, { x: f.x, y: f.y, t: f.t, dur: 0.3 });
  const rec = tracks[L.idx][L.cls];
  Art.drawHud(ctx, {
    mode: 'level', stock, income: incomeNow(), time: r1(L.steps * STEP),
    runCount: L.count, runType: CLS_TYPE[L.cls], recordRate: rec ? rec.rate : null,
    hp: Math.max(0, p.hp), maxHp: 3,
    skillCdT: L.cls === 'fairy' ? 1 : p.cdDur - p.cd, skillCdDur: L.cls === 'fairy' ? 1 : p.cdDur, cls: L.cls
  });
}

function drawThumb(idx, x, y) {
  const d = LEVEL_DATA[idx];
  const hunterTrack = !!tracks[idx].hunter;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, 384, 216); ctx.clip();
  ctx.translate(x, y); ctx.scale(THUMB, THUMB);
  Art.drawBackground(ctx, {});
  drawTerrain(d.grid, hunterTrack);
  Art.drawRopeKnot(ctx, { x: KNOT.x, y: KNOT.y, cut: hunterTrack });
  for (const f of d.flowers) Art.drawFlower(ctx, { x: f.x, y: f.y, t: gameT, collectible: true });
  Art.drawGoal(ctx, { x: GOAL.x, y: GOAL.y, reached: false });
  for (const k of CLS) {
    const tr = tracks[idx][k];
    if (!tr || !tr.frames.length) continue;
    const fr = tr.frames[Math.min(tr.frames.length - 1, Math.floor(tr.phase * 60))];
    Art.drawGhost(ctx, { x: fr[0], y: fr[1], cls: k, facing: fr[2], pose: POSES[fr[3]] });
  }
  ctx.restore();
}

function drawMapScene() {
  Art.drawMapBackground(ctx, {});
  for (let i = 0; i < 3; i++) {
    const open = unlockedLevels[i];
    const list = [];
    CLS.forEach(k => { const tr = tracks[i][k]; if (tr) list.push({ cls: k, rate: tr.rate }); });
    Art.drawLevelCard(ctx, {
      x: LEVEL_X[i], y: LEVEL_Y, index: i + 1, name: LEVEL_DEFS[i].name,
      state: open ? 'open' : 'locked', tracks: list,
      cost: LEVEL_DEFS[i].cost, missing: open ? [] : missingOf(LEVEL_DEFS[i].cost),
      selected: cur.row === 0 && cur.col === i
    });
    if (open) drawThumb(i, LEVEL_X[i] + 8, LEVEL_Y + 8);
  }
  for (const pp of popups) {
    Art.drawPopup(ctx, { x: pp.x, y: pp.y, t: pp.t, dur: pp.dur, type: pp.type, value: pp.value });
  }
  for (let i = 0; i < 3; i++) {
    const k = CLS[i];
    const st = !ownedClasses[k] ? 'locked' : (curClass === k ? 'active' : 'owned');
    Art.drawClassCard(ctx, {
      x: CLASS_X[i], y: CLASS_Y, cls: k, name: CLS_NAME[k], state: st,
      cost: CLASS_COST[k], missing: ownedClasses[k] ? [] : missingOf(CLASS_COST[k]),
      selected: cur.row === 1 && cur.col === i
    });
  }
  Art.drawIncomePanel(ctx, { x: 830, y: 370, income: incomeNow() });
  Art.drawGoalCard(ctx, { x: 30, y: 530, cost: GOAL_COST, missing: missingOf(GOAL_COST), selected: cur.row === 2 });
  text('↑↓ 換列   ←→ 選擇   Z 確定(進關 / 解鎖 / 換職業 / 購買)   空白鍵 說明   Esc 暫停', W / 2, 685, 22, '#fff', 'center', false);
  Art.drawHud(ctx, {
    mode: 'map', stock, income: incomeNow(), time: null, runCount: null, runType: null,
    recordRate: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null
  });
}

function drawGuideScene() {
  const g = GUIDE[guidePage];
  Art.drawMapBackground(ctx, {});
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  text('第 ' + (guidePage + 1) + ' 頁: ' + g.t, W / 2, 62, 40, '#ffe58a', 'center', true);
  Art.drawGuidePage(ctx, { page: guidePage + 1, x: 240, y: 110, w: 800, h: 400 });
  text(g.s, W / 2, 565, 34, '#fff', 'center', true);
  text((guidePage + 1) + ' / ' + GUIDE.length, W / 2, 620, 24, '#ccc', 'center', false);
  const last = guidePage === GUIDE.length - 1;
  text('← → 翻頁    Z ' + (last ? '開始' : '下一頁'), W / 2, 670, 26, '#fff', 'center', false);
}

function render() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (mode === 'guide') { drawGuideScene(); return; }
  if (mode === 'ending') {
    drawMapScene();
    Art.drawEndingPanel(ctx, { totalTime: r1(endTime) });
    return;
  }
  if (mode === 'map') drawMapScene();
  else {
    drawLevelScene();
    if (mode === 'result') Art.drawResultPanel(ctx, resultInfo);
    else if (mode === 'fail') Art.drawFailPanel(ctx, {});
  }
  if (paused) Art.drawPausePanel(ctx, { mode: mode === 'level' ? 'level' : 'map' });
}

// ---------- 主迴圈 ----------
function update(dt) {
  const running = !paused && mode !== 'guide' && mode !== 'ending';
  if (!running) return;
  totalTime += dt; gameT += dt;
  advanceReplays(dt);
  for (const pp of popups) pp.t += dt;
  popups = popups.filter(pp => pp.t < pp.dur);
  if (mode === 'level') {
    acc += dt;
    while (acc >= STEP && mode === 'level') { acc -= STEP; stepLevel(); }
  }
}
let lastTs = 0;
function frame(ts) {
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, 1 / 30);
  update(dt);
  render();
  requestAnimationFrame(frame);
}
function fit() {
  const vw = window.innerWidth || W, vh = window.innerHeight || H;
  const s = Math.min(vw / W, vh / H);
  const cw = Math.max(1, Math.floor(W * s)), ch = Math.max(1, Math.floor(H * s));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
}
function boot() {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearInput);
  requestAnimationFrame(frame);
}
boot();
