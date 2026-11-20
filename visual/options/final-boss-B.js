/* final-boss 方案 B — 古代機關造物「守門巨像」: 懸在競技場正上方、左右對稱的風蝕砂岩機關, 用分離的雙拳、大眼光束、碎岩塊攻擊。
 * 節奏: 機械式「喀、喀、喀」分段移動 + 精準停頓(和 A 的有機猛衝相反), 每招打完就有一個部件卡住或過熱, 露出黃色弱點(破綻, 傷害 ×2)。
 * 三階段外觀: 1 完整(石冠 + 雙肩甲)→ 2 肩甲噴飛、臉裂出紅縫 → 3 頭殼裂成上下兩半, 中間露出發光的核心眼, 雙拳碎成 4 顆浮石。
 * 敵我通道: 符文與眼睛一律紅(敵方), 只有破綻時轉黃; 不用青色(青 = 時晶 / 加速), 不用紫(紫 = 巢穴記號)。
 * 每階段換一個職業示範反擊: 1 劍士(衝刺斬閃開巨拳 → 砍卡住的拳頭)、2 獵人(潛行穿過光束 + 自動射箭)、3 炸彈工(站在落點之間 + 炸彈 + 震波)。
 *
 * 照抄來源(挑中搬回遊戲時刪複本、改呼叫匯出版):
 *   hero()  ← options/hero-A.js 的主角幾何(劍士 / 獵人 / 炸彈工)
 *   icon()  ← options/materials-C.js 的素材圖示
 *   blob() / eyeB() / stripes() / landMark() / dashCurve() / hpBar 樣式 ← options/monsters-B.js
 *   backdrop() / rock() ← options/themes-B.js 的風蝕高崖(尖塔、斜肩台地、岩層帶、鋸齒白頂)
 * 動態完全由 t 決定; 底版 Art 只借 drawArrow / drawBomb / drawExplosion / drawShockwave / drawPoof(都吃 state.t、不讀牆鐘)。
 */
