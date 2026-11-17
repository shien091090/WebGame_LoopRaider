/* 魔印獵場 - 玩法驗證 Demo。邏輯與繪製分離: 每幀先更新狀態, 再呼叫 Art.drawXxx(ctx, state)。 */
var W = Art.canvas.width, H = Art.canvas.height;
var T = 40, COLS = 32, ROWS = 18, DT = 1 / 60;
var KINDS = ['wood', 'ench', 'time'];
var CLSN = ['sword', 'hunter', 'bomber'];
var ACCEL = [1, 1.25, 1.5];
var BUMP_DUR = 0.15;
var MARKNAME = { blast: '爆裂印', rich: '豐饒印', pack: '招群印', magnet: '磁石印' };
var MON = {
  boar: { w: 48, h: 32, hp: 3, drop: 'wood', n: 2 },
  shield: { w: 32, h: 44, hp: 3, drop: 'ench', n: 2 },
  bee: { w: 32, h: 32, hp: 1, drop: 'time', n: 1 },
  frog: { w: 32, h: 28, hp: 2, drop: 'wood', n: 1 }
};
var PARENTS = { 2: [1], 3: [1], 4: [2], 5: [2], 6: [3], 7: [3], 8: [5, 6] };
var UNLOCK_COST = { 2: 20, 3: 20, 4: 50, 5: 50, 6: 50, 7: 50, 8: 100 };
var CARDPOS = [null, { x: 40, y: 281 }, { x: 290, y: 131 }, { x: 290, y: 431 }, { x: 540, y: 56 }, { x: 540, y: 206 }, { x: 540, y: 356 }, { x: 540, y: 506 }, { x: 790, y: 281 }, { x: 1040, y: 281 }];
var MAPCOLS = [[1], [2, 3], [4, 5, 6, 7], [8], [9]];
var GOAL_COST = { wood: 200, ench: 100, time: 100 };
var HUD_TARGET = { wood: { x: 36, y: 20 }, ench: { x: 256, y: 20 }, time: { x: 476, y: 20 } };
var RECRUIT_COST = 40;
var SLOT_COSTS = [8, 20, 40];
var ACCEL_COSTS = [12, 30];

/* ---------- 佔位圖形(interface.json 指定由 RD 自畫的, 集中在這) ---------- */
var Placeholder = {
  hookLine: function (c, x1, y1, x2, y2) {
    c.save();
    c.strokeStyle = '#e8dcae';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.restore();
  }
};

/* ---------- 畫布 ---------- */
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
function fit() {
  var cw = window.innerWidth || W, ch = window.innerHeight || H;
  var s = Math.min(cw / W, ch / H);
  var w = Math.max(1, Math.floor(W * s)), h = Math.max(1, Math.floor(H * s));
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

/* ---------- 關卡資料 ---------- */
var LEVELS = [null];
function defLevel(name, theme, fn) {
  var L = { name: name, theme: theme, g: [], pk: [], mons: [], hooks: [], chest: null, start: null, goal: null, slotMon: [] };
  for (var r = 0; r < ROWS; r++) { L.g.push([]); for (var c = 0; c < COLS; c++) L.g[r].push(0); }
  var b = {
    fill: function (c0, r0, c1, r1, v) {
      if (v === undefined) v = 1;
      for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) L.g[rr][cc] = v;
    },
    clear: function (c0, r0, c1, r1) { this.fill(c0, r0, c1, r1, 0); },
    wall: function (c, r) { L.g[r][c] = 2; },
    spike: function (c, r) { L.g[r][c] = 3; },
    hook: function (c, r) { L.hooks.push({ x: c * T + 20, y: r * T + 20 }); },
    pk: function (kind, list) { for (var i = 0; i < list.length; i++) L.pk.push({ x: list[i][0] * T + 20, y: list[i][1] * T + 20, kind: kind }); },
    mon: function (type, c, r, slot, py) {
      var d = MON[type];
      var y = type === 'bee' ? r * T + 20 : (r + 1) * T - d.h / 2;
      if (py !== undefined) y = py;
      L.mons.push({ type: type, c: c, r: r, x: c * T + 20, y: y, slot: slot || 0 });
      if (slot) L.slotMon[slot - 1] = L.mons.length - 1;
    },
    chest: function (c, r, mark) { L.chest = { c: c, r: r, x: c * T + 20, y: (r + 1) * T - 18, mark: mark }; },
    start: function (c, r) { L.start = { x: c * T + 20, y: (r + 1) * T - 22 }; },
    goal: function (c, r) { L.goal = { x: c * T + 20, y: (r + 1) * T - 40 }; },
    floor: function () { this.fill(0, 16, 31, 17); },
    /* 暗門土丘: 先踏上 2 高的台階、再上土丘頂(3 高), 土丘右側有 2 格高的洞(淨空 80px), 洞口是兩格裂岩牆 */
    cave: function (a) {
      this.fill(a, 14, a + 1, 15);
      this.fill(a + 2, 13, a + 5, 15);
      this.clear(a + 3, 14, a + 4, 15);
      this.wall(a + 5, 14); this.wall(a + 5, 15);
    },
    /* 左緣暗室: 在畫面最左, 不在主路上 */
    chamber: function () {
      this.fill(0, 13, 4, 15); this.clear(1, 14, 3, 15);
      this.wall(4, 14); this.wall(4, 15);
    },
    stack: function (c) {
      this.fill(c, 14, c + 1, 15);
      this.fill(c + 2, 12, c + 3, 12);
      this.fill(c + 4, 11, c + 7, 11);
      this.hook(c + 8, 11);
    }
  };
  fn(b);
  L.ground = []; L.spikes = []; L.walls = [];
  for (var r2 = 0; r2 < ROWS; r2++) {
    for (var c2 = 0; c2 < COLS; c2++) {
      var v = L.g[r2][c2];
      if (v === 1) {
        var above = r2 > 0 ? L.g[r2 - 1][c2] : 0;
        L.ground.push({ x: c2 * T + 20, y: r2 * T + 20, top: !(above === 1 || above === 2) });
      } else if (v === 2) {
        L.walls.push({ c: c2, r: r2, x: c2 * T + 20, y: r2 * T + 20 });
      } else if (v === 3) {
        L.spikes.push({ x: c2 * T + 20, y: r2 * T + 20 });
      }
    }
  }
  LEVELS.push(L);
}

defLevel('草原', 'plain', function (b) {
  b.floor(); b.start(1, 15); b.goal(30, 15);
  b.stack(12);
  b.cave(22);
  b.chest(10, 15, 'blast');
  b.pk('wood', [[3, 15], [4, 15], [6, 15], [11, 15], [15, 15], [18, 15], [20, 15], [29, 15]]);
  b.pk('ench', [[25, 15], [26, 15], [25, 12]]);
  b.pk('time', [[17, 10], [18, 10]]);
  b.mon('frog', 5, 15, 0); b.mon('shield', 7, 15, 1); b.mon('frog', 9, 15, 2);
  b.mon('boar', 17, 15, 3); b.mon('bee', 26, 11, 4);
});

defLevel('懸崖棧道', 'sky', function (b) {
  for (var i = 0; i <= 9; i++) b.fill(3 * i, 16 - i, 3 * i + 2, 17);
  b.fill(30, 6, 31, 17);
  b.start(1, 15); b.goal(30, 5);
  /* 高台: 左端離下方階梯 5 格, 下方淨空 >= 3 格; 右側加 1 格墊塊讓其他職業走階梯上得去 */
  b.fill(3, 10, 8, 10); b.hook(2, 10); b.fill(10, 12, 10, 12);
  b.fill(12, 7, 17, 7); b.hook(11, 7); b.fill(19, 9, 19, 9);
  b.fill(21, 4, 26, 4); b.hook(20, 4); b.fill(28, 6, 28, 6);
  b.spike(7, 13); b.spike(16, 10); b.spike(25, 7);
  b.chest(23, 3, 'rich');
  b.pk('wood', [[3, 14], [5, 14], [8, 13], [15, 10], [20, 9], [29, 6]]);
  b.pk('ench', [[11, 12], [22, 8]]);
  b.pk('time', [[4, 9], [7, 9], [13, 6], [16, 6], [22, 3], [25, 3]]);
  b.mon('frog', 4, 14, 1); b.mon('bee', 5, 12, 0); b.mon('frog', 7, 13, 4);
  b.mon('bee', 16, 4, 2); b.mon('bee', 24, 6, 3);
});

defLevel('野豬峽谷', 'rock', function (b) {
  b.floor(); b.start(6, 15); b.goal(30, 15);
  b.chamber();
  b.cave(14);
  b.chest(2, 15, 'pack');
  b.pk('wood', [[7, 15], [8, 15], [11, 15], [13, 15], [21, 15], [24, 15], [26, 15], [29, 15]]);
  b.pk('ench', [[17, 15], [18, 15], [17, 12], [1, 15], [3, 15], [2, 14]]);
  b.pk('time', [[22, 15]]);
  b.mon('shield', 9, 15, 1); b.mon('boar', 10, 15, 0); b.mon('shield', 12, 15, 4);
  b.mon('boar', 23, 15, 2); b.mon('boar', 27, 15, 3);
});

