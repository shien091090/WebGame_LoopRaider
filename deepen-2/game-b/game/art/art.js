/* 魔巢獵場 — 美術繪圖模組(Canvas 2D 幾何繪製, 無外部資源)
 * 全域物件 window.Art; 每個函式只負責「給狀態, 畫出來」, 自己 save / restore。
 * 邏輯畫布 1280x720(照 interface.json), 美術一律照這個座標畫, 不自己乘縮放。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var THUMB_SCALE = 0.2; // 有效縮放低於這個值 → 物件改畫剪影

  var PAL = {
    bg: '#232c3f', bgTop: '#1a2133', bgBottom: '#3a4a63', hill: '#2c3850', hill2: '#33405a',
    mapBg: '#141c27', mapGrid: '#1c2635',
    panel: '#1a2130', panelHi: '#253049', panelLo: '#121823', edge: '#4a5a76',
    text: '#eef2f8', textDim: '#9aa6ba', textMute: '#667189',
    gold: '#ffcf4a', goldDark: '#a5801f',
    danger: '#ff4545', dangerDark: '#9e1f1f',
    good: '#6be08a',
    brood: '#c060ff', broodDark: '#5a1f86', broodGlow: '#e2a8ff',
    lairBack: '#170f22',
    wood: '#c8823c', woodDark: '#7a4a1e', woodLight: '#e9b77a',
    iron: '#aebdcd', ironDark: '#5d6c7e', ironLight: '#e8f0f8',
    time: '#46d8ff', timeDark: '#1a7aa0', timeLight: '#c8f6ff',
    core: '#b6e83a', coreDark: '#5d7f12', coreLight: '#f0ffc0',
    sword: '#4f80ff', swordDark: '#25409a',
    hunter: '#3fae5a', hunterDark: '#1f6232',
    bomber: '#ff8a3a', bomberDark: '#9a4313',
    player: '#ffffff',
    boar: '#7b4a2c', boarDark: '#4a2914', boarLight: '#a8714a',
    shield: '#7b8aa3', shieldDark: '#3d475a', shieldPlate: '#c9d3e2', shieldRim: '#e3b33f',
    bee: '#f2c230', beeDark: '#3a2a10',
    frog: '#2aa8a0', frogDark: '#11605a', frogBelly: '#e9e08a',
    mother: '#4a2468', motherDark: '#26103a', motherShell: '#6c3a92',
    beeShot: '#ff4545', arrow: '#f6ead0', bomb: '#24262c',
    spike: '#ff4545', crackWall: '#e2d6b4', rubble: '#77706a',
    hook: '#ffcf4a', goal: '#ffcf4a',
    explosion: '#ff9a2e', shockwave: '#bfe6ff', poof: '#d6d9e0',
    linkLit: '#ffcf4a', linkDim: '#3c4659'
  };

  var THEMES = {
    plain: { top: '#6fc24a', topDark: '#3f8f2e', fill: '#7a5634', dark: '#5e4128', dot: '#94704a' },
    sky: { top: '#eef4ff', topDark: '#b8c8e2', fill: '#8a9bb8', dark: '#6b7c99', dot: '#a4b3cc' },
    rock: { top: '#e0a46a', topDark: '#b07040', fill: '#a8603a', dark: '#83462a', dot: '#c07a50' },
    swamp: { top: '#86a43c', topDark: '#55702a', fill: '#3f4a2e', dark: '#2c3520', dot: '#56633a' },
    throne: { top: '#ecc65a', topDark: '#a8852c', fill: '#5b5f8a', dark: '#474a70', dot: '#6f74a2' },
    lair: { top: '#a84ee6', topDark: '#5a1f86', fill: '#2c1e3c', dark: '#1e1429', dot: '#3c2a52' }
  };

  var KINDS = ['wood', 'iron', 'time', 'core'];
  var KIND_NAME = { wood: '木材', iron: '鐵礦', time: '時晶', core: '魔核' };
  var KIND_USE = { wood: '開路', iron: '修復', time: '加速', core: '強化' };
  var HUD_ICON = { wood: [36, 20], iron: [206, 20], time: [376, 20], core: [546, 20] };
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var ITEM_NAME = { tusk: '野豬牙', sting: '蜂針', crest: '盾徽', web: '蛙蹼', broodHorn: '巢母角', bagCore: '魔核袋', bagIron: '鐵礦袋', bagWood: '木材袋' };
  var ITEM_EFFECT = { tusk: '野豬掉落 ×2', sting: '射手蜂掉落 ×2', crest: '盾兵掉落 ×2', web: '跳蛙掉落 ×2', broodHorn: '巢穴怪掉落 ×2', bagCore: '每次通關 +3 魔核', bagIron: '每次通關 +3 鐵礦', bagWood: '每次通關 +5 木材' };

  // ───────────────────────── 共用小工具 ─────────────────────────
  function num(v, d) { v = Number(v); return isFinite(v) ? v : (d === undefined ? 0 : d); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function st0(s) { return (s && typeof s === 'object') ? s : {}; }
  function oneOf(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function kindOf(k) { return oneOf(k, KINDS, 'wood'); }
  function clsOf(c) { return oneOf(c, ['sword', 'hunter', 'bomber'], 'sword'); }
  function themeOf(t) { return THEMES[t] ? t : 'plain'; }
  function face(f) { return num(f, 1) < 0 ? -1 : 1; }
  function itemOf(t) { return ITEM_NAME[t] ? t : null; }
  function matSet(o) {
    o = st0(o);
    return { wood: Math.max(0, num(o.wood)), iron: Math.max(0, num(o.iron)), time: Math.max(0, num(o.time)), core: Math.max(0, num(o.core)) };
  }
  function f1(v) { return clamp(num(v), -99999, 999999).toFixed(1); }
  function intStr(v) { return String(Math.floor(clamp(num(v), -999999, 99999999))); }
  function font(px, bold) { return (bold ? 'bold ' : '') + px + 'px ' + FONT; }
  function nowSec() {
    try { return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000; } catch (e) { return 0; }
  }
  function effScale(ctx) {
    try {
      var m = ctx.getTransform();
      var base = (ctx.canvas && ctx.canvas.width) ? ctx.canvas.width / W : 1;
      if (!isFinite(base) || base <= 0) base = 1;
      var s = Math.sqrt(m.a * m.a + m.b * m.b) / base;
      return isFinite(s) && s > 0 ? s : 1;
    } catch (e) { return 1; }
  }
  function tiny(ctx) { return effScale(ctx) < THUMB_SCALE; }

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
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); }

  // 文字: o = { px, color, align, base, bold, outline, maxW }
  function T(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = font(o.px || 14, o.bold);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    var mw = o.maxW;
    if (o.outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.outlineW || 3;
      ctx.strokeStyle = o.outline;
      if (mw) ctx.strokeText(String(s), x, y, mw); else ctx.strokeText(String(s), x, y);
    }
    ctx.fillStyle = o.color || PAL.text;
    if (mw) ctx.fillText(String(s), x, y, mw); else ctx.fillText(String(s), x, y);
  }

  function lockIcon(ctx, cx, cy, s, col) {
    ctx.save();
    ctx.strokeStyle = col || PAL.textDim; ctx.fillStyle = col || PAL.textDim;
    ctx.lineWidth = Math.max(1.5, s * 0.14);
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.15, s * 0.28, Math.PI, 0); ctx.stroke();
    rr(ctx, cx - s * 0.4, cy - s * 0.15, s * 0.8, s * 0.6, s * 0.1); ctx.fill();
    ctx.fillStyle = PAL.panelLo; circle(ctx, cx, cy + s * 0.12, s * 0.09); ctx.fill();
    ctx.restore();
  }

  function checkMark(ctx, cx, cy, s, col) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0d1a10'; ctx.lineWidth = s * 0.34;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx - s * 0.1, cy + s * 0.3); ctx.lineTo(cx + s * 0.45, cy - s * 0.35); ctx.stroke();
    ctx.strokeStyle = col || PAL.good; ctx.lineWidth = s * 0.18; ctx.stroke();
    ctx.restore();
  }

  function keycap(ctx, label, cx, cy, size) {
    size = size || 26;
    var w = Math.max(size, label.length > 1 ? size * 0.5 + label.length * size * 0.42 : size);
    ctx.save();
    rr(ctx, cx - w / 2, cy - size / 2 + 2, w, size, 5); ctx.fillStyle = '#5c6478'; ctx.fill();
    rr(ctx, cx - w / 2, cy - size / 2, w, size - 2, 5); ctx.fillStyle = '#f2f4f8'; ctx.fill();
    ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 1.5; ctx.stroke();
    T(ctx, label, cx, cy - 1, { px: Math.round(size * 0.55), color: '#1e2433', align: 'center', bold: true });
    ctx.restore();
    return w;
  }

  // ─────────────── 素材圖示(地上 / 資訊列 / 飛行 / 浮字 / 花費共用) ───────────────
  function matIcon(ctx, kind, cx, cy, size) {
    kind = kindOf(kind);
    var s = size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    if (kind === 'wood') {
      // 一段原木: 橫向圓角樹皮 + 右端年輪
      rr(ctx, -s, -s * 0.55, s * 2, s * 1.1, s * 0.5);
      ctx.fillStyle = PAL.wood; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.16); ctx.strokeStyle = PAL.woodDark; ctx.stroke();
      ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = Math.max(0.8, s * 0.1);
      ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.2); ctx.lineTo(s * 0.1, -s * 0.2); ctx.moveTo(-s * 0.4, s * 0.2); ctx.lineTo(s * 0.2, s * 0.2); ctx.stroke();
      ell(ctx, s * 0.5, 0, s * 0.42, s * 0.5); ctx.fillStyle = PAL.woodLight; ctx.fill();
      ctx.lineWidth = Math.max(0.8, s * 0.1); ctx.strokeStyle = PAL.woodDark; ctx.stroke();
      ell(ctx, s * 0.5, 0, s * 0.18, s * 0.22); ctx.stroke();
    } else if (kind === 'iron') {
      // 六角礦塊
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 6 + i * Math.PI / 3;
        var px = Math.cos(a) * s * 0.95, py = Math.sin(a) * s * 0.95;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = PAL.iron; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.16); ctx.strokeStyle = PAL.ironDark; ctx.stroke();
      ctx.fillStyle = PAL.ironLight;
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.3); ctx.lineTo(0, -s * 0.62); ctx.lineTo(s * 0.2, -s * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PAL.ironDark;
      ctx.beginPath(); ctx.moveTo(s * 0.1, s * 0.3); ctx.lineTo(s * 0.6, s * 0.1); ctx.lineTo(s * 0.4, s * 0.55); ctx.closePath(); ctx.fill();
    } else if (kind === 'time') {
      // 直立菱形晶體
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.62, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.62, 0); ctx.closePath();
      ctx.fillStyle = PAL.time; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.15); ctx.strokeStyle = PAL.timeDark; ctx.stroke();
      ctx.fillStyle = PAL.timeLight;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.75); ctx.lineTo(s * 0.25, -s * 0.05); ctx.lineTo(-s * 0.05, -s * 0.05); ctx.closePath(); ctx.fill();
    } else {
      // 魔核: 圓珠 + 中心四芒亮點
      circle(ctx, 0, 0, s * 0.9); ctx.fillStyle = PAL.core; ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.16); ctx.strokeStyle = PAL.coreDark; ctx.stroke();
      ctx.fillStyle = PAL.coreLight;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.lineTo(s * 0.14, -s * 0.14); ctx.lineTo(s * 0.55, 0); ctx.lineTo(s * 0.14, s * 0.14);
      ctx.lineTo(0, s * 0.55); ctx.lineTo(-s * 0.14, s * 0.14); ctx.lineTo(-s * 0.55, 0); ctx.lineTo(-s * 0.14, -s * 0.14); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // 花費列: 只畫大於 0 的種類, 不足的那種數字變紅 + 底線
  function costRow(ctx, cost, stock, x, y, o) {
    o = o || {};
    cost = matSet(cost); stock = matSet(stock);
    var px = o.px || 14, ic = o.icon || 16, gap = o.gap || 10;
    var items = [];
    KINDS.forEach(function (k) { if (cost[k] > 0) items.push(k); });
    ctx.save();
    ctx.font = font(px, true);
    var widths = items.map(function (k) { return ic + 4 + ctx.measureText(intStr(cost[k])).width; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + Math.max(0, items.length - 1) * gap;
    var cx = o.align === 'center' ? x - total / 2 : (o.align === 'right' ? x - total : x);
    items.forEach(function (k, i) {
      matIcon(ctx, k, cx + ic / 2, y, ic);
      var lack = stock[k] < cost[k];
      var s = intStr(cost[k]);
      T(ctx, s, cx + ic + 4, y + 1, { px: px, bold: true, color: lack ? PAL.danger : (o.color || PAL.text) });
      if (lack) {
        ctx.font = font(px, true);
        var tw = ctx.measureText(s).width;
        ctx.strokeStyle = PAL.danger; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + ic + 4, y + px * 0.62); ctx.lineTo(cx + ic + 4 + tw, y + px * 0.62); ctx.stroke();
      }
      cx += widths[i] + gap;
    });
    ctx.restore();
    return total;
  }

  // 職業小圖示(圓章 + 武器符號)
  function clsIcon(ctx, cls, cx, cy, r) {
    cls = clsOf(cls);
    ctx.save();
    ctx.translate(cx, cy);
    circle(ctx, 0, 0, r); ctx.fillStyle = PAL[cls]; ctx.fill();
    ctx.lineWidth = Math.max(1.2, r * 0.14); ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff';
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.2, r * 0.18);
    if (cls === 'sword') {
      ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.45); ctx.lineTo(r * 0.5, -r * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.05); ctx.lineTo(-r * 0.05, r * 0.5); ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.55, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.lineWidth = Math.max(0.8, r * 0.09);
      ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.55); ctx.lineTo(-r * 0.15, r * 0.55); ctx.stroke();
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.55, 0); ctx.stroke();
    } else {
      circle(ctx, -r * 0.08, r * 0.12, r * 0.42); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.18, -r * 0.18); ctx.quadraticCurveTo(r * 0.4, -r * 0.6, r * 0.6, -r * 0.45); ctx.stroke();
    }
    ctx.restore();
  }

  // 巢穴記號: 發光紫眼(所有巢穴怪與巢母共用)
  function broodEye(ctx, x, y, r) {
    ctx.save();
    circle(ctx, x, y, r * 1.6); ctx.fillStyle = 'rgba(192,96,255,0.45)'; ctx.fill();
    circle(ctx, x, y, r); ctx.fillStyle = PAL.brood; ctx.fill();
    circle(ctx, x, y, r * 0.45); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }
  function broodVein(ctx, pts, w) {
    ctx.save();
    ctx.strokeStyle = PAL.brood; ctx.lineWidth = w || 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < pts.length; i += 2) { if (i === 0) ctx.moveTo(pts[i], pts[i + 1]); else ctx.lineTo(pts[i], pts[i + 1]); }
    ctx.stroke();
    ctx.restore();
  }

  function stars(ctx, cx, cy, spread, t, n, wob) {
    ctx.save();
    n = n || 3;
    wob = wob === undefined ? 3 : wob;
    for (var i = 0; i < n; i++) {
      var a = t * 4 + i * Math.PI * 2 / n;
      var sx = cx + Math.cos(a) * spread, sy = cy + Math.sin(a) * wob;
      ctx.fillStyle = PAL.gold;
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var rad = k % 2 === 0 ? 4 : 1.8;
        var aa = -Math.PI / 2 + k * Math.PI / 5;
        if (k === 0) ctx.moveTo(sx + Math.cos(aa) * rad, sy + Math.sin(aa) * rad); else ctx.lineTo(sx + Math.cos(aa) * rad, sy + Math.sin(aa) * rad);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // 擊飛: 速度線畫在飛行反方向(= 面向側, 見 style.md 判讀約定), 框外至多 40px
  function flungLines(ctx, x, y, halfW, halfH, facing) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var sx = x + facing * (halfW + 4);
    [-0.5, 0, 0.5].forEach(function (k, i) {
      var len = [26, 34, 22][i];
      ctx.beginPath(); ctx.moveTo(sx, y + k * halfH); ctx.lineTo(sx + facing * len, y + k * halfH); ctx.stroke();
    });
    ctx.restore();
  }

  // 剪影(縮圖用): 填滿判定框的主色形狀 + 以畫面 1px 換算的描邊
  function silhouette(ctx, x, y, w, h, fill, edge, shape) {
    var s = effScale(ctx);
    var lw = Math.min(1.2 / s, Math.min(w, h) * 0.3);
    ctx.save();
    if (shape === 'ell') ell(ctx, x, y, w / 2 - lw / 2, h / 2 - lw / 2);
    else rr(ctx, x - w / 2 + lw / 2, y - h / 2 + lw / 2, w - lw, h - lw, Math.min(w, h) * 0.25);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = edge; ctx.stroke();
    ctx.restore();
  }

  // ───────────────────────── 關卡背景 / 地形 ─────────────────────────
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PAL.bgTop); g.addColorStop(1, PAL.bgBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (!tiny(ctx)) {
      ctx.fillStyle = PAL.hill;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 470 + Math.sin(x * 0.006) * 60 + Math.sin(x * 0.017) * 20);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PAL.hill2;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x2 = 0; x2 <= W; x2 += 80) ctx.lineTo(x2, 560 + Math.sin(x2 * 0.004 + 1.3) * 50);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawGround(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), th = THEMES[themeOf(s.theme)], top = s.top === true;
    var x0 = x - 20, y0 = y - 20;
    ctx.save();
    ctx.fillStyle = th.fill; ctx.fillRect(x0, y0, 40, 40);
    if (tiny(ctx)) {
      if (top) { ctx.fillStyle = th.top; ctx.fillRect(x0, y0, 40, 12); }
      ctx.restore(); return;
    }
    // 內部紋理(各主題統一: 深色下緣 + 兩顆斑點), 頂面: 亮色頂帶 + 深色下緣線
    ctx.fillStyle = th.dark; ctx.fillRect(x0, y0 + 34, 40, 6);
    ctx.fillStyle = th.dot;
    var t = themeOf(s.theme);
    if (t === 'throne') {
      ctx.fillRect(x0, y0 + 19, 40, 2); ctx.fillRect(x0 + 19, y0, 2, 19); ctx.fillRect(x0 + 6, y0 + 21, 2, 13);
    } else if (t === 'sky') {
      ctx.fillRect(x0 + 6, y0 + 14, 12, 3); ctx.fillRect(x0 + 22, y0 + 26, 12, 3);
    } else {
      circle(ctx, x0 + 11, y0 + 15, 3); ctx.fill(); circle(ctx, x0 + 28, y0 + 26, 2.5); ctx.fill();
    }
    if (t === 'lair') {
      ctx.strokeStyle = 'rgba(192,96,255,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 30); ctx.lineTo(x0 + 14, y0 + 22); ctx.lineTo(x0 + 22, y0 + 28); ctx.stroke();
    }
    if (top) {
      ctx.fillStyle = th.topDark; ctx.fillRect(x0, y0 + 8, 40, 4);
      ctx.fillStyle = th.top; ctx.fillRect(x0, y0, 40, 9);
      if (t === 'plain' || t === 'swamp') {
        ctx.fillStyle = th.top;
        for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x0 + 5 + i * 10, y0 + 10, 3, 0, Math.PI); ctx.fill(); }
      } else if (t === 'lair') {
        ctx.fillStyle = PAL.broodGlow;
        circle(ctx, x0 + 9, y0 + 4, 1.6); ctx.fill(); circle(ctx, x0 + 29, y0 + 5, 1.4); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawLairBack(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    var w = clamp(num(s.w, 40), 0, 640), h = clamp(num(s.h, 40), 0, 240);
    ctx.save();
    ctx.fillStyle = PAL.lairBack; ctx.fillRect(x, y, w, h);
    if (!tiny(ctx) && w > 0 && h > 0) {
      var g = ctx.createRadialGradient(x + w / 2, y + h * 0.8, 4, x + w / 2, y + h * 0.8, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(120,50,170,0.35)'); g.addColorStop(1, 'rgba(120,50,170,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      // 背牆的岩紋(極淡, 讓人看出是挖空的洞)
      ctx.strokeStyle = 'rgba(160,110,210,0.14)'; ctx.lineWidth = 2;
      var n = Math.min(64, Math.floor(w / 40));
      for (var i = 0; i < n; i++) {
        var bx = x + 20 + i * 40, by = y + 14 + ((i * 37) % Math.max(1, h - 28));
        ctx.beginPath(); ctx.arc(bx, by, 9, 0.2, 2.6); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSpike(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    ctx.save();
    if (tiny(ctx)) { ctx.fillStyle = PAL.spike; ctx.fillRect(x - 20, y, 40, 20); ctx.restore(); return; }
    ctx.fillStyle = '#5a2020'; ctx.fillRect(x - 20, y + 15, 40, 5);
    for (var i = 0; i < 4; i++) {
      var bx = x - 20 + i * 10;
      ctx.beginPath(); ctx.moveTo(bx + 0.5, y + 16); ctx.lineTo(bx + 5, y + 0.5); ctx.lineTo(bx + 9.5, y + 16); ctx.closePath();
      ctx.fillStyle = PAL.spike; ctx.fill();
      ctx.strokeStyle = PAL.dangerDark; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffd0d0';
      ctx.beginPath(); ctx.moveTo(bx + 5, y + 1.5); ctx.lineTo(bx + 6.2, y + 7); ctx.lineTo(bx + 5, y + 7); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), hp = clamp(Math.round(num(s.hp, 3)), 1, 3);
    var x0 = x - 20, y0 = y - 20;
    ctx.save();
    ctx.fillStyle = PAL.crackWall; ctx.fillRect(x0, y0, 40, 40);
    if (tiny(ctx)) { ctx.restore(); return; }
    // 砌石塊(方正、淺色)+ 深色外框: 一看就是「人造的、可破」
    ctx.strokeStyle = '#8a7a58'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0 + 1, y0 + 13.5); ctx.lineTo(x0 + 39, y0 + 13.5);
    ctx.moveTo(x0 + 1, y0 + 26.5); ctx.lineTo(x0 + 39, y0 + 26.5);
    ctx.moveTo(x0 + 20, y0 + 1); ctx.lineTo(x0 + 20, y0 + 13.5);
    ctx.moveTo(x0 + 10, y0 + 13.5); ctx.lineTo(x0 + 10, y0 + 26.5);
    ctx.moveTo(x0 + 30, y0 + 13.5); ctx.lineTo(x0 + 30, y0 + 26.5);
    ctx.moveTo(x0 + 20, y0 + 26.5); ctx.lineTo(x0 + 20, y0 + 39);
    ctx.stroke();
    ctx.strokeStyle = '#4a3e28'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1.5, y0 + 1.5, 37, 37);
    // 裂痕: 耐久越低越多越粗
    ctx.strokeStyle = '#2a2016'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x0 + 8, y0 + 4); ctx.lineTo(x0 + 16, y0 + 14); ctx.lineTo(x0 + 12, y0 + 22); ctx.lineTo(x0 + 20, y0 + 32); ctx.stroke();
    if (hp <= 2) {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0 + 36, y0 + 6); ctx.lineTo(x0 + 26, y0 + 16); ctx.lineTo(x0 + 30, y0 + 24); ctx.lineTo(x0 + 22, y0 + 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + 16, y0 + 14); ctx.lineTo(x0 + 26, y0 + 16); ctx.stroke();
    }
    if (hp <= 1) {
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 34); ctx.lineTo(x0 + 12, y0 + 22); ctx.moveTo(x0 + 30, y0 + 24); ctx.lineTo(x0 + 37, y0 + 30); ctx.stroke();
      ctx.fillStyle = '#2a2016';
      ctx.beginPath(); ctx.moveTo(x0 + 16, y0 + 14); ctx.lineTo(x0 + 26, y0 + 16); ctx.lineTo(x0 + 22, y0 + 22); ctx.lineTo(x0 + 13, y0 + 20); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawCaveRubble(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    ctx.save();
    ctx.fillStyle = '#3e3833'; ctx.fillRect(x - 20, y - 20, 40, 40);
    if (tiny(ctx)) { ctx.fillStyle = PAL.rubble; ell(ctx, x, y, 16, 16); ctx.fill(); ctx.restore(); return; }
    // 大塊圓滾落石堆疊, 沒有裂痕, 暗色
    var rocks = [[-9, 9, 10, 9.5], [9, 10, 10, 8.5], [0, -4, 12, 10], [-11, -12, 7.5, 6.5], [11, -11, 7.5, 7.5]];
    rocks.forEach(function (r) {
      ell(ctx, x + r[0], y + r[1], r[2], r[3]);
      ctx.fillStyle = PAL.rubble; ctx.fill();
      ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 2; ctx.stroke();
      ell(ctx, x + r[0] - r[2] * 0.3, y + r[1] - r[3] * 0.35, r[2] * 0.35, r[3] * 0.25);
      ctx.fillStyle = '#9a928a'; ctx.fill();
    });
    ctx.restore();
  }

  function drawAltarGate(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), open = s.open === true;
    var x0 = x - 20, y0 = y - 60;
    ctx.save();
    if (tiny(ctx)) {
      ctx.fillStyle = '#3a3346'; ctx.fillRect(x0, y0, 40, 120);
      if (!open) { ctx.fillStyle = PAL.broodDark; ctx.fillRect(x0 + 8, y0 + 12, 24, 108); }
      else { ctx.fillStyle = PAL.lairBack; ctx.fillRect(x0 + 8, y0 + 12, 24, 108); }
      ctx.restore(); return;
    }
    // 門框: 石柱 + 拱頂
    ctx.fillStyle = '#4a4258'; ctx.fillRect(x0, y0, 7, 120); ctx.fillRect(x0 + 33, y0, 7, 120); ctx.fillRect(x0, y0, 40, 11);
    ctx.strokeStyle = '#231d2e'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, y0 + 1, 38, 118);
    ctx.fillStyle = PAL.brood; ctx.fillRect(x0 + 12, y0 + 3, 16, 4);
    if (!open) {
      // 實心門板 + 祭壇紋, 門縫透光表示後面有空間
      ctx.fillStyle = '#3a1c56'; ctx.fillRect(x0 + 7, y0 + 11, 26, 109);
      ctx.strokeStyle = '#1a0b28'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0 + 7, y0 + 36 + i * 22); ctx.lineTo(x0 + 33, y0 + 36 + i * 22); ctx.stroke(); }
      circle(ctx, x, y - 10, 9); ctx.strokeStyle = PAL.brood; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 2); ctx.moveTo(x - 7, y - 10); ctx.lineTo(x + 7, y - 10); ctx.stroke();
      ctx.fillStyle = 'rgba(226,168,255,0.8)'; ctx.fillRect(x - 0.75, y0 + 12, 1.5, 107);
    } else {
      // 打開: 門板收進頂上(只剩一小截), 門洞透出巢母室的暗
      ctx.fillStyle = PAL.lairBack; ctx.fillRect(x0 + 7, y0 + 11, 26, 109);
      ctx.fillStyle = '#3a1c56'; ctx.fillRect(x0 + 7, y0 + 11, 26, 8);
      ctx.strokeStyle = 'rgba(192,96,255,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.strokeRect(x0 + 9, y0 + 21, 22, 97); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawNest(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    var mode = oneOf(s.state, ['dormant', 'idle', 'spent'], 'dormant');
    var dur = Math.max(0.01, num(s.spawnDur, 0.4));
    var sp = clamp(num(s.spawnT, dur), 0, dur);
    var spawning = mode !== 'dormant' && sp < dur;
    var p = sp / dur;
    var left = clamp(Math.round(num(s.left, 0)), 0, 5);
    var by = y + 24; // 底邊
    ctx.save();
    if (tiny(ctx)) {
      ell(ctx, x, y + 4, 30, 20);
      ctx.fillStyle = mode === 'idle' ? PAL.brood : (mode === 'spent' ? '#4a3a58' : '#3a3440'); ctx.fill();
      if (spawning) { ctx.fillStyle = PAL.broodGlow; circle(ctx, x, y - 18, 16); ctx.fill(); }
      ctx.restore(); return;
    }
    // 土丘
    ctx.beginPath(); ctx.moveTo(x - 30.5, by - 1); ctx.quadraticCurveTo(x - 29, y - 22, x, y - 22); ctx.quadraticCurveTo(x + 29, y - 22, x + 30.5, by - 1); ctx.closePath();
    ctx.fillStyle = mode === 'dormant' ? '#3c3442' : '#4a2c60'; ctx.fill();
    ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2; ctx.stroke();
    // 巢口
    var mouthH = mode === 'dormant' ? 2 : (spawning ? 14 : (mode === 'spent' ? 6 : 9));
    var glow = 0;
    if (mode === 'idle') glow = 0.55 + 0.35 * Math.sin(nowSec() * 3);
    if (spawning) glow = 1;
    ell(ctx, x, y - 2, 15, mouthH);
    ctx.fillStyle = mode === 'dormant' ? '#1a161e' : '#12081a'; ctx.fill();
    if (glow > 0) {
      ell(ctx, x, y - 2, 15, mouthH); ctx.strokeStyle = 'rgba(210,140,255,' + glow.toFixed(2) + ')'; ctx.lineWidth = 3; ctx.stroke();
    } else {
      ell(ctx, x, y - 2, 15, Math.max(2, mouthH)); ctx.strokeStyle = '#5a5060'; ctx.lineWidth = 2; ctx.stroke();
    }
    if (mode === 'dormant') {
      // 沉睡: 縫起來的閉合線 + 小 z
      ctx.strokeStyle = '#6a6070'; ctx.lineWidth = 1.5;
      for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 6, y - 6); ctx.lineTo(x + i * 6, y + 2); ctx.stroke(); }
      ctx.strokeStyle = '#8a8094'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 17, y - 16); ctx.lineTo(x + 23, y - 16); ctx.lineTo(x + 17, y - 10); ctx.lineTo(x + 23, y - 10); ctx.stroke();
    }
    // 湧出瞬間: 噴霧(框外上方至多 24px)
    if (spawning) {
      var a = 1 - p;
      for (var k = 0; k < 4; k++) {
        var rx = x + (k - 1.5) * 9 * (0.6 + p);
        var ry = y - 10 - p * 24 + Math.abs(k - 1.5) * 3;
        var rad = 6 + p * 5;
        ry = Math.max(ry, y - 24 - 24 + rad);
        circle(ctx, rx, ry, rad); ctx.fillStyle = 'rgba(200,140,240,' + (0.65 * a).toFixed(2) + ')'; ctx.fill();
      }
    }
    // 剩餘隻數: 5 個小點(亮 = 還會湧, 暗 = 用掉)
    for (var d = 0; d < 5; d++) {
      var dx = x - 16 + d * 8, dy = by - 6;
      circle(ctx, dx, dy, 2.6);
      ctx.fillStyle = (mode !== 'dormant' && d < left) ? PAL.broodGlow : '#2a2030'; ctx.fill();
    }
    if (mode === 'spent') { ctx.fillStyle = 'rgba(10,8,14,0.35)'; ell(ctx, x, y + 1, 30, 22); ctx.fill(); }
    ctx.restore();
  }

  function drawHookRing(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    ctx.save();
    if (tiny(ctx)) { circle(ctx, x, y, 10); ctx.fillStyle = PAL.hook; ctx.fill(); ctx.restore(); return; }
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 31); ctx.lineTo(x, y - 11); ctx.stroke();
    circle(ctx, x, y, 9); ctx.strokeStyle = '#2a2010'; ctx.lineWidth = 6; ctx.stroke();
    circle(ctx, x, y, 9); ctx.strokeStyle = PAL.hook; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
  }

  function drawPickup(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), kind = oneOf(s.kind, ['wood', 'iron', 'time'], 'wood');
    ctx.save();
    if (tiny(ctx)) {
      silhouette(ctx, x, y, 24, 24, PAL[kind], PAL[kind + 'Dark'], kind === 'wood' ? 'rect' : 'ell');
      ctx.restore(); return;
    }
    var t = num(s.t);
    var bob = Math.sin(t * 3) * 2;
    matIcon(ctx, kind, x, y + bob, 19);
    var g = (Math.sin(t * 2.2) + 1) / 2;
    if (g > 0.75) {
      ctx.fillStyle = 'rgba(255,255,255,' + ((g - 0.75) * 3).toFixed(2) + ')';
      circle(ctx, x + 6, y - 6 + bob, 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawGoal(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), reached = s.reached === true;
    ctx.save();
    if (tiny(ctx)) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 14, y - 40, 6, 80);
      ctx.fillStyle = PAL.goal; ctx.fillRect(x - 8, y - 40, 26, 22);
      ctx.restore(); return;
    }
    ctx.fillStyle = '#d8dce6'; ctx.fillRect(x - 15, y - 38, 4, 78);
    ctx.fillStyle = '#5a5f6c'; ctx.fillRect(x - 19, y + 34, 12, 6);
    circle(ctx, x - 13, y - 37, 3); ctx.fillStyle = PAL.gold; ctx.fill();
    var wave = reached ? 0 : Math.sin(nowSec() * 4) * 2;
    ctx.beginPath(); ctx.moveTo(x - 11, y - 34);
    ctx.quadraticCurveTo(x + 4, y - 38 + wave, x + 19, y - 30);
    ctx.lineTo(x + 19, y - 10);
    ctx.quadraticCurveTo(x + 4, y - 16 - wave, x - 11, y - 12);
    ctx.closePath();
    ctx.fillStyle = reached ? '#fff3b0' : PAL.goal; ctx.fill();
    ctx.strokeStyle = PAL.goldDark; ctx.lineWidth = 1.5; ctx.stroke();
    if (reached) checkMark(ctx, x + 4, y - 22, 14, '#2fa84a');
    else { ctx.fillStyle = PAL.goldDark; circle(ctx, x + 4, y - 22, 4); ctx.fill(); }
    ctx.restore();
  }

  // ───────────────────────── 玩家 ─────────────────────────
  function drawPlayer(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), cls = clsOf(s.cls), f = face(s.facing);
    var pose = oneOf(s.pose, ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'shoot', 'hook', 'throw', 'wave', 'hurt'], 'idle');
    var pt = clamp(num(s.poseT), 0, 1000);
    ctx.save();
    if (s.invuln === true && Math.floor(nowSec() * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    if (tiny(ctx)) {
      silhouette(ctx, x, y, 28, 44, PAL[cls], '#ffffff', 'rect');
      ctx.restore(); return;
    }
    var main = PAL[cls], dark = PAL[cls + 'Dark'];
    // 揮砍刀光(面向側框外 50x40, 與身體中心同高, 0.15 秒)
    if (pose === 'slash' && pt < 0.15) {
      var a = 1 - pt / 0.15;
      ctx.save();
      ctx.translate(x + f * 14, y);
      ctx.scale(f, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 19, 0, -Math.PI / 2, Math.PI / 2);
      ctx.ellipse(0, 0, 26, 11, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(220,240,255,' + (0.9 * a).toFixed(2) + ')'; ctx.fill();
      ctx.strokeStyle = 'rgba(79,128,255,' + a.toFixed(2) + ')'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    // 衝刺斬速度線(衝刺反方向框外至多 60px)
    if (pose === 'dash') {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,225,255,0.85)'; ctx.lineCap = 'round';
      [[-14, 52, 3], [-2, 58, 4], [10, 44, 3]].forEach(function (l) {
        ctx.lineWidth = l[2];
        ctx.beginPath(); ctx.moveTo(x - f * 16, y + l[0]); ctx.lineTo(x - f * (14 + l[1]), y + l[0]); ctx.stroke();
      });
      ctx.restore();
    }
    ctx.translate(x, y);
    ctx.scale(f, 1);
    // 以下座標: 面向右, 框 x -14~14, y -22~22
    var legA = 0, legB = 0, lean = 0, crouch = 0;
    if (pose === 'run') { legA = Math.sin(pt * 16) * 4; legB = -legA; }
    if (pose === 'rise') { legA = -3; legB = 3; }
    if (pose === 'fall') { legA = 3; legB = -3; }
    if (pose === 'dash') { lean = 3; legA = -4; legB = 4; }
    if (pose === 'wave') { crouch = 3; }
    if (pose === 'hurt') { lean = -3; }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腿
    ctx.fillStyle = '#2a2f3c';
    var legTop = 8 + crouch;
    var legLen = (pose === 'rise' ? 10 : 14) - crouch;
    ctx.fillRect(-6 + legA - 2.5, legTop, 5, legLen);
    ctx.fillRect(3 + legB - 2.5, legTop, 5, legLen);
    // 身體
    rr(ctx, -9 + lean, -6 + crouch, 18, 16, 4);
    ctx.fillStyle = main; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    // 頭
    var hx = 1 + lean, hy = -12.5 + crouch;
    circle(ctx, hx, hy, 7);
    ctx.fillStyle = '#f2d2b0'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    // 頭飾
    if (cls === 'sword') {
      ctx.fillStyle = main;
      ctx.beginPath(); ctx.arc(hx, hy - 1, 7.5, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PAL.gold; ctx.fillRect(hx - 7, hy - 2, 14, 2);
    } else if (cls === 'hunter') {
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(hx - 8, hy + 2); ctx.quadraticCurveTo(hx - 6, hy - 10, hx + 3, hy - 9); ctx.lineTo(hx + 7, hy - 3); ctx.lineTo(hx - 3, hy - 3); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = dark; ctx.fillRect(hx - 7.5, hy - 7, 15, 4);
      ctx.fillStyle = '#9fe3ff'; circle(ctx, hx + 3, hy - 3, 2.6); ctx.fill();
    }
    // 眼
    if (pose === 'hurt') {
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx + 2, hy - 1); ctx.lineTo(hx + 6, hy + 3); ctx.moveTo(hx + 6, hy - 1); ctx.lineTo(hx + 2, hy + 3); ctx.stroke();
    } else {
      ctx.fillStyle = '#1a1420'; circle(ctx, hx + 4, hy, 1.6); ctx.fill();
    }
    // 手 / 武器
    ctx.strokeStyle = '#f2d2b0'; ctx.lineWidth = 3.5;
    var handX = 9, handY = 2;
    if (pose === 'hook') { handX = 8; handY = -10; }
    if (pose === 'throw') { handX = 10; handY = -6; }
    if (pose === 'shoot') { handX = 10; handY = 0; }
    if (pose === 'wave') { handX = 10; handY = 4 + crouch; }
    if (pose === 'rise') { handX = 7; handY = -8; }
    ctx.beginPath(); ctx.moveTo(4 + lean, -2 + crouch); ctx.lineTo(handX, handY); ctx.stroke();
    if (pose === 'wave') { ctx.beginPath(); ctx.moveTo(-4, -2 + crouch); ctx.lineTo(-10, 4 + crouch); ctx.stroke(); }
    if (cls === 'sword') {
      ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (pose === 'slash' || pose === 'dash') { ctx.moveTo(handX, handY); ctx.lineTo(12.5, handY); }
      else { ctx.moveTo(handX, handY); ctx.lineTo(12, Math.max(-19, handY - 13)); }
      ctx.stroke();
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(handX - 1, handY - 3); ctx.lineTo(handX + 1, handY + 3); ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.strokeStyle = '#a8763a'; ctx.lineWidth = 2;
      var bx = Math.min(handX + 1, 9);
      ctx.beginPath(); ctx.arc(bx - 4, handY, 8, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
      ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 4 + 8 * Math.cos(Math.PI / 2.4), handY - 8 * Math.sin(Math.PI / 2.4));
      ctx.lineTo(pose === 'shoot' ? bx - 8 : bx - 2, handY);
      ctx.lineTo(bx - 4 + 8 * Math.cos(Math.PI / 2.4), handY + 8 * Math.sin(Math.PI / 2.4)); ctx.stroke();
    } else {
      if (pose !== 'throw') {
        circle(ctx, Math.min(handX + 1, 10), handY + 3, 3.6); ctx.fillStyle = PAL.bomb; ctx.fill();
        ctx.fillStyle = PAL.gold; circle(ctx, Math.min(handX + 2, 11), handY - 1, 1.3); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawRangeRing(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), r = clamp(num(s.radius, 260), 0, 260);
    ctx.save();
    circle(ctx, x, y, Math.max(0, r - 1));
    ctx.strokeStyle = 'rgba(63,174,90,0.55)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ───────────────────────── 怪物 ─────────────────────────
  // 共用: 擊飛時以中心傾斜並縮小, 讓外接框留在判定框內
  function monsterFrame(ctx, x, y, f, mode, hw, hh) {
    ctx.translate(x, y);
    if (mode === 'flung') { ctx.rotate(-f * 0.32); ctx.scale(0.66, 0.66); }
    ctx.scale(f, 1);
  }
  function hitFlash(ctx, pathFn) {
    ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#ffffff'; pathFn(); ctx.fill(); ctx.restore();
  }

  function drawBoar(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), f = face(s.facing);
    var mode = oneOf(s.state, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
    var t = num(s.t), brood = s.brood === true;
    ctx.save();
    if (mode === 'flung' && !tiny(ctx)) flungLines(ctx, x, y, 24, 16, f);
    if (tiny(ctx)) {
      silhouette(ctx, x, y, 48, 32, s.hit === true ? '#ffffff' : PAL.boar, brood ? PAL.brood : '#1a0e06', 'ell');
      ctx.restore(); return;
    }
    if (mode === 'stun') stars(ctx, x, y - 16 - 10, 12, t, 3);
    ctx.save();
    monsterFrame(ctx, x, y, f, mode, 24, 16);
    // 面向右; 框 x -24~24, y -16~16
    var shake = mode === 'windup' ? Math.sin(t * 60) * 0.8 : 0;
    var lean = mode === 'windup' ? -2 : (mode === 'charge' ? 2 : 0);
    var step = mode === 'walk' ? Math.sin(t * 10) * 2 : (mode === 'charge' ? Math.sin(t * 24) * 3 : 0);
    ctx.translate(shake, 0);
    // 腿
    ctx.fillStyle = PAL.boarDark;
    [-14, -6, 6, 13].forEach(function (lx, i) { ctx.fillRect(lx + (i % 2 ? step : -step) * 0.5, 8, 4, 8); });
    // 身體
    var body = function () { ell(ctx, -2 + lean, 0, 18, 11); };
    body(); ctx.fillStyle = PAL.boar; ctx.fill(); ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 2; ctx.stroke();
    // 鬃毛
    ctx.fillStyle = PAL.boarDark;
    ctx.beginPath(); ctx.moveTo(-14 + lean, -8); ctx.lineTo(-8 + lean, -14); ctx.lineTo(-2 + lean, -10); ctx.lineTo(4 + lean, -14); ctx.lineTo(9 + lean, -9); ctx.closePath(); ctx.fill();
    // 頭
    var hx = 13 + lean;
    ell(ctx, hx, 1, 8, 7.5); ctx.fillStyle = PAL.boarLight; ctx.fill(); ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, hx + 6, 3, 3, 3.2); ctx.fillStyle = '#d9a088'; ctx.fill();
    // 獠牙
    ctx.strokeStyle = '#fbf6e8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx + 3, 6); ctx.quadraticCurveTo(hx + 7, 7, hx + 7, 1); ctx.stroke();
    // 眼
    if (mode === 'stun') {
      ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx - 1, -4); ctx.lineTo(hx + 3, 0); ctx.moveTo(hx + 3, -4); ctx.lineTo(hx - 1, 0); ctx.stroke();
    } else if (brood) {
      broodEye(ctx, hx + 1, -2, 2.4);
    } else {
      ctx.fillStyle = (mode === 'windup' || mode === 'charge') ? PAL.danger : '#1a0e06';
      circle(ctx, hx + 1, -2, mode === 'windup' ? 2.4 : 1.8); ctx.fill();
    }
    if (brood) broodVein(ctx, [-16 + lean, 0, -9 + lean, -4, -3 + lean, 2, 4 + lean, -3], 2);
    // 預備: 後蹄刨地的塵土(框內)
    if (mode === 'windup') {
      ctx.fillStyle = 'rgba(220,200,170,0.8)';
      circle(ctx, -19, 12, 2.5); ctx.fill(); circle(ctx, -14, 9, 2.2); ctx.fill();
    }
    // 衝撞: 身後框內三道衝勢線
    if (mode === 'charge') {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      [-6, 0, 6].forEach(function (ly) { ctx.beginPath(); ctx.moveTo(-22, ly); ctx.lineTo(-19, ly); ctx.stroke(); });
    }
    if (s.hit === true) hitFlash(ctx, function () { ell(ctx, -2 + lean, 0, 18, 11); ctx.moveTo(hx + 8, 1); ctx.ellipse(hx, 1, 8, 7.5, 0, 0, Math.PI * 2); });
    ctx.restore();
    ctx.restore();
  }

  function drawShieldman(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), f = face(s.facing);
    var mode = oneOf(s.state, ['walk', 'block', 'flung'], 'walk');
    var t = num(s.t), brood = s.brood === true;
    ctx.save();
    if (mode === 'flung' && !tiny(ctx)) flungLines(ctx, x, y, 16, 22, f);
    if (tiny(ctx)) {
      silhouette(ctx, x, y, 32, 44, s.hit === true ? '#ffffff' : PAL.shield, brood ? PAL.brood : '#141822', 'rect');
      ctx.restore(); return;
    }
    ctx.save();
    monsterFrame(ctx, x, y, f, mode, 16, 22);
    // 面向右; 框 x -16~16, y -22~22
    var step = mode === 'walk' ? Math.sin(t * 6) * 2 : 0;
    ctx.fillStyle = PAL.shieldDark;
    ctx.fillRect(-8 + step, 10, 5, 12); ctx.fillRect(-1 - step, 10, 5, 12);
    // 身體(鎧甲)
    rr(ctx, -11, -6, 16, 18, 3); ctx.fillStyle = PAL.shield; ctx.fill(); ctx.strokeStyle = '#141822'; ctx.lineWidth = 2; ctx.stroke();
    // 頭盔 + 紅纓
    circle(ctx, -3, -13, 7); ctx.fillStyle = PAL.shieldDark; ctx.fill(); ctx.strokeStyle = '#141822'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c94040'; ctx.beginPath(); ctx.moveTo(-6, -19); ctx.quadraticCurveTo(-12, -22, -13, -15); ctx.lineTo(-7, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#141822'; ctx.fillRect(-3, -14, 8, 2.5);
    if (brood) broodEye(ctx, 2, -12.8, 1.8);
    else { ctx.fillStyle = '#ffe7a0'; ctx.fillRect(1, -14, 3, 2); }
    if (brood) broodVein(ctx, [-9, -2, -5, 3, -8, 8], 2);
    // 盾牌(面向側, 大而醒目)
    var flash = mode === 'block';
    rr(ctx, 5, -18, 9, 34, 3);
    ctx.fillStyle = flash ? '#ffffff' : PAL.shieldPlate; ctx.fill();
    ctx.strokeStyle = PAL.shieldRim; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = flash ? PAL.gold : '#8a96aa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(9.5, -13); ctx.lineTo(9.5, 11); ctx.moveTo(7, -1); ctx.lineTo(12, -1); ctx.stroke();
    if (flash) {
      ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(12, -19.5); ctx.lineTo(14, -21); ctx.moveTo(13, 17.5); ctx.lineTo(14.5, 19.5); ctx.stroke();
    }
    if (s.hit === true) hitFlash(ctx, function () { ctx.beginPath(); ctx.rect(-11, -6, 16, 18); ctx.moveTo(4, -13); ctx.arc(-3, -13, 7, 0, Math.PI * 2); });
    ctx.restore();
    ctx.restore();
  }

  function drawShooterBee(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), f = face(s.facing);
    var mode = oneOf(s.state, ['fly', 'aim', 'flung'], 'fly');
    var t = num(s.t), brood = s.brood === true;
    ctx.save();
    if (mode === 'flung' && !tiny(ctx)) flungLines(ctx, x, y, 16, 16, f);
    if (tiny(ctx)) {
      silhouette(ctx, x, y, 32, 32, s.hit === true ? '#ffffff' : PAL.bee, brood ? PAL.brood : PAL.beeDark, 'ell');
      ctx.restore(); return;
    }
    ctx.save();
    monsterFrame(ctx, x, y, f, mode, 16, 16);
    var pull = mode === 'aim' ? -2 : 0;
    // 翅膀
    var flap = mode === 'flung' ? 0.5 : Math.abs(Math.sin(t * 30));
    ctx.fillStyle = 'rgba(220,240,255,0.8)'; ctx.strokeStyle = 'rgba(120,140,170,0.9)'; ctx.lineWidth = 1;
    ell(ctx, -3 + pull, -9, 5, 4 + flap * 2.4); ctx.fill(); ctx.stroke();
    ell(ctx, 3 + pull, -9, 4, 3 + flap * 2.2); ctx.fill(); ctx.stroke();
    // 身體條紋
    var body = function () { ell(ctx, pull, 2, 12, 9); };
    body(); ctx.fillStyle = PAL.bee; ctx.fill(); ctx.strokeStyle = PAL.beeDark; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = PAL.beeDark; ctx.fillRect(-5 + pull, -8, 3.5, 20); ctx.fillRect(2 + pull, -8, 3.5, 20);
    ctx.restore();
    // 頭
    circle(ctx, -8 + pull, 0, 5); ctx.fillStyle = PAL.beeDark; ctx.fill();
    if (brood) broodEye(ctx, -10 + pull, -1, 1.8); else { ctx.fillStyle = '#ffffff'; circle(ctx, -10 + pull, -1, 1.6); ctx.fill(); }
    if (brood) broodVein(ctx, [-3 + pull, 9, 0 + pull, 6, 4 + pull, 9], 1.8);
    // 尾針(面向側) — 這款蜂的螫針朝前射
    ctx.fillStyle = mode === 'aim' ? PAL.danger : PAL.beeDark;
    ctx.beginPath(); ctx.moveTo(11 + pull, -1); ctx.lineTo(15, 2); ctx.lineTo(11 + pull, 5); ctx.closePath(); ctx.fill();
    if (mode === 'aim') {
      var g = 0.5 + 0.5 * Math.sin(t * 30);
      circle(ctx, 13, 2, 2.5); ctx.fillStyle = 'rgba(255,220,220,' + g.toFixed(2) + ')'; ctx.fill();
      ctx.strokeStyle = PAL.danger; ctx.lineWidth = 1.5;
      circle(ctx, 9, 2, 5.5); ctx.stroke();
    }
    if (s.hit === true) hitFlash(ctx, body);
    ctx.restore();
    ctx.restore();
  }

  function drawFrog(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), f = face(s.facing);
    var mode = oneOf(s.state, ['crouch', 'jump', 'flung'], 'crouch');
    var brood = s.brood === true;
    ctx.save();
    if (mode === 'flung' && !tiny(ctx)) flungLines(ctx, x, y, 16, 14, f);
    if (tiny(ctx)) {
      silhouette(ctx, x, y, 32, 28, s.hit === true ? '#ffffff' : PAL.frog, brood ? PAL.brood : '#062a26', 'ell');
      ctx.restore(); return;
    }
    ctx.save();
    monsterFrame(ctx, x, y, f, mode, 16, 14);
    // 面向右; 框 x -16~16, y -14~14
    var body;
    if (mode === 'jump') {
      // 伸展: 後腿往後下伸直
      ctx.strokeStyle = PAL.frogDark; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-12, 10); ctx.lineTo(-13.5, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(12, 10); ctx.stroke();
      body = function () { ell(ctx, 0, -1, 12, 8); };
    } else {
      // 蹲: 扁寬, 腿收在兩側
      ell(ctx, -11, 10, 5, 3.5); ctx.fillStyle = PAL.frogDark; ctx.fill();
      ell(ctx, 11, 11, 4, 3); ctx.fill();
      body = function () { ell(ctx, 0, 4, 14, 9); };
    }
    body(); ctx.fillStyle = PAL.frog; ctx.fill(); ctx.strokeStyle = '#062a26'; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = PAL.frogBelly; ell(ctx, 4, mode === 'jump' ? 6 : 12, 10, 5); ctx.fill();
    ctx.restore();
    // 眼(凸在頭頂)
    var ey = mode === 'jump' ? -9 : -4;
    [[3, ey], [9, ey + 1]].forEach(function (e) {
      circle(ctx, e[0], e[1], 3.6); ctx.fillStyle = PAL.frog; ctx.fill(); ctx.strokeStyle = '#062a26'; ctx.lineWidth = 1.5; ctx.stroke();
      if (brood) broodEye(ctx, e[0] + 0.5, e[1], 1.6);
      else { ctx.fillStyle = '#10141a'; circle(ctx, e[0] + 0.8, e[1], 1.5); ctx.fill(); }
    });
    if (brood) broodVein(ctx, mode === 'jump' ? [-8, -3, -3, -6, 2, -3] : [-10, 2, -5, -1, 0, 2], 2);
    if (s.hit === true) hitFlash(ctx, body);
    ctx.restore();
    ctx.restore();
  }

  function drawBroodmother(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), f = face(s.facing);
    var mode = oneOf(s.state, ['walk', 'windup', 'charge', 'stun'], 'walk');
    var t = num(s.t);
    var maxHp = Math.max(1, num(s.maxHp, 12)), hp = clamp(num(s.hp, maxHp), 0, maxHp);
    ctx.save();
    // 血條: 寬 56 高 6, 底邊在本體框上緣上方 8px(縮圖也畫)
    var barY = y - 28 - 8 - 6;
    ctx.fillStyle = '#120a18'; ctx.fillRect(x - 28, barY, 56, 6);
    ctx.fillStyle = PAL.brood; ctx.fillRect(x - 27, barY + 1, 54 * hp / maxHp, 4);
    if (tiny(ctx)) {
      silhouette(ctx, x, y, 64, 56, s.hit === true ? '#ffffff' : PAL.motherShell, PAL.brood, 'ell');
      ctx.restore(); return;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x - 27.5, barY + 0.5, 55, 5);
    if (mode === 'stun') stars(ctx, x, y - 28 - 20, 24, t, 4, 0); // 星星 y 在框上 16~24px, 血條在框上 8~14px, 不重疊
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);
    // 面向右; 框 x -32~32, y -28~28
    var shake = mode === 'windup' ? Math.sin(t * 50) * 0.8 : 0;
    var lean = mode === 'windup' ? -2 : (mode === 'charge' ? 2 : 0);
    var step = mode === 'walk' ? Math.sin(t * 6) * 2 : (mode === 'charge' ? Math.sin(t * 20) * 3 : 0);
    ctx.translate(shake, 0);
    // 六條節肢腳
    ctx.strokeStyle = PAL.motherDark; ctx.lineWidth = 4; ctx.lineCap = 'round';
    [-20, -6, 8].forEach(function (lx, i) {
      var st = (i % 2 ? step : -step);
      ctx.beginPath(); ctx.moveTo(lx + lean, 8); ctx.lineTo(lx - 5 + st + lean, 17); ctx.lineTo(lx - 3 + st, 25.5); ctx.stroke();
    });
    // 甲殼身體
    var body = function () { ell(ctx, -3 + lean, 2, 25, 18); };
    body(); ctx.fillStyle = PAL.mother; ctx.fill(); ctx.strokeStyle = PAL.motherDark; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = PAL.motherShell; ell(ctx, -8 + lean, -6, 22, 12); ctx.fill();
    ctx.restore();
    // 巢穴紋(與巢穴怪同一套紫紋), 暈眩時變成金色裂縫 = 破綻
    if (mode === 'stun') {
      var pulse = 0.6 + 0.4 * Math.sin(t * 10);
      ctx.save(); body(); ctx.clip();
      ctx.strokeStyle = 'rgba(255,207,74,' + pulse.toFixed(2) + ')'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-24 + lean, -4); ctx.lineTo(-14 + lean, -12); ctx.lineTo(-4 + lean, -4); ctx.lineTo(6 + lean, -12); ctx.lineTo(14 + lean, -2); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,207,74,' + pulse.toFixed(2) + ')'; ctx.lineWidth = 2;
      body(); ctx.stroke();
    } else {
      broodVein(ctx, [-24 + lean, 0, -16 + lean, -8, -8 + lean, -2, 0 + lean, -10, 8 + lean, -2], 2.5);
      broodVein(ctx, [-20 + lean, 10, -10 + lean, 6, 0 + lean, 12], 2.5);
    }
    // 頭 + 冠角
    var hx = 19 + lean;
    ctx.fillStyle = PAL.motherDark;
    ctx.beginPath(); ctx.moveTo(hx - 6, -10); ctx.lineTo(hx - 2, -27); ctx.lineTo(hx + 2, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 2, -8); ctx.lineTo(hx + 10, -22); ctx.lineTo(hx + 8, -6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.brood;
    ctx.beginPath(); ctx.moveTo(hx - 4, -12); ctx.lineTo(hx - 2, -22); ctx.lineTo(hx, -12); ctx.closePath(); ctx.fill();
    ell(ctx, hx, 2, 9, 11); ctx.fillStyle = PAL.motherShell; ctx.fill(); ctx.strokeStyle = PAL.motherDark; ctx.lineWidth = 2.5; ctx.stroke();
    // 顎
    ctx.strokeStyle = '#efe6f8'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(hx + 5, 8); ctx.quadraticCurveTo(hx + 9, 11, hx + 7, 15); ctx.stroke();
    // 眼
    if (mode === 'stun') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx + 1, -3); ctx.lineTo(hx + 7, 3); ctx.moveTo(hx + 7, -3); ctx.lineTo(hx + 1, 3); ctx.stroke();
    } else if (mode === 'windup' || mode === 'charge') {
      circle(ctx, hx + 4, 0, 4.5); ctx.fillStyle = 'rgba(255,69,69,0.45)'; ctx.fill();
      circle(ctx, hx + 4, 0, 3); ctx.fillStyle = PAL.danger; ctx.fill();
      circle(ctx, hx + 4, 0, 1.2); ctx.fillStyle = '#ffffff'; ctx.fill();
    } else {
      broodEye(ctx, hx + 4, 0, 3);
    }
    if (mode === 'windup') {
      ctx.fillStyle = 'rgba(220,200,170,0.8)';
      circle(ctx, -27, 24, 2.6); ctx.fill(); circle(ctx, -22, 21, 2.2); ctx.fill();
    }
    if (mode === 'charge') {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5;
      [-10, 0, 10].forEach(function (ly) { ctx.beginPath(); ctx.moveTo(-29.5, ly); ctx.lineTo(-25, ly); ctx.stroke(); });
    }
    if (s.hit === true) hitFlash(ctx, body);
    ctx.restore();
    ctx.restore();
  }

  // ───────────────────────── 飛行物 / 特效 ─────────────────────────
  function drawBeeShot(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    ctx.save();
    if (tiny(ctx)) { circle(ctx, x, y, 6); ctx.fillStyle = PAL.beeShot; ctx.fill(); ctx.restore(); return; }
    circle(ctx, x, y, 5.5); ctx.fillStyle = PAL.dangerDark; ctx.fill();
    circle(ctx, x, y, 4); ctx.fillStyle = PAL.beeShot; ctx.fill();
    circle(ctx, x - 1, y - 1, 1.5); ctx.fillStyle = '#ffd8d8'; ctx.fill();
    ctx.restore();
  }

  function drawArrow(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), a = num(s.angle);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    if (tiny(ctx)) { ctx.fillStyle = PAL.arrow; ctx.fillRect(-12, -3, 24, 6); ctx.restore(); return; }
    ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(7, 0); ctx.stroke();
    ctx.fillStyle = '#d8e0ea';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -3); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.hunter;
    ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-7, 0); ctx.lineTo(-12, 3); ctx.lineTo(-9, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawBomb(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), t = num(s.t);
    ctx.save();
    if (tiny(ctx)) { circle(ctx, x, y, 8); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.restore(); return; }
    circle(ctx, x, y + 1, 6); ctx.fillStyle = PAL.bomb; ctx.fill();
    ctx.strokeStyle = PAL.bomber; ctx.lineWidth = 1.5; ctx.stroke();
    circle(ctx, x - 2, y - 1, 1.8); ctx.fillStyle = '#6a6e7a'; ctx.fill();
    ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 3, y - 4); ctx.lineTo(x + 4.5, y - 5); ctx.stroke();
    var fl = (Math.sin(t * 40) + 1) / 2;
    circle(ctx, x + 5, y - 5.5, 1.2 + fl * 0.8); ctx.fillStyle = fl > 0.5 ? '#fff2a0' : PAL.bomber; ctx.fill();
    ctx.restore();
  }

  function drawExplosion(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.25)), t = clamp(num(s.t), 0, dur);
    var R = clamp(num(s.radius, 60), 0, 60);
    var p = t / dur;
    ctx.save();
    var r = R * (0.4 + 0.6 * Math.min(1, p * 1.6));
    var a = 1 - p * p;
    ctx.globalAlpha = a;
    circle(ctx, x, y, r); ctx.fillStyle = PAL.explosion; ctx.fill();
    circle(ctx, x, y, r * 0.65); ctx.fillStyle = '#ffd25a'; ctx.fill();
    circle(ctx, x, y, r * 0.3); ctx.fillStyle = '#fff6d0'; ctx.fill();
    if (!tiny(ctx)) {
      ctx.fillStyle = '#5a3a2a';
      for (var i = 0; i < 6; i++) {
        var aa = i * Math.PI / 3 + 0.3;
        circle(ctx, x + Math.cos(aa) * r * 0.85, y + Math.sin(aa) * r * 0.85, 3); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawShockwave(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.3)), t = clamp(num(s.t), 0, dur);
    var R = clamp(num(s.radius, 130), 0, 130);
    var p = t / dur;
    var outer = R * (0.15 + 0.85 * p);
    var bw = 10;
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.85;
    // 外緣 = 當下 outer; 環從外緣往內畫 bw 寬(不是火球, 是往外推的環)
    circle(ctx, x, y, Math.max(0, outer - bw / 2));
    ctx.strokeStyle = 'rgba(191,230,255,0.85)'; ctx.lineWidth = bw; ctx.stroke();
    circle(ctx, x, y, Math.max(0, outer - 1));
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    if (!tiny(ctx)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        var r1 = Math.max(0, outer - 14), r2 = Math.max(0, outer - 3);
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawPoof(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.3)), t = clamp(num(s.t), 0, dur);
    var k = s.big === true ? 2 : 1;
    var p = t / dur;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3;
      var d = (6 + p * 10) * k;
      var r = (8 - p * 3) * k;
      circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r);
      ctx.fillStyle = i % 2 ? PAL.poof : '#a8adb8'; ctx.fill();
    }
    circle(ctx, x, y, 8 * k * (1 - p * 0.5)); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  function drawPopup(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.8)), t = clamp(num(s.t), 0, dur);
    var kind = kindOf(s.kind), val = clamp(Math.round(num(s.value, 1)), 0, 9999), mult = clamp(Math.round(num(s.mult, 1)), 1, 3);
    var p = t / dur;
    ctx.save();
    ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    var yy = y - 30 * p;
    var label = '+' + val;
    ctx.font = font(18, true);
    var tw = ctx.measureText(label).width;
    var badgeW = mult > 1 ? 26 : 0;
    var total = 16 + 3 + tw + (badgeW ? 4 + badgeW : 0);
    var x0 = x - total / 2;
    matIcon(ctx, kind, x0 + 8, yy, 16);
    T(ctx, label, x0 + 19, yy + 1, { px: 18, bold: true, color: '#ffffff', outline: '#10141c', outlineW: 3.5 });
    if (mult > 1) {
      var bx = x0 + 19 + tw + 4;
      rr(ctx, bx, yy - 10, badgeW, 20, 6);
      ctx.fillStyle = mult === 3 ? '#ff5a2a' : '#ff9a1a'; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
      T(ctx, '×' + mult, bx + badgeW / 2, yy + 1, { px: 13, bold: true, color: '#ffffff', align: 'center' });
    }
    ctx.restore();
  }

  function drawChainText(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.8)), t = clamp(num(s.t), 0, dur);
    var n = clamp(Math.round(num(s.n, 2)), 0, 99);
    var p = t / dur;
    var sc = p < 0.15 ? 0.8 + (p / 0.15) * 0.5 : (p < 0.3 ? 1.3 - ((p - 0.15) / 0.15) * 0.3 : 1);
    ctx.save();
    ctx.globalAlpha = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
    ctx.translate(x, y - 30 * Math.max(0, (p - 0.25) / 0.75));
    ctx.scale(sc, sc);
    T(ctx, n + ' 連鎖', 0, 0, { px: 24, bold: true, color: '#ffb02a', align: 'center', outline: '#2a1206', outlineW: 5 });
    ctx.restore();
  }

  // ───────────────────────── 戰利品 ─────────────────────────
  function drawItemIcon(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), type = itemOf(s.type);
    ctx.save();
    ctx.translate(x, y);
    rr(ctx, -15, -15, 30, 30, 6); ctx.fillStyle = '#2e2440'; ctx.fill();
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.stroke();
    if (!type) { T(ctx, '?', 0, 1, { px: 16, bold: true, color: PAL.textDim, align: 'center' }); ctx.restore(); return; }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (type === 'tusk') {
      circle(ctx, 0, 0, 11); ctx.fillStyle = PAL.boar; ctx.fill();
      ctx.strokeStyle = '#fbf6e8'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-6, 7); ctx.quadraticCurveTo(6, 8, 6, -8); ctx.stroke();
    } else if (type === 'sting') {
      ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(10, 0); ctx.lineTo(-10, 6); ctx.closePath();
      ctx.fillStyle = PAL.bee; ctx.fill(); ctx.strokeStyle = PAL.beeDark; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = PAL.beeDark; ctx.fillRect(-6, -5, 3, 10); ctx.fillRect(0, -3, 3, 6);
    } else if (type === 'crest') {
      ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(9, -10); ctx.lineTo(9, 1); ctx.quadraticCurveTo(9, 9, 0, 12); ctx.quadraticCurveTo(-9, 9, -9, 1); ctx.closePath();
      ctx.fillStyle = PAL.shieldPlate; ctx.fill(); ctx.strokeStyle = PAL.shieldRim; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = '#8a96aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 8); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.stroke();
    } else if (type === 'web') {
      ctx.fillStyle = PAL.frog;
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(-10, -6); ctx.quadraticCurveTo(-5, -3, -3, -9); ctx.quadraticCurveTo(0, -4, 3, -9); ctx.quadraticCurveTo(5, -3, 10, -6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#062a26'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = PAL.frogBelly; [[-10, -6], [-3, -9], [3, -9], [10, -6]].forEach(function (p) { circle(ctx, p[0], p[1], 2); ctx.fill(); });
    } else if (type === 'broodHorn') {
      ctx.beginPath(); ctx.moveTo(-8, 11); ctx.quadraticCurveTo(-8, -4, 7, -12); ctx.quadraticCurveTo(0, -1, 4, 11); ctx.closePath();
      ctx.fillStyle = PAL.motherShell; ctx.fill(); ctx.strokeStyle = PAL.brood; ctx.lineWidth = 2; ctx.stroke();
      broodEye(ctx, -1, 4, 2.2);
    } else {
      // 袋子: 麻布袋 + 對應素材圖示
      var k = type === 'bagCore' ? 'core' : (type === 'bagIron' ? 'iron' : 'wood');
      ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(5, -9); ctx.lineTo(3, -6); ctx.quadraticCurveTo(13, 0, 10, 10); ctx.lineTo(-10, 10); ctx.quadraticCurveTo(-13, 0, -3, -6); ctx.closePath();
      ctx.fillStyle = '#d8c39a'; ctx.fill(); ctx.strokeStyle = '#6a5430'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = PAL[k]; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.stroke();
      matIcon(ctx, k, 0, 3, 12);
    }
    ctx.restore();
  }

  function drawItemNotice(ctx, state) {
    var s = st0(state);
    var dur = Math.max(0.01, num(s.dur, 1.5)), t = clamp(num(s.t), 0, dur), type = itemOf(s.type);
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? Math.max(0, (dur - t) / 0.3) : 1);
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    rr(ctx, 441, 53, 398, 42, 10); ctx.fillStyle = 'rgba(30,20,44,0.92)'; ctx.fill();
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.stroke();
    drawItemIcon(ctx, { x: 470, y: 74, type: type });
    T(ctx, '獲得 ' + (type ? ITEM_NAME[type] : '戰利品'), 496, 75, { px: 20, bold: true, color: PAL.gold, maxW: 330 });
    ctx.restore();
  }

  // ───────────────────────── 大地圖 ─────────────────────────
  function drawMapBackground(ctx) {
    ctx.save();
    ctx.fillStyle = PAL.mapBg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = PAL.mapGrid; ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, 40); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (var y = 40; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
    var g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 760);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawMapLink(ctx, state) {
    var s = st0(state);
    var x1 = num(s.x1), y1 = num(s.y1), x2 = num(s.x2), y2 = num(s.y2), lit = s.lit === true;
    var mx = (x1 + x2) / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (lit) {
      ctx.strokeStyle = 'rgba(255,207,74,0.25)'; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = PAL.linkLit; ctx.lineWidth = 3.5; ctx.stroke();
    } else {
      ctx.strokeStyle = PAL.linkDim; ctx.lineWidth = 3; ctx.setLineDash([7, 7]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawLevelCard(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    var idx = clamp(Math.round(num(s.index, 1)), 0, 99), name = String(s.name == null ? '' : s.name);
    var mode = oneOf(s.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed');
    ctx.save();
    rr(ctx, x + 1, y + 1, 174, 134, 10);
    ctx.fillStyle = mode === 'sealed' ? '#141a24' : PAL.panel; ctx.fill();
    ctx.strokeStyle = mode === 'cleared' ? '#6a7c9c' : (mode === 'buyable' ? '#8a7a40' : PAL.edge); ctx.lineWidth = 2; ctx.stroke();
    // 縮圖區底色
    ctx.fillStyle = mode === 'sealed' ? '#10141c' : '#0e131c'; ctx.fillRect(x + 8, y + 8, 160, 90);
    if (mode === 'sealed' || mode === 'buyable') {
      var dim = mode === 'sealed';
      lockIcon(ctx, x + 88, y + 34, 26, dim ? '#566078' : PAL.gold);
      costRow(ctx, s.cost, s.stock, x + 88, y + 66, { px: 15, icon: 16, align: 'center', color: dim ? PAL.textMute : PAL.text });
      if (!dim) T(ctx, 'Z 解鎖', x + 88, y + 86, { px: 12, align: 'center', bold: true, color: s.canAfford === true ? PAL.gold : PAL.textMute });
    }
    // 文字區第一行
    var tcol = mode === 'sealed' ? PAL.textMute : PAL.text;
    var line1 = y + 113;
    T(ctx, idx + ' ' + name, x + 9, line1, { px: 14, bold: true, color: tcol, maxW: 70 });
    var rep = clamp(Math.round(num(s.repairedCount)), 0, 2);
    if (mode !== 'sealed') {
      rr(ctx, x + 132, line1 - 8, 38, 16, 5); ctx.fillStyle = rep > 0 ? 'rgba(192,96,255,0.25)' : '#1e2534'; ctx.fill();
      T(ctx, '巢 ' + rep + '/2', x + 151, line1 + 1, { px: 11, bold: true, align: 'center', color: rep > 0 ? PAL.broodGlow : PAL.textDim });
    }
    if (mode === 'cleared') {
      clsIcon(ctx, s.recordCls, x + 88, line1, 7);
      T(ctx, f1(s.recordTime) + 's', x + 98, line1 + 1, { px: 11, color: PAL.textDim, maxW: 32 });
      var rates = matSet(s.rates);
      KINDS.forEach(function (k, i) {
        var cx = x + 9 + i * 41;
        matIcon(ctx, k, cx + 5, y + 128, 10);
        T(ctx, f1(rates[k]), cx + 12, y + 129, { px: 11, color: rates[k] > 0 ? PAL.text : PAL.textMute, maxW: 28 });
      });
    } else if (mode === 'open') {
      T(ctx, '未過關', x + 9, y + 129, { px: 12, color: PAL.textDim });
    } else if (mode === 'buyable') {
      T(ctx, '可解鎖', x + 9, y + 129, { px: 12, color: PAL.gold });
    } else {
      T(ctx, '先通過前一關', x + 9, y + 129, { px: 12, color: PAL.textMute });
    }
    if (mode === 'sealed') { rr(ctx, x, y, 176, 136, 10); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); }
    ctx.restore();
  }

  function drawCardOverlay(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    var lv = clamp(Math.round(num(s.accelLv)), 0, 2);
    ctx.save();
    ctx.strokeStyle = '#4a5a76'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, 160, 90);
    if (lv > 0) {
      var lab = lv === 1 ? '×1.25' : '×1.5';
      rr(ctx, x + 124, y + 11, 41, 17, 5); ctx.fillStyle = PAL.timeDark; ctx.fill();
      ctx.strokeStyle = PAL.time; ctx.lineWidth = 1.5; ctx.stroke();
      T(ctx, lab, x + 144.5, y + 20, { px: 11, bold: true, align: 'center', color: '#ffffff' });
    }
    if (s.newArea === true) {
      rr(ctx, x + 11, y + 11, 52, 17, 5); ctx.fillStyle = PAL.brood; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
      T(ctx, '新區域', x + 37, y + 20, { px: 11, bold: true, align: 'center', color: '#ffffff' });
    }
    if (s.selected === true) {
      var pulse = 0.65 + 0.35 * Math.sin(nowSec() * 5);
      rr(ctx, x - 4, y - 4, 184, 144, 13);
      ctx.strokeStyle = 'rgba(255,207,74,' + pulse.toFixed(2) + ')'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
  }

  function selBox(ctx, x, y, w, h) {
    var pulse = 0.65 + 0.35 * Math.sin(nowSec() * 5);
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 13);
    ctx.strokeStyle = 'rgba(255,207,74,' + pulse.toFixed(2) + ')'; ctx.lineWidth = 4; ctx.stroke();
  }

  function anvil(ctx, cx, cy, k) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.fillStyle = '#7d8aa0';
    ctx.beginPath(); ctx.moveTo(-26, -10); ctx.lineTo(22, -10); ctx.quadraticCurveTo(30, -10, 34, -16); ctx.lineTo(32, -4); ctx.lineTo(14, 0); ctx.lineTo(10, 8); ctx.lineTo(18, 16); ctx.lineTo(-18, 16); ctx.lineTo(-10, 8); ctx.lineTo(-14, 0); ctx.lineTo(-26, -2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c0cad8'; ctx.fillRect(-24, -10, 44, 3);
    // 鎚子
    ctx.save(); ctx.translate(-4, -24); ctx.rotate(-0.5);
    ctx.fillStyle = '#a8763a'; ctx.fillRect(-2, -4, 4, 20);
    ctx.fillStyle = '#5d6c7e'; ctx.fillRect(-9, -10, 18, 8);
    ctx.restore();
    ctx.restore();
  }

  function drawWorkshopCard(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y);
    ctx.save();
    rr(ctx, x + 1, y + 1, 174, 134, 10); ctx.fillStyle = PAL.panel; ctx.fill();
    ctx.strokeStyle = PAL.edge; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0e131c'; ctx.fillRect(x + 8, y + 8, 160, 90);
    // 爐火背景
    var g = ctx.createRadialGradient(x + 88, y + 80, 4, x + 88, y + 80, 70);
    g.addColorStop(0, 'rgba(255,138,58,0.45)'); g.addColorStop(1, 'rgba(255,138,58,0)');
    ctx.fillStyle = g; ctx.fillRect(x + 8, y + 8, 160, 90);
    anvil(ctx, x + 86, y + 62, 1.2);
    T(ctx, '升級所', x + 9, y + 113, { px: 15, bold: true });
    T(ctx, '招募 / 強化', x + 9, y + 129, { px: 12, color: PAL.textDim });
    if (s.anyAffordable === true) {
      circle(ctx, x + 158, y + 18, 11); ctx.fillStyle = PAL.gold; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#3a2a00';
      ctx.beginPath(); ctx.moveTo(x + 158, y + 11); ctx.lineTo(x + 165, y + 19); ctx.lineTo(x + 161, y + 19); ctx.lineTo(x + 161, y + 25); ctx.lineTo(x + 155, y + 25); ctx.lineTo(x + 155, y + 19); ctx.lineTo(x + 151, y + 19); ctx.closePath(); ctx.fill();
    }
    if (s.selected === true) selBox(ctx, x, y, 176, 136);
    ctx.restore();
  }

  function palace(ctx, cx, cy, k, lit) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    var c = lit ? PAL.gold : '#8a8270';
    ctx.fillStyle = '#3a3448'; ctx.fillRect(-36, -6, 72, 30);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-42, -6); ctx.lineTo(0, -30); ctx.lineTo(42, -6); ctx.closePath(); ctx.fill();
    ctx.fillRect(-40, 22, 80, 5);
    ctx.fillStyle = '#d8d2c0';
    for (var i = -3; i <= 3; i += 2) ctx.fillRect(i * 9 - 2.5, -4, 5, 26);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-8, -38); ctx.lineTo(-4, -30); ctx.lineTo(0, -40); ctx.lineTo(4, -30); ctx.lineTo(8, -38); ctx.lineTo(7, -28); ctx.lineTo(-7, -28); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawGoalCard(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), can = s.canAfford === true;
    var cost = matSet(s.cost), stock = matSet(s.stock);
    ctx.save();
    rr(ctx, x + 1.5, y + 1.5, 197, 133, 10); ctx.fillStyle = '#211a2c'; ctx.fill();
    ctx.strokeStyle = can ? PAL.gold : '#6a5a3a'; ctx.lineWidth = can ? 3 : 2; ctx.stroke();
    palace(ctx, x + 50, y + 54, 0.9, can);
    T(ctx, '獵王殿', x + 50, y + 104, { px: 16, bold: true, align: 'center', color: can ? PAL.gold : PAL.text });
    T(ctx, can ? 'Z 買下' : '終極目標', x + 50, y + 123, { px: 12, align: 'center', bold: can, color: can ? PAL.gold : PAL.textDim });
    // 四種花費(直列), 不足的數字變紅
    KINDS.forEach(function (k, i) {
      var ry = y + 22 + i * 28;
      matIcon(ctx, k, x + 112, ry, 16);
      var lack = stock[k] < cost[k];
      T(ctx, intStr(cost[k]), x + 124, ry + 1, { px: 15, bold: true, color: lack ? PAL.danger : PAL.good });
      if (lack) {
        ctx.font = font(15, true);
        var tw = ctx.measureText(intStr(cost[k])).width;
        ctx.strokeStyle = PAL.danger; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 124, ry + 10); ctx.lineTo(x + 124 + tw, ry + 10); ctx.stroke();
      }
      T(ctx, KIND_NAME[k], x + 164, ry + 1, { px: 11, color: PAL.textDim });
    });
    if (s.selected === true) selBox(ctx, x, y, 200, 136);
    ctx.restore();
  }

  function drawFlyingMaterial(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), kind = kindOf(s.kind);
    var dur = Math.max(0.01, num(s.dur, 0.7)), t = clamp(num(s.t), 0, dur);
    var tgt = HUD_ICON[kind];
    var dx = tgt[0] - x, dy = tgt[1] - y, d = Math.sqrt(dx * dx + dy * dy);
    ctx.save();
    if (d > 1) {
      var ux = -dx / d, uy = -dy / d; // 拖尾方向 = 飛行反方向(朝向資訊列圖示的反向)
      var len = Math.min(24, d);
      var g = ctx.createLinearGradient(x, y, x + ux * (10 + len), y + uy * (10 + len));
      g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + ux * 6, y + uy * 6); ctx.lineTo(x + ux * (10 + len - 3), y + uy * (10 + len - 3)); ctx.stroke();
    }
    circle(ctx, x, y, 9.5); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
    matIcon(ctx, kind, x, y, 16);
    ctx.restore();
  }

  // ───────────────────────── HUD ─────────────────────────
  function drawHud(ctx, state) {
    var s = st0(state);
    var mode = s.mode === 'level' ? 'level' : 'map';
    var stock = matSet(s.stock), rate = matSet(s.ratePerMin);
    var bumpDur = Math.max(0.001, num(s.bumpDur, 0.15)), bump = st0(s.bumpT);
    ctx.save();
    ctx.fillStyle = 'rgba(10,14,22,0.88)'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 39, W, 1);
    KINDS.forEach(function (k, i) {
      var cx = 16 + i * 170;
      if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx - 6, 7, 1, 26); }
      matIcon(ctx, k, HUD_ICON[k][0], HUD_ICON[k][1], 22);
      var bt = clamp(num(bump[k], bumpDur), 0, bumpDur);
      var sc = bt < bumpDur ? 1 + 0.3 * Math.sin(Math.PI * bt / bumpDur) : 1;
      ctx.save();
      ctx.translate(cx + 34, 15);
      ctx.scale(sc, sc);
      T(ctx, intStr(stock[k]), 0, 0, { px: 18, bold: true, color: sc > 1 ? '#ffffff' : PAL.text, maxW: 72 });
      ctx.restore();
      T(ctx, '+' + f1(rate[k]) + '/分', cx + 34, 31, { px: 11, color: rate[k] > 0 ? PAL.good : PAL.textMute, maxW: 82 });
      T(ctx, KIND_USE[k], cx + 154, 20, { px: 11, color: PAL.textDim, align: 'right' });
    });
    if (mode === 'level') {
      // 右側 720~1270: 職業 / 血量 / 技能冷卻 / 秒數 / 這趟素材
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(712, 7, 1, 26);
      clsIcon(ctx, s.cls, 738, 20, 12);
      var maxHp = clamp(Math.round(num(s.maxHp, 3)), 1, 5), hp = clamp(Math.round(num(s.hp, maxHp)), 0, maxHp);
      for (var i = 0; i < maxHp; i++) heart(ctx, 768 + i * 22, 20, 9, i < hp);
      var cdDur = Math.max(0.001, num(s.skillCdDur, 1)), cdT = clamp(num(s.skillCdT, cdDur), 0, cdDur);
      var ready = cdT >= cdDur;
      var kx = 900;
      circle(ctx, kx, 20, 13); ctx.fillStyle = ready ? '#2a3a20' : '#1a1e28'; ctx.fill();
      if (!ready) {
        ctx.beginPath(); ctx.moveTo(kx, 20); ctx.arc(kx, 20, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cdT / cdDur)); ctx.closePath();
        ctx.fillStyle = 'rgba(255,207,74,0.45)'; ctx.fill();
      }
      circle(ctx, kx, 20, 13); ctx.strokeStyle = ready ? PAL.gold : '#4a5266'; ctx.lineWidth = 2; ctx.stroke();
      T(ctx, 'X', kx, 21, { px: 14, bold: true, align: 'center', color: ready ? PAL.gold : PAL.textDim });
      T(ctx, f1(s.time) + ' 秒', 930, 20, { px: 17, bold: true, maxW: 80 });
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(1018, 7, 1, 26);
      T(ctx, '這趟', 1026, 20, { px: 11, color: PAL.textDim });
      var run = matSet(s.run);
      KINDS.forEach(function (k, j) {
        var rx = 1056 + j * 54;
        matIcon(ctx, k, rx + 8, 20, 15);
        T(ctx, intStr(run[k]), rx + 18, 21, { px: 14, bold: true, color: run[k] > 0 ? PAL.text : PAL.textMute, maxW: 34 });
      });
    }
    ctx.restore();
  }
  function heart(ctx, cx, cy, r, full) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx - r * 1.3, cy, cx - r * 0.9, cy - r * 1.1, cx, cy - r * 0.35);
    ctx.bezierCurveTo(cx + r * 0.9, cy - r * 1.1, cx + r * 1.3, cy, cx, cy + r * 0.9);
    ctx.closePath();
    ctx.fillStyle = full ? '#ff5a6a' : '#2a2e3a'; ctx.fill();
    ctx.strokeStyle = full ? '#ffffff' : '#555c70'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // ───────────────────────── 面板 ─────────────────────────
  function panelBg(ctx, x, y, w, h, dim) {
    if (dim) { ctx.fillStyle = 'rgba(6,8,14,0.72)'; ctx.fillRect(0, 0, W, H); }
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 14); ctx.fillStyle = PAL.panel; ctx.fill();
    ctx.strokeStyle = PAL.edge; ctx.lineWidth = 2; ctx.stroke();
  }
  function rowBox(ctx, x, y, w, h, on) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = on ? '#222c42' : '#171e2b'; ctx.fill();
    ctx.strokeStyle = on ? PAL.gold : '#2e3850'; ctx.lineWidth = on ? 3 : 1.5; ctx.stroke();
  }
  function cellBox(ctx, x, y, w, h, on, rowOn) {
    rr(ctx, x, y, w, h, 8);
    ctx.fillStyle = on ? '#2c3854' : '#1c2436'; ctx.fill();
    ctx.strokeStyle = on ? (rowOn ? '#ffffff' : '#8a96b0') : '#384360'; ctx.lineWidth = on ? 2.5 : 1; ctx.stroke();
  }
  function hint(ctx, s, x, y) { T(ctx, s, x, y, { px: 14, color: PAL.textDim }); }
  function monsterHead(ctx, type, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(0.5, 0.5);
    if (type === 'boar') drawBoar(ctx, { x: 0, y: 0, facing: 1, state: 'walk', t: 0 });
    else if (type === 'shield') drawShieldman(ctx, { x: 0, y: 0, facing: 1, state: 'walk', t: 0 });
    else if (type === 'bee') drawShooterBee(ctx, { x: 0, y: 0, facing: 1, state: 'fly', t: 0.05 });
    else drawFrog(ctx, { x: 0, y: 0, facing: 1, state: 'crouch' });
    ctx.restore();
  }

  function drawLevelPanel(ctx, state) {
    var s = st0(state);
    var row = clamp(Math.round(num(s.row)), 0, 3);
    var stock = matSet(s.stock);
    ctx.save();
    panelBg(ctx, 40, 48, 1200, 640, true);
    T(ctx, '第 ' + intStr(s.index) + ' 關  ' + String(s.name == null ? '' : s.name), 60, 72, { px: 22, bold: true });
    // 預覽框(內容由 RD 畫)
    ctx.strokeStyle = PAL.edge; ctx.lineWidth = 2; ctx.strokeRect(59, 95, 642, 362);
    // 背包
    var items = Array.isArray(s.items) ? s.items.slice(0, 8) : [];
    T(ctx, '背包', 60, 465, { px: 12, color: PAL.textDim, base: 'bottom' });
    for (var i = 0; i < 8; i++) {
      var bx = 60 + i * 80, by = 472;
      rr(ctx, bx, by, 74, 74, 8); ctx.fillStyle = '#141a26'; ctx.fill();
      ctx.strokeStyle = '#2e3850'; ctx.lineWidth = 1.5; ctx.stroke();
      var it = st0(items[i]);
      if (items[i] && itemOf(it.type)) {
        drawItemIcon(ctx, { x: bx + 37, y: by + 28, type: it.type });
        var w = it.where && typeof it.where === 'object' ? it.where : null;
        var lab = w ? ('第' + clamp(Math.round(num(w.level, 1)), 1, 8) + '關 ' + clamp(Math.round(num(w.slot, 1)), 1, 2) + '號') : '未裝';
        T(ctx, lab, bx + 37, by + 61, { px: 11, align: 'center', color: w ? PAL.gold : PAL.textDim, maxW: 70 });
      }
    }
    // 回放資訊
    rr(ctx, 60, 560, 640, 90, 8); ctx.fillStyle = '#141a26'; ctx.fill();
    T(ctx, '目前回放', 74, 578, { px: 13, color: PAL.textDim });
    if (s.recordTime == null || s.recordCls == null) {
      T(ctx, '尚無回放', 74, 612, { px: 18, bold: true, color: PAL.textMute });
    } else {
      clsIcon(ctx, s.recordCls, 88, 612, 13);
      T(ctx, CLS_NAME[clsOf(s.recordCls)] + '  ' + f1(s.recordTime) + ' 秒', 108, 612, { px: 17, bold: true });
      var rates = matSet(s.rates);
      KINDS.forEach(function (k, j) {
        var rx = 300 + j * 96;
        matIcon(ctx, k, rx + 9, 612, 18);
        T(ctx, f1(rates[k]) + '/分', rx + 22, 613, { px: 15, color: rates[k] > 0 ? PAL.text : PAL.textMute, maxW: 70 });
      });
    }
    if (s.newArea === true) {
      rr(ctx, 560, 568, 128, 22, 6); ctx.fillStyle = 'rgba(192,96,255,0.25)'; ctx.fill();
      T(ctx, '修好後還沒跑過', 624, 579, { px: 12, bold: true, align: 'center', color: PAL.broodGlow });
    }

    // ── 職業列
    rowBox(ctx, 720, 96, 480, 130, row === 0);
    T(ctx, '職業', 734, 110, { px: 13, bold: true, color: row === 0 ? PAL.gold : PAL.textDim });
    var classes = Array.isArray(s.classes) ? s.classes : [];
    var clsSel = clamp(Math.round(num(s.clsSel)), 0, 2);
    for (var c = 0; c < 3; c++) {
      var cs = st0(classes[c]);
      var cls = clsOf(cs.cls || ['sword', 'hunter', 'bomber'][c]);
      var cx0 = 728 + c * 158, cy0 = 120;
      var on = c === clsSel;
      cellBox(ctx, cx0, cy0, 150, 100, on, row === 0);
      var owned = cs.owned === true;
      ctx.save(); if (!owned) ctx.globalAlpha = 0.45;
      clsIcon(ctx, cls, cx0 + 75, cy0 + 24, 16);
      T(ctx, CLS_NAME[cls], cx0 + 75, cy0 + 53, { px: 15, bold: true, align: 'center' });
      T(ctx, '擅長: ' + CLS_GOOD[cls], cx0 + 75, cy0 + 71, { px: 11, align: 'center', color: PAL.textDim, maxW: 140 });
      ctx.restore();
      if (!owned) {
        lockIcon(ctx, cx0 + 118, cy0 + 20, 20, PAL.textDim);
        T(ctx, '到升級所招募', cx0 + 75, cy0 + 89, { px: 11, align: 'center', color: PAL.textDim });
      } else if (on) {
        T(ctx, 'Z 出發', cx0 + 75, cy0 + 89, { px: 13, bold: true, align: 'center', color: row === 0 ? PAL.gold : PAL.textDim });
      }
    }

    // ── 修復列
    rowBox(ctx, 720, 236, 480, 150, row === 1);
    T(ctx, '修復巢穴', 734, 250, { px: 13, bold: true, color: row === 1 ? PAL.gold : PAL.textDim });
    var sites = Array.isArray(s.sites) ? s.sites : [];
    var siteSel = clamp(Math.round(num(s.siteSel)), 0, 1);
    var SITE = [['地下通道', '打通後巢口會湧出怪物'], ['祭壇門', '修好後巢母出現']];
    for (var q = 0; q < 2; q++) {
      var si = st0(sites[q]);
      var sx = 728 + q * 236, sy = 262;
      var son = q === siteSel;
      cellBox(ctx, sx, sy, 228, 92, son, row === 1);
      T(ctx, SITE[q][0], sx + 12, sy + 16, { px: 15, bold: true });
      T(ctx, SITE[q][1], sx + 12, sy + 37, { px: 11, color: PAL.textDim, maxW: 208 });
      if (si.repaired === true) {
        checkMark(ctx, sx + 22, sy + 66, 16);
        T(ctx, '已完工', sx + 36, sy + 67, { px: 14, bold: true, color: PAL.good });
      } else if (si.locked === true) {
        lockIcon(ctx, sx + 22, sy + 66, 18, PAL.textDim);
        T(ctx, '先打通通道', sx + 38, sy + 67, { px: 13, color: PAL.textDim });
      } else {
        costRow(ctx, si.cost, stock, sx + 12, sy + 67, { px: 15, icon: 18 });
        T(ctx, 'Z 修復', sx + 216, sy + 67, { px: 13, bold: true, align: 'right', color: (son && row === 1) ? PAL.gold : PAL.textDim });
      }
    }
    // 修復列下緣: 巢口怪物 + 巢母戰利品
    T(ctx, '巢口怪物', 734, 370, { px: 11, color: PAL.textDim });
    var nt = Array.isArray(s.nestTypes) ? s.nestTypes.slice(0, 4) : [];
    nt.forEach(function (m, i) { monsterHead(ctx, oneOf(m, ['boar', 'shield', 'bee', 'frog'], 'frog'), 806 + i * 30, 370); });
    T(ctx, '巢母戰利品', 960, 370, { px: 11, color: PAL.textDim });
    if (itemOf(s.trophy)) {
      ctx.save(); ctx.translate(1048, 370); ctx.scale(0.62, 0.62);
      drawItemIcon(ctx, { x: 0, y: 0, type: s.trophy });
      ctx.restore();
      T(ctx, ITEM_NAME[s.trophy], 1062, 370, { px: 11, color: PAL.text });
      if (s.trophyTaken === true) checkMark(ctx, 1056, 376, 11);
    }

    // ── 道具格列
    rowBox(ctx, 720, 396, 480, 120, row === 2);
    T(ctx, '道具格', 734, 410, { px: 13, bold: true, color: row === 2 ? PAL.gold : PAL.textDim });
    var slots = Array.isArray(s.slots) ? s.slots : [];
    var slotSel = clamp(Math.round(num(s.slotSel)), 0, 1);
    for (var z = 0; z < 2; z++) {
      var tp = itemOf(slots[z]);
      var zx = 728 + z * 236, zy = 422;
      var zon = z === slotSel;
      cellBox(ctx, zx, zy, 228, 86, zon, row === 2);
      T(ctx, (z + 1) + ' 號', zx + 10, zy + 13, { px: 11, color: PAL.textDim });
      if (tp) {
        drawItemIcon(ctx, { x: zx + 30, y: zy + 44, type: tp });
        T(ctx, ITEM_NAME[tp], zx + 54, zy + 34, { px: 14, bold: true });
        T(ctx, ITEM_EFFECT[tp], zx + 54, zy + 54, { px: 12, color: PAL.good, maxW: 168 });
      } else {
        rr(ctx, zx + 15, zy + 29, 30, 30, 6); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#4a5574'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
        T(ctx, '空', zx + 54, zy + 44, { px: 14, color: PAL.textMute });
      }
      if (zon) {
        var empty = !(Array.isArray(s.items) && s.items.length > 0);
        T(ctx, empty ? '尚無戰利品' : 'Z 換戰利品', zx + 218, zy + 75, { px: 12, bold: !empty, align: 'right', color: empty ? PAL.textMute : (row === 2 ? PAL.gold : PAL.textDim) });
      }
    }

    // ── 加速器列
    rowBox(ctx, 720, 526, 480, 80, row === 3);
    T(ctx, '回放加速器', 734, 540, { px: 13, bold: true, color: row === 3 ? PAL.gold : PAL.textDim });
    var lv = clamp(Math.round(num(s.accelLv)), 0, 2);
    var mult = ['×1', '×1.25', '×1.5'][lv];
    for (var g2 = 0; g2 < 2; g2++) {
      rr(ctx, 736 + g2 * 22, 560, 18, 18, 4);
      ctx.fillStyle = g2 < lv ? PAL.time : '#1c2436'; ctx.fill();
      ctx.strokeStyle = PAL.timeDark; ctx.lineWidth = 1.5; ctx.stroke();
    }
    T(ctx, '目前 ' + mult, 792, 570, { px: 16, bold: true, color: lv > 0 ? PAL.time : PAL.text });
    if (s.accelCost == null) {
      T(ctx, '已滿', 1186, 570, { px: 15, bold: true, align: 'right', color: PAL.textDim });
    } else {
      T(ctx, '下一級 ' + ['×1.25', '×1.5', '×1.5'][lv], 900, 570, { px: 13, color: PAL.textDim });
      costRow(ctx, s.accelCost, stock, 1010, 570, { px: 15, icon: 18 });
      T(ctx, 'Z 購買', 1186, 570, { px: 13, bold: true, align: 'right', color: row === 3 ? PAL.gold : PAL.textDim });
    }

    hint(ctx, '↑↓ 換列    ←→ 選擇    Z 確定    X 關閉', 60, 672);
    ctx.restore();
  }

  function drawSiteHighlight(ctx, state) {
    var s = st0(state);
    var x = num(s.x), y = num(s.y), w = clamp(num(s.w, 20), 0, 640), h = clamp(num(s.h, 20), 0, 360);
    if (s.active === false) return;
    ctx.save();
    var p = 0.55 + 0.45 * Math.sin(nowSec() * 5);
    ctx.fillStyle = 'rgba(255,207,74,' + (0.08 * p).toFixed(3) + ')'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#1a1200'; ctx.lineWidth = 5; ctx.strokeRect(x + 2.5, y + 2.5, Math.max(0, w - 5), Math.max(0, h - 5));
    ctx.strokeStyle = 'rgba(255,207,74,' + p.toFixed(2) + ')'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
    ctx.strokeRect(x + 2.5, y + 2.5, Math.max(0, w - 5), Math.max(0, h - 5));
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawUpgradePage(ctx, state) {
    var s = st0(state);
    var row = clamp(Math.round(num(s.row)), 0, 3);
    var stock = matSet(s.stock);
    ctx.save();
    panelBg(ctx, 40, 48, 1200, 640, true);
    anvil(ctx, 1170, 80, 0.6);
    T(ctx, '升級所', 60, 72, { px: 22, bold: true });
    // 招募列
    rowBox(ctx, 80, 110, 1120, 170, row === 0);
    T(ctx, '招募職業', 96, 126, { px: 14, bold: true, color: row === 0 ? PAL.gold : PAL.textDim });
    var rec = Array.isArray(s.recruits) ? s.recruits : [];
    var rsel = clamp(Math.round(num(s.recruitSel)), 0, 1);
    for (var i = 0; i < 2; i++) {
      var r = st0(rec[i]);
      var cls = clsOf(r.cls || ['hunter', 'bomber'][i]);
      var x0 = 96 + i * 548, y0 = 142;
      var on = i === rsel;
      cellBox(ctx, x0, y0, 540, 124, on, row === 0);
      clsIcon(ctx, cls, x0 + 56, y0 + 62, 32);
      T(ctx, CLS_NAME[cls], x0 + 104, y0 + 40, { px: 22, bold: true });
      T(ctx, '擅長: ' + CLS_GOOD[cls], x0 + 104, y0 + 70, { px: 14, color: PAL.textDim });
      if (r.owned === true) {
        checkMark(ctx, x0 + 420, y0 + 62, 18);
        T(ctx, '已招募', x0 + 436, y0 + 63, { px: 16, bold: true, color: PAL.good });
      } else {
        costRow(ctx, r.cost, stock, x0 + 104, y0 + 100, { px: 16, icon: 18 });
        if (on) T(ctx, 'Z 招募', x0 + 524, y0 + 100, { px: 15, bold: true, align: 'right', color: row === 0 ? PAL.gold : PAL.textDim });
      }
    }
    // 強化列
    var stats = Array.isArray(s.stats) ? s.stats : [];
    var DEF = {
      speed: { name: '移速', max: 3, fx: ['移速 +0%', '移速 +8%', '移速 +16%', '移速 +24%'] },
      hp: { name: '血量', max: 2, fx: ['血量 3', '血量 4', '血量 5'] },
      cd: { name: '技能冷卻', max: 3, fx: ['技能冷卻 -0%', '技能冷卻 -15%', '技能冷卻 -30%', '技能冷卻 -45%'] }
    };
    var KEYS = ['speed', 'hp', 'cd'];
    for (var j = 0; j < 3; j++) {
      var st = st0(stats[j]);
      var key = oneOf(st.key, KEYS, KEYS[j]);
      var d = DEF[key];
      var maxLv = clamp(Math.round(num(st.maxLv, d.max)), 1, 6);
      var lv = clamp(Math.round(num(st.lv)), 0, maxLv);
      var ry = 300 + j * 110;
      var ron = row === j + 1;
      rowBox(ctx, 80, ry, 1120, 100, ron);
      T(ctx, d.name, 100, ry + 50, { px: 22, bold: true, color: ron ? PAL.gold : PAL.text });
      for (var b = 0; b < maxLv; b++) {
        rr(ctx, 230 + b * 34, ry + 38, 28, 24, 5);
        ctx.fillStyle = b < lv ? PAL.core : '#1c2436'; ctx.fill();
        ctx.strokeStyle = b < lv ? PAL.coreDark : '#3a4562'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      T(ctx, '目前', 380, ry + 34, { px: 12, color: PAL.textDim });
      T(ctx, d.fx[Math.min(lv, d.fx.length - 1)], 380, ry + 60, { px: 18, bold: true });
      if (st.cost == null || lv >= maxLv) {
        T(ctx, '已滿', 1180, ry + 50, { px: 18, bold: true, align: 'right', color: PAL.textDim });
      } else {
        T(ctx, '下一級', 620, ry + 34, { px: 12, color: PAL.textDim });
        T(ctx, '→ ' + d.fx[Math.min(lv + 1, d.fx.length - 1)], 620, ry + 60, { px: 18, bold: true, color: PAL.good });
        costRow(ctx, st.cost, stock, 900, ry + 50, { px: 18, icon: 20 });
        if (ron) T(ctx, 'Z 升級', 1180, ry + 50, { px: 15, bold: true, align: 'right', color: PAL.gold });
      }
    }
    hint(ctx, '↑↓ 換列    ←→ 選擇    Z 招募 / 升級    X 關閉', 60, 672);
    ctx.restore();
  }

  function drawResultPanel(ctx, state) {
    var s = st0(state);
    var x = 280, y = 150;
    var first = s.oldTime == null;
    ctx.save();
    rr(ctx, x + 1.5, y + 1.5, 717, 417, 16); ctx.fillStyle = PAL.panel; ctx.fill();
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; ctx.stroke();
    T(ctx, '過關', x + 360, y + 40, { px: 32, bold: true, align: 'center', color: PAL.gold });
    var run = matSet(s.run);
    // 這趟拿到的素材
    T(ctx, '這趟拿到', x + 40, y + 84, { px: 13, color: PAL.textDim });
    KINDS.forEach(function (k, i) {
      var rx = x + 120 + i * 100;
      matIcon(ctx, k, rx, y + 84, 20);
      T(ctx, intStr(run[k]), rx + 14, y + 85, { px: 18, bold: true, color: run[k] > 0 ? PAL.text : PAL.textMute });
    });
    var it = itemOf(s.item);
    if (it) {
      drawItemIcon(ctx, { x: x + 560, y: y + 84, type: it });
      T(ctx, '獲得 ' + ITEM_NAME[it], x + 582, y + 85, { px: 15, bold: true, color: PAL.gold, maxW: 130 });
    }
    var rates = matSet(s.rates);
    if (first) {
      rr(ctx, x + 160, y + 120, 400, 210, 10); ctx.fillStyle = '#141a26'; ctx.fill();
      clsIcon(ctx, s.cls, x + 200, y + 152, 14);
      T(ctx, CLS_NAME[clsOf(s.cls)] + '  ' + f1(s.time) + ' 秒', x + 222, y + 152, { px: 18, bold: true });
      T(ctx, '每分鐘產量', x + 184, y + 186, { px: 12, color: PAL.textDim });
      KINDS.forEach(function (k, i) {
        var ry = y + 214 + i * 28;
        matIcon(ctx, k, x + 196, ry, 18);
        T(ctx, KIND_NAME[k], x + 214, ry + 1, { px: 14, color: PAL.textDim });
        T(ctx, f1(rates[k]) + ' /分', x + 520, ry + 1, { px: 16, bold: true, align: 'right', color: rates[k] > 0 ? PAL.text : PAL.textMute });
      });
      T(ctx, '已存成回放', x + 360, y + 352, { px: 16, bold: true, align: 'center', color: PAL.good });
      T(ctx, 'Z 回大地圖', x + 360, y + 390, { px: 16, bold: true, align: 'center', color: PAL.gold });
    } else {
      var old = matSet(s.oldRates);
      var cols = [{ lab: '這一趟', cls: s.cls, time: s.time, r: rates, cx: x + 360 }, { lab: '目前回放', cls: s.oldCls, time: s.oldTime, r: old, cx: x + 560 }];
      cols.forEach(function (c) {
        T(ctx, c.lab, c.cx, y + 126, { px: 16, bold: true, align: 'center', color: c.lab === '這一趟' ? PAL.gold : PAL.text });
        clsIcon(ctx, c.cls, c.cx - 46, y + 156, 11);
        T(ctx, f1(c.time) + ' 秒', c.cx - 30, y + 157, { px: 16, bold: true });
      });
      T(ctx, '每分鐘產量', x + 60, y + 156, { px: 12, color: PAL.textDim });
      KINDS.forEach(function (k, i) {
        var ry = y + 196 + i * 34;
        rr(ctx, x + 50, ry - 14, 620, 28, 6); ctx.fillStyle = i % 2 ? '#161d2a' : '#1b2333'; ctx.fill();
        matIcon(ctx, k, x + 72, ry, 18);
        T(ctx, KIND_NAME[k], x + 90, ry + 1, { px: 14, color: PAL.textDim });
        var a = rates[k], b = old[k];
        [[a, b, x + 360], [b, a, x + 560]].forEach(function (v) {
          var higher = v[0] > v[1] + 1e-9;
          if (higher) { rr(ctx, v[2] - 60, ry - 12, 120, 24, 6); ctx.fillStyle = 'rgba(107,224,138,0.18)'; ctx.fill(); }
          T(ctx, f1(v[0]) + (higher ? ' ▲' : ''), v[2], ry + 1, { px: 16, bold: higher, align: 'center', color: higher ? PAL.good : (v[0] > 0 ? PAL.text : PAL.textMute) });
        });
      });
      T(ctx, 'Z 採用這一趟      X 保留舊的', x + 360, y + 380, { px: 17, bold: true, align: 'center', color: PAL.gold });
    }
    ctx.restore();
  }

  function drawFailPanel(ctx) {
    ctx.save();
    rr(ctx, 381.5, 241.5, 517, 237, 16); ctx.fillStyle = '#24161a'; ctx.fill();
    ctx.strokeStyle = PAL.danger; ctx.lineWidth = 3; ctx.stroke();
    T(ctx, '失敗', 640, 316, { px: 40, bold: true, align: 'center', color: PAL.danger });
    T(ctx, '這趟的素材不入帳', 640, 366, { px: 14, align: 'center', color: PAL.textDim });
    T(ctx, 'Z 重來      X 回大地圖', 640, 424, { px: 18, bold: true, align: 'center', color: PAL.text });
    ctx.restore();
  }

  function drawPausePanel(ctx, state) {
    var s = st0(state);
    var lvl = s.mode === 'level';
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,14,0.6)'; ctx.fillRect(0, 0, W, H);
    rr(ctx, 381, 221, 518, 278, 16); ctx.fillStyle = PAL.panel; ctx.fill();
    ctx.strokeStyle = PAL.edge; ctx.lineWidth = 2; ctx.stroke();
    // 暫停符號
    ctx.fillStyle = PAL.text; rr(ctx, 612, 262, 14, 44, 3); ctx.fill(); rr(ctx, 654, 262, 14, 44, 3); ctx.fill();
    T(ctx, '暫停', 640, 346, { px: 30, bold: true, align: 'center' });
    if (lvl) {
      T(ctx, 'Esc 繼續    Z 重來    X 回大地圖', 640, 410, { px: 17, bold: true, align: 'center', color: PAL.gold });
      T(ctx, '回大地圖這趟作廢', 640, 446, { px: 13, align: 'center', color: PAL.textDim });
    } else {
      T(ctx, 'Esc 繼續', 640, 410, { px: 18, bold: true, align: 'center', color: PAL.gold });
    }
    ctx.restore();
  }

  function drawEndingPanel(ctx, state) {
    var s = st0(state);
    var tt = Math.max(0, Math.floor(clamp(num(s.totalTime), 0, 3600 * 999)));
    var m = Math.floor(tt / 60), sec = tt % 60;
    ctx.save();
    rr(ctx, 282, 152, 716, 416, 16); ctx.fillStyle = '#211a2c'; ctx.fill();
    ctx.strokeStyle = PAL.gold; ctx.lineWidth = 4; ctx.stroke();
    palace(ctx, 640, 270, 1.8, true);
    T(ctx, '獵王殿落成', 640, 380, { px: 40, bold: true, align: 'center', color: PAL.gold });
    T(ctx, '總遊玩時間  ' + m + ':' + (sec < 10 ? '0' : '') + sec, 640, 440, { px: 20, align: 'center' });
    T(ctx, 'Z 重新開始', 640, 510, { px: 18, bold: true, align: 'center', color: PAL.gold });
    ctx.restore();
  }

  // ───────────────────────── 說明頁示意圖 ─────────────────────────
  // 只畫在 (x,y,w,h) 內; 頁標題、說明文字、頁碼、翻頁提示由 RD 畫
  var GUIDE_VIRTUAL = [[800, 450], [600, 220], [480, 300], [560, 240], [560, 240]];

  function guideFrame(ctx, st, page) {
    var vw = GUIDE_VIRTUAL[page][0], vh = GUIDE_VIRTUAL[page][1];
    var bx = num(st.x), by = num(st.y), bw = Math.max(1, num(st.w, vw)), bh = Math.max(1, num(st.h, vh));
    var k = Math.min(bw / vw, bh / vh);
    return { k: k, ox: bx + (bw - vw * k) / 2, oy: by + (bh - vh * k) / 2, bx: bx, by: by, bw: bw, bh: bh };
  }
  // 虛擬座標 → 畫布座標(標籤 / 鍵帽在外層以原尺寸畫)
  function gp(fr, vx, vy) { return [fr.ox + vx * fr.k, fr.oy + vy * fr.k]; }
  function inV(ctx, fr, fn) { ctx.save(); ctx.translate(fr.ox, fr.oy); ctx.scale(fr.k, fr.k); fn(); ctx.restore(); }
  function clipRect(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  function tag(ctx, s, x, y, col) {
    ctx.font = font(14, true);
    var tw = ctx.measureText(s).width;
    rr(ctx, x - tw / 2 - 6, y - 11, tw + 12, 22, 6); ctx.fillStyle = 'rgba(12,16,24,0.85)'; ctx.fill();
    ctx.strokeStyle = col || '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    T(ctx, s, x, y + 1, { px: 14, bold: true, align: 'center', color: col || '#ffffff' });
  }
  function routeLine(ctx, pts, col, lw) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) { if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]); else ctx.lineTo(pts[i][0], pts[i][1]); }
    ctx.strokeStyle = 'rgba(10,12,20,0.7)'; ctx.lineWidth = lw + 3; ctx.setLineDash([]); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash([lw * 3, lw * 2.2]); ctx.stroke();
    ctx.setLineDash([]);
    var a = pts[pts.length - 1], b = pts[pts.length - 2];
    var ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(a[0] + Math.cos(ang) * lw * 2.5, a[1] + Math.sin(ang) * lw * 2.5);
    ctx.lineTo(a[0] + Math.cos(ang + 2.5) * lw * 3, a[1] + Math.sin(ang + 2.5) * lw * 3);
    ctx.lineTo(a[0] + Math.cos(ang - 2.5) * lw * 3, a[1] + Math.sin(ang - 2.5) * lw * 3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function groundRow(ctx, c0, c1, row, theme, top) {
    for (var c = c0; c <= c1; c++) drawGround(ctx, { x: c * 40 + 20, y: row * 40 + 20, top: top, theme: theme });
  }

  // 第 1 頁: 衝到終點(第 1 關草原縮小版)
  function guidePage0(ctx, fr) {
    inV(ctx, fr, function () {
      ctx.save(); clipRect(ctx, 0, 0, 800, 450);
      drawBackground(ctx);
      groundRow(ctx, 0, 19, 9, 'plain', true);
      groundRow(ctx, 0, 19, 10, 'plain', false);
      drawPickup(ctx, { x: 260, y: 342, kind: 'wood', t: 0 });
      drawBoar(ctx, { x: 450, y: 344, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
      drawGoal(ctx, { x: 720, y: 320, reached: false });
      drawPlayer(ctx, { x: 70, y: 338, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1, invuln: false });
      routeLine(ctx, [[96, 336], [180, 336], [258, 336], [330, 336], [380, 300], [450, 268], [520, 300], [570, 336], [690, 336]], '#ffffff', 4);
      ctx.restore();
    });
    var p = gp(fr, 70, 300);
    tag(ctx, '你', p[0], p[1] - 4, PAL.sword);
    var g = gp(fr, 720, 270);
    tag(ctx, '終點旗', g[0], g[1] - 6, PAL.gold);
  }

  // 第 2 頁: 操作四格
  function guidePage1(ctx, fr) {
    var cellW = 150, gs = 1.2;
    var labels = [['←', '→'], ['空白鍵'], ['Z'], ['X']];
    for (var i = 0; i < 4; i++) {
      (function (i) {
        inV(ctx, fr, function () {
          ctx.save();
          ctx.translate(i * cellW, 0);
          rr(ctx, 4, 4, cellW - 8, 212, 10); ctx.save(); ctx.clip();
          ctx.save(); ctx.scale(gs, gs);
          drawBackground(ctx);
          groundRow(ctx, 0, 3, 4, 'plain', true);
          var pl = { x: 52, y: 138, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false };
          if (i === 0) { pl.pose = 'run'; pl.poseT = 0.1; }
          if (i === 1) { pl.pose = 'rise'; pl.y = 92; }
          if (i === 2) { pl.x = 32; pl.pose = 'slash'; pl.poseT = 0.05; }
          if (i === 3) {
            drawPoof(ctx, { x: 46, y: 146, t: 0.12, dur: 0.3, big: false });
            pl.x = 96; pl.pose = 'dash'; pl.poseT = 0.1;
          }
          if (i === 1) {
            ctx.save(); ctx.globalAlpha = 0.25;
            drawPlayer(ctx, { x: 52, y: 138, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
            ctx.restore();
          }
          drawPlayer(ctx, pl);
          ctx.restore();
          ctx.restore();
          rr(ctx, 4, 4, cellW - 8, 212, 10); ctx.strokeStyle = '#3a4560'; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        });
        // 鍵帽(外層原尺寸, 貼在做動作的劍士上方)
        var px = [52, 52, 32, 96][i], py = [138, 92, 138, 138][i];
        var c = gp(fr, i * cellW + px * gs, (py - 22) * gs - 24);
        if (labels[i].length === 2) { keycap(ctx, labels[i][0], c[0] - 16, c[1], 26); keycap(ctx, labels[i][1], c[0] + 16, c[1], 26); }
        else keycap(ctx, labels[i][0], c[0] + (i === 3 ? -8 : 0), c[1], 26);
      })(i);
    }
  }

  // 第 3 頁: 過關後一直重播(縮圖為局部放大)
  function guidePage2(ctx, fr) {
    var cardX = 40, cardY = 118, ck = 1.25;
    var thX = cardX + 8 * ck, thY = cardY + 8 * ck, tk = 0.4 * ck; // 縮圖內局部放大倍率
    var pickV = [thX + 175 * tk, thY + 140 * tk];
    var bez = function (t) {
      var p0 = pickV, p1 = [250, 10], p2 = [36, 20];
      var u = 1 - t;
      return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
    };
    inV(ctx, fr, function () {
      ctx.save(); clipRect(ctx, 0, 0, 480, 300);
      // 頂端資訊列的木材格
      rr(ctx, 6, 2, 240, 36, 8); ctx.fillStyle = 'rgba(10,14,22,0.92)'; ctx.fill();
      ctx.strokeStyle = '#3a4560'; ctx.lineWidth = 1.5; ctx.stroke();
      matIcon(ctx, 'wood', 36, 20, 22);
      // 卡片
      ctx.save(); ctx.translate(cardX, cardY); ctx.scale(ck, ck);
      drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '草原', state: 'cleared', cost: {}, stock: {}, canAfford: false, rates: { wood: 14.2, iron: 3.0, time: 2.0, core: 4.1 }, recordCls: 'sword', recordTime: 12.6, repairedCount: 0 });
      ctx.restore();
      ctx.save(); clipRect(ctx, thX, thY, 160 * ck, 90 * ck);
      ctx.translate(thX, thY); ctx.scale(tk, tk);
      ctx.save(); ctx.translate(-200, -150); drawBackground(ctx); ctx.restore();
      groundRow(ctx, 0, 9, 4, 'plain', true);
      groundRow(ctx, 0, 9, 5, 'plain', false);
      drawBoar(ctx, { x: 330, y: 144, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
      drawPlayer(ctx, { x: 150, y: 138, cls: 'sword', facing: 1, pose: 'run', poseT: 0.2, invuln: false });
      circle(ctx, 175, 140, 14); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke(); // 撿到的那一刻
      ctx.restore();
      ctx.save(); ctx.translate(cardX, cardY); ctx.scale(ck, ck);
      drawCardOverlay(ctx, { x: 0, y: 0, accelLv: 0, newArea: false, selected: false });
      ctx.restore();
      // 弧線軌跡 + 飛行中的木材
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
      ctx.beginPath();
      for (var i = 0; i <= 24; i++) { var q = bez(i / 24); if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
      ctx.stroke(); ctx.setLineDash([]);
      var m = bez(0.55);
      drawFlyingMaterial(ctx, { x: m[0], y: m[1], kind: 'wood', t: 0.38, dur: 0.7 });
      ctx.restore();
    });
    // 資訊列的數字: 12 → 13(外層原尺寸)
    var a = gp(fr, 56, 20);
    T(ctx, '12', a[0], a[1], { px: 18, bold: true, color: PAL.textDim });
    T(ctx, '→', a[0] + 30, a[1], { px: 18, bold: true, color: PAL.textDim });
    T(ctx, '13', a[0] + 56, a[1], { px: 22, bold: true, color: '#ffffff', outline: PAL.goldDark, outlineW: 3 });
  }

  // 第 4 頁: 撿多還是跑快(同一關並排兩張, 路線不同)
  function miniLevel(ctx) {
    drawBackground(ctx);
    groundRow(ctx, 0, 15, 9, 'plain', true);
    groundRow(ctx, 0, 15, 10, 'plain', false);
    drawGround(ctx, { x: 220, y: 340, top: true, theme: 'plain' });   // 1 格台階(頂 320)
    groundRow(ctx, 6, 10, 6, 'plain', true);                          // 懸空平台(頂 240, 底 280; 離地淨空 80)
    drawPickup(ctx, { x: 140, y: 342, kind: 'wood', t: 0 });
    drawPickup(ctx, { x: 290, y: 224, kind: 'wood', t: 0 });
    drawPickup(ctx, { x: 410, y: 224, kind: 'time', t: 0 });
    drawPickup(ctx, { x: 330, y: 224, kind: 'iron', t: 0 });
    drawFrog(ctx, { x: 370, y: 226, facing: -1, state: 'crouch', hit: false, brood: false });
    drawGoal(ctx, { x: 590, y: 320, reached: false });
    drawPlayer(ctx, { x: 50, y: 338, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
  }
  function guidePage3(ctx, fr) {
    var gsc = 270 / 640;
    var routes = [
      [[70, 336], [140, 336], [196, 300], [222, 292], [256, 236], [290, 216], [330, 216], [370, 200], [410, 216], [450, 216], [480, 280], [500, 336], [570, 336]],
      [[70, 336], [140, 336], [188, 300], [222, 290], [256, 336], [440, 336], [570, 336]]
    ];
    var labs = ['素材多 / 秒數長', '素材少 / 秒數短'];
    for (var i = 0; i < 2; i++) {
      (function (i) {
        var cx = i * 290;
        inV(ctx, fr, function () {
          ctx.save(); ctx.translate(cx, 0);
          rr(ctx, 0, 0, 270, 190, 8); ctx.save(); ctx.clip();
          ctx.save(); ctx.translate(0, -60 * gsc); ctx.scale(gsc, gsc);
          miniLevel(ctx);
          routeLine(ctx, routes[i], i === 0 ? '#ffcf4a' : '#ffffff', 5);
          ctx.restore();
          ctx.restore();
          rr(ctx, 0, 0, 270, 190, 8); ctx.strokeStyle = '#3a4560'; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        });
        var p = gp(fr, cx + 135, 216);
        T(ctx, labs[i], p[0], p[1], { px: 15, bold: true, align: 'center', color: i === 0 ? PAL.gold : '#ffffff' });
      })(i);
    }
  }

  // 第 5 頁: 打通巢穴(左: 亂石堵住、巢口沉睡; 右: 通道打通、湧出巢穴跳蛙)
  var LAIR_OPEN = { '3,3': 1, '3,4': 1, '4,3': 1, '4,4': 1, '4,5': 1, '5,4': 1, '5,5': 1, '5,6': 1 };
  var LAIR_RUBBLE = ['4,3', '4,4', '4,5', '5,4', '5,5', '5,6'];
  function lairOpen(r, c) {
    if (r < 3) return true;
    if (LAIR_OPEN[r + ',' + c]) return true;
    if (r >= 6 && r <= 8 && c >= 5 && c <= 12) return true; // 通道底段 + 巢穴室
    return false;
  }
  function lairScene(ctx, opened) {
    drawBackground(ctx);
    drawLairBack(ctx, { x: 120, y: 160, w: 160, h: 80 });
    drawLairBack(ctx, { x: 200, y: 240, w: 320, h: 120 });
    for (var r = 3; r <= 12; r++) {
      for (var c = 0; c <= 12; c++) {
        if (lairOpen(r, c)) continue;
        var top = lairOpen(r - 1, c);
        // 主路(第 3 列)= 草原; 地下貼著巢穴空間的格 = 巢穴; 其餘地底 = 草原內部
        var touch = r >= 4 && (lairOpen(r - 1, c) || lairOpen(r + 1, c) || lairOpen(r, c - 1) || lairOpen(r, c + 1));
        drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: top, theme: touch ? 'lair' : 'plain' });
      }
    }
    if (!opened) LAIR_RUBBLE.forEach(function (k) { var p = k.split(','); drawCaveRubble(ctx, { x: (+p[1]) * 40 + 20, y: (+p[0]) * 40 + 20 }); });
    drawNest(ctx, opened ? { x: 470, y: 336, state: 'idle', spawnT: 0.12, spawnDur: 0.4, left: 4 } : { x: 470, y: 336, state: 'dormant', spawnT: 0.4, spawnDur: 0.4, left: 0 });
    if (opened) drawFrog(ctx, { x: 410, y: 346, facing: -1, state: 'crouch', hit: false, brood: true });
  }
  function guidePage4(ctx, fr) {
    var gsc = 250 / 520;
    for (var i = 0; i < 2; i++) {
      (function (i) {
        var cx = i * 310;
        inV(ctx, fr, function () {
          ctx.save(); ctx.translate(cx, 0);
          rr(ctx, 0, 0, 250, 240, 8); ctx.save(); ctx.clip();
          ctx.save(); ctx.translate(0, -20 * gsc); ctx.scale(gsc, gsc);
          lairScene(ctx, i === 1);
          ctx.restore();
          ctx.restore();
          rr(ctx, 0, 0, 250, 240, 8); ctx.strokeStyle = i === 1 ? PAL.brood : '#3a4560'; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        });
      })(i);
    }
    // 中間箭頭
    inV(ctx, fr, function () {
      ctx.fillStyle = PAL.gold;
      ctx.beginPath(); ctx.moveTo(258, 112); ctx.lineTo(284, 112); ctx.lineTo(284, 100); ctx.lineTo(304, 120); ctx.lineTo(284, 140); ctx.lineTo(284, 128); ctx.lineTo(258, 128); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    // 左格角落: 鐵礦圖示(外層原尺寸)
    var c = gp(fr, 0, 240);
    rr(ctx, c[0] + 6, c[1] - 36, 30, 30, 7); ctx.fillStyle = 'rgba(12,16,24,0.9)'; ctx.fill();
    ctx.strokeStyle = PAL.iron; ctx.lineWidth = 1.5; ctx.stroke();
    matIcon(ctx, 'iron', c[0] + 21, c[1] - 21, 20);
  }

  function drawGuidePage(ctx, state) {
    var s = st0(state);
    var page = clamp(Math.round(num(s.page)), 0, 4);
    var fr = guideFrame(ctx, s, page);
    ctx.save();
    clipRect(ctx, fr.bx, fr.by, fr.bw, fr.bh);
    if (page === 0) guidePage0(ctx, fr);
    else if (page === 1) guidePage1(ctx, fr);
    else if (page === 2) guidePage2(ctx, fr);
    else if (page === 3) guidePage3(ctx, fr);
    else guidePage4(ctx, fr);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: PAL,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawLairBack: drawLairBack,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawCaveRubble: drawCaveRubble,
    drawAltarGate: drawAltarGate,
    drawNest: drawNest,
    drawHookRing: drawHookRing,
    drawPickup: drawPickup,
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
