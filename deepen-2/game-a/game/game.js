// 重建之路 - game.js (傳統腳本, 無 module)
var W = 1280, H = 720, TS = 40, GW = 32, GH = 18, DT = 1 / 60;
var KINDS = ['wood', 'stone', 'time', 'soul'];
var GRAV = 2400, JUMP_V = 720;
// 說明頁頁碼起點: 與 interface.json / 美術約定一致, drawGuidePage 的 page 從 0 起算
var GUIDE_PAGE_BASE = 0;
var GUIDE_PAGES = 5;

// 規格與 interface 都沒有、需要的圖形: 只有獵人抓鉤的鉤索(規格指定由 RD 畫)
var Placeholder = {
  rope: function (c, x1, y1, x2, y2) {
    c.save(); c.strokeStyle = '#e8dcc0'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
  }
};

// ---------------------------------------------------------------- 關卡資料
var MDEF = {
  boar: { w: 48, h: 32, hp: 3, drops: [['wood', 3], ['soul', 1]] },
  shield: { w: 32, h: 44, hp: 3, drops: [['stone', 3], ['soul', 1]] },
  bee: { w: 32, h: 32, hp: 1, drops: [['time', 2], ['soul', 1]] },
  frog: { w: 32, h: 28, hp: 2, drops: [['wood', 2], ['soul', 1]] }
};
var ITEM_NAMES = { bagWood: '木材袋', bagStone: '石料袋', bagTime: '時晶袋', soulLamp: '魂燈', glove: '拾荒手套', horn: '獵人號角' };
var REPAIR_COST = [[10, 15], [25, 30], [25, 30], [45, 55], [45, 55], [45, 55], [45, 55], [80, 90]];
var UNLOCK_COST = [0, 20, 20, 50, 50, 50, 50, 100];
var PARENTS = [[], [0], [0], [1], [1], [2], [2], [4, 5]];
var CARD_POS = [[40, 281], [290, 131], [290, 431], [540, 56], [540, 206], [540, 356], [540, 506], [790, 281]];
var WORK_POS = [40, 506];
var GOAL_POS = [1040, 281];
var GOAL_COST = { wood: 300, stone: 200, time: 100, soul: 120 };
var ACCEL_MULT = [1, 1.25, 1.5];
var ACCEL_COST = [12, 30];
var UP_SPEED = [1, 1.08, 1.16, 1.24], UP_CD = [1, 0.85, 0.7, 0.55], UP_HP = [3, 4, 5];
var SPEED_COST = [8, 20, 45], HP_COST = [12, 35], CD_COST = [8, 20, 45];
var RECRUIT_COST = 30;
var CLS = { sword: { speed: 260 }, hunter: { speed: 260 }, bomber: { speed: 230 } };
var CLS_LIST = ['sword', 'hunter', 'bomber'];

// 每關設定: sh=捷徑工程種類, tr=寶區工程種類; 格座標 [c, r] (r = 腳踩的那一列)
var LCFG = [
  { name: '草原', theme: 'plain', sh: 'bridge', tr: 'rubble', mounds: [[15, 2, 2]], hi: 22, item: 'bagWood',
    pick: [['wood', 12, 14], ['wood', 13, 14], ['wood', 14, 14], ['wood', 17, 14], ['wood', 26, 14], ['wood', 27, 14], ['wood', 28, 14], ['wood', 29, 14],
      ['stone', 15, 12], ['stone', 16, 12], ['stone', 28, 13], ['time', 23, 9], ['time', 24, 9]],
    mon: [['boar', 13, 14], ['frog', 17, 14], ['frog', 26, 14], ['shield', 28, 14], ['bee', 14, 11]],
    tpick: [['wood', 3, 14], ['wood', 5, 14], ['wood', 7, 14], ['stone', 4, 14], ['stone', 6, 14]],
    tmon: [['frog', 8, 14], ['frog', 9, 14]] },
  { name: '懸崖棧道', theme: 'sky', sh: 'stairs', tr: 'bridge', spikes: [[23, 1], [26, 1], [28, 2]], item: 'bagTime',
    pick: [['wood', 21, 14], ['wood', 22, 14], ['wood', 24, 14], ['wood', 25, 14], ['wood', 27, 14], ['wood', 31, 14],
      ['stone', 22, 12], ['stone', 25, 12], ['time', 21, 13], ['time', 24, 13], ['time', 27, 13], ['time', 31, 13]],
    mon: [['bee', 23, 9], ['bee', 27, 9], ['frog', 22, 14], ['frog', 27, 14]],
    tpick: [['time', 2, 14], ['time', 3, 14], ['time', 4, 14], ['time', 4, 13]],
    tmon: [['bee', 2, 13], ['bee', 3, 13]] },
  { name: '野豬峽谷', theme: 'rock', sh: 'rubble', tr: 'stairs', pits: [[18, 6]], cracks: [[26, 13, 2]], item: 'bagStone',
    pick: [['wood', 17, 14], ['wood', 25, 14], ['wood', 27, 14], ['wood', 28, 14], ['wood', 29, 14], ['wood', 31, 14],
      ['stone', 19, 15], ['stone', 21, 15], ['stone', 23, 15], ['stone', 27, 13], ['time', 20, 15]],
    mon: [['boar', 17, 14], ['boar', 25, 14], ['boar', 29, 14], ['shield', 28, 14]],
    tpick: [['stone', 2, 6], ['stone', 3, 6], ['stone', 4, 6], ['stone', 2, 5], ['stone', 3, 5]],
    tmon: [['shield', 12, 14], ['boar', 10, 14]] },
  { name: '蜂巢高塔', theme: 'sky', sh: 'stairs', tr: 'rubble', pits: [[14, 6]], hi: 26, spikes: [[21, 1], [31, 1]], item: 'glove',
    pick: [['wood', 13, 14], ['wood', 15, 15], ['wood', 17, 15], ['wood', 20, 14], ['stone', 16, 15], ['stone', 18, 15],
      ['time', 27, 9], ['time', 28, 9], ['time', 13, 13], ['time', 20, 13], ['time', 31, 13]],
    mon: [['bee', 16, 10], ['bee', 22, 9], ['bee', 27, 7], ['frog', 13, 14]],
    tpick: [['wood', 3, 14], ['wood', 4, 14], ['stone', 5, 14], ['stone', 6, 14], ['time', 7, 13]],
    tmon: [['frog', 8, 14], ['frog', 9, 14], ['bee', 5, 13]] },
  { name: '斷橋', theme: 'sky', sh: 'bridge', tr: 'rubble', pits: [[14, 4], [19, 4], [24, 4]], spikes: [[12, 1]], item: 'horn',
    pick: [['wood', 13, 14], ['wood', 18, 14], ['wood', 23, 14], ['wood', 15, 15], ['wood', 16, 15], ['wood', 20, 15], ['wood', 21, 15], ['wood', 26, 15],
      ['stone', 17, 15], ['stone', 25, 15], ['time', 22, 15], ['time', 28, 14], ['time', 29, 14]],
    mon: [['boar', 13, 14], ['boar', 29, 14], ['frog', 23, 14], ['frog', 31, 14], ['bee', 20, 10]],
    tpick: [['wood', 3, 14], ['wood', 4, 14], ['stone', 5, 14], ['time', 6, 14]],
    tmon: [['boar', 8, 14], ['frog', 6, 14], ['frog', 9, 14]] },
  { name: '盾兵要塞', theme: 'rock', sh: 'rubble', tr: 'stairs', cracks: [[21, 13, 2], [25, 13, 2]], spikes: [[17, 1], [30, 1]], item: 'soulLamp',
    pick: [['wood', 18, 14], ['wood', 22, 14], ['wood', 24, 14], ['wood', 31, 14], ['stone', 22, 13], ['stone', 23, 13], ['stone', 24, 13],
      ['stone', 26, 14], ['stone', 27, 13], ['stone', 28, 13], ['time', 19, 13], ['time', 31, 12]],
    mon: [['shield', 19, 14], ['shield', 23, 14], ['shield', 27, 14], ['boar', 29, 14], ['bee', 24, 9]],
    tpick: [['stone', 2, 6], ['stone', 3, 6], ['stone', 4, 6], ['time', 3, 5]],
    tmon: [['shield', 12, 14], ['shield', 10, 14]] },
  { name: '蛙沼', theme: 'swamp', sh: 'bridge', tr: 'rubble', spikes: [[16, 2], [20, 2], [24, 2], [28, 1]], item: 'glove',
    pick: [['wood', 13, 14], ['wood', 14, 14], ['wood', 18, 14], ['wood', 22, 14], ['wood', 26, 14], ['wood', 27, 14],
      ['stone', 18, 12], ['stone', 22, 12], ['stone', 26, 12], ['time', 19, 13], ['time', 23, 13]],
    mon: [['frog', 14, 14], ['frog', 18, 14], ['frog', 22, 14], ['frog', 26, 14], ['shield', 29, 14], ['bee', 20, 9]],
    tpick: [['wood', 3, 14], ['wood', 4, 14], ['stone', 5, 14], ['time', 6, 14]],
    tmon: [['frog', 7, 14], ['frog', 8, 14], ['frog', 9, 14]] },
  { name: '王座', theme: 'throne', sh: 'stairs', tr: 'bridge', pits: [[21, 4]], cracks: [[27, 13, 2]], spikes: [[29, 1]], item: 'horn',
    pick: [['wood', 20, 14], ['wood', 25, 14], ['wood', 26, 14], ['wood', 28, 14], ['wood', 31, 14], ['wood', 23, 15],
      ['stone', 21, 15], ['stone', 22, 15], ['stone', 24, 15], ['stone', 26, 13], ['time', 20, 13], ['time', 25, 13], ['time', 28, 13], ['time', 31, 13]],
    mon: [['boar', 25, 14], ['boar', 31, 14], ['shield', 26, 14], ['bee', 26, 9], ['frog', 20, 14], ['frog', 28, 14]],
    tpick: [['wood', 2, 14], ['wood', 3, 14], ['stone', 4, 14], ['stone', 2, 13], ['time', 3, 13], ['time', 4, 13]],
    tmon: [['boar', 16, 14], ['shield', 17, 14], ['frog', 18, 14], ['bee', 15, 13]] }
];

