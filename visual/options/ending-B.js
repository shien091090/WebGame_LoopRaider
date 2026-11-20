/* 通關動畫 方案 B — 高崖日出(側視電影鏡頭, 慢節奏色溫轉換)
 * 演出: 風蝕高崖的黎明前, 三職業從左跑進崖頂停在崖邊 → 太陽從雲海後升起, 天色由深藍轉金、三人背後拉出長影 →
 * 三人輪流歡呼(劍士跳起、獵人朝天射一箭化成金星、炸彈工拋炸彈炸成四色素材煙火)→ 崖下山谷沿小路由遠到近亮起 8 盞關卡燈,
 * 小路盡頭的倉庫亮起 → 頂端展開羊皮紙卷軸結算(通關時間、擊倒數、四種總收成)。
 * 構圖是側視橫幅, 角色站在畫面左中, 右側留給日出與山谷; 動態是連續的色溫漸變, 只有歡呼段有快拍。
 * 主角畫法照 options/hero-A.js 複製(加了跑步擺腿); 素材圖示照底版 art.js 內部 matIcon 複製; 卷軸 / 鍵帽照 options/ui-A.js 材質。
 * 動態完全由 t 決定; 長 14 秒, 10.4 秒後是可停留的結算畫面。
 */
(function () {
  'use strict';
  var A = window.Art || {};
  var PAL = A.palette || {};
  function C(k, d) { return PAL[k] || d; }
  var TAU = Math.PI * 2, W = 1280, H = 720, DUR = 14;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  // ---------- 小工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(x) { return x * x * (3 - 2 * x); }
  function eOut(x) { return 1 - Math.pow(1 - x, 3); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(a, b, u) { var p = hex(a), q = hex(b); return 'rgb(' + Math.round(p[0] + (q[0] - p[0]) * u) + ',' + Math.round(p[1] + (q[1] - p[1]) * u) + ',' + Math.round(p[2] + (q[2] - p[2]) * u) + ')'; }
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
  function grp(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

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

  // ---------- 主角(照 hero-A 複製; 加 legPh 擺腿) ----------
  var HC = {
    sword: C('sword', '#3d8bfd'), hunter: C('hunter', '#1fbf9a'), bomber: C('bomber', '#f28c28'),
    skin: '#f4d2b0', line: C('outlineHero', '#ffffff'), ink: '#1a1420', pants: '#2b3245',
    gold: C('gold', '#f2c94c'), metal: '#e8eef6', wood: '#8a5a2a', bomb: C('bomb', '#2a2a33'), spark: C('goal', '#ffd23f'),
    lens: C('timeLight', '#b6f4fb'), cape: '#d8434e', hood: '#0f2a24', eye: '#d8fff0'
  };
  function fs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.stroke(); } }
  function legs(ctx, top, ph) {
    var s = Math.sin(ph) * 3;
    ctx.fillStyle = HC.pants;
    rr(ctx, -7 + s, top, 5, 20 - top, 1.5); ctx.fill(); rr(ctx, 2 - s, top, 5, 20 - top, 1.5); ctx.fill();
  }
  // 原點 = 判定框中心, 判定框 28×40; f = 面向; legPh = 擺腿相位(站立傳 0)
  function hero(ctx, cls, f, legPh, holdBomb) {
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      poly(ctx, [-4, -6, -13, 15, -5, 17, 2, -4]); fs(ctx, HC.cape, 0);
      legs(ctx, 13, legPh);
      poly(ctx, [-13, -6, 13, -6, 7, 14, -7, 14]); fs(ctx, HC.sword, 2);
      ctx.fillStyle = HC.gold; ctx.fillRect(-7, 8, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [-2, -4, 2, -4, 0, 4]); ctx.fill();
      poly(ctx, [-8, -13, -15, -19, -12, -11]); fs(ctx, HC.gold, 0);
      rr(ctx, -8, -20, 16, 14, 3); fs(ctx, HC.sword, 2);
      ctx.fillStyle = HC.ink; ctx.fillRect(-1, -15, 8, 3);
      poly(ctx, [10, -19, 12, -22, 14, -19, 14, -3, 10, -3]); fs(ctx, HC.metal, 0);
      ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
      ctx.fillStyle = HC.gold; ctx.fillRect(7, -3.5, 10, 3);
      ctx.fillStyle = HC.wood; ctx.fillRect(11, -0.5, 2, 5);
      circle(ctx, 12, 3, 2.6); fs(ctx, HC.skin, 0);
    } else if (cls === 'hunter') {
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(-0.35);
      ctx.fillStyle = HC.wood; ctx.fillRect(-3, -6, 6, 14);
      ctx.fillStyle = HC.eye; poly(ctx, [-3, -6, -1, -12, 1, -6]); ctx.fill(); poly(ctx, [0, -6, 2.5, -11, 3.5, -6]); ctx.fill();
      ctx.restore();
      legs(ctx, 14, legPh);
      poly(ctx, [0, -20, 13, 15, -13, 15]); fs(ctx, HC.hunter, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [0, -20, -13, 15, -5, 15]); ctx.fill();
      poly(ctx, [-1, -13, 7, -9, 6, -4, -3, -4]); ctx.fillStyle = HC.hood; ctx.fill();
      circle(ctx, 2, -8, 1.3); ctx.fillStyle = HC.eye; ctx.fill(); circle(ctx, 5, -7.6, 1.3); ctx.fill();
      circle(ctx, 0, 0, 2); ctx.fillStyle = HC.gold; ctx.fill();
      ctx.strokeStyle = HC.wood; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(3, 2, 15, -1.15, 1.15); ctx.stroke();
      var ex = 3 + Math.cos(1.15) * 15, ey = Math.sin(1.15) * 15;
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, 2 - ey); ctx.lineTo(ex, 2 + ey); ctx.stroke();
      ctx.strokeStyle = C('arrow', '#f3ead8'); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(ex - 1, 2); ctx.lineTo(19, 2); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [19, -0.5, 22, 2, 19, 4.5]); ctx.fill();
    } else {
      legs(ctx, 15, legPh);
      circle(ctx, 0, 5, 12); fs(ctx, HC.bomber, 2);
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(8, 13); ctx.stroke();
      for (var i = 0; i < 3; i++) { circle(ctx, -5 + i * 5, 1.5 + i * 4.4, 2.2); ctx.fillStyle = HC.bomb; ctx.fill(); }
      circle(ctx, 0, -11, 8); fs(ctx, HC.skin, 1.8);
      ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.closePath(); fs(ctx, HC.bomber, 0);
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-8, -12.5, 16, 2.6);
      circle(ctx, 1, -11.2, 3.1); fs(ctx, HC.lens, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circle(ctx, 6.4, -11.2, 3.1); fs(ctx, HC.lens, 0); ctx.stroke();
      ctx.strokeStyle = HC.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -6.5, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      if (holdBomb !== false) {
        circle(ctx, 12, 3, 5.5); ctx.fillStyle = HC.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = HC.line; ctx.stroke();
        ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.quadraticCurveTo(15, -6, 17, -6); ctx.stroke();
        ctx.fillStyle = HC.spark; poly(ctx, [17, -10, 18, -7, 21, -6, 18, -5, 17, -2, 16, -5, 13, -6, 16, -7]); ctx.fill();
      } else {
        circle(ctx, 12, 1, 2.6); fs(ctx, HC.skin, 0);
      }
    }
    ctx.restore();
  }

  // ---------- 卷軸 / 鍵帽(照 ui-A 材質) ----------
  var K = { edge: '#180f09', parch: '#efe3c6', parchShade: '#d8c9a6', ink: '#2b2118', inkDim: '#76664e', gold: '#ffd84a', goldDeep: '#b8860b', creamText: '#f3e6c8', rod: '#6b4426' };
  function key(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.7, tw(ctx, label, px, true) + px * 0.9), h = px * 1.6;
    rr(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 4); ctx.fillStyle = hot ? K.goldDeep : '#8f8471'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.fillStyle = hot ? K.gold : '#ece4d2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, label, cx, cy + 0.5, px, K.ink, 'center', true);
    return w;
  }
  function anyKeyHint(ctx, cx, cy, px, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    var s = '回大地圖繼續玩', kw = Math.max(px * 1.7, tw(ctx, '任意鍵', px, true) + px * 0.9), sw = tw(ctx, s, px, true);
    var x0 = cx - (kw + 8 + sw) / 2;
    key(ctx, '任意鍵', x0 + kw / 2, cy, px, true);
    text(ctx, s, x0 + kw + 8, cy, px, K.creamText, 'left', true, 4, K.edge);
    ctx.restore();
  }

  // ---------- 場景常數 ----------
  var GY = 520, EDGE = 900, HORIZON = 486, SUN_X = 1080;
  var DAWN0 = 1.4, DAWN1 = 7.0;
  var HEROES = [
    { cls: 'hunter', x: 690, t0: 0.5 },
    { cls: 'sword', x: 770, t0: 0.75 },
    { cls: 'bomber', x: 845, t0: 1.0 }
  ];
  var HK = 2.4, RUN_DUR = 2.3;
  var CHEER = { sword: 6.4, hunter: 6.9, bomber: 7.4 };

  function dawn(t) { return ease(seg(t, DAWN0, DAWN1)); }

  // ---------- 天空、太陽、遠景 ----------
  function sky(ctx, t) {
    var d = dawn(t);
    var g = ctx.createLinearGradient(0, 0, 0, HORIZON + 40);
    g.addColorStop(0, mix('#0a1028', '#3d63a6', d));
    g.addColorStop(0.55, mix('#18204a', '#e8a066', d));
    g.addColorStop(1, mix('#2a2c58', '#ffd98a', d));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON + 40);
    // 星星: 天亮淡出
    var sa = 1 - seg(t, DAWN0, DAWN0 + 3.5);
    if (sa > 0) for (var i = 0; i < 80; i++) {
      var tw2 = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
      ctx.fillStyle = 'rgba(255,255,255,' + (sa * (0.2 + 0.5 * tw2) * (1 - hash(i, 3) * 0.5)).toFixed(3) + ')';
      circle(ctx, hash(i, 1) * W, hash(i, 2) * (HORIZON - 80), 0.8 + hash(i, 4) * 1.3); ctx.fill();
    }
    // 太陽: 從雲海後升起
    var sy = 600 - 230 * eOut(seg(t, 1.8, 7.5));
    var sg = ctx.createRadialGradient(SUN_X, sy, 20, SUN_X, sy, 420);
    sg.addColorStop(0, 'rgba(255,240,190,' + (0.85 * d).toFixed(3) + ')'); sg.addColorStop(0.25, 'rgba(255,200,110,' + (0.4 * d).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, HORIZON + 40);
    // 光芒: 一圈慢慢轉
    if (d > 0.05) {
      ctx.save(); ctx.translate(SUN_X, sy); ctx.rotate(t * 0.05);
      ctx.fillStyle = 'rgba(255,236,170,' + (0.08 * d).toFixed(3) + ')';
      for (i = 0; i < 14; i++) { var a = i * TAU / 14; poly(ctx, [0, 0, Math.cos(a - 0.05) * 1100, Math.sin(a - 0.05) * 1100, Math.cos(a + 0.05) * 1100, Math.sin(a + 0.05) * 1100]); ctx.fill(); }
      ctx.restore();
    }
    circle(ctx, SUN_X, sy, 46); ctx.fillStyle = mix('#c86a4a', '#fff2c8', d); ctx.fill();
    // 遠方風蝕岩柱剪影
    ctx.fillStyle = mix('#141a36', '#8a6a7a', d * 0.8);
    var cols = [[60, 300, 46], [170, 360, 30], [980, 330, 40], [1200, 280, 54], [1130, 380, 26]];
    for (i = 0; i < cols.length; i++) {
      var c = cols[i];
      poly(ctx, [c[0] - c[2] / 2, HORIZON + 40, c[0] - c[2] / 2 + 4, c[1] + 20, c[0] - c[2] * 0.7, c[1], c[0] + c[2] * 0.7, c[1] - 6, c[0] + c[2] / 2 - 2, c[1] + 22, c[0] + c[2] / 2, HORIZON + 40]); ctx.fill();
    }
  }
  function cloudSea(ctx, t) {
    var d = dawn(t);
    // 雲海頂(地平線)
    ctx.fillStyle = mix('#283058', '#ffe0b0', d * 0.9);
    ctx.beginPath(); ctx.moveTo(EDGE - 40, H);
    for (var x = EDGE - 40; x <= W + 40; x += 40) ctx.lineTo(x, HORIZON + 8 + Math.sin(x * 0.03 + t * 0.4) * 6);
    ctx.lineTo(W + 40, H); ctx.closePath(); ctx.fill();
    // 山谷: 雲海下方, 藍色霧氣中的谷地與蜿蜒小路
    var vg = ctx.createLinearGradient(0, HORIZON + 20, 0, H);
    vg.addColorStop(0, mix('#1c2246', '#c7a0a0', d * 0.7)); vg.addColorStop(1, mix('#0e1226', '#4a5a7a', d));
    ctx.fillStyle = vg; ctx.fillRect(EDGE - 40, HORIZON + 26, W - EDGE + 40, H - HORIZON - 26);
    // 谷地丘陵
    ctx.fillStyle = mix('#151a34', '#5a6a6a', d * 0.8);
    ctx.beginPath(); ctx.moveTo(EDGE - 40, H);
    for (x = EDGE - 40; x <= W; x += 20) ctx.lineTo(x, 600 + Math.sin(x * 0.02) * 22 + Math.sin(x * 0.051) * 10);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  // 山谷小路與 8 盞關卡燈: 由遠(右上)到近(左下)依序亮, 最後倉庫亮
  var PATH = [];
  (function () { for (var i = 0; i <= 40; i++) { var u = i / 40; PATH.push([1250 - 300 * u + Math.sin(u * 9) * 46 * (1 - u * 0.4), 540 + 150 * u]); } })();
  var LAMP_T0 = 8.4, LAMP_STEP = 0.22;
  function valleyLights(ctx, t) {
    var d = dawn(t);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(PATH[0][0], PATH[0][1]);
    for (var i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i][0], PATH[i][1]);
    ctx.lineWidth = 7; ctx.strokeStyle = mix('#232a48', '#a89070', d); ctx.stroke();
    // 小路金線: 隨燈一路描過去
    var pu = seg(t, LAMP_T0, LAMP_T0 + LAMP_STEP * 8);
    if (pu > 0) {
      var n = Math.round(pu * (PATH.length - 1));
      ctx.beginPath(); ctx.moveTo(PATH[0][0], PATH[0][1]);
      for (i = 1; i <= n; i++) ctx.lineTo(PATH[i][0], PATH[i][1]);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,214,90,0.85)'; ctx.stroke();
    }
    for (var k = 0; k < 8; k++) {
      var p = PATH[Math.round((k + 0.5) / 8 * (PATH.length - 1) * 0.92)];
      var lt = LAMP_T0 + k * LAMP_STEP, on = t >= lt, s = t - lt;
      ctx.fillStyle = '#2a2230'; ctx.fillRect(p[0] - 1.5, p[1] - 18, 3, 18);
      if (on) {
        var r = 16 + (s < 0.3 ? 12 * (1 - s / 0.3) : 2 * Math.sin(t * 3 + k));
        var g = ctx.createRadialGradient(p[0], p[1] - 20, 0, p[0], p[1] - 20, r);
        g.addColorStop(0, 'rgba(255,240,180,0.95)'); g.addColorStop(1, 'rgba(255,200,90,0)');
        ctx.fillStyle = g; circle(ctx, p[0], p[1] - 20, r); ctx.fill();
        circle(ctx, p[0], p[1] - 20, 3.5); ctx.fillStyle = '#fff6d0'; ctx.fill();
      } else { circle(ctx, p[0], p[1] - 20, 3); ctx.fillStyle = '#4a4258'; ctx.fill(); }
    }
    // 小路盡頭的倉庫(呼應開始畫面)
    var end = PATH[PATH.length - 1], wt = LAMP_T0 + LAMP_STEP * 8 + 0.15, wo = seg(t, wt, wt + 0.4);
    var wx = end[0] - 30, wy = end[1] - 8;
    if (wo > 0) {
      var wg = ctx.createRadialGradient(wx, wy - 20, 0, wx, wy - 20, 80);
      wg.addColorStop(0, 'rgba(255,214,90,' + (0.6 * wo).toFixed(3) + ')'); wg.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = wg; circle(ctx, wx, wy - 20, 80); ctx.fill();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = '#120c08';
    ctx.fillStyle = mix('#3a2a24', '#7a5232', d); ctx.fillRect(wx - 26, wy - 30, 52, 30); ctx.strokeRect(wx - 26, wy - 30, 52, 30);
    poly(ctx, [wx - 32, wy - 28, wx, wy - 52, wx + 32, wy - 28]); ctx.fillStyle = mix('#3a1e1a', '#a84c34', d); ctx.fill(); ctx.stroke();
    ctx.fillStyle = wo > 0 ? 'rgba(255,220,120,' + (0.4 + 0.6 * wo).toFixed(3) + ')' : '#1a120c'; ctx.fillRect(wx - 11, wy - 22, 22, 22);
    ctx.restore();
  }

  // ---------- 崖頂地面 ----------
  function cliff(ctx, t) {
    var d = dawn(t);
    ctx.save();
    // 崖身
    ctx.beginPath(); ctx.moveTo(-10, GY); ctx.lineTo(EDGE, GY); ctx.lineTo(EDGE + 14, GY + 40); ctx.lineTo(EDGE - 6, GY + 90); ctx.lineTo(EDGE + 8, GY + 150); ctx.lineTo(EDGE - 20, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
    ctx.fillStyle = mix('#1e2236', '#6a5a6a', d * 0.85); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#0c0a12'; ctx.stroke();
    // 風蝕斜紋
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
    for (var i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 110 - 20, GY + 50 + (i % 3) * 30); ctx.lineTo(i * 110 + 60, GY + 34 + (i % 3) * 30); ctx.stroke(); }
    // 頂面: 冷白岩帶(高崖頂色), 日出後鍍金
    ctx.fillStyle = mix('#7d8ca5', '#ffe2a8', d * 0.7); ctx.fillRect(-10, GY, EDGE + 10, 10);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.3 * d).toFixed(3) + ')'; ctx.fillRect(-10, GY, EDGE + 10, 2.5);
    // 一座吊橋斷樁(Boss 戰的痕跡)在崖邊
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(EDGE - 18, GY - 26, 7, 26);
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(EDGE - 14, GY - 24); ctx.quadraticCurveTo(EDGE + 10, GY + 10, EDGE + 4, GY + 40); ctx.stroke();
    ctx.restore();
  }

  // ---------- 三職業 ----------
  function heroState(h, t) {
    var u = seg(t, h.t0, h.t0 + RUN_DUR), x = -40 + (h.x + 40) * eOut(u);
    var running = u > 0 && u < 0.97;
    var jump = 0, ct = CHEER[h.cls];
    var cs = t - ct;
    if (cs > 0 && cs < 0.55) jump = Math.sin(Math.PI * cs / 0.55) * 48;
    var bob = (!running && t > h.t0 + RUN_DUR) ? Math.sin((t - h.t0) * 2.4) * 1.5 : 0;
    return { x: x, running: running, legPh: running ? t * 16 : 0, jump: jump, bob: bob };
  }
  function shadows(ctx, t) {
    var d = dawn(t);
    if (d <= 0.05) return;
    ctx.save();
    for (var i = 0; i < HEROES.length; i++) {
      var s = heroState(HEROES[i], t), len = 60 + 140 * d;
      ctx.fillStyle = 'rgba(10,6,20,' + (0.35 * d).toFixed(3) + ')';
      poly(ctx, [s.x - 12, GY + 2, s.x + 12, GY + 2, s.x - len + 8, GY + 9, s.x - len - 16, GY + 9]); ctx.fill();
    }
    ctx.restore();
  }
  function heroes(ctx, t) {
    for (var i = 0; i < HEROES.length; i++) {
      var h = HEROES[i], s = heroState(h, t);
      if (s.x < -60) continue;
      ctx.save();
      ell(ctx, s.x, GY + 2, 30 - s.jump * 0.2, 5); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      ctx.translate(s.x, GY - 20 * HK - s.jump + s.bob); ctx.scale(HK, HK);
      var holdBomb = !(h.cls === 'bomber' && t > CHEER.bomber && t < CHEER.bomber + 1.6);
      hero(ctx, h.cls, 1, s.legPh, holdBomb);
      // 背光輪廓: 太陽在右, 身體右緣一道金光
      var d = dawn(t);
      if (d > 0.2) { ctx.fillStyle = 'rgba(255,214,120,' + (0.35 * d).toFixed(3) + ')'; ctx.fillRect(10, -18, 3, 36); }
      ctx.restore();
    }
  }

  // ---------- 歡呼特效 ----------
  var FW_COLORS = ['wood', 'stone', 'time', 'soul'];
  function cheerFx(ctx, t) {
    var sw = HEROES[1], hu = HEROES[0], bo = HEROES[2];
    // 劍士: 跳起時劍尖金星閃
    var a = t - CHEER.sword;
    if (a > 0.1 && a < 0.8) {
      var k = 1 - Math.abs(a - 0.3) / 0.5, sx = sw.x + 12 * HK, sy = GY - 20 * HK - 21 * HK - heroState(sw, t).jump;
      ctx.save(); ctx.globalAlpha = clamp(k, 0, 1); star(ctx, sx, sy, 10 + 14 * k, 4); ctx.fillStyle = '#fff6c0'; ctx.fill(); ctx.restore();
    }
    // 獵人: 一箭射上天, 到頂化成金星雨
    var b = t - CHEER.hunter, ax = hu.x + 30, ay0 = GY - 60, apex = 150;
    if (b > 0 && b < 0.5) {
      var ay = ay0 - (ay0 - apex) * eOut(b / 0.5);
      ctx.save(); ctx.strokeStyle = C('arrow', '#f3ead8'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay + 26); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [ax - 4, ay, ax, ay - 8, ax + 4, ay]); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,200,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay0); ctx.lineTo(ax, ay + 26); ctx.stroke();
      ctx.restore();
    } else if (b >= 0.5 && b < 2.4) {
      var e = b - 0.5;
      for (var i = 0; i < 16; i++) {
        var ang = i * TAU / 16, sp = 110 + hash(i, 9) * 40;
        var px = ax + Math.cos(ang) * sp * eOut(clamp(e / 1.2, 0, 1)), py = apex + Math.sin(ang) * sp * eOut(clamp(e / 1.2, 0, 1)) + 40 * e * e;
        ctx.save(); ctx.globalAlpha = clamp(1 - e / 1.9, 0, 1); star(ctx, px, py, 6, 4); ctx.fillStyle = C('gold', '#f2c94c'); ctx.fill(); ctx.restore();
      }
    }
    // 炸彈工: 拋炸彈 → 空中炸開成四色素材煙火
    var c = t - CHEER.bomber, bx0 = bo.x + 12 * HK, by0 = GY - 20 * HK, bxa = bo.x - 40, bya = 200;
    if (c > 0 && c < 0.5) {
      var u = c / 0.5, bx = bx0 + (bxa - bx0) * u, by = by0 + (bya - by0) * eOut(u);
      circle(ctx, bx, by, 12); ctx.fillStyle = C('bomb', '#2a2a33'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      star(ctx, bx + 8, by - 12, 7, 4); ctx.fillStyle = C('goal', '#ffd23f'); ctx.fill();
    } else if (c >= 0.5 && c < 3.0) {
      var e2 = c - 0.5;
      if (e2 < 0.35) { var fl = 1 - e2 / 0.35; circle(ctx, bxa, bya, 30 + 60 * (1 - fl)); ctx.fillStyle = 'rgba(255,170,60,' + (0.8 * fl).toFixed(3) + ')'; ctx.fill(); }
      for (i = 0; i < 20; i++) {
        var ang2 = i * TAU / 20 + 0.1, sp2 = 150 + hash(i, 5) * 70, r2 = eOut(clamp(e2 / 1.1, 0, 1));
        var qx = bxa + Math.cos(ang2) * sp2 * r2, qy = bya + Math.sin(ang2) * sp2 * r2 + 55 * e2 * e2;
        ctx.save(); ctx.globalAlpha = clamp(1.6 - e2 / 1.5, 0, 1);
        matIcon(ctx, FW_COLORS[i % 4], qx, qy, 22);
        ctx.restore();
      }
    }
  }

  // ---------- 卷軸結算 ----------
  var STAT = { time: '1:12:48', kills: 1284, mats: [['wood', 3420], ['stone', 1910], ['time', 655], ['soul', 1288]] };
  function scroll(ctx, t) {
    var a = seg(t, 9.9, 10.7);
    if (a <= 0) return;
    var cx = 440, w = 520, y0 = 34, hFull = 236, h = hFull * eOut(a);
    ctx.save();
    // 紙面
    ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2 - 20, y0, w + 40, h + 2); ctx.clip();
    rr(ctx, cx - w / 2, y0 + 6, w, hFull, 4); ctx.fillStyle = K.parch; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.10)'; ctx.fillRect(cx - w / 2, y0 + 6, 14, hFull); ctx.fillRect(cx + w / 2 - 14, y0 + 6, 14, hFull);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(60,40,20,0.5)'; rr(ctx, cx - w / 2, y0 + 6, w, hFull, 4); ctx.stroke();
    var cnt = eOut(seg(t, 10.4, 11.4));
    text(ctx, '通關時間', cx, y0 + 40, 17, K.inkDim, 'center', true);
    text(ctx, STAT.time, cx, y0 + 84, 50, K.ink, 'center', true);
    ctx.fillStyle = 'rgba(60,40,20,0.3)'; ctx.fillRect(cx - w / 2 + 40, y0 + 118, w - 80, 1.5);
    text(ctx, '8 關全破', cx - 120, y0 + 142, 18, K.ink, 'center', true);
    text(ctx, '打倒怪物 ' + grp(STAT.kills * cnt), cx + 100, y0 + 142, 18, K.ink, 'center', true);
    for (var i = 0; i < 4; i++) {
      var mx = cx - 196 + i * 102;
      matIcon(ctx, STAT.mats[i][0], mx, y0 + 186, 22);
      text(ctx, grp(STAT.mats[i][1] * cnt), mx + 15, y0 + 187, 16, K.ink, 'left', true);
    }
    ctx.restore();
    // 上下卷軸桿
    function rod(y) {
      rr(ctx, cx - w / 2 - 18, y - 9, w + 36, 18, 9); ctx.fillStyle = K.rod; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
      circle(ctx, cx - w / 2 - 18, y, 9); ctx.fillStyle = K.gold; ctx.fill(); ctx.stroke();
      circle(ctx, cx + w / 2 + 18, y, 9); ctx.fill(); ctx.stroke();
    }
    rod(y0); rod(y0 + 8 + h);
    ctx.restore();
  }

  function draw(ctx, t) {
    t = clamp(Number(t) || 0, 0, DUR);
    ctx.save();
    sky(ctx, t);
    cloudSea(ctx, t);
    valleyLights(ctx, t);
    cliff(ctx, t);
    shadows(ctx, t);
    heroes(ctx, t);
    cheerFx(ctx, t);
    scroll(ctx, t);
    var pulse = 0.7 + 0.3 * Math.cos((t - 11.2) * TAU * 0.8);
    anyKeyHint(ctx, 440, 640, 18, seg(t, 11.2, 11.6) * pulse);
    // 開場: 從 Boss 戰白光淡入
    var fi = 1 - seg(t, 0, 0.6);
    if (fi > 0) { ctx.fillStyle = 'rgba(255,250,235,' + fi.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'ending', id: 'B', kind: 'anim',
    size: [1280, 720],
    duration: DUR,
    loop: true,
    draw: draw
  };
})();
