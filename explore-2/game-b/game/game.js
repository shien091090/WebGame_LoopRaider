'use strict';
// 森林獸徑 — 玩法驗證 Demo。只用鍵盤。邏輯與繪製分離: 每個固定步先更新狀態, 再依狀態呼叫 Art。

var W = 1280, H = 720, TS = 40, COLS = 64, ROWS = 18, STEP = 1 / 60;
var KINDS = ['acorn', 'ore', 'honey'];
var SPECIES = {
  squirrel: { name: '松鼠', speed: 280, jump: 800, w: 28, h: 32, stomp: 1 },
  pangolin: { name: '穿山甲', speed: 240, jump: 680, w: 32, h: 28, stomp: 1 },
  bear: { name: '熊', speed: 230, jump: 680, w: 36, h: 44, stomp: 2 }
};
var SP_ORDER = ['squirrel', 'pangolin', 'bear'];
var SP_COST = {
  squirrel: { acorn: 0, ore: 0, honey: 0 },
  pangolin: { acorn: 40, ore: 0, honey: 0 },
  bear: { acorn: 0, ore: 30, honey: 15 }
};
var GOAL_COST = { acorn: 150, ore: 120, honey: 100 };
var ZERO = { acorn: 0, ore: 0, honey: 0 };
var LEVEL_DEFS = [
  { name: '林道', par: 24, gAcorn: [3, 5, 8, 10, 22, 45], canopy: 6, ore: 5, hedge: 2, snakes: 1, moleG: [56], moleU: [31], hives: 1, wasps: [2, 0], spikes: [], cost: { acorn: 0, ore: 0, honey: 0 } },
  { name: '溪谷', par: 28, gAcorn: [3, 5, 8, 10, 22, 45], canopy: 7, ore: 6, hedge: 2, snakes: 2, moleG: [56], moleU: [30, 35], hives: 2, wasps: [1, 1], spikes: [12, 43, 54], cost: { acorn: 30, ore: 8, honey: 0 } },
  { name: '深林', par: 32, gAcorn: [3, 5, 8, 10, 22, 45, 20], canopy: 8, ore: 7, hedge: 3, snakes: 2, moleG: [56, 31], moleU: [30, 35], hives: 2, wasps: [2, 1], spikes: [12, 33, 43, 54], cost: { acorn: 40, ore: 30, honey: 0 } }
];

// ---------------------------------------------------------------- 關卡建構
// 地形代碼: 0 空 1 土 2 樹冠 3 軟土 4 尖刺
function buildLevel(n) {
  var def = LEVEL_DEFS[n];
  var g = new Uint8Array(COLS * ROWS);
  function set(c, r, t) { g[r * COLS + c] = t; }
  var c, r, i;
  for (c = 0; c < COLS; c++) for (r = 12; r < ROWS; r++) set(c, r, 1);
  // 低處(蛇草叢)
  var ditches = [[16, 18]];
  if (def.snakes >= 2) ditches.push([50, 52]);
  for (i = 0; i < ditches.length; i++) for (c = ditches[i][0]; c <= ditches[i][1]; c++) set(c, 12, 0);
  // 窄丘(刺蝟)
  var mounds = [[24, 28], [44, 48]];
  if (def.hedge >= 3) mounds.push([58, 60]);
  var isMound = function (col) { for (var k = 0; k < mounds.length; k++) if (col >= mounds[k][0] && col <= mounds[k][1]) return true; return false; };
  for (i = 0; i < mounds.length; i++) for (c = mounds[i][0]; c <= mounds[i][1]; c++) set(c, 11, 1);
  // 地下層: 洞 26~37, 地面蓋軟土, 洞高 13~16 列, 底 17 列
  for (c = 26; c <= 37; c++) { set(c, 12, 3); for (r = 13; r <= 16; r++) set(c, r, 0); }
  // 出口台階(往終點方向)
  for (r = 13; r <= 15; r++) set(38, r, 0);
  set(39, 13, 3); set(39, 14, 3); // 軟土塞: 只有鑽地過得去, 地面那側不能倒走進來
  set(40, 12, 0); set(40, 13, 0);
  set(41, 12, 0);
  // 樹冠平台(第 9 列, 離地 3 格, 底下可通行)
  var plats = [[6, 11], [18, 23], [30, 35]];
  for (i = 0; i < plats.length; i++) for (c = plats[i][0]; c <= plats[i][1]; c++) set(c, 9, 2);
  // 尖刺
  for (i = 0; i < def.spikes.length; i++) set(def.spikes[i], 11, 4);

  var pickups = [], pid = 0;
  function addPick(kind, x, y) { pickups.push({ id: pid++, kind: kind, x: x, y: y }); }
  for (i = 0; i < def.gAcorn.length; i++) {
    c = def.gAcorn[i];
    addPick('acorn', c * TS + 20, isMound(c) ? 428 : 456);
  }
  for (i = 0; i < def.canopy; i++) {
    var pl = plats[i % 3], idx = Math.floor(i / 3);
    addPick('acorn', (pl[0] + 1 + idx * 2) * TS + 20, 344);
  }
  for (i = 0; i < def.ore; i++) {
    var oc = 27 + (def.ore > 1 ? i * 9 / (def.ore - 1) : 0);
    addPick('ore', Math.round(oc * TS + 20), 664);
  }
  var hives = [{ id: 0, x: 14 * TS + 20, y: 350 }];
  if (def.hives >= 2) hives.push({ id: 1, x: 47 * TS + 20, y: 350 });

  var mons = [];
  function mk(k, x, y, o) {
    var m = { k: k, x: x, y: y, f: 1, hp: 1, alive: true, s: '', sT: 0, hit: 0, stun: 0, cd: 0, chase: false, hx: x, hy: y, drop: { kind: 'ore', n: 1 } };
    for (var key in o) m[key] = o[key];
    return m;
  }
  var hc = [26, 46, 59];
  for (i = 0; i < def.hedge; i++) mons.push(mk('hedgehog', hc[i] * TS + 20, 426, { hp: 2, f: i % 2 ? -1 : 1, drop: { kind: 'acorn', n: 2 } }));
  var sc = [17, 51];
  for (i = 0; i < def.snakes; i++) mons.push(mk('snake', sc[i] * TS + 20, 506, { s: 'hide', f: -1, cd: 0 }));
  for (i = 0; i < def.moleG.length; i++) mons.push(mk('mole', def.moleG[i] * TS + 20, 464, { s: 'hide', sT: 0.6 * i }));
  for (i = 0; i < def.moleU.length; i++) mons.push(mk('mole', def.moleU[i] * TS + 20, 664, { s: 'hide', sT: 0.5 + 0.8 * i }));
  for (i = 0; i < def.hives; i++) {
    for (var w = 0; w < def.wasps[i]; w++) {
      mons.push(mk('wasp', hives[i].x + (w % 2 ? 34 : -34), hives[i].y + 26, { s: 'idle', drop: { kind: 'honey', n: 1 }, ph: w * 2 }));
    }
  }
  return { n: n, def: def, g: g, pickups: pickups, hives: hives, monDefs: mons, goal: { x: 61 * TS + 20, y: 440, w: 40, h: 80 }, spawn: { x: 100, y: 480 } };
}
var LEVELS = [buildLevel(0), buildLevel(1), buildLevel(2)];
var LV = LEVELS[0]; // 目前進行中的關卡(碰撞用)

