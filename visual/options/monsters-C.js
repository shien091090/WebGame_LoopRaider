/* 怪物設計 方案 C — 行為字形矩陣: 列 = 主題、欄 = 行為原型(正面推進 / 撲近 / 空中 / 定點 / 巢母)。
 * 同一欄的怪共用一種剪影家族(推進 = 楔形、撲近 = 圓頂、空中 = 菱形、定點 = 直立柱 / 倒掛), 一看外形就知道要換哪種打法;
 * 主題只換材質色(翠林苔木、高崖岩雪、礦坑鐵晶)。造型為多面體切面, 不用描邊。
 * 預備動作 = 「核心充能」: 每隻怪身上一顆核心, 平常暗紅, 要出手時燒成白黃並放射光芒; 血條 = 頭上一排 HP 珠(盾 = 藍菱形)。
 */
window.VISUAL_OPTION = (function () {
  'use strict';
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var TAU = Math.PI * 2;
  var BROOD = '#c264ff';
  var K = 1.4;

  // ---------- 小工具 ----------
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function text(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,0.85)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function tone(h, k) { // k > 0 變亮, < 0 變暗
    var c = hex2rgb(h);
    for (var i = 0; i < 3; i++) c[i] = Math.round(k > 0 ? c[i] + (255 - c[i]) * k : c[i] * (1 + k));
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }
  // 切面: 一塊多邊形, shade = -1..1 決定這面亮暗(光從左上來)
  function F(ctx, pts, col, shade) {
    poly(ctx, pts); ctx.fillStyle = shade ? tone(col, shade) : col; ctx.fill();
    ctx.lineWidth = 0.8; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(10,6,14,0.35)'; ctx.stroke();
  }
  function mir(f, pts) { var o = pts.slice(); for (var i = 0; i < o.length; i += 2) o[i] *= f; return o; }
  // 核心: charged = 預備中(白黃 + 光芒); 平常暗紅小晶
  function core(ctx, x, y, r, charged, brood) {
    if (charged) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,200,80,0.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (var i = 0; i < 8; i++) { var a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r + 2.5), y + Math.sin(a) * (r + 2.5)); ctx.lineTo(x + Math.cos(a) * (r + 6.5 + (i % 2) * 2.5), y + Math.sin(a) * (r + 6.5 + (i % 2) * 2.5)); ctx.stroke(); }
      circle(ctx, x, y, r + 3); ctx.fillStyle = 'rgba(255,150,40,0.45)'; ctx.fill(); ctx.restore();
    }
    poly(ctx, [x, y - r * 1.25, x + r, y, x, y + r * 1.25, x - r, y]);
    ctx.fillStyle = charged ? '#fff3a8' : (brood ? '#7a3aa8' : '#7a1c22'); ctx.fill();
    poly(ctx, [x, y - r * 1.25, x + r, y, x, y]); ctx.fillStyle = charged ? '#ffffff' : (brood ? '#b070e0' : '#c03038'); ctx.fill();
    if (brood) { poly(ctx, [x, y - r * 1.25, x + r, y, x, y + r * 1.25, x - r, y]); ctx.lineWidth = 1.2; ctx.strokeStyle = BROOD; ctx.stroke(); }
  }
  function eyeSlit(ctx, x, y, f, brood) { poly(ctx, [x - f * 2.5, y - 1, x + f * 2.5, y - 0.2, x + f * 2, y + 1.2, x - f * 2.5, y + 0.6]); ctx.fillStyle = brood ? BROOD : '#ff3b3b'; ctx.fill(); }
  // HP 珠列: y = 珠列中心; 盾 = 藍菱形接在左側; 巢穴怪 = 紫環
  function beads(ctx, cx, y, hp, max, opt) {
    opt = opt || {};
    var r = opt.r || 2.4, step = r * 2 + 1.6, sh = opt.shieldMax || 0, n = max + sh, x0 = cx - (n - 1) * step / 2;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * step;
      if (i < sh) {
        poly(ctx, [x, y - r - 1, x + r + 0.6, y, x, y + r + 1, x - r - 0.6, y]);
        ctx.fillStyle = i < (opt.shield || 0) ? '#5aa6ff' : 'rgba(40,52,72,0.9)'; ctx.fill();
        ctx.lineWidth = 0.8; ctx.strokeStyle = '#0a0812'; ctx.stroke();
      } else {
        circle(ctx, x, y, r); var on = (i - sh) < hp;
        ctx.fillStyle = on ? (opt.stun ? '#ffd84a' : '#ff4d5e') : 'rgba(40,24,34,0.9)'; ctx.fill();
        ctx.lineWidth = opt.brood ? 1.2 : 0.8; ctx.strokeStyle = opt.brood ? BROOD : '#0a0812'; ctx.stroke();
        if (on) { circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.35); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill(); }
      }
    }
  }
  function crown(ctx, x, y, w) { // 巢穴怪 / 巢母共通: 頭頂紫色晶冠
    ctx.save(); ctx.shadowColor = BROOD; ctx.shadowBlur = 5;
    for (var i = -1; i <= 1; i++) { poly(ctx, [x + i * w - 2, y, x + i * w, y - (i === 0 ? 7 : 5), x + i * w + 2, y]); ctx.fillStyle = BROOD; ctx.fill(); }
    ctx.restore();
  }

  // 材質(主題)
  var MAT = {
    forest: { a: '#6aa83e', b: '#8a5a32', c: '#e0a040' },
    cliff: { a: '#e4eaf2', b: '#66779a', c: '#c8a46a' },
    mine: { a: '#565b68', b: '#3a3e48', c: '#4fd8ea' }
  };

  // ---------- 楔形家族: 正面推進 ----------
  function boarC(ctx, s) { // 48x32
    var f = s.f, m = MAT.forest, w = s.w;
    if (w) { ctx.translate(0, 16); ctx.scale(1.05, 0.86); ctx.translate(0, -16); }
    [-14, -6, 6, 13].forEach(function (lx) { F(ctx, mir(f, [lx - 2.5, 8, lx + 2.5, 8, lx + 2, 16, lx - 2, 16]), m.b, -0.45); });
    F(ctx, mir(f, [-22, -4, -10, -14, 10, -12, 22, 2, 16, 11, -20, 11]), m.b, 0);
    F(ctx, mir(f, [-22, -4, -10, -14, 10, -12, 2, -2]), m.b, 0.25);
    F(ctx, mir(f, [-10, -14, -6, -19, -2, -13]), m.a, 0.1); F(ctx, mir(f, [-2, -13, 2, -19, 5, -12]), m.a, -0.1);
    F(ctx, mir(f, [16, 11, 22, 2, 26, 6, 22, 11]), '#e8a090', 0);
    F(ctx, mir(f, [17, 4, 24, -4, 20, 6]), '#fff6e0', 0);
    eyeSlit(ctx, f * 13, -4, f, s.brood);
    if (s.brood) crown(ctx, -f * 4, -15, 4);
    core(ctx, -f * 4, -2, 3.6, w, s.brood);
    if (w) { ctx.fillStyle = 'rgba(220,200,170,0.8)'; poly(ctx, mir(f, [-24, 14, -30, 10, -28, 16])); ctx.fill(); poly(ctx, mir(f, [-30, 15, -36, 12, -34, 17])); ctx.fill(); }
  }
  function ramC(ctx, s) { // 44x36
    var f = s.f, m = MAT.cliff, w = s.w;
    if (w) ctx.rotate(f * 0.1);
    [-12, -5, 5, 11].forEach(function (lx, i) { var dx = w && i < 2 ? -3 : 0; F(ctx, mir(f, [lx - 2.2 + dx, 8, lx + 2.2 + dx, 8, lx + 2 + dx, 18, lx - 2 + dx, 18]), m.b, -0.4); });
    F(ctx, mir(f, [-18, 4, -14, -8, -2, -12, 10, -8, 12, 6, 4, 10, -14, 10]), m.a, -0.12);
    F(ctx, mir(f, [-14, -8, -2, -12, 10, -8, -2, -1]), m.a, 0.3);
    var hx = w ? 17 : 14, hy = w ? 5 : -4;
    F(ctx, mir(f, [hx - 6, hy - 5, hx + 4, hy - 4, hx + 8, hy + 3, hx - 2, hy + 6]), m.b, 0);
    // 角: 折線切面
    F(ctx, mir(f, [hx - 4, hy - 4, hx - 9, hy - 9, hx - 12, hy - 2, hx - 8, hy + 4, hx - 6, hy - 1]), m.c, 0.1);
    if (w) F(ctx, mir(f, [hx + 2, hy - 5, hx + 11, hy - 3, hx + 3, hy]), m.c, 0.25);
    eyeSlit(ctx, f * (hx + 2), hy - 1, f, s.brood);
    core(ctx, f * (hx - 3), hy - 7, 3, w, s.brood);
    if (w) { ctx.fillStyle = 'rgba(230,236,246,0.8)'; poly(ctx, mir(f, [-20, 16, -27, 12, -25, 18])); ctx.fill(); }
  }
  function shieldC(ctx, s) { // 32x44
    var f = s.f, m = MAT.mine, br = s.broken;
    F(ctx, mir(f, [-6, 12, -1, 12, -1, 22, -6, 22]), m.b, -0.3); F(ctx, mir(f, [1, 12, 6, 12, 6, 22, 1, 22]), m.b, -0.3);
    F(ctx, mir(f, [-10, -6, 6, -6, 8, 13, -10, 13]), br ? '#c8743a' : m.a, 0);
    F(ctx, mir(f, [-10, -6, 6, -6, -2, 3]), br ? '#c8743a' : m.a, 0.25);
    F(ctx, mir(f, [-8, -22, 6, -22, 8, -10, -1, -5, -9, -10]), m.a, 0.15);
    F(ctx, mir(f, [0, -16, 7, -16, 7, -13, 0, -13]), '#120a0a', 0);
    eyeSlit(ctx, f * 4, -14.5, f, s.brood);
    core(ctx, -f * 2, 3, 3, false, s.brood);
    if (!br) { // 六角大盾
      F(ctx, mir(f, [5, -16, 14, -12, 15, 10, 9, 17, 4, 10]), '#4f78a8', 0);
      F(ctx, mir(f, [5, -16, 14, -12, 9, -1, 4, -2]), '#4f78a8', 0.35);
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#dce8f8'; poly(ctx, mir(f, [5, -16, 14, -12, 15, 10, 9, 17, 4, 10])); ctx.stroke();
    } else {
      F(ctx, mir(f, [6, -4, 12, -7, 10, 1, 12, 5, 6, 6]), '#4f78a8', 0.1);
      F(ctx, mir(f, [9, 22, 14, 18, 17, 22]), '#4f78a8', -0.1);
    }
  }

  // ---------- 圓頂家族: 撲近 ----------
  function frogC(ctx, s) { // 32x28
    var f = s.f, m = MAT.forest, w = s.w;
    ctx.save(); ctx.translate(0, 14); ctx.scale(w ? 1.14 : 1, w ? 0.76 : 1); ctx.translate(0, -14);
    F(ctx, mir(f, [-15, 12, -14, 4, -8, 6, -6, 13]), m.a, -0.35);
    F(ctx, mir(f, [-13, 12, -11, 0, -5, -5, 5, -5, 11, -1, 14, 6, 12, 13]), m.a, 0);
    F(ctx, mir(f, [-11, 0, -5, -5, 5, -5, 0, 3]), m.a, 0.3);
    F(ctx, mir(f, [-6, 13, -3, 7, 8, 7, 10, 13]), '#f0eec0', -0.05);
    ctx.restore();
    var ey = w ? 0 : -6;
    F(ctx, mir(f, [0, ey - 4, 5, ey - 4, 6, ey + 1, 0, ey + 1]), '#f4f8e0', 0); F(ctx, mir(f, [7, ey - 3, 12, ey - 3, 12, ey + 2, 7, ey + 2]), '#f4f8e0', 0);
    eyeSlit(ctx, f * 3, ey - 1.5, f, s.brood); eyeSlit(ctx, f * 9.5, ey - 0.5, f, s.brood);
    core(ctx, -f * 4, w ? 4 : 1, 3.2, w, s.brood);
  }
  function beetleC(ctx, s) { // 30x22
    var f = s.f, m = MAT.mine, w = s.w;
    if (w) ctx.scale(1.12, 1.12);
    [-7, 0, 7].forEach(function (lx) { F(ctx, mir(f, [lx - 1, 5, lx + 1, 5, lx - 2, 11, lx - 4, 11]), m.b, -0.4); });
    var shell = w ? '#e8e0d8' : m.a;
    F(ctx, mir(f, [-14, 6, -12, -3, -6, -8, 4, -8, 10, -3, 12, 6]), shell, 0);
    F(ctx, mir(f, [-12, -3, -6, -8, 4, -8, -1, -1]), shell, 0.3);
    F(ctx, mir(f, [12, 6, 10, -3, 16, -1, 17, 5]), m.b, -0.1);
    eyeSlit(ctx, f * 14, 1, f, s.brood);
    core(ctx, -f * 1, -3, 4, w, s.brood); // 背上那顆就是炸藥
    if (w) { ctx.strokeStyle = 'rgba(255,90,50,0.9)'; ctx.lineWidth = 1.4; poly(ctx, mir(f, [-14, 6, -12, -3, -6, -8, 4, -8, 10, -3, 12, 6])); ctx.stroke(); }
  }

  // ---------- 菱形家族: 空中 ----------
  function beeC(ctx, s) { // 32x32
    var f = s.f, w = s.w;
    if (w) ctx.rotate(f * 0.3);
    F(ctx, mir(f, [-2, -4, -8, -16, 2, -6]), '#e8f2ff', 0.2); F(ctx, mir(f, [2, -4, 6, -15, 6, -4]), '#e8f2ff', 0);
    F(ctx, mir(f, [-14, 2, -3, -7, 7, 1, -3, 10]), '#f2c230', 0);
    F(ctx, mir(f, [-14, 2, -3, -7, -3, 2]), '#f2c230', 0.3);
    F(ctx, mir(f, [-8, -2, -6, -4, -6, 7, -8, 5]), '#2a1a08', 0); F(ctx, mir(f, [-3, -6, -1, -5, -1, 8, -3, 9]), '#2a1a08', 0);
    F(ctx, mir(f, [6, -5, 13, -2, 12, 4, 6, 3]), '#4a3418', 0);
    eyeSlit(ctx, f * 10, -1.5, f, s.brood);
    F(ctx, mir(f, [-13, 4, -19, 7, -12, 7]), '#2a1a08', 0);
    core(ctx, -f * 17, 7, 2.6, w, s.brood); // 螫針尖
  }
  function eagleC(ctx, s) { // 40x28
    var f = s.f, m = MAT.cliff, w = s.w;
    if (w) ctx.rotate(f * 0.4);
    var wy = w ? -14 : -2;
    F(ctx, mir(f, [-3, -2, -20, wy, -12, wy + 6, -4, 4]), m.b, w ? 0.1 : -0.2);
    F(ctx, mir(f, [2, -2, 16, wy - 2, 10, wy + 5, 4, 3]), m.b, 0.15);
    F(ctx, mir(f, [-16, 1, -8, -4, 8, -3, 13, 0, 8, 5, -8, 5]), m.b, -0.05);
    F(ctx, mir(f, [-8, -4, 8, -3, 0, 1]), m.b, 0.3);
    F(ctx, mir(f, [6, -6, 12, -6, 13, 0, 7, 1]), m.a, 0);
    F(ctx, mir(f, [13, -4, 18, -1, 13, 0]), '#f2c230', 0);
    eyeSlit(ctx, f * 10, -3.5, f, s.brood);
    core(ctx, -f * 1, 1.5, 3, w, s.brood);
  }
  function batC(ctx, s) { // 20x14
    var f = s.f, up = s.up, m = MAT.mine;
    var wy = up ? -7 : 2;
    F(ctx, [-3, -1, -10, wy, -6, wy + 4, -3, 4], '#5a4a7a', -0.1); F(ctx, [3, -1, 10, wy, 6, wy + 4, 3, 4], '#5a4a7a', 0.15);
    F(ctx, [0, -6, 4, 0, 0, 5, -4, 0], '#6a5a8a', 0.1);
    F(ctx, [-3, -3, -3, -7, -1, -4], '#6a5a8a', 0); F(ctx, [3, -3, 3, -7, 1, -4], '#6a5a8a', 0);
    eyeSlit(ctx, f * 1.6, -1, f, false);
  }

  // ---------- 直立 / 倒掛家族: 定點 ----------
  function flowerC(ctx, s) { // 32x44
    var f = s.f, m = MAT.forest, w = s.w;
    F(ctx, [-9, 22, -2, 16, 0, 22], m.a, -0.2); F(ctx, [9, 22, 2, 16, 0, 22], m.a, 0);
    F(ctx, [-3, 22, -2, -2, 2, -2, 3, 22], '#3f7d2a', 0);
    if (w) {
      F(ctx, mir(f, [0, 6, -8, 2, -14, -12, -8, -22, -10, -10, -5, 0]), '#5aa036', 0.1);
      F(ctx, mir(f, [-8, -22, -5, -28, -4, -20]), '#ff5a3a', 0);
    } else {
      F(ctx, mir(f, [1, 8, 10, 6, 13, -1, 8, 3]), '#5aa036', 0); F(ctx, mir(f, [-1, 8, -10, 6, -13, -1, -8, 3]), '#5aa036', -0.2);
    }
    var R = w ? 11 : 8;
    for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + 0.26, b = a + TAU / 12;
      F(ctx, [Math.cos(a - 0.4) * 4, -12 + Math.sin(a - 0.4) * 4, Math.cos(b) * R, -12 + Math.sin(b) * R, Math.cos(a + 0.6) * 4, -12 + Math.sin(a + 0.6) * 4], '#e8506a', (i % 2) ? 0.2 : -0.1); }
    core(ctx, 0, -12, 4, w, s.brood);
  }
  function lizardC(ctx, s) { // 36x24, 頂邊 -12 貼天花板
    var f = s.f, w = s.w;
    [-9, -3, 4, 9].forEach(function (lx, i) { F(ctx, [lx - 1.2, -4, lx + 1.2, -4, lx + (i % 2 ? 3 : -3) + 1, -12, lx + (i % 2 ? 3 : -3) - 1, -12], '#8a5a2e', 0); });
    F(ctx, mir(f, [-12, -6, -20, -4, -17, 5, -14, -2]), '#a86a34', 0);
    F(ctx, mir(f, [-13, -4, -6, -10, 8, -10, 12, -3, 6, 2, -8, 2]), '#c98a4a', 0);
    F(ctx, mir(f, [-6, -10, 8, -10, 2, -5]), '#c98a4a', 0.25);
    F(ctx, mir(f, [10, -5, 18, -2, 16, 4, 10, 2]), '#d89a58', 0);
    eyeSlit(ctx, f * 14.5, 0, f, s.brood);
    if (w) { F(ctx, mir(f, [1, 5, 6, 3, 10, 6, 9, 11, 3, 11]), '#8a8f9a', 0); F(ctx, mir(f, [1, 5, 6, 3, 5, 7]), '#8a8f9a', 0.3); }
    core(ctx, w ? f * 5.5 : -f * 1, w ? 7.5 : -4, w ? 2.6 : 3, w, s.brood); // 預備時核心移到石塊上 = 要丟出去
  }

  // ---------- 巢母(64x56) ----------
  function sowC(ctx, s) {
    var f = s.f, m = MAT.forest, w = s.w;
    if (w) { ctx.translate(0, 28); ctx.scale(1.05, 0.88); ctx.translate(0, -28); }
    [-18, -8, 6, 16].forEach(function (lx) { F(ctx, mir(f, [lx - 3.5, 12, lx + 3.5, 12, lx + 3, 28, lx - 3, 28]), '#3a2614', 0); });
    F(ctx, mir(f, [-30, 0, -20, -16, 12, -16, 32, 4, 24, 14, -28, 14]), '#5d4a2e', 0);
    F(ctx, mir(f, [-30, 0, -20, -16, 12, -16, 0, -2]), '#5d4a2e', 0.22);
    for (var i = 0; i < 5; i++) { var bx = -18 + i * 7; F(ctx, mir(f, [bx - 3, -15, bx, -27 + (i % 2) * 5, bx + 3, -15]), m.a, (i % 2) ? 0.2 : -0.1); }
    F(ctx, mir(f, [24, 14, 32, 4, 37, 9, 32, 14]), '#e8a090', 0);
    F(ctx, mir(f, [26, 6, 36, -6, 31, 8]), '#fff6e0', 0);
    eyeSlit(ctx, f * 20, -4, f, true); eyeSlit(ctx, f * 22, -3.6, f, true);
    crown(ctx, -f * 2, -16, 7);
    core(ctx, -f * 4, -2, 6.5, w, true);
  }
  function rocC(ctx, s) {
    var f = s.f, m = MAT.cliff, w = s.w;
    [-8, 6].forEach(function (lx) { F(ctx, mir(f, [lx - 1.5, 12, lx + 1.5, 12, lx + 3, 28, lx, 28]), '#f2c230', 0); });
    var wy = w ? -28 : -8;
    F(ctx, mir(f, [-6, -2, -32, wy, -22, wy + 12, -12, 10]), m.b, w ? 0.05 : -0.2);
    F(ctx, mir(f, [2, -4, 24, wy - 2, 16, wy + 10, 10, 4]), m.b, 0.2);
    F(ctx, mir(f, [-18, 8, -10, -6, 10, -6, 16, 6, 8, 18, -10, 18]), m.b, -0.05);
    F(ctx, mir(f, [-10, -6, 10, -6, 0, 4]), m.b, 0.3);
    F(ctx, mir(f, [8, -14, 20, -14, 22, -2, 10, 0]), m.a, 0);
    F(ctx, mir(f, [22, -10, 32, -4, 22, -2]), '#f2c230', 0);
    eyeSlit(ctx, f * 16, -9, f, true);
    crown(ctx, f * 14, -14, 4);
    core(ctx, -f * 1, 6, 6, w, true);
  }
  function queenC(ctx, s) {
    var f = s.f, m = MAT.mine, stun = s.stun, w = s.w;
    for (var i = 0; i < 3; i++) { var lx = -16 + i * 14; F(ctx, mir(f, [lx - 1.5, 12, lx + 1.5, 12, lx - 2, 27, lx - 5, 27]), '#2a1236', 0); }
    F(ctx, mir(f, [-30, 14, -28, -4, -16, -16, 8, -16, 20, -4, 22, 14]), '#4a2560', 0);
    F(ctx, mir(f, [-28, -4, -16, -16, 8, -16, -4, 0]), '#4a2560', 0.25);
    [[-16, -14, 6, 14], [-5, -16, 7, 18], [6, -14, 5, 12]].forEach(function (c) {
      F(ctx, mir(f, [c[0] - c[2] / 2, c[1] + 2, c[0], c[1] - c[3], c[0] + c[2] / 2, c[1] + 2]), m.c, 0);
      F(ctx, mir(f, [c[0], c[1] + 2, c[0], c[1] - c[3], c[0] + c[2] / 2, c[1] + 2]), m.c, 0.4);
    });
    F(ctx, mir(f, [20, -4, 30, 0, 32, 12, 22, 14]), '#3a1a4c', 0);
    ctx.strokeStyle = '#efe0f6'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f * 30, 10); ctx.lineTo(f * 35, 16); ctx.moveTo(f * 30, 2); ctx.lineTo(f * 35, -3); ctx.stroke();
    if (stun) {
      // 核心碎裂外露 = 破綻
      ctx.save(); ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 14;
      poly(ctx, mir(f, [-4, -10, 6, -2, 2, 10, -10, 8, -14, -2])); ctx.fillStyle = '#ffe066'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#1a0a20'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(f * -4, -10); ctx.lineTo(f * -3, 0); ctx.lineTo(f * 4, 4); ctx.moveTo(f * -3, 0); ctx.lineTo(f * -10, 6); ctx.stroke();
      ctx.strokeStyle = '#fbf6ee'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(f * 24, 2); ctx.lineTo(f * 28, 6); ctx.moveTo(f * 28, 2); ctx.lineTo(f * 24, 6); ctx.stroke();
    } else {
      eyeSlit(ctx, f * 25, 3, f, true);
      core(ctx, -f * 4, 0, 6.5, w, true);
    }
    crown(ctx, f * 24, -4, 3.5);
  }

  // ---------- 版面 ----------
  var X0 = 118, CW = 205, BX = X0 + CW * 4, BW = 1280 - BX, HY = 58, RH = (720 - HY) / 3;
  var ROWS = [
    { name: '翠林谷地', mat: '苔木', bg: ['#26402a', '#1a2c1e'] },
    { name: '風蝕高崖', mat: '岩雪', bg: ['#2e3c56', '#1e283c'] },
    { name: '地底礦坑', mat: '鐵晶', bg: ['#221c2a', '#141018'] }
  ];
  var COLS = ['正面推進', '撲近', '空中', '定點', '巢母'];
  var COL_HINT = ['楔形 · 擋它的正面', '圓頂 · 別讓它貼上', '菱形 · 打斷它瞄準', '直立 / 倒掛 · 繞開範圍', '大型 · 等它露破綻'];

  function glyph(ctx, i, x, y) {
    ctx.save(); ctx.fillStyle = '#ffd84a';
    if (i === 0) poly(ctx, [x - 9, y - 6, x + 3, y - 6, x + 10, y + 1, x + 3, y + 7, x - 9, y + 7]);
    else if (i === 1) { ctx.beginPath(); ctx.arc(x, y + 5, 10, Math.PI, TAU); ctx.closePath(); }
    else if (i === 2) poly(ctx, [x, y - 8, x + 9, y, x, y + 8, x - 9, y]);
    else if (i === 3) poly(ctx, [x - 3, y - 9, x + 3, y - 9, x + 3, y + 8, x + 8, y + 8, x - 8, y + 8, x - 3, y + 8]);
    else poly(ctx, [x - 10, y + 7, x - 8, y - 4, x - 3, y + 1, x, y - 9, x + 3, y + 1, x + 8, y - 4, x + 10, y + 7]);
    ctx.fill(); ctx.restore();
  }
  // 放一隻: (cx, gy) = 底邊中心; h = 判定框高; bead = [hp, max, opt]
  function put(ctx, cx, gy, h, fn, s, bead, k) {
    k = k || K;
    ctx.save(); ctx.translate(cx, gy - h / 2 * k); ctx.scale(k, k);
    ctx.save(); fn(ctx, s); ctx.restore();
    if (bead) beads(ctx, 0, -h / 2 - 7, bead[0], bead[1], bead[2]);
    ctx.restore();
  }
  function tag(ctx, x, y, s, hot) { text(ctx, s, x, y, 11, hot ? '#ffcf9a' : '#8f9ab0', 'center', false); }
  function cellText(ctx, cx, top, name, line) { text(ctx, name, cx, top + 186, 15, '#f2f4f8', 'center', true); text(ctx, line, cx, top + 205, 11, '#b8c2d4', 'center', false); }

  function draw(ctx, t) {
    ctx.save();
    ctx.fillStyle = '#0e1118'; ctx.fillRect(0, 0, 1280, 720);
    // 欄頭
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, 0, 1280, HY);
    for (var c = 0; c < 5; c++) {
      var cx = c < 4 ? X0 + CW * c + CW / 2 : BX + BW / 2;
      glyph(ctx, c, cx - 46 - (c === 3 ? 6 : 0), 20);
      text(ctx, COLS[c], cx + 4, 20, 16, '#f2f4f8', 'center', true);
      text(ctx, COL_HINT[c], cx, 42, 11, '#9aa4b8', 'center', false);
    }
    // 列底
    for (var r = 0; r < 3; r++) {
      var top = HY + RH * r, row = ROWS[r];
      var g = ctx.createLinearGradient(0, top, 0, top + RH); g.addColorStop(0, row.bg[0]); g.addColorStop(1, row.bg[1]);
      ctx.fillStyle = g; ctx.fillRect(X0, top, 1280 - X0, RH);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(X0, top + 150, 1280 - X0, 1.5);
      ctx.fillStyle = 'rgba(8,10,18,0.6)'; ctx.fillRect(0, top, X0, RH);
      text(ctx, row.name, X0 / 2, top + RH / 2 - 10, 18, '#f2f4f8', 'center', true);
      text(ctx, '材質: ' + row.mat, X0 / 2, top + RH / 2 + 14, 11, '#9aa4b8', 'center', false);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(X0, top, 1280 - X0, 1);
    }
    for (c = 0; c <= 4; c++) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(X0 + CW * c, HY, 1, 720 - HY); }
    ctx.fillStyle = 'rgba(194,100,255,0.07)'; ctx.fillRect(BX, HY, BW, 720 - HY);

    function pair(col, rowI, h, fn, sNorm, sWind, bN, bW, tagN, tagW, name, line, opt) {
      opt = opt || {};
      var top = HY + RH * rowI, cx = X0 + CW * col + CW / 2, gy = top + 150;
      var dx = opt.dx || 46;
      put(ctx, cx - dx, gy - (opt.liftN || 0), h, fn, sNorm, bN);
      put(ctx, cx + dx, gy - (opt.liftW || 0), h, fn, sWind, bW);
      ctx.fillStyle = 'rgba(255,216,74,0.7)'; poly(ctx, [cx - 5, gy - 40 - (opt.liftN || 0) * 0.5, cx + 5, gy - 34 - (opt.liftN || 0) * 0.5, cx - 5, gy - 28 - (opt.liftN || 0) * 0.5]); ctx.fill();
      tag(ctx, cx - dx, gy + 12, tagN, false); tag(ctx, cx + dx, gy + 12, tagW, true);
      cellText(ctx, cx, top, name, line);
    }

    // 翠林
    pair(0, 0, 32, boarC, { f: 1 }, { f: 1, w: true }, [3, 3], [2, 3], '巡邏', '核心燃起 · 蓄力', '野豬', '燃起後直線衝撞, 撞牆暈眩');
    pair(1, 0, 28, frogC, { f: 1 }, { f: 1, w: true }, [2, 2], [2, 2], '蹲著', '壓扁 · 要跳', '跳蛙', '每 1.2 秒朝玩家跳');
    pair(2, 0, 32, beeC, { f: 1 }, { f: 1, w: true }, [1, 1], [1, 1], '巡飛', '針尖燃起 · 瞄準', '射手蜂', '針尖亮 = 下一刻射彈', { liftN: 40, liftW: 40 });
    pair(3, 0, 44, flowerC, { f: 1 }, { f: 1, w: true }, [3, 3], [3, 3], '扎根', '花心燃起 · 拉鞭', '刺藤花', '不會動; 靠近時橫掃前方', { dx: 44 });
    // 高崖
    pair(0, 1, 36, ramC, { f: 1 }, { f: 1, w: true }, [4, 4], [4, 4], '巡邏', '額心燃起 · 低頭', '岩角羊', '頂撞把人撞退、撞下平台');
    pair(1, 1, 32, boarC, { f: 1 }, { f: 1, brood: true }, [3, 3], [3, 3, { brood: true }], '一般', '巢穴怪', '巢穴怪對照', '紫晶冠 + 紫核心 + 紫環血珠');
    pair(2, 1, 28, eagleC, { f: 1 }, { f: 1, w: true }, [2, 2], [2, 2], '高處盤旋', '舉翼燃起 · 鎖定', '俯衝鷹', '鎖定後斜線俯衝再飛回', { liftN: 56, liftW: 56 });
    // 落石蜥: 天花板
    (function () {
      var top = HY + RH * 1, cx = X0 + CW * 3 + CW / 2;
      ctx.fillStyle = '#66779a'; ctx.fillRect(cx - 96, top + 16, 192, 22); ctx.fillStyle = '#e4eaf2'; ctx.fillRect(cx - 96, top + 36, 192, 3);
      [[cx - 46, false], [cx + 46, true]].forEach(function (p) {
        ctx.save(); ctx.translate(p[0], top + 39 + 12 * K); ctx.scale(K, K);
        ctx.save(); lizardC(ctx, { f: 1, w: p[1] }); ctx.restore();
        beads(ctx, 0, 20, 2, 2); ctx.restore();
      });
      tag(ctx, cx - 46, top + 162, '貼頂爬', false); tag(ctx, cx + 46, top + 162, '核心移到石上 · 要丟', true);
      cellText(ctx, cx, top, '落石蜥', '倒掛牆頂, 往正下方丟石');
    })();
    // 礦坑
    pair(0, 2, 44, shieldC, { f: 1 }, { f: 1, broken: true }, [3, 3, { shield: 2, shieldMax: 2 }], [3, 3, { shield: 0, shieldMax: 2 }], '舉盾', '盾已破', '盾兵', '藍菱 = 盾耐久; 打破才露本體', { dx: 44 });
    pair(1, 2, 22, beetleC, { f: 1 }, { f: 1, w: true }, [1, 1], [1, 1], '爬近', '背核燃起 · 要爆', '爆炸甲蟲', '貼近燃起後自爆; 可擊飛去炸怪');
    // 蝙蝠群
    (function () {
      var top = HY + RH * 2, cx = X0 + CW * 2 + CW / 2, cy = top + 92;
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(200,180,240,0.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, cy, 52, 24, 0, 0, TAU); ctx.stroke(); ctx.restore();
      [[cx, cy - 24, 1, true], [cx - 46, cy + 12, -1, false], [cx + 46, cy + 12, 1, false]].forEach(function (b) {
        ctx.save(); ctx.translate(b[0], b[1]); ctx.scale(K, K); batC(ctx, { f: b[2], up: b[3] }); beads(ctx, 0, -11, 1, 1); ctx.restore();
      });
      tag(ctx, cx, top + 162, '3 隻繞圈, 各 1 顆血', false);
      cellText(ctx, cx, top, '蝙蝠群', '一隻一隻打; 繞圈時躲空檔');
    })();
    // 圖例(礦坑 × 定點 空格)
    (function () {
      var top = HY + RH * 2, cx = X0 + CW * 3 + CW / 2;
      text(ctx, '圖例', cx, top + 22, 14, '#f2f4f8', 'center', true);
      ctx.save(); ctx.translate(cx - 50, top + 62); core(ctx, 0, 0, 6, false, false); ctx.restore();
      ctx.save(); ctx.translate(cx + 50, top + 62); core(ctx, 0, 0, 6, true, false); ctx.restore();
      tag(ctx, cx - 50, top + 86, '核心暗 = 平常', false); tag(ctx, cx + 50, top + 86, '核心燃起 = 要出手', true);
      ctx.save(); ctx.translate(cx, top + 118); ctx.scale(1.6, 1.6); beads(ctx, 0, 0, 2, 3, { shield: 1, shieldMax: 2 }); ctx.restore();
      tag(ctx, cx, top + 138, '血珠: 紅 = 剩餘血, 藍菱 = 盾', false);
      text(ctx, '(放大 1.4 倍; 實際依判定框大小)', cx, top + 196, 10, '#6f7a90', 'center', false);
    })();

    // 巢母欄
    var bcx = BX + BW / 2, KB = 1.3;
    function boss(rowI, fn, sA, sB, bA, bB, tA, tB, name, line) {
      var top = HY + RH * rowI, gy = top + 150;
      put(ctx, bcx - 78, gy, 56, fn, sA, bA, KB);
      put(ctx, bcx + 78, gy, 56, fn, sB, bB, KB);
      tag(ctx, bcx - 78, gy + 12, tA, false); tag(ctx, bcx + 78, gy + 12, tB, true);
      text(ctx, name, bcx, top + 186, 15, '#e8d0ff', 'center', true); text(ctx, line, bcx, top + 205, 11, '#b8c2d4', 'center', false);
    }
    boss(0, sowC, { f: 1 }, { f: 1, w: true }, [12, 12, { brood: true, r: 2 }], [9, 12, { brood: true, r: 2 }], '巡邏', '核心燃起 · 蓄力', '荊棘母豬', '衝撞後暈眩, 暈眩中傷害 ×2');
    boss(1, rocC, { f: 1 }, { f: 1, w: true }, [12, 12, { brood: true, r: 2 }], [12, 12, { brood: true, r: 2 }], '盤踞', '舉翼燃起 · 要撲', '雷鷲', '翅膀高舉、胸核燃起才撲');
    boss(2, queenC, { f: 1, w: true }, { f: 1, stun: true }, [8, 12, { brood: true, r: 2 }], [5, 12, { brood: true, r: 2, stun: true }], '核心燃起 · 蓄力', '核心碎裂 · 破綻', '晶殼甲后', '撞停後核心外露變黃 = 快打');
    ctx.restore();
  }

  return { element: 'monsters', id: 'C', kind: 'static', size: [1280, 720], duration: 0, loop: false, draw: draw };
})();
