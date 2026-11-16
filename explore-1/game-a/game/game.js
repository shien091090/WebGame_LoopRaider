// 疾影回放 — 玩法驗證 Demo(只用鍵盤)
'use strict';

// ===== 常數 =====
const W = Art.canvas.width, H = Art.canvas.height;
const T = 40, COLS = 32, ROWS = 18, STEP = 1 / 60;
const HW = 14, HH = 22;
const CLS_NAME = { sword: '劍士', archer: '弓手', mage: '法師' };
const ATK_DUR = { sword: 0.2, archer: 0.15, mage: 0.15 };
const ATK_CD = { sword: 0.3, archer: 0.4, mage: 0.5 };
const SK_DUR = { sword: 1.5, archer: 5, mage: 1 };
const LEVEL_COST = [0, 30, 70];
const CLASS_COST = { sword: 0, archer: 40, mage: 90 };
const BOOT_COST = [40, 80, 140];
const GOAL_COST = 300;
const LEVEL_NAME = ['草原', '洞窟', '高塔'];
const CARD_LEVEL = [[30, 60], [440, 60], [850, 60]];
const CARD_CLASS = [[30, 370], [290, 370], [550, 370]];
const CARD_BOOT = [830, 370];
const CARD_GOAL = [30, 530];
const GUIDE_FRAME = [
  { w: 640, h: 360 }, { w: 840, h: 300 }, { w: 640, h: 400 }, { w: 840, h: 360 }
];
const GUIDE_TEXT = [
  ['衝到終點', '撿晶石,碰到旗子就過關'],
  ['操作', '← → 走    Z 跳    X 攻擊    空白鍵 技能'],
  ['過關後一直重播', '過關的關卡會不停重播賺晶石'],
  ['撿多還是跑快', '撿越多、跑越快,重播賺越快']
];
const FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

// ===== 佔位圖形(目前無, 全部用 Art) =====
const Placeholder = {};

// ===== 關卡資料 =====
function mkGrid() {
  const g = [];
  for (let r = 0; r < ROWS; r++) { g.push([]); for (let c = 0; c < COLS; c++) g[r].push('.'); }
  return g;
}
function fill(g, c0, c1, r0, r1, ch) {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = ch;
}
function baseGrid(pits) {
  const g = mkGrid();
  fill(g, 0, 31, 16, 17, '#');
  fill(g, 0, 0, 1, 15, '#');
  fill(g, 31, 31, 1, 15, '#');
  (pits || []).forEach(function (p) { fill(g, p[0], p[1], 16, 17, '.'); });
  return g;
}
// 土丘: 左側階梯(高1、高2), 高台(高3)內有凹室, 右側面是門(裂岩牆或柵門)
function mound(g, cs, doorCol, doorCh) {
  g[15][cs] = '#';
  fill(g, cs + 1, cs + 1, 14, 15, '#');
  fill(g, cs + 2, doorCol, 13, 15, '#');
  fill(g, cs + 3, doorCol - 1, 14, 15, '.');
  fill(g, doorCol, doorCol, 14, 15, doorCh);
}
function put(g, list, ch) { list.forEach(function (p) { g[p[1]][p[0]] = ch; }); }

function buildL1() {
  const g = baseGrid([[14, 16]]);
  mound(g, 5, 10, 'C');
  mound(g, 20, 25, 'G');
  fill(g, 17, 21, 9, 9, '#');          // 法師高台
  g[15][0] = 'T';                      // 標靶(左邊界牆)
  put(g, [[8, 15], [9, 15], [9, 14]], '*');           // 劍士區
  put(g, [[23, 15], [24, 15], [24, 14]], '*');        // 弓手區
  put(g, [[18, 8], [19, 8], [20, 8]], '*');           // 法師區
  put(g, [[4, 15], [9, 12], [15, 14], [19, 15], [23, 12]], '*'); // 主路線 5
  put(g, [[3, 15], [28, 15]], 'M');
  put(g, [[1, 15]], 'P');
  put(g, [[30, 15]], 'F');
  return g;
}
function buildL2() {
  const g = baseGrid([[18, 20]]);
  mound(g, 9, 14, 'G');
  mound(g, 22, 27, 'C');
  g[15][22] = 'T';                     // 標靶(步階面向左)
  fill(g, 19, 23, 9, 9, '#');          // 法師高台
  put(g, [[5, 15], [6, 15]], 'S');
  put(g, [[12, 15], [13, 15], [12, 14], [13, 14]], '*');   // 弓手區 4
  put(g, [[25, 15], [26, 15], [25, 14], [26, 14]], '*');   // 劍士區 4
  put(g, [[19, 8], [20, 8], [21, 8], [22, 8]], '*');       // 法師區 4
  put(g, [[4, 15], [8, 15], [13, 12], [19, 14], [21, 15], [25, 12]], '*'); // 主路線 6
  put(g, [[3, 15], [16, 15], [28, 15]], 'M');
  put(g, [[19, 12]], 'B');
  put(g, [[1, 15]], 'P');
  put(g, [[30, 15]], 'F');
  return g;
}
function buildL3() {
  const g = baseGrid([]);
  mound(g, 4, 10, 'C');
  mound(g, 13, 19, 'G');
  g[15][13] = 'T';
  fill(g, 10, 14, 9, 9, '#');          // 法師高台
  // 塔: 往上爬
  fill(g, 22, 25, 14, 15, '#');
  fill(g, 27, 30, 12, 12, '#');
  fill(g, 22, 25, 10, 10, '#');
  fill(g, 27, 30, 8, 8, '#');
  fill(g, 22, 25, 6, 6, '#');
  fill(g, 27, 30, 4, 4, '#');
  put(g, [[29, 11], [29, 7], [23, 5]], 'S');
  put(g, [[7, 15], [8, 15], [9, 15], [7, 14], [8, 14]], '*');     // 劍士區 5
  put(g, [[16, 15], [17, 15], [18, 15], [16, 14], [17, 14]], '*'); // 弓手區 5
  put(g, [[10, 8], [11, 8], [12, 8], [13, 8], [14, 8]], '*');      // 法師區 5
  put(g, [[2, 15], [8, 12], [12, 15], [16, 12], [24, 13], [30, 11], [24, 9]], '*'); // 主路線 7
  put(g, [[3, 15], [11, 15], [20, 15]], 'M');
  put(g, [[19, 10], [24, 11]], 'B');
  put(g, [[1, 15]], 'P');
  put(g, [[29, 3]], 'F');
  return g;
}

