/* 職業工事 — 玩法驗證 Demo。邏輯與繪製分離: 每幀(固定 1/60 秒)先更新, 再呼叫 Art。 */
(function () {
'use strict';
var W = Art.canvas.width, H = Art.canvas.height;
var TS = 40, COLS = 32, ROWS = 18, DT = 1 / 60;
var MATS = ['wood', 'stone', 'time', 'soul'];
var CLS = ['sword', 'hunter', 'bomber'];
var SITE_CLS = ['hunter', 'sword', 'bomber'];
var SITE_MAIN = ['time', 'wood', 'stone'];
var KIND_ITEM = { wood: 'axe', stone: 'pick', time: 'prism' };

/* ---------- 佔位圖形(style.md / interface.json 沒有的) ---------- */
var Placeholder = {
  // 獵人抓鉤的鉤索(interface 註明由 RD 畫直線)
  hookRope: function (ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
};

/* ---------- 小工具 ---------- */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function zeroMat() { return { wood: 0, stone: 0, time: 0, soul: 0 }; }
function copyMat(m) { return { wood: m.wood, stone: m.stone, time: m.time, soul: m.soul }; }
function sign(v) { return v < 0 ? -1 : 1; }

/* ---------- 關卡資料 ---------- */
// 結構(全部先蓋到格子上, 再依各處修復狀態決定實心與否)
// 字元: # 實心  ^ 尖刺  a 鉤環架階梯(修好實心)  b 跳台(修好實心)  p 坑底落石(未修實心)
//       Q 落石 / 修好後的階梯(皆實心)  q 修好後的階梯  s 封坑木樁(未修實心)  C 裂岩牆  V 寶庫門
function blank() { var g = []; for (var r = 0; r < ROWS; r++) { g.push([]); for (var c = 0; c < COLS; c++) g[r].push('.'); } return g; }
function put(g, c, r, ch) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) throw new Error('oob ' + c + ',' + r);
  var o = g[r][c];
  if (o !== '.' && o !== '#') throw new Error('overlap ' + c + ',' + r + ' ' + o + '->' + ch);
  g[r][c] = ch;
}
function carve(g, c, r) { g[r][c] = '.'; }
function stackUp(g, c, top, bottom) { for (var r = top; r <= bottom; r++) put(g, c, r, '#'); }

var NESTKINDS = { 3: ['boar', 'shield'], 6: ['shield', 'boar'], 8: ['boar', 'shield', 'bee', 'frog'] };

function plat(kind, n) { var a = []; for (var i = 0; i < n; i++) a.push([kind, i % 5, i < 5 ? 4 : 2]); return a; }
function bank(items) { var a = []; items.forEach(function (it, i) { for (var k = 0; k < it[1]; k++) { var idx = a.length; a.push([it[0], 28 + (idx % 4), idx < 4 ? 12 : 10]); } }); return a; }
function seg(kind, cells) { return cells.map(function (c) { return [kind, c, 15]; }); }

var LD = [null,
  { name: '草原', theme: 'plain', sc: 'g', cl: 's', mn: 'p', start: [11, 11], hills: [[14, 1], [15, 1]], spikes: [],
    pk: { cols: [11, 12, 13, 14, 15, 16, 19, 22], n: [8, 2, 2] },
    mobs: [['boar', 13], ['frog', 12], ['frog', 16], ['shield', 15], ['bee', 14, 6]],
    scC: { pk: plat('time', 3), mobs: [['bee', 2, 1]] },
    mnC: { pk: seg('stone', [16, 15, 9, 8]), mobs: [['frog', 11, 15], ['frog', 13, 15], ['boar', 8, 15]], chest: ['pick', 7, 15] } },
  { name: '懸崖棧道', theme: 'sky', sc: 's', cl: 'g', mn: 'p', start: [16, 11], hills: [], spikes: [[7, 2], [9, 2]],
    pk: { cols: [6, 8, 10, 12, 14, 16], n: [6, 2, 4] },
    mobs: [['bee', 8, 1], ['bee', 13, 5], ['frog', 6, 2], ['frog', 10, 2]],
    clC: { pk: bank([['wood', 4]]), mobs: [['frog', 28, 12], ['frog', 29, 12], ['boar', 30, 12]], chest: ['prism', 31, 12] },
    mnC: { pk: seg('stone', [16, 15, 9]).concat([['time', 8, 15]]), mobs: [['shield', 12, 15], ['frog', 11, 15], ['frog', 13, 15]] } },
  { name: '野豬峽谷', theme: 'rock', sc: 'g', cl: 's', mn: 'n', walls: 3, start: [11, 11], hills: [], spikes: [[12, 11], [14, 11]],
    pk: { cols: [11, 13, 15, 16, 19, 20, 22, 24, 26, 28], n: [6, 3, 1] },
    mobs: [['boar', 13], ['boar', 15], ['boar', 16], ['shield', 22]],
    scC: { pk: plat('time', 4), mobs: [['bee', 1, 1], ['bee', 3, 1]], chest: ['pick', 4, 4] },
    mnC: { pk: seg('stone', [16, 14, 12]), mobs: [] } },
  { name: '蜂巢高塔', theme: 'sky', sc: 'g', cl: 'g', mn: 't', start: [10, 10], goal: [16, 7], hills: [[13, 2]], bridge: [14, 17, 8], spikes: [[17, 11], [18, 11]],
    pk: { cols: [11, 12, 13, 14, 15, 16, 17, 18], n: [4, 2, 4] },
    mobs: [['bee', 13, 6], ['bee', 15, 6], ['bee', 17, 5], ['frog', 17, 11]],
    scC: { pk: plat('time', 5), mobs: [['bee', 1, 1], ['bee', 3, 1]], chest: ['prism', 4, 4] },
    clC: { pk: bank([['wood', 3], ['time', 1]]), mobs: [['frog', 28, 12], ['frog', 29, 12]] },
    mnC: { pk: [], mobs: [] } },
  { name: '斷橋', theme: 'sky', sc: 's', cl: 'g', mn: 'p', start: [16, 11], hills: [], spikes: [[7, 2], [9, 2]],
    pk: { cols: [6, 8, 10, 12, 14, 16], n: [8, 2, 3] },
    mobs: [['boar', 8, 2], ['boar', 16, 11], ['frog', 6, 2], ['frog', 10, 2], ['bee', 13, 5]],
    clC: { pk: bank([['wood', 4]]), mobs: [['boar', 28, 12], ['boar', 30, 12], ['frog', 29, 12]], chest: ['axe', 31, 12] },
    mnC: { pk: seg('stone', [16, 15, 9]), mobs: [['shield', 12, 15], ['frog', 11, 15], ['frog', 13, 15]] } },
  { name: '盾兵要塞', theme: 'rock', sc: 'g', cl: 'g', mn: 'n', walls: 2, start: [11, 11], goal: [15, 7], hills: [], stairs: [[12, 10]], bridge: [13, 16, 8], spikes: [[14, 11], [18, 11]],
    pk: { cols: [11, 13, 15, 16, 12, 14], n: [4, 5, 2] },
    mobs: [['shield', 13], ['shield', 15], ['shield', 16], ['boar', 14], ['bee', 12, 6]],
    scC: { pk: plat('time', 3), mobs: [['bee', 2, 1], ['shield', 3, 4]] },
    clC: { pk: bank([['wood', 4]]), mobs: [['boar', 28, 12], ['boar', 30, 12]], chest: ['soulJar', 31, 12] },
    mnC: { pk: [], mobs: [] } },
  { name: '蛙沼', theme: 'swamp', sc: 'g', cl: 's', mn: 'p', start: [11, 11], hills: [], spikes: [[12, 11], [14, 11], [16, 11]],
    pk: { cols: [11, 13, 15, 19, 20, 22, 24, 26, 28, 30], n: [6, 3, 2] },
    mobs: [['frog', 13], ['frog', 15], ['frog', 22], ['frog', 26], ['shield', 24], ['bee', 14, 6]],
    scC: { pk: plat('time', 4), mobs: [['bee', 2, 1]], chest: ['pick', 4, 4] },
    mnC: { pk: seg('stone', [16, 15, 9, 8]), mobs: [['frog', 11, 15], ['frog', 12, 15], ['frog', 13, 15]] } },
  { name: '王座', theme: 'throne', sc: 's', cl: 'g', mn: 'n', walls: 3, start: [16, 11], hills: [], spikes: [[7, 2], [9, 2]],
    pk: { cols: [6, 8, 10, 12, 14, 16], n: [6, 4, 4] },
    mobs: [['boar', 8, 2], ['boar', 10, 2], ['shield', 6, 2], ['bee', 12, 5], ['frog', 16, 11], ['frog', 14, 5]],
    clC: { pk: bank([['wood', 3], ['time', 2]]), mobs: [['boar', 30, 12], ['frog', 28, 12], ['frog', 29, 12]], chest: ['soulJar', 31, 12] },
    mnC: { pk: seg('stone', [16, 14, 12]), mobs: [] } }
];
var COSTS = [0, 8, 20, 20, 38, 38, 38, 38, 70];
var UNLOCK = [0, 0, 20, 20, 50, 50, 50, 50, 100];
var PARENTS = [null, [], [1], [1], [2], [2], [3], [3], [5, 6]];

// 每處工事的迷霧 / 框選 / 工程牌 / 位置(格); 在 buildLevel 依構型填入
function buildLevel(idx) {
  var D = LD[idx], g = blank(), r, c;
  var L = { idx: idx, name: D.name, theme: D.theme, grid: g, sites: [{}, {}, {}], pk: [], mobs: [], spikes: [], chests: [], walls: [], back: [],
    nest: null, mother: null, vault: null, start: D.start, goal: null };
  for (r = 12; r < ROWS; r++) for (c = 0; c < COLS; c++) g[r][c] = '#';
  for (r = 10; r <= 11; r++) for (c = 0; c < 10; c++) g[r][c] = '#';
  g[11][10] = '#';
  (D.hills || []).forEach(function (h) { for (var k = 0; k < h[1]; k++) put(g, h[0], 11 - k, '#'); });
  (D.stairs || []).forEach(function (s) { stackUp(g, s[0], s[1], 11); });
  if (D.bridge) for (c = D.bridge[0]; c <= D.bridge[1]; c++) put(g, c, D.bridge[2], '#');
  // ----- 鉤環架(左側) -----
  var stairs = [[9, 9, 9], [8, 8, 9], [7, 7, 9], [6, 6, 9]];
  stairs.forEach(function (s) { for (var rr = s[1]; rr <= s[2]; rr++) put(g, s[0], rr, 'a'); });
  for (c = 0; c <= 4; c++) put(g, c, 5, '#');
  var S0 = L.sites[0]; S0.ring = [5, 5]; S0.sign = [10, 10]; S0.cls = 'hunter';
  if (D.sc === 's') {
    var tops = { 15: 10, 14: 8, 13: 6, 12: 4, 11: 3 };
    for (c = 11; c <= 15; c++) stackUp(g, c, tops[c], 11);
    for (c = 6; c <= 10; c++) put(g, c, 3, '#');
    L.goal = [2, 4];
    S0.fog = [6, 4, 4, 2]; S0.hl = [0, 3, 11, 8];
  } else { S0.fog = [0, 1, 5, 5]; S0.hl = [0, 1, 11, 10]; }
  // ----- 跳崖台(右側) -----
  var S1 = L.sites[1]; S1.cls = 'sword'; S1.sign = [18, 11];
  var pc, gc0, gc1, bankC;
  if (D.cl === 's') { pc = 22; } else { pc = 19; }
  // 平台 pc..pc+2, 缺口 pc+3..pc+8, 對岸 pc+9..31
  for (c = pc; c <= 31; c++) carve(g, c, 12);
  for (c = pc; c <= pc + 8; c++) { carve(g, c, 13); carve(g, c, 14); carve(g, c, 15); }
  for (c = pc; c <= pc + 2; c++) g[13][c] = 'b';
  for (c = pc; c <= pc + 5; c++) g[16][c] = 'p';
  for (c = pc + 6; c <= pc + 8; c++) g[16][c] = 'Q';
  g[15][pc + 7] = 'q'; g[15][pc + 8] = 'q'; g[14][pc + 8] = 'q';
  S1.pc = pc;
  if (D.cl === 's') {
    for (c = 19; c <= 21; c++) stackUp(g, c, { 19: 10, 20: 8, 21: 6 }[c], 11);
    for (c = 22; c <= 30; c++) put(g, c, 6, '#');
    L.goal = [31, 12];
    S1.fog = [pc + 3, 13, 6, 3]; S1.hl = [pc, 12, 32 - pc, 6];
  } else { S1.fog = [28, 5, 4, 8]; S1.hl = [pc, 5, 32 - pc, 13]; }
  // ----- 爆破礦坑 -----
  var S2 = L.sites[2]; S2.cls = 'bomber'; S2.sign = D.mn === 't' ? [12, 11] : [16, 11];
  if (D.sc === 's' || D.cl === 's') { /* 保持預設 */ }
  if (D.mn === 't') {
    for (c = 13; c <= 14; c++) for (r = 13; r <= 15; r++) { carve(g, c, r); }
    for (c = 11; c <= 16; c++) carve(g, c, 13);
    carve(g, 12, 14); carve(g, 15, 14);
    [11, 12, 15, 16].forEach(function (cc) { g[12][cc] = 's'; });
    
    L.walls.push({ cells: [[13, 13], [13, 14], [13, 15]], hp: 3 }); L.walls.push({ cells: [[14, 13], [14, 14], [14, 15]], hp: 3 });
    L.back.push([11, 13, 6, 1, 'mine'], [13, 14, 2, 2, 'mine']);
    S2.fog = [13, 13, 2, 3]; S2.hl = [11, 8, 6, 8];
    L.goal = L.goal || D.goal;
  } else {
    var nestLv = D.mn === 'n', wc = D.walls || 2, wallCols = nestLv ? [15, 13, 11].slice(0, wc) : [14, 10];
    var cl = nestLv ? 1 : 7;
    for (c = cl; c <= 16; c++) for (r = 13; r <= 15; r++) carve(g, c, r);
    carve(g, 17, 13); carve(g, 18, 13); carve(g, 17, 14);
    g[12][17] = 's'; g[12][18] = 's';
    wallCols.forEach(function (wcx) { var cells = []; for (r = 13; r <= 15; r++) { g[r][wcx] = 'C'; cells.push([wcx, r]); } L.walls.push({ cells: cells, hp: 3 }); });
    if (nestLv) {
      var lastWall = wallCols[wallCols.length - 1], chR = lastWall - 1, chL = chR - 3, doorC = chL - 2, vaultR = doorC - 1, vaultL = vaultR - 3;
      for (r = 13; r <= 15; r++) { g[r][doorC] = 'V'; g[r][doorC + 1] = 'V'; }
      L.vault = { door: [doorC, 13], vl: vaultL, vr: vaultR };
      L.back.push([vaultL, 13, chR - vaultL + 1, 3, 'lair'], [chR + 1, 13, 18 - chR, 1, 'mine'], [chR + 1, 14, 16 - chR, 2, 'mine']);
      L.nest = { x: chL * TS + 34, y: 16 * TS - 24, chL: chL, chR: chR, kinds: NESTKINDS[idx] };
      L.mother = { x: (chL + 2.5) * TS, y: 16 * TS - 28, minX: chL * TS + 64, maxX: (chR + 1) * TS };
      S2.fog = [vaultL, 13, 17 - vaultL, 3]; S2.vaultFog = [vaultL, 13, 4, 3];
      S2.hl = [vaultL, 10, 20 - vaultL, 7];
      for (c = vaultL; c <= vaultR; c++) { L.pk.push({ kind: 'wood', c: c, r: 15, site: 'vault' }); L.pk.push({ kind: 'stone', c: c, r: 14, site: 'vault' }); L.pk.push({ kind: 'time', c: c, r: 13, site: 'vault' }); }
    } else {
      L.back.push([7, 13, 10, 3, 'mine'], [17, 13, 2, 1, 'mine']);
      S2.fog = [7, 13, 10, 3]; S2.hl = [7, 10, 12, 7];
    }
  }
  S2.nestLv = D.mn === 'n';
  // 角色(捷徑 / 採集)
  S0.role = D.sc === 's' ? 'shortcut' : 'gather'; S1.role = D.cl === 's' ? 'shortcut' : 'gather';
  S2.role = (D.mn === 't' || idx === 6) ? 'shortcut' : 'gather';
  // 尖刺
  (D.spikes || []).forEach(function (s) { L.spikes.push({ c: s[0], r: s[1] }); });
  // 目標
  if (!L.goal) L.goal = D.goal || [16, 11];
  // 地上素材 / 怪物(主路)
  function stand(cc, from) { for (var rr = from || 1; rr < ROWS; rr++) { var ch = g[rr][cc]; if (ch !== '.' && ch !== '^') return rr - 1; } return 11; }
  var cols = D.pk.cols, n = D.pk.n, k = 0;
  ['wood', 'stone', 'time'].forEach(function (kind, ki) {
    for (var i = 0; i < n[ki]; i++, k++) {
      var cc = cols[k % cols.length], lv = Math.floor(k / cols.length), rr = stand(cc) - 2 * lv;
      if (rr < 2) rr = stand(cc);
      while (rr > 1 && g[rr][cc] !== '.') rr--;
      L.pk.push({ kind: kind, c: cc, r: rr, site: -1 });
    }
  });
  D.mobs.forEach(function (m) { L.mobs.push({ type: m[0], c: m[1], r: m[0] === 'bee' ? m[2] : (m[2] !== undefined ? m[2] : stand(m[1])), site: -1 }); });
  function addSite(si, C, standRow) {
    if (!C) return;
    (C.pk || []).forEach(function (p) { L.pk.push({ kind: p[0], c: p[1], r: p[2], site: si }); });
    (C.mobs || []).forEach(function (m) { L.mobs.push({ type: m[0], c: m[1], r: m[2], site: si }); });
    if (C.chest) L.chests.push({ type: C.chest[0], c: C.chest[1], r: C.chest[2], site: si });
  }
  addSite(0, D.scC); addSite(1, D.clC); addSite(2, D.mnC);
  // 迷霧中心的「主要素材」
  S0.main = S0.role === 'gather' ? 'time' : null; S1.main = S1.role === 'gather' ? 'wood' : null; S2.main = S2.role === 'gather' ? 'stone' : null;
  L.sites.forEach(function (s) { s.repaired = false; s.fogA = 1; });
  L.state = { vaultOpen: false, changeEpoch: 0, accel: 0, slots: [null, null], lastCls: 'sword', rec: null, cleared: false, unlocked: idx === 1, rp: null,
    chestTaken: L.chests.map(function () { return false; }) };
  return L;
}

var LEVELS = [null];
for (var li = 1; li <= 8; li++) LEVELS.push(buildLevel(li));
// 爆破礦坑(捷徑型)的裂岩牆格需要寫進格子
LEVELS.forEach(function (L) {
  if (!L) return;
  L.wallIdx = {};
  L.walls.forEach(function (w, i) { w.cells.forEach(function (cc) { L.grid[cc[1]][cc[0]] = 'C'; L.wallIdx[cc[1] * COLS + cc[0]] = i; }); });
  L.wallHp = L.walls.map(function () { return 3; });
});

/* ---------- 全域狀態 ---------- */
var G = {
  screen: 'guide', guidePage: 0, guideReturn: 'map', paused: false, prevScreen: null,
  stock: zeroMat(), bumpT: { wood: 0.15, stone: 0.15, time: 0.15, soul: 0.15 },
  owned: { sword: true, hunter: false, bomber: false }, upg: { speed: 0, hp: 0, cd: 0 },
  inv: [], epoch: 0, cursor: 1, panel: null, upgPanel: null, flies: [], totalTime: 0, ended: false,
  run: null, result: null, tClock: 0, keys: {}, press: {}, ending: false
};
var CARD_POS = { 1: [40, 281], 2: [290, 131], 3: [290, 431], 4: [540, 56], 5: [540, 206], 6: [540, 356], 7: [540, 506], 8: [790, 281], W: [40, 506], G: [1040, 281] };
var CURSOR_COLS = [[1, 'W'], [2, 3], [4, 5, 6, 7], [8], ['G']];

function eqCount(L) {
  var ex = { axe: 0, pick: 0, prism: 0, soulJar: 0 };
  L.state.slots.forEach(function (it) { if (it) ex[it.type]++; });
  return ex;
}
// 事件換成素材(即時入帳與回放重算共用同一函式)
function evAmounts(ev, ex) {
  var r = zeroMat();
  if (ev.t === 'pick') { r[ev.k] = 1 + ex[KIND_ITEM[ev.k]]; }
  else {
    MATS.forEach(function (k) { var b = ev.base[k] || 0; if (b > 0) r[k] = b * (k === 'soul' ? 1 : 1 + ex[KIND_ITEM[k]]); });
    r.soul += ex.soulJar;
  }
  return r;
}
function speedMul() { return 1 + [0, 0.08, 0.16, 0.24][G.upg.speed]; }
function cdMul() { return [1, 0.85, 0.7, 0.55][G.upg.cd]; }
function maxHp() { return 3 + G.upg.hp; }
function accelMul(L) { return [1, 1.25, 1.5][L.state.accel]; }

function siteOn(L, s) { return s === -1 || (s === 'vault' ? L.state.vaultOpen : L.sites[s].repaired); }

function solidAt(L, wl, c, r) {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  switch (L.grid[r][c]) {
    case '#': case 'Q': return true;
    case 'a': return L.sites[0].repaired;
    case 'b': case 'q': return L.sites[1].repaired;
    case 'p': return !L.sites[1].repaired;
    case 's': return !L.sites[2].repaired;
    case 'C': return wl[L.wallIdx[r * COLS + c]] > 0;
    case 'V': return !L.state.vaultOpen;
  }
  return false;
}
function boxHit(L, wl, x, y, w, h) {
  var c0 = Math.floor((x - w / 2) / TS), c1 = Math.floor((x + w / 2 - 0.001) / TS), r0 = Math.floor((y - h / 2) / TS), r1 = Math.floor((y + h / 2 - 0.001) / TS);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solidAt(L, wl, c, r)) return true;
  return false;
}
// 回傳是否撞到; 撞到時貼齊
function moveAxis(L, wl, o, ax, d) {
  if (d === 0) return false;
  var n = Math.ceil(Math.abs(d) / 8), s = d / n;
  for (var i = 0; i < n; i++) {
    var px = o.x, py = o.y;
    if (ax === 0) o.x += s; else o.y += s;
    if (boxHit(L, wl, o.x, o.y, o.w, o.h)) {
      var lo = 0, hi = 1, bx = o.x, by = o.y;
      for (var k = 0; k < 6; k++) {
        var mid = (lo + hi) / 2;
        if (ax === 0) o.x = px + (bx - px) * mid; else o.y = py + (by - py) * mid;
        if (boxHit(L, wl, o.x, o.y, o.w, o.h)) hi = mid; else lo = mid;
      }
      if (ax === 0) o.x = px + (bx - px) * lo; else o.y = py + (by - py) * lo;
      return true;
    }
  }
  return false;
}
function overlap(a, b) { return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h; }
function rectOv(x, y, w, h, o) { return Math.abs(x - o.x) * 2 < w + o.w && Math.abs(y - o.y) * 2 < h + o.h; }
function circleHitBox(cx, cy, rad, o) {
  var nx = clamp(cx, o.x - o.w / 2, o.x + o.w / 2), ny = clamp(cy, o.y - o.h / 2, o.y + o.h / 2);
  return (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) <= rad * rad;
}

