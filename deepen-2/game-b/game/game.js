'use strict';
/* 魔巢獵場 - 玩法驗證 Demo
 * 邏輯固定 60Hz 步進; 每步先更新狀態、記錄快照, 再依快照呼叫 Art。
 */

/* ============ 基本常數 ============ */
var W = 1280, H = 720;
if (typeof Art !== 'undefined' && Art.canvas) { W = Art.canvas.width; H = Art.canvas.height; }
var T = 40, COLS = 32, ROWS = 18, STEP = 1 / 60;
var MATS = ['wood', 'iron', 'time', 'core'];
var CLASSES = ['sword', 'hunter', 'bomber'];
var NAMES = ['草原', '懸崖棧道', '野豬峽谷', '蜂巢高塔', '斷橋', '盾兵要塞', '蛙沼', '王座'];
var THEMES = ['plain', 'sky', 'rock', 'sky', 'sky', 'rock', 'swamp', 'throne'];
var TROPHY = ['tusk', 'sting', 'crest', 'bagCore', 'web', 'bagIron', 'broodHorn', 'bagWood'];
var NEST_TYPES = [['frog', 'boar'], ['bee', 'frog'], ['boar', 'shield'], ['bee'], ['frog', 'boar'], ['shield', 'boar'], ['frog'], ['boar', 'shield', 'bee', 'frog']];
var UNLOCK_COST = [0, 20, 20, 50, 50, 50, 50, 100];
var REPAIR_COST = [[10, 20], [25, 40], [25, 40], [45, 65], [45, 65], [45, 65], [45, 65], [80, 110]];
var PARENTS = [[], [0], [0], [1], [1], [2], [2], [4, 5]];
var CARD_POS = [[40, 281], [290, 131], [290, 431], [540, 56], [540, 206], [540, 356], [540, 506], [790, 281]];
var LINKS = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 7]];
var WORKSHOP_POS = [40, 506], GOAL_POS = [1040, 281];
var HUD_ICON_X = { wood: 36, iron: 206, time: 376, core: 546 };
var ACCEL_MUL = [1, 1.25, 1.5];
var ACCEL_COST = [12, 30];
var SPEED_MUL = [1, 1.08, 1.16, 1.24], SPEED_COST = [8, 20, 45];
var HP_VAL = [3, 4, 5], HP_COST = [12, 35];
var CD_MUL = [1, 0.85, 0.7, 0.55], CD_COST = [8, 20, 45];
var GOAL_COST = { wood: 300, iron: 200, time: 100, core: 150 };
var RECRUIT_COST = 30;
var GUIDE_PAGE_BASE = 0; // Art.drawGuidePage 的 page 從 0 起算(interface 約定)
var GUIDE_PAGES = 5;
var SIZE = { boar: [48, 32], shield: [32, 44], bee: [32, 32], frog: [32, 28], mother: [64, 56] };
var MHP = { boar: 3, shield: 3, bee: 1, frog: 2, mother: 12 };
var DROPS = { boar: { wood: 3, core: 1 }, shield: { iron: 3, core: 1 }, bee: { time: 2, core: 1 }, frog: { wood: 2, core: 1 }, mother: { core: 6, iron: 4 } };
var LAIR_PICK = [['wood', 'iron'], ['time', 'wood'], ['iron', 'wood'], ['time', 'iron'], ['wood', 'time'], ['iron', 'time'], ['wood', 'iron'], ['time', 'wood']];
var LAIR_X0 = 13 * T;

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
function zeroGroup() { return { wood: 0, iron: 0, time: 0, core: 0 }; }
function groupOf(k, n) { var g = zeroGroup(); g[k] = n; return g; }
function round1(v) { return Math.round(v * 10) / 10; }

