'use strict';
/* 捷徑工坊 — 玩法驗證 Demo。只用鍵盤。繪製一律走 Art.drawXxx。 */
var W = Art.canvas.width, H = Art.canvas.height;
var T = 40, COLS = 32, ROWS = 18, DT = 1 / 60;
var CLS = ['sword', 'hunter', 'bomber'];
var KINDS = ['wood', 'ench', 'time'];
var LV_NAMES = ['草原', '懸崖棧道', '野豬峽谷', '蜂巢高塔', '斷橋', '盾兵要塞', '蛙沼', '王座'];
var PARENTS = { 2: [1], 3: [1], 4: [2], 5: [2], 6: [3], 7: [3], 8: [5, 6] };
var UNLOCK_COST = { 2: 20, 3: 20, 4: 50, 5: 50, 6: 50, 7: 50, 8: 100 };
var CARD_POS = [null, [40, 281], [290, 131], [290, 431], [540, 56], [540, 206], [540, 356], [540, 506], [790, 281]];
var GOAL_POS = [1040, 281];
var GOAL_COST = { wood: 200, ench: 100, time: 100 };
var CLASS_COST = { wood: 40, ench: 0, time: 0 };
var MAP_LINKS = [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [6, 8]];
var MAP_COLS = [[1], [2, 3], [4, 5, 6, 7], [8], [9]];
var HUD_TARGET = { wood: [36, 20], ench: [256, 20], time: [476, 20] };
var UNSEAL_COSTS = [0, 8, 20, 40];
var ACCEL_COST = [12, 30];
var ACCEL_MULT = [1, 1.25, 1.5];
var MONDEF = {
  boar: { hw: 24, hh: 16, hp: 3, drop: 'wood', n: 2 },
  shield: { hw: 16, hh: 22, hp: 3, drop: 'ench', n: 2 },
  bee: { hw: 16, hh: 16, hp: 1, drop: 'time', n: 1 },
  frog: { hw: 16, hh: 14, hp: 2, drop: 'wood', n: 1 }
};
var MONCH = { b: 'boar', s: 'shield', w: 'bee', f: 'frog' };

/* 佔位圖形(interface.json 沒有的): 獵人抓鉤的鉤索由 RD 畫(規格指定) */
var Placeholder = {
  hookRope: function (ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = '#d8d0b0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
};

/* ---------- 關卡資料(ASCII 地圖 + 修改清單) ----------
 骨架: 三層蛇形。A 層地面(row16 頂面 640)往右 → 右側階梯 → B 層板(row11)往左 → 左側階梯 → C 層板(row6)往右到終點。
 # 地 C 裂岩牆 ^ 尖刺 H 鉤環 1-4 機關座 P 起點 G 終點 X 寶箱 b 野豬 s 盾兵 w 蜂 f 蛙 o 木 e 齒 t 時 */
function baseRows() {
  var r = [], i, c;
  for (i = 0; i < ROWS; i++) { r.push([]); for (c = 0; c < COLS; c++) r[i].push('.'); }
  for (c = 5; c < 32; c++) r[6][c] = '#';
  for (c = 0; c < 3; c++) { r[8][c] = '#'; r[9][c] = '#'; r[10][c] = '#'; }
  r[10][3] = '#'; r[10][4] = '#';
  for (c = 0; c <= 25; c++) r[11][c] = '#';
  r[15][26] = '#'; r[15][27] = '#';
  for (i = 13; i <= 15; i++) for (c = 28; c < 32; c++) r[i][c] = '#';
  for (c = 0; c < 32; c++) { r[16][c] = '#'; r[17][c] = '#'; }
  return r;
}
var COMMON_ED = [[11, 8, '...'], [6, 21, '...'], [15, 9, '1'], [10, 22, '2'], [5, 7, '3'], [5, 26, '4'],
  [2, 9, '####'], [2, 28, '###'], [11, 10, 'H'], [15, 1, 'P'], [5, 30, 'G']];
var SPECS = [
  { theme: 'plain', cnt: { wood: 8, ench: 3, time: 2 }, chest: 'spring', ed: [
    [15, 17, 'f'], [15, 18, 'b'], [15, 19, 'f'], [5, 14, 's'], [4, 17, 'w'], [10, 15, 'X'],
    [10, 17, 't'], [10, 19, 't'], [16, 14, 'ee'], [15, 14, 'CC']] },
  { theme: 'sky', cnt: { wood: 6, ench: 2, time: 6 }, chest: 'lamp', ed: [
    [15, 14, 'f'], [15, 15, 'f'], [13, 16, 'w'], [8, 12, 'w'], [3, 16, 'w'],
    [15, 20, '^^'], [10, 12, '^^'], [2, 8, 'H'], [1, 10, 'X'], [1, 11, 't'], [1, 12, 't']] },
  { theme: 'rock', cnt: { wood: 8, ench: 6, time: 1 }, chest: 'wind', ed: [
    [15, 20, 'b'], [15, 21, 's'], [15, 22, 'b'], [10, 18, 's'], [5, 12, 'b'],
    [16, 12, 'ee'], [15, 12, 'CC'], [16, 24, 'X'], [15, 24, 'C'], [15, 17, '^'], [10, 16, '^'], [5, 16, '^']] },
  { theme: 'sky', cnt: { wood: 5, ench: 2, time: 8 }, chest: 'spring', ed: [
    [16, 14, '......'], [13, 14, 'w'], [13, 15, 'w'], [13, 16, 'w'], [3, 12, 'w'], [15, 5, 'f'], [10, 13, 'f'],
    [10, 16, '^'], [5, 15, '^^'], [2, 8, 'H'], [1, 10, 'X'], [1, 11, 't'], [1, 12, 't']] },
  { theme: 'sky', cnt: { wood: 9, ench: 2, time: 4 }, chest: 'portal', ed: [
    [16, 12, '......'], [16, 19, '......'], [16, 21, 'X'],
    [15, 5, 'b'], [10, 27, 'b'], [5, 12, 'f'], [5, 13, 'f'], [5, 14, 'f'], [4, 20, 'w'], [5, 15, '^^']] },
  { theme: 'rock', cnt: { wood: 5, ench: 8, time: 2 }, chest: 'lamp', ed: [
    [15, 18, 's'], [15, 19, 's'], [15, 20, 's'], [10, 10, 's'], [5, 19, 'b'], [3, 12, 'w'],
    [16, 3, 'ee'], [15, 3, 'CC'], [16, 14, 'ee'], [15, 14, 'CC'], [16, 22, 'ee'], [15, 22, 'CC'],
    [10, 13, '^^'], [5, 16, '^'], [5, 11, 'X']] },
  { theme: 'swamp', cnt: { wood: 7, ench: 4, time: 3 }, chest: 'wind', ed: [
    [16, 5, '^^'], [16, 13, '^^'], [16, 21, '^^'], [15, 15, 'f'], [15, 17, 'f'], [15, 19, 'f'],
    [15, 2, 'f'], [15, 24, 'f'], [10, 16, 's'], [4, 12, 'w'], [15, 17, 'f'], [15, 16, 'X']] },
  { theme: 'throne', cnt: { wood: 8, ench: 6, time: 6 }, chest: 'portal', ed: [
    [16, 13, '......'], [15, 20, 'b'], [15, 21, 's'], [15, 22, 'b'], [10, 12, 's'],
    [3, 10, 'w'], [4, 22, 'w'], [15, 24, 'f'], [10, 8, 'f'], [10, 16, '^^'], [5, 9, '^'],
    [6, 12, 'X'], [5, 12, 'C'], [2, 8, 'H'], [1, 11, 't']] }
];
/* 修正: 第 7 關(蛙沼)重複的 f 與 X 位置在 buildLevel 以後者為準 */
SPECS[6].ed = [[16, 5, '^^'], [16, 13, '^^'], [16, 21, '^^'], [16, 26, '^'],
  [15, 15, 'f'], [15, 17, 'f'], [15, 19, 'f'], [15, 2, 'f'], [15, 24, 'f'], [10, 16, 's'], [4, 12, 'w'], [15, 17, 'f']];
SPECS[6].ed[11] = [15, 18, 'X'];

function buildLevel(idx) {
  var sp = SPECS[idx], g = baseRows(), i, c, r;
  function ed(list) { list.forEach(function (e) { for (var k = 0; k < e[2].length; k++) g[e[0]][e[1] + k] = e[2][k]; }); }
  ed(COMMON_ED); ed(sp.ed);
  var L = { idx: idx + 1, theme: sp.theme, grid: new Uint8Array(ROWS * COLS), cracks: [], crackAt: {}, spikes: [], hooks: [],
    socks: [], wind: [], start: null, goal: null, chest: null, mons: [], picks: [], cells: [] };
  var have = { wood: 0, ench: 0, time: 0 };
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
    var ch = g[r][c], cx = c * T + T / 2, cy = r * T + T / 2, bot = (r + 1) * T;
    if (ch === '#') L.grid[r * COLS + c] = 1;
    else if (ch === 'C') { L.grid[r * COLS + c] = 2; L.crackAt[r * COLS + c] = L.cracks.length; L.cracks.push({ c: c, r: r, x: cx, y: cy }); }
    else if (ch === '^') L.spikes.push({ x: cx, y: cy, c: c, r: r });
    else if (ch === 'H') L.hooks.push({ x: cx, y: cy });
    else if (ch >= '1' && ch <= '4') L.socks[+ch - 1] = { c: c, r: r, x: cx, top: bot };
    else if (ch === 'P') L.start = { x: cx, y: bot - 22 };
    else if (ch === 'G') L.goal = { x: cx, y: bot - 40, bottom: bot };
    else if (ch === 'X') L.chest = { x: cx, y: bot - 18, type: sp.chest };
    else if (MONCH[ch]) { var d = MONDEF[MONCH[ch]]; L.mons.push({ k: MONCH[ch], x: cx, y: ch === 'w' ? cy : bot - d.hh, f: -1 }); }
    else if (ch === 'o' || ch === 'e' || ch === 't') { var kd = ch === 'o' ? 'wood' : ch === 'e' ? 'ench' : 'time'; have[kd]++; L.picks.push({ kind: kd, x: cx, y: bot - 16 }); }
  }
  /* 自動補素材: 依序繞著 4 座機關座(中心 200px 內至少 3 個素材) */
  var pool = [];
  KINDS.forEach(function (kd) { for (var n = have[kd]; n < sp.cnt[kd]; n++) pool.push(kd); });
  var offs = [-2, 2, -3, 3, -1, 1, -4, 4, 0];
  pool.forEach(function (kd, n) {
    for (var t = 0; t < 4; t++) {
      var s = L.socks[(n + t) % 4];
      for (var q = 0; q < offs.length; q++) {
        var cc = s.c + offs[(Math.floor(n / 4) + q) % offs.length];
        if (cc < 0 || cc >= COLS || g[s.r][cc] !== '.' || !L.grid[(s.r + 1) * COLS + cc] || L.grid[(s.r + 1) * COLS + cc] === 2) continue;
        g[s.r][cc] = 'x'; L.picks.push({ kind: kd, x: cc * T + T / 2, y: (s.r + 1) * T - 16 }); return;
      }
    }
  });
  /* 地形格(含頂面旗標) */
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) if (L.grid[r * COLS + c] === 1)
    L.cells.push({ x: c * T + T / 2, y: r * T + T / 2, top: r === 0 || !L.grid[(r - 1) * COLS + c] });
  /* 疾風帶範圍(依機關座左右各 4 格, 遇牆或斷崖截止) */
  L.socks.forEach(function (s, k) {
    var lo = s.c, hi = s.c, j;
    for (j = 1; j <= 4; j++) { var cc = s.c - j; if (cc < 0 || L.grid[s.r * COLS + cc] || !L.grid[(s.r + 1) * COLS + cc]) break; lo = cc; }
    for (j = 1; j <= 4; j++) { var cc2 = s.c + j; if (cc2 >= COLS || L.grid[s.r * COLS + cc2] || !L.grid[(s.r + 1) * COLS + cc2]) break; hi = cc2; }
    L.wind[k] = { x1: lo * T, x2: (hi + 1) * T };
  });
  return L;
}
var LEVELS = [];
for (var li = 0; li < 8; li++) LEVELS.push(buildLevel(li));

