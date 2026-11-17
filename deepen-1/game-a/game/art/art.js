/* 符石迴廊 — 美術 (deepen-1 / game-a)
 * 全部 Canvas 2D 幾何繪製, 無外部資源。全域 window.Art, 不用 ES module。
 * 座標一律 1280x720 設計座標; 除註明「左上角」者外 x, y 為判定框中心。
 */
(function () {
  'use strict';

  // ───────── 常數 ─────────
  var W = 1280, H = 720, HUD_H = 40;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var P = {
    bg: '#232a44', bgLow: '#3a3a58', hill: '#2c3452',
    mapBg: '#16242a', mapBg2: '#21343a',
    hud: '#0c0e1a', panel: '#1b1f2e', panel2: '#262b3e', panelLine: '#4a5270',
    text: '#f4f2ea', textDim: '#9aa0b8', textMute: '#6a7088',
    sel: '#ffe066', ok: '#6fe08a', bad: '#ff5a5a', danger: '#ff3b4a',
    enemyLine: '#1b1020', enemyEye: '#ff2a3a', heroLine: '#ffffff', skin: '#f6d2a8',
    wood: '#c47a34', woodHi: '#e8b070', woodLine: '#3a2210',
    ench: '#b46cff', enchHi: '#f0dcff', enchLine: '#2a1040',
    time: '#3fd4ee', timeHi: '#d8faff', timeLine: '#0c3040',
    sword: '#4f8dff', hunter: '#3ccf6e', bomber: '#ff8a2a',
    harvest: '#ffd23f', hunt: '#ff4d4d',
    spike: '#ff3b4a', crack: '#d9c9a3', hook: '#c8d4e0',
    chest: '#b5652a', chestTrim: '#ffd23f', goal: '#f4f2ea', goalReached: '#ffd23f',
    stone: '#7a7f94', stoneDark: '#4a4e60', seal: '#5a5e70',
    beeShot: '#ff3b6b', arrow: '#f4ecd0', bomb: '#24242c',
    blast: '#ff9a3a', wave: '#f4f6ff', poof: '#d8d8e0',
    boar: '#8a4a32', shield: '#5a6478', bee: '#ffc828', frog: '#7ea02a'
  };

  var THEMES = {
    plain:  { top: '#7ccf4e', edge: '#4f9a2e', fill: '#8a5a36', seam: '#6e4428', mark: '#a5744a' },
    sky:    { top: '#f2f6ff', edge: '#b8c8e8', fill: '#8e9cc0', seam: '#7482a8', mark: '#aab6d4' },
    rock:   { top: '#f0a858', edge: '#c07434', fill: '#a8543a', seam: '#86402a', mark: '#c26a48' },
    swamp:  { top: '#86a83a', edge: '#5a7a24', fill: '#3c4632', seam: '#2c3424', mark: '#56644a' },
    throne: { top: '#f0cc5a', edge: '#b08a2a', fill: '#4c3a70', seam: '#3a2c58', mark: '#64508e' }
  };

  var KINDS = ['wood', 'ench', 'time'];
  var KIND_NAME = { wood: '木材', ench: '符塵', time: '時晶' };
  var KIND_USE = { wood: '開路', ench: '解封', time: '加速' };
  var HUD_ICON_X = { wood: 36, ench: 256, time: 476 };

  var CLS = {
    sword:  { name: '劍士', color: P.sword, dark: '#2a4f9a', good: '跨寬坑' },
    hunter: { name: '獵人', color: P.hunter, dark: '#1e7a44', good: '上高台' },
    bomber: { name: '炸彈工', color: P.bomber, dark: '#a8501a', good: '破岩牆、擊飛' }
  };
  var CLS_ORDER = ['sword', 'hunter', 'bomber'];

  var RUNE = {
    harvest:    { name: '豐收符石', color: P.harvest, effect: '經過後 4 秒內撿到的素材 +1' },
    hunt:       { name: '狩獵符石', color: P.hunt, effect: '經過後 6 秒內打倒的怪掉落 ×2' },
    springWood: { name: '木泉符石', color: P.wood, effect: '經過時得到 木材 2', kind: 'wood' },
    springEnch: { name: '塵泉符石', color: P.ench, effect: '經過時得到 符塵 2', kind: 'ench' },
    springTime: { name: '晶泉符石', color: P.time, effect: '經過時得到 時晶 2', kind: 'time' }
  };

  // ───────── 正規化 ─────────
  function N(v, d) { v = +v; return isFinite(v) ? v : (d === undefined ? 0 : d); }
  function CL(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function S(s) { return s || {}; }
  function kindOf(k) { return KINDS.indexOf(k) >= 0 ? k : 'wood'; }
  function clsOf(c) { return CLS[c] ? c : 'sword'; }
  function runeOf(t) { return RUNE[t] ? t : null; }
  function themeOf(t) { return THEMES[t] ? t : 'plain'; }
  function face(f) { return N(f, 1) < 0 ? -1 : 1; }
  function mat(o) { o = o || {}; return { wood: N(o.wood, 0), ench: N(o.ench, 0), time: N(o.time, 0) }; }
  function f1(v) { return N(v, 0).toFixed(1); }
  function prog(t, d) { d = N(d, 1); if (d <= 0) return 1; return CL(N(t, d) / d, 0, 1); }
  function nowS() {
    var n = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return n / 1000;
  }
  function affordOf(ca, k) {
    if (ca && typeof ca === 'object') return ca[k] !== false;
    return ca !== false;
  }

  // ───────── 基本形狀 ─────────
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function ell(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    if (ctx.ellipse) ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2);
    else ctx.arc(x, y, Math.max(0, rx), 0, Math.PI * 2);
  }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
  function dash(ctx, arr) { if (ctx.setLineDash) ctx.setLineDash(arr); }

  function measure(ctx, s, size) {
    var m = ctx.measureText ? ctx.measureText(s) : null;
    return (m && isFinite(m.width) && m.width > 0) ? m.width : String(s).length * size * 0.62;
  }
  // 文字: 預設帶深色描邊, 壓在任何底色上都讀得到 (P10)
  function txt(ctx, s, x, y, o) {
    o = o || {};
    var size = o.size || 14;
    ctx.font = (o.bold === false ? '' : 'bold ') + size + 'px ' + FONT;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    s = String(s);
    if (o.stroke !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.lw || Math.max(2, size / 5);
      ctx.strokeStyle = o.strokeColor || 'rgba(8,8,16,0.9)';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || P.text;
    ctx.fillText(s, x, y);
    return measure(ctx, s, size);
  }

  // ───────── 共用圖示 ─────────
  // 素材圖示: 木材 = 斜放圓木, 符塵 = 四芒星, 時晶 = 六角長晶。s = 外接邊長
  function matIcon(ctx, kind, cx, cy, s) {
    kind = kindOf(kind);
    var k = s / 24;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    if (kind === 'wood') {
      ctx.rotate(-0.35);
      rr(ctx, -10, -5.5, 18, 11, 3);
      ctx.fillStyle = P.wood; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.woodLine; ctx.stroke();
      ctx.strokeStyle = 'rgba(58,34,16,0.6)'; ctx.lineWidth = 1.2;
      line(ctx, -7, -1.5, 3, -1.5); ctx.stroke();
      line(ctx, -5, 2.5, 4, 2.5); ctx.stroke();
      ell(ctx, 8, 0, 4, 5.5, 0);
      ctx.fillStyle = P.woodHi; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.woodLine; ctx.stroke();
      ell(ctx, 8, 0, 1.6, 2.4, 0); ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'ench') {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 4;
        var r = (i % 2 === 0) ? 11 : 4;
        var px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = P.ench; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.enchLine; ctx.stroke();
      circ(ctx, 0, 0, 2.6); ctx.fillStyle = P.enchHi; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(7, -5); ctx.lineTo(7, 5);
      ctx.lineTo(0, 11); ctx.lineTo(-7, 5); ctx.lineTo(-7, -5); ctx.closePath();
      ctx.fillStyle = P.time; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.timeLine; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(4, -4); ctx.lineTo(0, 6); ctx.lineTo(-3, -4); ctx.closePath();
      ctx.fillStyle = P.timeHi; ctx.globalAlpha *= 0.75; ctx.fill();
    }
    ctx.restore();
  }

  // 符石圖示: 八角石板 + 符石色外框 + 中央紋章。s = 外接邊長 (32 為原寸)
  function runeIcon(ctx, type, cx, cy, s) {
    type = runeOf(type) || 'harvest';
    var R = RUNE[type];
    var k = s / 32;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = Math.PI / 8 + i * Math.PI / 4;
      var px = Math.cos(a) * 15, py = Math.sin(a) * 15;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#262a3c'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = R.color; ctx.stroke();
    if (type === 'harvest') {
      // 嫩芽 (與素材收成有關)
      ctx.strokeStyle = R.color; ctx.lineWidth = 2.4;
      line(ctx, 0, 9, 0, -2); ctx.stroke();
      ctx.fillStyle = R.color;
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.quadraticCurveTo(-11, -3, -9, -10); ctx.quadraticCurveTo(-2, -9, 0, -1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(10, 1, 9, -7); ctx.quadraticCurveTo(2, -6, 0, 2); ctx.fill();
      ctx.lineWidth = 2; line(ctx, -6, 9, 6, 9); ctx.stroke();
    } else if (type === 'hunt') {
      // 三道爪痕 (與打怪有關)
      ctx.strokeStyle = R.color; ctx.lineWidth = 3;
      for (var j = -1; j <= 1; j++) {
        ctx.beginPath(); ctx.moveTo(-7 + j * 5, -8); ctx.quadraticCurveTo(-1 + j * 5, -1, 4 + j * 5, 8); ctx.stroke();
      }
    } else {
      // 泉滴 + 對應素材
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.bezierCurveTo(5, -4, 9, 1, 9, 4);
      ctx.arc(0, 4, 9, 0, Math.PI);
      ctx.bezierCurveTo(-9, 1, -5, -4, 0, -11);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = R.color; ctx.stroke();
      matIcon(ctx, R.kind, 0, 4, 12);
    }
    ctx.restore();
  }

  // 職業小頭像
  function clsIcon(ctx, cls, cx, cy, s) {
    cls = clsOf(cls);
    var k = s / 20, c = CLS[cls];
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    rr(ctx, -9, 1, 18, 9, 3); ctx.fillStyle = c.color; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = P.heroLine; ctx.stroke();
    circ(ctx, 0, -3, 6.5); ctx.fillStyle = P.skin; ctx.fill(); ctx.stroke();
    hat(ctx, cls, 0, -3, 6.5);
    ctx.restore();
  }

  function hat(ctx, cls, hx, hy, r) {
    ctx.lineWidth = 1.2;
    if (cls === 'sword') {
      ctx.beginPath(); ctx.arc(hx, hy, r + 0.5, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = '#d8e0ec'; ctx.fill(); ctx.strokeStyle = '#2a3040'; ctx.stroke();
      ctx.fillStyle = P.sword;
      ctx.beginPath(); ctx.moveTo(hx - 2, hy - r); ctx.quadraticCurveTo(hx - 1, hy - r - 4, hx - 7, hy - r - 2); ctx.lineTo(hx - 4, hy - r + 1); ctx.closePath(); ctx.fill();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.moveTo(hx - r - 1.5, hy + 2); ctx.quadraticCurveTo(hx - r, hy - r - 2, hx + 2, hy - r - 1);
      ctx.lineTo(hx - r - 4, hy - r - 1.5); ctx.lineTo(hx + r + 1, hy - 1); ctx.quadraticCurveTo(hx + 2, hy - r + 1, hx - r + 2, hy + 2); ctx.closePath();
      ctx.fillStyle = P.hunter; ctx.fill(); ctx.strokeStyle = '#0e3a20'; ctx.stroke();
    } else {
      rr(ctx, hx - r - 0.5, hy - r + 1, r * 2 + 1, 4, 2); ctx.fillStyle = '#5a3418'; ctx.fill();
      circ(ctx, hx + 2.5, hy - r + 3, 2.4); ctx.fillStyle = '#ffe680'; ctx.fill(); ctx.strokeStyle = '#2a1808'; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, r + 0.5, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 2.5; ctx.strokeStyle = P.bomber; ctx.stroke();
    }
  }

  function lockIcon(ctx, cx, cy, s, col) {
    var k = s / 24;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineWidth = 3; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, 0); ctx.lineTo(6, 1); ctx.moveTo(-6, 1); ctx.lineTo(-6, -3); ctx.stroke();
    rr(ctx, -9, 0, 18, 12, 2); ctx.fillStyle = col; ctx.fill();
    circ(ctx, 0, 5, 2); ctx.fillStyle = '#14161e'; ctx.fill();
    ctx.restore();
  }

  function keycap(ctx, label, cx, cy, w, h) {
    w = w || 26; h = h || 26;
    rr(ctx, cx - w / 2, cy - h / 2 + 2, w, h, 5); ctx.fillStyle = '#0a0b12'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 5); ctx.fillStyle = '#eef0f6'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a3e52'; ctx.stroke();
    txt(ctx, label, cx, cy + 0.5, { size: Math.min(15, h * 0.55), color: '#1a1c28', stroke: false, align: 'center' });
  }

  function arrowHead(ctx, x, y, ang, len, col) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.5) * len, y - Math.sin(ang - 0.5) * len);
    ctx.lineTo(x - Math.cos(ang + 0.5) * len, y - Math.sin(ang + 0.5) * len);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }

  function panelBox(ctx, x, y, w, h, o) {
    o = o || {};
    rr(ctx, x, y, w, h, 12); ctx.fillStyle = o.fill || P.panel; ctx.fill();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 11); ctx.lineWidth = 2; ctx.strokeStyle = '#05060c'; ctx.stroke();
    rr(ctx, x + 3, y + 3, w - 6, h - 6, 10); ctx.lineWidth = 2; ctx.strokeStyle = o.line || P.panelLine; ctx.stroke();
  }

  function costRow(ctx, cost, x, y, ca, size, align) {
    cost = mat(cost); size = size || 14;
    var parts = [];
    KINDS.forEach(function (k) { if (cost[k] > 0) parts.push(k); });
    var ws = parts.map(function (k) { return size + 4 + String(Math.round(cost[k])).length * size * 0.62 + 10; });
    var total = ws.reduce(function (a, b) { return a + b; }, 0);
    var cx = align === 'center' ? x - total / 2 : x;
    parts.forEach(function (k, i) {
      var okk = affordOf(ca, k);
      matIcon(ctx, k, cx + size / 2, y, size);
      txt(ctx, Math.round(cost[k]), cx + size + 3, y, { size: size, color: okk ? P.text : P.bad });
      cx += ws[i];
    });
  }

  // ───────── 背景 ─────────
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient ? ctx.createLinearGradient(0, 0, 0, H) : null;
    if (g) { g.addColorStop(0, '#1c2240'); g.addColorStop(1, P.bgLow); ctx.fillStyle = g; } else ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, W, H);
    // 遠景山影 (低對比, 不搶戲)
    ctx.fillStyle = P.hill;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 470 + Math.sin(x * 0.011) * 50 + Math.sin(x * 0.027) * 22);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var i = 0; i < 6; i++) { ell(ctx, 120 + i * 210, 110 + (i % 3) * 40, 70, 16, 0); ctx.fill(); }
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    var g = ctx.createRadialGradient ? ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 760) : null;
    if (g) { g.addColorStop(0, P.mapBg2); g.addColorStop(1, '#0c1418'); ctx.fillStyle = g; } else ctx.fillStyle = P.mapBg;
    ctx.fillRect(0, 0, W, H);
    // 等高線紋理
    ctx.strokeStyle = 'rgba(160,210,190,0.06)'; ctx.lineWidth = 2;
    for (var r = 0; r < 7; r++) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 40) {
        var y = 100 + r * 95 + Math.sin(x * 0.006 + r) * 26;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ───────── 地形 ─────────
  function drawGround(ctx, st) {
    st = S(st);
    var x = N(st.x, 0) - 20, y = N(st.y, 0) - 20;
    var th = THEMES[themeOf(st.theme)], tn = themeOf(st.theme);
    ctx.save();
    ctx.fillStyle = th.fill; ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = th.seam; ctx.fillRect(x, y + 38, 40, 2); ctx.fillRect(x + 38, y, 2, 40);
    ctx.strokeStyle = th.mark; ctx.fillStyle = th.mark; ctx.lineWidth = 2;
    if (tn === 'plain') {
      circ(ctx, x + 11, y + 26, 3); ctx.fill(); circ(ctx, x + 28, y + 31, 2.2); ctx.fill();
    } else if (tn === 'sky') {
      line(ctx, x, y + 20, x + 38, y + 20); ctx.stroke();
      line(ctx, x + 19, y + 20, x + 19, y + 38); ctx.stroke();
    } else if (tn === 'rock') {
      line(ctx, x + 2, y + 34, x + 34, y + 14); ctx.stroke();
      line(ctx, x + 14, y + 38, x + 38, y + 24); ctx.stroke();
    } else if (tn === 'swamp') {
      circ(ctx, x + 12, y + 28, 3.5); ctx.stroke(); circ(ctx, x + 28, y + 20, 2.5); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x + 19, y + 12); ctx.lineTo(x + 30, y + 24); ctx.lineTo(x + 19, y + 36); ctx.lineTo(x + 8, y + 24); ctx.closePath(); ctx.stroke();
    }
    if (st.top) {
      ctx.fillStyle = th.top;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y); ctx.lineTo(x + 40, y + 9);
      for (var i = 4; i >= 0; i--) ctx.lineTo(x + i * 10, y + (i % 2 ? 12 : 8));
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = th.edge; ctx.fillRect(x, y + 3, 40, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, 40, 2);
    }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = S(st);
    var x = N(st.x, 0) - 20, y = N(st.y, 0);
    ctx.save();
    ctx.fillStyle = '#2a1418'; ctx.fillRect(x, y + 16, 40, 4);
    for (var i = 0; i < 4; i++) {
      var bx = x + i * 10;
      ctx.beginPath(); ctx.moveTo(bx, y + 17); ctx.lineTo(bx + 5, y + 1); ctx.lineTo(bx + 10, y + 17); ctx.closePath();
      ctx.fillStyle = P.spike; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#4a0a10'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 5, y + 2); ctx.lineTo(bx + 7, y + 15); ctx.lineTo(bx + 5, y + 15); ctx.closePath();
      ctx.fillStyle = '#ffd0d4'; ctx.fill();
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = S(st);
    var x = N(st.x, 0) - 20, y = N(st.y, 0) - 20;
    var hp = CL(Math.round(N(st.hp, 3)), 1, 3);
    ctx.save();
    ctx.fillStyle = '#1a1612'; ctx.fillRect(x, y, 40, 40);
    // 斜角磚塊: 亮上左 / 暗下右, 與一般地面的平塗不同
    rr(ctx, x + 1.5, y + 1.5, 37, 37, 4); ctx.fillStyle = P.crack; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 3, y + 3, 34, 3); ctx.fillRect(x + 3, y + 3, 3, 34);
    ctx.fillStyle = 'rgba(70,50,30,0.45)'; ctx.fillRect(x + 3, y + 34, 34, 3); ctx.fillRect(x + 34, y + 3, 3, 34);
    ctx.strokeStyle = '#2a2018'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + 20, y + 4); ctx.lineTo(x + 17, y + 13); ctx.lineTo(x + 23, y + 20); ctx.lineTo(x + 19, y + 30); ctx.stroke();
    if (hp <= 2) {
      ctx.beginPath(); ctx.moveTo(x + 5, y + 16); ctx.lineTo(x + 13, y + 19); ctx.lineTo(x + 23, y + 20); ctx.lineTo(x + 30, y + 13); ctx.lineTo(x + 36, y + 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 19, y + 30); ctx.lineTo(x + 28, y + 35); ctx.stroke();
    }
    if (hp <= 1) {
      ctx.beginPath(); ctx.moveTo(x + 6, y + 34); ctx.lineTo(x + 12, y + 26); ctx.lineTo(x + 19, y + 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 30, y + 13); ctx.lineTo(x + 33, y + 5); ctx.stroke();
      // 缺角
      ctx.fillStyle = '#1a1612';
      ctx.beginPath(); ctx.moveTo(x + 38, y + 38); ctx.lineTo(x + 28, y + 38); ctx.lineTo(x + 38, y + 27); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 10, y + 2); ctx.lineTo(x + 2, y + 9); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawHookRing(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0);
    ctx.save();
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2;
    line(ctx, x, y - 32, x, y - 10); ctx.stroke();
    circ(ctx, x, y, 9.5); ctx.lineWidth = 5; ctx.strokeStyle = '#1a2028'; ctx.stroke();
    circ(ctx, x, y, 9.5); ctx.lineWidth = 3; ctx.strokeStyle = P.hook; ctx.stroke();
    circ(ctx, x, y, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = P.hunter; ctx.stroke();
    ctx.restore();
  }

  function drawPickup(ctx, st) {
    st = S(st);
    var t = N(st.t, 0);
    ctx.save();
    var bob = Math.sin(t * 3 + N(st.x, 0) * 0.05) * 2;
    ell(ctx, N(st.x, 0), N(st.y, 0) + 10, 7, 2, 0); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    matIcon(ctx, st.kind, N(st.x, 0), N(st.y, 0) + bob - 1, 20);
    ctx.restore();
  }

  function drawChest(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), b = y + 18;
    ctx.save();
    if (st.open) {
      // 拿過的空箱: 低彩度、蓋子掀到後面
      rr(ctx, x - 17, b - 20, 34, 20, 3); ctx.fillStyle = '#5a4a40'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#2a201a'; ctx.stroke();
      ctx.fillStyle = '#1a1410'; ctx.fillRect(x - 14, b - 20, 28, 5);
      rr(ctx, x - 17, b - 34, 34, 12, 3); ctx.fillStyle = '#4a3c34'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7a7068'; ctx.fillRect(x - 17, b - 12, 34, 3);
    } else {
      circ(ctx, x, b - 17, 17); ctx.fillStyle = 'rgba(255,210,63,0.2)'; ctx.fill();
      rr(ctx, x - 18, b - 20, 36, 20, 3); ctx.fillStyle = P.chest; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#3a1a08'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 18, b - 20); ctx.lineTo(x - 18, b - 27); ctx.quadraticCurveTo(x, b - 38, x + 18, b - 27); ctx.lineTo(x + 18, b - 20); ctx.closePath();
      ctx.fillStyle = '#c87638'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.chestTrim;
      ctx.fillRect(x - 18, b - 22, 36, 4); ctx.fillRect(x - 12, b - 32, 4, 32); ctx.fillRect(x + 8, b - 32, 4, 32);
      rr(ctx, x - 4, b - 24, 8, 9, 2); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 15, b - 30, 2, 5);
    }
    ctx.restore();
  }

  function drawGoal(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), b = y + 40, top = y - 40;
    ctx.save();
    ctx.fillStyle = '#2a2a34'; rr(ctx, x - 12, b - 6, 24, 6, 2); ctx.fill();
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x - 13, top + 2, 4, 74);
    circ(ctx, x - 11, top + 3, 3.5); ctx.fillStyle = P.sel; ctx.fill();
    var fy = st.reached ? top + 6 : top + 6;
    ctx.beginPath(); ctx.moveTo(x - 9, fy); ctx.lineTo(x + 20, fy + 3); ctx.quadraticCurveTo(x + 14, fy + 12, x + 20, fy + 22); ctx.lineTo(x - 9, fy + 24); ctx.closePath();
    if (st.reached) {
      ctx.fillStyle = P.goalReached; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#6a4a08'; ctx.stroke();
      ctx.strokeStyle = '#3a2a04'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 2, fy + 12); ctx.lineTo(x + 3, fy + 17); ctx.lineTo(x + 11, fy + 7); ctx.stroke();
    } else {
      ctx.fillStyle = P.goal; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#20222c';
      for (var r = 0; r < 4; r++) for (var c = 0; c < 5; c++) if ((r + c) % 2 === 0) ctx.fillRect(x - 9 + c * 6, fy + r * 6, 6, 6);
      ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = '#20222c'; ctx.stroke();
    }
    ctx.restore();
  }

  // 符石座: 本體 40x40 在框中心、底邊貼地; 外緣 100px 範圍圈
  function drawPedestal(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), b = y + 20;
    var item = runeOf(st.item);
    var sealed = !!st.sealed;
    var gp = prog(st.glowT, N(st.glowDur, 0.5));
    var glow = gp < 1 ? 1 - gp : 0;
    ctx.save();
    // 範圍圈 (外緣 = 100)
    if (!sealed) {
      var col = item ? RUNE[item].color : '#ffffff';
      var a = item ? 0.5 : 0.16;
      ctx.lineWidth = 2;
      circ(ctx, x, y, 99);
      ctx.fillStyle = item ? hexA(col, 0.05 + glow * 0.18) : 'rgba(255,255,255,' + (0.02 + glow * 0.1) + ')'; ctx.fill();
      dash(ctx, item ? [10, 6] : [4, 8]);
      ctx.strokeStyle = hexA(col, Math.min(1, a + glow * 0.5)); ctx.stroke();
      dash(ctx, []);
      if (glow > 0) { circ(ctx, x, y, 99 - 2); ctx.lineWidth = 4 * glow + 1; ctx.strokeStyle = 'rgba(255,255,255,' + (glow * 0.8) + ')'; ctx.stroke(); }
    }
    // 本體: 兩階石座
    rr(ctx, x - 18, b - 8, 36, 8, 2); ctx.fillStyle = sealed ? P.stoneDark : P.stone; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#22242e'; ctx.stroke();
    rr(ctx, x - 12, b - 18, 24, 11, 2); ctx.fillStyle = sealed ? P.seal : '#9298ae'; ctx.fill(); ctx.stroke();
    ell(ctx, x, b - 18, 8, 2.5, 0); ctx.fillStyle = sealed ? '#2a2c36' : (item ? RUNE[item].color : '#3a3e50'); ctx.fill();
    if (sealed) {
      // 鎖鏈交叉 + 鎖
      ctx.strokeStyle = '#a8acbc'; ctx.lineWidth = 2;
      dash(ctx, [3, 2]);
      line(ctx, x - 17, b - 19, x + 17, b - 2); ctx.stroke();
      line(ctx, x + 17, b - 19, x - 17, b - 2); ctx.stroke();
      dash(ctx, []);
      lockIcon(ctx, x, b - 28, 16, '#a8acbc');
    } else if (item) {
      ell(ctx, x, b - 18, 12, 4, 0); ctx.fillStyle = hexA(RUNE[item].color, 0.35); ctx.fill();
      runeIcon(ctx, item, x, b - 36, 28);
    }
    if (glow > 0) {
      ctx.globalAlpha = glow;
      circ(ctx, x, b - 22, 22); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function hexA(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length !== 6) return 'rgba(255,255,255,' + a + ')';
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + CL(a, 0, 1) + ')';
  }

  function routeLine(ctx, pts, col, lw) {
    var n = Math.min(pts.length, 4000);
    if (n < 2) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var p = pts[i] || {};
      if (i === 0) ctx.moveTo(N(p.x), N(p.y)); else ctx.lineTo(N(p.x), N(p.y));
    }
    ctx.lineWidth = lw + 4; ctx.strokeStyle = 'rgba(8,8,16,0.55)'; dash(ctx, [lw * 3, lw * 2]); ctx.stroke();
    ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
    dash(ctx, []);
    var p0 = pts[0] || {}, pl = pts[n - 1] || {}, pp = pts[n - 2] || {};
    circ(ctx, N(p0.x), N(p0.y), lw * 1.4); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#0a0a12'; ctx.stroke();
    var ang = Math.atan2(N(pl.y) - N(pp.y), N(pl.x) - N(pp.x));
    arrowHead(ctx, N(pl.x) + Math.cos(ang) * lw, N(pl.y) + Math.sin(ang) * lw, ang, lw * 4, col);
  }

  function drawRoutePath(ctx, st) {
    st = S(st);
    var pts = Array.isArray(st.points) ? st.points : [];
    ctx.save();
    ctx.globalAlpha = 0.85;
    routeLine(ctx, pts, CLS[clsOf(st.cls)].color, 6);
    ctx.restore();
  }

  // ───────── 玩家 ─────────
  function hero(ctx, cls, pose, pt) {
    var c = CLS[cls];
    var lf = 2, lb = -2, legH = 12, arm = 1.2, bob = 0, lean = 0, squat = 0;
    if (pose === 'run') { var s = Math.sin(pt * 16); lf = 5 * s; lb = -5 * s; arm = 0.7 + 0.6 * s; bob = -Math.abs(s) * 1.5; }
    else if (pose === 'rise') { legH = 8; lf = 3; lb = -4; arm = -0.9; }
    else if (pose === 'fall') { lf = 4; lb = -5; arm = -0.3; }
    else if (pose === 'slash') { arm = -0.1; lf = 4; lb = -4; }
    else if (pose === 'dash') { lean = 0.35; arm = 0.05; lf = 3; lb = -4; legH = 8; }
    else if (pose === 'shoot') { arm = -0.05; }
    else if (pose === 'hook') { arm = -1.3; legH = 10; lf = 2; lb = -3; }
    else if (pose === 'throw') { arm = pt < 0.12 ? -2.4 : -0.4; lf = 3; lb = -3; }
    else if (pose === 'wave') { squat = 4; arm = 1.5; lf = 5; lb = -6; legH = 8; }
    else if (pose === 'hurt') { lean = -0.3; arm = -0.7; legH = 8; lf = 2; lb = -1; }

    ctx.translate(0, bob + squat);
    if (lean) { ctx.translate(0, 22); ctx.rotate(lean); ctx.translate(0, -22); }
    var hy = -12.5, sx = 3, sy = -3;
    var ax = sx + Math.cos(arm) * 9, ay = sy + Math.sin(arm) * 9;
    var shapes = [
      function () { rr(ctx, -6 + lb, 22 - legH - squat, 6, legH, 2); },
      function () { rr(ctx, 0 + lf, 22 - legH - squat, 6, legH, 2); },
      function () { rr(ctx, -9, -6, 18, 17, 4); },
      function () { circ(ctx, 1, hy, 7.5); }
    ];
    // 白色外輪廓 (玩家專屬, 與怪物的深色輪廓區分)
    ctx.fillStyle = P.heroLine; ctx.strokeStyle = P.heroLine; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    shapes.forEach(function (f) { f(); ctx.stroke(); });
    line(ctx, sx, sy, ax, ay); ctx.lineWidth = 8; ctx.stroke();
    // 背包 (炸彈工)
    if (cls === 'bomber') { circ(ctx, -10, 0, 5); ctx.fillStyle = P.bomb; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.heroLine; ctx.stroke(); }
    ctx.fillStyle = c.dark; shapes[0](); ctx.fill(); shapes[1](); ctx.fill();
    ctx.fillStyle = c.color; shapes[2](); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-7, -4, 14, 3);
    ctx.fillStyle = P.skin; shapes[3](); ctx.fill();
    circ(ctx, 4.5, hy, 1.4); ctx.fillStyle = '#1a1a24'; ctx.fill();
    hat(ctx, cls, 1, hy, 7.5);
    line(ctx, sx, sy, ax, ay); ctx.lineWidth = 5; ctx.strokeStyle = c.color; ctx.stroke();
    // 武器
    if (cls === 'sword') {
      var ba = (pose === 'slash' || pose === 'dash') ? 0 : arm - 1.1;
      var bl = (pose === 'slash' || pose === 'dash') ? 11 : 13;
      line(ctx, ax, ay, ax + Math.cos(ba) * bl, ay + Math.sin(ba) * bl);
      ctx.lineWidth = 4; ctx.strokeStyle = '#2a3040'; ctx.stroke();
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#e8eef8'; ctx.stroke();
      line(ctx, ax - Math.sin(ba) * 3, ay + Math.cos(ba) * 3, ax + Math.sin(ba) * 3, ay - Math.cos(ba) * 3);
      ctx.lineWidth = 2; ctx.strokeStyle = P.chestTrim; ctx.stroke();
    } else if (cls === 'hunter') {
      var drawn = pose === 'shoot';
      ctx.beginPath(); ctx.arc(ax - 1, ay, 8, -1.2, 1.2);
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a5a2a'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax - 1 + Math.cos(-1.2) * 8, ay + Math.sin(-1.2) * 8);
      ctx.lineTo(drawn ? ax - 6 : ax + 1.5, ay);
      ctx.lineTo(ax - 1 + Math.cos(1.2) * 8, ay + Math.sin(1.2) * 8);
      ctx.lineWidth = 1; ctx.strokeStyle = '#f4f2ea'; ctx.stroke();
      if (drawn) { line(ctx, ax - 6, ay, ax + 9, ay); ctx.lineWidth = 1.5; ctx.strokeStyle = P.arrow; ctx.stroke(); }
    } else if (pose === 'throw' && pt < 0.12) {
      circ(ctx, ax, ay, 4); ctx.fillStyle = P.bomb; ctx.fill();
    }
    if (pose === 'hurt') {
      ctx.fillStyle = 'rgba(255,60,60,0.35)'; shapes[2](); ctx.fill(); shapes[3](); ctx.fill();
    }
  }

  function drawPlayer(ctx, st) {
    st = S(st);
    var x = N(st.x, 0), y = N(st.y, 0), f = face(st.facing);
    var cls = clsOf(st.cls);
    var pose = typeof st.pose === 'string' ? st.pose : 'idle';
    var pt = CL(N(st.poseT, 0), 0, 1e6);
    ctx.save();
    if (st.invuln && Math.floor(nowS() * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.translate(x, y);
    ctx.scale(f, 1);
    // 衝刺斬速度線 (反方向框外至多 60px)
    if (pose === 'dash') {
      ctx.strokeStyle = 'rgba(200,225,255,0.85)'; ctx.lineCap = 'round';
      [[-12, 50, 3], [0, 60, 3.5], [12, 44, 3]].forEach(function (l) {
        line(ctx, -16, l[0], -14 - l[1], l[0]); ctx.lineWidth = l[2]; ctx.stroke();
      });
    }
    // 揮砍刀光: 面向側框外 50x40, 與身體中心同高, 0.15 秒
    if (pose === 'slash' && cls === 'sword' && pt < 0.15) {
      var a = 1 - pt / 0.15;
      ctx.save();
      ctx.globalAlpha *= 0.4 + 0.6 * a;
      ctx.beginPath();
      ctx.arc(14, 0, 46, -0.42, 0.42);
      ctx.arc(2, 0, 47, 0.38, -0.38, true);
      ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.sword; ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    hero(ctx, cls, pose, pt);
    ctx.restore();
    ctx.restore();
  }

  function drawRangeRing(ctx, st) {
    st = S(st);
    var r = CL(N(st.radius, 260), 0, 2000);
    ctx.save();
    circ(ctx, N(st.x), N(st.y), Math.max(0, r - 1));
    ctx.fillStyle = 'rgba(60,207,110,0.04)'; ctx.fill();
    dash(ctx, [2, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(60,207,110,0.45)'; ctx.stroke();
    dash(ctx, []);
    ctx.restore();
  }

  // ───────── 怪物共用 ─────────
  function enemyBegin(ctx, st, w, h) {
    var x = N(st.x, 0), y = N(st.y, 0), f = face(st.facing);
    ctx.translate(x, y);
    ctx.scale(f, 1);
    return { hit: !!st.hit, t: N(st.t, 0), state: st.state };
  }
  function eFill(ctx, e, col) { ctx.fillStyle = e.hit ? '#ffffff' : col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.enemyLine; ctx.stroke(); }
  function eEye(ctx, x, y, r, big) {
    circ(ctx, x, y, r + (big ? 1.2 : 0)); ctx.fillStyle = P.enemyEye; ctx.fill();
    circ(ctx, x + 0.5, y - 0.5, r * 0.35); ctx.fillStyle = '#fff'; ctx.fill();
  }
  function xEye(ctx, x, y) {
    ctx.strokeStyle = P.enemyLine; ctx.lineWidth = 1.8;
    line(ctx, x - 2.5, y - 2.5, x + 2.5, y + 2.5); ctx.stroke();
    line(ctx, x + 2.5, y - 2.5, x - 2.5, y + 2.5); ctx.stroke();
  }
  // 擊飛速度線: 畫在面向側框外 (預設飛行方向 = -facing), 至多 40px
  function flungLines(ctx, hw) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineCap = 'round';
    [[-8, 34, 2.5], [0, 40, 3], [8, 28, 2.5]].forEach(function (l) {
      line(ctx, hw + 2, l[0], hw + 2 + l[1] - 2, l[0]); ctx.lineWidth = l[2]; ctx.stroke();
    });
  }
  function stars(ctx, cx, cy, t) {
    for (var i = 0; i < 3; i++) {
      var a = t * 5 + i * Math.PI * 2 / 3;
      var sx = cx + Math.cos(a) * 12, sy = cy + Math.sin(a) * 4;
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var aa = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? 1.8 : 4.5;
        ctx.lineTo(sx + Math.cos(aa) * rr2, sy + Math.sin(aa) * rr2);
      }
      ctx.closePath(); ctx.fillStyle = '#ffe680'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#6a4a08'; ctx.stroke();
    }
  }

  function drawBoar(ctx, st) {
    st = S(st);
    ctx.save();
    var e = enemyBegin(ctx, st);
    var s = e.state, t = e.t;
    if (s === 'flung') { flungLines(ctx, 24); ctx.rotate(-0.3); }
    var dx = s === 'windup' ? -3 : (s === 'charge' ? 2 : 0);
    var dy = s === 'windup' ? 2 : 0;
    // 腳
    var sw = s === 'walk' ? Math.sin(t * 12) * 3 : (s === 'charge' ? Math.sin(t * 30) * 4 : 0);
    ctx.fillStyle = e.hit ? '#fff' : '#4a2618';
    [-12 + sw, -5 - sw, 7 + sw, 13 - sw].forEach(function (lx) { ctx.fillRect(lx + dx, 8, 4, 8); });
    if (s === 'windup') {
      // 後腳刨地的塵土
      ctx.fillStyle = 'rgba(220,200,170,0.8)';
      circ(ctx, -20, 13, 3 + Math.abs(Math.sin(t * 20)) * 1.5); ctx.fill(); circ(ctx, -16, 10, 2); ctx.fill();
    }
    if (s === 'charge') {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      line(ctx, -24, -4, -19, -4); ctx.stroke(); line(ctx, -24, 4, -18, 4); ctx.stroke();
    }
    // 身體
    ell(ctx, -2 + dx, 2 + dy, 19, 10.5, 0);
    if (s === 'windup' || s === 'charge') { ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,59,74,0.7)'; ctx.stroke(); ctx.restore(); ell(ctx, -2 + dx, 2 + dy, 19, 10.5, 0); }
    eFill(ctx, e, P.boar);
    // 鬃毛
    ctx.beginPath(); ctx.moveTo(-16 + dx, -4 + dy);
    for (var i = 0; i < 5; i++) { ctx.lineTo(-13 + i * 5 + dx, -13 + dy); ctx.lineTo(-10 + i * 5 + dx, -7 + dy); }
    ctx.closePath(); ctx.fillStyle = e.hit ? '#fff' : '#4a2618'; ctx.fill();
    // 鼻 + 獠牙
    rr(ctx, 15 + dx, -1 + dy, 8, 9, 3); eFill(ctx, e, '#d08a7a');
    ctx.beginPath(); ctx.moveTo(15 + dx, 7 + dy); ctx.quadraticCurveTo(22 + dx, 8 + dy, 21 + dx, 1 + dy);
    ctx.lineWidth = 2.5; ctx.strokeStyle = (s === 'charge' || s === 'windup') ? '#ffd0d0' : '#f4f2ea'; ctx.stroke();
    if (s === 'stun') { xEye(ctx, 10 + dx, -3 + dy); } else eEye(ctx, 10 + dx, -3 + dy, 2.2, s === 'windup' || s === 'charge');
    if (s === 'stun') {
      ell(ctx, -2, 2, 19, 10.5, 0); ctx.fillStyle = 'rgba(160,160,180,0.35)'; ctx.fill();
      ctx.save(); ctx.scale(face(st.facing), 1); stars(ctx, 0, -26, t); ctx.restore();
    }
    ctx.restore();
  }

  function drawShieldman(ctx, st) {
    st = S(st);
    ctx.save();
    var e = enemyBegin(ctx, st);
    var s = e.state, t = e.t;
    if (s === 'flung') { flungLines(ctx, 16); ctx.rotate(-0.4); }
    var sw = s === 'walk' ? Math.sin(t * 8) * 2.5 : 0;
    ctx.fillStyle = e.hit ? '#fff' : '#2c3240';
    ctx.fillRect(-7 + sw, 12, 5, 10); ctx.fillRect(1 - sw, 12, 5, 10);
    rr(ctx, -10, -8, 17, 21, 4); eFill(ctx, e, P.shield);
    // 頭盔
    circ(ctx, -2, -14, 7.5); eFill(ctx, e, '#7a8498');
    ctx.fillStyle = '#14161e'; ctx.fillRect(-2, -16, 8, 3.5);
    eEye(ctx, 3, -14.3, 1.5, false);
    ctx.fillStyle = e.hit ? '#fff' : P.danger; ctx.fillRect(-4, -23, 4, 4);
    // 盾 (面向側, 框內)
    var flash = s === 'block';
    rr(ctx, 5, -18, 10, 36, 3);
    ctx.fillStyle = (e.hit || flash) ? '#ffffff' : '#c0c8d4'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = flash ? P.sel : P.enemyLine; ctx.stroke();
    if (!flash && !e.hit) {
      ctx.fillStyle = '#6a7488'; ctx.fillRect(7, -15, 6, 30);
      ctx.fillStyle = P.danger; ctx.fillRect(8.5, -4, 3, 10); ctx.fillRect(7, -1, 6, 3);
    }
    if (flash) {
      ctx.strokeStyle = P.sel; ctx.lineWidth = 2; ctx.lineCap = 'round';
      line(ctx, 15, -12, 16, -16); ctx.stroke(); line(ctx, 15, 0, 16, 0); ctx.stroke(); line(ctx, 15, 12, 16, 16); ctx.stroke();
    }
    ctx.restore();
  }

  function drawShooterBee(ctx, st) {
    st = S(st);
    ctx.save();
    var e = enemyBegin(ctx, st);
    var s = e.state, t = e.t;
    if (s === 'flung') { flungLines(ctx, 16); ctx.rotate(-0.6); }
    var aim = s === 'aim';
    var shake = aim ? Math.sin(t * 60) * 0.8 : 0;
    ctx.translate(shake, 0);
    // 翅膀
    var wf = Math.sin(t * 40) * 3;
    ell(ctx, -3, -9 - wf * 0.3, 6, 4 + wf * 0.5, -0.4); ctx.fillStyle = 'rgba(230,240,255,0.75)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = P.enemyLine; ctx.stroke();
    ell(ctx, 3, -9 + wf * 0.3, 5, 3.5 - wf * 0.3, 0.4); ctx.fill(); ctx.stroke();
    // 身體
    ell(ctx, -1, 2, 11, 8.5, 0); eFill(ctx, e, P.bee);
    if (!e.hit) {
      ctx.save(); ell(ctx, -1, 2, 11, 8.5, 0); ctx.clip();
      ctx.fillStyle = '#20180c'; ctx.fillRect(-7, -8, 3.5, 20); ctx.fillRect(0, -8, 3.5, 20);
      ctx.restore();
    }
    // 螫針
    ctx.beginPath(); ctx.moveTo(9, -1); ctx.lineTo(16, 3); ctx.lineTo(9, 6); ctx.closePath();
    ctx.fillStyle = aim ? P.beeShot : '#20180c'; ctx.fill();
    if (aim) {
      circ(ctx, 14, 3, 4 + Math.abs(Math.sin(t * 20)) * 1.5); ctx.lineWidth = 2; ctx.strokeStyle = P.beeShot; ctx.stroke();
    }
    eEye(ctx, 6, -2, 2, aim);
    ctx.restore();
  }

  function drawFrog(ctx, st) {
    st = S(st);
    ctx.save();
    var e = enemyBegin(ctx, st);
    var s = e.state;
    if (s === 'flung') { flungLines(ctx, 16); ctx.rotate(-0.5); }
    if (s === 'jump') {
      // 伸展: 後腳往後下伸直
      ctx.fillStyle = e.hit ? '#fff' : '#5a7a1a';
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-15, 12); ctx.lineTo(-11, 13); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(13, 9); ctx.lineTo(10, 10); ctx.closePath(); ctx.fill();
      ell(ctx, 0, -1, 11, 8.5, -0.25); eFill(ctx, e, P.frog);
      ell(ctx, 2, 3, 6, 3.5, -0.25); ctx.fillStyle = e.hit ? '#fff' : '#d8e090'; ctx.fill();
      circ(ctx, 6, -8, 3.6); eFill(ctx, e, P.frog); eEye(ctx, 6.5, -8, 1.8, false);
      circ(ctx, -1, -9, 3.4); eFill(ctx, e, P.frog); eEye(ctx, -0.5, -9, 1.6, false);
    } else {
      // 蹲: 扁寬, 腳折在兩側
      ctx.fillStyle = e.hit ? '#fff' : '#5a7a1a';
      ell(ctx, -10, 11, 6, 3, 0); ctx.fill(); ell(ctx, 10, 11, 6, 3, 0); ctx.fill();
      ell(ctx, 0, 6, 13.5, 7.5, 0); eFill(ctx, e, P.frog);
      ell(ctx, 3, 9, 7, 3, 0); ctx.fillStyle = e.hit ? '#fff' : '#d8e090'; ctx.fill();
      circ(ctx, 7, -1, 3.8); eFill(ctx, e, P.frog); eEye(ctx, 7.5, -1, 1.9, false);
      circ(ctx, -1, -2, 3.6); eFill(ctx, e, P.frog); eEye(ctx, -0.5, -2, 1.7, false);
    }
    ctx.restore();
  }

  // ───────── 飛行物 / 特效 ─────────
  function drawBeeShot(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y);
    ctx.save();
    circ(ctx, x, y, 5.5); ctx.fillStyle = P.beeShot; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#3a0010'; ctx.stroke();
    circ(ctx, x, y, 2); ctx.fillStyle = '#ffe0e8'; ctx.fill();
    ctx.restore();
  }

  function drawArrow(ctx, st) {
    st = S(st);
    ctx.save();
    ctx.translate(N(st.x), N(st.y)); ctx.rotate(N(st.angle, 0));
    line(ctx, -11, 0, 8, 0); ctx.lineWidth = 3; ctx.strokeStyle = '#1a1a24'; ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = P.arrow; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -3); ctx.lineTo(6, 3); ctx.closePath(); ctx.fillStyle = '#d8e0ec'; ctx.fill();
    ctx.fillStyle = P.hunter;
    ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-7, 0); ctx.lineTo(-12, 3); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBomb(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y), t = N(st.t, 0);
    ctx.save();
    circ(ctx, x, y + 1, 6.5); ctx.fillStyle = P.bomb; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = P.bomber; ctx.stroke();
    circ(ctx, x - 2, y - 1, 1.8); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    line(ctx, x + 3, y - 4, x + 5, y - 6); ctx.lineWidth = 2; ctx.strokeStyle = '#8a6a40'; ctx.stroke();
    circ(ctx, x + 5.5, y - 6.5, 1.5 + Math.abs(Math.sin(t * 30)) * 1.2); ctx.fillStyle = '#ffe680'; ctx.fill();
    ctx.restore();
  }

  function drawExplosion(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y), R = CL(N(st.radius, 60), 0, 400);
    var p = prog(st.t, N(st.dur, 0.25));
    ctx.save();
    var r = R * (0.35 + 0.65 * Math.min(1, p * 1.6));
    ctx.globalAlpha = 1 - p * 0.85;
    circ(ctx, x, y, r); ctx.fillStyle = P.blast; ctx.fill();
    circ(ctx, x, y, r * 0.65); ctx.fillStyle = '#ffd060'; ctx.fill();
    circ(ctx, x, y, r * 0.3); ctx.fillStyle = '#fff6d0'; ctx.fill();
    // 碎塊
    ctx.fillStyle = '#5a3020';
    for (var i = 0; i < 6; i++) {
      var a = i * 1.05 + 0.3;
      ctx.fillRect(x + Math.cos(a) * r * 0.9 - 2, y + Math.sin(a) * r * 0.9 - 2, 4, 4);
    }
    ctx.restore();
  }

  function drawShockwave(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y), R = CL(N(st.radius, 130), 0, 600);
    var p = prog(st.t, N(st.dur, 0.3));
    ctx.save();
    var r = R * (0.15 + 0.85 * p) - 3;
    ctx.globalAlpha = 1 - p * 0.7;
    // 往外推的環 (只有線, 不填滿), 冷白色 — 與暖色實心爆炸區分
    circ(ctx, x, y, Math.max(1, r)); ctx.lineWidth = 6; ctx.strokeStyle = P.wave; ctx.stroke();
    circ(ctx, x, y, Math.max(1, r - 8)); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,170,90,0.8)'; ctx.stroke();
    ctx.strokeStyle = P.wave; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      line(ctx, x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14), x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4)); ctx.stroke();
    }
    ctx.restore();
  }

  function drawPoof(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y), p = prog(st.t, N(st.dur, 0.3));
    ctx.save();
    ctx.globalAlpha = 1 - p;
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 + 0.4;
      var d = 4 + p * 10;
      circ(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 6 + p * 3);
      ctx.fillStyle = i % 2 ? P.poof : '#a8a8b8'; ctx.fill();
    }
    circ(ctx, x, y, 7 * (1 - p) + 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  function drawPopup(ctx, st) {
    st = S(st);
    var p = prog(st.t, N(st.dur, 0.8));
    var x = N(st.x), y = N(st.y) - 30 * p;
    var kind = kindOf(st.kind), v = Math.round(CL(N(st.value, 1), 0, 999));
    ctx.save();
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    var w = txt(ctx, '+' + v, x - 4, y, { size: 18, color: kind === 'wood' ? '#ffcf90' : (kind === 'ench' ? '#e4c4ff' : '#b8f4ff'), align: 'right' });
    matIcon(ctx, kind, x + 8, y, 16);
    ctx.restore();
  }

  function drawChainText(ctx, st) {
    st = S(st);
    var p = prog(st.t, N(st.dur, 0.8));
    var n = Math.round(CL(N(st.n, 2), 0, 999));
    var sc = p < 0.15 ? 1 + 0.3 * (p / 0.15) : (p < 0.3 ? 1.3 - 0.3 * ((p - 0.15) / 0.15) : 1);
    ctx.save();
    ctx.translate(N(st.x), N(st.y) - 30 * Math.max(0, (p - 0.3) / 0.7));
    ctx.scale(sc, sc);
    ctx.globalAlpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
    txt(ctx, n + ' 連鎖', 0, 0, { size: 24, color: '#ffe066', align: 'center', lw: 6 });
    ctx.restore();
  }

  function drawItemIcon(ctx, st) {
    st = S(st);
    ctx.save();
    runeIcon(ctx, st.type, N(st.x), N(st.y), 32);
    ctx.restore();
  }

  function drawItemNotice(ctx, st) {
    st = S(st);
    var t = N(st.t, 0), d = N(st.dur, 1.5);
    var a = t < 0.2 ? t / 0.2 : (t > d - 0.3 ? (d - t) / 0.3 : 1);
    var type = runeOf(st.type) || 'harvest';
    ctx.save();
    ctx.globalAlpha = CL(a, 0, 1);
    rr(ctx, 440, 52, 400, 44, 10); ctx.fillStyle = 'rgba(12,14,26,0.88)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = RUNE[type].color; ctx.stroke();
    runeIcon(ctx, type, 440 + 120, 74, 32);
    txt(ctx, '獲得 ' + RUNE[type].name, 440 + 144, 74, { size: 20, color: P.text });
    ctx.restore();
  }

  // ───────── 大地圖 ─────────
  function drawMapLink(ctx, st) {
    st = S(st);
    var x1 = N(st.x1), y1 = N(st.y1), x2 = N(st.x2), y2 = N(st.y2);
    var mx = (x1 + x2) / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (st.lit) {
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = P.sel; ctx.stroke();
    } else {
      dash(ctx, [6, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(150,160,180,0.45)'; ctx.stroke();
      dash(ctx, []);
    }
    ctx.restore();
  }

  function cardText(ctx, x, y, st, dim) {
    var idx = Math.round(CL(N(st.index, 1), 0, 99));
    txt(ctx, idx + ' ' + (st.name == null ? '' : st.name), x + 8, y + 115, { size: 14, color: dim ? P.textMute : P.text });
  }

  function drawLevelCard(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y);
    var s = ['sealed', 'buyable', 'open', 'cleared'].indexOf(st.state) >= 0 ? st.state : 'sealed';
    ctx.save();
    var fill = { sealed: '#1c1e26', buyable: '#2a2a2a', open: '#232c3c', cleared: '#1f3530' }[s];
    var lineC = { sealed: '#34384a', buyable: '#a08a40', open: '#5a6890', cleared: '#5ac08a' }[s];
    rr(ctx, x, y, 176, 136, 10); ctx.fillStyle = '#05060c'; ctx.fill();
    rr(ctx, x + 2, y + 2, 172, 132, 9); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = lineC; ctx.stroke();
    // 縮圖區底
    ctx.fillStyle = (s === 'open' || s === 'cleared') ? P.bg : '#121319';
    ctx.fillRect(x + 8, y + 8, 160, 90);
    if (s === 'sealed' || s === 'buyable') {
      var lc = s === 'buyable' ? P.sel : '#5a5e70';
      lockIcon(ctx, x + 88, y + 38, 30, lc);
      costRow(ctx, st.cost, x + 88, y + 76, s === 'buyable' ? st.canAfford : true, 16, 'center');
    }
    cardText(ctx, x, y, st, s === 'sealed');
    if (s === 'cleared') {
      clsIcon(ctx, st.recordCls, x + 112, y + 114, 16);
      txt(ctx, f1(st.recordTime) + 's', x + 168, y + 115, { size: 13, color: P.text, align: 'right' });
      var r = mat(st.rates);
      KINDS.forEach(function (k, i) {
        var bx = x + 8 + i * 56;
        matIcon(ctx, k, bx + 6, y + 129, 12);
        txt(ctx, f1(r[k]), bx + 14, y + 129, { size: 12, color: P.text });
      });
    } else if (s === 'open') {
      txt(ctx, '未過關', x + 8, y + 129, { size: 12, color: P.textDim });
    } else if (s === 'buyable') {
      txt(ctx, 'Z 解鎖', x + 8, y + 129, { size: 12, color: affordOf(st.canAfford, 'wood') ? P.sel : P.textDim });
    } else {
      txt(ctx, '先過前一關', x + 8, y + 129, { size: 12, color: P.textMute });
    }
    if (s === 'sealed') { rr(ctx, x, y, 176, 136, 10); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); }
    ctx.restore();
  }

  function selFrame(ctx, x, y, w, h) {
    var p = 0.5 + 0.5 * Math.sin(nowS() * 5);
    rr(ctx, x - 5, y - 5, w + 10, h + 10, 13);
    ctx.lineWidth = 3; ctx.strokeStyle = P.sel; ctx.stroke();
    rr(ctx, x - 5, y - 5, w + 10, h + 10, 13);
    ctx.lineWidth = 6; ctx.strokeStyle = hexA(P.sel, 0.15 + 0.2 * p); ctx.stroke();
  }

  function drawCardOverlay(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y);
    var lv = Math.round(CL(N(st.accelLv, 0), 0, 2));
    ctx.save();
    ctx.strokeStyle = '#0a0c12'; ctx.lineWidth = 3; ctx.strokeRect(x + 8 - 1.5, y + 8 - 1.5, 163, 93);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 8.5, y + 8.5, 159, 89);
    if (lv > 0) {
      var label = lv === 1 ? '×1.25' : '×1.5';
      rr(ctx, x + 168 - 46, y + 11, 43, 17, 4); ctx.fillStyle = 'rgba(8,30,40,0.9)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = P.time; ctx.stroke();
      txt(ctx, label, x + 168 - 24.5, y + 19.5, { size: 12, color: P.time, align: 'center', stroke: false });
    }
    if (st.selected) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function drawGoalCard(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y);
    var cost = mat(st.cost);
    var all = KINDS.every(function (k) { return affordOf(st.canAfford, k); });
    ctx.save();
    rr(ctx, x, y, 200, 136, 10); ctx.fillStyle = '#05060c'; ctx.fill();
    rr(ctx, x + 2, y + 2, 196, 132, 9); ctx.fillStyle = all ? '#3a3220' : '#22242c'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = all ? P.sel : '#5a5e70'; ctx.stroke();
    // 凱旋門
    var cx = x + 100, by = y + 82;
    if (all) { circ(ctx, cx, by - 30, 40); ctx.fillStyle = 'rgba(255,224,102,0.18)'; ctx.fill(); }
    ctx.beginPath();
    ctx.moveTo(cx - 44, by); ctx.lineTo(cx - 44, by - 52); ctx.lineTo(cx + 44, by - 52); ctx.lineTo(cx + 44, by);
    ctx.lineTo(cx + 16, by); ctx.lineTo(cx + 16, by - 24); ctx.arc(cx, by - 24, 16, 0, Math.PI, true); ctx.lineTo(cx - 16, by);
    ctx.closePath();
    ctx.fillStyle = all ? '#e8d8a8' : '#8a8a98'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a34'; ctx.stroke();
    ctx.fillStyle = all ? P.sel : '#a8a8b8'; ctx.fillRect(cx - 48, by - 60, 96, 8);
    ctx.strokeRect(cx - 48, by - 60, 96, 8);
    ctx.fillStyle = all ? '#c8a858' : '#6a6a78'; ctx.fillRect(cx - 38, by - 46, 10, 40); ctx.fillRect(cx + 28, by - 46, 10, 40);
    txt(ctx, '凱旋門', cx, y + 98, { size: 15, color: all ? P.sel : P.text, align: 'center' });
    // 花費: 不足的那種畫紅
    KINDS.forEach(function (k, i) {
      var bx = x + 10 + i * 64;
      matIcon(ctx, k, bx + 7, y + 121, 14);
      txt(ctx, Math.round(cost[k]), bx + 17, y + 121, { size: 13, color: affordOf(st.canAfford, k) ? P.text : P.bad });
    });
    if (st.selected) selFrame(ctx, x, y, 200, 136);
    ctx.restore();
  }

  function drawFlyingMaterial(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y), kind = kindOf(st.kind);
    var tx = HUD_ICON_X[kind], ty = 20;
    var ang = Math.atan2(ty - y, tx - x);
    ctx.save();
    // 拖尾: 飛向資訊列圖示的反方向, 至多 24px
    var col = kind === 'wood' ? P.wood : (kind === 'ench' ? P.ench : P.time);
    for (var i = 3; i >= 1; i--) {
      circ(ctx, x - Math.cos(ang) * (8 + i * 5), y - Math.sin(ang) * (8 + i * 5), 5 - i);
      ctx.fillStyle = hexA(col, 0.55 - i * 0.12); ctx.fill();
    }
    circ(ctx, x, y, 10); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    matIcon(ctx, kind, x, y, 18);
    ctx.restore();
  }

  // ───────── 關卡面板 ─────────
  function drawLevelPanel(ctx, st) {
    st = S(st);
    var row = Math.round(CL(N(st.row, 0), 0, 2));
    ctx.save();
    // 暗幕 + 面板底 (挖空預覽框, 不論 RD 先畫或後畫預覽都不被蓋)
    ctx.fillStyle = 'rgba(4,6,12,0.7)'; ctx.fillRect(0, 0, W, H);
    rr(ctx, 44, 54, 1200, 640, 14); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    ctx.beginPath();
    ctx.rect(40, 48, 1200, 640);
    ctx.rect(60, 96, 640, 360);
    ctx.fillStyle = P.panel;
    try { ctx.fill('evenodd'); } catch (e) { ctx.fill(); }
    rr(ctx, 40, 48, 1200, 640, 14); ctx.lineWidth = 2; ctx.strokeStyle = P.panelLine; ctx.stroke();
    var idx = Math.round(CL(N(st.index, 1), 0, 99));
    txt(ctx, '第 ' + idx + ' 關 ' + (st.name == null ? '' : st.name), 60, 74, { size: 22 });
    // 預覽外框
    ctx.lineWidth = 2; ctx.strokeStyle = '#6a7290'; ctx.strokeRect(59, 95, 642, 362);

    // 背包
    var items = Array.isArray(st.items) ? st.items : [];
    txt(ctx, '符石背包', 700, 466, { size: 12, color: P.textDim, align: 'right' });
    for (var i = 0; i < 8; i++) {
      var bx = 60 + i * 80, by = 476;
      bagCell(ctx, bx, by, items[i]);
    }

    // 職業列
    rowBox(ctx, 720, 96, 480, 150, '職業', row === 0);
    var classes = Array.isArray(st.classes) ? st.classes : [];
    var cs = Math.round(CL(N(st.clsSel, 0), 0, 2));
    for (var c = 0; c < 3; c++) {
      var ci = classes[c] || {};
      var cls = CLS[ci.cls] ? ci.cls : CLS_ORDER[c];
      var cx = 728 + c * 158, cy = 118;
      var sel = c === cs, owned = !!ci.owned;
      rr(ctx, cx, cy, 150, 120, 8);
      ctx.fillStyle = sel ? '#323a54' : P.panel2; ctx.fill();
      ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? (row === 0 ? P.sel : '#a0a6c0') : '#3a4058'; ctx.stroke();
      ctx.save();
      if (!owned) ctx.globalAlpha = 0.5;
      clsIcon(ctx, cls, cx + 75, cy + 30, 36);
      ctx.restore();
      txt(ctx, CLS[cls].name, cx + 75, cy + 62, { size: 15, color: owned ? P.text : P.textDim, align: 'center' });
      txt(ctx, CLS[cls].good, cx + 75, cy + 82, { size: 12, color: CLS[cls].color, align: 'center' });
      if (owned) {
        if (sel) txt(ctx, 'Z 出發', cx + 75, cy + 104, { size: 14, color: P.sel, align: 'center' });
      } else {
        var cc = N(ci.cost, 0);
        var ok = ci.canAfford !== false;
        matIcon(ctx, 'wood', cx + 22, cy + 104, 14);
        txt(ctx, Math.round(cc), cx + 32, cy + 104, { size: 13, color: ok ? P.text : P.bad });
        if (sel) txt(ctx, 'Z 招募', cx + 140, cy + 104, { size: 13, color: ok ? P.sel : P.textDim, align: 'right' });
      }
    }

    // 符石座列
    rowBox(ctx, 720, 262, 480, 190, '符石座', row === 1);
    var slots = Array.isArray(st.slots) ? st.slots : [];
    var ss = Math.round(CL(N(st.slotSel, 0), 0, 3));
    for (var k = 0; k < 4; k++) {
      var so = slots[k] || { sealed: true, item: null };
      var sx = 736 + k * 70, sy = 288;
      var ssel = k === ss;
      rr(ctx, sx, sy, 58, 58, 8);
      ctx.fillStyle = ssel ? '#323a54' : P.panel2; ctx.fill();
      ctx.lineWidth = ssel ? 3 : 1.5; ctx.strokeStyle = ssel ? (row === 1 ? P.sel : '#a0a6c0') : '#3a4058'; ctx.stroke();
      txt(ctx, (k + 1) + '', sx + 8, sy + 10, { size: 11, color: P.textDim });
      if (so.sealed) lockIcon(ctx, sx + 29, sy + 31, 22, '#7a7e90');
      else if (runeOf(so.item)) runeIcon(ctx, so.item, sx + 29, sy + 31, 32);
      else { circ(ctx, sx + 29, sy + 31, 12); dash(ctx, [3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#6a7088'; ctx.stroke(); dash(ctx, []); }
    }
    var cur = slots[ss] || { sealed: true, item: null };
    var dy = 372;
    if (cur.sealed) {
      lockIcon(ctx, 752, dy, 24, '#a8acbc');
      txt(ctx, (ss + 1) + ' 號座 封印中', 776, dy - 12, { size: 15 });
      var okU = st.canAffordUnseal !== false;
      txt(ctx, '解封', 776, dy + 14, { size: 13, color: P.textDim });
      matIcon(ctx, 'ench', 818, dy + 14, 14);
      txt(ctx, Math.round(N(st.unsealCost, 0)), 828, dy + 14, { size: 14, color: okU ? P.text : P.bad });
      txt(ctx, 'Z 解封', 1186, 432, { size: 15, color: okU ? P.sel : P.textDim, align: 'right' });
    } else {
      var it = runeOf(cur.item);
      if (it) {
        runeIcon(ctx, it, 752, dy, 32);
        txt(ctx, (ss + 1) + ' 號座 ' + RUNE[it].name, 776, dy - 12, { size: 15, color: RUNE[it].color });
        txt(ctx, RUNE[it].effect, 776, dy + 14, { size: 13, color: P.text });
      } else {
        circ(ctx, 752, dy, 12); dash(ctx, [3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#6a7088'; ctx.stroke(); dash(ctx, []);
        txt(ctx, (ss + 1) + ' 號座 空', 776, dy - 12, { size: 15 });
        txt(ctx, '空', 776, dy + 14, { size: 13, color: P.textDim });
      }
      txt(ctx, 'Z 換符石', 1186, 432, { size: 15, color: P.sel, align: 'right' });
    }

    // 加速器列
    rowBox(ctx, 720, 468, 480, 90, '回放加速', row === 2);
    var lv = Math.round(CL(N(st.accelLv, 0), 0, 2));
    ['×1', '×1.25', '×1.5'].forEach(function (lb, i) {
      var ax = 736 + i * 78, ay = 516;
      rr(ctx, ax, ay - 14, 68, 28, 6);
      ctx.fillStyle = i === lv ? 'rgba(63,212,238,0.25)' : P.panel2; ctx.fill();
      ctx.lineWidth = i === lv ? 2.5 : 1; ctx.strokeStyle = i === lv ? P.time : '#3a4058'; ctx.stroke();
      txt(ctx, lb, ax + 34, ay, { size: 14, color: i <= lv ? P.time : P.textMute, align: 'center' });
    });
    if (st.accelCost == null) {
      txt(ctx, '已滿', 1186, 516, { size: 15, color: P.textDim, align: 'right' });
    } else {
      var okA = st.canAffordAccel !== false;
      txt(ctx, '下一級', 984, 516, { size: 13, color: P.textDim });
      matIcon(ctx, 'time', 1040, 516, 14);
      txt(ctx, Math.round(N(st.accelCost, 0)), 1050, 516, { size: 14, color: okA ? P.text : P.bad });
      txt(ctx, 'Z 購買', 1186, 516, { size: 15, color: okA ? P.sel : P.textDim, align: 'right' });
    }

    // 回放資訊
    rr(ctx, 720, 574, 480, 80, 8); ctx.fillStyle = '#161a28'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#3a4058'; ctx.stroke();
    txt(ctx, '目前回放', 734, 590, { size: 12, color: P.textDim });
    if (st.recordTime == null) {
      txt(ctx, '尚無回放', 734, 622, { size: 15, color: P.textMute });
    } else {
      clsIcon(ctx, st.recordCls, 746, 624, 22);
      txt(ctx, CLS[clsOf(st.recordCls)].name, 764, 624, { size: 14 });
      txt(ctx, f1(st.recordTime) + ' 秒', 840, 624, { size: 15 });
      var rt = mat(st.rates);
      KINDS.forEach(function (kk, i) {
        var rx = 940 + i * 84;
        matIcon(ctx, kk, rx, 624, 16);
        txt(ctx, f1(rt[kk]) + '/分', rx + 11, 624, { size: 13 });
      });
    }

    txt(ctx, '↑↓ 換列    ←→ 選擇    Z 確定    X 關閉', 60, 672, { size: 14, color: P.textDim });
    ctx.restore();
  }

  function rowBox(ctx, x, y, w, h, label, active) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = active ? '#20263a' : '#1a1e2c'; ctx.fill();
    ctx.lineWidth = active ? 3 : 1.5; ctx.strokeStyle = active ? P.sel : '#3a4058'; ctx.stroke();
    txt(ctx, label, x + 12, y + 12, { size: 12, color: active ? P.sel : P.textDim });
  }

  function bagCell(ctx, bx, by, it, noLabel) {
    rr(ctx, bx, by, 74, 74, 8);
    ctx.fillStyle = it ? P.panel2 : '#151826'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = it ? '#4a5270' : '#2a2e40'; ctx.stroke();
    if (!it) return;
    var tp = runeOf(it.type) || 'harvest';
    runeIcon(ctx, tp, bx + 37, by + (noLabel ? 37 : 30), noLabel ? 40 : 32);
    if (noLabel) return;
    var w = it.where;
    var s = (w && typeof w === 'object') ? ('第' + Math.round(N(w.level, 1)) + '關 ' + Math.round(N(w.slot, 1)) + '號') : '未裝';
    txt(ctx, s, bx + 37, by + 62, { size: 11, color: w ? P.text : P.textDim, align: 'center' });
  }

  function drawSlotCursor(ctx, st) {
    st = S(st);
    var x = N(st.x), y = N(st.y);
    var act = !!st.active;
    var p = act ? 0.5 + 0.5 * Math.sin(nowS() * 6) : 0;
    var h = 30 + p * 4;
    ctx.save();
    ctx.strokeStyle = act ? P.sel : 'rgba(255,224,102,0.35)';
    ctx.lineWidth = act ? 3.5 : 2; ctx.lineCap = 'round';
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
      ctx.beginPath();
      ctx.moveTo(x + c[0] * h, y + c[1] * (h - 12));
      ctx.lineTo(x + c[0] * h, y + c[1] * h);
      ctx.lineTo(x + c[0] * (h - 12), y + c[1] * h);
      ctx.stroke();
    });
    ctx.restore();
  }

  // ───────── 資訊列 ─────────
  function drawHud(ctx, st) {
    st = S(st);
    ctx.save();
    ctx.fillStyle = 'rgba(12,14,26,0.88)'; ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, HUD_H - 1, W, 1);
    var stock = mat(st.stock), rate = mat(st.ratePerMin);
    var bt = st.bumpT || {}, bd = N(st.bumpDur, 0.15);
    KINDS.forEach(function (k, i) {
      var x0 = 16 + i * 220;
      matIcon(ctx, k, HUD_ICON_X[k], 20, 24);
      var bp = prog(bt[k], bd);
      var sc = bp < 1 ? 1 + 0.3 * Math.sin(bp * Math.PI) : 1;
      ctx.save();
      ctx.translate(x0 + 40, 20); ctx.scale(sc, sc);
      txt(ctx, Math.floor(stock[k]), 0, 1, { size: 19, color: bp < 1 ? '#ffffff' : P.text });
      ctx.restore();
      txt(ctx, '+' + f1(rate[k]) + '/分', x0 + 112, 21, { size: 12, color: P.ok });
      txt(ctx, KIND_USE[k], x0 + 190, 21, { size: 11, color: P.textDim });
    });
    if (st.mode === 'level') {
      // 職業 + 技能冷卻
      var cls = clsOf(st.cls);
      clsIcon(ctx, cls, 714, 20, 22);
      var cp = prog(st.skillCdT, N(st.skillCdDur, 1));
      rr(ctx, 732, 8, 24, 24, 5); ctx.fillStyle = cp >= 1 ? '#eef0f6' : '#3a3e52'; ctx.fill();
      if (cp < 1) {
        ctx.save(); rr(ctx, 732, 8, 24, 24, 5); ctx.clip();
        ctx.beginPath(); ctx.moveTo(744, 20); ctx.arc(744, 20, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cp); ctx.closePath();
        ctx.fillStyle = hexA(CLS[cls].color, 0.75); ctx.fill(); ctx.restore();
      }
      ctx.lineWidth = 2; ctx.strokeStyle = cp >= 1 ? CLS[cls].color : '#5a5e70'; rr(ctx, 732, 8, 24, 24, 5); ctx.stroke();
      txt(ctx, 'X', 744, 20.5, { size: 13, color: cp >= 1 ? '#1a1c28' : P.text, align: 'center', stroke: cp < 1 });
      // 血量
      var mh = Math.round(CL(N(st.maxHp, 3), 0, 8)), hp = Math.round(CL(N(st.hp, 0), 0, mh));
      for (var h = 0; h < mh; h++) heart(ctx, 774 + h * 19, 20, h < hp);
      // 秒數
      var tx = 774 + Math.max(3, mh) * 19 + 6;
      txt(ctx, f1(st.time) + 's', tx, 20, { size: 16 });
      // 這趟素材
      var run = mat(st.run);
      KINDS.forEach(function (k, i) {
        var rx = tx + 64 + i * 46;
        matIcon(ctx, k, rx, 20, 14);
        txt(ctx, Math.floor(run[k]), rx + 9, 20, { size: 13 });
      });
      var ix = tx + 64 + 3 * 46 + 6;
      // 這趟開到的符石
      if (runeOf(st.itemThisRun)) { runeIcon(ctx, st.itemThisRun, ix + 10, 20, 22); }
      ix += 26;
      // 作用中的符石加成
      var buffs = Array.isArray(st.buffs) ? st.buffs.slice(0, 4) : [];
      buffs.forEach(function (b, i) {
        b = b || {};
        var bx = ix + i * 48;
        if (bx + 46 > 1272) return;
        runeIcon(ctx, b.type === 'hunt' ? 'hunt' : 'harvest', bx + 9, 20, 18);
        var fr = 1 - prog(N(b.dur, 1) - N(b.remainT, 0), N(b.dur, 1));
        rr(ctx, bx + 20, 17, 26, 6, 3); ctx.fillStyle = '#2a2e40'; ctx.fill();
        rr(ctx, bx + 20, 17, Math.max(2, 26 * fr), 6, 3); ctx.fillStyle = b.type === 'hunt' ? P.hunt : P.harvest; ctx.fill();
      });
    }
    ctx.restore();
  }

  function heart(ctx, cx, cy, full) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 6);
    ctx.bezierCurveTo(cx - 9, cy, cx - 7, cy - 8, cx, cy - 3);
    ctx.bezierCurveTo(cx + 7, cy - 8, cx + 9, cy, cx, cy + 6);
    ctx.closePath();
    ctx.fillStyle = full ? '#ff4d6a' : '#2a2e40'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = full ? '#5a0a18' : '#5a5e70'; ctx.stroke();
  }

  // ───────── 面板 ─────────
  function drawResultPanel(ctx, st) {
    st = S(st);
    var x = 280, y = 150;
    ctx.save();
    panelBox(ctx, x, y, 720, 420, { line: P.ok });
    txt(ctx, '過關', x + 360, y + 38, { size: 30, color: P.ok, align: 'center' });
    var run = mat(st.run);
    // 這趟拿到
    txt(ctx, '這趟拿到', x + 40, y + 84, { size: 13, color: P.textDim });
    KINDS.forEach(function (k, i) {
      matIcon(ctx, k, x + 130 + i * 80, y + 84, 18);
      txt(ctx, Math.floor(run[k]), x + 144 + i * 80, y + 84, { size: 16 });
    });
    var item = runeOf(st.item);
    if (item) {
      runeIcon(ctx, item, x + 420, y + 84, 28);
      txt(ctx, '獲得 ' + RUNE[item].name, x + 440, y + 84, { size: 15, color: RUNE[item].color });
    }
    if (st.oldTime == null) {
      var rates = mat(st.rates);
      rr(ctx, x + 160, y + 120, 400, 190, 10); ctx.fillStyle = P.panel2; ctx.fill();
      clsIcon(ctx, st.cls, x + 200, y + 150, 28);
      txt(ctx, CLS[clsOf(st.cls)].name, x + 222, y + 150, { size: 16 });
      txt(ctx, f1(st.time) + ' 秒', x + 530, y + 150, { size: 22, align: 'right' });
      KINDS.forEach(function (k, i) {
        var ry = y + 196 + i * 36;
        matIcon(ctx, k, x + 200, ry, 20);
        txt(ctx, KIND_NAME[k], x + 222, ry, { size: 14, color: P.textDim });
        txt(ctx, f1(rates[k]) + ' /分', x + 530, ry, { size: 18, align: 'right' });
      });
      txt(ctx, '已存成回放', x + 360, y + 340, { size: 16, color: P.ok, align: 'center' });
      txt(ctx, 'Z 回大地圖', x + 360, y + 384, { size: 18, color: P.sel, align: 'center' });
    } else {
      var A = mat(st.rates), B = mat(st.oldRates);
      var cols = [{ t: '這一趟', cls: st.cls, time: N(st.time), r: A, o: B, cx: x + 250 }, { t: '目前回放', cls: st.oldCls, time: N(st.oldTime), r: B, o: A, cx: x + 520 }];
      txt(ctx, '每分鐘產量', x + 60, y + 118, { size: 12, color: P.textDim });
      cols.forEach(function (c, ci) {
        rr(ctx, c.cx - 110, y + 106, 220, 230, 10); ctx.fillStyle = ci === 0 ? '#22304a' : P.panel2; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = ci === 0 ? P.sword : '#4a5270'; ctx.stroke();
        txt(ctx, c.t, c.cx, y + 128, { size: 16, align: 'center', color: ci === 0 ? '#ffffff' : P.textDim });
        clsIcon(ctx, c.cls, c.cx - 56, y + 164, 24);
        var tFaster = c.time < (ci === 0 ? N(st.oldTime) : N(st.time));
        txt(ctx, c.time.toFixed(1) + ' 秒', c.cx + 90, y + 164, { size: 18, align: 'right', color: tFaster ? P.ok : P.text });
        KINDS.forEach(function (k, i) {
          var ry = y + 208 + i * 40;
          var hi = c.r[k] > c.o[k] + 1e-9;
          if (hi) { rr(ctx, c.cx - 100, ry - 15, 200, 30, 6); ctx.fillStyle = 'rgba(111,224,138,0.15)'; ctx.fill(); }
          matIcon(ctx, k, c.cx - 80, ry, 20);
          txt(ctx, (hi ? '▲ ' : '') + f1(c.r[k]), c.cx + 90, ry, { size: 18, align: 'right', color: hi ? P.ok : P.text });
        });
      });
      txt(ctx, 'Z 採用這一趟    X 保留舊的', x + 360, y + 384, { size: 18, color: P.sel, align: 'center' });
    }
    ctx.restore();
  }

  function drawFailPanel(ctx) {
    ctx.save();
    panelBox(ctx, 380, 240, 520, 240, { line: P.bad });
    txt(ctx, '失敗', 640, 310, { size: 34, color: P.bad, align: 'center' });
    txt(ctx, '這趟作廢', 640, 360, { size: 15, color: P.textDim, align: 'center' });
    txt(ctx, 'Z 重來    X 回大地圖', 640, 424, { size: 18, color: P.sel, align: 'center' });
    ctx.restore();
  }

  function drawPausePanel(ctx, st) {
    st = S(st);
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,12,0.6)'; ctx.fillRect(0, 0, W, H);
    panelBox(ctx, 380, 220, 520, 280);
    txt(ctx, '暫停', 640, 300, { size: 34, align: 'center' });
    if (st.mode === 'level') {
      txt(ctx, 'Esc 繼續', 640, 380, { size: 18, color: P.sel, align: 'center' });
      txt(ctx, 'Z 重來    X 回大地圖', 640, 424, { size: 18, color: P.sel, align: 'center' });
      txt(ctx, '(回大地圖時這趟作廢)', 640, 460, { size: 12, color: P.textDim, align: 'center' });
    } else {
      txt(ctx, 'Esc 繼續', 640, 400, { size: 18, color: P.sel, align: 'center' });
    }
    ctx.restore();
  }

  function drawEndingPanel(ctx, st) {
    st = S(st);
    var tt = Math.max(0, Math.floor(CL(N(st.totalTime, 0), 0, 1e7)));
    var mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.save();
    panelBox(ctx, 280, 150, 720, 420, { line: P.sel, fill: '#2a2618' });
    drawGoalCard(ctx, { x: 540, y: 190, cost: { wood: 200, ench: 100, time: 100 }, canAfford: true, selected: false });
    txt(ctx, '凱旋門落成', 640, 380, { size: 34, color: P.sel, align: 'center' });
    txt(ctx, '總遊玩時間  ' + mm + ':' + (ss < 10 ? '0' : '') + ss, 640, 440, { size: 20, align: 'center' });
    txt(ctx, 'Z 重新開始', 640, 520, { size: 18, color: P.sel, align: 'center' });
    ctx.restore();
  }

  // ───────── 說明頁示意圖 ─────────
  var GUIDE_SIZE = [[640, 360], [600, 220], [480, 300], [560, 240], [600, 200]];

  function groundRow(ctx, x0, x1, topY, rows, theme) {
    for (var gx = x0; gx < x1; gx += 40) {
      for (var r = 0; r < rows; r++) drawGround(ctx, { x: gx + 20, y: topY + 20 + r * 40, top: r === 0, theme: theme });
    }
  }

  function gp0(ctx) {
    // 第 1 關「草原」縮小版 (虛擬 640x360)
    ctx.save(); ctx.scale(0.5, 0.5); drawBackground(ctx); ctx.restore();
    groundRow(ctx, 0, 640, 280, 2, 'plain');
    drawPickup(ctx, { x: 170, y: 266, kind: 'wood', t: 0 });
    drawBoar(ctx, { x: 300, y: 264, facing: -1, state: 'walk', hit: false, t: 0 });
    drawChest(ctx, { x: 430, y: 262, open: false });
    drawGoal(ctx, { x: 580, y: 240, reached: false });
    drawPlayer(ctx, { x: 60, y: 258, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
    // 路線: 經過木材 → 跳過野豬 → 經過寶箱 → 終點旗
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(80, 250); ctx.lineTo(170, 250);
    ctx.quadraticCurveTo(300, 150, 410, 248); ctx.lineTo(548, 248);
    dash(ctx, [10, 8]); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,8,16,0.6)'; ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); dash(ctx, []);
    arrowHead(ctx, 562, 248, 0, 16, '#ffffff');
    txt(ctx, '你', 60, 216, { size: 18, align: 'center', color: P.sword });
    txt(ctx, '終點旗', 584, 180, { size: 16, align: 'center', color: P.sel });
  }

  function guideHero(ctx, x, footY, pose, poseT, sc) {
    ctx.save(); ctx.translate(x, footY); ctx.scale(sc, sc);
    drawPlayer(ctx, { x: 0, y: -22, cls: 'sword', facing: 1, pose: pose, poseT: poseT, invuln: false });
    ctx.restore();
  }

  function gp1(ctx) {
    // 四格: 跑 / 跳 / 揮砍 / 衝刺斬 (每格 150x220)
    for (var i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(i * 150, 0);
      ctx.beginPath(); ctx.rect(2, 0, 146, 220); ctx.clip();
      ctx.fillStyle = '#1e2540'; ctx.fillRect(0, 0, 150, 220);
      groundRow(ctx, 0, 160, 180, 1, 'plain');
      if (i === 0) {
        guideHero(ctx, 75, 180, 'run', 0.1, 1.5);
        keycap(ctx, '←', 30, 140); keycap(ctx, '→', 120, 140);
      } else if (i === 1) {
        guideHero(ctx, 75, 120, 'rise', 0.05, 1.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; dash(ctx, [4, 4]);
        line(ctx, 75, 178, 75, 128); ctx.stroke(); dash(ctx, []);
        keycap(ctx, '空白鍵', 75, 30, 64, 26);
      } else if (i === 2) {
        guideHero(ctx, 45, 180, 'slash', 0.05, 1.5);
        keycap(ctx, 'Z', 45, 64);
      } else {
        drawFrog(ctx, { x: 50, y: 166, facing: 1, state: 'crouch', hit: true });
        drawPoof(ctx, { x: 50, y: 164, t: 0.08, dur: 0.3 });
        guideHero(ctx, 112, 180, 'dash', 0.05, 1.5);
        keycap(ctx, 'X', 112, 64);
      }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
    for (var j = 1; j < 4; j++) { line(ctx, j * 150, 6, j * 150, 214); ctx.stroke(); }
  }

  function thumbScene(ctx, heroX) {
    // 縮圖用的關卡內容 (關卡座標 1280x720)
    drawBackground(ctx);
    for (var gx = 0; gx < 1280; gx += 40) for (var r = 0; r < 5; r++) drawGround(ctx, { x: gx + 20, y: 540 + r * 40, top: r === 0, theme: 'plain' });
    for (var px = 760; px < 1000; px += 40) drawGround(ctx, { x: px + 20, y: 380, top: true, theme: 'plain' });
    drawPickup(ctx, { x: 860, y: 340, kind: 'time', t: 0 });
    drawPickup(ctx, { x: 300, y: 500, kind: 'wood', t: 0 });
    drawFrog(ctx, { x: 1000, y: 506, facing: -1, state: 'crouch', hit: false });
    drawGoal(ctx, { x: 1200, y: 480, reached: false });
    drawPlayer(ctx, { x: heroX, y: 498, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1, invuln: false });
  }

  function gp2(ctx) {
    // 資訊列一角
    rr(ctx, 0, 0, 480, 44, 6); ctx.fillStyle = 'rgba(12,14,26,0.95)'; ctx.fill();
    matIcon(ctx, 'wood', 36, 22, 26);
    txt(ctx, '12', 60, 23, { size: 18, color: P.textDim });
    ctx.strokeStyle = P.text; ctx.lineWidth = 2.5; line(ctx, 88, 23, 108, 23); ctx.stroke();
    arrowHead(ctx, 114, 23, 0, 9, P.text);
    txt(ctx, '13', 122, 23, { size: 24, color: '#ffffff' });
    // 已過關卡片
    var CX = 40, CY = 120, CS = 1.2;
    ctx.save(); ctx.translate(CX, CY); ctx.scale(CS, CS);
    drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '草原', state: 'cleared', cost: { wood: 0, ench: 0, time: 0 }, canAfford: true, rates: { wood: 8.0, ench: 2.5, time: 1.0 }, recordCls: 'sword', recordTime: 12.4 });
    ctx.save(); ctx.beginPath(); ctx.rect(8, 8, 160, 90); ctx.clip();
    ctx.translate(8, 8); ctx.scale(0.125, 0.125);
    thumbScene(ctx, 284);
    ctx.restore();
    drawCardOverlay(ctx, { x: 0, y: 0, accelLv: 0, selected: false });
    ctx.restore();
    // 撿到點 (關卡座標 300,500 → 卡片 → 頁面)
    var sx = CX + (8 + 300 * 0.125) * CS, sy = CY + (8 + 500 * 0.125) * CS;
    circ(ctx, sx, sy, 7); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    // 弧線 + 飛行素材
    var ex = 36, ey = 22, qx = 250, qy = 70;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(qx, qy, ex + 10, ey + 14);
    dash(ctx, [6, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(232,176,112,0.85)'; ctx.stroke(); dash(ctx, []);
    function q(t) { var u = 1 - t; return { x: u * u * sx + 2 * u * t * qx + t * t * (ex + 10), y: u * u * sy + 2 * u * t * qy + t * t * (ey + 14) }; }
    var a = q(0.78);
    drawFlyingMaterial(ctx, { x: a.x, y: a.y, kind: 'wood', t: 0.55, dur: 0.7 });
  }

  // 第 4 頁的小關卡 (關卡座標)
  var MINI = {
    stepL: [280, 360, 420], plat: [400, 880, 360], stepR: [920, 1000, 420], floor: 520,
    mats: [{ x: 480, y: 340, k: 'wood' }, { x: 560, y: 340, k: 'ench' }, { x: 720, y: 340, k: 'wood' }, { x: 800, y: 340, k: 'time' }, { x: 200, y: 500, k: 'wood' }, { x: 1060, y: 500, k: 'wood' }]
  };
  function miniLevel(ctx) {
    drawBackground(ctx);
    for (var gx = 0; gx < 1280; gx += 40) for (var r = 0; r < 5; r++) drawGround(ctx, { x: gx + 20, y: MINI.floor + 20 + r * 40, top: r === 0, theme: 'plain' });
    [MINI.stepL, MINI.plat, MINI.stepR].forEach(function (p) {
      for (var x = p[0]; x < p[1]; x += 40) drawGround(ctx, { x: x + 20, y: p[2] + 20, top: true, theme: 'plain' });
    });
    MINI.mats.forEach(function (m) { drawPickup(ctx, { x: m.x, y: m.y, kind: m.k, t: 0 }); });
    drawBoar(ctx, { x: 640, y: 344, facing: -1, state: 'walk', hit: false, t: 0 });
    drawFrog(ctx, { x: 860, y: 346, facing: -1, state: 'crouch', hit: false });
    drawGoal(ctx, { x: 1200, y: 480, reached: false });
    drawPlayer(ctx, { x: 80, y: 498, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
  }

  function gp3(ctx) {
    var S2 = 260 / 1280;
    var detour = [{ x: 80, y: 498 }, { x: 250, y: 460 }, { x: 320, y: 398 }, { x: 380, y: 350 }, { x: 440, y: 338 }, { x: 860, y: 338 }, { x: 920, y: 384 }, { x: 960, y: 398 }, { x: 1010, y: 450 }, { x: 1060, y: 498 }, { x: 1170, y: 498 }];
    var direct = [{ x: 80, y: 498 }, { x: 1170, y: 498 }];
    [[10, detour, '素材多 / 秒數長'], [290, direct, '素材少 / 秒數短']].forEach(function (d) {
      ctx.save();
      ctx.translate(d[0], 20);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 260, 720 * S2); ctx.clip();
      ctx.scale(S2, S2);
      miniLevel(ctx);
      routeLine(ctx, d[1], P.sword, 14);
      ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = '#6a7290'; ctx.strokeRect(0, 0, 260, 720 * S2);
      txt(ctx, d[2], 130, 720 * S2 + 34, { size: 18, align: 'center' });
      ctx.restore();
    });
  }

  function gp4(ctx) {
    var cells = [0, 210, 420];
    cells.forEach(function (cx) { rr(ctx, cx, 0, 180, 200, 10); ctx.fillStyle = '#1e2540'; ctx.fill(); });
    // 1) 打開的寶箱 + 浮出的豐收符石
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 180, 200); ctx.clip();
    groundRow(ctx, 0, 200, 160, 1, 'plain');
    drawChest(ctx, { x: 90, y: 142, open: true });
    ctx.strokeStyle = 'rgba(255,210,63,0.6)'; ctx.lineWidth = 2;
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; line(ctx, 90 + Math.cos(a) * 24, 72 + Math.sin(a) * 24, 90 + Math.cos(a) * 32, 72 + Math.sin(a) * 32); ctx.stroke(); }
    runeIcon(ctx, 'harvest', 90, 72, 40);
    ctx.restore();
    // 2) 背包格
    txt(ctx, '背包', 300, 44, { size: 14, color: P.textDim, align: 'center' });
    ctx.save(); ctx.translate(300 - 37, 100 - 37); bagCell(ctx, 0, 0, { type: 'harvest', where: null }, true); ctx.restore();
    // 3) 1 號符石座 + 範圍圈
    ctx.save(); ctx.beginPath(); ctx.rect(420, 0, 180, 200); ctx.clip();
    ctx.save(); ctx.translate(510, 96); ctx.scale(0.8, 0.8);
    groundRow(ctx, -120, 120, 20, 2, 'plain');
    drawPedestal(ctx, { x: 0, y: 0, sealed: false, item: 'harvest', glowT: 0.5, glowDur: 0.5 });
    ctx.restore();
    txt(ctx, '1號', 540, 100, { size: 14, color: P.harvest });
    ctx.restore();
    // 箭頭
    [185, 395].forEach(function (ax) {
      ctx.strokeStyle = P.text; ctx.lineWidth = 3; line(ctx, ax, 100, ax + 14, 100); ctx.stroke();
      arrowHead(ctx, ax + 22, 100, 0, 10, P.text);
    });
  }

  var GUIDE = [gp0, gp1, gp2, gp3, gp4];

  function drawGuidePage(ctx, st) {
    st = S(st);
    var page = Math.round(N(st.page, 0));
    if (page < 0 || page >= GUIDE.length) return;
    var x = N(st.x), y = N(st.y), w = CL(N(st.w, 480), 0, 4000), h = CL(N(st.h, 270), 0, 4000);
    var d = GUIDE_SIZE[page];
    var sc = Math.min(w / d[0], h / d[1]);
    if (!(sc > 0)) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - d[0] * sc) / 2, y + (h - d[1] * sc) / 2);
    ctx.scale(sc, sc);
    GUIDE[page](ctx);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: {
      bg: P.bg, mapBg: P.mapBg, hud: P.hud, panel: P.panel, text: P.text, textDim: P.textDim, select: P.sel,
      ok: P.ok, bad: P.bad, danger: P.danger,
      wood: P.wood, ench: P.ench, time: P.time,
      sword: P.sword, hunter: P.hunter, bomber: P.bomber, player: P.sword,
      harvest: P.harvest, hunt: P.hunt,
      spike: P.spike, crackWall: P.crack, hookRing: P.hook, chest: P.chest, goal: P.goal, pedestal: P.stone,
      boar: P.boar, shieldman: P.shield, shooterBee: P.bee, frog: P.frog, enemyEye: P.enemyEye,
      beeShot: P.beeShot, arrow: P.arrow, bomb: P.bomb, explosion: P.blast, shockwave: P.wave, poof: P.poof,
      hookRope: '#8a7a5a'
    },
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawHookRing: drawHookRing,
    drawPickup: drawPickup,
    drawChest: drawChest,
    drawGoal: drawGoal,
    drawPedestal: drawPedestal,
    drawRoutePath: drawRoutePath,
    drawPlayer: drawPlayer,
    drawRangeRing: drawRangeRing,
    drawBoar: drawBoar,
    drawShieldman: drawShieldman,
    drawShooterBee: drawShooterBee,
    drawFrog: drawFrog,
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
    drawGoalCard: drawGoalCard,
    drawFlyingMaterial: drawFlyingMaterial,
    drawLevelPanel: drawLevelPanel,
    drawSlotCursor: drawSlotCursor,
    drawHud: drawHud,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEndingPanel: drawEndingPanel,
    drawGuidePage: drawGuidePage
  };
})();
