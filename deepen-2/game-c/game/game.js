// 廢墟復興 - 玩法驗證 Demo (傳統腳本, 無依賴)
(function () {
'use strict';

var W = Art.canvas.width, H = Art.canvas.height;
var T = 40, COLS = 32, ROWS = 18, DT = 1 / 60;
var KINDS = ['wood', 'brick', 'time', 'soul'];

// 美術 style.md 沒有的圖形一律集中在這(目前無)
var Placeholder = {};

/* ===================== 資料表 ===================== */
var MON = {
  boar:   { w: 48, h: 32, hp: 3, drop: { wood: 3, soul: 1 } },
  shield: { w: 32, h: 44, hp: 3, drop: { brick: 3, soul: 1 } },
  bee:    { w: 32, h: 32, hp: 1, drop: { time: 2, soul: 1 } },
  frog:   { w: 32, h: 28, hp: 2, drop: { wood: 2, soul: 1 } }
};
var ITEM_CAT = { bagWood: 'storage', bagBrick: 'storage', bagTime: 'storage', bagSoul: 'storage', horn: 'lodge', soulHook: 'lodge', basket: 'tower' };
var BTYPE_NAME = { storage: '倉庫', lodge: '獵寮', tower: '瞭望塔' };
var REBUILD = [[10, 15], [25, 30], [25, 30], [45, 55], [45, 55], [45, 55], [45, 55], [80, 90]];
var UNLOCK_COST = [0, 0, 20, 20, 50, 50, 50, 50, 100];
var PARENTS = { 2: [1], 3: [1], 4: [2], 5: [2], 6: [3], 7: [3], 8: [5, 6] };
var CHEST_ITEM = [null, 'bagWood', 'basket', 'horn', 'bagTime', 'bagBrick', 'soulHook', 'basket', 'bagSoul'];
var LEVEL_NAME = [null, '草原', '懸崖棧道', '野豬峽谷', '蜂巢高塔', '斷橋', '盾兵要塞', '蛙沼', '王座'];
var LEVEL_THEME = [null, 'plain', 'sky', 'rock', 'sky', 'sky', 'rock', 'swamp', 'throne'];
var CARD_POS = { 1: [40, 281], 2: [290, 131], 3: [290, 431], 4: [540, 56], 5: [540, 206], 6: [540, 356], 7: [540, 506], 8: [790, 281] };
var WORKSHOP_POS = [40, 506], GOAL_POS = [1040, 281];
var HUD_TARGET = { wood: [36, 20], brick: [206, 20], time: [376, 20], soul: [546, 20] };
var ACCEL_MULT = [1, 1.25, 1.5], ACCEL_COST = [12, 30];
var SPEED_MULT = [1, 1.08, 1.16, 1.24], CD_MULT = [1, 0.85, 0.7, 0.55];
var SPEED_COST = [8, 20, 45], HP_COST = [12, 35], CD_COST = [8, 20, 45];
var GOAL_COST = { wood: 300, brick: 200, time: 100, soul: 120 };
var CLS_LIST = ['sword', 'hunter', 'bomber'];
var CLS_SPEED = { sword: 260, hunter: 260, bomber: 230 };

/* ===================== 關卡建構 ===================== */
// 格子型態: 0 空 1 地面 2 建築牆 3 裂岩牆 4 尖刺 5 門口落石 6 屋頂艙口(破損時實心)
var levels = [null];

function makeLevel(i) {
  var L = { idx: i, name: LEVEL_NAME[i], theme: LEVEL_THEME[i], g: [], bid: [], blds: [], pick: [], mons: [], rings: [], chest: null, start: null, goal: null };
  var r, c;
  for (r = 0; r < ROWS; r++) { L.g.push([]); L.bid.push([]); for (c = 0; c < COLS; c++) { L.g[r].push(0); L.bid[r].push(-1); } }
  function F(c0, r0, c1, r1) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) { L.g[rr][cc] = 1; L.bid[rr][cc] = -1; } }
  function X(c0, r0, c1, r1) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) { L.g[rr][cc] = 0; L.bid[rr][cc] = -1; } }
  function S(cc, rr) { L.g[rr][cc] = 4; }
  function CW(cc, rr) { L.g[rr][cc] = 3; }
  function P(kind, cc, rr) { L.pick.push({ id: L.pick.length, kind: kind, x: cc * T + 20, y: (rr + 1) * T - 14 }); }
  function M(type, cc, rr, lodge) {
    var m = MON[type], y;
    if (type === 'bee') y = rr * T + 20; else y = (rr + 1) * T - m.h / 2;
    L.mons.push({ type: type, x: cc * T + 20, y: y, lodge: lodge === undefined ? -1 : lodge });
  }
  function ring(x, y) { L.rings.push({ x: x, y: y }); }
  function chest(cc, rr, b) { L.chest = { x: cc * T + 20, y: (rr + 1) * T - 18, bld: b }; }
  function start(cc, rr) { L.start = { x: cc * T + 20, y: (rr + 1) * T - 22 }; }
  function goal(cc, rr) { L.goal = { x: cc * T + 20, y: rr * T + 40 }; }
  function B(btype, c0, fr, side, idx, stairs) {
    var w = btype === 'storage' ? 6 : (btype === 'lodge' ? 8 : 4), h = btype === 'tower' ? 9 : 4;
    var top = fr - h + 1, rr, cc;
    for (rr = top; rr <= fr; rr++) for (cc = c0; cc < c0 + w; cc++) {
      if (rr === top || rr === fr || cc === c0 || cc === c0 + w - 1) { L.g[rr][cc] = 2; L.bid[rr][cc] = idx; }
      else { L.g[rr][cc] = 0; L.bid[rr][cc] = -1; }
    }
    var doorCol = side === 'R' ? c0 + w - 1 : c0;
    L.g[fr - 2][doorCol] = 5; L.bid[fr - 2][doorCol] = idx;
    L.g[fr - 1][doorCol] = 5; L.bid[fr - 1][doorCol] = idx;
    if (btype === 'tower') {
      var far = side === 'R' ? c0 + 1 : c0 + 2, near = side === 'R' ? c0 + 2 : c0 + 1;
      L.g[top][far] = 6; L.bid[top][far] = idx;
      L.g[fr - 2][far] = 2; L.bid[fr - 2][far] = idx;
      L.g[fr - 4][near] = 2; L.bid[fr - 4][near] = idx;
      L.g[fr - 6][far] = 2; L.bid[fr - 6][far] = idx;
    }
    if (stairs) {
      if (side === 'R') { F(c0 - 1, fr - 2, c0 - 1, fr - 1); F(c0 - 2, fr - 1, c0 - 2, fr - 1); }
      else { F(c0 + w, fr - 2, c0 + w, fr - 1); F(c0 + w + 1, fr - 1, c0 + w + 1, fr - 1); }
    }
    L.blds[idx] = { btype: btype, idx: idx, c: c0, top: top, w: w, h: h, fr: fr, side: side, doorCol: doorCol, slotC: doorCol, slotR: fr - 3 };
    return L.blds[idx];
  }
  function towerRoof(b, withChest) {
    // 屋頂時晶 4 顆; 寶箱放在門的對側外牆頂
    var tp = b.top, c0 = b.c;
    if (b.side === 'R') { P('time', c0 + 2, tp - 1); P('time', c0 + 3, tp - 1); P('time', c0 + 1, tp - 2); P('time', c0 + 2, tp - 2); if (withChest) chest(c0, tp - 1, b.idx); }
    else { P('time', c0 + 1, tp - 1); P('time', c0, tp - 1); P('time', c0 + 2, tp - 2); P('time', c0 + 1, tp - 2); if (withChest) chest(c0 + 3, tp - 1, b.idx); }
  }
  function HUT(c0, fr, w, side) {
    F(c0, fr - 3, c0 + w - 1, fr - 1);
    X(c0 + 1, fr - 2, c0 + w - 2, fr - 1);
    var gc = side === 'R' ? c0 + w - 1 : c0;
    CW(gc, fr - 2); CW(gc, fr - 1);
  }
  var b;
  if (i === 1) {
    F(0, 14, 31, 17);
    B('storage', 16, 14, 'R', 0, true); B('lodge', 5, 14, 'R', 1, true);
    F(24, 12, 25, 13); F(27, 10, 28, 10); F(29, 9, 31, 9);
    ring(1140, 376);
    [[1, 13], [2, 13], [13, 13], [22, 13], [26, 13], [7, 10], [9, 10], [18, 10]].forEach(function (a) { P('wood', a[0], a[1]); });
    [[11, 10], [20, 10], [23, 13]].forEach(function (a) { P('brick', a[0], a[1]); });
    P('time', 29, 8); P('time', 30, 8);
    P('wood', 17, 13); P('wood', 18, 13); P('wood', 19, 13); P('brick', 17, 12); P('brick', 19, 12);
    P('wood', 6, 13); P('brick', 10, 13);
    chest(20, 13, 0);
    M('boar', 8, 10); M('frog', 28, 13); M('frog', 29, 13); M('shield', 27, 13); M('bee', 19, 8);
    M('frog', 7, 13, 1); M('frog', 9, 13, 1); M('boar', 11, 13, 1);
    start(1, 13); goal(30, 12);
  } else if (i === 2) {
    F(0, 15, 10, 17);
    b = B('tower', 0, 15, 'R', 0, false);
    F(12, 13, 22, 14); F(24, 11, 27, 12); F(29, 9, 31, 10);
    B('storage', 15, 13, 'R', 1, true);
    S(9, 14); S(27, 10);
    [[5, 14], [8, 14], [12, 12], [16, 9], [18, 9], [21, 12]].forEach(function (a) { P('wood', a[0], a[1]); });
    P('brick', 17, 9); P('brick', 26, 10);
    P('time', 24, 10); P('time', 25, 10); P('time', 29, 8); P('time', 31, 8);
    P('wood', 16, 12); P('wood', 17, 12); P('brick', 18, 12); P('brick', 19, 12); P('brick', 16, 11);
    towerRoof(b, true);
    M('bee', 16, 7); M('bee', 27, 7); M('frog', 21, 12); M('frog', 25, 10);
    start(6, 14); goal(30, 7);
  } else if (i === 3) {
    F(0, 14, 31, 17);
    F(2, 10, 9, 10); F(12, 12, 13, 13);
    B('storage', 3, 10, 'R', 1, false);
    B('lodge', 16, 14, 'R', 0, true);
    HUT(27, 14, 5, 'L');
    S(26, 13); S(19, 10);
    [[1, 13], [6, 13], [17, 10], [18, 10], [24, 13], [25, 13]].forEach(function (a) { P('wood', a[0], a[1]); });
    [[9, 13], [11, 13], [20, 10], [21, 10]].forEach(function (a) { P('brick', a[0], a[1]); });
    P('time', 22, 10);
    P('brick', 4, 9); P('brick', 5, 9); P('brick', 6, 9); P('brick', 7, 9); P('wood', 4, 8); P('wood', 7, 8);
    P('wood', 28, 13); P('wood', 29, 13); P('time', 30, 13);
    chest(22, 13, 0);
    M('boar', 8, 13); M('boar', 22, 10); M('boar', 24, 13); M('shield', 25, 13);
    M('boar', 17, 13, 0); M('shield', 19, 13, 0); M('boar', 21, 13, 0);
    start(1, 13); goal(25, 12);
  } else if (i === 4) {
    F(0, 15, 31, 17);
    X(8, 15, 13, 15);
    b = B('tower', 0, 15, 'R', 1, false);
    B('lodge', 24, 15, 'L', 0, false);
    F(15, 13, 17, 14); F(19, 11, 21, 12); F(23, 9, 26, 10); F(28, 7, 31, 8);
    S(22, 14); S(12, 15);
    [[6, 14], [14, 14], [16, 12], [18, 14]].forEach(function (a) { P('wood', a[0], a[1]); });
    P('brick', 19, 10); P('brick', 24, 8);
    P('time', 9, 15); P('time', 10, 15); P('time', 11, 15); P('time', 29, 6); P('time', 31, 6);
    towerRoof(b, true);
    M('bee', 10, 12); M('bee', 20, 8); M('bee', 26, 6); M('frog', 20, 10);
    M('frog', 26, 14, 0); M('frog', 28, 14, 0); M('bee', 28, 13, 0);
    start(5, 14); goal(30, 5);
  } else if (i === 5) {
    F(0, 14, 31, 17); X(7, 14, 11, 15); X(24, 14, 28, 15);
    b = B('tower', 0, 14, 'R', 1, false);
    B('storage', 16, 14, 'R', 0, true);
    [[6, 13], [12, 13], [22, 13], [29, 13], [31, 13], [17, 10], [18, 10], [19, 10]].forEach(function (a) { P('wood', a[0], a[1]); });
    P('brick', 25, 15); P('brick', 26, 15);
    P('time', 8, 15); P('time', 9, 15); P('time', 10, 15);
    P('wood', 17, 13); P('wood', 18, 13); P('wood', 19, 13); P('brick', 17, 12); P('brick', 18, 12); P('brick', 19, 12);
    chest(20, 13, 0);
    towerRoof(b, false);
    M('boar', 17, 10); M('boar', 20, 10); M('frog', 22, 13); M('frog', 29, 13); M('bee', 26, 10);
    start(4, 13); goal(30, 12);
  } else if (i === 6) {
    F(0, 14, 31, 17);
    HUT(0, 14, 4, 'R');
    B('storage', 9, 14, 'R', 0, true); B('lodge', 18, 14, 'R', 1, true);
    HUT(28, 14, 4, 'L');
    S(6, 13); S(16, 12);
    [[7, 12], [11, 10], [12, 10], [22, 10]].forEach(function (a) { P('wood', a[0], a[1]); });
    [[13, 10], [20, 10], [21, 10], [23, 10], [26, 12], [15, 12]].forEach(function (a) { P('brick', a[0], a[1]); });
    P('time', 24, 10); P('time', 25, 10);
    P('wood', 10, 13); P('wood', 11, 13); P('brick', 12, 13); P('brick', 13, 13); P('brick', 10, 12);
    P('brick', 1, 13); P('brick', 2, 13); P('wood', 29, 13); P('time', 30, 13);
    chest(24, 13, 1);
    M('shield', 10, 10); M('shield', 13, 10); M('shield', 20, 10); M('boar', 23, 10); M('bee', 16, 11);
    M('shield', 19, 13, 1); M('shield', 21, 13, 1); M('boar', 23, 13, 1);
    start(5, 13); goal(27, 12);
  } else if (i === 7) {
    F(0, 14, 11, 17); F(12, 17, 31, 17);
    for (c = 12; c <= 31; c++) S(c, 16);
    F(14, 14, 16, 15); F(18, 14, 20, 15); F(22, 14, 31, 15);
    B('lodge', 0, 14, 'R', 0, false);
    b = B('tower', 28, 14, 'L', 1, false);
    [[9, 13], [11, 13], [15, 13], [19, 13], [23, 13], [26, 13]].forEach(function (a) { P('wood', a[0], a[1]); });
    P('brick', 14, 13); P('brick', 16, 13); P('brick', 24, 13);
    P('time', 18, 13); P('time', 20, 13);
    P('brick', 1, 13); P('wood', 5, 13);
    towerRoof(b, true);
    M('frog', 15, 13); M('frog', 19, 13); M('frog', 23, 13); M('frog', 26, 13); M('shield', 24, 13); M('bee', 16, 11);
    M('frog', 2, 13, 0); M('frog', 4, 13, 0); M('frog', 6, 13, 0);
    start(10, 13); goal(25, 12);
  } else if (i === 8) {
    F(0, 14, 31, 17); X(11, 14, 15, 15); CW(13, 14); CW(13, 15);
    B('lodge', 0, 14, 'R', 0, false);
    F(17, 12, 18, 13); F(20, 10, 21, 10); F(22, 9, 25, 9);
    B('storage', 26, 14, 'L', 1, false);
    ring(860, 376);
    S(8, 13); S(25, 8);
    [[9, 13], [10, 13], [16, 13], [19, 13], [22, 13], [25, 13]].forEach(function (a) { P('wood', a[0], a[1]); });
    P('brick', 11, 15); P('brick', 12, 15); P('brick', 14, 15); P('brick', 15, 15);
    P('time', 23, 8); P('time', 24, 8); P('time', 17, 11); P('time', 18, 11);
    P('wood', 27, 13); P('wood', 28, 13); P('brick', 29, 13); P('brick', 27, 12); P('time', 28, 12); P('time', 29, 12);
    P('wood', 3, 13); P('brick', 5, 13);
    chest(30, 13, 1);
    M('boar', 20, 13); M('shield', 21, 13); M('frog', 22, 13); M('boar', 23, 13); M('frog', 19, 13); M('bee', 13, 10);
    M('boar', 2, 13, 0); M('shield', 4, 13, 0); M('frog', 6, 13, 0);
    start(9, 13); goal(24, 12);
  }
  // 裂岩牆清單
  L.cracks = [];
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) if (L.g[r][c] === 3) L.cracks.push({ c: c, r: r, key: r * COLS + c, i: L.cracks.length });
  return L;
}
for (var li = 1; li <= 8; li++) levels.push(makeLevel(li));

