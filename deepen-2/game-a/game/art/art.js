/* 重建之路 — 美術繪圖模組 (deepen-2 / game-a)
 * 全域 window.Art, 不用 ES module。純 Canvas 2D 幾何繪製, 無外部資源。
 * 每個函式只吃 (ctx, state), 自己 save / restore, 不改遊戲狀態。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var THUMB_TH = 0.2; // 畫面縮放小於此值 → 剪影版

  var PAL = {
    bg: '#22304a', bgTop: '#1a2338', bgBottom: '#34476a', bgHill: '#2b3b58',
    mapBg: '#1d2a22', mapBg2: '#27372c',
    // 素材(四種色相分開 + 四種形狀)
    wood: '#c07a38', woodDark: '#5a3418', woodLight: '#ecc084',
    stone: '#9aa3b0', stoneDark: '#3b414d', stoneLight: '#d6dce6',
    time: '#48e4f4', timeDark: '#0f6876', timeLight: '#e6fdff',
    soul: '#a24cf6', soulDark: '#3e1474', soulLight: '#e2c6ff',
    // 職業(玩家 = 白外框)
    sword: '#4f8cff', hunter: '#4cc456', bomber: '#ffc93a',
    skin: '#ffd9b0', playerLine: '#ffffff', ink: '#141a2a',
    // 怪物(深色外框 + 紅眼)
    boar: '#8b4a2b', boarDark: '#4a2414', shield: '#7d8ba0', shieldPlate: '#d3dbe6',
    bee: '#f2a52a', frog: '#e8609e', monLine: '#1a1220',
    // 危險
    danger: '#ff3b3b', dangerDark: '#7a1010',
    // 機關
    crack: '#c9a46a', crackDark: '#6e5330', rubble: '#4a4f5c', rubbleDark: '#22252d',
    hook: '#dfe9ff', chest: '#a8642c', chestGold: '#ffd45a',
    flag: '#ffffff', flagReached: '#ffd45a',
    signShortcut: '#2f8cff', signTreasure: '#ffc23a', plank: '#d9a866', plankDark: '#7a5228',
    blueprint: 'rgba(220,240,255,0.45)',
    // UI
    panel: '#1b2233', panel2: '#26304a', panelLine: '#4a5570', gold: '#ffd45a',
    text: '#f2f5fb', textDim: '#9aa6bf', bad: '#ff5a5a', good: '#7dff8a', hud: 'rgba(12,16,28,0.86)',
    heart: '#ff5a6e'
  };

  var THEMES = {
    plain: { top: '#6cc04a', topEdge: '#3f8a2a', inside: '#8a5a34', dot: '#6e4627' },
    sky: { top: '#eef6ff', topEdge: '#a9c3e6', inside: '#9fb3cf', dot: '#8496b4' },
    rock: { top: '#e09456', topEdge: '#9b5228', inside: '#9b4f2c', dot: '#7d3d22' },
    swamp: { top: '#6f9a3a', topEdge: '#2f8a7a', inside: '#3f4a2c', dot: '#2c3520' },
    throne: { top: '#e6c35a', topEdge: '#9c7a22', inside: '#5a4a78', dot: '#463862' }
  };

  var CLS = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var MAT_KEYS = ['wood', 'stone', 'time', 'soul'];
  var MAT_NAME = { wood: '木材', stone: '石料', time: '時晶', soul: '獸魂' };
  var MAT_USE = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var HUD_ICON_X = { wood: 36, stone: 206, time: 376, soul: 546 };
  var ITEM_NAME = { bagWood: '木材袋', bagStone: '石料袋', bagTime: '時晶袋', soulLamp: '魂燈', glove: '拾荒手套', horn: '獵人號角' };
  var ITEM_FX = { bagWood: '每次通關 +4 木材', bagStone: '每次通關 +3 石料', bagTime: '每次通關 +2 時晶', soulLamp: '每次通關 +2 獸魂', glove: '撿到的素材 +1', horn: '打倒怪物掉落 ×2' };
  var SITE_NAME = { shortcut: '捷徑工程', treasure: '寶區工程' };
  var KIND_NAME = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道' };

  // ---------- 正規化 ----------
  function num(v, d) { v = Number(v); return isFinite(v) ? v : (d === undefined ? 0 : d); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function o(st) { return (st && typeof st === 'object') ? st : {}; }
  function pick(v, table, d) { return Object.prototype.hasOwnProperty.call(table, v) ? v : d; }
  function cls(v) { return pick(v, CLS, 'sword'); }
  function mat(v) { return pick(v, MAT_NAME, 'wood'); }
  function theme(v) { return THEMES[pick(v, THEMES, 'plain')]; }
  function itemType(v) { return pick(v, ITEM_NAME, null); }
  function fac(v) { return num(v, 1) < 0 ? -1 : 1; }
  function f1(v) { return num(v, 0).toFixed(1); }
  function int(v) { return String(Math.floor(num(v, 0))); }
  function matSet(v) { v = o(v); return { wood: num(v.wood), stone: num(v.stone), time: num(v.time), soul: num(v.soul) }; }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : 0; }
  function prog(t, dur) { dur = num(dur, 0); if (dur <= 0) return 1; return clamp(num(t, dur) / dur, 0, 1); }

  function scaleOf(ctx) {
    try {
      var m = ctx.getTransform();
      var s = Math.sqrt(m.a * m.a + m.b * m.b);
      var cw = ctx.canvas && ctx.canvas.width ? ctx.canvas.width : W;
      var base = cw / W;
      var r = s / (base > 0 ? base : 1);
      return (isFinite(r) && r > 0) ? r : 1;
    } catch (e) { return 1; }
  }
  function small(ctx) { return scaleOf(ctx) < THUMB_TH; }

  // ---------- 基本形 ----------
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
  function fillRR(ctx, x, y, w, h, r, fill, stroke, lw) {
    rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function circ(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, col, lw) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.stroke();
  }
  function text(ctx, s, x, y, size, col, align, bold, outline) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = outline === true ? 'rgba(8,10,20,0.9)' : outline;
      ctx.lineWidth = Math.max(2, size / 5);
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = col;
    ctx.fillText(s, x, y);
  }
  function textW(ctx, s, size, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    var m = ctx.measureText(s);
    return (m && isFinite(m.width)) ? m.width : s.length * size;
  }

  // 白閃模式(怪物受擊): 所有本體色換成白
  var FLASH = false;
  function C(c) { return FLASH ? '#ffffff' : c; }

  // ---------- 素材圖示(地上、資訊列、飛行、面板共用同一個長相) ----------
  function matIcon(ctx, kind, x, y, r) {
    kind = mat(kind);
    ctx.save();
    ctx.translate(x, y);
    var k = r / 12;
    ctx.scale(k, k);
    ctx.lineJoin = 'round';
    if (kind === 'wood') {
      // 圓木: 橫躺的圓角柱 + 右端年輪
      fillRR(ctx, -11, -6.5, 20, 13, 6, PAL.wood, PAL.woodDark, 2);
      line(ctx, -7, -2, 3, -2, PAL.woodDark, 1.2);
      line(ctx, -5, 2.5, 4, 2.5, PAL.woodDark, 1.2);
      ctx.beginPath(); ctx.ellipse(8.5, 0, 3.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAL.woodLight; ctx.fill(); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 1.6; ctx.stroke();
      circ(ctx, 8.5, 0, 1.4, PAL.woodDark);
    } else if (kind === 'stone') {
      // 石塊: 不規則六邊形 + 亮面
      poly(ctx, [-10, 2, -6, -8, 4, -10, 11, -3, 9, 8, -4, 10], PAL.stone, PAL.stoneDark, 2);
      poly(ctx, [-6, -8, 4, -10, 2, -2, -5, -1], PAL.stoneLight);
      line(ctx, 2, -2, 9, 8, PAL.stoneDark, 1.1);
    } else if (kind === 'time') {
      // 時晶: 直立菱形水晶
      poly(ctx, [0, -11.5, 8, 0, 0, 11.5, -8, 0], PAL.time, PAL.timeDark, 2);
      poly(ctx, [0, -11.5, 3, 0, 0, 11.5, -3, 0], 'rgba(255,255,255,0.35)');
      poly(ctx, [0, -8, -4.5, 0, -1.5, 0], PAL.timeLight);
    } else {
      // 獸魂: 向上的魂火滴
      ctx.beginPath();
      ctx.moveTo(0, -11.5);
      ctx.bezierCurveTo(5, -5, 9, 0, 8, 4);
      ctx.bezierCurveTo(7, 9.5, -7, 9.5, -8, 4);
      ctx.bezierCurveTo(-9, 0, -5, -5, 0, -11.5);
      ctx.closePath();
      ctx.fillStyle = PAL.soul; ctx.fill(); ctx.strokeStyle = PAL.soulDark; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 4, 3.4, 4, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.soulLight; ctx.fill();
    }
    ctx.restore();
  }
  function matColor(kind) { return PAL[mat(kind)]; }

  // 花費列: 只畫 > 0 的種類, 不足的那種數字變紅 + 底線
  function costRow(ctx, cost, stock, cx, cy, size, align) {
    if (!cost || typeof cost !== 'object') return 0;
    var c = matSet(cost), s = matSet(stock);
    var items = [];
    for (var i = 0; i < MAT_KEYS.length; i++) if (c[MAT_KEYS[i]] > 0) items.push(MAT_KEYS[i]);
    if (!items.length) return 0;
    var fs = size, ir = size * 0.62, gap = size * 0.6;
    var widths = items.map(function (k) { return ir * 2 + 3 + textW(ctx, int(c[k]), fs, true); });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (items.length - 1);
    var x = align === 'left' ? cx : (align === 'right' ? cx - total : cx - total / 2);
    for (var j = 0; j < items.length; j++) {
      var k = items[j];
      var lack = s[k] < c[k];
      matIcon(ctx, k, x + ir, cy, ir);
      var tx = x + ir * 2 + 3;
      text(ctx, int(c[k]), tx, cy + 1, fs, lack ? PAL.bad : PAL.text, 'left', true, true);
      if (lack) line(ctx, tx, cy + fs * 0.62, tx + textW(ctx, int(c[k]), fs, true), cy + fs * 0.62, PAL.bad, 2);
      x += widths[j] + gap;
    }
    return total;
  }

  // 職業小徽章(資訊列、卡片、面板共用)
  function clsBadge(ctx, c, x, y, r) {
    c = cls(c);
    ctx.save();
    circ(ctx, x, y, r, PAL[c], '#ffffff', Math.max(1, r / 6));
    ctx.translate(x, y);
    var k = r / 10; ctx.scale(k, k);
    ctx.lineCap = 'round';
    if (c === 'sword') {
      line(ctx, -5, 5, 5, -5, '#ffffff', 2.4);
      line(ctx, -6, 1, -1, 6, '#ffffff', 2);
    } else if (c === 'hunter') {
      ctx.beginPath(); ctx.arc(-2, 0, 6.5, -Math.PI / 2.2, Math.PI / 2.2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      line(ctx, -5, 0, 6, 0, '#ffffff', 1.6);
      poly(ctx, [7, 0, 3.5, -2.5, 3.5, 2.5], '#ffffff');
    } else {
      circ(ctx, -1, 1.5, 4.8, PAL.ink);
      line(ctx, 2, -2, 5, -5.5, PAL.ink, 1.6);
      circ(ctx, 5.5, -6, 1.6, '#ffffff');
    }
    ctx.restore();
  }

  function keycap(ctx, label, x, y, w, h, opts) {
    opts = opts || {};
    fillRR(ctx, x - w / 2, y - h / 2 + 2, w, h, 5, 'rgba(0,0,0,0.5)');
    fillRR(ctx, x - w / 2, y - h / 2, w, h, 5, opts.fill || '#f2f5fb', opts.stroke || '#2a3248', 2);
    text(ctx, label, x, y + 1, opts.size || Math.round(h * 0.55), opts.color || '#1a2033', 'center', true);
  }

  function lock(ctx, x, y, s, open, col) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (open) { ctx.arc(-6, -8, 7, Math.PI, Math.PI * 2); ctx.lineTo(1, -4); }
    else { ctx.arc(0, -8, 7, Math.PI, Math.PI * 2); ctx.lineTo(7, -2); ctx.moveTo(-7, -8); ctx.lineTo(-7, -2); }
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    fillRR(ctx, -10, -4, 20, 16, 3, col, 'rgba(0,0,0,0.5)', 1.5);
    circ(ctx, 0, 3, 2.4, 'rgba(0,0,0,0.6)');
    ctx.restore();
  }

  // ===================== 背景 =====================
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PAL.bgTop); g.addColorStop(1, PAL.bgBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 遠山剪影(低對比, 不搶戲)
    ctx.fillStyle = PAL.bgHill;
    ctx.beginPath(); ctx.moveTo(0, H);
    var pts = [0, 520, 140, 430, 300, 500, 470, 400, 640, 480, 820, 390, 990, 470, 1150, 410, 1280, 470];
    for (var i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 星點
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (var s = 0; s < 40; s++) {
      var sx = (s * 337) % W, sy = 50 + (s * 151) % 300;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1a2a24'); g.addColorStop(1, '#2a3a30');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 淡格紋(地圖紙)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 40; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // 四角的淡色地景(不放路線)
    ctx.fillStyle = 'rgba(120,170,110,0.07)';
    ctx.beginPath(); ctx.ellipse(160, 680, 260, 90, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(1180, 640, 200, 110, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,200,255,0.05)';
    ctx.beginPath(); ctx.ellipse(1100, 120, 240, 80, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ===================== 地形 =====================
  function drawGround(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), th = theme(st.theme), top = st.top === true;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = th.inside; ctx.fillRect(-20, -20, 40, 40);
    if (!small(ctx)) {
      // 內部紋理: 格子位置決定的點, 讓相鄰格不重複
      var seed = Math.abs(Math.floor(x * 7 + y * 13)) % 5;
      ctx.fillStyle = th.dot;
      var dots = [[-10, -2], [6, 6], [-4, 12], [11, -8], [0, 2]];
      for (var i = 0; i < 3; i++) { var d = dots[(seed + i) % 5]; ctx.fillRect(d[0] - 2, d[1] - 2, 4, 4); }
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(-19.5, -19.5, 39, 39);
    }
    if (top) {
      ctx.fillStyle = th.top; ctx.fillRect(-20, -20, 40, 9);
      ctx.fillStyle = th.topEdge; ctx.fillRect(-20, -11, 40, 2.5);
      if (!small(ctx)) {
        ctx.fillStyle = th.top;
        if (st.theme === 'plain') { poly(ctx, [-16, -11, -13, -8, -10, -11], th.top); poly(ctx, [4, -11, 7, -7, 10, -11], th.top); }
        if (st.theme === 'swamp') { ctx.fillStyle = th.topEdge; ctx.fillRect(-12, -9, 3, 6); ctx.fillRect(8, -9, 3, 4); }
        if (st.theme === 'throne') { ctx.fillStyle = '#fff2b0'; ctx.fillRect(-20, -20, 40, 2); }
      }
    }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    ctx.translate(x, y);
    if (small(ctx)) { ctx.fillStyle = PAL.danger; ctx.fillRect(-20, 4, 40, 16); ctx.restore(); return; }
    // 判定在下半 40x20: 底座 + 四根尖刺
    ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-20, 15, 40, 5);
    for (var i = 0; i < 4; i++) {
      var bx = -20 + i * 10;
      poly(ctx, [bx + 1, 16, bx + 5, 1, bx + 9, 16], '#c9ced8', '#2a2e38', 1.2);
      poly(ctx, [bx + 3.6, 6, bx + 5, 1, bx + 6.4, 6], PAL.danger);
    }
    ctx.fillStyle = PAL.danger; ctx.fillRect(-20, 18, 40, 2);
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), hp = clamp(Math.round(num(st.hp, 3)), 1, 3);
    ctx.save();
    ctx.translate(x, y);
    if (small(ctx)) { ctx.fillStyle = PAL.crack; ctx.fillRect(-20, -20, 40, 40); ctx.restore(); return; }
    // 砂岩磚: 亮色 + 磚縫 + 裂痕(越少血越多)
    ctx.fillStyle = PAL.crack; ctx.fillRect(-20, -20, 40, 40);
    ctx.strokeStyle = 'rgba(110,83,48,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-19, 0); ctx.lineTo(19, 0); ctx.moveTo(-4, -19); ctx.lineTo(-4, 0); ctx.moveTo(8, 0); ctx.lineTo(8, 19); ctx.stroke();
    ctx.strokeStyle = '#efd7a6'; ctx.lineWidth = 2; ctx.strokeRect(-19, -19, 38, 38);
    ctx.strokeStyle = PAL.crackDark; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-6, -8); ctx.lineTo(-10, 2); ctx.lineTo(-2, 12); ctx.stroke();
    if (hp <= 2) { ctx.beginPath(); ctx.moveTo(16, -16); ctx.lineTo(6, -6); ctx.lineTo(12, 4); ctx.lineTo(4, 16); ctx.moveTo(-6, -8); ctx.lineTo(6, -6); ctx.stroke(); }
    if (hp <= 1) {
      ctx.beginPath(); ctx.moveTo(-18, 10); ctx.lineTo(-10, 2); ctx.moveTo(12, 4); ctx.lineTo(18, 12); ctx.moveTo(-2, 12); ctx.lineTo(-8, 18); ctx.stroke();
      // 缺角
      poly(ctx, [12, -20, 20, -20, 20, -11], PAL.crackDark);
      poly(ctx, [-20, 14, -20, 20, -13, 20], PAL.crackDark);
    }
    ctx.restore();
  }

  function drawHookRing(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    ctx.translate(x, y);
    // 吊繩: 框外往上 20px
    line(ctx, 0, -30.5, 0, -9, '#c8b48a', 2.5);
    if (small(ctx)) { circ(ctx, 0, 0, 9, null, PAL.hook, 4); ctx.restore(); return; }
    circ(ctx, 0, 0, 8.5, null, PAL.ink, 6);
    circ(ctx, 0, 0, 8.5, null, PAL.hook, 3.5);
    ctx.beginPath(); ctx.arc(0, 0, 8.5, -2.4, -1.4); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  // ---------- 工程 ----------
  function drawWorksite(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y);
    var kind = pick(st.kind, KIND_NAME, 'bridge');
    var rep = st.repaired === true;
    var th = theme(st.theme);
    ctx.save();
    ctx.translate(x, y);
    var sm = small(ctx);
    if (!rep) {
      if (kind === 'rubble') {
        // 堵塞亂石: 深色圓石 + 鐵箍鉚釘, 沒有裂痕 → 打不壞
        ctx.fillStyle = PAL.rubbleDark; ctx.fillRect(-20, -20, 40, 40);
        if (!sm) {
          var rocks = [[-10, -10, 9], [10, -10, 8.5], [-10.5, 9.5, 8.5], [9, 9, 9.5], [0, -1, 7]];
          for (var i = 0; i < rocks.length; i++) {
            circ(ctx, rocks[i][0], rocks[i][1], rocks[i][2], PAL.rubble, '#15171c', 2);
            circ(ctx, rocks[i][0] - rocks[i][2] * 0.35, rocks[i][1] - rocks[i][2] * 0.35, rocks[i][2] * 0.28, 'rgba(255,255,255,0.18)');
          }
          ctx.fillStyle = '#5c616e'; ctx.fillRect(-20, -3, 40, 6);
          ctx.strokeStyle = '#15171c'; ctx.lineWidth = 1.2; ctx.strokeRect(-20, -3, 40, 6);
          circ(ctx, -12, 0, 1.6, '#c9ced8'); circ(ctx, 0, 0, 1.6, '#c9ced8'); circ(ctx, 12, 0, 1.6, '#c9ced8');
        }
      } else if (!sm) {
        // 斷橋 / 崩梯未修: 極淡的藍圖虛線(不是實心)
        ctx.setLineDash([4, 4]); ctx.strokeStyle = PAL.blueprint; ctx.lineWidth = 1.5;
        if (kind === 'bridge') { ctx.strokeRect(-19, -19, 38, 10); }
        else { ctx.beginPath(); ctx.moveTo(-19, 19); ctx.lineTo(-19, -19); ctx.lineTo(19, -19); ctx.lineTo(19, 19); ctx.stroke(); }
        ctx.setLineDash([]);
        if (kind === 'stairs') {
          // 碎石(貼格底): 不是實心, 只是一小堆
          circ(ctx, -8, 16, 4, '#7a7f8c', '#2a2e38', 1); circ(ctx, 0, 15, 5, '#8a909c', '#2a2e38', 1); circ(ctx, 9, 16.5, 3.5, '#6e7380', '#2a2e38', 1);
        }
      }
    } else if (kind === 'bridge') {
      // 實心橋面: 木板 + 下方桁架, 頂邊一條新修亮線
      ctx.fillStyle = PAL.plankDark; ctx.fillRect(-20, -20, 40, 40);
      if (!sm) {
        ctx.strokeStyle = PAL.plank; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(18, 18); ctx.moveTo(18, -6); ctx.lineTo(-18, 18); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-20, -6, 40, 26);
      }
      ctx.fillStyle = PAL.plank; ctx.fillRect(-20, -20, 40, 14);
      if (!sm) {
        line(ctx, -7, -19, -7, -6, PAL.plankDark, 1.5); line(ctx, 7, -19, 7, -6, PAL.plankDark, 1.5);
        circ(ctx, -14, -13, 1.4, '#3a2a18'); circ(ctx, 0, -13, 1.4, '#3a2a18'); circ(ctx, 14, -13, 1.4, '#3a2a18');
        ctx.fillStyle = th.topEdge; ctx.fillRect(-20, -6, 40, 2);
        ctx.fillStyle = '#ffe9a8'; ctx.fillRect(-20, -20, 40, 2);
      }
    } else if (kind === 'stairs') {
      // 實心階梯: 切石塊 + 木邊, 配合主題內部色
      ctx.fillStyle = th.inside; ctx.fillRect(-20, -20, 40, 40);
      ctx.fillStyle = PAL.plank; ctx.fillRect(-20, -20, 40, 7);
      if (!sm) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.strokeRect(-18.5, -12.5, 37, 31);
        line(ctx, -19, 3, 19, 3, 'rgba(0,0,0,0.25)', 1.5);
        ctx.fillStyle = '#ffe9a8'; ctx.fillRect(-20, -20, 40, 2);
        line(ctx, -19, -13, 19, -13, PAL.plankDark, 1.5);
      }
    }
    // rubble 已修 = 不畫(格子已通)
    ctx.restore();
  }

  function drawSiteSign(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y);
    var role = pick(st.role, SITE_NAME, 'shortcut');
    ctx.save();
    ctx.translate(x, y); // 中心; 底邊 = y + 24
    // 木柱
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-2.5, -4, 5, 28);
    var boardCol = role === 'shortcut' ? PAL.signShortcut : PAL.signTreasure;
    if (role === 'shortcut') {
      fillRR(ctx, -17, -23, 34, 26, 4, boardCol, '#0e2a55', 2);
      // 直線雙箭頭(往前直衝)
      ctx.fillStyle = '#ffffff';
      poly(ctx, [-11, -15, -3, -10, -11, -5], '#ffffff');
      poly(ctx, [-2, -15, 6, -10, -2, -5], '#ffffff');
      ctx.fillRect(-13, -11.5, 8, 3);
      poly(ctx, [7, -16, 13, -10, 7, -4], '#ffffff');
    } else {
      // 圓角菱形板 + 寶箱
      poly(ctx, [0, -23, 16, -10, 0, 3, -16, -10], boardCol, '#5a3e00', 2);
      fillRR(ctx, -8, -12, 16, 10, 2, '#a8642c', '#3a2210', 1.5);
      ctx.beginPath(); ctx.moveTo(-8, -12); ctx.quadraticCurveTo(0, -19, 8, -12); ctx.closePath();
      ctx.fillStyle = '#c47a3a'; ctx.fill(); ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffe680'; ctx.fillRect(-1.5, -12, 3, 4);
    }
    // 底部安全條紋(施工中)
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-9, 18, 18, 5);
    ctx.fillStyle = boardCol; ctx.fillRect(-9, 18, 6, 5); ctx.fillRect(3, 18, 6, 5);
    ctx.restore();
  }

  // ---------- 素材 / 寶箱 / 終點 ----------
  function drawPickup(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), t = num(st.t), kind = mat(st.kind);
    ctx.save();
    if (small(ctx)) {
      ctx.fillStyle = matColor(kind); ctx.fillRect(x - 12, y - 12, 24, 24);
      ctx.restore(); return;
    }
    var bob = Math.sin(t * 3) * 2;
    // 地上光暈(底)
    ctx.beginPath(); ctx.ellipse(x, y + 9, 9, 2, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    matIcon(ctx, kind, x, y - 1 + bob, 9.5);
    var ph = (t * 0.8) % 1;
    if (ph < 0.25) {
      var a = 1 - ph / 0.25;
      ctx.globalAlpha = a;
      poly(ctx, [x + 6, y - 9 + bob, x + 7, y - 7 + bob, x + 9, y - 6 + bob, x + 7, y - 5 + bob, x + 6, y - 3 + bob, x + 5, y - 5 + bob, x + 3, y - 6 + bob, x + 5, y - 7 + bob], '#ffffff');
    }
    ctx.restore();
  }

  function drawChest(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), open = st.open === true;
    ctx.save();
    ctx.translate(x, y); // 40x36, 底 = +18
    if (small(ctx)) { ctx.fillStyle = open ? '#5a3a20' : PAL.chestGold; ctx.fillRect(-20, -18, 40, 36); ctx.restore(); return; }
    if (!open) {
      var p = 0.5 + 0.5 * Math.sin(now() * 4);
      // 醒目: 金框 + 亮光
      fillRR(ctx, -18, -3, 36, 20, 3, PAL.chest, '#3a2210', 2);
      ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-18, -8); ctx.quadraticCurveTo(0, -20, 18, -8); ctx.lineTo(18, -2); ctx.closePath();
      ctx.fillStyle = '#c47a3a'; ctx.fill(); ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = PAL.chestGold; ctx.fillRect(-18, -3, 36, 3.5); ctx.fillRect(-3, -14, 6, 30);
      fillRR(ctx, -4.5, -4, 9, 9, 2, PAL.chestGold, '#5a3e00', 1.5);
      ctx.globalAlpha = 0.4 + 0.6 * p;
      poly(ctx, [12, -17, 13.5, -13.5, 17, -12, 13.5, -10.5, 12, -7, 10.5, -10.5, 7, -12, 10.5, -13.5], '#ffffff');
    } else {
      // 空箱: 掀開、內部深色、整體去飽和
      fillRR(ctx, -18, -3, 36, 20, 3, '#6a5040', '#2a1a10', 2);
      ctx.fillStyle = '#1a120c'; ctx.fillRect(-15, -2, 30, 6);
      ctx.beginPath(); ctx.moveTo(-17, -3); ctx.lineTo(-13, -15); ctx.lineTo(15, -17); ctx.lineTo(17, -5); ctx.closePath();
      ctx.fillStyle = '#7a5e4a'; ctx.fill(); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#9a8a6a'; ctx.fillRect(-18, 0, 36, 2.5);
    }
    ctx.restore();
  }

  function drawGoal(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), reached = st.reached === true;
    ctx.save();
    ctx.translate(x, y); // 40x80, 底 = +40
    if (small(ctx)) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -40, 4, 80);
      ctx.fillStyle = reached ? PAL.flagReached : PAL.flag; ctx.fillRect(1, -40, 18, 16);
      ctx.restore(); return;
    }
    fillRR(ctx, -14, 33, 28, 6, 2, '#5a6070', '#20242e', 1.5);
    ctx.fillStyle = '#e8ecf4'; ctx.fillRect(-3, -38, 4, 72);
    circ(ctx, -1, -36.5, 3, PAL.gold, '#5a3e00', 1);
    var wave = Math.sin(now() * 5) * 2;
    var fy = reached ? -34 : -10;
    ctx.beginPath();
    ctx.moveTo(1, fy); ctx.quadraticCurveTo(10, fy - 3 + wave, 19, fy + wave * 0.5);
    ctx.lineTo(19, fy + 18 + wave * 0.5); ctx.quadraticCurveTo(10, fy + 15 + wave, 1, fy + 18);
    ctx.closePath();
    ctx.fillStyle = reached ? PAL.flagReached : PAL.flag; ctx.fill();
    ctx.strokeStyle = '#20242e'; ctx.lineWidth = 1.5; ctx.stroke();
    // 旗面徽記: 綠色勾(終點)
    ctx.strokeStyle = reached ? '#7a5200' : '#2fae4a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(6, fy + 9); ctx.lineTo(9, fy + 12); ctx.lineTo(15, fy + 5); ctx.stroke();
    if (reached) {
      ctx.globalAlpha = 0.35;
      circ(ctx, 10, fy + 8, 8, null, PAL.gold, 2);
    }
    ctx.restore();
  }

  // ===================== 玩家 =====================
  function playerSil(ctx, c) {
    var s = scaleOf(ctx);
    fillRR(ctx, -14, -22, 28, 44, 6, PAL[c], '#ffffff', Math.max(1, 0.9 / s));
  }

  function drawPlayerBody(ctx, c, f, pose, pt) {
    var col = PAL[c];
    var legA = 0, lean = 0, bodyDy = 0, armAng = 0.6, eyeX = f * 4;
    if (pose === 'run') { legA = Math.sin(pt * 16) * 5; lean = 0.08 * f; }
    if (pose === 'rise') { legA = 3; armAng = -0.6; }
    if (pose === 'fall') { legA = -2; armAng = -1.6; }
    if (pose === 'slash' || pose === 'throw' || pose === 'shoot') { armAng = 1.5; }
    if (pose === 'hook') { armAng = -1.2; }
    if (pose === 'wave') { bodyDy = 3; armAng = 0; }
    if (pose === 'hurt') { lean = -0.1 * f; }
    if (pose === 'dash') { lean = 0.18 * f; }
    ctx.save();
    ctx.rotate(lean);
    if (pose === 'dash' || pose === 'hurt') ctx.scale(0.9, 0.9);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腿
    var ly = 12 + bodyDy;
    line(ctx, -4, ly, -4 - legA, 18.8, PAL.ink, 5);
    line(ctx, 4, ly, 4 + legA, 18.8, PAL.ink, 5);
    // 身體(職業色 + 白外框 = 我)
    fillRR(ctx, -10.5, -6 + bodyDy, 21, 19, 5, col, PAL.ink, 3);
    fillRR(ctx, -10.5, -6 + bodyDy, 21, 19, 5, null, '#ffffff', 1.4);
    // 頭
    var hy = -13 + bodyDy;
    circ(ctx, 0, hy, 8, PAL.skin, PAL.ink, 2);
    // 職業頭飾
    if (c === 'sword') {
      ctx.fillStyle = col; ctx.fillRect(-8.5, hy - 5, 17, 3.5);
      poly(ctx, [-f * 8, hy - 4, -f * 13, hy - 7, -f * 12, hy - 1], col);
    } else if (c === 'hunter') {
      ctx.beginPath(); ctx.arc(0, hy, 8.4, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(f * 5, hy - 2); ctx.lineTo(-f * 5, hy - 2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.5; ctx.stroke();
      poly(ctx, [-f * 7, hy - 4, -f * 12, hy - 6, -f * 9, hy], col, PAL.ink, 1.2);
    } else {
      ctx.beginPath(); ctx.arc(0, hy, 8.4, Math.PI, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.5; ctx.stroke();
      fillRR(ctx, f * 1 - 5, hy - 3, 10, 4, 2, '#a8e6ff', PAL.ink, 1.2);
    }
    // 眼
    if (pose === 'hurt') {
      line(ctx, eyeX - 2, hy - 1, eyeX + 2, hy + 3, PAL.ink, 1.6); line(ctx, eyeX + 2, hy - 1, eyeX - 2, hy + 3, PAL.ink, 1.6);
    } else {
      circ(ctx, eyeX, hy + 1, 1.8, PAL.ink);
    }
    // 手臂 + 武器
    var sx = f * 7, sy = -2 + bodyDy;
    var ax = sx + Math.cos(armAng) * 5 * f * (armAng < 0 ? 0.6 : 1), ay = sy + Math.sin(-armAng + 1.2) * 4;
    if (f * ax > 11) ax = f * 11;
    if (pose === 'hook') { ax = f * 9; ay = -16; }
    if (pose === 'wave') { line(ctx, -sx, sy, -sx - f * 4, sy, PAL.skin, 4); ax = sx + f * 4; ay = sy; }
    line(ctx, sx, sy, ax, ay, PAL.skin, 4);
    if (c === 'sword') {
      var bl = pose === 'slash' ? [ax, ay, ax + f * 12, ay - 1] : (pose === 'dash' ? [ax, ay, ax - f * 13, ay + 4] : (pose === 'hook' ? [ax, ay, ax - f * 12, ay + 5] : [ax - f * 2, ay, ax - f * 1, ay - 13]));
      line(ctx, bl[0], bl[1], bl[2], bl[3], PAL.ink, 4);
      line(ctx, bl[0], bl[1], bl[2], bl[3], '#e8f0ff', 2);
    } else if (c === 'hunter') {
      ctx.beginPath();
      var bowY = pose === 'hook' ? 3 : ay;
      ctx.arc(f * 6, bowY, 7, f > 0 ? -1.1 : Math.PI - 1.1, f > 0 ? 1.1 : Math.PI + 1.1);
      ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 2.4; ctx.stroke();
      if (pose === 'shoot') line(ctx, f * 1, ay, f * 13, ay, '#e8e0c8', 1.6);
    } else {
      if (pose !== 'throw' && pose !== 'wave') circ(ctx, f * 9, ay + 1, 4, PAL.ink, '#ffffff', 1);
      // 背包炸彈
      circ(ctx, -f * 10, 2 + bodyDy, 4, PAL.ink);
    }
    ctx.restore();
  }

  function drawPlayer(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), c = cls(st.cls), f = fac(st.facing);
    var pose = typeof st.pose === 'string' ? st.pose : 'idle';
    var pt = Math.max(0, num(st.poseT));
    ctx.save();
    ctx.translate(x, y);
    if (st.invuln === true) ctx.globalAlpha = (Math.floor(now() * 12) % 2) ? 0.3 : 0.85;
    if (small(ctx)) { playerSil(ctx, c); ctx.restore(); return; }
    // 衝刺斬速度線: 衝刺反方向框外至多 60px
    if (pose === 'dash') {
      ctx.save();
      ctx.lineCap = 'round';
      var lines = [[-12, 0.9], [0, 1], [12, 0.75]];
      for (var i = 0; i < 3; i++) {
        line(ctx, -f * 16, lines[i][0], -f * (16 + 56 * lines[i][1]), lines[i][0], 'rgba(200,225,255,0.85)', 3);
      }
      ctx.restore();
    }
    // 揮砍刀光: 面向側框外 50x40, 與身體中心同高, 0.15 秒
    if (pose === 'slash' && pt < 0.15) {
      var a = 1 - pt / 0.15;
      ctx.save();
      ctx.globalAlpha *= 0.4 + 0.6 * a;
      ctx.scale(f, 1);
      ctx.beginPath();
      ctx.moveTo(16, -18);
      ctx.quadraticCurveTo(66, -12, 60, 4);
      ctx.quadraticCurveTo(52, 18, 16, 18);
      ctx.quadraticCurveTo(46, 6, 16, -18);
      ctx.closePath();
      ctx.fillStyle = 'rgba(230,242,255,0.95)'; ctx.fill();
      ctx.strokeStyle = PAL.sword; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    drawPlayerBody(ctx, c, f, pose, pt);
    ctx.restore();
  }

  function drawRangeRing(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), r = clamp(num(st.radius, 260), 0, 260);
    ctx.save();
    ctx.setLineDash([10, 8]);
    circ(ctx, x, y, r - 1, null, 'rgba(76,196,86,0.55)', 2);
    ctx.setLineDash([]);
    circ(ctx, x, y, r - 1, 'rgba(76,196,86,0.04)');
    ctx.restore();
  }

  // ===================== 怪物 =====================
  function flungLines(ctx, f, hw, ys) {
    // 擊飛方向 = 面向反向(判讀約定); 速度線畫在框外面向側, 至多 40px
    ctx.save(); ctx.lineCap = 'round';
    for (var i = 0; i < ys.length; i++) line(ctx, f * (hw + 4), ys[i], f * (hw + 4 + 34 - i * 6), ys[i], 'rgba(255,255,255,0.85)', 3);
    ctx.restore();
  }
  function monSil(ctx, w, h, col, hit) {
    var s = scaleOf(ctx);
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = hit ? '#ffffff' : col; ctx.fill();
    ctx.strokeStyle = PAL.monLine; ctx.lineWidth = Math.max(1, 0.9 / s); ctx.stroke();
  }
  function angryEye(ctx, x, y, r, glow) {
    circ(ctx, x, y, r, C('#ffffff'), PAL.monLine, 1);
    circ(ctx, x, y, r * 0.55, glow ? PAL.danger : PAL.monLine);
  }

  function drawBoar(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), f = fac(st.facing), s = st.state, t = num(st.t), hit = st.hit === true;
    ctx.save();
    ctx.translate(x, y); // 48x32
    if (small(ctx)) { monSil(ctx, 48, 32, PAL.boar, hit); ctx.restore(); return; }
    FLASH = hit;
    if (s === 'flung') { flungLines(ctx, f, 24, [-8, 2, 10]); ctx.rotate(f * 0.35); ctx.scale(0.82, 0.82); }
    if (s === 'windup') { ctx.translate(-f * 2, 0); }
    ctx.scale(f, 1);
    var leg = s === 'walk' ? Math.sin(t * 10) * 2.5 : (s === 'charge' ? Math.sin(t * 30) * 4 : 0);
    // 腿
    ctx.lineCap = 'round';
    line(ctx, -12, 8, -12 - leg, 13.5, C(PAL.boarDark), 4.5); line(ctx, -4, 8, -4 + leg, 13.5, C(PAL.boarDark), 4.5);
    line(ctx, 6, 8, 6 - leg, 13.5, C(PAL.boarDark), 4.5); line(ctx, 13, 8, 13 + leg, 13.5, C(PAL.boarDark), 4.5);
    // 身體
    var headDrop = s === 'charge' ? 4 : (s === 'windup' ? 2 : 0);
    ctx.beginPath(); ctx.ellipse(-2, 0, 19, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = C(PAL.boar); ctx.fill(); ctx.strokeStyle = PAL.monLine; ctx.lineWidth = 2; ctx.stroke();
    // 鬃毛
    poly(ctx, [-16, -8, -12, -14, -8, -9, -4, -14, 0, -9, 4, -13, 7, -8], C(PAL.boarDark));
    // 頭 + 鼻
    ctx.beginPath(); ctx.ellipse(15, -1 + headDrop, 8, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = C(PAL.boar); ctx.fill(); ctx.strokeStyle = PAL.monLine; ctx.lineWidth = 2; ctx.stroke();
    fillRR(ctx, 19, -1 + headDrop, 5, 6, 2, C('#d9867a'), PAL.monLine, 1.2);
    // 獠牙
    poly(ctx, [19, 5 + headDrop, 23.5, 1 + headDrop, 21, 7 + headDrop], C('#ffffff'), PAL.monLine, 1);
    // 眼
    if (s === 'stun') {
      line(ctx, 13, -6 + headDrop, 17, -2 + headDrop, PAL.monLine, 1.6); line(ctx, 17, -6 + headDrop, 13, -2 + headDrop, PAL.monLine, 1.6);
    } else {
      angryEye(ctx, 15, -4 + headDrop, 2.4, s === 'windup' || s === 'charge');
    }
    ctx.restore();
    FLASH = false;
    ctx.save();
    ctx.translate(x, y);
    if (s === 'windup') {
      // 預備: 後腳踢灰 + 紅色預警邊(看得出要衝了)
      var p = (t * 6) % 1;
      ctx.globalAlpha = 0.8;
      circ(ctx, -f * (15 + p * 3), 12 - p * 4, 2.5 + p * 1.5, 'rgba(220,200,170,0.8)');
      circ(ctx, -f * (10 + p * 3), 13 - p * 3, 2.2, 'rgba(220,200,170,0.7)');
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 25);
      ctx.beginPath(); ctx.ellipse(0, 0, 23, 15, 0, 0, Math.PI * 2); ctx.strokeStyle = PAL.danger; ctx.lineWidth = 2; ctx.stroke();
    }
    if (s === 'charge') {
      ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) line(ctx, -f * 12, -6 + i * 6, -f * 23, -6 + i * 6, 'rgba(255,255,255,0.75)', 2);
    }
    if (s === 'stun') {
      // 頭上星星, 框外上方至多 20px
      for (var k = 0; k < 3; k++) {
        var ang = t * 5 + k * 2.09;
        var sx = f * 10 + Math.cos(ang) * 10, sy = -26 + Math.sin(ang) * 3;
        poly(ctx, [sx, sy - 4, sx + 1.2, sy - 1.2, sx + 4, sy, sx + 1.2, sy + 1.2, sx, sy + 4, sx - 1.2, sy + 1.2, sx - 4, sy, sx - 1.2, sy - 1.2], '#ffe680', '#5a3e00', 0.8);
      }
    }
    ctx.restore();
  }

  function drawShieldman(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), f = fac(st.facing), s = st.state, t = num(st.t), hit = st.hit === true;
    ctx.save();
    ctx.translate(x, y); // 32x44
    if (small(ctx)) {
      monSil(ctx, 32, 44, PAL.shield, hit);
      ctx.fillStyle = PAL.shieldPlate; ctx.fillRect(f > 0 ? 6 : -16, -14, 10, 28);
      ctx.restore(); return;
    }
    FLASH = hit;
    if (s === 'flung') { flungLines(ctx, f, 16, [-12, 0, 12]); ctx.rotate(f * 0.35); ctx.scale(0.8, 0.8); }
    ctx.scale(f, 1);
    var step = s === 'walk' ? Math.sin(t * 6) * 2.5 : 0;
    ctx.lineCap = 'round';
    line(ctx, -6, 12, -6 - step, 19.5, C(PAL.monLine), 5); line(ctx, 3, 12, 3 + step, 19.5, C(PAL.monLine), 5);
    // 身體盔甲
    fillRR(ctx, -12, -8, 18, 22, 4, C(PAL.shield), PAL.monLine, 2);
    // 頭盔
    ctx.beginPath(); ctx.arc(-3, -13, 8, Math.PI, Math.PI * 2); ctx.lineTo(5, -8); ctx.lineTo(-11, -8); ctx.closePath();
    ctx.fillStyle = C('#5a6678'); ctx.fill(); ctx.strokeStyle = PAL.monLine; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = PAL.monLine; ctx.fillRect(-2, -14, 7, 3);
    circ(ctx, 2.5, -12.5, 1.3, PAL.danger);
    poly(ctx, [-6, -19, -3, -21.5, 0, -19], C('#c03030'));
    // 大盾(面向側, 框內)
    var flash = s === 'block';
    fillRR(ctx, 3, -16, 12, 34, 4, flash ? '#ffffff' : C(PAL.shieldPlate), PAL.monLine, 2.4);
    fillRR(ctx, 3, -16, 12, 34, 4, null, flash ? PAL.gold : C('#c9a24a'), 1.6);
    if (!flash) { line(ctx, 9, -11, 9, 13, C('#9aa6b8'), 2); line(ctx, 5.5, 1, 12.5, 1, C('#9aa6b8'), 2); }
    if (flash) {
      ctx.globalAlpha = 0.9;
      ctx.lineCap = 'round';
      line(ctx, 15, -10, 15, -15, PAL.gold, 2); line(ctx, 15, 10, 15, 15, PAL.gold, 2); line(ctx, 14.5, 0, 15, 0, PAL.gold, 2);
    }
    ctx.restore();
    FLASH = false;
  }

  function drawShooterBee(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), f = fac(st.facing), s = st.state, t = num(st.t), hit = st.hit === true;
    ctx.save();
    ctx.translate(x, y); // 32x32
    if (small(ctx)) { monSil(ctx, 30, 24, PAL.bee, hit); ctx.restore(); return; }
    FLASH = hit;
    if (s === 'flung') { flungLines(ctx, f, 16, [-6, 4]); ctx.rotate(f * 0.5); ctx.scale(0.85, 0.85); }
    ctx.scale(f, 1);
    // 翅膀(拍動)
    var wf = s === 'aim' ? 0.3 : Math.abs(Math.sin(t * 30));
    ctx.beginPath(); ctx.ellipse(-3, -7 - wf * 2, 7, 4 + wf * 1.5, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = FLASH ? '#ffffff' : 'rgba(220,240,255,0.75)'; ctx.fill(); ctx.strokeStyle = PAL.monLine; ctx.lineWidth = 1.2; ctx.stroke();
    // 身體(條紋)
    ctx.save();
    ctx.beginPath(); ctx.ellipse(-1, 2, 12, 9, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = C(PAL.bee); ctx.fillRect(-14, -8, 28, 20);
    ctx.fillStyle = C(PAL.monLine); ctx.fillRect(-6, -8, 4, 20); ctx.fillRect(2, -8, 4, 20);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(-1, 2, 12, 9, 0, 0, Math.PI * 2); ctx.strokeStyle = PAL.monLine; ctx.lineWidth = 2; ctx.stroke();
    // 頭 + 眼(面向側)
    circ(ctx, 10, -1, 5, C(PAL.bee), PAL.monLine, 2);
    angryEye(ctx, 11.5, -2, 2, s === 'aim');
    // 尾針(面向反側; 瞄準時針尖轉紅)
    poly(ctx, [-12, 0, -16, 3, -12, 6], s === 'aim' ? PAL.danger : C(PAL.monLine));
    ctx.restore();
    FLASH = false;
    if (s === 'aim') {
      // 瞄準: 面前一個收攏的紅色準星(框內)
      ctx.save(); ctx.translate(x, y);
      var p = (t * 2.5) % 1;
      var r = 3 - p * 2;
      ctx.globalAlpha = 0.9;
      circ(ctx, f * 10, -1, r + 2, null, PAL.danger, 1.6);
      circ(ctx, f * 10, -1, 1.8, PAL.danger);
      ctx.restore();
    }
  }

  function drawFrog(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), f = fac(st.facing), s = st.state, hit = st.hit === true;
    ctx.save();
    ctx.translate(x, y); // 32x28
    if (small(ctx)) { monSil(ctx, 32, 26, PAL.frog, hit); ctx.restore(); return; }
    FLASH = hit;
    if (s === 'flung') { flungLines(ctx, f, 16, [-4, 6]); ctx.rotate(f * 0.4); ctx.scale(0.75, 0.75); }
    ctx.scale(f, 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (s === 'jump') {
      // 伸長: 後腿往後伸
      line(ctx, -6, 4, -14, 12, C('#b8407a'), 4); line(ctx, -14, 12, -10, 13, C('#b8407a'), 3);
      line(ctx, 8, 4, 12, 11, C('#b8407a'), 3);
      ctx.beginPath(); ctx.ellipse(0, -1, 12, 9, -0.25, 0, Math.PI * 2);
    } else {
      // 蹲: 扁寬
      line(ctx, -11, 8, -13.5, 12, C('#b8407a'), 4); line(ctx, 11, 8, 13.5, 12, C('#b8407a'), 4);
      ctx.beginPath(); ctx.ellipse(0, 4, 14, 9, 0, 0, Math.PI * 2);
    }
    ctx.fillStyle = C(PAL.frog); ctx.fill(); ctx.strokeStyle = PAL.monLine; ctx.lineWidth = 2; ctx.stroke();
    var ey = s === 'jump' ? -8 : -3;
    // 肚皮
    ctx.beginPath(); ctx.ellipse(3, ey + 11, 6, 3.5, 0, 0, Math.PI * 2); ctx.fillStyle = C('#ffc2dc'); ctx.fill();
    // 凸眼
    circ(ctx, 2, ey, 4.5, C(PAL.frog), PAL.monLine, 1.6);
    circ(ctx, 9, ey + 1, 4.5, C(PAL.frog), PAL.monLine, 1.6);
    angryEye(ctx, 9.5, ey + 1, 2.2, false);
    // 斑點
    circ(ctx, -6, s === 'jump' ? -3 : 2, 2, C('#a8306a'));
    ctx.restore();
    FLASH = false;
  }

  // ===================== 飛行物 =====================
  function drawBeeShot(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    if (small(ctx)) { circ(ctx, x, y, 6, PAL.danger); ctx.restore(); return; }
    circ(ctx, x, y, 5.1, PAL.danger, PAL.dangerDark, 1.6);
    circ(ctx, x, y, 2.4, '#ffd0d0');
    ctx.restore();
  }

  function drawArrow(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), a = num(st.angle);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    if (small(ctx)) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-12, -2, 24, 4); ctx.restore(); return; }
    ctx.fillStyle = '#e8d6a8'; ctx.fillRect(-10, -1, 16, 2);
    poly(ctx, [12, 0, 5, -3, 5, 3], '#f2f5fb', PAL.ink, 1);
    poly(ctx, [-12, -3, -7, -1, -7, 1, -12, 3, -10, 0], PAL.hunter, PAL.ink, 0.8);
    ctx.restore();
  }

  function drawBomb(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), t = num(st.t);
    ctx.save();
    ctx.translate(x, y);
    if (small(ctx)) { circ(ctx, 0, 0, 7, PAL.ink, PAL.bomber, 2); ctx.restore(); return; }
    ctx.rotate(t * 8);
    circ(ctx, 0, 1, 6.2, '#2a2e38', PAL.bomber, 1.6);
    circ(ctx, -2, -1, 1.8, 'rgba(255,255,255,0.4)');
    line(ctx, 2, -4, 4, -6.5, '#c8b48a', 1.6);
    ctx.rotate(-t * 8);
    var fl = Math.abs(Math.sin(t * 40));
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    var ang = t * 8 - 0.98;
    var fx = Math.cos(ang) * 5.6, fy = Math.sin(ang) * 5.6;
    circ(ctx, fx, fy, 1.2 + fl * 0.8, '#ffe680');
    circ(ctx, fx, fy, 0.9, '#ffffff');
    ctx.restore();
  }

  // ===================== 特效 =====================
  function drawExplosion(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), R = clamp(num(st.radius, 60), 0, 60);
    var p = prog(st.t, num(st.dur, 0.25));
    if (p >= 1) return;
    ctx.save();
    var r = R * (0.35 + 0.65 * Math.sqrt(p));
    ctx.globalAlpha = 1 - p * 0.85;
    // 火球(實心面)
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(0.45, '#ffc93a'); g.addColorStop(0.85, '#ff7a1a'); g.addColorStop(1, 'rgba(200,60,10,0.6)');
    circ(ctx, x, y, r, g);
    // 鋸齒外緣(火舌)
    if (!small(ctx)) {
      ctx.beginPath();
      for (var i = 0; i <= 16; i++) {
        var a = i / 16 * Math.PI * 2, rr2 = (i % 2) ? r * 0.82 : r;
        var px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(120,30,0,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }

  function drawShockwave(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), R = clamp(num(st.radius, 130), 0, 130);
    var p = prog(st.t, num(st.dur, 0.3));
    if (p >= 1) return;
    ctx.save();
    var ring = 12;
    var r = Math.max(ring / 2, R * (0.15 + 0.85 * p));
    ctx.globalAlpha = 1 - p * 0.7;
    // 圈內只鋪極淡色
    circ(ctx, x, y, r, 'rgba(255,240,180,0.08)');
    // 往外推的環: 外緣 = r
    circ(ctx, x, y, r - ring / 2, null, 'rgba(255,201,58,0.75)', ring);
    circ(ctx, x, y, r - 1, null, '#ffffff', 2);
    // 朝外的 V 形記號
    if (!small(ctx)) {
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2 + 0.2;
        var rr2 = r - ring - 6;
        if (rr2 < 8) continue;
        var cx = x + Math.cos(a) * rr2, cy = y + Math.sin(a) * rr2;
        var ox = Math.cos(a), oy = Math.sin(a), nx = -oy, ny = ox;
        ctx.beginPath();
        ctx.moveTo(cx - ox * 4 + nx * 5, cy - oy * 4 + ny * 5);
        ctx.lineTo(cx + ox * 3, cy + oy * 3);
        ctx.lineTo(cx - ox * 4 - nx * 5, cy - oy * 4 - ny * 5);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPoof(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y);
    var p = prog(st.t, num(st.dur, 0.3));
    if (p >= 1) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 1 - p;
    var puffs = [[0, -1], [0.95, 0.3], [-0.95, 0.3], [0.5, -0.85], [-0.5, -0.85], [0.4, 0.9], [-0.4, 0.9]];
    for (var i = 0; i < puffs.length; i++) {
      var d = 4 + p * 14;
      var r = 7 - p * 2.5;
      circ(ctx, puffs[i][0] * d, puffs[i][1] * d, Math.min(r, 24 - d - 1), 'rgba(230,230,240,0.9)', 'rgba(90,90,110,0.7)', 1.5);
    }
    circ(ctx, 0, 0, 8 * (1 - p), '#ffffff');
    ctx.restore();
  }

  function drawPopup(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), kind = mat(st.kind), v = clamp(Math.round(num(st.value, 1)), 0, 999);
    var p = prog(st.t, num(st.dur, 0.8));
    if (p >= 1) return;
    ctx.save();
    var dy = -30 * p;
    ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    var s = '+' + v;
    var tw = textW(ctx, s, 15, true);
    var total = 18 + 3 + tw;
    var sx = x - total / 2;
    matIcon(ctx, kind, sx + 9, y + dy, 8.5);
    text(ctx, s, sx + 21, y + dy + 1, 15, '#ffffff', 'left', true, true);
    ctx.restore();
  }

  function drawChainText(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), n = clamp(Math.round(num(st.n, 2)), 0, 99);
    var p = prog(st.t, num(st.dur, 0.8));
    if (p >= 1) return;
    ctx.save();
    var sc = p < 0.15 ? 1 + 0.3 * (p / 0.15) : (p < 0.3 ? 1.3 - 0.3 * ((p - 0.15) / 0.15) : 1);
    var dy = p < 0.3 ? 0 : -30 * ((p - 0.3) / 0.7);
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    ctx.translate(x, y + dy); ctx.scale(sc, sc);
    text(ctx, n + ' 連鎖', 0, 1, 24, PAL.bomber, 'center', true, '#3a1a00');
    ctx.restore();
  }

  // ===================== 道具 =====================
  function itemIconRaw(ctx, type, x, y, size) {
    var k = size / 32;
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (type === 'bagWood' || type === 'bagStone' || type === 'bagTime') {
      var m = type === 'bagWood' ? 'wood' : (type === 'bagStone' ? 'stone' : 'time');
      // 布袋: 身體 + 綁口(綁繩 = 素材色)
      ctx.beginPath();
      ctx.moveTo(-6, -9); ctx.quadraticCurveTo(-15, -2, -14, 7); ctx.quadraticCurveTo(-13, 15, 0, 15);
      ctx.quadraticCurveTo(13, 15, 14, 7); ctx.quadraticCurveTo(15, -2, 6, -9); ctx.closePath();
      ctx.fillStyle = '#d8c49a'; ctx.fill(); ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 2; ctx.stroke();
      poly(ctx, [-6, -9, -9, -15, -3, -12, 0, -15, 3, -12, 9, -15, 6, -9], '#d8c49a', '#4a3a1a', 1.6);
      ctx.fillStyle = PAL[m]; ctx.fillRect(-7, -10.5, 14, 3.5);
      matIcon(ctx, m, 0, 4, 8);
    } else if (type === 'soulLamp') {
      fillRR(ctx, -9, -10, 18, 22, 4, 'rgba(60,30,100,0.9)', '#c9a24a', 2.4);
      line(ctx, -9, -4, 9, -4, '#c9a24a', 1.5);
      ctx.beginPath(); ctx.arc(0, -10, 4.5, Math.PI, Math.PI * 2); ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 2; ctx.stroke();
      fillRR(ctx, -11, 11, 22, 4, 1.5, '#c9a24a', '#5a3e00', 1.2);
      matIcon(ctx, 'soul', 0, 3, 7);
    } else if (type === 'glove') {
      // 手套 + 撿起的閃光
      ctx.beginPath();
      ctx.moveTo(-9, 14); ctx.lineTo(-10, 0); ctx.lineTo(-13, -6); ctx.quadraticCurveTo(-11, -9, -8, -5);
      ctx.lineTo(-7, -12); ctx.quadraticCurveTo(-5, -15, -3, -12); ctx.lineTo(-2, -14); ctx.quadraticCurveTo(0, -16, 2, -13);
      ctx.lineTo(4, -12); ctx.quadraticCurveTo(6, -14, 8, -11); ctx.lineTo(8, 0); ctx.lineTo(8, 14); ctx.closePath();
      ctx.fillStyle = '#f0ddb4'; ctx.fill(); ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#c0803a'; ctx.fillRect(-10, 9, 19, 5);
      poly(ctx, [11, -14, 12.3, -10.3, 15.5, -9, 12.3, -7.7, 11, -4, 9.7, -7.7, 6.5, -9, 9.7, -10.3], '#ffffff', '#5a4020', 1);
      matIcon(ctx, 'wood', -12, 13, 4.5);
    } else if (type === 'horn') {
      // 號角(獸角 + 銅箍)+ 爪痕
      ctx.beginPath();
      ctx.moveTo(-14, -4); ctx.quadraticCurveTo(-4, 14, 13, 6); ctx.lineTo(14, -6); ctx.quadraticCurveTo(0, 2, -11, -9); ctx.closePath();
      ctx.fillStyle = '#f2e6c8'; ctx.fill(); ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(12.5, 0, 2.6, 6.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#c9a24a'; ctx.fill(); ctx.strokeStyle = '#4a3a1a'; ctx.lineWidth = 1.5; ctx.stroke();
      line(ctx, -2, 0, 1, 6.5, '#c9a24a', 3);
      line(ctx, -12, -15, -6, -9, PAL.danger, 2); line(ctx, -8, -15, -2, -9, PAL.danger, 2); line(ctx, -4, -15, 2, -9, PAL.danger, 2);
    } else {
      fillRR(ctx, -12, -12, 24, 24, 4, null, PAL.panelLine, 2);
    }
    ctx.restore();
  }

  function drawItemIcon(ctx, st) {
    st = o(st);
    ctx.save();
    itemIconRaw(ctx, itemType(st.type), num(st.x), num(st.y), 32);
    ctx.restore();
  }

  function drawItemNotice(ctx, st) {
    st = o(st);
    var type = itemType(st.type);
    var dur = num(st.dur, 1.5), t = num(st.t, dur);
    if (t >= dur || t < 0) return;
    ctx.save();
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? (dur - t) / 0.3 : 1);
    ctx.globalAlpha = clamp(a, 0, 1);
    var X = 440, Y = 52;
    fillRR(ctx, X + 1.25, Y + 1.25, 397.5, 41.5, 10, 'rgba(18,22,36,0.92)', PAL.gold, 2.5);
    itemIconRaw(ctx, type, X + 32, Y + 22, 30);
    text(ctx, '獲得 ' + (type ? ITEM_NAME[type] : '道具'), X + 58, Y + 23, 20, PAL.text, 'left', true);
    text(ctx, type ? ITEM_FX[type] : '', X + 388, Y + 23, 13, PAL.textDim, 'right');
    ctx.restore();
  }

  // ===================== 大地圖 =====================
  function drawMapLink(ctx, st) {
    st = o(st);
    var x1 = num(st.x1), y1 = num(st.y1), x2 = num(st.x2), y2 = num(st.y2), lit = st.lit === true;
    ctx.save();
    var mx = (x1 + x2) / 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    ctx.lineCap = 'round';
    if (lit) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = 5; ctx.stroke();
    } else {
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(150,160,180,0.45)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function cardBase(ctx, x, y, w, h, dim) {
    fillRR(ctx, x + 1, y + 1, w - 2, h - 2, 10, dim ? '#1a1f2c' : PAL.panel2, dim ? '#2c3344' : PAL.panelLine, 2);
  }

  function drawLevelCard(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), idx = clamp(Math.round(num(st.index, 1)), 1, 8);
    var name = typeof st.name === 'string' ? st.name : '';
    var s = pick(st.state, { sealed: 1, buyable: 1, open: 1, cleared: 1 }, 'sealed');
    var rep = clamp(Math.round(num(st.repairedCount)), 0, 2);
    ctx.save();
    var dim = s === 'sealed';
    cardBase(ctx, x, y, 176, 136, dim);
    // 縮圖區
    var tx = x + 8, ty = y + 8;
    if (s === 'sealed' || s === 'buyable') {
      fillRR(ctx, tx, ty, 160, 90, 4, dim ? '#11141c' : '#1c2436');
      lock(ctx, tx + 80, ty + 34, 1.15, s === 'buyable', s === 'buyable' ? PAL.gold : '#5a6070');
      costRow(ctx, st.cost, st.stock, tx + 80, ty + 72, 15, 'center');
      if (s === 'sealed') { ctx.fillStyle = 'rgba(10,12,20,0.35)'; ctx.fillRect(tx, ty, 160, 90); }
    } else {
      ctx.fillStyle = PAL.bgTop; ctx.fillRect(tx, ty, 160, 90);
    }
    // 文字區
    var l1 = y + 112, l2 = y + 127;
    var col = dim ? '#6a7288' : PAL.text;
    text(ctx, idx + ' ' + name, x + 9, l1, 12, col, 'left', true);
    text(ctx, '修 ' + rep + '/2', x + 168, l1, 11, dim ? '#5a6278' : (rep > 0 ? PAL.gold : PAL.textDim), 'right', true);
    if (s === 'cleared') {
      var rc = st.recordCls;
      var nw = textW(ctx, idx + ' ' + name, 12, true);
      var bx = x + 9 + nw + 10;
      if (rc) clsBadge(ctx, rc, bx, l1, 6);
      if (st.recordTime !== null && st.recordTime !== undefined) text(ctx, f1(st.recordTime) + '秒', bx + 9, l1, 11, PAL.textDim, 'left');
      var r = matSet(st.rates);
      for (var i = 0; i < 4; i++) {
        var k = MAT_KEYS[i], cx = x + 9 + i * 41;
        matIcon(ctx, k, cx + 5, l2, 5);
        var v = f1(r[k]);
        var fs = textW(ctx, v, 11, false) > 28 ? 10 : 11;
        text(ctx, v, cx + 12, l2 + 0.5, fs, PAL.text, 'left');
      }
    } else if (s === 'open') {
      text(ctx, '未過關', x + 9, l2, 11, PAL.textDim, 'left');
    } else if (s === 'buyable') {
      text(ctx, '可解鎖', x + 9, l2, 11, PAL.gold, 'left', true);
    } else {
      text(ctx, '先通過前一關', x + 9, l2, 11, '#5a6278', 'left');
    }
    ctx.restore();
  }

  function drawCardOverlay(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), lv = clamp(Math.round(num(st.accelLv)), 0, 2);
    ctx.save();
    // 縮圖外框(內部透明)
    rr(ctx, x + 8, y + 8, 160, 90, 4);
    ctx.strokeStyle = '#0c0f18'; ctx.lineWidth = 3; ctx.stroke();
    rr(ctx, x + 7, y + 7, 162, 92, 5);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    if (lv > 0) {
      var s = lv === 1 ? '×1.25' : '×1.5';
      var w = textW(ctx, s, 12, true) + 10;
      fillRR(ctx, x + 165 - w, y + 11, w, 18, 5, 'rgba(15,104,118,0.95)', PAL.time, 1.5);
      text(ctx, s, x + 165 - w / 2, y + 20.5, 12, '#ffffff', 'center', true);
    }
    if (st.newArea === true) {
      var p = 0.5 + 0.5 * Math.sin(now() * 5);
      var w2 = textW(ctx, '新區域', 12, true) + 12;
      fillRR(ctx, x + 11, y + 11, w2, 18, 5, PAL.gold, '#5a3e00', 1.5);
      ctx.globalAlpha = 0.4 + 0.6 * p;
      fillRR(ctx, x + 10, y + 10, w2 + 2, 20, 6, null, '#ffffff', 1.5);
      ctx.globalAlpha = 1;
      text(ctx, '新區域', x + 11 + w2 / 2, y + 20.5, 12, '#2a1a00', 'center', true);
    }
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function selFrame(ctx, x, y, w, h) {
    var p = 0.5 + 0.5 * Math.sin(now() * 6);
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 13);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 4; ctx.stroke();
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 13);
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2.5 + p; ctx.stroke();
  }

  function drawWorkshopCard(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y);
    ctx.save();
    cardBase(ctx, x, y, 176, 136, false);
    // 建築 + 鐵砧
    var cx = x + 88, cy = y + 56;
    fillRR(ctx, cx - 44, cy - 20, 88, 50, 4, '#6a4a2a', '#2a1a10', 2);
    poly(ctx, [cx - 52, cy - 18, cx, cy - 48, cx + 52, cy - 18], '#a8402c', '#2a1a10', 2);
    fillRR(ctx, cx - 10, cy + 6, 20, 24, 3, '#2a1a10');
    // 鐵砧
    poly(ctx, [cx + 18, cy + 14, cx + 46, cy + 14, cx + 40, cy + 20, cx + 36, cy + 20, cx + 36, cy + 28, cx + 28, cy + 28, cx + 28, cy + 20, cx + 22, cy + 20], '#5a6070', '#15171c', 1.5);
    poly(ctx, [cx + 46, cy + 14, cx + 54, cy + 14, cx + 46, cy + 18], '#5a6070', '#15171c', 1.2);
    // 窗(暖光)
    fillRR(ctx, cx - 36, cy - 8, 14, 12, 2, '#ffd27a', '#2a1a10', 1.5);
    matIcon(ctx, 'soul', cx - 29, cy - 2, 5);
    text(ctx, '升級所', x + 88, y + 114, 15, PAL.text, 'center', true);
    text(ctx, '招募 · 強化', x + 88, y + 129, 11, PAL.textDim, 'center');
    if (st.anyAffordable === true) {
      var p = 0.5 + 0.5 * Math.sin(now() * 5);
      circ(ctx, x + 160, y + 16, 10 + p * 1.5, PAL.good, '#0a3a10', 2);
      text(ctx, '!', x + 160, y + 17, 14, '#0a3a10', 'center', true);
    }
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function drawGoalCard(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), can = st.canAfford === true;
    ctx.save();
    fillRR(ctx, x + 1.5, y + 1.5, 197, 133, 10, '#2a2440', can ? PAL.gold : '#6a5a90', can ? 3 : 2);
    // 王城(未重建 = 灰剪影; 可買 = 金頂)
    var cx = x + 100, by = y + 64;
    var wall = can ? '#c8b8e8' : '#6a6480', roof = can ? PAL.gold : '#4a4460';
    ctx.fillStyle = wall;
    ctx.fillRect(cx - 50, by - 22, 100, 26);
    ctx.fillRect(cx - 58, by - 40, 18, 44); ctx.fillRect(cx + 40, by - 40, 18, 44);
    ctx.fillRect(cx - 14, by - 50, 28, 54);
    poly(ctx, [cx - 61, by - 40, cx - 49, by - 56, cx - 37, by - 40], roof);
    poly(ctx, [cx + 37, by - 40, cx + 49, by - 56, cx + 61, by - 40], roof);
    poly(ctx, [cx - 18, by - 50, cx, by - 62, cx + 18, by - 50], roof);
    fillRR(ctx, cx - 7, by - 12, 14, 16, 6, '#1a1428');
    ctx.strokeStyle = '#1a1428'; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 50, by - 22, 100, 26);
    text(ctx, '王城', x + 14, y + 16, 15, PAL.text, 'left', true);
    // 花費 2x2
    var c = matSet(st.cost), s = matSet(st.stock);
    for (var i = 0; i < 4; i++) {
      var k = MAT_KEYS[i];
      var px = x + 14 + (i % 2) * 92, py = y + 86 + Math.floor(i / 2) * 18;
      matIcon(ctx, k, px + 6, py, 6.5);
      var lack = s[k] < c[k];
      var str = int(Math.min(s[k], c[k])) + '/' + int(c[k]);
      text(ctx, str, px + 16, py + 0.5, 12, lack ? PAL.bad : PAL.good, 'left', true);
    }
    text(ctx, can ? 'Z 重建王城' : '四種素材都要', x + 100, y + 126, 11, can ? PAL.gold : PAL.textDim, 'center', can);
    if (st.selected === true) selFrame(ctx, x, y, 200, 136);
    ctx.restore();
  }

  function drawFlyingMaterial(ctx, st) {
    st = o(st);
    var x = num(st.x), y = num(st.y), kind = mat(st.kind);
    var p = prog(st.t, num(st.dur, 0.7));
    ctx.save();
    // 拖尾: 往飛行反方向(終點 = 資訊列該種圖示)
    var tx = HUD_ICON_X[kind], ty = 20;
    var dx = tx - x, dy = ty - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = -dx / d, uy = -dy / d;
    var tl = Math.min(24, d) * (p < 1 ? 1 : 0);
    var tl0 = 7;
    if (tl > 1) {
      var g = ctx.createLinearGradient(x, y, x + ux * (tl0 + tl), y + uy * (tl0 + tl));
      g.addColorStop(0, matColor(kind)); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + ux * 4, y + uy * 4); ctx.lineTo(x + ux * (tl0 + tl), y + uy * (tl0 + tl)); ctx.stroke();
    }
    circ(ctx, x, y, 10, 'rgba(255,255,255,0.25)');
    matIcon(ctx, kind, x, y, 8.5);
    ctx.restore();
  }

  // ===================== 面板共用 =====================
  function dimScreen(ctx, a) { ctx.fillStyle = 'rgba(6,8,14,' + a + ')'; ctx.fillRect(0, 0, W, H); }
  function panelBox(ctx, x, y, w, h) {
    fillRR(ctx, x + 1, y + 1, w - 2, h - 2, 14, PAL.panel, '#5a6890', 2);
  }
  function rowBox(ctx, x, y, w, h, active, label) {
    fillRR(ctx, x, y, w, h, 10, active ? '#2c3858' : '#212a40', active ? PAL.gold : PAL.panelLine, active ? 3 : 1.5);
    if (label) text(ctx, label, x + 12, y + 14, 13, active ? PAL.gold : PAL.textDim, 'left', true);
  }
  function cellBox(ctx, x, y, w, h, sel, rowActive, dis) {
    var stroke = sel ? (rowActive ? PAL.gold : 'rgba(255,212,90,0.45)') : '#3e4a66';
    fillRR(ctx, x, y, w, h, 8, dis ? '#181d2a' : (sel && rowActive ? '#34446a' : '#283350'), stroke, sel ? (rowActive ? 3 : 2) : 1.2);
  }
  function hintLine(ctx, s, x, y) { text(ctx, s, x, y, 15, PAL.textDim, 'left'); }
  function portrait(ctx, c, x, y, k, dim) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    if (dim) ctx.globalAlpha = 0.35;
    drawPlayerBody(ctx, cls(c), 1, 'idle', 0);
    ctx.restore();
  }
  function rateCells(ctx, rates, x, y, step, size, cmp) {
    var r = matSet(rates);
    for (var i = 0; i < 4; i++) {
      var k = MAT_KEYS[i];
      matIcon(ctx, k, x + i * step + size * 0.5, y, size * 0.5);
      text(ctx, f1(r[k]) + '/分', x + i * step + size + 6, y + 1, size * 0.85, PAL.text, 'left');
    }
  }

  // ===================== 關卡面板 =====================
  function drawLevelPanel(ctx, st) {
    st = o(st);
    var row = clamp(Math.round(num(st.row)), 0, 3);
    var stock = matSet(st.stock);
    ctx.save();
    dimScreen(ctx, 0.62);
    panelBox(ctx, 40, 48, 1200, 640);
    text(ctx, '第 ' + clamp(Math.round(num(st.index, 1)), 1, 8) + ' 關  ' + (typeof st.name === 'string' ? st.name : ''), 60, 74, 24, PAL.text, 'left', true);
    // 預覽框(內容 RD 畫)
    rr(ctx, 60, 96, 640, 360, 4); ctx.strokeStyle = '#0c0f18'; ctx.lineWidth = 3; ctx.stroke();
    rr(ctx, 59, 95, 642, 362, 5); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();

    // 背包
    var items = Array.isArray(st.items) ? st.items : [];
    text(ctx, '背包', 60, 464, 12, PAL.textDim, 'left', true);
    for (var b = 0; b < 8; b++) {
      var bx = 60 + b * 80, by = 472;
      var it = items[b] ? o(items[b]) : null;
      fillRR(ctx, bx, by, 74, 74, 8, it ? '#283350' : '#1a2030', '#3e4a66', 1.2);
      if (it) {
        itemIconRaw(ctx, itemType(it.type), bx + 37, by + 28, 34);
        var wh = it.where && typeof it.where === 'object' ? it.where : null;
        var lab = wh ? ('第' + clamp(Math.round(num(wh.level, 1)), 1, 8) + '關 ' + clamp(Math.round(num(wh.slot, 1)), 1, 2) + '號') : '未裝';
        text(ctx, lab, bx + 37, by + 61, 11, wh ? PAL.gold : PAL.textDim, 'center', !!wh);
      }
    }

    // 回放資訊
    fillRR(ctx, 60, 560, 640, 90, 10, '#212a40', PAL.panelLine, 1.5);
    text(ctx, '目前回放', 76, 578, 13, PAL.textDim, 'left', true);
    if (st.recordCls && st.recordTime !== null && st.recordTime !== undefined) {
      clsBadge(ctx, st.recordCls, 92, 614, 13);
      text(ctx, CLS[cls(st.recordCls)], 112, 606, 14, PAL.text, 'left', true);
      text(ctx, f1(st.recordTime) + ' 秒', 112, 626, 14, PAL.text, 'left');
      rateCells(ctx, st.rates, 200, 615, 120, 18);
    } else {
      text(ctx, '尚無回放', 380, 612, 16, PAL.textDim, 'center');
    }
    if (st.newArea === true) text(ctx, '修好後還沒跑過', 684, 578, 13, PAL.gold, 'right', true);

    // 職業列
    rowBox(ctx, 720, 96, 480, 130, row === 0, '職業');
    var classes = Array.isArray(st.classes) ? st.classes : [];
    var csel = clamp(Math.round(num(st.clsSel)), 0, 2);
    var order = ['sword', 'hunter', 'bomber'];
    for (var c = 0; c < 3; c++) {
      var ci = o(classes[c]);
      var cc = cls(ci.cls || order[c]);
      var owned = ci.owned === true;
      var cx = 726 + c * 158, cy = 120;
      cellBox(ctx, cx, cy, 150, 100, c === csel, row === 0, !owned);
      portrait(ctx, cc, cx + 26, cy + 50, 1.05, !owned);
      text(ctx, CLS[cc], cx + 50, cy + 22, 16, owned ? PAL.text : '#6a7288', 'left', true);
      text(ctx, CLS_GOOD[cc], cx + 50, cy + 44, 11, owned ? PAL.textDim : '#5a6278', 'left');
      if (!owned) {
        lock(ctx, cx + 128, cy + 22, 0.7, false, '#8a92a8');
        text(ctx, '到升級所招募', cx + 50, cy + 80, 11, '#8a92a8', 'left');
      } else if (c === csel) {
        keycap(ctx, 'Z', cx + 62, cy + 80, 20, 20, { size: 12 });
        text(ctx, '出發', cx + 78, cy + 80, 14, row === 0 ? PAL.gold : PAL.textDim, 'left', true);
      }
    }

    // 修復列
    rowBox(ctx, 720, 236, 480, 150, row === 1, '修復');
    var sites = Array.isArray(st.sites) ? st.sites : [];
    var ssel = clamp(Math.round(num(st.siteSel)), 0, 1);
    for (var si = 0; si < 2; si++) {
      var sv = o(sites[si]);
      var role = pick(sv.role, SITE_NAME, si === 0 ? 'shortcut' : 'treasure');
      var kind = pick(sv.kind, KIND_NAME, 'bridge');
      var sx = 734 + si * 236, sy = 258;
      cellBox(ctx, sx, sy, 222, 118, si === ssel, row === 1, false);
      ctx.save(); ctx.translate(sx + 28, sy + 50); ctx.scale(0.9, 0.9);
      drawSiteSign(ctx, { x: 0, y: 0, role: role });
      ctx.restore();
      text(ctx, SITE_NAME[role], sx + 56, sy + 22, 16, PAL.text, 'left', true);
      text(ctx, KIND_NAME[kind], sx + 56, sy + 44, 13, PAL.textDim, 'left');
      if (sv.repaired === true) {
        text(ctx, '✔ 已完工', sx + 56, sy + 90, 15, PAL.good, 'left', true);
      } else {
        costRow(ctx, sv.cost, stock, sx + 56, sy + 70, 15, 'left');
        keycap(ctx, 'Z', sx + 66, sy + 98, 20, 20, { size: 12 });
        text(ctx, '修復', sx + 82, sy + 98, 14, (si === ssel && row === 1) ? PAL.gold : PAL.textDim, 'left', true);
      }
    }

    // 道具格列
    rowBox(ctx, 720, 396, 480, 120, row === 2, '道具格');
    var slots = Array.isArray(st.slots) ? st.slots : [];
    var lsel = clamp(Math.round(num(st.slotSel)), 0, 1);
    for (var li = 0; li < 2; li++) {
      var ty = itemType(slots[li]);
      var lx = 734 + li * 236, ly = 418;
      cellBox(ctx, lx, ly, 222, 88, li === lsel, row === 2, false);
      text(ctx, (li + 1) + '號', lx + 10, ly + 14, 11, PAL.textDim, 'left', true);
      if (ty) {
        itemIconRaw(ctx, ty, lx + 28, ly + 46, 34);
        text(ctx, ITEM_NAME[ty], lx + 54, ly + 28, 15, PAL.text, 'left', true);
        text(ctx, ITEM_FX[ty], lx + 54, ly + 49, 12, PAL.textDim, 'left');
      } else {
        fillRR(ctx, lx + 12, ly + 30, 32, 32, 6, null, '#4a5570', 1.5);
        text(ctx, '空', lx + 54, ly + 40, 15, PAL.textDim, 'left', true);
      }
      if (li === lsel) {
        if (items.length) {
          keycap(ctx, 'Z', lx + 64, ly + 72, 18, 18, { size: 11 });
          text(ctx, '換道具', lx + 78, ly + 72, 13, row === 2 ? PAL.gold : PAL.textDim, 'left', true);
        } else {
          text(ctx, '尚無道具', lx + 54, ly + 72, 13, PAL.textDim, 'left');
        }
      }
    }

    // 加速器列
    rowBox(ctx, 720, 526, 480, 80, row === 3, '回放加速器');
    var alv = clamp(Math.round(num(st.accelLv)), 0, 2);
    var mul = ['×1', '×1.25', '×1.5'];
    text(ctx, '目前', 736, 576, 13, PAL.textDim, 'left');
    text(ctx, mul[alv], 772, 576, 22, PAL.time, 'left', true);
    for (var a = 0; a < 2; a++) fillRR(ctx, 860 + a * 22, 568, 16, 16, 3, a < alv ? PAL.time : '#1a2030', '#4a5570', 1.2);
    if (st.accelCost && typeof st.accelCost === 'object' && alv < 2) {
      text(ctx, '下一級 ' + mul[alv + 1], 920, 576, 13, PAL.textDim, 'left');
      costRow(ctx, st.accelCost, stock, 1010, 576, 15, 'left');
      keycap(ctx, 'Z', 1120, 576, 20, 20, { size: 12 });
      text(ctx, '購買', 1136, 576, 14, row === 3 ? PAL.gold : PAL.textDim, 'left', true);
    } else {
      text(ctx, '已滿', 920, 576, 15, PAL.good, 'left', true);
    }

    hintLine(ctx, '↑↓ 換列    ←→ 選擇    Z 確定    X 關閉', 60, 672);
    ctx.restore();
  }

  function drawSiteHighlight(ctx, st) {
    st = o(st);
    if (st.active === false) return;
    var x = num(st.x), y = num(st.y), w = clamp(num(st.w, 20), 20, 640), h = clamp(num(st.h, 20), 20, 360);
    ctx.save();
    var p = 0.5 + 0.5 * Math.sin(now() * 6);
    // 外緣 = (x,y,w,h), 線往內畫
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.setLineDash([10, 6]); ctx.lineDashOffset = -now() * 30;
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.08 + 0.1 * p;
    ctx.fillStyle = PAL.gold; ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
    ctx.restore();
  }

  // ===================== 升級所 =====================
  var STAT_INFO = {
    speed: { name: '移速', fx: ['移速 +0%', '移速 +8%', '移速 +16%', '移速 +24%'] },
    hp: { name: '血量', fx: ['血量 3', '血量 4', '血量 5'] },
    cd: { name: '技能冷卻', fx: ['技能冷卻 -0%', '技能冷卻 -15%', '技能冷卻 -30%', '技能冷卻 -45%'] }
  };

  function drawUpgradePage(ctx, st) {
    st = o(st);
    var row = clamp(Math.round(num(st.row)), 0, 3);
    var stock = matSet(st.stock);
    ctx.save();
    dimScreen(ctx, 0.62);
    panelBox(ctx, 40, 48, 1200, 640);
    text(ctx, '升級所', 60, 74, 24, PAL.text, 'left', true);
    // 持有獸魂 / 木材(右上)
    matIcon(ctx, 'wood', 1000, 74, 9); text(ctx, int(stock.wood), 1014, 75, 16, PAL.text, 'left', true);
    matIcon(ctx, 'soul', 1100, 74, 9); text(ctx, int(stock.soul), 1114, 75, 16, PAL.text, 'left', true);

    rowBox(ctx, 80, 110, 1120, 170, row === 0, '招募');
    var rec = Array.isArray(st.recruits) ? st.recruits : [];
    var rsel = clamp(Math.round(num(st.recruitSel)), 0, 1);
    var ord = ['hunter', 'bomber'];
    for (var i = 0; i < 2; i++) {
      var r = o(rec[i]);
      var c = cls(r.cls || ord[i]);
      var cx = 100 + i * 550, cy = 134;
      cellBox(ctx, cx, cy, 530, 132, i === rsel, row === 0, false);
      portrait(ctx, c, cx + 50, cy + 66, 1.6, false);
      text(ctx, CLS[c], cx + 100, cy + 30, 20, PAL.text, 'left', true);
      text(ctx, '擅長: ' + CLS_GOOD[c], cx + 100, cy + 58, 14, PAL.textDim, 'left');
      if (r.owned === true) {
        text(ctx, '✔ 已招募', cx + 100, cy + 98, 16, PAL.good, 'left', true);
      } else {
        costRow(ctx, r.cost, stock, cx + 100, cy + 98, 17, 'left');
        if (i === rsel) {
          keycap(ctx, 'Z', cx + 420, cy + 98, 22, 22, { size: 13 });
          text(ctx, '招募', cx + 438, cy + 98, 15, row === 0 ? PAL.gold : PAL.textDim, 'left', true);
        }
      }
    }

    var stats = Array.isArray(st.stats) ? st.stats : [];
    var keys = ['speed', 'hp', 'cd'];
    var ys = [300, 410, 520];
    for (var k = 0; k < 3; k++) {
      var s = o(stats[k]);
      var key = pick(s.key, STAT_INFO, keys[k]);
      var info = STAT_INFO[key];
      var maxLv = clamp(Math.round(num(s.maxLv, info.fx.length - 1)), 1, 10);
      var lv = clamp(Math.round(num(s.lv)), 0, maxLv);
      var y = ys[k], act = row === k + 1;
      rowBox(ctx, 80, y, 1120, 100, act, null);
      text(ctx, info.name, 104, y + 50, 20, act ? PAL.gold : PAL.text, 'left', true);
      for (var b = 0; b < maxLv; b++) fillRR(ctx, 240 + b * 34, y + 38, 26, 24, 4, b < lv ? PAL.soul : '#1a2030', b < lv ? PAL.soulLight : '#4a5570', 1.5);
      text(ctx, '目前', 400, y + 36, 12, PAL.textDim, 'left');
      text(ctx, info.fx[Math.min(lv, info.fx.length - 1)], 400, y + 60, 17, PAL.text, 'left', true);
      if (s.cost && typeof s.cost === 'object' && lv < maxLv) {
        text(ctx, '下一級', 640, y + 36, 12, PAL.textDim, 'left');
        text(ctx, info.fx[Math.min(lv + 1, info.fx.length - 1)], 640, y + 60, 17, PAL.good, 'left', true);
        costRow(ctx, s.cost, stock, 880, y + 50, 17, 'left');
        if (act) {
          keycap(ctx, 'Z', 1080, y + 50, 22, 22, { size: 13 });
          text(ctx, '升級', 1098, y + 50, 15, PAL.gold, 'left', true);
        }
      } else {
        text(ctx, '已滿', 640, y + 50, 17, PAL.good, 'left', true);
      }
    }
    hintLine(ctx, '↑↓ 換列    ←→ 選擇    Z 招募 / 升級    X 關閉', 60, 672);
    ctx.restore();
  }

  // ===================== 資訊列 =====================
  function drawHud(ctx, st) {
    st = o(st);
    var mode = st.mode === 'level' ? 'level' : 'map';
    var stock = matSet(st.stock), rate = matSet(st.ratePerMin);
    var bump = o(st.bumpT), bdur = num(st.bumpDur, 0.15);
    ctx.save();
    ctx.fillStyle = PAL.hud; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 39, W, 1);
    for (var i = 0; i < 4; i++) {
      var k = MAT_KEYS[i], x0 = 16 + i * 170;
      if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x0 - 6, 6, 1, 28); }
      matIcon(ctx, k, HUD_ICON_X[k], 20, 11);
      var bt = num(bump[k], bdur);
      var sc = (bdur > 0 && bt < bdur && bt >= 0) ? 1 + 0.3 * Math.sin(Math.PI * bt / bdur) : 1;
      ctx.save();
      ctx.translate(54, 0); ctx.translate(x0 - 16, 21); ctx.scale(sc, sc);
      text(ctx, int(stock[k]), 0, 0, 18, sc > 1 ? '#ffffff' : PAL.text, 'left', true);
      ctx.restore();
      text(ctx, '+' + f1(rate[k]) + '/分', x0 + 100, 14, 11, PAL[k] === undefined ? PAL.text : PAL.textDim, 'left');
      text(ctx, MAT_USE[k], x0 + 100, 29, 10, matColor(k), 'left', true);
    }
    if (mode === 'level') {
      var c = cls(st.cls);
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(716, 6, 1, 28);
      clsBadge(ctx, c, 738, 20, 12);
      // 血量
      var mh = clamp(Math.round(num(st.maxHp, 3)), 1, 5), hp = clamp(Math.round(num(st.hp, mh)), 0, mh);
      for (var h = 0; h < mh; h++) heart(ctx, 766 + h * 20, 20, 8, h < hp);
      // 技能冷卻
      var cdD = num(st.skillCdDur, 0), cdT = num(st.skillCdT, cdD);
      var ready = cdD <= 0 || cdT >= cdD;
      var cx = 882;
      circ(ctx, cx, 20, 14, '#1a2030', ready ? PAL[c] : '#4a5570', 2);
      if (!ready) {
        var pr = clamp(cdT / cdD, 0, 1);
        ctx.beginPath(); ctx.moveTo(cx, 20); ctx.arc(cx, 20, 12, -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2); ctx.closePath();
        ctx.fillStyle = 'rgba(160,170,190,0.55)'; ctx.fill();
      } else {
        circ(ctx, cx, 20, 12, PAL[c]);
      }
      text(ctx, 'X', cx, 21, 13, ready ? PAL.ink : '#d6dce6', 'center', true);
      // 時間
      text(ctx, f1(st.time) + ' 秒', 910, 21, 17, PAL.text, 'left', true);
      // 這趟素材
      var run = matSet(st.run);
      for (var j = 0; j < 4; j++) {
        var kk = MAT_KEYS[j], rx = 1000 + j * 68;
        matIcon(ctx, kk, rx + 8, 20, 8.5);
        text(ctx, '+' + int(run[kk]), rx + 20, 21, 15, PAL.text, 'left', true);
      }
    }
    ctx.restore();
  }
  function heart(ctx, x, y, r, full) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.8, y - r * 1.2, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.8, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.closePath();
    ctx.fillStyle = full ? PAL.heart : '#2a2f40'; ctx.fill();
    ctx.strokeStyle = full ? '#5a0a18' : '#5a6070'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // ===================== 結算 / 失敗 / 暫停 / 結束 =====================
  function drawResultPanel(ctx, st) {
    st = o(st);
    var X = 280, Y = 150;
    var hasOld = st.oldTime !== null && st.oldTime !== undefined;
    ctx.save();
    panelBox(ctx, X, Y, 720, 420);
    text(ctx, '過關', X + 360, Y + 38, 32, PAL.gold, 'center', true, true);
    var type = itemType(st.item);
    if (type) {
      fillRR(ctx, X + 230, Y + 64, 260, 36, 8, '#2c3858', PAL.gold, 1.5);
      itemIconRaw(ctx, type, X + 254, Y + 82, 26);
      text(ctx, '獲得 ' + ITEM_NAME[type], X + 274, Y + 83, 16, PAL.text, 'left', true);
    }
    var run = matSet(st.run), rates = matSet(st.rates);
    if (!hasOld) {
      var y0 = Y + 130;
      clsBadge(ctx, st.cls, X + 220, y0, 14);
      text(ctx, CLS[cls(st.cls)] + '  ' + f1(st.time) + ' 秒', X + 242, y0 + 1, 20, PAL.text, 'left', true);
      text(ctx, '這趟拿到', X + 80, y0 + 52, 14, PAL.textDim, 'left');
      text(ctx, '每分鐘產量', X + 80, y0 + 92, 14, PAL.textDim, 'left');
      for (var i = 0; i < 4; i++) {
        var k = MAT_KEYS[i], cx = X + 200 + i * 120;
        matIcon(ctx, k, cx, y0 + 52, 10);
        text(ctx, '+' + int(run[k]), cx + 16, y0 + 53, 17, PAL.text, 'left', true);
        matIcon(ctx, k, cx, y0 + 92, 10);
        text(ctx, f1(rates[k]), cx + 16, y0 + 93, 17, PAL.text, 'left', true);
      }
      text(ctx, '已存成回放', X + 360, Y + 330, 18, PAL.good, 'center', true);
      keycap(ctx, 'Z', X + 300, Y + 380, 26, 26, { size: 15 });
      text(ctx, '回大地圖', X + 320, Y + 381, 18, PAL.text, 'left', true);
    } else {
      var old = matSet(st.oldRates);
      var colA = X + 330, colB = X + 540;
      // 欄頭
      text(ctx, '這一趟', colA, Y + 126, 18, PAL.text, 'center', true);
      text(ctx, '目前回放', colB, Y + 126, 18, PAL.textDim, 'center', true);
      clsBadge(ctx, st.cls, colA - 50, Y + 158, 11);
      text(ctx, f1(st.time) + ' 秒', colA - 34, Y + 159, 17, PAL.text, 'left', true);
      clsBadge(ctx, st.oldCls, colB - 50, Y + 158, 11);
      text(ctx, f1(st.oldTime) + ' 秒', colB - 34, Y + 159, 17, PAL.textDim, 'left', true);
      text(ctx, '每分鐘產量', X + 60, Y + 159, 14, PAL.textDim, 'left');
      for (var j = 0; j < 4; j++) {
        var kk = MAT_KEYS[j], ry = Y + 196 + j * 30;
        fillRR(ctx, X + 50, ry - 13, 620, 26, 5, j % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)');
        matIcon(ctx, kk, X + 74, ry, 9);
        text(ctx, MAT_NAME[kk], X + 90, ry + 1, 14, PAL.textDim, 'left');
        var a = rates[kk], b = old[kk];
        var aHi = a > b + 1e-9, bHi = b > a + 1e-9;
        cmpCell(ctx, f1(a), colA, ry, aHi);
        cmpCell(ctx, f1(b), colB, ry, bHi);
      }
      keycap(ctx, 'Z', X + 196, Y + 380, 26, 26, { size: 15 });
      text(ctx, '採用這一趟', X + 216, Y + 381, 18, PAL.text, 'left', true);
      keycap(ctx, 'X', X + 420, Y + 380, 26, 26, { size: 15 });
      text(ctx, '保留舊的', X + 440, Y + 381, 18, PAL.text, 'left', true);
    }
    ctx.restore();
  }
  function cmpCell(ctx, s, x, y, hi) {
    if (hi) {
      fillRR(ctx, x - 44, y - 11, 88, 22, 5, 'rgba(125,255,138,0.16)', PAL.good, 1.5);
      text(ctx, '▲ ' + s, x, y + 1, 16, PAL.good, 'center', true);
    } else {
      text(ctx, s, x, y + 1, 16, PAL.text, 'center');
    }
  }

  function drawFailPanel(ctx) {
    ctx.save();
    panelBox(ctx, 380, 240, 520, 240);
    fillRR(ctx, 380, 240, 520, 8, 4, PAL.danger);
    text(ctx, '失敗', 640, 316, 36, PAL.bad, 'center', true, true);
    text(ctx, '這一趟不會存成回放', 640, 362, 15, PAL.textDim, 'center');
    keycap(ctx, 'Z', 520, 420, 26, 26, { size: 15 });
    text(ctx, '重來', 540, 421, 18, PAL.text, 'left', true);
    keycap(ctx, 'X', 660, 420, 26, 26, { size: 15 });
    text(ctx, '回大地圖', 680, 421, 18, PAL.text, 'left', true);
    ctx.restore();
  }

  function drawPausePanel(ctx, st) {
    st = o(st);
    var lv = st.mode === 'level';
    ctx.save();
    dimScreen(ctx, 0.55);
    panelBox(ctx, 380, 220, 520, 280);
    text(ctx, '暫停', 640, 300, 36, PAL.text, 'center', true, true);
    if (lv) {
      keycap(ctx, 'Esc', 460, 400, 40, 26, { size: 13 });
      text(ctx, '繼續', 486, 401, 17, PAL.text, 'left', true);
      keycap(ctx, 'Z', 590, 400, 26, 26, { size: 15 });
      text(ctx, '重來', 609, 401, 17, PAL.text, 'left', true);
      keycap(ctx, 'X', 700, 400, 26, 26, { size: 15 });
      text(ctx, '回大地圖', 719, 401, 17, PAL.text, 'left', true);
      text(ctx, '(這趟作廢)', 640, 446, 13, PAL.textDim, 'center');
    } else {
      keycap(ctx, 'Esc', 610, 400, 40, 26, { size: 13 });
      text(ctx, '繼續', 636, 401, 17, PAL.text, 'left', true);
    }
    ctx.restore();
  }

  function drawEndingPanel(ctx, st) {
    st = o(st);
    var t = Math.max(0, Math.floor(num(st.totalTime)));
    var mm = Math.floor(t / 60), ss = t % 60;
    ctx.save();
    panelBox(ctx, 280, 150, 720, 420);
    // 小王城
    drawGoalCard(ctx, { x: 540, y: 186, cost: { wood: 0, stone: 0, time: 0, soul: 0 }, stock: {}, canAfford: true, selected: false });
    ctx.fillStyle = PAL.panel; ctx.fillRect(546, 268, 188, 56);
    text(ctx, '王城重建完成', 640, 372, 34, PAL.gold, 'center', true, true);
    text(ctx, '總遊玩時間  ' + mm + ':' + (ss < 10 ? '0' : '') + ss, 640, 426, 20, PAL.text, 'center', true);
    keycap(ctx, 'Z', 580, 500, 26, 26, { size: 15 });
    text(ctx, '重新開始', 600, 501, 18, PAL.text, 'left', true);
    ctx.restore();
  }

  // ===================== 說明頁示意圖 =====================
  var GUIDE_SIZE = [[480, 270], [600, 220], [480, 300], [560, 240], [560, 220]];

  function guideFrame(ctx, st, vw, vh) {
    var x = num(st.x), y = num(st.y), w = Math.max(1, num(st.w, vw)), h = Math.max(1, num(st.h, vh));
    var k = Math.min(w / vw, h / vh);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
    ctx.scale(k, k);
  }
  function sceneBg(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, PAL.bgTop); g.addColorStop(1, PAL.bgBottom);
    fillRR(ctx, x, y, w, h, 8, g, '#5a6890', 1.5);
  }
  function groundRow(ctx, x0, x1, yTop, rows, th) {
    for (var gx = x0; gx < x1; gx += 40) for (var r = 0; r < rows; r++) drawGround(ctx, { x: gx + 20, y: yTop + 20 + r * 40, top: r === 0, theme: th });
  }
  function dashPath(ctx, pts, col) {
    ctx.save();
    ctx.setLineDash([9, 7]); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 4) ctx.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
    ctx.setLineDash([]);
    // 箭頭
    var n = pts.length;
    var ex = pts[n - 2], ey = pts[n - 1], px = pts[n - 4], py = pts[n - 3];
    var a = Math.atan2(ey - py, ex - px);
    ctx.translate(ex, ey); ctx.rotate(a);
    poly(ctx, [4, 0, -10, -8, -10, 8], col, 'rgba(0,0,0,0.6)', 2);
    ctx.restore();
  }
  function tag(ctx, s, x, y, size) {
    var w = textW(ctx, s, size, true) + 12;
    fillRR(ctx, x - w / 2, y - size * 0.75, w, size * 1.5, 5, 'rgba(10,12,22,0.85)', 'rgba(255,255,255,0.5)', 1);
    text(ctx, s, x, y + 1, size, '#ffffff', 'center', true);
  }

  function guide0(ctx) {
    // 第 1 關草原縮小版: 劍士 → 木材 → 終點旗(跳過野豬)
    sceneBg(ctx, 0, 0, 480, 270);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 480, 270); ctx.clip();
    ctx.scale(0.75, 0.75); // 世界 640x360
    groundRow(ctx, 0, 640, 280, 2, 'plain');
    // 小丘(1 格)
    drawGround(ctx, { x: 300, y: 260, top: true, theme: 'plain' });
    drawGround(ctx, { x: 340, y: 260, top: true, theme: 'plain' });
    drawPickup(ctx, { x: 180, y: 250, kind: 'wood', t: 0.6 });
    drawBoar(ctx, { x: 470, y: 264, facing: -1, state: 'walk', hit: false, t: 0.3 });
    drawGoal(ctx, { x: 590, y: 240, reached: false });
    drawPlayer(ctx, { x: 60, y: 258, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1, invuln: false });
    ctx.restore();
    // 路線(畫面座標 = 世界 × 0.75)
    dashPath(ctx, [64, 210, 100, 180, 135, 186, 180, 192, 225, 168, 268, 160, 320, 140, 362, 166, 420, 196], '#ffffff');
    tag(ctx, '你', 45, 160, 14);
    tag(ctx, '終點', 445, 128, 14);
  }

  function guide1(ctx) {
    var labels = [];
    for (var i = 0; i < 4; i++) {
      var ox = i * 150;
      sceneBg(ctx, ox + 3, 0, 144, 220);
      ctx.save();
      ctx.beginPath(); rr(ctx, ox + 3, 0, 144, 220, 8); ctx.clip();
      for (var g = 0; g < 4; g++) drawGround(ctx, { x: ox + 15 + g * 40, y: 200, top: true, theme: 'plain' });
      ctx.restore();
    }
    // 1. 跑步 ← →
    ctx.save(); ctx.beginPath(); ctx.rect(3, 0, 144, 220); ctx.clip();
    drawPlayer(ctx, { x: 75, y: 158, cls: 'sword', facing: 1, pose: 'run', poseT: 0.05, invuln: false });
    ctx.restore();
    keycap(ctx, '←', 52, 92, 30, 30, { size: 17 });
    keycap(ctx, '→', 98, 92, 30, 30, { size: 17 });
    // 2. 跳 空白鍵
    ctx.save(); ctx.beginPath(); ctx.rect(153, 0, 144, 220); ctx.clip();
    drawPlayer(ctx, { x: 225, y: 110, cls: 'sword', facing: 1, pose: 'rise', poseT: 0.1, invuln: false });
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(225, 179, 12, 3, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.restore();
    keycap(ctx, '空白鍵', 225, 40, 76, 28, { size: 14 });
    // 3. 揮砍 Z
    ctx.save(); ctx.beginPath(); ctx.rect(303, 0, 144, 220); ctx.clip();
    drawPlayer(ctx, { x: 345, y: 158, cls: 'sword', facing: 1, pose: 'slash', poseT: 0.04, invuln: false });
    ctx.restore();
    keycap(ctx, 'Z', 345, 92, 30, 30, { size: 17 });
    // 4. 衝刺斬 X: 穿過跳蛙, 跳蛙化成煙
    ctx.save(); ctx.beginPath(); ctx.rect(453, 0, 144, 220); ctx.clip();
    drawPoof(ctx, { x: 505, y: 166, t: 0.08, dur: 0.3 });
    drawPlayer(ctx, { x: 568, y: 158, cls: 'sword', facing: 1, pose: 'dash', poseT: 0.1, invuln: false });
    ctx.restore();
    keycap(ctx, 'X', 568, 92, 30, 30, { size: 17 });
  }

  function guide2(ctx) {
    // 迷你資訊列(與遊戲內同樣式)
    fillRR(ctx, 0, 0, 480, 44, 8, PAL.hud, 'rgba(255,255,255,0.2)', 1);
    matIcon(ctx, 'wood', 30, 22, 12);
    text(ctx, '12', 50, 23, 20, PAL.textDim, 'left', true);
    text(ctx, '→', 82, 23, 18, PAL.textDim, 'left', true);
    ctx.save(); ctx.translate(108, 23); ctx.scale(1.25, 1.25);
    text(ctx, '13', 0, 0, 20, '#ffffff', 'left', true);
    ctx.restore();
    matIcon(ctx, 'stone', 200, 22, 12); text(ctx, '4', 220, 23, 20, PAL.text, 'left', true);
    matIcon(ctx, 'time', 280, 22, 12); text(ctx, '2', 300, 23, 20, PAL.text, 'left', true);
    matIcon(ctx, 'soul', 360, 22, 12); text(ctx, '1', 380, 23, 20, PAL.text, 'left', true);
    // 已過關卡片(實際卡片樣式)
    var cx = 40, cy = 140;
    drawLevelCard(ctx, { x: cx, y: cy, index: 1, name: '草原', state: 'cleared', cost: null, stock: {}, canAfford: false, rates: { wood: 41.5, stone: 15, time: 10, soul: 5 }, recordCls: 'sword', recordTime: 12.0, repairedCount: 0 });
    // 縮圖: 局部放大(劍士正撿到木材)
    ctx.save();
    ctx.beginPath(); ctx.rect(cx + 8, cy + 8, 160, 90); ctx.clip();
    ctx.translate(cx + 8, cy + 8);
    ctx.fillStyle = PAL.bgTop; ctx.fillRect(0, 0, 160, 90);
    ctx.scale(0.5, 0.5);
    groundRow(ctx, 0, 320, 120, 2, 'plain');
    drawPickup(ctx, { x: 220, y: 100, kind: 'wood', t: 0 });
    drawPlayer(ctx, { x: 200, y: 98, cls: 'sword', facing: 1, pose: 'run', poseT: 0.2, invuln: false });
    drawBoar(ctx, { x: 60, y: 104, facing: 1, state: 'walk', hit: false, t: 0 });
    ctx.restore();
    drawCardOverlay(ctx, { x: cx, y: cy, accelLv: 0, newArea: false, selected: false });
    // 飛行木材: 弧線從縮圖撿取處 → 資訊列木材圖示
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(cx + 118, cy + 58); ctx.quadraticCurveTo(cx + 230, cy - 120, 30, 34);
    ctx.strokeStyle = 'rgba(236,192,132,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    drawFlyingMaterial(ctx, { x: 166, y: 54, kind: 'wood', t: 0.45, dur: 0.7 });
    tag(ctx, '一直重播', 360, 205, 14);
  }

  function routeScene(ctx, ox, oy, detour) {
    // 同一關兩條路線: 世界 520x340, 縮 0.5
    sceneBg(ctx, ox, oy, 260, 170);
    ctx.save();
    ctx.beginPath(); rr(ctx, ox, oy, 260, 170, 8); ctx.clip();
    ctx.translate(ox, oy); ctx.scale(0.5, 0.5);
    groundRow(ctx, 0, 520, 300, 1, 'rock');
    drawGround(ctx, { x: 140, y: 280, top: true, theme: 'rock' });          // 小台階(1 格)
    for (var i = 0; i < 5; i++) drawGround(ctx, { x: 220 + i * 40, y: 200, top: true, theme: 'rock' }); // 上層平台 top=180, 底=220
    drawPickup(ctx, { x: 80, y: 284, kind: 'wood', t: 0 });
    if (!detour) {
      drawPickup(ctx, { x: 240, y: 164, kind: 'stone', t: 0 });
      drawPickup(ctx, { x: 290, y: 164, kind: 'time', t: 0 });
      drawBoar(ctx, { x: 360, y: 164, facing: -1, state: 'walk', hit: false, t: 0 });
    } else {
      drawPoof(ctx, { x: 360, y: 160, t: 0.1, dur: 0.3 });
    }
    drawGoal(ctx, { x: 490, y: 260, reached: false });
    drawPlayer(ctx, { x: 30, y: 278, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
    if (detour) {
      ctx.globalAlpha = 0.9;
      drawPickup(ctx, { x: 240, y: 164, kind: 'stone', t: 0 });
      drawPickup(ctx, { x: 290, y: 164, kind: 'time', t: 0 });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    var X = function (v) { return ox + v * 0.5; }, Y = function (v) { return oy + v * 0.5; };
    if (detour) dashPath(ctx, [X(50), Y(280), X(110), Y(220), X(140), Y(236), X(185), Y(170), X(235), Y(158), X(330), Y(150), X(400), Y(158), X(430), Y(200), X(470), Y(268)], PAL.gold);
    else dashPath(ctx, [X(50), Y(280), X(110), Y(220), X(170), Y(276), X(320), Y(282), X(470), Y(278)], '#ffffff');
  }

  function guide3(ctx) {
    routeScene(ctx, 10, 6, true);
    routeScene(ctx, 290, 6, false);
    tag(ctx, '素材多 / 秒數長', 140, 206, 15);
    tag(ctx, '素材少 / 秒數短', 420, 206, 15);
  }

  function bridgeScene(ctx, ox, oy, repaired) {
    // 世界 480x360, 縮 0.5 → 240x180
    sceneBg(ctx, ox, oy, 240, 180);
    ctx.save();
    ctx.beginPath(); rr(ctx, ox, oy, 240, 180, 8); ctx.clip();
    ctx.translate(ox, oy); ctx.scale(0.5, 0.5);
    for (var c = 0; c < 12; c++) {
      var gx = c * 40 + 20;
      var gap = c >= 3 && c <= 8;
      if (!gap) { for (var r = 0; r < 4; r++) drawGround(ctx, { x: gx, y: 220 + r * 40, top: r === 0, theme: 'plain' }); }
      else {
        drawSpike(ctx, { x: gx, y: 340 });
        drawWorksite(ctx, { x: gx, y: 220, kind: 'bridge', repaired: repaired, theme: 'plain' });
      }
    }
    if (!repaired) {
      // 兩端殘樁
      ctx.fillStyle = PAL.plankDark; ctx.fillRect(120, 202, 14, 10); ctx.fillRect(346, 202, 14, 10);
      ctx.fillStyle = PAL.plank; ctx.fillRect(120, 200, 14, 5); ctx.fillRect(346, 200, 14, 5);
      drawSiteSign(ctx, { x: 70, y: 176, role: 'shortcut' });
    } else {
      drawPlayer(ctx, { x: 250, y: 178, cls: 'sword', facing: 1, pose: 'run', poseT: 0.12, invuln: false });
    }
    ctx.restore();
  }

  function guide4(ctx) {
    bridgeScene(ctx, 10, 20, false);
    bridgeScene(ctx, 310, 20, true);
    // 中間箭頭
    poly(ctx, [262, 102, 284, 102, 284, 92, 302, 110, 284, 128, 284, 118, 262, 118], PAL.gold, 'rgba(0,0,0,0.6)', 2);
    // 左格右下角: 石料圖示
    fillRR(ctx, 216, 166, 30, 30, 8, 'rgba(10,12,22,0.85)', 'rgba(255,255,255,0.5)', 1);
    matIcon(ctx, 'stone', 231, 181, 10);
  }

  var GUIDES = [guide0, guide1, guide2, guide3, guide4];

  function drawGuidePage(ctx, st) {
    st = o(st);
    var p = clamp(Math.round(num(st.page)), 0, GUIDES.length - 1);
    var sz = GUIDE_SIZE[p];
    ctx.save();
    guideFrame(ctx, st, sz[0], sz[1]);
    GUIDES[p](ctx);
    ctx.restore();
  }

  // ===================== 匯出 =====================
  window.Art = {
    canvas: { width: W, height: H },
    palette: PAL,
    themes: THEMES,
    guideSizes: GUIDE_SIZE,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawWorksite: drawWorksite,
    drawSiteSign: drawSiteSign,
    drawHookRing: drawHookRing,
    drawPickup: drawPickup,
    drawChest: drawChest,
    drawGoal: drawGoal,
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