(function () {
  'use strict';
  var D = 20;
  // ================= 共用工具 =================
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var W = 1280, H = 720, WW = 1024, WH = 576, SC = 1.25, GY = 480;
  var FLASH = false;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,0.85)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function callArt(ctx, name, st) {
    try { var A = (typeof window !== 'undefined' && window.Art) || null; if (A && typeof A[name] === 'function') { A[name](ctx, st); return true; } } catch (e) { }
    return false;
  }
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.3, y - r * 0.3, x + r, y, x + r * 0.3, y + r * 0.3, x, y + r, x - r * 0.3, y + r * 0.3, x - r, y, x - r * 0.3, y - r * 0.3]); }

  // ---------- 怪物畫風(monsters-B): 圓潤漸層體、無黑描邊、白眼紅瞳 ----------
  function blob(ctx, x, y, rx, ry, light, dark, rot) {
    if (FLASH) { light = '#ffffff'; dark = '#e2e6ee'; }
    var g = ctx.createLinearGradient(x, y - ry, x, y + ry); g.addColorStop(0, light); g.addColorStop(1, dark);
    ell(ctx, x, y, rx, ry, rot); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(20,10,20,0.45)'; ctx.stroke();
    ell(ctx, x - rx * 0.35, y - ry * 0.45, rx * 0.35, ry * 0.22, -0.4); ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fill();
  }
  function eyeB(ctx, x, y, r, angry) {
    if (angry) { circle(ctx, x, y, r + 3); ctx.fillStyle = 'rgba(255,50,50,0.42)'; ctx.fill(); }
    circle(ctx, x, y, r); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    ctx.fillStyle = '#e8282c';
    if (angry) ell(ctx, x, y, r * 0.32, r * 0.8); else circle(ctx, x, y, r * 0.52);
    ctx.fill();
  }
  function spiralEye(ctx, x, y, r) {
    circle(ctx, x, y, r); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    ctx.strokeStyle = '#3a2030'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (var a = 0; a < 10; a += 0.4) ctx.lineTo(x + Math.cos(a) * a * r * 0.085, y + Math.sin(a) * a * r * 0.085);
    ctx.stroke();
  }
  function shadow(ctx, x, y, rx) { ell(ctx, x, y, rx, rx * 0.16); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill(); }
  // 危險投影(與一般怪同一本字典): 紅斜紋區、落點紅橢圓、紅虛線軌跡
  function stripes(ctx, x, y, w, h, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = 'rgba(255,60,50,0.16)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,60,50,0.34)'; ctx.lineWidth = 3;
    for (var i = -h; i < w + h; i += 9) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
    ctx.restore();
  }
  function landMark(ctx, x, y, rx, a) {
    ctx.save(); ctx.globalAlpha *= a;
    ell(ctx, x, y, rx, rx * 0.22); ctx.fillStyle = 'rgba(255,60,50,0.28)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  function dashCurve(ctx, x0, y0, cx, cy, x1, y1, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,90,70,0.9)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke(); ctx.restore();
  }
  function arrowHead(ctx, x, y, ang, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(ang); poly(ctx, [0, 0, -11, -6, -11, 6]); ctx.fillStyle = 'rgba(255,90,70,0.95)'; ctx.fill(); ctx.restore();
  }
  // 黃色弱點(破綻): 發光 + 閃星, 和巢母暈眩的黃弱點同一個詞
  function weakGlow(ctx, x, y, rx, ry, t) {
    var pu = 0.75 + 0.25 * Math.sin(TAU * t * 4);
    ctx.save(); ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 18 * pu;
    ell(ctx, x, y, rx, ry); ctx.fillStyle = '#ffe066'; ctx.fill(); ctx.restore();
    ell(ctx, x, y, rx * 0.55, ry * 0.5); ctx.fillStyle = '#fffbe0'; ctx.fill();
    ctx.fillStyle = 'rgba(255,240,150,' + (0.6 + 0.4 * pu) + ')';
    star4(ctx, x - rx - 4, y - ry, 5); ctx.fill(); star4(ctx, x + rx + 3, y - ry * 0.4, 4); ctx.fill();
  }

  // ---------- 主角(照抄 hero-A, 原點 = 判定框中心 28×40) ----------
  function P(k, d) { try { if (typeof Art !== 'undefined' && Art.palette && Art.palette[k]) return Art.palette[k]; } catch (e) { } return d; }
  var C = {
    sword: P('sword', '#3d8bfd'), hunter: P('hunter', '#1fbf9a'), bomber: P('bomber', '#f28c28'),
    skin: '#f4d2b0', line: P('outlineHero', '#ffffff'), ink: '#1a1420', pants: '#2b3245',
    gold: P('gold', '#f2c94c'), metal: '#e8eef6', wood: '#8a5a2a', bomb: P('bomb', '#2a2a33'), spark: P('goal', '#ffd23f'),
    lens: P('timeLight', '#b6f4fb'), cape: '#d8434e', hood: '#0f2a24', eye: '#d8fff0'
  };
  function fs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = C.line; ctx.stroke(); } }
  function rq(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function legs(ctx, top) { ctx.fillStyle = C.pants; rq(ctx, -7, top, 5, 20 - top, 1.5); ctx.fill(); rq(ctx, 2, top, 5, 20 - top, 1.5); ctx.fill(); }
  function hero(ctx, cls, f) {
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      poly(ctx, [-4, -6, -13, 15, -5, 17, 2, -4]); fs(ctx, C.cape, 0);
      legs(ctx, 13);
      poly(ctx, [-13, -6, 13, -6, 7, 14, -7, 14]); fs(ctx, C.sword, 2);
      ctx.fillStyle = C.gold; ctx.fillRect(-7, 8, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [-2, -4, 2, -4, 0, 4]); ctx.fill();
      poly(ctx, [-8, -13, -15, -19, -12, -11]); fs(ctx, C.gold, 0);
      rq(ctx, -8, -20, 16, 14, 3); fs(ctx, C.sword, 2);
      ctx.fillStyle = C.ink; ctx.fillRect(-1, -15, 8, 3);
      poly(ctx, [10, -19, 12, -22, 14, -19, 14, -3, 10, -3]); fs(ctx, C.metal, 0);
      ctx.lineWidth = 1; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.fillStyle = C.gold; ctx.fillRect(7, -3.5, 10, 3);
      ctx.fillStyle = C.wood; ctx.fillRect(11, -0.5, 2, 5);
      circle(ctx, 12, 3, 2.6); fs(ctx, C.skin, 0);
    } else if (cls === 'hunter') {
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(-0.35);
      ctx.fillStyle = C.wood; ctx.fillRect(-3, -6, 6, 14);
      ctx.fillStyle = C.eye; poly(ctx, [-3, -6, -1, -12, 1, -6]); ctx.fill(); poly(ctx, [0, -6, 2.5, -11, 3.5, -6]); ctx.fill();
      ctx.restore();
      legs(ctx, 14);
      poly(ctx, [0, -20, 13, 15, -13, 15]); fs(ctx, C.hunter, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [0, -20, -13, 15, -5, 15]); ctx.fill();
      poly(ctx, [-1, -13, 7, -9, 6, -4, -3, -4]); ctx.fillStyle = C.hood; ctx.fill();
      circle(ctx, 2, -8, 1.3); ctx.fillStyle = C.eye; ctx.fill(); circle(ctx, 5, -7.6, 1.3); ctx.fill();
      circle(ctx, 0, 0, 2); ctx.fillStyle = C.gold; ctx.fill();
      ctx.strokeStyle = C.wood; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(3, 2, 15, -1.15, 1.15); ctx.stroke();
      var ex = 3 + Math.cos(1.15) * 15, ey = Math.sin(1.15) * 15;
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, 2 - ey); ctx.lineTo(ex, 2 + ey); ctx.stroke();
      ctx.strokeStyle = P('arrow', '#f3ead8'); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(ex - 1, 2); ctx.lineTo(19, 2); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [19, -0.5, 22, 2, 19, 4.5]); ctx.fill();
    } else {
      legs(ctx, 15);
      circle(ctx, 0, 5, 12); fs(ctx, C.bomber, 2);
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(8, 13); ctx.stroke();
      for (var i = 0; i < 3; i++) { circle(ctx, -5 + i * 5, 1.5 + i * 4.4, 2.2); ctx.fillStyle = C.bomb; ctx.fill(); }
      circle(ctx, 0, -11, 8); fs(ctx, C.skin, 1.8);
      ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.closePath(); fs(ctx, C.bomber, 0);
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-8, -12.5, 16, 2.6);
      circle(ctx, 1, -11.2, 3.1); fs(ctx, C.lens, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circle(ctx, 6.4, -11.2, 3.1); fs(ctx, C.lens, 0); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -6.5, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      circle(ctx, 12, 3, 5.5); ctx.fillStyle = C.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.line; ctx.stroke();
      ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.quadraticCurveTo(15, -6, 17, -6); ctx.stroke();
      ctx.fillStyle = C.spark; poly(ctx, [17, -10, 18, -7, 21, -6, 18, -5, 17, -2, 16, -5, 13, -6, 16, -7]); ctx.fill();
    }
    ctx.restore();
  }
  // h: { cls, x, y, f, alpha, stealth, inv, lean }
  function drawHero(ctx, h) {
    if (!h || h.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= h.alpha; ctx.translate(h.x, h.y);
    ctx.save(); ctx.rotate(h.lean || 0);
    if (h.stealth) ctx.globalAlpha *= 0.32;
    hero(ctx, h.cls, h.f);
    ctx.restore();
    if (h.stealth) { // 潛行: 半透明 + 青白虛線殼 = 無敵、可穿過
      ctx.setLineDash([4, 3]); ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(190,255,235,0.95)'; ell(ctx, 0, 0, 19, 26); ctx.stroke(); ctx.setLineDash([]);
    }
    if (h.inv) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,230,120,0.9)'; ell(ctx, 0, 0, 20, 25); ctx.stroke(); }
    ctx.restore();
  }
  function slash(ctx, x, y, f, p) {
    if (p < 0 || p > 1) return;
    ctx.save(); ctx.translate(x + f * 20, y - 2); ctx.scale(f, 1); ctx.globalAlpha *= 1 - p;
    ctx.beginPath(); ctx.arc(-6, 0, 27, -1.25, 1.25); ctx.arc(-13, 0, 21, 1.1, -1.1, true); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill(); ctx.restore();
  }
  function speedLines(ctx, x, y, f, a, len) {
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var i = 0; i < 4; i++) { var yy = y - 14 + i * 9, l = len * (0.6 + 0.4 * hash(i, 5)); ctx.beginPath(); ctx.moveTo(x - f * 18, yy); ctx.lineTo(x - f * (18 + l), yy); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- 素材圖示(照抄 materials-C) ----------
  var COL = { wood: '#b8682a', woodLight: '#f2c88c', woodDark: '#6a3a14', stone: '#a9b3be', stoneLight: '#e6ebf0', stoneDark: '#5e6874',
    time: '#3fd6ea', timeLight: '#d2fbff', timeDark: '#137c90', soul: '#d94bc6', soulLight: '#ffc6f4', soulDark: '#6e1a62' };
  var INK = '#1a1420';
  function lin(ctx, x0, y0, x1, y1, st) { var gr = ctx.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < st.length; i += 2) gr.addColorStop(st[i], st[i + 1]); return gr; }
  function rad(ctx, x, y, r0, r1, st) { var gr = ctx.createRadialGradient(x, y, r0, x, y, r1); for (var i = 0; i < st.length; i += 2) gr.addColorStop(st[i], st[i + 1]); return gr; }
  function crystal(ctx, sx, rot, lw) {
    ctx.save(); ctx.translate(sx, 5.2); ctx.rotate(rot);
    poly(ctx, [0, -7.4, 2.4, -4.4, 2.4, 2.6, -2.4, 2.6, -2.4, -4.4]);
    ctx.fillStyle = lin(ctx, -2.4, 0, 2.4, 0, [0, COL.timeLight, 0.5, COL.time, 1, COL.timeDark]); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  }
  function icon(ctx, kind, cx, cy, sz) {
    var k = sz / 20, lw = 1.5, i;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'wood') {
      ctx.translate(-0.4, 0.9);
      var ends = [[-0.8, 3.6], [6.8, 3.6], [3, -3.2]], dx = -5.2, dy = -2.2, R = 3.5;
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(ends[i][0], ends[i][1]); ctx.lineTo(ends[i][0] + dx, ends[i][1] + dy);
        ctx.lineWidth = R * 2 + lw * 2; ctx.strokeStyle = INK; ctx.stroke();
        ctx.lineWidth = R * 2; ctx.strokeStyle = lin(ctx, 0, ends[i][1] - R, 0, ends[i][1] + R, [0, COL.wood, 1, COL.woodDark]); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-1.6, -7.2); ctx.lineTo(-3.8, 6.4); ctx.lineWidth = 1.6; ctx.strokeStyle = '#e7d39a'; ctx.stroke();
      for (i = 0; i < 3; i++) {
        ell(ctx, ends[i][0], ends[i][1], R * 0.86, R);
        ctx.fillStyle = rad(ctx, ends[i][0] - 0.8, ends[i][1] - 1, 0.3, R, [0, '#fff0cf', 1, COL.woodLight]); ctx.fill();
        ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
      }
    } else if (kind === 'stone') {
      poly(ctx, [0, -9.4, 9, -4.7, 0, 0, -9, -4.7]); ctx.fillStyle = lin(ctx, 0, -9.4, 0, 0, [0, '#ffffff', 1, COL.stoneLight]); ctx.fill();
      poly(ctx, [-9, -4.7, 0, 0, 0, 9.6, -9, 4.9]); ctx.fillStyle = COL.stone; ctx.fill();
      poly(ctx, [0, 0, 9, -4.7, 9, 4.9, 0, 9.6]); ctx.fillStyle = COL.stoneDark; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, -4.7); ctx.lineTo(0, 0); ctx.lineTo(9, -4.7); ctx.moveTo(0, 0); ctx.lineTo(0, 9.6);
      ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(26,20,32,0.7)'; ctx.stroke();
      poly(ctx, [0, -9.4, 9, -4.7, 9, 4.9, 0, 9.6, -9, 4.9, -9, -4.7]); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    } else if (kind === 'time') {
      crystal(ctx, -5.6, -0.5, lw); crystal(ctx, 5.6, 0.5, lw);
      var m = [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, -3.8, 6, -3.8, -6];
      poly(ctx, m); ctx.fillStyle = COL.time; ctx.fill();
      poly(ctx, [0, -10.4, 0, 9.4, -3.8, 6, -3.8, -6]); ctx.fillStyle = COL.timeLight; ctx.fill();
      poly(ctx, m); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0.6, -10.4);
      ctx.bezierCurveTo(2.4, -6.4, 7.6, -4.4, 7.6, 2.4); ctx.bezierCurveTo(7.6, 6.8, 4.2, 9.6, 0, 9.6);
      ctx.bezierCurveTo(-4.2, 9.6, -7.6, 6.8, -7.6, 2.4); ctx.bezierCurveTo(-7.6, -1.6, -5, -3.4, -3.6, -6.2);
      ctx.quadraticCurveTo(-2.6, -3.4, -1.2, -3.8); ctx.quadraticCurveTo(-1.6, -7.6, 0.6, -10.4); ctx.closePath();
      ctx.fillStyle = rad(ctx, -1.6, 1.4, 0.5, 9.6, [0, COL.soulLight, 0.45, COL.soul, 1, COL.soulDark]); ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = '#ffe14a';
      poly(ctx, [-5, 1.2, -1.2, 2.4, -1.6, 4.2, -4.6, 3.4]); ctx.fill(); poly(ctx, [5, 1.2, 1.2, 2.4, 1.6, 4.2, 4.6, 3.4]); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 受擊: 每掉 1 HP 噴 1 份素材 + 破綻 ×2 字 ----------
  var KINDS = ['soul', 'stone', 'time', 'wood'];
  function spray(ctx, hits, t) {
    var n = 0;
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i], age = t - h.t;
      for (var k = 0; k < h.d; k++) {
        n++;
        if (age < 0 || age > 1.6) continue;
        var vx = (h.dir || 0) * 90 + (hash(n, 1.3) - 0.5) * 360, vy = -330 - hash(n, 2.7) * 220, gg = 700;
        var dy = (GY - 9) - h.y, tl = (-vy + Math.sqrt(vy * vy + 4 * gg * dy)) / (2 * gg), ae = Math.min(age, tl);
        var x = clamp(h.x + vx * ae, 50, WW - 50), y = h.y + vy * ae + gg * ae * ae;
        ctx.save(); ctx.globalAlpha *= clamp(age < 1.2 ? 1 : 1 - (age - 1.2) / 0.4, 0, 1); icon(ctx, KINDS[n % 4], x, y, 18); ctx.restore();
      }
      if (h.mult && age >= 0 && age < 0.7) { ctx.save(); ctx.globalAlpha *= 1 - age / 0.7; text(ctx, '×2', h.x + 14, h.y - 22 - age * 34, 18, '#ffe066', 'center', true); ctx.restore(); }
    }
  }
  function hpAt(hits, t, max) { var v = max; for (var i = 0; i < hits.length; i++) if (t >= hits[i].t) v -= hits[i].d; return Math.max(0, v); }
  function chipAt(hits, t) { var c = 0; for (var i = 0; i < hits.length; i++) if (t >= hits[i].t && t < hits[i].t + 0.5) c += hits[i].d; return c; }
  function flashAt(hits, t) { for (var i = 0; i < hits.length; i++) if (t >= hits[i].t && t < hits[i].t + 0.09) return true; return false; }
  // 頭上血條(monsters-B 圓角連續條放大): 每 1 HP 一道淡刻度, 白粗刻度 = 換階段門檻; 破綻中轉黃
  function bossBar(ctx, cx, bottom, hp, max, chip, weak, th) {
    var w = 200, h = 9, x0 = clamp(cx - w / 2, 12, WW - 12 - w), y0 = Math.max(18, bottom - h), i;
    ctx.save();
    rr(ctx, x0 - 3, y0 - 3, w + 6, h + 6, (h + 6) / 2); ctx.fillStyle = 'rgba(10,6,14,0.84)'; ctx.fill();
    var fw = w * hp / max, cw = w * chip / max;
    if (cw > 0) { rr(ctx, x0, y0, Math.min(w, fw + cw), h, h / 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    if (fw > 0) {
      var g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, weak ? '#fff09a' : '#ff8a8a'); g.addColorStop(1, weak ? '#e8b020' : '#e02a3c');
      rr(ctx, x0, y0, fw, h, h / 2); ctx.fillStyle = g; ctx.fill();
    }
    ctx.fillStyle = 'rgba(10,6,14,0.35)'; for (i = 1; i < max; i++) ctx.fillRect(x0 + w * i / max - 0.5, y0, 1, h);
    ctx.fillStyle = '#ffffff'; for (i = 0; i < th.length; i++) ctx.fillRect(x0 + w * th[i] / max - 1, y0 - 4, 2, h + 8);
    ctx.restore();
  }

  // ---------- 風蝕高崖(themes-B) ----------
  function backdrop(ctx, t) {
    var g = ctx.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, '#6f90b8'); g.addColorStop(1, '#dfe8f1');
    ctx.fillStyle = g; ctx.fillRect(0, 0, WW, WH);
    var i, x, y;
    ctx.fillStyle = '#bccadb';
    for (i = 0; i < 10; i++) { x = i * 115 + hash(i, 1) * 40; y = 170 + hash(i, 2) * 120; poly(ctx, [x - 50, WH, x - 8, y, x + 8, y, x + 50, WH]); ctx.fill(); }
    ctx.fillStyle = '#97abc4';
    for (i = 0; i < 4; i++) { x = i * 300 + 60; y = 300 + hash(i, 3) * 50; poly(ctx, [x - 130, WH, x - 100, y + 40, x - 60, y, x + 60, y, x + 100, y + 40, x + 130, WH]); ctx.fill(); }
    var Pw = WW + 300, off = (t / D) * Pw * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (i = 0; i < 8; i++) {
      x = ((hash(i, 7) * Pw + off * (i % 2 ? 1 : 0.5)) % Pw) - 200; y = 50 + hash(i, 8) * 260;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120 + hash(i, 9) * 80, y - 6); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(22,28,48,0.30)'; ctx.fillRect(0, 0, WW, WH); // 背景壓低, 讓 Boss 與危險投影最亮(P1)
  }
  function rock(ctx, x, y, w, h, cl, cr) {
    ctx.save();
    poly(ctx, [x + cl, y, x + w - cr, y, x + w, y + cr, x + w, y + h, x, y + h, x, y + cl]); ctx.fillStyle = '#262b3a'; ctx.fill();
    var e = 2.5;
    poly(ctx, [x + cl + e, y + e, x + w - cr - e, y + e, x + w - e, y + cr + e, x + w - e, y + h, x + e, y + h, x + e, y + cl + e]); ctx.clip();
    var cols = ['#5d6680', '#6c7690', '#525a72'];
    for (var yy = Math.floor(y / 13) * 13; yy < y + h; yy += 13) {
      ctx.fillStyle = cols[((Math.floor(yy / 13) % 3) + 3) % 3];
      ctx.beginPath(); ctx.moveTo(x, yy);
      for (var zx = 0; zx <= w; zx += 8) ctx.lineTo(x + zx, yy + (Math.floor((x + zx) / 8) % 2 ? 2.5 : 0));
      ctx.lineTo(x + w, yy + 13); ctx.lineTo(x, yy + 13); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w + 8, y);
    for (var i = Math.ceil(w / 8); i >= 0; i--) ctx.lineTo(x + i * 8, y + ((i % 2) ? 13 : 8));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + e, w, 2);
    ctx.restore();
  }
  function roar(ctx, x, y, p) {
    if (p <= 0 || p >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - p; ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (var i = 0; i < 14; i++) { var a = i * TAU / 14 + 0.2, r0 = 40 + p * 60, r1 = r0 + 30 + 20 * hash(i, 3); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); }
    circle(ctx, x, y, 30 + p * 160); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,220,140,0.8)'; ctx.stroke();
    ctx.restore();
  }
  // 下方說明列(方案頁用, 不是遊戲 HUD)
  var KCOL = { idle: '#9aa4b8', prep: '#ffb03a', atk: '#ff5a4a', weak: '#4fd18b', change: '#c8d0e0', ko: '#ffd23f' };
  var KNAME = { idle: '待機', prep: '預備', atk: '出招', weak: '破綻', change: '換階段', ko: '擊倒' };
  var CLSN = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  function caption(ctx, t, name, stages, phaseEnds, cls) {
    var s = stages[0];
    for (var i = 0; i < stages.length; i++) if (t >= stages[i][0]) s = stages[i];
    var ph = t < phaseEnds[0] ? 1 : (t < phaseEnds[1] ? 2 : 3);
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,0.84)'; ctx.fillRect(0, H - 44, W, 44);
    text(ctx, name + ' · 階段 ' + ph + '/3', 16, H - 22, 17, '#f2f4f8', 'left', true);
    text(ctx, CLSN[cls] + '示範', 200, H - 22, 15, C[cls] || '#fff', 'left', true);
    rr(ctx, 280, H - 35, 84, 26, 13); ctx.fillStyle = KCOL[s[2]]; ctx.fill();
    ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#10141e'; ctx.fillText(KNAME[s[2]], 322, H - 22);
    text(ctx, s[3], 376, H - 22, 15, '#e8ecf4', 'left', false);
    var bx = 1000, bw = 264;
    for (i = 0; i < 3; i++) {
      var a = i === 0 ? 0 : phaseEnds[i - 1], b = i === 2 ? D : phaseEnds[i];
      rr(ctx, bx + bw * a / D + 1, H - 27, bw * (b - a) / D - 2, 10, 5); ctx.fillStyle = i + 1 === ph ? '#5a6a8a' : '#2a3246'; ctx.fill();
    }
    var mx = bx + bw * t / D; ctx.fillStyle = '#ffd84a'; poly(ctx, [mx, H - 15, mx - 5, H - 7, mx + 5, H - 7]); ctx.fill(); ctx.fillRect(mx - 1, H - 30, 2, 16);
    ctx.restore();
  }
  function shake(t, list) { var v = 0; for (var i = 0; i < list.length; i++) { var a = t - list[i][0]; if (a >= 0 && a < 0.35) v += Math.sin(a * 90) * list[i][1] * (1 - a / 0.35); } return v; }

  // ================= 方案 B: 守門巨像 =================
  var MAX = 24, TH = [16, 8];
  var PH_END = [5.2, 11.0];
  var MK = [260, 420, 600, 760];        // 第 3 招的 4 個落點(依序)
  var STAGES = [
    [0, 0, 'idle', '守門巨像懸在半空, 一顆大眼盯住玩家; 雙拳分離浮在兩側'],
    [0.6, 0, 'prep', '右拳喀喀升到玩家頭上 · 地上紅圈與落柱標出落點'],
    [1.8, 0, 'atk', '巨拳砸地 — 劍士衝刺斬閃開'],
    [1.95, 0, 'weak', '拳頭卡進地面 · 側面符文轉黃 = 弱點 ×2'],
    [5.0, 0, 'change', '肩甲噴飛、臉裂出紅縫 → 第 2 階段'],
    [6.0, 0, 'prep', '大眼聚光 · 地上紅虛線標出光束掃過的路線'],
    [7.2, 0, 'atk', '光束由左掃到右 — 獵人潛行(無敵)讓光束穿過'],
    [8.2, 0, 'weak', '過熱墜地冒煙 · 額頭裂縫轉黃 = 弱點 ×2, 獵人自動射箭'],
    [10.8, 0, 'change', '頭殼裂成兩半、露出核心眼 → 第 3 階段'],
    [11.6, 0, 'prep', '四顆浮石依序對準 1 → 4 號落點'],
    [12.6, 0, 'atk', '浮石依序砸落 — 炸彈工站在兩個落點之間'],
    [13.6, 0, 'weak', '核心眼墜地 · 整顆都是弱點 ×2, 炸彈 + 震波'],
    [15.95, 0, 'ko', '擊倒 → 進入結局']
  ];
  var HITS = [
    { t: 2.6, d: 2, mult: 1, dir: -1 }, { t: 3.0, d: 2, mult: 1, dir: -1 }, { t: 3.4, d: 2, mult: 1, dir: -1 }, { t: 3.8, d: 2, mult: 1, dir: -1 },
    { t: 8.9, d: 2, mult: 1, dir: -1 }, { t: 9.5, d: 2, mult: 1, dir: -1 }, { t: 10.1, d: 2, mult: 1, dir: -1 }, { t: 10.7, d: 2, mult: 1, dir: -1 },
    { t: 14.8, d: 4, mult: 1, dir: 1 }, { t: 15.3, d: 2, mult: 1, dir: 1 }, { t: 15.95, d: 2, mult: 1, dir: 1 }
  ];
  var SLASHES = [2.6, 3.0, 3.4, 3.8], ARROWS = [8.6, 9.2, 9.8, 10.4], BOMBS = [[14.3, 14.8, 440], [15.5, 15.95, 470]], WAVE = 15.3;
  // 機械感: 分段(n 格)的緩動, 位置一格一格跳
  function stepE(p, n) { return Math.round(sm(p) * n) / n; }

  function bossState(t) {
    var bob = Math.round(Math.sin(TAU * t * 0.5) * 2) * 2;
    var o = { hx: 512, hy: 220 + bob, phase: t < PH_END[0] ? 1 : (t < PH_END[1] ? 2 : 3), eye: 0, lid: 0, weak: null, angry: t >= 0.6,
      lf: { x: 330, y: 300 + bob, rot: 0, show: true, side: -1 }, rf: { x: 694, y: 300 + bob, rot: 0, show: true, side: 1 },
      split: 0, blocks: null, plFall: 0, steam: 0, roar: 0, alpha: 1, beam: -1, core: null };
    var p;
    // 招 1: 巨拳砸地
    if (t >= 0.6 && t < 1.8) {
      p = stepE(seg(t, 0.6, 1.4), 6); o.rf.x = lerp(694, 640, p); o.rf.y = lerp(300 + bob, 110, p);
      if (t > 1.4) o.rf.x += Math.sin(TAU * t * 15) * 2.5;
    } else if (t >= 1.8 && t < 1.92) { p = seg(t, 1.8, 1.92); o.rf.x = 640; o.rf.y = lerp(110, GY - 30, p * p); }
    else if (t >= 1.92 && t < 4.6) { o.rf.x = 640; o.rf.y = GY - 30; o.rf.rot = 0.06; o.rf.stuck = true; if (t >= 1.95) o.weak = 'fist'; }
    else if (t >= 4.6 && t < 5.2) { p = stepE(seg(t, 4.6, 5.1), 5); o.rf.x = lerp(640, 694, p); o.rf.y = lerp(GY - 30, 300 + bob, p); }
    // 換階段 1 → 2
    if (t >= 5.2) o.plFall = seg(t, 5.2, 5.7);
    if (t >= 5.3 && t < 6.0) o.roar = seg(t, 5.3, 6.0);
    // 招 2: 大眼光束
    if (t >= 6.0 && t < 7.2) { o.eye = seg(t, 6.0, 7.2); o.hy = lerp(220, 240, stepE(seg(t, 6.0, 6.4), 3)) + bob; }
    else if (t >= 7.2 && t < 8.2) { o.eye = 1; o.hy = 240 + bob; o.beam = lerp(120, 900, seg(t, 7.2, 8.2)); }
    else if (t >= 8.2 && t < 10.8) {
      p = stepE(seg(t, 8.2, 8.5), 4); o.hy = lerp(240, GY - 80, p); o.lid = 0.55 * p; o.steam = 1;
      o.lf.x = lerp(330, 300, p); o.lf.y = lerp(300, GY - 34, p); o.lf.rot = -0.12 * p; o.rf.x = lerp(694, 724, p); o.rf.y = lerp(300, GY - 34, p); o.rf.rot = 0.12 * p;
      if (t >= 8.5) o.weak = 'seam'; o.angry = false;
    } else if (t >= 10.8 && t < 11.6) {
      p = stepE(seg(t, 10.8, 11.3), 5); o.hy = lerp(GY - 80, 220, p);
      o.lf.x = lerp(300, 330, p); o.lf.y = lerp(GY - 34, 300, p); o.rf.x = lerp(724, 694, p); o.rf.y = lerp(GY - 34, 300, p);
      if (t >= 11.0) o.roar = seg(t, 11.0, 11.6);
    }
    // 第 3 階段: 頭殼裂開、拳頭碎成 4 顆浮石
    if (t >= 11.0) {
      o.split = sm(seg(t, 11.0, 11.4)); o.lf.show = o.rf.show = false;
      o.blocks = [];
      for (var i = 0; i < 4; i++) {
        var oa = TAU * (t * 0.5) + i * TAU / 4, ox = o.hx + Math.cos(oa) * 130, oy = o.hy + Math.sin(oa) * 60;
        var from = i < 2 ? { x: 330, y: 300 } : { x: 694, y: 300 };
        var b = { x: ox, y: oy, show: true, crumble: -1 };
        if (t < 11.4) { p = seg(t, 11.0, 11.4); b.x = lerp(from.x, ox, p); b.y = lerp(from.y, oy, p); }
        var ta = 11.6 + i * 0.25;
        if (t >= ta) { p = stepE(seg(t, ta, ta + 0.3), 4); b.x = lerp(ox, MK[i], p); b.y = lerp(oy, 90, p); }
        var td = 12.6 + i * 0.25;
        if (t >= td) { p = seg(t, td, td + 0.12); b.x = MK[i]; b.y = lerp(90, GY - 22, p * p); }
        if (t >= 13.9) { b.show = false; b.crumble = t - 13.9; }
        o.blocks.push(b);
      }
      if (t >= 11.6) { // 方塊對準時, 原本的公轉角度停住(避免 t 繼續推進讓起點亂跳)
        for (var j = 0; j < 4; j++) {
          var oa2 = TAU * ((11.6 + j * 0.25) * 0.5) + j * TAU / 4, b2 = o.blocks[j], ta2 = 11.6 + j * 0.25;
          if (t >= ta2 && t < 12.6 + j * 0.25) { var q = stepE(seg(t, ta2, ta2 + 0.3), 4); b2.x = lerp(o.hx + Math.cos(oa2) * 130, MK[j], q); b2.y = lerp(220 + Math.sin(oa2) * 60, 90, q); }
        }
      }
      if (t >= 13.6) { // 核心眼墜地
        p = seg(t, 13.6, 13.95); o.hx = lerp(512, 560, p); o.hy = lerp(220, GY - 34, p * p); o.split = 1 + sm(p) * 0.6;
        if (t >= 13.95) { o.hx = 560; o.hy = GY - 34; o.weak = t < 15.95 ? 'core' : null; o.angry = false; }
      }
      if (t >= 15.95) o.alpha = 1 - seg(t, 16.4, 16.9);
    }
    o.flash = flashAt(HITS, t) || (t >= 15.95 && t < 16.5 && Math.floor((t - 15.95) * 10) % 2 === 0);
    return o;
  }
  function weakPoint(o) {
    if (o.weak === 'fist' || o.weak === null && o.rf.stuck) return { x: o.rf.x - 30, y: o.rf.y };
    if (o.weak === 'seam') return { x: o.hx, y: o.hy - 40 };
    return { x: o.hx, y: o.hy };
  }

  // 削角石塊: 砂岩漸層 + 風蝕橫帶(和高崖的岩層帶同一種語言, 但用暖色和地形分開)
  function block(ctx, x, y, w, h, c, light, dark) {
    if (FLASH) { light = '#ffffff'; dark = '#e2e6ee'; }
    var l = x - w / 2, r = x + w / 2, tp = y - h / 2, bt = y + h / 2;
    poly(ctx, [l + c, tp, r - c, tp, r, tp + c, r, bt - c, r - c, bt, l + c, bt, l, bt - c, l, tp + c]);
    var g = ctx.createLinearGradient(x, tp, x, bt); g.addColorStop(0, light || '#e2c99c'); g.addColorStop(1, dark || '#8a6a46');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(40,22,10,0.5)'; ctx.stroke();
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
  function fist(ctx, f, weak, t) {
    if (!f.show) return;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
    block(ctx, 0, 0, 84, 68, 14);
    ctx.strokeStyle = 'rgba(40,22,10,0.55)'; ctx.lineWidth = 2.5;
    for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 21, 12); ctx.lineTo(i * 21, 33); ctx.stroke(); }
    if (f.stuck && !FLASH) { ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(-8, -12); ctx.lineTo(-14, 4); ctx.moveTo(18, -28); ctx.lineTo(10, -6); ctx.stroke(); }
    var rx = -f.side * 30;
    if (weak) weakGlow(ctx, rx, 0, 11, 15, t); else if (!FLASH) rune(ctx, rx, 0, 7, '#ff4a3a');
    ctx.restore();
  }
  function headUpper(ctx, o, t) {
    // 石冠
    var cr = [[-50, -28, -64], [-14, 14, -64], [28, 50, -64]];
    for (var i = 0; i < 3; i++) {
      var a = cr[i], mid = (a[0] + a[1]) / 2;
      poly(ctx, [a[0], a[2], mid - 4, a[2] - (i === 1 ? 46 : 34), mid + 4, a[2] - (i === 1 ? 46 : 34), a[1], a[2]]);
      var g = ctx.createLinearGradient(0, a[2] - 46, 0, a[2]); g.addColorStop(0, FLASH ? '#fff' : '#f0dcb4'); g.addColorStop(1, FLASH ? '#e2e6ee' : '#a8845a');
      ctx.fillStyle = g; ctx.fill();
    }
    block(ctx, 0, 0, 170, 130, 24);
    // 臉頰符文線
    if (!FLASH) { glowLine(ctx, [-62, 8, -76, 8, -76, 40], '#ff4a3a', 3); glowLine(ctx, [62, 8, 76, 8, 76, 40], '#ff4a3a', 3); }
    if (o.phase >= 2) { // 裂紋 + 額頭紅縫(過熱時轉黃 = 弱點)
      ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-70, -30); ctx.lineTo(-52, -18); ctx.lineTo(-60, 6); ctx.moveTo(58, -50); ctx.lineTo(46, -30); ctx.lineTo(56, -16); ctx.stroke();
      if (o.weak === 'seam') {
        glowLine(ctx, [-44, -40, -20, -46, 0, -38, 22, -46, 44, -40], '#ffe066', 6);
        weakGlow(ctx, 0, -40, 12, 7, t);
      } else if (!FLASH) glowLine(ctx, [-44, -40, -20, -46, 0, -38, 22, -46, 44, -40], '#ff5a3a', 4);
    }
    // 眼窩
    ell(ctx, 0, -2, 36, 30); ctx.fillStyle = FLASH ? '#e8e8f0' : '#2a1a12'; ctx.fill();
  }
  function colossus(ctx, o, t) {
    var i;
    ctx.save(); ctx.globalAlpha *= o.alpha;
    // 肩甲(第 1 階段掛在頭兩側; 換階段時噴飛落到兩側高台)
    var pl = [[-1, 110, GY - 80 - 30], [1, 914, GY - 80 - 30]];
    for (i = 0; i < 2; i++) {
      var s = pl[i][0], sx = o.hx + s * 112, sy = o.hy - 18, px = lerp(sx, pl[i][1], o.plFall), py = lerp(sy, pl[i][2], o.plFall * o.plFall) - Math.sin(o.plFall * Math.PI) * 120;
      ctx.save(); ctx.translate(px, py); ctx.rotate(s * (0.12 + o.plFall * 1.4));
      block(ctx, 0, 0, 60, 84, 14, '#d8bc8e', '#7a5c3a');
      if (o.plFall === 0 && !FLASH) rune(ctx, 0, -8, 6, '#ff4a3a');
      ctx.restore();
    }
    if (o.phase < 3) {
      ctx.save(); ctx.translate(o.hx, o.hy);
      headUpper(ctx, o, t);
      if (o.lid > 0 || o.weak === 'seam') {
        eyeB(ctx, 0, 4, 20, false);
        ctx.save(); ell(ctx, 0, -2, 36, 30); ctx.clip(); ctx.fillStyle = FLASH ? '#ffffff' : '#9a7a52'; ctx.fillRect(-40, -34, 80, 60 * Math.max(o.lid, 0.55)); ctx.restore();
      } else {
        if (o.eye > 0 && !FLASH) { circle(ctx, 0, -2, 24 + o.eye * 14); ctx.fillStyle = 'rgba(255,70,50,' + (0.25 + 0.35 * o.eye) + ')'; ctx.fill(); }
        eyeB(ctx, 0, -2, 22, o.angry);
      }
      // 嘴格柵
      rr(ctx, -40, 34, 80, 18, 4); ctx.fillStyle = FLASH ? '#e8e8f0' : '#2a1a12'; ctx.fill();
      ctx.fillStyle = FLASH ? '#ffffff' : '#c8aa7c'; for (i = 0; i < 5; i++) ctx.fillRect(-34 + i * 16, 36, 6, 14);
      ctx.restore();
    } else {
      // 第 3 階段: 上下兩半分開, 中間是核心眼
      var gap = o.split;
      ctx.save(); ctx.translate(o.hx, o.hy - 44 * gap);
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -130, 260, 118); ctx.clip(); headUpper(ctx, o, t); ctx.restore();
      ctx.restore();
      ctx.save(); ctx.translate(o.hx, o.hy + 36 * gap);
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -12, 260, 100); ctx.clip();
      block(ctx, 0, 0, 170, 130, 24);
      rr(ctx, -40, 34, 80, 18, 4); ctx.fillStyle = FLASH ? '#e8e8f0' : '#2a1a12'; ctx.fill();
      ctx.restore(); ctx.restore();
      // 核心眼
      ctx.save(); ctx.translate(o.hx, o.hy);
      var weak = o.weak === 'core';
      ctx.save(); ctx.shadowColor = weak ? '#ffe066' : '#ff5a2a'; ctx.shadowBlur = 22;
      var g = ctx.createRadialGradient(-8, -8, 4, 0, 0, 32);
      g.addColorStop(0, FLASH ? '#ffffff' : (weak ? '#fffbe0' : '#ffc890')); g.addColorStop(1, FLASH ? '#e2e6ee' : (weak ? '#e8b020' : '#d8401a'));
      circle(ctx, 0, 0, 32); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      if (weak) { spiralEye(ctx, 0, 0, 17); weakGlow(ctx, 0, -30, 8, 5, t); } else eyeB(ctx, 0, 0, 18, true);
      // 碎殼外圈齒
      ctx.strokeStyle = FLASH ? '#ffffff' : '#7a4a2a'; ctx.lineWidth = 3;
      for (i = 0; i < 8; i++) { var a = i * TAU / 8 + t * (weak ? 0 : 1) * TAU / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 34, Math.sin(a) * 34); ctx.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
  }

  function heroState(t) {
    var h = { cls: 'sword', x: 640, y: GY - 20, f: -1, alpha: 1, stealth: false, inv: false, lean: 0 }, p;
    if (t < 5.2) {
      h.alpha = 1 - seg(t, 4.8, 5.2);
      if (t < 1.62) { h.x = 640; h.f = t < 0.9 ? 1 : -1; }
      else if (t < 1.8) { p = seg(t, 1.62, 1.8); h.x = lerp(640, 480, p); h.inv = true; h.lean = -0.22; }
      else if (t < 2.05) { h.x = 480; h.f = t < 1.95 ? -1 : 1; }
      else if (t < 2.4) { p = seg(t, 2.05, 2.4); h.x = lerp(480, 575, p); h.f = 1; h.y -= Math.abs(Math.sin(p * Math.PI * 3)) * 3; }
      else { h.x = 575; h.f = 1; }
    } else if (t < 11.1) {
      h.cls = 'hunter'; h.x = 300; h.f = 1; h.alpha = Math.min(seg(t, 5.4, 5.8), 1 - seg(t, 10.8, 11.1)); h.stealth = t >= 7.0 && t < 8.3;
    } else {
      h.cls = 'bomber'; h.f = 1; h.x = 300; h.alpha = seg(t, 11.1, 11.5);
      if (t >= 12.2) h.x = lerp(300, 340, seg(t, 12.2, 12.5));
      if (t >= 14.0) h.x = lerp(340, 440, seg(t, 14.0, 14.3));
      if (t >= 14.9) h.x = lerp(440, 470, seg(t, 14.9, 15.1));
      for (var i = 0; i < BOMBS.length; i++) if (t >= BOMBS[i][0] && t < BOMBS[i][0] + 0.15) h.lean = 0.15;
      if (t >= WAVE && t < WAVE + 0.2) h.y += 3;
    }
    return h;
  }

  var ready = false;
  function init() {
    if (ready) return; ready = true;
    for (var i = 0; i < HITS.length; i++) { var w = weakPoint(bossState(HITS[i].t - 0.001)); HITS[i].x = w.x; HITS[i].y = w.y; }
  }

  function telegraphs(ctx, t) {
    var a, i;
    // 招 1: 落點紅圈 + 落柱
    if (t >= 0.8 && t < 1.95) {
      a = Math.min(seg(t, 0.8, 1.1), 1 - seg(t, 1.85, 1.95));
      stripes(ctx, 598, 150, 84, GY - 150, a * 0.8); landMark(ctx, 640, GY, 30 + 20 * seg(t, 0.8, 1.6), a);
    }
    // 招 2: 光束路線(紅虛線 + 往右的箭頭 + 起點準星)
    if (t >= 6.0 && t < 7.4) {
      a = Math.min(seg(t, 6.0, 6.3), 1 - seg(t, 7.2, 7.4));
      ctx.save(); ctx.globalAlpha *= a; ctx.setLineDash([10, 6]); ctx.strokeStyle = 'rgba(255,90,70,0.95)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(120, GY - 4); ctx.lineTo(900, GY - 4); ctx.stroke(); ctx.restore();
      for (i = 0; i < 5; i++) arrowHead(ctx, 160 + i * 160 + (t * 160) % 160, GY - 4, 0, a);
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(255,70,50,0.95)'; ctx.lineWidth = 2; circle(ctx, 120, GY - 4, 12); ctx.stroke(); ctx.restore();
    }
    // 招 3: 4 個落點依序亮起(圈內寫順序)
    for (i = 0; i < 4; i++) {
      var ta = 11.6 + i * 0.25, td = 12.6 + i * 0.25;
      if (t >= ta && t < td + 0.15) {
        a = Math.min(seg(t, ta, ta + 0.2), 1 - seg(t, td + 0.05, td + 0.15));
        stripes(ctx, MK[i] - 24, 110, 48, GY - 110, a * 0.7); landMark(ctx, MK[i], GY, 44, a);
        ctx.save(); ctx.globalAlpha *= a; text(ctx, String(i + 1), MK[i], GY - 14, 16, '#ffd0c8', 'center', true); ctx.restore();
      }
    }
  }
  function effectsBack(ctx, t, o) {
    var i, ag;
    // 光束焦痕
    if (t >= 7.2 && t < 8.8) {
      var end = lerp(120, 900, seg(t, 7.2, 8.2)), fa = 1 - seg(t, 8.2, 8.8);
      ctx.save(); ctx.globalAlpha *= fa; ctx.fillStyle = 'rgba(120,20,10,0.55)'; ctx.fillRect(120, GY - 3, end - 120, 6); ctx.restore();
    }
    // 拳頭 / 浮石 / 核心落地的地裂
    var cracks = [[1.92, 640, 56]];
    for (i = 0; i < 4; i++) cracks.push([12.72 + i * 0.25, MK[i], 30]);
    cracks.push([13.95, 560, 40]);
    for (i = 0; i < cracks.length; i++) {
      ag = t - cracks[i][0];
      if (ag >= 0 && ag < (i === 0 ? 2.9 : 1.3)) {
        var cx = cracks[i][1], w = cracks[i][2];
        ctx.strokeStyle = 'rgba(30,24,40,0.8)'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(cx - w, GY + 2); ctx.lineTo(cx - w * 0.6, GY + 9); ctx.lineTo(cx - w * 0.3, GY + 4); ctx.moveTo(cx + w, GY + 2); ctx.lineTo(cx + w * 0.55, GY + 10); ctx.lineTo(cx + w * 0.2, GY + 5); ctx.stroke();
      }
    }
  }
  function effectsFront(ctx, t, o) {
    var i, ag;
    // 浮石(第 3 階段)
    if (o.blocks) for (i = 0; i < 4; i++) {
      var b = o.blocks[i];
      if (b.show) { ctx.save(); ctx.globalAlpha *= o.alpha; ctx.translate(b.x, b.y); FLASH = o.flash; block(ctx, 0, 0, 44, 44, 9); FLASH = false; if (!o.flash) rune(ctx, 0, 0, 5, '#ff4a3a'); ctx.restore(); }
      if (b.crumble >= 0 && b.crumble < 0.5) callArt(ctx, 'drawPoof', { x: b.x, y: GY - 20, t: b.crumble, dur: 0.5, big: false });
    }
    // 拳頭碎裂成浮石
    for (i = 0; i < 2; i++) { ag = t - 11.0; if (ag >= 0 && ag < 0.5) callArt(ctx, 'drawPoof', { x: i ? 694 : 330, y: 300, t: ag, dur: 0.5, big: true }); }
    // 光束
    if (o.beam >= 0) {
      var ex = o.hx, ey = o.hy - 2;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,60,40,0.45)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(o.beam, GY); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,120,90,0.9)'; ctx.lineWidth = 12; ctx.stroke();
      ctx.strokeStyle = '#fff4ec'; ctx.lineWidth = 4; ctx.stroke();
      circle(ctx, o.beam, GY - 2, 22); ctx.fillStyle = 'rgba(255,170,90,0.7)'; ctx.fill();
      for (i = 0; i < 5; i++) { var sa = -Math.PI * (0.15 + 0.7 * hash(i, Math.floor(t * 20))); ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.beam, GY - 2); ctx.lineTo(o.beam + Math.cos(sa) * 26, GY - 2 + Math.sin(sa) * 26); ctx.stroke(); }
      ctx.restore();
    }
    // 聚光: 光線往眼睛收
    if (o.eye > 0 && o.eye < 1) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,120,90,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (i = 0; i < 10; i++) { var a = i * TAU / 10, u = (t * 2 + i * 0.1) % 1, r0 = 130 - u * 90; ctx.beginPath(); ctx.moveTo(o.hx + Math.cos(a) * r0, o.hy + Math.sin(a) * r0); ctx.lineTo(o.hx + Math.cos(a) * (r0 - 22), o.hy + Math.sin(a) * (r0 - 22)); ctx.stroke(); }
      ctx.restore();
    }
    // 過熱蒸氣
    if (o.steam) for (i = 0; i < 4; i++) { var u2 = (t * 2 + i / 4) % 1, sx = o.hx + (i % 2 ? 46 : -46); circle(ctx, sx + (i > 1 ? 10 : -10) * u2, o.hy - 70 - u2 * 70, 8 + u2 * 16); ctx.fillStyle = 'rgba(240,240,248,' + (0.7 * (1 - u2)) + ')'; ctx.fill(); }
    // 劍士: 衝刺速度線、揮砍
    if (t >= 1.62 && t < 1.92) speedLines(ctx, lerp(640, 480, seg(t, 1.62, 1.8)), GY - 20, -1, 1 - seg(t, 1.8, 1.92), 50);
    for (i = 0; i < SLASHES.length; i++) slash(ctx, 575, GY - 20, 1, (t - SLASHES[i]) / 0.15);
    // 獵人自動射箭
    for (i = 0; i < ARROWS.length; i++) {
      ag = t - ARROWS[i];
      if (ag >= 0 && ag < 0.3) {
        var tg = weakPoint(bossState(ARROWS[i] + 0.3)), x0 = 322, y0 = GY - 18, pp = ag / 0.3, ang = Math.atan2(tg.y - y0, tg.x - x0);
        callArt(ctx, 'drawArrow', { x: lerp(x0, tg.x, pp), y: lerp(y0, tg.y, pp), angle: ang });
      }
    }
    // 炸彈工: 炸彈 + 震波
    for (i = 0; i < BOMBS.length; i++) {
      var bm = BOMBS[i], fl = bm[1] - bm[0]; ag = t - bm[0];
      var tg2 = weakPoint(bossState(bm[1] - 0.001)), bx0 = bm[2] + 12, by0 = GY - 26;
      if (ag >= 0 && ag < fl) { var q = ag / fl; callArt(ctx, 'drawBomb', { x: lerp(bx0, tg2.x, q), y: lerp(by0, tg2.y, q) - 110 * 4 * q * (1 - q), t: ag }); }
      if (ag >= fl && ag < fl + 0.4) callArt(ctx, 'drawExplosion', { x: tg2.x, y: tg2.y, t: ag - fl, dur: 0.4, radius: 60 });
    }
    ag = t - WAVE; if (ag >= 0 && ag < 0.4) callArt(ctx, 'drawShockwave', { x: 470, y: GY - 20, t: ag, dur: 0.4, radius: 130 });
    if (o.roar > 0) roar(ctx, o.hx, o.hy, o.roar);
    for (i = 0; i < 4; i++) { ag = t - (16.3 + i * 0.15); if (ag >= 0 && ag < 0.7) callArt(ctx, 'drawPoof', { x: 560 + (i % 2 ? 70 : -70), y: GY - 50 - (i > 1 ? 50 : 0), t: ag, dur: 0.7, big: true }); }
  }

  function draw(ctx, t) {
    t = Number(t) || 0; t = ((t % D) + D) % D;
    init();
    var boss = bossState(t), hp = hpAt(HITS, t, MAX), hh = heroState(t), sh = [[1.92, 8], [8.4, 6], [13.95, 8]];
    for (var i = 0; i < 4; i++) sh.push([12.72 + i * 0.25, 3]);
    ctx.save();
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(0, shake(t, sh));
    ctx.scale(SC, SC);
    backdrop(ctx, t);
    rock(ctx, 0, GY, WW, WH - GY + 20, 0, 0);
    rock(ctx, -10, GY - 80, 190, 100, 0, 16); rock(ctx, 844, GY - 80, 190, 100, 16, 0);
    telegraphs(ctx, t);
    effectsBack(ctx, t, boss);
    FLASH = boss.flash;
    colossus(ctx, boss, t);
    fist(ctx, boss.lf, false, t); fist(ctx, boss.rf, boss.weak === 'fist', t);
    FLASH = false;
    drawHero(ctx, hh);
    effectsFront(ctx, t, boss);
    spray(ctx, HITS, t);
    if (boss.alpha > 0.05) bossBar(ctx, boss.hx, boss.hy - (boss.phase < 3 ? 124 : 124 + 44 * boss.split), hp, MAX, chipAt(HITS, t), !!boss.weak, TH);
    if (t >= 16.6) { ctx.save(); ctx.globalAlpha *= seg(t, 16.6, 17.0); text(ctx, '擊倒!', WW / 2, 200, 54, '#ffd23f', 'center', true); text(ctx, '→ 進入結局', WW / 2, 250, 22, '#f2f4f8', 'center', true); ctx.restore(); }
    ctx.restore();
    caption(ctx, t, '守門巨像', STAGES, PH_END, hh.cls);
    var fa = Math.max(1 - t / 0.5, (t - (D - 0.5)) / 0.5);
    if (fa > 0) { ctx.fillStyle = 'rgba(11,13,18,' + clamp(fa, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  window.VISUAL_OPTION = { element: 'final-boss', id: 'B', kind: 'anim', size: [1280, 720], duration: D, loop: true, draw: draw };
})();