/* ===================== 持久狀態與經濟 ===================== */
var G;
function newGame() {
  G = {
    stock: { wood: 0, brick: 0, time: 0, soul: 0 },
    unlocked: [false, true, false, false, false, false, false, false, false],
    replay: [null, null, null, null, null, null, null, null, null],
    pos: [0, 0, 0, 0, 0, 0, 0, 0, 0], idx: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    accel: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    lastCls: [null, 'sword', 'sword', 'sword', 'sword', 'sword', 'sword', 'sword', 'sword'],
    repaired: [null],
    lastRebuild: [0, 0, 0, 0, 0, 0, 0, 0, 0], seq: 0,
    chestTaken: [false, false, false, false, false, false, false, false, false],
    inv: [],
    owned: { sword: true, hunter: false, bomber: false },
    up: { speed: 0, hp: 0, cd: 0 },
    play: 0, won: false
  };
  for (var i = 1; i <= 8; i++) G.repaired.push([false, false]);
}
newGame();

function cfg(lv) {
  var c = { bagWood: 0, bagBrick: 0, bagTime: 0, bagSoul: 0, horn: 0, soulHook: 0, basket: 0 };
  G.inv.forEach(function (it) { if (it.where && it.where.level === lv) c[it.type]++; });
  return c;
}
function pickupIncome(lv, kind) { var c = cfg(lv); return [{ kind: kind, n: 1 + c.basket }]; }
function killIncome(lv, type) {
  var c = cfg(lv), out = [], mult = 1 + c.horn, d = MON[type].drop;
  KINDS.forEach(function (k) { if (d[k]) out.push({ kind: k, n: d[k] * mult }); });
  if (c.soulHook) out.push({ kind: 'soul', n: c.soulHook });
  return out;
}
function clearIncome(lv) {
  var c = cfg(lv), out = [];
  if (c.bagWood) out.push({ kind: 'wood', n: 4 * c.bagWood });
  if (c.bagBrick) out.push({ kind: 'brick', n: 3 * c.bagBrick });
  if (c.bagTime) out.push({ kind: 'time', n: 2 * c.bagTime });
  if (c.bagSoul) out.push({ kind: 'soul', n: 2 * c.bagSoul });
  return out;
}
function emptyRun() { return { wood: 0, brick: 0, time: 0, soul: 0 }; }
function lapTotals(rec, lv) {
  var tot = emptyRun();
  rec.events.forEach(function (e) {
    var inc = e.k === 'p' ? pickupIncome(lv, e.kind) : killIncome(lv, e.type);
    inc.forEach(function (a) { tot[a.kind] += a.n; });
  });
  clearIncome(lv).forEach(function (a) { tot[a.kind] += a.n; });
  return tot;
}
function ratesOf(rec, lv, accelLv) {
  var tot = lapTotals(rec, lv), secs = rec.frames.length * DT, m = ACCEL_MULT[accelLv], out = {};
  KINDS.forEach(function (k) { out[k] = Math.round(tot[k] / secs * 60 * m * 10) / 10; });
  return out;
}
function allRates() {
  var out = emptyRun();
  for (var i = 1; i <= 8; i++) if (G.replay[i]) { var r = ratesOf(G.replay[i], i, G.accel[i]); KINDS.forEach(function (k) { out[k] += r[k]; }); }
  KINDS.forEach(function (k) { out[k] = Math.round(out[k] * 10) / 10; });
  return out;
}
function canPay(cost) { return KINDS.every(function (k) { return !cost[k] || G.stock[k] >= cost[k]; }); }
function pay(cost) { KINDS.forEach(function (k) { if (cost[k]) G.stock[k] -= cost[k]; }); }
function maxHp() { return 3 + G.up.hp; }

