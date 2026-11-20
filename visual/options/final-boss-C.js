/* final-boss 方案 C — 吞噬素材的魔物「貪食風囊」: 一隻半透明大肚袋, 肚皮裡看得到牠吞下的素材; 招式都圍繞「吸進來、吐出去、壓下來」。
 * 節奏: 軟Q的擠壓伸展(吸氣鼓脹 → 吐出洩氣 → 壓扁彈跳), 和 A 的猛衝、B 的機械分段都不同; 每招結束都虛脫一段, 露出黃色弱點(破綻, 傷害 ×2)。
 * 被打時照規則每掉 1 HP 噴 1 份素材, 而肚皮裡的素材同步變少(肚裡素材數 = 剩餘 HP ÷ 3), 「把吞下去的打出來」一眼看得懂。
 * 三階段外觀: 1 圓滾砂橘 → 2 背上冒出吞下的岩刺、雙頰鼓起 → 3 全身漲紅、浮出血絲、眼睛暴凸。
 * 每階段換一個職業示範反擊: 1 劍士(逆風跑 → 衝刺斬砍鼓脹的肚皮)、2 獵人(潛行穿過石彈 + 射舌尖)、3 炸彈工(從跳起的魔物底下跑過 + 炸翻肚的肚皮)。
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

  // ================= 方案 C: 貪食風囊 =================
  var MAX = 24, TH = [16, 8];
  var PH_END = [5.3, 10.9];
  var RX = 130, RY = 105;
  var SPIT = [6.9, 7.05, 7.2], SPIT_MK = [200, 330, 460];
  var STAGES = [
    [0, 0, 'idle', '貪食風囊鼓著肚子, 半透明肚皮裡看得到吞下的素材'],
    [0.6, 0, 'prep', '張開大嘴 · 前方地面紅區 = 吸入範圍'],
    [1.6, 0, 'atk', '強力吸入 — 地上素材被吸走, 劍士逆風往外跑'],
    [3.0, 0, 'weak', '吞太飽打嗝 · 鼓脹的肚皮轉黃 = 弱點 ×2, 衝刺斬'],
    [5.0, 0, 'change', '怒吼: 背上冒出吞下的岩刺 → 第 2 階段'],
    [6.0, 0, 'prep', '鼓起雙頰後仰 · 紅虛線標出 3 顆石彈的落點'],
    [6.9, 0, 'atk', '連吐 3 顆石彈 — 獵人潛行(無敵)讓石彈穿過'],
    [7.9, 0, 'weak', '吐到虛脫、舌頭攤在地上 · 舌尖弱點 ×2'],
    [10.6, 0, 'change', '怒吼: 全身漲紅、浮出血絲 → 第 3 階段'],
    [11.6, 0, 'prep', '壓扁蓄力 · 紅圈標出跳躍落點(就在玩家腳下)'],
    [12.4, 0, 'atk', '高高跳起壓下 — 炸彈工從牠底下跑過去'],
    [13.5, 0, 'weak', '撞牆翻肚暈眩 · 朝上的肚皮弱點 ×2, 丟炸彈'],
    [15.45, 0, 'ko', '擊倒 → 進入結局']
  ];
  var HITS = [
    { t: 3.2, d: 4, mult: 1, dir: -1 }, { t: 3.7, d: 2, mult: 1, dir: -1 }, { t: 4.15, d: 2, mult: 1, dir: -1 },
    { t: 8.6, d: 2, mult: 1, dir: -1 }, { t: 9.2, d: 2, mult: 1, dir: -1 }, { t: 9.8, d: 2, mult: 1, dir: -1 }, { t: 10.4, d: 2, mult: 1, dir: -1 },
    { t: 14.45, d: 4, mult: 1, dir: 1 }, { t: 15.45, d: 4, mult: 1, dir: 1 }
  ];
  var SLASHES = [3.7, 4.15], ARROWS = [8.3, 8.9, 9.5, 10.1], BOMBS = [14.0, 15.0];
  var SUCK = [[1.6, 1.95, 300, 'stone'], [1.9, 2.35, 360, 'wood']]; // 被吸走的地上素材: 起飛, 進嘴, x, 種類

  function bossState(t) {
    var o = { x: 740, f: -1, phase: t < PH_END[0] ? 1 : (t < PH_END[1] ? 2 : 3), sq: 1 + 0.02 * Math.sin(TAU * t), sx: 1, lift: 0, rot: 0,
      mouth: 0, cheeks: 0, tongue: 0, flip: 0, dizzy: false, angry: t >= 0.6, weak: null, roar: 0, alpha: 1, extra: 0 };
    var p;
    if (t >= 0.6 && t < 1.6) { p = sm(seg(t, 0.6, 1.4)); o.mouth = p; o.sx = 1 + 0.04 * p; }
    else if (t >= 1.6 && t < 3.0) { o.mouth = 1; o.sx = 1.04 + 0.04 * seg(t, 1.6, 3.0); o.sq = 1 + 0.03 * Math.sin(TAU * t * 4); }
    else if (t >= 3.0 && t < 5.0) { p = seg(t, 3.0, 3.15); o.mouth = 1 - p; o.sx = 1.1; o.sq = 1.06 - 0.03 * Math.sin(TAU * t); o.dizzy = t > 3.1; o.weak = 'belly'; o.angry = false; }
    else if (t >= 5.0 && t < 6.0) { o.sx = lerp(1.1, 1, seg(t, 5.0, 5.3)); if (t >= 5.3) { var q = seg(t, 5.3, 6.0); o.roar = q; o.mouth = Math.sin(q * Math.PI); } }
    else if (t >= 6.0 && t < 6.9) { p = sm(seg(t, 6.0, 6.7)); o.cheeks = p; o.rot = -0.12 * p; o.sq = 1 + 0.06 * p; }
    else if (t >= 6.9 && t < 7.9) {
      o.cheeks = 1 - seg(t, 7.2, 7.5); o.rot = -0.04; o.mouth = 0;
      for (var i = 0; i < SPIT.length; i++) { var a = t - SPIT[i]; if (a >= 0 && a < 0.14) { o.mouth = 0.7 * Math.sin(a / 0.14 * Math.PI); o.rot = 0.06; } }
    }
    else if (t >= 7.9 && t < 10.6) { p = sm(seg(t, 7.9, 8.2)); o.sq = 1 - 0.14 * p + 0.02 * Math.sin(TAU * t * 2) * p; o.sx = 1 + 0.08 * p; o.tongue = p; o.mouth = 0.45 * p; o.dizzy = true; o.angry = false; if (t > 8.1) o.weak = 'tongue'; }
    else if (t >= 10.6 && t < 11.6) {
      p = sm(seg(t, 10.6, 10.9)); o.tongue = 1 - p; o.mouth = 0.45 * (1 - p); o.sq = lerp(0.86, 1, p);
      if (t >= 10.9) { var q2 = seg(t, 10.9, 11.6); o.roar = q2; o.mouth = Math.sin(q2 * Math.PI); }
    }
    else if (t >= 11.6 && t < 12.4) { p = sm(seg(t, 11.6, 12.3)); o.sq = 1 - 0.22 * p; o.sx = 1 + 0.12 * p; }
    else if (t >= 12.4 && t < 13.4) { p = seg(t, 12.4, 13.4); o.x = lerp(740, 220, p); o.lift = 260 * 4 * p * (1 - p); o.sq = 1.08; o.sx = 0.94; o.rot = 0.15 * (p - 0.5); }
    else if (t >= 13.4) {
      o.x = 220; p = seg(t, 13.4, 13.55); o.sq = 1 - 0.2 * Math.sin(p * Math.PI); o.sx = 1 + 0.15 * Math.sin(p * Math.PI);
      o.flip = sm(seg(t, 13.5, 13.8)); o.angry = false;
      if (t >= 13.8) { o.dizzy = true; o.weak = t < 15.45 ? 'belly' : null; }
      if (t >= 15.45) o.alpha = 1 - seg(t, 15.9, 16.4);
    }
    if (t >= 1.95 && t < 3.2) o.extra = t >= 2.35 ? 2 : 1;
    o.flash = flashAt(HITS, t) || (t >= 15.45 && t < 16.0 && Math.floor((t - 15.45) * 10) % 2 === 0);
    return o;
  }
  // 局部(面向右、原點 = 底部中心)→ 世界
  function toWorld(o, lx, ly) {
    var x = o.sx * lx, y = o.sq * ly, c = Math.cos(o.rot), s = Math.sin(o.rot);
    var x2 = x * c - y * s, y2 = x * s + y * c;
    var fa = -o.flip * 2.7, c2 = Math.cos(fa), s2 = Math.sin(fa), yy = y2 + RY;
    var x3 = x2 * c2 - yy * s2, y3 = x2 * s2 + yy * c2 - RY;
    return { x: o.x + o.f * x3, y: GY - o.lift + y3 };
  }
  function weakPoint(o) {
    if (o.weak === 'tongue') return toWorld(o, 300, -8);
    return toWorld(o, 50, -70);
  }
  var SLOTS = [[-36, -10], [-8, -26], [22, -14], [-20, 16], [10, 12], [40, 14], [-46, 12], [36, -30], [-30, -32], [52, -4]];
  function sack(ctx, o, t, hp) {
    var ph = o.phase, i;
    shadow(ctx, o.x, GY, (RX + 10) * (1 - o.lift / 600));
    ctx.save(); ctx.globalAlpha *= o.alpha;
    ctx.translate(o.x, GY - o.lift); ctx.scale(o.f, 1);
    if (o.flip > 0) { ctx.translate(0, -RY); ctx.rotate(-o.flip * 2.7); ctx.translate(0, RY); }
    ctx.rotate(o.rot);
    ctx.scale(o.sx, o.sq);
    var col = ph === 1 ? ['#f6cc7c', '#b06a2c'] : (ph === 2 ? ['#eab070', '#94522a'] : ['#e48a62', '#7a3020']);
    // 短腳
    var ft = [[-82, -8], [-32, -4], [30, -4], [82, -8]];
    for (i = 0; i < 4; i++) blob(ctx, ft[i][0], ft[i][1], 22, 12, col[1], '#5a2a10');
    // 背上岩刺(第 2 階段起: 吞下的石頭從背上冒出來)
    if (ph >= 2) {
      var sp = [[-70, -178, 26], [-30, -200, 32], [12, -206, 26]];
      for (i = 0; i < 3; i++) {
        var s0 = sp[i]; poly(ctx, [s0[0] - 14, s0[1] + 20, s0[0] - 4, s0[1] - s0[2], s0[0] + 6, s0[1] - s0[2] + 6, s0[0] + 16, s0[1] + 20]);
        var g = ctx.createLinearGradient(0, s0[1] - s0[2], 0, s0[1] + 20); g.addColorStop(0, FLASH ? '#fff' : '#e8eef5'); g.addColorStop(1, FLASH ? '#e2e6ee' : '#5d6680'); ctx.fillStyle = g; ctx.fill();
      }
    }
    blob(ctx, 0, -RY, RX, RY, col[0], col[1]);
    if (ph === 3 && !FLASH) { // 血絲
      ctx.strokeStyle = 'rgba(140,20,30,0.7)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-110, -120); ctx.quadraticCurveTo(-80, -100, -86, -70); ctx.moveTo(-90, -170); ctx.quadraticCurveTo(-60, -150, -40, -165); ctx.moveTo(-60, -40); ctx.quadraticCurveTo(-30, -50, -20, -30); ctx.stroke();
    }
    // 半透明肚皮 + 吞下的素材
    var bx = 50, by = -70, brx = 64, bry = 50, weakB = o.weak === 'belly';
    ell(ctx, bx, by, brx, bry); ctx.fillStyle = FLASH ? 'rgba(255,255,255,0.9)' : 'rgba(255,244,220,0.42)'; ctx.fill();
    if (weakB) { ctx.save(); ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 18; ctx.lineWidth = 5; ctx.strokeStyle = '#ffe066'; ctx.stroke(); ctx.restore(); }
    else { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.stroke(); }
    if (!FLASH) {
      ctx.save(); ell(ctx, bx, by, brx - 3, bry - 3); ctx.clip();
      var n = Math.min(SLOTS.length, Math.ceil(hp / 3) + o.extra);
      for (i = 0; i < n; i++) icon(ctx, KINDS[i % 4], bx + SLOTS[i][0], by + SLOTS[i][1] + Math.sin(TAU * t * 0.5 + i * 1.3) * 3, 22);
      ctx.restore();
      ell(ctx, bx - 22, by - 26, 22, 8, -0.3); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
    }
    if (weakB) weakGlow(ctx, bx + 30, by - 44, 8, 5, t);
    // 雙頰
    if (o.cheeks > 0) { blob(ctx, 92, -112, 26 * o.cheeks, 22 * o.cheeks, '#ffd8a0', col[1]); }
    // 嘴
    var mx = 114, my = -146;
    if (o.mouth > 0.05) {
      var mw = 22 + 16 * o.mouth, mh = 46 * o.mouth;
      ell(ctx, mx, my, mw, mh); ctx.fillStyle = FLASH ? '#e8e8f0' : '#3a0c18'; ctx.fill();
      ell(ctx, mx + 4, my + mh * 0.3, mw * 0.6, mh * 0.45); ctx.fillStyle = FLASH ? '#ffffff' : '#7a1a2c'; ctx.fill();
      ctx.fillStyle = FLASH ? '#ffffff' : '#fffaf0';
      for (i = 0; i < 3; i++) { var tx = mx - mw * 0.55 + i * mw * 0.55; poly(ctx, [tx - 5, my - mh + 4, tx + 5, my - mh + 4, tx, my - mh + 4 + 9 * o.mouth]); ctx.fill(); poly(ctx, [tx - 5, my + mh - 4, tx + 5, my + mh - 4, tx, my + mh - 4 - 9 * o.mouth]); ctx.fill(); }
    } else {
      ctx.strokeStyle = FLASH ? '#ffffff' : '#5a2010'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(90, -160); ctx.quadraticCurveTo(112, -140, 124, -150); ctx.stroke();
    }
    // 舌頭(攤在地上, 舌尖 = 弱點)
    if (o.tongue > 0) {
      var tl = 150 * o.tongue;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(mx, my + 20); ctx.quadraticCurveTo(mx + 34, -20, 150, -8); ctx.lineTo(150 + tl, -8);
      ctx.lineWidth = 20; ctx.strokeStyle = FLASH ? '#e2e6ee' : '#b8405a'; ctx.stroke();
      ctx.lineWidth = 15; ctx.strokeStyle = FLASH ? '#ffffff' : '#ff8aa8'; ctx.stroke();
      ctx.restore();
      if (o.weak === 'tongue') weakGlow(ctx, 150 + tl, -8, 12, 8, t);
    }
    // 眼柄 + 眼睛
    var eyes = [[18, -196, 8, -236], [58, -192, 64, -230]];
    for (i = 0; i < 2; i++) {
      var e = eyes[i];
      ctx.strokeStyle = FLASH ? '#ffffff' : col[1]; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); ctx.stroke();
      var er = ph === 3 ? 16 : 13;
      if (o.dizzy) spiralEye(ctx, e[2], e[3], er); else eyeB(ctx, e[2], e[3], er, o.angry);
    }
    if (o.dizzy) { ctx.fillStyle = '#ffe066'; for (i = 0; i < 3; i++) { var sa = TAU * (t * 0.5 + i / 3); star4(ctx, 36 + Math.cos(sa) * 40, -262 + Math.sin(sa) * 8, 6); ctx.fill(); } }
    ctx.restore();
  }

  function heroState(t) {
    var h = { cls: 'sword', x: 420, y: GY - 20, f: 1, alpha: 1, stealth: false, inv: false, lean: 0 }, p;
    if (t < 5.3) {
      h.alpha = 1 - seg(t, 4.9, 5.3);
      if (t < 1.6) { h.x = 420; }
      else if (t < 3.0) { p = seg(t, 1.6, 3.0); h.x = lerp(420, 460, p); h.f = -1; h.lean = 0.2; h.y -= Math.abs(Math.sin(TAU * t * 2)) * 3; }
      else if (t < 3.1) { h.x = 460; }
      else if (t < 3.28) { p = seg(t, 3.1, 3.28); h.x = lerp(460, 590, p); h.inv = true; h.lean = 0.22; }
      else h.x = 590;
    } else if (t < 11.0) {
      h.cls = 'hunter'; h.x = 200; h.alpha = Math.min(seg(t, 5.4, 5.8), 1 - seg(t, 10.6, 11.0)); h.stealth = t >= 6.75 && t < 8.0;
    } else {
      h.cls = 'bomber'; h.x = 300; h.alpha = seg(t, 11.0, 11.4);
      if (t >= 12.4) { p = seg(t, 12.4, 13.4); h.x = lerp(300, 520, p); if (p < 1) h.y -= Math.abs(Math.sin(TAU * t * 2.5)) * 3; }
      if (t >= 13.5) h.f = -1;
      for (var i = 0; i < BOMBS.length; i++) if (t >= BOMBS[i] && t < BOMBS[i] + 0.15) h.lean = -0.15;
    }
    return h;
  }

  var ready = false;
  function init() {
    if (ready) return; ready = true;
    for (var i = 0; i < HITS.length; i++) { var w = weakPoint(bossState(HITS[i].t - 0.001)); HITS[i].x = w.x; HITS[i].y = w.y; }
  }
  function mouthWorld(o) { return toWorld(o, 114, -146); }

  function telegraphs(ctx, t) {
    var a, i;
    // 招 1: 吸入範圍
    if (t >= 0.6 && t < 3.0) {
      a = Math.min(seg(t, 0.6, 0.9), 1 - seg(t, 2.8, 3.0));
      stripes(ctx, 250, GY - 150, 360, 150, a);
      for (i = 0; i < 3; i++) arrowHead(ctx, 290 + i * 110 + (t * 110) % 110, GY - 60, 0, a);
    }
    // 招 2: 石彈軌跡 + 落點
    if (t >= 6.0 && t < 7.8) {
      var m = mouthWorld(bossState(6.85));
      for (i = 0; i < 3; i++) {
        a = Math.min(seg(t, 6.0 + i * 0.12, 6.3 + i * 0.12), 1 - seg(t, SPIT[i] + 0.45, SPIT[i] + 0.6));
        if (a <= 0) continue;
        dashCurve(ctx, m.x, m.y, (m.x + SPIT_MK[i]) / 2, GY - 360, SPIT_MK[i], GY - 4, a); landMark(ctx, SPIT_MK[i], GY, 30, a);
      }
    }
    // 招 3: 跳躍落點
    if (t >= 11.6 && t < 13.45) {
      a = Math.min(seg(t, 11.6, 11.9), 1 - seg(t, 13.35, 13.45));
      landMark(ctx, 220, GY, 150, a); dashCurve(ctx, 740, GY - 230, 480, -200, 220, GY - 230, a);
      arrowHead(ctx, 226, GY - 228, Math.PI * 0.62, a);
    }
  }
  function effectsFront(ctx, t, o) {
    var i, ag;
    // 吸入氣流
    if (t >= 1.4 && t < 3.0) {
      var mw = mouthWorld(o), fa = Math.min(seg(t, 1.4, 1.6), 1 - seg(t, 2.85, 3.0));
      ctx.save(); ctx.globalAlpha *= fa; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (i = 0; i < 9; i++) {
        var u = (t * 1.5 + i / 9) % 1, y0 = GY - 20 - hash(i, 4) * 130, x = lerp(240, mw.x - 20, u * u), y = lerp(y0, mw.y, u * u);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 28 * (1 - u), y + (y0 - mw.y) * 0.08); ctx.stroke();
      }
      ctx.restore();
    }
    // 地上素材被吸進嘴
    for (i = 0; i < SUCK.length; i++) {
      var s = SUCK[i];
      if (t < s[0]) { icon(ctx, s[3], s[2], GY - 11 - (t > 0.9 ? Math.abs(Math.sin(TAU * t * 5)) * 2 : 0), 20); continue; }
      if (t < s[1]) { var mq = mouthWorld(bossState(s[1])), p = seg(t, s[0], s[1]), q = p * p; icon(ctx, s[3], lerp(s[2], mq.x, q), lerp(GY - 11, mq.y, q) - Math.sin(p * Math.PI) * 30, 20 * (1 - 0.3 * p)); }
    }
    // 石彈
    for (i = 0; i < SPIT.length; i++) {
      ag = t - SPIT[i];
      var m0 = mouthWorld(bossState(6.85));
      if (ag >= 0 && ag < 0.55) {
        var u2 = ag / 0.55, cx = (m0.x + SPIT_MK[i]) / 2, cy = GY - 360;
        var rx = (1 - u2) * (1 - u2) * m0.x + 2 * (1 - u2) * u2 * cx + u2 * u2 * SPIT_MK[i], ry = (1 - u2) * (1 - u2) * m0.y + 2 * (1 - u2) * u2 * cy + u2 * u2 * (GY - 18);
        blob(ctx, rx, ry, 18, 16, '#c8ccd6', '#5d6680');
      }
      if (ag >= 0.55 && ag < 1.1) callArt(ctx, 'drawPoof', { x: SPIT_MK[i], y: GY - 18, t: ag - 0.55, dur: 0.55, big: false });
    }
    // 劍士: 衝刺速度線、揮砍
    if (t >= 3.1 && t < 3.4) speedLines(ctx, lerp(460, 590, seg(t, 3.1, 3.28)), GY - 20, 1, 1 - seg(t, 3.28, 3.4), 50);
    for (i = 0; i < SLASHES.length; i++) slash(ctx, 590, GY - 20, 1, (t - SLASHES[i]) / 0.15);
    // 獵人自動射箭
    for (i = 0; i < ARROWS.length; i++) {
      ag = t - ARROWS[i];
      if (ag >= 0 && ag < 0.3) {
        var tg = weakPoint(bossState(ARROWS[i] + 0.3)), x0 = 222, y0 = GY - 18, pp = ag / 0.3;
        callArt(ctx, 'drawArrow', { x: lerp(x0, tg.x, pp), y: lerp(y0, tg.y, pp), angle: Math.atan2(tg.y - y0, tg.x - x0) });
      }
    }
    // 炸彈
    for (i = 0; i < BOMBS.length; i++) {
      ag = t - BOMBS[i];
      var bt = weakPoint(bossState(BOMBS[i] + 0.449)), bx0 = 508, by0 = GY - 26;
      if (ag >= 0 && ag < 0.45) { var q2 = ag / 0.45; callArt(ctx, 'drawBomb', { x: lerp(bx0, bt.x, q2), y: lerp(by0, bt.y, q2) - 120 * 4 * q2 * (1 - q2), t: ag }); }
      if (ag >= 0.45 && ag < 0.85) callArt(ctx, 'drawExplosion', { x: bt.x, y: bt.y, t: ag - 0.45, dur: 0.4, radius: 60 });
    }
    // 落地塵
    ag = t - 13.4; if (ag >= 0 && ag < 0.6) { callArt(ctx, 'drawPoof', { x: 120, y: GY - 16, t: ag, dur: 0.6, big: true }); callArt(ctx, 'drawPoof', { x: 330, y: GY - 16, t: ag, dur: 0.6, big: true }); }
    if (o.roar > 0) { var rw = toWorld(o, 40, -200); roar(ctx, rw.x, rw.y, o.roar); }
    for (i = 0; i < 4; i++) { ag = t - (15.8 + i * 0.15); if (ag >= 0 && ag < 0.7) callArt(ctx, 'drawPoof', { x: 220 + (i % 2 ? 70 : -70), y: GY - 90 - (i > 1 ? 50 : 0), t: ag, dur: 0.7, big: true }); }
  }

  function draw(ctx, t) {
    t = Number(t) || 0; t = ((t % D) + D) % D;
    init();
    var boss = bossState(t), hp = hpAt(HITS, t, MAX), hh = heroState(t);
    ctx.save();
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(0, shake(t, [[13.4, 10], [7.45, 3], [7.6, 3], [7.75, 3]]));
    ctx.scale(SC, SC);
    backdrop(ctx, t);
    rock(ctx, 0, GY, WW, WH - GY + 20, 0, 0);
    rock(ctx, -10, 150, 54, GY - 150, 0, 14); rock(ctx, 980, 150, 64, GY - 150, 14, 0);
    telegraphs(ctx, t);
    FLASH = boss.flash; sack(ctx, boss, t, hp); FLASH = false;
    drawHero(ctx, hh);
    effectsFront(ctx, t, boss);
    spray(ctx, HITS, t);
    if (boss.alpha > 0.05) bossBar(ctx, boss.x, GY - boss.lift - 2 * RY * boss.sq - 52, hp, MAX, chipAt(HITS, t), !!boss.weak, TH);
    if (t >= 16.1) { ctx.save(); ctx.globalAlpha *= seg(t, 16.1, 16.5); text(ctx, '擊倒!', WW / 2, 200, 54, '#ffd23f', 'center', true); text(ctx, '→ 進入結局', WW / 2, 250, 22, '#f2f4f8', 'center', true); ctx.restore(); }
    ctx.restore();
    caption(ctx, t, '貪食風囊', STAGES, PH_END, hh.cls);
    var fa = Math.max(1 - t / 0.5, (t - (D - 0.5)) / 0.5);
    if (fa > 0) { ctx.fillStyle = 'rgba(11,13,18,' + clamp(fa, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  window.VISUAL_OPTION = { element: 'final-boss', id: 'C', kind: 'anim', size: [1280, 720], duration: D, loop: true, draw: draw };
})();