/* ============ 關卡資料 ============ */
var LV = [];
function buildLevel(n) {
  var t = [], r;
  for (r = 0; r < ROWS; r++) t.push(new Array(COLS).fill(0));
  function rect(c0, r0, c1, r1, v) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) t[rr][cc] = v; }
  var L = { n: n, theme: THEMES[n], t: t, cracks: [], hooks: [], pickups: [], mons: [], trophy: TROPHY[n], nestTypes: NEST_TYPES[n].slice(), cache: {} };
  // 骨架: 地面、岩塊(巢穴在岩塊內, 地面與主路地面等高)、樓梯平台
  rect(0, 16, 31, 17, 1); rect(12, 8, 31, 15, 1);
  rect(13, 12, 22, 15, 0); rect(24, 12, 31, 15, 0);
  rect(12, 13, 12, 15, 3); rect(23, 13, 23, 15, 4);
  rect(2, 14, 3, 15, 1); rect(5, 12, 6, 12, 1); rect(8, 10, 9, 10, 1); rect(10, 8, 11, 9, 1);
  L.start = { x: 50, y: 640 - 22 };
  L.nest = { x: 800, y: 640 - 24 };
  L.mother = { x: 1100, y: 640 - 28 };
  L.lairRects = [[12, 13, 1, 3], [13, 12, 10, 4], [24, 12, 8, 4]];
  function pick(c, rr, k, lair) { L.pickups.push({ x: c * T + 20, y: rr * T + 20, kind: k, lair: !!lair }); }
  function mon(k, c, gr) { L.mons.push({ k: k, x: c * T + 20, y: gr * T - SIZE[k][1] / 2 }); }
  function bee(c, rr) { L.mons.push({ k: 'bee', x: c * T + 20, y: rr * T + 20 }); }
  function spike(c) { t[7][c] = 5; }
  function spikeAt(c, rr) { t[rr][c] = 5; }
  function door(c) { L.cracks.push({ tiles: [[c, 6], [c, 7]] }); t[6][c] = 2; t[7][c] = 2; }
  function hut(c0, doors) { rect(c0, 5, c0 + 3, 5, 1); rect(c0 + 3, 6, c0 + 3, 7, 1); for (var d = 0; d < doors; d++) door(c0 + d); }
  // 高台: P2 頂(第 3 列)寬 4 格、P1(第 5 列)2 格、空 1 格、B0 小矮牆(第 7 列); 空格讓人站地面起跳, 不被 P1 擋頭
  function highPlat(c0) { rect(c0, 3, c0 + 3, 3, 1); rect(c0 + 4, 5, c0 + 5, 5, 1); rect(c0 + 7, 7, c0 + 7, 7, 1); L.hooks.push({ x: c0 * T - 20, y: 3 * T + 8 }); }
  function pit(c0, w) { rect(c0, 8, c0 + w - 1, 9, 0); }
  function goal(c, topRow) { L.goal = { x: c * T + 20, y: topRow * T - 40 }; }
  var i;
  switch (n) {
    case 0:
      highPlat(13); hut(28, 1); goal(26, 8);
      [13, 15, 17, 19, 21, 23, 25, 27].forEach(function (c) { pick(c, 7, 'wood'); });
      pick(12, 7, 'iron'); pick(29, 7, 'iron'); pick(30, 7, 'iron');
      pick(14, 2, 'time'); pick(16, 2, 'time');
      mon('boar', 15, 8); mon('frog', 22, 8); mon('frog', 23, 8); mon('shield', 24, 8); bee(21, 4);
      break;
    case 1:
      highPlat(12); rect(28, 6, 29, 7, 1); rect(30, 4, 30, 7, 1); rect(31, 3, 31, 7, 1);
      goal(31, 3); spike(14); spike(24); spike(26);
      [13, 15, 17, 22, 25, 27].forEach(function (c) { pick(c, 7, 'wood'); });
      pick(16, 7, 'iron'); pick(18, 7, 'iron');
      pick(13, 2, 'time'); pick(15, 2, 'time'); pick(21, 7, 'time'); pick(23, 7, 'time');
      mon('frog', 13, 8); mon('frog', 15, 8); bee(14, 5); bee(25, 5);
      break;
    case 2:
      hut(28, 1); goal(26, 8); spike(20); spike(22);
      [13, 15, 17, 19, 21, 23].forEach(function (c) { pick(c, 7, 'wood'); });
      pick(18, 7, 'iron'); pick(24, 7, 'iron'); pick(29, 7, 'iron'); pick(30, 7, 'iron');
      pick(25, 7, 'time');
      mon('boar', 14, 8); mon('boar', 16, 8); mon('boar', 18, 8); mon('shield', 23, 8);
      break;
    case 3:
      highPlat(13); pit(22, 6); goal(15, 3); spike(12); spike(29);
      pick(14, 7, 'wood'); pick(16, 7, 'wood'); pick(30, 7, 'wood'); pick(31, 7, 'wood');
      pick(19, 7, 'iron'); pick(21, 7, 'iron');
      pick(14, 2, 'time'); pick(16, 2, 'time'); pick(24, 9, 'time'); pick(26, 9, 'time'); pick(28, 7, 'time');
      mon('frog', 13, 8); bee(14, 5); bee(16, 5); bee(30, 5);
      break;
    case 4:
      pit(14, 4); pit(20, 4); pit(26, 4); goal(30, 8); spike(12);
      [13, 18, 19, 24, 25, 31].forEach(function (c) { pick(c, 7, 'wood'); });
      pick(22, 9, 'wood'); pick(16, 9, 'wood');
      pick(15, 9, 'iron'); pick(27, 9, 'iron');
      pick(17, 9, 'time'); pick(21, 9, 'time'); pick(28, 9, 'time');
      mon('boar', 15, 10); mon('boar', 21, 10); mon('frog', 18, 8); mon('frog', 24, 8); bee(17, 5);
      break;
    case 5:
      hut(28, 2); goal(26, 8); spike(21); spike(24);
      pick(13, 7, 'wood'); pick(15, 7, 'wood'); pick(20, 7, 'wood'); pick(27, 7, 'wood');
      [17, 19, 22, 23, 25].forEach(function (c) { pick(c, 7, 'iron'); });
      pick(30, 7, 'iron');
      pick(12, 7, 'time'); pick(14, 7, 'time');
      mon('shield', 14, 8); mon('shield', 16, 8); mon('shield', 18, 8); mon('boar', 22, 8); bee(24, 5);
      break;
    case 6:
      for (i = 14; i <= 23; i++) t[8][i] = 5;
      rect(15, 7, 16, 7, 1); rect(18, 7, 19, 7, 1); rect(21, 7, 22, 7, 1);
      hut(28, 1); goal(25, 8);
      pick(12, 7, 'wood'); pick(13, 7, 'wood'); pick(15, 6, 'wood'); pick(18, 6, 'wood'); pick(21, 6, 'wood'); pick(26, 7, 'wood');
      pick(16, 6, 'iron'); pick(29, 7, 'iron'); pick(30, 7, 'iron');
      pick(19, 6, 'time'); pick(22, 6, 'time');
      mon('frog', 12, 8); mon('frog', 13, 8); mon('frog', 26, 8); mon('frog', 27, 8); mon('shield', 24, 8); bee(19, 4);
      break;
    default:
      highPlat(12); pit(21, 6); hut(28, 1); goal(27, 8); spike(14); spikeAt(14, 2);
      pick(13, 7, 'wood'); pick(15, 7, 'wood'); pick(20, 7, 'wood'); pick(21, 9, 'wood'); pick(23, 9, 'wood'); pick(27, 6, 'wood');
      pick(16, 7, 'iron'); pick(24, 9, 'iron'); pick(29, 7, 'iron'); pick(30, 7, 'iron');
      pick(13, 2, 'time'); pick(15, 2, 'time'); pick(22, 9, 'time'); pick(25, 9, 'time');
      mon('boar', 14, 8); mon('boar', 16, 8); mon('shield', 13, 8); mon('frog', 22, 10); mon('frog', 24, 10); bee(23, 4);
      break;
  }
  // 巢穴室地上素材 2 個(巢母室不放)
  pick(15, 15, LAIR_PICK[n][0], true); pick(18, 15, LAIR_PICK[n][1], true);
  return L;
}
function buildAll() { LV = []; for (var i = 0; i < 8; i++) LV.push(buildLevel(i)); }
function terrFor(L, rep) {
  var key = (rep.tunnel ? 1 : 0) + (rep.gate ? 2 : 0);
  if (L.cache[key]) return L.cache[key];
  var t = L.t.map(function (row) { return row.slice(); });
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
    if (t[r][c] === 3 && rep.tunnel) t[r][c] = 0;
    if (t[r][c] === 4 && rep.gate) t[r][c] = 0;
  }
  L.cache[key] = t; return t;
}