defLevel('蜂巢高塔', 'sky', function (b) {
  /* 垂直爬塔(以 2 格一階的陡階梯表現; 見回報的規格疑問) */
  b.floor(); b.clear(7, 16, 12, 16);
  for (var i = 0; i <= 8; i++) b.fill(14 + 2 * i, 15 - i, 15 + 2 * i, 17);
  b.start(1, 15); b.goal(30, 6);
  b.fill(24, 5, 27, 5); b.hook(23, 5); b.fill(29, 7, 29, 7);
  b.spike(6, 15); b.spike(19, 12); b.spike(27, 8);
  b.chest(26, 4, 'magnet');
  b.pk('wood', [[2, 15], [4, 15], [9, 16], [11, 16], [15, 14]]);
  b.pk('ench', [[17, 13], [31, 6]]);
  b.pk('time', [[24, 4], [25, 4], [27, 4], [16, 13], [20, 11], [23, 9], [31, 5], [14, 14]]);
  b.mon('frog', 3, 15, 1); b.mon('frog', 5, 15, 0); b.mon('bee', 4, 12, 0);
  b.mon('bee', 10, 12, 2); b.mon('bee', 21, 9, 3); b.mon('bee', 25, 2, 4);
});

defLevel('斷橋', 'sky', function (b) {
  b.fill(0, 16, 3, 17); b.fill(4, 17, 9, 17); b.fill(10, 16, 13, 17); b.fill(14, 17, 19, 17);
  b.fill(20, 16, 23, 17); b.fill(24, 17, 29, 17); b.fill(30, 16, 31, 17);
  b.start(1, 15); b.goal(31, 15);
  b.spike(12, 15); b.spike(22, 15); b.spike(17, 16);
  b.chest(26, 16, 'blast');
  b.pk('wood', [[2, 15], [5, 16], [7, 16], [10, 15], [13, 15], [15, 16], [20, 15], [23, 15], [30, 15]]);
  b.pk('ench', [[19, 16], [28, 16]]);
  b.pk('time', [[15, 13], [17, 13], [5, 13], [26, 13]]);
  b.mon('boar', 6, 16, 1); b.mon('frog', 4, 16, 0); b.mon('frog', 8, 16, 0);
  b.mon('frog', 11, 15, 2); b.mon('bee', 16, 12, 3); b.mon('boar', 21, 15, 4);
});

defLevel('盾兵要塞', 'rock', function (b) {
  b.floor(); b.start(6, 15); b.goal(31, 15);
  b.chamber();
  b.cave(8);
  b.stack(15);
  b.cave(24);
  b.chest(20, 10, 'pack');
  b.pk('wood', [[5, 15], [7, 15], [14, 15], [22, 15], [30, 15]]);
  b.pk('ench', [[1, 15], [3, 15], [1, 14], [3, 14], [11, 15], [12, 15], [27, 15], [28, 15]]);
  b.pk('time', [[19, 10], [22, 10]]);
  b.mon('shield', 7, 15, 1); b.mon('shield', 8, 13, 0); b.mon('shield', 9, 13, 0);
  b.mon('bee', 20, 13, 2); b.mon('shield', 23, 15, 4); b.mon('boar', 21, 15, 3);
});

defLevel('蛙沼', 'swamp', function (b) {
  b.fill(0, 16, 3, 17); b.fill(4, 17, 27, 17); b.fill(28, 16, 31, 17);
  for (var c = 4; c <= 27; c++) b.spike(c, 16);
  b.fill(5, 14, 7, 14); b.fill(10, 13, 12, 13); b.fill(15, 14, 17, 14); b.fill(20, 13, 22, 13); b.fill(25, 14, 27, 14);
  b.start(1, 15); b.goal(30, 15);
  b.chest(16, 13, 'rich');
  b.pk('wood', [[5, 13], [7, 13], [11, 12], [21, 12], [26, 13], [29, 15], [31, 15]]);
  b.pk('ench', [[10, 12], [12, 12], [20, 12], [22, 12]]);
  b.pk('time', [[17, 13], [27, 13], [15, 12]]);
  b.mon('frog', 5, 13, 0); b.mon('frog', 6, 13, 1); b.mon('frog', 7, 13, 0);
  b.mon('shield', 21, 12, 2); b.mon('bee', 12, 9, 3); b.mon('frog', 15, 13, 4); b.mon('frog', 26, 13, 0);
});

defLevel('王座', 'throne', function (b) {
  b.fill(0, 16, 10, 17); b.fill(11, 17, 16, 17); b.fill(17, 16, 31, 17);
  b.fill(0, 13, 4, 15); b.clear(1, 14, 3, 15); b.wall(4, 14); b.wall(4, 15);
  b.stack(18);
  b.start(6, 15); b.goal(30, 15);
  b.chest(2, 15, 'magnet');
  b.pk('wood', [[7, 15], [8, 15], [13, 16], [14, 16], [17, 15], [23, 15], [28, 15], [29, 15]]);
  b.pk('ench', [[1, 15], [3, 15], [1, 14], [3, 14], [24, 15], [27, 15]]);
  b.pk('time', [[23, 10], [24, 10], [12, 16], [15, 16], [27, 14], [28, 14]]);
  b.mon('shield', 9, 15, 1); b.mon('boar', 10, 15, 0); b.mon('bee', 8, 12, 0);
  b.mon('frog', 13, 16, 4); b.mon('frog', 15, 16, 0); b.mon('shield', 23, 15, 0);
  b.mon('boar', 27, 15, 2); b.mon('bee', 28, 11, 3);
});

/* ---------- 工具與碰撞 ---------- */
function sign(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }
function cellSolid(g, c, r) {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  var v = g[r][c];
  return v === 1 || v === 2;
}
function solidBox(g, x, y, w, h) {
  var c0 = Math.floor((x - w / 2) / T), c1 = Math.floor((x + w / 2 - 0.001) / T);
  var r0 = Math.floor((y - h / 2) / T), r1 = Math.floor((y + h / 2 - 0.001) / T);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (cellSolid(g, c, r)) return true;
  return false;
}
function moveAxis(e, dx, dy, g) {
  if (dx) {
    e.hitX = false;
    e.x += dx;
    if (solidBox(g, e.x, e.y, e.w, e.h)) {
      if (dx > 0) e.x = Math.floor((e.x + e.w / 2) / T) * T - e.w / 2 - 0.01;
      else e.x = Math.ceil((e.x - e.w / 2) / T) * T + e.w / 2 + 0.01;
      e.hitX = true;
    }
  }
  if (dy) {
    e.hitY = false;
    e.y += dy;
    if (solidBox(g, e.x, e.y, e.w, e.h)) {
      if (dy > 0) { e.y = Math.floor((e.y + e.h / 2) / T) * T - e.h / 2 - 0.01; e.onGround = true; }
      else e.y = Math.ceil((e.y - e.h / 2) / T) * T + e.h / 2 + 0.01;
      e.hitY = true; e.vy = 0;
    }
  }
}
function ov(a, b) { return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h; }
function ovBox(a, x0, y0, x1, y1) { return a.x + a.w / 2 > x0 && a.x - a.w / 2 < x1 && a.y + a.h / 2 > y0 && a.y - a.h / 2 < y1; }
function distBox(px, py, b) {
  var dx = Math.max(Math.abs(px - b.x) - b.w / 2, 0), dy = Math.max(Math.abs(py - b.y) - b.h / 2, 0);
  return Math.sqrt(dx * dx + dy * dy);
}
function distCell(px, py, c, r) {
  var dx = Math.max(Math.abs(px - (c * T + 20)) - 20, 0), dy = Math.max(Math.abs(py - (r * T + 20)) - 20, 0);
  return Math.sqrt(dx * dx + dy * dy);
}

/* 玩家物理(三職業共用; 自測的路徑搜尋也直接呼叫它) */
function playerMove(p, g, dir, jump, cut) {
  var spd = p.cls === 'bomber' ? 230 : 260;
  if (p.hurtT > 0) { p.vx = p.kbv; p.hurtT -= DT; }
  else { p.vx = dir * spd; if (dir) p.facing = dir; }
  if (jump && p.onGround) { p.vy = -720; p.onGround = false; p.jumping = true; p.jumpHold = 0; }
  if (p.jumping) {
    p.jumpHold += DT;
    if (cut) { if (p.jumpHold < 0.15 && p.vy < -360) p.vy = -360; p.jumping = false; }
  }
  p.vy = Math.min(p.vy + 2400 * DT, 1200);
  p.onGround = false; p.hitX = false; p.hitY = false;
  moveAxis(p, p.vx * DT, 0, g);
  moveAxis(p, 0, p.vy * DT, g);
  if (p.onGround) p.jumping = false;
}

/* ---------- 全局遊戲狀態 ---------- */
var S, mode, paused, totalTime, guidePage, cursor, panel, sim, res, pausedMode, acc, lastTs;
var keys = {}, inq = { z: false, x: false, jump: false, cut: false };

function newState() {
  S = {
    stock: { wood: 0, ench: 0, time: 0 },
    bump: { wood: BUMP_DUR, ench: BUMP_DUR, time: BUMP_DUR },
    unlocked: [false, true, false, false, false, false, false, false, false],
    owned: [true, false, false],
    rec: [null, null, null, null, null, null, null, null, null],
    rp: [null, null, null, null, null, null, null, null, null],
    accel: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    slots: [null],
    items: [],
    chestTaken: [false, false, false, false, false, false, false, false, false],
    lastCls: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    fly: []
  };
  for (var i = 1; i <= 8; i++) {
    S.slots[i] = [{ un: true, item: null }, { un: false, item: null }, { un: false, item: null }, { un: false, item: null }];
  }
}
function resetAll() {
  newState();
  totalTime = 0; mode = 'guide'; guidePage = 0; cursor = 1; panel = null; sim = null; res = null; paused = false; acc = 0;
}

