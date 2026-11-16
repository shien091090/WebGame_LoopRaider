// 連斬回廊 — 玩法驗證 Demo
// 繪製一律呼叫 Art.drawXxx; 本檔只管規則與狀態
const W = Art.canvas.width, H = Art.canvas.height;
const T = 40, COLS = 32, ROWS = 18;
const STEP = 1 / 120;           // 物理固定步長
const GRAV = 2400;
const COMBO_T = 1.5;
const MAX_HP = 3;
const SPEED_MULT = [1, 1.25, 1.5];
const SPEED_COST = [50, 150];
const GOAL_COST = 500;
const FONT = "'Microsoft JhengHei','Noto Sans TC','PingFang TC',sans-serif";

// 沒有需要的佔位圖形 (全部走 Art)
const Placeholder = {};

const CLS = {
  assassin: { name: '刺客', speed: 300, jump: 720, w: 28, h: 36, dashDist: 140, dashDur: 0.14, airDash: 1, cost: 0, cd: 2 },
  knight:   { name: '重騎', speed: 220, jump: 640, w: 32, h: 44, dashDist: 200, dashDur: 0.2,  airDash: 1, cost: 60, cd: 1 },
  wind:     { name: '風術士', speed: 260, jump: 760, w: 28, h: 44, dashDist: 120, dashDur: 0.12, airDash: 2, cost: 120, cd: 1 }
};
const CLS_LIST = ['assassin', 'knight', 'wind'];

// ===================== 關卡 =====================
// 欄位: pits 坑(含), wind 風車+高路, tunnel 刺客窄道, hill 鐵箱丘, vault 踏板金幣庫
function buildLevel(cfg) {
  const g = [];
  for (let r = 0; r < ROWS; r++) { g.push(new Array(COLS).fill('.')); }
  const L = { name: cfg.name, cost: cfg.cost, grid: g, coins: [], imps: [], eyes: [], spikes: [], crates: [],
    windmill: null, plate: null, goalCol: 31, startCol: 1 };
  const set = function (c, r, ch) {
    if (g[r][c] !== '.') { throw new Error('overlap ' + cfg.name + ' ' + c + ',' + r + ' ' + g[r][c] + '->' + ch); }
    g[r][c] = ch;
  };
  const coin = function (c, r) { L.coins.push({ x: c * T + 20, y: r * T + 20 }); };
  // 地面 rows 15~17
  for (let c = 0; c < COLS; c++) {
    let pit = false;
    for (let i = 0; i < cfg.pits.length; i++) { if (c >= cfg.pits[i][0] && c <= cfg.pits[i][1]) pit = true; }
    if (!pit) { for (let r = 15; r <= 17; r++) set(c, r, '#'); }
  }
  // 主路線金幣
  cfg.coins.forEach(function (p) { coin(p[0], p[1]); });
  // 風車 + 高路(平台 row 8, 金幣 row 7)
  if (cfg.wind) {
    const w = cfg.wind;
    L.windmill = { c: w.c, x: w.c * T + 20, y: 14 * T + 20 };
    for (let c = w.c + 1; c <= w.end; c++) set(c, 8, '#');
    for (let i = 0; i < w.n; i++) coin(w.c + 1 + i, 7);
  }
  // 刺客窄道: 屋頂 row 13, 通道 row 14
  if (cfg.tunnel) {
    for (let c = cfg.tunnel[0]; c <= cfg.tunnel[1]; c++) { set(c, 13, '#'); coin(c, 14); }
  }
  // 鐵箱丘: 階梯 + 鐵箱 + 屋頂(row 12), 下方通道 rows 13~14
  if (cfg.hill) {
    const h = cfg.hill;
    set(h.c0, 14, '#');
    set(h.c0 + 1, 13, 'B'); set(h.c0 + 1, 14, 'B');
    L.crates.push({ cells: [[h.c0 + 1, 13], [h.c0 + 1, 14]] });
    for (let c = h.c0 + 2; c <= h.c0 + 1 + h.roof; c++) set(c, 12, '#');
    if (h.extra) {
      set(h.extra, 13, 'B'); set(h.extra, 14, 'B');
      L.crates.push({ cells: [[h.extra, 13], [h.extra, 14]] });
    }
  }
  // 踏板金幣庫: 階梯 2 格 + 屋頂 4 格(最右一格下方是重閘門) + 踏板
  if (cfg.vault) {
    const v = cfg.vault.v;
    set(v, 14, '#');
    set(v + 1, 13, '#'); set(v + 1, 14, '#');
    for (let c = v + 2; c <= v + 5; c++) set(c, 12, '#');
    set(v + 5, 13, 'G'); set(v + 5, 14, 'G');
    L.plate = { c: v + 6, x: (v + 6) * T + 20, y: 15 * T - 6 };
    const slots = [[v + 2, 14], [v + 3, 14], [v + 4, 14], [v + 3, 13], [v + 2, 13], [v + 4, 13]];
    for (let i = 0; i < cfg.vault.n; i++) coin(slots[i][0], slots[i][1]);
  }
  (cfg.spikes || []).forEach(function (s) { set(s[0], s[1], '.'); L.spikes.push({ c: s[0], r: s[1], x: s[0] * T + 20, y: s[1] * T + 20 }); });
  (cfg.imps || []).forEach(function (m) { L.imps.push({ x: m[0] * T + 20, y: m[1] }); });
  (cfg.eyes || []).forEach(function (m) { L.eyes.push({ x: m[0], y: m[1] }); });
  return L;
}

