/* 通關動畫 方案 A — 八關點燈・素材歸倉(大地圖俯視, 接力節拍)
 * 演出: 第 8 關卡片閃白(Boss 倒下)→ 光沿連線往回接力, 每 0.5 秒點亮一層關卡卡片 → 8 張卡同時往右側倉庫噴素材,
 * 噴的頻率越來越快、倉庫門內的素材堆越堆越高 → 倉庫發光升旗 → 地圖壓暗, 底部升起木板結算(通關時間、擊倒數、四種總收成)。
 * 構圖照遊戲大地圖的樹狀版位(王城那格換成倉庫, 呼應開始畫面 B 的中央倉庫), 節奏是一拍一拍往回點燈, 再轉成連續湧入。
 * 主角幾何照 options/hero-A.js 縮圖記號; 素材圖示照底版 art.js 內部 matIcon 複製(未匯出); 面板 / 羊皮紙 / 石鍵帽照 options/ui-A.js 複製。
 * 動態完全由 t 決定; 長 13 秒, 9.2 秒後是可停留的結算畫面。
 */
(function () {
  'use strict';
  var A = window.Art || {};
  var PAL = A.palette || {};
  function C(k, d) { return PAL[k] || d; }
  var TAU = Math.PI * 2, W = 1280, H = 720, DUR = 13;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  // ---------- 小工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(x) { return x * x * (3 - 2 * x); }
  function eOut(x) { return 1 - Math.pow(1 - x, 3); }
  function eBack(x) { var c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function star(ctx, x, y, r, n) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = (i % 2) ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || 'rgba(20,12,6,0.95)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  function grp(n) { n = Math.round(n); var s = String(n); return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ---------- 素材圖示(照底版 art.js matIcon 複製; 搬回遊戲時改呼叫遊戲版) ----------
  function matIcon(ctx, kind, cx, cy, sz) {
    var k = sz / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1420';
    if (kind === 'wood') {
      rr(ctx, -9, -5, 15, 10, 3); ctx.fillStyle = C('wood', '#c97e3a'); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -1.6); ctx.lineTo(1, -1.6); ctx.moveTo(-4, 2); ctx.lineTo(2, 2); ctx.strokeStyle = C('woodDark', '#7a4a1e'); ctx.lineWidth = 1; ctx.stroke();
      ell(ctx, 5.5, 0, 3.6, 5); ctx.fillStyle = C('woodLight', '#efc07f'); ctx.fill(); ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.6; ctx.stroke();
      ell(ctx, 5.5, 0, 1.4, 2.2); ctx.strokeStyle = C('woodDark', '#7a4a1e'); ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'stone') {
      poly(ctx, [-8, 3, -5, -6, 4, -8, 9, -2, 7, 6, -3, 8]); ctx.fillStyle = C('stone', '#a3adb8'); ctx.fill(); ctx.stroke();
      poly(ctx, [-5, -6, 4, -8, 9, -2, 1, -1]); ctx.fillStyle = C('stoneLight', '#d5dbe2'); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -1); ctx.lineTo(-3, 8); ctx.strokeStyle = C('stoneDark', '#5e6874'); ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'time') {
      poly(ctx, [0, -9.5, 7, -2, 0, 9.5, -7, -2]); ctx.fillStyle = C('time', '#3fd6ea'); ctx.fill(); ctx.stroke();
      poly(ctx, [0, -9.5, 3, -2, 0, 9.5, -3, -2]); ctx.fillStyle = C('timeLight', '#b6f4fb'); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.strokeStyle = C('timeDark', '#1a8ea2'); ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -9.5);
      ctx.bezierCurveTo(4, -4, 8, -1, 7, 4); ctx.bezierCurveTo(6, 8.5, -6, 8.5, -7, 4); ctx.bezierCurveTo(-8, -1, -3, -3, 0, -9.5); ctx.closePath();
      ctx.fillStyle = C('soul', '#e65ad4'); ctx.fill(); ctx.stroke();
      ell(ctx, 0, 3.5, 3.6, 3.2); ctx.fillStyle = C('soulLight', '#ffb6f2'); ctx.fill();
      circle(ctx, -1.6, 3, 0.9); ctx.fillStyle = '#3a0f34'; ctx.fill(); circle(ctx, 1.6, 3, 0.9); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 主角縮圖記號(照 hero-A thumb: 劍士盾形 / 獵人三角 / 炸彈工圓) ----------
  var CLS_COL = { sword: C('sword', '#3d8bfd'), hunter: C('hunter', '#1fbf9a'), bomber: C('bomber', '#f28c28') };
  function thumb(ctx, cls, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.lineJoin = 'round';
    if (cls === 'sword') poly(ctx, [-4.5, -9.5, 4.5, -9.5, 4.5, -4.5, 0, 0, -4.5, -4.5]);
    else if (cls === 'hunter') poly(ctx, [0, -10.5, 5, 0, -5, 0]);
    else circle(ctx, 0, -4.8, 4.8);
    ctx.fillStyle = CLS_COL[cls] || '#3d8bfd'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }

  // ---------- 介面零件(照 ui-A: 木板 + 羊皮紙 + 石鍵帽) ----------
  var K = {
    board: '#3a2a1f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a',
    parch: '#efe3c6', ink: '#2b2118', inkDim: '#76664e', gold: '#ffd84a', goldDeep: '#b8860b', creamText: '#f3e6c8'
  };
  function board(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = K.board; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { circle(ctx, n[i][0], n[i][1], 2.6); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke(); }
    ctx.restore();
  }
  function tag(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = K.parch; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.stroke();
  }
  function key(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.7, tw(ctx, label, px, true) + px * 0.9), h = px * 1.6;
    rr(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 4); ctx.fillStyle = hot ? K.goldDeep : '#8f8471'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.fillStyle = hot ? K.gold : '#ece4d2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, label, cx, cy + 0.5, px, K.ink, 'center', true);
    return w;
  }
  function anyKeyHint(ctx, cx, cy, px, a) {
    ctx.save(); ctx.globalAlpha *= a;
    var s = '回大地圖繼續玩', kw = Math.max(px * 1.7, tw(ctx, '任意鍵', px, true) + px * 0.9), sw = tw(ctx, s, px, true);
    var x0 = cx - (kw + 8 + sw) / 2;
    key(ctx, '任意鍵', x0 + kw / 2, cy, px, true);
    text(ctx, s, x0 + kw + 8, cy, px, K.creamText, 'left', true, 3, K.edge);
    ctx.restore();
  }

  // ---------- 場景資料 ----------
  var TH = {
    forest: { sky: ['#5b8fc0', '#2f5d4a'], top: '#63c35a', inner: '#6b4a2c', deco: '#2f7a3a' },
    cliff: { sky: ['#a9c6ea', '#5a6f96'], top: '#e3eaf2', inner: '#7d8ca5', deco: '#c9d3df' },
    mine: { sky: ['#2c2440', '#141020'], top: '#8a7a5a', inner: '#3a2e24', deco: '#3fd6ea' }
  };
  var CW = 150, CH = 104;
  // 照遊戲大地圖版位(卡片左上 + 卡片半寬高), 王城那格改成倉庫
  var CARDS = [
    null,
    { x: 128, y: 349, th: 'forest', cls: 'sword' },
    { x: 378, y: 199, th: 'forest', cls: 'hunter' },
    { x: 378, y: 499, th: 'forest', cls: 'bomber' },
    { x: 628, y: 124, th: 'cliff', cls: 'hunter' },
    { x: 628, y: 274, th: 'cliff', cls: 'sword' },
    { x: 628, y: 424, th: 'mine', cls: 'bomber' },
    { x: 628, y: 574, th: 'mine', cls: 'sword' },
    { x: 878, y: 349, th: 'cliff', cls: 'hunter' }
  ];
  var LINKS = [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [6, 8]];
  // 點燈時刻: 從第 8 關往回一層一層接力, 每層 0.5 秒
  var LIT = [0, 2.5, 2.0, 2.0, 2.5, 1.5, 1.5, 2.5, 1.0];
  var WH = { x: 1112, y: 360, door: [1112, 420] };
  var WH_LINK_T = 2.9;
  var MATS = { forest: ['wood', 'wood', 'soul', 'stone'], cliff: ['stone', 'time', 'stone', 'soul'], mine: ['time', 'stone', 'soul', 'time'] };
  var FLY = 0.9, STREAM0 = 3.2;
  // 預先排好每張卡的噴出時刻: 頻率由每秒 1.4 顆漸增到 4.2 顆(越賺越快)
  var EMITS = [];
  (function () {
    for (var i = 1; i <= 8; i++) {
      var te = STREAM0 + i * 0.09, k = 0;
      while (te < DUR) {
        EMITS.push({ i: i, t: te, kind: MATS[CARDS[i].th][k % 4], wob: hash(i, k) });
        var rate = 1.4 + 2.8 * ease(seg(te, STREAM0, 7.6));
        te += 1 / rate; k++;
      }
    }
  })();
  var TOTAL_ARRIVE_BY = 9.0;
  var ARRIVE_TOTAL = 0;
  for (var e = 0; e < EMITS.length; e++) if (EMITS[e].t + FLY <= TOTAL_ARRIVE_BY) ARRIVE_TOTAL++;

  // ---------- 背景: 大地圖底 ----------
  function backdrop(ctx, t) {
    ctx.fillStyle = C('mapBg', '#15242a'); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C('mapLine', '#1e3238'); ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (var y = 0; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    // 整張地圖亮度: 點燈後逐步暖起來
    var warm = ease(seg(t, 1.0, 3.2));
    if (warm > 0) {
      var g = ctx.createRadialGradient(WH.x - 200, H / 2, 60, WH.x - 200, H / 2, 900);
      g.addColorStop(0, 'rgba(255,200,90,' + (0.16 * warm).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- 連線 ----------
  function linkPts(a, b) {
    var p = CARDS[a], q = CARDS[b];
    var x1 = p.x + CW / 2, y1 = p.y, x2 = q.x - CW / 2, y2 = q.y, mx = (x1 + x2) / 2;
    var pts = [];
    for (var i = 0; i <= 24; i++) {
      var u = i / 24, v = 1 - u;
      pts.push([v * v * v * x1 + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * x2, v * v * v * y1 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y2]);
    }
    return pts;
  }
  function strokePts(ctx, pts, u0, u1) {
    var n = pts.length - 1, i0 = Math.floor(u0 * n), i1 = Math.ceil(u1 * n);
    if (i1 <= i0) return;
    ctx.beginPath(); ctx.moveTo(pts[i0][0], pts[i0][1]);
    for (var i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function links(ctx, t) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var k = 0; k < LINKS.length; k++) {
      var a = LINKS[k][0], b = LINKS[k][1], pts = linkPts(a, b);
      ctx.setLineDash([6, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(150,160,175,0.45)'; strokePts(ctx, pts, 0, 1); ctx.setLineDash([]);
      // 光從先亮的那張往後亮的那張走(本作是往左回溯)
      var fromB = LIT[b] < LIT[a], t0 = Math.min(LIT[a], LIT[b]), u = eOut(seg(t, t0, t0 + 0.5));
      if (u <= 0) continue;
      var lo = fromB ? 1 - u : 0, hi = fromB ? 1 : u;
      ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,214,90,0.22)'; strokePts(ctx, pts, lo, hi);
      ctx.lineWidth = 5; ctx.strokeStyle = C('gold', '#f2c94c'); strokePts(ctx, pts, lo, hi);
      if (u < 1) {
        var hp = pts[Math.round((fromB ? 1 - u : u) * (pts.length - 1))];
        var hg = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 22);
        hg.addColorStop(0, 'rgba(255,250,220,1)'); hg.addColorStop(1, 'rgba(255,214,90,0)');
        ctx.fillStyle = hg; circle(ctx, hp[0], hp[1], 22); ctx.fill();
      }
    }
    // 第 8 關 → 倉庫
    var p8 = CARDS[8], x1 = p8.x + CW / 2, x2 = WH.x - 118;
    ctx.setLineDash([6, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(150,160,175,0.45)';
    ctx.beginPath(); ctx.moveTo(x1, p8.y); ctx.lineTo(x2, p8.y); ctx.stroke(); ctx.setLineDash([]);
    var uw = eOut(seg(t, WH_LINK_T, WH_LINK_T + 0.35));
    if (uw > 0) {
      ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,214,90,0.22)'; ctx.beginPath(); ctx.moveTo(x1, p8.y); ctx.lineTo(x1 + (x2 - x1) * uw, p8.y); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = C('gold', '#f2c94c'); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 關卡卡片 ----------
  function card(ctx, i, t) {
    var c = CARDS[i], th = TH[c.th], lt = LIT[i];
    var on = t >= lt, since = t - lt;
    var bump = on && since < 0.35 ? 1 + 0.14 * Math.sin(Math.PI * since / 0.35) : 1;
    var x = -CW / 2, y = -CH / 2;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(bump, bump);
    if (on) {
      var gl = 0.35 + 0.25 * Math.sin((t - lt) * TAU * 0.8);
      var g = ctx.createRadialGradient(0, 0, 40, 0, 0, 130);
      g.addColorStop(0, 'rgba(255,214,90,' + (gl * 0.6).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = g; ctx.fillRect(-130, -130, 260, 260);
    }
    // 卡底: 木板
    rr(ctx, x, y, CW, CH, 8); ctx.fillStyle = K.board; ctx.fill();
    // 縮圖
    var ix = x + 8, iy = y + 8, iw = CW - 16, ih = 64;
    ctx.save(); rr(ctx, ix, iy, iw, ih, 4); ctx.clip();
    var sg = ctx.createLinearGradient(0, iy, 0, iy + ih); sg.addColorStop(0, th.sky[0]); sg.addColorStop(1, th.sky[1]);
    ctx.fillStyle = sg; ctx.fillRect(ix, iy, iw, ih);
    if (c.th === 'forest') { for (var k = 0; k < 4; k++) { var tx = ix + 14 + k * 36 + (i * 7 % 13); poly(ctx, [tx, iy + 18, tx + 11, iy + 48, tx - 11, iy + 48]); ctx.fillStyle = th.deco; ctx.fill(); } }
    else if (c.th === 'cliff') { for (k = 0; k < 3; k++) { var px = ix + 20 + k * 48 + (i * 11 % 17); ctx.fillStyle = '#8a9ab8'; ctx.fillRect(px, iy + 22 + (k % 2) * 8, 16, 40); ctx.fillStyle = th.deco; ctx.fillRect(px, iy + 22 + (k % 2) * 8, 16, 4); } }
    else { for (k = 0; k < 5; k++) { var cx2 = ix + 12 + k * 28, cy2 = iy + 14 + (k % 3) * 9; poly(ctx, [cx2, cy2 - 5, cx2 + 3, cy2, cx2, cy2 + 5, cx2 - 3, cy2]); ctx.fillStyle = th.deco; ctx.fill(); } ctx.fillStyle = '#5a4630'; ctx.fillRect(ix + 30, iy + 20, 4, 30); ctx.fillRect(ix + 96, iy + 20, 4, 30); ctx.fillRect(ix + 26, iy + 20, 78, 4); }
    ctx.fillStyle = th.inner; ctx.fillRect(ix, iy + ih - 14, iw, 14); ctx.fillStyle = th.top; ctx.fillRect(ix, iy + ih - 14, iw, 4);
    // 縮圖裡的職業記號: 持續左右跑(這關一直在重演)
    var run = ((t * 0.45 + i * 0.37) % 1);
    thumb(ctx, c.cls, ix + 10 + run * (iw - 20), iy + ih - 14, 1.3);
    if (!on) { ctx.fillStyle = 'rgba(8,12,18,0.62)'; ctx.fillRect(ix, iy, iw, ih); }
    if (on && since < 0.5) { ctx.fillStyle = 'rgba(255,248,220,' + (0.8 * (1 - since / 0.5)).toFixed(3) + ')'; ctx.fillRect(ix, iy, iw, ih); }
    ctx.restore();
    // 第二行: 羊皮紙關卡名
    tag(ctx, x + 8, y + 76, CW - 16, 22);
    text(ctx, '第 ' + i + ' 關', x + 16, y + 87, 13, K.ink, 'left', true);
    text(ctx, i === 8 ? '最終' : '重演中', x + CW - 16, y + 87, 12, on ? '#2f8f55' : K.inkDim, 'right', true);
    // 外框: 暗 = 深木邊, 亮 = 金色粗框 + 右上金星章
    rr(ctx, x + 1.5, y + 1.5, CW - 3, CH - 3, 8); ctx.lineWidth = on ? 4 : 3; ctx.strokeStyle = on ? K.gold : K.edge; ctx.stroke();
    if (on) {
      var sk = eBack(seg(t, lt, lt + 0.4));
      ctx.save(); ctx.translate(x + CW - 6, y + 6); ctx.scale(sk, sk);
      circle(ctx, 0, 0, 13); ctx.fillStyle = K.edge; ctx.fill();
      star(ctx, 0, 0, 10, 5); ctx.fillStyle = K.gold; ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // 第 8 關: Boss 倒下的閃白衝擊環
    if (i === 8) {
      var b = seg(t, 0.2, 1.3);
      if (b > 0 && b < 1) {
        ctx.save();
        circle(ctx, c.x, c.y, 40 + 360 * eOut(b)); ctx.lineWidth = 14 * (1 - b) + 2; ctx.strokeStyle = 'rgba(255,248,220,' + (0.9 * (1 - b)).toFixed(3) + ')'; ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ---------- 倉庫 ----------
  function arrivedCount(t) {
    var n = 0, last = -9;
    for (var k = 0; k < EMITS.length; k++) { var ta = EMITS[k].t + FLY; if (ta <= t) { n++; if (ta > last) last = ta; } }
    return { n: n, last: last };
  }
  function warehouse(ctx, t) {
    var ar = arrivedCount(t), since = t - ar.last;
    var bump = since < 0.12 ? 1 + 0.025 * (1 - since / 0.12) : 1;
    var fill = clamp(ar.n / Math.max(1, ARRIVE_TOTAL), 0, 1);
    var glow = ease(seg(t, 8.0, 9.0));
    var x = WH.x, y = WH.y;
    ctx.save(); ctx.translate(x, y + 110); ctx.scale(bump, 1 / bump); ctx.translate(-x, -(y + 110));
    // 光暈
    var gg = ctx.createRadialGradient(x, y + 30, 30, x, y + 30, 230);
    gg.addColorStop(0, 'rgba(255,214,90,' + (0.12 + 0.4 * glow + 0.2 * fill).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - 240, y - 220, 480, 460);
    // 光束(結尾)
    if (glow > 0) {
      ctx.fillStyle = 'rgba(255,230,150,' + (0.16 * glow).toFixed(3) + ')';
      for (var r = 0; r < 5; r++) { var a = -Math.PI / 2 + (r - 2) * 0.32; poly(ctx, [x, y - 40, x + Math.cos(a - 0.08) * 520, y - 40 + Math.sin(a - 0.08) * 520, x + Math.cos(a + 0.08) * 520, y - 40 + Math.sin(a + 0.08) * 520]); ctx.fill(); }
    }
    ctx.lineJoin = 'round';
    // 石基
    ctx.fillStyle = C('stoneDark', '#5e6874'); ctx.fillRect(x - 118, y + 96, 236, 18);
    ctx.strokeStyle = K.edge; ctx.lineWidth = 3; ctx.strokeRect(x - 118, y + 96, 236, 18);
    // 牆: 木板
    ctx.fillStyle = '#7a5232'; ctx.fillRect(x - 104, y - 30, 208, 126);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (var px = x - 104 + 26; px < x + 104; px += 26) ctx.fillRect(px, y - 30, 2, 126);
    ctx.strokeRect(x - 104, y - 30, 208, 126);
    // 屋頂
    poly(ctx, [x - 128, y - 26, x, y - 112, x + 128, y - 26]); ctx.fillStyle = '#8a3b2a'; ctx.fill(); ctx.stroke();
    poly(ctx, [x - 128, y - 26, x, y - 112, x + 128, y - 26, x + 116, y - 26, x, y - 98, x - 116, y - 26]); ctx.fillStyle = '#a84c34'; ctx.fill();
    // 山牆圓窗: 一枚放大的素材標誌(四色)
    circle(ctx, x, y - 54, 18); ctx.fillStyle = '#2a1d14'; ctx.fill(); ctx.stroke();
    var km = ['wood', 'stone', 'time', 'soul'];
    for (var q = 0; q < 4; q++) { var qa = q * TAU / 4 + t * 0.6 * glow; matIcon(ctx, km[q], x + Math.cos(qa) * 8, y - 54 + Math.sin(qa) * 8, 10); }
    // 大門洞(開著), 內部素材堆依抵達數升高
    var dx = x - 52, dy = y + 4, dw = 104, dh = 92;
    ctx.fillStyle = '#1a120c'; ctx.fillRect(dx, dy, dw, dh);
    ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip();
    var ig = ctx.createLinearGradient(0, dy + dh, 0, dy); ig.addColorStop(0, 'rgba(255,214,90,' + (0.25 + 0.5 * fill).toFixed(3) + ')'); ig.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = ig; ctx.fillRect(dx, dy, dw, dh);
    var rows = Math.floor(fill * 5.99);
    for (var rw = 0; rw <= rows && rw < 6; rw++) {
      var per = 6 - (rw % 2), part = rw === rows ? (fill * 5.99 - rows) : 1, cnt = Math.ceil(per * part);
      for (var c2 = 0; c2 < cnt; c2++) matIcon(ctx, km[(rw * 3 + c2) % 4], dx + 12 + (rw % 2) * 8 + c2 * 17, dy + dh - 9 - rw * 14, 18);
    }
    ctx.restore();
    ctx.strokeRect(dx, dy, dw, dh);
    // 兩扇門板向外打開
    poly(ctx, [dx, dy, dx - 22, dy + 8, dx - 22, dy + dh, dx, dy + dh]); ctx.fillStyle = '#9a6a3e'; ctx.fill(); ctx.stroke();
    poly(ctx, [dx + dw, dy, dx + dw + 22, dy + 8, dx + dw + 22, dy + dh, dx + dw, dy + dh]); ctx.fill(); ctx.stroke();
    // 屋頂旗: 結尾升起
    var fl = eOut(seg(t, 8.2, 9.0));
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x - 1.5, y - 150, 3, 40);
    if (fl > 0) {
      var fy = y - 112 - 34 * fl, wv = Math.sin(t * TAU * 1.2) * 3;
      poly(ctx, [x + 1.5, fy, x + 30, fy + 6 + wv, x + 1.5, fy + 14]); ctx.fillStyle = K.gold; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 飛行素材 ----------
  function flyers(ctx, t) {
    var tx = WH.door[0], ty = WH.door[1];
    for (var k = 0; k < EMITS.length; k++) {
      var em = EMITS[k], d = t - em.t;
      if (d < 0 || d >= FLY) continue;
      var c = CARDS[em.i], sx = c.x, sy = c.y - 20;
      var mx = (sx + tx) / 2 + (em.wob - 0.5) * 120, my = Math.min(sy, ty) - 90 - em.wob * 80;
      var col = C(em.kind, '#ffffff');
      for (var tr = 3; tr >= 0; tr--) {
        var u = clamp(d / FLY - tr * 0.045, 0, 1), uu = u * u * (3 - 2 * u) * 0.35 + u * 0.65, v = 1 - uu;
        var px = v * v * sx + 2 * v * uu * mx + uu * uu * tx, py = v * v * sy + 2 * v * uu * my + uu * uu * ty;
        if (tr > 0) { ctx.globalAlpha = 0.14 + (3 - tr) * 0.1; circle(ctx, px, py, 2.5 + (3 - tr) * 1.2); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; }
        else matIcon(ctx, em.kind, px, py, 20);
      }
    }
  }

  // ---------- 結算板 ----------
  var STAT = { time: '1:12:48', kills: 1284, mats: [['wood', 3420], ['stone', 1910], ['time', 655], ['soul', 1288]] };
  function resultBoard(ctx, t) {
    var a = seg(t, 9.2, 9.8);
    if (a <= 0) return;
    var bx = 300, bw = 680, bh = 236, by = H - bh - 22 + (1 - eOut(a)) * 280;
    ctx.save();
    board(ctx, bx, by, bw, bh);
    var cnt = eOut(seg(t, 9.6, 10.8));
    text(ctx, '最終 Boss 擊倒 ・ 8 關全數重演中', bx + bw / 2, by + 30, 18, K.creamText, 'center', true, 4, K.edge);
    tag(ctx, bx + 24, by + 52, 300, 96);
    text(ctx, '通關時間', bx + 44, by + 74, 16, K.inkDim, 'left', true);
    text(ctx, STAT.time, bx + 174, by + 114, 46, K.ink, 'center', true);
    tag(ctx, bx + 338, by + 52, 318, 40);
    thumb(ctx, 'sword', bx + 358, by + 82, 1.6); thumb(ctx, 'hunter', bx + 382, by + 82, 1.6); thumb(ctx, 'bomber', bx + 406, by + 75, 1.6);
    text(ctx, '打倒怪物', bx + 428, by + 72, 15, K.inkDim, 'left', true);
    text(ctx, grp(STAT.kills * cnt), bx + 642, by + 72, 22, K.ink, 'right', true);
    tag(ctx, bx + 338, by + 100, 318, 48);
    text(ctx, '總收成', bx + 350, by + 113, 12, K.inkDim, 'left', true);
    for (var i = 0; i < 4; i++) {
      var mx = bx + 360 + i * 76;
      matIcon(ctx, STAT.mats[i][0], mx, by + 133, 18);
      text(ctx, grp(STAT.mats[i][1] * cnt), mx + 12, by + 134, 14, K.ink, 'left', true);
    }
    var pulse = 0.7 + 0.3 * Math.cos((t - 10.8) * TAU * 0.8);
    anyKeyHint(ctx, bx + bw / 2, by + 192, 18, seg(t, 10.8, 11.2) * pulse);
    ctx.restore();
  }

  function draw(ctx, t) {
    t = clamp(Number(t) || 0, 0, DUR);
    ctx.save();
    backdrop(ctx, t);
    links(ctx, t);
    for (var i = 1; i <= 8; i++) card(ctx, i, t);
    warehouse(ctx, t);
    flyers(ctx, t);
    // 結算前壓暗地圖(倉庫保留亮)
    var dim = ease(seg(t, 9.0, 9.8));
    if (dim > 0) {
      ctx.fillStyle = 'rgba(6,10,14,' + (0.55 * dim).toFixed(3) + ')';
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(WH.x, WH.y + 10, 150, 0, TAU, true); ctx.fill();
    }
    resultBoard(ctx, t);
    // 開場: 從 Boss 戰白光淡入
    var fi = 1 - seg(t, 0, 0.5);
    if (fi > 0) { ctx.fillStyle = 'rgba(255,250,235,' + fi.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'ending', id: 'A', kind: 'anim',
    size: [1280, 720],
    duration: DUR,
    loop: true,
    draw: draw
  };
})();
