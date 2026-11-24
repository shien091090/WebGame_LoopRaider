/* keycap 方案 C — 像素風機械鍵
 * 方向: 整顆鍵對齊整數像素格(格子 u 隨字級整數放大), 階梯圓角 + 左上亮排 / 右下暗排 + 底下兩排裙邊軸座, 像老式機械鍵盤的點陣圖示;
 * 字與箭頭全部是 5×7 / 7×7 點陣(Esc 寫成 ESC), 不靠字型, 縮到 13px 字級時就是 1 格 = 1 像素的原生點陣圖。
 * 狀態: 一般(米白)/ 金帽(此刻按得下去)/ 按下(帽頂下沉一格、裙邊剩一排)/ 已按過(金帽 + 右上點陣綠勾)。
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

  // ---------- 鍵帽本體(方案 C) ----------
  // 像素風機械鍵: 整顆對齊整數像素格, 階梯圓角、左上一排亮像素、右下一排暗像素, 底下兩排裙邊露出機械軸座;
  // 字與箭頭用 5×7 / 7×7 點陣, 不靠字型。格子大小 u = floor(1.7 px / 13), 至少 1(鍵高 13u)。
  var BMP = {
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    '←': ['0001000', '0011000', '0111111', '1111111', '0111111', '0011000', '0001000']
  };
  (function () {
    var l = BMP['←'], r = [], u = [], d = [], i, j, row;
    for (i = 0; i < 7; i++) r.push(l[i].split('').reverse().join(''));
    for (i = 0; i < 7; i++) { row = ''; for (j = 0; j < 7; j++) row += l[j].charAt(i); u.push(row); }
    for (i = 6; i >= 0; i--) d.push(u[i]);
    BMP['→'] = r; BMP['↑'] = u; BMP['↓'] = d;
  })();
  function glyphs(label) {
    if (BMP[label]) return [BMP[label]];
    var out = [], s = label.toUpperCase();
    for (var i = 0; i < s.length; i++) if (BMP[s.charAt(i)]) out.push(BMP[s.charAt(i)]);
    return out;
  }
  function gCols(gs) { var n = 0; for (var i = 0; i < gs.length; i++) n += gs[i][0].length + (i ? 1 : 0); return n; }
  function unit(px) { return Math.max(1, Math.floor(px * 1.7 / 13)); }
  function cols(label) { return Math.max(7, gCols(glyphs(label))) + 4; }
  function capW(ctx, label, px) { return cols(label) * unit(px); }
  var PIX = {
    normal: { cap: '#ece4d2', hi: '#fffaf0', sh: '#c4b89f', sk1: '#8f8471', sk2: '#6a5f4d', ink: INK },
    hot: { cap: SEL, hi: '#fff2a8', sh: '#dcaa22', sk1: SELD, sk2: '#7a5a08', ink: INK }
  };
  var CK = ['0000011', '0000110', '1001100', '1111000', '0110000'];
  function cap(ctx, label, cx, cy, px, st) {
    var u = unit(px), nc = cols(label), nr = 13, w = nc * u, h = nr * u;
    var press = st === 'press', P = (st === 'hot' || st === 'done') ? PIX.hot : PIX.normal;
    var x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
    function cell(c, r, cw, rh, col) { ctx.fillStyle = col; ctx.fillRect(x0 + c * u, y0 + r * u, cw * u, rh * u); }
    var top = press ? 2 : 1;               // 帽頂第一排(按下時整顆帽頂下沉一格, 裙邊剩一排)
    var capB = press ? nr - 3 : nr - 4;    // 帽頂最後一排
    var c, r, g;
    ctx.save();
    // 像素落影(右下一格)
    ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(x0 + u, y0 + top * u, w, (nr - top) * u);
    // 外框(階梯圓角: 四角各缺一格)
    cell(1, top - 1, nc - 2, 1, EDGE); cell(1, nr - 1, nc - 2, 1, EDGE);
    cell(0, top, 1, nr - 1 - top, EDGE); cell(nc - 1, top, 1, nr - 1 - top, EDGE);
    // 裙邊 / 軸座
    cell(1, capB + 1, nc - 2, nr - 2 - capB, P.sk2);
    if (!press) cell(1, capB + 1, nc - 2, 1, P.sk1);
    cell(1, capB + 1, 1, nr - 2 - capB, P.sk1);
    // 帽頂: 底色 + 左上亮排 + 右下暗排 + 內角
    cell(1, top, nc - 2, capB - top + 1, P.cap);
    cell(2, top, nc - 4, 1, P.hi); cell(1, top + 1, 1, capB - top - 1, P.hi);
    cell(2, capB, nc - 3, 1, P.sh); cell(nc - 2, top + 1, 1, capB - top, P.sh);
    cell(1, top, 1, 1, EDGE); cell(nc - 2, top, 1, 1, EDGE);
    // 點陣字
    var gs = glyphs(label), c0 = Math.floor((nc - gCols(gs)) / 2), r0 = top + 1;
    for (g = 0; g < gs.length; g++) {
      for (r = 0; r < 7; r++) for (c = 0; c < gs[g][r].length; c++) if (gs[g][r].charAt(c) === '1') cell(c0 + c, r0 + r, 1, 1, P.ink);
      c0 += gs[g][0].length + 1;
    }
    // 已按過: 右上像素綠勾(黑框綠底白勾)
    if (st === 'done') {
      var q = Math.max(1, Math.round(u * 0.8)), bx = x0 + w - 6 * q, by = y0 + top * u - 4 * q;
      ctx.fillStyle = EDGE; ctx.fillRect(bx - q, by - q, 9 * q, 7 * q);
      ctx.fillStyle = GOOD; ctx.fillRect(bx, by, 7 * q, 5 * q);
      ctx.fillStyle = '#ffffff';
      for (r = 0; r < 5; r++) for (c = 0; c < 7; c++) if (CK[r].charAt(c) === '1') ctx.fillRect(bx + c * q, by + r * q, q, q);
    }
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
    element: 'keycap', id: 'C', kind: 'static',
    size: [960, 640], duration: 0, loop: false,
    draw: function (ctx, t) { scene(ctx, 'C 像素風機械鍵'); }
  };
})();
