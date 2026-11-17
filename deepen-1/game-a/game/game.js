'use strict';
/* 符石迴廊 — 玩法驗證 Demo。只用鍵盤。繪製一律呼叫 Art.drawXxx(ctx, state)。 */

const W = Art.canvas.width, H = Art.canvas.height;
const T = 40, COLS = 32, ROWS = 18, DT = 1 / 60;
const KINDS = ['wood', 'ench', 'time'];
const CLSN = ['sword', 'hunter', 'bomber'];
const ACCEL = [1, 1.25, 1.5];
const ACCEL_COST = [12, 30];
const UNSEAL = [8, 20, 40];
const RECRUIT = 40;
const GOAL_COST = { wood: 200, ench: 100, time: 100 };
const CARD_POS = [[40, 281], [290, 131], [290, 431], [540, 56], [540, 206], [540, 356], [540, 506], [790, 281]];
const GOAL_POS = [1040, 281];
const PARENTS = [[], [0], [0], [1], [1], [2], [2], [4, 5]];
const UNLOCK_COST = [0, 20, 20, 50, 50, 50, 50, 100];
const LINKS = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 7]];
const MAP_COLS = [[0], [1, 2], [3, 4, 5, 6], [7], [8]];
const HUD_ICON = { wood: [36, 20], ench: [256, 20], time: [476, 20] };
const SKILL_CD = { sword: 1.2, hunter: 0.5, bomber: 1.5 };
const GUIDE_ART_PAGE_BASE = 0; // Art.drawGuidePage 的 page 由 0 起算
const GUIDE = [
  { title: '衝到終點', text: '碰到旗子就過關', w: 720, h: 405 },
  { title: '操作', text: '空白鍵跳、Z 攻擊、X 技能(Esc 暫停)', w: 900, h: 330 },
  { title: '過關後一直重播', text: '過關的關卡會一直重播賺素材', w: 720, h: 450 },
  { title: '撿多還是跑快', text: '撿越多、跑越快, 重播賺越快', w: 840, h: 360 },
  { title: '寶箱裡的符石', text: '寶箱的符石能裝在符石座上', w: 900, h: 300 }
];

/* 規格與美術介面都沒有、由 RD 用簡單幾何 / 文字畫的東西 */
const Placeholder = {
  text(c, s, x, y, size, color, align) {
    c.save();
    c.font = 'bold ' + size + 'px "Microsoft JhengHei", "PingFang TC", sans-serif';
    c.fillStyle = color || '#fff';
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    c.fillText(s, x, y);
    c.restore();
  },
  hookLine(c, x1, y1, x2, y2) {
    c.save();
    c.strokeStyle = '#d8d0b0'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.restore();
  }
};

const MDEF = {
  boar: { w: 48, h: 32, hp: 3, drop: ['wood', 2], hy: 16 },
  shield: { w: 32, h: 44, hp: 3, drop: ['ench', 2], hy: 22 },
  bee: { w: 32, h: 32, hp: 1, drop: ['time', 1], hy: 0 },
  frog: { w: 32, h: 28, hp: 2, drop: ['wood', 1], hy: 14 }
};

/* ============================ 關卡資料 ============================ */
function B(name, theme) {
  const b = { name, theme, solid: [], gid: [], groupTiles: [], spikes: [], pk: [], mons: [], hooks: [], peds: [], chest: null, start: null, goal: null };
  for (let r = 0; r < ROWS; r++) { b.solid.push(new Array(COLS).fill(0)); b.gid.push(new Array(COLS).fill(-1)); }
  b.G = (c0, c1, r0, r1) => { if (r1 === undefined) r1 = r0; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) b.solid[r][c] = 1; };
  b.E = (c0, c1, r0, r1) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { b.solid[r][c] = 0; b.gid[r][c] = -1; } };
  b.K = (c, r0, r1) => {
    const g = b.groupTiles.length, tiles = [];
    for (let r = r0; r <= r1; r++) { b.solid[r][c] = 2; b.gid[r][c] = g; tiles.push({ c, r }); }
    b.groupTiles.push(tiles);
  };
  b.SP = (list) => { for (const [c, r] of list) b.spikes.push({ c, r }); };
  b.SPR = (c0, c1, r) => { for (let c = c0; c <= c1; c++) b.spikes.push({ c, r }); };
  b.P = (kind, list) => { for (const [c, r] of list) b.pk.push({ kind, x: c * T + 20, y: r * T + 20 }); };
  b.M = (type, list) => { for (const [c, r] of list) b.mons.push({ type, x: c * T + 20, y: type === 'bee' ? r * T + 20 : (r + 1) * T - MDEF[type].hy }); };
  b.H = (list) => { for (const [c, r] of list) b.hooks.push({ x: c * T + 20, y: r * T + 20 }); };
  b.D = (list) => { for (const [c, r] of list) b.peds.push({ x: c * T + 20, y: r * T + 20 }); };
  b.C = (c, r, type) => { b.chest = { x: c * T + 20, y: (r + 1) * T - 18, type }; };
  b.S = (c, r) => { b.start = { x: c * T + 20, y: (r + 1) * T - 22 }; };
  b.F = (c, r) => { b.goal = { x: c * T + 20, y: (r + 1) * T - 40 }; };
  // 地下側洞: 三階下坡(每階 1 格) + 裂岩牆 + 兩格寬洞, floor = 地表列
  b.notch = (a, s, crackRows) => {
    b.E(a, a, s, s); b.E(a + 1, a + 1, s, s + 1); b.E(a + 2, a + 2, s, s + 2);
    b.E(a + 4, a + 5, s + 1, s + 2); b.K(a + 3, s + 1, s + 2);
  };
  return b;
}

