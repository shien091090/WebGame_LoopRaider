// map-layout 方案 C: 斜切工坊牆 + 展示架(紫色工坊牆以銅條斜邊壓在地圖上, 內容是展台與展示格)
// 升級所: 三職業立在展台上 + 2×2 強化計量; 商店: 3×2 展示格, 游標直接在格子間移動、Z 買下
// 關卡樹整組右移: 四欄 x = 432 / 644 / 856 / 1068(欄距縮到 212)
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

  // ---------- 方案 C 專屬: 斜切工坊牆 + 展示架 ----------
  // 左側是一面斜切的紫色工坊牆(和升級所頁同色系), 以一道銅條斜邊壓在地圖上; 牆上掛兩塊招牌。
  // 升級所 = 三職業立在展台上(已招募亮、未招募半透明 + 鎖 + 花費)+ 2×2 強化計量; 商店 = 3×2 展示格, 每格一件裝置。
  function slantX(y) { return 404 - 28 * (y - 40) / 680; }
  function wall(ctx) {
    ctx.save();
    // 地圖側陰影
    ctx.beginPath(); ctx.moveTo(slantX(40), 40); ctx.lineTo(slantX(40) + 20, 40); ctx.lineTo(slantX(H) + 20, H); ctx.lineTo(slantX(H), H); ctx.closePath();
    var sg = ctx.createLinearGradient(380, 0, 410, 0); sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(slantX(40), 40); ctx.lineTo(slantX(H), H); ctx.lineTo(0, H); ctx.closePath();
    ctx.save(); ctx.clip();
    var g = ctx.createLinearGradient(0, 40, 0, H); g.addColorStop(0, '#30233a'); g.addColorStop(1, '#221828'); ctx.fillStyle = g; ctx.fillRect(0, 40, 420, H - 40);
    for (var x = 0; x < 420; x += 28) { ctx.fillStyle = 'rgba(255,220,255,0.035)'; ctx.fillRect(x, 40, 12, H - 40); }
    ctx.restore();
    // 銅條斜邊(不用金: 金只代表選中)
    ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(slantX(40), 40); ctx.lineTo(slantX(H), H); ctx.lineWidth = 8; ctx.strokeStyle = '#4a3420'; ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#a8784a'; ctx.stroke();
    for (var y = 70; y < H; y += 80) { ctx.beginPath(); ctx.arc(slantX(y), y, 4, 0, Math.PI * 2); ctx.fillStyle = '#d9b47a'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke(); }
    // 兩區之間: 一條橫向木樑
    ctx.fillStyle = '#4a3420'; ctx.fillRect(0, 302, slantX(302), 8); ctx.fillStyle = 'rgba(255,215,160,0.18)'; ctx.fillRect(0, 302, slantX(302), 1.5);
    ctx.restore();
  }
  function sign(ctx, x, y, w, title) {
    ctx.save();
    ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 24, y - 10); ctx.moveTo(x + w - 14, y); ctx.lineTo(x + w - 24, y - 10); ctx.stroke();
    rr(ctx, x, y, w, 30, 5); ctx.fillStyle = P.board; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = P.edge; ctx.stroke();
    rr(ctx, x + 3, y + 3, w - 6, 24, 4); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.2)'; ctx.stroke();
    txt(ctx, title, x + w / 2, y + 15.5, 18, P.cream, 'center', true, 4, P.edge);
    ctx.restore();
  }
  function lock(ctx, cx, cy) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, 0); ctx.lineWidth = 3; ctx.strokeStyle = '#cfc2a2'; ctx.stroke();
    rr(ctx, -9, -3, 18, 13, 2.5); ctx.fillStyle = '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 3, 2, 0, Math.PI * 2); ctx.fillStyle = P.edge; ctx.fill();
    ctx.restore();
  }
  function upgradeWall(ctx, t) {
    sign(ctx, 16, 52, 120, '升級所');
    var heroes = [{ cls: 'sword', name: '劍士', owned: true }, RECRUIT[0], RECRUIT[1]];
    for (var i = 0; i < 3; i++) {
      var h = heroes[i], cx = 70 + i * 118;
      // 展台
      ctx.save();
      if (h.owned) { var lg = ctx.createRadialGradient(cx, 128, 4, cx, 128, 48); lg.addColorStop(0, 'rgba(255,230,190,0.18)'); lg.addColorStop(1, 'rgba(255,230,190,0)'); ctx.fillStyle = lg; ctx.fillRect(cx - 50, 80, 100, 90); }
      rr(ctx, cx - 38, 158, 76, 12, 3); ctx.fillStyle = '#5a4030'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke();
      ctx.fillStyle = '#7a5838'; ctx.fillRect(cx - 36, 158, 72, 3);
      ctx.translate(cx, 126); ctx.scale(1.8, 1.8); if (!h.owned) ctx.globalAlpha *= 0.3;
      A.drawPlayer(ctx, { x: 0, y: 0, cls: h.cls, facing: 1, pose: 'idle', poseT: t });
      ctx.restore();
      if (!h.owned) lock(ctx, cx, 128);
      txt(ctx, h.name, cx, 182, 14, h.owned ? P.cream : P.labelDim, 'center', true, 3, P.edge);
      if (h.owned) txt(ctx, '已解鎖', cx, 200, 12, P.goodLight, 'center', true, 3, P.edge);
      else { rr(ctx, cx - 40, 190, 80, 20, 4); ctx.fillStyle = P.parch; ctx.fill(); price(ctx, 'wood', h.cost, STOCK.wood, cx - 30, 200, 12); }
    }
    for (var j = 0; j < 4; j++) {
      var s = STATS[j], bx = 14 + (j % 2) * 184, by = 214 + Math.floor(j / 2) * 44;
      rr(ctx, bx, by, 176, 40, 6); ctx.fillStyle = P.parch; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.edge; ctx.stroke();
      txt(ctx, s.name, bx + 8, by + 12, 13, P.ink, 'left', true);
      for (var q = 0; q < s.max; q++) { rr(ctx, bx + 8 + q * 18, by + 23, 14, 10, 2); ctx.fillStyle = q < s.lv ? P.core : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke(); }
      if (s.lv >= s.max) txt(ctx, '已滿', bx + 168, by + 28, 12, P.inkDim, 'right', true);
      else price(ctx, 'core', s.cost, STOCK.core, bx + 90, by + 28, 12);
    }
  }
  var SEL = 0; // 示意: 游標停在第 0 格
  function shopWall(ctx) {
    sign(ctx, 16, 320, 100, '商店');
    rr(ctx, 236, 321, 124, 28, 5); ctx.fillStyle = P.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke();
    txt(ctx, '持有', 246, 335.5, 11, P.inkDim, 'left', true); A.icons.mat(ctx, 'crystal', 284, 335, 18); txt(ctx, String(STOCK.crystal), 296, 336, 16, P.ink, 'left', true);
    for (var i = 0; i < 6; i++) {
      var e = SHOP[i], c = i % 3, r = Math.floor(i / 3), sel = i === SEL, sold = e.left <= 0;
      var x = 16 + c * 118, y = 362 + r * 152 - (sel ? 4 : 0), cx = x + 54;
      if (sel) { rr(ctx, x + 2, y + 8, 108, 140, 7); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); }
      rr(ctx, x, y, 108, 140, 7); ctx.fillStyle = sold ? '#8a8270' : P.parch; ctx.fill();
      if (sel) { ctx.lineWidth = 3.5; ctx.strokeStyle = P.select; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 8, y - 5); ctx.lineTo(cx + 8, y - 5); ctx.lineTo(cx, y + 5); ctx.closePath(); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke(); }
      else { ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke(); }
      ctx.save(); if (sold) ctx.globalAlpha *= 0.45;
      ctx.beginPath(); ctx.ellipse(cx, y + 50, 26, 5, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(60,40,20,0.2)'; ctx.fill();
      A.icons.item(ctx, e.type, cx, y + 30, 40);
      txt(ctx, e.name, cx, y + 66, 13, P.ink, 'center', true);
      txt(ctx, e.fx, cx, y + 84, 10, P.inkDim, 'center', true);
      ctx.restore();
      if (sold) {
        ctx.save(); ctx.translate(cx, y + 112); ctx.rotate(-0.12); rr(ctx, -34, -12, 68, 24, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = '#3e3a30'; ctx.stroke(); txt(ctx, '售完', 0, 0.5, 15, '#3e3a30', 'center', true); ctx.restore();
      } else {
        price(ctx, 'crystal', e.price, STOCK.crystal, x + 10, y + 104, 13);
        pips(ctx, cx - (e.max - 1) * 5.5, y + 126, e.left, e.max, 4);
      }
    }
    var kw = A.icons.key(ctx, 'Z', 28, 678, 12, true) || 20;
    txt(ctx, '買下選中的裝置', 28 + kw / 2 + 5, 678, 12, P.cream, 'left', true, 3, P.edge);
  }

  window.VISUAL_OPTION = {
    element: 'map-layout', id: 'C', kind: 'static',
    size: [1280, 720], duration: 0, loop: false,
    draw: function (ctx, t) {
      t = t || 0;
      ctx.save();
      mapField(ctx, 370, t);
      tree(ctx, [432, 644, 856, 1068], t);
      wall(ctx);
      upgradeWall(ctx, t);
      shopWall(ctx);
      hudAndHint(ctx, 432);
      ctx.restore();
    }
  };
})();