/* ---------- 一趟關卡 ---------- */
var MOBDEF = {
  boar: { hp: 3, w: 48, h: 32, drop: { wood: 3, soul: 1 } },
  shield: { hp: 3, w: 32, h: 44, drop: { stone: 3, soul: 1 } },
  bee: { hp: 1, w: 32, h: 32, drop: { time: 2, soul: 1 } },
  frog: { hp: 2, w: 32, h: 28, drop: { wood: 2, soul: 1 } },
  mother: { hp: 12, w: 64, h: 56, drop: { soul: 6, stone: 4, time: 3 } }
};
var mobSeq = 0;
function makeMob(type, x, y, brood) {
  var d = MOBDEF[type];
  return { id: ++mobSeq, type: type, x: x, y: y, w: d.w, h: d.h, vx: 0, vy: 0, face: 1, hp: d.hp, maxHp: d.hp, st: type === 'bee' ? 'fly' : (type === 'frog' ? 'crouch' : 'walk'),
    tm: 0, hit: 0, block: 0, brood: !!brood, flung: null, homeX: x, homeY: y, ph: Math.random() * 6, shotCd: 1, ground: false, jumpT: 0.6 + Math.random() * 0.6 };
}

function startRun(idx, cls) {
  var L = LEVELS[idx];
  L.state.lastCls = cls;
  var wl = L.walls.map(function () { return 3; });
  var p = { x: L.start[0] * TS + 20, y: (L.start[1] + 1) * TS - 22, w: 28, h: 44, vx: 0, vy: 0, face: 1, ground: false, hp: maxHp(), inv: 0, kn: 0, cdAtk: 0, cdSkill: 0, cdSkillDur: 1, dashT: 0, dashUsed: false, dashHit: {},
    hook: null, pose: 'idle', poseT: 0, jumpT: 0, jumping: false, autoCd: 0.3, cls: cls, poseHold: 0 };
  var run = { L: L, idx: idx, cls: cls, f: 0, p: p, wl: wl, mobs: [], shots: [], arrows: [], bombs: [], expl: [], shock: [], poofs: [], pops: [], chains: {}, chainTxt: [],
    tk: L.pk.map(function () { return false; }), ck: L.state.chestTaken.slice(), gotGoal: false, events: [], frames: [], mat: zeroMat(), items: [], vaultFirst: false,
    notices: [], notice: null, nestSpawned: 0, nestT: 0, nestLeft: 5, nestSpawnT: 9, mother: null, ex: eqCount(L), epoch: G.epoch, srcSeq: 0, done: false, fail: false, doneT: 0, ex2: null };
  L.mobs.forEach(function (m) {
    if (!siteOn(L, m.site)) return;
    var d = MOBDEF[m.type];
    var x = m.c * TS + 20, y = m.type === 'bee' ? m.r * TS + 20 : (m.r + 1) * TS - d.h / 2;
    var mob = makeMob(m.type, x, y, false); mob.face = m.c >= 16 ? -1 : 1; run.mobs.push(mob);
  });
  if (L.nest && L.sites[2].repaired) {
    var mm = L.mother, mo = makeMob('mother', mm.x, mm.y, true); mo.minX = mm.minX; mo.maxX = mm.maxX; mo.face = 1; run.mobs.push(mo); run.mother = mo;
  }
  G.run = run;
  G.screen = 'play';
  G.keys = {}; G.press = {};
  return run;
}