function levelStatus(lv) {
  if (S.rec[lv]) return 'cleared';
  if (S.unlocked[lv]) return 'open';
  var ps = PARENTS[lv] || [];
  for (var i = 0; i < ps.length; i++) if (S.rec[ps[i]]) return 'buyable';
  return 'sealed';
}
function cfgMarks(lv) {
  var o = [];
  for (var i = 0; i < 4; i++) { var s = S.slots[lv][i]; o.push(s.un && s.item ? s.item.type : null); }
  return o;
}
function isPending(lv) {
  var r = S.rec[lv];
  if (!r) return false;
  var m = cfgMarks(lv);
  for (var i = 0; i < 4; i++) if (m[i] !== r.marks[i]) return true;
  return false;
}
function round1(v) { return Math.round(v * 10) / 10; }
function recRaw(lv, mult) {
  var r = S.rec[lv], o = { wood: 0, ench: 0, time: 0 };
  for (var i = 0; i < 3; i++) o[KINDS[i]] = r.tot[KINDS[i]] / r.dur * 60 * mult;
  return o;
}
function ratesShown(lv) {
  var o = recRaw(lv, ACCEL[S.accel[lv]]);
  return { wood: round1(o.wood), ench: round1(o.ench), time: round1(o.time) };
}
function totalRates() {
  var t = { wood: 0, ench: 0, time: 0 };
  for (var lv = 1; lv <= 8; lv++) {
    if (!S.rec[lv]) continue;
    var o = recRaw(lv, ACCEL[S.accel[lv]]);
    for (var i = 0; i < 3; i++) t[KINDS[i]] += o[KINDS[i]];
  }
  return { wood: round1(t.wood), ench: round1(t.ench), time: round1(t.time) };
}
function canPay(cost) { return S.stock.wood >= cost.wood && S.stock.ench >= cost.ench && S.stock.time >= cost.time; }

/* ---------- 關卡模擬 ---------- */
function mkMon(s, type, x, y, minion, mark) {
  var d = MON[type], sc = minion ? 0.75 : 1;
  var hp = minion ? 1 : d.hp + (mark === 'rich' ? 2 : 0);
  var m = {
    id: s.nid++, type: type, x: x, y: y, w: d.w * sc, h: d.h * sc, hp: hp, facing: -1, st: type === 'boar' || type === 'shield' ? 'walk' : (type === 'bee' ? 'fly' : 'crouch'),
    vx: 0, vy: 0, onGround: false, alive: true, minion: !!minion, mark: mark || null, hitT: 0, blockT: 0, fl: null,
    tt: 0, subT: 0, jt: 1.2, cd: 1.2, sx: x, sy: y, dirx: -1, drop: d.drop, dn: minion ? 1 : d.n
  };
  s.mons.push(m);
  return m;
}

function startRun(lv, cls) {
  var L = LEVELS[lv];
  var s = {
    lv: lv, cls: cls, L: L, time: 0, nid: 1, over: null,
    g: [], walls: [], mons: [], pk: [], arrows: [], bombs: [], shots: [], expl: [], shocks: [], mags: [], poofs: [], blasts: [], chains: [],
    pops: [], chainTexts: [], notice: null, run: { wood: 0, ench: 0, time: 0 }, item: null, events: [], frames: [],
    chestOpen: S.chestTaken[lv], reached: false, dashChain: null, dashHit: {}, dashWalls: {}, sc: null
  };
  for (var r = 0; r < ROWS; r++) s.g.push(L.g[r].slice());
  for (var i = 0; i < L.walls.length; i++) s.walls.push({ c: L.walls[i].c, r: L.walls[i].r, hp: 3 });
  for (var j = 0; j < L.pk.length; j++) s.pk.push({ x: L.pk[j].x, y: L.pk[j].y, w: 24, h: 24, kind: L.pk[j].kind, taken: false, fly: false });
  var marks = cfgMarks(lv);
  s.marks = marks;
  var slotOf = {};
  for (var k = 0; k < 4; k++) slotOf[L.slotMon[k]] = k;
  for (var mi = 0; mi < L.mons.length; mi++) {
    var d = L.mons[mi];
    var mk = slotOf[mi] !== undefined ? marks[slotOf[mi]] : null;
    var m = mkMon(s, d.type, d.x, d.y, false, mk);
    if (mk === 'pack') {
      for (var q = 0; q < 2; q++) {
        var dc = q === 0 ? -1 : 1;
        var cc = d.c + dc;
        var rr = Math.floor(d.y / T);
        var sx = (cellSolid(s.g, cc, rr)) ? d.x : cc * T + 20;
        var mm = mkMon(s, d.type, sx, d.type === 'bee' ? d.y : (d.r + 1) * T - MON[d.type].h * 0.375, true, null);
        mm.facing = m.facing;
      }
    }
  }
  s.p = {
    x: L.start.x, y: L.start.y, w: 28, h: 44, vx: 0, vy: 0, facing: 1, onGround: false, hp: 3, inv: 0, hurtT: 0, kbv: 0, hurtPose: 0,
    jumping: false, jumpHold: 0, cls: CLSN[cls], pose: 'idle', poseT: 0, act: null, actT: 0, actDur: 0,
    cdAtk: 0, cdSkill: 0, skillDur: cls === 0 ? 1.2 : (cls === 1 ? 0.5 : 1.5), dashT: 0, dashUsed: false, hook: null, autoT: 0.6, moving: false
  };
  sim = s;
  inq.z = inq.x = inq.jump = inq.cut = false;
  s.sc = snapshot(s);
  mode = 'level';
  acc = 0;
  S.lastCls[lv] = cls;
}

function newChain(s) { var c = { kills: 0, pend: 0, x: 0, y: 0 }; s.chains.push(c); return c; }
function gain(s, kind, n, x, y) {
  s.run[kind] += n;
  s.events.push({ t: s.time, x: x, y: y, k: kind, n: n });
  s.pops.push({ x: x, y: y, t: 0, dur: 0.8, kind: kind, value: n });
}
function endFling(m) {
  if (m.fl) {
    m.fl.chain.pend--;
    m.fl = null;
    if (m.type === 'bee') { m.sx = m.x; m.sy = m.y - 16 * Math.sin(m.tt * Math.PI); }
    if (m.type === 'boar') m.st = 'walk';
    if (m.type === 'frog') { m.st = 'crouch'; m.jt = 0.6; }
  }
}
function killMon(s, m, chain) {
  if (!m.alive) return;
  m.alive = false;
  endFling(m);
  var n = m.dn * (m.mark === 'rich' ? 3 : 1);
  gain(s, m.drop, n, m.x, m.y);
  s.poofs.push({ x: m.x, y: m.y, t: 0, dur: 0.3 });
  chain.kills++; chain.x = m.x; chain.y = m.y;
  if (m.mark === 'blast') { s.blasts.push({ x: m.x, y: m.y, t: 0.3, chain: chain }); chain.pend++; }
  if (m.mark === 'magnet') {
    s.mags.push({ x: m.x, y: m.y, t: 0, dur: 0.4, radius: 240 });
    for (var i = 0; i < s.pk.length; i++) {
      var k = s.pk[i];
      if (!k.taken && !k.fly && Math.sqrt((k.x - m.x) * (k.x - m.x) + (k.y - m.y) * (k.y - m.y)) <= 240) k.fly = true;
    }
  }
}
function damageMon(s, m, dmg, chain) {
  if (!m.alive) return;
  m.hp -= dmg; m.hitT = 0.1;
  if (m.hp <= 0) killMon(s, m, chain);
}
function shieldBlocks(m, ax, ay) {
  return m.type === 'shield' && !m.fl && (ax - m.x) * m.facing > 0 && ay >= m.y - m.h / 2;
}
function hitMon(s, m, dmg, chain, ax, ay) {
  if (shieldBlocks(m, ax, ay)) { m.blockT = 0.2; m.hitT = 0.1; return false; }
  damageMon(s, m, dmg, chain);
  return true;
}
function flingMon(s, m, dir, chain) {
  if (!m.alive) return;
  endFling(m);
  m.fl = { dir: dir, t: 0, chain: chain, hit: {} };
  chain.pend++;
  m.vx = 0; m.vy = 0;
}
function breakWall(s, w) {
  if (w.hp <= 0) return;
  w.hp = 0; s.g[w.r][w.c] = 0;
  s.poofs.push({ x: w.c * T + 20, y: w.r * T + 20, t: 0, dur: 0.3 });
}
function hitWall(s, w) { if (w.hp <= 0) return; w.hp--; if (w.hp <= 0) breakWall(s, w); }
function wallAt(s, c, r) {
  for (var i = 0; i < s.walls.length; i++) if (s.walls[i].c === c && s.walls[i].r === r && s.walls[i].hp > 0) return s.walls[i];
  return null;
}
function explode(s, x, y, r, dmg, dur, chain, fling) {
  s.expl.push({ x: x, y: y, t: 0, dur: dur, r: r });
  var list = s.mons.slice();
  for (var i = 0; i < list.length; i++) {
    var m = list[i];
    if (!m.alive) continue;
    if (distBox(x, y, m) <= r) {
      damageMon(s, m, dmg, chain);
      if (m.alive && fling) flingMon(s, m, sign(m.x - x) || 1, chain);
    }
  }
  for (var w = 0; w < s.walls.length; w++) {
    var wl = s.walls[w];
    if (wl.hp > 0 && distCell(x, y, wl.c, wl.r) <= r) breakWall(s, wl);
  }
}
function hurtPlayer(s, srcX) {
  var p = s.p;
  if (p.inv > 0 || p.dashT > 0 || s.over) return;
  p.hp--; p.inv = 1; p.hurtT = 0.12; p.hurtPose = 0.3;
  p.kbv = (p.x < srcX ? -1 : 1) * 80 / 0.12;
  p.vy = -200;
  if (p.hook) p.hook = null;
  if (p.hp <= 0) s.over = 'fail';
}
function groundAhead(m, g) {
  var x = m.x + m.facing * (m.w / 2 + 1), y = m.y + m.h / 2 + 2;
  return cellSolid(g, Math.floor(x / T), Math.floor(y / T));
}
function gravityMove(m, g) {
  m.vy = Math.min(m.vy + 2400 * DT, 1200);
  m.onGround = false; m.hitX = false; m.hitY = false;
  moveAxis(m, m.vx * DT, 0, g);
  moveAxis(m, 0, m.vy * DT, g);
}
function frogCanLand(m, g, dir, dist) {
  var lx = m.x + dir * dist, c = Math.floor(lx / T), rf = Math.floor((m.y + m.h / 2 - 1) / T);
  if (cellSolid(g, c, rf) || cellSolid(g, c, rf - 1)) return false;
  for (var r = rf + 1; r <= rf + 2; r++) if (cellSolid(g, c, r)) return true;
  return false;
}