/* ===================== 地形查詢 ===================== */
var cur = null; // 目前跑關的世界
function solidCell(c, r, lv, cw) {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  var t = lv.g[r][c];
  if (t === 0 || t === 4) return false;
  if (t === 3) return !cw || cw[r * COLS + c] > 0;
  if (t === 5 || t === 6) return !G.repaired[lv.idx][lv.bid[r][c]];
  return true;
}
function staticSolid(c, r, lv) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  var t = lv.g[r][c];
  return t === 1 || t === 2 || t === 3 || t === 5 || t === 6;
}
function boxHits(w, x, y, bw, bh) {
  var c0 = Math.floor((x - bw / 2) / T), c1 = Math.floor((x + bw / 2 - 0.001) / T);
  var r0 = Math.floor((y - bh / 2) / T), r1 = Math.floor((y + bh / 2 - 0.001) / T);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solidCell(c, r, w.lv, w.cw)) return true;
  return false;
}
// 移動 e (x,y 中心; w,h) 一個位移, 回傳 {hx, hy}; 撞牆旗標只在該軸有位移時才寫
function moveBox(w, e, dx, dy) {
  var res = { hx: false, hy: false }, step, n, i;
  if (dx !== 0) {
    n = Math.ceil(Math.abs(dx) / 8); step = dx / n;
    for (i = 0; i < n; i++) {
      if (boxHits(w, e.x + step, e.y, e.w, e.h)) {
        res.hx = true;
        break;
      }
      e.x += step;
    }
  }
  if (dy !== 0) {
    n = Math.ceil(Math.abs(dy) / 8); step = dy / n;
    for (i = 0; i < n; i++) {
      if (boxHits(w, e.x, e.y + step, e.w, e.h)) { res.hy = true; break; }
      e.y += step;
    }
  }
  return res;
}
function onFloor(w, e) { return boxHits(w, e.x, e.y + 1, e.w, e.h); }
function cellSolidAt(w, x, y) { return solidCell(Math.floor(x / T), Math.floor(y / T), w.lv, w.cw); }

/* ===================== 世界(跑關) ===================== */
function newWorld(lvIdx, cls) {
  var lv = levels[lvIdx];
  var w = { lv: lv, lvIdx: lvIdx, cls: cls, f: 0, cw: {}, taken: {}, takenAt: {}, mons: [], arrows: [], bombs: [], shots: [], expl: [], waves: [], poofs: [], popups: [], chains: {}, chainTexts: [],
    run: emptyRun(), item: null, chestAt: -1, atkSeq: 0, state: 'play', frames: [], events: [], monTypes: [], poofLog: [], explLog: [], waveLog: [], reachedF: -1, notice: null, hitFlash: 0, over: false };
  lv.cracks.forEach(function (k) { w.cw[k.key] = 3; });
  var sp = lv.start, m = CLS_SPEED[cls] * SPEED_MULT[G.up.speed];
  w.p = { x: sp.x, y: sp.y, w: 28, h: 44, vx: 0, vy: 0, facing: 1, cls: cls, hp: maxHp(), inv: 0, kb: 0, kbv: 0, pose: 'idle', poseT: 0, atkCd: 0, skillCd: 0, skillCdDur: 1, dashT: 0, dashAvail: true, dashHit: {}, hookTo: null, hookRing: null, poseHold: 0, jumpHeld: false, jumpT: 0, jumpCut: false, onGround: false, autoCd: 0, speed: m };
  lv.mons.forEach(function (d) {
    if (d.lodge >= 0 && !G.repaired[lvIdx][d.lodge]) return;
    addMon(w, d);
  });
  return w;
}
function addMon(w, d) {
  var t = MON[d.type], m = { id: w.mons.length, type: d.type, x: d.x, y: d.y, sx: d.x, sy: d.y, w: t.w, h: t.h, hp: t.hp, facing: Math.random() < 0.5 ? -1 : 1, vx: 0, vy: 0,
    state: 'walk', st: 0, alive: true, hitT: 0, flung: null, t: Math.random() * 3, cd: 1.2 + Math.random() * 0.5, dir: 1, blockT: 0, aimed: false, atk: 0 };
  if (d.type === 'bee') { m.shootT = 2; m.bdir = 1; }
  w.mons.push(m); w.monTypes.push(d.type);
}
function playerRect(p) { return { x: p.x, y: p.y, w: p.w, h: p.h }; }
function overlap(a, b) { return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h; }
function addPoof(w, x, y) { w.poofs.push({ x: x, y: y, t: 0, f: w.f }); w.poofLog.push({ f: w.f, x: x, y: y }); }
function addPopup(w, x, y, kind, value, dy) { w.popups.push({ x: x, y: y - (dy || 0), kind: kind, value: value, t: 0 }); }

function creditRun(w, list, x, y, popupYStart) {
  var k = 0;
  list.forEach(function (a) {
    w.run[a.kind] += a.n;
    addPopup(w, x, y, a.kind, Math.min(20, a.n), (popupYStart || 0) + k * 22); k++;
  });
}
/* ===================== 戰鬥 ===================== */
function sgn(v, d) { return v > 0 ? 1 : (v < 0 ? -1 : (d || 1)); }
function distBox(px, py, e) {
  var dx = Math.max(Math.abs(px - e.x) - e.w / 2, 0), dy = Math.max(Math.abs(py - e.y) - e.h / 2, 0);
  return Math.sqrt(dx * dx + dy * dy);
}
function distCell(px, py, c, r) {
  var dx = Math.max(Math.abs(px - (c * T + 20)) - 20, 0), dy = Math.max(Math.abs(py - (r * T + 20)) - 20, 0);
  return Math.sqrt(dx * dx + dy * dy);
}
function cwHit(w, k, d) {
  if (w.cw[k.key] > 0) {
    w.cw[k.key] = Math.max(0, w.cw[k.key] - d);
    if (w.cw[k.key] === 0) addPoof(w, k.c * T + 20, k.r * T + 20);
  }
}
function artState(m) {
  if (m.flung) return 'flung';
  if (m.type === 'boar') return m.state;
  if (m.type === 'shield') return m.blockT > 0 ? 'block' : 'walk';
  if (m.type === 'bee') return m.state;
  return m.air ? 'jump' : 'crouch';
}
function hurtMon(w, m, dmg, o) {
  if (!m.alive) return false;
  if (m.type === 'shield' && !m.flung && (o.kind === 'melee' || o.kind === 'arrow' || o.kind === 'dash')) {
    var side = sgn(o.fromX - m.x, m.facing);
    if (side === m.facing && o.cy >= m.y - m.h / 2) { m.blockT = 0.2; m.hitT = 0.1; return false; }
  }
  m.hp -= dmg; m.hitT = 0.1;
  if (m.hp <= 0) {
    m.alive = false; m.flung = null;
    addPoof(w, m.x, m.y);
    w.events.push({ f: w.f, k: 'k', type: m.type, x: m.x, y: m.y });
    creditRun(w, killIncome(w.lvIdx, m.type), m.x, m.y - 10, 0);
    if (o.atk) {
      var ch = w.chains[o.atk] || (w.chains[o.atk] = { n: 0 });
      ch.n++;
      if (ch.n >= 2) {
        w.chainTexts = w.chainTexts.filter(function (c) { return c.atk !== o.atk; });
        w.chainTexts.push({ atk: o.atk, x: m.x, y: m.y - 20, n: Math.min(20, ch.n), t: 0 });
      }
    }
    return true;
  }
  return false;
}
function fling(m, dir, atk) {
  if (!m.alive || m.flung) return;
  m.flung = { dir: dir, t: 0, hit: {}, atk: atk };
  m.vy = 0; m.vx = 0;
}
function hurtPlayer(w, fromX) {
  var p = w.p;
  if (p.inv > 0 || p.dashT > 0 || w.over) return;
  p.hp -= 1; p.inv = 1; p.kb = 0.15; p.kbv = sgn(p.x - fromX, -p.facing) * 80 / 0.15;
  p.pose = 'hurt'; p.poseT = 0; p.poseHold = 0.25; p.vy = Math.min(p.vy, -200);
}
function wallAhead(w, m, dir) {
  var px = m.x + dir * (m.w / 2 + 2);
  return cellSolidAt(w, px, m.y) || cellSolidAt(w, px, m.y + m.h / 2 - 3);
}
function groundAhead(w, m, dir) { return cellSolidAt(w, m.x + dir * (m.w / 2 + 2), m.y + m.h / 2 + 3); }
function gravityStep(w, m, dt) {
  m.vy = Math.min(m.vy + 2400 * dt, 1300);
  var r = moveBox(w, m, 0, m.vy * dt);
  if (r.hy) { if (m.vy > 0) m.onG = true; m.vy = 0; } else m.onG = false;
  return r;
}
function nearFlag(m) { return m; }