/* ---------- 整體狀態 ---------- */
var G = null;      // 整場狀態
var S = null;      // 目前這趟關卡模擬
var K = { l: false, r: false, jump: false };
var Q = { jump: false, atk: false, skill: false };

function newGame() {
  G = { mode: 'guide', gp: 0, guideReturn: 'map', paused: false, stock: { wood: 0, ench: 0, time: 0 },
    bump: { wood: 0.15, ench: 0.15, time: 0.15 }, cleared: [], open: [], owned: [true, false, false], R: [], bag: [],
    place: [], unsealed: [], accel: [], chestTaken: [], lastCls: [], cur: 1, panel: null, fly: [], total: 0, t: 0 };
  for (var i = 1; i <= 8; i++) {
    G.cleared[i] = false; G.open[i] = (i === 1); G.R[i] = null; G.place[i] = [-1, -1, -1, -1];
    G.unsealed[i] = [true, false, false, false]; G.accel[i] = 0; G.chestTaken[i] = false; G.lastCls[i] = 0;
  }
  S = null;
}
function canAfford(cost) { return G.stock.wood >= (cost.wood || 0) && G.stock.ench >= (cost.ench || 0) && G.stock.time >= (cost.time || 0); }
function spend(cost) { KINDS.forEach(function (k) { G.stock[k] -= (cost[k] || 0); }); }
function lvTypes(lv) {
  var out = [];
  for (var k = 0; k < 4; k++) { var bi = G.place[lv][k]; out.push(G.unsealed[lv][k] && bi >= 0 && G.bag[bi] ? G.bag[bi].type : null); }
  return out;
}
function isPending(lv) {
  var R = G.R[lv]; if (!R) return false;
  var t = lvTypes(lv);
  for (var k = 0; k < 4; k++) if (t[k] !== R.cfg[k]) return true;
  return false;
}
function ratesOf(lv) {
  var R = G.R[lv], m = ACCEL_MULT[G.accel[lv]];
  var r = { wood: 0, ench: 0, time: 0 };
  if (!R) return r;
  KINDS.forEach(function (k) { r[k] = Math.round(R.tot[k] / R.time * 60 * m * 10) / 10; });
  return r;
}
function totalRates() {
  var o = { wood: 0, ench: 0, time: 0 };
  for (var i = 1; i <= 8; i++) if (G.cleared[i]) { var r = ratesOf(i); KINDS.forEach(function (k) { o[k] += r[k]; }); }
  KINDS.forEach(function (k) { o[k] = Math.round(o[k] * 10) / 10; });
  return o;
}
function cardState(i) {
  if (G.cleared[i]) return 'cleared';
  if (G.open[i]) return 'open';
  var ps = PARENTS[i];
  if (ps && ps.some(function (p) { return G.cleared[p]; })) return 'buyable';
  return 'sealed';
}
function gainStock(kind, n, bump) { G.stock[kind] += n; if (bump) G.bump[kind] = 0; }

/* ---------- 碰撞工具 ---------- */
function solidCell(c, r) {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  return S.solid[r * COLS + c] > 0;
}
function boxHit(x, y, hw, hh) {
  var c0 = Math.floor((x - hw) / T), c1 = Math.floor((x + hw - 0.01) / T);
  var r0 = Math.floor((y - hh) / T), r1 = Math.floor((y + hh - 0.01) / T);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solidCell(c, r)) return true;
  return false;
}
function moveEnt(e, dx, dy) {
  var hit = { x: false, y: false };
  if (dx) {
    e.x += dx;
    if (boxHit(e.x, e.y, e.hw, e.hh)) {
      hit.x = true;
      e.x = dx > 0 ? Math.floor((e.x + e.hw) / T) * T - e.hw - 0.01 : (Math.floor((e.x - e.hw) / T) + 1) * T + e.hw + 0.01;
    }
  }
  if (dy) {
    e.y += dy;
    if (boxHit(e.x, e.y, e.hw, e.hh)) {
      hit.y = true;
      e.y = dy > 0 ? Math.floor((e.y + e.hh) / T) * T - e.hh - 0.01 : (Math.floor((e.y - e.hh) / T) + 1) * T + e.hh + 0.01;
    }
  }
  return hit;
}
function onGround(e) { return boxHit(e.x, e.y + 1, e.hw, e.hh); }
function ptSolid(x, y) { return solidCell(Math.floor(x / T), Math.floor(y / T)); }
function overlap(a, b) { return Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh; }
function distToBox(px, py, b) {
  var dx = Math.max(Math.abs(px - b.x) - b.hw, 0), dy = Math.max(Math.abs(py - b.y) - b.hh, 0);
  return Math.sqrt(dx * dx + dy * dy);
}
function cellDistTo(px, py, ck) { return distToBox(px, py, { x: ck.x, y: ck.y, hw: 20, hh: 20 }); }

