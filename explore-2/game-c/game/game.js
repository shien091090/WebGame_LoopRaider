/* 機兵工坊 — 擊飛連鎖 + 再投資(探索版) */
var W = (window.Art && Art.canvas) ? Art.canvas.width : 1280;
var H = (window.Art && Art.canvas) ? Art.canvas.height : 720;
var T = 40, COLS = 32, ROWS = 18;
var STEP = 1 / 60;
var GRAV = 2400;
var SPRING_DUR = 0.25;
var SLOT_X = [440, 600, 760];
var SLOT_Y = 548;
var MULT = [1, 1.25, 1.5];
var BUILD_ORDER = ['ore', 'battery', 'gear', 'nest', 'spring'];
var KINDS = ['ore', 'battery', 'gear'];

function C(o, b, g) { return { ore: o, battery: b, gear: g }; }
var COST = {
  lv: [null, C(30, 8, 0), C(0, 30, 10)],
  bot: { drill: null, heli: C(40, 15, 0), magnet: C(50, 0, 20) },
  build: { ore: C(15, 0, 0), battery: C(15, 5, 0), gear: C(15, 10, 0), nest: C(10, 10, 0), spring: C(20, 0, 5) },
  speed: [C(30, 10, 0), C(0, 30, 20)],
  goal: C(150, 120, 120)
};
var BOT = {
  drill: { name: '鑽頭號', speed: 260, jump: 720, atkCd: 0.35, skillCd: 0.4, w: 50, h: 40, knock: 420 },
  heli: { name: '螺旋號', speed: 260, jump: 720, atkCd: 0.5, skillCd: 1, w: 0, h: 0, knock: 420 },
  magnet: { name: '磁力號', speed: 230, jump: 700, atkCd: 0.45, skillCd: 1, w: 60, h: 44, knock: 520 }
};
var BOT_LIST = ['drill', 'heli', 'magnet'];
var MON = {
  roller: { w: 32, h: 32, hp: 2, speed: 150, drop: ['ore', 1] },
  bomber: { w: 28, h: 28, hp: 1, speed: 40, drop: ['battery', 1] },
  crab: { w: 40, h: 28, hp: 2, speed: 50, drop: ['gear', 2] },
  hawk: { w: 36, h: 28, hp: 1, speed: 0, drop: ['battery', 1] }
};

/* ---------- 關卡 ---------- */
var MINE_P = [[260, 420], [300, 420], [340, 420], [260, 392], [300, 392], [340, 392]];
var WH_P = [[1140, 420], [1180, 420], [1220, 420], [1140, 392], [1180, 392], [1220, 392]];
var HIGH_P = [[896, 348], [920, 348], [944, 348], [896, 320], [920, 320], [944, 320]];
var LEVELS = [
  {
    name: '廢料場', mine: 5, high: 5, wh: 4, spikes: [],
    pick: [['ore', 260], ['ore', 460], ['ore', 660], ['ore', 860]],
    mons: [['roller', 480, -1], ['bomber', 520, -1], ['bomber', 560, -1], ['roller', 640, -1], ['crab', 700, -1]]
  },
  {
    name: '管線區', mine: 5, high: 6, wh: 5, spikes: [12, 21],
    pick: [['ore', 260], ['ore', 460], ['ore', 660], ['ore', 860], ['battery', 560], ['battery', 1060]],
    mons: [['bomber', 500, -1], ['bomber', 540, -1], ['roller', 580, -1], ['crab', 700, -1], ['roller', 820, -1], ['bomber', 860, -1], ['crab', 900, -1], ['hawk', 640, 450]]
  },
  {
    name: '熔爐', mine: 6, high: 6, wh: 6, spikes: [12, 17, 21],
    pick: [['ore', 260], ['ore', 460], ['ore', 660], ['ore', 860], ['gear', 560], ['gear', 1060]],
    mons: [['bomber', 460, -1], ['bomber', 500, -1], ['roller', 540, -1], ['roller', 580, -1], ['crab', 740, -1], ['roller', 790, -1], ['bomber', 830, -1], ['crab', 880, -1], ['hawk', 500, 450], ['hawk', 900, 450]]
  }
];

/* 共用地形 */
var BASE = (function () {
  var solid = [], any = [], r, c;
  for (r = 0; r < ROWS; r++) { solid.push(new Array(COLS).fill(false)); any.push(new Array(COLS).fill(false)); }
  function fill(c0, c1, r0, r1) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) solid[rr][cc] = true; }
  fill(0, 31, 14, 17);
  fill(2, 2, 12, 13);     // 礦坑入口台階
  fill(4, 8, 11, 11);     // 礦坑地板
  fill(5, 8, 8, 8);       // 礦坑頂
  fill(24, 24, 12, 13);   // 倉庫入口台階
  fill(26, 30, 11, 11);   // 倉庫地板
  fill(27, 30, 8, 8);     // 倉庫頂
  fill(12, 13, 9, 9); fill(16, 17, 9, 9); fill(20, 21, 9, 9); // 捷徑平台
  fill(22, 23, 9, 9);     // 高台
  var rocks = [{ c: 5, r: 10 }];
  var doors = [{ c: 27, r: 9 }, { c: 27, r: 10 }];
  var rockMap = {}, doorMap = {};
  rocks.forEach(function (k, i) { rockMap[k.r * COLS + k.c] = i; });
  doors.forEach(function (k, i) { doorMap[k.r * COLS + k.c] = i; });
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) any[r][c] = solid[r][c];
  rocks.forEach(function (k) { any[k.r][k.c] = true; });
  doors.forEach(function (k) { any[k.r][k.c] = true; });
  var grounds = [];
  for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) if (solid[r][c]) {
    grounds.push({ x: c * T + T / 2, y: r * T + T / 2, top: !(r > 0 && any[r - 1][c]) });
  }
  return { solid: solid, rocks: rocks, doors: doors, rockMap: rockMap, doorMap: doorMap, grounds: grounds };
})();

