'use strict';
/* 岔路遠征 - 玩法驗證 Demo。邏輯固定 1/60 步進; 錄影 = 每步一個快照, 回放與關卡內畫面共用同一個繪製函式。 */

// ===== 常數 =====
var T = 40, COLS = 32, ROWS = 18, DT = 1 / 60, GRAV = 2400, MAXFALL = 1400;
var CW = (typeof Art !== 'undefined' && Art.canvas) ? Art.canvas.width : 1280;
var CH = (typeof Art !== 'undefined' && Art.canvas) ? Art.canvas.height : 720;
var KINDS = ['wood', 'iron', 'gem'];
var FONT = '"Microsoft JhengHei", "PingFang TC", sans-serif';
// 說明頁頁碼: 目前 art.js 的 drawGuidePage 用 0 起算; 若美術改成 1 起算只改這個常數
var GUIDE_PAGE_BASE = 0;

// ===== 佔位圖形(interface.json / style 沒有的) =====
var Placeholder = {
  // 獵人抓鉤的鉤索(規格註明由 RD 畫)
  hookLine: function (ctx, x1, y1, x2, y2) {
    ctx.save(); ctx.strokeStyle = '#e8e0c0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  },
  // 說明頁背景暗幕
  guideDim: function (ctx) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CW, CH); },
  // 說明頁示意圖外框
  guideFrame: function (ctx, x, y, w, h) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  }
};

// ===== 關卡資料 =====
var LEVEL_NAMES = ['草原', '峽谷', '古堡'];
var LV_DEF = [
  { // 1 草原
    pickups: [[100, 424, 'wood'], [400, 424, 'wood'], [520, 424, 'wood'], [640, 364, 'wood'], [820, 424, 'wood'], [920, 424, 'wood'],
      [480, 664, 'iron'], [620, 664, 'iron'], [780, 664, 'iron'], [960, 664, 'iron'],
      [520, 224, 'gem'], [600, 224, 'gem'], [680, 224, 'gem'], [760, 224, 'gem']],
    spikes: [],
    enemies: [['boar', 700, 440], ['frog', 360, 440], ['frog', 900, 440], ['shield', 700, 680], ['bee', 700, 170]]
  },
  { // 2 峽谷
    pickups: [[100, 424, 'wood'], [340, 424, 'wood'], [540, 424, 'wood'], [660, 364, 'wood'], [860, 424, 'wood'], [930, 364, 'wood'],
      [460, 664, 'iron'], [580, 664, 'iron'], [700, 664, 'iron'], [820, 664, 'iron'], [960, 664, 'iron'],
      [500, 224, 'gem'], [560, 224, 'gem'], [740, 224, 'gem'], [790, 224, 'gem'], [830, 224, 'gem']],
    spikes: [[10, 10], [10, 19], [10, 23], [16, 21], [5, 16]],
    enemies: [['boar', 560, 440], ['boar', 880, 440], ['frog', 470, 440], ['frog', 780, 440], ['shield', 920, 440],
      ['shield', 600, 680], ['shield', 900, 680], ['bee', 580, 170], ['bee', 800, 170]]
  },
  { // 3 古堡
    pickups: [[100, 424, 'wood'], [340, 424, 'wood'], [480, 424, 'wood'], [600, 364, 'wood'], [700, 424, 'wood'], [880, 424, 'wood'], [930, 364, 'wood'],
      [440, 664, 'iron'], [560, 664, 'iron'], [660, 664, 'iron'], [780, 664, 'iron'], [960, 664, 'iron'], [1040, 664, 'iron'],
      [500, 224, 'gem'], [540, 224, 'gem'], [660, 224, 'gem'], [700, 224, 'gem'], [740, 224, 'gem'], [830, 224, 'gem']],
    spikes: [[10, 9], [10, 13], [10, 20], [10, 24], [16, 12], [16, 22], [5, 15], [5, 19]],
    enemies: [['boar', 520, 440], ['boar', 860, 440], ['frog', 380, 440], ['frog', 700, 440], ['bee', 950, 330],
      ['shield', 560, 680], ['shield', 840, 680], ['boar', 1000, 680],
      ['bee', 560, 170], ['bee', 800, 170], ['frog', 700, 240]]
  }
];

// 格子: 0 空 1 地 2 裂岩牆 3 脆地板
function buildGrid() {
  var g = [], r, c;
  for (r = 0; r < ROWS; r++) { g.push([]); for (c = 0; c < COLS; c++) g[r].push(0); }
  function fill(r0, r1, c0, c1, v) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) g[rr][cc] = v; }
  fill(1, 1, 0, 31, 1);        // 天花板
  fill(11, 17, 0, 31, 1);      // 中層地面與地下實心
  // 入口一: 階梯凹槽 + 裂岩牆(劍士)
  g[11][6] = 0; g[12][6] = 0;                 // 第一階(深 2 格)
  fill(11, 14, 7, 7, 0);                      // 第二階
  fill(12, 16, 8, 8, 0);                      // 底部(上方 row11 為頂蓋)
  fill(13, 16, 9, 9, 2);                      // 裂岩牆
  // 下層隧道
  fill(13, 16, 10, 31, 0);
  // 入口二: 脆地板(炸彈工)
  g[11][15] = 3; g[11][16] = 3; g[12][15] = 0; g[12][16] = 0;
  // 出口: 高台 + 煙囪(往下跳 3 格接回中層)
  fill(8, 10, 25, 26, 1);
  fill(2, 12, 27, 31, 0);
  fill(16, 16, 30, 31, 1); g[14][28] = 1; g[12][31] = 1; g[10][27] = 1;
  // 上層平台
  fill(6, 6, 12, 20, 1);
  return g;
}
var BASE_GRID = buildGrid();
var START = { x: 60, y: 418 };
var GOAL = { x: 980, y: 400, w: 40, h: 80 };
var RINGS = [{ x: 462, y: 252 }];