/* ---------- 開始一趟 ---------- */
function startLevel(lv, cls) {
  var L = LEVELS[lv - 1];
  var types = lvTypes(lv);
  S = { lv: lv, L: L, cls: cls, tick: 0, time: 0, state: 'play', solid: new Uint8Array(L.grid), ckHp: L.cracks.map(function () { return 3; }),
    p: { x: L.start.x, y: L.start.y, vx: 0, vy: 0, hw: 14, hh: 22, f: 1, hp: 3, inv: 0, ground: false, jumping: false, jumpHold: 0,
      atkCd: 0, skCd: 0, skDur: [1.2, 0.5, 1.5][cls], autoCd: 0, portalCd: 0, bCd: 0, dashT: 0, dashUsed: false, dashHits: null,
      hooking: false, hookTx: 0, hookTy: 0, hookT: 0, act: null, actStart: 0, actEnd: 0, windT: 0, dashStart: 0 },
    mons: [], pr: [], ex: [], sw: [], po: [], tf: [], pk: [], popups: [], chainTexts: [], chain: {}, aidN: 0,
    run: { wood: 0, ench: 0, time: 0 }, gains: [], frames: [], route: [], gapNext: false,
    cfg: types.slice(), sealed: G.unsealed[lv].map(function (u) { return !u; }),
    mech: [], chestOpen: G.chestTaken[lv], item: null, notice: null, reached: false, bumpRun: false, hookLine: null };
  L.mons.forEach(function (m, i) {
    var d = MONDEF[m.k];
    var o = { id: i, k: m.k, x: m.x, y: m.y, hw: d.hw, hh: d.hh, hp: d.hp, al: true, f: Math.random() < 0.5 ? -1 : 1, vy: 0, st: m.k === 'bee' ? 'fly' : m.k === 'frog' ? 'crouch' : 'walk',
      t: 0, hitT: 0, blockT: 0, fl: null, x0: m.x, y0: m.y, ph: Math.random() * 2, cd: 1 + Math.random(), jt: 0.6 + Math.random() * 0.6, vx: 0 };
    if (m.k === 'bee') o.f = 1;
    S.mons.push(o);
  });
  L.picks.forEach(function (q) { S.pk.push({ kind: q.kind, x: q.x, y: q.y, st: 0 }); });
  for (var k = 0; k < 4; k++) {
    var s = L.socks[k];
    S.mech[k] = types[k] ? { type: types[k], k: k, x: s.x, top: s.top, bt: 0.25, ft: 0.3, lit: false, litT: 0.4 } : null;
  }
  K.l = K.r = K.jump = false; Q.jump = Q.atk = Q.skill = false;
  G.mode = 'level'; G.paused = false;
  S.winds = [];
  S.mech.forEach(function (m) { if (m && m.type === 'wind') { var w = L.wind[m.k]; S.winds.push({ x1: w.x1, x2: w.x2, top: m.top }); } });
  pushFrame();
  S.route.push({ x: S.p.x, y: S.p.y });
}

/* ---------- 得分 / 擊倒 / 傷害 ---------- */
function give(kind, n, x, y) {
  S.run[kind] += n;
  S.popups.push({ x: x, y: y, t: 0, kind: kind, value: Math.min(9, n) });
  S.gains.push({ t: S.time, kind: kind, n: n, x: x, y: y });
}
function poof(x, y) { S.po.push({ x: x, y: y, t: 0 }); }
function addChain(aid, x, y) {
  if (!aid) return;
  var n = (S.chain[aid] = (S.chain[aid] || 0) + 1);
  if (n >= 2) {
    S.chainTexts = S.chainTexts.filter(function (c) { return c.aid !== aid; });
    S.chainTexts.push({ aid: aid, x: x, y: y - 20, n: Math.min(n, 20), t: 0 });
  }
}
function killMon(m, src) {
  m.al = false; m.fl = null; poof(m.x, m.y);
  var d = MONDEF[m.k]; give(d.drop, d.n, m.x, m.y - 10);
  addChain(src.aid, m.x, m.y);
  if (src.type === 'dash') S.p.skCd = 0;
}
function damageMon(m, dmg, src) {
  if (!m.al) return false;
  if (m.k === 'shield' && !m.fl && (src.type === 'slash' || src.type === 'proj' || src.type === 'dash')) {
    var fromSide = src.type === 'proj' ? -Math.sign(src.vx) : Math.sign(S.p.x - m.x);
    var cy = src.type === 'proj' ? src.y : S.p.y;
    if (m.f === fromSide && cy >= m.y - m.hh) { m.blockT = 0.2; m.hitT = 0.1; return false; }
  }
  m.hp -= dmg; m.hitT = 0.1;
  if (m.hp <= 0) killMon(m, src);
  return true;
}
function hitCrack(idx, dmg) {
  if (S.ckHp[idx] <= 0) return;
  S.ckHp[idx] -= dmg;
  if (S.ckHp[idx] <= 0) { var ck = S.L.cracks[idx]; S.solid[ck.r * COLS + ck.c] = 0; poof(ck.x, ck.y); }
}
function breakCrack(idx) { hitCrack(idx, 99); }
function boxCracks(b, fn) {
  S.L.cracks.forEach(function (ck, i) {
    if (S.ckHp[i] > 0 && Math.abs(ck.x - b.x) < 20 + b.hw && Math.abs(ck.y - b.y) < 20 + b.hh) fn(i);
  });
}
function hurtPlayer(srcx) {
  var p = S.p;
  if (p.inv > 0 || p.dashT > 0 || S.state !== 'play') return;
  p.hp--; p.inv = 1;
  var d = Math.sign(p.x - srcx) || -p.f;
  for (var i = 0; i < 5; i++) moveEnt(p, d * 16, 0);
  setAct('hurt', 0.3);
  if (p.hp <= 0) S.state = 'fail';
}
function setAct(name, dur) { var p = S.p; p.act = name; p.actStart = S.time; p.actEnd = S.time + dur; }
function explode(x, y) {
  S.ex.push({ x: x, y: y, t: 0 });
  var aid = S.curAid;
  S.mons.forEach(function (m) { if (m.al && distToBox(x, y, m) <= 60) damageMon(m, 2, { type: 'blast', aid: aid }); });
  S.L.cracks.forEach(function (ck, i) { if (S.ckHp[i] > 0 && cellDistTo(x, y, ck) <= 60) breakCrack(i); });
}

