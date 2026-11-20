/* materials 方案 B: 用途代幣 — 每種素材是一枚帶厚邊的代幣, 外框形狀分種類, 正中白色記號畫「拿來做什麼」:
 * 木材 = 圓形 + 斧頭(開路)、石料 = 圓角方 + 鐵鎚(修工程)、時晶 = 六角 + 快轉 ▶▶(加速器)、獸魂 = 盾形 + 向上箭頭(強化)。
 * 外框 + 顏色 + 記號三條通道; 小於 15px 拿掉內圈亮邊, 記號加粗。
 * 只用 Canvas 2D; 情境示意借底版 Art 的地面與擊倒煙; 灰階不是本案的區分通道(靠外框形狀與記號)。 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var ART = (typeof window !== 'undefined' && window.Art) || {};
  var KINDS = ['wood', 'stone', 'time', 'soul'];
  var NAME = { wood: '木材', stone: '石料', time: '時晶', soul: '獸魂' };
  var USE = { wood: '開路・解鎖・招募', stone: '修復工程', time: '回放加速器', soul: '強化角色・只有怪物掉' };
  var SHORT = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var INK = '#141018';
  var COL = {
    wood: '#c8792f', woodLight: '#f3c487', woodDark: '#6e3f16',
    stone: '#8e9aa8', stoneLight: '#dfe5ec', stoneDark: '#4a5360',
    time: '#22b9d0', timeLight: '#b6f4fb', timeDark: '#0e6a7a',
    soul: '#c4409f', soulLight: '#ffb6f2', soulDark: '#6a1c58'
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
  function framePath(ctx, kind, s) {
    if (kind === 'wood') { ctx.beginPath(); ctx.arc(0, 0, 9.6 * s, 0, TAU); }
    else if (kind === 'stone') { rr(ctx, -9.2 * s, -9.2 * s, 18.4 * s, 18.4 * s, 3.6 * s); }
    else if (kind === 'time') {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) { var a = -Math.PI / 2 + i * Math.PI / 3; ctx.lineTo(Math.cos(a) * 10.2 * s, Math.sin(a) * 10.2 * s); }
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.moveTo(-9 * s, -8.6 * s); ctx.quadraticCurveTo(0, -6.4 * s, 9 * s, -8.6 * s);
      ctx.lineTo(9 * s, -0.5 * s); ctx.quadraticCurveTo(8.2 * s, 6.8 * s, 0, 10.2 * s);
      ctx.quadraticCurveTo(-8.2 * s, 6.8 * s, -9 * s, -0.5 * s); ctx.closePath();
    }
  }
  function glyph(ctx, kind, col, bold) {
    var w = bold ? 2.9 : 2.3;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'wood') { // 斧頭: 斜柄 + 單刃
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-4.2, 5.2); ctx.lineTo(2.6, -3.6); ctx.stroke();
      poly(ctx, [0.2, -5.6, 3.4, -6.4, 6.4, -3.2, 5.6, 0.6, 3.2, -1.2]); ctx.fill();
    } else if (kind === 'stone') { // 鐵鎚: 直柄 + 橫頭
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(0, 5.6); ctx.lineTo(0, -1.5); ctx.stroke();
      rr(ctx, -5.6, -6.2, 11.2, 4.6, 1); ctx.fill();
    } else if (kind === 'time') { // 快轉 ▶▶
      poly(ctx, [-5.6, -4.6, 0.4, 0, -5.6, 4.6]); ctx.fill();
      poly(ctx, [-0.2, -4.6, 5.8, 0, -0.2, 4.6]); ctx.fill();
    } else { // 向上箭頭
      poly(ctx, [0, -6.4, 5.6, -0.4, 2.1, -0.4, 2.1, 5.4, -2.1, 5.4, -2.1, -0.4, -5.6, -0.4]); ctx.fill();
    }
  }
  function icon(ctx, kind, cx, cy, sz) {
    var k = sz / 20, detail = sz >= 15;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round';
    // 厚邊(深色) → 面(本色)
    framePath(ctx, kind, 1); ctx.fillStyle = g(COL[kind + 'Dark']); ctx.fill();
    ctx.lineWidth = detail ? 1.5 : 1.8; ctx.strokeStyle = g(INK); ctx.stroke();
    framePath(ctx, kind, detail ? 0.8 : 0.84); ctx.fillStyle = g(COL[kind]); ctx.fill();
    if (detail) { // 面的上緣亮邊
      ctx.save(); framePath(ctx, kind, 0.8); ctx.clip();
      ctx.beginPath(); ctx.ellipse(0, -9.5, 11, 5.2, 0, 0, TAU); ctx.fillStyle = g(COL[kind + 'Light']); ctx.globalAlpha = 0.45; ctx.fill();
      ctx.restore();
    }
    // 記號: 先畫深色落影再畫白
    ctx.save(); ctx.translate(0, 0.9); glyph(ctx, kind, g(COL[kind + 'Dark']), !detail); ctx.restore();
    glyph(ctx, kind, g('#ffffff'), !detail);
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
    element: 'materials', id: 'B', kind: 'static',
    size: [720, 440], duration: 0, loop: false,
    draw: function (ctx, t) { sheet(ctx); }
  };
})();