var ENEMY_TYPES = {
  boar: { w: 48, h: 32, hp: 3, kind: 'wood', val: 2 },
  shield: { w: 32, h: 44, hp: 2, kind: 'iron', val: 2 },
  bee: { w: 32, h: 32, hp: 1, kind: 'gem', val: 1 },
  frog: { w: 32, h: 28, hp: 2, kind: 'wood', val: 1 }
};
var CLS = {
  sword: { speed: 260, skillDur: 1.2 },
  hunter: { speed: 260, skillDur: 0.5 },
  bomber: { speed: 220, skillDur: 2 }
};
var CLS_IDS = ['sword', 'hunter', 'bomber'];
var CLS_NAMES = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };

function C3(w, i, g) { return { wood: w || 0, iron: i || 0, gem: g || 0 }; }
var LEVEL_COST = [C3(0, 0, 0), C3(30, 10, 0), C3(50, 0, 20)];
var CLASS_COST = { sword: C3(0, 0, 0), hunter: C3(40, 20, 0), bomber: C3(0, 40, 30) };
var TRAIN_COST = [C3(30, 0, 0), C3(40, 30, 0), C3(0, 40, 40)];
var GOAL_COST = C3(150, 120, 120);

var LEVEL_POS = [[30, 50], [440, 50], [850, 50]];
var CLASS_POS = [[30, 350], [290, 350], [550, 350]];
var TRAIN_POS = [810, 350];
var GOAL_POS = [30, 510];

var LV = [];
function makeEnemy(s) {
  var d = ENEMY_TYPES[s[0]];
  var e = { type: s[0], x: s[1], y: 0, w: d.w, h: d.h, hp: d.hp, alive: true, facing: -1, state: 'walk',
    st: 0, hitT: 0, vx: 0, vy: 0, blockT: 0, baseY: 0, shotT: 0, jumpT: 0, landT: 0, air: false };
  if (s[0] === 'bee') { e.baseY = s[2]; e.y = s[2]; e.state = 'hover'; }
  else { e.y = s[2] - d.h / 2; if (s[0] === 'frog') e.state = 'crouch'; }
  return e;
}
(function () {
  for (var n = 0; n < 3; n++) {
    var d = LV_DEF[n];
    LV.push({ n: n, grid: BASE_GRID, pickups: d.pickups, spikes: d.spikes, enemies: d.enemies });
  }
})();

// ===== 全域遊戲資料 =====
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var stock, unlocked, owned, curCls, trainLv, replays, totalTime;
var screen, guidePage, guideReturn, paused, sel, L, resultInfo, held, STATIC_REC;
var winW = 0;

function resetAll() {
  stock = C3(0, 0, 0); unlocked = [true, false, false];
  owned = { sword: true, hunter: false, bomber: false }; curCls = 'sword'; trainLv = 0;
  replays = [null, null, null]; totalTime = 0;
  screen = 'guide'; guidePage = 0; guideReturn = 'map'; paused = false; sel = { row: 0, col: 0 };
  L = null; resultInfo = null;
  if (!held) held = {};
}
resetAll();
STATIC_REC = [];

function emptyEv() { return { gains: [], poofs: [], expl: [], taken: {}, broken: {} }; }

function afford(c) { return stock.wood >= c.wood && stock.iron >= c.iron && stock.gem >= c.gem; }
function pay(c) { stock.wood -= c.wood; stock.iron -= c.iron; stock.gem -= c.gem; }

// ===== 共用小工具 =====
function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh; }
function circleRect(cx, cy, r, rx, ry, rw, rh) {
  var dx = Math.max(Math.abs(cx - rx) - rw / 2, 0), dy = Math.max(Math.abs(cy - ry) - rh / 2, 0);
  return dx * dx + dy * dy <= r * r;
}
function sgn(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }

function cellAt(r, c) {
  if (c < 0 || c >= COLS || r < 0) return 1;
  if (r >= ROWS) return 0;
  return L.grid[r][c];
}

// ===== 關卡建立 =====
function newLevel(n) {
  var def = LV[n], i;
  var g = [];
  for (i = 0; i < ROWS; i++) g.push(def.grid[i].slice());
  var pk = def.pickups.map(function (a) { return { x: a[0], y: a[1], kind: a[2] }; });
  var en = def.enemies.map(makeEnemy);
  L = {
    n: n, def: def, grid: g, pickups: pk, enemies: en, arrows: [], bombs: [], shots: [],
    rec: { frames: [], ev: emptyEv() }, run: C3(0, 0, 0), steps: 0, fIdx: 0, over: false,
    pend: { jump: false, z: false, x: false },
    p: { x: START.x, y: START.y, w: 28, h: 44, vx: 0, vy: 0, facing: 1, onGround: false, cls: curCls, hp: 3,
      invT: 0, kbT: 0, kbV: 0, hurtT: 0, dashT: 0, dashDir: 1, dashHit: {}, dashFlash: {}, hook: null,
      atkCd: 0, skillCd: 0, autoT: 0.3, pose: 'idle', poseT: 0, actPose: null, actT: 0, blastT: 0,
      jumping: false, jumpT: 0 }
  };
  L.rec.frames.push(snapshot());
  screen = 'level'; paused = false;
}

function snapshot() {
  var p = L.p;
  var fr = { p: [p.x, p.y, p.cls, p.facing, p.pose, p.poseT, p.invT > 0, p.hook ? p.hook.x : null, p.hook ? p.hook.y : null],
    e: [], a: [], b: [], s: [] };
  var i;
  for (i = 0; i < L.enemies.length; i++) { var e = L.enemies[i]; fr.e.push([e.x, e.y, e.facing, enemyDisplayState(e), e.hitT > 0, e.alive]); }
  for (i = 0; i < L.arrows.length; i++) fr.a.push([L.arrows[i].x, L.arrows[i].y, L.arrows[i].ang]);
  for (i = 0; i < L.bombs.length; i++) fr.b.push([L.bombs[i].x, L.bombs[i].y, L.bombs[i].age]);
  for (i = 0; i < L.shots.length; i++) fr.s.push([L.shots[i].x, L.shots[i].y]);
  return fr;
}
function enemyDisplayState(e) {
  if (e.type === 'shield') return e.blockT > 0 ? 'block' : 'walk';
  return e.state;
}