/* ---------- 玩家 ---------- */
function nearestMon(range) {
  var best = null, bd = range, p = S.p;
  S.mons.forEach(function (m) { if (!m.al) return; var d = Math.hypot(m.x - p.x, m.y - p.y); if (d <= bd) { bd = d; best = m; } });
  return best;
}
function updPlayer(dt) {
  var p = S.p, cls = S.cls;
  p.inv = Math.max(0, p.inv - dt); p.atkCd = Math.max(0, p.atkCd - dt); p.skCd = Math.max(0, p.skCd - dt);
  p.autoCd = Math.max(0, p.autoCd - dt); p.portalCd = Math.max(0, p.portalCd - dt); p.bCd = Math.max(0, p.bCd - dt);
  var q = { jump: Q.jump, atk: Q.atk, skill: Q.skill };
  Q.jump = Q.atk = Q.skill = false;
  var dir = (K.r ? 1 : 0) - (K.l ? 1 : 0);
  if (p.dashT > 0) {
    p.dashT -= dt; p.vy = 0; p.vx = 0;
    moveEnt(p, p.f * (160 / 0.18) * dt, 0);
    var db = { x: p.x, y: p.y, hw: 18, hh: 24 };
    S.mons.forEach(function (m) {
      if (m.al && !p.dashHits['m' + m.id] && overlap(db, m)) { p.dashHits['m' + m.id] = 1; damageMon(m, 2, { type: 'dash', aid: S.curAid }); }
    });
    boxCracks(db, function (i) { if (!p.dashHits['c' + i]) { p.dashHits['c' + i] = 1; hitCrack(i, 1); } });
    if (p.dashT <= 0) p.dashT = 0;
    return;
  }
  if (p.hooking) {
    var dx = p.hookTx - p.x, dy = p.hookTy - p.y, d = Math.hypot(dx, dy), st = 700 * dt;
    p.hookT += dt;
    if (d <= st || p.hookT > 1.2) { p.x = p.hookTx; p.y = p.hookTy; p.vy = -500; p.vx = 0; p.hooking = false; p.skCd = 0.5; }
    else { p.x += dx / d * st; p.y += dy / d * st; }
    return;
  }
  var spd = cls === 2 ? 230 : 260;
  if (p.windT > 0) spd *= 1.8;
  p.vx = dir * spd; if (dir) p.f = dir;
  if (q.jump && p.ground) { p.vy = -720; p.jumping = true; p.jumpHold = 0; p.ground = false; }
  if (p.jumping) {
    if (K.jump) p.jumpHold += dt;
    else { if (p.jumpHold < 0.15 && p.vy < 0) p.vy = Math.max(p.vy, -360); p.jumping = false; }
  }
  p.vy = Math.min(1400, p.vy + 2400 * dt);
  moveEnt(p, p.vx * dt, 0);
  var hy = moveEnt(p, 0, p.vy * dt);
  if (hy.y) { if (p.vy < 0) p.jumping = false; p.vy = 0; }
  p.ground = onGround(p);
  if (p.ground) { p.dashUsed = false; if (p.vy > 0) p.vy = 0; p.jumping = p.jumping && p.vy < 0; }
  /* 疾風帶 */
  var onStrip = false;
  if (p.ground) S.winds.forEach(function (w) { if (p.x >= w.x1 && p.x <= w.x2 && Math.abs(p.y + 22 - w.top) < 3) onStrip = true; });
  if (onStrip) p.windT = 0.5; else p.windT = Math.max(0, p.windT - dt);
  /* 攻擊 / 技能 */
  if (q.atk || q.skill) S.curAid = ++S.aidN;
  if (q.atk && p.atkCd <= 0) {
    if (cls === 0) {
      p.atkCd = 0.3; setAct('slash', 0.15);
      var sb = { x: p.x + p.f * (14 + 25), y: p.y, hw: 25, hh: 20 };
      S.mons.forEach(function (m) { if (m.al && overlap(sb, m)) damageMon(m, 1, { type: 'slash', aid: S.curAid }); });
      boxCracks(sb, function (i) { hitCrack(i, 1); });
    } else if (cls === 1) {
      p.atkCd = 0.4; setAct('shoot', 0.15);
      S.pr.push({ k: 'arrow', x: p.x + p.f * 16, y: p.y, vx: 700 * p.f, vy: 0, life: 600 / 700, a: p.f > 0 ? 0 : Math.PI, t: 0, aid: S.curAid });
    } else {
      p.atkCd = 0.6; setAct('throw', 0.2);
      S.pr.push({ k: 'bomb', x: p.x + p.f * 14, y: p.y - 10, vx: 300 * p.f, vy: -500, life: 6, a: 0, t: 0, aid: S.curAid });
    }
  }
  if (q.skill && p.skCd <= 0) {
    if (cls === 0 && !p.dashUsed) {
      p.dashT = 0.18; p.dashUsed = true; p.skCd = 1.2; p.dashHits = {}; p.dashStart = S.time;
    } else if (cls === 1) {
      var best = null, bd = 220;
      S.L.hooks.forEach(function (h) { var d = Math.hypot(h.x - p.x, h.y - p.y); if (d <= bd) { bd = d; best = h; } });
      if (best) { p.hooking = true; p.hookTx = best.x; p.hookTy = best.y; p.hookT = 0; p.jumping = false; setAct('hook', 0.1); }
    } else if (cls === 2) {
      p.skCd = 1.5; setAct('wave', 0.25);
      S.sw.push({ x: p.x, y: p.y, t: 0 });
      S.mons.forEach(function (m) {
        if (m.al && distToBox(p.x, p.y, m) <= 130) {
          var dd = Math.sign(m.x - p.x) || p.f;
          if (damageMon(m, 1, { type: 'wave', aid: S.curAid }) && m.al) startFling(m, dd, S.curAid);
        }
      });
      S.L.cracks.forEach(function (ck, i) { if (S.ckHp[i] > 0 && cellDistTo(p.x, p.y, ck) <= 130) breakCrack(i); });
    }
  }
  /* 獵人自動射擊 */
  if (cls === 1 && p.autoCd <= 0) {
    var tg = nearestMon(260);
    if (tg) {
      var ax = tg.x - p.x, ay = tg.y - p.y, al = Math.hypot(ax, ay) || 1;
      S.pr.push({ k: 'arrow', x: p.x, y: p.y, vx: ax / al * 700, vy: ay / al * 700, life: 0.6, a: Math.atan2(ay, ax), t: 0, aid: ++S.aidN });
      p.autoCd = 0.6;
    }
  }
}
function startFling(m, dir, aid) { m.fl = { dir: dir, t: 0.6, hits: {}, aid: aid }; m.f = dir; }

/* ---------- 機關 ---------- */
function updMech(dt) {
  var p = S.p, L = S.L;
  S.mech.forEach(function (m) {
    if (!m) return;
    m.bt = Math.min(0.25, m.bt + dt); m.ft = Math.min(0.3, m.ft + dt); m.litT = Math.min(0.4, m.litT + dt);
    if (m.type === 'spring') {
      var padTop = m.top - 24;
      if (p.vy >= 0 && p.bCd <= 0 && !p.hooking && p.dashT <= 0 && Math.abs(p.x - m.x) < 34 && p.y + 22 >= padTop && p.y + 22 <= m.top + 2) {
        p.y = padTop - 22; p.vy = -1000; p.ground = false; p.jumping = false; p.bCd = 0.15; m.bt = 0;
      }
    } else if (m.type === 'portal') {
      var py = m.top - 40;
      if (p.portalCd <= 0 && Math.abs(p.x - m.x) < 34 && Math.abs(p.y - py) < 62) {
        S.tf.push({ x: p.x, y: p.y, t: 0 }); m.ft = 0;
        if (m.k < 3) { var nx = L.socks[m.k + 1]; p.x = nx.x; p.y = nx.top - 40 - 22; }
        else { p.x = L.goal.x - 80; p.y = L.goal.bottom - 22; }
        p.vy = 0; p.portalCd = 1; S.gapNext = true;
        S.tf.push({ x: p.x, y: p.y, t: 0 });
      }
    } else if (m.type === 'lamp' && !m.lit) {
      var ly = m.top - 24;
      if (Math.hypot(p.x - m.x, p.y - ly) <= 200) {
        m.lit = true; m.litT = 0;
        S.pk.forEach(function (q) { if (q.st === 0 && Math.hypot(q.x - m.x, q.y - ly) <= 200) q.st = 2; });
      }
    }
  });
}

