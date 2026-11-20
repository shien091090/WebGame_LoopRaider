/* hero 方案 B: 大頭 Q 版 + 招牌大武器 — 三人身體比例完全相同, 靠超大的武器與配件撐出不同剪影:
 * 劍士扛巨劍過肩、獵人立著比人還高的長弓、炸彈工雙手抱一顆大炸彈。上色有一階陰影(賽璐璐)。
 * 縮圖時改畫「職業色地圖釘 + 白色武器記號」, 和大地圖的關卡標記同一種讀法。 */
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
    gold: P('gold', '#f2c94c'), metal: '#e8eef6', metalDk: '#9aa8b8', wood: '#8a5a2a', bomb: P('bomb', '#2a2a33'),
    spark: P('goal', '#ffd23f'), lens: P('timeLight', '#b6f4fb'), scarf: '#d8434e', hair: '#5a3a22',
    mask: '#13574a', apron: '#6b3d1c', feather: '#f3ead8'
  };
  var LW = 2.4;

  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  // 填色 + 背側一階陰影 + 白描邊(路徑先建好再呼叫)
  function cel(ctx, fill, lw, shadeX) {
    ctx.fillStyle = fill; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(10,14,30,0.22)'; ctx.fillRect(-40, -40, 40 + (shadeX || -3), 80); ctx.restore();
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = C.line; ctx.stroke(); }
  }
  function body(ctx, col) {
    ctx.fillStyle = C.pants;
    rr(ctx, -6, 12, 5, 8, 2); ctx.fill(); rr(ctx, 1, 12, 5, 8, 2); ctx.fill();
    rr(ctx, -8, -2, 16, 15, 5); cel(ctx, col, LW);
  }
  function head(ctx) { circ(ctx, 0, -10, 9.5); cel(ctx, C.skin, LW, -4); }
  function clipHead(ctx) { circ(ctx, 0, -10, 9.5); ctx.clip(); }

  // 主角本體: 原點 = 判定框中心, 單位 = 遊戲 px, 判定框 28×40。f = 面向
  function hero(ctx, cls, f) {
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      // 紅圍巾往後飄
      poly(ctx, [-2, -3, -15, -2, -12, 1, -17, 5, -3, 2]); ctx.fillStyle = C.scarf; ctx.fill();
      // 巨劍扛在肩上(劍身在頭後, 握柄在身前)
      ctx.save(); ctx.translate(4, 4); ctx.rotate(Math.atan2(-22, -20));
      rr(ctx, 4, -3.2, 27, 6.4, 1.5); ctx.fillStyle = C.metal; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C.ink; ctx.stroke();
      poly(ctx, [31, -3.2, 35, 0, 31, 3.2]); ctx.fillStyle = C.metal; ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.metalDk; ctx.fillRect(6, -0.6, 23, 1.2);
      rr(ctx, 1, -6.5, 3.5, 13, 1); ctx.fillStyle = C.gold; ctx.fill(); ctx.stroke();
      ctx.restore();
      body(ctx, C.sword);
      ctx.fillStyle = C.gold; ctx.fillRect(-7, 7, 14, 2.5);
      head(ctx);
      // 刺蝟頭 + 藍頭帶
      ctx.save(); clipHead(ctx);
      poly(ctx, [-10, -9, -10, -20, 10, -20, 10, -12, 4, -15, 1, -12, -3, -15, -6, -11]); ctx.fillStyle = C.hair; ctx.fill();
      ctx.fillStyle = C.sword; ctx.fillRect(-10, -15.5, 20, 3.4);
      ctx.restore();
      poly(ctx, [-8, -15, -16, -18, -14, -12]); ctx.fillStyle = C.sword; ctx.fill();
      circ(ctx, 0, -10, 9.5); ctx.lineWidth = LW; ctx.strokeStyle = C.line; ctx.stroke();
      // 堅定的眼 + 濃眉
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(3.2, -8.6, 1.2, 1.9, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(7, -8.6, 1.2, 1.9, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(1.6, -12.2); ctx.lineTo(4.6, -11.2); ctx.moveTo(8.6, -12.2); ctx.lineTo(5.8, -11.2); ctx.stroke();
      // 握柄 + 手(壓在身前)
      ctx.save(); ctx.translate(4, 4); ctx.rotate(Math.atan2(-22, -20));
      ctx.fillStyle = C.wood; ctx.fillRect(-6, -1.6, 7, 3.2); circ(ctx, -7, 0, 2); ctx.fillStyle = C.gold; ctx.fill();
      ctx.restore();
      circ(ctx, 4, 4, 2.8); ctx.fillStyle = C.skin; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.ink; ctx.stroke();
    } else if (cls === 'hunter') {
      // 箭袋(背後)
      ctx.save(); ctx.translate(-9, 0); ctx.rotate(-0.4);
      rr(ctx, -3, -8, 6, 15, 1.5); ctx.fillStyle = C.wood; ctx.fill();
      ctx.fillStyle = C.feather; poly(ctx, [-3, -8, -1.5, -14, 0, -8]); ctx.fill(); poly(ctx, [0, -8, 2, -13, 3, -8]); ctx.fill();
      ctx.restore();
      // 兜帽尖垂到腦後
      poly(ctx, [-5, -18, -17, -10, -7, -6]); cel(ctx, C.hunter, LW, 40);
      body(ctx, C.hunter);
      poly(ctx, [-9, 7, 9, 7, 10, 13, -10, 13]); ctx.fillStyle = C.mask; ctx.fill();
      head(ctx);
      // 兜帽(蓋住頭頂與後腦, 臉從前方露出)
      ctx.beginPath(); ctx.arc(0, -10, 10.6, Math.PI * 0.55, Math.PI * 1.97); ctx.quadraticCurveTo(2, -13, -1, -1); ctx.closePath();
      cel(ctx, C.hunter, LW, -1);
      // 面罩遮下半臉: 只看得到眼睛
      ctx.save(); clipHead(ctx); ctx.fillStyle = C.mask; ctx.fillRect(-2, -7, 14, 9); ctx.restore();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(3, -10.2); ctx.lineTo(6.2, -9.6); ctx.stroke();
      circ(ctx, 5.4, -10.6, 0.7); ctx.fillStyle = '#ffffff'; ctx.fill();
      // 比人還高的長弓 + 搭箭
      ctx.strokeStyle = C.wood; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.arc(2, 1, 18, -1.05, 1.05); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(2, 1, 18, -0.12, 0.12); ctx.stroke();
      var ex = 2 + Math.cos(1.05) * 18, ey = Math.sin(1.05) * 18;
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex, 1 - ey); ctx.lineTo(ex - 3, 1); ctx.lineTo(ex, 1 + ey); ctx.stroke();
      ctx.strokeStyle = P('arrow', '#f3ead8'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 3, 1); ctx.lineTo(22, 1); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [22, -1.5, 25, 1, 22, 3.5]); ctx.fill();
      circ(ctx, 19.6, 1, 2.6); ctx.fillStyle = C.skin; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.ink; ctx.stroke();
    } else {
      // 背包裡的備用炸彈
      circ(ctx, -12, -1, 5); ctx.fillStyle = C.bomb; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.line; ctx.stroke();
      circ(ctx, -11, 7, 4.5); ctx.fillStyle = C.bomb; ctx.fill(); ctx.stroke();
      body(ctx, C.bomber);
      rr(ctx, -6, 3, 12, 10, 2); ctx.fillStyle = C.apron; ctx.fill();
      head(ctx);
      // 圓帽 + 推到額頭的大護目鏡
      ctx.save(); clipHead(ctx); ctx.fillStyle = C.bomber; ctx.fillRect(-10, -20, 20, 7); ctx.restore();
      ctx.fillStyle = C.bomber; rr(ctx, 2, -14.5, 11, 3, 1.5); ctx.fill();
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-9.5, -17.5, 19, 2.4);
      circ(ctx, -1.5, -16.5, 3.4); ctx.fillStyle = C.lens; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circ(ctx, 5, -16.5, 3.4); ctx.fillStyle = C.lens; ctx.fill(); ctx.stroke();
      circ(ctx, 0, -10, 9.5); ctx.lineWidth = LW; ctx.strokeStyle = C.line; ctx.stroke();
      // ^^ 眼 + 大笑 + 臉上煤灰
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(3, -8, 1.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(7.4, -8, 1.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -5); ctx.quadraticCurveTo(5.5, -1, 9, -5); ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill();
      circ(ctx, -2.5, -6, 1.3); ctx.fillStyle = 'rgba(40,30,30,0.5)'; ctx.fill();
      // 雙手抱著的大炸彈 + 引信火花
      circ(ctx, 9, 6, 8); ctx.fillStyle = C.bomb; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(9, 6, 5, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
      ctx.fillStyle = '#5a5a66'; ctx.fillRect(10, -3, 4, 2.5);
      ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(12, -3); ctx.quadraticCurveTo(14, -7, 17, -7); ctx.stroke();
      ctx.fillStyle = C.spark; poly(ctx, [17, -11.5, 18, -8, 21.5, -7, 18, -6, 17, -2.5, 16, -6, 12.5, -7, 16, -8]); ctx.fill();
      circ(ctx, 1.5, 6, 2.6); ctx.fillStyle = C.skin; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.ink; ctx.stroke();
      circ(ctx, 15.5, 11, 2.6); ctx.fillStyle = C.skin; ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // 縮圖記號(大地圖 1/8): 原點 = 腳底中心, 單位 = 螢幕 px。職業色地圖釘 + 白色武器記號
  function thumb(ctx, cls) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -10, 5.5, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = C[cls]; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = C.line; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = 1.3;
    if (cls === 'sword') {
      ctx.beginPath(); ctx.moveTo(-2.6, -7.4); ctx.lineTo(2.8, -12.8); ctx.moveTo(-3, -10.4); ctx.lineTo(0, -7.4); ctx.stroke();
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(-1.4, -10, 3.6, -1.2, 1.2); ctx.stroke();
      ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-0.1, -13.4); ctx.lineTo(-0.1, -6.6); ctx.stroke();
    } else {
      circ(ctx, -0.6, -9.2, 2.8); ctx.fillStyle = C.bomb; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      circ(ctx, 2.2, -12.4, 1); ctx.fillStyle = C.spark; ctx.fill();
    }
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
    for (i = 0; i < 3; i++) { ctx.save(); ctx.translate(562 + 54 * i, 386); ctx.scale(4, 4); thumb(ctx, CLS[i]); ctx.restore(); }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'hero', id: 'B', kind: 'static',
    size: [720, 400], duration: 0, loop: false,
    draw: function (ctx, t) { scene(ctx); }
  };
})();
