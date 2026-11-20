/* 介面風格 方案 C — 厚塊按鈕
 * 方向: 淺色、圓胖、可以「按下去」的街機式介面。面板是奶油色厚塊(3px 深色描邊 + 底部 6px 厚度), 每格都像一顆實體按鈕, 資訊列拆成一顆顆浮在畫面上的白色膠囊。
 * 選中 = 整格變黃、放大 6%、厚度加深 + 上方黃色彈跳箭頭; 非作用列的選中只留粗虛線框。作用中的列底色轉淡黃、標籤膠囊轉黃。
 * 錢不夠 = 數字紅 + 動作鈕變成灰色扁平(沒有厚度 = 按不下去), 鈕上方冒紅色「差 N」膠囊(附缺的那種素材圖示); 付得起的動作鈕是綠色厚塊。
 * 只用 Canvas 2D; 素材 / 職業圖示沿用底版造型, 道具圖示與角色呼叫底版 Art。
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

  // ---------- 方案 C 的造型語言: 厚塊按鈕(淺色面板) ----------
  var K = {
    panel: '#fbf3e2', row: '#efe4cc', rowOn: '#fff1b8', cell: '#ffffff', depth: '#c9bda4',
    ink: '#1d1726', dim: '#7a7084', sel: '#ffd84a', selDeep: '#d9a400', go: '#3cc76a', goDeep: '#23874a',
    flat: '#d9d3c7', flatInk: '#8a8478', red: '#e0303c', shadow: '#1d1726'
  };
  // 厚塊: 深色描邊 + 底下 d px 厚度; 回傳實際頂面 y
  function block(ctx, x, y, w, h, r, fill, d, lw, depthCol) {
    ctx.save();
    if (d > 0) { rr(ctx, x, y + d, w, h, r); ctx.fillStyle = depthCol || K.shadow; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = K.shadow; ctx.stroke(); }
    rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = K.shadow; ctx.stroke();
    ctx.restore();
  }
  // 面板: 奶油色厚塊 + 頂端彩色標題膠囊
  function panel(ctx, x, y, w, h, title, tcol) {
    block(ctx, x, y, w, h, 18, K.panel, 6, 3);
    if (title) {
      var tw2 = tw(ctx, title, 17, true) + 30;
      block(ctx, x + 18, y - 12, tw2, 28, 14, tcol || '#5b8cff', 3, 3);
      text(ctx, title, x + 18 + tw2 / 2, y + 2.5, 17, '#ffffff', 'center', true, 4, K.shadow);
    }
  }
  // 彈跳箭頭(選中提示), 靜態圖取 t 決定的位置
  var BOB = 0;
  function bounceArrow(ctx, cx, tipY) {
    var y = tipY - BOB;
    poly(ctx, [cx - 10, y - 14, cx + 10, y - 14, cx, y]); ctx.fillStyle = K.sel; ctx.fill(); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = K.shadow; ctx.stroke();
  }
  // 格子: sel = 'hot'(作用列選中: 黃色頂面 + 放大 6% + 上方彈跳箭頭) / 'cold'(非作用列選中: 粗虛線框) / null
  // look: 'normal' / 'dim'(鎖住: 灰、沒厚度) / 'done' / 'fog'; 回傳 { x, y, w, h } 實際頂面
  function cell(ctx, x, y, w, h, sel, look) {
    ctx.save();
    var g = { x: x, y: y, w: w, h: h };
    if (sel === 'hot') { var dx = w * 0.03, dy = h * 0.03; g = { x: x - dx, y: y - dy - 2, w: w + dx * 2, h: h + dy * 2 }; }
    var fill = sel === 'hot' ? K.sel : look === 'dim' ? '#ddd6ca' : look === 'done' ? '#d9f2df' : look === 'fog' ? '#c3c6cc' : K.cell;
    var d = look === 'dim' ? 0 : (sel === 'hot' ? 5 : 4);
    block(ctx, g.x, g.y, g.w, g.h, 12, fill, d, sel === 'hot' ? 3.5 : 2.5, sel === 'hot' ? K.selDeep : K.depth);
    if (sel === 'cold') { ctx.setLineDash([7, 5]); rr(ctx, g.x - 5, g.y - 5, g.w + 10, g.h + 14, 15); ctx.lineWidth = 3; ctx.strokeStyle = K.shadow; ctx.stroke(); ctx.setLineDash([]); }
    if (sel === 'hot') bounceArrow(ctx, g.x + g.w / 2, g.y - 4);
    ctx.restore();
    return g;
  }
  // 厚鍵帽: 白頂 + 4px 厚度; hot = 綠頂(此刻按得下去)
  function key(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.8, tw(ctx, label, px, true) + px * 1.0), h = px * 1.7;
    block(ctx, cx - w / 2, cy - h / 2 - 2, w, h, 6, hot ? K.go : '#ffffff', 3.5, 2.2, hot ? K.goDeep : K.depth);
    text(ctx, label, cx, cy - 1.5, px, hot ? '#ffffff' : K.ink, 'center', true, hot ? 3 : 0, K.goDeep);
    return w;
  }
  function keyAct(ctx, k, s, x, y, px, hot, col) {
    var kw = Math.max(px * 1.8, tw(ctx, k, px, true) + px * 1.0);
    key(ctx, k, x + kw / 2, y, px, hot);
    text(ctx, s, x + kw + 5, y, px, col || K.ink, 'left', true);
    return kw + 5 + tw(ctx, s, px, true);
  }
  function keyRow(ctx, items, cx, y, px, col) {
    var total = 0, i, ws = [];
    for (i = 0; i < items.length; i++) { var kw = Math.max(px * 1.8, tw(ctx, items[i][0], px, true) + px * 1.0); ws.push(kw + 5 + tw(ctx, items[i][1], px, true)); total += ws[i] + (i ? px * 1.2 : 0); }
    var x = cx - total / 2;
    for (i = 0; i < items.length; i++) { if (i) x += px * 1.2; keyAct(ctx, items[i][0], items[i][1], x, y, px, items[i][2] === true, col); x += ws[i]; }
  }
  function canPay(c) { for (var i = 0; i < KINDS.length; i++) if (c[KINDS[i]] > STOCK[KINDS[i]]) return false; return true; }
  // 花費: 圖示 + 粗數字; 不足 → 數字紅
  function cost(ctx, c, x, y, px, align) {
    var items = [], i;
    for (i = 0; i < KINDS.length; i++) { var k = KINDS[i]; if (c[k] > 0) items.push([k, c[k], STOCK[k] < c[k]]); }
    var isz = px * 1.25, ws = [], total = 0;
    for (i = 0; i < items.length; i++) { var w = isz + 3 + tw(ctx, String(items[i][1]), px, true); ws.push(w); total += w + (i ? 10 : 0); }
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (i = 0; i < items.length; i++) {
      if (i) cx += 10;
      matIcon(ctx, items[i][0], cx + isz / 2, y, isz);
      text(ctx, String(items[i][1]), cx + isz + 3, y + 0.5, px, items[i][2] ? K.red : K.ink, 'left', true);
      cx += ws[i];
    }
    return total;
  }
  function lackOf(c) { var o = []; for (var i = 0; i < KINDS.length; i++) { var k = KINDS[i]; if (c[k] > STOCK[k]) o.push([k, c[k] - STOCK[k]]); } return o; }
  // 動作鈕: 付得起 = 綠色厚塊(hot 時更大); 付不起 = 灰色扁平(沒有厚度 = 按不下去)+ 上方紅色「差 N」膠囊
  function act(ctx, s, x, y, c, align, hot) {
    var ok = !c || canPay(c), px = hot ? 13 : 12;
    var w = tw(ctx, s, px, true) + 18, h = hot ? 24 : 21;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.save();
    if (ok) {
      block(ctx, lx, y - h / 2 - 2, w, h, h / 2, hot ? K.go : '#ffffff', 3.5, 2.2, hot ? K.goDeep : K.depth);
      text(ctx, s, lx + w / 2, y - 1.5, px, hot ? '#ffffff' : K.ink, 'center', true, hot ? 3 : 0, K.goDeep);
    } else {
      rr(ctx, lx, y - h / 2 + 1.5, w, h, h / 2); ctx.fillStyle = K.flat; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a8a294'; ctx.stroke();
      text(ctx, s, lx + w / 2, y + 2, px, K.flatInk, 'center', true);
      var lk = lackOf(c)[0], ls = '差 ' + lk[1];
      var bw = tw(ctx, ls, 11, true) + 22, bx = lx + w - bw + 6, by = y - h / 2 - 12;
      rr(ctx, bx, by, bw, 17, 8.5); ctx.fillStyle = K.red; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke();
      matIcon(ctx, lk[0], bx + 9, by + 8.5, 11);
      text(ctx, ls, bx + 17, by + 9, 11, '#ffffff', 'left', true);
    }
    ctx.restore();
    return w;
  }
  // 列: 作用中 = 淡黃底 + 深色粗框 + 左側標籤膠囊轉黃
  function row(ctx, x, y, w, h, label, on) {
    ctx.save();
    rr(ctx, x, y, w, h, 14); ctx.fillStyle = on ? K.rowOn : K.row; ctx.fill();
    if (on) { ctx.lineWidth = 3; ctx.strokeStyle = K.shadow; ctx.stroke(); }
    var lw = 52;
    block(ctx, x + 8, y + h / 2 - 15, lw, 30, 15, on ? K.sel : '#ffffff', on ? 3 : 0, 2.2, K.selDeep);
    text(ctx, label, x + 8 + lw / 2, y + h / 2 + (on ? -0.5 : 0.5), label.length > 3 ? 11 : 13, K.ink, 'center', true);
    ctx.restore();
  }

  // ---------- 各部件 ----------
  function pill(ctx, x, y, w, bump) {
    block(ctx, x, y, w, 30, 15, '#ffffff', 3.5, bump ? 3.2 : 2.4, K.depth);
    if (bump) { rr(ctx, x - 3, y - 3, w + 6, 36, 18); ctx.lineWidth = 3; ctx.strokeStyle = K.sel; ctx.stroke(); }
  }
  function hud(ctx) {
    ctx.save();
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = 8 + i * 162, bump = i === 0;
      pill(ctx, x0, 5, 154, bump);
      circle(ctx, x0 + 17, 20, 13); ctx.fillStyle = C(k + 'Light', '#eeeeee'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke();
      matIcon(ctx, k, x0 + 17, 20, 19);
      ctx.save(); ctx.translate(x0 + 35, 21); if (bump) ctx.scale(1.25, 1.25);
      text(ctx, String(STOCK[k]), 0, 0, 20, K.ink, 'left', true);
      ctx.restore();
      text(ctx, '+' + f1(RATE[k]) + '/分', x0 + 88, 14, 11, KIND_DARK[k], 'left', true);
      text(ctx, KIND_USE[k], x0 + 88, 28, 10, K.dim, 'left', true);
    }
    // 技能
    pill(ctx, 664, 5, 96, false);
    clsIcon(ctx, 'sword', 686, 20, 19);
    ctx.lineWidth = 4; circle(ctx, 686, 20, 13.5); ctx.strokeStyle = '#e4dccb'; ctx.stroke();
    ctx.beginPath(); ctx.arc(686, 20, 13.5, -Math.PI / 2, -Math.PI / 2 + TAU * 0.62); ctx.strokeStyle = '#7a7084'; ctx.stroke();
    key(ctx, 'X', 728, 21, 12, false);
    // 血量
    pill(ctx, 768, 5, 92, false);
    for (i = 0; i < 3; i++) {
      heartShape(ctx, 790 + i * 24, 20, 1.3);
      if (i < 2) { ctx.fillStyle = C('hp', '#ff4d5e'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke(); }
      else { ctx.fillStyle = '#e4dccb'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a8a294'; ctx.stroke(); }
    }
    // 計時
    pill(ctx, 868, 5, 88, false);
    circle(ctx, 886, 20, 8); ctx.fillStyle = '#5b8cff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(886, 20); ctx.lineTo(886, 15); ctx.moveTo(886, 20); ctx.lineTo(889.5, 20); ctx.strokeStyle = '#ffffff'; ctx.stroke();
    text(ctx, '8.4s', 899, 21, 18, K.ink, 'left', true);
    // 這趟
    pill(ctx, 964, 5, 308, false);
    text(ctx, '這趟', 978, 21, 12, K.dim, 'left', true);
    for (i = 0; i < 4; i++) { var kk = KINDS[i], rx = 1010 + i * 64; matIcon(ctx, kk, rx + 9, 20, 17); text(ctx, String(RUN[kk]), rx + 21, 21, 16, RUN[kk] > 0 ? K.ink : '#b8b0a0', 'left', true); }
    ctx.restore();
  }

  function soundBtn(ctx, cx, cy, on) {
    ctx.save();
    circle(ctx, cx, cy + 3.5, 15); ctx.fillStyle = K.shadow; ctx.fill();
    circle(ctx, cx, cy, 15); ctx.fillStyle = on ? '#ffffff' : K.flat; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = K.shadow; ctx.stroke();
    speaker(ctx, cx - 1.5, cy, 1, on, on ? K.ink : K.flatInk);
    ctx.restore();
  }

  function card(ctx, x, y, o) {
    ctx.save();
    var g = { x: x, y: y, w: 176, h: 136 };
    if (o.sel) g = { x: x - 5, y: y - 6, w: 186, h: 144 };
    var k = g.w / 176;
    ctx.translate(g.x, g.y); ctx.scale(k, k);
    var fill = o.sel ? K.sel : o.state === 'sealed' ? '#ddd6ca' : '#ffffff';
    block(ctx, 0, 0, 176, 136, 14, fill, o.state === 'sealed' ? 0 : 5, o.sel ? 3.5 : 2.5, o.sel ? K.selDeep : K.depth);
    // 縮圖
    ctx.save(); rr(ctx, 8, 8, 160, 90, 9); ctx.clip();
    if (o.state === 'cleared') thumb(ctx, 8, 8, 160, 90, o.theme, o.seed, 'sword');
    else if (o.state === 'open') { ctx.fillStyle = C('bg', '#1a2233'); ctx.fillRect(8, 8, 160, 90); text(ctx, '尚無回放', 88, 53, 12, '#9aa6c0', 'center', true); }
    else { ctx.fillStyle = o.state === 'sealed' ? '#b9b2a6' : '#3a3346'; ctx.fillRect(8, 8, 160, 90); }
    ctx.restore();
    rr(ctx, 8, 8, 160, 90, 9); ctx.lineWidth = 2.5; ctx.strokeStyle = K.shadow; ctx.stroke();
    if (o.state === 'sealed' || o.state === 'buyable') {
      lockIcon(ctx, 88, 38, 28, o.state === 'sealed' ? '#8a8478' : K.sel);
      rr(ctx, 30, 62, 116, 26, 13); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke();
      cost(ctx, o.cost, 88, 75, 14, 'center');
    }
    // 狀態膠囊(壓在縮圖下緣)
    var sn = { sealed: '封鎖', buyable: '可解鎖', open: '已開放', cleared: '已過關' }[o.state];
    var sc = { sealed: '#a8a294', buyable: '#ffb020', open: '#5b8cff', cleared: K.go }[o.state];
    var sw = tw(ctx, sn, 11, true) + 16;
    rr(ctx, 12, 90, sw, 17, 8.5); ctx.fillStyle = sc; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke();
    text(ctx, sn, 12 + sw / 2, 99, 11, '#ffffff', 'center', true, 2.5, K.shadow);
    if (o.accel) { rr(ctx, 122, 12, 42, 17, 8.5); ctx.fillStyle = C('time', '#3fd6ea'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke(); text(ctx, o.accel, 143, 21, 11, K.ink, 'center', true); }
    if (o.newArea) { rr(ctx, 12, 12, 50, 17, 8.5); ctx.fillStyle = C('newArea', '#ff8a3d'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke(); text(ctx, '新區域', 37, 21, 11, '#ffffff', 'center', true, 2.5, K.shadow); }
    text(ctx, o.idx + ' ' + o.name, 10, 116, 13, o.state === 'sealed' ? '#7a7466' : K.ink, 'left', true);
    if (o.state === 'cleared') {
      clsIcon(ctx, 'sword', 116, 116, 12); text(ctx, o.time + 's', 124, 116.5, 11, K.ink, 'left', true);
      text(ctx, '工程 ' + o.rep + '/3', 166, 99, 10, K.ink, 'right', true);
      for (var i = 0; i < 4; i++) { var kk = KINDS[i]; matIcon(ctx, kk, 14 + i * 40, 129.5, 11); text(ctx, f1(o.rates[kk]), 21 + i * 40, 130, 10, K.ink, 'left', true); }
    } else if (o.state === 'open') {
      text(ctx, '工程 0/3 · 未過關', 10, 129.5, 11, K.dim, 'left', true);
    } else if (o.state === 'buyable') {
      var lk = lackOf(o.cost);
      text(ctx, lk.length ? '木材還差 ' + lk[0][1] : 'Z 解鎖', 10, 129.5, 11, lk.length ? K.red : K.goDeep, 'left', true);
    } else {
      text(ctx, '前一關未過', 10, 129.5, 11, '#7a7466', 'left', true);
    }
    ctx.restore();
    if (o.sel) bounceArrow(ctx, g.x + g.w / 2, g.y - 4);
  }

  function levelPanel(ctx, X, Y, W, H) {
    panel(ctx, X, Y, W, H, '第 1 關 草原', '#5b8cff');
    keyAct(ctx, 'X', '關閉', X + W - 74, Y + 22, 12, false);
    var rx = X + 14, rw = W - 28, cx0 = rx + 70;
    row(ctx, rx, Y + 40, rw, 96, '職業', false);
    var cls = [['sword', true], ['hunter', true], ['bomber', false]];
    for (var i = 0; i < 3; i++) {
      var owned = cls[i][1];
      var g = cell(ctx, cx0 + i * 148, Y + 49, 140, 78, i === 0 ? 'cold' : null, owned ? 'normal' : 'dim');
      hero(ctx, cls[i][0], g.x + 22, g.y + 42, 1.0, owned ? 1 : 0.35);
      if (!owned) lockIcon(ctx, g.x + 22, g.y + 44, 20, '#6a6458');
      text(ctx, CLS_NAME[cls[i][0]], g.x + 44, g.y + 17, 15, owned ? K.ink : '#8a8478', 'left', true);
      text(ctx, CLS_GOOD[cls[i][0]], g.x + 44, g.y + 37, 11, K.dim, 'left', true);
      if (!owned) text(ctx, '到升級所招募', g.x + 44, g.y + 60, 11, K.red, 'left', true);
      else if (i === 0) act(ctx, 'Z 出發', g.x + 44, g.y + 60, null, 'left', false);
    }
    row(ctx, rx, Y + 146, rw, 144, '工程', true);
    var sites = [
      { st: 'done', role: 'treasure', kind: '堵塞隧道' },
      { st: 'open', role: 'shortcut', kind: '崩梯', cost: { wood: 0, stone: 15, time: 0, soul: 0 } },
      { st: 'hidden' }
    ];
    for (i = 0; i < 3; i++) {
      var s = sites[i], sel = i === 1;
      var q = cell(ctx, cx0 + i * 148, Y + 164, 140, 114, sel ? 'hot' : null, s.st === 'done' ? 'done' : s.st === 'hidden' ? 'fog' : 'normal');
      var mid = q.x + q.w / 2;
      text(ctx, '工程 ' + (i + 1), mid, q.y + 14, 12, K.ink, 'center', true);
      if (s.st === 'hidden') {
        ctx.save(); rr(ctx, q.x + 2, q.y + 24, q.w - 4, q.h - 26, 10); ctx.clip();
        for (var b = 0; b < 5; b++) { ell(ctx, q.x + 14 + b * 28, q.y + 62 + (b % 2) * 14, 26, 16); ctx.fillStyle = b % 2 ? 'rgba(255,255,255,0.55)' : 'rgba(150,154,162,0.5)'; ctx.fill(); }
        ctx.restore();
        text(ctx, '???', mid, q.y + 56, 24, K.ink, 'center', true);
        text(ctx, '先修工程 2', mid, q.y + 92, 12, K.ink, 'center', true);
      } else {
        roleMark(ctx, s.role, mid, q.y + 40, 1, s.st === 'done');
        var rc = s.st === 'done' ? K.dim : (s.role === 'shortcut' ? '#0c6f96' : '#8a5f00');
        text(ctx, (s.role === 'shortcut' ? '捷徑' : '寶區') + ' · ' + s.kind, mid, q.y + 66, 12, rc, 'center', true);
        if (s.st === 'done') text(ctx, '✓ 已完工', mid, q.y + 94, 14, K.goDeep, 'center', true);
        else { cost(ctx, s.cost, q.x + 10, q.y + 94, 14, 'left'); act(ctx, 'Z 修復', q.x + q.w - 8, q.y + 94, s.cost, 'right', sel); }
      }
    }
    row(ctx, rx, Y + 300, rw, 80, '道具格', false);
    for (i = 0; i < 2; i++) {
      var has = i === 0;
      var p = cell(ctx, cx0 + i * 222, Y + 308, 214, 62, i === 0 ? 'cold' : null, 'normal');
      text(ctx, (i + 1) + ' 號格', p.x + 10, p.y + 12, 11, K.dim, 'left', true);
      if (has) {
        itemIcon(ctx, 'bagWood', p.x + 26, p.y + 38, 32);
        text(ctx, ITEM_NAME.bagWood, p.x + 48, p.y + 30, 14, K.ink, 'left', true);
        text(ctx, ITEM_FX.bagWood, p.x + 48, p.y + 49, 11, K.dim, 'left', true);
        act(ctx, 'Z 換道具', p.x + p.w - 8, p.y + 14, null, 'right', false);
      } else {
        text(ctx, '空', p.x + p.w / 2, p.y + 34, 18, '#b8b0a0', 'center', true);
      }
    }
    row(ctx, rx, Y + 390, rw, 58, '加速器', false);
    text(ctx, '×1.25', cx0 + 4, Y + 419, 24, '#127a8c', 'left', true, 0);
    for (i = 0; i < 2; i++) { rr(ctx, cx0 + 82 + i * 22, Y + 412, 17, 15, 4); ctx.fillStyle = i < 1 ? C('time', '#3fd6ea') : '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke(); }
    text(ctx, '下一級 ×1.5', cx0 + 136, Y + 419, 12, K.dim, 'left', true);
    var ac = { wood: 0, stone: 0, time: 30, soul: 0 };
    cost(ctx, ac, cx0 + 226, Y + 419, 15, 'left');
    act(ctx, 'Z 購買', rx + rw - 12, Y + 422, ac, 'right', false);
    keyRow(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '確定'], ['X', '關閉']], X + W / 2, Y + H - 20, 12);
  }

  function backpack(ctx, X, Y, W, H) {
    panel(ctx, X, Y, W, H, '背包 → 1 號格', '#9a6bff');
    var items = [['bagWood', '1關1號', 'here'], ['horn', '3關2號'], ['glove', '未裝', 'cur'], ['heart', '未裝'], ['soulLamp', '6關1號'], ['bagStone', '未裝']];
    for (var i = 0; i < 11; i++) {
      var col = i % 6, r = Math.floor(i / 6), cx = X + 12 + col * 49, cy = Y + 32 + r * 70;
      if (i < items.length) {
        var it = items[i], cur = it[2] === 'cur', here = it[2] === 'here';
        var g = cell(ctx, cx, cy, 44, 56, cur ? 'hot' : null, 'normal');
        itemIcon(ctx, it[0], g.x + g.w / 2, g.y + 22, 30);
        if (here) { rr(ctx, g.x + 3, g.y + 41, g.w - 6, 13, 6.5); ctx.fillStyle = '#5b8cff'; ctx.fill(); }
        text(ctx, it[1], g.x + g.w / 2, g.y + 47.5, 10, here ? '#ffffff' : it[1] === '未裝' ? K.dim : K.ink, 'center', true);
      } else {
        ctx.save(); ctx.setLineDash([5, 4]); rr(ctx, cx + 1, cy + 1, 42, 54, 11); ctx.lineWidth = 2; ctx.strokeStyle = '#c9bda4'; ctx.stroke(); ctx.restore();
      }
    }
    var dy = Y + 180;
    block(ctx, X + 12, dy, W - 24, H - 196, 12, '#ffffff', 0, 2.2);
    itemIcon(ctx, 'glove', X + 36, dy + 26, 34);
    text(ctx, ITEM_NAME.glove, X + 58, dy + 17, 15, K.ink, 'left', true);
    text(ctx, ITEM_FX.glove, X + 58, dy + 37, 12, K.dim, 'left', true);
    keyAct(ctx, 'Z', '裝上', X + W - 116, dy + 26, 12, true);
    keyAct(ctx, 'X', '返回', X + W - 62, dy + 26, 12, false);
  }

  function result(ctx, X, Y, W, H) {
    panel(ctx, X, Y, W, H, '過關!', K.go);
    text(ctx, '這一趟獲得', X + 18, Y + 34, 12, K.dim, 'left', true);
    for (var i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, X + 112 + i * 58, Y + 34, 18); text(ctx, String(RUN[k]), X + 125 + i * 58, Y + 34.5, 15, RUN[k] > 0 ? K.ink : '#b8b0a0', 'left', true); }
    var cA = X + 180, cB = X + 290, ty = Y + 52;
    block(ctx, X + 12, ty, W - 24, 154, 12, '#ffffff', 0, 2.2);
    // 兩欄頭: 這一趟 / 目前回放 膠囊
    rr(ctx, cA - 40, ty + 6, 80, 20, 10); ctx.fillStyle = '#5b8cff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke();
    text(ctx, '這一趟', cA, ty + 16.5, 12, '#ffffff', 'center', true);
    rr(ctx, cB - 44, ty + 6, 88, 20, 10); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.shadow; ctx.stroke();
    text(ctx, '目前回放', cB, ty + 16.5, 12, K.ink, 'center', true);
    text(ctx, '職業/秒數', X + 22, ty + 44, 11, K.dim, 'left', true);
    var a = [14.1, 3.3, 1.0, 1.4], b = [12.4, 3.1, 1.0, 0.8];
    function cellv(cx, cy, s, win, lose) {
      if (win) { var w = tw(ctx, s, 14, true) + 16; rr(ctx, cx - w / 2, cy - 10, w, 20, 10); ctx.fillStyle = '#d9f2df'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.goDeep; ctx.stroke(); }
      text(ctx, s, cx, cy + 0.5, 14, win ? K.goDeep : lose ? '#b8b0a0' : K.ink, 'center', true);
    }
    clsIcon(ctx, 'hunter', cA - 54, ty + 44, 15); cellv(cA + 8, ty + 44, '10.9秒 ▲', true, false);
    clsIcon(ctx, 'sword', cB - 46, ty + 44, 15); cellv(cB + 8, ty + 44, '11.8秒', false, true);
    for (i = 0; i < 4; i++) {
      var yy = ty + 70 + i * 22, kk = KINDS[i], up = a[i] > b[i], dn = a[i] < b[i];
      matIcon(ctx, kk, X + 30, yy, 15); text(ctx, '每分鐘', X + 42, yy + 0.5, 11, K.dim, 'left', true);
      cellv(cA, yy, '+' + f1(a[i]) + (up ? ' ▲' : ''), up, dn);
      cellv(cB, yy, '+' + f1(b[i]) + (dn ? ' ▲' : ''), dn, up);
    }
    keyRow(ctx, [['Z', '採用這一趟', true], ['X', '保留舊的']], X + W / 2, Y + H - 22, 12);
  }

  function upgrade(ctx, X, Y, W, H) {
    panel(ctx, X, Y, W, H, '升級所', '#c86bd9');
    // 招募: 付得起
    var g0 = cell(ctx, X + 14, Y + 30, W - 28, 44, null, 'normal');
    hero(ctx, 'bomber', g0.x + 22, g0.y + 22, 0.8, 1);
    text(ctx, '招募 炸彈工', g0.x + 42, g0.y + 22.5, 14, K.ink, 'left', true);
    cost(ctx, { wood: 30, stone: 0, time: 0, soul: 0 }, g0.x + 146, g0.y + 22, 13, 'left');
    act(ctx, 'Z 招募', g0.x + g0.w - 8, g0.y + 22, { wood: 30, stone: 0, time: 0, soul: 0 }, 'right', false);
    // 強化(選中 + 獸魂不夠)
    var g = cell(ctx, X + 14, Y + 96, W - 28, 54, 'hot', 'normal');
    text(ctx, '移速', g.x + 12, g.y + 18, 16, K.ink, 'left', true);
    for (var i = 0; i < 3; i++) { rr(ctx, g.x + 12 + i * 19, g.y + 33, 15, 12, 4); ctx.fillStyle = i < 1 ? C('soul', '#e65ad4') : '#ffffff'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = K.shadow; ctx.stroke(); }
    text(ctx, '+8% → +16%', g.x + 84, g.y + 18, 13, K.ink, 'left', true);
    var sc = { wood: 0, stone: 0, time: 0, soul: 20 };
    cost(ctx, sc, g.x + 84, g.y + 39, 13, 'left');
    act(ctx, 'Z 升級', g.x + g.w - 10, g.y + 31, sc, 'right', true);
    var g2 = cell(ctx, X + 14, Y + 162, W - 28, 34, null, 'normal');
    text(ctx, '冷卻', g2.x + 12, g2.y + 17, 14, K.ink, 'left', true);
    text(ctx, '-0% → -15%', g2.x + 84, g2.y + 17.5, 12, K.dim, 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 0, soul: 8 }, g2.x + g2.w - 12, g2.y + 17, 13, 'right');
  }

  function finishScene(ctx, X, Y, W, H) {
    ctx.save();
    block(ctx, X, Y, W, H, 16, '#1a2233', 5, 3);
    rr(ctx, X, Y, W, H, 16); ctx.clip();
    var g = ctx.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, C('bg', '#1a2233')); g.addColorStop(1, C('bgLow', '#273149'));
    ctx.fillStyle = g; ctx.fillRect(X, Y, W, H);
    var th = (ART.themes && ART.themes.plain) || { top: '#63c35a', inner: '#7b5a3c' };
    ctx.fillStyle = th.inner; ctx.fillRect(X, Y + H - 24, W, 24); ctx.fillStyle = th.top; ctx.fillRect(X, Y + H - 24, W, 8);
    goalFlag(ctx, X + W - 56, Y + H - 24, 0.95);
    hero(ctx, 'sword', X + W - 92, Y + H - 46, 1, 1);
    // 對話泡: 白色厚塊 + 尾巴指向旗子
    var bx = X + 14, by = Y + 16, bw = 186, bh = 38;
    poly(ctx, [bx + bw - 44, by + bh - 2, bx + bw - 24, by + bh - 2, bx + bw - 10, by + bh + 16]); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = K.shadow; ctx.stroke();
    block(ctx, bx, by, bw, bh, 19, '#ffffff', 0, 3);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + bw - 42, by + bh - 4, 16, 3);
    text(ctx, '按', bx + 14, by + 19.5, 16, K.ink, 'left', true);
    key(ctx, '↓', bx + 52, by + 20, 15, true);
    text(ctx, '完成關卡', bx + 74, by + 19.5, 16, K.ink, 'left', true);
    ctx.restore();
    rr(ctx, X, Y, W, H, 16); ctx.lineWidth = 3; ctx.strokeStyle = K.shadow; ctx.stroke();
  }

  function smallPanels(ctx, X, Y) {
    panel(ctx, X, Y, 170, 124, '暫停', '#5b8cff');
    keyRow(ctx, [['Esc', '繼續']], X + 85, Y + 42, 12);
    keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], X + 85, Y + 84, 11);
    panel(ctx, X + 182, Y, 170, 124, '失敗', K.red);
    text(ctx, '這趟作廢,', X + 267, Y + 32, 12, K.ink, 'center', true);
    text(ctx, '素材不入帳', X + 267, Y + 50, 12, K.red, 'center', true);
    keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], X + 267, Y + 86, 11);
  }

  function legend(ctx, X, Y, W, H) {
    panel(ctx, X, Y, W, H, '鍵帽 / 聲音', '#7a7084');
    var keys = ['←', '→', '↑', '↓'], x = X + 16;
    for (var i = 0; i < keys.length; i++) { var w = key(ctx, keys[i], x + 12, Y + 36, 13, false); x += w + 8; }
    x = X + 16; keys = ['Z', 'X', 'Esc', 'M'];
    for (i = 0; i < keys.length; i++) { var w2 = key(ctx, keys[i], x + 12, Y + 70, 13, i === 0); x += w2 + 8; }
    soundBtn(ctx, X + 30, Y + 108, true); text(ctx, '開', X + 50, Y + 108.5, 12, K.ink, 'left', true);
    soundBtn(ctx, X + 92, Y + 108, false); text(ctx, '關', X + 112, Y + 108.5, 12, K.dim, 'left', true);
    keyAct(ctx, 'M', '切換', X + 134, Y + 108, 11, false);
  }

  window.VISUAL_OPTION = {
    element: 'ui', id: 'C', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      BOB = Math.abs(Math.sin((Number(t) || 0) * 5)) * 4;
      ctx.save();
      if (ART.drawMapBackground) ART.drawMapBackground(ctx); else { ctx.fillStyle = '#15242a'; ctx.fillRect(0, 0, 1280, 720); }
      hud(ctx);
      soundBtn(ctx, 1250, 64, true);
      // 左上: 關卡面板(工程列作用中)
      levelPanel(ctx, 16, 66, 548, 480);
      // 中: 背包 / 升級所
      backpack(ctx, 580, 66, 316, 262);
      upgrade(ctx, 580, 350, 316, 206);
      // 右: 結算比較 / 暫停、失敗
      result(ctx, 912, 98, 352, 262);
      smallPanels(ctx, 912, 390);
      // 下: 一排大地圖卡片 + 終點提示 + 鍵帽
      card(ctx, 22, 578, { state: 'cleared', idx: 1, name: '草原', theme: 'plain', seed: 0.5, time: '11.8', rep: 2, rates: RATE, accel: '×1.25', newArea: true, sel: true });
      card(ctx, 212, 578, { state: 'open', idx: 3, name: '野豬峽谷' });
      card(ctx, 400, 578, { state: 'buyable', idx: 4, name: '蜂巢高塔', cost: { wood: 50, stone: 0, time: 0, soul: 0 } });
      card(ctx, 588, 578, { state: 'sealed', idx: 8, name: '王座', cost: { wood: 100, stone: 0, time: 0, soul: 0 } });
      finishScene(ctx, 780, 578, 244, 130);
      legend(ctx, 1040, 536, 224, 166);
      ctx.restore();
    }
  };
})();
