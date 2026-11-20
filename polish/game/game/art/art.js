/* 連環工程 — 美術模組(polish)
 * 全域物件 window.Art, 不用 ES module。全部 Canvas 2D 幾何繪製, 不引外部資源。
 * 每個函式自己 save / restore。介面: polish/game/interface.json(函式名、state 欄位一個不多一個不少)。
 * 視覺方向: visual/direction.md 選中方案(title B / hero A / ui A / materials C / monsters B / combat-fx A /
 *   replay-map B / repair-fog A / themes B / stage-panel A / skill-cd A / final-boss B / ending B / boss-stage C)。
 * 時間: 有動畫的函式優先用 state 的 t / xxT; 沒傳時間的少數待機動態(寶箱閃光、旗飄、蜂彈旋轉、無敵閃爍、框選脈動)才讀系統時鐘。
 */
(function () {
  'use strict';

  var W = 1280, H = 720, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var SIL = 0.2; // 目前縮放低於此值(大地圖縮圖 0.125)改畫剪影 / 色塊

  var PAL = {
    bg: '#1a2233', mapBg: '#14222a', mapLine: '#1d3036',
    wood: '#b8682a', woodLight: '#f2c88c', woodDark: '#6a3a14',
    stone: '#a9b3be', stoneLight: '#e6ebf0', stoneDark: '#5e6874',
    crystal: '#3fd6ea', crystalLight: '#d2fbff', crystalDark: '#137c90',
    core: '#d94bc6', coreLight: '#ffc6f4', coreDark: '#6e1a62', coreEye: '#ffe14a',
    sword: '#3d8bfd', hunter: '#1fbf9a', bomber: '#f28c28', skin: '#f4d2b0', outlineHero: '#ffffff',
    player: '#3d8bfd',
    brood: '#c264ff', danger: '#ff4a3a', weak: '#ffe066', foeEye: '#e8282c',
    shortcut: '#6fb0ff', treasure: '#ffc83d', nestRole: '#c264ff',
    spikeTip: '#e5484d', crack: '#c99a6c', crackLine: '#5a3a22', rubble: '#4e5868', rubbleLight: '#7d8898',
    plank: '#d59c57', plankDark: '#8a5a2a', stair: '#cbc1ae',
    chest: '#c27a2e', chestLid: '#dd9238', gold: '#f2c94c', goal: '#ffd23f', goalReached: '#3ccf6e',
    beeShot: '#ff5a2a', arrow: '#f3ead8', bomb: '#2a2a33', fire: '#ff9a2a',
    sand: '#e2c99c', sandDark: '#8a6a46',
    board: '#3a2a1f', plankUi: '#45321f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a', groove: '#2a1d14',
    parch: '#efe3c6', parchDim: '#b8ab8e', ink: '#2b2118', inkDim: '#76664e', cream: '#f3e6c8', labelDim: '#c9b896',
    select: '#ffd84a', selectDeep: '#b8860b', short: '#c8202c', good: '#2f8f55', goodLight: '#4fd18b',
    hp: '#ff4d5e', newArea: '#ff8a3d', text: '#f2f4f8', textDim: '#9aa4b8'
  };
  var K = PAL; // 介面色(ui 方案 A)別名

  // 地形主題: shape = 外角造型(round 圓角 / chamfer 斜切 / square 直角 / salt 小圓角 / lair 圓角)
  var THEMES = {
    forest: { shape: 'round', tR: 10, bR: 16, line: '#2a1a0e', inner: '#73502f', chip: '#5c3f24', chipHi: '#8a6440', cap: '#5cbf45', capHi: '#a8e27a', capDark: '#3f8a33',
      sky0: '#3f6e5e', sky1: '#d6c486', far: '#8fae7c', mid: '#62895c', near: '#3b5c44', fog: '#a7b3a2', fogA: 'rgba(214,226,206,0.55)', fogB: 'rgba(120,138,118,0.35)' },
    cliff: { shape: 'chamfer', tR: 9, bR: 15, line: '#262b3a', inner: '#5d6680', band2: '#6c7690', band3: '#525a72', cap: '#e8eef5', capHi: '#ffffff', capDark: '#b9c4d2',
      sky0: '#6f90b8', sky1: '#dfe8f1', far: '#bccadb', mid: '#97abc4', near: '#7489a7', fog: '#c9d2de', fogA: 'rgba(250,252,255,0.65)', fogB: 'rgba(160,172,190,0.35)' },
    mine: { shape: 'square', tR: 0, bR: 0, line: '#0d0a08', inner: '#463b35', chip: '#372e29', chipHi: '#5a4d45', cap: '#76664f', capHi: '#9c8a70', capDark: '#4f4334',
      timber: '#6b4a2b', timberDark: '#3e2a17', sky0: '#110d0b', sky1: '#221a15', far: '#2a211b', mid: '#3a2c21', near: '#4c3828', fog: '#8c8378', fogA: 'rgba(176,166,150,0.55)', fogB: 'rgba(90,80,70,0.35)' },
    salt: { shape: 'salt', tR: 4, bR: 4, line: '#3a2440', inner: '#ad8299', mark: '#966c84', cap: '#fbf3ec', capHi: '#ffffff', capDark: '#e3c4d2',
      sky0: '#2a1f4e', sky1: '#f4c2a2', far: '#a3789f', ruin: '#4e3a68', ruinHi: '#6b5287', fog: '#c9b4c4', fogA: 'rgba(255,240,250,0.6)', fogB: 'rgba(150,120,150,0.35)' },
    lair: { shape: 'lair', tR: 8, bR: 12, line: '#120818', inner: '#2d1a38', chip: '#3c2349', chipHi: '#55306a', cap: '#5a2d6e', capHi: '#8a45a0', capDark: '#3a1a48',
      sky0: '#1a0e22', sky1: '#2a1634', far: '#24142e', mid: '#2e1a3a', near: '#38204a', fog: '#7a6a86', fogA: 'rgba(180,160,200,0.5)', fogB: 'rgba(70,50,90,0.4)' }
  };
  var THEME_KEYS = ['forest', 'cliff', 'mine', 'salt', 'lair'];
  var THEME_NAME = { forest: '翠林谷地', cliff: '風蝕高崖', mine: '地底礦坑', salt: '鹽原斷門', lair: '巢穴' };

  var KINDS = ['wood', 'stone', 'crystal', 'core'];
  var KIND_NAME = { wood: '木材', stone: '石頭', crystal: '水晶', core: '魔核' };
  var KIND_INK = { wood: '#7a4a1e', stone: '#4c5562', crystal: '#127a8c', core: '#8e2a80' };
  var HUD_X = { wood: 16, stone: 186, crystal: 356, core: 526 };
  var CLS = ['sword', 'hunter', 'bomber'];
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '潛行穿怪群', bomber: '破岩牆、擊飛' };
  var ROLES = ['shortcut', 'treasure', 'nest'];
  var ROLE_NAME = { shortcut: '捷徑', treasure: '寶區', nest: '巢穴' };
  var ROLE_INK = { shortcut: '#1f5fa8', treasure: '#8a5f00', nest: '#7a2aa8' };
  var SITE_KIND_NAME = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道', nestgate: '巢穴門' };
  var ITEMS = ['bagWood', 'bagStone', 'bagCrystal', 'coreLamp', 'glove', 'horn', 'heart', 'gear'];
  var ITEM_NAME = { bagWood: '木材袋', bagStone: '石頭袋', bagCrystal: '水晶袋', coreLamp: '魔核燈', glove: '拾荒手套', horn: '獵人號角', heart: '巢母之心', gear: '加速齒輪' };
  var ITEM_FX = {
    bagWood: '每次通關 +4 木材', bagStone: '每次通關 +3 石頭', bagCrystal: '每次通關 +2 水晶', coreLamp: '每次通關 +2 魔核',
    glove: '撿到的素材 +1', horn: '打怪掉落 ×2', heart: '打怪掉落 ×2、通關 +4 魔核', gear: '回放速度 +25%'
  };
  var KEY_LABEL = { left: '←', right: '→', up: '↑', down: '↓', z: 'Z', x: 'X' };

  // ---------- 共用小工具 ----------
  function num(v, d) { v = Number(v); return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function oneOf(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function obj(v) { return (v && typeof v === 'object') ? v : {}; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, d) { return (typeof v === 'string') ? v : (typeof v === 'number' && isFinite(v) ? String(v) : d); }
  function face(v) { return v === -1 ? -1 : 1; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function fr(v) { return v - Math.floor(v); }
  function nowS() { try { return ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000; } catch (e) { return 0; } }
  function fmt1(v) { return (Math.round(num(v, 0) * 10) / 10).toFixed(1); }
  function intStr(v) { return String(Math.max(0, Math.round(clamp(num(v, 0), 0, 1e9)))); }
  function grp(n) { return String(Math.max(0, Math.round(clamp(num(n, 0), 0, 1e12)))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function mats(v) { var o = obj(v); return { wood: num(o.wood, 0), stone: num(o.stone, 0), crystal: num(o.crystal, 0), core: num(o.core, 0) }; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function themeOf(v) { return THEMES[oneOf(v, THEME_KEYS, 'forest')]; }
  function hexRgb(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(a, b, u) { var p = hexRgb(a), q = hexRgb(b); u = clamp(u, 0, 1); return 'rgb(' + Math.round(p[0] + (q[0] - p[0]) * u) + ',' + Math.round(p[1] + (q[1] - p[1]) * u) + ',' + Math.round(p[2] + (q[2] - p[2]) * u) + ')'; }

  // 目前變換相對邏輯畫布的縮放(扣掉 RD 的高 DPI 底圖倍率); abs = 畫面 px / 單位
  function scaleOf(ctx) {
    var a = 1, base = 1;
    try { if (ctx.getTransform) { var m = ctx.getTransform(); if (m && isFinite(m.a)) a = Math.hypot(m.a || 0, m.b || 0) || 1; } } catch (e) { a = 1; }
    try { if (ctx.canvas && ctx.canvas.width > 0) base = ctx.canvas.width / W; } catch (e) { base = 1; }
    if (!isFinite(base) || base <= 0) base = 1;
    if (!isFinite(a) || a <= 0) a = 1;
    return { rel: a / base, abs: a };
  }

  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || 'rgba(20,12,6,0.95)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : String(s).length * px; }

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
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function star(ctx, x, y, r, n) {
    n = n || 5; ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = (i % 2) ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]); }
  function lin(ctx, x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; }
  function rad(ctx, x, y, r0, r1, stops) { var g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.01, r1)); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; }

  // ---------- 素材圖示(materials 方案 C; 地上、噴出粒、飛行、資訊列、面板、結算全部共用) ----------
  // 中心 (cx, cy), 外框 sz×sz; 畫面上小於 15px 時拿掉繩、年輪、星光與光暈
  function crystalSide(ctx, sx, rot, lw) {
    ctx.save(); ctx.translate(sx, 5.2); ctx.rotate(rot);
    poly(ctx, [0, -7.4, 2.4, -4.4, 2.4, 2.6, -2.4, 2.6, -2.4, -4.4]);
    ctx.fillStyle = lin(ctx, -2.4, 0, 2.4, 0, [0, PAL.crystalLight, 0.5, PAL.crystal, 1, PAL.crystalDark]); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
    ctx.restore();
  }
  function matIcon(ctx, kind, cx, cy, sz, forceSimple) {
    kind = oneOf(kind, KINDS, 'wood');
    sz = clamp(num(sz, 20), 1, 200);
    var k = sz / 20, detail = !forceSimple && sz * scaleOf(ctx).rel >= 15, lw = detail ? 1.5 : 1.9, i;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'wood') {
      ctx.translate(-0.4, 0.9);
      var ends = [[-0.8, 3.6], [6.8, 3.6], [3, -3.2]], dx = -5.2, dy = -2.2, R = 3.5;
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(ends[i][0], ends[i][1]); ctx.lineTo(ends[i][0] + dx, ends[i][1] + dy);
        ctx.lineWidth = R * 2 + lw * 2; ctx.strokeStyle = '#1a1420'; ctx.stroke();
        ctx.lineWidth = R * 2; ctx.strokeStyle = lin(ctx, 0, ends[i][1] - R, 0, ends[i][1] + R, [0, PAL.wood, 1, PAL.woodDark]); ctx.stroke();
      }
      if (detail) { ctx.beginPath(); ctx.moveTo(-1.6, -7.2); ctx.lineTo(-3.8, 6.4); ctx.lineWidth = 1.6; ctx.strokeStyle = '#e7d39a'; ctx.stroke(); }
      for (i = 0; i < 3; i++) {
        ell(ctx, ends[i][0], ends[i][1], R * 0.86, R);
        ctx.fillStyle = rad(ctx, ends[i][0] - 0.8, ends[i][1] - 1, 0.3, R, [0, '#fff0cf', 1, PAL.woodLight]); ctx.fill();
        ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
        if (detail) { ell(ctx, ends[i][0], ends[i][1], R * 0.4, R * 0.48); ctx.lineWidth = 0.9; ctx.strokeStyle = PAL.woodDark; ctx.stroke(); }
      }
    } else if (kind === 'stone') {
      poly(ctx, [0, -9.4, 9, -4.7, 0, 0, -9, -4.7]); ctx.fillStyle = lin(ctx, 0, -9.4, 0, 0, [0, '#ffffff', 1, PAL.stoneLight]); ctx.fill();
      poly(ctx, [-9, -4.7, 0, 0, 0, 9.6, -9, 4.9]); ctx.fillStyle = PAL.stone; ctx.fill();
      poly(ctx, [0, 0, 9, -4.7, 9, 4.9, 0, 9.6]); ctx.fillStyle = PAL.stoneDark; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, -4.7); ctx.lineTo(0, 0); ctx.lineTo(9, -4.7); ctx.moveTo(0, 0); ctx.lineTo(0, 9.6);
      ctx.lineWidth = detail ? 0.9 : 1.2; ctx.strokeStyle = 'rgba(26,20,32,0.7)'; ctx.stroke();
      if (detail) { ctx.beginPath(); ctx.moveTo(-6.4, 0.2); ctx.lineTo(-3.4, 2.4); ctx.lineTo(-4.6, 5.2); ctx.moveTo(3.2, 2.2); ctx.lineTo(6, 0.8); ctx.lineWidth = 0.9; ctx.strokeStyle = PAL.stoneDark; ctx.stroke(); }
      poly(ctx, [0, -9.4, 9, -4.7, 9, 4.9, 0, 9.6, -9, 4.9, -9, -4.7]); ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
    } else if (kind === 'crystal') {
      if (detail) { circle(ctx, 0, 1, 11.5); ctx.fillStyle = rad(ctx, 0, 1, 2, 11.5, [0, 'rgba(63,214,234,0.55)', 1, 'rgba(63,214,234,0)']); ctx.fill(); }
      crystalSide(ctx, -5.6, -0.5, lw); crystalSide(ctx, 5.6, 0.5, lw);
      var m = [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, -3.8, 6, -3.8, -6];
      poly(ctx, m); ctx.fillStyle = PAL.crystal; ctx.fill();
      poly(ctx, [0, -10.4, 0, 9.4, -3.8, 6, -3.8, -6]); ctx.fillStyle = PAL.crystalLight; ctx.fill();
      poly(ctx, [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, 1.4, 6, 1.4, -6]); ctx.fillStyle = PAL.crystalDark; ctx.globalAlpha *= 0.55; ctx.fill(); ctx.globalAlpha /= 0.55;
      poly(ctx, m); ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
      if (detail) { star4(ctx, -6.4, -6.4, 2.6); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    } else {
      if (detail) { circle(ctx, 0, 1.5, 11.5); ctx.fillStyle = rad(ctx, 0, 1.5, 2, 11.5, [0, 'rgba(230,90,212,0.55)', 1, 'rgba(230,90,212,0)']); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(0.6, -10.4);
      ctx.bezierCurveTo(2.4, -6.4, 7.6, -4.4, 7.6, 2.4); ctx.bezierCurveTo(7.6, 6.8, 4.2, 9.6, 0, 9.6);
      ctx.bezierCurveTo(-4.2, 9.6, -7.6, 6.8, -7.6, 2.4); ctx.bezierCurveTo(-7.6, -1.6, -5, -3.4, -3.6, -6.2);
      ctx.quadraticCurveTo(-2.6, -3.4, -1.2, -3.8); ctx.quadraticCurveTo(-1.6, -7.6, 0.6, -10.4); ctx.closePath();
      ctx.fillStyle = rad(ctx, -1.6, 1.4, 0.5, 9.6, [0, PAL.coreLight, 0.45, PAL.core, 1, PAL.coreDark]); ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = '#1a1420'; ctx.stroke();
      ctx.fillStyle = PAL.coreEye;
      poly(ctx, [-5, 1.2, -1.2, 2.4, -1.6, 4.2, -4.6, 3.4]); ctx.fill(); poly(ctx, [5, 1.2, 1.2, 2.4, 1.6, 4.2, 4.6, 3.4]); ctx.fill();
      if (detail) { star4(ctx, 5.6, -6, 2.2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    }
    ctx.restore();
  }

  // ---------- 職業小圖示 / 鎖 / 石鍵帽(ui 方案 A) ----------
  function clsIcon(ctx, cls, cx, cy, sz) {
    cls = oneOf(cls, CLS, 'sword');
    var k = sz / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.lineJoin = 'round';
    circle(ctx, 0, 0, 9.4); ctx.fillStyle = '#2b2118'; ctx.fill();
    // 縮圖記號: 盾形 / 三角 / 圓(和主角剪影同一組)
    if (cls === 'sword') poly(ctx, [-5.5, -6, 5.5, -6, 5.5, 0, 0, 6.5, -5.5, 0]);
    else if (cls === 'hunter') poly(ctx, [0, -7, 6.5, 5.5, -6.5, 5.5]);
    else circle(ctx, 0, 0.5, 6);
    ctx.fillStyle = PAL[cls]; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
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
  function keyW(ctx, label, px) { return Math.max(px * 1.7, tw(ctx, label, px, true) + px * 0.9); }
  // 石鍵帽: hot = 金頂(此刻按得下去); done = 金頂 + 打勾
  function keycap(ctx, label, cx, cy, px, hot, done) {
    var w = keyW(ctx, label, px), h = px * 1.6;
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 4); ctx.fillStyle = hot ? K.selectDeep : '#8f8471'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.fillStyle = hot ? K.select : '#ece4d2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, label, cx, cy + 0.5, px, K.ink, 'center', true);
    if (done) {
      circle(ctx, cx + w / 2 - 2, cy - h / 2 + 1, px * 0.42); ctx.fillStyle = K.good; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      var r = px * 0.42, ox = cx + w / 2 - 2, oy = cy - h / 2 + 1;
      ctx.beginPath(); ctx.moveTo(ox - r * 0.5, oy); ctx.lineTo(ox - r * 0.1, oy + r * 0.4); ctx.lineTo(ox + r * 0.55, oy - r * 0.4); ctx.lineWidth = 1.8; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
    ctx.restore();
    return w;
  }
  function keyAct(ctx, k, s, x, y, px, hot, col, oc) {
    var kw = keyW(ctx, k, px);
    keycap(ctx, k, x + kw / 2, y, px, hot);
    text(ctx, s, x + kw + 5, y, px, col || K.cream, 'left', true, oc === null ? 0 : 3, oc || K.edge);
    return kw + 5 + tw(ctx, s, px, true);
  }
  // 一排「鍵 + 動作」; align 'center' / 'left'
  function keyRow(ctx, items, x, y, px, align, col, oc) {
    var total = 0, i, ws = [];
    for (i = 0; i < items.length; i++) { ws.push(keyW(ctx, items[i][0], px) + 5 + tw(ctx, items[i][1], px, true)); total += ws[i] + (i ? px * 1.2 : 0); }
    var cx = align === 'left' ? x : x - total / 2;
    for (i = 0; i < items.length; i++) { if (i) cx += px * 1.2; keyAct(ctx, items[i][0], items[i][1], cx, y, px, items[i][2] === true, col, oc); cx += ws[i]; }
    return total;
  }
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
  // 羊皮紙牌: sel 'hot'(金框 + 上浮 3 + 吊牌三角)/ 'cold'(深色雙框)/ null; look 'normal' / 'dim' / 'done' / 'gray'
  function tag(ctx, x, y, w, h, sel, look) {
    ctx.save();
    var lift = sel === 'hot' ? 3 : 0;
    if (lift) { rr(ctx, x + 2, y + 3, w, h, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); }
    y -= lift;
    var bg = look === 'dim' ? K.parchDim : look === 'done' ? '#d6e6c6' : look === 'gray' ? '#a9a59a' : K.parch;
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
    if (sel === 'hot') {
      rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 7); ctx.lineWidth = 4; ctx.strokeStyle = K.select; ctx.stroke();
      poly(ctx, [x + w / 2 - 8, y - 4, x + w / 2 + 8, y - 4, x + w / 2, y + 5]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    } else if (sel === 'cold') {
      rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 6); ctx.lineWidth = 3; ctx.strokeStyle = K.ink; ctx.stroke();
    } else {
      rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.stroke();
    }
    ctx.restore();
    return y;
  }
  // 列凹槽: on = 金邊 + 左側金色指標 ▶
  function groove(ctx, x, y, w, h, label, on) {
    ctx.save();
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = on ? '#33261a' : K.groove; ctx.fill();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 6); ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? K.select : 'rgba(0,0,0,0.6)'; ctx.stroke();
    if (on) { poly(ctx, [x - 14, y + h / 2 - 9, x - 2, y + h / 2, x - 14, y + h / 2 + 9]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
    if (label) text(ctx, label, x + 10, y + 11, 12, on ? K.select : K.labelDim, 'left', true, 3, K.edge);
    ctx.restore();
  }
  // 動作章: 'hot' 金底 / 'idle' 米白 / 'off' 灰 + 紅斜線(付不起)
  function act(ctx, s, x, y, state, align, px) {
    px = px || 12;
    var w = tw(ctx, s, px, true) + px * 1.2, h = px * 1.7;
    var lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    ctx.save();
    if (state === 'hot') { rr(ctx, lx, y - h / 2 + 3, w, h, 4); ctx.fillStyle = K.selectDeep; ctx.fill(); }
    rr(ctx, lx, y - h / 2, w, h, 4);
    ctx.fillStyle = state === 'hot' ? K.select : state === 'off' ? '#9a9384' : '#fbf6ea'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = state === 'off' ? '#6a6456' : K.edge; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5, px, state === 'off' ? '#4a4538' : K.ink, 'center', true);
    if (state === 'off') { ctx.beginPath(); ctx.moveTo(lx + 4, y + h / 2 - 4); ctx.lineTo(lx + w - 4, y - h / 2 + 4); ctx.lineWidth = 2; ctx.strokeStyle = K.short; ctx.stroke(); }
    ctx.restore();
    return w;
  }
  // 花費: 只畫大於 0 的種類; 逐項比對 stock, 不足的那一種數字變紅 + 紅底「缺 N」。回傳 { w, ok }
  function costLine(ctx, cost, stock, x, y, px, align, inkCol, measureOnly) {
    var c = mats(cost), s = mats(stock), items = [], i;
    for (i = 0; i < KINDS.length; i++) { var k = KINDS[i], v = Math.round(clamp(c[k], 0, 1e9)); if (v > 0) items.push([k, v, s[k] < v ? v - Math.max(0, Math.floor(s[k])) : 0]); }
    var isz = px * 1.25, ws = [], total = 0, ok = true;
    for (i = 0; i < items.length; i++) {
      var w = isz + 3 + tw(ctx, String(items[i][1]), px, true);
      if (items[i][2]) { ok = false; w += 4 + tw(ctx, '缺 ' + items[i][2], px * 0.78, true) + 8; }
      ws.push(w); total += w + (i ? 10 : 0);
    }
    if (measureOnly) return { w: total, ok: ok };
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    for (i = 0; i < items.length; i++) {
      if (i) cx += 10;
      matIcon(ctx, items[i][0], cx + isz / 2, y, isz);
      var nx = cx + isz + 3, sv = String(items[i][1]);
      text(ctx, sv, nx, y + 0.5, px, items[i][2] ? K.short : (inkCol || K.ink), 'left', true);
      if (items[i][2]) {
        var bx = nx + tw(ctx, sv, px, true) + 4, bs = '缺 ' + items[i][2], bw = tw(ctx, bs, px * 0.78, true) + 8;
        rr(ctx, bx, y - px * 0.62, bw, px * 1.24, 3); ctx.fillStyle = K.short; ctx.fill();
        text(ctx, bs, bx + bw / 2, y + 0.5, px * 0.78, '#ffffff', 'center', true);
      }
      cx += ws[i];
    }
    return { w: total, ok: ok };
  }
  function canPay(cost, stock) { var c = mats(cost), s = mats(stock); for (var i = 0; i < KINDS.length; i++) if (c[KINDS[i]] > s[KINDS[i]]) return false; return true; }
  function dimScreen(ctx, a, hole) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, -200, W + 800, H + 400);
    if (hole) { ctx.rect(hole[0] + hole[2], hole[1], -hole[2], hole[3]); }
    ctx.fillStyle = 'rgba(6,8,12,' + a + ')'; ctx.fill();
    ctx.restore();
  }
  function newAreaChip(ctx, x, y, align, s, px) {
    px = px || 11; s = s || '修好後還沒跑過';
    var w = tw(ctx, s, px, true) + 14, lx = align === 'right' ? x - w : (align === 'center' ? x - w / 2 : x);
    rr(ctx, lx, y - px * 0.9, w, px * 1.8, 4); ctx.fillStyle = PAL.newArea; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5, px, '#ffffff', 'center', true);
    return w;
  }
  function ratesRow(ctx, rates, x, y, step, px, col) {
    var r = mats(rates);
    for (var i = 0; i < 4; i++) {
      var k = KINDS[i];
      matIcon(ctx, k, x + i * step + px * 0.7, y, px * 1.35);
      text(ctx, '+' + fmt1(clamp(r[k], 0, 1e6)) + '/分', x + i * step + px * 1.5, y + 0.5, px, col || K.ink, 'left', true);
    }
  }

  // ---------- 工程角色標誌 / 號碼釘(工程牌、準備頁工程卡、預覽共用) ----------
  function roleGlyph(ctx, role, col) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (role === 'shortcut') { // 閃電箭頭
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-2, 0); ctx.lineTo(-8, 5); ctx.moveTo(0, -5); ctx.lineTo(6, 0); ctx.lineTo(0, 5); ctx.stroke();
    } else if (role === 'treasure') { // 寶箱
      rr(ctx, -7, -2, 14, 8, 1.5); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.quadraticCurveTo(0, -8, 7, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#20242e'; ctx.fillRect(-1.2, -2, 2.4, 3.5);
    } else { // 魔物爪印
      ell(ctx, 0, 3, 4, 3); ctx.fill();
      circle(ctx, -5.5, -2, 1.9); ctx.fill(); circle(ctx, -2, -5.2, 1.9); ctx.fill(); circle(ctx, 2, -5.2, 1.9); ctx.fill(); circle(ctx, 5.5, -2, 1.9); ctx.fill();
    }
  }
  function roleMark(ctx, role, cx, cy, k, dim) {
    role = oneOf(role, ROLES, 'shortcut');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    circle(ctx, 0, 0, 13); ctx.fillStyle = dim ? '#5a564c' : '#20242e'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = dim ? '#8a8678' : PAL[role === 'nest' ? 'nestRole' : role]; ctx.stroke();
    roleGlyph(ctx, role, dim ? '#8a8678' : PAL[role === 'nest' ? 'nestRole' : role]);
    ctx.restore();
  }
  // 號碼釘: 金屬圓釘 + 號碼(和工程牌頂端同款); r 半徑, px 字級
  function sitePin(ctx, n, x, y, r, px, dim) {
    ctx.save();
    circle(ctx, x, y + 1.5, r); ctx.fillStyle = K.edge; ctx.fill();
    circle(ctx, x, y, r); ctx.fillStyle = dim ? '#b9b8b2' : '#f6e7b8'; ctx.fill(); ctx.lineWidth = Math.max(1, r * 0.18); ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, String(n), x, y + 0.5, px, K.ink, 'center', true);
    ctx.restore();
  }

  // ================= 主角(hero 方案 A 幾何剪影) =================
  // 原點 = 判定框中心; 造型以 28×40 設計, 內部 scale(1, 0.9) 收進 28×36。f = 面向; o = { swing, tuck, spread, pose, tint }
  var HC = { line: '#ffffff', ink: '#1a1420', pants: '#2b3245', metal: '#e8eef6', woodC: '#8a5a2a', cape: '#d8434e', hood: '#0f2a24', eye: '#d8fff0', lens: '#e8f6ff' };
  function hfs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.stroke(); } }
  function heroLegs(ctx, top, o) {
    var s = o.swing || 0, tuck = o.tuck || 0, sp = o.spread || 0;
    ctx.fillStyle = HC.pants;
    rr(ctx, -7 + s - sp, top, 5, 20 - top - tuck, 1.5); ctx.fill(); rr(ctx, 2 - s + sp, top, 5, 20 - top - tuck, 1.5); ctx.fill();
  }
  function heroFig(ctx, cls, f, o) {
    o = o || {};
    var pose = o.pose || 'idle', tint = o.tint;
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 0.9);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      var col = tint || PAL.sword;
      poly(ctx, [-4, -6, -13, 15, -5, 17, 2, -4]); hfs(ctx, HC.cape, 0);
      heroLegs(ctx, 13, o);
      poly(ctx, [-13, -6, 13, -6, 7, 14, -7, 14]); hfs(ctx, col, 2);
      ctx.fillStyle = PAL.gold; ctx.fillRect(-7, 8, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [-2, -4, 2, -4, 0, 4]); ctx.fill();
      poly(ctx, [-8, -13, -14, -19, -12, -11]); hfs(ctx, PAL.gold, 0);
      rr(ctx, -8, -20, 16, 14, 3); hfs(ctx, col, 2);
      ctx.fillStyle = HC.ink; ctx.fillRect(-1, -15, 8, 3);
      if (pose === 'slash' || pose === 'dash') { // 劍平舉朝前
        poly(ctx, [4, -1, 13, -1, 14, 1, 13, 3, 4, 3]); hfs(ctx, HC.metal, 0); ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
        ctx.fillStyle = PAL.gold; ctx.fillRect(2.5, -3.5, 3, 9);
      } else if (pose === 'cheer') { // 劍高舉
        poly(ctx, [9, -18, 11, -20, 13, -18, 13, -6, 9, -6]); hfs(ctx, HC.metal, 0); ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
        ctx.fillStyle = PAL.gold; ctx.fillRect(7.5, -6.5, 7, 2.5);
      } else {
        poly(ctx, [10, -17.5, 12, -20, 14, -17.5, 14, -3, 10, -3]); hfs(ctx, HC.metal, 0); ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
        ctx.fillStyle = PAL.gold; ctx.fillRect(8, -3.5, 6, 3);
        ctx.fillStyle = HC.woodC; ctx.fillRect(11, -0.5, 2, 5);
        circle(ctx, 11.5, 3, 2.4); hfs(ctx, PAL.skin, 0);
      }
    } else if (cls === 'hunter') {
      var hcCol = tint || PAL.hunter;
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(-0.35);
      ctx.fillStyle = HC.woodC; ctx.fillRect(-3, -6, 6, 14);
      ctx.fillStyle = HC.eye; poly(ctx, [-3, -6, -1, -12, 1, -6]); ctx.fill(); poly(ctx, [0, -6, 2.5, -11, 3.5, -6]); ctx.fill();
      ctx.restore();
      heroLegs(ctx, 14, o);
      poly(ctx, [0, -20, 13, 15, -13, 15]); hfs(ctx, hcCol, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [0, -20, -13, 15, -5, 15]); ctx.fill();
      poly(ctx, [-1, -13, 7, -9, 6, -4, -3, -4]); ctx.fillStyle = HC.hood; ctx.fill();
      circle(ctx, 2, -8, 1.3); ctx.fillStyle = HC.eye; ctx.fill(); circle(ctx, 5, -7.6, 1.3); ctx.fill();
      circle(ctx, 0, 0, 2); ctx.fillStyle = PAL.gold; ctx.fill();
      var by = pose === 'cheer' ? -6 : 2;
      ctx.strokeStyle = HC.woodC; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(1, by, 12.5, -1.1, 1.1); ctx.stroke();
      var ex = 1 + Math.cos(1.1) * 12.5, ey = Math.sin(1.1) * 12.5;
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, by - ey); ctx.lineTo(ex, by + ey); ctx.stroke();
      ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 1, by); ctx.lineTo(12, by); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [11.5, by - 2.2, 14, by, 11.5, by + 2.2]); ctx.fill();
    } else {
      var bcol = tint || PAL.bomber;
      heroLegs(ctx, 15, o);
      circle(ctx, 0, 5, 12); hfs(ctx, bcol, 2);
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(8, 13); ctx.stroke();
      for (var i = 0; i < 3; i++) { circle(ctx, -5 + i * 5, 1.5 + i * 4.4, 2.2); ctx.fillStyle = PAL.bomb; ctx.fill(); }
      circle(ctx, 0, -11, 8); hfs(ctx, PAL.skin, 1.8);
      ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.closePath(); hfs(ctx, bcol, 0);
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-8, -12.5, 16, 2.6);
      circle(ctx, 1, -11.2, 3.1); hfs(ctx, HC.lens, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circle(ctx, 6.4, -11.2, 3.1); hfs(ctx, HC.lens, 0); ctx.stroke();
      ctx.strokeStyle = HC.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -6.5, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = PAL.skin; ctx.lineWidth = 3;
      if (pose === 'throw') { ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(12.5, -8); ctx.stroke(); }
      else if (pose === 'wave') { ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-12.5, -3); ctx.moveTo(8, 3); ctx.lineTo(12.5, -3); ctx.stroke(); }
      else if (pose === 'cheer') { ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-11, -12); ctx.moveTo(7, 0); ctx.lineTo(11, -12); ctx.stroke(); }
      else if (o.holdBomb !== false) {
        circle(ctx, 9.5, 4, 4.3); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = HC.line; ctx.stroke();
        ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(10.5, -0.2); ctx.quadraticCurveTo(11.5, -2.4, 12.6, -2.8); ctx.stroke();
        star4(ctx, 12.6, -4.2, 1.6); ctx.fillStyle = PAL.goal; ctx.fill();
      } else { circle(ctx, 10.5, 2, 2.6); hfs(ctx, PAL.skin, 0); }
    }
    ctx.restore();
  }
  // 縮圖記號: 盾形 / 三角 / 圓(畫面上約 9px, 刻意大於判定框才看得出職業)
  function heroMark(ctx, cls, s, lw) {
    if (cls === 'sword') poly(ctx, [-0.5 * s, -s, 0.5 * s, -s, 0.5 * s, -0.5 * s, 0, 0, -0.5 * s, -0.5 * s]);
    else if (cls === 'hunter') poly(ctx, [0, -1.1 * s, 0.55 * s, 0, -0.55 * s, 0]);
    else circle(ctx, 0, -0.5 * s, 0.5 * s);
    ctx.fillStyle = PAL[cls]; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }

  var POSES = ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'throw', 'wave', 'hurt', 'cheer'];
  function drawPlayer(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), cls = oneOf(st.cls, CLS, 'sword'), f = face(st.facing);
    var pose = oneOf(st.pose, POSES, 'idle'), pt = clamp(num(st.poseT, 0), 0, 1e6);
    var stealth = st.stealth === true, sDur = Math.max(0.01, num(st.stealthDur, 2.5)), sT = clamp(num(st.stealthT, sDur), 0, sDur);
    var uDur = Math.max(0.01, num(st.unstealthDur, 0.3)), uT = clamp(num(st.unstealthT, uDur), 0, uDur);
    var sc = scaleOf(ctx);
    ctx.save(); ctx.translate(x, y);
    if (st.invuln === true && Math.floor(nowS() * 12) % 2 === 0) ctx.globalAlpha *= 0.3;
    if (sc.rel < SIL) {
      if (stealth) ctx.globalAlpha *= 0.45;
      ctx.translate(0, 18); heroMark(ctx, cls, 9 / sc.abs, 1 / sc.abs);
      ctx.restore(); return;
    }
    if (pose === 'dash') { // 速度線: 衝刺反方向, 框外至多 60px
      ctx.strokeStyle = 'rgba(220,236,255,0.85)'; ctx.lineCap = 'butt';
      var ls = [[-12, 52], [-3, 60], [6, 44], [14, 32]];
      for (var i = 0; i < ls.length; i++) { ctx.lineWidth = 3 - i * 0.4; ctx.beginPath(); ctx.moveTo(-f * 14, ls[i][0]); ctx.lineTo(-f * (14 + ls[i][1]), ls[i][0]); ctx.stroke(); }
    }
    if (pose === 'slash' && pt < 0.15) { // 新月刀光: 面向側框外 50×40、與身體同高
      var sp = pt / 0.15;
      ctx.save(); ctx.globalAlpha *= 1 - sp * 0.6;
      ctx.beginPath(); ctx.ellipse(f * 14, 0, 48, 19, 0, -Math.PI / 2, Math.PI / 2, f < 0);
      ctx.ellipse(f * 14, 0, 28, 8, 0, Math.PI / 2, -Math.PI / 2, f > 0); ctx.closePath();
      ctx.fillStyle = 'rgba(232,244,255,0.92)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(120,180,255,0.95)'; ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    if (stealth) ctx.globalAlpha *= 0.35;
    if (pose === 'dash') { ctx.rotate(f * 0.2); ctx.scale(0.86, 0.86); }
    if (pose === 'hurt') { ctx.rotate(-f * 0.16); ctx.scale(0.86, 0.86); }
    if (pose === 'wave') { ctx.translate(0, 18); ctx.scale(1, 0.92); ctx.translate(0, -18); }
    var o = { pose: pose, swing: 0 };
    if (pose === 'run') o.swing = Math.sin(pt * 18) * 3;
    if (pose === 'rise') o.tuck = 5;
    if (pose === 'fall') o.spread = 2;
    if (pose === 'hurt') o.tint = '#ff6b6b';
    heroFig(ctx, cls, f, o);
    ctx.restore();
    if (pose === 'cheer') { // 慶祝: 頭頂兩顆小金星(框內)
      var cq = (pt * 4) % 1;
      ctx.fillStyle = PAL.select; star4(ctx, -9, -13 - cq * 3, 2.5); ctx.fill(); star4(ctx, 9, -12 - ((cq + 0.5) % 1) * 3, 2.2); ctx.fill();
    }
    if (stealth) { // 潛行: 殼形輪廓微光; 最後 0.5 秒閃爍預告
      var left = sDur - sT, blink = left < 0.5 && Math.floor(sT * 12) % 2 === 0;
      if (!blink) {
        ctx.save(); ctx.setLineDash([4, 3]); ctx.lineDashOffset = -sT * 30; ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(190,255,235,0.95)';
        rr(ctx, -13, -17, 26, 34, 10); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalAlpha *= 0.18; heroFig(ctx, cls, f, { pose: 'idle', tint: '#d8fff0' }); ctx.restore();
      }
    }
    if (uT < uDur) { // 現身閃光(框外至多 12px)
      var q = uT / uDur;
      ctx.save(); ctx.globalAlpha *= 1 - q;
      ell(ctx, 0, 0, 14 + 10 * q, 18 + 10 * q); ctx.lineWidth = 2; ctx.strokeStyle = '#eafff8'; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (var j = 0; j < 6; j++) { var a = j * TAU / 6 + 0.3; star4(ctx, Math.cos(a) * (14 + 10 * q), Math.sin(a) * (18 + 10 * q), 2.4); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- 技能冷卻地面環(skill-cd 方案 A) ----------
  function arcPiece(ctx, cx, cy, rx, ry, a0, len) {
    if (len <= 0.001) return;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0, rx), Math.max(0, ry), 0, a0, a0 + Math.min(len, TAU)); ctx.stroke();
  }
  function drawSkillRing(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), cls = oneOf(st.cls, CLS, 'sword');
    var cdDur = Math.max(0.01, num(st.cdDur, 1)), cdT = clamp(num(st.cdT, cdDur), 0, cdDur);
    var rDur = Math.max(0.01, num(st.readyDur, 0.5)), rT = clamp(num(st.readyT, rDur), 0, rDur);
    var cDur = Math.max(0.01, num(st.castDur, 0.3)), cT = clamp(num(st.castT, cDur), 0, cDur);
    var dDur = Math.max(0.01, num(st.denyDur, 0.25)), dT = clamp(num(st.denyT, dDur), 0, dDur);
    var sDur = Math.max(0.01, num(st.stealthDur, 2.5)), sLeft = clamp(num(st.stealthLeft, 0), 0, sDur);
    var RX = 26, RY = 6, START = -Math.PI / 2;
    var deny = dT < dDur, dq = dT / dDur;
    var cx = x + (deny ? Math.sin(dq * Math.PI * 4) * 3 * (1 - dq) : 0), cy = y;
    ctx.save(); ctx.lineCap = 'butt';
    var cooling = cdT < cdDur;
    if (cooling) {
      var left = cdDur - cdT, warn = left < 0.35;
      ctx.lineWidth = 4; ctx.strokeStyle = deny ? 'rgba(200,32,44,0.85)' : 'rgba(12,10,8,0.72)'; arcPiece(ctx, cx, cy, RX, RY, 0, TAU);
      var nT = Math.min(60, Math.ceil(cdDur));
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,240,210,0.55)';
      for (var k = 1; k < nT; k++) { var ang = START + k / cdDur * TAU; var px = cx + Math.cos(ang) * RX, py = cy + Math.sin(ang) * RY; ctx.beginPath(); ctx.moveTo(px, py - 2); ctx.lineTo(px, py + 2); ctx.stroke(); }
      ctx.lineWidth = 4; ctx.strokeStyle = warn ? K.select : PAL[cls];
      arcPiece(ctx, cx, cy, RX, RY, START, cdT / cdDur * TAU);
      if (warn) { ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,246,200,0.9)'; arcPiece(ctx, cx, cy, RX - 2.5, RY - 2.5, 0, TAU); }
    } else {
      var fa = rT < rDur ? rT / rDur : 1;
      ell(ctx, cx, cy, RX - 3, RY - 2); ctx.fillStyle = 'rgba(255,216,74,' + (0.16 + 0.3 * (1 - fa)).toFixed(3) + ')'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = fa < 0.35 ? '#ffffff' : K.select; arcPiece(ctx, cx, cy, RX, RY, 0, TAU);
      if (fa < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - fa; ctx.lineWidth = 3; ctx.strokeStyle = '#fff3b0';
        arcPiece(ctx, cx, cy, RX + 16.5 * fa, RY + 6 * fa, 0, TAU);
        ctx.fillStyle = K.select;
        for (var j = 0; j < 6; j++) { var an = j / 6 * TAU + 0.3; star4(ctx, cx + Math.cos(an) * RX * 0.9, cy + Math.sin(an) * RY - 26 * fa, 4 - 1.5 * fa); ctx.fill(); }
        ctx.restore();
      }
    }
    if (deny) { ctx.save(); ctx.globalAlpha *= 1 - dq; ctx.lineWidth = 2; ctx.strokeStyle = '#ff5a5a'; arcPiece(ctx, cx, cy, RX, RY, 0, TAU); ctx.restore(); }
    if (sLeft > 0) { ctx.save(); ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = '#bff5e6'; arcPiece(ctx, cx, cy, RX - 8, RY - 3, START, sLeft / sDur * TAU); ctx.restore(); }
    if (cT < cDur) { var q = cT / cDur; ctx.save(); ctx.globalAlpha *= 1 - q; ctx.lineWidth = 3; ctx.strokeStyle = K.select; arcPiece(ctx, cx, cy, RX + 12 * q, RY + 4 * q, 0, TAU); ctx.restore(); }
    ctx.restore();
  }

  function drawRangeRing(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), r = clamp(num(st.radius, 260), 2, 2000);
    ctx.save();
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(31,191,154,0.42)';
    circle(ctx, x, y, r - 1); ctx.stroke();
    ctx.restore();
  }

  // ================= 背景 =================
  function bgSky(ctx, th) { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [0, th.sky0, 1, th.sky1]); ctx.fillRect(0, 0, W, H); }
  function saltBackdrop(ctx, simple, t) {
    var th = THEMES.salt;
    ctx.fillStyle = lin(ctx, 0, 0, 0, 640, [0, '#2a1f4e', 0.38, '#5e4180', 0.78, '#c47d9c', 1, '#f4c2a2']); ctx.fillRect(0, 0, W, H);
    var i;
    if (!simple) {
      for (i = 0; i < 50; i++) { ctx.fillStyle = 'rgba(255,240,255,' + (0.2 + hash(i, 5) * 0.4).toFixed(2) + ')'; circle(ctx, hash(i, 1) * W, 44 + hash(i, 2) * 200, 0.6 + hash(i, 3)); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,200,200,0.18)';
      var o = (t * 6) % W;
      for (i = -1; i <= 0; i++) { ctx.fillRect(o + i * W, 430, W, 6); ctx.fillRect(o * 0.6 + 160 + i * W, 470, 900, 4); ctx.fillRect(o * 0.4 + 500 + i * W, 505, 780, 5); }
    }
    ctx.fillStyle = th.far;
    poly(ctx, [0, 640, 0, 600, 120, 600, 150, 584, 330, 584, 350, 604, 880, 606, 910, 590, 1060, 590, 1090, 602, 1280, 602, 1280, 640]); ctx.fill();
    function pillar(x0, x1, jag) {
      ctx.fillStyle = th.ruin;
      var p = [x0, 640, x0, jag[0]], n = jag.length - 1;
      for (var k = 1; k < n; k++) p.push(x0 + (x1 - x0) * k / n, jag[k]);
      p.push(x1, jag[n], x1, 640); poly(ctx, p); ctx.fill();
      if (!simple) {
        ctx.strokeStyle = th.ruinHi; ctx.lineWidth = 3;
        var top = Math.max.apply(null, jag) + 16;
        ctx.beginPath(); for (var q = 1; q < 4; q++) { var fx = x0 + (x1 - x0) * q / 4; ctx.moveTo(fx, top); ctx.lineTo(fx, 600); } ctx.stroke();
        var ex = (x0 + x1) / 2, ey = top + 70;
        ctx.lineWidth = 4; ell(ctx, ex, ey, 36, 20); ctx.stroke(); circle(ctx, ex, ey, 9); ctx.fillStyle = th.ruinHi; ctx.fill();
      }
    }
    pillar(140, 290, [128, 112, 126, 108, 120]);
    ctx.fillStyle = th.ruin; poly(ctx, [140, 108, 470, 118, 456, 136, 478, 150, 440, 166, 290, 166]); ctx.fill();
    pillar(990, 1140, [236, 214, 252, 226, 246]);
    if (simple) { ctx.fillStyle = th.ruin; ctx.fillRect(140, 108, 150, 540); ctx.fillRect(990, 214, 150, 430); }
  }
  function drawBackground(ctx, st) {
    st = obj(st);
    var key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key], t = num(st.t, 0), simple = scaleOf(ctx).rel < SIL, i, x, y;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (key === 'salt') { saltBackdrop(ctx, simple, t); ctx.restore(); return; }
    bgSky(ctx, th);
    if (key === 'forest') {
      ctx.fillStyle = th.far; for (i = 0; i < 7; i++) { circle(ctx, i * 220 - 40, 560 + hash(i, 1) * 60, 200 + hash(i, 2) * 60); ctx.fill(); }
      ctx.fillStyle = th.mid; for (i = 0; i < 9; i++) { x = 40 + i * 150 + hash(i, 3) * 40; y = 250 + hash(i, 4) * 70; ctx.fillRect(x - 7, y, 14, H - y); circle(ctx, x, y, 48 + hash(i, 5) * 18); ctx.fill(); }
      if (!simple) {
        ctx.fillStyle = th.near; ctx.fillRect(0, 0, 34, H); ctx.fillRect(W - 30, 0, 30, H);
        for (i = 0; i < 9; i++) { circle(ctx, 20 + i * 36, 10 + Math.sin(i) * 14, 34); ctx.fill(); circle(ctx, W - 20 - i * 34, 6 + Math.cos(i) * 12, 30); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,250,200,0.5)';
        for (i = 0; i < 16; i++) { var px = fr(hash(i, 8) + t * (0.004 + hash(i, 9) * 0.004)) * W, py = 120 + hash(i, 10) * 420 + Math.sin(t * 0.7 + i) * 10; circle(ctx, px, py, 1.4 + hash(i, 11)); ctx.fill(); }
      }
    } else if (key === 'cliff') {
      ctx.fillStyle = th.far; for (i = 0; i < 12; i++) { x = i * 115 + hash(i, 1) * 40; y = 220 + hash(i, 2) * 120; poly(ctx, [x - 50, H, x - 8, y, x + 8, y, x + 50, H]); ctx.fill(); }
      ctx.fillStyle = th.mid; for (i = 0; i < 5; i++) { x = i * 300 + 40; y = 330 + hash(i, 3) * 60; poly(ctx, [x - 130, H, x - 100, y + 40, x - 60, y, x + 60, y, x + 100, y + 40, x + 130, H]); ctx.fill(); }
      if (!simple) {
        ctx.fillStyle = th.near;
        var pil = [120, 640, 1170];
        for (i = 0; i < 3; i++) { x = pil[i]; poly(ctx, [x - 44, H, x - 30, 430, x - 12, 360, x - 30, 290, x - 18, 250, x + 18, 250, x + 30, 290, x + 12, 360, x + 30, 430, x + 44, H]); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
        var Pw = W + 300;
        for (i = 0; i < 9; i++) { x = fr(hash(i, 7) + t * 0.02 * (1 + (i % 2))) * Pw - 200; y = 60 + hash(i, 8) * 300; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120 + hash(i, 9) * 80, y - 6); ctx.stroke(); }
      }
    } else if (key === 'mine') {
      ctx.fillStyle = th.far; for (i = 0; i < 10; i++) { x = i * 140 + hash(i, 1) * 50; ctx.fillRect(x, 60 + hash(i, 2) * 200, 46, 160 + hash(i, 3) * 200); }
      if (!simple) {
        ctx.strokeStyle = th.mid; ctx.lineWidth = 6;
        for (x = 60; x < W; x += 180) { ctx.strokeRect(x, 200, 120, 120); ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x + 120, 320); ctx.stroke(); }
        var lamps = [220, 640, 1060];
        for (i = 0; i < 3; i++) {
          var fl = 0.85 + 0.15 * Math.sin(t * 7 + i * 2.1);
          ctx.fillStyle = rad(ctx, lamps[i], 150, 4, 150, [0, 'rgba(255,190,100,' + (0.3 * fl).toFixed(3) + ')', 1, 'rgba(255,190,100,0)']); ctx.fillRect(lamps[i] - 150, 0, 300, 300);
          ctx.strokeStyle = '#2a201a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lamps[i], 100); ctx.lineTo(lamps[i], 140); ctx.stroke();
          ctx.fillStyle = '#ffcf7a'; ctx.fillRect(lamps[i] - 6, 144, 12, 12);
        }
        ctx.fillStyle = 'rgba(200,180,150,0.35)';
        for (i = 0; i < 14; i++) { circle(ctx, hash(i, 4) * W + Math.sin(t * 0.5 + i) * 14, fr(hash(i, 5) - t * 0.01) * H, 1.2); ctx.fill(); }
      }
    } else { // lair(介面只在 drawLairBack 用, 這裡給個暗紫底)
      ctx.fillStyle = 'rgba(194,100,255,0.06)'; for (i = 0; i < 8; i++) { circle(ctx, hash(i, 1) * W, hash(i, 2) * H, 60 + hash(i, 3) * 80); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawMapBackground(ctx, st) {
    st = obj(st);
    var t = num(st.t, 0), i;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [0, '#16262e', 1, '#0f1b22']); ctx.fillRect(0, 0, W, H);
    // 遠方: 往斷門方向的地平線(x > 966 的空區)
    ctx.save();
    ctx.beginPath(); ctx.rect(940, 0, W - 940, H); ctx.clip();
    ctx.fillStyle = lin(ctx, 940, 0, 1100, 0, [0, 'rgba(94,65,128,0)', 1, 'rgba(94,65,128,0.55)']); ctx.fillRect(940, 0, 340, H);
    ctx.fillStyle = lin(ctx, 0, 300, 0, 470, [0, 'rgba(196,125,156,0)', 1, 'rgba(244,194,162,0.35)']); ctx.fillRect(940, 300, 340, 170);
    ctx.fillStyle = 'rgba(163,120,159,0.55)'; poly(ctx, [940, 520, 980, 470, 1060, 468, 1080, 455, 1200, 452, 1240, 470, 1280, 466, 1280, 720, 940, 720]); ctx.fill();
    ctx.fillStyle = 'rgba(78,58,104,0.85)'; // 很小的斷門剪影
    poly(ctx, [1096, 470, 1096, 392, 1104, 384, 1112, 396, 1118, 386, 1118, 470]); ctx.fill();
    poly(ctx, [1166, 470, 1166, 410, 1174, 402, 1180, 414, 1188, 406, 1188, 470]); ctx.fill();
    poly(ctx, [1096, 386, 1140, 390, 1136, 398, 1118, 400]); ctx.fill();
    ctx.fillStyle = 'rgba(255,214,200,0.12)';
    for (i = 0; i < 3; i++) { var cx2 = 940 + fr(hash(i, 3) + t * 0.006) * 420; ctx.fillRect(cx2 - 60, 330 + i * 26, 120, 4); }
    ctx.restore();
    // 地圖紙紋: 淡格線 + 等高線(全畫面最低調)
    ctx.strokeStyle = PAL.mapLine; ctx.lineWidth = 1;
    ctx.beginPath(); for (var gx = 0; gx <= 960; gx += 40) { ctx.moveTo(gx + 0.5, 40); ctx.lineTo(gx + 0.5, H); } for (var gy = 40; gy <= H; gy += 40) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(960, gy + 0.5); } ctx.stroke();
    ctx.strokeStyle = 'rgba(120,170,160,0.08)'; ctx.lineWidth = 2;
    for (i = 0; i < 6; i++) { ell(ctx, 200 + hash(i, 1) * 700, 160 + hash(i, 2) * 480, 80 + hash(i, 3) * 90, 40 + hash(i, 4) * 50); ctx.stroke(); ell(ctx, 200 + hash(i, 1) * 700, 160 + hash(i, 2) * 480, 50 + hash(i, 3) * 60, 22 + hash(i, 4) * 30); ctx.stroke(); }
    ctx.restore();
  }

  // ================= 地形 =================
  function shapePath(ctx, shape, x, y, w, h, k) {
    ctx.beginPath();
    if (shape === 'chamfer') {
      ctx.moveTo(x + k.tl, y); ctx.lineTo(x + w - k.tr, y); ctx.lineTo(x + w, y + k.tr); ctx.lineTo(x + w, y + h - k.br);
      ctx.lineTo(x + w - k.br, y + h); ctx.lineTo(x + k.bl, y + h); ctx.lineTo(x, y + h - k.bl); ctx.lineTo(x, y + k.tl);
    } else {
      ctx.moveTo(x + k.tl, y); ctx.arcTo(x + w, y, x + w, y + h, k.tr); ctx.arcTo(x + w, y + h, x, y + h, k.br);
      ctx.arcTo(x, y + h, x, y, k.bl); ctx.arcTo(x, y, x + w, y, k.tl);
    }
    ctx.closePath();
  }
  function drawGround(ctx, st) {
    st = obj(st);
    var x = num(st.x, 20), y = num(st.y, 20), key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key];
    var op = (st.open && typeof st.open === 'object') ? st.open : { n: st.top === true };
    var n = op.n === true, e = op.e === true, s = op.s === true, w = op.w === true;
    var L = x - 20, T = y - 20, c = Math.floor(L / 40), r = Math.floor(T / 40), simple = scaleOf(ctx).rel < SIL, i;
    var k = { tl: n && w ? th.tR : 0, tr: n && e ? th.tR : 0, br: s && e ? th.bR : 0, bl: s && w ? th.bR : 0 };
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
    shapePath(ctx, th.shape, L, T, 40, 40, k); ctx.fillStyle = th.line; ctx.fill();
    var g = 2.5, ix = L + (w ? g : 0), iy = T + (n ? g : 0), iw = 40 - (w ? g : 0) - (e ? g : 0), ih = 40 - (n ? g : 0) - (s ? g : 0);
    var ik = { tl: Math.max(0, k.tl - 1.5), tr: Math.max(0, k.tr - 1.5), br: Math.max(0, k.br - 1.5), bl: Math.max(0, k.bl - 1.5) };
    shapePath(ctx, th.shape, ix, iy, iw, ih, ik); ctx.fillStyle = th.inner; ctx.fill(); ctx.clip();
    var hv = hash(c, r);
    if (!simple) {
      if (key === 'forest') {
        ctx.fillStyle = th.chip; circle(ctx, L + 12 + hv * 14, T + 24 + hv * 6, 6 + hv * 3); ctx.fill();
        ctx.fillStyle = th.chipHi; circle(ctx, L + 10 + hv * 14, T + 22 + hv * 6, 2); ctx.fill();
        ctx.fillStyle = th.chip; circle(ctx, L + 32 - hv * 6, T + 12 + hv * 10, 3.5); ctx.fill();
        if (!n && s) { for (i = 0; i < 3; i++) { ell(ctx, L + 8 + i * 12, T + 38, 4, 5); ctx.fill(); } }
      } else if (key === 'cliff') {
        for (var yy = Math.floor(T / 13) * 13; yy < T + 40; yy += 13) {
          var band = ((Math.floor(yy / 13) % 3) + 3) % 3;
          ctx.fillStyle = band === 0 ? th.inner : (band === 1 ? th.band2 : th.band3);
          ctx.beginPath(); ctx.moveTo(L, yy);
          for (var zx = 0; zx <= 40; zx += 8) ctx.lineTo(L + zx, yy + ((Math.floor((L + zx) / 8)) % 2 ? 2.5 : 0));
          ctx.lineTo(L + 40, yy + 13); ctx.lineTo(L, yy + 13); ctx.closePath(); ctx.fill();
        }
      } else if (key === 'mine') {
        ctx.fillStyle = th.chip;
        poly(ctx, [L + 4, T + 30, L + 12, T + 18, L + 22, T + 30]); ctx.fill();
        poly(ctx, [L + 24, T + 8, L + 36, T + 8, L + 36, T + 20, L + 26, T + 18]); ctx.fill();
        ctx.fillStyle = th.chipHi; ctx.fillRect(L + 24, T + 8, 12, 2);
        if (hv > 0.86 && !n) { ctx.fillStyle = '#6f7de8'; poly(ctx, [L + 14, T + 36, L + 18, T + 18, L + 22, T + 36]); ctx.fill(); ctx.fillStyle = '#9aa4ff'; poly(ctx, [L + 22, T + 36, L + 27, T + 24, L + 30, T + 36]); ctx.fill(); }
        ctx.fillStyle = th.timber;
        if (w && !n) ctx.fillRect(ix, T, 7, 40);
        if (e && !n) ctx.fillRect(ix + iw - 7, T, 7, 40);
        if (s) { ctx.fillRect(L, iy + ih - 9, 40, 9); ctx.fillStyle = th.timberDark; ctx.fillRect(L, iy + ih - 2, 40, 2); ctx.fillRect(L + ((c % 2) ? 30 : 8), iy + ih - 9, 2, 9); }
      } else if (key === 'salt') {
        ctx.strokeStyle = th.mark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(L + 4, T + 24); ctx.lineTo(L + 12, T + 18); ctx.lineTo(L + 24, T + 20); ctx.lineTo(L + 30, T + 30); ctx.lineTo(L + 22, T + 38);
        ctx.moveTo(L + 24, T + 20); ctx.lineTo(L + 34, T + 14); ctx.stroke();
      } else { // lair
        ctx.fillStyle = th.chip; circle(ctx, L + 10 + hv * 18, T + 26, 7); ctx.fill();
        if (hv > 0.6) { ctx.strokeStyle = 'rgba(194,100,255,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L + 4, T + 12 + hv * 10); ctx.lineTo(L + 18, T + 20); ctx.lineTo(L + 30, T + 14 + hv * 12); ctx.stroke(); }
      }
    }
    if (n) {
      if (th.shape === 'round') {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 10);
        if (!simple) { for (i = 0; i < 5; i++) { circle(ctx, L + 4 + i * 8, T + 10, 4); ctx.fill(); } ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2.5); ctx.fillStyle = th.capDark; for (i = 0; i < 5; i++) { circle(ctx, L + 4 + i * 8, T + 13, 1.2); ctx.fill(); } }
      } else if (th.shape === 'chamfer') {
        ctx.fillStyle = th.cap;
        if (simple) ctx.fillRect(L, T, 40, 14);
        else { ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L + 40, T); for (i = 5; i >= 0; i--) ctx.lineTo(L + i * 8, T + ((i % 2) ? 13 : 8)); ctx.closePath(); ctx.fill(); ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2); }
      } else if (th.shape === 'square') {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 9);
        if (!simple) { ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2); ctx.fillStyle = th.capDark; if (c % 2 === 0) ctx.fillRect(L + 38.5, T, 1.5, 9); ctx.fillRect(L, T + 9, 40, 1.5); }
      } else if (th.shape === 'salt') {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 10);
        if (!simple) { ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 2); ctx.fillStyle = th.capDark; ctx.fillRect(L, T + 10, 40, 3); }
      } else {
        ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, simple ? 14 : 8);
        if (!simple) { ctx.fillStyle = th.capHi; ctx.fillRect(L, T + g, 40, 1.5); ctx.fillStyle = 'rgba(194,100,255,0.8)'; circle(ctx, L + 8 + hv * 24, T + 6, 1.4); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  function drawLairBack(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 40), 0, 1280), h = clamp(num(st.h, 40), 0, 720), lt = oneOf(st.lairTheme, ['forest', 'cliff', 'mine'], 'forest');
    if (w <= 0 || h <= 0) return;
    var simple = scaleOf(ctx).rel < SIL, i, n;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = rad(ctx, x + w / 2, y + h * 0.6, 10, Math.max(w, h) * 0.75, [0, '#3a1f4a', 1, '#140a1c']); ctx.fillRect(x, y, w, h);
    if (!simple) {
      n = Math.min(40, Math.ceil(w / 60) + 1);
      for (i = 0; i < n; i++) {
        var bx = x + i * 60 + hash(i, 2) * 20;
        if (lt === 'forest') { ctx.fillStyle = 'rgba(70,40,30,0.6)'; ell(ctx, bx, y + 6, 26, 16 + hash(i, 3) * 10); ctx.fill(); ctx.strokeStyle = 'rgba(90,60,40,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + 8, y + 30, bx - 4, y + 40 + hash(i, 4) * 30); ctx.stroke(); }
        else if (lt === 'cliff') { ctx.fillStyle = 'rgba(70,74,100,0.6)'; poly(ctx, [bx - 22, y, bx + 22, y, bx + 6, y + 26 + hash(i, 3) * 18, bx - 4, y + 18]); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(80,56,36,0.7)'; ctx.fillRect(bx - 4, y, 8, h); ctx.fillRect(bx - 20, y + 8, 40, 7); }
      }
      // 巢穴記號: 牆上發光紫紋 + 卵囊
      ctx.strokeStyle = 'rgba(194,100,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (i = 0; i < n; i++) {
        var vx = x + 30 + i * 60, vy = y + h * (0.3 + hash(i, 6) * 0.4);
        ctx.beginPath(); ctx.moveTo(vx - 14, vy); ctx.lineTo(vx - 4, vy - 8); ctx.lineTo(vx + 6, vy + 2); ctx.lineTo(vx + 16, vy - 6); ctx.stroke();
        if (hash(i, 7) > 0.5) { ell(ctx, vx, y + h - 10, 7, 9); ctx.fillStyle = 'rgba(120,60,150,0.7)'; ctx.fill(); ell(ctx, vx - 2, y + h - 13, 2, 3); ctx.fillStyle = 'rgba(220,170,255,0.6)'; ctx.fill(); }
      }
    } else { ctx.fillStyle = 'rgba(194,100,255,0.25)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), key = oneOf(st.theme, THEME_KEYS, 'forest'), simple = scaleOf(ctx).rel < SIL, i;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 20, y, 40, 20); ctx.clip();
    if (simple) { poly(ctx, [x - 20, y + 20, x - 13, y, x - 7, y + 20, x, y, x + 7, y + 20, x + 13, y, x + 20, y + 20]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); ctx.restore(); return; }
    ctx.lineJoin = 'round';
    if (key === 'forest' || key === 'lair') { // 荊棘: 彎刺藤 + 紅尖
      ctx.strokeStyle = '#4a3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 20, y + 17); ctx.bezierCurveTo(x - 8, y + 10, x + 6, y + 22, x + 20, y + 15); ctx.stroke();
      for (i = 0; i < 4; i++) { var cx = x - 15 + i * 10; poly(ctx, [cx - 4, y + 17, cx + 1, y + 1, cx + 4, y + 16]); ctx.fillStyle = '#6a5a2a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#1a1408'; ctx.stroke(); poly(ctx, [cx - 0.8, y + 6, cx + 1, y + 1, cx + 2, y + 6]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); }
    } else if (key === 'cliff' || key === 'salt') { // 岩刺
      ctx.fillStyle = '#3b3f4a'; ctx.fillRect(x - 20, y + 16, 40, 4);
      for (i = 0; i < 3; i++) { var sx = x - 13.3 + i * 13.3; poly(ctx, [sx - 6.5, y + 17, sx - 1, y + 1, sx + 6.5, y + 17]); ctx.fillStyle = key === 'salt' ? '#e6d4e0' : '#aeb7c6'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#1a1c22'; ctx.stroke(); poly(ctx, [sx - 3, y + 7, sx - 1, y + 1, sx + 1.6, y + 7]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); }
    } else { // 鐵釘板
      ctx.fillStyle = '#5a3e24'; ctx.fillRect(x - 20, y + 14, 40, 6); ctx.fillStyle = '#3e2a17'; ctx.fillRect(x - 20, y + 18, 40, 2);
      for (i = 0; i < 4; i++) { var nx = x - 15 + i * 10; poly(ctx, [nx - 3, y + 15, nx, y + 1, nx + 3, y + 15]); ctx.fillStyle = '#c9cfd8'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#1a1c22'; ctx.stroke(); poly(ctx, [nx - 1.2, y + 6, nx, y + 1, nx + 1.2, y + 6]); ctx.fillStyle = PAL.spikeTip; ctx.fill(); }
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), hp = clamp(Math.round(num(st.hp, 3)), 1, 3), L = x - 20, T = y - 20, edgeC = themeOf(st.theme).line;
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
    ctx.fillStyle = PAL.crack; ctx.fillRect(L, T, 40, 40);
    if (scaleOf(ctx).rel < SIL) { ctx.strokeStyle = PAL.crackLine; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(L + 8, T + 6); ctx.lineTo(L + 22, T + 22); ctx.lineTo(L + 32, T + 36); ctx.stroke(); ctx.restore(); return; }
    // 暖色平板磚(打得破的牆), 橫向磚縫
    ctx.fillStyle = '#e0b88e'; ctx.fillRect(L, T, 40, 3);
    ctx.strokeStyle = 'rgba(90,58,34,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(L, T + 14); ctx.lineTo(L + 40, T + 14); ctx.moveTo(L, T + 27); ctx.lineTo(L + 40, T + 27);
    ctx.moveTo(L + 20, T); ctx.lineTo(L + 20, T + 14); ctx.moveTo(L + 10, T + 14); ctx.lineTo(L + 10, T + 27); ctx.moveTo(L + 30, T + 14); ctx.lineTo(L + 30, T + 27); ctx.moveTo(L + 20, T + 27); ctx.lineTo(L + 20, T + 40); ctx.stroke();
    ctx.strokeStyle = PAL.crackLine; ctx.lineWidth = 2.4; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(L + 18, T + 2); ctx.lineTo(L + 22, T + 12); ctx.lineTo(L + 17, T + 20); ctx.lineTo(L + 23, T + 30); ctx.stroke();
    if (hp <= 2) { ctx.beginPath(); ctx.moveTo(L + 22, T + 12); ctx.lineTo(L + 33, T + 9); ctx.moveTo(L + 17, T + 20); ctx.lineTo(L + 6, T + 25); ctx.lineTo(L + 3, T + 34); ctx.moveTo(L + 23, T + 30); ctx.lineTo(L + 31, T + 38); ctx.stroke(); }
    if (hp <= 1) {
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L + 33, T + 9); ctx.lineTo(L + 38, T + 20); ctx.moveTo(L + 6, T + 25); ctx.lineTo(L + 2, T + 14); ctx.moveTo(L + 23, T + 30); ctx.lineTo(L + 12, T + 38); ctx.stroke();
      ctx.fillStyle = 'rgba(26,20,30,0.85)'; poly(ctx, [L, T, L + 8, T, L, T + 7]); ctx.fill(); poly(ctx, [L + 40, T + 40, L + 31, T + 40, L + 40, T + 31]); ctx.fill();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = edgeC; ctx.strokeRect(L + 1, T + 1, 38, 38);
    ctx.restore();
  }

  // ---------- 工程結構 ----------
  var ROCKS = [[10, 10, 9], [29, 9, 9], [20, 22, 10], [8, 31, 8], [31, 31, 9]];
  function rubbleCell(ctx, L, T, simple, key) {
    ctx.fillStyle = '#2b313b'; ctx.fillRect(L, T, 40, 40);
    if (simple) { ctx.fillStyle = PAL.rubble; ctx.fillRect(L + 2, T + 2, 36, 36); return; }
    for (var i = 0; i < ROCKS.length; i++) {
      var r = ROCKS[i];
      circle(ctx, L + r[0], T + r[1], r[2]); ctx.fillStyle = PAL.rubble; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
      ctx.beginPath(); ctx.arc(L + r[0], T + r[1], r[2] - 3, Math.PI * 1.1, Math.PI * 1.6); ctx.strokeStyle = PAL.rubbleLight; ctx.stroke();
    }
    if (key === 'forest') { ctx.strokeStyle = '#7a5130'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T + 6); ctx.bezierCurveTo(L + 14, T + 18, L + 22, T + 4, L + 40, T + 20); ctx.stroke(); ctx.fillStyle = '#5cbf45'; circle(ctx, L + 12, T + 4, 4); ctx.fill(); }
    else if (key === 'mine') { ctx.fillStyle = '#6b4a2b'; ctx.fillRect(L + 2, T + 2, 36, 6); ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.5; ctx.strokeRect(L + 2, T + 2, 36, 6); }
  }
  function blueprint(ctx, L, T, role, simple) {
    var col = PAL[role === 'nest' ? 'nestRole' : role];
    ctx.save();
    ctx.globalAlpha *= 0.14; ctx.fillStyle = col; ctx.fillRect(L + 2, T + 2, 36, 36); ctx.globalAlpha /= 0.14;
    if (!simple) { ctx.globalAlpha *= 0.6; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.strokeRect(L + 3, T + 3, 34, 34); }
    ctx.restore();
  }
  function bridgeCell(ctx, L, T, key, simple) {
    ctx.fillStyle = PAL.plank; ctx.fillRect(L, T, 40, 40);
    if (simple) return;
    ctx.strokeStyle = PAL.plankDark; ctx.lineWidth = 2;
    ctx.beginPath(); for (var i = 1; i < 4; i++) { ctx.moveTo(L, T + i * 10); ctx.lineTo(L + 40, T + i * 10); } ctx.stroke();
    ctx.fillStyle = '#3a2a1a'; for (i = 0; i < 4; i++) { circle(ctx, L + 6, T + 5 + i * 10, 1.4); ctx.fill(); circle(ctx, L + 34, T + 5 + i * 10, 1.4); ctx.fill(); }
    ctx.fillStyle = '#f0c27a'; ctx.fillRect(L, T, 40, 2.5);
    if (key === 'mine') { ctx.fillStyle = '#9aa2ae'; ctx.fillRect(L, T, 40, 3); ctx.fillStyle = '#3a3f4c'; ctx.fillRect(L, T + 3, 40, 1.5); }
  }
  function stairCell(ctx, L, T, th, simple) {
    ctx.fillStyle = PAL.stair; ctx.fillRect(L, T, 40, 40);
    if (simple) return;
    ctx.strokeStyle = '#857a66'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(L, T + 20); ctx.lineTo(L + 40, T + 20); ctx.moveTo(L + 20, T); ctx.lineTo(L + 20, T + 20); ctx.moveTo(L + 10, T + 20); ctx.lineTo(L + 10, T + 40); ctx.moveTo(L + 30, T + 20); ctx.lineTo(L + 30, T + 40); ctx.stroke();
    ctx.strokeRect(L + 0.75, T + 0.75, 38.5, 38.5);
    ctx.fillStyle = th.cap; ctx.fillRect(L, T, 40, 4);
  }
  function drawWorksite(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, ['bridge', 'stairs', 'rubble'], 'rubble');
    var role = oneOf(st.role, ROLES, 'shortcut'), key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key];
    var rep = st.repaired === true, L = x - 20, T = y - 20, simple = scaleOf(ctx).rel < SIL;
    var bDur = Math.max(0.01, num(st.buildDur, 0.6)), bT = clamp(num(st.buildT, bDur), 0, bDur), order = clamp(num(st.order, 0), 0, 1);
    var start = order * 0.7 * bDur, cd = Math.max(0.05, Math.min(0.3, bDur - start));
    var building = rep && bT < bDur, q = building ? clamp((bT - start) / cd, 0, 1) : 1;
    var showRepaired = rep && (!building || bT >= start);
    ctx.save();
    if (!building) { ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip(); }
    if (!showRepaired) {
      if (kind === 'rubble') rubbleCell(ctx, L, T, simple, key);
      else {
        ctx.save(); ctx.beginPath(); ctx.rect(L, T, 40, 40); ctx.clip();
        if (kind === 'bridge' && st.end === true) {
          ctx.fillStyle = PAL.plankDark; poly(ctx, [L + 14, T + 40, L + 14, T + 6, L + 18, T + 2, L + 21, T + 8, L + 26, T + 3, L + 26, T + 40]); ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = '#2a1a0c'; ctx.stroke();
          ctx.fillStyle = PAL.plank; poly(ctx, [L + 4, T + 2, L + 36, T + 2, L + 33, T + 8, L + 30, T + 5, L + 26, T + 10, L + 4, T + 10]); ctx.fill(); ctx.stroke();
        } else if (kind === 'stairs' && st.bottom === true) {
          var bits = [[8, 35, 5], [17, 33, 6], [27, 35, 5], [34, 36, 4], [22, 27, 4], [12, 28, 3.5]];
          for (var j = 0; j < bits.length; j++) { var b = bits[j]; poly(ctx, [L + b[0] - b[2], T + b[1] + b[2] * 0.6, L + b[0] - b[2] * 0.4, T + b[1] - b[2], L + b[0] + b[2], T + b[1] - b[2] * 0.3, L + b[0] + b[2] * 0.7, T + b[1] + b[2] * 0.7]); ctx.fillStyle = j % 2 ? '#a69c8a' : PAL.stair; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a342a'; ctx.stroke(); }
        }
        blueprint(ctx, L, T, role, simple);
        ctx.restore();
      }
    } else if (kind === 'rubble') {
      if (building && q < 1) { // 亂石炸開: 碎片飛出(框外至多 24px)
        ctx.save(); ctx.globalAlpha *= 1 - q;
        for (var i = 0; i < ROCKS.length; i++) {
          var rk = ROCKS[i], dx = (rk[0] - 20) / 20, dy = (rk[1] - 20) / 20 - 0.5;
          var px = L + rk[0] + dx * 24 * eOut(q), py = T + rk[1] + dy * 24 * eOut(q);
          circle(ctx, clamp(px, L - 24 + rk[2], L + 64 - rk[2]), clamp(py, T - 24 + rk[2], T + 64 - rk[2]), rk[2] * (1 - 0.5 * q)); ctx.fillStyle = PAL.rubble; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
        }
        ctx.restore();
      }
    } else {
      if (building && q < 1) {
        ctx.save();
        if (kind === 'stairs') { ctx.globalAlpha *= Math.min(1, q * 2.5); ctx.translate(0, -40 * (1 - q) * (1 - q)); stairCell(ctx, L, T, th, simple); }
        else { ctx.translate(x, T); ctx.scale(1, 0.2 + 0.8 * q); ctx.translate(-x, -T); ctx.globalAlpha *= Math.min(1, q * 2); bridgeCell(ctx, L, T, key, simple); }
        ctx.restore();
      } else if (kind === 'stairs') stairCell(ctx, L, T, th, simple);
      else bridgeCell(ctx, L, T, key, simple);
    }
    ctx.restore();
  }

  function drawNestGate(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), open = st.open === true, lt = oneOf(st.lairTheme, ['forest', 'cliff', 'mine'], 'forest');
    var bDur = Math.max(0.01, num(st.buildDur, 0.6)), bT = clamp(num(st.buildT, bDur), 0, bDur), q = open ? bT / bDur : 1;
    var L = x - 40, T = y - 40, simple = scaleOf(ctx).rel < SIL;
    var fc = lt === 'forest' ? '#5a4030' : (lt === 'cliff' ? '#5d6680' : '#6b4a2b'), fl = lt === 'forest' ? '#2a1a0e' : (lt === 'cliff' ? '#262b3a' : '#2a1a0c');
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, 80, 80); ctx.clip();
    // 門內(看得出門後是魔物巢)
    ctx.fillStyle = open ? 'rgba(60,24,80,0.55)' : '#1c0f24'; ctx.fillRect(L + 8, T + 8, 64, 72);
    if (open && !simple) { ctx.fillStyle = rad(ctx, x, y + 20, 4, 50, [0, 'rgba(194,100,255,0.35)', 1, 'rgba(194,100,255,0)']); ctx.fillRect(L + 8, T + 8, 64, 72); }
    if (!open || q < 1) { // 封印石板(施工中往下沉)
      var dy = open ? q * q * 72 : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(L + 8, T + 8, 64, 72); ctx.clip();
      ctx.translate(0, dy);
      ctx.fillStyle = '#5d5670'; ctx.fillRect(L + 8, T + 8, 64, 72);
      if (!simple) {
        ctx.strokeStyle = '#2a2436'; ctx.lineWidth = 2; ctx.strokeRect(L + 9, T + 9, 62, 70);
        ctx.beginPath(); ctx.moveTo(x, T + 9); ctx.lineTo(x, T + 79); ctx.stroke();
        ctx.globalAlpha *= open ? 1 - q : 1;
        ctx.strokeStyle = PAL.brood; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.shadowColor = PAL.brood; ctx.shadowBlur = 8;
        for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(L + 22 + i * 12, T + 24); ctx.lineTo(L + 30 + i * 12, T + 58); ctx.stroke(); }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#cfc8dc'; ctx.lineWidth = 3; circle(ctx, x, T + 68, 6); ctx.stroke();
      } else { ctx.fillStyle = PAL.brood; ctx.fillRect(L + 26, T + 26, 28, 30); }
      ctx.restore();
    }
    // 門框(材質呼應主題)
    ctx.fillStyle = fc; ctx.fillRect(L, T, 8, 80); ctx.fillRect(L + 72, T, 8, 80); ctx.fillRect(L, T, 80, 8);
    if (!simple) {
      ctx.lineWidth = 2; ctx.strokeStyle = fl; ctx.strokeRect(L + 1, T + 1, 6, 78); ctx.strokeRect(L + 73, T + 1, 6, 78); ctx.strokeRect(L + 1, T + 1, 78, 6);
      if (lt === 'forest') { ctx.fillStyle = '#5cbf45'; for (var m = 0; m < 4; m++) { circle(ctx, L + 10 + m * 20, T + 2, 4); ctx.fill(); } }
      if (lt === 'cliff') { ctx.fillStyle = '#e8eef5'; ctx.fillRect(L, T, 80, 3); }
    }
    circle(ctx, x, T + 4, 4); ctx.fillStyle = PAL.brood; ctx.fill();
    if (!open && !simple) { // 施工藍圖: 沿門框內側 nest 色虛線
      ctx.save(); ctx.globalAlpha *= 0.65; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = PAL.nestRole; ctx.strokeRect(L + 10, T + 10, 60, 68); ctx.restore();
    }
    ctx.restore();
  }

  // 工程牌: 36×48, 底邊貼地; 頂端圓釘寫號碼(0.5 倍預覽下號碼至少 10px)
  function drawSiteSign(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), role = oneOf(st.role, ROLES, 'shortcut'), nn = Math.round(clamp(num(st.num, 1), 0, 9));
    var sc = scaleOf(ctx).rel, col = PAL[role === 'nest' ? 'nestRole' : role];
    ctx.save();
    ctx.fillStyle = '#7a5530'; ctx.fillRect(x - 2.5, y + 10, 5, 14);
    rr(ctx, x - 17, y - 10, 34, 22, 3); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
    rr(ctx, x - 13, y - 6, 26, 14, 2); ctx.fillStyle = '#20242e'; ctx.fill();
    ctx.save(); ctx.translate(x, y + 1); ctx.scale(0.8, 0.8); roleGlyph(ctx, role, col); ctx.restore();
    if (sc >= SIL) {
      var px = Math.max(12, 10 / Math.max(0.05, sc)), r = Math.max(8, px * 0.72);
      sitePin(ctx, nn, x, y - 24 + Math.min(r, 12), r, px, false);
    }
    ctx.restore();
  }

  // ---------- 迷霧 ----------
  function drawFog(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 80), 0, 1280), h = clamp(num(st.h, 80), 0, 720);
    var t = num(st.t, 0), key = oneOf(st.theme, THEME_KEYS, 'forest'), th = THEMES[key];
    var p = clamp(num(st.clearP, 0), 0, 1), ox = num(st.ox, x + w / 2), oy = num(st.oy, y + h / 2), maxR = clamp(num(st.maxR, Math.hypot(w, h)), 0, 4000);
    if (w <= 0 || h <= 0 || p >= 1) return;
    var R = p * maxR, simple = scaleOf(ctx).rel < SIL;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (R > 0.5) { ctx.beginPath(); ctx.rect(-4000, -4000, 8000, 8000); ctx.moveTo(ox + R, oy); ctx.arc(ox, oy, R, 0, TAU, true); ctx.clip('evenodd'); }
    ctx.fillStyle = th.fog; ctx.fillRect(x, y, w, h);
    if (!simple) {
      for (var gx = Math.floor(x / 80) - 1; gx <= Math.ceil((x + w) / 80) + 1; gx++) {
        for (var gy = Math.floor(y / 40) - 1; gy <= Math.ceil((y + h) / 40) + 1; gy++) {
          var hv = hash(gx, gy), cx = gx * 80 + 40 + Math.sin(t * 0.35 + hv * 6.28) * 16, cy = gy * 40 + 20;
          ctx.fillStyle = (gx + gy) % 2 ? th.fogA : th.fogB;
          if (th.shape === 'round' || th.shape === 'lair') { circle(ctx, cx, cy, 26 + hv * 12); ctx.fill(); }
          else if (th.shape === 'chamfer') { poly(ctx, [cx - 70 - hv * 20, cy, cx - 20, cy - 12 - hv * 4, cx + 70 + hv * 20, cy - 2, cx + 30, cy + 10 + hv * 4]); ctx.fill(); }
          else { rr(ctx, cx - 26, cy - 16, 52 + hv * 10, 30, key === 'mine' ? 2 : 6); ctx.fill(); }
        }
      }
    } else { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    if (R > 0.5) { // 推開的邊: 圓外一圈亮霧(寬 16, 畫在矩形內)
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.globalAlpha *= 0.85 * (1 - p);
      circle(ctx, ox, oy, R + 8); ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(240,242,248,0.9)'; ctx.stroke();
      circle(ctx, ox, oy, R + 1); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,238,180,1)'; ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- 預備動作的世界投影(紅色系) ----------
  function dangerA(p, t, base) { var pulse = 0.5 + 0.5 * Math.sin(t * (6 + 14 * p)); return clamp((base || 0.35) + 0.65 * p - 0.15 * pulse, 0.15, 1); }
  function stripes(ctx, x, y, w, h, off) {
    if (w <= 0 || h <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = 'rgba(255,60,50,0.18)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,60,50,0.42)'; ctx.lineWidth = 3;
    var o = ((off || 0) % 9 + 9) % 9;
    ctx.beginPath();
    for (var i = -h - 9 + o; i < w + h; i += 9) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); }
    ctx.stroke(); ctx.restore();
  }
  function reticle(ctx, x, y, r) {
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; circle(ctx, x, y, r * 0.65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.35, y); ctx.moveTo(x + r * 0.35, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y - r * 0.35); ctx.moveTo(x, y + r * 0.35); ctx.lineTo(x, y + r); ctx.stroke();
  }
  function arrowHead(ctx, x, y, ang, s) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); poly(ctx, [0, 0, -s, -s * 0.55, -s, s * 0.55]); ctx.fillStyle = 'rgba(255,90,70,0.95)'; ctx.fill(); ctx.restore(); }
  var TELE = ['lane', 'aim', 'dive', 'column', 'ring', 'blast', 'sweep', 'arc', 'crack', 'path'];
  function drawTelegraph(ctx, st) {
    st = obj(st);
    var kind = oneOf(st.kind, TELE, 'ring'), x = num(st.x, 0), y = num(st.y, 0), x2 = num(st.x2, x), y2 = num(st.y2, y);
    var w = clamp(num(st.w, 40), 0, 1400), h = clamp(num(st.h, 40), 0, 800), r = clamp(num(st.r, 40), 0, 800), p = clamp(num(st.p, 0), 0, 1), t = num(st.t, 0);
    var a = dangerA(p, t), i;
    ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = 'round';
    if (kind === 'lane') {
      var lx = Math.min(x, x2), lw = Math.abs(x2 - x), dir = x2 >= x ? 1 : -1;
      stripes(ctx, lx, y - 24, lw, 24, -t * 30 * dir);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,90,70,0.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(lx, y - 24); ctx.lineTo(lx + lw, y - 24); ctx.stroke(); ctx.restore();
      ctx.fillStyle = 'rgba(255,110,90,0.9)';
      for (i = 0; i < 3; i++) { var ax = x + dir * (18 + i * 14 + ((t * 40) % 14)); if ((ax - x) * dir > lw - 6) continue; poly(ctx, [ax, y - 18, ax + dir * 7, y - 12, ax, y - 6, ax + dir * 3, y - 12]); ctx.fill(); }
    } else if (kind === 'aim') {
      ctx.save(); ctx.setLineDash([2, 5]); ctx.lineDashOffset = -t * 20; ctx.strokeStyle = 'rgba(255,70,50,0.9)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      reticle(ctx, x2, y2, 10);
    } else if (kind === 'dive') {
      ctx.save(); ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; ctx.beginPath(); ctx.moveTo(x2 - 8.5, y2 - 8.5); ctx.lineTo(x2 + 8.5, y2 + 8.5); ctx.moveTo(x2 + 8.5, y2 - 8.5); ctx.lineTo(x2 - 8.5, y2 + 8.5); ctx.stroke();
    } else if (kind === 'column') {
      var top = Math.min(y, y2), bot = Math.max(y, y2);
      stripes(ctx, x - w / 2, top, w, Math.max(0, bot - top - w / 8), t * 20);
      ell(ctx, x, bot - w / 8, w / 2, w / 8); ctx.fillStyle = 'rgba(255,60,50,0.3)'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.stroke();
    } else if (kind === 'ring') {
      ell(ctx, x, y - w / 8, w / 2, w / 8); ctx.fillStyle = 'rgba(255,60,50,0.3)'; ctx.fill();
      ctx.save(); ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ell(ctx, x, y - w / 8, w / 2 - 1, w / 8 - 1); ctx.stroke(); ctx.restore();
    } else if (kind === 'blast') {
      circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,70,40,0.14)'; ctx.fill();
      ctx.save(); ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 24; ctx.strokeStyle = 'rgba(255,90,60,0.9)'; ctx.lineWidth = 2; circle(ctx, x, y, Math.max(0, r - 1)); ctx.stroke(); ctx.restore();
      circle(ctx, x, y, r * 0.62); ctx.strokeStyle = 'rgba(255,200,80,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    } else if (kind === 'sweep') {
      stripes(ctx, x, y, w, h, t * 30);
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,90,70,0.85)'; ctx.lineWidth = 1.4; ctx.strokeRect(x + 0.7, y + 0.7, Math.max(0, w - 1.4), Math.max(0, h - 1.4)); ctx.restore();
    } else if (kind === 'arc') {
      var pts = arr(st.pts).slice(0, 40), ok = [];
      for (i = 0; i < pts.length; i++) { var pp = arr(pts[i]); if (pp.length >= 2 && isFinite(Number(pp[0])) && isFinite(Number(pp[1]))) ok.push([Number(pp[0]), Number(pp[1])]); }
      if (ok.length >= 2) {
        ctx.save(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 24; ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ok[0][0], ok[0][1]); for (i = 1; i < ok.length; i++) ctx.lineTo(ok[i][0], ok[i][1]); ctx.stroke(); ctx.restore();
        var n1 = ok[ok.length - 1], n0 = ok[ok.length - 2]; arrowHead(ctx, n1[0], n1[1], Math.atan2(n1[1] - n0[1], n1[0] - n0[0]), 9);
      }
    } else if (kind === 'crack') {
      ell(ctx, x, y + 2, w / 2, 4); ctx.fillStyle = 'rgba(255,60,50,0.3)'; ctx.fill();
      ctx.strokeStyle = 'rgba(60,20,20,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - w / 2, y + 2); for (i = 1; i <= 6; i++) ctx.lineTo(x - w / 2 + w * i / 6, y + 2 + (i % 2 ? -3 : 3)); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      for (i = 0; i < 3; i++) { var u = fr(t * 1.5 + i / 3); ctx.fillStyle = 'rgba(200,160,130,' + (0.6 * (1 - u)).toFixed(3) + ')'; circle(ctx, x + (i - 1) * w / 4, y - u * 22, 4 + u * 5); ctx.fill(); }
    } else { // path 光束路線
      var d = x2 >= x ? 1 : -1;
      ctx.save(); ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 60 * d; ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.restore();
      arrowHead(ctx, x2, y, d > 0 ? 0 : Math.PI, 12);
      var span = Math.abs(x2 - x);
      for (i = 0; i < 5; i++) { var mx = x + d * fr(i / 5 + t * 0.5) * span; arrowHead(ctx, mx, y, d > 0 ? 0 : Math.PI, 8); }
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; reticle(ctx, x, y, 12);
    }
    ctx.restore();
  }

  // ================= 素材 / 寶箱 / 終點旗 =================
  function drawPickup(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, ['wood', 'stone', 'crystal'], 'wood'), t = num(st.t, 0);
    ctx.save();
    if (scaleOf(ctx).rel < SIL) { matIcon(ctx, kind, x, y, 22, true); ctx.restore(); return; }
    var bob = Math.sin(t * 3 + x * 0.05) * 1;
    matIcon(ctx, kind, x, y + bob, 18);
    var sp = (Math.sin(t * 4 + x) + 1) / 2;
    if (sp > 0.8) { star4(ctx, x + 7, y - 7, 2.6 * (sp - 0.8) * 5); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); }
    ctx.restore();
  }

  function drawDropBit(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, KINDS, 'wood'), dur = Math.max(0.01, num(st.dur, 1)), t = clamp(num(st.t, 0), 0, dur);
    var vx = num(st.vx, 0), vy = num(st.vy, 0), u = t / dur, S = 14;
    ctx.save(); ctx.translate(x, y);
    if (u < 0.4) { ctx.rotate(t * 14); matIcon(ctx, kind, 0, 0, S); }
    else if (u < 0.6) {
      var q = (u - 0.4) / 0.2, k = Math.sin(Math.PI * q);
      ctx.translate(0, S / 2); ctx.scale(1 + 0.2 * k, 1 - 0.3 * k); matIcon(ctx, kind, 0, -S / 2, S);
    } else {
      var sp = Math.hypot(vx, vy), ang = Math.atan2(vy, vx), tl = Math.min(16, sp * 0.03);
      if (tl > 1) {
        for (var i = 3; i >= 1; i--) { ctx.save(); ctx.globalAlpha *= 0.12 * (4 - i); ctx.translate(-Math.cos(ang) * tl * i / 3, -Math.sin(ang) * tl * i / 3); matIcon(ctx, kind, 0, 0, S * (1 - 0.12 * i), true); ctx.restore(); }
      }
      ctx.rotate(ang); ctx.scale(1.2, 0.85); ctx.rotate(-ang); matIcon(ctx, kind, 0, 0, S);
    }
    ctx.restore();
  }

  function drawChest(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), open = st.open === true, simple = scaleOf(ctx).rel < SIL;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = '#2a1608';
    if (!open) {
      if (!simple) { var gl = 0.5 + 0.5 * Math.sin(nowS() * 4); ell(ctx, x, y + 2, 19, 15); ctx.fillStyle = 'rgba(255,214,90,' + (0.12 + 0.12 * gl).toFixed(3) + ')'; ctx.fill(); }
      rr(ctx, x - 17, y - 2, 34, 19, 3); ctx.fillStyle = PAL.chest; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 17, y - 2); ctx.quadraticCurveTo(x - 17, y - 14, x, y - 14); ctx.quadraticCurveTo(x + 17, y - 14, x + 17, y - 2); ctx.closePath();
      ctx.fillStyle = PAL.chestLid; ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.gold; ctx.fillRect(x - 11, y - 12, 4, 29); ctx.fillRect(x + 7, y - 12, 4, 29);
      rr(ctx, x - 4, y - 5, 8, 8, 1.5); ctx.fillStyle = PAL.gold; ctx.fill(); ctx.stroke();
      if (!simple) { var tw2 = 0.6 + 0.4 * Math.sin(nowS() * 5); star4(ctx, x + 14, y - 12, 3.5 * tw2 + 1); ctx.fillStyle = '#fff6c0'; ctx.fill(); }
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
    var cDur = Math.max(0.01, num(st.cheerDur, 0.6)), cT = clamp(num(st.cheerT, cDur), 0, cDur), cheering = cT < cDur, cq = cT / cDur;
    var simple = scaleOf(ctx).rel < SIL;
    ctx.save();
    rr(ctx, x - 18, y + 34, 14, 6, 2); ctx.fillStyle = '#555c6a'; ctx.fill();
    ctx.fillStyle = '#e6e9ef'; ctx.fillRect(x - 13, y - 36, 4, 70);
    circle(ctx, x - 11, y - 37, 2.5); ctx.fillStyle = PAL.gold; ctx.fill();
    var wv = simple ? 0 : (cheering ? Math.sin(cq * Math.PI * 6) * 7 : Math.sin(nowS() * 4) * 2);
    var lift = reached || cheering ? -3 : 3;
    ctx.beginPath(); ctx.moveTo(x - 9, y - 35 + lift); ctx.quadraticCurveTo(x + 4, y - 37 + wv + lift, x + 19, y - 31 + lift + wv * 0.5);
    ctx.quadraticCurveTo(x + 4, y - 25 - wv + lift, x - 9, y - 15 + lift); ctx.closePath();
    ctx.fillStyle = reached || cheering ? PAL.goalReached : PAL.goal; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
    if (reached || cheering) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 3, y - 27 + lift); ctx.lineTo(x + 1, y - 23 + lift); ctx.lineTo(x + 8, y - 31 + lift); ctx.stroke(); }
    else { star(ctx, x + 1, y - 26 + lift, 5); ctx.fillStyle = '#e5484d'; ctx.fill(); }
    if (cheering && !simple) { // 金色光點從旗頂往上噴(框外至多 40px)
      ctx.fillStyle = PAL.select;
      for (var i = 0; i < 7; i++) { var a = -Math.PI / 2 + (i - 3) * 0.13, d = 36 * eOut(cq) * (0.6 + 0.4 * hash(i, 3)); ctx.globalAlpha = 1 - cq * 0.8; star4(ctx, x + 2 + Math.cos(a) * d, y - 40 + Math.sin(a) * d, 3.5 * (1 - cq) + 1); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawGoalPrompt(ctx, st) {
    st = obj(st);
    var x = num(st.x, 640), y = num(st.y, 360), first = st.first === true, t = num(st.t, 0);
    var bw = 200, bh = 48, bx = clamp(x - bw / 2, 8, 1272 - bw), by = y - 8 - bh, cx = bx + bw / 2, cy = by + bh / 2;
    ctx.save();
    if (first) { var s = 1.15 * (1 + 0.05 * Math.sin(t * TAU / 0.8)); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); }
    poly(ctx, [x - 9, by + bh - 1, x + 9, by + bh - 1, x, y - 2]); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, bx, by, bw, bh, 8); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = first ? 4 : 3; ctx.strokeStyle = first ? K.select : K.edge; ctx.stroke();
    ctx.fillStyle = K.parch; ctx.fillRect(x - 7.5, by + bh - 3, 15, 4);
    var bob = Math.sin(t * TAU / 0.6) * 1.5;
    text(ctx, '按', bx + 22, cy + 1, 18, K.ink, 'left', true);
    keycap(ctx, '↓', bx + 66, cy - 1 + bob, 18, true);
    text(ctx, '完成關卡', bx + 88, cy + 1, 18, K.ink, 'left', true);
    ctx.restore();
  }

  // ================= 血條 =================
  function drawHpBar(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), maxHp = clamp(Math.round(num(st.maxHp, 1)), 1, 99), maxS = clamp(Math.round(num(st.maxShield, 0)), 0, 99);
    var hp = clamp(num(st.hp, maxHp), 0, maxHp), sh = clamp(num(st.shield, 0), 0, maxS), tot = maxHp + maxS;
    var cDur = Math.max(0.01, num(st.chipDur, 0.4)), cT = clamp(num(st.chipT, cDur), 0, cDur), chip = clamp(num(st.chip, hp + sh), 0, tot);
    var big = st.big === true, weak = st.weak === true;
    var Wd = Math.min(96, Math.max(16, 6 * tot + 4)), hh = big ? 7 : 5, x0 = x - Wd / 2, y0 = y - hh, u = Wd / tot;
    ctx.save();
    rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.fillStyle = 'rgba(10,6,14,0.82)'; ctx.fill();
    ctx.save(); rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.clip();
    var lost = (chip - (hp + sh)) * (1 - cT / cDur);
    if (lost > 0.01) { var ws = hp < maxHp ? maxS + hp : sh; ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + ws * u, y0, lost * u, hh); }
    if (sh > 0) { ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + hh, [0, '#c4d6ee', 1, '#6f8fb8']); ctx.fillRect(x0, y0, sh * u, hh); }
    if (hp > 0) { ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + hh, weak ? [0, '#fff09a', 1, '#e8b020'] : [0, '#ff8a8a', 1, '#e02a3c']); ctx.fillRect(x0 + maxS * u, y0, hp * u, hh); }
    if (maxS > 0) { ctx.fillStyle = '#1a1420'; ctx.fillRect(x0 + maxS * u - 0.75, y0, 1.5, hh); }
    ctx.restore();
    if (weak) { rr(ctx, x0 + 0.75, y0 + 0.75, Wd - 1.5, hh - 1.5, hh / 2); ctx.lineWidth = 1.5; ctx.strokeStyle = PAL.weak; ctx.stroke(); }
    ctx.restore();
  }

  // ================= 怪物(monsters 方案 B: 圓潤 Q 版、上亮下暗、白眼紅瞳、不描邊) =================
  var FL = false; // 受擊閃白
  function blob(ctx, x, y, rx, ry, light, dark, rot) {
    if (FL) { light = '#ffffff'; dark = '#e6e8ee'; }
    ell(ctx, x, y, rx, ry, rot); ctx.fillStyle = lin(ctx, x, y - ry, x, y + ry, [0, light, 1, dark]); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(20,10,20,0.45)'; ctx.stroke();
    ell(ctx, x - rx * 0.35, y - ry * 0.45, rx * 0.35, ry * 0.22, -0.4); ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fill();
  }
  function fcol(c) { return FL ? '#ffffff' : c; }
  function eyeB(ctx, x, y, r, angry, brood) {
    if (angry) { circle(ctx, x, y, r + 2.2); ctx.fillStyle = brood ? 'rgba(194,100,255,0.45)' : 'rgba(255,50,50,0.42)'; ctx.fill(); }
    circle(ctx, x, y, r); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    ctx.fillStyle = brood ? PAL.brood : PAL.foeEye;
    if (angry) ell(ctx, x, y, r * 0.32, r * 0.8); else circle(ctx, x, y, r * 0.52);
    ctx.fill();
  }
  function spiralEye(ctx, x, y, r) {
    circle(ctx, x, y, r); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    ctx.strokeStyle = '#3a2030'; ctx.lineWidth = Math.max(0.8, r * 0.18); ctx.beginPath();
    for (var a = 0; a < 9; a += 0.45) ctx.lineTo(x + Math.cos(a) * a * r * 0.1, y + Math.sin(a) * a * r * 0.1);
    ctx.stroke();
  }
  function brow(ctx, x, y, f, w) { ctx.strokeStyle = '#2a1010'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - f * w, y - 2.5); ctx.lineTo(x + f * w, y + 0.5); ctx.stroke(); }
  function shadowE(ctx, y, rx) { ell(ctx, 0, y, rx, 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); }
  function veins(ctx, pts, lw) { // 巢穴記號: 背上發光紫紋
    ctx.save(); ctx.strokeStyle = PAL.brood; ctx.lineWidth = lw || 2.2; ctx.shadowColor = PAL.brood; ctx.shadowBlur = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.restore();
  }
  function stunStars(ctx, top, t, n) { // 星星帶: 判定框上緣上方 18~36px(血條之上)
    for (var i = 0; i < n; i++) {
      var a = t * 4 + i * TAU / n, sx = Math.cos(a) * 13, sy = top - 27 + Math.sin(a) * 3;
      star4(ctx, sx, sy, 4.5); ctx.fillStyle = i % 2 ? '#fff6c0' : PAL.weak; ctx.fill();
    }
  }
  function speedLines(ctx, side, x0, ys, len, col) {
    ctx.save(); ctx.strokeStyle = col || 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'butt';
    for (var i = 0; i < ys.length; i++) { var l = len * (0.6 + 0.4 * hash(i, 5)); ctx.beginPath(); ctx.moveTo(side * x0, ys[i]); ctx.lineTo(side * (x0 + l), ys[i]); ctx.stroke(); }
    ctx.restore();
  }
  // 共用外殼: 剪影 / 擊飛(傾斜 + 框外速度線)/ 受擊閃白
  function foe(ctx, st, w, h, col, body, opt) {
    st = obj(st); opt = opt || {};
    var x = num(st.x, 0), y = num(st.y, 0), f = face(st.facing), state = st.state, t = num(st.t, 0);
    var sc = scaleOf(ctx);
    ctx.save(); ctx.translate(x, y);
    if (sc.rel < SIL) {
      var lw = 1.6 / sc.abs;
      ell(ctx, 0, 0, w / 2 - lw / 2, h / 2 - lw / 2); ctx.fillStyle = st.hit === true ? '#ffffff' : col; ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = st.brood === true ? PAL.brood : '#160c12'; ctx.stroke();
      if (st.brood === true) { ctx.lineWidth = 2 * lw; ctx.stroke(); }
      ctx.restore(); return;
    }
    var flung = state === 'flung' && opt.canFling !== false;
    var fd = st.flingDir === 1 ? 1 : (st.flingDir === -1 ? -1 : -f);
    if (flung) speedLines(ctx, -fd, w / 2 + 2, [-h * 0.3, 0, h * 0.3], 38);
    FL = st.hit === true;
    ctx.save();
    if (flung) { ctx.rotate(fd * 0.3); ctx.scale(0.86, 0.86); }
    try { body(ctx, f, state, t, st.brood === true, st); } finally { FL = false; }
    ctx.restore();
    ctx.restore();
  }

  function drawBoar(ctx, st) {
    foe(ctx, st, 48, 32, '#b8784a', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
      var w = s === 'windup', ch = s === 'charge', stun = s === 'stun', lg = s === 'walk' ? Math.sin(t * 10) * 2 : (ch ? Math.sin(t * 22) * 2.5 : 0);
      shadowE(ctx, 14, 20);
      if (w) { ctx.fillStyle = 'rgba(220,200,170,0.8)'; circle(ctx, -f * 18, 12, 3.5); ctx.fill(); circle(ctx, -f * 22, 13, 2.5); ctx.fill(); ctx.translate(0, 16); ctx.scale(1, 0.86); ctx.translate(0, -16); }
      if (ch) ctx.rotate(f * 0.06);
      ctx.fillStyle = fcol('#5a3020'); [-12, -5, 6, 12].forEach(function (lx, i) { rr(ctx, lx * f - 2.5 + (i % 2 ? lg : -lg), 8, 5.5, 8, 2.5); ctx.fill(); });
      blob(ctx, -f * 2, 1, 18, 12, brood ? '#a86a8a' : '#d08a58', brood ? '#5a2a50' : '#7a4426');
      poly(ctx, [-f * 2, -10, f * 2, -15, f * 5, -9]); ctx.fillStyle = fcol('#7a4426'); ctx.fill();
      if (brood) veins(ctx, [-f * 16, -2, -f * 10, -8, -f * 4, -2, f * 2, -8]);
      blob(ctx, f * 15, 4, 6.5, 5.5, '#f2b4a4', '#c8786a');
      ctx.fillStyle = '#5a2a20'; circle(ctx, f * 17, 3, 1); ctx.fill(); circle(ctx, f * 14, 3, 1); ctx.fill();
      ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 12, 8); ctx.quadraticCurveTo(f * 16, 10, f * 18, 4); ctx.stroke();
      if (stun) { spiralEye(ctx, f * 8, -3, 3.4); stunStars(ctx, -16, t, 3); }
      else { eyeB(ctx, f * 8, -3, 3.4, w || ch, brood); if (w || ch) brow(ctx, f * 8, -7, f, 3.5); }
      if (ch) speedLines(ctx, -f, 6, [-6, 0, 6], 12, 'rgba(255,255,255,0.7)');
    });
  }

  function drawFrog(ctx, st) {
    foe(ctx, st, 32, 28, '#b5d43a', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['crouch', 'jump', 'flung'], 'crouch');
      var top = brood ? '#b8a0e0' : '#d4f060', bot = brood ? '#6a4a9a' : '#6a9a20';
      if (s === 'jump') {
        ctx.strokeStyle = fcol('#5a8a18'); ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-f * 6, 6); ctx.lineTo(-f * 13, 12); ctx.moveTo(f * 4, 7); ctx.lineTo(f * 8, 12); ctx.stroke();
        blob(ctx, 0, 0, 11, 10, top, bot);
        if (brood) veins(ctx, [-f * 8, -2, -f * 3, -6, f * 2, -2]);
        eyeB(ctx, f * 3, -7, 3.6, false, brood); eyeB(ctx, f * 9, -5, 3.6, false, brood);
      } else {
        shadowE(ctx, 12, 14);
        blob(ctx, -f * 9, 8, 6.5, 5, '#a8d040', '#5a8a18');
        blob(ctx, 0, 4, 14, 8.5, top, bot);
        ell(ctx, 0, 8, 9, 3.5); ctx.fillStyle = 'rgba(255,250,210,0.5)'; ctx.fill();
        if (brood) veins(ctx, [-f * 10, 2, -f * 4, -2, f * 2, 2]);
        eyeB(ctx, f * 2, -4, 4, false, brood); eyeB(ctx, f * 9, -3, 4, false, brood);
      }
    });
  }

  function drawShooterBee(ctx, st) {
    foe(ctx, st, 32, 32, '#f2c230', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['fly', 'aim', 'flung'], 'fly');
      var aim = s === 'aim', flap = Math.sin(t * 40) * 0.5 + 0.5;
      if (aim) { ctx.rotate(f * 0.2); ctx.scale(0.92, 0.92); }
      ctx.fillStyle = 'rgba(235,245,255,0.65)'; ell(ctx, -f * 3, -9, 6, 2 + 3 * flap, -0.4); ctx.fill(); ell(ctx, f * 2, -10, 5, 2 + 2.5 * flap, 0.4); ctx.fill();
      blob(ctx, -f * 3, 2, 10.5, 8.5, aim ? '#ffc070' : '#ffe070', aim ? '#e06a10' : '#d89a10');
      ctx.save(); ell(ctx, -f * 3, 2, 10.5, 8.5); ctx.clip(); ctx.fillStyle = fcol('rgba(40,24,8,0.85)'); ctx.fillRect(-f * 3 - 6, -8, 3.5, 20); ctx.fillRect(-f * 3 + 1, -8, 3.5, 20); ctx.restore();
      if (brood) veins(ctx, [-f * 10, -2, -f * 5, -5, f * 1, -2], 2);
      blob(ctx, f * 9, -1, 5.5, 5.5, '#6a4a20', '#3a2410');
      eyeB(ctx, f * 10, -2, 2.6, aim, brood);
      poly(ctx, [-f * 12, 4, -f * 12, 8, -f * 15.5, 7]); ctx.fillStyle = fcol('#2a1a08'); ctx.fill();
      if (aim) { var g = 0.6 + 0.4 * Math.sin(t * 30); circle(ctx, -f * 14.5, 7, 2.6 + g); ctx.fillStyle = 'rgba(255,70,40,0.9)'; ctx.fill(); }
    });
  }

  function drawThorn(ctx, st) {
    st = obj(st);
    var stT = clamp(num(st.stateT, 0), 0, 100);
    foe(ctx, st, 40, 48, '#5fae3a', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['idle', 'windup', 'whip', 'recover'], 'idle');
      var w = s === 'windup', wh = s === 'whip', rec = s === 'recover';
      ell(ctx, -6, 21, 7, 2.2, -0.3); ctx.fillStyle = fcol('#4a9a34'); ctx.fill(); ell(ctx, 6, 21, 7, 2.2, 0.3); ctx.fill();
      var sway = s === 'idle' ? Math.sin(t * 2) * 0.06 : 0;
      ctx.save(); ctx.translate(0, 24); ctx.rotate(sway); ctx.translate(0, -24);
      ctx.strokeStyle = fcol('#4f9a34'); ctx.lineWidth = 4.5; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(0, 21.7); ctx.quadraticCurveTo(-3, 10, 0, -2); ctx.stroke();
      ctx.strokeStyle = fcol('#6fbf42'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-f * 1, 10); ctx.bezierCurveTo(-f * 9, 12, -f * 13, 5, -f * 11, 1); ctx.stroke();
      if (w) { ctx.beginPath(); ctx.moveTo(f * 1, 8); ctx.bezierCurveTo(-f * 10, 4, -f * 16, -12, -f * 6, -18); ctx.stroke(); circle(ctx, -f * 6, -18, 3.4); ctx.fillStyle = 'rgba(255,70,50,0.85)'; ctx.fill(); }
      else if (rec) { ctx.beginPath(); ctx.moveTo(f * 1, 10); ctx.quadraticCurveTo(f * 10, 22, f * 18, 22); ctx.stroke(); }
      else if (!wh) { ctx.beginPath(); ctx.moveTo(f * 1, 10); ctx.bezierCurveTo(f * 9, 12, f * 13, 5, f * 11, 1); ctx.stroke(); }
      var open = w ? 1 : (wh ? 0.9 : (rec ? 0.3 : 0.55));
      for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + 0.3; blob(ctx, Math.cos(a) * (5 + open * 3), -10 + Math.sin(a) * (5 + open * 3), 5 * (0.7 + 0.3 * open), 3.6, '#ff8aa0', '#d03a5a', a); }
      blob(ctx, 0, -10, 5.5, 5.5, w || wh ? '#7a1a2a' : '#ffe680', w || wh ? '#3a0810' : '#e8a820');
      if (brood) veins(ctx, [-4, 6, 0, 0, 4, 6], 2);
      eyeB(ctx, f * 1, -11, 2.6, w || wh, brood);
      ctx.restore();
      if (wh) { // 藤鞭橫掃: 甩到面向側框外 140px、貼地高 40 範圍內
        var pr = eOut(stT / 0.3), tip = 20 + 137 * pr;
        ctx.strokeStyle = fcol('#6fbf42'); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f * 2, 8); ctx.quadraticCurveTo(f * tip * 0.55, 2, f * tip, 14); ctx.stroke();
        ctx.fillStyle = fcol('#d03a5a');
        for (var j = 1; j <= 5; j++) { var u = j / 6, px = f * tip * u, py = lerp(8, 14, u) - 4 * Math.sin(u * Math.PI); poly(ctx, [px - 3, py, px, py - 5, px + 3, py]); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f * tip * 0.6, 12, 8, f > 0 ? -1.2 : Math.PI + 0.2, f > 0 ? -0.2 : Math.PI + 1.2); ctx.stroke();
      }
    }, { canFling: false });
  }

  function drawRam(ctx, st) {
    foe(ctx, st, 44, 36, '#d8dde6', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['walk', 'windup', 'butt', 'stagger', 'flung'], 'walk');
      var w = s === 'windup', b = s === 'butt', stg = s === 'stagger', lg = s === 'walk' ? Math.sin(t * 9) * 2 : (b ? Math.sin(t * 20) * 2.5 : 0);
      shadowE(ctx, 16, 19);
      if (stg) ctx.rotate(Math.sin(t * 14) * 0.08);
      if (b) ctx.rotate(f * 0.08);
      if (w) { ctx.fillStyle = 'rgba(230,236,246,0.85)'; circle(ctx, -f * 18, 15, 3.5); ctx.fill(); circle(ctx, -f * 21, 16, 2.4); ctx.fill(); }
      ctx.fillStyle = fcol('#4a5060'); [-12, -5, 5, 11].forEach(function (lx, i) { rr(ctx, lx * f - 2.5 + (w && i < 2 ? -f * 2 : (i % 2 ? lg : -lg)), 7, 5, 11, 2.5); ctx.fill(); });
      [[-12, 0, 8], [-4, -6, 8.5], [5, -4, 8], [-9, 6, 7.5], [3, 5, 8]].forEach(function (q) { blob(ctx, -f * 2 + q[0] * f, q[1], q[2], q[2] * 0.92, brood ? '#e8d8ff' : '#ffffff', brood ? '#9a88bc' : '#aab4c8'); });
      if (brood) veins(ctx, [-f * 16, -2, -f * 10, -9, -f * 3, -4, f * 3, -10]);
      var hx = f * (w ? 15.5 : 14), hy = w ? 5 : -4;
      blob(ctx, hx, hy, 6.5, 6, '#7a8294', '#4a5060');
      ctx.strokeStyle = fcol('#e0bc78'); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx - f * 3, hy - 3, 5.5, w ? 0.2 : -1.2, w ? 3.8 : 2.6); ctx.stroke();
      if (stg) { spiralEye(ctx, hx + f * 2.5, hy - 1, 2.6); stunStars(ctx, -18, t, 3); }
      else { eyeB(ctx, hx + f * 2.5, hy - 1, 2.6, w || b, brood); if (w || b) brow(ctx, hx + f * 2.5, hy - 4.5, f, 3); }
      if (b) speedLines(ctx, -f, 8, [-8, 0, 8], 12, 'rgba(255,255,255,0.7)');
    });
  }

  function drawHawk(ctx, st) {
    st = obj(st);
    var ang = num(st.angle, 0);
    foe(ctx, st, 40, 28, '#6a7ea8', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['circle', 'hover', 'dive', 'return', 'flung'], 'circle');
      if (s === 'dive' || s === 'return') {
        var c = Math.abs(Math.cos(ang)), sn = Math.abs(Math.sin(ang)), k = Math.min(1, 19 / (20 * c + 10 * sn), 13 / (20 * sn + 10 * c));
        ctx.rotate(ang); ctx.scale(k, k);
        if (s === 'dive') { poly(ctx, [20, 0, 4, -6, -16, -9, -10, 0, -16, 9, 4, 6]); ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -9, 0, 9, [0, '#8ea2c8', 1, '#34446a']); ctx.fill(); }
        else { blob(ctx, -8, -6, 10, 4, '#7a8eb8', '#3e4e72', -0.4); blob(ctx, -8, 6, 10, 4, '#7a8eb8', '#3e4e72', 0.4); blob(ctx, 0, 0, 10, 5.5, '#6a7ea8', '#34446a'); }
        if (brood) veins(ctx, [-10, 0, -4, -3, 2, 0], 2);
        blob(ctx, 10, 0, 5, 5, '#ffffff', '#c8ccd8');
        poly(ctx, [14, -2, 19, 0, 14, 2]); ctx.fillStyle = fcol('#f2c230'); ctx.fill();
        eyeB(ctx, 11, -1.5, 2, true, brood);
        return;
      }
      var hov = s === 'hover', flap = hov ? 1 : Math.sin(t * 9) * 0.5 + 0.5, wy = hov ? -11 : -1 - 7 * flap;
      ctx.scale(0.9, 0.9);
      blob(ctx, -f * 11, wy * 0.6, 11, 4.5, '#7a8eb8', '#3e4e72', -f * (hov ? 0.9 : 0.15 + 0.3 * flap));
      blob(ctx, f * 8, wy * 0.6 - 1, 9, 4.2, '#8ea2c8', '#4a5a80', f * (hov ? 0.9 : 0.15 + 0.3 * flap));
      blob(ctx, 0, 1, 9, 6, '#6a7ea8', '#34446a');
      if (brood) veins(ctx, [-f * 7, 2, -f * 2, -2, f * 3, 2], 2);
      blob(ctx, f * 9, -2, 5, 5, '#ffffff', '#c8ccd8');
      poly(ctx, [f * 13, -3, f * 17, -1, f * 13, 1]); ctx.fillStyle = fcol('#f2c230'); ctx.fill();
      eyeB(ctx, f * 10, -3, 2.2, hov, brood);
      if (hov) { ctx.strokeStyle = fcol('#f2c230'); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 1, 6); ctx.lineTo(f * 4, 11); ctx.moveTo(-f * 2, 6); ctx.lineTo(f * 0, 11); ctx.stroke(); }
    });
  }

  function drawLizard(ctx, st) {
    foe(ctx, st, 36, 24, '#d89a58', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['crawl', 'windup', 'throw'], 'crawl');
      var w = s === 'windup', th = s === 'throw', lg = s === 'crawl' ? Math.sin(t * 10) * 2 : 0;
      ctx.scale(0.92, 1);
      ctx.strokeStyle = fcol('#8a5a2e'); ctx.lineWidth = 3; ctx.lineCap = 'round';
      [-9, -3, 4, 9].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, -4); ctx.lineTo(lx + (i % 2 ? 3 : -3) + (i % 2 ? lg : -lg), -11); ctx.stroke(); });
      ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-f * 12, -4);
      if (w) ctx.quadraticCurveTo(-f * 18, 4, -f * 8, 6); else if (th) ctx.quadraticCurveTo(-f * 18, 6, -f * 16, 10); else ctx.quadraticCurveTo(-f * 19, -2, -f * 17, 5);
      ctx.stroke();
      blob(ctx, -f * 1, -4, 13, 5.5, brood ? '#d8b8f0' : '#e8b070', brood ? '#7a5aa0' : '#a86a34');
      if (brood) veins(ctx, [-f * 10, -3, -f * 4, -6, f * 2, -3], 2);
      blob(ctx, f * 13, -1, 5, 4.5, '#f0bc80', '#b07038', f * 0.5);
      eyeB(ctx, f * 14, 0, 2.4, w || th, brood);
      if (w) { blob(ctx, -f * 7, 7, 4.5, 4, '#b8bec8', '#6a707c'); }
    }, { canFling: false });
  }

  function drawRockShot(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0), kind = oneOf(st.kind, ['lizard', 'spit'], 'lizard');
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 8);
    var p = [];
    for (var i = 0; i < 7; i++) { var a = i / 7 * TAU, r = 7.5 * (0.8 + hash(i, kind === 'spit' ? 3 : 1) * 0.25); p.push(Math.cos(a) * r, Math.sin(a) * r); }
    poly(ctx, p); ctx.fillStyle = kind === 'spit' ? lin(ctx, 0, -8, 0, 8, [0, '#c9cfdc', 1, '#5d6680']) : lin(ctx, 0, -8, 0, 8, [0, '#d8d2c4', 1, '#7a6a5a']); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,74,58,0.95)'; ctx.stroke(); // 紅色危險描邊(和炸彈分開)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; circle(ctx, 2, 2, 2.4); ctx.fill();
    ctx.restore();
  }

  function drawShieldman(ctx, st) {
    st = obj(st);
    var hasShield = st.hasShield !== false, bDur = Math.max(0.01, num(st.breakDur, 0.4)), bT = clamp(num(st.breakT, bDur), 0, bDur);
    foe(ctx, st, 32, 40, '#7d8799', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['walk', 'block', 'flung'], 'walk');
      var lg = s === 'walk' ? Math.sin(t * 8) * 1.8 : 0;
      shadowE(ctx, 18, 13);
      ctx.fillStyle = fcol('#3a4050'); rr(ctx, -6 + lg, 12, 5, 8, 2); ctx.fill(); rr(ctx, 1 - lg, 12, 5, 8, 2); ctx.fill();
      blob(ctx, -1, 3, 10, 10.5, hasShield ? '#9aa4b8' : '#f0a060', hasShield ? '#56607a' : '#b0582a');
      if (brood) veins(ctx, [-f * 9, 0, -f * 5, -4, -f * 1, 0, f * 3, -4], 2);
      blob(ctx, -1, -11.5, 8, 8, '#7a849c', '#424a60');
      rr(ctx, f > 0 ? -1 : -7, -13.5, 8, 3.5, 1.5); ctx.fillStyle = '#120a0a'; ctx.fill();
      eyeB(ctx, f * 3, -11.8, 2, !hasShield, brood);
      if (hasShield) {
        var sx = f > 0 ? 4 : -16, blk = s === 'block';
        rr(ctx, sx, -16, 12, 32, 5);
        ctx.fillStyle = FL || blk ? '#ffffff' : lin(ctx, sx, 0, sx + 12, 0, [0, '#7aa8e0', 1, '#3a5f90']); ctx.fill();
        ctx.lineWidth = 1.8; ctx.strokeStyle = '#e8f0ff'; ctx.stroke();
        circle(ctx, sx + 6, 0, 2.5); ctx.fillStyle = blk ? PAL.select : '#e8f0ff'; ctx.fill();
        if (blk) { ctx.strokeStyle = PAL.select; ctx.lineWidth = 2; for (var i = 0; i < 3; i++) { var yy = -8 + i * 8; ctx.beginPath(); ctx.moveTo(f * 13, yy); ctx.lineTo(f * 16, yy - 3); ctx.stroke(); } }
      } else {
        var bx = f > 0 ? 6 : -11; // 殘把手
        ctx.fillStyle = fcol('#5a86c0'); poly(ctx, [bx, -2, bx + 5, -4, bx + 4, 1, bx + 5, 4, bx, 5]); ctx.fill();
        brow(ctx, f * 3, -15, f, 3.5);
      }
      if (bT < bDur) { // 盾碎: 碎片往面向側噴開(框外至多 24px)
        var q = bT / bDur;
        ctx.save(); ctx.globalAlpha *= 1 - q;
        if (q < 0.4) { circle(ctx, f * 10, 0, 6 + 14 * q / 0.4); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
        for (var j = 0; j < 5; j++) { var a = (j - 2) * 0.5, d = 4 + 18 * eOut(q); ctx.save(); ctx.translate(f * (10 + Math.cos(a) * d), Math.sin(a) * d * 0.8 + 40 * q * q); ctx.rotate(j + q * 8); poly(ctx, [-3.5, -4, 3.5, -3, 3, 4, -3, 3]); ctx.fillStyle = '#4f78a8'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore(); }
        ctx.restore();
      }
    });
  }

  function drawBeetle(ctx, st) {
    st = obj(st);
    var fDur = Math.max(0.01, num(st.fuseDur, 0.8)), fT = clamp(num(st.fuseT, fDur), 0, fDur);
    foe(ctx, st, 32, 24, '#3b4170', function (ctx, f, s, t, brood) {
      s = oneOf(s, ['crawl', 'fuse', 'flung'], 'crawl');
      var fu = s === 'fuse', q = fu ? fT / fDur : 0, blink = fu && Math.sin(q * q * 60) > 0, lg = s === 'crawl' ? Math.sin(t * 14) * 1.5 : 0;
      if (fu) { var k = 1 + 0.15 * q; ctx.scale(k, k); circle(ctx, 0, 0, 14); ctx.fillStyle = 'rgba(255,120,60,' + (0.2 + 0.3 * q).toFixed(3) + ')'; ctx.fill(); }
      shadowE(ctx, 10, 13);
      ctx.strokeStyle = fcol('#1a1a22'); ctx.lineWidth = 2; ctx.lineCap = 'round';
      [-7, 0, 7].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, 4); ctx.lineTo(lx - f * 3 + (i % 2 ? lg : -lg), 10); ctx.stroke(); });
      ctx.beginPath(); ctx.ellipse(-f * 1, 4, 12.5, 12, 0, Math.PI, TAU); ctx.closePath();
      ctx.fillStyle = FL || blink ? '#ffffff' : lin(ctx, 0, -8, 0, 4, [0, '#6a73b0', 1, '#22264a']); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(20,10,30,0.5)'; ctx.stroke();
      ctx.strokeStyle = 'rgba(180,190,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-f * 1, -7); ctx.lineTo(-f * 1, 3); ctx.stroke();
      if (brood) veins(ctx, [-f * 9, 0, -f * 5, -5, -f * 1, -1, f * 4, -5], 2);
      ell(ctx, -f * 1, 3, 9, 2.4); ctx.fillStyle = fu ? '#ffe14d' : '#ff9a2a'; ctx.fill();
      blob(ctx, f * 11, 2, 4.5, 4, '#3a3e48', '#1a1c22');
      eyeB(ctx, f * 12, 1, 2, fu, brood);
      ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-f * 4, -7); ctx.quadraticCurveTo(-f * 6, -10, -f * 5, -11); ctx.stroke();
      circle(ctx, -f * 5, -10.5, fu ? 1.4 + 1.2 * (blink ? 1 : 0) : 1.2); ctx.fillStyle = '#ffe14d'; ctx.fill();
    });
  }

  function drawBat(ctx, st) {
    foe(ctx, st, 24, 20, '#7a6a9a', function (ctx, f, s, t, brood) {
      var up = Math.sin(t * 16) > 0, wy = up ? -5 : 2;
      ctx.scale(0.88, 0.88);
      blob(ctx, -7, wy * 0.5, 6, 3, '#7a6a9a', '#3a2a50', up ? 0.6 : -0.2);
      blob(ctx, 7, wy * 0.5, 6, 3, '#7a6a9a', '#3a2a50', up ? -0.6 : 0.2);
      blob(ctx, 0, 0, 5, 5, brood ? '#b090d8' : '#8a7aaa', brood ? '#5a3a86' : '#4a3a66');
      poly(ctx, [-3.5, -3, -3, -7.5, -0.8, -4]); ctx.fillStyle = fcol('#5a4a7a'); ctx.fill(); poly(ctx, [3.5, -3, 3, -7.5, 0.8, -4]); ctx.fill();
      if (brood) veins(ctx, [-3, 2, 0, -1, 3, 2], 1.6);
      eyeB(ctx, f * 1.6 - 1.6, -0.5, 1.6, false, brood); eyeB(ctx, f * 1.6 + 1.6, -0.5, 1.6, false, brood);
    });
  }

  // ---------- 巢母(64×56, 三主題各一) ----------
  function weakGlow(ctx, x, y, rx, ry, t) {
    var pu = 0.75 + 0.25 * Math.sin(TAU * t * 4);
    ctx.save(); ctx.shadowColor = PAL.weak; ctx.shadowBlur = 14 * pu;
    ell(ctx, x, y, rx, ry); ctx.fillStyle = PAL.weak; ctx.fill(); ctx.restore();
    ell(ctx, x, y, rx * 0.55, ry * 0.5); ctx.fillStyle = '#fffbe0'; ctx.fill();
  }
  function drawBroodmother(ctx, st) {
    st = obj(st);
    var kind = oneOf(st.kind, ['forest', 'cliff', 'mine'], 'forest');
    var sDur = Math.max(0.01, num(st.stateDur, 1)), sT = clamp(num(st.stateT, 0), 0, 1000), sp = clamp(sT / sDur, 0, 1);
    var cols = { forest: '#9a7a4a', cliff: '#6c7690', mine: '#3b4170' };
    foe(ctx, st, 64, 56, cols[kind], function (ctx, f, s, t) {
      if (kind === 'forest') {
        s = oneOf(s, ['walk', 'windup', 'charge', 'stun'], 'walk');
        var w = s === 'windup', ch = s === 'charge', stun = s === 'stun', lg = s === 'walk' ? Math.sin(t * 7) * 2.5 : (ch ? Math.sin(t * 18) * 3 : 0);
        shadowE(ctx, 26, 28);
        if (w) { ctx.fillStyle = 'rgba(220,200,170,0.85)'; circle(ctx, -f * 26, 22, 4.5); ctx.fill(); circle(ctx, -f * 30, 24, 3); ctx.fill(); ctx.translate(0, 28); ctx.scale(1, 0.88); ctx.translate(0, -28); }
        if (ch) ctx.rotate(f * 0.06);
        ctx.scale(0.9, 1);
        ctx.fillStyle = fcol('#3a2614'); [-18, -8, 6, 16].forEach(function (lx, i) { rr(ctx, lx * f - 3.5 + (i % 2 ? lg : -lg), 12, 7, 15, 3); ctx.fill(); });
        for (var i = 0; i < 6; i++) { var bx = -f * (20 - i * 6); poly(ctx, [bx - 3, -10, bx - f * 1, -25 + (i % 2) * 5, bx + 4, -10]); ctx.fillStyle = fcol('#4f9a34'); ctx.fill(); }
        blob(ctx, -f * 3, 2, 26, 17, '#9a7a4a', '#4a3418');
        veins(ctx, [-f * 20, 2, -f * 13, -5, -f * 6, 2, f * 1, -5, f * 8, 2], 2.6);
        if (stun) weakGlow(ctx, -f * 6, -4, 9, 6, t);
        blob(ctx, f * 20, 5, 11, 10, '#a8865a', '#5a4020');
        blob(ctx, f * 29, 7, 6, 5, '#f2b4a4', '#c8786a');
        ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 25, 12); ctx.quadraticCurveTo(f * 33, 13, f * 34, 3); ctx.stroke();
        if (stun) { spiralEye(ctx, f * 20, -1, 4.5); }
        else { eyeB(ctx, f * 20, -1, 4.5, true, true); brow(ctx, f * 20, -6.5, f, 5); }
        if (ch) speedLines(ctx, -f, 8, [-10, 0, 10], 14, 'rgba(255,255,255,0.7)');
      } else if (kind === 'cliff') {
        s = oneOf(s, ['walk', 'windup', 'spit', 'pant'], 'walk');
        var wu = s === 'windup', spt = s === 'spit', pant = s === 'pant', lg2 = s === 'walk' ? Math.sin(t * 7) * 2.5 : 0;
        shadowE(ctx, 26, 28);
        if (wu || spt) { ctx.translate(-f * 20, 28); ctx.rotate(-f * 0.2 * (wu ? sm(sp) : 1)); ctx.scale(0.94, 0.94); ctx.translate(f * 20, -28); }
        ctx.strokeStyle = fcol('#3e4458'); ctx.lineWidth = 6; ctx.lineCap = 'round';
        [-20, -8, 8, 20].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx * f * 0.9, 8); ctx.lineTo(lx * f * 0.9 + (i < 2 ? -f * 4 : f * 4) + (i % 2 ? lg2 : -lg2), 25); ctx.stroke(); });
        ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-f * 18, 4); ctx.quadraticCurveTo(-f * 30, 10, -f * 29, 22); ctx.stroke();
        for (var k = 0; k < 5; k++) { var sx = -f * (18 - k * 8); poly(ctx, [sx - 4, -6, sx - f * 1, -22 + (k % 2) * 6, sx + 4, -6]); ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -22, 0, -6, [0, '#e8eef5', 1, '#7d8ca5']); ctx.fill(); }
        blob(ctx, -f * 2, 3, 24, 13, '#8a94ae', '#3e4660');
        veins(ctx, [-f * 18, 2, -f * 11, -4, -f * 4, 2, f * 3, -4, f * 10, 2], 2.6);
        if (pant) weakGlow(ctx, f * 8, 8, 9, 5, t);
        blob(ctx, f * 22, 0, 10, 8, '#9aa4bc', '#4a5470');
        var mo = spt ? 6 : (pant ? 4 : (wu ? 2 : 0.5));
        ctx.fillStyle = fcol('#2a1420'); ell(ctx, f * 27, 4, 5, mo); ctx.fill();
        if (pant) { ctx.fillStyle = '#ff8aa0'; ell(ctx, f * 30, 8 + Math.sin(t * 10), 2.5, 3.5); ctx.fill(); ctx.fillStyle = 'rgba(200,230,255,0.85)'; circle(ctx, f * 16, -10 + fr(t * 1.5) * 8, 1.8); ctx.fill(); }
        if (spt) { ctx.fillStyle = 'rgba(200,190,170,0.85)'; circle(ctx, f * 31, 1, 3); ctx.fill(); }
        if (pant) spiralEye(ctx, f * 22, -3, 3.6); else eyeB(ctx, f * 22, -3, 3.6, wu || spt, true);
      } else {
        s = oneOf(s, ['walk', 'burrow', 'under', 'erupt', 'stuck'], 'walk');
        if (s === 'under') { // 只畫地面上一團土堆
          ell(ctx, 0, 24, 30, 4); ctx.fillStyle = fcol('#5a4636'); ctx.fill();
          ctx.fillStyle = fcol('#7a6450'); for (var m = 0; m < 4; m++) { circle(ctx, -18 + m * 12, 21 + (m % 2) * 1.5, 3.5 + Math.sin(t * 6 + m) * 1); ctx.fill(); }
          ctx.fillStyle = 'rgba(194,100,255,0.6)'; circle(ctx, Math.sin(t * 3) * 10, 20, 1.6); ctx.fill();
          return;
        }
        var dy = s === 'burrow' ? sp * 56 : (s === 'erupt' ? (1 - eOut(sp)) * 56 : 0), stk = s === 'stuck';
        ctx.save();
        ctx.beginPath(); ctx.rect(-60, -80, 120, 108); ctx.clip(); // 地面以下不畫
        ctx.translate(0, dy);
        if (stk) { ctx.translate(f * 2, 6); ctx.rotate(f * 0.2); ctx.scale(0.9, 0.9); }
        var lg3 = s === 'walk' ? Math.sin(t * 10) * 2 : 0;
        ctx.strokeStyle = fcol('#141626'); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        [-16, -4, 10].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, 12); ctx.lineTo(lx - f * 5 + (i % 2 ? lg3 : -lg3), 26); ctx.stroke(); });
        ctx.beginPath(); ctx.ellipse(-f * 4, 12, 26, 26, 0, Math.PI, TAU); ctx.closePath();
        ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -14, 0, 12, [0, '#6a73b0', 1, '#1e2240']); ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(20,10,30,0.5)'; ctx.stroke();
        ctx.strokeStyle = 'rgba(190,200,255,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-f * 4, -13); ctx.lineTo(-f * 4, 11); ctx.stroke();
        veins(ctx, [-f * 22, 4, -f * 15, -6, -f * 8, 2, f * 0, -8, f * 8, 2], 2.6);
        if (stk) weakGlow(ctx, -f * 4, -2, 10, 6, t);
        blob(ctx, f * 18, 6, 9, 8, '#3a3e58', '#16182a');
        // 鑽頭角
        ctx.save(); ctx.translate(f * 21, 4); ctx.scale(f, 1);
        poly(ctx, [0, -6, 10.5, 0, 0, 6]); ctx.fillStyle = FL ? '#ffffff' : lin(ctx, 0, -6, 0, 6, [0, '#e8eef6', 1, '#7a8494']); ctx.fill();
        ctx.strokeStyle = '#3a3f4c'; ctx.lineWidth = 1.2; var ph = (t * 6) % 1;
        for (var d = 0; d < 3; d++) { var dx = (d + ph) * 3; ctx.beginPath(); ctx.moveTo(dx, -6 + dx * 6 / 10.5); ctx.lineTo(dx + 2, 6 - (dx + 2) * 6 / 10.5); ctx.stroke(); }
        ctx.restore();
        if (stk) spiralEye(ctx, f * 17, 3, 3.2); else eyeB(ctx, f * 17, 3, 3.2, s !== 'walk', true);
        ctx.restore();
        if (s === 'erupt' || s === 'burrow') { ctx.fillStyle = fcol('#6a5442'); for (var n2 = 0; n2 < 5; n2++) { var a2 = -Math.PI * (0.15 + n2 * 0.17), dd = 8 + 12 * sp; circle(ctx, Math.cos(a2) * dd * 1.2, 24 + Math.sin(a2) * dd, 3); ctx.fill(); } }
      }
      if (s === 'stun' || s === 'pant' || s === 'stuck') stunStars(ctx, -28, t, 4);
    }, { canFling: false });
  }

  // ---------- 守門巨像(final-boss 方案 B) ----------
  var FLB = false;
  function sandBlock(ctx, x, y, w, h, c, light, dark) {
    if (FLB) { light = '#ffffff'; dark = '#e2e6ee'; }
    var l = x - w / 2, r = x + w / 2, tp = y - h / 2, bt = y + h / 2;
    poly(ctx, [l + c, tp, r - c, tp, r, tp + c, r, bt - c, r - c, bt, l + c, bt, l, bt - c, l, tp + c]);
    ctx.fillStyle = lin(ctx, x, tp, x, bt, [0, light || '#e2c99c', 1, dark || '#8a6a46']); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(70,40,16,0.13)'; for (var yy = tp + 10; yy < bt; yy += 15) ctx.fillRect(l, yy, w, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(l, tp, w, 4);
    ctx.restore();
  }
  function rune(ctx, x, y, r, col) {
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 8; circle(ctx, x, y, r); ctx.fillStyle = col; ctx.fill(); ctx.restore();
    circle(ctx, x, y, r * 0.45); ctx.fillStyle = '#ffe0d0'; ctx.fill();
  }
  function glowLine(ctx, pts, col, lw) {
    ctx.save(); ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.restore();
  }
  function bossEye(ctx, x, y, r, angry) {
    if (angry) { circle(ctx, x, y, r + 4); ctx.fillStyle = 'rgba(255,50,50,0.5)'; ctx.fill(); }
    circle(ctx, x, y, r); ctx.fillStyle = FLB ? '#ffffff' : '#fbf6ee'; ctx.fill();
    ctx.fillStyle = PAL.foeEye; if (angry) ell(ctx, x, y, r * 0.32, r * 0.8); else circle(ctx, x, y, r * 0.5); ctx.fill();
  }
  function headUpper(ctx, o, t) { // 頭(原點 = 頭中心, 單位已 ×1.18)
    var cr = [[-50, -28, -62, 22], [-14, 14, -62, 30], [28, 50, -62, 22]];
    for (var i = 0; i < 3; i++) {
      var a = cr[i], mid = (a[0] + a[1]) / 2;
      poly(ctx, [a[0], a[2], mid - 4, a[2] - a[3], mid + 4, a[2] - a[3], a[1], a[2]]);
      ctx.fillStyle = FLB ? '#ffffff' : lin(ctx, 0, a[2] - a[3], 0, a[2], [0, '#f0dcb4', 1, '#a8845a']); ctx.fill();
    }
    sandBlock(ctx, 0, 0, 170, 130, 24);
    var runeCol = o.roar > 0 && Math.floor(t * 12) % 2 === 0 ? '#ff2a1a' : '#ff4a3a';
    if (!FLB) { glowLine(ctx, [-62, 8, -76, 8, -76, 40], runeCol, 3); glowLine(ctx, [62, 8, 76, 8, 76, 40], runeCol, 3); }
    if (o.phase >= 2) {
      ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-70, -30); ctx.lineTo(-52, -18); ctx.lineTo(-60, 6); ctx.moveTo(58, -50); ctx.lineTo(46, -30); ctx.lineTo(56, -16); ctx.stroke();
      if (o.weak === 'seam') { glowLine(ctx, [-44, -40, -20, -46, 0, -38, 22, -46, 44, -40], PAL.weak, 6); weakGlow(ctx, 0, -40, 12, 7, t); }
      else if (!FLB) glowLine(ctx, [-44, -40, -20, -46, 0, -38, 22, -46, 44, -40], '#ff5a3a', 4);
    }
    ell(ctx, 0, -2, 36, 30); ctx.fillStyle = FLB ? '#e8e8f0' : '#2a1a12'; ctx.fill();
  }
  function bossFist(ctx, fo, side, weak, t) {
    fo = obj(fo); if (fo.show === false) return;
    var x = num(fo.x, 640 + side * 220), y = num(fo.y, 300), rot = clamp(num(fo.rot, 0), -7, 7), stuck = fo.stuck === true;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1.3, 1.4);
    sandBlock(ctx, 0, 0, 84, 68, 14);
    ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.lineWidth = 2.5;
    for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 21, 12); ctx.lineTo(i * 21, 33); ctx.stroke(); }
    if (stuck && !FLB) { ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(-8, -12); ctx.lineTo(-14, 4); ctx.moveTo(18, -28); ctx.lineTo(10, -6); ctx.stroke(); }
    var rx = -side * 30;
    if (weak) { weakGlow(ctx, rx, 0, 11, 15, t); ctx.fillStyle = 'rgba(255,240,150,0.9)'; star4(ctx, rx - 14, -16, 5); ctx.fill(); star4(ctx, rx + 13, -8, 4); ctx.fill(); }
    else if (!FLB) rune(ctx, rx, 0, 7, '#ff4a3a');
    ctx.restore();
    if (stuck) { ctx.save(); ctx.fillStyle = '#c7a7b9'; for (var j = 0; j < 6; j++) { var px = x - 50 + j * 20 + Math.sin(t * 9 + j) * 2, py = y + 46 - fr(t * 2 + j * 0.3) * 14; poly(ctx, [px - 4, py, px, py - 4, px + 4, py, px, py + 3]); ctx.fill(); } ctx.restore(); }
  }
  function drawColossus(ctx, st) {
    st = obj(st);
    var hx = num(st.hx, 640), hy = num(st.hy, 230), phase = clamp(Math.round(num(st.phase, 1)), 1, 3);
    var eye = clamp(num(st.eye, 0), 0, 1), lid = clamp(num(st.lid, 0), 0, 1), split = clamp(num(st.split, 0), 0, 1.6);
    var weak = oneOf(st.weak, ['fist', 'seam', 'core'], null), angry = st.angry === true, plFall = clamp(num(st.plFall, 0), 0, 1);
    var roar = clamp(num(st.roar, 0), 0, 1), steam = clamp(num(st.steam, 0), 0, 1), t = num(st.t, 0);
    var ko = st.ko === true, kDur = Math.max(0.01, num(st.koDur, 1.5)), kT = clamp(num(st.koT, kDur), 0, kDur), kq = ko ? kT / kDur : 0;
    var lf = obj(st.lf), rf = obj(st.rf), blocks = Array.isArray(st.blocks) ? st.blocks.slice(0, 4) : null;
    var o = { phase: phase, weak: weak, roar: roar }, i;
    var sc = scaleOf(ctx);
    ctx.save();
    if (sc.rel < SIL) { // 縮圖剪影: 砂岩頭 + 紅眼 + 雙拳 / 浮石
      ctx.globalAlpha *= 1 - kq;
      ctx.fillStyle = '#d2b484';
      if (phase < 3) { ctx.fillRect(hx - 100, hy - 80, 200, 160); poly(ctx, [hx - 60, hy - 80, hx - 40, hy - 130, hx - 20, hy - 80, hx + 20, hy - 80, hx + 40, hy - 130, hx + 60, hy - 80]); ctx.fill(); }
      else { ctx.fillRect(hx - 100, hy - 80 - 44 * split, 200, 70); ctx.fillRect(hx - 100, hy + 10 + 36 * split, 200, 70); }
      circle(ctx, hx, hy, phase < 3 ? 30 : 45); ctx.fillStyle = weak ? PAL.weak : '#ff4a3a'; ctx.fill();
      ctx.fillStyle = '#c9a674';
      [[lf, -1], [rf, 1]].forEach(function (p) { if (p[0].show !== false && phase < 3) ctx.fillRect(num(p[0].x, 640 + p[1] * 220) - 55, num(p[0].y, 300) - 50, 110, 100); });
      if (blocks) for (i = 0; i < blocks.length; i++) { var bb = obj(blocks[i]); if (bb.show !== false) ctx.fillRect(num(bb.x, 640) - 35, num(bb.y, 200) - 30, 70, 60); }
      ctx.restore(); return;
    }
    if (roar > 0 && roar < 1) ctx.translate(Math.sin(t * 70) * 4 * (1 - roar), Math.cos(t * 55) * 2 * (1 - roar));
    if (ko) ctx.globalAlpha *= 1 - kq;
    FLB = st.hit === true;
    // 肩甲: 第 1 階段掛在頭兩側; 1→2 時噴飛落到兩側, 落地後碎掉不留(不冒充地形)
    if (phase === 1 || plFall < 1) {
      for (i = 0; i < 2; i++) {
        var sd = i ? 1 : -1, sx = hx + sd * 136, sy = hy - 20, tx = 640 + sd * 470, ty = 560;
        var px = lerp(sx, tx, plFall), py = lerp(sy, ty, plFall * plFall) - Math.sin(plFall * Math.PI) * 140;
        ctx.save(); if (plFall > 0.85) ctx.globalAlpha *= (1 - plFall) / 0.15;
        ctx.translate(px, py); ctx.rotate(sd * (0.12 + plFall * 1.4)); ctx.scale(1.18, 1.18);
        sandBlock(ctx, 0, 0, 60, 84, 14, '#d8bc8e', '#7a5c3a');
        if (plFall === 0 && !FLB) rune(ctx, 0, -8, 6, '#ff4a3a');
        ctx.restore();
      }
    }
    var kOff = function (k) { return ko ? { dx: (hash(k, 2) - 0.5) * 160 * kq, dy: 260 * kq * kq + (hash(k, 3) - 0.3) * 40 * kq, r: (hash(k, 4) - 0.5) * 2 * kq } : { dx: 0, dy: 0, r: 0 }; };
    if (phase < 3) {
      var kh = kOff(1);
      ctx.save(); ctx.translate(hx + kh.dx, hy + kh.dy); ctx.rotate(kh.r); ctx.scale(1.18, 1.18);
      headUpper(ctx, o, t);
      if (lid > 0 || weak === 'seam') {
        bossEye(ctx, 0, 4, 20, false);
        ctx.save(); ell(ctx, 0, -2, 36, 30); ctx.clip(); ctx.fillStyle = FLB ? '#ffffff' : '#9a7a52'; ctx.fillRect(-40, -34, 80, 60 * Math.max(lid, weak === 'seam' ? 0.55 : 0)); ctx.restore();
      } else {
        if (eye > 0 && !FLB) { circle(ctx, 0, -2, 24 + eye * 14); ctx.fillStyle = 'rgba(255,70,50,' + (0.25 + 0.35 * eye).toFixed(3) + ')'; ctx.fill(); }
        bossEye(ctx, 0, -2, 22, angry || eye > 0);
      }
      rr(ctx, -40, 34, 80, 18, 4); ctx.fillStyle = FLB ? '#e8e8f0' : '#2a1a12'; ctx.fill();
      ctx.fillStyle = FLB ? '#ffffff' : '#c8aa7c'; for (i = 0; i < 5; i++) ctx.fillRect(-34 + i * 16, 36, 6, 14);
      ctx.restore();
    } else {
      var k1 = kOff(1), k2 = kOff(2), k3 = kOff(3);
      ctx.save(); ctx.translate(hx + k1.dx, hy - 44 * split + k1.dy); ctx.rotate(k1.r); ctx.scale(1.18, 1.18);
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -130, 260, 118); ctx.clip(); headUpper(ctx, o, t); ctx.restore();
      ctx.restore();
      ctx.save(); ctx.translate(hx + k2.dx, hy + 36 * split + k2.dy); ctx.rotate(k2.r); ctx.scale(1.18, 1.18);
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -12, 260, 100); ctx.clip(); sandBlock(ctx, 0, 0, 170, 130, 24); rr(ctx, -40, 34, 80, 18, 4); ctx.fillStyle = FLB ? '#e8e8f0' : '#2a1a12'; ctx.fill(); ctx.restore();
      ctx.restore();
      ctx.save(); ctx.translate(hx + k3.dx, hy + k3.dy);
      var cw = weak === 'core';
      ctx.save(); ctx.shadowColor = cw ? PAL.weak : '#ff5a2a'; ctx.shadowBlur = 22;
      circle(ctx, 0, 0, 40); ctx.fillStyle = rad(ctx, -10, -10, 4, 40, [0, FLB ? '#ffffff' : (cw ? '#fffbe0' : '#ffc890'), 1, FLB ? '#e2e6ee' : (cw ? '#e8b020' : '#d8401a')]); ctx.fill(); ctx.restore();
      if (cw) { spiralEye(ctx, 0, 0, 20); ctx.fillStyle = 'rgba(255,240,150,0.95)'; star4(ctx, -30, -30, 6); ctx.fill(); star4(ctx, 30, -24, 5); ctx.fill(); }
      else bossEye(ctx, 0, 0, 21, true);
      ctx.strokeStyle = FLB ? '#ffffff' : '#7a4a2a'; ctx.lineWidth = 3.5;
      for (i = 0; i < 8; i++) { var a = i * TAU / 8 + (cw ? 0 : t * TAU / 4); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 41, Math.sin(a) * 41); ctx.lineTo(Math.cos(a) * 45, Math.sin(a) * 45); ctx.stroke(); }
      ctx.restore();
    }
    if (phase < 3) {
      var kl = kOff(5), kr = kOff(6);
      ctx.save(); ctx.translate(kl.dx, kl.dy); bossFist(ctx, lf, -1, weak === 'fist' && lf.stuck === true, t); ctx.restore();
      ctx.save(); ctx.translate(kr.dx, kr.dy); bossFist(ctx, rf, 1, weak === 'fist' && rf.stuck === true, t); ctx.restore();
    }
    if (blocks) for (i = 0; i < blocks.length; i++) {
      var b = obj(blocks[i]); if (b.show === false) continue;
      var bx = num(b.x, 640), by = num(b.y, 200), kb = kOff(10 + i);
      ctx.save(); ctx.translate(bx + kb.dx, by + kb.dy);
      if (b.falling === true) { ctx.strokeStyle = 'rgba(255,240,220,0.8)'; ctx.lineWidth = 2; for (var j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(-20 + j * 20, -34); ctx.lineTo(-20 + j * 20, -34 - 22 - j * 6); ctx.stroke(); } }
      ctx.scale(1.4, 1.2); sandBlock(ctx, 0, 0, 50, 50, 9); if (!FLB) rune(ctx, 0, 0, 5, '#ff4a3a');
      ctx.restore();
    }
    FLB = false;
    // 聚光: 光線往眼睛收; 過熱蒸氣
    if (eye > 0 && eye < 1 && !ko) {
      ctx.strokeStyle = 'rgba(255,120,90,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (i = 0; i < 10; i++) { var aa = i * TAU / 10, u = fr(t * 2 + i * 0.1), r0 = 150 - u * 100; ctx.beginPath(); ctx.moveTo(hx + Math.cos(aa) * r0, hy + Math.sin(aa) * r0); ctx.lineTo(hx + Math.cos(aa) * (r0 - 24), hy + Math.sin(aa) * (r0 - 24)); ctx.stroke(); }
    }
    if (steam > 0 && !ko) for (i = 0; i < 4; i++) { var u2 = fr(t * 2 + i / 4), sx2 = hx + (i % 2 ? 54 : -54); circle(ctx, sx2 + (i > 1 ? 12 : -12) * u2, hy - 80 - u2 * 80, 9 + u2 * 18); ctx.fillStyle = 'rgba(240,240,248,' + (0.7 * steam * (1 - u2)).toFixed(3) + ')'; ctx.fill(); }
    ctx.restore();
  }

  function drawBossBeam(ctx, st) {
    st = obj(st);
    var x1 = num(st.x1, 640), y1 = num(st.y1, 230), x2 = num(st.x2, 640), y2 = num(st.y2, 600), w = clamp(num(st.w, 48), 2, 200), t = num(st.t, 0);
    var len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1), i;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,60,40,0.28)'; ctx.lineWidth = w + 24; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,90,60,0.85)'; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,150,0.95)'; ctx.lineWidth = w * 0.45; ctx.stroke();
    ctx.strokeStyle = '#fff4ec'; ctx.lineWidth = w * 0.16; ctx.stroke();
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang); // 流動的亮段
    ctx.fillStyle = 'rgba(255,255,240,0.55)';
    for (i = 0; i < 6; i++) { var d = fr(i / 6 + t * 2) * len; ctx.fillRect(d, -w * 0.3, 14, w * 0.6); }
    ctx.restore();
    ell(ctx, x2, y2 + 2, w * 0.9, 6); ctx.fillStyle = 'rgba(190,240,255,0.55)'; ctx.fill(); // 鹽痕
    circle(ctx, x2, y2 - 2, w * 0.5); ctx.fillStyle = 'rgba(255,170,90,0.7)'; ctx.fill();
    ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (i = 0; i < 6; i++) { var sa = -Math.PI * (0.1 + 0.8 * hash(i, Math.floor(t * 20))), sl = 16 + hash(i, 7) * 14; ctx.beginPath(); ctx.moveTo(x2, y2 - 2); ctx.lineTo(x2 + Math.cos(sa) * sl, y2 - 2 + Math.sin(sa) * sl); ctx.stroke(); }
    ctx.restore();
  }

  function drawBossHpBar(ctx, st) {
    st = obj(st);
    var x = num(st.x, 640), y = num(st.y, 110), maxHp = clamp(Math.round(num(st.maxHp, 45)), 1, 999), hp = clamp(num(st.hp, maxHp), 0, maxHp);
    var cDur = Math.max(0.01, num(st.chipDur, 0.4)), cT = clamp(num(st.chipT, cDur), 0, cDur), chip = clamp(num(st.chip, hp), 0, maxHp), weak = st.weak === true;
    var Wd = 360, hh = 12, x0 = x - Wd / 2, y0 = y - hh / 2, i;
    ctx.save();
    rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.fillStyle = 'rgba(10,6,14,0.86)'; ctx.fill();
    ctx.save(); rr(ctx, x0, y0, Wd, hh, hh / 2); ctx.clip();
    var lost = (chip - hp) * (1 - cT / cDur);
    if (lost > 0.01) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + Wd * hp / maxHp, y0, Wd * lost / maxHp, hh); }
    if (hp > 0) { ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + hh, weak ? [0, '#fff09a', 1, '#e8b020'] : [0, '#ff8a8a', 1, '#e02a3c']); ctx.fillRect(x0, y0, Wd * hp / maxHp, hh); }
    if (maxHp <= 120) { ctx.fillStyle = 'rgba(10,6,14,0.35)'; for (i = 1; i < maxHp; i++) ctx.fillRect(x0 + Wd * i / maxHp - 0.5, y0, 1, hh); }
    var marks = arr(st.marks).slice(0, 8);
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < marks.length; i++) { var m = num(marks[i], -1); if (m > 0 && m < maxHp) ctx.fillRect(x0 + Wd * m / maxHp - 1.5, y0, 3, hh); }
    ctx.restore();
    rr(ctx, x0 + 0.75, y0 + 0.75, Wd - 1.5, hh - 1.5, hh / 2); ctx.lineWidth = 1.5; ctx.strokeStyle = weak ? PAL.weak : 'rgba(255,255,255,0.35)'; ctx.stroke();
    ctx.restore();
  }

  // ================= 飛行物與特效 =================
  function drawBeeShot(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    if (scaleOf(ctx).rel >= SIL) { ctx.fillStyle = '#5a1206'; for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + nowS() * 6; poly(ctx, [x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a + 0.5) * 3.5, y + Math.sin(a + 0.5) * 3.5, x + Math.cos(a - 0.5) * 3.5, y + Math.sin(a - 0.5) * 3.5]); ctx.fill(); } }
    circle(ctx, x, y, 4.4); ctx.fillStyle = PAL.beeShot; ctx.fill();
    circle(ctx, x - 1, y - 1, 1.6); ctx.fillStyle = '#ffd0a0'; ctx.fill();
    ctx.restore();
  }
  function drawArrow(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), a = num(st.angle, 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 2; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(7, 0); ctx.stroke();
    poly(ctx, [6, -3, 12, 0, 6, 3]); ctx.fillStyle = '#dfe6ee'; ctx.fill();
    ctx.fillStyle = PAL.hunter; poly(ctx, [-12, -3, -7, 0, -12, 3, -10, 0]); ctx.fill();
    ctx.restore();
  }
  function drawBomb(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6);
    circle(ctx, 0, 1.5, 6); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    circle(ctx, -2, -0.5, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2.5, -3); ctx.lineTo(4, -5); ctx.stroke();
    var fl = 1 + Math.abs(Math.sin(t * 30)) * 1.2;
    star4(ctx, 4.8, -5.6, fl + 1); ctx.fillStyle = PAL.goal; ctx.fill();
    ctx.restore();
  }
  function drawExplosion(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.4)), p = clamp(num(st.t, 0) / dur, 0, 1), R = clamp(num(st.radius, 60), 1, 400), kind = oneOf(st.kind, ['bomb', 'beetle'], 'bomb');
    ctx.save();
    var r = R * (0.45 + 0.55 * p);
    ctx.globalAlpha *= 1 - p * 0.85;
    circle(ctx, x, y, r); ctx.fillStyle = kind === 'beetle' ? 'rgba(255,120,60,0.85)' : 'rgba(255,154,42,0.85)'; ctx.fill();
    circle(ctx, x, y, r * 0.62); ctx.fillStyle = 'rgba(255,230,120,0.95)'; ctx.fill();
    circle(ctx, x, y, r - 1.5); ctx.lineWidth = 3; ctx.strokeStyle = '#ff5a1a'; ctx.stroke();
    if (kind === 'beetle') { // 青紫色甲殼碎片
      for (var i = 0; i < 8; i++) { var a = i * TAU / 8 + 0.3, d = R * (0.3 + 0.62 * eOut(p)); ctx.save(); ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.rotate(a + p * 6); poly(ctx, [-5, -3, 5, -4, 3, 4, -4, 3]); ctx.fillStyle = '#4a52a0'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#c8ceff'; ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
  }
  // 震波(玩家): 白色前緣細線 + 往外的小箭頭 + 極淡暖色面; 和火球、和敵方紅圈都分開
  function drawShockwave(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.4)), p = clamp(num(st.t, 0) / dur, 0, 1), R = clamp(num(st.radius, 130), 1, 600);
    var outer = Math.max(2, R * eOut(p)), lw = Math.min(outer, 10 * (1 - p) + 3);
    ctx.save();
    ctx.globalAlpha *= 1 - p * 0.7;
    circle(ctx, x, y, outer); ctx.fillStyle = 'rgba(255,236,200,0.10)'; ctx.fill();
    circle(ctx, x, y, outer - lw / 2); ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,250,240,0.9)'; ctx.stroke();
    circle(ctx, x, y, Math.max(0, outer - lw - 3)); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(242,140,40,0.65)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (var i = 0; i < 8; i++) { var a = i * TAU / 8, rr2 = Math.max(0, outer - lw - 8); ctx.save(); ctx.translate(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); ctx.rotate(a); poly(ctx, [4, 0, -2, -3.5, -2, 3.5]); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function drawPoof(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.5)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var size = oneOf(st.size, ['small', 'big', 'huge'], 'small'), k = size === 'huge' ? 5.6 : (size === 'big' ? 1.85 : 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.globalAlpha *= 1 - p;
    var pts = [[0, 0, 9], [-9, -4, 7], [9, -3, 7], [-5, 8, 6], [6, 8, 6], [0, -10, 6]];
    for (var i = 0; i < pts.length; i++) { var q = pts[i], sp = 1 + p * 0.75; circle(ctx, q[0] * sp, q[1] * sp, q[2] * (0.8 + p * 0.4)); ctx.fillStyle = i % 2 ? '#d8dce4' : '#b8bec9'; ctx.fill(); }
    if (size !== 'small') { ctx.fillStyle = size === 'huge' ? '#c9a674' : '#8a6a9a'; for (i = 0; i < 6; i++) { var a = i * TAU / 6 + 0.4, d = 6 + 14 * eOut(p); poly(ctx, [Math.cos(a) * d - 2, Math.sin(a) * d, Math.cos(a) * d, Math.sin(a) * d - 2.5, Math.cos(a) * d + 2, Math.sin(a) * d + 1]); ctx.fill(); } }
    ctx.restore();
  }
  function drawPopup(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.8)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var kind = oneOf(st.kind, KINDS, 'wood'), v = Math.round(clamp(num(st.value, 1), 0, 999));
    ctx.save();
    ctx.translate(x, y - 30 * p);
    ctx.globalAlpha *= p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    matIcon(ctx, kind, -17, 0, 16);
    text(ctx, '+' + v, -7, 0.5, 17, PAL[kind + 'Light'], 'left', true, 3.5, 'rgba(8,10,18,0.92)');
    ctx.restore();
  }
  function drawChainText(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), dur = Math.max(0.01, num(st.dur, 0.8)), p = clamp(num(st.t, 0) / dur, 0, 1);
    var n = Math.round(clamp(num(st.n, 2), 0, 99));
    var pop = p < 0.12 ? 1 + 0.3 * (p / 0.12) : (p < 0.25 ? 1.3 - 0.3 * ((p - 0.12) / 0.13) : 1);
    ctx.save(); ctx.translate(x, y - 30 * p); ctx.scale(pop, pop);
    ctx.globalAlpha *= p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
    text(ctx, n + ' 連鎖', 0, 0, 24, K.select, 'center', true, 4, 'rgba(8,10,18,0.92)');
    ctx.restore();
  }

  // ================= 道具圖示(背包、道具格、商店、獲得提示、結算共用) =================
  function sack(ctx, col, kind) {
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.quadraticCurveTo(-13, -2, -12, 7); ctx.quadraticCurveTo(-11, 13, 0, 13); ctx.quadraticCurveTo(11, 13, 12, 7); ctx.quadraticCurveTo(13, -2, 6, -9); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-8, -13); ctx.lineTo(8, -13); ctx.lineTo(6, -9); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.stroke();
    matIcon(ctx, kind, 0, 3, 15);
  }
  function itemIcon(ctx, type, x, y, size) {
    type = oneOf(type, ITEMS, 'bagWood'); size = clamp(num(size, 32), 8, 128);
    var k = size / 32;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = '#140e08';
    if (type === 'bagWood') sack(ctx, '#d9b07a', 'wood');
    else if (type === 'bagStone') sack(ctx, '#c4c9cf', 'stone');
    else if (type === 'bagCrystal') sack(ctx, '#a8e6ee', 'crystal');
    else if (type === 'coreLamp') {
      ctx.beginPath(); ctx.arc(0, -11, 3.5, Math.PI, 0); ctx.stroke();
      rr(ctx, -8, -9, 16, 3, 1); ctx.fillStyle = '#b08a3a'; ctx.fill(); ctx.stroke();
      rr(ctx, -7, -6, 14, 15, 3); ctx.fillStyle = 'rgba(255,220,250,0.35)'; ctx.fill(); ctx.stroke();
      matIcon(ctx, 'core', 0, 1.5, 12);
      rr(ctx, -9, 9, 18, 4, 1.5); ctx.fillStyle = '#b08a3a'; ctx.fill(); ctx.strokeStyle = '#140e08'; ctx.lineWidth = 1.8; ctx.stroke();
    } else if (type === 'glove') {
      ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(-9, -1); ctx.quadraticCurveTo(-9, -5, -6, -5); ctx.lineTo(-6, -11); ctx.quadraticCurveTo(-6, -13, -4, -13); ctx.quadraticCurveTo(-2, -13, -2, -11);
      ctx.lineTo(-2, -12); ctx.quadraticCurveTo(0, -14, 2, -12); ctx.lineTo(2, -11); ctx.quadraticCurveTo(4, -13, 6, -11); ctx.lineTo(6, -3); ctx.lineTo(9, -6); ctx.quadraticCurveTo(12, -6, 11, -2); ctx.lineTo(7, 6); ctx.lineTo(7, 12); ctx.closePath();
      ctx.fillStyle = '#e8a050'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9a5a20'; ctx.fillRect(-8, 8, 15, 4);
      star4(ctx, 10, -11, 4); ctx.fillStyle = '#fff6c0'; ctx.fill();
      matIcon(ctx, 'stone', -9, 10, 9);
    } else if (type === 'horn') {
      ctx.beginPath(); ctx.moveTo(-12, 6); ctx.quadraticCurveTo(-4, -2, 8, -11); ctx.lineTo(12, -5); ctx.quadraticCurveTo(0, 4, -10, 11); ctx.closePath();
      ctx.fillStyle = '#efe2c4'; ctx.fill(); ctx.stroke();
      ell(ctx, 10, -8, 3, 4.5, 0.6); ctx.fillStyle = '#5a4630'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d23b3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-1, -3); ctx.lineTo(3, 3); ctx.stroke();
      ctx.strokeStyle = K.select; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-10, -2); ctx.moveTo(-9, -11); ctx.lineTo(-7, -6); ctx.stroke();
    } else if (type === 'heart') {
      ctx.save(); ctx.shadowColor = PAL.brood; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-15, 2, -13, -12, -5, -11); ctx.quadraticCurveTo(-1, -10, 0, -6); ctx.quadraticCurveTo(1, -10, 5, -11); ctx.bezierCurveTo(13, -12, 15, 2, 0, 12); ctx.closePath();
      ctx.fillStyle = '#8a2ec8'; ctx.fill(); ctx.restore();
      ctx.lineWidth = 2.2; ctx.strokeStyle = PAL.gold; ctx.stroke();
      ctx.strokeStyle = '#f0c8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-2, 2); ctx.lineTo(1, -1); ctx.lineTo(5, 3); ctx.stroke();
      star4(ctx, -11, -11, 3.5); ctx.fillStyle = '#fff'; ctx.fill();
    } else { // gear 加速齒輪: 銅齒輪 + 快轉箭頭
      ctx.beginPath();
      for (var i = 0; i < 16; i++) { var a = i * TAU / 16, r = (i % 2) ? 10 : 13; ctx.lineTo(Math.cos(a - 0.1) * r, Math.sin(a - 0.1) * r); ctx.lineTo(Math.cos(a + 0.1) * r, Math.sin(a + 0.1) * r); }
      ctx.closePath(); ctx.fillStyle = '#c98a3a'; ctx.fill(); ctx.stroke();
      circle(ctx, 0, 0, 7); ctx.fillStyle = '#3a2a18'; ctx.fill();
      ctx.fillStyle = '#ffffff'; poly(ctx, [-5, -4, 0, 0, -5, 4]); ctx.fill(); poly(ctx, [0, -4, 5, 0, 0, 4]); ctx.fill();
    }
    ctx.restore();
  }
  function drawItemIcon(ctx, st) { st = obj(st); ctx.save(); itemIcon(ctx, st.type, num(st.x, 0), num(st.y, 0), num(st.size, 32)); ctx.restore(); }

  function drawItemNotice(ctx, st) {
    st = obj(st);
    var type = oneOf(st.type, ITEMS, 'bagWood'), dur = Math.max(0.01, num(st.dur, 1.5)), t = clamp(num(st.t, 0), 0, dur);
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? (dur - t) / 0.3 : 1);
    ctx.save();
    ctx.globalAlpha *= clamp(a, 0, 1);
    rr(ctx, 441, 101, 398, 42, 8); ctx.fillStyle = K.parch; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = type === 'heart' ? PAL.brood : K.select; ctx.stroke();
    var s = '獲得 ' + ITEM_NAME[type], w = tw(ctx, s, 20, true), x0 = 640 - (32 + 10 + w) / 2;
    itemIcon(ctx, type, x0 + 16, 122, 30);
    text(ctx, s, x0 + 42, 122.5, 20, K.ink, 'left', true);
    ctx.restore();
  }

  // ================= 資訊列 / 聲音開關 =================
  function heartShape(ctx, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, 0, -7, -7, -3, -6); ctx.quadraticCurveTo(-1, -6, 0, -3); ctx.quadraticCurveTo(1, -6, 3, -6); ctx.bezierCurveTo(7, -7, 9, 0, 0, 6); ctx.closePath();
    ctx.restore();
  }
  function drawHud(ctx, st) {
    st = obj(st);
    var mode = st.mode === 'level' ? 'level' : 'map', stock = mats(st.stock), rate = mats(st.ratePerMin), bump = obj(st.bumpT);
    var bDur = Math.max(0.01, num(st.bumpDur, 0.2)), i;
    ctx.save();
    ctx.fillStyle = K.board; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = K.plankUi; ctx.fillRect(0, 0, W, 19);
    ctx.fillStyle = K.seam; ctx.fillRect(0, 19, W, 1.5);
    ctx.fillStyle = K.edge; ctx.fillRect(0, 37, W, 3);
    for (i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = HUD_X[k], bt = clamp(num(bump[k], bDur), 0, bDur), bq = bt / bDur, on = bq < 1, s = on ? Math.sin(Math.PI * bq) : 0;
      ctx.save(); ctx.translate(x0 + 81, 20); ctx.scale(1, 1 - 0.15 * s); ctx.translate(-x0 - 81, -20);
      rr(ctx, x0, 4, 162, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = on ? 2.5 : 1.5; ctx.strokeStyle = on ? K.select : K.edge; ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(x0 + 20, 20); ctx.scale(1 + 0.25 * s, 1 - 0.2 * s); matIcon(ctx, k, 0, 0, 22); ctx.restore();
      ctx.save(); ctx.translate(x0 + 36, 21); ctx.scale(1 + 0.3 * s, 1 + 0.3 * s); text(ctx, intStr(stock[k]), 0, 0, 19, K.ink, 'left', true); ctx.restore();
      text(ctx, '+' + fmt1(clamp(rate[k], 0, 1e6)) + '/分', x0 + 157, 21, 11, KIND_INK[k], 'right', true);
      if (on) { // 投幣火花(至多 12px, 可超出資訊列下緣)
        ctx.save(); ctx.globalAlpha *= 1 - bq; ctx.strokeStyle = PAL[k + 'Light']; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (var j = 0; j < 5; j++) { var a = -Math.PI * (0.1 + j * 0.2), r1 = 11 + bq * 4, r2 = 14 + bq * 10; ctx.beginPath(); ctx.moveTo(x0 + 20 + Math.cos(a) * r1, 20 + Math.sin(a) * r1); ctx.lineTo(x0 + 20 + Math.cos(a) * r2, 20 + Math.sin(a) * r2); ctx.stroke(); }
        ctx.restore();
      }
    }
    if (mode === 'level') {
      var maxHp = clamp(Math.round(num(st.maxHp, 3)), 1, 9), hp = clamp(Math.round(num(st.hp, maxHp)), 0, maxHp);
      rr(ctx, 724, 4, 28 * maxHp + 20, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      for (i = 0; i < maxHp; i++) {
        heartShape(ctx, 748 + i * 28, 21, 1.3);
        if (i < hp) { ctx.fillStyle = PAL.hp; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7a1420'; ctx.stroke(); }
        else { ctx.lineWidth = 1.8; ctx.strokeStyle = '#8a7a60'; ctx.stroke(); }
      }
      var tx = 724 + 28 * maxHp + 30;
      rr(ctx, tx, 4, 118, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      circle(ctx, tx + 17, 20, 7); ctx.lineWidth = 2; ctx.strokeStyle = K.ink; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + 17, 20); ctx.lineTo(tx + 17, 15.5); ctx.moveTo(tx + 17, 20); ctx.lineTo(tx + 20.5, 20); ctx.stroke();
      text(ctx, fmt1(clamp(num(st.time, 0), 0, 99999)) + 's', tx + 30, 21, 18, K.ink, 'left', true);
    }
    ctx.restore();
  }
  function speaker(ctx, s, on, col) {
    ctx.save(); ctx.scale(s, s);
    poly(ctx, [-8, -3, -4, -3, 1, -8, 1, 8, -4, 3, -8, 3]); ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    if (on) { ctx.beginPath(); ctx.arc(2, 0, 4.5, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(2, 0, 8, -0.9, 0.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(10, 4); ctx.moveTo(10, -4); ctx.lineTo(4, 4); ctx.stroke(); }
    ctx.restore();
  }
  function drawSoundIcon(ctx, st) {
    st = obj(st);
    var x = num(st.x, 1250), y = num(st.y, 62), on = st.on !== false;
    ctx.save();
    rr(ctx, x - 18, y - 15, 36, 33, 6); ctx.fillStyle = on ? '#8f8471' : '#55504a'; ctx.fill();
    rr(ctx, x - 18, y - 18, 36, 33, 6); ctx.fillStyle = on ? '#ece4d2' : '#a9a59a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.save(); ctx.translate(x - 3, y - 3); speaker(ctx, 1, on, on ? K.ink : '#4a4538'); ctx.restore();
    text(ctx, 'M', x + 11, y + 8.5, 10, on ? K.inkDim : '#4a4538', 'center', true);
    ctx.restore();
  }

  // ================= 新手教學(羊皮紙橫幅 + 金色指示箭頭; 教學專用長相) =================
  function tutArrow(ctx, tip, t) {
    var x = num(tip.x, 640), y = num(tip.y, 360), dir = oneOf(tip.dir, ['down', 'up', 'left', 'right'], 'down');
    var o = 6 * (0.5 - 0.5 * Math.cos(t * TAU / 0.8));
    var ang = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 }[dir];
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.translate(-o, 0);
    poly(ctx, [0, 0, -16, -12, -16, -5, -36, -5, -36, 5, -16, 5, -16, 12]);
    ctx.fillStyle = K.select; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = K.edge; ctx.stroke();
    poly(ctx, [-3, 0, -14, -8, -14, -2]); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.restore();
  }
  function stamp(ctx, x, y, q) {
    var s = q < 0.3 ? 1.6 - 0.6 * (q / 0.3) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.2);
    circle(ctx, 0, 0, 15); ctx.fillStyle = K.good; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-2, 6); ctx.lineTo(8, -6); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }
  function burst(ctx, x, y, q, n, R) {
    ctx.save(); ctx.fillStyle = K.select;
    for (var i = 0; i < n; i++) { var a = i * TAU / n - Math.PI / 2, d = R * eOut(q); star4(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 5 * (1 - q * 0.6)); ctx.fill(); }
    ctx.restore();
  }
  function drawTutorial(ctx, st) {
    st = obj(st);
    var stage = str(st.stage, ''), s = str(st.text, ''), keys = arr(st.keys).slice(0, 3), pressed = arr(st.pressed), t = num(st.t, 0);
    var bx = num(st.bx, 340), by = num(st.by, 46), bw = clamp(num(st.bw, 600), 40, 1280), bh = clamp(num(st.bh, 48), 20, 120);
    var tip = (st.tip && typeof st.tip === 'object') ? st.tip : null;
    var dDur = Math.max(0.01, num(st.doneDur, 0.6)), dT = clamp(num(st.doneT, dDur), 0, dDur), done = dT < dDur, dq = dT / dDur;
    var a = done && dT > dDur - 0.2 ? (dDur - dT) / 0.2 : 1;
    ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1);
    if (stage === '6') { // 階段 6 用終點旗提示本身, 這裡只在完成時蓋打勾章(tip = 提示泡泡中心)
      if (done && tip) { stamp(ctx, num(tip.x, 640), num(tip.y, 360), dq); burst(ctx, num(tip.x, 640), num(tip.y, 360), dq, 6, 40); }
      ctx.restore(); return;
    }
    if (tip && !done) tutArrow(ctx, tip, t);
    rr(ctx, bx, by + 3, bw, bh, 8); ctx.fillStyle = 'rgba(10,6,4,0.45)'; ctx.fill();
    rr(ctx, bx, by, bw, bh, 8); ctx.fillStyle = done ? mix('#efe3c6', '#ffd84a', Math.min(1, dq * 3)) : K.parch; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = done ? K.selectDeep : K.edge; ctx.stroke();
    ctx.fillStyle = K.select; rr(ctx, bx + 6, by + 6, 6, bh - 12, 3); ctx.fill();
    var px = bh >= 46 ? 20 : 18, kp = Math.round(px * 0.85), gap = 6, i, labels = [];
    for (i = 0; i < keys.length; i++) labels.push(KEY_LABEL[keys[i]] || '?');
    var wText = s ? tw(ctx, s, px, true) : 0, wKeys = 0;
    for (i = 0; i < labels.length; i++) wKeys += keyW(ctx, labels[i], kp) + (i ? gap : 0);
    var total = wText + (labels.length && s ? 16 : 0) + wKeys, room = bw - 60, x0 = bx + 18 + Math.max(0, (room - total) / 2), cy = by + bh / 2;
    if (s) text(ctx, s, x0, cy + 1, px, K.ink, 'left', true);
    var kx = x0 + wText + (s ? 16 : 0);
    for (i = 0; i < labels.length; i++) { var kw = keyW(ctx, labels[i], kp); keycap(ctx, labels[i], kx + kw / 2, cy - 1, kp, pressed[i] === true, pressed[i] === true); kx += kw + gap; }
    if (done) { stamp(ctx, bx + bw - 26, cy, dq); burst(ctx, bx + bw - 26, cy, dq, 6, 40); }
    ctx.restore();
  }

  // ================= 大地圖 =================
  function drawMapLink(ctx, st) {
    st = obj(st);
    var x1 = num(st.x1, 0), y1 = num(st.y1, 0), x2 = num(st.x2, 0), y2 = num(st.y2, 0), lit = st.lit === true, mx = (x1 + x2) / 2;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (lit) { ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,216,74,0.22)'; ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = K.select; ctx.stroke(); }
    else { ctx.setLineDash([8, 7]); ctx.lineWidth = 3; ctx.strokeStyle = '#3f5058'; ctx.stroke(); }
    ctx.restore();
  }
  var CARD_TINT = { forest: '#2f3a24', cliff: '#2c3446', mine: '#3a2a1f', salt: '#3a2846' };
  function gateGlyph(ctx, cx, cy, k, col) { // 斷門剪影(第 8 關卡片)
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.fillStyle = col;
    poly(ctx, [-30, 30, -30, -18, -24, -26, -18, -16, -14, -24, -14, 30]); ctx.fill();
    poly(ctx, [14, 30, 14, -8, 20, -14, 24, -6, 30, -12, 30, 30]); ctx.fill();
    poly(ctx, [-30, -20, 4, -16, 0, -10, -14, -8]); ctx.fill();
    ctx.restore();
  }
  function drawLevelCard(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), idx = Math.round(clamp(num(st.index, 1), 0, 99)), name = str(st.name, ''), theme = oneOf(st.theme, ['forest', 'cliff', 'mine', 'salt'], 'forest');
    var state = oneOf(st.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed'), boss = idx === 8 || theme === 'salt';
    var rc = Math.round(clamp(num(st.repairedCount, 0), 0, 9)), scn = Math.round(clamp(num(st.siteCount, 0), 0, 9));
    ctx.save();
    board(ctx, x, y, 176, 136, state === 'sealed' ? '#241b14' : CARD_TINT[theme]);
    rr(ctx, x + 1.5, y + 1.5, 173, 133, 8);
    if (state === 'cleared') { ctx.lineWidth = 3; ctx.strokeStyle = K.goodLight; ctx.stroke(); }
    else if (state === 'buyable') { ctx.setLineDash([7, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = K.select; ctx.stroke(); ctx.setLineDash([]); }
    else if (state === 'open') { ctx.lineWidth = 2; ctx.strokeStyle = boss ? '#e8a8d8' : '#c9b896'; ctx.stroke(); }
    if (boss) { rr(ctx, x + 4.5, y + 4.5, 167, 127, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c47d9c'; ctx.stroke(); gateGlyph(ctx, x + 14, y + 120, 0.22, '#e3c4d2'); gateGlyph(ctx, x + 162, y + 120, 0.22, '#e3c4d2'); }
    ctx.fillStyle = K.edge; ctx.fillRect(x + 7, y + 7, 162, 92);
    if (state === 'open' || state === 'cleared') { ctx.fillStyle = '#10141c'; ctx.fillRect(x + 8, y + 8, 160, 90); }
    else if (boss && state === 'sealed') {
      ctx.fillStyle = lin(ctx, 0, y + 8, 0, y + 98, [0, '#2a1f4e', 1, '#7a5078']); ctx.fillRect(x + 8, y + 8, 160, 90);
      gateGlyph(ctx, x + 88, y + 52, 1.1, '#4e3a68');
      rr(ctx, x + 34, y + 72, 108, 22, 4); ctx.fillStyle = K.parchDim; ctx.fill();
      text(ctx, '還差 ' + Math.round(clamp(num(st.need, 1), 0, 99)) + ' 關', x + 88, y + 83.5, 13, K.ink, 'center', true);
    } else {
      ctx.fillStyle = '#1a1612'; ctx.fillRect(x + 8, y + 8, 160, 90);
      lockIcon(ctx, x + 88, y + 38, 30, state === 'sealed' ? '#6a5e4c' : K.select);
      rr(ctx, x + 16, y + 68, 144, 24, 4); ctx.fillStyle = state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
      costLine(ctx, st.cost, st.stock, x + 88, y + 80, 13, 'center');
    }
    rr(ctx, x + 6, y + 106, 164, 28, 4); ctx.fillStyle = state === 'sealed' ? K.parchDim : K.parch; ctx.fill();
    var inkN = state === 'sealed' ? '#5e5240' : K.ink;
    text(ctx, idx + ' ' + name, x + 11, y + 113.5, 12, inkN, 'left', true);
    if ((state === 'open' || state === 'cleared') && scn > 0) text(ctx, '工程 ' + rc + '/' + scn, x + 166, y + 113.5, 10, rc >= scn ? K.good : K.inkDim, 'right', true);
    if (state === 'cleared') {
      var nw = tw(ctx, idx + ' ' + name, 12, true);
      if (st.recordCls != null) clsIcon(ctx, st.recordCls, x + 18 + nw, y + 113.5, 12);
      if (st.recordTime != null) text(ctx, fmt1(st.recordTime) + 's', x + 26 + nw, y + 114, 11, K.ink, 'left', true);
      var rt = mats(st.rates);
      for (var i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, x + 15 + i * 40, y + 126.5, 10, true); text(ctx, fmt1(clamp(rt[k], 0, 9999)), x + 22 + i * 40, y + 127, 10, K.ink, 'left', true); }
    } else if (state === 'open') text(ctx, '未過關', x + 11, y + 127, 11, K.inkDim, 'left', true);
    else if (state === 'buyable') text(ctx, '可解鎖 · Z', x + 11, y + 127, 11, K.selectDeep, 'left', true);
    else text(ctx, boss ? '7 關全過才開放' : '前一關未過', x + 11, y + 127, 11, '#5e5240', 'left', true);
    if (state === 'sealed') { rr(ctx, x, y, 176, 136, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); }
    ctx.restore();
  }
  function selFrame(ctx, x, y, w, h) {
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 11); ctx.lineWidth = 4; ctx.strokeStyle = K.select; ctx.stroke();
    poly(ctx, [x + w / 2 - 8, y - 6, x + w / 2 + 8, y - 6, x + w / 2, y + 4]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
  }
  function drawCardOverlay(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), sm2 = num(st.speedMul, 1), i;
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.strokeRect(x + 7, y + 7, 162, 92);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.35)'; ctx.strokeRect(x + 8.5, y + 8.5, 159, 89);
    if (sm2 > 1.001) {
      var lab = '×' + (Math.round(sm2 * 100) / 100), bw = tw(ctx, lab, 11, true) + 26;
      rr(ctx, x + 165 - bw, y + 11, bw, 17, 4); ctx.fillStyle = '#f0c27a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      itemIcon(ctx, 'gear', x + 174 - bw, y + 19.5, 13);
      text(ctx, lab, x + 183 - bw, y + 20, 11, K.ink, 'left', true);
    }
    if (st.newArea === true) newAreaChip(ctx, x + 11, y + 20, 'left', '新區域', 11);
    if (st.replayP !== null && st.replayP !== undefined && isFinite(Number(st.replayP))) {
      var p = clamp(Number(st.replayP), 0, 1), bx = x + 8, by = y + 99;
      ctx.fillStyle = '#0c1016'; ctx.fillRect(bx, by, 160, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(bx, by, 160 * p, 4);
      var marks = arr(st.marks).slice(0, 60);
      for (i = 0; i < marks.length; i++) {
        var m = obj(marks[i]), mp = clamp(num(m.p, 0), 0, 1), kind = oneOf(m.kind, KINDS, 'wood'), passed = p >= mp, fresh = passed && p - mp < 0.03;
        ctx.globalAlpha = passed ? 1 : 0.45; circle(ctx, bx + 160 * mp, by + 2, fresh ? 3 : 2); ctx.fillStyle = passed ? PAL[kind] : PAL[kind + 'Dark']; ctx.fill();
        if (fresh) { ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 160 * p - 1, by - 1, 2, 6);
    }
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }
  function anvil(ctx, cx, cy, k) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#120c08';
    poly(ctx, [-30, -10, 22, -10, 34, -4, 14, 2, 10, 10, -10, 10, -14, 2, -30, -2]); ctx.fillStyle = '#5a6070'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a92a4'; ctx.fillRect(-30, -10, 52, 3);
    rr(ctx, -16, 10, 32, 8, 2); ctx.fillStyle = '#3a3f4c'; ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(8, -22); ctx.rotate(-0.6);
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-2, -2, 4, 26); rr(ctx, -9, -8, 18, 9, 2); ctx.fillStyle = '#a9b3be'; ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = K.select; star4(ctx, -16, -20, 4); ctx.fill(); star4(ctx, 26, -18, 3); ctx.fill();
    ctx.restore();
  }
  function drawWorkshopCard(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    board(ctx, x, y, 176, 136, '#33263a');
    ctx.fillStyle = '#1f1626'; ctx.fillRect(x + 8, y + 8, 160, 90);
    ctx.fillStyle = rad(ctx, x + 88, y + 70, 4, 70, [0, 'rgba(255,170,80,0.35)', 1, 'rgba(255,170,80,0)']); ctx.fillRect(x + 8, y + 8, 160, 90);
    anvil(ctx, x + 84, y + 60, 1.25);
    rr(ctx, x + 6, y + 106, 164, 28, 4); ctx.fillStyle = K.parch; ctx.fill();
    text(ctx, '升級所', x + 88, y + 120.5, 14, K.ink, 'center', true);
    if (st.anyAffordable === true) { circle(ctx, x + 160, y + 18, 10); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke(); text(ctx, '!', x + 160, y + 19, 14, K.ink, 'center', true); }
    if (st.selected === true) selFrame(ctx, x, y, 176, 136);
    ctx.restore();
  }
  function drawFlyingMaterial(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = oneOf(st.kind, KINDS, 'wood'), dur = Math.max(0.01, num(st.dur, 0.7)), t = clamp(num(st.t, 0), 0, dur);
    var sx = Math.cos(t / dur * TAU * 1.5);
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.2, Math.abs(sx)), 1);
    matIcon(ctx, kind, 0, 0, 17);
    if (sx < 0) { circle(ctx, 0, 0, 7); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill(); }
    ctx.restore();
  }

  // ================= 關卡準備頁(作戰桌) =================
  function siteCard(ctx, s, i, x, y, sel, rowOn, stock) {
    s = obj(s);
    var status = s.status === 'done' ? 'done' : 'open', role = oneOf(s.role, ROLES, 'shortcut'), kind = oneOf(s.kind, ['bridge', 'stairs', 'rubble', 'nestgate'], 'rubble');
    var ty = tag(ctx, x, y, 150, 130, sel ? (rowOn ? 'hot' : 'cold') : null, status === 'done' ? 'done' : 'normal'), mid = x + 75;
    sitePin(ctx, i + 1, x + 16, ty + 16, 10, 13, status === 'done');
    roleMark(ctx, role, mid, ty + 32, 1, status === 'done');
    text(ctx, ROLE_NAME[role], mid, ty + 58, 13, status === 'done' ? K.inkDim : ROLE_INK[role], 'center', true);
    text(ctx, SITE_KIND_NAME[kind], mid, ty + 76, 12, K.inkDim, 'center', true);
    if (status === 'done') {
      ctx.save(); ctx.translate(mid, ty + 106); ctx.rotate(-0.12);
      rr(ctx, -40, -12, 80, 24, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = K.good; ctx.stroke();
      text(ctx, '已完工', 0, 0.5, 14, K.good, 'center', true); ctx.restore();
    } else {
      var c = costLine(ctx, s.cost, stock, mid, ty + 96, 13, 'center');
      act(ctx, 'Z 修復', mid, ty + 117, c.ok ? (sel && rowOn ? 'hot' : 'idle') : 'off', 'center', 11);
    }
  }
  function drawLevelPanel(ctx, st) {
    st = obj(st);
    var idx = Math.round(clamp(num(st.index, 1), 0, 99)), name = str(st.name, ''), theme = oneOf(st.theme, ['forest', 'cliff', 'mine', 'salt'], 'forest');
    var row = Math.round(clamp(num(st.row, 3), 0, 3)), sites = arr(st.sites).slice(0, 3), siteSel = st.siteSel == null ? -1 : Math.round(num(st.siteSel, -1));
    var slots = arr(st.slots), slotSel = Math.round(clamp(num(st.slotSel, 0), 0, 1)), bagCount = Math.round(clamp(num(st.bagCount, 0), 0, 99));
    var shopLeft = Math.round(clamp(num(st.shopLeft, 0), 0, 99)), stock = st.stock, i;
    ctx.save();
    dimScreen(ctx, 0.6, [60, 96, 640, 360]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(700, 96, -640, 360); ctx.clip('evenodd');
    board(ctx, 40, 48, 1200, 640);
    ctx.restore();
    text(ctx, '第 ' + idx + ' 關 ' + name, 60, 72, 22, K.cream, 'left', true, 4, K.edge);
    var tw1 = tw(ctx, '第 ' + idx + ' 關 ' + name, 22, true);
    rr(ctx, 72 + tw1, 62, tw(ctx, THEME_NAME[theme], 12, true) + 16, 20, 4); ctx.fillStyle = theme === 'salt' ? '#c47d9c' : (theme === 'cliff' ? '#7489a7' : (theme === 'mine' ? '#6b4a2b' : '#4f8a3a')); ctx.fill();
    text(ctx, THEME_NAME[theme], 80 + tw1, 72.5, 12, '#ffffff', 'left', true);
    // 預覽框: 只畫外框
    rr(ctx, 56, 92, 648, 368, 6); ctx.lineWidth = 4; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,215,160,0.4)'; ctx.strokeRect(59.25, 95.25, 641.5, 361.5);
    // 紀錄區
    var ry = tag(ctx, 60, 468, 640, 120, null, 'normal');
    text(ctx, '目前回放', 76, ry + 20, 13, K.inkDim, 'left', true);
    if (st.recordTime == null) {
      text(ctx, '尚無回放', 380, ry + 64, 20, K.inkDim, 'center', true);
    } else {
      if (st.recordCls != null) clsIcon(ctx, st.recordCls, 160, ry + 20, 22);
      text(ctx, (st.recordCls != null ? CLS_NAME[oneOf(st.recordCls, CLS, 'sword')] + '  ' : '') + fmt1(st.recordTime) + ' 秒', 176, ry + 21, 18, K.ink, 'left', true);
      ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(76, ry + 42, 608, 1);
      text(ctx, '每分鐘', 76, ry + 72, 13, K.inkDim, 'left', true);
      ratesRow(ctx, st.rates, 130, ry + 72, 122, 15);
      var sp = num(st.speedMul, 1);
      if (sp > 1.001) { itemIcon(ctx, 'gear', 616, ry + 100, 16); text(ctx, '回放 ×' + (Math.round(sp * 100) / 100), 628, ry + 100.5, 12, K.ink, 'left', true); }
    }
    if (st.newArea === true) newAreaChip(ctx, 684, ry + 20, 'right', '修好後還沒跑過', 11);
    // 右側四列
    groove(ctx, 720, 96, 480, 180, '修工程', row === 0);
    if (!sites.length) text(ctx, '本關沒有工程', 960, 192, 18, K.labelDim, 'center', true, 3, K.edge);
    else for (i = 0; i < sites.length; i++) siteCard(ctx, sites[i], i, 728 + 158 * i, 128, i === siteSel, row === 0, stock);
    groove(ctx, 720, 286, 480, 120, '道具格', row === 1);
    for (i = 0; i < 2; i++) {
      var it = slots[i], ox = 728 + 238 * i, sel = i === slotSel, has = ITEMS.indexOf(it) >= 0;
      var y2 = tag(ctx, ox, 310, 230, 88, sel ? (row === 1 ? 'hot' : 'cold') : null, 'normal');
      text(ctx, (i + 1) + ' 號格', ox + 8, y2 + 12, 11, K.inkDim, 'left', true);
      if (has) {
        itemIcon(ctx, it, ox + 30, y2 + 50, 40);
        text(ctx, ITEM_NAME[it], ox + 56, y2 + 40, 15, K.ink, 'left', true);
        text(ctx, ITEM_FX[it], ox + 56, y2 + 60, 11, K.inkDim, 'left', true);
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, ox + 12, y2 + 28, 40, 40, 5); ctx.lineWidth = 1.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
        text(ctx, '空', ox + 32, y2 + 48, 15, K.inkDim, 'center', true);
      }
      if (sel) text(ctx, bagCount > 0 ? 'Z 打開背包' : '尚無道具', ox + 222, y2 + 12, 11, bagCount > 0 ? K.ink : K.short, 'right', true);
    }
    groove(ctx, 720, 416, 480, 90, null, row === 2);
    var sy = tag(ctx, 734, 428, 452, 66, row === 2 ? 'hot' : null, shopLeft > 0 ? 'normal' : 'gray');
    ctx.save(); ctx.translate(770, sy + 33); // 商店小招牌
    rr(ctx, -22, -14, 44, 28, 4); ctx.fillStyle = '#7a4a24'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    poly(ctx, [-26, -14, 26, -14, 20, -22, -20, -22]); ctx.fillStyle = '#c8202c'; ctx.fill(); ctx.stroke();
    matIcon(ctx, 'crystal', 0, 1, 18); ctx.restore();
    text(ctx, '商店', 806, sy + 22, 18, K.ink, 'left', true);
    text(ctx, shopLeft > 0 ? '有貨 ' + shopLeft + ' 種 · 用水晶買道具' : '全部售完', 806, sy + 46, 12, K.inkDim, 'left', true);
    act(ctx, 'Z 打開商店', 1176, sy + 33, shopLeft > 0 ? (row === 2 ? 'hot' : 'idle') : 'off', 'right', 13);
    var gy = tag(ctx, 720, 516, 480, 120, row === 3 ? 'hot' : null, 'normal');
    rr(ctx, 720, gy, 14, 120, 6); ctx.fillStyle = K.good; ctx.fill();
    rr(ctx, 790, gy + 30, 300, 64, 10); ctx.fillStyle = '#8f8471'; ctx.fill();
    rr(ctx, 790, gy + 24, 300, 64, 10); ctx.fillStyle = row === 3 ? K.select : '#ece4d2'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '開始挑戰', 900, gy + 57, 28, K.ink, 'center', true);
    keycap(ctx, 'Z', 1040, gy + 56, 22, row === 3);
    keyRow(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '確定'], ['X', '關閉']], 60, 676, 13, 'left');
    ctx.restore();
  }
  function drawSiteHighlight(ctx, st) {
    st = obj(st);
    var x = num(st.x, 0), y = num(st.y, 0), w = clamp(num(st.w, 40), 4, 1280), h = clamp(num(st.h, 40), 4, 720), on = st.active !== false;
    var pu = 0.5 + 0.5 * Math.sin(nowS() * 6);
    ctx.save();
    ctx.globalAlpha *= on ? 0.75 + 0.25 * pu : 0.45;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,12,6,0.9)'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.lineWidth = 3; ctx.strokeStyle = K.select; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -nowS() * 20; ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,12,6,0.9)'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5); ctx.setLineDash([]);
    var L = Math.min(14, w / 3, h / 3);
    ctx.lineWidth = 5; ctx.strokeStyle = K.select; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x + 2.5, y + L); ctx.lineTo(x + 2.5, y + 2.5); ctx.lineTo(x + L, y + 2.5);
    ctx.moveTo(x + w - L, y + 2.5); ctx.lineTo(x + w - 2.5, y + 2.5); ctx.lineTo(x + w - 2.5, y + L);
    ctx.moveTo(x + w - 2.5, y + h - L); ctx.lineTo(x + w - 2.5, y + h - 2.5); ctx.lineTo(x + w - L, y + h - 2.5);
    ctx.moveTo(x + L, y + h - 2.5); ctx.lineTo(x + 2.5, y + h - 2.5); ctx.lineTo(x + 2.5, y + h - L);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 背包 / 商店 / 職業選擇 ----------
  function drawBackpackPanel(ctx, st) {
    st = obj(st);
    var slotNo = Math.round(clamp(num(st.slotNo, 1), 1, 2)), level = Math.round(clamp(num(st.level, 1), 1, 8)), items = arr(st.items).slice(0, 23), sel = Math.round(clamp(num(st.sel, 0), 0, 23)), i;
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 240, 120, 800, 480);
    text(ctx, '背包 — 裝到 ' + slotNo + ' 號格', 264, 148, 20, K.cream, 'left', true, 4, K.edge);
    text(ctx, '第 ' + level + ' 關', 1016, 148, 14, K.labelDim, 'right', true, 3, K.edge);
    for (i = 0; i < 24; i++) {
      var c = i % 8, r = Math.floor(i / 8), cx = 292 + 88 * c, cy = 200 + 88 * r, isSel = i === sel;
      if (i === 0) {
        var y0 = tag(ctx, cx, cy, 80, 80, isSel ? 'hot' : null, 'normal');
        ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, cx + 16, y0 + 10, 48, 44, 5); ctx.lineWidth = 1.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.moveTo(cx + 22, y0 + 50); ctx.lineTo(cx + 58, y0 + 14); ctx.lineWidth = 2.5; ctx.strokeStyle = K.short; ctx.stroke();
        text(ctx, '卸下', cx + 40, y0 + 68, 12, K.ink, 'center', true);
      } else if (i - 1 < items.length) {
        var it = obj(items[i - 1]), type = oneOf(it.type, ITEMS, 'bagWood'), wh = (it.where && typeof it.where === 'object') ? it.where : null;
        var here = wh && Math.round(num(wh.level, 0)) === level && Math.round(num(wh.slot, 0)) === slotNo;
        var y1 = tag(ctx, cx, cy, 80, 80, isSel ? 'hot' : null, 'normal');
        if (type === 'heart') { circle(ctx, cx + 40, y1 + 32, 28); ctx.fillStyle = 'rgba(194,100,255,0.18)'; ctx.fill(); }
        itemIcon(ctx, type, cx + 40, y1 + 32, 56);
        var lab = wh ? (here ? '這一格' : Math.round(num(wh.level, 0)) + '關' + Math.round(num(wh.slot, 0)) + '號') : '未裝';
        if (wh) { rr(ctx, cx + 8, y1 + 63, 64, 14, 3); ctx.fillStyle = here ? K.select : '#e0d2b0'; ctx.fill(); }
        text(ctx, lab, cx + 40, y1 + 70.5, 10, wh ? K.ink : K.inkDim, 'center', true);
      } else {
        ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, cx + 0.5, cy + 0.5, 79, 79, 6); ctx.lineWidth = 1.2; ctx.strokeStyle = '#8a7a60'; ctx.stroke(); ctx.restore();
        if (isSel) selFrame(ctx, cx, cy, 80, 80);
      }
    }
    var dy = tag(ctx, 292, 476, 696, 60, null, 'normal');
    if (sel === 0) text(ctx, '清空這一格', 312, dy + 30, 16, K.ink, 'left', true);
    else if (sel - 1 < items.length) {
      var ti = oneOf(obj(items[sel - 1]).type, ITEMS, 'bagWood');
      itemIcon(ctx, ti, 322, dy + 30, 36);
      text(ctx, ITEM_NAME[ti], 350, dy + 20, 16, K.ink, 'left', true);
      text(ctx, ITEM_FX[ti], 350, dy + 42, 13, K.inkDim, 'left', true);
    }
    keyRow(ctx, [['←→↑↓', '選擇'], ['Z', '裝上'], ['X', '返回']], 292, 568, 13, 'left');
    ctx.restore();
  }
  function drawShopPanel(ctx, st) {
    st = obj(st);
    var entries = arr(st.entries).slice(0, 6), sel = Math.round(clamp(num(st.sel, 0), 0, 5)), stock = mats(st.stock), i;
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 240, 120, 800, 480);
    text(ctx, '商店', 264, 148, 22, K.cream, 'left', true, 4, K.edge);
    rr(ctx, 860, 134, 156, 28, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '持有', 870, 148.5, 12, K.inkDim, 'left', true); matIcon(ctx, 'crystal', 912, 148, 20); text(ctx, intStr(stock.crystal), 926, 149, 17, K.ink, 'left', true);
    for (i = 0; i < 6; i++) {
      var e = obj(entries[i]), y = 180 + 56 * i, type = oneOf(e.type, ITEMS, 'gear'), max = Math.round(clamp(num(e.max, 1), 0, 99)), left = Math.round(clamp(num(e.left, max), 0, 99));
      var sold = left <= 0, isSel = i === sel, has = i < entries.length;
      if (!has) continue;
      var ty = tag(ctx, 272, y, 736, 50, isSel ? 'hot' : null, sold ? 'gray' : 'normal');
      if (isSel) { poly(ctx, [254, ty + 16, 266, ty + 25, 254, ty + 34]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
      ctx.save(); if (sold) ctx.globalAlpha *= 0.55;
      itemIcon(ctx, type, 300, ty + 25, 40);
      text(ctx, ITEM_NAME[type], 330, ty + 17, 16, K.ink, 'left', true);
      text(ctx, ITEM_FX[type], 330, ty + 36, 12, K.inkDim, 'left', true);
      ctx.restore();
      if (sold) {
        ctx.save(); ctx.translate(840, ty + 25); ctx.rotate(-0.08); rr(ctx, -44, -13, 88, 26, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a5448'; ctx.stroke(); text(ctx, '售完', 0, 0.5, 16, '#5a5448', 'center', true); ctx.restore();
      } else {
        costLine(ctx, e.cost, stock, 700, ty + 25, 15, 'left');
        text(ctx, '剩 ' + left, 992, ty + 25.5, 14, K.ink, 'right', true);
      }
    }
    keyRow(ctx, [['↑↓', '選擇'], ['Z', '買下'], ['X', '返回']], 272, 568, 13, 'left');
    ctx.restore();
  }
  function heroBig(ctx, cls, cx, cy, k, alpha) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); if (alpha < 1) ctx.globalAlpha *= alpha;
    heroFig(ctx, cls, 1, {}); ctx.restore();
  }
  function drawClassSelect(ctx, st) {
    st = obj(st);
    var classes = arr(st.classes), sel = Math.round(clamp(num(st.sel, 0), 0, 2)), i;
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 290, 200, 700, 320);
    text(ctx, '選擇出戰職業', 316, 226, 20, K.cream, 'left', true, 4, K.edge);
    for (i = 0; i < 3; i++) {
      var c = obj(classes[i]), cls = oneOf(c.cls, CLS, CLS[i]), owned = c.owned === true, isSel = i === sel, x = 316 + 224 * i;
      var ty = tag(ctx, x, 250, 200, 220, isSel ? 'hot' : null, owned ? 'normal' : 'dim');
      ell(ctx, x + 100, ty + 112, 40, 7); ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fill();
      heroBig(ctx, cls, x + 100, ty + 67, 2.5, owned ? 1 : 0.35);
      if (!owned) lockIcon(ctx, x + 100, ty + 70, 34, '#4a3e2e');
      text(ctx, CLS_NAME[cls], x + 100, ty + 136, 20, owned ? K.ink : '#5e5240', 'center', true);
      text(ctx, '擅長: ' + CLS_GOOD[cls], x + 100, ty + 162, 13, K.inkDim, 'center', true);
      if (!owned) text(ctx, '到升級所招募', x + 100, ty + 192, 13, '#8a3a1a', 'center', true);
      else if (isSel) act(ctx, 'Z 出發', x + 100, ty + 194, 'hot', 'center', 14);
    }
    keyRow(ctx, [['←→', '選擇'], ['Z', '出發'], ['X', '返回']], 316, 498, 13, 'left');
    ctx.restore();
  }

  // ---------- 升級所 ----------
  var STAT_NAME = { speed: '移速', hp: '血量', cd: '技能冷卻', atk: '攻擊傷害' };
  var STAT_FX = { speed: ['+0%', '+8%', '+16%', '+24%'], hp: ['3', '4', '5'], cd: ['-0%', '-15%', '-30%', '-45%'], atk: ['+0', '+1', '+2'] };
  var STAT_KEYS = ['speed', 'hp', 'cd', 'atk'], STAT_Y = [262, 352, 442, 532];
  function drawUpgradePage(ctx, st) {
    st = obj(st);
    var row = Math.round(clamp(num(st.row, 0), 0, 4)), recruits = arr(st.recruits), rSel = Math.round(clamp(num(st.recruitSel, 0), 0, 1)), stats = arr(st.stats), stock = st.stock, i;
    ctx.save();
    dimScreen(ctx, 0.6);
    board(ctx, 40, 48, 1200, 640, '#33263a');
    text(ctx, '升級所', 60, 72, 22, K.cream, 'left', true, 4, K.edge);
    groove(ctx, 80, 100, 1120, 150, '招募', row === 0);
    for (i = 0; i < 2; i++) {
      var rc = obj(recruits[i]), cls = oneOf(rc.cls, ['hunter', 'bomber'], i ? 'bomber' : 'hunter'), owned = rc.owned === true, isSel = i === rSel, x = 100 + 550 * i;
      var ty = tag(ctx, x, 124, 530, 116, isSel ? (row === 0 ? 'hot' : 'cold') : null, owned ? 'done' : 'normal');
      heroBig(ctx, cls, x + 54, ty + 56, 2.1, 1);
      text(ctx, CLS_NAME[cls], x + 104, ty + 30, 20, K.ink, 'left', true);
      text(ctx, '擅長: ' + CLS_GOOD[cls], x + 104, ty + 56, 13, K.inkDim, 'left', true);
      if (owned) { ctx.save(); ctx.translate(x + 440, ty + 58); ctx.rotate(-0.1); rr(ctx, -50, -15, 100, 30, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = K.good; ctx.stroke(); text(ctx, '已招募', 0, 0.5, 16, K.good, 'center', true); ctx.restore(); }
      else { var c = costLine(ctx, rc.cost, stock, x + 104, ty + 88, 15, 'left'); act(ctx, 'Z 招募', x + 514, ty + 88, c.ok ? (isSel && row === 0 ? 'hot' : 'idle') : 'off', 'right', 13); }
    }
    for (i = 0; i < 4; i++) {
      var s = obj(stats[i]), key = oneOf(s.key, STAT_KEYS, STAT_KEYS[i]), maxLv = Math.round(clamp(num(s.maxLv, STAT_FX[key].length - 1), 1, 9)), lv = Math.round(clamp(num(s.lv, 0), 0, maxLv));
      var y = STAT_Y[i], on = row === i + 1, fx = STAT_FX[key], full = s.cost == null || lv >= maxLv;
      groove(ctx, 80, y, 1120, 84, null, on);
      var ty2 = tag(ctx, 92, y + 10, 1096, 64, on ? 'hot' : null, 'normal');
      text(ctx, STAT_NAME[key], 112, ty2 + 32, 20, K.ink, 'left', true);
      for (var j = 0; j < maxLv; j++) { rr(ctx, 230 + j * 28, ty2 + 24, 22, 16, 3); ctx.fillStyle = j < lv ? PAL.core : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = K.edge; ctx.stroke(); }
      var cur = STAT_NAME[key] + ' ' + (fx[lv] || fx[fx.length - 1]);
      text(ctx, cur, 360, ty2 + 32, 17, K.ink, 'left', true);
      if (!full) { var cw = tw(ctx, cur, 17, true); text(ctx, '→  ' + (fx[lv + 1] || ''), 372 + cw, ty2 + 32, 17, K.good, 'left', true); }
      if (full) { ctx.save(); ctx.translate(1110, ty2 + 32); ctx.rotate(-0.08); rr(ctx, -44, -14, 88, 28, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); text(ctx, '已滿', 0, 0.5, 16, K.inkDim, 'center', true); ctx.restore(); }
      else { var cc = costLine(ctx, s.cost, stock, 760, ty2 + 32, 16, 'left'); act(ctx, 'Z 強化', 1172, ty2 + 32, cc.ok ? (on ? 'hot' : 'idle') : 'off', 'right', 14); }
    }
    keyRow(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '招募 / 強化'], ['X', '關閉']], 60, 676, 13, 'left');
    ctx.restore();
  }

  // ---------- 結算 / 失敗 / 暫停 ----------
  function drawResultPanel(ctx, st) {
    st = obj(st);
    var X = 280, Y = 150, Wd = 720, Hd = 420, run = mats(st.run), rates = mats(st.rates), cls = oneOf(st.cls, CLS, 'sword'), items = arr(st.items).slice(0, 2), i;
    var cmp = st.oldTime !== null && st.oldTime !== undefined && isFinite(Number(st.oldTime));
    ctx.save();
    board(ctx, X, Y, Wd, Hd, '#2f3322');
    poly(ctx, [640 - 80, Y + 10, 640 + 80, Y + 10, 640 + 68, Y + 25, 640 + 80, Y + 40, 640 - 80, Y + 40, 640 - 68, Y + 25]); ctx.fillStyle = K.good; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '過關', 640, Y + 25.5, 20, '#ffffff', 'center', true, 3, '#14361f');
    text(ctx, '這一趟獲得', X + 24, Y + 66, 14, K.labelDim, 'left', true, 3, K.edge);
    for (i = 0; i < 4; i++) { var k = KINDS[i]; matIcon(ctx, k, X + 140 + i * 90, Y + 66, 20); text(ctx, intStr(run[k]), X + 154 + i * 90, Y + 67, 17, K.cream, 'left', true, 3, K.edge); }
    var ty = tag(ctx, X + 16, Y + 88, Wd - 32, 220, null, 'normal');
    if (!cmp) {
      clsIcon(ctx, cls, X + 52, ty + 30, 24);
      text(ctx, CLS_NAME[cls] + '  ' + fmt1(st.time) + ' 秒', X + 70, ty + 31, 20, K.ink, 'left', true);
      ctx.fillStyle = 'rgba(60,40,20,0.3)'; ctx.fillRect(X + 32, ty + 56, Wd - 64, 1.5);
      text(ctx, '每分鐘產量', X + 40, ty + 84, 14, K.inkDim, 'left', true);
      ratesRow(ctx, rates, X + 40, ty + 118, 150, 17);
      ctx.save(); ctx.translate(640, ty + 178); ctx.rotate(-0.05); rr(ctx, -96, -18, 192, 36, 5); ctx.lineWidth = 3; ctx.strokeStyle = K.good; ctx.stroke(); text(ctx, '已存成回放', 0, 0.5, 18, K.good, 'center', true); ctx.restore();
    } else {
      var oldR = mats(st.oldRates), oldCls = oneOf(st.oldCls, CLS, 'sword'), cA = X + 330, cB = X + 540;
      text(ctx, '這一趟', cA, ty + 18, 15, K.ink, 'center', true); text(ctx, '目前回放', cB, ty + 18, 15, K.ink, 'center', true);
      ctx.fillStyle = 'rgba(60,40,20,0.35)'; ctx.fillRect(X + 32, ty + 32, Wd - 64, 1.5);
      text(ctx, '職業 / 秒數', X + 40, ty + 52, 13, K.inkDim, 'left', true);
      var tNew = num(st.time, 0), tOld = num(st.oldTime, 0);
      clsIcon(ctx, cls, cA - 44, ty + 52, 18); text(ctx, fmt1(tNew) + ' 秒', cA - 30, ty + 53, 15, tNew < tOld ? K.good : (tNew > tOld ? '#8a7a5e' : K.ink), 'left', true);
      clsIcon(ctx, oldCls, cB - 44, ty + 52, 18); text(ctx, fmt1(tOld) + ' 秒', cB - 30, ty + 53, 15, tOld < tNew ? K.good : (tOld > tNew ? '#8a7a5e' : K.ink), 'left', true);
      for (i = 0; i < 4; i++) {
        var yy = ty + 86 + i * 32, kk = KINDS[i], a = Math.round(rates[kk] * 10) / 10, b = Math.round(oldR[kk] * 10) / 10, up = a > b, dn = a < b;
        if (i % 2 === 0) { ctx.fillStyle = 'rgba(120,90,40,0.10)'; ctx.fillRect(X + 26, yy - 15, Wd - 52, 30); }
        matIcon(ctx, kk, X + 52, yy, 18); text(ctx, KIND_NAME[kk] + ' / 分', X + 68, yy + 0.5, 13, K.inkDim, 'left', true);
        text(ctx, '+' + fmt1(a) + (up ? ' ▲' : ''), cA, yy + 0.5, 16, up ? K.good : (dn ? '#8a7a5e' : K.ink), 'center', true);
        text(ctx, '+' + fmt1(b) + (dn ? ' ▲' : ''), cB, yy + 0.5, 16, dn ? K.good : (up ? '#8a7a5e' : K.ink), 'center', true);
      }
    }
    for (i = 0; i < items.length; i++) {
      var tp = oneOf(items[i], ITEMS, 'bagWood'), ix = X + 40 + i * 330;
      itemIcon(ctx, tp, ix + 16, Y + 334, 30);
      text(ctx, '獲得 ' + ITEM_NAME[tp], ix + 38, Y + 335, 16, tp === 'heart' ? '#e8c8ff' : K.cream, 'left', true, 3, K.edge);
    }
    if (cmp) keyRow(ctx, [['Z', '採用這一趟', true], ['X', '保留舊的']], 640, Y + 388, 15, 'center');
    else keyRow(ctx, [['Z', '回大地圖', true]], 640, Y + 388, 15, 'center');
    ctx.restore();
  }
  function drawFailPanel(ctx) {
    ctx.save();
    board(ctx, 380, 240, 520, 240, '#4a2420');
    text(ctx, '失敗', 640, 292, 32, '#ff8a7a', 'center', true, 5, K.edge);
    text(ctx, '這趟作廢, 素材不入帳', 640, 342, 15, '#e8c8b8', 'center', true, 3, K.edge);
    keyRow(ctx, [['Z', '重來', true], ['X', '回大地圖']], 640, 420, 16, 'center');
    ctx.restore();
  }
  function drawPausePanel(ctx, st) {
    st = obj(st);
    var mode = st.mode === 'level' ? 'level' : 'map', touch = st.touch === true;
    ctx.save();
    dimScreen(ctx, 0.55);
    board(ctx, 380, 220, 520, 280);
    text(ctx, '暫停', 640, 276, 32, K.cream, 'center', true, 5, K.edge);
    if (touch) act(ctx, '繼續', 640, 350, 'hot', 'center', 18);
    else keyRow(ctx, [['Esc', '繼續', true]], 640, 350, 17, 'center');
    if (mode === 'level') keyRow(ctx, [['Z', '重來'], ['X', '回大地圖']], 640, 420, 16, 'center');
    else keyRow(ctx, [['Z', '下載遊玩紀錄']], 640, 420, 16, 'center');
    ctx.restore();
  }

  // ================= 開始畫面(title 方案 B 關卡之輪; 中央換成倉庫) =================
  // 循環 4 秒: 光點每 4 秒繞一圈、每 0.5 秒掃過一枚窗; 所有週期取 4 秒的因數(標題字呼吸 1.2 秒照規格)
  var TT = { CX: 640, CY: 340, R: 265, WR: 44, N: 8, FLY: 0.85, DOOR: [640, 478] };
  var TSLOT = ['salt', 'forest', 'forest', 'forest', 'cliff', 'cliff', 'mine', 'mine'];
  var TMAT = { salt: 'core', forest: 'wood', cliff: 'stone', mine: 'crystal' };
  var TCLS = ['sword', 'sword', 'hunter', 'bomber', 'hunter', 'sword', 'bomber', 'hunter'];
  function tSlotPos(i) { var a = -Math.PI / 2 + i * TAU / TT.N; return [TT.CX + Math.cos(a) * TT.R, TT.CY + Math.sin(a) * TT.R]; }
  function tSince(p, i) { return fr(p - i / TT.N) * 4; }
  function titleWindow(ctx, i, p) {
    var th = TSLOT[i], pos = tSlotPos(i), d = tSince(p, i), WR = TT.WR;
    var ping = d < 0.5 ? 1 - d / 0.5 : 0, bump = 1 + 0.1 * Math.sin(Math.PI * clamp(d / 0.3, 0, 1));
    ctx.save(); ctx.translate(pos[0], pos[1]); ctx.scale(bump, bump);
    if (ping > 0) { circle(ctx, 0, 0, WR + 30); ctx.fillStyle = rad(ctx, 0, 0, WR, WR + 30, [0, 'rgba(255,214,90,' + (0.55 * ping).toFixed(3) + ')', 1, 'rgba(255,214,90,0)']); ctx.fill(); }
    circle(ctx, 0, 0, WR + 5); ctx.fillStyle = '#161220'; ctx.fill();
    ctx.save(); circle(ctx, 0, 0, WR); ctx.clip();
    var T = THEMES[th];
    ctx.fillStyle = lin(ctx, 0, -WR, 0, WR, [0, th === 'salt' ? '#5e4180' : T.sky0, 1, th === 'salt' ? '#f4c2a2' : T.sky1]); ctx.fillRect(-WR, -WR, WR * 2, WR * 2);
    if (th === 'salt') { // 斷門: 粉紫石柱 + 門縫透光
      var fl = d < 0.4 ? 1 - d / 0.4 : 0;
      ctx.fillStyle = rad(ctx, 0, -2, 2, 30, [0, 'rgba(255,240,220,' + (0.55 + 0.45 * fl).toFixed(3) + ')', 1, 'rgba(255,200,180,0)']); ctx.fillRect(-WR, -WR, WR * 2, WR * 2);
      gateGlyph(ctx, 0, 6, 1.05, '#4e3a68');
      ctx.fillStyle = 'rgba(255,246,220,' + (0.6 + 0.4 * fl).toFixed(3) + ')'; ctx.fillRect(-12, -14, 22, 3); ctx.fillRect(-3, -14, 3, 46);
      ctx.fillStyle = '#fbf3ec'; ctx.fillRect(-WR, 32, WR * 2, 12);
    } else {
      var sc = 0.55, gy = 14;
      ctx.save(); ctx.scale(sc, sc);
      for (var c = -3; c <= 2; c++) {
        drawGround(ctx, { x: (c * 40 + 20), y: gy / sc + 20, theme: th, open: { n: true, e: false, s: false, w: false } });
        drawGround(ctx, { x: (c * 40 + 20), y: gy / sc + 60, theme: th, open: { n: false, e: false, s: false, w: false } });
      }
      ctx.restore();
      var lp = fr(p * 2 + i * 0.13), hk = 0.62, hx = -WR - 14 + (WR * 2 + 28) * lp;
      var ix = 8, mat = TMAT[th];
      if (hx < ix - 4) matIcon(ctx, mat, ix, gy - 10 + Math.sin(p * TAU * 4) * 1.2, 13);
      else if (hx - ix < 22) { var sp = (hx - ix + 4) / 26; ctx.save(); ctx.globalAlpha *= clamp(1 - sp, 0, 1); star4(ctx, ix, gy - 14 - sp * 12, 4 + sp * 6); ctx.fillStyle = '#fff6c0'; ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.translate(hx, gy - 18 * hk); ctx.scale(hk, hk);
      heroFig(ctx, TCLS[i], 1, { pose: 'run', swing: Math.sin(p * TAU * 8 + i) * 3 }); ctx.restore();
    }
    if (ping > 0) { ctx.fillStyle = 'rgba(255,240,180,' + (0.3 * ping).toFixed(3) + ')'; ctx.fillRect(-WR, -WR, WR * 2, WR * 2); }
    ctx.restore();
    circle(ctx, 0, 0, WR - 1.5); ctx.lineWidth = 3.5;
    ctx.strokeStyle = ping > 0 ? 'rgba(255,214,90,' + (0.5 + 0.5 * ping).toFixed(3) + ')' : (th === 'salt' ? '#e8a8d8' : THEMES[th].cap);
    ctx.stroke();
    ctx.restore();
  }
  function warehouse(ctx, p) {
    var CX = 640, BOT = 500, i, bounce = 0;
    for (i = 0; i < TT.N; i++) { var d = tSince(p, i) - TT.FLY; if (d >= 0 && d < 0.25) bounce = Math.max(bounce, Math.sin(Math.PI * d / 0.25)); }
    var s = 1 + 0.04 * bounce;
    // 浮島
    ctx.beginPath(); ctx.moveTo(CX - 150, BOT); ctx.quadraticCurveTo(CX - 110, BOT + 56, CX, BOT + 72); ctx.quadraticCurveTo(CX + 110, BOT + 56, CX + 150, BOT); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, BOT, 0, BOT + 72, [0, '#6b4a34', 1, '#2e1f18']); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#161008'; ctx.stroke();
    ell(ctx, CX, BOT, 150, 15); ctx.fillStyle = '#5cbf45'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#161008'; ctx.stroke();
    ell(ctx, CX, BOT - 3, 140, 9); ctx.fillStyle = '#a8e27a'; ctx.fill();
    ctx.save(); ctx.translate(CX, BOT); ctx.scale(s, s); ctx.translate(-CX, -BOT);
    ctx.lineJoin = 'round';
    // 牆
    ctx.fillStyle = lin(ctx, 0, 330, 0, 500, [0, '#a8743e', 1, '#6e4624']); ctx.fillRect(500, 330, 280, 170);
    ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (i = 1; i < 14; i++) { ctx.moveTo(500 + i * 20, 332); ctx.lineTo(500 + i * 20, 498); } ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#2a180c'; ctx.strokeRect(500, 330, 280, 170);
    ctx.fillStyle = '#4a2c14'; ctx.fillRect(500, 360, 280, 8); // 橫樑
    // 屋頂
    poly(ctx, [484, 336, 640, 214, 796, 336]); ctx.fillStyle = lin(ctx, 0, 214, 0, 336, [0, '#c8503a', 1, '#7a2a1e']); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#2a0e08'; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,10,6,0.45)'; ctx.lineWidth = 2;
    for (i = 1; i < 6; i++) { var yy = 214 + i * 20; ctx.beginPath(); ctx.moveTo(640 - (yy - 214) * 1.28, yy); ctx.lineTo(640 + (yy - 214) * 1.28, yy); ctx.stroke(); }
    // 閣樓門 + 吊臂
    rr(ctx, 616, 262, 48, 44, 4); ctx.fillStyle = '#2a180c'; ctx.fill(); ctx.fillStyle = 'rgba(255,200,110,0.55)'; ctx.fillRect(622, 268, 36, 32);
    ctx.strokeStyle = '#2a180c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(640, 258); ctx.lineTo(640, 246); ctx.lineTo(680, 246); ctx.lineTo(680, 266); ctx.stroke();
    // 敞開的大門
    ctx.fillStyle = '#1c0f08'; ctx.fillRect(585, 380, 110, 120);
    ctx.fillStyle = rad(ctx, 640, 470, 6, 90, [0, 'rgba(255,200,110,' + (0.5 + 0.3 * bounce).toFixed(3) + ')', 1, 'rgba(255,170,80,0)']); ctx.fillRect(585, 380, 110, 120);
    poly(ctx, [585, 380, 560, 392, 560, 500, 585, 500]); ctx.fillStyle = '#8a5a2e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#2a180c'; ctx.stroke();
    poly(ctx, [695, 380, 720, 392, 720, 500, 695, 500]); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeRect(585, 380, 110, 120);
    // 門口素材堆: 一拍長高一點, 斷門閃光時回到原高
    var HEAP = [['wood', -40, 0], ['stone', -14, 2], ['crystal', 12, 2], ['core', 38, 0], ['wood', -27, -14], ['stone', 0, -12], ['crystal', 26, -14],
      ['core', -14, -26], ['wood', 12, -26], ['stone', -1, -38], ['crystal', -30, -3], ['core', 30, -28], ['wood', 0, -50], ['stone', -18, -48]];
    var n = 5 + Math.min(HEAP.length - 5, Math.floor(p * 8) + (tSince(p, Math.floor(p * 8)) > TT.FLY ? 1 : 0));
    ctx.fillStyle = rad(ctx, 640, 480, 4, 70, [0, 'rgba(255,214,90,0.35)', 1, 'rgba(255,214,90,0)']); ctx.fillRect(570, 420, 140, 90);
    for (i = 0; i < n; i++) matIcon(ctx, HEAP[i][0], 640 + HEAP[i][1], 486 + HEAP[i][2], 24);
    ctx.restore();
  }
  function drawTitle(ctx, st) {
    st = obj(st);
    var t = num(st.t, 0), p = fr(t / 4), i;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.fillStyle = rad(ctx, TT.CX, TT.CY, 40, 760, [0, '#2c3a62', 0.55, '#18203a', 1, '#0c1020']); ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(TT.CX, TT.CY); ctx.rotate(p * TAU / 12); ctx.fillStyle = 'rgba(255,230,160,0.035)';
    for (i = 0; i < 12; i++) { var a = i * TAU / 12; poly(ctx, [0, 0, Math.cos(a - 0.07) * 900, Math.sin(a - 0.07) * 900, Math.cos(a + 0.07) * 900, Math.sin(a + 0.07) * 900]); ctx.fill(); }
    ctx.restore();
    for (i = 0; i < 70; i++) { var tw2 = 0.5 + 0.5 * Math.sin(p * TAU * (1 + (i % 3)) + i * 2.3); ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.25 * tw2).toFixed(3) + ')'; circle(ctx, hash(i, 4) * W, hash(i, 5) * H, 0.8 + hash(i, 6) * 1.2); ctx.fill(); }
    // 金色環道 + 光點
    circle(ctx, TT.CX, TT.CY, TT.R); ctx.lineWidth = 30; ctx.strokeStyle = '#161220'; ctx.stroke();
    ctx.lineWidth = 24; ctx.strokeStyle = '#2c2438'; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(TT.CX, TT.CY, TT.R, -Math.PI / 2, -Math.PI / 2 + TAU); ctx.setLineDash([10, 18]); ctx.lineDashOffset = -p * 28 * 20; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(242,201,76,0.45)'; ctx.stroke(); ctx.restore();
    var ac = -Math.PI / 2 + p * TAU;
    for (i = 0; i < 16; i++) { var a0 = ac - 1.1 * (1 - i / 16), a1 = ac - 1.1 * (1 - (i + 1) / 16); ctx.beginPath(); ctx.arc(TT.CX, TT.CY, TT.R, a0, a1); ctx.lineWidth = 6 + 10 * (i / 16); ctx.strokeStyle = 'rgba(255,214,90,' + (0.06 + 0.5 * (i / 16)).toFixed(3) + ')'; ctx.stroke(); }
    for (i = 0; i < TT.N; i++) titleWindow(ctx, i, p);
    var hx = TT.CX + Math.cos(ac) * TT.R, hy = TT.CY + Math.sin(ac) * TT.R;
    circle(ctx, hx, hy, 30); ctx.fillStyle = rad(ctx, hx, hy, 0, 30, [0, 'rgba(255,248,210,0.95)', 0.35, 'rgba(255,214,90,0.6)', 1, 'rgba(255,214,90,0)']); ctx.fill();
    circle(ctx, hx, hy, 8); ctx.fillStyle = '#fffbe8'; ctx.fill();
    warehouse(ctx, p);
    // 素材沿弧線落進倉庫大門
    for (i = 0; i < TT.N; i++) {
      var pos = tSlotPos(i), mat = TMAT[TSLOT[i]];
      for (var j = 0; j < 3; j++) {
        var d = tSince(p, i) - j * 0.06; if (d < 0 || d >= TT.FLY) continue;
        var u = d / TT.FLY, tg = [TT.DOOR[0] + (j - 1) * 22, TT.DOOR[1]], mx = (pos[0] + tg[0]) / 2 + (j - 1) * 40, my = Math.min(pos[1], tg[1]) - 120, v = 1 - u;
        matIcon(ctx, mat, v * v * pos[0] + 2 * v * u * mx + u * u * tg[0], v * v * pos[1] + 2 * v * u * my + u * u * tg[1], 22);
      }
    }
    var s = st.touch === true ? '點擊畫面開始遊戲' : '按任意按鍵開始遊戲';
    ctx.globalAlpha = 0.775 + 0.225 * Math.cos(t * TAU / 1.2);
    text(ctx, s, 640, 668, 20, '#f2f4f8', 'center', true, 5, 'rgba(8,10,18,0.92)');
    ctx.restore();
  }

  // ================= 結局(ending 方案 B 高崖日出) =================
  var EN = { GY: 520, EDGE: 900, HOR: 486, SUN: 1080, D0: 1.4, D1: 7.0, HK: 2.4, RUN: 2.3, L0: 8.4, LS: 0.22 };
  var EN_HEROES = [{ cls: 'hunter', x: 690, t0: 0.5 }, { cls: 'sword', x: 770, t0: 0.75 }, { cls: 'bomber', x: 845, t0: 1.0 }];
  var EN_CHEER = { sword: 6.4, hunter: 6.9, bomber: 7.4 };
  var EN_PATH = [];
  (function () { for (var i = 0; i <= 40; i++) { var u = i / 40; EN_PATH.push([1250 - 300 * u + Math.sin(u * 9) * 46 * (1 - u * 0.4), 540 + 150 * u]); } })();
  function dawn(t) { return sm(seg(t, EN.D0, EN.D1)); }
  function enHero(h, t) {
    var u = seg(t, h.t0, h.t0 + EN.RUN), x = -40 + (h.x + 40) * eOut(u), running = u > 0 && u < 0.97, jump = 0, cs = t - EN_CHEER[h.cls];
    if (cs > 0 && cs < 0.55) jump = Math.sin(Math.PI * cs / 0.55) * 48;
    var bob = (!running && t > h.t0 + EN.RUN) ? Math.sin((t - h.t0) * 2.4) * 1.5 : 0;
    return { x: x, running: running, legPh: running ? t * 16 : 0, jump: jump, bob: bob };
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(clamp(num(s, 0), 0, 359999)));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h > 0 ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function drawEnding(ctx, st) {
    st = obj(st);
    var t = clamp(num(st.t, 0), 0, 14), d = dawn(t), totals = mats(st.totals), kills = num(st.kills, 0), i, x;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    // 天空 / 星 / 太陽 / 遠方岩柱
    ctx.fillStyle = (function () { var g = ctx.createLinearGradient(0, 0, 0, EN.HOR + 40); g.addColorStop(0, mix('#0a1028', '#3d63a6', d)); g.addColorStop(0.55, mix('#18204a', '#e8a066', d)); g.addColorStop(1, mix('#2a2c58', '#ffd98a', d)); return g; })();
    ctx.fillRect(0, 0, W, EN.HOR + 40);
    var sa = 1 - seg(t, EN.D0, EN.D0 + 3.5);
    if (sa > 0) for (i = 0; i < 80; i++) { var tw3 = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7); ctx.fillStyle = 'rgba(255,255,255,' + (sa * (0.2 + 0.5 * tw3) * (1 - hash(i, 3) * 0.5)).toFixed(3) + ')'; circle(ctx, hash(i, 1) * W, hash(i, 2) * (EN.HOR - 80), 0.8 + hash(i, 4) * 1.3); ctx.fill(); }
    var sy = 600 - 230 * eOut(seg(t, 1.8, 7.5));
    ctx.fillStyle = rad(ctx, EN.SUN, sy, 20, 420, [0, 'rgba(255,240,190,' + (0.85 * d).toFixed(3) + ')', 0.25, 'rgba(255,200,110,' + (0.4 * d).toFixed(3) + ')', 1, 'rgba(255,170,90,0)']); ctx.fillRect(0, 0, W, EN.HOR + 40);
    if (d > 0.05) { ctx.save(); ctx.translate(EN.SUN, sy); ctx.rotate(t * 0.05); ctx.fillStyle = 'rgba(255,236,170,' + (0.08 * d).toFixed(3) + ')'; for (i = 0; i < 14; i++) { var a = i * TAU / 14; poly(ctx, [0, 0, Math.cos(a - 0.05) * 1100, Math.sin(a - 0.05) * 1100, Math.cos(a + 0.05) * 1100, Math.sin(a + 0.05) * 1100]); ctx.fill(); } ctx.restore(); }
    circle(ctx, EN.SUN, sy, 46); ctx.fillStyle = mix('#c86a4a', '#fff2c8', d); ctx.fill();
    ctx.fillStyle = mix('#141a36', '#8a6a7a', d * 0.8);
    [[60, 300, 46], [170, 360, 30], [980, 330, 40], [1200, 280, 54], [1130, 380, 26]].forEach(function (c) { poly(ctx, [c[0] - c[2] / 2, EN.HOR + 40, c[0] - c[2] / 2 + 4, c[1] + 20, c[0] - c[2] * 0.7, c[1], c[0] + c[2] * 0.7, c[1] - 6, c[0] + c[2] / 2 - 2, c[1] + 22, c[0] + c[2] / 2, EN.HOR + 40]); ctx.fill(); });
    // 雲海 + 山谷
    ctx.fillStyle = mix('#283058', '#ffe0b0', d * 0.9);
    ctx.beginPath(); ctx.moveTo(EN.EDGE - 40, H); for (x = EN.EDGE - 40; x <= W + 40; x += 40) ctx.lineTo(x, EN.HOR + 8 + Math.sin(x * 0.03 + t * 0.4) * 6); ctx.lineTo(W + 40, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = lin(ctx, 0, EN.HOR + 20, 0, H, [0, mix('#1c2246', '#c7a0a0', d * 0.7), 1, mix('#0e1226', '#4a5a7a', d)]); ctx.fillRect(EN.EDGE - 40, EN.HOR + 26, W - EN.EDGE + 40, H - EN.HOR - 26);
    ctx.fillStyle = mix('#151a34', '#5a6a6a', d * 0.8);
    ctx.beginPath(); ctx.moveTo(EN.EDGE - 40, H); for (x = EN.EDGE - 40; x <= W; x += 20) ctx.lineTo(x, 600 + Math.sin(x * 0.02) * 22 + Math.sin(x * 0.051) * 10); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 小路與 8 盞關卡燈 → 倉庫
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(EN_PATH[0][0], EN_PATH[0][1]); for (i = 1; i < EN_PATH.length; i++) ctx.lineTo(EN_PATH[i][0], EN_PATH[i][1]);
    ctx.lineWidth = 7; ctx.strokeStyle = mix('#232a48', '#a89070', d); ctx.stroke();
    var pu = seg(t, EN.L0, EN.L0 + EN.LS * 8);
    if (pu > 0) { var nn = Math.round(pu * (EN_PATH.length - 1)); ctx.beginPath(); ctx.moveTo(EN_PATH[0][0], EN_PATH[0][1]); for (i = 1; i <= nn; i++) ctx.lineTo(EN_PATH[i][0], EN_PATH[i][1]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,214,90,0.85)'; ctx.stroke(); }
    for (var k = 0; k < 8; k++) {
      var lp = EN_PATH[Math.round((k + 0.5) / 8 * (EN_PATH.length - 1) * 0.92)], lt = EN.L0 + k * EN.LS, s2 = t - lt;
      ctx.fillStyle = '#2a2230'; ctx.fillRect(lp[0] - 1.5, lp[1] - 18, 3, 18);
      if (s2 >= 0) { var r = 16 + (s2 < 0.3 ? 12 * (1 - s2 / 0.3) : 2 * Math.sin(t * 3 + k)); circle(ctx, lp[0], lp[1] - 20, r); ctx.fillStyle = rad(ctx, lp[0], lp[1] - 20, 0, r, [0, 'rgba(255,240,180,0.95)', 1, 'rgba(255,200,90,0)']); ctx.fill(); circle(ctx, lp[0], lp[1] - 20, 3.5); ctx.fillStyle = '#fff6d0'; ctx.fill(); }
      else { circle(ctx, lp[0], lp[1] - 20, 3); ctx.fillStyle = '#4a4258'; ctx.fill(); }
    }
    var end = EN_PATH[EN_PATH.length - 1], wt = EN.L0 + EN.LS * 8 + 0.15, wo = seg(t, wt, wt + 0.4), wx = end[0] - 30, wy = end[1] - 8;
    if (wo > 0) { circle(ctx, wx, wy - 20, 80); ctx.fillStyle = rad(ctx, wx, wy - 20, 0, 80, [0, 'rgba(255,214,90,' + (0.6 * wo).toFixed(3) + ')', 1, 'rgba(255,214,90,0)']); ctx.fill(); }
    ctx.lineWidth = 2; ctx.strokeStyle = '#120c08';
    ctx.fillStyle = mix('#3a2a24', '#7a5232', d); ctx.fillRect(wx - 26, wy - 30, 52, 30); ctx.strokeRect(wx - 26, wy - 30, 52, 30);
    poly(ctx, [wx - 32, wy - 28, wx, wy - 52, wx + 32, wy - 28]); ctx.fillStyle = mix('#3a1e1a', '#a84c34', d); ctx.fill(); ctx.stroke();
    ctx.fillStyle = wo > 0 ? 'rgba(255,220,120,' + (0.4 + 0.6 * wo).toFixed(3) + ')' : '#1a120c'; ctx.fillRect(wx - 11, wy - 22, 22, 22);
    ctx.restore();
    // 崖頂
    ctx.beginPath(); ctx.moveTo(-10, EN.GY); ctx.lineTo(EN.EDGE, EN.GY); ctx.lineTo(EN.EDGE + 14, EN.GY + 40); ctx.lineTo(EN.EDGE - 6, EN.GY + 90); ctx.lineTo(EN.EDGE + 8, EN.GY + 150); ctx.lineTo(EN.EDGE - 20, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
    ctx.fillStyle = mix('#1e2236', '#6a5a6a', d * 0.85); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#0c0a12'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
    for (i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(i * 110 - 20, EN.GY + 50 + (i % 3) * 30); ctx.lineTo(i * 110 + 60, EN.GY + 34 + (i % 3) * 30); ctx.stroke(); }
    ctx.fillStyle = mix('#7d8ca5', '#ffe2a8', d * 0.7); ctx.fillRect(-10, EN.GY, EN.EDGE + 10, 10);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.3 * d).toFixed(3) + ')'; ctx.fillRect(-10, EN.GY, EN.EDGE + 10, 2.5);
    // 三人長影 + 本人
    if (d > 0.05) for (i = 0; i < 3; i++) { var hs = enHero(EN_HEROES[i], t), len = 60 + 140 * d; ctx.fillStyle = 'rgba(10,6,20,' + (0.35 * d).toFixed(3) + ')'; poly(ctx, [hs.x - 12, EN.GY + 2, hs.x + 12, EN.GY + 2, hs.x - len + 8, EN.GY + 9, hs.x - len - 16, EN.GY + 9]); ctx.fill(); }
    for (i = 0; i < 3; i++) {
      var h = EN_HEROES[i], s3 = enHero(h, t);
      if (s3.x < -60) continue;
      ctx.save();
      ell(ctx, s3.x, EN.GY + 2, 30 - s3.jump * 0.2, 5); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      ctx.translate(s3.x, EN.GY - 18 * EN.HK - s3.jump + s3.bob); ctx.scale(EN.HK, EN.HK);
      heroFig(ctx, h.cls, 1, { swing: Math.sin(s3.legPh) * 3, holdBomb: !(h.cls === 'bomber' && t > EN_CHEER.bomber && t < EN_CHEER.bomber + 1.6) });
      if (d > 0.2) { ctx.fillStyle = 'rgba(255,214,120,' + (0.35 * d).toFixed(3) + ')'; ctx.fillRect(10, -16, 3, 32); }
      ctx.restore();
    }
    // 歡呼特效
    var sw = EN_HEROES[1], hu = EN_HEROES[0], bo = EN_HEROES[2], ca = t - EN_CHEER.sword;
    if (ca > 0.1 && ca < 0.8) { var kk = 1 - Math.abs(ca - 0.3) / 0.5; ctx.save(); ctx.globalAlpha = clamp(kk, 0, 1); star4(ctx, sw.x + 12 * EN.HK, EN.GY - 18 * EN.HK - 19 * EN.HK - enHero(sw, t).jump, 10 + 14 * kk); ctx.fillStyle = '#fff6c0'; ctx.fill(); ctx.restore(); }
    var cb = t - EN_CHEER.hunter, ax = hu.x + 30, ay0 = EN.GY - 60, apex = 150;
    if (cb > 0 && cb < 0.5) { var ay = ay0 - (ay0 - apex) * eOut(cb / 0.5); ctx.strokeStyle = PAL.arrow; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay + 26); ctx.lineTo(ax, ay); ctx.stroke(); ctx.fillStyle = '#c9d3df'; poly(ctx, [ax - 4, ay, ax, ay - 8, ax + 4, ay]); ctx.fill(); }
    else if (cb >= 0.5 && cb < 2.4) { var e = cb - 0.5; for (i = 0; i < 16; i++) { var an = i * TAU / 16, spd = 110 + hash(i, 9) * 40, q = eOut(clamp(e / 1.2, 0, 1)); ctx.save(); ctx.globalAlpha = clamp(1 - e / 1.9, 0, 1); star(ctx, ax + Math.cos(an) * spd * q, apex + Math.sin(an) * spd * q + 40 * e * e, 6, 4); ctx.fillStyle = PAL.gold; ctx.fill(); ctx.restore(); } }
    var cc = t - EN_CHEER.bomber, bx0 = bo.x + 12 * EN.HK, by0 = EN.GY - 20 * EN.HK, bxa = bo.x - 40, bya = 200;
    if (cc > 0 && cc < 0.5) { var uu = cc / 0.5, bx = bx0 + (bxa - bx0) * uu, by = by0 + (bya - by0) * eOut(uu); circle(ctx, bx, by, 12); ctx.fillStyle = PAL.bomb; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); star4(ctx, bx + 8, by - 12, 7); ctx.fillStyle = PAL.goal; ctx.fill(); }
    else if (cc >= 0.5 && cc < 3.0) {
      var e2 = cc - 0.5;
      if (e2 < 0.35) { var fl2 = 1 - e2 / 0.35; circle(ctx, bxa, bya, 30 + 60 * (1 - fl2)); ctx.fillStyle = 'rgba(255,170,60,' + (0.8 * fl2).toFixed(3) + ')'; ctx.fill(); }
      for (i = 0; i < 20; i++) { var a2 = i * TAU / 20 + 0.1, sp2 = 150 + hash(i, 5) * 70, r2 = eOut(clamp(e2 / 1.1, 0, 1)); ctx.save(); ctx.globalAlpha = clamp(1.6 - e2 / 1.5, 0, 1); matIcon(ctx, KINDS[i % 4], bxa + Math.cos(a2) * sp2 * r2, bya + Math.sin(a2) * sp2 * r2 + 55 * e2 * e2, 22); ctx.restore(); }
    }
    // 卷軸結算(t ≥ 9.9 展開; 10.4 起為可停留的結算畫面)
    var sa2 = seg(t, 9.9, 10.7);
    if (sa2 > 0) {
      var cx = 440, w = 520, y0 = 34, hFull = 236, hh = hFull * eOut(sa2), cnt = eOut(seg(t, 10.4, 11.4));
      ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2 - 20, y0, w + 40, hh + 2); ctx.clip();
      rr(ctx, cx - w / 2, y0 + 6, w, hFull, 4); ctx.fillStyle = K.parch; ctx.fill();
      ctx.fillStyle = 'rgba(120,90,40,0.10)'; ctx.fillRect(cx - w / 2, y0 + 6, 14, hFull); ctx.fillRect(cx + w / 2 - 14, y0 + 6, 14, hFull);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(60,40,20,0.5)'; rr(ctx, cx - w / 2, y0 + 6, w, hFull, 4); ctx.stroke();
      text(ctx, '通關時間', cx, y0 + 40, 17, K.inkDim, 'center', true);
      text(ctx, fmtTime(st.totalTime), cx, y0 + 84, 50, K.ink, 'center', true);
      ctx.fillStyle = 'rgba(60,40,20,0.3)'; ctx.fillRect(cx - w / 2 + 40, y0 + 118, w - 80, 1.5);
      text(ctx, '8 關全破', cx - 120, y0 + 142, 18, K.ink, 'center', true);
      text(ctx, '擊倒怪物 ' + grp(kills * cnt), cx + 100, y0 + 142, 18, K.ink, 'center', true);
      for (i = 0; i < 4; i++) { var mx = cx - 196 + i * 102; matIcon(ctx, KINDS[i], mx, y0 + 186, 22); text(ctx, grp(totals[KINDS[i]] * cnt), mx + 15, y0 + 187, 16, K.ink, 'left', true); }
      ctx.restore();
      [y0, y0 + 8 + hh].forEach(function (ry) {
        rr(ctx, cx - w / 2 - 18, ry - 9, w + 36, 18, 9); ctx.fillStyle = '#6b4426'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
        circle(ctx, cx - w / 2 - 18, ry, 9); ctx.fillStyle = K.select; ctx.fill(); ctx.stroke(); circle(ctx, cx + w / 2 + 18, ry, 9); ctx.fill(); ctx.stroke();
      });
    }
    if (t >= 10.4) {
      var ph = t < 14 ? t : nowS();
      ctx.save(); ctx.globalAlpha *= 0.775 + 0.225 * Math.cos(ph * TAU / 1.2);
      text(ctx, '按任意按鍵回到大地圖', 640, 660, 20, K.cream, 'center', true, 5, K.edge);
      ctx.restore();
    }
    var fi = 1 - seg(t, 0, 0.6);
    if (fi > 0) { ctx.fillStyle = 'rgba(255,250,235,' + fi.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  // ================= 匯出 =================
  var root = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  root.Art = {
    canvas: { width: W, height: H },
    palette: PAL,
    themes: THEMES,
    // 字典級小圖示(說明 / 方案頁要重用時呼叫這裡, 不要另抄一份)
    icons: {
      mat: function (ctx, kind, cx, cy, size) { ctx.save(); matIcon(ctx, kind, cx, cy, size); ctx.restore(); },
      item: function (ctx, type, cx, cy, size) { ctx.save(); itemIcon(ctx, type, cx, cy, size); ctx.restore(); },
      cls: function (ctx, cls, cx, cy, size) { ctx.save(); clsIcon(ctx, cls, cx, cy, size); ctx.restore(); },
      key: function (ctx, label, cx, cy, px, hot) { ctx.save(); var w = keycap(ctx, label, cx, cy, px, hot); ctx.restore(); return w; }
    },
    drawTitle: drawTitle,
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
    drawTelegraph: drawTelegraph,
    drawPickup: drawPickup,
    drawDropBit: drawDropBit,
    drawChest: drawChest,
    drawGoal: drawGoal,
    drawGoalPrompt: drawGoalPrompt,
    drawPlayer: drawPlayer,
    drawSkillRing: drawSkillRing,
    drawRangeRing: drawRangeRing,
    drawHpBar: drawHpBar,
    drawBoar: drawBoar,
    drawFrog: drawFrog,
    drawShooterBee: drawShooterBee,
    drawThorn: drawThorn,
    drawRam: drawRam,
    drawHawk: drawHawk,
    drawLizard: drawLizard,
    drawRockShot: drawRockShot,
    drawShieldman: drawShieldman,
    drawBeetle: drawBeetle,
    drawBat: drawBat,
    drawBroodmother: drawBroodmother,
    drawColossus: drawColossus,
    drawBossBeam: drawBossBeam,
    drawBossHpBar: drawBossHpBar,
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
    drawHud: drawHud,
    drawSoundIcon: drawSoundIcon,
    drawTutorial: drawTutorial,
    drawMapLink: drawMapLink,
    drawLevelCard: drawLevelCard,
    drawCardOverlay: drawCardOverlay,
    drawWorkshopCard: drawWorkshopCard,
    drawFlyingMaterial: drawFlyingMaterial,
    drawLevelPanel: drawLevelPanel,
    drawSiteHighlight: drawSiteHighlight,
    drawBackpackPanel: drawBackpackPanel,
    drawShopPanel: drawShopPanel,
    drawClassSelect: drawClassSelect,
    drawUpgradePage: drawUpgradePage,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEnding: drawEnding
  };
})();
