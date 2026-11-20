/* materials 方案 A: 扁平剪影 — 四種素材各佔一種外輪廓: 木材 = 橫躺兩根原木(寬)、石料 = 方正砌磚塊(方)、
 * 時晶 = 沙漏形水晶(中間收腰)、獸魂 = 長出兩隻獸耳的魂火(頂端雙尖)。
 * 扁平無漸層、深色粗描邊、每塊只有一面亮色; 小於 15px 拿掉內部紋路, 只留輪廓 + 亮面。
 * 四色依明度排成四階(石料最亮 → 時晶 → 木材 → 獸魂最深), 去色也分得開。
 * 只用 Canvas 2D; 情境示意借底版 Art 的地面與擊倒煙。 */
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
    wood: '#c47a36', woodLight: '#f0c27f', woodDark: '#74441b',
    stone: '#c8d0d9', stoneLight: '#eef2f6', stoneDark: '#6b7582',
    time: '#3fd6ea', timeLight: '#c4f7fc', timeDark: '#168699',
    soul: '#a3308e', soulLight: '#ffb6f2', soulDark: '#5a1650'
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
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function text(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function fillStroke(ctx, fill, lw) { ctx.fillStyle = g(fill); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke(); }

  // ---------- 素材圖示(要搬進遊戲取代 matIcon 的就是這支): 中心 (cx, cy), 外框 sz×sz ----------
  function icon(ctx, kind, cx, cy, sz) {
    var k = sz / 20, detail = sz >= 15;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var lw = detail ? 1.6 : 2;
    if (kind === 'wood') {
      // 後面一根(較短、偏上)
      rr(ctx, -7, -8, 14, 7.5, 3.5); fillStroke(ctx, COL.woodDark, lw);
      ell(ctx, 7, -4.25, 2.6, 3.75); fillStroke(ctx, COL.wood, lw);
      // 前面一根
      rr(ctx, -10, -1.5, 16, 9, 4); fillStroke(ctx, COL.wood, lw);
      if (detail) {
        ctx.beginPath(); ctx.moveTo(-7, 1.6); ctx.lineTo(-1, 1.6); ctx.moveTo(-5, 4.6); ctx.lineTo(1.5, 4.6);
        ctx.strokeStyle = g(COL.woodDark); ctx.lineWidth = 1.1; ctx.stroke();
      }
      ell(ctx, 6.2, 3, 3.4, 4.5); fillStroke(ctx, COL.woodLight, lw);
      if (detail) { ell(ctx, 6.2, 3, 1.4, 2); ctx.strokeStyle = g(COL.woodDark); ctx.lineWidth = 1.1; ctx.stroke(); }
    } else if (kind === 'stone') {
      rr(ctx, -9, -8.5, 18, 17, 2.2); fillStroke(ctx, COL.stone, lw);
      // 上緣亮面
      ctx.beginPath(); ctx.rect(-7.6, -7.2, 15.2, 2.6); ctx.fillStyle = g(COL.stoneLight); ctx.fill();
      // 砌縫: 一道橫縫 + 上下錯開的直縫
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
      ctx.moveTo(-1.5, -8.5); ctx.lineTo(-1.5, 0); ctx.moveTo(3.5, 0); ctx.lineTo(3.5, 8.5);
      if (detail) { ctx.moveTo(-9, 4.3); ctx.lineTo(-5.5, 4.3); }
      ctx.strokeStyle = g(COL.stoneDark); ctx.lineWidth = detail ? 1.3 : 1.8; ctx.stroke();
      rr(ctx, -9, -8.5, 18, 17, 2.2); ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke();
    } else if (kind === 'time') {
      // 沙漏形水晶: 上下兩個倒三角在中間收腰
      var hg = [-6.5, -10, 6.5, -10, 1.3, 0, 6.5, 10, -6.5, 10, -1.3, 0];
      poly(ctx, hg); fillStroke(ctx, COL.time, lw);
      // 左側亮切面
      poly(ctx, [-6.5, -10, -1.5, -10, 0, 0, -1.3, 0]); ctx.fillStyle = g(COL.timeLight); ctx.fill();
      poly(ctx, [-6.5, 10, -1.5, 10, 0, 0, -1.3, 0]); ctx.fill();
      if (detail) {
        // 下半的「沙」: 深一階的小三角
        poly(ctx, [-3.6, 8.6, 3.6, 8.6, 0, 3.8]); ctx.fillStyle = g(COL.timeDark); ctx.fill();
      }
      poly(ctx, hg); ctx.lineWidth = lw; ctx.strokeStyle = g(INK); ctx.stroke();
    } else { // soul: 魂火 + 兩隻獸耳
      ctx.beginPath();
      ctx.moveTo(0, 9.5);
      ctx.bezierCurveTo(6, 9.5, 8.6, 6, 8.4, 1.5);
      ctx.bezierCurveTo(8.2, -2.5, 7.2, -6, 6.4, -10);
      ctx.lineTo(2.4, -5.4);
      ctx.quadraticCurveTo(0, -6.4, -2.4, -5.4);
      ctx.lineTo(-6.4, -10);
      ctx.bezierCurveTo(-7.2, -6, -8.2, -2.5, -8.4, 1.5);
      ctx.bezierCurveTo(-8.6, 6, -6, 9.5, 0, 9.5);
      ctx.closePath(); fillStroke(ctx, COL.soul, lw);
      // 胸口一團亮火
      ell(ctx, 0, 4.6, 3.6, 3); ctx.fillStyle = g(COL.soulLight); ctx.fill();
      // 斜吊的亮眼(獸的眼神)
      ctx.fillStyle = g('#fff1fb');
      poly(ctx, [-5.2, -1.8, -1.4, -0.4, -2, 1.4, -4.8, 0.6]); ctx.fill();
      poly(ctx, [5.2, -1.8, 1.4, -0.4, 2, 1.4, 4.8, 0.6]); ctx.fill();
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
    element: 'materials', id: 'A', kind: 'static',
    size: [720, 440], duration: 0, loop: false,
    draw: function (ctx, t) { sheet(ctx); }
  };
})();