/* ---------- 狀態 ---------- */
var S = null;
var H_ = { left: false, right: false, jump: false, z: false, x: false };
var zLock = false, xLock = false, atkBuf = 0, skBuf = 0, jumpPressed = false;

function freshState() {
  var lvs = [];
  for (var i = 0; i < 3; i++) lvs.push({ unlocked: i === 0, rec: null, pos: 0, speedLv: 0, builds: ['none', 'none', 'none'] });
  return {
    screen: 'guide', guidePage: 0, paused: false,
    stock: C(0, 0, 0), lv: lvs, bots: { drill: true, heli: false, magnet: false }, cur: 'drill',
    mapRow: 0, mapCol: 0, bCol: 0, bOpt: 0, buildLv: 0,
    run: null, result: null, totalTime: 0, acc: 0
  };
}
S = freshState();

function afford(cost) {
  if (!cost) return true;
  return S.stock.ore >= cost.ore && S.stock.battery >= cost.battery && S.stock.gear >= cost.gear;
}
function pay(cost) { S.stock.ore -= cost.ore; S.stock.battery -= cost.battery; S.stock.gear -= cost.gear; }

/* ---------- 一趟遊戲 ---------- */
function makePickups(L, builds) {
  var a = [], i, j;
  L.pick.forEach(function (p) { a.push({ x: p[1], y: 530, kind: p[0] }); });
  for (i = 0; i < L.mine; i++) a.push({ x: MINE_P[i][0], y: MINE_P[i][1], kind: 'ore' });
  for (i = 0; i < L.high; i++) a.push({ x: HIGH_P[i][0], y: HIGH_P[i][1], kind: 'battery' });
  for (i = 0; i < L.wh; i++) a.push({ x: WH_P[i][0], y: WH_P[i][1], kind: 'gear' });
  for (i = 0; i < 3; i++) {
    var b = builds[i];
    if (b === 'ore' || b === 'battery' || b === 'gear') for (j = 0; j < 4; j++) a.push({ x: SLOT_X[i] - 42 + j * 28, y: 506, kind: b });
  }
  return a;
}

function makeMon(R, k, x, facing, y) {
  var d = MON[k];
  var m = {
    id: ++R.monSeq, k: k, x: x, y: (k === 'hawk') ? y : 560 - d.h / 2, w: d.w, h: d.h, vy: 0, hp: d.hp, facing: facing,
    onGround: false, flying: false, flyT: 0, flyDir: 0, flySpeed: 0, flyHit: null, hitT: 0, blockT: 0,
    dead: false, removed: false, fuseT: 0, chain: 0, t: 0
  };
  if (k === 'hawk') { m.hs = 'hover'; m.cd = 0; m.homeX = x; m.homeY = y; m.diveT = 0; m.dvx = 0; m.dvy = 0; m.facing = -1; }
  return m;
}

function newRun(li, bot, builds) {
  var L = LEVELS[li];
  var R = {
    li: li, bot: bot, builds: builds.slice(), L: L, t: 0, status: 'run',
    p: {
      x: 48, y: 538, w: 32, h: 44, vx: 0, vy: 0, facing: 1, onGround: false, hp: 3, invuln: 0, knockT: 0, knockV: 0,
      atkCd: 0, skillCd: 0, fuel: 1, jumping: false, jumpT: 0, hovering: false,
      anim: '', animT: 99, animDur: 0, basePose: 'idle', baseT: 0, pose: 'idle', poseT: 0
    },
    pickups: makePickups(L, builds), got: [], rockAlive: [true], doorOpen: false,
    mons: [], shots: [], expl: [], poofs: [], chainTexts: [], pops: [], springT: [SPRING_DUR, SPRING_DUR, SPRING_DUR],
    run: C(0, 0, 0), gains: [], frames: [], atk: null, atkSeq: 0, monSeq: 0, chains: {}, lastSnap: null
  };
  R.pickups.forEach(function () { R.got.push(0); });
  // 怪物表第三欄: 一般怪是面向, 鷹是飄浮高度
  L.mons.forEach(function (m) {
    if (m[0] === 'hawk') R.mons.push(makeMon(R, 'hawk', m[1], -1, m[2]));
    else R.mons.push(makeMon(R, m[0], m[1], m[2], 0));
  });
  for (var i = 0; i < 3; i++) {
    if (builds[i] === 'nest') {
      var cx = SLOT_X[i];
      R.mons.push(makeMon(R, 'roller', cx - 60, -1, 0));
      R.mons.push(makeMon(R, 'bomber', cx - 20, -1, 0));
      R.mons.push(makeMon(R, 'bomber', cx + 20, -1, 0));
      R.mons.push(makeMon(R, 'roller', cx + 60, -1, 0));
    }
  }
  R.lastSnap = snapshot(R);
  return R;
}

function solidAt(R, c, r) {
  if (c < 0 || c >= COLS || r < 0) return true;
  if (r >= ROWS) return false;
  if (BASE.solid[r][c]) return true;
  var key = r * COLS + c;
  var ri = BASE.rockMap[key];
  if (ri !== undefined) return R.rockAlive[ri];
  var di = BASE.doorMap[key];
  if (di !== undefined) return !R.doorOpen;
  return false;
}
function moveX(R, e, dx) {
  if (dx === 0) return false;
  e.x += dx;
  var hw = e.w / 2, hh = e.h / 2, hit = false;
  var c0 = Math.floor((e.x - hw) / T), c1 = Math.floor((e.x + hw - 0.01) / T);
  var r0 = Math.floor((e.y - hh) / T), r1 = Math.floor((e.y + hh - 0.01) / T);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
    if (solidAt(R, c, r)) { e.x = dx > 0 ? c * T - hw : (c + 1) * T + hw; hit = true; }
  }
  return hit;
}
function moveY(R, e, dy) {
  if (dy === 0) return false;
  e.y += dy;
  var hw = e.w / 2, hh = e.h / 2, hit = false;
  var c0 = Math.floor((e.x - hw) / T), c1 = Math.floor((e.x + hw - 0.01) / T);
  var r0 = Math.floor((e.y - hh) / T), r1 = Math.floor((e.y + hh - 0.01) / T);
  for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) {
    if (solidAt(R, c, r)) { e.y = dy > 0 ? r * T - hh : (r + 1) * T + hh; hit = true; }
  }
  return hit;
}
function ovl(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}
function liveMon(m) { return !m.dead && !m.removed; }