// 開放但未過關的卡片縮圖: 靜止的關卡, 沒有玩家
function staticRec(n) {
  if (STATIC_REC[n]) return STATIC_REC[n];
  var en = LV[n].enemies.map(makeEnemy), fr = { p: null, e: [], a: [], b: [], s: [] };
  for (var i = 0; i < en.length; i++) fr.e.push([en[i].x, en[i].y, en[i].facing, en[i].state, false, true]);
  STATIC_REC[n] = { frames: [fr], ev: emptyEv() };
  return STATIC_REC[n];
}

// ===== 碰撞移動 =====
function breakCell(r, c) {
  var v = L.grid[r][c];
  if (v !== 2 && v !== 3) return;
  var stack = [[r, c]];
  while (stack.length) {
    var q = stack.pop(), rr = q[0], cc = q[1];
    if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS || L.grid[rr][cc] !== v) continue;
    L.grid[rr][cc] = 0;
    L.rec.ev.broken[rr * COLS + cc] = L.fIdx;
    L.rec.ev.poofs.push({ f: L.fIdx, x: cc * T + 20, y: rr * T + 20 });
    if (v === 2) { stack.push([rr + 1, cc], [rr - 1, cc], [rr, cc + 1], [rr, cc - 1]); }
  }
}
function moveX(b, dx, canBreak) {
  if (dx === 0) return false;
  b.x += dx;
  var x0 = Math.floor((b.x - b.w / 2) / T), x1 = Math.floor((b.x + b.w / 2 - 0.001) / T);
  var y0 = Math.floor((b.y - b.h / 2) / T), y1 = Math.floor((b.y + b.h / 2 - 0.001) / T);
  var c, r, hit = false;
  for (var k = 0; k <= x1 - x0; k++) {
    c = dx > 0 ? x0 + k : x1 - k;
    var solid = false;
    for (r = y0; r <= y1; r++) {
      var v = cellAt(r, c);
      if (v === 2 && canBreak) { breakCell(r, c); continue; }
      if (v) solid = true;
    }
    if (solid) {
      b.x = dx > 0 ? c * T - b.w / 2 : (c + 1) * T + b.w / 2;
      hit = true; break;
    }
  }
  return hit;
}
// 回傳 1 = 落地 / -1 = 撞頭 / 0 = 無
function moveY(b, dy) {
  if (dy === 0) return 0;
  b.y += dy;
  var x0 = Math.floor((b.x - b.w / 2) / T), x1 = Math.floor((b.x + b.w / 2 - 0.001) / T);
  var y0 = Math.floor((b.y - b.h / 2) / T), y1 = Math.floor((b.y + b.h / 2 - 0.001) / T);
  var c, r;
  for (var k = 0; k <= y1 - y0; k++) {
    r = dy > 0 ? y0 + k : y1 - k;
    for (c = x0; c <= x1; c++) {
      if (cellAt(r, c)) {
        if (dy > 0) { b.y = r * T - b.h / 2; return 1; }
        b.y = (r + 1) * T + b.h / 2; return -1;
      }
    }
  }
  return 0;
}
function groundAhead(e, dir) {
  var px = e.x + dir * (e.w / 2 + 2), py = e.y + e.h / 2 + 4;
  return cellAt(Math.floor(py / T), Math.floor(px / T)) !== 0;
}

// ===== 得分 / 特效 =====
function addGain(kind, value, x, y) {
  L.run[kind] += value;
  L.rec.ev.gains.push({ f: L.fIdx, kind: kind, value: value, x: x, y: y });
}
function killEnemy(e) {
  e.alive = false;
  L.rec.ev.poofs.push({ f: L.fIdx, x: e.x, y: e.y });
  var d = ENEMY_TYPES[e.type];
  addGain(d.kind, d.val, e.x, e.y - 12);
}
function shieldBlocks(e, sx, sy) {
  if (e.type !== 'shield') return false;
  return (sx - e.x) * e.facing > 0 && sy >= e.y - e.h / 2;
}
// 回傳 'blocked' | 'hit' | 'killed'
function attackEnemy(e, dmg, sx, sy, isBlast) {
  if (!isBlast && shieldBlocks(e, sx, sy)) { e.blockT = 0.2; e.hitT = 0.1; return 'blocked'; }
  e.hp -= dmg; e.hitT = 0.1;
  if (e.hp <= 0) { killEnemy(e); return 'killed'; }
  return 'hit';
}
function explode(x, y, damage) {
  L.rec.ev.expl.push({ f: L.fIdx, x: x, y: y });
  if (!damage) return;
  var i, r, c;
  for (i = 0; i < L.enemies.length; i++) {
    var e = L.enemies[i];
    if (e.alive && circleRect(x, y, 60, e.x, e.y, e.w, e.h)) attackEnemy(e, 2, x, y, true);
  }
  for (r = Math.floor((y - 60) / T); r <= Math.floor((y + 60) / T); r++)
    for (c = Math.floor((x - 60) / T); c <= Math.floor((x + 60) / T); c++)
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && L.grid[r][c] === 3 && circleRect(x, y, 60, c * T + 20, r * T + 20, T, T)) breakCell(r, c);
}

// ===== 玩家 =====
function failLevel() { if (L.over) return; L.over = true; screen = 'fail'; }
function hurtPlayer(fromX) {
  var p = L.p;
  if (p.invT > 0 || p.dashT > 0 || L.over) return;
  p.hp -= 1; p.invT = 1; p.hurtT = 0.25;
  if (p.hp <= 0) { failLevel(); return; }
  if (!p.hook) {
    var dir = sgn(p.x - fromX) || -p.facing;
    p.kbT = 0.15; p.kbV = dir * 80 / 0.15;
  }
}
function nearestEnemy(range) {
  var p = L.p, best = null, bd = range + 1;
  for (var i = 0; i < L.enemies.length; i++) {
    var e = L.enemies[i]; if (!e.alive) continue;
    var d = Math.sqrt((e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y));
    if (d <= range && d < bd) { bd = d; best = e; }
  }
  return best;
}
function fireArrow(ang, max) {
  var p = L.p;
  L.arrows.push({ x: p.x + Math.cos(ang) * 14, y: p.y - 4 + Math.sin(ang) * 14, vx: Math.cos(ang) * 700, vy: Math.sin(ang) * 700, ang: ang, dist: 0, max: max });
}
function setAct(pose, t) { var p = L.p; p.actPose = pose; p.actT = t; }

