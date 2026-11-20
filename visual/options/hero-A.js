/* hero 方案 A: 幾何剪影 — 劍士 = 倒梯形盾身、獵人 = 尖錐斗篷、炸彈工 = 圓桶。
 * 扁平無陰影 + 白描邊(沿用底版「玩家白描邊」); 縮圖時三人各剩一個幾何記號(盾形 / 三角 / 圓)。
 * 只用 Canvas 2D; 有底版 Art 就借它的色票與地面, 沒有也能畫。 */
(function () {
  'use strict';
  var CLS = ['sword', 'hunter', 'bomber'];
  var NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var ROLE = { sword: '近戰揮砍・衝刺斬', hunter: '自動射箭・潛行', bomber: '拋炸彈・震波擊飛' };
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  function P(k, d) { try { if (typeof Art !== 'undefined' && Art.palette && Art.palette[k]) return Art.palette[k]; } catch (e) {} return d; }
  var C = {
    sword: P('sword', '#3d8bfd'), hunter: P('hunter', '#1fbf9a'), bomber: P('bomber', '#f28c28'),
    skin: P('skin', '#f4d2b0'), line: P('outlineHero', '#ffffff'), ink: '#1a1420', pants: '#2b3245',
    gold: P('gold', '#f2c94c'), metal: '#e8eef6', wood: '#8a5a2a', bomb: P('bomb', '#2a2a33'), spark: P('goal', '#ffd23f'),
    lens: P('timeLight', '#b6f4fb'), cape: '#d8434e', hood: '#0f2a24', eye: '#d8fff0'
  };

  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function fs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = C.line; ctx.stroke(); } }
  function legs(ctx, top) {
    ctx.fillStyle = C.pants;
    rr(ctx, -7, top, 5, 20 - top, 1.5); ctx.fill(); rr(ctx, 2, top, 5, 20 - top, 1.5); ctx.fill();
  }

  // 主角本體: 原點 = 判定框中心, 單位 = 遊戲 px, 判定框 28×40(x ±14, y ±20)。f = 面向
  function hero(ctx, cls, f) {
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      // 紅披風(背後)
      poly(ctx, [-4, -6, -13, 15, -5, 17, 2, -4]); fs(ctx, C.cape, 0);
      legs(ctx, 13);
      // 倒梯形盾身: 寬肩窄腰
      poly(ctx, [-13, -6, 13, -6, 7, 14, -7, 14]); fs(ctx, C.sword, 2);
      ctx.fillStyle = C.gold; ctx.fillRect(-7, 8, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [-2, -4, 2, -4, 0, 4]); ctx.fill();
      // 方盔 + 眼縫 + 金羽
      poly(ctx, [-8, -13, -15, -19, -12, -11]); fs(ctx, C.gold, 0);
      rr(ctx, -8, -20, 16, 14, 3); fs(ctx, C.sword, 2);
      ctx.fillStyle = C.ink; ctx.fillRect(-1, -15, 8, 3);
      // 直立長劍(面前)
      poly(ctx, [10, -19, 12, -22, 14, -19, 14, -3, 10, -3]); fs(ctx, C.metal, 0);
      ctx.lineWidth = 1; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.fillStyle = C.gold; ctx.fillRect(7, -3.5, 10, 3);
      ctx.fillStyle = C.wood; ctx.fillRect(11, -0.5, 2, 5);
      circ(ctx, 12, 3, 2.6); fs(ctx, C.skin, 0);
    } else if (cls === 'hunter') {
      // 箭袋(背後, 羽毛露出肩後)
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(-0.35);
      ctx.fillStyle = C.wood; ctx.fillRect(-3, -6, 6, 14);
      ctx.fillStyle = C.eye; poly(ctx, [-3, -6, -1, -12, 1, -6]); ctx.fill(); poly(ctx, [0, -6, 2.5, -11, 3.5, -6]); ctx.fill();
      ctx.restore();
      legs(ctx, 14);
      // 尖錐斗篷: 一整個三角形, 尖端就是兜帽頂
      poly(ctx, [0, -20, 13, 15, -13, 15]); fs(ctx, C.hunter, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [0, -20, -13, 15, -5, 15]); ctx.fill();
      // 兜帽陰影臉, 只露兩點亮眼
      poly(ctx, [-1, -13, 7, -9, 6, -4, -3, -4]); ctx.fillStyle = C.hood; ctx.fill();
      circ(ctx, 2, -8, 1.3); ctx.fillStyle = C.eye; ctx.fill(); circ(ctx, 5, -7.6, 1.3); ctx.fill();
      // 斗篷扣
      circ(ctx, 0, 0, 2); ctx.fillStyle = C.gold; ctx.fill();
      // 弓(面前)+ 搭箭
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
      // 圓桶身
      circ(ctx, 0, 5, 12); fs(ctx, C.bomber, 2);
      // 斜背炸彈帶
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(8, 13); ctx.stroke();
      for (var i = 0; i < 3; i++) { circ(ctx, -5 + i * 5, 1.5 + i * 4.4, 2.2); ctx.fillStyle = C.bomb; ctx.fill(); }
      // 圓頭 + 圓帽 + 大護目鏡
      circ(ctx, 0, -11, 8); fs(ctx, C.skin, 1.8);
      ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.closePath(); fs(ctx, C.bomber, 0);
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-8, -12.5, 16, 2.6);
      circ(ctx, 1, -11.2, 3.1); fs(ctx, C.lens, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circ(ctx, 6.4, -11.2, 3.1); fs(ctx, C.lens, 0); ctx.stroke();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -6.5, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      // 手上炸彈 + 引信火花
      circ(ctx, 12, 3, 5.5); ctx.fillStyle = C.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.line; ctx.stroke();
      ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.quadraticCurveTo(15, -6, 17, -6); ctx.stroke();
      ctx.fillStyle = C.spark; poly(ctx, [17, -10, 18, -7, 21, -6, 18, -5, 17, -2, 16, -5, 13, -6, 16, -7]); ctx.fill();
    }
    ctx.restore();
  }

  // 縮圖記號(大地圖 1/8): 原點 = 腳底中心, 單位 = 螢幕 px。只剩幾何外形 + 職業色 + 1px 白框
  function thumb(ctx, cls) {
    ctx.save(); ctx.lineJoin = 'round';
    if (cls === 'sword') poly(ctx, [-4.5, -9.5, 4.5, -9.5, 4.5, -4.5, 0, 0, -4.5, -4.5]);
    else if (cls === 'hunter') poly(ctx, [0, -10.5, 5, 0, -5, 0]);
    else circ(ctx, 0, -4.8, 4.8);
    ctx.fillStyle = C[cls]; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.line; ctx.stroke();
    ctx.restore();
  }

  // ---------- 方案頁版面(三方案共用同一套版面, 只換主角畫法) ----------
  function label(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function ground(ctx, x0, x1, top) {
    var ok = false;
    try { if (typeof Art !== 'undefined' && Art.drawGround) { for (var x = x0; x < x1; x += 40) Art.drawGround(ctx, { x: x + 20, y: top + 20, top: true, theme: 'plain' }); ok = true; } } catch (e) { ok = false; }
    if (!ok) { ctx.fillStyle = '#7b5a3c'; ctx.fillRect(x0, top, x1 - x0, 40); ctx.fillStyle = '#63c35a'; ctx.fillRect(x0, top, x1 - x0, 10); }
  }
  function scene(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, 400); g.addColorStop(0, P('bg', '#1a2233')); g.addColorStop(1, P('bgLow', '#273149'));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 720, 400);
    label(ctx, '×3 檢視(虛線 = 判定框 28×40, 三人同框)', 16, 18, 12, '#9aa4b8');
    ctx.fillStyle = '#2f3a52'; ctx.fillRect(40, 215, 640, 3);
    for (var i = 0; i < 3; i++) {
      var cls = CLS[i], cx = 140 + 220 * i;
      ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.strokeRect(cx - 42, 95, 84, 120); ctx.restore();
      ctx.save(); ctx.translate(cx, 155); ctx.scale(3, 3); hero(ctx, cls, 1); ctx.restore();
      label(ctx, NAME[cls], cx, 238, 18, C[cls], 'center', true);
      label(ctx, ROLE[cls], cx, 258, 12, '#9aa4b8', 'center');
    }
    ctx.fillStyle = '#3c4860'; ctx.fillRect(16, 276, 688, 1);
    // 遊戲內 1×
    label(ctx, '遊戲內 1×', 20, 292, 12, '#9aa4b8');
    ctx.save(); ctx.beginPath(); ctx.rect(20, 300, 290, 92); ctx.clip();
    ground(ctx, 20, 320, 360);
    for (i = 0; i < 3; i++) { ctx.save(); ctx.translate(70 + 90 * i, 340); hero(ctx, CLS[i], i === 2 ? -1 : 1); ctx.restore(); }
    ctx.restore();
    // 大地圖縮圖 1/8
    label(ctx, '大地圖縮圖 1/8', 334, 292, 12, '#9aa4b8');
    ctx.fillStyle = P('mapBg', '#15242a'); ctx.fillRect(334, 300, 170, 92);
    ctx.fillStyle = P('bg', '#1a2233'); ctx.fillRect(340, 306, 158, 80);
    ctx.fillStyle = '#7b5a3c'; ctx.fillRect(340, 372, 158, 14); ctx.fillStyle = '#63c35a'; ctx.fillRect(340, 372, 158, 2);
    ctx.fillStyle = '#7b5a3c'; ctx.fillRect(420, 352, 40, 6); ctx.fillStyle = '#63c35a'; ctx.fillRect(420, 352, 40, 1.5);
    ctx.save(); ctx.translate(372, 372); thumb(ctx, 'sword'); ctx.restore();
    ctx.save(); ctx.translate(438, 352); thumb(ctx, 'hunter'); ctx.restore();
    ctx.save(); ctx.translate(478, 372); thumb(ctx, 'bomber'); ctx.restore();
    // 縮圖放大 ×4
    label(ctx, '縮圖記號放大 ×4', 528, 292, 12, '#9aa4b8');
    ctx.fillStyle = P('bg', '#1a2233'); ctx.fillRect(528, 300, 176, 92);
    for (i = 0; i < 3; i++) { ctx.save(); ctx.translate(562 + 54 * i, 382); ctx.scale(4, 4); thumb(ctx, CLS[i]); ctx.restore(); }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'hero', id: 'A', kind: 'static',
    size: [720, 400], duration: 0, loop: false,
    draw: function (ctx, t) { scene(ctx); }
  };
})();