/* 得到素材 */
function gain(R, x, y, kind, n) {
  R.run[kind] += n;
  R.gains.push({ f: R.frames.length, x: x, y: y, kind: kind, n: n });
  R.pops.push({ x: x, y: y - 14, t: 0, kind: kind, value: n });
}

function killMon(R, m, cid) {
  if (m.dead || m.removed) return;
  m.hp = 0; m.chain = cid; m.flying = false;
  var d = MON[m.k].drop;
  gain(R, m.x, m.y, d[0], d[1]);
  var ch = R.chains[cid] || (R.chains[cid] = { n: 0 });
  ch.n++;
  if (ch.n >= 2) {
    R.chainTexts = R.chainTexts.filter(function (c) { return c.id !== cid; });
    R.chainTexts.push({ x: m.x, y: m.y - 20, n: ch.n, t: 0, id: cid });
  }
  if (m.k === 'bomber') { m.dead = true; m.fuseT = 0; m.vy = 0; }
  else { m.removed = true; m.dead = true; R.poofs.push({ x: m.x, y: m.y, t: 0 }); }
}

function startFly(m, dir, speed) {
  m.flying = true; m.flyDir = dir; m.flySpeed = speed; m.flyT = 0.6; m.flyHit = {}; m.facing = dir; m.blockT = 0;
}

/* 玩家攻擊打中怪物; fromDir = 由玩家指向怪物的水平方向 */
function playerHit(R, m, fromDir, speed, cid) {
  if (!liveMon(m)) return;
  if (m.k === 'crab' && !m.flying && m.facing === -fromDir) { m.blockT = 0.2; m.hitT = 0.1; return; }
  m.chain = cid; m.hp -= 1; m.hitT = 0.1;
  if (m.hp <= 0) killMon(R, m, cid);
  else startFly(m, fromDir, speed);
}

function hurtPlayer(R, srcX) {
  var p = R.p;
  if (p.invuln > 0 || R.status !== 'run') return;
  p.hp -= 1; p.invuln = 1;
  var dir = p.x >= srcX ? 1 : -1;
  p.knockT = 0.15; p.knockV = dir * 80 / 0.15; p.vy = -250; p.onGround = false; p.jumping = false;
  p.anim = 'hurt'; p.animT = 0; p.animDur = 0.3;
  if (p.hp <= 0) R.status = 'fail';
}

function explode(R, m) {
  R.expl.push({ x: m.x, y: m.y, t: 0 });
  R.mons.forEach(function (o) {
    if (o === m || !liveMon(o)) return;
    if (Math.hypot(o.x - m.x, o.y - m.y) <= 90) {
      o.chain = m.chain; o.hp -= 2; o.hitT = 0.1;
      if (o.hp <= 0) killMon(R, o, m.chain);
    }
  });
  if (Math.hypot(R.p.x - m.x, R.p.y - m.y) <= 90) hurtPlayer(R, m.x);
}

function updWalker(R, m, dt) {
  m.vy = Math.min(1200, m.vy + GRAV * dt);
  var hy = moveY(R, m, m.vy * dt);
  if (hy) { if (m.vy > 0) m.onGround = true; m.vy = 0; } else m.onGround = false;
  if (m.dead) return;
  if (!m.onGround) return;
  var dir = m.facing, sp = MON[m.k].speed;
  var hit = moveX(R, m, dir * sp * dt);
  if (hit) m.facing = -dir;
  else {
    var ec = Math.floor((m.x + dir * (m.w / 2)) / T), er = Math.floor((m.y + m.h / 2 + 2) / T);
    if (!solidAt(R, ec, er)) m.facing = -dir;
  }
}
function updHawk(R, m, dt) {
  var p = R.p;
  if (m.hs === 'hover') {
    m.x = m.homeX; m.y = m.homeY + Math.sin(m.t * 2.2) * 8; m.cd -= dt;
    if (m.cd <= 0 && p.y > m.y + 16 && Math.abs(p.x - m.x) <= 120) {
      m.hs = 'dive'; m.diveT = 0.6;
      var dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
      m.dvx = dx / d; m.dvy = dy / d; m.facing = dx >= 0 ? 1 : -1;
    }
  } else if (m.hs === 'dive') {
    m.diveT -= dt;
    var hx = moveX(R, m, m.dvx * 450 * dt), hy = moveY(R, m, m.dvy * 450 * dt);
    if (hx || hy || m.diveT <= 0) m.hs = 'return';
  } else {
    var ex = m.homeX - m.x, ey = m.homeY - m.y, dd = Math.hypot(ex, ey);
    if (dd <= 150 * dt) { m.x = m.homeX; m.y = m.homeY; m.hs = 'hover'; m.cd = 1.5; }
    else { m.x += ex / dd * 150 * dt; m.y += ey / dd * 150 * dt; if (Math.abs(ex) > 1) m.facing = ex > 0 ? 1 : -1; }
  }
}
function updFlying(R, m, dt) {
  var hit = moveX(R, m, m.flyDir * m.flySpeed * dt);
  m.flyT -= dt;
  var i, o;
  for (i = 0; i < R.mons.length; i++) {
    o = R.mons[i];
    if (o === m || !liveMon(o) || m.flyHit[o.id]) continue;
    if (ovl(m.x, m.y, m.w, m.h, o.x, o.y, o.w, o.h)) {
      m.flyHit[o.id] = true;
      o.chain = m.chain; o.hp -= 2; o.hitT = 0.1;
      if (o.hp <= 0) killMon(R, o, m.chain);
      else startFly(o, m.flyDir, m.flySpeed);
    }
  }
  if (hit) {
    m.flying = false; m.hp -= 1; m.hitT = 0.1;
    if (m.hp <= 0) killMon(R, m, m.chain);
  } else if (m.flyT <= 0) m.flying = false;
  if (!m.flying && m.k === 'hawk' && !m.dead) m.hs = 'return';
}
function updMon(R, m, dt) {
  m.t += dt;
  if (m.hitT > 0) m.hitT -= dt;
  if (m.blockT > 0) m.blockT -= dt;
  if (m.dead) {
    if (m.k === 'bomber') {
      updWalker(R, m, dt);
      m.fuseT += dt;
      if (m.fuseT >= 0.3) { m.removed = true; explode(R, m); }
    }
    return;
  }
  if (m.flying) { updFlying(R, m, dt); return; }
  if (m.k === 'hawk') updHawk(R, m, dt); else updWalker(R, m, dt);
}

