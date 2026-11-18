/* 廢墟復興 — 美術(deepen-2 / game-c)
 * 全部用 Canvas 2D 幾何繪製, 不引外部資源。全域物件 window.Art, 不用 ES module。
 * 函式只負責「給我狀態, 我畫出來」, 不改任何遊戲狀態。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  // ---------------------------------------------------------------- 色票
  var C = {
    bgTop: '#9fb6cf', bgBot: '#d9e2e6', bgHill: '#b7c6cf',
    mapBg: '#18202e', mapGrid: '#202a3b',
    panel: '#1e2638', panelHi: '#2b3550', panelLine: '#4a5674',
    text: '#f4f1e8', textDim: '#9aa4b8', ink: '#141820',
    gold: '#f2c14e', select: '#ffffff', lack: '#ff6b6b', good: '#7cf08a',
    danger: '#ff4a4a',
    // 素材
    wood: '#f0b848', woodDark: '#b0742a', woodEnd: '#f8dc8c',
    brick: '#d4483a', brickHi: '#f07a62',
    time: '#4fd8f0', timeHi: '#d8fbff',
    soul: '#b57cff', soulHi: '#efe2ff',
    // 建築類別(道具類別共用)
    storage: '#5b8cff', lodge: '#58c46a', tower: '#f070d0',
    // 職業
    sword: '#4a7dff', hunter: '#3faa4a', bomber: '#ff8c2a',
    playerLine: '#ffffff', skin: '#ffd7ae', pants: '#2d3150',
    monLine: '#1e1418', monEye: '#ff2a2a',
    // 地形
    wallBase: '#d9c7a0', wallMortar: '#a8946c', wallBroken: '#8f8a82',
    crack: '#bdb8ae', rubble: '#6e655c',
    newArea: '#ffe14a'
  };

  var THEMES = {
    plain:  { body: '#8a5a34', dot: '#6e4526', top: '#6cc24a', topHi: '#a6e67a' },
    sky:    { body: '#7f93b8', dot: '#9fb0cf', top: '#eef4ff', topHi: '#ffffff' },
    rock:   { body: '#b4683a', dot: '#8e4e2a', top: '#e8b066', topHi: '#f6d49a' },
    swamp:  { body: '#3c4a32', dot: '#2c3826', top: '#4fa38a', topHi: '#86d4b8' },
    throne: { body: '#5a4a78', dot: '#463a60', top: '#e8c24a', topHi: '#fff0a8' }
  };

  var MAT_KINDS = ['wood', 'brick', 'time', 'soul'];
  var MAT_COL = { wood: C.wood, brick: C.brick, time: C.time, soul: C.soul };
  var MAT_USE = { wood: '開路', brick: '重建', time: '加速', soul: '強化' };

  var CLS = ['sword', 'hunter', 'bomber'];
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };

  var BTYPES = ['storage', 'lodge', 'tower'];
  var B_NAME = { storage: '倉庫', lodge: '獵寮', tower: '瞭望塔' };
  var B_ROOM = { storage: '裡面堆著素材', lodge: '裡面關著怪物', tower: '爬上屋頂拿時晶' };
  var B_FIT = { storage: '可裝: 貨袋', lodge: '可裝: 獵具', tower: '可裝: 拾荒籃' };

  var ITEMS = ['bagWood', 'bagBrick', 'bagTime', 'bagSoul', 'horn', 'soulHook', 'basket'];
  var ITEM_NAME = { bagWood: '木材袋', bagBrick: '磚瓦袋', bagTime: '時晶袋', bagSoul: '魂袋',
    horn: '獵人號角', soulHook: '魂鉤', basket: '拾荒籃' };
  var ITEM_EFFECT = { bagWood: '每次通關 +4 木材', bagBrick: '每次通關 +3 磚瓦', bagTime: '每次通關 +2 時晶',
    bagSoul: '每次通關 +2 獸魂', horn: '打倒怪物掉落 ×2', soulHook: '每打倒一隻 +1 獸魂', basket: '撿到的素材 +1' };
  var ITEM_CAT = { bagWood: 'storage', bagBrick: 'storage', bagTime: 'storage', bagSoul: 'storage',
    horn: 'lodge', soulHook: 'lodge', basket: 'tower' };
  var BAG_KIND = { bagWood: 'wood', bagBrick: 'brick', bagTime: 'time', bagSoul: 'soul' };

  // ---------------------------------------------------------------- 正規化
  function num(v, d) { v = +v; return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function st(s) { return (s && typeof s === 'object') ? s : {}; }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function nKind(k, allowSoul) { var l = allowSoul === false ? ['wood', 'brick', 'time'] : MAT_KINDS; return pick(k, l, 'wood'); }
  function nCls(c) { return pick(c, CLS, 'sword'); }
  function nBtype(b) { return pick(b, BTYPES, 'storage'); }
  function nItem(t) { return ITEMS.indexOf(t) >= 0 ? t : null; }
  function nTheme(t) { return THEMES[t] ? t : 'plain'; }
  function nFacing(f) { return num(f, 1) < 0 ? -1 : 1; }
  function matObj(o) {
    o = st(o);
    return { wood: num(o.wood, 0), brick: num(o.brick, 0), time: num(o.time, 0), soul: num(o.soul, 0) };
  }
  function fmt1(v) { v = num(v, 0); return (Math.round(v * 10) / 10).toFixed(1); }
  function fmtInt(v) { v = Math.floor(num(v, 0)); return String(clamp(v, -9999999, 99999999)); }
  function now() {
    if (typeof performance !== 'undefined' && performance && performance.now) return performance.now() / 1000;
    return Date.now() / 1000;
  }
  function curScale(ctx) {
    try {
      if (ctx.getTransform) {
        var m = ctx.getTransform();
        if (m && isFinite(m.a)) return Math.sqrt(m.a * m.a + m.b * m.b);
      }
    } catch (e) { /* ignore */ }
    return 1;
  }
  function ease(p) { p = clamp(p, 0, 1); return 1 - (1 - p) * (1 - p); }

  // ---------------------------------------------------------------- 小工具
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function font(size, bold) { return (bold ? 'bold ' : '') + Math.round(size) + 'px ' + FONT; }
  // 文字: o = { size, color, align, base, bold, stroke, lw, max }
  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = font(o.size || 14, o.bold);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.lw || 3;
      ctx.strokeStyle = o.stroke;
      if (o.max) ctx.strokeText(String(s), x, y, o.max); else ctx.strokeText(String(s), x, y);
    }
    ctx.fillStyle = o.color || C.text;
    if (o.max) ctx.fillText(String(s), x, y, o.max); else ctx.fillText(String(s), x, y);
  }
  function textW(ctx, s, size, bold) {
    ctx.font = font(size, bold);
    var m = ctx.measureText(String(s));
    return (m && isFinite(m.width)) ? m.width : String(s).length * size;
  }
  function hash(a, b) {
    var h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return h - Math.floor(h);
  }
  function panelBox(ctx, x, y, w, h, o) {
    o = o || {};
    rr(ctx, x, y, w, h, o.r == null ? 12 : o.r);
    ctx.fillStyle = o.fill || C.panel;
    ctx.fill();
    ctx.lineWidth = o.lw || 2;
    ctx.strokeStyle = o.line || C.panelLine;
    ctx.stroke();
  }
  function keycap(ctx, label, cx, cy, size, o) {
    o = o || {};
    var w = Math.max(size, textW(ctx, label, size * 0.55, true) + size * 0.5);
    rr(ctx, cx - w / 2, cy - size / 2, w, size, size * 0.2);
    ctx.fillStyle = o.fill || '#f4f1e8';
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.strokeStyle = '#141820';
    ctx.stroke();
    text(ctx, label, cx, cy + size * 0.02, { size: size * 0.55, bold: true, color: '#141820', align: 'center' });
    return w;
  }
  function hint(ctx, s, x, y, o) {
    // 按鍵提示: 開頭的鍵名做成鍵帽, 其餘文字; s 形如 'Z 出發'
    o = o || {};
    var size = o.size || 14;
    var parts = String(s).split(' ');
    var key = parts.shift();
    var rest = parts.join(' ');
    var kw = Math.max(size * 1.4, textW(ctx, key, size * 0.8, true) + size * 0.7);
    var tw = textW(ctx, rest, size, true);
    var total = kw + 6 + tw;
    var x0 = o.align === 'center' ? x - total / 2 : (o.align === 'right' ? x - total : x);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    keycap(ctx, key, x0 + kw / 2, y, size * 1.4);
    text(ctx, rest, x0 + kw + 6, y, { size: size, bold: true, color: o.color || C.text });
    ctx.restore();
    return total;
  }

  // ---------------------------------------------------------------- 素材圖示(地上、資訊列、飛行、浮字、面板共用)
  function matIcon(ctx, kind, cx, cy, s) {
    kind = nKind(kind);
    ctx.save();
    ctx.translate(cx, cy);
    var sc = s / 24;
    ctx.scale(sc, sc);
    var vis = curScale(ctx);
    if (vis < 0.2) {
      // 縮圖: 簡化色塊(保留三種顏色可分)
      ctx.fillStyle = MAT_COL[kind];
      ctx.fillRect(-10, -10, 20, 20);
      ctx.restore();
      return;
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#1a1622';
    if (kind === 'wood') {
      // 圓木: 側面 + 年輪端面
      rr(ctx, -11, -6.5, 18, 13, 5);
      ctx.fillStyle = C.woodDark; ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.wood;
      ctx.fillRect(-9, -4.5, 14, 4);
      ctx.beginPath(); ctx.ellipse(6, 0, 5, 6.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.woodEnd; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, 0, 2.4, 3.2, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.2; ctx.strokeStyle = C.woodDark; ctx.stroke();
    } else if (kind === 'brick') {
      // 兩塊錯疊的磚
      ctx.fillStyle = C.brick;
      rr(ctx, -11, -1, 22, 9, 1.5); ctx.fill(); ctx.stroke();
      rr(ctx, -7, -9.5, 15, 8, 1.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.brickHi;
      ctx.fillRect(-9.5, 0.5, 19, 2);
      ctx.fillRect(-5.5, -8, 12, 1.8);
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 8);
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#7a2018'; ctx.stroke();
    } else if (kind === 'time') {
      // 菱形晶體
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(8.5, -2); ctx.lineTo(0, 11); ctx.lineTo(-8.5, -2); ctx.closePath();
      ctx.fillStyle = C.time; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(-8.5, -2); ctx.lineTo(0, 1); ctx.closePath();
      ctx.fillStyle = C.timeHi; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8.5, -2); ctx.lineTo(8.5, -2);
      ctx.lineWidth = 1; ctx.strokeStyle = '#1a6f80'; ctx.stroke();
    } else {
      // 獸魂: 紫色魂火
      ctx.beginPath();
      ctx.moveTo(0, -11.5);
      ctx.bezierCurveTo(4, -6, 9, -2, 8.5, 3);
      ctx.arc(0, 3, 8.5, 0, Math.PI, false);
      ctx.bezierCurveTo(-9, -3, -3, -5, 0, -11.5);
      ctx.closePath();
      ctx.fillStyle = C.soul; ctx.fill(); ctx.stroke();
      circle(ctx, 0, 4, 4.2); ctx.fillStyle = C.soulHi; ctx.fill();
      ctx.fillStyle = '#3a1a66';
      ctx.fillRect(-2.2, 2.6, 1.4, 2.4); ctx.fillRect(0.8, 2.6, 1.4, 2.4);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 類別標誌 / 職業圖示 / 鎖 / 道具圖示
  function emblem(ctx, btype, cx, cy, s, col, lw) {
    btype = nBtype(btype);
    ctx.save();
    ctx.translate(cx, cy);
    var k = s / 16;
    ctx.scale(k, k);
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = (lw || 2) / k; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (btype === 'storage') {
      // 貨箱
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
    } else if (btype === 'lodge') {
      // 獸爪印
      ctx.beginPath(); ctx.ellipse(0, 3, 4.6, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      circle(ctx, -5, -3, 2.1); ctx.fill();
      circle(ctx, 0, -5.6, 2.1); ctx.fill();
      circle(ctx, 5, -3, 2.1); ctx.fill();
    } else {
      // 瞭望之眼
      ctx.beginPath();
      ctx.moveTo(-7, 0); ctx.quadraticCurveTo(0, -8, 7, 0); ctx.quadraticCurveTo(0, 8, -7, 0); ctx.closePath();
      ctx.stroke();
      circle(ctx, 0, 0, 2.4); ctx.fill();
    }
    ctx.restore();
  }

  function clsIcon(ctx, cls, cx, cy, r) {
    cls = nCls(cls);
    ctx.save();
    ctx.translate(cx, cy);
    var k = r / 10;
    ctx.scale(k, k);
    circle(ctx, 0, 0, 9.2);
    ctx.fillStyle = C[cls]; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = C.playerLine; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = 1.8;
    if (cls === 'sword') {
      ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(4.5, -4.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, 1); ctx.lineTo(-1, 5); ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(-2, 0, 6, -1.1, 1.1); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0.8, -5.3); ctx.lineTo(0.8, 5.3); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(5.5, 0); ctx.stroke();
    } else {
      circle(ctx, -1, 1.5, 4.2); ctx.fillStyle = '#1b1b22'; ctx.fill();
      ctx.lineWidth = 1.1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.5, -2); ctx.quadraticCurveTo(3, -5, 5, -5); ctx.stroke();
      circle(ctx, 5.4, -5.4, 1.3); ctx.fillStyle = '#ffd84a'; ctx.fill();
    }
    ctx.restore();
  }

  function lockIcon(ctx, cx, cy, s, col) {
    ctx.save();
    ctx.translate(cx, cy);
    var k = s / 24;
    ctx.scale(k, k);
    ctx.lineWidth = 2.6; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(0, -3, 5.5, Math.PI, 0); ctx.lineTo(5.5, 0); ctx.moveTo(-5.5, 0); ctx.lineTo(-5.5, -3); ctx.stroke();
    rr(ctx, -8, -1, 16, 12, 2.5); ctx.fillStyle = col; ctx.fill();
    circle(ctx, 0, 4, 1.8); ctx.fillStyle = '#1a1e2a'; ctx.fill();
    ctx.fillRect(-0.8, 4, 1.6, 4);
    ctx.restore();
  }

  function itemGlyph(ctx, type) {
    // 在 32 單位格內畫道具主體(不含底框)
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (BAG_KIND[type]) {
      // 貨袋: 束口麻袋 + 對應素材小圖示
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.quadraticCurveTo(-12, -2, -11, 6);
      ctx.quadraticCurveTo(-10, 12, 0, 12);
      ctx.quadraticCurveTo(10, 12, 11, 6);
      ctx.quadraticCurveTo(12, -2, 4, -8);
      ctx.closePath();
      ctx.fillStyle = '#e8d5a8'; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#4a3a22'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(0, -12); ctx.lineTo(5, -9); ctx.closePath();
      ctx.fillStyle = '#e8d5a8'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(5, -8); ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a2a'; ctx.stroke();
      matIcon(ctx, BAG_KIND[type], 0, 3, 13);
    } else if (type === 'horn') {
      // 獵人號角
      ctx.beginPath();
      ctx.moveTo(-11, 9);
      ctx.quadraticCurveTo(-4, 2, 2, -4);
      ctx.lineTo(10, -11);
      ctx.lineTo(12, -3);
      ctx.lineTo(5, 1);
      ctx.quadraticCurveTo(-3, 8, -9, 12);
      ctx.closePath();
      ctx.fillStyle = '#f2e6c8'; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#4a3a22'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(1, 6); ctx.moveTo(2, -3); ctx.lineTo(6, 1);
      ctx.lineWidth = 2; ctx.strokeStyle = '#a0662a'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(11, -7, 2, 4.3, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#5a4020'; ctx.fill();
    } else if (type === 'soulHook') {
      // 魂鉤: 鐵鉤 + 魂火
      ctx.beginPath();
      ctx.moveTo(-2, -12); ctx.lineTo(-2, 4);
      ctx.arc(-7.5, 4, 5.5, 0, Math.PI * 0.95, false);
      ctx.lineWidth = 4.4; ctx.strokeStyle = '#2a2e38'; ctx.stroke();
      ctx.lineWidth = 2.6; ctx.strokeStyle = '#d8dee8'; ctx.stroke();
      matIcon(ctx, 'soul', 6, 0, 15);
    } else if (type === 'basket') {
      // 拾荒籃
      ctx.beginPath(); ctx.arc(0, -1, 9, Math.PI, 0);
      ctx.lineWidth = 2.2; ctx.strokeStyle = '#8a5a2a'; ctx.stroke();
      matIcon(ctx, 'time', -4, -3, 10);
      matIcon(ctx, 'wood', 4, -2, 10);
      ctx.beginPath();
      ctx.moveTo(-12, -1); ctx.lineTo(12, -1); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.closePath();
      ctx.fillStyle = '#d2a05e'; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#4a3a22'; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10.5, 4); ctx.lineTo(10.5, 4); ctx.moveTo(-9.5, 8.5); ctx.lineTo(9.5, 8.5);
      ctx.moveTo(-4, -1); ctx.lineTo(-3.5, 12); ctx.moveTo(4, -1); ctx.lineTo(3.5, 12);
      ctx.lineWidth = 1; ctx.strokeStyle = '#8a5a2a'; ctx.stroke();
    }
  }

  function itemIcon(ctx, type, cx, cy, s) {
    type = nItem(type);
    ctx.save();
    ctx.translate(cx, cy);
    var k = s / 32;
    ctx.scale(k, k);
    var cat = type ? ITEM_CAT[type] : 'storage';
    if (curScale(ctx) < 0.2) {
      ctx.fillStyle = C[cat]; ctx.fillRect(-15, -15, 30, 30);
      if (type) { ctx.fillStyle = BAG_KIND[type] ? MAT_COL[BAG_KIND[type]] : '#f2e6c8'; ctx.fillRect(-7, -7, 14, 14); }
      ctx.restore();
      return;
    }
    rr(ctx, -15, -15, 30, 30, 6);
    ctx.fillStyle = '#1d2130'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = C[cat]; ctx.stroke();
    if (type) itemGlyph(ctx, type);
    ctx.restore();
  }

  // 建築小圖(面板用)
  function buildingPict(ctx, btype, cx, cy, s, repaired) {
    btype = nBtype(btype);
    ctx.save();
    ctx.translate(cx, cy);
    var k = s / 48;
    ctx.scale(k, k);
    var col = repaired ? C[btype] : '#7a7c84';
    var wall = repaired ? C.wallBase : C.wallBroken;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2; ctx.strokeStyle = '#141820';
    if (btype === 'storage') {
      ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(0, -20); ctx.lineTo(22, -4); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.fillStyle = wall; ctx.fillRect(-19, -4, 38, 26); ctx.strokeRect(-19, -4, 38, 26);
      ctx.fillStyle = '#3d4a66'; ctx.fillRect(-7, 6, 14, 16);
      emblem(ctx, 'storage', 0, -9, 10, '#ffffff', 1.5);
    } else if (btype === 'lodge') {
      ctx.beginPath(); ctx.moveTo(-24, -2); ctx.lineTo(-14, -16); ctx.lineTo(14, -16); ctx.lineTo(24, -2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.fillStyle = repaired ? '#9a6a3c' : '#77736c'; ctx.fillRect(-21, -2, 42, 24); ctx.strokeRect(-21, -2, 42, 24);
      ctx.beginPath();
      for (var i = -14; i <= 14; i += 7) { ctx.moveTo(i, 2); ctx.lineTo(i, 22); }
      ctx.lineWidth = 1.5; ctx.stroke();
      emblem(ctx, 'lodge', 0, -9, 10, '#ffffff', 1.5);
    } else {
      ctx.fillStyle = wall; ctx.fillRect(-9, -14, 18, 36); ctx.strokeRect(-9, -14, 18, 36);
      ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(0, -23); ctx.lineTo(12, -14); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, -24);
      ctx.stroke();
      ctx.fillStyle = '#454a60'; ctx.fillRect(-3, -6, 6, 8);
      emblem(ctx, 'tower', 0, 12, 10, col, 1.6);
    }
    if (!repaired) {
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-1, 6); ctx.lineTo(-5, 12); ctx.lineTo(1, 20);
      ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a2e'; ctx.stroke();
    }
    ctx.restore();
  }

  // 花費列: 只畫 > 0 的種類; 不足那種數字變紅並畫紅底線。回傳總寬
  function costRow(ctx, cost, stock, x, y, o) {
    o = o || {};
    cost = matObj(cost); stock = matObj(stock);
    var size = o.size || 14, ic = o.icon || size + 4, gap = o.gap || 10;
    var parts = [];
    var total = 0;
    MAT_KINDS.forEach(function (k) {
      if (cost[k] > 0) {
        var s = fmtInt(cost[k]);
        var w = ic + 3 + textW(ctx, s, size, true);
        parts.push({ k: k, s: s, w: w, lack: stock[k] < cost[k] });
        total += w;
      }
    });
    total += Math.max(0, parts.length - 1) * gap;
    var cx = o.align === 'center' ? x - total / 2 : (o.align === 'right' ? x - total : x);
    parts.forEach(function (p) {
      matIcon(ctx, p.k, cx + ic / 2, y, ic);
      var tx = cx + ic + 3;
      text(ctx, p.s, tx, y, { size: size, bold: true, color: p.lack ? C.lack : C.text });
      if (p.lack) {
        ctx.fillStyle = C.lack;
        ctx.fillRect(tx, y + size * 0.55, p.w - ic - 3, 2);
      }
      cx += p.w + gap;
    });
    return total;
  }

  // ---------------------------------------------------------------- 背景
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bgTop); g.addColorStop(1, C.bgBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 遠山(低對比, 不搶戲)
    ctx.fillStyle = C.bgHill;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var i = 0; i <= 16; i++) {
      var x = i * 80;
      ctx.lineTo(x, 470 + Math.sin(i * 1.3) * 40 + Math.cos(i * 0.7) * 30);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 遠方廢墟剪影
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#8796a6';
    [[140, 60], [420, 90], [760, 70], [1060, 100]].forEach(function (p) {
      ctx.fillRect(p[0], 470 - p[1], 36, p[1] + 40);
      ctx.fillRect(p[0] + 44, 470 - p[1] * 0.6, 26, p[1] * 0.6 + 40);
    });
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b2434'); g.addColorStop(1, '#141a26');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.mapGrid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 40); ctx.lineTo(x + 0.5, H); }
    for (var y = 40; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    // 淡淡的地形斑塊
    ctx.globalAlpha = 0.18;
    [[230, 380, 260, 160, '#3a5a3a'], [700, 260, 300, 220, '#3a4a6a'], [1140, 360, 200, 200, '#5a4a3a']].forEach(function (b) {
      ctx.beginPath(); ctx.ellipse(b[0], b[1], b[2], b[3], 0, 0, Math.PI * 2); ctx.fillStyle = b[4]; ctx.fill();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 地形
  function drawGround(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), th = THEMES[nTheme(s.theme)];
    var themeName = nTheme(s.theme);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = th.body;
    ctx.fillRect(-20, -20, 40, 40);
    if (curScale(ctx) >= 0.2) {
      // 紋理
      ctx.fillStyle = th.dot;
      if (themeName === 'rock') {
        ctx.fillRect(-20, -2, 40, 2); ctx.fillRect(-20, 11, 40, 2);
      } else if (themeName === 'throne') {
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(10, 4); ctx.lineTo(0, 16); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
      } else if (themeName === 'sky') {
        ctx.fillRect(-14, 0, 18, 2); ctx.fillRect(2, 10, 14, 2);
      } else {
        for (var i = 0; i < 3; i++) {
          var hx = hash(x + i, y) * 30 - 15, hy = hash(y + i, x) * 24 - 6;
          circle(ctx, hx, hy, themeName === 'swamp' ? 2.6 : 2); ctx.fill();
        }
      }
    }
    if (s.top) {
      ctx.fillStyle = th.top;
      ctx.fillRect(-20, -20, 40, 8);
      if (themeName === 'plain' || themeName === 'swamp' || themeName === 'sky') {
        // 圓弧草叢 / 苔 / 雲邊(不用尖角, 尖角保留給尖刺)
        circle(ctx, -10, -12, 4); ctx.fill();
        circle(ctx, 6, -12, 3.5); ctx.fill();
      }
      ctx.fillStyle = th.topHi;
      ctx.fillRect(-20, -20, 40, 2);
      if (themeName === 'throne') {
        ctx.fillStyle = '#a07a1a';
        ctx.fillRect(-20, -13, 40, 1.5);
      }
    }
    ctx.restore();
  }

  function drawBuilding(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    var w = clamp(num(s.w, 240), 40, 320), h = clamp(num(s.h, 160), 40, 360);
    var bt = nBtype(s.btype), ok = s.repaired === true, t = num(s.t, 0);
    var cat = C[bt];
    var simple = curScale(ctx) < 0.2;
    ctx.save();
    // 內部背牆
    var back = ok ? { storage: '#3d4a66', lodge: '#4a3828', tower: '#454a60' }[bt]
                  : { storage: '#4a4a52', lodge: '#4c4642', tower: '#4a4a52' }[bt];
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    if (!simple) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = ok ? '#232a3c' : '#36363c';
      ctx.lineWidth = 3;
      var i;
      if (bt === 'storage') {
        // 貨架橫板 + 箱子剪影
        ctx.beginPath();
        for (i = y + 40 + 28; i < y + h; i += 40) { ctx.moveTo(x, i); ctx.lineTo(x + w, i); }
        ctx.stroke();
        ctx.fillStyle = ok ? '#2c3650' : '#3c3c42';
        for (i = x + 48; i < x + w - 40; i += 56) ctx.fillRect(i, y + 46, 18, 20);
      } else if (bt === 'lodge') {
        // 直木板 + 柵欄
        ctx.beginPath();
        for (i = x + 14; i < x + w; i += 14) { ctx.moveTo(i, y); ctx.lineTo(i, y + h); }
        ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h - 52); ctx.lineTo(x + w, y + h - 52);
        ctx.lineWidth = 4; ctx.stroke();
      } else {
        // 石塊 + 窄窗
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (i = y + 20; i < y + h; i += 30) { ctx.moveTo(x, i); ctx.lineTo(x + w, i); }
        ctx.stroke();
        ctx.fillStyle = ok ? '#2a2e40' : '#3a3a40';
        for (i = y + 70; i < y + h - 40; i += 80) ctx.fillRect(x + w / 2 - 4, i, 8, 22);
      }
      ctx.globalAlpha = 1;
      if (ok) {
        // 類別色彩旗串(屋頂下)
        ctx.fillStyle = cat;
        ctx.globalAlpha = 0.55;
        for (i = x + 44; i < x + w - 44; i += 22) {
          ctx.beginPath(); ctx.moveTo(i, y + 42); ctx.lineTo(i + 14, y + 42); ctx.lineTo(i + 7, y + 52); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        // 破洞(露出淡色天光)與裂縫
        ctx.fillStyle = '#9fb2c6';
        var holes = [[0.3, 0.45], [0.72, 0.7]];
        holes.forEach(function (hh, n) {
          var hx = x + w * hh[0], hy = y + h * hh[1];
          ctx.beginPath();
          ctx.moveTo(hx - 12, hy - 4); ctx.lineTo(hx - 4, hy - 12); ctx.lineTo(hx + 9, hy - 9);
          ctx.lineTo(hx + 13, hy + 3); ctx.lineTo(hx + 4, hy + 11); ctx.lineTo(hx - 10, hy + 8); ctx.closePath();
          ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
          ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a2e'; ctx.stroke();
        });
        ctx.beginPath();
        ctx.moveTo(x + w * 0.55, y + 40); ctx.lineTo(x + w * 0.5, y + 70); ctx.lineTo(x + w * 0.58, y + 96);
        ctx.moveTo(x + w * 0.15, y + h - 40); ctx.lineTo(x + w * 0.22, y + h - 66);
        ctx.lineWidth = 2; ctx.strokeStyle = '#2a2a2e'; ctx.stroke();
      }
      ctx.restore();
    }
    // 外框上的裝飾(屋頂上方, 至多 24px)
    var cx = x + w / 2;
    if (simple) {
      ctx.fillStyle = ok ? cat : '#77777c';
      ctx.fillRect(cx - 20, y - 18, 40, 16);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(cx, y - 11);
    if (!ok) ctx.rotate(0.2);
    rr(ctx, -21, -8, 42, 16, 4);
    ctx.fillStyle = ok ? cat : '#77777c'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#141820'; ctx.stroke();
    emblem(ctx, bt, 0, 0, 13, ok ? '#ffffff' : '#4a4a50', 2);
    ctx.restore();
    if (bt === 'tower') {
      // 旗桿與旗
      var px = x + w - 16;
      ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y - 23);
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#3a3a44'; ctx.stroke();
      ctx.beginPath();
      if (ok) {
        var wv = Math.sin(t * 5) * 2.5;
        ctx.moveTo(px, y - 23); ctx.quadraticCurveTo(px - 9, y - 21 + wv, px - 18, y - 18 + wv);
        ctx.lineTo(px, y - 12); ctx.closePath();
        ctx.fillStyle = cat;
      } else {
        ctx.moveTo(px, y - 12); ctx.lineTo(px - 6, y - 4); ctx.lineTo(px - 2, y - 2); ctx.closePath();
        ctx.fillStyle = '#77777c';
      }
      ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#141820'; ctx.stroke();
    } else if (bt === 'lodge') {
      // 鹿角裝飾
      [-1, 1].forEach(function (sd) {
        var ax = cx + sd * 40;
        ctx.save();
        if (!ok && sd > 0) { ctx.restore(); return; }
        ctx.beginPath();
        ctx.moveTo(ax, y - 2); ctx.lineTo(ax + sd * 6, y - 16); ctx.lineTo(ax + sd * 12, y - 20);
        ctx.moveTo(ax + sd * 6, y - 16); ctx.lineTo(ax + sd * 2, y - 21);
        ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = ok ? '#e8dcc0' : '#8a8680'; ctx.stroke();
        ctx.restore();
      });
    } else {
      // 倉庫: 屋簷上兩個小貨箱
      ctx.fillStyle = ok ? '#c08a4a' : '#7a7670';
      ctx.fillRect(x + 14, y - 14, 14, 14); ctx.fillRect(x + w - 28, y - 14, 14, 14);
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#141820';
      ctx.strokeRect(x + 14, y - 14, 14, 14); ctx.strokeRect(x + w - 28, y - 14, 14, 14);
    }
    ctx.restore();
  }

  function drawBuildingWall(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), bt = nBtype(s.btype), ok = s.repaired === true;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.rect(-20, -20, 40, 40); ctx.clip();
    ctx.fillStyle = ok ? C.wallBase : C.wallBroken;
    ctx.fillRect(-20, -20, 40, 40);
    if (curScale(ctx) >= 0.2) {
      // 規則磚紋(和一般地面一眼分得出)
      ctx.strokeStyle = ok ? C.wallMortar : '#6c6862';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var r = 0; r < 4; r++) {
        var yy = -20 + r * 10;
        ctx.moveTo(-20, yy); ctx.lineTo(20, yy);
        var off = (r % 2) ? 0 : 10;
        ctx.moveTo(-20 + off + 0.5, yy); ctx.lineTo(-20 + off + 0.5, yy + 10);
        ctx.moveTo(off + 0.5, yy); ctx.lineTo(off + 0.5, yy + 10);
      }
      ctx.stroke();
      if (!ok) {
        // 缺角 + 裂縫
        ctx.fillStyle = '#3a3836';
        ctx.beginPath(); ctx.moveTo(20, -20); ctx.lineTo(6, -20); ctx.lineTo(13, -12); ctx.lineTo(20, -8); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-2, 2); ctx.lineTo(-6, 9); ctx.lineTo(1, 18);
        ctx.lineWidth = 2; ctx.strokeStyle = '#3a3836'; ctx.stroke();
      }
    }
    if (s.top) {
      ctx.fillStyle = ok ? C[bt] : '#6a6660';
      ctx.fillRect(-20, -20, 40, 7);
      ctx.fillStyle = ok ? '#ffffff' : '#8a8680';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-20, -20, 40, 2);
      ctx.globalAlpha = 1;
      if (!ok) { ctx.fillStyle = '#3a3836'; ctx.fillRect(4, -20, 12, 5); }
    }
    ctx.strokeStyle = 'rgba(20,24,32,0.55)'; ctx.lineWidth = 1;
    ctx.strokeRect(-19.5, -19.5, 39, 39);
    ctx.restore();
  }

  function drawDoorRubble(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.rect(-20, -20, 40, 40); ctx.clip();
    ctx.fillStyle = '#3a3532';
    ctx.fillRect(-20, -20, 40, 40);
    if (curScale(ctx) < 0.2) { ctx.fillStyle = C.rubble; ctx.fillRect(-16, -16, 32, 32); ctx.restore(); return; }
    ctx.lineWidth = 2; ctx.strokeStyle = '#1e1a18';
    // 大塊落石(圓潤、沒有裂痕)
    var rocks = [[-9, 9, 11, 10, '#7c7268'], [9, 10, 10, 9, '#6e655c'], [-2, -6, 13, 11, '#857a6e'], [-13, -14, 6, 5, '#6e655c'], [12, -12, 7, 7, '#7c7268']];
    rocks.forEach(function (r) {
      ctx.beginPath(); ctx.ellipse(r[0], r[1], r[2], r[3], 0, 0, Math.PI * 2);
      ctx.fillStyle = r[4]; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r[0] - r[2] * 0.3, r[1] - r[3] * 0.35, r[2] * 0.4, r[3] * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    });
    // 斷梁斜插
    ctx.save();
    ctx.rotate(-0.6);
    ctx.fillStyle = '#6a4626';
    ctx.fillRect(-20, -4, 40, 8);
    ctx.strokeRect(-20, -4, 40, 8);
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(14, 0);
    ctx.lineWidth = 1; ctx.strokeStyle = '#3e2810'; ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function drawBuildingSlot(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), bt = nBtype(s.btype), item = nItem(s.item);
    ctx.save();
    ctx.translate(x, y);
    var cat = C[bt];
    if (curScale(ctx) < 0.2) {
      ctx.fillStyle = cat; ctx.fillRect(-18, -18, 36, 36);
      ctx.fillStyle = item ? (BAG_KIND[item] ? MAT_COL[BAG_KIND[item]] : '#f2e6c8') : '#1d2130';
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
      return;
    }
    if (s.selected === true) {
      rr(ctx, -23, -23, 46, 46, 9);
      ctx.lineWidth = 2; ctx.strokeStyle = C.select; ctx.stroke();
    }
    rr(ctx, -18, -18, 36, 36, 7);
    ctx.fillStyle = '#1d2130'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = cat; ctx.stroke();
    if (item) {
      itemIcon(ctx, item, 0, 0, 28);
    } else {
      ctx.globalAlpha = 0.45;
      emblem(ctx, bt, 0, 0, 18, cat, 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawSpike(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#3a1a20';
    ctx.fillRect(-20, 15, 40, 5);
    ctx.lineJoin = 'round';
    for (var i = 0; i < 4; i++) {
      var bx = -20 + i * 10;
      ctx.beginPath(); ctx.moveTo(bx + 1, 16); ctx.lineTo(bx + 5, 1); ctx.lineTo(bx + 9, 16); ctx.closePath();
      ctx.fillStyle = C.danger; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a0a10'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 5, 3); ctx.lineTo(bx + 3.5, 14);
      ctx.lineWidth = 1; ctx.strokeStyle = '#ffd0d0'; ctx.stroke();
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), hp = clamp(Math.round(num(s.hp, 3)), 1, 3);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = C.crack;
    ctx.fillRect(-20, -20, 40, 40);
    if (curScale(ctx) < 0.2) {
      ctx.fillStyle = '#fff'; ctx.fillRect(-2, -16, 4, 32);
      ctx.restore(); return;
    }
    // 斜角(像一塊可以敲掉的岩板)
    ctx.fillStyle = '#d8d4cc'; ctx.fillRect(-20, -20, 40, 4); ctx.fillRect(-20, -20, 4, 40);
    ctx.fillStyle = '#8e8a82'; ctx.fillRect(-20, 16, 40, 4); ctx.fillRect(16, -20, 4, 40);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    function crack(pts) {
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#3a3632'; ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
    crack([-2, -16, 2, -6, -3, 2, 3, 12]);
    if (hp <= 2) { crack([-14, -8, -6, -2, -10, 8]); crack([3, 2, 10, 0, 14, -8]); }
    if (hp <= 1) {
      crack([-12, 14, -4, 8, 6, 14]); crack([8, -14, 12, -6]);
      ctx.fillStyle = '#4a4540';
      ctx.beginPath(); ctx.moveTo(16, -20); ctx.lineTo(20, -20); ctx.lineTo(20, -6); ctx.lineTo(12, -12); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawHookRing(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -30);
    ctx.lineWidth = 3; ctx.strokeStyle = '#5a4026'; ctx.stroke();
    circle(ctx, 0, 0, 8);
    ctx.lineWidth = 6; ctx.strokeStyle = '#1e2026'; ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#dfe6ee'; ctx.stroke();
    circle(ctx, 0, 0, 3); ctx.fillStyle = C.hunter; ctx.fill();
    ctx.restore();
  }

  function drawPickup(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
    var bob = Math.sin(t * 3 + x * 0.05) * 1.5;
    matIcon(ctx, nKind(s.kind, false), x, y + bob, 20);
  }

  function drawChest(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), open = s.open === true;
    ctx.save();
    ctx.translate(x, y); // 框 40x36, 底邊 y+18
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2; ctx.strokeStyle = '#2a1a10';
    if (curScale(ctx) < 0.2) {
      ctx.fillStyle = open ? '#6a5a4a' : '#ffcc33'; ctx.fillRect(-18, -8, 36, 26);
      ctx.restore(); return;
    }
    if (!open) {
      // 關著: 金亮、帶閃光
      rr(ctx, -17, -2, 34, 19, 3); ctx.fillStyle = '#c87a2a'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-17, -2); ctx.lineTo(-17, -9); ctx.quadraticCurveTo(0, -17, 17, -9); ctx.lineTo(17, -2); ctx.closePath();
      ctx.fillStyle = '#e09a3a'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd84a';
      ctx.fillRect(-11, -12, 4, 29); ctx.fillRect(7, -12, 4, 29);
      rr(ctx, -4, -5, 8, 9, 2); ctx.fill(); ctx.stroke();
      // 閃光(圓頭十字)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(13, -14, 1.5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(13, -14, 4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // 開著的空箱: 暗、蓋子往後掀
      ctx.beginPath(); ctx.moveTo(-17, -2); ctx.lineTo(-14, -16); ctx.lineTo(14, -16); ctx.lineTo(17, -2); ctx.closePath();
      ctx.fillStyle = '#5a4a3c'; ctx.fill(); ctx.stroke();
      rr(ctx, -17, -2, 34, 19, 3); ctx.fillStyle = '#6e5e4e'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#231a14'; ctx.fillRect(-14, -1, 28, 5);
      ctx.fillStyle = '#8a7c6a';
      ctx.fillRect(-11, 4, 4, 13); ctx.fillRect(7, 4, 4, 13);
    }
    ctx.restore();
  }

  function drawGoal(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), ok = s.reached === true;
    ctx.save();
    ctx.translate(x, y); // 40x80, 底 y+40
    ctx.fillStyle = '#5a5a66'; ctx.fillRect(-16, 32, 20, 8);
    ctx.fillStyle = '#d8dce4'; ctx.fillRect(-9, -38, 4, 72);
    circle(ctx, -7, -37, 3.5); ctx.fillStyle = ok ? C.gold : '#ffffff'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, -34); ctx.lineTo(19, -26); ctx.lineTo(-5, -12); ctx.closePath();
    ctx.fillStyle = ok ? C.gold : '#ffffff'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#141820'; ctx.stroke();
    if (curScale(ctx) >= 0.2) {
      if (ok) {
        ctx.beginPath(); ctx.moveTo(-1, -24); ctx.lineTo(3, -20); ctx.lineTo(10, -28);
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#2a6a2a'; ctx.stroke();
      } else {
        // 綠色圓點 = 這裡是終點
        circle(ctx, 3, -23, 4); ctx.fillStyle = '#3fbf5a'; ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 玩家
  function playerBody(ctx, cls, facing, pose, poseT, alphaFx) {
    // 原點在判定框中心, 28x44
    var col = C[cls];
    var run = pose === 'run' ? Math.sin(poseT * 18) : 0;
    var lean = { dash: 0.22, slash: 0.08, hurt: -0.22, throw: 0.06, wave: 0 }[pose] || 0;
    ctx.save();
    ctx.scale(facing, 1);
    // ----- 框外特效(在身體之下)
    if (alphaFx) {
      if (pose === 'slash' && poseT < 0.15) {
        var a = 1 - poseT / 0.15;
        ctx.save();
        ctx.globalAlpha *= a;
        ctx.beginPath();
        ctx.ellipse(18, 0, 45, 19, 0, -Math.PI / 2, Math.PI / 2, false);
        ctx.ellipse(18, 0, 28, 12, 0, Math.PI / 2, -Math.PI / 2, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(220,240,255,0.95)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
        ctx.restore();
      }
      if (pose === 'dash') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineCap = 'round';
        [[-12, 54, 3], [-2, 42, 2.5], [8, 56, 3], [16, 34, 2]].forEach(function (l) {
          ctx.beginPath(); ctx.moveTo(-16, l[0]); ctx.lineTo(-16 - l[1], l[0]);
          ctx.lineWidth = l[2]; ctx.stroke();
        });
        ctx.restore();
      }
    }
    ctx.rotate(lean);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腿
    var lx1 = -4, lx2 = 4, ly = 17.5, kneeA = 0;
    if (pose === 'run') { lx1 = -4 + run * 5; lx2 = 4 - run * 5; }
    if (pose === 'rise') { ly = 15; lx1 = -2; lx2 = 6; }
    if (pose === 'fall') { lx1 = -6; lx2 = 6; }
    if (pose === 'dash') { lx1 = -8; lx2 = 6; ly = 15; }
    if (pose === 'wave') { lx1 = -8; lx2 = 8; ly = 17; }
    function legs(outline) {
      ctx.beginPath();
      ctx.moveTo(-3, 8); ctx.lineTo(lx1, ly);
      ctx.moveTo(3, 8); ctx.lineTo(lx2, ly + kneeA);
      ctx.lineWidth = outline ? 9 : 5.5; ctx.strokeStyle = outline ? C.playerLine : C.pants; ctx.stroke();
    }
    // 手臂終點
    var hand = { x: 9, y: 4 };
    if (pose === 'slash' || pose === 'dash') hand = { x: 10, y: -4 };
    if (pose === 'shoot') hand = { x: 10, y: -5 };
    if (pose === 'hook') hand = { x: 6, y: -15 };
    if (pose === 'throw') hand = { x: 9, y: -12 };
    if (pose === 'fall') hand = { x: 8, y: -12 };
    if (pose === 'wave') hand = { x: 10, y: -1 };
    if (pose === 'hurt') hand = { x: -4, y: -10 };
    if (pose === 'run') hand = { x: 6 - run * 4, y: 5 };
    // 白描邊 pass
    legs(true);
    rr(ctx, -9.5, -7.5, 19, 19, 5); ctx.fillStyle = C.playerLine; ctx.fill();
    circle(ctx, 0, -12.5, 9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(hand.x, hand.y);
    ctx.lineWidth = 8; ctx.strokeStyle = C.playerLine; ctx.stroke();
    // 上色 pass
    legs(false);
    rr(ctx, -8, -6, 16, 16, 4); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-8, 6, 16, 3);
    circle(ctx, 0, -12.5, 7.5); ctx.fillStyle = C.skin; ctx.fill();
    // 頭部: 職業標記
    if (cls === 'bomber') {
      ctx.beginPath(); ctx.arc(0, -13, 8, Math.PI, 0); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      ctx.fillStyle = '#ffe08a'; ctx.fillRect(-1, -20, 2, 7);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(0, -21); ctx.lineTo(8, -14); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    } else {
      ctx.fillStyle = col; ctx.fillRect(-7.5, -17, 15, 3.5);
    }
    // 眼
    if (pose === 'hurt') {
      ctx.beginPath(); ctx.moveTo(2, -14); ctx.lineTo(6, -10); ctx.moveTo(6, -14); ctx.lineTo(2, -10);
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#141820'; ctx.stroke();
    } else {
      ctx.fillStyle = '#141820'; ctx.fillRect(3, -13.5, 2.4, 3.2);
    }
    // 手臂
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(hand.x, hand.y);
    ctx.lineWidth = 4.5; ctx.strokeStyle = col; ctx.stroke();
    circle(ctx, hand.x, hand.y, 2.6); ctx.fillStyle = C.skin; ctx.fill();
    // 武器
    if (cls === 'sword') {
      // slash: 劍往前平舉(刀光區內); dash: 劍拖在身後; 手舉高的姿勢: 劍收在背上; 其他: 劍尖朝下
      ctx.save();
      var sheathed = (pose === 'hook' || pose === 'throw' || pose === 'fall' || pose === 'hurt');
      var ang;
      if (pose === 'slash' && poseT < 0.15) { ctx.translate(hand.x, hand.y); ang = 0; }
      else if (pose === 'dash') { ctx.translate(hand.x, hand.y); ang = Math.PI - 0.25; }
      else if (sheathed) { ctx.translate(-9, -6); ang = 1.35; }
      else { ctx.translate(Math.min(hand.x, 10), hand.y); ang = 1.45; }
      ctx.rotate(ang);
      var bl = 13;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bl - 1, 0);
      ctx.lineWidth = 4.5; ctx.strokeStyle = '#1e2230'; ctx.stroke();
      ctx.lineWidth = 2.6; ctx.strokeStyle = '#e8eef8'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(1, 3);
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffd84a'; ctx.stroke();
      ctx.restore();
    } else if (cls === 'hunter') {
      var bx = Math.min(hand.x + 1, 10.5), by = hand.y;
      if (pose === 'hook') { bx = 9; by = 0; }
      ctx.beginPath(); ctx.arc(bx - 7, by, 9, -0.95, 0.95);
      ctx.lineWidth = 2.6; ctx.strokeStyle = '#7a4a1e'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - 7 + 9 * Math.cos(0.95), by - 9 * Math.sin(0.95));
      ctx.lineTo(bx - 7 + 9 * Math.cos(0.95), by + 9 * Math.sin(0.95));
      ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      if (pose === 'shoot') {
        ctx.beginPath(); ctx.moveTo(bx - 9, by); ctx.lineTo(13, by);
        ctx.lineWidth = 1.6; ctx.strokeStyle = '#f0e0c0'; ctx.stroke();
      }
      // 箭袋
      ctx.fillStyle = '#7a4a1e'; ctx.fillRect(-11, -6, 4, 12);
    } else {
      // 背後的炸彈包
      circle(ctx, -9, 1, 4.5); ctx.fillStyle = '#1b1b22'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      if (pose === 'throw' && poseT < 0.15) {
        circle(ctx, hand.x, hand.y - 3, 3.5); ctx.fillStyle = '#1b1b22'; ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPlayer(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    var pose = pick(s.pose, ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'shoot', 'hook', 'throw', 'wave', 'hurt'], 'idle');
    ctx.save();
    ctx.translate(x, y);
    if (s.invuln === true) ctx.globalAlpha *= (Math.floor(now() * 12) % 2) ? 0.3 : 0.9;
    if (curScale(ctx) < 0.2) {
      ctx.fillStyle = C.playerLine; ctx.fillRect(-14, -22, 28, 44);
      ctx.fillStyle = C[nCls(s.cls)]; ctx.fillRect(-10, -18, 20, 36);
    } else {
      playerBody(ctx, nCls(s.cls), nFacing(s.facing), pose, clamp(num(s.poseT, 0), 0, 1e6), true);
    }
    ctx.restore();
  }

  function drawRangeRing(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), r = clamp(num(s.radius, 260), 0, 260);
    ctx.save();
    ctx.setLineDash([10, 8]);
    circle(ctx, x, y, r - 1);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(63,170,74,0.6)'; ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, x, y, r - 1);
    ctx.fillStyle = 'rgba(63,170,74,0.05)'; ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- 怪物共用
  function mc(flash, c) { return flash ? '#ffffff' : c; }
  function monEye(ctx, x, y, r, mode) {
    if (mode === 'x') {
      ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#141820'; ctx.stroke();
      return;
    }
    if (mode === 'squint') {
      ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.6); ctx.lineTo(x + r * 0.6, y); ctx.lineTo(x - r, y + r * 0.6);
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#141820'; ctx.stroke();
      return;
    }
    circle(ctx, x, y, r); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = C.monLine; ctx.stroke();
    circle(ctx, x + r * 0.3, y, r * 0.55); ctx.fillStyle = C.monEye; ctx.fill();
  }
  // 擊飛速度線: 擊飛方向 = 面向反方向(local -x), 速度線畫在 local +x 側框外
  function flungLines(ctx, edgeX, ys) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineCap = 'round';
    ys.forEach(function (yy, i) {
      var len = [34, 24, 30, 20][i % 4];
      ctx.beginPath(); ctx.moveTo(edgeX + 3, yy); ctx.lineTo(edgeX + 3 + len, yy);
      ctx.lineWidth = 2.5; ctx.stroke();
    });
    ctx.restore();
  }
  function simpleMon(ctx, w, h, col) {
    ctx.fillStyle = C.monLine; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = col; ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  }

  function drawBoar(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), f = nFacing(s.facing), t = num(s.t, 0), fl = s.hit === true;
    var state = pick(s.state, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
    ctx.save();
    ctx.translate(x, y); // 48x32, 底 y+16
    if (curScale(ctx) < 0.2) { simpleMon(ctx, 48, 32, mc(fl, '#8a5232')); ctx.restore(); return; }
    ctx.scale(f, 1);
    if (state === 'flung') flungLines(ctx, 24, [-8, 2, 10]);
    if (state === 'stun') {
      // 頭上冒星(框外上方 ≤ 20px)
      for (var i = 0; i < 3; i++) {
        var a = t * 4 + i * 2.1;
        var sx = 8 + Math.cos(a) * 10, sy = -26 + Math.sin(a) * 4;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
        ctx.beginPath();
        for (var k = 0; k < 5; k++) {
          var ang = k * Math.PI * 2 / 5 - Math.PI / 2;
          ctx.lineTo(Math.cos(ang) * 4.5, Math.sin(ang) * 4.5);
          ctx.lineTo(Math.cos(ang + Math.PI / 5) * 2, Math.sin(ang + Math.PI / 5) * 2);
        }
        ctx.closePath(); ctx.fillStyle = '#ffe14a'; ctx.fill();
        ctx.restore();
      }
    }
    if (state === 'windup') {
      // 後腳揚塵
      ctx.fillStyle = 'rgba(200,190,170,0.85)';
      var p = (t * 3) % 1;
      circle(ctx, -16 - p * 3, 11 - p * 4, 2.5 + p * 1.5); ctx.fill();
      circle(ctx, -11 - p * 5, 12 - p * 2, 2.2); ctx.fill();
    }
    if (state === 'charge') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-23, -4); ctx.lineTo(-17, -4); ctx.moveTo(-23, 4); ctx.lineTo(-15, 4); ctx.stroke();
    }
    ctx.save();
    var rot = { windup: -0.12, charge: 0.1, flung: -0.4 }[state] || 0;
    if (state === 'flung') ctx.scale(0.8, 0.8);
    ctx.translate(0, 8); ctx.rotate(rot); ctx.translate(0, -8);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = C.monLine;
    // 腳
    var sw = state === 'walk' ? Math.sin(t * 12) * 2 : 0;
    ctx.fillStyle = mc(fl, '#4a2a18');
    [[-14, sw], [-7, -sw], [4, sw], [11, -sw]].forEach(function (l) { ctx.fillRect(l[0] + l[1], 8, 4, 7); });
    // 身體
    ctx.beginPath(); ctx.ellipse(-3, 2, 17, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = mc(fl, '#8a5232'); ctx.fill(); ctx.stroke();
    // 背鬃(圓弧)
    ctx.beginPath(); ctx.ellipse(-4, -6, 10, 3.5, 0, Math.PI, 0);
    ctx.fillStyle = mc(fl, '#5a3220'); ctx.fill();
    // 頭
    circle(ctx, 12, 1, 7.5); ctx.fillStyle = mc(fl, '#9a6040'); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(18.5, 3, 3.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = mc(fl, '#e8a0a0'); ctx.fill(); ctx.stroke();
    // 獠牙
    ctx.beginPath(); ctx.moveTo(16, 6); ctx.quadraticCurveTo(19, 7, 20, 2);
    ctx.lineWidth = 2.2; ctx.strokeStyle = '#fff6e0'; ctx.stroke();
    // 耳
    ctx.beginPath(); ctx.ellipse(9, -6, 2.5, 3.5, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = mc(fl, '#5a3220'); ctx.fill();
    // 眼
    monEye(ctx, 13, -1.5, 2.6, state === 'stun' ? 'x' : (state === 'flung' ? 'squint' : null));
    if (state === 'windup' || state === 'charge') {
      circle(ctx, 13.8, -1.5, 3.6); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,60,40,0.9)'; ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawShieldman(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), f = nFacing(s.facing), t = num(s.t, 0), fl = s.hit === true;
    var state = pick(s.state, ['walk', 'block', 'flung'], 'walk');
    ctx.save();
    ctx.translate(x, y); // 32x44, 底 y+22
    if (curScale(ctx) < 0.2) { simpleMon(ctx, 32, 44, mc(fl, '#6a5a7a')); ctx.fillStyle = '#e6e9ee'; ctx.fillRect(f > 0 ? 6 : -14, -16, 8, 30); ctx.restore(); return; }
    ctx.scale(f, 1);
    if (state === 'flung') flungLines(ctx, 16, [-12, 0, 12]);
    ctx.save();
    if (state === 'flung') { ctx.scale(0.82, 0.82); ctx.rotate(-0.35); }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var sw = state === 'walk' ? Math.sin(t * 8) * 3 : 0;
    // 腳
    ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(-4 + sw, 18); ctx.moveTo(3, 8); ctx.lineTo(3 - sw, 18);
    ctx.lineWidth = 7.5; ctx.strokeStyle = C.monLine; ctx.stroke();
    ctx.lineWidth = 4.5; ctx.strokeStyle = mc(fl, '#3a3046'); ctx.stroke();
    // 身體
    ctx.lineWidth = 2; ctx.strokeStyle = C.monLine;
    rr(ctx, -10, -6, 16, 16, 3); ctx.fillStyle = mc(fl, '#6a5a7a'); ctx.fill(); ctx.stroke();
    // 頭盔
    circle(ctx, -2, -13, 7); ctx.fillStyle = mc(fl, '#9aa3b0'); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1e1418'; ctx.fillRect(-1, -14.5, 7, 3);
    ctx.fillStyle = C.monEye; ctx.fillRect(2.5, -14, 2.5, 2);
    // 盾牌(面向側)
    var blk = state === 'block';
    rr(ctx, 4, -17, 11, 33, 4);
    ctx.fillStyle = blk ? '#fff6b0' : mc(fl, '#e6e9ee'); ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = blk ? '#ffb020' : '#3a3f4a'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9.5, -13); ctx.lineTo(9.5, 12);
    ctx.lineWidth = 2; ctx.strokeStyle = blk ? '#ffb020' : '#8a92a0'; ctx.stroke();
    circle(ctx, 9.5, -1, 2.6); ctx.fillStyle = blk ? '#ffffff' : '#5a6070'; ctx.fill();
    if (blk) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(12, -10); ctx.lineTo(14.5, -14); ctx.moveTo(13, 4); ctx.lineTo(15, 8); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawShooterBee(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), f = nFacing(s.facing), t = num(s.t, 0), fl = s.hit === true;
    var state = pick(s.state, ['fly', 'aim', 'flung'], 'fly');
    ctx.save();
    ctx.translate(x, y); // 32x32
    if (curScale(ctx) < 0.2) { simpleMon(ctx, 28, 24, mc(fl, '#ffd23a')); ctx.restore(); return; }
    ctx.scale(f, 1);
    if (state === 'flung') flungLines(ctx, 16, [-6, 2, 10]);
    ctx.save();
    if (state === 'flung') { ctx.scale(0.85, 0.85); ctx.rotate(-0.45); }
    ctx.lineJoin = 'round';
    // 翅膀
    var flap = state === 'aim' ? 0.5 : (0.5 + 0.5 * Math.sin(t * 40));
    ctx.fillStyle = 'rgba(235,245,255,0.85)'; ctx.strokeStyle = C.monLine; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-3, -9, 5, 3 + flap * 3.5, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(3, -9, 4, 2.5 + flap * 3, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 身體 + 條紋
    ctx.save();
    ctx.beginPath(); ctx.ellipse(-2, 2, 10.5, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = mc(fl, '#ffd23a'); ctx.fill();
    ctx.clip();
    ctx.fillStyle = mc(fl, '#2a2018');
    ctx.fillRect(-7, -8, 3.5, 20); ctx.fillRect(0, -8, 3.5, 20);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(-2, 2, 10.5, 8, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2; ctx.strokeStyle = C.monLine; ctx.stroke();
    // 尾針
    ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(-15.5, 3); ctx.lineTo(-12, 5); ctx.closePath();
    ctx.fillStyle = C.monLine; ctx.fill();
    // 頭
    circle(ctx, 9, 0, 5.5); ctx.fillStyle = mc(fl, '#3a2a20'); ctx.fill(); ctx.stroke();
    monEye(ctx, 10.5, -1, 2.3, state === 'flung' ? 'squint' : null);
    if (state === 'aim') {
      // 嘴前蓄一顆紅色蜂彈 + 收攏的瞄準環
      var p = (t * 2.5) % 1;
      circle(ctx, 12, 3, 2 + p * 1.2); ctx.fillStyle = C.danger; ctx.fill();
      circle(ctx, 12, 3, 3.4); ctx.lineWidth = 1.4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      // 身體外緣紅框 = 準備發射
      ctx.beginPath(); ctx.ellipse(-2, 2, 11.5, 9, 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.6; ctx.strokeStyle = C.danger; ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawFrog(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), f = nFacing(s.facing), fl = s.hit === true;
    var state = pick(s.state, ['crouch', 'jump', 'flung'], 'crouch');
    ctx.save();
    ctx.translate(x, y); // 32x28, 底 y+14
    if (curScale(ctx) < 0.2) { simpleMon(ctx, 32, 24, mc(fl, '#8fd13a')); ctx.restore(); return; }
    ctx.scale(f, 1);
    if (state === 'flung') flungLines(ctx, 16, [-4, 4, 10]);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = C.monLine;
    var body = mc(fl, '#8fd13a'), belly = mc(fl, '#e6f5b0'), dark = mc(fl, '#4f8a1e');
    if (state === 'crouch') {
      ctx.beginPath(); ctx.ellipse(-9, 9, 6, 4.5, 0, 0, Math.PI * 2); ctx.fillStyle = dark; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 4, 14, 8.5, 0, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(4, 8, 7, 3.5, 0, 0, Math.PI); ctx.fillStyle = belly; ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, 11, 3.5, 2, 0, 0, Math.PI * 2); ctx.fillStyle = dark; ctx.fill(); ctx.stroke();
      monEye(ctx, 4, -5, 3.6); monEye(ctx, 10.5, -4, 3);
      ctx.beginPath(); ctx.moveTo(6, 3); ctx.quadraticCurveTo(10, 5, 13.5, 2);
      ctx.lineWidth = 1.4; ctx.stroke();
    } else {
      if (state === 'flung') { ctx.scale(0.85, 0.85); ctx.rotate(-0.5); } else ctx.rotate(-0.25);
      // 伸長的後腿
      ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-11, 5); ctx.lineTo(-14, 5);
      ctx.lineWidth = 5.5; ctx.strokeStyle = C.monLine; ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = dark; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = C.monLine;
      ctx.beginPath(); ctx.ellipse(1, 0, 12, 7, 0, 0, Math.PI * 2); ctx.fillStyle = body; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(3, 3, 6, 3, 0, 0, Math.PI); ctx.fillStyle = belly; ctx.fill();
      monEye(ctx, 6, -7, 3.4, state === 'flung' ? 'squint' : null);
      ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(11, 9);
      ctx.lineWidth = 3; ctx.strokeStyle = dark; ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- 飛行物 / 特效
  function drawBeeShot(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    circle(ctx, x, y, 5.2); ctx.fillStyle = C.danger; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#3a0a10'; ctx.stroke();
    circle(ctx, x - 1, y - 1, 1.8); ctx.fillStyle = '#ffe0e0'; ctx.fill();
    ctx.restore();
  }

  function drawArrow(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), a = num(s.angle, 0);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(7, 0);
    ctx.lineWidth = 2; ctx.strokeStyle = '#f0e0c0'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -2.8); ctx.lineTo(6, 2.8); ctx.closePath();
    ctx.fillStyle = '#dfe6ee'; ctx.fill();
    ctx.fillStyle = C.hunter;
    ctx.beginPath(); ctx.moveTo(-12, -2.8); ctx.lineTo(-7, 0); ctx.lineTo(-12, 2.8); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBomb(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 8);
    circle(ctx, 0, 0.5, 5.6); ctx.fillStyle = '#1b1b22'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    circle(ctx, -1.8, -1.3, 1.6); ctx.fillStyle = '#6a6a7a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -4.3); ctx.lineTo(3.2, -5.3);
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#c8a060'; ctx.stroke();
    var sp = 1 + Math.abs(Math.sin(t * 30)) * 0.6;
    circle(ctx, 3.8, -5.6, sp); ctx.fillStyle = '#ffd84a'; ctx.fill();
    ctx.restore();
  }

  function drawExplosion(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), dur = Math.max(0.01, num(s.dur, 0.25));
    var R = clamp(num(s.radius, 60), 0, 60);
    var p = clamp(num(s.t, 0) / dur, 0, 1);
    if (p >= 1) return;
    var r = R * (0.45 + 0.55 * ease(p));
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.85;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#fff6c0'); g.addColorStop(0.45, '#ffb030'); g.addColorStop(0.85, '#ff5a20'); g.addColorStop(1, 'rgba(255,60,20,0)');
    circle(ctx, x, y, r); ctx.fillStyle = g; ctx.fill();
    circle(ctx, x, y, Math.max(0, r - 1.5));
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,140,40,0.9)'; ctx.stroke();
    ctx.restore();
  }

  function drawShockwave(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), dur = Math.max(0.01, num(s.dur, 0.3));
    var R = clamp(num(s.radius, 130), 0, 130);
    var p = clamp(num(s.t, 0) / dur, 0, 1);
    if (p >= 1) return;
    var r = R * ease(p); // 環外緣
    var lw = 7;
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.7;
    circle(ctx, x, y, r); ctx.fillStyle = 'rgba(200,220,255,0.08)'; ctx.fill();
    circle(ctx, x, y, Math.max(0, r - lw / 2));
    ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(225,235,255,0.9)'; ctx.stroke();
    circle(ctx, x, y, Math.max(0, r - lw - 2));
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(140,170,255,0.8)'; ctx.stroke();
    // 往外推的圓頭箭號
    if (r > 30) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4 + 0.39;
        var rr0 = r - lw - 12;
        var cx = x + Math.cos(a) * rr0, cy = y + Math.sin(a) * rr0;
        var ox = Math.cos(a), oy = Math.sin(a), px = -oy, py = ox;
        ctx.beginPath();
        ctx.moveTo(cx - ox * 5 + px * 5, cy - oy * 5 + py * 5);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - ox * 5 - px * 5, cy - oy * 5 - py * 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPoof(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), dur = Math.max(0.01, num(s.dur, 0.3));
    var p = clamp(num(s.t, 0) / dur, 0, 1);
    if (p >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    var e = ease(p);
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 + 0.3;
      var d = 4 + e * 12;
      var r = 7 - p * 3;
      circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r);
      ctx.fillStyle = i % 2 ? '#e8e4dc' : '#c8c2b8'; ctx.fill();
    }
    circle(ctx, x, y, 8 * (1 - p)); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  function drawPopup(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), dur = Math.max(0.01, num(s.dur, 0.8));
    var p = clamp(num(s.t, 0) / dur, 0, 1);
    if (p >= 1) return;
    var kind = nKind(s.kind);
    var v = clamp(Math.round(num(s.value, 1)), 0, 9999);
    var yy = y - 30 * ease(p);
    ctx.save();
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    var str = '+' + v;
    var tw = textW(ctx, str, 17, true);
    var total = 18 + 3 + tw;
    var x0 = x - total / 2;
    matIcon(ctx, kind, x0 + 9, yy, 18);
    text(ctx, str, x0 + 21, yy + 1, { size: 17, bold: true, color: '#ffffff', stroke: '#141820', lw: 4 });
    ctx.restore();
  }

  function drawChainText(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), dur = Math.max(0.01, num(s.dur, 0.8));
    var p = clamp(num(s.t, 0) / dur, 0, 1);
    if (p >= 1) return;
    var n = clamp(Math.round(num(s.n, 2)), 0, 999);
    var sc = p < 0.15 ? 0.8 + (p / 0.15) * 0.5 : (p < 0.3 ? 1.3 - (p - 0.15) / 0.15 * 0.3 : 1);
    var yy = y - (p > 0.3 ? 30 * ease((p - 0.3) / 0.7) : 0);
    ctx.save();
    ctx.translate(x, yy); ctx.scale(sc, sc);
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    text(ctx, n + ' 連鎖', 0, 0, { size: 24, bold: true, color: C.gold, stroke: '#2a1a08', lw: 5, align: 'center' });
    ctx.restore();
  }

  function drawItemIcon(ctx, s) {
    s = st(s);
    itemIcon(ctx, nItem(s.type), num(s.x, 0), num(s.y, 0), 32);
  }

  function drawItemNotice(ctx, s) {
    s = st(s);
    var type = nItem(s.type);
    var dur = Math.max(0.01, num(s.dur, 1.5)), t = clamp(num(s.t, 0), 0, dur);
    if (t >= dur) return;
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? (dur - t) / 0.3 : 1);
    var x = 440, y = 52;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    panelBox(ctx, x + 1, y + 1, 398, 42, { r: 10, fill: 'rgba(20,26,40,0.92)', line: type ? C[ITEM_CAT[type]] : C.gold, lw: 2 });
    itemIcon(ctx, type, x + 30, y + 22, 32);
    text(ctx, '獲得 ' + (type ? ITEM_NAME[type] : '道具'), x + 56, y + 23, { size: 20, bold: true, color: C.text });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 大地圖
  function drawMapLink(ctx, s) {
    s = st(s);
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0), lit = s.lit === true;
    var mx = (x1 + x2) / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (lit) {
      ctx.lineWidth = 7; ctx.strokeStyle = '#3a2e10'; ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = C.gold; ctx.stroke();
    } else {
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 3; ctx.strokeStyle = '#4a5468'; ctx.stroke();
    }
    ctx.restore();
  }

  function drawLevelCard(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    var state = pick(s.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed');
    var idx = clamp(Math.round(num(s.index, 1)), 0, 99);
    var name = s.name == null ? '' : String(s.name);
    ctx.save();
    panelBox(ctx, x + 1, y + 1, 174, 134, { r: 10, fill: '#273047', line: state === 'buyable' ? C.gold : '#46516c', lw: 2 });
    ctx.fillStyle = '#151a26';
    ctx.fillRect(x + 8, y + 8, 160, 90);
    if (state === 'sealed' || state === 'buyable') {
      var buy = state === 'buyable';
      lockIcon(ctx, x + 40, y + 56, 34, buy ? C.gold : '#6a7286');
      text(ctx, buy ? '可解鎖' : '未開放', x + 66, y + 36, { size: 13, bold: true, color: buy ? C.gold : '#8a92a6' });
      // 沒傳 stock 時退回 canAfford: true 全部照常, 其他全部標不足
      var stk = s.stock != null ? s.stock : (s.canAfford === true ? s.cost : {});
      costRow(ctx, s.cost, stk, x + 66, y + 64, { size: 15, icon: 18 });
    }
    // 文字區第一行
    var ly1 = y + 114, ly2 = y + 129;
    var label = idx + ' ' + name;
    text(ctx, label, x + 8, ly1, { size: 12, bold: true, color: C.text, max: 80 });
    if (state === 'open' || state === 'cleared') {
      var bc = clamp(Math.round(num(s.builtCount, 0)), 0, 2);
      text(ctx, '建 ' + bc + '/2', x + 168, ly1, { size: 11, bold: true, color: bc > 0 ? C.text : C.textDim, align: 'right' });
    }
    if (state === 'cleared') {
      if (s.recordCls != null) clsIcon(ctx, s.recordCls, x + 96, ly1, 6.5);
      if (s.recordTime != null) text(ctx, fmt1(s.recordTime) + 's', x + 105, ly1, { size: 11, bold: true, color: C.text });
      var r = matObj(s.rates);
      MAT_KINDS.forEach(function (k, i) {
        var gx = x + 8 + i * 41;
        matIcon(ctx, k, gx + 5, ly2, 11);
        text(ctx, fmt1(r[k]), gx + 12, ly2, { size: 10, bold: true, color: r[k] > 0 ? C.text : C.textDim, max: 28 });
      });
    } else if (state === 'open') {
      text(ctx, '未過關', x + 8, ly2, { size: 11, color: C.textDim });
    }
    if (state === 'sealed') {
      rr(ctx, x + 1, y + 1, 174, 134, 10);
      ctx.fillStyle = 'rgba(8,10,16,0.45)'; ctx.fill();
    }
    ctx.restore();
  }

  function drawCardOverlay(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), lv = clamp(Math.round(num(s.accelLv, 0)), 0, 2);
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = '#8090b0';
    ctx.strokeRect(x + 7, y + 7, 162, 92);
    if (lv > 0) {
      var str = lv === 1 ? '×1.25' : '×1.5';
      var w = textW(ctx, str, 11, true) + 10;
      rr(ctx, x + 166 - w, y + 10, w, 16, 5);
      ctx.fillStyle = C.time; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#0a3a44'; ctx.stroke();
      text(ctx, str, x + 166 - w / 2, y + 18.5, { size: 11, bold: true, color: '#0a2a34', align: 'center' });
    }
    if (s.newArea === true) {
      var w2 = textW(ctx, '新區域', 11, true) + 10;
      rr(ctx, x + 10, y + 10, w2, 16, 5);
      ctx.fillStyle = C.newArea; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a3000'; ctx.stroke();
      text(ctx, '新區域', x + 10 + w2 / 2, y + 18.5, { size: 11, bold: true, color: '#2a2200', align: 'center' });
    }
    if (s.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function selFrame(ctx, x, y, w, h) {
    rr(ctx, x - 4.5, y - 4.5, w + 9, h + 9, 13);
    ctx.lineWidth = 3; ctx.strokeStyle = C.select; ctx.stroke();
    rr(ctx, x - 1, y - 1, w + 2, h + 2, 11);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
  }

  function drawWorkshopCard(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    panelBox(ctx, x + 1, y + 1, 174, 134, { r: 10, fill: '#2e2a3a', line: '#5a5070', lw: 2 });
    // 鐵砧 + 槌
    ctx.save();
    ctx.translate(x + 88, y + 58);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#141820';
    ctx.beginPath();
    ctx.moveTo(-30, -10); ctx.lineTo(24, -10); ctx.quadraticCurveTo(36, -10, 40, -18); ctx.lineTo(40, -4);
    ctx.lineTo(12, 0); ctx.lineTo(10, 10); ctx.lineTo(20, 18); ctx.lineTo(-20, 18); ctx.lineTo(-10, 10); ctx.lineTo(-12, 0); ctx.lineTo(-30, -2); ctx.closePath();
    ctx.fillStyle = '#7a8394'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a8b0c0'; ctx.fillRect(-28, -10, 50, 3);
    ctx.save(); ctx.translate(-6, -28); ctx.rotate(-0.5);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-2, -2, 4, 26); ctx.strokeRect(-2, -2, 4, 26);
    ctx.fillStyle = '#5a6070'; ctx.fillRect(-9, -8, 18, 9); ctx.strokeRect(-9, -8, 18, 9);
    ctx.restore();
    matIcon(ctx, 'soul', 30, -30, 16);
    ctx.restore();
    text(ctx, '升級所', x + 88, y + 108, { size: 16, bold: true, color: C.text, align: 'center' });
    text(ctx, '招募・強化', x + 88, y + 126, { size: 11, color: C.textDim, align: 'center' });
    if (s.anyAffordable === true) {
      circle(ctx, x + 156, y + 20, 11); ctx.fillStyle = C.good; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#0e3a16'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 150, y + 23); ctx.lineTo(x + 156, y + 15); ctx.lineTo(x + 162, y + 23);
      ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0e3a16'; ctx.stroke();
    }
    if (s.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function drawGoalCard(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), ok = s.canAfford === true;
    ctx.save();
    panelBox(ctx, x + 1, y + 1, 198, 134, { r: 10, fill: ok ? '#3a3220' : '#272c3a', line: ok ? C.gold : '#5a6070', lw: ok ? 3 : 2 });
    // 城鎮剪影
    ctx.save();
    ctx.translate(x + 100, y + 58);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#141820';
    var wallC = ok ? '#f0e2c0' : '#6a7080', roofC = ok ? C.gold : '#4a5060';
    [[-64, -6, 20, 26], [-40, -18, 22, 38], [16, -14, 22, 34], [42, -4, 22, 24]].forEach(function (b) {
      ctx.fillStyle = wallC; ctx.fillRect(b[0], b[1], b[2], b[3]); ctx.strokeRect(b[0], b[1], b[2], b[3]);
      ctx.beginPath(); ctx.moveTo(b[0] - 2, b[1]); ctx.lineTo(b[0] + b[2] / 2, b[1] - 10); ctx.lineTo(b[0] + b[2] + 2, b[1]); ctx.closePath();
      ctx.fillStyle = roofC; ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = wallC; ctx.fillRect(-14, -24, 28, 44); ctx.strokeRect(-14, -24, 28, 44);
    ctx.beginPath(); ctx.arc(0, -24, 14, Math.PI, 0); ctx.closePath(); ctx.fillStyle = roofC; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a2e3a'; ctx.fillRect(-5, 6, 10, 14);
    ctx.restore();
    text(ctx, '復興之城', x + 100, y + 90, { size: 15, bold: true, color: ok ? C.gold : C.text, align: 'center' });
    var cost = matObj(s.cost), stock = matObj(s.stock != null ? s.stock : (ok ? s.cost : {}));
    var shown = MAT_KINDS.filter(function (k) { return cost[k] > 0; });
    shown.forEach(function (k, i) {
      var gx = x + 14 + (i % 2) * 92, gy = y + 108 + Math.floor(i / 2) * 17;
      var one = {}; one[k] = cost[k];
      costRow(ctx, one, stock, gx, gy, { size: 12, icon: 13 });
    });
    if (s.selected === true) selFrame(ctx, x, y, 200, 136);
    ctx.restore();
  }

  function drawFlyingMaterial(ctx, s) {
    s = st(s);
    var x = num(s.x, 0), y = num(s.y, 0), kind = nKind(s.kind);
    var dur = Math.max(0.01, num(s.dur, 0.7)), p = clamp(num(s.t, 0) / dur, 0, 1);
    var tx = { wood: 36, brick: 206, time: 376, soul: 546 }[kind], ty = 20;
    var dx = tx - x, dy = ty - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    ctx.save();
    // 拖尾: 終點的反方向, 至多 24px
    var len = Math.min(24, d);
    var g = ctx.createLinearGradient(x, y, x - dx / d * len, y - dy / d * len);
    g.addColorStop(0, MAT_COL[kind]); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx / d * len, y - dy / d * len);
    ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = g; ctx.globalAlpha = 0.7; ctx.stroke();
    ctx.globalAlpha = 1;
    matIcon(ctx, kind, x, y, 18 - p * 2);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 關卡面板
  function curtain(ctx, hole) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    if (hole) ctx.rect(hole[0] + hole[2], hole[1], -hole[2], hole[3]);
    ctx.fillStyle = 'rgba(6,8,14,0.6)';
    ctx.fill('evenodd');
    ctx.restore();
  }

  function rowFrame(ctx, x, y, w, h, on) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = on ? '#2e3a58' : '#252e44'; ctx.fill();
    ctx.lineWidth = on ? 3 : 1.5; ctx.strokeStyle = on ? C.gold : '#3e4862'; ctx.stroke();
  }

  function portrait(ctx, cls, cx, cy, sc, gray) {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    if (gray) ctx.globalAlpha *= 0.35;
    playerBody(ctx, nCls(cls), 1, 'idle', 0, false);
    ctx.restore();
  }

  function drawLevelPanel(ctx, s) {
    s = st(s);
    var PX = 60, PY = 96, PW = 640, PH = 360;
    var row = clamp(Math.round(num(s.row, 0)), 0, 2);
    var stock = matObj(s.stock);
    ctx.save();
    curtain(ctx, [PX, PY, PW, PH]);
    // 面板底(挖空預覽框)
    ctx.beginPath();
    rr(ctx, 41, 49, 1198, 638, 14);
    ctx.rect(PX + PW, PY, -PW, PH);
    ctx.fillStyle = C.panel; ctx.fill('evenodd');
    rr(ctx, 41, 49, 1198, 638, 14);
    ctx.lineWidth = 2; ctx.strokeStyle = C.panelLine; ctx.stroke();
    // 標題
    var idx = clamp(Math.round(num(s.index, 1)), 0, 99);
    text(ctx, '第 ' + idx + ' 關  ' + (s.name == null ? '' : String(s.name)), 60, 74, { size: 24, bold: true, color: C.text });
    // 預覽框外框
    ctx.lineWidth = 2; ctx.strokeStyle = '#8090b0';
    ctx.strokeRect(PX - 1, PY - 1, PW + 2, PH + 2);

    // 背包 8 格
    var items = Array.isArray(s.items) ? s.items : [];
    for (var i = 0; i < 8; i++) {
      var bx = 60 + i * 80, by = 472;
      var it = items[i] ? st(items[i]) : null;
      var type = it ? nItem(it.type) : null;
      rr(ctx, bx + 1, by + 1, 72, 72, 8);
      ctx.fillStyle = type ? '#2a3350' : '#1a2030'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = type ? '#4a5674' : '#2e3650'; ctx.stroke();
      if (type) {
        itemIcon(ctx, type, bx + 37, by + 28, 34);
        var where = it.where && typeof it.where === 'object' ? it.where : null;
        var lab = where ? ('第' + clamp(Math.round(num(where.level, 1)), 0, 99) + '關 ' + B_NAME[nBtype(where.btype)]) : '未裝';
        text(ctx, lab, bx + 37, by + 60, { size: 11, bold: !!where, color: where ? C[nBtype(where.btype)] : C.textDim, align: 'center', max: 68 });
      }
    }
    // 回放資訊
    rr(ctx, 61, 561, 638, 88, 10); ctx.fillStyle = '#252e44'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#3e4862'; ctx.stroke();
    text(ctx, '目前回放', 76, 580, { size: 14, bold: true, color: C.textDim });
    if (s.recordTime == null) {
      text(ctx, '尚無回放', 76, 612, { size: 16, bold: true, color: C.textDim });
    } else {
      clsIcon(ctx, s.recordCls, 88, 614, 11);
      text(ctx, fmt1(s.recordTime) + ' 秒', 106, 614, { size: 16, bold: true, color: C.text });
      var r = matObj(s.rates);
      MAT_KINDS.forEach(function (k, n) {
        var gx = 210 + n * 120;
        matIcon(ctx, k, gx + 10, 614, 18);
        text(ctx, '+' + fmt1(r[k]) + '/分', gx + 23, 614, { size: 14, bold: true, color: r[k] > 0 ? C.text : C.textDim });
      });
    }
    if (s.newArea === true) {
      text(ctx, '重建後還沒跑過', 76, 638, { size: 12, bold: true, color: C.newArea });
    }

    // 職業列
    rowFrame(ctx, 721, 97, 478, 128, row === 0);
    text(ctx, '職業', 734, 108, { size: 12, bold: true, color: C.textDim });
    var classes = Array.isArray(s.classes) ? s.classes : [];
    var clsSel = clamp(Math.round(num(s.clsSel, 0)), 0, 2);
    for (var c = 0; c < 3; c++) {
      var cd = st(classes[c]);
      var cls = cd.cls ? nCls(cd.cls) : CLS[c];
      var owned = cd.owned === true;
      var cx = 728 + c * 157, cy = 118;
      var sel = c === clsSel;
      rr(ctx, cx, cy, 150, 100, 8);
      ctx.fillStyle = sel ? '#384668' : '#1e2638'; ctx.fill();
      ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? (row === 0 ? C.select : '#8090b0') : '#3e4862'; ctx.stroke();
      portrait(ctx, cls, cx + 28, cy + 50, 1.3, !owned);
      text(ctx, CLS_NAME[cls], cx + 56, cy + 22, { size: 16, bold: true, color: owned ? C.text : C.textDim });
      text(ctx, CLS_GOOD[cls], cx + 56, cy + 44, { size: 11, color: owned ? C.text : C.textDim, max: 90 });
      if (!owned) {
        lockIcon(ctx, cx + 28, cy + 50, 26, '#c8cede');
        text(ctx, '到升級所招募', cx + 56, cy + 72, { size: 11, bold: true, color: C.textDim, max: 90 });
      } else if (sel) {
        hint(ctx, 'Z 出發', cx + 56, cy + 76, { size: 13, alpha: row === 0 ? 1 : 0.45 });
      }
    }

    // 建築列
    rowFrame(ctx, 721, 237, 478, 258, row === 1);
    var blds = Array.isArray(s.buildings) ? s.buildings : [];
    var bldSel = clamp(Math.round(num(s.bldSel, 0)), 0, 1);
    for (var b = 0; b < 2; b++) {
      var bd = st(blds[b]);
      var bt = nBtype(bd.btype), ok = bd.repaired === true;
      var gx2 = 726 + b * 242, gy2 = 241;
      var bsel = b === bldSel;
      rr(ctx, gx2, gy2, 230, 250, 8);
      ctx.fillStyle = bsel ? '#384668' : '#1e2638'; ctx.fill();
      ctx.lineWidth = bsel ? 3 : 1.5; ctx.strokeStyle = bsel ? (row === 1 ? C.select : '#8090b0') : '#3e4862'; ctx.stroke();
      buildingPict(ctx, bt, gx2 + 38, gy2 + 42, 54, ok);
      text(ctx, '建築 ' + (b + 1) + '  ' + B_NAME[bt], gx2 + 76, gy2 + 26, { size: 16, bold: true, color: C.text, max: 148 });
      text(ctx, ok ? '已重建' : '破損', gx2 + 76, gy2 + 50, { size: 13, bold: true, color: ok ? C.good : '#c0a890' });
      text(ctx, B_ROOM[bt], gx2 + 14, gy2 + 86, { size: 13, color: C.text });
      emblem(ctx, bt, gx2 + 22, gy2 + 108, 14, C[bt], 2);
      text(ctx, B_FIT[bt], gx2 + 34, gy2 + 108, { size: 13, bold: true, color: C[bt] });
      ctx.fillStyle = '#3e4862'; ctx.fillRect(gx2 + 12, gy2 + 124, 206, 1.5);
      var hAlpha = row === 1 ? 1 : 0.45;
      if (!ok) {
        text(ctx, '重建花費', gx2 + 14, gy2 + 150, { size: 13, color: C.textDim });
        costRow(ctx, bd.cost, stock, gx2 + 86, gy2 + 150, { size: 16, icon: 20 });
        if (bsel) hint(ctx, 'Z 重建', gx2 + 115, gy2 + 218, { size: 14, align: 'center', alpha: hAlpha });
      } else {
        var item = nItem(bd.item);
        // 道具格(同 drawBuildingSlot 樣式)
        drawBuildingSlot(ctx, { x: gx2 + 34, y: gy2 + 160, btype: bt, item: item, selected: false });
        text(ctx, item ? ITEM_NAME[item] : '空', gx2 + 64, gy2 + 150, { size: 15, bold: true, color: item ? C.text : C.textDim });
        if (item) text(ctx, ITEM_EFFECT[item], gx2 + 64, gy2 + 172, { size: 12, color: C.text, max: 160 });
        if (bsel) {
          if (bd.hasFitItem === true) hint(ctx, 'Z 換道具', gx2 + 115, gy2 + 218, { size: 14, align: 'center', alpha: hAlpha });
          else text(ctx, '沒有可裝的道具', gx2 + 115, gy2 + 218, { size: 13, color: C.textDim, align: 'center' });
        }
      }
    }

    // 加速器列
    rowFrame(ctx, 721, 507, 478, 88, row === 2);
    var lv = clamp(Math.round(num(s.accelLv, 0)), 0, 2);
    var mult = ['×1', '×1.25', '×1.5'];
    text(ctx, '回放加速器', 738, 528, { size: 15, bold: true, color: C.text });
    text(ctx, '目前 ' + mult[lv], 738, 560, { size: 18, bold: true, color: lv > 0 ? C.time : C.text });
    for (var q = 0; q < 2; q++) {
      rr(ctx, 860 + q * 26, 520, 20, 14, 3);
      ctx.fillStyle = q < lv ? C.time : '#1a2030'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a6a88'; ctx.stroke();
    }
    if (s.accelCost == null || lv >= 2) {
      text(ctx, '已滿', 1000, 550, { size: 16, bold: true, color: C.textDim });
    } else {
      text(ctx, '下一級 ' + mult[lv + 1], 930, 560, { size: 14, color: C.text });
      costRow(ctx, s.accelCost, stock, 1040, 560, { size: 16, icon: 20 });
      hint(ctx, 'Z 購買', 1186, 528, { size: 13, align: 'right', alpha: row === 2 ? 1 : 0.45 });
    }
    // 最下方提示
    text(ctx, '↑↓ 換列    ←→ 選擇    Z 確定    X 關閉', 60, 674, { size: 14, bold: true, color: C.textDim });
    ctx.restore();
  }

  function drawSiteHighlight(ctx, s) {
    s = st(s);
    if (s.active !== true) return;
    var x = num(s.x, 0), y = num(s.y, 0);
    var w = clamp(num(s.w, 20), 20, 640), h = clamp(num(s.h, 20), 20, 360);
    var pulse = 0.55 + 0.45 * Math.sin(now() * 6);
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(10,12,20,0.85)';
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    ctx.globalAlpha = 0.5 + 0.5 * pulse;
    ctx.lineWidth = 3; ctx.strokeStyle = C.select;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 升級所
  var STAT_NAME = { speed: '移速', hp: '血量', cd: '技能冷卻' };
  var STAT_FX = {
    speed: ['移速 +0%', '移速 +8%', '移速 +16%', '移速 +24%'],
    hp: ['血量 3', '血量 4', '血量 5'],
    cd: ['技能冷卻 -0%', '技能冷卻 -15%', '技能冷卻 -30%', '技能冷卻 -45%']
  };
  var STAT_MAX = { speed: 3, hp: 2, cd: 3 };

  function drawUpgradePage(ctx, s) {
    s = st(s);
    var row = clamp(Math.round(num(s.row, 0)), 0, 3);
    var stock = matObj(s.stock);
    ctx.save();
    curtain(ctx, null);
    panelBox(ctx, 41, 49, 1198, 638, { r: 14 });
    text(ctx, '升級所', 60, 74, { size: 24, bold: true, color: C.text });
    // 招募列
    rowFrame(ctx, 81, 111, 1118, 168, row === 0);
    text(ctx, '招募', 100, 130, { size: 15, bold: true, color: C.textDim });
    var recs = Array.isArray(s.recruits) ? s.recruits : [];
    var rsel = clamp(Math.round(num(s.recruitSel, 0)), 0, 1);
    for (var i = 0; i < 2; i++) {
      var rd = st(recs[i]);
      var cls = rd.cls ? nCls(rd.cls) : (i === 0 ? 'hunter' : 'bomber');
      var owned = rd.owned === true;
      var cx = 100 + i * 545, cy = 146;
      var sel = i === rsel;
      rr(ctx, cx, cy, 530, 122, 10);
      ctx.fillStyle = sel ? '#384668' : '#1e2638'; ctx.fill();
      ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? (row === 0 ? C.select : '#8090b0') : '#3e4862'; ctx.stroke();
      portrait(ctx, cls, cx + 56, cy + 62, 1.8, false);
      text(ctx, CLS_NAME[cls], cx + 110, cy + 36, { size: 22, bold: true, color: C.text });
      text(ctx, '擅長: ' + CLS_GOOD[cls], cx + 110, cy + 70, { size: 15, color: C.text });
      if (owned) {
        text(ctx, '已招募', cx + 510, cy + 36, { size: 16, bold: true, color: C.good, align: 'right' });
      } else {
        costRow(ctx, rd.cost, stock, cx + 510, cy + 36, { size: 18, icon: 22, align: 'right' });
        if (sel) hint(ctx, 'Z 招募', cx + 510, cy + 90, { size: 14, align: 'right', alpha: row === 0 ? 1 : 0.45 });
      }
    }
    // 三列強化
    var stats = Array.isArray(s.stats) ? s.stats : [];
    var keys = ['speed', 'hp', 'cd'];
    for (var j = 0; j < 3; j++) {
      var sd = st(stats[j]);
      var key = pick(sd.key, keys, keys[j]);
      var maxLv = clamp(Math.round(num(sd.maxLv, STAT_MAX[key])), 1, 6);
      var lv = clamp(Math.round(num(sd.lv, 0)), 0, maxLv);
      var Y = 300 + j * 110;
      var on = row === j + 1;
      rowFrame(ctx, 81, Y + 1, 1118, 98, on);
      text(ctx, STAT_NAME[key], 100, Y + 30, { size: 18, bold: true, color: C.text });
      for (var q = 0; q < maxLv; q++) {
        rr(ctx, 100 + q * 34, Y + 56, 28, 18, 4);
        ctx.fillStyle = q < lv ? C.soul : '#1a2030'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#6a5a8a'; ctx.stroke();
      }
      var fx = STAT_FX[key];
      text(ctx, '目前', 330, Y + 34, { size: 13, color: C.textDim });
      text(ctx, fx[Math.min(lv, fx.length - 1)], 372, Y + 34, { size: 17, bold: true, color: C.text });
      var full = sd.cost == null || lv >= maxLv;
      if (full) {
        text(ctx, '已滿', 760, Y + 50, { size: 18, bold: true, color: C.textDim });
      } else {
        text(ctx, '下一級', 330, Y + 68, { size: 13, color: C.textDim });
        text(ctx, fx[Math.min(lv + 1, fx.length - 1)], 384, Y + 68, { size: 17, bold: true, color: C.good });
        costRow(ctx, sd.cost, stock, 760, Y + 50, { size: 18, icon: 22 });
        hint(ctx, 'Z 升級', 1180, Y + 50, { size: 14, align: 'right', alpha: on ? 1 : 0.45 });
      }
    }
    text(ctx, '↑↓ 換列    ←→ 選擇    Z 招募 / 升級    X 關閉', 60, 674, { size: 14, bold: true, color: C.textDim });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 資訊列
  function heart(ctx, cx, cy, sz, full) {
    ctx.save();
    ctx.translate(cx, cy);
    var k = sz / 14; ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-8, -1, -6, -7, -3, -6.5);
    ctx.bezierCurveTo(-1, -6, 0, -4, 0, -3);
    ctx.bezierCurveTo(0, -4, 1, -6, 3, -6.5);
    ctx.bezierCurveTo(6, -7, 8, -1, 0, 5);
    ctx.closePath();
    ctx.fillStyle = full ? '#ff5a6a' : '#2a2e3a'; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = full ? '#ffffff' : '#5a6070'; ctx.stroke();
    ctx.restore();
  }

  function drawHud(ctx, s) {
    s = st(s);
    var mode = s.mode === 'level' ? 'level' : 'map';
    var stock = matObj(s.stock), rate = matObj(s.ratePerMin), bump = matObj(s.bumpT);
    var bdur = Math.max(0.01, num(s.bumpDur, 0.15));
    ctx.save();
    ctx.fillStyle = 'rgba(14,18,28,0.88)';
    ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#3a4460'; ctx.fillRect(0, 39, W, 1);
    MAT_KINDS.forEach(function (k, i) {
      var gx = 16 + i * 170;
      if (i > 0) { ctx.fillStyle = '#2a3248'; ctx.fillRect(gx - 4, 6, 1.5, 28); }
      matIcon(ctx, k, gx + 20, 20, 24);
      var bt = num(s.bumpT && s.bumpT[k], bdur);
      var sc = (bt >= 0 && bt < bdur) ? 1 + 0.3 * Math.sin(Math.PI * bt / bdur) : 1;
      ctx.save();
      ctx.translate(gx + 38, 21); ctx.scale(sc, sc);
      text(ctx, fmtInt(stock[k]), 0, 0, { size: 18, bold: true, color: C.text });
      ctx.restore();
      text(ctx, '+' + fmt1(rate[k]) + '/分', gx + 84, 21, { size: 12, bold: true, color: rate[k] > 0 ? MAT_COL[k] : C.textDim, max: 54 });
      text(ctx, MAT_USE[k], gx + 142, 21, { size: 11, color: C.textDim });
    });
    if (mode === 'level') {
      var cls = nCls(s.cls);
      clsIcon(ctx, cls, 738, 20, 11);
      text(ctx, fmt1(s.time) + ' 秒', 756, 21, { size: 16, bold: true, color: C.text });
      var run = matObj(s.run);
      MAT_KINDS.forEach(function (k, i) {
        var gx = 838 + i * 48;
        matIcon(ctx, k, gx + 7, 20, 14);
        text(ctx, fmtInt(run[k]), gx + 16, 21, { size: 13, bold: true, color: run[k] > 0 ? C.text : C.textDim, max: 30 });
      });
      var maxHp = clamp(Math.round(num(s.maxHp, 3)), 1, 5), hp = clamp(Math.round(num(s.hp, maxHp)), 0, maxHp);
      for (var h = 0; h < maxHp; h++) heart(ctx, 1046 + h * 18, 20, 15, h < hp);
      // 技能冷卻: 扇形 = 剩餘冷卻; 就緒時亮職業色外環
      var cdD = Math.max(0.01, num(s.skillCdDur, 1)), cdT = clamp(num(s.skillCdT, cdD), 0, cdD);
      var ready = cdT >= cdD;
      var kx = 1160, ky = 20;
      circle(ctx, kx, ky, 13); ctx.fillStyle = ready ? C[cls] : '#2a3044'; ctx.fill();
      if (!ready) {
        ctx.beginPath(); ctx.moveTo(kx, ky);
        ctx.arc(kx, ky, 13, -Math.PI / 2 + (cdT / cdD) * Math.PI * 2, Math.PI * 1.5);
        ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(kx, ky);
        ctx.arc(kx, ky, 13, -Math.PI / 2, -Math.PI / 2 + (cdT / cdD) * Math.PI * 2);
        ctx.closePath(); ctx.fillStyle = C[cls]; ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;
      }
      circle(ctx, kx, ky, 13); ctx.lineWidth = ready ? 2.5 : 1.5; ctx.strokeStyle = ready ? '#ffffff' : '#5a6070'; ctx.stroke();
      text(ctx, 'X', kx, ky + 1, { size: 14, bold: true, color: '#ffffff', align: 'center', stroke: '#141820', lw: 3 });
      text(ctx, ready ? '技能' : '冷卻', kx + 20, 21, { size: 12, bold: true, color: ready ? C.text : C.textDim });
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 結算 / 失敗 / 暫停 / 結束
  function drawResultPanel(ctx, s) {
    s = st(s);
    var X = 280, Y = 150;
    var cmp = s.oldTime != null;
    ctx.save();
    panelBox(ctx, X + 1, Y + 1, 718, 418, { r: 16, fill: 'rgba(30,38,56,0.97)', line: C.gold, lw: 3 });
    text(ctx, '過關', X + 360, Y + 40, { size: 34, bold: true, color: C.gold, align: 'center', stroke: '#2a1a08', lw: 5 });
    // 這趟拿到
    var run = matObj(s.run);
    text(ctx, '這趟拿到', X + 40, Y + 88, { size: 14, color: C.textDim });
    MAT_KINDS.forEach(function (k, i) {
      var gx = X + 120 + i * 90;
      matIcon(ctx, k, gx + 10, Y + 88, 20);
      text(ctx, fmtInt(run[k]), gx + 24, Y + 89, { size: 17, bold: true, color: run[k] > 0 ? C.text : C.textDim });
    });
    var item = nItem(s.item);
    if (item) {
      itemIcon(ctx, item, X + 506, Y + 88, 30);
      text(ctx, '獲得 ' + ITEM_NAME[item], X + 528, Y + 89, { size: 16, bold: true, color: C.text });
    }
    ctx.fillStyle = '#3e4862'; ctx.fillRect(X + 30, Y + 112, 660, 1.5);
    var rates = matObj(s.rates);
    if (!cmp) {
      clsIcon(ctx, s.cls, X + 60, Y + 150, 13);
      text(ctx, fmt1(s.time) + ' 秒', X + 82, Y + 151, { size: 22, bold: true, color: C.text });
      text(ctx, '每分鐘產量', X + 40, Y + 196, { size: 14, color: C.textDim });
      MAT_KINDS.forEach(function (k, i) {
        var gx = X + 40 + i * 160;
        matIcon(ctx, k, gx + 12, Y + 232, 24);
        text(ctx, '+' + fmt1(rates[k]) + '/分', gx + 30, Y + 233, { size: 18, bold: true, color: rates[k] > 0 ? C.text : C.textDim });
      });
      text(ctx, '已存成回放', X + 360, Y + 300, { size: 20, bold: true, color: C.good, align: 'center' });
      hint(ctx, 'Z 回大地圖', X + 360, Y + 372, { size: 16, align: 'center' });
    } else {
      var old = matObj(s.oldRates);
      var cA = X + 330, cB = X + 540;
      text(ctx, '這一趟', cA, Y + 136, { size: 17, bold: true, color: C.text, align: 'center' });
      text(ctx, '目前回放', cB, Y + 136, { size: 17, bold: true, color: C.textDim, align: 'center' });
      text(ctx, '職業 / 秒數', X + 60, Y + 168, { size: 13, color: C.textDim });
      clsIcon(ctx, s.cls, cA - 40, Y + 168, 11);
      text(ctx, fmt1(s.time) + ' 秒', cA - 24, Y + 169, { size: 16, bold: true, color: C.text });
      clsIcon(ctx, s.oldCls, cB - 40, Y + 168, 11);
      text(ctx, fmt1(s.oldTime) + ' 秒', cB - 24, Y + 169, { size: 16, bold: true, color: C.text });
      text(ctx, '每分鐘產量', X + 60, Y + 196, { size: 13, color: C.textDim });
      MAT_KINDS.forEach(function (k, i) {
        var yy = Y + 222 + i * 30;
        if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(X + 40, yy - 14, 640, 28); }
        matIcon(ctx, k, X + 72, yy, 20);
        var a = Math.round(rates[k] * 10), b = Math.round(old[k] * 10);
        [[cA, rates[k], a > b], [cB, old[k], b > a]].forEach(function (c) {
          if (c[2]) {
            rr(ctx, c[0] - 58, yy - 12, 116, 24, 6);
            ctx.fillStyle = 'rgba(124,240,138,0.18)'; ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = C.good; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(c[0] + 42, yy + 4); ctx.lineTo(c[0] + 47, yy - 4); ctx.lineTo(c[0] + 52, yy + 4); ctx.closePath();
            ctx.fillStyle = C.good; ctx.fill();
          }
          text(ctx, '+' + fmt1(c[1]) + '/分', c[0] - 4, yy + 1, { size: 16, bold: true, color: c[2] ? C.good : (c[1] > 0 ? C.text : C.textDim), align: 'center' });
        });
      });
      hint(ctx, 'Z 採用這一趟', X + 250, Y + 382, { size: 16, align: 'center' });
      hint(ctx, 'X 保留舊的', X + 480, Y + 382, { size: 16, align: 'center' });
    }
    ctx.restore();
  }

  function drawFailPanel(ctx) {
    var X = 380, Y = 240;
    ctx.save();
    panelBox(ctx, X + 1, Y + 1, 518, 238, { r: 16, fill: 'rgba(36,22,28,0.96)', line: C.danger, lw: 3 });
    text(ctx, '失敗', X + 260, Y + 80, { size: 40, bold: true, color: C.danger, align: 'center', stroke: '#200608', lw: 5 });
    text(ctx, '這趟作廢, 素材不入帳', X + 260, Y + 128, { size: 14, color: C.textDim, align: 'center' });
    hint(ctx, 'Z 重來', X + 160, Y + 186, { size: 16, align: 'center' });
    hint(ctx, 'X 回大地圖', X + 360, Y + 186, { size: 16, align: 'center' });
    ctx.restore();
  }

  function drawPausePanel(ctx, s) {
    s = st(s);
    var mode = s.mode === 'map' ? 'map' : 'level';
    var X = 380, Y = 220;
    ctx.save();
    curtain(ctx, null);
    panelBox(ctx, X + 1, Y + 1, 518, 278, { r: 16 });
    text(ctx, '暫停', X + 260, Y + 80, { size: 40, bold: true, color: C.text, align: 'center' });
    if (mode === 'level') {
      hint(ctx, 'Esc 繼續', X + 260, Y + 160, { size: 16, align: 'center' });
      hint(ctx, 'Z 重來', X + 150, Y + 220, { size: 16, align: 'center' });
      hint(ctx, 'X 回大地圖', X + 370, Y + 220, { size: 16, align: 'center' });
    } else {
      hint(ctx, 'Esc 繼續', X + 260, Y + 180, { size: 16, align: 'center' });
    }
    ctx.restore();
  }

  function drawEndingPanel(ctx, s) {
    s = st(s);
    var X = 280, Y = 150;
    var sec = Math.max(0, Math.floor(num(s.totalTime, 0)));
    sec = Math.min(sec, 99 * 3600);
    var mm = Math.floor(sec / 60), ss = sec % 60;
    ctx.save();
    panelBox(ctx, X + 1, Y + 1, 718, 418, { r: 16, fill: 'rgba(40,34,20,0.97)', line: C.gold, lw: 3 });
    // 城鎮
    ctx.save();
    ctx.translate(X + 360, Y + 130);
    ctx.scale(1.6, 1.6);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.5; ctx.strokeStyle = '#141820';
    [[-64, -6, 20, 26], [-40, -18, 22, 38], [16, -14, 22, 34], [42, -4, 22, 24]].forEach(function (b) {
      ctx.fillStyle = '#f0e2c0'; ctx.fillRect(b[0], b[1], b[2], b[3]); ctx.strokeRect(b[0], b[1], b[2], b[3]);
      ctx.beginPath(); ctx.moveTo(b[0] - 2, b[1]); ctx.lineTo(b[0] + b[2] / 2, b[1] - 10); ctx.lineTo(b[0] + b[2] + 2, b[1]); ctx.closePath();
      ctx.fillStyle = C.gold; ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = '#f0e2c0'; ctx.fillRect(-14, -24, 28, 44); ctx.strokeRect(-14, -24, 28, 44);
    ctx.beginPath(); ctx.arc(0, -24, 14, Math.PI, 0); ctx.closePath(); ctx.fillStyle = C.gold; ctx.fill(); ctx.stroke();
    ctx.restore();
    text(ctx, '城鎮復興完成', X + 360, Y + 230, { size: 34, bold: true, color: C.gold, align: 'center', stroke: '#2a1a08', lw: 5 });
    text(ctx, '總遊玩時間  ' + mm + ':' + (ss < 10 ? '0' : '') + ss, X + 360, Y + 290, { size: 20, bold: true, color: C.text, align: 'center' });
    hint(ctx, 'Z 重新開始', X + 360, Y + 362, { size: 16, align: 'center' });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 說明頁示意圖(只畫在 x,y,w,h 框內; 標題 / 說明 / 頁碼 / 翻頁提示由 RD 畫)
  function fitScene(ctx, box, ww, wh) {
    var sc = Math.min(box.w / ww, box.h / wh);
    var ox = box.x + (box.w - ww * sc) / 2, oy = box.y + (box.h - wh * sc) / 2;
    ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.translate(ox, oy); ctx.scale(sc, sc);
    return sc;
  }
  function groundRow(ctx, x0, x1, topY, theme, rows) {
    for (var x = x0; x < x1; x += 40) {
      for (var r = 0; r < (rows || 2); r++) drawGround(ctx, { x: x + 20, y: topY + 20 + r * 40, top: r === 0, theme: theme });
    }
  }
  function label(ctx, s, x, y, sc, o) {
    o = o || {};
    text(ctx, s, x, y, { size: (o.px || 14) / sc, bold: true, color: o.color || '#ffffff', align: o.align || 'center', stroke: '#141820', lw: 4 / sc });
  }
  // pts = [起點x, 起點y, 控制x, 控制y, 終點x, 終點y, ...]; sc = 這一層到畫布的總縮放
  function dashedPath(ctx, pts, sc, col) {
    ctx.save();
    ctx.setLineDash([7 / sc, 6 / sc]);
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i + 3 < pts.length; i += 4) ctx.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    ctx.lineWidth = 3 / sc; ctx.strokeStyle = col || '#ffffff'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.setLineDash([]);
    // 箭頭
    var n = pts.length;
    var ex = pts[n - 2], ey = pts[n - 1], px = pts[n - 4], py = pts[n - 3];
    var a = Math.atan2(ey - py, ex - px);
    var al = 12 / sc;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(a - 0.5) * al, ey - Math.sin(a - 0.5) * al);
    ctx.lineTo(ex - Math.cos(a + 0.5) * al, ey - Math.sin(a + 0.5) * al);
    ctx.closePath(); ctx.fillStyle = col || '#ffffff'; ctx.fill();
    ctx.restore();
  }
  function storageAt(ctx, bx, by, ok, opts) {
    // 6x4 格倉庫, 門口在右牆下兩格
    opts = opts || {};
    drawBuilding(ctx, { x: bx, y: by, w: 240, h: 160, btype: 'storage', repaired: ok, t: 0 });
    var picks = ['wood', 'brick', 'wood', 'brick', 'wood'];
    picks.forEach(function (k, i) { drawPickup(ctx, { x: bx + 62 + i * 29, y: by + 146, kind: k, t: 0 }); });
    for (var c = 0; c < 6; c++) drawBuildingWall(ctx, { x: bx + 20 + c * 40, y: by + 20, top: true, btype: 'storage', repaired: ok });
    for (var r = 1; r < 4; r++) {
      drawBuildingWall(ctx, { x: bx + 20, y: by + 20 + r * 40, top: false, btype: 'storage', repaired: ok });
      if (r === 1) drawBuildingWall(ctx, { x: bx + 220, y: by + 60, top: false, btype: 'storage', repaired: ok });
      else if (!ok) drawDoorRubble(ctx, { x: bx + 220, y: by + 20 + r * 40 });
    }
  }

  function drawGuidePage(ctx, s) {
    s = st(s);
    var page = clamp(Math.round(num(s.page, 0)), 0, 4);
    var box = { x: num(s.x, 0), y: num(s.y, 0), w: clamp(num(s.w, 480), 10, 4000), h: clamp(num(s.h, 270), 10, 4000) };
    ctx.save();
    // 示意圖底
    rr(ctx, box.x, box.y, box.w, box.h, 10);
    ctx.fillStyle = '#141a26'; ctx.fill();
    ctx.save();
    var sc;
    if (page === 0) {
      // 第 1 頁: 衝到終點
      sc = fitScene(ctx, box, 960, 440);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 960, 440); ctx.clip();
      ctx.scale(0.75, 0.75); drawBackground(ctx); ctx.restore();
      groundRow(ctx, 0, 960, 360, 'plain', 2);
      drawPlayer(ctx, { x: 80, y: 338, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
      drawPickup(ctx, { x: 260, y: 344, kind: 'wood', t: 0 });
      drawPickup(ctx, { x: 330, y: 344, kind: 'wood', t: 0 });
      drawBoar(ctx, { x: 580, y: 344, facing: -1, state: 'walk', hit: false, t: 0 });
      drawGoal(ctx, { x: 880, y: 320, reached: false });
      dashedPath(ctx, [116, 320, 220, 300, 300, 318, 500, 200, 690, 300, 760, 320, 840, 300], sc);
      label(ctx, '你', 80, 296, sc);
      label(ctx, '終點旗', 880, 254, sc);
    } else if (page === 1) {
      // 第 2 頁: 操作四格
      sc = fitScene(ctx, box, 880, 300);
      var cells = [
        { key: ['←', '→'], pose: 'run', poseT: 0.05, px: 100, py: 198 },
        { key: ['空白鍵'], pose: 'rise', poseT: 0.1, px: 100, py: 118 },
        { key: ['Z'], pose: 'slash', poseT: 0.03, px: 66, py: 198 },
        { key: ['X'], pose: 'dash', poseT: 0.05, px: 150, py: 198 }
      ];
      cells.forEach(function (c, i) {
        ctx.save();
        ctx.translate(i * 224, 0);
        rr(ctx, 0, 0, 208, 300, 10); ctx.fillStyle = '#26324a'; ctx.fill();
        ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 208, 300, 10); ctx.clip();
        groundRow(ctx, 0, 208, 220, 'plain', 2);
        if (i === 1) {
          ctx.save(); ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.moveTo(60, 216); ctx.quadraticCurveTo(80, 100, 100, 140);
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke(); ctx.restore();
        }
        if (i === 3) {
          drawPoof(ctx, { x: 96, y: 204, t: 0.12, dur: 0.3 });
        }
        drawPlayer(ctx, { x: c.px, y: c.py, cls: 'sword', facing: 1, pose: c.pose, poseT: c.poseT, invuln: false });
        ctx.restore();
        // 鍵帽(示意圖內的短標籤)
        var kx = 104, ky = 42;
        if (c.key.length === 2) { keycap(ctx, c.key[0], kx - 24, ky, 40); keycap(ctx, c.key[1], kx + 24, ky, 40); }
        else keycap(ctx, c.key[0], kx, ky, 40);
        ctx.restore();
      });
    } else if (page === 2) {
      // 第 3 頁: 過關後一直重播
      sc = fitScene(ctx, box, 640, 400);
      // 資訊列片段
      rr(ctx, 0, 0, 640, 48, 8); ctx.fillStyle = 'rgba(14,18,28,0.95)'; ctx.fill();
      matIcon(ctx, 'wood', 36, 24, 28);
      text(ctx, '12', 62, 25, { size: 22, bold: true, color: C.textDim });
      ctx.beginPath(); ctx.moveTo(96, 25); ctx.lineTo(120, 25); ctx.moveTo(112, 18); ctx.lineTo(120, 25); ctx.lineTo(112, 32);
      ctx.lineWidth = 3; ctx.strokeStyle = C.text; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.save(); ctx.translate(130, 25); ctx.scale(1.25, 1.25);
      text(ctx, '13', 0, 0, { size: 22, bold: true, color: C.gold });
      ctx.restore();
      // 已過關卡片(放大 1.6 倍)
      var cx0 = 300, cy0 = 170, k = 1.6;
      ctx.save();
      ctx.translate(cx0, cy0); ctx.scale(k, k);
      drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '草原', state: 'cleared', cost: null, stock: null, canAfford: true,
        rates: { wood: 22.5, brick: 6.0, time: 4.0, soul: 3.0 }, recordCls: 'sword', recordTime: 12.0, builtCount: 0 });
      ctx.save();
      ctx.beginPath(); ctx.rect(8, 8, 160, 90); ctx.clip();
      ctx.translate(8, 8); ctx.scale(0.125, 0.125);
      drawBackground(ctx);
      groundRow(ctx, 0, 1280, 600, 'plain', 3);
      drawPickup(ctx, { x: 586, y: 584, kind: 'wood', t: 0 });
      drawBoar(ctx, { x: 980, y: 584, facing: -1, state: 'walk', hit: false, t: 0 });
      drawGoal(ctx, { x: 1200, y: 560, reached: false });
      drawPlayer(ctx, { x: 560, y: 578, cls: 'sword', facing: 1, pose: 'run', poseT: 0, invuln: false });
      ctx.restore();
      drawCardOverlay(ctx, { x: 0, y: 0, accelLv: 0, newArea: false, selected: false });
      ctx.restore();
      // 從縮圖撿到處飛向資訊列
      var sx = cx0 + (8 + 586 * 0.125) * k, sy = cy0 + (8 + 584 * 0.125) * k;
      ctx.save();
      ctx.setLineDash([8, 7]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(120, 200, 40, 44);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(240,184,72,0.85)'; ctx.stroke();
      ctx.restore();
      circle(ctx, sx, sy, 9); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      var tq = 0.45, qx = (1 - tq) * (1 - tq) * sx + 2 * (1 - tq) * tq * 120 + tq * tq * 40, qy = (1 - tq) * (1 - tq) * sy + 2 * (1 - tq) * tq * 200 + tq * tq * 44;
      ctx.save(); ctx.translate(qx, qy); ctx.scale(1.4, 1.4);
      drawFlyingMaterial(ctx, { x: 0, y: 0, kind: 'wood', t: 0.3, dur: 0.7 });
      ctx.restore();
    } else if (page === 3) {
      // 第 4 頁: 撿多還是跑快(同一關兩張圖)
      sc = fitScene(ctx, box, 900, 330);
      [0, 1].forEach(function (side) {
        var ox = side * 470;
        ctx.save();
        ctx.translate(ox, 0);
        rr(ctx, 0, 0, 430, 250, 8); ctx.fillStyle = '#26324a'; ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 430, 250); ctx.clip();
        ctx.scale(430 / 1280, 430 / 1280);
        drawBackground(ctx);
        groundRow(ctx, 0, 1280, 600, 'plain', 3);
        for (var gx = 440; gx < 800; gx += 40) drawGround(ctx, { x: gx + 20, y: 420, top: true, theme: 'plain' });
        drawGround(ctx, { x: 380, y: 500, top: true, theme: 'plain' });
        ['wood', 'brick', 'wood', 'time', 'wood'].forEach(function (kk, i) { drawPickup(ctx, { x: 480 + i * 70, y: 384, kind: kk, t: 0 }); });
        drawPickup(ctx, { x: 300, y: 584, kind: 'wood', t: 0 });
        drawFrog(ctx, { x: 640, y: 386, facing: -1, state: 'crouch', hit: false });
        drawShooterBee(ctx, { x: 700, y: 300, facing: -1, state: 'fly', hit: false, t: 0 });
        drawBoar(ctx, { x: 960, y: 584, facing: -1, state: 'walk', hit: false, t: 0 });
        drawGoal(ctx, { x: 1220, y: 560, reached: false });
        drawPlayer(ctx, { x: 70, y: 578, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
        var s2 = sc * 430 / 1280;
        if (side === 0) {
          dashedPath(ctx, [100, 560, 300, 540, 370, 470, 420, 400, 560, 350, 760, 350, 820, 420, 900, 560, 960, 540, 1100, 540, 1190, 540], s2);
        } else {
          dashedPath(ctx, [100, 560, 400, 540, 640, 540, 900, 500, 1060, 540, 1130, 545, 1190, 540], s2);
        }
        ctx.restore();
        ctx.restore();
        label(ctx, side === 0 ? '素材多 / 秒數長' : '素材少 / 秒數短', ox + 215, 290, sc, { px: 15 });
      });
    } else {
      // 第 5 頁: 重建廢墟
      sc = fitScene(ctx, box, 900, 380);
      [0, 1].forEach(function (side) {
        var ox = side === 0 ? 0 : 520;
        ctx.save();
        ctx.translate(ox, 0);
        rr(ctx, 0, 0, 380, 380, 10); ctx.fillStyle = '#26324a'; ctx.fill();
        ctx.save(); ctx.beginPath(); rr(ctx, 0, 0, 380, 380, 10); ctx.clip();
        ctx.save(); ctx.scale(0.55, 0.55); drawBackground(ctx); ctx.restore();
        groundRow(ctx, 0, 380, 300, 'plain', 2);
        storageAt(ctx, 60, 140, side === 1);
        if (side === 1) drawPlayer(ctx, { x: 282, y: 278, cls: 'sword', facing: -1, pose: 'run', poseT: 0.05, invuln: false });
        ctx.restore();
        if (side === 0) {
          circle(ctx, 40, 344, 26); ctx.fillStyle = 'rgba(14,18,28,0.85)'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = C.brick; ctx.stroke();
          matIcon(ctx, 'brick', 40, 344, 34);
        }
        ctx.restore();
      });
      // 中間箭頭
      ctx.beginPath();
      ctx.moveTo(400, 170); ctx.lineTo(470, 170); ctx.lineTo(470, 148); ctx.lineTo(505, 190);
      ctx.lineTo(470, 232); ctx.lineTo(470, 210); ctx.lineTo(400, 210); ctx.closePath();
      ctx.fillStyle = C.gold; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#2a1a08'; ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------- 匯出
  window.Art = {
    canvas: { width: 1280, height: 720 },
    palette: {
      bg: C.bgTop, mapBg: C.mapBg, panel: C.panel, text: C.text, textDim: C.textDim,
      gold: C.gold, select: C.select, lack: C.lack, good: C.good, danger: C.danger, newArea: C.newArea,
      wood: C.wood, brick: C.brick, time: C.time, soul: C.soul,
      storage: C.storage, lodge: C.lodge, tower: C.tower,
      sword: C.sword, hunter: C.hunter, bomber: C.bomber,
      player: C.playerLine, monsterLine: C.monLine,
      wall: C.wallBase, crackWall: C.crack, rubble: C.rubble
    },
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawBuilding: drawBuilding,
    drawBuildingWall: drawBuildingWall,
    drawDoorRubble: drawDoorRubble,
    drawBuildingSlot: drawBuildingSlot,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
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