const LEVELS = [
  buildLevel({
    name: '迴廊', cost: 0, pits: [[10, 12], [22, 23]],
    wind: { c: 3, end: 8, n: 4 }, tunnel: [5, 8], hill: { c0: 15, roof: 4 }, vault: { v: 24, n: 4 },
    coins: [[2, 14], [6, 12], [8, 12], [9, 14], [11, 9], [14, 13], [18, 11], [21, 13], [22.5, 10], [27, 11]],
    spikes: [],
    imps: [[6.5, 504], [18.5, 464], [27.5, 464]],
    eyes: [[460, 480], [920, 480], [580, 470]]
  }),
  buildLevel({
    name: '斷橋', cost: 40, pits: [[10, 12], [22, 23]],
    wind: { c: 2, end: 8, n: 5 }, tunnel: [5, 8], hill: { c0: 16, roof: 3 }, vault: { v: 24, n: 5 },
    coins: [[3, 14], [6, 12], [8, 12], [9, 14], [11, 9], [14, 11], [15, 11], [18, 11], [21, 13], [22.5, 10], [27, 11], [29, 11]],
    spikes: [[14, 14], [15, 14]],
    imps: [[6.5, 504], [19.5, 464], [19.5, 584], [27.5, 464]],
    eyes: [[460, 480], [920, 480], [580, 470], [860, 440]]
  }),
  buildLevel({
    name: '塔頂', cost: 100, pits: [[10, 12], [22, 23]],
    wind: { c: 2, end: 8, n: 5 }, tunnel: [4, 8], hill: { c0: 15, roof: 4, extra: 19 }, vault: { v: 24, n: 5 },
    coins: [[3, 14], [5, 12], [8, 12], [9, 14], [11, 9], [14, 11], [15, 11], [18, 11], [20, 11], [21, 13], [22.5, 10], [27, 11], [29, 11], [30, 12]],
    spikes: [[14, 14], [6, 12], [7, 12]],
    imps: [[4.5, 504], [18.5, 464], [17.5, 584], [27.5, 464], [6.5, 304]],
    eyes: [[460, 480], [920, 480], [580, 470], [860, 440], [1000, 430]]
  })
];

// ===================== 全域狀態 =====================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let scaleX = 1, scaleY = 1;

const keys = {};
const inp = { jumpP: false, jumpR: false, dashP: false, skillP: false };

let G = null;      // 整場狀態
let run = null;    // 目前這趟

function newGame() {
  return {
    screen: 'guide', guidePage: 0, pauseMode: 'map',
    stock: 0, cls: 'assassin',
    unlockedLv: [true, false, false],
    unlockedCls: { assassin: true, knight: false, wind: false },
    cleared: [false, false, false],
    records: [null, null, null],
    speedLv: [0, 0, 0],
    replays: [{ t: 0 }, { t: 0 }, { t: 0 }],
    popups: [],
    selRow: 0, selCol: 0,
    res: null,
    playTime: 0, vis: 0
  };
}
G = newGame();

const LV_POS = [[30, 60], [440, 60], [850, 60]];
const CLS_POS = [[30, 370], [290, 370], [550, 370]];
const GOAL_POS = [30, 530];

function setScreen(s) {
  G.screen = s;
  inp.jumpP = inp.jumpR = inp.dashP = inp.skillP = false;
}

// ===================== 一趟 =====================
function newRun(li) {
  const L = LEVELS[li];
  const C = CLS[G.cls];
  const r = {
    li: li, cls: G.cls,
    g: L.grid.map(function (row) { return row.slice(); }),
    crates: L.crates.map(function (c) { return { cells: c.cells, alive: true }; }),
    plateDown: false, windActive: false,
    coinsTaken: L.coins.map(function () { return false; }),
    monsters: [],
    p: { x: L.startCol * T + 20, y: 600 - C.h / 2, vx: 0, vy: 0, facing: 1, onGround: true, hp: MAX_HP, inv: 0,
      gcd: 0, airDash: C.airDash, dash: null, slam: false, gliding: false, jumping: false, jumpHold: 0,
      knockT: 0, knockV: 0 },
    t: 0, vis: 0, combo: 0, comboT: COMBO_T, maxCombo: 0, runValue: 0,
    rec: [], recAcc: 0, coinEv: [],
    blade: null, skillT: C.cd, skillDur: C.cd,
    poofs: [], waves: [], reached: false
  };
  L.imps.forEach(function (m) { r.monsters.push({ type: 'imp', x: m.x, y: m.y, y0: m.y, dir: 1, dead: false }); });
  L.eyes.forEach(function (m) { r.monsters.push({ type: 'eye', x: m.x, y: m.y, y0: m.y, dir: 1, dead: false }); });
  if (cls_is_wind_skill(G.cls)) { r.skillT = 1; r.skillDur = 1; }
  pushFrame(r);
  return r;
}
function cls_is_wind_skill(c) { return c === 'wind'; }

function enterLevel(li) {
  run = newRun(li);
  setScreen('level');
}

function pushFrame(r) {
  r.rec.push({ x: r.p.x, y: r.p.y, cls: r.cls, facing: r.p.facing, pose: poseOf(r.p), dashAngle: r.p.dash ? r.p.dash.ang : 0 });
}