function stepRun(R, dt) {
  var p = R.p, bd = BOT[R.bot], i;
  R.t += dt;
  p.atkCd = Math.max(0, p.atkCd - dt); p.skillCd = Math.max(0, p.skillCd - dt);
  p.invuln = Math.max(0, p.invuln - dt); p.knockT = Math.max(0, p.knockT - dt);
  p.animT += dt;
  atkBuf = Math.max(0, atkBuf - dt); skBuf = Math.max(0, skBuf - dt);
  for (i = 0; i < 3; i++) R.springT[i] = Math.min(SPRING_DUR, R.springT[i] + dt);

  /* 移動 */
  if (p.knockT > 0) p.vx = p.knockV;
  else {
    var dir = (H_.right ? 1 : 0) - (H_.left ? 1 : 0);
    p.vx = dir * bd.speed;
    if (dir) p.facing = dir;
  }
  if (jumpPressed && p.onGround && p.knockT <= 0) { p.vy = -bd.jump; p.jumpT = 0; p.jumping = true; p.onGround = false; }
  jumpPressed = false;
  if (p.jumping) {
    p.jumpT += dt;
    if (!H_.jump) { if (p.jumpT < 0.15 && p.vy < -bd.jump * 0.5) p.vy = -bd.jump * 0.5; p.jumping = false; }
    else if (p.vy >= 0) p.jumping = false;
  }
  p.hovering = false;
  if (R.bot === 'heli' && p.knockT <= 0) {
    if (p.onGround) p.fuel = 1;
    if (H_.x && !xLock && p.fuel > 0) { p.hovering = true; p.vy = -220; p.fuel = Math.max(0, p.fuel - dt / 1.2); p.jumping = false; p.onGround = false; }
  }
  if (!p.hovering) p.vy = Math.min(1200, p.vy + GRAV * dt);
  moveX(R, p, p.vx * dt);
  var hy = moveY(R, p, p.vy * dt);
  if (hy) { if (p.vy > 0) { p.onGround = true; } p.vy = 0; } else p.onGround = false;
  if (p.onGround && R.bot === 'heli') p.fuel = 1;

  /* 彈跳板 */
  for (i = 0; i < 3; i++) {
    if (R.builds[i] === 'spring' && R.springT[i] >= SPRING_DUR && p.vy >= 0 &&
      ovl(p.x, p.y, p.w, p.h, SLOT_X[i], 560 - 12, 80, 24)) {
      p.y = Math.min(p.y, 560 - 24 - p.h / 2);
      p.vy = -1000; p.onGround = false; p.jumping = false; R.springT[i] = 0;
    }
  }

  /* 攻擊 */
  if (p.knockT <= 0) {
    if (((H_.z && !zLock) || atkBuf > 0) && p.atkCd <= 0) {
      p.atkCd = bd.atkCd; atkBuf = 0;
      p.anim = 'attack'; p.animT = 0; p.animDur = 0.15;
      var cid = ++R.atkSeq;
      if (R.bot === 'heli') {
        R.shots.push({ x: p.x + p.facing * 24, y: p.y, dir: p.facing, t: 0, dist: 0, cid: cid });
      } else {
        R.atk = { t: 0, dur: 0.15, hit: {}, cid: cid, dir: p.facing };
      }
    }
    if (((H_.x && !xLock) || skBuf > 0) && p.skillCd <= 0 && R.bot !== 'heli') {
      p.skillCd = bd.skillCd; skBuf = 0;
      if (R.bot === 'drill') {
        p.anim = 'drill'; p.animT = 0; p.animDur = 0.2;
        var edge = p.x + p.facing * 16, offs = [20, 2, 38], row = Math.floor(p.y / T);
        for (i = 0; i < offs.length; i++) {
          var col = Math.floor((edge + p.facing * offs[i]) / T);
          var ri = BASE.rockMap[row * COLS + col];
          if (ri !== undefined && R.rockAlive[ri]) {
            R.rockAlive[ri] = false;
            R.poofs.push({ x: col * T + T / 2, y: row * T + T / 2, t: 0 });
            break;
          }
        }
      } else {
        p.anim = 'magnet'; p.animT = 0; p.animDur = 0.4;
        if (!R.doorOpen) {
          for (i = 0; i < BASE.doors.length; i++) {
            var d = BASE.doors[i];
            var nx = Math.max(d.c * T, Math.min(p.x, d.c * T + T)), ny = Math.max(d.r * T, Math.min(p.y, d.r * T + T));
            if (Math.hypot(p.x - nx, p.y - ny) <= 120) { R.doorOpen = true; break; }
          }
        }
      }
    }
  }
  /* 近戰判定(鑽擊/磁力拳) */
  if (R.atk) {
    var a = R.atk;
    a.t += dt;
    var w = bd.w, h = bd.h, cx = p.x + a.dir * (16 + w / 2);
    R.mons.forEach(function (m) {
      if (!liveMon(m) || a.hit[m.id]) return;
      if (ovl(cx, p.y, w, h, m.x, m.y, m.w, m.h)) {
        a.hit[m.id] = true;
        var fd = m.x >= p.x ? 1 : -1;
        playerHit(R, m, fd, bd.knock, a.cid);
      }
    });
    if (a.t >= a.dur) R.atk = null;
  }
  /* 氣旋彈 */
  R.shots = R.shots.filter(function (s) {
    s.t += dt;
    var dx = 500 * s.dir * dt; s.x += dx; s.dist += Math.abs(dx);
    if (solidAt(R, Math.floor(s.x / T), Math.floor(s.y / T))) return false;
    for (var k = 0; k < R.mons.length; k++) {
      var m = R.mons[k];
      if (liveMon(m) && ovl(s.x, s.y, 20, 20, m.x, m.y, m.w, m.h)) { playerHit(R, m, s.dir, BOT.heli.knock, s.cid); return false; }
    }
    return s.dist < 300;
  });
  /* 怪物 */
  R.mons.forEach(function (m) { if (!m.removed) updMon(R, m, dt); });
  R.mons = R.mons.filter(function (m) { return !m.removed; });
  /* 碰到怪物 */
  R.mons.forEach(function (m) {
    if (!liveMon(m) || m.flying) return;
    if (ovl(p.x, p.y, p.w, p.h, m.x, m.y, m.w, m.h)) hurtPlayer(R, m.x);
  });
  /* 撿素材 */
  for (i = 0; i < R.pickups.length; i++) {
    var pk = R.pickups[i];
    if (!R.got[i] && ovl(p.x, p.y, p.w, p.h, pk.x, pk.y, 24, 24)) { R.got[i] = 1; gain(R, pk.x, pk.y, pk.kind, 1); }
  }
  /* 尖刺 / 掉落 */
  var L = R.L;
  for (i = 0; i < L.spikes.length; i++) {
    if (ovl(p.x, p.y, p.w, p.h, L.spikes[i] * T + T / 2, 13 * T + 30, 40, 20)) R.status = 'fail';
  }
  if (p.y - p.h / 2 > H) R.status = 'fail';
  /* 特效計時 */
  function tick(arr, dur) { return arr.filter(function (e) { e.t += dt; return e.t < dur; }); }
  R.poofs = tick(R.poofs, 0.3); R.expl = tick(R.expl, 0.3); R.chainTexts = tick(R.chainTexts, 0.8); R.pops = tick(R.pops, 0.8);
  /* 過關 */
  if (R.status === 'run' && ovl(p.x, p.y, p.w, p.h, 1260, 520, 40, 80)) R.status = 'clear';
  /* 姿勢 */
  var base;
  if (p.hovering) base = 'hover';
  else if (!p.onGround) base = p.vy < 0 ? 'rise' : 'fall';
  else base = Math.abs(p.vx) > 1 ? 'run' : 'idle';
  if (base !== p.basePose) { p.basePose = base; p.baseT = 0; } else p.baseT += dt;
  if (p.animT < p.animDur) { p.pose = p.anim; p.poseT = p.animT; } else { p.pose = base; p.poseT = p.baseT; }
  R.lastSnap = snapshot(R);
  if (R.status === 'run' || R.status === 'clear') R.frames.push(R.lastSnap);
}