// ---------------------------------------------------------------- 全域狀態
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');
var mode = 'guide';   // guide / map / level / result / fail / ending
var paused = false;
var guidePage = 0, guideReturn = 'map';
var sel = { row: 0, col: 0 };
var stock, unlocked, owned, curSp, replays, totalTime;
var run = null, lastResult = null, curLevelIdx = 0;
var keys = {};
var pressed = { jump: false, atk: false, skill: false, jumpUp: false };
var gameT = 0;

function resetAll() {
  stock = { acorn: 0, ore: 0, honey: 0 };
  unlocked = [true, false, false];
  owned = { squirrel: true, pangolin: false, bear: false };
  curSp = 'squirrel';
  replays = [null, null, null];
  totalTime = 0;
  sel = { row: 0, col: 0 };
  run = null; lastResult = null; paused = false;
}
resetAll();

function clearPressed() { pressed.jump = pressed.atk = pressed.skill = pressed.jumpUp = false; }
function canAfford(cost) { for (var i = 0; i < 3; i++) if (Math.floor(stock[KINDS[i]] + 1e-9) < cost[KINDS[i]]) return false; return true; }
function pay(cost) { for (var i = 0; i < 3; i++) stock[KINDS[i]] -= cost[KINDS[i]]; }

// ---------------------------------------------------------------- 碰撞
function solidTile(c, r, pass) {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  var t = LV.g[r * COLS + c];
  return t === 1 || t === 2 || (t === 3 && !pass);
}
function hitsSolid(x, y, w, h, pass) {
  var c0 = Math.floor((x - w / 2) / TS), c1 = Math.floor((x + w / 2 - 0.001) / TS);
  var r0 = Math.floor((y - h / 2) / TS), r1 = Math.floor((y + h / 2 - 0.001) / TS);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (solidTile(c, r, pass)) return true;
  return false;
}
function overlapsTile(x, y, w, h, type) {
  var c0 = Math.floor((x - w / 2) / TS), c1 = Math.floor((x + w / 2 - 0.001) / TS);
  var r0 = Math.floor((y - h / 2) / TS), r1 = Math.floor((y + h / 2 - 0.001) / TS);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
    if (LV.g[r * COLS + c] === type) return true;
  }
  return false;
}
function overlapsSpike(p) {
  var c0 = Math.floor((p.x - p.w / 2) / TS), c1 = Math.floor((p.x + p.w / 2 - 0.001) / TS);
  var r0 = Math.floor((p.y - p.h / 2) / TS), r1 = Math.floor((p.y + p.h / 2 - 0.001) / TS);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
    if (LV.g[r * COLS + c] !== 4) continue;
    // 尖刺判定: 下半 40x20
    var sx = c * TS, sy = r * TS + 20;
    if (p.x + p.w / 2 > sx && p.x - p.w / 2 < sx + TS && p.y + p.h / 2 > sy && p.y - p.h / 2 < sy + 20) return true;
  }
  return false;
}
function boxOverlap(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}
function movePX(p, dx, pass) {
  if (!dx) return false;
  p.x += dx;
  if (hitsSolid(p.x, p.y, p.w, p.h, pass)) {
    if (dx > 0) p.x = Math.floor((p.x + p.w / 2) / TS) * TS - p.w / 2;
    else p.x = (Math.floor((p.x - p.w / 2) / TS) + 1) * TS + p.w / 2;
    return true;
  }
  return false;
}
function movePY(p, dy, pass) {
  p.landed = false;
  if (!dy) return;
  p.y += dy;
  if (hitsSolid(p.x, p.y, p.w, p.h, pass)) {
    if (dy > 0) { p.y = Math.floor((p.y + p.h / 2) / TS) * TS - p.h / 2; p.landed = true; }
    else p.y = (Math.floor((p.y - p.h / 2) / TS) + 1) * TS + p.h / 2;
    p.vy = 0;
  }
}

