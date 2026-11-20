/* devices 方案 B — 村落小建築: 每個裝置是一座蓋在關卡地上的小木屋 / 棚 / 塔, 輪廓各不相同; 名稱是地點名(XX小屋、XX棚、XX塔)。
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
  var NAME = { bagWood: '木料小屋', bagStone: '採石棚', bagCrystal: '晶簇溫室', coreLamp: '魂燈亭', glove: '拾荒攤', horn: '號角塔', heart: '巢母祭壇', gear: '水車坊' };
  // 倉庫裡還沒安裝的(同種合併計數); 號角塔裝在本關 1 號格、晶簇溫室裝在 2 號格, 所以不列
  var STORE = [{ type: 'gear', n: 3 }, { type: 'bagWood', n: 1 }, { type: 'bagStone', n: 2 }, { type: 'coreLamp', n: 1 }, { type: 'glove', n: 1 }, { type: 'heart', n: 1 }];

  // ---------- 方案 B 的裝置畫法: 一座座木造小建築, 每座輪廓不同 ----------
  var WALL = '#c08a52', WALL_D = '#7a4a24', ROOF = '#8a3a22', INK = '#140e08', TIN = '#6d7a88', BRASS = '#d9a54a';
  function dev(ctx, type, x, y, size) {
    var k = size / 32, lw = Math.max(1.6, 1.1 / k), i, a;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = INK;
    function fs(c) { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); }
    function planks(x0, y0, w, h) { ctx.save(); ctx.strokeStyle = 'rgba(70,40,15,0.55)'; ctx.lineWidth = lw * 0.5; for (var yy = y0 + 4; yy < y0 + h - 1; yy += 4) line(ctx, [x0 + 1, yy, x0 + w - 1, yy]); ctx.restore(); }
    if (type === 'bagStone') { // 採石棚: 兩根柱 + 斜鐵皮頂 + 棚下石堆
      ctx.lineWidth = lw * 1.5; ctx.strokeStyle = WALL_D; line(ctx, [-12, -6, -12, 15]); line(ctx, [12, -2, 12, 15]); ctx.strokeStyle = INK; ctx.lineWidth = lw;
      poly(ctx, [-16, -10, 16, -5, 16, -1, -16, -6]); fs(TIN);
      mat(ctx, 'stone', -5, 10, 11); mat(ctx, 'stone', 5.5, 10, 11); mat(ctx, 'stone', 0, 3, 11);
    } else if (type === 'bagCrystal') { // 晶簇溫室: 玻璃圓頂 + 晶簇
      rr(ctx, -16, 11, 32, 4.5, 1); fs(WALL_D);
      ctx.beginPath(); ctx.arc(0, 11, 14, Math.PI, 0); ctx.closePath(); ctx.fillStyle = 'rgba(160,236,248,0.32)'; ctx.fill();
      mat(ctx, 'crystal', 0, 3, 15);
      ctx.beginPath(); ctx.arc(0, 11, 14, Math.PI, 0); ctx.stroke();
      ctx.lineWidth = lw * 0.7; line(ctx, [0, -3, 0, 11]); ctx.beginPath(); ctx.arc(0, 11, 8, Math.PI, 0); ctx.stroke(); ctx.lineWidth = lw;
    } else if (type === 'coreLamp') { // 魂燈亭: 小亭頂 + 吊燈 + 石座
      rr(ctx, -2, 2, 4, 11, 1); fs(WALL_D);
      rr(ctx, -9, 12, 18, 4, 1); fs('#8a8478');
      ctx.fillStyle = 'rgba(217,75,198,0.28)'; circle(ctx, 0, -1, 10); ctx.fill();
      poly(ctx, [-16, -7, -10, -10, 0, -16, 10, -10, 16, -7, 0, -9]); fs(ROOF);
      line(ctx, [0, -9, 0, -6]);
      rr(ctx, -6, -6, 12, 11, 3); ctx.fillStyle = 'rgba(255,220,250,0.4)'; ctx.fill(); ctx.stroke();
      mat(ctx, 'core', 0, -0.5, 10);
    } else if (type === 'glove') { // 拾荒攤: 條紋遮棚 + 櫃台 + 素材籃
      ctx.lineWidth = lw * 1.3; ctx.strokeStyle = WALL_D; line(ctx, [-13, -7, -13, 5]); line(ctx, [13, -7, 13, 5]); ctx.strokeStyle = INK; ctx.lineWidth = lw;
      rr(ctx, -15, 4, 30, 11, 1.5); fs(WALL); planks(-15, 4, 30, 11);
      for (i = 0; i < 4; i++) { poly(ctx, [-16 + i * 8, -12, -8 + i * 8, -12, -9 + i * 8, -6, -15 + i * 8, -6]); ctx.fillStyle = i % 2 ? '#fff3d6' : pc('gold', '#f2c94c'); ctx.fill(); }
      poly(ctx, [-16, -12, 16, -12, 15, -6, -15, -6]); ctx.stroke();
      ell(ctx, 0, 3, 8, 3.5); fs('#a87a40');
      mat(ctx, 'wood', -3.5, 0, 8); mat(ctx, 'stone', 3.5, 0, 8);
      star4(ctx, 9, -1, 3.2); ctx.fillStyle = '#fff6c0'; ctx.fill();
    } else if (type === 'horn') { // 號角塔: 高腳瞭望台 + 伸出的號角
      ctx.lineWidth = lw * 1.3; ctx.strokeStyle = WALL_D; line(ctx, [-9, 15, -5, -5]); line(ctx, [9, 15, 5, -5]); ctx.lineWidth = lw * 0.8; line(ctx, [-8, 9, 7, 3]); line(ctx, [8, 9, -7, 3]); ctx.strokeStyle = INK; ctx.lineWidth = lw;
      rr(ctx, -8, -8, 16, 4, 1); fs(WALL);
      poly(ctx, [-9, -8, 0, -15, 9, -8]); fs(ROOF);
      ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(9, -10); ctx.lineTo(16, -15); ctx.lineTo(16, -3); ctx.lineTo(9, -6); ctx.closePath(); fs(BRASS);
      ell(ctx, 16, -9, 1.6, 6); fs('#6a4a1a');
    } else if (type === 'heart') { // 巢母祭壇: 三層石階 + 浮起的紫心
      rr(ctx, -15, 10, 30, 5.5, 1); fs('#8a8090');
      rr(ctx, -10.5, 5, 21, 5, 1); fs('#9c94a2');
      rr(ctx, -6, 1, 12, 4, 1); fs('#b0a8b4');
      ctx.save(); ctx.shadowColor = pc('brood', '#c264ff'); ctx.shadowBlur = 9; ctx.translate(0, -8); ctx.scale(0.55, 0.55);
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-15, 2, -13, -12, -5, -11); ctx.quadraticCurveTo(-1, -10, 0, -6); ctx.quadraticCurveTo(1, -10, 5, -11); ctx.bezierCurveTo(13, -12, 15, 2, 0, 12); ctx.closePath();
      ctx.fillStyle = '#8a2ec8'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(0, -8); ctx.scale(0.55, 0.55);
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-15, 2, -13, -12, -5, -11); ctx.quadraticCurveTo(-1, -10, 0, -6); ctx.quadraticCurveTo(1, -10, 5, -11); ctx.bezierCurveTo(13, -12, 15, 2, 0, 12); ctx.closePath();
      ctx.lineWidth = lw * 2.2; ctx.strokeStyle = pc('gold', '#f2c94c'); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = pc('brood', '#c264ff'); ctx.lineWidth = lw * 0.8; line(ctx, [-8, 7.5, -4, 7.5]); line(ctx, [4, 7.5, 8, 7.5]);
    } else if (type === 'gear') { // 水車坊: 小屋 + 側邊大水車(轉 = 加速)
      rr(ctx, -15, -1, 15, 16, 1); fs(WALL); planks(-15, -1, 15, 16);
      poly(ctx, [-17, -1, -7.5, -10, 2, -1]); fs(ROOF);
      ctx.fillStyle = '#ffffff'; poly(ctx, [-12, 4, -8.5, 7, -12, 10]); ctx.fill(); poly(ctx, [-8, 4, -4.5, 7, -8, 10]); ctx.fill();
      ctx.fillStyle = '#4a74b8'; ctx.fillRect(0, 13, 16, 3);
      circle(ctx, 7, 4, 9); ctx.lineWidth = lw * 1.5; ctx.strokeStyle = '#8a5a2a'; ctx.stroke();
      ctx.lineWidth = lw * 0.8;
      for (i = 0; i < 8; i++) { a = i * TAU / 8 + 0.2; line(ctx, [7, 4, 7 + Math.cos(a) * 9, 4 + Math.sin(a) * 9]); }
      ctx.lineWidth = lw;
      for (i = 0; i < 8; i++) { a = i * TAU / 8 + 0.2; ctx.save(); ctx.translate(7 + Math.cos(a) * 9.5, 4 + Math.sin(a) * 9.5); ctx.rotate(a); ctx.fillStyle = '#c98a3a'; ctx.fillRect(-2, -1.3, 4, 2.6); ctx.restore(); }
      circle(ctx, 7, 4, 2.3); fs('#3a2a18');
    } else { // bagWood 木料小屋: 矮木屋 + 屋旁原木堆
      rr(ctx, -15, 0, 17, 15, 1); fs(WALL); planks(-15, 0, 17, 15);
      poly(ctx, [-17, 1, -6.5, -10, 4, 1]); fs(ROOF);
      rr(ctx, -9, 7, 5, 8, 1); fs(WALL_D);
      var ends = [[8, 11], [13.4, 11], [10.7, 6.3]];
      for (i = 0; i < 3; i++) { circle(ctx, ends[i][0], ends[i][1], 2.9); fs(pc('woodLight', '#f2c88c')); circle(ctx, ends[i][0], ends[i][1], 1); ctx.fillStyle = pc('woodDark', '#6a3a14'); ctx.fill(); }
      mat(ctx, 'wood', -6.5, -12, 9);
    }
    ctx.restore();
  }

  // 安裝情境: 翠林草地
  function scene(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#3f6e5e'); g.addColorStop(1, '#d6c486'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8fae7c'; ell(ctx, x + 20, y + h - 14, 40, 22); ctx.fill(); ell(ctx, x + w - 10, y + h - 16, 44, 26); ctx.fill();
    ctx.fillStyle = '#73502f'; ctx.fillRect(x, y + h - 14, w, 14);
    ctx.fillStyle = '#5cbf45'; ctx.fillRect(x, y + h - 17, w, 5);
  }

  // 倉庫面板本體: 木貨架, 裝置一座座擺在架上(遊戲座標: 面板左上 (240,120) 800×480)
  function storeBody(ctx, sel) {
    var cells = [{ remove: true }].concat(STORE), i;
    var shelves = [280, 412];
    for (i = 0; i < 2; i++) {
      var sy = shelves[i];
      rr(ctx, 270, sy, 740, 12, 3); ctx.fillStyle = '#8a5a2a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(272, sy + 12, 736, 5);
      ctx.fillStyle = '#5e3a1c'; ctx.fillRect(286, sy + 12, 8, 30); ctx.fillRect(986, sy + 12, 8, 30);
    }
    for (i = 0; i < cells.length; i++) {
      var col = i % 5, row = Math.floor(i / 5), cx = 336 + 142 * col, sy2 = shelves[row], isSel = i === sel;
      if (isSel) {
        ctx.save(); ctx.fillStyle = 'rgba(255,216,74,0.16)'; rr(ctx, cx - 60, sy2 - 100, 120, 100, 8); ctx.fill();
        rr(ctx, cx - 60, sy2 - 100, 120, 100, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.select; ctx.stroke();
        poly(ctx, [cx - 8, sy2 - 104, cx + 8, sy2 - 104, cx, sy2 - 95]); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
        ctx.restore();
      }
      if (cells[i].remove) {
        ctx.save(); ctx.translate(cx, sy2 - 26);
        rr(ctx, -26, -14, 52, 28, 3); ctx.fillStyle = '#6b4a2b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,18,8,0.6)'; line(ctx, [-26, 0, 26, 0]);
        ctx.lineWidth = 4; ctx.strokeStyle = '#8d97a6'; line(ctx, [-18, -22, 14, -8]);
        ctx.lineWidth = 2.5; ctx.strokeStyle = K.cream; line(ctx, [0, 8, 0, -6]); line(ctx, [-5, -1, 0, -6, 5, -1]);
        ctx.restore();
      } else {
        dev(ctx, cells[i].type, cx, sy2 - 40 - (isSel ? 4 : 0), 78);
      }
      var ty = sy2 + 18, label = cells[i].remove ? '拆下' : NAME[cells[i].type] + (cells[i].n > 1 ? ' ×' + cells[i].n : '');
      var w = tw(ctx, label, 13, true) + 16;
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a2a18'; line(ctx, [cx - w / 2 + 6, sy2 + 10, cx - w / 2 + 6, ty]); line(ctx, [cx + w / 2 - 6, sy2 + 10, cx + w / 2 - 6, ty]);
      rr(ctx, cx - w / 2, ty, w, 22, 4); ctx.fillStyle = isSel ? K.select : K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      text(ctx, label, cx, ty + 11.5, 13, K.ink, 'center', true);
    }
    var dy = tag(ctx, 272, 470 - 4, 736, 56, null), cur = cells[sel];
    if (cur && !cur.remove) {
      dev(ctx, cur.type, 304, dy + 28, 40);
      text(ctx, NAME[cur.type], 334, dy + 18, 17, K.ink, 'left', true);
      text(ctx, FX[cur.type].join('、'), 334, dy + 40, 13, K.inkDim, 'left', true);
      text(ctx, '倉庫裡 ' + cur.n + ' 座', 988, dy + 28, 14, K.ink, 'right', true);
    }
    text(ctx, '已蓋在關卡上的不在倉庫裡; 換裝時, 原本那座「' + NAME.bagCrystal + '」會搬回倉庫', 272, 538, 12, K.labelDim, 'left', true, 3, K.edge);
  }

  var O = { id: 'B', title: '方案 B  村落小建築', sub: '每個裝置是一座蓋在地上的小木屋 / 棚 / 塔, 輪廓各不同; 名稱是地點名', dev: dev, scene: scene, body: storeBody, sel: 1 };

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
    element: 'devices', id: 'B', kind: 'static',
    size: [1280, 980], duration: 0, loop: false,
    draw: function (ctx, t) { page(ctx); }
  };
})();