var LEVELS = [];
function buildLevel(idx, cfg) {
  var g = [], r, c, k;
  for (r = 0; r < GH; r++) g.push(new Array(GW).fill(0));
  function fill(c0, r0, w, h, v) {
    for (var rr = r0; rr < r0 + h; rr++) for (var cc = c0; cc < c0 + w; cc++) if (rr >= 0 && rr < GH && cc >= 0 && cc < GW) g[rr][cc] = v;
  }
  var Wp = cfg.tr === 'rubble' ? 12 : (cfg.tr === 'stairs' ? 16 : 20);
  var Tp = cfg.sh === 'bridge' ? 5 : (cfg.sh === 'rubble' ? 3 : 11);
  fill(0, Tp, Wp, GH - Tp, 1);
  fill(Wp, 15, GW - Wp, 3, 1);
  var spikes = [], cracks = [], hooks = [];
  var ts = { role: 'treasure', kind: cfg.tr, cells: [], base: null, sign: [Wp * 40 + 20, 15 * 40 - 24] };
  var ss = { role: 'shortcut', kind: cfg.sh, cells: [], base: null, sign: [(Wp - 2) * 40 + 20, Tp * 40 - 24] };
  var chestC = 1, chestR = 14;
  // 寶區工程
  if (cfg.tr === 'rubble') {
    fill(1, 12, Wp - 2, 3, 0); fill(Wp - 1, 12, 1, 3, 0);
    for (r = 12; r <= 14; r++) ts.cells.push([Wp - 1, r]);
  } else if (cfg.tr === 'bridge') {
    fill(1, 12, Wp - 1, 3, 0); fill(5, 15, 9, 2, 0);
    for (c = 5; c <= 13; c++) { spikes.push([c, 16]); ts.cells.push([c, 15]); }
  } else {
    fill(1, 5, Wp - 2, 10, 0); fill(Wp - 1, 13, 1, 2, 0); fill(1, 7, 4, 2, 1);
    ts.base = [];
    for (k = 0; k < 4; k++) {
      var col = 8 - k, top = 13 - 2 * k;
      for (r = top; r <= 14; r++) ts.cells.push([col, r]);
      ts.base.push([col, 14]);
    }
    chestR = 6;
  }
  // 捷徑工程
  if (cfg.sh === 'bridge') {
    for (c = Wp; c <= Wp + 9; c++) ss.cells.push([c, Tp]);
    fill(Wp + 10, Tp, 6, 2, 1);
  } else if (cfg.sh === 'rubble') {
    // 平台與隧道間留 2 格缺口(可跳過), 主路才有地方掉下去
    fill(Wp + 2, Tp, 26 - Wp, 1, 1); fill(Wp + 3, 0, 25 - Wp, 1, 1);
    for (c = Wp + 6; c <= Wp + 8; c++) { ss.cells.push([c, 1]); ss.cells.push([c, 2]); }
  } else {
    fill(5, 3, 23, 2, 1);
    ss.base = [];
    for (c = 1; c <= 4; c++) {
      var tp = 9 - 2 * (c - 1);
      for (r = tp; r <= 10; r++) ss.cells.push([c, r]);
      ss.base.push([c, 10]);
    }
    ss.sign = [5 * 40 + 20, Tp * 40 - 24];
  }
  // 主路障礙
  (cfg.mounds || []).forEach(function (m) { fill(m[0], 15 - m[2], m[1], m[2], 1); });
  (cfg.pits || []).forEach(function (p) { fill(p[0], 15, p[1], 1, 0); });
  (cfg.spikes || []).forEach(function (s) { for (k = 0; k < s[1]; k++) spikes.push([s[0] + k, 14]); });
  (cfg.cracks || []).forEach(function (w) { for (k = 0; k < w[2]; k++) cracks.push([w[0], w[1] + k]); });
  if (cfg.hi) {
    var h = cfg.hi;
    for (k = 0; k < 4; k++) fill(h - 4 + k, 14 - k, 1, 1 + k, 1);
    fill(h, 10, 4, 5, 1);
    hooks.push([(h - 1) * 40 + 20, 9 * 40 + 20]);
  }
  // 物件
  var picks = [], mons = [];
  function addPick(arr, tz) {
    arr.forEach(function (p) { picks.push({ id: picks.length, kind: p[0], x: p[1] * 40 + 20, y: p[2] * 40 + 20, tz: tz }); });
  }
  function addMon(arr, tz) {
    arr.forEach(function (m) {
      var d = MDEF[m[0]], y = m[0] === 'bee' ? m[2] * 40 + 20 : (m[2] + 1) * 40 - d.h / 2;
      mons.push({ id: mons.length, type: m[0], x: m[1] * 40 + 20, y: y, tz: tz });
    });
  }
  addPick(cfg.pick, false); addPick(cfg.tpick, true);
  addMon(cfg.mon, false); addMon(cfg.tmon, true);
  var sc = cfg.sh === 'stairs' ? 0 : 1;
  return {
    idx: idx, name: cfg.name, theme: cfg.theme, base: g, spikes: spikes, cracks: cracks, hooks: hooks, picks: picks, mons: mons,
    chest: { x: chestC * 40 + 20, y: (chestR + 1) * 40 - 18, item: cfg.item },
    start: { x: sc * 40 + 20, y: (Tp) * 40 - 22 },
    goal: { x: 30 * 40 + 20, y: 15 * 40 - 40 },
    sites: [ss, ts], Wp: Wp, Tp: Tp
  };
}
for (var li = 0; li < LCFG.length; li++) LEVELS.push(buildLevel(li, LCFG[li]));

function siteSolid(site, repaired) { return site.kind === 'rubble' ? !repaired : repaired; }
// 建立目前修復狀態下的實心格表(含裂岩牆)
function makeSolid(L, rep) {
  var s = [], r, c;
  for (r = 0; r < GH; r++) s.push(L.base[r].slice());
  L.sites.forEach(function (st, i) {
    if (siteSolid(st, rep[i])) st.cells.forEach(function (q) { s[q[1]][q[0]] = 1; });
  });
  L.cracks.forEach(function (q) { s[q[1]][q[0]] = 1; });
  return s;
}
function isSol(s, c, r) {
  if (c < 0 || c >= GW) return true;
  if (r < 0 || r >= GH) return false;
  return s[r][c] === 1;
}

// ---------------------------------------------------------------- 全域狀態
var G = null, R = null, SOL = null;
var keys = { left: false, right: false, space: false };
var edge = { z: false, x: false, jump: false, jumpRel: false };

function newGame() {
  var z8 = function (v) { var a = []; for (var i = 0; i < 8; i++) a.push(typeof v === 'function' ? v() : v); return a; };
  G = {
    screen: 'guide', guidePage: 0, guideFrom: 'start', paused: false,
    stock: { wood: 0, stone: 0, time: 0, soul: 0 },
    opened: [true, false, false, false, false, false, false, false],
    rec: z8(null), repaired: z8(function () { return [false, false]; }),
    recruited: { sword: true, hunter: false, bomber: false },
    lastCls: z8(null), bag: [], slots: z8(function () { return [null, null]; }),
    accel: z8(0), up: { speed: 0, hp: 0, cd: 0 }, chestTaken: z8(false), repairVer: z8(0),
    mapSel: 0, panel: null, upRow: 0, upSel: 0, t: 0, playTime: 0,
    bump: { wood: 1, stone: 1, time: 1, soul: 1 }, flights: [],
    rp: z8(function () { return { pos: 0, cursor: 0 }; }),
    res: null, pendingRec: null, resLevel: -1, lastRun: null
  };
  R = null; SOL = null; thumbCache = {};
}

function maxHp() { return UP_HP[G.up.hp]; }
function itemCount(l, type) {
  var n = 0;
  G.slots[l].forEach(function (it) { if (it && it.type === type) n++; });
  return n;
}
// 即時入帳與回放重算共用同一個加成函式
function amountFor(l, src, base) {
  return src === 'pick' ? base + itemCount(l, 'glove') : base * (1 + itemCount(l, 'horn'));
}
function clearBonus(l) {
  return { wood: 4 * itemCount(l, 'bagWood'), stone: 3 * itemCount(l, 'bagStone'), time: 2 * itemCount(l, 'bagTime'), soul: 2 * itemCount(l, 'soulLamp') };
}
function rateOf(l, rec) {
  var tot = { wood: 0, stone: 0, time: 0, soul: 0 }, cb = clearBonus(l), out = {};
  rec.events.forEach(function (e) { tot[e.kind] += amountFor(l, e.src, e.n); });
  KINDS.forEach(function (k) {
    tot[k] += cb[k];
    out[k] = Math.round(tot[k] * 3600 / Math.max(1, rec.N) * ACCEL_MULT[G.accel[l]] * 10) / 10;
  });
  return out;
}
function totalRates() {
  var t = { wood: 0, stone: 0, time: 0, soul: 0 };
  for (var l = 0; l < 8; l++) if (G.rec[l]) { var r = rateOf(l, G.rec[l]); KINDS.forEach(function (k) { t[k] += r[k]; }); }
  KINDS.forEach(function (k) { t[k] = Math.round(t[k] * 10) / 10; });
  return t;
}