function poseOf(p) {
  if (p.knockT > 0) return 'hurt';
  if (p.dash) return 'dash';
  if (p.slam) return 'slam';
  if (!p.onGround) {
    if (p.gliding) return 'glide';
    return p.vy < 0 ? 'rise' : 'fall';
  }
  return Math.abs(p.vx) > 1 ? 'run' : 'idle';
}

// ---- 碰撞 ----
function solidAt(c, r) {
  if (c < 0 || c >= COLS || r < 0) return true;
  if (r >= ROWS) return false;
  const ch = run.g[r][c];
  return ch === '#' || ch === 'B' || ch === 'G';
}
function cellRange(x, y, hw, hh) {
  return {
    c0: Math.floor((x - hw + 1e-4) / T), c1: Math.floor((x + hw - 1e-4) / T),
    r0: Math.floor((y - hh + 1e-4) / T), r1: Math.floor((y + hh - 1e-4) / T)
  };
}
function overlapsSolid(x, y, hw, hh) {
  const q = cellRange(x, y, hw, hh);
  for (let r = q.r0; r <= q.r1; r++) { for (let c = q.c0; c <= q.c1; c++) { if (solidAt(c, r)) return true; } }
  return false;
}
function moveX(p, hw, hh, dx) {
  if (!dx) return false;
  p.x += dx;
  const q = cellRange(p.x, p.y, hw, hh);
  let blocked = false;
  for (let r = q.r0; r <= q.r1; r++) {
    for (let c = q.c0; c <= q.c1; c++) {
      if (solidAt(c, r)) {
        blocked = true;
        if (dx > 0) p.x = Math.min(p.x, c * T - hw); else p.x = Math.max(p.x, (c + 1) * T + hw);
      }
    }
  }
  return blocked;
}
function moveY(p, hw, hh, dy) {
  if (!dy) return false;
  p.y += dy;
  const q = cellRange(p.x, p.y, hw, hh);
  let blocked = false;
  for (let r = q.r0; r <= q.r1; r++) {
    for (let c = q.c0; c <= q.c1; c++) {
      if (solidAt(c, r)) {
        blocked = true;
        if (dy > 0) p.y = Math.min(p.y, r * T - hh); else p.y = Math.max(p.y, (r + 1) * T + hh);
      }
    }
  }
  return blocked;
}

function breakCrate(c, r) {
  for (let i = 0; i < run.crates.length; i++) {
    const cr = run.crates[i];
    if (!cr.alive) continue;
    for (let k = 0; k < cr.cells.length; k++) {
      if (cr.cells[k][0] === c && cr.cells[k][1] === r) {
        cr.alive = false;
        let sx = 0, sy = 0;
        cr.cells.forEach(function (cc) { run.g[cc[1]][cc[0]] = '.'; sx += cc[0] * T + 20; sy += cc[1] * T + 20; });
        run.poofs.push({ x: sx / cr.cells.length, y: sy / cr.cells.length, t: 0, dur: 0.3 });
        return;
      }
    }
  }
}
// 重騎衝刺: 掃過的範圍內有鐵箱就撞碎
function breakCratesSwept(p, hw, hh, mx, my) {
  const x0 = p.x - hw - Math.abs(mx) - 2, x1 = p.x + hw + Math.abs(mx) + 2;
  const y0 = p.y - hh - Math.abs(my) - 2, y1 = p.y + hh + Math.abs(my) + 2;
  const c0 = Math.floor(x0 / T), c1 = Math.floor(x1 / T), r0 = Math.floor(y0 / T), r1 = Math.floor(y1 / T);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS && run.g[r][c] === 'B') breakCrate(c, r);
    }
  }
}

// ---- 戰鬥 ----
function addCombo() {
  const r = run;
  r.combo++;
  r.comboT = 0;
  if (r.combo > r.maxCombo) r.maxCombo = r.combo;
}
function killMonster(m) {
  m.dead = true;
  run.poofs.push({ x: m.x, y: m.y, t: 0, dur: 0.3 });
  addCombo();
}
function collectCoin(i) {
  const r = run, L = LEVELS[r.li];
  r.coinsTaken[i] = true;
  addCombo();
  const v = r.combo >= 7 ? 3 : (r.combo >= 4 ? 2 : 1);
  r.runValue += v;
  r.coinEv.push({ t: r.t, x: L.coins[i].x, y: L.coins[i].y, v: v, id: i });
}
function hurtPlayer(m) {
  const r = run, p = r.p;
  p.hp--;
  p.inv = 1;
  r.combo = 0;
  r.comboT = COMBO_T;
  p.knockT = 0.1;
  p.knockV = (p.x >= m.x ? 1 : -1) * 800;
  p.dash = null;
  p.slam = false;
}
function failRun() {
  setScreen('fail');
}
function clearRun() {
  const r = run;
  r.reached = true;
  pushFrame(r);
  const tt = Math.max(r.t, 0.05);
  const rate = r.runValue / tt * 60;
  const rec = { frames: r.rec, T: tt, coinEv: r.coinEv, value: r.runValue, rate: rate, cls: r.cls };
  G.stock += r.runValue;
  const li = r.li;
  const old = G.records[li];
  const res = { li: li, time: tt, value: r.runValue, rate: rate, oldRate: old ? old.rate : null, maxCombo: r.maxCombo, rec: rec };
  if (!old) {
    G.records[li] = rec;
    G.replays[li].t = 0;
  }
  G.cleared[li] = true;
  G.res = res;
  setScreen('result');
}

