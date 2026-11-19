/* 討伐令 (LoopRaider deepen-3 game-b) — 美術繪圖模組
 * 全域物件 window.Art; 全部 Canvas 2D 幾何繪製, 不引外部資源。
 * 每個函式只負責「給狀態 → 畫出來」, 自己 save / restore。
 * 設計座標 1280x720; 美術不自己乘縮放, RD 呼叫端的 translate / scale 照用。
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- 常數
  var W = 1280, H = 720;
  var SIL = 0.2;          // 畫面縮放低於此值(縮圖 0.125)改畫剪影版
  var TXT_MIN_SCALE = 0.6; // 帶字特效在縮放低於此值時反向放大字
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var PAL = {
    bg: '#22324d', bg2: '#4a6b86', mapBg: '#16222a', mapBg2: '#1f3038',
    text: '#f2f4f8', textDim: '#9aa6b8', textDark: '#141a22',
    panel: '#18212d', panelHi: '#232f3f', panelEdge: '#3a4a60', dim: 'rgba(6,10,16,0.62)',
    select: '#ffffff', gold: '#ffd34d', danger: '#ff4b3e', good: '#ffd34d',
    wood: '#d08a3c', woodDark: '#6e4219', stone: '#a9b3bf', stoneDark: '#4f5966',
    time: '#3fd8f0', timeDark: '#11718c', soul: '#ff7ec4', soulDark: '#8f2366',
    sword: '#4f8cf0', hunter: '#2fb487', bomber: '#e8b42c', skin: '#f1c9a0',
    boar: '#8b5a3c', shield: '#6f8196', shieldFace: '#c9d3de', bee: '#f2c230', frog: '#86cf3e',
    mother: '#4a2366', brood: '#6a2aa8', broodEye: '#d88bff',
    fog: '#717b8b', fog2: '#8d96a5',
    spike: '#c8ced6', crack: '#c9a77a', rubble: '#8c939c', cave: '#2c1f38',
    chest: '#9a5b2a', flag: '#ffd34d', hook: '#d8b65a',
    link: '#ffd34d', linkDim: '#3c4a58', heart: '#ff4b3e'
  };
  var THEMES = {
    plain:  { top: '#6cc04a', edge: '#3f8a2c', in: '#7a5634', in2: '#664629', mark: '#8d6a44' },
    sky:    { top: '#e6f0fa', edge: '#a9bdd2', in: '#8e9bb0', in2: '#7a879d', mark: '#a3afc2' },
    rock:   { top: '#e09a5e', edge: '#a8603a', in: '#9a5a3a', in2: '#844b30', mark: '#b06c48' },
    swamp:  { top: '#4fb39a', edge: '#2d7a68', in: '#3e4a32', in2: '#333d29', mark: '#56633f' },
    throne: { top: '#e2c068', edge: '#a8862e', in: '#3e3550', in2: '#342c44', mark: '#5a4e72' },
    lair:   { top: '#a05ad0', edge: '#5e2a86', in: '#2a1838', in2: '#21122d', mark: '#6b2f96' }
  };
  var THEME_KEYS = ['plain', 'sky', 'rock', 'swamp', 'throne', 'lair'];
  var MATS = ['wood', 'stone', 'time', 'soul'];
  var MAT_NAME = { wood: '木材', stone: '石料', time: '時晶', soul: '獸魂' };
  var MAT_USE = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var HUD_ICON = { wood: [36, 20], stone: [206, 20], time: [376, 20], soul: [546, 20] };
  var CLS = ['sword', 'hunter', 'bomber'];
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var MON = ['boar', 'shield', 'bee', 'frog', 'mother'];
  var MON_NAME = { boar: '野豬', shield: '盾兵', bee: '射手蜂', frog: '跳蛙', mother: '巢母', brood: '巢穴怪', any: '任何怪物' };
  var ITEMS = ['cage', 'spear', 'net', 'hammer', 'nestHorn', 'soulLamp'];
  var ITEM_NAME = { cage: '捕蛙籠', spear: '野豬獵叉', net: '捕蜂網', hammer: '破盾錘', nestHorn: '巢獵號角', soulLamp: '魂燈' };
  var ITEM_FX = { cage: '跳蛙掉落 ×2', spear: '野豬掉落 ×2', net: '射手蜂掉落 ×2', hammer: '盾兵掉落 ×2', nestHorn: '巢穴怪與巢母掉落 ×2', soulLamp: '每次通關 +3 獸魂' };
  var ITEM_COL = { cage: PAL.frog, spear: PAL.boar, net: PAL.bee, hammer: PAL.shield, nestHorn: PAL.brood, soulLamp: PAL.soul };

  // ---------------------------------------------------------------- 正規化工具
  function num(v, d, lo, hi) {
    v = Number(v);
    if (v === null || !isFinite(v)) v = d;
    if (lo !== undefined && v < lo) v = lo;
    if (hi !== undefined && v > hi) v = hi;
    return v;
  }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function obj(v) { return (v && typeof v === 'object') ? v : {}; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function fac(v) { return Number(v) === -1 ? -1 : 1; }
  function str(v, d) { return (typeof v === 'string' || typeof v === 'number') ? String(v) : d; }
  function matSet(v) {
    var o = obj(v), r = {};
    for (var i = 0; i < MATS.length; i++) r[MATS[i]] = num(o[MATS[i]], 0, 0, 1e9);
    return r;
  }
  function killSet(v) {
    var o = obj(v), r = {};
    for (var i = 0; i < MON.length; i++) r[MON[i]] = Math.round(num(o[MON[i]], 0, 0, 1e7));
    return r;
  }
  function f1(v) { return num(v, 0, -1e9, 1e9).toFixed(1); }
  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
  }
  function hash(a, b) { var h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); }
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px * 10) / 10 + 'px ' + FONT; }

  // 目前的畫面縮放(扣掉底圖倍率, 讓 RD 用 devicePixelRatio 也不誤判)
  function viewScale(ctx) {
    try {
      if (!ctx || typeof ctx.getTransform !== 'function') return 1;
      var m = ctx.getTransform();
      if (!m) return 1;
      var s = Math.sqrt(m.a * m.a + m.b * m.b);
      var base = (ctx.canvas && ctx.canvas.width > 0) ? ctx.canvas.width / W : 1;
      var r = s / base;
      return (r > 0 && isFinite(r)) ? r : 1;
    } catch (e) { return 1; }
  }

  // ---------------------------------------------------------------- 基本繪圖
  function rrect(ctx, x, y, w, h, r) {
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
  function rrectPath(ctx, x, y, w, h, r) { // 不 beginPath, 給 evenodd 組合用
    r = Math.max(0, Math.min(r, w / 2, h / 2));
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
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function ellipse(ctx, x, y, rx, ry, fill, stroke, lw, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, col, lw, cap) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col; ctx.lineWidth = lw || 1; ctx.lineCap = cap || 'round'; ctx.stroke();
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function star(ctx, x, y, r, col) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2) ? r * 0.45 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  // 文字: 超過 maxW 時縮字(不低於 minPx), 預設帶深色描邊(P10)
  function text(ctx, s, x, y, px, col, align, bold, maxW, opt) {
    opt = opt || {};
    s = String(s);
    var minPx = opt.minPx || 10;
    ctx.font = font(px, bold);
    if (maxW && maxW > 0) {
      var w = ctx.measureText(s).width;
      var guard = 0;
      while (w > maxW && px > minPx && guard++ < 30) { px -= 1; ctx.font = font(px, bold); w = ctx.measureText(s).width; }
    }
    ctx.textAlign = align || 'left';
    ctx.textBaseline = opt.baseline || 'middle';
    if (opt.outline !== false) {
      ctx.lineWidth = opt.olw || Math.max(2, px * 0.22);
      ctx.strokeStyle = opt.ocol || 'rgba(8,12,18,0.85)';
      ctx.lineJoin = 'round';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = col || PAL.text;
    ctx.fillText(s, x, y);
    return px;
  }
  function textW(ctx, s, px, bold) { ctx.font = font(px, bold); return ctx.measureText(String(s)).width; }

  // ---------------------------------------------------------------- 素材圖示(資訊列、地上、飛行、花費共用同一個樣子)
  function matIcon(ctx, kind, cx, cy, s, sil) {
    var k = s / 24;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    var lw = sil ? 2.2 : 1.4;
    if (kind === 'wood') {
      // 圓木: 樹皮身 + 右端年輪
      rrect(ctx, -11, -6, 18, 12, 4);
      ctx.fillStyle = PAL.wood; ctx.fill();
      ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = lw; ctx.stroke();
      if (!sil) { line(ctx, -8, -2, 2, -2, PAL.woodDark, 1); line(ctx, -6, 2, 4, 2, PAL.woodDark, 1); }
      ellipse(ctx, 6, 0, 5, 6, '#f0c48a', PAL.woodDark, lw);
      if (!sil) ellipse(ctx, 6, 0, 2.2, 2.8, null, PAL.woodDark, 1);
    } else if (kind === 'stone') {
      // 方切石: 六角塊 + 切面
      poly(ctx, [-10, -3, -4, -9, 7, -8, 11, -1, 6, 9, -7, 9], PAL.stone, PAL.stoneDark, lw);
      if (!sil) { poly(ctx, [-10, -3, -4, -9, 7, -8, 2, -2], '#d6dde5'); line(ctx, 2, -2, 6, 9, PAL.stoneDark, 1); }
    } else if (kind === 'time') {
      // 時晶: 直立菱形水晶
      poly(ctx, [0, -11, 8, -1, 0, 11, -8, -1], PAL.time, PAL.timeDark, lw);
      if (!sil) { poly(ctx, [0, -11, 3, -1, 0, 11, -3, -1], '#b9f4fc'); }
    } else if (kind === 'soul') {
      // 獸魂: 往上燃的魂火
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.bezierCurveTo(4, -5, 9, -1, 8, 4);
      ctx.bezierCurveTo(7, 9, 3, 10, 0, 10);
      ctx.bezierCurveTo(-3, 10, -7, 9, -8, 4);
      ctx.bezierCurveTo(-9, -1, -3, -3, 0, -11);
      ctx.closePath();
      ctx.fillStyle = PAL.soul; ctx.fill();
      ctx.strokeStyle = PAL.soulDark; ctx.lineWidth = lw; ctx.stroke();
      if (!sil) { circle(ctx, -2.5, 3, 1.6, PAL.soulDark); circle(ctx, 2.5, 3, 1.6, PAL.soulDark); }
    }
    ctx.restore();
  }

  // 花費列: 只畫大於 0 的種類; stock 有給就逐項比對, 不足的數字變紅 + 紅底線
  function costItems(cost, stock, canAfford) {
    var c = matSet(cost), out = [];
    var hasStock = stock && typeof stock === 'object';
    var st = matSet(stock);
    for (var i = 0; i < MATS.length; i++) {
      var m = MATS[i];
      if (c[m] > 0) {
        var short = hasStock ? st[m] < c[m] : (canAfford === false);
        out.push({ kind: m, n: Math.round(c[m]), short: short });
      }
    }
    return out;
  }
  function drawCostRow(ctx, items, x, y, opt) {
    opt = opt || {};
    var px = opt.px || 13, isz = opt.icon || 16, gap = opt.gap || 10, align = opt.align || 'left';
    var widths = [], total = 0, i;
    for (i = 0; i < items.length; i++) {
      var w = isz + 3 + textW(ctx, items[i].n, px, true);
      widths.push(w); total += w + (i ? gap : 0);
    }
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      matIcon(ctx, it.kind, cx + isz / 2, y, isz);
      text(ctx, it.n, cx + isz + 3, y, px, it.short ? PAL.danger : PAL.text, 'left', true);
      if (it.short) line(ctx, cx, y + isz / 2 + 2, cx + widths[i], y + isz / 2 + 2, PAL.danger, 2, 'butt');
      cx += widths[i] + gap;
    }
    return total;
  }

  // ---------------------------------------------------------------- 怪物 / 職業小頭像(討伐榜、面板、結算共用)
  function monHead(ctx, mon, cx, cy, s) {
    var k = s / 24;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    var ol = 'rgba(10,12,16,0.9)';
    if (mon === 'boar') {
      circle(ctx, 0, 1, 10, PAL.boar, ol, 1.5);
      ellipse(ctx, 0, 5, 5.5, 4, '#c98e70', ol, 1.2);
      circle(ctx, -2, 5, 1, ol); circle(ctx, 2, 5, 1, ol);
      line(ctx, -6, 6, -8, 1, '#fff', 2); line(ctx, 6, 6, 8, 1, '#fff', 2);
      circle(ctx, -4, -3, 1.6, '#111'); circle(ctx, 4, -3, 1.6, '#111');
      poly(ctx, [-9, -6, -6, -11, -3, -7], '#6d4329'); poly(ctx, [9, -6, 6, -11, 3, -7], '#6d4329');
    } else if (mon === 'shield') {
      circle(ctx, -2, 0, 9, PAL.shield, ol, 1.5);
      rrect(ctx, -9, -2, 12, 3, 1); ctx.fillStyle = '#1b222b'; ctx.fill();
      rrect(ctx, 2, -10, 9, 20, 3); ctx.fillStyle = PAL.shieldFace; ctx.fill(); ctx.strokeStyle = ol; ctx.lineWidth = 1.5; ctx.stroke();
      circle(ctx, 6.5, 0, 2, PAL.shield);
    } else if (mon === 'bee') {
      ellipse(ctx, -4, -9, 5, 3.5, 'rgba(230,245,255,0.85)', ol, 1);
      ellipse(ctx, 4, -9, 5, 3.5, 'rgba(230,245,255,0.85)', ol, 1);
      circle(ctx, 0, 1, 9, PAL.bee, ol, 1.5);
      line(ctx, -8, 0, 8, 0, '#2a2216', 2.5, 'butt'); line(ctx, -6, 5, 6, 5, '#2a2216', 2.5, 'butt');
      circle(ctx, -3, -4, 1.6, '#111'); circle(ctx, 3, -4, 1.6, '#111');
    } else if (mon === 'frog') {
      ellipse(ctx, 0, 3, 11, 8, PAL.frog, ol, 1.5);
      circle(ctx, -5, -4, 4, PAL.frog, ol, 1.3); circle(ctx, 5, -4, 4, PAL.frog, ol, 1.3);
      circle(ctx, -5, -4, 1.8, '#111'); circle(ctx, 5, -4, 1.8, '#111');
      line(ctx, -5, 6, 5, 6, '#2c5a16', 1.3);
    } else if (mon === 'mother') {
      poly(ctx, [-8, -6, -12, -12, -5, -8], '#c7a6e8', ol, 1); poly(ctx, [8, -6, 12, -12, 5, -8], '#c7a6e8', ol, 1);
      circle(ctx, 0, 1, 10.5, PAL.mother, ol, 1.5);
      line(ctx, -8, 4, -3, 8, PAL.brood, 2); line(ctx, 8, 4, 3, 8, PAL.brood, 2);
      circle(ctx, -4, -2, 2, PAL.broodEye); circle(ctx, 4, -2, 2, PAL.broodEye); circle(ctx, 0, -5, 1.6, PAL.broodEye);
    } else if (mon === 'brood') {
      circle(ctx, 0, 1, 9.5, '#3a2150', ol, 1.5);
      line(ctx, -7, -3, -2, 2, PAL.brood, 2.2); line(ctx, 7, -3, 2, 2, PAL.brood, 2.2); line(ctx, -5, 7, 5, 7, PAL.brood, 2.2);
      circle(ctx, -3.5, -2, 2, PAL.broodEye); circle(ctx, 3.5, -2, 2, PAL.broodEye);
    } else { // any: 三隻剪影疊在一起
      circle(ctx, -6, 3, 6.5, PAL.boar, ol, 1.2);
      circle(ctx, 6, 3, 6.5, PAL.frog, ol, 1.2);
      circle(ctx, 0, -4, 6.5, PAL.bee, ol, 1.2);
      circle(ctx, -2, -5, 1, '#111'); circle(ctx, 2, -5, 1, '#111');
    }
    ctx.restore();
  }
  function clsIcon(ctx, cls, cx, cy, s) {
    cls = pick(cls, CLS, 'sword');
    var k = s / 24;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    var col = PAL[cls];
    circle(ctx, 0, 0, 11, col, 'rgba(10,12,16,0.9)', 1.5);
    if (cls === 'sword') {
      line(ctx, -5, 6, 6, -6, '#eef3fa', 2.6); line(ctx, -6, 1, -1, 7, '#3a2a1a', 2.4);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(-2, 0, 8, -1.2, 1.2); ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 2.4; ctx.stroke();
      line(ctx, 1.2, -7.4, 1.2, 7.4, '#eef3fa', 1); line(ctx, -4, 0, 8, 0, '#eef3fa', 1.6);
    } else {
      circle(ctx, -1, 2, 5.5, '#1d1d22'); line(ctx, 2, -3, 5, -7, '#c9a46a', 1.6); circle(ctx, 5.5, -7.5, 1.6, '#ffdd55');
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 背景
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1e2c46'); g.addColorStop(0.65, '#3b5674'); g.addColorStop(1, '#4b6a84');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 遠山(低對比, 不搶地形)
    ctx.fillStyle = 'rgba(30,44,66,0.55)';
    ctx.beginPath(); ctx.moveTo(0, H);
    var pts = [0, 520, 140, 430, 260, 500, 420, 400, 560, 480, 700, 410, 860, 490, 1000, 420, 1140, 480, 1280, 430];
    for (var i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    var cl = [[180, 140, 70], [520, 90, 90], [900, 160, 80], [1150, 80, 60]];
    for (i = 0; i < cl.length; i++) { ellipse(ctx, cl[i][0], cl[i][1], cl[i][2], cl[i][2] * 0.28, 'rgba(255,255,255,0.05)'); }
    ctx.restore();
  }
  function drawMapBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#15212a'); g.addColorStop(1, '#1d2e35');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 等高線(地圖感, 不畫路線)
    ctx.strokeStyle = 'rgba(120,170,170,0.07)'; ctx.lineWidth = 1.2;
    var cs = [[420, 380, 260], [980, 300, 220], [200, 620, 160], [1150, 620, 140]];
    for (var i = 0; i < cs.length; i++) {
      for (var r = 0; r < 4; r++) {
        ctx.beginPath();
        ctx.ellipse(cs[i][0], cs[i][1], cs[i][2] - r * 38, (cs[i][2] - r * 38) * 0.55, 0.2 * i, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(150,190,200,0.06)';
    for (var gx = 20; gx < W; gx += 40) for (var gy = 60; gy < H; gy += 40) ctx.fillRect(gx, gy, 1.5, 1.5);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 地形
  function themeOf(t) { return THEMES[pick(t, THEME_KEYS, 'plain')]; }

  function drawGround(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 20), top = s.top === true, tk = pick(s.theme, THEME_KEYS, 'plain'), th = THEMES[tk];
    var L = x - 20, T = y - 20;
    ctx.save();
    ctx.fillStyle = th.in; ctx.fillRect(L, T, 40, 40);
    var vs = viewScale(ctx);
    if (vs >= SIL) {
      var hv = hash(Math.round(x / 40), Math.round(y / 40));
      ctx.fillStyle = th.in2;
      if (tk === 'plain') {
        ctx.fillRect(L + 6 + hv * 20, T + 18, 5, 3); ctx.fillRect(L + 24 - hv * 10, T + 30, 6, 3);
      } else if (tk === 'sky') {
        ctx.fillRect(L, T + 19, 40, 2); ctx.fillRect(L + (hv > 0.5 ? 12 : 26), T + 2, 2, 17); ctx.fillRect(L + (hv > 0.5 ? 28 : 8), T + 21, 2, 19);
      } else if (tk === 'rock') {
        poly(ctx, [L, T + 14 + hv * 6, L + 40, T + 10 + hv * 6, L + 40, T + 13 + hv * 6, L, T + 17 + hv * 6], th.in2);
        poly(ctx, [L, T + 30, L + 40, T + 27 + hv * 4, L + 40, T + 30 + hv * 4, L, T + 33], th.in2);
      } else if (tk === 'swamp') {
        circle(ctx, L + 10 + hv * 18, T + 24, 3, th.in2); circle(ctx, L + 28 - hv * 10, T + 33, 2, th.in2);
      } else if (tk === 'throne') {
        ctx.strokeStyle = th.mark; ctx.lineWidth = 1; ctx.strokeRect(L + 2.5, T + 2.5, 35, 35);
        line(ctx, L + 8, T + 30, L + 20 + hv * 10, T + 14, th.in2, 1.2);
      } else { // lair
        ctx.beginPath(); ctx.moveTo(L + 4, T + 36); ctx.lineTo(L + 14 + hv * 6, T + 22); ctx.lineTo(L + 30, T + 18 + hv * 8);
        ctx.strokeStyle = 'rgba(160,90,208,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    if (top) {
      ctx.fillStyle = th.top; ctx.fillRect(L, T, 40, 8);
      ctx.fillStyle = th.edge; ctx.fillRect(L, T + 8, 40, 2);
      if (vs >= SIL) {
        if (tk === 'plain') { // 草叢(圓頭, 不用尖角: 尖角在本作 = 尖刺)
          circle(ctx, L + 8, T + 8, 3, th.top); circle(ctx, L + 22, T + 9, 3.5, th.top); circle(ctx, L + 34, T + 8, 2.5, th.top);
        } else if (tk === 'swamp') {
          ellipse(ctx, L + 12, T + 10, 3, 4, th.top); ellipse(ctx, L + 30, T + 10, 2.4, 3, th.top);
        } else if (tk === 'throne') {
          ctx.fillStyle = '#fff1b8'; ctx.fillRect(L, T, 40, 1.5);
        } else if (tk === 'sky') {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(L, T, 40, 2);
        }
      }
    }
    ctx.restore();
  }

  function drawLairBack(ctx, s) {
    s = obj(s);
    var x = num(s.x, 0, -2000, 3000), y = num(s.y, 0, -2000, 3000);
    var w = num(s.w, 40, 0, 1280), h = num(s.h, 40, 0, 720);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#160b1f'); g.addColorStop(1, '#2a1736');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (viewScale(ctx) >= SIL) {
      // 挖空岩壁的石塊紋
      ctx.strokeStyle = 'rgba(120,70,160,0.18)'; ctx.lineWidth = 1.2;
      for (var gx = 0; gx < w; gx += 40) {
        for (var gy = 0; gy < h; gy += 40) {
          var hv = hash(Math.round((x + gx) / 40), Math.round((y + gy) / 40));
          ctx.beginPath(); ctx.ellipse(x + gx + 20, y + gy + 20, 14 + hv * 4, 10 + hv * 3, hv, 0, Math.PI * 2); ctx.stroke();
          if (hv > 0.7) circle(ctx, x + gx + 8 + hv * 20, y + gy + 30, 1.6, 'rgba(216,139,255,0.35)');
        }
      }
      // 上緣陰影: 看得出是地下空間
      var g2 = ctx.createLinearGradient(0, y, 0, y + 30);
      g2.addColorStop(0, 'rgba(0,0,0,0.55)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.fillRect(x, y, w, Math.min(30, h));
    }
    ctx.restore();
  }

  function drawSpike(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 20);
    var L = x - 20, B = y + 20;
    ctx.save();
    var sil = viewScale(ctx) < SIL;
    ctx.fillStyle = '#4a4f58'; ctx.fillRect(L, B - 4, 40, 4);
    for (var i = 0; i < 4; i++) {
      var sx = L + 5 + i * 10;
      poly(ctx, [sx - 5, B - 4, sx, B - 20, sx + 5, B - 4], PAL.spike, sil ? null : '#3a3f48', 1);
      if (!sil) poly(ctx, [sx - 2, B - 12, sx, B - 20, sx + 2, B - 12], PAL.danger);
    }
    if (sil) { ctx.fillStyle = PAL.danger; ctx.fillRect(L, B - 20, 40, 6); }
    ctx.restore();
  }

  function drawCrackWall(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 20), hp = Math.round(num(s.hp, 3, 1, 3));
    var L = x - 20, T = y - 20;
    ctx.save();
    // 砌塊(淺褐) + 斜面高光, 一看就是一塊可打的牆
    ctx.fillStyle = PAL.crack; ctx.fillRect(L, T, 40, 40);
    ctx.fillStyle = '#e3c89c'; ctx.fillRect(L, T, 40, 4); ctx.fillRect(L, T, 4, 40);
    ctx.fillStyle = '#8d6f47'; ctx.fillRect(L, T + 36, 40, 4); ctx.fillRect(L + 36, T, 4, 40);
    if (viewScale(ctx) >= SIL) {
      ctx.strokeStyle = '#2a1e12'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L + 20, T + 4); ctx.lineTo(L + 16, T + 14); ctx.lineTo(L + 23, T + 22); ctx.lineTo(L + 18, T + 34); ctx.stroke();
      if (hp <= 2) {
        ctx.beginPath(); ctx.moveTo(L + 4, T + 12); ctx.lineTo(L + 12, T + 18); ctx.lineTo(L + 16, T + 14);
        ctx.moveTo(L + 23, T + 22); ctx.lineTo(L + 33, T + 26); ctx.lineTo(L + 36, T + 34); ctx.stroke();
      }
      if (hp <= 1) {
        ctx.beginPath(); ctx.moveTo(L + 6, T + 34); ctx.lineTo(L + 12, T + 26); ctx.lineTo(L + 18, T + 34);
        ctx.moveTo(L + 26, T + 6); ctx.lineTo(L + 30, T + 14); ctx.lineTo(L + 36, T + 10); ctx.stroke();
        poly(ctx, [L + 28, T + 4, L + 36, T + 4, L + 36, T + 10], '#5a4630'); // 缺角
      }
    } else {
      line(ctx, L + 6, T + 34, L + 34, T + 6, '#2a1e12', 3);
    }
    ctx.restore();
  }

  function drawWorksite(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 20);
    var kind = pick(s.kind, ['bridge', 'stairs', 'rubble'], 'bridge');
    var rep = s.repaired === true, th = themeOf(s.theme);
    var L = x - 20, T = y - 20;
    var sil = viewScale(ctx) < SIL;
    ctx.save();
    if (kind === 'bridge') {
      if (rep) { // 實心橋面: 木桁架 + 鐵釘, 看得出是人工修的
        ctx.fillStyle = '#5e3b1e'; ctx.fillRect(L, T, 40, 40);
        ctx.fillStyle = '#b77b42'; ctx.fillRect(L, T, 40, 12);
        if (!sil) {
          line(ctx, L + 13, T + 1, L + 13, T + 12, '#6e4320', 1.5, 'butt'); line(ctx, L + 27, T + 1, L + 27, T + 12, '#6e4320', 1.5, 'butt');
          line(ctx, L + 2, T + 14, L + 38, T + 38, '#8a5a2e', 4, 'butt'); line(ctx, L + 38, T + 14, L + 2, T + 38, '#8a5a2e', 4, 'butt');
          circle(ctx, L + 6, T + 6, 1.6, '#e5e8ee'); circle(ctx, L + 34, T + 6, 1.6, '#e5e8ee');
        }
        ctx.fillStyle = th.edge; ctx.fillRect(L, T + 12, 40, 2);
      } else if (s.end === true) { // 殘樁: 一根斷掉的木樁 + 斷板(不是實心)
        ctx.fillStyle = '#6e4320'; ctx.fillRect(x - 4, T, 8, 22);
        poly(ctx, [x - 4, T + 22, x - 2, T + 26, x + 1, T + 22, x + 4, T + 27, x + 4, T + 22], '#6e4320');
        ctx.fillStyle = '#b77b42'; ctx.fillRect(x - 12, T, 24, 6);
        poly(ctx, [x + 12, T, x + 16, T + 3, x + 12, T + 6], '#b77b42');
      } else if (!sil) { // 中間格: 極淡藍圖虛線, 讀得出「這裡缺一段橋」
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(200,220,255,0.28)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(L + 1, T + 1, 38, 10); ctx.setLineDash([]);
      }
    } else if (kind === 'stairs') {
      if (rep) { // 實心階梯: 切石 + 明亮踏面
        ctx.fillStyle = '#8f8a7e'; ctx.fillRect(L, T, 40, 40);
        ctx.fillStyle = '#d8d2c2'; ctx.fillRect(L, T, 40, 6);
        if (!sil) {
          ctx.strokeStyle = '#6d685d'; ctx.lineWidth = 1.2;
          ctx.strokeRect(L + 0.6, T + 6.6, 38.8, 32.8); line(ctx, L, T + 22, L + 40, T + 22, '#6d685d', 1.2, 'butt');
          line(ctx, L + 20, T + 6, L + 20, T + 22, '#6d685d', 1.2, 'butt');
        }
      } else if (s.bottom === true) { // 地上一堆碎石(不是實心)
        var stones = [[-12, 15, 6], [-2, 16, 5], [9, 15, 6], [-6, 9, 4.5], [5, 10, 4], [15, 17, 3.5]];
        for (var i = 0; i < stones.length; i++) ellipse(ctx, x + stones[i][0], y + stones[i][1], stones[i][2], stones[i][2] * 0.7, '#a59f90', sil ? null : '#5f5a50', 1);
        if (!sil) { ctx.fillStyle = '#d8d2c2'; ctx.fillRect(x - 15, y + 2, 10, 3); }
      } else if (!sil) {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(200,220,255,0.22)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(L + 2, T + 38); ctx.lineTo(L + 2, T + 2); ctx.lineTo(L + 38, T + 2); ctx.stroke(); ctx.setLineDash([]);
      }
    } else { // rubble 堵塞隧道
      if (!rep) {
        ctx.fillStyle = '#3e434a'; ctx.fillRect(L, T, 40, 40);
        var b = [[-10.5, -10.5, 8.6], [10, -10.5, 8.6], [-10.5, 10, 8.6], [9, 9, 10], [0, -1, 7]];
        for (var j = 0; j < b.length; j++) {
          circle(ctx, x + b[j][0], y + b[j][1], b[j][2], PAL.rubble, sil ? null : '#2a2e34', 1.6);
          if (!sil) circle(ctx, x + b[j][0] - b[j][2] * 0.35, y + b[j][1] - b[j][2] * 0.35, b[j][2] * 0.3, '#b5bcc4');
        }
      }
    }
    ctx.restore();
  }

  function drawPenWall(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 20), th = themeOf(s.theme);
    var L = x - 20, T = y - 20;
    ctx.save();
    // 石基 + 圓頭木柵(圍場); 不用尖頭
    ctx.fillStyle = '#6f6a61'; ctx.fillRect(L, T + 26, 40, 14);
    ctx.fillStyle = th.in2; ctx.fillRect(L, T + 38, 40, 2);
    var sil = viewScale(ctx) < SIL;
    for (var i = 0; i < 3; i++) {
      var px = L + 3 + i * 13;
      rrect(ctx, px, T + 2, 10, 26, 5); ctx.fillStyle = '#a0703c'; ctx.fill();
      if (!sil) { ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    ctx.fillStyle = '#7a5228'; ctx.fillRect(L, T + 10, 40, 5);
    if (!sil) { ctx.strokeStyle = '#4b4740'; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 26.5, 39, 13); line(ctx, L + 20, T + 27, L + 20, T + 39, '#4b4740', 1, 'butt'); }
    ctx.restore();
  }

  function drawPenGate(ctx, s) {
    s = obj(s);
    var x = num(s.x, 40), y = num(s.y, 40), open = s.open === true;
    var L = x - 40, T = y - 40, B = y + 40;
    var sil = viewScale(ctx) < SIL;
    ctx.save();
    if (!open) {
      // 倒塌柵門: 交錯堆疊的粗圓木, 填滿下半到頂, 實心、打不壞
      ctx.fillStyle = '#4a2f17'; ctx.fillRect(L + 2, T + 10, 76, 70);
      var logs = [[B - 10, -0.08], [B - 26, 0.1], [B - 42, -0.12], [B - 58, 0.08]];
      for (var i = 0; i < logs.length; i++) {
        ctx.save(); ctx.translate(x, logs[i][0]); ctx.rotate(logs[i][1]);
        rrect(ctx, -36, -7, 72, 14, 7); ctx.fillStyle = '#a0703c'; ctx.fill();
        if (!sil) {
          ctx.strokeStyle = '#4a2f17'; ctx.lineWidth = 1.5; ctx.stroke();
          ellipse(ctx, 30, 0, 5, 7, '#e2b67c', '#4a2f17', 1.2); ellipse(ctx, 30, 0, 2, 3, null, '#4a2f17', 1);
          line(ctx, -26, -2, 14, -2, '#7a5228', 1);
        }
        ctx.restore();
      }
      // 一片倒下的門板斜插在上面
      if (!sil) {
        ctx.save(); ctx.translate(x - 8, T + 18); ctx.rotate(-0.35);
        ctx.fillStyle = '#c08a50'; ctx.fillRect(-22, -6, 44, 12);
        line(ctx, -22, 0, 22, 0, '#7a5228', 1.2); ctx.restore();
      }
    } else {
      // 敞開: 只剩左右門柱 + 頂梁, 門板翻貼在門柱外側; 中間 64px 淨空
      ctx.fillStyle = '#8a5d2e';
      ctx.fillRect(L, T + 2, 8, 78); ctx.fillRect(L + 72, T + 2, 8, 78);
      ctx.fillStyle = '#a0703c'; ctx.fillRect(L, T, 80, 8);
      if (!sil) {
        ctx.strokeStyle = '#4a2f17'; ctx.lineWidth = 1.4;
        ctx.strokeRect(L + 0.7, T + 2.7, 6.6, 76.6); ctx.strokeRect(L + 72.7, T + 2.7, 6.6, 76.6); ctx.strokeRect(L + 0.7, T + 0.7, 78.6, 6.6);
        // 翻開的門板(貼門柱, 不擋路)
        poly(ctx, [L + 8, T + 14, L + 14, T + 20, L + 14, T + 72, L + 8, T + 76], 'rgba(192,138,80,0.75)', '#4a2f17', 1);
        poly(ctx, [L + 72, T + 14, L + 66, T + 20, L + 66, T + 72, L + 72, T + 76], 'rgba(192,138,80,0.75)', '#4a2f17', 1);
        // 頂梁上的獸頭牌(獵場)
        circle(ctx, x, T + 4, 4, '#e2b67c', '#4a2f17', 1);
      }
    }
    ctx.restore();
  }

  function drawCaveRubble(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 20);
    var L = x - 20, T = y - 20;
    var sil = viewScale(ctx) < SIL;
    ctx.save();
    ctx.fillStyle = '#140c1c'; ctx.fillRect(L, T, 40, 40);
    var b = [[L + 2, T + 4, L + 22, T + 1, L + 24, T + 18, L + 4, T + 20], [L + 22, T + 2, L + 39, T + 6, L + 38, T + 22, L + 24, T + 18],
      [L + 1, T + 21, L + 18, T + 20, L + 20, T + 39, L + 2, T + 38], [L + 19, T + 20, L + 38, T + 23, L + 39, T + 39, L + 21, T + 39]];
    for (var i = 0; i < b.length; i++) poly(ctx, b[i], PAL.cave, sil ? null : '#0a060e', 1.4);
    if (!sil) {
      // 爪痕(暗紫發光): 通往魔物巢
      for (var k = 0; k < 3; k++) line(ctx, L + 10 + k * 7, T + 8, L + 16 + k * 7, T + 30, 'rgba(176,96,232,0.85)', 2);
      circle(ctx, L + 31, T + 31, 1.5, PAL.broodEye);
    } else {
      line(ctx, L + 8, T + 8, L + 30, T + 32, PAL.brood, 4);
    }
    ctx.restore();
  }

  function drawSiteSign(ctx, s) {
    s = obj(s);
    var x = num(s.x, 18), y = num(s.y, 24), role = pick(s.role, ['shortcut', 'hunt', 'nest'], 'shortcut');
    var B = y + 24, T = y - 24;
    ctx.save();
    ctx.fillStyle = '#6e4320'; ctx.fillRect(x - 2, T + 26, 4, 22);
    var board = role === 'shortcut' ? '#2f5f8f' : (role === 'hunt' ? '#8a5d2e' : '#3a1d55');
    rrect(ctx, x - 17, T + 1, 34, 28, 4); ctx.fillStyle = board; ctx.fill();
    ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 2; ctx.stroke();
    var cx = x, cy = T + 15;
    if (role === 'shortcut') { // 直線快進箭頭
      ctx.fillStyle = '#ffe28a';
      ctx.fillRect(cx - 11, cy - 2.5, 12, 5);
      poly(ctx, [cx + 1, cy - 8, cx + 11, cy, cx + 1, cy + 8], '#ffe28a');
      ctx.fillRect(cx - 14, cy - 2.5, 2, 5);
    } else if (role === 'hunt') { // 交叉雙矛
      line(ctx, cx - 10, cy + 9, cx + 9, cy - 8, '#f2ead8', 2.2); line(ctx, cx + 10, cy + 9, cx - 9, cy - 8, '#f2ead8', 2.2);
      poly(ctx, [cx + 9, cy - 8, cx + 11, cy - 12, cx + 6, cy - 10], '#f2ead8');
      poly(ctx, [cx - 9, cy - 8, cx - 11, cy - 12, cx - 6, cy - 10], '#f2ead8');
    } else { // 魔物爪印
      ellipse(ctx, cx, cy + 4, 6, 5, PAL.broodEye);
      circle(ctx, cx - 7, cy - 3, 2.6, PAL.broodEye); circle(ctx, cx - 2.5, cy - 7, 2.6, PAL.broodEye);
      circle(ctx, cx + 2.5, cy - 7, 2.6, PAL.broodEye); circle(ctx, cx + 7, cy - 3, 2.6, PAL.broodEye);
    }
    ctx.restore();
  }

  function drawFog(ctx, s) {
    s = obj(s);
    var x = num(s.x, 0, -2000, 3000), y = num(s.y, 0, -2000, 3000);
    var w = num(s.w, 80, 0, 1280), h = num(s.h, 80, 0, 720);
    var a = num(s.alpha, 1, 0, 1), t = num(s.t, 0, 0, 1e6);
    if (a <= 0 || w <= 0 || h <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = PAL.fog; ctx.fillRect(x, y, w, h);
    if (viewScale(ctx) >= SIL) {
      // 霧團以世界格錨定, 相鄰矩形接起來沒有接縫; t 讓它緩慢流動
      var gx0 = Math.floor(x / 80) - 1, gx1 = Math.ceil((x + w) / 80) + 1;
      var gy0 = Math.floor(y / 80) - 1, gy1 = Math.ceil((y + h) / 80) + 1;
      for (var gx = gx0; gx <= gx1; gx++) {
        for (var gy = gy0; gy <= gy1; gy++) {
          var hv = hash(gx, gy);
          var cx = gx * 80 + 40 + Math.sin(t * 0.35 + hv * 6.28) * 16;
          var cy = gy * 80 + 40 + Math.cos(t * 0.27 + hv * 5.1) * 9;
          ellipse(ctx, cx, cy, 52 + hv * 14, 30 + hv * 8, 'rgba(160,168,182,0.42)');
          ellipse(ctx, cx + 20, cy + 22, 30, 14, 'rgba(84,92,106,0.35)');
        }
      }
      // 流動的霧紋
      ctx.strokeStyle = 'rgba(210,216,226,0.22)'; ctx.lineWidth = 3;
      for (var ly = Math.floor(y / 60) * 60 + 30; ly < y + h; ly += 60) {
        ctx.beginPath();
        for (var lx = Math.floor(x / 40) * 40 - 40; lx <= x + w + 40; lx += 20) {
          var yy = ly + Math.sin(lx * 0.03 + t * 0.6 + ly) * 7;
          if (lx === Math.floor(x / 40) * 40 - 40) ctx.moveTo(lx, yy); else ctx.lineTo(lx, yy);
        }
        ctx.stroke();
      }
    } else {
      // 縮圖: 灰底 + 斜紋, 一眼看出蓋住了
      ctx.strokeStyle = 'rgba(220,226,234,0.55)'; ctx.lineWidth = 10;
      for (var d = Math.floor((x + y) / 60) * 60 - 60; d < x + w + y + h + 60; d += 60) {
        line(ctx, d - y, y, d - y - h, y + h, 'rgba(220,226,234,0.5)', 10, 'butt');
      }
    }
    ctx.restore();
  }

  function drawHookRing(ctx, s) {
    s = obj(s);
    var x = num(s.x, 12), y = num(s.y, 12);
    ctx.save();
    line(ctx, x, y - 31, x, y - 9, '#c8b28a', 2, 'butt');
    var sil = viewScale(ctx) < SIL;
    circle(ctx, x, y, 8.5, null, sil ? PAL.hook : '#3a2e14', sil ? 5 : 5.5);
    if (!sil) circle(ctx, x, y, 8.5, null, PAL.hook, 3);
    ctx.restore();
  }

  function drawNest(ctx, s) {
    s = obj(s);
    var x = num(s.x, 32), y = num(s.y, 24);
    var st = pick(s.state, ['dormant', 'idle', 'spent'], 'dormant');
    var dur = num(s.spawnDur, 0.4, 0.01, 10), sp = num(s.spawnT, dur, 0, 1e6);
    var left = Math.round(num(s.left, 0, 0, 5));
    var B = y + 24, T = y - 24;
    var sil = viewScale(ctx) < SIL;
    var spawning = st !== 'dormant' && sp < dur, p = spawning ? sp / dur : 1;
    var open = spawning ? Math.sin(p * Math.PI) : 0;
    ctx.save();
    // 外殼土丘
    var shell = st === 'spent' ? '#3a3340' : '#4a2a62';
    ctx.beginPath(); ctx.moveTo(x - 31, B - 1); ctx.quadraticCurveTo(x - 29, T - 1, x, T + 1); ctx.quadraticCurveTo(x + 29, T - 1, x + 31, B - 1); ctx.closePath();
    ctx.fillStyle = shell; ctx.fill();
    if (!sil) { ctx.strokeStyle = '#1a0f24'; ctx.lineWidth = 2; ctx.stroke(); }
    // 洞口
    var ry = 13 + open * 5, rx = 15 + open * 4;
    if (st === 'dormant') {
      ellipse(ctx, x, B - 22, 15, 12, '#22182a');
      if (!sil) { // 閉合的岩膜 + 路徑畫的 z
        line(ctx, x - 13, B - 22, x + 13, B - 22, '#5c4870', 2); line(ctx, x - 8, B - 30, x + 8, B - 14, '#5c4870', 2);
        ctx.beginPath(); ctx.moveTo(x + 14, T + 2); ctx.lineTo(x + 20, T + 2); ctx.lineTo(x + 14, T + 8); ctx.lineTo(x + 20, T + 8);
        ctx.strokeStyle = '#9aa0ab'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    } else {
      var glow = st === 'idle' ? 0.45 + 0.35 * Math.sin(now() * 2.6) : 0;
      ellipse(ctx, x, B - 22, rx, ry, '#0a0610');
      if (st === 'idle' || spawning) {
        ellipse(ctx, x, B - 20, rx * 0.7, ry * 0.55, 'rgba(216,139,255,' + (0.25 + glow * 0.5 + open * 0.4).toFixed(3) + ')');
        circle(ctx, x - 5, B - 24, 1.8, PAL.broodEye); circle(ctx, x + 5, B - 24, 1.8, PAL.broodEye);
      }
      if (!sil) { // 洞口牙(圓頭)
        for (var i = -2; i <= 2; i++) ellipse(ctx, x + i * 6, B - 22 - ry + 2, 2.2, 3.5, st === 'spent' ? '#6c6574' : '#c7a6e8');
      }
    }
    // 剩幾隻: 框內 5 個小點
    if (!sil) {
      for (var d = 0; d < 5; d++) {
        var on = d < left && st !== 'dormant';
        circle(ctx, x - 18 + d * 9, B - 4, 2.6, on ? PAL.broodEye : 'rgba(20,12,28,0.9)', on ? null : '#6c6574', 1);
      }
    }
    // 湧出: 噴一團霧(框外上方至多 24px)
    if (spawning) {
      var a = 1 - p;
      for (var m = 0; m < 4; m++) {
        var my = T + 6 - p * 26 - m * 4, mx = x + (m - 1.5) * 9 * (0.6 + p);
        circle(ctx, mx, Math.max(T - 15, my), 8 - m, 'rgba(176,96,232,' + (0.55 * a).toFixed(3) + ')');
      }
    }
    ctx.restore();
  }

  function drawPickup(ctx, s) {
    s = obj(s);
    var x = num(s.x, 12), y = num(s.y, 12), kind = pick(s.kind, ['wood', 'stone', 'time', 'soul'], 'wood'), t = num(s.t, 0, 0, 1e6);
    ctx.save();
    var sil = viewScale(ctx) < SIL;
    if (sil) {
      ctx.fillStyle = PAL[kind]; ctx.fillRect(x - 12, y - 12, 24, 24);
      ctx.restore(); return;
    }
    var bob = Math.sin(t * 3) * 1.5;
    matIcon(ctx, kind, x, y + bob, 20);
    var sp = (t * 0.8) % 1;
    if (sp < 0.25) { var a = Math.sin(sp / 0.25 * Math.PI); star(ctx, x + 7, y - 8 + bob, 3 * a + 0.1, 'rgba(255,255,255,' + (0.9 * a).toFixed(3) + ')'); }
    ctx.restore();
  }

  function drawChest(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 18), open = s.open === true;
    var B = y + 18;
    var sil = viewScale(ctx) < SIL;
    ctx.save();
    if (!open) {
      rrect(ctx, x - 18, B - 24, 36, 24, 3); ctx.fillStyle = PAL.chest; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 18, B - 22); ctx.quadraticCurveTo(x, B - 40, x + 18, B - 22); ctx.closePath();
      ctx.fillStyle = '#b8743a'; ctx.fill();
      ctx.fillStyle = PAL.gold;
      ctx.fillRect(x - 18, B - 23, 36, 3); ctx.fillRect(x - 12, B - 30, 3, 30); ctx.fillRect(x + 9, B - 30, 3, 30);
      rrect(ctx, x - 4, B - 19, 8, 9, 2); ctx.fill();
      if (!sil) {
        ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 1.5; rrect(ctx, x - 17.25, B - 23.25, 34.5, 22.5, 3); ctx.stroke();
        var tw = (now() * 0.9) % 1;
        if (tw < 0.3) star(ctx, x + 13, B - 30, 4 * Math.sin(tw / 0.3 * Math.PI) + 0.1, '#fff6c8');
      }
    } else { // 開著的空箱: 降彩度、蓋子後仰
      rrect(ctx, x - 18, B - 22, 36, 22, 3); ctx.fillStyle = '#5c4636'; ctx.fill();
      ctx.fillStyle = '#20150e'; ctx.fillRect(x - 15, B - 22, 30, 6);
      poly(ctx, [x - 18, B - 22, x - 14, B - 34, x + 14, B - 34, x + 18, B - 22], '#6e5644', sil ? null : '#33251a', 1.2);
      ctx.fillStyle = '#8a8070'; ctx.fillRect(x - 18, B - 15, 36, 2);
    }
    ctx.restore();
  }

  function drawGoal(ctx, s) {
    s = obj(s);
    var x = num(s.x, 20), y = num(s.y, 40), reached = s.reached === true;
    var B = y + 40, T = y - 40;
    var wave = Math.sin(now() * 4) * 2;
    ctx.save();
    ellipse(ctx, x, B - 3, 14, 3, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x - 15, T + 4, 4, 76);
    circle(ctx, x - 13, T + 4, 4, PAL.gold);
    if (!reached) {
      ctx.beginPath(); ctx.moveTo(x - 11, T + 8); ctx.quadraticCurveTo(x + 4, T + 4 + wave, x + 19, T + 12);
      ctx.lineTo(x + 19, T + 34); ctx.quadraticCurveTo(x + 4, T + 26 + wave, x - 11, T + 32); ctx.closePath();
      ctx.fillStyle = PAL.flag; ctx.fill(); ctx.strokeStyle = '#8a6a12'; ctx.lineWidth = 1.5; ctx.stroke();
      star(ctx, x + 4, T + 20, 5, '#fffbe8');
    } else { // 已到: 旗面轉白、星亮、底座光圈
      ctx.beginPath(); ctx.moveTo(x - 11, T + 8); ctx.lineTo(x + 19, T + 12); ctx.lineTo(x + 19, T + 34); ctx.lineTo(x - 11, T + 32); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.stroke();
      star(ctx, x + 4, T + 21, 7, PAL.gold);
      ellipse(ctx, x, B - 4, 18, 3, null, PAL.gold, 2);
    }
    ctx.restore();
  }

  function drawRangeRing(ctx, s) {
    s = obj(s);
    var x = num(s.x, 0), y = num(s.y, 0), r = num(s.radius, 260, 0, 2000);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r - 0.75), 0, Math.PI * 2);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(47,180,135,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 玩家
  var HITW = false; // 受擊閃: 繪製期間把本體色換白
  function C(c) { return HITW ? '#ffffff' : c; }

  function drawPlayer(ctx, s) {
    s = obj(s);
    var x = num(s.x, 14), y = num(s.y, 22), cls = pick(s.cls, CLS, 'sword'), f = fac(s.facing);
    var pose = pick(s.pose, ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'shoot', 'hook', 'throw', 'wave', 'hurt'], 'idle');
    var pt = num(s.poseT, 0, 0, 1e6);
    ctx.save();
    if (s.invuln === true && Math.floor(now() / 0.08) % 2 === 0) ctx.globalAlpha = 0.35;
    var vs = viewScale(ctx);
    if (vs < SIL) {
      rrect(ctx, x - 14, y - 22, 28, 44, 7); ctx.fillStyle = PAL[cls]; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.min(6, 2 / vs); ctx.stroke();
      ctx.restore(); return;
    }
    ctx.translate(x, y); ctx.scale(f, 1);
    var main = PAL[cls], dark = cls === 'sword' ? '#24508f' : (cls === 'hunter' ? '#1a6b50' : '#8a6512');
    HITW = pose === 'hurt' && pt < 0.12;
    // 姿勢參數
    var lean = 0, headY = -12.5, bodyY = 0, feet = [[-3, 19.5], [3, 19.5]], hip = 8;
    if (pose === 'run') { var sw = Math.sin(pt * 14); feet = [[-3 + sw * 5, 19.5], [3 - sw * 5, 19.5]]; lean = 2; }
    else if (pose === 'rise') { feet = [[-4, 15], [4, 13]]; }
    else if (pose === 'fall') { feet = [[-7, 19.5], [6, 18]]; }
    else if (pose === 'dash') { lean = 3; feet = [[-8, 17], [2, 19]]; }
    else if (pose === 'wave') { headY = -6; bodyY = 6; hip = 13; feet = [[-7, 19.5], [7, 19.5]]; }
    else if (pose === 'hurt') { lean = -2; feet = [[-5, 19.5], [3, 18]]; }
    else if (pose === 'slash' || pose === 'throw' || pose === 'shoot') { lean = 1; feet = [[-5, 19.5], [5, 19.5]]; }
    // dash 速度線(衝刺反方向框外至多 60px)
    if (pose === 'dash') {
      for (var i = 0; i < 3; i++) line(ctx, -16 - i * 4, -12 + i * 10, -16 - 40 - (i % 2) * 14, -12 + i * 10, 'rgba(160,200,255,0.7)', 2.4);
      ctx.globalAlpha *= 0.3; rrect(ctx, -22, -18 + bodyY, 14, 32, 6); ctx.fillStyle = main; ctx.fill(); ctx.globalAlpha /= 0.3;
    }
    // 腿
    line(ctx, -2.5 + lean * 0.3, hip + bodyY * 0, feet[0][0], feet[0][1], C('#2b2f3a'), 5);
    line(ctx, 2.5 + lean * 0.3, hip, feet[1][0], feet[1][1], C('#2b2f3a'), 5);
    // 身體
    if (cls === 'hunter') { // 斗篷
      poly(ctx, [lean - 9, -6 + bodyY, lean + 8, -6 + bodyY, lean + 9, 10 + bodyY * 0.4, lean - 11, 10 + bodyY * 0.4], C(dark));
    }
    rrect(ctx, lean - 7, -6 + bodyY, 14, 15 - bodyY * 0.3, 4); ctx.fillStyle = C(main); ctx.fill();
    ctx.strokeStyle = 'rgba(10,12,18,0.9)'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.fillStyle = C(dark); ctx.fillRect(lean - 7, 3 + bodyY * 0.7, 14, 2.5); // 腰帶
    if (cls === 'bomber') { circle(ctx, lean - 7.5, 5 + bodyY * 0.5, 3.5, C('#6b4a22'), '#2a1e10', 1); }
    // 頭
    var hx = lean + (pose === 'hurt' ? -1 : 0);
    circle(ctx, hx, headY, 7, C(PAL.skin), 'rgba(10,12,18,0.9)', 1.3);
    if (cls === 'sword') {
      ctx.beginPath(); ctx.arc(hx, headY - 1, 7.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = C('#3a2a1e'); ctx.fill();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.moveTo(hx - 8, headY + 3); ctx.quadraticCurveTo(hx - 8, headY - 10, hx + 1, headY - 9);
      ctx.quadraticCurveTo(hx + 8, headY - 8, hx + 7, headY - 2); ctx.lineTo(hx + 3, headY - 4); ctx.quadraticCurveTo(hx - 3, headY - 5, hx - 4, headY + 3); ctx.closePath();
      ctx.fillStyle = C(main); ctx.fill(); ctx.strokeStyle = 'rgba(10,12,18,0.9)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(hx, headY - 1, 7.4, Math.PI, Math.PI * 2); ctx.fillStyle = C('#8a6512'); ctx.fill();
      rrect(ctx, hx - 2, headY - 3, 9, 4, 2); ctx.fillStyle = C('#1d2630'); ctx.fill();
      circle(ctx, hx + 4.5, headY - 1, 1.3, '#8fe8ff');
    }
    // 眼
    if (pose === 'hurt') {
      line(ctx, hx + 2, headY - 2, hx + 5, headY + 1, '#111', 1.2); line(ctx, hx + 5, headY - 2, hx + 2, headY + 1, '#111', 1.2);
    } else if (cls !== 'bomber') { circle(ctx, hx + 3.5, headY, 1.3, '#111'); }
    // 手與武器
    var sx = Math.min(lean, 1) + 2, sy = -3 + bodyY;
    if (cls === 'sword') {
      if (pose === 'slash') {
        line(ctx, sx, sy, sx + 7, sy, C(PAL.skin), 3);
        line(ctx, sx + 8, sy - 4, sx + 8, sy + 4, '#5a4020', 2); line(ctx, sx + 8, sy, sx + 11, sy, '#e8eef6', 2.6);
        if (pt < 0.15) { // 刀光: 面向側框外 50x40 內
          var a = 1 - pt / 0.15;
          ctx.beginPath(); ctx.ellipse(15, 0, 44, 19, 0, -Math.PI * 0.46, Math.PI * 0.46);
          ctx.ellipse(15, 0, 30, 12, 0, Math.PI * 0.46, -Math.PI * 0.46, true); ctx.closePath();
          ctx.fillStyle = 'rgba(220,236,255,' + (0.85 * a + 0.1).toFixed(3) + ')'; ctx.fill();
          ctx.strokeStyle = 'rgba(79,140,240,' + (0.9 * a).toFixed(3) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      } else if (pose === 'dash') {
        line(ctx, sx, sy, sx + 4, sy + 2, C(PAL.skin), 3); line(ctx, sx + 4, sy + 2, sx + 7.5, sy + 2, '#e8eef6', 2.6);
      } else {
        line(ctx, sx, sy, sx + 5, sy + 6, C(PAL.skin), 3);
        line(ctx, sx + 6, sy + 6, sx + 10, sy - 12, '#e8eef6', 2.4); line(ctx, sx + 3, sy + 4, sx + 9, sy + 6, '#5a4020', 2);
      }
    } else if (cls === 'hunter') {
      if (pose === 'hook') {
        line(ctx, sx, sy, sx + 7, sy - 14, C(PAL.skin), 3);
        ctx.beginPath(); ctx.arc(sx + 8, sy - 16, 2.5, 0, Math.PI * 2); ctx.strokeStyle = '#d0d6de'; ctx.lineWidth = 1.6; ctx.stroke();
      } else {
        var drawn = pose === 'shoot' && pt < 0.25;
        line(ctx, sx, sy, sx + 6, sy, C(PAL.skin), 3);
        ctx.beginPath(); ctx.arc(sx + 1, sy, 8.5, -1.15, 1.15); ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2.2; ctx.stroke();
        var bx = sx + 1 + Math.cos(1.15) * 8.5, by = Math.sin(1.15) * 8.5;
        ctx.beginPath(); ctx.moveTo(bx, sy - by); ctx.lineTo(drawn ? sx - 4 : bx, sy); ctx.lineTo(bx, sy + by);
        ctx.strokeStyle = '#eef3fa'; ctx.lineWidth = 0.8; ctx.stroke();
        if (drawn) line(ctx, sx - 4, sy, sx + 10, sy, '#eef3fa', 1.4);
      }
    } else {
      if (pose === 'throw') { line(ctx, sx, sy, sx + 6, sy - 13, C(PAL.skin), 3); }
      else if (pose === 'wave') { line(ctx, lean - 4, sy, lean - 12, sy + 7, C(PAL.skin), 3); line(ctx, lean + 4, sy, lean + 12, sy + 7, C(PAL.skin), 3); }
      else { line(ctx, sx, sy, sx + 4, sy + 6, C(PAL.skin), 3); circle(ctx, sx + 6, sy + 7, 4, '#1d1d22'); }
    }
    HITW = false;
    ctx.restore();
  }

  // ---------------------------------------------------------------- 怪物共用
  function stunStars(ctx, cx, cy, r, sz, squash) {
    var t = now() * 3, q = squash === undefined ? 0.3 : squash;
    for (var i = 0; i < 3; i++) {
      var a = t + i * Math.PI * 2 / 3;
      star(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * q, sz, '#ffe25a');
    }
  }
  function flungLines(ctx, x0, ys, len) { // 本地座標: 面向側 = +x (飛行方向 = 面向反向)
    for (var i = 0; i < ys.length; i++) line(ctx, x0 + 2, ys[i], x0 + len - (i % 2) * 10, ys[i], 'rgba(255,255,255,0.75)', 2.2);
  }
  function exclaim(ctx, x, y, h) { // 路徑畫的驚嘆號(不用 fillText)
    rrect(ctx, x - 2, y, 4, h * 0.65, 2); ctx.fillStyle = PAL.danger; ctx.fill();
    circle(ctx, x, y + h * 0.88, 2, PAL.danger);
  }
  function monSil(ctx, x, y, w, h, col, brood, vs) {
    ellipse(ctx, x, y, w / 2, h / 2, col, '#0c0f14', Math.min(6, 1.5 / vs));
    if (brood) circle(ctx, x, y, Math.min(w, h) * 0.26, PAL.broodEye);
  }
  function monStart(ctx, s, defs) {
    s = obj(s);
    return {
      x: num(s.x, defs.w / 2), y: num(s.y, defs.h / 2), f: fac(s.facing),
      st: pick(s.state, defs.states, defs.states[0]), hit: s.hit === true, brood: s.brood === true, t: num(s.t, 0, 0, 1e6)
    };
  }
  var OL = 'rgba(10,12,16,0.92)';

  function drawBoar(ctx, s) {
    var m = monStart(ctx, s, { w: 48, h: 32, states: ['walk', 'windup', 'charge', 'stun', 'flung'] });
    ctx.save();
    var vs = viewScale(ctx);
    if (vs < SIL) { monSil(ctx, m.x, m.y, 48, 32, PAL.boar, m.brood, vs); ctx.restore(); return; }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    HITW = m.hit;
    if (m.st === 'flung') { flungLines(ctx, 24, [-6, 2, 10], 38); ctx.rotate(-0.35); ctx.scale(0.8, 0.8); }
    var low = m.st === 'windup' ? 3 : 0, fw = m.st === 'charge' ? 1 : 0;
    var step = m.st === 'walk' ? Math.sin(m.t * 10) * 2 : 0;
    // 腿
    var legC = C('#4e3220');
    line(ctx, -12, 8, -12 - step, 14, legC, 4); line(ctx, -4, 8, -4 + step, 14, legC, 4);
    line(ctx, 8 + fw, 8, 8 + fw + step, 14, legC, 4); line(ctx, 14 + fw, 8, m.st === 'windup' ? 18 : 14 + fw - step, 14, legC, 4);
    if (m.st === 'charge') for (var i = 0; i < 3; i++) line(ctx, -23, -6 + i * 6, -17, -6 + i * 6, 'rgba(255,255,255,0.7)', 2);
    // 身體
    ellipse(ctx, -2 + fw, 1 + low, 18, Math.min(10.5, 14.2 - low), C(PAL.boar), OL, 1.5);
    ctx.beginPath(); ctx.moveTo(-14 + fw, -6 + low); ctx.quadraticCurveTo(-2 + fw, -14 + low, 10 + fw, -7 + low);
    ctx.strokeStyle = C('#4e3220'); ctx.lineWidth = 3; ctx.stroke(); // 背鬃
    line(ctx, -20 + fw, -1 + low, -23 + fw, -4 + low, C('#4e3220'), 2); // 尾
    // 頭
    var hy = 2 + low + (m.st === 'charge' ? 2 : 0);
    circle(ctx, 13 + fw, hy, 8, C(PAL.boar), OL, 1.5);
    ellipse(ctx, 19 + fw, hy + 2, 3.5, 3.5, C('#c98e70'), OL, 1);
    line(ctx, 17 + fw, hy + 5, 21 + fw, hy - 1, '#ffffff', 2); // 獠牙
    poly(ctx, [9 + fw, hy - 6, 11 + fw, hy - 12, 14 + fw, hy - 7], C('#6d4329'));
    if (m.st === 'stun') {
      line(ctx, 13 + fw, hy - 4, 17 + fw, hy, '#111', 1.3); line(ctx, 17 + fw, hy - 4, 13 + fw, hy, '#111', 1.3);
    } else {
      circle(ctx, 15 + fw, hy - 2, 1.6, m.st === 'windup' || m.st === 'charge' ? '#ffffff' : '#111');
      if (m.st === 'windup' || m.st === 'charge') line(ctx, 12 + fw, hy - 6, 18 + fw, hy - 4, '#111', 1.6);
    }
    if (m.brood) { // 巢穴記號: 暗紫紋 + 發光眼
      line(ctx, -10, -3 + low, -4, 6 + low, PAL.brood, 2.4); line(ctx, -2, -4 + low, 4, 6 + low, PAL.brood, 2.4);
      circle(ctx, 15 + fw, hy - 2, 2.2, PAL.broodEye);
    }
    HITW = false;
    if (m.st === 'windup') { // 預備: 揚塵 + 紅色驚嘆號
      circle(ctx, -18, 11, 2.5 + (m.t * 6 % 1), 'rgba(200,180,150,0.7)'); circle(ctx, -22, 9, 2, 'rgba(200,180,150,0.6)');
      exclaim(ctx, 4, -15, 11);
    }
    if (m.st === 'stun') stunStars(ctx, 4, -26, 13, 4);
    ctx.restore();
  }

  function drawShieldman(ctx, s) {
    var m = monStart(ctx, s, { w: 32, h: 44, states: ['walk', 'block', 'flung'] });
    ctx.save();
    var vs = viewScale(ctx);
    if (vs < SIL) {
      monSil(ctx, m.x, m.y, 32, 44, PAL.shield, m.brood, vs);
      ctx.fillStyle = PAL.shieldFace; ctx.fillRect(m.x + (m.f > 0 ? 6 : -16), m.y - 18, 10, 36);
      ctx.restore(); return;
    }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    HITW = m.hit;
    if (m.st === 'flung') { flungLines(ctx, 16, [-10, 0, 10], 38); ctx.rotate(-0.3); ctx.scale(0.8, 0.8); }
    var step = m.st === 'walk' ? Math.sin(m.t * 6) * 2 : 0;
    line(ctx, -5, 10, -5 - step, 19.5, C('#39424d'), 5); line(ctx, 1, 10, 1 + step, 19.5, C('#39424d'), 5);
    rrect(ctx, -10.5, -8, 14.5, 20, 4); ctx.fillStyle = C(PAL.shield); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.4; ctx.stroke();
    circle(ctx, -3, -13, 7, C('#8796a8'), OL, 1.4);
    ctx.fillStyle = '#141a22'; ctx.fillRect(-2, -14, 8, 2.5); // 面甲縫
    ctx.fillStyle = C('#b14a3a'); ctx.fillRect(-5, -21, 4, 3); // 盔頂羽(小)
    if (m.brood) { line(ctx, -9, -4, -3, 8, PAL.brood, 2.4); line(ctx, -5, -6, 1, 4, PAL.brood, 2); circle(ctx, 3, -13, 1.8, PAL.broodEye); }
    // 盾牌(面向側, 框內)
    var flash = m.st === 'block';
    rrect(ctx, 4, -19, 9.5, 36, 4);
    ctx.fillStyle = flash ? '#ffffff' : C(PAL.shieldFace); ctx.fill();
    ctx.strokeStyle = flash ? PAL.gold : '#2b3440'; ctx.lineWidth = flash ? 2 : 1.6; ctx.stroke();
    circle(ctx, 8.75, -1, 2.6, flash ? PAL.gold : C('#7d8ea2'));
    line(ctx, 8.75, -16, 8.75, -6, flash ? PAL.gold : C('#9aa8b8'), 1.4);
    HITW = false;
    ctx.restore();
  }

  function drawShooterBee(ctx, s) {
    var m = monStart(ctx, s, { w: 32, h: 32, states: ['fly', 'aim', 'flung'] });
    ctx.save();
    var vs = viewScale(ctx);
    if (vs < SIL) { monSil(ctx, m.x, m.y, 32, 32, PAL.bee, m.brood, vs); ctx.restore(); return; }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    HITW = m.hit;
    if (m.st === 'flung') { flungLines(ctx, 16, [-6, 2, 10], 38); ctx.rotate(-0.4); ctx.scale(0.85, 0.85); }
    var flap = Math.sin(now() * 40) * 2;
    var back = m.st === 'aim' ? -2 : 0;
    ellipse(ctx, -4 + back, -9 - flap * 0.5, 6, 3.5, 'rgba(225,240,255,0.8)', 'rgba(60,70,90,0.6)', 1, -0.3);
    ellipse(ctx, 3 + back, -10 + flap * 0.5, 6, 3.5, 'rgba(225,240,255,0.8)', 'rgba(60,70,90,0.6)', 1, 0.3);
    ellipse(ctx, -3 + back, 2, 10, 8, C(PAL.bee), OL, 1.4);
    ctx.save(); ctx.beginPath(); ctx.ellipse(-3 + back, 2, 10, 8, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = C('#2a2216'); ctx.fillRect(-8 + back, -8, 3, 20); ctx.fillRect(-1 + back, -8, 3, 20);
    ctx.restore();
    poly(ctx, [-12 + back, 1, -15, 3, -12 + back, 5], C('#2a2216')); // 尾刺
    circle(ctx, 9 + back, 0, 5, C('#2a2216'), OL, 1.2);
    circle(ctx, 11 + back, -1.5, 1.8, m.brood ? PAL.broodEye : '#ffffff');
    if (m.brood) { line(ctx, -9, -3, -5, 8, PAL.brood, 2); line(ctx, -2, -4, 2, 8, PAL.brood, 2); }
    // 發射管(面向側)
    rrect(ctx, 8 + back, 4, 6, 4, 1.5); ctx.fillStyle = C('#5a4a2a'); ctx.fill();
    HITW = false;
    if (m.st === 'aim') { // 瞄準: 前端聚紅光(框內)
      var p = 0.6 + 0.4 * Math.sin(now() * 30);
      circle(ctx, 12, 6, 1.5 + p, PAL.danger);
      circle(ctx, 12, 6, 3.3, null, 'rgba(255,75,62,0.6)', 1.2);
    }
    ctx.restore();
  }

  function drawFrog(ctx, s) {
    var m = monStart(ctx, s, { w: 32, h: 28, states: ['crouch', 'jump', 'flung'] });
    ctx.save();
    var vs = viewScale(ctx);
    if (vs < SIL) { monSil(ctx, m.x, m.y, 32, 28, PAL.frog, m.brood, vs); ctx.restore(); return; }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    HITW = m.hit;
    if (m.st === 'flung') { flungLines(ctx, 16, [-4, 4], 38); ctx.rotate(-0.4); ctx.scale(0.85, 0.85); }
    var legC = C('#4f8f22');
    if (m.st === 'jump') {
      line(ctx, -5, 4, -13, 12, legC, 3.5); line(ctx, -13, 12, -10, 13, legC, 3);
      line(ctx, 4, 4, 10, 10, legC, 3);
      ellipse(ctx, 0, -1, 9.5, 10, C(PAL.frog), OL, 1.4);
      ellipse(ctx, 1, 3, 5.5, 5, C('#e4f2b8'));
      circle(ctx, 5, -9, 3.6, C(PAL.frog), OL, 1.2); circle(ctx, -2, -10, 3.6, C(PAL.frog), OL, 1.2);
      circle(ctx, 6, -9, 1.6, m.brood ? PAL.broodEye : '#111'); circle(ctx, -1, -10, 1.6, m.brood ? PAL.broodEye : '#111');
      if (m.brood) { line(ctx, -6, -3, -3, 5, PAL.brood, 2.2); line(ctx, -1, -5, 3, 2, PAL.brood, 2); }
    } else {
      ellipse(ctx, -9, 10, 6, 3.5, legC); ellipse(ctx, 9, 10, 5, 3, legC);
      ellipse(ctx, 0, 5, 13, 8.5, C(PAL.frog), OL, 1.4);
      ellipse(ctx, 3, 8, 7, 4, C('#e4f2b8'));
      circle(ctx, 7, -3, 4, C(PAL.frog), OL, 1.2); circle(ctx, -1, -4, 4, C(PAL.frog), OL, 1.2);
      circle(ctx, 8, -3, 1.8, m.brood ? PAL.broodEye : '#111'); circle(ctx, 0, -4, 1.8, m.brood ? PAL.broodEye : '#111');
      line(ctx, 6, 5, 12, 4, '#2c5a16', 1.2);
      if (m.brood) { line(ctx, -9, 1, -5, 9, PAL.brood, 2.2); line(ctx, -3, 0, 1, 8, PAL.brood, 2.2); }
    }
    HITW = false;
    ctx.restore();
  }

  function drawBroodmother(ctx, s) {
    s = obj(s);
    var m = monStart(ctx, s, { w: 64, h: 56, states: ['walk', 'windup', 'charge', 'stun'] });
    var hp = num(s.hp, 12, 0, 1e4), mx = num(s.maxHp, 12, 1, 1e4);
    ctx.save();
    var vs = viewScale(ctx);
    // 血條(框外上方: 寬 56 高 6, 底邊在框上緣上方 8px), 縮圖也畫
    var by = m.y - 28 - 8 - 6;
    ctx.fillStyle = '#0c0f14'; ctx.fillRect(m.x - 28, by, 56, 6);
    ctx.fillStyle = PAL.danger; ctx.fillRect(m.x - 27, by + 1, 54 * Math.max(0, Math.min(1, hp / mx)), 4);
    if (vs >= SIL) {
      ctx.fillStyle = 'rgba(12,15,20,0.8)';
      for (var k = 1; k < mx && mx <= 24; k++) ctx.fillRect(m.x - 27 + 54 * k / mx - 0.5, by + 1, 1, 4);
    }
    if (vs < SIL) {
      ellipse(ctx, m.x, m.y, 32, 28, PAL.mother, PAL.broodEye, Math.min(8, 2 / vs));
      circle(ctx, m.x + m.f * 14, m.y - 6, 7, PAL.broodEye);
      ctx.restore(); return;
    }
    ctx.translate(m.x, m.y); ctx.scale(m.f, 1);
    HITW = m.hit;
    var low = m.st === 'windup' ? 4 : 0, fw = m.st === 'charge' ? 2 : 0;
    var step = m.st === 'walk' ? Math.sin(m.t * 6) * 2.5 : 0;
    var legC = C('#2a1338');
    line(ctx, -20, 16, -22 - step, 25, legC, 6); line(ctx, -8, 18, -8 + step, 25, legC, 6);
    line(ctx, 8 + fw, 18, 8 + fw - step, 25, legC, 6); line(ctx, 18 + fw, 16, (m.st === 'windup' ? 24 : 20 + fw) + step, 25, legC, 6);
    if (m.st === 'charge') for (var i = 0; i < 3; i++) line(ctx, -30.5, -8 + i * 9, -24, -8 + i * 9, 'rgba(255,255,255,0.7)', 2.4);
    // 身體
    ellipse(ctx, -4 + fw, 4 + low, 26, 17, C(PAL.mother), OL, 2);
    // 背甲(圓頭甲片)
    for (var j = 0; j < 4; j++) ellipse(ctx, -20 + j * 9 + fw, -11 + low + Math.abs(j - 1.5) * 1.5, 5, 6.5, C('#7a46a8'), OL, 1.2);
    // 巢穴紋
    line(ctx, -16 + fw, 0 + low, -8 + fw, 14 + low, PAL.brood, 3); line(ctx, -4 + fw, -2 + low, 2 + fw, 13 + low, PAL.brood, 3);
    // 破綻: 暈眩時背甲裂開露出金色弱點(脈動)
    if (m.st === 'stun') {
      var pu = 0.6 + 0.4 * Math.sin(now() * 8);
      circle(ctx, -6 + fw, -6 + low, 7 + pu * 2, 'rgba(255,211,77,' + (0.45 * pu).toFixed(3) + ')');
      circle(ctx, -6 + fw, -6 + low, 5, '#ffe58a', '#a8862e', 1.5);
    }
    // 頭
    var hy = 2 + low + (m.st === 'charge' ? 3 : 0);
    circle(ctx, 18 + fw, hy, 11, C('#3a1a52'), OL, 1.8);
    ctx.beginPath(); ctx.moveTo(14 + fw, hy - 9); ctx.quadraticCurveTo(12 + fw, hy - 22, 22 + fw, hy - 25);
    ctx.strokeStyle = C('#c7a6e8'); ctx.lineWidth = 3.4; ctx.stroke(); // 角
    line(ctx, 24 + fw, hy + 5, 28 + fw, hy + 9, C('#c7a6e8'), 3); line(ctx, 21 + fw, hy + 8, 25 + fw, hy + 13, C('#c7a6e8'), 3); // 顎
    if (m.st === 'stun') {
      ctx.beginPath(); ctx.arc(21 + fw, hy - 3, 2.8, 0, Math.PI * 1.6); ctx.strokeStyle = PAL.broodEye; ctx.lineWidth = 1.4; ctx.stroke();
    } else {
      var eye = m.st === 'windup' || m.st === 'charge' ? '#ffffff' : PAL.broodEye;
      circle(ctx, 22 + fw, hy - 3, 2.6, eye); circle(ctx, 16 + fw, hy - 4, 2.2, eye); circle(ctx, 19 + fw, hy + 2, 1.8, eye);
    }
    HITW = false;
    if (m.st === 'windup') {
      circle(ctx, -26, 22, 3 + (m.t * 6 % 2), 'rgba(200,180,220,0.6)'); circle(ctx, -30, 19, 2.4, 'rgba(200,180,220,0.5)');
      exclaim(ctx, 6, -26, 13);
    }
    if (m.st === 'stun') stunStars(ctx, 0, -47, 26, 4, 0.02); // 框上方 16~24px 一帶, 水平繞行, 不壓血條(框上 8~14px)
    ctx.restore();
  }

  // ---------------------------------------------------------------- 飛行物 / 特效
  function drawBeeShot(ctx, s) {
    s = obj(s);
    var x = num(s.x, 6), y = num(s.y, 6);
    ctx.save();
    var p = 0.5 + 0.5 * Math.sin(now() * 24);
    circle(ctx, x, y, 5.6, PAL.danger, '#5a0e08', 1.2);
    circle(ctx, x, y, 2 + p, '#ffe2d0');
    ctx.restore();
  }
  function drawArrow(ctx, s) {
    s = obj(s);
    var x = num(s.x, 12), y = num(s.y, 3), a = num(s.angle, 0, -1e3, 1e3);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    line(ctx, -11, 0, 7, 0, '#e8d6b0', 2, 'butt');
    poly(ctx, [6, -3, 12, 0, 6, 3], '#e8eef6', '#3a4048', 0.8);
    poly(ctx, [-11, 0, -7, -3, -4, -3, -8, 0, -4, 3, -7, 3], PAL.hunter);
    ctx.restore();
  }
  function drawBomb(ctx, s) {
    s = obj(s);
    var x = num(s.x, 8), y = num(s.y, 8), t = num(s.t, 0, 0, 1e6);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(t * 8);
    circle(ctx, 0, 0.5, 5.5, '#1d1d22', '#000', 1);
    circle(ctx, -2, -1, 1.6, 'rgba(255,255,255,0.4)');
    line(ctx, 2, -3.6, 3, -4.4, '#c9a46a', 1.4);
    var sp = 0.6 + 0.4 * Math.sin(t * 40);
    star(ctx, 3.5, -4.6, 0.8 + sp, '#ffdd55');
    ctx.restore();
  }
  function drawExplosion(ctx, s) {
    s = obj(s);
    var x = num(s.x, 60), y = num(s.y, 60), dur = num(s.dur, 0.25, 0.01, 10), t = num(s.t, 0, 0, dur), R = num(s.radius, 60, 0, 600);
    if (t >= dur) return;
    var p = t / dur, e = 1 - Math.pow(1 - p, 2);
    var r = R * (0.35 + 0.65 * e), a = 1 - p * 0.85;
    ctx.save();
    ctx.globalAlpha = a;
    // 實心火球(和震波的空心環區分)
    ctx.beginPath();
    for (var i = 0; i < 16; i++) {
      var ang = i * Math.PI / 8, rr = (i % 2) ? r * 0.82 : r;
      if (i === 0) ctx.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); else ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath(); ctx.fillStyle = '#ff8a2a'; ctx.fill();
    circle(ctx, x, y, r * 0.66, '#ffd24a');
    circle(ctx, x, y, r * 0.32, '#fff6d8');
    ctx.restore();
  }
  function drawShockwave(ctx, s) {
    s = obj(s);
    var x = num(s.x, 130), y = num(s.y, 130), dur = num(s.dur, 0.3, 0.01, 10), t = num(s.t, 0, 0, dur), R = num(s.radius, 130, 0, 1000);
    var p = t / dur, outer = Math.max(1, R * (0.15 + 0.85 * p)), wdt = Math.min(12, outer);
    var a = 1 - p * 0.8;
    ctx.save();
    // 空心環: 外緣 = 判定外緣; 環帶 [outer-12, outer]
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, outer - wdt / 2), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150,235,255,' + (0.75 * a).toFixed(3) + ')'; ctx.lineWidth = wdt; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, outer - 1), 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * a).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
    // 往外的短箭紋(推出去)
    for (var i = 0; i < 8; i++) {
      var ang = i * Math.PI / 4 + 0.2, r1 = Math.max(0, outer - wdt - 10), r2 = Math.max(0, outer - wdt - 2);
      line(ctx, x + Math.cos(ang) * r1, y + Math.sin(ang) * r1, x + Math.cos(ang) * r2, y + Math.sin(ang) * r2, 'rgba(255,255,255,' + (0.6 * a).toFixed(3) + ')', 2);
    }
    ctx.restore();
  }
  function drawPoof(ctx, s) {
    s = obj(s);
    var x = num(s.x, 24), y = num(s.y, 24), dur = num(s.dur, 0.3, 0.01, 10), t = num(s.t, 0, 0, dur), big = s.big === true;
    if (t >= dur) return;
    var p = t / dur, k = big ? 2 : 1, a = 1 - p;
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    var puffs = [[-10, -6], [9, -8], [0, 8], [-11, 9], [11, 7], [0, -12]];
    for (var i = 0; i < puffs.length; i++) {
      var d = 0.5 + p * 0.5;
      circle(ctx, puffs[i][0] * d, puffs[i][1] * d, 7 + p * 5 - (i % 2) * 1.5, 'rgba(225,228,234,' + (0.85 * a).toFixed(3) + ')');
    }
    circle(ctx, 0, 0, 9 * (1 - p) + 0.5, 'rgba(255,255,255,' + (0.9 * a).toFixed(3) + ')');
    for (var j = 0; j < 4; j++) {
      var ang = j * Math.PI / 2 + 0.6, rr = 8 + p * 14;
      ctx.fillStyle = 'rgba(120,110,100,' + a.toFixed(3) + ')';
      ctx.fillRect(Math.cos(ang) * rr - 1.5, Math.sin(ang) * rr - 1.5, 3, 3);
    }
    ctx.restore();
  }
  // 帶字特效: 被縮小重用時反向放大字(只放大字, 位移量不放大)
  function textMag(ctx) {
    var vs = viewScale(ctx);
    return vs < TXT_MIN_SCALE ? Math.min(TXT_MIN_SCALE / vs, 4) : 1;
  }
  function drawPopup(ctx, s) {
    s = obj(s);
    var x = num(s.x, 28), y = num(s.y, 12), dur = num(s.dur, 0.8, 0.01, 10), t = num(s.t, 0, 0, dur);
    var kind = pick(s.kind, MATS, 'wood'), v = Math.round(num(s.value, 1, -999, 999));
    if (t >= dur) return;
    var p = t / dur, a = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y - 30 * p);
    var mg = textMag(ctx); ctx.scale(mg, mg);
    var str2 = '+' + v;
    var tw = textW(ctx, str2, 15, true), total = 18 + 3 + tw;
    matIcon(ctx, kind, -total / 2 + 9, 0, 18);
    text(ctx, str2, -total / 2 + 21, 0, 15, PAL[kind] === PAL.stone ? '#e6ebf0' : PAL[kind], 'left', true, 0, { olw: 3.4 });
    ctx.restore();
  }
  function drawChainText(ctx, s) {
    s = obj(s);
    var x = num(s.x, 60), y = num(s.y, 16), dur = num(s.dur, 0.8, 0.01, 10), t = num(s.t, 0, 0, dur), n = Math.round(num(s.n, 2, 0, 999));
    if (t >= dur) return;
    var p = t / dur;
    var sc = p < 0.15 ? 1 + 0.3 * Math.sin(p / 0.15 * Math.PI / 2) : (p < 0.3 ? 1.3 - (p - 0.15) / 0.15 * 0.3 : 1);
    var rise = p < 0.3 ? 0 : (p - 0.3) / 0.7 * 30;
    var a = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y - rise);
    var mg = textMag(ctx); ctx.scale(mg * sc, mg * sc);
    text(ctx, n + ' 連鎖', 0, 0, 22, PAL.gold, 'center', true, 0, { olw: 4.5 });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 獵具 / 勳章圖示
  function itemIconRaw(ctx, type, cx, cy, sz) {
    type = pick(type, ITEMS, null);
    var k = sz / 32;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    rrect(ctx, -15, -15, 30, 30, 6); ctx.fillStyle = '#1b2430'; ctx.fill();
    ctx.strokeStyle = type ? ITEM_COL[type] : '#556070'; ctx.lineWidth = 2.2; ctx.stroke();
    if (type === 'cage') { // 捕蛙籠: 圓頂籠 + 籠內小蛙
      ellipse(ctx, 0, 6, 6, 4, PAL.frog, OL, 1); circle(ctx, -2.5, 2.5, 1.2, '#111'); circle(ctx, 2.5, 2.5, 1.2, '#111');
      ctx.beginPath(); ctx.moveTo(-10, 11); ctx.lineTo(-10, -2); ctx.quadraticCurveTo(0, -16, 10, -2); ctx.lineTo(10, 11);
      ctx.strokeStyle = '#d6dde5'; ctx.lineWidth = 1.8; ctx.stroke();
      for (var i = -1; i <= 1; i++) line(ctx, i * 4.5, -8 + Math.abs(i) * 1.5, i * 4.5, 11, '#d6dde5', 1.4);
      line(ctx, -11, 11, 11, 11, '#a0703c', 2.4);
    } else if (type === 'spear') { // 野豬獵叉: 雙股叉 + 獠牙橫檔
      line(ctx, -10, 11, 7, -6, '#a0703c', 2.6);
      line(ctx, 7, -6, 11, -12, '#e8eef6', 2); line(ctx, 7, -6, 3, -12, '#e8eef6', 2);
      ctx.beginPath(); ctx.moveTo(-1, 3); ctx.quadraticCurveTo(-7, -2, -6, -8); ctx.moveTo(1, 1); ctx.quadraticCurveTo(7, 0, 9, 6);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.stroke();
      circle(ctx, 0, 2, 3, PAL.boar);
    } else if (type === 'net') { // 捕蜂網: 圈網 + 網紋 + 小蜂
      line(ctx, 4, 4, 12, 12, '#a0703c', 2.6);
      circle(ctx, -3, -3, 9, 'rgba(255,255,255,0.08)', '#e8eef6', 2);
      ctx.save(); ctx.beginPath(); ctx.arc(-3, -3, 8, 0, Math.PI * 2); ctx.clip();
      for (var j = -12; j <= 6; j += 4) { line(ctx, j, -12, j, 6, 'rgba(232,238,246,0.5)', 0.8); line(ctx, -12, j, 6, j, 'rgba(232,238,246,0.5)', 0.8); }
      ctx.restore();
      circle(ctx, -3, -3, 3.4, PAL.bee, OL, 0.8); line(ctx, -5, -3, -1, -3, '#2a2216', 1.2);
    } else if (type === 'hammer') { // 破盾錘: 重錘 + 裂開的盾
      rrect(ctx, -11, -10, 9, 20, 3); ctx.fillStyle = PAL.shieldFace; ctx.fill();
      line(ctx, -7, -10, -5, -2, '#1b2430', 1.6); line(ctx, -5, -2, -8, 4, '#1b2430', 1.6);
      line(ctx, 0, 12, 7, -3, '#a0703c', 2.6);
      rrect(ctx, 1, -12, 13, 8, 2); ctx.fillStyle = '#8a929c'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1; ctx.stroke();
    } else if (type === 'nestHorn') { // 巢獵號角: 彎角 + 巢穴紋
      ctx.beginPath(); ctx.moveTo(-11, 6); ctx.quadraticCurveTo(-8, -10, 8, -9); ctx.lineTo(11, -3); ctx.quadraticCurveTo(-2, -5, -5, 9); ctx.closePath();
      ctx.fillStyle = '#c7a6e8'; ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.stroke();
      ellipse(ctx, 10, -6, 2.5, 4, '#3a1a52', null, 0, 0.4);
      line(ctx, -6, -1, -2, 3, PAL.brood, 2); line(ctx, -1, -6, 2, -2, PAL.brood, 2);
      circle(ctx, -8, 8, 2, PAL.broodEye);
    } else if (type === 'soulLamp') { // 魂燈: 提燈 + 獸魂火
      line(ctx, 0, -13, 0, -9, '#d6dde5', 1.6);
      rrect(ctx, -8, -9, 16, 20, 4); ctx.fillStyle = 'rgba(255,126,196,0.18)'; ctx.fill(); ctx.strokeStyle = '#d6dde5'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore(); ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
      matIcon(ctx, 'soul', 0, 1, 14);
      line(ctx, -9, 11, 9, 11, '#d6dde5', 2);
    } else {
      line(ctx, -6, 0, 6, 0, '#556070', 2);
    }
    ctx.restore();
  }
  function drawItemIcon(ctx, s) {
    s = obj(s);
    ctx.save();
    itemIconRaw(ctx, s.type, num(s.x, 16), num(s.y, 16), num(s.size, 32, 24, 48));
    ctx.restore();
  }
  function medalRaw(ctx, cx, cy, sz, owned) {
    var k = sz / 32;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    if (!owned) {
      ctx.setLineDash([3, 3]);
      circle(ctx, 0, 2, 11, 'rgba(40,44,54,0.8)', '#5a6070', 2);
      ctx.setLineDash([]);
      ctx.restore(); return;
    }
    // 緞帶(巢穴紫) + 金框圓章 + 紫心爪印
    poly(ctx, [-8, -15, -2, -15, -4, -6, -10, -6], PAL.brood); poly(ctx, [8, -15, 2, -15, 4, -6, 10, -6], PAL.brood);
    circle(ctx, 0, 3, 12, PAL.gold, '#7a5a10', 1.6);
    circle(ctx, 0, 3, 8.5, '#3a1a52');
    ellipse(ctx, 0, 6, 3.4, 2.8, PAL.broodEye);
    circle(ctx, -4, 1.5, 1.6, PAL.broodEye); circle(ctx, -1.3, -1, 1.6, PAL.broodEye); circle(ctx, 1.3, -1, 1.6, PAL.broodEye); circle(ctx, 4, 1.5, 1.6, PAL.broodEye);
    ctx.restore();
  }
  function drawMedalIcon(ctx, s) {
    s = obj(s);
    ctx.save();
    medalRaw(ctx, num(s.x, 16), num(s.y, 16), num(s.size, 32, 16, 48), s.owned !== false);
    ctx.restore();
  }

  function fadeAlpha(t, dur, fin, fout) {
    if (t >= dur) return 0;
    if (t < fin) return t / fin;
    if (t > dur - fout) return (dur - t) / fout;
    return 1;
  }
  function drawItemNotice(ctx, s) {
    s = obj(s);
    var dur = num(s.dur, 1.5, 0.01, 10), t = num(s.t, 0, 0, dur), what = pick(s.what, ['item', 'medal'], 'item');
    var a = fadeAlpha(t, dur, 0.2, 0.3);
    if (a <= 0) return;
    var X = 440, Y = 52;
    ctx.save();
    ctx.globalAlpha = a;
    rrect(ctx, X + 1, Y + 1, 398, 42, 10); ctx.fillStyle = 'rgba(20,28,40,0.94)'; ctx.fill();
    ctx.strokeStyle = what === 'medal' ? PAL.broodEye : PAL.gold; ctx.lineWidth = 2; ctx.stroke();
    var name = what === 'medal' ? '巢母勳章' : (ITEM_NAME[pick(s.type, ITEMS, '')] || '獵具');
    var msg = '獲得 ' + name;
    var tw = textW(ctx, msg, 18, true), total = 32 + 10 + tw, sx = X + 200 - total / 2;
    if (what === 'medal') medalRaw(ctx, sx + 16, Y + 22, 32, true); else itemIconRaw(ctx, s.type, sx + 16, Y + 22, 32);
    text(ctx, msg, sx + 42, Y + 22, 18, PAL.text, 'left', true, 340);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 討伐榜
  function bountyRow(ctx, rx, ry, b, opt) {
    opt = opt || {};
    var st = pick(b.status, ['active', 'finished'], 'active');
    rrect(ctx, rx + 1, ry + 1, 174, 53, 7); ctx.fillStyle = PAL.panelHi; ctx.fill();
    ctx.strokeStyle = '#33445a'; ctx.lineWidth = 1; ctx.stroke();
    if (st === 'finished') { text(ctx, '全部完成', rx + 88, ry + 28, 14, PAL.textDim, 'center', true); return; }
    var target = pick(b.target, ['boar', 'shield', 'bee', 'frog', 'mother', 'brood', 'any'], 'any');
    var need = Math.max(1, Math.round(num(b.need, 1, 1, 1e7))), prog = Math.round(num(b.prog, 0, 0, 1e7));
    monHead(ctx, target, rx + 19, ry + 20, 26);
    text(ctx, MON_NAME[target], rx + 19, ry + 44, 10, PAL.textDim, 'center', false, 34);
    var progStr = opt.progText || (Math.min(prog, need) + '/' + need);
    text(ctx, progStr, rx + 38, ry + 13, 13, PAL.text, 'left', true, opt.noReward ? 128 : 66);
    if (!opt.noReward) {
      var items = costItems(b.reward, null, true);
      drawCostRow(ctx, items, rx + 170, ry + 13, { px: 11, icon: 12, gap: 5, align: 'right' });
    }
    // 進度條: 數字給讀數, 條給「離完成還多遠」
    var bx = rx + 38, bw = 132, byy = ry + 25;
    rrect(ctx, bx, byy, bw, 7, 3.5); ctx.fillStyle = '#0e141c'; ctx.fill();
    var fr = Math.max(0, Math.min(1, prog / need));
    if (fr > 0) { rrect(ctx, bx, byy, Math.max(7, bw * fr), 7, 3.5); ctx.fillStyle = '#e8a23a'; ctx.fill(); }
    if (opt.gainFrom !== undefined) { // 說明頁: 剛加的那一段畫亮白
      var f0 = Math.max(0, Math.min(1, opt.gainFrom / need));
      ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + bw * f0, byy, Math.max(4, bw * (fr - f0)), 7);
    }
    if (!opt.noReward && b.bonusText) text(ctx, '永久 ' + str(b.bonusText, ''), rx + 38, ry + 44, 11, '#ffd9a0', 'left', false, 132);
  }
  function drawBountyBoard(ctx, s) {
    s = obj(s);
    var x = num(s.x, 40), y = num(s.y, 56), list = arr(s.bounties), md = Math.round(num(s.medals, 0, 0, 3));
    ctx.save();
    rrect(ctx, x, y, 176, 210, 10); ctx.fillStyle = 'rgba(16,22,30,0.92)'; ctx.fill();
    rrect(ctx, x + 1, y + 1, 174, 208, 9); ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2; ctx.stroke();
    // 標題(像一面告示板)
    ctx.fillStyle = '#7a5a2a'; rrect(ctx, x + 40, y + 2, 96, 19, 5); ctx.fill();
    text(ctx, '討伐榜', x + 88, y + 12, 14, '#fff3d8', 'center', true);
    for (var i = 0; i < 3; i++) {
      var b = obj(list[i]);
      var ry = y + 24 + i * 58;
      var nd = num(b.newDur, 0.4, 0.01, 10), nt = num(b.newT, nd, 0, 1e6);
      var dd = num(b.doneDur, 0.4, 0.01, 10), dt = num(b.doneT, dd, 0, 1e6);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, ry, 176, 56); ctx.clip();
      if (nt < nd) { // 新上榜: 欄內內容彈一下(至多 1.1 倍, 剪在欄框內)
        var sc = 1 + 0.1 * Math.sin(nt / nd * Math.PI);
        ctx.translate(x + 88, ry + 28); ctx.scale(sc, sc); ctx.translate(-x - 88, -ry - 28);
      }
      if (list[i]) bountyRow(ctx, x, ry, b); else { rrect(ctx, x + 1, ry + 1, 174, 53, 7); ctx.fillStyle = PAL.panelHi; ctx.fill(); }
      ctx.restore();
      if (dt < dd) { // 完成瞬間: 整欄閃白
        ctx.save(); ctx.globalAlpha = 0.8 * (1 - dt / dd);
        rrect(ctx, x + 1, ry + 1, 174, 53, 7); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
      }
    }
    text(ctx, '巢母勳章', x + 10, y + 202, 10, PAL.textDim, 'left', false);
    for (var m = 0; m < 3; m++) medalRaw(ctx, x + 124 + m * 18, y + 201, 16, m < md);
    ctx.restore();
  }
  function drawBountyNotice(ctx, s) {
    s = obj(s);
    var dur = num(s.dur, 2.5, 0.01, 30), t = num(s.t, 0, 0, dur);
    var a = fadeAlpha(t, dur, 0.2, 0.4);
    if (a <= 0) return;
    var X = 440, Y = 52;
    var target = pick(s.target, ['boar', 'shield', 'bee', 'frog', 'mother', 'brood', 'any'], 'any');
    ctx.save();
    ctx.globalAlpha = a;
    rrect(ctx, X + 1, Y + 1, 398, 70, 12); ctx.fillStyle = 'rgba(30,24,14,0.95)'; ctx.fill();
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2.5; ctx.stroke();
    monHead(ctx, target, X + 32, Y + 36, 36);
    var need = Math.round(num(s.need, 0, 0, 1e7));
    text(ctx, '討伐完成! ' + MON_NAME[target] + ' ×' + need, X + 60, Y + 22, 19, PAL.gold, 'left', true, 330);
    var items = costItems(s.reward, null, true);
    var w = drawCostRow(ctx, items, X + 60, Y + 51, { px: 15, icon: 18, gap: 8 });
    text(ctx, '永久: ' + str(s.bonusText, ''), X + 60 + w + 14, Y + 51, 15, '#ffd9a0', 'left', true, 330 - w - 14);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 大地圖
  function drawMapLink(ctx, s) {
    s = obj(s);
    var x1 = num(s.x1, 0), y1 = num(s.y1, 0), x2 = num(s.x2, 0), y2 = num(s.y2, 0), lit = s.lit === true;
    var mx = (x1 + x2) / 2;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (lit) {
      ctx.strokeStyle = 'rgba(255,211,77,0.25)'; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = PAL.link; ctx.lineWidth = 3.5; ctx.stroke();
    } else {
      ctx.setLineDash([7, 7]); ctx.strokeStyle = PAL.linkDim; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  function lockIcon(ctx, cx, cy, s, col) {
    var k = s / 24;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    rrect(ctx, -9, -4, 18, 14, 3); ctx.fillStyle = col; ctx.fill();
    circle(ctx, 0, 2, 2.2, '#141a22'); ctx.fillStyle = '#141a22'; ctx.fillRect(-1, 2, 2, 4);
    ctx.restore();
  }
  function drawLevelCard(ctx, s) {
    s = obj(s);
    var x = num(s.x, 0), y = num(s.y, 0), idx = Math.round(num(s.index, 1, 1, 99));
    var st = pick(s.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed');
    var name = str(s.name, '');
    ctx.save();
    if (st === 'sealed') ctx.globalAlpha = 0.6;
    rrect(ctx, x, y, 176, 136, 10);
    ctx.fillStyle = st === 'sealed' ? '#141b23' : '#1e2a36'; ctx.fill();
    rrect(ctx, x + 1.1, y + 1.1, 173.8, 133.8, 9);
    ctx.strokeStyle = st === 'cleared' ? '#8fd0ff' : (st === 'buyable' ? PAL.gold : (st === 'open' ? '#6f8aa6' : '#2e3a48'));
    ctx.lineWidth = st === 'sealed' ? 1.5 : 2.2; ctx.stroke();
    // 縮圖區底色(open / cleared 由 RD 蓋上縮圖)
    ctx.fillStyle = st === 'sealed' ? '#0e141a' : (st === 'buyable' ? '#16202a' : '#2a3a4a');
    ctx.fillRect(x + 8, y + 8, 160, 90);
    if (st === 'sealed' || st === 'buyable') {
      lockIcon(ctx, x + 88, y + 40, 30, st === 'buyable' ? PAL.gold : '#5a6676');
      drawCostRow(ctx, costItems(s.cost, s.stock, s.canAfford), x + 88, y + 78, { px: 14, icon: 18, align: 'center' });
    }
    // 文字區第一行
    var nameCol = st === 'sealed' ? PAL.textDim : PAL.text;
    text(ctx, idx + ' ' + name, x + 8, y + 115, 13, nameCol, 'left', true, 66);
    var rc = Math.round(num(s.repairedCount, 0, 0, 2));
    if (st === 'open' || st === 'cleared') text(ctx, '工程' + rc + '/2', x + 168, y + 115, 10, rc === 2 ? PAL.gold : PAL.textDim, 'right', false);
    if (st === 'cleared') {
      clsIcon(ctx, s.recordCls, x + 81, y + 115, 12);
      text(ctx, f1(s.recordTime) + '秒', x + 89, y + 115, 11, PAL.text, 'left', false, 38);
      var r = matSet(s.rates);
      for (var i = 0; i < 4; i++) {
        var cx = x + 8 + i * 41;
        matIcon(ctx, MATS[i], cx + 5, y + 129, 11);
        text(ctx, f1(r[MATS[i]]), cx + 12, y + 129, 10, PAL.text, 'left', false, 28);
      }
    } else {
      var msg = st === 'open' ? '未過關' : (st === 'buyable' ? '可解鎖' : '封鎖');
      text(ctx, msg, x + 8, y + 129, 11, st === 'buyable' ? PAL.gold : PAL.textDim, 'left', st === 'buyable');
    }
    ctx.restore();
  }
  function drawCardOverlay(ctx, s) {
    s = obj(s);
    var x = num(s.x, 0), y = num(s.y, 0), lv = Math.round(num(s.accelLv, 0, 0, 2));
    ctx.save();
    // 縮圖外框(內部透明)
    ctx.strokeStyle = '#0a1016'; ctx.lineWidth = 2; ctx.strokeRect(x + 7, y + 7, 162, 92);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 8.5, y + 8.5, 159, 89);
    if (lv > 0) { // 加速徽章(時晶色)
      var lab = lv === 1 ? '×1.25' : '×1.5';
      var bw = textW(ctx, lab, 11, true) + 10;
      rrect(ctx, x + 166 - bw, y + 10, bw, 17, 5); ctx.fillStyle = PAL.timeDark; ctx.fill();
      ctx.strokeStyle = PAL.time; ctx.lineWidth = 1.2; ctx.stroke();
      text(ctx, lab, x + 166 - bw / 2, y + 18.5, 11, '#e6fbff', 'center', true, 0, { outline: false });
    }
    if (s.newArea === true) {
      var nw = textW(ctx, '新區域', 11, true) + 12;
      rrect(ctx, x + 10, y + 10, nw, 17, 5); ctx.fillStyle = '#ff9a2e'; ctx.fill();
      ctx.strokeStyle = '#2a1404'; ctx.lineWidth = 1.2; ctx.stroke();
      text(ctx, '新區域', x + 10 + nw / 2, y + 18.5, 11, '#1a0e02', 'center', true, 0, { outline: false });
    }
    if (s.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }
  function selFrame(ctx, x, y, w, h) {
    var p = 0.5 + 0.5 * Math.sin(now() * 5);
    ctx.save();
    rrect(ctx, x - 4, y - 4, w + 8, h + 8, 13);
    ctx.strokeStyle = '#0a1016'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 + 0.3 * p).toFixed(3) + ')'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  function drawWorkshopCard(ctx, s) {
    s = obj(s);
    var x = num(s.x, 0), y = num(s.y, 0);
    ctx.save();
    rrect(ctx, x, y, 176, 136, 10); ctx.fillStyle = '#22262e'; ctx.fill();
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#2c313b'; ctx.fillRect(x + 8, y + 8, 160, 90);
    // 鐵砧 + 錘
    var cx = x + 88, cy = y + 62;
    poly(ctx, [cx - 34, cy - 16, cx + 22, cy - 16, cx + 34, cy - 10, cx + 16, cy - 2, cx + 12, cy + 10, cx + 22, cy + 22, cx - 22, cy + 22, cx - 12, cy + 10, cx - 16, cy - 2, cx - 34, cy - 8], '#5d6670', '#1a1e24', 2);
    ctx.fillStyle = '#9aa4b0'; ctx.fillRect(cx - 32, cy - 16, 52, 3);
    line(ctx, cx + 6, cy - 22, cx + 30, cy - 46, '#8a5d2e', 4);
    rrect(ctx, cx - 4, cy - 34, 18, 12, 3); ctx.save(); ctx.translate(0, 0); ctx.fillStyle = '#7d8590'; ctx.fill(); ctx.restore();
    star(ctx, cx - 10, cy - 24, 4, '#ffd34d'); star(ctx, cx - 18, cy - 30, 3, '#ffb84d');
    text(ctx, '升級所', x + 8, y + 115, 14, PAL.text, 'left', true);
    text(ctx, '招募職業 / 強化角色', x + 8, y + 129, 10, PAL.textDim, 'left', false, 160);
    if (s.anyAffordable === true) { // 醒目小記號: 金底上箭頭
      var p = 0.5 + 0.5 * Math.sin(now() * 5);
      circle(ctx, x + 158, y + 18, 11 + p * 1.5, PAL.gold, '#5a420a', 2);
      poly(ctx, [x + 158, y + 10, x + 165, y + 18, x + 161, y + 18, x + 161, y + 25, x + 155, y + 25, x + 155, y + 18, x + 151, y + 18], '#2a1e04');
    }
    if (s.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }
  function drawGoalCard(ctx, s) {
    s = obj(s);
    var x = num(s.x, 0), y = num(s.y, 0), aff = s.canAfford === true;
    ctx.save();
    rrect(ctx, x, y, 200, 136, 12); ctx.fillStyle = '#2a2414'; ctx.fill();
    ctx.strokeStyle = aff ? PAL.gold : '#8a7032'; ctx.lineWidth = aff ? 3 : 2; ctx.stroke();
    if (aff) { ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now() * 4); rrect(ctx, x + 3, y + 3, 194, 130, 10); ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); }
    // 獵王殿: 台階 + 柱廊 + 屋頂 + 獸首徽
    var cx = x + 100, by = y + 74;
    ctx.fillStyle = '#8a7032'; ctx.fillRect(cx - 56, by, 112, 6); ctx.fillRect(cx - 48, by - 4, 96, 4);
    ctx.fillStyle = '#d8c48a';
    for (var i = 0; i < 5; i++) ctx.fillRect(cx - 42 + i * 19, by - 34, 8, 30);
    poly(ctx, [cx - 54, by - 34, cx, by - 58, cx + 54, by - 34], PAL.gold, '#6a5214', 2);
    circle(ctx, cx, by - 42, 6, '#6a2a2a', '#3a1010', 1);
    text(ctx, '獵王殿', cx, y + 92, 16, PAL.gold, 'center', true);
    drawCostRow(ctx, costItems(s.cost, s.stock, s.canAfford), cx, y + 118, { px: 12, icon: 14, gap: 7, align: 'center' });
    if (s.selected === true) selFrame(ctx, x, y, 200, 136);
    ctx.restore();
  }
  function flyMat(ctx, x, y, kind, p, dx, dy) {
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    for (var i = 1; i <= 3; i++) { // 拖尾: 飛行反方向至多 24px
      circle(ctx, x - ux * i * 7, y - uy * i * 7, 6 - i * 1.4, 'rgba(' + (kind === 'wood' ? '208,138,60' : kind === 'stone' ? '169,179,191' : kind === 'time' ? '63,216,240' : '255,126,196') + ',' + (0.55 - i * 0.14).toFixed(3) + ')');
    }
    matIcon(ctx, kind, x, y, 20);
  }
  function drawFlyingMaterial(ctx, s) {
    s = obj(s);
    var x = num(s.x, 10), y = num(s.y, 10), kind = pick(s.kind, MATS, 'wood');
    var dur = num(s.dur, 0.7, 0.01, 10), t = num(s.t, 0, 0, dur);
    var tg = HUD_ICON[kind];
    ctx.save();
    flyMat(ctx, x, y, kind, t / dur, tg[0] - x, tg[1] - y);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 資訊列
  function hudCell(ctx, kind, cx0, stock, rate, bt, bd) {
    var ic = cx0 + 20;
    matIcon(ctx, kind, ic, 20, 24);
    var sc = (bt < bd) ? 1 + 0.3 * Math.sin((bt / bd) * Math.PI) : 1;
    ctx.save();
    ctx.translate(cx0 + 38, 20); ctx.scale(sc, sc);
    text(ctx, String(Math.round(stock)), 0, 0, 17, sc > 1 ? '#ffffff' : PAL.text, 'left', true, 54);
    ctx.restore();
    if (rate !== null) text(ctx, '+' + f1(rate) + '/分', cx0 + 96, 13, 11, PAL[kind] === PAL.stone ? '#d6dde5' : PAL[kind], 'left', true, 70);
    text(ctx, MAT_USE[kind], cx0 + 96, 30, 10, PAL.textDim, 'left', false);
  }
  function heart(ctx, cx, cy, s, full) {
    var k = s / 14;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-8, 0, -7, -7, -3.5, -7); ctx.bezierCurveTo(-1.5, -7, 0, -5, 0, -4);
    ctx.bezierCurveTo(0, -5, 1.5, -7, 3.5, -7); ctx.bezierCurveTo(7, -7, 8, 0, 0, 6); ctx.closePath();
    ctx.fillStyle = full ? PAL.heart : '#2a2f38'; ctx.fill();
    ctx.strokeStyle = full ? '#5a0e08' : '#59616e'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }
  function drawHud(ctx, s) {
    s = obj(s);
    var mode = pick(s.mode, ['map', 'level'], 'map');
    var stock = matSet(s.stock), rate = matSet(s.ratePerMin), bump = obj(s.bumpT), bd = num(s.bumpDur, 0.15, 0.01, 5);
    ctx.save();
    ctx.fillStyle = 'rgba(12,18,26,0.86)'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 39, W, 1);
    var xs = [16, 186, 356, 526];
    for (var i = 0; i < 4; i++) {
      var m = MATS[i];
      if (i) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(xs[i] - 4, 6, 1, 28); }
      hudCell(ctx, m, xs[i], stock[m], rate[m], num(bump[m], bd, 0, 1e6), bd);
    }
    if (mode === 'level') {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(712, 6, 1, 28);
      var cls = pick(s.cls, CLS, 'sword');
      clsIcon(ctx, cls, 734, 20, 22);
      var mh = Math.round(num(s.maxHp, 3, 1, 5)), hp = Math.round(num(s.hp, mh, 0, mh));
      for (var h = 0; h < mh; h++) heart(ctx, 758 + h * 18, 20, 15, h < hp);
      // 技能冷卻: 圈 = 總冷卻進度, 好了時實心亮起
      var cd = num(s.skillCdDur, 1, 0.01, 60), ct = num(s.skillCdT, cd, 0, 1e6), ready = ct >= cd;
      var cx = 868;
      circle(ctx, cx, 20, 13, ready ? PAL[cls] : '#1a2230', '#0a0e14', 1.5);
      if (!ready) {
        ctx.beginPath(); ctx.moveTo(cx, 20); ctx.arc(cx, 20, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ct / cd)); ctx.closePath();
        ctx.fillStyle = 'rgba(160,180,210,0.45)'; ctx.fill();
      }
      text(ctx, 'X', cx, 20.5, 12, ready ? '#ffffff' : '#7d8899', 'center', true);
      text(ctx, f1(s.time) + '秒', 890, 20, 15, PAL.text, 'left', true, 62);
      var run = matSet(s.run);
      for (var r = 0; r < 4; r++) {
        var rx = 960 + r * 54;
        matIcon(ctx, MATS[r], rx + 8, 20, 15);
        text(ctx, '+' + Math.round(run[MATS[r]]), rx + 18, 20, 12, PAL.text, 'left', true, 34);
      }
      var k = killSet(s.kills), tot = 0;
      for (var q = 0; q < MON.length; q++) tot += k[MON[q]];
      monHead(ctx, 'any', 1186, 20, 20);
      text(ctx, '×' + tot, 1198, 20, 13, PAL.text, 'left', true, 66);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 面板共用
  function dimWithHole(ctx, hole) {
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    if (hole) ctx.rect(hole[0], hole[1], hole[2], hole[3]);
    ctx.fillStyle = PAL.dim; ctx.fill('evenodd');
  }
  function panelBox(ctx, x, y, w, h, hole, edge) {
    ctx.beginPath();
    rrectPath(ctx, x, y, w, h, 14);
    if (hole) ctx.rect(hole[0], hole[1], hole[2], hole[3]);
    ctx.fillStyle = PAL.panel; ctx.fill('evenodd');
    rrect(ctx, x + 1, y + 1, w - 2, h - 2, 13); ctx.strokeStyle = edge || PAL.panelEdge; ctx.lineWidth = 2; ctx.stroke();
  }
  function rowBox(ctx, x, y, w, h, sel) {
    rrect(ctx, x, y, w, h, 9);
    ctx.fillStyle = sel ? '#263449' : PAL.panelHi; ctx.fill();
    ctx.strokeStyle = sel ? '#ffffff' : '#33445a'; ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();
  }
  function cellBox(ctx, x, y, w, h, sel, dimmed) {
    rrect(ctx, x, y, w, h, 7);
    ctx.fillStyle = dimmed ? '#161d27' : '#1c2533'; ctx.fill();
    ctx.strokeStyle = sel ? PAL.gold : '#3a4a60'; ctx.lineWidth = sel ? 2.5 : 1; ctx.stroke();
  }
  function keyHint(ctx, s, x, y) { text(ctx, s, x, y, 13, PAL.textDim, 'left', false); }
  function killsRow(ctx, kills, x, y, px, isz, maxX) {
    var k = killSet(kills), cx = x, any = false;
    for (var i = 0; i < MON.length; i++) {
      var n = k[MON[i]];
      if (n <= 0) continue;
      any = true;
      monHead(ctx, MON[i], cx + isz / 2, y, isz);
      var w = textW(ctx, '×' + n, px, true);
      text(ctx, '×' + n, cx + isz + 2, y, px, PAL.text, 'left', true);
      cx += isz + 2 + w + 10;
      if (maxX && cx > maxX) break;
    }
    if (!any) text(ctx, '—', x, y, px, PAL.textDim, 'left', false);
    return cx - x;
  }
  function ratesRow(ctx, rates, x, y, colW, isz, px) {
    var r = matSet(rates);
    for (var i = 0; i < 4; i++) {
      matIcon(ctx, MATS[i], x + i * colW + isz / 2, y, isz);
      text(ctx, f1(r[MATS[i]]) + '/分', x + i * colW + isz + 4, y, px, PAL.text, 'left', true, colW - isz - 8);
    }
  }
  function playerPortrait(ctx, cls, cx, cy, sz) { // 用遊戲內的玩家畫法放大當頭像
    ctx.save();
    ctx.translate(cx, cy); var k = sz / 44; ctx.scale(k, k);
    drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'idle', poseT: 0, invuln: false });
    ctx.restore();
  }

  // ---------------------------------------------------------------- 關卡面板
  function drawLevelPanel(ctx, s) {
    s = obj(s);
    var row = Math.round(num(s.row, 0, 0, 3));
    var stock = s.stock;
    var PV = [60, 96, 640, 360];
    ctx.save();
    dimWithHole(ctx, PV);
    panelBox(ctx, 40, 48, 1200, 640, PV);
    // 標題
    text(ctx, '第 ' + Math.round(num(s.index, 1, 1, 99)) + ' 關  ' + str(s.name, ''), 60, 72, 22, PAL.text, 'left', true, 620);
    // 預覽框: 只畫外框(在框外 1px)
    ctx.strokeStyle = '#5a6f88'; ctx.lineWidth = 2; ctx.strokeRect(PV[0] - 1, PV[1] - 1, PV[2] + 2, PV[3] + 2);

    // 背包 8 格
    var items = arr(s.items);
    for (var i = 0; i < 8; i++) {
      var bx = 60 + i * 80, by = 472;
      var it = items[i] ? obj(items[i]) : null;
      rrect(ctx, bx, by, 74, 74, 8); ctx.fillStyle = it ? '#1c2533' : '#141b24'; ctx.fill();
      ctx.strokeStyle = it ? '#3a4a60' : '#26303c'; ctx.lineWidth = 1; ctx.stroke();
      if (it) {
        itemIconRaw(ctx, it.type, bx + 37, by + 28, 40);
        var wh = it.where && typeof it.where === 'object' ? it.where : null;
        var lab = wh ? ('第' + Math.round(num(wh.level, 1, 1, 99)) + '關 ' + Math.round(num(wh.slot, 1, 1, 2)) + '號') : '未裝';
        text(ctx, lab, bx + 37, by + 63, 11, wh ? '#cfe3ff' : PAL.textDim, 'center', !!wh, 70);
      }
    }
    // 回放資訊
    rrect(ctx, 60, 560, 640, 90, 9); ctx.fillStyle = PAL.panelHi; ctx.fill(); ctx.strokeStyle = '#33445a'; ctx.lineWidth = 1; ctx.stroke();
    if (s.recordTime === null || s.recordTime === undefined) {
      text(ctx, '尚無回放', 380, 605, 16, PAL.textDim, 'center', true);
    } else {
      text(ctx, '目前回放', 74, 578, 12, PAL.textDim, 'left', false);
      clsIcon(ctx, s.recordCls, 146, 578, 18);
      text(ctx, CLS_NAME[pick(s.recordCls, CLS, 'sword')] + '  ' + f1(s.recordTime) + ' 秒', 160, 578, 14, PAL.text, 'left', true, 200);
      ratesRow(ctx, s.rates, 74, 606, 150, 16, 13);
      text(ctx, '一圈擊倒', 74, 633, 12, PAL.textDim, 'left', false);
      killsRow(ctx, s.recordKills, 136, 633, 13, 18, 690);
      if (s.newArea === true) text(ctx, '修好後還沒跑過', 686, 578, 12, '#ff9a2e', 'right', true);
    }

    // 右側四列
    var R = [[720, 96, 480, 130], [720, 236, 480, 150], [720, 396, 480, 120], [720, 526, 480, 80]];
    for (var r = 0; r < 4; r++) rowBox(ctx, R[r][0], R[r][1], R[r][2], R[r][3], row === r);

    // 職業列
    text(ctx, '職業', 732, 108, 12, row === 0 ? PAL.text : PAL.textDim, 'left', true);
    var classes = arr(s.classes), cs = Math.round(num(s.clsSel, 0, 0, 2));
    for (var c = 0; c < 3; c++) {
      var ce = obj(classes[c]), cls = pick(ce.cls, CLS, CLS[c]), owned = ce.owned === true;
      var cx = 728 + c * 158, cy = 120;
      var sel = cs === c;
      cellBox(ctx, cx, cy, 150, 100, sel && row === 0 ? true : sel, !owned);
      if (owned) {
        playerPortrait(ctx, cls, cx + 26, cy + 34, 44);
        text(ctx, CLS_NAME[cls], cx + 50, cy + 22, 15, PAL.text, 'left', true);
        text(ctx, CLS_GOOD[cls], cx + 50, cy + 44, 11, PAL.textDim, 'left', false, 96);
        if (sel) text(ctx, 'Z 出發', cx + 75, cy + 82, 14, PAL.gold, 'center', true);
      } else {
        ctx.save(); ctx.globalAlpha = 0.35; playerPortrait(ctx, cls, cx + 26, cy + 34, 44); ctx.restore();
        lockIcon(ctx, cx + 26, cy + 38, 22, '#8a96a8');
        text(ctx, CLS_NAME[cls], cx + 50, cy + 22, 15, PAL.textDim, 'left', true);
        text(ctx, CLS_GOOD[cls], cx + 50, cy + 44, 11, PAL.textDim, 'left', false, 96);
        text(ctx, '到升級所招募', cx + 75, cy + 82, 12, PAL.textDim, 'center', false);
      }
    }

    // 工程列
    var sites = arr(s.sites), ss = Math.round(num(s.siteSel, 0, 0, 1));
    var KIND_NAME = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道', pen: '獵場柵門', cave: '巢穴通道' };
    var ROLE_NAME = { shortcut: '捷徑', hunt: '獵場', nest: '巢穴' };
    for (var si = 0; si < 2; si++) {
      var se = obj(sites[si]);
      var role = pick(se.role, ['shortcut', 'hunt', 'nest'], si === 0 ? 'shortcut' : 'hunt');
      var kind = pick(se.kind, ['bridge', 'stairs', 'rubble', 'pen', 'cave'], si === 0 ? 'bridge' : 'pen');
      var sx = 725 + si * 240, sy = 236;
      cellBox(ctx, sx + 1, sy + 4, 228, 142, ss === si, se.repaired === true);
      ctx.save(); ctx.translate(sx + 26, sy + 40); ctx.scale(0.8, 0.8); drawSiteSign(ctx, { x: 0, y: 0, role: role }); ctx.restore();
      text(ctx, ROLE_NAME[role], sx + 52, sy + 26, 17, PAL.text, 'left', true);
      text(ctx, KIND_NAME[kind], sx + 52, sy + 48, 12, PAL.textDim, 'left', false, 170);
      var inside = arr(se.inside).slice(0, 4), hx = sx + 16;
      for (var q = 0; q < inside.length; q++) { monHead(ctx, pick(inside[q], MON, 'boar'), hx + 11, sy + 80, 22); hx += 26; }
      if (role === 'nest') { monHead(ctx, 'mother', hx + 14, sy + 80, 28); text(ctx, '巢母', hx + 32, sy + 80, 11, PAL.broodEye, 'left', true); }
      if (se.repaired === true) {
        text(ctx, '✓ 已完工', sx + 115, sy + 122, 15, PAL.gold, 'center', true);
      } else {
        drawCostRow(ctx, costItems(se.cost, stock, true), sx + 16, sy + 112, { px: 15, icon: 18 });
        text(ctx, 'Z 修復', sx + 214, sy + 130, 13, ss === si && row === 1 ? PAL.gold : PAL.textDim, 'right', true);
      }
    }

    // 道具格列
    text(ctx, '道具格', 732, 408, 12, row === 2 ? PAL.text : PAL.textDim, 'left', true);
    var slots = arr(s.slots), sls = Math.round(num(s.slotSel, 0, 0, 1));
    for (var sl = 0; sl < 2; sl++) {
      var type = pick(slots[sl], ITEMS, null);
      var lx = 728 + sl * 238, ly = 420;
      cellBox(ctx, lx, ly, 228, 88, sls === sl, false);
      text(ctx, (sl + 1) + '號', lx + 10, ly + 14, 11, PAL.textDim, 'left', true);
      if (type) {
        itemIconRaw(ctx, type, lx + 30, ly + 46, 36);
        text(ctx, ITEM_NAME[type], lx + 56, ly + 36, 14, PAL.text, 'left', true, 160);
        text(ctx, ITEM_FX[type], lx + 56, ly + 56, 11, '#ffd9a0', 'left', false, 166);
      } else {
        text(ctx, '空', lx + 30, ly + 46, 16, PAL.textDim, 'center', true);
      }
      if (sls === sl) text(ctx, items.length ? 'Z 換獵具' : '尚無獵具', lx + 218, ly + 76, 12, items.length && row === 2 ? PAL.gold : PAL.textDim, 'right', true);
    }

    // 加速器列
    text(ctx, '加速器', 732, 538, 12, row === 3 ? PAL.text : PAL.textDim, 'left', true);
    var al = Math.round(num(s.accelLv, 0, 0, 2));
    text(ctx, ['×1', '×1.25', '×1.5'][al], 740, 572, 24, PAL.time, 'left', true);
    for (var d = 0; d < 2; d++) { rrect(ctx, 840 + d * 26, 564, 20, 14, 3); ctx.fillStyle = d < al ? PAL.time : '#1a2230'; ctx.fill(); ctx.strokeStyle = PAL.timeDark; ctx.lineWidth = 1; ctx.stroke(); }
    if (s.accelCost === null || s.accelCost === undefined || al >= 2) {
      text(ctx, '已滿', 1180, 572, 15, PAL.textDim, 'right', true);
    } else {
      text(ctx, '下一級 ' + ['×1.25', '×1.5'][al], 920, 572, 13, PAL.textDim, 'left', false);
      drawCostRow(ctx, costItems(s.accelCost, stock, true), 1040, 572, { px: 15, icon: 18 });
      text(ctx, 'Z 購買', 1186, 572, 13, row === 3 ? PAL.gold : PAL.textDim, 'right', true);
    }
    keyHint(ctx, '↑↓ 換列  ←→ 選擇  Z 確定  X 關閉', 60, 670);
    ctx.restore();
  }
  function drawSiteHighlight(ctx, s) {
    s = obj(s);
    if (s.active === false) return;
    var x = num(s.x, 0), y = num(s.y, 0), w = num(s.w, 20, 2, 1280), h = num(s.h, 20, 2, 720);
    var p = 0.5 + 0.5 * Math.sin(now() * 6);
    ctx.save();
    ctx.strokeStyle = '#0a1016'; ctx.lineWidth = 5; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * p).toFixed(3) + ')'; ctx.lineWidth = 3; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    // 四角括號(加粗)
    var c = Math.min(16, w / 3, h / 3);
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 4;
    var corners = [[x + 2, y + 2, 1, 1], [x + w - 2, y + 2, -1, 1], [x + 2, y + h - 2, 1, -1], [x + w - 2, y + h - 2, -1, -1]];
    for (var i = 0; i < 4; i++) {
      var k = corners[i];
      ctx.beginPath(); ctx.moveTo(k[0], k[1] + k[3] * c); ctx.lineTo(k[0], k[1]); ctx.lineTo(k[0] + k[2] * c, k[1]); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 升級所
  function drawUpgradePage(ctx, s) {
    s = obj(s);
    var row = Math.round(num(s.row, 0, 0, 3)), stock = s.stock;
    ctx.save();
    dimWithHole(ctx, null);
    panelBox(ctx, 40, 48, 1200, 640, null, '#8a7a5a');
    text(ctx, '升級所', 60, 72, 22, PAL.text, 'left', true);
    var R = [[80, 110, 1120, 170], [80, 300, 1120, 100], [80, 410, 1120, 100], [80, 520, 1120, 100]];
    for (var r = 0; r < 4; r++) rowBox(ctx, R[r][0], R[r][1], R[r][2], R[r][3], row === r);
    // 招募
    text(ctx, '招募', 96, 128, 14, row === 0 ? PAL.text : PAL.textDim, 'left', true);
    var rec = arr(s.recruits), rs = Math.round(num(s.recruitSel, 0, 0, 1));
    for (var i = 0; i < 2; i++) {
      var e = obj(rec[i]), cls = pick(e.cls, CLS, i === 0 ? 'hunter' : 'bomber');
      var cx = 96 + i * 552, cy = 144;
      cellBox(ctx, cx, cy, 536, 124, rs === i, e.owned === true);
      playerPortrait(ctx, cls, cx + 46, cy + 60, 76);
      text(ctx, CLS_NAME[cls], cx + 92, cy + 34, 20, PAL.text, 'left', true);
      text(ctx, '擅長: ' + CLS_GOOD[cls], cx + 92, cy + 64, 14, PAL.textDim, 'left', false, 260);
      if (e.owned === true) {
        text(ctx, '✓ 已招募', cx + 516, cy + 62, 18, PAL.gold, 'right', true);
      } else {
        drawCostRow(ctx, costItems(e.cost, stock, true), cx + 92, cy + 96, { px: 17, icon: 20 });
        text(ctx, 'Z 招募', cx + 516, cy + 96, 15, rs === i && row === 0 ? PAL.gold : PAL.textDim, 'right', true);
      }
    }
    // 三條強化
    var stats = arr(s.stats);
    var SDEF = {
      speed: { name: '移速', max: 3, fx: ['移速 +0%', '移速 +8%', '移速 +16%', '移速 +24%'] },
      hp: { name: '血量', max: 2, fx: ['血量 3', '血量 4', '血量 5'] },
      cd: { name: '冷卻', max: 3, fx: ['技能冷卻 -0%', '技能冷卻 -15%', '技能冷卻 -30%', '技能冷卻 -45%'] }
    };
    var order = ['speed', 'hp', 'cd'];
    for (var k = 0; k < 3; k++) {
      var st = obj(stats[k]), key = pick(st.key, order, order[k]), def = SDEF[key];
      var mx = Math.round(num(st.maxLv, def.max, 1, 6)), lv = Math.round(num(st.lv, 0, 0, mx));
      var ry = R[k + 1][1], sel = row === k + 1;
      text(ctx, def.name, 100, ry + 50, 20, sel ? PAL.text : PAL.textDim, 'left', true);
      for (var b = 0; b < mx; b++) {
        rrect(ctx, 180 + b * 34, ry + 40, 28, 20, 4); ctx.fillStyle = b < lv ? PAL.soul : '#141b24'; ctx.fill();
        ctx.strokeStyle = b < lv ? PAL.soulDark : '#3a4a60'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      var curFx = def.fx[Math.min(lv, def.fx.length - 1)];
      text(ctx, '目前 ' + curFx, 320, ry + 36, 15, PAL.text, 'left', true, 300);
      if (st.cost === null || st.cost === undefined || lv >= mx) {
        text(ctx, '已滿', 1180, ry + 50, 17, PAL.textDim, 'right', true);
      } else {
        text(ctx, '下一級 ' + def.fx[Math.min(lv + 1, def.fx.length - 1)], 320, ry + 66, 14, '#ffd9a0', 'left', false, 300);
        drawCostRow(ctx, costItems(st.cost, stock, true), 900, ry + 50, { px: 17, icon: 20 });
        text(ctx, 'Z 升級', 1180, ry + 50, 15, sel ? PAL.gold : PAL.textDim, 'right', true);
      }
    }
    keyHint(ctx, '↑↓ 換列  ←→ 選擇  Z 招募 / 升級  X 關閉', 60, 670);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 結算 / 失敗 / 暫停 / 結束
  function drawResultPanel(ctx, s) {
    s = obj(s);
    var X = 280, Y = 150;
    var hasOld = s.oldTime !== null && s.oldTime !== undefined;
    ctx.save();
    panelBox(ctx, X, Y, 720, 420, null, PAL.gold);
    text(ctx, '過關', X + 360, Y + 32, 28, PAL.gold, 'center', true);
    // 這趟得到
    text(ctx, '這趟得到', X + 30, Y + 72, 13, PAL.textDim, 'left', false);
    var runItems = costItems(s.run, null, true);
    var rw = runItems.length ? drawCostRow(ctx, runItems, X + 100, Y + 72, { px: 16, icon: 20, gap: 12 }) : (text(ctx, '—', X + 100, Y + 72, 15, PAL.textDim), 20);
    var gains = arr(s.gains).slice(0, 2), gx = X + 100 + rw + 24;
    for (var g = 0; g < gains.length; g++) {
      var ge = obj(gains[g]), isMedal = ge.what === 'medal';
      if (isMedal) medalRaw(ctx, gx + 13, Y + 72, 26, true); else itemIconRaw(ctx, ge.type, gx + 13, Y + 72, 26);
      var nm = '獲得 ' + (isMedal ? '巢母勳章' : (ITEM_NAME[pick(ge.type, ITEMS, '')] || '獵具'));
      text(ctx, nm, gx + 30, Y + 72, 13, isMedal ? PAL.broodEye : PAL.gold, 'left', true);
      gx += 30 + textW(ctx, nm, 13, true) + 16;
    }
    if (!hasOld) {
      clsIcon(ctx, s.cls, X + 48, Y + 130, 30);
      text(ctx, CLS_NAME[pick(s.cls, CLS, 'sword')] + '  ' + f1(s.time) + ' 秒', X + 72, Y + 130, 20, PAL.text, 'left', true);
      text(ctx, '每分鐘產量', X + 30, Y + 182, 13, PAL.textDim, 'left', false);
      ratesRow(ctx, s.rates, X + 30, Y + 212, 160, 22, 17);
      text(ctx, '擊倒', X + 30, Y + 262, 13, PAL.textDim, 'left', false);
      killsRow(ctx, s.kills, X + 70, Y + 262, 15, 24, X + 690);
      text(ctx, '已存成回放', X + 360, Y + 330, 18, '#8fd0ff', 'center', true);
      text(ctx, 'Z 回大地圖', X + 360, Y + 384, 16, PAL.gold, 'center', true);
    } else {
      var CA = X + 260, CB = X + 520; // 兩欄中心
      text(ctx, '這一趟', CA, Y + 112, 17, PAL.text, 'center', true);
      text(ctx, '目前回放', CB, Y + 112, 17, PAL.textDim, 'center', true);
      line(ctx, X + 390, Y + 100, X + 390, Y + 330, 'rgba(255,255,255,0.12)', 1);
      text(ctx, '職業 / 秒數', X + 30, Y + 144, 13, PAL.textDim, 'left', false);
      clsIcon(ctx, s.cls, CA - 46, Y + 144, 20); text(ctx, f1(s.time) + ' 秒', CA - 30, Y + 144, 15, PAL.text, 'left', true);
      clsIcon(ctx, s.oldCls, CB - 46, Y + 144, 20); text(ctx, f1(s.oldTime) + ' 秒', CB - 30, Y + 144, 15, PAL.text, 'left', true);
      var a = matSet(s.rates), o = matSet(s.oldRates);
      for (var i = 0; i < 4; i++) {
        var m = MATS[i], ry = Y + 176 + i * 30;
        matIcon(ctx, m, X + 40, ry, 18);
        text(ctx, MAT_NAME[m] + ' /分', X + 54, ry, 13, PAL.textDim, 'left', false);
        var hiA = a[m] > o[m] + 1e-9, hiB = o[m] > a[m] + 1e-9;
        resultCell(ctx, f1(a[m]), CA, ry, hiA, hiB);
        resultCell(ctx, f1(o[m]), CB, ry, hiB, hiA);
      }
      text(ctx, '一圈擊倒', X + 30, Y + 312, 13, PAL.textDim, 'left', false);
      killsRow(ctx, s.kills, CA - 110, Y + 312, 13, 18, CA + 120);
      killsRow(ctx, s.oldKills, CB - 110, Y + 312, 13, 18, CB + 120);
      text(ctx, 'Z 採用這一趟    X 保留舊的', X + 360, Y + 384, 16, PAL.gold, 'center', true);
    }
    ctx.restore();
  }
  function resultCell(ctx, v, cx, y, hi, lo) {
    if (hi) { // 較高的一方: 金底塊 + ▲
      rrect(ctx, cx - 50, y - 12, 100, 24, 6); ctx.fillStyle = 'rgba(255,211,77,0.18)'; ctx.fill();
      poly(ctx, [cx - 40, y + 5, cx - 34, y - 5, cx - 28, y + 5], PAL.gold);
    }
    text(ctx, v, cx + 6, y, 16, hi ? PAL.gold : (lo ? PAL.textDim : PAL.text), 'center', true);
  }
  function drawFailPanel(ctx) {
    ctx.save();
    panelBox(ctx, 380, 240, 520, 240, null, PAL.danger);
    text(ctx, '失敗', 640, 312, 34, PAL.danger, 'center', true);
    text(ctx, '這一趟不會存成回放', 640, 362, 15, PAL.textDim, 'center', false);
    text(ctx, 'Z 重來    X 回大地圖', 640, 424, 18, PAL.text, 'center', true);
    ctx.restore();
  }
  function drawPausePanel(ctx, s) {
    s = obj(s);
    var mode = pick(s.mode, ['level', 'map'], 'map');
    ctx.save();
    dimWithHole(ctx, null);
    panelBox(ctx, 380, 220, 520, 280, null);
    text(ctx, '暫停', 640, 300, 34, PAL.text, 'center', true);
    if (mode === 'level') {
      text(ctx, 'Esc 繼續    Z 重來    X 回大地圖', 640, 390, 18, PAL.gold, 'center', true);
      text(ctx, '重來或回大地圖, 這一趟作廢', 640, 430, 13, PAL.textDim, 'center', false);
    } else {
      text(ctx, 'Esc 繼續', 640, 390, 18, PAL.gold, 'center', true);
    }
    ctx.restore();
  }
  function drawEndingPanel(ctx, s) {
    s = obj(s);
    var tt = Math.max(0, Math.floor(num(s.totalTime, 0, 0, 1e8)));
    var mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.save();
    panelBox(ctx, 280, 150, 720, 420, null, PAL.gold);
    var cx = 640, by = 300;
    ctx.fillStyle = '#8a7032'; ctx.fillRect(cx - 90, by, 180, 8); ctx.fillRect(cx - 78, by - 6, 156, 6);
    ctx.fillStyle = '#d8c48a'; for (var i = 0; i < 6; i++) ctx.fillRect(cx - 70 + i * 26, by - 50, 10, 44);
    poly(ctx, [cx - 88, by - 50, cx, by - 90, cx + 88, by - 50], PAL.gold, '#6a5214', 2);
    for (var j = 0; j < 6; j++) star(ctx, cx - 170 + j * 68, 180 + (j % 2) * 16, 6, j % 2 ? '#fff2b0' : PAL.gold);
    text(ctx, '獵王殿落成', cx, 360, 36, PAL.gold, 'center', true);
    text(ctx, '總遊玩時間  ' + mm + ':' + (ss < 10 ? '0' : '') + ss, cx, 420, 20, PAL.text, 'center', true);
    text(ctx, 'Z 重新開始', cx, 510, 18, PAL.textDim, 'center', true);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 說明頁示意圖
  // 只畫示意圖, 只畫在 (x, y, w, h) 框內; 頁標題、說明文字、頁碼、翻頁提示由 RD 畫。
  // 每頁以 guide.md 的「示意圖框最小寬高」當虛擬尺寸, 等比縮放置中。
  // 帶字的短標籤與鍵帽在外層以原尺寸畫(不跟著縮), 只讓場景與物件縮。
  function G(ox, oy, k) { return { x: function (v) { return ox + v * k; }, y: function (v) { return oy + v * k; }, k: k }; }
  function scene(ctx, g, vx, vy, vw, vh, ws, fn) {
    ctx.save();
    ctx.translate(g.x(vx), g.y(vy));
    ctx.scale(g.k * ws, g.k * ws);
    ctx.beginPath(); ctx.rect(0, 0, vw / ws, vh / ws); ctx.clip();
    fn();
    ctx.restore();
  }
  function groundRow(ctx, x0, x1, top, rows, theme) {
    for (var cx = x0 + 20; cx < x1; cx += 40) {
      for (var r = 0; r < rows; r++) drawGround(ctx, { x: cx, y: top + 20 + r * 40, top: r === 0, theme: theme });
    }
  }
  function tag(ctx, sx, sy, s, col) { text(ctx, s, sx, sy, 14, col || PAL.text, 'center', true, 0, { olw: 4 }); }
  function keycap(ctx, cx, cy, lab) {
    rrect(ctx, cx - 14, cy - 14, 28, 28, 6);
    ctx.fillStyle = '#eef2f8'; ctx.fill();
    ctx.strokeStyle = '#141a22'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#b9c2cf'; ctx.fillRect(cx - 12, cy + 9, 24, 3);
    text(ctx, lab, cx, cy - 1, 16, '#141a22', 'center', true, 0, { outline: false });
  }
  function dashedPath(ctx, pts, lw, arrowEnd) { // pts: [x0,y0, cx,cy,x,y, ...] 二次曲線串
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i + 3 < pts.length; i += 4) ctx.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    ctx.setLineDash([lw * 3, lw * 2.2]);
    ctx.strokeStyle = 'rgba(10,14,20,0.8)'; ctx.lineWidth = lw * 2; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lw; ctx.stroke();
    ctx.setLineDash([]);
    if (arrowEnd) {
      var n = pts.length, ex = pts[n - 2], ey = pts[n - 1], cx = pts[n - 4], cy = pts[n - 3];
      var a = Math.atan2(ey - cy, ex - cx), L = lw * 4.2;
      poly(ctx, [ex + Math.cos(a) * L * 0.5, ey + Math.sin(a) * L * 0.5, ex - Math.cos(a - 0.5) * L, ey - Math.sin(a - 0.5) * L, ex - Math.cos(a + 0.5) * L, ey - Math.sin(a + 0.5) * L], '#ffffff', 'rgba(10,14,20,0.8)', lw * 0.6);
    }
  }

  // 第 1 頁: 衝到終點(第 1 關草原縮小版)
  function guide0(ctx, g) {
    var WS = 0.5;
    scene(ctx, g, 0, 0, 480, 270, WS, function () {
      drawBackground(ctx);
      groundRow(ctx, 0, 440, 460, 2, 'plain');
      groundRow(ctx, 600, 960, 460, 2, 'plain');
      for (var c = 440; c < 600; c += 40) { // 小丘
        var hill = c >= 480 && c < 560;
        drawGround(ctx, { x: c + 20, y: 400 - (hill ? 0 : -40) + (hill ? 0 : 0), top: true, theme: 'plain' });
        if (hill) { drawGround(ctx, { x: c + 20, y: 440, top: false, theme: 'plain' }); drawGround(ctx, { x: c + 20, y: 480, top: false, theme: 'plain' }); }
        else drawGround(ctx, { x: c + 20, y: 480, top: false, theme: 'plain' });
        drawGround(ctx, { x: c + 20, y: 520, top: false, theme: 'plain' });
      }
      drawPickup(ctx, { x: 260, y: 448, kind: 'wood', t: 0.4 });
      drawGoal(ctx, { x: 880, y: 420, reached: false });
      drawBoar(ctx, { x: 340, y: 444, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
      drawPlayer(ctx, { x: 80, y: 438, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
      dashedPath(ctx, [102, 428, 180, 402, 252, 432, 336, 318, 428, 392, 520, 300, 620, 356, 740, 416, 848, 414], 3 / (g.k * WS), true);
    });
    tag(ctx, g.x(80 * WS), g.y(398 * WS), '你');
    tag(ctx, g.x(880 * WS), g.y(366 * WS), '終點旗');
  }

  // 第 2 頁: 操作(四格)
  function guide1(ctx, g) {
    var cells = [
      function () { drawPlayer(ctx, { x: 75, y: 162, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1 }); },
      function () {
        ellipse(ctx, 75, 184, 12, 3, 'rgba(0,0,0,0.3)');
        drawPlayer(ctx, { x: 75, y: 116, cls: 'sword', facing: 1, pose: 'rise', poseT: 0.1 });
      },
      function () { drawPlayer(ctx, { x: 50, y: 162, cls: 'sword', facing: 1, pose: 'slash', poseT: 0.04 }); },
      function () {
        drawPoof(ctx, { x: 64, y: 170, t: 0.1, dur: 0.3, big: false });
        drawPlayer(ctx, { x: 118, y: 162, cls: 'sword', facing: 1, pose: 'dash', poseT: 0.05 });
      }
    ];
    for (var i = 0; i < 4; i++) {
      (function (i) {
        scene(ctx, g, i * 150, 0, 150, 220, 1, function () {
          ctx.fillStyle = '#2a3e58'; ctx.fillRect(0, 0, 150, 220);
          groundRow(ctx, 0, 160, 184, 1, 'plain');
          cells[i]();
        });
      })(i);
      if (i) line(ctx, g.x(i * 150), g.y(6), g.x(i * 150), g.y(214), 'rgba(255,255,255,0.25)', 1.5);
    }
    keycap(ctx, g.x(36), g.y(150), '←'); keycap(ctx, g.x(114), g.y(150), '→');
    keycap(ctx, g.x(150 + 116), g.y(104), '↑');
    keycap(ctx, g.x(300 + 46), g.y(108), 'Z');
    keycap(ctx, g.x(450 + 104), g.y(112), 'X');
  }

  // 卡片 + 局部放大縮圖(說明頁用; 縮圖為局部放大, 非實際 0.125 比例)
  function guideCard(ctx, cx, cy, thumb) {
    drawLevelCard(ctx, { x: cx, y: cy, index: 1, name: '草原', state: 'cleared', recordCls: 'sword', recordTime: 12.4, repairedCount: 0, rates: { wood: 14.5, stone: 4.8, time: 2.9, soul: 9.7 } });
    ctx.save();
    ctx.beginPath(); ctx.rect(cx + 8, cy + 8, 160, 90); ctx.clip();
    ctx.translate(cx + 8, cy + 8); ctx.scale(0.3, 0.3);
    drawBackground(ctx);
    groundRow(ctx, 0, 560, 260, 1, 'plain');
    thumb();
    ctx.restore();
    drawCardOverlay(ctx, { x: cx, y: cy, accelLv: 0, newArea: false, selected: false });
  }

  // 第 3 頁: 過關後一直重播
  function guide2(ctx, g) {
    var flyP = 0.55, A = [120, 202], Cc = [170, 40], B = [28, 22];
    function qp(t) {
      var u = 1 - t;
      return [u * u * A[0] + 2 * u * t * Cc[0] + t * t * B[0], u * u * A[1] + 2 * u * t * Cc[1] + t * t * B[1]];
    }
    scene(ctx, g, 0, 0, 480, 300, 1, function () {
      ctx.fillStyle = PAL.mapBg; ctx.fillRect(0, 0, 480, 300);
      ctx.fillStyle = 'rgba(12,18,26,0.9)'; ctx.fillRect(0, 0, 480, 44);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 43, 480, 1);
      matIcon(ctx, 'wood', B[0], B[1], 24);
      guideCard(ctx, 40, 120, function () {
        drawGoal(ctx, { x: 500, y: 220, reached: false });
        drawPickup(ctx, { x: 240, y: 248, kind: 'wood', t: 0 });
        drawPlayer(ctx, { x: 220, y: 238, cls: 'sword', facing: 1, pose: 'run', poseT: 0.05 });
      });
      // 飛行路徑(虛線) + 飛行中的木材
      var pts = [A[0], A[1], Cc[0], Cc[1], B[0] + 14, B[1] + 14];
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
      ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(208,138,60,0.8)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      var p = qp(flyP), p2 = qp(flyP + 0.02);
      flyMat(ctx, p[0], p[1], 'wood', flyP, p2[0] - p[0], p2[1] - p[1]);
    });
    // 數字前後(外層原尺寸)
    var nx = g.x(48), ny = g.y(22);
    text(ctx, '12', nx, ny, 17, PAL.textDim, 'left', true);
    var w1 = textW(ctx, '12', 17, true);
    text(ctx, '→', nx + w1 + 8, ny, 17, PAL.text, 'left', true);
    var w2 = textW(ctx, '→', 17, true);
    text(ctx, '13', nx + w1 + w2 + 16, ny, 20, '#ffffff', 'left', true);
  }

  // 第 4 頁: 撿多還是跑快
  function guide3(ctx, g) {
    var WS = 0.5;
    function lvl(route) {
      return function () {
        drawBackground(ctx);
        groundRow(ctx, 0, 560, 340, 1, 'plain');
        for (var c = 160; c < 360; c += 40) drawGround(ctx, { x: c + 20, y: 260, top: true, theme: 'plain' });
        drawPickup(ctx, { x: 120, y: 328, kind: 'wood', t: 0 });
        drawPickup(ctx, { x: 196, y: 228, kind: 'wood', t: 0 });
        drawPickup(ctx, { x: 240, y: 228, kind: 'stone', t: 0 });
        drawPickup(ctx, { x: 284, y: 228, kind: 'time', t: 0 });
        drawFrog(ctx, { x: 334, y: 226, facing: -1, state: 'crouch', hit: false, brood: false });
        drawGoal(ctx, { x: 500, y: 300, reached: false });
        drawPlayer(ctx, { x: 40, y: 318, cls: 'sword', facing: 1, pose: 'idle', poseT: 0 });
        var lw = 3 / (g.k * WS);
        if (route === 'long') dashedPath(ctx, [60, 312, 96, 300, 130, 318, 150, 200, 196, 214, 260, 212, 330, 210, 390, 210, 420, 318, 452, 318, 478, 318], lw, true);
        else dashedPath(ctx, [60, 322, 260, 322, 478, 322], lw, true);
      };
    }
    scene(ctx, g, 0, 0, 270, 190, WS, lvl('long'));
    scene(ctx, g, 290, 0, 270, 190, WS, lvl('short'));
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(g.x(0), g.y(0), 270 * g.k, 190 * g.k); ctx.strokeRect(g.x(290), g.y(0), 270 * g.k, 190 * g.k);
    tag(ctx, g.x(135), g.y(214), '素材多 / 秒數長');
    tag(ctx, g.x(425), g.y(214), '素材少 / 秒數短');
  }

  // 第 5 頁: 討伐榜
  function guide4(ctx, g) {
    var cardX = 10, cardY = 52;
    var poofV = [cardX + 8 + 192 * 0.3, cardY + 8 + 246 * 0.3];
    scene(ctx, g, 0, 0, 520, 240, 1, function () {
      ctx.fillStyle = PAL.mapBg; ctx.fillRect(0, 0, 520, 240);
      guideCard(ctx, cardX, cardY, function () {
        drawGoal(ctx, { x: 500, y: 220, reached: false });
        drawPoof(ctx, { x: 192, y: 246, t: 0.1, dur: 0.3, big: false });
        drawPlayer(ctx, { x: 150, y: 238, cls: 'sword', facing: 1, pose: 'slash', poseT: 0.03 });
      });
      // 連線: 縮圖裡倒下的跳蛙 → 討伐榜那一欄
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(poofV[0], poofV[1]); ctx.quadraticCurveTo(260, 150, 330, 120);
      ctx.strokeStyle = 'rgba(10,14,20,0.8)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = '#e8a23a'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      circle(ctx, poofV[0], poofV[1], 3.5, '#e8a23a', '#0a0e14', 1);
      circle(ctx, 330, 120, 3.5, '#e8a23a', '#0a0e14', 1);
      bountyRow(ctx, 330, 92, { status: 'active', target: 'frog', need: 12, prog: 4 }, { noReward: true, progText: '3/12 → 4/12', gainFrom: 3 });
    });
  }

  // 第 6 頁: 修工程, 迷霧散開
  function guide5(ctx, g) {
    var WS = 0.48;
    function pen(fixed) {
      return function () {
        drawBackground(ctx);
        // 起點高台
        drawGround(ctx, { x: 20, y: 300, top: true, theme: 'plain' }); drawGround(ctx, { x: 60, y: 300, top: true, theme: 'plain' });
        drawGround(ctx, { x: 20, y: 340 }); drawGround(ctx, { x: 60, y: 340 });
        groundRow(ctx, 0, 80, 360, 2, 'plain');
        // 地面
        for (var c = 80; c < 560; c += 40) { drawGround(ctx, { x: c + 20, y: 380, top: true, theme: 'plain' }); drawGround(ctx, { x: c + 20, y: 420, top: false, theme: 'plain' }); }
        // 圍場矮牆
        for (var w = 120; w < 520; w += 40) drawPenWall(ctx, { x: w + 20, y: 220, theme: 'plain' });
        drawPenWall(ctx, { x: 140, y: 260, theme: 'plain' }); drawPenWall(ctx, { x: 180, y: 260, theme: 'plain' });
        drawPenWall(ctx, { x: 500, y: 260, theme: 'plain' }); drawPenWall(ctx, { x: 500, y: 300, theme: 'plain' }); drawPenWall(ctx, { x: 500, y: 340, theme: 'plain' });
        drawPenGate(ctx, { x: 160, y: 320, open: fixed });
        if (fixed) {
          drawChest(ctx, { x: 456, y: 342, open: false });
          drawFrog(ctx, { x: 226, y: 346, facing: 1, state: 'crouch', hit: false, brood: false });
          drawFrog(ctx, { x: 258, y: 346, facing: -1, state: 'crouch', hit: false, brood: false });
          drawBoar(ctx, { x: 300, y: 344, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
          drawFrog(ctx, { x: 342, y: 346, facing: 1, state: 'crouch', hit: false, brood: false });
          drawBoar(ctx, { x: 384, y: 344, facing: -1, state: 'walk', hit: false, brood: false, t: 0.3 });
        } else {
          drawChest(ctx, { x: 456, y: 342, open: false });
          drawFrog(ctx, { x: 258, y: 346, facing: -1, state: 'crouch', hit: false, brood: false });
          drawFog(ctx, { x: 200, y: 240, w: 280, h: 120, alpha: 1, t: 0 });
          drawSiteSign(ctx, { x: 100, y: 336, role: 'hunt' });
        }
      };
    }
    scene(ctx, g, 0, 10, 250, 200, WS, pen(false));
    scene(ctx, g, 310, 10, 250, 200, WS, pen(true));
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(g.x(0), g.y(10), 250 * g.k, 200 * g.k); ctx.strokeRect(g.x(310), g.y(10), 250 * g.k, 200 * g.k);
    // 角下石料圖示(修工程花石料; 不畫數字)
    ctx.save();
    rrect(ctx, g.x(6), g.y(176), 30 * g.k, 28 * g.k, 6 * g.k); ctx.fillStyle = 'rgba(12,18,26,0.85)'; ctx.fill();
    matIcon(ctx, 'stone', g.x(21), g.y(190), 22 * g.k);
    ctx.restore();
    // 中間箭頭
    var ax = g.x(262), ay = g.y(110), L = 36 * g.k;
    poly(ctx, [ax, ay - 6 * g.k, ax + L - 12 * g.k, ay - 6 * g.k, ax + L - 12 * g.k, ay - 14 * g.k, ax + L, ay, ax + L - 12 * g.k, ay + 14 * g.k, ax + L - 12 * g.k, ay + 6 * g.k, ax, ay + 6 * g.k], '#ffffff', '#0a0e14', 2);
  }

  var GUIDE = [
    { vw: 480, vh: 270, fn: guide0 }, { vw: 600, vh: 220, fn: guide1 }, { vw: 480, vh: 300, fn: guide2 },
    { vw: 560, vh: 240, fn: guide3 }, { vw: 520, vh: 240, fn: guide4 }, { vw: 560, vh: 220, fn: guide5 }
  ];
  function drawGuidePage(ctx, s) {
    s = obj(s);
    var page = Math.round(num(s.page, 0, 0, GUIDE.length - 1));
    var gp = GUIDE[page];
    var w = num(s.w, gp.vw, 1, 4000), h = num(s.h, gp.vh, 1, 4000);
    var x = num(s.x, (W - w) / 2, -4000, 4000), y = num(s.y, (H - h) / 2, -4000, 4000);
    var k = Math.min(w / gp.vw, h / gp.vh);
    var ox = x + (w - gp.vw * k) / 2, oy = y + (h - gp.vh * k) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    gp.fn(ctx, G(ox, oy, k));
    ctx.restore();
  }

  // ---------------------------------------------------------------- 匯出
  window.Art = {
    canvas: { width: W, height: H },
    palette: {
      bg: PAL.bg, mapBg: PAL.mapBg, text: PAL.text, textDim: PAL.textDim, panel: PAL.panel, select: PAL.select, gold: PAL.gold, danger: PAL.danger,
      wood: PAL.wood, stone: PAL.stone, time: PAL.time, soul: PAL.soul,
      player: PAL.sword, sword: PAL.sword, hunter: PAL.hunter, bomber: PAL.bomber,
      boar: PAL.boar, shield: PAL.shield, bee: PAL.bee, frog: PAL.frog, mother: PAL.mother, brood: PAL.brood, broodEye: PAL.broodEye,
      fog: PAL.fog, hook: PAL.hook, chest: PAL.chest, flag: PAL.flag
    },
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawLairBack: drawLairBack,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawWorksite: drawWorksite,
    drawPenWall: drawPenWall,
    drawPenGate: drawPenGate,
    drawCaveRubble: drawCaveRubble,
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
    drawMedalIcon: drawMedalIcon,
    drawItemNotice: drawItemNotice,
    drawBountyBoard: drawBountyBoard,
    drawBountyNotice: drawBountyNotice,
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