/* ============ 持久狀態 ============ */
var ST, S, G, K, HELD, RP, FLY, BUMP, R = null, PENDING = null;
function resetAll() {
  ST = {
    stock: zeroGroup(), unlocked: [true, false, false, false, false, false, false, false],
    lv: [], bag: [], recruited: { hunter: false, bomber: false }, up: { speed: 0, hp: 0, cd: 0 },
    rec: [null, null, null, null, null, null, null, null], playT: 0
  };
  for (var i = 0; i < 8; i++) ST.lv.push({ rep: { tunnel: false, gate: false }, repSeq: 0, slots: [null, null], accel: 0, lastCls: 0, trophyTaken: false });
  S = { mode: 'guide', pause: false, cur: 0, lp: null, up: null, tele: 0 };
  G = { page: 0 };
  K = { z: false, x: false, jump: false };
  RP = [null, null, null, null, null, null, null, null];
  FLY = [];
  BUMP = { wood: 0.15, iron: 0.15, time: 0.15, core: 0.15 };
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
function repairedCount(n) { var r = ST.lv[n].rep; return (r.tunnel ? 1 : 0) + (r.gate ? 1 : 0); }
function maxHpNow() { return HP_VAL[ST.up.hp]; }

/* ============ 掉落與戰利品加成(即時與回放共用) ============ */
function killBonus(slots, mon, brood) {
  var b = 0;
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i]; if (!s) continue;
    if (s === 'tusk' && mon === 'boar') b++;
    else if (s === 'sting' && mon === 'bee') b++;
    else if (s === 'crest' && mon === 'shield') b++;
    else if (s === 'web' && mon === 'frog') b++;
    else if (s === 'broodHorn' && (brood || mon === 'mother')) b++;
  }
  return b;
}
function gainsOf(ev, slots) {
  var out = [], i;
  if (ev.src === 'pick') return [{ kind: ev.kind, n: ev.amt, x: ev.x, y: ev.y }];
  if (ev.src === 'goal') {
    var g = zeroGroup();
    for (i = 0; i < slots.length; i++) {
      if (slots[i] === 'bagCore') g.core += 3; else if (slots[i] === 'bagIron') g.iron += 3; else if (slots[i] === 'bagWood') g.wood += 5;
    }
    for (i = 0; i < 4; i++) if (g[MATS[i]] > 0) out.push({ kind: MATS[i], n: g[MATS[i]], x: ev.x, y: ev.y });
    return out;
  }
  var bonus = killBonus(slots, ev.mon, ev.brood);
  return [{ kind: ev.kind, n: Math.round(ev.amt * ev.mult * (1 + bonus)), x: ev.x, y: ev.y }];
}
function ratesOf(events, dur, slots, accel) {
  var tot = zeroGroup(), i, j;
  for (i = 0; i < events.length; i++) { var gs = gainsOf(events[i], slots); for (j = 0; j < gs.length; j++) tot[gs[j].kind] += gs[j].n; }
  var out = zeroGroup();
  for (i = 0; i < 4; i++) out[MATS[i]] = round1(tot[MATS[i]] / dur * 60 * accel);
  return out;
}
function recRates(n) {
  var rec = ST.rec[n]; if (!rec) return null;
  return ratesOf(rec.events, rec.dur, ST.lv[n].slots, ACCEL_MUL[ST.lv[n].accel]);
}
function totalRates() {
  var t = zeroGroup();
  for (var n = 0; n < 8; n++) { var r = recRates(n); if (r) for (var i = 0; i < 4; i++) t[MATS[i]] += r[MATS[i]]; }
  for (var k = 0; k < 4; k++) t[MATS[k]] = round1(t[MATS[k]]);
  return t;
}

