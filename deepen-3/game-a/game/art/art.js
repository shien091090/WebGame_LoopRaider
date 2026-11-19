/* 連環工程 — 美術模組(deepen-3 / game-a)
 * 全域物件 window.Art, 不用 ES module。全部 Canvas 2D 幾何繪製, 不引外部資源。
 * 每個函式自己 save / restore。世界物件函式(會被縮圖 / 預覽整組縮放重用的)內不使用 fillText。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var TAU = Math.PI * 2;
  var SIL = 0.2; // 縮放低於此值改畫剪影

  var PAL = {
    bg: '#1a2233', bgLow: '#273149', bgHill: '#212b40', mapBg: '#15242a', mapLine: '#1e3238',
    wood: '#c97e3a', woodLight: '#efc07f', woodDark: '#7a4a1e',
    stone: '#a3adb8', stoneLight: '#d5dbe2', stoneDark: '#5e6874',
    time: '#3fd6ea', timeLight: '#b6f4fb', timeDark: '#1a8ea2',
    soul: '#e65ad4', soulLight: '#ffb6f2', soulDark: '#8e2a80',
    sword: '#3d8bfd', hunter: '#1fbf9a', bomber: '#f28c28',
    skin: '#f4d2b0', outlineHero: '#ffffff', outlineFoe: '#160c12',
    boar: '#9c5b3a', shield: '#7d8799', shieldPlate: '#4f78a8', bee: '#f2c230', frog: '#b5d43a',
    brood: '#c264ff', broodGlow: 'rgba(194,100,255,0.55)', broodmother: '#4a2560', foeEye: '#ff3b3b',
    spike: '#dfe4ec', spikeTip: '#e5484d', crack: '#bc9068', crackLine: '#5a3a22',
    rubble: '#4e5868', rubbleLight: '#7d8898', plank: '#d59c57', plankDark: '#8a5a2a', stair: '#cbc1ae',
    fog: '#9fa5b2', fogLight: '#c9cdd6', lair: '#2a1634', nest: '#5a2d6e',
    chest: '#c27a2e', chestLid: '#dd9238', gold: '#f2c94c', goal: '#ffd23f', goalReached: '#3ccf6e',
    beeShot: '#ff5a2a', arrow: '#f3ead8', bomb: '#2a2a33', fire: '#ff9a2a', shock: '#9ef3ff',
    shortcut: '#43d3ff', treasure: '#ffc83d', nestRole: '#c264ff',
    ui: '#1c2433', uiCell: '#253045', uiLine: '#3c4860', uiLineHi: '#8fa3bf',
    text: '#f2f4f8', textDim: '#9aa4b8', select: '#ffd84a', short: '#ff5a5a', good: '#4fd18b', hp: '#ff4d5e', newArea: '#ff8a3d'
  };

  var THEMES = {
    plain: { top: '#63c35a', topHi: '#9be38f', inner: '#7b5a3c', mark: '#62452c' },
    sky: { top: '#e3eaf2', topHi: '#ffffff', inner: '#7d8ca5', mark: '#66748c' },
    rock: { top: '#d89c5a', topHi: '#f2c48a', inner: '#8d502c', mark: '#6e3a1e' },
    swamp: { top: '#86a03c', topHi: '#b3cc5e', inner: '#3f4831', mark: '#2d3422' },
    throne: { top: '#ebc95a', topHi: '#fff0a8', inner: '#5d4b88', mark: '#4a3b70' },
    lair: { top: '#8a45a0', topHi: '#c27ad8', inner: '#2d1a38', mark: '#55306a' }
  };

  var KINDS = ['wood', 'stone', 'time', 'soul'];
  var KIND_HUD_X = { wood: 36, stone: 206, time: 376, soul: 546 };
  var KIND_USE = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var CLS = ['sword', 'hunter', 'bomber'];
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var ROLE_NAME = { shortcut: '捷徑', treasure: '寶區', nest: '巢穴' };
  var ROLE_COL = { shortcut: PAL.shortcut, treasure: PAL.treasure, nest: PAL.nestRole };
  var SITE_KIND_NAME = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道', nestgate: '巢穴門' };
  var ITEMS = ['bagWood', 'bagStone', 'bagTime', 'soulLamp', 'glove', 'horn', 'heart'];
  var ITEM_NAME = { bagWood: '木材袋', bagStone: '石料袋', bagTime: '時晶袋', soulLamp: '魂燈', glove: '拾荒手套', horn: '獵人號角', heart: '巢母之心' };
  var ITEM_FX = {
    bagWood: '每次通關 +4 木材', bagStone: '每次通關 +3 石料', bagTime: '每次通關 +2 時晶', soulLamp: '每次通關 +2 獸魂',
    glove: '撿到的素材 +1', horn: '打倒怪物掉落 ×2', heart: '打倒怪物掉落 ×2、通關 +4 獸魂'
  };

  // ---------- 共用小工具 ----------
  function num(v, d) { v = Number(v); return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function oneOf(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function obj(v) { return (v && typeof v === 'object') ? v : {}; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, d) { return (typeof v === 'string') ? v : (typeof v === 'number' && isFinite(v) ? String(v) : d); }
  function face(v) { return v === -1 ? -1 : 1; }
  function nowS() {
    try { return ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000; } catch (e) { return 0; }
  }
  function fmt1(v) { return (Math.round(num(v, 0) * 10) / 10).toFixed(1); }
  function intStr(v) { return String(Math.max(0, Math.round(num(v, 0)))); }
  function mats(v) { var o = obj(v); return { wood: num(o.wood, 0), stone: num(o.stone, 0), time: num(o.time, 0), soul: num(o.soul, 0) }; }

  // 目前變換相對邏輯畫布的縮放(扣掉底圖倍率); abs = 畫面 px / 單位
  function scaleOf(ctx) {
    var a = 1;
    try { if (ctx.getTransform) { var m = ctx.getTransform(); if (m && isFinite(m.a)) a = Math.hypot(m.a || 0, m.b || 0) || 1; } } catch (e) { a = 1; }
    var base = 1;
    try { if (ctx.canvas && ctx.canvas.width > 0) base = ctx.canvas.width / W; } catch (e) { base = 1; }
    if (!isFinite(base) || base <= 0) base = 1;
    if (!isFinite(a) || a <= 0) a = 1;
    return { rel: a / base, abs: a };
  }

  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold, outline) {
    ctx.font = font(px, bold);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = 'rgba(8,10,18,0.92)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col;
    ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }

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
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU); }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function star(ctx, x, y, r, n) {
    n = n || 5; ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr2 = (i % 2) ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath();
  }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  // ---------- 素材圖示(地上、資訊列、飛行、面板共用同一個樣子) ----------
  function matIcon(ctx, kind, cx, cy, sz) {
    var k = num(sz, 20) / 20;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1420';
    if (kind === 'wood') {
      rr(ctx, -9, -5, 15, 10, 3); ctx.fillStyle = PAL.wood; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -1.6); ctx.lineTo(1, -1.6); ctx.moveTo(-4, 2); ctx.lineTo(2, 2);
      ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 1; ctx.stroke();
      ell(ctx, 5.5, 0, 3.6, 5); ctx.fillStyle = PAL.woodLight; ctx.fill(); ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.6; ctx.stroke();
      ell(ctx, 5.5, 0, 1.4, 2.2); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'stone') {
      poly(ctx, [-8, 3, -5, -6, 4, -8, 9, -2, 7, 6, -3, 8]); ctx.fillStyle = PAL.stone; ctx.fill(); ctx.stroke();
      poly(ctx, [-5, -6, 4, -8, 9, -2, 1, -1]); ctx.fillStyle = PAL.stoneLight; ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -1); ctx.lineTo(-3, 8); ctx.strokeStyle = PAL.stoneDark; ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'time') {
      poly(ctx, [0, -9.5, 7, -2, 0, 9.5, -7, -2]); ctx.fillStyle = PAL.time; ctx.fill(); ctx.stroke();
      poly(ctx, [0, -9.5, 3, -2, 0, 9.5, -3, -2]); ctx.fillStyle = PAL.timeLight; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.strokeStyle = PAL.timeDark; ctx.lineWidth = 1; ctx.stroke();
    } else { // soul
      ctx.beginPath(); ctx.moveTo(0, -9.5);
      ctx.bezierCurveTo(4, -4, 8, -1, 7, 4); ctx.bezierCurveTo(6, 8.5, -6, 8.5, -7, 4); ctx.bezierCurveTo(-8, -1, -3, -3, 0, -9.5); ctx.closePath();
      ctx.fillStyle = PAL.soul; ctx.fill(); ctx.stroke();
      ell(ctx, 0, 3.5, 3.6, 3.2); ctx.fillStyle = PAL.soulLight; ctx.fill();
      circle(ctx, -1.6, 3, 0.9); ctx.fillStyle = '#3a0f34'; ctx.fill(); circle(ctx, 1.6, 3, 0.9); ctx.fill();
    }
    ctx.restore();
  }

  // 職業小圖示(圓章 + 武器記號)
  function clsIcon(ctx, cls, cx, cy, sz) {
    cls = oneOf(cls, CLS, 'sword');
    var k = num(sz, 20) / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    circle(ctx, 0, 0, 9.2); ctx.fillStyle = PAL[cls]; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (cls === 'sword') {
      ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(4.5, -4.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, 1); ctx.lineTo(-1, 5); ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(-2, 0, 5.5, -1.2, 1.2); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0.1, -5.1); ctx.lineTo(0.1, 5.1); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(5, 0); ctx.stroke();
    } else {
      circle(ctx, -0.5, 1.5, 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(4, -5); ctx.lineWidth = 1.4; ctx.stroke();
      circle(ctx, 4.6, -5.6, 1.2); ctx.fillStyle = PAL.goal; ctx.fill();
    }
    ctx.restore();
  }

  function lockIcon(ctx, cx, cy, sz, col) {
    var k = sz / 24;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, 0); ctx.lineTo(6, 1); ctx.moveTo(-6, 1); ctx.lineTo(-6, -3); ctx.stroke();
    rr(ctx, -9, 0, 18, 13, 2.5); ctx.fillStyle = col; ctx.fill();
    circle(ctx, 0, 5.5, 2); ctx.fillStyle = '#141a22'; ctx.fill();
    ctx.restore();
  }

  function keycap(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.6, tw(ctx, label, px, true) + px * 0.9), h = px * 1.55;
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4);
    ctx.fillStyle = hot ? PAL.select : '#e9edf3'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#11151d'; ctx.stroke();
    text(ctx, label, cx, cy + 0.5, px, '#11151d', 'center', true);
    return w;
  }
  // 「Z 重來  X 回大地圖」一列, 置中
  function keyHints(ctx, items, cx, cy, px) {
    var gap = px * 1.4, parts = [], total = 0, i;
    for (i = 0; i < items.length; i++) {
      var kw = Math.max(px * 1.6, tw(ctx, items[i][0], px, true) + px * 0.9);
      var lw = tw(ctx, items[i][1], px, false);
      parts.push([kw, lw]); total += kw + 6 + lw + (i ? gap : 0);
    }
    var x = cx - total / 2;
    for (i = 0; i < items.length; i++) {
      if (i) x += gap;
      keycap(ctx, items[i][0], x + parts[i][0] / 2, cy, px, false);
      x += parts[i][0] + 6;
      text(ctx, items[i][1], x, cy, px, PAL.text, 'left', false);
      x += parts[i][1];
    }
  }
  function badge(ctx, s, x, y, px, bg, fg, align) {
    var w = tw(ctx, s, px, true) + px, h = px * 1.6;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    rr(ctx, lx, y - h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
    text(ctx, s, lx + w / 2, y + 0.5, px, fg, 'center', true);
    return w;
  }
  // 花費列: 只畫 > 0 的種類, 逐項比 stock, 不足變紅; 沒給 stock 時退回 canAfford 布林
  function costRow(ctx, cost, stock, canAfford, x, y, px, align) {
    var c = mats(cost), hasStock = stock && typeof stock === 'object', s = mats(stock);
    var items = [];
    for (var i = 0; i < KINDS.length; i++) {
      var k = KINDS[i];
      if (c[k] > 0) {
        var short = hasStock ? (s[k] < c[k]) : (canAfford === false);
        items.push([k, intStr(c[k]), short]);
      }
    }
    var isz = px * 1.15, gap = px * 0.7, total = 0, ws = [];
    for (i = 0; i < items.length; i++) { var w = isz + 3 + tw(ctx, items[i][1], px, true); ws.push(w); total += w + (i ? gap : 0); }
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (i = 0; i < items.length; i++) {
      if (i) cx += gap;
      matIcon(ctx, items[i][0], cx + isz / 2, y, isz);
      text(ctx, items[i][1], cx + isz + 3, y, px, items[i][2] ? PAL.short : PAL.text, 'left', true);
      cx += ws[i];
    }
    return total;
  }

  // 文字特效在被縮小時反向放大(縮圖 / 說明頁)
  function textBoost(ctx) { var s = scaleOf(ctx).rel; return s < 0.6 ? Math.min(0.6 / s, 4) : 1; }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PAL.bg); g.addColorStop(1, PAL.bgLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (scaleOf(ctx).rel >= SIL) {
      ctx.fillStyle = PAL.bgHill;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 470 + Math.sin(x * 0.006) * 60 + Math.sin(x * 0.017) * 22);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (var i = 0; i < 40; i++) { circle(ctx, hash(i, 1) * W, 40 + hash(i, 2) * 320, 1 + hash(i, 3)); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.fillStyle = PAL.mapBg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = PAL.mapLine; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (var y = 0; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,170,160,0.10)'; ctx.lineWidth = 2;
    for (var i = 0; i < 6; i++) {
      ctx.beginPath();
      for (var xx = 0; xx <= W; xx += 40) { var yy = 120 + i * 100 + Math.sin(xx * 0.008 + i) * 26; if (xx === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 地形 ----------
  function drawGround(ctx, st) {
    st = obj(st);
    var key = oneOf(st.theme, Object.keys(THEMES), 'plain');
    var x = num(st.x, 0), y = num(st.y, 0), th = THEMES[key], top = st.top === true;
    var L = x - 20, T = y - 20, detail = scaleOf(ctx).rel >= SIL;
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
    ctx.fillStyle = th.inner; ctx.fillRect(L, T, 40, 40);
    if (detail) {
      ctx.fillStyle = th.mark; ctx.strokeStyle = th.mark; ctx.lineWidth = 2;
      if (key === 'sky') {
        ctx.beginPath(); ctx.moveTo(L, T + 26); ctx.lineTo(L + 40, T + 26); ctx.moveTo(L + 14, T + 26); ctx.lineTo(L + 14, T + 40); ctx.moveTo(L + 30, T + 12); ctx.lineTo(L + 30, T + 26); ctx.stroke();
      } else if (key === 'rock') {
        ctx.beginPath(); ctx.moveTo(L + 2, T + 22); ctx.lineTo(L + 38, T + 14); ctx.moveTo(L + 2, T + 36); ctx.lineTo(L + 38, T + 28); ctx.stroke();
      } else if (key === 'swamp') {
        circle(ctx, L + 10, T + 30, 3.5); ctx.stroke(); circle(ctx, L + 28, T + 22, 2.5); ctx.stroke(); circle(ctx, L + 24, T + 35, 2); ctx.stroke();
      } else if (key === 'throne') {
        ctx.strokeRect(L + 3, T + 3, 34, 34);
        poly(ctx, [L + 20, T + 16, L + 25, T + 22, L + 20, T + 28, L + 15, T + 22]); ctx.fillStyle = 'rgba(235,201,90,0.55)'; ctx.fill();
      } else if (key === 'lair') {
        ctx.strokeStyle = 'rgba(194,100,255,0.45)'; ctx.beginPath(); ctx.moveTo(L + 4, T + 36); ctx.quadraticCurveTo(L + 16, T + 18, L + 36, T + 24); ctx.stroke();
      } else {
        circle(ctx, L + 9, T + 28, 2.5); ctx.fill(); circle(ctx, L + 27, T + 20, 2); ctx.fill(); circle(ctx, L + 31, T + 34, 3); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 0.5, 39, 39);
    }
    if (top) {
      ctx.fillStyle = th.top; ctx.fillRect(L, T, 40, 10);
      if (detail) {
        ctx.fillStyle = th.topHi; ctx.fillRect(L, T, 40, 2.5);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(L, T + 10, 40, 1.5);
        if (key === 'plain' || key === 'swamp') {
          ctx.fillStyle = th.top;
          for (var i = 0; i < 4; i++) { poly(ctx, [L + 3 + i * 10, T + 10, L + 7 + i * 10, T + 10, L + 5 + i * 10, T + 14]); ctx.fill(); }
        } else if (key === 'lair') {
          ctx.fillStyle = th.top; ell(ctx, L + 12, T + 11, 3, 3.5); ctx.fill(); ell(ctx, L + 30, T + 10, 2, 4); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawLairBack(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 40), 0, 1280), h = clamp(num(st.h, 40), 0, 720);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = PAL.lair; ctx.fillRect(x, y, w, h);
    if (scaleOf(ctx).rel >= SIL) {
      var g = ctx.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(110,40,140,0.35)'); g.addColorStop(1, 'rgba(8,2,12,0.55)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(15,6,20,0.7)';
      var n = Math.min(40, Math.ceil(w / 40));
      for (var i = 0; i < n; i++) { ell(ctx, x + 20 + i * 40, y, 22, 10 + hash(i, 7) * 10); ctx.fill(); ell(ctx, x + 20 + i * 40, y + h, 22, 6 + hash(i, 9) * 6); ctx.fill(); }
      ctx.strokeStyle = 'rgba(194,100,255,0.18)'; ctx.lineWidth = 2;
      for (i = 0; i < n; i += 2) { ctx.beginPath(); ctx.moveTo(x + i * 40 + 6, y + h * 0.3); ctx.quadraticCurveTo(x + i * 40 + 30, y + h * 0.55, x + i * 40 + 60, y + h * 0.4); ctx.stroke(); }
    } else {
      ctx.fillStyle = 'rgba(8,2,12,0.35)'; ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    if (scaleOf(ctx).rel < SIL) {
      poly(ctx, [x - 20, y + 20, x - 13, y, x - 7, y + 20, x, y, x + 7, y + 20, x + 13, y, x + 20, y + 20]); ctx.fillStyle = PAL.spikeTip; ctx.fill();
      ctx.restore(); return;
    }
    ctx.fillStyle = '#3b3f4a'; ctx.fillRect(x - 20, y + 15, 40, 5);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1c22';
    for (var i = 0; i < 3; i++) {
      var cx = x - 13.3 + i * 13.3;
      poly(ctx, [cx - 6.5, y + 16, cx, y + 1, cx + 6.5, y + 16]); ctx.fillStyle = PAL.spike; ctx.fill(); ctx.stroke();
      poly(ctx, [cx - 2.6, y + 7, cx, y + 1, cx + 2.6, y + 7]); ctx.fillStyle = PAL.spikeTip; ctx.fill();
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), hp = clamp(Math.round(num(st.hp, 3)), 1, 3);
    var L = x - 20, T = y - 20;
    ctx.save();
    ctx.fillStyle = PAL.crack; ctx.fillRect(L, T, 40, 40);
    if (scaleOf(ctx).rel < SIL) {
      ctx.strokeStyle = PAL.crackLine; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(L + 8, T + 6); ctx.lineTo(L + 22, T + 22); ctx.lineTo(L + 32, T + 36); ctx.stroke();
      ctx.restore(); return;
    }
    // 平板磚面(打得破的牆): 暖色, 橫向磚縫
    ctx.fillStyle = '#d7ab82'; ctx.fillRect(L, T, 40, 3);
    ctx.strokeStyle = 'rgba(90,58,34,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(L, T + 14); ctx.lineTo(L + 40, T + 14); ctx.moveTo(L, T + 27); ctx.lineTo(L + 40, T + 27);
    ctx.moveTo(L + 20, T); ctx.lineTo(L + 20, T + 14); ctx.moveTo(L + 10, T + 14); ctx.lineTo(L + 10, T + 27); ctx.moveTo(L + 30, T + 14); ctx.lineTo(L + 30, T + 27); ctx.moveTo(L + 20, T + 27); ctx.lineTo(L + 20, T + 40); ctx.stroke();
    // 裂痕: hp 越低越多
    ctx.strokeStyle = PAL.crackLine; ctx.lineWidth = 2.4; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(L + 18, T + 2); ctx.lineTo(L + 22, T + 12); ctx.lineTo(L + 17, T + 20); ctx.lineTo(L + 23, T + 30); ctx.stroke();
    if (hp <= 2) {
      ctx.beginPath(); ctx.moveTo(L + 22, T + 12); ctx.lineTo(L + 33, T + 9); ctx.moveTo(L + 17, T + 20); ctx.lineTo(L + 6, T + 25); ctx.lineTo(L + 3, T + 34); ctx.moveTo(L + 23, T + 30); ctx.lineTo(L + 31, T + 38); ctx.stroke();
    }
    if (hp <= 1) {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(L + 33, T + 9); ctx.lineTo(L + 38, T + 20); ctx.moveTo(L + 6, T + 25); ctx.lineTo(L + 2, T + 14); ctx.moveTo(L + 23, T + 30); ctx.lineTo(L + 12, T + 38); ctx.stroke();
      ctx.fillStyle = 'rgba(26,20,30,0.85)';
      poly(ctx, [L, T, L + 8, T, L, T + 7]); ctx.fill();
      poly(ctx, [L + 40, T + 40, L + 31, T + 40, L + 40, T + 31]); ctx.fill();
    }
    ctx.restore();
  }

  function rubbleCell(ctx, L, T, simple) {
    ctx.fillStyle = '#2b313b'; ctx.fillRect(L, T, 40, 40);
    if (simple) { ctx.fillStyle = PAL.rubble; ctx.fillRect(L + 2, T + 2, 36, 36); return; }
    var rocks = [[10, 10, 9], [29, 9, 9], [20, 22, 10], [8, 31, 8], [31, 31, 9]];
    for (var i = 0; i < rocks.length; i++) {
      var r = rocks[i];
      circle(ctx, L + r[0], T + r[1], r[2]); ctx.fillStyle = PAL.rubble; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
      ctx.beginPath(); ctx.arc(L + r[0], T + r[1], r[2] - 3, Math.PI * 1.1, Math.PI * 1.6); ctx.strokeStyle = PAL.rubbleLight; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  function drawWorksite(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, ['bridge', 'stairs', 'rubble'], 'rubble');
    var rep = st.repaired === true, th = THEMES[oneOf(st.theme, Object.keys(THEMES), 'plain')];
    var L = x - 20, T = y - 20, simple = scaleOf(ctx).rel < SIL;
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
    if (kind === 'rubble') {
      if (!rep) rubbleCell(ctx, L, T, simple);
    } else if (kind === 'bridge') {
      if (rep) {
        ctx.fillStyle = PAL.plank; ctx.fillRect(L, T, 40, 40);
        if (!simple) {
          ctx.strokeStyle = PAL.plankDark; ctx.lineWidth = 2;
          ctx.beginPath(); for (var i = 1; i < 4; i++) { ctx.moveTo(L, T + i * 10); ctx.lineTo(L + 40, T + i * 10); } ctx.stroke();
          ctx.strokeRect(L + 1, T + 1, 38, 38);
          ctx.fillStyle = '#3a2a1a'; for (i = 0; i < 4; i++) { circle(ctx, L + 6, T + 5 + i * 10, 1.4); ctx.fill(); circle(ctx, L + 34, T + 5 + i * 10, 1.4); ctx.fill(); }
          ctx.fillStyle = '#f0c27a'; ctx.fillRect(L, T, 40, 2.5);
        }
      } else if (st.end === true) {
        // 殘樁: 斷掉的木樁 + 斷板
        ctx.fillStyle = PAL.plankDark;
        poly(ctx, [L + 14, T + 40, L + 14, T + 6, L + 18, T + 2, L + 21, T + 8, L + 26, T + 3, L + 26, T + 40]); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a1a0c'; ctx.stroke();
        ctx.fillStyle = PAL.plank; poly(ctx, [L + 4, T + 2, L + 36, T + 2, L + 33, T + 8, L + 30, T + 5, L + 26, T + 10, L + 4, T + 10]); ctx.fill(); ctx.stroke();
      } else if (!simple) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(213,156,87,0.28)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(L + 1.5, T + 1.5, 37, 9); ctx.setLineDash([]);
      }
    } else { // stairs
      if (rep) {
        ctx.fillStyle = PAL.stair; ctx.fillRect(L, T, 40, 40);
        if (!simple) {
          ctx.strokeStyle = '#857a66'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(L, T + 20); ctx.lineTo(L + 40, T + 20); ctx.moveTo(L + 20, T); ctx.lineTo(L + 20, T + 20); ctx.moveTo(L + 10, T + 20); ctx.lineTo(L + 10, T + 40); ctx.moveTo(L + 30, T + 20); ctx.lineTo(L + 30, T + 40); ctx.stroke();
          ctx.strokeRect(L + 0.75, T + 0.75, 38.5, 38.5);
          ctx.fillStyle = th.top; ctx.fillRect(L, T, 40, 4);
          ctx.fillStyle = '#ffffff'; ctx.globalAlpha *= 0.5; ctx.fillRect(L, T, 40, 1.5);
        }
      } else if (st.bottom === true) {
        // 地上一堆碎石(不是實心)
        var bits = [[8, 35, 5], [17, 33, 6], [27, 35, 5], [34, 36, 4], [22, 27, 4], [12, 28, 3.5]];
        for (var j = 0; j < bits.length; j++) {
          var b = bits[j];
          poly(ctx, [L + b[0] - b[2], T + b[1] + b[2] * 0.6, L + b[0] - b[2] * 0.4, T + b[1] - b[2], L + b[0] + b[2], T + b[1] - b[2] * 0.3, L + b[0] + b[2] * 0.7, T + b[1] + b[2] * 0.7]);
          ctx.fillStyle = j % 2 ? '#a69c8a' : PAL.stair; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a342a'; ctx.stroke();
        }
      } else if (!simple) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(203,193,174,0.25)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(L + 1.5, T + 1.5, 37, 37); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  function drawNestGate(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), open = st.open === true, simple = scaleOf(ctx).rel < SIL;
    var L = x - 40, T = y - 60;
    ctx.save();
    ctx.fillStyle = '#4a4458'; ctx.strokeStyle = '#15121c'; ctx.lineWidth = 2;
    // 門框: 左右柱 + 門楣
    ctx.fillRect(L, T, 12, 120); ctx.fillRect(L + 68, T, 12, 120); ctx.fillRect(L, T, 80, 16);
    if (!simple) { ctx.strokeRect(L + 1, T + 1, 10, 118); ctx.strokeRect(L + 69, T + 1, 10, 118); ctx.strokeRect(L + 1, T + 1, 78, 14); }
    // 門楣上的魔物紋章(巢穴記號)
    circle(ctx, x, T + 8, 5); ctx.fillStyle = PAL.brood; ctx.fill();
    if (!open) {
      ctx.fillStyle = '#5d5670'; ctx.fillRect(L + 12, T + 16, 56, 104);
      if (!simple) {
        ctx.strokeStyle = '#2a2436'; ctx.lineWidth = 2; ctx.strokeRect(L + 13, T + 17, 54, 102);
        ctx.beginPath(); ctx.moveTo(x, T + 17); ctx.lineTo(x, T + 119); ctx.stroke();
        // 爪痕(發光紫)
        ctx.strokeStyle = PAL.brood; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.shadowColor = PAL.brood; ctx.shadowBlur = 8;
        for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L + 22 + i * 12, T + 40); ctx.lineTo(L + 30 + i * 12, T + 86); ctx.stroke(); }
        ctx.shadowBlur = 0;
        // 封印鎖環
        ctx.strokeStyle = '#cfc8dc'; ctx.lineWidth = 3; circle(ctx, x, T + 100, 7); ctx.stroke();
      } else {
        ctx.fillStyle = PAL.brood; ctx.fillRect(L + 26, T + 44, 28, 36);
      }
    } else {
      // 打開: 只剩門框, 門板碎塊倒在柱腳
      ctx.fillStyle = 'rgba(194,100,255,0.18)'; ctx.fillRect(L + 12, T + 16, 56, 104);
      if (!simple) {
        ctx.fillStyle = '#5d5670';
        poly(ctx, [L + 12, T + 120, L + 12, T + 108, L + 20, T + 112, L + 22, T + 120]); ctx.fill();
        poly(ctx, [L + 68, T + 120, L + 68, T + 106, L + 60, T + 114, L + 58, T + 120]); ctx.fill();
      }
    }
    ctx.restore();
  }

  // 工程牌圖形(遊戲內 + 面板共用)
  function signShape(ctx, role, cx, bottomY, k, dim) {
    ctx.save(); ctx.translate(cx, bottomY); ctx.scale(k, k);
    ctx.fillStyle = '#7a5530'; ctx.fillRect(-2.5, -22, 5, 22);
    rr(ctx, -17, -47, 34, 28, 3); ctx.fillStyle = dim ? '#5a5a5a' : '#ffcf2e'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
    // 黃黑施工斜紋邊
    ctx.save(); rr(ctx, -17, -47, 34, 28, 3); ctx.clip();
    ctx.fillStyle = dim ? '#333' : '#1a1408';
    for (var i = -3; i < 6; i++) { poly(ctx, [-17 + i * 8, -47, -13 + i * 8, -47, -21 + i * 8, -19, -25 + i * 8, -19]); ctx.fill(); }
    ctx.restore();
    rr(ctx, -13, -43, 26, 20, 2); ctx.fillStyle = '#20242e'; ctx.fill();
    var col = dim ? '#8a8a8a' : ROLE_COL[role];
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (role === 'shortcut') {
      ctx.beginPath(); ctx.moveTo(-9, -39); ctx.lineTo(-3, -33); ctx.lineTo(-9, -27); ctx.moveTo(-1, -39); ctx.lineTo(5, -33); ctx.lineTo(-1, -27); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -33); ctx.lineTo(9, -33); ctx.stroke();
    } else if (role === 'treasure') {
      rr(ctx, -8, -35, 16, 9, 1.5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, -35); ctx.quadraticCurveTo(0, -42, 8, -35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#20242e'; ctx.fillRect(-1.5, -35, 3, 4);
    } else {
      ell(ctx, 0, -29.5, 4.5, 3.5); ctx.fill();
      circle(ctx, -6, -35, 2); ctx.fill(); circle(ctx, -2, -38.5, 2); ctx.fill(); circle(ctx, 2.5, -38.5, 2); ctx.fill(); circle(ctx, 6.5, -35, 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSiteSign(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), role = oneOf(st.role, ['shortcut', 'treasure', 'nest'], 'shortcut');
    ctx.save(); signShape(ctx, role, x, y + 24, 1, false); ctx.restore();
  }

  function drawFog(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 80), 0, 1280), h = clamp(num(st.h, 80), 0, 720);
    var a = clamp(num(st.alpha, 1), 0, 1), t = num(st.t, 0);
    if (a <= 0 || w <= 0 || h <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = PAL.fog; ctx.fillRect(x, y, w, h);
    // 霧團以世界格(80px)定位, 相鄰矩形接起來沒有接縫
    var g0 = Math.floor(x / 80) - 1, g1 = Math.ceil((x + w) / 80) + 1, r0 = Math.floor(y / 80) - 1, r1 = Math.ceil((y + h) / 80) + 1;
    for (var gx = g0; gx <= g1; gx++) {
      for (var gy = r0; gy <= r1; gy++) {
        var hv = hash(gx, gy);
        var cx = gx * 80 + 40 + Math.sin(t * 0.35 + hv * 6.28) * 16, cy = gy * 80 + 40 + Math.cos(t * 0.28 + hv * 5) * 10;
        ell(ctx, cx, cy, 44 + hv * 14, 26 + hv * 8); ctx.fillStyle = (gx + gy) % 2 ? 'rgba(201,205,214,0.55)' : 'rgba(128,134,148,0.35)'; ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHookRing(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x, y - 32); ctx.stroke();
    circle(ctx, x, y, 8); ctx.lineWidth = 5; ctx.strokeStyle = '#1a1420'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffd35a'; ctx.stroke();
    ctx.restore();
  }

  function drawNest(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), s = oneOf(st.state, ['dormant', 'idle', 'spent'], 'dormant');
    var dur = Math.max(0.01, num(st.spawnDur, 0.4)), sp = clamp(num(st.spawnT, dur), 0, dur), spawning = sp < dur;
    var left = clamp(Math.round(num(st.left, 0)), 0, 5), simple = scaleOf(ctx).rel < SIL;
    var B = y + 24;
    ctx.save();
    var body = s === 'dormant' ? '#3d2a46' : (s === 'spent' ? '#2e2833' : PAL.nest);
    ctx.beginPath(); ctx.moveTo(x - 31, B - 1); ctx.quadraticCurveTo(x - 28, y - 16, x, y - 16); ctx.quadraticCurveTo(x + 28, y - 16, x + 31, B - 1); ctx.closePath();
    ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#140a18'; ctx.stroke();
    if (s === 'dormant') {
      ctx.beginPath(); ctx.moveTo(x - 10, y + 6); ctx.quadraticCurveTo(x, y + 10, x + 10, y + 6); ctx.strokeStyle = '#140a18'; ctx.lineWidth = 2.5; ctx.stroke();
      if (!simple) { // 沉睡 z(路徑)
        ctx.strokeStyle = '#8f7aa0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x + 13, y - 22); ctx.lineTo(x + 20, y - 22); ctx.lineTo(x + 13, y - 15); ctx.lineTo(x + 20, y - 15); ctx.stroke();
      }
    } else {
      var ry = spawning ? 11 : 8;
      if (s === 'idle') {
        var pulse = 0.5 + 0.5 * Math.sin(nowS() * 3);
        ell(ctx, x, y + 6, 14 + pulse * 2, ry + 4 + pulse * 2); ctx.fillStyle = 'rgba(194,100,255,' + (0.25 + pulse * 0.25).toFixed(3) + ')'; ctx.fill();
      }
      ell(ctx, x, y + 6, 10, ry); ctx.fillStyle = s === 'spent' ? '#16121a' : '#0c0410'; ctx.fill();
      if (s === 'idle') { ell(ctx, x, y + 6, 10, ry); ctx.strokeStyle = PAL.brood; ctx.lineWidth = 2; ctx.stroke(); }
      if (spawning) {
        var p = sp / dur;
        ctx.fillStyle = 'rgba(194,120,255,' + (0.7 * (1 - p)).toFixed(3) + ')';
        circle(ctx, x, y - 14 - p * 14, 8 + p * 4); ctx.fill();
        circle(ctx, x - 9, y - 8 - p * 10, 6 + p * 3); ctx.fill();
        circle(ctx, x + 9, y - 8 - p * 10, 6 + p * 3); ctx.fill();
      }
    }
    // 剩幾隻: 5 個小點
    if (!simple) {
      for (var i = 0; i < 5; i++) {
        circle(ctx, x - 12 + i * 6, y + 19, 2.2);
        if (i < left) { ctx.fillStyle = PAL.brood; ctx.fill(); } else { ctx.lineWidth = 1; ctx.strokeStyle = '#7a6a86'; ctx.stroke(); }
      }
    }
    ctx.restore();
  }

  function drawPickup(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, ['wood', 'stone', 'time', 'soul'], 'wood'), t = num(st.t, 0);
    ctx.save();
    if (scaleOf(ctx).rel < SIL) { matIcon(ctx, kind, x, y, 22); ctx.restore(); return; }
    var bob = Math.sin(t * 3 + x * 0.05) * 1.8;
    matIcon(ctx, kind, x, y + bob, 19);
    var sp = (Math.sin(t * 4 + x) + 1) / 2;
    if (sp > 0.75) { star(ctx, x + 8, y - 8, 2.8, 4); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill(); }
    ctx.restore();
  }

  function drawChest(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), open = st.open === true;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = '#2a1608';
    if (!open) {
      rr(ctx, x - 17, y - 2, 34, 19, 3); ctx.fillStyle = PAL.chest; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 17, y - 2); ctx.quadraticCurveTo(x - 17, y - 14, x, y - 14); ctx.quadraticCurveTo(x + 17, y - 14, x + 17, y - 2); ctx.closePath();
      ctx.fillStyle = PAL.chestLid; ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.gold; ctx.fillRect(x - 11, y - 12, 4, 29); ctx.fillRect(x + 7, y - 12, 4, 29);
      rr(ctx, x - 4, y - 5, 8, 8, 1.5); ctx.fillStyle = PAL.gold; ctx.fill(); ctx.stroke();
      if (scaleOf(ctx).rel >= SIL) {
        var tw2 = 0.6 + 0.4 * Math.sin(nowS() * 5);
        star(ctx, x + 14, y - 13, 3.5 * tw2 + 1, 4); ctx.fillStyle = '#fff6c0'; ctx.fill();
      }
    } else {
      rr(ctx, x - 16, y - 17, 32, 13, 2.5); ctx.fillStyle = '#4a3a2e'; ctx.fill(); ctx.stroke();
      rr(ctx, x - 17, y - 2, 34, 19, 3); ctx.fillStyle = '#6e5a48'; ctx.fill(); ctx.stroke();
      ell(ctx, x, y - 2, 15, 3.5); ctx.fillStyle = '#1c140e'; ctx.fill();
      ctx.fillStyle = '#8c7a5a'; ctx.fillRect(x - 11, y, 4, 17); ctx.fillRect(x + 7, y, 4, 17);
    }
    ctx.restore();
  }

  function drawGoal(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), reached = st.reached === true;
    ctx.save();
    rr(ctx, x - 18, y + 34, 14, 6, 2); ctx.fillStyle = '#555c6a'; ctx.fill();
    ctx.fillStyle = '#e6e9ef'; ctx.fillRect(x - 13, y - 36, 4, 72);
    circle(ctx, x - 11, y - 37, 2.5); ctx.fillStyle = PAL.gold; ctx.fill();
    var wv = scaleOf(ctx).rel >= SIL ? Math.sin(nowS() * 4) * 2 : 0;
    ctx.beginPath(); ctx.moveTo(x - 9, y - 35); ctx.quadraticCurveTo(x + 4, y - 37 + wv, x + 18, y - 31);
    ctx.quadraticCurveTo(x + 4, y - 25 - wv, x - 9, y - 15); ctx.closePath();
    ctx.fillStyle = reached ? PAL.goalReached : PAL.goal; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
    if (reached) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 27); ctx.lineTo(x + 1, y - 23); ctx.lineTo(x + 8, y - 31); ctx.stroke();
    } else {
      star(ctx, x + 1, y - 26, 5); ctx.fillStyle = '#e5484d'; ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 玩家 ----------
  var POSES = ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'shoot', 'hook', 'throw', 'wave', 'hurt'];
  function drawPlayer(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), cls = oneOf(st.cls, CLS, 'sword'), f = face(st.facing);
    var pose = oneOf(st.pose, POSES, 'idle'), pt = clamp(num(st.poseT, 0), 0, 1e6);
    var col = PAL[cls], sc = scaleOf(ctx);
    ctx.save();
    ctx.translate(x, y);
    if (st.invuln === true && Math.floor(nowS() * 12) % 2 === 0) ctx.globalAlpha *= 0.3;
    if (sc.rel < SIL) {
      var lw = 1.6 / sc.abs;
      rr(ctx, -14 + lw / 2, -22 + lw / 2, 28 - lw, 44 - lw, 7); ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore(); return;
    }
    // 衝刺斬速度線(框外反方向 ≤ 60)
    if (pose === 'dash') {
      ctx.strokeStyle = 'rgba(200,230,255,0.85)'; ctx.lineCap = 'round';
      var ls = [[-12, 54], [-2, 60], [8, 46], [16, 34]];
      for (var i = 0; i < ls.length; i++) { ctx.lineWidth = 3 - i * 0.4; ctx.beginPath(); ctx.moveTo(-f * 16.5, ls[i][0]); ctx.lineTo(-f * (12 + ls[i][1]), ls[i][0]); ctx.stroke(); }
    }
    // 揮砍刀光(面向側框外 50x40)
    if (pose === 'slash' && pt < 0.15) {
      var sp = pt / 0.15;
      ctx.save();
      ctx.globalAlpha *= 1 - sp * 0.6;
      ctx.beginPath(); ctx.ellipse(f * 14, 0, 46, 17, 0, -Math.PI / 2, Math.PI / 2, f < 0);
      ctx.ellipse(f * 14, 0, 30, 9, 0, Math.PI / 2, -Math.PI / 2, f > 0);
      ctx.closePath(); ctx.fillStyle = 'rgba(220,240,255,0.9)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(120,190,255,0.95)'; ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    if (pose === 'dash') { ctx.rotate(f * 0.2); ctx.scale(0.88, 0.88); }
    if (pose === 'hurt') { ctx.rotate(-f * 0.16); ctx.scale(0.88, 0.88); }
    var crouch = pose === 'wave' ? 3 : 0;
    // 腿
    ctx.fillStyle = '#2b3245';
    var ph = pose === 'run' ? Math.sin(pt * 18) : 0;
    if (pose === 'rise') { rr(ctx, -7, 11, 6, 8, 2); ctx.fill(); rr(ctx, 1, 9, 6, 8, 2); ctx.fill(); }
    else if (pose === 'fall') { rr(ctx, -9, 12, 6, 10, 2); ctx.fill(); rr(ctx, 3, 12, 6, 10, 2); ctx.fill(); }
    else if (pose === 'dash') { rr(ctx, -f * 9 - 3, 10, 6, 10, 2); ctx.fill(); rr(ctx, f * 2 - 3, 12, 6, 10, 2); ctx.fill(); }
    else { rr(ctx, -7 + ph * 3, 12, 6, 10, 2); ctx.fill(); rr(ctx, 1 - ph * 3, 12, 6, 10, 2); ctx.fill(); }
    // 身體
    rr(ctx, -9, -6 + crouch, 18, 19 - crouch, 5);
    ctx.fillStyle = pose === 'hurt' ? '#ff6b6b' : col; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.outlineHero; ctx.stroke();
    // 頭
    circle(ctx, 0, -13 + crouch, 7.6); ctx.fillStyle = PAL.skin; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = PAL.outlineHero; ctx.stroke();
    var hy = -13 + crouch;
    // 帽 / 盔
    ctx.fillStyle = col; ctx.strokeStyle = PAL.outlineHero; ctx.lineWidth = 1.2;
    if (cls === 'sword') {
      ctx.beginPath(); ctx.arc(0, hy, 7.6, Math.PI, 0); ctx.lineTo(7.6, hy - 1); ctx.lineTo(-7.6, hy - 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd84a'; poly(ctx, [-f * 1, hy - 7.4, -f * 6, hy - 8.8, -f * 5, hy - 5]); ctx.fill();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(0, hy, 7.8, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(-f * 9, hy + 2); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, hy - 1, 7.4, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-7.5, hy - 3.5, 15, 3);
      circle(ctx, f * 3.5, hy - 2, 2.2); ctx.fillStyle = PAL.timeLight; ctx.fill();
    }
    // 眼(朝面向)
    if (pose === 'hurt') {
      ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(f * 2.5, hy - 0.5); ctx.lineTo(f * 5.5, hy + 2.5); ctx.moveTo(f * 5.5, hy - 0.5); ctx.lineTo(f * 2.5, hy + 2.5); ctx.stroke();
    } else { circle(ctx, f * 4, hy + 1, 1.5); ctx.fillStyle = '#1a1420'; ctx.fill(); }
    // 武器 / 手
    ctx.lineCap = 'round';
    if (cls === 'sword') {
      ctx.strokeStyle = '#e8eef6'; ctx.lineWidth = 3;
      ctx.beginPath();
      if (pose === 'slash' || pose === 'dash') { ctx.moveTo(f * 6, 1); ctx.lineTo(f * 14, 1); }
      else if (pose === 'hurt') { ctx.moveTo(-f * 6, 2); ctx.lineTo(-f * 12, 9); }
      else { ctx.moveTo(f * 7, 3); ctx.lineTo(f * 12, 13); }
      ctx.stroke();
      ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 3; ctx.beginPath();
      if (pose === 'slash' || pose === 'dash') { ctx.moveTo(f * 5, -2); ctx.lineTo(f * 5, 4); } else { ctx.moveTo(f * 4.5, 4); ctx.lineTo(f * 9, 1.5); }
      ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2.4;
      var pull = pose === 'shoot' ? 4 : 0;
      ctx.beginPath(); ctx.arc(f * 5, 1, 7.6, f > 0 ? -1.15 : Math.PI - 1.15, f > 0 ? 1.15 : Math.PI + 1.15, false); ctx.stroke();
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
      var bx = f * 5 + Math.cos(1.15) * 7.6 * f, by = Math.sin(1.15) * 7.6;
      ctx.beginPath(); ctx.moveTo(bx, 1 - by); ctx.lineTo(bx - f * pull, 1); ctx.lineTo(bx, 1 + by); ctx.stroke();
      if (pose === 'shoot') { ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx - f * pull, 1); ctx.lineTo(f * 13.5, 1); ctx.stroke(); }
      if (pose === 'hook') { ctx.strokeStyle = PAL.skin; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f * 4, -4); ctx.lineTo(f * 8, -14); ctx.stroke(); }
    } else {
      ctx.strokeStyle = PAL.skin; ctx.lineWidth = 3;
      if (pose === 'throw') { ctx.beginPath(); ctx.moveTo(f * 6, -2); ctx.lineTo(f * 12, -9); ctx.stroke(); }
      else if (pose === 'wave') { ctx.beginPath(); ctx.moveTo(-6, 2 + crouch); ctx.lineTo(-13, -1 + crouch); ctx.moveTo(6, 2 + crouch); ctx.lineTo(13, -1 + crouch); ctx.stroke(); }
      else { circle(ctx, f * 9, 5, 4); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke(); circle(ctx, f * 10.5, 0.5, 1.2); ctx.fillStyle = PAL.goal; ctx.fill(); }
    }
    ctx.restore();
    ctx.restore();
  }

  function drawRangeRing(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), r = clamp(num(st.radius, 260), 2, 2000);
    ctx.save();
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(31,191,154,0.45)';
    circle(ctx, x, y, r - 1); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------- 怪物 ----------
  // 共用外殼: 剪影 / 擊飛(傾斜 + 速度線) / 受擊閃
  // 判讀約定: 擊飛的飛行方向 = 面向的反方向(怪多半面向炸彈工), 速度線畫在面向那側框外 ≤ 36px
  function foe(ctx, st, w, h, col, detail) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), f = face(st.facing), hit = st.hit === true, brood = st.brood === true;
    var sc = scaleOf(ctx);
    ctx.save(); ctx.translate(x, y);
    if (sc.rel < SIL) {
      var lw = 1.8 / sc.abs;
      ell(ctx, 0, 0, w / 2 - lw / 2, h / 2 - lw / 2); ctx.fillStyle = hit ? '#ffffff' : col; ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = brood ? PAL.brood : PAL.outlineFoe; ctx.stroke();
      ctx.restore(); return;
    }
    if (st.state === 'flung') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineCap = 'round';
      var ys = [-h * 0.3, 0, h * 0.3], lens = [26, 36, 22];
      for (var i = 0; i < 3; i++) { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f * (w / 2 + 3), ys[i]); ctx.lineTo(f * (w / 2 + 3 + lens[i] - 3), ys[i]); ctx.stroke(); }
      ctx.rotate(f * 0.38); ctx.scale(0.7, 0.7);
    }
    var C = function (c) { return hit ? '#ffffff' : c; };
    detail(ctx, f, st, C, brood, num(st.t, 0));
    ctx.restore();
  }
  function foeEye(ctx, x, y, r, brood, C) {
    if (brood) { circle(ctx, x, y, r + 2); ctx.fillStyle = PAL.broodGlow; ctx.fill(); circle(ctx, x, y, r); ctx.fillStyle = PAL.brood; ctx.fill(); }
    else { circle(ctx, x, y, r); ctx.fillStyle = C(PAL.foeEye); ctx.fill(); }
  }
  function stunStars(ctx, cy, t, n, span, r, amp) {
    r = r || 4; amp = amp == null ? 2.5 : amp;
    for (var i = 0; i < n; i++) {
      var a = t * 4 + i * TAU / n;
      star(ctx, Math.cos(a) * span, cy + Math.sin(a) * amp, r, 5); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#5a4800'; ctx.stroke();
    }
  }
  function xEyes(ctx, x, y, r) {
    ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
  }

  function drawBoar(ctx, st) {
    var s = oneOf(obj(st).state, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
    foe(ctx, st, 48, 32, PAL.boar, function (ctx, f, st, C, brood, t) {
      ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.outlineFoe;
      if (s === 'windup') { ctx.translate(0, 16); ctx.scale(1, 0.9); ctx.translate(0, -16); } // 壓低身體蓄力
      // 揚塵(預備)
      if (s === 'windup') { ctx.fillStyle = 'rgba(210,190,160,0.75)'; circle(ctx, -f * 17, 12, 3.5); ctx.fill(); circle(ctx, -f * 11, 13, 2.5); ctx.fill(); }
      if (s === 'charge') { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-f * 19, -4); ctx.lineTo(-f * 23, -4); ctx.moveTo(-f * 19, 4); ctx.lineTo(-f * 23, 4); ctx.stroke(); ctx.strokeStyle = PAL.outlineFoe; }
      var lg = s === 'walk' ? Math.sin(t * 12) * 1.5 : 0;
      ctx.fillStyle = C('#5a3420');
      var legs = [-13, -6, 5, 12];
      for (var i = 0; i < 4; i++) { ctx.fillRect(legs[i] * f - 2 + (i % 2 ? lg : -lg), 8, 4.5, 8); }
      ell(ctx, -f * 2, 1, 17, 10); ctx.fillStyle = C(PAL.boar); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C('#4a2a18');
      for (i = 0; i < 4; i++) { poly(ctx, [-f * (12 - i * 5), -8, -f * (10 - i * 5), -13, -f * (7 - i * 5), -8]); ctx.fill(); }
      if (brood) { ctx.strokeStyle = PAL.brood; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-f * 13, -1); ctx.lineTo(-f * 8, -5); ctx.lineTo(-f * 3, -1); ctx.lineTo(f * 2, -5); ctx.stroke(); ctx.strokeStyle = PAL.outlineFoe; }
      ell(ctx, f * 13, 1, 8.5, 8); ctx.fillStyle = C('#a8664a'); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      rr(ctx, f > 0 ? 16 : -23, -1, 7, 7, 2.5); ctx.fillStyle = C('#e89a9a'); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = C('#fff6e0'); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f * 16, 6); ctx.quadraticCurveTo(f * 20, 6, f * 21, 1); ctx.stroke();
      ctx.fillStyle = C('#6a3a22'); poly(ctx, [f * 8, -5, f * 10, -12, f * 13, -6]); ctx.fill();
      if (s === 'stun') { xEyes(ctx, f * 14, -2, 2.2); }
      else {
        foeEye(ctx, f * 14, -2, s === 'windup' ? 2.6 : 2, brood, C);
        if (s === 'windup' || s === 'charge') { ctx.strokeStyle = '#1a0808'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f * 10, -6); ctx.lineTo(f * 17, -3.5); ctx.stroke(); }
        if (s === 'windup' && !brood) { circle(ctx, f * 14, -2, 4.5); ctx.fillStyle = 'rgba(255,59,59,0.35)'; ctx.fill(); }
      }
      ctx.beginPath(); ctx.moveTo(-f * 19, -2); ctx.quadraticCurveTo(-f * 23, -6, -f * 21, -8); ctx.strokeStyle = C('#5a3420'); ctx.lineWidth = 1.5; ctx.stroke();
      if (s === 'stun') stunStars(ctx, -26, t, 3, 9);
    });
  }

  function drawShieldman(ctx, st) {
    var s = oneOf(obj(st).state, ['walk', 'block', 'flung'], 'walk');
    foe(ctx, st, 32, 44, PAL.shield, function (ctx, f, st, C, brood, t) {
      ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.outlineFoe;
      var lg = s === 'walk' ? Math.sin(t * 8) * 2 : 0;
      ctx.fillStyle = C('#3a4050'); ctx.fillRect(-6 + lg, 12, 5, 10); ctx.fillRect(1 - lg, 12, 5, 10);
      rr(ctx, -9, -6, 16, 19, 4); ctx.fillStyle = C(PAL.shield); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      if (brood) { ctx.strokeStyle = PAL.brood; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-3, -2); ctx.lineTo(1, 2); ctx.lineTo(5, -2); ctx.stroke(); ctx.strokeStyle = PAL.outlineFoe; }
      rr(ctx, -8, -21, 15, 15, 5); ctx.fillStyle = C('#56607a'); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C('#a33'); poly(ctx, [-1, -21, 3, -21, 1, -25 + 3]); ctx.fill();
      ctx.fillStyle = '#120a0a'; ctx.fillRect(f > 0 ? 0 : -6.5, -15.5, 6.5, 3);
      foeEye(ctx, f * 3.5, -14, 1.4, brood, C);
      // 盾牌(面向側)
      var sx = f > 0 ? 4.5 : -14.5;
      rr(ctx, sx, -15, 10, 30, 3); ctx.fillStyle = s === 'block' ? '#ffffff' : C(PAL.shieldPlate); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      circle(ctx, sx + 5, 0, 2.5); ctx.fillStyle = C('#d8e2ee'); ctx.fill();
      if (s === 'block') {
        ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        var ex = f > 0 ? 15.5 : -15.5;
        ctx.beginPath(); ctx.moveTo(ex - f * 3, -10); ctx.lineTo(ex, -14); ctx.moveTo(ex - f * 3, 0); ctx.lineTo(ex, 0); ctx.moveTo(ex - f * 3, 10); ctx.lineTo(ex, 14); ctx.stroke();
      }
    });
  }

  function drawShooterBee(ctx, st) {
    var s = oneOf(obj(st).state, ['fly', 'aim', 'flung'], 'fly');
    foe(ctx, st, 32, 32, PAL.bee, function (ctx, f, st, C, brood, t) {
      ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.outlineFoe;
      var flap = Math.abs(Math.sin(t * 28));
      ctx.fillStyle = 'rgba(235,245,255,0.75)';
      ell(ctx, -f * 3, -9, 6, 2 + flap * 4, -f * 0.5); ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
      ell(ctx, f * 2, -10, 5, 2 + flap * 3, f * 0.4); ctx.fill(); ctx.stroke();
      ell(ctx, -f * 3, 2, 10, 7.5); ctx.fillStyle = C(s === 'aim' ? '#ffab3d' : PAL.bee); ctx.fill();
      ctx.save(); ell(ctx, -f * 3, 2, 10, 7.5); ctx.clip();
      ctx.fillStyle = C('#1e160a'); ctx.fillRect(-f * 3 - 6, -8, 3.5, 20); ctx.fillRect(-f * 3 + 1, -8, 3.5, 20);
      if (brood) { ctx.fillStyle = PAL.brood; ctx.fillRect(-f * 3 - 10, 3, 20, 2.5); }
      ctx.restore();
      ell(ctx, -f * 3, 2, 10, 7.5); ctx.lineWidth = 2; ctx.stroke();
      circle(ctx, f * 9, -1, 5.2); ctx.fillStyle = C('#3a2a10'); ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
      foeEye(ctx, f * 11, -2, 1.8, brood, C);
      // 螫針朝前(射擊口)
      poly(ctx, [f * 2, 7, f * 2, 11, f * 12.5, 10]); ctx.fillStyle = C('#1e160a'); ctx.fill();
      if (s === 'aim') {
        var pz = 0.6 + 0.4 * Math.sin(t * 30);
        circle(ctx, f * 12, 10, 2.5 + pz); ctx.fillStyle = 'rgba(255,90,42,0.9)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,90,42,0.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(f * 12, 2.5); ctx.lineTo(f * 12, 5.5); ctx.moveTo(f * 12, 14); ctx.lineTo(f * 12, 15); ctx.stroke();
      }
    });
  }

  function drawFrog(ctx, st) {
    var s = oneOf(obj(st).state, ['crouch', 'jump', 'flung'], 'crouch');
    foe(ctx, st, 32, 28, PAL.frog, function (ctx, f, st, C, brood) {
      ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.outlineFoe;
      var by = s === 'crouch' ? 5 : 0;
      if (s === 'jump') {
        ctx.strokeStyle = C('#7a9a22'); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-f * 6, 6); ctx.lineTo(-f * 12, 10); ctx.lineTo(-f * 14, 13); ctx.moveTo(-f * 1, 7); ctx.lineTo(-f * 5, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f * 6, 2); ctx.lineTo(f * 12, 4); ctx.stroke();
        ctx.strokeStyle = PAL.outlineFoe;
        ell(ctx, 0, 0, 10, 9); ctx.fillStyle = C(PAL.frog); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      } else {
        ell(ctx, -f * 9, 9, 6, 4.5); ctx.fillStyle = C('#8fb02a'); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
        ell(ctx, 0, by, 13, 8); ctx.fillStyle = C(PAL.frog); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
        ell(ctx, f * 9, 11, 4, 2.5); ctx.fillStyle = C('#8fb02a'); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (brood) { ctx.fillStyle = PAL.brood; circle(ctx, -f * 4, by - 1, 2); ctx.fill(); circle(ctx, f * 1, by + 2, 1.6); ctx.fill(); circle(ctx, -f * 7, by + 3, 1.4); ctx.fill(); }
      var ey = by - 7;
      circle(ctx, f * 2, ey, 3.6); ctx.fillStyle = C('#f4f8e0'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.outlineFoe; ctx.stroke();
      circle(ctx, f * 8, ey + 1, 3.6); ctx.fillStyle = C('#f4f8e0'); ctx.fill(); ctx.stroke();
      foeEye(ctx, f * 3, ey, 1.6, brood, C); foeEye(ctx, f * 9, ey + 1, 1.6, brood, C);
      ctx.beginPath(); ctx.moveTo(f * 4, by + 1); ctx.quadraticCurveTo(f * 9, by + 3, f * 12, by); ctx.lineWidth = 1.3; ctx.strokeStyle = PAL.outlineFoe; ctx.stroke();
    });
  }

  function drawBroodmother(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), f = face(st.facing), s = oneOf(st.state, ['walk', 'windup', 'charge', 'stun'], 'walk');
    var hit = st.hit === true, maxHp = Math.max(1, Math.round(num(st.maxHp, 12))), hp = clamp(num(st.hp, maxHp), 0, maxHp), t = num(st.t, 0);
    var sc = scaleOf(ctx);
    var C = function (c) { return hit ? '#ffffff' : c; };
    ctx.save(); ctx.translate(x, y);
    // 血條(框外上方, 寬 56 高 6, 底邊在框上緣上方 8px)
    var by = -28 - 8 - 6;
    ctx.fillStyle = '#120812'; ctx.fillRect(-28, by, 56, 6);
    ctx.fillStyle = s === 'stun' ? '#ffd84a' : PAL.hp; ctx.fillRect(-27, by + 1, 54 * hp / maxHp, 4);
    if (sc.rel >= SIL) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (var i = 1; i < maxHp && maxHp <= 40; i++) { var sx = -27 + 54 * i / maxHp; ctx.moveTo(sx, by + 1); ctx.lineTo(sx, by + 5); } ctx.stroke();
    }
    if (sc.rel >= SIL) { ctx.lineWidth = 1; ctx.strokeStyle = PAL.brood; ctx.strokeRect(-27.5, by + 0.5, 55, 5); }
    if (sc.rel < SIL) {
      var lw = 2 / sc.abs;
      ell(ctx, 0, 2, 32 - lw / 2, 26 - lw / 2); ctx.fillStyle = C(PAL.broodmother); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = PAL.brood; ctx.stroke();
      ctx.restore(); return;
    }
    if (s === 'windup') { ctx.translate(0, 28); ctx.scale(1, 0.9); ctx.translate(0, -28); } // 壓低蓄力
    ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.outlineFoe;
    if (s === 'windup') { ctx.fillStyle = 'rgba(210,190,160,0.75)'; circle(ctx, -f * 26, 24, 4); ctx.fill(); circle(ctx, -f * 19, 25, 3); ctx.fill(); }
    if (s === 'charge') { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-f * 26, -6); ctx.lineTo(-f * 31, -6); ctx.moveTo(-f * 26, 6); ctx.lineTo(-f * 31, 6); ctx.stroke(); ctx.strokeStyle = PAL.outlineFoe; }
    // 腳
    ctx.strokeStyle = C('#2a1236'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    var lg = s === 'walk' ? Math.sin(t * 8) * 2 : 0;
    for (i = 0; i < 3; i++) { var lx = -16 + i * 14; ctx.beginPath(); ctx.moveTo(lx, 14); ctx.lineTo(lx - f * 3 + (i % 2 ? lg : -lg), 26); ctx.stroke(); }
    ctx.strokeStyle = PAL.outlineFoe;
    // 殼身
    ell(ctx, -f * 4, 3, 26, 18); ctx.fillStyle = C(PAL.broodmother); ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-f * 4, 3, 20, 13, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = C('#6e3a88'); ctx.lineWidth = 3; ctx.stroke();
    // 巢穴記號: 發光紫紋
    ctx.strokeStyle = PAL.brood; ctx.lineWidth = 2.2; ctx.shadowColor = PAL.brood; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(-f * 20, 2); ctx.lineTo(-f * 13, -6); ctx.lineTo(-f * 6, 2); ctx.lineTo(f * 1, -6); ctx.lineTo(f * 8, 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // 冠角
    ctx.fillStyle = C('#2a1236');
    poly(ctx, [-f * 16, -12, -f * 13, -25, -f * 9, -14]); ctx.fill();
    poly(ctx, [-f * 6, -14, -f * 2, -27, f * 2, -14]); ctx.fill();
    poly(ctx, [f * 4, -12, f * 9, -24, f * 11, -10]); ctx.fill();
    if (s === 'stun') {
      // 破綻: 殼裂開露出發光弱點
      ell(ctx, -f * 4, -3, 9, 6); ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#1a0a20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-f * 13, -3); ctx.lineTo(-f * 8, -1); ctx.moveTo(f * 5, -3); ctx.lineTo(f * 0, -1); ctx.stroke();
    }
    // 頭與大顎
    ell(ctx, f * 20, 6, 10, 9.5); ctx.fillStyle = C('#3a1a4c'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = PAL.outlineFoe; ctx.stroke();
    ctx.strokeStyle = C('#e8d8f0'); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * 26, 10); ctx.quadraticCurveTo(f * 31, 12, f * 29, 17); ctx.moveTo(f * 26, 3); ctx.quadraticCurveTo(f * 31, 1, f * 30, -3); ctx.stroke();
    if (s === 'stun') { xEyes(ctx, f * 20, 2, 2.4); xEyes(ctx, f * 25, 6, 2); }
    else {
      var ec = s === 'windup' || s === 'charge' ? '#ff4d8a' : PAL.brood;
      circle(ctx, f * 21, 2, 4.5); ctx.fillStyle = s === 'windup' ? 'rgba(255,77,138,0.45)' : PAL.broodGlow; ctx.fill();
      circle(ctx, f * 21, 2, 2.6); ctx.fillStyle = ec; ctx.fill(); circle(ctx, f * 25.5, 6.5, 2); ctx.fill();
    }
    if (s === 'stun') stunStars(ctx, -47.5, t, 3, 16, 3, 1);
    ctx.restore();
  }

  // ---------- 飛行物與特效 ----------
  function drawBeeShot(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    if (scaleOf(ctx).rel >= SIL) {
      ctx.fillStyle = '#5a1206';
      for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + nowS() * 6; poly(ctx, [x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a + 0.5) * 3.5, y + Math.sin(a + 0.5) * 3.5, x + Math.cos(a - 0.5) * 3.5, y + Math.sin(a - 0.5) * 3.5]); ctx.fill(); }
    }
    circle(ctx, x, y, 4.4); ctx.fillStyle = PAL.beeShot; ctx.fill();
    circle(ctx, x - 1, y - 1, 1.6); ctx.fillStyle = '#ffd0a0'; ctx.fill();
    ctx.restore();
  }

  function drawArrow(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), a = num(st.angle, 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(7, 0); ctx.stroke();
    poly(ctx, [6, -3, 12, 0, 6, 3]); ctx.fillStyle = '#dfe6ee'; ctx.fill();
    ctx.fillStyle = PAL.hunter; poly(ctx, [-12, -3, -7, 0, -12, 3, -10, 0]); ctx.fill();
    ctx.restore();
  }

  function drawBomb(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0);
    ctx.save();
    circle(ctx, x, y + 1.5, 6.3); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    circle(ctx, x - 2, y - 0.5, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x + 5, y - 5.5); ctx.stroke();
    var fl = 1.2 + Math.abs(Math.sin(t * 30)) * 1.2;
    circle(ctx, x + 5.5, y - 6, fl); ctx.fillStyle = PAL.goal; ctx.fill();
    ctx.restore();
  }

  function drawExplosion(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.25)), p = clamp(num(st.t, 0) / dur, 0, 1), R = clamp(num(st.radius, 60), 1, 400);
    ctx.save();
    var r = R * (0.45 + 0.55 * p);
    ctx.globalAlpha *= 1 - p * 0.85;
    circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,154,42,0.85)'; ctx.fill();
    circle(ctx, x, y, r * 0.62); ctx.fillStyle = 'rgba(255,230,120,0.95)'; ctx.fill();
    circle(ctx, x, y, r - 1.5); ctx.lineWidth = 3; ctx.strokeStyle = '#ff5a1a'; ctx.stroke();
    ctx.restore();
  }

  function drawShockwave(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.3)), p = clamp(num(st.t, 0) / dur, 0, 1), R = clamp(num(st.radius, 130), 1, 600);
    var outer = Math.max(2, R * p), lw = Math.min(outer, 12 * (1 - p) + 4);
    ctx.save();
    ctx.globalAlpha *= 1 - p * 0.75;
    circle(ctx, x, y, outer); ctx.fillStyle = 'rgba(158,243,255,0.10)'; ctx.fill();
    circle(ctx, x, y, outer - lw / 2); ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(200,250,255,0.9)'; ctx.stroke();
    circle(ctx, x, y, Math.max(0, outer - lw - 3)); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(80,200,255,0.6)'; ctx.stroke();
    ctx.restore();
  }

  function drawPoof(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.3)), p = clamp(num(st.t, 0) / dur, 0, 1), k = st.big === true ? 2 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.globalAlpha *= 1 - p;
    var pts = [[0, 0, 9], [-9, -4, 7], [9, -3, 7], [-5, 8, 6], [6, 8, 6], [0, -10, 6]];
    for (var i = 0; i < pts.length; i++) {
      var q = pts[i], sp = 1 + p * 0.9;
      circle(ctx, q[0] * sp, q[1] * sp, q[2] * (0.8 + p * 0.5)); ctx.fillStyle = i % 2 ? '#d8dce4' : '#b8bec9'; ctx.fill();
    }
    ctx.restore();
  }

  function drawPopup(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.8)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var kind = oneOf(st.kind, KINDS, 'wood'), v = Math.round(clamp(num(st.value, 1), 0, 999));
    var b = textBoost(ctx);
    ctx.save();
    ctx.translate(x, y - 30 * p); ctx.scale(b, b);
    ctx.globalAlpha *= p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    matIcon(ctx, kind, -18, 0, 16);
    text(ctx, '+' + v, -8, 0.5, 17, PAL[kind + 'Light'] || '#fff', 'left', true, 3.5);
    ctx.restore();
  }

  function drawChainText(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.8)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var n = Math.round(clamp(num(st.n, 2), 0, 99));
    var pop = p < 0.12 ? 1 + 0.3 * (p / 0.12) : (p < 0.25 ? 1.3 - 0.3 * ((p - 0.12) / 0.13) : 1);
    ctx.save();
    ctx.translate(x, y - 30 * p); ctx.scale(pop * textBoost(ctx), pop * textBoost(ctx));
    ctx.globalAlpha *= p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
    text(ctx, n + ' 連鎖', 0, 0, 24, '#ffd84a', 'center', true, 4);
    ctx.restore();
  }

  // ---------- 道具圖示 ----------
  function sack(ctx, col, kind) {
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.quadraticCurveTo(-13, -2, -12, 7); ctx.quadraticCurveTo(-11, 13, 0, 13); ctx.quadraticCurveTo(11, 13, 12, 7); ctx.quadraticCurveTo(13, -2, 6, -9); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-8, -13); ctx.lineTo(8, -13); ctx.lineTo(6, -9); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.stroke();
    matIcon(ctx, kind, 0, 3, 14);
  }
  function drawItemIcon(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), type = oneOf(st.type, ITEMS, 'bagWood'), size = clamp(num(st.size, 32), 8, 128);
    var k = size / 32;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = '#140e08';
    if (type === 'bagWood') sack(ctx, '#d9b07a', 'wood');
    else if (type === 'bagStone') sack(ctx, '#c4c9cf', 'stone');
    else if (type === 'bagTime') sack(ctx, '#a8e6ee', 'time');
    else if (type === 'soulLamp') {
      ctx.strokeStyle = '#140e08';
      ctx.beginPath(); ctx.arc(0, -11, 3.5, Math.PI, 0); ctx.stroke();
      rr(ctx, -8, -9, 16, 3, 1); ctx.fillStyle = '#b08a3a'; ctx.fill(); ctx.stroke();
      rr(ctx, -7, -6, 14, 15, 3); ctx.fillStyle = 'rgba(255,220,250,0.35)'; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.shadowColor = PAL.soul; ctx.shadowBlur = 8; matIcon(ctx, 'soul', 0, 1.5, 12); ctx.restore();
      rr(ctx, -9, 9, 18, 4, 1.5); ctx.fillStyle = '#b08a3a'; ctx.fill(); ctx.stroke();
    } else if (type === 'glove') {
      ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-9, -1); ctx.quadraticCurveTo(-9, -5, -6, -5); ctx.lineTo(-6, -11); ctx.quadraticCurveTo(-6, -13, -4, -13); ctx.quadraticCurveTo(-2, -13, -2, -11);
      ctx.lineTo(-2, -12); ctx.quadraticCurveTo(0, -14, 2, -12); ctx.lineTo(2, -11); ctx.quadraticCurveTo(4, -13, 6, -11); ctx.lineTo(6, -3); ctx.lineTo(9, -6); ctx.quadraticCurveTo(12, -6, 11, -2); ctx.lineTo(7, 6); ctx.lineTo(7, 12); ctx.closePath();
      ctx.fillStyle = '#e8a050'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9a5a20'; ctx.fillRect(-8, 8, 15, 4);
      star(ctx, 10, -11, 4, 4); ctx.fillStyle = '#fff6c0'; ctx.fill();
      matIcon(ctx, 'stone', -9, 10, 9);
    } else if (type === 'horn') {
      ctx.beginPath(); ctx.moveTo(-12, 6); ctx.quadraticCurveTo(-4, -2, 8, -11); ctx.lineTo(12, -5); ctx.quadraticCurveTo(0, 4, -10, 11); ctx.closePath();
      ctx.fillStyle = '#efe2c4'; ctx.fill(); ctx.stroke();
      ell(ctx, 10, -8, 3, 4.5, 0.6); ctx.fillStyle = '#5a4630'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d23b3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(3, 3); ctx.stroke();
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-10, -2); ctx.moveTo(-9, -11); ctx.lineTo(-7, -6); ctx.stroke();
    } else { // heart
      ctx.save(); ctx.shadowColor = PAL.brood; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-15, 2, -13, -12, -5, -11); ctx.quadraticCurveTo(-1, -10, 0, -6); ctx.quadraticCurveTo(1, -10, 5, -11); ctx.bezierCurveTo(13, -12, 15, 2, 0, 12); ctx.closePath();
      ctx.fillStyle = '#8a2ec8'; ctx.fill(); ctx.restore();
      ctx.lineWidth = 2.2; ctx.strokeStyle = PAL.gold; ctx.stroke();
      ctx.strokeStyle = '#f0c8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-2, 2); ctx.lineTo(1, -1); ctx.lineTo(5, 3); ctx.stroke();
      star(ctx, -11, -11, 3.5, 4); ctx.fillStyle = '#fff'; ctx.fill();
    }
    ctx.restore();
  }

  function drawItemNotice(ctx, st) {
    st = obj(st);
    var type = oneOf(st.type, ITEMS, 'bagWood'), dur = Math.max(0.01, num(st.dur, 1.5)), t = clamp(num(st.t, 0), 0, dur);
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? (dur - t) / 0.3 : 1);
    ctx.save();
    ctx.globalAlpha *= clamp(a, 0, 1);
    rr(ctx, 441, 53, 398, 42, 10); ctx.fillStyle = 'rgba(16,20,32,0.92)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = type === 'heart' ? PAL.brood : PAL.gold; ctx.stroke();
    var s = '獲得 ' + ITEM_NAME[type];
    var w = tw(ctx, s, 20, true), total = 32 + 10 + w, x0 = 640 - total / 2;
    drawItemIcon(ctx, { x: x0 + 16, y: 74, type: type, size: 32 });
    text(ctx, s, x0 + 42, 74, 20, PAL.text, 'left', true);
    ctx.restore();
  }

  // ---------- 大地圖 ----------
  function drawMapLink(ctx, st) {
    st = obj(st);
    var x1 = num(st.x1, 0), y1 = num(st.y1, 0), x2 = num(st.x2, 0), y2 = num(st.y2, 0), lit = st.lit === true;
    var mx = (x1 + x2) / 2;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (lit) { ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(255,216,74,0.25)'; ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = PAL.select; ctx.stroke(); }
    else { ctx.setLineDash([8, 7]); ctx.lineWidth = 3; ctx.strokeStyle = '#3f5058'; ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }

  function cardFrame(ctx, x, y, w, h, bg, line, lw, dash) {
    rr(ctx, x, y, w, h, 9); ctx.fillStyle = bg; ctx.fill();
    if (dash) ctx.setLineDash(dash);
    rr(ctx, x + lw / 2, y + lw / 2, w - lw, h - lw, 9); ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawLevelCard(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), idx = Math.round(clamp(num(st.index, 1), 0, 99)), name = str(st.name, '');
    var s = oneOf(st.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed');
    ctx.save();
    var bg = { sealed: '#1b2128', buyable: '#262f38', open: '#2a3644', cleared: '#22382e' }[s];
    var ln = { sealed: '#3a434f', buyable: PAL.select, open: '#8fa3bf', cleared: PAL.good }[s];
    cardFrame(ctx, x, y, 176, 136, bg, ln, s === 'cleared' ? 2.5 : 2, s === 'buyable' ? [7, 5] : null);
    // 縮圖區
    ctx.fillStyle = (s === 'open' || s === 'cleared') ? PAL.bg : '#11161c';
    ctx.fillRect(x + 8, y + 8, 160, 90);
    if (s === 'sealed' || s === 'buyable') {
      lockIcon(ctx, x + 88, y + 40, 30, s === 'sealed' ? '#59626e' : PAL.select);
      costRow(ctx, st.cost, st.stock, st.canAfford, x + 88, y + 80, 14, 'center');
    }
    // 文字區第一行
    text(ctx, idx + ' ' + name, x + 9, y + 113, 13, s === 'sealed' ? '#7c8694' : PAL.text, 'left', true);
    if (s === 'open' || s === 'cleared') {
      var rc = Math.round(clamp(num(st.repairedCount, 0), 0, 3));
      text(ctx, '工程 ' + rc + '/3', x + 168, y + 113, 10, rc >= 3 ? PAL.good : PAL.textDim, 'right', true);
    }
    if (s === 'cleared') {
      if (st.recordCls != null) clsIcon(ctx, st.recordCls, x + 86, y + 113, 12);
      if (st.recordTime != null) text(ctx, fmt1(st.recordTime) + 's', x + 94, y + 113, 11, PAL.text, 'left', false);
      var r = mats(st.rates);
      for (var i = 0; i < 4; i++) {
        var k = KINDS[i], cx = x + 8 + i * 41;
        matIcon(ctx, k, cx + 5, y + 128, 11);
        text(ctx, fmt1(r[k]), cx + 12, y + 128, 10, r[k] > 0 ? PAL.text : PAL.textDim, 'left', false);
      }
    } else if (s === 'open') {
      text(ctx, '未過關', x + 9, y + 128, 11, PAL.textDim, 'left', false);
    }
    if (s === 'sealed') { rr(ctx, x, y, 176, 136, 9); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
    ctx.restore();
  }

  function drawCardOverlay(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), lv = Math.round(clamp(num(st.accelLv, 0), 0, 2));
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = '#0c1016'; ctx.strokeRect(x + 7, y + 7, 162, 92);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.strokeRect(x + 8.5, y + 8.5, 159, 89);
    if (lv > 0) {
      var s = lv === 1 ? '×1.25' : '×1.5';
      var w = tw(ctx, s, 11, true) + 10;
      rr(ctx, x + 165 - w, y + 11, w, 16, 4); ctx.fillStyle = PAL.time; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#0c3a44'; ctx.stroke();
      text(ctx, s, x + 165 - w / 2, y + 19.5, 11, '#06262c', 'center', true);
    }
    if (st.newArea === true) {
      var w2 = tw(ctx, '新區域', 11, true) + 10;
      rr(ctx, x + 11, y + 11, w2, 16, 4); ctx.fillStyle = PAL.newArea; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      text(ctx, '新區域', x + 11 + w2 / 2, y + 19.5, 11, '#ffffff', 'center', true);
    }
    if (st.selected === true) {
      rr(ctx, x - 4.5, y - 4.5, 185, 145, 12); ctx.lineWidth = 3; ctx.strokeStyle = PAL.select; ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorkshopCard(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    cardFrame(ctx, x, y, 176, 136, '#2a2838', '#9a8fc0', 2, null);
    // 鐵砧 + 鎚
    ctx.translate(x + 88, y + 54);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#0e0c14';
    poly(ctx, [-34, -10, 26, -10, 34, -16, 34, -6, 20, 2, 12, 2, 12, 12, 22, 22, -22, 22, -12, 12, -12, 2, -24, 2, -34, -4]); ctx.fillStyle = '#6a7284'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8f98aa'; ctx.fillRect(-32, -10, 58, 4);
    ctx.save(); ctx.rotate(-0.6);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-2, -42, 5, 30); ctx.strokeRect(-2, -42, 5, 30);
    rr(ctx, -11, -50, 23, 11, 2); ctx.fillStyle = '#b8bfcc'; ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = PAL.goal; star(ctx, 30, -26, 5, 4); ctx.fill();
    ctx.restore(); ctx.save();
    text(ctx, '升級所', x + 88, y + 114, 17, PAL.text, 'center', true);
    if (st.anyAffordable === true) {
      circle(ctx, x + 158, y + 18, 11); ctx.fillStyle = PAL.short; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      text(ctx, '!', x + 158, y + 18.5, 15, '#ffffff', 'center', true);
    }
    if (st.selected === true) { rr(ctx, x - 4.5, y - 4.5, 185, 145, 12); ctx.lineWidth = 3; ctx.strokeStyle = PAL.select; ctx.stroke(); }
    ctx.restore();
  }

  function castle(ctx, cx, cy, k, glow) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#120e08';
    if (glow) { ctx.shadowColor = PAL.gold; ctx.shadowBlur = 14; }
    ctx.fillStyle = '#d8cdb0';
    poly(ctx, [-40, 26, -40, -6, -34, -6, -34, -12, -28, -12, -28, -6, -22, -6, -22, -12, -16, -12, -16, -6, 16, -6, 16, -12, 22, -12, 22, -6, 28, -6, 28, -12, 34, -12, 34, -6, 40, -6, 40, 26]); ctx.fill();
    ctx.shadowBlur = 0; ctx.stroke();
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-12, -26, 24, 52); ctx.strokeRect(-12, -26, 24, 52);
    poly(ctx, [-15, -26, 0, -42, 15, -26]); ctx.fillStyle = '#5d4b88'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.gold; ctx.fillRect(-1, -52, 2, 11); poly(ctx, [1, -52, 10, -49, 1, -46]); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, 26); ctx.lineTo(-7, 12); ctx.arc(0, 12, 7, Math.PI, 0); ctx.lineTo(7, 26); ctx.closePath(); ctx.fillStyle = '#3a2a1a'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a4a6a'; ctx.fillRect(-3, -14, 6, 8); ctx.fillRect(-30, 4, 6, 8); ctx.fillRect(24, 4, 6, 8);
    ctx.restore();
  }

  function drawGoalCard(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), can = st.canAfford === true;
    ctx.save();
    if (can) { rr(ctx, x - 2, y - 2, 204, 140, 11); ctx.fillStyle = 'rgba(242,201,76,0.25)'; ctx.fill(); }
    cardFrame(ctx, x, y, 200, 136, '#30293a', can ? PAL.gold : '#8a7a5a', can ? 3 : 2, null);
    castle(ctx, x + 100, y + 54, 0.9, can);
    text(ctx, '王城', x + 100, y + 96, 16, can ? PAL.gold : PAL.text, 'center', true);
    costRow(ctx, st.cost, st.stock, st.canAfford, x + 100, y + 119, 12, 'center');
    if (st.selected === true) { rr(ctx, x - 4.5, y - 4.5, 209, 145, 12); ctx.lineWidth = 3; ctx.strokeStyle = PAL.select; ctx.stroke(); }
    ctx.restore();
  }

  function drawFlyingMaterial(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, KINDS, 'wood');
    var tx = KIND_HUD_X[kind], ty = 20, dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
    var ux = -dx / d, uy = -dy / d;
    ctx.save();
    for (var i = 3; i >= 1; i--) {
      circle(ctx, x + ux * i * 7, y + uy * i * 7, 6 - i * 1.3);
      ctx.fillStyle = PAL[kind]; ctx.globalAlpha = 0.5 - i * 0.12; ctx.fill();
    }
    ctx.globalAlpha = 1;
    matIcon(ctx, kind, x, y, 18);
    ctx.restore();
  }

  // ---------- 面板共用 ----------
  function dimWithHole(ctx, hole) {
    ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (hole) ctx.rect(hole[0], hole[1], hole[2], hole[3]);
    ctx.fillStyle = 'rgba(5,7,12,0.62)'; ctx.fill('evenodd');
  }
  function panelBox(ctx, x, y, w, h, hole, col, line) {
    ctx.beginPath();
    ctx.moveTo(x + 12, y); ctx.lineTo(x + w - 12, y); ctx.quadraticCurveTo(x + w, y, x + w, y + 12); ctx.lineTo(x + w, y + h - 12); ctx.quadraticCurveTo(x + w, y + h, x + w - 12, y + h);
    ctx.lineTo(x + 12, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - 12); ctx.lineTo(x, y + 12); ctx.quadraticCurveTo(x, y, x + 12, y); ctx.closePath();
    if (hole) ctx.rect(hole[0], hole[1], hole[2], hole[3]);
    ctx.fillStyle = col || PAL.ui; ctx.fill('evenodd');
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 12); ctx.lineWidth = 2; ctx.strokeStyle = line || PAL.uiLineHi; ctx.stroke();
  }
  function rowBox(ctx, x, y, w, h, sel) {
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = sel ? '#2a3550' : '#222b3d'; ctx.fill();
    rr(ctx, x + (sel ? 1.5 : 0.75), y + (sel ? 1.5 : 0.75), w - (sel ? 3 : 1.5), h - (sel ? 3 : 1.5), 8);
    ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? PAL.select : PAL.uiLine; ctx.stroke();
  }
  function cellBox(ctx, x, y, w, h, bg, sel, rowSel) {
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = bg; ctx.fill();
    if (sel) { rr(ctx, x + 1.25, y + 1.25, w - 2.5, h - 2.5, 6); ctx.lineWidth = 2.5; ctx.strokeStyle = rowSel ? PAL.select : '#cfd8e6'; ctx.stroke(); }
    else { rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = '#3a4560'; ctx.stroke(); }
  }
  function avatar(ctx, cls, cx, cy, k, dim) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    if (dim) ctx.globalAlpha *= 0.35;
    drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'idle', poseT: 0, invuln: false });
    ctx.restore();
  }
  function ratesLine(ctx, rates, x, y, step, px, isz) {
    var r = mats(rates);
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i], cx = x + i * step;
      matIcon(ctx, k, cx + isz / 2, y, isz);
      text(ctx, '+' + fmt1(r[k]) + '/分', cx + isz + 4, y, px, r[k] > 0 ? PAL.text : PAL.textDim, 'left', false);
    }
  }
  function hintLine(ctx, s, x, y) { text(ctx, s, x, y, 14, PAL.textDim, 'left', false); }

  // ---------- 關卡面板 ----------
  function drawLevelPanel(ctx, st) {
    st = obj(st);
    var row = Math.round(clamp(num(st.row, 0), 0, 3)), idx = Math.round(clamp(num(st.index, 1), 0, 99));
    var stock = mats(st.stock), items = arr(st.items);
    var PV = [60, 96, 640, 360];
    ctx.save();
    dimWithHole(ctx, PV);
    panelBox(ctx, 40, 48, 1200, 640, PV);
    ctx.lineWidth = 2; ctx.strokeStyle = PAL.uiLineHi; ctx.strokeRect(59, 95, 642, 362);
    text(ctx, '第 ' + idx + ' 關 ' + str(st.name, ''), 60, 75, 24, PAL.text, 'left', true);

    // 職業列
    rowBox(ctx, 720, 96, 480, 130, row === 0);
    text(ctx, '職業', 732, 109, 12, PAL.textDim, 'left', true);
    var classes = arr(st.classes), clsSel = Math.round(clamp(num(st.clsSel, 0), 0, 2));
    for (var i = 0; i < 3; i++) {
      var c = obj(classes[i]), cls = oneOf(c.cls, CLS, CLS[i]), owned = c.owned === true;
      var cx = 720 + 7.5 + i * 157.5, cy = 120, sel = clsSel === i;
      cellBox(ctx, cx, cy, 150, 100, owned ? '#2b3850' : '#1c212c', sel, row === 0);
      avatar(ctx, cls, cx + 28, cy + 50, 1.3, !owned);
      if (!owned) lockIcon(ctx, cx + 28, cy + 52, 22, '#c0c8d4');
      text(ctx, CLS_NAME[cls], cx + 56, cy + 22, 16, owned ? PAL.text : PAL.textDim, 'left', true);
      text(ctx, CLS_GOOD[cls], cx + 56, cy + 44, 12, PAL.textDim, 'left', false);
      if (!owned) text(ctx, '到升級所招募', cx + 56, cy + 74, 11, '#ff9a8a', 'left', false);
      else if (sel) badge(ctx, 'Z 出發', cx + 56, cy + 74, 12, row === 0 ? PAL.select : '#cfd8e6', '#11151d', 'left');
    }

    // 工程列
    rowBox(ctx, 720, 236, 480, 150, row === 1);
    var sites = arr(st.sites), siteSel = Math.round(clamp(num(st.siteSel, 0), 0, 2));
    for (i = 0; i < 3; i++) {
      var s = obj(sites[i]), status = oneOf(s.status, ['hidden', 'open', 'done'], 'hidden');
      var role = oneOf(s.role, ['shortcut', 'treasure', 'nest'], 'shortcut'), kind = oneOf(s.kind, ['bridge', 'stairs', 'rubble', 'nestgate'], 'rubble');
      var sx = 720 + 7.5 + i * 157.5, sy = 246, mid = sx + 75, ssel = siteSel === i;
      cellBox(ctx, sx, sy, 150, 130, status === 'hidden' ? '#3e434e' : (status === 'done' ? '#22382e' : '#2b3850'), ssel, row === 1);
      if (status === 'hidden') {
        ctx.save(); rr(ctx, sx + 2, sy + 2, 146, 126, 6); ctx.clip();
        for (var b = 0; b < 6; b++) { ell(ctx, sx + 20 + (b % 3) * 55, sy + 40 + Math.floor(b / 3) * 55, 34, 20); ctx.fillStyle = b % 2 ? 'rgba(201,205,214,0.25)' : 'rgba(128,134,148,0.3)'; ctx.fill(); }
        ctx.restore();
      }
      text(ctx, '工程 ' + (i + 1), mid, sy + 14, 13, PAL.text, 'center', true);
      if (status === 'hidden') {
        text(ctx, '???', mid, sy + 62, 26, '#e6e8ee', 'center', true, 3);
        text(ctx, '先修工程 ' + i, mid, sy + 100, 12, PAL.text, 'center', false, 3);
      } else {
        signShape(ctx, role, mid, sy + 62, 0.78, status === 'done');
        text(ctx, ROLE_NAME[role], mid, sy + 76, 14, status === 'done' ? PAL.textDim : ROLE_COL[role], 'center', true);
        text(ctx, SITE_KIND_NAME[kind], mid, sy + 94, 12, PAL.textDim, 'center', false);
        if (status === 'done') {
          text(ctx, '✓ 已完工', mid, sy + 115, 13, PAL.good, 'center', true);
        } else {
          costRow(ctx, s.cost, stock, null, sx + 10, sy + 115, 13, 'left');
          badge(ctx, 'Z 修復', sx + 142, sy + 115, 11, ssel && row === 1 ? PAL.select : '#cfd8e6', '#11151d', 'right');
        }
      }
    }

    // 道具格列
    rowBox(ctx, 720, 396, 480, 120, row === 2);
    text(ctx, '道具格', 732, 409, 12, PAL.textDim, 'left', true);
    var slots = arr(st.slots), slotSel = Math.round(clamp(num(st.slotSel, 0), 0, 1));
    for (i = 0; i < 2; i++) {
      var it = slots[i], has = ITEMS.indexOf(it) >= 0;
      var ox = 728 + i * 236, oy = 422, osel = slotSel === i;
      cellBox(ctx, ox, oy, 228, 86, has ? '#2b3850' : '#1f2533', osel, row === 2);
      text(ctx, (i + 1) + ' 號格', ox + 8, oy + 12, 11, PAL.textDim, 'left', true);
      if (osel) badge(ctx, items.length ? 'Z 換道具' : '尚無道具', ox + 222, oy + 13, 11, items.length ? (row === 2 ? PAL.select : '#cfd8e6') : '#5a6478', '#11151d', 'right');
      if (has) {
        drawItemIcon(ctx, { x: ox + 26, y: oy + 52, type: it, size: 36 });
        text(ctx, ITEM_NAME[it], ox + 50, oy + 42, 15, PAL.text, 'left', true);
        text(ctx, ITEM_FX[it], ox + 50, oy + 66, 11, '#cfe0ff', 'left', false);
      } else {
        text(ctx, '空', ox + 114, oy + 50, 18, '#5a6478', 'center', true);
      }
    }

    // 加速器列
    rowBox(ctx, 720, 526, 480, 80, row === 3);
    text(ctx, '回放加速器', 732, 539, 12, PAL.textDim, 'left', true);
    var lv = Math.round(clamp(num(st.accelLv, 0), 0, 2));
    text(ctx, ['×1', '×1.25', '×1.5'][lv], 734, 574, 24, PAL.time, 'left', true);
    for (i = 0; i < 2; i++) { rr(ctx, 840 + i * 26, 566, 20, 16, 3); ctx.fillStyle = i < lv ? PAL.time : '#2a3346'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#6a7894'; ctx.stroke(); }
    if (st.accelCost == null) {
      text(ctx, '已滿', 1188, 574, 16, PAL.good, 'right', true);
    } else {
      text(ctx, '下一級 ' + ['×1.25', '×1.5', ''][lv], 912, 574, 13, PAL.textDim, 'left', false);
      costRow(ctx, st.accelCost, stock, null, 1020, 574, 15, 'left');
      badge(ctx, 'Z 購買', 1188, 574, 12, row === 3 ? PAL.select : '#cfd8e6', '#11151d', 'right');
    }

    // 背包
    text(ctx, '背包', 60, 464, 11, PAL.textDim, 'left', true);
    for (i = 0; i < 11; i++) {
      var bx = 60 + i * 58, item = obj(items[i]);
      if (i < items.length && ITEMS.indexOf(item.type) >= 0) {
        rr(ctx, bx, 472, 52, 52, 6); ctx.fillStyle = '#2b3850'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#5a6a8a'; ctx.stroke();
        drawItemIcon(ctx, { x: bx + 26, y: 498, type: item.type, size: 40 });
        var wh = item.where && typeof item.where === 'object' ? item.where : null;
        var here = wh && Math.round(num(wh.level, 0)) === idx;
        text(ctx, wh ? (Math.round(num(wh.level, 0)) + '關' + Math.round(num(wh.slot, 0)) + '號') : '未裝', bx + 26, 534, 10, here ? PAL.select : (wh ? PAL.text : PAL.textDim), 'center', here);
      } else {
        ctx.setLineDash([4, 4]); rr(ctx, bx + 0.5, 472.5, 51, 51, 6); ctx.lineWidth = 1; ctx.strokeStyle = '#3a4560'; ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // 回放資訊
    rr(ctx, 60, 560, 640, 90, 8); ctx.fillStyle = '#222b3d'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = PAL.uiLine; ctx.stroke();
    text(ctx, '目前回放', 74, 576, 12, PAL.textDim, 'left', true);
    if (st.recordTime == null) {
      text(ctx, '尚無回放', 74, 612, 16, PAL.textDim, 'left', true);
    } else {
      clsIcon(ctx, st.recordCls, 88, 612, 24);
      text(ctx, fmt1(st.recordTime) + ' 秒', 106, 612, 18, PAL.text, 'left', true);
      ratesLine(ctx, st.rates, 220, 612, 118, 14, 18);
    }
    if (st.newArea === true) text(ctx, '修好後還沒跑過', 688, 576, 12, PAL.newArea, 'right', true);

    hintLine(ctx, '↑↓ 換列  ←→ 選擇  Z 確定  X 關閉', 60, 676);
    ctx.restore();
  }

  function drawSiteHighlight(ctx, st) {
    st = obj(st);
    if (st.active === false) return;
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 20), 4, 1280), h = clamp(num(st.h, 20), 4, 720);
    var p = 0.5 + 0.5 * Math.sin(nowS() * 6);
    ctx.save();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,216,74,' + (0.55 + 0.45 * p).toFixed(3) + ')';
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -nowS() * 20; ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,16,4,0.9)';
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------- 升級所頁面 ----------
  var STAT_NAME = { speed: '移速', hp: '血量', cd: '技能冷卻' };
  var STAT_FX = { speed: ['+0%', '+8%', '+16%', '+24%'], hp: ['3', '4', '5'], cd: ['-0%', '-15%', '-30%', '-45%'] };
  var STAT_MAX = { speed: 3, hp: 2, cd: 3 };
  function drawUpgradePage(ctx, st) {
    st = obj(st);
    var row = Math.round(clamp(num(st.row, 0), 0, 3)), stock = mats(st.stock);
    ctx.save();
    dimWithHole(ctx, null);
    panelBox(ctx, 40, 48, 1200, 640, null, PAL.ui, '#9a8fc0');
    text(ctx, '升級所', 60, 75, 24, PAL.text, 'left', true);
    // 招募
    rowBox(ctx, 80, 110, 1120, 170, row === 0);
    text(ctx, '招募', 96, 125, 13, PAL.textDim, 'left', true);
    var rec = arr(st.recruits), rsel = Math.round(clamp(num(st.recruitSel, 0), 0, 1));
    for (var i = 0; i < 2; i++) {
      var r = obj(rec[i]), cls = oneOf(r.cls, ['hunter', 'bomber'], i ? 'bomber' : 'hunter'), owned = r.owned === true;
      var cx = 93 + i * 553, cy = 140, sel = rsel === i;
      cellBox(ctx, cx, cy, 540, 128, owned ? '#22382e' : '#2b3850', sel, row === 0);
      avatar(ctx, cls, cx + 52, cy + 64, 1.6, false);
      text(ctx, CLS_NAME[cls], cx + 104, cy + 32, 20, PAL.text, 'left', true);
      text(ctx, '擅長: ' + CLS_GOOD[cls], cx + 104, cy + 62, 14, PAL.textDim, 'left', false);
      if (owned) text(ctx, '✓ 已招募', cx + 104, cy + 98, 16, PAL.good, 'left', true);
      else {
        costRow(ctx, r.cost, stock, null, cx + 104, cy + 98, 18, 'left');
        if (sel) badge(ctx, 'Z 招募', cx + 526, cy + 98, 14, row === 0 ? PAL.select : '#cfd8e6', '#11151d', 'right');
      }
    }
    // 強化三列
    var stats = arr(st.stats), keys = ['speed', 'hp', 'cd'], ys = [300, 410, 520];
    for (i = 0; i < 3; i++) {
      var s = obj(stats[i]), key = oneOf(s.key, keys, keys[i]), maxLv = Math.round(clamp(num(s.maxLv, STAT_MAX[key]), 1, 6));
      var lv = Math.round(clamp(num(s.lv, 0), 0, maxLv)), y = ys[i], rs = row === i + 1;
      rowBox(ctx, 80, y, 1120, 100, rs);
      text(ctx, ['移速', '血量', '冷卻'][keys.indexOf(key)], 104, y + 50, 22, PAL.text, 'left', true);
      for (var j = 0; j < maxLv; j++) {
        rr(ctx, 220 + j * 36, y + 37, 28, 26, 4); ctx.fillStyle = j < lv ? PAL.soul : '#2a3346'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#7a6a94'; ctx.stroke();
      }
      var fx = STAT_FX[key];
      text(ctx, STAT_NAME[key] + ' ' + (fx[lv] != null ? fx[lv] : fx[fx.length - 1]), 400, y + 38, 18, PAL.text, 'left', true);
      if (lv < maxLv && fx[lv + 1] != null) text(ctx, '下一級 ' + STAT_NAME[key] + ' ' + fx[lv + 1], 400, y + 68, 14, PAL.textDim, 'left', false);
      if (s.cost == null || lv >= maxLv) {
        text(ctx, '已滿', 1180, y + 50, 18, PAL.good, 'right', true);
      } else {
        costRow(ctx, s.cost, stock, null, 860, y + 50, 20, 'left');
        if (rs) badge(ctx, 'Z 升級', 1180, y + 50, 14, PAL.select, '#11151d', 'right');
      }
    }
    hintLine(ctx, '↑↓ 換列  ←→ 選擇  Z 招募 / 升級  X 關閉', 60, 676);
    ctx.restore();
  }

  // ---------- 資訊列 ----------
  function hudCell(ctx, kind, x0, stockV, rate, bump) {
    matIcon(ctx, kind, x0 + 20, 20, 22);
    ctx.save(); ctx.translate(x0 + 36, 20); ctx.scale(bump, bump);
    text(ctx, intStr(stockV), 0, 1, 18, bump > 1.01 ? PAL.select : PAL.text, 'left', true);
    ctx.restore();
    if (rate != null) text(ctx, '+' + fmt1(rate) + '/分', x0 + 100, 13, 11, PAL[kind + 'Light'], 'left', false);
    text(ctx, KIND_USE[kind], x0 + 100, 29, 10, PAL.textDim, 'left', false);
  }
  function heart(ctx, cx, cy, full) {
    ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.bezierCurveTo(cx - 9, cy, cx - 7, cy - 7, cx - 3, cy - 6); ctx.quadraticCurveTo(cx - 1, cy - 6, cx, cy - 3); ctx.quadraticCurveTo(cx + 1, cy - 6, cx + 3, cy - 6); ctx.bezierCurveTo(cx + 7, cy - 7, cx + 9, cy, cx, cy + 6); ctx.closePath();
    if (full) { ctx.fillStyle = PAL.hp; ctx.fill(); }
    ctx.lineWidth = 1.5; ctx.strokeStyle = full ? '#ffffff' : '#6a7486'; ctx.stroke();
  }
  function drawHud(ctx, st) {
    st = obj(st);
    var mode = st.mode === 'level' ? 'level' : 'map', stock = mats(st.stock), rate = mats(st.ratePerMin);
    var bt = obj(st.bumpT), bd = Math.max(0.01, num(st.bumpDur, 0.15));
    ctx.save();
    ctx.fillStyle = 'rgba(10,14,24,0.84)'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 39, W, 1);
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = 16 + i * 170;
      var p = clamp(num(bt[k], bd), 0, bd) / bd;
      var bump = p < 1 ? 1 + 0.3 * Math.sin(Math.PI * p) : 1;
      hudCell(ctx, k, x0, stock[k], rate[k], bump);
      if (i) { ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x0 - 4, 8, 1, 24); }
    }
    if (mode === 'level') {
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(712, 6, 1, 28);
      var cls = oneOf(st.cls, CLS, 'sword');
      var cdd = Math.max(0.01, num(st.skillCdDur, 1)), cdt = clamp(num(st.skillCdT, cdd), 0, cdd), ready = cdt >= cdd;
      clsIcon(ctx, cls, 742, 20, 22);
      ctx.lineWidth = 3;
      circle(ctx, 742, 20, 14.5); ctx.strokeStyle = '#2a3346'; ctx.stroke();
      ctx.beginPath(); ctx.arc(742, 20, 14.5, -Math.PI / 2, -Math.PI / 2 + TAU * (cdt / cdd)); ctx.strokeStyle = ready ? PAL.select : '#8a94a8'; ctx.stroke();
      keycap(ctx, 'X', 772, 20, 11, ready);
      var mh = Math.round(clamp(num(st.maxHp, 3), 1, 8)), hp = Math.round(clamp(num(st.hp, mh), 0, mh));
      for (i = 0; i < mh; i++) heart(ctx, 800 + i * 22, 20, i < hp);
      // 計時
      var tx = 920;
      circle(ctx, tx, 20, 7); ctx.lineWidth = 2; ctx.strokeStyle = PAL.text; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, 20); ctx.lineTo(tx, 15.5); ctx.moveTo(tx, 20); ctx.lineTo(tx + 3.5, 20); ctx.stroke();
      text(ctx, fmt1(st.time) + 's', tx + 12, 21, 16, PAL.text, 'left', true);
      text(ctx, '這趟', 1022, 21, 11, PAL.textDim, 'left', false);
      var run = mats(st.run);
      for (i = 0; i < 4; i++) {
        var kk = KINDS[i], rx = 1050 + i * 55;
        matIcon(ctx, kk, rx + 8, 20, 16);
        text(ctx, intStr(run[kk]), rx + 18, 21, 14, run[kk] > 0 ? PAL.text : PAL.textDim, 'left', true);
      }
    }
    ctx.restore();
  }

  // ---------- 結算與各面板 ----------
  function drawResultPanel(ctx, st) {
    st = obj(st);
    var X = 280, Y = 150, cx = 640;
    var items = arr(st.items).filter(function (t) { return ITEMS.indexOf(t) >= 0; }).slice(0, 4);
    var first = st.oldTime == null;
    ctx.save();
    panelBox(ctx, X, Y, 720, 420, null, '#1c2433', PAL.good);
    text(ctx, '過關', cx, Y + 40, 32, PAL.goal, 'center', true, 4);
    var run = mats(st.run), r = mats(st.rates);
    function runLine(y) {
      text(ctx, '這一趟獲得', X + 60, y, 15, PAL.textDim, 'left', true);
      for (var i = 0; i < 4; i++) { var k = KINDS[i], rx = X + 180 + i * 100; matIcon(ctx, k, rx + 10, y, 20); text(ctx, intStr(run[k]), rx + 24, y, 17, run[k] > 0 ? PAL.text : PAL.textDim, 'left', true); }
    }
    function itemLine(y) {
      if (!items.length) return;
      var ws = [], total = 0;
      for (var i = 0; i < items.length; i++) { var w = 30 + 8 + tw(ctx, '獲得 ' + ITEM_NAME[items[i]], 16, true); ws.push(w); total += w + (i ? 30 : 0); }
      var x = cx - total / 2;
      for (i = 0; i < items.length; i++) {
        if (i) x += 30;
        drawItemIcon(ctx, { x: x + 15, y: y, type: items[i], size: 30 });
        text(ctx, '獲得 ' + ITEM_NAME[items[i]], x + 38, y, 16, items[i] === 'heart' ? '#e0a8ff' : PAL.gold, 'left', true);
        x += ws[i];
      }
    }
    if (first) {
      clsIcon(ctx, st.cls, cx - 70, Y + 96, 26);
      text(ctx, fmt1(st.time) + ' 秒', cx - 50, Y + 96, 24, PAL.text, 'left', true);
      runLine(Y + 148);
      text(ctx, '每分鐘產量', X + 60, Y + 196, 15, PAL.textDim, 'left', true);
      ratesLine(ctx, r, X + 180, Y + 196, 120, 15, 20);
      itemLine(Y + 250);
      text(ctx, '已存成回放', cx, Y + 310, 18, PAL.good, 'center', true);
      keyHints(ctx, [['Z', '回大地圖']], cx, Y + 375, 16);
    } else {
      runLine(Y + 82);
      var colA = X + 330, colB = X + 560;
      text(ctx, '這一趟', colA, Y + 122, 16, PAL.text, 'center', true);
      text(ctx, '目前回放', colB, Y + 122, 16, PAL.text, 'center', true);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(X + 50, Y + 136, 620, 1);
      text(ctx, '職業 / 秒數', X + 60, Y + 158, 14, PAL.textDim, 'left', false);
      clsIcon(ctx, st.cls, colA - 36, Y + 158, 22); text(ctx, fmt1(st.time) + ' 秒', colA - 20, Y + 158, 17, PAL.text, 'left', true);
      clsIcon(ctx, st.oldCls, colB - 36, Y + 158, 22); text(ctx, fmt1(st.oldTime) + ' 秒', colB - 20, Y + 158, 17, PAL.text, 'left', true);
      var o = mats(st.oldRates);
      for (var i = 0; i < 4; i++) {
        var k = KINDS[i], yy = Y + 194 + i * 32;
        matIcon(ctx, k, X + 70, yy, 18);
        text(ctx, '每分鐘', X + 86, yy, 13, PAL.textDim, 'left', false);
        var a = Math.round(r[k] * 10), b = Math.round(o[k] * 10);
        text(ctx, '+' + fmt1(r[k]) + (a > b ? ' ▲' : ''), colA, yy, 17, a > b ? PAL.good : (a < b ? PAL.textDim : PAL.text), 'center', a > b);
        text(ctx, '+' + fmt1(o[k]) + (b > a ? ' ▲' : ''), colB, yy, 17, b > a ? PAL.good : (b < a ? PAL.textDim : PAL.text), 'center', b > a);
      }
      itemLine(Y + 336);
      keyHints(ctx, [['Z', '採用這一趟'], ['X', '保留舊的']], cx, Y + 386, 16);
    }
    ctx.restore();
  }

  function drawFailPanel(ctx) {
    ctx.save();
    panelBox(ctx, 380, 240, 520, 240, null, '#2a1c22', PAL.short);
    text(ctx, '失敗', 640, 320, 42, PAL.short, 'center', true, 4);
    text(ctx, '這趟作廢, 素材不入帳', 640, 370, 14, PAL.textDim, 'center', false);
    keyHints(ctx, [['Z', '重來'], ['X', '回大地圖']], 640, 428, 16);
    ctx.restore();
  }

  function drawPausePanel(ctx, st) {
    st = obj(st);
    ctx.save();
    dimWithHole(ctx, null);
    panelBox(ctx, 380, 220, 520, 280, null, PAL.ui, PAL.uiLineHi);
    text(ctx, '暫停', 640, 310, 42, PAL.text, 'center', true);
    if (st.mode === 'level') keyHints(ctx, [['Esc', '繼續'], ['Z', '重來'], ['X', '回大地圖']], 640, 420, 16);
    else keyHints(ctx, [['Esc', '繼續']], 640, 420, 16);
    ctx.restore();
  }

  function drawEndingPanel(ctx, st) {
    st = obj(st);
    var tt = Math.max(0, Math.floor(clamp(num(st.totalTime, 0), 0, 3.6e6)));
    var m = Math.floor(tt / 60), s = tt % 60;
    ctx.save();
    panelBox(ctx, 280, 150, 720, 420, null, '#241f30', PAL.gold);
    castle(ctx, 640, 270, 1.6, true);
    text(ctx, '王城重建完成', 640, 380, 36, PAL.gold, 'center', true, 4);
    text(ctx, '總遊玩時間 ' + m + ':' + (s < 10 ? '0' : '') + s, 640, 436, 20, PAL.text, 'center', false);
    keyHints(ctx, [['Z', '重新開始']], 640, 512, 16);
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  var GUIDE_SIZE = [[480, 270], [600, 220], [480, 300], [560, 240], [560, 220]];

  function label(ctx, s, x, y, k, col) { // 示意圖短標籤: 畫面字級固定 14px
    text(ctx, s, x, y, 14 / k, col || '#ffffff', 'center', true, 3.5 / k);
  }
  function dashedRoute(ctx, pts, k, col) {
    ctx.save();
    ctx.setLineDash([8 / k, 6 / k]); ctx.lineWidth = 3 / k; ctx.strokeStyle = col || '#ffffff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (p.length === 4) ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke(); ctx.setLineDash([]);
    var last = pts[pts.length - 1], ex = last.length === 4 ? last[2] : last[0], ey = last.length === 4 ? last[3] : last[1];
    var prev = last.length === 4 ? [last[0], last[1]] : (pts[pts.length - 2].length === 4 ? [pts[pts.length - 2][2], pts[pts.length - 2][3]] : pts[pts.length - 2]);
    var a = Math.atan2(ey - prev[1], ex - prev[0]), L = 12 / k;
    poly(ctx, [ex, ey, ex - Math.cos(a - 0.45) * L, ey - Math.sin(a - 0.45) * L, ex - Math.cos(a + 0.45) * L, ey - Math.sin(a + 0.45) * L]);
    ctx.fillStyle = col || '#ffffff'; ctx.fill();
    ctx.restore();
  }
  // 依高度表鋪地面: tops[col] = 頂面格列(row), 鋪到 rows-1
  function groundMap(ctx, tops, rows, theme, extra) {
    for (var c = 0; c < tops.length; c++) {
      if (tops[c] == null) continue;
      for (var r = tops[c]; r < rows; r++) {
        if (extra && extra(c, r)) continue;
        drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: r === tops[c], theme: theme });
      }
    }
  }

  function guidePage0(ctx, k) { // 衝到終點(草原縮小版), 場景 960x540 → ×0.5
    var s = 0.5;
    ctx.save(); ctx.scale(s, s);
    drawBackground(ctx);
    var tops = [], c;
    for (c = 0; c < 24; c++) tops.push(11);
    tops[9] = 10; tops[10] = 9; tops[11] = 9; tops[12] = 9; tops[13] = 10;
    groundMap(ctx, tops, 14, 'plain');
    drawPickup(ctx, { x: 260, y: 428, kind: 'wood', t: 0 });
    drawPickup(ctx, { x: 460, y: 348, kind: 'wood', t: 0.5 });
    drawBoar(ctx, { x: 680, y: 424, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
    drawGoal(ctx, { x: 880, y: 400, reached: false });
    drawPlayer(ctx, { x: 100, y: 418, cls: 'sword', facing: 1, pose: 'run', poseT: 0.05 });
    var kk = k * s;
    dashedRoute(ctx, [[124, 412], [250, 412], [340, 300, 452, 334], [560, 340, 600, 360], [690, 320, 760, 380], [840, 418]], kk, '#ffffff');
    label(ctx, '你', 100, 380, kk);
    label(ctx, '終點旗', 880, 340, kk);
    ctx.restore();
  }

  function miniFrame(ctx, x, y, w, h, k) {
    ctx.save(); rr(ctx, x, y, w, h, 8 / k); ctx.clip();
    ctx.translate(x, y);
  }
  function guidePage1(ctx, k) { // 四格操作
    var fw = 140, fh = 200, s = 1.25;
    for (var i = 0; i < 4; i++) {
      var fx = 8 + i * 148, fy = 10;
      miniFrame(ctx, fx, fy, fw, fh, k);
      ctx.save(); ctx.scale(s, s);
      ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, 112, 160);
      for (var c = 0; c < 3; c++) drawGround(ctx, { x: c * 40 + 20, y: 150, top: true, theme: 'plain' });
      if (i === 0) drawPlayer(ctx, { x: 56, y: 108, cls: 'sword', facing: 1, pose: 'run', poseT: 0.06 });
      if (i === 1) {
        drawPlayer(ctx, { x: 56, y: 62, cls: 'sword', facing: 1, pose: 'rise', poseT: 0.1 });
        ctx.fillStyle = 'rgba(220,220,200,0.7)'; circle(ctx, 46, 128, 3); ctx.fill(); circle(ctx, 66, 128, 3); ctx.fill();
      }
      if (i === 2) drawPlayer(ctx, { x: 30, y: 108, cls: 'sword', facing: 1, pose: 'slash', poseT: 0.04 });
      if (i === 3) {
        drawPoof(ctx, { x: 52, y: 116, t: 0.1, dur: 0.3, big: false });
        drawPlayer(ctx, { x: 90, y: 108, cls: 'sword', facing: 1, pose: 'dash', poseT: 0.08 });
      }
      ctx.restore();
      ctx.restore();
      rr(ctx, fx + 0.75, fy + 0.75, fw - 1.5, fh - 1.5, 8); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.uiLineHi; ctx.stroke();
      // 鍵帽貼在角色旁
      var px = 14 / k * 1.0;
      if (i === 0) { keycap(ctx, '←', fx + 34, fy + 70, px); keycap(ctx, '→', fx + 106, fy + 70, px); }
      if (i === 1) keycap(ctx, '↑', fx + 112, fy + 60, px);
      if (i === 2) keycap(ctx, 'Z', fx + 40, fy + 70, px);
      if (i === 3) keycap(ctx, 'X', fx + 112, fy + 70, px);
    }
  }

  function guidePage2(ctx, k) { // 過關後一直重播 → 素材飛進資訊列
    // 資訊列木材格(同遊戲內樣式)
    rr(ctx, 4, 6, 200, 40, 6); ctx.fillStyle = 'rgba(10,14,24,0.92)'; ctx.fill();
    ctx.save(); ctx.translate(-6, 6); hudCell(ctx, 'wood', 16, 13, 12.5, 1.25); ctx.restore();
    label(ctx, '12 → 13', 262, 26, k, PAL.select);
    // 已過關卡片
    var cx = 280, cy = 150;
    drawLevelCard(ctx, { x: cx, y: cy, index: 1, name: '草原', state: 'cleared', cost: null, stock: null, canAfford: true, rates: { wood: 12.5, stone: 4.1, time: 2.0, soul: 1.0 }, recordCls: 'sword', recordTime: 11.8, repairedCount: 0 });
    // 縮圖(局部放大, 非實際比例)
    ctx.save(); ctx.beginPath(); ctx.rect(cx + 8, cy + 8, 160, 90); ctx.clip();
    ctx.translate(cx + 8, cy + 8); ctx.scale(0.32, 0.32);
    drawBackground(ctx);
    for (var c = 0; c < 13; c++) { drawGround(ctx, { x: c * 40 + 20, y: 220, top: true, theme: 'plain' }); drawGround(ctx, { x: c * 40 + 20, y: 260, top: false, theme: 'plain' }); }
    drawFrog(ctx, { x: 420, y: 186, facing: -1, state: 'crouch', hit: false, brood: false });
    drawPlayer(ctx, { x: 232, y: 178, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1 });
    drawGoal(ctx, { x: 470, y: 160, reached: false });
    ctx.restore();
    drawCardOverlay(ctx, { x: cx, y: cy, accelLv: 0, newArea: false, selected: false });
    // 飛行路徑: 縮圖裡撿到木材的位置 → 資訊列木材圖示
    var sx = cx + 8 + 252 * 0.32, sy = cy + 8 + 188 * 0.32, ex = 30, ey = 26, qx = 200, qy = 10;
    ctx.save(); ctx.setLineDash([5 / k, 5 / k]); ctx.lineWidth = 2 / k; ctx.strokeStyle = 'rgba(239,192,127,0.8)';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(qx, qy, ex + 8, ey + 10); ctx.stroke(); ctx.restore();
    function qp(t) { var a = 1 - t; return [a * a * sx + 2 * a * t * qx + t * t * ex, a * a * sy + 2 * a * t * qy + t * t * ey]; }
    var p1 = qp(0.55);
    ctx.save(); ctx.translate(p1[0], p1[1]); ctx.scale(1.4, 1.4);
    // 拖尾朝向飛行反方向(往縮圖那側)
    var p0 = qp(0.45), dx = p0[0] - p1[0], dy = p0[1] - p1[1], d = Math.hypot(dx, dy) || 1;
    for (var i = 3; i >= 1; i--) { circle(ctx, dx / d * i * 7, dy / d * i * 7, 6 - i * 1.3); ctx.fillStyle = PAL.wood; ctx.globalAlpha = 0.5 - i * 0.12; ctx.fill(); }
    ctx.globalAlpha = 1; matIcon(ctx, 'wood', 0, 0, 18);
    ctx.restore();
    matIcon(ctx, 'wood', sx, sy, 10);
  }

  // 第 4 頁共用小關卡(640x360)
  function miniLevel(ctx, route) {
    drawBackground(ctx);
    var c;
    for (c = 0; c < 16; c++) drawGround(ctx, { x: c * 40 + 20, y: 340, top: true, theme: 'plain' });
    drawGround(ctx, { x: 180, y: 300, top: true, theme: 'plain' }); // 台階: 頂 280
    for (c = 5; c < 10; c++) drawGround(ctx, { x: c * 40 + 20, y: 220, top: true, theme: 'plain' }); // 平台: 頂 200, 底 240(離地 80)
    drawPickup(ctx, { x: 110, y: 308, kind: 'wood', t: 0 });
    drawPickup(ctx, { x: 236, y: 188, kind: 'wood', t: 0.3 });
    drawPickup(ctx, { x: 280, y: 188, kind: 'stone', t: 0.6 });
    drawPickup(ctx, { x: 380, y: 188, kind: 'time', t: 0.9 });
    drawFrog(ctx, { x: 330, y: 186, facing: -1, state: 'crouch', hit: false, brood: false });
    drawBoar(ctx, { x: 490, y: 304, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
    drawGoal(ctx, { x: 600, y: 280, reached: false });
    drawPlayer(ctx, { x: 50, y: 298, cls: 'sword', facing: 1, pose: 'idle', poseT: 0 });
  }
  function guidePage3(ctx, k) {
    var s = 270 / 640, fh = 360 * s;
    var labels = ['素材多 / 秒數長', '素材少 / 秒數短'];
    for (var i = 0; i < 2; i++) {
      var fx = 6 + i * 278, fy = 6;
      ctx.save(); rr(ctx, fx, fy, 270, fh, 6); ctx.clip(); ctx.translate(fx, fy); ctx.scale(s, s);
      miniLevel(ctx);
      var kk = k * s;
      if (i === 0) dashedRoute(ctx, [[74, 290], [120, 296], [150, 240, 186, 270], [196, 190, 246, 176], [330, 140, 400, 176], [440, 230, 486, 282], [540, 300], [586, 290]], kk, '#ffe066');
      else dashedRoute(ctx, [[74, 296], [130, 300], [180, 240, 214, 296], [420, 300], [490, 220, 556, 296], [586, 296]], kk, '#9ef3ff');
      ctx.restore();
      rr(ctx, fx + 0.75, fy + 0.75, 268.5, fh - 1.5, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.uiLineHi; ctx.stroke();
      label(ctx, labels[i], fx + 135, fy + fh + 22, k, i === 0 ? '#ffe066' : '#9ef3ff');
    }
  }

  // 第 5 頁: 草原小丘腳下的地洞(320x280, 格 40)
  function holeScene(ctx, repaired, t) {
    drawBackground(ctx);
    var r, c;
    for (c = 0; c < 2; c++) for (r = 4; r < 7; r++) drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: r === 4, theme: 'plain' });
    for (c = 2; c < 8; c++) {
      drawGround(ctx, { x: c * 40 + 20, y: 20, top: true, theme: 'plain' });
      for (r = 4; r < 7; r++) drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: false, theme: 'plain' });
    }
    ctx.fillStyle = 'rgba(10,8,14,0.35)'; ctx.fillRect(80, 40, 240, 120); // 洞內陰影
    for (r = 1; r < 4; r++) drawWorksite(ctx, { x: 100, y: r * 40 + 20, kind: 'rubble', repaired: repaired, theme: 'plain', end: false, bottom: false });
    if (repaired) {
      drawPickup(ctx, { x: 150, y: 148, kind: 'wood', t: 0 });
      drawPickup(ctx, { x: 196, y: 148, kind: 'stone', t: 0.4 });
      drawPickup(ctx, { x: 236, y: 148, kind: 'wood', t: 0.8 });
      drawChest(ctx, { x: 288, y: 142, open: false });
    } else {
      drawFog(ctx, { x: 120, y: 40, w: 200, h: 120, alpha: 1, t: t });
      drawSiteSign(ctx, { x: 46, y: 136, role: 'treasure' });
    }
  }
  function guidePage4(ctx, k) {
    var s = 0.75, fw = 320 * s, fh = 280 * s;
    for (var i = 0; i < 2; i++) {
      var fx = 4 + i * 312, fy = 5;
      ctx.save(); rr(ctx, fx, fy, fw, fh, 6); ctx.clip(); ctx.translate(fx, fy); ctx.scale(s, s);
      holeScene(ctx, i === 1, 0);
      ctx.restore();
      rr(ctx, fx + 0.75, fy + 0.75, fw - 1.5, fh - 1.5, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.uiLineHi; ctx.stroke();
    }
    // 左格角下的石料圖示(修工程花石料)
    circle(ctx, 4 + fw - 20, 5 + fh - 20, 15); ctx.fillStyle = 'rgba(10,14,24,0.85)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.stone; ctx.stroke();
    matIcon(ctx, 'stone', 4 + fw - 20, 5 + fh - 20, 20);
    // 中間箭頭
    poly(ctx, [254, 98, 284, 98, 284, 86, 306, 110, 284, 134, 284, 122, 254, 122]);
    ctx.fillStyle = PAL.select; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a2a00'; ctx.stroke();
  }

  function drawGuidePage(ctx, st) {
    st = obj(st);
    var page = Math.round(clamp(num(st.page, 0), 0, GUIDE_SIZE.length - 1));
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, GUIDE_SIZE[page][0]), 10, 1280), h = clamp(num(st.h, GUIDE_SIZE[page][1]), 10, 720);
    var vw = GUIDE_SIZE[page][0], vh = GUIDE_SIZE[page][1];
    var k = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2); ctx.scale(k, k);
    [guidePage0, guidePage1, guidePage2, guidePage3, guidePage4][page](ctx, k);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: PAL,
    themes: THEMES,
    guideSizes: GUIDE_SIZE,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawLairBack: drawLairBack,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawWorksite: drawWorksite,
    drawNestGate: drawNestGate,
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
