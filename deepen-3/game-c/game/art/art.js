/* 職業工事 — art.js (deepen-3 / game-c)
 * 全域物件 window.Art, 不用 ES module。全部 Canvas 2D 幾何繪製, 無外部資源。
 * 只負責「給我狀態, 我畫出來」; 每個函式自己 save / restore。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  var SIL = 0.2;          // 呼叫端縮放小於此值(大地圖縮圖 0.125)改畫剪影版
  var TXT_MIN = 0.6;      // 帶字特效被縮小到此值以下時, 字反向放大

  // ---------- 色票 ----------
  var P = {
    bg: '#a9d8f2', bgFar: '#cfe9f7', hill: '#8cc7a8',
    mapBg: '#24403a', mapLand: '#2f5248', mapLand2: '#365d51',
    outline: '#1a1a24',
    sword: '#4a7dff', swordD: '#2e56c2',
    hunter: '#35c159', hunterD: '#21893c',
    bomber: '#ff8c1a', bomberD: '#c4630a',
    wood: '#b8743a', woodL: '#e0a868', stone: '#a4adb8', stoneD: '#737c88',
    time: '#3ddcf0', timeD: '#1898b0', soul: '#b45cff', soulL: '#e6c2ff',
    danger: '#ff3434', dangerD: '#a8121a',
    gold: '#ffd24a', goldD: '#b88a16',
    select: '#ffe066',
    brood: '#9a3cff', broodGlow: '#d68cff',
    fog: '#8e8aa0', fogL: '#b4b0c4', fogD: '#6e6a80',
    boar: '#7a4a2c', shield: '#8a93a6', shieldPlate: '#5c7fa8', bee: '#ffd23c', frog: '#8cc63f',
    mother: '#3a2448',
    crack: '#cdb88c', crackD: '#9c8660',
    seal: '#7a5230', pitRock: '#4e4a56',
    panel: '#1b2130', panel2: '#252d42', panelLine: '#3c4866',
    text: '#f2f4f8', textDim: '#8a93a8', good: '#6ee07a', warn: '#ffb43c',
    hud: 'rgba(14,18,28,0.86)', skin: '#ffd9b0'
  };

  var THEMES = {
    plain:  { top: '#6cc04a', topD: '#4a9532', body: '#9a6b3f', bodyD: '#7c5530', spot: '#b4824f' },
    sky:    { top: '#f4f8ff', topD: '#c4d2ee', body: '#8f9cc4', bodyD: '#727fa4', spot: '#aab6da' },
    rock:   { top: '#e6aa62', topD: '#b77c3e', body: '#b0603a', bodyD: '#8a472a', spot: '#c87952' },
    swamp:  { top: '#55803c', topD: '#3a5e28', body: '#4a4934', bodyD: '#363624', spot: '#615f44' },
    throne: { top: '#ecc55a', topD: '#b08a2a', body: '#56607c', bodyD: '#434b64', spot: '#6c7896' },
    mine:   { top: '#8e6238', topD: '#664424', body: '#5e4632', bodyD: '#483424', spot: '#76593e' },
    lair:   { top: '#74408a', topD: '#4e2a60', body: '#2e1e3a', bodyD: '#21152a', spot: '#4a2a5e' }
  };

  var MATS = ['wood', 'stone', 'time', 'soul'];
  var MAT_NAME = { wood: '木材', stone: '石料', time: '時晶', soul: '獸魂' };
  var MAT_USE = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var HUD_ICON = { wood: [36, 20], stone: [206, 20], time: [376, 20], soul: [546, 20] };
  var CLS = ['sword', 'hunter', 'bomber'];
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_FAV = { sword: '跳崖台', hunter: '鉤環架', bomber: '爆破礦坑' };
  var ITEM_NAME = { axe: '伐木斧', pick: '碎石鎬', prism: '聚晶稜鏡', soulJar: '魂瓶' };
  var ITEM_FX = { axe: '得到的木材 ×2', pick: '得到的石料 ×2', prism: '得到的時晶 ×2', soulJar: '每打倒一隻 +1 獸魂' };
  var ITEM_MAT = { axe: 'wood', pick: 'stone', prism: 'time', soulJar: 'soul' };
  var SITE_NAME = ['鉤環架', '跳崖台', '爆破礦坑'];

  // ---------- 正規化 ----------
  function num(v, d, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) v = (d === undefined ? 0 : d);
    if (lo !== undefined && v < lo) v = lo;
    if (hi !== undefined && v > hi) v = hi;
    return v;
  }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function S(s) { return s && typeof s === 'object' ? s : {}; }
  function clsOf(v) { return pick(v, CLS, 'sword'); }
  function matOf(v) { return pick(v, MATS, 'wood'); }
  function themeOf(v) { return THEMES[v] ? v : 'plain'; }
  function face(v) { return Number(v) === -1 ? -1 : 1; }
  function fmt1(v) { return (Math.round(num(v, 0) * 10) / 10).toFixed(1); }
  function matSet(o) {
    o = S(o);
    return { wood: num(o.wood, 0, 0, 1e9), stone: num(o.stone, 0, 0, 1e9), time: num(o.time, 0, 0, 1e9), soul: num(o.soul, 0, 0, 1e9) };
  }
  function clsColor(c) { return P[clsOf(c)]; }
  function clsColorD(c) { return P[clsOf(c) + 'D']; }
  function hsh(a, b) { var s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000; }

  // 呼叫端縮放(扣掉底圖倍率)
  function curScale(ctx) {
    try {
      if (!ctx || typeof ctx.getTransform !== 'function') return 1;
      var m = ctx.getTransform();
      if (!m) return 1;
      var s = Math.sqrt(m.a * m.a + m.b * m.b);
      var base = 1;
      if (ctx.canvas && ctx.canvas.width > 0) base = ctx.canvas.width / W;
      if (!(base > 0)) base = 1;
      s = s / base;
      return (isFinite(s) && s > 0) ? s : 1;
    } catch (e) { return 1; }
  }

  // ---------- 小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2); }
  function fillStroke(ctx, f, s, lw) {
    if (f) { ctx.fillStyle = f; ctx.fill(); }
    if (s) { ctx.strokeStyle = s; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, c, lw) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = c; ctx.lineWidth = lw || 2; ctx.stroke();
  }
  function font(s, b) { return (b ? 'bold ' : '') + Math.round(s) + 'px ' + FONT; }
  function T(ctx, s, x, y, o) {
    o = o || {};
    s = String(s);
    ctx.font = font(o.s || 14, o.b);
    ctx.textAlign = o.a || 'left';
    ctx.textBaseline = o.bl || 'middle';
    if (o.ol) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.ol;
      ctx.strokeStyle = o.olc || 'rgba(8,10,16,0.9)';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.c || P.text;
    ctx.fillText(s, x, y);
  }
  function tw(ctx, s, size, b) {
    ctx.font = font(size, b);
    var m = ctx.measureText(String(s));
    return (m && isFinite(m.width)) ? m.width : String(s).length * size * 0.6;
  }
  function star(ctx, x, y, r, c) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r;
      var px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = c; ctx.fill();
  }
  function keycap(ctx, label, x, y, sz) {
    sz = sz || 26;
    rr(ctx, x - sz / 2, y - sz / 2, sz, sz, 5);
    fillStroke(ctx, '#f4f1e6', P.outline, 2);
    ctx.beginPath(); ctx.moveTo(x - sz / 2 + 3, y + sz / 2 - 3); ctx.lineTo(x + sz / 2 - 3, y + sz / 2 - 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke();
    T(ctx, label, x, y - 1, { s: sz * 0.55, b: true, a: 'center', c: '#1a1a24' });
  }
  function lockIcon(ctx, x, y, s, c) {
    var k = s / 24;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
    rr(ctx, -9, -4, 18, 14, 3); fillStroke(ctx, c, P.outline, 1.5);
    circle(ctx, 0, 2, 2); ctx.fillStyle = P.outline; ctx.fill();
    ctx.restore();
  }
  function dimAll(ctx, a) { ctx.fillStyle = 'rgba(6,8,14,' + a + ')'; ctx.fillRect(0, 0, W, H); }

  // ---------- 素材圖示(地上 / 資訊列 / 飛行 / 面板共用) ----------
  function matIcon(ctx, kind, x, y, s) {
    kind = matOf(kind);
    var k = s / 24;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round';
    if (kind === 'wood') {
      rr(ctx, -10, -6, 18, 12, 4); fillStroke(ctx, P.wood, P.outline, 1.6);
      ell(ctx, 7, 0, 4.5, 6); fillStroke(ctx, P.woodL, P.outline, 1.6);
      ell(ctx, 7, 0, 2, 3); ctx.strokeStyle = '#8a4e22'; ctx.lineWidth = 1; ctx.stroke();
      line(ctx, -7, -2, 2, -2, '#8a4e22', 1.2);
    } else if (kind === 'stone') {
      ctx.beginPath();
      ctx.moveTo(-9, 3); ctx.lineTo(-6, -6); ctx.lineTo(3, -9); ctx.lineTo(10, -3); ctx.lineTo(8, 7); ctx.lineTo(-3, 9); ctx.closePath();
      fillStroke(ctx, P.stone, P.outline, 1.6);
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(3, -9); ctx.lineTo(10, -3); ctx.lineTo(1, -1); ctx.closePath();
      ctx.fillStyle = '#d2d8e0'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -1); ctx.lineTo(8, 7); ctx.lineTo(-3, 9); ctx.closePath();
      ctx.fillStyle = P.stoneD; ctx.fill();
    } else if (kind === 'time') {
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, 0); ctx.lineTo(0, 11); ctx.lineTo(-8, 0); ctx.closePath();
      fillStroke(ctx, P.time, P.outline, 1.6);
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-8, 0); ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = '#c8f8ff'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 11); ctx.lineTo(8, 0); ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = P.timeD; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.bezierCurveTo(4, -5, 9, -1, 9, 4);
      ctx.bezierCurveTo(9, 9, 4, 11, 0, 11);
      ctx.bezierCurveTo(-4, 11, -9, 9, -9, 4);
      ctx.bezierCurveTo(-9, -1, -4, -5, 0, -11);
      ctx.closePath();
      fillStroke(ctx, P.soul, P.outline, 1.6);
      ell(ctx, 0, 5, 4.5, 4.5); ctx.fillStyle = P.soulL; ctx.fill();
      circle(ctx, -1.8, 4.5, 1); ctx.fillStyle = P.soul; ctx.fill();
      circle(ctx, 1.8, 4.5, 1); ctx.fill();
    }
    ctx.restore();
  }

  // 職業標誌(白色或指定色符號)
  function clsEmblem(ctx, cls, x, y, s, col) {
    cls = clsOf(cls); col = col || '#ffffff';
    var k = s / 24;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (cls === 'sword') {
      line(ctx, -7, 7, 8, -8, col, 3.2);
      line(ctx, -8, 2, -2, 8, col, 3);
      line(ctx, -9, 9, -6, 6, col, 3);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(-3, 0, 10, -Math.PI / 2.4, Math.PI / 2.4); ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke();
      line(ctx, 0.2, -9, 0.2, 9, col, 1.2);
      line(ctx, -8, 0, 9, 0, col, 2);
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    } else {
      circle(ctx, -1, 2, 7.5); ctx.fillStyle = col; ctx.fill();
      ctx.beginPath(); ctx.moveTo(3, -4); ctx.quadraticCurveTo(6, -9, 9, -8); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
      circle(ctx, 9, -8, 2); ctx.fillStyle = col; ctx.fill();
    }
    ctx.restore();
  }

  // 職業頭像
  function clsHead(ctx, cls, x, y, s, dim) {
    cls = clsOf(cls);
    var k = s / 24;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    circle(ctx, 0, 0, 11.5); fillStroke(ctx, dim ? '#4a5064' : clsColor(cls), P.outline, 1.6);
    circle(ctx, 0, 2, 6.5); ctx.fillStyle = dim ? '#8a8a8a' : P.skin; ctx.fill();
    if (cls === 'sword') {
      ctx.beginPath(); ctx.arc(0, 1, 7, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = dim ? '#666' : '#5a3a20'; ctx.lineWidth = 3; ctx.stroke();
      line(ctx, -7, -3, 7, -3, dim ? '#999' : '#ffffff', 2);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-8, -9, 0, -9); ctx.quadraticCurveTo(8, -9, 8, 4);
      ctx.lineTo(6, 4); ctx.quadraticCurveTo(6, -4, 0, -4); ctx.quadraticCurveTo(-6, -4, -6, 4); ctx.closePath();
      ctx.fillStyle = dim ? '#666' : P.hunterD; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, 7.5, Math.PI, 0); ctx.closePath(); ctx.fillStyle = dim ? '#777' : '#ffd060'; ctx.fill();
      rr(ctx, -6, -1, 12, 3.5, 1.5); ctx.fillStyle = dim ? '#555' : '#3a3a48'; ctx.fill();
    }
    circle(ctx, -2.3, 3.3, 1); ctx.fillStyle = P.outline; ctx.fill();
    circle(ctx, 2.3, 3.3, 1); ctx.fill();
    ctx.restore();
  }

  // 採集器圖示本體
  function itemIcon(ctx, type, x, y, size) {
    type = pick(type, ['axe', 'pick', 'prism', 'soulJar'], 'axe');
    var k = size / 32;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    var mat = ITEM_MAT[type];
    var bgc = { wood: '#5a3a1e', stone: '#3e4450', time: '#164a58', soul: '#3e2058' }[mat];
    var rim = { wood: P.wood, stone: P.stone, time: P.time, soul: P.soul }[mat];
    rr(ctx, -15, -15, 30, 30, 8); fillStroke(ctx, bgc, rim, 2);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (type === 'axe') {
      line(ctx, -7, 10, 5, -8, '#8a5a2c', 3.6);
      ctx.beginPath(); ctx.moveTo(2, -11); ctx.quadraticCurveTo(12, -10, 11, 0); ctx.lineTo(4, -4); ctx.closePath();
      fillStroke(ctx, '#d8dee8', P.outline, 1.4);
      matIcon(ctx, 'wood', -6, -7, 11);
    } else if (type === 'pick') {
      line(ctx, -8, 10, 6, -6, '#8a5a2c', 3.6);
      ctx.beginPath(); ctx.moveTo(-6, -9); ctx.quadraticCurveTo(4, -12, 12, -2); ctx.quadraticCurveTo(4, -8, -6, -9); ctx.closePath();
      ctx.lineWidth = 3; ctx.strokeStyle = '#d8dee8'; ctx.stroke();
      matIcon(ctx, 'stone', 7, 8, 11);
    } else if (type === 'prism') {
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.closePath();
      fillStroke(ctx, 'rgba(200,248,255,0.85)', '#ffffff', 1.6);
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 8); ctx.strokeStyle = P.time; ctx.lineWidth = 1.4; ctx.stroke();
      line(ctx, -14, 0, -6, 0, '#ffffff', 1.4);
      line(ctx, 5, -1, 14, -5, P.time, 1.6);
      line(ctx, 6, 2, 14, 3, P.soul, 1.6);
    } else {
      rr(ctx, -8, -6, 16, 17, 5); fillStroke(ctx, 'rgba(230,194,255,0.35)', '#e6c2ff', 1.6);
      rr(ctx, -5, -11, 10, 5, 2); fillStroke(ctx, '#8a5a2c', P.outline, 1.2);
      matIcon(ctx, 'soul', 0, 3, 13);
    }
    ctx.restore();
  }

  // 花費列: 逐項比對 cost 與 stock, 不足的一種畫紅
  function costItems(cost, stock, canAfford) {
    cost = matSet(cost);
    var st = stock && typeof stock === 'object' ? matSet(stock) : null;
    var out = [];
    MATS.forEach(function (k) {
      if (cost[k] > 0) out.push({ k: k, v: cost[k], short: st ? st[k] < cost[k] : canAfford === false });
    });
    return out;
  }
  function costRow(ctx, cost, stock, x, y, o) {
    o = o || {};
    var fs = o.s || 14, is = o.icon || 18, gap = o.gap || 10;
    var items = costItems(cost, stock, o.canAfford);
    var widths = items.map(function (it) { return is + 3 + tw(ctx, String(Math.round(it.v)), fs, true); });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + Math.max(0, items.length - 1) * gap;
    var cx = o.a === 'center' ? x - total / 2 : (o.a === 'right' ? x - total : x);
    items.forEach(function (it, i) {
      matIcon(ctx, it.k, cx + is / 2, y, is);
      T(ctx, String(Math.round(it.v)), cx + is + 3, y, { s: fs, b: true, c: it.short ? P.danger : P.text });
      cx += widths[i] + gap;
    });
    return total;
  }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#8ccbef'); g.addColorStop(0.7, '#cfeaf6'); g.addColorStop(1, '#e4f2f4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#b9dcc8';
    ctx.beginPath(); ctx.moveTo(0, 560);
    for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 520 + Math.sin(x / 170) * 40 + Math.sin(x / 61) * 12);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff';
    [[180, 130, 1], [560, 90, 0.8], [930, 150, 1.1], [1180, 80, 0.7]].forEach(function (c) {
      ell(ctx, c[0], c[1], 60 * c[2], 16 * c[2]); ctx.fill();
      ell(ctx, c[0] + 26 * c[2], c[1] - 10 * c[2], 34 * c[2], 16 * c[2]); ctx.fill();
    });
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.fillStyle = P.mapBg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.mapLand;
    [[200, 360, 260, 300], [640, 200, 300, 200], [660, 560, 300, 160], [1000, 380, 300, 260]].forEach(function (b, i) {
      ell(ctx, b[0], b[1], b[2], b[3] * 0.7, i * 0.4); ctx.fill();
    });
    ctx.fillStyle = P.mapLand2;
    [[360, 300, 120, 80], [880, 470, 140, 70], [120, 600, 110, 50]].forEach(function (b) { ell(ctx, b[0], b[1], b[2], b[3]); ctx.fill(); });
    ctx.globalAlpha = 0.08; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 0; y <= H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- 地形 ----------
  function drawGround(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), th = THEMES[themeOf(st.theme)], tn = themeOf(st.theme);
    var l = x - 20, t = y - 20;
    var sil = curScale(ctx) < SIL;
    ctx.save();
    ctx.fillStyle = th.body; ctx.fillRect(l, t, 40, 40);
    if (!sil) {
      ctx.fillStyle = th.bodyD; ctx.fillRect(l, t + 36, 40, 4); ctx.fillRect(l + 36, t, 4, 40);
      var hx = Math.floor(x / 40), hy = Math.floor(y / 40);
      ctx.fillStyle = th.spot;
      for (var i = 0; i < 2; i++) {
        var sx = l + 6 + hsh(hx + i, hy) * 26, sy = t + (st.top ? 16 : 6) + hsh(hy, hx + i * 7) * 16;
        ell(ctx, sx, sy, 3.5, 2.2); ctx.fill();
      }
      if (tn === 'mine') { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(l, t + 19, 40, 2); }
      if (tn === 'lair') {
        ctx.strokeStyle = 'rgba(154,60,255,0.45)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(l + 4, t + 30); ctx.quadraticCurveTo(l + 20, t + 18 + hsh(hx, hy) * 10, l + 36, t + 28); ctx.stroke();
      }
    }
    if (st.top) {
      ctx.fillStyle = th.top; ctx.fillRect(l, t, 40, 10);
      ctx.fillStyle = th.topD; ctx.fillRect(l, t + 10, 40, 3);
      if (!sil) {
        if (tn === 'plain' || tn === 'swamp') {
          ctx.fillStyle = th.top;
          for (var b = 0; b < 3; b++) { ell(ctx, l + 7 + b * 13, t + 13, 5, 3); ctx.fill(); }
        } else if (tn === 'sky') {
          ctx.fillStyle = '#ffffff';
          ell(ctx, l + 12, t + 4, 9, 3.5); ctx.fill(); ell(ctx, l + 30, t + 5, 7, 3); ctx.fill();
        } else if (tn === 'throne') {
          ctx.fillStyle = '#b8323c'; ctx.fillRect(l, t + 3, 40, 4);
        } else if (tn === 'mine') {
          ctx.fillStyle = '#a87a48'; ctx.fillRect(l, t, 40, 6);
          ctx.fillStyle = '#3a2a1a'; circle(ctx, l + 6, t + 3, 1.2); ctx.fill(); circle(ctx, l + 34, t + 3, 1.2); ctx.fill();
        } else if (tn === 'lair') {
          ctx.fillStyle = th.top;
          ell(ctx, l + 10, t + 13, 4, 4); ctx.fill(); ell(ctx, l + 28, t + 12, 3, 3); ctx.fill();
        } else if (tn === 'rock') {
          ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(l, t, 40, 3);
        }
      }
    }
    ctx.restore();
  }

  function drawLairBack(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), w = num(st.w, 40, 0, 640), h = num(st.h, 40, 0, 240);
    var lair = st.theme === 'lair';
    var sil = curScale(ctx) < SIL;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = lair ? '#1c1226' : '#33261c'; ctx.fillRect(x, y, w, h);
    if (!sil) {
      if (lair) {
        ctx.fillStyle = 'rgba(154,60,255,0.16)';
        for (var i = 0; i < Math.min(40, w / 40 * h / 40); i++) {
          var px = x + hsh(i, x) * w, py = y + hsh(y, i) * h;
          ell(ctx, px, py, 10 + hsh(i, i) * 14, 6 + hsh(i + 3, i) * 8); ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (var j = 0; j < Math.min(40, w / 40 * h / 40); j++) { ell(ctx, x + hsh(j, y) * w, y + hsh(x, j) * h, 12, 6); ctx.fill(); }
        // 木支架
        for (var sx = Math.ceil(x / 160) * 160 + 20; sx < x + w; sx += 160) {
          ctx.fillStyle = '#5a3e22'; ctx.fillRect(sx - 4, y, 8, h);
          ctx.fillRect(sx - 18, y, 36, 7);
        }
      }
    }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    if (curScale(ctx) < SIL) {
      ctx.fillStyle = P.danger; ctx.fillRect(x - 20, y + 4, 40, 16);
      ctx.restore(); return;
    }
    ctx.fillStyle = '#4a4a56'; ctx.fillRect(x - 20, y + 15, 40, 5);
    for (var i = 0; i < 4; i++) {
      var cx = x - 15 + i * 10;
      ctx.beginPath(); ctx.moveTo(cx - 4.4, y + 16); ctx.lineTo(cx, y + 1); ctx.lineTo(cx + 4.4, y + 16); ctx.closePath();
      ctx.fillStyle = '#c8ccd6'; ctx.fill(); ctx.strokeStyle = P.outline; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 2, y + 7); ctx.lineTo(cx, y + 1); ctx.lineTo(cx + 2, y + 7); ctx.closePath();
      ctx.fillStyle = P.danger; ctx.fill();
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), hp = Math.round(num(st.hp, 3, 1, 3));
    var l = x - 20, t = y - 20;
    ctx.save();
    ctx.fillStyle = P.crack; ctx.fillRect(l, t, 40, 40);
    if (curScale(ctx) < SIL) {
      line(ctx, l + 6, t + 6, l + 34, t + 34, P.outline, 5); line(ctx, l + 34, t + 6, l + 6, t + 34, P.outline, 5);
      ctx.restore(); return;
    }
    ctx.strokeStyle = P.crackD; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l + 1, t + 13); ctx.lineTo(l + 39, t + 13); ctx.moveTo(l + 1, t + 27); ctx.lineTo(l + 39, t + 27);
    ctx.moveTo(l + 20, t + 1); ctx.lineTo(l + 20, t + 13); ctx.moveTo(l + 10, t + 13); ctx.lineTo(l + 10, t + 27);
    ctx.moveTo(l + 30, t + 13); ctx.lineTo(l + 30, t + 27); ctx.moveTo(l + 20, t + 27); ctx.lineTo(l + 20, t + 39);
    ctx.stroke();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(l + 8, t + 4); ctx.lineTo(l + 16, t + 15); ctx.lineTo(l + 13, t + 24); ctx.lineTo(l + 21, t + 34); ctx.stroke();
    if (hp <= 2) {
      ctx.beginPath(); ctx.moveTo(l + 34, t + 6); ctx.lineTo(l + 26, t + 16); ctx.lineTo(l + 30, t + 24); ctx.lineTo(l + 24, t + 36);
      ctx.moveTo(l + 16, t + 15); ctx.lineTo(l + 26, t + 16); ctx.stroke();
    }
    if (hp <= 1) {
      ctx.beginPath(); ctx.moveTo(l + 3, t + 30); ctx.lineTo(l + 13, t + 24); ctx.moveTo(l + 30, t + 24); ctx.lineTo(l + 37.5, t + 30);
      ctx.moveTo(l + 21, t + 34); ctx.lineTo(l + 36, t + 37.5); ctx.stroke();
      ctx.fillStyle = '#5a4a36';
      ctx.beginPath(); ctx.moveTo(l + 26, t + 16); ctx.lineTo(l + 34, t + 12); ctx.lineTo(l + 32, t + 22); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawWorksite(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), kind = pick(st.kind, ['scaffold', 'ledge', 'pitRock', 'seal'], 'scaffold');
    var rep = st.repaired === true, bottom = st.bottom === true;
    var th = THEMES[themeOf(st.theme)];
    var l = x - 20, t = y - 20;
    var sil = curScale(ctx) < SIL;
    ctx.save();
    ctx.lineJoin = 'round';
    if (kind === 'scaffold') {
      if (rep) {
        if (sil) { ctx.fillStyle = P.hunter; ctx.fillRect(l, t, 40, 40); ctx.fillStyle = P.hunterD; ctx.fillRect(l, t, 40, 10); }
        else {
          ctx.fillStyle = 'rgba(40,60,40,0.35)'; ctx.fillRect(l, t, 40, 40);
          line(ctx, l + 6, t + 11, l + 34, t + 37, '#8a5a2c', 4); line(ctx, l + 34, t + 11, l + 6, t + 37, '#8a5a2c', 4);
          ctx.fillStyle = '#8a5a2c'; ctx.fillRect(l + 2, t, 6, 40); ctx.fillRect(l + 32, t, 6, 40);
          rr(ctx, l + 1, t + 1, 38, 10, 2); fillStroke(ctx, P.hunter, P.hunterD, 2);
          line(ctx, l + 4, t + 5, l + 36, t + 5, '#7ee69a', 1.5);
        }
      } else if (bottom) {
        if (sil) { ctx.fillStyle = P.hunterD; ctx.fillRect(l, t + 26, 40, 14); }
        else {
          ctx.save(); ctx.translate(x, y + 10);
          ctx.rotate(-0.35); rr(ctx, -18, -3, 30, 6, 2); fillStroke(ctx, '#8a5a2c', P.outline, 1.4);
          ctx.restore();
          ctx.save(); ctx.translate(x + 4, y + 12);
          ctx.rotate(0.25); rr(ctx, -14, -3, 26, 6, 2); fillStroke(ctx, P.hunter, P.outline, 1.4);
          ctx.restore();
          rr(ctx, l + 2, t + 33, 36, 6, 2); fillStroke(ctx, '#6e4626', P.outline, 1.4);
        }
      }
    } else if (kind === 'ledge') {
      if (rep) {
        ctx.fillStyle = th.body; ctx.fillRect(l, t, 40, 40);
        if (sil) { ctx.fillStyle = P.sword; ctx.fillRect(l, t, 40, 14); }
        else {
          ctx.fillStyle = th.bodyD; ctx.fillRect(l, t + 36, 40, 4);
          rr(ctx, l + 1, t + 1, 38, 11, 2); fillStroke(ctx, P.sword, P.swordD, 2);
          ctx.fillStyle = P.sword; ctx.fillRect(l, t + 20, 40, 5);
          // 圓頭方向箭(朝前上, 不用尖角)
          ctx.lineCap = 'round';
          line(ctx, l + 12, t + 8, l + 26, t + 4, '#ffffff', 2.4);
          line(ctx, l + 22, t + 2, l + 26, t + 4, '#ffffff', 2.4);
          line(ctx, l + 23, t + 7.5, l + 26, t + 4, '#ffffff', 2.4);
        }
      } else if (!sil) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(74,125,255,0.55)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(l + 1, t + 1, 38, 38); ctx.setLineDash([]);
        ctx.fillStyle = '#7d86a0';
        [[l + 8, t + 34, 5], [l + 20, t + 36, 3.5], [l + 31, t + 33, 4.5]].forEach(function (r) {
          ctx.beginPath(); ctx.moveTo(r[0] - r[2], r[1] + 3); ctx.lineTo(r[0], r[1] - r[2]); ctx.lineTo(r[0] + r[2], r[1] + 3); ctx.closePath();
          ctx.fill();
        });
        ctx.fillStyle = P.sword; ctx.fillRect(l + 14, t + 35, 8, 3);
      } else {
        ctx.fillStyle = 'rgba(74,125,255,0.5)'; ctx.fillRect(l + 4, t + 30, 32, 8);
      }
    } else if (kind === 'pitRock') {
      if (!rep) {
        ctx.fillStyle = '#35313c'; ctx.fillRect(l, t, 40, 40);
        if (sil) { ctx.fillStyle = P.sword; ctx.fillRect(l, t, 40, 5); }
        else {
          [[x - 9, y - 8, 10], [x + 9, y - 7, 10], [x - 8, y + 9, 10], [x + 9, y + 10, 9]].forEach(function (b) {
            circle(ctx, b[0], b[1], b[2]); fillStroke(ctx, P.pitRock, P.outline, 2);
            ell(ctx, b[0] - b[2] * 0.3, b[1] - b[2] * 0.35, b[2] * 0.4, b[2] * 0.25); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
          });
          ctx.fillStyle = 'rgba(74,125,255,0.85)'; ctx.fillRect(l + 2, t + 1, 36, 3);
        }
      }
    } else { // seal
      if (!rep) {
        ctx.fillStyle = '#2a1c12'; ctx.fillRect(l, t, 40, 40);
        if (sil) { ctx.fillStyle = P.seal; ctx.fillRect(l + 2, t, 36, 40); ctx.fillStyle = P.bomber; ctx.fillRect(l, t + 14, 40, 6); }
        else {
          for (var i = 0; i < 3; i++) {
            var sx = l + 7 + i * 13;
            rr(ctx, sx - 6, t + 1, 12, 38, 4); fillStroke(ctx, i === 1 ? '#86592f' : P.seal, P.outline, 1.6);
            line(ctx, sx - 2, t + 4, sx - 2, t + 36, 'rgba(0,0,0,0.25)', 1.4);
          }
          [t + 9, t + 27].forEach(function (by) {
            ctx.fillStyle = P.bomberD; ctx.fillRect(l, by, 40, 6);
            ctx.fillStyle = P.bomber; ctx.fillRect(l, by, 40, 3);
            ctx.fillStyle = '#2a2a2a';
            for (var b = 0; b < 3; b++) { circle(ctx, l + 7 + b * 13, by + 3, 1.6); ctx.fill(); }
          });
        }
      }
    }
    ctx.restore();
  }

  function drawVaultDoor(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), open = st.open === true;
    var l = x - 40, t = y - 60;
    var sil = curScale(ctx) < SIL;
    ctx.save();
    // 門框
    ctx.fillStyle = '#3a3040'; ctx.fillRect(l, t, 10, 120); ctx.fillRect(l + 70, t, 10, 120); ctx.fillRect(l, t, 80, 14);
    ctx.fillStyle = P.goldD; ctx.fillRect(l + 8, t + 12, 2, 108); ctx.fillRect(l + 70, t + 12, 2, 108); ctx.fillRect(l + 8, t + 12, 64, 2);
    if (!open) {
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(l + 10, t + 14, 60, 106);
      if (!sil) {
        ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2;
        for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(l + 10 + i * 15, t + 14); ctx.lineTo(l + 10 + i * 15, t + 119); ctx.stroke(); }
        ctx.fillStyle = P.goldD; ctx.fillRect(l + 10, t + 34, 60, 6); ctx.fillRect(l + 10, t + 96, 60, 6);
        circle(ctx, x, y + 6, 15); fillStroke(ctx, P.gold, P.goldD, 3);
        circle(ctx, x, y + 3, 4); ctx.fillStyle = '#3a2a10'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 3, y + 4); ctx.lineTo(x + 3, y + 4); ctx.lineTo(x + 2, y + 13); ctx.lineTo(x - 2, y + 13); ctx.closePath(); ctx.fill();
      } else { ctx.fillStyle = P.gold; ctx.fillRect(l + 25, t + 50, 30, 30); }
    } else {
      ctx.fillStyle = 'rgba(255,210,74,0.12)'; ctx.fillRect(l + 10, t + 14, 60, 106);
    }
    ctx.restore();
  }

  function drawSiteSignAt(ctx, cls, role, x, y) {
    // x,y = 中心, 框 36x48, 底邊貼地
    cls = clsOf(cls); role = role === 'shortcut' ? 'shortcut' : 'gather';
    var t = y - 24;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = '#6e4a2a'; ctx.fillRect(x - 3, t + 28, 6, 20);
    rr(ctx, x - 18, t, 36, 30, 4); fillStroke(ctx, '#2a2a30', null);
    // 黃黑工程斜紋邊
    ctx.save(); rr(ctx, x - 18, t, 36, 30, 4); ctx.clip();
    ctx.fillStyle = '#ffcc22';
    for (var i = -2; i < 10; i++) { ctx.beginPath(); ctx.moveTo(x - 18 + i * 8, t); ctx.lineTo(x - 14 + i * 8, t); ctx.lineTo(x - 22 + i * 8, t + 30); ctx.lineTo(x - 26 + i * 8, t + 30); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    rr(ctx, x - 14, t + 4, 28, 22, 3); fillStroke(ctx, clsColor(cls), P.outline, 1.4);
    clsEmblem(ctx, cls, x - 4, t + 15, 16, '#ffffff');
    // 角色小標
    circle(ctx, x + 9, t + 21, 6); fillStroke(ctx, '#ffffff', P.outline, 1.2);
    if (role === 'shortcut') {
      line(ctx, x + 5.5, t + 21, x + 12, t + 21, '#1a1a24', 1.8);
      line(ctx, x + 9.5, t + 18.5, x + 12, t + 21, '#1a1a24', 1.8);
      line(ctx, x + 9.5, t + 23.5, x + 12, t + 21, '#1a1a24', 1.8);
    } else {
      ctx.fillStyle = '#1a1a24';
      circle(ctx, x + 6.5, t + 23, 1.8); ctx.fill(); circle(ctx, x + 11.5, t + 23, 1.8); ctx.fill(); circle(ctx, x + 9, t + 19.3, 1.8); ctx.fill();
    }
    ctx.restore();
  }
  function drawSiteSign(ctx, st) {
    st = S(st);
    drawSiteSignAt(ctx, st.cls, st.role, num(st.x), num(st.y));
  }

  function drawFog(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), w = num(st.w, 80, 0, 4000), h = num(st.h, 80, 0, 4000);
    var a = num(st.alpha, 1, 0, 1), t = num(st.t, 0);
    if (a <= 0 || w <= 0 || h <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = P.fog; ctx.fillRect(x, y, w, h);
    // 以世界座標排的流動霧團, 相鄰矩形接得起來
    var step = 80, drift = (t * 12) % step;
    var x0 = Math.floor((x - 80) / step) * step, y0 = Math.floor((y - 80) / step) * step;
    var n = 0;
    for (var gy = y0; gy < y + h + 80 && n < 2000; gy += step) {
      for (var gx = x0; gx < x + w + 80 && n < 2000; gx += step) {
        n++;
        var r = hsh(gx, gy);
        var cx = gx + drift + r * 40, cy = gy + Math.sin(t * 0.6 + r * 6) * 6 + 20;
        ctx.fillStyle = r > 0.5 ? P.fogL : P.fogD;
        ctx.globalAlpha = a * 0.55;
        ell(ctx, cx, cy, 46 + r * 20, 22 + r * 10); ctx.fill();
      }
    }
    ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#ffffff';
    for (var gy2 = y0; gy2 < y + h + 80 && n < 4000; gy2 += 120) {
      for (var gx2 = x0; gx2 < x + w + 80 && n < 4000; gx2 += 160) {
        n++;
        var r2 = hsh(gy2, gx2);
        ell(ctx, gx2 - drift * 0.5 + r2 * 60, gy2 + 50, 50, 10); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHookRing(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    if (curScale(ctx) < SIL) {
      circle(ctx, x, y, 10); ctx.fillStyle = P.hunter; ctx.fill(); ctx.restore(); return;
    }
    line(ctx, x, y - 30.5, x, y - 10, '#8a5a2c', 3);
    circle(ctx, x, y, 9); ctx.strokeStyle = P.outline; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = P.hunter; ctx.lineWidth = 3.5; ctx.stroke();
    circle(ctx, x, y, 3); ctx.fillStyle = 'rgba(53,193,89,0.35)'; ctx.fill();
    ctx.restore();
  }

  function drawNest(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), state = pick(st.state, ['dormant', 'idle', 'spent'], 'dormant');
    var dur = num(st.spawnDur, 0.4, 0.01, 10), sp = num(st.spawnT, dur, 0, 1e6), left = Math.round(num(st.left, 0, 0, 5));
    var spawning = sp < dur, k = spawning ? sp / dur : 1;
    var b = y + 24;
    var sil = curScale(ctx) < SIL;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x - 31, b - 1); ctx.quadraticCurveTo(x - 29, y - 21, x, y - 23); ctx.quadraticCurveTo(x + 29, y - 21, x + 31, b - 1); ctx.closePath();
    fillStroke(ctx, state === 'spent' ? '#2e2834' : '#3e2650', P.outline, sil ? 0 : 2);
    var glow = state === 'idle' ? 0.5 + 0.5 * Math.sin(now() * 3) : 0;
    var mouthH = state === 'dormant' ? 2 : (spawning ? 12 + 4 * (1 - k) : 9);
    var mc = state === 'dormant' ? '#1a1220' : (state === 'spent' ? '#151018' : 'rgba(214,140,255,' + (0.45 + 0.4 * glow) + ')');
    if (spawning) mc = P.broodGlow;
    ell(ctx, x, y + 2, 15, mouthH); ctx.fillStyle = mc; ctx.fill();
    if (!sil) {
      ctx.strokeStyle = P.outline; ctx.lineWidth = 2; ctx.stroke();
      if (state === 'dormant') { // 用路徑畫 z
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x + 10, y - 14); ctx.lineTo(x + 17, y - 14); ctx.lineTo(x + 10, y - 7); ctx.lineTo(x + 17, y - 7);
        ctx.strokeStyle = '#9a90a8'; ctx.lineWidth = 1.8; ctx.stroke();
      }
      if (state !== 'dormant') {
        ctx.strokeStyle = 'rgba(154,60,255,' + (state === 'spent' ? 0.15 : 0.55) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 24, y + 18); ctx.quadraticCurveTo(x - 18, y - 4, x - 6, y - 14); ctx.moveTo(x + 24, y + 18); ctx.quadraticCurveTo(x + 18, y - 4, x + 6, y - 14); ctx.stroke();
      }
    }
    // 剩餘隻數: 5 個小點
    for (var i = 0; i < 5; i++) {
      circle(ctx, x - 16 + i * 8, y + 19, 2.6);
      ctx.fillStyle = i < left ? P.broodGlow : '#1a1220'; ctx.fill();
    }
    if (spawning && !sil) {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = P.broodGlow;
      for (var j = 0; j < 4; j++) {
        var px = x + (j - 1.5) * 9, py = y - 4 - k * 40 + j % 2 * 4;
        var mr = 7 + k * 5; circle(ctx, px, Math.max(y - 48 + mr, py), mr); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPickup(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), kind = pick(st.kind, ['wood', 'stone', 'time'], 'wood'), t = num(st.t, 0);
    ctx.save();
    if (curScale(ctx) < SIL) {
      circle(ctx, x, y, 11); ctx.fillStyle = P[kind]; ctx.fill(); ctx.restore(); return;
    }
    var bob = Math.sin(t * 3 + x * 0.05) * 2;
    ell(ctx, x, y + 10, 7, 2); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    matIcon(ctx, kind, x, y + bob - 0.5, 19);
    var tw2 = (t * 1.3 + x * 0.01) % 2;
    if (tw2 < 0.3) { ctx.globalAlpha = 1 - tw2 / 0.3; star(ctx, x + 7, y - 6 + bob, 3.5, '#ffffff'); }
    ctx.restore();
  }

  function drawChest(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), open = st.open === true;
    var l = x - 20, b = y + 17;
    var sil = curScale(ctx) < SIL;
    ctx.save();
    ctx.lineJoin = 'round';
    if (sil) { ctx.fillStyle = open ? '#6a6060' : P.gold; ctx.fillRect(l, b - 30, 40, 30); ctx.restore(); return; }
    if (!open) {
      var pulse = 0.5 + 0.5 * Math.sin(now() * 4);
      rr(ctx, l + 1, b - 20, 38, 20, 3); fillStroke(ctx, '#a0482c', P.outline, 2);
      ctx.beginPath(); ctx.moveTo(l + 1, b - 20); ctx.lineTo(l + 1, b - 26); ctx.quadraticCurveTo(x, b - 36, l + 39, b - 26); ctx.lineTo(l + 39, b - 20); ctx.closePath();
      fillStroke(ctx, '#c45a36', P.outline, 2);
      ctx.fillStyle = P.gold; ctx.fillRect(l + 1, b - 21, 38, 4); ctx.fillRect(x - 3, b - 31, 6, 31);
      rr(ctx, x - 5, b - 22, 10, 9, 2); fillStroke(ctx, P.gold, P.goldD, 1.5);
      ctx.globalAlpha = 0.4 + 0.6 * pulse; star(ctx, l + 33, b - 30, 4, '#fff6c0'); star(ctx, l + 6, b - 25, 3, '#fff6c0');
    } else {
      rr(ctx, l + 1, b - 20, 38, 20, 3); fillStroke(ctx, '#6a5a52', '#2a2224', 2);
      ctx.fillStyle = '#2a2224'; ctx.fillRect(l + 4, b - 19, 32, 5);
      ctx.beginPath(); ctx.moveTo(l + 3, b - 20); ctx.lineTo(l + 6, b - 34); ctx.lineTo(l + 36, b - 34); ctx.lineTo(l + 37, b - 20); ctx.closePath();
      fillStroke(ctx, '#7a6a60', '#2a2224', 2);
      ctx.fillStyle = '#9a8a6a'; ctx.fillRect(l + 3, b - 21, 34, 2);
    }
    ctx.restore();
  }

  function drawGoal(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), reached = st.reached === true;
    var b = y + 40, t = y - 40;
    ctx.save();
    if (curScale(ctx) < SIL) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 14, t, 5, 80);
      ctx.fillStyle = reached ? P.good : P.gold; ctx.fillRect(x - 9, t, 26, 24);
      ctx.restore(); return;
    }
    rr(ctx, x - 12, b - 7, 24, 6, 2); fillStroke(ctx, '#5a5a66', P.outline, 1.5);
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x - 13, t + 4, 4, 70);
    circle(ctx, x - 11, t + 4, 3.5); fillStroke(ctx, P.gold, P.outline, 1.2);
    var fy = reached ? t + 8 : t + 14, wv = Math.sin(now() * 5) * 2;
    ctx.beginPath(); ctx.moveTo(x - 9, fy); ctx.quadraticCurveTo(x + 4, fy - 4 + wv, x + 19, fy + 2); ctx.lineTo(x + 19, fy + 22);
    ctx.quadraticCurveTo(x + 4, fy + 18 + wv, x - 9, fy + 24); ctx.closePath();
    fillStroke(ctx, reached ? P.good : P.gold, P.outline, 1.6);
    star(ctx, x + 5, fy + 11, 6, reached ? '#ffffff' : '#b0481a');
    if (reached) {
      ctx.globalAlpha = 0.35; circle(ctx, x + 5, fy + 11, 14); ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 玩家 ----------
  function playerBody(ctx, cls, pose, pt) {
    // 原點 = 判定框中心, 面向右(呼叫端已翻轉)。框 [-14,14]x[-22,22]
    var col = clsColor(cls), colD = clsColorD(cls), o = P.outline;
    var run = pose === 'run' ? Math.sin(pt * 16) : 0;
    var air = pose === 'rise' || pose === 'fall' || pose === 'hook' || pose === 'dash';
    var crouch = pose === 'wave' ? 3 : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腿
    var l1 = air ? -4 : run * 5, l2 = air ? 4 : -run * 5;
    if (pose === 'fall') { l1 = -6; l2 = 6; }
    line(ctx, -4, 10 + crouch, -4 + l1, 18.5, o, 6); line(ctx, -4, 10 + crouch, -4 + l1, 18.5, '#3a3a4a', 3.6);
    line(ctx, 4, 10 + crouch, 4 + l2, 18.5, o, 6); line(ctx, 4, 10 + crouch, 4 + l2, 18.5, '#3a3a4a', 3.6);
    // 身體
    rr(ctx, -9, -6 + crouch, 18, 18, 5); fillStroke(ctx, col, o, 2);
    ctx.fillStyle = colD; ctx.fillRect(-8, 6 + crouch, 16, 3);
    // 頭
    var hy = -12 + crouch;
    circle(ctx, 1, hy, 8); fillStroke(ctx, P.skin, o, 2);
    circle(ctx, 4.5, hy + 0.5, 1.4); ctx.fillStyle = o; ctx.fill();
    if (pose === 'hurt') {
      line(ctx, 3, hy - 1.5, 6, hy + 2.5, o, 1.4); line(ctx, 6, hy - 1.5, 3, hy + 2.5, o, 1.4);
    }
    if (cls === 'sword') {
      ctx.beginPath(); ctx.arc(1, hy, 8, Math.PI * 1.0, Math.PI * 1.75); ctx.lineTo(1, hy); ctx.closePath(); ctx.fillStyle = '#5a3a20'; ctx.fill();
      line(ctx, -7, hy - 3, 8, hy - 4, '#ffffff', 2.2);
      line(ctx, -7, hy - 3, -12, hy + 1, col, 2.4);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(1, hy, 9, Math.PI * 0.85, Math.PI * 1.9); ctx.lineTo(-3, hy + 6); ctx.closePath();
      fillStroke(ctx, colD, o, 1.6);
    } else {
      ctx.beginPath(); ctx.arc(1, hy - 1, 8, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#ffd060', o, 1.6);
      rr(ctx, 1, hy - 2, 9, 4, 1.5); fillStroke(ctx, '#3a3a48', null);
      circle(ctx, 7, hy, 1.4); ctx.fillStyle = '#9ae0ff'; ctx.fill();
    }
    // 手與道具
    var ay = 0 + crouch;
    if (cls === 'sword') {
      if (pose === 'slash') {
        line(ctx, 2, ay, 11, ay - 6, o, 4.5); line(ctx, 11, ay - 6, 13, ay - 17, '#e8eef8', 3);
      } else if (pose === 'dash') {
        line(ctx, 2, ay, 10, ay + 1, o, 4.5); line(ctx, 10, ay + 1, 12.4, ay + 1, '#e8eef8', 3);
      } else {
        line(ctx, 3, ay, 8, ay + 5, o, 4.5);
        line(ctx, 8, ay + 4, 12, ay - 10, '#e8eef8', 3); line(ctx, 6, ay + 1, 11, ay + 3, '#8a5a2c', 2.4);
      }
    } else if (cls === 'hunter') {
      var drawn = pose === 'shoot';
      var up = pose === 'hook';
      if (up) { line(ctx, 2, ay - 2, 10, ay - 14, o, 4.5); circle(ctx, 10.5, ay - 15, 2.4); ctx.fillStyle = '#c0c0c8'; ctx.fill(); }
      else {
        var bc = drawn ? 1.5 : 3.5;
        ctx.beginPath(); ctx.arc(bc, ay + 1, 9, -Math.PI / 2.3, Math.PI / 2.3); ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 2.4; ctx.stroke();
        line(ctx, bc + 9 * Math.cos(Math.PI / 2.3), ay + 1 - 9 * Math.sin(Math.PI / 2.3), drawn ? -2 : bc + 3.5, ay + 1, '#dddddd', 1);
        line(ctx, bc + 9 * Math.cos(Math.PI / 2.3), ay + 1 + 9 * Math.sin(Math.PI / 2.3), drawn ? -2 : bc + 3.5, ay + 1, '#dddddd', 1);
        if (drawn) line(ctx, -2, ay + 1, 12.5, ay + 1, '#f0f0f0', 1.6);
        line(ctx, 0, ay, 5, ay + 1, o, 4.5);
      }
    } else {
      if (pose === 'throw') { line(ctx, 2, ay - 2, 10, ay - 10, o, 4.5); }
      else if (pose === 'wave') { line(ctx, -6, ay, -11, ay - 6, o, 4.5); line(ctx, 6, ay, 11, ay - 6, o, 4.5); }
      else {
        line(ctx, 3, ay, 8, ay + 5, o, 4.5);
        circle(ctx, 9, ay + 6, 4.2); fillStroke(ctx, '#2a2a34', o, 1.4);
        ctx.beginPath(); ctx.moveTo(10, ay + 2); ctx.lineTo(12, ay - 1); ctx.strokeStyle = '#d0a060'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      rr(ctx, -13, -4 + crouch, 5, 10, 2); fillStroke(ctx, '#7a5a3a', o, 1.2);
    }
  }

  function drawPlayer(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), cls = clsOf(st.cls), f = face(st.facing);
    var pose = pick(st.pose, ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'shoot', 'hook', 'throw', 'wave', 'hurt'], 'idle');
    var pt = num(st.poseT, 0, 0, 1e6);
    ctx.save();
    if (st.invuln === true && Math.floor(now() * 10) % 2 === 0) ctx.globalAlpha = 0.35;
    var s = curScale(ctx);
    if (s < SIL) {
      var lw = Math.min(8, 1 / s);
      rr(ctx, x - 14 + lw / 2, y - 22 + lw / 2, 28 - lw, 44 - lw, 6);
      fillStroke(ctx, clsColor(cls), '#ffffff', lw);
      ctx.restore(); return;
    }
    ctx.translate(x, y); ctx.scale(f, 1);
    // 衝刺斬速度線(衝刺反方向框外至多 60px)
    if (pose === 'dash') {
      ctx.save(); ctx.globalAlpha *= 0.85;
      [[-10, 0.9], [-2, 1], [6, 0.8], [14, 0.6]].forEach(function (r, i) {
        line(ctx, -72 + i * 8, r[0], -16, r[0], i % 2 ? '#ffffff' : P.sword, 3 * r[1]);
      });
      ctx.globalAlpha *= 0.35; rr(ctx, -40, -18, 24, 38, 8); ctx.fillStyle = P.sword; ctx.fill();
      ctx.restore();
    }
    playerBody(ctx, cls, pose, pt);
    // 揮砍刀光: 面向側框外 50x40, 與身體中心同高, 0.15 秒
    if (pose === 'slash' && cls === 'sword' && pt < 0.15) {
      var k = pt / 0.15;
      ctx.save();
      ctx.globalAlpha *= 1 - k * 0.6;
      var a0 = -1.2 + k * 0.6, a1 = 1.1;
      ctx.beginPath();
      ctx.ellipse(14, 0, 48, 19, 0, a0, a1);
      ctx.ellipse(14, 0, 30, 11, 0, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(220,235,255,0.95)'; ctx.fill();
      ctx.strokeStyle = P.sword; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    if (pose === 'hurt' && pt < 0.12) {
      ctx.globalAlpha *= 0.6; rr(ctx, -12, -20, 24, 40, 8); ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.restore();
  }

  function drawRangeRing(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), r = num(st.radius, 260, 0, 2000);
    ctx.save();
    circle(ctx, x, y, r - 1);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(33,137,60,0.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------- 怪物 ----------
  function silMonster(ctx, x, y, w, h, col, s, brood) {
    var lw = Math.min(8, 1 / s) * (brood ? 1.6 : 1);
    ell(ctx, x, y, w / 2 - lw / 2, h / 2 - lw / 2);
    fillStroke(ctx, col, brood ? P.brood : P.outline, lw);
  }
  function stunStars(ctx, x, cy, spread, amp) {
    var a = now() * 4;
    for (var i = 0; i < 3; i++) {
      var ang = a + i * 2.09;
      star(ctx, x + Math.cos(ang) * spread, cy + Math.sin(ang) * amp, 4, P.gold);
    }
  }
  function flungLines(ctx, hw, maxLen) {
    // 本地座標(已依面向翻轉): 飛行方向 = 面向反向, 速度線畫在 +x(框外)
    for (var i = 0; i < 3; i++) {
      var yy = -8 + i * 8, len = maxLen - i * 8;
      line(ctx, hw + 3, yy, hw + 3 + len - 4, yy, 'rgba(255,255,255,0.9)', 2.4);
    }
  }
  function eyes(ctx, x, y, r, brood, angry, hitC) {
    circle(ctx, x, y, r); ctx.fillStyle = hitC || (brood ? P.broodGlow : '#ffffff'); ctx.fill();
    if (!hitC) { circle(ctx, x + r * 0.3, y, r * 0.5); ctx.fillStyle = brood ? '#ffffff' : P.outline; ctx.fill(); }
    if (angry) line(ctx, x - r - 1, y - r - 2, x + r + 1, y - r + 0.5, P.outline, 1.6);
  }
  function broodVeins(ctx, pts) {
    ctx.strokeStyle = 'rgba(154,60,255,0.9)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < pts.length; i += 4) { ctx.moveTo(pts[i], pts[i + 1]); ctx.lineTo(pts[i + 2], pts[i + 3]); }
    ctx.stroke();
  }

  function monsterCommon(st) {
    st = S(st);
    return {
      x: num(st.x), y: num(st.y), f: face(st.facing), hit: st.hit === true, brood: st.brood === true, t: num(st.t, 0)
    };
  }

  function drawBoar(ctx, st) {
    var m = monsterCommon(st), state = pick(S(st).state, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
    var s = curScale(ctx);
    ctx.save();
    if (s < SIL) { silMonster(ctx, m.x, m.y, 48, 32, P.boar, s, m.brood); ctx.restore(); return; }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    if (state === 'stun') { ctx.save(); ctx.scale(m.f, 1); stunStars(ctx, 0, -26, 12, 2.4); ctx.restore(); }
    if (state === 'flung') { flungLines(ctx, 24, 40); ctx.rotate(-0.3); ctx.scale(0.8, 0.8); }
    var hc = m.hit ? '#ffffff' : null, o = P.outline;
    var bx = state === 'windup' ? -3 : (state === 'charge' ? 1 : 0), by = state === 'windup' ? 2 : 0;
    var lg = state === 'walk' ? Math.sin(m.t * 10) * 2 : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [[-12, lg], [-5, -lg], [5, lg], [12, -lg]].forEach(function (p) { line(ctx, p[0] + bx, 8, p[0] + bx + p[1], 13, o, 4.5); });
    ell(ctx, -3 + bx, 1 + by, 17, 10); fillStroke(ctx, hc || P.boar, o, 2);
    ctx.fillStyle = hc || '#4e2e18';
    ctx.beginPath(); ctx.moveTo(-18 + bx, -3 + by); ctx.lineTo(-14 + bx, -10 + by); ctx.lineTo(-8 + bx, -6 + by); ctx.lineTo(-3 + bx, -11 + by); ctx.lineTo(2 + bx, -7 + by); ctx.lineTo(0 + bx, -2 + by); ctx.closePath(); ctx.fill();
    ell(ctx, 13 + bx, -1 + by, 8.5, 8); fillStroke(ctx, hc || '#8a5634', o, 2);
    rr(ctx, 16 + bx, -1 + by, 5.5, 7, 2.5); fillStroke(ctx, hc || '#d89a7a', o, 1.5);
    ctx.beginPath(); ctx.moveTo(16 + bx, 5 + by); ctx.quadraticCurveTo(21 + bx, 6 + by, 21 + bx, 1 + by); ctx.strokeStyle = hc || '#fff8e0'; ctx.lineWidth = 2.6; ctx.stroke();
    if (state === 'stun') {
      line(ctx, 12 + bx, -6, 16 + bx, -2, o, 1.6); line(ctx, 16 + bx, -6, 12 + bx, -2, o, 1.6);
    } else {
      eyes(ctx, 14 + bx, -4 + by, 2.2, m.brood, state === 'windup' || state === 'charge', hc);
    }
    if (m.brood) broodVeins(ctx, [-14 + bx, 4, -6 + bx, -2, -6 + bx, 6, 2 + bx, 0]);
    if (state === 'windup') {
      ctx.fillStyle = 'rgba(160,130,90,0.7)';
      circle(ctx, -20, 12, 3.5); ctx.fill(); circle(ctx, -15, 13, 2.5); ctx.fill();
      ell(ctx, 13 + bx, -4 + by, 5, 4); ctx.strokeStyle = P.danger; ctx.lineWidth = 1.6; ctx.stroke();
    }
    if (state === 'charge') {
      line(ctx, -23, -4, -16, -4, '#ffffff', 2); line(ctx, -23, 3, -18, 3, '#ffffff', 2);
    }
    ctx.restore();
  }

  function drawShieldman(ctx, st) {
    var m = monsterCommon(st), state = pick(S(st).state, ['walk', 'block', 'flung'], 'walk');
    var s = curScale(ctx);
    ctx.save();
    if (s < SIL) { silMonster(ctx, m.x, m.y, 32, 44, P.shield, s, m.brood); ctx.restore(); return; }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    if (state === 'flung') { flungLines(ctx, 16, 40); ctx.rotate(-0.25); ctx.scale(0.78, 0.78); }
    var hc = m.hit ? '#ffffff' : null, o = P.outline;
    var lg = state === 'walk' ? Math.sin(m.t * 6) * 2 : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    line(ctx, -5, 10, -5 + lg, 19, o, 5.5); line(ctx, 3, 10, 3 - lg, 19, o, 5.5);
    rr(ctx, -11, -6, 18, 18, 4); fillStroke(ctx, hc || P.shield, o, 2);
    circle(ctx, -2, -13, 7.5); fillStroke(ctx, hc || '#6c7488', o, 2);
    ctx.fillStyle = hc || '#1e2230'; ctx.fillRect(-1, -15, 8, 3.5);
    if (!hc) { circle(ctx, 4, -13.3, 1.3); ctx.fillStyle = m.brood ? P.broodGlow : '#ff6a3a'; ctx.fill(); }
    line(ctx, -2, -19, -9, -19.5, hc || '#3a3a48', 3);
    if (m.brood) broodVeins(ctx, [-9, -2, -3, 4, -9, 8, -3, 2]);
    // 盾(面向側)
    var flash = state === 'block';
    rr(ctx, 5, -17, 9.5, 34, 4); fillStroke(ctx, flash || hc ? '#ffffff' : P.shieldPlate, flash ? P.gold : o, flash ? 3 : 2);
    if (!flash && !hc) { ctx.fillStyle = P.gold; ctx.fillRect(8.3, -10, 3, 20); ctx.fillRect(6.3, -1.5, 7, 3); }
    if (flash) {
      ctx.strokeStyle = P.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(13.5, -12); ctx.lineTo(14, -18); ctx.moveTo(13.5, 12); ctx.lineTo(14, 18); ctx.stroke();
    }
    ctx.restore();
  }

  function drawShooterBee(ctx, st) {
    var m = monsterCommon(st), state = pick(S(st).state, ['fly', 'aim', 'flung'], 'fly');
    var s = curScale(ctx);
    ctx.save();
    if (s < SIL) { silMonster(ctx, m.x, m.y, 32, 32, P.bee, s, m.brood); ctx.restore(); return; }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    if (state === 'flung') { flungLines(ctx, 16, 40); ctx.rotate(-0.4); ctx.scale(0.8, 0.8); }
    var hc = m.hit ? '#ffffff' : null, o = P.outline;
    var flap = Math.sin(m.t * 40);
    ctx.lineJoin = 'round';
    ctx.globalAlpha *= 0.75;
    ell(ctx, -3, -8 - flap * 2, 6, 4 + flap, -0.4); fillStroke(ctx, '#eef8ff', o, 1.2);
    ell(ctx, 3, -9 - flap * 2, 5, 3.5 + flap, 0.3); fillStroke(ctx, '#eef8ff', o, 1.2);
    ctx.globalAlpha /= 0.75;
    var ax = state === 'aim' ? -2 : 0;
    ell(ctx, -2 + ax, 1, 10, 7.5); fillStroke(ctx, hc || P.bee, o, 2);
    if (!hc) { ctx.fillStyle = '#2a2420'; ctx.fillRect(-6 + ax, -5, 3, 12); ctx.fillRect(-1 + ax, -6, 3, 13); }
    circle(ctx, 8 + ax, -1, 5.5); fillStroke(ctx, hc || '#2a2420', o, 1.5);
    if (!hc) { circle(ctx, 10 + ax, -2, 2); ctx.fillStyle = m.brood ? P.broodGlow : '#ffffff'; ctx.fill(); }
    // 前下方的螫針砲
    ctx.beginPath(); ctx.moveTo(4 + ax, 5); ctx.lineTo(14 + ax, 8); ctx.lineTo(4 + ax, 9); ctx.closePath();
    fillStroke(ctx, state === 'aim' ? P.danger : (hc || '#4a3a2a'), o, 1.2);
    if (state === 'aim') {
      var pp = 0.5 + 0.5 * Math.sin(now() * 25);
      circle(ctx, 12, 8, 2 + pp * 1.2); ctx.fillStyle = P.danger; ctx.fill();
      circle(ctx, 12, 8, 1); ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    if (m.brood) broodVeins(ctx, [-9 + ax, 4, -4 + ax, 6, 0 + ax, 5, 3 + ax, 2]);
    ctx.restore();
  }

  function drawFrog(ctx, st) {
    var m = monsterCommon(st), state = pick(S(st).state, ['crouch', 'jump', 'flung'], 'crouch');
    var s = curScale(ctx);
    ctx.save();
    if (s < SIL) { silMonster(ctx, m.x, m.y, 32, 28, P.frog, s, m.brood); ctx.restore(); return; }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    if (state === 'flung') { flungLines(ctx, 16, 40); ctx.rotate(-0.35); ctx.scale(0.82, 0.82); }
    var hc = m.hit ? '#ffffff' : null, o = P.outline;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (state === 'jump') {
      line(ctx, -6, 4, -13, 11, o, 5); line(ctx, -6, 4, -13, 11, hc || '#6aa02e', 3);
      ell(ctx, 1, -1, 11, 9, -0.3); fillStroke(ctx, hc || P.frog, o, 2);
      ell(ctx, 3, 3, 6, 4, -0.3); ctx.fillStyle = hc || '#e8f0a0'; ctx.fill();
      line(ctx, 8, 4, 13, 8, o, 3.5);
      eyes(ctx, 6, -9, 3.4, m.brood, false, hc);
    } else {
      ell(ctx, -9, 9.5, 6, 3.5); fillStroke(ctx, hc || '#6aa02e', o, 1.6);
      ell(ctx, 0, 5, 13, 8); fillStroke(ctx, hc || P.frog, o, 2);
      ell(ctx, 3, 8, 7, 4); ctx.fillStyle = hc || '#e8f0a0'; ctx.fill();
      ell(ctx, 10, 11.3, 4, 2); fillStroke(ctx, hc || '#6aa02e', o, 1.4);
      eyes(ctx, 3, -4, 3.6, m.brood, false, hc); eyes(ctx, 10, -3, 3.2, m.brood, false, hc);
      line(ctx, 9, 4, 14, 3, o, 1.4);
    }
    if (m.brood) broodVeins(ctx, [-8, 4, -2, 0, -6, 9, 0, 6]);
    ctx.restore();
  }

  function drawBroodmother(ctx, st) {
    st = S(st);
    var m = monsterCommon(st), state = pick(st.state, ['walk', 'windup', 'charge', 'stun'], 'walk');
    var maxHp = num(st.maxHp, 12, 1, 999), hp = num(st.hp, maxHp, 0, maxHp);
    var s = curScale(ctx);
    ctx.save();
    // 血條: 寬 56 高 6, 底邊在本體框上緣上方 8px
    var bt = m.y - 28 - 8 - 6;
    rr(ctx, m.x - 28, bt, 56, 6, 2); fillStroke(ctx, '#2a1020', null);
    ctx.fillStyle = P.danger; ctx.fillRect(m.x - 27, bt + 1, 54 * hp / maxHp, 4);
    rr(ctx, m.x - 28, bt, 56, 6, 2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s < SIL ? Math.min(4, 0.6 / s) : 1; ctx.stroke();
    if (s < SIL) { silMonster(ctx, m.x, m.y, 64, 56, state === 'stun' ? '#c08a2a' : P.mother, s, true); ctx.restore(); return; }
    ctx.translate(m.x, m.y);
    if (state === 'stun') stunStars(ctx, 0, -48, 16, 0);
    ctx.scale(m.f, 1);
    var hc = m.hit ? '#ffffff' : null, o = P.outline;
    var bx = state === 'windup' ? -2 : (state === 'charge' ? 2 : 0), by = state === 'windup' ? 3 : 0;
    var lg = state === 'walk' ? Math.sin(m.t * 6) * 2 : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [[-20, lg], [-9, -lg], [6, lg], [17, -lg]].forEach(function (p) { line(ctx, p[0] + bx, 14, p[0] + bx + p[1], 24, o, 7); line(ctx, p[0] + bx, 14, p[0] + bx + p[1], 23.5, hc || '#24162e', 4); });
    // 甲殼
    ell(ctx, -4 + bx, 4 + by, 24, 15); fillStroke(ctx, hc || P.mother, o, 2.4);
    if (state === 'stun') {
      // 甲殼裂開露出發光核心 = 破綻
      ell(ctx, -4 + bx, 2 + by, 13, 8); ctx.fillStyle = '#ffb43c'; ctx.fill();
      ell(ctx, -4 + bx, 2 + by, 7, 4); ctx.fillStyle = '#fff2c0'; ctx.fill();
      line(ctx, -4 + bx, -11 + by, -4 + bx, -6 + by, o, 2);
    } else {
      ctx.strokeStyle = hc || '#5a3a70'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-4 + bx, -10 + by); ctx.lineTo(-4 + bx, 18 + by); ctx.stroke();
    }
    if (!hc) broodVeins(ctx, [-24 + bx, 6, -14 + bx, -4, -20 + bx, 12, -10 + bx, 8, 6 + bx, -4, 14 + bx, 6]);
    // 頭與冠角(圓頭)
    ell(ctx, 18 + bx, -2 + by, 10, 10); fillStroke(ctx, hc || '#4e3060', o, 2.2);
    [[12, -12, -0.3], [18, -14, 0], [24, -12, 0.3]].forEach(function (h) {
      ctx.save(); ctx.translate(h[0] + bx, h[1] + by); ctx.rotate(h[2]);
      rr(ctx, -2.5, -9, 5, 10, 2.5); fillStroke(ctx, hc || P.gold, o, 1.5);
      ctx.restore();
    });
    rr(ctx, 24 + bx, 0 + by, 5, 8, 2.5); fillStroke(ctx, hc || '#d8a0c0', o, 1.4);
    if (state === 'stun') {
      line(ctx, 18 + bx, -6, 23 + bx, -1, o, 1.8); line(ctx, 23 + bx, -6, 18 + bx, -1, o, 1.8);
    } else {
      var ec = state === 'windup' || state === 'charge' ? P.danger : P.broodGlow;
      circle(ctx, 21 + bx, -3 + by, 3.4); ctx.fillStyle = hc || ec; ctx.fill();
      if (!hc) { circle(ctx, 22 + bx, -3 + by, 1.4); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    }
    if (state === 'windup') {
      ctx.fillStyle = 'rgba(160,130,90,0.7)'; circle(ctx, -26, 21, 4); ctx.fill(); circle(ctx, -20, 23, 3); ctx.fill();
    }
    if (state === 'charge') {
      line(ctx, -30, -4, -22, -4, '#ffffff', 2.4); line(ctx, -30, 6, -24, 6, '#ffffff', 2.4);
    }
    ctx.restore();
  }

  // ---------- 飛行物 / 特效 ----------
  function drawBeeShot(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    circle(ctx, x, y, 5.2); fillStroke(ctx, P.danger, P.dangerD, 1.4);
    circle(ctx, x - 1.2, y - 1.2, 2); ctx.fillStyle = '#ffd0d0'; ctx.fill();
    ctx.restore();
  }

  function drawArrow(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), a = num(st.angle, 0);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.lineCap = 'round';
    line(ctx, -11, 0, 7, 0, '#6a4a28', 2.2);
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -3); ctx.lineTo(6, 3); ctx.closePath(); ctx.fillStyle = '#e8eef8'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-7, -2.8); ctx.lineTo(-5, 0); ctx.lineTo(-7, 2.8); ctx.closePath(); ctx.fillStyle = P.hunter; ctx.fill();
    ctx.restore();
  }

  function drawBomb(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), t = num(st.t, 0);
    ctx.save();
    ctx.translate(x, y);
    circle(ctx, 0, 1, 6); fillStroke(ctx, '#2a2a34', P.outline, 1.4);
    ctx.fillStyle = P.bomber; ctx.fillRect(-6, -0.5, 12, 3);
    circle(ctx, -2, -1.5, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -5); ctx.quadraticCurveTo(4, -7, 5, -6); ctx.strokeStyle = '#d0a060'; ctx.lineWidth = 1.4; ctx.stroke();
    var fl = Math.floor(t * 20) % 2;
    star(ctx, 5, -5.5, fl ? 2.2 : 1.7, fl ? '#ffe066' : '#ff8c1a');
    ctx.restore();
  }

  function drawExplosion(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), dur = num(st.dur, 0.25, 0.01, 10), t = num(st.t, 0, 0, dur), R = num(st.radius, 60, 0, 600);
    var k = t / dur;
    if (k >= 1) return;
    ctx.save();
    var r = R * (0.35 + 0.65 * Math.min(1, k * 1.6));
    ctx.globalAlpha = 1 - k * 0.8;
    circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,140,26,0.85)'; ctx.fill();
    circle(ctx, x, y, r * 0.7); ctx.fillStyle = 'rgba(255,214,74,0.95)'; ctx.fill();
    circle(ctx, x, y, r * 0.35); ctx.fillStyle = '#fff8e0'; ctx.fill();
    ctx.fillStyle = 'rgba(80,60,50,0.6)';
    for (var i = 0; i < 6; i++) {
      var a = i * 1.047 + 0.3;
      circle(ctx, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, r * 0.15); ctx.fill();
    }
    ctx.restore();
  }

  function drawShockwave(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), dur = num(st.dur, 0.3, 0.01, 10), t = num(st.t, 0, 0, dur), R = num(st.radius, 130, 0, 1000);
    var k = t / dur;
    if (k > 1) return;
    var outer = Math.max(2, R * k), ringW = Math.min(12, outer);
    ctx.save();
    ctx.globalAlpha = 1 - k * 0.7;
    circle(ctx, x, y, outer); ctx.fillStyle = 'rgba(255,140,26,0.08)'; ctx.fill();
    circle(ctx, x, y, Math.max(0, outer - ringW / 2)); ctx.strokeStyle = 'rgba(255,140,26,0.85)'; ctx.lineWidth = ringW; ctx.stroke();
    circle(ctx, x, y, Math.max(0, outer - 1)); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    // 朝外的方向記號
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, r1 = outer - ringW - 10, r2 = outer - ringW - 2;
      if (r1 > 4) line(ctx, x + Math.cos(a) * r1, y + Math.sin(a) * r1, x + Math.cos(a) * r2, y + Math.sin(a) * r2, '#ffffff', 2);
    }
    ctx.restore();
  }

  function drawPoof(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), dur = num(st.dur, 0.3, 0.01, 10), t = num(st.t, 0, 0, dur);
    var k = t / dur, sc = st.big === true ? 2 : 1;
    if (k >= 1) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.globalAlpha = 1 - k;
    for (var i = 0; i < 6; i++) {
      var a = i * 1.047, d = 4 + k * 12;
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 8 - k * 3); ctx.fillStyle = i % 2 ? '#d8d4e0' : '#ffffff'; ctx.fill();
    }
    circle(ctx, 0, 0, 7 * (1 - k)); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  function textBoost(ctx, fs) {
    var s = curScale(ctx);
    if (s >= TXT_MIN) return 1;
    return Math.min(6, Math.max(1, 12 / (fs * s)));
  }

  function drawPopup(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), dur = num(st.dur, 0.8, 0.01, 10), t = num(st.t, 0, 0, dur);
    var kind = matOf(st.kind), v = Math.round(num(st.value, 1, 0, 9999));
    var k = t / dur;
    if (k >= 1) return;
    ctx.save();
    ctx.translate(x, y - 30 * k);
    var b = textBoost(ctx, 16); ctx.scale(b, b);
    ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    var s = '+' + v, w = tw(ctx, s, 16, true), tot = w + 4 + 16;
    T(ctx, s, -tot / 2, 0, { s: 16, b: true, c: '#ffffff', ol: 3.5 });
    matIcon(ctx, kind, -tot / 2 + w + 4 + 8, 0, 16);
    ctx.restore();
  }

  function drawChainText(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), dur = num(st.dur, 0.8, 0.01, 10), t = num(st.t, 0, 0, dur), n = Math.round(num(st.n, 2, 0, 999));
    var k = t / dur;
    if (k >= 1) return;
    var pop = k < 0.15 ? 1 + 0.3 * (k / 0.15) : (k < 0.3 ? 1.3 - 0.3 * ((k - 0.15) / 0.15) : 1);
    ctx.save();
    ctx.translate(x, y - 30 * Math.max(0, (k - 0.3) / 0.7));
    var b = textBoost(ctx, 22); ctx.scale(b * pop, b * pop);
    ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    T(ctx, n + ' 連鎖', 0, 0, { s: 22, b: true, a: 'center', c: '#ffcf3a', ol: 4.5 });
    ctx.restore();
  }

  function drawItemIcon(ctx, st) {
    st = S(st);
    ctx.save();
    itemIcon(ctx, st.type, num(st.x), num(st.y), num(st.size, 32, 24, 48));
    ctx.restore();
  }

  function vaultMini(ctx, x, y, s) {
    var k = s / 32;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    rr(ctx, -11, -15, 22, 30, 3); fillStroke(ctx, '#4a3a2a', P.goldD, 2.5);
    circle(ctx, 0, 1, 6); fillStroke(ctx, P.gold, P.goldD, 1.5);
    ctx.restore();
  }

  function drawItemNotice(ctx, st) {
    st = S(st);
    var what = st.what === 'vault' ? 'vault' : 'item';
    var dur = num(st.dur, 1.5, 0.01, 30), t = num(st.t, 0, 0, dur);
    if (t >= dur) return;
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? (dur - t) / 0.3 : 1);
    var L = 440, Tp = 52;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    rr(ctx, L + 1, Tp + 1, 398, 42, 10); fillStroke(ctx, 'rgba(20,24,36,0.92)', P.gold, 2);
    var label;
    if (what === 'item') {
      var ty = pick(st.type, ['axe', 'pick', 'prism', 'soulJar'], 'axe');
      label = '獲得 ' + ITEM_NAME[ty];
    } else label = '寶庫將打開';
    var w = tw(ctx, label, 20, true), tot = 30 + 10 + w, sx = L + 200 - tot / 2;
    if (what === 'item') itemIcon(ctx, st.type, sx + 15, Tp + 22, 30);
    else vaultMini(ctx, sx + 15, Tp + 22, 30);
    T(ctx, label, sx + 40, Tp + 22, { s: 20, b: true, c: P.text });
    ctx.restore();
  }

  // ---------- 大地圖 ----------
  function drawMapLink(ctx, st) {
    st = S(st);
    var x1 = num(st.x1), y1 = num(st.y1), x2 = num(st.x2), y2 = num(st.y2), lit = st.lit === true;
    var mx = (x1 + x2) / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (lit) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = P.gold; ctx.lineWidth = 4; ctx.stroke();
    } else {
      ctx.setLineDash([8, 7]); ctx.strokeStyle = '#5a6a66'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
  }

  function cardBase(ctx, x, y, w, h, dark) {
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 10);
    fillStroke(ctx, dark ? '#1e2422' : '#2a3442', dark ? '#3a4440' : '#56647c', 2);
  }
  function selFrame(ctx, x, y, w, h) {
    var p = 0.5 + 0.5 * Math.sin(now() * 5);
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 13);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = P.select; ctx.lineWidth = 3 + p; ctx.stroke();
  }

  function drawLevelCard(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), idx = Math.round(num(st.index, 1, 0, 99));
    var name = st.name == null ? '' : String(st.name);
    var state = pick(st.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed');
    ctx.save();
    cardBase(ctx, x, y, 176, 136, state === 'sealed');
    // 縮圖區底色
    ctx.fillStyle = state === 'sealed' ? '#151a18' : '#141a24'; ctx.fillRect(x + 8, y + 8, 160, 90);
    if (state === 'sealed' || state === 'buyable') {
      var lc = state === 'sealed' ? '#5a605e' : P.gold;
      lockIcon(ctx, x + 88, y + 38, 30, lc);
      costRow(ctx, st.cost, st.stock, x + 88, y + 76, { a: 'center', s: 15, icon: 18, canAfford: st.canAfford });
    }
    // 文字區第一行
    var ty1 = y + 115, ty2 = y + 129;
    var nc = state === 'sealed' ? P.textDim : P.text;
    T(ctx, idx + ' ' + name, x + 8, ty1, { s: 13, b: true, c: nc });
    // 工事進度 3 點
    var built = Array.isArray(st.built) ? st.built : [];
    var dc = [P.hunter, P.sword, P.bomber];
    for (var i = 0; i < 3; i++) {
      circle(ctx, x + 136 + i * 12, ty1, 4.2);
      if (built[i] === true) { ctx.fillStyle = dc[i]; ctx.fill(); }
      ctx.strokeStyle = dc[i]; ctx.lineWidth = 1.6; ctx.stroke();
    }
    if (state === 'cleared') {
      var nw = tw(ctx, idx + ' ' + name, 13, true);
      var rx = Math.min(x + 8 + nw + 6, x + 76);
      if (st.recordCls != null) clsHead(ctx, st.recordCls, rx + 6, ty1, 12);
      if (st.recordTime != null) T(ctx, fmt1(st.recordTime) + '秒', rx + 14, ty1, { s: 11, c: P.textDim });
      var rates = matSet(st.rates);
      for (var j = 0; j < 4; j++) {
        var cx = x + 8 + j * 41;
        matIcon(ctx, MATS[j], cx + 5, ty2, 10);
        T(ctx, fmt1(rates[MATS[j]]), cx + 11, ty2, { s: 10, c: P.text });
      }
    } else if (state === 'open') {
      T(ctx, '未過關', x + 8, ty2, { s: 11, c: P.textDim });
    }
    if (state === 'sealed') { rr(ctx, x, y, 176, 136, 10); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); }
    ctx.restore();
  }

  function drawCardOverlay(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), lv = Math.round(num(st.accelLv, 0, 0, 2));
    ctx.save();
    ctx.strokeStyle = '#0c1016'; ctx.lineWidth = 2; ctx.strokeRect(x + 7, y + 7, 162, 92);
    if (lv > 0) {
      var s = lv === 1 ? '×1.25' : '×1.5', w = tw(ctx, s, 12, true) + 10;
      rr(ctx, x + 166 - w, y + 10, w, 18, 5); fillStroke(ctx, P.timeD, '#c8f8ff', 1.2);
      T(ctx, s, x + 166 - w / 2, y + 19, { s: 12, b: true, a: 'center', c: '#ffffff' });
    }
    if (st.newArea === true) {
      var w2 = tw(ctx, '新區域', 12, true) + 12;
      rr(ctx, x + 10, y + 10, w2, 18, 5); fillStroke(ctx, P.warn, '#5a3000', 1.2);
      T(ctx, '新區域', x + 10 + w2 / 2, y + 19, { s: 12, b: true, a: 'center', c: '#2a1600' });
    }
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function drawWorkshopCard(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    cardBase(ctx, x, y, 176, 136, false);
    ctx.fillStyle = '#1e2634'; ctx.fillRect(x + 8, y + 8, 160, 90);
    // 鐵砧 + 錘
    var cx = x + 88, cy = y + 60;
    ctx.beginPath(); ctx.moveTo(cx - 36, cy - 12); ctx.lineTo(cx + 30, cy - 12); ctx.quadraticCurveTo(cx + 44, cy - 12, cx + 46, cy - 4);
    ctx.lineTo(cx + 20, cy - 2); ctx.lineTo(cx + 14, cy + 10); ctx.lineTo(cx + 24, cy + 22); ctx.lineTo(cx - 26, cy + 22); ctx.lineTo(cx - 16, cy + 10);
    ctx.lineTo(cx - 22, cy - 2); ctx.lineTo(cx - 36, cy - 4); ctx.closePath();
    fillStroke(ctx, '#7a8296', P.outline, 2);
    ctx.save(); ctx.translate(cx + 4, cy - 30); ctx.rotate(-0.5);
    rr(ctx, -3, -4, 6, 30, 2); fillStroke(ctx, '#8a5a2c', P.outline, 1.5);
    rr(ctx, -12, -12, 24, 12, 3); fillStroke(ctx, '#a4adb8', P.outline, 1.5);
    ctx.restore();
    matIcon(ctx, 'soul', cx - 46, cy - 26, 18);
    T(ctx, '升級所', x + 88, y + 120, { s: 16, b: true, a: 'center' });
    if (st.anyAffordable === true) {
      circle(ctx, x + 162, y + 14, 9); fillStroke(ctx, P.warn, P.outline, 1.5);
      T(ctx, '!', x + 162, y + 14, { s: 14, b: true, a: 'center', c: '#2a1600' });
    }
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function drawGoalCard(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    rr(ctx, x + 1.5, y + 1.5, 197, 133, 10);
    fillStroke(ctx, '#3a2e1c', st.canAfford === true ? P.gold : '#8a7040', st.canAfford === true ? 3 : 2);
    // 城市剪影
    ctx.fillStyle = '#5a4a30';
    [[16, 40, 22, 40], [40, 24, 26, 56], [68, 14, 30, 66], [100, 30, 22, 50], [124, 20, 26, 60], [152, 38, 30, 42]].forEach(function (b) {
      ctx.fillRect(x + b[0], y + 10 + b[1] - 10, b[2], b[3]);
    });
    ctx.fillStyle = P.gold;
    ctx.beginPath(); ctx.moveTo(x + 68, y + 14); ctx.lineTo(x + 83, y + 2); ctx.lineTo(x + 98, y + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9a0';
    for (var i = 0; i < 10; i++) ctx.fillRect(x + 22 + (i * 17) % 160, y + 34 + (i * 11) % 30, 4, 5);
    T(ctx, '工匠之都', x + 100, y + 86, { s: 16, b: true, a: 'center', c: P.gold, ol: 3 });
    var items = costItems(st.cost, st.stock, st.canAfford);
    items.forEach(function (it, i) {
      var cx = x + 14 + (i % 2) * 92, cy = y + 106 + Math.floor(i / 2) * 18;
      matIcon(ctx, it.k, cx + 7, cy, 13);
      T(ctx, String(Math.round(it.v)), cx + 17, cy, { s: 12, b: true, c: it.short ? P.danger : P.text });
    });
    if (st.selected === true) selFrame(ctx, x, y, 200, 136);
    ctx.restore();
  }

  function drawFlyingMaterial(ctx, st) {
    st = S(st);
    var x = num(st.x), y = num(st.y), kind = matOf(st.kind), dur = num(st.dur, 0.7, 0.01, 10), t = num(st.t, 0, 0, dur);
    var dst = HUD_ICON[kind], dx = dst[0] - x, dy = dst[1] - y, d = Math.sqrt(dx * dx + dy * dy);
    ctx.save();
    if (d > 1) {
      var ux = dx / d, uy = dy / d, L = Math.min(24, d);
      var g = ctx.createLinearGradient(x, y, x - ux * L, y - uy * L);
      g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * L, y - uy * L);
      ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.stroke();
    }
    circle(ctx, x, y, 10); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
    matIcon(ctx, kind, x, y, 18);
    ctx.restore();
  }

  // ---------- 關卡面板 ----------
  function rowBox(ctx, x, y, w, h, sel, label) {
    rr(ctx, x, y, w, h, 8);
    fillStroke(ctx, sel ? '#2a3552' : P.panel2, sel ? P.select : P.panelLine, sel ? 3 : 1.5);
    if (label) T(ctx, label, x + 12, y + 12, { s: 13, b: true, c: sel ? P.select : P.textDim });
  }
  function cellBox(ctx, x, y, w, h, sel, dim) {
    rr(ctx, x, y, w, h, 6);
    fillStroke(ctx, dim ? '#1c2232' : '#323d5a', sel ? '#ffffff' : '#46536e', sel ? 2.5 : 1.2);
  }
  function siteEmblemMini(ctx, cls, role, x, y, k) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    drawSiteSignAt(ctx, cls, role, 0, 0);
    ctx.restore();
  }
  function motherHead(ctx, x, y, s) {
    var k = s / 24;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ell(ctx, 0, 2, 11, 9); fillStroke(ctx, '#4e3060', P.outline, 1.6);
    [[-6, -6, -0.5], [0, -8, 0], [6, -6, 0.5]].forEach(function (h) {
      ctx.save(); ctx.translate(h[0], h[1]); ctx.rotate(h[2]); rr(ctx, -2, -6, 4, 7, 2); fillStroke(ctx, P.gold, P.outline, 1); ctx.restore();
    });
    circle(ctx, -4, 2, 2.4); ctx.fillStyle = P.broodGlow; ctx.fill();
    circle(ctx, 4, 2, 2.4); ctx.fill();
    ctx.restore();
  }
  function panelShell(ctx, holeRect) {
    // 暗幕 + 面板底, 預覽框挖空(兩種呼叫順序結果相同)
    ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (holeRect) ctx.rect(holeRect[0], holeRect[1] + holeRect[3], holeRect[2], -holeRect[3]);
    ctx.fillStyle = 'rgba(6,8,14,0.6)'; ctx.fill('evenodd');
    ctx.save();
    if (holeRect) { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(holeRect[0], holeRect[1], holeRect[2], holeRect[3]); ctx.clip('evenodd'); }
    rr(ctx, 41, 49, 1198, 638, 14); fillStroke(ctx, P.panel, P.panelLine, 2);
    ctx.restore();
  }

  function drawLevelPanel(ctx, st) {
    st = S(st);
    var row = Math.round(num(st.row, 0, 0, 3));
    var stock = matSet(st.stock);
    ctx.save();
    panelShell(ctx, [60, 96, 640, 360]);
    T(ctx, '第 ' + Math.round(num(st.index, 1, 0, 99)) + ' 關 ' + (st.name == null ? '' : String(st.name)), 60, 56, { s: 26, b: true, bl: 'top' });
    ctx.strokeStyle = '#6a7898'; ctx.lineWidth = 2; ctx.strokeRect(59, 95, 642, 362);

    // 背包
    var items = Array.isArray(st.items) ? st.items : [];
    for (var i = 0; i < 8; i++) {
      var bx = 60 + i * 80, by = 472, it = items[i];
      if (it && typeof it === 'object') {
        rr(ctx, bx, by, 74, 74, 6); fillStroke(ctx, '#2a3448', '#46536e', 1.2);
        itemIcon(ctx, it.type, bx + 37, by + 28, 40);
        var wh = it.where && typeof it.where === 'object' ? it.where : null;
        T(ctx, wh ? ('第' + Math.round(num(wh.level, 1)) + '關 ' + Math.round(num(wh.slot, 1)) + '號') : '未裝', bx + 37, by + 62, { s: 11, a: 'center', c: wh ? P.text : P.textDim });
      } else {
        rr(ctx, bx + 1, by + 1, 72, 72, 6); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#3c4866'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // 回放資訊
    rr(ctx, 60, 560, 640, 90, 8); fillStroke(ctx, P.panel2, P.panelLine, 1.5);
    if (st.recordCls != null && st.recordTime != null) {
      T(ctx, '目前回放', 76, 582, { s: 13, b: true, c: P.textDim });
      clsHead(ctx, st.recordCls, 160, 582, 22);
      T(ctx, CLS_NAME[clsOf(st.recordCls)] + '  ' + fmt1(st.recordTime) + ' 秒', 176, 582, { s: 15, b: true });
      var rates = matSet(st.rates);
      for (var j = 0; j < 4; j++) {
        var rx = 76 + j * 120;
        matIcon(ctx, MATS[j], rx + 9, 622, 18);
        T(ctx, fmt1(rates[MATS[j]]) + ' /分', rx + 22, 622, { s: 14 });
      }
    } else {
      T(ctx, '尚無回放', 380, 605, { s: 16, a: 'center', c: P.textDim });
    }
    if (st.newArea === true) T(ctx, '修好後還沒跑過', 690, 582, { s: 13, a: 'right', c: P.warn });

    // 職業列
    rowBox(ctx, 720, 96, 480, 130, row === 0, '職業');
    var classes = Array.isArray(st.classes) ? st.classes : [];
    var cs = Math.round(num(st.clsSel, 0, 0, 2));
    for (var c = 0; c < 3; c++) {
      var cl = S(classes[c]), cc = clsOf(cl.cls || CLS[c]), own = cl.owned === true, fav = Math.round(num(cl.favored, 0, 0, 9));
      var cx = 732 + c * 156, cy = 118, sel = cs === c;
      cellBox(ctx, cx, cy, 150, 100, sel && row === 0, !own);
      if (sel && row !== 0) { rr(ctx, cx, cy, 150, 100, 6); ctx.strokeStyle = '#8a96b4'; ctx.lineWidth = 2; ctx.stroke(); }
      clsHead(ctx, cc, cx + 18, cy + 18, 24, !own);
      T(ctx, CLS_NAME[cc], cx + 36, cy + 18, { s: 15, b: true, c: own ? P.text : P.textDim });
      if (!own) lockIcon(ctx, cx + 134, cy + 18, 16, '#8a93a8');
      T(ctx, '擅長 ' + CLS_FAV[cc], cx + 10, cy + 42, { s: 12, c: own ? clsColor(cc) : P.textDim });
      T(ctx, '擅長 ' + fav + ' 處', cx + 10, cy + 62, { s: 13, b: fav > 0, c: fav > 0 ? P.text : P.textDim });
      if (!own) T(ctx, '到升級所招募', cx + 10, cy + 84, { s: 12, c: P.textDim });
      else if (sel) T(ctx, 'Z 出發', cx + 10, cy + 84, { s: 13, b: true, c: row === 0 ? P.select : P.textDim });
    }

    // 工事列
    rowBox(ctx, 720, 236, 480, 150, row === 1, '工事');
    var sites = Array.isArray(st.sites) ? st.sites : [];
    var ss = Math.round(num(st.siteSel, 0, 0, 2));
    var defCls = ['hunter', 'sword', 'bomber'];
    for (var si = 0; si < 3; si++) {
      var sv = S(sites[si]), scl = pick(sv.cls, CLS, defCls[si]), role = sv.role === 'shortcut' ? 'shortcut' : 'gather';
      var sx = 732 + si * 156, sy = 252, ssel = ss === si, rep = sv.repaired === true;
      cellBox(ctx, sx, sy, 150, 128, ssel && row === 1, false);
      if (ssel && row !== 1) { rr(ctx, sx, sy, 150, 128, 6); ctx.strokeStyle = '#8a96b4'; ctx.lineWidth = 2; ctx.stroke(); }
      siteEmblemMini(ctx, scl, role, sx + 20, sy + 30, 0.75);
      T(ctx, SITE_NAME[si], sx + 42, sy + 16, { s: 14, b: true, c: clsColor(scl) });
      if (role === 'shortcut') T(ctx, '捷徑', sx + 42, sy + 40, { s: 13, b: true });
      else {
        matIcon(ctx, pick(sv.main, ['wood', 'stone', 'time'], 'stone'), sx + 50, sy + 40, 16);
        T(ctx, '採集', sx + 62, sy + 40, { s: 13, b: true });
      }
      if (sv.nest === true) motherHead(ctx, sx + 132, sy + 40, 22);
      if (rep) T(ctx, '已完工', sx + 10, sy + 76, { s: 14, b: true, c: P.good });
      else {
        costRow(ctx, sv.cost, stock, sx + 10, sy + 76, { s: 14, icon: 18 });
        T(ctx, 'Z 修復', sx + 10, sy + 104, { s: 13, b: true, c: ssel && row === 1 ? P.select : P.textDim });
      }
    }

    // 道具格列
    rowBox(ctx, 720, 396, 480, 120, row === 2, '道具格');
    var slots = Array.isArray(st.slots) ? st.slots : [];
    var sls = Math.round(num(st.slotSel, 0, 0, 1));
    for (var k = 0; k < 2; k++) {
      var tp = slots[k] == null ? null : pick(slots[k], ['axe', 'pick', 'prism', 'soulJar'], null);
      var kx = 732 + k * 234, ky = 418, ksel = sls === k;
      cellBox(ctx, kx, ky, 228, 88, ksel && row === 2, false);
      if (ksel && row !== 2) { rr(ctx, kx, ky, 228, 88, 6); ctx.strokeStyle = '#8a96b4'; ctx.lineWidth = 2; ctx.stroke(); }
      T(ctx, (k + 1) + '號', kx + 8, ky + 12, { s: 11, c: P.textDim });
      if (tp) {
        itemIcon(ctx, tp, kx + 28, ky + 44, 32);
        T(ctx, ITEM_NAME[tp], kx + 52, ky + 30, { s: 14, b: true });
        T(ctx, ITEM_FX[tp], kx + 52, ky + 52, { s: 12, c: P.textDim });
      } else {
        T(ctx, '空', kx + 28, ky + 44, { s: 15, a: 'center', c: P.textDim });
      }
      if (ksel) T(ctx, items.length ? 'Z 換採集器' : '尚無採集器', kx + 220, ky + 76, { s: 12, b: items.length > 0, a: 'right', c: row === 2 && items.length ? P.select : P.textDim });
    }

    // 加速器列
    rowBox(ctx, 720, 526, 480, 80, row === 3, '回放加速');
    var lv = Math.round(num(st.accelLv, 0, 0, 2));
    T(ctx, ['×1', '×1.25', '×1.5'][lv], 740, 576, { s: 24, b: true, c: lv > 0 ? P.time : P.text });
    for (var d = 0; d < 2; d++) {
      rr(ctx, 840 + d * 22, 568, 16, 16, 3);
      fillStroke(ctx, d < lv ? P.time : '#1c2232', '#46536e', 1.2);
    }
    if (st.accelCost == null) T(ctx, '已滿', 1180, 576, { s: 15, b: true, a: 'right', c: P.good });
    else {
      T(ctx, '下一級', 900, 576, { s: 12, c: P.textDim });
      costRow(ctx, st.accelCost, stock, 948, 576, { s: 15, icon: 18 });
      T(ctx, 'Z 購買', 1180, 576, { s: 13, b: true, a: 'right', c: row === 3 ? P.select : P.textDim });
    }

    T(ctx, '↑↓ 換列    ←→ 選擇    Z 確定    X 關閉', 60, 672, { s: 14, c: P.textDim });
    ctx.restore();
  }

  function drawSiteHighlight(ctx, st) {
    st = S(st);
    if (st.active === false) return;
    var x = num(st.x), y = num(st.y), w = num(st.w, 20, 0, 1280), h = num(st.h, 20, 0, 720);
    var p = 0.5 + 0.5 * Math.sin(now() * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5; ctx.strokeRect(x + 2.5, y + 2.5, Math.max(0, w - 5), Math.max(0, h - 5));
    ctx.strokeStyle = 'rgba(255,224,102,' + (0.6 + 0.4 * p) + ')'; ctx.lineWidth = 3; ctx.strokeRect(x + 2.5, y + 2.5, Math.max(0, w - 5), Math.max(0, h - 5));
    ctx.restore();
  }

  // ---------- 升級所 ----------
  var STAT_INFO = {
    speed: { name: '移速', fx: ['移速 +0%', '移速 +8%', '移速 +16%', '移速 +24%'] },
    hp: { name: '血量', fx: ['血量 3', '血量 4', '血量 5'] },
    cd: { name: '技能冷卻', fx: ['技能冷卻 -0%', '技能冷卻 -15%', '技能冷卻 -30%', '技能冷卻 -45%'] }
  };
  function drawUpgradePage(ctx, st) {
    st = S(st);
    var row = Math.round(num(st.row, 0, 0, 3));
    var stock = matSet(st.stock);
    ctx.save();
    panelShell(ctx, null);
    T(ctx, '升級所', 60, 56, { s: 26, b: true, bl: 'top' });
    rowBox(ctx, 80, 110, 1120, 170, row === 0, '招募');
    var rec = Array.isArray(st.recruits) ? st.recruits : [];
    var rs = Math.round(num(st.recruitSel, 0, 0, 1));
    var def = ['hunter', 'bomber'];
    for (var i = 0; i < 2; i++) {
      var r = S(rec[i]), cc = pick(r.cls, CLS, def[i]), own = r.owned === true;
      var cx = 100 + i * 550, cy = 136, sel = rs === i;
      cellBox(ctx, cx, cy, 530, 130, sel && row === 0, false);
      if (sel && row !== 0) { rr(ctx, cx, cy, 530, 130, 6); ctx.strokeStyle = '#8a96b4'; ctx.lineWidth = 2; ctx.stroke(); }
      clsHead(ctx, cc, cx + 50, cy + 65, 64);
      T(ctx, CLS_NAME[cc], cx + 100, cy + 34, { s: 22, b: true });
      T(ctx, '擅長 ' + CLS_FAV[cc], cx + 100, cy + 66, { s: 15, c: clsColor(cc) });
      if (own) T(ctx, '已招募', cx + 510, cy + 100, { s: 16, b: true, a: 'right', c: P.good });
      else {
        costRow(ctx, r.cost, stock, cx + 100, cy + 100, { s: 16, icon: 20 });
        if (sel) T(ctx, 'Z 招募', cx + 510, cy + 100, { s: 15, b: true, a: 'right', c: row === 0 ? P.select : P.textDim });
      }
    }
    var stats = Array.isArray(st.stats) ? st.stats : [];
    var keys = ['speed', 'hp', 'cd'], ys = [300, 410, 520];
    for (var j = 0; j < 3; j++) {
      var sv = S(stats[j]), key = pick(sv.key, keys, keys[j]), info = STAT_INFO[key];
      var maxLv = Math.round(num(sv.maxLv, key === 'hp' ? 2 : 3, 1, 3)), lv = Math.round(num(sv.lv, 0, 0, maxLv));
      var y = ys[j], sel2 = row === j + 1;
      rowBox(ctx, 80, y, 1120, 100, sel2, null);
      T(ctx, info.name, 104, y + 50, { s: 22, b: true, c: sel2 ? P.select : P.text });
      for (var b = 0; b < maxLv; b++) {
        rr(ctx, 260 + b * 34, y + 38, 26, 24, 4); fillStroke(ctx, b < lv ? P.soul : '#1c2232', '#6a5a8a', 1.5);
      }
      T(ctx, info.fx[lv], 400, y + 50, { s: 18, b: true });
      if (sv.cost == null || lv >= maxLv) T(ctx, '已滿', 1176, y + 50, { s: 18, b: true, a: 'right', c: P.good });
      else {
        T(ctx, '→  ' + info.fx[Math.min(lv + 1, info.fx.length - 1)], 600, y + 50, { s: 18, c: P.textDim });
        costRow(ctx, sv.cost, stock, 900, y + 50, { s: 17, icon: 20 });
        T(ctx, 'Z 升級', 1176, y + 50, { s: 15, b: true, a: 'right', c: sel2 ? P.select : P.textDim });
      }
    }
    T(ctx, '↑↓ 換列    ←→ 選擇    Z 招募 / 升級    X 關閉', 60, 672, { s: 14, c: P.textDim });
    ctx.restore();
  }

  // ---------- 資訊列 ----------
  function heart(ctx, x, y, s, full) {
    var k = s / 16;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-9, -1, -7, -8, -3.5, -7.5); ctx.bezierCurveTo(-1.5, -7.3, 0, -5.5, 0, -4);
    ctx.bezierCurveTo(0, -5.5, 1.5, -7.3, 3.5, -7.5); ctx.bezierCurveTo(7, -8, 9, -1, 0, 6); ctx.closePath();
    fillStroke(ctx, full ? P.danger : '#2a2a36', full ? P.dangerD : '#5a5a6a', 1.5);
    ctx.restore();
  }
  function drawHud(ctx, st) {
    st = S(st);
    var mode = st.mode === 'level' ? 'level' : 'map';
    var stock = matSet(st.stock), rate = matSet(st.ratePerMin), bump = S(st.bumpT), bd = num(st.bumpDur, 0.15, 0.001, 10);
    ctx.save();
    ctx.fillStyle = P.hud; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 39, W, 1);
    var xs = [16, 186, 356, 526];
    for (var i = 0; i < 4; i++) {
      var k = MATS[i], x0 = xs[i];
      matIcon(ctx, k, HUD_ICON[k][0], HUD_ICON[k][1], 24);
      var bt = num(bump[k], bd, 0, bd), sc = bt < bd ? 1 + 0.3 * (1 - bt / bd) : 1;
      ctx.save(); ctx.translate(x0 + 40, 20); ctx.scale(sc, sc);
      T(ctx, String(Math.floor(stock[k])), 0, 0, { s: 19, b: true });
      ctx.restore();
      T(ctx, '+' + fmt1(rate[k]) + '/分', x0 + 102, 13, { s: 12, c: P.good });
      T(ctx, MAT_USE[k], x0 + 102, 29, { s: 11, c: P.textDim });
      if (i < 3) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x0 + 166, 6, 1, 28); }
    }
    if (mode === 'level') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(712, 6, 1, 28);
      T(ctx, fmt1(st.time) + ' 秒', 724, 20, { s: 17, b: true });
      var run = matSet(st.run);
      for (var j = 0; j < 4; j++) {
        matIcon(ctx, MATS[j], 820 + j * 52, 20, 15);
        T(ctx, String(Math.floor(run[MATS[j]])), 830 + j * 52, 20, { s: 13, b: true });
      }
      var mh = Math.round(num(st.maxHp, 3, 1, 5)), hp = Math.round(num(st.hp, mh, 0, mh));
      for (var h = 0; h < mh; h++) heart(ctx, 1036 + h * 19, 20, 17, h < hp);
      // 技能冷卻
      var cdD = num(st.skillCdDur, 1, 0.001, 100), cdT = num(st.skillCdT, cdD, 0, cdD);
      var ready = cdT >= cdD, cls = clsOf(st.cls);
      var sx = 1170, sy = 20;
      circle(ctx, sx, sy, 15); ctx.fillStyle = ready ? clsColor(cls) : '#2a3040'; ctx.fill();
      if (!ready) {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cdT / cdD)); ctx.closePath();
        ctx.fillStyle = 'rgba(160,170,190,0.55)'; ctx.fill();
      }
      circle(ctx, sx, sy, 15); ctx.strokeStyle = ready ? '#ffffff' : '#5a6478'; ctx.lineWidth = 2; ctx.stroke();
      clsEmblem(ctx, cls, sx, sy, 18, ready ? '#ffffff' : '#9aa2b4');
      keycap(ctx, 'X', 1199, 20, 20);
      clsHead(ctx, cls, 1246, 20, 30);
    }
    ctx.restore();
  }

  // ---------- 結算 / 面板 ----------
  function panelBox(ctx, x, y, w, h, accent) {
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 14); fillStroke(ctx, P.panel, accent || P.panelLine, 3);
  }
  function drawResultPanel(ctx, st) {
    st = S(st);
    var L = 280, Tp = 150;
    ctx.save();
    panelBox(ctx, L, Tp, 720, 420, P.gold);
    T(ctx, '過關', L + 360, Tp + 40, { s: 34, b: true, a: 'center', c: P.gold });
    var run = matSet(st.run), rates = matSet(st.rates);
    var gains = Array.isArray(st.gains) ? st.gains.slice(0, 2) : [];
    function gainsRow(y) {
      var gx = L + 40;
      gains.forEach(function (g) {
        g = S(g);
        if (g.what === 'vault') { vaultMini(ctx, gx + 14, y, 26); T(ctx, '寶庫已打開', gx + 32, y, { s: 15, b: true, c: P.gold }); gx += 160; }
        else { var tp = pick(g.type, ['axe', 'pick', 'prism', 'soulJar'], 'axe'); itemIcon(ctx, tp, gx + 14, y, 28); T(ctx, '獲得 ' + ITEM_NAME[tp], gx + 34, y, { s: 15, b: true }); gx += 200; }
      });
    }
    function runRow(y) {
      T(ctx, '這趟得到', L + 40, y, { s: 14, c: P.textDim });
      for (var i = 0; i < 4; i++) {
        matIcon(ctx, MATS[i], L + 140 + i * 90, y, 20);
        T(ctx, String(Math.floor(run[MATS[i]])), L + 154 + i * 90, y, { s: 16, b: true });
      }
    }
    if (st.oldTime == null) {
      clsHead(ctx, st.cls, L + 300, Tp + 92, 28);
      T(ctx, fmt1(st.time) + ' 秒', L + 320, Tp + 92, { s: 22, b: true });
      runRow(Tp + 140);
      T(ctx, '每分鐘', L + 40, Tp + 185, { s: 14, c: P.textDim });
      for (var i = 0; i < 4; i++) {
        matIcon(ctx, MATS[i], L + 140 + i * 130, Tp + 185, 20);
        T(ctx, fmt1(rates[MATS[i]]) + ' /分', L + 154 + i * 130, Tp + 185, { s: 16, b: true });
      }
      gainsRow(Tp + 235);
      T(ctx, '已存成回放', L + 360, Tp + 300, { s: 20, b: true, a: 'center', c: P.good });
      T(ctx, 'Z 回大地圖', L + 360, Tp + 380, { s: 17, b: true, a: 'center', c: P.select });
    } else {
      runRow(Tp + 82);
      gainsRow(Tp + 116);
      var oldR = matSet(st.oldRates);
      var c1 = L + 330, c2 = L + 560;
      T(ctx, '這一趟', c1, Tp + 152, { s: 16, b: true, a: 'center' });
      T(ctx, '目前回放', c2, Tp + 152, { s: 16, b: true, a: 'center', c: P.textDim });
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(L + 40, Tp + 166, 640, 1);
      clsHead(ctx, st.cls, c1 - 44, Tp + 186, 22); T(ctx, fmt1(st.time) + ' 秒', c1 - 28, Tp + 186, { s: 16, b: true });
      clsHead(ctx, st.oldCls, c2 - 44, Tp + 186, 22); T(ctx, fmt1(st.oldTime) + ' 秒', c2 - 28, Tp + 186, { s: 16, b: true, c: P.textDim });
      for (var r = 0; r < 4; r++) {
        var k = MATS[r], yy = Tp + 220 + r * 32, a = rates[k], b = oldR[k];
        var ra = Math.round(a * 10), rb = Math.round(b * 10);
        matIcon(ctx, k, L + 60, yy, 20);
        T(ctx, MAT_NAME[k] + ' /分', L + 78, yy, { s: 14, c: P.textDim });
        if (ra > rb) { rr(ctx, c1 - 60, yy - 13, 120, 26, 6); ctx.fillStyle = 'rgba(110,224,122,0.18)'; ctx.fill(); }
        if (rb > ra) { rr(ctx, c2 - 60, yy - 13, 120, 26, 6); ctx.fillStyle = 'rgba(110,224,122,0.18)'; ctx.fill(); }
        T(ctx, fmt1(a) + (ra > rb ? ' ▲' : ''), c1, yy, { s: 16, b: ra > rb, a: 'center', c: ra > rb ? P.good : P.text });
        T(ctx, fmt1(b) + (rb > ra ? ' ▲' : ''), c2, yy, { s: 16, b: rb > ra, a: 'center', c: rb > ra ? P.good : P.text });
      }
      T(ctx, 'Z 採用這一趟    X 保留舊的', L + 360, Tp + 385, { s: 17, b: true, a: 'center', c: P.select });
    }
    ctx.restore();
  }

  function drawFailPanel(ctx) {
    ctx.save();
    panelBox(ctx, 380, 240, 520, 240, P.danger);
    T(ctx, '失敗', 640, 320, { s: 38, b: true, a: 'center', c: P.danger });
    T(ctx, 'Z 重來    X 回大地圖', 640, 420, { s: 18, b: true, a: 'center', c: P.select });
    ctx.restore();
  }

  function drawPausePanel(ctx, st) {
    st = S(st);
    ctx.save();
    dimAll(ctx, 0.55);
    panelBox(ctx, 380, 220, 520, 280, P.panelLine);
    T(ctx, '暫停', 640, 300, { s: 38, b: true, a: 'center' });
    if (st.mode === 'map') T(ctx, 'Esc 繼續', 640, 420, { s: 18, b: true, a: 'center', c: P.select });
    else T(ctx, 'Esc 繼續    Z 重來    X 回大地圖', 640, 420, { s: 18, b: true, a: 'center', c: P.select });
    ctx.restore();
  }

  function drawEndingPanel(ctx, st) {
    st = S(st);
    var tt = Math.floor(num(st.totalTime, 0, 0, 1e7));
    var mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.save();
    panelBox(ctx, 280, 150, 720, 420, P.gold);
    ctx.fillStyle = '#5a4a30';
    [[460, 250, 40, 90], [510, 220, 50, 120], [570, 190, 60, 150], [640, 215, 50, 125], [700, 245, 60, 95], [770, 260, 50, 80]].forEach(function (b) { ctx.fillRect(b[0], b[1], b[2], b[3]); });
    ctx.fillStyle = P.gold; ctx.beginPath(); ctx.moveTo(570, 190); ctx.lineTo(600, 160); ctx.lineTo(630, 190); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9a0';
    for (var i = 0; i < 16; i++) ctx.fillRect(470 + (i * 37) % 340, 260 + (i * 23) % 70, 6, 8);
    T(ctx, '工匠之都落成', 640, 390, { s: 36, b: true, a: 'center', c: P.gold, ol: 4 });
    T(ctx, '總遊玩時間  ' + mm + ':' + (ss < 10 ? '0' : '') + ss, 640, 450, { s: 20, b: true, a: 'center' });
    T(ctx, 'Z 重新開始', 640, 520, { s: 18, b: true, a: 'center', c: P.select });
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  var GUIDE_SIZE = [[480, 270], [600, 220], [480, 300], [560, 240], [560, 220]];
  function groundRow(ctx, x0, x1, top, bottom, theme) {
    for (var gx = x0; gx < x1; gx += 40) {
      for (var gy = top; gy < bottom; gy += 40) drawGround(ctx, { x: gx + 20, y: gy + 20, top: gy === top, theme: theme });
    }
  }
  function dashedPath(ctx, pts, col) {
    ctx.save();
    ctx.setLineDash([7, 6]); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = col || '#ffffff'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.setLineDash([]);
    var a = pts[pts.length - 1], b = pts[pts.length - 2];
    var ax = a.length === 4 ? a[2] : a[0], ay = a.length === 4 ? a[3] : a[1];
    var bx = a.length === 4 ? a[0] : (b.length === 4 ? b[2] : b[0]), by = a.length === 4 ? a[1] : (b.length === 4 ? b[3] : b[1]);
    var ang = Math.atan2(ay - by, ax - bx);
    ctx.translate(ax, ay); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-9, -6); ctx.lineTo(-9, 6); ctx.closePath();
    ctx.fillStyle = col || '#ffffff'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  function tag(ctx, s, x, y, size) {
    var fs = size || 14, w = tw(ctx, s, fs, true) + 12;
    rr(ctx, x - w / 2, y - fs / 2 - 4, w, fs + 8, 6); fillStroke(ctx, 'rgba(14,18,28,0.85)', '#ffffff', 1.2);
    T(ctx, s, x, y, { s: fs, b: true, a: 'center' });
  }

  function guide0(ctx) { // 480x270: 第 1 關縮小版, 世界 0.5 倍
    ctx.save(); ctx.scale(0.5, 0.5);
    drawBackground(ctx);
    groundRow(ctx, 0, 960, 460, 560, 'plain');
    groundRow(ctx, 640, 800, 420, 460, 'plain');
    drawPickup(ctx, { x: 300, y: 440, kind: 'wood', t: 0.5 });
    drawBoar(ctx, { x: 500, y: 444, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
    drawGoal(ctx, { x: 880, y: 420, reached: false });
    drawPlayer(ctx, { x: 100, y: 438, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1, invuln: false });
    ctx.restore();
    // 路線(畫面座標)
    dashedPath(ctx, [[66, 212], [150, 212], [215, 212], [250, 160, 285, 212], [312, 212], [318, 199, 330, 199], [424, 199]], '#ffffff');
    tag(ctx, '你', 50, 192, 14);
    tag(ctx, '終點旗', 440, 174, 14);
  }

  function guide1(ctx) { // 600x220: 四格
    var gy = 180, sc = 1.4;
    for (var p = 0; p < 4; p++) {
      var ox = p * 150;
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, 0, 150, 220); ctx.clip();
      ctx.fillStyle = p % 2 ? '#bfe2f4' : '#b2dbf0'; ctx.fillRect(ox, 0, 150, 220);
      ctx.save(); ctx.translate(ox, 0);
      groundRow(ctx, 0, 160, gy, 240, 'plain');
      ctx.restore();
      ctx.restore();
    }
    function pl(x, footY, pose, pt) {
      ctx.save(); ctx.translate(x, footY); ctx.scale(sc, sc);
      drawPlayer(ctx, { x: 0, y: -22, cls: 'sword', facing: 1, pose: pose, poseT: pt, invuln: false });
      ctx.restore();
    }
    // 1 跑
    pl(75, gy, 'run', 0.05);
    line(ctx, 30, gy - 40, 45, gy - 40, 'rgba(255,255,255,0.9)', 3); line(ctx, 24, gy - 26, 42, gy - 26, 'rgba(255,255,255,0.9)', 3);
    keycap(ctx, '←', 45, 60, 30); keycap(ctx, '→', 105, 60, 30);
    // 2 跳
    pl(225, gy - 56, 'rise', 0.1);
    ctx.save(); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(195, gy - 2); ctx.quadraticCurveTo(212, gy - 40, 222, gy - 56);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    keycap(ctx, '↑', 275, 50, 30);
    // 3 揮砍
    pl(335, gy, 'slash', 0.05);
    keycap(ctx, 'Z', 335, 50, 30);
    // 4 衝刺斬穿過跳蛙
    drawPoof(ctx, { x: 532, y: gy - 16, t: 0.1, dur: 0.3, big: false });
    pl(570, gy - 6, 'dash', 0.05);
    keycap(ctx, 'X', 525, 50, 30);
    // 分隔線
    for (var d = 1; d < 4; d++) { ctx.fillStyle = 'rgba(20,30,50,0.35)'; ctx.fillRect(d * 150 - 1, 0, 2, 220); }
  }

  function guide2(ctx) { // 480x300: 卡片縮圖 → 飛到資訊列
    // 資訊列(只畫木材格與其餘淡化)
    ctx.fillStyle = P.hud; rr(ctx, 0, 0, 480, 44, 8); ctx.fill();
    var xs = [30, 150, 270, 390];
    for (var i = 0; i < 4; i++) {
      ctx.globalAlpha = i === 0 ? 1 : 0.3;
      matIcon(ctx, MATS[i], xs[i], 22, 24);
    }
    ctx.globalAlpha = 1;
    T(ctx, '12', 50, 22, { s: 18, b: true, c: P.textDim });
    ctx.lineCap = 'round';
    line(ctx, 76, 22, 94, 22, P.good, 2.5); line(ctx, 88, 17, 94, 22, P.good, 2.5); line(ctx, 88, 27, 94, 22, P.good, 2.5);
    T(ctx, '13', 102, 22, { s: 22, b: true, c: '#ffffff' });
    // 卡片(1.3 倍)
    var cx = 230, cy = 112, k = 1.3;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '草原', state: 'cleared', cost: {}, stock: {}, canAfford: true, rates: { wood: 12.5, stone: 3.0, time: 2.5, soul: 2.5 }, recordCls: 'sword', recordTime: 12.3, built: [false, false, false] });
    // 縮圖: 局部放大(非實際比例), 劍士正撿到木材
    ctx.save(); ctx.beginPath(); ctx.rect(8, 8, 160, 90); ctx.clip();
    ctx.translate(8, 8); ctx.scale(0.36, 0.36);
    drawBackground(ctx);
    groundRow(ctx, 0, 480, 200, 280, 'plain');
    drawBoar(ctx, { x: 360, y: 184, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
    drawPickup(ctx, { x: 168, y: 182, kind: 'wood', t: 0 });
    drawPlayer(ctx, { x: 150, y: 178, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1, invuln: false });
    ctx.restore();
    drawCardOverlay(ctx, { x: 0, y: 0, accelLv: 0, newArea: false, selected: false });
    ctx.restore();
    // 木材飛行弧線: 從縮圖撿取處(劍士手邊)到資訊列木材圖示
    var sx = cx + (8 + 168 * 0.36) * k, sy = cy + (8 + 182 * 0.36) * k;
    ctx.save(); ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(70, 170, 34, 36);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
    var fx = 0.25 * 0.25 * sx + 2 * 0.25 * 0.75 * 70 + 0.75 * 0.75 * 34, fy = 0.25 * 0.25 * sy + 2 * 0.25 * 0.75 * 170 + 0.75 * 0.75 * 36;
    // 弧線上 t=0.75 的位置; 飛行素材依終點(資訊列木材)自己算拖尾方向
    var gx = 0.5 * 0.5 * sx + 2 * 0.5 * 0.5 * 70 + 0.5 * 0.5 * 34, gy = 0.5 * 0.5 * sy + 2 * 0.5 * 0.5 * 170 + 0.5 * 0.5 * 36;
    ctx.save(); ctx.globalAlpha = 0.45; matIcon(ctx, 'wood', gx, gy, 16); ctx.restore();
    // 平移讓遊戲內資訊列木材圖示 (36,20) 對到本圖資訊列的木材 (30,22), 拖尾方向才指回終點
    ctx.save(); ctx.translate(-6, 2); drawFlyingMaterial(ctx, { x: fx + 6, y: fy - 2, kind: 'wood', t: 0.5, dur: 0.7 }); ctx.restore();
    circle(ctx, sx, sy, 12); ctx.strokeStyle = P.select; ctx.lineWidth = 2; ctx.stroke();
  }

  function level4Scene(ctx, route) { // 270x190 畫面, 世界 0.3 倍
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 270, 190); ctx.clip();
    ctx.save(); ctx.scale(0.3, 0.3);
    drawBackground(ctx);
    groundRow(ctx, 0, 920, 560, 680, 'plain');
    groundRow(ctx, 160, 240, 480, 560, 'plain');
    groundRow(ctx, 280, 600, 400, 440, 'plain');
    drawPickup(ctx, { x: 340, y: 385, kind: 'wood', t: 0 });
    drawPickup(ctx, { x: 410, y: 385, kind: 'time', t: 0 });
    drawPickup(ctx, { x: 700, y: 545, kind: 'stone', t: 0 });
    drawBoar(ctx, { x: 530, y: 384, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
    drawGoal(ctx, { x: 850, y: 520, reached: false });
    drawPlayer(ctx, { x: 60, y: 538, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
    ctx.restore();
    if (route === 'long') {
      dashedPath(ctx, [[24, 161], [36, 128, 52, 137], [66, 137], [78, 106, 96, 113], [168, 113], [188, 113, 196, 161], [244, 161]], P.select);
    } else {
      dashedPath(ctx, [[24, 161], [36, 128, 52, 137], [66, 137], [76, 137, 86, 161], [244, 161]], P.select);
    }
    ctx.restore();
  }
  function guide3(ctx) { // 560x240
    ctx.save(); level4Scene(ctx, 'long'); ctx.restore();
    ctx.save(); ctx.translate(290, 0); level4Scene(ctx, 'short'); ctx.restore();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 268, 188); ctx.strokeRect(291, 1, 268, 188);
    tag(ctx, '素材多 / 秒數長', 135, 216, 15);
    tag(ctx, '素材少 / 秒數短', 425, 216, 15);
  }

  function cliffScene(ctx, repaired) { // 250x220 畫面, 世界 0.4 倍 (625x550)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 250, 220); ctx.clip();
    ctx.save(); ctx.scale(0.4, 0.4);
    drawBackground(ctx);
    groundRow(ctx, 0, 240, 360, 560, 'plain');
    groundRow(ctx, 480, 640, 360, 560, 'plain');
    groundRow(ctx, 240, 480, 520, 560, 'plain');
    for (var cx = 240; cx < 480; cx += 40) drawWorksite(ctx, { x: cx + 20, y: 500, kind: 'pitRock', repaired: repaired, theme: 'plain', bottom: false });
    drawWorksite(ctx, { x: 220, y: 340, kind: 'ledge', repaired: repaired, theme: 'plain', bottom: false });
    if (!repaired) {
      drawFog(ctx, { x: 480, y: 80, w: 160, h: 280, alpha: 1, t: 0 });
      drawSiteSign(ctx, { x: 150, y: 336, cls: 'sword', role: 'shortcut' });
    } else {
      drawPlayer(ctx, { x: 390, y: 200, cls: 'sword', facing: 1, pose: 'dash', poseT: 0.05, invuln: false });
    }
    ctx.restore();
    if (repaired) {
      ctx.save(); ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(88, 128); ctx.quadraticCurveTo(100, 82, 120, 80); ctx.moveTo(176, 82); ctx.quadraticCurveTo(205, 92, 216, 134);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
    } else {
      matIcon(ctx, 'stone', 20, 198, 24);
    }
    ctx.restore();
  }
  function guide4(ctx) { // 560x220
    ctx.save(); cliffScene(ctx, false); ctx.restore();
    ctx.save(); ctx.translate(310, 0); cliffScene(ctx, true); ctx.restore();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 248, 218); ctx.strokeRect(311, 1, 248, 218);
    // 中間箭頭(圓頭)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    line(ctx, 262, 110, 296, 110, 'rgba(0,0,0,0.5)', 9); line(ctx, 284, 98, 297, 110, 'rgba(0,0,0,0.5)', 9); line(ctx, 284, 122, 297, 110, 'rgba(0,0,0,0.5)', 9);
    line(ctx, 262, 110, 296, 110, '#ffffff', 5); line(ctx, 284, 98, 297, 110, '#ffffff', 5); line(ctx, 284, 122, 297, 110, '#ffffff', 5);
  }

  var GUIDES = [guide0, guide1, guide2, guide3, guide4];
  function drawGuidePage(ctx, st) {
    st = S(st);
    var page = Math.round(num(st.page, 0, 0, GUIDES.length - 1));
    var x = num(st.x), y = num(st.y), w = num(st.w, GUIDE_SIZE[page][0], 1, 4000), h = num(st.h, GUIDE_SIZE[page][1], 1, 4000);
    var vw = GUIDE_SIZE[page][0], vh = GUIDE_SIZE[page][1];
    var k = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
    ctx.scale(k, k);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, vw, vh); ctx.clip();
    GUIDES[page](ctx);
    ctx.restore();
    ctx.restore();
  }

  window.Art = {
    canvas: { width: 1280, height: 720 },
    palette: P,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawLairBack: drawLairBack,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawWorksite: drawWorksite,
    drawVaultDoor: drawVaultDoor,
    drawSiteSign: drawSiteSign,
    drawFog: drawFog,
    drawHookRing: drawHookRing,
    drawNest: drawNest,
    drawPickup: drawPickup,
    drawChest: drawChest,
    drawGoal: drawGoal,
    drawPlayer: drawPlayer,
    drawRangeRing: drawRangeRing,
    drawBoar: drawBoar,
    drawShieldman: drawShieldman,
    drawShooterBee: drawShooterBee,
    drawFrog: drawFrog,
    drawBroodmother: drawBroodmother,
    drawBeeShot: drawBeeShot,
    drawArrow: drawArrow,
    drawBomb: drawBomb,
    drawExplosion: drawExplosion,
    drawShockwave: drawShockwave,
    drawPoof: drawPoof,
    drawPopup: drawPopup,
    drawChainText: drawChainText,
    drawItemIcon: drawItemIcon,
    drawItemNotice: drawItemNotice,
    drawMapLink: drawMapLink,
    drawLevelCard: drawLevelCard,
    drawCardOverlay: drawCardOverlay,
    drawWorkshopCard: drawWorkshopCard,
    drawGoalCard: drawGoalCard,
    drawFlyingMaterial: drawFlyingMaterial,
    drawLevelPanel: drawLevelPanel,
    drawSiteHighlight: drawSiteHighlight,
    drawUpgradePage: drawUpgradePage,
    drawHud: drawHud,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEndingPanel: drawEndingPanel,
    drawGuidePage: drawGuidePage
  };
})();