function stepPlayer() {
  var p = L.p, pend = L.pend, cd = CLS[p.cls];
  p.atkCd = Math.max(0, p.atkCd - DT); p.skillCd = Math.max(0, p.skillCd - DT);
  p.invT = Math.max(0, p.invT - DT); p.kbT = Math.max(0, p.kbT - DT); p.hurtT = Math.max(0, p.hurtT - DT);
  p.blastT = Math.max(0, p.blastT - DT);
  if (p.actT > 0) { p.actT -= DT; if (p.actT <= 0) p.actPose = null; }
  var dir = (held.ArrowRight ? 1 : 0) - (held.ArrowLeft ? 1 : 0);
  var speed = cd.speed * (1 + 0.1 * trainLv);
  var dashing = p.dashT > 0, hooking = !!p.hook;

  // 攻擊與技能
  if (pend.z && !hooking && !dashing) {
    if (p.cls === 'sword' && p.atkCd <= 0) {
      p.atkCd = 0.3; setAct('slash', 0.15);
      var sx = p.x + p.facing * 39;
      for (var i = 0; i < L.enemies.length; i++) {
        var e = L.enemies[i];
        if (e.alive && overlap(sx, p.y, 50, 40, e.x, e.y, e.w, e.h)) attackEnemy(e, 1, p.x, p.y, false);
      }
    } else if (p.cls === 'hunter' && p.atkCd <= 0) {
      p.atkCd = 0.4; setAct('shoot', 0.15);
      fireArrow(p.facing > 0 ? 0 : Math.PI, 600);
    } else if (p.cls === 'bomber' && p.atkCd <= 0) {
      p.atkCd = 0.6; setAct('throw', 0.15);
      L.bombs.push({ x: p.x + p.facing * 10, y: p.y - 10, vx: p.facing * 300, vy: -500, age: 0 });
    }
  }
  if (pend.x && !hooking && !dashing && p.skillCd <= 0) {
    if (p.cls === 'sword') {
      p.dashT = 0.18; p.dashDir = p.facing; p.skillCd = cd.skillDur; p.dashHit = {}; p.dashFlash = {};
    } else if (p.cls === 'hunter') {
      var best = null, bd = 221;
      for (var j = 0; j < RINGS.length; j++) {
        var rg = RINGS[j], d = Math.sqrt((rg.x - p.x) * (rg.x - p.x) + (rg.y - p.y) * (rg.y - p.y));
        if (d <= 220 && d < bd) { bd = d; best = rg; }
      }
      if (best) { p.hook = { x: best.x, y: best.y }; p.skillCd = cd.skillDur; }
    } else if (p.cls === 'bomber' && p.onGround) {
      p.skillCd = cd.skillDur; p.vy = -1000; p.onGround = false; p.blastT = 0.3; p.jumping = false;
      explode(p.x, p.y + 22, false);
    }
  }
  dashing = p.dashT > 0; hooking = !!p.hook;

  // 獵人自動射擊
  p.autoT = Math.max(0, p.autoT - DT);
  if (p.cls === 'hunter' && p.autoT <= 0) {
    var tg = nearestEnemy(260);
    if (tg) { p.autoT = 0.6; fireArrow(Math.atan2(tg.y - p.y, tg.x - p.x), 520); }
  }

  if (hooking) {
    var dx = p.hook.x - p.x, dy = p.hook.y - p.y, dist = Math.sqrt(dx * dx + dy * dy), stepLen = 700 * DT;
    if (dist <= stepLen + 0.5) { p.x = p.hook.x; p.y = p.hook.y; p.hook = null; p.vy = -500; p.vx = 0; p.onGround = false; }
    else { p.x += dx / dist * stepLen; p.y += dy / dist * stepLen; }
  } else if (dashing) {
    p.dashT -= DT;
    p.vy = 0;
    var hitW = moveX(p, p.dashDir * 160 / 0.18 * DT, true);
    // 衝刺傷害
    for (var k = 0; k < L.enemies.length; k++) {
      var en = L.enemies[k];
      if (!en.alive || p.dashHit[k]) continue;
      if (overlap(p.x, p.y, p.w, p.h, en.x, en.y, en.w, en.h)) {
        var res = attackEnemy(en, 2, p.x, p.y, false);
        if (res === 'blocked') { /* 擋下: 之後繞到背後還能再判 */ }
        else { p.dashHit[k] = true; if (res === 'killed') p.skillCd = 0; }
      }
    }
    if (hitW) p.dashT = 0;
    if (p.dashT <= 0) { p.vx = 0; }
  } else {
    // 水平
    if (p.kbT > 0) p.vx = p.kbV;
    else {
      p.vx = dir * speed;
      if (dir !== 0) p.facing = dir;
    }
    // 跳躍
    if (pend.jump && p.onGround && p.kbT <= 0) { p.vy = -720; p.onGround = false; p.jumping = true; p.jumpT = 0; }
    if (p.jumping) {
      p.jumpT += DT;
      if (!held.Space && p.vy < -360 && p.jumpT < 0.15) { p.vy = -360; p.jumping = false; }
      if (p.vy >= 0 || p.jumpT >= 0.15) { if (!held.Space || p.vy >= 0) p.jumping = false; }
    }
    p.vy = Math.min(MAXFALL, p.vy + GRAV * DT);
    moveX(p, p.vx * DT, false);
    var r = moveY(p, p.vy * DT);
    if (r === 1) { p.onGround = true; p.vy = 0; p.jumping = false; }
    else { p.onGround = false; if (r === -1) { p.vy = 0; p.jumping = false; } }
  }
  p.x = Math.max(p.w / 2, Math.min(CW - p.w / 2, p.x));
  pend.jump = false; pend.z = false; pend.x = false;

  // 姿勢
  var pose;
  if (p.hurtT > 0) pose = 'hurt';
  else if (p.dashT > 0) pose = 'dash';
  else if (p.hook) pose = 'hook';
  else if (p.blastT > 0 && p.vy < 0) pose = 'blast';
  else if (p.actPose) pose = p.actPose;
  else if (!p.onGround) pose = p.vy < 0 ? 'rise' : 'fall';
  else pose = Math.abs(p.vx) > 1 ? 'run' : 'idle';
  if (pose !== p.pose) { p.pose = pose; p.poseT = 0; } else p.poseT += DT;
}

