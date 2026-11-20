/* themes 方案 A — 方格磚 + 剪影遠景(最貼近底版 art.js 的畫法)
 * 每個主題 = 一組「天空漸層 + 兩層剪影遠景 + 40px 方格磚的頂面 / 內部紋理 + 主題裝飾」。
 * 地形仍是一格一格畫(和底版 drawGround 同結構), 主題差異集中在色溫與遠景剪影。
 * 版面: 左上 翠林谷地(第 1 關)、右上 風蝕高崖(第 5 關)、左下 地底礦坑(第 6 關), 皆為關卡 ×0.5;
 *       右下 8 關的大地圖縮圖(×0.125, 依主題分列)。
 */
(function () {
  'use strict';
  var W = 1280, H = 720, S = 40, COLS = 32, ROWS = 18, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  // ================= 共用: 關卡資料(三個方案同一組地形, 只換畫法) =================
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function rep(ch, n) { return new Array(n + 1).join(ch); }
  function digit(ch) { return ch === '-' || ch === '' ? -1 : parseInt(ch, 36); }
  function P(kind, x, y) { return ['drawPickup', { x: x, y: y, kind: kind, t: (x * 0.013) % 1 }]; }
  function HERO(cls, x, y, pose, f) { return ['drawPlayer', { x: x, y: y, cls: cls, facing: f || 1, pose: pose || 'idle', poseT: 0.1, invuln: false }]; }
  function GOAL(x, y) { return ['drawGoal', { x: x, y: y, reached: false }]; }
  function SIGN(x, y, role) { return ['drawSiteSign', { x: x, y: y, role: role }]; }
  function HOOK(x, y) { return ['drawHookRing', { x: x, y: y }]; }

  var LV = {
    1: { name: '第 1 關', theme: 'forest', top: rep('e', 10) + 'bb' + rep('9', 7) + 'bb' + rep('e', 11),
      cut: [[11, 12, 9, 2]], rubble: [[10, 12], [10, 13]], board: [[2, 11, 4]], add: [[6, 13, 1, 1], [24, 9, 4, 1], [28, 12, 2, 1]],
      fog: [[440, 480, 360, 80]],
      under: [P('wood', 520, 540), P('stone', 600, 540), ['drawChest', { x: 720, y: 542, open: false }]],
      objs: [HOOK(1000, 430), P('wood', 140, 540), P('wood', 600, 340), P('time', 1000, 340), P('time', 1080, 340),
        ['drawFrog', { x: 680, y: 346, facing: -1, state: 'crouch', hit: false, brood: false }],
        ['drawShooterBee', { x: 380, y: 300, facing: 1, state: 'fly', hit: false, brood: false, t: 0 }],
        ['drawBoar', { x: 880, y: 544, facing: -1, state: 'walk', hit: false, brood: false, t: 0 }],
        GOAL(1220, 520), SIGN(370, 536, 'treasure'), HERO('sword', 90, 538, 'run')] },
    2: { name: '第 2 關', theme: 'forest', top: rep('h', 32),
      add: [[0, 15, 12, 1], [10, 13, 12, 1], [4, 11, 10, 1], [14, 9, 10, 1], [22, 7, 10, 1]], board: [[6, 7, 5]],
      spikes: [[14, 16], [15, 16], [16, 16]], fog: [[200, 40, 280, 200]],
      objs: [GOAL(1220, 240), HERO('sword', 60, 578)] },
    3: { name: '第 3 關', theme: 'forest', top: rep('e', 12) + rep('7', 6) + rep('e', 14),
      cut: [[13, 12, 5, 2]], rubble: [[12, 12], [12, 13]], add: [[21, 9, 4, 1]], crack: [[5, 12], [5, 13]],
      fog: [[520, 480, 200, 80]],
      objs: [['drawBoar', { x: 360, y: 544, facing: 1, state: 'walk', hit: false, brood: false, t: 0 }], GOAL(1220, 520), HERO('sword', 60, 538)] },
    4: { name: '第 4 關', theme: 'cliff', top: rep('g', 22) + rep('-', 3) + rep('g', 7),
      add: [[8, 4, 7, 12], [0, 4, 8, 1], [16, 14, 4, 1], [21, 12, 4, 1], [16, 10, 4, 1], [21, 8, 4, 1], [16, 6, 4, 1]],
      fog: [[960, 120, 240, 160]],
      objs: [GOAL(120, 120), HERO('hunter', 60, 618)] },
    5: { name: '第 5 關', theme: 'cliff', top: rep('b', 7) + rep('f', 4) + rep('b', 4) + rep('g', 6) + rep('b', 4) + 'ee' + rep('a', 5),
      add: [[10, 13, 1, 2], [3, 6, 3, 1], [22, 5, 4, 1]], spikes: [[17, 15], [18, 15], [25, 13], [26, 13]],
      bridge: [11, 15, 20], fog: [[840, 80, 240, 160]],
      under: [['drawChest', { x: 960, y: 182, open: false }], P('time', 1040, 180)],
      objs: [['drawRangeRing', { x: 100, y: 418, radius: 260 }], HOOK(200, 330), P('time', 140, 220), P('time', 220, 220), P('stone', 340, 580),
        P('wood', 900, 420), GOAL(1220, 360), SIGN(570, 416, 'shortcut'), HERO('hunter', 100, 418)] },
    6: { name: '第 6 關', theme: 'mine', top: rep('e', 11) + 'gg' + rep('e', 19), ceil: rep('5', 32),
      add: [[20, 9, 12, 1], [16, 12, 2, 1], [18, 10, 2, 1]], crack: [[7, 10], [7, 11], [7, 12], [7, 13]],
      rubble: [[25, 6], [25, 7], [25, 8]], spikes: [[11, 15], [12, 15]], fog: [[1040, 240, 240, 120]], lamps: [[160, 240], [480, 240], [760, 240]],
      under: [P('time', 1120, 340), P('stone', 1200, 340)],
      objs: [['drawNestGate', { x: 1160, y: 500, open: false }], P('stone', 220, 540), P('stone', 420, 540),
        ['drawShieldman', { x: 520, y: 538, facing: -1, state: 'walk', hit: false, brood: false, t: 0 }],
        ['drawShieldman', { x: 760, y: 538, facing: -1, state: 'walk', hit: false, brood: false, t: 0 }],
        ['drawBomb', { x: 190, y: 470, t: 0 }], GOAL(900, 320), SIGN(960, 336, 'shortcut'), SIGN(1060, 536, 'nest'), HERO('bomber', 100, 538, 'throw')] },
    7: { name: '第 7 關', theme: 'mine', top: rep('d', 5) + rep('g', 22) + rep('d', 5), ceil: rep('3', 32),
      add: [[7, 11, 2, 1], [11, 11, 2, 1], [15, 10, 2, 1], [19, 11, 2, 1], [23, 11, 2, 1]],
      spikes: (function () { var a = []; for (var c = 5; c <= 26; c++) a.push([c, 15]); return a; })(),
      bridge: [13, 5, 26], lamps: [[300, 160], [700, 160], [1100, 160]], fog: [[0, 160, 200, 160]],
      objs: [GOAL(1220, 480), HERO('bomber', 60, 498)] },
    8: { name: '第 8 關', theme: 'cliff', top: rep('e', 8) + rep('g', 6) + rep('c', 7) + rep('8', 11),
      crack: [[18, 10], [18, 11]], add: [[19, 10, 2, 1], [5, 8, 3, 1]], fog: [[0, 160, 280, 120]],
      objs: [HOOK(260, 400), GOAL(1220, 280), HERO('sword', 60, 538)] }
  };

  function build(L) {
    if (L.grid) return L;
    var g = [], r, c, i;
    for (r = 0; r < ROWS; r++) { g.push([]); for (c = 0; c < COLS; c++) g[r].push(0); }
    function fill(a, v) { for (var rr = a[1]; rr < a[1] + (a[3] || 1); rr++) for (var cc = a[0]; cc < a[0] + a[2]; cc++) if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) g[rr][cc] = v; }
    for (c = 0; c < COLS; c++) {
      var tp = digit(L.top.charAt(c));
      if (tp >= 0) for (r = tp; r < ROWS; r++) g[r][c] = 1;
      if (L.ceil) { var cl = digit(L.ceil.charAt(c)); for (r = 0; r <= cl; r++) g[r][c] = 1; }
    }
    (L.add || []).forEach(function (a) { fill(a, 1); });
    (L.cut || []).forEach(function (a) { fill(a, 0); });
    (L.board || []).forEach(function (a) { fill([a[0], a[1], a[2], 1], 2); });
    (L.rubble || []).forEach(function (a) { g[a[1]][a[0]] = 3; });
    (L.crack || []).forEach(function (a) { g[a[1]][a[0]] = 4; });
    L.grid = g;
    return L;
  }
  function at(L, c, r) { if (r < 0) return 0; if (r >= ROWS) return 1; c = c < 0 ? 0 : (c >= COLS ? COLS - 1 : c); return L.grid[r][c]; }
  function solid(L, c, r) { return at(L, c, r) > 0; }
  function callArt(ctx, name, st) { var A = window.Art; if (A && typeof A[name] === 'function') A[name](ctx, st); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // 堵塞隧道的「冷色圓石堆」(全遊戲一致的打不壞記號), 主題只加附屬材質
  function rubbleStones(ctx, L0, T0, simple) {
    ctx.fillStyle = '#2b313b'; ctx.fillRect(L0, T0, 40, 40);
    if (simple) { ctx.fillStyle = '#4e5868'; ctx.fillRect(L0 + 2, T0 + 2, 36, 36); return; }
    var rk = [[10, 10, 9], [29, 9, 9], [20, 22, 10], [8, 31, 8], [31, 31, 9]];
    for (var i = 0; i < rk.length; i++) {
      circle(ctx, L0 + rk[i][0], T0 + rk[i][1], rk[i][2]); ctx.fillStyle = '#4e5868'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
      ctx.beginPath(); ctx.arc(L0 + rk[i][0], T0 + rk[i][1], rk[i][2] - 3, Math.PI * 1.1, Math.PI * 1.6); ctx.strokeStyle = '#7d8898'; ctx.stroke();
    }
  }
  function tag(ctx, x, y, s) {
    ctx.save();
    ctx.font = 'bold 15px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var w = (ctx.measureText(s).width || s.length * 15) + 20;
    rr(ctx, x, y, w, 26, 6); ctx.fillStyle = 'rgba(10,12,18,0.82)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    ctx.fillStyle = '#f2f4f8'; ctx.fillText(s, x + 10, y + 13.5);
    ctx.restore();
  }

  // ================= 方案 A: 主題定義 =================
  var TH = {
    forest: { name: '翠林谷地', sky0: '#4a7764', sky1: '#a3ad6a', far: '#628c63', near: '#41664f', sun: 'rgba(255,226,150,0.35)',
      top: '#6cc24a', topHi: '#b3e682', inner: '#6b4a2f', mark: '#553a24', edge: '#3a2616', fogTint: 'rgba(120,170,110,0.30)' },
    cliff: { name: '風蝕高崖', sky0: '#6a8bb1', sky1: '#c6d5e3', far: '#a6b9cf', near: '#8399b4',
      top: '#e9eef4', topHi: '#ffffff', inner: '#5c6479', mark: '#4b5266', mark2: '#737c93', edge: '#2d3241', fogTint: 'rgba(245,250,255,0.40)' },
    mine: { name: '地底礦坑', sky0: '#15110e', sky1: '#2a2019', far: '#33271d', near: '#47352a',
      top: '#7a6a58', topHi: '#a8977f', inner: '#4b3f39', mark: '#3a302b', edge: '#1a1411', fogTint: 'rgba(120,92,62,0.30)' }
  };

  // ---------- 背景: 漸層 + 兩層剪影 ----------
  function background(ctx, L, th, simple) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky0); g.addColorStop(1, th.sky1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var i, x;
    if (L.theme === 'forest') {
      if (!simple) { var sg = ctx.createRadialGradient(1060, 90, 10, 1060, 90, 260); sg.addColorStop(0, th.sun); sg.addColorStop(1, 'rgba(255,226,150,0)'); ctx.fillStyle = sg; ctx.fillRect(760, 0, 520, 360); }
      // 遠景: 圓冠樹林帶
      ctx.fillStyle = th.far;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (x = -40; x <= W + 40; x += 60) ctx.arc(x, 330 + Math.sin(x * 0.02) * 30, 56 + hash(x, 3) * 22, Math.PI, 0);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      // 近景: 粗樹幹 + 樹冠
      ctx.fillStyle = th.near;
      for (i = 0; i < 6; i++) {
        x = 60 + i * 230 + hash(i, 5) * 60;
        ctx.fillRect(x - 14, 120, 28, H);
        circle(ctx, x, 140, 70 + hash(i, 6) * 20); ctx.fill();
        circle(ctx, x - 50, 180, 46); ctx.fill(); circle(ctx, x + 52, 170, 50); ctx.fill();
      }
    } else if (L.theme === 'cliff') {
      // 遠景: 平頂台地(橫向風蝕紋)
      ctx.fillStyle = th.far;
      ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 380);
      var mes = [[0, 380], [120, 380], [150, 300], [330, 300], [360, 360], [520, 360], [560, 260], [700, 260], [740, 340], [900, 340], [930, 280], [1100, 280], [1140, 360], [1280, 360]];
      for (i = 0; i < mes.length; i++) ctx.lineTo(mes[i][0], mes[i][1]);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      if (!simple) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 3;
        for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 320 + i * 28); ctx.lineTo(W, 320 + i * 28); ctx.stroke(); }
        // 雲條
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        for (i = 0; i < 7; i++) { ell(ctx, hash(i, 8) * W, 70 + hash(i, 9) * 160, 90 + hash(i, 4) * 60, 9); ctx.fill(); }
      }
      // 近景: 沙漏形風蝕岩柱
      ctx.fillStyle = th.near;
      var pil = [180, 610, 1010];
      for (i = 0; i < pil.length; i++) {
        x = pil[i];
        poly(ctx, [x - 46, H, x - 30, 420, x - 14, 330, x - 34, 250, x - 40, 200, x + 40, 200, x + 30, 250, x + 14, 330, x + 32, 420, x + 46, H]); ctx.fill();
      }
    } else {
      // 礦坑: 遠層岩塊 + 木支架
      if (!simple) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (i = 0; i < 30; i++) { ell(ctx, hash(i, 2) * W, hash(i, 3) * H, 60 + hash(i, 4) * 60, 30 + hash(i, 5) * 30); ctx.fill(); }
      }
      ctx.fillStyle = th.far;
      for (x = 80; x < W; x += 280) { ctx.fillRect(x, 0, 16, H); ctx.fillRect(x + 150, 0, 16, H); ctx.fillRect(x - 6, 250, 178, 14); }
      ctx.fillStyle = th.near;
      if (!simple) for (x = 80; x < W; x += 280) { poly(ctx, [x + 16, 264, x + 46, 264, x + 16, 294]); ctx.fill(); poly(ctx, [x + 150, 264, x + 120, 264, x + 150, 294]); ctx.fill(); }
    }
  }

  // ---------- 地形磚(一格一格, 同底版結構) ----------
  function tile(ctx, L, th, c, r, simple) {
    var x = c * S, y = r * S, up = !solid(L, c, r - 1), dn = !solid(L, c, r + 1), lf = !solid(L, c - 1, r), rt = !solid(L, c + 1, r);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip();
    ctx.fillStyle = th.inner; ctx.fillRect(x, y, S, S);
    if (!simple) {
      var h = hash(c, r);
      ctx.fillStyle = th.mark; ctx.strokeStyle = th.mark; ctx.lineWidth = 2;
      if (L.theme === 'forest') {
        circle(ctx, x + 9 + h * 6, y + 28, 2.5); ctx.fill(); circle(ctx, x + 28, y + 18 + h * 8, 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 4, y + 36); ctx.quadraticCurveTo(x + 18, y + 22 + h * 8, x + 34, y + 34); ctx.stroke(); // 樹根
      } else if (L.theme === 'cliff') {
        // 世界座標對齊的岩層, 相鄰格接得起來
        ctx.strokeStyle = th.mark; ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + 40, y + 14); ctx.moveTo(x, y + 33); ctx.lineTo(x + 40, y + 33); ctx.stroke();
        ctx.strokeStyle = th.mark2; ctx.beginPath(); ctx.moveTo(x, y + 24); ctx.lineTo(x + 40, y + 24); ctx.stroke();
      } else {
        poly(ctx, [x + 6, y + 30, x + 14, y + 20, x + 22, y + 32]); ctx.fill();
        poly(ctx, [x + 24, y + 12, x + 34, y + 8, x + 36, y + 20]); ctx.fill();
        if (h > 0.86 && !up) { // 嵌在岩裡的晶礦(藍紫, 和青色時晶分開; 半埋、不浮、不閃星)
          ctx.fillStyle = '#6f7de8'; poly(ctx, [x + 14, y + 34, x + 18, y + 16, x + 22, y + 34]); ctx.fill();
          ctx.fillStyle = '#9aa4ff'; poly(ctx, [x + 22, y + 34, x + 27, y + 22, x + 30, y + 34]); ctx.fill();
        }
      }
      ctx.fillStyle = th.edge;
      if (lf) ctx.fillRect(x, y, 3, S);
      if (rt) ctx.fillRect(x + S - 3, y, 3, S);
      if (dn) ctx.fillRect(x, y + S - 4, S, 4);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 39, 39);
    }
    if (up) {
      var bh = simple ? 14 : 10;
      ctx.fillStyle = th.top; ctx.fillRect(x, y, S, bh);
      if (!simple) {
        ctx.fillStyle = th.topHi; ctx.fillRect(x, y, S, 2.5);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + 10, S, 1.5);
        if (L.theme === 'forest') { ctx.fillStyle = th.top; for (var i = 0; i < 4; i++) { poly(ctx, [x + 3 + i * 10, y + 10, x + 7 + i * 10, y + 10, x + 5 + i * 10, y + 15]); ctx.fill(); } }
        else if (L.theme === 'cliff') { ctx.fillStyle = '#c3ccd8'; poly(ctx, [x, y + 10, x + 12, y + 10, x + 7, y + 14]); ctx.fill(); poly(ctx, [x + 22, y + 10, x + 36, y + 10, x + 30, y + 15]); ctx.fill(); }
      }
    }
    ctx.restore();
  }
  // 木棧道(森林的人工平台: 舊木色、無釘頭 → 和「修好的橋」新木 + 釘頭分開)
  function boardwalk(ctx, L, c, r, simple) {
    var x = c * S, y = r * S;
    ctx.save();
    ctx.fillStyle = '#6e5038'; ctx.fillRect(x, y, S, 12);
    if (simple) { ctx.fillStyle = '#4d3826'; ctx.fillRect(x, y + 12, S, 28); ctx.restore(); return; }
    ctx.fillStyle = '#93714f'; ctx.fillRect(x, y, S, 2.5);
    ctx.strokeStyle = '#3e2c1c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 13, y); ctx.lineTo(x + 13, y + 12); ctx.moveTo(x + 27, y); ctx.lineTo(x + 27, y + 12); ctx.stroke();
    ctx.strokeStyle = '#4d3826'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + 2, y + 12); ctx.lineTo(x + 38, y + 38); ctx.moveTo(x + 38, y + 12); ctx.lineTo(x + 2, y + 38); ctx.stroke();
    ctx.fillStyle = '#4d3826'; ctx.fillRect(x, y + 36, S, 4);
    ctx.fillStyle = '#5c9c3c'; ctx.fillRect(x, y, S, 3); // 棧道上的青苔
    ctx.restore();
  }
  function rubble(ctx, L, c, r, simple) {
    var x = c * S, y = r * S;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip();
    rubbleStones(ctx, x, y, simple);
    if (!simple) {
      if (L.theme === 'forest') { // 纏樹根 + 苔
        ctx.strokeStyle = '#7a5130'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.bezierCurveTo(x + 14, y + 18, x + 22, y + 4, x + 40, y + 20); ctx.stroke();
        ctx.fillStyle = '#5fae3e'; ell(ctx, x + 12, y + 3, 9, 3); ctx.fill(); ell(ctx, x + 30, y + 2, 7, 3); ctx.fill();
      } else if (L.theme === 'mine') { // 斷掉的坑木
        ctx.save(); ctx.translate(x + 20, y + 20); ctx.rotate(-0.5); ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-24, -4, 48, 8);
        ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5; ctx.strokeRect(-24, -4, 48, 8); ctx.restore();
      }
    }
    ctx.restore();
  }
  // 斷橋(高崖 / 礦坑的吊橋): 端格 = 木柱 + 斷繩垂板; 中間 = 極淡繩線虛線(看得出橋要修在哪)
  function bridge(ctx, L, simple) {
    var b = L.bridge, r = b[0], y = r * S;
    ctx.save();
    for (var c = b[1]; c <= b[2]; c++) {
      var x = c * S, end = (c === b[1] || c === b[2]), dir = c === b[1] ? 1 : -1;
      if (end) {
        ctx.fillStyle = '#7a4f2a'; ctx.fillRect(x + (dir > 0 ? 4 : 28), y - 14, 8, 54);
        ctx.fillStyle = '#c99a5e'; ctx.fillRect(x + 2, y, 36, 8);
        if (!simple) {
          ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y, 36, 8);
          ctx.strokeStyle = '#d8c39a'; ctx.lineWidth = 2;
          var ox = dir > 0 ? x + 38 : x + 2;
          ctx.beginPath(); ctx.moveTo(ox, y + 4); ctx.quadraticCurveTo(ox + dir * 10, y + 30, ox + dir * 4, y + 52); ctx.stroke();
          ctx.save(); ctx.translate(ox + dir * 5, y + 44); ctx.rotate(dir * 1.2); ctx.fillStyle = '#c99a5e'; ctx.fillRect(-10, -3, 20, 6); ctx.restore();
        }
      } else if (!simple) {
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(216,195,154,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 40, y + 2); ctx.moveTo(x, y + 9); ctx.lineTo(x + 40, y + 9); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // ---------- 主題裝飾(不擋路、低調) ----------
  function deco(ctx, L, th, simple) {
    var c, r;
    if (L.theme === 'forest' && !simple) {
      // 平台底下垂藤(細線, 一看就不是實心)
      ctx.lineWidth = 2;
      for (r = 1; r < ROWS - 1; r++) for (c = 0; c < COLS; c++) {
        if (at(L, c, r) === 1 && !solid(L, c, r + 1) && hash(c, r) > 0.45) {
          var x = c * S + 10 + hash(r, c) * 20, len = 18 + hash(c + 3, r) * 34, y = (r + 1) * S;
          ctx.strokeStyle = '#3f8a3a'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y + len / 2, x, y + len); ctx.stroke();
          ctx.fillStyle = '#58a945'; ell(ctx, x + 3, y + len * 0.5, 4, 2.5, 0.6); ctx.fill(); ell(ctx, x, y + len, 3.5, 2.2, -0.5); ctx.fill();
        }
      }
    } else if (L.theme === 'cliff' && !simple) {
      // 頂面被風吹彎的草
      ctx.strokeStyle = '#b9c79a'; ctx.lineWidth = 1.5;
      for (c = 0; c < COLS; c++) for (r = 1; r < ROWS; r++) {
        if (at(L, c, r) === 1 && !solid(L, c, r - 1) && hash(c, r) > 0.55) {
          var gx = c * S + 8 + hash(r, c) * 20, gy = r * S;
          for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 4, gy); ctx.quadraticCurveTo(gx + k * 4 + 2, gy - 8, gx + k * 4 + 9, gy - 10); ctx.stroke(); }
        }
      }
    } else if (L.theme === 'mine') {
      // 礦車軌道(地面頂上)
      for (r = 1; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        if (at(L, c, r) === 1 && !solid(L, c, r - 1) && r >= 12) {
          var tx = c * S, ty = r * S;
          if (!simple) { ctx.fillStyle = '#3a2a1c'; for (var q = 0; q < 4; q++) ctx.fillRect(tx + 2 + q * 10, ty + 1, 6, 4); }
          ctx.fillStyle = '#a9afb8'; ctx.fillRect(tx, ty, S, simple ? 4 : 2);
        }
      }
      // 吊燈(暖光圈)
      (L.lamps || []).forEach(function (lp) {
        var lx = lp[0], ly = lp[1];
        ctx.strokeStyle = '#2a201a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 40); ctx.stroke();
        if (!simple) { var lg = ctx.createRadialGradient(lx, ly + 50, 4, lx, ly + 50, 120); lg.addColorStop(0, 'rgba(255,190,100,0.40)'); lg.addColorStop(1, 'rgba(255,190,100,0)'); ctx.fillStyle = lg; ctx.fillRect(lx - 120, ly - 70, 240, 240); }
        ctx.fillStyle = '#ffcf7a'; circle(ctx, lx, ly + 50, simple ? 10 : 7); ctx.fill();
        if (!simple) { ctx.fillStyle = '#3a2c20'; ctx.fillRect(lx - 9, ly + 38, 18, 5); }
      });
    }
  }

  // ---------- 迷霧: 底版的霧 + 主題色調(結構不變, 一眼仍是「霧」) ----------
  function fog(ctx, L, th, t, simple) {
    (L.fog || []).forEach(function (f) {
      callArt(ctx, 'drawFog', { x: f[0], y: f[1], w: f[2], h: f[3], alpha: 1, t: t });
      ctx.save(); ctx.fillStyle = th.fogTint; ctx.fillRect(f[0], f[1], f[2], f[3]); ctx.restore();
    });
  }

  function scene(ctx, L, t, simple) {
    build(L);
    var th = TH[L.theme], c, r;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    background(ctx, L, th, simple);
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      var v = L.grid[r][c];
      if (v === 1) tile(ctx, L, th, c, r, simple);
      else if (v === 2) boardwalk(ctx, L, c, r, simple);
      else if (v === 3) rubble(ctx, L, c, r, simple);
      else if (v === 4) callArt(ctx, 'drawCrackWall', { x: c * S + 20, y: r * S + 20, hp: 3 - (r % 3) });
    }
    if (L.bridge) bridge(ctx, L, simple);
    (L.spikes || []).forEach(function (s) { callArt(ctx, 'drawSpike', { x: s[0] * S + 20, y: s[1] * S + 20 }); });
    deco(ctx, L, th, simple);
    (L.under || []).forEach(function (o) { callArt(ctx, o[0], o[1]); });
    fog(ctx, L, th, t, simple);
    (L.objs || []).forEach(function (o) { callArt(ctx, o[0], o[1]); });
    ctx.restore();
  }

  // ================= 版面 =================
  function bigCell(ctx, x, y, key, t) {
    var L = LV[key];
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, 640, 360); ctx.clip();
    ctx.translate(x, y); ctx.scale(0.5, 0.5);
    scene(ctx, L, t, false);
    ctx.restore();
    tag(ctx, x + 8, y + 8, TH[L.theme].name + ' · ' + L.name);
  }
  function thumbs(ctx, x0, y0, t) {
    ctx.save();
    ctx.fillStyle = '#10141c'; ctx.fillRect(x0, y0, 640, 360);
    ctx.font = 'bold 14px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#9aa4b8';
    ctx.fillText('大地圖縮圖 ×0.125(同主題各關地形不同)', x0 + 14, y0 + 16);
    var rows = [['forest', [1, 2, 3]], ['cliff', [4, 5, 8]], ['mine', [6, 7]]];
    for (var i = 0; i < rows.length; i++) {
      var ty = y0 + 34 + i * 108;
      ctx.font = 'bold 14px ' + FONT; ctx.fillStyle = '#d0d6e2'; ctx.textAlign = 'center';
      var nm = TH[rows[i][0]].name;
      ctx.fillText(nm.slice(0, 2), x0 + 44, ty + 36); ctx.fillText(nm.slice(2), x0 + 44, ty + 56);
      for (var j = 0; j < rows[i][1].length; j++) {
        var tx = x0 + 86 + j * 182, key = rows[i][1][j];
        ctx.save();
        ctx.beginPath(); ctx.rect(tx, ty, 160, 90); ctx.clip();
        ctx.translate(tx, ty); ctx.scale(0.125, 0.125);
        scene(ctx, LV[key], t, true);
        ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = '#3c4860'; ctx.strokeRect(tx - 1, ty - 1, 162, 92);
        rr(ctx, tx + 3, ty + 3, 20, 18, 4); ctx.fillStyle = 'rgba(10,12,18,0.85)'; ctx.fill();
        ctx.font = 'bold 12px ' + FONT; ctx.fillStyle = '#f2f4f8'; ctx.textAlign = 'center'; ctx.fillText(String(key), tx + 13, ty + 12.5);
      }
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'themes', id: 'A', kind: 'static',
    size: [1280, 720],
    duration: 0,
    loop: false,
    draw: function (ctx, t) {
      t = Number(t) || 0;
      ctx.save();
      ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H);
      bigCell(ctx, 0, 0, 1, t);
      bigCell(ctx, 640, 0, 5, t);
      bigCell(ctx, 0, 360, 6, t);
      thumbs(ctx, 640, 360, t);
      ctx.fillStyle = '#0b0d12'; ctx.fillRect(638, 0, 4, H); ctx.fillRect(0, 358, W, 4);
      ctx.restore();
    }
  };
})();