function updMon(w, m, dt) {
  var p = w.p, dx = p.x - m.x, dy = p.y - m.y, r;
  m.t += dt; m.hitT = Math.max(0, m.hitT - dt); m.blockT = Math.max(0, m.blockT - dt);
  if (m.flung) {
    var f = m.flung; f.t += dt;
    r = moveBox(w, m, f.dir * 460 * dt, 0);
    w.mons.forEach(function (o) {
      if (o === m || !o.alive || f.hit[o.id]) return;
      if (o.flung && o.flung.dir === f.dir) return;
      if (!overlap(m, o)) return;
      f.hit[o.id] = true;
      hurtMon(w, o, 2, { kind: 'blast', atk: f.atk });
      if (o.alive) fling(o, f.dir, f.atk);
    });
    if (r.hx) { hurtMon(w, m, 1, { kind: 'blast', atk: f.atk }); if (m.alive) m.flung = null; return; }
    if (f.t >= 0.6) m.flung = null;
    return;
  }
  if (m.type === 'boar') {
    if (m.state === 'walk') {
      if (wallAhead(w, m, m.facing) || !groundAhead(w, m, m.facing)) m.facing = -m.facing;
      moveBox(w, m, m.facing * 80 * dt, 0);
      if (Math.abs(dy) <= 40 && dx * m.facing > 0 && Math.abs(dx) <= 240) { m.state = 'windup'; m.st = 0.5; }
    } else if (m.state === 'windup') {
      m.st -= dt; if (m.st <= 0) m.state = 'charge';
    } else if (m.state === 'charge') {
      if (wallAhead(w, m, m.facing) || !groundAhead(w, m, m.facing)) { m.state = 'stun'; m.st = 1; }
      else { r = moveBox(w, m, m.facing * 420 * dt, 0); if (r.hx) { m.state = 'stun'; m.st = 1; } }
    } else if (m.state === 'stun') {
      m.st -= dt; if (m.st <= 0) m.state = 'walk';
    }
    gravityStep(w, m, dt);
  } else if (m.type === 'shield') {
    if (Math.abs(dx) <= 400 && Math.abs(dy) <= 120) {
      var d = sgn(dx, m.facing); m.facing = d;
      if (!wallAhead(w, m, d) && groundAhead(w, m, d) && Math.abs(dx) > 6) moveBox(w, m, d * 40 * dt, 0);
    } else {
      if (wallAhead(w, m, m.facing) || !groundAhead(w, m, m.facing)) m.facing = -m.facing;
      moveBox(w, m, m.facing * 40 * dt, 0);
    }
    gravityStep(w, m, dt);
  } else if (m.type === 'bee') {
    var near = Math.sqrt(dx * dx + dy * dy) <= 400;
    if (m.state !== 'aim') {
      var ox = m.x; r = moveBox(w, m, m.bdir * 60 * dt, 0);
      if (r.hx || Math.abs(m.x - m.sx) > 120) { m.bdir = -m.bdir; }
      m.facing = m.bdir;
    }
    var ny = m.sy + Math.sin(m.t * Math.PI) * 16;
    if (!boxHits(w, m.x, ny, m.w, m.h)) m.y = ny;
    m.shootT -= dt;
    if (near) {
      if (m.shootT <= 0.4 && m.shootT > 0) { m.state = 'aim'; m.facing = sgn(dx, m.facing); }
      if (m.shootT <= 0) {
        var l = Math.sqrt(dx * dx + dy * dy) || 1;
        w.shots.push({ x: m.x, y: m.y, vx: dx / l * 220, vy: dy / l * 220 });
        m.shootT = 2; m.state = 'fly';
      }
    } else if (m.shootT < 0.4) { m.shootT = 0.4; m.state = 'fly'; }
  } else if (m.type === 'frog') {
    if (m.air) {
      m.vy = Math.min(m.vy + 2400 * dt, 1300);
      r = moveBox(w, m, m.vx * dt, 0); if (r.hx) m.vx = 0;
      r = moveBox(w, m, 0, m.vy * dt);
      if (r.hy) { if (m.vy > 0) { m.air = false; m.vx = 0; m.cd = 1.2; } m.vy = 0; }
    } else {
      gravityStep(w, m, dt);
      m.cd -= dt;
      if (m.cd <= 0) {
        var dir = Math.abs(dx) <= 300 ? sgn(dx, m.facing) : m.facing;
        if (!frogLandOk(w, m, dir)) dir = -dir;
        if (frogLandOk(w, m, dir)) { m.facing = dir; m.vx = 232 * dir; m.vy = -620; m.air = true; }
        else m.cd = 0.3;
      }
    }
  }
}
function frogLandOk(w, m, dir) {
  var tx = m.x + 120 * dir, i;
  if (cellSolidAt(w, tx, m.y) || cellSolidAt(w, tx, m.y - 12) || cellSolidAt(w, m.x + 60 * dir, m.y - 12)) return false;
  for (i = 1; i <= 5; i++) if (cellSolidAt(w, tx, m.y + m.h / 2 + i * 8)) return true;
  return false;
}

function explode(w, x, y) {
  w.expl.push({ x: x, y: y, t: 0 }); w.explLog.push({ f: w.f, x: x, y: y });
  var atk = ++w.atkSeq;
  w.mons.forEach(function (m) { if (m.alive && distBox(x, y, m) <= 60) hurtMon(w, m, 2, { kind: 'blast', atk: atk }); });
  w.lv.cracks.forEach(function (k) { if (w.cw[k.key] > 0 && distCell(x, y, k.c, k.r) <= 60) { w.cw[k.key] = 0; addPoof(w, k.c * T + 20, k.r * T + 20); } });
}
function arrowDir(a) { return a.vx >= 0 ? 1 : -1; }
function updProj(w, dt) {
  var i;
  for (i = w.arrows.length - 1; i >= 0; i--) {
    var a = w.arrows[i], dead = false, n = 3, sx = a.vx * dt / n, sy = a.vy * dt / n, k;
    for (k = 0; k < n && !dead; k++) {
      a.x += sx; a.y += sy;
      var c = Math.floor(a.x / T), r = Math.floor(a.y / T);
      if (a.x < 0 || a.x > W || a.y < 0 || a.y > H) { dead = true; break; }
      if (solidCell(c, r, w.lv, w.cw)) {
        var ck = w.lv.cracks.filter(function (q) { return q.c === c && q.r === r; })[0];
        if (ck) cwHit(w, ck, 1);
        dead = true; break;
      }
      var rect = { x: a.x, y: a.y, w: 24, h: 6 };
      for (var j = 0; j < w.mons.length; j++) {
        var m = w.mons[j];
        if (m.alive && overlap(rect, m)) {
          hurtMon(w, m, 1, { kind: 'arrow', cx: a.x, cy: a.y, fromX: m.x - arrowDir(a) * 100, atk: 0 });
          dead = true; break;
        }
      }
    }
    a.life -= Math.sqrt(a.vx * a.vx + a.vy * a.vy) * dt;
    if (a.life <= 0) dead = true;
    if (dead) w.arrows.splice(i, 1);
  }
  for (i = w.bombs.length - 1; i >= 0; i--) {
    var b = w.bombs[i]; b.t += dt; b.vy += 2400 * dt;
    var hit = false, bn = 3, q;
    for (q = 0; q < bn && !hit; q++) {
      b.x += b.vx * dt / bn; b.y += b.vy * dt / bn;
      if (boxHits(w, b.x, b.y, 16, 16) || b.y > H + 50) hit = true;
      else for (var j2 = 0; j2 < w.mons.length; j2++) if (w.mons[j2].alive && overlap({ x: b.x, y: b.y, w: 16, h: 16 }, w.mons[j2])) { hit = true; break; }
    }
    if (hit) { explode(w, b.x, b.y); w.bombs.splice(i, 1); }
  }
  for (i = w.shots.length - 1; i >= 0; i--) {
    var s = w.shots[i]; s.x += s.vx * dt; s.y += s.vy * dt;
    var gone = cellSolidAt(w, s.x, s.y) || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20;
    if (!gone && overlap({ x: s.x, y: s.y, w: 12, h: 12 }, w.p)) { hurtPlayer(w, s.x - s.vx); gone = true; }
    if (gone) w.shots.splice(i, 1);
  }
  [['expl', 0.25], ['waves', 0.3], ['poofs', 0.3], ['popups', 0.8], ['chainTexts', 0.8]].forEach(function (a) {
    var arr = w[a[0]];
    for (var z = arr.length - 1; z >= 0; z--) { arr[z].t += dt; if (arr[z].t >= a[1]) arr.splice(z, 1); }
  });
  if (w.notice) { w.notice.t += dt; if (w.notice.t >= 1.5) w.notice = null; }
}

/* ===================== 玩家與世界步進 ===================== */
var inp = { left: false, right: false, jump: false, jumpP: false, jumpRel: false, zP: false, xP: false };
function clearEdges() { inp.jumpP = false; inp.jumpRel = false; inp.zP = false; inp.xP = false; }