function buildLevels() {
  const out = [];
  let b;
  // 1 草原
  b = B('草原', 'plain');
  b.G(0, 31, 15, 17);
  b.G(1, 2, 14, 14); b.G(3, 4, 13, 14); b.G(5, 10, 12, 14); b.E(7, 9, 13, 14); b.K(10, 13, 14);
  b.G(19, 22, 10, 10); b.H([[18, 10]]); b.G(23, 24, 11, 11); b.G(26, 27, 13, 14);
  b.P('wood', [[3, 12], [4, 12], [6, 11], [8, 11], [13, 14], [14, 14], [16, 14], [24, 14]]);
  b.P('ench', [[7, 14], [8, 14], [9, 14]]);
  b.P('time', [[20, 9], [21, 9]]);
  b.M('boar', [[17, 14]]); b.M('frog', [[21, 14], [23, 14]]); b.M('shield', [[22, 14]]); b.M('bee', [[14, 11]]);
  b.D([[15, 14], [29, 14], [8, 14], [22, 14]]);
  b.C(11, 14, 'harvest'); b.S(0, 14); b.F(30, 14);
  out.push(b);
  // 2 懸崖棧道
  b = B('懸崖棧道', 'sky');
  b.G(0, 7, 15, 17); b.G(8, 15, 13, 17); b.G(16, 23, 11, 17); b.G(24, 31, 9, 17);
  b.G(1, 4, 10, 10); b.H([[0, 10]]); b.G(5, 6, 11, 11);
  b.G(9, 12, 8, 8); b.H([[8, 8]]); b.G(13, 14, 9, 9);
  b.G(17, 20, 6, 6); b.H([[16, 6]]); b.G(21, 22, 7, 7);
  b.SP([[3, 14], [11, 12], [19, 10], [26, 8]]);
  b.P('wood', [[6, 14], [10, 12], [13, 12], [18, 10], [22, 10], [27, 8]]);
  b.P('ench', [[5, 10], [6, 10]]);
  b.P('time', [[2, 9], [3, 9], [10, 7], [11, 7], [18, 5], [20, 5]]);
  b.M('bee', [[18, 9], [20, 9], [22, 9]]); b.M('frog', [[10, 12], [14, 12]]);
  b.D([[4, 14], [28, 8], [12, 7], [20, 10]]);
  b.C(19, 5, 'springTime'); b.S(0, 14); b.F(30, 8);
  out.push(b);
  // 3 野豬峽谷
  b = B('野豬峽谷', 'rock');
  b.G(0, 31, 13, 17);
  b.notch(10, 13); b.notch(26, 13);
  b.SP([[9, 12], [19, 12], [24, 12]]);
  b.P('wood', [[2, 12], [3, 12], [4, 12], [16, 12], [18, 12], [20, 12], [21, 12], [25, 12]]);
  b.P('ench', [[14, 15], [14, 14], [15, 14], [31, 15], [31, 14], [30, 14]]);
  b.P('time', [[12, 12]]);
  b.M('boar', [[5, 12], [17, 12], [21, 12]]); b.M('shield', [[7, 12], [8, 12]]);
  b.D([[1, 12], [23, 12], [15, 15], [7, 12]]);
  b.C(30, 15, 'springEnch'); b.S(0, 12); b.F(31, 12);
  out.push(b);
  // 4 蜂巢高塔
  b = B('蜂巢高塔', 'sky');
  b.G(0, 31, 15, 17); b.E(11, 16, 15, 16);
  b.G(0, 22, 11, 11); b.G(25, 27, 13, 14);
  b.G(9, 31, 7, 7); b.G(5, 7, 9, 10);
  b.G(26, 28, 5, 6); b.G(0, 23, 3, 3);
  b.G(30, 31, 3, 3); b.H([[29, 3]]);
  b.SP([[6, 14], [23, 14], [16, 10], [21, 6]]);
  b.P('wood', [[4, 14], [20, 14], [13, 16], [14, 16], [26, 12]]);
  b.P('ench', [[30, 14], [31, 14]]);
  b.P('time', [[3, 10], [12, 10], [20, 10], [12, 6], [17, 6], [23, 6], [6, 2], [12, 2]]);
  b.M('bee', [[15, 5], [17, 5], [19, 5], [14, 9]]); b.M('frog', [[10, 10], [18, 10]]);
  b.D([[9, 14], [10, 2], [31, 2], [18, 6]]);
  b.C(30, 2, 'harvest'); b.S(1, 14); b.F(1, 2);
  out.push(b);
  // 5 斷橋
  b = B('斷橋', 'sky');
  b.G(0, 31, 15, 17); b.E(6, 11, 15, 16); b.E(15, 20, 15, 16); b.E(24, 29, 15, 16);
  b.SP([[4, 14], [22, 14], [13, 14]]);
  b.P('wood', [[1, 14], [2, 14], [3, 14], [8, 16], [9, 16], [10, 16], [17, 16], [18, 16], [19, 16]]);
  b.P('ench', [[25, 16], [27, 16]]);
  b.P('time', [[12, 14], [14, 14], [21, 14], [23, 14]]);
  b.M('boar', [[3, 14], [8, 16]]); b.M('frog', [[12, 14], [23, 14], [14, 14]]); b.M('bee', [[13, 12]]);
  b.D([[1, 14], [21, 14], [28, 16], [13, 14]]);
  b.C(26, 16, 'hunt'); b.S(0, 14); b.F(31, 14);
  out.push(b);
  // 6 盾兵要塞
  b = B('盾兵要塞', 'rock');
  b.G(0, 31, 13, 17);
  b.notch(6, 13); b.notch(16, 13); b.notch(22, 13);
  b.G(12, 13, 11, 12); b.G(14, 14, 9, 9); b.H([[15, 8]]); b.G(16, 23, 8, 8);
  b.SP([[4, 12], [21, 12], [25, 12]]);
  b.P('wood', [[1, 12], [2, 12], [14, 12], [19, 12], [20, 12]]);
  b.P('ench', [[10, 15], [11, 15], [10, 14], [20, 15], [21, 15], [20, 14], [26, 15], [27, 15]]);
  b.P('time', [[17, 7], [22, 7]]);
  b.M('shield', [[2, 12], [15, 12], [28, 12], [29, 12]]); b.M('boar', [[30, 12]]); b.M('bee', [[30, 9]]);
  b.D([[3, 12], [19, 12], [11, 15], [29, 12]]);
  b.C(20, 7, 'hunt'); b.S(0, 12); b.F(31, 12);
  out.push(b);
  // 7 蛙沼
  b = B('蛙沼', 'swamp');
  b.G(0, 4, 14, 15); b.G(7, 10, 13, 14); b.G(11, 12, 12, 12); b.G(13, 17, 14, 15); b.G(13, 14, 12, 13);
  b.G(15, 16, 10, 10); b.G(20, 23, 13, 14); b.G(26, 31, 14, 15);
  b.SPR(0, 31, 16);
  b.P('wood', [[2, 13], [3, 13], [11, 11], [12, 11], [21, 12], [22, 12], [27, 13]]);
  b.P('ench', [[13, 11], [14, 11], [15, 9], [17, 13]]);
  b.P('time', [[29, 13], [30, 13], [23, 12]]);
  b.M('frog', [[8, 12], [9, 12], [10, 12], [16, 13], [21, 12]]); b.M('shield', [[27, 13]]); b.M('bee', [[22, 10]]);
  b.D([[1, 13], [28, 13], [16, 9], [9, 12]]);
  b.C(16, 13, 'springWood'); b.S(0, 13); b.F(31, 13);
  out.push(b);
  // 8 王座
  b = B('王座', 'throne');
  b.G(0, 31, 14, 17); b.E(6, 11, 14, 15);
  b.G(15, 18, 9, 9); b.H([[14, 9]]); b.G(19, 20, 10, 10); b.G(22, 23, 12, 13);
  b.notch(25, 14);
  b.SP([[4, 13], [14, 13], [29, 13]]);
  b.P('wood', [[1, 13], [3, 13], [8, 15], [9, 15], [10, 15], [13, 13], [21, 13], [24, 13]]);
  b.P('ench', [[16, 8], [17, 8], [19, 9], [20, 9], [29, 16], [29, 15]]);
  b.P('time', [[15, 8], [18, 8], [7, 15], [11, 15], [30, 13], [12, 13]]);
  b.M('boar', [[3, 13], [15, 13]]); b.M('shield', [[18, 13], [21, 13]]); b.M('frog', [[19, 13], [20, 13]]);
  b.M('bee', [[10, 10], [26, 11]]);
  b.D([[1, 13], [30, 13], [15, 8], [19, 13]]);
  b.C(30, 16, 'harvest'); b.S(0, 13); b.F(31, 13);
  out.push(b);
  return out;
}
const LV = buildLevels();
const ITEM_NAME = { harvest: '豐收符石', hunt: '狩獵符石', springWood: '木泉符石', springEnch: '塵泉符石', springTime: '晶泉符石' };
const SPRING_KIND = { springWood: 'wood', springEnch: 'ench', springTime: 'time' };

/* ============================ 全域狀態 ============================ */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let mode = 'guide';          // guide | map | play | result | fail | pause | ending
let guidePage = 0, guideReturn = 'map';
let GM = null;               // 跨關卡的存檔狀態(只在記憶體)
let run = null;              // 目前這趟
let curL = null, cwHp = [];  // 目前關卡 / 裂岩牆耐久(每組一個)
let panel = null;            // 關卡面板(蓋在 map 上)
let cursor = 0;
let animT = 0;
let flights = [];
let bump = { wood: 0.15, ench: 0.15, time: 0.15 };
let pauseState = null;
let resultInfo = null, pendingRep = null;
let endTotal = 0;
const held = { left: false, right: false, space: false };
const press = { z: false, x: false };
let jumpBuf = 0;

function newMeta() {
  return {
    stock: { wood: 0, ench: 0, time: 0 },
    owned: [true, false, false],
    inv: [],
    totalTime: 0,
    LS: LV.map((l, i) => ({
      open: i === 0, cleared: false, rep: null, accel: 0, lastCls: 0, chestTaken: false,
      slots: [{ sealed: false, item: null }, { sealed: true, item: null }, { sealed: true, item: null }, { sealed: true, item: null }]
    }))
  };
}
GM = newMeta();

function setMode(m) { mode = m; press.z = false; press.x = false; jumpBuf = 0; }

