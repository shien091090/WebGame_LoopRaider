// map-card 方案 A: 邊框缺角裂開 — 每修好一處工程, 就用一塊新木板 + 亮釘補上一個缺口
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

  // ---------- 方案 A 專屬: 三個缺口(依修好數量, 從右側 → 右下 → 左上 依序補上) ----------
  var CARD_TINT = { forest: '#2f3a24', cliff: '#2c3446', mine: '#3a2a1f', salt: '#3a2846' };
  var BITES = [
    { // 右側邊框咬掉一段
      p: [178, 26, 172, 30, 169.5, 38, 173, 45, 169, 53, 171, 61, 168.5, 69, 172, 76, 178, 82],
      crack: [[168, 50, 159, 46, 151, 52, 141, 48], [159, 46, 156, 38]],
      nails: [[172.5, 36], [172.5, 70]]
    },
    { // 右下角崩掉
      p: [178, 108, 173, 113, 171, 121, 170.5, 128, 166, 133, 158, 134.6, 150, 134.2, 142, 138, 178, 138],
      crack: [[171, 111, 167, 104, 161, 97, 154, 92], [167, 104, 172, 99]],
      nails: [[170, 128], [152, 132]]
    },
    { // 左上角斷一大塊
      p: [-2, -2, 36, -2, 30, 3, 23, 2, 16, 6, 10, 4.5, 6.5, 10, 4.5, 16, 6, 23, 2.5, 30, -2, 36],
      crack: [[9, 9, 18, 16, 25, 17, 33, 26], [18, 16, 16, 25], [25, 17, 30, 12]],
      nails: [[8, 7], [4.5, 24]]
    }
  ];
  function drawCard(ctx, x, y, d) {
    var r = d.r, i, b, tint = CARD_TINT[d.theme] || CARD_TINT.forest;
    ctx.save();
    // 1) 卡片本體剪掉還沒修的缺口(真的缺一塊, 看得到地圖底)
    ctx.beginPath(); ctx.rect(x - 10, y - 10, 196, 156);
    for (i = r; i < 3; i++) polySub(ctx, BITES[i].p, x, y);
    ctx.clip('evenodd');
    board(ctx, x, y, 176, 136, tint);
    // 角釘(只在沒被咬掉的角)
    nail(ctx, x + 9, y + 9); nail(ctx, x + 167, y + 9); nail(ctx, x + 9, y + 127); nail(ctx, x + 167, y + 127);
    // 2) 已修好的缺口: 新木板補丁 + 亮釘(補丁色比舊框亮, 一眼數得出補了幾塊)
    for (i = 0; i < r; i++) {
      b = BITES[i];
      ctx.save(); rr(ctx, x, y, 176, 136, 8); ctx.clip();
      poly(ctx, b.p.map(function (v, k) { return v + (k % 2 ? y : x); }));
      ctx.fillStyle = C('plank', '#d59c57'); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(138,90,42,0.7)';
      for (var gy = -2; gy < 140; gy += 4) { ctx.beginPath(); ctx.moveTo(x - 2, y + gy); ctx.lineTo(x + 180, y + gy + 1.5); ctx.stroke(); }
      ctx.restore();
      poly(ctx, b.p.map(function (v, k) { return v + (k % 2 ? y : x); }));
      ctx.save(); rr(ctx, x, y, 176, 136, 8); ctx.clip(); ctx.lineWidth = 1.6; ctx.strokeStyle = C('plankDark', '#8a5a2a'); ctx.stroke(); ctx.restore();
      for (var n = 0; n < b.nails.length; n++) nail(ctx, x + b.nails[n][0], y + b.nails[n][1], true);
    }
    // 已過關綠框(被缺口截斷; 全修好才是一整圈)
    rr(ctx, x + 1.5, y + 1.5, 173, 133, 8); ctx.lineWidth = 3; ctx.strokeStyle = C('goodLight', '#4fd18b'); ctx.stroke();
    ctx.fillStyle = C('edge', '#180f09'); ctx.fillRect(x + 7, y + 7, 162, 92);
    thumb(ctx, x, y, d.theme, d.rep);
    textRows(ctx, x, y, d, C('parch', '#efe3c6'));
    sockets(ctx, x, y, d.devs, { well: '#3a2a1f', full: '#5a4330', rim: '#180f09', dash: '#d9c7a0' });
    ctx.restore();
    overlay(ctx, x, y, d);
    // 3) 未修缺口: 生木斷面(淺色鋸齒邊)+ 裂痕延伸進縮圖 / 紙牌
    ctx.save();
    for (i = r; i < 3; i++) {
      b = BITES[i];
      ctx.save(); rr(ctx, x - 1, y - 1, 178, 138, 9); ctx.clip();
      poly(ctx, b.p.map(function (v, k) { return v + (k % 2 ? y : x); }));
      ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = '#a07a50'; ctx.stroke();
      ctx.lineWidth = 0.8; ctx.strokeStyle = '#2a1a0e'; ctx.stroke();
      ctx.restore();
      for (var c = 0; c < b.crack.length; c++) {
        var q = b.crack[c];
        ctx.beginPath(); ctx.moveTo(x + q[0], y + q[1]); for (var m = 2; m < q.length; m += 2) ctx.lineTo(x + q[m], y + q[m + 1]);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(10,6,4,0.9)'; ctx.stroke();
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,230,190,0.35)'; ctx.stroke();
      }
    }
    // 全修好: 四角各一顆小金星, 表示這張卡「完整了」
    if (r >= 3) { ctx.save(); ctx.fillStyle = C('select', '#ffd84a'); star4(ctx, x + 3, y + 3, 5); ctx.fill(); star4(ctx, x + 173, y + 3, 5); ctx.fill(); star4(ctx, x + 3, y + 133, 4); ctx.fill(); star4(ctx, x + 173, y + 133, 4); ctx.fill(); ctx.restore(); }
    ctx.restore();
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
    element: 'map-card', id: 'A', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      ctx.save();
      if (Art.drawMapBackground) Art.drawMapBackground(ctx, { t: 0 }); else { ctx.fillStyle = '#14222a'; ctx.fillRect(0, 0, 1280, 720); }
      var cream = C('cream', '#f3e6c8'), dim = C('labelDim', '#c9b896'), i;
      text(ctx, 'A · 邊框缺角裂開: 每修好一處工程, 就補上一塊新木板', 40, 30, 20, cream, 'left', true);
      for (i = 0; i < 4; i++) {
        var zx = 52 + i * 304;
        text(ctx, '修好 ' + i + ' / 3', zx + 132, 66, 16, i === 3 ? C('goodLight', '#4fd18b') : cream, 'center', true);
        ctx.save(); ctx.translate(zx, 86); ctx.scale(1.5, 1.5); drawCard(ctx, 0, 0, BIG[i]); ctx.restore();
      }
      text(ctx, '實際大小(大地圖上 1:1)', 40, 340, 15, dim, 'left', true);
      for (i = 0; i < 4; i++) drawCard(ctx, 198 + i * 236, 372, SMALL[i]);
      text(ctx, '缺口 = 真的缺一塊(看得到地圖底)+ 生木斷面 + 裂痕伸進縮圖; 修好 = 淺色新木板 + 亮釘補回原形; 3 處全修 = 綠框連成一整圈 + 四角金星', 40, 556, 14, cream, 'left', false);
      text(ctx, '右下兩格 = 裝置格: 虛線框 + 「+」= 沒裝裝置; 有裝 = 該裝置圖示。原「工程 N/3」文字拿掉, 產量列壓到左側 110px', 40, 582, 14, cream, 'left', false);
      ctx.restore();
    }
  };
})();