function setPose(p, pose, hold) { p.pose = pose; p.poseT = 0; p.poseHold = hold; }
function nearestMon(w, p, range) {
  var best = null, bd = range + 1;
  w.mons.forEach(function (m) { if (!m.alive) return; var d = Math.sqrt((m.x - p.x) * (m.x - p.x) + (m.y - p.y) * (m.y - p.y)); if (d < bd) { bd = d; best = m; } });
  return best;
}
function updPlayer(w, dt) {
  var p = w.p, i, cdm = CD_MULT[G.up.cd];
  p.inv = Math.max(0, p.inv - dt); p.atkCd -= dt; p.skillCd -= dt; p.autoCd -= dt; p.poseT += dt; p.poseHold -= dt;
  p.speed = CLS_SPEED[p.cls] * SPEED_MULT[G.up.speed];
  if (p.kb > 0) p.kb -= dt;
  var dirIn = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (p.dashT <= 0 && !p.hookTo && dirIn !== 0) p.facing = dirIn;

  // 技能
  if (inp.xP && p.skillCd <= 0 && p.dashT <= 0 && !p.hookTo) {
    if (p.cls === 'sword') {
      if (p.onGround || p.dashAvail) {
        if (!p.onGround) p.dashAvail = false;
        p.dashT = 0.18; p.dashHit = {}; p.dashAtk = ++w.atkSeq;
        p.skillCdDur = 1.2 * cdm; p.skillCd = p.skillCdDur; setPose(p, 'dash', 0.18); p.vy = 0;
      }
    } else if (p.cls === 'hunter') {
      var rg = null, bd = 221;
      w.lv.rings.forEach(function (rn) { var d = Math.sqrt((rn.x - p.x) * (rn.x - p.x) + (rn.y - p.y) * (rn.y - p.y)); if (d <= 220 && d < bd) { bd = d; rg = rn; } });
      if (rg) { p.hookTo = rg; p.skillCdDur = 0.5 * cdm; p.skillCd = p.skillCdDur; setPose(p, 'hook', 5); p.vy = 0; }
    } else {
      p.skillCdDur = 1.5 * cdm; p.skillCd = p.skillCdDur; setPose(p, 'wave', 0.3);
      var atk = ++w.atkSeq;
      w.waves.push({ x: p.x, y: p.y, t: 0 }); w.waveLog.push({ f: w.f, x: p.x, y: p.y });
      w.mons.forEach(function (m) {
        if (m.alive && distBox(p.x, p.y, m) <= 130) {
          var d = sgn(m.x - p.x, p.facing);
          if (!hurtMon(w, m, 1, { kind: 'blast', atk: atk })) fling(m, d, atk);
        }
      });
      w.lv.cracks.forEach(function (k) { if (w.cw[k.key] > 0 && distCell(p.x, p.y, k.c, k.r) <= 130) { w.cw[k.key] = 0; addPoof(w, k.c * T + 20, k.r * T + 20); } });
    }
  }
  // 攻擊
  if (inp.zP) {
    if (p.cls === 'sword' && p.atkCd <= 0) {
      p.atkCd = 0.3; setPose(p, 'slash', 0.15);
      var box = { x: p.x + p.facing * (14 + 25), y: p.y, w: 50, h: 40 }, atk2 = ++w.atkSeq;
      w.mons.forEach(function (m) { if (m.alive && overlap(box, m)) hurtMon(w, m, 1, { kind: 'melee', cx: box.x, cy: p.y, fromX: p.x, atk: atk2 }); });
      w.lv.cracks.forEach(function (k) { if (w.cw[k.key] > 0 && overlap(box, { x: k.c * T + 20, y: k.r * T + 20, w: 40, h: 40 })) cwHit(w, k, 1); });
    } else if (p.cls === 'hunter' && p.atkCd <= 0) {
      p.atkCd = 0.4; setPose(p, 'shoot', 0.2);
      w.arrows.push({ x: p.x + p.facing * 20, y: p.y, vx: p.facing * 700, vy: 0, life: 600, ang: p.facing === 1 ? 0 : Math.PI });
    } else if (p.cls === 'bomber' && p.atkCd <= 0) {
      p.atkCd = 0.6; setPose(p, 'throw', 0.25);
      w.bombs.push({ x: p.x + p.facing * 16, y: p.y - 10, vx: p.facing * 300, vy: -500, t: 0 });
    }
  }
  // 獵人自動射擊
  if (p.cls === 'hunter' && p.autoCd <= 0) {
    var tg = nearestMon(w, p, 260);
    if (tg) {
      var ax = tg.x - p.x, ay = tg.y - p.y, al = Math.sqrt(ax * ax + ay * ay) || 1;
      w.arrows.push({ x: p.x, y: p.y, vx: ax / al * 700, vy: ay / al * 700, life: 520, ang: Math.atan2(ay, ax) });
      p.autoCd = 0.6;
    }
  }

  var r;
  if (p.hookTo) {
    var hx = p.hookTo.x - p.x, hy = p.hookTo.y - p.y, hl = Math.sqrt(hx * hx + hy * hy), stp = 700 * dt;
    if (hl <= stp) { p.x = p.hookTo.x; p.y = p.hookTo.y; p.hookTo = null; p.vy = -500; p.poseHold = 0.1; }
    else { p.x += hx / hl * stp; p.y += hy / hl * stp; }
    p.onGround = false;
  } else if (p.dashT > 0) {
    p.dashT -= dt;
    r = moveBox(w, p, p.facing * (160 / 0.18) * dt, 0);
    if (r.hx) p.dashT = 0;
    // 沿途傷害
    var db = { x: p.x, y: p.y, w: p.w + 6, h: p.h };
    w.mons.forEach(function (m) {
      if (m.alive && !p.dashHit[m.id] && overlap(db, m)) {
        p.dashHit[m.id] = true;
        var killed = hurtMon(w, m, 2, { kind: 'dash', cx: p.x + p.facing * 14, cy: p.y, fromX: p.x, atk: p.dashAtk });
        if (killed) p.skillCd = 0;
      }
    });
    w.lv.cracks.forEach(function (k) {
      if (w.cw[k.key] > 0 && !p.dashHit['c' + k.key] && overlap(db, { x: k.c * T + 20, y: k.r * T + 20, w: 40, h: 40 })) { p.dashHit['c' + k.key] = true; cwHit(w, k, 1); }
    });
    p.onGround = onFloor(w, p);
  } else {
    var vx = p.kb > 0 ? p.kbv : dirIn * p.speed;
    moveBox(w, p, vx * dt, 0);
    if (inp.jumpP && p.onGround) { p.vy = -720; p.jumpT = 0; p.jumpCut = false; p.jumpHeld = true; p.onGround = false; }
    if (inp.jump) p.jumpT += dt;
    if (inp.jumpRel && p.jumpT < 0.15 && p.vy < 0 && !p.jumpCut) { p.vy *= 0.5; p.jumpCut = true; }
    p.vy = Math.min(p.vy + 2400 * dt, 1300);
    r = moveBox(w, p, 0, p.vy * dt);
    if (r.hy) { if (p.vy > 0) { p.dashAvail = true; } p.vy = 0; }
    p.onGround = onFloor(w, p);
    if (p.onGround) p.dashAvail = true;
  }
  if (p.x < p.w / 2) p.x = p.w / 2;
  if (p.x > W - p.w / 2) p.x = W - p.w / 2;
  // 動作姿勢
  if (p.poseHold <= 0 && !p.hookTo && p.dashT <= 0) {
    var np = !p.onGround ? (p.vy < 0 ? 'rise' : 'fall') : (dirIn !== 0 ? 'run' : 'idle');
    if (np !== p.pose) { p.pose = np; p.poseT = 0; }
  }
  // 怪物接觸
  if (p.inv <= 0 && p.dashT <= 0) {
    for (i = 0; i < w.mons.length; i++) {
      var m = w.mons[i];
      if (m.alive && !m.flung && overlap(w.p, m)) { hurtPlayer(w, m.x); break; }
    }
  }
}

function levelStep(w) {
  if (w.over) return;
  var dt = DT, p = w.p, i;
  updPlayer(w, dt);
  w.mons.forEach(function (m) { if (m.alive) updMon(w, m, dt); });
  updProj(w, dt);
  // 撿素材
  var pr = playerRect(p);
  w.lv.pick.forEach(function (k) {
    if (w.taken[k.id]) return;
    if (overlap(pr, { x: k.x, y: k.y, w: 24, h: 24 })) {
      w.taken[k.id] = true; w.takenAt[k.id] = w.f;
      w.events.push({ f: w.f, k: 'p', kind: k.kind, x: k.x, y: k.y });
      creditRun(w, pickupIncome(w.lvIdx, k.kind), k.x, k.y, 0);
    }
  });
  // 寶箱
  var ch = w.lv.chest;
  if (ch && w.chestAt < 0 && !G.chestTaken[w.lvIdx] && overlap(pr, { x: ch.x, y: ch.y, w: 40, h: 36 })) {
    w.chestAt = w.f; w.item = CHEST_ITEM[w.lvIdx]; w.notice = { type: w.item, t: 0 };
  }
  // 失敗
  var fail = p.hp <= 0 || p.y - 22 > H;
  if (!fail && p.dashT <= 0) {
    var c0 = Math.floor((p.x - 14) / T), c1 = Math.floor((p.x + 13.99) / T), r0 = Math.floor((p.y - 22) / T), r1 = Math.floor((p.y + 21.99) / T);
    for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
      if (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && w.lv.g[rr][cc] === 4 && overlap(pr, { x: cc * T + 20, y: rr * T + 30, w: 40, h: 20 })) fail = true;
    }
  }
  snapshot(w);
  if (fail) { w.over = true; w.state = 'fail'; return; }
  // 過關
  var g = w.lv.goal;
  if (overlap(pr, { x: g.x, y: g.y, w: 40, h: 80 })) { w.over = true; w.state = 'clear'; w.reachedF = w.f; return; }
  w.f++;
}
function snapshot(w) {
  var p = w.p;
  w.frames.push({
    p: [p.x, p.y, p.facing, p.pose, p.poseT, p.inv > 0 && Math.floor(w.f / 4) % 2 === 0],
    cls: p.cls,
    m: w.mons.map(function (m) { return [m.x, m.y, m.facing, artState(m), m.hitT > 0, m.alive]; }),
    ar: w.arrows.map(function (a) { return [a.x, a.y, a.ang]; }),
    bo: w.bombs.map(function (b) { return [b.x, b.y, b.t]; }),
    sh: w.shots.map(function (s) { return [s.x, s.y]; }),
    cw: w.lv.cracks.map(function (k) { return w.cw[k.key]; })
  });
}