/* ============================ 地形 / 物理 ============================ */
function solidAt(c, r) {
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  const v = curL.solid[r][c];
  if (v === 1) return true;
  if (v === 2) return cwHp[curL.gid[r][c]] > 0;
  return false;
}
function moveX(e, dx) {
  if (!dx) return false;
  e.x += dx;
  const hw = e.w / 2, hh = e.h / 2;
  const r0 = Math.floor((e.y - hh + 0.01) / T), r1 = Math.floor((e.y + hh - 0.01) / T);
  if (dx > 0) {
    const c = Math.floor((e.x + hw - 0.001) / T);
    for (let r = r0; r <= r1; r++) if (solidAt(c, r)) { e.x = c * T - hw; return true; }
  } else {
    const c = Math.floor((e.x - hw + 0.001) / T);
    for (let r = r0; r <= r1; r++) if (solidAt(c, r)) { e.x = (c + 1) * T + hw; return true; }
  }
  return false;
}
function moveY(e, dy) {
  e.onGround = false;
  if (!dy) return 0;
  e.y += dy;
  const hw = e.w / 2, hh = e.h / 2;
  const c0 = Math.floor((e.x - hw + 0.01) / T), c1 = Math.floor((e.x + hw - 0.01) / T);
  if (dy > 0) {
    const r = Math.floor((e.y + hh - 0.001) / T);
    for (let c = c0; c <= c1; c++) if (solidAt(c, r)) { e.y = r * T - hh; e.vy = 0; e.onGround = true; return 1; }
  } else {
    const r = Math.floor((e.y - hh + 0.001) / T);
    for (let c = c0; c <= c1; c++) if (solidAt(c, r)) { e.y = (r + 1) * T + hh; e.vy = 0; return -1; }
  }
  return 0;
}
function ov(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
function boxDist(px, py, m) {
  const dx = Math.max(Math.abs(px - m.x) - m.w / 2, 0), dy = Math.max(Math.abs(py - m.y) - m.h / 2, 0);
  return Math.sqrt(dx * dx + dy * dy);
}
/* 玩家基本移動(跑、跳、重力); BFS 自測也用它 */
function physPlayer(p, dir, jumpPress, jumpHeld) {
  const speed = p.cls === 'bomber' ? 230 : 260;
  p.vx = dir * speed;
  if (dir) p.facing = dir;
  if (jumpPress && p.onGround) { p.vy = -720; p.onGround = false; p.jumpHold = 0; p.jumping = true; }
  if (p.jumping) {
    p.jumpHold += DT;
    if (!jumpHeld) { if (p.jumpHold < 0.15 && p.vy < -360) p.vy = -360; p.jumping = false; }
  }
  p.vy += 2400 * DT; if (p.vy > 1400) p.vy = 1400;
  moveX(p, p.vx * DT);
  const r = moveY(p, p.vy * DT);
  if (r !== 0) p.jumping = false;
}

/* ============================ 符石 / 加成(回放與關卡內共用) ============================ */
function cfgOf(i) {
  return GM.LS[i].slots.map(s => (!s.sealed && s.item != null) ? GM.inv[s.item].type : null);
}
// f = 幀序號; trig 的 F = 觸發幀。觸發那一幀(含)以前的得到不算, 之後才算(視窗 4 秒 = 240 幀, 6 秒 = 360 幀)
function bonusFor(ev, trigs) {
  let extra = 0;
  for (const tr of trigs) {
    if (tr.type === 'harvest' && ev.src === 'pickup' && ev.f > tr.F && ev.f <= tr.F + 240) extra += ev.n;
    else if (tr.type === 'hunt' && ev.src === 'drop' && ev.f > tr.F && ev.f <= tr.F + 360) extra += ev.n;
  }
  return extra;
}
function buildEvents(rep, i) {
  const cfg = cfgOf(i), L = LV[i];
  const trigs = [];
  for (let k = 0; k < 4; k++) if (cfg[k] && isFinite(rep.enterF[k])) trigs.push({ k, type: cfg[k], F: rep.enterF[k] });
  const evs = [];
  for (const g of rep.gains) evs.push({ f: g.f, t: g.f * DT, x: g.x, y: g.y, kind: g.kind, n: g.n + bonusFor(g, trigs) });
  for (const tr of trigs) {
    const kd = SPRING_KIND[tr.type];
    if (kd) evs.push({ f: tr.F, t: tr.F * DT, x: L.peds[tr.k].x, y: L.peds[tr.k].y, kind: kd, n: 2 });
  }
  evs.sort((a, b) => a.f - b.f);
  return evs;
}
function ratesFromEvents(evs, dur, mult) {
  const s = { wood: 0, ench: 0, time: 0 };
  for (const e of evs) s[e.kind] += e.n;
  const r = {};
  for (const k of KINDS) r[k] = Math.round(s[k] / dur * 60 * mult * 10) / 10;
  return r;
}
function refreshAll() {
  for (let i = 0; i < LV.length; i++) {
    const ls = GM.LS[i], rep = ls.rep;
    if (!rep) continue;
    rep.events = buildEvents(rep, i);
    let n = 0; while (n < rep.events.length && rep.events[n].t <= rep.clock) n++;
    rep.ptr = n;
    rep.rates = ratesFromEvents(rep.events, rep.dur, ACCEL[ls.accel]);
  }
}
function totalRatePerMin() {
  const s = { wood: 0, ench: 0, time: 0 };
  for (const ls of GM.LS) if (ls.rep) for (const k of KINDS) s[k] += ls.rep.rates[k];
  for (const k of KINDS) s[k] = Math.round(s[k] * 10) / 10;
  return s;
}
function addStock(kind, n) { GM.stock[kind] += n; bump[kind] = 0; }

/* ============================ 回放 ============================ */
function makeRep(r) {
  const frames = r.frames, route = [];
  let st = 6; while (frames.length / st > 590) st += 6;
  for (let f = 0; f < frames.length; f += st) route.push({ x: frames[f].p.x, y: frames[f].p.y });
  const last = frames[frames.length - 1].p;
  route.push({ x: last.x, y: last.y });
  return { i: r.i, cls: r.cls, frames, dur: Math.max(DT, (frames.length - 1) * DT), gains: r.gains, takeOrder: r.takeOrder, enterF: r.enterF.slice(), route, clock: 0, ptr: 0, events: [], rates: { wood: 0, ench: 0, time: 0 }, kills: r.kills };
}
function repFrame(rep) { return Math.min(rep.frames.length - 1, Math.floor(rep.clock / DT + 1e-6)); }
function advanceReplays(dt) {
  for (let i = 0; i < LV.length; i++) {
    const ls = GM.LS[i], rep = ls.rep;
    if (!rep) continue;
    let nc = rep.clock + dt * ACCEL[ls.accel];
    while (rep.ptr < rep.events.length && rep.events[rep.ptr].t <= nc) { creditEvent(i, rep.events[rep.ptr]); rep.ptr++; }
    if (nc >= rep.dur) {
      nc -= rep.dur; rep.ptr = 0;
      while (rep.ptr < rep.events.length && rep.events[rep.ptr].t <= nc) { creditEvent(i, rep.events[rep.ptr]); rep.ptr++; }
    }
    rep.clock = nc;
  }
}
function creditEvent(i, ev) {
  if (mode === 'map' && !panel) {
    const cx = CARD_POS[i][0] + 8, cy = CARD_POS[i][1] + 8;
    const cnt = Math.min(ev.n, 5);
    for (let k = 0; k < cnt; k++) {
      const carry = ev.n <= 5 ? 1 : (k === cnt - 1 ? ev.n - 4 : 1);
      flights.push({
        sx: cx + ev.x * 0.125 + (Math.random() * 12 - 6), sy: cy + ev.y * 0.125 + (Math.random() * 12 - 6),
        kind: ev.kind, n: carry, t: 0
      });
    }
  } else addStock(ev.kind, ev.n);
}
function flushFlights() { for (const f of flights) addStock(f.kind, f.n); flights = []; }
function updFlights() {
  for (let k = flights.length - 1; k >= 0; k--) {
    const f = flights[k]; f.t += DT;
    if (f.t >= 0.7) { addStock(f.kind, f.n); flights.splice(k, 1); }
  }
}

/* ============================ 開始一趟 ============================ */
function spawnMonster(d, idx) {
  const D = MDEF[d.type];
  return {
    idx, type: d.type, x: d.x, y: d.y, w: D.w, h: D.h, hp: D.hp, facing: -1,
    state: d.type === 'bee' ? 'fly' : d.type === 'frog' ? 'crouch' : 'walk',
    stT: 0, vx: 0, vy: 0, alive: true, hitT: 0, onGround: false, x0: d.x, y0: d.y, t: 0, blockT: 0, dir: -1, cd: 1.0, aimT: 0, fl: null
  };
}
function newRun(i, cls) {
  const L = LV[i], ls = GM.LS[i];
  curL = L; cwHp = L.groupTiles.map(() => 3);
  const p = {
    x: L.start.x, y: L.start.y, w: 28, h: 44, vx: 0, vy: 0, facing: 1, onGround: false, cls, hp: 3, invT: 0, hurtT: 0,
    pose: 'idle', poseT: 0, jumpHold: 0, jumping: false, slashT: 0, shootT: 0, throwT: 0, waveT: 0,
    atkCd: 0, skillCd: 0, autoCd: 0, dashT: 0, dashDir: 1, dashAir: false, dashHit: null, dashAtk: 0, hookT: null, hookLine: null
  };
  run = {
    i, cls, L, p, t: 0, frame: 0, mons: L.mons.map(spawnMonster), arrows: [], bombs: [], shots: [], exps: [], waves: [], poofs: [],
    popups: [], chains: {}, chainTexts: [], taken: L.pk.map(() => false), takeOrder: [], chestOpen: ls.chestTaken, chestOpened: false,
    reached: false, mat: { wood: 0, ench: 0, time: 0 }, gains: [], kills: [], trigs: [], enterF: [Infinity, Infinity, Infinity, Infinity],
    trigT: [Infinity, Infinity, Infinity, Infinity], cfg: cfgOf(i), notice: null, frames: [], over: null, atkSeq: 0, itemType: null
  };
  checkPeds();
  run.frames.push(snapshot());
}
function startRun(i, cls) {
  flushFlights();
  GM.LS[i].lastCls = Math.max(0, CLSN.indexOf(cls));
  panel = null;
  newRun(i, cls);
  setMode('play');
}

/* ============================ 一趟內的更新 ============================ */
function monState(m) { return (m.type === 'shield' && m.state !== 'flung' && m.blockT > 0) ? 'block' : m.state; }
function snapshot() {
  const p = run.p;
  return {
    p: { x: p.x, y: p.y, cls: p.cls, facing: p.facing, pose: p.pose, poseT: p.poseT, inv: p.invT > 0 },
    m: run.mons.map(m => [m.x, m.y, m.facing, monState(m), m.hitT > 0 ? 1 : 0, m.alive ? 1 : 0]),
    ar: run.arrows.map(a => [a.x, a.y, a.ang]), bo: run.bombs.map(b => [b.x, b.y, b.t]), sh: run.shots.map(s => [s.x, s.y]),
    ex: run.exps.map(e => [e.x, e.y, e.t]), wv: run.waves.map(e => [e.x, e.y, e.t]), pf: run.poofs.map(e => [e.x, e.y, e.t]),
    cw: cwHp.slice(), tk: run.takeOrder.length, ch: run.chestOpen ? 1 : 0, gr: run.reached ? 1 : 0, hk: p.hookLine ? p.hookLine.slice() : null
  };
}
function baseGain(src, kind, n, x, y) {
  const ev = { src, kind, n, x, y, f: run.frame };
  run.gains.push(ev);
  const extra = bonusFor(ev, run.trigs);
  run.mat[kind] += n + extra;
  run.popups.push({ x, y, t: 0, kind, value: Math.max(1, Math.min(9, n)) });
  if (extra > 0) run.popups.push({ x, y: y - 18, t: 0, kind, value: Math.min(9, extra) });
}
function checkPeds() {
  const p = run.p, L = run.L;
  for (let k = 0; k < 4; k++) {
    if (isFinite(run.enterF[k])) continue;
    const d = L.peds[k], dx = p.x - d.x, dy = p.y - d.y;
    if (dx * dx + dy * dy <= 10000) {
      run.enterF[k] = run.frame;
      const type = run.cfg[k];
      if (type) {
        run.trigs.push({ k, type, F: run.frame }); run.trigT[k] = run.frame * DT;
        const kd = SPRING_KIND[type];
        if (kd) { run.mat[kd] += 2; run.popups.push({ x: d.x, y: d.y - 20, t: 0, kind: kd, value: 2 }); }
      }
    }
  }
}
function hitWallGroup(g, d) {
  if (cwHp[g] <= 0) return;
  cwHp[g] -= d;
  if (cwHp[g] <= 0) breakWall(g);
}
function breakWall(g) {
  cwHp[g] = 0;
  for (const t of curL.groupTiles[g]) run.poofs.push({ x: t.c * T + 20, y: t.r * T + 20, t: 0 });
}
function wallsInBox(box, fn) {
  const c0 = Math.floor((box.x - box.w / 2) / T), c1 = Math.floor((box.x + box.w / 2 - 0.001) / T);
  const r0 = Math.floor((box.y - box.h / 2) / T), r1 = Math.floor((box.y + box.h / 2 - 0.001) / T);
  const seen = {};
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
    if (curL.solid[r][c] === 2) { const g = curL.gid[r][c]; if (cwHp[g] > 0 && !seen[g]) { seen[g] = 1; fn(g); } }
  }
}
function wallsInRadius(x, y, rad, fn) {
  for (let g = 0; g < curL.groupTiles.length; g++) {
    if (cwHp[g] <= 0) continue;
    for (const t of curL.groupTiles[g]) {
      const cx = t.c * T + 20, cy = t.r * T + 20;
      const dx = Math.max(Math.abs(x - cx) - 20, 0), dy = Math.max(Math.abs(y - cy) - 20, 0);
      if (dx * dx + dy * dy <= rad * rad) { fn(g); break; }
    }
  }
}
function damageMonster(m, dmg, src) {
  if (!m.alive) return 'none';
  if (m.type === 'shield' && m.state !== 'flung' && (src.kind === 'melee' || src.kind === 'arrow' || src.kind === 'dash')) {
    const side = src.kind === 'melee' ? (Math.sign(src.x - m.x) || run.p.facing) : -src.dir;
    if (side === m.facing && src.cy >= m.y - m.h / 2) { m.blockT = 0.2; m.hitT = 0.1; return 'blocked'; }
  }
  m.hp -= dmg; m.hitT = 0.1;
  if (m.hp <= 0) { killMonster(m, src); return 'killed'; }
  return 'hit';
}
function killMonster(m, src) {
  m.alive = false; m.fl = null;
  run.poofs.push({ x: m.x, y: m.y, t: 0 });
  run.kills.push({ f: run.frame, idx: m.idx });
  const D = MDEF[m.type];
  baseGain('drop', D.drop[0], D.drop[1], m.x, m.y);
  if (src && src.atk) { const c = run.chains[src.atk] || (run.chains[src.atk] = { n: 0, x: 0, y: 0 }); c.n++; c.x = m.x; c.y = m.y; }
  if (src && src.kind === 'dash') run.p.skillCd = 0;
}
function flingMonster(m, dir, atk) {
  if (!m.alive) return;
  m.state = 'flung'; m.fl = { dir, t: 0, hit: {}, atk }; m.vx = 0; m.vy = 0; m.aimT = 0;
}
function endFling(m) {
  m.fl = null; m.vy = 0;
  if (m.type === 'bee') { m.state = 'fly'; m.x0 = m.x; m.y0 = m.y; m.t = 0; m.cd = 1.0; }
  else if (m.type === 'frog') { m.state = 'jump'; m.vx = 0; }
  else { m.state = 'walk'; m.stT = 0; }
}
function updFlung(m) {
  const f = m.fl; f.t += DT;
  const hitWall = moveX(m, f.dir * 460 * DT);
  if (hitWall) { damageMonster(m, 1, { kind: 'fling', atk: f.atk }); if (m.alive) endFling(m); return; }
  for (const o of run.mons) {
    if (o === m || !o.alive || f.hit[o.idx]) continue;
    if (ov(m, o)) {
      f.hit[o.idx] = 1;
      const r = damageMonster(o, 2, { kind: 'fling', atk: f.atk });
      if (r !== 'killed' && o.alive) { flingMonster(o, f.dir, f.atk); o.fl.hit[m.idx] = 1; }
    }
  }
  if (m.alive && m.fl && f.t >= 0.6) endFling(m);
}
function probe(m) {
  const fx = m.x + m.facing * (m.w / 2 + 2), c = Math.floor(fx / T);
  const r0 = Math.floor((m.y - m.h / 2 + 2) / T), r1 = Math.floor((m.y + m.h / 2 - 2) / T);
  let wall = false;
  for (let r = r0; r <= r1; r++) if (solidAt(c, r)) wall = true;
  const rb = Math.floor((m.y + m.h / 2 + 2) / T);
  return { wall, edge: !solidAt(c, rb) };
}
function gravityM(m) { m.vy += 2400 * DT; if (m.vy > 1400) m.vy = 1400; moveY(m, m.vy * DT); }
function frogSafe(m, dir) {
  const lx = m.x + dir * 120, mx = m.x + dir * 60, c = Math.floor(lx / T), cm = Math.floor(mx / T);
  const feet = m.y + m.h / 2, rg = Math.floor((feet + 2) / T);
  if (!solidAt(c, rg)) return false;
  const r0 = Math.floor((m.y - m.h / 2 + 2) / T), r1 = Math.floor((feet - 2) / T);
  for (let r = r0; r <= r1; r++) if (solidAt(c, r) || solidAt(cm, r)) return false;
  return true;
}
function updMonster(m) {
  if (!m.alive) return;
  const p = run.p;
  m.hitT = Math.max(0, m.hitT - DT); m.blockT = Math.max(0, m.blockT - DT);
  if (m.state === 'flung') { updFlung(m); return; }
  const dx = p.x - m.x, dy = p.y - m.y;
  if (m.type === 'boar') {
    gravityM(m);
    if (m.state === 'walk') {
      const pr = probe(m);
      if (pr.wall || pr.edge) m.facing = -m.facing; else moveX(m, 80 * m.facing * DT);
      if (Math.abs(dy) < 40 && dx * m.facing > 0 && Math.abs(dx) <= 240) { m.state = 'windup'; m.stT = 0; }
    } else if (m.state === 'windup') {
      m.stT += DT; if (m.stT >= 0.5) { m.state = 'charge'; m.stT = 0; }
    } else if (m.state === 'charge') {
      const pr = probe(m);
      if (pr.wall || pr.edge) { m.state = 'stun'; m.stT = 0; }
      else if (moveX(m, 420 * m.facing * DT)) { m.state = 'stun'; m.stT = 0; }
    } else if (m.state === 'stun') {
      m.stT += DT; if (m.stT >= 1) { m.state = 'walk'; m.stT = 0; }
    }
  } else if (m.type === 'shield') {
    gravityM(m);
    if (Math.abs(dx) <= 400 && Math.abs(dy) <= 120) {
      if (Math.abs(dx) > 4) m.facing = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) > 4) { const pr = probe(m); if (!pr.wall && !pr.edge) moveX(m, 40 * m.facing * DT); }
    } else {
      const pr = probe(m);
      if (pr.wall || pr.edge) m.facing = -m.facing; else moveX(m, 40 * m.facing * DT);
    }
  } else if (m.type === 'bee') {
    m.t += DT;
    if (m.state === 'fly') {
      m.cd -= DT;
      const nx = m.x + m.dir * 60 * DT;
      const c = Math.floor((nx + m.dir * 16) / T), r0 = Math.floor((m.y - 14) / T), r1 = Math.floor((m.y + 14) / T);
      let blocked = false;
      for (let r = r0; r <= r1; r++) if (solidAt(c, r)) blocked = true;
      if (Math.abs(nx - m.x0) > 120 || blocked) m.dir = -m.dir; else m.x = nx;
      m.facing = m.dir;
      if (m.cd <= 0 && Math.sqrt(dx * dx + dy * dy) <= 400) { m.state = 'aim'; m.aimT = 0.4; }
    } else if (m.state === 'aim') {
      m.aimT -= DT; m.facing = dx >= 0 ? 1 : -1;
      if (m.aimT <= 0) {
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        run.shots.push({ x: m.x, y: m.y, vx: dx / d * 220, vy: dy / d * 220, life: 5, w: 12, h: 12 });
        m.state = 'fly'; m.cd = 1.6;
      }
    }
    m.y = m.y0 + 16 * Math.sin(2 * Math.PI * m.t / 2);
  } else if (m.type === 'frog') {
    if (m.state === 'crouch') {
      gravityM(m);
      m.stT += DT;
      if (m.stT >= 1.2) {
        let dir = (Math.sqrt(dx * dx + dy * dy) <= 300) ? (dx >= 0 ? 1 : -1) : m.facing;
        if (!frogSafe(m, dir)) { dir = -dir; if (!frogSafe(m, dir)) dir = 0; }
        if (dir) m.facing = dir;
        m.vx = dir * 232.6; m.vy = -619.7; m.state = 'jump'; m.onGround = false; m.stT = 0;
      }
    } else if (m.state === 'jump') {
      m.vy += 2400 * DT;
      if (moveX(m, m.vx * DT)) m.vx = 0;
      moveY(m, m.vy * DT);
      if (m.onGround) { m.state = 'crouch'; m.stT = 0; m.vx = 0; }
    }
  }
}
function hurtPlayer(srcX) {
  const p = run.p;
  if (p.invT > 0 || p.dashT > 0) return;
  p.hp -= 1; p.invT = 1; p.hurtT = 0.3;
  p.hookT = null; p.hookLine = null;
  const dir = Math.sign(p.x - srcX) || -p.facing;
  for (let k = 0; k < 8; k++) if (moveX(p, 10 * dir)) break;
}
function nearestMonster(p, range) {
  let best = null, bd = range;
  for (const m of run.mons) {
    if (!m.alive) continue;
    const d = Math.sqrt((m.x - p.x) * (m.x - p.x) + (m.y - p.y) * (m.y - p.y));
    if (d <= bd) { bd = d; best = m; }
  }
  return best;
}
function explode(x, y, atk) {
  run.exps.push({ x, y, t: 0 });
  for (const m of run.mons) if (m.alive && boxDist(x, y, m) <= 60) damageMonster(m, 2, { kind: 'blast', atk });
  wallsInRadius(x, y, 60, g => breakWall(g));
}
function updatePlayer() {
  const p = run.p;
  p.invT = Math.max(0, p.invT - DT); p.hurtT = Math.max(0, p.hurtT - DT);
  p.atkCd = Math.max(0, p.atkCd - DT); p.skillCd = Math.max(0, p.skillCd - DT);
  p.slashT = Math.max(0, p.slashT - DT); p.shootT = Math.max(0, p.shootT - DT);
  p.throwT = Math.max(0, p.throwT - DT); p.waveT = Math.max(0, p.waveT - DT);
  const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  jumpBuf = Math.max(0, jumpBuf - DT);
  const pz = press.z, px = press.x; press.z = false; press.x = false;

  if (p.hookT) {
    const tx = p.hookT.x, ty = p.hookT.y, ddx = tx - p.x, ddy = ty - p.y, d = Math.sqrt(ddx * ddx + ddy * ddy), st = 700 * DT;
    if (d <= st + 1) { p.x = tx; p.y = ty; p.vy = -500; p.hookT = null; p.hookLine = null; p.onGround = false; p.jumping = false; }
    else { p.x += ddx / d * st; p.y += ddy / d * st; p.hookLine = [p.x, p.y - 6, tx, ty]; }
    p.vx = 0;
  } else if (p.dashT > 0) {
    p.dashT -= DT; p.vy = 0;
    const blocked = moveX(p, (160 / 0.18) * DT * p.dashDir);
    for (const m of run.mons) {
      if (!m.alive || p.dashHit[m.idx] || !ov(p, m)) continue;
      p.dashHit[m.idx] = 1;
      damageMonster(m, 2, { kind: 'dash', dir: p.dashDir, cy: p.y, atk: p.dashAtk });
    }
    if (blocked) {
      wallsInBox({ x: p.x + p.dashDir * 3, y: p.y, w: p.w, h: p.h - 2 }, g => { if (!p.dashHit['w' + g]) { p.dashHit['w' + g] = 1; hitWallGroup(g, 1); } });
      p.dashT = 0;
    }
    if (p.dashT <= 0) { p.dashT = 0; p.vx = 0; p.vy = 0; }
  } else {
    const doJump = jumpBuf > 0 && p.onGround;
    physPlayer(p, dir, doJump, held.space);
    if (doJump) jumpBuf = 0;
    if (p.onGround) p.dashAir = false;
    // 動作
    if (p.cls === 'sword') {
      if (pz && p.atkCd <= 0) {
        p.atkCd = 0.3; p.slashT = 0.15;
        const x0 = p.facing > 0 ? p.x + 14 : p.x - 14 - 50;
        const box = { x: x0 + 25, y: p.y, w: 50, h: 40 };
        const atk = ++run.atkSeq;
        for (const m of run.mons) if (m.alive && ov(box, m)) damageMonster(m, 1, { kind: 'melee', x: p.x, cy: p.y, atk });
        wallsInBox(box, g => hitWallGroup(g, 1));
      }
      if (px && p.skillCd <= 0 && (p.onGround || !p.dashAir)) {
        if (!p.onGround) p.dashAir = true;
        p.skillCd = 1.2; p.dashT = 0.18; p.dashDir = p.facing; p.dashHit = {}; p.dashAtk = ++run.atkSeq; p.vy = 0; p.vx = 0;
      }
    } else if (p.cls === 'hunter') {
      if (pz && p.atkCd <= 0) {
        p.atkCd = 0.4; p.shootT = 0.2;
        run.arrows.push({ x: p.x + p.facing * 16, y: p.y - 4, vx: 700 * p.facing, vy: 0, ang: p.facing > 0 ? 0 : Math.PI, dist: 0, max: 600, atk: ++run.atkSeq });
      }
      if (px && p.skillCd <= 0) {
        let best = null, bd = 220;
        for (const h of run.L.hooks) { const d = Math.sqrt((h.x - p.x) * (h.x - p.x) + (h.y - p.y) * (h.y - p.y)); if (d <= bd) { bd = d; best = h; } }
        if (best) { p.hookT = { x: best.x, y: best.y }; p.skillCd = 0.5; p.vy = 0; p.jumping = false; }
      }
    } else {
      if (pz && p.atkCd <= 0) {
        p.atkCd = 0.6; p.throwT = 0.2;
        run.bombs.push({ x: p.x + p.facing * 14, y: p.y - 8, vx: 300 * p.facing, vy: -500, w: 16, h: 16, t: 0, atk: ++run.atkSeq, onGround: false });
      }
      if (px && p.skillCd <= 0) {
        p.skillCd = 1.5; p.waveT = 0.25;
        run.waves.push({ x: p.x, y: p.y, t: 0 });
        const atk = ++run.atkSeq;
        for (const m of run.mons) {
          if (!m.alive || boxDist(p.x, p.y, m) > 130) continue;
          const r = damageMonster(m, 1, { kind: 'blast', atk });
          if (r !== 'killed' && m.alive) flingMonster(m, Math.sign(m.x - p.x) || p.facing, atk);
        }
        wallsInRadius(p.x, p.y, 130, g => breakWall(g));
      }
    }
  }
  if (p.onGround) p.dashAir = false;
  if (p.cls === 'hunter' && !p.hookT) {
    p.autoCd -= DT;
    if (p.autoCd <= 0) {
      const m = nearestMonster(p, 260);
      if (m) {
        const dx = m.x - p.x, dy = m.y - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        run.arrows.push({ x: p.x, y: p.y, vx: dx / d * 700, vy: dy / d * 700, ang: Math.atan2(dy, dx), dist: 0, max: 420, atk: ++run.atkSeq });
        p.autoCd = 0.6;
      } else p.autoCd = 0;
    }
  }
  let pose;
  if (p.hurtT > 0) pose = 'hurt';
  else if (p.hookT) pose = 'hook';
  else if (p.dashT > 0) pose = 'dash';
  else if (p.slashT > 0) pose = 'slash';
  else if (p.shootT > 0) pose = 'shoot';
  else if (p.throwT > 0) pose = 'throw';
  else if (p.waveT > 0) pose = 'wave';
  else if (!p.onGround) pose = p.vy < 0 ? 'rise' : 'fall';
  else pose = Math.abs(p.vx) > 1 ? 'run' : 'idle';
  if (pose !== p.pose) { p.pose = pose; p.poseT = 0; } else p.poseT += DT;
}
function updProjectiles() {
  const p = run.p;
  for (let k = run.arrows.length - 1; k >= 0; k--) {
    const a = run.arrows[k];
    a.x += a.vx * DT; a.y += a.vy * DT; a.dist += Math.sqrt(a.vx * a.vx + a.vy * a.vy) * DT;
    let dead = a.dist > a.max || a.x < 0 || a.x > W || a.y < -40 || a.y > H + 40;
    if (!dead) {
      const c = Math.floor(a.x / T), r = Math.floor(a.y / T);
      if (solidAt(c, r)) { if (curL.solid[r] && curL.solid[r][c] === 2) hitWallGroup(curL.gid[r][c], 1); dead = true; }
    }
    if (!dead) {
      for (const m of run.mons) {
        if (!m.alive) continue;
        if (Math.abs(a.x - m.x) < m.w / 2 + 6 && Math.abs(a.y - m.y) < m.h / 2 + 4) {
          damageMonster(m, 1, { kind: 'arrow', dir: Math.sign(a.vx) || 1, cy: a.y, atk: a.atk });
          dead = true; break;
        }
      }
    }
    if (dead) run.arrows.splice(k, 1);
  }
  for (let k = run.bombs.length - 1; k >= 0; k--) {
    const b = run.bombs[k];
    b.t += DT; b.vy += 2400 * DT;
    let hit = moveX(b, b.vx * DT);
    if (moveY(b, b.vy * DT) !== 0) hit = true;
    if (!hit) for (const m of run.mons) if (m.alive && ov(b, m)) { hit = true; break; }
    if (hit) { explode(b.x, b.y, b.atk); run.bombs.splice(k, 1); }
    else if (b.y > H + 60) run.bombs.splice(k, 1);
  }
  for (let k = run.shots.length - 1; k >= 0; k--) {
    const s = run.shots[k];
    s.x += s.vx * DT; s.y += s.vy * DT; s.life -= DT;
    let dead = s.life <= 0 || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20 || solidAt(Math.floor(s.x / T), Math.floor(s.y / T));
    if (!dead && ov(s, p)) { hurtPlayer(s.x - s.vx); dead = true; }
    if (dead) run.shots.splice(k, 1);
  }
}
function updEffects() {
  const adv = (arr, dur) => { for (let k = arr.length - 1; k >= 0; k--) { arr[k].t += DT; if (arr[k].t >= dur) arr.splice(k, 1); } };
  adv(run.exps, 0.25); adv(run.waves, 0.3); adv(run.poofs, 0.3); adv(run.popups, 0.8); adv(run.chainTexts, 0.8);
  if (run.notice) { run.notice.t += DT; if (run.notice.t >= 1.5) run.notice = null; }
}
function finalizeChains() {
  for (const id of Object.keys(run.chains)) {
    const active = run.mons.some(m => m.alive && m.state === 'flung' && m.fl && String(m.fl.atk) === id) || (run.p.dashT > 0 && String(run.p.dashAtk) === id);
    if (active) continue;
    const c = run.chains[id];
    if (c.n >= 2) run.chainTexts.push({ x: c.x, y: c.y, n: Math.min(20, c.n), t: 0 });
    delete run.chains[id];
  }
}
function stepPlay() {
  const r = run, p = r.p;
  r.frame++; r.t = r.frame * DT;
  updatePlayer();
  // 撿素材 / 寶箱
  const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
  for (let k = 0; k < r.L.pk.length; k++) {
    if (r.taken[k]) continue;
    const d = r.L.pk[k];
    if (Math.abs(d.x - p.x) < 26 && Math.abs(d.y - p.y) < 34) {
      r.taken[k] = true; r.takeOrder.push(k);
      baseGain('pickup', d.kind, 1, d.x, d.y);
    }
  }
  if (!r.chestOpen && Math.abs(r.L.chest.x - p.x) < 34 && Math.abs(r.L.chest.y - p.y) < 40) {
    r.chestOpen = true; r.chestOpened = true; r.notice = { type: r.L.chest.type, t: 0 };
  }
  for (const m of r.mons) updMonster(m);
  updProjectiles();
  for (const m of r.mons) {
    if (m.alive && m.state !== 'flung' && ov(p, m)) hurtPlayer(m.x);
  }
  finalizeChains();
  updEffects();
  // 危險 / 終點
  let fail = p.hp <= 0 || p.y - 22 > H;
  for (const s of r.L.spikes) {
    if (Math.abs(p.x - (s.c * T + 20)) < 14 + 20 && p.y + 22 > s.r * T + 20 && p.y - 22 < s.r * T + 40) fail = true;
  }
  const g = r.L.goal;
  if (!fail && Math.abs(p.x - g.x) < 14 + 20 && Math.abs(p.y - g.y) < 22 + 40) r.reached = true;
  checkPeds();
  r.frames.push(snapshot());
  if (fail) { r.over = 'fail'; setMode('fail'); }
  else if (r.reached) { r.over = 'clear'; finishRun(); }
}
function finishRun() {
  const L = run.L, i = run.i, ls = GM.LS[i];
  const rep = makeRep(run);
  for (const k of KINDS) if (run.mat[k]) addStock(k, run.mat[k]);
  let item = null;
  if (run.chestOpened && !ls.chestTaken) { ls.chestTaken = true; GM.inv.push({ type: L.chest.type, where: null }); item = L.chest.type; }
  run.itemType = item;
  ls.lastCls = Math.max(0, CLSN.indexOf(run.cls));
  const first = !ls.rep;
  if (first) { ls.rep = rep; ls.cleared = true; pendingRep = null; }
  else pendingRep = rep;
  refreshAll();
  const newEv = first ? rep.events : buildEvents(rep, i);
  resultInfo = {
    i, first, item, mat: Object.assign({}, run.mat), time: rep.dur, cls: run.cls,
    rates: ratesFromEvents(newEv, rep.dur, ACCEL[ls.accel])
  };
  setMode('result');
}