function snapshot(R) {
  var p = R.p;
  var s = {
    t: R.t,
    p: { x: p.x, y: p.y, bot: R.bot, facing: p.facing, pose: p.pose, poseT: p.poseT, fuel: R.bot === 'heli' ? p.fuel : null, invuln: p.invuln > 0 },
    mons: [], shots: [], expl: [], poofs: [], chains: [], pops: [],
    got: R.got.slice(), rocks: R.rockAlive.slice(), doorOpen: R.doorOpen, springT: R.springT.slice(), goalReached: R.status === 'clear'
  };
  R.mons.forEach(function (m) {
    if (m.removed) return;
    var st = '';
    if (m.k === 'bomber') st = m.dead ? 'fuse' : 'walk';
    else if (m.k === 'crab') st = m.blockT > 0 ? 'block' : 'walk';
    else if (m.k === 'hawk') st = m.hs;
    s.mons.push({ k: m.k, x: m.x, y: m.y, facing: m.facing, state: st, flying: m.flying, hit: m.hitT > 0, fuseT: m.k === 'bomber' && m.dead ? m.fuseT : 0.3, t: m.t });
  });
  R.shots.forEach(function (e) { s.shots.push({ x: e.x, y: e.y, facing: e.dir, t: e.t }); });
  R.expl.forEach(function (e) { s.expl.push({ x: e.x, y: e.y, t: e.t }); });
  R.poofs.forEach(function (e) { s.poofs.push({ x: e.x, y: e.y, t: e.t }); });
  R.chainTexts.forEach(function (e) { s.chains.push({ x: e.x, y: e.y, n: e.n, t: e.t }); });
  R.pops.forEach(function (e) { s.pops.push({ x: e.x, y: e.y, t: e.t, kind: e.kind, value: e.value }); });
  return s;
}

