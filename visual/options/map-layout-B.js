// map-layout 方案 B: 河對岸的營地(地圖世界內的一塊暖色營地, 用河 + 橋和關卡區隔開)
// 升級所與商店是兩張和關卡卡片同規格的建築卡, 選中按 Z 開各自的頁面
// 關卡樹整組右移: 四欄 x = 392 / 616 / 840 / 1064
(function () {
  var A = window.Art, P = A.palette;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var W = 1280, H = 720;
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(ctx, s, x, y, px, col, align, bold, ol, oc) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (ol) { ctx.lineJoin = 'round'; ctx.lineWidth = ol; ctx.strokeStyle = oc || P.edge; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  // ---------- 示意資料(遊戲中段: 第 1、2 關過關) ----------
  var STOCK = { wood: 42, stone: 17, crystal: 15, core: 9 };
  var RATE = { wood: 15.7, stone: 4.0, crystal: 2.5, core: 2.6 };
  var LV = [
    { i: 1, name: '林間小徑', theme: 'forest', state: 'cleared', cls: 'sword', time: 12.4, rates: { wood: 9.7, stone: 2.4, crystal: 0.5, core: 1.4 }, rep: 2, p: 0.35, row: 281, col: 0 },
    { i: 2, name: '藤蔓斜坡', theme: 'forest', state: 'cleared', cls: 'hunter', time: 15.1, rates: { wood: 6.0, stone: 1.6, crystal: 2.0, core: 1.2 }, rep: 1, p: 0.72, speed: 1.25, newArea: true, row: 131, col: 1 },
    { i: 3, name: '野豬谷地', theme: 'forest', state: 'open', rep: 0, row: 431, col: 1 },
    { i: 4, name: '岩柱塔', theme: 'cliff', state: 'buyable', cost: { wood: 50 }, row: 56, col: 2 },
    { i: 5, name: '吊橋峽谷', theme: 'cliff', state: 'buyable', cost: { wood: 50 }, row: 206, col: 2 },
    { i: 6, name: '礦車隧道', theme: 'mine', state: 'sealed', cost: { wood: 50 }, row: 356, col: 2 },
    { i: 7, name: '晶礦深井', theme: 'mine', state: 'sealed', cost: { wood: 50 }, row: 506, col: 2 },
    { i: 8, name: '鹽原斷門', theme: 'salt', state: 'sealed', need: 5, row: 281, col: 3 }
  ];
  var LINKS = [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [4, 8], [5, 8], [6, 8], [7, 8]];
  var SHOP = [
    { type: 'gear', name: '加速齒輪', fx: '回放速度 +25%', price: 12, max: 4, left: 2 },
    { type: 'bagWood', name: '木材袋', fx: '每次通關 +4 木材', price: 10, max: 2, left: 0 },
    { type: 'bagStone', name: '石頭袋', fx: '每次通關 +3 石頭', price: 10, max: 2, left: 2 },
    { type: 'coreLamp', name: '魔核燈', fx: '每次通關 +2 魔核', price: 14, max: 2, left: 1 },
    { type: 'glove', name: '拾荒手套', fx: '撿到的素材 +1', price: 18, max: 1, left: 1 },
    { type: 'horn', name: '獵人號角', fx: '打怪掉落 ×2', price: 24, max: 1, left: 1 }
  ];
  var STATS = [
    { name: '移速', lv: 1, max: 3, cost: 20 }, { name: '血量', lv: 0, max: 2, cost: 12 },
    { name: '技能冷卻', lv: 0, max: 3, cost: 8 }, { name: '攻擊傷害', lv: 0, max: 2, cost: 15 }
  ];
  var RECRUIT = [{ cls: 'hunter', name: '獵人', owned: true }, { cls: 'bomber', name: '炸彈工', owned: false, cost: 30 }];

  // ---------- 共用: 地圖紙面、關卡樹、縮圖 ----------
  function mapField(ctx, x0, t) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 40, W - x0, H - 40); ctx.clip();
    var g = ctx.createLinearGradient(0, 40, 0, H); g.addColorStop(0, '#16262e'); g.addColorStop(1, '#0f1b22'); ctx.fillStyle = g; ctx.fillRect(x0, 40, W - x0, H - 40);
    // 往斷門方向的黃昏光(只在第 8 關後方, 很淡)
    var rg = ctx.createRadialGradient(1200, 360, 10, 1200, 360, 300); rg.addColorStop(0, 'rgba(196,125,156,0.22)'); rg.addColorStop(1, 'rgba(94,65,128,0)'); ctx.fillStyle = rg; ctx.fillRect(x0, 40, W - x0, H - 40);
    ctx.strokeStyle = P.mapLine; ctx.lineWidth = 1; ctx.beginPath();
    for (var gx = x0 - (x0 % 40); gx <= W; gx += 40) { ctx.moveTo(gx + 0.5, 40); ctx.lineTo(gx + 0.5, H); }
    for (var gy = 40; gy <= H; gy += 40) { ctx.moveTo(x0, gy + 0.5); ctx.lineTo(W, gy + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,170,160,0.08)'; ctx.lineWidth = 2;
    for (var i = 0; i < 7; i++) { var cx = x0 + 80 + hash(i, 1) * (W - x0 - 160), cy = 160 + hash(i, 2) * 480; ctx.beginPath(); ctx.ellipse(cx, cy, 80 + hash(i, 3) * 90, 40 + hash(i, 4) * 50, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, cy, 50 + hash(i, 3) * 60, 22 + hash(i, 4) * 30, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  function gTop(c, seed) { var v = Math.floor((c + seed * 3) / 5) % 3; return 15 - (v === 1 ? 1 : (v === 2 ? 2 : 0)); }
  function thumb(ctx, x, y, lv, t) {
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
    ctx.translate(x + 8, y + 8); ctx.scale(0.125, 0.125);
    A.drawBackground(ctx, { theme: lv.theme, t: t });
    for (var c = 0; c < 32; c++) {
      var top = gTop(c, lv.i), tl = c > 0 ? gTop(c - 1, lv.i) : top, trr = c < 31 ? gTop(c + 1, lv.i) : top;
      for (var r = top; r < 18; r++) A.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, theme: lv.theme, open: { n: r === top, w: r < tl, e: r < trr, s: false } });
    }
    var px = 60 + lv.p * 1160, pc = Math.max(0, Math.min(31, Math.floor(px / 40)));
    A.drawPickup(ctx, { x: 900, y: gTop(22, lv.i) * 40 - 30, kind: 'wood', t: t });
    A.drawPlayer(ctx, { x: px, y: gTop(pc, lv.i) * 40 - 18, cls: lv.cls, facing: 1, pose: 'run', poseT: t });
    ctx.restore();
  }
  function marks(lv) { var m = [], k = ['wood', 'wood', 'stone', 'crystal', 'core', 'wood', 'stone']; for (var j = 0; j < 7; j++) m.push({ p: 0.08 + j * 0.13, kind: k[(j + lv.i) % k.length] }); return m; }
  function tree(ctx, cols, t) {
    var by = {}, i;
    for (i = 0; i < LV.length; i++) { LV[i].x = cols[LV[i].col]; by[LV[i].i] = LV[i]; }
    for (i = 0; i < LINKS.length; i++) { var a = by[LINKS[i][0]], b = by[LINKS[i][1]]; A.drawMapLink(ctx, { x1: a.x + 176, y1: a.row + 68, x2: b.x, y2: b.row + 68, lit: a.state === 'cleared' }); }
    for (i = 0; i < LV.length; i++) {
      var lv = LV[i];
      A.drawLevelCard(ctx, { x: lv.x, y: lv.row, index: lv.i, name: lv.name, theme: lv.theme, state: lv.state, cost: lv.cost, stock: STOCK, need: lv.need, rates: lv.rates, recordCls: lv.cls, recordTime: lv.time, repairedCount: lv.rep || 0, siteCount: lv.i === 8 ? 0 : 3 });
      if (lv.state === 'cleared') {
        thumb(ctx, lv.x, lv.row, lv, t);
        A.drawCardOverlay(ctx, { x: lv.x, y: lv.row, speedMul: lv.speed || 1, newArea: lv.newArea === true, selected: false, replayP: (lv.p + t * 0.05) % 1, marks: marks(lv) });
      }
    }
  }
  function hudAndHint(ctx, hx) {
    A.drawHud(ctx, { mode: 'map', stock: STOCK, ratePerMin: RATE });
    A.drawSoundIcon(ctx, { x: 1250, y: 62, on: true });
    txt(ctx, '↑↓←→ 選擇   Z 確定   Esc 暫停   M 靜音', hx, 702, 13, P.labelDim, 'left', true);
  }
  // 價格: 圖示 + 數字(不足紅 + 「缺 N」紅底小標), 回傳右端 x
  function price(ctx, kind, need, have, x, y, px) {
    var short = need > have;
    A.icons.mat(ctx, kind, x + px * 0.6, y, px * 1.25);
    var nx = x + px * 1.35; txt(ctx, String(need), nx, y + 0.5, px, short ? P.short : P.ink, 'left', true);
    var e = nx + tw(ctx, String(need), px, true);
    if (short) { var s = '缺 ' + (need - have), bw = tw(ctx, s, px * 0.78, true) + 8; rr(ctx, e + 4, y - px * 0.62, bw, px * 1.24, 3); ctx.fillStyle = P.short; ctx.fill(); txt(ctx, s, e + 4 + bw / 2, y + 0.5, Math.round(px * 0.78), '#ffffff', 'center', true); e += 4 + bw; }
    return e;
  }
  function pips(ctx, x, y, left, max, r) { for (var j = 0; j < max; j++) { ctx.beginPath(); ctx.arc(x + j * (r * 2 + 3), y, r, 0, Math.PI * 2); ctx.fillStyle = j < left ? P.crystal : 'rgba(43,33,24,0.18)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke(); } }
  function selArrow(ctx, x, y) { ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 11, y); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke(); }

  // ---------- 方案 B 專屬: 河對岸的營地 ----------
  // 左側是地圖世界裡的一塊營地(暖色石板地), 和關卡區(冷色地圖紙)之間隔一條河, 一座橋接到第 1 關。
  // 升級所與商店都是和關卡卡片同規格的 176×136「建築卡」, 選中按 Z 打開各自的頁面(沿用現行升級所頁 / 商店面板)。
  function riverX(y) { return 330 + 10 * Math.sin(y / 70); }
  var RW = 22; // 河半寬
  function town(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, 40);
    for (var y = 40; y <= H; y += 10) ctx.lineTo(riverX(y) - RW, y);
    ctx.lineTo(0, H); ctx.closePath(); ctx.save(); ctx.clip();
    var g = ctx.createLinearGradient(0, 40, 0, H); g.addColorStop(0, '#3e3227'); g.addColorStop(1, '#2e251c'); ctx.fillStyle = g; ctx.fillRect(0, 40, 360, H - 40);
    // 石板地紋(很淡)
    ctx.strokeStyle = 'rgba(255,220,170,0.07)'; ctx.lineWidth = 1.2;
    for (var r = 0; r < 24; r++) for (var c = 0; c < 9; c++) { var cx = c * 40 + (r % 2) * 20 + 10, cy = 52 + r * 28; ctx.beginPath(); ctx.ellipse(cx, cy, 16, 10, 0, 0, Math.PI * 2); ctx.stroke(); }
    // 遠處房舍剪影(上下兩排, 壓暗)
    function house(x, y, w, h) { ctx.fillStyle = '#251c15'; ctx.fillRect(x, y, w, h); ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + w / 2, y - h * 0.7); ctx.lineTo(x + w + 6, y); ctx.closePath(); ctx.fillStyle = '#4a2f22'; ctx.fill(); ctx.fillStyle = 'rgba(255,190,110,0.55)'; ctx.fillRect(x + w / 2 - 5, y + h / 2 - 5, 10, 10); }
    house(18, 92, 50, 34); house(238, 96, 44, 30); house(20, 616, 46, 32); house(240, 620, 48, 30);
    // 小路: 升級所 ↔ 商店 ↔ 橋
    ctx.strokeStyle = '#6e5a40'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(150, 286); ctx.lineTo(150, 430); ctx.moveTo(150, 349); ctx.bezierCurveTo(220, 349, 250, 349, 320, 349); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,180,0.12)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(150, 290); ctx.lineTo(150, 426); ctx.moveTo(160, 349); ctx.lineTo(310, 349); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 河(冷深藍, 與水晶青分開)+ 岸邊
    ctx.beginPath(); ctx.moveTo(riverX(40) - RW, 40);
    for (y = 40; y <= H; y += 10) ctx.lineTo(riverX(y) - RW, y);
    for (y = H; y >= 40; y -= 10) ctx.lineTo(riverX(y) + RW, y);
    ctx.closePath(); ctx.fillStyle = '#1b2f48'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#5a4a36'; ctx.beginPath(); for (y = 40; y <= H; y += 10) { if (y === 40) ctx.moveTo(riverX(y) - RW, y); else ctx.lineTo(riverX(y) - RW, y); } ctx.stroke();
    ctx.strokeStyle = '#24404a'; ctx.beginPath(); for (y = 40; y <= H; y += 10) { if (y === 40) ctx.moveTo(riverX(y) + RW, y); else ctx.lineTo(riverX(y) + RW, y); } ctx.stroke();
    ctx.strokeStyle = 'rgba(150,180,215,0.35)'; ctx.lineWidth = 1.5;
    for (var k = 0; k < 14; k++) { var wy = 60 + k * 47, wx = riverX(wy) - 8 + (k % 3) * 6; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 4, wy - 3, wx + 8, wy); ctx.stroke(); }
    // 橋(接第 1 關)
    var bx0 = riverX(349) - RW - 10, bx1 = riverX(349) + RW + 10;
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(bx0, 337, bx1 - bx0, 24);
    ctx.strokeStyle = '#3e2a17'; ctx.lineWidth = 1.5; for (var px = bx0 + 7; px < bx1; px += 7) { ctx.beginPath(); ctx.moveTo(px, 337); ctx.lineTo(px, 361); ctx.stroke(); }
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(bx0 - 2, 333, bx1 - bx0 + 4, 4); ctx.fillRect(bx0 - 2, 361, bx1 - bx0 + 4, 4);
    // 橋到第 1 關的路
    ctx.strokeStyle = '#6e5a40'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx1, 349); ctx.lineTo(390, 349); ctx.stroke();
    // 燈柱(暖光)
    function lamp(x, y) { var lg = ctx.createRadialGradient(x, y - 26, 2, x, y - 26, 34); lg.addColorStop(0, 'rgba(255,190,110,0.35)'); lg.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 34, y - 60, 68, 68); ctx.fillStyle = '#20160e'; ctx.fillRect(x - 2, y - 24, 4, 26); ctx.beginPath(); ctx.arc(x, y - 27, 5, 0, Math.PI * 2); ctx.fillStyle = '#ffd08a'; ctx.fill(); }
    lamp(36, 372); lamp(262, 330); lamp(262, 140); lamp(36, 600);
    ctx.restore();
  }
  function shopCard(ctx, x, y, t) {
    ctx.save();
    rr(ctx, x, y, 176, 136, 8); ctx.fillStyle = '#3a2a1f'; ctx.fill();
    ctx.fillStyle = '#45321f'; ctx.fillRect(x + 2, y + 2, 172, 40);
    rr(ctx, x + 1.5, y + 1.5, 173, 133, 8); ctx.lineWidth = 3; ctx.strokeStyle = P.edge; ctx.stroke();
    ctx.fillStyle = '#1f1812'; ctx.fillRect(x + 8, y + 8, 160, 90);
    // 遮雨棚(紅白條 + 扇貝下緣)
    for (var i = 0; i < 8; i++) { var ax = x + 8 + i * 20; ctx.beginPath(); ctx.moveTo(ax, y + 8); ctx.lineTo(ax + 20, y + 8); ctx.lineTo(ax + 20, y + 18); ctx.arc(ax + 10, y + 18, 10, 0, Math.PI); ctx.closePath(); ctx.fillStyle = i % 2 ? P.parch : '#c8463a'; ctx.fill(); }
    ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.strokeRect(x + 8, y + 8, 160, 1);
    // 貨架 3×2: 每格 = 裝置圖示 + 剩餘數; 售完 = 灰底 + 斜線
    for (var j = 0; j < 6; j++) {
      var e = SHOP[j], c = j % 3, r = Math.floor(j / 3), sx = x + 11 + c * 52, sy = y + 32 + r * 33, sold = e.left <= 0, afford = e.price <= STOCK.crystal;
      rr(ctx, sx, sy, 50, 30, 4); ctx.fillStyle = sold ? '#3a3631' : '#3b2b1e'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
      ctx.save(); if (sold) ctx.globalAlpha *= 0.35; A.icons.item(ctx, e.type, sx + 15, sy + 15, 24); ctx.restore();
      if (sold) { ctx.strokeStyle = '#8a8476'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 4, sy + 26); ctx.lineTo(sx + 46, sy + 4); ctx.stroke(); }
      else txt(ctx, '×' + e.left, sx + 46, sy + 16, 12, afford ? P.cream : '#e07a72', 'right', true, 3, P.edge);
    }
    ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 8, y + 64, 160, 2); ctx.fillRect(x + 8, y + 97, 160, 2);
    // 名牌列
    rr(ctx, x + 6, y + 106, 164, 28, 4); ctx.fillStyle = P.parch; ctx.fill();
    txt(ctx, '商店', x + 14, y + 120.5, 14, P.ink, 'left', true);
    var have = 0; for (j = 0; j < 6; j++) if (SHOP[j].left > 0) have++;
    A.icons.mat(ctx, 'crystal', x + 68, y + 120, 14);
    txt(ctx, '有貨 ' + have + ' 種', x + 78, y + 121, 11, P.inkDim, 'left', true);
    // 有買得起的 → 右上金色「!」(和升級所卡片同款)
    var any = false; for (j = 0; j < 6; j++) if (SHOP[j].left > 0 && SHOP[j].price <= STOCK.crystal) any = true;
    if (any) { ctx.beginPath(); ctx.arc(x + 160, y + 18, 10, 0, Math.PI * 2); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.edge; ctx.stroke(); txt(ctx, '!', x + 160, y + 19, 14, P.ink, 'center', true); }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'map-layout', id: 'B', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      t = t || 0;
      ctx.save();
      mapField(ctx, 300, t);
      town(ctx);
      tree(ctx, [392, 616, 840, 1064], t);
      A.drawWorkshopCard(ctx, { x: 62, y: 150, anyAffordable: true, selected: false });
      shopCard(ctx, 62, 430, t);
      A.drawCardOverlay(ctx, { x: 62, y: 430, selected: true, replayP: null }); // 示意: 游標停在商店
      hudAndHint(ctx, 392);
      ctx.restore();
    }
  };
})();
