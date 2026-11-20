/* 介面風格 方案 A — 暖木工坊
 * 方向: 「重建王城的工坊」的實體感介面。面板是深色木板(板縫 + 角釘), 資訊寫在釘上去的米色羊皮紙牌上(深字), 按鍵是有厚度的石鍵帽。
 * 選中 = 金色粗框 + 整格往上浮 3px 落影 + 頂端金色吊牌三角; 列被選中時左側多一支金色指標 ▶。
 * 錢不夠 = 該種素材數字變紅 + 紅底白字「缺 N」小標; 動作鈕變灰並劃掉。
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

  // ---------- 方案 A 的造型語言 ----------
  var K = {
    board: '#3a2a1f', plank: '#45321f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a',
    groove: '#2a1d14', parch: '#efe3c6', parchShade: '#d8c9a6', parchDim: '#b8ab8e',
    ink: '#2b2118', inkDim: '#76664e', gold: '#ffd84a', goldDeep: '#b8860b',
    red: '#c8202c', green: '#2f8f55', greenLt: '#4fd18b', creamText: '#f3e6c8'
  };

  // 木板面板: 底色 + 水平板縫 + 外框 + 四角釘
  function board(ctx, x, y, w, h, tint) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = tint || K.board; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { circle(ctx, n[i][0], n[i][1], 2.6); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke(); }
    ctx.restore();
  }
  // 羊皮紙牌: sel = 'hot'(作用中列的選中: 金框 + 上浮 + 吊牌三角) / 'cold'(非作用列的選中: 深色雙框, 不浮) / null
  // look = 'normal' / 'dim'(鎖住) / 'done'(已完工) / 'fog'(迷霧)
  function tag(ctx, x, y, w, h, sel, look) {
    ctx.save();
    var lift = sel === 'hot' ? 3 : 0;
    if (lift) { rr(ctx, x + 2, y + 3, w, h, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); }
    y -= lift;
    var bg = look === 'dim' ? K.parchDim : look === 'done' ? '#d6e6c6' : look === 'fog' ? '#a9a8a2' : K.parch;
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
    if (sel === 'hot') {
      rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 7); ctx.lineWidth = 4; ctx.strokeStyle = K.gold; ctx.stroke();
      rr(ctx, x - 4, y - 4, w + 8, h + 8, 9); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      poly(ctx, [x + w / 2 - 8, y - 4, x + w / 2 + 8, y - 4, x + w / 2, y + 5]); ctx.fillStyle = K.gold; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    } else if (sel === 'cold') {
      rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 6); ctx.lineWidth = 3; ctx.strokeStyle = K.ink; ctx.stroke();
    } else {
      rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.stroke();
    }
    ctx.restore();
    return y;
  }
  // 石鍵帽: 上面亮、下緣 3px 厚度; hot = 金頂(此刻按得下去)
  function key(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.7, tw(ctx, label, px, true) + px * 0.9), h = px * 1.6;
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 4); ctx.fillStyle = hot ? K.goldDeep : '#8f8471'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.fillStyle = hot ? K.gold : '#ece4d2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, label, cx, cy + 0.5, px, K.ink, 'center', true);
    ctx.restore();
    return w;
  }
  // 「鍵 + 動作」一組, 回傳寬
  function keyAct(ctx, k, s, x, y, px, hot, col) {
    var kw = Math.max(px * 1.7, tw(ctx, k, px, true) + px * 0.9);
    key(ctx, k, x + kw / 2, y, px, hot);
    text(ctx, s, x + kw + 5, y, px, col || K.creamText, 'left', true, 3, K.edge);
    return kw + 5 + tw(ctx, s, px, true);
  }
  function keyRow(ctx, items, cx, y, px, col) {
    var total = 0, i, ws = [];
    for (i = 0; i < items.length; i++) { var kw = Math.max(px * 1.7, tw(ctx, items[i][0], px, true) + px * 0.9); ws.push(kw + 5 + tw(ctx, items[i][1], px, true)); total += ws[i] + (i ? px * 1.2 : 0); }
    var x = cx - total / 2;
    for (i = 0; i < items.length; i++) { if (i) x += px * 1.2; keyAct(ctx, items[i][0], items[i][1], x, y, px, items[i][2] === true, col); x += ws[i]; }
  }
  // 花費: 圖示 + 數字(深墨); 不足 → 數字紅 + 紅底白字「缺 N」
  function cost(ctx, c, x, y, px, align) {
    var items = [], i;
    for (i = 0; i < KINDS.length; i++) { var k = KINDS[i]; if (c[k] > 0) items.push([k, c[k], STOCK[k] < c[k] ? c[k] - STOCK[k] : 0]); }
    var isz = px * 1.2, ws = [], total = 0;
    for (i = 0; i < items.length; i++) {
      var w = isz + 3 + tw(ctx, String(items[i][1]), px, true);
      if (items[i][2]) w += 4 + tw(ctx, '缺 ' + items[i][2], px * 0.78, true) + 8;
      ws.push(w); total += w + (i ? 10 : 0);
    }
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (i = 0; i < items.length; i++) {
      if (i) cx += 10;
      matIcon(ctx, items[i][0], cx + isz / 2, y, isz);
      var nx = cx + isz + 3, s = String(items[i][1]);
      text(ctx, s, nx, y + 0.5, px, items[i][2] ? K.red : K.ink, 'left', true);
      if (items[i][2]) {
        var bx = nx + tw(ctx, s, px, true) + 4, bs = '缺 ' + items[i][2], bw = tw(ctx, bs, px * 0.78, true) + 8;
        rr(ctx, bx, y - px * 0.62, bw, px * 1.24, 3); ctx.fillStyle = K.red; ctx.fill();
        text(ctx, bs, bx + bw / 2, y + 0.5, px * 0.78, '#ffffff', 'center', true);
      }
      cx += ws[i];
    }
    return total;
  }
  function canPay(c) { for (var i = 0; i < KINDS.length; i++) if (c[KINDS[i]] > STOCK[KINDS[i]]) return false; return true; }
  // 動作章: 'hot' 金底(選中且付得起) / 'idle' 米白(付得起但沒選) / 'off' 灰 + 斜劃線(付不起)
  function act(ctx, s, x, y, state, align) {
    var px = 12, w = tw(ctx, s, px, true) + 14, h = 20;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.save();
    rr(ctx, lx, y - h / 2, w, h, 4);
    ctx.fillStyle = state === 'hot' ? K.gold : state === 'off' ? '#9a9384' : '#fbf6ea'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = state === 'off' ? '#6a6456' : K.edge; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5, px, state === 'off' ? '#4a4538' : K.ink, 'center', true);
    if (state === 'off') { ctx.beginPath(); ctx.moveTo(lx + 4, y + 6); ctx.lineTo(lx + w - 4, y - 6); ctx.lineWidth = 2; ctx.strokeStyle = K.red; ctx.stroke(); }
    ctx.restore();
    return w;
  }
  // 區塊標題: 小羊皮紙籤
  function caption(ctx, s, x, y) {
    var w = tw(ctx, s, 12, true) + 16;
    ctx.save();
    rr(ctx, x, y - 10, w, 20, 3); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    circle(ctx, x + 5, y, 1.8); ctx.fillStyle = K.inkDim; ctx.fill();
    text(ctx, s, x + 10, y + 0.5, 12, K.ink, 'left', true);
    ctx.restore();
  }
  // 列(凹槽): 作用中 = 金邊 + 左側金色指標 ▶
  function groove(ctx, x, y, w, h, label, on) {
    ctx.save();
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = on ? '#33261a' : K.groove; ctx.fill();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 6); ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? K.gold : 'rgba(0,0,0,0.6)'; ctx.stroke();
    if (on) {
      poly(ctx, [x - 13, y + h / 2 - 9, x - 1, y + h / 2, x - 13, y + h / 2 + 9]); ctx.fillStyle = K.gold; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    }
    text(ctx, label, x + 10, y + 11, 12, on ? K.gold : '#c9b896', 'left', true, 3, K.edge);
    ctx.restore();
  }

  // ---------- 各部件 ----------
  function hud(ctx) {
    ctx.save();
    ctx.fillStyle = K.board; ctx.fillRect(0, 0, 1280, 44);
    ctx.fillStyle = K.plank; ctx.fillRect(0, 0, 1280, 21);
    ctx.fillStyle = K.seam; ctx.fillRect(0, 21, 1280, 1.5);
    ctx.fillStyle = K.edge; ctx.fillRect(0, 41, 1280, 3);
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = 8 + i * 168, bump = i === 0;
      rr(ctx, x0, 5, 160, 32, 5); ctx.fillStyle = K.parch; ctx.fill();
      ctx.lineWidth = bump ? 3 : 1.5; ctx.strokeStyle = bump ? K.gold : K.edge; ctx.stroke();
      circle(ctx, x0 + 6, 21, 1.8); ctx.fillStyle = K.inkDim; ctx.fill();
      matIcon(ctx, k, x0 + 24, 21, 22);
      ctx.save(); ctx.translate(x0 + 40, 22); if (bump) ctx.scale(1.22, 1.22);
      text(ctx, String(STOCK[k]), 0, 0, 20, K.ink, 'left', true);
      ctx.restore();
      text(ctx, '+' + f1(RATE[k]) + '/分', x0 + 96, 14, 11, KIND_DARK[k], 'left', true);
      text(ctx, KIND_USE[k], x0 + 96, 29, 10, K.inkDim, 'left', true);
    }
    // 關卡內才有的部分
    var sx = 712;
    clsIcon(ctx, 'sword', sx, 21, 22);
    ctx.lineWidth = 3.5; circle(ctx, sx, 21, 15.5); ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, 21, 15.5, -Math.PI / 2, -Math.PI / 2 + TAU * 0.62); ctx.strokeStyle = K.parch; ctx.stroke();
    key(ctx, 'X', sx + 33, 20, 11, false);
    for (i = 0; i < 3; i++) {
      heartShape(ctx, 778 + i * 24, 21, 1.25);
      if (i < 2) { ctx.fillStyle = C('hp', '#ff4d5e'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.parch; ctx.stroke(); }
      else { ctx.lineWidth = 1.8; ctx.strokeStyle = '#8a7a60'; ctx.stroke(); }
    }
    rr(ctx, 850, 5, 92, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    circle(ctx, 866, 21, 7); ctx.lineWidth = 2; ctx.strokeStyle = K.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(866, 21); ctx.lineTo(866, 16.5); ctx.moveTo(866, 21); ctx.lineTo(869.5, 21); ctx.stroke();
    text(ctx, '8.4s', 879, 22, 18, K.ink, 'left', true);
    rr(ctx, 952, 5, 318, 32, 5); ctx.fillStyle = '#e6d6b2'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '這趟', 962, 22, 12, K.inkDim, 'left', true);
    for (i = 0; i < 4; i++) {
      var kk = KINDS[i], rx = 1000 + i * 66;
      matIcon(ctx, kk, rx + 9, 21, 17);
      text(ctx, String(RUN[kk]), rx + 21, 22, 16, RUN[kk] > 0 ? K.ink : '#a39478', 'left', true);
    }
    ctx.restore();
  }

  function soundBtn(ctx, cx, cy, on) {
    ctx.save();
    circle(ctx, cx, cy + 2, 15); ctx.fillStyle = K.edge; ctx.fill();
    circle(ctx, cx, cy, 15); ctx.fillStyle = K.board; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? K.parch : '#8a7a60'; ctx.stroke();
    speaker(ctx, cx - 1.5, cy, 1, on, on ? K.parch : '#8a7a60');
    ctx.restore();
  }

  function card(ctx, x, y, o) {
    ctx.save();
    var lift = o.sel ? 3 : 0;
    if (lift) { rr(ctx, x + 3, y + 4, 176, 136, 8); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill(); }
    y -= lift;
    var tint = { sealed: '#241b14', buyable: '#3a2a1f', open: '#3a2a1f', cleared: '#2e3322' }[o.state];
    board(ctx, x, y, 176, 136, tint);
    // 狀態邊: 已過關綠、可解鎖金色虛線、已開放米色、封鎖無
    rr(ctx, x + 1.5, y + 1.5, 173, 133, 8);
    if (o.state === 'cleared') { ctx.lineWidth = 3; ctx.strokeStyle = K.greenLt; ctx.stroke(); }
    else if (o.state === 'buyable') { ctx.setLineDash([7, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = K.gold; ctx.stroke(); ctx.setLineDash([]); }
    else if (o.state === 'open') { ctx.lineWidth = 2; ctx.strokeStyle = '#c9b896'; ctx.stroke(); }
    // 縮圖區
    if (o.state === 'cleared' || o.state === 'open') {
      ctx.fillStyle = K.edge; ctx.fillRect(x + 7, y + 7, 162, 92);
      if (o.state === 'cleared') thumb(ctx, x + 8, y + 8, 160, 90, o.theme, o.seed, 'sword');
      else { ctx.fillStyle = C('bg', '#1a2233'); ctx.fillRect(x + 8, y + 8, 160, 90); text(ctx, '尚無回放', x + 88, y + 53, 12, '#7d8aa6', 'center', true); }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 8, y + 8, 160, 90);
      lockIcon(ctx, x + 88, y + 40, 30, o.state === 'sealed' ? '#6a5e4c' : K.gold);
      rr(ctx, x + 20, y + 68, 136, 24, 4); ctx.fillStyle = o.state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
      cost(ctx, o.cost, x + 88, y + 80, 13, 'center');
    }
    if (o.accel) {
      rr(ctx, x + 120, y + 11, 45, 17, 4); ctx.fillStyle = C('time', '#3fd6ea'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      text(ctx, o.accel, x + 142.5, y + 20, 11, '#06262c', 'center', true);
    }
    if (o.newArea) {
      rr(ctx, x + 11, y + 11, 46, 17, 4); ctx.fillStyle = C('newArea', '#ff8a3d'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      text(ctx, '新區域', x + 34, y + 20, 11, '#ffffff', 'center', true);
    }
    // 名牌(羊皮紙條)
    rr(ctx, x + 6, y + 102, 164, 30, 4); ctx.fillStyle = o.state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
    text(ctx, o.idx + ' ' + o.name, x + 11, y + 111, 12, o.state === 'sealed' ? '#5e5240' : K.ink, 'left', true);
    if (o.state === 'cleared') {
      clsIcon(ctx, 'sword', x + 76, y + 111, 12); text(ctx, o.time + 's', x + 84, y + 111.5, 11, K.ink, 'left', true);
      text(ctx, '工程 ' + o.rep + '/3', x + 165, y + 111.5, 10, o.rep >= 3 ? K.green : K.inkDim, 'right', true);
      for (var i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, x + 15 + i * 40, y + 124.5, 11); text(ctx, f1(o.rates[k]), x + 22 + i * 40, y + 125, 10, K.ink, 'left', true); }
    } else if (o.state === 'open') {
      text(ctx, '工程 0/3', x + 165, y + 111.5, 10, K.inkDim, 'right', true);
      text(ctx, '未過關', x + 11, y + 125, 11, K.inkDim, 'left', true);
    } else if (o.state === 'buyable') {
      text(ctx, '可解鎖', x + 11, y + 125, 11, K.goldDeep, 'left', true);
    } else {
      text(ctx, '前一關未過', x + 11, y + 125, 11, '#5e5240', 'left', true);
    }
    if (o.state === 'sealed') { rr(ctx, x, y, 176, 136, 8); ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fill(); }
    if (o.sel) {
      rr(ctx, x - 4, y - 4, 184, 144, 11); ctx.lineWidth = 4; ctx.strokeStyle = K.gold; ctx.stroke();
      poly(ctx, [x + 80, y - 6, x + 96, y - 6, x + 88, y + 4]); ctx.fillStyle = K.gold; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    }
    ctx.restore();
  }

  function levelPanel(ctx, X, Y, W, H) {
    board(ctx, X, Y, W, H);
    text(ctx, '第 1 關 草原', X + 18, Y + 24, 20, K.creamText, 'left', true, 4, K.edge);
    keyAct(ctx, 'X', '關閉', X + W - 78, Y + 24, 12, false);
    var gx = X + 24, gw = W - 40;
    // 職業列(非作用列: 選中格只有深色框)
    groove(ctx, gx, Y + 44, gw, 110, '職業', false);
    var cls = [['sword', true], ['hunter', true], ['bomber', false]];
    for (var i = 0; i < 3; i++) {
      var cx = gx + 8 + i * 146, cy = Y + 64, owned = cls[i][1];
      var ty = tag(ctx, cx, cy, 138, 82, i === 0 ? 'cold' : null, owned ? 'normal' : 'dim');
      hero(ctx, cls[i][0], cx + 22, ty + 44, 1.05, owned ? 1 : 0.4);
      if (!owned) lockIcon(ctx, cx + 22, ty + 46, 20, '#4a3e2e');
      text(ctx, CLS_NAME[cls[i][0]], cx + 44, ty + 18, 15, owned ? K.ink : '#5e5240', 'left', true);
      text(ctx, CLS_GOOD[cls[i][0]], cx + 44, ty + 38, 11, K.inkDim, 'left', true);
      if (!owned) text(ctx, '到升級所招募', cx + 44, ty + 62, 11, '#8a3a1a', 'left', true);
      else if (i === 0) act(ctx, 'Z 出發', cx + 44, ty + 62, 'idle', 'left');
    }
    // 工程列(作用列)
    groove(ctx, gx, Y + 164, gw, 146, '工程', true);
    var sites = [
      { st: 'done', role: 'treasure', kind: '堵塞隧道' },
      { st: 'open', role: 'shortcut', kind: '崩梯', cost: { wood: 0, stone: 15, time: 0, soul: 0 } },
      { st: 'hidden' }
    ];
    for (i = 0; i < 3; i++) {
      var s = sites[i], sx = gx + 8 + i * 146, sy = Y + 186, sel = i === 1;
      var yy = tag(ctx, sx, sy, 138, 114, sel ? 'hot' : null, s.st === 'done' ? 'done' : s.st === 'hidden' ? 'fog' : 'normal');
      var mid = sx + 69;
      text(ctx, '工程 ' + (i + 1), mid, yy + 13, 12, K.ink, 'center', true);
      if (s.st === 'hidden') {
        ctx.save(); rr(ctx, sx + 2, yy + 22, 134, 88, 5); ctx.clip();
        for (var b = 0; b < 5; b++) { ell(ctx, sx + 16 + b * 28, yy + 60 + (b % 2) * 14, 26, 16); ctx.fillStyle = b % 2 ? 'rgba(230,230,226,0.45)' : 'rgba(140,140,136,0.45)'; ctx.fill(); }
        ctx.restore();
        text(ctx, '???', mid, yy + 56, 24, K.ink, 'center', true);
        text(ctx, '先修工程 2', mid, yy + 92, 12, K.ink, 'center', true);
      } else {
        roleMark(ctx, s.role, mid, yy + 40, 1, s.st === 'done');
        var rc = s.st === 'done' ? K.inkDim : (s.role === 'shortcut' ? '#106d93' : '#8a5f00');
        text(ctx, (s.role === 'shortcut' ? '捷徑' : '寶區') + ' · ' + s.kind, mid, yy + 66, 12, rc, 'center', true);
        if (s.st === 'done') text(ctx, '✓ 已完工', mid, yy + 92, 14, K.green, 'center', true);
        else { cost(ctx, s.cost, sx + 10, yy + 92, 13, 'left'); act(ctx, 'Z 修復', sx + 130, yy + 92, sel && canPay(s.cost) ? 'hot' : 'idle', 'right'); }
      }
    }
    // 道具格列
    groove(ctx, gx, Y + 320, gw, 96, '道具格', false);
    for (i = 0; i < 2; i++) {
      var ox = gx + 8 + i * 220, oy = Y + 340, has = i === 0;
      var y2 = tag(ctx, ox, oy, 212, 66, i === 0 ? 'cold' : null, 'normal');
      text(ctx, (i + 1) + ' 號格', ox + 8, y2 + 11, 11, K.inkDim, 'left', true);
      if (has) {
        itemIcon(ctx, 'bagWood', ox + 26, y2 + 40, 32);
        text(ctx, ITEM_NAME.bagWood, ox + 48, y2 + 32, 14, K.ink, 'left', true);
        text(ctx, ITEM_FX.bagWood, ox + 48, y2 + 51, 11, K.inkDim, 'left', true);
        act(ctx, 'Z 換道具', ox + 204, y2 + 12, 'idle', 'right');
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, ox + 70, y2 + 22, 72, 36, 5); ctx.lineWidth = 1.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
        text(ctx, '空', ox + 106, y2 + 40, 15, K.inkDim, 'center', true);
      }
    }
    // 加速器列(花費不足)
    groove(ctx, gx, Y + 426, gw, 72, '回放加速器', false);
    var ay = tag(ctx, gx + 8, Y + 446, gw - 16, 44, null, 'normal');
    text(ctx, '×1.25', gx + 18, ay + 22, 22, '#127a8c', 'left', true);
    for (i = 0; i < 2; i++) { rr(ctx, gx + 92 + i * 22, ay + 15, 17, 14, 3); ctx.fillStyle = i < 1 ? C('time', '#3fd6ea') : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.edge; ctx.stroke(); }
    text(ctx, '下一級 ×1.5', gx + 146, ay + 22, 12, K.inkDim, 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 30, soul: 0 }, gx + 236, ay + 22, 14, 'left');
    act(ctx, 'Z 購買', gx + gw - 18, ay + 22, 'off', 'right');
    keyRow(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '確定'], ['X', '關閉']], X + W / 2, Y + H - 14, 12);
  }

  function backpack(ctx, X, Y, W, H) {
    board(ctx, X, Y, W, H);
    text(ctx, '背包 → 裝到 1 號格', X + 16, Y + 20, 15, K.creamText, 'left', true, 4, K.edge);
    var items = [['bagWood', '1關1號', 'here'], ['horn', '3關2號'], ['glove', '未裝', 'cur'], ['heart', '未裝'], ['soulLamp', '6關1號'], ['bagStone', '未裝']];
    for (var i = 0; i < 12; i++) {
      var col = i % 6, row = Math.floor(i / 6), cx = X + 13 + col * 52, cy = Y + 40 + row * 64;
      if (i >= 11) continue;
      if (i < items.length) {
        var it = items[i], cur = it[2] === 'cur';
        var yy = tag(ctx, cx, cy, 46, 56, cur ? 'hot' : null, 'normal');
        itemIcon(ctx, it[0], cx + 23, yy + 22, 30);
        var here = it[2] === 'here';
        rr(ctx, cx + 2, yy + 40, 42, 14, 3); ctx.fillStyle = here ? K.gold : (it[1] === '未裝' ? 'transparent' : '#e0d2b0'); if (here || it[1] !== '未裝') ctx.fill();
        text(ctx, it[1], cx + 23, yy + 47.5, 10, it[1] === '未裝' ? K.inkDim : K.ink, 'center', true);
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, cx + 0.5, cy + 0.5, 45, 55, 6); ctx.lineWidth = 1.2; ctx.strokeStyle = '#8a7a60'; ctx.stroke(); ctx.restore();
      }
    }
    var dy = Y + 172;
    var y3 = tag(ctx, X + 12, dy, W - 24, H - 184, null, 'normal');
    itemIcon(ctx, 'glove', X + 38, y3 + 24, 34);
    text(ctx, ITEM_NAME.glove, X + 62, y3 + 15, 15, K.ink, 'left', true);
    text(ctx, ITEM_FX.glove, X + 62, y3 + 34, 12, K.inkDim, 'left', true);
    key(ctx, 'Z', X + W - 96, y3 + 24, 12, true); text(ctx, '裝上', X + W - 84, y3 + 24.5, 12, K.ink, 'left', true);
    key(ctx, 'X', X + W - 44, y3 + 24, 12, false); text(ctx, '返回', X + W - 32, y3 + 24.5, 12, K.ink, 'left', true);
  }

  function result(ctx, X, Y, W, H) {
    board(ctx, X, Y, W, H, '#2f3322');
    // 綠色過關緞帶
    poly(ctx, [X + W / 2 - 70, Y + 8, X + W / 2 + 70, Y + 8, X + W / 2 + 60, Y + 21, X + W / 2 + 70, Y + 34, X + W / 2 - 70, Y + 34, X + W / 2 - 60, Y + 21]);
    ctx.fillStyle = K.green; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '過關', X + W / 2, Y + 21.5, 18, '#ffffff', 'center', true, 3, '#14361f');
    text(ctx, '這一趟獲得', X + 16, Y + 50, 12, '#c9b896', 'left', true, 3, K.edge);
    for (var i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, X + 104 + i * 56, Y + 50, 17); text(ctx, String(RUN[k]), X + 116 + i * 56, Y + 50.5, 14, K.creamText, 'left', true, 3, K.edge); }
    var ty = tag(ctx, X + 12, Y + 64, W - 24, 150, null, 'normal');
    var cA = X + 172, cB = X + 268;
    text(ctx, '這一趟', cA, ty + 13, 12, K.ink, 'center', true);
    text(ctx, '目前回放', cB, ty + 13, 12, K.ink, 'center', true);
    ctx.fillStyle = 'rgba(60,40,20,0.35)'; ctx.fillRect(X + 20, ty + 24, W - 40, 1);
    text(ctx, '職業 / 秒數', X + 22, ty + 38, 11, K.inkDim, 'left', true);
    clsIcon(ctx, 'hunter', cA - 30, ty + 38, 16); text(ctx, '10.9 秒', cA - 18, ty + 38.5, 13, K.green, 'left', true);
    clsIcon(ctx, 'sword', cB - 30, ty + 38, 16); text(ctx, '11.8 秒', cB - 18, ty + 38.5, 13, K.inkDim, 'left', true);
    var a = [14.1, 3.3, 1.0, 1.4], b = [12.4, 3.1, 1.0, 0.8];
    for (i = 0; i < 4; i++) {
      var yy = ty + 62 + i * 22, kk = KINDS[i];
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(120,90,40,0.10)'; ctx.fillRect(X + 16, yy - 11, W - 32, 22); }
      matIcon(ctx, kk, X + 30, yy, 15); text(ctx, '每分鐘', X + 42, yy + 0.5, 11, K.inkDim, 'left', true);
      var up = a[i] > b[i], dn = a[i] < b[i];
      text(ctx, '+' + f1(a[i]) + (up ? ' ▲' : ''), cA, yy + 0.5, 13, up ? K.green : (dn ? '#a39478' : K.ink), 'center', true);
      text(ctx, '+' + f1(b[i]) + (dn ? ' ▲' : ''), cB, yy + 0.5, 13, dn ? K.green : (up ? '#a39478' : K.ink), 'center', true);
    }
    keyRow(ctx, [['Z', '採用這一趟', true], ['X', '保留舊的']], X + W / 2, Y + H - 20, 12);
  }

  function upgrade(ctx, X, Y, W) {
    board(ctx, X, Y, W, 142, '#33263a');
    text(ctx, '升級所', X + 16, Y + 18, 15, K.creamText, 'left', true, 4, K.edge);
    // 選中列: 獸魂不夠
    var y1 = tag(ctx, X + 12, Y + 36, W - 24, 56, 'hot', 'normal');
    text(ctx, '移速', X + 24, y1 + 19, 16, K.ink, 'left', true);
    for (var i = 0; i < 3; i++) { rr(ctx, X + 24 + i * 20, y1 + 34, 16, 12, 2); ctx.fillStyle = i < 1 ? C('soul', '#e65ad4') : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke(); }
    text(ctx, '+8% → +16%', X + 96, y1 + 19, 13, K.ink, 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 0, soul: 20 }, X + 96, y1 + 40, 13, 'left');
    act(ctx, 'Z 升級', X + W - 22, y1 + 28, 'off', 'right');
    // 非選中列: 付得起
    var y2 = tag(ctx, X + 12, Y + 98, W - 24, 34, null, 'normal');
    text(ctx, '冷卻', X + 24, y2 + 17, 14, K.ink, 'left', true);
    text(ctx, '-0% → -15%', X + 96, y2 + 17.5, 12, K.inkDim, 'left', true);
    cost(ctx, { wood: 0, stone: 0, time: 0, soul: 8 }, X + W - 22, y2 + 17, 13, 'right');
  }

  function finishScene(ctx, X, Y, W, H) {
    ctx.save();
    rr(ctx, X, Y, W, H, 8); ctx.clip();
    var g = ctx.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, C('bg', '#1a2233')); g.addColorStop(1, C('bgLow', '#273149'));
    ctx.fillStyle = g; ctx.fillRect(X, Y, W, H);
    var th = (ART.themes && ART.themes.plain) || { top: '#63c35a', inner: '#7b5a3c' };
    ctx.fillStyle = th.inner; ctx.fillRect(X, Y + H - 26, W, 26); ctx.fillStyle = th.top; ctx.fillRect(X, Y + H - 26, W, 8);
    goalFlag(ctx, X + W - 80, Y + H - 26, 1);
    hero(ctx, 'sword', X + W - 112, Y + H - 48, 1, 1);
    // 提示牌: 掛在旗子左上, 指向旗
    var bx = X + 22, by = Y + 14, bw = 196, bh = 40;
    poly(ctx, [bx + bw - 30, by + bh, bx + bw - 14, by + bh, bx + bw - 10, by + bh + 14]); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, bx, by, bw, bh, 6); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = K.gold; ctx.stroke();
    text(ctx, '按', bx + 16, by + 20.5, 16, K.ink, 'left', true);
    key(ctx, '↓', bx + 54, by + 19, 16, true);
    text(ctx, '完成關卡', bx + 76, by + 20.5, 16, K.ink, 'left', true);
    ctx.restore();
    rr(ctx, X + 1, Y + 1, W - 2, H - 2, 8); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
  }

  function smallPanels(ctx, X, Y) {
    board(ctx, X, Y, 236, 112);
    text(ctx, '暫停', X + 118, Y + 28, 24, K.creamText, 'center', true, 4, K.edge);
    keyRow(ctx, [['Esc', '繼續']], X + 118, Y + 62, 12);
    keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], X + 118, Y + 90, 12);
    board(ctx, X + 248, Y, 236, 112, '#4a2420');
    text(ctx, '失敗', X + 366, Y + 26, 24, '#ff7a6a', 'center', true, 4, K.edge);
    text(ctx, '這趟作廢, 素材不入帳', X + 366, Y + 54, 12, '#e8c8b8', 'center', true, 3, K.edge);
    keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], X + 366, Y + 86, 12);
  }

  function legend(ctx, X, Y, W, H) {
    board(ctx, X, Y, W, H);
    var keys = ['←', '→', '↑', '↓', 'Z', 'X', 'Esc', 'M'], x = X + 18;
    for (var i = 0; i < keys.length; i++) { var w = key(ctx, keys[i], x + 12, Y + 26, 14, false); x += w + 8; }
    text(ctx, '一般', X + 18, Y + 56, 11, '#c9b896', 'left', true, 3, K.edge);
    key(ctx, 'Z', X + 64, Y + 56, 14, true);
    text(ctx, '此刻可按(金頂)', X + 82, Y + 56.5, 11, '#c9b896', 'left', true, 3, K.edge);
    soundBtn(ctx, X + 34, Y + 90, true); text(ctx, '聲音開', X + 54, Y + 90.5, 12, K.creamText, 'left', true, 3, K.edge);
    soundBtn(ctx, X + 134, Y + 90, false); text(ctx, '聲音關', X + 154, Y + 90.5, 12, '#c9b896', 'left', true, 3, K.edge);
    key(ctx, 'M', X + 252, Y + 90, 12, false); text(ctx, '切換', X + 266, Y + 90.5, 12, K.creamText, 'left', true, 3, K.edge);
  }

  window.VISUAL_OPTION = {
    element: 'ui', id: 'A', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      ctx.save();
      if (ART.drawMapBackground) ART.drawMapBackground(ctx); else { ctx.fillStyle = '#15242a'; ctx.fillRect(0, 0, 1280, 720); }
      hud(ctx);
      soundBtn(ctx, 1252, 64, true);
      // 左欄: 大地圖卡片(已過關 + 選中 / 已開放 / 可解鎖但木材不夠 / 封鎖)
      caption(ctx, '大地圖關卡卡片', 16, 60);
      card(ctx, 24, 82, { state: 'cleared', idx: 1, name: '草原', theme: 'plain', seed: 0.5, time: '11.8', rep: 2, rates: RATE, accel: '×1.25', newArea: true, sel: true });
      card(ctx, 216, 82, { state: 'open', idx: 3, name: '野豬峽谷' });
      card(ctx, 24, 236, { state: 'buyable', idx: 4, name: '蜂巢高塔', cost: { wood: 50, stone: 0, time: 0, soul: 0 } });
      card(ctx, 216, 236, { state: 'sealed', idx: 8, name: '王座', cost: { wood: 100, stone: 0, time: 0, soul: 0 } });
      upgrade(ctx, 16, 386, 384);
      caption(ctx, '終點提示', 16, 546);
      finishScene(ctx, 16, 560, 384, 144);
      // 中欄: 關卡面板(工程列作用中)+ 暫停 / 失敗
      levelPanel(ctx, 424, 54, 488, 528);
      smallPanels(ctx, 424, 592);
      // 右欄: 背包 / 結算比較 / 鍵帽與聲音
      backpack(ctx, 928, 88, 336, 236);
      result(ctx, 928, 334, 336, 248);
      legend(ctx, 928, 592, 336, 112);
      ctx.restore();
    }
  };
})();
