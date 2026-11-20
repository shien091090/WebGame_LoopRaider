/* result-panel 方案 B: 對決式 + 外框發光加標籤 — 兩欄同大、左右對稱, 列名放在正中央的「脊」上,
 * 「這一趟」整欄金色外光 + 頂端吊著金色標籤「這一趟」, 「目前回放」只有淡色虛線框;
 * 脊上每列一個綠色箭頭指向較好的一邊。金 = 介面選中: 這一欄就是按 Z 會採用的那一趟。 */
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
  // 脊上的勝方箭頭: dir -1 指左(這一趟較好)/ 1 指右(目前回放較好)/ 0 一樣
  function spineMark(ctx, cx, y, dir) {
    if (dir === 0) { T(ctx, '=', cx, y, 18, '#8f846e', 'center', true); return; }
    var x = cx + dir * 58;
    poly(ctx, [x + dir * 10, y, x - dir * 4, y - 9, x - dir * 4, y + 9]);
    ctx.fillStyle = P.goodLight; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke();
  }

  function draw(ctx) {
    ctx.save();
    scene(ctx);
    var X = 240, Y = 110, W = 800, H = 500, i;
    board(ctx, X, Y, W, H, '#2f3322');
    ribbon(ctx, 640, Y);

    var CW = 292, LX = 268, RX = 720, TOP = Y + 92, BOT = Y + 404, SC = 640;
    var rowY = [Y + 182, Y + 232, Y + 274, Y + 316, Y + 358];

    // --- 「目前回放」: 淡羊皮紙 + 虛線框, 無外光 ---
    rr(ctx, RX, TOP, CW, BOT - TOP, 8); ctx.fillStyle = P.parchDim; ctx.fill();
    ctx.save(); ctx.setLineDash([7, 5]); rr(ctx, RX + 1.5, TOP + 1.5, CW - 3, BOT - TOP - 3, 7); ctx.lineWidth = 2; ctx.strokeStyle = P.inkDim; ctx.stroke(); ctx.restore();
    Art.icons.cls(ctx, D.oldCls, RX + 26, TOP + 26, 20);
    T(ctx, '目前回放', RX + 44, TOP + 26, 17, P.inkDim, 'left', true);
    T(ctx, CNAME[D.oldCls], RX + CW - 16, TOP + 27, 13, P.inkDim, 'right', true);

    // --- 「這一趟」: 金色外光(由外往內 6 層)+ 實金框 + 頂端吊牌標籤 ---
    for (i = 6; i >= 1; i--) {
      rr(ctx, LX - i * 2.6, TOP - i * 2.6, CW + i * 5.2, BOT - TOP + i * 5.2, 8 + i * 2.6);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,216,74,' + (0.42 * (1 - i / 7)).toFixed(3) + ')'; ctx.stroke();
    }
    rr(ctx, LX, TOP, CW, BOT - TOP, 8); ctx.fillStyle = '#fbf3dc'; ctx.fill();
    rr(ctx, LX - 1.5, TOP - 1.5, CW + 3, BOT - TOP + 3, 9); ctx.lineWidth = 4; ctx.strokeStyle = P.select; ctx.stroke();
    // 吊牌: 兩條細繩 + 金牌「這一趟」
    var tgW = 150, tgX = LX + CW / 2 - tgW / 2, tgY = TOP - 24;
    ctx.beginPath(); ctx.moveTo(tgX + 18, tgY + 4); ctx.lineTo(LX + 30, TOP + 2); ctx.moveTo(tgX + tgW - 18, tgY + 4); ctx.lineTo(LX + CW - 30, TOP + 2);
    ctx.lineWidth = 2; ctx.strokeStyle = P.selectDeep; ctx.stroke();
    rr(ctx, tgX + 2, tgY + 3, tgW, 38, 6); ctx.fillStyle = P.selectDeep; ctx.fill();
    rr(ctx, tgX, tgY, tgW, 38, 6); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.edge; ctx.stroke();
    Art.icons.cls(ctx, D.cls, tgX + 22, tgY + 19, 20);
    T(ctx, '這一趟', tgX + 40, tgY + 19.5, 21, P.ink, 'left', true);
    T(ctx, CNAME[D.cls], LX + CW - 16, TOP + 27, 13, P.inkDim, 'right', true);

    // 兩欄的分隔線
    ctx.fillStyle = 'rgba(60,40,20,0.3)';
    ctx.fillRect(LX + 14, TOP + 48, CW - 28, 2); ctx.fillRect(RX + 14, TOP + 48, CW - 28, 2);

    // --- 中央脊: 列名 ---
    rr(ctx, SC - 64, TOP + 52, 128, BOT - TOP - 64, 8); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
    T(ctx, '通關時間', SC, rowY[0], 15, P.labelDim, 'center', true, 3, P.edge);
    for (i = 0; i < 4; i++) {
      Art.icons.mat(ctx, KINDS[i], SC - 28, rowY[i + 1], 20);
      T(ctx, KNAME[KINDS[i]], SC - 14, rowY[i + 1], 15, P.labelDim, 'left', true, 3, P.edge);
    }

    // --- 數值: 兩邊同字級, 較好一方綠、較差一方淡 ---
    var tN = D.time, tO = D.oldTime;
    T(ctx, f1(tN) + ' 秒', LX + CW - 24, rowY[0], 26, tN < tO ? P.good : (tN > tO ? '#8a7a5e' : P.ink), 'right', true);
    T(ctx, f1(tO) + ' 秒', RX + 24, rowY[0], 26, tO < tN ? P.good : (tO > tN ? '#6f6450' : P.ink), 'left', true);
    spineMark(ctx, SC, rowY[0], tN < tO ? -1 : (tO < tN ? 1 : 0));
    for (i = 0; i < 4; i++) {
      var k = KINDS[i], a = rate(D.run[k], tN), b = rate(D.oldRun[k], tO), y = rowY[i + 1], up = a > b, dn = a < b;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(120,90,40,0.10)'; ctx.fillRect(LX + 6, y - 19, CW - 12, 38); ctx.fillRect(RX + 6, y - 19, CW - 12, 38); }
      T(ctx, '一圈 ' + D.run[k], LX + 20, y + 1, 13, P.inkDim, 'left', true);
      T(ctx, '+' + f1(a) + '/分', LX + CW - 24, y, 23, up ? P.good : (dn ? '#8a7a5e' : P.ink), 'right', true);
      T(ctx, '+' + f1(b) + '/分', RX + 24, y, 23, dn ? P.good : (up ? '#6f6450' : P.ink), 'left', true);
      T(ctx, '一圈 ' + D.oldRun[k], RX + CW - 20, y + 1, 13, P.inkDim, 'right', true);
      spineMark(ctx, SC, y, up ? -1 : (dn ? 1 : 0));
    }

    // --- 選擇鍵: 各自吊在自己那一欄下方; 道具置中最底 ---
    keyAct(ctx, 'Z', '採用這一趟', LX + CW / 2, Y + 436, 17, true);
    keyAct(ctx, 'X', '保留舊的', RX + CW / 2, Y + 436, 17, false);
    for (i = 0; i < D.items.length; i++) {
      Art.icons.item(ctx, D.items[i], 572, Y + 474, 24);
      T(ctx, '獲得 獵人號角', 590, Y + 475, 15, P.cream, 'left', true, 3, P.edge);
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'result-panel', id: 'B', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) { draw(ctx); }
  };
})();
