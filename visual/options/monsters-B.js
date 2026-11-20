/* 怪物設計 方案 B — 情境舞台: 三主題各一直欄小場景, 怪物放在真的地形上、玩家就在旁邊,
 * 每隻都停在「預備」那一刻, 預備動作投影到世界上(衝撞道、瞄準線、俯衝軌跡、落石柱、爆炸圈、藤鞭掃區)。
 * 造型: 圓潤 Q 版, 無黑描邊, 上亮下暗的漸層體 + 白眼紅瞳; 血條 = 圓角連續條, 長度跟最大血量成正比, 白段 = 剛扣掉的。
 */
window.VISUAL_OPTION = (function () {
  'use strict';
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var TAU = Math.PI * 2;
  var BROOD = '#c264ff';
  var S = 1.2;            // 場景倍率
  var PW = 1280 / 3;      // 每欄寬

  // ---------- 小工具 ----------
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
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
  // 圓潤體: 上亮下暗漸層 + 同色系深邊 + 左上高光
  function blob(ctx, x, y, rx, ry, light, dark, rot) {
    var g = ctx.createLinearGradient(x, y - ry, x, y + ry); g.addColorStop(0, light); g.addColorStop(1, dark);
    ell(ctx, x, y, rx, ry, rot); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(20,10,20,0.45)'; ctx.stroke();
    ell(ctx, x - rx * 0.35, y - ry * 0.45, rx * 0.35, ry * 0.22, -0.4); ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fill();
  }
  // 白眼紅瞳; angry = 預備(瞳孔變豎縫 + 紅光)
  function eyeB(ctx, x, y, r, angry, brood) {
    if (angry) { circle(ctx, x, y, r + 2.5); ctx.fillStyle = brood ? 'rgba(194,100,255,0.45)' : 'rgba(255,50,50,0.42)'; ctx.fill(); }
    circle(ctx, x, y, r); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    ctx.fillStyle = brood ? BROOD : '#e8282c';
    if (angry) ell(ctx, x, y, r * 0.32, r * 0.8); else circle(ctx, x, y, r * 0.52);
    ctx.fill();
  }
  function shadow(ctx, x, y, rx) { ell(ctx, x, y, rx, rx * 0.22); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill(); }
  function angryBrow(ctx, x, y, f, w) { ctx.strokeStyle = '#2a1010'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - f * w, y - 2.5); ctx.lineTo(x + f * w, y + 0.5); ctx.stroke(); }

  // 圓角連續血條: 長度 = 最大血量 × 7(最少 16); chip = 剛扣掉那段畫白
  function hpBar(ctx, cx, bottom, hp, max, opt) {
    opt = opt || {};
    var per = opt.per || 7, w = Math.max(16, max * per), h = opt.h || 4, x0 = cx - w / 2, y0 = bottom - h;
    rr(ctx, x0 - 1.5, y0 - 1.5, w + 3, h + 3, (h + 3) / 2); ctx.fillStyle = 'rgba(10,6,14,0.78)'; ctx.fill();
    if (opt.brood) { ctx.lineWidth = 1.2; ctx.strokeStyle = BROOD; ctx.stroke(); }
    var fw = w * hp / max, cw = w * (opt.chip || 0) / max;
    if (cw > 0) { rr(ctx, x0, y0, Math.min(w, fw + cw), h, h / 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    if (fw > 0) {
      var g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, opt.stun ? '#fff09a' : '#ff8a8a'); g.addColorStop(1, opt.stun ? '#e8b020' : '#e02a3c');
      rr(ctx, x0, y0, fw, h, h / 2); ctx.fillStyle = g; ctx.fill();
    }
    if (opt.shield) { // 盾值: 條的左端外掛一塊藍色小盾
      poly(ctx, [x0 - 9, y0 - 2, x0 - 3, y0 - 2, x0 - 3, y0 + 3, x0 - 6, y0 + h + 2, x0 - 9, y0 + 3]);
      ctx.fillStyle = opt.shield > 0 ? '#5aa6ff' : '#3a4458'; ctx.fill();
    }
  }

  // ---------- 危險投影(預備動作畫到世界上) ----------
  function stripes(ctx, x, y, w, h, col) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = col.replace('A', '0.16'); ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = col.replace('A', '0.34'); ctx.lineWidth = 3;
    for (var i = -h; i < w + h; i += 9) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
    ctx.restore();
  }
  function lane(ctx, x1, x2, top, bot, f) { // 衝撞道: 紅斜紋帶 + 前進箭頭
    var x = Math.min(x1, x2), w = Math.abs(x2 - x1);
    stripes(ctx, x, top, w, bot - top, 'rgba(255,60,50,A)');
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,90,70,0.8)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.moveTo(x, bot); ctx.lineTo(x + w, bot); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(255,110,90,0.85)'; var my = (top + bot) / 2;
    for (var i = 0; i < 3; i++) { var ax = x1 + f * (24 + i * 14); poly(ctx, [ax, my - 6, ax + f * 7, my, ax, my + 6, ax + f * 3, my]); ctx.fill(); }
  }
  function aimLine(ctx, x1, y1, x2, y2) { // 瞄準: 紅點線 + 準星
    ctx.save(); ctx.setLineDash([2, 4]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,70,50,0.9)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    reticle(ctx, x2, y2, 9); ctx.restore();
  }
  function reticle(ctx, x, y, r) {
    ctx.strokeStyle = 'rgba(255,70,50,0.95)'; ctx.lineWidth = 1.6; circle(ctx, x, y, r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r - 4, y); ctx.lineTo(x - r + 3, y); ctx.moveTo(x + r - 3, y); ctx.lineTo(x + r + 4, y);
    ctx.moveTo(x, y - r - 4); ctx.lineTo(x, y - r + 3); ctx.moveTo(x, y + r - 3); ctx.lineTo(x, y + r + 4); ctx.stroke();
  }
  function landMark(ctx, x, y, rx) { // 落點: 地上紅橢圓
    ell(ctx, x, y, rx, rx * 0.28); ctx.fillStyle = 'rgba(255,60,50,0.28)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
  }
  function dashCurve(ctx, pts, col) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = col || 'rgba(255,90,70,0.85)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    if (pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); else ctx.lineTo(pts[2], pts[3]);
    ctx.stroke(); ctx.restore();
  }
  function arrowHead(ctx, x, y, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); poly(ctx, [0, 0, -9, -5, -9, 5]); ctx.fillStyle = col || 'rgba(255,90,70,0.95)'; ctx.fill(); ctx.restore();
  }
  function blastRing(ctx, x, y, r) { // 自爆範圍: 雙圈 + 淡紅底
    circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,70,40,0.14)'; ctx.fill();
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = 'rgba(255,90,60,0.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    circle(ctx, x, y, r * 0.62); ctx.strokeStyle = 'rgba(255,200,80,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  // ---------- 怪物(原點 = 判定框中心, 遊戲 px) ----------
  function boarB(ctx, s) { // 48x32
    var f = s.f, w = s.windup;
    shadow(ctx, 0, 16, 20);
    if (w) { ctx.fillStyle = 'rgba(220,200,170,0.8)'; circle(ctx, -f * 20, 12, 4); ctx.fill(); circle(ctx, -f * 26, 14, 3); ctx.fill(); ctx.translate(0, 16); ctx.scale(1.06, 0.86); ctx.translate(0, -16); }
    ctx.fillStyle = '#5a3020'; [-12, -5, 6, 12].forEach(function (lx) { rr(ctx, lx * f - 2.5, 8, 5.5, 8, 2.5); ctx.fill(); });
    blob(ctx, -f * 2, 1, 18, 12, s.brood ? '#a86a8a' : '#d08a58', s.brood ? '#5a2a50' : '#7a4426');
    poly(ctx, [-f * 2, -10, f * 2, -17, f * 5, -9]); ctx.fillStyle = '#7a4426'; ctx.fill();
    blob(ctx, f * 15, 4, 6.5, 5.5, '#f2b4a4', '#c8786a');
    ctx.fillStyle = '#5a2a20'; circle(ctx, f * 17, 3, 1); ctx.fill(); circle(ctx, f * 14, 3, 1); ctx.fill();
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 12, 8); ctx.quadraticCurveTo(f * 16, 10, f * 18, 4); ctx.stroke();
    eyeB(ctx, f * 8, -3, 3.4, w, s.brood); if (w) angryBrow(ctx, f * 8, -7, f, 3.5);
  }
  function frogB(ctx, s) { // 32x28; 預備 = 壓到最扁、後腿收緊
    var f = s.f, w = s.windup;
    shadow(ctx, 0, 14, 15);
    var sy = w ? 0.78 : 1;
    ctx.save(); ctx.translate(0, 14); ctx.scale(w ? 1.12 : 1, sy); ctx.translate(0, -14);
    blob(ctx, -f * 9, 9, 6.5, 5, '#a8d040', '#5a8a18');
    blob(ctx, 0, 4, 14, 9, s.brood ? '#b8a0e0' : '#d4f060', s.brood ? '#6a4a9a' : '#6a9a20');
    ell(ctx, 0, 8, 9, 4); ctx.fillStyle = 'rgba(255,250,210,0.5)'; ctx.fill();
    ctx.restore();
    var ey = w ? 0 : -4;
    eyeB(ctx, f * 2, ey, 4, w, s.brood); eyeB(ctx, f * 9, ey + 1, 4, w, s.brood);
    if (w) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-f * 14, 0); ctx.lineTo(-f * 17, -4); ctx.moveTo(-f * 10, -3); ctx.lineTo(-f * 12, -8); ctx.stroke(); }
  }
  function beeB(ctx, s) { // 32x32
    var f = s.f, w = s.windup;
    ctx.save(); if (w) ctx.rotate(f * 0.35);
    ell(ctx, -f * 3, -9, 6, 5, -0.4); ctx.fillStyle = 'rgba(235,245,255,0.6)'; ctx.fill();
    ell(ctx, f * 2, -10, 5, 4.5, 0.4); ctx.fill();
    blob(ctx, -f * 3, 2, 10.5, 8.5, w ? '#ffc070' : '#ffe070', w ? '#e06a10' : '#d89a10');
    ctx.save(); ell(ctx, -f * 3, 2, 10.5, 8.5); ctx.clip(); ctx.fillStyle = 'rgba(40,24,8,0.85)'; ctx.fillRect(-f * 3 - 6, -8, 3.5, 20); ctx.fillRect(-f * 3 + 1, -8, 3.5, 20); ctx.restore();
    blob(ctx, f * 9, -1, 5.5, 5.5, '#6a4a20', '#3a2410');
    eyeB(ctx, f * 10.5, -2, 2.6, w, s.brood);
    poly(ctx, [-f * 12, 4, -f * 12, 8, -f * 18, 7]); ctx.fillStyle = '#2a1a08'; ctx.fill();
    if (w) { circle(ctx, -f * 18, 7, 3.2); ctx.fillStyle = 'rgba(255,70,40,0.9)'; ctx.fill(); }
    ctx.restore();
  }
  function flowerB(ctx, s) { // 32x44, 底邊 y=22
    var f = s.f, w = s.windup;
    ell(ctx, -6, 20, 7, 3, -0.3); ctx.fillStyle = '#4a9a34'; ctx.fill(); ell(ctx, 6, 20, 7, 3, 0.3); ctx.fill();
    ctx.strokeStyle = '#4f9a34'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(-3, 8, 0, -4); ctx.stroke();
    ctx.strokeStyle = '#6fbf42'; ctx.lineWidth = 3;
    ctx.beginPath();
    if (w) { ctx.moveTo(f * 1, 6); ctx.bezierCurveTo(-f * 12, 2, -f * 18, -16, -f * 7, -22); }
    else { ctx.moveTo(f * 1, 8); ctx.bezierCurveTo(f * 10, 10, f * 13, 3, f * 11, -1); }
    ctx.moveTo(-f * 1, 8); ctx.bezierCurveTo(-f * 9, 10, -f * 13, 3, -f * 11, -1); ctx.stroke();
    if (w) { circle(ctx, -f * 7, -22, 3.5); ctx.fillStyle = 'rgba(255,70,50,0.85)'; ctx.fill(); }
    var open = w ? 1 : 0.6;
    for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + 0.3; blob(ctx, Math.cos(a) * (5 + open * 3), -12 + Math.sin(a) * (5 + open * 3), 5 * (0.7 + 0.3 * open), 3.8, '#ff8aa0', '#d03a5a', a); }
    blob(ctx, 0, -12, 6, 6, w ? '#7a1a2a' : '#ffe680', w ? '#3a0810' : '#e8a820');
    eyeB(ctx, f * 1, -13, 2.6, w, s.brood);
  }
  function ramB(ctx, s) { // 44x36, 底邊 y=18
    var f = s.f, w = s.windup;
    shadow(ctx, 0, 18, 20);
    if (w) { ctx.fillStyle = 'rgba(230,236,246,0.85)'; circle(ctx, -f * 20, 15, 4); ctx.fill(); circle(ctx, -f * 26, 16, 3); ctx.fill(); }
    ctx.fillStyle = '#4a5060'; [-12, -5, 5, 11].forEach(function (lx, i) { rr(ctx, lx * f - 2.5 + (w && i < 2 ? -f * 3 : 0), 7, 5, 11, 2.5); ctx.fill(); });
    [[-12, 0, 8], [-4, -6, 8.5], [5, -4, 8], [-9, 6, 7.5], [3, 5, 8]].forEach(function (b) { blob(ctx, -f * 2 + b[0] * f, b[1], b[2], b[2] * 0.92, '#ffffff', '#aab4c8'); });
    var hx = f * (w ? 17 : 14), hy = w ? 5 : -4;
    blob(ctx, hx, hy, 6.5, 6, '#7a8294', '#4a5060');
    ctx.strokeStyle = '#e0bc78'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx - f * 3, hy - 3, 5.5, w ? 0.2 : -1.2, w ? 3.8 : 2.6); ctx.stroke();
    eyeB(ctx, hx + f * 2.5, hy - 1, 2.6, w, s.brood); if (w) angryBrow(ctx, hx + f * 2.5, hy - 4.5, f, 3);
  }
  function eagleB(ctx, s) { // 40x28
    var f = s.f, w = s.windup;
    ctx.save(); if (w) ctx.rotate(f * 0.45);
    var wy = w ? -14 : -1;
    blob(ctx, -f * 11, wy * 0.6, 11, 5, '#7a8eb8', '#3e4e72', -f * (w ? 0.9 : 0.15));
    blob(ctx, f * 8, wy * 0.6 - 1, 9, 4.5, '#8ea2c8', '#4a5a80', f * (w ? 0.9 : 0.15));
    blob(ctx, 0, 1, 9, 6, '#6a7ea8', '#34446a');
    blob(ctx, f * 9, -2, 5, 5, '#ffffff', '#c8ccd8');
    poly(ctx, [f * 13, -3, f * 17, -1, f * 13, 1]); ctx.fillStyle = '#f2c230'; ctx.fill();
    eyeB(ctx, f * 10, -3, 2.2, w, s.brood);
    if (w) { ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 1, 6); ctx.lineTo(f * 4, 11); ctx.moveTo(-f * 2, 6); ctx.lineTo(f * 0, 11); ctx.stroke(); }
    ctx.restore();
  }
  function lizardB(ctx, s) { // 36x24, 頂邊 y=-12 貼天花板
    var f = s.f, w = s.windup;
    ctx.strokeStyle = '#8a5a2e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    [-9, -3, 4, 9].forEach(function (lx, i) { ctx.beginPath(); ctx.moveTo(lx, -4); ctx.lineTo(lx + (i % 2 ? 3 : -3), -11); ctx.stroke(); });
    ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-f * 12, -4); ctx.quadraticCurveTo(-f * 20, -2, -f * 18, 5); ctx.stroke();
    blob(ctx, -f * 1, -4, 13, 5.5, '#e8b070', '#a86a34');
    blob(ctx, f * 13, -1, 5.5, 4.5, '#f0bc80', '#b07038', f * 0.5);
    eyeB(ctx, f * 14, 0, 2.4, w, s.brood);
    if (w) { blob(ctx, f * 5, 8, 5.5, 4.5, '#b8bec8', '#6a707c'); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-f * 2, 7); ctx.lineTo(-f * 4, 8); ctx.moveTo(f * 12, 7); ctx.lineTo(f * 14, 8); ctx.stroke(); }
  }
  function shieldB(ctx, s) { // 32x44
    var f = s.f, broken = s.broken;
    shadow(ctx, 0, 22, 14);
    ctx.fillStyle = '#3a4050'; rr(ctx, -6, 12, 5, 10, 2); ctx.fill(); rr(ctx, 1, 12, 5, 10, 2); ctx.fill();
    blob(ctx, -1, 3, 10, 11, broken ? '#f0a060' : '#9aa4b8', broken ? '#b0582a' : '#56607a');
    blob(ctx, -1, -13, 8.5, 8.5, '#7a849c', '#424a60');
    rr(ctx, f > 0 ? -1 : -7, -15, 8, 3.5, 1.5); ctx.fillStyle = '#120a0a'; ctx.fill();
    eyeB(ctx, f * 3, -13.2, 2, broken, s.brood);
    if (!broken) {
      var sx = f > 0 ? 4 : -16;
      var g = ctx.createLinearGradient(sx, 0, sx + 12, 0); g.addColorStop(0, '#7aa8e0'); g.addColorStop(1, '#3a5f90');
      rr(ctx, sx, -16, 12, 32, 5); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#e8f0ff'; ctx.stroke();
      circle(ctx, sx + 6, 0, 2.5); ctx.fillStyle = '#e8f0ff'; ctx.fill();
    } else {
      var bx = f > 0 ? 6 : -13;
      poly(ctx, [bx, -3, bx + 7, -6, bx + 5, 1, bx + 7, 5, bx, 6]); ctx.fillStyle = '#5a86c0'; ctx.fill();
      poly(ctx, [f * 10, 22, f * 15, 18, f * 18, 22]); ctx.fill();
      angryBrow(ctx, f * 3, -17, f, 3.5);
    }
  }
  function beetleB(ctx, s) { // 30x22, 底邊 y=11
    var f = s.f, w = s.windup;
    shadow(ctx, 0, 11, 14);
    if (w) { circle(ctx, 0, 0, 15); ctx.fillStyle = 'rgba(255,120,60,0.35)'; ctx.fill(); }
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    [-7, 0, 7].forEach(function (lx) { ctx.beginPath(); ctx.moveTo(lx, 4); ctx.lineTo(lx - f * 3, 10); ctx.stroke(); });
    ctx.save(); ctx.beginPath(); ctx.ellipse(-f * 1, 4, 13, 12, 0, Math.PI, TAU); ctx.closePath();
    var g = ctx.createLinearGradient(0, -8, 0, 4); g.addColorStop(0, w ? '#ffffff' : '#5a6070'); g.addColorStop(1, w ? '#ff6a3a' : '#22262e');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ell(ctx, -f * 1, 3, 9, 2.5); ctx.fillStyle = w ? '#ffe14d' : '#ff9a2a'; ctx.fill(); // 腹部火光縫
    blob(ctx, f * 12, 2, 4.5, 4, '#3a3e48', '#1a1c22');
    eyeB(ctx, f * 13, 1, 2, w, s.brood);
    ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-f * 4, -7); ctx.quadraticCurveTo(-f * 7, -12, -f * 5, -14); ctx.stroke();
    circle(ctx, -f * 5, -14, w ? 3 : 1.6); ctx.fillStyle = '#ffe14d'; ctx.fill();
  }
  function batB(ctx, s) { // 20x14
    var f = s.f, up = s.up;
    var wy = up ? -6 : 2;
    blob(ctx, -7, wy * 0.5, 6, 3, '#7a6a9a', '#3a2a50', up ? 0.6 : -0.2);
    blob(ctx, 7, wy * 0.5, 6, 3, '#7a6a9a', '#3a2a50', up ? -0.6 : 0.2);
    blob(ctx, 0, 0, 5, 5, '#8a7aaa', '#4a3a66');
    poly(ctx, [-3.5, -3, -3, -7.5, -0.8, -4]); ctx.fillStyle = '#5a4a7a'; ctx.fill(); poly(ctx, [3.5, -3, 3, -7.5, 0.8, -4]); ctx.fill();
    eyeB(ctx, f * 1.6 - 1.6, -0.5, 1.6, false); eyeB(ctx, f * 1.6 + 1.6, -0.5, 1.6, false);
  }
  // 巢母(64x56): 共同巢穴記號 = 背上發光紫紋
  function veins(ctx, pts) {
    ctx.save(); ctx.strokeStyle = BROOD; ctx.lineWidth = 2.2; ctx.shadowColor = BROOD; ctx.shadowBlur = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); ctx.restore();
  }
  function sowB(ctx, s) {
    var f = s.f;
    shadow(ctx, 0, 28, 30);
    ctx.fillStyle = 'rgba(220,200,170,0.85)'; circle(ctx, -f * 30, 24, 5); ctx.fill(); circle(ctx, -f * 37, 26, 3.5); ctx.fill();
    ctx.translate(0, 28); ctx.scale(1.05, 0.88); ctx.translate(0, -28);
    ctx.fillStyle = '#3a2614'; [-18, -8, 6, 16].forEach(function (lx) { rr(ctx, lx * f - 3.5, 12, 7, 16, 3); ctx.fill(); });
    for (var i = 0; i < 6; i++) { var bx = -f * (20 - i * 6); poly(ctx, [bx - 3, -10, bx - f * 1, -26 + (i % 2) * 5, bx + 4, -10]); ctx.fillStyle = '#4f9a34'; ctx.fill(); }
    blob(ctx, -f * 3, 2, 26, 17, '#9a7a4a', '#4a3418');
    veins(ctx, [-f * 20, 2, -f * 13, -5, -f * 6, 2, f * 1, -5, f * 8, 2]);
    blob(ctx, f * 20, 5, 11, 10, '#a8865a', '#5a4020');
    blob(ctx, f * 29, 7, 6, 5, '#f2b4a4', '#c8786a');
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 25, 12); ctx.quadraticCurveTo(f * 33, 13, f * 34, 3); ctx.stroke();
    eyeB(ctx, f * 20, -1, 4.5, true, true); angryBrow(ctx, f * 20, -6.5, f, 5);
  }
  function rocB(ctx, s) {
    var f = s.f;
    shadow(ctx, 0, 28, 30);
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 4; ctx.lineCap = 'round'; [-8, 6].forEach(function (lx) { ctx.beginPath(); ctx.moveTo(lx, 14); ctx.lineTo(lx + f * 2, 27); ctx.stroke(); });
    blob(ctx, -f * 18, -12, 18, 8, '#7a8eb8', '#34446a', -f * 0.75);
    blob(ctx, f * 12, -14, 15, 7, '#8ea2c8', '#4a5a80', f * 0.8);
    blob(ctx, -f * 2, 6, 18, 14, '#6a7ea8', '#2e3c60');
    veins(ctx, [-f * 14, 6, -f * 8, 0, -f * 2, 6, f * 4, 0, f * 10, 6]);
    blob(ctx, f * 16, -6, 9, 9, '#ffffff', '#c0c6d4');
    poly(ctx, [f * 24, -8, f * 33, -3, f * 24, 0]); ctx.fillStyle = '#f2c230'; ctx.fill();
    eyeB(ctx, f * 18, -8, 3.6, true, true); angryBrow(ctx, f * 18, -12.5, f, 4.5);
  }
  function queenB(ctx, s) { // 暈眩: 殼裂露黃色弱點
    var f = s.f;
    shadow(ctx, 0, 28, 30);
    ctx.strokeStyle = '#2a1236'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) { var lx = -16 + i * 14; ctx.beginPath(); ctx.moveTo(lx, 14); ctx.lineTo(lx - f * 3, 26); ctx.stroke(); }
    blob(ctx, -f * 4, 3, 26, 18, '#7a4a98', '#2e1240');
    [[-16, -10, 6, 15], [-6, -13, 7, 19], [5, -11, 5, 13]].forEach(function (c) {
      var x = f * c[0]; poly(ctx, [x - c[2] / 2, c[1] + 2, x, c[1] - c[3], x + c[2] / 2, c[1] + 2]);
      var g = ctx.createLinearGradient(x, c[1] - c[3], x, c[1]); g.addColorStop(0, '#d8fbff'); g.addColorStop(1, '#3fb6d0'); ctx.fillStyle = g; ctx.fill();
    });
    veins(ctx, [-f * 20, 6, -f * 13, -1, -f * 6, 6, f * 1, -1, f * 8, 6]);
    ctx.save(); ell(ctx, -f * 4, 0, 10, 6.5); ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 14; ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(255,240,150,0.9)';
    [[-18, -4], [8, -6], [-4, -12]].forEach(function (p) { poly(ctx, [f * p[0], p[1] - 4, f * p[0] + 1.2, p[1] - 1.2, f * p[0] + 4, p[1], f * p[0] + 1.2, p[1] + 1.2, f * p[0], p[1] + 4, f * p[0] - 1.2, p[1] + 1.2, f * p[0] - 4, p[1], f * p[0] - 1.2, p[1] - 1.2]); ctx.fill(); });
    blob(ctx, f * 20, 6, 10, 9.5, '#5a2a70', '#2a1236');
    ctx.strokeStyle = '#efe0f6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f * 26, 10); ctx.quadraticCurveTo(f * 31, 12, f * 29, 17); ctx.moveTo(f * 26, 3); ctx.quadraticCurveTo(f * 31, 1, f * 30, -3); ctx.stroke();
    // 暈眩: 眼睛變成螺旋
    ctx.strokeStyle = '#fbf6ee'; ctx.lineWidth = 1.4;
    [[f * 20, 2], [f * 25.5, 6.5]].forEach(function (e) { ctx.beginPath(); for (var a = 0; a < 9; a += 0.4) ctx.lineTo(e[0] + Math.cos(a) * a * 0.33, e[1] + Math.sin(a) * a * 0.33); ctx.stroke(); });
  }

  // ---------- 場景 ----------
  var THEMES = [
    { name: '翠林谷地', sky: ['#4f8a5a', '#24402c'], top: '#63c35a', inner: '#7b5a3c', lair: ['#3a3a20', '#1e1a10'] },
    { name: '風蝕高崖', sky: ['#7290ba', '#34466a'], top: '#e3eaf2', inner: '#7d8ca5', lair: ['#3a3e58', '#1a1c2c'] },
    { name: '地底礦坑', sky: ['#2a2234', '#120e16'], top: '#9a7a52', inner: '#3a2e26', lair: ['#2a1634', '#120a18'] }
  ];
  function ground(ctx, th, x, y, w, h) {
    ctx.fillStyle = th.inner; ctx.fillRect(x, y, w, h); ctx.fillStyle = th.top; ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, w, 2);
  }
  function label(ctx, s, x, y, hot) { text(ctx, s, x, y, 12, hot ? '#ffc4b8' : '#e8ecf4', 'center', true); }
  function player(ctx, x, y, cls, f) {
    if (typeof Art !== 'undefined' && Art && Art.drawPlayer) Art.drawPlayer(ctx, { x: x, y: y, cls: cls, facing: f, pose: 'idle', poseT: 0, invuln: false });
  }
  // 單位放置: (x, y) = 判定框中心(場景座標), 畫完在頭上掛血條
  function put(ctx, x, y, fn, s, top, bar) {
    ctx.save(); ctx.translate(x, y); fn(ctx, s); ctx.restore();
    if (bar) { ctx.save(); ctx.translate(x, y); hpBar(ctx, 0, top, bar[0], bar[1], bar[2]); ctx.restore(); }
  }

  function panel(ctx, i, t) {
    var th = THEMES[i], X = Math.round(i * PW), Wd = Math.round((i + 1) * PW) - X;
    ctx.save(); ctx.beginPath(); ctx.rect(X, 0, Wd, 720); ctx.clip();
    var g = ctx.createLinearGradient(0, 34, 0, 476); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(X, 0, Wd, 476);
    var g2 = ctx.createLinearGradient(0, 476, 0, 720); g2.addColorStop(0, th.lair[0]); g2.addColorStop(1, th.lair[1]);
    ctx.fillStyle = g2; ctx.fillRect(X, 476, Wd, 244);
    ctx.fillStyle = 'rgba(8,10,18,0.7)'; ctx.fillRect(X, 0, Wd, 34);
    text(ctx, th.name, X + Wd / 2, 18, 18, '#f2f4f8', 'center', true);
    ctx.fillStyle = 'rgba(8,10,18,0.6)'; ctx.fillRect(X, 474, Wd, 22);
    text(ctx, '巢穴深處 · 巢母', X + Wd / 2, 485, 12, '#d8b8f0', 'center', true);

    // 上半場景(遊戲座標, 原點在 X, 34; ×S)
    ctx.save(); ctx.translate(X, 34); ctx.scale(S, S);
    var gy = 338;
    if (i === 0) {
      ground(ctx, th, 0, gy, 360, 28);
      ground(ctx, th, 236, 196, 80, 40);
      lane(ctx, 76, 360, gy - 32, gy, 1);
      dashCurve(ctx, [288, 186, 230, 110, 178, gy - 2]); landMark(ctx, 178, gy, 18);
      // 刺藤花掃區(面向左)
      ctx.save(); ctx.beginPath(); ctx.moveTo(330, gy - 32); ctx.arc(330, gy - 32, 62, Math.PI * 0.62, Math.PI * 1.22); ctx.closePath();
      ctx.fillStyle = 'rgba(255,60,50,0.18)'; ctx.fill(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,90,70,0.85)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
      player(ctx, 196, gy - 22, 'sword', -1);
      aimLine(ctx, 72, 160, 196, gy - 24);
      put(ctx, 50, gy - 16, boarB, { f: 1, windup: true }, -22, [2, 3, { chip: 1 }]);
      put(ctx, 290, 196 - 14, frogB, { f: -1, windup: true }, -18, [2, 2]);
      put(ctx, 90, 150, beeB, { f: -1, windup: true }, -20, [1, 1]);
      put(ctx, 330, gy - 22, flowerB, { f: -1, windup: true }, -28, [3, 3]);
      ctx.restore();
      label(ctx, '野豬 · 蓄力', X + 50 * S, 34 + (gy + 14) * S, true);
      label(ctx, '跳蛙 · 起跳', X + 290 * S, 34 + 150 * S, true);
      label(ctx, '射手蜂 · 瞄準', X + 90 * S, 34 + 116 * S, true);
      label(ctx, '刺藤花 · 拉鞭', X + 330 * S, 34 + (gy + 14) * S, true);
    } else if (i === 1) {
      ground(ctx, th, 0, gy, 172, 28); ground(ctx, th, 236, gy, 130, 28);
      ctx.fillStyle = 'rgba(10,14,26,0.55)'; ctx.fillRect(172, gy, 64, 28); // 斷崖
      // 天花板岩棚
      ctx.fillStyle = th.inner; ctx.fillRect(262, 0, 100, 30); ctx.fillStyle = th.top; ctx.fillRect(262, 28, 100, 3);
      lane(ctx, 86, 172, gy - 36, gy, 1);
      dashCurve(ctx, [150, gy - 30, 196, gy - 70, 214, gy + 20], 'rgba(255,200,90,0.9)'); arrowHead(ctx, 214, gy + 20, 1.35, 'rgba(255,200,90,0.95)');
      // 落石柱
      stripes(ctx, 300, 56, 26, gy - 56, 'rgba(255,60,50,A)'); landMark(ctx, 313, gy, 16);
      // 俯衝: 盤旋圈 + 斜線
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(220,230,255,0.5)'; ctx.lineWidth = 1.2; ell(ctx, 200, 92, 46, 14); ctx.stroke(); ctx.restore();
      player(ctx, 140, gy - 22, 'hunter', -1);
      dashCurve(ctx, [224, 100, 146, gy - 26]); arrowHead(ctx, 150, gy - 30, Math.atan2(gy - 26 - 100, 146 - 224));
      reticle(ctx, 140, gy - 22, 13);
      put(ctx, 60, gy - 18, ramB, { f: 1, windup: true }, -24, [4, 4]);
      put(ctx, 230, 96, eagleB, { f: -1, windup: true }, -18, [2, 2]);
      ctx.save(); ctx.translate(313, 31 + 12); lizardB(ctx, { f: -1, windup: true }); hpBar(ctx, 0, 22, 2, 2); ctx.restore();
      ctx.restore();
      label(ctx, '岩角羊 · 低頭', X + 60 * S, 34 + (gy + 14) * S, true);
      label(ctx, '撞下平台', X + 214 * S, 34 + (gy - 80) * S, false);
      label(ctx, '俯衝鷹 · 鎖定', X + 236 * S, 34 + 64 * S, true);
      label(ctx, '落石蜥', X + 330 * S, 34 + 80 * S, true);
    } else {
      ground(ctx, th, 0, gy, 360, 28); ground(ctx, th, 0, 236, 84, 40);
      ctx.fillStyle = '#5a4026'; [40, 200, 330].forEach(function (bx) { ctx.fillRect(bx - 4, 0, 8, 236 < gy && bx === 40 ? 236 : gy); }); // 木支架
      ctx.fillStyle = '#6a4a2c'; ctx.fillRect(0, 0, 360, 14);
      // 礦燈
      var lg = ctx.createRadialGradient(200, 22, 2, 200, 22, 150); lg.addColorStop(0, 'rgba(255,210,130,0.28)'); lg.addColorStop(1, 'rgba(255,210,130,0)');
      ctx.fillStyle = lg; ctx.fillRect(40, 0, 320, 300); circle(ctx, 200, 22, 5); ctx.fillStyle = '#ffd88a'; ctx.fill();
      player(ctx, 170, gy - 22, 'bomber', -1);
      blastRing(ctx, 228, gy - 11, 46);
      // 盾兵正面: 藍色擋格弧
      ctx.save(); ctx.strokeStyle = 'rgba(110,170,255,0.85)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(70, gy - 22, 22, -0.9, 0.9); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(200,180,240,0.45)'; ctx.lineWidth = 1.2; ell(ctx, 286, 140, 38, 18); ctx.stroke(); ctx.restore();
      put(ctx, 56, gy - 22, shieldB, { f: 1 }, -28, [3, 3, { shield: 1 }]);
      put(ctx, 40, 236 - 22, shieldB, { f: 1, broken: true }, -28, [2, 3, { shield: -1, chip: 1 }]);
      put(ctx, 228, gy - 11, beetleB, { f: -1, windup: true }, -16, [1, 1]);
      [[286, 122, 1, true], [252, 148, -1, false], [320, 148, 1, false]].forEach(function (b) {
        put(ctx, b[0], b[1], batB, { f: b[2], up: b[3] }, -10, [1, 1]);
      });
      ctx.restore();
      label(ctx, '盾兵 · 正面擋', X + 64 * S, 34 + (gy + 14) * S, false);
      label(ctx, '盾已破', X + 40 * S, 34 + (236 + 14) * S, true);
      label(ctx, '爆炸甲蟲 · 閃爍', X + 236 * S, 34 + (gy + 14) * S, true);
      label(ctx, '蝙蝠群 · 3 隻繞圈', X + 286 * S, 34 + 182 * S, false);
    }

    // 下半: 巢母舞台(原點 X, 496; ×S)
    ctx.save(); ctx.translate(X, 496); ctx.scale(S, S);
    var by = 162;
    ground(ctx, { top: i === 2 ? '#8a45a0' : th.top, inner: i === 2 ? '#2d1a38' : th.inner }, 0, by, 360, 30);
    if (i === 0) {
      lane(ctx, 150, 360, by - 50, by, 1); player(ctx, 300, by - 22, 'sword', -1);
      put(ctx, 108, by - 28, sowB, { f: 1 }, -34, [9, 12, { per: 6, h: 5, brood: true, chip: 2 }]);
    } else if (i === 1) {
      dashCurve(ctx, [140, by - 70, 230, by - 120, 300, by - 26]); arrowHead(ctx, 300, by - 26, 0.9);
      landMark(ctx, 300, by, 30);
      player(ctx, 300, by - 22, 'hunter', -1);
      put(ctx, 108, by - 28, rocB, { f: 1 }, -40, [12, 12, { per: 6, h: 5, brood: true }]);
    } else {
      player(ctx, 290, by - 22, 'bomber', -1);
      put(ctx, 120, by - 28, queenB, { f: 1 }, -34, [5, 12, { per: 6, h: 5, brood: true, stun: true, chip: 2 }]);
    }
    ctx.restore();
    var bl = [['荊棘母豬 · 蓄力衝撞', true], ['雷鷲 · 舉翼要撲', true], ['晶殼甲后 · 暈眩破綻(傷害 ×2)', false]][i];
    label(ctx, bl[0], X + 120 * S, 496 + (by + 16) * S, bl[1]);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(X + Wd - 1, 0, 1, 720);
  }

  function draw(ctx, t) {
    ctx.save();
    ctx.fillStyle = '#10141e'; ctx.fillRect(0, 0, 1280, 720);
    for (var i = 0; i < 3; i++) panel(ctx, i, 0);
    ctx.restore();
  }

  return { element: 'monsters', id: 'B', kind: 'static', size: [1280, 720], duration: 0, loop: false, draw: draw };
})();