/* ---------- 怪物 ---------- */
function edgeAhead(m) {
  var fx = m.x + m.f * (m.hw + 3), fy = m.y + m.hh + 4;
  return !ptSolid(fx, fy);
}
function gravMon(m, dt) {
  m.vy = Math.min(1400, m.vy + 2400 * dt);
  var h = moveEnt(m, 0, m.vy * dt);
  if (h.y) m.vy = 0;
  return h.y;
}
function updMons(dt) {
  var p = S.p;
  S.mons.forEach(function (m) {
    if (!m.al) return;
    m.hitT = Math.max(0, m.hitT - dt); m.blockT = Math.max(0, m.blockT - dt);
    if (m.fl) {
      m.st = 'flung';
      var hit = moveEnt(m, m.fl.dir * 460 * dt, 0).x;
      m.fl.t -= dt;
      S.mons.forEach(function (o) {
        if (o !== m && o.al && m.al && !m.fl.hits[o.id] && overlap(m, o)) {
          /* 同方向一起飛的不算撞擊(避免同一次震波飛出的怪互相無限對撞) */
          if (o.fl && o.fl.dir === m.fl.dir) return;
          m.fl.hits[o.id] = 1;
          if (damageMon(o, 2, { type: 'fling', aid: m.fl.aid }) && o.al) startFling(o, m.fl.dir, m.fl.aid);
        }
      });
      if (!m.al) return;
      if (hit) { var aid = m.fl.aid; m.fl = null; damageMon(m, 1, { type: 'fling', aid: aid }); }
      else if (m.fl.t <= 0) m.fl = null;
      if (!m.fl && m.al) {
        m.st = m.k === 'bee' ? 'fly' : m.k === 'frog' ? 'crouch' : 'walk'; m.t = 0; m.vy = 0; m.vx = 0;
        if (m.k === 'bee') { m.x0 = m.x; m.y0 = m.y - 16 * Math.sin(Math.PI * (S.time + m.ph)); }
      }
      return;
    }
    var dx = p.x - m.x, dy = p.y - m.y;
    if (m.k === 'boar') {
      gravMon(m, dt);
      if (m.st === 'walk') {
        var h = moveEnt(m, m.f * 80 * dt, 0);
        if (h.x || edgeAhead(m)) m.f = -m.f;
        if (Math.abs(dy) <= 40 && dx * m.f > 0 && Math.abs(dx) <= 240) { m.st = 'windup'; m.t = 0; }
      } else if (m.st === 'windup') { m.t += dt; if (m.t >= 0.5) { m.st = 'charge'; m.t = 0; } }
      else if (m.st === 'charge') {
        if (edgeAhead(m)) { m.st = 'stun'; m.t = 0; }
        else if (moveEnt(m, m.f * 420 * dt, 0).x) { m.st = 'stun'; m.t = 0; }
      } else if (m.st === 'stun') { m.t += dt; if (m.t >= 1) { m.st = 'walk'; m.t = 0; } }
    } else if (m.k === 'shield') {
      gravMon(m, dt);
      var chase = Math.abs(dx) <= 400 && Math.abs(dy) <= 120;
      if (chase) {
        var sd = Math.abs(dx) < 4 ? 0 : Math.sign(dx);
        if (sd) { m.f = sd; if (!edgeAhead(m)) moveEnt(m, sd * 40 * dt, 0); }
      } else {
        var h2 = moveEnt(m, m.f * 40 * dt, 0);
        if (h2.x || edgeAhead(m)) m.f = -m.f;
      }
      m.st = m.blockT > 0 ? 'block' : 'walk';
    } else if (m.k === 'bee') {
      if (m.st === 'fly') {
        m.x += m.f * 60 * dt;
        if (Math.abs(m.x - m.x0) >= 120 || boxHit(m.x + m.f * m.hw, m.y, 2, m.hh - 2)) { m.f = -m.f; m.x += m.f * 60 * dt * 2; }
        m.y = m.y0 + 16 * Math.sin(Math.PI * (S.time + m.ph));
        m.cd -= dt;
        if (m.cd <= 0 && Math.hypot(dx, dy) <= 400) { m.st = 'aim'; m.t = 0; m.f = dx >= 0 ? 1 : -1; }
      } else if (m.st === 'aim') {
        m.t += dt;
        if (m.t >= 0.4) {
          var l = Math.hypot(dx, dy) || 1;
          S.pr.push({ k: 'bee', x: m.x, y: m.y, vx: dx / l * 220, vy: dy / l * 220, life: 4, a: 0, t: 0 });
          m.st = 'fly'; m.cd = 1.6;
        }
      }
    } else if (m.k === 'frog') {
      var landed = gravMon(m, dt);
      if (m.st === 'jump') {
        var hh = moveEnt(m, m.vx * dt, 0);
        if (hh.x) m.vx = 0;
        if (landed || onGround(m)) { if (m.vy >= 0) { m.st = 'crouch'; m.vx = 0; m.jt = 1.2; } }
      } else {
        m.jt -= dt;
        if (m.jt <= 0) {
          var d = Math.hypot(dx, dy) <= 300 ? (Math.sign(dx) || m.f) : m.f;
          var lx = m.x + d * 120;
          if (!ptSolid(lx, m.y + m.hh + 3) || ptSolid(lx, m.y) || ptSolid(lx, m.y - 10)) d = -d;
          m.f = d; m.vx = d * 232; m.vy = -619; m.st = 'jump';
        }
      }
    }
    /* 接觸傷害 */
    if (overlap(p, m)) hurtPlayer(m.x);
  });
}

/* ---------- 飛行物 ---------- */
function updProj(dt) {
  var p = S.p, keep = [];
  S.pr.forEach(function (o) {
    o.t += dt; o.life -= dt;
    var alive = o.life > 0;
    if (o.k === 'arrow') {
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (ptSolid(o.x, o.y)) {
        var idx = S.L.crackAt[Math.floor(o.y / T) * COLS + Math.floor(o.x / T)];
        if (idx !== undefined) hitCrack(idx, 1);
        alive = false;
      }
      if (alive) S.mons.forEach(function (m) {
        if (alive && m.al && Math.abs(o.x - m.x) < m.hw + 3 && Math.abs(o.y - m.y) < m.hh + 3) { alive = false; damageMon(m, 1, { type: 'proj', vx: o.vx, y: o.y, aid: o.aid }); }
      });
    } else if (o.k === 'bomb') {
      o.vy += 2400 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
      var hitM = false;
      S.mons.forEach(function (m) { if (m.al && Math.abs(o.x - m.x) < m.hw + 8 && Math.abs(o.y - m.y) < m.hh + 8) hitM = true; });
      if (boxHit(o.x, o.y, 8, 8) || hitM || o.y > 800) { alive = false; S.curAid = o.aid; explode(o.x, o.y); }
    } else if (o.k === 'bee') {
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (ptSolid(o.x, o.y)) alive = false;
      else if (Math.abs(o.x - p.x) < 14 + 5 && Math.abs(o.y - p.y) < 22 + 5) { alive = false; hurtPlayer(o.x - o.vx * 0.01); }
    }
    if (o.x < -50 || o.x > W + 50 || o.y < -200 || o.y > H + 100) alive = false;
    if (alive) keep.push(o);
  });
  S.pr = keep;
}

/* ---------- 一趟的主更新 ---------- */
function stepLevel(dt) {
  if (S.state !== 'play') return;
  S.time += dt; S.tick++;
  updPlayer(dt);
  updMech(dt);
  updMons(dt);
  updProj(dt);
  var p = S.p, L = S.L;
  /* 素材 */
  S.pk.forEach(function (q) {
    if (q.st === 1) return;
    if (q.st === 2) {
      var dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1, st = 600 * dt;
      if (d <= st) { q.x = p.x; q.y = p.y; } else { q.x += dx / d * st; q.y += dy / d * st; }
    }
    if (Math.abs(q.x - p.x) < 14 + 12 && Math.abs(q.y - p.y) < 22 + 12) { q.st = 1; give(q.kind, 1, q.x, q.y - 12); }
  });
  /* 寶箱 */
  if (L.chest && !S.chestOpen && Math.abs(L.chest.x - p.x) < 34 && Math.abs(L.chest.y - p.y) < 40) {
    S.chestOpen = true; S.item = L.chest.type; S.notice = { type: L.chest.type, t: 0 };
  }
  /* 尖刺 / 墜落 */
  L.spikes.forEach(function (sp) {
    if (Math.abs(sp.x - p.x) < 20 + 14 && Math.abs((sp.y + 10) - p.y) < 10 + 22) S.state = 'fail';
  });
  if (p.y > H + 60) S.state = 'fail';
  /* 終點 */
  if (S.state === 'play' && Math.abs(L.goal.x - p.x) < 20 + 14 && Math.abs(L.goal.y - p.y) < 40 + 22) { S.reached = true; S.state = 'clear'; }
  /* 特效計時 */
  function adv(arr, dur) { var out = []; arr.forEach(function (e) { e.t += dt; if (e.t < dur) out.push(e); }); return out; }
  S.ex = adv(S.ex, 0.25); S.sw = adv(S.sw, 0.3); S.po = adv(S.po, 0.3); S.tf = adv(S.tf, 0.3);
  S.popups = adv(S.popups, 0.8); S.chainTexts = adv(S.chainTexts, 0.8);
  if (S.notice) { S.notice.t += dt; if (S.notice.t >= 1.5) S.notice = null; }
  /* 錄影 */
  if (S.tick % 2 === 0 || S.state !== 'play') pushFrame();
  if (S.tick % 6 === 0 && S.route.length < 600) {
    if (S.gapNext) { S.route.push({ gap: true }); S.gapNext = false; }
    S.route.push({ x: p.x, y: p.y });
  }
  if (S.state === 'clear') finishLevel();
}
function curPose() {
  var p = S.p;
  if (p.dashT > 0) return 'dash';
  if (p.hooking) return 'hook';
  if (S.time < p.actEnd) return p.act;
  if (!p.ground) return p.vy < 0 ? 'rise' : 'fall';
  return Math.abs(p.vx) > 1 ? 'run' : 'idle';
}
function pushFrame() { S.frames.push(snap()); }
function snap() {
  var p = S.p, pose = curPose();
  var poseT = pose === 'dash' ? S.time - p.dashStart : (S.time < p.actEnd && pose === p.act) ? S.time - p.actStart : S.time;
  var F = { p: { x: p.x, y: p.y, cls: CLS[S.cls], f: p.f, pose: pose, poseT: poseT, inv: p.inv > 0 && Math.floor(S.time * 20) % 2 === 0, wind: p.windT > 0 },
    m: S.mons.map(function (m) { return { x: m.x, y: m.y, f: m.f, st: m.st, hit: m.hitT > 0, al: m.al }; }),
    pr: S.pr.map(function (o) { return { k: o.k, x: o.x, y: o.y, a: o.k === 'arrow' ? o.a : 0, t: o.t }; }),
    ex: S.ex.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }), sw: S.sw.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    po: S.po.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }), tf: S.tf.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    pk: S.pk.map(function (q) { return q.st; }), sk: [], ck: S.ckHp.slice(), chest: S.chestOpen, goal: S.reached,
    mc: S.mech.map(function (m) { return m ? [m.bt, m.ft, m.lit, m.litT] : null; }) };
  S.pk.forEach(function (q, i) { if (q.st === 2) F.sk.push({ i: i, x: q.x, y: q.y }); });
  return F;
}

