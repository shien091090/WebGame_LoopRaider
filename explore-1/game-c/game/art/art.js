/* 連斬回廊 — 美術繪製模組(explore-1 / game-c)
 * 全域 window.Art, 不用 ES module。純 Canvas 2D 幾何, 無外部資源。
 * 只負責「給狀態, 畫出來」, 不含任何遊戲邏輯。
 */
(function () {
  'use strict';

  // ---------- 設計座標常數 ----------
  var W = 1280, H = 720, HUD_H = 40;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Noto Sans CJK TC",sans-serif';

  var P = {
    bg: '#10131f', bg2: '#181d30', bgPillar: '#151a2a', bgPillarEdge: '#1f2640',
    mapBg: '#0d1620', mapBg2: '#142333',
    ground: '#3b3437', groundLine: '#2a2427', groundTop: '#a3927c', groundTopDark: '#6b5d4f',
    spike: '#cfd3dc', spikeBase: '#5a1a22', danger: '#ff4d5e',
    crate: '#8c96a8', crateDark: '#3f4757', crateLight: '#c3cad6',
    knight: '#5b9cff', knightDark: '#24467e',
    assassin: '#b06cff', assassinDark: '#4f2a85',
    wind: '#4fe08a', windDark: '#1f6e45', windOff: '#5d6b63', windOffDark: '#343d38',
    coin: '#ffd23f', coinDark: '#b87a0c', coinShine: '#fff6c8',
    tier1: '#efe9dc', tier2: '#ffd23f', tier3: '#ff9f1c',
    goalWhite: '#f2f2f2', goalBlack: '#262626', goalPole: '#c9c2b5',
    imp: '#ff4d5e', impDark: '#7d1824',
    eyeWhite: '#f4ecd8', eyeIris: '#ff4d5e', eyeWing: '#7a1f2b',
    poof: '#ece7dd',
    outline: '#07080d', text: '#f2f0ea', textDim: '#8b8fa3', textOff: '#5a5f73',
    panel: '#1b2033', panelEdge: '#3c4565', panelInner: '#23293f',
    select: '#ffffff', hud: 'rgba(8,10,18,0.84)', poor: '#ff7a7a', ghostEdge: '#eaf2ff',
    player: '#b06cff'
  };

  var CLS = {
    assassin: { w: 28, h: 36, col: P.assassin, dark: P.assassinDark },
    knight:   { w: 32, h: 44, col: P.knight,   dark: P.knightDark },
    wind:     { w: 28, h: 44, col: P.wind,     dark: P.windDark }
  };
  var POSES = { idle: 1, run: 1, rise: 1, fall: 1, dash: 1, slam: 1, glide: 1, hurt: 1 };

  // ---------- 正規化小工具 ----------
  function S(s) { return (s && typeof s === 'object') ? s : {}; }
  function num(v, d) { v = Number(v); return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function normCls(c) { return CLS[c] ? c : 'assassin'; }
  function normPose(p) { return POSES[p] ? p : 'idle'; }
  function normFacing(f) { return num(f, 1) < 0 ? -1 : 1; }
  function str(v, d) { return (v === null || v === undefined) ? d : String(v).slice(0, 40); }
  function fmt1(v) { v = num(v, 0); return v.toFixed(1); }
  function nowMs() {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    return Date.now();
  }
  function font(size, bold) { return (bold ? 'bold ' : '') + Math.round(size) + 'px ' + FONT; }
  function tw(s, size) { // 文字寬估算(不依賴 measureText)
    s = String(s); var w = 0;
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 255 ? size : size * 0.58;
    return w;
  }

  // ---------- 繪圖小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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
  function text(ctx, s, x, y, size, color, align, bold, outline) {
    ctx.font = font(size, bold);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = outline;
      ctx.lineWidth = Math.max(3, size * 0.22);
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function coinIcon(ctx, x, y, r, dim) {
    circle(ctx, x, y, r);
    ctx.fillStyle = dim ? '#6b6250' : P.coin; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.25); ctx.strokeStyle = dim ? '#3b3528' : P.coinDark; ctx.stroke();
    circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.28);
    ctx.fillStyle = dim ? '#8a8270' : P.coinShine; ctx.fill();
  }
  // 鍵帽: 中心 (x,y)
  function keycap(ctx, x, y, label, size) {
    size = size || 26;
    var w = Math.max(size, tw(label, size * 0.55) + size * 0.5);
    var h = size;
    rr(ctx, x - w / 2, y - h / 2 + 2, w, h, 5); ctx.fillStyle = '#5c6070'; ctx.fill();
    rr(ctx, x - w / 2, y - h / 2, w, h - 2, 5); ctx.fillStyle = '#eef0f5'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#2b2e3a'; ctx.stroke();
    text(ctx, label, x, y - 1, size * 0.55, '#1b1d26', 'center', true);
    return w;
  }
  function keyW(label, size) { size = size || 26; return Math.max(size, tw(label, size * 0.55) + size * 0.5); }
  // 一列 [鍵帽 + 動作] 提示, 水平置中於 cx
  function keyHints(ctx, items, cx, y, size) {
    size = size || 18; var cap = size + 8, gap = 26, total = 0, i;
    for (i = 0; i < items.length; i++) total += keyW(items[i][0], cap) + 8 + tw(items[i][1], size) + (i ? gap : 0);
    var x = cx - total / 2;
    for (i = 0; i < items.length; i++) {
      if (i) x += gap;
      var kw = keyW(items[i][0], cap);
      keycap(ctx, x + kw / 2, y, items[i][0], cap);
      x += kw + 8;
      text(ctx, items[i][1], x, y, size, P.text, 'left', true);
      x += tw(items[i][1], size);
    }
  }
  function lockIcon(ctx, x, y, s, col) {
    ctx.lineWidth = s * 0.16; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(x, y - s * 0.15, s * 0.28, Math.PI, 0); ctx.stroke();
    rr(ctx, x - s * 0.42, y - s * 0.15, s * 0.84, s * 0.62, s * 0.08); ctx.fillStyle = col; ctx.fill();
    circle(ctx, x, y + s * 0.1, s * 0.08); ctx.fillStyle = '#111'; ctx.fill();
  }
  function crownIcon(ctx, x, y, s, col, dark) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 0.3);
    ctx.lineTo(x - s * 0.5, y - s * 0.2);
    ctx.lineTo(x - s * 0.25, y + s * 0.02);
    ctx.lineTo(x, y - s * 0.35);
    ctx.lineTo(x + s * 0.25, y + s * 0.02);
    ctx.lineTo(x + s * 0.5, y - s * 0.2);
    ctx.lineTo(x + s * 0.5, y + s * 0.3);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeStyle = dark; ctx.stroke();
    ctx.fillStyle = dark; ctx.fillRect(x - s * 0.5, y + s * 0.18, s, s * 0.06);
    circle(ctx, x, y - s * 0.35, s * 0.07); ctx.fillStyle = '#fff6c8'; ctx.fill();
  }
  // 重騎機關的共同記號: 向下的重量三角 ▼
  function weightMark(ctx, x, y, s, col) {
    ctx.beginPath();
    ctx.moveTo(x - s / 2, y - s * 0.35);
    ctx.lineTo(x + s / 2, y - s * 0.35);
    ctx.lineTo(x, y + s * 0.4);
    ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }
  function arrowHead(ctx, x, y, ang, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function dashedPath(ctx, pts, col, lw, dash) {
    if (!pts.length) return;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.setLineDash(dash || [8, 6]); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(); ctx.setLineDash([]);
    var a = pts[pts.length - 2], b = pts[pts.length - 1];
    if (a) arrowHead(ctx, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), lw * 2.6, col);
  }

  // ---------- 角色(玩家 / 殘影共用) ----------
  // 原點 = 判定框中心, 面向右; opt: { mono, outline, eyesX }
  function limb(ctx, x1, y1, x2, y2, lw, col, out) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = lw + 2; ctx.strokeStyle = out; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
  }
  function part(ctx, fill, out) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = out; ctx.stroke(); }

  var LEGS = { // 腳尖相對(x 比例 × 半寬, y 比例 × 腿長)
    idle: [[-0.3, 1], [0.3, 1]], run: [[-0.6, 1], [0.5, 0.85]], rise: [[-0.2, 0.55], [0.35, 0.6]],
    fall: [[-0.5, 1], [0.45, 0.9]], dash: [[-0.6, 0.75], [-0.1, 1]], slam: [[-0.2, 1], [0.2, 1]],
    glide: [[-0.2, 1], [0.15, 0.9]], hurt: [[-0.45, 1], [0.4, 1]]
  };
  var ARMS = { // 手相對肩膀(x 比例 × 半寬, dy px)
    idle: [[-0.25, 11], [0.35, 11]], run: [[-0.5, 8], [0.6, 5]], rise: [[-0.35, -6], [0.45, -6]],
    fall: [[-0.65, -3], [0.65, -3]], dash: [[0.75, 2], [0.6, 6]], slam: [[-0.55, -5], [0.55, -5]],
    glide: [[-0.86, 1], [0.86, 1]], hurt: [[-0.65, 2], [-0.4, 8]]
  };

  function figure(ctx, cls, pose, opt) {
    opt = opt || {};
    var c = CLS[cls], hw = c.w / 2, B = c.h / 2, T = -c.h / 2;
    var col = opt.mono || c.col, dark = opt.mono || c.dark, out = opt.outline || P.outline;
    var face = opt.mono ? opt.mono : '#14121c';
    var g;
    if (cls === 'knight') g = { lw: 6, hipY: 12, torsoT: -6, torsoB: 13, torsoW: 22, shoulderY: -3 };
    else if (cls === 'wind') g = { lw: 4, hipY: 14, torsoT: -2, torsoB: 16, torsoW: 12, shoulderY: 0 };
    else g = { lw: 5, hipY: 9, torsoT: -2, torsoB: 10, torsoW: 14, shoulderY: 0 };
    var footY = B - (g.lw + 2) / 2, legLen = footY - g.hipY;

    ctx.save();
    if (pose === 'dash') ctx.transform(1, 0, -0.18, 1, 0, 0); // 前傾
    // 腿
    var L = LEGS[pose];
    for (var i = 0; i < 2; i++) {
      var hx = (i ? 0.25 : -0.25) * g.torsoW * 0.8;
      var fx = clamp(L[i][0] * (hw - 3), -hw + 3, hw - 3);
      limb(ctx, hx, g.hipY, fx, g.hipY + L[i][1] * legLen, g.lw, dark, out);
    }
    // 後手臂
    var A = ARMS[pose];
    var ax = clamp(A[0][0] * hw, -hw + 3, hw - 3);
    limb(ctx, -2, g.shoulderY, ax, clamp(g.shoulderY + A[0][1], T + 3, B - 3), 3.5, dark, out);

    // 風術士滑翔: 披風張開
    if (pose === 'glide' && cls === 'wind') {
      ctx.beginPath(); ctx.moveTo(-hw + 2, g.shoulderY + 1); ctx.lineTo(0, g.shoulderY - 2); ctx.lineTo(hw - 2, g.shoulderY + 1);
      ctx.lineTo(hw - 6, g.shoulderY + 9); ctx.lineTo(0, g.torsoB - 4); ctx.lineTo(-hw + 6, g.shoulderY + 9); ctx.closePath();
      part(ctx, opt.mono ? col : '#bff5d4', out);
    }

    // 軀幹
    if (cls === 'wind') {
      ctx.beginPath();
      ctx.moveTo(-g.torsoW / 2, g.torsoT); ctx.lineTo(g.torsoW / 2, g.torsoT);
      ctx.lineTo(g.torsoW / 2 + 4, g.torsoB); ctx.lineTo(-g.torsoW / 2 - 4, g.torsoB); ctx.closePath();
      part(ctx, col, out);
    } else {
      rr(ctx, -g.torsoW / 2, g.torsoT, g.torsoW, g.torsoB - g.torsoT, 3); part(ctx, col, out);
    }
    if (cls === 'knight') { // 肩甲 + 腰帶
      circle(ctx, -hw + 5, g.torsoT + 3, 4.5); part(ctx, dark, out);
      circle(ctx, hw - 5, g.torsoT + 3, 4.5); part(ctx, dark, out);
      ctx.fillStyle = opt.mono ? col : '#d6e4ff'; ctx.fillRect(-g.torsoW / 2 + 2, g.torsoB - 5, g.torsoW - 4, 2);
    }
    if (cls === 'assassin') { // 圍巾往後飄
      ctx.beginPath(); ctx.moveTo(-3, g.torsoT); ctx.quadraticCurveTo(-9, g.torsoT - 2, -hw + 2, g.torsoT + 4);
      ctx.lineTo(-hw + 4, g.torsoT + 7); ctx.quadraticCurveTo(-8, g.torsoT + 3, -2, g.torsoT + 3); ctx.closePath();
      part(ctx, opt.mono ? col : '#ff6fb0', out);
    }

    // 頭
    if (cls === 'knight') {
      rr(ctx, -9, T + 2, 18, 16, 4); part(ctx, col, out);
      ctx.fillStyle = face; ctx.fillRect(-2, T + 9, 10, 3); // 面罩縫
      ctx.fillStyle = opt.mono ? col : P.danger; ctx.fillRect(-3, T + 2, 6, 3); // 盔頂紅纓
    } else if (cls === 'wind') {
      circle(ctx, 1, -7, 6); part(ctx, opt.mono ? col : '#f0d9b5', out);
      ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(9, -10); ctx.lineTo(-3, T + 1); ctx.closePath(); // 尖帽
      part(ctx, dark, out);
      ctx.fillStyle = face; ctx.fillRect(3, -8, 2, 3);
    } else {
      ctx.beginPath(); ctx.arc(1, T + 9, 8, 0, Math.PI * 2); part(ctx, col, out); // 兜帽
      ctx.beginPath(); ctx.ellipse(3.5, T + 10, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fillStyle = face; ctx.fill();
      if (!opt.eyesX) { ctx.fillStyle = opt.mono ? col : '#ffffff'; ctx.fillRect(3, T + 9, 4, 1.8); }
    }
    if (opt.eyesX) { // 受傷: X 眼
      var ex = cls === 'knight' ? 3 : 4, ey = cls === 'knight' ? T + 10 : (cls === 'wind' ? -7 : T + 10);
      ctx.lineWidth = 1.6; ctx.strokeStyle = P.danger; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 2, ey - 2); ctx.lineTo(ex + 2, ey + 2); ctx.moveTo(ex + 2, ey - 2); ctx.lineTo(ex - 2, ey + 2); ctx.stroke();
    }
    // 前手臂
    ax = clamp(A[1][0] * hw, -hw + 3, hw - 3);
    limb(ctx, 2, g.shoulderY, ax, clamp(g.shoulderY + A[1][1], T + 3, B - 3), 3.5, col, out);
    ctx.restore();

    // 重騎震地: 框內的下墜速度線
    if (pose === 'slam') {
      ctx.lineWidth = 2; ctx.strokeStyle = opt.mono ? col : '#e6f0ff'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-hw + 2, T + 2); ctx.lineTo(-hw + 2, T + 16);
      ctx.moveTo(hw - 2, T + 2); ctx.lineTo(hw - 2, T + 16);
      ctx.moveTo(-hw + 6, T + 1); ctx.lineTo(-hw + 6, T + 8);
      ctx.stroke();
    }
  }

  // 角色完整繪製: 衝刺拖影 → 本體; ghost=true 為回放殘影
  function drawCharacter(ctx, s, ghost) {
    var cls = normCls(s.cls), pose = normPose(s.pose), facing = normFacing(s.facing);
    var x = num(s.x, 0), y = num(s.y, 0), c = CLS[cls];
    if (cls !== 'knight' && pose === 'slam') pose = 'fall';
    if (cls !== 'wind' && pose === 'glide') pose = 'fall';
    var baseA = ghost ? 0.55 : 1;
    if (!ghost && s.invuln === true && Math.floor(nowMs() / 80) % 2 === 0) baseA = 0.35;
    ctx.translate(x, y);
    ctx.globalAlpha = baseA;

    if (pose === 'dash') {
      var a = num(s.dashAngle, facing > 0 ? 0 : Math.PI);
      var dx = Math.cos(a), dy = Math.sin(a);
      var ax = Math.abs(dx) < 1e-6 ? 1e6 : (c.w / 2) / Math.abs(dx);
      var ay = Math.abs(dy) < 1e-6 ? 1e6 : (c.h / 2) / Math.abs(dy);
      var e = Math.min(ax, ay); // 中心到框邊(沿衝刺反方向)
      var px = -dy, py = dx;
      // 殘影(後方 22px)
      ctx.save(); ctx.globalAlpha = baseA * 0.28; ctx.translate(-dx * 22, -dy * 22); ctx.scale(facing, 1);
      figure(ctx, cls, 'dash', { mono: c.col, outline: c.col }); ctx.restore();
      // 速度線: 框外至多 56px
      ctx.lineCap = 'round';
      var offs = [-7, 0, 7], lens = [40, 56, 34];
      for (var i = 0; i < 3; i++) {
        var sx = -dx * (e - 4) + px * offs[i], sy = -dy * (e - 4) + py * offs[i];
        var ex2 = -dx * (e + lens[i]) + px * offs[i], ey2 = -dy * (e + lens[i]) + py * offs[i];
        ctx.globalAlpha = baseA * (i === 1 ? 0.85 : 0.5);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex2, ey2);
        ctx.lineWidth = i === 1 ? 3 : 2; ctx.strokeStyle = i === 1 ? '#ffffff' : c.col; ctx.stroke();
      }
      ctx.globalAlpha = baseA;
    }

    ctx.save();
    ctx.scale(facing, 1);
    var opt = {};
    if (ghost) opt.outline = P.ghostEdge;
    if (pose === 'hurt') { opt.mono = '#ffd9dc'; opt.outline = P.danger; opt.eyesX = true; }
    figure(ctx, cls, pose, opt);
    ctx.restore();

    if (pose === 'dash') { // 刀光: 框內前緣的白色月牙
      var a2 = num(s.dashAngle, facing > 0 ? 0 : Math.PI);
      var r0 = Math.min(c.w, c.h) / 2 - 7;
      ctx.beginPath();
      ctx.arc(Math.cos(a2) * (r0 - 3), Math.sin(a2) * (r0 - 3), 7, a2 - 1.2, a2 + 1.2);
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.stroke();
    }
  }

  // 小頭像(HUD、卡片用): 角色縮放到 size 高, 中心 (x,y)
  function classIcon(ctx, cls, x, y, size, mono) {
    cls = normCls(cls);
    var c = CLS[cls], k = size / 44;
    ctx.save(); ctx.translate(x, y + (44 - c.h) / 2 * k); ctx.scale(k, k);
    figure(ctx, cls, 'idle', mono ? { mono: mono, outline: '#000000' } : {});
    ctx.restore();
  }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.bg2); g.addColorStop(1, P.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 遠景迴廊柱(低對比)
    for (var i = 0; i < 9; i++) {
      var px = 60 + i * 150;
      ctx.fillStyle = P.bgPillar; ctx.fillRect(px, 40, 44, H - 40);
      ctx.fillStyle = P.bgPillarEdge; ctx.fillRect(px, 40, 4, H - 40);
      ctx.beginPath(); ctx.moveTo(px + 44, 120); ctx.quadraticCurveTo(px + 97, 70, px + 150, 120);
      ctx.lineWidth = 6; ctx.strokeStyle = P.bgPillar; ctx.stroke();
    }
    ctx.restore();
  }
  function drawMapBackground(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.mapBg2); g.addColorStop(1, P.mapBg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (var y = 0; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 地形與機關 ----------
  function drawGround(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = P.ground; ctx.fillRect(-20, -20, 40, 40);
    ctx.strokeStyle = P.groundLine; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-19, 0); ctx.lineTo(19, 0);
    ctx.moveTo(-4, -19); ctx.lineTo(-4, 0);
    ctx.moveTo(8, 0); ctx.lineTo(8, 19);
    ctx.stroke();
    if (s.top === true) {
      ctx.fillStyle = P.groundTopDark; ctx.fillRect(-20, -20, 40, 8);
      ctx.fillStyle = P.groundTop; ctx.fillRect(-20, -20, 40, 4);
    }
    ctx.restore();
  }
  function drawSpike(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = P.spikeBase; ctx.fillRect(-20, 16, 40, 4);
    for (var i = 0; i < 4; i++) {
      var bx = -20 + i * 10;
      ctx.beginPath(); ctx.moveTo(bx, 17); ctx.lineTo(bx + 5, 0); ctx.lineTo(bx + 10, 17); ctx.closePath();
      ctx.fillStyle = P.spike; ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 2.6, 8.8); ctx.lineTo(bx + 5, 0); ctx.lineTo(bx + 7.4, 8.8); ctx.closePath();
      ctx.fillStyle = P.danger; ctx.fill();
    }
    ctx.restore();
  }
  function drawIronCrate(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = P.crateDark; ctx.fillRect(-20, -20, 40, 40);
    ctx.fillStyle = P.crate; ctx.fillRect(-17, -17, 34, 34);
    ctx.strokeStyle = P.crateDark; ctx.lineWidth = 5; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-17, -17); ctx.lineTo(17, 17); ctx.moveTo(17, -17); ctx.lineTo(-17, 17); ctx.stroke();
    ctx.fillStyle = P.crateLight; ctx.fillRect(-17, -17, 34, 3);
    var rv = [[-14, -14], [14, -14], [-14, 14], [14, 14]];
    for (var i = 0; i < 4; i++) { circle(ctx, rv[i][0], rv[i][1], 2); ctx.fillStyle = P.crateLight; ctx.fill(); }
    // 重騎記號
    rr(ctx, -7, -7, 14, 14, 3); ctx.fillStyle = P.knightDark; ctx.fill();
    weightMark(ctx, 0, 0, 10, P.knight);
    ctx.restore();
  }
  function drawPressurePlate(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y); // 40×12, 底邊 y+6
    ctx.fillStyle = '#20232e'; ctx.fillRect(-20, 2, 40, 4); // 底座
    if (s.pressed === true) {
      ctx.fillStyle = P.knightDark; ctx.fillRect(-17, 0, 34, 4);
      ctx.fillStyle = '#3a5f9c'; ctx.fillRect(-17, 0, 34, 1.5);
      ctx.fillStyle = P.knight; ctx.fillRect(-20, 4, 40, 2); // 下沉後亮起的縫
    } else {
      rr(ctx, -17, -5.2, 34, 8.2, 2); ctx.fillStyle = P.knight; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = P.knightDark; ctx.stroke();
      weightMark(ctx, 0, -1.5, 7, P.knightDark);
    }
    ctx.restore();
  }
  function drawHeavyGate(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#1c2233'; ctx.fillRect(-20, -20, 40, 40);
    ctx.fillStyle = P.knightDark;
    for (var i = 0; i < 4; i++) ctx.fillRect(-18 + i * 10, -20, 6, 40);
    ctx.fillStyle = '#5d6f92'; ctx.fillRect(-20, -20, 40, 4); ctx.fillRect(-20, 16, 40, 4);
    rr(ctx, -8, -8, 16, 16, 3); ctx.fillStyle = P.knight; ctx.fill();
    weightMark(ctx, 0, 0, 10, P.knightDark);
    ctx.restore();
  }
  function drawWindmill(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0), on = s.active === true;
    ctx.save(); ctx.translate(x, y);
    // 塔身(底邊貼地 y+20)
    ctx.beginPath(); ctx.moveTo(-9, 20); ctx.lineTo(-4, -4); ctx.lineTo(4, -4); ctx.lineTo(9, 20); ctx.closePath();
    ctx.fillStyle = on ? '#2d4a3b' : P.windOffDark; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
    var hubY = -6, L = 22, ang = on ? t * 7 : Math.PI / 4;
    if (on) { // 轉動弧
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(79,224,138,0.55)';
      ctx.beginPath(); ctx.arc(0, hubY, L, ang + 0.3, ang + 1.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, hubY, L, ang + Math.PI + 0.3, ang + Math.PI + 1.2); ctx.stroke();
    }
    for (var i = 0; i < 4; i++) {
      var a = ang + i * Math.PI / 2;
      ctx.save(); ctx.translate(0, hubY); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(L, -5); ctx.lineTo(L, 2); ctx.lineTo(2, 2); ctx.closePath();
      ctx.fillStyle = on ? P.wind : P.windOff; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = on ? P.windDark : '#2a302c'; ctx.stroke();
      ctx.restore();
    }
    circle(ctx, 0, hubY, 4); ctx.fillStyle = on ? '#ffffff' : '#9aa59e'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.restore();
  }
  function drawUpdraft(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.rect(-20, -120, 40, 240); ctx.clip();
    var g = ctx.createLinearGradient(0, 120, 0, -120);
    g.addColorStop(0, 'rgba(79,224,138,0.20)'); g.addColorStop(1, 'rgba(79,224,138,0.02)');
    ctx.fillStyle = g; ctx.fillRect(-20, -120, 40, 240);
    ctx.lineCap = 'round';
    var cols = [-12, 0, 12], speed = 160;
    for (var c = 0; c < 3; c++) {
      for (var k = 0; k < 4; k++) {
        var yy = 120 - (((t * speed + k * 60 + c * 23) % 240));
        ctx.globalAlpha = 0.35 + 0.25 * ((yy + 120) / 240);
        ctx.beginPath(); ctx.moveTo(cols[c], yy + 10); ctx.lineTo(cols[c], yy - 10);
        ctx.lineWidth = 2; ctx.strokeStyle = '#bff5d4'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cols[c] - 4, yy - 6); ctx.lineTo(cols[c], yy - 10); ctx.lineTo(cols[c] + 4, yy - 6); ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawCoin(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
    ctx.save(); ctx.translate(x, y);
    var k = Math.abs(Math.cos(t * 3));
    var sx = 0.3 + 0.7 * k;
    ctx.beginPath(); ctx.ellipse(0, 0, 10 * sx + 0.5, 10.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = P.coinDark; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 8 * sx, 8.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = P.coin; ctx.fill();
    if (sx > 0.6) { ctx.fillStyle = P.coinDark; ctx.fillRect(-1.5 * sx, -4.5, 3 * sx, 9); }
    ctx.beginPath(); ctx.ellipse(-3 * sx, -3.5, 2 * sx, 2.4, 0, 0, Math.PI * 2); ctx.fillStyle = P.coinShine; ctx.fill();
    var ph = (t * 0.8) % 1; // 閃光
    if (ph < 0.18) {
      var a = 1 - ph / 0.18; ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(6, -11); ctx.lineTo(6, -3); ctx.moveTo(2, -7); ctx.lineTo(10, -7); ctx.stroke();
    }
    ctx.restore();
  }
  function drawGoal(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), hit = s.reached === true;
    ctx.save(); ctx.translate(x, y); // 40×80, 底邊 y+40
    ctx.fillStyle = '#4a4540'; ctx.fillRect(-16, 34, 12, 6);
    ctx.fillStyle = P.goalPole; ctx.fillRect(-12, -36, 4, 72);
    circle(ctx, -10, -36, 3.5); ctx.fillStyle = hit ? P.coin : '#ffffff'; ctx.fill();
    // 旗面
    var fx = -8, fy = -34, fw = 27, fh = 20;
    if (hit) {
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + fw, fy + 3); ctx.lineTo(fx + fw - 4, fy + fh / 2 + 2); ctx.lineTo(fx + fw, fy + fh + 2); ctx.lineTo(fx, fy + fh); ctx.closePath();
      ctx.fillStyle = P.coin; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.coinDark; ctx.stroke();
      // 星
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? 2.4 : 5.5, a = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(fx + 11 + Math.cos(a) * r, fy + 10 + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,63,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-18, -30); ctx.lineTo(-18, -18); ctx.moveTo(18, 0); ctx.lineTo(18, 12); ctx.moveTo(-17, 6); ctx.lineTo(-17, 16); ctx.stroke();
    } else {
      ctx.fillStyle = P.goalWhite; ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle = P.goalBlack;
      for (var r2 = 0; r2 < 4; r2++) for (var c2 = 0; c2 < 5; c2++) if ((r2 + c2) % 2) ctx.fillRect(fx + c2 * 5.4, fy + r2 * 5, 5.4, 5);
      ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.strokeRect(fx, fy, fw, fh);
    }
    ctx.restore();
  }

  // ---------- 角色 ----------
  function drawPlayer(ctx, state) { ctx.save(); drawCharacter(ctx, S(state), false); ctx.restore(); }
  function drawGhost(ctx, state) { ctx.save(); drawCharacter(ctx, S(state), true); ctx.restore(); }

  // ---------- 怪物 ----------
  function drawImp(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0), f = normFacing(s.facing);
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    var step = Math.sin(t * 10) * 2.5;
    // 腳
    ctx.fillStyle = P.impDark;
    ctx.beginPath(); ctx.ellipse(-6 + step, 13, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6 - step, 13, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    // 角
    ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-11, -15); ctx.lineTo(-3, -8); ctx.closePath();
    ctx.moveTo(9, -6); ctx.lineTo(11, -15); ctx.lineTo(3, -8); ctx.closePath();
    ctx.fillStyle = '#f2e3c6'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
    // 身體
    ctx.beginPath(); ctx.ellipse(0, 1, 13, 10.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = P.imp; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
    // 眼與眉
    ctx.fillStyle = '#ffffff';
    circle(ctx, 2, -1, 3); ctx.fill(); circle(ctx, 9, -1, 2.6); ctx.fill();
    ctx.fillStyle = '#111'; circle(ctx, 3.2, -0.6, 1.4); ctx.fill(); circle(ctx, 9.8, -0.6, 1.2); ctx.fill();
    ctx.strokeStyle = P.outline; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(5, -3); ctx.moveTo(7, -3); ctx.lineTo(12, -5); ctx.stroke();
    // 牙
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(4, 8); ctx.lineTo(6, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawEye(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
    ctx.save(); ctx.translate(x, y);
    var fl = Math.sin(t * 12) * 6;
    for (var side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(side * 8, -3); ctx.lineTo(side * 15, -6 + fl); ctx.lineTo(side * 13.5, 2 + fl * 0.5); ctx.lineTo(side * 9, 5);
      ctx.closePath(); ctx.fillStyle = P.eyeWing; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
    }
    circle(ctx, 0, 0, 10.5); ctx.fillStyle = P.eyeWhite; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,77,94,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-5, -1); ctx.moveTo(-8, 5); ctx.lineTo(-5, 2); ctx.moveTo(9, 4); ctx.lineTo(5, 2); ctx.stroke();
    var look = Math.sin(t * 1.3) * 2;
    circle(ctx, look, 0, 5.5); ctx.fillStyle = P.eyeIris; ctx.fill();
    circle(ctx, look, 0, 2.5); ctx.fillStyle = '#111'; ctx.fill();
    circle(ctx, look - 1.8, -1.8, 1.2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  // ---------- 技能與特效 ----------
  function drawBlade(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 18);
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var r = i % 2 ? 4 : 11, a = i * Math.PI / 4;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = P.assassin; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    circle(ctx, 0, 0, 2.2); ctx.fillStyle = P.outline; ctx.fill();
    ctx.restore();
  }
  function drawSlamWave(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var dur = Math.max(0.01, num(s.dur, 0.25)), t = clamp(num(s.t, 0), 0, dur);
    var R = clamp(num(s.radius, 100), 0, 400);
    var k = t / dur, e = 1 - (1 - k) * (1 - k);
    var r = R * (0.25 + 0.75 * e);
    var a = 1 - k * 0.75;
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = a * 0.22; circle(ctx, 0, 0, r); ctx.fillStyle = P.knight; ctx.fill();
    ctx.globalAlpha = a;
    var lw = 7; // 外緣 = r
    circle(ctx, 0, 0, Math.max(0, r - lw / 2)); ctx.lineWidth = lw; ctx.strokeStyle = P.knight; ctx.stroke();
    circle(ctx, 0, 0, Math.max(0, r - lw - 1)); ctx.lineWidth = 2; ctx.strokeStyle = '#e6f0ff'; ctx.stroke();
    ctx.restore();
  }
  function drawPoof(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var dur = Math.max(0.01, num(s.dur, 0.3)), t = clamp(num(s.t, 0), 0, dur), k = t / dur;
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = 1 - k;
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 + 0.3, d = 5 + 11 * k, r = 8 - 3 * k;
      circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r);
      ctx.fillStyle = i % 2 ? P.poof : '#c9c3b8'; ctx.fill();
    }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var j = 0; j < 4; j++) {
      var b = j * Math.PI / 2 + Math.PI / 4, d1 = 10 + 8 * k, d2 = 15 + 8 * k;
      ctx.moveTo(Math.cos(b) * d1, Math.sin(b) * d1); ctx.lineTo(Math.cos(b) * d2, Math.sin(b) * d2);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 大地圖卡片 ----------
  function selFrame(ctx, x, y, w, h, on) {
    if (!on) return;
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 12);
    ctx.lineWidth = 4; ctx.strokeStyle = P.select; ctx.stroke();
    // 四角三角指示
    ctx.fillStyle = P.select;
    var cs = [[x - 4, y - 4, 1, 1], [x + w + 4, y - 4, -1, 1], [x - 4, y + h + 4, 1, -1], [x + w + 4, y + h + 4, -1, -1]];
    for (var i = 0; i < 4; i++) {
      var c = cs[i];
      ctx.beginPath(); ctx.moveTo(c[0] - c[2] * 2, c[1] - c[3] * 2); ctx.lineTo(c[0] + c[2] * 14, c[1] - c[3] * 2); ctx.lineTo(c[0] - c[2] * 2, c[1] + c[3] * 14); ctx.closePath(); ctx.fill();
    }
  }
  function costLine(ctx, x, y, cost, ok, size, align) {
    size = size || 18;
    var s = String(Math.max(0, Math.round(num(cost, 0))));
    var w = 2 * size * 0.55 + 6 + tw(s, size);
    var sx = align === 'center' ? x - w / 2 : x;
    coinIcon(ctx, sx + size * 0.55, y, size * 0.5, !ok);
    text(ctx, s, sx + size * 1.1 + 6, y, size, ok ? P.coin : P.poor, 'left', true);
    return sx + w;
  }
  function drawLevelCard(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var st = (s.state === 'open' || s.state === 'cleared') ? s.state : 'locked';
    ctx.save();
    rr(ctx, x, y, 400, 290, 10); ctx.fillStyle = st === 'locked' ? '#151927' : P.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = st === 'cleared' ? '#7d6a2a' : P.panelEdge; ctx.stroke();
    // 縮圖區外框
    var tx = x + 8, ty = y + 8;
    if (st === 'locked') {
      ctx.fillStyle = '#0b0e18'; ctx.fillRect(tx, ty, 384, 216);
      ctx.save(); ctx.beginPath(); ctx.rect(tx, ty, 384, 216); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (var i = -216; i < 384; i += 24) { ctx.moveTo(tx + i, ty + 216); ctx.lineTo(tx + i + 216, ty); }
      ctx.stroke(); ctx.restore();
      var ok = s.canAfford === true;
      lockIcon(ctx, tx + 192, ty + 82, 54, ok ? '#d8d2c4' : '#6d6a63');
      costLine(ctx, tx + 192, ty + 150, s.cost, ok, 26, 'center');
      text(ctx, ok ? 'Z 解鎖' : '金幣不足', tx + 192, ty + 188, 16, ok ? P.text : P.poor, 'center', true);
    }
    ctx.lineWidth = 2; ctx.strokeStyle = st === 'locked' ? '#2a3045' : '#56607f';
    ctx.strokeRect(tx - 1, ty - 1, 386, 218);

    // 文字區 224~290
    var idx = Math.max(1, Math.round(num(s.index, 1)));
    var nm = str(s.name, '');
    rr(ctx, x + 12, y + 234, 30, 30, 6); ctx.fillStyle = st === 'locked' ? '#2a3045' : '#3c4565'; ctx.fill();
    text(ctx, String(idx), x + 27, y + 249, 18, st === 'locked' ? P.textDim : P.text, 'center', true);
    text(ctx, nm, x + 52, y + 249, 22, st === 'locked' ? P.textDim : P.text, 'left', true);

    if (st === 'open') {
      text(ctx, '未過關', x + 388, y + 249, 18, P.textDim, 'right', true);
    } else if (st === 'cleared') {
      var lv = clamp(Math.round(num(s.speedLv, 0)), 0, 2);
      // 回放職業 + 效率
      classIcon(ctx, s.recordCls, x + 172, y + 246, 26);
      text(ctx, fmt1(s.rate), x + 190, y + 243, 22, P.coin, 'left', true);
      text(ctx, '/分', x + 190 + tw(fmt1(s.rate), 22) + 3, y + 247, 14, P.textDim, 'left', true);
      // 加速等級 2 格 + 倍率
      var mult = ['×1', '×1.25', '×1.5'][lv];
      for (var j = 0; j < 2; j++) {
        rr(ctx, x + 262 + j * 15, y + 236, 12, 12, 2);
        ctx.fillStyle = j < lv ? P.coin : '#2a3045'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = j < lv ? P.coinDark : '#56607f'; ctx.stroke();
      }
      text(ctx, mult, x + 300, y + 242, 15, lv ? P.coin : P.textDim, 'left', true);
      // 下一級
      if (lv >= 2 || s.speedCost === null || s.speedCost === undefined) {
        text(ctx, '加速已滿', x + 388, y + 270, 14, P.textDim, 'right', true);
      } else {
        var aff = s.speedCanAfford === true;
        var cs = String(Math.max(0, Math.round(num(s.speedCost, 0))));
        var endX = x + 388, cW = tw(cs, 15);
        text(ctx, cs, endX, y + 270, 15, aff ? P.coin : P.poor, 'right', true);
        coinIcon(ctx, endX - cW - 9, y + 270, 6.5, !aff);
        var lx = endX - cW - 20;
        text(ctx, '加速', lx, y + 270, 14, aff ? P.text : P.textDim, 'right', true);
        keycap(ctx, lx - 28 - 12, y + 270, 'X', 22);
      }
    } else {
      text(ctx, '未開放', x + 388, y + 249, 18, P.textOff, 'right', true);
    }
    selFrame(ctx, x, y, 400, 290, s.selected === true);
    ctx.restore();
  }
  function drawClassCard(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), cls = normCls(s.cls);
    var st = (s.state === 'owned' || s.state === 'active') ? s.state : 'locked';
    var c = CLS[cls];
    ctx.save();
    rr(ctx, x, y, 240, 140, 10);
    ctx.fillStyle = st === 'locked' ? '#151927' : (st === 'active' ? '#1f2a40' : P.panel); ctx.fill();
    ctx.lineWidth = st === 'active' ? 4 : 2; ctx.strokeStyle = st === 'active' ? c.col : P.panelEdge; ctx.stroke();
    // 頭像台
    rr(ctx, x + 10, y + 10, 84, 120, 8); ctx.fillStyle = st === 'locked' ? '#0b0e18' : '#121726'; ctx.fill();
    classIcon(ctx, cls, x + 52, y + 68, 88, st === 'locked' ? '#2b3042' : null);
    if (st === 'locked') lockIcon(ctx, x + 52, y + 70, 30, '#8a8678');
    text(ctx, str(s.name, ''), x + 106, y + 34, 24, st === 'locked' ? P.textDim : P.text, 'left', true);
    if (st === 'locked') {
      var ok = s.canAfford === true;
      costLine(ctx, x + 106, y + 76, s.cost, ok, 20);
      text(ctx, ok ? 'Z 解鎖' : '金幣不足', x + 106, y + 110, 15, ok ? P.text : P.poor, 'left', true);
    } else if (st === 'owned') {
      text(ctx, '已擁有', x + 106, y + 76, 16, P.textDim, 'left', true);
      text(ctx, 'Z 換上', x + 106, y + 110, 15, P.text, 'left', true);
    } else {
      rr(ctx, x + 106, y + 62, 76, 28, 6); ctx.fillStyle = c.col; ctx.fill();
      text(ctx, '使用中', x + 144, y + 76, 16, '#0b0e18', 'center', true);
    }
    selFrame(ctx, x, y, 240, 140, s.selected === true);
    ctx.restore();
  }
  function drawGoalCard(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0), ok = s.canAfford === true;
    ctx.save();
    rr(ctx, x, y, 1220, 90, 10);
    var g = ctx.createLinearGradient(x, 0, x + 1220, 0);
    g.addColorStop(0, ok ? '#3a2f12' : '#1d1f29'); g.addColorStop(1, P.panel);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = ok ? P.coin : P.panelEdge; ctx.stroke();
    crownIcon(ctx, x + 60, y + 46, 56, ok ? P.coin : '#6b6250', ok ? P.coinDark : '#3b3528');
    text(ctx, '終極目標', x + 112, y + 28, 14, P.textDim, 'left', true);
    text(ctx, '黃金王冠', x + 112, y + 56, 28, ok ? P.coin : P.text, 'left', true);
    var end = costLine(ctx, x + 290, y + 56, s.cost, ok, 24);
    text(ctx, ok ? 'Z 購買 — 買下即勝利' : '金幣不足', end + 24, y + 56, 16, ok ? P.text : P.poor, 'left', true);
    selFrame(ctx, x, y, 1220, 90, s.selected === true);
    ctx.restore();
  }

  // ---------- 浮字 ----------
  var TIER = [null, { size: 13, col: P.tier1, r: 5 }, { size: 16, col: P.tier2, r: 6 }, { size: 18, col: P.tier3, r: 7 }];
  function drawPopup(ctx, state) {
    var s = S(state), x = num(s.x, 0), y = num(s.y, 0);
    var dur = Math.max(0.01, num(s.dur, 0.8)), t = clamp(num(s.t, 0), 0, dur), k = t / dur;
    var v = clamp(Math.round(num(s.value, 1)), 1, 3), st = TIER[v];
    ctx.save();
    ctx.translate(x, y - 30 * (1 - (1 - k) * (1 - k)));
    ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    var label = '+' + v, w = st.r * 2 + 3 + tw(label, st.size), sx = -w / 2;
    if (v === 3) { ctx.beginPath(); ctx.ellipse(0, 0, 23, 11.5, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,159,28,0.3)'; ctx.fill(); }
    coinIcon(ctx, sx + st.r, 0, st.r, false);
    text(ctx, label, sx + st.r * 2 + 3, 0, st.size, st.col, 'left', true, P.outline);
    ctx.restore();
  }

  // ---------- 資訊列 ----------
  function tierOf(combo) { return combo >= 7 ? 3 : (combo >= 4 ? 2 : 1); }
  // 連段區塊: 左上 (x,y), 高 40
  function comboWidget(ctx, x, y, combo, remain) {
    combo = Math.max(0, Math.round(combo));
    var tr = tierOf(combo), st = TIER[tr], live = combo > 0;
    text(ctx, '連段', x, y + 20, 13, P.textDim, 'left', true);
    text(ctx, String(combo), x + 34, y + 20, 26, live ? st.col : P.textOff, 'left', true, P.outline);
    var bx = x + 34 + Math.max(30, tw(String(combo), 26) + 8);
    // 價值階段徽章: ×1 / ×2 / ×3
    rr(ctx, bx, y + 9, 46, 22, 6);
    ctx.fillStyle = live ? (tr === 1 ? '#3a3a3a' : (tr === 2 ? '#5c4710' : '#6b3a06')) : '#20232e'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = live ? st.col : '#3c4565'; ctx.stroke();
    coinIcon(ctx, bx + 11, y + 20, 5, !live);
    text(ctx, '×' + tr, bx + 19, y + 21, 15, live ? st.col : P.textOff, 'left', true);
    // 連段計時條(只在 combo>0)
    if (live) {
      var bw = 150, rx = bx + 58;
      rr(ctx, rx, y + 15, bw, 10, 4); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
      var f = clamp(remain, 0, 1);
      if (f > 0) { rr(ctx, rx, y + 15, Math.max(4, bw * f), 10, 4); ctx.fillStyle = f < 0.3 ? P.danger : st.col; ctx.fill(); }
      // 下一階刻度提示: 再幾段升級
      if (tr < 3) {
        var need = (tr === 1 ? 4 : 7) - combo;
        text(ctx, '再' + need + '→×' + (tr + 1), rx + bw + 8, y + 20, 12, P.textDim, 'left', true);
      }
    }
  }
  function heart(ctx, x, y, s, full) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.6, y - s * 0.05, x - s * 0.45, y - s * 0.55, x, y - s * 0.22);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.55, x + s * 0.6, y - s * 0.05, x, y + s * 0.35);
    ctx.closePath();
    ctx.fillStyle = full ? P.danger : '#2e2430'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = full ? '#ffb3bb' : '#5a4a5a'; ctx.stroke();
  }
  function skillGlyph(ctx, cls, x, y, col) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (cls === 'knight') {
      weightMark(ctx, x, y - 1, 11, col);
      ctx.beginPath(); ctx.moveTo(x - 7, y + 6); ctx.lineTo(x + 7, y + 6); ctx.stroke();
    } else if (cls === 'wind') {
      ctx.beginPath(); ctx.moveTo(x - 7, y + 2); ctx.quadraticCurveTo(x, y - 8, x + 7, y + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 4, y + 5); ctx.quadraticCurveTo(x, y - 1, x + 4, y + 5); ctx.stroke();
    } else {
      ctx.beginPath();
      for (var i = 0; i < 8; i++) { var r = i % 2 ? 2.5 : 7, a = i * Math.PI / 4; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    }
  }
  function drawHud(ctx, state) {
    var s = S(state), mode = s.mode === 'level' ? 'level' : 'map';
    ctx.save();
    ctx.fillStyle = P.hud; ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, HUD_H - 1, W, 1);

    if (mode === 'level') {
      var cls = normCls(s.cls), c = CLS[cls];
      classIcon(ctx, cls, 22, 20, 30);
      // 血量
      var mh = clamp(Math.round(num(s.maxHp, 3)), 0, 10), hp = clamp(Math.round(num(s.hp, mh)), 0, mh);
      for (var i = 0; i < mh; i++) heart(ctx, 52 + i * 22, 21, 18, i < hp);
      var hx = 52 + mh * 22 + 6;
      // 空中衝刺
      var ma = clamp(Math.round(num(s.maxAirDash, 1)), 0, 4), ad = clamp(Math.round(num(s.airDash, ma)), 0, ma);
      text(ctx, '空衝', hx, 20, 12, P.textDim, 'left', true);
      for (var j = 0; j < ma; j++) {
        var dx = hx + 34 + j * 17;
        ctx.beginPath(); ctx.moveTo(dx, 12); ctx.lineTo(dx + 6, 20); ctx.lineTo(dx, 28); ctx.lineTo(dx - 6, 20); ctx.closePath();
        ctx.fillStyle = j < ad ? '#ffffff' : 'rgba(255,255,255,0.08)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = j < ad ? c.col : '#56607f'; ctx.stroke();
      }
      // 技能冷卻
      var sx = hx + 34 + Math.max(1, ma) * 17 + 18;
      var cdD = Math.max(0.001, num(s.skillCdDur, 1)), cdT = clamp(num(s.skillCdT, cdD), 0, cdD);
      var ready = cdT >= cdD - 1e-6;
      circle(ctx, sx, 20, 13); ctx.fillStyle = ready ? '#20283c' : '#151822'; ctx.fill();
      if (!ready) {
        ctx.beginPath(); ctx.moveTo(sx, 20);
        ctx.arc(sx, 20, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cdT / cdD));
        ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      }
      skillGlyph(ctx, cls, sx, 20, ready ? c.col : '#4a5068');
      circle(ctx, sx, 20, 13); ctx.lineWidth = ready ? 2.5 : 1.5; ctx.strokeStyle = ready ? c.col : '#3c4565'; ctx.stroke();
      if (!ready) text(ctx, (cdD - cdT).toFixed(1), sx + 18, 20, 13, P.textDim, 'left', true);
      else text(ctx, '技能', sx + 18, 20, 12, P.textDim, 'left', true);

      // 連段
      var combo = Math.max(0, num(s.combo, 0));
      var cD = Math.max(0.001, num(s.comboDur, 1.5)), cT = clamp(num(s.comboT, cD), 0, cD);
      comboWidget(ctx, 440, 0, combo, 1 - cT / cD);

      // 時間
      ctx.lineWidth = 2; ctx.strokeStyle = P.textDim;
      circle(ctx, 806, 20, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(806, 20); ctx.lineTo(806, 15.5); ctx.moveTo(806, 20); ctx.lineTo(809.5, 21.5); ctx.stroke();
      text(ctx, fmt1(s.time), 818, 20, 18, P.text, 'left', true);
      text(ctx, '秒', 818 + tw(fmt1(s.time), 18) + 3, 21, 12, P.textDim, 'left', true);
      // 本趟金幣
      text(ctx, '本趟', 902, 20, 12, P.textDim, 'left', true);
      coinIcon(ctx, 939, 20, 7);
      text(ctx, String(Math.max(0, Math.round(num(s.runValue, 0)))), 950, 20, 18, P.coin, 'left', true);
      // 回放效率
      text(ctx, '回放', 1004, 20, 12, P.textDim, 'left', true);
      var rr2 = (s.recordRate === null || s.recordRate === undefined) ? '—' : fmt1(s.recordRate);
      text(ctx, rr2, 1032, 20, 16, P.text, 'left', true);
      if (rr2 !== '—') text(ctx, '/分', 1032 + tw(rr2, 16) + 2, 21, 12, P.textDim, 'left', false);
    }

    // 持有金幣 + 每分鐘總產量(兩種模式同一位置)
    var stock = String(Math.max(0, Math.round(num(s.stock, 0))));
    ctx.fillStyle = 'rgba(255,210,63,0.08)'; rr(ctx, 1110, 4, 164, 32, 8); ctx.fill();
    coinIcon(ctx, 1126, 20, 9);
    text(ctx, stock, 1140, 20, 20, P.coin, 'left', true);
    var inc = '+' + fmt1(s.incomePerMin) + '/分';
    text(ctx, inc, 1268, 21, 13, '#d9c98a', 'right', true);
    ctx.restore();
  }

  // ---------- 面板 ----------
  function panelBox(ctx, x, y, w, h, edge) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x + 4, y + 6, w - 4, h - 6, 14); ctx.fill();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 5, 14); ctx.fillStyle = P.panel; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = edge || P.panelEdge; ctx.stroke();
  }
  function statRow(ctx, x, y, label, val, valCol) {
    text(ctx, label, x, y, 16, P.textDim, 'left', true);
    text(ctx, val, x + 110, y, 22, valCol || P.text, 'left', true);
  }
  function drawResultPanel(ctx, state) {
    var s = S(state), X = 320, Y = 160, Wd = 640, Ht = 400;
    var hasOld = !(s.oldRate === null || s.oldRate === undefined);
    ctx.save();
    panelBox(ctx, X, Y, Wd, Ht, P.coin);
    text(ctx, '過關', X + Wd / 2, Y + 50, 40, P.coin, 'center', true, P.outline);
    statRow(ctx, X + 60, Y + 110, '秒數', fmt1(s.time) + ' 秒');
    statRow(ctx, X + 60, Y + 145, '金幣總價值', String(Math.max(0, Math.round(num(s.value, 0)))), P.coin);
    statRow(ctx, X + 340, Y + 110, '最高連段', String(Math.max(0, Math.round(num(s.maxCombo, 0)))));
    var rate = num(s.rate, 0);
    if (!hasOld) {
      rr(ctx, X + 170, Y + 185, 300, 90, 10); ctx.fillStyle = P.panelInner; ctx.fill();
      text(ctx, '效率', X + Wd / 2, Y + 207, 15, P.textDim, 'center', true);
      text(ctx, fmt1(rate) + ' /分', X + Wd / 2, Y + 245, 32, P.coin, 'center', true);
      text(ctx, '已存成回放', X + Wd / 2, Y + 305, 20, P.text, 'center', true);
      keyHints(ctx, [['Z', '回大地圖']], X + Wd / 2, Y + 355, 18);
    } else {
      var old = num(s.oldRate, 0), cmp = rate > old + 1e-9 ? 1 : (rate < old - 1e-9 ? -1 : 0);
      var cols = [{ lab: '這一趟', v: rate, win: cmp > 0, lose: cmp < 0 }, { lab: '舊回放', v: old, win: cmp < 0, lose: cmp > 0 }];
      for (var i = 0; i < 2; i++) {
        var cx = X + 60 + i * 270, c = cols[i];
        rr(ctx, cx, Y + 180, 250, 110, 10); ctx.fillStyle = c.win ? '#3a2f12' : P.panelInner; ctx.fill();
        ctx.lineWidth = c.win ? 3 : 1.5; ctx.strokeStyle = c.win ? P.coin : '#3c4565'; ctx.stroke();
        text(ctx, c.lab + ' 效率', cx + 125, Y + 202, 15, P.textDim, 'center', true);
        text(ctx, fmt1(c.v) + ' /分', cx + 125, Y + 242, 30, c.win ? P.coin : (c.lose ? P.textDim : P.text), 'center', true);
        var tag = c.win ? '▲ 較高' : (c.lose ? '▼ 較低' : '相同');
        text(ctx, tag, cx + 125, Y + 275, 15, c.win ? P.coin : P.textDim, 'center', true);
      }
      keyHints(ctx, [['Z', '採用這一趟'], ['X', '保留舊的']], X + Wd / 2, Y + 345, 18);
    }
    ctx.restore();
  }
  function drawFailPanel(ctx) {
    var X = 380, Y = 240, Wd = 520, Ht = 240;
    ctx.save();
    panelBox(ctx, X, Y, Wd, Ht, P.danger);
    text(ctx, '失敗', X + Wd / 2, Y + 70, 44, P.danger, 'center', true, P.outline);
    text(ctx, '這一趟作廢, 金幣不入帳', X + Wd / 2, Y + 125, 16, P.textDim, 'center', true);
    keyHints(ctx, [['Z', '重來'], ['X', '回大地圖']], X + Wd / 2, Y + 185, 18);
    ctx.restore();
  }
  function drawPausePanel(ctx, state) {
    var s = S(state), lvl = s.mode === 'level';
    var X = 380, Y = 220, Wd = 520, Ht = 280;
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,12,0.6)'; ctx.fillRect(0, 0, W, H);
    panelBox(ctx, X, Y, Wd, Ht);
    // 暫停符號
    ctx.fillStyle = P.text; ctx.fillRect(X + Wd / 2 - 16, Y + 40, 10, 34); ctx.fillRect(X + Wd / 2 + 6, Y + 40, 10, 34);
    text(ctx, '暫停', X + Wd / 2, Y + 115, 38, P.text, 'center', true);
    if (lvl) keyHints(ctx, [['Esc', '繼續'], ['Z', '重來'], ['X', '回大地圖']], X + Wd / 2, Y + 210, 18);
    else keyHints(ctx, [['Esc', '繼續']], X + Wd / 2, Y + 210, 18);
    ctx.restore();
  }
  function drawEndingPanel(ctx, state) {
    var s = S(state), X = 280, Y = 150, Wd = 720, Ht = 420;
    var tt = Math.max(0, Math.floor(num(s.totalTime, 0)));
    var mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.save();
    panelBox(ctx, X, Y, Wd, Ht, P.coin);
    // 光芒
    ctx.save(); ctx.translate(X + Wd / 2, Y + 120);
    ctx.fillStyle = 'rgba(255,210,63,0.12)';
    for (var i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -95); ctx.lineTo(12, -95); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    crownIcon(ctx, X + Wd / 2, Y + 120, 120, P.coin, P.coinDark);
    text(ctx, '取得黃金王冠', X + Wd / 2, Y + 235, 40, P.coin, 'center', true, P.outline);
    text(ctx, '總遊玩時間', X + Wd / 2, Y + 285, 16, P.textDim, 'center', true);
    text(ctx, mm + ':' + (ss < 10 ? '0' : '') + ss, X + Wd / 2, Y + 320, 32, P.text, 'center', true);
    keyHints(ctx, [['Z', '重新開始']], X + Wd / 2, Y + 380, 18);
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  var GUIDE_SIZE = [[480, 270], [600, 220], [560, 240], [480, 300], [560, 240]];
  function label(ctx, s, x, y, size) { text(ctx, s, x, y, size || 15, P.text, 'center', true, P.outline); }
  function floorRow(ctx, x0, x1, yTop) { // 以 40 格地面鋪一排(頂面在 yTop), 再一排內部
    for (var x = x0 + 20; x < x1; x += 40) {
      drawGround(ctx, { x: x, y: yTop + 20, top: true });
      drawGround(ctx, { x: x, y: yTop + 60, top: false });
    }
  }
  function sceneFrame(ctx, w, h) {
    rr(ctx, 0, 0, w, h, 8); ctx.fillStyle = '#0c0f19'; ctx.fill();
  }

  function guide0(ctx) { // 衝到終點 480×270
    sceneFrame(ctx, 480, 270);
    ctx.save(); rr(ctx, 0, 0, 480, 270, 8); ctx.clip();
    ctx.save(); ctx.scale(0.5, 0.5); // 迷你關卡 960×540
    drawBackground(ctx);
    floorRow(ctx, 0, 960, 460);
    drawCoin(ctx, { x: 200, y: 400, t: 0 });
    drawImp(ctx, { x: 310, y: 444, facing: -1, t: 0.2 });
    drawCoin(ctx, { x: 420, y: 360, t: 0.3 });
    drawEye(ctx, { x: 530, y: 320, t: 0.1 });
    drawCoin(ctx, { x: 640, y: 390, t: 0.5 });
    drawCoin(ctx, { x: 760, y: 410, t: 0.2 });
    drawGoal(ctx, { x: 880, y: 420, reached: false });
    dashedPath(ctx, [[110, 432], [200, 400], [310, 410], [420, 360], [530, 320], [640, 390], [760, 410], [855, 410]], 'rgba(255,255,255,0.85)', 4, [14, 10]);
    drawPlayer(ctx, { x: 80, y: 442, cls: 'assassin', facing: 1, pose: 'idle', dashAngle: 0, invuln: false });
    ctx.restore();
    label(ctx, '你', 40, 196);
    label(ctx, '終點旗', 440, 162);
    ctx.restore();
  }
  function guidePanel(ctx, i, x, w, h) {
    ctx.save(); ctx.translate(x, 0);
    rr(ctx, 2, 0, w - 4, h, 8); ctx.fillStyle = '#0c0f19'; ctx.fill();
    ctx.save(); rr(ctx, 2, 0, w - 4, h, 8); ctx.clip();
    floorRow(ctx, 0, w, 180);
    if (i === 0) { // ← → 跑
      keycap(ctx, w / 2 - 18, 30, '←', 30); keycap(ctx, w / 2 + 18, 30, '→', 30);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(40, 152); ctx.lineTo(56, 152); ctx.moveTo(34, 162); ctx.lineTo(54, 162); ctx.moveTo(42, 172); ctx.lineTo(56, 172); ctx.stroke();
      drawPlayer(ctx, { x: 80, y: 162, cls: 'assassin', facing: 1, pose: 'run', dashAngle: 0, invuln: false });
    } else if (i === 1) { // Z 跳
      keycap(ctx, w / 2, 30, 'Z', 30);
      dashedPath(ctx, [[60, 178], [68, 140], [76, 124]], 'rgba(255,255,255,0.6)', 2, [5, 5]);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(76, 178, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
      drawPlayer(ctx, { x: 80, y: 100, cls: 'assassin', facing: 1, pose: 'rise', dashAngle: 0, invuln: false });
    } else if (i === 2) { // ↑+→ + X 斜衝穿飛眼
      keycap(ctx, 34, 30, '↑', 26); text(ctx, '+', 54, 30, 16, P.text, 'center', true); keycap(ctx, 74, 30, '→', 26);
      text(ctx, '+', 96, 30, 16, P.text, 'center', true); keycap(ctx, 118, 30, 'X', 26);
      var a = -Math.PI / 4;
      dashedPath(ctx, [[22, 162], [60, 124]], 'rgba(255,255,255,0.45)', 2, [5, 5]);
      drawPoof(ctx, { x: 66, y: 118, t: 0.08, dur: 0.3 });
      drawPlayer(ctx, { x: 112, y: 72, cls: 'assassin', facing: 1, pose: 'dash', dashAngle: a, invuln: false });
    } else { // 空白鍵 回刃
      keycap(ctx, w / 2, 30, '空白鍵', 28);
      drawPlayer(ctx, { x: 32, y: 162, cls: 'assassin', facing: 1, pose: 'idle', dashAngle: 0, invuln: false });
      ctx.strokeStyle = 'rgba(176,108,255,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(48, 150); ctx.lineTo(112, 140); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(116, 156); ctx.quadraticCurveTo(84, 176, 52, 166); ctx.stroke();
      ctx.setLineDash([]);
      arrowHead(ctx, 112, 140, Math.atan2(-10, 64), 6, 'rgba(176,108,255,0.95)');
      arrowHead(ctx, 52, 166, Math.PI + 0.25, 6, 'rgba(176,108,255,0.95)');
      drawBlade(ctx, { x: 126, y: 146, t: 0.2 });
    }
    ctx.restore();
    ctx.restore();
  }
  function guide1(ctx) { for (var i = 0; i < 4; i++) guidePanel(ctx, i, i * 150, 150, 220); }
  function guide2(ctx) { // 連段 560×240
    sceneFrame(ctx, 560, 240);
    ctx.save(); rr(ctx, 0, 0, 560, 240, 8); ctx.clip();
    floorRow(ctx, 0, 560, 200);
    dashedPath(ctx, [[40, 182], [110, 184], [200, 140], [300, 100], [400, 120], [452, 112]], 'rgba(255,255,255,0.55)', 2.5, [7, 6]);
    drawPoof(ctx, { x: 110, y: 184, t: 0.12, dur: 0.3 });
    drawPopup(ctx, { x: 200, y: 140, t: 0.15, dur: 0.8, value: 1 });
    drawPoof(ctx, { x: 300, y: 100, t: 0.12, dur: 0.3 });
    drawPopup(ctx, { x: 400, y: 120, t: 0.15, dur: 0.8, value: 2 });
    drawPlayer(ctx, { x: 480, y: 108, cls: 'assassin', facing: 1, pose: 'dash', dashAngle: -0.15, invuln: false });
    // 資訊列連段片段
    rr(ctx, 236, 6, 318, 40, 8); ctx.fillStyle = P.hud; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
    comboWidget(ctx, 246, 6, 4, 0.8);
    ctx.restore();
  }
  function miniLevel(ctx, withGhost) { // 1280×720 座標的縮圖內容
    drawBackground(ctx);
    for (var x = 20; x < 1280; x += 40) { drawGround(ctx, { x: x, y: 660, top: true }); drawGround(ctx, { x: x, y: 700, top: false }); }
    for (var x2 = 420; x2 <= 620; x2 += 40) drawGround(ctx, { x: x2, y: 500, top: true });
    for (var x3 = 860; x3 <= 980; x3 += 40) drawGround(ctx, { x: x3, y: 420, top: true });
    var coins = [[200, 580], [300, 540], [460, 430], [700, 560], [900, 350], [1060, 580]];
    for (var i = 0; i < coins.length; i++) drawCoin(ctx, { x: coins[i][0], y: coins[i][1], t: i * 0.4 });
    drawGoal(ctx, { x: 1200, y: 600, reached: false });
    if (withGhost) drawGhost(ctx, { x: 560, y: 430, cls: 'assassin', facing: 1, pose: 'rise', dashAngle: 0 });
  }
  function guide3(ctx) { // 過關後一直重播 480×300
    // 頂端金幣讀數(資訊列同款)
    rr(ctx, 70, 4, 340, 36, 8); ctx.fillStyle = P.hud; ctx.fill();
    coinIcon(ctx, 140, 22, 9);
    text(ctx, '120', 154, 22, 20, P.textDim, 'left', true);
    arrowHead(ctx, 238, 22, 0, 8, P.coin);
    ctx.fillStyle = P.coin; ctx.fillRect(206, 20.5, 26, 3);
    coinIcon(ctx, 268, 22, 9);
    text(ctx, '122', 282, 22, 22, P.coin, 'left', true, P.outline);
    // 已過關卡片(0.85 倍)
    var k = 0.85, cx = 70, cy = 50;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '迴廊', state: 'cleared', rate: 8.4, recordCls: 'assassin', speedLv: 0, speedCost: 50, speedCanAfford: true, cost: 0, canAfford: true, selected: false });
    ctx.save(); ctx.beginPath(); ctx.rect(8, 8, 384, 216); ctx.clip();
    ctx.translate(8, 8); ctx.scale(0.3, 0.3);
    miniLevel(ctx, true);
    ctx.restore();
    ctx.restore();
    // 「+2」浮字: 殘影所在位置的螢幕座標
    var px = cx + (8 + 560 * 0.3) * k, py = cy + (8 + 430 * 0.3) * k;
    drawPopup(ctx, { x: px, y: py - 6, t: 0.2, dur: 0.8, value: 2 });
  }
  function routeScene(ctx, x, y, route) { // 一張 256×144 的迷你關卡(640×360 × 0.4)
    ctx.save(); ctx.translate(x, y);
    rr(ctx, 0, 0, 256, 144, 6); ctx.fillStyle = '#0c0f19'; ctx.fill();
    ctx.save(); rr(ctx, 0, 0, 256, 144, 6); ctx.clip();
    ctx.scale(0.4, 0.4);
    drawBackground(ctx);
    for (var gx = 20; gx < 640; gx += 40) { drawGround(ctx, { x: gx, y: 340, top: true }); }
    for (var px = 260; px <= 380; px += 40) drawGround(ctx, { x: px, y: 220, top: true });
    var high = [[260, 160], [300, 160], [340, 160], [380, 160]], low = [[150, 290], [480, 290]];
    var i;
    for (i = 0; i < high.length; i++) drawCoin(ctx, { x: high[i][0], y: high[i][1], t: 0.1 * i });
    for (i = 0; i < low.length; i++) drawCoin(ctx, { x: low[i][0], y: low[i][1], t: 0.3 });
    drawGoal(ctx, { x: 590, y: 280, reached: false });
    if (route === 'long') {
      dashedPath(ctx, [[70, 300], [150, 290], [215, 165], [390, 160], [440, 220], [480, 290], [560, 295]], 'rgba(255,255,255,0.9)', 6, [16, 10]);
    } else {
      dashedPath(ctx, [[70, 300], [150, 292], [480, 292], [560, 295]], 'rgba(255,255,255,0.9)', 6, [16, 10]);
    }
    drawPlayer(ctx, { x: 40, y: 302, cls: 'assassin', facing: 1, pose: 'idle', dashAngle: 0, invuln: false });
    ctx.restore();
    ctx.restore();
  }
  function guide4(ctx) { // 撿多還是跑快 560×240
    routeScene(ctx, 16, 12, 'long');
    routeScene(ctx, 288, 12, 'short');
    text(ctx, '金幣多 / 秒數長', 144, 188, 18, P.coin, 'center', true);
    text(ctx, '金幣少 / 秒數短', 416, 188, 18, P.text, 'center', true);
  }
  var GUIDES = [guide0, guide1, guide2, guide3, guide4];

  function drawGuidePage(ctx, state) {
    var s = S(state);
    var page = clamp(Math.round(num(s.page, 0)), 0, GUIDES.length - 1);
    var x = num(s.x, 0), y = num(s.y, 0), w = Math.max(1, num(s.w, GUIDE_SIZE[page][0])), h = Math.max(1, num(s.h, GUIDE_SIZE[page][1]));
    var vw = GUIDE_SIZE[page][0], vh = GUIDE_SIZE[page][1];
    var k = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
    ctx.scale(k, k);
    GUIDES[page](ctx);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: P,
    guideSizes: GUIDE_SIZE,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawSpike: drawSpike,
    drawIronCrate: drawIronCrate,
    drawPressurePlate: drawPressurePlate,
    drawHeavyGate: drawHeavyGate,
    drawWindmill: drawWindmill,
    drawUpdraft: drawUpdraft,
    drawCoin: drawCoin,
    drawGoal: drawGoal,
    drawPlayer: drawPlayer,
    drawGhost: drawGhost,
    drawImp: drawImp,
    drawEye: drawEye,
    drawBlade: drawBlade,
    drawSlamWave: drawSlamWave,
    drawPoof: drawPoof,
    drawLevelCard: drawLevelCard,
    drawClassCard: drawClassCard,
    drawGoalCard: drawGoalCard,
    drawPopup: drawPopup,
    drawHud: drawHud,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEndingPanel: drawEndingPanel,
    drawGuidePage: drawGuidePage
  };
})();