// ---------------------------------------------------------------- 一趟(run)
function startLevel(idx) {
  curLevelIdx = idx;
  LV = LEVELS[idx];
  var sp = SPECIES[curSp];
  var mons = [];
  for (var i = 0; i < LV.monDefs.length; i++) {
    var m = {}; for (var k in LV.monDefs[i]) m[k] = LV.monDefs[i][k];
    m.drop = { kind: LV.monDefs[i].drop.kind, n: LV.monDefs[i].drop.n };
    mons.push(m);
  }
  run = {
    lv: LV, idx: idx, sp: curSp, mons: mons, shots: [], frames: [], events: [],
    got: { acorn: 0, ore: 0, honey: 0 }, taken: {}, shaken: {},
    cam: 0, goal: false,
    p: {
      sp: curSp, w: sp.w, h: sp.h, x: LV.spawn.x, y: LV.spawn.y - sp.h / 2, vx: 0, vy: 0, facing: 1,
      onGround: false, landed: false, hp: 3, invuln: 0, kb: null, hurtT: 0,
      cdAtk: 0, cdSkill: 0, actT: 0, actPose: '', roll: 0, rollHits: null, swipeHits: null,
      jumping: false, jumpT: 0, soft: false, pose: 'idle', poseT: 0, prevBottom: 0
    }
  };
  run.cam = camFor(run.p.x);
  keys.KeyX = false; keys.Space = false;
  clearPressed();
  mode = 'level'; paused = false;
  snapshot(run);
}
function camFor(px) { return Math.max(0, Math.min(COLS * TS - W, px - W * 0.4)); }

function addEvent(ev) { ev.f = run.frames.length; run.events.push(ev); }
function gain(kind, n, x, y, pid, hid) {
  run.got[kind] += n;
  addEvent({ type: 'gain', kind: kind, n: n, x: x, y: y, pid: pid === undefined ? -1 : pid, hid: hid === undefined ? -1 : hid });
}

function mbox(m) {
  switch (m.k) {
    case 'hedgehog': return { x: m.x, y: m.y, w: 36, h: 28 };
    case 'wasp': return { x: m.x, y: m.y, w: 28, h: 24 };
    case 'mole': return { x: m.x, y: m.y, w: 32, h: 32 };
    default: return { x: m.x + m.f * snakeReach(m), y: m.y + 2, w: 32, h: 24 };
  }
}
function snakeReach(m) {
  if (m.s === 'strike') return 80 * Math.min(1, m.sT / 0.25);
  if (m.s === 'out') return 80;
  if (m.s === 'retreat') return 80 * Math.max(0, 1 - m.sT / 0.5);
  return 0;
}
function vulnerable(m) {
  if (!m.alive) return false;
  if (m.k === 'snake') return m.s === 'out';
  if (m.k === 'mole') return m.s === 'up';
  return true;
}
function harmful(m) {
  if (!m.alive || m.stun > 0) return false;
  if (m.k === 'snake') return m.s === 'strike' || m.s === 'out';
  if (m.k === 'mole') return m.s === 'up';
  return true;
}
function dmgMon(m, d) {
  if (!vulnerable(m)) return false;
  m.hp -= d; m.hit = 0.1;
  if (m.hp <= 0) {
    m.alive = false;
    addEvent({ type: 'poof', x: m.x, y: m.y });
    gain(m.drop.kind, m.drop.n, m.x, m.y);
  }
  return true;
}
function hurtPlayer(p, dir) {
  p.hp -= 1; p.invuln = 1; p.kb = { dir: dir, left: 80 }; p.hurtT = 0.25;
  if (p.vy > -200) p.vy = -200;
  p.roll = 0; p.actT = 0;
}

function updMonsters(p) {
  var t = run.frames.length * STEP;
  for (var i = 0; i < run.mons.length; i++) {
    var m = run.mons[i];
    if (!m.alive) continue;
    if (m.hit > 0) m.hit -= STEP;
    if (m.stun > 0) { m.stun -= STEP; continue; }
    if (m.k === 'hedgehog') {
      var nx = m.x + m.f * 60 * STEP;
      var wall = hitsSolid(nx, m.y, 36, 28, false);
      var edge = !solidTile(Math.floor((nx + m.f * 18) / TS), Math.floor((m.y + 16) / TS), false);
      if (wall || edge) m.f = -m.f; else m.x = nx;
    } else if (m.k === 'snake') {
      m.sT += STEP;
      if (m.s === 'hide') {
        m.cd -= STEP;
        if (m.cd <= 0 && Math.abs(p.x - m.x) <= 100 && Math.abs(p.y - m.y) <= 60) {
          m.s = 'strike'; m.sT = 0; m.f = p.x >= m.x ? 1 : -1;
        }
      } else if (m.s === 'strike' && m.sT >= 0.25) { m.s = 'out'; m.sT = 0; }
      else if (m.s === 'out' && m.sT >= 1) { m.s = 'retreat'; m.sT = 0; }
      else if (m.s === 'retreat' && m.sT >= 0.5) { m.s = 'hide'; m.sT = 0; m.cd = 2; }
    } else if (m.k === 'mole') {
      m.sT += STEP;
      if (m.s === 'hide' && m.sT >= 2) { m.s = 'up'; m.sT = 0; }
      else if (m.s === 'up' && m.sT >= 1.5) { m.s = 'hide'; m.sT = 0; }
    } else if (m.k === 'wasp') {
      var dx = p.x - m.x, dy = p.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
      if (!m.chase && d <= 220) { m.chase = true; m.s = 'chase'; }
      if (m.chase) {
        if (d > 1) { m.x += dx / d * 140 * STEP; m.y += dy / d * 140 * STEP; }
        if (Math.abs(dx) > 1) m.f = dx > 0 ? 1 : -1;
      } else {
        m.x = m.hx + Math.cos(t * 2.2 + m.ph) * 10;
        m.y = m.hy + Math.sin(t * 3 + m.ph) * 8;
      }
    }
  }
}