function stateName(m) { return m.flung ? 'flung' : m.st; }
function addPop(run, x, y, kind, val) { run.pops.push({ x: x, y: y, t: 0, kind: kind, value: Math.min(20, Math.max(1, val)) }); }

// 入帳(關內)
function recordEvent(run, ev) {
  ev.f = run.f; run.events.push(ev);
  var a = evAmounts(ev, run.ex), off = 0;
  MATS.forEach(function (k) { if (a[k] > 0) { run.mat[k] += a[k]; addPop(run, ev.x, ev.y - off, k, a[k]); off += 18; } });
}

function wallBreak(run, wi, full) {
  var L = run.L, w = L.walls[wi];
  if (run.wl[wi] <= 0) return;
  run.wl[wi] = full ? 0 : run.wl[wi] - 1;
  if (run.wl[wi] <= 0) {
    var cx = w.cells[0][0] * TS + 20, cy = (w.cells[0][1] + w.cells[w.cells.length - 1][1]) / 2 * TS + 20;
    run.poofs.push({ x: cx, y: cy, t: 0, big: false });
  }
}
function wallsInCircle(run, cx, cy, rad) {
  var L = run.L;
  L.walls.forEach(function (w, i) {
    if (run.wl[i] <= 0) return;
    for (var k = 0; k < w.cells.length; k++) {
      var o = { x: w.cells[k][0] * TS + 20, y: w.cells[k][1] * TS + 20, w: TS, h: TS };
      if (circleHitBox(cx, cy, rad, o)) { wallBreak(run, i, true); return; }
    }
  });
}
function wallsInRect(run, x, y, w, h, once) {
  var L = run.L;
  L.walls.forEach(function (wl, i) {
    if (run.wl[i] <= 0) return;
    for (var k = 0; k < wl.cells.length; k++) {
      var o = { x: wl.cells[k][0] * TS + 20, y: wl.cells[k][1] * TS + 20, w: TS, h: TS };
      if (rectOv(x, y, w, h, o)) { if (once) { if (once[i]) return; once[i] = true; } wallBreak(run, i, false); return; }
    }
  });
}

// 對怪物造成傷害。o: {kind:'melee'|'arrow'|'dash'|'blast'|'fling', ox, oy, src}
function hurtMob(run, m, dmg, o) {
  if (m.dead) return false;
  if (m.type === 'shield' && (o.kind === 'melee' || o.kind === 'arrow' || o.kind === 'dash') && !m.flung) {
    var front = (o.ox - m.x) * m.face > 0;
    if (front && !(o.oy < m.y - m.h / 2)) { m.block = 0.2; return false; }
  }
  if (m.type === 'mother' && m.st === 'stun') dmg *= 2;
  m.hp -= dmg; m.hit = 0.1;
  if (m.hp <= 0) killMob(run, m, o);
  return true;
}
function killMob(run, m, o) {
  m.dead = true;
  var base = copyMat(zeroMat()), d = MOBDEF[m.type].drop;
  MATS.forEach(function (k) { base[k] = d[k] || 0; });
  if (m.brood && m.type !== 'mother') base.soul += 1;
  recordEvent(run, { t: 'kill', x: m.x, y: m.y, base: base, big: m.type === 'mother', mother: m.type === 'mother' });
  run.poofs.push({ x: m.x, y: m.y, t: 0, big: m.type === 'mother' });
  if (m.type === 'mother' && !run.L.state.vaultOpen && !run.vaultFirst) { run.vaultFirst = true; run.notices.push({ what: 'vault', type: null, t: 0 }); }
  if (o && o.src) {
    var ch = run.chains[o.src] || (run.chains[o.src] = { n: 0 });
    ch.n++;
    if (ch.n >= 2) run.chainTxt.push({ x: m.x, y: m.y - 20, n: ch.n, t: 0, key: o.src });
    if (o.kind === 'dash') run.p.cdSkill = 0;
  }
}
function flingMob(m, dir, src) { m.flung = { t: 0.6, dir: dir, hitSet: {}, src: src }; m.face = -dir; m.vx = 0; m.vy = 0; }
function nextSrc(run) { return ++run.srcSeq; }

/* ---------- 玩家更新 ---------- */
function groundBelow(L, wl, o) { return boxHit(L, wl, o.x, o.y + 2, o.w, o.h); }

function hurtPlayer(run, dir, dmg) {
  var p = run.p;
  if (p.inv > 0 || p.dashT > 0) return;
  p.hp -= (dmg || 1); p.inv = 1; p.kn = 0.12; p.knDir = dir; p.vx = dir * 667; p.pose = 'hurt'; p.poseT = 0; p.poseHold = 0.3; p.hook = null;
  if (p.hp <= 0) { run.fail = true; }
}

