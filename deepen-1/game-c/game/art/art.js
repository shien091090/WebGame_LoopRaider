/* 捷徑工坊 art.js(deepen-1 / game-c)
 * 全域物件 window.Art, 只負責「給狀態就畫」, 不含遊戲邏輯。
 * 版面、色票、state 欄位見同資料夾 style.md。 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  var KINDS = ['wood', 'ench', 'time'];
  var TYPES = ['spring', 'wind', 'portal', 'lamp'];
  var CLS = ['sword', 'hunter', 'bomber'];
  var THEMES = ['plain', 'sky', 'rock', 'swamp', 'throne'];
  var POSES = ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'shoot', 'hook', 'throw', 'wave', 'hurt'];
  var ITEM_NAME = { spring: '彈跳台', wind: '疾風帶', portal: '傳送門', lamp: '收集燈' };
  var ITEM_FX = { spring: '踩上去彈到高處', wind: '在上面跑得更快', portal: '傳到下一座機關座', lamp: '靠近時吸來周圍素材' };
  var CLS_NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLS_GOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var KIND_USE = { wood: '開路', ench: '解封', time: '加速' };
  var HUD_ICON = { wood: [36, 20], ench: [256, 20], time: [476, 20] };

  var P = {
    bg: '#9fd0ee', bgLow: '#e2f2fa', hill: '#bfe0d2', hill2: '#cfe8e0',
    mapBg: '#141d2b', mapDot: '#223047',
    ink: '#161a24', text: '#f4f6fb', textDim: '#9aa6bb', bad: '#ff5d5d', good: '#7dff9a', warn: '#ffc845',
    panel: '#1c2536', panelHi: '#27344c', panelEdge: '#4a5a78', cellBg: '#222c40',
    wood: '#d98a3a', woodLight: '#f4bd72', woodDark: '#86501f',
    ench: '#5aaef0', enchLight: '#b0dbff', enchDark: '#22609a',
    time: '#c66cf0', timeLight: '#efc6ff', timeDark: '#6a2a92',
    mech: '#36e0a6', mechLight: '#b8ffe4', mechDark: '#137a5a', mechDeep: '#0d3b3a',
    sword: '#4c7dff', swordDark: '#2c50c4', hunter: '#3d9a3d', hunterDark: '#276a28', bomber: '#e8583a', bomberDark: '#a8331c',
    skin: '#ffdcb8', leg: '#2a3040',
    spike: '#eceef4', danger: '#e0303a',
    boar: '#8c5a3c', boarDark: '#5e3a24', shield: '#8e94a6', shieldPlate: '#d6dae6', bee: '#f5c52e', frog: '#9cc23a', frogDark: '#5f7d1e', enemyEye: '#ff2a2a',
    beeShot: '#ff4a2a', arrow: '#f6e7c4', bomb: '#262a34',
    explosion: '#ffb43a', shock: '#dff3ff', shockEdge: '#7cc4ff', poof: '#e4e4e4',
    hook: '#ffd34a', rope: '#8a6a44', chest: '#b5652a', chestLid: '#cf7a36', chestTrim: '#ffd34a', chestUsed: '#6b5f55',
    goal: '#ffffff', goalReached: '#ffd34a', crack: '#d6c8a6', crackLine: '#3a2c20',
    linkLit: '#ffd34a', linkDim: '#3c475a', select: '#ffffff'
  };

  var TH = {
    plain:  { top: '#62c24e', topDark: '#3f8f35', body: '#8a5a3a', mark: '#6e4529' },
    sky:    { top: '#f4f8ff', topDark: '#b3c4de', body: '#7f93b4', mark: '#64779a' },
    rock:   { top: '#e0a868', topDark: '#b07a42', body: '#9a4e34', mark: '#783822' },
    swamp:  { top: '#5d8a3e', topDark: '#3c6128', body: '#3e4636', mark: '#2b3226' },
    throne: { top: '#c83242', topDark: '#8e1e2c', body: '#5c4c70', mark: '#46395a' }
  };
  var CLS_COL = { sword: [P.sword, P.swordDark], hunter: [P.hunter, P.hunterDark], bomber: [P.bomber, P.bomberDark] };

  // ---------- 小工具 ----------
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function cnum(v, a, b, d) { return clamp(num(v, d), a, b); }
  function pos(v) { return cnum(v, -5000, 5000, 0); }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function st(s) { return (s && typeof s === 'object') ? s : {}; }
  function prog(t, dur) { dur = num(dur, 0); if (!(dur > 0)) return 1; return clamp(num(t, dur) / dur, 0, 1); }
  function fmt1(v) { return cnum(v, -99999, 99999, 0).toFixed(1); }
  function int(v) { return Math.round(cnum(v, -9999999, 9999999, 0)); }
  function mats(o) { o = st(o); return { wood: num(o.wood, 0), ench: num(o.ench, 0), time: num(o.time, 0) }; }
  function font(size, bold) { return (bold ? 'bold ' : '') + size + 'px ' + FONT; }
  function nowS() { return ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000; }
  function str(v, d) { return (typeof v === 'string' || typeof v === 'number') ? String(v).slice(0, 24) : d; }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); }
  function txt(ctx, s, x, y, size, color, o) {
    o = o || {};
    ctx.font = font(size, o.bold);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.sw || Math.max(2, size / 5); ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, size, bold) {
    ctx.font = font(size, bold);
    var m = ctx.measureText ? ctx.measureText(String(s)) : null;
    return (m && isFinite(m.width) && m.width > 0) ? m.width : String(s).length * size * 0.62;
  }
  function panel(ctx, x, y, w, h, o) {
    o = o || {};
    rr(ctx, x, y, w, h, o.r || 12);
    ctx.fillStyle = o.fill || P.panel; ctx.fill();
    ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.edge || P.panelEdge; ctx.stroke();
  }
  function dim(ctx, a) { ctx.fillStyle = 'rgba(6,10,18,' + a + ')'; ctx.fillRect(0, 0, W, H); }
  // 鍵帽: 中心 (x,y), 回傳寬度
  function keycap(ctx, label, x, y, size) {
    size = size || 14;
    var w = keyW(ctx, label, size), h = size * 1.7;
    rr(ctx, x - w / 2, y - h / 2, w, h, size * 0.35);
    ctx.fillStyle = '#eef2f8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
    rr(ctx, x - w / 2 + 2, y + h / 2 - 5, w - 4, 3, 1.5); ctx.fillStyle = '#b9c2d2'; ctx.fill();
    txt(ctx, label, x, y - 1, size, P.ink, { bold: true, align: 'center' });
    return w;
  }
  // 鍵帽 + 動作字, 左緣 x
  function keyW(ctx, key, size) { return Math.max(size * 1.7, tw(ctx, key, size, true) + size * 0.9); }
  function hintW(ctx, key, label, size) { return keyW(ctx, key, size) + 6 + tw(ctx, label, size + 1, true); }
  function keyHint(ctx, key, label, x, y, size, color) {
    var kw = keyW(ctx, key, size);
    keycap(ctx, key, x + kw / 2, y, size);
    txt(ctx, label, x + kw + 6, y, size + 1, color || P.text, { bold: true });
    return kw + 6 + tw(ctx, label, size + 1, true);
  }

  // ---------- 共用圖示 ----------
  // 素材圖示(地上、資訊列、飛行、卡片、面板共用): s = 外徑約 s
  function matIcon(ctx, kind, x, y, s) {
    kind = pick(kind, KINDS, 'wood');
    var k = s / 21;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = P.ink;
    if (kind === 'wood') {
      rr(ctx, -9.5, -5.5, 16, 11, 4); ctx.fillStyle = P.wood; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(2, -2); ctx.moveTo(-4, 2); ctx.lineTo(3, 2);
      ctx.strokeStyle = P.woodDark; ctx.lineWidth = 1.2; ctx.stroke();
      ell(ctx, 6.5, 0, 3.4, 5.5); ctx.fillStyle = P.woodLight; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6; ctx.stroke();
      ell(ctx, 6.5, 0, 1.3, 2.4); ctx.strokeStyle = P.woodDark; ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'ench') {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        var pts = [[a - 0.38, 6.8], [a - 0.2, 9.6], [a + 0.2, 9.6], [a + 0.38, 6.8]];
        for (var j = 0; j < 4; j++) {
          var px = Math.cos(pts[j][0]) * pts[j][1], py = Math.sin(pts[j][0]) * pts[j][1];
          if (i === 0 && j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }
      ctx.closePath(); ctx.fillStyle = P.ench; ctx.fill(); ctx.stroke();
      circle(ctx, 0, 0, 3); ctx.fillStyle = P.enchDark; ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7.5, -2.5); ctx.lineTo(0, 10); ctx.lineTo(-7.5, -2.5); ctx.closePath();
      ctx.fillStyle = P.time; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7.5, -2.5); ctx.lineTo(-7.5, -2.5); ctx.closePath();
      ctx.fillStyle = P.timeLight; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // 彈跳台本體: 局部座標框 40x24, 底邊在 +12; padTop = 台面上緣 y(閒置 -10)
  function springShape(ctx, x, y, sc, padTop) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.lineJoin = 'round';
    rr(ctx, -18, 6, 36, 5.2, 2); ctx.fillStyle = '#3a4252'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke();
    var bottom = 6, topY = padTop + 6, n = 3;
    ctx.strokeStyle = P.mechDark; ctx.lineWidth = 3;
    for (var i = 0; i < n; i++) {
      var cy = bottom - (bottom - topY) * (i + 0.5) / n;
      ell(ctx, 0, cy, 11, Math.max(1, Math.min(3, (bottom - topY) / n / 2))); ctx.stroke();
    }
    rr(ctx, -19, padTop, 38, 6, 3); ctx.fillStyle = P.mech; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke();
    rr(ctx, -14, padTop + 1.5, 28, 1.6, 0.8); ctx.fillStyle = P.mechLight; ctx.fill();
    ctx.restore();
  }
  // 傳送門: 局部框 40x80
  function portalShape(ctx, x, y, sc, t, flash) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ell(ctx, 0, 0, 17, 37); ctx.fillStyle = P.mechDeep; ctx.fill();
    ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var a0 = t * 3 + i * 2.1;
      ctx.beginPath(); ctx.ellipse(0, 0, 13 - i * 4, 31 - i * 9, 0, a0, a0 + Math.PI * 1.1);
      ctx.strokeStyle = i === 0 ? P.mech : P.mechLight; ctx.globalAlpha = 0.85 - i * 0.2; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (flash > 0) { ell(ctx, 0, 0, 17, 37); ctx.fillStyle = 'rgba(255,255,255,' + flash + ')'; ctx.fill(); }
    ell(ctx, 0, 0, 17, 37); ctx.strokeStyle = P.mech; ctx.lineWidth = 4; ctx.stroke();
    ell(ctx, 0, 0, 19.2, 39.2); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }
  // 收集燈燈身: 局部框 24x48
  function lampBody(ctx, x, y, sc, lit) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.lineJoin = 'round'; ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5;
    rr(ctx, -9, -23, 18, 6, 3); ctx.fillStyle = '#3a4252'; ctx.fill(); ctx.stroke();
    rr(ctx, -8.5, -17, 17, 31, 6); ctx.fillStyle = lit ? '#fff6c4' : '#5fbf9e'; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = lit ? P.mech : P.mechDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, 14); ctx.stroke();
    if (lit) { ell(ctx, 0, -2, 4.5, 8); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    else { ell(ctx, -3, -6, 1.8, 5); ctx.fillStyle = P.mechLight; ctx.fill(); }
    rr(ctx, -11, 14, 22, 9, 3); ctx.fillStyle = '#3a4252'; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.stroke();
    rr(ctx, -9, 16, 18, 2.5, 1.2); ctx.fillStyle = P.mech; ctx.fill();
    ctx.restore();
  }
  // 疾風帶縮小版(圖示用): 局部框約 28x22
  function windGlyph(ctx, x, y, sc) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    rr(ctx, -14, 4, 28, 8, 4); ctx.fillStyle = 'rgba(54,224,166,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.mechDark; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.mech; ctx.lineWidth = 3;
    for (var j = 0; j < 3; j++) {
      var cx = -8 + j * 8;
      ctx.beginPath(); ctx.moveTo(cx - 3, -9); ctx.lineTo(cx + 2, -4); ctx.lineTo(cx - 3, 1); ctx.stroke();
    }
    ctx.restore();
  }
  // 機關圖示(無底): 外徑約 s
  function itemGlyph(ctx, type, x, y, s) {
    type = pick(type, TYPES, 'spring');
    var k = s / 32;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    if (type === 'spring') springShape(ctx, 0, 2, 0.68, -10);
    else if (type === 'wind') windGlyph(ctx, 0, 0, 1);
    else if (type === 'portal') portalShape(ctx, 0, 0, 0.36, 0.6, 0);
    else lampBody(ctx, 0, 0, 0.58, false);
    ctx.restore();
  }
  // 機關圖示(含底): 32x32 at center
  function itemIconBox(ctx, type, x, y, s) {
    var k = (s || 32) / 32;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    rr(ctx, -15, -15, 30, 30, 7); ctx.fillStyle = '#13212a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.mech; ctx.stroke();
    itemGlyph(ctx, type, 0, 0, 26);
    ctx.restore();
  }
  // 職業頭像: 外徑約 s
  function clsIcon(ctx, cls, x, y, s, mono) {
    cls = pick(cls, CLS, 'sword');
    var k = s / 24, col = mono ? ['#7a8194', '#5a6072'] : CLS_COL[cls];
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round';
    circle(ctx, 0, 0, 11); ctx.fillStyle = col[0]; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke();
    circle(ctx, 0, 2, 6.5); ctx.fillStyle = mono ? '#a8adb8' : P.skin; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 1.5, 7.5, Math.PI, 0); ctx.closePath(); ctx.fillStyle = col[1]; ctx.fill();
    if (cls === 'sword') {
      ctx.strokeStyle = mono ? '#d0d4dc' : '#e6ecf5'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(3, 8); ctx.lineTo(9, -6); ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.strokeStyle = mono ? '#c0c4cc' : '#c89a5a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(2, 2, 7, -1.2, 1.2); ctx.stroke();
    } else {
      circle(ctx, 6, 6, 3.6); ctx.fillStyle = P.bomb; ctx.fill();
      circle(ctx, 8.4, 2.6, 1.4); ctx.fillStyle = mono ? '#cccccc' : P.warn; ctx.fill();
    }
    circle(ctx, 2.5, 2, 1.2); ctx.fillStyle = P.ink; ctx.fill();
    ctx.restore();
  }
  function lockIcon(ctx, x, y, s, color) {
    var k = s / 24;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, 0); ctx.lineWidth = 3; ctx.strokeStyle = color || '#9aa3b5'; ctx.stroke();
    rr(ctx, -9, -3, 18, 14, 3); ctx.fillStyle = color || '#9aa3b5'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke();
    circle(ctx, 0, 3, 2); ctx.fillStyle = P.ink; ctx.fill();
    ctx.restore();
  }
  function heart(ctx, x, y, s, full) {
    var k = s / 20;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-11, 0, -9, -10, 0, -4.5);
    ctx.bezierCurveTo(9, -10, 11, 0, 0, 8); ctx.closePath();
    ctx.fillStyle = full ? '#ff4d5e' : '#2a3142'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = full ? P.ink : '#56607a'; ctx.stroke();
    ctx.restore();
  }
  // 圓頭箭頭(說明頁用)
  function roundArrow(ctx, x1, y1, x2, y2, col) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = col || '#ffffff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2 - Math.cos(a - 0.6) * 12, y2 - Math.sin(a - 0.6) * 12); ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a + 0.6) * 12, y2 - Math.sin(a + 0.6) * 12); ctx.stroke();
    ctx.restore();
  }
  // 素材組一列: 圖示 + 數字, 回傳寬
  function matRow(ctx, m, x, y, size, opts) {
    opts = opts || {};
    var cx = x, gap = opts.gap || size * 3.6;
    for (var i = 0; i < 3; i++) {
      var k = KINDS[i], v = m[k];
      if (opts.skipZero && !(v > 0)) continue;
      matIcon(ctx, k, cx + size * 0.5, y, size);
      var label = opts.fixed ? fmt1(v) : String(int(v));
      if (opts.suffix) label += opts.suffix;
      var col = opts.colorOf ? opts.colorOf(k) : P.text;
      txt(ctx, label, cx + size * 1.15, y, opts.font || 13, col, { bold: !!opts.bold });
      cx += opts.skipZero ? size * 1.3 + tw(ctx, label, opts.font || 13, !!opts.bold) + 8 : gap;
    }
    return cx - x;
  }

  // ---------- 怪物共用 ----------
  function enemyBegin(ctx, s, w, h) {
    var x = pos(s.x), y = pos(s.y), f = num(s.facing, 1) < 0 ? -1 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    return { hit: s.hit === true, t: cnum(s.t, 0, 1e6, 0) };
  }
  // 擊飛: 約定飛出方向 = −facing(怪物面朝炸彈工、往背後被打飛)。
  // 速度線畫在飛行反方向 = 面向側(框外至多 40px), 身體往面向側傾(背先飛出去)
  function flungBegin(ctx, hw) {
    ctx.save(); ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var yy = -8 + i * 8, len = 34 - Math.abs(i - 1) * 8;
      ctx.beginPath(); ctx.moveTo(hw + 3, yy); ctx.lineTo(hw + 3 + len, yy);
      ctx.strokeStyle = 'rgba(22,26,36,0.55)'; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
    ctx.rotate(0.38); ctx.scale(0.8, 0.8);
  }
  function C(hit, c) { return hit ? '#ffffff' : c; }
  function dizzyEye(ctx, x, y, r) {
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
  }

  // ---------- 玩家 ----------
  function playerSprite(ctx, s) {
    var x = pos(s.x), y = pos(s.y), cls = pick(s.cls, CLS, 'sword');
    var f = num(s.facing, 1) < 0 ? -1 : 1, pose = pick(s.pose, POSES, 'idle'), pt = cnum(s.poseT, 0, 1e4, 0);
    var col = CLS_COL[cls];
    var baseA = (s.invuln === true && Math.floor(nowS() * 12) % 2 === 0) ? 0.35 : 1;
    ctx.save();
    ctx.globalAlpha = baseA;
    ctx.translate(x, y); ctx.scale(f, 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // 身後特效
    if (s.windBoost === true) { // 疾風: 薄荷色波浪弧線, 身後至多 40px
      ctx.strokeStyle = P.mech; ctx.lineWidth = 3;
      for (var i = 0; i < 2; i++) {
        var yy = -8 + i * 14, ph = (nowS() * 8 + i) % 1;
        ctx.globalAlpha = 0.9 * baseA;
        ctx.beginPath(); ctx.moveTo(-16, yy);
        ctx.quadraticCurveTo(-26, yy - 6 + ph * 2, -36, yy); ctx.quadraticCurveTo(-46, yy + 6 - ph * 2, -52, yy);
        ctx.stroke();
      }
      ctx.globalAlpha = baseA;
    }
    if (pose === 'dash') { // 衝刺斬: 白色直線, 身後至多 60px
      for (var j = 0; j < 3; j++) {
        var y2 = -12 + j * 12, len = 56 - (j === 1 ? 0 : 14);
        ctx.beginPath(); ctx.moveTo(-15, y2); ctx.lineTo(-15 - len, y2);
        ctx.strokeStyle = 'rgba(22,26,36,0.5)'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
      }
    }
    if (pose === 'slash' && pt < 0.15) { // 刀光: 面向側框外 50x40
      var a = 1 - pt / 0.15;
      ctx.save(); ctx.globalAlpha *= 0.4 + 0.6 * a;
      ctx.beginPath();
      ctx.ellipse(14, 0, 49, 19, 0, -Math.PI / 2, Math.PI / 2);
      ctx.ellipse(14, 0, 28, 11, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = '#e8f4ff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col[0]; ctx.stroke();
      ctx.restore();
    }

    // 身體姿勢參數
    var hx = 0, hy = -12.5, bodyDy = 0, legA = 0, legB = 0, legLen = 10, legSpread = 0;
    if (pose === 'run') { var sw = Math.sin(pt * 16) * 3; legA = sw; legB = -sw; }
    if (pose === 'rise') { legLen = 7; }
    if (pose === 'fall') { legSpread = 2; }
    if (pose === 'dash' || pose === 'slash' || pose === 'throw') hx = 3;
    if (pose === 'hurt') hx = -3;
    if (pose === 'wave') { bodyDy = 2; legSpread = 3; legLen = 8; }

    // 腿
    ctx.fillStyle = P.leg;
    rr(ctx, -7 + legA - legSpread, 12 + bodyDy, 6, legLen, 2); ctx.fill();
    rr(ctx, 1 + legB + legSpread, 12 + bodyDy, 6, legLen, 2); ctx.fill();
    // 身體
    rr(ctx, -10 + hx * 0.3, -4 + bodyDy, 20, 17, 5);
    ctx.fillStyle = pose === 'hurt' ? '#ff8080' : col[0]; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    // 手臂 / 武器
    var sx = 3 + hx * 0.3, sy = -1 + bodyDy;
    function arm(ex, ey) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.strokeStyle = P.skin; ctx.lineWidth = 3.2; ctx.stroke(); }
    if (cls === 'sword') {
      var bx1 = 8, by1 = 6, bx2 = 12, by2 = 18;
      if (pose === 'slash' || pose === 'dash') { bx1 = 6; by1 = 1; bx2 = 11.8; by2 = 1; }
      else if (pose === 'rise' || pose === 'hook') { bx1 = 7; by1 = -2; bx2 = 12; by2 = -15; }
      arm(bx1, by1);
      ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = '#e6ecf5'; ctx.lineWidth = 2.4; ctx.stroke();
    } else if (cls === 'hunter') {
      var bowX = pose === 'shoot' ? 4.5 : 3;
      arm(bowX + 5, 2 + bodyDy);
      ctx.beginPath(); ctx.arc(bowX, 2 + bodyDy, 8.5, -1.15, 1.15); ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bowX + Math.cos(-1.15) * 8.5, 2 + bodyDy + Math.sin(-1.15) * 8.5);
      ctx.lineTo(pose === 'shoot' ? bowX - 1 : bowX + 3, 2 + bodyDy);
      ctx.lineTo(bowX + Math.cos(1.15) * 8.5, 2 + bodyDy + Math.sin(1.15) * 8.5);
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1; ctx.stroke();
      if (pose === 'hook') arm(9, -15);
    } else {
      if (pose === 'throw') arm(11, -12);
      else if (pose === 'wave') { arm(12, -4); ctx.beginPath(); ctx.moveTo(-sx, sy); ctx.lineTo(-12, -4); ctx.strokeStyle = P.skin; ctx.lineWidth = 3.2; ctx.stroke(); }
      else {
        arm(9, 5 + bodyDy);
        circle(ctx, 9.5, 6 + bodyDy, 4); ctx.fillStyle = P.bomb; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        circle(ctx, 11.5, 1.5 + bodyDy, 1.4); ctx.fillStyle = P.warn; ctx.fill();
      }
      if (pose === 'hook') arm(9, -15);
    }
    if (cls !== 'sword' && pose === 'hook' && cls === 'bomber') { /* 炸彈工無抓鉤, 照畫手臂即可 */ }
    // 頭
    var hy2 = hy + bodyDy;
    circle(ctx, hx, hy2, 8.5); ctx.fillStyle = P.skin; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy2 - 0.5, 8.6, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = col[1]; ctx.fill();
    if (cls === 'bomber') { // 護目鏡
      ctx.fillStyle = '#3a2a22'; ctx.fillRect(hx - 8, hy2 - 2.5, 16, 3);
      circle(ctx, hx + 4, hy2 - 1, 2.8); ctx.fillStyle = '#bfe8ff'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.ink; ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.moveTo(hx - 8.5, hy2 - 1); ctx.quadraticCurveTo(hx - 12, hy2 + 4, hx - 9, hy2 + 7);
      ctx.strokeStyle = col[1]; ctx.lineWidth = 3; ctx.stroke();
    } else {
      ctx.fillStyle = '#e6ecf5'; ctx.fillRect(hx - 1, hy2 - 9, 2, 5);
    }
    if (pose === 'hurt') dizzyEye(ctx, hx + 4, hy2 + 1, 2);
    else if (cls !== 'bomber') { circle(ctx, hx + 4, hy2 + 0.5, 1.6); ctx.fillStyle = P.ink; ctx.fill(); }
    ctx.restore();
  }

  // ---------- 卡片內共用: 背包格 ----------
  function bagCell(ctx, x, y, item, sel) {
    if (!item || typeof item !== 'object') {
      rr(ctx, x, y, 74, 74, 8); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#3c4a63'; ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    rr(ctx, x, y, 74, 74, 8); ctx.fillStyle = '#25324a'; ctx.fill(); ctx.lineWidth = sel ? 3 : 1.5; ctx.strokeStyle = sel ? P.mech : '#56688a'; ctx.stroke();
    itemIconBox(ctx, item.type, x + 37, y + 30, 36);
    var w = item.where, label = '未裝', col = P.textDim;
    if (w && typeof w === 'object' && num(w.level, 0) >= 1) {
      label = '第' + cnum(w.level, 1, 8, 1) + '關 ' + cnum(w.slot, 1, 4, 1) + '號'; col = P.text;
    }
    txt(ctx, label, x + 37, y + 62, 12, col, { align: 'center', bold: col === P.text });
  }

  // ---------- 凱旋門圖 ----------
  function archShape(ctx, x, y, sc, lit) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-34, 26); ctx.lineTo(-34, -18); ctx.lineTo(34, -18); ctx.lineTo(34, 26); ctx.lineTo(14, 26); ctx.lineTo(14, 4);
    ctx.arc(0, 4, 14, 0, Math.PI, true); ctx.lineTo(-14, 26); ctx.closePath();
    ctx.fillStyle = lit ? '#f2d27a' : '#a99f8a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
    rr(ctx, -38, -26, 76, 9, 3); ctx.fillStyle = lit ? '#ffe29a' : '#bdb4a0'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(22,26,36,0.35)'; ctx.fillRect(-28, -12, 8, 30); ctx.fillRect(20, -12, 8, 30);
    ctx.restore();
  }

  // ---------- 說明頁 ----------
  var GUIDE_SIZE = [[480, 270], [600, 220], [480, 300], [560, 240], [600, 200]];
  function groundRow(ctx, x0, x1, topY, theme) {
    for (var gx = x0; gx < x1; gx += 40) {
      Art.drawGround(ctx, { x: gx + 20, y: topY + 20, top: true, theme: theme });
      Art.drawGround(ctx, { x: gx + 20, y: topY + 60, top: false, theme: theme });
    }
  }
  function skyRect(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, P.bg); g.addColorStop(1, P.bgLow);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  function label(ctx, s, x, y, size) {
    txt(ctx, s, x, y, size || 16, '#ffffff', { bold: true, align: 'center', stroke: P.ink, sw: 4 });
  }
  var guidePages = [
    function (ctx) { // 1 衝到終點
      ctx.save(); rr(ctx, 0, 0, 480, 270, 10); ctx.clip();
      ctx.scale(0.75, 0.75); // 世界 640x360
      skyRect(ctx, 0, 0, 640, 360);
      groundRow(ctx, 0, 640, 280, 'plain');
      Art.drawPickup(ctx, { x: 175, y: 262, kind: 'wood', t: 0 });
      Art.drawBoar(ctx, { x: 290, y: 264, facing: -1, state: 'walk', hit: false, t: 0 });
      Art.drawChest(ctx, { x: 420, y: 262, open: false });
      Art.drawPickup(ctx, { x: 500, y: 262, kind: 'wood', t: 0.5 });
      Art.drawGoal(ctx, { x: 590, y: 240, reached: false });
      Art.drawPlayer(ctx, { x: 62, y: 258, cls: 'sword', facing: 1, pose: 'idle', poseT: 0 });
      // 路線虛線箭頭
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(84, 240); ctx.lineTo(175, 240);
      ctx.quadraticCurveTo(290, 150, 400, 236); ctx.lineTo(500, 238); ctx.lineTo(560, 238);
      ctx.setLineDash([12, 9]); ctx.strokeStyle = 'rgba(22,26,36,0.6)'; ctx.lineWidth = 8; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(552, 228); ctx.lineTo(566, 238); ctx.lineTo(552, 248);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
      label(ctx, '你', 62, 196, 22);
      label(ctx, '終點旗', 590, 172, 20);
      ctx.restore();
    },
    function (ctx) { // 2 操作
      for (var i = 0; i < 4; i++) {
        ctx.save(); ctx.translate(i * 150, 0);
        rr(ctx, 4, 0, 142, 220, 10); ctx.save(); ctx.clip();
        ctx.scale(1.2, 1.2); // 世界 125x183
        skyRect(ctx, 0, 0, 125, 184);
        groundRow(ctx, 0, 125, 150, 'plain');
        if (i === 0) {
          Art.drawPlayer(ctx, { x: 50, y: 128, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1 });
          ctx.restore(); ctx.save(); ctx.scale(1.2, 1.2);
          keycap(ctx, '←', 34, 78, 14); keycap(ctx, '→', 66, 78, 14);
        } else if (i === 1) {
          ctx.save(); ctx.setLineDash([3, 5]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(22,26,36,0.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(30, 148); ctx.quadraticCurveTo(44, 70, 56, 100); ctx.stroke(); ctx.restore();
          Art.drawPlayer(ctx, { x: 58, y: 70, cls: 'sword', facing: 1, pose: 'rise', poseT: 0.1 });
          ctx.restore(); ctx.save(); ctx.scale(1.2, 1.2);
          keycap(ctx, '空白鍵', 82, 124, 13);
        } else if (i === 2) {
          Art.drawPlayer(ctx, { x: 32, y: 128, cls: 'sword', facing: 1, pose: 'slash', poseT: 0.04 });
          ctx.restore(); ctx.save(); ctx.scale(1.2, 1.2);
          keycap(ctx, 'Z', 32, 80, 14);
        } else {
          Art.drawPoof(ctx, { x: 36, y: 134, t: 0.1, dur: 0.3 });
          Art.drawPlayer(ctx, { x: 86, y: 128, cls: 'sword', facing: 1, pose: 'dash', poseT: 0.05 });
          ctx.restore(); ctx.save(); ctx.scale(1.2, 1.2);
          keycap(ctx, 'X', 86, 80, 14);
        }
        ctx.restore();
        ctx.restore();
      }
    },
    function (ctx) { // 3 過關後一直重播
      // 資訊列片段
      rr(ctx, 0, 0, 200, 40, 8); ctx.fillStyle = 'rgba(14,20,32,0.9)'; ctx.fill();
      matIcon(ctx, 'wood', 24, 20, 22);
      txt(ctx, '12', 44, 20, 18, P.textDim, { bold: true });
      roundArrow(ctx, 74, 20, 98, 20, P.textDim);
      txt(ctx, '13', 108, 20, 22, '#ffffff', { bold: true });
      // 卡片(放大 1.2)
      ctx.save(); ctx.translate(250, 120); ctx.scale(1.2, 1.2);
      Art.drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '草原', state: 'cleared', cost: { wood: 0, ench: 0, time: 0 }, canAfford: true,
        rates: { wood: 10.0, ench: 3.8, time: 2.5 }, recordCls: 'sword', recordTime: 12.6 });
      ctx.save(); ctx.translate(8, 8); rr(ctx, 0, 0, 160, 90, 2); ctx.clip(); ctx.scale(0.5, 0.5); // 局部放大, 非實際比例
      skyRect(ctx, 0, 0, 320, 180);
      groundRow(ctx, 0, 320, 140, 'plain');
      Art.drawPlayer(ctx, { x: 120, y: 118, cls: 'sword', facing: 1, pose: 'run', poseT: 0.2 });
      Art.drawPickup(ctx, { x: 146, y: 116, kind: 'wood', t: 0 });
      Art.drawGoal(ctx, { x: 290, y: 100, reached: false });
      ctx.restore();
      Art.drawCardOverlay(ctx, { x: 0, y: 0, accelLv: 0, pending: false, selected: false });
      ctx.restore();
      // 飛行弧線: 縮圖撿到處 (250+ (8+73)*1.2, 120+(8+58)*1.2) → 資訊列木材 (24,20)
      var sx = 250 + 81 * 1.2, sy = 120 + 66 * 1.2;
      ctx.save(); ctx.setLineDash([6, 7]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(244,189,114,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(150, 30, 34, 30); ctx.stroke(); ctx.restore();
      // 弧上 t=0.55 的位置
      var q = 0.55, mx = (1 - q) * (1 - q) * sx + 2 * (1 - q) * q * 150 + q * q * 34, my = (1 - q) * (1 - q) * sy + 2 * (1 - q) * q * 30 + q * q * 30;
      Art.drawFlyingMaterial(ctx, { x: mx, y: my, kind: 'wood', t: 0.38, dur: 0.7 });
    },
    function (ctx) { // 4 撿多還是跑快
      for (var side = 0; side < 2; side++) {
        ctx.save(); ctx.translate(side * 290, 0);
        rr(ctx, 0, 0, 270, 170, 10); ctx.save(); ctx.clip(); ctx.scale(0.5, 0.5); // 世界 540x340
        skyRect(ctx, 0, 0, 540, 340);
        groundRow(ctx, 0, 540, 300, 'plain');
        Art.drawGround(ctx, { x: 140, y: 280, top: true, theme: 'plain' });
        Art.drawGround(ctx, { x: 180, y: 240, top: true, theme: 'plain' });
        Art.drawGround(ctx, { x: 180, y: 280, top: false, theme: 'plain' });
        for (var px = 220; px <= 340; px += 40) Art.drawGround(ctx, { x: px, y: 160, top: true, theme: 'plain' });
        var picked = side === 0;
        if (!picked) {
          Art.drawPickup(ctx, { x: 230, y: 126, kind: 'wood', t: 0 });
          Art.drawPickup(ctx, { x: 270, y: 126, kind: 'ench', t: 0 });
          Art.drawPickup(ctx, { x: 310, y: 126, kind: 'time', t: 0 });
          Art.drawFrog(ctx, { x: 340, y: 126, facing: -1, state: 'crouch', hit: false });
        } else {
          Art.drawPoof(ctx, { x: 340, y: 120, t: 0.12, dur: 0.3 });
        }
        Art.drawGoal(ctx, { x: 500, y: 260, reached: false });
        var pts = picked
          ? [{ x: 40, y: 278 }, { x: 110, y: 278 }, { x: 140, y: 238 }, { x: 180, y: 198 }, { x: 230, y: 118 }, { x: 330, y: 118 }, { x: 380, y: 200 }, { x: 420, y: 278 }, { x: 476, y: 278 }]
          : [{ x: 40, y: 278 }, { x: 476, y: 278 }];
        Art.drawRoutePath(ctx, { points: pts, cls: 'sword' });
        if (picked) { matIcon(ctx, 'wood', 230, 90, 22); matIcon(ctx, 'ench', 270, 90, 22); matIcon(ctx, 'time', 310, 90, 22); }
        Art.drawPlayer(ctx, { x: 40, y: 278, cls: 'sword', facing: 1, pose: 'idle', poseT: 0 });
        ctx.restore();
        ctx.restore();
        label(ctx, side === 0 ? '素材多 / 秒數長' : '素材少 / 秒數短', side * 290 + 135, 205, 18);
      }
    },
    function (ctx) { // 5 寶箱裡的機關
      // 格 1: 打開的寶箱 + 浮著彈跳台圖示
      ctx.save(); rr(ctx, 0, 0, 170, 200, 10); ctx.clip();
      skyRect(ctx, 0, 0, 170, 200); groundRow(ctx, 0, 170, 170, 'plain');
      Art.drawChest(ctx, { x: 85, y: 152, open: true });
      var g = ctx.createRadialGradient(85, 92, 4, 85, 92, 34); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(45, 52, 80, 80);
      Art.drawItemIcon(ctx, { x: 85, y: 92, type: 'spring' });
      ctx.restore();
      roundArrow(ctx, 180, 100, 206, 100);
      // 格 2: 背包格
      ctx.save(); rr(ctx, 215, 0, 170, 200, 10); ctx.fillStyle = P.panel; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.panelEdge; ctx.stroke();
      txt(ctx, '背包', 300, 40, 16, P.textDim, { bold: true, align: 'center' });
      bagCell(ctx, 263, 66, { type: 'spring', where: { level: 1, slot: 1 } }, true);
      ctx.restore();
      roundArrow(ctx, 395, 100, 421, 100);
      // 格 3: 1 號座 + 彈跳台(壓扁) + 劍士彈起 + 上方平台
      ctx.save(); rr(ctx, 430, 0, 170, 200, 10); ctx.clip();
      skyRect(ctx, 430, 0, 170, 200); groundRow(ctx, 430, 600, 170, 'plain');
      Art.drawGround(ctx, { x: 490, y: 20, top: true, theme: 'plain' });
      Art.drawGround(ctx, { x: 530, y: 20, top: true, theme: 'plain' });
      Art.drawGround(ctx, { x: 570, y: 20, top: true, theme: 'plain' });
      Art.drawSocket(ctx, { x: 500, y: 164, sealed: false });
      Art.drawSpringPad(ctx, { x: 500, y: 158, bounceT: 0.06, bounceDur: 0.25 });
      Art.drawPlayer(ctx, { x: 500, y: 92, cls: 'sword', facing: 1, pose: 'rise', poseT: 0.05 });
      label(ctx, '1號座', 560, 150, 14);
      ctx.restore();
    }
  ];

  // ======================================================================
  var Art = {
    canvas: { width: W, height: H },
    palette: P,

    drawBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.bg); g.addColorStop(1, P.bgLow);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = P.hill2;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 560 - Math.sin(x / 170) * 40 - Math.sin(x / 61) * 12);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = P.hill;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x2 = 0; x2 <= W; x2 += 80) ctx.lineTo(x2, 620 - Math.sin(x2 / 120 + 1) * 30);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    drawMapBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#18233a'); g.addColorStop(1, P.mapBg);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = P.mapDot;
      for (var y = 60; y < H; y += 40) for (var x = 20; x < W; x += 40) ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.restore();
    },

    drawGround: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), theme = pick(s.theme, THEMES, 'plain'), th = TH[theme];
      ctx.save();
      ctx.fillStyle = th.body; ctx.fillRect(x - 20, y - 20, 40, 40);
      ctx.fillStyle = th.mark; ctx.strokeStyle = th.mark; ctx.lineWidth = 2;
      if (theme === 'plain') { circle(ctx, x - 8, y + 6, 2.5); ctx.fill(); circle(ctx, x + 9, y - 3, 2); ctx.fill(); }
      else if (theme === 'sky') { ctx.beginPath(); ctx.moveTo(x - 14, y + 4); ctx.lineTo(x + 6, y + 4); ctx.moveTo(x - 4, y + 13); ctx.lineTo(x + 14, y + 13); ctx.stroke(); }
      else if (theme === 'rock') { ctx.beginPath(); ctx.moveTo(x - 19, y + 2); ctx.lineTo(x + 19, y - 7.5); ctx.moveTo(x - 19, y + 16); ctx.lineTo(x + 19, y + 6.5); ctx.stroke(); }
      else if (theme === 'swamp') { circle(ctx, x - 6, y + 5, 3); ctx.stroke(); circle(ctx, x + 8, y + 12, 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(x - 19, y); ctx.lineTo(x + 19, y); ctx.moveTo(x, y - 19); ctx.lineTo(x, y); ctx.moveTo(x - 10, y); ctx.lineTo(x - 10, y + 19); ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, y + 19); ctx.stroke(); }
      if (s.top === true) {
        ctx.fillStyle = th.top; ctx.fillRect(x - 20, y - 20, 40, 9);
        ctx.fillStyle = th.topDark; ctx.fillRect(x - 20, y - 11, 40, 3);
      }
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y);
      ctx.save(); ctx.lineJoin = 'round';
      rr(ctx, x - 20, y + 14, 40, 6, 2); ctx.fillStyle = P.danger; ctx.fill();
      for (var i = 0; i < 4; i++) {
        var bx = x - 20 + i * 10;
        ctx.beginPath(); ctx.moveTo(bx + 0.8, y + 15); ctx.lineTo(bx + 5, y + 1.5); ctx.lineTo(bx + 9.2, y + 15); ctx.closePath();
        ctx.fillStyle = P.spike; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke();
      }
      ctx.restore();
    },

    drawCrackWall: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), hp = Math.round(cnum(s.hp, 1, 3, 3));
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      rr(ctx, x - 19, y - 19, 38, 38, 4); ctx.fillStyle = P.crack; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - 16, y - 16, 32, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x - 16, y + 13, 32, 3);
      ctx.strokeStyle = P.crackLine; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x - 4, y - 18); ctx.lineTo(x - 1, y - 8); ctx.lineTo(x - 6, y); ctx.lineTo(x - 2, y + 6); ctx.stroke();
      if (hp <= 2) { ctx.beginPath(); ctx.moveTo(x + 18, y - 6); ctx.lineTo(x + 8, y - 2); ctx.lineTo(x + 4, y + 8); ctx.lineTo(x + 8, y + 18); ctx.moveTo(x - 1, y - 8); ctx.lineTo(x + 8, y - 2); ctx.stroke(); }
      if (hp <= 1) {
        ctx.beginPath(); ctx.moveTo(x - 18, y + 4); ctx.lineTo(x - 6, y); ctx.moveTo(x - 2, y + 6); ctx.lineTo(x - 10, y + 18); ctx.moveTo(x - 6, y); ctx.lineTo(x - 14, y - 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 19, y - 19); ctx.lineTo(x + 8, y - 19); ctx.lineTo(x + 19, y - 9); ctx.closePath(); ctx.fillStyle = 'rgba(22,26,36,0.55)'; ctx.fill();
      }
      ctx.restore();
    },

    drawHookRing: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y);
      ctx.save(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y - 31); ctx.strokeStyle = P.rope; ctx.lineWidth = 3; ctx.stroke();
      circle(ctx, x, y, 9); ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = P.hook; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.restore();
    },

    drawPickup: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), t = cnum(s.t, 0, 1e6, 0);
      ctx.save();
      matIcon(ctx, s.kind, x, y + Math.sin(t * 4) * 1.5, 20);
      ctx.restore();
    },

    drawChest: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y);
      ctx.save(); ctx.lineJoin = 'round';
      if (s.open === true) {
        rr(ctx, x - 17, y - 17.2, 34, 7, 3); ctx.fillStyle = '#4e463f'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke();
        rr(ctx, x - 18, y - 8, 36, 25.2, 4); ctx.fillStyle = P.chestUsed; ctx.fill(); ctx.stroke();
        rr(ctx, x - 14, y - 6, 28, 6, 2); ctx.fillStyle = '#211c18'; ctx.fill();
      } else {
        rr(ctx, x - 18, y - 4, 36, 21, 4); ctx.fillStyle = P.chest; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
        rr(ctx, x - 18, y - 16, 36, 13, 6); ctx.fillStyle = P.chestLid; ctx.fill(); ctx.stroke();
        ctx.fillStyle = P.chestTrim; ctx.fillRect(x - 18, y - 5, 36, 3); ctx.fillRect(x - 11, y - 16, 3, 34); ctx.fillRect(x + 8, y - 16, 3, 34);
        rr(ctx, x - 4, y - 7, 8, 9, 2); ctx.fillStyle = P.chestTrim; ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
        var tw2 = 0.5 + 0.5 * Math.sin(nowS() * 5);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * tw2) + ')';
        ctx.beginPath(); ctx.moveTo(x + 15, y - 17.5); ctx.lineTo(x + 16.2, y - 14.2); ctx.lineTo(x + 19.5, y - 13); ctx.lineTo(x + 16.2, y - 11.8);
        ctx.lineTo(x + 15, y - 8.5); ctx.lineTo(x + 13.8, y - 11.8); ctx.lineTo(x + 10.5, y - 13); ctx.lineTo(x + 13.8, y - 14.2); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), reached = s.reached === true;
      ctx.save(); ctx.lineJoin = 'round';
      rr(ctx, x - 19, y + 33, 14, 7, 2); ctx.fillStyle = '#4a5266'; ctx.fill();
      ctx.fillStyle = '#e8ecf4'; ctx.fillRect(x - 14, y - 35, 4, 70); ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.strokeRect(x - 14, y - 35, 4, 70);
      circle(ctx, x - 12, y - 36, 3); ctx.fillStyle = P.goalReached; ctx.fill(); ctx.stroke();
      var fx = x - 10, fy = y - 34, fw = 29, fh = 21;
      if (reached) {
        rr(ctx, fx, fy, fw, fh, 3); ctx.fillStyle = P.goalReached; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
        circle(ctx, fx + fw / 2, fy + fh / 2, 5); ctx.fillStyle = '#ffffff'; ctx.fill();
      } else {
        for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
          ctx.fillStyle = (r + c) % 2 ? '#1f2330' : '#ffffff';
          ctx.fillRect(fx + c * fw / 4, fy + r * fh / 3, fw / 4 + 0.3, fh / 3 + 0.3);
        }
        ctx.lineWidth = 1.5; ctx.strokeRect(fx, fy, fw, fh);
      }
      ctx.restore();
    },

    drawSocket: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y);
      ctx.save(); ctx.lineJoin = 'round';
      if (s.sealed === true) {
        rr(ctx, x - 19.5, y - 5.5, 39, 11, 4); ctx.fillStyle = '#5a5f6c'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.save(); rr(ctx, x - 19, y - 5, 38, 10, 4); ctx.clip();
        ctx.strokeStyle = '#3a3e48'; ctx.lineWidth = 3;
        for (var i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 9 - 6, y + 6); ctx.lineTo(x + i * 9 + 6, y - 6); ctx.stroke(); }
        ctx.restore();
        lockIcon(ctx, x, y + 0.5, 11, '#c0c6d2');
      } else {
        rr(ctx, x - 19.5, y - 5.5, 39, 11, 4); ctx.fillStyle = '#3b4150'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.ink; ctx.stroke();
        rr(ctx, x - 14, y - 2.5, 28, 5, 2.5); ctx.fillStyle = P.mechDeep; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = P.mech; ctx.stroke();
      }
      ctx.restore();
    },

    drawSpringPad: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), p = prog(s.bounceT, s.bounceDur), top = -10;
      if (p < 1) {
        if (p < 0.3) top = -10 + 8 * (p / 0.3);
        else { var q = (p - 0.3) / 0.7; top = q < 0.45 ? -2 - 20 * (q / 0.45) : -22 + 12 * ((q - 0.45) / 0.55); }
      }
      ctx.save(); springShape(ctx, x, y, 1, top); ctx.restore();
    },

    drawWindStrip: function (ctx, s) {
      s = st(s);
      var x1 = pos(s.x1), x2 = pos(s.x2), y = pos(s.y), t = cnum(s.t, 0, 1e6, 0);
      if (x2 < x1) { var tmp = x1; x1 = x2; x2 = tmp; }
      x2 = Math.min(x2, x1 + 400);
      var w = Math.max(8, x2 - x1);
      ctx.save();
      rr(ctx, x1, y - 8, w, 16, 6); ctx.fillStyle = 'rgba(54,224,166,0.32)'; ctx.fill();
      ctx.save(); rr(ctx, x1, y - 8, w, 16, 6); ctx.clip();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(184,255,228,0.95)'; ctx.lineWidth = 2.5;
      var off = (t * 70) % 24;
      for (var cx = x1 - 24 + off; cx < x2 + 12; cx += 24) {
        ctx.beginPath(); ctx.moveTo(cx - 4, y - 4.5); ctx.lineTo(cx + 1.5, y); ctx.lineTo(cx - 4, y + 4.5); ctx.stroke();
      }
      ctx.restore();
      rr(ctx, x1 + 0.75, y - 7.25, w - 1.5, 14.5, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = P.mechDark; ctx.stroke();
      ctx.fillStyle = P.mech; rr(ctx, x1 + 1, y - 7, 4, 14, 2); ctx.fill(); rr(ctx, x1 + w - 5, y - 7, 4, 14, 2); ctx.fill();
      ctx.restore();
    },

    drawPortal: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), p = prog(s.flashT, s.flashDur), t = cnum(s.t, 0, 1e6, 0);
      ctx.save(); portalShape(ctx, x, y, 1, t, p < 1 ? (1 - p) * 0.9 : 0); ctx.restore();
    },

    drawTeleportFlash: function (ctx, s) {
      s = st(s);
      var dur = num(s.dur, 0.3), t = num(s.t, dur);
      if (!(dur > 0) || t >= dur || t < 0) return;
      var x = pos(s.x), y = pos(s.y), p = t / dur;
      ctx.save();
      circle(ctx, x, y, 18 * (1 - p) + 2); ctx.fillStyle = 'rgba(255,255,255,' + (1 - p) + ')'; ctx.fill();
      circle(ctx, x, y, 10 + 26 * p); ctx.lineWidth = 4 * (1 - p) + 1; ctx.strokeStyle = 'rgba(54,224,166,' + (1 - p) + ')'; ctx.stroke();
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3, r = 14 + 22 * p;
        circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 2.5 * (1 - p) + 0.5); ctx.fillStyle = 'rgba(184,255,228,' + (1 - p) + ')'; ctx.fill();
      }
      ctx.restore();
    },

    drawLamp: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), lit = s.lit === true, R = cnum(s.radius, 0, 200, 200), p = prog(s.litT, s.litDur);
      ctx.save();
      if (R > 0) {
        if (!lit) {
          circle(ctx, x, y, R - 1); ctx.fillStyle = 'rgba(54,224,166,0.05)'; ctx.fill();
          ctx.setLineDash([12, 9]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(54,224,166,0.6)'; ctx.stroke(); ctx.setLineDash([]);
        } else if (p < 1) {
          var r = 14 + (R - 15) * (1 - p);
          circle(ctx, x, y, r); ctx.lineWidth = 2 + 4 * p; ctx.strokeStyle = 'rgba(255,246,196,' + (1 - p) + ')'; ctx.stroke();
        }
      }
      if (lit) {
        var g = ctx.createRadialGradient(x, y, 4, x, y, 34); g.addColorStop(0, 'rgba(255,246,196,0.75)'); g.addColorStop(1, 'rgba(255,246,196,0)');
        ctx.fillStyle = g; circle(ctx, x, y, 34); ctx.fill();
      }
      lampBody(ctx, x, y, 1, lit);
      ctx.restore();
    },

    drawRoutePath: function (ctx, s) {
      s = st(s);
      var cls = pick(s.cls, CLS, 'sword'), col = CLS_COL[cls][0];
      var raw = Array.isArray(s.points) ? s.points.slice(0, 600) : [];
      var segs = [], cur = [];
      for (var i = 0; i < raw.length; i++) {
        var pt = raw[i];
        if (!pt || typeof pt !== 'object') continue;
        if (pt.gap === true) { if (cur.length) segs.push(cur); cur = []; continue; }
        var px = num(pt.x, NaN), py = num(pt.y, NaN);
        if (!isFinite(px) || !isFinite(py)) continue;
        cur.push([clamp(px, -200, W + 200), clamp(py, -200, H + 200)]);
      }
      if (cur.length) segs.push(cur);
      if (!segs.length) return;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var pass = 0; pass < 2; pass++) {
        ctx.setLineDash([14, 10]);
        ctx.lineWidth = pass ? 6 : 10; ctx.strokeStyle = pass ? col : 'rgba(255,255,255,0.55)'; ctx.globalAlpha = pass ? 0.85 : 0.6;
        for (var k = 0; k < segs.length; k++) {
          var sg = segs[k]; if (sg.length < 2) continue;
          ctx.beginPath(); ctx.moveTo(sg[0][0], sg[0][1]);
          for (var m = 1; m < sg.length; m++) ctx.lineTo(sg[m][0], sg[m][1]);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      var a0 = segs[0][0];
      circle(ctx, a0[0], a0[1], 7); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      var last = segs[segs.length - 1], e = last[last.length - 1], prev = last.length > 1 ? last[last.length - 2] : [e[0] - 1, e[1]];
      var ang = Math.atan2(e[1] - prev[1], e[0] - prev[0]);
      if (e[0] === prev[0] && e[1] === prev[1]) ang = 0;
      ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
      ctx.restore();
    },

    drawPlayer: function (ctx, s) { playerSprite(ctx, st(s)); },

    drawRangeRing: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), R = cnum(s.radius, 0, 260, 260);
      if (!(R > 2)) return;
      ctx.save(); ctx.lineCap = 'round';
      circle(ctx, x, y, R - 1.5); ctx.setLineDash([0.1, 9]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(143,224,143,0.7)'; ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },

    drawBoar: function (ctx, s) {
      s = st(s);
      var state = pick(s.state, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
      var e = enemyBegin(ctx, s, 48, 32), hit = e.hit, t = e.t;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (state === 'flung') flungBegin(ctx, 24);
      var dx = 0, hdy = 0, legSw = 0;
      if (state === 'walk') legSw = Math.sin(t * 10) * 1.5;
      if (state === 'windup') { dx = -2 + Math.sin(t * 60) * 0.6; hdy = 2.5; }
      if (state === 'charge') { dx = 1; hdy = 1.5; legSw = Math.sin(t * 30) * 2; }
      if (state === 'windup') { // 後腳揚塵
        ctx.fillStyle = 'rgba(200,180,150,0.8)';
        circle(ctx, -20, 12, 3.5); ctx.fill(); circle(ctx, -15, 10, 2.5); ctx.fill();
      }
      if (state === 'charge') {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-23, -6); ctx.lineTo(-16, -6); ctx.moveTo(-23, 2); ctx.lineTo(-18, 2); ctx.stroke();
      }
      ctx.save(); ctx.translate(dx, 0);
      ctx.fillStyle = C(hit, P.boarDark);
      rr(ctx, -14 - legSw, 9, 5, 6.5, 2); ctx.fill(); rr(ctx, -6 + legSw, 9, 5, 6.5, 2); ctx.fill();
      rr(ctx, 2 - legSw, 9, 5, 6.5, 2); ctx.fill(); rr(ctx, 9 + legSw, 9, 5, 6.5, 2); ctx.fill();
      ell(ctx, -3, 1, 17, 10); ctx.fillStyle = C(hit, P.boar); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
      ctx.beginPath(); ctx.arc(-5, -1, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = C(hit, P.boarDark); ctx.lineWidth = 4; ctx.stroke();
      var hy = hdy;
      circle(ctx, 11, hy, 8); ctx.fillStyle = C(hit, P.boar); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
      rr(ctx, 16, hy - 2, 4.5, 7, 2); ctx.fillStyle = C(hit, '#d99a86'); ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, hy + 5); ctx.quadraticCurveTo(19.5, hy + 5, 19, hy + 1); ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 2.2; ctx.stroke();
      if (state === 'stun' || state === 'flung') dizzyEye(ctx, 12, hy - 3, 2);
      else {
        circle(ctx, 12, hy - 3, state === 'windup' || state === 'charge' ? 2.8 : 2); ctx.fillStyle = P.enemyEye; ctx.fill();
        ctx.beginPath(); ctx.moveTo(8, hy - 7); ctx.lineTo(15, hy - 5.5); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.8; ctx.stroke();
      }
      ctx.restore();
      if (state === 'stun') { // 頭上轉圈的小星點(框外上方至多 20px)
        for (var i = 0; i < 3; i++) {
          var a = t * 5 + i * 2.1;
          var sx = 8 + Math.cos(a) * 10, sy = -24 + Math.sin(a) * 4;
          circle(ctx, sx, sy, 3); ctx.fillStyle = P.warn; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.ink; ctx.stroke();
        }
      }
      ctx.restore();
    },

    drawShieldman: function (ctx, s) {
      s = st(s);
      var state = pick(s.state, ['walk', 'block', 'flung'], 'walk');
      var e = enemyBegin(ctx, s, 32, 44), hit = e.hit, t = e.t;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (state === 'flung') flungBegin(ctx, 16);
      var sw = state === 'walk' ? Math.sin(t * 6) * 2 : 0;
      ctx.fillStyle = C(hit, '#3a3f4c');
      rr(ctx, -9 + sw, 13, 6, 9, 2); ctx.fill(); rr(ctx, -1 - sw, 13, 6, 9, 2); ctx.fill();
      rr(ctx, -12, -6, 17, 20, 4); ctx.fillStyle = C(hit, P.shield); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
      circle(ctx, -3, -12.5, 8); ctx.fillStyle = C(hit, '#c9b49a'); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-3, -13, 8.5, Math.PI, 0); ctx.closePath(); ctx.fillStyle = C(hit, '#5a6070'); ctx.fill(); ctx.stroke();
      if (state === 'flung') dizzyEye(ctx, 1, -11, 1.8);
      else { ctx.fillStyle = P.enemyEye; ctx.fillRect(-1, -12.5, 5, 2.5); }
      // 盾牌(面向側)
      var blk = state === 'block';
      rr(ctx, 5, -18, 10, 34, 4);
      ctx.fillStyle = blk ? '#ffffff' : C(hit, P.shieldPlate); ctx.fill();
      ctx.lineWidth = blk ? 3 : 2.2; ctx.strokeStyle = blk ? P.warn : P.ink; ctx.stroke();
      if (!blk) { rr(ctx, 8.5, -11, 3, 20, 1.5); ctx.fillStyle = C(hit, P.danger); ctx.fill(); }
      ctx.restore();
    },

    drawShooterBee: function (ctx, s) {
      s = st(s);
      var state = pick(s.state, ['fly', 'aim', 'flung'], 'fly');
      var e = enemyBegin(ctx, s, 32, 32), hit = e.hit, t = e.t;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (state === 'flung') flungBegin(ctx, 16);
      var bx = state === 'aim' ? -2 : 0, flap = Math.sin(t * 40) * 1.5;
      ell(ctx, bx - 4, -9 + flap * 0.3, 6, 4 + flap * 0.5); ctx.fillStyle = 'rgba(235,245,255,0.85)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.ink; ctx.stroke();
      ell(ctx, bx + 2, -10 + flap * 0.3, 5, 3.5 + flap * 0.4); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 8, -3); ctx.lineTo(bx + 15, 0); ctx.lineTo(bx + 8, 3); ctx.closePath(); ctx.fillStyle = P.ink; ctx.fill();
      ctx.save(); ell(ctx, bx - 1, 1, 10, 8); ctx.fillStyle = C(hit, P.bee); ctx.fill(); ctx.clip();
      ctx.fillStyle = C(hit, '#2a2418'); ctx.fillRect(bx - 6, -8, 3.5, 18); ctx.fillRect(bx + 0.5, -8, 3.5, 18);
      ctx.restore();
      ell(ctx, bx - 1, 1, 10, 8); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
      if (state === 'flung') dizzyEye(ctx, bx + 5, -2, 1.6);
      else { circle(ctx, bx + 5, -2, 2); ctx.fillStyle = P.enemyEye; ctx.fill(); }
      if (state === 'aim') {
        var pr = 0.5 + 0.5 * Math.sin(t * 25);
        circle(ctx, bx + 11, 0, 2.5 + pr * 1.5); ctx.fillStyle = P.beeShot; ctx.fill();
        circle(ctx, bx + 11, 0, 4.5 + pr * 1.5); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,74,42,0.8)'; ctx.stroke();
      }
      ctx.restore();
    },

    drawFrog: function (ctx, s) {
      s = st(s);
      var state = pick(s.state, ['crouch', 'jump', 'flung'], 'crouch');
      var e = enemyBegin(ctx, s, 32, 28), hit = e.hit;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (state === 'flung') flungBegin(ctx, 16);
      if (state === 'jump') {
        ctx.strokeStyle = C(hit, P.frogDark); ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-12, 12); ctx.moveTo(2, 6); ctx.lineTo(-3, 12.5); ctx.stroke();
        ell(ctx, 0, 0, 11, 9); ctx.fillStyle = C(hit, P.frog); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
        circle(ctx, 6, -8, 4); ctx.fill(); ctx.stroke(); circle(ctx, -2, -9, 4); ctx.fill(); ctx.stroke();
        if (state !== 'flung') { circle(ctx, 7, -8, 1.8); ctx.fillStyle = P.enemyEye; ctx.fill(); circle(ctx, -1, -9, 1.8); ctx.fill(); }
      } else {
        ell(ctx, -9, 10, 6, 3.5); ctx.fillStyle = C(hit, P.frogDark); ctx.fill();
        ell(ctx, 8, 11, 5, 3); ctx.fill();
        ell(ctx, 0, 4, 13, 9); ctx.fillStyle = C(hit, P.frog); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
        circle(ctx, 6, -5, 4); ctx.fill(); ctx.stroke(); circle(ctx, -2, -6, 4); ctx.fill(); ctx.stroke();
        if (state === 'flung') { dizzyEye(ctx, 6, -5, 1.6); dizzyEye(ctx, -2, -6, 1.6); }
        else { circle(ctx, 7, -5, 1.8); ctx.fillStyle = P.enemyEye; ctx.fill(); circle(ctx, -1, -6, 1.8); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(6, 4); ctx.quadraticCurveTo(10, 6, 12, 3); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.4; ctx.stroke();
      }
      ctx.restore();
    },

    drawBeeShot: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y);
      ctx.save();
      circle(ctx, x, y, 5); ctx.fillStyle = P.beeShot; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#5a0e06'; ctx.stroke();
      circle(ctx, x - 1.2, y - 1.2, 1.6); ctx.fillStyle = '#ffd0b0'; ctx.fill();
      ctx.restore();
    },

    drawArrow: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), a = num(s.angle, 0);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(7, 0); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -2.8); ctx.lineTo(6, 2.8); ctx.closePath(); ctx.fillStyle = '#e8eef8'; ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = P.ink; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-11.5, -2.8, 4, 1.6); ctx.fillRect(-11.5, 1.2, 4, 1.6);
      ctx.restore();
    },

    drawBomb: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), t = cnum(s.t, 0, 1e6, 0);
      ctx.save();
      circle(ctx, x, y + 1, 6.5); ctx.fillStyle = P.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      circle(ctx, x - 2, y - 1, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 3, y - 4); ctx.lineTo(x + 5, y - 5.5); ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.5; ctx.stroke();
      var fl = 0.6 + 0.4 * Math.sin(t * 40);
      circle(ctx, x + 5.5, y - 5.5, 1.5 + fl); ctx.fillStyle = P.warn; ctx.fill();
      ctx.restore();
    },

    drawExplosion: function (ctx, s) {
      s = st(s);
      var dur = num(s.dur, 0.25), t = num(s.t, dur);
      if (!(dur > 0) || t >= dur || t < 0) return;
      var x = pos(s.x), y = pos(s.y), R = cnum(s.radius, 0, 60, 60), p = t / dur;
      var r = R * (0.45 + 0.55 * Math.sqrt(p));
      ctx.save(); ctx.globalAlpha = 1 - p * p;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, '#fff6c0'); g.addColorStop(0.45, P.explosion); g.addColorStop(0.85, '#ff5a2a'); g.addColorStop(1, 'rgba(200,40,20,0)');
      circle(ctx, x, y, r); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    },

    drawShockwave: function (ctx, s) {
      s = st(s);
      var dur = num(s.dur, 0.3), t = num(s.t, dur);
      if (!(dur > 0) || t >= dur || t < 0) return;
      var x = pos(s.x), y = pos(s.y), R = cnum(s.radius, 0, 130, 130), p = t / dur;
      var outer = R * (1 - (1 - p) * (1 - p)), wdt = Math.min(14, outer);
      if (outer < 1) return;
      ctx.save(); ctx.globalAlpha = 1 - p * 0.7;
      circle(ctx, x, y, outer - wdt / 2); ctx.lineWidth = wdt; ctx.strokeStyle = 'rgba(223,243,255,0.75)'; ctx.stroke();
      circle(ctx, x, y, outer - 1.5); ctx.lineWidth = 3; ctx.strokeStyle = P.shockEdge; ctx.stroke();
      if (outer > 30) { circle(ctx, x, y, outer * 0.6); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(124,196,255,0.4)'; ctx.stroke(); }
      ctx.restore();
    },

    drawPoof: function (ctx, s) {
      s = st(s);
      var dur = num(s.dur, 0.3), t = num(s.t, dur);
      if (!(dur > 0) || t >= dur || t < 0) return;
      var x = pos(s.x), y = pos(s.y), p = t / dur;
      ctx.save(); ctx.globalAlpha = 1 - p;
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + 0.3, d = 6 + 12 * p, r = 7 * (1 - p * 0.5);
        circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r); ctx.fillStyle = i % 2 ? P.poof : '#c8c8c8'; ctx.fill();
      }
      circle(ctx, x, y, 8 * (1 - p)); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
    },

    drawPopup: function (ctx, s) {
      s = st(s);
      var dur = num(s.dur, 0.8), t = num(s.t, dur);
      if (!(dur > 0) || t >= dur || t < 0) return;
      var x = pos(s.x), y = pos(s.y), p = t / dur, kind = pick(s.kind, KINDS, 'wood'), v = Math.round(cnum(s.value, 0, 99, 1));
      var light = { wood: P.woodLight, ench: P.enchLight, time: P.timeLight }[kind];
      ctx.save(); ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      var yy = y - 30 * (1 - (1 - p) * (1 - p));
      matIcon(ctx, kind, x - 13, yy, 18);
      txt(ctx, '+' + v, x - 2, yy, 18, light, { bold: true, stroke: P.ink, sw: 4 });
      ctx.restore();
    },

    drawChainText: function (ctx, s) {
      s = st(s);
      var dur = num(s.dur, 0.8), t = num(s.t, dur);
      if (!(dur > 0) || t >= dur || t < 0) return;
      var x = pos(s.x), y = pos(s.y), p = t / dur, n = Math.round(cnum(s.n, 2, 99, 2));
      var sc = p < 0.15 ? 1 + 0.3 * (p / 0.15) : p < 0.3 ? 1.3 - 0.3 * ((p - 0.15) / 0.15) : 1;
      ctx.save(); ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      ctx.translate(x, y - 30 * Math.min(1, p / 0.8)); ctx.scale(sc, sc);
      txt(ctx, n + ' 連鎖', 0, 0, 24, P.warn, { bold: true, align: 'center', stroke: P.ink, sw: 5 });
      ctx.restore();
    },

    drawItemIcon: function (ctx, s) {
      s = st(s);
      ctx.save(); itemIconBox(ctx, s.type, pos(s.x), pos(s.y), 32); ctx.restore();
    },

    drawItemNotice: function (ctx, s) {
      s = st(s);
      var dur = num(s.dur, 1.5), t = num(s.t, dur);
      if (!(dur > 0) || t >= dur || t < 0) return;
      var type = pick(s.type, TYPES, 'spring');
      var a = t < 0.2 ? t / 0.2 : t > dur - 0.3 ? (dur - t) / 0.3 : 1;
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
      panel(ctx, 441, 53, 398, 42, { r: 10, fill: 'rgba(16,28,36,0.92)', edge: P.mech, lw: 2 });
      itemIconBox(ctx, type, 470, 74, 30);
      txt(ctx, '獲得 ' + ITEM_NAME[type], 496, 74, 20, '#ffffff', { bold: true });
      ctx.restore();
    },

    drawMapLink: function (ctx, s) {
      s = st(s);
      var x1 = pos(s.x1), y1 = pos(s.y1), x2 = pos(s.x2), y2 = pos(s.y2), lit = s.lit === true, dx = (x2 - x1) * 0.5;
      ctx.save(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
      if (lit) {
        ctx.strokeStyle = '#6a5216'; ctx.lineWidth = 8; ctx.stroke();
        ctx.strokeStyle = P.linkLit; ctx.lineWidth = 4.5; ctx.stroke();
      } else {
        ctx.setLineDash([8, 8]); ctx.strokeStyle = P.linkDim; ctx.lineWidth = 3.5; ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    },

    drawLevelCard: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), state = pick(s.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed');
      var idx = Math.round(cnum(s.index, 1, 8, 1)), name = str(s.name, '');
      var sealed = state === 'sealed', buyable = state === 'buyable', afford = s.canAfford === true;
      ctx.save(); ctx.lineJoin = 'round';
      panel(ctx, x + 1, y + 1, 174, 134, { r: 10, fill: sealed ? '#151b27' : '#212c40', edge: sealed ? '#2c3548' : buyable && afford ? P.warn : '#4a5a78', lw: buyable && afford ? 2.5 : 2 });
      // 縮圖區底
      if (state !== 'cleared') { rr(ctx, x + 8, y + 8, 160, 90, 3); ctx.fillStyle = sealed ? '#10151f' : '#2a3a52'; ctx.fill(); }
      if (sealed || buyable) {
        lockIcon(ctx, x + 56, y + 53, 34, sealed ? '#5a6274' : '#c8cede');
        var cost = mats(s.cost), cy = y + 53, rows = [];
        for (var i = 0; i < 3; i++) if (cost[KINDS[i]] > 0) rows.push(KINDS[i]);
        for (var j = 0; j < rows.length; j++) {
          var ry = cy + (j - (rows.length - 1) / 2) * 22;
          matIcon(ctx, rows[j], x + 94, ry, 18);
          txt(ctx, String(int(cost[rows[j]])), x + 106, ry, 16, sealed ? '#6a7286' : afford ? '#ffffff' : P.bad, { bold: true });
        }
      }
      // 文字區
      txt(ctx, idx + ' ' + name, x + 9, y + 113, 14, sealed ? '#6a7286' : '#ffffff', { bold: true });
      if (state === 'cleared') {
        clsIcon(ctx, s.recordCls, x + 118, y + 113, 15);
        txt(ctx, fmt1(s.recordTime) + '秒', x + 168, y + 113, 12, P.text, { align: 'right', bold: true });
        var rt = mats(s.rates);
        for (var k = 0; k < 3; k++) {
          matIcon(ctx, KINDS[k], x + 15 + k * 56, y + 128, 13);
          txt(ctx, fmt1(rt[KINDS[k]]), x + 24 + k * 56, y + 128, 12, P.text);
        }
      } else if (state === 'open') {
        txt(ctx, '未過關', x + 9, y + 128, 12, P.textDim);
      } else if (buyable) {
        txt(ctx, afford ? '可解鎖' : '木材不足', x + 9, y + 128, 12, afford ? P.warn : P.bad, { bold: true });
      } else {
        txt(ctx, '封鎖', x + 9, y + 128, 12, '#5a6274');
      }
      ctx.restore();
    },

    drawCardOverlay: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), lv = Math.round(cnum(s.accelLv, 0, 2, 0));
      ctx.save(); ctx.lineJoin = 'round';
      rr(ctx, x + 7, y + 7, 162, 92, 3); ctx.lineWidth = 2; ctx.strokeStyle = '#0b1018'; ctx.stroke();
      if (lv > 0) {
        var lab = lv === 1 ? '×1.25' : '×1.5';
        rr(ctx, x + 10, y + 10, 42, 17, 5); ctx.fillStyle = P.timeDark; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.timeLight; ctx.stroke();
        txt(ctx, lab, x + 31, y + 18.5, 11, '#ffffff', { bold: true, align: 'center' });
      }
      if (s.pending === true) {
        rr(ctx, x + 106, y + 10, 60, 17, 5); ctx.fillStyle = P.warn; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.ink; ctx.stroke();
        txt(ctx, '重跑生效', x + 136, y + 18.5, 11, P.ink, { bold: true, align: 'center' });
      }
      if (s.selected === true) {
        var pulse = 0.75 + 0.25 * Math.sin(nowS() * 6);
        rr(ctx, x - 4, y - 4, 184, 144, 13); ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,255,255,' + pulse + ')'; ctx.stroke();
        rr(ctx, x - 5.5, y - 5.5, 187, 147, 14); ctx.lineWidth = 1; ctx.strokeStyle = P.ink; ctx.stroke();
      }
      ctx.restore();
    },

    drawGoalCard: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), cost = mats(s.cost), ca = s.canAfford;
      var all = ca === true || (ca && typeof ca === 'object' && ca.wood === true && ca.ench === true && ca.time === true);
      ctx.save(); ctx.lineJoin = 'round';
      panel(ctx, x + 1, y + 1, 198, 134, { r: 10, fill: '#2a2618', edge: all ? P.warn : '#6a5e3a', lw: all ? 3 : 2 });
      archShape(ctx, x + 100, y + 48, 0.95, all);
      txt(ctx, '凱旋門', x + 100, y + 90, 16, all ? P.warn : '#e8dcb8', { bold: true, align: 'center' });
      var cx = x + 10;
      for (var i = 0; i < 3; i++) {
        var k = KINDS[i], ok = ca === true || (ca && typeof ca === 'object' ? ca[k] === true : false);
        matIcon(ctx, k, cx + 8, y + 116, 15);
        txt(ctx, String(int(cost[k])), cx + 17, y + 116, 13, ok ? '#ffffff' : P.bad, { bold: true });
        cx += 62;
      }
      if (s.selected === true) {
        var pulse = 0.75 + 0.25 * Math.sin(nowS() * 6);
        rr(ctx, x - 4, y - 4, 208, 144, 13); ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(255,255,255,' + pulse + ')'; ctx.stroke();
        rr(ctx, x - 5.5, y - 5.5, 211, 147, 14); ctx.lineWidth = 1; ctx.strokeStyle = P.ink; ctx.stroke();
      }
      ctx.restore();
    },

    drawFlyingMaterial: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), kind = pick(s.kind, KINDS, 'wood');
      var tgt = HUD_ICON[kind], dx = tgt[0] - x, dy = tgt[1] - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / d, uy = dy / d, light = { wood: P.woodLight, ench: P.enchLight, time: P.timeLight }[kind];
      ctx.save(); ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var o = 9 + i * 6;
        circle(ctx, x - ux * o, y - uy * o, 4 - i * 1.1); ctx.fillStyle = light; ctx.globalAlpha = 0.7 - i * 0.2; ctx.fill();
      }
      ctx.globalAlpha = 1;
      matIcon(ctx, kind, x, y, 18);
      ctx.restore();
    },

    drawLevelPanel: function (ctx, s) {
      s = st(s);
      var row = Math.round(cnum(s.row, 0, 2, 0)), idx = Math.round(cnum(s.index, 1, 8, 1)), name = str(s.name, '');
      ctx.save(); ctx.lineJoin = 'round';
      dim(ctx, 0.6);
      panel(ctx, 41, 49, 1198, 638, { r: 14, fill: P.panel, edge: '#5a6c8e', lw: 2 });
      txt(ctx, '第 ' + idx + ' 關  ' + name, 60, 76, 22, '#ffffff', { bold: true });
      rr(ctx, 59, 95, 642, 362, 4); ctx.lineWidth = 2; ctx.strokeStyle = '#56688a'; ctx.stroke();
      // 背包
      var items = Array.isArray(s.items) ? s.items.slice(0, 8) : [];
      var slots = Array.isArray(s.slots) ? s.slots : [];
      var slotSel = Math.round(cnum(s.slotSel, 0, 3, 0));
      for (var b = 0; b < 8; b++) bagCell(ctx, 60 + b * 80, 476, items[b], false);
      // 三列外框
      var rows = [[720, 96, 480, 150], [720, 262, 480, 190], [720, 468, 480, 90]];
      for (var r = 0; r < 3; r++) {
        var R = rows[r], on = r === row;
        rr(ctx, R[0], R[1], R[2], R[3], 10); ctx.fillStyle = on ? P.panelHi : P.cellBg; ctx.fill();
        ctx.lineWidth = on ? 3 : 1.5; ctx.strokeStyle = on ? '#ffffff' : '#3a4760'; ctx.stroke();
      }
      txt(ctx, '職業', 732, 108, 13, row === 0 ? '#ffffff' : P.textDim, { bold: true });
      txt(ctx, '機關座', 732, 276, 13, row === 1 ? '#ffffff' : P.textDim, { bold: true });
      txt(ctx, '回放加速', 732, 482, 13, row === 2 ? '#ffffff' : P.textDim, { bold: true });
      // 職業列
      var classes = Array.isArray(s.classes) ? s.classes : [];
      var clsSel = Math.round(cnum(s.clsSel, 0, 2, 0));
      for (var c = 0; c < 3; c++) {
        var ci = st(classes[c]), cl = pick(ci.cls, CLS, CLS[c]), owned = ci.owned === true, sel = c === clsSel;
        var cx = 728 + c * 158, cy = 120;
        rr(ctx, cx, cy, 150, 118, 8); ctx.fillStyle = owned ? '#2c3a54' : '#1e2534'; ctx.fill();
        ctx.lineWidth = sel ? (row === 0 ? 3 : 2) : 1.2; ctx.strokeStyle = sel ? (row === 0 ? P.mech : '#8a98b4') : '#3a4760'; ctx.stroke();
        clsIcon(ctx, cl, cx + 28, cy + 30, 38, !owned);
        txt(ctx, CLS_NAME[cl], cx + 54, cy + 22, 16, owned ? '#ffffff' : '#a8b0c0', { bold: true });
        txt(ctx, CLS_GOOD[cl], cx + 54, cy + 44, 12, P.textDim);
        if (!owned) {
          var cc = int(st(ci.cost).wood !== undefined ? st(ci.cost).wood : ci.cost);
          matIcon(ctx, 'wood', cx + 18, cy + 72, 16);
          txt(ctx, String(cc), cx + 30, cy + 72, 15, ci.canAfford === true ? '#ffffff' : P.bad, { bold: true });
          ctx.save(); if (!(sel && row === 0)) ctx.globalAlpha = 0.5;
          keyHint(ctx, 'Z', '招募', cx + 12, cy + 99, 12);
          ctx.restore();
        } else if (sel) {
          ctx.save(); if (row !== 0) ctx.globalAlpha = 0.5;
          keyHint(ctx, 'Z', '出發', cx + 12, cy + 99, 12, P.mech);
          ctx.restore();
        }
      }
      // 機關座列
      for (var k = 0; k < 4; k++) {
        var so = st(slots[k]), sx = 732 + k * 66, sy = 290, ssel = k === slotSel;
        rr(ctx, sx, sy, 58, 58, 8); ctx.fillStyle = so.sealed === true ? '#1a2030' : '#22303f'; ctx.fill();
        ctx.lineWidth = ssel ? (row === 1 ? 3 : 2) : 1.2; ctx.strokeStyle = ssel ? (row === 1 ? P.mech : '#8a98b4') : '#3a4760'; ctx.stroke();
        txt(ctx, String(k + 1), sx + 6, sy + 10, 12, P.textDim, { bold: true });
        if (so.sealed === true) lockIcon(ctx, sx + 29, sy + 31, 22, '#7a8296');
        else if (TYPES.indexOf(so.type) >= 0) itemGlyph(ctx, so.type, sx + 29, sy + 32, 34);
        else txt(ctx, '空', sx + 29, sy + 32, 14, P.textDim, { align: 'center' });
      }
      var cur = st(slots[slotSel]);
      if (cur.sealed === true) {
        txt(ctx, (slotSel + 1) + '號座 封印中', 732, 372, 16, '#ffffff', { bold: true });
        txt(ctx, '解封需要', 732, 398, 13, P.textDim);
        matIcon(ctx, 'ench', 802, 398, 16);
        txt(ctx, String(int(s.unsealCost)), 814, 398, 15, s.canAffordUnseal === true ? '#ffffff' : P.bad, { bold: true });
        ctx.save(); if (row !== 1) ctx.globalAlpha = 0.5; keyHint(ctx, 'Z', '解封', 732, 424, 12); ctx.restore();
      } else {
        var ty = TYPES.indexOf(cur.type) >= 0 ? cur.type : null;
        if (ty) {
          itemIconBox(ctx, ty, 750, 384, 32);
          txt(ctx, (slotSel + 1) + '號座 ' + ITEM_NAME[ty], 774, 376, 16, '#ffffff', { bold: true });
          txt(ctx, ITEM_FX[ty], 774, 397, 13, P.mechLight);
        } else {
          txt(ctx, (slotSel + 1) + '號座 空', 732, 384, 16, '#ffffff', { bold: true });
        }
        ctx.save(); if (row !== 1) ctx.globalAlpha = 0.5; keyHint(ctx, 'Z', '換機關', 732, 424, 12); ctx.restore();
      }
      if (s.pending === true) {
        rr(ctx, 1028, 428, 164, 20, 6); ctx.fillStyle = P.warn; ctx.fill();
        txt(ctx, '下一趟進關才生效', 1110, 438, 13, P.ink, { bold: true, align: 'center' });
      }
      // 加速器列
      var lv = Math.round(cnum(s.accelLv, 0, 2, 0));
      txt(ctx, ['×1', '×1.25', '×1.5'][lv], 732, 522, 24, '#ffffff', { bold: true });
      for (var q = 0; q < 2; q++) {
        ctx.beginPath(); ctx.moveTo(830 + q * 22, 513); ctx.lineTo(838 + q * 22, 522); ctx.lineTo(830 + q * 22, 531); ctx.lineTo(822 + q * 22, 522); ctx.closePath();
        ctx.fillStyle = q < lv ? P.time : '#2a3142'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = q < lv ? P.ink : '#56607a'; ctx.stroke();
      }
      if (s.accelCost === null || s.accelCost === undefined || lv >= 2) {
        txt(ctx, '已滿', 1188, 522, 16, P.textDim, { bold: true, align: 'right' });
      } else {
        txt(ctx, '下一級', 900, 522, 13, P.textDim);
        matIcon(ctx, 'time', 958, 522, 16);
        txt(ctx, String(int(s.accelCost)), 970, 522, 15, s.canAffordAccel === true ? '#ffffff' : P.bad, { bold: true });
        ctx.save(); if (row !== 2) ctx.globalAlpha = 0.5; keyHint(ctx, 'Z', '加速', 1100, 522, 12); ctx.restore();
      }
      // 回放資訊
      rr(ctx, 720, 574, 480, 80, 10); ctx.fillStyle = '#182030'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a4760'; ctx.stroke();
      txt(ctx, '目前回放', 732, 590, 13, P.textDim, { bold: true });
      if (CLS.indexOf(s.recordCls) >= 0 && s.recordTime !== null && s.recordTime !== undefined) {
        clsIcon(ctx, s.recordCls, 745, 626, 24);
        txt(ctx, fmt1(s.recordTime) + ' 秒', 764, 626, 18, '#ffffff', { bold: true });
        matRow(ctx, mats(s.rates), 868, 626, 16, { fixed: true, suffix: '/分', gap: 108, font: 14 });
      } else {
        txt(ctx, '尚無回放', 732, 626, 16, P.textDim);
      }
      txt(ctx, '↑↓ 換列     ←→ 選擇     Z 確定     X 關閉', 60, 674, 15, P.textDim);
      ctx.restore();
    },

    drawSlotCursor: function (ctx, s) {
      s = st(s);
      var x = pos(s.x), y = pos(s.y), act = s.active === true;
      var pl = act ? Math.sin(nowS() * 6) : 0, h = 30 + pl * 2.5, L = 12;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = act ? 1 : 0.4;
      for (var pass = 0; pass < 2; pass++) {
        ctx.lineWidth = pass ? 3 : 6; ctx.strokeStyle = pass ? (act ? '#ffffff' : '#c0c8d8') : 'rgba(22,26,36,0.7)';
        ctx.beginPath();
        for (var i = 0; i < 4; i++) {
          var sx = i % 2 ? 1 : -1, sy = i < 2 ? -1 : 1;
          ctx.moveTo(x + sx * h, y + sy * (h - L)); ctx.lineTo(x + sx * h, y + sy * h); ctx.lineTo(x + sx * (h - L), y + sy * h);
        }
        ctx.stroke();
      }
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      s = st(s);
      var mode = s.mode === 'level' ? 'level' : 'map', stock = mats(s.stock), rate = mats(s.ratePerMin), bump = st(s.bumpT), bd = num(s.bumpDur, 0.15);
      ctx.save();
      ctx.fillStyle = 'rgba(14,20,32,0.84)'; ctx.fillRect(0, 0, W, 40);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 39, W, 1);
      for (var i = 0; i < 3; i++) {
        var k = KINDS[i], bx = 16 + i * 220, ic = HUD_ICON[k];
        if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(bx - 8, 8, 1, 24); }
        matIcon(ctx, k, ic[0], ic[1], 24);
        var p = prog(bump[k], bd), sc = 1 + 0.3 * Math.sin(Math.PI * p) * (p < 1 ? 1 : 0);
        ctx.save(); ctx.translate(bx + 38, 20); ctx.scale(sc, sc);
        txt(ctx, String(int(stock[k])), 0, 0, 20, '#ffffff', { bold: true });
        ctx.restore();
        txt(ctx, '+' + fmt1(rate[k]) + '/分', bx + 118, 14, 12, rate[k] > 0 ? P.good : P.textDim, { bold: true });
        txt(ctx, KIND_USE[k], bx + 118, 30, 11, P.textDim);
      }
      if (mode === 'level') {
        // 職業 + 技能冷卻
        var cls = pick(s.cls, CLS, 'sword'), cp = prog(s.skillCdT, s.skillCdDur);
        circle(ctx, 718, 20, 16); ctx.fillStyle = '#222c40'; ctx.fill();
        clsIcon(ctx, cls, 718, 20, 24);
        if (cp < 1) {
          ctx.beginPath(); ctx.moveTo(718, 20); ctx.arc(718, 20, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cp)); ctx.closePath();
          ctx.fillStyle = 'rgba(10,14,22,0.65)'; ctx.fill();
          circle(ctx, 718, 20, 16); ctx.lineWidth = 2; ctx.strokeStyle = '#56607a'; ctx.stroke();
        } else {
          circle(ctx, 718, 20, 16); ctx.lineWidth = 2.5; ctx.strokeStyle = P.mech; ctx.stroke();
        }
        txt(ctx, fmt1(s.time) + ' 秒', 746, 20, 18, '#ffffff', { bold: true });
        txt(ctx, '這趟', 848, 20, 11, P.textDim);
        var run = mats(s.run);
        for (var j = 0; j < 3; j++) {
          matIcon(ctx, KINDS[j], 885 + j * 56, 20, 18);
          txt(ctx, String(int(run[KINDS[j]])), 897 + j * 56, 20, 15, '#ffffff', { bold: true });
        }
        var mh = Math.round(cnum(s.maxHp, 1, 6, 3)), hp = Math.round(cnum(s.hp, 0, mh, mh));
        for (var h = 0; h < mh; h++) heart(ctx, 1066 + h * 26, 21, 22, h < hp);
        if (TYPES.indexOf(s.itemThisRun) >= 0) itemIconBox(ctx, s.itemThisRun, 1250, 20, 30);
        else { rr(ctx, 1236, 6, 28, 28, 6); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3c4a63'; ctx.stroke(); ctx.setLineDash([]); }
      }
      ctx.restore();
    },

    drawResultPanel: function (ctx, s) {
      s = st(s);
      var cls = pick(s.cls, CLS, 'sword'), time = num(s.time, 0), run = mats(s.run), rates = mats(s.rates);
      var item = TYPES.indexOf(s.item) >= 0 ? s.item : null, cmp = s.oldTime !== null && s.oldTime !== undefined && isFinite(Number(s.oldTime));
      ctx.save(); ctx.lineJoin = 'round';
      dim(ctx, 0.45);
      panel(ctx, 281, 151, 718, 418, { r: 16, fill: P.panel, edge: P.warn, lw: 2.5 });
      txt(ctx, '過關', 640, 186, 34, P.warn, { bold: true, align: 'center', stroke: P.ink, sw: 5 });
      txt(ctx, '這趟拿到', 470, 228, 13, P.textDim, { align: 'right' });
      matRow(ctx, run, 484, 228, 18, { gap: 80, font: 16, bold: true });
      if (!cmp) {
        clsIcon(ctx, cls, 560, 284, 34);
        txt(ctx, fmt1(time) + ' 秒', 590, 284, 28, '#ffffff', { bold: true });
        txt(ctx, '每分鐘產量', 640, 334, 13, P.textDim, { align: 'center' });
        matRow(ctx, rates, 486, 362, 20, { fixed: true, gap: 110, font: 18, bold: true });
        if (item) { itemIconBox(ctx, item, 560, 418, 30); txt(ctx, '獲得 ' + ITEM_NAME[item], 584, 418, 18, P.mechLight, { bold: true }); }
        txt(ctx, '已存成回放', 640, 466, 18, P.good, { bold: true, align: 'center' });
        keyHint(ctx, 'Z', '回大地圖', 570, 526, 15);
      } else {
        var oCls = pick(s.oldCls, CLS, 'sword'), oTime = num(s.oldTime, 0), oRates = mats(s.oldRates);
        var cA = 600, cB = 830;
        txt(ctx, '這一趟', cA, 266, 17, '#ffffff', { bold: true, align: 'center' });
        txt(ctx, '目前回放', cB, 266, 17, P.textDim, { bold: true, align: 'center' });
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(330, 282, 620, 1);
        clsIcon(ctx, cls, cA, 302, 24); clsIcon(ctx, oCls, cB, 302, 24);
        txt(ctx, '職業', 340, 302, 14, P.textDim);
        var rowsY = [338, 374, 410, 446];
        function cell(v, other, lowerBetter, xC, y, unit) {
          var better = lowerBetter ? v < other : v > other, worse = lowerBetter ? v > other : v < other;
          if (better) { rr(ctx, xC - 62, y - 14, 124, 28, 8); ctx.fillStyle = 'rgba(125,255,154,0.16)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.good; ctx.stroke(); }
          txt(ctx, fmt1(v) + unit, xC, y, better ? 19 : 17, better ? P.good : worse ? '#7d879c' : '#ffffff', { bold: true, align: 'center' });
        }
        txt(ctx, '秒數', 340, rowsY[0], 14, P.textDim);
        cell(time, oTime, true, cA, rowsY[0], ' 秒'); cell(oTime, time, true, cB, rowsY[0], ' 秒');
        for (var i = 0; i < 3; i++) {
          var k = KINDS[i];
          matIcon(ctx, k, 350, rowsY[i + 1], 18); txt(ctx, '/分', 364, rowsY[i + 1], 14, P.textDim);
          cell(rates[k], oRates[k], false, cA, rowsY[i + 1], ''); cell(oRates[k], rates[k], false, cB, rowsY[i + 1], '');
        }
        if (item) { itemIconBox(ctx, item, 560, 490, 28); txt(ctx, '獲得 ' + ITEM_NAME[item], 582, 490, 16, P.mechLight, { bold: true }); }
        var w1 = hintW(ctx, 'Z', '採用這一趟', 15);
        var w2 = hintW(ctx, 'X', '保留舊的', 15);
        var sx = 640 - (w1 + 40 + w2) / 2;
        keyHint(ctx, 'Z', '採用這一趟', sx, 534, 15);
        keyHint(ctx, 'X', '保留舊的', sx + w1 + 40, 534, 15);
      }
      ctx.restore();
    },

    drawFailPanel: function (ctx) {
      ctx.save();
      dim(ctx, 0.45);
      panel(ctx, 381, 241, 518, 238, { r: 16, fill: P.panel, edge: P.bad, lw: 2.5 });
      txt(ctx, '失敗', 640, 300, 40, P.bad, { bold: true, align: 'center', stroke: P.ink, sw: 5 });
      txt(ctx, '這趟的素材與寶箱不入帳', 640, 352, 15, P.textDim, { align: 'center' });
      var w1 = hintW(ctx, 'Z', '重來', 16), w2 = hintW(ctx, 'X', '回大地圖', 16);
      var sx = 640 - (w1 + 40 + w2) / 2;
      keyHint(ctx, 'Z', '重來', sx, 420, 16); keyHint(ctx, 'X', '回大地圖', sx + w1 + 40, 420, 16);
      ctx.restore();
    },

    drawPausePanel: function (ctx, s) {
      s = st(s);
      var lvl = s.mode === 'level';
      ctx.save();
      dim(ctx, 0.6);
      panel(ctx, 381, 221, 518, 278, { r: 16, fill: P.panel, edge: '#8a98b4', lw: 2.5 });
      txt(ctx, '暫停', 640, 290, 40, '#ffffff', { bold: true, align: 'center' });
      var keys = lvl ? [['Esc', '繼續'], ['Z', '重來'], ['X', '回大地圖']] : [['Esc', '繼續']];
      var ws = [], tot = 0;
      for (var i = 0; i < keys.length; i++) { ws.push(hintW(ctx, keys[i][0], keys[i][1], 16)); tot += ws[i] + (i ? 32 : 0); }
      var sx = 640 - tot / 2;
      for (var j = 0; j < keys.length; j++) { keyHint(ctx, keys[j][0], keys[j][1], sx, 380, 16); sx += ws[j] + 32; }
      if (lvl) txt(ctx, '回大地圖時這一趟作廢', 640, 440, 14, P.textDim, { align: 'center' });
      ctx.restore();
    },

    drawEndingPanel: function (ctx, s) {
      s = st(s);
      var tt = Math.max(0, Math.floor(cnum(s.totalTime, 0, 3599999, 0))), m = Math.floor(tt / 60), sec = tt % 60;
      ctx.save();
      dim(ctx, 0.55);
      panel(ctx, 281, 151, 718, 418, { r: 16, fill: '#2a2618', edge: P.warn, lw: 3 });
      archShape(ctx, 640, 260, 1.9, true);
      txt(ctx, '凱旋門落成', 640, 368, 36, P.warn, { bold: true, align: 'center', stroke: P.ink, sw: 5 });
      txt(ctx, '總遊玩時間  ' + m + ':' + (sec < 10 ? '0' : '') + sec, 640, 426, 22, '#ffffff', { bold: true, align: 'center' });
      var w = hintW(ctx, 'Z', '重新開始', 16);
      keyHint(ctx, 'Z', '重新開始', 640 - w / 2, 500, 16);
      ctx.restore();
    },

    drawGuidePage: function (ctx, s) {
      s = st(s);
      var page = Math.round(cnum(s.page, 0, GUIDE_SIZE.length - 1, 0));
      var x = pos(s.x), y = pos(s.y), w = cnum(s.w, 0, 4000, 0), h = cnum(s.h, 0, 4000, 0);
      if (!(w > 0) || !(h > 0)) return;
      var vs = GUIDE_SIZE[page], k = Math.min(w / vs[0], h / vs[1]);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.translate(x + (w - vs[0] * k) / 2, y + (h - vs[1] * k) / 2); ctx.scale(k, k);
      guidePages[page](ctx);
      ctx.restore();
    }
  };

  window.Art = Art;
})();