/* ============================ 繪製: 場景(關卡 / 縮圖 / 預覽共用) ============================ */
function terrainCache(L) {
  const pw = canvas.width, ph = canvas.height;
  if (L._cache && L._cw === pw && L._ch === ph) return L._cache;
  const c = document.createElement('canvas');
  c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  g.setTransform(pw / W, 0, 0, ph / H, 0, 0);
  Art.drawBackground(g, {});
  for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
    if (L.solid[r][col] === 1) {
      const top = r === 0 || L.solid[r - 1][col] !== 1;
      Art.drawGround(g, { x: col * T + 20, y: r * T + 20, top, theme: L.theme });
    }
  }
  for (const s of L.spikes) Art.drawSpike(g, { x: s.c * T + 20, y: s.r * T + 20 });
  L._cache = c; L._cw = pw; L._ch = ph;
  return c;
}
function drawMonsterArt(type, a) {
  const st = { x: a[0], y: a[1], facing: a[2], state: a[3], hit: !!a[4] };
  if (type === 'boar') { st.t = animT; Art.drawBoar(ctx, st); }
  else if (type === 'shield') { st.t = animT; Art.drawShieldman(ctx, st); }
  else if (type === 'bee') { st.t = animT; Art.drawShooterBee(ctx, st); }
  else Art.drawFrog(ctx, st);
}
// v: {L, s, taken[], slots[{sealed,item}], trigT[], tNow}; o: {thumb, noPlayer, ring}
function drawScene(v, o) {
  const L = v.L, s = v.s;
  ctx.drawImage(terrainCache(L), 0, 0, W, H);
  for (let g = 0; g < L.groupTiles.length; g++) {
    const hp = s.cw[g];
    if (hp > 0) for (const t of L.groupTiles[g]) Art.drawCrackWall(ctx, { x: t.c * T + 20, y: t.r * T + 20, hp: Math.min(3, hp) });
  }
  for (const h of L.hooks) Art.drawHookRing(ctx, { x: h.x, y: h.y });
  for (let k = 0; k < L.pk.length; k++) if (!v.taken[k]) Art.drawPickup(ctx, { x: L.pk[k].x, y: L.pk[k].y, kind: L.pk[k].kind, t: animT });
  Art.drawChest(ctx, { x: L.chest.x, y: L.chest.y, open: !!s.ch });
  Art.drawGoal(ctx, { x: L.goal.x, y: L.goal.y, reached: !!s.gr });
  for (let k = 0; k < 4; k++) {
    const sl = v.slots[k], tt = v.trigT[k];
    let glowT = 0.5;
    if (isFinite(tt) && v.tNow >= tt && v.tNow - tt < 0.5) glowT = v.tNow - tt;
    Art.drawPedestal(ctx, { x: L.peds[k].x, y: L.peds[k].y, sealed: sl.sealed, item: sl.item, glowT, glowDur: 0.5 });
  }
  for (let k = 0; k < s.m.length; k++) if (s.m[k][5]) drawMonsterArt(L.mons[k].type, s.m[k]);
  if (s.p && !o.noPlayer) {
    if (o.ring && s.p.cls === 'hunter') Art.drawRangeRing(ctx, { x: s.p.x, y: s.p.y, radius: 260 });
    Art.drawPlayer(ctx, { x: s.p.x, y: s.p.y, cls: s.p.cls, facing: s.p.facing, pose: s.p.pose, poseT: s.p.poseT, invuln: s.p.inv });
    if (s.hk) Placeholder.hookLine(ctx, s.hk[0], s.hk[1], s.hk[2], s.hk[3]);
  }
  for (const a of s.ar) Art.drawArrow(ctx, { x: a[0], y: a[1], angle: a[2] });
  for (const b of s.bo) Art.drawBomb(ctx, { x: b[0], y: b[1], t: b[2] });
  for (const b of s.sh) Art.drawBeeShot(ctx, { x: b[0], y: b[1] });
  for (const e of s.ex) Art.drawExplosion(ctx, { x: e[0], y: e[1], t: e[2], dur: 0.25, radius: 60 });
  for (const e of s.wv) Art.drawShockwave(ctx, { x: e[0], y: e[1], t: e[2], dur: 0.3, radius: 130 });
  for (const e of s.pf) Art.drawPoof(ctx, { x: e[0], y: e[1], t: e[2], dur: 0.3 });
}
function slotView(i) {
  return GM.LS[i].slots.map(s => ({ sealed: s.sealed, item: (!s.sealed && s.item != null) ? GM.inv[s.item].type : null }));
}
function repView(i, rep) {
  const s = rep.frames[repFrame(rep)];
  const taken = LV[i].pk.map(() => false);
  for (let k = 0; k < s.tk; k++) taken[rep.takeOrder[k]] = true;
  const cfg = cfgOf(i);
  return { L: LV[i], s, taken, slots: slotView(i), trigT: [0, 1, 2, 3].map(k => (cfg[k] && isFinite(rep.enterF[k])) ? rep.enterF[k] * DT : Infinity), tNow: rep.clock };
}
function initialSnap(i) {
  const L = LV[i];
  return {
    p: null,
    m: L.mons.map(d => [d.x, d.y, -1, d.type === 'bee' ? 'fly' : d.type === 'frog' ? 'crouch' : 'walk', 0, 1]),
    ar: [], bo: [], sh: [], ex: [], wv: [], pf: [], cw: L.groupTiles.map(() => 3), tk: 0, ch: GM.LS[i].chestTaken ? 1 : 0, gr: 0, hk: null
  };
}
function drawThumb(i, x, y) {
  const rep = GM.LS[i].rep;
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
  ctx.translate(x + 8, y + 8); ctx.scale(0.125, 0.125);
  drawScene(repView(i, rep), { thumb: true });
  ctx.restore();
}