function updatePlayer(run) {
  var L = run.L, p = run.p, wl = run.wl, K = G.keys, pr = G.press;
  var spd = (p.cls === 'bomber' ? 230 : 260) * speedMul();
  p.inv = Math.max(0, p.inv - DT); p.cdAtk = Math.max(0, p.cdAtk - DT); p.cdSkill = Math.max(0, p.cdSkill - DT);
  p.poseT += DT; p.poseHold = Math.max(0, p.poseHold - DT);
  var wasGround = p.ground;
  if (p.hook) {
    var hx = p.hook.x - p.x, hy = p.hook.y - p.y, dd = Math.sqrt(hx * hx + hy * hy), st = 700 * DT;
    p.pose = 'hook'; p.poseT = 0;
    if (dd <= st + 4) { p.x = p.hook.x; p.y = p.hook.y; p.hook = null; p.vy = -500; p.vx = 0; p.pose = 'rise'; }
    else { p.x += hx / dd * st; p.y += hy / dd * st; if (hx !== 0) p.face = sign(hx); }
    return;
  }
  if (p.dashT > 0) {
    p.dashT -= DT; p.pose = 'dash';
    var dx = 889 * p.face * DT, o = { x: p.x, y: p.y, w: p.w, h: p.h };
    var hit = moveAxis(L, wl, p, 0, dx);
    if (hit) {
      var cx = p.x + p.face * 16;
      wallsInRect(run, cx, p.y, 8, p.h - 4, p.dashWall);
      p.dashT = 0;
    }
    run.mobs.forEach(function (m) {
      if (m.dead || p.dashHit[m.id]) return;
      if (rectOv(p.x, p.y, p.w + 12, p.h, m)) { p.dashHit[m.id] = true; hurtMob(run, m, 2, { kind: 'dash', ox: p.x - p.face * 30, oy: p.y, src: p.dashSrc }); }
    });
    if (p.dashT <= 0) { p.vx = 0; p.vy = 0; }
    return;
  }
  var dir = (K.right ? 1 : 0) - (K.left ? 1 : 0);
  if (p.kn > 0) { p.kn -= DT; }
  else { p.vx = dir * spd; if (dir !== 0) p.face = dir; }
  // 跳躍
  if (pr.up && p.ground) { p.vy = -720; p.jumping = true; p.jumpT = 0; p.ground = false; }
  if (p.jumping) {
    p.jumpT += DT;
    if (!K.up && p.vy < 0 && p.jumpT < 0.15) { p.vy *= 0.5; p.jumping = false; }
    if (p.vy >= 0) p.jumping = false;
  }
  // 技能 / 攻擊
  var cdS = cdMul();
  if (pr.x && p.cdSkill <= 0) {
    if (p.cls === 'sword' && (p.ground || !p.dashUsed)) {
      p.dashT = 0.18; p.dashHit = {}; p.dashWall = {}; p.dashSrc = nextSrc(run); p.cdSkill = 1.2 * cdS; p.cdSkillDur = p.cdSkill; if (!p.ground) p.dashUsed = true;
      p.vy = 0; p.pose = 'dash'; p.poseT = 0;
    } else if (p.cls === 'hunter') {
      var best = null, bd = 220;
      var rings = hookRings(L);
      rings.forEach(function (rg) { var d = Math.hypot(rg.x - p.x, rg.y - p.y); if (d <= bd) { bd = d; best = rg; } });
      if (best) { p.hook = { x: best.x, y: best.y }; p.cdSkill = 0.5 * cdS; p.cdSkillDur = p.cdSkill; p.pose = 'hook'; p.poseT = 0; return; }
    } else if (p.cls === 'bomber') {
      var src = nextSrc(run);
      p.cdSkill = 1.5 * cdS; p.cdSkillDur = p.cdSkill; p.pose = 'wave'; p.poseT = 0; p.poseHold = 0.3;
      run.shock.push({ x: p.x, y: p.y, t: 0 });
      run.mobs.forEach(function (m) {
        if (m.dead) return;
        if (circleHitBox(p.x, p.y, 130, m)) {
          var kd = (m.x >= p.x) ? 1 : -1;
          hurtMob(run, m, 1, { kind: 'blast', ox: p.x, oy: p.y, src: src });
          if (!m.dead && m.type !== 'mother') flingMob(m, kd, src);
        }
      });
      wallsInCircle(run, p.x, p.y, 130);
    }
  }
  if (pr.z && p.cdAtk <= 0 && p.dashT <= 0) {
    if (p.cls === 'sword') {
      p.cdAtk = 0.3; p.pose = 'slash'; p.poseT = 0; p.poseHold = 0.15;
      var bx = p.x + p.face * (14 + 25), src2 = nextSrc(run);
      run.mobs.forEach(function (m) { if (!m.dead && rectOv(bx, p.y, 50, 40, m)) hurtMob(run, m, 1, { kind: 'melee', ox: p.x, oy: p.y, src: src2 }); });
      wallsInRect(run, bx, p.y, 50, 40, {});
    } else if (p.cls === 'hunter') {
      p.cdAtk = 0.4; p.pose = 'shoot'; p.poseT = 0; p.poseHold = 0.2;
      run.arrows.push({ x: p.x + p.face * 16, y: p.y - 4, vx: 700 * p.face, vy: 0, d: 0, max: 600, ox: p.x, oy: p.y, src: nextSrc(run) });
    } else {
      p.cdAtk = 0.6; p.pose = 'throw'; p.poseT = 0; p.poseHold = 0.2;
      run.bombs.push({ x: p.x + p.face * 10, y: p.y - 10, vx: 300 * p.face, vy: -500, t: 0, src: nextSrc(run) });
    }
  }
  // 獵人自動射擊
  if (p.cls === 'hunter') {
    p.autoCd -= DT;
    if (p.autoCd <= 0) {
      var tg = null, td = 260;
      run.mobs.forEach(function (m) { if (m.dead) return; var d = Math.hypot(m.x - p.x, m.y - p.y); if (d <= td) { td = d; tg = m; } });
      if (tg) {
        var ax = tg.x - p.x, ay = tg.y - p.y, al = Math.hypot(ax, ay) || 1;
        run.arrows.push({ x: p.x, y: p.y, vx: ax / al * 700, vy: ay / al * 700, d: 0, max: 400, ox: p.x, oy: p.y, src: nextSrc(run) });
        p.autoCd = 0.6;
      } else p.autoCd = 0.05;
    }
  }
  // 重力與移動
  p.vy = Math.min(p.vy + 2400 * DT, 1400);
  var hx2 = moveAxis(L, wl, p, 0, p.vx * DT);
  var hy = moveAxis(L, wl, p, 1, p.vy * DT);
  p.ground = false;
  if (hy) { if (p.vy > 0) p.ground = true; p.vy = 0; if (!p.ground) p.jumping = false; }
  if (p.ground) { p.dashUsed = false; p.jumping = false; }
  // 姿勢
  if (p.poseHold <= 0) {
    var np = !p.ground ? (p.vy < 0 ? 'rise' : 'fall') : (Math.abs(p.vx) > 1 && p.kn <= 0 ? 'run' : 'idle');
    if (np !== p.pose) { p.pose = np; p.poseT = 0; }
  }
  if (p.ground && !wasGround) { /* 落地 */ }
}
function hookRings(L) {
  var a = [];
  if (L.sites[0].repaired) a.push({ x: L.sites[0].ring[0] * TS + 20, y: L.sites[0].ring[1] * TS + 20 });
  return a;
}
/* ---------- 怪物 ---------- */
function footSolid(L, wl, x, y) { return solidAt(L, wl, Math.floor(x / TS), Math.floor(y / TS)); }
function edgeAhead(L, wl, m, dir) { return !footSolid(L, wl, m.x + dir * (m.w / 2 + 3), m.y + m.h / 2 + 3); }
function wallAheadM(L, wl, m, dir) { return boxHit(L, wl, m.x + dir * 3, m.y - 2, m.w, m.h - 4); }

function applyGravityMove(run, m) {
  var L = run.L, wl = run.wl;
  m.vy = Math.min(m.vy + 2400 * DT, 1200);
  var hx = moveAxis(L, wl, m, 0, m.vx * DT);
  var hy = moveAxis(L, wl, m, 1, m.vy * DT);
  m.ground = false;
  if (hy) { if (m.vy > 0) m.ground = true; m.vy = 0; }
  return hx;
}

function updateFlung(run, m) {
  var L = run.L, wl = run.wl, f = m.flung;
  f.t -= DT;
  var hit = moveAxis(L, wl, m, 0, 460 * f.dir * DT);
  if (hit) { m.flung = null; hurtMob(run, m, 1, { kind: 'fling', src: f.src }); return; }
  run.mobs.forEach(function (b) {
    if (b === m || b.dead || f.hitSet[b.id]) return;
    if (b.flung && b.flung.dir === f.dir) return;
    if (overlap(m, b)) {
      f.hitSet[b.id] = true;
      hurtMob(run, b, 2, { kind: 'fling', src: f.src });
      if (!b.dead && b.type !== 'mother' && !b.flung) flingMob(b, f.dir, f.src);
    }
  });
  if (f.t <= 0 && !m.dead) { m.flung = null; m.vx = 0; if (m.type === 'bee') { m.homeX = m.x; m.homeY = m.y; } }
}