function updMon(s, m) {
  var p = s.p, g = s.g;
  m.hitT = Math.max(0, m.hitT - DT); m.blockT = Math.max(0, m.blockT - DT);
  if (m.fl) {
    var f = m.fl;
    f.t += DT;
    moveAxis(m, f.dir * 460 * DT, 0, g);
    m.facing = m.facing; // 擊飛不改面向
    if (m.hitX) { var ch = f.chain; damageMon(s, m, 1, ch); endFling(m); return; }
    for (var i = 0; i < s.mons.length; i++) {
      var o = s.mons[i];
      if (o === m || !o.alive || f.hit[o.id]) continue;
      if (ov(m, o)) {
        f.hit[o.id] = 1;
        damageMon(s, o, 2, f.chain);
        if (o.alive) flingMon(s, o, f.dir, f.chain);
      }
    }
    if (m.alive && f.t >= 0.6) endFling(m);
    return;
  }
  var dx = p.x - m.x;
  if (m.type === 'boar') {
    if (m.st === 'walk') {
      if (!groundAhead(m, g)) m.facing = -m.facing;
      m.vx = m.facing * 80;
      if (Math.abs(p.y - m.y) <= 40 && dx * m.facing > 0 && Math.abs(dx) <= 240) { m.st = 'windup'; m.subT = 0.5; m.vx = 0; }
    } else if (m.st === 'windup') {
      m.vx = 0; m.subT -= DT; if (m.subT <= 0) m.st = 'charge';
    } else if (m.st === 'charge') {
      m.vx = m.facing * 420;
      if (!groundAhead(m, g)) { m.st = 'stun'; m.subT = 1; m.vx = 0; }
    } else {
      m.vx = 0; m.subT -= DT; if (m.subT <= 0) m.st = 'walk';
    }
    gravityMove(m, g);
    if (m.hitX) {
      if (m.st === 'walk') m.facing = -m.facing;
      else if (m.st === 'charge') { m.st = 'stun'; m.subT = 1; m.vx = 0; }
    }
  } else if (m.type === 'shield') {
    var chase = Math.abs(dx) <= 400 && Math.abs(p.y - m.y) <= 120;
    if (chase) {
      if (Math.abs(dx) > 4) m.facing = dx > 0 ? 1 : -1;
      m.vx = Math.abs(dx) > 4 ? m.facing * 40 : 0;
      if (!groundAhead(m, g)) m.vx = 0;
    } else {
      if (!groundAhead(m, g)) m.facing = -m.facing;
      m.vx = m.facing * 40;
    }
    gravityMove(m, g);
    if (m.hitX && !chase) m.facing = -m.facing;
  } else if (m.type === 'bee') {
    m.tt += DT;
    var by = m.sy + 16 * Math.sin(m.tt * Math.PI);
    if (m.st === 'aim') {
      m.subT -= DT;
      m.facing = dx >= 0 ? 1 : -1;
      if (m.subT <= 0) {
        var ddx = p.x - m.x, ddy = p.y - m.y, dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        s.shots.push({ x: m.x, y: m.y, w: 12, h: 12, vx: ddx / dd * 220, vy: ddy / dd * 220 });
        m.st = 'fly';
      }
    } else {
      var nx = m.x + m.dirx * 60 * DT;
      if (solidBox(g, nx, m.y, m.w, m.h) || Math.abs(nx - m.sx) >= 120) m.dirx = -m.dirx;
      else m.x = nx;
      m.facing = m.dirx;
      m.cd -= DT;
      var pd = Math.sqrt(dx * dx + (p.y - m.y) * (p.y - m.y));
      if (m.cd <= 0 && pd <= 400) { m.st = 'aim'; m.subT = 0.4; m.cd = 2; }
    }
    if (!solidBox(g, m.x, by, m.w, m.h)) m.y = by;
  } else if (m.type === 'frog') {
    if (m.onGround && m.st !== 'jump') {
      m.vx = 0; m.jt -= DT;
      if (m.jt <= 0) {
        var pref = Math.abs(dx) <= 300 ? (dx >= 0 ? 1 : -1) : m.facing;
        var done = false, dists = [120, 60];
        for (var a = 0; a < 2 && !done; a++) {
          for (var b = 0; b < 2 && !done; b++) {
            var dir = b === 0 ? pref : -pref;
            if (frogCanLand(m, g, dir, dists[a])) { m.facing = dir; m.vx = dir * dists[a] / 0.517; done = true; }
          }
        }
        if (!done) { m.vx = 0; }
        m.vy = -620; m.st = 'jump'; m.onGround = false;
      }
    }
    gravityMove(m, g);
    if (m.hitX) m.vx = 0;
    if (m.onGround && m.st === 'jump') { m.st = 'crouch'; m.jt = 1.2; m.vx = 0; }
    if (!m.onGround && m.st === 'crouch') m.st = 'jump';
  }
}

function playerAct(s) {
  var p = s.p, g = s.g;
  var cls = p.cls;
  function setAct(name, dur) { p.act = name; p.actT = 0; p.actDur = dur; }
  if (inq.z) {
    if (cls === 'sword' && p.cdAtk <= 0) {
      p.cdAtk = 0.3; setAct('slash', 0.2);
      var x0 = p.facing > 0 ? p.x + 14 : p.x - 64, x1 = x0 + 50, y0 = p.y - 20, y1 = p.y + 20;
      var ch = newChain(s);
      var list = s.mons.slice();
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.alive && ovBox(m, x0, y0, x1, y1)) hitMon(s, m, 1, ch, p.x, p.y);
      }
      for (var w = 0; w < s.walls.length; w++) {
        var wl = s.walls[w];
        if (wl.hp > 0 && wl.c * T < x1 && wl.c * T + T > x0 && wl.r * T < y1 && wl.r * T + T > y0) hitWall(s, wl);
      }
    } else if (cls === 'hunter' && p.cdAtk <= 0) {
      p.cdAtk = 0.4; setAct('shoot', 0.2);
      s.arrows.push({ x: p.x + p.facing * 16, y: p.y - 4, vx: p.facing * 700, vy: 0, dist: 0, max: 600 });
    } else if (cls === 'bomber' && p.cdAtk <= 0) {
      p.cdAtk = 0.6; setAct('throw', 0.2);
      s.bombs.push({ x: p.x + p.facing * 18, y: p.y - 10, w: 16, h: 16, vx: 300 * p.facing, vy: -500, t: 0 });
    }
  }
  if (inq.x && p.cdSkill <= 0) {
    if (cls === 'sword') {
      if (!p.dashUsed) {
        p.dashUsed = true; p.dashT = 0.18; p.cdSkill = 1.2;
        s.dashHit = {}; s.dashWalls = {};
        s.dashChain = newChain(s); s.dashChain.pend++;
      }
    } else if (cls === 'hunter') {
      var best = null, bd = 220;
      for (var h = 0; h < s.L.hooks.length; h++) {
        var hk = s.L.hooks[h], d = Math.sqrt((hk.x - p.x) * (hk.x - p.x) + (hk.y - p.y) * (hk.y - p.y));
        if (d <= bd) { bd = d; best = hk; }
      }
      if (best) { p.hook = best; p.cdSkill = 0.5; p.vy = 0; p.vx = 0; }
    } else {
      p.cdSkill = 1.5; setAct('wave', 0.3);
      var ch2 = newChain(s);
      s.shocks.push({ x: p.x, y: p.y, t: 0, dur: 0.3, r: 130 });
      var list2 = s.mons.slice();
      for (var k = 0; k < list2.length; k++) {
        var mm = list2[k];
        if (mm.alive && distBox(p.x, p.y, mm) <= 130) {
          damageMon(s, mm, 1, ch2);
          if (mm.alive) flingMon(s, mm, sign(mm.x - p.x) || p.facing, ch2);
        }
      }
      for (var w2 = 0; w2 < s.walls.length; w2++) {
        var wl2 = s.walls[w2];
        if (wl2.hp > 0 && distCell(p.x, p.y, wl2.c, wl2.r) <= 130) breakWall(s, wl2);
      }
    }
  }
  inq.z = false; inq.x = false;
}

function endDash(s) {
  var p = s.p;
  if (p.dashT > 0 || s.dashChain) {
    p.dashT = 0;
    if (s.dashChain) { s.dashChain.pend--; s.dashChain = null; }
  }
}