/* ============================ 繪製: 大地圖 / 面板 ============================ */
function cardState(i) {
  const ls = GM.LS[i];
  if (ls.cleared) return 'cleared';
  if (ls.open) return 'open';
  return PARENTS[i].some(p => GM.LS[p].cleared) ? 'buyable' : 'sealed';
}
function drawMap() {
  Art.drawMapBackground(ctx, {});
  for (const [a, b] of LINKS) {
    Art.drawMapLink(ctx, { x1: CARD_POS[a][0] + 176, y1: CARD_POS[a][1] + 68, x2: CARD_POS[b][0], y2: CARD_POS[b][1] + 68, lit: GM.LS[a].cleared });
  }
  const zero = { wood: 0, ench: 0, time: 0 };
  for (let i = 0; i < 8; i++) {
    const [x, y] = CARD_POS[i], ls = GM.LS[i], st = cardState(i);
    const needs = st === 'sealed' || st === 'buyable';
    const cost = needs ? { wood: UNLOCK_COST[i], ench: 0, time: 0 } : zero;
    Art.drawLevelCard(ctx, {
      x, y, index: i + 1, name: LV[i].name, state: st, cost, canAfford: GM.stock.wood >= cost.wood,
      rates: st === 'cleared' ? ls.rep.rates : null, recordCls: st === 'cleared' ? ls.rep.cls : null, recordTime: st === 'cleared' ? Math.round(ls.rep.dur * 10) / 10 : null
    });
    if (st === 'cleared') drawThumb(i, x, y);
    Art.drawCardOverlay(ctx, { x, y, accelLv: ls.accel, selected: cursor === i });
  }
  Art.drawGoalCard(ctx, { x: GOAL_POS[0], y: GOAL_POS[1], cost: GOAL_COST, canAfford: canBuyGoal(), selected: cursor === 8 });
  for (const f of flights) {
    const u = f.t / 0.7, tx = HUD_ICON[f.kind][0], ty = HUD_ICON[f.kind][1];
    Art.drawFlyingMaterial(ctx, { x: f.sx + (tx - f.sx) * u, y: f.sy + (ty - f.sy) * u - Math.sin(Math.PI * u) * 90, kind: f.kind, t: f.t, dur: 0.7 });
  }
  drawHudMap();
  Placeholder.text(ctx, '↑↓←→ 選擇  Z 確定  空白鍵 說明  Esc 暫停', W / 2, 702, 16, '#e8e4d0');
}
function canBuyGoal() { return GM.stock.wood >= GOAL_COST.wood && GM.stock.ench >= GOAL_COST.ench && GM.stock.time >= GOAL_COST.time; }
function drawHudMap() {
  Art.drawHud(ctx, {
    mode: 'map', stock: GM.stock, ratePerMin: totalRatePerMin(), bumpT: bump, bumpDur: 0.15,
    time: null, run: null, hp: null, maxHp: null, skillCdT: null, skillCdDur: null, cls: null, buffs: null, itemThisRun: null
  });
}
function drawHudLevel() {
  const p = run.p, dur = SKILL_CD[p.cls];
  const buffs = [];
  for (const tr of run.trigs) {
    if (tr.type !== 'harvest' && tr.type !== 'hunt') continue;
    const d = tr.type === 'harvest' ? 4 : 6, remain = d - (run.frame - tr.F) * DT;
    if (remain > 0) buffs.push({ type: tr.type, remainT: remain, dur: d });
  }
  Art.drawHud(ctx, {
    mode: 'level', stock: GM.stock, ratePerMin: totalRatePerMin(), bumpT: bump, bumpDur: 0.15,
    time: Math.round(run.t * 10) / 10, run: run.mat, hp: Math.max(0, p.hp), maxHp: 3,
    skillCdT: Math.min(dur, dur - p.skillCd), skillCdDur: dur, cls: p.cls, buffs: buffs.slice(0, 4),
    itemThisRun: run.chestOpened ? run.L.chest.type : null
  });
}
function liveView() {
  const s = run.frames[run.frames.length - 1];
  return { L: run.L, s, taken: run.taken, slots: slotView(run.i), trigT: run.trigT, tNow: run.t };
}
function drawPlay() {
  drawScene(liveView(), { ring: true });
  for (const c of run.chainTexts) Art.drawChainText(ctx, { x: c.x, y: c.y - 20, n: c.n, t: c.t, dur: 0.8 });
  for (const q of run.popups) Art.drawPopup(ctx, { x: q.x, y: q.y - 10, t: q.t, dur: 0.8, kind: q.kind, value: q.value });
  if (run.notice) Art.drawItemNotice(ctx, { type: run.notice.type, t: run.notice.t, dur: 1.5 });
  drawHudLevel();
}
function panelState() {
  const P = panel, i = P.lv, ls = GM.LS[i], rep = ls.rep;
  const unsealed = ls.slots.filter(s => !s.sealed).length;
  const sel = ls.slots[P.slotSel];
  const uc = (sel.sealed && unsealed < 4) ? UNSEAL[unsealed - 1] : 0;
  return {
    index: i + 1, name: LV[i].name, row: P.row,
    classes: [0, 1, 2].map(k => ({ cls: CLSN[k], owned: GM.owned[k], cost: { wood: GM.owned[k] ? 0 : RECRUIT, ench: 0, time: 0 }, canAfford: GM.stock.wood >= RECRUIT })),
    clsSel: P.clsSel,
    slots: ls.slots.map(s => ({ sealed: s.sealed, item: (!s.sealed && s.item != null) ? GM.inv[s.item].type : null })),
    slotSel: P.slotSel, unsealCost: uc, canAffordUnseal: GM.stock.ench >= uc,
    items: GM.inv.map(it => ({ type: it.type, where: it.where ? { level: it.where.level, slot: it.where.slot } : null })),
    accelLv: ls.accel, accelCost: ls.accel >= 2 ? null : ACCEL_COST[ls.accel], canAffordAccel: ls.accel < 2 && GM.stock.time >= ACCEL_COST[ls.accel],
    recordCls: rep ? rep.cls : null, recordTime: rep ? Math.round(rep.dur * 10) / 10 : null, rates: rep ? rep.rates : null
  };
}
function drawPanel() {
  const P = panel, i = P.lv, ls = GM.LS[i], rep = ls.rep;
  Art.drawLevelPanel(ctx, panelState());
  ctx.save();
  ctx.beginPath(); ctx.rect(60, 96, 640, 360); ctx.clip();
  ctx.translate(60, 96); ctx.scale(0.5, 0.5);
  drawScene({ L: LV[i], s: initialSnap(i), taken: LV[i].pk.map(() => false), slots: slotView(i), trigT: [Infinity, Infinity, Infinity, Infinity], tNow: 0 }, { noPlayer: true });
  if (rep) Art.drawRoutePath(ctx, { points: rep.route, cls: rep.cls });
  ctx.restore();
  const d = LV[i].peds[P.slotSel];
  Art.drawSlotCursor(ctx, { x: 60 + d.x * 0.5, y: 96 + d.y * 0.5, active: P.row === 1 });
}
function drawGuide() {
  Art.drawMapBackground(ctx, {});
  const g = GUIDE[guidePage];
  Placeholder.text(ctx, g.title, W / 2, 62, 40, '#fff4c8');
  const x = Math.round((W - g.w) / 2), y = Math.round(110 + (480 - g.h) / 2);
  Art.drawGuidePage(ctx, { page: guidePage + GUIDE_ART_PAGE_BASE, x, y, w: g.w, h: g.h });
  Placeholder.text(ctx, g.text, W / 2, 626, 30, '#ffffff');
  const last = guidePage === GUIDE.length - 1;
  Placeholder.text(ctx, '第 ' + (guidePage + 1) + ' / ' + GUIDE.length + ' 頁    ← → 翻頁    Z ' + (last ? '開始' : '下一頁'), W / 2, 678, 20, '#e8e4d0');
}
function render() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (mode === 'guide') { drawGuide(); return; }
  if (mode === 'play') { drawPlay(); return; }
  if (mode === 'fail') { drawPlay(); Art.drawFailPanel(ctx, {}); return; }
  if (mode === 'result') {
    drawPlay();
    const ri = resultInfo, old = ri.first ? null : GM.LS[ri.i].rep;
    Art.drawResultPanel(ctx, {
      time: Math.round(ri.time * 10) / 10, run: ri.mat, rates: ri.rates, cls: ri.cls, item: ri.item,
      oldTime: old ? Math.round(old.dur * 10) / 10 : null, oldRates: old ? old.rates : null, oldCls: old ? old.cls : null
    });
    return;
  }
  if (mode === 'pause') {
    if (pauseState.prev === 'play') drawPlay(); else { drawMap(); if (panel) drawPanel(); }
    Art.drawPausePanel(ctx, { mode: pauseState.prev === 'play' ? 'level' : 'map' });
    return;
  }
  if (mode === 'ending') { drawMap(); Art.drawEndingPanel(ctx, { totalTime: Math.round(endTotal * 10) / 10 }); return; }
  drawMap();
  if (panel) drawPanel();
}