function updateMob(run, m) {
  var L = run.L, wl = run.wl, p = run.p, t = run.f * DT;
  m.hit = Math.max(0, m.hit - DT); m.block = Math.max(0, m.block - DT);
  if (m.flung) { updateFlung(run, m); return; }
  var dx = p.x - m.x, dy = p.y - m.y;
  if (m.type === 'boar') {
    if (m.st === 'walk') {
      m.vx = m.face * 80;
      if (wallAheadM(L, wl, m, m.face) || edgeAhead(L, wl, m, m.face)) m.face = -m.face;
      if (Math.abs(dy) <= 40 && dx * m.face > 0 && Math.abs(dx) <= 240) { m.st = 'windup'; m.tm = 0.5; m.vx = 0; }
    } else if (m.st === 'windup') { m.vx = 0; m.tm -= DT; if (m.tm <= 0) m.st = 'charge'; }
    else if (m.st === 'charge') {
      m.vx = m.face * 420;
      if (wallAheadM(L, wl, m, m.face) || edgeAhead(L, wl, m, m.face)) { m.st = 'stun'; m.tm = 1; m.vx = 0; }
    } else if (m.st === 'stun') { m.vx = 0; m.tm -= DT; if (m.tm <= 0) m.st = 'walk'; }
    applyGravityMove(run, m);
  } else if (m.type === 'shield') {
    var chase = Math.abs(dx) <= 400 && Math.abs(dy) <= 120;
    if (chase) m.face = sign(dx);
    var blocked = wallAheadM(L, wl, m, m.face) || edgeAhead(L, wl, m, m.face);
    if (blocked) { if (chase) m.vx = 0; else { m.face = -m.face; m.vx = m.face * 40; } }
    else m.vx = m.face * 40;
    applyGravityMove(run, m);
    m.st = m.block > 0 ? 'block' : 'walk';
  } else if (m.type === 'bee') {
    m.ph += DT;
    if (m.st === 'aim') {
      m.tm -= DT; m.vx = 0;
      if (m.tm <= 0) {
        var ax = p.x - m.x, ay = p.y - m.y, al = Math.hypot(ax, ay) || 1;
        run.shots.push({ x: m.x, y: m.y, vx: ax / al * 220, vy: ay / al * 220 }); m.st = 'fly'; m.shotCd = 2;
      }
    } else {
      m.shotCd -= DT;
      m.vx = m.face * 60;
      if (Math.abs(m.x + m.vx * DT - m.homeX) > 120) m.face = -m.face, m.vx = m.face * 60;
      var hitw = moveAxis(L, wl, m, 0, m.vx * DT);
      if (hitw) m.face = -m.face;
      if (m.shotCd <= 0 && Math.hypot(dx, dy) <= 400) { m.st = 'aim'; m.tm = 0.4; }
    }
    var ty = m.homeY + 16 * Math.sin(m.ph * Math.PI);
    var hy = moveAxis(L, wl, m, 1, ty - m.y);
  } else if (m.type === 'frog') {
    if (m.ground) {
      m.vx = 0; m.st = 'crouch'; m.jumpT -= DT;
      if (m.jumpT <= 0) {
        var dir = Math.abs(dx) <= 300 ? sign(dx) : m.face;
        function landOk(d) {
          var tx = m.x + d * 120, bottom = m.y + m.h / 2;
          if (boxHit(L, wl, tx, m.y - 2, m.w, m.h - 4)) return false;
          for (var k = 0; k < 8; k++) if (footSolid(L, wl, tx, bottom + 4 + k * TS)) return true;
          return false;
        }
        if (!landOk(dir)) { dir = -dir; if (!landOk(dir)) dir = 0; }
        if (dir !== 0) { m.face = dir; m.vx = dir * 232.5; m.vy = -619.7; m.ground = false; m.st = 'jump'; }
        m.jumpT = 1.2;
      }
    } else m.st = 'jump';
    var hxx = applyGravityMove(run, m);
    if (hxx) m.vx = 0;
    if (m.ground) m.vx = 0;
  } else if (m.type === 'mother') {
    if (m.st === 'walk') {
      m.vx = m.face * 50;
      var nx = m.x + m.face * (m.w / 2 + 2);
      if (wallAheadM(L, wl, m, m.face) || edgeAhead(L, wl, m, m.face) || nx > m.maxX || nx < m.minX) m.face = -m.face;
      if (Math.abs(dy) <= 80 && dx * m.face > 0 && Math.abs(dx) <= 320) { m.st = 'windup'; m.tm = 0.8; m.vx = 0; }
    } else if (m.st === 'windup') { m.vx = 0; m.tm -= DT; if (m.tm <= 0) m.st = 'charge'; }
    else if (m.st === 'charge') {
      m.vx = m.face * 380;
      if (wallAheadM(L, wl, m, m.face) || edgeAhead(L, wl, m, m.face)) { m.st = 'stun'; m.tm = 1.5; m.vx = 0; }
    } else if (m.st === 'stun') { m.vx = 0; m.tm -= DT; if (m.tm <= 0) m.st = 'walk'; }
    applyGravityMove(run, m);
  }
  // 碰到玩家
  if (!m.dead && overlap(m, p)) hurtPlayer(run, (p.x >= m.x) ? 1 : -1);
}

function nestUpdate(run) {
  var L = run.L;
  if (!L.nest || !L.sites[2].repaired) return;
  run.nestT += DT;
  if (run.nestSpawned < 5 && run.nestT >= 1 + 2.5 * run.nestSpawned) {
    var kind = L.nest.kinds[run.nestSpawned % L.nest.kinds.length], d = MOBDEF[kind];
    var x = L.nest.x + 52, y = kind === 'bee' ? 16 * TS - 80 : 16 * TS - d.h / 2;
    var mob = makeMob(kind, x, y, true); mob.face = 1; run.mobs.push(mob);
    run.nestSpawned++; run.nestSpawnT = 0;
  }
  run.nestSpawnT += DT;
}

/* ---------- 投射物 / 特效 ---------- */
function explodeAt(run, x, y, src) {
  run.expl.push({ x: x, y: y, t: 0 });
  run.mobs.forEach(function (m) { if (!m.dead && circleHitBox(x, y, 60, m)) hurtMob(run, m, 2, { kind: 'blast', ox: x, oy: y, src: src }); });
  wallsInCircle(run, x, y, 60);
}
function updateProjectiles(run) {
  var L = run.L, wl = run.wl, p = run.p;
  run.shots = run.shots.filter(function (s) {
    s.x += s.vx * DT; s.y += s.vy * DT;
    if (footSolid(L, wl, s.x, s.y) || s.x < 0 || s.x > W || s.y < 0 || s.y > H) return false;
    if (rectOv(s.x, s.y, 10, 10, p)) { hurtPlayer(run, s.vx >= 0 ? 1 : -1); return false; }
    return true;
  });
  run.arrows = run.arrows.filter(function (a) {
    var sp = Math.hypot(a.vx, a.vy), steps = 3, alive = true;
    for (var i = 0; i < steps && alive; i++) {
      a.x += a.vx * DT / steps; a.y += a.vy * DT / steps; a.d += sp * DT / steps;
      var cc = Math.floor(a.x / TS), rr = Math.floor(a.y / TS);
      if (solidAt(L, wl, cc, rr)) {
        var wi = L.wallIdx[rr * COLS + cc];
        if (wi !== undefined && wl[wi] > 0 && L.grid[rr][cc] === 'C') wallBreak(run, wi, false);
        alive = false; break;
      }
      for (var k = 0; k < run.mobs.length; k++) {
        var m = run.mobs[k];
        if (!m.dead && rectOv(a.x, a.y, 8, 6, m)) { hurtMob(run, m, 1, { kind: 'arrow', ox: a.ox, oy: a.oy, src: a.src }); alive = false; break; }
      }
      if (a.d >= a.max) alive = false;
    }
    return alive;
  });
  run.bombs = run.bombs.filter(function (b) {
    b.t += DT; b.vy += 2400 * DT;
    b.x += b.vx * DT; b.y += b.vy * DT;
    var hitT = footSolid(L, wl, b.x, b.y) || footSolid(L, wl, b.x + 6 * sign(b.vx), b.y) || b.y > H + 40;
    var hitM = false;
    for (var k = 0; k < run.mobs.length; k++) { var m = run.mobs[k]; if (!m.dead && rectOv(b.x, b.y, 12, 12, m)) { hitM = true; break; } }
    if (hitT || hitM) { explodeAt(run, b.x, b.y, b.src); return false; }
    return true;
  });
  run.expl.forEach(function (e) { e.t += DT; }); run.expl = run.expl.filter(function (e) { return e.t < 0.25; });
  run.shock.forEach(function (e) { e.t += DT; }); run.shock = run.shock.filter(function (e) { return e.t < 0.3; });
  run.poofs.forEach(function (e) { e.t += DT; }); run.poofs = run.poofs.filter(function (e) { return e.t < 0.3; });
  run.pops.forEach(function (e) { e.t += DT; }); run.pops = run.pops.filter(function (e) { return e.t < 0.8; });
  run.chainTxt.forEach(function (e) { e.t += DT; }); run.chainTxt = run.chainTxt.filter(function (e) { return e.t < 0.8; });
}

/* ---------- 撿取 / 尖刺 / 寶箱 / 終點 ---------- */
function updatePickups(run) {
  var L = run.L, p = run.p;
  L.pk.forEach(function (pk, i) {
    if (run.tk[i] || !siteOn(L, pk.site)) return;
    var o = { x: pk.c * TS + 20, y: pk.r * TS + 20, w: 24, h: 24 };
    if (overlap(p, o)) { run.tk[i] = true; recordEvent(run, { t: 'pick', k: pk.kind, x: o.x, y: o.y, idx: i }); }
  });
  L.chests.forEach(function (ch, i) {
    if (run.ck[i] || !siteOn(L, ch.site)) return;
    var o = { x: ch.c * TS + 20, y: (ch.r + 1) * TS - 18, w: 40, h: 36 };
    if (overlap(p, o)) {
      run.ck[i] = true;
      run.items.push(ch.type); run.notices.push({ what: 'item', type: ch.type, t: 0 }); run.events.push({ t: 'chest', f: run.f, idx: i });
    }
  });
  L.spikes.forEach(function (s) {
    if (p.inv > 0 || p.dashT > 0) return;
    var o = { x: s.c * TS + 20, y: s.r * TS + 30, w: 40, h: 20 };
    if (overlap(p, o)) { p.hp -= 1; p.inv = 1; p.vy = -520; p.vx = 0; p.kn = 0.1; p.ground = false; p.pose = 'hurt'; p.poseT = 0; p.poseHold = 0.3; if (p.hp <= 0) run.fail = true; }
  });
  var g = { x: L.goal[0] * TS + 20, y: L.goal[1] * TS, w: 40, h: 80 };
  if (overlap(p, g)) run.gotGoal = true;
}

function snapshot(run) {
  var p = run.p, L = run.L;
  var s = {
    f: run.f, p: [p.x, p.y, p.cls, p.face, p.pose, p.poseT, p.inv > 0],
    m: run.mobs.filter(function (m) { return !m.dead; }).map(function (m) { return [m.type, m.x, m.y, m.face, stateName(m), m.hit > 0, m.brood, m.hp, m.maxHp, m.ph]; }),
    nst: L.nest ? [!L.sites[2].repaired ? 'dormant' : (run.nestSpawned >= 5 ? 'spent' : 'idle'), Math.min(run.nestSpawnT, 0.4), 5 - run.nestSpawned] : null,
    sh: run.shots.map(function (a) { return [a.x, a.y]; }),
    ar: run.arrows.map(function (a) { return [a.x, a.y, Math.atan2(a.vy, a.vx)]; }),
    bo: run.bombs.map(function (a) { return [a.x, a.y, a.t]; }),
    ex: run.expl.map(function (a) { return [a.x, a.y, a.t]; }),
    sw: run.shock.map(function (a) { return [a.x, a.y, a.t]; }),
    po: run.poofs.map(function (a) { return [a.x, a.y, a.t, a.big]; }),
    wl: run.wl.slice(), tk: run.tk.slice(), ck: run.ck.slice(), gr: run.gotGoal,
    hook: p.hook ? [p.hook.x, p.hook.y] : null
  };
  return s;
}

function tickRun(run) {
  var p = run.p;
  if (run.done || run.fail) return;
  run.f++;
  updatePlayer(run);
  nestUpdate(run);
  run.mobs.forEach(function (m) { if (!m.dead) updateMob(run, m); });
  updateProjectiles(run);
  updatePickups(run);
  run.mobs = run.mobs.filter(function (m) { return !m.dead; });
  if (p.y - p.h / 2 > H + 20) run.fail = true;
  // 提示佇列
  if (!run.notice && run.notices.length) run.notice = run.notices.shift();
  if (run.notice) { run.notice.t += DT; if (run.notice.t >= 1.5) run.notice = null; }
  run.frames.push(snapshot(run));
  if (run.gotGoal && !run.done) { run.done = true; }
  G.press = {};
}
/* ---------- 經濟 / 回放 ---------- */
var HUD_ICON = { wood: [36, 20], stone: [206, 20], time: [376, 20], soul: [546, 20] };
function addStock(k, n) { G.stock[k] += n; G.bumpT[k] = 0; }