// ---------------------------------------------------------------- 物理
function boxHit(x, y, w, h) {
  var c0 = Math.floor((x - w / 2) / TS), c1 = Math.floor((x + w / 2 - 0.001) / TS);
  var r0 = Math.floor((y - h / 2) / TS), r1 = Math.floor((y + h / 2 - 0.001) / TS);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (isSol(SOL, c, r)) return true;
  return false;
}
function moveX(b, dx) {
  if (!dx) return false;
  var n = Math.ceil(Math.abs(dx) / 8), s = dx / n;
  for (var i = 0; i < n; i++) {
    b.x += s;
    if (boxHit(b.x, b.y, b.w, b.h)) {
      if (s > 0) b.x = Math.floor((b.x + b.w / 2) / TS) * TS - b.w / 2 - 0.01;
      else b.x = (Math.floor((b.x - b.w / 2) / TS) + 1) * TS + b.w / 2 + 0.01;
      return true;
    }
  }
  return false;
}
function moveY(b, dy) {
  if (!dy) return false;
  var n = Math.ceil(Math.abs(dy) / 8), s = dy / n;
  for (var i = 0; i < n; i++) {
    b.y += s;
    if (boxHit(b.x, b.y, b.w, b.h)) {
      if (s > 0) b.y = Math.floor((b.y + b.h / 2) / TS) * TS - b.h / 2 - 0.01;
      else b.y = (Math.floor((b.y - b.h / 2) / TS) + 1) * TS + b.h / 2 + 0.01;
      return true;
    }
  }
  return false;
}
function groundAhead(m, dir) {
  return isSol(SOL, Math.floor((m.x + dir * (m.w / 2 + 2)) / TS), Math.floor((m.y + m.h / 2 + 4) / TS));
}
function ovl(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}
function circleBox(cx, cy, r, m) {
  var dx = Math.max(Math.abs(cx - m.x) - m.w / 2, 0), dy = Math.max(Math.abs(cy - m.y) - m.h / 2, 0);
  return dx * dx + dy * dy <= r * r;
}
function circleCell(cx, cy, r, c, rr) {
  var dx = Math.max(Math.abs(cx - (c * TS + 20)) - 20, 0), dy = Math.max(Math.abs(cy - (rr * TS + 20)) - 20, 0);
  return dx * dx + dy * dy <= r * r;
}

// ---------------------------------------------------------------- 進關
function startRun(l, cls) {
  var L = LEVELS[l], rep = G.repaired[l];
  G.lastCls[l] = cls;
  SOL = makeSolid(L, rep);
  var hp = maxHp();
  R = {
    l: l, cls: cls, L: L, rep: rep.slice(), frame: 0, state: 'run', atkId: 0,
    p: { x: L.start.x, y: L.start.y, w: 28, h: 44, vx: 0, vy: 0, facing: 1, onGround: false, hp: hp, inv: 0, kb: 0, kbDir: 0, hurtT: 0,
      pose: 'idle', poseT: 0, actPose: null, actT: 0, dashT: 0, dashUsed: false, dashHit: {}, dashCr: {}, hook: null,
      atkCd: 0, skCd: 0, skDur: 1, autoCd: 0.3, coyote: 0, jumpBuf: 0, jumpT: 99 },
    mons: [], arrows: [], bombs: [], shots: [], expl: [], waves: [], poofs: [], popups: [], chainTexts: [], chains: {},
    crHp: L.cracks.map(function () { return 3; }), taken: {}, chestOpen: G.chestTaken[l], chestOpenF: null, gotItem: null, notice: null,
    frames: [], events: [], run: { wood: 0, stone: 0, time: 0, soul: 0 }, version: G.repairVer[l]
  };
  R.crSnap = R.crHp.slice();
  L.mons.forEach(function (d) {
    if (d.tz && !rep[1]) return;
    var D = MDEF[d.type];
    R.mons.push({ id: d.id, type: d.type, x: d.x, y: d.y, w: D.w, h: D.h, hp: D.hp, facing: -1, state: d.type === 'bee' ? 'fly' : (d.type === 'frog' ? 'crouch' : 'walk'),
      vx: 0, vy: 0, onGround: false, t: d.type === 'frog' ? 1.2 : 0, alive: true, hitT: 0, blockT: 0, anim: 0, fl: null, atk: null,
      sx: d.x, sy: d.y, t2: 0, cd: 1.6, aimT: 0, jt: 0 });
  });
  R.frames.push(snap());
  G.screen = 'play'; G.paused = false;
  edge.z = edge.x = edge.jump = edge.jumpRel = false;
}

function monArt(m) {
  if (m.fl) return 'flung';
  if (m.type === 'shield') return m.blockT > 0 ? 'block' : 'walk';
  if (m.type === 'frog') return m.state === 'jump' ? 'jump' : 'crouch';
  return m.state;
}
function snap() {
  var p = R.p;
  return {
    p: { x: p.x, y: p.y, cls: R.cls, facing: p.facing, pose: p.pose, poseT: p.poseT, inv: p.inv > 0, hook: p.hook ? { x: p.hook.x, y: p.hook.y } : null },
    m: R.mons.filter(function (m) { return m.alive; }).map(function (m) { return { type: m.type, x: m.x, y: m.y, facing: m.facing, state: monArt(m), hit: m.hitT > 0, t: m.anim }; }),
    a: R.arrows.map(function (a) { return { x: a.x, y: a.y, ang: a.ang }; }),
    b: R.bombs.map(function (b) { return { x: b.x, y: b.y, t: b.t }; }),
    s: R.shots.map(function (s) { return { x: s.x, y: s.y }; }),
    ex: R.expl.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    wv: R.waves.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    po: R.poofs.map(function (e) { return { x: e.x, y: e.y, t: e.t }; }),
    cr: R.crSnap, chest: R.chestOpen
  };
}

// ---------------------------------------------------------------- 傷害與掉落
function gain(kind, base, src, x, y, dy) {
  var amt = amountFor(R.l, src, base);
  R.run[kind] += amt;
  R.events.push({ f: R.frame, x: x, y: y, kind: kind, n: base, src: src });
  if (dy === undefined) dy = 0;
  R.popups.push({ x: x, y: y - 20 + (dy || 0), t: 0, kind: kind, value: Math.max(1, Math.min(20, amt)) });
}
function addPoof(x, y) { R.poofs.push({ x: x, y: y, t: 0 }); }
function killMon(m) {
  m.alive = false; addPoof(m.x, m.y);
  MDEF[m.type].drops.forEach(function (d, i) { gain(d[0], d[1], 'kill', m.x, m.y, i * 18); });
  if (m.atk != null) {
    var ch = R.chains[m.atk] || (R.chains[m.atk] = { n: 0 });
    ch.n++;
    if (ch.n >= 2) {
      var ct = ch.text;
      if (!ct) { ct = ch.text = { x: m.x, y: m.y - 20, t: 0, n: ch.n }; R.chainTexts.push(ct); }
      ct.n = Math.min(20, ch.n); ct.x = m.x; ct.y = m.y - 20; ct.t = 0;
    }
  }
  R.p.skKill = true;
}
// src: {kind, fx(來源x), cy(判定中心y), atk}
function dmgMon(m, dmg, src) {
  if (!m.alive) return false;
  if (m.type === 'shield' && src.blockable) {
    if ((src.fx - m.x) * m.facing > 0 && src.cy >= m.y - m.h / 2) { m.blockT = 0.2; m.hitT = 0.1; return false; }
  }
  m.atk = src.atk;
  m.hp -= dmg; m.hitT = 0.1;
  if (m.hp <= 0) { killMon(m); if (src.kind === 'dash') R.p.skCd = 0; }
  return true;
}
function flingMon(m, dir, atk) {
  m.fl = { dir: dir, t: 0.6, hit: {} }; m.atk = atk; m.vx = 0; m.vy = 0;
  if (m.state === 'aim') m.state = 'fly';
}
function endFling(m) {
  m.fl = null; m.vx = 0; m.vy = 0;
  if (m.type === 'bee') { m.state = 'fly'; m.sx = m.x; m.sy = m.y; m.t2 = 0; }
  else if (m.type === 'frog') { m.state = 'crouch'; m.t = 0.6; }
  else { m.state = 'walk'; m.t = 0; }
}
function hitCrack(i, n) {
  if (R.crHp[i] <= 0) return;
  R.crHp[i] = n >= 3 ? 0 : R.crHp[i] - n;
  var q = R.L.cracks[i];
  if (R.crHp[i] <= 0) { SOL[q[1]][q[0]] = 0; addPoof(q[0] * TS + 20, q[1] * TS + 20); }
  R.crSnap = R.crHp.slice();
}
function hurtPlayer(fromX) {
  var p = R.p;
  if (p.inv > 0 || p.dashT > 0) return;
  p.hp -= 1; p.inv = 1; p.kb = 0.15; p.kbDir = (p.x - fromX) >= 0 ? 1 : -1; p.hurtT = 0.25;
  p.hook = null;
}
function boom(x, y, atk) {
  R.expl.push({ x: x, y: y, t: 0 });
  R.mons.forEach(function (m) { if (m.alive && circleBox(x, y, 60, m)) dmgMon(m, 2, { kind: 'bomb', fx: x, cy: y, atk: atk }); });
  R.L.cracks.forEach(function (q, i) { if (R.crHp[i] > 0 && circleCell(x, y, 60, q[0], q[1])) hitCrack(i, 3); });
}