function stepLevel() {
  var p = run.p, sp = SPECIES[p.sp];
  p.prevBottom = p.y + p.h / 2;
  var i, m;
  // 穿山甲鑽地旗標
  if (p.sp === 'pangolin') {
    if (keys.KeyX) p.soft = true;
    else if (p.soft && !overlapsTile(p.x, p.y, p.w, p.h, 3)) p.soft = false;
  } else p.soft = false;
  var pass = p.soft;

  // 計時器
  p.cdAtk = Math.max(0, p.cdAtk - STEP); p.cdSkill = Math.max(0, p.cdSkill - STEP);
  p.actT = Math.max(0, p.actT - STEP); p.invuln = Math.max(0, p.invuln - STEP); p.hurtT = Math.max(0, p.hurtT - STEP);
  if (p.jumping) p.jumpT += STEP;

  var ax = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  var controllable = !p.kb;

  // 跳躍
  if (pressed.jump && controllable && p.roll <= 0 && p.onGround) {
    p.vy = -sp.jump; p.jumping = true; p.jumpT = 0; p.onGround = false;
  }
  if (pressed.jumpUp) {
    if (p.jumping && p.jumpT < 0.15 && p.vy < -sp.jump / 2) p.vy = -sp.jump / 2;
    p.jumping = false;
  }
  // 攻擊
  if (pressed.atk && controllable && p.roll <= 0 && p.cdAtk <= 0) {
    if (p.sp === 'squirrel') {
      run.shots.push({ x: p.x + p.facing * 14, y: p.y - 4, vx: 450 * p.facing, vy: -350, t: 0 });
      p.cdAtk = 0.4; p.actT = 0.15; p.actPose = 'throw';
    } else if (p.sp === 'pangolin') {
      p.roll = 0.4; p.cdAtk = 0.8; p.rollHits = {};
    } else {
      p.cdAtk = 0.5; p.actT = 0.15; p.actPose = 'swipe'; p.swipeHits = {};
    }
  }
  // 熊搖晃
  if (pressed.skill && controllable && p.sp === 'bear' && p.cdSkill <= 0) {
    p.cdSkill = 1.5; p.actT = 0.3; p.actPose = 'shake';
    addEvent({ type: 'wave', x: p.x, y: p.y });
    for (i = 0; i < run.lv.hives.length; i++) {
      var hv = run.lv.hives[i];
      if (run.shaken[hv.id]) continue;
      if (Math.sqrt((hv.x - p.x) * (hv.x - p.x) + (hv.y - p.y) * (hv.y - p.y)) <= 120) {
        run.shaken[hv.id] = true; gain('honey', 3, hv.x, hv.y, -1, hv.id);
      }
    }
    for (i = 0; i < run.mons.length; i++) {
      m = run.mons[i];
      if (!m.alive) continue;
      var b = mbox(m);
      var ddx = Math.max(0, Math.abs(p.x - b.x) - b.w / 2), ddy = Math.max(0, Math.abs(p.y - b.y) - b.h / 2);
      if (ddx * ddx + ddy * ddy <= 120 * 120) m.stun = 1.5;
    }
  }
  clearPressed();

  // 水平速度
  if (p.kb) {
    var stp = Math.min(p.kb.left, 480 * STEP);
    var hx = movePX(p, p.kb.dir * stp, pass);
    p.kb.left -= stp;
    if (hx || p.kb.left <= 0) p.kb = null;
  } else if (p.roll > 0) {
    p.roll -= STEP;
    if (movePX(p, 480 * p.facing * STEP, pass)) p.roll = 0;
  } else {
    if (ax) p.facing = ax;
    movePX(p, ax * sp.speed * STEP, pass);
  }
  // 重力
  p.vy += 2400 * STEP;
  var gliding = p.sp === 'squirrel' && keys.KeyX && !p.onGround;
  if (gliding && p.vy > 60) p.vy = 60;
  if (p.vy > 1000) p.vy = 1000;
  movePY(p, p.vy * STEP, pass);
  p.onGround = p.landed;
  if (p.onGround) p.jumping = false;

  // 翻滾 / 熊掌 傷害
  if (p.roll > 0) {
    for (i = 0; i < run.mons.length; i++) {
      m = run.mons[i];
      if (!vulnerable(m) || p.rollHits[i]) continue;
      if (boxOverlap({ x: p.x, y: p.y, w: p.w + 4, h: p.h + 4 }, mbox(m))) { p.rollHits[i] = true; dmgMon(m, 2); }
    }
  }
  if (p.actT > 0 && p.actPose === 'swipe') {
    var sb = { x: p.x + p.facing * (p.w / 2 + 30), y: p.y, w: 60, h: 44 };
    for (i = 0; i < run.mons.length; i++) {
      m = run.mons[i];
      if (!vulnerable(m) || p.swipeHits[i]) continue;
      if (boxOverlap(sb, mbox(m))) { p.swipeHits[i] = true; dmgMon(m, 2); }
    }
  }
  // 橡實彈
  for (i = run.shots.length - 1; i >= 0; i--) {
    var s = run.shots[i];
    s.t += STEP; s.vy += 1500 * STEP; s.x += s.vx * STEP; s.y += s.vy * STEP;
    var dead = s.t > 3 || s.y > 760 || s.x < -20 || s.x > COLS * TS + 20 || hitsSolid(s.x, s.y, 12, 12, false);
    if (!dead) {
      for (var j = 0; j < run.mons.length; j++) {
        if (vulnerable(run.mons[j]) && boxOverlap({ x: s.x, y: s.y, w: 12, h: 12 }, mbox(run.mons[j]))) { dmgMon(run.mons[j], 1); dead = true; break; }
      }
    }
    if (dead) run.shots.splice(i, 1);
  }

  updMonsters(p);

  // 踩頭 / 碰撞傷害
  var pb = { x: p.x, y: p.y, w: p.w, h: p.h };
  if (p.roll <= 0) {
    for (i = 0; i < run.mons.length; i++) {
      m = run.mons[i];
      if (!m.alive) continue;
      var mb = mbox(m);
      if (!boxOverlap(pb, mb)) continue;
      var canStomp = p.vy > 0 && p.prevBottom <= mb.y - mb.h / 2 + 12 + 1 && (vulnerable(m) || m.k === 'hedgehog');
      if (canStomp) {
        if (m.k === 'hedgehog') {
          if (harmful(m) && p.invuln <= 0) hurtPlayer(p, p.x >= m.x ? 1 : -1);
        } else dmgMon(m, sp.stomp);
        p.vy = -500; p.onGround = false; p.jumping = false;
        continue;
      }
      if (harmful(m) && p.invuln <= 0) hurtPlayer(p, p.x >= mb.x ? 1 : -1);
    }
  }
  // 素材
  for (i = 0; i < run.lv.pickups.length; i++) {
    var pk = run.lv.pickups[i];
    if (run.taken[pk.id]) continue;
    if (boxOverlap(pb, { x: pk.x, y: pk.y, w: 24, h: 24 })) { run.taken[pk.id] = true; gain(pk.kind, 1, pk.x, pk.y, pk.id, -1); }
  }

  // 姿勢
  var pose;
  var inSoil = p.sp === 'pangolin' && p.soft && overlapsTile(p.x, p.y, p.w, p.h, 3);
  if (p.hurtT > 0) pose = 'hurt';
  else if (p.roll > 0) pose = 'roll';
  else if (p.actT > 0) pose = p.actPose;
  else if (inSoil) pose = 'dig';
  else if (!p.onGround) pose = (p.sp === 'squirrel' && keys.KeyX && p.vy > 0) ? 'glide' : (p.vy < 0 ? 'rise' : 'fall');
  else pose = ax ? 'run' : 'idle';
  if (pose !== p.pose) { p.pose = pose; p.poseT = 0; } else p.poseT += STEP;

  // 鏡頭
  run.cam = camFor(p.x);

  // 結束判定(同一批更新最尾端)
  var reached = boxOverlap({ x: p.x, y: p.y, w: p.w, h: p.h }, run.lv.goal);
  var failed = p.hp <= 0 || overlapsSpike(p) || p.y - p.h / 2 > H + 40;
  if (reached && !failed) run.goal = true;
  snapshot(run);
  if (failed) { mode = 'fail'; clearPressed(); return; }
  if (run.goal) finishRun();
}