function tryDash() {
  const r = run, p = r.p, C = CLS[r.cls];
  const ground = p.onGround;
  if (ground) { if (p.gcd > 0) return; } else { if (p.airDash <= 0) return; }
  let dx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  let dy = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
  if (ground && dy > 0) dy = 0;
  if (dx === 0 && dy === 0) dx = p.facing;
  if (dx !== 0) p.facing = dx;
  const len = Math.hypot(dx, dy);
  dx /= len; dy /= len;
  const sp = C.dashDist / C.dashDur;
  p.dash = { t: 0, dur: C.dashDur, vx: dx * sp, vy: dy * sp, ang: Math.atan2(dy, dx) };
  p.slam = false;
  p.vx = 0; p.vy = 0;
  if (ground) p.gcd = 0.25; else p.airDash--;
}
function trySkill() {
  const r = run, p = r.p, C = CLS[r.cls];
  if (r.cls === 'assassin') {
    if (r.skillT >= r.skillDur && !r.blade && !p.dash) {
      r.blade = { t: 0, dir: p.facing, ox: p.x, oy: p.y, x: p.x, y: p.y };
      r.skillT = 0;
    }
  } else if (r.cls === 'knight') {
    if (!p.onGround && !p.slam && !p.dash && r.skillT >= r.skillDur) {
      p.slam = true; p.vy = 900; p.vx = 0;
    }
  }
}