function stepPlayer(s) {
  var p = s.p, g = s.g;
  var dir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  p.moving = dir !== 0 && p.dashT <= 0 && !p.hook;
  p.inv = Math.max(0, p.inv - DT);
  p.hurtPose = Math.max(0, p.hurtPose - DT);
  p.cdAtk = Math.max(0, p.cdAtk - DT);
  p.cdSkill = Math.max(0, p.cdSkill - DT);
  if (p.act) { p.actT += DT; if (p.actT >= p.actDur) p.act = null; }
  if (p.onGround) p.dashUsed = false;

  if (p.dashT > 0) {
    p.vx = p.facing * 160 / 0.18; p.vy = 0;
    moveAxis(p, p.vx * DT, 0, g);
    // 衝刺斬命中
    var list = s.mons.slice();
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (!m.alive || s.dashHit[m.id]) continue;
      if (ovBox(m, p.x - p.w / 2 - 2, p.y - p.h / 2, p.x + p.w / 2 + 2, p.y + p.h / 2)) {
        s.dashHit[m.id] = 1;
        hitMon(s, m, 2, s.dashChain, p.x, p.y);
        if (!m.alive) p.cdSkill = 0;
      }
    }
    for (var w = 0; w < s.walls.length; w++) {
      var wl = s.walls[w];
      if (wl.hp > 0 && !s.dashWalls[w]) {
        var x0 = p.x - p.w / 2 - 2, x1 = p.x + p.w / 2 + 2;
        if (wl.c * T < x1 && wl.c * T + T > x0 && wl.r * T < p.y + p.h / 2 && wl.r * T + T > p.y - p.h / 2) { s.dashWalls[w] = 1; hitWall(s, wl); }
      }
    }
    p.dashT -= DT;
    if (p.dashT <= 0 || p.hitX) endDash(s);
    p.onGround = false;
  } else if (p.hook) {
    var hk = p.hook, dx = hk.x - p.x, dy = hk.y - p.y, d = Math.sqrt(dx * dx + dy * dy), st = 700 * DT;
    if (dir) p.facing = dir; else if (Math.abs(dx) > 1) p.facing = dx > 0 ? 1 : -1;
    if (d <= st) { p.x = hk.x; p.y = hk.y; p.hook = null; p.vy = -500; p.vx = 0; p.jumping = false; }
    else { p.x += dx / d * st; p.y += dy / d * st; }
    p.onGround = false;
  } else {
    playerMove(p, g, dir, inq.jump, inq.cut);
  }
  inq.jump = false; inq.cut = false;
  playerAct(s);

  // 獵人自動射擊
  if (p.cls === 'hunter') {
    p.autoT = Math.min(0.6, p.autoT + DT);
    if (p.autoT >= 0.6) {
      var tg = null, bd = 260;
      for (var q = 0; q < s.mons.length; q++) {
        var mq = s.mons[q];
        if (!mq.alive) continue;
        var dd = Math.sqrt((mq.x - p.x) * (mq.x - p.x) + (mq.y - p.y) * (mq.y - p.y));
        if (dd <= bd) { bd = dd; tg = mq; }
      }
      if (tg) {
        var ax = tg.x - p.x, ay = tg.y - p.y, al = Math.sqrt(ax * ax + ay * ay) || 1;
        s.arrows.push({ x: p.x, y: p.y, vx: ax / al * 700, vy: ay / al * 700, dist: 0, max: 420 });
        p.autoT = 0;
      }
    }
  }
  // 姿勢
  var pose;
  if (p.hurtPose > 0) pose = 'hurt';
  else if (p.dashT > 0) pose = 'dash';
  else if (p.hook) pose = 'hook';
  else if (p.act) pose = p.act;
  else if (!p.onGround) pose = p.vy < 0 ? 'rise' : 'fall';
  else if (p.moving) pose = 'run';
  else pose = 'idle';
  if (pose !== p.pose) { p.pose = pose; p.poseT = 0; } else p.poseT += DT;
}

function stepProjectiles(s) {
  var g = s.g, i, k;
  for (i = s.arrows.length - 1; i >= 0; i--) {
    var a = s.arrows[i], remove = false;
    var mvx = a.vx * DT, mvy = a.vy * DT;
    a.x += mvx; a.y += mvy; a.dist += Math.sqrt(mvx * mvx + mvy * mvy);
    var c = Math.floor(a.x / T), r = Math.floor(a.y / T);
    if (a.x < 0 || a.x > W || a.y < 0 || a.y > H || a.dist > a.max) remove = true;
    else if (cellSolid(g, c, r)) {
      var wl = wallAt(s, c, r);
      if (wl) hitWall(s, wl);
      remove = true;
    } else {
      for (k = 0; k < s.mons.length; k++) {
        var m = s.mons[k];
        if (!m.alive) continue;
        if (a.x > m.x - m.w / 2 - 6 && a.x < m.x + m.w / 2 + 6 && a.y > m.y - m.h / 2 - 3 && a.y < m.y + m.h / 2 + 3) {
          var ch = newChain(s);
          hitMon(s, m, 1, ch, a.x, a.y);
          remove = true; break;
        }
      }
    }
    if (remove) s.arrows.splice(i, 1);
  }
  for (i = s.bombs.length - 1; i >= 0; i--) {
    var b = s.bombs[i], boom = false;
    b.t += DT; b.vy = Math.min(b.vy + 2400 * DT, 1200);
    moveAxis(b, b.vx * DT, 0, g);
    if (b.hitX) boom = true;
    moveAxis(b, 0, b.vy * DT, g);
    if (b.hitY) boom = true;
    if (b.y > H) { s.bombs.splice(i, 1); continue; }
    if (!boom) for (k = 0; k < s.mons.length; k++) if (s.mons[k].alive && ov(b, s.mons[k])) { boom = true; break; }
    if (boom) { s.bombs.splice(i, 1); explode(s, b.x, b.y, 60, 2, 0.25, newChain(s), false); }
  }
  for (i = s.shots.length - 1; i >= 0; i--) {
    var sh = s.shots[i];
    sh.x += sh.vx * DT; sh.y += sh.vy * DT;
    if (sh.x < 0 || sh.x > W || sh.y < 0 || sh.y > H || cellSolid(g, Math.floor(sh.x / T), Math.floor(sh.y / T))) { s.shots.splice(i, 1); continue; }
    if (ov(sh, s.p)) { hurtPlayer(s, sh.x); s.shots.splice(i, 1); }
  }
  for (i = s.blasts.length - 1; i >= 0; i--) {
    var bl = s.blasts[i];
    bl.t -= DT;
    if (bl.t <= 0) {
      s.blasts.splice(i, 1);
      explode(s, bl.x, bl.y, 140, 2, 0.35, bl.chain, true);
      bl.chain.pend--;
    }
  }
  var lists = [s.expl, s.shocks, s.mags, s.poofs];
  for (var li = 0; li < lists.length; li++) {
    var arr = lists[li];
    for (i = arr.length - 1; i >= 0; i--) { arr[i].t += DT; if (arr[i].t >= arr[i].dur) arr.splice(i, 1); }
  }
}

function stepPickups(s) {
  var p = s.p;
  for (var i = 0; i < s.pk.length; i++) {
    var k = s.pk[i];
    if (k.taken) continue;
    if (k.fly) {
      var dx = p.x - k.x, dy = p.y - k.y, d = Math.sqrt(dx * dx + dy * dy) || 1, st = 600 * DT;
      if (d > st) { k.x += dx / d * st; k.y += dy / d * st; } else { k.x = p.x; k.y = p.y; }
    }
    if (ov(k, p)) { k.taken = true; gain(s, k.kind, 1, k.x, k.y); }
  }
}

function finishChains(s) {
  for (var i = s.chains.length - 1; i >= 0; i--) {
    var c = s.chains[i];
    if (c.pend <= 0) {
      if (c.kills >= 2) s.chainTexts.push({ x: c.x, y: c.y, n: Math.min(20, c.kills), t: 0, dur: 0.8 });
      s.chains.splice(i, 1);
    }
  }
}

function snapshot(s) {
  var p = s.p, i;
  var sc = {
    t: s.time,
    p: { x: p.x, y: p.y, cls: p.cls, facing: p.facing, pose: p.pose, poseT: p.poseT, invuln: p.inv > 0 },
    hook: p.hook ? { x1: p.x, y1: p.y - 6, x2: p.hook.x, y2: p.hook.y } : null,
    mons: [], pk: [], walls: [], arrows: [], bombs: [], shots: [], expl: [], shocks: [], mags: [], poofs: [], fuses: [],
    chestOpen: s.chestOpen, reached: s.reached
  };
  for (i = 0; i < s.mons.length; i++) {
    var m = s.mons[i];
    if (!m.alive) continue;
    var st = m.st;
    if (m.fl) st = 'flung';
    else if (m.type === 'shield' && m.blockT > 0) st = 'block';
    sc.mons.push({ k: m.type, x: m.x, y: m.y, f: m.facing, s: st, h: m.hitT > 0, m: m.minion, mk: m.mark });
  }
  for (i = 0; i < s.pk.length; i++) if (!s.pk[i].taken) sc.pk.push([s.pk[i].x, s.pk[i].y, s.pk[i].kind]);
  for (i = 0; i < s.walls.length; i++) sc.walls.push(s.walls[i].hp);
  for (i = 0; i < s.arrows.length; i++) sc.arrows.push([s.arrows[i].x, s.arrows[i].y, Math.atan2(s.arrows[i].vy, s.arrows[i].vx)]);
  for (i = 0; i < s.bombs.length; i++) sc.bombs.push([s.bombs[i].x, s.bombs[i].y, s.bombs[i].t]);
  for (i = 0; i < s.shots.length; i++) sc.shots.push([s.shots[i].x, s.shots[i].y]);
  for (i = 0; i < s.expl.length; i++) sc.expl.push([s.expl[i].x, s.expl[i].y, s.expl[i].t, s.expl[i].dur, s.expl[i].r]);
  for (i = 0; i < s.shocks.length; i++) sc.shocks.push([s.shocks[i].x, s.shocks[i].y, s.shocks[i].t, s.shocks[i].dur, s.shocks[i].r]);
  for (i = 0; i < s.mags.length; i++) sc.mags.push([s.mags[i].x, s.mags[i].y, s.mags[i].t, s.mags[i].dur, s.mags[i].radius]);
  for (i = 0; i < s.poofs.length; i++) sc.poofs.push([s.poofs[i].x, s.poofs[i].y, s.poofs[i].t, s.poofs[i].dur]);
  for (i = 0; i < s.blasts.length; i++) sc.fuses.push([s.blasts[i].x, s.blasts[i].y]);
  return sc;
}