/* ---------- 結算 / 回放 ---------- */
function r1(v) { return Math.round(v * 10) / 10; }
function runRates(run, time, lv) {
  var m = ACCEL_MULT[G.accel[lv]], o = {};
  KINDS.forEach(function (k) { o[k] = r1(run[k] / time * 60 * m); });
  return o;
}
function finishLevel() {
  var lv = S.lv;
  S.time = Math.max(S.time, 0.1);
  KINDS.forEach(function (k) { gainStock(k, S.run[k], true); });
  if (S.item && !G.chestTaken[lv]) { G.chestTaken[lv] = true; G.bag.push({ type: S.item }); }
  var nr = { frames: S.frames, gains: S.gains, time: S.time, cls: CLS[S.cls], clsIdx: S.cls, cfg: S.cfg, sealed: S.sealed,
    tot: { wood: S.run.wood, ench: S.run.ench, time: S.run.time }, route: S.route, t: 0, gi: 0 };
  S.newR = nr; S.oldR = G.R[lv]; S.first = !G.R[lv];
  if (S.first) G.R[lv] = nr;
  G.cleared[lv] = true;
  S.state = 'result';
}
function leaveLevel() { S = null; G.mode = 'map'; G.paused = false; K.l = K.r = K.jump = false; }
function triggerGain(lv, g) {
  if (G.mode === 'map' && !G.panel) {
    var pos = CARD_POS[lv], cnt = Math.min(5, g.n);
    for (var i = 0; i < cnt; i++) {
      var val = (i === cnt - 1) ? g.n - (cnt - 1) : 1;
      G.fly.push({ kind: g.kind, x0: pos[0] + 8 + g.x * 0.125 + (Math.random() * 12 - 6), y0: pos[1] + 8 + g.y * 0.125 + (Math.random() * 12 - 6), t: 0, val: val });
    }
  } else gainStock(g.kind, g.n, true);
}
function updReplay(dt) {
  for (var lv = 1; lv <= 8; lv++) {
    var R = G.R[lv];
    if (!R || !G.cleared[lv]) continue;
    R.t += dt * ACCEL_MULT[G.accel[lv]];
    var guard = 0;
    while (guard++ < 8) {
      while (R.gi < R.gains.length && R.gains[R.gi].t <= R.t) { triggerGain(lv, R.gains[R.gi]); R.gi++; }
      if (R.t >= R.time) { R.t -= R.time; R.gi = 0; if (R.time < 0.05) break; } else break;
    }
  }
  var keep = [];
  G.fly.forEach(function (f) { f.t += dt; if (f.t >= 0.7) gainStock(f.kind, f.val, true); else keep.push(f); });
  G.fly = keep;
  KINDS.forEach(function (k) { G.bump[k] = Math.min(0.15, G.bump[k] + dt); });
}
function rframe(R) { return R.frames[Math.min(R.frames.length - 1, Math.floor(R.t * 30))]; }

/* ---------- 場景繪製(關卡內 / 縮圖 / 預覽共用) ---------- */
function drawScene(ctx, F, L, cfg, sealed, o) {
  var tt = o.t, i;
  Art.drawBackground(ctx);
  L.cells.forEach(function (c) { Art.drawGround(ctx, { x: c.x, y: c.y, top: c.top, theme: L.theme }); });
  L.cracks.forEach(function (ck, j) { if (F.ck[j] > 0) Art.drawCrackWall(ctx, { x: ck.x, y: ck.y, hp: F.ck[j] }); });
  L.spikes.forEach(function (s) { Art.drawSpike(ctx, { x: s.x, y: s.y }); });
  L.hooks.forEach(function (h) { Art.drawHookRing(ctx, { x: h.x, y: h.y }); });
  L.socks.forEach(function (s, k) {
    Art.drawSocket(ctx, { x: s.x, y: s.top - 6, sealed: sealed[k] });
    var ty = cfg[k], mc = F.mc[k];
    if (ty === 'wind') Art.drawWindStrip(ctx, { x1: L.wind[k].x1, x2: L.wind[k].x2, y: s.top - 8, t: tt });
    if (ty === 'spring') Art.drawSpringPad(ctx, { x: s.x, y: s.top - 12, bounceT: mc ? mc[0] : 0.25, bounceDur: 0.25 });
    if (ty === 'portal') Art.drawPortal(ctx, { x: s.x, y: s.top - 40, flashT: mc ? mc[1] : 0.3, flashDur: 0.3, t: tt });
    if (ty === 'lamp') Art.drawLamp(ctx, { x: s.x, y: s.top - 24, lit: mc ? mc[2] : false, litT: mc ? mc[3] : 0.4, litDur: 0.4, radius: o.thumb ? 0 : 200 });
  });
  if (L.chest) Art.drawChest(ctx, { x: L.chest.x, y: L.chest.y, open: F.chest });
  Art.drawGoal(ctx, { x: L.goal.x, y: L.goal.y, reached: F.goal });
  L.picks.forEach(function (q, j) { if (F.pk[j] === 0) Art.drawPickup(ctx, { x: q.x, y: q.y, kind: q.kind, t: tt }); });
  F.sk.forEach(function (s) { Art.drawPickup(ctx, { x: s.x, y: s.y, kind: L.picks[s.i].kind, t: tt }); });
  F.m.forEach(function (m, j) {
    if (!m.al) return;
    var k = L.mons[j].k, st = { x: m.x, y: m.y, facing: m.f, state: m.st, hit: m.hit, t: tt };
    if (k === 'boar') Art.drawBoar(ctx, st);
    else if (k === 'shield') Art.drawShieldman(ctx, st);
    else if (k === 'bee') Art.drawShooterBee(ctx, st);
    else Art.drawFrog(ctx, { x: m.x, y: m.y, facing: m.f, state: m.st, hit: m.hit });
  });
  F.pr.forEach(function (o2) {
    if (o2.k === 'arrow') Art.drawArrow(ctx, { x: o2.x, y: o2.y, angle: o2.a });
    else if (o2.k === 'bomb') Art.drawBomb(ctx, { x: o2.x, y: o2.y, t: o2.t });
    else Art.drawBeeShot(ctx, { x: o2.x, y: o2.y });
  });
  if (F.p) {
    if (o.live && F.p.cls === 'hunter') Art.drawRangeRing(ctx, { x: F.p.x, y: F.p.y, radius: 260 });
    Art.drawPlayer(ctx, { x: F.p.x, y: F.p.y, cls: F.p.cls, facing: F.p.f, pose: F.p.pose, poseT: F.p.poseT, invuln: F.p.inv, windBoost: F.p.wind });
  }
  F.tf.forEach(function (e) { Art.drawTeleportFlash(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.3 }); });
  F.po.forEach(function (e) { Art.drawPoof(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.3 }); });
  F.ex.forEach(function (e) { Art.drawExplosion(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.25, radius: 60 }); });
  F.sw.forEach(function (e) { Art.drawShockwave(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.3, radius: 130 }); });
}
function previewFrame(lv) {
  var L = LEVELS[lv - 1], types = lvTypes(lv);
  return { p: null, m: L.mons.map(function (m) { return { x: m.x, y: m.y, f: -1, st: m.k === 'bee' ? 'fly' : m.k === 'frog' ? 'crouch' : 'walk', hit: false, al: true }; }),
    pr: [], ex: [], sw: [], po: [], tf: [], pk: L.picks.map(function () { return 0; }), sk: [], ck: L.cracks.map(function () { return 3; }),
    chest: G.chestTaken[lv], goal: false, mc: types.map(function (t) { return t ? [0.25, 0.3, false, 0.4] : null; }) };
}