// ===== 怪物 =====
function stepEnemies() {
  var p = L.p, t = L.steps * DT;
  for (var i = 0; i < L.enemies.length; i++) {
    var e = L.enemies[i];
    if (!e.alive) continue;
    e.hitT = Math.max(0, e.hitT - DT); e.blockT = Math.max(0, e.blockT - DT);
    var dxp = p.x - e.x;
    if (e.type === 'bee') {
      e.y = e.baseY + Math.sin(2 * Math.PI * t / 2) * 20;
      e.facing = dxp >= 0 ? 1 : -1;
      var dist = Math.sqrt(dxp * dxp + (p.y - e.y) * (p.y - e.y));
      if (dist <= 400) {
        e.shotT += DT;
        if (e.shotT >= 2) {
          e.shotT = 0; e.state = 'hover';
          var ang = Math.atan2(p.y - e.y, p.x - e.x);
          L.shots.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220 });
        } else if (e.shotT >= 1.6) e.state = 'aim';
        else e.state = 'hover';
      } else { e.shotT = 0; e.state = 'hover'; }
      continue;
    }
    // 地面怪: 重力
    e.vy = Math.min(MAXFALL, e.vy + GRAV * DT);
    var landed = moveY(e, e.vy * DT) === 1;
    if (landed) e.vy = 0;

    if (e.type === 'boar') {
      var sameLayer = Math.abs((p.y + 22) - (e.y + e.h / 2)) < 60;
      if (e.state === 'walk') {
        if (sameLayer && Math.abs(dxp) <= 240 && dxp * e.facing > 0) { e.state = 'windup'; e.st = 0; }
        else {
          if (!groundAhead(e, e.facing)) e.facing = -e.facing;
          else if (moveX(e, e.facing * 80 * DT, false)) e.facing = -e.facing;
        }
      } else if (e.state === 'windup') {
        e.st += DT; if (e.st >= 0.5) { e.state = 'charge'; e.st = 0; }
      } else if (e.state === 'charge') {
        if (!groundAhead(e, e.facing)) { e.state = 'stun'; e.st = 0; }
        else if (moveX(e, e.facing * 420 * DT, false)) { e.state = 'stun'; e.st = 0; }
      } else if (e.state === 'stun') {
        e.st += DT; if (e.st >= 1) { e.state = 'walk'; e.st = 0; }
      }
    } else if (e.type === 'shield') {
      if (Math.abs(dxp) > 4) {
        e.facing = dxp > 0 ? 1 : -1;
        if (groundAhead(e, e.facing)) moveX(e, e.facing * 40 * DT, false);
      }
    } else if (e.type === 'frog') {
      var inAir = !landed;
      if (inAir) { e.state = 'jump'; e.air = true; }
      else {
        if (e.air) { e.air = false; e.landT = 0; e.vx = 0; }
        e.state = 'crouch';
        e.landT += DT; e.jumpT += DT;
        var fd = Math.sqrt(dxp * dxp + (p.y - e.y) * (p.y - e.y));
        if (fd <= 300 && e.jumpT >= 1.5 && e.landT >= 0.3) {
          var dir = dxp >= 0 ? 1 : -1;
          e.facing = dir;
          var tx = e.x + dir * 120, row = Math.floor((e.y + e.h / 2 + 2) / T);
          if (cellAt(row, Math.floor(tx / T)) !== 0 && cellAt(row - 1, Math.floor(tx / T)) === 0) {
            e.vx = dir * 232; e.vy = -620; e.jumpT = 0; e.state = 'jump'; e.air = true;
          } else e.jumpT = 1.0;
        }
      }
      if (e.air && e.vx !== 0) { if (moveX(e, e.vx * DT, false)) e.vx = 0; }
    }
  }
}

function stepProjectiles() {
  var p = L.p, i, j, k;
  // 箭
  for (i = L.arrows.length - 1; i >= 0; i--) {
    var a = L.arrows[i], gone = false;
    for (k = 0; k < 2 && !gone; k++) {
      a.x += a.vx * DT / 2; a.y += a.vy * DT / 2; a.dist += 700 * DT / 2;
      if (cellAt(Math.floor(a.y / T), Math.floor(a.x / T)) !== 0 || a.dist > a.max || a.x < 0 || a.x > CW) { gone = true; break; }
      for (j = 0; j < L.enemies.length; j++) {
        var e = L.enemies[j];
        if (e.alive && overlap(a.x, a.y, 4, 4, e.x, e.y, e.w, e.h)) { attackEnemy(e, 1, a.x, a.y, false); gone = true; break; }
      }
    }
    if (gone) L.arrows.splice(i, 1);
  }
  // 炸彈
  for (i = L.bombs.length - 1; i >= 0; i--) {
    var b = L.bombs[i];
    b.age += DT; b.vy = Math.min(MAXFALL, b.vy + GRAV * DT);
    b.x += b.vx * DT; b.y += b.vy * DT;
    var boom = false;
    if (b.y > CH + 60 || b.x < -20 || b.x > CW + 20) { L.bombs.splice(i, 1); continue; }
    var x0 = Math.floor((b.x - 8) / T), x1 = Math.floor((b.x + 7.99) / T), y0 = Math.floor((b.y - 8) / T), y1 = Math.floor((b.y + 7.99) / T), rr, cc;
    for (rr = y0; rr <= y1 && !boom; rr++) for (cc = x0; cc <= x1; cc++) if (cellAt(rr, cc)) { boom = true; break; }
    if (!boom) for (j = 0; j < L.enemies.length; j++) {
      var en = L.enemies[j];
      if (en.alive && overlap(b.x, b.y, 16, 16, en.x, en.y, en.w, en.h)) { boom = true; break; }
    }
    if (boom) { L.bombs.splice(i, 1); explode(b.x, b.y, true); }
  }
  // 蜂彈
  for (i = L.shots.length - 1; i >= 0; i--) {
    var s = L.shots[i];
    s.x += s.vx * DT; s.y += s.vy * DT;
    if (cellAt(Math.floor(s.y / T), Math.floor(s.x / T)) !== 0 || s.x < -20 || s.x > CW + 20 || s.y < -20 || s.y > CH + 20) { L.shots.splice(i, 1); continue; }
    if (overlap(s.x, s.y, 12, 12, p.x, p.y, p.w, p.h)) { L.shots.splice(i, 1); hurtPlayer(s.x - s.vx); if (L.over) return; }
  }
}