function stepSim() {
  var s = sim;
  if (s.over) return;
  s.time += DT;
  var p = s.p, L = s.L, i;
  stepPlayer(s);
  for (i = 0; i < s.mons.length; i++) if (s.mons[i].alive) updMon(s, s.mons[i]);
  stepProjectiles(s);
  stepPickups(s);
  // 怪物碰撞玩家
  for (i = 0; i < s.mons.length; i++) {
    var m = s.mons[i];
    if (m.alive && !m.fl && ov(m, p)) hurtPlayer(s, m.x);
  }
  // 寶箱
  if (L.chest && !s.chestOpen && ov({ x: L.chest.x, y: L.chest.y, w: 40, h: 36 }, p)) {
    s.chestOpen = true; s.item = L.chest.mark; s.notice = { type: L.chest.mark, t: 0, dur: 1.5 };
  }
  // 尖刺 / 墜落
  for (i = 0; i < L.spikes.length; i++) {
    var sp = L.spikes[i];
    if (ov({ x: sp.x, y: sp.y + 10, w: 40, h: 20 }, p)) { s.over = 'fail'; }
  }
  if (p.y > H) s.over = 'fail';
  if (!s.over && ov({ x: L.goal.x, y: L.goal.y, w: 40, h: 80 }, p)) { s.reached = true; s.over = 'clear'; }
  // 浮字計時
  for (i = s.pops.length - 1; i >= 0; i--) { s.pops[i].t += DT; if (s.pops[i].t >= s.pops[i].dur) s.pops.splice(i, 1); }
  finishChains(s);
  for (i = s.chainTexts.length - 1; i >= 0; i--) { s.chainTexts[i].t += DT; if (s.chainTexts[i].t >= s.chainTexts[i].dur) s.chainTexts.splice(i, 1); }
  if (s.notice) { s.notice.t += DT; if (s.notice.t >= s.notice.dur) s.notice = null; }
  s.sc = snapshot(s);
  if (s.over !== 'fail') s.frames.push(s.sc);
  if (s.over === 'fail') mode = 'fail';
  else if (s.over === 'clear') finishRun(s);
}

/* ---------- 過關與錄影 ---------- */
function makeRec(s) {
  var n = s.frames.length, step = Math.max(6, Math.ceil(n / 600)), pts = [];
  for (var i = 0; i < n; i += step) pts.push({ x: s.frames[i].p.x, y: s.frames[i].p.y });
  if (pts.length < 2) pts.push({ x: s.frames[n - 1].p.x, y: s.frames[n - 1].p.y });
  var tot = { wood: 0, ench: 0, time: 0 };
  for (var j = 0; j < s.events.length; j++) tot[s.events[j].k] += s.events[j].n;
  return { frames: s.frames, ev: s.events, dur: n * DT, cls: s.p.cls, clsIdx: s.cls, marks: s.marks.slice(), route: pts, tot: tot };
}
function finishRun(s) {
  var lv = s.lv;
  for (var i = 0; i < 3; i++) S.stock[KINDS[i]] += s.run[KINDS[i]];
  if (s.item && !S.chestTaken[lv] && S.items.length < 8) { S.items.push({ type: s.item }); S.chestTaken[lv] = true; }
  else if (s.item) S.chestTaken[lv] = true;
  var rec = makeRec(s);
  res = { lv: lv, rec: rec, old: S.rec[lv], time: rec.dur, run: { wood: s.run.wood, ench: s.run.ench, time: s.run.time }, cls: s.p.cls, item: s.item };
  if (!S.rec[lv]) { S.rec[lv] = rec; S.rp[lv] = { t: 0, ev: 0 }; }
  mode = 'result';
}

/* ---------- 回放與素材飛行 ---------- */
function spawnFly(lv, e) {
  var pos = CARDPOS[lv], n = e.n, cnt = Math.min(n, 5);
  for (var i = 0; i < cnt; i++) {
    var amt = 1;
    if (n > 5 && i === cnt - 1) amt = n - 4;
    var tg = HUD_TARGET[e.k];
    S.fly.push({ kind: e.k, x0: pos.x + 8 + e.x * 0.125 + (Math.random() * 12 - 6), y0: pos.y + 8 + e.y * 0.125 + (Math.random() * 12 - 6), tx: tg.x, ty: tg.y, t: 0, dur: 0.7, n: amt });
  }
}
function emitMat(lv, e) {
  if (mode === 'map' && !panel) spawnFly(lv, e);
  else { S.stock[e.k] += e.n; S.bump[e.k] = 0; }
}
function advReplays(dt) {
  for (var lv = 1; lv <= 8; lv++) {
    var r = S.rec[lv];
    if (!r) continue;
    var rp = S.rp[lv];
    rp.t += dt * ACCEL[S.accel[lv]];
    for (var pass = 0; pass < 2; pass++) {
      while (rp.ev < r.ev.length && r.ev[rp.ev].t <= rp.t) { emitMat(lv, r.ev[rp.ev]); rp.ev++; }
      if (pass === 0 && rp.t >= r.dur) { rp.t -= r.dur; rp.ev = 0; if (rp.t >= r.dur) rp.t = 0; } else break;
    }
  }
}
function updFlights(dt) {
  for (var i = S.fly.length - 1; i >= 0; i--) {
    var f = S.fly[i];
    f.t += dt;
    if (f.t >= f.dur) { S.stock[f.kind] += f.n; S.bump[f.kind] = 0; S.fly.splice(i, 1); }
  }
  for (var k = 0; k < 3; k++) S.bump[KINDS[k]] = Math.min(BUMP_DUR, S.bump[KINDS[k]] + dt);
}

/* ---------- 繪製: 關卡場景(即時 / 錄影 / 縮圖共用) ---------- */
function drawTerrain(c, L, walls) {
  var i;
  for (i = 0; i < L.ground.length; i++) { var gd = L.ground[i]; Art.drawGround(c, { x: gd.x, y: gd.y, top: gd.top, theme: L.theme }); }
  for (i = 0; i < L.spikes.length; i++) Art.drawSpike(c, { x: L.spikes[i].x, y: L.spikes[i].y });
  for (i = 0; i < L.walls.length; i++) if (walls[i] > 0) Art.drawCrackWall(c, { x: L.walls[i].x, y: L.walls[i].y, hp: walls[i] });
  for (i = 0; i < L.hooks.length; i++) Art.drawHookRing(c, { x: L.hooks[i].x, y: L.hooks[i].y });
}
var MON_FN = { boar: 'drawBoar', shield: 'drawShieldman', bee: 'drawShooterBee', frog: 'drawFrog' };
function drawMon(c, k, x, y, f, st, h, minion, t) {
  var o = { x: x, y: y, facing: f, state: st, hit: h, minion: minion };
  if (k !== 'frog') o.t = t;
  Art[MON_FN[k]](c, o);
}
function drawScene(c, L, sc, full) {
  var i;
  Art.drawBackground(c, {});
  drawTerrain(c, L, sc.walls);
  for (i = 0; i < sc.pk.length; i++) Art.drawPickup(c, { x: sc.pk[i][0], y: sc.pk[i][1], kind: sc.pk[i][2], t: sc.t });
  if (L.chest) Art.drawChest(c, { x: L.chest.x, y: L.chest.y, open: sc.chestOpen });
  Art.drawGoal(c, { x: L.goal.x, y: L.goal.y, reached: sc.reached });
  for (i = 0; i < sc.fuses.length; i++) Art.drawMarkAura(c, { x: sc.fuses[i][0], y: sc.fuses[i][1], type: 'blast', t: sc.t * 4 });
  for (i = 0; i < sc.mons.length; i++) {
    var m = sc.mons[i];
    if (m.mk) Art.drawMarkAura(c, { x: m.x, y: m.y, type: m.mk, t: sc.t });
    drawMon(c, m.k, m.x, m.y, m.f, m.s, m.h, m.m, sc.t);
  }
  if (full && sc.p.cls === 'hunter') Art.drawRangeRing(c, { x: sc.p.x, y: sc.p.y, radius: 260 });
  Art.drawPlayer(c, sc.p);
  if (sc.hook) Placeholder.hookLine(c, sc.hook.x1, sc.hook.y1, sc.hook.x2, sc.hook.y2);
  for (i = 0; i < sc.arrows.length; i++) Art.drawArrow(c, { x: sc.arrows[i][0], y: sc.arrows[i][1], angle: sc.arrows[i][2] });
  for (i = 0; i < sc.bombs.length; i++) Art.drawBomb(c, { x: sc.bombs[i][0], y: sc.bombs[i][1], t: sc.bombs[i][2] });
  for (i = 0; i < sc.shots.length; i++) Art.drawBeeShot(c, { x: sc.shots[i][0], y: sc.shots[i][1] });
  for (i = 0; i < sc.expl.length; i++) { var e = sc.expl[i]; Art.drawExplosion(c, { x: e[0], y: e[1], t: e[2], dur: e[3], radius: e[4] }); }
  for (i = 0; i < sc.shocks.length; i++) { var k = sc.shocks[i]; Art.drawShockwave(c, { x: k[0], y: k[1], t: k[2], dur: k[3], radius: k[4] }); }
  for (i = 0; i < sc.mags.length; i++) { var g = sc.mags[i]; Art.drawMagnetPulse(c, { x: g[0], y: g[1], t: g[2], dur: g[3], radius: g[4] }); }
  for (i = 0; i < sc.poofs.length; i++) { var o = sc.poofs[i]; Art.drawPoof(c, { x: o[0], y: o[1], t: o[2], dur: o[3] }); }
}