function snapshot(r) {
  var p = r.p;
  r.frames.push({
    cam: r.cam,
    p: { x: p.x, y: p.y, sp: p.sp, f: p.facing, pose: p.pose, pT: p.poseT, inv: p.invuln > 0, dig: p.soft },
    m: r.mons.map(function (m) { return { a: m.alive, x: m.x, y: m.y, f: m.f, s: m.s, sT: m.sT, h: m.hit > 0, st: m.stun > 0 }; }),
    sh: r.shots.map(function (s) { return [s.x, s.y, s.t]; }),
    gr: r.goal
  });
}

function finishRun() {
  var idx = run.idx, def = LEVEL_DEFS[idx];
  var len = run.frames.length, time = len / 60;
  var gold = time <= def.par;
  var mult = gold ? 1.5 : 1;
  var tot = { acorn: 0, ore: 0, honey: 0 }, byFrame = [], i;
  for (i = 0; i < run.events.length; i++) {
    var ev = run.events[i];
    if (ev.type !== 'gain') continue;
    tot[ev.kind] += ev.n;
    (byFrame[ev.f] = byFrame[ev.f] || []).push(ev);
  }
  var rates = {};
  for (i = 0; i < 3; i++) rates[KINDS[i]] = tot[KINDS[i]] * mult / time * 60;
  var replaced = !!replays[idx];
  replays[idx] = { idx: idx, frames: run.frames, events: run.events, byFrame: byFrame, len: len, pos: 0, sp: run.sp, time: time, gold: gold, mult: mult, rates: rates };
  // 本趟素材入帳
  for (i = 0; i < 3; i++) stock[KINDS[i]] += run.got[KINDS[i]];
  lastResult = { time: time, parTime: def.par, gold: gold, run: { acorn: run.got.acorn, ore: run.got.ore, honey: run.got.honey }, rates: rates, sp: run.sp, replaced: replaced };
  mode = 'result'; clearPressed();
}