/* ---------- 繪製 ---------- */
function drawScene(ctx, D, s, hidePlayer) {
  var i;
  Art.drawBackground(ctx, {});
  BASE.grounds.forEach(function (g) { Art.drawGround(ctx, { x: g.x, y: g.y, top: g.top }); });
  var L = LEVELS[D.li];
  L.spikes.forEach(function (c) { Art.drawSpike(ctx, { x: c * T + T / 2, y: 13 * T + T / 2 }); });
  BASE.rocks.forEach(function (k, idx) { if (s.rocks[idx]) Art.drawSoftRock(ctx, { x: k.c * T + T / 2, y: k.r * T + T / 2 }); });
  if (!s.doorOpen) BASE.doors.forEach(function (k) { Art.drawMagnetDoor(ctx, { x: k.c * T + T / 2, y: k.r * T + T / 2 }); });
  for (i = 0; i < 3; i++) Art.drawSlot(ctx, { x: SLOT_X[i], y: SLOT_Y, build: D.builds[i], springT: s.springT[i], springDur: SPRING_DUR });
  D.pickups.forEach(function (pk, idx) { if (!s.got[idx]) Art.drawPickup(ctx, { x: pk.x, y: pk.y, kind: pk.kind, t: s.t }); });
  Art.drawGoal(ctx, { x: 1260, y: 520, reached: s.goalReached });
  s.mons.forEach(function (m) {
    if (m.k === 'roller') Art.drawRoller(ctx, { x: m.x, y: m.y, facing: m.facing, flying: m.flying, hit: m.hit, t: m.t });
    else if (m.k === 'bomber') Art.drawBomber(ctx, { x: m.x, y: m.y, facing: m.facing, state: m.state, flying: m.flying, hit: m.hit, fuseT: m.fuseT, fuseDur: 0.3 });
    else if (m.k === 'crab') Art.drawCrab(ctx, { x: m.x, y: m.y, facing: m.facing, state: m.state, flying: m.flying, hit: m.hit });
    else Art.drawHawk(ctx, { x: m.x, y: m.y, facing: m.facing, state: m.state, flying: m.flying, hit: m.hit, t: m.t });
  });
  if (!hidePlayer) Art.drawPlayer(ctx, s.p);
  s.shots.forEach(function (e) { Art.drawCycloneShot(ctx, { x: e.x, y: e.y, facing: e.facing, t: e.t }); });
  s.expl.forEach(function (e) { Art.drawExplosion(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.3, radius: 90 }); });
  s.poofs.forEach(function (e) { Art.drawPoof(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.3 }); });
  s.chains.forEach(function (e) { Art.drawChainText(ctx, { x: e.x, y: e.y, n: e.n, t: e.t, dur: 0.8 }); });
  s.pops.forEach(function (e) { Art.drawPopup(ctx, { x: e.x, y: e.y, t: e.t, dur: 0.8, kind: e.kind, value: e.value }); });
}

var previewCache = {};
function previewOf(li, builds) {
  var key = li + ':' + builds.join(',');
  if (!previewCache[key]) { var R = newRun(li, 'drill', builds); previewCache[key] = { D: R, snap: R.lastSnap }; }
  return previewCache[key];
}

/* ---------- 回放 ---------- */
function makeRec(R) {
  var N = R.frames.length, gainsAt = {}, tot = C(0, 0, 0);
  R.gains.forEach(function (g) { (gainsAt[g.f] = gainsAt[g.f] || []).push(g); tot[g.kind] += g.n; });
  return { li: R.li, bot: R.bot, builds: R.builds.slice(), pickups: R.pickups, frames: R.frames, gainsAt: gainsAt, totals: tot, time: N / 60 };
}
function recRates(rec, mult) {
  var k = 3600 / rec.frames.length * mult;
  return C(rec.totals.ore * k, rec.totals.battery * k, rec.totals.gear * k);
}
function advanceReplay(lv, dt) {
  var rec = lv.rec;
  if (!rec) return;
  var N = rec.frames.length;
  var prevK = Math.floor(lv.pos);
  lv.pos += dt * 60 * MULT[lv.speedLv];
  var curK = Math.floor(lv.pos);
  for (var k = prevK + 1; k <= curK; k++) {
    var g = rec.gainsAt[k % N];
    if (g) for (var i = 0; i < g.length; i++) S.stock[g[i].kind] += g[i].n;
  }
  if (lv.pos >= N * 100) lv.pos -= N * 100;
}
function totalRate() {
  var t = C(0, 0, 0);
  S.lv.forEach(function (lv) {
    if (!lv.rec) return;
    var r = recRates(lv.rec, MULT[lv.speedLv]);
    KINDS.forEach(function (k) { t[k] += r[k]; });
  });
  return t;
}

/* ---------- 流程 ---------- */
function startLevel(li) {
  var lv = S.lv[li];
  S.run = newRun(li, S.cur, lv.builds);
  S.acc = 0; S.screen = 'play'; S.paused = false;
  zLock = H_.z; xLock = H_.x; atkBuf = 0; skBuf = 0; jumpPressed = false;
}
function onClear() {
  var R = S.run, lv = S.lv[R.li];
  KINDS.forEach(function (k) { S.stock[k] += R.run[k]; });
  var rec = makeRec(R);
  var replaced = !!lv.rec;
  lv.rec = rec; lv.pos = 0;
  var r = recRates(rec, 1);
  S.result = { time: rec.time, run: C(R.run.ore, R.run.battery, R.run.gear), rates: r, bot: R.bot, replaced: replaced };
  S.screen = 'result';
}
function resetAll() { var g = S.guidePage; S = freshState(); S.guidePage = 0; previewCache = {}; }

function update(dt) {
  if (S.screen === 'ending' || S.screen === 'guide' || S.paused) return;
  S.totalTime += dt;
  S.lv.forEach(function (lv) { advanceReplay(lv, dt); });
  if (S.screen === 'play' && S.run.status === 'run') {
    S.acc += dt;
    while (S.acc >= STEP && S.run.status === 'run') { stepRun(S.run, STEP); S.acc -= STEP; }
    if (S.run.status === 'clear') onClear();
    else if (S.run.status === 'fail') S.screen = 'fail';
  }
}

/* ---------- 輸入 ---------- */
// art.js 的 drawGuidePage 頁碼從 0 起算
var GUIDE_PAGE_BASE = 0;
var GUIDE = [
  { title: '衝到終點', text: '碰到旗子就過關', box: { x: 240, y: 190, w: 800, h: 450 } },
  { title: '操作', text: '空白鍵 跳、Z 攻擊、X 技能', box: { x: 140, y: 200, w: 1000, h: 367 } },
  { title: '過關後一直重播', text: '過關的關卡會不停重播賺素材', box: { x: 320, y: 200, w: 640, h: 400 } },
  { title: '撿多還是跑快', text: '撿越多、跑越快, 重播賺越快', box: { x: 150, y: 200, w: 980, h: 420 } }
];

