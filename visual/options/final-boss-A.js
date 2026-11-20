/* final-boss 方案 A — 巨型生物「崖角巨獸」: 岩角羊的王, 用身體在整個競技場來回衝撞、人立、跳砸。
 * 節奏: 有機的「蓄力 → 猛衝 → 卡住喘氣」, 每招結束都把自己卡在岩壁或地上, 露出黃色弱點(破綻, 傷害 ×2)。
 * 三階段外觀: 1 白羊毛完整 → 2 羊毛轉灰並帶電、角缺一截 → 3 羊毛脫落露出岩皮、雙角發紅光。
 * 每階段換一個職業示範反擊: 1 劍士(衝刺斬無敵穿過衝撞)、2 獵人(潛行穿過落石 + 自動射箭)、3 炸彈工(跳過地面震波 + 炸彈)。
 *
 * 照抄來源(挑中搬回遊戲時刪複本、改呼叫匯出版):
 *   hero()  ← options/hero-A.js 的主角幾何(劍士 / 獵人 / 炸彈工)
 *   icon()  ← options/materials-C.js 的素材圖示
 *   blob() / eyeB() / stripes() / landMark() / dashCurve() / hpBar 樣式 ← options/monsters-B.js
 *   backdrop() / rock() ← options/themes-B.js 的風蝕高崖(尖塔、斜肩台地、岩層帶、鋸齒白頂)
 * 動態完全由 t 決定; 底版 Art 只借 drawArrow / drawBomb / drawExplosion / drawPoof(都吃 state.t、不讀牆鐘)。
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

  // ================= 方案 A: 崖角巨獸 =================
  var MAX = 24, TH = [16, 8];
  var PH_END = [5.3, 10.9];
  var STAGES = [
    [0, 0, 'idle', '巨獸盯住玩家, 頭上血條 24 格、白刻度 = 換階段門檻'],
    [0.6, 0, 'prep', '低頭刨地、怒眼 · 地上鋪出紅色衝撞道'],
    [1.9, 0, 'atk', '直線衝撞 — 劍士衝刺斬無敵穿過, 順手砍 2'],
    [2.6, 0, 'weak', '角卡進岩壁暈眩 · 臀上黃色弱點 ×2, 劍士跳斬'],
    [5.0, 0, 'change', '怒吼: 羊毛轉灰帶電、角缺一截 → 第 2 階段'],
    [6.0, 0, 'prep', '人立而起 · 地上標出 3 個落石點'],
    [7.2, 0, 'atk', '跺地落石 — 獵人潛行(無敵)讓石頭穿過'],
    [7.8, 0, 'weak', '跪地喘氣 · 額頭弱點 ×2, 獵人自動射箭'],
    [10.6, 0, 'change', '怒吼: 羊毛脫落、雙角發紅光 → 第 3 階段'],
    [11.6, 0, 'prep', '蹲低蓄力 · 標出落點與震波往兩側走'],
    [12.6, 0, 'atk', '跳砸 + 地面震波 — 炸彈工跳過震波'],
    [13.9, 0, 'weak', '雙角插進地面 · 翹起的臀部弱點 ×2, 丟炸彈'],
    [15.5, 0, 'ko', '擊倒 → 進入結局']
  ];
  // 命中表: t = 命中時刻, d = 扣幾 HP(= 噴幾份素材), mult = 打在破綻上(×2)
  var HITS = [
    { t: 2.1, d: 2, x: 610, y: GY - 80, dir: -1 },
    { t: 3.1, d: 2, mult: 1, dir: -1 }, { t: 3.55, d: 2, mult: 1, dir: -1 }, { t: 4.0, d: 2, mult: 1, dir: -1 },
    { t: 8.4, d: 2, mult: 1, dir: 1 }, { t: 9.0, d: 2, mult: 1, dir: 1 }, { t: 9.6, d: 2, mult: 1, dir: 1 }, { t: 10.2, d: 2, mult: 1, dir: 1 },
    { t: 14.5, d: 4, mult: 1, dir: -1 }, { t: 15.5, d: 4, mult: 1, dir: -1 }
  ];
  var ARROWS = [8.1, 8.7, 9.3, 9.9], BOMBS = [14.0, 15.0], SLASHES = [3.1, 3.55, 4.0];

  function bossState(t) {
    var o = { x: 300, f: 1, phase: t < PH_END[0] ? 1 : (t < PH_END[1] ? 2 : 3), rot: 0, px: -65, sq: 1, hdx: 0, hdy: 0, hrot: 0, tuck: 0, lift: 0,
      angry: false, stun: false, weak: null, roar: 0, alpha: 1, speed: 0, glow: 0, dust: 0, mouth: 0 };
    var p;
    if (t < 0.6) { o.sq = 1 - 0.012 * Math.sin(TAU * t); }
    else if (t < 1.9) { p = sm(seg(t, 0.6, 1.2)); o.angry = true; o.sq = 1 - 0.07 * p; o.rot = 0.07 * p; o.hdy = 16 * p; o.hdx = 6 * p; o.dust = 1; }
    else if (t < 2.6) { p = seg(t, 1.9, 2.6); o.x = lerp(300, 864, p); o.angry = true; o.rot = 0.09; o.hdy = 18; o.hdx = 10; o.speed = 1; }
    else if (t < 5.0) { o.x = 864 - Math.sin(seg(t, 2.6, 2.8) * Math.PI) * 12; o.rot = 0.13; o.hdx = 14; o.hdy = 20; o.stun = true; o.weak = 'back'; }
    else if (t < 6.0) {
      p = sm(seg(t, 5.0, 5.5)); o.x = lerp(864, 760, p); o.f = t < 5.3 ? 1 : -1;
      if (t >= 5.3) { var q = seg(t, 5.3, 6.0); o.roar = q; o.hrot = -0.35 * Math.sin(q * Math.PI); o.mouth = Math.sin(q * Math.PI); }
    }
    else if (t < 7.2) { o.x = 760; o.f = -1; p = sm(seg(t, 6.0, 7.0)); o.rot = -0.42 * p; o.angry = true; o.tuck = p; o.hrot = -0.15 * p; }
    else if (t < 7.8) { o.x = 760; o.f = -1; p = seg(t, 7.2, 7.32); o.rot = lerp(-0.42, 0.03, p * p); o.tuck = 1 - p; o.angry = true; }
    else if (t < 10.6) { o.x = 760; o.f = -1; p = sm(seg(t, 7.8, 8.2)); o.rot = 0.17 * p; o.hdy = 46 * p; o.hdx = 4 * p; o.stun = true; o.weak = 'head'; o.sq = 1 - 0.02 * Math.sin(TAU * t * 2) * p; }
    else if (t < 11.6) {
      o.x = 760; o.f = -1; p = sm(seg(t, 10.6, 11.0)); o.rot = 0.17 * (1 - p); o.hdy = 46 * (1 - p);
      if (t >= 10.9) { var q2 = seg(t, 10.9, 11.6); o.roar = q2; o.hrot = -0.35 * Math.sin(q2 * Math.PI); o.mouth = Math.sin(q2 * Math.PI); }
    }
    else if (t < 12.6) { o.x = 760; o.f = -1; p = sm(seg(t, 11.6, 12.4)); o.sq = 1 - 0.14 * p; o.angry = true; o.glow = p; o.hdy = 10 * p; o.dust = p; }
    else if (t < 13.2) { p = seg(t, 12.6, 13.2); o.x = lerp(760, 520, p); o.f = -1; o.lift = 300 * 4 * p * (1 - p); o.sq = 1.05; o.tuck = 0.8; o.angry = true; o.glow = 1; }
    else {
      o.x = 520; o.f = -1; p = seg(t, 13.2, 13.35); o.sq = 1 - 0.12 * Math.sin(p * Math.PI);
      var q3 = sm(seg(t, 13.2, 13.45)); o.rot = 0.2 * q3; o.px = 65; o.hdy = 40 * q3; o.glow = 0.5;
      if (t > 13.45) { o.stun = true; o.weak = t < 15.5 ? 'back' : null; }
      if (t >= 15.5) o.alpha = 1 - seg(t, 16.0, 16.5);
    }
    o.flash = flashAt(HITS, t) || (t >= 15.5 && t < 16.1 && Math.floor((t - 15.5) * 10) % 2 === 0);
    return o;
  }
  // 局部座標(面向右、原點 = 腳底中心)→ 世界座標
  function toWorld(o, lx, ly) {
    var sx = 1 + (1 - o.sq) * 0.6, x1 = sx * lx - o.px, y1 = o.sq * ly, c = Math.cos(o.rot), s = Math.sin(o.rot);
    return { x: o.x + o.f * (x1 * c - y1 * s + o.px), y: GY - o.lift + (x1 * s + y1 * c) };
  }
  function weakPoint(o) {
    if (o.weak === 'head') return toWorld(o, 100 + o.hdx, -142 + o.hdy);
    return toWorld(o, -95, -110);
  }
  function horn(ctx, cx, cy, r, a0, span, lw, col, dark) {
    if (FLASH) { col = '#ffffff'; dark = '#d8dce4'; }
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 - span, true); ctx.lineWidth = lw + 3; ctx.strokeStyle = dark; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 - span, true); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = dark;
    for (var u = 0.1; u < 0.95; u += 0.1) {
      var a = a0 - span * u, c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(cx + c * (r - lw / 2 + 1.5), cy + s * (r - lw / 2 + 1.5)); ctx.lineTo(cx + c * (r + lw / 2 - 1.5), cy + s * (r + lw / 2 - 1.5)); ctx.stroke();
    }
  }
  function beast(ctx, o, t) {
    var ph = o.phase, i;
    shadow(ctx, o.x, GY, 125 * (1 - o.lift / 700));
    ctx.save();
    ctx.globalAlpha *= o.alpha;
    ctx.translate(o.x, GY - o.lift); ctx.scale(o.f, 1);
    if (o.speed) { // 衝撞速度線(身後)
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (i = 0; i < 5; i++) { var yy = -40 - i * 30; ctx.beginPath(); ctx.moveTo(-150 - i * 6, yy); ctx.lineTo(-230 - hash(i, 2) * 60, yy); ctx.stroke(); }
    }
    if (o.dust) { // 刨地揚塵(後腳)
      for (i = 0; i < 3; i++) { var a = ((t * 3 + i / 3) % 1); circle(ctx, -100 - a * 60, -8 - a * 26, (6 + a * 10) * o.dust); ctx.fillStyle = 'rgba(230,236,246,' + (0.8 * (1 - a)) + ')'; ctx.fill(); }
    }
    ctx.translate(o.px, 0); ctx.rotate(o.rot); ctx.translate(-o.px, 0);
    ctx.scale(1 + (1 - o.sq) * 0.6, o.sq);
    // 腿
    var lg = [[-84, 0], [-50, 0], [50, 1], [84, 1]];
    for (i = 0; i < 4; i++) {
      var tk = lg[i][1] ? o.tuck : o.tuck * 0.4, len = 56 - tk * 26;
      ctx.fillStyle = FLASH ? '#ffffff' : (ph === 3 ? '#3e4352' : '#4a5060'); rr(ctx, lg[i][0] - 13, -60, 26, len + 4, 10); ctx.fill();
      ctx.fillStyle = FLASH ? '#e2e6ee' : '#22262e'; rr(ctx, lg[i][0] - 14, -60 + len - 6, 28, 10, 4); ctx.fill();
    }
    // 岩皮身體
    blob(ctx, -6, -102, 110, 54, '#8a92a4', '#4a5060');
    if (ph === 3 && !FLASH) { // 第 3 階段: 岩皮上的紅光裂紋
      ctx.save(); ctx.strokeStyle = '#ff8a3a'; ctx.shadowColor = '#ff6a2a'; ctx.shadowBlur = 8; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-60, -140); ctx.lineTo(-44, -118); ctx.lineTo(-52, -96); ctx.moveTo(-20, -146); ctx.lineTo(-8, -122); ctx.lineTo(10, -118); ctx.moveTo(-90, -110); ctx.lineTo(-74, -100); ctx.stroke(); ctx.restore();
    }
    // 羊毛
    var wool = ph === 1 ? ['#ffffff', '#aab4c8'] : (ph === 2 ? ['#dfe4ee', '#6c7590'] : ['#c8ccd6', '#5a6070']);
    var puffs = [[-78, -102, 40], [-40, -130, 44], [6, -134, 44], [50, -112, 40], [-60, -76, 34], [-14, -84, 42], [34, -82, 34], [-94, -130, 28]];
    for (i = 0; i < puffs.length; i++) {
      if (ph === 3 && (i === 1 || i === 5 || i === 7)) continue;
      blob(ctx, puffs[i][0], puffs[i][1], puffs[i][2], puffs[i][2] * 0.86, wool[0], wool[1]);
    }
    if (ph === 2 && !FLASH) { // 第 2 階段: 帶電羊毛(黃色電弧閃爍)
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      for (i = 0; i < 4; i++) {
        if (Math.sin(TAU * t * 4 + i * 1.7) < 0.1) continue;
        var px = puffs[i * 2][0], py = puffs[i * 2][1] - puffs[i * 2][2] * 0.7;
        ctx.beginPath(); ctx.moveTo(px - 10, py); ctx.lineTo(px - 3, py - 9); ctx.lineTo(px + 2, py - 2); ctx.lineTo(px + 10, py - 12); ctx.stroke();
      }
    }
    if (o.weak === 'back') weakGlow(ctx, -95, -110, 24, 14, t);
    // 頭
    ctx.save(); ctx.translate(100 + o.hdx, -112 + o.hdy); ctx.rotate(o.hrot);
    horn(ctx, -18, -14, 28, -1.3, 4.0, 12, '#a8874e', '#5a4420'); // 遠側角
    blob(ctx, 0, 0, 38, 33, '#8a92a4', '#4a5060');
    blob(ctx, 26, 12, 19, 15, '#b4bccb', '#6a7284');
    ctx.fillStyle = '#2a2a33'; circle(ctx, 38, 10, 2.4); ctx.fill();
    if (o.mouth > 0) { ell(ctx, 28, 24, 12, 8 * o.mouth); ctx.fillStyle = '#3a1418'; ctx.fill(); }
    if (o.stun) spiralEye(ctx, 6, -6, 9);
    else {
      eyeB(ctx, 6, -6, 9, o.angry);
      if (o.angry) { ctx.strokeStyle = '#2a1010'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(16, -14); ctx.stroke(); }
    }
    var hc = ph === 3 ? ['#ffb35a', '#8a3a10'] : ['#e8c482', '#6a4a1e'];
    if (ph === 3 || o.glow > 0) { ctx.save(); ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = 10 + 10 * o.glow; horn(ctx, -12, -10, 31, -1.3, ph >= 2 ? 3.5 : 4.3, 16, hc[0], hc[1]); ctx.restore(); }
    else horn(ctx, -12, -10, 31, -1.3, ph >= 2 ? 3.5 : 4.3, 16, hc[0], hc[1]);
    if (ph >= 2) { // 缺角斷面
      var ea = -1.3 - 3.5, ex = -12 + Math.cos(ea) * 31, ey = -10 + Math.sin(ea) * 31;
      poly(ctx, [ex - 7, ey - 3, ex - 2, ey + 4, ex + 3, ey - 2, ex + 7, ey + 5, ex + 6, ey - 6]); ctx.fillStyle = FLASH ? '#ffffff' : '#fff0d0'; ctx.fill();
    }
    if (o.weak === 'head') weakGlow(ctx, 0, -30, 16, 9, t);
    if (o.stun) { // 暈眩星
      ctx.fillStyle = '#ffe066';
      for (i = 0; i < 3; i++) { var sa = TAU * (t * 0.5 + i / 3); star4(ctx, Math.cos(sa) * 30, -58 + Math.sin(sa) * 7, 6); ctx.fill(); }
    }
    ctx.restore();
    ctx.restore();
  }

  // 劍士跳斬: 每次以揮砍時刻為頂點跳起 80px, 才砍得到臀上的弱點
  function heroHop(t) { for (var i = 0; i < SLASHES.length; i++) { var p = seg(t, SLASHES[i] - 0.2, SLASHES[i] + 0.2); if (p > 0 && p < 1) return 80 * 4 * p * (1 - p); } return 0; }
  function heroState(t) {
    var h = { cls: 'sword', x: 700, y: GY - 20, f: -1, alpha: 1, stealth: false, inv: false, lean: 0 }, p;
    if (t < 5.3) {
      h.alpha = 1 - seg(t, 4.9, 5.3);
      if (t < 2.0) { h.x = 700; h.lean = t > 1.85 ? 0.12 : 0; }
      else if (t < 2.18) { p = seg(t, 2.0, 2.18); h.x = lerp(700, 540, p); h.inv = true; h.lean = -0.22; }
      else if (t < 2.5) { h.x = 540; h.f = t < 2.32 ? -1 : 1; }
      else if (t < 2.9) { p = seg(t, 2.5, 2.9); h.x = lerp(540, 730, p); h.f = 1; h.y -= Math.abs(Math.sin(p * Math.PI * 4)) * 3; }
      else { h.x = 730; h.f = 1; h.y -= heroHop(t); }
    } else if (t < 11.0) {
      h.cls = 'hunter'; h.x = 200; h.f = 1; h.alpha = Math.min(seg(t, 5.3, 5.7), 1 - seg(t, 10.6, 11.0)); h.stealth = t >= 6.9 && t < 8.1;
    } else {
      h.cls = 'bomber'; h.f = 1; h.x = 250; h.alpha = seg(t, 11.0, 11.4);
      if (t >= 13.35 && t < 13.8) { p = seg(t, 13.35, 13.8); h.y -= 100 * 4 * p * (1 - p); }
      if (t >= 13.85) { p = seg(t, 13.85, 14.0); h.x = lerp(250, 330, p); }
      for (var i = 0; i < BOMBS.length; i++) if (t >= BOMBS[i] && t < BOMBS[i] + 0.15) h.lean = 0.15;
    }
    return h;
  }

  var ready = false;
  function init() {
    if (ready) return; ready = true;
    for (var i = 0; i < HITS.length; i++) if (HITS[i].x === undefined) { var w = weakPoint(bossState(HITS[i].t - 0.001)); HITS[i].x = w.x; HITS[i].y = w.y; }
  }

  function telegraphs(ctx, t) {
    var a, i;
    // 招 1: 紅色衝撞道
    if (t >= 0.6 && t < 2.6) {
      a = Math.min(seg(t, 0.6, 0.9), 1 - seg(t, 2.3, 2.6));
      stripes(ctx, 440, GY - 170, 544, 170, a);
      for (i = 0; i < 4; i++) arrowHead(ctx, 520 + i * 110 + (t * 120 % 110), GY - 85, 0, a);
    }
    // 招 2: 落石點 + 落石柱
    var marks = [200, 330, 460];
    if (t >= 6.0 && t < 7.9) {
      a = Math.min(seg(t, 6.0, 6.3), 1 - seg(t, 7.6, 7.9));
      for (i = 0; i < 3; i++) { stripes(ctx, marks[i] - 24, 0, 48, GY, a * 0.8); landMark(ctx, marks[i], GY, 30, a); }
    }
    // 招 3: 落點 + 震波往兩側
    if (t >= 11.6 && t < 13.2) {
      a = Math.min(seg(t, 11.6, 11.9), 1);
      landMark(ctx, 520, GY, 130, a); dashCurve(ctx, 760, GY - 200, 640, -40, 520, GY - 120, a);
      for (i = 0; i < 2; i++) { arrowHead(ctx, 390 - i * 40, GY - 12, Math.PI, a); arrowHead(ctx, 650 + i * 40, GY - 12, 0, a); }
    }
  }
  function effectsBack(ctx, t) {
    var i;
    // 地面震波
    if (t >= 13.2 && t < 14.2) {
      var ag = t - 13.2, hgt = 30 * (1 - ag / 1.0);
      for (var s = -1; s <= 1; s += 2) {
        var xx = 520 + s * (130 + 460 * ag);
        if (xx < 40 || xx > 984) continue;
        ctx.save(); ell(ctx, xx, GY, 26, hgt); ctx.fillStyle = 'rgba(255,120,60,0.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,200,120,0.95)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      }
    }
    // 撞牆碎石
    if (t >= 2.6 && t < 3.3) { for (i = 0; i < 5; i++) { var ag2 = t - 2.6; circle(ctx, 984 - 10 - ag2 * (60 + i * 30), GY - 150 + i * 20 + 300 * ag2 * ag2, 6); ctx.fillStyle = '#7d8ca5'; ctx.fill(); } }
  }
  function effectsFront(ctx, t, boss) {
    var i, ag;
    // 落石
    var marks = [200, 330, 460];
    for (i = 0; i < 3; i++) {
      var t0 = 7.2 + i * 0.08; ag = t - t0;
      if (ag >= 0 && ag < 0.42) { var y = lerp(-40, GY - 22, (ag / 0.42) * (ag / 0.42)); blob(ctx, marks[i], y, 22, 20, '#c8ccd6', '#6a707c'); }
      if (ag >= 0.42 && ag < 1.0) callArt(ctx, 'drawPoof', { x: marks[i], y: GY - 18, t: ag - 0.42, dur: 0.58, big: false });
    }
    // 劍士: 衝刺速度線、揮砍
    if (t >= 2.0 && t < 2.3) speedLines(ctx, lerp(700, 540, seg(t, 2.0, 2.18)), GY - 20, -1, 1 - seg(t, 2.18, 2.3), 50);
    for (i = 0; i < SLASHES.length; i++) slash(ctx, 730, GY - 20 - heroHop(t), 1, (t - SLASHES[i]) / 0.15);
    // 獵人自動射箭
    var tgt = weakPoint(bossState(9.0));
    for (i = 0; i < ARROWS.length; i++) {
      ag = t - ARROWS[i];
      if (ag >= 0 && ag < 0.3) {
        var x0 = 222, y0 = GY - 18, pp = ag / 0.3, ax = lerp(x0, tgt.x, pp), ay = lerp(y0, tgt.y, pp), ang = Math.atan2(tgt.y - y0, tgt.x - x0);
        if (!callArt(ctx, 'drawArrow', { x: ax, y: ay, angle: ang })) { ctx.strokeStyle = '#f3ead8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - Math.cos(ang) * 12, ay - Math.sin(ang) * 12); ctx.lineTo(ax + Math.cos(ang) * 12, ay + Math.sin(ang) * 12); ctx.stroke(); }
      }
    }
    // 炸彈工: 炸彈拋物線 + 爆炸
    for (i = 0; i < BOMBS.length; i++) {
      ag = t - BOMBS[i];
      var bt = weakPoint(bossState(BOMBS[i] + 0.5)), bx0 = 342, by0 = GY - 26;
      if (ag >= 0 && ag < 0.5) {
        var q = ag / 0.5, bx = lerp(bx0, bt.x, q), by = lerp(by0, bt.y, q) - 130 * 4 * q * (1 - q);
        if (!callArt(ctx, 'drawBomb', { x: bx, y: by, t: ag })) { circle(ctx, bx, by, 8); ctx.fillStyle = '#2a2a33'; ctx.fill(); }
      }
      if (ag >= 0.5 && ag < 0.9) callArt(ctx, 'drawExplosion', { x: bt.x, y: bt.y, t: ag - 0.5, dur: 0.4, radius: 60 });
    }
    // 怒吼
    var hd = toWorld(boss, 100 + boss.hdx, -112 + boss.hdy);
    if (boss.roar > 0) roar(ctx, hd.x, hd.y, boss.roar);
    // 擊倒煙
    for (i = 0; i < 4; i++) { ag = t - (15.9 + i * 0.15); if (ag >= 0 && ag < 0.7) callArt(ctx, 'drawPoof', { x: 520 + (i % 2 ? 60 : -60), y: GY - 90 - (i > 1 ? 40 : 0), t: ag, dur: 0.7, big: true }); }
  }

  function draw(ctx, t) {
    t = Number(t) || 0; t = ((t % D) + D) % D;
    init();
    var boss = bossState(t), hp = hpAt(HITS, t, MAX), hh = heroState(t);
    ctx.save();
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(shake(t, [[2.6, 7], [7.32, 6], [13.2, 9]]), 0);
    ctx.scale(SC, SC);
    backdrop(ctx, t);
    rock(ctx, 0, GY, WW, WH - GY + 20, 0, 0);
    rock(ctx, -10, 110, 50, GY - 110, 0, 14); rock(ctx, 984, 110, 60, GY - 110, 14, 0);
    telegraphs(ctx, t);
    effectsBack(ctx, t);
    FLASH = boss.flash; beast(ctx, boss, t); FLASH = false;
    drawHero(ctx, hh);
    effectsFront(ctx, t, boss);
    spray(ctx, HITS, t);
    if (boss.alpha > 0.05) {
      var hd = toWorld(boss, 100 + boss.hdx, -112 + boss.hdy);
      bossBar(ctx, hd.x, hd.y - 64, hp, MAX, chipAt(HITS, t), !!boss.weak, TH);
    }
    if (t >= 16.2) { ctx.save(); ctx.globalAlpha *= seg(t, 16.2, 16.6); text(ctx, '擊倒!', WW / 2, 200, 54, '#ffd23f', 'center', true); text(ctx, '→ 進入結局', WW / 2, 250, 22, '#f2f4f8', 'center', true); ctx.restore(); }
    ctx.restore();
    caption(ctx, t, '崖角巨獸', STAGES, PH_END, hh.cls);
    var fa = Math.max(1 - t / 0.5, (t - (D - 0.5)) / 0.5);
    if (fa > 0) { ctx.fillStyle = 'rgba(11,13,18,' + clamp(fa, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  window.VISUAL_OPTION = { element: 'final-boss', id: 'A', kind: 'anim', size: [1280, 720], duration: D, loop: true, draw: draw };
})();