// ---------------------------------------------------------------- 玩家
function stepPlayer() {
  var p = R.p, cls = R.cls, spd = CLS[cls].speed * UP_SPEED[G.up.speed], cdm = UP_CD[G.up.cd];
  var f;
  p.atkCd = Math.max(0, p.atkCd - DT); p.skCd = Math.max(0, p.skCd - DT);
  p.inv = Math.max(0, p.inv - DT); p.hurtT = Math.max(0, p.hurtT - DT);
  if (p.actT > 0) { p.actT -= DT; if (p.actT <= 0) p.actPose = null; }
  p.jumpT += DT;
  if (edge.jump) p.jumpBuf = 0.1; else p.jumpBuf = Math.max(0, p.jumpBuf - DT);
  p.coyote = p.onGround ? 0.08 : Math.max(0, p.coyote - DT);
  p.skKill = false;

  // 動作輸入
  if (edge.z) doAttack();
  if (edge.x) doSkill(cdm);

  var dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (p.hook) {
    var dx = p.hook.x - p.x, dy = p.hook.y - p.y, d = Math.hypot(dx, dy), st = 700 * DT;
    if (d <= st + 6) { p.hook = null; p.vy = -500; p.vx = 0; }
    else {
      var bx = p.x, by = p.y;
      var hx = moveX(p, dx / d * st), hy = moveY(p, dy / d * st);
      if ((hx || hy) && Math.hypot(p.x - bx, p.y - by) < st * 0.2) { p.hook = null; p.vy = -200; }
    }
    p.onGround = false;
  } else if (p.dashT > 0) {
    p.dashT -= DT;
    var hit = moveX(p, p.facing * (160 / 0.18) * DT);
    p.vy = 0;
    R.mons.forEach(function (m) {
      if (m.alive && !p.dashHit[m.id] && ovl(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)) {
        p.dashHit[m.id] = 1; dmgMon(m, 2, { kind: 'dash', fx: p.x, cy: p.y, atk: p.atk, blockable: true });
      }
    });
    R.L.cracks.forEach(function (q, i) {
      if (R.crHp[i] > 0 && !p.dashCr[i] && ovl(p.x, p.y, p.w + 4, p.h, q[0] * TS + 20, q[1] * TS + 20, 40, 40)) { p.dashCr[i] = 1; hitCrack(i, 1); }
    });
    if (hit) p.dashT = 0;
    if (p.dashT <= 0) { p.dashT = 0; p.actPose = null; p.actT = 0; }
    p.onGround = false;
  } else {
    // 水平
    if (p.kb > 0) { p.kb -= DT; moveX(p, p.kbDir * (80 / 0.15) * DT); }
    else {
      p.vx = dir * spd;
      if (dir !== 0) p.facing = dir;
      moveX(p, p.vx * DT);
    }
    // 跳躍
    if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -JUMP_V; p.jumpT = 0; p.jumpBuf = 0; p.coyote = 0; p.onGround = false; }
    if (edge.jumpRel && p.jumpT < 0.15 && p.vy < -JUMP_V / 2) p.vy = -JUMP_V / 2;
    p.vy = Math.min(p.vy + GRAV * DT, 1500);
    var hd = false;
    if (moveY(p, p.vy * DT)) { if (p.vy > 0) hd = true; p.vy = 0; }
    p.onGround = hd;
    if (hd) p.dashUsed = false;
  }
  p.x = Math.max(p.w / 2, Math.min(W - p.w / 2, p.x));

  // 獵人自動射擊
  if (cls === 'hunter') {
    p.autoCd -= DT;
    if (p.autoCd <= 0) {
      var best = null, bd = 261;
      R.mons.forEach(function (m) { if (m.alive) { var d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } } });
      if (best) { p.autoCd = 0.6; fireArrow(Math.atan2(best.y - p.y, best.x - p.x), 500, ++R.atkId); }
      else p.autoCd = 0;
    }
  }
  // 姿勢
  var pose;
  if (p.hurtT > 0) pose = 'hurt';
  else if (p.actT > 0 && p.actPose) pose = p.actPose;
  else if (p.hook) pose = 'hook';
  else if (p.dashT > 0) pose = 'dash';
  else if (!p.onGround) pose = p.vy < 0 ? 'rise' : 'fall';
  else pose = Math.abs(p.vx) > 1 && p.kb <= 0 ? 'run' : 'idle';
  if (pose !== p.pose) { p.pose = pose; p.poseT = 0; } else p.poseT += DT;
  var cdDur = cls === 'sword' ? 1.2 : (cls === 'hunter' ? 0.5 : 1.5);
  p.skDur = cdDur * cdm;
}
function fireArrow(ang, range, atk) {
  var p = R.p;
  R.arrows.push({ x: p.x, y: p.y, ox: p.x, vx: Math.cos(ang) * 700, vy: Math.sin(ang) * 700, ang: ang, dist: 0, max: range, atk: atk });
}
function setAct(name, t) { R.p.actPose = name; R.p.actT = t; }
function doAttack() {
  var p = R.p, f = p.facing;
  if (p.dashT > 0 || p.hook) return;
  if (R.cls === 'sword') {
    if (p.atkCd > 0) return;
    p.atkCd = 0.3; setAct('slash', 0.15);
    var x0 = f > 0 ? p.x + 14 : p.x - 14 - 50, y0 = p.y - 20, atk = ++R.atkId, cx = x0 + 25;
    R.mons.forEach(function (m) {
      if (m.alive && ovl(cx, p.y, 50, 40, m.x, m.y, m.w, m.h)) dmgMon(m, 1, { kind: 'slash', fx: p.x, cy: p.y, atk: atk, blockable: true });
    });
    R.L.cracks.forEach(function (q, i) {
      if (R.crHp[i] > 0 && ovl(cx, p.y, 50, 40, q[0] * TS + 20, q[1] * TS + 20, 40, 40)) hitCrack(i, 1);
    });
  } else if (R.cls === 'hunter') {
    if (p.atkCd > 0) return;
    p.atkCd = 0.4; setAct('shoot', 0.15);
    fireArrow(f > 0 ? 0 : Math.PI, 600, ++R.atkId);
  } else {
    if (p.atkCd > 0) return;
    p.atkCd = 0.6; setAct('throw', 0.2);
    R.bombs.push({ x: p.x + f * 14, y: p.y - 8, vx: f * 300, vy: -500, t: 0, atk: ++R.atkId });
  }
}
function doSkill(cdm) {
  var p = R.p, f = p.facing;
  if (p.skCd > 0 || p.hook) return;
  if (R.cls === 'sword') {
    if (p.dashT > 0 || p.dashUsed) return;
    p.dashUsed = true; p.dashT = 0.18; p.dashHit = {}; p.dashCr = {}; p.atk = ++R.atkId; p.skCd = 1.2 * cdm;
  } else if (R.cls === 'hunter') {
    var best = null, bd = 220.01;
    R.L.hooks.forEach(function (h) { var d = Math.hypot(h[0] - p.x, h[1] - p.y); if (d < bd) { bd = d; best = h; } });
    if (!best) return;
    p.hook = { x: best[0], y: best[1] }; p.skCd = 0.5 * cdm; p.vy = 0;
  } else {
    p.skCd = 1.5 * cdm; setAct('wave', 0.3);
    var atk = ++R.atkId;
    R.waves.push({ x: p.x, y: p.y, t: 0 });
    R.mons.forEach(function (m) {
      if (m.alive && circleBox(p.x, p.y, 130, m)) {
        var dir = (m.x - p.x) > 0 ? 1 : ((m.x - p.x) < 0 ? -1 : f);
        var alive = dmgMon(m, 1, { kind: 'shock', fx: p.x, cy: p.y, atk: atk });
        if (alive && m.alive) flingMon(m, dir, atk);
      }
    });
    R.L.cracks.forEach(function (q, i) { if (R.crHp[i] > 0 && circleCell(p.x, p.y, 130, q[0], q[1])) hitCrack(i, 3); });
  }
}

