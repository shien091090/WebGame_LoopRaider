/* result-panel 方案 A: 亮底大字 — 「這一趟」寬欄亮羊皮紙 + 大字, 「目前回放」窄欄嵌在暗木凹槽裡、小字淡色。
 * 靠「明暗 + 字級 + 欄寬」三條通道分主從。介面沿用 ui 方案 A(木板 + 羊皮紙 + 石鍵帽), 素材 / 職業 / 道具 / 鍵帽圖示呼叫 Art.icons。 */
(function () {
  'use strict';
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var P = Art.palette;
  var KINDS = ['wood', 'stone', 'crystal', 'core'];
  var KNAME = { wood: '木材', stone: '石頭', crystal: '水晶', core: '魔核' };
  var CNAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  // 範例資料: 這一趟比較快、木材 / 水晶 / 魔核較多, 石頭較少(兩邊都有贏有輸)
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
  function font(px, b) { return (b ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function T(ctx, s, x, y, px, col, align, bold, ol, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (ol) { ctx.lineJoin = 'round'; ctx.lineWidth = ol; ctx.strokeStyle = oc || P.edge; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  function keyW(ctx, k, px) { return Math.max(px * 1.7, tw(ctx, k, px, true) + px * 0.9); }
  // 一組「鍵帽 + 動作字」, 以 cx 置中
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
    ctx.beginPath();
    var p = [cx - 80, y + 10, cx + 80, y + 10, cx + 68, y + 25, cx + 80, y + 40, cx - 80, y + 40, cx - 68, y + 25];
    ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath();
    ctx.fillStyle = P.good; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.edge; ctx.stroke();
    T(ctx, '過關', cx, y + 25.5, 20, '#ffffff', 'center', true, 3, '#14361f');
  }
  function tri(ctx, x, y, s, col) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }
  // 關卡畫面當背景(過關瞬間的終點旗 + 歡呼), 壓暗
  function scene(ctx) {
    Art.drawBackground(ctx, { theme: 'forest', t: 0 });
    for (var c = 0; c < 32; c++) for (var r = 0; r < 3; r++) Art.drawGround(ctx, { x: c * 40 + 20, y: 620 + r * 40, theme: 'forest', open: { n: r === 0, e: false, s: false, w: false } });
    Art.drawGoal(ctx, { x: 1180, y: 560, reached: true, cheerT: 0.6, cheerDur: 0.6 });
    Art.drawPlayer(ctx, { x: 1136, y: 582, cls: D.cls, facing: 1, pose: 'cheer', poseT: 0.3 });
    Art.drawHud(ctx, { mode: 'level', stock: { wood: 34, stone: 12, crystal: 7, core: 9 }, ratePerMin: { wood: 5.9, stone: 3.5, crystal: 1.2, core: 2.4 }, time: D.time, hp: 2, maxHp: 3 });
    ctx.fillStyle = 'rgba(6,8,12,0.5)'; ctx.fillRect(0, 0, 1280, 720);
  }

  function draw(ctx) {
    ctx.save();
    scene(ctx);
    var X = 240, Y = 110, W = 800, H = 500, i;
    board(ctx, X, Y, W, H, '#2f3322');
    ribbon(ctx, 640, Y);
    T(ctx, '比較兩趟, 選一條留在大地圖重播', 640, Y + 62, 14, P.labelDim, 'center', true, 3, P.edge);

    var NX = 404, NW = 380, OX = 800, OW = 216, TOP = Y + 84, BOT = Y + 404;
    var rowY = [Y + 170, Y + 222, Y + 266, Y + 310, Y + 354];
    // --- 「目前回放」窄欄: 暗木凹槽, 低調 ---
    rr(ctx, OX, TOP + 14, OW, BOT - TOP - 14, 6); ctx.fillStyle = P.groove; ctx.fill();
    rr(ctx, OX + 1, TOP + 15, OW - 2, BOT - TOP - 16, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(OX + 2, TOP + 16, OW - 4, 4);
    Art.icons.cls(ctx, D.oldCls, OX + 22, Y + 120, 16);
    T(ctx, '目前回放', OX + 36, Y + 120, 15, P.labelDim, 'left', true);
    T(ctx, CNAME[D.oldCls], OX + OW - 14, Y + 120, 12, '#8f846e', 'right', true);

    // --- 「這一趟」寬欄: 亮羊皮紙, 浮在木板上 ---
    rr(ctx, NX + 3, TOP + 4, NW, BOT - TOP, 8); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    rr(ctx, NX, TOP, NW, BOT - TOP, 8);
    var g = ctx.createLinearGradient(0, TOP, 0, BOT); g.addColorStop(0, '#fffaea'); g.addColorStop(1, P.parch);
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.edge; ctx.stroke();
    Art.icons.cls(ctx, D.cls, NX + 34, Y + 114, 28);
    T(ctx, '這一趟', NX + 56, Y + 114, 28, P.ink, 'left', true);
    T(ctx, CNAME[D.cls], NX + NW - 18, Y + 116, 15, P.inkDim, 'right', true);
    ctx.fillStyle = 'rgba(60,40,20,0.3)'; ctx.fillRect(NX + 16, Y + 140, NW - 32, 2);
    // 列底紋(只在亮欄內)
    for (i = 1; i < 5; i += 2) { ctx.fillStyle = 'rgba(120,90,40,0.09)'; ctx.fillRect(NX + 8, rowY[i] - 20, NW - 16, 40); }

    // --- 左側列名 ---
    T(ctx, '通關時間', X + 30, rowY[0], 15, P.labelDim, 'left', true, 3, P.edge);
    for (i = 0; i < 4; i++) {
      Art.icons.mat(ctx, KINDS[i], X + 42, rowY[i + 1], 22);
      T(ctx, KNAME[KINDS[i]] + ' / 分', X + 60, rowY[i + 1], 15, P.labelDim, 'left', true, 3, P.edge);
    }

    // --- 數值 ---
    var tN = D.time, tO = D.oldTime, nBetter = tN < tO, oBetter = tO < tN;
    var s = f1(tN);
    T(ctx, s, NX + 28, rowY[0], 36, nBetter ? P.good : (oBetter ? '#8a7a5e' : P.ink), 'left', true);
    var sw = tw(ctx, s, 36, true);
    T(ctx, '秒', NX + 32 + sw, rowY[0] + 6, 16, P.inkDim, 'left', true);
    if (nBetter) tri(ctx, NX + 58 + sw, rowY[0] + 1, 8, P.good);
    T(ctx, f1(tO) + ' 秒', OX + 22, rowY[0], 17, oBetter ? P.goodLight : '#a89c80', 'left', true);
    if (oBetter) tri(ctx, OX + 108, rowY[0], 6, P.goodLight);

    for (i = 0; i < 4; i++) {
      var k = KINDS[i], a = rate(D.run[k], tN), b = rate(D.oldRun[k], tO), up = a > b, dn = a < b, y = rowY[i + 1];
      var sa = '+' + f1(a);
      T(ctx, sa, NX + 28, y, 30, up ? P.good : (dn ? '#8a7a5e' : P.ink), 'left', true);
      var aw = tw(ctx, sa, 30, true);
      T(ctx, '/分', NX + 32 + aw, y + 5, 14, P.inkDim, 'left', true);
      if (up) tri(ctx, NX + 62 + aw, y + 1, 8, P.good);
      T(ctx, '一圈 ' + D.run[k], NX + NW - 18, y + 2, 14, P.inkDim, 'right', true);
      var sb = '+' + f1(b) + '/分';
      T(ctx, sb, OX + 22, y, 17, dn ? P.goodLight : '#a89c80', 'left', true);
      if (dn) tri(ctx, OX + 30 + tw(ctx, sb, 17, true), y, 6, P.goodLight);
      T(ctx, '一圈 ' + D.oldRun[k], OX + OW - 14, y + 1, 12, '#8f846e', 'right', true);
    }

    // --- 獲得道具 + 選擇鍵(鍵對齊各自那一欄) ---
    for (i = 0; i < D.items.length; i++) {
      Art.icons.item(ctx, D.items[i], X + 44, Y + 432, 26);
      T(ctx, '獲得 獵人號角', X + 64, Y + 433, 15, P.cream, 'left', true, 3, P.edge);
    }
    keyAct(ctx, 'Z', '採用這一趟', NX + NW / 2, Y + 466, 17, true);
    keyAct(ctx, 'X', '保留舊的', OX + OW / 2, Y + 466, 14, false);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'result-panel', id: 'A', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) { draw(ctx); }
  };
})();
