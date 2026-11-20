/* devices 方案 A — 鐵製機台: 每個裝置都是「鉚在地上的鐵底座 + 一台機器」, 名稱一律講它做什麼的機器(XX機)。
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
  var NAME = { bagWood: '伐木機', bagStone: '碎石機', bagCrystal: '鑽晶機', coreLamp: '魔核燈柱', glove: '拾荒吊臂', horn: '誘獸警笛', heart: '巢母心爐', gear: '加速齒輪機' };
  // 倉庫裡還沒安裝的(同種合併計數); 誘獸警笛裝在本關 1 號格、鑽晶機裝在 2 號格, 所以不列
  var STORE = [{ type: 'gear', n: 3 }, { type: 'bagWood', n: 1 }, { type: 'bagStone', n: 2 }, { type: 'coreLamp', n: 1 }, { type: 'glove', n: 1 }, { type: 'heart', n: 1 }];

  // ---------- 方案 A 的裝置畫法: 鐵底座 + 機器 ----------
  var IRON = '#566070', IRON_L = '#8d97a6', IRON_D = '#3c434e', STEEL = '#d3d9df', INK = '#140e08', BRASS = '#d9a54a';
  function dev(ctx, type, x, y, size) {
    var k = size / 32, lw = Math.max(1.6, 1.1 / k), i, a;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = INK;
    function fs(c) { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); }
    function base() { // 鉚釘鐵底座(全部裝置共用的「鎖在地上」)
      poly(ctx, [-15, 15.5, 15, 15.5, 12, 10, -12, 10]); fs(IRON_D);
      ctx.fillStyle = STEEL; circle(ctx, -9.5, 13, 1.3); ctx.fill(); circle(ctx, 9.5, 13, 1.3); ctx.fill();
    }
    function stripe(col, x0, y0, w, h) { ctx.fillStyle = col; ctx.fillRect(x0, y0, w, h); }
    if (type === 'bagStone') { // 碎石機: 料斗 + 出料口 + 石頭
      line(ctx, [-9, 10, -6, 3]); line(ctx, [9, 10, 6, 3]);
      rr(ctx, -4, 2, 8, 6, 1); fs(IRON_D);
      poly(ctx, [-14, -6, 14, -6, 7, 4, -7, 4]); fs(IRON);
      poly(ctx, [-11.5, -3, 11.5, -3, 10, -1, -10, -1]); ctx.fillStyle = pc('stone', '#a9b3be'); ctx.fill();
      ell(ctx, 0, -6, 13, 2.6); fs('#1c2028');
      mat(ctx, 'stone', 0, -11, 12);
      ctx.fillStyle = pc('stoneLight', '#e6ebf0'); circle(ctx, -1.5, 9.5, 1); ctx.fill(); circle(ctx, 1.8, 8.6, 0.9); ctx.fill();
      base();
    } else if (type === 'bagCrystal') { // 鑽晶機: 三角鑽塔 + 鑽頭 + 晶簇
      base();
      ctx.lineWidth = lw * 1.3; ctx.strokeStyle = IRON_D; line(ctx, [-11, 10, 0, -14, 11, 10]);
      ctx.lineWidth = lw; ctx.strokeStyle = INK; line(ctx, [-6.5, -1, 6.5, -1]); line(ctx, [-3.6, -7.5, 3.6, -7.5]);
      mat(ctx, 'crystal', 0, 5, 13);
      rr(ctx, -2, -13, 4, 9, 1); fs(IRON_L);
      poly(ctx, [-3, -4, 3, -4, 0, 1]); fs(STEEL);
      circle(ctx, 0, -14, 2.4); fs(BRASS);
    } else if (type === 'coreLamp') { // 魔核燈柱: 鐵柱 + 玻璃燈籠 + 魔核
      rr(ctx, -2, -2, 4, 13, 1); fs(IRON);
      ctx.fillStyle = 'rgba(217,75,198,0.28)'; circle(ctx, 0, -8, 11); ctx.fill();
      rr(ctx, -8, -15, 16, 14, 3); ctx.fillStyle = 'rgba(255,220,250,0.35)'; ctx.fill(); ctx.stroke();
      mat(ctx, 'core', 0, -8, 12);
      ctx.strokeStyle = IRON_D; line(ctx, [-8, -8, 8, -8]); ctx.strokeStyle = INK;
      poly(ctx, [-10, -15, 10, -15, 0, -19]); fs(IRON_D);
      base();
    } else if (type === 'glove') { // 拾荒吊臂: 立柱 + 橫臂 + 吊索 + 三爪
      base();
      rr(ctx, -13, -14, 5, 25, 1); fs(IRON);
      rr(ctx, -15, -16, 28, 5, 1); fs(pc('gold', '#f2c94c'));
      rr(ctx, -16, -15, 4, 7, 1); fs(IRON_D);
      ctx.lineWidth = lw * 0.8; line(ctx, [8, -11, 8, -2]); ctx.lineWidth = lw;
      ctx.lineWidth = lw * 1.4; line(ctx, [8, -2, 3, 3, 4, 7]); line(ctx, [8, -2, 13, 3, 12, 7]); line(ctx, [8, -2, 8, 6]); ctx.lineWidth = lw;
      circle(ctx, 8, -2, 2); fs(IRON_D);
      star4(ctx, 8, 9.5, 3.6); ctx.fillStyle = '#fff6c0'; ctx.fill();
    } else if (type === 'horn') { // 誘獸警笛: 鐵柱 + 壓縮機 + 黃銅喇叭 + 聲波
      rr(ctx, -2, -1, 4, 12, 1); fs(IRON);
      rr(ctx, -13, -8, 8, 9, 1.5); fs(IRON);
      ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(3, -7); ctx.lineTo(11, -14); ctx.lineTo(11, 4); ctx.lineTo(3, -1); ctx.lineTo(-6, -1); ctx.closePath(); fs(BRASS);
      ell(ctx, 11, -5, 2.4, 9); fs('#6a4a1a');
      ctx.strokeStyle = '#fff3d0'; ctx.lineWidth = lw * 0.9;
      ctx.beginPath(); ctx.arc(11, -5, 13, -0.45, 0.45); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = lw;
      base();
    } else if (type === 'heart') { // 巢母心爐: 爐座 + 玻璃罩 + 紫心
      base();
      rr(ctx, -12, 1, 24, 9, 2); fs(IRON);
      stripe(pc('brood', '#c264ff'), -10, 4, 20, 2);
      ctx.save(); ctx.shadowColor = pc('brood', '#c264ff'); ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 1, 11, Math.PI, 0); ctx.closePath(); ctx.fillStyle = 'rgba(194,100,255,0.28)'; ctx.fill(); ctx.restore(); ctx.stroke();
      ctx.save(); ctx.translate(0, -4); ctx.scale(0.5, 0.5);
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-15, 2, -13, -12, -5, -11); ctx.quadraticCurveTo(-1, -10, 0, -6); ctx.quadraticCurveTo(1, -10, 5, -11); ctx.bezierCurveTo(13, -12, 15, 2, 0, 12); ctx.closePath();
      ctx.fillStyle = '#8a2ec8'; ctx.fill(); ctx.lineWidth = lw * 2.4; ctx.strokeStyle = pc('gold', '#f2c94c'); ctx.stroke(); ctx.restore();
      star4(ctx, -6, -6, 2.4); ctx.fillStyle = '#ffffff'; ctx.fill();
    } else if (type === 'gear') { // 加速齒輪機: 大小咬合齒輪 + ▶▶
      base();
      ctx.beginPath();
      for (i = 0; i < 9; i++) { a = i * TAU / 9; var r1 = 4.6, r2 = 6.6; ctx.lineTo(10 + Math.cos(a - 0.2) * r2, -9 + Math.sin(a - 0.2) * r2); ctx.lineTo(10 + Math.cos(a + 0.2) * r2, -9 + Math.sin(a + 0.2) * r2); ctx.lineTo(10 + Math.cos(a + 0.35) * r1, -9 + Math.sin(a + 0.35) * r1); }
      ctx.closePath(); fs('#a8702c');
      ctx.beginPath();
      for (i = 0; i < 12; i++) { a = i * TAU / 12; ctx.lineTo(-2 + Math.cos(a - 0.13) * 12.5, -1 + Math.sin(a - 0.13) * 12.5); ctx.lineTo(-2 + Math.cos(a + 0.13) * 12.5, -1 + Math.sin(a + 0.13) * 12.5); ctx.lineTo(-2 + Math.cos(a + 0.26) * 9.8, -1 + Math.sin(a + 0.26) * 9.8); }
      ctx.closePath(); fs('#c98a3a');
      circle(ctx, -2, -1, 6.6); ctx.fillStyle = '#3a2a18'; ctx.fill();
      ctx.fillStyle = '#ffffff'; poly(ctx, [-7, -4.5, -2.4, -1, -7, 2.5]); ctx.fill(); poly(ctx, [-2.4, -4.5, 2.2, -1, -2.4, 2.5]); ctx.fill();
    } else { // bagWood 伐木機: 機箱 + 圓鋸 + 原木
      rr(ctx, -13, -1, 16, 11, 1.5); fs(IRON);
      stripe(pc('wood', '#b8682a'), -12, 2.5, 14, 2.6);
      ctx.beginPath();
      for (i = 0; i < 14; i++) { a = i * TAU / 14; ctx.lineTo(6 + Math.cos(a) * 9.5, -4 + Math.sin(a) * 9.5); ctx.lineTo(6 + Math.cos(a + TAU / 28) * 7.4, -4 + Math.sin(a + TAU / 28) * 7.4); }
      ctx.closePath(); fs(STEEL);
      circle(ctx, 6, -4, 2.6); fs(IRON_D);
      mat(ctx, 'wood', -7, -7, 12);
      base();
    }
    ctx.restore();
  }

  // 安裝情境: 鐵工廠地坪
  function scene(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#2b3441'); g.addColorStop(1, '#46505e'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (var i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 30, y + 8, 2, h - 30);
    ctx.fillStyle = '#5c3f24'; ctx.fillRect(x, y + h - 14, w, 14);
    ctx.fillStyle = '#7d8898'; ctx.fillRect(x, y + h - 16, w, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ell(ctx, x + w / 2, y + h - 16, 38, 4); ctx.fill();
  }

  // 倉庫面板本體(遊戲座標: 面板左上 (240,120) 800×480)
  function storeBody(ctx, sel) {
    var cells = [{ remove: true }].concat(STORE), i;
    for (i = 0; i < 12; i++) {
      var c = i % 6, r = Math.floor(i / 6), x = 272 + 124 * c, y = 178 + 118 * r, isSel = i === sel;
      if (i >= cells.length) { ctx.save(); ctx.setLineDash([4, 4]); rr(ctx, x + 0.5, y + 0.5, 111, 105, 6); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(201,184,150,0.35)'; ctx.stroke(); ctx.restore(); continue; }
      var yy = tag(ctx, x, y, 112, 106, isSel ? 'hot' : null);
      if (cells[i].remove) {
        ctx.save(); ctx.translate(x + 56, yy + 44);
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = '#5e6772'; line(ctx, [-14, 14, 10, -10]);
        ctx.lineWidth = 2; ctx.strokeStyle = INK; circle(ctx, 12, -12, 7); ctx.stroke();
        ctx.fillStyle = K.parch; poly(ctx, [12, -12, 22, -16, 16, -22]); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = K.ink; line(ctx, [-18, -6, -18, -20]); line(ctx, [-23, -14, -18, -20, -13, -14]);
        ctx.restore();
        text(ctx, '拆下', x + 56, yy + 90, 13, K.ink, 'center', true);
      } else {
        dev(ctx, cells[i].type, x + 56, yy + 44, 64);
        text(ctx, NAME[cells[i].type], x + 56, yy + 90, 13, K.ink, 'center', true);
        if (cells[i].n > 1) badge(ctx, '×' + cells[i].n, x + 106, yy + 14);
      }
    }
    var dy = tag(ctx, 272, 420, 736, 64, null), cur = cells[sel];
    if (cur && !cur.remove) {
      dev(ctx, cur.type, 312, dy + 32, 44);
      text(ctx, NAME[cur.type], 344, dy + 20, 18, K.ink, 'left', true);
      text(ctx, FX[cur.type].join('、'), 344, dy + 44, 13, K.inkDim, 'left', true);
      text(ctx, '倉庫裡 ' + cur.n + ' 台', 988, dy + 32, 14, K.ink, 'right', true);
    }
    text(ctx, '已安裝的裝置不在倉庫裡; 換裝時, 原本裝著的「' + NAME.bagCrystal + '」會放回倉庫', 272, 512, 12, K.labelDim, 'left', true, 3, K.edge);
  }

  // ---------- 整頁 ----------
  var O = { id: 'A', title: '方案 A  鐵製機台', sub: '每個裝置都鉚在同一款鐵底座上, 上面一台機器; 名稱講「它是什麼機器」', dev: dev, scene: scene, body: storeBody, sel: 1 };

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
    element: 'devices', id: 'A', kind: 'static',
    size: [1280, 980], duration: 0, loop: false,
    draw: function (ctx, t) { page(ctx); }
  };
})();
