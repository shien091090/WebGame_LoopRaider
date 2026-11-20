/* 怪物設計 方案 A — 圖鑑橫帶: 延伸現有「扁平幾何 + 深描邊 + 紅眼」語言,
 * 三主題各一條橫帶, 每種怪並排畫「平常 → 預備」兩態; 血條 = 每 1 HP 一格的分段條(盾 = 藍格接在前面)。
 * 既有四種怪(野豬 / 跳蛙 / 射手蜂)直接呼叫 Art 的畫法, 新怪照同一套描邊、紅眼、巢穴紫畫。
 */
window.VISUAL_OPTION = (function () {
  'use strict';
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var TAU = Math.PI * 2;
  var OL = '#160c12', EYE = '#ff3b3b', BROOD = '#c264ff', BROOD_GLOW = 'rgba(194,100,255,0.55)';
  var K = 1.5; // 圖鑑放大倍率(遊戲內 1 倍)

  // ---------- 小工具 ----------
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function fs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = OL; ctx.stroke(); } }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,0.85)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath(); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#5a4800'; ctx.stroke();
  }
  function eye(ctx, x, y, r, brood, glow) {
    if (glow) { circle(ctx, x, y, r + 2.6); ctx.fillStyle = brood ? BROOD_GLOW : 'rgba(255,59,59,0.38)'; ctx.fill(); }
    circle(ctx, x, y, r); ctx.fillStyle = brood ? BROOD : EYE; ctx.fill();
  }
  function brow(ctx, x1, y1, x2, y2) { ctx.strokeStyle = '#1a0808'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function dust(ctx, x, y, f) { ctx.fillStyle = 'rgba(210,190,160,0.75)'; circle(ctx, x, y, 3.5); ctx.fill(); circle(ctx, x - f * 6, y + 1, 2.5); ctx.fill(); }

  // 分段血條: 每 1 HP 一格; 盾值用藍格接在左側; 巢穴怪紫框。y = 血條底邊(local)
  function hpBar(ctx, cx, bottom, hp, max, opt) {
    opt = opt || {};
    var cw = opt.cw || 6, gap = 1.2, h = opt.h || 5, sh = opt.shieldMax || 0;
    var n = max + sh, w = n * cw + (n - 1) * gap + 2, x0 = cx - w / 2, y0 = bottom - h - 2;
    rr(ctx, x0, y0, w, h + 2, 1.5); ctx.fillStyle = '#120812'; ctx.fill();
    for (var i = 0; i < n; i++) {
      var x = x0 + 1 + i * (cw + gap), col;
      if (i < sh) col = i < (opt.shield || 0) ? '#5aa6ff' : '#2a3448';
      else col = (i - sh) < hp ? (opt.stun ? '#ffd84a' : '#ff4d5e') : '#3a2a34';
      ctx.fillStyle = col; ctx.fillRect(x, y0 + 1, cw, h);
      if (col === '#ff4d5e' || col === '#5aa6ff' || col === '#ffd84a') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y0 + 1, cw, 1.5); }
    }
    if (opt.brood) { ctx.lineWidth = 1.2; ctx.strokeStyle = BROOD; rr(ctx, x0 - 0.5, y0 - 0.5, w + 1, h + 3, 2); ctx.stroke(); }
  }

  // ---------- 新怪(翠林) ----------
  function thornFlower(ctx, s) { // 32x44, 底邊 y=22; s.state: idle / windup
    var f = s.facing || 1, wind = s.state === 'windup', brood = s.brood;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 根與葉
    ell(ctx, -7, 19, 7, 3.5, -0.3); fs(ctx, '#3f7d2a', 1.5); ell(ctx, 7, 19, 7, 3.5, 0.3); fs(ctx, '#3f7d2a', 1.5);
    ctx.strokeStyle = OL; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(-3, 8, 0, -4); ctx.stroke();
    ctx.strokeStyle = '#4f9a34'; ctx.lineWidth = 3.8; ctx.stroke();
    // 藤鞭
    function vine(pts, col) {
      ctx.strokeStyle = OL; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke();
    }
    if (wind) {
      // 面向側藤鞭整條往後拉成弓, 刺尖發紅光 = 要往前掃
      vine([f * 1, 6, -f * 10, 0, -f * 16, -16, -f * 6, -22], '#6fb83e');
      circle(ctx, -f * 6, -22, 4.5); ctx.fillStyle = 'rgba(255,59,59,0.4)'; ctx.fill();
      poly(ctx, [-f * 6, -26, -f * 3, -21, -f * 9, -20]); fs(ctx, '#ff6a4a', 1);
      vine([-f * 1, 8, -f * 8, 10, -f * 13, 4, -f * 13, -2], '#5aa036');
    } else {
      vine([f * 1, 8, f * 9, 10, f * 13, 4, f * 11, -1], '#5aa036');
      vine([-f * 1, 8, -f * 9, 10, -f * 13, 4, -f * 11, -1], '#5aa036');
    }
    // 刺
    ctx.fillStyle = '#e8f0c0';
    [[-2, 12], [1, 4], [-2, 0]].forEach(function (p) { poly(ctx, [p[0], p[1], p[0] - 3, p[1] - 1, p[0], p[1] - 3]); ctx.fill(); });
    // 花頭: 平常半閉; 預備全開露出紅心
    var open = wind ? 1 : 0.55, pr = 6 + open * 3;
    for (var i = 0; i < 6; i++) {
      var a = i * TAU / 6 + 0.3;
      ell(ctx, Math.cos(a) * pr * 0.8, -12 + Math.sin(a) * pr * 0.8, 5.5 * (0.7 + open * 0.3), 3.6, a);
      fs(ctx, brood ? '#9a5ad0' : '#e8506a', 1.5);
    }
    circle(ctx, 0, -12, 6.5); fs(ctx, wind ? '#3a0a12' : '#ffd23f', 1.8);
    if (wind) { // 張嘴 + 牙
      ctx.fillStyle = '#f4f0e0'; for (i = 0; i < 4; i++) { var ta = i * TAU / 4 + 0.78; poly(ctx, [Math.cos(ta) * 6, -12 + Math.sin(ta) * 6, Math.cos(ta + 0.3) * 3, -12 + Math.sin(ta + 0.3) * 3, Math.cos(ta - 0.3) * 3, -12 + Math.sin(ta - 0.3) * 3]); ctx.fill(); }
    }
    eye(ctx, f * 1.5, -13, wind ? 2.3 : 1.8, brood, wind);
  }

  // ---------- 新怪(高崖) ----------
  function ram(ctx, s) { // 44x36, 底邊 y=18
    var f = s.facing || 1, wind = s.state === 'windup', brood = s.brood;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (wind) { dust(ctx, -f * 18, 15, f); ctx.rotate(f * 0.1); }
    ctx.fillStyle = '#3e4350';
    var legs = [-12, -5, 5, 11];
    for (var i = 0; i < 4; i++) { var lx = legs[i] * f + (wind && i < 2 ? -f * 3 : 0); ctx.fillRect(lx - 2, 7, 4.5, 11); }
    // 羊毛身(圓瘤外緣)
    ctx.fillStyle = '#d4d8e2'; ctx.strokeStyle = OL; ctx.lineWidth = 2;
    var bumps = [[-14, 0, 6], [-8, -6, 6.5], [0, -7, 6.5], [7, -5, 6], [-12, 6, 5.5], [0, 6, 6], [8, 4, 5.5]];
    bumps.forEach(function (b) { circle(ctx, -f * 2 + b[0] * f * 0.9, b[1], b[2] + 0.8); ctx.stroke(); });
    bumps.forEach(function (b) { circle(ctx, -f * 2 + b[0] * f * 0.9, b[1], b[2]); ctx.fill(); });
    if (brood) { ctx.strokeStyle = BROOD; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-f * 12, -2); ctx.lineTo(-f * 7, -6); ctx.lineTo(-f * 2, -2); ctx.lineTo(f * 3, -6); ctx.stroke(); }
    // 頭: 預備時壓低往前
    var hx = f * (wind ? 17 : 14), hy = wind ? 5 : -4;
    ell(ctx, hx, hy, 6.5, 6); fs(ctx, '#6d7280', 2);
    // 捲角
    ctx.strokeStyle = OL; ctx.lineWidth = 5.2; ctx.beginPath(); ctx.arc(hx - f * 3, hy - 3, 5.5, wind ? 0.2 : -1.2, wind ? 3.8 : 2.6, f < 0); ctx.stroke();
    ctx.strokeStyle = '#c8a46a'; ctx.lineWidth = 3.2; ctx.stroke();
    if (wind) { poly(ctx, [hx + f * 3, hy - 4, hx + f * 10, hy - 2, hx + f * 4, hy + 1]); fs(ctx, '#e8cc90', 1.4); }
    eye(ctx, hx + f * 2.5, hy - 1.2, wind ? 2.2 : 1.7, brood, wind);
    if (wind) brow(ctx, hx - f * 1, hy - 4.5, hx + f * 5, hy - 2.5);
  }

  function eagle(ctx, s) { // 40x28
    var f = s.facing || 1, lock = s.state === 'lock', brood = s.brood;
    ctx.lineJoin = 'round';
    if (lock) ctx.rotate(f * 0.35); // 機頭朝下, 俯衝方向
    // 翅膀: 盤旋 = 平展; 鎖定 = 高舉成 V
    var wy = lock ? -13 : -2;
    poly(ctx, [-2, -2, -f * 20, wy, -f * 17, wy + 4, -f * 13, wy + 3, -f * 9, wy + 6, -4, 3]); fs(ctx, '#6a4528', 1.8);
    poly(ctx, [2, -2, f * 16, wy - 2, f * 14, wy + 2, f * 10, wy + 2, 4, 3]); fs(ctx, '#8a5e38', 1.8);
    if (brood) { ctx.strokeStyle = BROOD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-f * 18, wy + 2); ctx.lineTo(-f * 6, 1); ctx.stroke(); }
    poly(ctx, [-f * 9, 0, -f * 16, 3, -f * 15, 7, -f * 8, 4]); fs(ctx, '#e8e0d0', 1.4); // 尾羽
    ell(ctx, 0, 1, 9, 5.5); fs(ctx, '#7a5232', 2);
    circle(ctx, f * 9, -2, 4.6); fs(ctx, '#f4f0e6', 1.8);
    poly(ctx, [f * 12.5, -3, f * 17, -1, f * 12.5, 1]); fs(ctx, '#f2c230', 1.2);
    eye(ctx, f * 10, -3, lock ? 1.9 : 1.4, brood, lock);
    if (lock) {
      brow(ctx, f * 7, -6, f * 12, -4.5);
      ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; // 伸出的爪
      ctx.beginPath(); ctx.moveTo(f * 1, 5); ctx.lineTo(f * 4, 11); ctx.moveTo(-f * 2, 5); ctx.lineTo(f * 0, 11); ctx.stroke();
    }
  }

  function rockLizard(ctx, s) { // 36x24, 貼在天花板(頂邊 y=-12), 背朝上
    var f = s.facing || 1, wind = s.state === 'windup', brood = s.brood;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = OL; ctx.lineWidth = 3;
    [-9, -3, 4, 9].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, -4); ctx.lineTo(lx + (i % 2 ? 3 : -3), -11); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-f * 12, -4); ctx.quadraticCurveTo(-f * 20, -2, -f * 18, 5); ctx.lineWidth = 3.4; ctx.stroke();
    ctx.strokeStyle = '#a86a34'; ctx.lineWidth = 1.8; ctx.stroke();
    ell(ctx, -f * 1, -4, 13, 5.5); fs(ctx, '#c98a4a', 2);
    ctx.fillStyle = '#8a5a2e'; [[-6, -5], [0, -3], [5, -5]].forEach(function (p) { circle(ctx, f * p[0], p[1], 1.6); ctx.fill(); });
    if (brood) { ctx.fillStyle = BROOD; ctx.fillRect(-f * 10 - 2, -2, 14, 2); }
    // 頭朝下看
    ell(ctx, f * 13, -1, 5.5, 4.5, f * 0.5); fs(ctx, '#d89a58', 1.8);
    eye(ctx, f * 14.5, 0.5, wind ? 1.9 : 1.5, brood, wind);
    if (wind) {
      // 前爪抓著石塊往後拉 = 要丟
      ctx.strokeStyle = OL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f * 8, -2); ctx.lineTo(f * 4, 6); ctx.stroke();
      poly(ctx, [f * 0, 5, f * 5, 3, f * 9, 6, f * 8, 11, f * 2, 11]); fs(ctx, '#8a8f9a', 1.8);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; // 抖動線
      ctx.beginPath(); ctx.moveTo(-f * 2, 6); ctx.lineTo(-f * 4, 7); ctx.moveTo(f * 11, 6); ctx.lineTo(f * 13, 7); ctx.stroke();
    }
  }

  // ---------- 新怪(礦坑) ----------
  function shieldman(ctx, s) { // 32x44; state: shield / broken
    var f = s.facing || 1, broken = s.state === 'broken', brood = s.brood;
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#3a4050'; ctx.fillRect(-6, 12, 5, 10); ctx.fillRect(1, 12, 5, 10);
    rr(ctx, -9, -6, 16, 19, 4); fs(ctx, broken ? '#c0703a' : '#7d8799', 2); // 盾破 = 露出橘色內襯本體
    if (broken) { ctx.strokeStyle = '#5a2a10'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(4, 0); ctx.moveTo(-6, 5); ctx.lineTo(4, 5); ctx.stroke(); }
    if (brood) { ctx.strokeStyle = BROOD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-3, -2); ctx.lineTo(1, 2); ctx.lineTo(5, -2); ctx.stroke(); }
    rr(ctx, -8, -21, 15, 15, 5); fs(ctx, '#56607a', 2);
    ctx.fillStyle = '#120a0a'; ctx.fillRect(f > 0 ? 0 : -6.5, -15.5, 6.5, 3);
    eye(ctx, f * 3.5, -14, broken ? 2 : 1.4, brood, broken);
    if (!broken) {
      var sx = f > 0 ? 4.5 : -14.5;
      rr(ctx, sx, -15, 10, 30, 3); ctx.fillStyle = '#4f78a8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      circle(ctx, sx + 5, 0, 2.5); ctx.fillStyle = '#d8e2ee'; ctx.fill();
    } else {
      // 只剩握把與一塊碎片, 碎片掉在腳邊
      var bx = f > 0 ? 6 : -13;
      poly(ctx, [bx, -3, bx + 7, -5, bx + 5, 1, bx + 7, 5, bx, 6]); fs(ctx, '#4f78a8', 1.5);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + 1, -2); ctx.lineTo(bx + 4, 2); ctx.stroke();
      poly(ctx, [f * 9, 22, f * 15, 19, f * 17, 22]); fs(ctx, '#4f78a8', 1.2);
      brow(ctx, f * 0, -18, f * 6, -16.5);
    }
  }

  function beetle(ctx, s) { // 30x22, 底邊 y=11; state: crawl / flash
    var f = s.facing || 1, flash = s.state === 'flash', brood = s.brood;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (flash) { // 外圈警示光 + 火花
      circle(ctx, 0, 0, 17); ctx.fillStyle = 'rgba(255,80,40,0.28)'; ctx.fill();
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 1.8;
      for (var i = 0; i < 8; i++) { var a = i * TAU / 8 + 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 13); ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 16); ctx.stroke(); }
      ctx.scale(1.12, 1.12);
    }
    ctx.strokeStyle = OL; ctx.lineWidth = 2;
    [-7, 0, 7].forEach(function (lx) { ctx.beginPath(); ctx.moveTo(lx, 4); ctx.lineTo(lx - f * 3, 10); ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(-f * 1, 3, 13, 11, 0, Math.PI, TAU); ctx.closePath(); fs(ctx, flash ? '#ffffff' : '#3a3f4a', 2);
    // 殼縫: 平常暗橘, 閃爍時亮黃紅
    ctx.strokeStyle = flash ? '#ff3b1a' : '#d0702a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-f * 1, -8); ctx.lineTo(-f * 1, 3); ctx.moveTo(-f * 9, -2); ctx.lineTo(-f * 5, 2); ctx.moveTo(f * 7, -2); ctx.lineTo(f * 3, 2); ctx.stroke();
    if (brood) { ctx.strokeStyle = BROOD; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(-f * 1, 3, 8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    // 背上引信
    ctx.strokeStyle = OL; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-f * 4, -7); ctx.quadraticCurveTo(-f * 7, -12, -f * 5, -14); ctx.stroke();
    circle(ctx, -f * 5, -14, flash ? 2.8 : 1.6); ctx.fillStyle = flash ? '#ffe14d' : '#ff9a2a'; ctx.fill();
    ell(ctx, f * 12, 2, 4.5, 4); fs(ctx, '#2a2e38', 1.6);
    eye(ctx, f * 13, 1, 1.5, brood, flash);
  }

  function bat(ctx, s) { // 20x14
    var f = s.facing || 1, up = s.up ? 1 : 0;
    ctx.lineJoin = 'round';
    var wy = up ? -8 : 2;
    poly(ctx, [-3, -1, -10, wy, -8, wy + 3, -6, wy + 2, -4, 3]); fs(ctx, '#3a2a4c', 1.4);
    poly(ctx, [3, -1, 10, wy, 8, wy + 3, 6, wy + 2, 4, 3]); fs(ctx, '#3a2a4c', 1.4);
    circle(ctx, 0, 0, 4.6); fs(ctx, '#5a466e', 1.6);
    poly(ctx, [-3, -3, -2.5, -7, -0.5, -4]); fs(ctx, '#5a466e', 1); poly(ctx, [3, -3, 2.5, -7, 0.5, -4]); fs(ctx, '#5a466e', 1);
    eye(ctx, f * 1.2 - 1.2, -0.5, 1, false); eye(ctx, f * 1.2 + 1.2, -0.5, 1, false);
  }

  // ---------- 巢母 ----------
  function broodMark(ctx, pts) {
    ctx.save(); ctx.strokeStyle = BROOD; ctx.lineWidth = 2.2; ctx.shadowColor = BROOD; ctx.shadowBlur = 6; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.restore();
  }
  function thornSow(ctx, s) { // 翠林巢母 64x56: 荊棘母豬, 巡邏
    var f = s.facing || 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = '#2e2214'; [-18, -8, 6, 16].forEach(function (lx, i) { ctx.fillRect(lx * f - 3 + (i % 2 ? 1.5 : -1.5), 12, 6.5, 16); });
    ell(ctx, -f * 3, 2, 26, 17); fs(ctx, '#5d4a2e', 2.5);
    ctx.fillStyle = '#4a8a32'; // 苔
    ell(ctx, -f * 10, 8, 7, 3.5); ctx.fill(); ell(ctx, f * 2, 11, 5, 2.5); ctx.fill();
    // 荊棘鬃
    for (var i = 0; i < 6; i++) { var bx = -f * (20 - i * 6); poly(ctx, [bx, -11, bx - f * 2, -25 + (i % 2) * 4, bx + f * 4, -12]); fs(ctx, '#3f7d2a', 1.6); circle(ctx, bx - f * 2, -24 + (i % 2) * 4, 1.4); ctx.fillStyle = '#e8506a'; ctx.fill(); }
    broodMark(ctx, [-f * 20, 2, -f * 13, -5, -f * 6, 2, f * 1, -5, f * 8, 2]);
    ell(ctx, f * 20, 4, 11, 10); fs(ctx, '#6e5636', 2.2);
    rr(ctx, f > 0 ? 26 : -35, 2, 9, 8, 3); fs(ctx, '#d89a8a', 1.6);
    ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(f * 26, 11); ctx.quadraticCurveTo(f * 33, 11, f * 33, 2); ctx.stroke();
    poly(ctx, [f * 14, -4, f * 17, -14, f * 21, -6]); fs(ctx, '#4a3a22', 1.6);
    circle(ctx, f * 22, -1, 4.5); ctx.fillStyle = BROOD_GLOW; ctx.fill(); circle(ctx, f * 22, -1, 2.6); ctx.fillStyle = BROOD; ctx.fill();
  }
  function stormRoc(ctx, s) { // 高崖巢母 64x56: 雷鷲, 預備(翅膀高舉、壓低)
    var f = s.facing || 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    dust(ctx, -f * 24, 25, f); dust(ctx, f * 18, 26, -f);
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 4; [-8, 6].forEach(function (lx) { ctx.beginPath(); ctx.moveTo(lx, 14); ctx.lineTo(lx + f * 2, 26); ctx.stroke(); });
    // 高舉的雙翼(預備)
    poly(ctx, [-f * 6, -2, -f * 30, -26, -f * 26, -18, -f * 31, -14, -f * 24, -8, -f * 26, -2, -f * 12, 8]); fs(ctx, '#3e4e6e', 2.2);
    poly(ctx, [f * 2, -4, f * 20, -27, f * 20, -18, f * 26, -16, f * 14, 2]); fs(ctx, '#56688c', 2.2);
    ctx.fillStyle = BROOD; [[-f * 29, -24], [-f * 30, -14], [f * 21, -25]].forEach(function (p) { circle(ctx, p[0], p[1], 2); ctx.fill(); });
    ell(ctx, -f * 2, 6, 18, 14); fs(ctx, '#4a5a7a', 2.5);
    broodMark(ctx, [-f * 14, 6, -f * 8, 0, -f * 2, 6, f * 4, 0, f * 10, 6]);
    circle(ctx, f * 16, -6, 9); fs(ctx, '#f0ece2', 2.2);
    poly(ctx, [f * 23, -8, f * 32, -3, f * 23, 0]); fs(ctx, '#f2c230', 1.6);
    circle(ctx, f * 18, -8, 4.6); ctx.fillStyle = 'rgba(255,77,138,0.45)'; ctx.fill();
    circle(ctx, f * 18, -8, 2.6); ctx.fillStyle = '#ff4d8a'; ctx.fill();
    brow(ctx, f * 13, -13, f * 22, -10);
  }
  function crystalQueen(ctx, s) { // 礦坑巢母 64x56: 晶殼甲后, 暈眩(殼裂露出黃色弱點)
    var f = s.facing || 1, t = s.t || 0; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1236'; ctx.lineWidth = 4;
    for (var i = 0; i < 3; i++) { var lx = -16 + i * 14; ctx.beginPath(); ctx.moveTo(lx, 14); ctx.lineTo(lx - f * 3, 26); ctx.stroke(); }
    ell(ctx, -f * 4, 3, 26, 18); fs(ctx, '#4a2560', 2.5);
    // 背上晶簇(礦坑主題)
    [[-16, -10, 6, 15], [-6, -13, 7, 19], [5, -11, 5, 13]].forEach(function (c) {
      var x = f * c[0];
      poly(ctx, [x - c[2] / 2, c[1] + 2, x, c[1] - c[3], x + c[2] / 2, c[1] + 2]); fs(ctx, '#5fd8ea', 1.8);
      poly(ctx, [x, c[1] + 2, x, c[1] - c[3], x + c[2] / 2, c[1] + 2]); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    });
    broodMark(ctx, [-f * 20, 6, -f * 13, -1, -f * 6, 6, f * 1, -1, f * 8, 6]);
    // 破綻
    ctx.save(); ell(ctx, -f * 4, 0, 10, 6.5); ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 12; ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#1a0a20'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-f * 15, -1); ctx.lineTo(-f * 9, 1); ctx.moveTo(f * 7, -1); ctx.lineTo(f * 1, 1); ctx.stroke();
    ell(ctx, f * 20, 6, 10, 9.5); fs(ctx, '#3a1a4c', 2);
    ctx.strokeStyle = '#e8d8f0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f * 26, 10); ctx.quadraticCurveTo(f * 31, 12, f * 29, 17); ctx.moveTo(f * 26, 3); ctx.quadraticCurveTo(f * 31, 1, f * 30, -3); ctx.stroke();
    ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.6;
    [[f * 20, 2, 2.4], [f * 25, 6, 2]].forEach(function (e) { ctx.beginPath(); ctx.moveTo(e[0] - e[2], e[1] - e[2]); ctx.lineTo(e[0] + e[2], e[1] + e[2]); ctx.moveTo(e[0] + e[2], e[1] - e[2]); ctx.lineTo(e[0] - e[2], e[1] + e[2]); ctx.stroke(); });
    for (i = 0; i < 3; i++) { var a = t * 4 + i * TAU / 3; star(ctx, Math.cos(a) * 16, -47.5 + Math.sin(a), 3); }
  }

  // ---------- 版面 ----------
  var BANDS = [
    { name: '翠林谷地', sub: '明亮暖綠', y: 0, sky: ['#2a4a34', '#1c3226'], ground: '#63c35a', inner: '#7b5a3c' },
    { name: '風蝕高崖', sub: '開闊冷色', y: 240, sky: ['#3a4c68', '#26324a'], ground: '#e3eaf2', inner: '#7d8ca5' },
    { name: '地底礦坑', sub: '暗底晶光', y: 480, sky: ['#1e1a26', '#141018'], ground: '#9a7a52', inner: '#3a2e26' }
  ];
  var GROUND = 178; // 帶內地面高度

  // 在 (cx, groundY) 底邊站立, frame 高 h; fn 以框中心為原點
  function figure(ctx, cx, gy, w, h, fn, bar) {
    ctx.save(); ctx.translate(cx, gy - h / 2 * K); ctx.scale(K, K);
    fn(ctx);
    if (bar) hpBar(ctx, 0, -h / 2 - 6, bar.hp, bar.max, bar);
    ctx.restore();
  }
  function arrow(ctx, x, y) {
    ctx.save(); ctx.fillStyle = 'rgba(255,216,74,0.9)'; poly(ctx, [x - 7, y - 5, x + 3, y - 5, x + 3, y - 9, x + 10, y, x + 3, y + 9, x + 3, y + 5, x - 7, y + 5]); ctx.fill(); ctx.restore();
  }
  function caption(ctx, cx, y, name, line) { text(ctx, name, cx, y, 16, '#f2f4f8', 'center', true); text(ctx, line, cx, y + 19, 12, '#b8c2d4', 'center', false); }
  function stateTag(ctx, x, y, s, hot) { text(ctx, s, x, y, 11, hot ? '#ffb0a0' : '#8f9ab0', 'center', false); }

  function band(ctx, b) {
    ctx.save(); ctx.translate(0, b.y);
    var g = ctx.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, b.sky[0]); g.addColorStop(1, b.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 240);
    ctx.fillStyle = b.inner; ctx.fillRect(130, GROUND, 1150, 62);
    ctx.fillStyle = b.ground; ctx.fillRect(130, GROUND, 1150, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(130, GROUND + 8, 1150, 2);
    ctx.fillStyle = 'rgba(8,10,18,0.55)'; ctx.fillRect(0, 0, 130, 240);
    text(ctx, b.name, 65, 104, 20, '#f2f4f8', 'center', true);
    text(ctx, b.sub, 65, 130, 12, '#9aa4b8', 'center', false);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(130, 0, 1, 240);
    ctx.restore();
  }

  function draw(ctx, t) {
    t = 0; // 靜態
    ctx.save();
    ctx.fillStyle = '#10141e'; ctx.fillRect(0, 0, 1280, 720);
    BANDS.forEach(function (b) { band(ctx, b); });
    var hasArt = typeof Art !== 'undefined' && Art && Art.drawBoar;

    // ===== 翠林 =====
    var y0 = 0, gy = y0 + GROUND;
    var slots = [250, 470, 690, 900];
    // 野豬
    figure(ctx, slots[0] - 52, gy, 48, 32, function (c) { if (hasArt) Art.drawBoar(c, { x: 0, y: 0, facing: 1, state: 'walk', hit: false, brood: false, t: 0.1 }); }, { hp: 3, max: 3 });
    arrow(ctx, slots[0] - 4, gy - 24);
    figure(ctx, slots[0] + 52, gy, 48, 32, function (c) { if (hasArt) Art.drawBoar(c, { x: 0, y: 0, facing: 1, state: 'windup', hit: false, brood: false, t: 0 }); }, { hp: 2, max: 3 });
    stateTag(ctx, slots[0] - 52, gy + 14, '巡邏'); stateTag(ctx, slots[0] + 52, gy + 14, '蓄力', true);
    caption(ctx, slots[0], gy + 34, '野豬', '發現玩家 → 壓低蓄力 → 直線衝撞');
    // 跳蛙
    figure(ctx, slots[1] - 46, gy, 32, 28, function (c) { if (hasArt) Art.drawFrog(c, { x: 0, y: 0, facing: 1, state: 'crouch', hit: false, brood: false }); }, { hp: 2, max: 2 });
    arrow(ctx, slots[1] - 4, gy - 24);
    figure(ctx, slots[1] + 46, gy - 34, 32, 28, function (c) { if (hasArt) Art.drawFrog(c, { x: 0, y: 0, facing: 1, state: 'jump', hit: false, brood: false }); }, { hp: 2, max: 2 });
    stateTag(ctx, slots[1] - 46, gy + 14, '蹲伏'); stateTag(ctx, slots[1] + 46, gy + 14, '撲跳', true);
    caption(ctx, slots[1], gy + 34, '跳蛙', '每 1.2 秒朝玩家跳一次');
    // 射手蜂
    figure(ctx, slots[2] - 46, gy - 40, 32, 32, function (c) { if (hasArt) Art.drawShooterBee(c, { x: 0, y: 0, facing: 1, state: 'fly', hit: false, brood: false, t: 0.03 }); }, { hp: 1, max: 1 });
    arrow(ctx, slots[2] - 4, gy - 64);
    figure(ctx, slots[2] + 46, gy - 40, 32, 32, function (c) { if (hasArt) Art.drawShooterBee(c, { x: 0, y: 0, facing: 1, state: 'aim', hit: false, brood: false, t: 0.05 }); }, { hp: 1, max: 1 });
    stateTag(ctx, slots[2] - 46, gy + 14, '巡飛'); stateTag(ctx, slots[2] + 46, gy + 14, '停下瞄準', true);
    caption(ctx, slots[2], gy + 34, '射手蜂', '停住、針尖發紅 → 射出蜂彈');
    // 刺藤花
    figure(ctx, slots[3] - 42, gy, 32, 44, function (c) { thornFlower(c, { facing: 1, state: 'idle' }); }, { hp: 3, max: 3 });
    arrow(ctx, slots[3] - 4, gy - 30);
    figure(ctx, slots[3] + 42, gy, 32, 44, function (c) { thornFlower(c, { facing: 1, state: 'windup' }); }, { hp: 3, max: 3 });
    stateTag(ctx, slots[3] - 42, gy + 14, '扎根'); stateTag(ctx, slots[3] + 42, gy + 14, '藤鞭後拉', true);
    caption(ctx, slots[3], gy + 34, '刺藤花', '不會走; 靠近時往前橫掃');
    // 巢母
    figure(ctx, 1150, gy, 64, 56, function (c) { thornSow(c, { facing: -1 }); }, { hp: 9, max: 12, cw: 3.6, h: 6, brood: true });
    stateTag(ctx, 1150, gy + 14, '巡邏');
    caption(ctx, 1150, gy + 34, '巢母·荊棘母豬', '巢穴深處; 衝撞後暈眩');

    // ===== 高崖 =====
    y0 = 240; gy = y0 + GROUND;
    // 岩角羊
    figure(ctx, slots[0] - 52, gy, 44, 36, function (c) { ram(c, { facing: 1, state: 'walk' }); }, { hp: 4, max: 4 });
    arrow(ctx, slots[0] - 4, gy - 26);
    figure(ctx, slots[0] + 52, gy, 44, 36, function (c) { ram(c, { facing: 1, state: 'windup' }); }, { hp: 4, max: 4 });
    stateTag(ctx, slots[0] - 52, gy + 14, '巡邏'); stateTag(ctx, slots[0] + 52, gy + 14, '低頭蹬地', true);
    caption(ctx, slots[0], gy + 34, '岩角羊', '頂撞把人撞退一大段');
    // 俯衝鷹
    figure(ctx, slots[1] - 48, gy - 70, 40, 28, function (c) { eagle(c, { facing: 1, state: 'glide' }); }, { hp: 2, max: 2 });
    arrow(ctx, slots[1] - 4, gy - 92);
    figure(ctx, slots[1] + 48, gy - 70, 40, 28, function (c) { eagle(c, { facing: 1, state: 'lock' }); }, { hp: 2, max: 2 });
    stateTag(ctx, slots[1] - 48, gy + 14, '高處盤旋'); stateTag(ctx, slots[1] + 48, gy + 14, '舉翼鎖定', true);
    caption(ctx, slots[1], gy + 34, '俯衝鷹', '鎖定後斜線俯衝再飛回');
    // 落石蜥(天花板)
    ctx.fillStyle = '#7d8ca5'; ctx.fillRect(slots[2] - 100, y0 + 30, 200, 28); ctx.fillStyle = '#e3eaf2'; ctx.fillRect(slots[2] - 100, y0 + 56, 200, 3);
    [[slots[2] - 46, 'crawl'], [slots[2] + 46, 'windup']].forEach(function (p, i) {
      ctx.save(); ctx.translate(p[0], y0 + 59 + 12 * K); ctx.scale(K, K);
      rockLizard(ctx, { facing: 1, state: p[1] });
      hpBar(ctx, 0, 24, 2, 2); // 倒掛: 血條放在身體下方(開闊側)
      ctx.restore();
    });
    arrow(ctx, slots[2] - 4, y0 + 82);
    stateTag(ctx, slots[2] - 46, gy + 14, '貼頂爬行'); stateTag(ctx, slots[2] + 46, gy + 14, '抓石要丟', true);
    caption(ctx, slots[2], gy + 34, '落石蜥', '倒掛牆頂, 往下丟石塊');
    // 巢穴怪對照
    figure(ctx, slots[3] - 42, gy, 48, 32, function (c) { if (hasArt) Art.drawBoar(c, { x: 0, y: 0, facing: 1, state: 'walk', hit: false, brood: false, t: 0.3 }); }, { hp: 3, max: 3 });
    figure(ctx, slots[3] + 42, gy, 48, 32, function (c) { if (hasArt) Art.drawBoar(c, { x: 0, y: 0, facing: 1, state: 'walk', hit: false, brood: true, t: 0.3 }); }, { hp: 3, max: 3, brood: true });
    stateTag(ctx, slots[3] - 42, gy + 14, '一般'); stateTag(ctx, slots[3] + 42, gy + 14, '巢穴怪');
    caption(ctx, slots[3], gy + 34, '巢穴怪對照', '紫眼 + 紫紋 + 紫框血條');
    // 巢母
    figure(ctx, 1150, gy, 64, 56, function (c) { stormRoc(c, { facing: -1 }); }, { hp: 12, max: 12, cw: 3.6, h: 6, brood: true });
    stateTag(ctx, 1150, gy + 14, '舉翼預備', true);
    caption(ctx, 1150, gy + 34, '巢母·雷鷲', '翅膀高舉 = 要撲過來');

    // ===== 礦坑 =====
    y0 = 480; gy = y0 + GROUND;
    // 礦燈光暈
    ctx.save(); var lg = ctx.createRadialGradient(600, y0 + 40, 4, 600, y0 + 40, 260); lg.addColorStop(0, 'rgba(255,200,120,0.16)'); lg.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = lg; ctx.fillRect(130, y0, 1150, 240); ctx.restore();
    // 盾兵
    figure(ctx, slots[0] - 46, gy, 32, 44, function (c) { shieldman(c, { facing: 1, state: 'shield' }); }, { hp: 3, max: 3, shield: 2, shieldMax: 2 });
    arrow(ctx, slots[0] - 4, gy - 30);
    figure(ctx, slots[0] + 46, gy, 32, 44, function (c) { shieldman(c, { facing: 1, state: 'broken' }); }, { hp: 3, max: 3, shield: 0, shieldMax: 2 });
    stateTag(ctx, slots[0] - 46, gy + 14, '舉盾'); stateTag(ctx, slots[0] + 46, gy + 14, '盾已破', true);
    caption(ctx, slots[0], gy + 34, '盾兵', '藍格 = 盾; 打光才傷得到本體');
    // 爆炸甲蟲
    figure(ctx, slots[1] - 44, gy, 30, 22, function (c) { beetle(c, { facing: 1, state: 'crawl' }); }, { hp: 1, max: 1 });
    arrow(ctx, slots[1] - 4, gy - 20);
    figure(ctx, slots[1] + 44, gy, 30, 22, function (c) { beetle(c, { facing: 1, state: 'flash' }); }, { hp: 1, max: 1 });
    stateTag(ctx, slots[1] - 44, gy + 14, '爬近'); stateTag(ctx, slots[1] + 44, gy + 14, '閃爍要爆', true);
    caption(ctx, slots[1], gy + 34, '爆炸甲蟲', '貼近後閃白再自爆; 可擊飛去炸怪');
    // 蝙蝠群
    ctx.save(); ctx.translate(slots[2] + 105, gy - 78); ctx.scale(K, K);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(200,180,230,0.35)'; ctx.lineWidth = 1; ell(ctx, 0, 0, 30, 16); ctx.stroke(); ctx.setLineDash([]);
    [[0, -16, 1, 1, true], [-26, 8, -1, 1, false], [26, 8, 1, 0, false]].forEach(function (b) {
      ctx.save(); ctx.translate(b[0], b[1]); bat(ctx, { facing: b[2], up: b[4] }); hpBar(ctx, 0, -9, b[3], 1); ctx.restore();
    });
    ctx.restore();
    caption(ctx, slots[2] + 105, gy + 34, '蝙蝠群', '3 隻繞圈飛; 各自 1 格血, 一隻一隻打');
    // 巢母
    figure(ctx, 1150, gy, 64, 56, function (c) { crystalQueen(c, { facing: -1, t: 0.2 }); }, { hp: 5, max: 12, cw: 3.6, h: 6, brood: true, stun: true });
    stateTag(ctx, 1150, gy + 14, '暈眩·破綻', true);
    caption(ctx, 1150, gy + 34, '巢母·晶殼甲后', '殼裂露黃 = 傷害 ×2');

    // 圖例(左欄底)
    text(ctx, '放大 1.5 倍', 65, 200, 11, '#7f8aa0', 'center', false);
    text(ctx, '左平常 → 右預備', 65, 216, 11, '#7f8aa0', 'center', false);
    ctx.restore();
  }

  return { element: 'monsters', id: 'A', kind: 'static', size: [1280, 720], duration: 0, loop: false, draw: draw };
})();
