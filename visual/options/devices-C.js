/* devices 方案 C — 嵌牆圓盤機關: 方石座嵌在牆上, 外環顏色分種類、中心一個大符號; 名稱一律「X X 機關」。
 * 底版 art.js 先載入(全域 Art); 素材圖示、鍵帽、色票沿用 Art。只定義 window.VISUAL_OPTION。 */
(function () {
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var A = (typeof window !== 'undefined' && window.Art) ? window.Art : null;
  var P = (A && A.palette) || {};
  function pc(n, d) { return P[n] || d; }
  var K = { board: '#3a2a1f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a', groove: '#2a1d14', parch: '#efe3c6', ink: '#2b2118', inkDim: '#76664e',
    cream: '#f3e6c8', labelDim: '#c9b896', select: '#ffd84a', selectDeep: '#b8860b', short: '#c8202c', good: '#2f8f55' };

  // ---------- 共用小工具(照 art.js 介面方案 A 的畫法) ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]); }
  function line(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || K.edge; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : String(s).length * px; }
  function mat(ctx, kind, x, y, s) { if (A && A.icons && A.icons.mat) A.icons.mat(ctx, kind, x, y, s); else { circle(ctx, x, y, s / 2); ctx.fillStyle = pc(kind, '#888'); ctx.fill(); } }
  function key(ctx, label, x, y, px, hot) {
    if (A && A.icons && A.icons.key) { var w = A.icons.key(ctx, label, x, y, px, hot); return isFinite(w) ? w : px * 1.7; }
    rr(ctx, x - px * 0.85, y - px * 0.7, px * 1.7, px * 1.4, 4); ctx.fillStyle = '#ece4d2'; ctx.fill(); text(ctx, label, x, y, px, K.ink, 'center', true); return px * 1.7;
  }
  function keyRow(ctx, items, x, y, px) {
    var cx = x;
    for (var i = 0; i < items.length; i++) {
      var kw = Math.max(px * 1.7, tw(ctx, items[i][0], px, true) + px * 0.9);
      key(ctx, items[i][0], cx + kw / 2, y, px, false);
      text(ctx, items[i][1], cx + kw + 5, y, px, K.cream, 'left', true, 3, K.edge);
      cx += kw + 5 + tw(ctx, items[i][1], px, true) + px * 1.4;
    }
  }
  function board(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = K.board; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { circle(ctx, n[i][0], n[i][1], 2.6); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke(); }
    ctx.restore();
  }
  function tag(ctx, x, y, w, h, sel) {
    ctx.save();
    if (sel === 'hot') { rr(ctx, x + 2, y + 3, w, h, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); y -= 3; }
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = K.parch; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
    if (sel === 'hot') {
      rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 7); ctx.lineWidth = 4; ctx.strokeStyle = K.select; ctx.stroke();
      poly(ctx, [x + w / 2 - 8, y - 4, x + w / 2 + 8, y - 4, x + w / 2, y + 5]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    } else { rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.stroke(); }
    ctx.restore();
    return y;
  }
  function groove(ctx, x, y, w, h, label, on) {
    ctx.save();
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = on ? '#33261a' : K.groove; ctx.fill();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 6); ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? K.select : 'rgba(0,0,0,0.6)'; ctx.stroke();
    if (on) { poly(ctx, [x - 14, y + h / 2 - 9, x - 2, y + h / 2, x - 14, y + h / 2 + 9]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
    if (label) text(ctx, label, x + 10, y + 11, 12, on ? K.select : K.labelDim, 'left', true, 3, K.edge);
    ctx.restore();
  }
  function badge(ctx, s, x, y) { // 數量章 ×N
    var w = tw(ctx, s, 12, true) + 10;
    rr(ctx, x - w, y - 9, w, 18, 9); ctx.fillStyle = K.ink; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.cream; ctx.stroke();
    text(ctx, s, x - w / 2, y + 0.5, 12, '#ffffff', 'center', true);
  }

  // ---------- 資料(道具代碼不變, 只換名稱與畫法) ----------
  var TYPES = ['bagWood', 'bagStone', 'bagCrystal', 'coreLamp', 'glove', 'horn', 'heart', 'gear'];
  var OLD = { bagWood: '木材袋', bagStone: '石頭袋', bagCrystal: '水晶袋', coreLamp: '魔核燈', glove: '拾荒手套', horn: '獵人號角', heart: '巢母之心', gear: '加速齒輪' };
  var FX = { bagWood: ['每次通關 +4 木材'], bagStone: ['每次通關 +3 石頭'], bagCrystal: ['每次通關 +2 水晶'], coreLamp: ['每次通關 +2 魔核'],
    glove: ['撿到的素材 +1'], horn: ['打怪掉落 ×2'], heart: ['打怪掉落 ×2', '通關 +4 魔核'], gear: ['回放速度 +25%'] };
  var CAT = { bagWood: '通關產出', bagStone: '通關產出', bagCrystal: '通關產出', coreLamp: '通關產出', glove: '撿拾加成', horn: '掉落加成', heart: '掉落 + 產出', gear: '回放加速' };
  var NAME = { bagWood: '聚木機關', bagStone: '聚石機關', bagCrystal: '聚晶機關', coreLamp: '聚核機關', glove: '拾遺機關', horn: '驅獸機關', heart: '巢心機關', gear: '疾時機關' };
  // 倉庫裡還沒安裝的(同種合併計數); 驅獸機關裝在本關 1 號格、聚晶機關裝在 2 號格, 所以不列
  var STORE = [{ type: 'gear', n: 3 }, { type: 'bagWood', n: 1 }, { type: 'bagStone', n: 2 }, { type: 'coreLamp', n: 1 }, { type: 'glove', n: 1 }, { type: 'heart', n: 1 }];

  // ---------- 方案 C 的裝置畫法: 嵌在牆上的圓盤機關(方石座 + 色環 + 中心符號) ----------
  // 色環 = 種類: 四種「通關產出」用該素材色 + 四個向內凹口(「聚」), 拾遺金、驅獸橘、巢心紫(發光)、疾時銅色齒環
  var PLATE = '#4a4652', PLATE_L = '#6a6574', INK = '#140e08';
  var RIM = { bagWood: pc('wood', '#b8682a'), bagStone: pc('stone', '#a9b3be'), bagCrystal: pc('crystal', '#3fd6ea'), coreLamp: pc('core', '#d94bc6'),
    glove: pc('gold', '#f2c94c'), horn: '#e0843a', heart: pc('brood', '#c264ff'), gear: '#c98a3a' };
  var MATK = { bagWood: 'wood', bagStone: 'stone', bagCrystal: 'crystal', coreLamp: 'core' };
  function dev(ctx, type, x, y, size) {
    var k = size / 32, lw = Math.max(1.6, 1.1 / k), i, a;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = INK;
    function fs(c) { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); }
    // 方石座 + 四角鉚釘(嵌在牆上)
    rr(ctx, -15.5, -15.5, 31, 31, 4); fs(PLATE);
    rr(ctx, -13.5, -13.5, 27, 4, 2); ctx.fillStyle = PLATE_L; ctx.fill();
    ctx.fillStyle = '#c9c2b0'; var rv = [[-12, -12], [12, -12], [-12, 12], [12, 12]];
    for (i = 0; i < 4; i++) { circle(ctx, rv[i][0], rv[i][1], 1.5); ctx.fill(); }
    var rim = RIM[type] || RIM.bagWood;
    if (type === 'gear') { // 齒環
      ctx.beginPath();
      for (i = 0; i < 12; i++) { a = i * TAU / 12; ctx.lineTo(Math.cos(a - 0.12) * 13.6, Math.sin(a - 0.12) * 13.6); ctx.lineTo(Math.cos(a + 0.12) * 13.6, Math.sin(a + 0.12) * 13.6); ctx.lineTo(Math.cos(a + 0.26) * 11.2, Math.sin(a + 0.26) * 11.2); }
      ctx.closePath(); fs(rim);
    } else {
      if (type === 'heart') { ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = 9; circle(ctx, 0, 0, 12.6); ctx.fillStyle = rim; ctx.fill(); ctx.restore(); }
      circle(ctx, 0, 0, 12.6); fs(rim);
    }
    circle(ctx, 0, 0, 9.4); ctx.fillStyle = '#1d1a24'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke(); ctx.lineWidth = lw;
    if (MATK[type]) {
      ctx.fillStyle = '#1d1a24';
      for (i = 0; i < 4; i++) { a = i * TAU / 4 - Math.PI / 4; var cx = Math.cos(a), cy = Math.sin(a), px = -cy, py = cx; poly(ctx, [cx * 13.4 + px * 2.6, cy * 13.4 + py * 2.6, cx * 13.4 - px * 2.6, cy * 13.4 - py * 2.6, cx * 10, cy * 10]); ctx.fill(); }
      mat(ctx, MATK[type], 0, 0, 13);
    } else if (type === 'glove') { // 磁鐵(吸更多): 開口朝上的 U + 銀頭 + 金星
      ctx.lineWidth = lw * 2.2; ctx.strokeStyle = '#e8e2d4'; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(-4.5, -4); ctx.lineTo(-4.5, 0.5); ctx.arc(0, 0.5, 4.5, Math.PI, 0, true); ctx.lineTo(4.5, -4); ctx.stroke();
      ctx.strokeStyle = '#8d97a6'; ctx.beginPath(); ctx.moveTo(-4.5, -6.5); ctx.lineTo(-4.5, -4); ctx.moveTo(4.5, -6.5); ctx.lineTo(4.5, -4); ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = INK;
      star4(ctx, 0, -4, 2.8); ctx.fillStyle = rim; ctx.fill();
    } else if (type === 'horn') { // 號角
      ctx.beginPath(); ctx.moveTo(-7, 4); ctx.quadraticCurveTo(-2, -0.5, 4, -6); ctx.lineTo(7, -2.5); ctx.quadraticCurveTo(0, 2.5, -5.5, 7); ctx.closePath();
      ctx.fillStyle = '#efe2c4'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
      ell(ctx, 5.6, -4.3, 1.8, 2.8); ctx.fillStyle = rim; ctx.fill();
    } else if (type === 'heart') {
      ctx.save(); ctx.scale(0.5, 0.5); ctx.translate(0, 0.5);
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-15, 2, -13, -12, -5, -11); ctx.quadraticCurveTo(-1, -10, 0, -6); ctx.quadraticCurveTo(1, -10, 5, -11); ctx.bezierCurveTo(13, -12, 15, 2, 0, 12); ctx.closePath();
      ctx.fillStyle = '#b05ae8'; ctx.fill(); ctx.lineWidth = lw * 2; ctx.strokeStyle = pc('gold', '#f2c94c'); ctx.stroke(); ctx.restore();
    } else { // gear 疾時: ▶▶
      ctx.fillStyle = '#ffffff'; poly(ctx, [-6, -4.5, -1, 0, -6, 4.5]); ctx.fill(); poly(ctx, [-0.5, -4.5, 4.5, 0, -0.5, 4.5]); ctx.fill();
    }
    ctx.restore();
  }

  // 安裝情境: 礦坑石磚牆, 圓盤嵌在牆面
  function scene(ctx, x, y, w, h) {
    ctx.fillStyle = '#3a302b'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#231c18'; ctx.lineWidth = 2;
    for (var r = 0; r * 22 < h; r++) {
      var yy = y + r * 22; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      for (var c = (r % 2) * 20; c < w; c += 40) { ctx.beginPath(); ctx.moveTo(x + c, yy); ctx.lineTo(x + c, yy + 22); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,170,90,0.10)'; ell(ctx, x + w / 2, y + h / 2 - 4, 54, 50); ctx.fill();
  }

  // 倉庫面板本體: 左清單 + 右大預覽(遊戲座標: 面板左上 (240,120) 800×480)
  function storeBody(ctx, sel) {
    var cells = [{ remove: true }].concat(STORE), i;
    for (i = 0; i < cells.length; i++) {
      var y = 172 + 52 * i, isSel = i === sel;
      var yy = tag(ctx, 284, y, 380, 46, isSel ? 'hot' : null);
      if (isSel) { poly(ctx, [268, yy + 14, 280, yy + 23, 268, yy + 32]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke(); }
      if (cells[i].remove) {
        ctx.save(); ctx.setLineDash([3, 3]); rr(ctx, 296, yy + 7, 32, 32, 4); ctx.lineWidth = 1.5; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.restore();
        ctx.lineWidth = 2.5; ctx.strokeStyle = K.ink; line(ctx, [312, yy + 32, 312, yy + 14]); line(ctx, [306, yy + 20, 312, yy + 14, 318, yy + 20]);
        text(ctx, '拆下', 342, yy + 23.5, 16, K.ink, 'left', true);
        text(ctx, '把這一格清空, 裝置回到倉庫', 654, yy + 23.5, 12, K.inkDim, 'right', true);
      } else {
        var t = cells[i].type;
        dev(ctx, t, 312, yy + 23, 34);
        text(ctx, NAME[t], 342, yy + 16, 16, K.ink, 'left', true);
        text(ctx, FX[t].join('、'), 342, yy + 35, 11, K.inkDim, 'left', true);
        text(ctx, '×' + cells[i].n, 652, yy + 23.5, 18, cells[i].n > 1 ? K.ink : K.inkDim, 'right', true);
      }
    }
    // 右側預覽
    var cur = cells[sel];
    ctx.save(); rr(ctx, 684, 172, 324, 250, 8); ctx.clip(); scene(ctx, 684, 172, 324, 250); ctx.restore();
    rr(ctx, 684, 172, 324, 250, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    if (cur && !cur.remove) {
      dev(ctx, cur.type, 846, 290, 150);
      var dy = tag(ctx, 684, 432, 324, 92, null);
      text(ctx, NAME[cur.type], 700, dy + 22, 20, K.ink, 'left', true);
      text(ctx, CAT[cur.type], 992, dy + 22, 12, K.inkDim, 'right', true);
      text(ctx, FX[cur.type].join('、'), 700, dy + 50, 14, K.ink, 'left', true);
      text(ctx, '倉庫裡 ' + cur.n + ' 座 · Z 安裝到 2 號格', 700, dy + 74, 12, K.inkDim, 'left', true);
    }
    text(ctx, '只列還沒安裝的; 換裝時原本的「' + NAME.bagCrystal + '」回到倉庫', 284, 540, 12, K.labelDim, 'left', true, 3, K.edge);
  }

  var O = { id: 'C', title: '方案 C  嵌牆圓盤機關', sub: '方石座嵌在牆上, 外環顏色 = 種類, 中心一個大符號; 名稱一律「X X 機關」', dev: dev, scene: scene, body: storeBody, sel: 1 };

  function tile(ctx, type, x, y) {
    tag(ctx, x, y, 300, 196, null);
    ctx.save(); rr(ctx, x + 10, y + 10, 116, 116, 6); ctx.clip(); O.scene(ctx, x + 10, y + 10, 116, 116); ctx.restore();
    rr(ctx, x + 10, y + 10, 116, 116, 6); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    O.dev(ctx, type, x + 68, y + 70, 80);
    rr(ctx, x + 10, y + 136, 116, 22, 11); ctx.fillStyle = '#e0d2b0'; ctx.fill();
    text(ctx, CAT[type], x + 68, y + 147.5, 12, K.inkDim, 'center', true);
    text(ctx, NAME[type], x + 138, y + 28, 20, K.ink, 'left', true);
    text(ctx, '原「' + OLD[type] + '」', x + 138, y + 52, 11, K.inkDim, 'left', true);
    for (var i = 0; i < FX[type].length; i++) text(ctx, FX[type][i], x + 138, y + 76 + i * 18, 13, K.ink, 'left', true);
    var sz = [40, 24, 18], cx = x + 138;
    for (i = 0; i < 3; i++) {
      var b = sz[i] + 8, by = y + 150 - b / 2;
      rr(ctx, cx, by, b, b, 4); ctx.fillStyle = '#20160e'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#6a5038'; ctx.stroke();
      O.dev(ctx, type, cx + b / 2, by + b / 2, sz[i]);
      text(ctx, sz[i] + 'px', cx + b / 2, y + 184, 10, K.inkDim, 'center', true);
      cx += b + 12;
    }
  }
  function slotRow(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.scale(0.875, 0.875); ctx.translate(-720, -286);
    groove(ctx, 720, 286, 480, 120, '裝置格', true);
    var inst = ['horn', 'bagCrystal'];
    for (var i = 0; i < 2; i++) {
      var ox = 728 + 238 * i, sel = i === 1, t = inst[i];
      var y2 = tag(ctx, ox, 310, 230, 88, sel ? 'hot' : null);
      text(ctx, (i + 1) + ' 號格', ox + 8, y2 + 12, 11, K.inkDim, 'left', true);
      O.dev(ctx, t, ox + 30, y2 + 50, 40);
      text(ctx, NAME[t], ox + 56, y2 + 40, 15, K.ink, 'left', true);
      text(ctx, FX[t][0], ox + 56, y2 + 60, 11, K.inkDim, 'left', true);
      if (sel) text(ctx, 'Z 打開倉庫', ox + 222, y2 + 12, 11, K.ink, 'right', true);
    }
    ctx.restore();
  }
  function cardStrips(ctx, x, y) {
    text(ctx, '大地圖卡片的裝置格(實際大小: 格 22、圖示 18)', x, y, 13, K.cream, 'left', true, 3, K.edge);
    var sets = [[null, null], ['bagWood', 'bagStone'], ['bagCrystal', 'coreLamp'], ['glove', 'horn'], ['heart', 'gear']];
    for (var i = 0; i < sets.length; i++) {
      var sy = y + 18 + i * 38;
      rr(ctx, x, sy, 176, 32, 5); ctx.fillStyle = '#5b4026'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
      text(ctx, '裝置', x + 10, sy + 16.5, 11, K.cream, 'left', true);
      var names = [];
      for (var j = 0; j < 2; j++) {
        var t = sets[i][j], sx = x + 46 + j * 28;
        rr(ctx, sx, sy + 5, 22, 22, 4); ctx.fillStyle = '#1c130c'; ctx.fill();
        if (t) { O.dev(ctx, t, sx + 11, sy + 16, 18); names.push(NAME[t]); }
        else { ctx.save(); ctx.setLineDash([3, 3]); rr(ctx, sx + 0.5, sy + 5.5, 21, 21, 4); ctx.lineWidth = 1; ctx.strokeStyle = '#b8ab8e'; ctx.stroke(); ctx.restore(); }
      }
      text(ctx, names.length ? names.join(' · ') : '沒裝裝置 = 空格', x + 186, sy + 16.5, 12, K.labelDim, 'left', true, 3, K.edge);
    }
  }
  function page(ctx) {
    ctx.save();
    ctx.fillStyle = '#14222a'; ctx.fillRect(0, 0, 1280, 980);
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; for (var gx = 0; gx < 1280; gx += 40) ctx.fillRect(gx, 0, 1, 980); for (var gy = 0; gy < 980; gy += 40) ctx.fillRect(0, gy, 1280, 1);
    text(ctx, O.title, 20, 24, 20, K.select, 'left', true, 4, K.edge);
    text(ctx, O.sub, 20 + tw(ctx, O.title, 20, true) + 18, 24.5, 14, K.cream, 'left', true, 3, K.edge);
    for (var i = 0; i < 8; i++) tile(ctx, TYPES[i], 20 + 312 * (i % 4), 48 + 206 * Math.floor(i / 4));
    // 裝置倉庫(遊戲中的實際大小, 原背包)
    ctx.save(); ctx.translate(20 - 240, 476 - 120);
    board(ctx, 240, 120, 800, 480);
    text(ctx, '裝置倉庫 — 裝到 2 號格', 264, 148, 20, K.cream, 'left', true, 4, K.edge);
    var lab = '目前裝著', lw0 = tw(ctx, NAME.bagCrystal, 14, true);
    text(ctx, NAME.bagCrystal, 1016, 148, 14, K.cream, 'right', true, 3, K.edge);
    O.dev(ctx, 'bagCrystal', 1016 - lw0 - 16, 148, 24);
    text(ctx, lab, 1016 - lw0 - 32, 148, 12, K.labelDim, 'right', true, 3, K.edge);
    O.body(ctx, O.sel);
    keyRow(ctx, [['←→↑↓', '選擇'], ['Z', '安裝'], ['X', '返回']], 272, 568, 13);
    ctx.restore();
    text(ctx, '準備頁 · 裝置格(原道具格, 0.875 倍)', 840, 488, 13, K.cream, 'left', true, 3, K.edge);
    slotRow(ctx, 852, 508);
    cardStrips(ctx, 840, 650);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'devices', id: 'C', kind: 'static',
    size: [1280, 980], duration: 0, loop: false,
    draw: function (ctx, t) { page(ctx); }
  };
})();