function stepRun(h) {
  const r = run, p = r.p, C = CLS[r.cls], L = LEVELS[r.li];
  const hw = C.w / 2, hh = C.h / 2;
  r.t += h; r.vis += h;
  if (p.inv > 0) p.inv = Math.max(0, p.inv - h);
  if (p.gcd > 0) p.gcd -= h;
  if (r.skillT < r.skillDur) r.skillT = Math.min(r.skillDur, r.skillT + h);
  if (r.combo > 0) {
    r.comboT += h;
    if (r.comboT >= COMBO_T) { r.combo = 0; r.comboT = COMBO_T; }
  }
  // ---- 怪物移動 ----
  r.monsters.forEach(function (m) {
    if (m.dead) return;
    if (m.type === 'eye') {
      m.y = m.y0 + 30 * Math.sin(2 * Math.PI * r.t / 2);
    } else {
      const ox = m.x;
      m.x += m.dir * 70 * h;
      const fx = Math.floor((m.x + m.dir * 16) / T);
      const wall = solidAt(fx, Math.floor(m.y / T)) || solidAt(fx, Math.floor((m.y + 15) / T));
      const edge = !solidAt(fx, Math.floor((m.y + 17) / T));
      if (wall || edge) { m.x = ox; m.dir = -m.dir; }
    }
  });
  // ---- 輸入 ----
  const ax = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  const knocked = p.knockT > 0;
  if (knocked) p.knockT -= h;
  if (!knocked) {
    if (inp.dashP && !p.dash) tryDash();
    if (inp.skillP) trySkill();
  }
  if (!p.dash && !p.slam) {
    if (knocked) { p.vx = p.knockV; }
    else {
      p.vx = ax * C.speed;
      if (ax) p.facing = ax;
    }
  }
  if (inp.jumpP && p.onGround && !p.dash && !knocked && !p.slam) {
    p.vy = -C.jump; p.jumping = true; p.jumpHold = 0; p.onGround = false;
  }
  if (p.jumping) { if (keys.KeyZ) p.jumpHold += h; }
  if (inp.jumpR && p.jumping) {
    if (p.jumpHold < 0.15 && p.vy < -C.jump * 0.5) p.vy = -C.jump * 0.5;
    p.jumping = false;
  }
  inp.jumpP = inp.jumpR = inp.dashP = inp.skillP = false;

  // ---- 移動 ----
  const wasGround = p.onGround;
  p.gliding = false;
  if (p.dash) {
    const d = p.dash;
    const mh = Math.min(h, d.dur - d.t);
    d.t += mh;
    const mx = d.vx * mh, my = d.vy * mh;
    if (r.cls === 'knight') breakCratesSwept(p, hw, hh, mx, my);
    const bx = moveX(p, hw, hh, mx), by = moveY(p, hw, hh, my);
    if (bx || by || d.t >= d.dur - 1e-9) { p.dash = null; p.vx = 0; p.vy = 0; }
  } else {
    let riding = false;
    if (r.windActive && L.windmill) {
      const ux = L.windmill.x;
      if (Math.abs(p.x - ux) < 20 + hw && p.y + hh > 320 && p.y - hh < 600) riding = true;
    }
    let dy;
    if (p.slam) {
      p.vy = 900; dy = 900 * h; p.vx = 0;
    } else if (riding) {
      p.vy = -400; dy = -400 * h; p.jumping = false;
    } else if (r.cls === 'wind' && keys.Space && !p.onGround && !knocked && p.vy > 0) {
      p.gliding = true;
      p.vy = Math.min(p.vy, 80);
      dy = p.vy * h;
    } else {
      dy = p.vy * h + 0.5 * GRAV * h * h;
      p.vy += GRAV * h;
      if (p.vy > 1200) p.vy = 1200;
    }
    moveX(p, hw, hh, p.vx * h);
    const by = moveY(p, hw, hh, dy);
    if (by) p.vy = 0;
  }
  p.onGround = p.vy >= 0 && overlapsSolid(p.x, p.y + 0.5, hw, hh);
  if (p.onGround) {
    p.airDash = C.airDash;
    p.jumping = false;
    if (p.slam) {
      p.slam = false;
      doShockwave(hw, hh);
    }
  }

  // ---- 回刃 ----
  if (r.blade) {
    const b = r.blade;
    b.t += h;
    if (b.t >= 0.6) { r.blade = null; }
    else if (b.t < 0.3) {
      const k = b.t / 0.3;
      b.x = b.ox + b.dir * 240 * k; b.y = b.oy;
    } else {
      const k = (b.t - 0.3) / 0.3;
      const fx = b.ox + b.dir * 240, fy = b.oy;
      b.x = fx + (p.x - fx) * k; b.y = fy + (p.y - fy) * k;
    }
    if (r.blade) {
      r.monsters.forEach(function (m) {
        if (m.dead) return;
        if (Math.abs(m.x - b.x) < 12 + 16 && Math.abs(m.y - b.y) < 12 + 16) killMonster(m);
      });
      L.coins.forEach(function (c, i) {
        if (r.coinsTaken[i]) return;
        if (Math.abs(c.x - b.x) < 24 && Math.abs(c.y - b.y) < 24) collectCoin(i);
      });
    }
  }

  // ---- 撿金幣 ----
  L.coins.forEach(function (c, i) {
    if (r.coinsTaken[i]) return;
    if (Math.abs(c.x - p.x) < 12 + hw && Math.abs(c.y - p.y) < 12 + hh) collectCoin(i);
  });
  // ---- 怪物接觸 ----
  const dashing = !!p.dash;
  const pad = dashing ? 8 : 0;
  r.monsters.forEach(function (m) {
    if (m.dead) return;
    if (Math.abs(m.x - p.x) < hw + 16 + pad && Math.abs(m.y - p.y) < hh + 16 + pad) {
      if (dashing) { killMonster(m); p.airDash = C.airDash; }
      else if (p.inv <= 0) hurtPlayer(m);
    }
  });
  // ---- 機關 ----
  if (L.plate && r.cls === 'knight' && !r.plateDown) {
    if (Math.abs(L.plate.x - p.x) < 20 + hw && Math.abs(L.plate.y - p.y) < 6 + hh) {
      r.plateDown = true;
      for (let rr = 0; rr < ROWS; rr++) { for (let cc = 0; cc < COLS; cc++) { if (r.g[rr][cc] === 'G') r.g[rr][cc] = '.'; } }
    }
  }
  if (L.windmill && !r.windActive && p.dash) {
    if (Math.abs(L.windmill.x - p.x) < 20 + hw + 8 && Math.abs(L.windmill.y - p.y) < 20 + hh + 8) r.windActive = true;
  }
  // ---- 危險 / 終點 ----
  let dead = p.hp <= 0 || (p.y - hh > H);
  for (let i = 0; i < L.spikes.length && !dead; i++) {
    const s = L.spikes[i];
    if (Math.abs(s.x - p.x) < 20 + hw && (s.y + 10) - p.y < hh + 10 && p.y - (s.y + 10) < hh + 10) dead = true;
  }
  // 特效計時
  r.poofs.forEach(function (o) { o.t += h; });
  r.poofs = r.poofs.filter(function (o) { return o.t < o.dur; });
  r.waves.forEach(function (o) { o.t += h; });
  r.waves = r.waves.filter(function (o) { return o.t < 0.25; });
  // 錄影 (每 1/60 秒)
  r.recAcc += h;
  while (r.recAcc >= 1 / 60 - 1e-9) { r.recAcc -= 1 / 60; pushFrame(r); }

  if (dead) { failRun(); return; }
  const gx = L.goalCol * T;
  if (Math.abs(gx + 20 - p.x) < 20 + hw && Math.abs(560 - p.y) < 40 + hh) { clearRun(); return; }
  void wasGround;
}

function doShockwave(hw, hh) {
  const r = run, p = r.p;
  const fx = p.x, fy = p.y + hh;
  r.waves.push({ x: fx, y: fy, t: 0 });
  r.monsters.forEach(function (m) {
    if (m.dead) return;
    if (Math.hypot(m.x - fx, m.y - fy) <= 100 + 8) killMonster(m);
  });
  r.skillT = 0;
}

// ===================== 回放與產出 =====================
function replayMult(li) { return SPEED_MULT[G.speedLv[li]]; }
function incomePerMin() {
  let s = 0;
  for (let i = 0; i < 3; i++) { if (G.records[i]) s += G.records[i].rate * replayMult(i); }
  return s;
}
function fireEvents(li, a, b) {
  const rec = G.records[li];
  for (let i = 0; i < rec.coinEv.length; i++) {
    const e = rec.coinEv[i];
    if (e.t > a && e.t <= b) {
      G.stock += e.v;
      if (G.screen === 'map') {
        G.popups.push({ x: LV_POS[li][0] + 8 + e.x * 0.3, y: LV_POS[li][1] + 8 + e.y * 0.3, t: 0, dur: 0.8, value: e.v });
      }
    }
  }
}
function stepReplays(dt) {
  for (let li = 0; li < 3; li++) {
    const rec = G.records[li];
    if (!rec) continue;
    const rp = G.replays[li];
    let a = rp.t, rem = dt * replayMult(li), guard = 0;
    while (rem > 1e-12 && guard++ < 8) {
      const b = Math.min(rec.T, a + rem);
      fireEvents(li, a, b);
      rem -= (b - a);
      a = (b >= rec.T) ? 0 : b;
    }
    rp.t = a;
  }
}

