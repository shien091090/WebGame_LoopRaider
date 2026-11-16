// 岔路遠征 — 美術(Canvas 2D 幾何繪製, 無外部資源)
// 全域物件 window.Art; 所有函式自己 save/restore。座標除註明為左上角者外皆為判定框中心。
(function () {
  'use strict';

  var W = 1280, H = 720, HUD_H = 40;
  var FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", "Heiti TC", sans-serif';

  // ---------- 色票 ----------
  var P = {
    bg: '#1d2738', bgTop: '#2b3c58', bgHill: '#243149',
    mapBg: '#121925', mapGrid: '#1b2433',
    earth: '#5a4332', earthDark: '#46331f', earthSpeck: '#6b5240', grass: '#5d9c3a', grassLight: '#7cbf52',
    stone: '#7d8796', stoneLight: '#a3adbb', stoneDark: '#3c4350',
    sand: '#c9a56a', sandLight: '#e2c58e', sandDark: '#7a5c30', gap: '#1a120b',
    spikeMetal: '#d9dee5', danger: '#ff3b30', dangerDark: '#8c1a14',
    hook: '#ffd23f', rope: '#c8b48a',
    wood: '#9a5a2c', woodLight: '#e0a868', woodDark: '#45250f',
    iron: '#a9c8dc', ironLight: '#e6f2fa', ironDark: '#25384a',
    gem: '#dd66ff', gemLight: '#f6c8ff', gemDark: '#3d1050',
    sword: '#4f8dff', hunter: '#3fbf68', bomber: '#f0b72f', clsNone: '#8a8f99',
    skin: '#f2c9a0', playerOutline: '#ffffff', legs: '#2b3242',
    enemyOutline: '#1b1216', enemyEye: '#ff3b30',
    boar: '#7b4a33', boarDark: '#4e2c1c', tusk: '#f4ecd8',
    shieldman: '#5d6b80', shield: '#c9d3de', shieldRim: '#e0b040',
    bee: '#f4c430', beeStripe: '#2a1f12', wing: 'rgba(235,245,255,0.75)',
    frog: '#6fb04a', frogBelly: '#c8e39a',
    beeShot: '#ff3b30', arrowShaft: '#f3e7c4', arrowHead: '#dfe6ee',
    bomb: '#22252b', fuse: '#ffcf4a',
    explosion: '#ff9a2e', explosionCore: '#fff2b0',
    poof: '#e4e7ec',
    flagIdle: '#eef6ff', flagReached: '#ffd23f', pole: '#9aa3b0',
    ring: '#3fbf68',
    panel: '#202a3a', panelLight: '#2a364a', panelEdge: '#3b4a62', thumbBg: '#0e131b',
    text: '#f2f5fa', textDim: '#8a93a3', textMute: '#5c6577',
    select: '#fff4b0', afford: '#9ff0a8', hud: 'rgba(10,14,22,0.88)',
    keyFace: '#e8edf5', keyText: '#1a2030', heart: '#ff3b30'
  };

  var KIND = {
    wood: { c: P.wood, l: P.woodLight, d: P.woodDark, name: '木材' },
    iron: { c: P.iron, l: P.ironLight, d: P.ironDark, name: '鐵礦' },
    gem: { c: P.gem, l: P.gemLight, d: P.gemDark, name: '魔晶' }
  };
  var KINDS = ['wood', 'iron', 'gem'];
  var CLS = {
    sword: { c: P.sword, name: '劍士' },
    hunter: { c: P.hunter, name: '獵人' },
    bomber: { c: P.bomber, name: '炸彈工' }
  };

  // ---------- 正規化 ----------
  function N(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function NC(v, d, a, b) { return clamp(N(v, d), a, b); }
  function S(st) { return (st && typeof st === 'object') ? st : {}; }
  function kindOf(k) { return KIND[k] ? k : null; }
  function clsOf(c) { return CLS[c] ? c : null; }
  function face(f) { return N(f, 1) < 0 ? -1 : 1; }
  function f1(v) { return NC(v, 0, -1e7, 1e7).toFixed(1); }
  function resSet(o) { o = S(o); return { wood: NC(o.wood, 0, 0, 1e9), iron: NC(o.iron, 0, 0, 1e9), gem: NC(o.gem, 0, 0, 1e9) }; }
  // 目前變換相對「邏輯畫布」的縮放(扣掉 RD 依 devicePixelRatio 放大的底圖倍率)
  function logicalScale(ctx) {
    try {
      if (ctx.getTransform) {
        var t = ctx.getTransform();
        var k = Math.sqrt(Math.abs(t.a * t.d - t.b * t.c));
        var base = (ctx.canvas && ctx.canvas.width > 0) ? ctx.canvas.width / W : 1;
        var v = k / (base > 0 ? base : 1);
        return isFinite(v) && v > 0 ? v : 1;
      }
    } catch (e) { /* 取不到就當 1 */ }
    return 1;
  }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

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
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 'bold') + ' ' + (o.size || 16) + 'px ' + FONT;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeW || 4;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(String(s), x, y);
    }
    ctx.fillStyle = o.color || P.text;
    ctx.fillText(String(s), x, y);
  }
  function textW(ctx, s, size, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    return ctx.measureText(String(s)).width;
  }
  function hash(x, y, i) {
    var n = Math.sin((x * 12.9898 + y * 78.233 + i * 37.719)) * 43758.5453;
    return n - Math.floor(n);
  }

  // 鍵帽: 左緣 x、垂直中心 y; 回傳寬度
  function keycap(ctx, label, x, y, h, dim) {
    h = h || 26;
    var size = Math.round(h * 0.58);
    var w = Math.max(h, textW(ctx, label, size) + h * 0.55);
    ctx.save();
    rr(ctx, x, y - h / 2 + 2, w, h, 5);
    ctx.fillStyle = '#7d8799'; ctx.fill();
    rr(ctx, x, y - h / 2, w, h - 2, 5);
    ctx.fillStyle = dim ? '#8a93a3' : P.keyFace; ctx.fill();
    txt(ctx, label, x + w / 2, y - 1, { size: size, color: P.keyText, align: 'center' });
    ctx.restore();
    return w;
  }
  // 鍵帽 + 動作字的一列, 置中於 cx
  function keyRow(ctx, items, cx, y, h) {
    var gap = 28, parts = [], total = 0, i;
    var size = Math.round(h * 0.7);
    for (i = 0; i < items.length; i++) {
      var kw = Math.max(h, textW(ctx, items[i][0], Math.round(h * 0.58)) + h * 0.55);
      var tw = textW(ctx, items[i][1], size);
      parts.push([kw, tw]);
      total += kw + 8 + tw + (i ? gap : 0);
    }
    var x = cx - total / 2;
    for (i = 0; i < items.length; i++) {
      if (i) x += gap;
      keycap(ctx, items[i][0], x, y, h);
      x += parts[i][0] + 8;
      txt(ctx, items[i][1], x, y, { size: size, color: P.text });
      x += parts[i][1];
    }
  }

  // ---------- 素材小圖示(遊戲內、HUD、浮字、卡片共用同一本字典) ----------
  function resIcon(ctx, kind, x, y, s) {
    var K = KIND[kind];
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.2, s * 0.08);
    if (!K) {
      circle(ctx, 0, 0, s * 0.35);
      ctx.fillStyle = '#6b7280'; ctx.fill();
      ctx.restore();
      return;
    }
    if (kind === 'wood') { // 橫放圓木: 圓角長條 + 右端年輪
      var w = s * 0.92, h = s * 0.56;
      rr(ctx, -w / 2, -h / 2, w, h, h * 0.45);
      ctx.fillStyle = K.c; ctx.fill();
      ctx.strokeStyle = K.d; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w * 0.32, -h * 0.12); ctx.lineTo(w * 0.1, -h * 0.12);
      ctx.strokeStyle = 'rgba(40,20,8,0.55)'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(w / 2 - h * 0.32, 0, h * 0.3, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = K.l; ctx.fill(); ctx.strokeStyle = K.d; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(w / 2 - h * 0.32, 0, h * 0.12, h * 0.17, 0, 0, Math.PI * 2);
      ctx.strokeStyle = K.c; ctx.stroke();
    } else if (kind === 'iron') { // 礦塊: 六角塊 + 亮切面
      var r = s * 0.46, pts = [], i;
      for (i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.88]); }
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = K.c; ctx.fill(); ctx.strokeStyle = K.d; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pts[3][0] * 0.6, pts[3][1] * 0.6); ctx.lineTo(pts[4][0] * 0.6, pts[4][1] * 0.6);
      ctx.lineTo(pts[5][0] * 0.6, pts[5][1] * 0.6); ctx.lineTo(0, 0); ctx.closePath();
      ctx.fillStyle = K.l; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.35); ctx.lineTo(r * 0.15, r * 0.2);
      ctx.strokeStyle = 'rgba(37,56,74,0.6)'; ctx.stroke();
    } else { // 魔晶: 直立菱形結晶
      var hw = s * 0.36, hh = s * 0.48;
      ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(hw, -hh * 0.2); ctx.lineTo(0, hh); ctx.lineTo(-hw, -hh * 0.2); ctx.closePath();
      ctx.fillStyle = K.c; ctx.fill(); ctx.strokeStyle = K.d; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(hw * 0.45, -hh * 0.2); ctx.lineTo(0, hh * 0.35); ctx.lineTo(-hw * 0.45, -hh * 0.2); ctx.closePath();
      ctx.fillStyle = K.l; ctx.fill();
    }
    ctx.restore();
  }

  // 職業頭像小圖示(HUD、卡片、結算共用)
  function clsIcon(ctx, cls, x, y, s) {
    var C = CLS[cls];
    var col = C ? C.c : P.clsNone;
    ctx.save();
    ctx.translate(x, y);
    var k = s / 24;
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    circle(ctx, 0, 0, 11.5); ctx.fillStyle = '#121822'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
    circle(ctx, 0, 2, 6); ctx.fillStyle = P.skin; ctx.fill();
    ctx.fillStyle = col;
    if (cls === 'sword') {
      ctx.beginPath(); ctx.arc(0, 1.5, 7, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
      ctx.fillRect(-1, -9, 2, 4);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.moveTo(-7.5, 4); ctx.quadraticCurveTo(-7, -7, 1, -9); ctx.lineTo(7, -2); ctx.quadraticCurveTo(2, -3, -3, 3); ctx.closePath(); ctx.fill();
    } else if (cls === 'bomber') {
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
      ctx.fillRect(-9, -0.5, 18, 2);
    }
    circle(ctx, 2.5, 2.5, 1.2); ctx.fillStyle = '#1a1a1a'; ctx.fill();
    ctx.restore();
  }

  // 花費列(只畫 >0 的種類); 左緣 x、中心 y; 回傳寬度
  function costRow(ctx, cost, x, y, size, ok) {
    cost = resSet(cost);
    var cx = x;
    ctx.save();
    for (var i = 0; i < 3; i++) {
      var k = KINDS[i];
      if (!(cost[k] > 0)) continue;
      ctx.globalAlpha = ok ? 1 : 0.55;
      resIcon(ctx, k, cx + size / 2, y, size);
      ctx.globalAlpha = 1;
      var s = String(Math.round(cost[k]));
      txt(ctx, s, cx + size + 4, y, { size: size, color: ok ? P.text : P.textDim });
      cx += size + 4 + textW(ctx, s, size) + 14;
    }
    ctx.restore();
    return cx - x;
  }
  function costWidth(ctx, cost, size) {
    cost = resSet(cost);
    var w = 0;
    for (var i = 0; i < 3; i++) { var k = KINDS[i]; if (cost[k] > 0) w += size + 4 + textW(ctx, String(Math.round(cost[k])), size) + 14; }
    return Math.max(0, w - 14);
  }
  function affordTag(ctx, ok, x, y, size, align) {
    txt(ctx, ok ? '可購買' : '素材不足', x, y, { size: size, color: ok ? P.afford : P.textDim, align: align || 'left', weight: ok ? 'bold' : 'normal' });
  }
  function lockIcon(ctx, x, y, s, col) {
    ctx.save();
    ctx.translate(x, y);
    var k = s / 24; ctx.scale(k, k);
    ctx.lineWidth = 3; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, Math.PI * 2); ctx.lineTo(6, 1); ctx.moveTo(-6, 1); ctx.lineTo(-6, -3); ctx.stroke();
    rr(ctx, -9, 0, 18, 12, 2); ctx.fillStyle = col; ctx.fill();
    circle(ctx, 0, 5, 1.8); ctx.fillStyle = '#121822'; ctx.fill();
    ctx.restore();
  }
  function selFrame(ctx, x, y, w, h, r) {
    ctx.save();
    rr(ctx, x - 4, y - 4, w + 8, h + 8, (r || 10) + 4);
    ctx.lineWidth = 3; ctx.strokeStyle = P.select; ctx.stroke();
    ctx.restore();
  }
  function panelBase(ctx, x, y, w, h, edge, fill) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = fill || P.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = edge || P.panelEdge;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 9); ctx.stroke();
  }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.bgTop); g.addColorStop(1, P.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 遠山剪影(低對比, 不標示層)
    ctx.fillStyle = P.bgHill;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 520 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.017) * 18);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var i = 0; i < 40; i++) { circle(ctx, hash(i, 1, 2) * W, 50 + hash(i, 3, 4) * 300, 1 + hash(i, 5, 6)); ctx.fill(); }
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16202f'); g.addColorStop(1, P.mapBg);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = P.mapGrid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 40; x < W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (var y = 40; y < H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 地形與機關 ----------
  function drawGround(ctx, st) {
    st = S(st);
    var x = N(st.x, 0) - 20, y = N(st.y, 0) - 20;
    ctx.save();
    ctx.fillStyle = P.earth; ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = P.earthSpeck;
    for (var i = 0; i < 4; i++) {
      var hx = hash(x, y, i), hy = hash(y, x, i + 9);
      ctx.fillRect(x + 4 + hx * 30, y + 10 + hy * 26, 3, 2);
    }
    ctx.fillStyle = P.earthDark;
    ctx.fillRect(x, y + 38, 40, 2);
    ctx.fillRect(x + 38, y, 2, 40);
    if (st.top === true) {
      ctx.fillStyle = P.grass; ctx.fillRect(x, y, 40, 8);
      ctx.fillStyle = P.grassLight; ctx.fillRect(x, y, 40, 3);
      ctx.fillStyle = P.grass;
      for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x + 5 + j * 10, y + 8, 3.5, 0, Math.PI); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    ctx.save();
    // 只畫下半 40x20
    ctx.fillStyle = '#3a3f48'; ctx.fillRect(x - 20, y + 16, 40, 4);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.5;
    for (var i = 0; i < 4; i++) {
      var bx = x - 20 + i * 10;
      ctx.beginPath(); ctx.moveTo(bx + 1, y + 16); ctx.lineTo(bx + 5, y + 1.5); ctx.lineTo(bx + 9, y + 16); ctx.closePath();
      ctx.fillStyle = P.spikeMetal; ctx.fill(); ctx.strokeStyle = P.dangerDark; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 3.3, y + 7.5); ctx.lineTo(bx + 5, y + 1.5); ctx.lineTo(bx + 6.7, y + 7.5); ctx.closePath();
      ctx.fillStyle = P.danger; ctx.fill();
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = S(st);
    var x = N(st.x, 0) - 20, y = N(st.y, 0) - 20;
    ctx.save();
    ctx.fillStyle = P.stone; ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = P.stoneLight; ctx.fillRect(x, y, 40, 3); ctx.fillRect(x, y, 3, 40);
    ctx.fillStyle = P.stoneDark; ctx.fillRect(x, y + 37, 40, 3); ctx.fillRect(x + 37, y, 3, 40);
    // 粗裂痕(閃電狀, 貫穿整塊)
    ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 3); ctx.lineTo(x + 16, y + 13); ctx.lineTo(x + 24, y + 20); ctx.lineTo(x + 14, y + 30); ctx.lineTo(x + 19, y + 37);
    ctx.moveTo(x + 24, y + 20); ctx.lineTo(x + 35, y + 24);
    ctx.moveTo(x + 16, y + 13); ctx.lineTo(x + 5, y + 10);
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#1c2028'; ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.moveTo(x + 23.5, y + 4); ctx.lineTo(x + 17.5, y + 13.5); ctx.lineTo(x + 25.5, y + 20); ctx.stroke();
    ctx.restore();
  }

  function drawBrittleFloor(ctx, st) {
    st = S(st);
    var x = N(st.x, 0) - 20, y = N(st.y, 0) - 20;
    ctx.save();
    ctx.fillStyle = P.gap; ctx.fillRect(x, y, 40, 40);
    // 一塊塊鬆動的碎片, 之間有黑縫
    var chunks = [
      [[1, 1], [17, 1], [15, 14], [1, 16]],
      [[19, 1], [39, 1], [39, 12], [17, 15]],
      [[1, 18], [16, 16], [20, 27], [1, 30]],
      [[18, 17], [39, 14], [39, 28], [22, 27]],
      [[1, 32], [21, 29], [24, 39], [1, 39]],
      [[24, 29], [39, 30], [39, 39], [26, 39]]
    ];
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i];
      ctx.beginPath(); ctx.moveTo(x + c[0][0], y + c[0][1]);
      for (var j = 1; j < c.length; j++) ctx.lineTo(x + c[j][0], y + c[j][1]);
      ctx.closePath();
      ctx.fillStyle = (i % 2) ? P.sand : '#bf9a5e'; ctx.fill();
    }
    ctx.fillStyle = P.sandLight;
    ctx.fillRect(x + 3, y + 3, 10, 2); ctx.fillRect(x + 21, y + 3, 12, 2);
    ctx.fillStyle = P.sandDark;
    for (var k = 0; k < 7; k++) { circle(ctx, x + 4 + hash(k, x, 1) * 32, y + 6 + hash(k, y, 2) * 30, 1.2); ctx.fill(); }
    ctx.restore();
  }

  function drawHookRing(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    ctx.save();
    // 吊繩: 從環頂往上 20px(框外上方)
    ctx.strokeStyle = P.rope; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y - 31); ctx.stroke();
    circle(ctx, x, y, 9);
    ctx.lineWidth = 5; ctx.strokeStyle = '#3a2a08'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = P.hook; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 9, -2.4, -1.4); ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff6c8'; ctx.stroke();
    ctx.restore();
  }

  function drawPickup(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), t = NC(st.t, 0, 0, 1e7);
    var bob = Math.sin(t * 3) * 1;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y + 10.5, 7, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    resIcon(ctx, kindOf(st.kind), x, y - 0.5 + bob, 19);
    // 閃光(在框內)
    var ph = (t * 0.8) % 1;
    if (ph < 0.25 && kindOf(st.kind)) {
      var a = 1 - ph / 0.25;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 7, y - 11); ctx.lineTo(x + 7, y - 5); ctx.moveTo(x + 4, y - 8); ctx.lineTo(x + 10, y - 8); ctx.stroke();
    }
    ctx.restore();
  }

  function drawGoal(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), on = st.reached === true;
    ctx.save();
    // 底座
    ctx.fillStyle = '#4a5160'; rr(ctx, x - 12, y + 34, 24, 6, 2); ctx.fill();
    // 旗桿
    ctx.fillStyle = P.pole; ctx.fillRect(x - 12, y - 36, 4, 70);
    circle(ctx, x - 10, y - 36, 3.5); ctx.fillStyle = on ? P.flagReached : '#d0d6de'; ctx.fill();
    // 旗面
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 8, y - 32); ctx.lineTo(x + 19, y - 24); ctx.lineTo(x - 8, y - 12); ctx.closePath();
    ctx.fillStyle = on ? P.flagReached : P.flagIdle; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#7a5a00' : '#5d6878'; ctx.stroke();
    if (on) {
      ctx.fillStyle = '#fff6c8';
      star(ctx, x + 2, y - 23, 4.5, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,210,63,0.9)';
      star(ctx, x + 12, y - 2, 4, 1.6); ctx.fill();
      star(ctx, x + 4, y + 14, 3, 1.2); ctx.fill();
    } else {
      ctx.fillStyle = '#5d6878';
      circle(ctx, x + 1, y - 23, 2.5); ctx.fill();
    }
    ctx.restore();
  }
  function star(ctx, x, y, R, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rad = (i % 2) ? r : R;
      if (i) ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); else ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  function drawRangeRing(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), r = NC(st.radius, 260, 0, 4000);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2; ctx.strokeStyle = P.ring;
    circle(ctx, x, y, Math.max(0, r - 1)); ctx.stroke();
    ctx.restore();
  }

  // ---------- 玩家 ----------
  // 以原點為判定框中心、面向右畫; 框 28x44 => x ±14, y ±22
  function playerFigure(ctx, cls, pose, pt, hurt) {
    var C = CLS[cls];
    var col = C ? C.c : P.clsNone;
    var legLen = 9.5, lA = 0, lB = 0;
    if (pose === 'run') { var s = Math.sin(pt * 16); lA = s * 3.5; lB = -s * 3.5; }
    else if (pose === 'rise' || pose === 'blast' || pose === 'hook') { legLen = 6.5; lA = 2; lB = -1.5; }
    else if (pose === 'fall') { lA = 3.5; lB = -3; }
    else if (pose === 'dash') { lA = 3.5; lB = -3.5; }
    else if (pose === 'hurt') { lA = -2; lB = -4; }
    var parts = [];
    // 腿
    parts.push(function () { ctx.beginPath(); ctx.rect(-6 + lB, 11, 5, legLen); return P.legs; });
    parts.push(function () { ctx.beginPath(); ctx.rect(1 + lA, 11, 5, legLen); return P.legs; });
    // 職業背後配件
    if (cls === 'bomber') parts.push(function () { circle(ctx, -8.8, 4, 3.5); return '#22252b'; });
    if (cls === 'hunter') parts.push(function () { ctx.beginPath(); ctx.rect(-11.5, -6, 4, 12); return '#7a5530'; });
    // 身體
    parts.push(function () { rr(ctx, -8, -5, 16, 16, 4); return col; });
    // 頭
    parts.push(function () { circle(ctx, 0, -12, 7.5); return P.skin; });
    // 帽子
    if (cls === 'sword') {
      parts.push(function () { ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, Math.PI * 2); ctx.lineTo(8, -10); ctx.lineTo(-8, -10); ctx.closePath(); return col; });
      parts.push(function () { ctx.beginPath(); ctx.rect(-1.2, -20.5, 2.4, 3); return '#dfe6ee'; });
    } else if (cls === 'hunter') {
      parts.push(function () { ctx.beginPath(); ctx.moveTo(-8.5, -5); ctx.quadraticCurveTo(-9, -18, 0, -20); ctx.quadraticCurveTo(7, -19.5, 8.2, -13); ctx.quadraticCurveTo(2, -15, -2, -7); ctx.closePath(); return '#2e8f4e'; });
    } else if (cls === 'bomber') {
      parts.push(function () { ctx.beginPath(); ctx.ellipse(0, -14, 8.5, 6, 0, Math.PI, Math.PI * 2); ctx.closePath(); return col; });
      parts.push(function () { ctx.beginPath(); ctx.rect(-10, -14.5, 20, 2.5); return '#c48a10'; });
    }
    // 武器(框內)
    var weapon = null;
    if (cls === 'sword') {
      if (pose === 'slash' || pose === 'dash') weapon = function () { ctx.beginPath(); ctx.rect(5, -1.5, 8, 3); return '#e9f1fb'; };
      else weapon = function () { ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(11, -9); ctx.lineTo(12.5, -8.4); ctx.lineTo(7.8, 4.6); ctx.closePath(); return '#e9f1fb'; };
    } else if (cls === 'hunter') {
      weapon = function () { ctx.beginPath(); ctx.arc(4, 1, 8, -1.2, 1.2); ctx.lineWidth = 2.2; return 'STROKE:#c08850'; };
    } else if (cls === 'bomber' && pose === 'throw') {
      weapon = function () { circle(ctx, 9, -6, 3); return '#f0b72f'; };
    }
    var i, fill;
    // 第一輪: 白外框(玩家專屬類別記號)
    ctx.lineJoin = 'round';
    for (i = 0; i < parts.length; i++) {
      parts[i]();
      ctx.lineWidth = 3; ctx.strokeStyle = P.playerOutline; ctx.stroke();
    }
    for (i = 0; i < parts.length; i++) {
      fill = parts[i]();
      ctx.fillStyle = fill; ctx.fill();
    }
    if (weapon) {
      fill = weapon();
      if (fill.indexOf('STROKE:') === 0) {
        ctx.strokeStyle = fill.slice(7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4 + Math.cos(-1.2) * 8, 1 + Math.sin(-1.2) * 8); ctx.lineTo(4 + Math.cos(1.2) * 8, 1 + Math.sin(1.2) * 8);
        ctx.lineWidth = 0.8; ctx.strokeStyle = '#f3e7c4'; ctx.stroke();
        if (pose === 'shoot') {
          ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(13, 1); ctx.lineWidth = 1.5; ctx.strokeStyle = P.arrowShaft; ctx.stroke();
        }
      } else { ctx.fillStyle = fill; ctx.fill(); }
    }
    // 眼睛
    if (hurt) {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(1.8, -14); ctx.lineTo(5, -10.5); ctx.moveTo(5, -14); ctx.lineTo(1.8, -10.5); ctx.stroke();
      // 受傷紅染(紅 = 扣血)
      rr(ctx, -8, -5, 16, 16, 4); ctx.fillStyle = 'rgba(255,59,48,0.55)'; ctx.fill();
    } else {
      circle(ctx, 3.6, -12, 1.6); ctx.fillStyle = '#1a1a1a'; ctx.fill();
    }
  }

  function drawPlayer(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), f = face(st.facing);
    var cls = clsOf(st.cls);
    var pose = typeof st.pose === 'string' ? st.pose : 'idle';
    var pt = NC(st.poseT, 0, 0, 1e7);
    ctx.save();
    if (st.invuln === true && Math.floor(now() / 90) % 2 === 0) ctx.globalAlpha = 0.3;
    ctx.translate(x, y);
    ctx.scale(f, 1);
    // 衝刺斬速度線: 衝刺反方向框外至多 60px
    if (pose === 'dash') {
      ctx.save();
      ctx.lineCap = 'butt';
      var ys = [-12, -2, 8, 16];
      for (var i = 0; i < ys.length; i++) {
        var len = [56, 44, 58, 34][i];
        var g = ctx.createLinearGradient(-14, 0, -14 - len, 0);
        g.addColorStop(0, 'rgba(191,228,255,0.9)'); g.addColorStop(1, 'rgba(191,228,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-15, ys[i]); ctx.lineTo(-14 - len, ys[i]); ctx.stroke();
      }
      ctx.restore();
    }
    playerFigure(ctx, cls, pose, pt, pose === 'hurt');
    // 揮砍刀光: 面向側框外 50x40, 貼框側邊、與身體中心同高, 持續 0.15 秒
    if (pose === 'slash' && pt < 0.15) {
      var p = pt / 0.15;
      ctx.save();
      ctx.globalAlpha = 1 - p * 0.7;
      ctx.beginPath();
      ctx.ellipse(14, 0, 48, 19, 0, -Math.PI / 2, Math.PI / 2);
      ctx.ellipse(14, 0, 28, 11, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(14, 0, 48, 19, 0, -Math.PI / 2, Math.PI / 2);
      ctx.lineWidth = 2; ctx.strokeStyle = '#7cc4ff'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- 怪物(共同類別記號: 深色外框 + 紅眼) ----------
  function enemyFill(hit, c) { return hit ? '#ffffff' : c; }
  function enemyEye(ctx, x, y, r) {
    circle(ctx, x, y, r); ctx.fillStyle = P.enemyEye; ctx.fill();
    circle(ctx, x + r * 0.3, y - r * 0.3, r * 0.35); ctx.fillStyle = '#ffd0cc'; ctx.fill();
  }

  // 野豬 48x32, 底邊貼地: 框 x ±24, y ±16
  function drawBoar(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), f = face(st.facing), hit = st.hit === true;
    var mode = st.state, t = NC(st.t, 0, 0, 1e7);
    if (mode !== 'windup' && mode !== 'charge' && mode !== 'stun') mode = 'walk';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);
    ctx.lineJoin = 'round';
    var bodyX = 0, bodyY = 2, headY = -1, leg = Math.sin(t * 12) * 2.5, legsOut = 0;
    if (mode === 'windup') { bodyX = -1 + Math.sin(t * 60) * 0.8; bodyY = 4; headY = 5; leg = 0; }
    if (mode === 'charge') { bodyX = 0; bodyY = 1; headY = 2; legsOut = 3; leg = Math.sin(t * 30) * 3; }
    if (mode === 'stun') { leg = 0; bodyY = 3; }
    // 衝撞: 身後速度線(框內後段)
    if (mode === 'charge') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-23, -6); ctx.lineTo(-15, -6); ctx.moveTo(-23, 2); ctx.lineTo(-13, 2); ctx.moveTo(-22, 9); ctx.lineTo(-16, 9); ctx.stroke();
    }
    // 預備: 後腳刨起的土
    if (mode === 'windup') {
      ctx.fillStyle = 'rgba(200,170,130,0.85)';
      var ph = (t * 6) % 1;
      circle(ctx, -15 - ph * 4, 12 - ph * 6, 2.5); ctx.fill();
      circle(ctx, -14 - ph * 3, 13 - ph * 3, 2); ctx.fill();
    }
    // 腿
    ctx.fillStyle = enemyFill(hit, P.boarDark);
    ctx.fillRect(bodyX - 13 + leg - legsOut, 10, 5, 6);
    ctx.fillRect(bodyX + 7 - leg + legsOut, 10, 5, 6);
    // 身體
    ctx.beginPath(); ctx.ellipse(bodyX - 2, bodyY, 17, 10.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = enemyFill(hit, P.boar); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.enemyOutline; ctx.stroke();
    // 鬃毛
    ctx.beginPath(); ctx.moveTo(bodyX - 14, bodyY - 7); ctx.lineTo(bodyX - 6, bodyY - 12); ctx.lineTo(bodyX + 2, bodyY - 11); ctx.lineTo(bodyX + 8, bodyY - 7);
    ctx.lineWidth = 3; ctx.strokeStyle = enemyFill(hit, P.boarDark); ctx.stroke();
    // 頭
    var hx = bodyX + 14;
    ctx.beginPath(); ctx.ellipse(hx, headY, 8.5, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = enemyFill(hit, P.boar); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.enemyOutline; ctx.stroke();
    // 鼻
    rr(ctx, hx + 5, headY - 1, 5, 6, 2); ctx.fillStyle = enemyFill(hit, '#c98a70'); ctx.fill();
    // 獠牙
    ctx.beginPath(); ctx.moveTo(hx + 4, headY + 4); ctx.quadraticCurveTo(hx + 9, headY + 5, hx + 9, headY); ctx.lineWidth = 2; ctx.strokeStyle = P.tusk; ctx.stroke();
    // 眼
    if (mode === 'stun') {
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(hx + 1, headY - 3, 2.2, 0, Math.PI * 1.6); ctx.stroke();
      // 頭上星星: 框外上方至多 20px
      for (var i = 0; i < 3; i++) {
        var a = t * 5 + i * Math.PI * 2 / 3;
        ctx.fillStyle = '#ffe24a';
        star(ctx, hx - 4 + Math.cos(a) * 9, -26 + Math.sin(a) * 3, 4, 1.7); ctx.fill();
      }
    } else {
      enemyEye(ctx, hx + 1, headY - 3, mode === 'windup' ? 2.6 : 2);
      if (mode === 'windup' || mode === 'charge') {
        ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(hx - 3, headY - 7); ctx.lineTo(hx + 4, headY - 5); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 盾兵 32x44: 框 x ±16, y ±22; 盾在面向側
  function drawShieldman(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), f = face(st.facing), hit = st.hit === true;
    var mode = st.state === 'block' ? 'block' : 'walk', t = NC(st.t, 0, 0, 1e7);
    var leg = mode === 'walk' ? Math.sin(t * 6) * 2.5 : 0;
    ctx.save();
    ctx.translate(x, y); ctx.scale(f, 1);
    ctx.lineJoin = 'round';
    ctx.fillStyle = enemyFill(hit, '#3a4352');
    ctx.fillRect(-9 + leg, 12, 6, 10); ctx.fillRect(0 - leg, 12, 6, 10);
    rr(ctx, -11, -6, 18, 20, 4); ctx.fillStyle = enemyFill(hit, P.shieldman); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.enemyOutline; ctx.stroke();
    // 頭盔
    circle(ctx, -2, -13, 8); ctx.fillStyle = enemyFill(hit, '#4a5568'); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-1, -15, 8, 3.5);
    enemyEye(ctx, 3.5, -13.3, 1.6);
    // 盾(面向側, 大而亮)
    var flash = mode === 'block';
    rr(ctx, 4, -17, 10, 36, 4);
    ctx.fillStyle = flash ? '#ffffff' : P.shield; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = flash ? '#fff4b0' : P.shieldRim; ctx.stroke();
    ctx.fillStyle = flash ? '#fff4b0' : P.shieldRim;
    circle(ctx, 9, 1, 2.5); ctx.fill();
    if (flash) {
      ctx.strokeStyle = '#fff4b0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(15, -12); ctx.lineTo(15, -4); ctx.moveTo(15, 6); ctx.lineTo(15, 14); ctx.stroke();
    }
    ctx.restore();
  }

  // 射手蜂 32x32: 框 ±16
  function drawShooterBee(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), f = face(st.facing), hit = st.hit === true;
    var aim = st.state === 'aim', t = NC(st.t, 0, 0, 1e7);
    ctx.save();
    ctx.translate(x, y); ctx.scale(f, 1);
    ctx.lineJoin = 'round';
    // 翅膀
    var flap = Math.sin(t * 40) * 0.35;
    ctx.fillStyle = P.wing;
    ctx.beginPath(); ctx.ellipse(-3, -8, 4.5, 6.5, -0.4 + flap, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, -8, 3.5, 5.5, 0.4 - flap, 0, Math.PI * 2); ctx.fill();
    // 身體
    ctx.beginPath(); ctx.ellipse(-1, 2, 11, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = enemyFill(hit, P.bee); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = enemyFill(hit, P.beeStripe);
    ctx.fillRect(-7, -8, 3.5, 20); ctx.fillRect(0, -8, 3.5, 20);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(-1, 2, 11, 9, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = P.enemyOutline; ctx.stroke();
    // 頭
    circle(ctx, 9, -1, 5.5); ctx.fillStyle = enemyFill(hit, P.bee); ctx.fill(); ctx.stroke();
    enemyEye(ctx, 10.5, -2.5, 1.8);
    // 尾針(面向側下方)
    ctx.beginPath(); ctx.moveTo(-11, 2); ctx.lineTo(-15, 4); ctx.lineTo(-11, 6); ctx.closePath();
    ctx.fillStyle = '#1a1a1a'; ctx.fill();
    // 瞄準: 嘴前紅色蓄力點 + 收攏細環
    if (aim) {
      var ph = (t * 2.5) % 1;
      circle(ctx, 11, 6, 2.2 + ph * 0.6); ctx.fillStyle = P.danger; ctx.fill();
      circle(ctx, 11, 6, 2.5 + (1 - ph) * 1.6); ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(255,59,48,0.9)'; ctx.stroke();
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(7, -7); ctx.lineTo(12, -5); ctx.stroke();
    }
    ctx.restore();
  }

  // 跳蛙 32x28: 框 x ±16, y ±14
  function drawFrog(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), f = face(st.facing), hit = st.hit === true;
    var jump = st.state === 'jump';
    ctx.save();
    ctx.translate(x, y); ctx.scale(f, 1);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2; ctx.strokeStyle = P.enemyOutline;
    if (!jump) {
      // 蹲: 寬扁
      ctx.fillStyle = enemyFill(hit, '#4f8a32');
      ctx.beginPath(); ctx.ellipse(-9, 10, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, 10, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 4, 14, 8.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = enemyFill(hit, P.frog); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(2, 7, 8, 4, 0, 0, Math.PI * 2); ctx.fillStyle = enemyFill(hit, P.frogBelly); ctx.fill();
      circle(ctx, 2, -5, 4.2); ctx.fillStyle = enemyFill(hit, P.frog); ctx.fill(); ctx.stroke();
      circle(ctx, 9, -5, 4.2); ctx.fill(); ctx.stroke();
      enemyEye(ctx, 3, -5.5, 1.8); enemyEye(ctx, 10, -5.5, 1.8);
      ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(13, 3); ctx.lineWidth = 1.3; ctx.stroke();
    } else {
      // 跳: 拉長, 後腿往後下伸直
      ctx.strokeStyle = enemyFill(hit, '#4f8a32'); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(-11, 10); ctx.lineTo(-13, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, 5); ctx.lineTo(-6, 11); ctx.lineTo(-7, 12); ctx.stroke();
      ctx.lineCap = 'butt'; ctx.lineWidth = 2; ctx.strokeStyle = P.enemyOutline;
      ctx.beginPath(); ctx.ellipse(1, -1, 11, 7, -0.45, 0, Math.PI * 2);
      ctx.fillStyle = enemyFill(hit, P.frog); ctx.fill(); ctx.stroke();
      circle(ctx, 7, -8, 3.8); ctx.fillStyle = enemyFill(hit, P.frog); ctx.fill(); ctx.stroke();
      enemyEye(ctx, 8, -8.5, 1.7);
      ctx.strokeStyle = enemyFill(hit, '#4f8a32'); ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(12, 5); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 飛行物 ----------
  function drawBeeShot(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    ctx.save();
    circle(ctx, x, y, 5.2);
    ctx.fillStyle = P.beeShot; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a0a06'; ctx.stroke();
    circle(ctx, x - 1, y - 1, 2); ctx.fillStyle = '#ffe08a'; ctx.fill();
    ctx.restore();
  }

  function drawArrow(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), a = N(st.angle, 0);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(6, 0); ctx.lineWidth = 2; ctx.strokeStyle = P.arrowShaft; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.closePath(); ctx.fillStyle = P.arrowHead; ctx.fill();
    ctx.fillStyle = P.hunter;
    ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-7, 0); ctx.lineTo(-12, 3); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBomb(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), t = NC(st.t, 0, 0, 1e7);
    ctx.save();
    ctx.translate(x, y);
    circle(ctx, 0, 1.2, 5.8); ctx.fillStyle = P.bomb; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#f0b72f'; ctx.stroke();
    circle(ctx, -2, -0.5, 1.6); ctx.fillStyle = '#6a707a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(1.5, -4); ctx.quadraticCurveTo(3.5, -5, 3, -5.5); ctx.lineWidth = 1.5; ctx.strokeStyle = '#b8a07a'; ctx.stroke();
    var fl = 1.2 + Math.abs(Math.sin(t * 30)) * 1;
    circle(ctx, 3, -5.5, fl); ctx.fillStyle = P.fuse; ctx.fill();
    ctx.restore();
  }

  function drawExplosion(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    var dur = NC(st.dur, 0.25, 0.01, 100), t = NC(st.t, 0, 0, 1e7);
    var R = NC(st.radius, 60, 0, 60);
    if (t >= dur) return;
    var p = t / dur;
    var grow = Math.min(1, p / 0.35);
    var r = R * (0.45 + 0.55 * (1 - Math.pow(1 - grow, 2)));
    var a = p < 0.4 ? 1 : 1 - (p - 0.4) / 0.6;
    ctx.save();
    ctx.globalAlpha = a;
    circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,154,46,0.55)'; ctx.fill();
    circle(ctx, x, y, r * 0.55 * (1 - p * 0.5)); ctx.fillStyle = P.explosionCore; ctx.fill();
    circle(ctx, x, y, Math.max(0, r - 2)); ctx.lineWidth = 4; ctx.strokeStyle = P.explosion; ctx.stroke();
    ctx.restore();
  }

  function drawPoof(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    var dur = NC(st.dur, 0.3, 0.01, 100), t = NC(st.t, 0, 0, 1e7);
    if (t >= dur) return;
    var p = t / dur;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = P.poof;
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 + 0.3;
      var d = 4 + p * 11, r = 6 + p * 2;
      circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r); ctx.fill();
    }
    circle(ctx, x, y, 7 * (1 - p)); ctx.fill();
    ctx.fillStyle = '#9aa3b0';
    for (var j = 0; j < 4; j++) {
      var b = j * Math.PI / 2 + 0.8, dd = 8 + p * 13;
      ctx.fillRect(x + Math.cos(b) * dd - 1.5, y + Math.sin(b) * dd - 1.5, 3, 3);
    }
    ctx.restore();
  }

  // 「+N」浮字: 起點中心 x,y, 0.8 秒上移 30px 淡出
  function drawPopup(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    var dur = NC(st.dur, 0.8, 0.01, 100), t = NC(st.t, 0, 0, 1e7);
    if (t >= dur) return;
    var p = t / dur;
    var kind = kindOf(st.kind);
    var v = Math.round(NC(st.value, 1, -999, 999));
    var yy = y - 30 * (1 - Math.pow(1 - p, 2));
    ctx.save();
    // 縮圖補償: RD 以 scale(0.3) 重用本函式時, 浮字以起點為錨放大, 讓畫面字級約 12px 以上
    var kl = logicalScale(ctx);
    if (kl < 0.6) {
      var m = Math.min(2.2, 0.66 / Math.max(kl, 0.01));
      ctx.translate(x, y); ctx.scale(m, m); ctx.translate(-x, -y);
    }
    ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    resIcon(ctx, kind, x - 15, yy, 18);
    txt(ctx, '+' + v, x - 4, yy, { size: 19, color: kind ? KIND[kind].l : P.text, stroke: '#10141c', strokeW: 4 });
    ctx.restore();
  }

  // ---------- 大地圖卡片 ----------
  function drawLevelCard(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    var state = (st.state === 'open' || st.state === 'cleared') ? st.state : 'locked';
    var name = st.name == null ? '' : String(st.name);
    var idx = Math.round(NC(st.index, 1, 0, 99));
    var ok = st.canAfford === true;
    ctx.save();
    panelBase(ctx, x, y, 400, 290, state === 'cleared' ? '#4f6a8f' : P.panelEdge, state === 'locked' ? '#1a2130' : P.panel);
    // 縮圖區外框(RD 之後畫縮圖)
    ctx.fillStyle = P.thumbBg; ctx.fillRect(x + 8, y + 8, 384, 216);
    if (state === 'locked') {
      lockIcon(ctx, x + 200, y + 84, 44, ok ? P.text : P.textMute);
      txt(ctx, '解鎖', x + 200, y + 128, { size: 18, color: ok ? P.text : P.textDim, align: 'center' });
      var cw = costWidth(ctx, st.cost, 20);
      costRow(ctx, st.cost, x + 200 - cw / 2, y + 162, 20, ok);
      affordTag(ctx, ok, x + 200, y + 196, 16, 'center');
    }
    ctx.lineWidth = 2; ctx.strokeStyle = state === 'locked' ? '#2c3648' : '#55688a';
    ctx.strokeRect(x + 7, y + 7, 386, 218);
    // 文字區
    var dim = state === 'locked';
    rr(ctx, x + 14, y + 234, 30, 26, 6); ctx.fillStyle = dim ? '#2c3648' : '#3b4a62'; ctx.fill();
    txt(ctx, idx, x + 29, y + 247, { size: 18, color: dim ? P.textDim : P.text, align: 'center' });
    txt(ctx, name, x + 54, y + 247, { size: 20, color: dim ? P.textDim : P.text });
    if (state === 'cleared') {
      var rc = clsOf(st.recordCls);
      clsIcon(ctx, rc, x + 290, y + 247, 22);
      txt(ctx, f1(st.recordTime) + ' 秒', x + 386, y + 247, { size: 18, color: P.text, align: 'right' });
      var rates = resSet(st.rates);
      for (var i = 0; i < 3; i++) {
        var k = KINDS[i], v = rates[k], gx = x + 16 + i * 126;
        ctx.save();
        if (!(v > 0)) ctx.globalAlpha = 0.5;
        resIcon(ctx, k, gx + 9, y + 276, 18);
        txt(ctx, v.toFixed(1), gx + 22, y + 276, { size: 17, color: v > 0 ? KIND[k].l : P.textDim });
        txt(ctx, '/分', gx + 26 + textW(ctx, v.toFixed(1), 17), y + 277, { size: 13, color: P.textDim, weight: 'normal' });
        ctx.restore();
      }
    } else if (state === 'open') {
      txt(ctx, '未過關', x + 54, y + 276, { size: 16, color: P.textDim, weight: 'normal' });
    } else {
      txt(ctx, '未開放', x + 54, y + 276, { size: 16, color: P.textMute, weight: 'normal' });
    }
    if (st.selected === true) selFrame(ctx, x, y, 400, 290);
    ctx.restore();
  }

  var CLS_LAYERS = { sword: '中 / 下層', hunter: '中 / 上層', bomber: '上 / 中 / 下層' };
  function drawClassCard(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), cls = clsOf(st.cls);
    var state = (st.state === 'owned' || st.state === 'active') ? st.state : 'locked';
    var ok = st.canAfford === true;
    var col = cls ? CLS[cls].c : P.clsNone;
    var name = st.name == null ? (cls ? CLS[cls].name : '') : String(st.name);
    ctx.save();
    panelBase(ctx, x, y, 240, 140, state === 'active' ? col : P.panelEdge, state === 'locked' ? '#1a2130' : P.panel);
    if (state === 'active') { ctx.lineWidth = 3; rr(ctx, x + 1.5, y + 1.5, 237, 137, 9); ctx.strokeStyle = col; ctx.stroke(); }
    // 頭像(遊戲內畫法放大)
    rr(ctx, x + 10, y + 10, 64, 84, 8); ctx.fillStyle = P.thumbBg; ctx.fill();
    ctx.save();
    ctx.translate(x + 42, y + 54); ctx.scale(1.45, 1.45);
    playerFigure(ctx, cls, 'idle', 0, false);
    ctx.restore();
    if (state === 'locked') {
      rr(ctx, x + 10, y + 10, 64, 84, 8); ctx.fillStyle = 'rgba(14,19,27,0.62)'; ctx.fill();
      lockIcon(ctx, x + 42, y + 52, 26, P.textDim);
    }
    txt(ctx, name, x + 86, y + 28, { size: 22, color: state === 'locked' ? P.textDim : P.text });
    txt(ctx, CLS_LAYERS[cls] || '', x + 86, y + 58, { size: 16, color: state === 'locked' ? P.textDim : '#c6d0e0', weight: 'normal' });
    if (state === 'locked') {
      costRow(ctx, st.cost, x + 14, y + 116, 17, ok);
      affordTag(ctx, ok, x + 228, y + 116, 14, 'right');
    } else if (state === 'owned') {
      txt(ctx, '已擁有', x + 86, y + 86, { size: 15, color: P.textDim, weight: 'normal' });
    } else {
      rr(ctx, x + 84, y + 74, 92, 26, 6); ctx.fillStyle = col; ctx.fill();
      txt(ctx, '目前職業', x + 130, y + 87, { size: 15, color: '#10141c', align: 'center' });
    }
    if (st.selected === true) selFrame(ctx, x, y, 240, 140);
    ctx.restore();
  }

  function drawTrainCard(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    var lv = Math.round(NC(st.lv, 0, 0, 3));
    var ok = st.canAfford === true;
    var maxed = lv >= 3 || st.cost == null;
    ctx.save();
    panelBase(ctx, x, y, 440, 140);
    // 圖示: 往前跑的靴子箭頭
    ctx.save();
    ctx.translate(x + 40, y + 46);
    ctx.fillStyle = '#8fd0ff';
    for (var c = 0; c < 3; c++) {
      ctx.beginPath(); ctx.moveTo(-16 + c * 10, -12); ctx.lineTo(-6 + c * 10, 0); ctx.lineTo(-16 + c * 10, 12); ctx.lineTo(-11 + c * 10, 12); ctx.lineTo(-1 + c * 10, 0); ctx.lineTo(-11 + c * 10, -12); ctx.closePath();
      ctx.globalAlpha = c < lv ? 1 : 0.3; ctx.fill();
    }
    ctx.restore();
    txt(ctx, '訓練', x + 76, y + 32, { size: 22 });
    txt(ctx, '移速 +10%', x + 76, y + 60, { size: 16, color: '#c6d0e0', weight: 'normal' });
    // 等級 3 格
    for (var i = 0; i < 3; i++) {
      rr(ctx, x + 20 + i * 44, y + 92, 38, 20, 4);
      ctx.fillStyle = i < lv ? '#8fd0ff' : '#141b26'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#4a5a75'; ctx.stroke();
    }
    txt(ctx, 'Lv ' + lv, x + 158, y + 102, { size: 16, color: P.text });
    // 右側: 下一級花費
    ctx.strokeStyle = '#33415a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 220.5, y + 18); ctx.lineTo(x + 220.5, y + 122); ctx.stroke();
    if (maxed) {
      txt(ctx, '已滿', x + 330, y + 70, { size: 24, color: P.textDim, align: 'center' });
    } else {
      txt(ctx, '下一級', x + 236, y + 34, { size: 15, color: P.textDim, weight: 'normal' });
      costRow(ctx, st.cost, x + 236, y + 70, 18, ok);
      affordTag(ctx, ok, x + 236, y + 106, 15);
    }
    if (st.selected === true) selFrame(ctx, x, y, 440, 140);
    ctx.restore();
  }

  function drawGoalCard(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), ok = st.canAfford === true;
    ctx.save();
    panelBase(ctx, x, y, 1220, 110, ok ? '#c9a13a' : P.panelEdge);
    if (ok) { ctx.lineWidth = 3; rr(ctx, x + 1.5, y + 1.5, 1217, 107, 9); ctx.strokeStyle = '#c9a13a'; ctx.stroke(); }
    ctx.save();
    ctx.translate(x + 60, y + 55); ctx.scale(1.1, 1.1); ctx.translate(-60 - x, -55 - y);
    drawGoal(ctx, { x: x + 60, y: y + 55, reached: true });
    ctx.restore();
    txt(ctx, '凱旋旗', x + 110, y + 40, { size: 30, color: ok ? '#ffe27a' : P.text });
    txt(ctx, '終極目標 · 買下即勝利', x + 110, y + 76, { size: 16, color: P.textDim, weight: 'normal' });
    txt(ctx, '花費', x + 520, y + 55, { size: 16, color: P.textDim, weight: 'normal' });
    costRow(ctx, st.cost, x + 570, y + 55, 24, ok);
    affordTag(ctx, ok, x + 1196, y + 55, 20, 'right');
    if (st.selected === true) selFrame(ctx, x, y, 1220, 110);
    ctx.restore();
  }

  // ---------- 資訊列 ----------
  function hudStock(ctx, stock, rates) {
    stock = resSet(stock); rates = resSet(rates);
    for (var i = 0; i < 3; i++) {
      var k = KINDS[i], gx = 668 + i * 204;
      resIcon(ctx, k, gx + 12, 20, 22);
      var s = String(Math.floor(stock[k]));
      txt(ctx, s, gx + 30, 21, { size: 20, color: P.text });
      txt(ctx, '+' + rates[k].toFixed(1) + '/分', gx + 36 + textW(ctx, s, 20), 22, { size: 14, color: rates[k] > 0 ? KIND[k].l : P.textDim, weight: 'normal' });
    }
  }
  function drawHud(ctx, st) {
    st = S(st);
    ctx.save();
    ctx.fillStyle = P.hud; ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = '#33415a'; ctx.fillRect(0, HUD_H - 2, W, 2);
    hudStock(ctx, st.stock, st.ratePerMin);
    if (st.mode === 'level') {
      var cls = clsOf(st.cls);
      clsIcon(ctx, cls, 22, 20, 26);
      // 血量
      var mh = Math.round(NC(st.maxHp, 3, 0, 10)), hp = Math.round(NC(st.hp, mh, 0, mh));
      for (var i = 0; i < mh; i++) heart(ctx, 52 + i * 24, 20, 9, i < hp);
      // 技能冷卻
      var sx = 52 + mh * 24 + 18;
      var dur = NC(st.skillCdDur, 1, 0.001, 1e6), ct = NC(st.skillCdT, dur, 0, dur);
      var ready = ct >= dur;
      circle(ctx, sx + 13, 20, 13); ctx.fillStyle = ready ? '#2f3d55' : '#151b26'; ctx.fill();
      if (!ready) {
        ctx.beginPath(); ctx.moveTo(sx + 13, 20); ctx.arc(sx + 13, 20, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ct / dur)); ctx.closePath();
        ctx.fillStyle = cls ? CLS[cls].c : P.clsNone; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;
      }
      circle(ctx, sx + 13, 20, 13); ctx.lineWidth = 2; ctx.strokeStyle = ready ? '#ffffff' : '#4a5568'; ctx.stroke();
      txt(ctx, 'X', sx + 13, 21, { size: 15, color: ready ? '#ffffff' : P.textDim, align: 'center' });
      // 訓練等級
      var tx = sx + 40, lv = Math.round(NC(st.trainLv, 0, 0, 3));
      txt(ctx, '訓練', tx, 21, { size: 13, color: P.textDim, weight: 'normal' });
      for (var j = 0; j < 3; j++) {
        ctx.beginPath(); ctx.moveTo(tx + 32 + j * 10, 13); ctx.lineTo(tx + 39 + j * 10, 20); ctx.lineTo(tx + 32 + j * 10, 27);
        ctx.lineWidth = 3; ctx.strokeStyle = j < lv ? '#8fd0ff' : '#2c3648'; ctx.stroke();
      }
      // 這趟秒數
      txt(ctx, f1(st.time), 400, 21, { size: 22, color: P.text, align: 'right' });
      txt(ctx, '秒', 404, 22, { size: 14, color: P.textDim, weight: 'normal' });
      // 這趟素材
      txt(ctx, '這趟', 446, 21, { size: 13, color: P.textDim, weight: 'normal' });
      var run = resSet(st.run);
      for (var k = 0; k < 3; k++) {
        var gx = 482 + k * 58;
        resIcon(ctx, KINDS[k], gx + 9, 20, 18);
        txt(ctx, Math.floor(run[KINDS[k]]), gx + 21, 21, { size: 17, color: run[KINDS[k]] > 0 ? P.text : P.textDim });
      }
      ctx.fillStyle = '#33415a'; ctx.fillRect(656, 8, 2, 24);
    }
    ctx.restore();
  }
  function heart(ctx, x, y, r, full) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.3, y, x - r * 0.9, y - r * 1.1, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r * 1.3, y, x, y + r * 0.9);
    ctx.closePath();
    ctx.fillStyle = full ? P.heart : '#2a2f3a'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = full ? '#ffb3ad' : '#4a5160'; ctx.stroke();
  }

  // ---------- 面板 ----------
  function drawResultPanel(ctx, st) {
    st = S(st);
    var x = 280, y = 150;
    var cmp = st.oldTime !== null && st.oldTime !== undefined && isFinite(st.oldTime);
    ctx.save();
    panelBase(ctx, x, y, 720, 420, '#55688a');
    txt(ctx, '過關', x + 360, y + 46, { size: 38, color: '#ffe27a', align: 'center' });
    var run = resSet(st.run), rates = resSet(st.rates);
    if (!cmp) {
      clsIcon(ctx, clsOf(st.cls), x + 290, y + 108, 30);
      txt(ctx, f1(st.time) + ' 秒', x + 316, y + 108, { size: 26 });
      for (var i = 0; i < 3; i++) {
        var k = KINDS[i], ry = y + 160 + i * 46;
        rr(ctx, x + 160, ry - 19, 400, 38, 8); ctx.fillStyle = P.panelLight; ctx.fill();
        resIcon(ctx, k, x + 190, ry, 24);
        txt(ctx, KIND[k].name, x + 212, ry, { size: 17, color: P.textDim, weight: 'normal' });
        txt(ctx, Math.floor(run[k]) + ' 個', x + 380, ry, { size: 20, align: 'right', color: run[k] > 0 ? P.text : P.textDim });
        txt(ctx, rates[k].toFixed(1) + ' /分', x + 540, ry, { size: 20, align: 'right', color: rates[k] > 0 ? KIND[k].l : P.textDim });
      }
      txt(ctx, '已存成回放', x + 360, y + 316, { size: 20, color: P.afford, align: 'center' });
      keyRow(ctx, [['Z', '回大地圖']], x + 360, y + 372, 32);
    } else {
      var oRun = resSet(st.oldRun), oRates = resSet(st.oldRates);
      var cA = x + 330, cB = x + 560; // 兩欄中心
      rr(ctx, cA - 105, y + 82, 210, 262, 10); ctx.fillStyle = '#26324a'; ctx.fill();
      rr(ctx, cB - 105, y + 82, 210, 262, 10); ctx.fillStyle = '#232b3a'; ctx.fill();
      txt(ctx, '這一趟', cA, y + 104, { size: 20, align: 'center' });
      txt(ctx, '目前回放', cB, y + 104, { size: 20, align: 'center', color: '#c6d0e0' });
      clsIcon(ctx, clsOf(st.cls), cA - 44, y + 144, 26);
      txt(ctx, f1(st.time) + ' 秒', cA - 24, y + 144, { size: 20 });
      clsIcon(ctx, clsOf(st.oldCls), cB - 44, y + 144, 26);
      txt(ctx, f1(st.oldTime) + ' 秒', cB - 24, y + 144, { size: 20, color: '#c6d0e0' });
      txt(ctx, '每分鐘產量', x + 60, y + 144, { size: 14, color: P.textDim, weight: 'normal' });
      for (var j = 0; j < 3; j++) {
        var kk = KINDS[j], yy = y + 196 + j * 50;
        resIcon(ctx, kk, x + 76, yy, 24);
        txt(ctx, KIND[kk].name, x + 96, yy, { size: 16, color: P.textDim, weight: 'normal' });
        var a = rates[kk], b = oRates[kk];
        cmpCell(ctx, cA, yy, a, Math.floor(run[kk]), a > b, a < b, kk);
        cmpCell(ctx, cB, yy, b, Math.floor(oRun[kk]), b > a, b < a, kk);
      }
      keyRow(ctx, [['Z', '採用這一趟'], ['X', '保留舊的']], x + 360, y + 380, 32);
    }
    ctx.restore();
  }
  // 比較格: 較高者亮色 + ▲ + 底色, 較低者暗
  function cmpCell(ctx, cx, y, rate, count, higher, lower, k) {
    if (higher) { rr(ctx, cx - 98, y - 20, 196, 40, 8); ctx.fillStyle = 'rgba(159,240,168,0.14)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(159,240,168,0.7)'; ctx.stroke(); }
    var col = lower ? P.textMute : (rate > 0 ? KIND[k].l : P.textDim);
    txt(ctx, rate.toFixed(1), cx + 20, y, { size: 22, align: 'right', color: col });
    txt(ctx, '/分', cx + 24, y + 2, { size: 13, color: lower ? P.textMute : P.textDim, weight: 'normal' });
    txt(ctx, '(' + count + ')', cx + 52, y + 2, { size: 13, color: lower ? P.textMute : P.textDim, weight: 'normal' });
    if (higher) {
      ctx.beginPath(); ctx.moveTo(cx - 84, y + 6); ctx.lineTo(cx - 76, y - 6); ctx.lineTo(cx - 68, y + 6); ctx.closePath();
      ctx.fillStyle = P.afford; ctx.fill();
    }
  }

  function drawFailPanel(ctx) {
    var x = 380, y = 240;
    ctx.save();
    panelBase(ctx, x, y, 520, 240, '#8c3a34');
    txt(ctx, '失敗', x + 260, y + 70, { size: 44, color: '#ff8a80', align: 'center' });
    txt(ctx, '這趟作廢, 素材不入帳', x + 260, y + 122, { size: 16, color: P.textDim, align: 'center', weight: 'normal' });
    keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], x + 260, y + 186, 32);
    ctx.restore();
  }

  function drawPausePanel(ctx, st) {
    st = S(st);
    var x = 380, y = 220;
    ctx.save();
    ctx.fillStyle = 'rgba(5,8,14,0.6)'; ctx.fillRect(0, 0, W, H);
    panelBase(ctx, x, y, 520, 280);
    txt(ctx, '暫停', x + 260, y + 80, { size: 44, align: 'center' });
    if (st.mode === 'level') {
      keyRow(ctx, [['Esc', '繼續'], ['Z', '重來'], ['X', '回大地圖']], x + 260, y + 180, 30);
      txt(ctx, '重來或回大地圖, 這趟作廢', x + 260, y + 232, { size: 14, color: P.textDim, align: 'center', weight: 'normal' });
    } else {
      keyRow(ctx, [['Esc', '繼續']], x + 260, y + 180, 30);
    }
    ctx.restore();
  }

  function drawEndingPanel(ctx, st) {
    st = S(st);
    var x = 280, y = 150;
    var tt = Math.floor(NC(st.totalTime, 0, 0, 1e7));
    var mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.save();
    panelBase(ctx, x, y, 720, 420, '#c9a13a');
    ctx.save();
    ctx.translate(x + 360, y + 130); ctx.scale(2, 2); ctx.translate(-x - 360, -y - 130);
    drawGoal(ctx, { x: x + 360, y: y + 130, reached: true });
    ctx.restore();
    txt(ctx, '凱旋旗升起', x + 360, y + 250, { size: 38, color: '#ffe27a', align: 'center' });
    txt(ctx, '總遊玩時間  ' + mm + ':' + (ss < 10 ? '0' : '') + ss, x + 360, y + 300, { size: 22, align: 'center' });
    keyRow(ctx, [['Z', '重新開始']], x + 360, y + 370, 32);
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  var GUIDE_SIZE = [[480, 270], [600, 220], [480, 300], [560, 240]];

  // 以 (ax,ay) 為錨點放大 k 倍執行 fn
  function zoomAt(ctx, ax, ay, k, fn) {
    ctx.save(); ctx.translate(ax, ay); ctx.scale(k, k); ctx.translate(-ax, -ay); fn(); ctx.restore();
  }
  function tag(ctx, s, x, y, size, align) {
    txt(ctx, s, x, y, { size: size || 15, color: '#ffffff', stroke: '#0b0f16', strokeW: 4, align: align || 'center' });
  }
  function dashedPath(ctx, pts, lw, arrowAt) {
    ctx.save();
    ctx.setLineDash([lw * 3, lw * 2.2]);
    ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    var a = pts[pts.length - 2], b = pts[pts.length - 1];
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = lw * 4.5;
    ctx.beginPath(); ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] - Math.cos(ang - 0.5) * L, b[1] - Math.sin(ang - 0.5) * L);
    ctx.lineTo(b[0] - Math.cos(ang + 0.5) * L, b[1] - Math.sin(ang + 0.5) * L);
    ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  // 第 1 / 3 頁共用的示意關卡(1280x720 座標): 中層地面第 11 列、下層地面第 17 列、上層平台第 5 列
  function guideLevelTerrain(ctx) {
    drawBackground(ctx);
    var c;
    for (c = 0; c < 32; c++) drawGround(ctx, { x: c * 40 + 20, y: 460, top: true });
    for (c = 0; c < 32; c++) drawGround(ctx, { x: c * 40 + 20, y: 700, top: true });
    for (c = 9; c < 23; c++) drawGround(ctx, { x: c * 40 + 20, y: 220, top: true });
  }

  function guidePage0(ctx) { // 480x270: 關卡縮小 0.375
    var k = 0.375;
    ctx.save();
    ctx.scale(k, k);
    guideLevelTerrain(ctx);
    var E = 1.6; // 物件誇大倍率(以底邊中心為錨點)
    zoomAt(ctx, 300, 440, E, function () { drawPickup(ctx, { x: 300, y: 426, kind: 'wood', t: 0.5 }); });
    zoomAt(ctx, 900, 440, E, function () { drawPickup(ctx, { x: 900, y: 426, kind: 'wood', t: 0.5 }); });
    zoomAt(ctx, 600, 440, E, function () { drawBoar(ctx, { x: 600, y: 424, facing: -1, state: 'walk', t: 0 }); });
    zoomAt(ctx, 520, 200, E, function () { drawPickup(ctx, { x: 520, y: 186, kind: 'gem', t: 0.5 }); });
    zoomAt(ctx, 760, 200, E, function () { drawPickup(ctx, { x: 760, y: 186, kind: 'gem', t: 0.5 }); });
    zoomAt(ctx, 520, 680, E, function () { drawPickup(ctx, { x: 520, y: 666, kind: 'iron', t: 0.5 }); });
    zoomAt(ctx, 780, 680, E, function () { drawPickup(ctx, { x: 780, y: 666, kind: 'iron', t: 0.5 }); });
    zoomAt(ctx, 1220, 440, E, function () { drawGoal(ctx, { x: 1220, y: 400, reached: false }); });
    zoomAt(ctx, 70, 440, E, function () { drawPlayer(ctx, { x: 70, y: 418, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false }); });
    ctx.restore();
    // 虛線箭頭: 沿中層從劍士連到終點旗(在野豬頭頂上方通過)
    dashedPath(ctx, [[48, 118], [430, 118]], 3);
    tag(ctx, '你', 26, 126, 15);
    tag(ctx, '終點', 457, 100, 15);
    tag(ctx, '上層', 6, 40, 14, 'left');
    tag(ctx, '中層', 6, 99, 14, 'left');
    tag(ctx, '下層', 6, 196, 14, 'left');
  }

  function guideCell(ctx, ox, fn) {
    // 每格 140x210 虛擬; 場景以 1.5 倍畫, 場景座標 0..93 x 0..140
    ctx.save();
    rr(ctx, ox, 5, 140, 210, 10); ctx.fillStyle = '#1d2738'; ctx.fill();
    ctx.save();
    rr(ctx, ox, 5, 140, 210, 10); ctx.clip();
    ctx.translate(ox, 5); ctx.scale(1.5, 1.5);
    for (var c = 0; c < 3; c++) drawGround(ctx, { x: c * 40 + 20, y: 130, top: true });
    fn();
    ctx.restore();
    rr(ctx, ox + 1, 6, 138, 208, 9); ctx.lineWidth = 2; ctx.strokeStyle = '#3b4a62'; ctx.stroke();
    ctx.restore();
  }
  function guidePage1(ctx) { // 600x220, 四格
    var xs = [8, 158, 308, 458];
    // 地面頂 = 場景 y 110 → 玩家中心 y 88
    guideCell(ctx, xs[0], function () { drawPlayer(ctx, { x: 46, y: 88, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1 }); });
    guideCell(ctx, xs[1], function () { drawPlayer(ctx, { x: 34, y: 46, cls: 'sword', facing: 1, pose: 'rise', poseT: 0.1 }); });
    guideCell(ctx, xs[2], function () { drawPlayer(ctx, { x: 24, y: 88, cls: 'sword', facing: 1, pose: 'slash', poseT: 0.04 }); });
    guideCell(ctx, xs[3], function () {
      drawPoof(ctx, { x: 30, y: 96, t: 0.1, dur: 0.3 });
      drawPlayer(ctx, { x: 74, y: 88, cls: 'sword', facing: 1, pose: 'dash', poseT: 0.08 });
    });
    // 鍵帽貼在做動作的劍士旁(場景座標 * 1.5 + 格偏移)
    var kh = 28, w;
    w = keycap(ctx, '←', xs[0] + 42, 82, kh); keycap(ctx, '→', xs[0] + 42 + w + 6, 82, kh);
    w = textW(ctx, '空白鍵', Math.round(kh * 0.58)) + kh * 0.55;
    keycap(ctx, '空白鍵', xs[1] + 51 - w / 2, 140, kh);
    keycap(ctx, 'Z', xs[2] + 22, 82, kh);
    keycap(ctx, 'X', xs[3] + 97, 82, kh);
    // 地面上的起跳點(跳躍格): 小影子
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(xs[1] + 51, 172, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  function guidePage2(ctx) { // 480x300
    // 頂端資訊列片段: 木材數 12 → 14
    rr(ctx, 0, 0, 480, 40, 6); ctx.fillStyle = P.hud; ctx.fill();
    ctx.fillStyle = '#33415a'; ctx.fillRect(0, 38, 480, 2);
    resIcon(ctx, 'wood', 160, 20, 24);
    txt(ctx, '12', 180, 21, { size: 22, color: P.textDim });
    ctx.beginPath(); ctx.moveTo(214, 21); ctx.lineTo(246, 21); ctx.lineWidth = 3; ctx.strokeStyle = P.woodLight; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(254, 21); ctx.lineTo(244, 14); ctx.lineTo(244, 28); ctx.closePath(); ctx.fillStyle = P.woodLight; ctx.fill();
    txt(ctx, '14', 262, 21, { size: 24, color: '#ffffff' });
    // 已過關的關卡卡片(0.8 倍)
    var cx = 80, cy = 58, ck = 0.8;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(ck, ck);
    drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '草原', state: 'cleared', rates: { wood: 24.0, iron: 0, gem: 0 }, recordCls: 'sword', recordTime: 12.5, cost: null, canAfford: false, selected: false });
    // 縮圖: 關卡 0.3 倍, 劍士揮砍野豬的群組再放大 2.2 倍
    ctx.save();
    ctx.beginPath(); ctx.rect(8, 8, 384, 216); ctx.clip();
    ctx.translate(8, 8); ctx.scale(0.3, 0.3);
    guideLevelTerrain(ctx);
    drawPickup(ctx, { x: 300, y: 426, kind: 'wood', t: 0.5 });
    drawPickup(ctx, { x: 520, y: 186, kind: 'gem', t: 0.5 });
    drawPickup(ctx, { x: 520, y: 666, kind: 'iron', t: 0.5 });
    drawGoal(ctx, { x: 1220, y: 400, reached: false });
    zoomAt(ctx, 590, 440, 2.2, function () {
      drawPoof(ctx, { x: 616, y: 424, t: 0.08, dur: 0.3 });
      drawPlayer(ctx, { x: 572, y: 418, cls: 'sword', facing: 1, pose: 'slash', poseT: 0.03 });
    });
    ctx.restore();
    ctx.restore();
    // 「+2」浮字在外層以原尺寸畫(位置 = 野豬倒下處上方)
    // 野豬中心在縮圖內: 590 + (616-590)*2.2 = 647.2 → 卡片內 8 + 647.2*0.3 = 202.2 → 虛擬 80 + 202.2*0.8 ≈ 242
    // 高度: 440 + (424-440)*2.2 = 404.8 → 8 + 404.8*0.3 = 129.4 → 58 + 129.4*0.8 ≈ 162
    drawPopup(ctx, { x: 246, y: 158, t: 0.18, dur: 0.8, kind: 'wood', value: 2 });
  }

  // 第 4 頁: 中層片段 16x8 格(640x320), 0.42 倍
  function guideStrip(ctx) {
    ctx.fillStyle = P.bgTop; ctx.fillRect(0, 0, 640, 320);
    var c;
    for (c = 0; c < 16; c++) {
      var dip = c >= 5 && c <= 7;
      if (!dip) drawGround(ctx, { x: c * 40 + 20, y: 260, top: true });
      drawGround(ctx, { x: c * 40 + 20, y: 300, top: dip });
    }
    drawPickup(ctx, { x: 120, y: 226, kind: 'wood', t: 0.5 });
    drawPickup(ctx, { x: 240, y: 266, kind: 'wood', t: 0.5 });
    drawPickup(ctx, { x: 520, y: 226, kind: 'wood', t: 0.5 });
    drawBoar(ctx, { x: 400, y: 224, facing: -1, state: 'walk', t: 0 });
    drawGoal(ctx, { x: 600, y: 200, reached: false });
    drawPlayer(ctx, { x: 40, y: 218, cls: 'sword', facing: 1, pose: 'idle', poseT: 0 });
  }
  function guidePage3(ctx) { // 560x240
    var k = 0.42, panels = [0, 290];
    var routes = [
      // 左: 下到凹槽撿木材、停在野豬旁打、再撿木材
      [[40, 200], [190, 200], [240, 252], [290, 200], [352, 200], [356, 186], [345, 176], [334, 186], [338, 200], [352, 200], [440, 200], [585, 196]],
      // 右: 跳過凹槽、跳過野豬, 直衝
      [[40, 200], [170, 200], [230, 150], [300, 200], [350, 200], [400, 140], [450, 200], [585, 196]]
    ];
    var labels = ['素材多 / 秒數長', '素材少 / 秒數短'];
    for (var i = 0; i < 2; i++) {
      var ox = panels[i];
      ctx.save();
      rr(ctx, ox, 0, 270, 140, 8); ctx.clip();
      ctx.translate(ox, 0); ctx.scale(k, k);
      guideStrip(ctx);
      ctx.restore();
      rr(ctx, ox + 1, 1, 268, 138, 8); ctx.lineWidth = 2; ctx.strokeStyle = '#3b4a62'; ctx.stroke();
      var pts = routes[i].map(function (p) { return [ox + p[0] * k, p[1] * k]; });
      dashedPath(ctx, pts, 2.5);
      tag(ctx, labels[i], ox + 135, 172, 18);
    }
  }

  function drawGuidePage(ctx, st) {
    st = S(st);
    var page = Math.round(NC(st.page, 0, 0, 99));
    if (page > 3) return;
    var x = N(st.x, 0), y = N(st.y, 0), w = NC(st.w, 0, 0, 4000), h = NC(st.h, 0, 0, 4000);
    if (w <= 0 || h <= 0) return;
    var vs = GUIDE_SIZE[page];
    var s = Math.min(w / vs[0], h / vs[1]);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vs[0] * s) / 2, y + (h - vs[1] * s) / 2);
    ctx.scale(s, s);
    if (page === 0) guidePage0(ctx);
    else if (page === 1) guidePage1(ctx);
    else if (page === 2) guidePage2(ctx);
    else guidePage3(ctx);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: P,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawBrittleFloor: drawBrittleFloor,
    drawHookRing: drawHookRing,
    drawPickup: drawPickup,
    drawGoal: drawGoal,
    drawRangeRing: drawRangeRing,
    drawPlayer: drawPlayer,
    drawBoar: drawBoar,
    drawShieldman: drawShieldman,
    drawShooterBee: drawShooterBee,
    drawFrog: drawFrog,
    drawBeeShot: drawBeeShot,
    drawArrow: drawArrow,
    drawBomb: drawBomb,
    drawExplosion: drawExplosion,
    drawPoof: drawPoof,
    drawPopup: drawPopup,
    drawLevelCard: drawLevelCard,
    drawClassCard: drawClassCard,
    drawTrainCard: drawTrainCard,
    drawGoalCard: drawGoalCard,
    drawHud: drawHud,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEndingPanel: drawEndingPanel,
    drawGuidePage: drawGuidePage
  };
})();