/* ===================== 繪製: 場景 / 回放 ===================== */
var tAnim = 0;
function slotItem(lvIdx, b) {
  for (var i = 0; i < G.inv.length; i++) { var it = G.inv[i]; if (it.where && it.where.level === lvIdx && it.where.b === b) return it.type; }
  return null;
}
function monView(type, x, y, facing, state, hit) { return { type: type, x: x, y: y, facing: facing, state: state, hit: hit }; }
function liveView(w) {
  var p = w.p;
  return {
    lv: w.lv, t: tAnim,
    taken: function (id) { return !!w.taken[id]; },
    chestOpen: w.chestAt >= 0 || G.chestTaken[w.lvIdx],
    reached: w.state === 'clear',
    p: { x: p.x, y: p.y, cls: p.cls, facing: p.facing, pose: p.pose, poseT: p.poseT, inv: p.inv > 0 && Math.floor(w.f / 4) % 2 === 0 },
    hook: p.hookTo,
    mons: w.mons.filter(function (m) { return m.alive; }).map(function (m) { return monView(m.type, m.x, m.y, m.facing, artState(m), m.hitT > 0); }),
    ar: w.arrows.map(function (a) { return [a.x, a.y, a.ang]; }),
    bo: w.bombs.map(function (b) { return [b.x, b.y, b.t]; }),
    sh: w.shots.map(function (s) { return [s.x, s.y]; }),
    cw: function (k) { return w.cw[k.key]; },
    expl: w.expl.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    waves: w.waves.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    poofs: w.poofs.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    hl: -1
  };
}
function replayView(i, hl) {
  var rec = G.replay[i], lv = levels[i], fi = Math.min(rec.frames.length - 1, Math.floor(G.pos[i])), fr = rec.frames[fi];
  function eff(log, dur) {
    var out = [];
    log.forEach(function (e) { var d = (fi - e.f) * DT; if (d >= 0 && d < dur) out.push({ x: e.x, y: e.y, t: d }); });
    return out;
  }
  var mons = [];
  fr.m.forEach(function (m, k) { if (m[5]) mons.push(monView(rec.monTypes[k], m[0], m[1], m[2], m[3], m[4])); });
  return {
    lv: lv, t: tAnim,
    taken: function (id) { return rec.takenAt[id] !== undefined && rec.takenAt[id] <= fi; },
    chestOpen: rec.chestAt >= 0 ? fi >= rec.chestAt : G.chestTaken[i],
    reached: fi >= rec.frames.length - 1,
    p: { x: fr.p[0], y: fr.p[1], cls: fr.cls, facing: fr.p[2], pose: fr.p[3], poseT: fr.p[4], inv: fr.p[5] },
    hook: null, mons: mons, ar: fr.ar, bo: fr.bo, sh: fr.sh,
    cw: function (k) { return fr.cw[k.i]; },
    expl: eff(rec.explLog, 0.25), waves: eff(rec.waveLog, 0.3), poofs: eff(rec.poofLog, 0.3), hl: hl === undefined ? -1 : hl
  };
}
function staticView(i, hl) {
  var lv = levels[i], mons = [];
  lv.mons.forEach(function (d) {
    if (d.lodge >= 0 && !G.repaired[i][d.lodge]) return;
    mons.push(monView(d.type, d.x, d.y, 1, d.type === 'bee' ? 'fly' : (d.type === 'frog' ? 'crouch' : 'walk'), false));
  });
  return { lv: lv, t: tAnim, taken: function () { return false; }, chestOpen: G.chestTaken[i], reached: false, p: null, hook: null, mons: mons, ar: [], bo: [], sh: [], cw: function () { return 3; }, expl: [], waves: [], poofs: [], hl: hl === undefined ? -1 : hl };
}
function drawScene(ctx, v, thumb) {
  var lv = v.lv, rep = G.repaired[lv.idx], r, c;
  Art.drawBackground(ctx, {});
  lv.blds.forEach(function (b) {
    Art.drawBuilding(ctx, { x: b.c * T, y: b.top * T, w: b.w * T, h: b.h * T, btype: b.btype, repaired: rep[b.idx], t: v.t });
  });
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
    var t = lv.g[r][c];
    if (!t) continue;
    var cx = c * T + 20, cy = r * T + 20, top = !staticSolid(c, r - 1, lv), bi = lv.bid[r][c];
    if (t === 1) Art.drawGround(ctx, { x: cx, y: cy, top: top, theme: lv.theme });
    else if (t === 2) Art.drawBuildingWall(ctx, { x: cx, y: cy, top: top, btype: lv.blds[bi].btype, repaired: rep[bi] });
    else if (t === 3) {
      var k = null; for (var q = 0; q < lv.cracks.length; q++) if (lv.cracks[q].c === c && lv.cracks[q].r === r) { k = lv.cracks[q]; break; }
      var hp = k ? v.cw(k) : 3;
      if (hp > 0) Art.drawCrackWall(ctx, { x: cx, y: cy, hp: hp });
    } else if (t === 4) Art.drawSpike(ctx, { x: cx, y: cy });
    else if (t === 5) { if (!rep[bi]) Art.drawDoorRubble(ctx, { x: cx, y: cy }); }
    else if (t === 6) { Art.drawBuildingWall(ctx, { x: cx, y: cy, top: true, btype: lv.blds[bi].btype, repaired: rep[bi] }); }
  }
  lv.blds.forEach(function (b) {
    if (rep[b.idx]) Art.drawBuildingSlot(ctx, { x: b.slotC * T + 20, y: b.slotR * T + 20, btype: b.btype, item: slotItem(lv.idx, b.idx), selected: v.hl === b.idx });
  });
  lv.rings.forEach(function (rn) { Art.drawHookRing(ctx, { x: rn.x, y: rn.y }); });
  lv.pick.forEach(function (k) { if (!v.taken(k.id)) Art.drawPickup(ctx, { x: k.x, y: k.y, kind: k.kind, t: v.t }); });
  if (lv.chest) Art.drawChest(ctx, { x: lv.chest.x, y: lv.chest.y, open: v.chestOpen });
  Art.drawGoal(ctx, { x: lv.goal.x, y: lv.goal.y, reached: v.reached });
  v.mons.forEach(function (m) {
    var s = { x: m.x, y: m.y, facing: m.facing, state: m.state, hit: m.hit, t: v.t };
    if (m.type === 'boar') Art.drawBoar(ctx, s);
    else if (m.type === 'shield') Art.drawShieldman(ctx, s);
    else if (m.type === 'bee') Art.drawShooterBee(ctx, s);
    else Art.drawFrog(ctx, { x: m.x, y: m.y, facing: m.facing, state: m.state, hit: m.hit });
  });
  if (v.p) {
    if (v.hook && !thumb) {
      ctx.save(); ctx.strokeStyle = '#d8d0b0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(v.p.x, v.p.y - 6); ctx.lineTo(v.hook.x, v.hook.y); ctx.stroke(); ctx.restore();
    }
    if (v.p.cls === 'hunter' && !thumb) Art.drawRangeRing(ctx, { x: v.p.x, y: v.p.y, radius: 260 });
    Art.drawPlayer(ctx, { x: v.p.x, y: v.p.y, cls: v.p.cls, facing: v.p.facing, pose: v.p.pose, poseT: v.p.poseT, invuln: v.p.inv });
  }
  v.ar.forEach(function (a) { Art.drawArrow(ctx, { x: a[0], y: a[1], angle: a[2] }); });
  v.bo.forEach(function (b) { Art.drawBomb(ctx, { x: b[0], y: b[1], t: b[2] }); });
  v.sh.forEach(function (s) { Art.drawBeeShot(ctx, { x: s[0], y: s[1] }); });
  v.expl.forEach(function (e) { Art.drawExplosion(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.25, radius: 60 }); });
  v.waves.forEach(function (e) { Art.drawShockwave(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.3, radius: 130 }); });
  v.poofs.forEach(function (e) { Art.drawPoof(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.3 }); });
}
function drawThumb(ctx, x, y, v) {
  ctx.save();
  ctx.translate(x + 8, y + 8); ctx.scale(0.125, 0.125);
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  drawScene(ctx, v, true);
  ctx.restore();
}

/* ===================== 回放引擎與素材飛行 ===================== */
var flights = [], bump = { wood: 0.15, brick: 0.15, time: 0.15, soul: 0.15 };
var S = { scene: 'guide', guidePage: 0, paused: false, pauseScene: null, cursor: 1, lp: { row: 0, cls: 0, bld: 0, lv: 1 }, upg: { row: 0, rec: 0 }, world: null, result: null, totalTime: 0, started: false };
function mapFlightOK() { return S.scene === 'map' && !S.paused; }
function giveStock(kind, n) { G.stock[kind] += n; bump[kind] = 0; }
function giveReplay(i, list, x, y) {
  list.forEach(function (a) {
    if (!mapFlightOK()) { giveStock(a.kind, a.n); return; }
    var cp = CARD_POS[i], sx = cp[0] + 8 + x * 0.125, sy = cp[1] + 8 + y * 0.125, cnt = Math.min(5, a.n), k;
    for (k = 0; k < cnt; k++) {
      var val = (k === cnt - 1) ? a.n - (cnt - 1) : 1;
      flights.push({ kind: a.kind, n: val, x0: sx + (Math.random() * 12 - 6), y0: sy + (Math.random() * 12 - 6), t: 0 });
    }
  });
}
function fireEvents(i, rec, limit) {
  while (G.idx[i] < rec.events.length && rec.events[G.idx[i]].f < limit) {
    var e = rec.events[G.idx[i]++];
    giveReplay(i, e.k === 'p' ? pickupIncome(i, e.kind) : killIncome(i, e.type), e.x, e.y);
  }
}
function clearGive(i) {
  G.inv.forEach(function (it) {
    if (!it.where || it.where.level !== i || ITEM_CAT[it.type] !== 'storage') return;
    var b = levels[i].blds[it.where.b], list = [];
    if (it.type === 'bagWood') list.push({ kind: 'wood', n: 4 }); else if (it.type === 'bagBrick') list.push({ kind: 'brick', n: 3 });
    else if (it.type === 'bagTime') list.push({ kind: 'time', n: 2 }); else list.push({ kind: 'soul', n: 2 });
    giveReplay(i, list, b.slotC * T + 20, b.slotR * T + 20);
  });
}
function replayStep(i) {
  var rec = G.replay[i]; if (!rec) return;
  var N = rec.frames.length, np = G.pos[i] + ACCEL_MULT[G.accel[i]];
  fireEvents(i, rec, np >= N ? N : np);
  if (np >= N) { clearGive(i); np -= N; G.idx[i] = 0; fireEvents(i, rec, np); }
  G.pos[i] = np;
}
function updFlights() {
  for (var i = flights.length - 1; i >= 0; i--) {
    var f = flights[i]; f.t += DT;
    if (f.t >= 0.7) { giveStock(f.kind, f.n); flights.splice(i, 1); }
  }
  KINDS.forEach(function (k) { bump[k] = Math.min(0.15, bump[k] + DT); });
}
function flightPos(f) {
  var u = f.t / 0.7, tg = HUD_TARGET[f.kind];
  return { x: f.x0 + (tg[0] - f.x0) * u, y: f.y0 + (tg[1] - f.y0) * u - Math.sin(Math.PI * u) * 70 };
}