// ===================== 更新 =====================
function update(dt) {
  G.vis += dt;
  const sc = G.screen;
  if (sc === 'guide' || sc === 'pause' || sc === 'ending') return;
  G.playTime += dt;
  stepReplays(dt);
  G.popups.forEach(function (o) { o.t += dt; });
  G.popups = G.popups.filter(function (o) { return o.t < o.dur; });
  if (sc === 'level') {
    run.acc = (run.acc || 0) + dt;
    while (run.acc >= STEP && G.screen === 'level') {
      run.acc -= STEP;
      stepRun(STEP);
    }
  }
}

// ===================== 輸入 =====================
function normKey(e) {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') return k;
  if (k === ' ' || k === 'Spacebar' || e.code === 'Space') return 'Space';
  if (k === 'Escape' || k === 'Esc') return 'Escape';
  if (k && k.length === 1) {
    const l = k.toLowerCase();
    if (l === 'z') return 'KeyZ';
    if (l === 'x') return 'KeyX';
  }
  if (e.code === 'KeyZ' || e.code === 'KeyX') return e.code;
  return null;
}

function cardInfo(li) {
  const L = LEVELS[li];
  let st = 'locked';
  if (G.unlockedLv[li]) st = G.cleared[li] ? 'cleared' : 'open';
  return { L: L, st: st };
}

function inputDown(k) {
  const sc = G.screen;
  if (sc === 'guide') {
    if (k === 'ArrowLeft') { if (G.guidePage > 0) G.guidePage--; }
    else if (k === 'ArrowRight') { if (G.guidePage < 4) G.guidePage++; }
    else if (k === 'KeyZ') {
      if (G.guidePage < 4) G.guidePage++; else setScreen('map');
    }
    return;
  }
  if (sc === 'map') {
    if (k === 'Escape') { G.pauseMode = 'map'; setScreen('pause'); return; }
    if (k === 'Space') { G.guidePage = 0; setScreen('guide'); return; }
    if (k === 'ArrowUp') { G.selRow = Math.max(0, G.selRow - 1); if (G.selRow < 2) G.selCol = Math.min(G.selCol, 2); else G.selCol = 0; return; }
    if (k === 'ArrowDown') { G.selRow = Math.min(2, G.selRow + 1); if (G.selRow === 2) G.selCol = 0; return; }
    if (k === 'ArrowLeft') { if (G.selRow < 2) G.selCol = Math.max(0, G.selCol - 1); return; }
    if (k === 'ArrowRight') { if (G.selRow < 2) G.selCol = Math.min(2, G.selCol + 1); return; }
    if (k === 'KeyZ') { mapConfirm(); return; }
    if (k === 'KeyX') {
      if (G.selRow === 0) {
        const li = G.selCol;
        if (G.unlockedLv[li] && G.cleared[li] && G.speedLv[li] < 2) {
          const cost = SPEED_COST[G.speedLv[li]];
          if (G.stock >= cost) { G.stock -= cost; G.speedLv[li]++; }
        }
      }
      return;
    }
    return;
  }
  if (sc === 'level') {
    if (k === 'Escape') { G.pauseMode = 'level'; setScreen('pause'); return; }
    if (k === 'KeyZ') inp.jumpP = true;
    else if (k === 'KeyX') inp.dashP = true;
    else if (k === 'Space') inp.skillP = true;
    return;
  }
  if (sc === 'pause') {
    if (k === 'Escape') { setScreen(G.pauseMode === 'level' ? 'level' : 'map'); return; }
    if (G.pauseMode === 'level') {
      if (k === 'KeyZ') { enterLevel(run.li); return; }
      if (k === 'KeyX') { setScreen('map'); return; }
    }
    return;
  }
  if (sc === 'fail') {
    if (k === 'KeyZ') enterLevel(run.li);
    else if (k === 'KeyX') setScreen('map');
    return;
  }
  if (sc === 'result') {
    const res = G.res;
    if (res.oldRate === null) {
      if (k === 'KeyZ') setScreen('map');
    } else if (k === 'KeyZ') {
      G.records[res.li] = res.rec;
      G.replays[res.li].t = 0;
      setScreen('map');
    } else if (k === 'KeyX') {
      setScreen('map');
    }
    return;
  }
  if (sc === 'ending') {
    if (k === 'KeyZ') { G = newGame(); run = null; setScreen('guide'); }
    return;
  }
}

function mapConfirm() {
  if (G.selRow === 0) {
    const li = G.selCol, L = LEVELS[li];
    if (!G.unlockedLv[li]) {
      if (G.stock >= L.cost) { G.stock -= L.cost; G.unlockedLv[li] = true; }
    } else {
      enterLevel(li);
    }
  } else if (G.selRow === 1) {
    const id = CLS_LIST[G.selCol], C = CLS[id];
    if (!G.unlockedCls[id]) {
      if (G.stock >= C.cost) { G.stock -= C.cost; G.unlockedCls[id] = true; G.cls = id; }
    } else {
      G.cls = id;
    }
  } else {
    if (G.stock >= GOAL_COST) {
      G.stock -= GOAL_COST;
      setScreen('ending');
    }
  }
}

