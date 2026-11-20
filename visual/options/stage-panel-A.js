/* 關卡準備頁 方案 A — 作戰桌: 左邊大預覽(含修復狀態、迷霧、工程號碼釘)+ 下方最佳紀錄 / 產量;
 * 右邊由上而下五列決策清單 ①職業 ②修工程 ③道具格 ④加速器 ⑤開始挑戰, ↑↓ 換列、←→ 列內選擇、Z 確定。
 * 介面語言沿用 ui 方案 A(木板 + 羊皮紙牌 + 石鍵帽), 素材圖示沿用 materials 方案 C。只用 Canvas 2D。 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var ART = (typeof window !== 'undefined' && window.Art) || {};
  var PAL = ART.palette || {};
  function C(k, d) { return PAL[k] || d; }
  var KINDS = ['wood', 'stone', 'time', 'soul'];
  var KIND_USE = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var KIND_DARK = { wood: '#7a4a1e', stone: '#4c5562', time: '#127a8c', soul: '#8e2a80' };
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var ROLE_NAME = { shortcut: '捷徑', treasure: '寶區', nest: '巢穴' };
  var ROLE_INK = { shortcut: '#106d93', treasure: '#8a5f00', nest: '#7a2aa8' };
  var ITEM_NAME = { bagWood: '木材袋', bagStone: '石料袋', bagTime: '時晶袋', soulLamp: '魂燈', glove: '拾荒手套', horn: '獵人號角', heart: '巢母之心' };
  var ITEM_FX = { bagWood: '每次通關 +4 木材', bagStone: '每次通關 +3 石料', bagTime: '每次通關 +2 時晶', soulLamp: '每次通關 +2 獸魂', glove: '撿到的素材 +1', horn: '打倒怪物掉落 ×2', heart: '打倒怪物掉落 ×2、通關 +4 獸魂' };

  // ---------- 範例資料(三個方案共用同一個情境, 方便比較) ----------
  // 第 1 關草原: 工程 1 已完工(地洞寶區)、工程 2 已露出可修(崩梯捷徑, 石料夠)、工程 3 還在迷霧裡;
  // 加速器下一級時晶不夠(示範「錢不夠」); 作用中的是工程列、選中工程 2。
  var STOCK = { wood: 38, stone: 42, time: 17, soul: 9 };
  var RATE = { wood: 12.4, stone: 5.0, time: 2.1, soul: 0.8 };
  var LV = { idx: 1, name: '草原', recCls: 'sword', recTime: 11.8, rates: { wood: 6.1, stone: 2.4, time: 1.5, soul: 0.8 }, newArea: true, accelLv: 1 };
  var ACCEL_COST = { time: 30 };
  var CLASSES = [{ cls: 'sword', owned: true }, { cls: 'hunter', owned: true }, { cls: 'bomber', owned: false }];
  var CLS_SEL = 0;
  var SITES = [
    { st: 'done', role: 'treasure', kind: '堵塞隧道', cost: { stone: 8 }, fx: ['小丘腳下的地洞', '木材、石料、寶箱'] },
    { st: 'open', role: 'shortcut', kind: '崩梯', cost: { stone: 15 }, fx: ['從地洞盡頭直上丘後岩棚', '比翻過小丘快約 2 秒'] },
    { st: 'hidden', role: 'treasure', kind: '斷橋', cost: { stone: 25 } }
  ];
  var SITE_SEL = 1;
  var SLOTS = ['bagWood', null];

  // ---------- 共用小工具(介面語言沿用 ui 方案 A) ----------
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
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || 'rgba(20,12,6,0.95)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }

  // 素材圖示: materials 方案 C(立體寶物: 麻繩原木堆 / 等角石方 / 青色晶簇 / 獸眼魂火)
  var INK = '#1a1420';
  var MC = {
    wood: '#b8682a', woodLight: '#f2c88c', woodDark: '#6a3a14',
    stone: '#a9b3be', stoneLight: '#e6ebf0', stoneDark: '#5e6874',
    time: '#3fd6ea', timeLight: '#d2fbff', timeDark: '#137c90',
    soul: '#d94bc6', soulLight: '#ffc6f4', soulDark: '#6e1a62'
  };
  function lin(ctx, x0, y0, x1, y1, stops) {
    var gr = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]);
    return gr;
  }
  function rad(ctx, x, y, r0, r1, stops) {
    var gr = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (var i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]);
    return gr;
  }
  function sparkle(ctx, x, y, r) {
    poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]);
    ctx.fillStyle = '#ffffff'; ctx.fill();
  }
  function crystal(ctx, sx, rot, lw) {
    ctx.save(); ctx.translate(sx, 5.2); ctx.rotate(rot);
    poly(ctx, [0, -7.4, 2.4, -4.4, 2.4, 2.6, -2.4, 2.6, -2.4, -4.4]);
    ctx.fillStyle = lin(ctx, -2.4, 0, 2.4, 0, [0, MC.timeLight, 0.5, MC.time, 1, MC.timeDark]); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
  function matIcon(ctx, kind, cx, cy, sz) {
    var k = sz / 20, detail = sz >= 15, lw = detail ? 1.5 : 1.9, i;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'wood') {
      ctx.translate(-0.4, 0.9);
      var ends = [[-0.8, 3.6], [6.8, 3.6], [3, -3.2]], dx = -5.2, dy = -2.2, R = 3.5;
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(ends[i][0], ends[i][1]); ctx.lineTo(ends[i][0] + dx, ends[i][1] + dy);
        ctx.lineWidth = R * 2 + lw * 2; ctx.strokeStyle = INK; ctx.stroke();
        ctx.lineWidth = R * 2; ctx.strokeStyle = lin(ctx, 0, ends[i][1] - R, 0, ends[i][1] + R, [0, MC.wood, 1, MC.woodDark]); ctx.stroke();
      }
      if (detail) { ctx.beginPath(); ctx.moveTo(-1.6, -7.2); ctx.lineTo(-3.8, 6.4); ctx.lineWidth = 1.6; ctx.strokeStyle = '#e7d39a'; ctx.stroke(); }
      for (i = 0; i < 3; i++) {
        ell(ctx, ends[i][0], ends[i][1], R * 0.86, R);
        ctx.fillStyle = rad(ctx, ends[i][0] - 0.8, ends[i][1] - 1, 0.3, R, [0, '#fff0cf', 1, MC.woodLight]); ctx.fill();
        ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        if (detail) { ell(ctx, ends[i][0], ends[i][1], R * 0.4, R * 0.48); ctx.lineWidth = 0.9; ctx.strokeStyle = MC.woodDark; ctx.stroke(); }
      }
    } else if (kind === 'stone') {
      poly(ctx, [0, -9.4, 9, -4.7, 0, 0, -9, -4.7]); ctx.fillStyle = lin(ctx, 0, -9.4, 0, 0, [0, '#ffffff', 1, MC.stoneLight]); ctx.fill();
      poly(ctx, [-9, -4.7, 0, 0, 0, 9.6, -9, 4.9]); ctx.fillStyle = MC.stone; ctx.fill();
      poly(ctx, [0, 0, 9, -4.7, 9, 4.9, 0, 9.6]); ctx.fillStyle = MC.stoneDark; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, -4.7); ctx.lineTo(0, 0); ctx.lineTo(9, -4.7); ctx.moveTo(0, 0); ctx.lineTo(0, 9.6);
      ctx.lineWidth = detail ? 0.9 : 1.2; ctx.strokeStyle = 'rgba(26,20,32,0.7)'; ctx.stroke();
      if (detail) {
        ctx.beginPath(); ctx.moveTo(-6.4, 0.2); ctx.lineTo(-3.4, 2.4); ctx.lineTo(-4.6, 5.2);
        ctx.moveTo(3.2, 2.2); ctx.lineTo(6, 0.8);
        ctx.lineWidth = 0.9; ctx.strokeStyle = MC.stoneDark; ctx.stroke();
      }
      poly(ctx, [0, -9.4, 9, -4.7, 9, 4.9, 0, 9.6, -9, 4.9, -9, -4.7]); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    } else if (kind === 'time') {
      if (detail) { circle(ctx, 0, 1, 12.5); ctx.fillStyle = rad(ctx, 0, 1, 2, 12.5, [0, 'rgba(63,214,234,0.55)', 1, 'rgba(63,214,234,0)']); ctx.fill(); }
      crystal(ctx, -5.6, -0.5, lw); crystal(ctx, 5.6, 0.5, lw);
      var m = [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, -3.8, 6, -3.8, -6];
      poly(ctx, m); ctx.fillStyle = MC.time; ctx.fill();
      poly(ctx, [0, -10.4, 0, 9.4, -3.8, 6, -3.8, -6]); ctx.fillStyle = MC.timeLight; ctx.fill();
      poly(ctx, [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, 1.4, 6, 1.4, -6]); ctx.fillStyle = MC.timeDark; ctx.globalAlpha *= 0.55; ctx.fill(); ctx.globalAlpha /= 0.55;
      poly(ctx, m); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
      if (detail) sparkle(ctx, -6.4, -6.4, 2.6);
    } else {
      if (detail) { circle(ctx, 0, 1.5, 12.5); ctx.fillStyle = rad(ctx, 0, 1.5, 2, 12.5, [0, 'rgba(230,90,212,0.55)', 1, 'rgba(230,90,212,0)']); ctx.fill(); }
      ctx.beginPath();
      ctx.moveTo(0.6, -10.4);
      ctx.bezierCurveTo(2.4, -6.4, 7.6, -4.4, 7.6, 2.4);
      ctx.bezierCurveTo(7.6, 6.8, 4.2, 9.6, 0, 9.6);
      ctx.bezierCurveTo(-4.2, 9.6, -7.6, 6.8, -7.6, 2.4);
      ctx.bezierCurveTo(-7.6, -1.6, -5, -3.4, -3.6, -6.2);
      ctx.quadraticCurveTo(-2.6, -3.4, -1.2, -3.8);
      ctx.quadraticCurveTo(-1.6, -7.6, 0.6, -10.4);
      ctx.closePath();
      ctx.fillStyle = rad(ctx, -1.6, 1.4, 0.5, 9.6, [0, MC.soulLight, 0.45, MC.soul, 1, MC.soulDark]); ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#ffe14a';
      poly(ctx, [-5, 1.2, -1.2, 2.4, -1.6, 4.2, -4.6, 3.4]); ctx.fill();
      poly(ctx, [5, 1.2, 1.2, 2.4, 1.6, 4.2, 4.6, 3.4]); ctx.fill();
      if (detail) sparkle(ctx, 5.6, -6, 2.2);
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
  function speaker(ctx, cx, cy, s, on, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    poly(ctx, [-8, -3, -4, -3, 1, -8, 1, 8, -4, 3, -8, 3]); ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (on) { ctx.beginPath(); ctx.arc(2, 0, 4.5, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(2, 0, 8, -0.9, 0.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(10, 4); ctx.moveTo(10, -4); ctx.lineTo(4, 4); ctx.stroke(); }
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

  // ---------- ui 方案 A 的造型語言: 木板面板 / 羊皮紙牌 / 石鍵帽 ----------
  var K = {
    board: '#3a2a1f', plank: '#45321f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a',
    groove: '#2a1d14', parch: '#efe3c6', parchShade: '#d8c9a6', parchDim: '#b8ab8e',
    ink: '#2b2118', inkDim: '#76664e', gold: '#ffd84a', goldDeep: '#b8860b',
    red: '#c8202c', green: '#2f8f55', greenLt: '#4fd18b', creamText: '#f3e6c8', labelDim: '#c9b896'
  };
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
  // 羊皮紙牌: sel = 'hot'(作用中列的選中: 金框 + 上浮 + 吊牌三角) / 'cold'(非作用列的選中: 深色雙框) / null
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
  function fogBlobs(ctx, x, y, w, h) {
    ctx.save(); rr(ctx, x, y, w, h, 5); ctx.clip();
    var n = Math.max(3, Math.round(w / 28));
    for (var b = 0; b < n; b++) { ell(ctx, x + 10 + b * (w - 20) / (n - 1), y + h * 0.45 + (b % 2) * h * 0.18, 26, 16); ctx.fillStyle = b % 2 ? 'rgba(230,230,226,0.45)' : 'rgba(140,140,136,0.45)'; ctx.fill(); }
    ctx.restore();
  }
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
  function cost(ctx, c, x, y, px, align, inkCol) {
    var items = [], i;
    for (i = 0; i < KINDS.length; i++) { var k = KINDS[i], v = c[k] || 0; if (v > 0) items.push([k, v, STOCK[k] < v ? v - STOCK[k] : 0]); }
    var isz = px * 1.25, ws = [], total = 0;
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
      text(ctx, s, nx, y + 0.5, px, items[i][2] ? K.red : (inkCol || K.ink), 'left', true);
      if (items[i][2]) {
        var bx = nx + tw(ctx, s, px, true) + 4, bs = '缺 ' + items[i][2], bw = tw(ctx, bs, px * 0.78, true) + 8;
        rr(ctx, bx, y - px * 0.62, bw, px * 1.24, 3); ctx.fillStyle = K.red; ctx.fill();
        text(ctx, bs, bx + bw / 2, y + 0.5, px * 0.78, '#ffffff', 'center', true);
      }
      cx += ws[i];
    }
    return total;
  }
  function canPay(c) { for (var i = 0; i < KINDS.length; i++) if ((c[KINDS[i]] || 0) > STOCK[KINDS[i]]) return false; return true; }
  // 動作章: 'hot' 金底 / 'idle' 米白 / 'off' 灰 + 紅斜線(付不起)
  function act(ctx, s, x, y, state, align, px) {
    px = px || 12;
    var w = tw(ctx, s, px, true) + px * 1.2, h = px * 1.7;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.save();
    if (state === 'hot') { rr(ctx, lx, y - h / 2 + 3, w, h, 4); ctx.fillStyle = K.goldDeep; ctx.fill(); }
    rr(ctx, lx, y - h / 2, w, h, 4);
    ctx.fillStyle = state === 'hot' ? K.gold : state === 'off' ? '#9a9384' : '#fbf6ea'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = state === 'off' ? '#6a6456' : K.edge; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5, px, state === 'off' ? '#4a4538' : K.ink, 'center', true);
    if (state === 'off') { ctx.beginPath(); ctx.moveTo(lx + 4, y + h / 2 - 4); ctx.lineTo(lx + w - 4, y - h / 2 + 4); ctx.lineWidth = 2; ctx.strokeStyle = K.red; ctx.stroke(); }
    ctx.restore();
    return w;
  }
  function caption(ctx, s, x, y) {
    var w = tw(ctx, s, 12, true) + 16;
    ctx.save();
    rr(ctx, x, y - 10, w, 20, 3); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    circle(ctx, x + 5, y, 1.8); ctx.fillStyle = K.inkDim; ctx.fill();
    text(ctx, s, x + 10, y + 0.5, 12, K.ink, 'left', true);
    ctx.restore();
    return w;
  }
  function groove(ctx, x, y, w, h, label, on) {
    ctx.save();
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = on ? '#33261a' : K.groove; ctx.fill();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 6); ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? K.gold : 'rgba(0,0,0,0.6)'; ctx.stroke();
    if (on) { poly(ctx, [x - 13, y + h / 2 - 9, x - 1, y + h / 2, x - 13, y + h / 2 + 9]); ctx.fillStyle = K.gold; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
    if (label) text(ctx, label, x + 10, y + 11, 12, on ? K.gold : K.labelDim, 'left', true, 3, K.edge);
    ctx.restore();
  }
  // 新區域提醒(修好後還沒跑過)
  function newAreaChip(ctx, x, y, align, s) {
    s = s || '修好後還沒跑過';
    var w = tw(ctx, s, 11, true) + 14, lx = align === 'right' ? x - w : x;
    rr(ctx, lx, y - 10, w, 20, 4); ctx.fillStyle = C('newArea', '#ff8a3d'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5, 11, '#ffffff', 'center', true);
    return w;
  }
  function accelPips(ctx, x, y, lv) {
    for (var i = 0; i < 2; i++) { rr(ctx, x + i * 20, y - 7, 16, 14, 3); ctx.fillStyle = i < lv ? MC.time : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.edge; ctx.stroke(); }
  }

  // 資訊列(大地圖模式: 四種素材持有數 + 每分鐘產量 + 用途), 沿用 ui 方案 A
  function hud(ctx) {
    ctx.save();
    ctx.fillStyle = K.board; ctx.fillRect(0, 0, 1280, 44);
    ctx.fillStyle = K.plank; ctx.fillRect(0, 0, 1280, 21);
    ctx.fillStyle = K.seam; ctx.fillRect(0, 21, 1280, 1.5);
    ctx.fillStyle = K.edge; ctx.fillRect(0, 41, 1280, 3);
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = 8 + i * 168;
      rr(ctx, x0, 5, 160, 32, 5); ctx.fillStyle = K.parch; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      circle(ctx, x0 + 6, 21, 1.8); ctx.fillStyle = K.inkDim; ctx.fill();
      matIcon(ctx, k, x0 + 24, 21, 22);
      text(ctx, String(STOCK[k]), x0 + 40, 22, 20, K.ink, 'left', true);
      text(ctx, '+' + f1(RATE[k]) + '/分', x0 + 96, 14, 11, KIND_DARK[k], 'left', true);
      text(ctx, KIND_USE[k], x0 + 96, 29, 10, K.inkDim, 'left', true);
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

  // ---------- 關卡預覽(世界座標 1280×720, 32×18 格; 呼叫端負責縮放) ----------
  // 第 1 關草原示意: 左起點 → 小丘(腳下地洞 = 工程 1, 已修)→ 地洞盡頭的崩梯(工程 2, 未修)→ 天空浮島(工程 3, 迷霧中) → 右終點
  var TOPS = [13, 13, 13, 13, 13, 13, 13, 13, 13, 16, 16, 11, 10, 8, 8, 8, 8, 8, 11, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13];
  function hollow(c, r) { return (c >= 11 && c <= 17 && r >= 13 && r <= 15) || (c >= 16 && c <= 17 && r >= 9 && r <= 12); }
  var STAIRS = [[17, 15, true], [17, 14], [16, 13], [16, 12], [17, 11], [17, 10]];
  // 工程框選範圍(世界座標): 工程 1 洞口亂石、工程 2 崩梯井、工程 3 迷霧區
  var SITE_BOX = [[440, 520, 40, 120], [640, 400, 80, 240], [760, 80, 400, 200]];
  var FOG = [[640, 360, 80, 160], [760, 80, 400, 200]];
  function ground(ctx, c, r, top) {
    if (ART.drawGround) ART.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: top, theme: 'plain' });
    else { ctx.fillStyle = '#7b5a3c'; ctx.fillRect(c * 40, r * 40, 40, 40); if (top) { ctx.fillStyle = '#63c35a'; ctx.fillRect(c * 40, r * 40, 40, 10); } }
  }
  function hlBox(ctx, b, k) {
    var lw = 3 / k, pad = 4 / k;
    ctx.save();
    ctx.lineWidth = lw + 3 / k; ctx.strokeStyle = 'rgba(20,12,6,0.9)'; ctx.strokeRect(b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2);
    ctx.lineWidth = lw; ctx.strokeStyle = K.gold; ctx.strokeRect(b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2);
    // 四角括號加粗
    var L = 14 / k, x0 = b[0] - pad * 2, y0 = b[1] - pad * 2, x1 = b[0] + b[2] + pad * 2, y1 = b[1] + b[3] + pad * 2;
    ctx.lineWidth = 6 / k; ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
    ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
    ctx.moveTo(x1, y1 - L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - L, y1);
    ctx.moveTo(x0 + L, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - L);
    ctx.stroke();
    ctx.restore();
  }
  // o: { cls, hl(框選第幾處工程, -1 不框), k(目前縮放, 給線寬補償), t }
  function scene(ctx, o) {
    o = o || {};
    var k = o.k || 1, t = o.t || 0, c, r;
    ctx.save();
    if (ART.drawBackground) ART.drawBackground(ctx); else { ctx.fillStyle = '#1a2233'; ctx.fillRect(0, 0, 1280, 720); }
    for (c = 0; c < 32; c++) for (r = TOPS[c]; r < 18; r++) { if (hollow(c, r)) continue; ground(ctx, c, r, r === TOPS[c] || hollow(c, r - 1)); }
    for (c = 3; c < 6; c++) ground(ctx, c, 8, true); // 高台(鉤環上方)
    // 洞內陰影
    ctx.fillStyle = 'rgba(10,8,14,0.45)'; ctx.fillRect(440, 520, 280, 120); ctx.fillRect(640, 360, 80, 160);
    // 迷霧: 工程 2 開出的岩井、工程 3 開出的天空浮島
    for (var f = 0; f < FOG.length; f++) {
      if (ART.drawFog) ART.drawFog(ctx, { x: FOG[f][0], y: FOG[f][1], w: FOG[f][2], h: FOG[f][3], alpha: 1, t: t });
      else { ctx.fillStyle = '#9fa5b2'; ctx.fillRect(FOG[f][0], FOG[f][1], FOG[f][2], FOG[f][3]); }
    }
    // 工程 2 崩梯(已露出未修: 底部碎石堆 + 極淡虛線), 畫在迷霧之上
    if (ART.drawWorksite) for (var s = 0; s < STAIRS.length; s++) ART.drawWorksite(ctx, { x: STAIRS[s][0] * 40 + 20, y: STAIRS[s][1] * 40 + 20, kind: 'stairs', repaired: false, theme: 'plain', end: false, bottom: STAIRS[s][2] === true });
    // 地上素材(materials 方案 C)
    var P = [[180, 498, 'wood'], [140, 298, 'time'], [180, 298, 'time'], [620, 298, 'wood'], [880, 498, 'stone'], [1100, 498, 'wood'], [466, 620, 'wood'], [500, 620, 'stone']];
    for (var p = 0; p < P.length; p++) matIcon(ctx, P[p][2], P[p][0], P[p][1], 22);
    if (ART.drawHookRing) ART.drawHookRing(ctx, { x: 100, y: 410 });
    if (ART.drawChest) ART.drawChest(ctx, { x: 590, y: 622, open: false });
    if (ART.drawFrog) { ART.drawFrog(ctx, { x: 540, y: 626, facing: -1, state: 'crouch', hit: false, brood: false }); ART.drawFrog(ctx, { x: 545, y: 306, facing: -1, state: 'crouch', hit: false, brood: false }); }
    if (ART.drawBoar) ART.drawBoar(ctx, { x: 300, y: 504, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
    if (ART.drawShooterBee) ART.drawShooterBee(ctx, { x: 850, y: 380, facing: -1, state: 'fly', hit: false, brood: false, t: 0 });
    if (ART.drawShieldman) ART.drawShieldman(ctx, { x: 1010, y: 498, facing: -1, state: 'walk', hit: false, brood: false, t: 0 });
    if (ART.drawSiteSign) ART.drawSiteSign(ctx, { x: 630, y: 616, role: 'shortcut' });
    if (ART.drawGoal) ART.drawGoal(ctx, { x: 1220, y: 480, reached: false });
    if (ART.drawPlayer) ART.drawPlayer(ctx, { x: 60, y: 498, cls: o.cls || 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
    if (o.hl != null && o.hl >= 0) hlBox(ctx, SITE_BOX[o.hl], k);
    ctx.restore();
  }
  // 預覽框: 左上 (x, y), 寬 w(高依 16:9), 內含縮小的 scene
  function preview(ctx, x, y, w, o) {
    var k = w / 1280, h = 720 * k;
    ctx.save();
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 6); ctx.fillStyle = K.edge; ctx.fill();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x, y); ctx.scale(k, k);
    o = o || {}; o.k = k;
    scene(ctx, o);
    ctx.restore();
    ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,215,160,0.35)'; ctx.strokeRect(x - 0.75, y - 0.75, w + 1.5, h + 1.5); ctx.restore();
    return k;
  }
  // 預覽上的工程號碼釘(世界座標 → 畫面座標由呼叫端換算): 已完工綠勾、可修金色、迷霧灰問號
  function sitePin(ctx, n, st, x, y, hot) {
    ctx.save();
    var col = st === 'done' ? K.greenLt : st === 'open' ? K.gold : '#b9b8b2';
    poly(ctx, [x - 6, y + 9, x + 6, y + 9, x, y + 18]); ctx.fillStyle = K.edge; ctx.fill();
    circle(ctx, x, y, hot ? 13 : 11); ctx.fillStyle = K.edge; ctx.fill();
    circle(ctx, x, y, hot ? 10.5 : 8.5); ctx.fillStyle = col; ctx.fill();
    text(ctx, st === 'hidden' ? '?' : String(n), x, y + 0.5, hot ? 14 : 12, K.ink, 'center', true);
    if (st === 'done') { circle(ctx, x + 9, y - 8, 5.5); ctx.fillStyle = K.green; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 6.5, y - 8); ctx.lineTo(x + 8.5, y - 6); ctx.lineTo(x + 11.5, y - 10); ctx.stroke(); }
    ctx.restore();
  }
  var PIN_AT = [[460, 500], [680, 380], [960, 180]];
  function pins(ctx, px, py, k, selIdx) {
    for (var i = 0; i < 3; i++) sitePin(ctx, i + 1, SITES[i].st, px + PIN_AT[i][0] * k, py + PIN_AT[i][1] * k, i === selIdx);
  }
  // 產量一行: 圖示 + 「+x/分」
  function ratesRow(ctx, x, y, step, px, col) {
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i];
      matIcon(ctx, k, x + i * step + px * 0.7, y, px * 1.35);
      text(ctx, '+' + f1(LV.rates[k]) + '/分', x + i * step + px * 1.55, y + 0.5, px, col || K.ink, 'left', true);
    }
  }
  function mapBackdrop(ctx) {
    if (ART.drawMapBackground) ART.drawMapBackground(ctx); else { ctx.fillStyle = '#15242a'; ctx.fillRect(0, 0, 1280, 720); }
    ctx.fillStyle = 'rgba(5,7,12,0.6)'; ctx.fillRect(0, 0, 1280, 720);
  }

  // ================= 方案 A: 作戰桌 — 左大預覽、右側由上而下五列決策清單 =================
  function classRow(ctx, x, y, on) {
    groove(ctx, x, y, 420, 116, '① 職業', on);
    for (var i = 0; i < 3; i++) {
      var c = CLASSES[i], cx = x + 8 + i * 136, sel = i === CLS_SEL;
      var ty = tag(ctx, cx, y + 22, 128, 86, sel ? (on ? 'hot' : 'cold') : null, c.owned ? 'normal' : 'dim');
      hero(ctx, c.cls, cx + 22, ty + 46, 1, c.owned ? 1 : 0.4);
      if (!c.owned) lockIcon(ctx, cx + 22, ty + 48, 20, '#4a3e2e');
      text(ctx, CLS_NAME[c.cls], cx + 42, ty + 18, 15, c.owned ? K.ink : '#5e5240', 'left', true);
      text(ctx, CLS_GOOD[c.cls], cx + 42, ty + 38, 11, K.inkDim, 'left', true);
      if (!c.owned) text(ctx, '到升級所招募', cx + 42, ty + 66, 11, '#8a3a1a', 'left', true);
      else if (sel) { rr(ctx, cx + 42, ty + 56, 52, 20, 4); ctx.fillStyle = K.green; ctx.fill(); text(ctx, '✓ 選用', cx + 68, ty + 66.5, 11, '#ffffff', 'center', true); }
    }
  }
  function siteRow(ctx, x, y, on) {
    groove(ctx, x, y, 420, 170, '② 修工程', on);
    for (var i = 0; i < 3; i++) {
      var s = SITES[i], sx = x + 8 + i * 136, sel = i === SITE_SEL;
      var yy = tag(ctx, sx, y + 24, 128, 138, sel ? (on ? 'hot' : 'cold') : null, s.st === 'done' ? 'done' : s.st === 'hidden' ? 'fog' : 'normal');
      var mid = sx + 64;
      text(ctx, '工程 ' + (i + 1), mid, yy + 15, 12, K.ink, 'center', true);
      if (s.st === 'hidden') {
        fogBlobs(ctx, sx + 2, yy + 26, 124, 108);
        text(ctx, '???', mid, yy + 66, 26, K.ink, 'center', true);
        text(ctx, '先修工程 ' + i, mid, yy + 112, 12, K.ink, 'center', true);
      } else {
        roleMark(ctx, s.role, mid, yy + 46, 1, s.st === 'done');
        text(ctx, ROLE_NAME[s.role] + ' · ' + s.kind, mid, yy + 76, 12, s.st === 'done' ? K.inkDim : ROLE_INK[s.role], 'center', true);
        if (s.st === 'done') text(ctx, '✓ 已完工', mid, yy + 112, 14, K.green, 'center', true);
        else {
          cost(ctx, s.cost, sx + 8, yy + 112, 14, 'left');
          act(ctx, 'Z 修復', sx + 122, yy + 112, sel && on && canPay(s.cost) ? 'hot' : 'idle', 'right');
        }
      }
    }
  }
  function slotRow(ctx, x, y, on) {
    groove(ctx, x, y, 420, 100, '③ 道具格', on);
    for (var i = 0; i < 2; i++) {
      var it = SLOTS[i], ox = x + 8 + i * 206, sel = i === 0;
      var y2 = tag(ctx, ox, y + 22, 198, 70, sel ? (on ? 'hot' : 'cold') : null, 'normal');
      text(ctx, (i + 1) + ' 號格', ox + 8, y2 + 11, 11, K.inkDim, 'left', true);
      if (it) {
        itemIcon(ctx, it, ox + 26, y2 + 42, 30);
        text(ctx, ITEM_NAME[it], ox + 48, y2 + 33, 14, K.ink, 'left', true);
        text(ctx, ITEM_FX[it], ox + 48, y2 + 53, 11, K.inkDim, 'left', true);
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, ox + 12, y2 + 22, 40, 40, 5); ctx.lineWidth = 1.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
        text(ctx, '空', ox + 32, y2 + 42, 15, K.inkDim, 'center', true);
        text(ctx, 'Z 打開背包選道具', ox + 62, y2 + 42, 11, K.inkDim, 'left', true);
      }
    }
  }
  function accelRow(ctx, x, y, on) {
    groove(ctx, x, y, 420, 76, '④ 回放加速器', on);
    var ay = tag(ctx, x + 8, y + 22, 404, 46, on ? 'hot' : null, 'normal');
    text(ctx, '×1.25', x + 18, ay + 23, 22, '#127a8c', 'left', true);
    accelPips(ctx, x + 88, ay + 23, LV.accelLv);
    text(ctx, '下一級 ×1.5', x + 140, ay + 23, 12, K.inkDim, 'left', true);
    cost(ctx, ACCEL_COST, x + 222, ay + 23, 14, 'left');
    act(ctx, 'Z 購買', x + 402, ay + 23, canPay(ACCEL_COST) ? (on ? 'hot' : 'idle') : 'off', 'right');
  }
  function goRow(ctx, x, y, on) {
    var yy = tag(ctx, x, y, 420, 76, on ? 'hot' : null, 'normal');
    // 左側綠色出發旗條
    rr(ctx, x, yy, 14, 76, 6); ctx.fillStyle = K.green; ctx.fill();
    hero(ctx, CLASSES[CLS_SEL].cls, x + 44, yy + 40, 1.05, 1);
    text(ctx, '開始挑戰', x + 76, yy + 27, 24, K.ink, 'left', true);
    text(ctx, CLS_NAME[CLASSES[CLS_SEL].cls] + ' 出發 · 工程 1/3 · 道具 1/2 · ×1.25', x + 76, yy + 56, 12, K.inkDim, 'left', true);
    key(ctx, 'Z', x + 384, yy + 38, 20, on);
  }

  function drawA(ctx) {
    ctx.save();
    mapBackdrop(ctx);
    hud(ctx);
    soundBtn(ctx, 1252, 64, true);
    board(ctx, 16, 52, 1196, 660);
    text(ctx, '第 ' + LV.idx + ' 關 ' + LV.name, 36, 80, 22, K.creamText, 'left', true, 4, K.edge);
    text(ctx, '出發前的規劃', 196, 81, 13, K.labelDim, 'left', true, 3, K.edge);
    keyAct(ctx, 'X', '返回大地圖', 1090, 80, 12, false);

    // 左: 關卡預覽(目前修復狀態 + 迷霧; 框選作用中的工程) + 號碼釘
    var PX = 36, PY = 108, PW = 712, k = PW / 1280;
    preview(ctx, PX, PY, PW, { cls: CLASSES[CLS_SEL].cls, hl: SITE_SEL, t: 0 });
    pins(ctx, PX, PY, k, SITE_SEL);

    // 左下: 最佳紀錄 / 產量
    var ry = tag(ctx, 32, 524, 720, 98, null, 'normal');
    text(ctx, '最佳紀錄', 48, ry + 24, 13, K.inkDim, 'left', true);
    clsIcon(ctx, LV.recCls, 130, ry + 24, 22);
    text(ctx, CLS_NAME[LV.recCls] + '  ' + f1(LV.recTime) + ' 秒', 146, ry + 25, 18, K.ink, 'left', true);
    newAreaChip(ctx, 736, ry + 24, 'right', '修好後還沒跑過 → 重跑才會走新路');
    ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(44, ry + 46, 696, 1);
    text(ctx, '每分鐘產量', 48, ry + 72, 13, K.inkDim, 'left', true);
    ratesRow(ctx, 130, ry + 72, 120, 15);
    text(ctx, '含 ×1.25 加速', 736, ry + 72, 11, '#127a8c', 'right', true);

    // 左最下: 按鍵
    groove(ctx, 32, 636, 720, 60, null, false);
    keyRow(ctx, [['↑↓', '換列'], ['←→', '列內選擇'], ['Z', '確定', true], ['X', '返回大地圖']], 392, 666, 13);

    // 右: 五列決策清單(作用中: 修工程)
    var RX = 776;
    classRow(ctx, RX, 100, false);
    siteRow(ctx, RX, 224, true);
    slotRow(ctx, RX, 402, false);
    accelRow(ctx, RX, 510, false);
    goRow(ctx, RX, 598, false);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'stage-panel', id: 'A', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) { drawA(ctx); }
  };
})();
