'use strict';
/* 討伐令 - 玩法驗證 Demo
 * 邏輯固定 60Hz 步進; 每步先更新狀態、記錄快照, 再依快照呼叫 Art。
 */

/* ============ 基本常數 ============ */
var W = 1280, H = 720;
if (typeof Art !== 'undefined' && Art.canvas) { W = Art.canvas.width; H = Art.canvas.height; }
var T = 40, COLS = 32, ROWS = 18, STEP = 1 / 60;
var MATS = ['wood', 'stone', 'time', 'soul'];
var CLASSES = ['sword', 'hunter', 'bomber'];
var NAMES = ['草原', '懸崖棧道', '野豬峽谷', '蜂巢高塔', '斷橋', '盾兵要塞', '蛙沼', '王座'];
var THEMES = ['plain', 'sky', 'rock', 'sky', 'sky', 'rock', 'swamp', 'throne'];
var CHEST_ITEM = ['cage', 'net', 'spear', 'net', 'cage', 'hammer', 'soulLamp', 'nestHorn'];
var HUNT_NEST = [false, false, true, false, false, true, false, true];
var SC_KIND = ['bridge', 'stairs', 'rubble', 'stairs', 'bridge', 'rubble', 'bridge', 'stairs'];
var SC_STRUCT = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道' };
var NEST_TYPES = [null, null, ['boar', 'shield'], null, null, ['shield', 'boar'], null, ['boar', 'shield', 'bee', 'frog']];
var PEN_MONS = [['frog', 'frog', 'frog', 'boar', 'boar'], ['bee', 'bee', 'bee', 'bee', 'frog'], null, ['bee', 'bee', 'bee', 'frog', 'frog'],
  ['frog', 'frog', 'frog', 'frog', 'boar'], null, ['frog', 'frog', 'frog', 'shield', 'boar'], null];
var PEN_PICK = ['wood', 'time', null, 'time', 'wood', null, 'stone', null];
var LAIR_PICK = [null, null, 'stone', null, null, 'stone', null, 'time'];
var UNLOCK_COST = [0, 20, 20, 50, 50, 50, 50, 100];
var REPAIR_COST = [[10, 12], [25, 30], [25, 30], [45, 50], [45, 50], [45, 50], [45, 50], [80, 90]];
var PARENTS = [[], [0], [0], [1], [1], [2], [2], [4, 5]];
var CARD_POS = [[40, 281], [290, 131], [290, 431], [540, 56], [540, 206], [540, 356], [540, 506], [790, 281]];
var LINKS = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 7]];
var WORKSHOP_POS = [40, 506], GOAL_POS = [1040, 281], BOARD_POS = [40, 56];
var HUD_ICON_X = { wood: 36, stone: 206, time: 376, soul: 546 };
var ACCEL_MUL = [1, 1.25, 1.5];
var ACCEL_COST = [12, 30];
var SPEED_MUL = [1, 1.08, 1.16, 1.24], SPEED_COST = [8, 20, 45];
var HP_VAL = [3, 4, 5], HP_COST = [12, 35];
var CD_MUL = [1, 0.85, 0.7, 0.55], CD_COST = [8, 20, 45];
var GOAL_COST = { wood: 300, stone: 200, time: 100, soul: 150 };
var RECRUIT_COST = 30;
var GUIDE_PAGE_BASE = 0; // Art.drawGuidePage 的 page 從 0 起算(與美術約定一致)
var GUIDE_PAGES = 6;
var SIZE = { boar: [48, 32], shield: [32, 44], bee: [32, 32], frog: [32, 28], mother: [64, 56] };
var MHP = { boar: 3, shield: 3, bee: 1, frog: 2, mother: 12 };
var DROPS = { boar: { wood: 3, soul: 1 }, shield: { stone: 3, soul: 1 }, bee: { time: 2, soul: 1 }, frog: { wood: 2, soul: 1 }, mother: { soul: 6, stone: 4, time: 3 } };
var ITEM_NAME = { cage: '捕蛙籠', spear: '野豬獵叉', net: '捕蜂網', hammer: '破盾錘', nestHorn: '巢獵號角', soulLamp: '魂燈' };
// 巢穴 / 獵場幾何(所有關共用): 入口在第 12~13 欄, 室內第 14~25 欄、第 12~15 列
var POCKET_X0 = 14 * T; // 獵場怪與巢母的左界(門框當牆)
var FOG_RECT = { x: 14 * T, y: 12 * T, w: 12 * T, h: 4 * T };

/* 討伐令清單(規則 23) */
var BOUNTIES = [
  { target: 'frog', need: 12, reward: { wood: 20 }, bonus: { mon: 'frog', kind: 'wood', n: 1 }, text: '跳蛙掉落 +1 木材' },
  { target: 'boar', need: 10, reward: { stone: 15 }, bonus: { mon: 'boar', kind: 'stone', n: 1 }, text: '野豬掉落 +1 石料' },
  { target: 'bee', need: 10, reward: { time: 10 }, bonus: { mon: 'bee', kind: 'time', n: 1 }, text: '射手蜂掉落 +1 時晶' },
  { target: 'shield', need: 10, reward: { stone: 20 }, bonus: { mon: 'shield', kind: 'stone', n: 1 }, text: '盾兵掉落 +1 石料' },
  { target: 'any', need: 80, reward: { soul: 15 }, bonus: { mon: 'any', kind: 'soul', n: 1 }, text: '全部怪物 +1 獸魂' },
  { target: 'brood', need: 20, reward: { soul: 20 }, bonus: { mon: 'brood', kind: 'soul', n: 1 }, text: '巢穴怪 +1 獸魂' },
  { target: 'frog', need: 40, reward: { wood: 50 }, bonus: { mon: 'frog', kind: 'soul', n: 1 }, text: '跳蛙掉落 +1 獸魂' },
  { target: 'boar', need: 40, reward: { wood: 50 }, bonus: { mon: 'boar', kind: 'soul', n: 1 }, text: '野豬掉落 +1 獸魂' },
  { target: 'bee', need: 30, reward: { time: 30 }, bonus: { mon: 'bee', kind: 'soul', n: 1 }, text: '射手蜂掉落 +1 獸魂' },
  { target: 'shield', need: 30, reward: { stone: 40 }, bonus: { mon: 'shield', kind: 'soul', n: 1 }, text: '盾兵掉落 +1 獸魂' },
  { target: 'mother', need: 5, reward: { soul: 30, time: 20 }, bonus: { mon: 'mother', mx2: true }, text: '巢母掉落 ×2' },
  { target: 'any', need: 400, reward: { wood: 100, stone: 80 }, bonus: { mon: 'any', kind: 'soul', n: 1 }, text: '全部怪物 +1 獸魂' }
];

/* ============ 佔位圖形(style 沒有的東西, 集中在這裡) ============ */
var Placeholder = {
  // 獵人抓鉤的鉤索(interface 註明由 RD 畫直線)
  hookLine: function (c, x1, y1, x2, y2) {
    c.save(); c.strokeStyle = '#e8e8e8'; c.lineWidth = 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
  },
  // 說明頁的底板與文字、大地圖最下方提示列(interface 註明由 RD 畫)
  panel: function (c, x, y, w, h, fill) {
    c.save(); c.fillStyle = fill || 'rgba(10,10,20,0.78)'; c.fillRect(x, y, w, h); c.restore();
  },
  text: function (c, s, x, y, size, color, align) {
    c.save(); c.font = 'bold ' + size + 'px "Microsoft JhengHei", "Noto Sans TC", sans-serif';
    c.fillStyle = color || '#fff'; c.textAlign = align || 'left'; c.textBaseline = 'middle';
    c.fillText(s, x, y); c.restore();
  }
};

