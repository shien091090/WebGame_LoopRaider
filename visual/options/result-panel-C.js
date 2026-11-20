/* result-panel 方案 C: 卡片浮起 — 「這一趟」是一張剛放上來的新卡: 微斜、帶厚陰影、木色頭條、
 * 每列直接附「比舊的多 / 少多少」差值章; 「目前回放」是平貼在木板裡的舊卡(下沉內陰影、褪色、無差值)。
 * 靠「高度(陰影 + 傾斜)+ 差值資訊只在新卡上」分主從。 */
(function () {
  'use strict';
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var P = Art.palette;
  var KINDS = ['wood', 'stone', 'crystal', 'core'];
  var KNAME = { wood: '木材', stone: '石頭', crystal: '水晶', core: '魔核' };
  var CNAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var D = {
    cls: 'sword', time: 42.3, run: { wood: 6, stone: 2, crystal: 1, core: 3 },
    oldCls: 'hunter', oldTime: 51.0, oldRun: { wood: 5, stone: 3, crystal: 1, core: 2 },
    items: ['horn']
  };
  function rate(n, t) { return Math.round(n / t * 600) / 10; }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function font(px, b) { return (b ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function T(ctx, s, x, y, px, col, align, bold, ol, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (ol) { ctx.lineJoin = 'round'; ctx.lineWidth = ol; ctx.strokeStyle = oc || P.edge; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  function keyW(ctx, k, px) { return Math.max(px * 1.7, tw(ctx, k, px, true) + px * 0.9); }
  function keyAct(ctx, k, s, cx, y, px, hot) {
    var kw = keyW(ctx, k, px), total = kw + 6 + tw(ctx, s, px, true), x = cx - total / 2;
    Art.icons.key(ctx, k, x + kw / 2, y, px, hot);
    T(ctx, s, x + kw + 6, y, px, P.cream, 'left', true, 3, P.edge);
  }
  function board(ctx, x, y, w, h, tint) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = tint; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = P.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = P.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(n[i][0], n[i][1], 2.6, 0, Math.PI * 2); ctx.fillStyle = P.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke(); }
    ctx.restore();
  }
  function ribbon(ctx, cx, y) {
    poly(ctx, [cx - 80, y + 10, cx + 80, y + 10, cx + 68, y + 25, cx + 80, y + 40, cx - 80, y + 40, cx - 68, y + 25]);
    ctx.fillStyle = P.good; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.edge; ctx.stroke();
    T(ctx, '過關', cx, y + 25.5, 20, '#ffffff', 'center', true, 3, '#14361f');
  }
  function scene(ctx) {
    Art.drawBackground(ctx, { theme: 'forest', t: 0 });
    for (var c = 0; c < 32; c++) for (var r = 0; r < 3; r++) Art.drawGround(ctx, { x: c * 40 + 20, y: 620 + r * 40, theme: 'forest', open: { n: r === 0, e: false, s: false, w: false } });
    Art.drawGoal(ctx, { x: 1180, y: 560, reached: true, cheerT: 0.6, cheerDur: 0.6 });
    Art.drawPlayer(ctx, { x: 1136, y: 582, cls: D.cls, facing: 1, pose: 'cheer', poseT: 0.3 });
    Art.drawHud(ctx, { mode: 'level', stock: { wood: 34, stone: 12, crystal: 7, core: 9 }, ratePerMin: { wood: 5.9, stone: 3.5, crystal: 1.2, core: 2.4 }, time: D.time, hp: 2, maxHp: 3 });
    ctx.fillStyle = 'rgba(6,8,12,0.5)'; ctx.fillRect(0, 0, 1280, 720);
  }
  // 差值章: good = 綠底白字(比舊的好), 否則灰底深字; 右對齊於 x
  function chip(ctx, s, x, y, good) {
    var w = tw(ctx, s, 14, true) + 14, h = 22;
    rr(ctx, x - w, y - h / 2, w, h, 11); ctx.fillStyle = good ? P.good : '#b9b2a2'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = good ? '#1d5c37' : '#7a7466'; ctx.stroke();
    T(ctx, s, x - w / 2, y + 0.5, 14, good ? '#ffffff' : '#4a4538', 'center', true);
  }

  function draw(ctx) {
    ctx.save();
    scene(ctx);
    var X = 240, Y = 110, W = 800, H = 500, i;
    board(ctx, X, Y, W, H, '#2f3322');
    ribbon(ctx, 640, Y);
    var rowY = [Y + 156, Y + 204, Y + 248, Y + 292, Y + 336];

    // --- 舊卡「目前回放」: 平貼、下沉(內陰影)、褪色, 只列數值 ---
    var OX = 664, OY = Y + 92, OW = 340, OH = 288;
    rr(ctx, OX, OY, OW, OH, 6); ctx.fillStyle = '#c9bea4'; ctx.fill();
    ctx.save(); rr(ctx, OX, OY, OW, OH, 6); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(OX, OY, OW, 6); ctx.fillRect(OX, OY, 6, OH);
    ctx.restore();
    rr(ctx, OX + 0.5, OY + 0.5, OW - 1, OH - 1, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(30,20,10,0.7)'; ctx.stroke();
    Art.icons.cls(ctx, D.oldCls, OX + 54, OY + 22, 16);
    T(ctx, '目前回放', OX + 68, OY + 22, 15, P.inkDim, 'left', true);
    T(ctx, CNAME[D.oldCls], OX + OW - 16, OY + 23, 12, P.inkDim, 'right', true);
    ctx.fillStyle = 'rgba(60,40,20,0.25)'; ctx.fillRect(OX + 40, OY + 40, OW - 56, 1.5);
    var tN = D.time, tO = D.oldTime;
    T(ctx, '通關', OX + 58, rowY[0], 13, P.inkDim, 'left', true);
    T(ctx, f1(tO) + ' 秒', OX + OW - 20, rowY[0], 18, '#5f5544', 'right', true);
    for (i = 0; i < 4; i++) {
      var k0 = KINDS[i], y0 = rowY[i + 1];
      Art.icons.mat(ctx, k0, OX + 66, y0, 17);
      T(ctx, '一圈 ' + D.oldRun[k0], OX + 84, y0 + 1, 12, P.inkDim, 'left', true);
      T(ctx, '+' + f1(rate(D.oldRun[k0], tO)) + '/分', OX + OW - 20, y0, 18, '#5f5544', 'right', true);
    }

    // --- 新卡「這一趟」: 浮起(雙層陰影)、左傾 2°, 蓋住舊卡左緣一點 ---
    var NW = 420, NH = 340, NCX = 468, NCY = Y + 244;
    ctx.save();
    ctx.translate(NCX, NCY); ctx.rotate(-0.035);
    var x0 = -NW / 2, y0b = -NH / 2;
    rr(ctx, x0 + 16, y0b + 22, NW, NH, 10); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    rr(ctx, x0 + 8, y0b + 11, NW, NH, 10); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    rr(ctx, x0, y0b, NW, NH, 10); ctx.fillStyle = '#fffaea'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.edge; ctx.stroke();
    // 木色頭條
    ctx.save(); rr(ctx, x0, y0b, NW, NH, 10); ctx.clip();
    var g = ctx.createLinearGradient(0, y0b, 0, y0b + 52); g.addColorStop(0, P.woodLight); g.addColorStop(1, P.plank);
    ctx.fillStyle = g; ctx.fillRect(x0, y0b, NW, 52);
    ctx.fillStyle = P.edge; ctx.fillRect(x0, y0b + 52, NW, 2);
    ctx.restore();
    Art.icons.cls(ctx, D.cls, x0 + 30, y0b + 26, 26);
    T(ctx, '這一趟', x0 + 52, y0b + 27, 26, P.ink, 'left', true);
    T(ctx, CNAME[D.cls], x0 + NW - 18, y0b + 28, 15, '#5a3a14', 'right', true);
    // 右下折角
    poly(ctx, [x0 + NW - 26, y0b + NH, x0 + NW, y0b + NH - 26, x0 + NW - 26, y0b + NH - 26]);
    ctx.fillStyle = '#e2d3ae'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(60,40,20,0.6)'; ctx.stroke();

    // 列(座標換回卡片內部: 卡片中心在 (NCX, NCY))
    function ly(y) { return y - NCY; }
    var dt = Math.round((tO - tN) * 10) / 10;
    T(ctx, '通關', x0 + 22, ly(rowY[0]), 14, P.inkDim, 'left', true);
    T(ctx, f1(tN), x0 + 70, ly(rowY[0]), 32, P.ink, 'left', true);
    T(ctx, '秒', x0 + 76 + tw(ctx, f1(tN), 32, true), ly(rowY[0]) + 6, 15, P.inkDim, 'left', true);
    chip(ctx, dt > 0 ? '快 ' + f1(dt) + ' 秒' : (dt < 0 ? '慢 ' + f1(-dt) + ' 秒' : '一樣快'), x0 + NW - 18, ly(rowY[0]), dt > 0);
    for (i = 0; i < 4; i++) {
      var k = KINDS[i], y = ly(rowY[i + 1]), a = rate(D.run[k], tN), b = rate(D.oldRun[k], tO), d = Math.round((a - b) * 10) / 10;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(120,90,40,0.09)'; ctx.fillRect(x0 + 8, y - 20, NW - 16, 40); }
      Art.icons.mat(ctx, k, x0 + 34, y, 22);
      var sa = '+' + f1(a);
      T(ctx, sa, x0 + 56, y, 26, P.ink, 'left', true);
      var aw = tw(ctx, sa, 26, true);
      T(ctx, '/分', x0 + 60 + aw, y + 5, 13, P.inkDim, 'left', true);
      T(ctx, '一圈 ' + D.run[k], x0 + 236, y + 2, 13, P.inkDim, 'right', true);
      chip(ctx, d > 0 ? '多 ' + f1(d) : (d < 0 ? '少 ' + f1(-d) : '一樣'), x0 + NW - 18, y, d > 0);
    }
    ctx.restore();

    // --- 選擇鍵: Z 在新卡下方、X 在舊卡下方; 道具在舊卡下 ---
    keyAct(ctx, 'Z', '採用這一趟', NCX, Y + 466, 18, true);
    keyAct(ctx, 'X', '保留舊的', OX + OW / 2, Y + 466, 15, false);
    for (i = 0; i < D.items.length; i++) {
      Art.icons.item(ctx, D.items[i], OX + 22, Y + 404, 24);
      T(ctx, '獲得 獵人號角', OX + 40, Y + 405, 15, P.cream, 'left', true, 3, P.edge);
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'result-panel', id: 'C', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) { draw(ctx); }
  };
})();