/* ---------- 畫面 ---------- */
var cv, ctx, animT = 0;
var GUIDE_TITLE = ['衝到終點', '操作', '過關後一直重播', '撿多還是跑快', '寶箱裡的機關'];
var GUIDE_TEXT = ['碰到旗子就過關', '空白鍵跳、Z 攻擊、X 技能(Esc 暫停)', '過關的關卡會一直重播賺素材', '撿越多、跑越快, 重播賺越快', '寶箱的機關能裝在機關座上'];
var GUIDE_SIZE = [[480, 270], [600, 220], [480, 300], [560, 240], [600, 200]];
var GUIDE_SCALE = 1.5;
function text(s, x, y, size, color, align) {
  ctx.font = 'bold ' + size + 'px sans-serif'; ctx.fillStyle = color || '#fff'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function renderGuide() {
  Art.drawMapBackground(ctx);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
  var pg = G.gp, sz = GUIDE_SIZE[pg], w = sz[0] * GUIDE_SCALE, h = sz[1] * GUIDE_SCALE;
  text('第 ' + (pg + 1) + ' 頁: ' + GUIDE_TITLE[pg], W / 2, 56, 38, '#ffe27a');
  text(GUIDE_TEXT[pg], W / 2, 108, 28, '#ffffff');
  Art.drawGuidePage(ctx, { page: pg, x: (W - w) / 2, y: 140, w: w, h: h });
  text((pg + 1) + ' / 5', W / 2, 650, 22, '#ddd');
  text(pg < 4 ? '← → 翻頁    Z 下一頁' : '← 上一頁    Z 開始', W / 2, 684, 22, '#ffe27a');
}
function renderMap() {
  Art.drawMapBackground(ctx);
  MAP_LINKS.forEach(function (l) {
    var a = CARD_POS[l[0]], b = CARD_POS[l[1]];
    Art.drawMapLink(ctx, { x1: a[0] + 176, y1: a[1] + 68, x2: b[0], y2: b[1] + 68, lit: G.cleared[l[0]] });
  });
  for (var i = 1; i <= 8; i++) {
    var p = CARD_POS[i], st = cardState(i), R = G.R[i];
    Art.drawLevelCard(ctx, { x: p[0], y: p[1], index: i, name: LV_NAMES[i - 1], state: st, cost: { wood: UNLOCK_COST[i] || 0, ench: 0, time: 0 },
      canAfford: G.stock.wood >= (UNLOCK_COST[i] || 0), rates: ratesOf(i), recordCls: R ? R.cls : null, recordTime: R ? r1(R.time) : null });
    if (st === 'cleared' && R) {
      ctx.save(); ctx.translate(p[0] + 8, p[1] + 8); ctx.beginPath(); ctx.rect(0, 0, 160, 90); ctx.clip(); ctx.scale(0.125, 0.125);
      drawScene(ctx, rframe(R), LEVELS[i - 1], R.cfg, R.sealed, { t: animT, thumb: true });
      ctx.restore();
    }
    Art.drawCardOverlay(ctx, { x: p[0], y: p[1], accelLv: G.accel[i], pending: isPending(i), selected: G.cur === i });
  }
  Art.drawGoalCard(ctx, { x: GOAL_POS[0], y: GOAL_POS[1], cost: GOAL_COST, canAfford: canAfford(GOAL_COST), selected: G.cur === 9 });
  if (!G.panel) G.fly.forEach(function (f) {
    var u = f.t / 0.7, tg = HUD_TARGET[f.kind];
    Art.drawFlyingMaterial(ctx, { x: f.x0 + (tg[0] - f.x0) * u, y: f.y0 + (tg[1] - f.y0) * u - 70 * Math.sin(Math.PI * u), kind: f.kind, t: f.t, dur: 0.7 });
  });
  hud('map');
  text('↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', W / 2, 702, 16, '#d8d8d8');
  if (G.panel) renderPanel();
}
function hud(mode) {
  var base = { mode: mode, stock: G.stock, ratePerMin: totalRates(), bumpT: G.bump, bumpDur: 0.15, time: null, run: null, hp: null, maxHp: null,
    skillCdT: null, skillCdDur: null, cls: null, itemThisRun: null };
  if (mode === 'level') {
    base.time = r1(S.time); base.run = S.run; base.hp = S.p.hp; base.maxHp = 3;
    base.skillCdDur = S.p.skDur; base.skillCdT = S.p.skDur - Math.min(S.p.skDur, S.p.skCd); base.cls = CLS[S.cls]; base.itemThisRun = S.item;
  }
  Art.drawHud(ctx, base);
}
function itemWhere(i) {
  for (var l = 1; l <= 8; l++) for (var k = 0; k < 4; k++) if (G.place[l][k] === i) return { level: l, slot: k + 1 };
  return null;
}
function renderPanel() {
  var P = G.panel, lv = P.lv, R = G.R[lv], types = lvTypes(lv), L = LEVELS[lv - 1];
  var nUn = G.unsealed[lv].filter(function (u) { return u; }).length;
  var ucost = nUn >= 4 ? 0 : UNSEAL_COSTS[nUn];
  var ac = G.accel[lv];
  Art.drawLevelPanel(ctx, { index: lv, name: LV_NAMES[lv - 1], row: P.row,
    classes: CLS.map(function (c, i) { return { cls: c, owned: G.owned[i], cost: CLASS_COST, canAfford: G.stock.wood >= 40 }; }), clsSel: P.clsSel,
    slots: [0, 1, 2, 3].map(function (k) { return { sealed: !G.unsealed[lv][k], type: types[k] }; }), slotSel: P.slotSel,
    unsealCost: ucost, canAffordUnseal: G.stock.ench >= ucost,
    items: G.bag.map(function (b, i) { var w = itemWhere(i); return { type: b.type, where: w }; }),
    pending: isPending(lv), accelLv: ac, accelCost: ac >= 2 ? null : ACCEL_COST[ac], canAffordAccel: ac < 2 && G.stock.time >= ACCEL_COST[ac],
    recordCls: R ? R.cls : null, recordTime: R ? r1(R.time) : null, rates: R ? ratesOf(lv) : null });
  ctx.save(); ctx.translate(60, 96); ctx.beginPath(); ctx.rect(0, 0, 640, 360); ctx.clip(); ctx.scale(0.5, 0.5);
  drawScene(ctx, previewFrame(lv), L, types, G.unsealed[lv].map(function (u) { return !u; }), { t: animT, thumb: false });
  if (R && R.route.length >= 2) Art.drawRoutePath(ctx, { points: R.route, cls: R.cls });
  ctx.restore();
  var s = L.socks[P.slotSel];
  Art.drawSlotCursor(ctx, { x: 60 + s.x * 0.5, y: 96 + (s.top - 12) * 0.5 - 16, active: P.row === 1 });
}
function renderLevel() {
  var F = snap();
  drawScene(ctx, F, S.L, S.cfg, S.sealed, { t: S.time, live: true });
  var p = S.p;
  if (p.hooking) Placeholder.hookRope(ctx, p.x, p.y - 6, p.hookTx, p.hookTy);
  S.popups.forEach(function (e) { Art.drawPopup(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.8, kind: e.kind, value: e.value }); });
  S.chainTexts.forEach(function (e) { Art.drawChainText(ctx, { x: e.x, y: e.y, n: e.n, t: e.t, dur: 0.8 }); });
  if (S.notice) Art.drawItemNotice(ctx, { type: S.notice.type, t: S.notice.t, dur: 1.5 });
  hud('level');
  if (S.state === 'fail') Art.drawFailPanel(ctx, {});
  else if (S.state === 'result') {
    var nr = S.newR, o = S.first ? null : S.oldR;
    Art.drawResultPanel(ctx, { time: r1(nr.time), run: nr.tot, rates: runRates(nr.tot, nr.time, S.lv), cls: nr.cls, item: S.item,
      oldTime: o ? r1(o.time) : null, oldRates: o ? ratesOf(S.lv) : null, oldCls: o ? o.cls : null });
  }
}
function render() {
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (G.mode === 'guide') { renderGuide(); return; }
  if (G.mode === 'level' && S) renderLevel();
  else renderMap();
  if (G.mode === 'ending') Art.drawEndingPanel(ctx, { totalTime: Math.floor(G.total) });
  if (G.paused) Art.drawPausePanel(ctx, { mode: G.mode === 'level' ? 'level' : 'map' });
}