/* ===================== 大地圖 / 面板 ===================== */
var FONT = '"Microsoft JhengHei","PingFang TC",sans-serif';
var NAV_COLS = [[1, 'W'], [2, 3], [4, 5, 6, 7], [8], ['G']];
var LINKS = [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [6, 8]];
function cost4(w, b, t, s) { return { wood: w || 0, brick: b || 0, time: t || 0, soul: s || 0 }; }
function copyStock() { return { wood: G.stock.wood, brick: G.stock.brick, time: G.stock.time, soul: G.stock.soul }; }
function cardState(i) {
  if (G.replay[i]) return 'cleared';
  if (G.unlocked[i]) return 'open';
  var ps = PARENTS[i] || [];
  return ps.some(function (p) { return !!G.replay[p]; }) ? 'buyable' : 'sealed';
}
function builtCount(i) { return (G.repaired[i][0] ? 1 : 0) + (G.repaired[i][1] ? 1 : 0); }
function newArea(i) { return !!G.replay[i] && G.lastRebuild[i] > G.replay[i].seq; }
function nodeCY(n) { return n === 'W' ? WORKSHOP_POS[1] + 68 : (n === 'G' ? GOAL_POS[1] + 68 : CARD_POS[n][1] + 68); }
function navMap(key) {
  var ci = 0, i, j;
  for (i = 0; i < NAV_COLS.length; i++) if (NAV_COLS[i].indexOf(S.cursor) >= 0) ci = i;
  var col = NAV_COLS[ci];
  if (key === 'up' || key === 'down') {
    var k = col.indexOf(S.cursor) + (key === 'up' ? -1 : 1);
    if (k >= 0 && k < col.length) S.cursor = col[k];
  } else {
    var nc = ci + (key === 'left' ? -1 : 1);
    if (nc < 0 || nc >= NAV_COLS.length) return;
    var best = null, bd = 1e9, cy = nodeCY(S.cursor);
    NAV_COLS[nc].forEach(function (n) { var d = Math.abs(nodeCY(n) - cy); if (d < bd) { bd = d; best = n; } });
    S.cursor = best;
  }
}
function anyAffordable() {
  if (!G.owned.hunter && G.stock.wood >= 30) return true;
  if (!G.owned.bomber && G.stock.wood >= 30) return true;
  if (G.up.speed < 3 && G.stock.soul >= SPEED_COST[G.up.speed]) return true;
  if (G.up.hp < 2 && G.stock.soul >= HP_COST[G.up.hp]) return true;
  if (G.up.cd < 3 && G.stock.soul >= CD_COST[G.up.cd]) return true;
  return false;
}
function drawHudMap(ctx) {
  Art.drawHud(ctx, { mode: 'map', stock: copyStock(), ratePerMin: allRates(), bumpT: { wood: bump.wood, brick: bump.brick, time: bump.time, soul: bump.soul }, bumpDur: 0.15, time: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null });
}
function drawMap(ctx, showCursor) {
  Art.drawMapBackground(ctx, {});
  LINKS.forEach(function (l) {
    var a = CARD_POS[l[0]], b = CARD_POS[l[1]];
    Art.drawMapLink(ctx, { x1: a[0] + 176, y1: a[1] + 68, x2: b[0], y2: b[1] + 68, lit: !!G.replay[l[0]] });
  });
  for (var i = 1; i <= 8; i++) {
    var cp = CARD_POS[i], st = cardState(i), rec = G.replay[i], cost = cost4(UNLOCK_COST[i]);
    Art.drawLevelCard(ctx, {
      x: cp[0], y: cp[1], index: i, name: LEVEL_NAME[i], state: st, cost: cost, stock: copyStock(), canAfford: G.stock.wood >= cost.wood,
      rates: rec ? ratesOf(rec, i, G.accel[i]) : cost4(), recordCls: rec ? rec.cls : null, recordTime: rec ? Math.round(rec.frames.length * DT * 10) / 10 : null, builtCount: builtCount(i)
    });
    if (st === 'open') drawThumb(ctx, cp[0], cp[1], staticView(i));
    else if (st === 'cleared') drawThumb(ctx, cp[0], cp[1], replayView(i));
    Art.drawCardOverlay(ctx, { x: cp[0], y: cp[1], accelLv: G.accel[i], newArea: newArea(i), selected: showCursor && S.cursor === i });
  }
  Art.drawWorkshopCard(ctx, { x: WORKSHOP_POS[0], y: WORKSHOP_POS[1], anyAffordable: anyAffordable(), selected: showCursor && S.cursor === 'W' });
  Art.drawGoalCard(ctx, { x: GOAL_POS[0], y: GOAL_POS[1], cost: cost4(GOAL_COST.wood, GOAL_COST.brick, GOAL_COST.time, GOAL_COST.soul), stock: copyStock(), canAfford: canPay(GOAL_COST), selected: showCursor && S.cursor === 'G' });
  flights.forEach(function (f) { var p = flightPos(f); Art.drawFlyingMaterial(ctx, { x: p.x, y: p.y, kind: f.kind, t: f.t, dur: 0.7 }); });
  drawHudMap(ctx);
  ctx.save(); ctx.fillStyle = '#e8e8e8'; ctx.font = '16px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', W / 2, 702); ctx.restore();
}
function panelData() {
  var lv = S.lp.lv, rec = G.replay[lv];
  return {
    index: lv, name: LEVEL_NAME[lv], row: S.lp.row,
    classes: CLS_LIST.map(function (c) { return { cls: c, owned: !!G.owned[c] }; }), clsSel: S.lp.cls,
    buildings: [0, 1].map(function (b) {
      var bl = levels[lv].blds[b];
      return { btype: bl.btype, repaired: G.repaired[lv][b], cost: cost4(0, REBUILD[lv - 1][b]), item: slotItem(lv, b), hasFitItem: G.inv.some(function (it) { return ITEM_CAT[it.type] === bl.btype; }) };
    }),
    bldSel: S.lp.bld,
    items: G.inv.map(function (it) { return { type: it.type, where: it.where ? { level: it.where.level, building: it.where.b + 1, btype: levels[it.where.level].blds[it.where.b].btype } : null }; }),
    accelLv: G.accel[lv], accelCost: G.accel[lv] < 2 ? cost4(0, 0, ACCEL_COST[G.accel[lv]]) : null, stock: copyStock(),
    recordCls: rec ? rec.cls : null, recordTime: rec ? Math.round(rec.frames.length * DT * 10) / 10 : null, rates: rec ? ratesOf(rec, lv, G.accel[lv]) : null, newArea: newArea(lv)
  };
}
function drawLevelPanelScreen(ctx) {
  drawMap(ctx, false);
  Art.drawLevelPanel(ctx, panelData());
  var lv = S.lp.lv, hl = S.lp.row === 1 ? S.lp.bld : -1;
  ctx.save(); ctx.translate(60, 96); ctx.scale(0.5, 0.5); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  drawScene(ctx, staticView(lv, hl), true);
  ctx.restore();
  if (S.lp.row === 1) {
    var b = levels[lv].blds[S.lp.bld];
    Art.drawSiteHighlight(ctx, { x: 60 + b.c * 20, y: 96 + b.top * 20, w: b.w * 20, h: b.h * 20, active: true });
  }
  drawHudMap(ctx);
}
function drawUpgradeScreen(ctx) {
  drawMap(ctx, false);
  Art.drawUpgradePage(ctx, {
    row: S.upg.row,
    recruits: [{ cls: 'hunter', owned: G.owned.hunter, cost: cost4(30) }, { cls: 'bomber', owned: G.owned.bomber, cost: cost4(30) }],
    recruitSel: S.upg.rec,
    stats: [
      { key: 'speed', lv: G.up.speed, maxLv: 3, cost: G.up.speed < 3 ? cost4(0, 0, 0, SPEED_COST[G.up.speed]) : null },
      { key: 'hp', lv: G.up.hp, maxLv: 2, cost: G.up.hp < 2 ? cost4(0, 0, 0, HP_COST[G.up.hp]) : null },
      { key: 'cd', lv: G.up.cd, maxLv: 3, cost: G.up.cd < 3 ? cost4(0, 0, 0, CD_COST[G.up.cd]) : null }
    ],
    stock: copyStock()
  });
  drawHudMap(ctx);
}
/* 說明頁 */
var GUIDE = [
  { title: '衝到終點', text: '碰到旗子就過關', w: 672, h: 378 },
  { title: '操作', text: '空白鍵跳、Z 攻擊、X 技能(Esc 暫停)', w: 840, h: 308 },
  { title: '過關後一直重播', text: '過關的關卡會一直重播賺素材', w: 672, h: 420 },
  { title: '撿多還是跑快', text: '撿越多、跑越快, 重播賺越快', w: 784, h: 336 },
  { title: '重建廢墟', text: '花磚瓦重建, 建築就能進去', w: 784, h: 336 }
];
function drawGuide(ctx) {
  var g = GUIDE[S.guidePage];
  Art.drawMapBackground(ctx, {});
  ctx.save(); ctx.fillStyle = 'rgba(8,12,20,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 40px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('廢墟復興 — ' + g.title, W / 2, 56);
  ctx.fillStyle = '#ffffff'; ctx.font = '26px ' + FONT; ctx.fillText(g.text, W / 2, 112);
  ctx.restore();
  Art.drawGuidePage(ctx, { page: S.guidePage, x: Math.round((W - g.w) / 2), y: 160, w: g.w, h: g.h });
  ctx.save(); ctx.fillStyle = '#cfd8e6'; ctx.font = '18px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((S.guidePage + 1) + ' / ' + GUIDE.length, W / 2, 640);
  ctx.fillText('← → 翻頁    Z ' + (S.guidePage === GUIDE.length - 1 ? '開始' : '下一頁'), W / 2, 676);
  ctx.restore();
}
/* 關卡內 */
function drawPlay(ctx) {
  var w = S.world;
  drawScene(ctx, liveView(w), false);
  w.popups.forEach(function (p) { Art.drawPopup(ctx, { x: p.x, y: p.y, t: p.t, dur: 0.8, kind: p.kind, value: p.value }); });
  w.chainTexts.forEach(function (c) { Art.drawChainText(ctx, { x: c.x, y: c.y, n: c.n, t: c.t, dur: 0.8 }); });
  if (w.notice) Art.drawItemNotice(ctx, { type: w.notice.type, t: w.notice.t, dur: 1.5 });
  var p = w.p;
  Art.drawHud(ctx, { mode: 'level', stock: copyStock(), ratePerMin: allRates(), bumpT: { wood: bump.wood, brick: bump.brick, time: bump.time, soul: bump.soul }, bumpDur: 0.15,
    time: Math.round(w.f * DT * 10) / 10, run: { wood: w.run.wood, brick: w.run.brick, time: w.run.time, soul: w.run.soul }, hp: Math.max(0, p.hp), maxHp: maxHp(),
    skillCdT: Math.max(0, p.skillCdDur - Math.max(0, p.skillCd)), skillCdDur: p.skillCdDur, cls: p.cls });
}