// ---------------------------------------------------------------- 怪物
function stepFling(m) {
  var fl = m.fl;
  var hit = moveX(m, fl.dir * 460 * DT);
  R.mons.forEach(function (o) {
    if (o === m || !o.alive || o.fl || fl.hit[o.id]) return;
    if (ovl(m.x, m.y, m.w, m.h, o.x, o.y, o.w, o.h)) {
      fl.hit[o.id] = 1;
      dmgMon(o, 2, { kind: 'fling', fx: m.x, cy: m.y, atk: m.atk });
      if (o.alive) flingMon(o, fl.dir, m.atk);
    }
  });
  fl.t -= DT;
  if (hit && m.alive) { dmgMon(m, 1, { kind: 'fling', fx: m.x, cy: m.y, atk: m.atk }); if (m.alive) endFling(m); return; }
  if (fl.t <= 0 && m.alive) endFling(m);
}
var FROG_V0 = Math.sqrt(2 * GRAV * 80), FROG_VX = 120 / (2 * FROG_V0 / GRAV);
function stepMon(m) {
  var p = R.p;
  m.hitT = Math.max(0, m.hitT - DT); m.blockT = Math.max(0, m.blockT - DT); m.anim += DT;
  if (m.fl) { stepFling(m); return; }
  if (m.type === 'bee') { stepBee(m); return; }
  m.vy = Math.min(m.vy + GRAV * DT, 1500);
  var hd = false;
  if (moveY(m, m.vy * DT)) { if (m.vy > 0) hd = true; m.vy = 0; }
  m.onGround = hd;
  var dx = p.x - m.x, dy = p.y - m.y;
  if (m.type === 'boar') {
    if (m.state === 'walk') {
      if (m.onGround && !groundAhead(m, m.facing)) m.facing *= -1;
      if (moveX(m, 80 * m.facing * DT)) m.facing *= -1;
      if (m.onGround && Math.abs(dy) <= 40 && dx * m.facing > 0 && Math.abs(dx) <= 240) { m.state = 'windup'; m.t = 0.5; }
    } else if (m.state === 'windup') {
      m.t -= DT; if (m.t <= 0) m.state = 'charge';
    } else if (m.state === 'charge') {
      var h = moveX(m, 420 * m.facing * DT);
      if (h || (m.onGround && !groundAhead(m, m.facing))) { m.state = 'stun'; m.t = 1; }
    } else {
      m.t -= DT; if (m.t <= 0) m.state = 'walk';
    }
  } else if (m.type === 'shield') {
    if (Math.abs(dx) <= 400 && Math.abs(dy) <= 120) {
      m.facing = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) > 8 && (!m.onGround || groundAhead(m, m.facing))) moveX(m, 40 * m.facing * DT);
    } else {
      if (m.onGround && !groundAhead(m, m.facing)) m.facing *= -1;
      if (moveX(m, 40 * m.facing * DT)) m.facing *= -1;
    }
  } else if (m.type === 'frog') {
    if (m.state === 'crouch') {
      if (m.onGround) { m.t -= DT; if (m.t <= 0) frogJump(m); }
    } else {
      m.jt += DT;
      if (moveX(m, m.vx * DT)) m.vx = 0;
      if (hd && m.jt > 0.1) { m.state = 'crouch'; m.t = 1.2; m.vx = 0; }
    }
  }
}
function frogJump(m) {
  var p = R.p, dir = m.facing;
  if (Math.hypot(p.x - m.x, p.y - m.y) <= 300) dir = (p.x - m.x) >= 0 ? 1 : -1;
  var lx = m.x + dir * 120, col = Math.floor(lx / TS), r0 = Math.floor((m.y + m.h / 2) / TS), ground = false, k;
  for (k = 0; k <= 6; k++) if (isSol(SOL, col, r0 + k)) { ground = true; break; }
  if (!ground || isSol(SOL, col, Math.floor(m.y / TS))) dir = -dir;
  m.facing = dir; m.state = 'jump'; m.vy = -FROG_V0; m.vx = dir * FROG_VX; m.jt = 0; m.onGround = false;
}
function stepBee(m) {
  var p = R.p;
  m.t2 += DT;
  var inRange = Math.hypot(p.x - m.x, p.y - m.y) <= 400;
  if (m.state === 'aim') {
    m.facing = p.x >= m.x ? 1 : -1;
    m.aimT -= DT;
    if (m.aimT <= 0) {
      var dx = p.x - m.x, dy = p.y - m.y, d = Math.max(1, Math.hypot(dx, dy));
      R.shots.push({ x: m.x, y: m.y, vx: dx / d * 220, vy: dy / d * 220, life: 4 });
      m.state = 'fly'; m.cd = 1.6;
    }
  } else {
    if (moveX(m, 60 * m.facing * DT)) m.facing *= -1;
    if (m.x - m.sx >= 120) m.facing = -1; else if (m.x - m.sx <= -120) m.facing = 1;
    if (inRange) { m.cd -= DT; if (m.cd <= 0) { m.state = 'aim'; m.aimT = 0.4; } }
  }
  m.y = m.sy + 16 * Math.sin(Math.PI * m.t2);
}