function parseLevel(g, name) {
  const L = { name: name, g: g, crystals: [], slimes: [], bats: [], spikes: [], grounds: [], cracks: [], gates: [], target: null, start: null, flag: null };
  let gid = 0;
  const gmap = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = g[r][c], cx = c * T + 20, cy = r * T + 20;
      if (ch === '*') { L.crystals.push({ id: L.crystals.length, x: cx, y: cy }); g[r][c] = '.'; }
      else if (ch === 'M') { L.slimes.push({ x: cx, bottom: (r + 1) * T }); g[r][c] = '.'; }
      else if (ch === 'B') { L.bats.push({ x: cx, y: cy }); g[r][c] = '.'; }
      else if (ch === 'P') { L.start = { x: cx, y: (r + 1) * T - HH }; g[r][c] = '.'; }
      else if (ch === 'F') { L.flag = { x: cx, y: r * T }; g[r][c] = '.'; }
      else if (ch === 'S') L.spikes.push({ c: c, r: r, x: cx, y: cy });
      else if (ch === 'G') L.gates.push({ c: c, r: r, x: cx, y: cy });
      else if (ch === 'T') L.target = { c: c, r: r, x: cx, y: cy };
    }
  }
  // 裂岩牆分組(相鄰者同組, 一起碎)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] !== 'C' || gmap[c + ',' + r] !== undefined) continue;
      const stack = [[c, r]]; gmap[c + ',' + r] = gid;
      while (stack.length) {
        const q = stack.pop();
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const nc = q[0] + d[0], nr = q[1] + d[1];
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && g[nr][nc] === 'C' && gmap[nc + ',' + nr] === undefined) {
            gmap[nc + ',' + nr] = gid; stack.push([nc, nr]);
          }
        });
      }
      gid++;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === 'C') L.cracks.push({ c: c, r: r, x: c * T + 20, y: r * T + 20, gid: gmap[c + ',' + r] });
      if (g[r][c] === '#') L.grounds.push({ x: c * T + 20, y: r * T + 20, top: !(r > 0 && g[r - 1][c] === '#') });
    }
  }
  return L;
}
const LEVELS = [parseLevel(buildL1(), LEVEL_NAME[0]), parseLevel(buildL2(), LEVEL_NAME[1]), parseLevel(buildL3(), LEVEL_NAME[2])];

// ===== 全域狀態 =====
let scene = 'guide';          // guide | map | level | result | fail | ending
let paused = false;
let gt = 0;                   // 動畫用經過秒數
let guidePage = 0, guideFrom = 'start';
let stock = 0, playTime = 0;
let levelUnlocked = [true, false, false];
let owned = { sword: true, archer: false, mage: false };
let activeCls = 'sword';
let boots = 0;
let replays = [null, null, null];
let rt = [0, 0, 0];
let popups = [];
let sel = { row: 0, col: 0 };
let run = null, acc = 0, resultInfo = null;
const held = { left: false, right: false, z: false };
let pend = { jump: false, atk: false, skill: false };

function resetAll() {
  stock = 0; playTime = 0;
  levelUnlocked = [true, false, false];
  owned = { sword: true, archer: false, mage: false };
  activeCls = 'sword'; boots = 0;
  replays = [null, null, null]; rt = [0, 0, 0];
  popups = []; sel = { row: 0, col: 0 };
  run = null; resultInfo = null; paused = false;
  scene = 'guide'; guidePage = 0; guideFrom = 'start';
  clearPend();
}
function clearPend() { pend.jump = false; pend.atk = false; pend.skill = false; }
function r1(v) { return Math.round(v * 10) / 10; }