function onKeyDown(e) {
  const k = normKey(e);
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  keys[k] = true;
  inputDown(k);
}
function onKeyUp(e) {
  const k = normKey(e);
  if (!k) return;
  e.preventDefault();
  keys[k] = false;
  if (k === 'KeyZ' && G.screen === 'level') inp.jumpR = true;
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', function () {
  for (const k in keys) keys[k] = false;
});

// ===================== 繪製 =====================
function r1(x) { return Math.round(x * 10) / 10; }

function drawWorld(L, g, o) {
  Art.drawBackground(ctx, {});
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === '#') {
        Art.drawGround(ctx, { x: c * T + 20, y: r * T + 20, top: !(r > 0 && g[r - 1][c] === '#') });
      }
    }
  }
  L.spikes.forEach(function (s) { Art.drawSpike(ctx, { x: s.x, y: s.y }); });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === 'B') Art.drawIronCrate(ctx, { x: c * T + 20, y: r * T + 20 });
    }
  }
  if (L.plate) Art.drawPressurePlate(ctx, { x: L.plate.x, y: L.plate.y, pressed: !!o.plate });
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (g[r][c] === 'G') Art.drawHeavyGate(ctx, { x: c * T + 20, y: r * T + 20 });
    }
  }
  if (L.windmill) Art.drawWindmill(ctx, { x: L.windmill.x, y: L.windmill.y, active: !!o.wind, t: o.t });
  if (L.windmill && o.wind && o.updraft) {
    Art.drawUpdraft(ctx, { x: L.windmill.x, y: 440, t: o.t });
  }
}
function drawCoinsAndGoal(L, o) {
  L.coins.forEach(function (c, i) {
    if (o.coinVisible(i)) Art.drawCoin(ctx, { x: c.x, y: c.y, t: o.t });
  });
  Art.drawGoal(ctx, { x: L.goalCol * T + 20, y: 560, reached: !!o.reached });
}

function drawThumb(li) {
  const L = LEVELS[li], rec = G.records[li], rp = G.replays[li];
  const x = LV_POS[li][0], y = LV_POS[li][1];
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 8, y + 8, 384, 216); ctx.clip();
  ctx.translate(x + 8, y + 8);
  ctx.scale(0.3, 0.3);
  drawWorld(L, L.grid, { plate: false, wind: false, updraft: false, t: G.vis });
  drawCoinsAndGoal(L, {
    t: G.vis, reached: false,
    coinVisible: function (i) {
      if (!rec) return true;
      for (let k = 0; k < rec.coinEv.length; k++) { if (rec.coinEv[k].id === i) return rec.coinEv[k].t > rp.t; }
      return true;
    }
  });
  if (rec) {
    const f = rec.frames[Math.min(rec.frames.length - 1, Math.floor(rp.t * 60))];
    Art.drawGhost(ctx, { x: f.x, y: f.y, cls: f.cls, facing: f.facing, pose: f.pose, dashAngle: f.dashAngle });
  }
  ctx.restore();
}

function drawLevelScene() {
  const r = run, L = LEVELS[r.li], p = r.p, C = CLS[r.cls];
  drawWorld(L, r.g, { plate: r.plateDown, wind: r.windActive, updraft: true, t: r.vis });
  drawCoinsAndGoal(L, { t: r.vis, reached: r.reached, coinVisible: function (i) { return !r.coinsTaken[i]; } });
  r.monsters.forEach(function (m) {
    if (m.dead) return;
    if (m.type === 'imp') Art.drawImp(ctx, { x: m.x, y: m.y, facing: m.dir, t: r.vis });
    else Art.drawEye(ctx, { x: m.x, y: m.y, t: r.vis });
  });
  if (r.blade) Art.drawBlade(ctx, { x: r.blade.x, y: r.blade.y, t: r.blade.t });
  Art.drawPlayer(ctx, { x: p.x, y: p.y, cls: r.cls, facing: p.facing, pose: poseOf(p), dashAngle: p.dash ? p.dash.ang : 0, invuln: p.inv });
  r.waves.forEach(function (w) { Art.drawSlamWave(ctx, { x: w.x, y: w.y, t: w.t, dur: 0.25, radius: 100 }); });
  r.poofs.forEach(function (o) { Art.drawPoof(ctx, { x: o.x, y: o.y, t: o.t, dur: o.dur }); });
  const rec = G.records[r.li];
  Art.drawHud(ctx, {
    mode: 'level', stock: G.stock, incomePerMin: r1(incomePerMin()),
    time: r1(r.t), runValue: r.runValue, recordRate: rec ? r1(rec.rate) : null,
    hp: p.hp, maxHp: MAX_HP,
    combo: r.combo, comboT: r.combo > 0 ? r.comboT : COMBO_T, comboDur: COMBO_T,
    airDash: p.airDash, maxAirDash: C.airDash,
    skillCdT: r.skillT, skillCdDur: r.skillDur, cls: r.cls
  });
}

function drawMapHud() {
  Art.drawHud(ctx, {
    mode: 'map', stock: G.stock, incomePerMin: r1(incomePerMin()),
    time: null, runValue: null, recordRate: null, hp: null, maxHp: null, combo: null, comboT: null, comboDur: null,
    airDash: null, maxAirDash: null, skillCdT: null, skillCdDur: null, cls: null
  });
}

