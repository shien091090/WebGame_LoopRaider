/* 介面風格 方案 B — 工程藍圖
 * 方向: 把「連環工程」做成施工圖紙。面板是切角深藍圖紙(16px 細格 + 雙線框 + 角落刻度), 數字一律等寬字、像儀表讀數; 列有編號(01 職業、02 工程…)。
 * 選中 = 整格反白成實心黃、字變深色 + 外側四個角括號; 非作用列的選中只留白色角括號。列被選中時左側一條黃色實心條。
 * 錢不夠 = 數字變紅並寫成「花費/持有」(例 30/17), 整段壓紅色斜線底; 動作章變紅色虛線框「XX不足」。
 * 只用 Canvas 2D; 素材 / 職業圖示沿用底版造型, 道具圖示與角色呼叫底版 Art。圖紙上的引線註記只用於方案頁說明, 遊戲內不畫。
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var ART = window.Art || {};
  var PAL = ART.palette || {};
  function C(k, d) { return PAL[k] || d; }
  var KINDS = ['wood', 'stone', 'time', 'soul'];
  var KIND_USE = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var KIND_DARK = { wood: '#7a4a1e', stone: '#4c5562', time: '#127a8c', soul: '#8e2a80' };
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var ITEM_NAME = { bagWood: '木材袋', bagStone: '石料袋', bagTime: '時晶袋', soulLamp: '魂燈', glove: '拾荒手套', horn: '獵人號角', heart: '巢母之心' };
  var ITEM_FX = { bagWood: '每次通關 +4 木材', bagStone: '每次通關 +3 石料', bagTime: '每次通關 +2 時晶', soulLamp: '每次通關 +2 獸魂', glove: '撿到的素材 +1', horn: '打倒怪物掉落 ×2', heart: '打倒怪物掉落 ×2、通關 +4 獸魂' };

  // 範例資料(整張方案圖共用同一組持有數, 花費不足的判斷都對它)
  var STOCK = { wood: 38, stone: 42, time: 17, soul: 9 };
  var RATE = { wood: 12.4, stone: 5.0, time: 2.1, soul: 0.8 };
  var RUN = { wood: 5, stone: 2, time: 0, soul: 3 };

  // ---------- 共用小工具 ----------
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
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
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || 'rgba(20,12,6,0.95)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }

  // 素材圖示: 沿用底版造型(全遊戲一個長相)
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
  function clsIcon(ctx, cls, cx, cy, sz) {
    var k = sz / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    circle(ctx, 0, 0, 9.2); ctx.fillStyle = C(cls, '#3d8bfd'); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (cls === 'sword') { ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(4.5, -4.5); ctx.moveTo(-5, 1); ctx.lineTo(-1, 5); ctx.stroke(); }
    else if (cls === 'hunter') { ctx.beginPath(); ctx.arc(-2, 0, 5.5, -1.2, 1.2); ctx.stroke(); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(5, 0); ctx.stroke(); }
    else { circle(ctx, -0.5, 1.5, 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(4, -5); ctx.lineWidth = 1.4; ctx.stroke(); }
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
  function itemIcon(ctx, type, x, y, size) { if (ART.drawItemIcon) ART.drawItemIcon(ctx, { x: x, y: y, type: type, size: size }); }
  function hero(ctx, cls, x, y, k, alpha) {
    if (!ART.drawPlayer) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); if (alpha < 1) ctx.globalAlpha *= alpha;
    ART.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'idle', poseT: 0, invuln: false });
    ctx.restore();
  }
  function heartShape(ctx, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, 0, -7, -7, -3, -6); ctx.quadraticCurveTo(-1, -6, 0, -3); ctx.quadraticCurveTo(1, -6, 3, -6); ctx.bezierCurveTo(7, -7, 9, 0, 0, 6); ctx.closePath();
    ctx.restore();
  }
  function speaker(ctx, cx, cy, s, on, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    poly(ctx, [-8, -3, -4, -3, 1, -8, 1, 8, -4, 3, -8, 3]); ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (on) { ctx.beginPath(); ctx.arc(2, 0, 4.5, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(2, 0, 8, -0.9, 0.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(10, 4); ctx.moveTo(10, -4); ctx.lineTo(4, 4); ctx.stroke(); }
    ctx.restore();
  }
  // 關卡縮圖(示意: 主題地形 + 小角色 + 素材點), 160×90 內
  function thumb(ctx, x, y, w, h, theme, seed, withHero) {
    var th = (ART.themes && ART.themes[theme]) || { top: '#63c35a', inner: '#7b5a3c' };
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, C('bg', '#1a2233')); g.addColorStop(1, C('bgLow', '#273149'));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    var c = w / 32;
    for (var i = 0; i < 32; i++) {
      var hh = Math.round(3 + 1.6 * Math.sin(i * 0.42 + seed) + (i > 20 ? 2 : 0));
      var gy = y + h - hh * c;
      ctx.fillStyle = th.inner; ctx.fillRect(x + i * c, gy, c + 0.6, hh * c);
      ctx.fillStyle = th.top; ctx.fillRect(x + i * c, gy, c + 0.6, Math.max(1.5, c * 0.35));
    }
    ctx.fillStyle = th.inner; ctx.fillRect(x + w * 0.38, y + h * 0.36, w * 0.18, c);
    ctx.fillStyle = th.top; ctx.fillRect(x + w * 0.38, y + h * 0.36, w * 0.18, 1.5);
    var dots = [[0.3, 0.55, 'wood'], [0.47, 0.3, 'time'], [0.62, 0.5, 'stone']];
    for (i = 0; i < dots.length; i++) matIcon(ctx, dots[i][2], x + w * dots[i][0], y + h * dots[i][1], 9);
    // 終點旗
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + w * 0.92, y + h * 0.3, 1.5, h * 0.25);
    poly(ctx, [x + w * 0.92 + 1.5, y + h * 0.3, x + w * 0.92 + 9, y + h * 0.34, x + w * 0.92 + 1.5, y + h * 0.38]); ctx.fillStyle = C('goal', '#ffd23f'); ctx.fill();
    if (withHero) {
      var hx = x + w * 0.22, hy = y + h * 0.58;
      rr(ctx, hx - 3, hy - 5, 7, 10, 1.5); ctx.fillStyle = C(withHero, '#3d8bfd'); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
    ctx.restore();
  }
  function goalFlag(ctx, x, groundY, k) {
    ctx.save(); ctx.translate(x, groundY); ctx.scale(k, k);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -78, 4, 78);
    ctx.lineJoin = 'round';
    poly(ctx, [2, -76, 34, -66, 2, -54]); ctx.fillStyle = C('goal', '#ffd23f'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a2a00'; ctx.stroke();
    star(ctx, 13, -65, 5, 5); ctx.fillStyle = '#e5484d'; ctx.fill();
    circle(ctx, 0, -80, 3.5); ctx.fillStyle = C('gold', '#f2c94c'); ctx.fill();
    ctx.restore();
  }
  // 工程角色符號(捷徑雙箭頭 / 寶區寶箱 / 巢穴爪印), 跟關卡內工程牌同一套
  function roleMark(ctx, role, cx, cy, k, dim) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var col = dim ? '#8a8678' : (role === 'shortcut' ? C('shortcut', '#43d3ff') : role === 'treasure' ? C('treasure', '#ffc83d') : C('nestRole', '#c264ff'));
    circle(ctx, 0, 0, 13); ctx.fillStyle = dim ? '#5a564c' : '#2a2018'; ctx.fill();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    if (role === 'shortcut') { ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-1, 0); ctx.lineTo(-7, 6); ctx.moveTo(1, -6); ctx.lineTo(7, 0); ctx.lineTo(1, 6); ctx.stroke(); }
    else if (role === 'treasure') { rr(ctx, -8, -4, 16, 10, 2); ctx.fill(); ctx.fillStyle = '#2a2018'; ctx.fillRect(-8, -1, 16, 1.5); ctx.fillRect(-1, -2, 2, 4); }
    else { ctx.lineWidth = 2.6; for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5 - 2, -7); ctx.lineTo(i * 5 + 2, 7); ctx.stroke(); } }
    ctx.restore();
  }

  // ---------- 方案 B 的造型語言: 工程藍圖 ----------
  var MONO = '"Consolas","Menlo","Courier New","Microsoft JhengHei",monospace';
  var K = {
    sheet: '#0d2440', sheetHi: '#11305a', grid: 'rgba(95,184,255,0.10)', line: '#5fb8ff', lineDim: '#2f6aa0', tick: '#a9dcff',
    cell: '#10294a', cellHi: '#163a66', txt: '#e6f3ff', dim: '#7fa8cf', sel: '#ffd84a', selInk: '#0b1d33',
    red: '#ff5a64', redDeep: '#b0102a', good: '#4fd18b'
  };
  function mtext(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + MONO; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function mtw(ctx, s, px, bold) { ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + MONO; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px * 0.6; }
  // 切角矩形
  function cham(ctx, x, y, w, h, c) {
    ctx.beginPath();
    ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath();
  }
  // 圖紙面板: 深藍底 + 16px 細格 + 雙線外框 + 角落刻度
  function sheet(ctx, x, y, w, h, title, lineCol) {
    ctx.save();
    cham(ctx, x, y, w, h, 12); ctx.fillStyle = K.sheet; ctx.fill();
    ctx.save(); cham(ctx, x, y, w, h, 12); ctx.clip();
    ctx.strokeStyle = K.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (var gx = x + 16; gx < x + w; gx += 16) { ctx.moveTo(gx + 0.5, y); ctx.lineTo(gx + 0.5, y + h); }
    for (var gy = y + 16; gy < y + h; gy += 16) { ctx.moveTo(x, gy + 0.5); ctx.lineTo(x + w, gy + 0.5); }
    ctx.stroke(); ctx.restore();
    cham(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 12); ctx.lineWidth = 1.5; ctx.strokeStyle = lineCol || K.line; ctx.stroke();
    cham(ctx, x + 4.5, y + 4.5, w - 9, h - 9, 9); ctx.lineWidth = 1; ctx.strokeStyle = K.lineDim; ctx.stroke();
    if (title) {
      var tw2 = tw(ctx, title, 15, true) + 24;
      ctx.fillStyle = lineCol || K.line; poly(ctx, [x + 14, y, x + 14 + tw2, y, x + 14 + tw2 - 8, y + 22, x + 14, y + 22]); ctx.fill();
      text(ctx, title, x + 24, y + 11.5, 15, K.selInk, 'left', true);
    }
    ctx.restore();
  }
  // 格子: sel = 'hot'(作用列選中: 反白實心黃 + 外側角括號) / 'cold'(非作用列選中: 白色角括號) / null
  // look: 'normal' / 'dim' / 'done' / 'fog'; 回傳此格是否反白(字要改深色)
  function cell(ctx, x, y, w, h, sel, look) {
    ctx.save();
    var inv = sel === 'hot';
    ctx.fillStyle = inv ? K.sel : look === 'dim' ? '#0a1a2e' : look === 'done' ? '#0f3a30' : look === 'fog' ? '#2a3442' : K.cell;
    ctx.fillRect(x, y, w, h);
    if (look === 'dim') { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.strokeStyle = 'rgba(127,168,207,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); for (var d = -h; d < w; d += 8) { ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); } ctx.stroke(); ctx.restore(); }
    ctx.lineWidth = 1; ctx.strokeStyle = inv ? K.sel : look === 'done' ? '#2f8f6a' : K.lineDim; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (sel) brackets(ctx, x, y, w, h, inv ? K.sel : '#ffffff', inv ? 3 : 2);
    ctx.restore();
    return inv;
  }
  function brackets(ctx, x, y, w, h, col, lw) {
    var o = 5, L = 12;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(x - o, y - o + L); ctx.lineTo(x - o, y - o); ctx.lineTo(x - o + L, y - o);
    ctx.moveTo(x + w + o - L, y - o); ctx.lineTo(x + w + o, y - o); ctx.lineTo(x + w + o, y - o + L);
    ctx.moveTo(x + w + o, y + h + o - L); ctx.lineTo(x + w + o, y + h + o); ctx.lineTo(x + w + o - L, y + h + o);
    ctx.moveTo(x - o + L, y + h + o); ctx.lineTo(x - o, y + h + o); ctx.lineTo(x - o, y + h + o - L);
    ctx.stroke(); ctx.restore();
  }
  // 線框鍵帽; hot = 實心黃(此刻按得下去)
  function key(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.7, mtw(ctx, label, px, true) + px * 0.9), h = px * 1.6;
    ctx.save();
    ctx.fillStyle = hot ? K.sel : 'rgba(11,29,51,0.9)'; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.lineWidth = 1.5; ctx.strokeStyle = hot ? K.sel : '#cfe8ff'; ctx.strokeRect(cx - w / 2 + 0.75, cy - h / 2 + 0.75, w - 1.5, h - 1.5);
    ctx.fillStyle = hot ? K.selInk : '#cfe8ff'; ctx.fillRect(cx - w / 2 + 3, cy + h / 2 - 3, w - 6, 1);
    mtext(ctx, label, cx, cy, px, hot ? K.selInk : '#ffffff', 'center', true);
    ctx.restore();
    return w;
  }
  function keyAct(ctx, k, s, x, y, px, hot, col) {
    var kw = Math.max(px * 1.7, mtw(ctx, k, px, true) + px * 0.9);
    key(ctx, k, x + kw / 2, y, px, hot);
    text(ctx, s, x + kw + 5, y, px, col || K.txt, 'left', true);
    return kw + 5 + tw(ctx, s, px, true);
  }
  function keyRow(ctx, items, cx, y, px, col) {
    var total = 0, i, ws = [];
    for (i = 0; i < items.length; i++) { var kw = Math.max(px * 1.7, mtw(ctx, items[i][0], px, true) + px * 0.9); ws.push(kw + 5 + tw(ctx, items[i][1], px, true)); total += ws[i] + (i ? px * 1.3 : 0); }
    var x = cx - total / 2;
    for (i = 0; i < items.length; i++) { if (i) x += px * 1.3; keyAct(ctx, items[i][0], items[i][1], x, y, px, items[i][2] === true, col); x += ws[i]; }
  }
  function canPay(c) { for (var i = 0; i < KINDS.length; i++) if (c[KINDS[i]] > STOCK[KINDS[i]]) return false; return true; }
  // 花費: 圖示 + 等寬數字; 不足 → 數字後面接「/持有」, 整段壓紅色斜線底 + 紅字
  function cost(ctx, c, x, y, px, align, inv) {
    var items = [], i;
    for (i = 0; i < KINDS.length; i++) { var k = KINDS[i]; if (c[k] > 0) items.push([k, c[k], STOCK[k] < c[k]]); }
    var isz = px * 1.2, ws = [], total = 0;
    for (i = 0; i < items.length; i++) { var s = items[i][2] ? String(items[i][1]) + '/' + STOCK[items[i][0]] : String(items[i][1]); var w = isz + 4 + mtw(ctx, s, px, true) + (items[i][2] ? 6 : 0); ws.push([w, s]); total += w + (i ? 10 : 0); }
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (i = 0; i < items.length; i++) {
      if (i) cx += 10;
      var bad = items[i][2], w0 = ws[i][0];
      if (bad) {
        ctx.save(); ctx.beginPath(); ctx.rect(cx - 2, y - px * 0.8, w0 + 2, px * 1.6); ctx.clip();
        ctx.fillStyle = inv ? 'rgba(176,16,42,0.18)' : 'rgba(255,90,100,0.16)'; ctx.fillRect(cx - 2, y - px, w0 + 4, px * 2);
        ctx.strokeStyle = inv ? 'rgba(176,16,42,0.55)' : 'rgba(255,90,100,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (var d = -20; d < w0 + 20; d += 6) { ctx.moveTo(cx + d, y + px); ctx.lineTo(cx + d + px * 1.6, y - px); }
        ctx.stroke(); ctx.restore();
        ctx.lineWidth = 1.2; ctx.strokeStyle = inv ? K.redDeep : K.red; ctx.strokeRect(cx - 1.5, y - px * 0.8 + 0.5, w0 + 1, px * 1.6 - 1);
      }
      matIcon(ctx, items[i][0], cx + isz / 2 + 1, y, isz);
      mtext(ctx, ws[i][1], cx + isz + 4, y + 0.5, px, bad ? (inv ? K.redDeep : K.red) : (inv ? K.selInk : K.txt), 'left', true);
      cx += w0;
    }
    return total;
  }
  // 動作章: 'hot' 實心黃 / 'idle' 線框 / 'off' 紅色虛線框 + 「不足」
  function act(ctx, s, x, y, state, align, inv) {
    var px = 12, label = state === 'off' ? s.replace(/^Z\s*/, '') + '不足' : s;
    var w = tw(ctx, label, px, true) + 14, h = 20;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.save();
    if (state === 'hot') { ctx.fillStyle = inv ? K.selInk : K.sel; ctx.fillRect(lx, y - h / 2, w, h); text(ctx, label, lx + w / 2, y + 0.5, px, inv ? K.sel : K.selInk, 'center', true); }
    else if (state === 'idle') { ctx.lineWidth = 1.5; ctx.strokeStyle = inv ? K.selInk : '#cfe8ff'; ctx.strokeRect(lx + 0.75, y - h / 2 + 0.75, w - 1.5, h - 1.5); text(ctx, label, lx + w / 2, y + 0.5, px, inv ? K.selInk : K.txt, 'center', true); }
    else { ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = inv ? K.redDeep : K.red; ctx.strokeRect(lx + 0.75, y - h / 2 + 0.75, w - 1.5, h - 1.5); ctx.setLineDash([]); text(ctx, label, lx + w / 2, y + 0.5, px, inv ? K.redDeep : K.red, 'center', true); }
    ctx.restore();
    return w;
  }
  // 列: 作用中 = 左側 6px 黃色實心條 + 黃色外框 + 列號反白
  function row(ctx, x, y, w, h, no, label, on) {
    ctx.save();
    ctx.fillStyle = on ? 'rgba(255,216,74,0.06)' : 'rgba(8,20,38,0.55)'; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = on ? 1.5 : 1; ctx.strokeStyle = on ? K.sel : K.lineDim; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (on) { ctx.fillStyle = K.sel; ctx.fillRect(x - 8, y, 6, h); }
    var nw = mtw(ctx, no, 11, true) + 8;
    ctx.fillStyle = on ? K.sel : K.lineDim; ctx.fillRect(x, y, nw, 16);
    mtext(ctx, no, x + nw / 2, y + 8.5, 11, on ? K.selInk : K.txt, 'center', true);
    text(ctx, label, x + nw + 6, y + 8.5, 12, on ? K.sel : K.dim, 'left', true);
    ctx.restore();
  }
  // 圖紙註記: 引線 + 註解文字(方案頁用來說明語言, 遊戲內不畫)
  function note(ctx, s, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = '#9fd6ff'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    circle(ctx, x1, y1, 2.5); ctx.fillStyle = '#9fd6ff'; ctx.fill();
    var w = tw(ctx, s, 11, true) + 10;
    var lx = x2 > x1 ? x2 : x2 - w;
    ctx.fillStyle = 'rgba(11,29,51,0.95)'; ctx.fillRect(lx, y2 - 9, w, 18); ctx.strokeStyle = '#9fd6ff'; ctx.strokeRect(lx + 0.5, y2 - 8.5, w - 1, 17);
    text(ctx, s, lx + 5, y2 + 0.5, 11, '#cfeaff', 'left', true);
    ctx.restore();
  }

  // ---------- 各部件 ----------
  function hud(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(9,24,44,0.94)'; ctx.fillRect(0, 0, 1280, 42);
    ctx.fillStyle = K.line; ctx.fillRect(0, 40, 1280, 1.5);
    for (var tx = 0; tx < 1280; tx += 10) { ctx.fillStyle = tx % 50 === 0 ? 'rgba(159,214,255,0.6)' : 'rgba(159,214,255,0.25)'; ctx.fillRect(tx, 36, 1, tx % 50 === 0 ? 4 : 2); }
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = 8 + i * 166, bump = i === 0;
      if (i) { ctx.fillStyle = K.lineDim; ctx.fillRect(x0 - 5, 6, 1, 28); }
      matIcon(ctx, k, x0 + 14, 19, 22);
      ctx.save(); ctx.translate(x0 + 30, 19); if (bump) ctx.scale(1.22, 1.22);
      mtext(ctx, String(STOCK[k]), 0, 0, 20, bump ? K.sel : '#ffffff', 'left', true);
      ctx.restore();
      mtext(ctx, '+' + f1(RATE[k]) + '/分', x0 + 82, 12, 11, C(k + 'Light', '#ffffff'), 'left', true);
      text(ctx, KIND_USE[k], x0 + 82, 27, 10, K.dim, 'left', true);
    }
    ctx.fillStyle = K.line; ctx.fillRect(676, 4, 1.5, 32);
    var sx = 702;
    clsIcon(ctx, 'sword', sx, 19, 22);
    for (i = 0; i < 12; i++) { var a = -Math.PI / 2 + i * TAU / 12; ctx.fillStyle = i < 8 ? '#ffffff' : '#2f6aa0'; ctx.save(); ctx.translate(sx + Math.cos(a) * 15.5, 19 + Math.sin(a) * 15.5); ctx.rotate(a); ctx.fillRect(-2, -1.2, 4, 2.4); ctx.restore(); }
    key(ctx, 'X', sx + 33, 19, 11, false);
    for (i = 0; i < 3; i++) {
      heartShape(ctx, 770 + i * 23, 19, 1.2);
      if (i < 2) { ctx.fillStyle = C('hp', '#ff4d5e'); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
      else { ctx.lineWidth = 1.5; ctx.strokeStyle = '#4d7aa6'; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.fillStyle = K.lineDim; ctx.fillRect(838, 6, 1, 28);
    text(ctx, '計時', 850, 19, 11, K.dim, 'left', true);
    mtext(ctx, '08.4s', 878, 19.5, 18, '#ffffff', 'left', true);
    ctx.fillStyle = K.lineDim; ctx.fillRect(948, 6, 1, 28);
    text(ctx, '這趟', 958, 19, 11, K.dim, 'left', true);
    for (i = 0; i < 4; i++) {
      var kk = KINDS[i], rx = 992 + i * 70;
      matIcon(ctx, kk, rx + 9, 19, 17);
      mtext(ctx, '+' + RUN[kk], rx + 21, 19.5, 15, RUN[kk] > 0 ? '#ffffff' : '#4d7aa6', 'left', true);
    }
    ctx.restore();
  }

  function soundBtn(ctx, cx, cy, on) {
    ctx.save();
    cham(ctx, cx - 15, cy - 15, 30, 30, 6); ctx.fillStyle = 'rgba(11,29,51,0.95)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = on ? K.line : '#4d7aa6'; ctx.stroke();
    speaker(ctx, cx - 1.5, cy, 1, on, on ? '#ffffff' : '#4d7aa6');
    ctx.restore();
  }

  function card(ctx, x, y, o) {
    ctx.save();
    var lc = { sealed: '#34506e', buyable: K.sel, open: K.line, cleared: K.good }[o.state];
    cham(ctx, x, y, 176, 136, 10); ctx.fillStyle = o.state === 'sealed' ? '#0a192c' : K.sheet; ctx.fill();
    if (o.state === 'buyable') ctx.setLineDash([6, 4]);
    cham(ctx, x + 1, y + 1, 174, 134, 10); ctx.lineWidth = o.state === 'cleared' ? 2.5 : 1.5; ctx.strokeStyle = lc; ctx.stroke(); ctx.setLineDash([]);
    // 狀態字頭(左上角的小標籤)
    var stName = { sealed: '封鎖', buyable: '可解鎖', open: '已開放', cleared: '已過關' }[o.state];
    ctx.fillStyle = o.state === 'sealed' ? '#34506e' : lc;
    var sw = tw(ctx, stName, 10, true) + 10; ctx.fillRect(x + 8, y + 100, sw, 14);
    text(ctx, stName, x + 13, y + 107.5, 10, o.state === 'sealed' ? '#a8bdd4' : K.selInk, 'left', true);
    if (o.state === 'cleared' || o.state === 'open') {
      if (o.state === 'cleared') thumb(ctx, x + 8, y + 8, 160, 90, o.theme, o.seed, 'sword');
      else { ctx.fillStyle = C('bg', '#1a2233'); ctx.fillRect(x + 8, y + 8, 160, 90); text(ctx, '尚無回放', x + 88, y + 53, 12, '#7d8aa6', 'center', true); }
      ctx.lineWidth = 1; ctx.strokeStyle = K.lineDim; ctx.strokeRect(x + 7.5, y + 7.5, 161, 91);
    } else {
      ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
      ctx.strokeStyle = 'rgba(127,168,207,0.10)'; ctx.lineWidth = 1; ctx.beginPath(); for (var d = -90; d < 160; d += 10) { ctx.moveTo(x + 8 + d, y + 98); ctx.lineTo(x + 8 + d + 90, y + 8); } ctx.stroke(); ctx.restore();
      lockIcon(ctx, x + 88, y + 38, 28, o.state === 'sealed' ? '#34506e' : K.sel);
      cost(ctx, o.cost, x + 88, y + 76, 14, 'center', false);
    }
    if (o.accel) { ctx.fillStyle = C('time', '#3fd6ea'); ctx.fillRect(x + 124, y + 11, 41, 16); mtext(ctx, o.accel, x + 144.5, y + 19.5, 11, '#06262c', 'center', true); }
    if (o.newArea) { ctx.fillStyle = C('newArea', '#ff8a3d'); ctx.fillRect(x + 11, y + 11, 44, 16); text(ctx, '新區域', x + 33, y + 19.5, 11, '#ffffff', 'center', true); }
    text(ctx, o.idx + ' ' + o.name, x + 8 + sw + 6, y + 107.5, 12, o.state === 'sealed' ? '#6f88a4' : K.txt, 'left', true);
    if (o.state === 'cleared') {
      for (var i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, x + 14 + i * 40, y + 125, 11); mtext(ctx, f1(o.rates[k]), x + 21 + i * 40, y + 125.5, 10, '#ffffff', 'left', true); }
      clsIcon(ctx, 'sword', x + 132, y + 107, 11); mtext(ctx, o.time, x + 139, y + 107.5, 10, '#ffffff', 'left', true);
    } else if (o.state === 'open') {
      text(ctx, '工程 0/3  ·  未過關', x + 10, y + 125, 11, K.dim, 'left', true);
    } else if (o.state === 'buyable') {
      text(ctx, 'Z 解鎖(木材不足)', x + 10, y + 125, 11, K.red, 'left', true);
    } else {
      text(ctx, '前一關未過', x + 10, y + 125, 11, '#6f88a4', 'left', true);
    }
    if (o.rep != null) { ctx.fillStyle = 'rgba(9,24,44,0.88)'; ctx.fillRect(x + 118, y + 82, 48, 14); mtext(ctx, '工程' + o.rep + '/3', x + 142, y + 89.5, 10, '#ffffff', 'center', true); }
    if (o.sel) brackets(ctx, x, y, 176, 136, K.sel, 3.5);
    ctx.restore();
  }

  function levelPanel(ctx, X, Y, W, H) {
    sheet(ctx, X, Y, W, H, '第 1 關 草原');
    keyAct(ctx, 'X', '關閉', X + W - 70, Y + 14, 11, false);
    var rx = X + 22, rw = W - 34;
    // 01 職業(非作用列)
    row(ctx, rx, Y + 34, rw, 104, '01', '職業', false);
    var cls = [['sword', true], ['hunter', true], ['bomber', false]];
    for (var i = 0; i < 3; i++) {
      var cx = rx + 8 + i * 156, cy = Y + 56, owned = cls[i][1];
      cell(ctx, cx, cy, 148, 74, i === 0 ? 'cold' : null, owned ? 'normal' : 'dim');
      hero(ctx, cls[i][0], cx + 22, cy + 40, 1.0, owned ? 1 : 0.35);
      if (!owned) lockIcon(ctx, cx + 22, cy + 42, 20, '#a8bdd4');
      text(ctx, CLS_NAME[cls[i][0]], cx + 44, cy + 16, 15, owned ? K.txt : '#6f88a4', 'left', true);
      text(ctx, CLS_GOOD[cls[i][0]], cx + 44, cy + 35, 11, K.dim, 'left', true);
      if (!owned) text(ctx, '到升級所招募', cx + 44, cy + 57, 11, '#ff9a8a', 'left', true);
      else if (i === 0) act(ctx, 'Z 出發', cx + 44, cy + 57, 'idle', 'left');
    }
    // 02 工程(作用列)
    row(ctx, rx, Y + 148, rw, 148, '02', '工程', true);
    var sites = [
      { st: 'done', role: 'treasure', kind: '堵塞隧道' },
      { st: 'open', role: 'shortcut', kind: '崩梯', cost: { wood: 0, stone: 15, time: 0, soul: 0 } },
      { st: 'hidden' }
    ];
    for (i = 0; i < 3; i++) {
      var s = sites[i], sx = rx + 8 + i * 156, sy = Y + 172, sel = i === 1;
      var inv = cell(ctx, sx, sy, 148, 114, sel ? 'hot' : null, s.st === 'done' ? 'done' : s.st === 'hidden' ? 'fog' : 'normal');
      var mid = sx + 74, ink = inv ? K.selInk : K.txt;
      mtext(ctx, 'NO.' + (i + 1), sx + 6, sy + 11, 10, inv ? K.selInk : K.dim, 'left', true);
      text(ctx, '工程 ' + (i + 1), mid, sy + 13, 12, ink, 'center', true);
      if (s.st === 'hidden') {
        ctx.save(); ctx.beginPath(); ctx.rect(sx + 1, sy + 22, 146, 91); ctx.clip();
        for (var b = 0; b < 5; b++) { ell(ctx, sx + 16 + b * 30, sy + 62 + (b % 2) * 14, 28, 16); ctx.fillStyle = b % 2 ? 'rgba(201,205,214,0.22)' : 'rgba(128,134,148,0.3)'; ctx.fill(); }
        ctx.restore();
        mtext(ctx, '???', mid, sy + 56, 24, '#e6e8ee', 'center', true);
        text(ctx, '先修工程 2', mid, sy + 92, 12, '#e6e8ee', 'center', true);
      } else {
        roleMark(ctx, s.role, mid, sy + 40, 1, s.st === 'done');
        var rc = s.st === 'done' ? K.dim : inv ? K.selInk : (s.role === 'shortcut' ? C('shortcut', '#43d3ff') : C('treasure', '#ffc83d'));
        text(ctx, (s.role === 'shortcut' ? '捷徑' : '寶區') + ' · ' + s.kind, mid, sy + 66, 12, rc, 'center', true);
        if (s.st === 'done') text(ctx, '✓ 已完工', mid, sy + 93, 14, K.good, 'center', true);
        else { cost(ctx, s.cost, sx + 10, sy + 93, 13, 'left', inv); act(ctx, 'Z 修復', sx + 140, sy + 93, canPay(s.cost) ? 'hot' : 'off', 'right', inv); }
      }
    }
    // 03 道具格
    row(ctx, rx, Y + 306, rw, 92, '03', '道具格', false);
    for (i = 0; i < 2; i++) {
      var ox = rx + 8 + i * 234, oy = Y + 328, has = i === 0;
      cell(ctx, ox, oy, 226, 60, i === 0 ? 'cold' : null, 'normal');
      mtext(ctx, '#' + (i + 1), ox + 6, oy + 10, 10, K.dim, 'left', true);
      if (has) {
        itemIcon(ctx, 'bagWood', ox + 28, oy + 34, 32);
        text(ctx, ITEM_NAME.bagWood, ox + 50, oy + 24, 14, K.txt, 'left', true);
        text(ctx, ITEM_FX.bagWood, ox + 50, oy + 44, 11, K.dim, 'left', true);
        act(ctx, 'Z 換道具', ox + 220, oy + 14, 'idle', 'right');
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.strokeStyle = K.lineDim; ctx.strokeRect(ox + 76.5, oy + 14.5, 72, 34); ctx.restore();
        text(ctx, '空', ox + 113, oy + 32, 15, K.dim, 'center', true);
      }
    }
    // 04 回放加速器(時晶不夠)
    row(ctx, rx, Y + 408, rw, 70, '04', '回放加速器', false);
    mtext(ctx, '×1.25', rx + 14, Y + 452, 22, C('time', '#3fd6ea'), 'left', true);
    for (i = 0; i < 2; i++) { ctx.fillStyle = i < 1 ? C('time', '#3fd6ea') : 'transparent'; if (i < 1) ctx.fillRect(rx + 98 + i * 20, Y + 445, 15, 13); ctx.lineWidth = 1; ctx.strokeStyle = C('time', '#3fd6ea'); ctx.strokeRect(rx + 98.5 + i * 20, Y + 445.5, 14, 12); }
    text(ctx, '下一級 ×1.5', rx + 148, Y + 452, 12, K.dim, 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 30, soul: 0 }, rx + 236, Y + 452, 14, 'left', false);
    act(ctx, 'Z 購買', rx + rw - 10, Y + 452, 'off', 'right', false);
    keyRow(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '確定'], ['X', '關閉']], X + W / 2, Y + H - 18, 12);
    // 註記
    note(ctx, '選中 = 反白 + 角括號', rx + 8 + 156 + 140, Y + 174, X + W - 150, Y + 154);
  }

  function backpack(ctx, X, Y, W, H) {
    sheet(ctx, X, Y, W, H, '背包 → 1 號格');
    var items = [['bagWood', '1關1號', 'here'], ['horn', '3關2號'], ['glove', '未裝', 'cur'], ['heart', '未裝'], ['soulLamp', '6關1號'], ['bagStone', '未裝']];
    for (var i = 0; i < 11; i++) {
      var col = i % 6, r = Math.floor(i / 6), cx = X + 14 + col * 53, cy = Y + 34 + r * 64;
      if (i < items.length) {
        var it = items[i], cur = it[2] === 'cur', here = it[2] === 'here';
        var inv = cell(ctx, cx, cy, 46, 56, cur ? 'hot' : null, 'normal');
        itemIcon(ctx, it[0], cx + 23, cy + 22, 30);
        if (here) { ctx.fillStyle = K.line; ctx.fillRect(cx + 1, cy + 42, 44, 13); }
        text(ctx, it[1], cx + 23, cy + 48.5, 10, inv ? K.selInk : here ? K.selInk : it[1] === '未裝' ? K.dim : K.txt, 'center', true);
      } else {
        ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = K.lineDim; ctx.strokeRect(cx + 0.5, cy + 0.5, 45, 55); ctx.restore();
      }
    }
    var dy = Y + 166;
    ctx.fillStyle = K.cell; ctx.fillRect(X + 12, dy, W - 24, H - 178); ctx.lineWidth = 1; ctx.strokeStyle = K.lineDim; ctx.strokeRect(X + 12.5, dy + 0.5, W - 25, H - 179);
    itemIcon(ctx, 'glove', X + 38, dy + 26, 34);
    text(ctx, ITEM_NAME.glove, X + 62, dy + 16, 15, K.txt, 'left', true);
    text(ctx, ITEM_FX.glove, X + 62, dy + 36, 12, K.dim, 'left', true);
    keyAct(ctx, 'Z', '裝上', X + W - 112, dy + 26, 12, true);
    keyAct(ctx, 'X', '返回', X + W - 60, dy + 26, 12, false);
  }

  function result(ctx, X, Y, W, H) {
    sheet(ctx, X, Y, W, H, '過關 · 新舊比較', K.good);
    text(ctx, '這一趟獲得', X + 16, Y + 40, 12, K.dim, 'left', true);
    for (var i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, X + 106 + i * 64, Y + 40, 17); mtext(ctx, '+' + RUN[k], X + 118 + i * 64, Y + 40.5, 15, RUN[k] > 0 ? '#ffffff' : '#4d7aa6', 'left', true); }
    var cA = X + 196, cB = X + 306, ty = Y + 60;
    ctx.fillStyle = 'rgba(8,20,38,0.6)'; ctx.fillRect(X + 12, ty, W - 24, 150);
    ctx.strokeStyle = K.lineDim; ctx.lineWidth = 1; ctx.strokeRect(X + 12.5, ty + 0.5, W - 25, 149);
    ctx.fillStyle = K.lineDim; ctx.fillRect(cA - 50, ty, 1, 150); ctx.fillRect(cB - 54, ty, 1, 150);
    text(ctx, '這一趟', cA, ty + 13, 12, K.txt, 'center', true);
    text(ctx, '目前回放', cB, ty + 13, 12, K.txt, 'center', true);
    ctx.fillStyle = K.lineDim; ctx.fillRect(X + 12, ty + 25, W - 24, 1);
    text(ctx, '職業 / 秒數', X + 22, ty + 39, 11, K.dim, 'left', true);
    clsIcon(ctx, 'hunter', cA - 34, ty + 39, 16); mtext(ctx, '10.9s ▲', cA - 22, ty + 39.5, 13, K.good, 'left', true);
    clsIcon(ctx, 'sword', cB - 34, ty + 39, 16); mtext(ctx, '11.8s', cB - 22, ty + 39.5, 13, '#6f88a4', 'left', true);
    var a = [14.1, 3.3, 1.0, 1.4], b = [12.4, 3.1, 1.0, 0.8];
    for (i = 0; i < 4; i++) {
      var yy = ty + 63 + i * 22, kk = KINDS[i];
      matIcon(ctx, kk, X + 30, yy, 15); text(ctx, '每分鐘', X + 42, yy + 0.5, 11, K.dim, 'left', true);
      var up = a[i] > b[i], dn = a[i] < b[i];
      if (up) { ctx.fillStyle = 'rgba(79,209,139,0.16)'; ctx.fillRect(cA - 49, yy - 10, 98, 20); }
      mtext(ctx, '+' + f1(a[i]) + (up ? ' ▲' : ''), cA, yy + 0.5, 13, up ? K.good : (dn ? '#6f88a4' : '#ffffff'), 'center', true);
      mtext(ctx, '+' + f1(b[i]) + (dn ? ' ▲' : ''), cB, yy + 0.5, 13, dn ? K.good : (up ? '#6f88a4' : '#ffffff'), 'center', true);
    }
    keyRow(ctx, [['Z', '採用這一趟', true], ['X', '保留舊的']], X + W / 2, Y + H - 20, 12);
  }

  function upgrade(ctx, X, Y, W) {
    sheet(ctx, X, Y, W, 142, '升級所', '#b49cff');
    var y1 = Y + 34;
    var inv = cell(ctx, X + 14, y1, W - 28, 54, 'hot', 'normal');
    text(ctx, '移速', X + 26, y1 + 18, 16, K.selInk, 'left', true);
    for (var i = 0; i < 3; i++) { ctx.fillStyle = i < 1 ? C('soulDark', '#8e2a80') : 'rgba(11,29,51,0.25)'; ctx.fillRect(X + 26 + i * 19, y1 + 34, 15, 11); }
    mtext(ctx, '+8% → +16%', X + 98, y1 + 17, 13, K.selInk, 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 0, soul: 20 }, X + 98, y1 + 39, 13, 'left', inv);
    act(ctx, 'Z 升級', X + W - 24, y1 + 27, 'off', 'right', inv);
    var y2 = Y + 98;
    cell(ctx, X + 14, y2, W - 28, 32, null, 'normal');
    text(ctx, '冷卻', X + 26, y2 + 16, 14, K.txt, 'left', true);
    mtext(ctx, '-0% → -15%', X + 98, y2 + 16.5, 12, K.dim, 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 0, soul: 8 }, X + W - 24, y2 + 16, 13, 'right', false);
  }

  function finishScene(ctx, X, Y, W, H) {
    ctx.save();
    cham(ctx, X, Y, W, H, 10); ctx.clip();
    var g = ctx.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, C('bg', '#1a2233')); g.addColorStop(1, C('bgLow', '#273149'));
    ctx.fillStyle = g; ctx.fillRect(X, Y, W, H);
    var th = (ART.themes && ART.themes.plain) || { top: '#63c35a', inner: '#7b5a3c' };
    ctx.fillStyle = th.inner; ctx.fillRect(X, Y + H - 20, W, 20); ctx.fillStyle = th.top; ctx.fillRect(X, Y + H - 20, W, 7);
    goalFlag(ctx, X + W - 60, Y + H - 20, 0.85);
    hero(ctx, 'sword', X + W - 96, Y + H - 42, 1, 1);
    // 提示: 貼著旗子的線框標籤 + 引線
    var bx = X + 18, by = Y + 18, bw = 188, bh = 34;
    ctx.strokeStyle = K.sel; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + bw, by + bh / 2); ctx.lineTo(X + W - 66, by + bh / 2); ctx.lineTo(X + W - 66, Y + H - 66); ctx.stroke();
    ctx.fillStyle = 'rgba(11,29,51,0.95)'; ctx.fillRect(bx, by, bw, bh); ctx.lineWidth = 2; ctx.strokeStyle = K.sel; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    text(ctx, '按', bx + 12, by + 17.5, 16, '#ffffff', 'left', true);
    key(ctx, '↓', bx + 48, by + 17, 15, true);
    text(ctx, '完成關卡', bx + 70, by + 17.5, 16, '#ffffff', 'left', true);
    ctx.restore();
    cham(ctx, X + 0.75, Y + 0.75, W - 1.5, H - 1.5, 10); ctx.lineWidth = 1.5; ctx.strokeStyle = K.line; ctx.stroke();
  }

  function smallPanels(ctx, X, Y) {
    sheet(ctx, X, Y, 244, 116, null);
    text(ctx, '暫停', X + 122, Y + 28, 24, '#ffffff', 'center', true);
    keyRow(ctx, [['Esc', '繼續']], X + 122, Y + 62, 12);
    keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], X + 122, Y + 92, 12);
    sheet(ctx, X + 256, Y, 244, 116, null, K.red);
    ctx.save(); cham(ctx, X + 256, Y, 244, 116, 12); ctx.clip(); ctx.fillStyle = 'rgba(255,90,100,0.10)'; ctx.fillRect(X + 256, Y, 244, 116); ctx.restore();
    text(ctx, '失敗', X + 378, Y + 26, 24, K.red, 'center', true);
    text(ctx, '這趟作廢, 素材不入帳', X + 378, Y + 54, 12, '#ffc8c8', 'center', true);
    keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], X + 378, Y + 88, 12);
  }

  function legend(ctx, X, Y, W, H) {
    sheet(ctx, X, Y, W, H, null);
    var keys = ['←', '→', '↑', '↓', 'Z', 'X', 'Esc', 'M'], x = X + 16;
    for (var i = 0; i < keys.length; i++) { var w = key(ctx, keys[i], x + 12, Y + 24, 14, false); x += w + 8; }
    key(ctx, 'Z', X + 28, Y + 56, 14, true); text(ctx, '= 此刻可按', X + 46, Y + 56.5, 11, K.dim, 'left', true);
    soundBtn(ctx, X + 160, Y + 56, true); text(ctx, '開', X + 180, Y + 56.5, 12, '#ffffff', 'left', true);
    soundBtn(ctx, X + 222, Y + 56, false); text(ctx, '關', X + 242, Y + 56.5, 12, K.dim, 'left', true);
    keyAct(ctx, 'M', '切換', X + 266, Y + 56, 11, false);
  }

  function legendNotes(ctx, X, Y, W) {
    // 圖例: 兩種最重要的狀態
    ctx.save();
    ctx.fillStyle = 'rgba(9,24,44,0.92)'; ctx.fillRect(X, Y, W, 48); ctx.lineWidth = 1; ctx.strokeStyle = K.lineDim; ctx.strokeRect(X + 0.5, Y + 0.5, W - 1, 47);
    ctx.fillStyle = K.sel; ctx.fillRect(X + 18, Y + 7, 26, 13); brackets(ctx, X + 18, Y + 7, 26, 13, K.sel, 1.5);
    text(ctx, '選中: 反白實心 + 外側角括號', X + 64, Y + 14, 12, '#ffffff', 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 30, soul: 0 }, X + 12, Y + 35, 11, 'left', false);
    text(ctx, '錢不夠: 紅字「花費/持有」+ 斜線底', X + 92, Y + 35, 12, '#ffffff', 'left', true);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'ui', id: 'B', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      ctx.save();
      if (ART.drawMapBackground) ART.drawMapBackground(ctx); else { ctx.fillStyle = '#15242a'; ctx.fillRect(0, 0, 1280, 720); }
      hud(ctx);
      soundBtn(ctx, 1250, 64, true);
      // 左: 關卡面板(工程列作用中)+ 暫停 / 失敗
      levelPanel(ctx, 24, 60, 504, 512);
      smallPanels(ctx, 24, 588);
      // 右上: 一排四張關卡卡片
      card(ctx, 544, 96, { state: 'cleared', idx: 1, name: '草原', theme: 'plain', seed: 0.5, time: '11.8', rep: 2, rates: RATE, accel: '×1.25', newArea: true, sel: true });
      card(ctx, 728, 96, { state: 'open', idx: 3, name: '野豬峽谷' });
      card(ctx, 912, 96, { state: 'buyable', idx: 4, name: '蜂巢高塔', cost: { wood: 50, stone: 0, time: 0, soul: 0 } });
      card(ctx, 1096, 96, { state: 'sealed', idx: 8, name: '王座', cost: { wood: 100, stone: 0, time: 0, soul: 0 } });
      // 右中: 背包 / 結算比較
      backpack(ctx, 552, 250, 340, 240);
      result(ctx, 904, 250, 360, 254);
      // 右下: 升級所 / 終點提示 / 鍵帽
      upgrade(ctx, 552, 504, 340);
      finishScene(ctx, 904, 516, 360, 96);
      legend(ctx, 904, 622, 360, 82);
      legendNotes(ctx, 552, 660, 340);
      ctx.restore();
    }
  };
})();