function ratesOf(rec, L) {
  var ex = eqCount(L), tot = zeroMat(), r = zeroMat();
  rec.events.forEach(function (ev) { if (ev.t === 'chest') return; var a = evAmounts(ev, ex); MATS.forEach(function (k) { tot[k] += a[k]; }); });
  var N = Math.max(1, rec.frames.length), mul = accelMul(L);
  MATS.forEach(function (k) { r[k] = tot[k] / N * 3600 * mul; });
  return r;
}
function totalRates() {
  var t = zeroMat();
  for (var i = 1; i <= 8; i++) { var L = LEVELS[i]; if (L.state.rec) { var r = ratesOf(L.state.rec, L); MATS.forEach(function (k) { t[k] += r[k]; }); } }
  return t;
}
function cardState(i) {
  var L = LEVELS[i];
  if (L.state.cleared) return 'cleared';
  if (L.state.unlocked) return 'open';
  var ok = PARENTS[i].some(function (p) { return LEVELS[p].state.cleared; });
  return ok ? 'buyable' : 'sealed';
}
function mapActive() { return G.screen === 'map' && !G.panel && !G.upgPanel && !G.paused; }

function fireEvent(L, ev) {
  if (ev.t === 'chest') return;
  var a = evAmounts(ev, eqCount(L)), pos = CARD_POS[L.idx];
  var showFly = mapActive();
  MATS.forEach(function (k) {
    var n = a[k]; if (n <= 0) return;
    if (!showFly) { addStock(k, n); return; }
    var cnt = Math.min(5, n);
    for (var i = 0; i < cnt; i++) {
      var amt = (i === cnt - 1) ? n - (cnt - 1) : 1;
      G.flies.push({ kind: k, n: amt, t: 0, x0: pos[0] + 8 + ev.x * 0.125 + (Math.random() * 12 - 6), y0: pos[1] + 8 + ev.y * 0.125 + (Math.random() * 12 - 6) });
    }
  });
}
function advanceReplay(L) {
  var rec = L.state.rec, rp = L.state.rp;
  if (!rec) return;
  var N = rec.frames.length;
  rp.ptr += accelMul(L);
  for (var guard = 0; guard < 4; guard++) {
    var fl = Math.floor(rp.ptr);
    while (rp.ei < rec.events.length && rec.events[rp.ei].f - 1 <= Math.min(fl, N - 1)) { fireEvent(L, rec.events[rp.ei]); rp.ei++; }
    if (fl >= N) { rp.ptr -= N; rp.ei = 0; } else break;
  }
}
function updateFlies() {
  G.flies = G.flies.filter(function (f) {
    f.t += DT;
    if (f.t >= 0.7) { addStock(f.kind, f.n); return false; }
    return true;
  });
  MATS.forEach(function (k) { G.bumpT[k] = Math.min(0.15, G.bumpT[k] + DT); });
}

/* ---------- 過關 / 失敗 ---------- */
function finishRun(run) {
  var L = run.L, st = L.state;
  MATS.forEach(function (k) { if (run.mat[k] > 0) addStock(k, run.mat[k]); });
  var gains = [];
  run.ck.forEach(function (v, i) {
    if (v && !st.chestTaken[i]) {
      st.chestTaken[i] = true;
      if (G.inv.length < 8) { G.inv.push({ type: L.chests[i].type, where: null }); }
      gains.push({ what: 'item', type: L.chests[i].type });
    }
  });
  if (run.vaultFirst && !st.vaultOpen) { st.vaultOpen = true; G.epoch++; st.changeEpoch = G.epoch; gains.push({ what: 'vault', type: null }); }
  st.cleared = true;
  var rec = { frames: run.frames, events: run.events, cls: run.cls, epoch: run.epoch };
  var res = { L: L, newRec: rec, gains: gains.slice(0, 2), first: !st.rec };
  if (!st.rec) { st.rec = rec; st.rp = { ptr: 0, ei: 0 }; }
  G.result = res; G.screen = 'result'; G.run = run;
}

/* ---------- 關卡面板 / 升級所 ---------- */
function openPanel(idx) {
  var L = LEVELS[idx];
  G.panel = { idx: idx, row: 0, clsSel: Math.max(0, CLS.indexOf(L.state.lastCls)), siteSel: 0, slotSel: 0 };
}
function favored(cls, L) { var n = 0; for (var i = 0; i < 3; i++) if (SITE_CLS[i] === cls && L.sites[i].repaired) n++; return n; }
function panelAct() {
  var P = G.panel, L = LEVELS[P.idx], st = L.state;
  if (P.row === 0) {
    var cls = CLS[P.clsSel];
    if (G.owned[cls]) { G.panel = null; startRun(P.idx, cls); }
  } else if (P.row === 1) {
    var s = L.sites[P.siteSel];
    if (!s.repaired && G.stock.stone >= COSTS[P.idx]) {
      G.stock.stone -= COSTS[P.idx]; s.repaired = true; s.fogA = 1; G.epoch++; st.changeEpoch = G.epoch;
    }
  } else if (P.row === 2) {
    if (!G.inv.length) return;
    var cur = st.slots[P.slotSel], opts = [null].concat(G.inv), i = opts.indexOf(cur);
    var nxt = opts[(i + 1) % opts.length];
    if (nxt) {
      if (nxt.where) { LEVELS[nxt.where.level].state.slots[nxt.where.slot - 1] = null; }
    }
    if (cur) cur.where = null;
    st.slots[P.slotSel] = nxt;
    if (nxt) nxt.where = { level: P.idx, slot: P.slotSel + 1 };
  } else if (P.row === 3) {
    var cost = [12, 30][st.accel];
    if (st.accel < 2 && G.stock.time >= cost) { G.stock.time -= cost; st.accel++; }
  }
}
var UP_COST = { speed: [8, 20, 45], hp: [12, 35], cd: [8, 20, 45] }, UP_MAX = { speed: 3, hp: 2, cd: 3 }, UP_KEYS = ['speed', 'hp', 'cd'];
function upgAct() {
  var U = G.upgPanel;
  if (U.row === 0) {
    var cls = ['hunter', 'bomber'][U.recSel];
    if (!G.owned[cls] && G.stock.wood >= 25) { G.stock.wood -= 25; G.owned[cls] = true; }
  } else {
    var key = UP_KEYS[U.row - 1], lv = G.upg[key];
    if (lv < UP_MAX[key] && G.stock.soul >= UP_COST[key][lv]) { G.stock.soul -= UP_COST[key][lv]; G.upg[key]++; }
  }
}
function anyAffordable() {
  if (!G.owned.hunter && G.stock.wood >= 25) return true;
  if (!G.owned.bomber && G.stock.wood >= 25) return true;
  return UP_KEYS.some(function (k) { var lv = G.upg[k]; return lv < UP_MAX[k] && G.stock.soul >= UP_COST[k][lv]; });
}
var GOAL_COST = { wood: 300, stone: 220, time: 120, soul: 120 };
function canGoal() { return MATS.every(function (k) { return G.stock[k] >= GOAL_COST[k]; }); }

function cursorMove(dir) {
  var cur = G.cursor, col = -1, row = -1, i;
  CURSOR_COLS.forEach(function (cc, ci) { var ri = cc.indexOf(cur); if (ri >= 0) { col = ci; row = ri; } });
  if (dir === 'up' || dir === 'down') {
    var nr = row + (dir === 'up' ? -1 : 1);
    if (nr >= 0 && nr < CURSOR_COLS[col].length) G.cursor = CURSOR_COLS[col][nr];
    return;
  }
  var nc = col + (dir === 'left' ? -1 : 1);
  if (nc < 0 || nc >= CURSOR_COLS.length) return;
  var cy = CARD_POS[cur][1] + 68, best = null, bd = 1e9;
  CURSOR_COLS[nc].forEach(function (id) { var d = Math.abs(CARD_POS[id][1] + 68 - cy); if (d < bd) { bd = d; best = id; } });
  G.cursor = best;
}
function mapAct() {
  var c = G.cursor;
  if (c === 'W') { G.upgPanel = { row: 0, recSel: 0 }; return; }
  if (c === 'G') { if (canGoal()) { MATS.forEach(function (k) { G.stock[k] -= GOAL_COST[k]; }); G.screen = 'ending'; G.ending = true; } return; }
  var s = cardState(c);
  if (s === 'sealed') return;
  if (s === 'buyable') { if (G.stock.wood >= UNLOCK[c]) { G.stock.wood -= UNLOCK[c]; LEVELS[c].state.unlocked = true; } return; }
  openPanel(c);
}

function resetAll() {
  for (var i = 1; i <= 8; i++) LEVELS[i] = buildLevel(i);
  LEVELS.forEach(function (L) { if (!L) return; L.wallIdx = {}; L.walls.forEach(function (w, k) { w.cells.forEach(function (cc) { L.grid[cc[1]][cc[0]] = 'C'; L.wallIdx[cc[1] * COLS + cc[0]] = k; }); }); L.wallHp = L.walls.map(function () { return 3; }); });
  G.stock = zeroMat(); G.owned = { sword: true, hunter: false, bomber: false }; G.upg = { speed: 0, hp: 0, cd: 0 };
  G.inv = []; G.epoch = 0; G.cursor = 1; G.panel = null; G.upgPanel = null; G.flies = []; G.totalTime = 0; G.ending = false;
  G.run = null; G.result = null; G.paused = false; G.guidePage = 0; G.guideReturn = 'map'; G.screen = 'guide';
}

