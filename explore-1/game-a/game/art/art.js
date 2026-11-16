/* 疾影回放 — 美術繪圖函式(Canvas 2D, 零依賴)
 * 全域 window.Art; 每個函式自己 save / restore。座標規則見 style.md。 */
(function () {
  'use strict';

  var W = 1280, H = 720, TILE = 40, HUD_H = 40;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  var C = {
    bgTop: '#18203b', bgBottom: '#2c3858', hill: '#222b49', hillFar: '#1f2742', star: '#8a96c8',
    mapBg: '#121828', mapGrid: '#1a2238',
    ground: '#5c4733', groundDark: '#463527', groundSpeck: '#6e5640', grass: '#7c9a48', grassDark: '#5a7634',
    spike: '#dfe3ea', spikeShade: '#9aa1ad', spikeBase: '#c0303f',
    wall: '#80828f', wallDark: '#5c5e6b', wallCrack: '#6fb0ff',
    targetRing: '#3fc457', targetWhite: '#f2f2f2', targetUsed: '#5d626c', targetUsedLight: '#8a8f99',
    gateFrame: '#24502c', gateBar: '#56d36a',
    crystal: '#3ff0f0', crystalDark: '#128f9c', crystalLight: '#e2ffff',
    pole: '#e9e9ee', flag: '#ffc83a', flagDark: '#c8921a', flagReached: '#ffffff',
    sword: '#3b7cf0', archer: '#3fb24f', mage: '#9a5ae6',
    skin: '#f2c9a0', outline: '#121624', eye: '#121624',
    ghost: '#d6e6ff', ghostDim: '#a9c0ea',
    slime: '#e04a5f', slimeDark: '#9c2a3e', slimeLight: '#ff9aa8',
    bat: '#7b2f5a', batWing: '#561f40', batEye: '#ffd84d',
    arrowShaft: '#c99a5b', arrowTip: '#e6e6e6',
    magic: '#c58bff', magicCore: '#ffffff',
    poof: '#e6e6ee',
    hudBg: 'rgba(10,13,24,0.86)', panel: '#1a1f33', panelLight: '#262d48', border: '#4a5578',
    text: '#f2f4ff', textDim: '#9aa3c0', select: '#ffe14d', bad: '#ff6b6b', good: '#7dff9a',
    gold: '#ffc83a', heart: '#ff4d6a', heartEmpty: '#3a3f55', lock: '#6a7290', shade: 'rgba(5,7,14,0.62)'
  };

  var CLS = { sword: 1, archer: 1, mage: 1 };
  var CLS_NAME = { sword: '劍士', archer: '弓手', mage: '法師' };
  var CLS_SKILL = { sword: '衝刺斬 · 碎裂岩牆', archer: '射箭 · 開柵門', mage: '浮空術 · 上高台' };
  var POSES = { idle: 1, run: 1, rise: 1, fall: 1, dash: 1, hurt: 1 };

  // ---------- 正規化 ----------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function cls(v) { return CLS[v] ? v : 'sword'; }
  function pose(v) { return POSES[v] ? v : 'idle'; }
  function face(v) { return v === -1 ? -1 : 1; }
  function st(s) { return (s && typeof s === 'object') ? s : {}; }
  function fmt1(v) { v = num(v, 0); return (Math.round(v * 10) / 10).toFixed(1); }
  function intStr(v) { return String(Math.floor(num(v, 0))); }

  // ---------- 共用小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 'bold') + ' ' + (o.size || 16) + 'px ' + FONT;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeW || 4;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || C.text;
    ctx.fillText(s, x, y);
  }
  // 晶石圖示(與遊戲內晶石同形: 菱形 + 白色刻面)
  function crystalShape(ctx, x, y, s, alpha) {
    var hw = s * 0.42, hh = s * 0.5;
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.beginPath();
    ctx.moveTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.lineTo(x, y + hh); ctx.lineTo(x - hw, y); ctx.closePath();
    ctx.fillStyle = C.crystal; ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.08); ctx.strokeStyle = C.crystalDark; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - hh * 0.7); ctx.lineTo(x + hw * 0.45, y - hh * 0.05); ctx.lineTo(x, y + hh * 0.1); ctx.lineTo(x - hw * 0.45, y - hh * 0.05); ctx.closePath();
    ctx.fillStyle = C.crystalLight; ctx.fill();
    ctx.restore();
  }
  // 職業徽章: 職業色圓 + 白色武器記號
  function classBadge(ctx, c, x, y, r, dim) {
    c = cls(c);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = dim ? C.lock : C[c]; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.lineCap = 'round';
    if (c === 'sword') {
      ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.45); ctx.lineTo(x + r * 0.5, y - r * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.05); ctx.lineTo(x - r * 0.05, y + r * 0.5); ctx.stroke();
    } else if (c === 'archer') {
      ctx.beginPath(); ctx.arc(x - r * 0.25, y, r * 0.55, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath(); ctx.moveTo(x - r * 0.08, y - r * 0.53); ctx.lineTo(x - r * 0.08, y + r * 0.53); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.55, y + r * 0.4); ctx.lineTo(x + r * 0.55, y + r * 0.4); ctx.lineTo(x + r * 0.05, y - r * 0.6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function keycap(ctx, label, cx, cy, h) {
    h = h || 26;
    ctx.save();
    ctx.font = 'bold ' + Math.round(h * 0.55) + 'px ' + FONT;
    var w = Math.max(h, label.length * h * 0.42 + h * 0.5);
    if (/[^\x00-\x7f]/.test(label)) w = Math.max(h, label.length * h * 0.62 + h * 0.4);
    rr(ctx, cx - w / 2, cy - h / 2 + 2, w, h, 5); ctx.fillStyle = '#0b0e18'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 5); ctx.fillStyle = '#e9ecf5'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#0b0e18'; ctx.stroke();
    txt(ctx, label, cx, cy + 0.5, { size: Math.round(h * 0.55), color: '#151a2a', align: 'center' });
    ctx.restore();
    return w;
  }
  function panel(ctx, x, y, w, h, border, fill) {
    rr(ctx, x, y + 4, w, h, 12); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    rr(ctx, x, y, w, h, 12); ctx.fillStyle = fill || C.panel; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = border || C.border; ctx.stroke();
  }
  // 選取框: 外擴 4px 黃框 + 四角加粗, 不超出 6px
  function selectFrame(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 14);
    ctx.lineWidth = 3; ctx.strokeStyle = C.select; ctx.stroke();
    ctx.lineWidth = 4; ctx.lineCap = 'square';
    var L = 18, xs = [x - 4, x + w + 4], ys = [y - 4, y + h + 4];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      var sx = i ? -1 : 1, sy = j ? -1 : 1, px = xs[i], py = ys[j];
      ctx.beginPath(); ctx.moveTo(px, py + sy * L); ctx.lineTo(px, py); ctx.lineTo(px + sx * L, py); ctx.stroke();
    }
    ctx.restore();
  }
  function lockIcon(ctx, x, y, s, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.arc(x, y - s * 0.12, s * 0.28, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.28, y - s * 0.12); ctx.lineTo(x - s * 0.28, y + s * 0.02); ctx.moveTo(x + s * 0.28, y - s * 0.12); ctx.lineTo(x + s * 0.28, y + s * 0.02); ctx.stroke();
    rr(ctx, x - s * 0.42, y, s * 0.84, s * 0.55, s * 0.08); ctx.fill();
    ctx.fillStyle = C.panel; ctx.beginPath(); ctx.arc(x, y + s * 0.22, s * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 花費列: 晶石圖示 + 數字; 不足時數字轉紅並加「不足」
  function costLine(ctx, cost, ok, x, y, size, align) {
    var s = intStr(cost);
    var color = ok ? C.text : C.bad;
    ctx.save();
    if (align === 'center') {
      var est = s.length * size * 0.6 + size + (ok ? 0 : size * 2.4);
      var left = x - est / 2;
      crystalShape(ctx, left + size * 0.4, y, size);
      txt(ctx, s, left + size * 1.0, y, { size: size, color: color });
      if (!ok) txt(ctx, '不足', left + size * 1.0 + s.length * size * 0.6 + size * 0.4, y, { size: Math.round(size * 0.8), color: C.bad });
    } else {
      crystalShape(ctx, x + size * 0.4, y, size);
      txt(ctx, s, x + size * 1.0, y, { size: size, color: color });
      if (!ok) txt(ctx, '不足', x + size * 1.0 + s.length * size * 0.6 + size * 0.4, y, { size: Math.round(size * 0.8), color: C.bad });
    }
    ctx.restore();
  }

  // ---------- 角色(玩家 / 殘影 / 頭像共用) ----------
  function palFor(c, mode) {
    if (mode === 'ghost') return { outline: null, skin: C.ghost, body: C.ghost, bodyDark: C.ghostDim, gear: '#ffffff', gearDark: C.ghostDim, eye: '#5d6f99', slash: '#ffffff', slashEdge: C.ghostDim };
    if (mode === 'locked') return { outline: '#0c0f1a', skin: '#454b64', body: '#3a4058', bodyDark: '#30354a', gear: '#50577a', gearDark: '#3a4058', eye: '#2a2f44', slash: '#50577a', slashEdge: '#3a4058' };
    var col = C[c];
    return { outline: C.outline, skin: C.skin, body: col, bodyDark: shade(col, -0.35), gear: c === 'sword' ? '#e8eef8' : (c === 'archer' ? '#b07a3c' : '#7a4a2a'), gearDark: '#3a2a1a', eye: C.eye, slash: '#ffffff', slashEdge: col };
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function fs(ctx, P, lw) { // 填色 + 外框
    ctx.fill();
    if (P.outline) { ctx.lineWidth = lw || 2; ctx.strokeStyle = P.outline; ctx.stroke(); }
  }
  function limb(ctx, P, pts, w, color) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (P.outline) {
      ctx.strokeStyle = P.outline; ctx.lineWidth = w + 3;
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke();
    }
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var j = 2; j < pts.length; j += 2) ctx.lineTo(pts[j], pts[j + 1]); ctx.stroke();
  }
  // 角色本體, 原點 = 判定框中心, 朝右繪製; 判定框 x ±14, y ±22
  function figure(ctx, s, mode) {
    var c = cls(s.cls), p = pose(s.pose), f = face(s.facing);
    var aDur = num(s.attackDur, 0.2), aT = num(s.attackT, aDur);
    var attacking = aDur > 0 && aT < aDur && aT >= 0;
    var ap = attacking ? clamp(aT / aDur, 0, 1) : 1;
    var P = palFor(c, mode);
    ctx.save();
    ctx.translate(num(s.x, 0), num(s.y, 0));
    ctx.scale(f, 1);

    // 劍士揮砍刀光: 身體前緣外 50x40, 垂直置中
    if (attacking && c === 'sword') {
      ctx.save();
      var a0 = -Math.PI / 2, a1 = a0 + Math.PI * Math.min(1, 0.25 + ap * 1.5);
      ctx.globalAlpha *= (1 - ap * 0.6);
      ctx.beginPath();
      ctx.ellipse(14, 0, 48, 19, 0, a0, a1, false);
      ctx.ellipse(14, 0, 26, 11, 0, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = P.slash; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = P.slashEdge; ctx.stroke();
      ctx.restore();
    }

    // 姿勢參數
    var lean = 0, legs, armF, armB, headY = (c === 'mage') ? -10 : -12, eyeX = false;
    if (p === 'idle') { legs = [[-4, 8, -5, 18.5], [4, 8, 5, 18.5]]; armF = [6, -3, 9, 6]; armB = [-6, -3, -8, 6]; }
    else if (p === 'run') { legs = [[0, 8, 5, 14, 8, 18.5], [0, 8, -5, 14, -9, 18]]; armF = [5, -3, 10, 3]; armB = [-5, -3, -10, 1]; lean = 0.12; }
    else if (p === 'rise') { legs = [[-2, 8, 4, 13, 1, 19], [3, 8, 9, 12, 7, 18]]; armF = [6, -4, 10, -12]; armB = [-6, -4, -10, -11]; }
    else if (p === 'fall') { legs = [[-3, 8, -6, 18.5], [3, 8, 7, 18]]; armF = [6, -4, 10, -9]; armB = [-6, -4, -10, -8]; }
    else if (p === 'dash') { legs = [[0, 8, -7, 14, -10, 18], [0, 8, 4, 14, 3, 18.5]]; armF = [5, -3, 7, -1]; armB = [-5, -3, -9, 2]; lean = 0.25; }
    else { legs = [[-2, 8, -6, 18.5], [2, 8, 4, 18.5]]; armF = [5, -3, 8, -10]; armB = [-5, -3, -8, -10]; lean = -0.15; eyeX = true; }

    // 衝刺: 身後速度線(判定框內)
    if (p === 'dash') {
      ctx.save();
      ctx.strokeStyle = mode === 'ghost' ? C.ghostDim : '#ffffff'; ctx.globalAlpha *= 0.7; ctx.lineWidth = 2; ctx.lineCap = 'round';
      [[-14, -10, -6], [-14, 0, -4], [-14, 10, -7]].forEach(function (l) { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2] - 4, l[1]); ctx.stroke(); });
      ctx.restore();
    }

    // 腿
    for (var i = 0; i < 2; i++) limb(ctx, P, legs[i], 4.5, i ? P.bodyDark : P.bodyDark);
    ctx.save();
    ctx.translate(0, 8); ctx.rotate(lean); ctx.translate(0, -8);
    // 後手
    limb(ctx, P, armB, 3.5, P.skin);
    // 身體
    if (c === 'mage') {
      ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(9, 12); ctx.lineTo(-9, 12); ctx.closePath();
      ctx.fillStyle = P.body; fs(ctx, P);
    } else {
      rr(ctx, -7, -5, 14, 15, 4); ctx.fillStyle = P.body; fs(ctx, P);
      ctx.fillStyle = P.bodyDark; ctx.fillRect(-7, 5, 14, 3);
    }
    // 頭
    ctx.beginPath(); ctx.arc(0, headY, 7, 0, Math.PI * 2); ctx.fillStyle = P.skin; fs(ctx, P);
    // 職業頭飾
    if (c === 'sword') {
      ctx.beginPath(); ctx.arc(0, headY, 7, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(7, headY - 1); ctx.lineTo(-7, headY - 1); ctx.closePath();
      ctx.fillStyle = P.gear; fs(ctx, P, 1.5);
    } else if (c === 'archer') {
      ctx.beginPath(); ctx.arc(-1, headY - 1, 7.5, Math.PI * 0.75, Math.PI * 1.9); ctx.lineTo(-9, headY + 4); ctx.closePath();
      ctx.fillStyle = P.body; fs(ctx, P, 1.5);
    } else {
      ctx.beginPath(); ctx.moveTo(-9, headY - 4); ctx.lineTo(9, headY - 4); ctx.lineTo(-2, -21); ctx.closePath();
      ctx.fillStyle = P.body; fs(ctx, P, 1.5);
      ctx.fillStyle = P.bodyDark; ctx.fillRect(-9, headY - 5, 18, 2.5);
    }
    // 眼
    ctx.strokeStyle = P.eye; ctx.fillStyle = P.eye; ctx.lineWidth = 1.5;
    if (eyeX) { ctx.beginPath(); ctx.moveTo(1.5, headY - 2.5); ctx.lineTo(5, headY + 1); ctx.moveTo(5, headY - 2.5); ctx.lineTo(1.5, headY + 1); ctx.stroke(); }
    else { ctx.fillRect(3, headY - 2, 2, 3); }

    // 前手 + 武器
    if (c === 'sword') {
      if (attacking) {
        limb(ctx, P, [5, -3, 12, -2], 3.5, P.skin);
        limb(ctx, P, [11, -2, 14, -2], 3, P.gearDark);
      } else if (p === 'dash') {
        limb(ctx, P, armF, 3.5, P.skin);
        limb(ctx, P, [7, -1, 10, -1], 3, P.gear);
      } else {
        limb(ctx, P, armF, 3.5, P.skin);
        limb(ctx, P, [armF[2], armF[3], clamp(armF[2] + 1, -10, 10), Math.max(armF[3] - 14, -19)], 3, P.gear);
      }
    } else if (c === 'archer') {
      var bx = attacking ? 10 : 9;
      limb(ctx, P, attacking ? [5, -3, 11, -3] : armF, 3.5, P.skin);
      ctx.save();
      ctx.lineCap = 'round';
      if (P.outline) { ctx.strokeStyle = P.outline; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(bx - 8, -3, 10, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke(); }
      ctx.strokeStyle = P.gear; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx - 8, -3, 10, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
      ctx.strokeStyle = mode === 'ghost' ? '#ffffff' : '#e8e8e8'; ctx.lineWidth = 1;
      var sx0 = bx - 8 + 10 * Math.cos(Math.PI * 0.42), sy0 = 10 * Math.sin(Math.PI * 0.42);
      var pull = attacking ? (1 - ap) * 7 : 0;
      ctx.beginPath(); ctx.moveTo(sx0, -3 - sy0); ctx.lineTo(sx0 - pull, -3); ctx.lineTo(sx0, -3 + sy0); ctx.stroke();
      ctx.restore();
    } else {
      var thrust = (attacking ? 1 : 0) - Math.max(0, lean) * 22; // 前傾時法杖往身體收, 不出判定框
      limb(ctx, P, attacking ? [5, -3, 10, -5] : armF, 3.5, P.skin);
      limb(ctx, P, [8 + thrust, -12, 8 + thrust, 20], 2.5, P.gear);
      ctx.beginPath(); ctx.arc(8 + thrust, -14, attacking ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = mode === 'ghost' ? '#ffffff' : (mode === 'locked' ? P.gear : C.magic); fs(ctx, P, 1.5);
      if (attacking && mode !== 'locked') { ctx.beginPath(); ctx.arc(8 + thrust, -14, 5.5, 0, Math.PI * 2); ctx.strokeStyle = mode === 'ghost' ? '#ffffff' : C.magicCore; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    ctx.restore();
    ctx.restore();
  }

  // ---------- 教學示意用的範例關卡(1280x720 座標) ----------
  var SAMPLE = (function () {
    var t = [], set = {};
    function add(c, r) { t.push([c, r]); set[c + ',' + r] = 1; }
    for (var c = 0; c < 32; c++) { add(c, 16); add(c, 17); }
    add(8, 15); add(9, 15); add(9, 14);
    for (var k = 10; k <= 14; k++) add(k, 13);
    return {
      tiles: t.map(function (a) { return { x: a[0] * 40 + 20, y: a[1] * 40 + 20, top: !set[a[0] + ',' + (a[1] - 1)] }; }),
      crystals: [[5, 15], [18, 15], [24, 15], [11, 12], [12, 12], [13, 12]].map(function (a) { return { x: a[0] * 40 + 20, y: a[1] * 40 + 20 }; }),
      goal: { x: 1180, y: 600 }
    };
  })();
  function drawSample(ctx, ghost) {
    Art.drawBackground(ctx);
    SAMPLE.tiles.forEach(function (g) { Art.drawGround(ctx, g); });
    SAMPLE.crystals.forEach(function (cr, i) { Art.drawCrystal(ctx, { x: cr.x, y: cr.y, t: i * 0.37 }); });
    Art.drawGoal(ctx, { x: SAMPLE.goal.x, y: SAMPLE.goal.y, reached: false });
    if (ghost) Art.drawGhost(ctx, ghost);
  }
  function dashedPath(ctx, pts, color, w) {
    // pts: [x,y] 或 ['q', cx, cy, x, y]
    function trace() {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) {
        var p = pts[i];
        if (p[0] === 'q') ctx.quadraticCurveTo(p[1], p[2], p[3], p[4]); else ctx.lineTo(p[0], p[1]);
      }
    }
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(8,10,20,0.85)'; ctx.lineWidth = w + 4; trace(); ctx.stroke();
    ctx.setLineDash([w * 2.2, w * 1.6]); ctx.strokeStyle = color; ctx.lineWidth = w; trace(); ctx.stroke();
    ctx.setLineDash([]);
    // 箭頭
    var e = pts[pts.length - 1], ex = e[0] === 'q' ? e[3] : e[0], ey = e[0] === 'q' ? e[4] : e[1];
    var pv = pts[pts.length - 1][0] === 'q' ? [e[1], e[2]] : (pts[pts.length - 2][0] === 'q' ? [pts[pts.length - 2][3], pts[pts.length - 2][4]] : pts[pts.length - 2]);
    var ang = Math.atan2(ey - pv[1], ex - pv[0]), L = w * 3.2;
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(ang) * L * 0.6, ey + Math.sin(ang) * L * 0.6);
    ctx.lineTo(ex + Math.cos(ang + 2.5) * L, ey + Math.sin(ang + 2.5) * L);
    ctx.lineTo(ex + Math.cos(ang - 2.5) * L, ey + Math.sin(ang - 2.5) * L);
    ctx.closePath();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,20,0.85)'; ctx.stroke();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }
  // 把虛擬尺寸 vw x vh 等比放進框, 置中並裁切
  function fitBox(ctx, s, vw, vh) {
    var x = num(s.x, 0), y = num(s.y, 0), w = Math.max(1, num(s.w, vw)), h = Math.max(1, num(s.h, vh));
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    var k = Math.min(w / vw, h / vh);
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
    ctx.scale(k, k);
  }

  var Art = {
    canvas: { width: W, height: H },
    palette: C,

    // ===== 背景 =====
    drawBackground: function (ctx) {
      ctx.save();
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.bgTop); g.addColorStop(1, C.bgBottom);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.star;
      for (var i = 0; i < 40; i++) {
        var sx = (i * 337) % W, sy = 50 + (i * 191) % 300;
        ctx.globalAlpha = 0.25 + (i % 3) * 0.12;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.hillFar;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W; x += 80) ctx.lineTo(x, 470 + Math.sin(x * 0.006) * 50 + Math.sin(x * 0.017) * 20);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.hill;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x2 = 0; x2 <= W; x2 += 80) ctx.lineTo(x2, 560 + Math.sin(x2 * 0.009 + 1) * 40);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    drawMapBackground: function (ctx) {
      ctx.save();
      ctx.fillStyle = C.mapBg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = C.mapGrid; ctx.lineWidth = 1;
      for (var x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
      for (var y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
      ctx.restore();
    },

    // ===== 地形 =====
    drawGround: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0) - 20, y = num(s.y, 0) - 20;
      ctx.save();
      ctx.fillStyle = C.ground; ctx.fillRect(x, y, 40, 40);
      ctx.fillStyle = C.groundDark;
      ctx.fillRect(x, y + 36, 40, 4); ctx.fillRect(x + 36, y, 4, 40);
      ctx.fillStyle = C.groundSpeck;
      ctx.fillRect(x + 8, y + 22, 5, 4); ctx.fillRect(x + 24, y + 12, 6, 4); ctx.fillRect(x + 18, y + 30, 4, 3);
      if (s.top) {
        ctx.fillStyle = C.grass; ctx.fillRect(x, y, 40, 9);
        ctx.fillStyle = C.grassDark; ctx.fillRect(x, y + 9, 40, 3);
        ctx.fillRect(x + 6, y + 12, 4, 3); ctx.fillRect(x + 22, y + 12, 5, 4);
      }
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0) - 20, y = num(s.y, 0);
      ctx.save();
      ctx.fillStyle = C.spikeBase; ctx.fillRect(x, y + 15, 40, 5);
      for (var i = 0; i < 4; i++) {
        var bx = x + i * 10;
        ctx.beginPath(); ctx.moveTo(bx, y + 16); ctx.lineTo(bx + 5, y); ctx.lineTo(bx + 10, y + 16); ctx.closePath();
        ctx.fillStyle = C.spike; ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx + 5, y); ctx.lineTo(bx + 10, y + 16); ctx.lineTo(bx + 5, y + 16); ctx.closePath();
        ctx.fillStyle = C.spikeShade; ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx, y + 16); ctx.lineTo(bx + 5, y); ctx.lineTo(bx + 10, y + 16);
        ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
      }
      ctx.restore();
    },

    drawCrackWall: function (ctx, s) {
      s = st(s);
      var cx = num(s.x, 0), cy = num(s.y, 0);
      var dur = Math.max(0.01, num(s.breakDur, 0.3)), t = clamp(num(s.breakT, dur), 0, dur);
      ctx.save();
      if (!s.broken) {
        var x = cx - 20, y = cy - 20;
        ctx.fillStyle = C.wall; ctx.fillRect(x, y, 40, 40);
        ctx.fillStyle = C.wallDark;
        ctx.fillRect(x, y + 19, 40, 2); ctx.fillRect(x + 19, y, 2, 19); ctx.fillRect(x + 9, y + 21, 2, 19); ctx.fillRect(x + 29, y + 21, 2, 19);
        ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.strokeRect(x + 1, y + 1, 38, 38);
        // 劍士色裂痕
        ctx.strokeStyle = C.wallCrack; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 17, y + 16); ctx.lineTo(x + 13, y + 24); ctx.lineTo(x + 24, y + 36);
        ctx.moveTo(x + 17, y + 16); ctx.lineTo(x + 30, y + 12); ctx.lineTo(x + 35, y + 4);
        ctx.moveTo(x + 13, y + 24); ctx.lineTo(x + 4, y + 30); ctx.stroke();
      } else {
        var p = t / dur, a = 1 - p;
        var chunks = [[-10, -10, -1, -1], [10, -10, 1, -1], [-10, 10, -1, 0.6], [10, 10, 1, 0.6], [0, 0, 0.3, -1.2]];
        chunks.forEach(function (c) {
          var dx = c[2] * 20 * p, dy = c[3] * 20 * p + 30 * p * p;
          dy = clamp(dy, -20, 20);
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(cx + c[0] + dx, cy + c[1] + dy);
          ctx.rotate(c[2] * p * 1.5);
          ctx.fillStyle = C.wall; ctx.fillRect(-8, -8, 16, 16);
          ctx.lineWidth = 1.5; ctx.strokeStyle = C.wallCrack; ctx.strokeRect(-8, -8, 16, 16);
          ctx.restore();
        });
      }
      ctx.restore();
    },

    drawTarget: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), hit = !!s.hit;
      ctx.save();
      // 背板(貼牆)
      rr(ctx, x - 19, y - 19, 38, 38, 4); ctx.fillStyle = hit ? '#3a3e48' : C.gateFrame; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
      var r1 = hit ? C.targetUsed : C.targetRing, r2 = hit ? C.targetUsedLight : C.targetWhite;
      [[16, r1], [12, r2], [8, r1], [4, r2]].forEach(function (r) {
        ctx.beginPath(); ctx.arc(x, y, r[0], 0, Math.PI * 2); ctx.fillStyle = r[1]; ctx.fill();
      });
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
      if (hit) {
        // 插著一支箭(用掉了)
        ctx.strokeStyle = C.arrowShaft; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 16, y - 12); ctx.stroke();
        ctx.fillStyle = C.archer;
        ctx.beginPath(); ctx.moveTo(x - 16, y - 12); ctx.lineTo(x - 19, y - 7); ctx.lineTo(x - 13, y - 10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 16, y - 12); ctx.lineTo(x - 11, y - 16); ctx.lineTo(x - 13, y - 10); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    drawGate: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0) - 20, y = num(s.y, 0) - 20;
      ctx.save();
      ctx.fillStyle = C.gateFrame; ctx.fillRect(x, y, 40, 40);
      for (var i = 0; i < 4; i++) {
        ctx.fillStyle = C.gateBar; ctx.fillRect(x + 4 + i * 9, y, 5, 40);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 7 + i * 9, y, 2, 40);
      }
      ctx.fillStyle = C.gateFrame; ctx.fillRect(x, y + 8, 40, 5); ctx.fillRect(x, y + 27, 40, 5);
      ctx.fillStyle = C.gateBar;
      ctx.fillRect(x + 2, y + 9, 36, 2); ctx.fillRect(x + 2, y + 28, 36, 2);
      ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.strokeRect(x + 1, y + 1, 38, 38);
      ctx.restore();
    },

    drawCrystal: function (ctx, s) {
      s = st(s);
      var t = num(s.t, 0), x = num(s.x, 0), y = num(s.y, 0) + Math.sin(t * 3.2) * 3;
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(63,240,240,0.18)'; ctx.fill();
      crystalShape(ctx, x, y, 22);
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), reached = !!s.reached;
      ctx.save();
      // 底座
      ctx.fillStyle = '#5c6075'; ctx.fillRect(x - 18, y + 33, 14, 7);
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.strokeRect(x - 18, y + 33, 14, 7);
      // 旗桿
      ctx.fillStyle = C.pole; ctx.fillRect(x - 13, y - 36, 4, 70);
      ctx.strokeRect(x - 13, y - 36, 4, 70);
      ctx.beginPath(); ctx.arc(x - 11, y - 37, 3, 0, Math.PI * 2); ctx.fillStyle = reached ? '#ffffff' : C.gold; ctx.fill(); ctx.stroke();
      // 旗面
      ctx.beginPath(); ctx.moveTo(x - 9, y - 34); ctx.lineTo(x + 20, y - 26); ctx.lineTo(x - 9, y - 10); ctx.closePath();
      if (reached) {
        ctx.fillStyle = C.flagReached; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.flag; ctx.stroke();
        // 金星
        var sx = x + 1, sy = y - 23, R = 6;
        ctx.beginPath();
        for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? R * 0.45 : R; ctx.lineTo(sx + Math.cos(a) * rr2, sy + Math.sin(a) * rr2); }
        ctx.closePath(); ctx.fillStyle = C.gold; ctx.fill();
        // 旗桿亮起
        ctx.globalAlpha = 0.5; ctx.fillStyle = C.gold; ctx.fillRect(x - 15, y - 32, 2, 64); ctx.fillRect(x - 9, y - 6, 2, 38);
      } else {
        ctx.fillStyle = C.flag; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 9, y - 22); ctx.lineTo(x + 8, y - 24); ctx.lineTo(x - 9, y - 16); ctx.closePath();
        ctx.fillStyle = C.flagDark; ctx.fill();
      }
      ctx.restore();
    },

    // ===== 角色 =====
    drawPlayer: function (ctx, s) {
      s = st(s);
      ctx.save();
      figure(ctx, s, 'player');
      ctx.restore();
    },

    drawGhost: function (ctx, s) {
      s = st(s);
      ctx.save();
      ctx.globalAlpha *= 0.5;
      figure(ctx, s, 'ghost');
      ctx.restore();
    },

    drawSlime: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), f = face(s.facing);
      var maxHp = Math.max(1, num(s.maxHp, 2)), hp = clamp(num(s.hp, maxHp), 0, maxHp);
      var hd = Math.max(0.01, num(s.hurtDur, 0.15)), ht = num(s.hurtT, hd);
      var hurt = ht >= 0 && ht < hd;
      var hurtLv = hp < maxHp; // 受過傷: 身體縮扁 + 裂痕
      var top = hurtLv ? y - 8 : y - 14, bottom = y + 14;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - 18, bottom);
      ctx.quadraticCurveTo(x - 18, top, x, top);
      ctx.quadraticCurveTo(x + 18, top, x + 18, bottom);
      ctx.closePath();
      ctx.fillStyle = C.slime; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.fillStyle = C.slimeDark; ctx.fillRect(x - 16, bottom - 4, 32, 3);
      ctx.beginPath(); ctx.ellipse(x - 7 * f, top + 6, 4, 2.5, -0.4 * f, 0, Math.PI * 2); ctx.fillStyle = C.slimeLight; ctx.fill();
      // 眼: 朝面向
      var ey = top + (hurtLv ? 9 : 12);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x + 3 * f, ey, 3.5, 0, Math.PI * 2); ctx.arc(x + 11 * f, ey, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.outline;
      ctx.beginPath(); ctx.arc(x + 4.5 * f, ey, 1.8, 0, Math.PI * 2); ctx.arc(x + 12.5 * f, ey, 1.8, 0, Math.PI * 2); ctx.fill();
      if (hurtLv) {
        ctx.strokeStyle = C.slimeDark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 10 * f, top + 3); ctx.lineTo(x - 6 * f, top + 9); ctx.lineTo(x - 11 * f, top + 14); ctx.stroke();
      }
      if (hurt) {
        ctx.globalAlpha = 0.85 * (1 - ht / hd);
        ctx.beginPath();
        ctx.moveTo(x - 18, bottom); ctx.quadraticCurveTo(x - 18, top, x, top); ctx.quadraticCurveTo(x + 18, top, x + 18, bottom); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill();
      }
      ctx.restore();
    },

    drawBat: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
      var flap = Math.sin(t * 18);
      ctx.save();
      // 翅膀
      for (var side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(x + side * 5, y - 2);
        ctx.lineTo(x + side * 16, y - 4 - flap * 7);
        ctx.lineTo(x + side * 13, y + 2 - flap * 3);
        ctx.lineTo(x + side * 10, y + 1);
        ctx.lineTo(x + side * 7, y + 4);
        ctx.closePath();
        ctx.fillStyle = C.batWing; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
      }
      // 身體
      ctx.beginPath(); ctx.ellipse(x, y + 1, 7, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.bat; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
      // 耳
      ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x - 4, y - 11); ctx.lineTo(x - 1, y - 6);
      ctx.moveTo(x + 5, y - 5); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x + 1, y - 6); ctx.closePath();
      ctx.fillStyle = C.bat; ctx.fill(); ctx.stroke();
      // 眼
      ctx.fillStyle = C.batEye;
      ctx.fillRect(x - 4, y - 1, 3, 3); ctx.fillRect(x + 1, y - 1, 3, 3);
      ctx.restore();
    },

    drawArrow: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), d = face(s.dir);
      ctx.save();
      ctx.translate(x, y); ctx.scale(d, 1);
      ctx.fillStyle = C.outline; ctx.fillRect(-12, -1.5, 18, 3);
      ctx.fillStyle = C.arrowShaft; ctx.fillRect(-11, -1, 17, 2);
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.closePath();
      ctx.fillStyle = C.arrowTip; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.fillStyle = C.archer;
      ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-6, -1); ctx.lineTo(-9, -1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, 3); ctx.lineTo(-6, 1); ctx.lineTo(-9, 1); ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    drawMagicBolt: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
      var pulse = 1 + Math.sin(t * 30) * 0.1;
      ctx.save();
      // 拖尾: 介面沒給方向, RD 若另傳 dir(1/-1)就畫在反方向; 否則只畫環狀閃光
      if (s.dir === 1 || s.dir === -1) {
        var d = s.dir;
        for (var i = 1; i <= 3; i++) {
          ctx.globalAlpha = 0.45 - i * 0.12;
          ctx.beginPath(); ctx.arc(x - d * (4 + i * 7), y, 6 - i * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = C.magic; ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(x, y, 7 * pulse, 0, Math.PI * 2); ctx.fillStyle = 'rgba(197,139,255,0.45)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fillStyle = C.magic; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2.2, 0, Math.PI * 2); ctx.fillStyle = C.magicCore; ctx.fill();
      ctx.restore();
    },

    drawPoof: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), dur = Math.max(0.01, num(s.dur, 0.3));
      var p = clamp(num(s.t, 0) / dur, 0, 1);
      ctx.save();
      ctx.globalAlpha = 1 - p * p;
      var n = 6;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2 + 0.3, d = 4 + p * 10, r = 5 + p * 5;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, Math.PI * 2);
        ctx.fillStyle = C.poof; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y, 7 * (1 - p) + 2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
    },

    // ===== 大地圖卡片 =====
    drawLevelCard: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), w = 400, h = 290;
      var state = (s.state === 'open' || s.state === 'cleared') ? s.state : 'locked';
      var idx = Math.floor(num(s.index, 1)), name = (s.name == null ? '' : String(s.name));
      ctx.save();
      panel(ctx, x, y, w, h, state === 'cleared' ? C.crystalDark : C.border, state === 'locked' ? '#151a2a' : C.panel);
      // 縮圖外框
      ctx.lineWidth = 2; ctx.strokeStyle = '#0a0d18';
      ctx.strokeRect(x + 7, y + 7, 386, 218);
      if (state === 'locked') {
        ctx.fillStyle = '#0d111d'; ctx.fillRect(x + 8, y + 8, 384, 216);
        ctx.strokeStyle = '#1b2134'; ctx.lineWidth = 1;
        for (var gx = 8; gx < 392; gx += 24) { ctx.beginPath(); ctx.moveTo(x + gx + 0.5, y + 8); ctx.lineTo(x + gx + 0.5, y + 224); ctx.stroke(); }
        lockIcon(ctx, x + 200, y + 92, 56, s.canAfford ? C.text : C.lock);
        costLine(ctx, s.cost, !!s.canAfford, x + 200, y + 168, 26, 'center');
      }
      // 文字區
      txt(ctx, '第' + idx + '關', x + 16, y + 246, { size: 15, color: C.textDim });
      txt(ctx, name, x + 16, y + 272, { size: 22, color: state === 'locked' ? C.textDim : C.text });
      if (state === 'cleared') {
        txt(ctx, '/分', x + 384, y + 248, { size: 15, color: C.textDim, align: 'right' });
        txt(ctx, fmt1(s.rate), x + 356, y + 248, { size: 24, color: C.crystal, align: 'right' });
        crystalShape(ctx, x + 278, y + 248, 18);
        txt(ctx, '回放', x + 340, y + 276, { size: 14, color: C.textDim, align: 'right' });
        classBadge(ctx, s.recordCls, x + 370, y + 275, 11);
      } else if (state === 'open') {
        txt(ctx, '未過關', x + 384, y + 260, { size: 18, color: C.textDim, align: 'right' });
      } else {
        txt(ctx, '未開放', x + 384, y + 260, { size: 18, color: C.lock, align: 'right' });
      }
      if (s.selected) selectFrame(ctx, x, y, w, h);
      ctx.restore();
    },

    drawClassCard: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), w = 240, h = 140, c = cls(s.cls);
      var state = (s.state === 'owned' || s.state === 'active') ? s.state : 'locked';
      var name = s.name == null ? CLS_NAME[c] : String(s.name);
      ctx.save();
      panel(ctx, x, y, w, h, state === 'active' ? C[c] : C.border, state === 'locked' ? '#151a2a' : C.panel);
      if (state === 'active') { rr(ctx, x + 5, y + 5, w - 10, h - 10, 9); ctx.lineWidth = 2; ctx.strokeStyle = C[c]; ctx.stroke(); }
      // 頭像
      rr(ctx, x + 12, y + 14, 72, 112, 8); ctx.fillStyle = state === 'locked' ? '#0d111d' : '#10152a'; ctx.fill();
      ctx.save();
      ctx.translate(x + 48, y + 72); ctx.scale(2, 2);
      figure(ctx, { x: 0, y: 0, cls: c, facing: 1, pose: 'idle' }, state === 'locked' ? 'locked' : 'player');
      ctx.restore();
      txt(ctx, name, x + 98, y + 34, { size: 22, color: state === 'locked' ? C.textDim : C.text });
      txt(ctx, CLS_SKILL[c], x + 98, y + 62, { size: 13, color: C.textDim, weight: 'normal' });
      if (state === 'locked') {
        lockIcon(ctx, x + 108, y + 102, 24, s.canAfford ? C.text : C.lock);
        costLine(ctx, s.cost, !!s.canAfford, x + 124, y + 104, 20);
      } else if (state === 'active') {
        rr(ctx, x + 98, y + 88, 84, 30, 15); ctx.fillStyle = C[c]; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
        txt(ctx, '使用中', x + 140, y + 103, { size: 16, color: '#ffffff', align: 'center' });
      } else {
        txt(ctx, '已擁有', x + 98, y + 103, { size: 16, color: C.textDim });
      }
      if (s.selected) selectFrame(ctx, x, y, w, h);
      ctx.restore();
    },

    drawUpgradeCard: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), w = 420, h = 140;
      var maxL = clamp(Math.floor(num(s.maxLevel, 3)), 1, 10), lv = clamp(Math.floor(num(s.level, 0)), 0, maxL);
      var full = lv >= maxL || s.cost == null;
      ctx.save();
      panel(ctx, x, y, w, h, C.border);
      // 靴子圖示
      rr(ctx, x + 12, y + 14, 72, 112, 8); ctx.fillStyle = '#10152a'; ctx.fill();
      ctx.save(); ctx.translate(x + 48, y + 72);
      ctx.beginPath(); ctx.moveTo(-12, -24); ctx.lineTo(6, -24); ctx.lineTo(6, 4); ctx.lineTo(22, 10); ctx.lineTo(22, 22); ctx.lineTo(-12, 22); ctx.closePath();
      ctx.fillStyle = '#b07a3c'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.fillStyle = '#7a4f24'; ctx.fillRect(-12, 16, 34, 6);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-26, -10); ctx.lineTo(-17, -10); ctx.moveTo(-28, 0); ctx.lineTo(-17, 0); ctx.moveTo(-26, 10); ctx.lineTo(-17, 10); ctx.stroke();
      ctx.restore();
      txt(ctx, '疾行靴', x + 98, y + 34, { size: 22 });
      txt(ctx, '每級移速 +10%', x + 98, y + 62, { size: 13, color: C.textDim, weight: 'normal' });
      // 等級格
      for (var i = 0; i < maxL; i++) {
        var bx = x + 98 + i * 40;
        rr(ctx, bx, y + 90, 32, 26, 5);
        ctx.fillStyle = i < lv ? C.gold : '#0d111d'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = i < lv ? C.outline : C.border; ctx.stroke();
      }
      txt(ctx, 'Lv ' + lv, x + 98 + maxL * 40 + 6, y + 103, { size: 16, color: C.textDim });
      if (full) {
        txt(ctx, '已滿級', x + 404, y + 103, { size: 20, color: C.gold, align: 'right' });
      } else {
        costLine(ctx, s.cost, !!s.canAfford, x + 304, y + 103, 20);
      }
      if (s.selected) selectFrame(ctx, x, y, w, h);
      ctx.restore();
    },

    drawGoalCard: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 0), y = num(s.y, 0), w = 1220, h = 90, ok = !!s.canAfford;
      ctx.save();
      panel(ctx, x, y, w, h, ok ? C.gold : C.border, ok ? '#2a2618' : C.panel);
      // 翅膀圖示
      ctx.save(); ctx.translate(x + 60, y + 45);
      for (var side = -1; side <= 1; side += 2) {
        for (var k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(side * (10 + k * 7), -6 + k * 7, 14 - k * 2, 5, side * (0.5 + k * 0.25), 0, Math.PI * 2);
          ctx.fillStyle = ok ? (k ? '#ffe6a0' : '#ffffff') : '#5a6180'; ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
        }
      }
      ctx.restore();
      txt(ctx, '傳說之翼', x + 120, y + 34, { size: 26, color: ok ? C.gold : C.text });
      txt(ctx, '終極目標 · 買下即通關', x + 120, y + 64, { size: 14, color: C.textDim, weight: 'normal' });
      costLine(ctx, s.cost, ok, x + 1020, y + 45, 28);
      if (s.selected) selectFrame(ctx, x, y, w, h);
      ctx.restore();
    },

    drawPopup: function (ctx, s) {
      s = st(s);
      var dur = Math.max(0.01, num(s.dur, 0.8)), p = clamp(num(s.t, 0) / dur, 0, 1);
      var x = num(s.x, 0), y = num(s.y, 0) - 30 * p;
      var v = Math.floor(num(s.value, 1));
      ctx.save();
      ctx.globalAlpha = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
      crystalShape(ctx, x - 11, y, 16);
      txt(ctx, '+' + v, x - 1, y + 1, { size: 18, color: C.crystalLight, stroke: C.outline, strokeW: 4 });
      ctx.restore();
    },

    // ===== HUD =====
    drawHud: function (ctx, s) {
      s = st(s);
      var mode = s.mode === 'level' ? 'level' : 'map';
      ctx.save();
      ctx.fillStyle = C.hudBg; ctx.fillRect(0, 0, W, HUD_H);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, HUD_H - 1, W, 1);
      // 右側常駐: 持有晶石 + 總產量(兩種模式同位置)
      crystalShape(ctx, 1000, 20, 22);
      txt(ctx, intStr(s.stock), 1016, 21, { size: 22, color: C.crystalLight });
      txt(ctx, '/分', 1268, 21, { size: 14, color: C.textDim, align: 'right' });
      txt(ctx, '產量 +' + fmt1(s.incomePerMin), 1240, 21, { size: 16, color: C.crystal, align: 'right' });
      if (mode === 'level') {
        classBadge(ctx, s.cls, 24, 20, 13);
        var maxHp = clamp(Math.floor(num(s.maxHp, 3)), 0, 10), hp = clamp(Math.floor(num(s.hp, maxHp)), 0, maxHp);
        for (var i = 0; i < maxHp; i++) heart(ctx, 58 + i * 26, 20, 10, i < hp);
        txt(ctx, '時間', 160, 21, { size: 13, color: C.textDim });
        txt(ctx, fmt1(s.time) + 's', 192, 21, { size: 18 });
        txt(ctx, '本趟', 290, 21, { size: 13, color: C.textDim });
        crystalShape(ctx, 330, 20, 16);
        txt(ctx, intStr(s.runCount), 342, 21, { size: 18, color: C.crystalLight });
        txt(ctx, '紀錄', 410, 21, { size: 13, color: C.textDim });
        txt(ctx, s.recordRate == null ? '—' : fmt1(s.recordRate) + '/分', 442, 21, { size: 18, color: s.recordRate == null ? C.textDim : C.text });
        // 技能冷卻環
        var cd = Math.max(0.0001, num(s.skillCdDur, 1)), ct = clamp(num(s.skillCdT, cd), 0, cd), ready = ct >= cd;
        var cx = 590, cy = 20, R = 12;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#0d111d'; ctx.fill();
        if (ready) {
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = C[cls(s.cls)]; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ct / cd)); ctx.closePath();
          ctx.globalAlpha = 0.55; ctx.fillStyle = C[cls(s.cls)]; ctx.fill(); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.strokeStyle = C.border; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        }
        txt(ctx, ready ? '技能 可用' : '技能', 610, 21, { size: 15, color: ready ? C.text : C.textDim });
      }
      ctx.restore();
    },

    // ===== 面板 =====
    drawResultPanel: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 320), y = num(s.y, 160), w = 640, h = 400;
      var res = (s.result === 'record' || s.result === 'kept') ? s.result : 'first';
      ctx.save();
      panel(ctx, x, y, w, h, res === 'record' ? C.gold : C.border);
      txt(ctx, '過關', x + w / 2, y + 50, { size: 36, align: 'center' });
      // 三列數據
      var rows = [['秒數', fmt1(s.time) + 's', C.text], ['晶石', intStr(s.count), C.crystalLight]];
      rows.forEach(function (r, i) {
        var ry = y + 110 + i * 44;
        txt(ctx, r[0], x + 150, ry, { size: 18, color: C.textDim });
        txt(ctx, r[1], x + 490, ry, { size: 24, color: r[2], align: 'right' });
      });
      crystalShape(ctx, x + 400, y + 154, 18);
      // 效率(主角)
      rr(ctx, x + 120, y + 182, 400, 64, 10); ctx.fillStyle = C.panelLight; ctx.fill();
      txt(ctx, '效率', x + 150, y + 214, { size: 18, color: C.textDim });
      txt(ctx, '/分', x + 490, y + 216, { size: 16, color: C.textDim, align: 'right' });
      txt(ctx, fmt1(s.rate), x + 458, y + 214, { size: 34, color: C.crystal, align: 'right' });
      // 結果徽章
      var by = y + 290;
      if (res === 'record') {
        txt(ctx, '新紀錄! 已取代回放', x + w / 2, by, { size: 22, color: C.gold, align: 'center' });
        txt(ctx, '原紀錄 ' + (s.oldRate == null ? '—' : fmt1(s.oldRate) + '/分') + '  →  ' + fmt1(s.rate) + '/分', x + w / 2, by + 30, { size: 16, color: C.textDim, align: 'center', weight: 'normal' });
      } else if (res === 'kept') {
        txt(ctx, '未破紀錄 · 保留原回放', x + w / 2, by, { size: 22, color: C.text, align: 'center' });
        txt(ctx, '紀錄 ' + (s.oldRate == null ? '—' : fmt1(s.oldRate) + '/分'), x + w / 2, by + 30, { size: 16, color: C.textDim, align: 'center', weight: 'normal' });
      } else {
        txt(ctx, '首次過關 · 已存成回放', x + w / 2, by, { size: 22, color: C.good, align: 'center' });
        txt(ctx, '回大地圖後會一直重播賺晶石', x + w / 2, by + 30, { size: 16, color: C.textDim, align: 'center', weight: 'normal' });
      }
      // 按鍵提示
      var ky = y + h - 36;
      keycap(ctx, 'Z', x + 180, ky, 28); txt(ctx, '回大地圖', x + 202, ky, { size: 17 });
      keycap(ctx, 'X', x + 360, ky, 28); txt(ctx, '再跑一次', x + 382, ky, { size: 17 });
      ctx.restore();
    },

    drawFailPanel: function (ctx, s) {
      s = st(s);
      var x = num(s.x, 380), y = num(s.y, 240), w = 520, h = 240;
      ctx.save();
      panel(ctx, x, y, w, h, C.bad);
      txt(ctx, '失敗', x + w / 2, y + 66, { size: 40, color: C.bad, align: 'center' });
      txt(ctx, '這趟作廢, 晶石不入帳', x + w / 2, y + 116, { size: 16, color: C.textDim, align: 'center', weight: 'normal' });
      var ky = y + 180;
      keycap(ctx, 'Z', x + 120, ky, 28); txt(ctx, '重來', x + 142, ky, { size: 18 });
      keycap(ctx, 'X', x + 280, ky, 28); txt(ctx, '回大地圖', x + 302, ky, { size: 18 });
      ctx.restore();
    },

    drawPausePanel: function (ctx, s) {
      s = st(s);
      var mode = s.mode === 'map' ? 'map' : 'level';
      var x = 380, y = 220, w = 520, h = 280;
      ctx.save();
      ctx.fillStyle = C.shade; ctx.fillRect(0, 0, W, H);
      panel(ctx, x, y, w, h, C.border);
      txt(ctx, '暫停', x + w / 2, y + 80, { size: 40, align: 'center' });
      var ky = y + 190;
      if (mode === 'level') {
        keycap(ctx, 'Esc', x + 70, ky, 28); txt(ctx, '繼續', x + 96, ky, { size: 18 });
        keycap(ctx, 'Z', x + 200, ky, 28); txt(ctx, '重來', x + 222, ky, { size: 18 });
        keycap(ctx, 'X', x + 320, ky, 28); txt(ctx, '回大地圖', x + 342, ky, { size: 18 });
      } else {
        keycap(ctx, 'Esc', x + 220, ky, 28); txt(ctx, '繼續', x + 246, ky, { size: 18 });
      }
      ctx.restore();
    },

    drawEndingPanel: function (ctx, s) {
      s = st(s);
      var x = 280, y = 150, w = 720, h = 420;
      var tt = Math.max(0, Math.floor(num(s.totalTime, 0)));
      var mm = Math.floor(tt / 60), ss = tt % 60;
      ctx.save();
      panel(ctx, x, y, w, h, C.gold, '#221f16');
      // 翅膀
      ctx.save(); ctx.translate(x + w / 2, y + 110);
      for (var side = -1; side <= 1; side += 2) for (var k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.ellipse(side * (22 + k * 16), -12 + k * 14, 30 - k * 5, 10, side * (0.5 + k * 0.25), 0, Math.PI * 2);
        ctx.fillStyle = k ? '#ffe6a0' : '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.outline; ctx.stroke();
      }
      ctx.restore();
      txt(ctx, '取得傳說之翼', x + w / 2, y + 210, { size: 40, color: C.gold, align: 'center' });
      txt(ctx, '總遊玩時間', x + w / 2, y + 268, { size: 18, color: C.textDim, align: 'center' });
      txt(ctx, mm + ':' + (ss < 10 ? '0' : '') + ss, x + w / 2, y + 304, { size: 32, align: 'center' });
      keycap(ctx, 'Z', x + w / 2 - 60, y + 370, 30); txt(ctx, '重新開始', x + w / 2 - 36, y + 370, { size: 20 });
      ctx.restore();
    },

    // ===== 說明頁示意圖(只畫在框內) =====
    drawGuidePage: function (ctx, s) {
      s = st(s);
      var page = clamp(Math.floor(num(s.page, 0)), 0, 3);
      ctx.save();
      if (page === 0) guide0(ctx, s);
      else if (page === 1) guide1(ctx, s);
      else if (page === 2) guide2(ctx, s);
      else guide3(ctx, s);
      ctx.restore();
    }
  };

  function heart(ctx, x, y, r, full) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.2, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.closePath();
    ctx.fillStyle = full ? C.heart : C.heartEmpty; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
    ctx.restore();
  }

  // 第 1 頁: 衝到終點(虛擬 800x450 的關卡片段)
  function guide0(ctx, s) {
    fitBox(ctx, s, 800, 450);
    ctx.save(); ctx.scale(800 / W, 450 / H); Art.drawBackground(ctx); ctx.restore();
    for (var gx = 20; gx < 800; gx += 40) {
      var stepCol = (gx === 380 || gx === 420);
      Art.drawGround(ctx, { x: gx, y: 420, top: !stepCol });
      Art.drawGround(ctx, { x: gx, y: 460, top: false });
    }
    Art.drawGround(ctx, { x: 380, y: 380, top: true });
    Art.drawGround(ctx, { x: 420, y: 380, top: true });
    Art.drawCrystal(ctx, { x: 230, y: 330, t: 0 });
    Art.drawCrystal(ctx, { x: 400, y: 320, t: 0.5 });
    Art.drawCrystal(ctx, { x: 650, y: 370, t: 1 });
    Art.drawSlime(ctx, { x: 540, y: 386, facing: -1, hp: 2, maxHp: 2, hurtT: 0.15, hurtDur: 0.15 });
    Art.drawGoal(ctx, { x: 750, y: 360, reached: false });
    Art.drawPlayer(ctx, { x: 70, y: 378, cls: 'sword', facing: 1, pose: 'idle', attackT: 0.2, attackDur: 0.2 });
    dashedPath(ctx, [[92, 378], [150, 378], ['q', 220, 270, 300, 378], [340, 378], ['q', 370, 300, 400, 338], [430, 338], ['q', 540, 230, 610, 378], [700, 378]], '#ffffff', 5);
    txt(ctx, '你', 70, 336, { size: 26, align: 'center', stroke: C.outline, strokeW: 5 });
    txt(ctx, '終點', 750, 300, { size: 26, align: 'center', stroke: C.outline, strokeW: 5 });
  }

  // 第 2 頁: 四個按鍵 × 劍士動作(虛擬 560x200)
  function guide1(ctx, s) {
    fitBox(ctx, s, 560, 200);
    ctx.fillStyle = '#141a2c'; ctx.fillRect(0, 0, 560, 200);
    var cells = [
      { keys: ['←', '→'], pose: 'run', px: 50, py: 81 },
      { keys: ['Z'], pose: 'rise', px: 50, py: 52 },
      { keys: ['X'], pose: 'idle', px: 26, py: 81, attack: true },
      { keys: ['空白'], pose: 'dash', px: 58, py: 81 }
    ];
    cells.forEach(function (cell, i) {
      ctx.save();
      ctx.translate(i * 140, 0);
      ctx.beginPath(); ctx.rect(2, 2, 136, 196); ctx.clip();
      rr(ctx, 4, 4, 132, 192, 8); ctx.fillStyle = '#1b2238'; ctx.fill();
      ctx.save();
      ctx.scale(1.4, 1.4);
      for (var gx = 0; gx <= 120; gx += 40) Art.drawGround(ctx, { x: gx, y: 123, top: true });
      if (cell.pose === 'rise') {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cell.px, 100); ctx.lineTo(cell.px, 76); ctx.stroke(); ctx.restore();
      }
      Art.drawPlayer(ctx, { x: cell.px, y: cell.py, cls: 'sword', facing: 1, pose: cell.pose, attackT: cell.attack ? 0.08 : 0.2, attackDur: 0.2 });
      ctx.restore();
      // 鍵帽(物件旁短標籤)
      if (cell.keys.length === 2) { keycap(ctx, cell.keys[0], 50, 26, 28); keycap(ctx, cell.keys[1], 90, 26, 28); }
      else keycap(ctx, cell.keys[0], 70, 26, 28);
      ctx.restore();
    });
  }

  // 第 3 頁: 已過關卡片縮圖裡殘影撿晶石 → +1, 資訊列晶石數增加(虛擬 480x300)
  function guide2(ctx, s) {
    fitBox(ctx, s, 480, 300);
    // 資訊列片段
    rr(ctx, 40, 4, 400, 40, 8); ctx.fillStyle = C.hudBg; ctx.fill();
    crystalShape(ctx, 90, 24, 22);
    txt(ctx, '128', 106, 25, { size: 20, color: C.textDim });
    ctx.save(); ctx.fillStyle = C.crystal;
    ctx.beginPath(); ctx.moveTo(196, 16); ctx.lineTo(214, 24); ctx.lineTo(196, 32); ctx.closePath(); ctx.fill(); ctx.restore();
    crystalShape(ctx, 250, 24, 26);
    txt(ctx, '129', 268, 25, { size: 26, color: C.crystalLight, stroke: C.outline, strokeW: 3 });
    // 卡片(0.8 倍)
    ctx.save();
    ctx.translate(80, 58); ctx.scale(0.8, 0.8);
    Art.drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '草原', state: 'cleared', rate: 18.5, recordCls: 'sword', cost: 0, canAfford: true, selected: false });
    ctx.save();
    ctx.beginPath(); ctx.rect(8, 8, 384, 216); ctx.clip();
    ctx.translate(8, 8); ctx.scale(0.3, 0.3);
    drawSample(ctx, { x: 500, y: 498, cls: 'sword', facing: 1, pose: 'run', attackT: 0.2, attackDur: 0.2 });
    ctx.restore();
    Art.drawPopup(ctx, { x: 8 + 500 * 0.3, y: 8 + 470 * 0.3, t: 0.2, dur: 0.8, value: 1 });
    ctx.restore();
  }

  // 第 4 頁: 同一關兩種走法(虛擬 560x240)
  function guide3(ctx, s) {
    fitBox(ctx, s, 560, 240);
    var k = 0.2, tw = 1280 * k, th = 720 * k;
    var routes = [
      { ox: 16, label: '晶石多 / 秒數長', pts: [[100, 618], [300, 618], ['q', 330, 540, 380, 578], ['q', 390, 500, 420, 538], ['q', 430, 460, 470, 498], [560, 498], ['q', 640, 470, 680, 618], [1150, 618]] },
      { ox: 288, label: '晶石少 / 秒數短', pts: [[100, 618], [300, 618], ['q', 340, 530, 380, 578], ['q', 420, 500, 460, 618], [1150, 618]] }
    ];
    routes.forEach(function (r) {
      ctx.save();
      ctx.translate(r.ox, 20);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, tw, th); ctx.clip();
      ctx.scale(k, k);
      drawSample(ctx, null);
      Art.drawGhost(ctx, { x: 100, y: 618, cls: 'sword', facing: 1, pose: 'run', attackT: 0.2, attackDur: 0.2 });
      dashedPath(ctx, r.pts, '#ffffff', 16);
      ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = C.border; ctx.strokeRect(-1, -1, tw + 2, th + 2);
      txt(ctx, r.label, tw / 2, th + 34, { size: 20, align: 'center', stroke: C.outline, strokeW: 4 });
      ctx.restore();
    });
  }

  window.Art = Art;
})();