// ---------------------------------------------------------------- 回放
function stepReplays(speed) {
  for (var k = 0; k < speed; k++) {
    for (var i = 0; i < 3; i++) {
      var rp = replays[i];
      if (!rp) continue;
      rp.pos = (rp.pos + 1) % rp.len;
      var evs = rp.byFrame[rp.pos];
      if (evs) for (var j = 0; j < evs.length; j++) stock[evs[j].kind] += evs[j].n * rp.mult;
    }
  }
}
function totalRates(boost) {
  var r = { acorn: 0, ore: 0, honey: 0 };
  for (var i = 0; i < 3; i++) if (replays[i]) for (var k = 0; k < 3; k++) r[KINDS[k]] += replays[i].rates[KINDS[k]] * (boost ? 2 : 1);
  return r;
}
function intStock() { return { acorn: Math.floor(stock.acorn + 1e-9), ore: Math.floor(stock.ore + 1e-9), honey: Math.floor(stock.honey + 1e-9) }; }

// ---------------------------------------------------------------- 更新主迴圈
function update() {
  if (mode === 'guide' || mode === 'ending' || paused) return;
  totalTime += STEP;
  gameT += STEP;
  stepReplays(mode === 'level' ? 2 : 1);
  if (mode === 'level') stepLevel();
}

// ---------------------------------------------------------------- 輸入(只有鍵盤)
var HANDLED = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, Escape: 1 };
function inputDown(code) {
  var i;
  if (code === 'Escape') {
    if (mode === 'level' || mode === 'map') { paused = !paused; clearPressed(); if (paused) keys.KeyX = false; }
    return;
  }
  if (paused) {
    if (mode === 'level') {
      if (code === 'KeyZ') startLevel(curLevelIdx);
      else if (code === 'KeyX') { paused = false; run = null; mode = 'map'; clearPressed(); }
    }
    return;
  }
  if (mode === 'guide') {
    if (code === 'ArrowLeft') guidePage = Math.max(0, guidePage - 1);
    else if (code === 'ArrowRight') guidePage = Math.min(4, guidePage + 1);
    else if (code === 'KeyZ') {
      if (guidePage >= 4) { mode = guideReturn; guideReturn = 'map'; clearPressed(); }
      else guidePage++;
    }
  } else if (mode === 'map') {
    if (code === 'ArrowUp') sel.row = Math.max(0, sel.row - 1);
    else if (code === 'ArrowDown') sel.row = Math.min(2, sel.row + 1);
    else if (code === 'ArrowLeft') sel.col = Math.max(0, sel.col - 1);
    else if (code === 'ArrowRight') sel.col = Math.min(2, sel.col + 1);
    else if (code === 'Space') { guidePage = 0; guideReturn = 'map'; mode = 'guide'; }
    else if (code === 'KeyZ') mapConfirm();
    if (sel.row === 2) sel.col = 0;
  } else if (mode === 'level') {
    if (code === 'Space') pressed.jump = true;
    else if (code === 'KeyZ') pressed.atk = true;
    else if (code === 'KeyX') { keys.KeyX = true; pressed.skill = true; }
  } else if (mode === 'result') {
    if (code === 'KeyZ') { mode = 'map'; clearPressed(); }
    else if (code === 'KeyX') startLevel(curLevelIdx);
  } else if (mode === 'fail') {
    if (code === 'KeyZ') startLevel(curLevelIdx);
    else if (code === 'KeyX') { mode = 'map'; clearPressed(); }
  } else if (mode === 'ending') {
    if (code === 'KeyZ') { resetAll(); guidePage = 0; guideReturn = 'map'; mode = 'guide'; clearPressed(); }
  }
}
function mapConfirm() {
  if (sel.row === 0) {
    var i = sel.col;
    if (unlocked[i]) startLevel(i);
    else if (canAfford(LEVEL_DEFS[i].cost)) { pay(LEVEL_DEFS[i].cost); unlocked[i] = true; }
  } else if (sel.row === 1) {
    var sp = SP_ORDER[sel.col];
    if (owned[sp]) curSp = sp;
    else if (canAfford(SP_COST[sp])) { pay(SP_COST[sp]); owned[sp] = true; }
  } else if (canAfford(GOAL_COST)) {
    pay(GOAL_COST); mode = 'ending'; clearPressed();
  }
}
function onKeyDown(e) {
  if (HANDLED[e.code]) e.preventDefault();
  if (e.repeat) return;
  if (!HANDLED[e.code]) return;
  if (e.code !== 'KeyX') keys[e.code] = true;
  inputDown(e.code);
}
function onKeyUp(e) {
  if (HANDLED[e.code]) e.preventDefault();
  keys[e.code] = false;
  if (e.code === 'Space' && mode === 'level' && !paused) pressed.jumpUp = true;
}
function onBlur() { keys.ArrowLeft = keys.ArrowRight = keys.KeyX = keys.Space = false; }
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', onBlur);

// ---------------------------------------------------------------- 繪製
function fmtVal(v) { return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1); }