// ===== 地形查詢 =====
function solidAt(R, c, r) {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  const ch = R.L.g[r][c];
  if (ch === '#' || ch === 'T') return true;
  if (ch === 'C') return !R.crackBroken[c + ',' + r];
  if (ch === 'G') return !R.gatesOpen;
  return false;
}
function overlap(a1, b1, a2, b2, c1, d1, c2, d2) { return a1 < c2 && a2 > c1 && b1 < d2 && b2 > d1; }

// ===== 開局一趟 =====
function newRun(i) {
  const L = LEVELS[i];
  const dur = SK_DUR[activeCls];
  return {
    idx: i, L: L, time: 0, count: 0, state: 'play',
    crackBroken: {}, gatesOpen: false, targetHit: false, crackAnims: [],
    got: L.crystals.map(function () { return false; }),
    slimes: L.slimes.map(function (s) { return { x: s.x, bottom: s.bottom, y: s.bottom - 14, dir: -1, hp: 2, hurtT: 0.15, alive: true }; }),
    bats: L.bats.map(function (b) { return { x0: b.x, y0: b.y, x: b.x, y: b.y, t: 0, alive: true }; }),
    arrows: [], bolts: [], poofs: [],
    p: {
      x: L.start.x, y: L.start.y, vx: 0, vy: 0, facing: 1, cls: activeCls, onGround: false, hp: 3,
      invuln: 0, knockT: 0, knockVx: 0, hurtPose: 0, atkT: ATK_DUR[activeCls], atkCd: 0,
      skillT: dur, dashT: 0, dashDir: 1, dashHit: [], buffT: 0, airUsed: false, jumping: false, jumpHold: 0, pose: 'idle'
    },
    frames: [], ev: [], ghostRp: replays[i]
  };
}
function startLevel(i) {
  run = newRun(i); scene = 'level'; paused = false; acc = 0; clearPend();
}

// ===== 一趟的模擬(固定 1/60 秒) =====
function addGem(R, k, id, x, y) {
  R.count++;
  R.ev.push({ t: R.time, k: k, id: id, x: x, y: y });
}
function killMonster(R, m, x, y) {
  m.alive = false;
  R.poofs.push({ x: x, y: y, t: 0 });
  addGem(R, 'k', -1, x, y);
}
function hurtMonster(R, m, kind, dmg) {
  if (!m.alive) return;
  if (kind === 'slime') {
    m.hp -= dmg; m.hurtT = 0;
    if (m.hp <= 0) killMonster(R, m, m.x, m.y);
  } else {
    killMonster(R, m, m.x, m.y);
  }
}
function monsterBox(m, kind) {
  return kind === 'slime' ? [m.x - 18, m.y - 14, m.x + 18, m.y + 14] : [m.x - 16, m.y - 12, m.x + 16, m.y + 12];
}
function eachMonster(R, fn) {
  R.slimes.forEach(function (m) { if (m.alive) fn(m, 'slime'); });
  R.bats.forEach(function (m) { if (m.alive) fn(m, 'bat'); });
}
function breakGroup(R, gid, ex, ey) {
  R.L.cracks.forEach(function (k) {
    if (k.gid === gid && !R.crackBroken[k.c + ',' + k.r]) {
      R.crackBroken[k.c + ',' + k.r] = true;
      R.crackAnims.push({ x: k.x, y: k.y, t: 0 });
      R.poofs.push({ x: k.x, y: k.y, t: 0 });
    }
  });
  R.ev.push({ t: R.time, k: 'w', id: gid });
}
function sweepCracks(R, p, dx) {
  const x1 = Math.min(p.x - HW, p.x - HW + dx) - 2, x2 = Math.max(p.x + HW, p.x + HW + dx) + 2;
  R.L.cracks.forEach(function (k) {
    if (R.crackBroken[k.c + ',' + k.r]) return;
    if (overlap(x1, p.y - HH, x2, p.y + HH, k.c * T, k.r * T, k.c * T + T, k.r * T + T)) breakGroup(R, k.gid);
  });
}
function moveX(R, p, dx) {
  p.x += dx;
  const c0 = Math.floor((p.x - HW) / T), c1 = Math.floor((p.x + HW - 0.001) / T);
  const r0 = Math.floor((p.y - HH) / T), r1_ = Math.floor((p.y + HH - 0.001) / T);
  let blocked = false;
  for (let r = r0; r <= r1_; r++) {
    for (let c = c0; c <= c1; c++) {
      if (solidAt(R, c, r)) {
        if (dx > 0) p.x = Math.min(p.x, c * T - HW);
        else if (dx < 0) p.x = Math.max(p.x, (c + 1) * T + HW);
        blocked = true;
      }
    }
  }
  return blocked;
}
function moveY(R, p, dy) {
  p.y += dy;
  const c0 = Math.floor((p.x - HW) / T), c1 = Math.floor((p.x + HW - 0.001) / T);
  const r0 = Math.floor((p.y - HH) / T), r1_ = Math.floor((p.y + HH - 0.001) / T);
  p.onGround = false;
  for (let r = r0; r <= r1_; r++) {
    for (let c = c0; c <= c1; c++) {
      if (solidAt(R, c, r)) {
        if (dy > 0) { p.y = Math.min(p.y, r * T - HH); p.onGround = true; p.airUsed = false; p.vy = 0; }
        else if (dy < 0) { p.y = Math.max(p.y, (r + 1) * T + HH); p.vy = 0; }
      }
    }
  }
}
function doAttack(R, p) {
  p.atkT = 0; p.atkCd = ATK_CD[p.cls];
  if (p.cls === 'sword') {
    const x1 = p.facing > 0 ? p.x + HW : p.x - HW - 50;
    const x2 = x1 + 50;
    eachMonster(R, function (m, kind) {
      const b = monsterBox(m, kind);
      if (overlap(x1, p.y - 20, x2, p.y + 20, b[0], b[1], b[2], b[3])) hurtMonster(R, m, kind, 1);
    });
  } else if (p.cls === 'archer') {
    R.arrows.push({ x: p.x + p.facing * 18, y: p.y - 4, dir: p.facing, dist: 0 });
  } else {
    R.bolts.push({ x: p.x + p.facing * 16, y: p.y - 4, dir: p.facing, dist: 0, t: 0, hit: [] });
  }
}
function doSkill(R, p) {
  if (p.cls === 'mage') {
    if (!p.onGround && !p.airUsed) { p.vy = -720; p.airUsed = true; p.jumping = false; }
    return;
  }
  if (p.skillT < SK_DUR[p.cls]) return;
  p.skillT = 0;
  if (p.cls === 'sword') { p.dashT = 0.2; p.dashDir = p.facing; p.dashHit = []; }
  else p.buffT = 2;
}
function playerHurt(R, p, fromX) {
  p.hp -= 1; p.invuln = 1; p.knockT = 0.12; p.hurtPose = 0.3;
  const d = p.x < fromX ? -1 : 1;
  p.knockVx = d * 80 / 0.12;
  if (p.hp <= 0) R.state = 'fail';
}
function pickPose(p, dir) {
  if (p.hurtPose > 0) return 'hurt';
  if (p.dashT > 0) return 'dash';
  if (!p.onGround) return p.vy < 0 ? 'rise' : 'fall';
  return dir !== 0 ? 'run' : 'idle';
}

