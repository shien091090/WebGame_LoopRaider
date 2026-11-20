/* themes 方案 B — 整塊輪廓地形 + 一個主題一種造型語言(翠林 = 圓、高崖 = 尖、礦坑 = 方)
 * 地形不畫格線, 相鄰實心格連成一整塊, 只有外露邊有深色描邊; 外角依主題變圓角 / 斜切 / 直角木框。
 * 遠景三層視差也用同一種造型(圓丘與棒棒糖樹 / 尖塔與斜肩台地 / 豎井與方形坑木框), 霧團形狀同理。
 * 版面: 左上 翠林谷地(第 1 關)、右上 風蝕高崖(第 5 關)、左下 地底礦坑(第 6 關), 皆為關卡 ×0.5;
 *       右下 8 關的大地圖縮圖(×0.125, 依主題分列)。關卡資料與方案 A、C 相同, 只換畫法。
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

  // ================= 方案 B: 主題定義 =================
  // 地形不再是一格一格的磚, 而是整塊連起來的輪廓: 外露邊才有深色描邊, 格與格之間沒有縫。
  // 三個主題各用一種造型語言, 從遠景到平台邊角一路貫徹: 翠林 = 圓、高崖 = 尖(斜切)、礦坑 = 方(木框)。
  var TH = {
    forest: { name: '翠林谷地', shape: 'round', sky0: '#3f6e5e', sky1: '#d6c486', far: '#8fae7c', mid: '#62895c', near: '#3b5c44',
      line: '#2a1a0e', inner: '#73502f', chip: '#5c3f24', chipHi: '#8a6440', cap: '#5cbf45', capHi: '#a8e27a', capDark: '#3f8a33',
      fog: '#a7b3a2', fogA: 'rgba(214,226,206,0.55)', fogB: 'rgba(120,138,118,0.35)' },
    cliff: { name: '風蝕高崖', shape: 'chamfer', sky0: '#6f90b8', sky1: '#dfe8f1', far: '#bccadb', mid: '#97abc4', near: '#7489a7',
      line: '#262b3a', inner: '#5d6680', band2: '#6c7690', band3: '#525a72', cap: '#e8eef5', capHi: '#ffffff', capDark: '#b9c4d2',
      fog: '#c9d2de', fogA: 'rgba(250,252,255,0.65)', fogB: 'rgba(160,172,190,0.35)' },
    mine: { name: '地底礦坑', shape: 'square', sky0: '#110d0b', sky1: '#221a15', far: '#2a211b', mid: '#3a2c21', near: '#4c3828',
      line: '#0d0a08', inner: '#463b35', chip: '#372e29', chipHi: '#5a4d45', cap: '#76664f', capHi: '#9c8a70', capDark: '#4f4334',
      timber: '#6b4a2b', timberDark: '#3e2a17', fog: '#8c8378', fogA: 'rgba(176,166,150,0.55)', fogB: 'rgba(90,80,70,0.35)' }
  };

  // ---------- 背景: 三層視差, 造型語言跟主題走 ----------
  function background(ctx, L, th, simple) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky0); g.addColorStop(1, th.sky1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var i, x, y;
    if (L.theme === 'forest') {
      ctx.fillStyle = th.far; // 遠: 圓丘
      for (i = 0; i < 7; i++) { circle(ctx, i * 220 - 40, 560 + hash(i, 1) * 60, 200 + hash(i, 2) * 60); ctx.fill(); }
      ctx.fillStyle = th.mid; // 中: 棒棒糖樹
      for (i = 0; i < 9; i++) { x = 40 + i * 150 + hash(i, 3) * 40; y = 250 + hash(i, 4) * 70; ctx.fillRect(x - 7, y, 14, H); circle(ctx, x, y, 48 + hash(i, 5) * 18); ctx.fill(); }
      if (!simple) { // 近: 畫面兩側的大樹幹 + 垂下的圓葉團(框住畫面)
        ctx.fillStyle = th.near;
        ctx.fillRect(0, 0, 34, H); ctx.fillRect(W - 30, 0, 30, H);
        for (i = 0; i < 9; i++) { circle(ctx, 20 + i * 36, 10 + Math.sin(i) * 14, 34); ctx.fill(); circle(ctx, W - 20 - i * 34, 6 + Math.cos(i) * 12, 30); ctx.fill(); }
      }
    } else if (L.theme === 'cliff') {
      ctx.fillStyle = th.far; // 遠: 尖塔群
      for (i = 0; i < 12; i++) { x = i * 115 + hash(i, 1) * 40; y = 220 + hash(i, 2) * 120; poly(ctx, [x - 50, H, x - 8, y, x + 8, y, x + 50, H]); ctx.fill(); }
      ctx.fillStyle = th.mid; // 中: 斜肩台地
      for (i = 0; i < 5; i++) { x = i * 300 + 40; y = 330 + hash(i, 3) * 60; poly(ctx, [x - 130, H, x - 100, y + 40, x - 60, y, x + 60, y, x + 100, y + 40, x + 130, H]); ctx.fill(); }
      if (!simple) {
        ctx.fillStyle = th.near; // 近: 沙漏岩柱(折線)
        var pil = [120, 640, 1170];
        for (i = 0; i < pil.length; i++) { x = pil[i]; poly(ctx, [x - 44, H, x - 30, 430, x - 12, 360, x - 30, 290, x - 18, 250, x + 18, 250, x + 30, 290, x + 12, 360, x + 30, 430, x + 44, H]); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; // 風線
        for (i = 0; i < 9; i++) { x = hash(i, 7) * W; y = 60 + hash(i, 8) * 300; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120 + hash(i, 9) * 80, y - 6); ctx.stroke(); }
      }
    } else {
      ctx.fillStyle = th.far; // 遠: 豎井口(方)
      for (i = 0; i < 10; i++) { x = i * 140 + hash(i, 1) * 50; ctx.fillRect(x, 60 + hash(i, 2) * 200, 46, 160 + hash(i, 3) * 200); }
      if (!simple) {
        ctx.strokeStyle = th.mid; ctx.lineWidth = 6; // 中: 鷹架格
        for (x = 60; x < W; x += 180) { ctx.strokeRect(x, 200, 120, 120); ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x + 120, 320); ctx.stroke(); }
      }
      // 近: 方形坑木框(柱 + 樑 + 角撐), 只在有天花板的欄
      ctx.fillStyle = th.near;
      for (var c = 2; c < COLS; c += 7) {
        var top = -1, bot = -1, r;
        for (r = 0; r < ROWS; r++) { if (L.grid[r][c] && top === r - 1) top = r; }
        for (r = top + 1; r < ROWS; r++) { if (L.grid[r][c]) { bot = r; break; } }
        if (top < 0 || bot < 0) continue;
        x = c * S; var y0 = (top + 1) * S, y1 = bot * S;
        ctx.fillRect(x, y0, 14, y1 - y0); ctx.fillRect(x + 66, y0, 14, y1 - y0); ctx.fillRect(x - 6, y0, 92, 12);
        if (!simple) { poly(ctx, [x + 14, y0 + 12, x + 34, y0 + 12, x + 14, y0 + 32]); ctx.fill(); poly(ctx, [x + 66, y0 + 12, x + 46, y0 + 12, x + 66, y0 + 32]); ctx.fill(); }
      }
    }
  }

  // ---------- 地形: 整塊輪廓 ----------
  function cornerR(L, th, c, r) {
    var up = !solid(L, c, r - 1), dn = !solid(L, c, r + 1), lf = !solid(L, c - 1, r), rt = !solid(L, c + 1, r);
    var tR = th.shape === 'round' ? 10 : (th.shape === 'chamfer' ? 9 : 0), bR = th.shape === 'round' ? 16 : (th.shape === 'chamfer' ? 15 : 0);
    return { up: up, dn: dn, lf: lf, rt: rt, tl: up && lf ? tR : 0, tr: up && rt ? tR : 0, br: dn && rt ? bR : 0, bl: dn && lf ? bR : 0 };
  }
  function shapePath(ctx, th, x, y, w, h, k) {
    ctx.beginPath();
    if (th.shape === 'chamfer') {
      ctx.moveTo(x + k.tl, y); ctx.lineTo(x + w - k.tr, y); ctx.lineTo(x + w, y + k.tr); ctx.lineTo(x + w, y + h - k.br);
      ctx.lineTo(x + w - k.br, y + h); ctx.lineTo(x + k.bl, y + h); ctx.lineTo(x, y + h - k.bl); ctx.lineTo(x, y + k.tl);
    } else {
      ctx.moveTo(x + k.tl, y); ctx.arcTo(x + w, y, x + w, y + h, k.tr); ctx.arcTo(x + w, y + h, x, y + h, k.br);
      ctx.arcTo(x, y + h, x, y, k.bl); ctx.arcTo(x, y, x + w, y, k.tl);
    }
    ctx.closePath();
  }
  function tileOutline(ctx, L, th, c, r) {
    var k = cornerR(L, th, c, r);
    shapePath(ctx, th, c * S, r * S, S, S, k); ctx.fillStyle = th.line; ctx.fill();
  }
  function tile(ctx, L, th, c, r, simple) {
    var k = cornerR(L, th, c, r), x = c * S, y = r * S, i;
    var e = 2.5, ix = x + (k.lf ? e : 0), iy = y + (k.up ? e : 0), iw = S - (k.lf ? e : 0) - (k.rt ? e : 0), ih = S - (k.up ? e : 0) - (k.dn ? e : 0);
    var ik = { tl: Math.max(0, k.tl - 1.5), tr: Math.max(0, k.tr - 1.5), br: Math.max(0, k.br - 1.5), bl: Math.max(0, k.bl - 1.5) };
    ctx.save();
    shapePath(ctx, th, ix, iy, iw, ih, ik); ctx.fillStyle = th.inner; ctx.fill(); ctx.clip();
    if (!simple) {
      var h = hash(c, r);
      if (th.shape === 'round') { // 大圓卵石, 不畫格線
        ctx.fillStyle = th.chip; circle(ctx, x + 12 + h * 14, y + 24 + h * 6, 6 + h * 3); ctx.fill();
        ctx.fillStyle = th.chipHi; circle(ctx, x + 10 + h * 14, y + 22 + h * 6, 2); ctx.fill();
        ctx.fillStyle = th.chip; circle(ctx, x + 32 - h * 6, y + 12 + h * 10, 3.5); ctx.fill();
      } else if (th.shape === 'chamfer') { // 世界座標對齊的水平岩層帶, 帶緣鋸齒
        for (var yy = Math.floor(y / 13) * 13; yy < y + S; yy += 13) {
          var band = Math.floor(yy / 13) % 3;
          ctx.fillStyle = band === 0 ? th.inner : (band === 1 ? th.band2 : th.band3);
          ctx.beginPath(); ctx.moveTo(x, yy);
          for (var zx = 0; zx <= 40; zx += 8) ctx.lineTo(x + zx, yy + (((x + zx) / 8) % 2 ? 2.5 : 0));
          ctx.lineTo(x + 40, yy + 13); ctx.lineTo(x, yy + 13); ctx.closePath(); ctx.fill();
        }
      } else { // 角塊碎岩 + 牆面木襯
        ctx.fillStyle = th.chip;
        poly(ctx, [x + 4, y + 30, x + 12, y + 18, x + 22, y + 30]); ctx.fill();
        poly(ctx, [x + 24, y + 8, x + 36, y + 8, x + 36, y + 20, x + 26, y + 18]); ctx.fill();
        ctx.fillStyle = th.chipHi; ctx.fillRect(x + 24, y + 8, 12, 2);
        if (h > 0.86 && !k.up) { // 半埋晶礦: 藍紫, 和青色時晶分開
          ctx.fillStyle = '#6f7de8'; poly(ctx, [x + 14, y + 36, x + 18, y + 18, x + 22, y + 36]); ctx.fill();
          ctx.fillStyle = '#9aa4ff'; poly(ctx, [x + 22, y + 36, x + 27, y + 24, x + 30, y + 36]); ctx.fill();
        }
        ctx.fillStyle = th.timber;
        if (k.lf && !k.up) ctx.fillRect(ix, y, 7, S);
        if (k.rt && !k.up) ctx.fillRect(ix + iw - 7, y, 7, S);
        if (k.dn) { ctx.fillRect(x, iy + ih - 9, S, 9); ctx.fillStyle = th.timberDark; ctx.fillRect(x, iy + ih - 2, S, 2); ctx.fillRect(x + ((c % 2) ? 30 : 8), iy + ih - 9, 2, 9); }
      }
    }
    // 頂面
    if (k.up) {
      if (th.shape === 'round') {
        ctx.fillStyle = th.cap; ctx.fillRect(x, y, S, simple ? 14 : 10);
        if (!simple) {
          for (i = 0; i < 5; i++) { circle(ctx, x + 4 + i * 8, y + 10, 4); ctx.fill(); } // 扇貝狀苔緣
          ctx.fillStyle = th.capHi; ctx.fillRect(x, y + e, S, 2.5);
          ctx.fillStyle = th.capDark; for (i = 0; i < 5; i++) { circle(ctx, x + 4 + i * 8, y + 13, 1.2); ctx.fill(); }
        }
      } else if (th.shape === 'chamfer') {
        ctx.fillStyle = th.cap;
        if (simple) ctx.fillRect(x, y, S, 14);
        else {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + S, y);
          for (i = 5; i >= 0; i--) ctx.lineTo(x + i * 8, y + ((i % 2) ? 13 : 8));
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = th.capHi; ctx.fillRect(x, y + e, S, 2);
        }
      } else {
        ctx.fillStyle = th.cap; ctx.fillRect(x, y, S, simple ? 14 : 9);
        if (!simple) {
          ctx.fillStyle = th.capHi; ctx.fillRect(x, y + e, S, 2);
          ctx.fillStyle = th.capDark; if (x % 80 === 0) ctx.fillRect(x + 39, y, 1.5, 9);
          ctx.fillRect(x, y + 9, S, 1.5);
        }
      }
    } else if (!simple && th.shape === 'round' && k.dn) {
      ctx.fillStyle = th.chip; for (i = 0; i < 3; i++) { ell(ctx, x + 8 + i * 12, y + S - 2, 4, 5); ctx.fill(); } // 底下的根瘤
    }
    ctx.restore();
  }
  // 森林的浮台 = 橫倒的圓木(兩端圓頭、年輪), 一格高 = 判定高
  function boardwalk(ctx, L, c, r, simple) {
    var x = c * S, y = r * S, lf = at(L, c - 1, r) !== 2, rt = at(L, c + 1, r) !== 2;
    ctx.save();
    var k = { tl: lf ? 20 : 0, bl: lf ? 20 : 0, tr: rt ? 20 : 0, br: rt ? 20 : 0 };
    shapePath(ctx, { shape: 'round' }, x, y, S, S, k); ctx.fillStyle = '#2a1a0e'; ctx.fill();
    shapePath(ctx, { shape: 'round' }, x + (lf ? 2.5 : 0), y + 2.5, S - (lf ? 2.5 : 0) - (rt ? 2.5 : 0), S - 5, { tl: k.tl ? 18 : 0, bl: k.bl ? 18 : 0, tr: k.tr ? 18 : 0, br: k.br ? 18 : 0 });
    ctx.fillStyle = '#6e4a2c'; ctx.fill();
    if (!simple) {
      ctx.save(); ctx.clip();
      ctx.strokeStyle = '#4e321c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x + S, y + 14); ctx.moveTo(x, y + 27); ctx.lineTo(x + S, y + 27); ctx.stroke();
      ctx.fillStyle = '#5cbf45'; ctx.fillRect(x, y, S, 6);
      ctx.restore();
      if (rt) { ctx.fillStyle = '#c79a62'; ell(ctx, x + 26, y + 20, 10, 15); ctx.fill(); ctx.strokeStyle = '#8a6440'; ctx.lineWidth = 1.5; ell(ctx, x + 26, y + 20, 5, 8); ctx.stroke(); }
    }
    ctx.restore();
  }
  function rubble(ctx, L, c, r, simple) {
    var x = c * S, y = r * S;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip();
    rubbleStones(ctx, x, y, simple);
    if (!simple) {
      if (L.theme === 'forest') {
        ctx.strokeStyle = '#7a5130'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.bezierCurveTo(x + 14, y + 18, x + 22, y + 4, x + 40, y + 20); ctx.stroke();
        ctx.fillStyle = '#5cbf45'; circle(ctx, x + 12, y + 4, 5); ctx.fill(); circle(ctx, x + 30, y + 3, 4); ctx.fill();
      } else if (L.theme === 'mine') {
        ctx.fillStyle = '#6b4a2b'; ctx.fillRect(x + 2, y + 2, 36, 7); ctx.fillRect(x + 2, y + 2, 7, 36);
        ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y + 2, 36, 7); ctx.strokeRect(x + 2, y + 2, 7, 36);
      }
    }
    ctx.restore();
  }
  function bridge(ctx, L, simple) {
    var b = L.bridge, r = b[0], y = r * S;
    ctx.save();
    for (var c = b[1]; c <= b[2]; c++) {
      var x = c * S, end = (c === b[1] || c === b[2]), dir = c === b[1] ? 1 : -1;
      if (end) {
        ctx.fillStyle = '#7a4f2a'; poly(ctx, [x + (dir > 0 ? 4 : 28), y + 40, x + (dir > 0 ? 4 : 28), y - 10, x + (dir > 0 ? 8 : 32), y - 16, x + (dir > 0 ? 12 : 36), y - 10, x + (dir > 0 ? 12 : 36), y + 40]); ctx.fill();
        ctx.fillStyle = '#c99a5e'; ctx.fillRect(x + 2, y, 36, 8);
        if (!simple) {
          ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y, 36, 8);
          ctx.strokeStyle = '#d8c39a'; ctx.lineWidth = 2;
          var ox = dir > 0 ? x + 38 : x + 2;
          ctx.beginPath(); ctx.moveTo(ox, y + 4); ctx.lineTo(ox + dir * 9, y + 28); ctx.lineTo(ox + dir * 4, y + 50); ctx.stroke();
          ctx.save(); ctx.translate(ox + dir * 5, y + 44); ctx.rotate(dir * 1.2); ctx.fillStyle = '#c99a5e'; ctx.fillRect(-10, -3, 20, 6); ctx.restore();
        }
      } else if (!simple) {
        ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(216,195,154,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 40, y + 2); ctx.moveTo(x, y + 9); ctx.lineTo(x + 40, y + 9); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  function deco(ctx, L, th, simple) {
    var c, r;
    if (L.theme === 'forest' && !simple) {
      for (r = 1; r < ROWS - 1; r++) for (c = 0; c < COLS; c++) {
        if (at(L, c, r) === 1 && !solid(L, c, r + 1) && hash(c, r) > 0.45) {
          var x = c * S + 10 + hash(r, c) * 20, len = 18 + hash(c + 3, r) * 34, y = (r + 1) * S;
          ctx.strokeStyle = '#3f8a33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y + len / 2, x, y + len); ctx.stroke();
          ctx.fillStyle = '#5cbf45'; circle(ctx, x + 2, y + len * 0.5, 3); ctx.fill(); circle(ctx, x, y + len, 3.5); ctx.fill();
        }
      }
    } else if (L.theme === 'cliff' && !simple) {
      ctx.strokeStyle = '#b9c79a'; ctx.lineWidth = 1.5;
      for (c = 0; c < COLS; c++) for (r = 1; r < ROWS; r++) {
        if (at(L, c, r) === 1 && !solid(L, c, r - 1) && hash(c, r) > 0.55) {
          var gx = c * S + 8 + hash(r, c) * 20, gy = r * S;
          for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 4, gy); ctx.lineTo(gx + k * 4 + 3, gy - 7); ctx.lineTo(gx + k * 4 + 10, gy - 10); ctx.stroke(); }
        }
      }
    } else if (L.theme === 'mine') {
      for (r = 1; r < ROWS; r++) for (c = 0; c < COLS; c++) {
        if (at(L, c, r) === 1 && !solid(L, c, r - 1) && r >= 12) {
          var tx = c * S, ty = r * S;
          if (!simple) { ctx.fillStyle = '#2a1c10'; for (var q = 0; q < 4; q++) ctx.fillRect(tx + 2 + q * 10, ty, 6, 4); }
          ctx.fillStyle = '#a9afb8'; ctx.fillRect(tx, ty - 1, S, simple ? 4 : 2);
        }
      }
      (L.lamps || []).forEach(function (lp) {
        var lx = lp[0], ly = lp[1];
        ctx.strokeStyle = '#2a201a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 40); ctx.stroke();
        if (!simple) { var lg = ctx.createRadialGradient(lx, ly + 50, 4, lx, ly + 50, 120); lg.addColorStop(0, 'rgba(255,190,100,0.38)'); lg.addColorStop(1, 'rgba(255,190,100,0)'); ctx.fillStyle = lg; ctx.fillRect(lx - 120, ly - 70, 240, 240); }
        ctx.fillStyle = '#ffcf7a'; ctx.fillRect(lx - (simple ? 9 : 6), ly + 44, simple ? 18 : 12, simple ? 18 : 12);
        if (!simple) { ctx.fillStyle = '#3a2c20'; ctx.fillRect(lx - 9, ly + 38, 18, 5); }
      });
    }
  }

  // ---------- 迷霧: 不透明灰底 + 霧團; 霧團形狀跟主題造型語言(圓團 / 橫雲帶 / 方塵塊) ----------
  function fog(ctx, L, th, t, simple) {
    (L.fog || []).forEach(function (f) {
      var x = f[0], y = f[1], w = f[2], h = f[3];
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = th.fog; ctx.fillRect(x, y, w, h);
      if (!simple) {
        for (var gx = Math.floor(x / 80) - 1; gx <= Math.ceil((x + w) / 80) + 1; gx++) {
          for (var gy = Math.floor(y / 40) - 1; gy <= Math.ceil((y + h) / 40) + 1; gy++) {
            var hv = hash(gx, gy), cx = gx * 80 + 40 + Math.sin(t * 0.35 + hv * 6.28) * 16, cy = gy * 40 + 20;
            ctx.fillStyle = (gx + gy) % 2 ? th.fogA : th.fogB;
            if (th.shape === 'round') { circle(ctx, cx, cy, 26 + hv * 12); ctx.fill(); }
            else if (th.shape === 'chamfer') { ell(ctx, cx, cy, 70 + hv * 20, 11 + hv * 4); ctx.fill(); }
            else { rr(ctx, cx - 26, cy - 16, 52 + hv * 10, 30, 5); ctx.fill(); }
          }
        }
      }
      ctx.restore();
    });
  }

  function scene(ctx, L, t, simple) {
    build(L);
    var th = TH[L.theme], c, r;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    background(ctx, L, th, simple);
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) if (L.grid[r][c] === 1) tileOutline(ctx, L, th, c, r);
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
    element: 'themes', id: 'B', kind: 'static',
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