function drawWorld(c, lv, fr, evs, fi, mult) {
  var cam = fr.cam, t = fi / 60, i, ev;
  Art.drawBackground(c, {});
  var taken = {}, shaken = {};
  for (i = 0; i < evs.length; i++) {
    ev = evs[i];
    if (ev.type === 'gain' && ev.f <= fi) { if (ev.pid >= 0) taken[ev.pid] = true; if (ev.hid >= 0) shaken[ev.hid] = true; }
  }
  var g = lv.g, c0 = Math.max(0, Math.floor(cam / TS) - 1), c1 = Math.min(COLS - 1, Math.floor((cam + W) / TS) + 1), r, cc;
  for (r = 0; r < ROWS; r++) for (cc = c0; cc <= c1; cc++) {
    var tp = g[r * COLS + cc];
    if (!tp) continue;
    var x = cc * TS + 20 - cam, y = r * TS + 20;
    var above = r > 0 ? g[(r - 1) * COLS + cc] : 0;
    if (tp === 1 || tp === 2) Art.drawGround(c, { x: x, y: y, kind: tp === 2 ? 'leaf' : 'dirt', top: above === 0 || above === 4 });
    else if (tp === 3) Art.drawSoil(c, { x: x, y: y, open: !!fr.p.dig });
    else if (tp === 4) Art.drawSpike(c, { x: x, y: y });
  }
  for (i = 0; i < lv.hives.length; i++) {
    var hv = lv.hives[i], hx = hv.x - cam;
    if (hx < -60 || hx > W + 60) continue;
    Art.drawHive(c, { x: hx, y: hv.y, shaken: !!shaken[hv.id] });
  }
  for (i = 0; i < lv.pickups.length; i++) {
    var pk = lv.pickups[i];
    if (taken[pk.id]) continue;
    var px = pk.x - cam;
    if (px < -40 || px > W + 40) continue;
    Art.drawPickup(c, { x: px, y: pk.y, kind: pk.kind, t: t });
  }
  Art.drawGoal(c, { x: lv.goal.x - cam, y: lv.goal.y, reached: !!fr.gr });
  for (i = 0; i < lv.monDefs.length; i++) {
    var md = lv.monDefs[i], ms = fr.m[i];
    if (!ms || !ms.a) continue;
    var mx = ms.x - cam;
    if (mx < -140 || mx > W + 140) continue;
    if (md.k === 'hedgehog') Art.drawHedgehog(c, { x: mx, y: ms.y, facing: ms.f, hit: ms.h, stun: ms.st, t: t });
    else if (md.k === 'snake') Art.drawSnake(c, { x: mx, y: ms.y, facing: ms.f, state: ms.s, stateT: ms.sT, hit: ms.h, stun: ms.st });
    else if (md.k === 'wasp') Art.drawWasp(c, { x: mx, y: ms.y, facing: ms.f, state: ms.s, hit: ms.h, stun: ms.st, t: t });
    else Art.drawMole(c, { x: mx, y: ms.y, state: ms.s, hit: ms.h, stun: ms.st });
  }
  for (i = 0; i < fr.sh.length; i++) Art.drawAcornShot(c, { x: fr.sh[i][0] - cam, y: fr.sh[i][1], t: fr.sh[i][2] });
  var pp = fr.p;
  Art.drawPlayer(c, { x: pp.x - cam, y: pp.y, sp: pp.sp, facing: pp.f, pose: pp.pose, poseT: pp.pT, invuln: pp.inv });
  for (i = 0; i < evs.length; i++) {
    ev = evs[i];
    var age = (fi - ev.f) / 60;
    if (age < 0 || ev.f > fi) continue;
    if (ev.type === 'wave' && age < 0.3) Art.drawShakeWave(c, { x: ev.x - cam, y: ev.y, t: age, dur: 0.3, radius: 120 });
    else if (ev.type === 'poof' && age < 0.3) Art.drawPoof(c, { x: ev.x - cam, y: ev.y, t: age, dur: 0.3 });
    else if (ev.type === 'gain' && age < 0.8) Art.drawPopup(c, { x: ev.x - cam, y: ev.y - 24, t: age, dur: 0.8, kind: ev.kind, value: fmtVal(ev.n * mult) });
  }
}

function initFrame(lv, sp) {
  var s = SPECIES[sp];
  return {
    cam: 0, p: { x: lv.spawn.x, y: lv.spawn.y - s.h / 2, sp: sp, f: 1, pose: 'idle', pT: 0, inv: false, dig: false },
    m: lv.monDefs.map(function (m) { return { a: true, x: m.x, y: m.y, f: m.f, s: m.s, sT: m.sT, h: false, st: false }; }),
    sh: [], gr: false
  };
}

function drawThumb(c, cardX, cardY, lv, rp) {
  c.save();
  c.translate(cardX + 8, cardY + 8);
  c.beginPath(); c.rect(0, 0, 384, 216); c.clip();
  c.scale(0.3, 0.3);
  if (rp) drawWorld(c, lv, rp.frames[Math.min(rp.len - 1, Math.floor(rp.pos))], rp.events, Math.floor(rp.pos), rp.mult);
  else drawWorld(c, lv, initFrame(lv, curSp), [], 0, 1);
  c.restore();
}

var CARD_POS = [[30, 50], [440, 50], [850, 50]];
var SP_POS = [[30, 350], [440, 350], [850, 350]];