/* ============ 物理 ============ */
function solidCode(v) { return v === 1 || v === 2 || v === 3 || v === 4; }
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

/* ============ 一趟跑關 ============ */
function newRun(n, clsIdx) {
  var L = LV[n], rep = ST.lv[n].rep;
  var r = {
    n: n, L: L, cls: CLASSES[clsIdx], clsIdx: clsIdx, t: terrFor(L, rep).map(function (row) { return row.slice(); }),
    slots: ST.lv[n].slots.slice(), frames: [], events: [], tk: [], mid: 0, atkN: 0, chain: {},
    mons: [], arrows: [], shots: [], bombs: [], ex: [], sw: [], pf: [], popups: [], chainTx: [],
    gain: zeroGroup(), reached: false, over: null, notice: null, trophyGot: null, mapper: null,
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
  L.mons.forEach(function (d) { r.mons.push(newMon(r, d.k, d.x, d.y, false)); });
  if (rep.gate) { var mm = newMon(r, 'mother', L.mother.x, L.mother.y, false); r.mons.push(mm); }
  r.nestOn = rep.tunnel;
  return r;
}
function newMon(r, k, x, y, brood) {
  var s = SIZE[k];
  var m = {
    id: ++r.mid, k: k, x: x, y: y, w: s[0], h: s[1], vx: 0, vy: 0, facing: -1, state: k === 'bee' ? 'fly' : k === 'frog' ? 'crouch' : 'walk', st: 0, hp: MHP[k],
    brood: !!brood, hitT: 0, blockT: 0, flung: 0, flungT: 0, atk: 0, hitSet: null, alive: true, ox: x, oy: y, bdir: 1, tt: 0, shotCd: 0.5, ground: false, hitX: 0, hitY: 0
  };
  if (k === 'frog') m.st = 0.6 + (m.id % 4) * 0.2;
  return m;
}
function newAtk(r) { return ++r.atkN; }

/* --- 事件 / 掉落 --- */
function pushEvent(r, ev, idx) {
  ev.f = r.frames.length; r.events.push(ev);
  var gs = gainsOf(ev, r.slots);
  for (var i = 0; i < gs.length; i++) {
    r.gain[gs[i].kind] += gs[i].n;
    r.popups.push({ x: gs[i].x, y: gs[i].y - (idx || 0) * 18, t: 0, dur: 0.8, kind: gs[i].kind, value: clamp(gs[i].n, 1, 60), mult: ev.src === 'kill' ? ev.mult : 1 });
  }
}
function killMon(r, m, atk) {
  m.alive = false;
  r.pf.push({ x: m.x, y: m.y, t: 0, dur: 0.3, big: m.k === 'mother' });
  var k = (r.chain[atk] = (r.chain[atk] || 0) + 1);
  var mult = Math.min(k, 3);
  var d = {}, key;
  for (key in DROPS[m.k]) d[key] = DROPS[m.k][key];
  if (m.brood) d.core = (d.core || 0) + 1;
  var idx = 0;
  for (var i = 0; i < 4; i++) {
    var kind = MATS[i]; if (!d[kind]) continue;
    pushEvent(r, { src: 'kill', x: m.x, y: m.y, kind: kind, amt: d[kind], mon: m.k, brood: m.brood, mult: mult }, idx++);
  }
  if (k >= 2) {
    r.chainTx = r.chainTx.filter(function (c) { return c.atk !== atk; });
    r.chainTx.push({ x: m.x, y: m.y - 24, n: clamp(k, 2, 20), t: 0, dur: 0.8, atk: atk });
  }
  if (m.k === 'mother' && !ST.lv[r.n].trophyTaken && !r.trophyGot) {
    r.trophyGot = TROPHY[r.n]; r.notice = { type: r.trophyGot, t: 0, dur: 1.5 };
  }
  if (r.p.dash && atk === r.p.dash.atk) r.p.dash.killed = true;
}
function hitMon(r, m, dmg, atk) {
  if (!m.alive) return false;
  if (m.k === 'mother' && m.state === 'stun') dmg *= 2;
  m.hp -= dmg; m.hitT = 0.1;
  if (m.hp <= 0) { killMon(r, m, atk); return true; }
  return false;
}
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
      if (hitMon(r, m, 2, dd.atk) ) dd.killed = true;
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
  // 跳躍
  if (K.jump && p.ground && p.kb <= 0) { p.vy = -720; p.ground = false; p.jumpT = 0; }
  if (!HELD.jump && p.jumpT < 0.15 && p.vy < -360) p.vy = -360;
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
  if (!groundAhead(r, m, m.facing)) { m.facing = -m.facing; return; }
  moveX(r.t, m, m.facing * dist);
  if (m.hitX) m.facing = -m.facing;
}
function jumpOK(r, m, d) {
  var lx = m.x + d * 120, foot = m.y + m.h / 2;
  return solidAt(r.t, lx, foot + 4) && !solidAt(r.t, lx, m.y) && !solidAt(r.t, m.x + d * (m.w / 2 + 8), m.y);
}
function updateFlung(r, m, dt) {
  m.flungT -= dt; m.vy = 0;
  moveX(r.t, m, m.flung * 460 * dt);
  var ended = false, i;
  if (m.hitX) { hitMon(r, m, 1, m.atk); ended = true; }
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
        if (!groundAhead(r, m, d)) { m.state = 'stun'; m.st = 1; }
        else { moveX(r.t, m, d * 420 * dt); if (m.hitX) { m.state = 'stun'; m.st = 1; } }
      } else if (m.state === 'stun') { m.st -= dt; if (m.st <= 0) m.state = 'walk'; }
      break;
    case 'shield':
      applyGravity(r, m, dt);
      if (m.ground) {
        if (Math.abs(dx) < 400 && Math.abs(p.y - m.y) < 120) {
          if (Math.abs(dx) > 6) { m.facing = sgn(dx); if (groundAhead(r, m, m.facing)) moveX(r.t, m, m.facing * 40 * dt); }
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
            if (!jumpOK(r, m, jd)) { jd = -jd; if (!jumpOK(r, m, jd)) { m.st = 0.3; break; } }
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
      var atEdge = function (dir) { return !groundAhead(r, m, dir) || (dir < 0 && m.x - m.w / 2 <= LAIR_X0 + 1); };
      if (m.state === 'walk') {
        if (m.ground && Math.abs(p.y - m.y) <= 80 && dx * d > 0 && dx * d <= 320) { m.state = 'windup'; m.st = 0.8; }
        else if (m.ground) {
          if (atEdge(d)) m.facing = -d; else { moveX(r.t, m, d * 50 * dt); if (m.hitX) m.facing = -d; }
        }
      } else if (m.state === 'windup') { m.st -= dt; if (m.st <= 0) m.state = 'charge'; }
      else if (m.state === 'charge') {
        if (atEdge(d)) { m.state = 'stun'; m.st = 1.5; }
        else { moveX(r.t, m, d * 380 * dt); if (m.hitX) { m.state = 'stun'; m.st = 1.5; } }
      } else if (m.state === 'stun') { m.st -= dt; if (m.st <= 0) m.state = 'walk'; }
      break;
  }
}