// ---------------------------------------------------------------- 飛行物
function stepProj() {
  var i, a, m, k;
  for (i = R.arrows.length - 1; i >= 0; i--) {
    a = R.arrows[i];
    var sx = a.vx * DT, sy = a.vy * DT, steps = Math.ceil(Math.hypot(sx, sy) / 8), dead = false;
    for (k = 0; k < steps && !dead; k++) {
      a.x += sx / steps; a.y += sy / steps;
      var c = Math.floor(a.x / TS), r = Math.floor(a.y / TS);
      if (a.x < 0 || a.x > W || a.y < -40 || a.y > H + 40) { dead = true; break; }
      if (isSol(SOL, c, r)) {
        R.L.cracks.forEach(function (q, ci) { if (q[0] === c && q[1] === r && R.crHp[ci] > 0) hitCrack(ci, 1); });
        dead = true; break;
      }
      for (var j = 0; j < R.mons.length; j++) {
        m = R.mons[j];
        if (m.alive && Math.abs(a.x - m.x) <= m.w / 2 + 3 && Math.abs(a.y - m.y) <= m.h / 2 + 3) {
          dmgMon(m, 1, { kind: 'arrow', fx: a.ox, cy: a.y, atk: a.atk, blockable: true });
          dead = true; break;
        }
      }
    }
    a.dist += Math.hypot(sx, sy);
    if (dead || a.dist >= a.max) R.arrows.splice(i, 1);
  }
  for (i = R.bombs.length - 1; i >= 0; i--) {
    var b = R.bombs[i];
    b.t += DT; b.vy += GRAV * DT;
    var bn = Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * DT / 6), ex = false;
    for (k = 0; k < bn && !ex; k++) {
      b.x += b.vx * DT / bn; b.y += b.vy * DT / bn;
      if (isSol(SOL, Math.floor(b.x / TS), Math.floor(b.y / TS)) || b.x < 0 || b.x > W) { ex = true; break; }
      for (var q = 0; q < R.mons.length; q++) {
        m = R.mons[q];
        if (m.alive && ovl(b.x, b.y, 12, 12, m.x, m.y, m.w, m.h)) { ex = true; break; }
      }
    }
    if (b.y > H + 100) { R.bombs.splice(i, 1); continue; }
    if (ex) { boom(b.x, b.y, b.atk); R.bombs.splice(i, 1); }
  }
  for (i = R.shots.length - 1; i >= 0; i--) {
    var s = R.shots[i];
    s.x += s.vx * DT; s.y += s.vy * DT; s.life -= DT;
    if (s.life <= 0 || isSol(SOL, Math.floor(s.x / TS), Math.floor(s.y / TS)) || s.x < 0 || s.x > W || s.y > H + 40) { R.shots.splice(i, 1); continue; }
    if (ovl(s.x, s.y, 12, 12, R.p.x, R.p.y, R.p.w, R.p.h)) { hurtPlayer(s.x); R.shots.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- 每步更新
function failRun() { R.state = 'fail'; G.screen = 'fail'; }
function stepRun() {
  if (R.state !== 'run') return;
  var p = R.p, i;
  R.frame++;
  stepPlayer();
  R.mons.forEach(stepMon);
  // 新擊倒: 衝刺斬擊倒 → 冷卻歸零
  if (p.skKill && R.cls === 'sword' && p.dashT > 0) p.skCd = 0;
  stepProj();
  R.mons.forEach(function (m) {
    if (m.alive && !m.fl && ovl(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)) hurtPlayer(m.x);
  });
  // 素材與寶箱
  R.L.picks.forEach(function (d) {
    if (R.taken[d.id] !== undefined || (d.tz && !R.rep[1])) return;
    if (ovl(p.x, p.y, p.w, p.h, d.x, d.y, 24, 24)) { R.taken[d.id] = R.frame; gain(d.kind, 1, 'pick', d.x, d.y); }
  });
  var ch = R.L.chest;
  if (R.rep[1] && !R.chestOpen && ovl(p.x, p.y, p.w, p.h, ch.x, ch.y, 40, 36)) {
    R.chestOpen = true; R.chestOpenF = R.frame; R.gotItem = ch.item; R.notice = { type: ch.item, t: 0 };
  }
  // 計時用特效
  [['popups', 0.8], ['chainTexts', 0.8], ['poofs', 0.3], ['expl', 0.25], ['waves', 0.3]].forEach(function (z) {
    var arr = R[z[0]];
    for (var j = arr.length - 1; j >= 0; j--) { arr[j].t += DT; if (arr[j].t >= z[1]) arr.splice(j, 1); }
  });
  if (R.notice) { R.notice.t += DT; if (R.notice.t >= 1.5) R.notice = null; }
  R.frames.push(snap());
  // 失敗判定
  if (p.hp <= 0 || p.y - p.h / 2 > H + 20) { failRun(); return; }
  for (i = 0; i < R.L.spikes.length; i++) {
    var sp = R.L.spikes[i];
    if (ovl(p.x, p.y, p.w, p.h, sp[0] * TS + 20, sp[1] * TS + 30, 40, 20)) { failRun(); return; }
  }
  var g = R.L.goal;
  if (ovl(p.x, p.y, p.w, p.h, g.x, g.y, 40, 80)) winRun();
}

// ---------------------------------------------------------------- 過關結算
function addStock(kind, n) { G.stock[kind] += n; G.bump[kind] = 0; }
function winRun() {
  R.state = 'won';
  var l = R.l, g = R.L.goal, N = R.frame;
  var rec = { frames: R.frames, events: R.events, N: N, cls: R.cls, version: R.version, chestEver: R.chestOpenF !== null, goal: { x: g.x, y: g.y }, pickF: R.taken };
  var cb = clearBonus(l), run = R.run;
  KINDS.forEach(function (k) { run[k] += cb[k]; addStock(k, run[k]); });
  if (R.gotItem) { G.bag.push({ type: R.gotItem, where: null }); G.chestTaken[l] = true; }
  var old = G.rec[l];
  G.res = { time: Math.round(N / 60 * 10) / 10, run: { wood: run.wood, stone: run.stone, time: run.time, soul: run.soul }, rates: rateOf(l, rec), cls: R.cls,
    item: R.gotItem, oldTime: null, oldRates: null, oldCls: null };
  if (!old) { G.rec[l] = rec; G.rp[l] = { pos: 0, cursor: 0 }; G.pendingRec = null; }
  else {
    G.pendingRec = rec;
    G.res.oldTime = Math.round(old.N / 60 * 10) / 10; G.res.oldRates = rateOf(l, old); G.res.oldCls = old.cls;
  }
  G.resLevel = l;
  G.screen = 'result';
}

// ---------------------------------------------------------------- 回放
function thumbPos(l, x, y) { return [CARD_POS[l][0] + 8 + x * 0.125, CARD_POS[l][1] + 8 + y * 0.125]; }
var ICON_X = { wood: 36, stone: 206, time: 376, soul: 546 };
function flyMode() { return G.screen === 'map' && !G.paused; }
function spawnGain(l, kind, amt, x, y) {
  if (amt <= 0) return;
  if (!flyMode()) { addStock(kind, amt); return; }
  var tp = thumbPos(l, x, y), n = Math.min(5, amt);
  for (var i = 0; i < n; i++) {
    G.flights.push({ x0: tp[0] + (Math.random() * 12 - 6), y0: tp[1] + (Math.random() * 12 - 6), kind: kind, t: 0, n: i === n - 1 ? amt - (n - 1) : 1 });
  }
}
function advanceReplays(dt) {
  for (var l = 0; l < 8; l++) {
    var rec = G.rec[l];
    if (!rec) continue;
    var rp = G.rp[l];
    rp.pos += dt * 60 * ACCEL_MULT[G.accel[l]];
    for (var guard = 0; guard < 4; guard++) {
      var fl = Math.floor(rp.pos);
      while (rp.cursor < rec.events.length && rec.events[rp.cursor].f <= Math.min(fl, rec.N)) {
        var ev = rec.events[rp.cursor++];
        spawnGain(l, ev.kind, amountFor(l, ev.src, ev.n), ev.x, ev.y);
      }
      if (fl >= rec.N) {
        var cb = clearBonus(l);
        KINDS.forEach(function (k) { spawnGain(l, k, cb[k], rec.goal.x, rec.goal.y); });
        rp.pos -= rec.N; rp.cursor = 0;
      } else break;
    }
  }
}
function updateFlights(dt) {
  if (G.flights.length && !flyMode()) {
    G.flights.forEach(function (f) { addStock(f.kind, f.n); });
    G.flights = [];
    return;
  }
  for (var i = G.flights.length - 1; i >= 0; i--) {
    var f = G.flights[i];
    f.t += dt;
    if (f.t >= 0.7) { addStock(f.kind, f.n); G.flights.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- 選單邏輯
function levelState(l) {
  if (G.rec[l]) return 'cleared';
  if (G.opened[l]) return 'open';
  return PARENTS[l].some(function (p) { return !!G.rec[p]; }) ? 'buyable' : 'sealed';
}
function canPay(cost) { return KINDS.every(function (k) { return !cost[k] || G.stock[k] >= cost[k]; }); }
function pay(cost) { KINDS.forEach(function (k) { if (cost[k]) G.stock[k] -= cost[k]; }); }
function recruitCost() { return { wood: RECRUIT_COST, stone: 0, time: 0, soul: 0 }; }
function statCost(i) {
  var lv = [G.up.speed, G.up.hp, G.up.cd][i], arr = [SPEED_COST, HP_COST, CD_COST][i];
  return lv >= arr.length ? null : { wood: 0, stone: 0, time: 0, soul: arr[lv] };
}
function anyAffordable() {
  var ok = false;
  ['hunter', 'bomber'].forEach(function (c) { if (!G.recruited[c] && canPay(recruitCost())) ok = true; });
  for (var i = 0; i < 3; i++) { var c = statCost(i); if (c && canPay(c)) ok = true; }
  return ok;
}
var MAP_COLS = [[0, 8], [1, 2], [3, 4, 5, 6], [7], [9]];
function cardCY(i) { return i < 8 ? CARD_POS[i][1] + 68 : (i === 8 ? WORK_POS[1] + 68 : GOAL_POS[1] + 68); }
function mapMove(dx, dy) {
  var s = G.mapSel, ci = 0, i;
  MAP_COLS.forEach(function (col, k) { if (col.indexOf(s) >= 0) ci = k; });
  if (dy) {
    var col = MAP_COLS[ci], idx = col.indexOf(s) + dy;
    if (idx >= 0 && idx < col.length) G.mapSel = col[idx];
  } else {
    var nc = ci + dx;
    if (nc < 0 || nc >= MAP_COLS.length) return;
    var best = MAP_COLS[nc][0], bd = 1e9;
    for (i = 0; i < MAP_COLS[nc].length; i++) {
      var d = Math.abs(cardCY(MAP_COLS[nc][i]) - cardCY(s));
      if (d < bd) { bd = d; best = MAP_COLS[nc][i]; }
    }
    G.mapSel = best;
  }
}
function openPanel(l) {
  var ci = CLS_LIST.indexOf(G.lastCls[l]);
  G.panel = { l: l, row: 0, clsSel: ci < 0 ? 0 : ci, siteSel: 0, slotSel: 0 };
  G.screen = 'levelPanel';
}
function cycleItem(l, s) {
  if (!G.bag.length) return;
  var cur = G.slots[l][s], idx = cur ? G.bag.indexOf(cur) : -1, nx = idx + 1, it = null;
  if (nx < G.bag.length) it = G.bag[nx];
  if (cur) cur.where = null;
  G.slots[l][s] = null;
  if (it) {
    if (it.where) G.slots[it.where.level][it.where.slot] = null;
    G.slots[l][s] = it; it.where = { level: l, slot: s };
  }
}
function mapZ() {
  var s = G.mapSel;
  if (s < 8) {
    var st = levelState(s);
    if (st === 'buyable') {
      if (G.stock.wood >= UNLOCK_COST[s]) { G.stock.wood -= UNLOCK_COST[s]; G.opened[s] = true; }
    } else if (st === 'open' || st === 'cleared') openPanel(s);
  } else if (s === 8) { G.screen = 'upgrade'; G.upRow = 0; G.upSel = 0; }
  else if (canPay(GOAL_COST)) { pay(GOAL_COST); G.finalTime = G.playTime; G.screen = 'ending'; }
}
function panelKey(code) {
  var P = G.panel, l = P.l;
  if (code === 'ArrowUp') P.row = Math.max(0, P.row - 1);
  else if (code === 'ArrowDown') P.row = Math.min(3, P.row + 1);
  else if (code === 'ArrowLeft' || code === 'ArrowRight') {
    var d = code === 'ArrowLeft' ? -1 : 1;
    if (P.row === 0) P.clsSel = Math.max(0, Math.min(2, P.clsSel + d));
    else if (P.row === 1) P.siteSel = Math.max(0, Math.min(1, P.siteSel + d));
    else if (P.row === 2) P.slotSel = Math.max(0, Math.min(1, P.slotSel + d));
  } else if (code === 'KeyX') { G.panel = null; G.screen = 'map'; }
  else if (code === 'KeyZ') {
    if (P.row === 0) { var c = CLS_LIST[P.clsSel]; if (G.recruited[c]) { G.panel = null; startRun(l, c); } }
    else if (P.row === 1) {
      var i = P.siteSel, cost = REPAIR_COST[l][i];
      if (!G.repaired[l][i] && G.stock.stone >= cost) { G.stock.stone -= cost; G.repaired[l][i] = true; G.repairVer[l]++; }
    } else if (P.row === 2) cycleItem(l, P.slotSel);
    else if (G.accel[l] < 2 && G.stock.time >= ACCEL_COST[G.accel[l]]) { G.stock.time -= ACCEL_COST[G.accel[l]]; G.accel[l]++; }
  }
}
function upgradeKey(code) {
  if (code === 'ArrowUp') G.upRow = Math.max(0, G.upRow - 1);
  else if (code === 'ArrowDown') G.upRow = Math.min(3, G.upRow + 1);
  else if (code === 'ArrowLeft' && G.upRow === 0) G.upSel = 0;
  else if (code === 'ArrowRight' && G.upRow === 0) G.upSel = 1;
  else if (code === 'KeyX') G.screen = 'map';
  else if (code === 'KeyZ') {
    if (G.upRow === 0) {
      var c = G.upSel === 0 ? 'hunter' : 'bomber';
      if (!G.recruited[c] && G.stock.wood >= RECRUIT_COST) { G.stock.wood -= RECRUIT_COST; G.recruited[c] = true; }
    } else {
      var k = G.upRow - 1, cost = statCost(k);
      if (cost && canPay(cost)) { pay(cost); var key = ['speed', 'hp', 'cd'][k]; G.up[key]++; }
    }
  }
}

// ---------------------------------------------------------------- 輸入
function toMap() { R = null; SOL = null; G.panel = null; G.screen = 'map'; G.paused = false; keys.left = keys.right = keys.space = false; }
function inputDown(code) {
  var sc = G.screen;
  if (sc === 'guide') {
    if (code === 'ArrowLeft') G.guidePage = Math.max(0, G.guidePage - 1);
    else if (code === 'ArrowRight') G.guidePage = Math.min(GUIDE_PAGES - 1, G.guidePage + 1);
    else if (code === 'KeyZ') { if (G.guidePage < GUIDE_PAGES - 1) G.guidePage++; else G.screen = 'map'; }
    return;
  }
  if (sc === 'ending') { if (code === 'KeyZ') newGame(); return; }
  if (code === 'Escape' && (sc === 'play' || sc === 'map' || sc === 'levelPanel' || sc === 'upgrade')) {
    G.paused = !G.paused; keys.left = keys.right = keys.space = false; edge.z = edge.x = edge.jump = edge.jumpRel = false;
    return;
  }
  if (G.paused) {
    if (sc === 'play') {
      if (code === 'KeyZ') startRun(R.l, R.cls);
      else if (code === 'KeyX') toMap();
    }
    return;
  }
  if (sc === 'map') {
    if (code === 'ArrowLeft') mapMove(-1, 0);
    else if (code === 'ArrowRight') mapMove(1, 0);
    else if (code === 'ArrowUp') mapMove(0, -1);
    else if (code === 'ArrowDown') mapMove(0, 1);
    else if (code === 'KeyZ') mapZ();
    else if (code === 'Space') { G.screen = 'guide'; G.guidePage = 0; G.guideFrom = 'map'; }
  } else if (sc === 'levelPanel') panelKey(code);
  else if (sc === 'upgrade') upgradeKey(code);
  else if (sc === 'play') {
    if (code === 'ArrowLeft') keys.left = true;
    else if (code === 'ArrowRight') keys.right = true;
    else if (code === 'Space') { keys.space = true; edge.jump = true; }
    else if (code === 'KeyZ') edge.z = true;
    else if (code === 'KeyX') edge.x = true;
  } else if (sc === 'result') {
    if (code === 'KeyZ') {
      if (G.pendingRec) { G.rec[G.resLevel] = G.pendingRec; G.rp[G.resLevel] = { pos: 0, cursor: 0 }; G.pendingRec = null; }
      toMap();
    } else if (code === 'KeyX' && G.pendingRec) { G.pendingRec = null; toMap(); }
  } else if (sc === 'fail') {
    if (code === 'KeyZ') startRun(R.l, R.cls);
    else if (code === 'KeyX') toMap();
  }
}
function inputUp(code) {
  if (code === 'ArrowLeft') keys.left = false;
  else if (code === 'ArrowRight') keys.right = false;
  else if (code === 'Space') { if (keys.space) edge.jumpRel = true; keys.space = false; }
}
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, Escape: 1 };
function onKeyDown(e) {
  if (GAME_KEYS[e.code]) e.preventDefault();
  if (e.repeat) return;
  if (!GAME_KEYS[e.code]) return;
  inputDown(e.code);
}
function onKeyUp(e) {
  if (GAME_KEYS[e.code]) e.preventDefault();
  inputUp(e.code);
}

// ---------------------------------------------------------------- 繪製: 關卡場景
var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
function txt(c, s, x, y, size, color, align) {
  c.save(); c.font = 'bold ' + size + 'px ' + FONT; c.fillStyle = color || '#fff'; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.8)'; c.shadowBlur = 4;
  c.fillText(s, x, y); c.restore();
}
function drawStaticLayer(c, L, rep, solid) {
  var r, cc;
  Art.drawBackground(c, {});
  for (r = 0; r < GH; r++) for (cc = 0; cc < GW; cc++) {
    if (L.base[r][cc] === 1) Art.drawGround(c, { x: cc * TS + 20, y: r * TS + 20, top: !isSol(solid, cc, r - 1) || (r === 0), theme: L.theme });
  }
  L.spikes.forEach(function (q) { Art.drawSpike(c, { x: q[0] * TS + 20, y: q[1] * TS + 20 }); });
  L.sites.forEach(function (st, i) {
    var rp = rep[i], list = null;
    if (st.kind === 'bridge') list = st.cells;
    else if (st.kind === 'stairs') list = rp ? st.cells : st.base;
    else list = rp ? null : st.cells;
    if (list) list.forEach(function (q) { Art.drawWorksite(c, { x: q[0] * TS + 20, y: q[1] * TS + 20, kind: st.kind, repaired: rp, theme: L.theme }); });
  });
  L.hooks.forEach(function (h) { Art.drawHookRing(c, { x: h[0], y: h[1] }); });
}
// o: {rep, mode:'live'|'preview'|'thumb', taken(id), chestOpen, t}
function drawDynLayer(c, L, S, o) {
  var rep = o.rep, i;
  var crHp = S ? S.cr : L.cracks.map(function () { return 3; });
  L.cracks.forEach(function (q, k) {
    if (crHp[k] > 0) Art.drawCrackWall(c, { x: q[0] * TS + 20, y: q[1] * TS + 20, hp: crHp[k] });
  });
  if (o.mode !== 'thumb') {
    L.sites.forEach(function (st, k) { if (!rep[k]) Art.drawSiteSign(c, { x: st.sign[0], y: st.sign[1], role: st.role }); });
  }
  L.picks.forEach(function (d) {
    if ((d.tz && !rep[1]) || o.taken(d.id)) return;
    Art.drawPickup(c, { x: d.x, y: d.y, kind: d.kind, t: o.t });
  });
  if (rep[1]) Art.drawChest(c, { x: L.chest.x, y: L.chest.y, open: !!o.chestOpen });
  Art.drawGoal(c, { x: L.goal.x, y: L.goal.y, reached: false });
  if (S) {
    if (o.mode === 'live' && S.p.cls === 'hunter') Art.drawRangeRing(c, { x: S.p.x, y: S.p.y, radius: 260 });
    S.m.forEach(function (m) { drawMon(c, m, m.t); });
    if (o.mode === 'live' && S.p.hook) Placeholder.rope(c, S.p.x, S.p.y, S.p.hook.x, S.p.hook.y);
    Art.drawPlayer(c, { x: S.p.x, y: S.p.y, cls: S.p.cls, facing: S.p.facing, pose: S.p.pose, poseT: S.p.poseT, invuln: S.p.inv });
    S.a.forEach(function (a) { Art.drawArrow(c, { x: a.x, y: a.y, angle: a.ang }); });
    S.b.forEach(function (b) { Art.drawBomb(c, { x: b.x, y: b.y, t: b.t }); });
    S.s.forEach(function (s) { Art.drawBeeShot(c, { x: s.x, y: s.y }); });
    S.ex.forEach(function (e) { Art.drawExplosion(c, { x: e.x, y: e.y, t: e.t, dur: 0.25, radius: 60 }); });
    S.wv.forEach(function (e) { Art.drawShockwave(c, { x: e.x, y: e.y, t: e.t, dur: 0.3, radius: 130 }); });
    S.po.forEach(function (e) { Art.drawPoof(c, { x: e.x, y: e.y, t: e.t, dur: 0.3 }); });
  } else {
    L.mons.forEach(function (d) {
      if (d.tz && !rep[1]) return;
      drawMon(c, { type: d.type, x: d.x, y: d.y, facing: -1, state: d.type === 'bee' ? 'fly' : (d.type === 'frog' ? 'crouch' : 'walk'), hit: false }, 0);
    });
  }
}
function drawMon(c, m, t) {
  var s = { x: m.x, y: m.y, facing: m.facing, state: m.state, hit: m.hit };
  if (m.type === 'boar') { s.t = t; Art.drawBoar(c, s); }
  else if (m.type === 'shield') { s.t = t; Art.drawShieldman(c, s); }
  else if (m.type === 'bee') { s.t = t; Art.drawShooterBee(c, s); }
  else Art.drawFrog(c, s);
}
var thumbCache = {};
function getThumb(l) {
  var rep = G.repaired[l], key = (rep[0] ? 1 : 0) + '' + (rep[1] ? 1 : 0), e = thumbCache[l];
  if (e && e.key === key) return e.cv;
  var cv = null, c2 = null;
  try { cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; c2 = cv.getContext('2d'); } catch (err) { c2 = null; }
  if (!c2) return null;
  c2.scale(0.25, 0.25);
  drawStaticLayer(c2, LEVELS[l], rep, makeSolid(LEVELS[l], rep));
  thumbCache[l] = { key: key, cv: cv };
  return cv;
}
function drawThumb(c, l, S, taken, chestOpen) {
  var L = LEVELS[l], rep = G.repaired[l], p = CARD_POS[l];
  c.save();
  c.translate(p[0] + 8, p[1] + 8);
  c.beginPath(); c.rect(0, 0, 160, 90); c.clip();
  var cv = getThumb(l);
  if (cv) c.drawImage(cv, 0, 0, 160, 90);
  c.scale(0.125, 0.125);
  if (!cv) drawStaticLayer(c, L, rep, makeSolid(L, rep));
  drawDynLayer(c, L, S, { rep: rep, mode: 'thumb', taken: taken, chestOpen: chestOpen, t: G.t });
  c.restore();
}
function drawPreview(c, l) {
  var L = LEVELS[l], rep = G.repaired[l];
  c.save();
  c.translate(60, 96); c.beginPath(); c.rect(0, 0, 640, 360); c.clip(); c.scale(0.5, 0.5);
  drawStaticLayer(c, L, rep, makeSolid(L, rep));
  drawDynLayer(c, L, null, { rep: rep, mode: 'preview', taken: function () { return false; }, chestOpen: G.chestTaken[l], t: G.t });
  c.restore();
}
function liveScene(c) {
  var S = R.frames[R.frames.length - 1];
  c.save();
  drawStaticLayer(c, R.L, R.rep, SOL);
  drawDynLayer(c, R.L, S, { rep: R.rep, mode: 'live', taken: function (id) { return R.taken[id] !== undefined; }, chestOpen: R.chestOpen, t: G.t });
  R.popups.forEach(function (p) { Art.drawPopup(c, { x: p.x, y: p.y, t: p.t, dur: 0.8, kind: p.kind, value: p.value }); });
  R.chainTexts.forEach(function (p) { Art.drawChainText(c, { x: p.x, y: p.y, n: p.n, t: p.t, dur: 0.8 }); });
  if (R.notice) Art.drawItemNotice(c, { type: R.notice.type, t: R.notice.t, dur: 1.5 });
  c.restore();
}

// ---------------------------------------------------------------- 繪製: 各畫面
function hudState(mode) {
  var bt = {};
  KINDS.forEach(function (k) { bt[k] = Math.min(0.15, G.bump[k]); });
  var s = { mode: mode, stock: { wood: G.stock.wood, stone: G.stock.stone, time: G.stock.time, soul: G.stock.soul }, ratePerMin: totalRates(), bumpT: bt, bumpDur: 0.15,
    time: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null };
  if (mode === 'level' && R) {
    var p = R.p;
    s.time = Math.round(R.frame / 60 * 10) / 10; s.run = { wood: R.run.wood, stone: R.run.stone, time: R.run.time, soul: R.run.soul };
    s.hp = Math.max(0, p.hp); s.maxHp = maxHp();
    s.skillCdDur = p.skDur; s.skillCdT = Math.max(0, Math.min(p.skDur, p.skDur - p.skCd)); s.cls = R.cls;
  }
  return s;
}
function renderMap(c) {
  Art.drawMapBackground(c, {});
  [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 7]].forEach(function (e) {
    Art.drawMapLink(c, { x1: CARD_POS[e[0]][0] + 176, y1: CARD_POS[e[0]][1] + 68, x2: CARD_POS[e[1]][0], y2: CARD_POS[e[1]][1] + 68, lit: !!G.rec[e[0]] });
  });
  for (var l = 0; l < 8; l++) {
    var st = levelState(l), rec = G.rec[l], cost = { wood: 0, stone: 0, time: 0, soul: 0 };
    if (st === 'sealed' || st === 'buyable') cost.wood = UNLOCK_COST[l];
    var rc = G.repaired[l];
    Art.drawLevelCard(c, { x: CARD_POS[l][0], y: CARD_POS[l][1], index: l + 1, name: LEVELS[l].name, state: st, cost: cost, stock: G.stock,
      canAfford: G.stock.wood >= cost.wood, rates: rec ? rateOf(l, rec) : { wood: 0, stone: 0, time: 0, soul: 0 },
      recordCls: rec ? rec.cls : null, recordTime: rec ? Math.round(rec.N / 6) / 10 : null, repairedCount: (rc[0] ? 1 : 0) + (rc[1] ? 1 : 0) });
    if (st === 'open') drawThumb(c, l, null, function () { return false; }, G.chestTaken[l]);
    else if (st === 'cleared') {
      var fi = Math.min(Math.floor(G.rp[l].pos), rec.N), S = rec.frames[fi];
      drawThumb(c, l, S, function (id) { return rec.pickF[id] !== undefined && rec.pickF[id] <= fi; }, rec.chestEver ? S.chest : G.chestTaken[l]);
    }
    Art.drawCardOverlay(c, { x: CARD_POS[l][0], y: CARD_POS[l][1], accelLv: rec ? G.accel[l] : 0, newArea: !!rec && rec.version < G.repairVer[l], selected: G.mapSel === l });
  }
  Art.drawWorkshopCard(c, { x: WORK_POS[0], y: WORK_POS[1], anyAffordable: anyAffordable(), selected: G.mapSel === 8 });
  Art.drawGoalCard(c, { x: GOAL_POS[0], y: GOAL_POS[1], cost: GOAL_COST, stock: G.stock, canAfford: canPay(GOAL_COST), selected: G.mapSel === 9 });
  G.flights.forEach(function (f) {
    var u = Math.min(1, f.t / 0.7), tx = ICON_X[f.kind], ty = 20;
    Art.drawFlyingMaterial(c, { x: f.x0 + (tx - f.x0) * u, y: f.y0 + (ty - f.y0) * u - Math.sin(Math.PI * u) * 60, kind: f.kind, t: f.t, dur: 0.7 });
  });
  Art.drawHud(c, hudState('map'));
  txt(c, '↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', W / 2, 702, 18, '#fff', 'center');
}
function renderPanel(c) {
  renderMap(c);
  var P = G.panel, l = P.l, rec = G.rec[l], rc = G.repaired[l];
  Art.drawLevelPanel(c, {
    index: l + 1, name: LEVELS[l].name, row: P.row,
    classes: CLS_LIST.map(function (k) { return { cls: k, owned: !!G.recruited[k] }; }), clsSel: P.clsSel,
    sites: LEVELS[l].sites.map(function (st, i) { return { role: st.role, kind: st.kind, repaired: rc[i], cost: { wood: 0, stone: rc[i] ? 0 : REPAIR_COST[l][i], time: 0, soul: 0 } }; }),
    siteSel: P.siteSel, slots: G.slots[l].map(function (it) { return it ? it.type : null; }), slotSel: P.slotSel,
    items: G.bag.map(function (it) { return { type: it.type, where: it.where ? { level: it.where.level + 1, slot: it.where.slot + 1 } : null }; }),
    accelLv: G.accel[l], accelCost: G.accel[l] < 2 ? { wood: 0, stone: 0, time: ACCEL_COST[G.accel[l]], soul: 0 } : null, stock: G.stock,
    recordCls: rec ? rec.cls : null, recordTime: rec ? Math.round(rec.N / 6) / 10 : null, rates: rec ? rateOf(l, rec) : null,
    newArea: !!rec && rec.version < G.repairVer[l]
  });
  drawPreview(c, l);
  if (P.row === 1) {
    var st = LEVELS[l].sites[P.siteSel], x0 = 99, y0 = 99, x1 = 0, y1 = 0;
    st.cells.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0] + 1); y1 = Math.max(y1, q[1] + 1); });
    Art.drawSiteHighlight(c, { x: 60 + x0 * 20, y: 96 + y0 * 20, w: Math.max(20, (x1 - x0) * 20), h: Math.max(20, (y1 - y0) * 20), active: true });
  }
}
function renderUpgrade(c) {
  renderMap(c);
  Art.drawUpgradePage(c, {
    row: G.upRow, recruitSel: G.upSel,
    recruits: [{ cls: 'hunter', owned: G.recruited.hunter, cost: recruitCost() }, { cls: 'bomber', owned: G.recruited.bomber, cost: recruitCost() }],
    stats: [{ key: 'speed', lv: G.up.speed, maxLv: 3, cost: statCost(0) }, { key: 'hp', lv: G.up.hp, maxLv: 2, cost: statCost(1) }, { key: 'cd', lv: G.up.cd, maxLv: 3, cost: statCost(2) }],
    stock: G.stock
  });
}
var GUIDE_TITLES = ['衝到終點', '操作', '過關後一直重播', '撿多還是跑快', '修好工程開新路'];
var GUIDE_TEXTS = ['碰到旗子就過關', '空白鍵跳、Z 攻擊、X 技能(Esc 暫停)', '過關的關卡會一直重播賺素材', '撿越多、跑越快, 重播賺越快', '花石料修工程, 關卡會開新路'];
function renderGuide(c) {
  var pg = G.guidePage;
  Art.drawMapBackground(c, {});
  c.save(); c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 0, W, 90); c.fillRect(0, 470, W, 250); c.restore();
  txt(c, '重建之路 — 玩家說明', W / 2, 30, 22, '#ffd98a', 'center');
  txt(c, GUIDE_TITLES[pg], W / 2, 66, 34, '#fff', 'center');
  Art.drawGuidePage(c, { page: pg - 0 + GUIDE_PAGE_BASE, x: 320, y: 110, w: 640, h: 340 });
  txt(c, GUIDE_TEXTS[pg], W / 2, 520, 32, '#fff', 'center');
  txt(c, '第 ' + (pg + 1) + ' / ' + GUIDE_PAGES + ' 頁', W / 2, 580, 22, '#ffd98a', 'center');
  var last = pg === GUIDE_PAGES - 1;
  txt(c, '← → 翻頁    Z ' + (last ? (G.guideFrom === 'map' ? '關閉' : '開始') : '下一頁'), W / 2, 630, 22, '#fff', 'center');
  txt(c, '大地圖上按空白鍵可再打開說明', W / 2, 676, 18, '#cfd8dc', 'center');
}
function render() {
  var c = ctx;
  c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  c.clearRect(0, 0, W, H);
  var sc = G.screen;
  if (sc === 'guide') renderGuide(c);
  else if (sc === 'map') { renderMap(c); if (G.paused) Art.drawPausePanel(c, { mode: 'map' }); }
  else if (sc === 'levelPanel') { renderPanel(c); if (G.paused) Art.drawPausePanel(c, { mode: 'map' }); }
  else if (sc === 'upgrade') { renderUpgrade(c); if (G.paused) Art.drawPausePanel(c, { mode: 'map' }); }
  else if (sc === 'play' || sc === 'result' || sc === 'fail') {
    liveScene(c);
    Art.drawHud(c, hudState('level'));
    if (sc === 'result') Art.drawResultPanel(c, G.res);
    else if (sc === 'fail') Art.drawFailPanel(c, {});
    else if (G.paused) Art.drawPausePanel(c, { mode: 'level' });
  } else if (sc === 'ending') { renderMap(c); Art.drawEndingPanel(c, { totalTime: G.finalTime }); }
}