function stepRun() {
  const R = run, p = R.p;
  const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  R.time += STEP;
  p.atkT = Math.min(p.atkT + STEP, ATK_DUR[p.cls]);
  p.atkCd = Math.max(0, p.atkCd - STEP);
  p.skillT = Math.min(p.skillT + STEP, SK_DUR[p.cls]);
  p.invuln = Math.max(0, p.invuln - STEP);
  p.hurtPose = Math.max(0, p.hurtPose - STEP);
  p.buffT = Math.max(0, p.buffT - STEP);

  if (pend.atk) { pend.atk = false; if (p.atkCd <= 0 && p.dashT <= 0) doAttack(R, p); }
  if (pend.skill) { pend.skill = false; doSkill(R, p); }
  if (pend.jump) {
    pend.jump = false;
    if (p.onGround && p.dashT <= 0) { p.vy = -720; p.jumping = true; p.jumpHold = 0; p.onGround = false; }
  }
  if (p.jumping) {
    if (held.z) { p.jumpHold += STEP; if (p.jumpHold >= 0.15) p.jumping = false; }
    else { if (p.jumpHold < 0.15 && p.vy < 0) p.vy *= 0.5; p.jumping = false; }
  }

  const dashing = p.dashT > 0;
  const spd = 260 * (1 + 0.1 * boots + (p.buffT > 0 ? 0.6 : 0));
  let vx;
  if (dashing) { vx = p.dashDir * 800; p.facing = p.dashDir; p.vy = 0; }
  else if (p.knockT > 0) { vx = p.knockVx; p.knockT -= STEP; }
  else { vx = dir * spd; if (dir) p.facing = dir; }
  let dyMove = 0;
  if (dashing) dyMove = 0;
  else { const vo = p.vy; p.vy = Math.min(p.vy + 2400 * STEP, 1100); dyMove = (vo + p.vy) / 2 * STEP; }

  if (dashing) sweepCracks(R, p, vx * STEP);
  const blocked = moveX(R, p, vx * STEP);
  moveY(R, p, dyMove);
  if (dashing) {
    p.dashT -= STEP;
    if (blocked) p.dashT = 0;
    if (p.dashT < 1e-9) p.dashT = 0;
  }
  p.pose = pickPose(p, dir);

  // 尖刺 / 掉出畫面
  const L = R.L;
  for (let i = 0; i < L.spikes.length; i++) {
    const s = L.spikes[i];
    if (overlap(p.x - HW, p.y - HH, p.x + HW, p.y + HH, s.c * T, s.r * T + 20, s.c * T + T, s.r * T + T)) { R.state = 'fail'; return; }
  }
  if (p.y > H) { R.state = 'fail'; return; }

  // 晶石
  L.crystals.forEach(function (cr) {
    if (R.got[cr.id]) return;
    if (overlap(p.x - HW, p.y - HH, p.x + HW, p.y + HH, cr.x - 12, cr.y - 12, cr.x + 12, cr.y + 12)) {
      R.got[cr.id] = true; addGem(R, 'c', cr.id, cr.x, cr.y);
    }
  });

  // 衝刺斬傷害
  if (p.dashT > 0 || dashing) {
    eachMonster(R, function (m, kind) {
      if (p.dashHit.indexOf(m) >= 0) return;
      const b = monsterBox(m, kind);
      if (overlap(p.x - HW, p.y - HH, p.x + HW, p.y + HH, b[0], b[1], b[2], b[3])) { p.dashHit.push(m); hurtMonster(R, m, kind, 2); }
    });
  }

  // 怪物
  R.slimes.forEach(function (m) {
    if (!m.alive) return;
    m.hurtT = Math.min(m.hurtT + STEP, 0.15);
    const nx = m.x + m.dir * 60 * STEP, fx = nx + m.dir * 18;
    const c = Math.floor(fx / T);
    const rowBody = Math.floor((m.bottom - 14) / T), rowBelow = Math.floor((m.bottom + 1) / T);
    if (solidAt(R, c, rowBody) || !solidAt(R, c, rowBelow)) m.dir = -m.dir; else m.x = nx;
  });
  R.bats.forEach(function (m) {
    if (!m.alive) return;
    m.t += STEP;
    m.x = m.x0 + 60 * Math.sin(2 * Math.PI * m.t / 3);
    m.y = m.y0 + 40 * Math.sin(2 * Math.PI * m.t / 2);
  });

  // 飛行物
  const keepA = [];
  R.arrows.forEach(function (a) {
    a.x += a.dir * 600 * STEP; a.dist += 600 * STEP;
    const c = Math.floor((a.x + a.dir * 12) / T), r = Math.floor(a.y / T);
    if (a.dist >= 600) return;
    if (solidAt(R, c, r)) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && L.g[r][c] === 'T' && !R.targetHit) {
        R.targetHit = true; R.gatesOpen = true; R.ev.push({ t: R.time, k: 't', id: 0 });
      }
      return;
    }
    let dead = false;
    eachMonster(R, function (m, kind) {
      if (dead) return;
      const b = monsterBox(m, kind);
      if (overlap(a.x - 12, a.y - 3, a.x + 12, a.y + 3, b[0], b[1], b[2], b[3])) { dead = true; hurtMonster(R, m, kind, 1); }
    });
    if (!dead) keepA.push(a);
  });
  R.arrows = keepA;
  const keepB = [];
  R.bolts.forEach(function (b) {
    b.x += b.dir * 400 * STEP; b.dist += 400 * STEP; b.t += STEP;
    if (b.dist >= 400) return;
    if (solidAt(R, Math.floor((b.x + b.dir * 8) / T), Math.floor(b.y / T))) return;
    eachMonster(R, function (m, kind) {
      if (b.hit.indexOf(m) >= 0) return;
      const bb = monsterBox(m, kind);
      if (overlap(b.x - 8, b.y - 8, b.x + 8, b.y + 8, bb[0], bb[1], bb[2], bb[3])) { b.hit.push(m); hurtMonster(R, m, kind, 1); }
    });
    keepB.push(b);
  });
  R.bolts = keepB;

  // 特效計時
  R.poofs.forEach(function (f) { f.t += STEP; });
  R.poofs = R.poofs.filter(function (f) { return f.t < 0.3; });
  R.crackAnims.forEach(function (f) { f.t += STEP; });
  R.crackAnims = R.crackAnims.filter(function (f) { return f.t < 0.3; });

  // 怪物碰撞
  if (p.invuln <= 0 && p.dashT <= 0 && !dashing) {
    let hit = null;
    eachMonster(R, function (m, kind) {
      if (hit) return;
      const b = monsterBox(m, kind);
      if (overlap(p.x - HW, p.y - HH, p.x + HW, p.y + HH, b[0], b[1], b[2], b[3])) hit = m;
    });
    if (hit) playerHurt(R, p, hit.x);
  }
  if (R.state === 'fail') return;

  // 錄影
  R.frames.push({ x: p.x, y: p.y, c: p.cls, f: p.facing, p: p.pose, a: p.atkT });

  // 終點
  if (overlap(p.x - HW, p.y - HH, p.x + HW, p.y + HH, L.flag.x - 20, L.flag.y - 40, L.flag.x + 20, L.flag.y + 40)) {
    R.state = 'clear';
  }
}