/* --- 一步 --- */
function stepRun(r, dt) {
  var p = r.p, i;
  if (r.over) return;
  // 巢口
  if (r.nestOn && r.nestN < 5) {
    r.nestT -= dt;
    if (r.nestT <= 0) {
      var k = r.L.nestTypes[r.nestN % r.L.nestTypes.length];
      var s = SIZE[k], sy = k === 'bee' ? 640 - 90 : 640 - s[1] / 2;
      r.mons.push(newMon(r, k, r.L.nest.x - 56, sy, true));
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
        if (blocks(m, sgn(a.x - m.x) || -sgn(a.vx), a.y)) { m.blockT = 0.2; m.hitT = 0.1; }
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
  // 玩家碰怪
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
      pushEvent(r, { src: 'pick', x: pk.x, y: pk.y, kind: pk.kind, amt: 1, idx: i }, 0);
    }
  }
  // 尖刺 / 掉落
  var c0 = Math.floor((p.x - p.w / 2) / T), c1 = Math.floor((p.x + p.w / 2 - 0.001) / T), r0 = Math.floor((p.y - p.h / 2) / T), r1 = Math.floor((p.y + p.h / 2 - 0.001) / T);
  for (var sr = r0; sr <= r1; sr++) for (var sc = c0; sc <= c1; sc++) {
    if (sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS && r.t[sr][sc] === 5 && rectsHit(p.x, p.y, p.w, p.h, sc * T + 20, sr * T + 30, T, 20)) r.over = 'fail';
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
    ns: { s: !r.nestOn ? 'dormant' : r.nestN >= 5 ? 'spent' : 'idle', t: r.nestSp, left: 5 - r.nestN },
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
function previewSnap(n) {
  var L = LV[n], rep = ST.lv[n].rep;
  var sn = { t: 0, reached: false, p: null, m: [], tk: [], ck: L.cracks.map(function () { return 3; }), ns: { s: rep.tunnel ? 'idle' : 'dormant', t: 0.4, left: 5 }, pr: [], ex: [], sw: [], pf: [] };
  L.mons.forEach(function (d) {
    sn.m.push({ k: d.k, x: d.x, y: d.y, f: -1, s: d.k === 'bee' ? 'fly' : d.k === 'frog' ? 'crouch' : 'walk', h: false, b: false, hp: MHP[d.k], t: 0 });
  });
  if (rep.gate) sn.m.push({ k: 'mother', x: L.mother.x, y: L.mother.y, f: -1, s: 'walk', h: false, b: false, hp: 12, t: 0 });
  return sn;
}

/* ============ 回放與素材飛行 ============ */
function makeRec(r) {
  var N = r.frames.length;
  return { frames: r.frames, events: r.events, N: N, dur: N / 60, cls: r.clsIdx, repSeq: ST.lv[r.n].repSeq };
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
  var gs = gainsOf(ev, ST.lv[n].slots);
  for (var i = 0; i < gs.length; i++) {
    var g = gs[i];
    if (S.mode === 'map') spawnFly(n, g);
    else addStock(g.kind, g.n);
  }
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
function finishRun(r) {
  var n = r.n;
  if (r.over === 'fail') { S.mode = 'fail'; return; }
  var rec = makeRec(r);
  for (var i = 0; i < 4; i++) if (r.gain[MATS[i]] > 0) addStock(MATS[i], r.gain[MATS[i]]);
  if (r.trophyGot) { ST.bag.push(r.trophyGot); ST.lv[n].trophyTaken = true; }
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
    var cost = groupOf('iron', REPAIR_COST[n][lp.site]);
    if (lp.site === 0) { if (!lv.rep.tunnel && canPay(cost)) { pay(cost); lv.rep.tunnel = true; lv.repSeq++; } }
    else if (lv.rep.tunnel && !lv.rep.gate && canPay(cost)) { pay(cost); lv.rep.gate = true; lv.repSeq++; }
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
    if (lv < info[1].length) { var cc = groupOf('core', info[1][lv]); if (canPay(cc)) { pay(cc); ST.up[info[0]]++; } }
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
var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'jump', KeyZ: 'z', KeyX: 'x', Escape: 'esc' };
var KEYNAME = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', ' ': 'jump', z: 'z', Z: 'z', x: 'x', X: 'x', Escape: 'esc' };
HELD = { left: false, right: false, jump: false };
function inputDown(k) {
  if (k === 'left' || k === 'right' || k === 'jump') HELD[k] = true;
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
      else if (k === 'jump') { G.page = 0; S.mode = 'guide'; }
      break;
    case 'play':
      if (k === 'z') K.z = true; else if (k === 'x') K.x = true; else if (k === 'jump') K.jump = true;
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
  if (k === 'left' || k === 'right' || k === 'jump') HELD[k] = false;
});
window.addEventListener('blur', function () { HELD.left = HELD.right = HELD.jump = false; });

/* ============ 畫面 ============ */
var canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
var scaleX = 1, scaleY = 1;
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

var MONNAME = { boar: 'drawBoar', shield: 'drawShieldman', bee: 'drawShooterBee', frog: 'drawFrog' };
function drawScene(c, L, snap, o) {
  var rep = o.rep, t = terrFor(L, rep), r, cc, i;
  Art.drawBackground(c, {});
  for (i = 0; i < L.lairRects.length; i++) {
    var lr = L.lairRects[i];
    Art.drawLairBack(c, { x: lr[0] * T, y: lr[1] * T, w: lr[2] * T, h: lr[3] * T });
  }
  for (r = 0; r < ROWS; r++) for (cc = 0; cc < COLS; cc++) {
    var v = t[r][cc], x = cc * T + 20, y = r * T + 20;
    if (v === 1) Art.drawGround(c, { x: x, y: y, top: !(r > 0 && solidCode(t[r - 1][cc])), theme: (cc >= 12 && r >= 12) ? 'lair' : L.theme });
    else if (v === 3) Art.drawCaveRubble(c, { x: x, y: y });
    else if (v === 5) Art.drawSpike(c, { x: x, y: y });
  }
  for (i = 0; i < L.cracks.length; i++) {
    var hp = snap.ck[i];
    if (hp > 0) for (var q = 0; q < L.cracks[i].tiles.length; q++) Art.drawCrackWall(c, { x: L.cracks[i].tiles[q][0] * T + 20, y: L.cracks[i].tiles[q][1] * T + 20, hp: hp });
  }
  Art.drawAltarGate(c, { x: 23 * T + 20, y: 14 * T + 20 + 0, open: !!rep.gate });
  Art.drawNest(c, { x: L.nest.x, y: L.nest.y, state: snap.ns.s, spawnT: snap.ns.t, spawnDur: 0.4, left: snap.ns.left });
  for (i = 0; i < L.hooks.length; i++) Art.drawHookRing(c, { x: L.hooks[i].x, y: L.hooks[i].y });
  for (i = 0; i < L.pickups.length; i++) if (snap.tk.indexOf(i) < 0) Art.drawPickup(c, { x: L.pickups[i].x, y: L.pickups[i].y, kind: L.pickups[i].kind, t: snap.t });
  Art.drawGoal(c, { x: L.goal.x, y: L.goal.y, reached: snap.reached });
  for (i = 0; i < snap.m.length; i++) {
    var m = snap.m[i];
    if (m.k === 'mother') Art.drawBroodmother(c, { x: m.x, y: m.y, facing: m.f, state: m.s, hit: m.h, hp: m.hp, maxHp: 12, t: m.t });
    else if (m.k === 'frog') Art.drawFrog(c, { x: m.x, y: m.y, facing: m.f, state: m.s, hit: m.h, brood: m.b });
    else Art[MONNAME[m.k]](c, { x: m.x, y: m.y, facing: m.f, state: m.s, hit: m.h, brood: m.b, t: m.t });
  }
  var p = snap.p;
  if (p) {
    if (p.cls === 'hunter' && !o.thumb) Art.drawRangeRing(c, { x: p.x, y: p.y, radius: 260 });
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
}
function drawThumb(c, n, snap) {
  c.save();
  c.translate(CARD_POS[n][0] + 8, CARD_POS[n][1] + 8);
  c.beginPath(); c.rect(0, 0, 160, 90); c.clip();
  c.scale(0.125, 0.125);
  drawScene(c, LV[n], snap, { rep: ST.lv[n].rep, thumb: true });
  c.restore();
}
function hudStock() { return { wood: ST.stock.wood, iron: ST.stock.iron, time: ST.stock.time, core: ST.stock.core }; }
function hudBump() { return { wood: BUMP.wood, iron: BUMP.iron, time: BUMP.time, core: BUMP.core }; }
function drawMapHud() {
  Art.drawHud(ctx, { mode: 'map', stock: hudStock(), ratePerMin: totalRates(), bumpT: hudBump(), bumpDur: 0.15, time: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null });
}
function anyAffordable() {
  if (!ST.recruited.hunter && ST.stock.wood >= RECRUIT_COST) return true;
  if (!ST.recruited.bomber && ST.stock.wood >= RECRUIT_COST) return true;
  var defs = [[ST.up.speed, SPEED_COST], [ST.up.hp, HP_COST], [ST.up.cd, CD_COST]];
  for (var i = 0; i < 3; i++) if (defs[i][0] < defs[i][1].length && ST.stock.core >= defs[i][1][defs[i][0]]) return true;
  return false;
}
function drawMap(showFly) {
  var i;
  Art.drawMapBackground(ctx, {});
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
    if (rec) { var rp = RP[i] || { f: 0 }; drawThumb(ctx, i, rec.frames[Math.min(rec.N - 1, Math.floor(rp.f))]); }
    else if (st === 'open') drawThumb(ctx, i, previewSnap(i));
    Art.drawCardOverlay(ctx, { x: CARD_POS[i][0], y: CARD_POS[i][1], accelLv: lv.accel, newArea: !!rec && rec.repSeq < lv.repSeq, selected: S.mode === 'map' && S.cur === i });
  }
  Art.drawWorkshopCard(ctx, { x: WORKSHOP_POS[0], y: WORKSHOP_POS[1], anyAffordable: anyAffordable(), selected: S.mode === 'map' && MAPITEMS[S.cur].type === 'workshop' });
  Art.drawGoalCard(ctx, { x: GOAL_POS[0], y: GOAL_POS[1], cost: GOAL_COST, stock: hudStock(), canAfford: canPay(GOAL_COST), selected: S.mode === 'map' && MAPITEMS[S.cur].type === 'goal' });
  Placeholder.text(ctx, '↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', W / 2, 702, 16, '#ddd', 'center');
  drawMapHud();
  if (showFly) for (i = 0; i < FLY.length; i++) {
    var f = FLY[i], u = f.t / f.dur;
    Art.drawFlyingMaterial(ctx, { x: f.x0 + (f.x1 - f.x0) * u, y: f.y0 + (f.y1 - f.y0) * u - Math.sin(Math.PI * u) * 70, kind: f.kind, t: f.t, dur: f.dur });
  }
}
function drawPlay() {
  var r = R, snap = r.frames.length ? r.frames[r.frames.length - 1] : makeSnap(r), i;
  drawScene(ctx, r.L, snap, { rep: ST.lv[r.n].rep });
  for (i = 0; i < r.popups.length; i++) { var pp = r.popups[i]; Art.drawPopup(ctx, { x: pp.x, y: pp.y, t: pp.t, dur: pp.dur, kind: pp.kind, value: pp.value, mult: pp.mult }); }
  for (i = 0; i < r.chainTx.length; i++) { var ch = r.chainTx[i]; Art.drawChainText(ctx, { x: ch.x, y: ch.y, n: ch.n, t: ch.t, dur: ch.dur }); }
  if (r.notice) Art.drawItemNotice(ctx, { type: r.notice.type, t: r.notice.t, dur: r.notice.dur });
  var p = r.p;
  Art.drawHud(ctx, {
    mode: 'level', stock: hudStock(), ratePerMin: totalRates(), bumpT: hudBump(), bumpDur: 0.15, time: round1(r.frames.length / 60),
    run: { wood: r.gain.wood, iron: r.gain.iron, time: r.gain.time, core: r.gain.core }, hp: p.hp, maxHp: r.mhp,
    skillCdT: p.skDur - p.skCd, skillCdDur: p.skDur, cls: r.cls
  });
}
function siteRect(site) {
  // 預覽縮放 0.5, 原點 (60,96): 通道 = 第 12~22 欄, 祭壇門 = 第 23~31 欄, 皆第 12~15 列
  var c0 = site === 0 ? 12 : 23, c1 = site === 0 ? 22 : 31;
  return { x: 60 + c0 * 20, y: 96 + 12 * 20, w: (c1 - c0 + 1) * 20, h: 4 * 20 };
}
function drawLevelPanel() {
  var lp = S.lp, n = lp.n, lv = ST.lv[n], rec = ST.rec[n], i;
  var tcost = groupOf('iron', REPAIR_COST[n][0]), gcost = groupOf('iron', REPAIR_COST[n][1]);
  var items = ST.bag.map(function (ty) {
    var wh = null;
    for (var a = 0; a < 8; a++) for (var b = 0; b < 2; b++) if (ST.lv[a].slots[b] === ty) wh = { level: a + 1, slot: b + 1 };
    return { type: ty, where: wh };
  });
  Art.drawLevelPanel(ctx, {
    index: n + 1, name: NAMES[n], row: lp.row,
    classes: [{ cls: 'sword', owned: true }, { cls: 'hunter', owned: ST.recruited.hunter }, { cls: 'bomber', owned: ST.recruited.bomber }], clsSel: lp.cls,
    sites: [{ repaired: lv.rep.tunnel, locked: false, cost: tcost }, { repaired: lv.rep.gate, locked: !lv.rep.tunnel, cost: gcost }], siteSel: lp.site,
    slots: [lv.slots[0], lv.slots[1]], slotSel: lp.slot, items: items,
    accelLv: lv.accel, accelCost: lv.accel < 2 ? groupOf('time', ACCEL_COST[lv.accel]) : null, stock: hudStock(),
    recordCls: rec ? CLASSES[rec.cls] : null, recordTime: rec ? round1(rec.dur) : null, rates: rec ? recRates(n) : null,
    newArea: !!rec && rec.repSeq < lv.repSeq, nestTypes: LV[n].nestTypes, trophy: TROPHY[n], trophyTaken: lv.trophyTaken
  });
  // 預覽(畫在面板外框內, 面板文字之前已畫外框; 預覽疊在上面)
  ctx.save();
  ctx.translate(60, 96); ctx.beginPath(); ctx.rect(0, 0, 640, 360); ctx.clip(); ctx.scale(0.5, 0.5);
  drawScene(ctx, LV[n], previewSnap(n), { rep: lv.rep, preview: true });
  ctx.restore();
  if (lp.row === 1) { var sr = siteRect(lp.site); Art.drawSiteHighlight(ctx, { x: sr.x, y: sr.y, w: sr.w, h: sr.h, active: true }); }
}
function drawUpgrade() {
  var u = S.up;
  Art.drawUpgradePage(ctx, {
    row: u.row,
    recruits: [{ cls: 'hunter', owned: ST.recruited.hunter, cost: groupOf('wood', RECRUIT_COST) }, { cls: 'bomber', owned: ST.recruited.bomber, cost: groupOf('wood', RECRUIT_COST) }],
    recruitSel: u.sel,
    stats: [
      { key: 'speed', lv: ST.up.speed, maxLv: 3, cost: ST.up.speed < 3 ? groupOf('core', SPEED_COST[ST.up.speed]) : null },
      { key: 'hp', lv: ST.up.hp, maxLv: 2, cost: ST.up.hp < 2 ? groupOf('core', HP_COST[ST.up.hp]) : null },
      { key: 'cd', lv: ST.up.cd, maxLv: 3, cost: ST.up.cd < 3 ? groupOf('core', CD_COST[ST.up.cd]) : null }
    ], stock: hudStock()
  });
}
var GUIDE_TEXT = [
  ['第 1 頁: 衝到終點', '碰到旗子就過關'],
  ['第 2 頁: 操作', '空白鍵跳、Z 攻擊、X 技能(Esc 暫停)'],
  ['第 3 頁: 過關後一直重播', '過關的關卡會一直重播賺素材'],
  ['第 4 頁: 撿多還是跑快', '撿越多、跑越快, 重播賺越快'],
  ['第 5 頁: 打通巢穴', '花鐵礦打通通道, 巢穴會湧出怪']
];
function drawGuide() {
  Art.drawMapBackground(ctx, {});
  Placeholder.panel(ctx, 0, 0, W, H, 'rgba(0,0,0,0.55)');
  Placeholder.text(ctx, '魔巢獵場 — 玩家說明', W / 2, 44, 28, '#ffe9a8', 'center');
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
      var r = R, newRates = ratesOf(r.events, r.frames.length / 60, r.slots, ACCEL_MUL[ST.lv[r.n].accel]);
      var old = PENDING ? ST.rec[r.n] : null;
      Art.drawResultPanel(ctx, {
        time: round1(r.frames.length / 60), run: { wood: r.gain.wood, iron: r.gain.iron, time: r.gain.time, core: r.gain.core },
        rates: newRates, cls: r.cls, item: r.trophyGot || null,
        oldTime: old ? round1(old.dur) : null, oldRates: old ? recRates(r.n) : null, oldCls: old ? CLASSES[old.cls] : null
      });
    } else if (m === 'fail') Art.drawFailPanel(ctx, {});
  } else {
    drawMap(m === 'map' || m === 'ending' ? true : false);
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
  if (S.mode !== 'ending') ST.playT += STEP;
  stepReplays();
  updateFlyers(STEP);
  for (var i = 0; i < 4; i++) BUMP[MATS[i]] = Math.min(0.15, BUMP[MATS[i]] + STEP);
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
