// map-card 方案 C: 卡片就是一間小工坊 — 每修好一處工程往上蓋一段(骨架 → 牆 → 屋頂 → 彩旗與燈)
(function () {
  var Art = (typeof window !== 'undefined' && window.Art) || {};
  var PAL = Art.palette || {}, TH = Art.themes || {};
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var KINDS = ['wood', 'stone', 'crystal', 'core'];
  function C(k, d) { return PAL[k] || d; }

  // ---------- 共用小工具(與底版 art.js 同寫法) ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function rrSub(ctx, x, y, w, h, r) { // 不 beginPath, 給組合路徑用
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function polySub(ctx, p, ox, oy) { ctx.moveTo(ox + p[0], oy + p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(ox + p[i], oy + p[i + 1]); ctx.closePath(); }
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]); }
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold) { ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : String(s).length * px; }
  function fmt1(v) { v = Math.round((Number(v) || 0) * 10) / 10; return v >= 100 ? String(Math.round(v)) : v.toFixed(1); }
  function mat(ctx, k, x, y, s) { if (Art.icons && Art.icons.mat) Art.icons.mat(ctx, k, x, y, s); }
  function item(ctx, k, x, y, s) { if (Art.icons && Art.icons.item) Art.icons.item(ctx, k, x, y, s); }
  function clsMark(ctx, k, x, y, s) { if (Art.icons && Art.icons.cls) Art.icons.cls(ctx, k, x, y, s); }
  function board(ctx, x, y, w, h, tint) { // 底版 ui A 木板
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = tint; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = C('seam', '#21160e'); ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = C('edge', '#180f09'); ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    ctx.restore();
  }
  function nail(ctx, x, y, fresh) {
    circle(ctx, x, y, 2.6); ctx.fillStyle = fresh ? '#fff1c4' : C('nail', '#d9b47a'); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = C('edge', '#180f09'); ctx.stroke();
  }

  // ---------- 縮圖示意(遊戲裡由 RD 以關卡 × 0.125 疊上, 這裡畫一張代表性的) ----------
  // rep[0] 斷橋、rep[1] 崩梯、rep[2] 堵塞隧道
  function thumb(ctx, x, y, theme, rep) {
    var T = TH[theme] || TH.forest || {}, i;
    var ground = T.inner || '#73502f', cap = T.cap || '#5cbf45', line = T.line || '#2a1a0e';
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip(); ctx.translate(x + 8, y + 8);
    var g = ctx.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, T.sky0 || '#3f6e5e'); g.addColorStop(1, T.sky1 || '#d6c486');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 90);
    ctx.fillStyle = T.far || '#8fae7c'; ctx.beginPath(); ctx.moveTo(0, 90);
    for (i = 0; i <= 8; i++) ctx.lineTo(i * 20, 50 + 7 * Math.sin(i * 1.7 + theme.length));
    ctx.lineTo(160, 90); ctx.closePath(); ctx.fill();
    function blk(bx, by, bw, bh, col) { ctx.fillStyle = col || ground; ctx.fillRect(bx, by, bw, bh); ctx.fillStyle = cap; ctx.fillRect(bx, by, bw, 2); ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1); }
    ctx.fillStyle = '#0b0a0c'; ctx.fillRect(60, 66, 32, 24);
    ctx.fillStyle = C('spikeTip', '#e5484d');
    for (i = 0; i < 8; i++) poly(ctx, [61 + i * 4, 90, 63 + i * 4, 85, 65 + i * 4, 90]), ctx.fill();
    blk(0, 66, 60, 24); blk(92, 66, 68, 24); blk(8, 46, 40, 20); blk(112, 34, 46, 6);
    // 斷橋
    if (rep[0]) { ctx.fillStyle = C('plank', '#d59c57'); ctx.fillRect(58, 66, 36, 3); ctx.fillStyle = C('plankDark', '#8a5a2a'); ctx.fillRect(58, 69, 36, 1); }
    else { ctx.fillStyle = C('plankDark', '#8a5a2a'); ctx.fillRect(58, 66, 6, 3); ctx.fillRect(88, 66, 6, 3); }
    // 崩梯
    if (rep[1]) { for (i = 0; i < 4; i++) blk(96 + i * 4, 58 - i * 8, 4, 8 + i * 8, C('stair', '#cbc1ae')); }
    else { ctx.fillStyle = C('rubbleLight', '#7d8898'); circle(ctx, 100, 63, 3); ctx.fill(); circle(ctx, 105, 64, 2.5); ctx.fill(); circle(ctx, 103, 60, 2); ctx.fill(); }
    // 堵塞隧道
    if (rep[2]) { ctx.fillStyle = '#0b0a0c'; ctx.fillRect(20, 54, 14, 12); }
    else { ctx.fillStyle = C('rubble', '#4e5868'); ctx.fillRect(20, 54, 14, 12); ctx.fillStyle = C('rubbleLight', '#7d8898'); circle(ctx, 24, 58, 2.5); ctx.fill(); circle(ctx, 30, 61, 2.5); ctx.fill(); circle(ctx, 25, 63, 2); ctx.fill(); }
    mat(ctx, 'crystal', 134, 28, 7); mat(ctx, 'wood', 28, 41, 7); mat(ctx, 'stone', 76, 58, 7);
    ctx.fillStyle = '#5a2a2a'; ctx.beginPath(); ctx.ellipse(120, 62, 5, 3.5, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#1a0a0a'; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(150, 50, 1.2, 16); ctx.fillStyle = C('goal', '#ffd23f'); poly(ctx, [151, 50, 158, 52.5, 151, 55]); ctx.fill();
    clsMark(ctx, 'sword', 132, 60, 9);
    ctx.restore();
  }
  // 文字區: 第一行 名稱 + 職業 + 秒數; 第二行 四種產量(壓到左 110px); 右側留給裝置格
  function textRows(ctx, x, y, d, parch) {
    var ink = C('ink', '#2b2118');
    rr(ctx, x + 6, y + 106, 164, 28, 4); ctx.fillStyle = parch; ctx.fill();
    var s = d.idx + ' ' + d.name, nw = tw(ctx, s, 12, true);
    text(ctx, s, x + 11, y + 113.5, 12, ink, 'left', true);
    clsMark(ctx, d.cls, x + 18 + nw, y + 113.5, 12);
    text(ctx, fmt1(d.time) + 's', x + 26 + nw, y + 114, 11, ink, 'left', true);
    for (var i = 0; i < 4; i++) { var k = KINDS[i]; mat(ctx, k, x + 13 + i * 27, y + 126.5, 9); text(ctx, fmt1(d.rates[k]), x + 19 + i * 27, y + 127, 10, ink, 'left', true); }
  }
  // 裝置格兩格(卡片內 (123,108) 與 (146,108), 各 21×24)
  function sockets(ctx, x, y, devs, sty) {
    for (var j = 0; j < 2; j++) {
      var sx = x + 123 + j * 23, sy = y + 108, w = 21, h = 24;
      rr(ctx, sx, sy, w, h, 3); ctx.fillStyle = devs[j] ? sty.full : sty.well; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = sty.rim; ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx + 1.5, sy + 1.5, w - 3, 2);
      if (devs[j]) item(ctx, devs[j], sx + w / 2, sy + h / 2 + 0.5, 17);
      else {
        ctx.setLineDash([2, 2]); rr(ctx, sx + 4, sy + 4.5, w - 8, h - 8, 2); ctx.lineWidth = 1; ctx.strokeStyle = sty.dash; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = sty.dash; ctx.fillRect(sx + w / 2 - 3, sy + h / 2 - 0.5, 6, 1.4); ctx.fillRect(sx + w / 2 - 0.7, sy + h / 2 - 3.2, 1.4, 6);
      }
    }
  }
  function overlay(ctx, x, y, d) {
    if (Art.drawCardOverlay) Art.drawCardOverlay(ctx, { x: x, y: y, speedMul: d.speed || 1, newArea: false, selected: false, replayP: d.p, marks: d.marks });
  }

  // ---------- 方案 C 專屬: 卡片本身是一間小工坊, 修一處蓋一段(骨架 → 牆 → 屋頂 → 彩旗與燈) ----------
  var CARD_TINT = { forest: '#2f3a24', cliff: '#2c3446', mine: '#3a2a1f', salt: '#3a2846' };
  var ROOF = { forest: ['#4f8a3a', '#2f5a24'], cliff: ['#6d7896', '#434b63'], mine: ['#7a5a3a', '#4a3422'], salt: ['#c48aa8', '#7a4e68'] };
  var ROOF_P = [-6, 6, 7, -7, 169, -7, 182, 6]; // 屋頂梯形, 上緣只高出卡片 7px(欄內上下卡片間距 14)
  var RAW = '#a8875e', RAW_D = '#5a4128';
  function off(p, x, y) { return p.map(function (v, k) { return v + (k % 2 ? y : x); }); }
  function drawScaffold(ctx, x, y) {
    ctx.save(); ctx.lineJoin = 'round';
    var poles = [x - 4, x + 176];
    for (var i = 0; i < 2; i++) {
      ctx.fillStyle = RAW; ctx.fillRect(poles[i], y - 11, 4, 151); ctx.lineWidth = 1; ctx.strokeStyle = RAW_D; ctx.strokeRect(poles[i] + 0.5, y - 10.5, 3, 150);
      for (var j = 0; j < 3; j++) { var ly = y + 22 + j * 44; ctx.strokeStyle = '#e0cfa0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(poles[i] - 1, ly - 2); ctx.lineTo(poles[i] + 5, ly + 2); ctx.moveTo(poles[i] + 5, ly - 2); ctx.lineTo(poles[i] - 1, ly + 2); ctx.stroke(); }
    }
    // 頂端腳手架踏板
    ctx.fillStyle = RAW; ctx.fillRect(x - 8, y - 6, 192, 4); ctx.lineWidth = 1; ctx.strokeStyle = RAW_D; ctx.strokeRect(x - 7.5, y - 5.5, 191, 3);
    ctx.restore();
  }
  function drawRoof(ctx, x, y, theme) {
    var c = ROOF[theme] || ROOF.forest, p = off(ROOF_P, x, y);
    ctx.save();
    poly(ctx, p); ctx.fillStyle = c[0]; ctx.fill();
    ctx.save(); poly(ctx, p); ctx.clip();
    ctx.strokeStyle = c[1]; ctx.lineWidth = 1.2;
    for (var row = 0; row < 3; row++) { var ry = y - 7 + row * 4.5 + 4; for (var sx = x - 8 + (row % 2) * 4; sx < x + 186; sx += 8) { ctx.beginPath(); ctx.arc(sx + 4, ry, 4, 0, Math.PI); ctx.stroke(); } }
    ctx.restore();
    poly(ctx, p); ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = C('edge', '#180f09'); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 8, y - 6, 160, 1.5);
    ctx.restore();
  }
  function drawRoofPlan(ctx, x, y) {
    ctx.save(); poly(ctx, off(ROOF_P, x, y)); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(159,196,255,0.85)'; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  function drawSkeleton(ctx, x, y) { // 只有木樑骨架, 牆板還沒釘
    ctx.save();
    rr(ctx, x, y, 176, 136, 4); ctx.fillStyle = '#16120e'; ctx.fill();
    ctx.fillStyle = RAW; ctx.strokeStyle = RAW_D; ctx.lineWidth = 1;
    var bars = [[x, y, 176, 5], [x, y + 131, 176, 5], [x, y, 5, 136], [x + 171, y, 5, 136], [x, y + 101, 176, 4]];
    for (var i = 0; i < bars.length; i++) { var b = bars[i]; ctx.fillRect(b[0], b[1], b[2], b[3]); ctx.strokeRect(b[0] + 0.5, b[1] + 0.5, b[2] - 1, b[3] - 1); }
    // 牆板該在的位置畫施工藍圖虛線
    ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(159,196,255,0.7)'; rr(ctx, x + 1.5, y + 1.5, 173, 133, 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function drawFestive(ctx, x, y) { // 完工: 彩旗串 + 兩盞屋簷燈 + 屋脊金星
    ctx.save();
    var cols = ['#e85a4f', '#ffd84a', '#f3e6c8', '#4fd18b'];
    ctx.lineWidth = 1; ctx.strokeStyle = '#2b2118'; ctx.beginPath(); ctx.moveTo(x + 4, y + 5); ctx.quadraticCurveTo(x + 88, y + 10, x + 172, y + 5); ctx.stroke();
    for (var i = 0; i < 12; i++) {
      var u = (i + 0.5) / 12, fx = x + 4 + 168 * u, fy = y + 5 + 10 * u * (1 - u);
      poly(ctx, [fx - 3.5, fy, fx + 3.5, fy, fx, fy + 6]); ctx.fillStyle = cols[i % 4]; ctx.fill(); ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(20,12,6,0.6)'; ctx.stroke();
    }
    var L = [x - 1, x + 177];
    for (var j = 0; j < 2; j++) {
      var g = ctx.createRadialGradient(L[j], y + 15, 0, L[j], y + 15, 14); g.addColorStop(0, 'rgba(255,190,90,0.55)'); g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g; ctx.fillRect(L[j] - 14, y + 1, 28, 28);
      ctx.fillStyle = '#2b2118'; ctx.fillRect(L[j] - 0.5, y + 5, 1, 5);
      rr(ctx, L[j] - 3.5, y + 10, 7, 9, 2.5); ctx.fillStyle = '#ffb04a'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#5a2a10'; ctx.stroke();
    }
    ctx.fillStyle = C('select', '#ffd84a'); star4(ctx, x + 88, y - 8, 5); ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = C('edge', '#180f09'); ctx.stroke();
    ctx.restore();
  }
  function drawCard(ctx, x, y, d) {
    var r = d.r, tint = CARD_TINT[d.theme] || CARD_TINT.forest;
    ctx.save();
    if (r < 2) drawScaffold(ctx, x, y);
    if (r >= 1) {
      board(ctx, x, y, 176, 136, tint);
      nail(ctx, x + 9, y + 9); nail(ctx, x + 167, y + 9); nail(ctx, x + 9, y + 127); nail(ctx, x + 167, y + 127);
    } else drawSkeleton(ctx, x, y);
    rr(ctx, x + 1.5, y + 1.5, 173, 133, 8); ctx.lineWidth = r >= 1 ? 3 : 2; ctx.strokeStyle = C('goodLight', '#4fd18b'); ctx.stroke();
    ctx.fillStyle = C('edge', '#180f09'); ctx.fillRect(x + 7, y + 7, 162, 92);
    thumb(ctx, x, y, d.theme, d.rep);
    textRows(ctx, x, y, d, C('parch', '#efe3c6'));
    sockets(ctx, x, y, d.devs, { well: '#2a2016', full: '#4a3826', rim: RAW_D, dash: '#d9c7a0' });
    if (r >= 2) drawRoof(ctx, x, y, d.theme); else drawRoofPlan(ctx, x, y);
    ctx.restore();
    overlay(ctx, x, y, d);
    if (r >= 3) drawFestive(ctx, x, y);
  }

  // ---------- 方案頁 ----------
  var REP = [[false, false, false], [false, true, false], [true, true, false], [true, true, true]];
  function marks() { return [{ p: 0.1, kind: 'wood' }, { p: 0.22, kind: 'wood' }, { p: 0.38, kind: 'stone' }, { p: 0.55, kind: 'core' }, { p: 0.7, kind: 'crystal' }, { p: 0.86, kind: 'wood' }]; }
  var BIG = [], SMALL = [];
  var DEV = [[null, null], ['gear', null], ['glove', 'horn'], ['bagWood', 'heart']];
  var THEMES_S = ['forest', 'cliff', 'mine', 'cliff'], NAMES_S = ['野豬谷地', '岩柱塔', '礦車隧道', '吊橋峽谷'], IDX_S = [3, 4, 6, 5], CLS_S = ['sword', 'hunter', 'bomber', 'sword'];
  for (var s = 0; s < 4; s++) {
    BIG.push({ r: s, rep: REP[s], theme: 'forest', idx: 1, name: '林間小徑', cls: 'sword', time: 12.4 - s * 0.8, rates: { wood: 28.1 + s * 3, stone: 9.6 + s * 2, crystal: 4.8 + s * 2.4, core: 2.4 }, devs: DEV[s], p: 0.62, marks: marks(), speed: s === 1 ? 1.25 : 1 });
    SMALL.push({ r: s, rep: REP[s], theme: THEMES_S[s], idx: IDX_S[s], name: NAMES_S[s], cls: CLS_S[s], time: 14.2 + s, rates: { wood: 12.5, stone: 22.6, crystal: 8.1, core: 6.4 }, devs: DEV[(s + 2) % 4], p: 0.3, marks: marks(), speed: 1 });
  }

  window.VISUAL_OPTION = {
    element: 'map-card', id: 'C', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      ctx.save();
      if (Art.drawMapBackground) Art.drawMapBackground(ctx, { t: 0 }); else { ctx.fillStyle = '#14222a'; ctx.fillRect(0, 0, 1280, 720); }
      var cream = C('cream', '#f3e6c8'), dim = C('labelDim', '#c9b896'), i;
      var STEP = ['骨架 + 腳手架', '釘上牆板', '蓋上屋頂', '彩旗與燈, 完工'];
      text(ctx, 'C · 卡片就是一間小工坊: 每修好一處, 就往上蓋一段', 40, 30, 20, cream, 'left', true);
      for (i = 0; i < 4; i++) {
        var zx = 52 + i * 304;
        text(ctx, '修好 ' + i + ' / 3 · ' + STEP[i], zx + 132, 62, 16, i === 3 ? C('goodLight', '#4fd18b') : cream, 'center', true);
        ctx.save(); ctx.translate(zx, 100); ctx.scale(1.5, 1.5); drawCard(ctx, 0, 0, BIG[i]); ctx.restore();
      }
      text(ctx, '實際大小(大地圖上 1:1)', 40, 348, 15, dim, 'left', true);
      for (i = 0; i < 4; i++) drawCard(ctx, 198 + i * 236, 384, SMALL[i]);
      text(ctx, '0 = 只有木樑骨架(牆板位置畫藍圖虛線)+ 兩側腳手架; 1 = 牆板釘上; 2 = 屋頂蓋上、腳手架拆掉; 3 = 屋簷彩旗、兩盞燈點亮、屋脊金星', 40, 568, 14, cream, 'left', false);
      text(ctx, '屋頂只高出卡片 7px(金星 13px), 不壓到上一張卡。右下兩格 = 裝置格: 虛線框 + 「+」= 沒裝; 有裝 = 該裝置圖示', 40, 594, 14, cream, 'left', false);
      ctx.restore();
    }
  };
})();