// ---------------------------------------------------------------- 主迴圈
var acc = 0, lastTs = 0;
function update(dt) {
  G.t += dt;
  KINDS.forEach(function (k) { G.bump[k] = Math.min(1, G.bump[k] + dt); });
  if (G.paused || G.screen === 'guide') return;
  if (G.screen !== 'ending') G.playTime += dt;
  advanceReplays(dt);
  updateFlights(dt);
  if (G.screen === 'play' && R && R.state === 'run') {
    acc += dt;
    while (acc >= DT && R.state === 'run') {
      stepRun();
      edge.z = edge.x = edge.jump = edge.jumpRel = false;
      acc -= DT;
    }
  } else acc = 0;
}
function frameLoop(ts) {
  requestAnimationFrame(frameLoop);
  var dt = lastTs ? Math.min((ts - lastTs) / 1000, 1 / 30) : 0;
  lastTs = ts;
  try { update(dt); render(); } catch (err) { if (window.console) console.error(err); }
}
function resize() {
  var cw = document.documentElement.clientWidth || window.innerWidth, ch = document.documentElement.clientHeight || window.innerHeight;
  var s = Math.min(cw / W, ch / H);
  var cssW = Math.max(1, Math.floor(W * s)), cssH = Math.max(1, Math.floor(H * s));
  DPR = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * DPR); canvas.height = Math.round(cssH * DPR);
}
var canvas = null, ctx = null, DPR = 1;
function init() {
  canvas = document.getElementById('c');
  ctx = canvas.getContext('2d');
  newGame();
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', function () { keys.left = keys.right = keys.space = false; });
  requestAnimationFrame(frameLoop);
}
if (typeof document !== 'undefined' && document.getElementById && document.getElementById('c')) init();