function stepHazards() {
  var p = L.p, i;
  // 尖刺(下半 40x20), 衝刺中無敵
  if (p.dashT <= 0) {
    for (i = 0; i < L.def.spikes.length; i++) {
      var sp = L.def.spikes[i];
      if (overlap(p.x, p.y, p.w, p.h, sp[1] * T + 20, sp[0] * T + 30, 40, 20)) { failLevel(); return; }
    }
  }
  if (p.y - p.h / 2 > CH) { failLevel(); return; }
  // 怪物接觸
  for (i = 0; i < L.enemies.length; i++) {
    var e = L.enemies[i];
    if (e.alive && overlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) { hurtPlayer(e.x); if (L.over) return; }
  }
  // 素材
  for (i = 0; i < L.pickups.length; i++) {
    var k = L.pickups[i];
    if (L.rec.ev.taken[i] === undefined && overlap(p.x, p.y, p.w, p.h, k.x, k.y, 24, 24)) {
      L.rec.ev.taken[i] = L.fIdx; addGain(k.kind, 1, k.x, k.y - 12);
    }
  }
}

function stepLevel() {
  L.fIdx = L.rec.frames.length;
  L.steps++;
  stepPlayer();
  stepEnemies();
  stepProjectiles();
  if (!L.over) stepHazards();
  if (L.over) return;
  L.rec.frames.push(snapshot());
  if (overlap(L.p.x, L.p.y, L.p.w, L.p.h, GOAL.x, GOAL.y, GOAL.w, GOAL.h)) finishLevel();
}

function makeRates(run, time) {
  return { wood: run.wood / time * 60, iron: run.iron / time * 60, gem: run.gem / time * 60 };
}
function makeReplay() {
  var time = L.steps * DT, byF = {};
  L.rec.ev.gains.forEach(function (g) { (byF[g.f] = byF[g.f] || []).push(g); });
  return { n: L.n, cls: L.p.cls, rec: L.rec, N: L.rec.frames.length, time: time,
    run: { wood: L.run.wood, iron: L.run.iron, gem: L.run.gem }, rates: makeRates(L.run, time), f: -1, byF: byF };
}
function finishLevel() {
  L.over = true;
  var rp = makeReplay();
  KINDS.forEach(function (k) { stock[k] += L.run[k]; });   // 素材只在過關時入帳
  if (!replays[L.n]) { replays[L.n] = rp; resultInfo = { fresh: rp, old: null }; }
  else resultInfo = { fresh: rp, old: replays[L.n] };
  screen = 'result';
}

// ===== 回放 =====
function tickReplays() {
  for (var i = 0; i < 3; i++) {
    var rp = replays[i]; if (!rp) continue;
    rp.f++; if (rp.f >= rp.N) rp.f = 0;
    var g = rp.byF[rp.f];
    if (g) for (var j = 0; j < g.length; j++) stock[g[j].kind] += g[j].value;
  }
}
function ratePerMin() {
  var r = C3(0, 0, 0);
  for (var i = 0; i < 3; i++) if (replays[i]) KINDS.forEach(function (k) { r[k] += replays[i].rates[k]; });
  return r;
}

function tick() {
  if (paused || screen === 'guide' || screen === 'ending') return;
  totalTime += DT;
  tickReplays();
  if (screen === 'level') stepLevel();
}

// ===== 繪製: 關卡場景(關卡內與縮圖共用) =====
function drawScene(c, n, rec, f, opt) {
  var fr = rec.frames[f], ev = rec.ev, t = f * DT, base = LV[n].grid, r, cc, i;
  function cellF(rr, c2) {
    if (rr < 0 || rr >= ROWS || c2 < 0 || c2 >= COLS) return 0;
    var v = base[rr][c2];
    if ((v === 2 || v === 3) && ev.broken[rr * COLS + c2] !== undefined && ev.broken[rr * COLS + c2] <= f) return 0;
    return v;
  }
  Art.drawBackground(c);
  for (r = 1; r < ROWS; r++) for (cc = 0; cc < COLS; cc++) {
    var v = cellF(r, cc); if (!v) continue;
    var cx = cc * T + 20, cy = r * T + 20;
    if (v === 1) Art.drawGround(c, { x: cx, y: cy, top: cellF(r - 1, cc) === 0 });
    else if (v === 2) Art.drawCrackWall(c, { x: cx, y: cy });
    else Art.drawBrittleFloor(c, { x: cx, y: cy });
  }
  var sps = LV[n].spikes;
  for (i = 0; i < sps.length; i++) Art.drawSpike(c, { x: sps[i][1] * T + 20, y: sps[i][0] * T + 20 });
  for (i = 0; i < RINGS.length; i++) Art.drawHookRing(c, { x: RINGS[i].x, y: RINGS[i].y });
  var pk = LV[n].pickups;
  for (i = 0; i < pk.length; i++) {
    if (ev.taken[i] !== undefined && ev.taken[i] <= f) continue;
    Art.drawPickup(c, { x: pk[i][0], y: pk[i][1], kind: pk[i][2], t: t });
  }
  Art.drawGoal(c, { x: GOAL.x, y: GOAL.y, reached: !!opt.reached });
  if (opt.range && fr.p && fr.p[2] === 'hunter') Art.drawRangeRing(c, { x: fr.p[0], y: fr.p[1], radius: 260 });
  var types = LV[n].enemies;
  for (i = 0; i < fr.e.length; i++) {
    var q = fr.e[i]; if (!q[5]) continue;
    var ty = types[i][0], st = { x: q[0], y: q[1], facing: q[2], state: q[3], hit: q[4] };
    if (ty === 'boar') { st.t = t; Art.drawBoar(c, st); }
    else if (ty === 'shield') { st.t = t; Art.drawShieldman(c, st); }
    else if (ty === 'bee') { st.t = t; Art.drawShooterBee(c, st); }
    else Art.drawFrog(c, st);
  }
  if (fr.p) {
    var pp = fr.p;
    Art.drawPlayer(c, { x: pp[0], y: pp[1], cls: pp[2], facing: pp[3], pose: pp[4], poseT: pp[5], invuln: pp[6] });
    if (pp[7] !== null) Placeholder.hookLine(c, pp[0], pp[1] - 6, pp[7], pp[8]);
  }
  for (i = 0; i < fr.s.length; i++) Art.drawBeeShot(c, { x: fr.s[i][0], y: fr.s[i][1] });
  for (i = 0; i < fr.a.length; i++) Art.drawArrow(c, { x: fr.a[i][0], y: fr.a[i][1], angle: fr.a[i][2] });
  for (i = 0; i < fr.b.length; i++) Art.drawBomb(c, { x: fr.b[i][0], y: fr.b[i][1], t: fr.b[i][2] });
  for (i = 0; i < ev.expl.length; i++) {
    var ex = ev.expl[i], et = (f - ex.f) * DT;
    if (et >= 0 && et < 0.25) Art.drawExplosion(c, { x: ex.x, y: ex.y, t: et, dur: 0.25, radius: 60 });
  }
  for (i = 0; i < ev.poofs.length; i++) {
    var po = ev.poofs[i], pt = (f - po.f) * DT;
    if (pt >= 0 && pt < 0.3) Art.drawPoof(c, { x: po.x, y: po.y, t: pt, dur: 0.3 });
  }
  for (i = 0; i < ev.gains.length; i++) {
    var g = ev.gains[i], gt = (f - g.f) * DT;
    if (gt >= 0 && gt < 0.8) Art.drawPopup(c, { x: g.x, y: g.y, t: gt, dur: 0.8, kind: g.kind, value: g.value });
  }
}