function inputDown(code) {
  if (S.screen === 'ending') { if (code === 'KeyZ') resetAll(); return; }
  if (code === 'Escape') {
    if (S.screen === 'play' || S.screen === 'map' || S.screen === 'build') S.paused = !S.paused;
    return;
  }
  if (S.paused) {
    if (S.screen === 'play') {
      if (code === 'KeyZ') startLevel(S.run.li);
      else if (code === 'KeyX') { S.paused = false; S.screen = 'map'; S.run = null; }
    }
    return;
  }
  var lv, i;
  switch (S.screen) {
    case 'guide':
      if (code === 'ArrowLeft') S.guidePage = Math.max(0, S.guidePage - 1);
      else if (code === 'ArrowRight') S.guidePage = Math.min(GUIDE.length - 1, S.guidePage + 1);
      else if (code === 'KeyZ') { if (S.guidePage < GUIDE.length - 1) S.guidePage++; else S.screen = 'map'; }
      break;
    case 'map':
      if (code === 'ArrowUp') { S.mapRow = Math.max(0, S.mapRow - 1); }
      else if (code === 'ArrowDown') { S.mapRow = Math.min(2, S.mapRow + 1); }
      else if (code === 'ArrowLeft') { if (S.mapRow < 2) S.mapCol = Math.max(0, S.mapCol - 1); }
      else if (code === 'ArrowRight') { if (S.mapRow < 2) S.mapCol = Math.min(2, S.mapCol + 1); }
      else if (code === 'Space') { S.guidePage = 0; S.screen = 'guide'; }
      else if (code === 'KeyX') {
        if (S.mapRow === 0 && S.lv[S.mapCol].rec) { S.buildLv = S.mapCol; S.bCol = 0; S.bOpt = 0; S.screen = 'build'; }
      } else if (code === 'KeyZ') mapConfirm();
      if (S.mapRow === 2) S.mapCol = 0;
      break;
    case 'build':
      lv = S.lv[S.buildLv];
      if (code === 'ArrowLeft') S.bCol = Math.max(0, S.bCol - 1);
      else if (code === 'ArrowRight') S.bCol = Math.min(3, S.bCol + 1);
      else if (code === 'ArrowUp') { if (S.bCol < 3 && lv.builds[S.bCol] === 'none') S.bOpt = Math.max(0, S.bOpt - 1); }
      else if (code === 'ArrowDown') { if (S.bCol < 3 && lv.builds[S.bCol] === 'none') S.bOpt = Math.min(4, S.bOpt + 1); }
      else if (code === 'KeyX') S.screen = 'map';
      else if (code === 'KeyZ') {
        if (S.bCol < 3) {
          if (lv.builds[S.bCol] === 'none') {
            var b = BUILD_ORDER[S.bOpt], cost = COST.build[b];
            if (afford(cost)) { pay(cost); lv.builds[S.bCol] = b; }
          }
        } else if (lv.speedLv < 2) {
          var sc = COST.speed[lv.speedLv];
          if (afford(sc)) { pay(sc); lv.speedLv++; }
        }
      }
      break;
    case 'play':
      if (code === 'Space') jumpPressed = true;
      else if (code === 'KeyZ') atkBuf = 0.12;
      else if (code === 'KeyX') skBuf = 0.12;
      break;
    case 'result':
      if (code === 'KeyZ') S.screen = 'map';
      else if (code === 'KeyX') startLevel(S.result ? S.run.li : 0);
      break;
    case 'fail':
      if (code === 'KeyZ') startLevel(S.run.li);
      else if (code === 'KeyX') { S.screen = 'map'; S.run = null; }
      break;
  }
}

function mapConfirm() {
  var i;
  if (S.mapRow === 0) {
    i = S.mapCol;
    var lv = S.lv[i];
    if (lv.unlocked) startLevel(i);
    else if (afford(COST.lv[i])) { pay(COST.lv[i]); lv.unlocked = true; }
  } else if (S.mapRow === 1) {
    var b = BOT_LIST[S.mapCol];
    if (S.bots[b]) S.cur = b;
    else if (afford(COST.bot[b])) { pay(COST.bot[b]); S.bots[b] = true; }
  } else {
    if (afford(COST.goal)) { pay(COST.goal); S.screen = 'ending'; S.paused = false; }
  }
}

var CODES = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, Escape: 1 };
function onKeyDown(e) {
  var code = e.code;
  if (!CODES[code]) return;
  e.preventDefault();
  if (e.repeat) return;
  if (code === 'ArrowLeft') H_.left = true;
  else if (code === 'ArrowRight') H_.right = true;
  else if (code === 'Space') H_.jump = true;
  else if (code === 'KeyZ') H_.z = true;
  else if (code === 'KeyX') H_.x = true;
  inputDown(code);
}
function onKeyUp(e) {
  var code = e.code;
  if (!CODES[code]) return;
  e.preventDefault();
  if (code === 'ArrowLeft') H_.left = false;
  else if (code === 'ArrowRight') H_.right = false;
  else if (code === 'Space') H_.jump = false;
  else if (code === 'KeyZ') { H_.z = false; zLock = false; }
  else if (code === 'KeyX') { H_.x = false; xLock = false; }
}
function clearHeld() { H_.left = H_.right = H_.jump = H_.z = H_.x = false; zLock = false; xLock = false; }

/* ---------- 畫面 ---------- */
var FONT = 'Microsoft JhengHei, PingFang TC, sans-serif';
function text(ctx, s, x, y, size, color, align) {
  ctx.font = 'bold ' + size + 'px ' + FONT;
  ctx.fillStyle = color || '#fff';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function hudMap(ctx) {
  Art.drawHud(ctx, { mode: 'map', stock: S.stock, ratePerMin: totalRate(), time: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, bot: null });
}
function hudLevel(ctx) {
  var R = S.run, bd = BOT[R.bot];
  var dur = R.bot === 'heli' ? 1 : bd.skillCd;
  var cdT = R.bot === 'heli' ? 1 : dur - R.p.skillCd;
  Art.drawHud(ctx, { mode: 'level', stock: S.stock, ratePerMin: totalRate(), time: R.t, run: R.run, hp: R.p.hp, maxHp: 3, skillCdT: cdT, skillCdDur: dur, bot: R.bot });
}

function drawThumb(ctx, x, y, D, snap, hidePlayer) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 8, y + 8, 384, 216); ctx.clip();
  ctx.translate(x + 8, y + 8); ctx.scale(0.3, 0.3);
  drawScene(ctx, D, snap, hidePlayer);
  ctx.restore();
}