/* ============ 小工具 ============ */
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function sgn(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
function rectsHit(ax, ay, aw, ah, bx, by, bw, bh) { return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh; }
function circleRect(cx, cy, rad, b) {
  var nx = clamp(cx, b.x - b.w / 2, b.x + b.w / 2), ny = clamp(cy, b.y - b.h / 2, b.y + b.h / 2);
  var dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy <= rad * rad;
}
function dist2(ax, ay, bx, by) { return (ax - bx) * (ax - bx) + (ay - by) * (ay - by); }
function zeroGroup() { return { wood: 0, stone: 0, time: 0, soul: 0 }; }
function groupOf(k, n) { var g = zeroGroup(); g[k] = n; return g; }
function round1(v) { return Math.round(v * 10) / 10; }
function zeroKills() { return { boar: 0, shield: 0, bee: 0, frog: 0, mother: 0 }; }

/* ============ 關卡資料 ============ */
/* 地形代碼: 1 地面 2 裂岩牆 3 坍方亂石(巢穴通道, 未修實心) 4 倒塌柵門(未修實心) 5 尖刺
 * 6 堵塞隧道亂石(捷徑未修實心) 7 獵場矮牆 8 斷橋 / 崩梯結構格(捷徑修好才實心) */
var LV = [];
// 每關參數: PT = 高原頂面列; 其餘由 build 函式放置
var PT = [8, 10, 8, 10, 8, 8, 8, 10];
function buildLevel(n) {
  var P = PT[n], nest = HUNT_NEST[n];
  var t = [], r, c;
  for (r = 0; r < ROWS; r++) t.push(new Array(COLS).fill(0));
  var L = {
    n: n, theme: THEMES[n], t: t, P: P, nest: nest, cracks: [], hooks: [], pickups: [], mons: [], huntMons: [], W: [],
    start: { x: 50, y: 640 - 22 }, signs: [], chest: { x: 620, y: 640 - 18 }, nestPos: null, mother: null, cache: {}
  };
  function rect(c0, r0, c1, r1, v) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) t[rr][cc] = v; }
  function pick(cc, rr, k, area) { L.pickups.push({ x: cc * T + 20, y: rr * T + 20, kind: k, area: area || 'main' }); }
  function mon(k, cc, gr) { L.mons.push({ k: k, x: cc * T + 20, y: gr * T - SIZE[k][1] / 2 }); }
  function bee(cc, rr) { L.mons.push({ k: 'bee', x: cc * T + 20, y: rr * T + 20 }); }
  function spike(cc, rr) { t[rr][cc] = 5; }
  function crack(cc, r0, r1) { var tiles = []; for (var rr = r0; rr <= r1; rr++) { t[rr][cc] = 2; tiles.push([cc, rr]); } L.cracks.push({ tiles: tiles }); }
  function goal(cc, topRow) { L.goal = { x: cc * T + 20, y: topRow * T - 40 }; }
  function highPlat(c0) { rect(c0, P - 5, c0 + 3, P - 5, 1); rect(c0 + 4, P - 3, c0 + 5, P - 3, 1); rect(c0 + 7, P - 1, c0 + 7, P - 1, 1); L.hooks.push({ x: c0 * T - 20, y: (P - 5) * T + 8 }); }
  // 斷橋: 左岸台階塊 + 拱(翻丘路線) + 尖刺溝; 缺口格 8
  function bridge(cA, len) {
    rect(cA, 6, cA + 1, 7, 1); rect(cA + 2, 5, cA + 1 + len, 5, 1);
    rect(cA + 2, 8, cA + 1 + len, 10, 0);
    for (var cc = cA + 2; cc <= cA + 1 + len; cc++) { spike(cc, 10); t[8][cc] = 8; }
  }
  // 崩梯: 石梯(格 8, 每階 2 格高)通往高台(第 6 列, 比高原高 160px, 起跳高度不夠); 主路走到最右端,
  // 經兩個小台階(R0 高 1 格、R1 高 2 格)上高台右端, 再往左走回終點(高台下方留足頭頂淨空)
  function stairs(a) {
    rect(a, 8, a + 1, 9, 8);
    rect(a + 2, 6, 27, 6, 1);
    rect(28, 9, 29, 9, 1); rect(30, 8, 31, 9, 1);
  }
  // 堵塞隧道: 岩壁(第 4~7 列)中穿過 2 格高隧道, 繞上去的台階在左側
  function rubbleWall(w) {
    rect(w, 4, w + 2, 7, 1); rect(w - 2, 6, w - 1, 7, 1); rect(w, 6, w + 2, 7, 6);
  }
  /* --- 骨架 --- */
  rect(0, 16, 31, 17, 1); rect(12, P, 31, 15, 1);
  rect(2, 14, 3, 15, 1); rect(5, 12, 6, 12, 1);
  if (P === 8) { rect(8, 10, 9, 10, 1); rect(10, 8, 11, 9, 1); } else rect(8, 10, 11, 11, 1);
  // 獵場 / 巢穴室(第 14~25 欄、第 12~15 列)與入口(第 12~13 欄、第 14~15 列)
  rect(14, 12, 25, 15, 0); rect(12, 14, 13, 15, 0);
  if (nest) { rect(12, 14, 13, 15, 3); }
  else { rect(12, 14, 13, 15, 4); rect(14, 11, 25, 11, 7); rect(12, 12, 13, 13, 7); rect(26, 12, 26, 15, 7); }
  var hx = 12 * T, hy = 14 * T;
  /* --- 各關 --- */
  var i, sg;
  switch (n) {
    case 0:
      bridge(12, 10); highPlat(24); goal(26, 8);
      [[6, 15], [8, 15], [9, 15], [16, 4], [19, 4], [22, 4], [28, 7], [30, 7]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      [[11, 15], [25, 7], [29, 7]].forEach(function (a) { pick(a[0], a[1], 'stone'); });
      pick(25, 2, 'time'); pick(26, 2, 'time');
      mon('boar', 7, 16); mon('frog', 29, 8); mon('frog', 30, 8); mon('shield', 27, 8); bee(18, 2);
      L.signs.push({ x: 460, y: 320 - 24, role: 'shortcut' });
      break;
    case 1:
      stairs(14); goal(18, 6);
      [[5, 15], [9, 15], [20, 5], [22, 5], [25, 5], [27, 5]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      pick(13, 9, 'stone'); pick(24, 9, 'stone');
      [[17, 9], [21, 9], [30, 7], [31, 7]].forEach(function (a) { pick(a[0], a[1], 'time'); });
      spike(19, 9); spike(23, 9);
      mon('frog', 18, 10); mon('frog', 22, 10); bee(20, 8); bee(25, 8);
      L.signs.push({ x: 460, y: 400 - 24, role: 'shortcut' });
      break;
    case 2:
      rubbleWall(20);
      rect(28, 5, 31, 5, 1); crack(28, 6, 7); pick(30, 7, 'stone'); pick(31, 7, 'stone');
      goal(25, 8);
      [[5, 15], [9, 15], [13, 7], [15, 7], [21, 3], [24, 7]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      pick(11, 15, 'stone'); pick(26, 7, 'stone'); pick(27, 7, 'time');
      spike(16, 7); spike(17, 7);
      mon('boar', 13, 8); mon('boar', 14, 8); mon('boar', 15, 8); mon('shield', 24, 8);
      L.signs.push({ x: 700, y: 320 - 24, role: 'shortcut' });
      break;
    case 3:
      stairs(18); goal(22, 6);
      [[5, 15], [9, 15], [23, 5], [25, 5]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      pick(13, 9, 'stone'); pick(21, 9, 'stone');
      [[16, 9], [24, 5], [27, 5], [30, 7], [31, 7]].forEach(function (a) { pick(a[0], a[1], 'time'); });
      spike(14, 9); spike(24, 9);
      mon('frog', 16, 10); bee(15, 7); bee(17, 7); bee(25, 8);
      L.signs.push({ x: 460, y: 400 - 24, role: 'shortcut' });
      break;
    case 4:
      rect(14, 8, 17, 9, 0); rect(20, 8, 23, 9, 0); rect(26, 8, 29, 9, 0);
      for (i = 20; i <= 23; i++) t[8][i] = 8;
      for (i = 26; i <= 29; i++) t[8][i] = 8;
      goal(31, 8);
      [[5, 15], [9, 15], [16, 9], [17, 9], [13, 7], [30, 7], [18, 7], [24, 7]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      pick(11, 15, 'stone'); pick(25, 7, 'stone');
      pick(19, 7, 'time'); pick(25, 6, 'time'); pick(13, 6, 'time');
      spike(15, 9); spike(21, 9); spike(27, 9);
      mon('boar', 14, 10); mon('boar', 17, 10); mon('frog', 18, 8); mon('frog', 24, 8); bee(22, 5);
      L.signs.push({ x: 460, y: 320 - 24, role: 'shortcut' });
      break;
    case 5:
      rubbleWall(22);
      rect(28, 5, 31, 5, 1); crack(28, 6, 7); crack(30, 6, 7); pick(31, 7, 'stone'); pick(31, 6, 'stone');
      goal(26, 8);
      [[5, 15], [9, 15], [13, 7], [27, 7]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      [[11, 15], [16, 7], [19, 7], [23, 3]].forEach(function (a) { pick(a[0], a[1], 'stone'); });
      pick(14, 7, 'time'); pick(25, 7, 'time');
      spike(15, 7); spike(18, 7);
      mon('shield', 13, 8); mon('shield', 15, 8); mon('shield', 17, 8); mon('boar', 19, 8); bee(14, 4);
      L.signs.push({ x: 780, y: 320 - 24, role: 'shortcut' });
      break;
    case 6:
      rect(14, 8, 27, 10, 0);
      for (i = 14; i <= 27; i++) spike(i, 10);
      t[10][19] = 1;
      [[14, 15], [17, 18], [20, 21], [23, 24], [26, 27]].forEach(function (a) { rect(a[0], 8, a[1], 8, 1); });
      [16, 19, 22, 25].forEach(function (cc) { t[8][cc] = 8; });
      goal(30, 8);
      [[5, 15], [9, 15], [16, 7], [19, 7], [22, 7], [25, 7]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      [[11, 15], [29, 7], [31, 7]].forEach(function (a) { pick(a[0], a[1], 'stone'); });
      pick(20, 6, 'time'); pick(23, 6, 'time');
      mon('frog', 15, 8); mon('frog', 27, 8); mon('frog', 28, 8); mon('frog', 29, 8); mon('shield', 13, 8); bee(21, 5);
      L.signs.push({ x: 460, y: 320 - 24, role: 'shortcut' });
      break;
    default:
      stairs(16); goal(20, 6); crack(14, 7, 9);
      [[5, 15], [9, 15], [21, 5], [23, 5], [25, 5], [27, 5]].forEach(function (a) { pick(a[0], a[1], 'wood'); });
      [[13, 9], [19, 9], [22, 9], [26, 9]].forEach(function (a) { pick(a[0], a[1], 'stone'); });
      [[30, 7], [31, 7], [24, 5], [26, 5]].forEach(function (a) { pick(a[0], a[1], 'time'); });
      spike(21, 9); spike(24, 9);
      mon('boar', 19, 10); mon('boar', 20, 10); mon('shield', 22, 10); mon('frog', 25, 10); mon('frog', 26, 10); bee(23, 8);
      L.signs.push({ x: 460, y: 400 - 24, role: 'shortcut' });
      break;
  }
  L.signs.push({ x: 420, y: 640 - 24, role: nest ? 'nest' : 'hunt' });
  /* --- 獵場 / 巢穴內容 --- */
  L.gate = { x: 13 * T, y: 15 * T };
  if (nest) {
    L.nestPos = { x: 980, y: 640 - 24 };
    L.mother = { x: 800, y: 640 - 28 };
    pick(17, 15, LAIR_PICK[n], 'hunt'); pick(22, 15, LAIR_PICK[n], 'hunt');
    L.lairRects = [[14, 12, 12, 4], [12, 14, 2, 2]];
  } else {
    var pm = PEN_MONS[n], pxs = [19, 20, 21, 22, 23];
    for (i = 0; i < 5; i++) {
      var k = pm[i], s = SIZE[k];
      L.huntMons.push({ k: k, x: pxs[i] * T + 20 - (k === 'bee' ? 0 : 0), y: k === 'bee' ? 640 - 90 : 640 - s[1] / 2 });
    }
    pick(17, 15, PEN_PICK[n], 'hunt'); pick(23, 15, PEN_PICK[n], 'hunt');
    L.lairRects = [];
  }
  /* --- 工程格表與外框 --- */
  var minc = 99, maxc = -1, minr = 99, maxr = -1;
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
    var v = t[r][c];
    if (v === 6 || v === 8) {
      var kind = SC_KIND[n];
      var cell = { c: c, r: r, kind: kind, end: false, bottom: false };
      if (kind === 'bridge') cell.end = !(t[r][c - 1] === 8) || !(t[r][c + 1] === 8);
      if (kind === 'stairs') cell.bottom = (r === 9);
      L.W.push(cell);
      minc = Math.min(minc, c); maxc = Math.max(maxc, c); minr = Math.min(minr, r); maxr = Math.max(maxr, r);
    }
  }
  if (SC_KIND[n] === 'bridge') { minr = 4; maxr = 10; if (n === 0) { minc = 12; maxc = 23; } }
  if (SC_KIND[n] === 'stairs') { minr = 6; maxr = 9; maxc = minc + 3; }
  if (SC_KIND[n] === 'rubble') { minr = 4; maxr = 7; minc -= 2; }
  L.scRect = { c0: minc, r0: minr, c1: maxc, r1: maxr };
  L.hx = hx; L.hy = hy;
  return L;
}
function buildAll() { LV = []; for (var i = 0; i < 8; i++) LV.push(buildLevel(i)); }
function solidCode(v) { return v === 1 || v === 2 || v === 3 || v === 4 || v === 6 || v === 7 || v === 9; }
// 依修復狀態產出的地形(8 → 9 為實心橋面 / 階梯)
function terrFor(L, rep) {
  var key = (rep.sc ? 1 : 0) + (rep.hunt ? 2 : 0);
  if (L.cache[key]) return L.cache[key];
  var t = L.t.map(function (row) { return row.slice(); });
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
    var v = t[r][c];
    if ((v === 3 || v === 4) && rep.hunt) t[r][c] = 0;
    else if (v === 6 && rep.sc) t[r][c] = 0;
    else if (v === 8) t[r][c] = rep.sc ? 9 : 0;
  }
  L.cache[key] = t; return t;
}

/* ============ 持久狀態 ============ */
var ST, S, G, K, HELD, RP, FLY, BUMP, R = null, PENDING = null, BQ = [], BN = null;
function resetAll() {
  ST = {
    stock: zeroGroup(), unlocked: [true, false, false, false, false, false, false, false],
    lv: [], bag: [], medals: 0, recruited: { hunter: false, bomber: false }, up: { speed: 0, hp: 0, cd: 0 },
    rec: [null, null, null, null, null, null, null, null], playT: 0,
    bc: [], bnext: 3, bdone: []
  };
  for (var i = 0; i < 8; i++) ST.lv.push({ rep: { sc: false, hunt: false }, repSeq: 0, slots: [null, null], accel: 0, lastCls: 0, chestTaken: false, medalTaken: false, fogA: 1 });
  for (i = 0; i < 3; i++) ST.bc.push({ idx: i, prog: 0, newT: 0.4, doneT: 0.4 });
  S = { mode: 'guide', pause: false, cur: 0, lp: null, up: null };
  G = { page: 0 };
  K = { z: false, x: false, jump: false };
  RP = [null, null, null, null, null, null, null, null];
  FLY = []; BQ = []; BN = null;
  BUMP = { wood: 0.15, stone: 0.15, time: 0.15, soul: 0.15 };
  R = null; PENDING = null;
}
function clsOwned(i) { return i === 0 || (i === 1 && ST.recruited.hunter) || (i === 2 && ST.recruited.bomber); }
function canPay(c) { for (var i = 0; i < 4; i++) if (ST.stock[MATS[i]] < (c[MATS[i]] || 0)) return false; return true; }
function pay(c) { for (var i = 0; i < 4; i++) ST.stock[MATS[i]] -= (c[MATS[i]] || 0); }
function addStock(k, n) { ST.stock[k] += n; BUMP[k] = 0; }
function levelState(n) {
  if (ST.rec[n]) return 'cleared';
  if (ST.unlocked[n]) return 'open';
  var p = PARENTS[n];
  for (var i = 0; i < p.length; i++) if (ST.rec[p[i]]) return 'buyable';
  return 'sealed';
}
function repairedCount(n) { var r = ST.lv[n].rep; return (r.sc ? 1 : 0) + (r.hunt ? 1 : 0); }
function maxHpNow() { return HP_VAL[ST.up.hp]; }

/* ============ 掉落(即時與回放共用同一個函式) ============ */
function bountyMatch(target, mon, brood) {
  if (target === 'any') return true;
  if (target === 'brood') return !!brood;
  return target === mon;
}
function gearBonus(slots, mon, brood) {
  var b = 0;
  for (var i = 0; i < slots.length; i++) {
    if (!slots[i]) continue;
    var s = slots[i].type;
    if (s === 'cage' && mon === 'frog') b++;
    else if (s === 'spear' && mon === 'boar') b++;
    else if (s === 'net' && mon === 'bee') b++;
    else if (s === 'hammer' && mon === 'shield') b++;
    else if (s === 'nestHorn' && (brood || mon === 'mother')) b++;
  }
  return b;
}
// 規則 33: (基本掉落 × 巢母 ×2 + 永久加成 + 勳章) × (1 + 獵具加成), 每種素材各自取整
function dropGroup(mon, brood, slots) {
  var base = zeroGroup(), add = zeroGroup(), i, k;
  for (k in DROPS[mon]) base[k] = DROPS[mon][k];
  if (brood) base.soul += 1;
  for (i = 0; i < ST.bdone.length; i++) {
    var bn = BOUNTIES[ST.bdone[i]].bonus;
    if (bn.mx2) { if (mon === 'mother') for (k in base) base[k] *= 2; continue; }
    if (bn.mon === 'any' || (bn.mon === 'brood' ? !!brood : bn.mon === mon)) add[bn.kind] += bn.n;
  }
  add.soul += ST.medals;
  var gear = gearBonus(slots, mon, brood), out = zeroGroup();
  for (i = 0; i < 4; i++) { k = MATS[i]; out[k] = Math.round((base[k] + add[k]) * (1 + gear)); }
  return out;
}
function gainsOf(ev, n) {
  var slots = ST.lv[n].slots, out = [], i;
  if (ev.src === 'pick') return [{ kind: ev.kind, n: 1, x: ev.x, y: ev.y }];
  if (ev.src === 'goal') {
    var lamps = 0;
    for (i = 0; i < slots.length; i++) if (slots[i] && slots[i].type === 'soulLamp') lamps++;
    if (lamps) out.push({ kind: 'soul', n: 3 * lamps, x: ev.x, y: ev.y });
    return out;
  }
  var g = dropGroup(ev.mon, ev.brood, slots);
  for (i = 0; i < 4; i++) if (g[MATS[i]] > 0) out.push({ kind: MATS[i], n: g[MATS[i]], x: ev.x, y: ev.y });
  return out;
}
function ratesOf(events, dur, n, accel) {
  var tot = zeroGroup(), i, j;
  for (i = 0; i < events.length; i++) { var gs = gainsOf(events[i], n); for (j = 0; j < gs.length; j++) tot[gs[j].kind] += gs[j].n; }
  var out = zeroGroup();
  for (i = 0; i < 4; i++) out[MATS[i]] = round1(tot[MATS[i]] / dur * 60 * accel);
  return out;
}
function killsOf(events) {
  var k = zeroKills();
  for (var i = 0; i < events.length; i++) if (events[i].src === 'kill') k[events[i].mon]++;
  return k;
}
function recRates(n) {
  var rec = ST.rec[n]; if (!rec) return null;
  return ratesOf(rec.events, rec.dur, n, ACCEL_MUL[ST.lv[n].accel]);
}
function totalRates() {
  var t = zeroGroup();
  for (var n = 0; n < 8; n++) { var r = recRates(n); if (r) for (var i = 0; i < 4; i++) t[MATS[i]] += r[MATS[i]]; }
  for (var k = 0; k < 4; k++) t[MATS[k]] = round1(t[MATS[k]]);
  return t;
}

/* ============ 討伐令 ============ */
function bountyKill(mon, brood) {
  for (var ci = 0; ci < 3; ci++) {
    var col = ST.bc[ci]; if (col.idx < 0) continue;
    var b = BOUNTIES[col.idx];
    if (bountyMatch(b.target, mon, brood)) { col.prog++; if (col.prog >= b.need) completeBounty(ci); }
  }
}
function completeBounty(ci) {
  var col = ST.bc[ci], b = BOUNTIES[col.idx], i;
  for (i = 0; i < 4; i++) if (b.reward[MATS[i]]) addStock(MATS[i], b.reward[MATS[i]]);
  ST.bdone.push(col.idx); BQ.push({ idx: col.idx, t: 0 });
  col.doneT = 0;
  if (ST.bnext < BOUNTIES.length) { col.idx = ST.bnext++; col.prog = 0; col.newT = 0; }
  else { col.idx = -1; col.prog = 0; }
}

/* ============ 物理 ============ */
function tileSolid(t, c, r) { if (c < 0 || c >= COLS) return true; if (r < 0 || r >= ROWS) return false; return solidCode(t[r][c]); }
function solidAt(t, x, y) { return tileSolid(t, Math.floor(x / T), Math.floor(y / T)); }
function bodyHits(t, b) {
  var c0 = Math.floor((b.x - b.w / 2) / T), c1 = Math.floor((b.x + b.w / 2 - 0.001) / T);
  var r0 = Math.floor((b.y - b.h / 2) / T), r1 = Math.floor((b.y + b.h / 2 - 0.001) / T);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (tileSolid(t, c, r)) return true;
  return false;
}
function moveAxis(t, b, d, axis) {
  if (axis === 'x') b.hitX = 0; else b.hitY = 0;
  if (!d) return;
  var n = Math.ceil(Math.abs(d) / 6), s = d / n, sg = sgn(d), i;
  for (i = 0; i < n; i++) {
    b[axis] += s;
    if (bodyHits(t, b)) {
      b[axis] -= s;
      var lo = 0, hi = Math.abs(s);
      for (var k = 0; k < 7; k++) { var mid = (lo + hi) / 2; b[axis] += sg * mid; if (bodyHits(t, b)) hi = mid; else lo = mid; b[axis] -= sg * mid; }
      b[axis] += sg * lo;
      if (axis === 'x') b.hitX = sg; else b.hitY = sg;
      return;
    }
  }
}
function moveX(t, b, d) { moveAxis(t, b, d, 'x'); }
function moveY(t, b, d) { moveAxis(t, b, d, 'y'); }
function groundAhead(r, m, dir) { return solidAt(r.t, m.x + dir * (m.w / 2 + 2), m.y + m.h / 2 + 4); }
// 獵場怪 / 巢母不可越過左界(門框當成牆)
function atLimit(m, dir) { return m.lim !== undefined && dir < 0 && m.x - m.w / 2 <= m.lim + 1; }

/* ============ 一趟跑關 ============ */
function newRun(n, clsIdx) {
  var L = LV[n], rep = ST.lv[n].rep;
  var r = {
    n: n, L: L, cls: CLASSES[clsIdx], clsIdx: clsIdx, t: terrFor(L, rep).map(function (row) { return row.slice(); }),
    frames: [], events: [], tk: [], mid: 0, atkN: 0, chain: {},
    mons: [], arrows: [], shots: [], bombs: [], ex: [], sw: [], pf: [], popups: [], chainTx: [],
    gain: zeroGroup(), kills: zeroKills(), reached: false, over: null, notices: [], notice: null,
    chestOpen: ST.lv[n].chestTaken, chestOpenF: -1, chestGot: null, medalGot: false,
    nestN: 0, nestT: 1.0, nestSp: 0.4, mhp: maxHpNow()
  };
  r.cg = L.cracks.map(function (g) { return { tiles: g.tiles, hp: 3 }; });
  r.cgMap = {};
  r.cg.forEach(function (g, gi) { g.tiles.forEach(function (tl) { r.cgMap[tl[1] * COLS + tl[0]] = gi; }); });
  r.ck = r.cg.map(function () { return 3; });
  r.p = {
    x: L.start.x, y: L.start.y, w: 28, h: 44, vx: 0, vy: 0, facing: 1, ground: false, hp: maxHpNow(), inv: 0, kb: 0, kbDir: 0,
    jumpT: 9, atkCd: 0, skCd: 0, skDur: 1, autoCd: 0, dash: null, hook: null, act: '', actT: 9, dashAvail: true, pose: 'idle', poseT: 0, hitX: 0, hitY: 0
  };
  L.mons.forEach(function (d) { r.mons.push(newMon(r, d.k, d.x, d.y, false, false)); });
  if (rep.hunt && !L.nest) L.huntMons.forEach(function (d) { r.mons.push(newMon(r, d.k, d.x, d.y, false, true)); });
  if (rep.hunt && L.nest) r.mons.push(newMon(r, 'mother', L.mother.x, L.mother.y, false, true));
  r.nestOn = rep.hunt && L.nest;
  return r;
}
function newMon(r, k, x, y, brood, limited) {
  var s = SIZE[k];
  var m = {
    id: ++r.mid, k: k, x: x, y: y, w: s[0], h: s[1], vx: 0, vy: 0, facing: -1, state: k === 'bee' ? 'fly' : k === 'frog' ? 'crouch' : 'walk', st: 0, hp: MHP[k],
    brood: !!brood, hitT: 0, blockT: 0, flung: 0, flungT: 0, atk: 0, hitSet: null, alive: true, ox: x, oy: y, bdir: 1, tt: 0, shotCd: 0.5, ground: false, hitX: 0, hitY: 0
  };
  if (limited) m.lim = POCKET_X0;
  if (k === 'frog') m.st = 0.6 + (m.id % 4) * 0.2;
  return m;
}
function newAtk(r) { return ++r.atkN; }

/* --- 事件 / 掉落 --- */
function pushEvent(r, ev, idx) {
  ev.f = r.frames.length; r.events.push(ev);
  var gs = gainsOf(ev, r.n);
  for (var i = 0; i < gs.length; i++) {
    r.gain[gs[i].kind] += gs[i].n;
    r.popups.push({ x: gs[i].x, y: gs[i].y - (idx || 0) * 18 - i * 18, t: 0, dur: 0.8, kind: gs[i].kind, value: clamp(gs[i].n, 1, 60) });
  }
}
function addNotice(r, what, type) { r.notices.push({ what: what, type: type, t: 0, dur: 1.5 }); }
function killMon(r, m, atk) {
  m.alive = false;
  r.pf.push({ x: m.x, y: m.y, t: 0, dur: 0.3, big: m.k === 'mother' });
  var k = (r.chain[atk] = (r.chain[atk] || 0) + 1);
  r.kills[m.k]++;
  pushEvent(r, { src: 'kill', x: m.x, y: m.y, mon: m.k, brood: m.brood }, 0);
  if (k >= 2) {
    r.chainTx = r.chainTx.filter(function (c) { return c.atk !== atk; });
    r.chainTx.push({ x: m.x, y: m.y - 24, n: clamp(k, 2, 20), t: 0, dur: 0.8, atk: atk });
  }
  if (m.k === 'mother' && !ST.lv[r.n].medalTaken && !r.medalGot) { r.medalGot = true; addNotice(r, 'medal', null); }
  if (r.p.dash && atk === r.p.dash.atk) r.p.dash.killed = true;
}
function hitMon(r, m, dmg, atk) {
  if (!m.alive) return false;
  if (m.k === 'mother' && m.state === 'stun') dmg *= 2;
  m.hp -= dmg; m.hitT = 0.1;
  if (m.hp <= 0) { killMon(r, m, atk); return true; }
  return false;
}
// 盾兵: 方向以攻擊者 / 投射物的出發點對盾兵面向判定(貼身也不會判反)
function blocks(m, fromDir, cy) { return m.k === 'shield' && !m.flung && m.facing === fromDir && cy >= m.y - m.h / 2; }
function fling(r, m, dir, atk) { m.flung = dir; m.flungT = 0.6; m.atk = atk; m.hitSet = {}; }
function monsSorted(r, x, y) {
  return r.mons.filter(function (m) { return m.alive; }).sort(function (a, b) { return dist2(a.x, a.y, x, y) - dist2(b.x, b.y, x, y); });
}

/* --- 裂岩牆 --- */
function wallHit(r, gi, breakNow) {
  var g = r.cg[gi]; if (g.hp <= 0) return;
  g.hp = breakNow ? 0 : g.hp - 1;
  r.ck = r.cg.map(function (q) { return q.hp; });
  if (g.hp <= 0) {
    g.tiles.forEach(function (tl) { r.t[tl[1]][tl[0]] = 0; r.pf.push({ x: tl[0] * T + 20, y: tl[1] * T + 20, t: 0, dur: 0.3, big: false }); });
  }
}
function wallsInBox(r, cx, cy, w, h, hitSet, breakNow) {
  var c0 = Math.floor((cx - w / 2) / T), c1 = Math.floor((cx + w / 2 - 0.001) / T), r0 = Math.floor((cy - h / 2) / T), r1 = Math.floor((cy + h / 2 - 0.001) / T);
  for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
    if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
    var gi = r.cgMap[rr * COLS + cc];
    if (gi === undefined || r.cg[gi].hp <= 0 || hitSet[gi]) continue;
    hitSet[gi] = 1; wallHit(r, gi, breakNow);
  }
}
function wallsInCircle(r, cx, cy, rad) {
  for (var gi = 0; gi < r.cg.length; gi++) {
    var g = r.cg[gi]; if (g.hp <= 0) continue;
    for (var i = 0; i < g.tiles.length; i++) {
      var tl = g.tiles[i];
      if (circleRect(cx, cy, rad, { x: tl[0] * T + 20, y: tl[1] * T + 20, w: T, h: T })) { wallHit(r, gi, true); break; }
    }
  }
}

/* --- 玩家 --- */
function playerDamage(r, fromX) {
  var p = r.p;
  if (p.inv > 0 || p.dash || r.over) return;
  p.hp--; p.inv = 1; p.kb = 0.12; p.kbDir = sgn(p.x - fromX) || -p.facing;
  if (p.hp <= 0) r.over = 'fail';
}
function updatePlayer(r, dt) {
  var p = r.p, i;
  p.inv = Math.max(0, p.inv - dt); p.atkCd = Math.max(0, p.atkCd - dt); p.skCd = Math.max(0, p.skCd - dt);
  p.actT += dt; p.jumpT += dt;
  var dir = (HELD.right ? 1 : 0) - (HELD.left ? 1 : 0);
  var spd = (r.cls === 'bomber' ? 230 : 260) * SPEED_MUL[ST.up.speed];
  var cdMul = CD_MUL[ST.up.cd];
  if (p.ground) p.dashAvail = true;
  // 抓鉤中
  if (p.hook) {
    var h = p.hook; h.t += dt;
    var dx = h.tx - p.x, dy = h.ty - p.y, d = Math.sqrt(dx * dx + dy * dy), stepd = 700 * dt;
    if (d <= stepd || h.t > 0.7) { p.x = h.tx; p.y = h.ty; p.vy = -500; p.hook = null; p.ground = false; }
    else {
      var ox = p.x, oy = p.y;
      moveX(r.t, p, dx / d * stepd); moveY(r.t, p, dy / d * stepd);
      if (Math.abs(p.x - ox) + Math.abs(p.y - oy) < 0.5) { h.stuck = (h.stuck || 0) + dt; if (h.stuck > 0.15) { p.hook = null; p.vy = 0; } }
    }
    p.vx = 0; if (p.hook) { K.z = K.x = K.jump = false; setPose(p, 'hook', dt); return; }
  }
  // 衝刺斬中
  if (p.dash) {
    var dd = p.dash; dd.t -= dt;
    moveX(r.t, p, dd.dir * (160 / 0.18) * dt); p.vy = 0;
    var hitWall = p.hitX !== 0;
    if (hitWall) { wallsInBox(r, p.x + dd.dir * (p.w / 2 + 2), p.y, 4, p.h - 4, dd.walls, false); }
    var ms = monsSorted(r, p.x, p.y);
    for (i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (dd.hit[m.id] || !rectsHit(p.x, p.y, p.w + 6, p.h, m.x, m.y, m.w, m.h)) continue;
      dd.hit[m.id] = 1;
      if (blocks(m, sgn(p.x - m.x) || -dd.dir, p.y)) { m.blockT = 0.2; m.hitT = 0.1; dd.t = 0; p.x = m.x - dd.dir * (m.w / 2 + p.w / 2 + 1); break; }
      if (hitMon(r, m, 2, dd.atk)) dd.killed = true;
    }
    if (dd.killed) { p.skCd = 0; }
    if (dd.t <= 0 || hitWall) { p.dash = null; }
    K.z = K.x = K.jump = false;
    setPose(p, p.dash ? 'dash' : 'fall', dt);
    return;
  }
  // 水平
  if (p.kb > 0) { p.kb -= dt; moveX(r.t, p, p.kbDir * (80 / 0.12) * dt); }
  else { moveX(r.t, p, dir * spd * dt); if (dir) p.facing = dir; }
  // 跳躍(↑)
  if (K.jump && p.ground && p.kb <= 0) { p.vy = -720; p.ground = false; p.jumpT = 0; }
  if (!HELD.up && p.jumpT < 0.15 && p.vy < -360) p.vy = -360;
  p.vy = Math.min(p.vy + 2400 * dt, 1200);
  moveY(r.t, p, p.vy * dt);
  if (p.hitY > 0) { p.vy = 0; p.ground = true; } else { if (p.hitY < 0) p.vy = 0; p.ground = false; }
  // 攻擊與技能
  if (p.kb <= 0) {
    if (r.cls === 'sword') {
      if (K.z && p.atkCd <= 0) {
        p.atkCd = 0.3; p.act = 'slash'; p.actT = 0; var atk = newAtk(r);
        var bx = p.x + p.facing * (p.w / 2 + 25), by = p.y;
        var mons = monsSorted(r, p.x, p.y);
        for (i = 0; i < mons.length; i++) {
          var mm = mons[i];
          if (!rectsHit(bx, by, 50, 40, mm.x, mm.y, mm.w, mm.h)) continue;
          if (blocks(mm, sgn(p.x - mm.x) || -p.facing, by)) { mm.blockT = 0.2; mm.hitT = 0.1; continue; }
          hitMon(r, mm, 1, atk);
        }
        wallsInBox(r, bx, by, 50, 40, {}, false);
      }
      if (K.x && p.skCd <= 0 && p.dashAvail) {
        p.dashAvail = false; p.skDur = 1.2 * cdMul; p.skCd = p.skDur;
        p.dash = { t: 0.18, dir: p.facing, hit: {}, walls: {}, atk: newAtk(r), killed: false };
      }
    } else if (r.cls === 'hunter') {
      if (K.z && p.atkCd <= 0) {
        p.atkCd = 0.4; p.act = 'shoot'; p.actT = 0;
        r.arrows.push({ x: p.x + p.facing * 16, y: p.y, vx: p.facing * 700, vy: 0, ang: p.facing > 0 ? 0 : Math.PI, dist: 0, max: 600, atk: newAtk(r) });
      }
      if (K.x && p.skCd <= 0) {
        var best = null, bd = 220 * 220;
        for (i = 0; i < r.L.hooks.length; i++) { var hk = r.L.hooks[i], d2 = dist2(p.x, p.y, hk.x, hk.y); if (d2 <= bd) { bd = d2; best = hk; } }
        if (best) { p.skDur = 0.5 * cdMul; p.skCd = p.skDur; p.hook = { tx: best.x, ty: best.y, t: 0, stuck: 0 }; p.vy = 0; }
      }
      p.autoCd = Math.max(0, p.autoCd - dt);
      if (p.autoCd <= 0) {
        var tg = null, td = 260 * 260;
        for (i = 0; i < r.mons.length; i++) { var q = r.mons[i]; if (!q.alive) continue; var qd = dist2(p.x, p.y, q.x, q.y); if (qd <= td) { td = qd; tg = q; } }
        if (tg) {
          var ax = tg.x - p.x, ay = tg.y - p.y, al = Math.sqrt(ax * ax + ay * ay) || 1;
          r.arrows.push({ x: p.x, y: p.y, vx: ax / al * 700, vy: ay / al * 700, ang: Math.atan2(ay, ax), dist: 0, max: 400, atk: newAtk(r) });
          p.autoCd = 0.6;
        }
      }
    } else {
      if (K.z && p.atkCd <= 0) {
        p.atkCd = 0.6; p.act = 'throw'; p.actT = 0;
        r.bombs.push({ x: p.x + p.facing * 16, y: p.y - 8, w: 16, h: 16, vx: p.facing * 300, vy: -500, t: 0, hitX: 0, hitY: 0 });
      }
      if (K.x && p.skCd <= 0) {
        p.skDur = 1.5 * cdMul; p.skCd = p.skDur; p.act = 'wave'; p.actT = 0;
        shockwave(r);
      }
    }
  }
  K.z = K.x = K.jump = false;
  var pose;
  if (p.kb > 0) pose = 'hurt';
  else if (p.act && p.actT < ({ slash: 0.15, shoot: 0.2, throw: 0.2, wave: 0.3 }[p.act] || 0)) pose = p.act;
  else if (!p.ground) pose = p.vy < 0 ? 'rise' : 'fall';
  else pose = dir ? 'run' : 'idle';
  setPose(p, pose, dt);
}
function setPose(p, pose, dt) {
  if (p.pose !== pose) { p.pose = pose; p.poseT = 0; } else p.poseT += dt;
  if (pose === 'slash' || pose === 'shoot' || pose === 'throw' || pose === 'wave') p.poseT = p.actT;
}
function explodeAt(r, x, y) {
  var atk = newAtk(r), ms = monsSorted(r, x, y);
  for (var i = 0; i < ms.length; i++) if (circleRect(x, y, 60, ms[i])) hitMon(r, ms[i], 2, atk);
  wallsInCircle(r, x, y, 60);
  r.ex.push({ x: x, y: y, t: 0, dur: 0.25 });
}
function shockwave(r) {
  var p = r.p, atk = newAtk(r), ms = monsSorted(r, p.x, p.y);
  for (var i = 0; i < ms.length; i++) {
    var m = ms[i];
    if (!circleRect(p.x, p.y, 130, m)) continue;
    var killed = hitMon(r, m, 1, atk);
    if (!killed && m.alive && m.k !== 'mother') fling(r, m, sgn(m.x - p.x) || p.facing, atk);
  }
  wallsInCircle(r, p.x, p.y, 130);
  r.sw.push({ x: p.x, y: p.y, t: 0, dur: 0.3 });
}

/* --- 怪物 --- */
function applyGravity(r, m, dt) {
  m.vy = Math.min(m.vy + 2400 * dt, 1200);
  moveY(r.t, m, m.vy * dt);
  if (m.hitY > 0) { m.vy = 0; m.ground = true; } else { if (m.hitY < 0) m.vy = 0; m.ground = false; }
}
function walkPatrol(r, m, dist) {
  if (!m.ground) return;
  if (!groundAhead(r, m, m.facing) || atLimit(m, m.facing)) { m.facing = -m.facing; return; }
  moveX(r.t, m, m.facing * dist);
  if (m.hitX) m.facing = -m.facing;
}
function jumpOK(r, m, d) {
  var lx = m.x + d * 120, foot = m.y + m.h / 2;
  if (m.lim !== undefined && lx - m.w / 2 < m.lim) return false;
  return solidAt(r.t, lx, foot + 4) && !solidAt(r.t, lx, m.y) && !solidAt(r.t, m.x + d * (m.w / 2 + 8), m.y);
}
function updateFlung(r, m, dt) {
  m.flungT -= dt; m.vy = 0;
  moveX(r.t, m, m.flung * 460 * dt);
  var ended = false, i, frame = false;
  if (m.lim !== undefined && m.flung < 0 && m.x - m.w / 2 < m.lim) { m.x = m.lim + m.w / 2; frame = true; } // 門框當成牆
  if (m.hitX || frame) { hitMon(r, m, 1, m.atk); ended = true; }
  if (m.alive) {
    for (i = 0; i < r.mons.length; i++) {
      var o = r.mons[i];
      if (o === m || !o.alive || m.hitSet[o.id] || !rectsHit(m.x, m.y, m.w, m.h, o.x, o.y, o.w, o.h)) continue;
      m.hitSet[o.id] = 1;
      if (o.flung) continue;
      hitMon(r, o, 2, m.atk);
      if (o.alive && o.k !== 'mother') fling(r, o, m.flung, m.atk);
    }
    if (m.flungT <= 0) ended = true;
    if (ended) {
      m.flung = 0;
      if (m.k === 'bee') { m.oy = m.y; m.state = 'fly'; }
      else if (m.k === 'frog') { m.state = 'jump'; m.vx = 0; }
      else m.state = 'walk';
    }
  }
}
function updateMon(r, m, dt) {
  m.hitT = Math.max(0, m.hitT - dt); m.blockT = Math.max(0, m.blockT - dt); m.tt += dt;
  if (m.flung) { updateFlung(r, m, dt); return; }
  var p = r.p, dx = p.x - m.x, d = m.facing;
  switch (m.k) {
    case 'boar':
      applyGravity(r, m, dt);
      if (m.state === 'walk') {
        if (m.ground && Math.abs(p.y - m.y) <= 40 && dx * d > 0 && dx * d <= 240) { m.state = 'windup'; m.st = 0.5; }
        else walkPatrol(r, m, 80 * dt);
      } else if (m.state === 'windup') { m.st -= dt; if (m.st <= 0) m.state = 'charge'; }
      else if (m.state === 'charge') {
        if (!groundAhead(r, m, d) || atLimit(m, d)) { m.state = 'stun'; m.st = 1; }
        else { moveX(r.t, m, d * 420 * dt); if (m.hitX) { m.state = 'stun'; m.st = 1; } }
      } else if (m.state === 'stun') { m.st -= dt; if (m.st <= 0) m.state = 'walk'; }
      break;
    case 'shield':
      applyGravity(r, m, dt);
      if (m.ground) {
        if (Math.abs(dx) < 400 && Math.abs(p.y - m.y) < 120) {
          if (Math.abs(dx) > 6) { m.facing = sgn(dx); if (groundAhead(r, m, m.facing) && !atLimit(m, m.facing)) moveX(r.t, m, m.facing * 40 * dt); }
        } else walkPatrol(r, m, 40 * dt);
      }
      m.state = m.blockT > 0 ? 'block' : 'walk';
      break;
    case 'frog':
      if (m.state === 'crouch') {
        applyGravity(r, m, dt);
        if (m.ground) {
          m.st -= dt;
          if (m.st <= 0) {
            var near = Math.sqrt(dist2(p.x, p.y, m.x, m.y)) <= 300;
            var jd = near ? (sgn(dx) || d) : d;
            if (!jumpOK(r, m, jd)) { jd = -jd; if (!jumpOK(r, m, jd)) { m.st = 0.3; m.facing = jd; break; } }
            m.facing = jd; m.vx = jd * 232.2; m.vy = -620; m.state = 'jump'; m.ground = false;
          }
        }
      } else {
        moveX(r.t, m, m.vx * dt); if (m.hitX) m.vx = 0;
        applyGravity(r, m, dt);
        if (m.hitY > 0) { m.state = 'crouch'; m.st = 1.2; m.vx = 0; }
      }
      break;
    case 'bee':
      if (m.state === 'aim') {
        m.st -= dt;
        if (m.st <= 0) {
          var ax = p.x - m.x, ay = p.y - m.y, al = Math.sqrt(ax * ax + ay * ay) || 1;
          r.shots.push({ x: m.x, y: m.y, vx: ax / al * 220, vy: ay / al * 220 });
          m.state = 'fly'; m.shotCd = 2;
        }
      } else {
        m.shotCd -= dt;
        moveX(r.t, m, m.bdir * 60 * dt);
        if (m.hitX || Math.abs(m.x - m.ox) >= 120) { if (Math.abs(m.x - m.ox) >= 120) m.x = m.ox + 120 * sgn(m.x - m.ox); m.bdir = -m.bdir; m.facing = m.bdir; }
        if (m.shotCd <= 0 && Math.sqrt(dist2(p.x, p.y, m.x, m.y)) <= 400) { m.state = 'aim'; m.st = 0.4; m.facing = sgn(dx) || m.facing; }
      }
      m.y = m.oy + 16 * Math.sin(Math.PI * m.tt);
      break;
    case 'mother':
      applyGravity(r, m, dt);
      var edge = function (dir) { return !groundAhead(r, m, dir) || atLimit(m, dir); };
      if (m.state === 'walk') {
        if (m.ground && Math.abs(p.y - m.y) <= 80 && dx * d > 0 && dx * d <= 320) { m.state = 'windup'; m.st = 0.8; }
        else if (m.ground) {
          if (edge(d)) m.facing = -d; else { moveX(r.t, m, d * 50 * dt); if (m.hitX) m.facing = -d; }
        }
      } else if (m.state === 'windup') { m.st -= dt; if (m.st <= 0) m.state = 'charge'; }
      else if (m.state === 'charge') {
        if (edge(d)) { m.state = 'stun'; m.st = 1.5; }
        else { moveX(r.t, m, d * 380 * dt); if (m.hitX) { m.state = 'stun'; m.st = 1.5; } }
      } else if (m.state === 'stun') { m.st -= dt; if (m.st <= 0) m.state = 'walk'; }
      break;
  }
  if (m.lim !== undefined && m.x - m.w / 2 < m.lim) m.x = m.lim + m.w / 2; // 衝撞過頭時夾回門框內
}

/* --- 一步 --- */
function stepRun(r, dt) {
  var p = r.p, i;
  if (r.over) return;
  // 巢口(巢穴通道已修時每趟運作)
  if (r.nestOn && r.nestN < 5) {
    r.nestT -= dt;
    if (r.nestT <= 0) {
      var types = NEST_TYPES[r.n], k = types[r.nestN % types.length];
      var s = SIZE[k], sy = k === 'bee' ? 640 - 90 : 640 - s[1] / 2;
      r.mons.push(newMon(r, k, r.L.nestPos.x - 56, sy, true, false));
      r.nestN++; r.nestT = 2.5; r.nestSp = 0;
    }
  }
  r.nestSp = Math.min(0.4, r.nestSp + dt);
  updatePlayer(r, dt);
  for (i = 0; i < r.mons.length; i++) if (r.mons[i].alive) updateMon(r, r.mons[i], dt);
  // 箭
  for (i = r.arrows.length - 1; i >= 0; i--) {
    var a = r.arrows[i], gone = false;
    var mx = a.vx * dt, my = a.vy * dt;
    a.x += mx; a.y += my; a.dist += Math.sqrt(mx * mx + my * my);
    var c = Math.floor(a.x / T), rr = Math.floor(a.y / T);
    if (tileSolid(r.t, c, rr)) {
      gone = true;
      var gi = (rr >= 0 && rr < ROWS && c >= 0 && c < COLS) ? r.cgMap[rr * COLS + c] : undefined;
      if (gi !== undefined && r.cg[gi].hp > 0) wallHit(r, gi, false);
    }
    if (!gone) {
      for (var j = 0; j < r.mons.length; j++) {
        var m = r.mons[j];
        if (!m.alive || !rectsHit(a.x, a.y, 24, 6, m.x, m.y, m.w, m.h)) continue;
        if (blocks(m, sgn(p.x - m.x) || -sgn(a.vx), a.y)) { m.blockT = 0.2; m.hitT = 0.1; }
        else hitMon(r, m, 1, a.atk);
        gone = true; break;
      }
    }
    if (a.dist >= a.max) gone = true;
    if (gone) r.arrows.splice(i, 1);
  }
  // 蜂彈
  for (i = r.shots.length - 1; i >= 0; i--) {
    var sh = r.shots[i];
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
    var dead = tileSolid(r.t, Math.floor(sh.x / T), Math.floor(sh.y / T)) || sh.x < -20 || sh.x > W + 20 || sh.y < -20 || sh.y > H + 20;
    if (!dead && rectsHit(sh.x, sh.y, 12, 12, p.x, p.y, p.w, p.h)) { playerDamage(r, sh.x); dead = true; }
    if (dead) r.shots.splice(i, 1);
  }
  // 炸彈
  for (i = r.bombs.length - 1; i >= 0; i--) {
    var b = r.bombs[i]; b.t += dt;
    b.vy = Math.min(b.vy + 2400 * dt, 1200);
    moveX(r.t, b, b.vx * dt); moveY(r.t, b, b.vy * dt);
    var boom = b.hitX !== 0 || b.hitY !== 0;
    if (!boom) for (var q = 0; q < r.mons.length; q++) { var mq = r.mons[q]; if (mq.alive && rectsHit(b.x, b.y, 16, 16, mq.x, mq.y, mq.w, mq.h)) { boom = true; break; } }
    if (b.y > ROWS * T + 40) { r.bombs.splice(i, 1); continue; }
    if (boom) { r.bombs.splice(i, 1); explodeAt(r, b.x, b.y); }
  }
  // 玩家碰怪(被擊飛中的除外)
  for (i = 0; i < r.mons.length; i++) {
    var mo = r.mons[i];
    if (mo.alive && !mo.flung && rectsHit(p.x, p.y, p.w, p.h, mo.x, mo.y, mo.w, mo.h)) playerDamage(r, mo.x);
  }
  // 撿素材
  for (i = 0; i < r.L.pickups.length; i++) {
    var pk = r.L.pickups[i];
    if (r.tk.indexOf(i) >= 0) continue;
    if (rectsHit(p.x, p.y, p.w, p.h, pk.x, pk.y, 24, 24)) {
      r.tk = r.tk.concat([i]);
      pushEvent(r, { src: 'pick', x: pk.x, y: pk.y, kind: pk.kind, idx: i }, 0);
    }
  }
  // 寶箱(獵場 / 巢穴裡, 碰到即打開)
  if (!r.chestOpen && rectsHit(p.x, p.y, p.w, p.h, r.L.chest.x, r.L.chest.y, 40, 36)) {
    r.chestOpen = true; r.chestOpenF = r.frames.length; r.chestGot = CHEST_ITEM[r.n]; addNotice(r, 'item', r.chestGot);
  }
  // 尖刺: 扣 1 血(不即死), 無敵 1 秒並向上彈起
  var c0 = Math.floor((p.x - p.w / 2) / T), c1 = Math.floor((p.x + p.w / 2 - 0.001) / T), r0 = Math.floor((p.y - p.h / 2) / T), r1 = Math.floor((p.y + p.h / 2 - 0.001) / T);
  for (var sr = r0; sr <= r1; sr++) for (var sc = c0; sc <= c1; sc++) {
    if (sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS && r.t[sr][sc] === 5 && rectsHit(p.x, p.y, p.w, p.h, sc * T + 20, sr * T + 30, T, 20)) {
      if (p.inv <= 0 && !p.dash && !r.over) {
        p.hp--; p.inv = 1; p.vy = -520; p.ground = false; p.kb = 0; p.hook = null;
        if (p.hp <= 0) r.over = 'fail';
      }
    }
  }
  if (p.y - p.h / 2 > ROWS * T) r.over = 'fail';
  // 終點
  var gl = r.L.goal;
  if (!r.over && rectsHit(p.x, p.y, p.w, p.h, gl.x, gl.y, 40, 80)) { r.reached = true; pushEvent(r, { src: 'goal', x: gl.x, y: gl.y }, 0); r.over = 'clear'; }
  // 特效計時
  var lists = [r.ex, r.sw, r.pf, r.popups, r.chainTx], li, ii;
  for (li = 0; li < lists.length; li++) {
    var arr = lists[li];
    for (ii = arr.length - 1; ii >= 0; ii--) { arr[ii].t += dt; if (arr[ii].t >= arr[ii].dur) arr.splice(ii, 1); }
  }
  if (!r.notice && r.notices.length) r.notice = r.notices.shift();
  if (r.notice) { r.notice.t += dt; if (r.notice.t >= r.notice.dur) r.notice = null; }
  r.frames.push(makeSnap(r));
}
function makeSnap(r) {
  var p = r.p, hk = null;
  if (p.hook) hk = [p.hook.tx, p.hook.ty];
  var sn = {
    t: r.frames.length / 60, reached: r.reached,
    p: { x: p.x, y: p.y, cls: r.cls, facing: p.facing, pose: p.pose, poseT: p.poseT, inv: p.inv > 0, hk: hk },
    m: [], tk: r.tk, ck: r.ck,
    ns: { s: !r.nestOn ? 'dormant' : r.nestN >= 5 ? 'spent' : 'idle', t: r.nestSp, left: r.nestOn ? 5 - r.nestN : 5 },
    pr: [], ex: [], sw: [], pf: []
  };
  var i;
  for (i = 0; i < r.mons.length; i++) {
    var m = r.mons[i]; if (!m.alive) continue;
    sn.m.push({ k: m.k, x: m.x, y: m.y, f: m.facing, s: m.flung ? 'flung' : m.state, h: m.hitT > 0 || m.blockT > 0.1, b: m.brood, hp: m.hp, t: m.tt });
  }
  for (i = 0; i < r.arrows.length; i++) sn.pr.push({ k: 'arrow', x: r.arrows[i].x, y: r.arrows[i].y, a: r.arrows[i].ang });
  for (i = 0; i < r.shots.length; i++) sn.pr.push({ k: 'shot', x: r.shots[i].x, y: r.shots[i].y });
  for (i = 0; i < r.bombs.length; i++) sn.pr.push({ k: 'bomb', x: r.bombs[i].x, y: r.bombs[i].y, a: r.bombs[i].t });
  for (i = 0; i < r.ex.length; i++) sn.ex.push({ x: r.ex[i].x, y: r.ex[i].y, t: r.ex[i].t });
  for (i = 0; i < r.sw.length; i++) sn.sw.push({ x: r.sw[i].x, y: r.sw[i].y, t: r.sw[i].t });
  for (i = 0; i < r.pf.length; i++) sn.pf.push({ x: r.pf[i].x, y: r.pf[i].y, t: r.pf[i].t, big: r.pf[i].big });
  return sn;
}
// 面板預覽(靜態): 怪物在出生點; 獵場 / 巢穴已修才有獵場怪 / 巢母
function previewSnap(n) {
  var L = LV[n], rep = ST.lv[n].rep;
  var sn = { t: 0, reached: false, p: null, m: [], tk: [], ck: L.cracks.map(function () { return 3; }), ns: { s: rep.hunt && L.nest ? 'idle' : 'dormant', t: 0.4, left: 5 }, pr: [], ex: [], sw: [], pf: [] };
  function add(d) { sn.m.push({ k: d.k, x: d.x, y: d.y, f: -1, s: d.k === 'bee' ? 'fly' : d.k === 'frog' ? 'crouch' : 'walk', h: false, b: false, hp: MHP[d.k], t: 0 }); }
  L.mons.forEach(add);
  if (rep.hunt && !L.nest) L.huntMons.forEach(add);
  if (rep.hunt && L.nest) add({ k: 'mother', x: L.mother.x, y: L.mother.y });
  return sn;
}

/* ============ 回放與素材飛行 ============ */
function makeRec(r) {
  var N = r.frames.length;
  return { frames: r.frames, events: r.events, N: N, dur: N / 60, cls: r.clsIdx, repSeq: ST.lv[r.n].repSeq, chestOpenF: r.chestOpenF };
}
function resetReplay(n) { RP[n] = ST.rec[n] ? { f: 0, evi: 0 } : null; }
function stepReplays() {
  for (var n = 0; n < 8; n++) {
    var rec = ST.rec[n]; if (!rec) continue;
    var rp = RP[n]; if (!rp) rp = RP[n] = { f: 0, evi: 0 };
    rp.f += ACCEL_MUL[ST.lv[n].accel];
    var cf = Math.floor(rp.f);
    while (rp.evi < rec.events.length && rec.events[rp.evi].f <= Math.min(cf, rec.N - 1)) { applyReplayEvent(n, rec.events[rp.evi]); rp.evi++; }
    if (cf >= rec.N) { while (rp.evi < rec.events.length) { applyReplayEvent(n, rec.events[rp.evi]); rp.evi++; } rp.f -= rec.N; rp.evi = 0; }
  }
}
function applyReplayEvent(n, ev) {
  var gs = gainsOf(ev, n);
  for (var i = 0; i < gs.length; i++) {
    var g = gs[i];
    if (S.mode === 'map') spawnFly(n, g);
    else addStock(g.kind, g.n);
  }
  if (ev.src === 'kill') bountyKill(ev.mon, ev.brood);
}
function spawnFly(n, g) {
  var ox = CARD_POS[n][0] + 8, oy = CARD_POS[n][1] + 8;
  var cnt = Math.min(g.n, 5), i;
  for (i = 0; i < cnt; i++) {
    var amt = g.n <= 5 ? 1 : (i === cnt - 1 ? g.n - (cnt - 1) : 1);
    FLY.push({
      kind: g.kind, amt: amt, t: 0, dur: 0.7,
      x0: ox + g.x * 0.125 + (Math.random() * 12 - 6), y0: oy + g.y * 0.125 + (Math.random() * 12 - 6),
      x1: HUD_ICON_X[g.kind], y1: 20
    });
  }
}
function updateFlyers(dt) {
  for (var i = FLY.length - 1; i >= 0; i--) {
    var f = FLY[i]; f.t += dt;
    if (f.t >= f.dur) { addStock(f.kind, f.amt); FLY.splice(i, 1); }
  }
}

/* ============ 遊戲流程 ============ */
function startRun(n, clsIdx) {
  ST.lv[n].lastCls = clsIdx;
  R = newRun(n, clsIdx); PENDING = null;
  S.mode = 'play'; S.pause = false; S.lp = null;
  K.z = K.x = K.jump = false;
}
var uid = 0;
function finishRun(r) {
  var n = r.n, i;
  if (r.over === 'fail') { S.mode = 'fail'; return; }
  var rec = makeRec(r);
  for (i = 0; i < 4; i++) if (r.gain[MATS[i]] > 0) addStock(MATS[i], r.gain[MATS[i]]);
  r.gains = [];
  if (r.chestGot) { if (ST.bag.length < 8) ST.bag.push({ type: r.chestGot, id: ++uid }); ST.lv[n].chestTaken = true; r.gains.push({ what: 'item', type: r.chestGot }); }
  if (r.medalGot) { ST.medals = Math.min(3, ST.medals + 1); ST.lv[n].medalTaken = true; r.gains.push({ what: 'medal', type: null }); }
  for (i = 0; i < r.events.length; i++) if (r.events[i].src === 'kill') bountyKill(r.events[i].mon, r.events[i].brood);
  if (!ST.rec[n]) { ST.rec[n] = rec; resetReplay(n); PENDING = null; }
  else PENDING = rec;
  S.mode = 'result';
}
function openLevelPanel(n) {
  S.lp = { n: n, row: 0, cls: ST.lv[n].lastCls || 0, site: 0, slot: 0 };
  if (!clsOwned(S.lp.cls)) S.lp.cls = 0;
  S.mode = 'lpanel';
}
function cycleSlot(n, slotIdx) {
  if (ST.bag.length === 0) return;
  var lv = ST.lv[n], order = [null].concat(ST.bag);
  var cur = lv.slots[slotIdx], idx = order.indexOf(cur);
  var next = order[(idx + 1) % order.length];
  if (next !== null) {
    for (var a = 0; a < 8; a++) for (var b = 0; b < 2; b++) if (ST.lv[a].slots[b] === next) ST.lv[a].slots[b] = null;
  }
  lv.slots[slotIdx] = next;
}
function panelAction() {
  var lp = S.lp, n = lp.n, lv = ST.lv[n];
  if (lp.row === 0) { if (clsOwned(lp.cls)) startRun(n, lp.cls); }
  else if (lp.row === 1) {
    var cost = groupOf('stone', REPAIR_COST[n][lp.site]), key = lp.site === 0 ? 'sc' : 'hunt';
    if (!lv.rep[key] && canPay(cost)) { pay(cost); lv.rep[key] = true; lv.repSeq++; }
  } else if (lp.row === 2) cycleSlot(n, lp.slot);
  else if (lv.accel < 2) { var ac = groupOf('time', ACCEL_COST[lv.accel]); if (canPay(ac)) { pay(ac); lv.accel++; } }
}
function upgradeAction() {
  var u = S.up;
  if (u.row === 0) {
    var key = u.sel === 0 ? 'hunter' : 'bomber';
    var c = groupOf('wood', RECRUIT_COST);
    if (!ST.recruited[key] && canPay(c)) { pay(c); ST.recruited[key] = true; }
  } else {
    var info = [['speed', SPEED_COST], ['hp', HP_COST], ['cd', CD_COST]][u.row - 1];
    var lv = ST.up[info[0]];
    if (lv < info[1].length) { var cc = groupOf('soul', info[1][lv]); if (canPay(cc)) { pay(cc); ST.up[info[0]]++; } }
  }
}
var MAPITEMS = [];
(function () {
  var cols = [0, 1, 1, 2, 2, 2, 2, 3];
  for (var i = 0; i < 8; i++) MAPITEMS.push({ type: 'level', n: i, col: cols[i], cy: CARD_POS[i][1] + 68 });
  MAPITEMS.push({ type: 'workshop', col: 0, cy: WORKSHOP_POS[1] + 68 });
  MAPITEMS.push({ type: 'goal', col: 4, cy: GOAL_POS[1] + 68 });
})();
function moveCursor(dx, dy) {
  var cur = MAPITEMS[S.cur], i, best = -1, bd = 1e9;
  if (dy) {
    var same = MAPITEMS.map(function (it, idx) { return idx; }).filter(function (idx) { return MAPITEMS[idx].col === cur.col; })
      .sort(function (a, b) { return MAPITEMS[a].cy - MAPITEMS[b].cy; });
    var pos = same.indexOf(S.cur), np = clamp(pos + dy, 0, same.length - 1);
    S.cur = same[np];
  } else if (dx) {
    var tc = cur.col + dx;
    for (i = 0; i < MAPITEMS.length; i++) if (MAPITEMS[i].col === tc) { var d = Math.abs(MAPITEMS[i].cy - cur.cy); if (d < bd) { bd = d; best = i; } }
    if (best >= 0) S.cur = best;
  }
}
function mapActivate() {
  var it = MAPITEMS[S.cur];
  if (it.type === 'level') {
    var st = levelState(it.n);
    if (st === 'buyable') { var c = groupOf('wood', UNLOCK_COST[it.n]); if (canPay(c)) { pay(c); ST.unlocked[it.n] = true; } }
    else if (st === 'open' || st === 'cleared') openLevelPanel(it.n);
  } else if (it.type === 'workshop') { S.up = { row: 0, sel: 0 }; S.mode = 'upgrade'; }
  else if (canPay(GOAL_COST)) { pay(GOAL_COST); S.mode = 'ending'; }
}

/* ============ 輸入(只有鍵盤) ============ */
var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyZ: 'z', KeyX: 'x', Escape: 'esc' };
var KEYNAME = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', z: 'z', Z: 'z', x: 'x', X: 'x', Escape: 'esc' };
HELD = { left: false, right: false, up: false };
function inputDown(k) {
  if (k === 'left' || k === 'right' || k === 'up') HELD[k] = true;
  var m = S.mode;
  if (k === 'esc') {
    if (m === 'play' || m === 'map' || m === 'lpanel' || m === 'upgrade') { S.pause = !S.pause; K.z = K.x = K.jump = false; }
    return;
  }
  if (S.pause) {
    if (m === 'play') {
      if (k === 'z') { startRun(R.n, R.clsIdx); }
      else if (k === 'x') { S.pause = false; R = null; S.mode = 'map'; }
    }
    return;
  }
  switch (m) {
    case 'guide':
      if (k === 'left') G.page = Math.max(0, G.page - 1);
      else if (k === 'right') G.page = Math.min(GUIDE_PAGES - 1, G.page + 1);
      else if (k === 'z') { if (G.page >= GUIDE_PAGES - 1) { S.mode = 'map'; G.page = 0; } else G.page++; }
      break;
    case 'map':
      if (k === 'left') moveCursor(-1, 0); else if (k === 'right') moveCursor(1, 0);
      else if (k === 'up') moveCursor(0, -1); else if (k === 'down') moveCursor(0, 1);
      else if (k === 'z') mapActivate();
      else if (k === 'x') { G.page = 0; S.mode = 'guide'; }
      break;
    case 'play':
      if (k === 'z') K.z = true; else if (k === 'x') K.x = true; else if (k === 'up') K.jump = true;
      break;
    case 'lpanel':
      var lp = S.lp;
      if (k === 'up') lp.row = Math.max(0, lp.row - 1);
      else if (k === 'down') lp.row = Math.min(3, lp.row + 1);
      else if (k === 'left' || k === 'right') {
        var d = k === 'left' ? -1 : 1;
        if (lp.row === 0) lp.cls = clamp(lp.cls + d, 0, 2);
        else if (lp.row === 1) lp.site = clamp(lp.site + d, 0, 1);
        else if (lp.row === 2) lp.slot = clamp(lp.slot + d, 0, 1);
      } else if (k === 'z') panelAction();
      else if (k === 'x') { S.mode = 'map'; S.lp = null; }
      break;
    case 'upgrade':
      var u = S.up;
      if (k === 'up') u.row = Math.max(0, u.row - 1);
      else if (k === 'down') u.row = Math.min(3, u.row + 1);
      else if (k === 'left' && u.row === 0) u.sel = 0;
      else if (k === 'right' && u.row === 0) u.sel = 1;
      else if (k === 'z') upgradeAction();
      else if (k === 'x') { S.mode = 'map'; S.up = null; }
      break;
    case 'result':
      if (PENDING) {
        if (k === 'z') { ST.rec[R.n] = PENDING; resetReplay(R.n); PENDING = null; R = null; S.mode = 'map'; }
        else if (k === 'x') { PENDING = null; R = null; S.mode = 'map'; }
      } else if (k === 'z') { R = null; S.mode = 'map'; }
      break;
    case 'fail':
      if (k === 'z') startRun(R.n, R.clsIdx);
      else if (k === 'x') { R = null; S.mode = 'map'; }
      break;
    case 'ending':
      if (k === 'z') resetAll();
      break;
  }
}
window.addEventListener('keydown', function (e) {
  var k = KEYMAP[e.code] || KEYNAME[e.key];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  inputDown(k);
});
window.addEventListener('keyup', function (e) {
  var k = KEYMAP[e.code] || KEYNAME[e.key];
  if (!k) return;
  e.preventDefault();
  if (k === 'left' || k === 'right' || k === 'up') HELD[k] = false;
});
window.addEventListener('blur', function () { HELD.left = HELD.right = HELD.up = false; });

/* ============ 畫面 ============ */
var canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
var scaleX = 1, scaleY = 1, GT = 0;
function resize() {
  var cw = window.innerWidth || W, ch = window.innerHeight || H;
  var s = Math.min(cw / W, ch / H);
  var cssW = Math.max(1, Math.floor(W * s)), cssH = Math.max(1, Math.floor(H * s));
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(cssW * dpr)); canvas.height = Math.max(1, Math.round(cssH * dpr));
  scaleX = canvas.width / W; scaleY = canvas.height / H;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

var MONNAME = { boar: 'drawBoar', shield: 'drawShieldman', bee: 'drawShooterBee' };
// o: { rep, thumb, fogA, chestOpen }
function drawScene(c, L, snap, o) {
  var rep = o.rep, t = terrFor(L, rep), r, cc, i;
  var lairTheme = L.nest;
  Art.drawBackground(c, {});
  for (i = 0; i < L.lairRects.length; i++) {
    var lr = L.lairRects[i];
    Art.drawLairBack(c, { x: lr[0] * T, y: lr[1] * T, w: lr[2] * T, h: lr[3] * T });
  }
  for (r = 0; r < ROWS; r++) for (cc = 0; cc < COLS; cc++) {
    var v = t[r][cc], x = cc * T + 20, y = r * T + 20;
    if (v === 1) Art.drawGround(c, { x: x, y: y, top: !(r > 0 && solidCode(t[r - 1][cc])), theme: (lairTheme && cc >= 12 && cc <= 27 && r >= 12) ? 'lair' : L.theme });
    else if (v === 7) Art.drawPenWall(c, { x: x, y: y, theme: L.theme });
    else if (v === 3) Art.drawCaveRubble(c, { x: x, y: y });
    else if (v === 5) Art.drawSpike(c, { x: x, y: y });
  }
  for (i = 0; i < L.W.length; i++) {
    var w = L.W[i];
    Art.drawWorksite(c, { x: w.c * T + 20, y: w.r * T + 20, kind: w.kind, repaired: !!rep.sc, theme: L.theme, end: w.end, bottom: w.bottom });
  }
  for (i = 0; i < L.cracks.length; i++) {
    var hp = snap.ck[i];
    if (hp > 0) for (var q = 0; q < L.cracks[i].tiles.length; q++) Art.drawCrackWall(c, { x: L.cracks[i].tiles[q][0] * T + 20, y: L.cracks[i].tiles[q][1] * T + 20, hp: hp });
  }
  if (!L.nest) Art.drawPenGate(c, { x: L.gate.x, y: L.gate.y, open: !!rep.hunt });
  for (i = 0; i < L.hooks.length; i++) Art.drawHookRing(c, { x: L.hooks[i].x, y: L.hooks[i].y });
  if (L.nest) Art.drawNest(c, { x: L.nestPos.x, y: L.nestPos.y, state: snap.ns.s, spawnT: snap.ns.t, spawnDur: 0.4, left: snap.ns.left });
  for (i = 0; i < L.pickups.length; i++) if (snap.tk.indexOf(i) < 0) Art.drawPickup(c, { x: L.pickups[i].x, y: L.pickups[i].y, kind: L.pickups[i].kind, t: snap.t });
  Art.drawChest(c, { x: L.chest.x, y: L.chest.y, open: !!o.chestOpen });
  Art.drawGoal(c, { x: L.goal.x, y: L.goal.y, reached: snap.reached });
  var p = snap.p;
  if (p && p.cls === 'hunter' && !o.thumb) Art.drawRangeRing(c, { x: p.x, y: p.y, radius: 260 });
  for (i = 0; i < snap.m.length; i++) {
    var m = snap.m[i];
    if (m.k === 'mother') Art.drawBroodmother(c, { x: m.x, y: m.y, facing: m.f, state: m.s, hit: m.h, hp: m.hp, maxHp: 12, t: m.t });
    else if (m.k === 'frog') Art.drawFrog(c, { x: m.x, y: m.y, facing: m.f, state: m.s, hit: m.h, brood: m.b });
    else Art[MONNAME[m.k]](c, { x: m.x, y: m.y, facing: m.f, state: m.s, hit: m.h, brood: m.b, t: m.t });
  }
  if (p) {
    Art.drawPlayer(c, { x: p.x, y: p.y, cls: p.cls, facing: p.facing, pose: p.pose, poseT: p.poseT, invuln: p.inv });
    if (p.hk) Placeholder.hookLine(c, p.x + p.facing * 8, p.y - 6, p.hk[0], p.hk[1]);
  }
  for (i = 0; i < snap.pr.length; i++) {
    var pr = snap.pr[i];
    if (pr.k === 'arrow') Art.drawArrow(c, { x: pr.x, y: pr.y, angle: pr.a });
    else if (pr.k === 'shot') Art.drawBeeShot(c, { x: pr.x, y: pr.y });
    else Art.drawBomb(c, { x: pr.x, y: pr.y, t: pr.a });
  }
  for (i = 0; i < snap.ex.length; i++) Art.drawExplosion(c, { x: snap.ex[i].x, y: snap.ex[i].y, t: snap.ex[i].t, dur: 0.25, radius: 60 });
  for (i = 0; i < snap.sw.length; i++) Art.drawShockwave(c, { x: snap.sw[i].x, y: snap.sw[i].y, t: snap.sw[i].t, dur: 0.3, radius: 130 });
  for (i = 0; i < snap.pf.length; i++) Art.drawPoof(c, { x: snap.pf[i].x, y: snap.pf[i].y, t: snap.pf[i].t, dur: 0.3, big: snap.pf[i].big });
  // 迷霧: 獵場 / 巢穴修好前蓋住; 修好後 0.8 秒淡出
  var fa = rep.hunt ? o.fogA : 1;
  if (fa > 0) Art.drawFog(c, { x: FOG_RECT.x, y: FOG_RECT.y, w: FOG_RECT.w, h: FOG_RECT.h, alpha: fa, t: GT });
  if (!o.thumb) {
    for (i = 0; i < L.signs.length; i++) {
      var sg = L.signs[i];
      if (sg.role === 'shortcut' ? rep.sc : rep.hunt) continue;
      Art.drawSiteSign(c, { x: sg.x, y: sg.y, role: sg.role });
    }
  }
}
function chestFor(n, rec, fi) {
  if (!rec || rec.chestOpenF < 0) return ST.lv[n].chestTaken;
  return fi >= rec.chestOpenF;
}
function drawThumb(c, n, snap, chestOpen) {
  c.save();
  c.translate(CARD_POS[n][0] + 8, CARD_POS[n][1] + 8);
  c.beginPath(); c.rect(0, 0, 160, 90); c.clip();
  c.scale(0.125, 0.125);
  drawScene(c, LV[n], snap, { rep: ST.lv[n].rep, thumb: true, fogA: ST.lv[n].fogA, chestOpen: chestOpen });
  c.restore();
}
function hudStock() { return { wood: ST.stock.wood, stone: ST.stock.stone, time: ST.stock.time, soul: ST.stock.soul }; }
function hudBump() { return { wood: BUMP.wood, stone: BUMP.stone, time: BUMP.time, soul: BUMP.soul }; }
function drawMapHud() {
  Art.drawHud(ctx, { mode: 'map', stock: hudStock(), ratePerMin: totalRates(), bumpT: hudBump(), bumpDur: 0.15, time: null, run: null, kills: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null });
}
function anyAffordable() {
  if (!ST.recruited.hunter && ST.stock.wood >= RECRUIT_COST) return true;
  if (!ST.recruited.bomber && ST.stock.wood >= RECRUIT_COST) return true;
  var defs = [[ST.up.speed, SPEED_COST], [ST.up.hp, HP_COST], [ST.up.cd, CD_COST]];
  for (var i = 0; i < 3; i++) if (defs[i][0] < defs[i][1].length && ST.stock.soul >= defs[i][1][defs[i][0]]) return true;
  return false;
}
function boardState() {
  return ST.bc.map(function (col) {
    if (col.idx < 0) return { status: 'finished', target: null, need: null, prog: null, reward: null, bonusText: null, newT: null, newDur: null, doneT: null, doneDur: null };
    var b = BOUNTIES[col.idx], rw = zeroGroup();
    for (var k in b.reward) rw[k] = b.reward[k];
    return { status: 'active', target: b.target, need: b.need, prog: col.prog, reward: rw, bonusText: b.text, newT: col.newT, newDur: 0.4, doneT: col.doneT, doneDur: 0.4 };
  });
}
function drawMap(showFly) {
  var i;
  Art.drawMapBackground(ctx, {});
  Art.drawBountyBoard(ctx, { x: BOARD_POS[0], y: BOARD_POS[1], bounties: boardState(), medals: ST.medals });
  for (i = 0; i < LINKS.length; i++) {
    var a = LINKS[i][0], b = LINKS[i][1];
    Art.drawMapLink(ctx, { x1: CARD_POS[a][0] + 176, y1: CARD_POS[a][1] + 68, x2: CARD_POS[b][0], y2: CARD_POS[b][1] + 68, lit: !!ST.rec[a] });
  }
  for (i = 0; i < 8; i++) {
    var st = levelState(i), lv = ST.lv[i], rec = ST.rec[i];
    var cost = (st === 'sealed' || st === 'buyable') ? groupOf('wood', UNLOCK_COST[i]) : zeroGroup();
    var rates = rec ? recRates(i) : zeroGroup();
    Art.drawLevelCard(ctx, {
      x: CARD_POS[i][0], y: CARD_POS[i][1], index: i + 1, name: NAMES[i], state: st, cost: cost, stock: hudStock(),
      canAfford: canPay(cost), rates: rates, recordCls: rec ? CLASSES[rec.cls] : null, recordTime: rec ? round1(rec.dur) : null, repairedCount: repairedCount(i)
    });
    if (rec) { var rp = RP[i] || { f: 0 }, fi = Math.min(rec.N - 1, Math.floor(rp.f)); drawThumb(ctx, i, rec.frames[fi], chestFor(i, rec, fi)); }
    else if (st === 'open') drawThumb(ctx, i, previewSnap(i), lv.chestTaken);
    Art.drawCardOverlay(ctx, { x: CARD_POS[i][0], y: CARD_POS[i][1], accelLv: lv.accel, newArea: !!rec && rec.repSeq < lv.repSeq, selected: S.mode === 'map' && S.cur === i });
  }
  Art.drawWorkshopCard(ctx, { x: WORKSHOP_POS[0], y: WORKSHOP_POS[1], anyAffordable: anyAffordable(), selected: S.mode === 'map' && MAPITEMS[S.cur].type === 'workshop' });
  Art.drawGoalCard(ctx, { x: GOAL_POS[0], y: GOAL_POS[1], cost: GOAL_COST, stock: hudStock(), canAfford: canPay(GOAL_COST), selected: S.mode === 'map' && MAPITEMS[S.cur].type === 'goal' });
  Placeholder.text(ctx, '↑↓←→ 選擇  Z 確定  X 說明  Esc 暫停', W / 2, 702, 16, '#ddd', 'center');
  drawMapHud();
  if (showFly) for (i = 0; i < FLY.length; i++) {
    var f = FLY[i], u = f.t / f.dur;
    Art.drawFlyingMaterial(ctx, { x: f.x0 + (f.x1 - f.x0) * u, y: f.y0 + (f.y1 - f.y0) * u - Math.sin(Math.PI * u) * 70, kind: f.kind, t: f.t, dur: f.dur });
  }
  if (S.mode === 'map' && BN) {
    var bd = BOUNTIES[BN.idx], rw = zeroGroup();
    for (var kk in bd.reward) rw[kk] = bd.reward[kk];
    Art.drawBountyNotice(ctx, { target: bd.target, need: bd.need, reward: rw, bonusText: bd.text, t: BN.t, dur: 2.5 });
  }
}
function drawPlay() {
  var r = R, snap = r.frames.length ? r.frames[r.frames.length - 1] : makeSnap(r), i;
  drawScene(ctx, r.L, snap, { rep: ST.lv[r.n].rep, fogA: ST.lv[r.n].fogA, chestOpen: r.chestOpen });
  for (i = 0; i < r.popups.length; i++) { var pp = r.popups[i]; Art.drawPopup(ctx, { x: pp.x, y: pp.y, t: pp.t, dur: pp.dur, kind: pp.kind, value: pp.value }); }
  for (i = 0; i < r.chainTx.length; i++) { var ch = r.chainTx[i]; Art.drawChainText(ctx, { x: ch.x, y: ch.y, n: ch.n, t: ch.t, dur: ch.dur }); }
  if (r.notice) Art.drawItemNotice(ctx, { what: r.notice.what, type: r.notice.type, t: r.notice.t, dur: r.notice.dur });
  var p = r.p;
  Art.drawHud(ctx, {
    mode: 'level', stock: hudStock(), ratePerMin: totalRates(), bumpT: hudBump(), bumpDur: 0.15, time: round1(r.frames.length / 60),
    run: { wood: r.gain.wood, stone: r.gain.stone, time: r.gain.time, soul: r.gain.soul }, kills: r.kills, hp: p.hp, maxHp: r.mhp,
    skillCdT: p.skDur - p.skCd, skillCdDur: p.skDur, cls: r.cls
  });
}
function uniqueTypes(list) { var o = []; list.forEach(function (k) { if (o.indexOf(k) < 0) o.push(k); }); return o; }
function highlightRect(n, site) {
  var L = LV[n], x, y, w, h;
  if (site === 0) { var s = L.scRect; x = 60 + s.c0 * 20; y = 96 + s.r0 * 20; w = (s.c1 - s.c0 + 1) * 20; h = (s.r1 - s.r0 + 1) * 20; }
  else { x = 60 + 12 * 20; y = 96 + 12 * 20; w = 14 * 20; h = 4 * 20; }
  x = clamp(x, 60, 700 - 20); y = clamp(y, 96, 456 - 20);
  return { x: x, y: y, w: clamp(w, 20, 700 - x), h: clamp(h, 20, 456 - y) };
}
function drawLevelPanel() {
  var lp = S.lp, n = lp.n, lv = ST.lv[n], rec = ST.rec[n], L = LV[n];
  var items = ST.bag.map(function (it) {
    var wh = null;
    for (var a = 0; a < 8; a++) for (var b = 0; b < 2; b++) if (ST.lv[a].slots[b] === it) wh = { level: a + 1, slot: b + 1 };
    return { type: it.type, where: wh };
  });
  var inside = L.nest ? uniqueTypes(NEST_TYPES[n]) : uniqueTypes(PEN_MONS[n]);
  Art.drawLevelPanel(ctx, {
    index: n + 1, name: NAMES[n], row: lp.row,
    classes: [{ cls: 'sword', owned: true }, { cls: 'hunter', owned: ST.recruited.hunter }, { cls: 'bomber', owned: ST.recruited.bomber }], clsSel: lp.cls,
    sites: [
      { role: 'shortcut', kind: SC_KIND[n], repaired: lv.rep.sc, cost: groupOf('stone', REPAIR_COST[n][0]), inside: [] },
      { role: L.nest ? 'nest' : 'hunt', kind: L.nest ? 'cave' : 'pen', repaired: lv.rep.hunt, cost: groupOf('stone', REPAIR_COST[n][1]), inside: inside }
    ], siteSel: lp.site,
    slots: [lv.slots[0] ? lv.slots[0].type : null, lv.slots[1] ? lv.slots[1].type : null], slotSel: lp.slot, items: items,
    accelLv: lv.accel, accelCost: lv.accel < 2 ? groupOf('time', ACCEL_COST[lv.accel]) : null, stock: hudStock(),
    recordCls: rec ? CLASSES[rec.cls] : null, recordTime: rec ? round1(rec.dur) : null, rates: rec ? recRates(n) : null,
    recordKills: rec ? killsOf(rec.events) : null,
    newArea: !!rec && rec.repSeq < lv.repSeq
  });
  ctx.save();
  ctx.translate(60, 96); ctx.beginPath(); ctx.rect(0, 0, 640, 360); ctx.clip(); ctx.scale(0.5, 0.5);
  drawScene(ctx, L, previewSnap(n), { rep: lv.rep, fogA: lv.fogA, chestOpen: lv.chestTaken });
  ctx.restore();
  if (lp.row === 1) { var sr = highlightRect(n, lp.site); Art.drawSiteHighlight(ctx, { x: sr.x, y: sr.y, w: sr.w, h: sr.h, active: true }); }
}
function drawUpgrade() {
  var u = S.up;
  Art.drawUpgradePage(ctx, {
    row: u.row,
    recruits: [{ cls: 'hunter', owned: ST.recruited.hunter, cost: groupOf('wood', RECRUIT_COST) }, { cls: 'bomber', owned: ST.recruited.bomber, cost: groupOf('wood', RECRUIT_COST) }],
    recruitSel: u.sel,
    stats: [
      { key: 'speed', lv: ST.up.speed, maxLv: 3, cost: ST.up.speed < 3 ? groupOf('soul', SPEED_COST[ST.up.speed]) : null },
      { key: 'hp', lv: ST.up.hp, maxLv: 2, cost: ST.up.hp < 2 ? groupOf('soul', HP_COST[ST.up.hp]) : null },
      { key: 'cd', lv: ST.up.cd, maxLv: 3, cost: ST.up.cd < 3 ? groupOf('soul', CD_COST[ST.up.cd]) : null }
    ], stock: hudStock()
  });
}
var GUIDE_TEXT = [
  ['第 1 頁: 衝到終點', '碰到旗子就過關'],
  ['第 2 頁: 操作', '↑ 跳、Z 攻擊、X 技能(Esc 暫停)'],
  ['第 3 頁: 過關後一直重播', '過關的關卡會一直重播賺素材'],
  ['第 4 頁: 撿多還是跑快', '撿越多、跑越快, 重播賺越快'],
  ['第 5 頁: 討伐榜', '重播裡打倒的怪也算討伐'],
  ['第 6 頁: 修工程, 迷霧散開', '花石料修工程, 迷霧後有新區域']
];
function drawGuide() {
  Art.drawMapBackground(ctx, {});
  Placeholder.panel(ctx, 0, 0, W, H, 'rgba(0,0,0,0.55)');
  Placeholder.text(ctx, '討伐令 — 玩家說明', W / 2, 44, 28, '#ffe9a8', 'center');
  Placeholder.text(ctx, GUIDE_TEXT[G.page][0], W / 2, 100, 26, '#fff', 'center');
  Placeholder.text(ctx, GUIDE_TEXT[G.page][1], W / 2, 146, 22, '#cfe8ff', 'center');
  Placeholder.panel(ctx, 230, 180, 820, 400, 'rgba(255,255,255,0.08)');
  Art.drawGuidePage(ctx, { page: G.page + GUIDE_PAGE_BASE, x: 240, y: 190, w: 800, h: 380 });
  Placeholder.text(ctx, (G.page + 1) + ' / ' + GUIDE_PAGES, W / 2, 618, 20, '#fff', 'center');
  Placeholder.text(ctx, '← → 翻頁    ' + (G.page >= GUIDE_PAGES - 1 ? 'Z 開始' : 'Z 下一頁'), W / 2, 660, 20, '#ffe9a8', 'center');
}
function render() {
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, W, H);
  var m = S.mode;
  if (m === 'guide') drawGuide();
  else if (m === 'play' || m === 'result' || m === 'fail') {
    drawPlay();
    if (m === 'result') {
      var r = R, newRates = ratesOf(r.events, r.frames.length / 60, r.n, ACCEL_MUL[ST.lv[r.n].accel]);
      var old = PENDING ? ST.rec[r.n] : null;
      Art.drawResultPanel(ctx, {
        time: round1(r.frames.length / 60), run: { wood: r.gain.wood, stone: r.gain.stone, time: r.gain.time, soul: r.gain.soul },
        rates: newRates, kills: r.kills, cls: r.cls, gains: r.gains || [],
        oldTime: old ? round1(old.dur) : null, oldRates: old ? recRates(r.n) : null, oldKills: old ? killsOf(old.events) : null, oldCls: old ? CLASSES[old.cls] : null
      });
    } else if (m === 'fail') Art.drawFailPanel(ctx, {});
  } else {
    drawMap(m === 'map' || m === 'ending');
    if (m === 'lpanel') drawLevelPanel();
    else if (m === 'upgrade') drawUpgrade();
    else if (m === 'ending') Art.drawEndingPanel(ctx, { totalTime: Math.floor(ST.playT) });
  }
  if (S.pause) Art.drawPausePanel(ctx, { mode: m === 'play' ? 'level' : 'map' });
}

/* ============ 主迴圈 ============ */
var acc = 0, lastTs = 0;
function tick() {
  var frozen = S.pause || S.mode === 'guide';
  if (frozen) return;
  GT += STEP;
  if (S.mode !== 'ending') ST.playT += STEP;
  stepReplays();
  updateFlyers(STEP);
  var i;
  for (i = 0; i < 4; i++) BUMP[MATS[i]] = Math.min(0.15, BUMP[MATS[i]] + STEP);
  for (i = 0; i < 8; i++) { var lv = ST.lv[i]; if (lv.rep.hunt && lv.fogA > 0) lv.fogA = Math.max(0, lv.fogA - STEP / 0.8); }
  for (i = 0; i < 3; i++) { var col = ST.bc[i]; col.newT = Math.min(0.4, col.newT + STEP); col.doneT = Math.min(0.4, col.doneT + STEP); }
  if (S.mode === 'map') {
    if (!BN && BQ.length) BN = BQ.shift();
    if (BN) { BN.t += STEP; if (BN.t >= 2.5) BN = null; }
  }
  if (S.mode === 'play' && R) {
    stepRun(R, STEP);
    if (R.over) { K.z = K.x = K.jump = false; finishRun(R); }
  }
}
function frame(ts) {
  try {
    var dt = lastTs ? (ts - lastTs) / 1000 : STEP;
    lastTs = ts;
    dt = Math.min(dt, 1 / 30);
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard++ < 4) { tick(); acc -= STEP; }
    render();
  } catch (e) { if (typeof console !== 'undefined') console.error(e); }
  requestAnimationFrame(frame);
}
function boot() {
  buildAll(); resetAll(); resize();
  requestAnimationFrame(frame);
}
boot();