function finishRun() {
  const R = run, n = R.frames.length, time = n * STEP;
  const rate = R.count / time * 60;
  const old = replays[R.idx];
  let result;
  if (!old) result = 'first';
  else if (rate > old.rate) result = 'record';
  else result = 'kept';
  const oldRate = old ? old.rate : null;
  if (result !== 'kept') {
    replays[R.idx] = { cls: R.p.cls, n: n, time: time, count: R.count, rate: rate, frames: R.frames, ev: R.ev.slice() };
    rt[R.idx] = 0;
  }
  stock += R.count;
  resultInfo = { time: time, count: R.count, rate: rate, oldRate: oldRate, result: result };
  scene = 'result';
}

// ===== 回放 =====
function isGemEv(e) { return e.k === 'c' || e.k === 'k'; }
function fireEvents(i, rp, from, to, sceneIsMap) {
  for (let k = 0; k < rp.ev.length; k++) {
    const e = rp.ev[k];
    if (!isGemEv(e)) continue;
    if (e.t > from && e.t <= to) {
      stock++;
      if (sceneIsMap) popups.push({ x: CARD_LEVEL[i][0] + 8 + e.x * 0.3 - 20, y: CARD_LEVEL[i][1] + 8 + e.y * 0.3 - 12, t: 0 });
    }
  }
}
function advanceReplay(i, dt) {
  const rp = replays[i];
  if (!rp) return;
  let a = rt[i], b = a + dt;
  const isMap = scene === 'map';
  let guard = 0;
  while (b >= rp.time && guard++ < 10) {
    fireEvents(i, rp, a, rp.time, isMap);
    b -= rp.time; a = 0;
  }
  fireEvents(i, rp, a, b, isMap);
  rt[i] = b;
}
function incomePerMin() {
  let s = 0;
  for (let i = 0; i < 3; i++) if (replays[i]) s += replays[i].rate;
  return s;
}