/* ============================ 輸入 ============================ */
function colOf(i) { for (let c = 0; c < MAP_COLS.length; c++) if (MAP_COLS[c].indexOf(i) >= 0) return c; return 0; }
function cardCy(i) { return i === 8 ? GOAL_POS[1] + 68 : CARD_POS[i][1] + 68; }
function moveCursor(code) {
  const c = colOf(cursor);
  if (code === 'ArrowUp' || code === 'ArrowDown') {
    const col = MAP_COLS[c], k = col.indexOf(cursor) + (code === 'ArrowUp' ? -1 : 1);
    if (k >= 0 && k < col.length) cursor = col[k];
  } else {
    const nc = c + (code === 'ArrowLeft' ? -1 : 1);
    if (nc < 0 || nc >= MAP_COLS.length) return;
    let best = MAP_COLS[nc][0], bd = 1e9;
    for (const j of MAP_COLS[nc]) { const d = Math.abs(cardCy(j) - cardCy(cursor)); if (d < bd) { bd = d; best = j; } }
    cursor = best;
  }
}
function setSlotItem(i, k, idx) {
  const s = GM.LS[i].slots[k];
  if (s.item != null) { GM.inv[s.item].where = null; s.item = null; }
  if (idx != null) {
    const it = GM.inv[idx];
    if (it.where) GM.LS[it.where.level - 1].slots[it.where.slot - 1].item = null;
    it.where = { level: i + 1, slot: k + 1 }; s.item = idx;
  }
  refreshAll();
}
function mapInput(code) {
  if (code === 'Space') { guideReturn = 'map'; guidePage = 0; setMode('guide'); return; }
  if (code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') { moveCursor(code); return; }
  if (code !== 'KeyZ') return;
  if (cursor === 8) {
    if (canBuyGoal()) {
      for (const k of KINDS) GM.stock[k] -= GOAL_COST[k];
      endTotal = GM.totalTime; setMode('ending');
    }
    return;
  }
  const st = cardState(cursor), ls = GM.LS[cursor];
  if (st === 'sealed') return;
  if (st === 'buyable') {
    if (GM.stock.wood >= UNLOCK_COST[cursor]) { GM.stock.wood -= UNLOCK_COST[cursor]; ls.open = true; }
    return;
  }
  flushFlights();
  panel = { lv: cursor, row: 0, clsSel: ls.lastCls, slotSel: 0 };
}
function panelInput(code) {
  const P = panel, i = P.lv, ls = GM.LS[i];
  if (code === 'KeyX') { panel = null; return; }
  if (code === 'ArrowUp') { P.row = Math.max(0, P.row - 1); return; }
  if (code === 'ArrowDown') { P.row = Math.min(2, P.row + 1); return; }
  if (code === 'ArrowLeft' || code === 'ArrowRight') {
    const d = code === 'ArrowLeft' ? -1 : 1;
    if (P.row === 0) P.clsSel = Math.max(0, Math.min(2, P.clsSel + d));
    else if (P.row === 1) P.slotSel = Math.max(0, Math.min(3, P.slotSel + d));
    return;
  }
  if (code !== 'KeyZ') return;
  if (P.row === 0) {
    if (GM.owned[P.clsSel]) startRun(i, CLSN[P.clsSel]);
    else if (GM.stock.wood >= RECRUIT) { GM.stock.wood -= RECRUIT; GM.owned[P.clsSel] = true; }
  } else if (P.row === 1) {
    const s = ls.slots[P.slotSel];
    if (s.sealed) {
      const n = ls.slots.filter(x => !x.sealed).length;
      if (n < 4 && GM.stock.ench >= UNSEAL[n - 1]) { GM.stock.ench -= UNSEAL[n - 1]; s.sealed = false; refreshAll(); }
    } else {
      const cur = s.item, len = GM.inv.length;
      let next;
      if (cur == null) next = len ? 0 : null; else next = (cur + 1 < len) ? cur + 1 : null;
      setSlotItem(i, P.slotSel, next);
    }
  } else {
    if (ls.accel < 2 && GM.stock.time >= ACCEL_COST[ls.accel]) { GM.stock.time -= ACCEL_COST[ls.accel]; ls.accel++; refreshAll(); }
  }
}
function guideInput(code) {
  if (code === 'ArrowLeft') guidePage = Math.max(0, guidePage - 1);
  else if (code === 'ArrowRight') guidePage = Math.min(GUIDE.length - 1, guidePage + 1);
  else if (code === 'KeyZ') {
    if (guidePage < GUIDE.length - 1) guidePage++;
    else setMode('map');
  }
}
function resetAll() {
  GM = newMeta(); flights = []; panel = null; cursor = 0; run = null; resultInfo = null; pendingRep = null;
  bump = { wood: 0.15, ench: 0.15, time: 0.15 };
  guidePage = 0; guideReturn = 'map'; setMode('guide');
}
function inputDown(code) {
  if (code === 'Escape') {
    if (mode === 'map' || mode === 'play') { pauseState = { prev: mode }; setMode('pause'); }
    else if (mode === 'pause') { const pv = pauseState.prev; setMode(pv); }
    return;
  }
  if (mode === 'guide') guideInput(code);
  else if (mode === 'map') { if (panel) panelInput(code); else mapInput(code); }
  else if (mode === 'play') {
    if (code === 'Space') jumpBuf = 0.1;
    else if (code === 'KeyZ') press.z = true;
    else if (code === 'KeyX') press.x = true;
  } else if (mode === 'fail') {
    if (code === 'KeyZ') startRun(run.i, run.cls);
    else if (code === 'KeyX') setMode('map');
  } else if (mode === 'result') {
    if (resultInfo.first) { if (code === 'KeyZ') setMode('map'); }
    else if (code === 'KeyZ' || code === 'KeyX') {
      if (code === 'KeyZ' && pendingRep) {
        const ls = GM.LS[resultInfo.i]; pendingRep.clock = 0; ls.rep = pendingRep; refreshAll();
      }
      pendingRep = null; setMode('map');
    }
  } else if (mode === 'pause') {
    if (pauseState.prev === 'play') {
      if (code === 'KeyZ') startRun(run.i, run.cls);
      else if (code === 'KeyX') { run = null; setMode('map'); }
    }
  } else if (mode === 'ending') {
    if (code === 'KeyZ') resetAll();
  }
}
const GAME_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1, KeyZ: 1, KeyX: 1, Escape: 1 };
window.addEventListener('keydown', function (e) {
  if (!GAME_KEYS[e.code]) return;
  e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'ArrowLeft') held.left = true;
  else if (e.code === 'ArrowRight') held.right = true;
  else if (e.code === 'Space') held.space = true;
  inputDown(e.code);
});
window.addEventListener('keyup', function (e) {
  if (!GAME_KEYS[e.code]) return;
  e.preventDefault();
  if (e.code === 'ArrowLeft') held.left = false;
  else if (e.code === 'ArrowRight') held.right = false;
  else if (e.code === 'Space') held.space = false;
});
window.addEventListener('blur', function () { held.left = held.right = held.space = false; });