/* ---------- 輸入(只用鍵盤) ---------- */
function keyName(e) {
  switch (e.code) {
    case 'ArrowLeft': return 'left'; case 'ArrowRight': return 'right'; case 'ArrowUp': return 'up'; case 'ArrowDown': return 'down';
    case 'KeyZ': return 'z'; case 'KeyX': return 'x'; case 'Escape': return 'esc'; case 'Space': return 'space';
  }
  return null;
}
function inputDown(k) {
  if (k === 'space') return;
  if (k === 'esc') {
    if (G.screen === 'play' || G.screen === 'map') { G.paused = !G.paused; G.keys = {}; G.press = {}; }
    return;
  }
  if (G.paused) {
    if (G.screen === 'play') {
      if (k === 'z') { G.paused = false; startRun(G.run.idx, G.run.cls); }
      else if (k === 'x') { G.paused = false; G.run = null; G.screen = 'map'; }
    }
    return;
  }
  var sc = G.screen;
  if (sc === 'guide') {
    if (k === 'left') G.guidePage = Math.max(0, G.guidePage - 1);
    else if (k === 'right') G.guidePage = Math.min(4, G.guidePage + 1);
    else if (k === 'z') { if (G.guidePage < 4) G.guidePage++; else { G.screen = G.guideReturn; G.guidePage = 0; } }
  } else if (sc === 'map') {
    if (G.upgPanel) {
      var U = G.upgPanel;
      if (k === 'up') U.row = Math.max(0, U.row - 1); else if (k === 'down') U.row = Math.min(3, U.row + 1);
      else if (k === 'left' && U.row === 0) U.recSel = 0; else if (k === 'right' && U.row === 0) U.recSel = 1;
      else if (k === 'z') upgAct(); else if (k === 'x') G.upgPanel = null;
    } else if (G.panel) {
      var P = G.panel;
      if (k === 'up') P.row = Math.max(0, P.row - 1); else if (k === 'down') P.row = Math.min(3, P.row + 1);
      else if (k === 'left' || k === 'right') {
        var d = k === 'left' ? -1 : 1;
        if (P.row === 0) P.clsSel = clamp(P.clsSel + d, 0, 2); else if (P.row === 1) P.siteSel = clamp(P.siteSel + d, 0, 2); else if (P.row === 2) P.slotSel = clamp(P.slotSel + d, 0, 1);
      } else if (k === 'z') panelAct(); else if (k === 'x') G.panel = null;
    } else {
      if (k === 'up' || k === 'down' || k === 'left' || k === 'right') cursorMove(k);
      else if (k === 'z') mapAct(); else if (k === 'x') { G.guideReturn = 'map'; G.guidePage = 0; G.screen = 'guide'; }
    }
  } else if (sc === 'play') {
    if (k === 'left' || k === 'right') G.keys[k] = true;
    else if (k === 'up') { G.keys.up = true; G.press.up = true; }
    else if (k === 'z') G.press.z = true;
    else if (k === 'x') G.press.x = true;
  } else if (sc === 'result') {
    if (G.result.first) { if (k === 'z') G.screen = 'map'; }
    else if (k === 'z') { var L = G.result.L; L.state.rec = G.result.newRec; L.state.rp = { ptr: 0, ei: 0 }; G.screen = 'map'; }
    else if (k === 'x') G.screen = 'map';
  } else if (sc === 'fail') {
    if (k === 'z') startRun(G.run.idx, G.run.cls); else if (k === 'x') { G.run = null; G.screen = 'map'; }
  } else if (sc === 'ending') { if (k === 'z') resetAll(); }
}
function inputUp(k) { if (G.screen === 'play' && (k === 'left' || k === 'right' || k === 'up')) G.keys[k] = false; }

window.addEventListener('keydown', function (e) {
  var k = keyName(e);
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  inputDown(k);
});
window.addEventListener('keyup', function (e) { var k = keyName(e); if (!k) return; e.preventDefault(); inputUp(k); });
window.addEventListener('blur', function () { G.keys = {}; G.press = {}; });
/* ---------- 繪製 ---------- */
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
var FONT = "'Microsoft JhengHei','Noto Sans TC','PingFang TC',sans-serif";

function ctr(c, r) { return { x: c * TS + 20, y: r * TS + 20 }; }
function drawMob(type, x, y, face, state, hit, brood, t, hp, maxHp) {
  var s = { x: x, y: y, facing: face, state: state, hit: !!hit, brood: !!brood, t: t };
  if (type === 'boar') Art.drawBoar(ctx, s);
  else if (type === 'shield') Art.drawShieldman(ctx, s);
  else if (type === 'bee') Art.drawShooterBee(ctx, s);
  else if (type === 'frog') { delete s.t; Art.drawFrog(ctx, s); }
  else { delete s.brood; s.hp = hp; s.maxHp = maxHp; Art.drawBroodmother(ctx, s); }
}

// 畫一關(snap 為 null = 靜態預覽; o: {thumb, run})
function drawWorld(L, snap, o) {
  var wl = snap ? snap.wl : L.wallHp, t = G.tClock, r, c, i;
  function sol(cc, rr) { return solidAt(L, wl, cc, rr); }
  Art.drawBackground(ctx);
  L.back.forEach(function (b) { Art.drawLairBack(ctx, { x: b[0] * TS, y: b[1] * TS, w: b[2] * TS, h: b[3] * TS, theme: b[4] }); });
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
    var ch = L.grid[r][c], p = ctr(c, r), top = !sol(c, r - 1);
    switch (ch) {
      case '#': Art.drawGround(ctx, { x: p.x, y: p.y, top: top, theme: L.theme }); break;
      case 'Q': if (L.sites[1].repaired) Art.drawGround(ctx, { x: p.x, y: p.y, top: top, theme: L.theme }); else Art.drawWorksite(ctx, { x: p.x, y: p.y, kind: 'pitRock', repaired: false, theme: L.theme, bottom: false }); break;
      case 'q': if (L.sites[1].repaired) Art.drawGround(ctx, { x: p.x, y: p.y, top: top, theme: L.theme }); break;
      case 'p': Art.drawWorksite(ctx, { x: p.x, y: p.y, kind: 'pitRock', repaired: L.sites[1].repaired, theme: L.theme, bottom: false }); break;
      case 'a': Art.drawWorksite(ctx, { x: p.x, y: p.y, kind: 'scaffold', repaired: L.sites[0].repaired, theme: L.theme, bottom: L.grid[r + 1][c] !== 'a' }); break;
      case 'b': Art.drawWorksite(ctx, { x: p.x, y: p.y, kind: 'ledge', repaired: L.sites[1].repaired, theme: L.theme, bottom: false }); break;
      case 's': Art.drawWorksite(ctx, { x: p.x, y: p.y, kind: 'seal', repaired: L.sites[2].repaired, theme: L.theme, bottom: false }); break;
      case 'C': { var wi = L.wallIdx[r * COLS + c]; if (wl[wi] > 0) Art.drawCrackWall(ctx, { x: p.x, y: p.y, hp: wl[wi] }); break; }
    }
  }
  L.spikes.forEach(function (s) { var p = ctr(s.c, s.r); Art.drawSpike(ctx, { x: p.x, y: p.y }); });
  if (L.vault) Art.drawVaultDoor(ctx, { x: (L.vault.door[0] + 1) * TS, y: 13 * TS + 60, open: L.state.vaultOpen });
  if (L.sites[0].repaired) { var rg = L.sites[0].ring; Art.drawHookRing(ctx, { x: rg[0] * TS + 20, y: rg[1] * TS + 20 }); }
  if (L.nest) {
    var ns = L.sites[2].repaired ? (snap && snap.nst ? snap.nst : ['idle', 0.4, 5]) : ['dormant', 0.4, 5];
    Art.drawNest(ctx, { x: L.nest.x, y: L.nest.y, state: L.sites[2].repaired ? ns[0] : 'dormant', spawnT: Math.min(ns[1], 0.4), spawnDur: 0.4, left: Math.max(0, ns[2]) });
  }
  L.pk.forEach(function (pk, k) {
    if (!siteOn(L, pk.site) || (snap && snap.tk[k])) return;
    var p = ctr(pk.c, pk.r); Art.drawPickup(ctx, { x: p.x, y: p.y, kind: pk.kind, t: t });
  });
  L.chests.forEach(function (chs, k) {
    if (!siteOn(L, chs.site)) return;
    Art.drawChest(ctx, { x: chs.c * TS + 20, y: (chs.r + 1) * TS - 18, open: !!(L.state.chestTaken[k] || (snap && snap.ck[k])) });
  });
  Art.drawGoal(ctx, { x: L.goal[0] * TS + 20, y: L.goal[1] * TS, reached: !!(snap && snap.gr) });
  if (snap) {
    var pl = snap.p;
    if (pl[2] === 'hunter' && o.run) Art.drawRangeRing(ctx, { x: pl[0], y: pl[1], radius: 260 });
    snap.m.forEach(function (m) { drawMob(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[9], m[7], m[8]); });
    if (snap.hook) Placeholder.hookRope(ctx, pl[0], pl[1] - 6, snap.hook[0], snap.hook[1]);
    Art.drawPlayer(ctx, { x: pl[0], y: pl[1], cls: pl[2], facing: pl[3], pose: pl[4], poseT: pl[5], invuln: pl[6] });
    snap.sh.forEach(function (a) { Art.drawBeeShot(ctx, { x: a[0], y: a[1] }); });
    snap.ar.forEach(function (a) { Art.drawArrow(ctx, { x: a[0], y: a[1], angle: a[2] }); });
    snap.bo.forEach(function (a) { Art.drawBomb(ctx, { x: a[0], y: a[1], t: a[2] }); });
    snap.ex.forEach(function (a) { Art.drawExplosion(ctx, { x: a[0], y: a[1], t: a[2], dur: 0.25, radius: 60 }); });
    snap.sw.forEach(function (a) { Art.drawShockwave(ctx, { x: a[0], y: a[1], t: a[2], dur: 0.3, radius: 130 }); });
    snap.po.forEach(function (a) { Art.drawPoof(ctx, { x: a[0], y: a[1], t: a[2], dur: 0.3, big: a[3] }); });
  } else {
    L.mobs.forEach(function (m) { if (!siteOn(L, m.site)) return; var d = MOBDEF[m.type]; var x = m.c * TS + 20, y = m.type === 'bee' ? m.r * TS + 20 : (m.r + 1) * TS - d.h / 2; drawMob(m.type, x, y, 1, m.type === 'bee' ? 'fly' : (m.type === 'frog' ? 'crouch' : 'walk'), false, false, t, 0, 0); });
    if (L.mother && L.sites[2].repaired) drawMob('mother', L.mother.x, L.mother.y, 1, 'walk', false, true, t, 12, 12);
  }
  // 迷霧
  L.sites.forEach(function (s, i) {
    var a = s.repaired ? s.fogA : 1;
    if (a > 0 && s.fog) Art.drawFog(ctx, { x: s.fog[0] * TS, y: s.fog[1] * TS, w: s.fog[2] * TS, h: s.fog[3] * TS, alpha: a, t: t });
    if (i === 2 && s.vaultFog && s.repaired && !L.state.vaultOpen) Art.drawFog(ctx, { x: s.vaultFog[0] * TS, y: s.vaultFog[1] * TS, w: s.vaultFog[2] * TS, h: s.vaultFog[3] * TS, alpha: 1, t: t });
  });
  if (!o.thumb) L.sites.forEach(function (s) {
    if (!s.repaired) Art.drawSiteSign(ctx, { x: s.sign[0] * TS + 20, y: (s.sign[1] + 1) * TS - 24, cls: s.cls, role: s.role });
  });
  if (o.run) {
    var run = o.run;
    run.pops.forEach(function (q) { Art.drawPopup(ctx, { x: q.x, y: q.y, t: q.t, dur: 0.8, kind: q.kind, value: q.value }); });
    run.chainTxt.forEach(function (q) { Art.drawChainText(ctx, { x: q.x, y: q.y, n: q.n, t: q.t, dur: 0.8 }); });
  }
}