function drawHudMap() {
  Art.drawHud(ctx, { mode: 'map', stock: S.stock, ratePerMin: totalRates(), bumpT: S.bump, bumpDur: BUMP_DUR, time: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null, itemThisRun: null });
}

function drawLevelView() {
  var s = sim;
  drawScene(ctx, s.L, s.sc, true);
  for (var i = 0; i < s.pops.length; i++) { var o = s.pops[i]; Art.drawPopup(ctx, { x: o.x, y: o.y, t: o.t, dur: o.dur, kind: o.kind, value: Math.max(1, Math.min(9, o.value)) }); }
  for (var j = 0; j < s.chainTexts.length; j++) { var ct = s.chainTexts[j]; Art.drawChainText(ctx, { x: ct.x, y: ct.y, n: ct.n, t: ct.t, dur: ct.dur }); }
  if (s.notice) Art.drawItemNotice(ctx, { type: s.notice.type, t: s.notice.t, dur: s.notice.dur });
  Art.drawHud(ctx, {
    mode: 'level', stock: S.stock, ratePerMin: totalRates(), bumpT: S.bump, bumpDur: BUMP_DUR, time: round1(s.time), run: s.run, hp: s.p.hp, maxHp: 3,
    skillCdT: Math.min(s.p.skillDur, s.p.skillDur - s.p.cdSkill), skillCdDur: s.p.skillDur, cls: s.p.cls, itemThisRun: s.item
  });
}

function drawThumb(lv, x, y) {
  var r = S.rec[lv], rp = S.rp[lv];
  var fi = Math.min(Math.floor(rp.t / DT), r.frames.length - 1);
  ctx.save();
  ctx.translate(x + 8, y + 8);
  ctx.beginPath(); ctx.rect(0, 0, 160, 90); ctx.clip();
  ctx.scale(0.125, 0.125);
  drawScene(ctx, LEVELS[lv], r.frames[fi], false);
  ctx.restore();
}

function drawMap() {
  Art.drawMapBackground(ctx, {});
  var lv, i;
  for (i = 2; i <= 8; i++) {
    var ps = PARENTS[i];
    for (var q = 0; q < ps.length; q++) {
      var pp = CARDPOS[ps[q]], cp = CARDPOS[i];
      Art.drawMapLink(ctx, { x1: pp.x + 176, y1: pp.y + 68, x2: cp.x, y2: cp.y + 68, lit: !!S.rec[ps[q]] });
    }
  }
  for (lv = 1; lv <= 8; lv++) {
    var st = levelStatus(lv), pos = CARDPOS[lv];
    var cost = { wood: UNLOCK_COST[lv] || 0, ench: 0, time: 0 };
    var cleared = st === 'cleared';
    Art.drawLevelCard(ctx, {
      x: pos.x, y: pos.y, index: lv, name: LEVELS[lv].name, state: st, cost: cost, canAfford: S.stock.wood >= cost.wood,
      rates: cleared ? ratesShown(lv) : { wood: 0, ench: 0, time: 0 }, recordCls: cleared ? S.rec[lv].cls : null, recordTime: cleared ? round1(S.rec[lv].dur) : null
    });
    if (cleared) drawThumb(lv, pos.x, pos.y);
    Art.drawCardOverlay(ctx, { x: pos.x, y: pos.y, accelLv: cleared ? S.accel[lv] : 0, pending: cleared && isPending(lv), selected: cursor === lv && mode === 'map' });
  }
  Art.drawGoalCard(ctx, { x: CARDPOS[9].x, y: CARDPOS[9].y, cost: GOAL_COST, canAfford: canPay(GOAL_COST), selected: cursor === 9 && mode === 'map' });
  if (mode === 'map' || (paused && pausedMode === 'map')) {
    for (i = 0; i < S.fly.length; i++) {
      var f = S.fly[i], u = Math.min(1, f.t / f.dur);
      Art.drawFlyingMaterial(ctx, { x: f.x0 + (f.tx - f.x0) * u, y: f.y0 + (f.ty - f.y0) * u - Math.sin(Math.PI * u) * 90, kind: f.kind, t: f.t, dur: f.dur });
    }
  }
  drawHudMap();
  ctx.save();
  ctx.font = '16px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', W / 2, 702);
  ctx.restore();
}

function slotStates(lv) {
  var L = LEVELS[lv], o = [];
  for (var i = 0; i < 4; i++) {
    var sl = S.slots[lv][i];
    o.push({ sealed: !sl.un, type: sl.item ? sl.item.type : null, monster: L.mons[L.slotMon[i]].type });
  }
  return o;
}
function itemWhere(it) {
  for (var lv = 1; lv <= 8; lv++) for (var i = 0; i < 4; i++) if (S.slots[lv][i].item === it) return { level: lv, slot: i + 1 };
  return null;
}
function unsealCost(lv) {
  var n = 0;
  for (var i = 0; i < 4; i++) if (S.slots[lv][i].un) n++;
  return n >= 4 ? null : SLOT_COSTS[n - 1];
}
function drawPanel() {
  var lv = panel.lv, L = LEVELS[lv], cleared = !!S.rec[lv];
  var uc = unsealCost(lv), ac = S.accel[lv] >= 2 ? null : ACCEL_COSTS[S.accel[lv]];
  var classes = [];
  for (var i = 0; i < 3; i++) classes.push({ cls: CLSN[i], owned: S.owned[i], cost: S.owned[i] ? 0 : RECRUIT_COST, canAfford: S.stock.wood >= RECRUIT_COST });
  var items = [];
  for (var j = 0; j < S.items.length; j++) items.push({ type: S.items[j].type, where: itemWhere(S.items[j]) });
  Art.drawLevelPanel(ctx, {
    index: lv, name: L.name, row: panel.row, classes: classes, clsSel: panel.clsSel, slots: slotStates(lv), slotSel: panel.slotSel,
    unsealCost: uc === null ? 0 : uc, canAffordUnseal: uc !== null && S.stock.ench >= uc, items: items, pending: isPending(lv), accelLv: S.accel[lv],
    accelCost: ac, canAffordAccel: ac !== null && S.stock.time >= ac,
    recordCls: cleared ? S.rec[lv].cls : null, recordTime: cleared ? round1(S.rec[lv].dur) : null, rates: cleared ? ratesShown(lv) : null
  });
  // 預覽(靜態)
  ctx.save();
  ctx.translate(60, 96);
  ctx.beginPath(); ctx.rect(0, 0, 640, 360); ctx.clip();
  ctx.scale(0.5, 0.5);
  Art.drawBackground(ctx, {});
  var w3 = []; for (var k = 0; k < L.walls.length; k++) w3.push(3);
  drawTerrain(ctx, L, w3);
  for (var a = 0; a < L.pk.length; a++) Art.drawPickup(ctx, { x: L.pk[a].x, y: L.pk[a].y, kind: L.pk[a].kind, t: 0 });
  if (L.chest) Art.drawChest(ctx, { x: L.chest.x, y: L.chest.y, open: S.chestTaken[lv] });
  Art.drawGoal(ctx, { x: L.goal.x, y: L.goal.y, reached: false });
  for (var b = 0; b < L.mons.length; b++) {
    var m = L.mons[b];
    drawMon(ctx, m.type, m.x, m.y, -1, m.type === 'bee' ? 'fly' : (m.type === 'frog' ? 'crouch' : 'walk'), false, false, 0);
  }
  if (cleared) Art.drawRoutePath(ctx, { points: S.rec[lv].route, cls: S.rec[lv].cls });
  ctx.restore();
  var sl = S.slots[lv];
  for (var n = 0; n < 4; n++) {
    var mm = L.mons[L.slotMon[n]], d = MON[mm.type];
    Art.drawMarkSpot(ctx, { x: 60 + mm.x * 0.5, y: 96 + (mm.y - d.h / 2) * 0.5 - 30, sealed: !sl[n].un, type: sl[n].item ? sl[n].item.type : null });
  }
  var cm = L.mons[L.slotMon[panel.slotSel]];
  Art.drawSlotCursor(ctx, { x: 60 + cm.x * 0.5, y: 96 + cm.y * 0.5, active: panel.row === 1 });
}