var CARD_X = [30, 440, 850];
function drawMap(ctx) {
  Art.drawMapBackground(ctx, {});
  var i;
  for (i = 0; i < 3; i++) {
    var lv = S.lv[i], state = !lv.unlocked ? 'locked' : (lv.rec ? 'cleared' : 'open');
    var rec = lv.rec, mult = MULT[lv.speedLv];
    var cost = COST.lv[i] || C(0, 0, 0);
    Art.drawLevelCard(ctx, {
      x: CARD_X[i], y: 50, index: i + 1, name: LEVELS[i].name, state: state,
      rates: rec ? recRates(rec, mult) : C(0, 0, 0), recordBot: rec ? rec.bot : null, recordTime: rec ? rec.time : null,
      builds: lv.builds.slice(), speedLv: lv.speedLv, cost: cost, canAfford: afford(cost),
      selected: S.screen === 'map' && S.mapRow === 0 && S.mapCol === i
    });
    if (state === 'cleared') {
      var fi = Math.floor(lv.pos) % rec.frames.length;
      drawThumb(ctx, CARD_X[i], 50, rec, rec.frames[fi], false);
    } else if (state === 'open') {
      var pv = previewOf(i, lv.builds);
      drawThumb(ctx, CARD_X[i], 50, pv.D, pv.snap, false);
    }
  }
  for (i = 0; i < 3; i++) {
    var b = BOT_LIST[i], bc = COST.bot[b] || C(0, 0, 0);
    Art.drawBotCard(ctx, {
      x: CARD_X[i], y: 350, bot: b, name: BOT[b].name, state: !S.bots[b] ? 'locked' : (S.cur === b ? 'active' : 'owned'),
      cost: bc, canAfford: afford(bc), selected: S.screen === 'map' && S.mapRow === 1 && S.mapCol === i
    });
  }
  Art.drawGoalCard(ctx, { x: 30, y: 510, cost: COST.goal, canAfford: afford(COST.goal), selected: S.screen === 'map' && S.mapRow === 2 });
  hudMap(ctx);
  text(ctx, '↑↓←→ 選擇  Z 確定  X 改造  空白鍵 說明  Esc 暫停', 640, 690, 22, '#ddd');
}

function drawBuild(ctx) {
  var li = S.buildLv, lv = S.lv[li];
  var slotPos = SLOT_X.map(function (sx) { return { x: 60 + sx * 0.5, y: 130 + SLOT_Y * 0.5 }; });
  var options = BUILD_ORDER.map(function (b) { return { cost: COST.build[b], canAfford: afford(COST.build[b]) }; });
  var sc = lv.speedLv < 2 ? COST.speed[lv.speedLv] : null;
  Art.drawBuildPanel(ctx, {
    levelIndex: li + 1, levelName: LEVELS[li].name, col: S.bCol, opt: S.bOpt, builds: lv.builds.slice(), options: options,
    slotPos: slotPos, speedLv: lv.speedLv, speedCost: sc, speedCanAfford: sc ? afford(sc) : false
  });
  var pv = previewOf(li, lv.builds);
  ctx.save();
  ctx.beginPath(); ctx.rect(60, 130, 640, 360); ctx.clip();
  ctx.translate(60, 130); ctx.scale(0.5, 0.5);
  drawScene(ctx, pv.D, pv.snap, true);
  ctx.restore();
}

function drawGuide(ctx) {
  var g = GUIDE[S.guidePage];
  Art.drawMapBackground(ctx, {});
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  text(ctx, g.title, 640, 62, 46, '#ffe08a');
  text(ctx, g.text, 640, 130, 32, '#fff');
  Art.drawGuidePage(ctx, { page: S.guidePage + GUIDE_PAGE_BASE, x: g.box.x, y: g.box.y, w: g.box.w, h: g.box.h });
  text(ctx, '第 ' + (S.guidePage + 1) + ' / ' + GUIDE.length + ' 頁', 640, 662, 24, '#fff');
  text(ctx, '← → 翻頁    Z ' + (S.guidePage < GUIDE.length - 1 ? '下一頁' : '開始'), 640, 696, 22, '#ddd');
}

function render(ctx) {
  ctx.clearRect(0, 0, W, H);
  var sc = S.screen;
  if (sc === 'guide') { drawGuide(ctx); return; }
  if (sc === 'play' || sc === 'result' || sc === 'fail') {
    drawScene(ctx, S.run, S.run.lastSnap, false);
    hudLevel(ctx);
    if (sc === 'result') Art.drawResultPanel(ctx, S.result);
    else if (sc === 'fail') Art.drawFailPanel(ctx, {});
    else if (S.paused) Art.drawPausePanel(ctx, { mode: 'level' });
    return;
  }
  drawMap(ctx);
  if (sc === 'build') drawBuild(ctx);
  if (sc === 'ending') Art.drawEndingPanel(ctx, { totalTime: S.totalTime });
  else if (S.paused) Art.drawPausePanel(ctx, { mode: 'map' });
}

/* ---------- 啟動 ---------- */
var canvas = null, ctx2 = null, lastTs = 0;
function resize() {
  var wrap = canvas.parentNode;
  var cw = wrap.clientWidth || window.innerWidth, ch = wrap.clientHeight || window.innerHeight;
  var s = Math.min(cw / W, ch / H);
  var cssW = Math.max(1, Math.floor(W * s)), cssH = Math.max(1, Math.floor(H * s));
  var dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
}
function frame(ts) {
  requestAnimationFrame(frame);
  var dt = lastTs ? (ts - lastTs) / 1000 : 0;
  lastTs = ts;
  dt = Math.max(0, Math.min(dt, 1 / 30));
  try {
    update(dt);
    ctx2.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    render(ctx2);
  } catch (err) { console.error(err); }
}
function boot() {
  canvas = document.getElementById('c');
  ctx2 = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearHeld);
  requestAnimationFrame(frame);
}
if (typeof document !== 'undefined' && document.getElementById('c')) boot();
