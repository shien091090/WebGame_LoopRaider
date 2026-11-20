/* themes 方案 C — 暗底舞台 + 主題光源
 * 地形與背景一律偏暗低彩, 主題靠「光」辨認: 翠林 = 左上斜射光柱與頂面光斑、高崖 = 逆光地平線 + 雲海 + 白色頂緣、
 * 礦坑 = 黑暗中的吊燈光圈(頂面描邊亮度隨離燈距離變化)與晶礦冷光。角色、怪物、素材畫在光之上, 不被染色。
 * 版面: 左上 翠林谷地(第 1 關)、右上 風蝕高崖(第 5 關)、左下 地底礦坑(第 6 關), 皆為關卡 ×0.5;
 *       右下 8 關的大地圖縮圖(×0.125, 依主題分列)。關卡資料與方案 A、B 相同, 只換畫法。
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

  // ================= 方案 C: 主題定義 =================
  // 三個主題共用「偏暗、低彩的地形與背景」, 主題靠光源決定: 翠林 = 斜射陽光與光斑、高崖 = 逆光地平線與白色描邊、
  // 礦坑 = 黑暗中的吊燈光圈與晶光。角色、怪物、素材畫在光之上, 永遠是全畫面最亮最清楚的一層。
  var TH = {
    forest: { name: '翠林谷地', bg0: '#1d2a22', bg1: '#33422b', far: '#26361f', canopy: '#0f1a12',
      inner: '#3e2d20', mark: '#2f2218', top: '#3f7d33', rim: '#d8ef86', edge: '#1c130c',
      shaft: 'rgba(255,236,170,0.11)', dapple: 'rgba(255,240,160,0.38)', fogTint: 'rgba(235,220,170,0.28)' },
    cliff: { name: '風蝕高崖', far: '#566a8a', cloud: '#e2e9f1',
      inner: '#272e40', mark: '#323a50', top: '#3a4258', rim: '#f4f8ff', edge: '#151a26', fogTint: 'rgba(250,252,255,0.45)' },
    mine: { name: '地底礦坑', bg0: '#0a0807', bg1: '#15110e', far: '#1d1713',
      inner: '#2a2320', mark: '#211b18', top: '#4f4234', rim: '#ffc27a', edge: '#0c0907', fogTint: 'rgba(90,78,66,0.35)' }
  };

  function background(ctx, L, th, simple) {
    var g, i, x, y;
    if (L.theme === 'forest') {
      g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = th.far; // 遠景細樹幹林(深色, 不搶戲)
      for (i = 0; i < 26; i++) { x = hash(i, 1) * W; ctx.fillRect(x, 0, 6 + hash(i, 2) * 12, H); }
    } else if (L.theme === 'cliff') {
      // 逆光: 上暗下亮, 地平線在 y≈520, 底下是雲海(坑底看出去就是雲海 = 高)
      g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#26385a'); g.addColorStop(0.55, '#8fa8c6'); g.addColorStop(0.72, '#eef3f8'); g.addColorStop(0.8, '#d2dde9'); g.addColorStop(1, '#b8c7d8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = th.far; // 地平線上的遠崖剪影
      ctx.beginPath(); ctx.moveTo(0, 525);
      for (x = 0; x <= W; x += 40) ctx.lineTo(x, 520 - Math.abs(Math.sin(x * 0.011)) * 70 - hash(x, 2) * 16);
      ctx.lineTo(W, 525); ctx.closePath(); ctx.fill();
      ctx.fillStyle = th.cloud; // 雲海
      ctx.fillRect(0, 540, W, H - 540);
      if (!simple) for (i = 0; i < 16; i++) { ell(ctx, i * 86 + hash(i, 3) * 30, 540 + hash(i, 4) * 10, 70, 22); ctx.fill(); }
    } else {
      g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (!simple) { ctx.fillStyle = th.far; for (x = 100; x < W; x += 300) { ctx.fillRect(x, 0, 12, H); ctx.fillRect(x + 110, 0, 12, H); ctx.fillRect(x - 4, 250, 130, 10); } }
    }
  }

  function lampLight(L, x, y) { // 礦坑: 離最近吊燈越近, 頂面描邊越亮
    var best = 0;
    (L.lamps || []).forEach(function (lp) { var d = Math.hypot(x - lp[0], y - lp[1] - 50); best = Math.max(best, 1 - d / 360); });
    return Math.max(0.12, Math.min(1, best));
  }
  function tile(ctx, L, th, c, r, simple) {
    var x = c * S, y = r * S, up = !solid(L, c, r - 1), dn = !solid(L, c, r + 1), lf = !solid(L, c - 1, r), rt = !solid(L, c + 1, r);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip();
    ctx.fillStyle = th.inner; ctx.fillRect(x, y, S, S);
    if (!simple) {
      ctx.fillStyle = th.mark; ctx.strokeStyle = th.mark; ctx.lineWidth = 2;
      if (L.theme === 'forest') { circle(ctx, x + 10, y + 28, 3); ctx.fill(); circle(ctx, x + 29, y + 20, 2.5); ctx.fill(); }
      else if (L.theme === 'cliff') { ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x + 40, y + 16); ctx.moveTo(x, y + 32); ctx.lineTo(x + 40, y + 32); ctx.stroke(); }
      else {
        poly(ctx, [x + 6, y + 30, x + 14, y + 20, x + 22, y + 32]); ctx.fill();
        if (hash(c, r) > 0.86 && !up) { ctx.fillStyle = '#7b84ff'; poly(ctx, [x + 14, y + 34, x + 18, y + 14, x + 22, y + 34]); ctx.fill(); ctx.fillStyle = '#b3b9ff'; poly(ctx, [x + 22, y + 34, x + 27, y + 22, x + 30, y + 34]); ctx.fill(); }
      }
      ctx.fillStyle = th.edge;
      if (lf) ctx.fillRect(x, y, 3, S);
      if (rt) ctx.fillRect(x + S - 3, y, 3, S);
      if (dn) ctx.fillRect(x, y + S - 5, S, 5);
      // 高崖: 側面朝亮處的一側(往下)漸暗, 加強逆光的厚重感
      if (L.theme === 'cliff' && up) { var sg = ctx.createLinearGradient(0, y, 0, y + S); sg.addColorStop(0, 'rgba(255,255,255,0.06)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(x, y, S, S); }
    }
    if (up) {
      ctx.fillStyle = th.top; ctx.fillRect(x, y, S, simple ? 14 : 10);
      var rimA = L.theme === 'mine' ? lampLight(L, x + 20, y) : 1;
      ctx.globalAlpha = rimA;
      ctx.fillStyle = th.rim; ctx.fillRect(x, y, S, simple ? 6 : (L.theme === 'cliff' ? 3.5 : 3));
      ctx.globalAlpha = 1;
    }
    // 高崖逆光: 外露的左右側也有一條白色描邊
    if (L.theme === 'cliff' && !simple) { ctx.fillStyle = 'rgba(244,248,255,0.55)'; if (lf) ctx.fillRect(x, y, 1.5, S); if (rt) ctx.fillRect(x + S - 1.5, y, 1.5, S); }
    ctx.restore();
  }
  function boardwalk(ctx, L, c, r, simple) {
    var x = c * S, y = r * S;
    ctx.save();
    ctx.fillStyle = '#4a3524'; ctx.fillRect(x, y, S, 12);
    ctx.fillStyle = '#2e2115'; ctx.fillRect(x, y + 12, S, simple ? 28 : 0);
    if (!simple) {
      ctx.strokeStyle = '#2e2115'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x + 2, y + 12); ctx.lineTo(x + 38, y + 38); ctx.moveTo(x + 38, y + 12); ctx.lineTo(x + 2, y + 38); ctx.stroke();
      ctx.fillRect(x, y + 36, S, 4);
      ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 13, y); ctx.lineTo(x + 13, y + 12); ctx.moveTo(x + 27, y); ctx.lineTo(x + 27, y + 12); ctx.stroke();
      ctx.fillStyle = '#d8ef86'; ctx.fillRect(x, y, S, 2.5);
    }
    ctx.restore();
  }
  function rubble(ctx, L, c, r, simple) {
    var x = c * S, y = r * S;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip();
    rubbleStones(ctx, x, y, simple);
    if (!simple) {
      if (L.theme === 'forest') { ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.bezierCurveTo(x + 14, y + 18, x + 22, y + 4, x + 40, y + 20); ctx.stroke(); ctx.fillStyle = 'rgba(255,240,160,0.35)'; ell(ctx, x + 22, y + 10, 10, 4); ctx.fill(); }
      else if (L.theme === 'mine') { ctx.save(); ctx.translate(x + 20, y + 20); ctx.rotate(-0.5); ctx.fillStyle = '#4e3520'; ctx.fillRect(-24, -4, 48, 8); ctx.restore(); }
    }
    ctx.restore();
  }
  function bridge(ctx, L, simple) {
    var b = L.bridge, r = b[0], y = r * S;
    ctx.save();
    for (var c = b[1]; c <= b[2]; c++) {
      var x = c * S, end = (c === b[1] || c === b[2]), dir = c === b[1] ? 1 : -1;
      if (end) {
        ctx.fillStyle = '#4a3020'; ctx.fillRect(x + (dir > 0 ? 4 : 28), y - 14, 8, 54);
        ctx.fillStyle = '#9c7446'; ctx.fillRect(x + 2, y, 36, 8);
        ctx.fillStyle = L.theme === 'cliff' ? '#f4f8ff' : '#ffc27a'; ctx.fillRect(x + 2, y, 36, 2);
        if (!simple) {
          ctx.strokeStyle = '#d8c39a'; ctx.lineWidth = 2;
          var ox = dir > 0 ? x + 38 : x + 2;
          ctx.beginPath(); ctx.moveTo(ox, y + 4); ctx.quadraticCurveTo(ox + dir * 10, y + 30, ox + dir * 4, y + 52); ctx.stroke();
          ctx.save(); ctx.translate(ox + dir * 5, y + 44); ctx.rotate(dir * 1.2); ctx.fillStyle = '#9c7446'; ctx.fillRect(-10, -3, 20, 6); ctx.restore();
        }
      } else if (!simple) {
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(216,195,154,0.45)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 40, y + 2); ctx.moveTo(x, y + 9); ctx.lineTo(x + 40, y + 9); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // ---------- 光: 地形之後、物件之前(物件不被光染色) ----------
  function lighting(ctx, L, th, simple) {
    var i, c, r;
    if (L.theme === 'forest') {
      // 斜射光柱(左上 → 右下)
      ctx.fillStyle = simple ? 'rgba(255,236,170,0.22)' : th.shaft;
      var sx = [120, 420, 760, 1040];
      for (i = 0; i < sx.length; i++) { poly(ctx, [sx[i], 0, sx[i] + 90, 0, sx[i] + 330, H, sx[i] + 180, H]); ctx.fill(); }
      if (!simple) {
        // 光柱落在頂面上的光斑
        ctx.fillStyle = th.dapple;
        for (r = 1; r < ROWS; r++) for (c = 0; c < COLS; c++) {
          if (L.grid[r][c] === 1 && !solid(L, c, r - 1)) {
            var px = c * S + 20, py = r * S;
            for (i = 0; i < sx.length; i++) { var a = sx[i] + 45 + py * (195 / H); if (Math.abs(px - a) < 60 && hash(c, r) > 0.3) { ell(ctx, px + (hash(r, c) - 0.5) * 16, py + 2, 12, 3); ctx.fill(); } }
          }
        }
        // 上緣樹冠框(在 HUD 列的高度內, 不壓遊玩區)
        ctx.fillStyle = th.canopy;
        for (i = 0; i < 24; i++) { circle(ctx, i * 56 + hash(i, 1) * 20, 6 + hash(i, 2) * 18, 30 + hash(i, 3) * 14); ctx.fill(); }
      }
    } else if (L.theme === 'cliff') {
      if (!simple) {
        ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2; // 風線
        for (i = 0; i < 10; i++) { var wx = hash(i, 7) * W, wy = 60 + hash(i, 8) * 380; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 80, wy - 10, wx + 170, wy - 2); ctx.stroke(); }
      }
    } else {
      // 吊燈: 燈繩 + 燈 + 暖光圈
      (L.lamps || []).forEach(function (lp) {
        var lx = lp[0], ly = lp[1];
        ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 40); ctx.stroke();
        var lg = ctx.createRadialGradient(lx, ly + 50, 6, lx, ly + 50, simple ? 200 : 300);
        lg.addColorStop(0, 'rgba(255,175,85,0.34)'); lg.addColorStop(0.5, 'rgba(255,150,70,0.12)'); lg.addColorStop(1, 'rgba(255,150,70,0)');
        ctx.fillStyle = lg; ctx.fillRect(lx - 300, ly - 250, 600, 600);
        ctx.fillStyle = '#ffd38a'; circle(ctx, lx, ly + 50, simple ? 14 : 8); ctx.fill();
      });
      if (!simple) {
        // 晶礦的冷光
        for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
          if (L.grid[r][c] === 1 && hash(c, r) > 0.86 && solid(L, c, r - 1)) {
            var cg = ctx.createRadialGradient(c * S + 22, r * S + 28, 2, c * S + 22, r * S + 28, 56);
            cg.addColorStop(0, 'rgba(123,132,255,0.30)'); cg.addColorStop(1, 'rgba(123,132,255,0)');
            ctx.fillStyle = cg; ctx.fillRect(c * S - 36, r * S - 30, 116, 116);
          }
        }
        // 四周暗角
        var vg = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 760);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }
    }
  }

  function deco(ctx, L, th, simple) {
    if (L.theme === 'mine') {
      for (var r = 1; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        if (at(L, c, r) === 1 && !solid(L, c, r - 1) && r >= 12) {
          var tx = c * S, ty = r * S;
          ctx.globalAlpha = 0.35 + 0.65 * lampLight(L, tx + 20, ty);
          if (!simple) { ctx.fillStyle = '#20160e'; for (var q = 0; q < 4; q++) ctx.fillRect(tx + 2 + q * 10, ty + 1, 6, 4); }
          ctx.fillStyle = '#c9ccd2'; ctx.fillRect(tx, ty, S, simple ? 4 : 2);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

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
    deco(ctx, L, th, simple);
    lighting(ctx, L, th, simple);
    (L.spikes || []).forEach(function (s) { callArt(ctx, 'drawSpike', { x: s[0] * S + 20, y: s[1] * S + 20 }); });
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
    element: 'themes', id: 'C', kind: 'static',
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