function text(s, x, y, size, color, align, weight) {
  ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || '#fff';
  ctx.fillText(s, x, y);
}

function drawMapScene() {
  Art.drawMapBackground(ctx, {});
  for (let i = 0; i < 3; i++) {
    const ci = cardInfo(i), rec = G.records[i];
    const lv = G.speedLv[i];
    const cost = lv < 2 ? SPEED_COST[lv] : null;
    Art.drawLevelCard(ctx, {
      x: LV_POS[i][0], y: LV_POS[i][1], index: i + 1, name: ci.L.name, state: ci.st,
      rate: (ci.st === 'cleared' && rec) ? r1(rec.rate * replayMult(i)) : null,
      recordCls: rec ? rec.cls : null,
      speedLv: lv, speedCost: cost, speedCanAfford: cost !== null && G.stock >= cost,
      cost: ci.L.cost, canAfford: G.stock >= ci.L.cost,
      selected: G.selRow === 0 && G.selCol === i
    });
    if (ci.st !== 'locked') drawThumb(i);
  }
  for (let i = 0; i < 3; i++) {
    const id = CLS_LIST[i], C = CLS[id];
    let st = 'locked';
    if (G.unlockedCls[id]) st = (G.cls === id) ? 'active' : 'owned';
    Art.drawClassCard(ctx, {
      x: CLS_POS[i][0], y: CLS_POS[i][1], cls: id, name: C.name, state: st,
      cost: C.cost, canAfford: G.stock >= C.cost, selected: G.selRow === 1 && G.selCol === i
    });
  }
  Art.drawGoalCard(ctx, { x: GOAL_POS[0], y: GOAL_POS[1], cost: GOAL_COST, canAfford: G.stock >= GOAL_COST, selected: G.selRow === 2 });
  G.popups.forEach(function (o) { Art.drawPopup(ctx, { x: o.x, y: o.y, t: o.t, dur: o.dur, value: o.value }); });
  drawMapHud();
  text('↑↓ 換列   ←→ 選擇   Z 確定   X 買加速   空白鍵 說明   Esc 暫停', W / 2, 688, 22, '#fff');
}

const GUIDE_TITLES = ['衝到終點', '操作', '連段', '過關後一直重播', '撿多還是跑快'];
const GUIDE_TEXTS = [
  '撿金幣, 碰到旗子就過關',
  'Z 跳、X 衝刺斬、空白鍵 技能',
  '不停斬怪撿幣, 金幣更值錢',
  '過關的關卡會不停重播賺金幣',
  '賺越多、跑越快, 重播賺越快'
];
const GUIDE_FRAME = [[712, 400], [880, 322], [800, 343], [640, 400], [800, 343]];

function drawGuide() {
  Art.drawMapBackground(ctx, {});
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  const pg = G.guidePage;
  text(GUIDE_TITLES[pg], W / 2, 52, 40, '#ffe27a');
  const fw = GUIDE_FRAME[pg][0], fh = GUIDE_FRAME[pg][1];
  const fx = Math.round((W - fw) / 2), fy = 100;
  Art.drawGuidePage(ctx, { page: pg + 1, x: fx, y: fy, w: fw, h: fh });
  text(GUIDE_TEXTS[pg], W / 2, 560, 34, '#fff');
  text((pg + 1) + ' / 5', W / 2, 620, 26, '#cde');
  text(pg < 4 ? '← → 翻頁    Z 下一頁' : '← → 翻頁    Z 開始', W / 2, 676, 24, '#cde');
}

function render() {
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const sc = G.screen;
  if (sc === 'guide') { drawGuide(); return; }
  if (sc === 'map') { drawMapScene(); return; }
  if (sc === 'level') { drawLevelScene(); return; }
  if (sc === 'fail') { drawLevelScene(); Art.drawFailPanel(ctx, {}); return; }
  if (sc === 'result') {
    drawLevelScene();
    const res = G.res;
    Art.drawResultPanel(ctx, { time: r1(res.time), value: res.value, rate: r1(res.rate), oldRate: res.oldRate === null ? null : r1(res.oldRate), maxCombo: res.maxCombo });
    return;
  }
  if (sc === 'pause') {
    if (G.pauseMode === 'level') drawLevelScene(); else drawMapScene();
    Art.drawPausePanel(ctx, { mode: G.pauseMode });
    return;
  }
  if (sc === 'ending') {
    drawMapScene();
    Art.drawEndingPanel(ctx, { totalTime: G.playTime });
    return;
  }
}

// ===================== 畫布縮放 / 主迴圈 =====================
function resize() {
  const cw = window.innerWidth, ch = window.innerHeight;
  const s = Math.min(cw / W, ch / H);
  const cssW = Math.max(1, Math.floor(W * s)), cssH = Math.max(1, Math.floor(H * s));
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.style.left = Math.floor((cw - cssW) / 2) + 'px';
  canvas.style.top = Math.floor((ch - cssH) / 2) + 'px';
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  scaleX = canvas.width / W;
  scaleY = canvas.height / H;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

let lastTs = null;
function frame(ts) {
  try {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(Math.max((ts - lastTs) / 1000, 0), 1 / 30);
    lastTs = ts;
    update(dt);
    render();
  } catch (e) {
    console.error(e);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
