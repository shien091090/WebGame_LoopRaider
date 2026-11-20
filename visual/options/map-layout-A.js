// map-layout 方案 A: 實心木板側欄(介面材質 vs 地圖紙面, 直線硬邊 + 角釘)
// 左側 0~336 是一整條木板側欄, 上半升級所、下半商店, 內容直接列在側欄裡(游標可直接進列表買 / 強化, 不再開彈窗)
// 關卡樹整組右移: 四欄 x = 360 / 596 / 832 / 1068
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

  // ---------- 方案 A 專屬: 木板側欄 ----------
  var SX = 336; // 側欄右緣
  function sidebar(ctx) {
    ctx.save();
    // 投影到地圖上(硬邊旁一條陰影, 讓側欄「蓋在」地圖上)
    var sg = ctx.createLinearGradient(SX, 0, SX + 18, 0); sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(SX, 40, 18, H - 40);
    ctx.fillStyle = P.board; ctx.fillRect(0, 40, SX, H - 40);
    for (var y = 40, k = 0; y < H; y += 26, k++) { ctx.fillStyle = k % 2 ? P.plankUi : P.board; ctx.fillRect(0, y, SX, 26); ctx.fillStyle = P.seam; ctx.fillRect(0, y + 25, SX, 1.2); }
    ctx.fillStyle = P.edge; ctx.fillRect(SX - 6, 40, 6, H - 40);
    ctx.fillStyle = 'rgba(255,215,160,0.16)'; ctx.fillRect(SX - 8, 40, 1.5, H - 40);
    var nails = [[12, 52], [SX - 18, 52], [12, H - 14], [SX - 18, H - 14], [12, 306], [SX - 18, 306]];
    for (var i = 0; i < nails.length; i++) { ctx.beginPath(); ctx.arc(nails[i][0], nails[i][1], 3, 0, Math.PI * 2); ctx.fillStyle = P.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke(); }
    ctx.restore();
  }
  function header(ctx, title, y, right) {
    txt(ctx, title, 22, y, 20, P.cream, 'left', true, 4, P.edge);
    if (right) right();
  }
  function anvilGlyph(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineWidth = 1.5; ctx.strokeStyle = '#120c08';
    ctx.beginPath(); ctx.moveTo(-11, -3); ctx.lineTo(8, -3); ctx.lineTo(12, 0); ctx.lineTo(5, 2); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.lineTo(-5, 2); ctx.lineTo(-11, 0); ctx.closePath(); ctx.fillStyle = '#8a92a4'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-6, 5, 12, 3);
    ctx.restore();
  }
  function stallGlyph(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-12 + i * 6, -8); ctx.lineTo(-6 + i * 6, -8); ctx.lineTo(-6 + i * 6, -2); ctx.arc(-9 + i * 6, -2, 3, 0, Math.PI); ctx.closePath(); ctx.fillStyle = i % 2 ? P.parch : '#c8463a'; ctx.fill(); }
    ctx.fillStyle = '#6a3a14'; ctx.fillRect(-11, 1, 22, 7); ctx.restore();
  }
  function upgradeBlock(ctx) {
    header(ctx, '升級所', 66);
    anvilGlyph(ctx, 104, 66);
    // 招募兩格
    for (var i = 0; i < 2; i++) {
      var rc = RECRUIT[i], x = 16 + i * 154, y = 84;
      rr(ctx, x, y, 146, 44, 6); ctx.fillStyle = rc.owned ? '#dfe9d6' : P.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = rc.owned ? P.good : P.edge; ctx.stroke();
      A.icons.cls(ctx, rc.cls, x + 20, y + 22, 22);
      txt(ctx, rc.name, x + 38, y + 14, 14, P.ink, 'left', true);
      if (rc.owned) txt(ctx, '✓ 已解鎖', x + 38, y + 32, 12, P.good, 'left', true);
      else price(ctx, 'wood', rc.cost, STOCK.wood, x + 38, y + 32, 13);
    }
    // 四列強化
    for (var j = 0; j < 4; j++) {
      var s = STATS[j], y2 = 136 + j * 40;
      rr(ctx, 16, y2, 304, 34, 6); ctx.fillStyle = P.parch; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.edge; ctx.stroke();
      txt(ctx, s.name, 26, y2 + 17, 14, P.ink, 'left', true);
      for (var q = 0; q < s.max; q++) { rr(ctx, 104 + q * 20, y2 + 11, 16, 12, 2); ctx.fillStyle = q < s.lv ? P.core : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke(); }
      if (s.lv >= s.max) txt(ctx, '已滿', 310, y2 + 17, 13, P.inkDim, 'right', true);
      else price(ctx, 'core', s.cost, STOCK.core, 196, y2 + 17, 13);
    }
  }
  var SEL = 0; // 示意: 游標停在商店第 0 列
  function shopBlock(ctx) {
    header(ctx, '商店', 328);
    stallGlyph(ctx, 82, 328);
    rr(ctx, 210, 314, 110, 28, 5); ctx.fillStyle = P.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke();
    txt(ctx, '持有', 218, 328.5, 11, P.inkDim, 'left', true); A.icons.mat(ctx, 'crystal', 254, 328, 18); txt(ctx, String(STOCK.crystal), 266, 329, 16, P.ink, 'left', true);
    for (var i = 0; i < SHOP.length; i++) {
      var e = SHOP[i], y = 352 + i * 42, sold = e.left <= 0, sel = i === SEL;
      rr(ctx, 16, y, 304, 36, 6); ctx.fillStyle = sold ? '#9a917c' : P.parch; ctx.fill();
      if (sel) { ctx.lineWidth = 3.5; ctx.strokeStyle = P.select; ctx.stroke(); selArrow(ctx, 3, y + 18); }
      else { ctx.lineWidth = 1.2; ctx.strokeStyle = P.edge; ctx.stroke(); }
      ctx.save(); if (sold) ctx.globalAlpha *= 0.5;
      A.icons.item(ctx, e.type, 36, y + 18, 28);
      txt(ctx, e.name, 56, y + 18, 14, P.ink, 'left', true);
      ctx.restore();
      if (sold) {
        ctx.save(); ctx.translate(250, y + 18); ctx.rotate(-0.08); rr(ctx, -34, -11, 68, 22, 4); ctx.lineWidth = 2.2; ctx.strokeStyle = '#4a4538'; ctx.stroke(); txt(ctx, '售完', 0, 0.5, 14, '#4a4538', 'center', true); ctx.restore();
      } else {
        price(ctx, 'crystal', e.price, STOCK.crystal, 140, y + 18, 13);
        pips(ctx, 312 - (e.max - 1) * 11, y + 18, e.left, e.max, 4);
      }
    }
    // 選中項說明列
    var s = SHOP[SEL], dy = 608;
    rr(ctx, 16, dy, 304, 70, 6); ctx.fillStyle = P.groove; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
    txt(ctx, s.name, 28, dy + 20, 15, P.cream, 'left', true);
    txt(ctx, s.fx, 28, dy + 46, 13, P.labelDim, 'left', true);
    txt(ctx, '剩 ' + s.left + ' / ' + s.max, 308, dy + 20, 12, P.labelDim, 'right', true);
    var kw = A.icons.key(ctx, 'Z', 246, dy + 47, 13, true) || 22;
    txt(ctx, '買下', 246 + kw / 2 + 5, dy + 47, 13, P.cream, 'left', true);
  }

  window.VISUAL_OPTION = {
    element: 'map-layout', id: 'A', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      t = t || 0;
      ctx.save();
      mapField(ctx, SX, t);
      tree(ctx, [360, 596, 832, 1068], t);
      sidebar(ctx);
      // 側欄內兩區之間: 一道凹槽橫線
      ctx.fillStyle = P.edge; ctx.fillRect(10, 300, SX - 22, 3); ctx.fillStyle = 'rgba(255,215,160,0.14)'; ctx.fillRect(10, 303, SX - 22, 1);
      upgradeBlock(ctx);
      shopBlock(ctx);
      hudAndHint(ctx, 360);
      ctx.restore();
    }
  };
})();