function drawLevelScreen() {
  var f = L.rec.frames.length - 1;
  drawScene(ctx, L.n, L.rec, f, { range: true, reached: screen === 'result' });
  var p = L.p, dur = CLS[p.cls].skillDur;
  Art.drawHud(ctx, { mode: 'level', stock: stock, ratePerMin: ratePerMin(), time: L.steps * DT, run: L.run, hp: p.hp, maxHp: 3,
    skillCdT: dur - Math.min(dur, p.skillCd), skillCdDur: dur, cls: p.cls, trainLv: trainLv });
}

function drawMapScreen(noSel) {
  Art.drawMapBackground(ctx);
  var i, trn = trainLv;
  for (i = 0; i < 3; i++) {
    var rp = replays[i], st = !unlocked[i] ? 'locked' : (rp ? 'cleared' : 'open');
    var lx = LEVEL_POS[i][0], ly = LEVEL_POS[i][1];
    Art.drawLevelCard(ctx, { x: lx, y: ly, index: i + 1, name: LEVEL_NAMES[i], state: st,
      rates: rp ? rp.rates : null, recordCls: rp ? rp.cls : null, recordTime: rp ? rp.time : null,
      cost: LEVEL_COST[i], canAfford: afford(LEVEL_COST[i]), selected: !noSel && sel.row === 0 && sel.col === i });
    if (st !== 'locked') {
      ctx.save(); ctx.translate(lx + 8, ly + 8); ctx.beginPath(); ctx.rect(0, 0, 384, 216); ctx.clip(); ctx.scale(0.3, 0.3);
      if (rp) drawScene(ctx, i, rp.rec, Math.max(0, rp.f), { range: false, reached: false });
      else drawScene(ctx, i, staticRec(i), 0, { range: false, reached: false });
      ctx.restore();
    }
  }
  for (i = 0; i < 3; i++) {
    var id = CLS_IDS[i];
    Art.drawClassCard(ctx, { x: CLASS_POS[i][0], y: CLASS_POS[i][1], cls: id, name: CLS_NAMES[id],
      state: !owned[id] ? 'locked' : (curCls === id ? 'active' : 'owned'), cost: CLASS_COST[id], canAfford: afford(CLASS_COST[id]),
      selected: !noSel && sel.row === 1 && sel.col === i });
  }
  var tc = trn < 3 ? TRAIN_COST[trn] : null;
  Art.drawTrainCard(ctx, { x: TRAIN_POS[0], y: TRAIN_POS[1], lv: trn, cost: tc, canAfford: tc ? afford(tc) : false,
    selected: !noSel && sel.row === 1 && sel.col === 3 });
  Art.drawGoalCard(ctx, { x: GOAL_POS[0], y: GOAL_POS[1], cost: GOAL_COST, canAfford: afford(GOAL_COST),
    selected: !noSel && sel.row === 2 });
  Art.drawHud(ctx, { mode: 'map', stock: stock, ratePerMin: ratePerMin(), time: null, run: null, hp: null, maxHp: null,
    skillCdT: null, skillCdDur: null, cls: null, trainLv: null });
  ctx.save();
  ctx.font = '22px ' + FONT; ctx.fillStyle = '#e8eef8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', CW / 2, 690);
  ctx.restore();
}

var GUIDE_TEXT = [
  ['衝到終點', '碰到旗子就過關'],
  ['操作', '空白鍵 跳、Z 攻擊、X 技能'],
  ['過關後一直重播', '過關的關卡會不停重播賺素材'],
  ['撿多還是跑快', '撿越多、跑越快, 重播賺越快']
];
var GUIDE_FRAME = [[640, 360], [800, 293], [600, 375], [720, 309]];
function drawGuideScreen() {
  Art.drawMapBackground(ctx);
  Placeholder.guideDim(ctx);
  var gt = GUIDE_TEXT[guidePage], fs = GUIDE_FRAME[guidePage];
  var fx = Math.round((CW - fs[0]) / 2), fy = Math.round(120 + (400 - fs[1]) / 2);
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px ' + FONT;
  ctx.fillText('第 ' + (guidePage + 1) + ' 頁: ' + gt[0], CW / 2, 70);
  ctx.restore();
  Placeholder.guideFrame(ctx, fx, fy, fs[0], fs[1]);
  Art.drawGuidePage(ctx, { page: guidePage + GUIDE_PAGE_BASE, x: fx, y: fy, w: fs[0], h: fs[1] });
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px ' + FONT; ctx.fillText(gt[1], CW / 2, 580);
  ctx.font = '26px ' + FONT; ctx.fillStyle = '#cfd8e8';
  ctx.fillText((guidePage + 1) + ' / 4', CW / 2, 630);
  ctx.font = '22px ' + FONT;
  ctx.fillText(guidePage < 3 ? '← → 翻頁    Z 下一頁' : '← 上一頁    Z 開始', CW / 2, 676);
  ctx.restore();
}