// ===== 輸入(只有鍵盤) =====
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyZ: 'z', KeyX: 'x', Space: 'space', Escape: 'esc'
};
function keyName(e) {
  if (KEYMAP[e.code]) return KEYMAP[e.code];
  switch (e.key) {
    case 'ArrowLeft': return 'left'; case 'ArrowRight': return 'right';
    case 'ArrowUp': return 'up'; case 'ArrowDown': return 'down';
    case 'z': case 'Z': return 'z'; case 'x': case 'X': return 'x';
    case ' ': return 'space'; case 'Escape': return 'esc';
  }
  return null;
}
function rowLen(row) { return row === 0 ? 3 : row === 1 ? 4 : 1; }

function inputDown(k) {
  const before = scene + (paused ? 'P' : '');
  if (scene === 'guide') {
    if (k === 'left') guidePage = Math.max(0, guidePage - 1);
    else if (k === 'right') guidePage = Math.min(GUIDE_TEXT.length - 1, guidePage + 1);
    else if (k === 'z') {
      if (guidePage < GUIDE_TEXT.length - 1) guidePage++;
      else { scene = 'map'; guideFrom = 'map'; }
    }
  } else if (k === 'esc') {
    if (scene === 'map' || scene === 'level') paused = !paused;
  } else if (paused) {
    if (scene === 'level') {
      if (k === 'z') startLevel(run.idx);
      else if (k === 'x') { paused = false; scene = 'map'; }
    }
  } else if (scene === 'map') {
    if (k === 'left') sel.col = Math.max(0, sel.col - 1);
    else if (k === 'right') sel.col = Math.min(rowLen(sel.row) - 1, sel.col + 1);
    else if (k === 'up') { if (sel.row > 0) { sel.row--; sel.col = sel.row === 0 ? Math.min(sel.col, 2) : 0; } }
    else if (k === 'down') { if (sel.row < 2) { sel.row++; sel.col = sel.row === 2 ? 0 : Math.min(sel.col, 3); } }
    else if (k === 'space') { scene = 'guide'; guidePage = 0; guideFrom = 'map'; }
    else if (k === 'z') mapConfirm();
  } else if (scene === 'level') {
    if (k === 'z') pend.jump = true;
    else if (k === 'x') pend.atk = true;
    else if (k === 'space') pend.skill = true;
  } else if (scene === 'result') {
    if (k === 'z') scene = 'map';
    else if (k === 'x') startLevel(run.idx);
  } else if (scene === 'fail') {
    if (k === 'z') startLevel(run.idx);
    else if (k === 'x') scene = 'map';
  } else if (scene === 'ending') {
    if (k === 'z') resetAll();
  }
  if (before !== scene + (paused ? 'P' : '')) clearPend();
}

function mapConfirm() {
  if (sel.row === 0) {
    const i = sel.col;
    if (levelUnlocked[i]) startLevel(i);
    else if (stock >= LEVEL_COST[i]) { stock -= LEVEL_COST[i]; levelUnlocked[i] = true; }
  } else if (sel.row === 1) {
    if (sel.col < 3) {
      const cls = ['sword', 'archer', 'mage'][sel.col];
      if (owned[cls]) activeCls = cls;
      else if (stock >= CLASS_COST[cls]) { stock -= CLASS_COST[cls]; owned[cls] = true; }
    } else if (boots < 3 && stock >= BOOT_COST[boots]) { stock -= BOOT_COST[boots]; boots++; }
  } else if (stock >= GOAL_COST) {
    stock -= GOAL_COST; scene = 'ending';
  }
}

window.addEventListener('keydown', function (e) {
  const k = keyName(e);
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  if (k === 'left') held.left = true;
  else if (k === 'right') held.right = true;
  else if (k === 'z') held.z = true;
  inputDown(k);
});
window.addEventListener('keyup', function (e) {
  const k = keyName(e);
  if (!k) return;
  e.preventDefault();
  if (k === 'left') held.left = false;
  else if (k === 'right') held.right = false;
  else if (k === 'z') held.z = false;
});
window.addEventListener('blur', function () { held.left = held.right = held.z = false; });