function matCost(n) { return { wood: n, stone: 0, time: 0, soul: 0 }; }
function drawMap() {
  Art.drawMapBackground(ctx);
  var i, L;
  for (i = 2; i <= 8; i++) PARENTS[i].forEach(function (pi) {
    var a = CARD_POS[pi], b = CARD_POS[i];
    Art.drawMapLink(ctx, { x1: a[0] + 176, y1: a[1] + 68, x2: b[0], y2: b[1] + 68, lit: LEVELS[pi].state.cleared });
  });
  var sel = mapActive() ? G.cursor : null;
  for (i = 1; i <= 8; i++) {
    L = LEVELS[i]; var pos = CARD_POS[i], st = cardState(i), rec = L.state.rec;
    var rates = rec ? ratesOf(rec, L) : zeroMat();
    Art.drawLevelCard(ctx, { x: pos[0], y: pos[1], index: i, name: L.name, state: st, cost: matCost(UNLOCK[i]), stock: G.stock, canAfford: G.stock.wood >= UNLOCK[i],
      rates: rates, recordCls: rec ? rec.cls : null, recordTime: rec ? rec.frames.length / 60 : null, built: L.sites.map(function (s) { return s.repaired; }) });
    if (st === 'cleared' && rec) {
      ctx.save(); ctx.beginPath(); ctx.rect(pos[0] + 8, pos[1] + 8, 160, 90); ctx.clip();
      ctx.translate(pos[0] + 8, pos[1] + 8); ctx.scale(0.125, 0.125);
      var snap = rec.frames[Math.min(rec.frames.length - 1, Math.floor(L.state.rp.ptr))];
      drawWorld(L, snap, { thumb: true });
      ctx.restore();
    }
    Art.drawCardOverlay(ctx, { x: pos[0], y: pos[1], accelLv: L.state.accel, newArea: !!(rec && rec.epoch < L.state.changeEpoch), selected: sel === i });
  }
  Art.drawWorkshopCard(ctx, { x: CARD_POS.W[0], y: CARD_POS.W[1], anyAffordable: anyAffordable(), selected: sel === 'W' });
  Art.drawGoalCard(ctx, { x: CARD_POS.G[0], y: CARD_POS.G[1], cost: GOAL_COST, stock: G.stock, canAfford: canGoal(), selected: sel === 'G' });
  drawHudMap();
  G.flies.forEach(function (f) {
    var p = f.t / 0.7, tg = HUD_ICON[f.kind];
    Art.drawFlyingMaterial(ctx, { x: f.x0 + (tg[0] - f.x0) * p, y: f.y0 + (tg[1] - f.y0) * p - 70 * Math.sin(Math.PI * p), kind: f.kind, t: f.t, dur: 0.7 });
  });
  ctx.save(); ctx.font = '16px ' + FONT; ctx.fillStyle = '#c8d0e0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('↑↓←→ 選擇  Z 確定  X 說明  Esc 暫停', 640, 702); ctx.restore();
}
function drawHudMap() { Art.drawHud(ctx, { mode: 'map', stock: G.stock, ratePerMin: totalRates(), bumpT: G.bumpT, bumpDur: 0.15, time: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null }); }

function drawLevelPanelScreen() {
  var P = G.panel, L = LEVELS[P.idx], st = L.state, rec = st.rec;
  drawMap();
  Art.drawLevelPanel(ctx, {
    index: P.idx, name: L.name, row: P.row,
    classes: CLS.map(function (c) { return { cls: c, owned: !!G.owned[c], favored: favored(c, L) }; }), clsSel: P.clsSel,
    sites: L.sites.map(function (s, i) { return { cls: SITE_CLS[i], role: s.role, main: s.main, nest: i === 2 && !!L.nest, repaired: s.repaired, cost: { wood: 0, stone: COSTS[P.idx], time: 0, soul: 0 } }; }), siteSel: P.siteSel,
    slots: st.slots.map(function (it) { return it ? it.type : null; }), slotSel: P.slotSel,
    items: G.inv.map(function (it) { return { type: it.type, where: it.where ? { level: it.where.level, slot: it.where.slot } : null }; }),
    accelLv: st.accel, accelCost: st.accel < 2 ? { wood: 0, stone: 0, time: [12, 30][st.accel], soul: 0 } : null, stock: G.stock,
    recordCls: rec ? rec.cls : null, recordTime: rec ? rec.frames.length / 60 : null, rates: rec ? ratesOf(rec, L) : null, newArea: !!(rec && rec.epoch < st.changeEpoch)
  });
  ctx.save(); ctx.beginPath(); ctx.rect(60, 96, 640, 360); ctx.clip(); ctx.translate(60, 96); ctx.scale(0.5, 0.5);
  drawWorld(L, null, { thumb: false, preview: true });
  ctx.restore();
  if (P.row === 1) {
    var s = L.sites[P.siteSel], h = s.hl;
    Art.drawSiteHighlight(ctx, { x: 60 + h[0] * 20, y: 96 + h[1] * 20, w: clamp(h[2] * 20, 20, 640 - h[0] * 20), h: clamp(h[3] * 20, 20, 360 - h[1] * 20), active: true });
  }
}
function drawUpgradeScreen() {
  var U = G.upgPanel;
  drawMap();
  Art.drawUpgradePage(ctx, {
    row: U.row, recruitSel: U.recSel,
    recruits: [{ cls: 'hunter', owned: G.owned.hunter, cost: { wood: 25, stone: 0, time: 0, soul: 0 } }, { cls: 'bomber', owned: G.owned.bomber, cost: { wood: 25, stone: 0, time: 0, soul: 0 } }],
    stats: UP_KEYS.map(function (k) { var lv = G.upg[k]; return { key: k, lv: lv, maxLv: UP_MAX[k], cost: lv >= UP_MAX[k] ? null : { wood: 0, stone: 0, time: 0, soul: UP_COST[k][lv] } }; }),
    stock: G.stock
  });
}

var GUIDE = [
  ['第 1 頁: 衝到終點', '碰到旗子就過關', 480, 270], ['第 2 頁: 操作', '↑ 跳、Z 攻擊、X 技能(Esc 暫停)', 600, 220],
  ['第 3 頁: 過關後一直重播', '過關的關卡會一直重播賺素材', 480, 300], ['第 4 頁: 撿多還是跑快', '撿越多、跑越快, 重播賺越快', 560, 240],
  ['第 5 頁: 修工事, 迷霧散開', '花石料修工事, 迷霧後有新路', 560, 220]
];
function drawGuide() {
  var g = GUIDE[G.guidePage];
  Art.drawMapBackground(ctx);
  ctx.fillStyle = 'rgba(10,14,24,0.82)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.font = 'bold 40px ' + FONT; ctx.fillStyle = '#ffe066'; ctx.fillText(g[0], 640, 66);
  ctx.font = '20px ' + FONT; ctx.fillStyle = '#8a93a8'; ctx.textAlign = 'right'; ctx.fillText((G.guidePage + 1) + ' / 5', 1240, 36);
  var s = Math.min(1000 / g[2], 400 / g[3]), w = g[2] * s, h = g[3] * s;
  Art.drawGuidePage(ctx, { page: G.guidePage, x: 640 - w / 2, y: 330 - h / 2, w: w, h: h });
  ctx.textAlign = 'center'; ctx.font = 'bold 32px ' + FONT; ctx.fillStyle = '#f2f4f8'; ctx.fillText(g[1], 640, 580);
  ctx.font = '20px ' + FONT; ctx.fillStyle = '#ffe066';
  ctx.fillText(G.guidePage < 4 ? '← → 翻頁    Z 下一頁' : '← → 翻頁    Z 開始', 640, 650);
  ctx.restore();
}

function drawPlay() {
  var run = G.run, L = run.L, p = run.p, snap = run.frames.length ? run.frames[run.frames.length - 1] : snapshot(run);
  drawWorld(L, snap, { thumb: false, run: run });
  var cd = p.cdSkillDur || 1;
  Art.drawHud(ctx, { mode: 'level', stock: G.stock, ratePerMin: totalRates(), bumpT: G.bumpT, bumpDur: 0.15, time: run.f / 60, run: run.mat, hp: Math.max(0, p.hp), maxHp: maxHp(),
    skillCdT: p.cdSkill > 0 ? Math.max(0, cd - p.cdSkill) : cd, skillCdDur: cd, cls: p.cls });
  if (run.notice) Art.drawItemNotice(ctx, { what: run.notice.what, type: run.notice.type, t: run.notice.t, dur: 1.5 });
}

function render() {
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  var sc = G.screen;
  if (sc === 'guide') drawGuide();
  else if (sc === 'map') { if (G.upgPanel) drawUpgradeScreen(); else if (G.panel) drawLevelPanelScreen(); else drawMap(); if (G.paused) Art.drawPausePanel(ctx, { mode: 'map' }); }
  else if (sc === 'play') { drawPlay(); if (G.paused) Art.drawPausePanel(ctx, { mode: 'level' }); }
  else if (sc === 'result') {
    drawPlay();
    var R = G.result, run = G.run, old = R.first ? null : R.L.state.rec;
    Art.drawResultPanel(ctx, { time: run.f / 60, run: run.mat, rates: ratesOf(R.newRec, R.L), cls: run.cls, gains: R.gains,
      oldTime: old ? old.frames.length / 60 : null, oldRates: old ? ratesOf(old, R.L) : null, oldCls: old ? old.cls : null });
  } else if (sc === 'fail') { drawPlay(); Art.drawFailPanel(ctx); }
  else if (sc === 'ending') { drawMap(); Art.drawEndingPanel(ctx, { totalTime: G.totalTime }); }
}

/* ---------- 主迴圈 ---------- */
function tick() {
  G.tClock += DT;
  if (G.screen === 'guide' || G.paused) return;
  if (G.screen !== 'ending') G.totalTime += DT;
  var i;
  for (i = 1; i <= 8; i++) if (LEVELS[i].state.rec) advanceReplay(LEVELS[i]);
  updateFlies();
  for (i = 1; i <= 8; i++) LEVELS[i].sites.forEach(function (s) { if (s.repaired && s.fogA > 0) s.fogA = Math.max(0, s.fogA - DT / 0.8); });
  if (G.screen === 'play') {
    tickRun(G.run);
    if (G.run.fail) { G.screen = 'fail'; G.keys = {}; G.press = {}; }
    else if (G.run.done) finishRun(G.run);
  }
}

function resize() {
  var dpr = window.devicePixelRatio || 1, rect = cv.getBoundingClientRect();
  var bw = Math.max(320, Math.round(rect.width * dpr));
  cv.width = bw; cv.height = Math.round(bw * H / W);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

var lastT = 0, acc = 0;
function frame(ts) {
  var dt = lastT ? (ts - lastT) / 1000 : DT; lastT = ts;
  acc += Math.min(dt, 1 / 20);
  var n = 0;
  while (acc >= DT && n < 4) { try { tick(); } catch (e) { console.error(e); } acc -= DT; n++; }
  if (acc > DT * 4) acc = 0;
  try { render(); } catch (e2) { console.error(e2); }
  requestAnimationFrame(frame);
}
resize();
//@@TESTHOOK
requestAnimationFrame(frame);
})();