/* ---------- 輸入(只用鍵盤) ---------- */
function mapMove(dx, dy) {
  var ci = 0, col, i;
  MAP_COLS.forEach(function (c, n) { if (c.indexOf(G.cur) >= 0) ci = n; });
  function cy(id) { return id === 9 ? GOAL_POS[1] + 68 : CARD_POS[id][1] + 68; }
  if (dy) {
    col = MAP_COLS[ci]; i = col.indexOf(G.cur) + dy;
    if (i >= 0 && i < col.length) G.cur = col[i];
  } else if (dx) {
    var nc = ci + dx; if (nc < 0 || nc >= MAP_COLS.length) return;
    var best = null, bd = 1e9;
    MAP_COLS[nc].forEach(function (id) { var d = Math.abs(cy(id) - cy(G.cur)); if (d < bd) { bd = d; best = id; } });
    G.cur = best;
  }
}
function mapZ() {
  var c = G.cur;
  if (c === 9) { if (canAfford(GOAL_COST)) { spend(GOAL_COST); G.mode = 'ending'; } return; }
  var st = cardState(c);
  if (st === 'buyable') { if (G.stock.wood >= UNLOCK_COST[c]) { G.stock.wood -= UNLOCK_COST[c]; G.open[c] = true; } }
  else if (st === 'open' || st === 'cleared') G.panel = { lv: c, row: 0, clsSel: G.lastCls[c] || 0, slotSel: 0 };
}
function cycleItem(lv, k) {
  var n = G.bag.length, cur = G.place[lv][k], nx = cur + 1 >= n ? -1 : cur + 1;
  if (nx >= 0) for (var l = 1; l <= 8; l++) for (var j = 0; j < 4; j++) if (G.place[l][j] === nx) G.place[l][j] = -1;
  G.place[lv][k] = nx;
}
function panelKey(code) {
  var P = G.panel, lv = P.lv;
  if (code === 'ArrowUp') P.row = Math.max(0, P.row - 1);
  else if (code === 'ArrowDown') P.row = Math.min(2, P.row + 1);
  else if (code === 'ArrowLeft' || code === 'ArrowRight') {
    var d = code === 'ArrowLeft' ? -1 : 1;
    if (P.row === 0) P.clsSel = Math.max(0, Math.min(2, P.clsSel + d));
    else if (P.row === 1) P.slotSel = Math.max(0, Math.min(3, P.slotSel + d));
  } else if (code === 'KeyX') G.panel = null;
  else if (code === 'KeyZ') {
    if (P.row === 0) {
      if (G.owned[P.clsSel]) { G.lastCls[lv] = P.clsSel; G.panel = null; startLevel(lv, P.clsSel); acc = 0; }
      else if (G.stock.wood >= 40) { G.stock.wood -= 40; G.owned[P.clsSel] = true; }
    } else if (P.row === 1) {
      var k = P.slotSel;
      if (!G.unsealed[lv][k]) {
        var n = G.unsealed[lv].filter(function (u) { return u; }).length, c = UNSEAL_COSTS[n];
        if (G.stock.ench >= c) { G.stock.ench -= c; G.unsealed[lv][k] = true; }
      } else cycleItem(lv, k);
    } else {
      var ac = G.accel[lv];
      if (ac < 2 && G.stock.time >= ACCEL_COST[ac]) { G.stock.time -= ACCEL_COST[ac]; G.accel[lv] = ac + 1; }
    }
  }
}
var acc = 0;
function onKeyDown(e) {
  var code = e.code;
  var used = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'Escape'];
  if (used.indexOf(code) < 0) return;
  e.preventDefault();
  if (e.repeat) return;
  if (!G) return;
  var m = G.mode;
  if (m === 'guide') {
    if (code === 'ArrowLeft') G.gp = Math.max(0, G.gp - 1);
    else if (code === 'ArrowRight') G.gp = Math.min(4, G.gp + 1);
    else if (code === 'KeyZ') { if (G.gp < 4) G.gp++; else G.mode = G.guideReturn; }
    return;
  }
  if (m === 'ending') { if (code === 'KeyZ') { newGame(); } return; }
  if (code === 'Escape') {
    if (m === 'level' && S && S.state !== 'play') return;
    G.paused = !G.paused; K.l = K.r = K.jump = false; return;
  }
  if (G.paused) {
    if (m === 'level') {
      if (code === 'KeyZ') { startLevel(S.lv, S.cls); acc = 0; }
      else if (code === 'KeyX') leaveLevel();
    }
    return;
  }
  if (m === 'map') {
    if (G.panel) { panelKey(code); return; }
    if (code === 'ArrowLeft') mapMove(-1, 0);
    else if (code === 'ArrowRight') mapMove(1, 0);
    else if (code === 'ArrowUp') mapMove(0, -1);
    else if (code === 'ArrowDown') mapMove(0, 1);
    else if (code === 'KeyZ') mapZ();
    else if (code === 'Space') { G.guideReturn = 'map'; G.gp = 0; G.mode = 'guide'; }
    return;
  }
  if (m === 'level' && S) {
    if (S.state === 'play') {
      if (code === 'ArrowLeft') K.l = true;
      else if (code === 'ArrowRight') K.r = true;
      else if (code === 'Space') { K.jump = true; Q.jump = true; }
      else if (code === 'KeyZ') Q.atk = true;
      else if (code === 'KeyX') Q.skill = true;
    } else if (S.state === 'fail') {
      if (code === 'KeyZ') { startLevel(S.lv, S.cls); acc = 0; }
      else if (code === 'KeyX') leaveLevel();
    } else if (S.state === 'result') {
      if (S.first) { if (code === 'KeyZ') leaveLevel(); }
      else if (code === 'KeyZ') { var nr = S.newR; G.R[S.lv] = nr; leaveLevel(); }
      else if (code === 'KeyX') leaveLevel();
    }
  }
}
function onKeyUp(e) {
  if (e.code === 'ArrowLeft') K.l = false;
  else if (e.code === 'ArrowRight') K.r = false;
  else if (e.code === 'Space') K.jump = false;
}

/* ---------- 畫布縮放 / 主迴圈 ---------- */
function resize() {
  var cw = window.innerWidth || W, ch = window.innerHeight || H;
  var s = Math.min(cw / W, ch / H), dpr = window.devicePixelRatio || 1;
  var w = Math.floor(W * s), h = Math.floor(H * s);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  cv.style.left = Math.floor((cw - w) / 2) + 'px'; cv.style.top = Math.floor((ch - h) / 2) + 'px';
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
}
var lastTs = 0;
function update(dt) {
  if (G.mode === 'guide' || G.mode === 'ending' || G.paused) return;
  G.total += dt; animT += dt;
  updReplay(dt);
  if (G.mode === 'level' && S && S.state === 'play') {
    acc += dt;
    while (acc >= DT) { stepLevel(DT); acc -= DT; if (S.state !== 'play') { K.l = K.r = K.jump = false; break; } }
  }
}
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = Math.min((ts - lastTs) / 1000, 1 / 30); lastTs = ts;
  if (!(dt > 0)) return;
  try { update(dt); render(); } catch (err) { console.error(err); }
}
function init() {
  cv = document.getElementById('c'); ctx = cv.getContext('2d');
  newGame(); resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', function () { K.l = K.r = K.jump = false; });
  requestAnimationFrame(frame);
}
if (typeof document !== 'undefined' && document.getElementById('c')) init();

