/* keycap 方案 A — 立體斜面鍵帽
 * 方向: 從前上方看的實體鍵帽(OEM 鍵帽): 米色微凹帽頂 + 左亮右暗的斜面 + 前方最厚的深色裙邊, 下方落影。
 * 沿用 ui 方案 A 的米白石色 / 金頂(此刻按得下去) / 深棕描邊; 字是深墨色, 方向鍵畫成幾何箭頭(不靠字型, 小尺寸也清楚)。
 * 狀態: 一般 / 金頂(此刻按得下去)/ 按下(裙邊壓扁、整顆下沉)/ 已按過(金頂 + 右上綠勾)。
 * 只用 Canvas 2D; 版面骨架三方案相同, 只有鍵帽本身的畫法不同。
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var K = (window.Art && window.Art.palette) || {};
  function C(k, d) { return K[k] || d; }
  var INK = C('ink', '#2b2118'), EDGE = C('edge', '#180f09'), CREAM = C('cream', '#f3e6c8');
  var PARCH = C('parch', '#efe3c6'), SEL = C('select', '#ffd84a'), SELD = C('selectDeep', '#b8860b');
  var GOOD = C('good', '#2f8f55'), BOARD = C('board', '#3a2a1f'), SEAM = C('seam', '#21160e'), NAIL = C('nail', '#d9b47a');
  var DIM = C('labelDim', '#c9b896');
  var ARROWS = { '←': Math.PI, '→': 0, '↑': -Math.PI / 2, '↓': Math.PI / 2 };

  // ---------- 小工具 ----------
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function tw(ctx, s, px, bold) {
    ctx.font = font(px, bold); var m = ctx.measureText(s), w = (m && isFinite(m.width)) ? m.width : 0;
    if (!(w > 0)) { w = 0; for (var i = 0; i < s.length; i++) w += /[\x00-\x7f]/.test(s.charAt(i)) ? px * 0.58 : px; }
    return w;
  }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || EDGE; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function lin(ctx, x0, y0, x1, y1, stops) { var g = ctx.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; }

  // 幾何箭頭: 中心 (cx, cy), 外框約 s×s
  function arrowGlyph(ctx, dir, cx, cy, s, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ARROWS[dir]);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.42, 0); ctx.lineTo(s * 0.08, 0);
    ctx.lineWidth = Math.max(1.6, s * 0.17); ctx.strokeStyle = col; ctx.stroke();
    poly(ctx, [s * 0.46, 0, s * 0.02, -s * 0.36, s * 0.02, s * 0.36]); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.06); ctx.strokeStyle = col; ctx.stroke();
    ctx.restore();
  }
  function glyph(ctx, label, cx, cy, px, col) {
    if (ARROWS[label] !== undefined) { arrowGlyph(ctx, label, cx, cy, px * 0.92, col); return; }
    text(ctx, label, cx, cy + px * 0.03, label.length > 1 ? px * 0.68 : px * 0.95, col, 'center', true);
  }
  function check(ctx, ox, oy, r) {
    ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.fillStyle = GOOD; ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.22); ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox - r * 0.5, oy); ctx.lineTo(ox - r * 0.1, oy + r * 0.4); ctx.lineTo(ox + r * 0.55, oy - r * 0.4);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.4, r * 0.32); ctx.stroke();
  }

  // ---------- 鍵帽本體(方案 A) ----------
  // px = 搭配的文字字級; 鍵高 = 1.7 px; 單字鍵約正方, Esc 依字寬加長
  function capW(ctx, label, px) {
    var h = px * 1.7;
    if (label.length > 1) return Math.max(h * 1.3, tw(ctx, label, px * 0.68, true) + px * 1.1);
    return h * 1.04;
  }
  var LOOK = {
    normal: { t0: '#fffaf0', t1: '#e4d9c2', left: '#d2c7ae', right: '#a99d85', front: '#857a64', base: '#b3a78f', ink: INK },
    hot: { t0: '#fff4b8', t1: SEL, left: '#f0c43c', right: '#cf9c1a', front: SELD, base: '#c99a1c', ink: INK }
  };
  function cap(ctx, label, cx, cy, px, st) {
    var w = capW(ctx, label, px), h = px * 1.7;
    var press = st === 'press', hot = st === 'hot' || st === 'done', L = hot ? LOOK.hot : LOOK.normal;
    var small = px < 15;
    var drop = press ? px * 0.2 : 0;
    var x = cx - w / 2, y = cy - h / 2 + drop, hh = h - drop, r = Math.max(2, px * 0.3);
    var sl = px * 0.17, st_ = px * 0.07, sb = press ? px * 0.12 : px * 0.36;
    ctx.save();
    // 落影
    rr(ctx, x + px * 0.06, y + px * 0.14, w, hh, r); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill();
    // 底座 + 斜面(左亮 / 右暗 / 前最厚最暗)
    rr(ctx, x, y, w, hh, r); ctx.fillStyle = L.base; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, hh, r); ctx.clip();
    var fx = x + sl, fy = y + st_, fw = w - sl * 2, fh = hh - st_ - sb;
    if (!small) {
      poly(ctx, [x, y, fx, fy, fx, fy + fh, x, y + hh]); ctx.fillStyle = L.left; ctx.fill();
      poly(ctx, [x + w, y, fx + fw, fy, fx + fw, fy + fh, x + w, y + hh]); ctx.fillStyle = L.right; ctx.fill();
    }
    poly(ctx, [x, y + hh, fx, fy + fh, fx + fw, fy + fh, x + w, y + hh]); ctx.fillStyle = L.front; ctx.fill();
    ctx.restore();
    rr(ctx, x, y, w, hh, r); ctx.lineWidth = small ? 1.2 : 1.6; ctx.strokeStyle = EDGE; ctx.stroke();
    // 帽頂(微凹: 上亮下暗 + 頂緣一條亮線)
    rr(ctx, fx, fy, fw, fh, r * 0.7); ctx.fillStyle = lin(ctx, 0, fy, 0, fy + fh, [0, L.t0, 1, L.t1]); ctx.fill();
    if (!small) {
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(40,26,14,0.35)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx + r * 0.7, fy + 1.2); ctx.lineTo(fx + fw - r * 0.7, fy + 1.2);
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
    }
    if (press) { rr(ctx, fx, fy, fw, fh, r * 0.7); ctx.fillStyle = 'rgba(60,40,20,0.12)'; ctx.fill(); }
    glyph(ctx, label, cx, fy + fh / 2, px, L.ink);
    if (st === 'done') check(ctx, x + w - px * 0.08, y + px * 0.08, Math.max(4, px * 0.36));
    ctx.restore();
    return w;
  }

  // ---------- 版面骨架(三方案相同) ----------
  // parts: 字串 或 [鍵名, 狀態]; 回傳總寬
  function inline(ctx, parts, x, y, px, col, align, outline) {
    var g = px * 0.2, ws = [], total = 0, i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      ws.push(typeof p === 'string' ? tw(ctx, p, px, true) : capW(ctx, p[0], px));
      total += ws[i] + (i ? g : 0);
    }
    var cx = align === 'center' ? x - total / 2 : x;
    for (i = 0; i < parts.length; i++) {
      p = parts[i]; if (i) cx += g;
      if (typeof p === 'string') text(ctx, p, cx, y, px, col, 'left', true, outline || 0, EDGE);
      else cap(ctx, p[0], cx + ws[i] / 2, y, px, p[1] || 'normal');
      cx += ws[i];
    }
    return total;
  }
  function keyLine(ctx, labels, x, y, px, gap) {
    for (var i = 0; i < labels.length; i++) { var w = capW(ctx, labels[i], px); cap(ctx, labels[i], x + w / 2, y, px, 'normal'); x += w + gap; }
    return x;
  }
  function board(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = BOARD; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = SEAM; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = EDGE; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(n[i][0], n[i][1], 2.6, 0, TAU); ctx.fillStyle = NAIL; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = EDGE; ctx.stroke(); }
  }
  function parch(ctx, x, y, w, h, goldBar) {
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = PARCH; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = EDGE; ctx.stroke();
    if (goldBar) { ctx.save(); rr(ctx, x, y, w, h, 6); ctx.clip(); ctx.fillStyle = SEL; ctx.fillRect(x, y, 8, h); ctx.restore(); }
  }
  function label(ctx, s, x, y) { text(ctx, s, x, y, 13, DIM, 'left', false); }

  function scene(ctx, name) {
    ctx.save();
    board(ctx, 0, 0, 960, 640);
    text(ctx, name, 28, 30, 18, CREAM, 'left', true, 3, EDGE);
    // 1. 七個鍵(大)
    label(ctx, '七個鍵 · 32px 字級', 28, 62);
    keyLine(ctx, ['Z', 'X', '←', '→', '↑', '↓', 'Esc'], 32, 108, 32, 20);
    // 2. 狀態
    label(ctx, '狀態 · 26px', 28, 160);
    var sx = [70, 250, 430, 610], sn = ['一般', '此刻按得下去', '按下那一下', '已按過'], ss = ['normal', 'hot', 'press', 'done'];
    for (var i = 0; i < 4; i++) { cap(ctx, 'Z', sx[i], 200, 26, ss[i]); text(ctx, sn[i], sx[i], 242, 13, CREAM, 'center', false); }
    cap(ctx, 'Esc', 790, 200, 26, 'hot'); text(ctx, 'Esc(金頂)', 790, 242, 13, CREAM, 'center', false);
    // 3. 小尺寸(木板上 / 羊皮紙上)
    label(ctx, '小尺寸 · 18px / 13px(左: 木板上, 右: 羊皮紙上)', 28, 270);
    keyLine(ctx, ['Z', 'X', '←', '→', '↑', '↓', 'Esc'], 32, 306, 18, 8);
    keyLine(ctx, ['Z', 'X', '←', '→', '↑', '↓', 'Esc'], 32, 346, 13, 6);
    parch(ctx, 480, 282, 450, 88, false);
    keyLine(ctx, ['Z', 'X', '←', '→', '↑', '↓', 'Esc'], 500, 306, 18, 8);
    keyLine(ctx, ['Z', 'X', '←', '→', '↑', '↓', 'Esc'], 500, 346, 13, 6);
    // 4. 嵌在句中
    label(ctx, '嵌在句中', 28, 394);
    parch(ctx, 32, 410, 600, 48, true);
    inline(ctx, ['直接按', ['Z'], '開始關卡吧!'], 340, 434, 20, INK, 'center');
    parch(ctx, 660, 410, 268, 48, false);
    inline(ctx, ['按', ['↓', 'hot'], '完成關卡'], 794, 434, 18, INK, 'center');
    parch(ctx, 32, 472, 600, 48, true);
    inline(ctx, ['移動與跳躍', ['←', 'done'], ['→', 'done'], ['↑']], 340, 496, 20, INK, 'center');
    parch(ctx, 660, 472, 268, 48, false);
    inline(ctx, [['Z', 'hot'], '購買'], 794, 496, 18, INK, 'center');
    inline(ctx, [['↑'], ['↓'], '選擇   ', ['Z'], '購買   ', ['X'], '返回'], 36, 558, 16, CREAM, 'left', 3);
    inline(ctx, [['Esc'], '暫停   ', ['M'], '靜音'], 560, 558, 16, CREAM, 'left', 3);
    inline(ctx, [['↑'], ['↓'], ['←'], ['→'], '選擇  ', ['Z'], '確定  ', ['Esc'], '暫停  ', ['M'], '靜音'], 36, 606, 13, CREAM, 'left', 3);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'keycap', id: 'A', kind: 'static',
    size: [960, 640], duration: 0, loop: false,
    draw: function (ctx, t) { scene(ctx, 'A 立體斜面鍵帽'); }
  };
})();
