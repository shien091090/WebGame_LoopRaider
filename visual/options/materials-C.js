/* materials 方案 C: 立體寶物 — 3/4 斜俯視、有明暗面的「撿到會開心」的寶物; 凡物與魔物用材質分兩群:
 * 木材 = 麻繩綁的三根原木堆、石料 = 切好的等角石方(三面明暗) → 霧面、不發光;
 * 時晶 = 一大兩小的青色晶簇、獸魂 = 帶黃色獸眼的魂火球 → 自帶光暈(會發光的才是魔法素材)。
 * 小於 15px 拿掉繩、年輪、星光與光暈, 只留輪廓與三面明暗。
 * 只用 Canvas 2D(漸層用 createLinearGradient / createRadialGradient, 不用 shadowBlur 與合成模式)。 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var ART = (typeof window !== 'undefined' && window.Art) || {};
  var KINDS = ['wood', 'stone', 'time', 'soul'];
  var NAME = { wood: '木材', stone: '石料', time: '時晶', soul: '獸魂' };
  var USE = { wood: '開路・解鎖・招募', stone: '修復工程', time: '回放加速器', soul: '強化角色・只有怪物掉' };
  var SHORT = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var INK = '#1a1420';
  var COL = {
    wood: '#b8682a', woodLight: '#f2c88c', woodDark: '#6a3a14',
    stone: '#a9b3be', stoneLight: '#e6ebf0', stoneDark: '#5e6874',
    time: '#3fd6ea', timeLight: '#d2fbff', timeDark: '#137c90',
    soul: '#d94bc6', soulLight: '#ffc6f4', soulDark: '#6e1a62'
  };

  // ---------- 去色(灰階檢查用; 不用合成模式, 直接換色) ----------
  var MONO = false;
  function g(col) {
    if (!MONO) return col;
    var r, gg, b, a = 1, m = /^#([0-9a-f]{6})$/i.exec(col);
    if (m) { var n = parseInt(m[1], 16); r = n >> 16; gg = (n >> 8) & 255; b = n & 255; }
    else { m = /rgba?\(([^)]+)\)/.exec(col); if (!m) return col; var p = m[1].split(','); r = +p[0]; gg = +p[1]; b = +p[2]; a = p.length > 3 ? +p[3] : 1; }
    var y = Math.round(0.299 * r + 0.587 * gg + 0.114 * b);
    return 'rgba(' + y + ',' + y + ',' + y + ',' + a + ')';
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function text(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function fillStroke(ctx, fill, lw) { ctx.fillStyle = g(fill); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke(); }

  // ---------- 素材圖示(要搬進遊戲取代 matIcon 的就是這支): 中心 (cx, cy), 外框 sz×sz ----------
  function lin(ctx, x0, y0, x1, y1, stops) {
    var gr = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], g(stops[i + 1]));
    return gr;
  }
  function rad(ctx, x, y, r0, r1, stops) {
    var gr = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (var i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], g(stops[i + 1]));
    return gr;
  }
  function sparkle(ctx, x, y, r) {
    poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]);
    ctx.fillStyle = g('#ffffff'); ctx.fill();
  }
  function crystal(ctx, sx, rot, lw) { // 側邊小晶(往外斜)
    ctx.save(); ctx.translate(sx, 5.2); ctx.rotate(rot);
    poly(ctx, [0, -7.4, 2.4, -4.4, 2.4, 2.6, -2.4, 2.6, -2.4, -4.4]);
    ctx.fillStyle = lin(ctx, -2.4, 0, 2.4, 0, [0, COL.timeLight, 0.5, COL.time, 1, COL.timeDark]); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke();
    ctx.restore();
  }
  function icon(ctx, kind, cx, cy, sz) {
    var k = sz / 20, detail = sz >= 15, lw = detail ? 1.5 : 1.9, i;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (kind === 'wood') {
      ctx.translate(-0.4, 0.9);
      var ends = [[-0.8, 3.6], [6.8, 3.6], [3, -3.2]], dx = -5.2, dy = -2.2, R = 3.5;
      // 樹幹(粗線 + 圓頭): 先描邊再填色
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(ends[i][0], ends[i][1]); ctx.lineTo(ends[i][0] + dx, ends[i][1] + dy);
        ctx.lineWidth = R * 2 + lw * 2; ctx.strokeStyle = g(INK); ctx.stroke();
        ctx.lineWidth = R * 2; ctx.strokeStyle = lin(ctx, 0, ends[i][1] - R, 0, ends[i][1] + R, [0, COL.wood, 1, COL.woodDark]); ctx.stroke();
      }
      if (detail) { // 麻繩
        ctx.beginPath(); ctx.moveTo(-1.6, -7.2); ctx.lineTo(-3.8, 6.4);
        ctx.lineWidth = 1.6; ctx.strokeStyle = g('#e7d39a'); ctx.stroke();
      }
      // 斷面 + 年輪
      for (i = 0; i < 3; i++) {
        ell(ctx, ends[i][0], ends[i][1], R * 0.86, R);
        ctx.fillStyle = rad(ctx, ends[i][0] - 0.8, ends[i][1] - 1, 0.3, R, [0, '#fff0cf', 1, COL.woodLight]); ctx.fill();
        ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke();
        if (detail) { ell(ctx, ends[i][0], ends[i][1], R * 0.4, R * 0.48); ctx.lineWidth = 0.9; ctx.strokeStyle = g(COL.woodDark); ctx.stroke(); }
      }
    } else if (kind === 'stone') {
      poly(ctx, [0, -9.4, 9, -4.7, 0, 0, -9, -4.7]); ctx.fillStyle = lin(ctx, 0, -9.4, 0, 0, [0, '#ffffff', 1, COL.stoneLight]); ctx.fill();
      poly(ctx, [-9, -4.7, 0, 0, 0, 9.6, -9, 4.9]); ctx.fillStyle = g(COL.stone); ctx.fill();
      poly(ctx, [0, 0, 9, -4.7, 9, 4.9, 0, 9.6]); ctx.fillStyle = g(COL.stoneDark); ctx.fill();
      // 內稜
      ctx.beginPath(); ctx.moveTo(-9, -4.7); ctx.lineTo(0, 0); ctx.lineTo(9, -4.7); ctx.moveTo(0, 0); ctx.lineTo(0, 9.6);
      ctx.lineWidth = detail ? 0.9 : 1.2; ctx.strokeStyle = g('rgba(26,20,32,0.7)'); ctx.stroke();
      if (detail) { // 鑿痕
        ctx.beginPath(); ctx.moveTo(-6.4, 0.2); ctx.lineTo(-3.4, 2.4); ctx.lineTo(-4.6, 5.2);
        ctx.moveTo(3.2, 2.2); ctx.lineTo(6, 0.8);
        ctx.lineWidth = 0.9; ctx.strokeStyle = g(COL.stoneDark); ctx.stroke();
      }
      poly(ctx, [0, -9.4, 9, -4.7, 9, 4.9, 0, 9.6, -9, 4.9, -9, -4.7]); ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke();
    } else if (kind === 'time') {
      if (detail) { circle(ctx, 0, 1, 12.5); ctx.fillStyle = rad(ctx, 0, 1, 2, 12.5, [0, 'rgba(63,214,234,0.55)', 1, 'rgba(63,214,234,0)']); ctx.fill(); }
      crystal(ctx, -5.6, -0.5, lw); crystal(ctx, 5.6, 0.5, lw);
      // 主晶: 左亮右暗
      var m = [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, -3.8, 6, -3.8, -6];
      poly(ctx, m); ctx.fillStyle = g(COL.time); ctx.fill();
      poly(ctx, [0, -10.4, 0, 9.4, -3.8, 6, -3.8, -6]); ctx.fillStyle = g(COL.timeLight); ctx.fill();
      poly(ctx, [0, -10.4, 3.8, -6, 3.8, 6, 0, 9.4, 1.4, 6, 1.4, -6]); ctx.fillStyle = g(COL.timeDark); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
      poly(ctx, m); ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke();
      if (detail) sparkle(ctx, -6.4, -6.4, 2.6);
    } else { // soul: 魂火球 + 獸眼
      if (detail) { circle(ctx, 0, 1.5, 12.5); ctx.fillStyle = rad(ctx, 0, 1.5, 2, 12.5, [0, 'rgba(230,90,212,0.55)', 1, 'rgba(230,90,212,0)']); ctx.fill(); }
      ctx.beginPath();
      ctx.moveTo(0.6, -10.4);
      ctx.bezierCurveTo(2.4, -6.4, 7.6, -4.4, 7.6, 2.4);
      ctx.bezierCurveTo(7.6, 6.8, 4.2, 9.6, 0, 9.6);
      ctx.bezierCurveTo(-4.2, 9.6, -7.6, 6.8, -7.6, 2.4);
      ctx.bezierCurveTo(-7.6, -1.6, -5, -3.4, -3.6, -6.2);
      ctx.quadraticCurveTo(-2.6, -3.4, -1.2, -3.8);
      ctx.quadraticCurveTo(-1.6, -7.6, 0.6, -10.4);
      ctx.closePath();
      ctx.fillStyle = rad(ctx, -1.6, 1.4, 0.5, 9.6, [0, COL.soulLight, 0.45, COL.soul, 1, COL.soulDark]); ctx.fill();
      ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke();
      ctx.fillStyle = g('#ffe14a');
      poly(ctx, [-5, 1.2, -1.2, 2.4, -1.6, 4.2, -4.6, 3.4]); ctx.fill();
      poly(ctx, [5, 1.2, 1.2, 2.4, 1.6, 4.2, 4.6, 3.4]); ctx.fill();
      if (detail) sparkle(ctx, 5.6, -6, 2.2);
    }
    ctx.restore();
  }

  // ---------- 展示頁(三個方案共用同一套版面, 只換圖示) ----------
  function sheet(ctx) {
    var W = 720, H = 440, i, k;
    ctx.save();
    ctx.fillStyle = '#121927'; ctx.fillRect(0, 0, W, H);
    for (i = 0; i < 4; i++) {
      k = KINDS[i]; var x = 90 + i * 180;
      rr(ctx, x - 82, 8, 164, 236, 10); ctx.fillStyle = '#1b2436'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = '#2c3850'; ctx.stroke();
      icon(ctx, k, x, 60, 72);
      text(ctx, NAME[k], x, 116, 17, COL[k + 'Light'], 'center', true);
      text(ctx, USE[k], x, 136, 11, '#9aa4b8', 'center', false);
      // 縮小梯
      var sizes = [32, 22, 18, 12], sx = x - 60;
      for (var j = 0; j < sizes.length; j++) {
        var s = sizes[j];
        icon(ctx, k, sx + s / 2, 178, s);
        text(ctx, String(s), sx + s / 2, 202, 10, sizes[j] === 18 ? '#ffd84a' : '#6f7a90', 'center', sizes[j] === 18);
        sx += s + 10;
      }
      // 去色
      text(ctx, '去色', x - 70, 226, 10, '#6f7a90', 'left', false);
      MONO = true;
      icon(ctx, k, x - 14, 226, 26); icon(ctx, k, x + 22, 226, 18);
      MONO = false;
    }
    // 資訊列(照遊戲版位: 圖示 22、持有數 18、產量 11、用途 10)
    rr(ctx, 8, 252, 704, 40, 4); ctx.fillStyle = 'rgba(10,14,24,0.95)'; ctx.fill();
    var stock = [128, 46, 17, 9], rate = ['+12.5', '+4.1', '+2.0', '+1.0'];
    for (i = 0; i < 4; i++) {
      k = KINDS[i]; var x0 = 14 + i * 176;
      icon(ctx, k, x0 + 18, 272, 22);
      text(ctx, String(stock[i]), x0 + 34, 273, 18, '#f2f4f8', 'left', true);
      text(ctx, rate[i] + '/分', x0 + 96, 265, 11, COL[k + 'Light'], 'left', false);
      text(ctx, SHORT[k], x0 + 96, 281, 10, '#9aa4b8', 'left', false);
    }
    // 關卡: 地上可撿 + 打怪掉落
    ctx.save();
    ctx.beginPath(); ctx.rect(8, 300, 344, 132); ctx.clip();
    ctx.fillStyle = '#1a2233'; ctx.fillRect(8, 300, 344, 132);
    if (ART.drawGround) { for (i = 0; i < 9; i++) ART.drawGround(ctx, { x: 28 + i * 40, y: 412, top: true, theme: 'plain' }); }
    else { ctx.fillStyle = '#63c35a'; ctx.fillRect(8, 392, 344, 10); ctx.fillStyle = '#7b5a3c'; ctx.fillRect(8, 402, 344, 30); }
    icon(ctx, 'wood', 52, 370, 19); icon(ctx, 'stone', 96, 370, 19); icon(ctx, 'time', 140, 370, 19);
    if (ART.drawPoof) ART.drawPoof(ctx, { x: 262, y: 372, t: 0.12, dur: 0.5, big: false });
    icon(ctx, 'wood', 236, 340, 19); icon(ctx, 'wood', 256, 328, 19); icon(ctx, 'soul', 284, 336, 19);
    text(ctx, '地上可撿', 96, 314, 10, '#9aa4b8', 'center', false);
    text(ctx, '打怪掉落(野豬)', 262, 314, 10, '#9aa4b8', 'center', false);
    ctx.restore();
    // 大地圖: 卡片產量 + 飛行素材
    ctx.save();
    ctx.beginPath(); ctx.rect(360, 300, 352, 132); ctx.clip();
    ctx.fillStyle = '#15242a'; ctx.fillRect(360, 300, 352, 132);
    rr(ctx, 368, 308, 176, 40, 5); ctx.fillStyle = '#1f2d3a'; ctx.fill(); ctx.strokeStyle = '#4fd18b'; ctx.lineWidth = 1.5; ctx.stroke();
    var rates = ['12.5', '4.1', '2.0', '1.0'];
    for (i = 0; i < 4; i++) { icon(ctx, KINDS[i], 380 + i * 42, 334, 11); text(ctx, rates[i], 388 + i * 42, 334, 10, '#f2f4f8', 'left', false); }
    text(ctx, '卡片產量(11px)', 376, 318, 10, '#9aa4b8', 'left', false);
    // 飛行素材: 圖示 18 + 3 顆漸淡拖尾
    var fl = [['time', 404, 410, -1, 1], ['soul', 470, 384, -1, 1]];
    for (i = 0; i < fl.length; i++) {
      for (var n = 3; n >= 1; n--) {
        ctx.save(); ctx.globalAlpha = 0.55 * Math.pow(0.6, n - 1);
        icon(ctx, fl[i][0], fl[i][1] + fl[i][3] * n * 9, fl[i][2] + fl[i][4] * n * 7, 18 * Math.pow(0.82, n));
        ctx.restore();
      }
      icon(ctx, fl[i][0], fl[i][1], fl[i][2], 18);
    }
    text(ctx, '飛向資訊列', 430, 426, 10, '#9aa4b8', 'left', false);
    // 面板花費(不足的那種變紅)
    rr(ctx, 556, 312, 148, 112, 6); ctx.fillStyle = '#253045'; ctx.fill(); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, '斷橋・捷徑', 630, 332, 13, '#43d3ff', 'center', true);
    icon(ctx, 'stone', 588, 362, 20); text(ctx, '15', 601, 363, 16, '#f2f4f8', 'left', true);
    icon(ctx, 'time', 642, 362, 20); text(ctx, '3', 655, 363, 16, '#ff5a5a', 'left', true);
    text(ctx, '面板花費(不足變紅)', 630, 404, 10, '#9aa4b8', 'center', false);
    ctx.restore();
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'materials', id: 'C', kind: 'static',
    size: [720, 440], duration: 0, loop: false,
    draw: function (ctx, t) { sheet(ctx); }
  };
})();