/* ===================== 流程 ===================== */
function startLevel(i, cls) {
  S.lp.lv = i; G.lastCls[i] = cls;
  S.world = newWorld(i, cls); S.scene = 'play'; S.paused = false; clearEdges();
}
function finishClear(w) {
  var i = w.lvIdx;
  clearIncome(i).forEach(function (a) { w.run[a.kind] += a.n; });
  KINDS.forEach(function (k) { if (w.run[k]) giveStock(k, w.run[k]); });
  if (w.item) { G.inv.push({ type: w.item, where: null }); G.chestTaken[i] = true; }
  var rec = { frames: w.frames, events: w.events, cls: w.cls, poofLog: w.poofLog, explLog: w.explLog, waveLog: w.waveLog, takenAt: w.takenAt, chestAt: w.chestAt, monTypes: w.monTypes, seq: G.seq };
  var old = G.replay[i];
  var res = { rec: rec, lv: i, time: rec.frames.length * DT, run: { wood: w.run.wood, brick: w.run.brick, time: w.run.time, soul: w.run.soul }, cls: w.cls, item: w.item, rates: ratesOf(rec, i, G.accel[i]), oldTime: null, oldRates: null, oldCls: null };
  if (!old) { G.replay[i] = rec; G.pos[i] = 0; G.idx[i] = 0; }
  else { res.oldTime = old.frames.length * DT; res.oldRates = ratesOf(old, i, G.accel[i]); res.oldCls = old.cls; }
  S.result = res; S.scene = 'result';
}
function buyOrRebuild() {
  var lv = S.lp.lv, b = S.lp.bld;
  if (!G.repaired[lv][b]) {
    var c = cost4(0, REBUILD[lv - 1][b]);
    if (canPay(c)) { pay(c); G.repaired[lv][b] = true; G.seq++; G.lastRebuild[lv] = G.seq; }
  } else cycleItem(lv, b);
}
function cycleItem(lv, b) {
  var bt = levels[lv].blds[b].btype, fit = [], cur = -1, i;
  G.inv.forEach(function (it, k) { if (ITEM_CAT[it.type] === bt) fit.push(k); if (it.where && it.where.level === lv && it.where.b === b) cur = k; });
  if (!fit.length) return;
  var next = -1;
  if (cur < 0) next = fit[0]; else { var pos = fit.indexOf(cur); next = pos + 1 < fit.length ? fit[pos + 1] : -1; }
  if (cur >= 0) G.inv[cur].where = null;
  if (next >= 0) G.inv[next].where = { level: lv, b: b };
}
function inputDown(key) {
  if (key === 'left') inp.left = true; else if (key === 'right') inp.right = true; else if (key === 'jump') inp.jump = true;
  var sc = S.scene;
  if (key === 'esc') {
    if (S.paused) { S.paused = false; S.pauseScene = null; }
    else if (sc === 'play' || sc === 'map' || sc === 'levelPanel' || sc === 'upgrade') { S.paused = true; S.pauseScene = sc; }
    return;
  }
  if (S.paused) {
    if (S.pauseScene === 'play') {
      if (key === 'z') { var w0 = S.world; startLevel(w0.lvIdx, w0.cls); }
      else if (key === 'x') { S.paused = false; S.pauseScene = null; S.world = null; S.scene = 'map'; }
    }
    return;
  }
  if (sc === 'guide') {
    if (key === 'left') S.guidePage = Math.max(0, S.guidePage - 1);
    else if (key === 'right') S.guidePage = Math.min(GUIDE.length - 1, S.guidePage + 1);
    else if (key === 'z') { if (S.guidePage < GUIDE.length - 1) S.guidePage++; else S.scene = 'map'; }
  } else if (sc === 'map') {
    if (key === 'left' || key === 'right' || key === 'up' || key === 'down') navMap(key);
    else if (key === 'jump') { S.scene = 'guide'; S.guidePage = 0; }
    else if (key === 'z') {
      var c = S.cursor;
      if (c === 'W') { S.scene = 'upgrade'; S.upg = { row: 0, rec: 0 }; }
      else if (c === 'G') { if (canPay(GOAL_COST)) { pay(GOAL_COST); G.won = true; S.scene = 'ending'; } }
      else {
        var st = cardState(c);
        if (st === 'buyable') { if (G.stock.wood >= UNLOCK_COST[c]) { G.stock.wood -= UNLOCK_COST[c]; G.unlocked[c] = true; } }
        else if (st === 'open' || st === 'cleared') {
          var lc = CLS_LIST.indexOf(G.lastCls[c]);
          S.lp = { row: 0, cls: lc < 0 ? 0 : lc, bld: 0, lv: c }; S.scene = 'levelPanel';
        }
      }
    }
  } else if (sc === 'levelPanel') {
    var lp = S.lp;
    if (key === 'up') lp.row = Math.max(0, lp.row - 1);
    else if (key === 'down') lp.row = Math.min(2, lp.row + 1);
    else if (key === 'left') { if (lp.row === 0) lp.cls = Math.max(0, lp.cls - 1); else if (lp.row === 1) lp.bld = 0; }
    else if (key === 'right') { if (lp.row === 0) lp.cls = Math.min(2, lp.cls + 1); else if (lp.row === 1) lp.bld = 1; }
    else if (key === 'x') S.scene = 'map';
    else if (key === 'z') {
      if (lp.row === 0) { if (G.owned[CLS_LIST[lp.cls]]) startLevel(lp.lv, CLS_LIST[lp.cls]); }
      else if (lp.row === 1) buyOrRebuild();
      else if (G.accel[lp.lv] < 2) { var ac = cost4(0, 0, ACCEL_COST[G.accel[lp.lv]]); if (canPay(ac)) { pay(ac); G.accel[lp.lv]++; } }
    }
  } else if (sc === 'upgrade') {
    var u = S.upg;
    if (key === 'up') u.row = Math.max(0, u.row - 1);
    else if (key === 'down') u.row = Math.min(3, u.row + 1);
    else if (key === 'left') { if (u.row === 0) u.rec = 0; }
    else if (key === 'right') { if (u.row === 0) u.rec = 1; }
    else if (key === 'x') S.scene = 'map';
    else if (key === 'z') {
      if (u.row === 0) { var cn = u.rec === 0 ? 'hunter' : 'bomber'; if (!G.owned[cn] && G.stock.wood >= 30) { G.stock.wood -= 30; G.owned[cn] = true; } }
      else {
        var nm = u.row === 1 ? 'speed' : (u.row === 2 ? 'hp' : 'cd'), tbl = u.row === 1 ? SPEED_COST : (u.row === 2 ? HP_COST : CD_COST);
        var lvv = G.up[nm];
        if (lvv < tbl.length && G.stock.soul >= tbl[lvv]) { G.stock.soul -= tbl[lvv]; G.up[nm]++; }
      }
    }
  } else if (sc === 'play') {
    if (key === 'jump') inp.jumpP = true; else if (key === 'z') inp.zP = true; else if (key === 'x') inp.xP = true;
  } else if (sc === 'result') {
    var rs = S.result;
    if (rs.oldTime === null) { if (key === 'z') { S.scene = 'map'; S.world = null; } }
    else if (key === 'z') { G.replay[rs.lv] = rs.rec; G.pos[rs.lv] = 0; G.idx[rs.lv] = 0; S.scene = 'map'; S.world = null; }
    else if (key === 'x') { S.scene = 'map'; S.world = null; }
  } else if (sc === 'fail') {
    if (key === 'z') { var w1 = S.world; startLevel(w1.lvIdx, w1.cls); }
    else if (key === 'x') { S.scene = 'map'; S.world = null; }
  } else if (sc === 'ending') {
    if (key === 'z') { newGame(); flights = []; S.totalTime = 0; S.scene = 'guide'; S.guidePage = 0; S.cursor = 1; S.world = null; S.paused = false; }
  }
}
function inputUp(key) {
  if (key === 'left') inp.left = false; else if (key === 'right') inp.right = false;
  else if (key === 'jump') { inp.jump = false; if (S.scene === 'play' && !S.paused) inp.jumpRel = true; }
}
var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'jump', z: 'z', Z: 'z', x: 'x', X: 'x', Escape: 'esc' };
window.addEventListener('keydown', function (e) {
  var k = KEYMAP[e.key]; if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  inputDown(k);
});
window.addEventListener('keyup', function (e) {
  var k = KEYMAP[e.key]; if (!k) return;
  e.preventDefault(); inputUp(k);
});
window.addEventListener('blur', function () { inp.left = false; inp.right = false; inp.jump = false; clearEdges(); });

/* ===================== 主迴圈 / 畫布 ===================== */
var canvas = document.getElementById('cv'), ctx = canvas.getContext('2d');
function resize() {
  var wrap = document.getElementById('wrap'), rc = wrap.getBoundingClientRect();
  var cw = rc.width || window.innerWidth, ch = rc.height || window.innerHeight;
  var sc = Math.min(cw / W, ch / H), cssW = W * sc, cssH = H * sc, dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width = Math.max(1, Math.round(cssW * dpr)); canvas.height = Math.max(1, Math.round(cssH * dpr));
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

function stepAll() {
  var run = !S.paused && S.scene !== 'guide' && S.scene !== 'ending';
  if (run) {
    tAnim += DT; S.totalTime += DT;
    if (S.scene === 'play') {
      levelStep(S.world);
      if (S.world.state === 'clear') finishClear(S.world);
      else if (S.world.state === 'fail') S.scene = 'fail';
    }
    for (var i = 1; i <= 8; i++) replayStep(i);
    updFlights();
  }
  clearEdges();
}
function draw() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  var sc = S.scene;
  if (sc === 'guide') drawGuide(ctx);
  else if (sc === 'map' || sc === 'ending') drawMap(ctx, sc === 'map');
  else if (sc === 'levelPanel') drawLevelPanelScreen(ctx);
  else if (sc === 'upgrade') drawUpgradeScreen(ctx);
  else if (sc === 'play' || sc === 'result' || sc === 'fail') drawPlay(ctx);
  if (sc === 'result') {
    var r = S.result;
    Art.drawResultPanel(ctx, { time: Math.round(r.time * 10) / 10, run: r.run, rates: r.rates, cls: r.cls, item: r.item, oldTime: r.oldTime === null ? null : Math.round(r.oldTime * 10) / 10, oldRates: r.oldRates, oldCls: r.oldCls });
  } else if (sc === 'fail') Art.drawFailPanel(ctx, {});
  else if (sc === 'ending') Art.drawEndingPanel(ctx, { totalTime: Math.floor(S.totalTime) });
  if (S.paused) Art.drawPausePanel(ctx, { mode: S.pauseScene === 'play' ? 'level' : 'map' });
}
var lastTs = null, acc = 0;
function frame(ts) {
  if (lastTs === null) lastTs = ts;
  var dt = Math.min((ts - lastTs) / 1000, 1 / 30); lastTs = ts;
  acc += dt;
  while (acc >= DT) { acc -= DT; stepAll(); }
  try { draw(); } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