/* ============================ 主迴圈 ============================ */
function step() {
  animT += DT;
  for (const k of KINDS) bump[k] = Math.min(0.15, bump[k] + DT);
  if (mode === 'guide' || mode === 'pause' || mode === 'ending') return;
  GM.totalTime += DT;
  advanceReplays(DT);
  updFlights();
  if (mode === 'play') stepPlay();
}
function resize() {
  const cw = window.innerWidth || document.documentElement.clientWidth || W;
  const ch = window.innerHeight || document.documentElement.clientHeight || H;
  const s = Math.min(cw / W, ch / H);
  const cssW = Math.max(1, Math.floor(W * s)), cssH = Math.max(1, Math.floor(H * s));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  canvas.style.left = Math.floor((cw - cssW) / 2) + 'px'; canvas.style.top = Math.floor((ch - cssH) / 2) + 'px';
  canvas.width = Math.max(1, Math.round(cssW * dpr)); canvas.height = Math.max(1, Math.round(cssH * dpr));
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

let lastTs = null, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (lastTs === null) lastTs = ts;
  let dt = (ts - lastTs) / 1000; lastTs = ts;
  if (dt > 1 / 30) dt = 1 / 30;
  acc += dt;
  let n = 0;
  while (acc >= DT && n < 4) { step(); acc -= DT; n++; }
  if (n === 4) acc = 0;
  try { render(); } catch (err) { console.error(err); }
}
requestAnimationFrame(frame);