var GUIDE = [
  { t: '衝到終點', s: '碰到旗子就過關', w: 854, h: 480 },
  { t: '操作', s: '空白鍵跳、Z 攻擊、X 技能(Esc 暫停)', w: 1000, h: 367 },
  { t: '過關後一直重播', s: '過關的關卡會一直重播賺素材', w: 768, h: 480 },
  { t: '撿多還是跑快', s: '撿越多、跑越快, 重播賺越快', w: 1000, h: 429 },
  { t: '寶箱裡的印記', s: '寶箱的印記能裝在怪物身上', w: 1000, h: 333 }
];
function drawGuide() {
  var g = GUIDE[guidePage];
  Art.drawMapBackground(ctx, {});
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px "Microsoft JhengHei", sans-serif';
  ctx.fillText(g.t, W / 2, 56);
  ctx.font = '26px "Microsoft JhengHei", sans-serif';
  ctx.fillText(g.s, W / 2, 112);
  ctx.restore();
  Art.drawGuidePage(ctx, { page: guidePage, x: Math.round((W - g.w) / 2), y: 170, w: g.w, h: g.h });
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
  ctx.font = '20px "Microsoft JhengHei", sans-serif';
  ctx.fillText('第 ' + (guidePage + 1) + ' / ' + GUIDE.length + ' 頁', W / 2, 676);
  ctx.font = '18px "Microsoft JhengHei", sans-serif';
  ctx.fillText('← → 翻頁    Z ' + (guidePage === GUIDE.length - 1 ? '開始' : '下一頁'), W / 2, 704);
  ctx.restore();
}

function render() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (mode === 'guide') { drawGuide(); return; }
  if (mode === 'level' || mode === 'result' || mode === 'fail') {
    drawLevelView();
    if (mode === 'result') {
      var cmp = !!res.old, mult = ACCEL[S.accel[res.lv]];
      var nr = { wood: round1(res.rec.tot.wood / res.rec.dur * 60 * mult), ench: round1(res.rec.tot.ench / res.rec.dur * 60 * mult), time: round1(res.rec.tot.time / res.rec.dur * 60 * mult) };
      var orr = null;
      if (cmp) orr = { wood: round1(res.old.tot.wood / res.old.dur * 60 * mult), ench: round1(res.old.tot.ench / res.old.dur * 60 * mult), time: round1(res.old.tot.time / res.old.dur * 60 * mult) };
      Art.drawResultPanel(ctx, { time: round1(res.time), run: res.run, rates: nr, cls: res.cls, item: res.item, oldTime: cmp ? round1(res.old.dur) : null, oldRates: orr, oldCls: cmp ? res.old.cls : null });
    } else if (mode === 'fail') Art.drawFailPanel(ctx, {});
  } else {
    drawMap();
    if (mode === 'panel') drawPanel();
    if (mode === 'ending') Art.drawEndingPanel(ctx, { totalTime: Math.floor(totalTime) });
  }
  if (paused) Art.drawPausePanel(ctx, { mode: pausedMode === 'level' ? 'level' : 'map' });
}

/* ---------- 輸入(只用鍵盤) ---------- */
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, Escape: 1 };

function colOf(id) { for (var i = 0; i < MAPCOLS.length; i++) if (MAPCOLS[i].indexOf(id) >= 0) return i; return 0; }
function moveCursor(dx, dy) {
  var ci = colOf(cursor);
  if (dy) {
    var col = MAPCOLS[ci], idx = col.indexOf(cursor) + dy;
    if (idx >= 0 && idx < col.length) cursor = col[idx];
    return;
  }
  var ni = ci + dx;
  if (ni < 0 || ni >= MAPCOLS.length) return;
  var cy = CARDPOS[cursor].y + 68, best = MAPCOLS[ni][0], bd = 1e9;
  for (var i = 0; i < MAPCOLS[ni].length; i++) {
    var d = Math.abs(CARDPOS[MAPCOLS[ni][i]].y + 68 - cy);
    if (d < bd) { bd = d; best = MAPCOLS[ni][i]; }
  }
  cursor = best;
}
function openPanel(lv) {
  panel = { lv: lv, row: 0, clsSel: S.lastCls[lv] || 0, slotSel: 0 };
  mode = 'panel';
}
function cycleSlot(lv, k) {
  var sl = S.slots[lv][k], idx = sl.item ? S.items.indexOf(sl.item) : -1, nx = idx + 1;
  if (nx >= S.items.length) { sl.item = null; return; }
  var it = S.items[nx];
  for (var l = 1; l <= 8; l++) for (var i = 0; i < 4; i++) if (S.slots[l][i].item === it) S.slots[l][i].item = null;
  sl.item = it;
}

function inputDown(code) {
  if (code === 'Escape') {
    if (paused) { paused = false; return; }
    if (mode === 'level' || mode === 'map' || mode === 'panel') { paused = true; pausedMode = mode; keys = {}; }
    return;
  }
  if (paused) {
    if (pausedMode === 'level') {
      if (code === 'KeyZ') { paused = false; startRun(sim.lv, sim.cls); }
      else if (code === 'KeyX') { paused = false; mode = 'map'; sim = null; }
    }
    return;
  }
  var m0 = mode;
  if (mode === 'guide') {
    if (code === 'ArrowLeft') guidePage = Math.max(0, guidePage - 1);
    else if (code === 'ArrowRight') guidePage = Math.min(GUIDE.length - 1, guidePage + 1);
    else if (code === 'KeyZ') { if (guidePage >= GUIDE.length - 1) mode = 'map'; else guidePage++; }
  } else if (mode === 'map') {
    if (code === 'ArrowLeft') moveCursor(-1, 0);
    else if (code === 'ArrowRight') moveCursor(1, 0);
    else if (code === 'ArrowUp') moveCursor(0, -1);
    else if (code === 'ArrowDown') moveCursor(0, 1);
    else if (code === 'Space') { mode = 'guide'; guidePage = 0; }
    else if (code === 'KeyZ') {
      if (cursor === 9) {
        if (canPay(GOAL_COST)) { S.stock.wood -= GOAL_COST.wood; S.stock.ench -= GOAL_COST.ench; S.stock.time -= GOAL_COST.time; mode = 'ending'; }
      } else {
        var st = levelStatus(cursor);
        if (st === 'buyable') { if (S.stock.wood >= UNLOCK_COST[cursor]) { S.stock.wood -= UNLOCK_COST[cursor]; S.unlocked[cursor] = true; } }
        else if (st === 'open' || st === 'cleared') openPanel(cursor);
      }
    }
  } else if (mode === 'panel') {
    var lv = panel.lv;
    if (code === 'KeyX') { mode = 'map'; panel = null; }
    else if (code === 'ArrowUp') panel.row = Math.max(0, panel.row - 1);
    else if (code === 'ArrowDown') panel.row = Math.min(2, panel.row + 1);
    else if (code === 'ArrowLeft' || code === 'ArrowRight') {
      var d = code === 'ArrowLeft' ? -1 : 1;
      if (panel.row === 0) panel.clsSel = Math.max(0, Math.min(2, panel.clsSel + d));
      else if (panel.row === 1) panel.slotSel = Math.max(0, Math.min(3, panel.slotSel + d));
    } else if (code === 'KeyZ') {
      if (panel.row === 0) {
        if (S.owned[panel.clsSel]) { startRun(lv, panel.clsSel); panel = null; }
        else if (S.stock.wood >= RECRUIT_COST) { S.stock.wood -= RECRUIT_COST; S.owned[panel.clsSel] = true; }
      } else if (panel.row === 1) {
        var sl = S.slots[lv][panel.slotSel];
        if (!sl.un) { var uc = unsealCost(lv); if (uc !== null && S.stock.ench >= uc) { S.stock.ench -= uc; sl.un = true; } }
        else cycleSlot(lv, panel.slotSel);
      } else {
        if (S.accel[lv] < 2 && S.stock.time >= ACCEL_COSTS[S.accel[lv]]) { S.stock.time -= ACCEL_COSTS[S.accel[lv]]; S.accel[lv]++; }
      }
    }
  } else if (mode === 'level') {
    if (code === 'KeyZ') inq.z = true;
    else if (code === 'KeyX') inq.x = true;
    else if (code === 'Space') inq.jump = true;
  } else if (mode === 'result') {
    if (res.old) {
      if (code === 'KeyZ') { S.rec[res.lv] = res.rec; S.rp[res.lv] = { t: 0, ev: 0 }; mode = 'map'; sim = null; }
      else if (code === 'KeyX') { mode = 'map'; sim = null; }
    } else if (code === 'KeyZ') { mode = 'map'; sim = null; }
  } else if (mode === 'fail') {
    if (code === 'KeyZ') startRun(sim.lv, sim.cls);
    else if (code === 'KeyX') { mode = 'map'; sim = null; }
  } else if (mode === 'ending') {
    if (code === 'KeyZ') resetAll();
  }
  if (mode !== m0 || mode !== 'level') { inq.z = inq.x = inq.jump = inq.cut = false; }
}

window.addEventListener('keydown', function (e) {
  if (GAME_KEYS[e.code]) e.preventDefault();
  if (e.repeat) return;
  if (!GAME_KEYS[e.code]) return;
  keys[e.code] = true;
  inputDown(e.code);
});
window.addEventListener('keyup', function (e) {
  if (GAME_KEYS[e.code]) e.preventDefault();
  keys[e.code] = false;
  if (e.code === 'Space' && mode === 'level' && !paused) inq.cut = true;
});
window.addEventListener('blur', function () { keys = {}; });

/* ---------- 主迴圈 ---------- */
function update(dt) {
  var running = !paused && mode !== 'guide' && mode !== 'ending';
  if (running) {
    totalTime += dt;
    advReplays(dt);
    updFlights(dt);
    if (mode === 'level') {
      acc += dt;
      while (acc >= DT && mode === 'level') { stepSim(); acc -= DT; }
    }
  }
}
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = lastTs === undefined ? 0 : (ts - lastTs) / 1000;
  lastTs = ts;
  dt = Math.max(0, Math.min(dt, 1 / 30));
  try { update(dt); render(); } catch (err) { console.error(err); }
}
resetAll();
requestAnimationFrame(frame);