function render() {
  ctx.setTransform(canvas.width / CW, 0, 0, canvas.height / CH, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  if (screen === 'guide') { drawGuideScreen(); return; }
  if (screen === 'map') { drawMapScreen(false); if (paused) Art.drawPausePanel(ctx, { mode: 'map' }); return; }
  if (screen === 'ending') { drawMapScreen(true); Art.drawEndingPanel(ctx, { totalTime: totalTime }); return; }
  drawLevelScreen();
  if (screen === 'result') {
    var ri = resultInfo, o = ri.old;
    Art.drawResultPanel(ctx, { time: ri.fresh.time, run: ri.fresh.run, rates: ri.fresh.rates, cls: ri.fresh.cls,
      oldTime: o ? o.time : null, oldRun: o ? o.run : null, oldRates: o ? o.rates : null, oldCls: o ? o.cls : null });
  } else if (screen === 'fail') Art.drawFailPanel(ctx, {});
  else if (paused) Art.drawPausePanel(ctx, { mode: 'level' });
}

// ===== 輸入(只有鍵盤) =====
var GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, Escape: 1 };

function mapConfirm() {
  var r = sel.row, c = sel.col;
  if (r === 0) {
    if (unlocked[c]) startLevelAt(c);
    else if (afford(LEVEL_COST[c])) { pay(LEVEL_COST[c]); unlocked[c] = true; }
  } else if (r === 1) {
    if (c < 3) {
      var id = CLS_IDS[c];
      if (owned[id]) curCls = id;
      else if (afford(CLASS_COST[id])) { pay(CLASS_COST[id]); owned[id] = true; }
    } else if (trainLv < 3 && afford(TRAIN_COST[trainLv])) { pay(TRAIN_COST[trainLv]); trainLv++; }
  } else if (afford(GOAL_COST)) { pay(GOAL_COST); screen = 'ending'; }
}
function startLevelAt(n) { newLevel(n); }

function inputDown(code) {
  if (screen === 'guide') {
    if (code === 'ArrowLeft') guidePage = Math.max(0, guidePage - 1);
    else if (code === 'ArrowRight') guidePage = Math.min(3, guidePage + 1);
    else if (code === 'KeyZ') { if (guidePage < 3) guidePage++; else screen = guideReturn; }
    return;
  }
  if (screen === 'ending') { if (code === 'KeyZ') resetAll(); return; }
  if (screen === 'map') {
    if (paused) { if (code === 'Escape') paused = false; return; }
    if (code === 'Escape') paused = true;
    else if (code === 'Space') { guidePage = 0; guideReturn = 'map'; screen = 'guide'; }
    else if (code === 'ArrowUp') { sel.row = Math.max(0, sel.row - 1); sel.col = Math.min(sel.col, sel.row === 0 ? 2 : (sel.row === 1 ? 3 : 0)); }
    else if (code === 'ArrowDown') { sel.row = Math.min(2, sel.row + 1); sel.col = Math.min(sel.col, sel.row === 0 ? 2 : (sel.row === 1 ? 3 : 0)); }
    else if (code === 'ArrowLeft') sel.col = Math.max(0, sel.col - 1);
    else if (code === 'ArrowRight') sel.col = Math.min(sel.row === 0 ? 2 : (sel.row === 1 ? 3 : 0), sel.col + 1);
    else if (code === 'KeyZ') mapConfirm();
    return;
  }
  if (screen === 'level') {
    if (paused) {
      if (code === 'Escape') paused = false;
      else if (code === 'KeyZ') newLevel(L.n);
      else if (code === 'KeyX') { screen = 'map'; paused = false; L = null; }
      return;
    }
    if (code === 'Escape') paused = true;
    else if (code === 'Space') L.pend.jump = true;
    else if (code === 'KeyZ') L.pend.z = true;
    else if (code === 'KeyX') L.pend.x = true;
    return;
  }
  if (screen === 'result') {
    var ri = resultInfo;
    if (code === 'KeyZ') { if (ri.old) replays[ri.fresh.n] = ri.fresh; screen = 'map'; L = null; }
    else if (code === 'KeyX' && ri.old) { screen = 'map'; L = null; }
    return;
  }
  if (screen === 'fail') {
    if (code === 'KeyZ') newLevel(L.n);
    else if (code === 'KeyX') { screen = 'map'; L = null; }
  }
}

window.addEventListener('keydown', function (e) {
  var code = e.code;
  if (GAME_KEYS[code]) e.preventDefault();
  if (e.repeat) return;
  if (!GAME_KEYS[code]) return;
  held[code] = true;
  try { inputDown(code); } catch (err) { console.error(err); }
});
window.addEventListener('keyup', function (e) {
  if (GAME_KEYS[e.code]) { e.preventDefault(); held[e.code] = false; }
});
window.addEventListener('blur', function () { held = {}; });

// ===== 畫布縮放 =====
function resize() {
  var vw = window.innerWidth || CW, vh = window.innerHeight || CH;
  var s = Math.min(vw / CW, vh / CH);
  var cssW = Math.max(1, Math.floor(CW * s)), cssH = Math.max(1, Math.floor(CH * s));
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(cssW * dpr)); canvas.height = Math.max(1, Math.round(cssH * dpr));
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// ===== 主迴圈 =====
var lastTs = 0, acc = 0;
function frame(ts) {
  if (!lastTs) lastTs = ts;
  var dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts; acc += dt;
  var n = 0;
  try {
    while (acc >= DT && n < 6) { tick(); acc -= DT; n++; }
    if (acc > DT) acc = 0;
    render();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