// ===== 畫布縮放 =====
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
function resize() {
  const cw = window.innerWidth || W, ch = window.innerHeight || H;
  const s = Math.min(cw / W, ch / H);
  const cssW = Math.max(1, Math.floor(W * s)), cssH = Math.max(1, Math.floor(H * s));
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// ===== 更新 =====
function update(dt) {
  gt += dt;
  if (paused || scene === 'guide' || scene === 'ending') return;
  playTime += dt;
  if (scene === 'level') {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && scene === 'level' && run.state === 'play' && guard++ < 10) {
      stepRun(); acc -= STEP;
      if (run.state === 'clear') { finishRun(); }
      else if (run.state === 'fail') { scene = 'fail'; }
    }
  }
  for (let i = 0; i < 3; i++) advanceReplay(i, dt);
  popups.forEach(function (p) { p.t += dt; });
  popups = popups.filter(function (p) { return p.t < 0.8; });
}

// ===== 繪製 =====
function text(str, x, y, size, color, align, weight) {
  ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
  ctx.fillStyle = color || '#fff';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}
function ghostState(f) {
  return { x: f.x, y: f.y, cls: f.c, facing: f.f, pose: f.p, attackT: f.a, attackDur: ATK_DUR[f.c] };
}
function drawThumb(i, cx, cy) {
  const L = LEVELS[i], rp = replays[i], t = rt[i];
  ctx.save();
  ctx.beginPath(); ctx.rect(cx + 8, cy + 8, 384, 216); ctx.clip();
  ctx.translate(cx + 8, cy + 8); ctx.scale(0.3, 0.3);
  const got = {}, broke = {};
  let hit = false;
  if (rp) {
    rp.ev.forEach(function (e) {
      if (e.t > t) return;
      if (e.k === 'c') got[e.id] = true;
      else if (e.k === 'w') broke[e.id] = true;
      else if (e.k === 't') hit = true;
    });
  }
  Art.drawBackground(ctx, {});
  L.grounds.forEach(function (g) { Art.drawGround(ctx, { x: g.x, y: g.y, top: g.top }); });
  L.spikes.forEach(function (s) { Art.drawSpike(ctx, { x: s.x, y: s.y }); });
  L.cracks.forEach(function (k) { if (!broke[k.gid]) Art.drawCrackWall(ctx, { x: k.x, y: k.y, broken: false, breakT: 0.3, breakDur: 0.3 }); });
  if (L.target) Art.drawTarget(ctx, { x: L.target.x, y: L.target.y, hit: hit });
  if (!hit) L.gates.forEach(function (g) { Art.drawGate(ctx, { x: g.x, y: g.y }); });
  L.crystals.forEach(function (c) { if (!got[c.id]) Art.drawCrystal(ctx, { x: c.x, y: c.y, t: gt }); });
  Art.drawGoal(ctx, { x: L.flag.x, y: L.flag.y, reached: false });
  if (rp) {
    const fi = Math.min(rp.n - 1, Math.floor(t * 60));
    Art.drawGhost(ctx, ghostState(rp.frames[fi]));
  }
  ctx.restore();
}
function drawLevelScene() {
  const R = run, L = R.L, p = R.p;
  Art.drawBackground(ctx, {});
  L.grounds.forEach(function (g) { Art.drawGround(ctx, { x: g.x, y: g.y, top: g.top }); });
  L.spikes.forEach(function (s) { Art.drawSpike(ctx, { x: s.x, y: s.y }); });
  L.cracks.forEach(function (k) {
    if (!R.crackBroken[k.c + ',' + k.r]) Art.drawCrackWall(ctx, { x: k.x, y: k.y, broken: false, breakT: 0.3, breakDur: 0.3 });
  });
  R.crackAnims.forEach(function (a) { Art.drawCrackWall(ctx, { x: a.x, y: a.y, broken: true, breakT: a.t, breakDur: 0.3 }); });
  if (L.target) Art.drawTarget(ctx, { x: L.target.x, y: L.target.y, hit: R.targetHit });
  if (!R.gatesOpen) L.gates.forEach(function (g) { Art.drawGate(ctx, { x: g.x, y: g.y }); });
  L.crystals.forEach(function (c) { if (!R.got[c.id]) Art.drawCrystal(ctx, { x: c.x, y: c.y, t: gt }); });
  Art.drawGoal(ctx, { x: L.flag.x, y: L.flag.y, reached: R.state === 'clear' });
  const grp = R.ghostRp;
  if (grp && R.frames.length <= grp.n) {
    const fi = Math.max(0, Math.min(grp.n - 1, R.frames.length - 1));
    Art.drawGhost(ctx, ghostState(grp.frames[fi]));
  }
  R.slimes.forEach(function (m) {
    if (m.alive) Art.drawSlime(ctx, { x: m.x, y: m.y, facing: m.dir, hp: m.hp, maxHp: 2, hurtT: m.hurtT, hurtDur: 0.15 });
  });
  R.bats.forEach(function (m) { if (m.alive) Art.drawBat(ctx, { x: m.x, y: m.y, t: gt }); });
  R.arrows.forEach(function (a) { Art.drawArrow(ctx, { x: a.x, y: a.y, dir: a.dir }); });
  R.bolts.forEach(function (b) { Art.drawMagicBolt(ctx, { x: b.x, y: b.y, t: b.t }); });
  const flick = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 1;
  if (!flick) {
    Art.drawPlayer(ctx, {
      x: p.x, y: p.y, cls: p.cls, facing: p.facing, pose: p.pose,
      attackT: p.atkT, attackDur: ATK_DUR[p.cls], invuln: p.invuln > 0
    });
  }
  R.poofs.forEach(function (f) { Art.drawPoof(ctx, { x: f.x, y: f.y, t: f.t, dur: 0.3 }); });
}
function drawLevelHud() {
  const R = run, p = R.p, rp = replays[R.idx];
  Art.drawHud(ctx, {
    mode: 'level', stock: stock, incomePerMin: r1(incomePerMin()), time: r1(R.time), runCount: R.count,
    recordRate: rp ? r1(rp.rate) : null, hp: p.hp, maxHp: 3,
    skillCdT: p.cls === 'mage' ? 1 : p.skillT, skillCdDur: p.cls === 'mage' ? 1 : SK_DUR[p.cls], cls: p.cls
  });
}
function drawMapScene() {
  Art.drawMapBackground(ctx, {});
  for (let i = 0; i < 3; i++) {
    const rp = replays[i];
    const st = !levelUnlocked[i] ? 'locked' : (rp ? 'cleared' : 'open');
    Art.drawLevelCard(ctx, {
      x: CARD_LEVEL[i][0], y: CARD_LEVEL[i][1], index: i + 1, name: LEVEL_NAME[i], state: st,
      rate: rp ? r1(rp.rate) : null, recordCls: rp ? rp.cls : null, cost: LEVEL_COST[i],
      canAfford: stock >= LEVEL_COST[i], selected: sel.row === 0 && sel.col === i
    });
    if (st !== 'locked') drawThumb(i, CARD_LEVEL[i][0], CARD_LEVEL[i][1]);
  }
  ['sword', 'archer', 'mage'].forEach(function (cls, i) {
    const st = !owned[cls] ? 'locked' : (activeCls === cls ? 'active' : 'owned');
    Art.drawClassCard(ctx, {
      x: CARD_CLASS[i][0], y: CARD_CLASS[i][1], cls: cls, name: CLS_NAME[cls], state: st,
      cost: CLASS_COST[cls], canAfford: stock >= CLASS_COST[cls], selected: sel.row === 1 && sel.col === i
    });
  });
  const bc = boots < 3 ? BOOT_COST[boots] : null;
  Art.drawUpgradeCard(ctx, {
    x: CARD_BOOT[0], y: CARD_BOOT[1], level: boots, maxLevel: 3, cost: bc,
    canAfford: bc !== null && stock >= bc, selected: sel.row === 1 && sel.col === 3
  });
  Art.drawGoalCard(ctx, {
    x: CARD_GOAL[0], y: CARD_GOAL[1], cost: GOAL_COST, canAfford: stock >= GOAL_COST, selected: sel.row === 2
  });
  popups.forEach(function (p) { Art.drawPopup(ctx, { x: p.x, y: p.y, t: p.t, dur: 0.8, value: 1 }); });
  Art.drawHud(ctx, {
    mode: 'map', stock: stock, incomePerMin: r1(incomePerMin()), time: null, runCount: null,
    recordRate: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null
  });
  text('← → 選擇    ↑ ↓ 換列    Z 確定    空白鍵 說明    Esc 暫停', W / 2, 685, 22, '#ffffff', 'center', 'normal');
}
function drawGuideScene() {
  Art.drawMapBackground(ctx, {});
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  const fr = GUIDE_FRAME[guidePage];
  const x = Math.round((W - fr.w) / 2), y = 120;
  text(GUIDE_TEXT[guidePage][0], W / 2, 70, 48, '#ffe27a');
  Art.drawGuidePage(ctx, { page: guidePage + 1, x: x, y: y, w: fr.w, h: fr.h });
  text(GUIDE_TEXT[guidePage][1], W / 2, 585, 36, '#ffffff');
  const last = guidePage === GUIDE_TEXT.length - 1;
  text('第 ' + (guidePage + 1) + ' / ' + GUIDE_TEXT.length + ' 頁    ← → 翻頁    Z ' + (last ? (guideFrom === 'start' ? '開始' : '關閉') : '下一頁'),
    W / 2, 670, 24, '#cccccc', 'center', 'normal');
}
function render() {
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (scene === 'guide') { drawGuideScene(); return; }
  if (scene === 'map' || scene === 'ending') {
    drawMapScene();
    if (scene === 'ending') Art.drawEndingPanel(ctx, { totalTime: playTime });
    else if (paused) Art.drawPausePanel(ctx, { mode: 'map' });
    return;
  }
  drawLevelScene();
  drawLevelHud();
  if (scene === 'result') Art.drawResultPanel(ctx, resultInfo);
  else if (scene === 'fail') Art.drawFailPanel(ctx, {});
  else if (paused) Art.drawPausePanel(ctx, { mode: 'level' });
}

// ===== 主迴圈 =====
let lastTs = null;
function frame(ts) {
  requestAnimationFrame(frame);
  let dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, 1 / 30);
  try { update(dt); render(); } catch (err) { console.error(err); }
}
requestAnimationFrame(frame);