function drawMapScene(c) {
  var i;
  Art.drawMapBackground(c, {});
  for (i = 0; i < 3; i++) {
    var rp = replays[i], st = !unlocked[i] ? 'locked' : (rp ? 'cleared' : 'open');
    var def = LEVEL_DEFS[i];
    Art.drawLevelCard(c, {
      x: CARD_POS[i][0], y: CARD_POS[i][1], index: i + 1, name: def.name, state: st,
      rates: rp ? rp.rates : ZERO, recordSp: rp ? rp.sp : curSp, recordTime: rp ? rp.time : 0,
      parTime: def.par, gold: rp ? rp.gold : false, cost: st === 'locked' ? def.cost : ZERO,
      canAfford: canAfford(def.cost), selected: sel.row === 0 && sel.col === i
    });
    if (st !== 'locked') drawThumb(c, CARD_POS[i][0], CARD_POS[i][1], LEVELS[i], rp);
  }
  for (i = 0; i < 3; i++) {
    var sp = SP_ORDER[i];
    Art.drawSpeciesCard(c, {
      x: SP_POS[i][0], y: SP_POS[i][1], sp: sp, name: SPECIES[sp].name,
      state: !owned[sp] ? 'locked' : (curSp === sp ? 'active' : 'owned'),
      cost: owned[sp] ? ZERO : SP_COST[sp], canAfford: canAfford(SP_COST[sp]), selected: sel.row === 1 && sel.col === i
    });
  }
  Art.drawGoalCard(c, { x: 30, y: 510, cost: GOAL_COST, canAfford: canAfford(GOAL_COST), selected: sel.row === 2 });
  Art.drawHud(c, { mode: 'map', stock: intStock(), ratePerMin: totalRates(false), liveBoost: null, time: null, parTime: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, sp: null });
  c.save();
  c.font = '20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.fillText('↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', W / 2, 690);
  c.restore();
}

function drawLevelScene(c) {
  var fr = run.frames[run.frames.length - 1], fi = run.frames.length - 1;
  drawWorld(c, run.lv, fr, run.events, fi, 1);
  var p = run.p, bear = p.sp === 'bear';
  Art.drawHud(c, {
    mode: 'level', stock: intStock(), ratePerMin: totalRates(mode === 'level'), liveBoost: mode === 'level',
    time: fi / 60, parTime: run.lv.def.par, run: { acorn: run.got.acorn, ore: run.got.ore, honey: run.got.honey },
    hp: Math.max(0, p.hp), maxHp: 3, skillCdT: bear ? 1.5 - p.cdSkill : 1, skillCdDur: bear ? 1.5 : 1, sp: p.sp
  });
}

var GUIDE_TEXT = [
  ['衝到終點', '一路往右, 碰到旗子就過關'],
  ['操作', '空白鍵 跳、Z 攻擊、X 技能'],
  ['踩頭', '跳到怪物頭上就能打倒牠'],
  ['過關後一直重播', '過關的關卡會不停重播賺素材'],
  ['撿多還是跑快', '標準時間內過關, 重播多賺一半']
];
function drawGuide(c) {
  Art.drawMapBackground(c, {});
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(100, 20, 1080, 680);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#fff'; c.font = 'bold 40px sans-serif';
  c.fillText(GUIDE_TEXT[guidePage][0], W / 2, 70);
  c.restore();
  Art.drawGuidePage(c, { page: guidePage + 1, x: 160, y: 120, w: 960, h: 380 });
  c.save();
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
  c.font = '34px sans-serif'; c.fillText(GUIDE_TEXT[guidePage][1], W / 2, 560);
  c.font = '22px sans-serif'; c.fillText((guidePage + 1) + ' / 5', W / 2, 620);
  c.fillStyle = '#ddd';
  c.fillText('← → 翻頁   ' + (guidePage >= 4 ? 'Z 開始' : 'Z 下一頁'), W / 2, 660);
  c.restore();
}

function render() {
  var cvW = canvas.width, cvH = canvas.height;
  ctx.setTransform(cvW / W, 0, 0, cvH / H, 0, 0);
  if (mode === 'guide') { drawGuide(ctx); return; }
  if (mode === 'map') { drawMapScene(ctx); if (paused) Art.drawPausePanel(ctx, { mode: 'map' }); return; }
  if (mode === 'ending') { drawMapScene(ctx); Art.drawEndingPanel(ctx, { totalTime: totalTime }); return; }
  drawLevelScene(ctx);
  if (mode === 'result') Art.drawResultPanel(ctx, lastResult);
  else if (mode === 'fail') Art.drawFailPanel(ctx, {});
  else if (paused) Art.drawPausePanel(ctx, { mode: 'level' });
}

// ---------------------------------------------------------------- 畫布縮放與迴圈
function fit() {
  var cw = window.innerWidth || W, ch = window.innerHeight || H;
  var sc = Math.min(cw / W, ch / H);
  var cssW = Math.max(1, Math.floor(W * sc)), cssH = Math.max(1, Math.floor(H * sc));
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.style.left = Math.floor((cw - cssW) / 2) + 'px'; canvas.style.top = Math.floor((ch - cssH) / 2) + 'px';
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', fit);
fit();

var lastTs = 0, acc = 0;
function frameLoop(ts) {
  requestAnimationFrame(frameLoop);
  var dt = lastTs ? (ts - lastTs) / 1000 : STEP;
  lastTs = ts;
  dt = Math.min(Math.max(dt, 0), 1 / 30);
  acc += dt;
  try {
    while (acc >= STEP) { acc -= STEP; update(); }
    render();
  } catch (err) { console.error(err); acc = 0; }
}
requestAnimationFrame(frameLoop);
