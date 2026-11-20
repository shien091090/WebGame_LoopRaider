/* 通關動畫 方案 C — Boss 崩解・世界復原(正中爆散 + 放射擴散的復原波)
 * 演出: 被紫黑瘴氣染灰的世界中央, 最終 Boss 剪影顫抖、金色裂紋爬滿全身 → 閃白崩解, 碎片飛散途中變成四種素材、落滿地面 →
 * 一圈金色復原波從 Boss 原位往外擴, 波經過的地方瘴氣退去、恢復原色(左翠林谷地 / 中風蝕高崖 / 右地底礦坑三主題並排),
 * 花開、旗升、礦燈亮 → 三職業從天而降落在正中 → 頂端垂下一塊吊掛木牌結算(通關時間、擊倒數、四種總收成)。
 * 構圖是正中放射對稱; 節奏是一次大爆點後轉成由內而外的連續擴散。
 * Boss 造型尚未定案(final-boss 另案), 這裡用巢母系的冠角甲殼剪影代表, 挑中後換成選定的 Boss 外形即可。
 * 主角畫法照 options/hero-A.js 複製(加了擺腿); 素材圖示照底版 art.js 內部 matIcon 複製; 木牌 / 羊皮紙 / 鍵帽照 options/ui-A.js 複製。
 * 動態完全由 t 決定; 長 13 秒, 9.8 秒後是可停留的結算畫面。
 */
(function () {
  'use strict';
  var A = window.Art || {};
  var PAL = A.palette || {};
  function C(k, d) { return PAL[k] || d; }
  var TAU = Math.PI * 2, W = 1280, H = 720, DUR = 13;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  // ---------- 小工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function ease(x) { return x * x * (3 - 2 * x); }
  function eOut(x) { return 1 - Math.pow(1 - x, 3); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(a, b, u) { var p = hex(a), q = hex(b); return 'rgb(' + Math.round(p[0] + (q[0] - p[0]) * u) + ',' + Math.round(p[1] + (q[1] - p[1]) * u) + ',' + Math.round(p[2] + (q[2] - p[2]) * u) + ')'; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function star(ctx, x, y, r, n) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = (i % 2) ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || 'rgba(20,12,6,0.95)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  function grp(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ---------- 素材圖示(照底版 art.js matIcon 複製; 搬回遊戲時改呼叫遊戲版) ----------
  function matIcon(ctx, kind, cx, cy, sz) {
    var k = sz / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1420';
    if (kind === 'wood') {
      rr(ctx, -9, -5, 15, 10, 3); ctx.fillStyle = C('wood', '#c97e3a'); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -1.6); ctx.lineTo(1, -1.6); ctx.moveTo(-4, 2); ctx.lineTo(2, 2); ctx.strokeStyle = C('woodDark', '#7a4a1e'); ctx.lineWidth = 1; ctx.stroke();
      ell(ctx, 5.5, 0, 3.6, 5); ctx.fillStyle = C('woodLight', '#efc07f'); ctx.fill(); ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.6; ctx.stroke();
      ell(ctx, 5.5, 0, 1.4, 2.2); ctx.strokeStyle = C('woodDark', '#7a4a1e'); ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'stone') {
      poly(ctx, [-8, 3, -5, -6, 4, -8, 9, -2, 7, 6, -3, 8]); ctx.fillStyle = C('stone', '#a3adb8'); ctx.fill(); ctx.stroke();
      poly(ctx, [-5, -6, 4, -8, 9, -2, 1, -1]); ctx.fillStyle = C('stoneLight', '#d5dbe2'); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -1); ctx.lineTo(-3, 8); ctx.strokeStyle = C('stoneDark', '#5e6874'); ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'time') {
      poly(ctx, [0, -9.5, 7, -2, 0, 9.5, -7, -2]); ctx.fillStyle = C('time', '#3fd6ea'); ctx.fill(); ctx.stroke();
      poly(ctx, [0, -9.5, 3, -2, 0, 9.5, -3, -2]); ctx.fillStyle = C('timeLight', '#b6f4fb'); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.strokeStyle = C('timeDark', '#1a8ea2'); ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -9.5);
      ctx.bezierCurveTo(4, -4, 8, -1, 7, 4); ctx.bezierCurveTo(6, 8.5, -6, 8.5, -7, 4); ctx.bezierCurveTo(-8, -1, -3, -3, 0, -9.5); ctx.closePath();
      ctx.fillStyle = C('soul', '#e65ad4'); ctx.fill(); ctx.stroke();
      ell(ctx, 0, 3.5, 3.6, 3.2); ctx.fillStyle = C('soulLight', '#ffb6f2'); ctx.fill();
      circle(ctx, -1.6, 3, 0.9); ctx.fillStyle = '#3a0f34'; ctx.fill(); circle(ctx, 1.6, 3, 0.9); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 主角(照 hero-A 複製; 加 legPh 擺腿) ----------
  var HC = {
    sword: C('sword', '#3d8bfd'), hunter: C('hunter', '#1fbf9a'), bomber: C('bomber', '#f28c28'),
    skin: '#f4d2b0', line: C('outlineHero', '#ffffff'), ink: '#1a1420', pants: '#2b3245',
    gold: C('gold', '#f2c94c'), metal: '#e8eef6', wood: '#8a5a2a', bomb: C('bomb', '#2a2a33'), spark: C('goal', '#ffd23f'),
    lens: C('timeLight', '#b6f4fb'), cape: '#d8434e', hood: '#0f2a24', eye: '#d8fff0'
  };
  function fs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.stroke(); } }
  function legs(ctx, top, ph) {
    var s = Math.sin(ph) * 3;
    ctx.fillStyle = HC.pants;
    rr(ctx, -7 + s, top, 5, 20 - top, 1.5); ctx.fill(); rr(ctx, 2 - s, top, 5, 20 - top, 1.5); ctx.fill();
  }
  // 原點 = 判定框中心, 判定框 28×40; f = 面向; legPh = 擺腿相位(站立傳 0)
  function hero(ctx, cls, f, legPh, holdBomb) {
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      poly(ctx, [-4, -6, -13, 15, -5, 17, 2, -4]); fs(ctx, HC.cape, 0);
      legs(ctx, 13, legPh);
      poly(ctx, [-13, -6, 13, -6, 7, 14, -7, 14]); fs(ctx, HC.sword, 2);
      ctx.fillStyle = HC.gold; ctx.fillRect(-7, 8, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [-2, -4, 2, -4, 0, 4]); ctx.fill();
      poly(ctx, [-8, -13, -15, -19, -12, -11]); fs(ctx, HC.gold, 0);
      rr(ctx, -8, -20, 16, 14, 3); fs(ctx, HC.sword, 2);
      ctx.fillStyle = HC.ink; ctx.fillRect(-1, -15, 8, 3);
      poly(ctx, [10, -19, 12, -22, 14, -19, 14, -3, 10, -3]); fs(ctx, HC.metal, 0);
      ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
      ctx.fillStyle = HC.gold; ctx.fillRect(7, -3.5, 10, 3);
      ctx.fillStyle = HC.wood; ctx.fillRect(11, -0.5, 2, 5);
      circle(ctx, 12, 3, 2.6); fs(ctx, HC.skin, 0);
    } else if (cls === 'hunter') {
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(-0.35);
      ctx.fillStyle = HC.wood; ctx.fillRect(-3, -6, 6, 14);
      ctx.fillStyle = HC.eye; poly(ctx, [-3, -6, -1, -12, 1, -6]); ctx.fill(); poly(ctx, [0, -6, 2.5, -11, 3.5, -6]); ctx.fill();
      ctx.restore();
      legs(ctx, 14, legPh);
      poly(ctx, [0, -20, 13, 15, -13, 15]); fs(ctx, HC.hunter, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [0, -20, -13, 15, -5, 15]); ctx.fill();
      poly(ctx, [-1, -13, 7, -9, 6, -4, -3, -4]); ctx.fillStyle = HC.hood; ctx.fill();
      circle(ctx, 2, -8, 1.3); ctx.fillStyle = HC.eye; ctx.fill(); circle(ctx, 5, -7.6, 1.3); ctx.fill();
      circle(ctx, 0, 0, 2); ctx.fillStyle = HC.gold; ctx.fill();
      ctx.strokeStyle = HC.wood; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(3, 2, 15, -1.15, 1.15); ctx.stroke();
      var ex = 3 + Math.cos(1.15) * 15, ey = Math.sin(1.15) * 15;
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, 2 - ey); ctx.lineTo(ex, 2 + ey); ctx.stroke();
      ctx.strokeStyle = C('arrow', '#f3ead8'); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(ex - 1, 2); ctx.lineTo(19, 2); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [19, -0.5, 22, 2, 19, 4.5]); ctx.fill();
    } else {
      legs(ctx, 15, legPh);
      circle(ctx, 0, 5, 12); fs(ctx, HC.bomber, 2);
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(8, 13); ctx.stroke();
      for (var i = 0; i < 3; i++) { circle(ctx, -5 + i * 5, 1.5 + i * 4.4, 2.2); ctx.fillStyle = HC.bomb; ctx.fill(); }
      circle(ctx, 0, -11, 8); fs(ctx, HC.skin, 1.8);
      ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.closePath(); fs(ctx, HC.bomber, 0);
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-8, -12.5, 16, 2.6);
      circle(ctx, 1, -11.2, 3.1); fs(ctx, HC.lens, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circle(ctx, 6.4, -11.2, 3.1); fs(ctx, HC.lens, 0); ctx.stroke();
      ctx.strokeStyle = HC.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -6.5, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      if (holdBomb !== false) {
        circle(ctx, 12, 3, 5.5); ctx.fillStyle = HC.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = HC.line; ctx.stroke();
        ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.quadraticCurveTo(15, -6, 17, -6); ctx.stroke();
        ctx.fillStyle = HC.spark; poly(ctx, [17, -10, 18, -7, 21, -6, 18, -5, 17, -2, 16, -5, 13, -6, 16, -7]); ctx.fill();
      } else {
        circle(ctx, 12, 1, 2.6); fs(ctx, HC.skin, 0);
      }
    }
    ctx.restore();
  }

  function eBack(x) { var c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }

  // ---------- 木牌 / 羊皮紙 / 鍵帽(照 ui-A) ----------
  var K = {
    board: '#3a2a1f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a',
    parch: '#efe3c6', ink: '#2b2118', inkDim: '#76664e', gold: '#ffd84a', goldDeep: '#b8860b', creamText: '#f3e6c8'
  };
  function board(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = K.board; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { circle(ctx, n[i][0], n[i][1], 2.6); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke(); }
  }
  function tag(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = K.parch; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.stroke();
  }
  function key(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.7, tw(ctx, label, px, true) + px * 0.9), h = px * 1.6;
    rr(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 4); ctx.fillStyle = hot ? K.goldDeep : '#8f8471'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.fillStyle = hot ? K.gold : '#ece4d2'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, label, cx, cy + 0.5, px, K.ink, 'center', true);
    return w;
  }
  function anyKeyHint(ctx, cx, cy, px, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    var s = '回大地圖繼續玩', kw = Math.max(px * 1.7, tw(ctx, '任意鍵', px, true) + px * 0.9), sw = tw(ctx, s, px, true);
    var x0 = cx - (kw + 8 + sw) / 2;
    key(ctx, '任意鍵', x0 + kw / 2, cy, px, true);
    text(ctx, s, x0 + kw + 8, cy, px, K.creamText, 'left', true, 4, K.edge);
    ctx.restore();
  }

  // ---------- 時間軸與幾何 ----------
  var GY = 560, BX = 640, BY = 360;
  var CRACK0 = 0.4, BURST = 2.3, WAVE0 = 2.5, WAVE1 = 6.6, RMAX = 1520;
  function waveR(t) { return RMAX * ease(seg(t, WAVE0, WAVE1)); }
  // 復原波掃到 (x, y) 的時刻(反解 smoothstep)
  function passT(x, y) {
    var u = clamp(Math.sqrt((x - BX) * (x - BX) + (y - BY) * (y - BY)) / RMAX, 0, 1), lo = 0, hi = 1;
    for (var i = 0; i < 18; i++) { var m = (lo + hi) / 2; if (ease(m) < u) lo = m; else hi = m; }
    return WAVE0 + (WAVE1 - WAVE0) * (lo + hi) / 2;
  }
  function grown(t, x, y, d) { return eBack(seg(t, passT(x, y), passT(x, y) + (d || 0.45))); }

  // ---------- 三主題並排的世界(原色版) ----------
  var ZONES = [[0, 427, 'forest'], [427, 853, 'cliff'], [853, 1280, 'mine']];
  var TREES = [[40, 1.1], [120, 0.8], [205, 1.25], [300, 0.9], [385, 1.05]];
  var FLOWERS = [[30, 0], [92, 1], [160, 2], [236, 0], [270, 1], [342, 2], [404, 0]];
  var PILLARS = [[480, 70, 300], [560, 46, 380], [770, 58, 320], [820, 40, 400]];
  var BANNERS = [[520, 1], [700, 0], [800, 2]];
  var CRYSTALS = [[880, 210, 1.2], [960, 120, 0.9], [1040, 250, 1.4], [1150, 150, 1], [1230, 230, 1.2], [1110, 300, 0.8]];
  var LAMPS = [[930, 360], [1080, 340], [1210, 380]];
  function world(ctx, t) {
    for (var z = 0; z < 3; z++) {
      var x0 = ZONES[z][0], x1 = ZONES[z][1], th = ZONES[z][2];
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, H); ctx.clip();
      var g = ctx.createLinearGradient(0, 0, 0, GY);
      if (th === 'forest') { g.addColorStop(0, '#6aa6d8'); g.addColorStop(1, '#b8e0b0'); }
      else if (th === 'cliff') { g.addColorStop(0, '#8fb4e6'); g.addColorStop(1, '#e8eef8'); }
      else { g.addColorStop(0, '#1c1828'); g.addColorStop(1, '#2e2638'); }
      ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, GY);
      var i, k;
      if (th === 'forest') {
        for (i = 0; i < TREES.length; i++) {
          var tx = TREES[i][0], ts = TREES[i][1];
          ctx.fillStyle = '#6b4a2c'; ctx.fillRect(tx - 7 * ts, GY - 60 * ts, 14 * ts, 60 * ts);
          for (k = 0; k < 3; k++) { poly(ctx, [tx, GY - (200 - k * 40) * ts, tx + (52 - k * 4) * ts, GY - (90 - k * 30) * ts, tx - (52 - k * 4) * ts, GY - (90 - k * 30) * ts]); ctx.fillStyle = ['#2f7a3a', '#3a8f44', '#4aa650'][k]; ctx.fill(); }
        }
      } else if (th === 'cliff') {
        for (i = 0; i < PILLARS.length; i++) {
          var p = PILLARS[i];
          ctx.fillStyle = '#8d9ab4'; poly(ctx, [p[0] - p[1] / 2, GY, p[0] - p[1] / 2 + 6, p[2] + 30, p[0] - p[1] * 0.62, p[2], p[0] + p[1] * 0.62, p[2] - 8, p[0] + p[1] / 2 - 4, p[2] + 34, p[0] + p[1] / 2, GY]); ctx.fill();
          ctx.fillStyle = '#e3eaf2'; ctx.fillRect(p[0] - p[1] * 0.62, p[2] - 8, p[1] * 1.24, 8);
          ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
          for (k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(p[0] - p[1] / 2 + 4, p[2] + 60 + k * 40); ctx.lineTo(p[0] + p[1] / 2 - 4, p[2] + 48 + k * 40); ctx.stroke(); }
        }
        // 雲
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ell(ctx, 600 + Math.sin(t * 0.3) * 10, 120, 70, 18); ctx.fill(); ell(ctx, 720, 190, 50, 14); ctx.fill();
      } else {
        // 礦坑: 木支架 + 礦車軌道
        ctx.fillStyle = '#5a4630';
        for (i = 0; i < 3; i++) { var sx = 900 + i * 140; ctx.fillRect(sx, 200, 12, GY - 200); ctx.fillRect(sx + 90, 200, 12, GY - 200); ctx.fillRect(sx - 8, 196, 118, 14); }
        ctx.fillStyle = '#2a2018'; ctx.fillRect(x0, GY - 14, x1 - x0, 4);
        for (i = x0; i < x1; i += 22) { ctx.fillStyle = '#4a3a28'; ctx.fillRect(i, GY - 12, 12, 6); }
      }
      // 地面
      var top = th === 'forest' ? '#63c35a' : th === 'cliff' ? '#e3eaf2' : '#8a7a5a';
      var inner = th === 'forest' ? '#6b4a2c' : th === 'cliff' ? '#7d8ca5' : '#3a2e24';
      ctx.fillStyle = inner; ctx.fillRect(x0, GY, x1 - x0, H - GY);
      ctx.fillStyle = top; ctx.fillRect(x0, GY, x1 - x0, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x0, GY, x1 - x0, 3);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (i = x0 - (x0 % 40); i < x1; i += 40) ctx.strokeRect(i + 0.5, GY + 12.5, 39, 39);
      ctx.restore();
    }
    // 波經過才長出來的東西
    var i2, s;
    for (i2 = 0; i2 < FLOWERS.length; i2++) {
      var fx = FLOWERS[i2][0]; s = grown(t, fx, GY);
      if (s <= 0) continue;
      ctx.save(); ctx.translate(fx, GY + 2); ctx.scale(s, s);
      ctx.strokeStyle = '#2f7a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
      var pc = ['#ffd84a', '#ffffff', '#ffb6f2'][FLOWERS[i2][1]];
      for (var pp = 0; pp < 5; pp++) { var pa = pp * TAU / 5; circle(ctx, Math.cos(pa) * 6, -26 + Math.sin(pa) * 6, 5); ctx.fillStyle = pc; ctx.fill(); }
      circle(ctx, 0, -26, 4); ctx.fillStyle = '#f28c28'; ctx.fill();
      ctx.restore();
    }
    for (i2 = 0; i2 < BANNERS.length; i2++) {
      var bx = BANNERS[i2][0]; s = seg(t, passT(bx, GY - 120), passT(bx, GY - 120) + 0.7);
      ctx.fillStyle = '#e8e2d0'; ctx.fillRect(bx - 2, GY - 150, 4, 150);
      var fy = GY - 40 - 100 * eOut(s), wv = Math.sin(t * 4 + i2) * 4 * s;
      poly(ctx, [bx + 2, fy, bx + 44, fy + 10 + wv, bx + 2, fy + 22]);
      ctx.fillStyle = [C('sword', '#3d8bfd'), C('hunter', '#1fbf9a'), C('bomber', '#f28c28')][BANNERS[i2][1]]; ctx.fill();
    }
    for (i2 = 0; i2 < CRYSTALS.length; i2++) {
      var c = CRYSTALS[i2]; s = seg(t, passT(c[0], c[1]), passT(c[0], c[1]) + 0.4);
      ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(c[2], c[2]);
      if (s > 0) { var cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 34); cg.addColorStop(0, 'rgba(63,214,234,' + (0.55 * s).toFixed(3) + ')'); cg.addColorStop(1, 'rgba(63,214,234,0)'); ctx.fillStyle = cg; circle(ctx, 0, 0, 34); ctx.fill(); }
      poly(ctx, [0, -16, 8, -2, 0, 16, -8, -2]); ctx.fillStyle = s > 0 ? C('time', '#3fd6ea') : '#3a4a58'; ctx.fill();
      poly(ctx, [0, -16, 3, -2, 0, 16, -3, -2]); ctx.fillStyle = s > 0 ? C('timeLight', '#b6f4fb') : '#4a5a68'; ctx.fill();
      ctx.restore();
    }
    for (i2 = 0; i2 < LAMPS.length; i2++) {
      var l = LAMPS[i2]; s = seg(t, passT(l[0], l[1]), passT(l[0], l[1]) + 0.25);
      ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l[0], 210); ctx.lineTo(l[0], l[1] - 10); ctx.stroke();
      if (s > 0) { var lg = ctx.createRadialGradient(l[0], l[1], 0, l[0], l[1], 90); lg.addColorStop(0, 'rgba(255,214,120,' + (0.6 * s).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = lg; circle(ctx, l[0], l[1], 90); ctx.fill(); }
      rr(ctx, l[0] - 7, l[1] - 10, 14, 18, 3); ctx.fillStyle = s > 0 ? '#ffe08a' : '#4a4038'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2a2018'; ctx.stroke();
    }
  }

  // ---------- 瘴氣(未復原區): 紫黑壓暗 + 流動暗團, 在復原圈外 ----------
  function blight(ctx, t) {
    var R = waveR(t);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (R > 0) ctx.arc(BX, BY, R, 0, TAU, true);
    ctx.clip();
    ctx.fillStyle = 'rgba(38,30,48,0.86)'; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 26; i++) {
      var x = (hash(i, 1) * (W + 300) + t * (14 + hash(i, 2) * 18)) % (W + 300) - 150, y = hash(i, 3) * H;
      ell(ctx, x, y, 90 + hash(i, 4) * 80, 30 + hash(i, 5) * 24);
      ctx.fillStyle = 'rgba(90,45,110,' + (0.14 + hash(i, 6) * 0.12).toFixed(3) + ')'; ctx.fill();
    }
    ctx.restore();
    // 復原波前緣: 金色環 + 沿環的閃星
    if (R > 0 && R < RMAX) {
      ctx.save();
      circle(ctx, BX, BY, R); ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(255,214,90,0.25)'; ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,240,180,0.95)'; ctx.stroke();
      for (var k = 0; k < 28; k++) {
        var a = k * TAU / 28 + t * 0.4, sx = BX + Math.cos(a) * R, sy = BY + Math.sin(a) * R;
        if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
        star(ctx, sx, sy, 6 + 4 * Math.sin(t * 9 + k), 4); ctx.fillStyle = '#fff6c0'; ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------- Boss 剪影(崩解前) ----------
  var CRACKS = [];
  (function () {
    for (var i = 0; i < 9; i++) {
      var a = i * TAU / 9 + hash(i, 7) * 0.4, x = 0, y = 0, pts = [[0, 0]];
      for (var k = 0; k < 6; k++) { a += (hash(i, k + 10) - 0.5) * 0.9; var L = 22 + hash(i, k + 20) * 16; x += Math.cos(a) * L; y += Math.sin(a) * L * 0.85; pts.push([x, y]); }
      CRACKS.push(pts);
    }
  })();
  function boss(ctx, t) {
    if (t >= BURST) return;
    var cr = seg(t, CRACK0, BURST - 0.1), shake = cr * cr * 7;
    var ox = Math.sin(t * 61) * shake, oy = Math.cos(t * 47) * shake * 0.6;
    ctx.save(); ctx.translate(BX + ox, BY + oy);
    // 裂光外溢
    var gg = ctx.createRadialGradient(0, 20, 30, 0, 20, 260);
    gg.addColorStop(0, 'rgba(255,214,90,' + (0.5 * cr).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = gg; ctx.fillRect(-260, -240, 520, 520);
    ctx.lineJoin = 'round';
    // 冠角
    var horns = [[-90, -60, -150, -190, -40, -110], [-20, -110, 0, -230, 20, -110], [40, -110, 150, -190, 90, -60]];
    for (var h = 0; h < 3; h++) { poly(ctx, horns[h]); ctx.fillStyle = '#2a1634'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#120a18'; ctx.stroke(); }
    // 甲殼身
    ell(ctx, 0, 40, 190, 160); ctx.fillStyle = C('broodmother', '#4a2560'); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#120a18'; ctx.stroke();
    ell(ctx, 0, 10, 150, 110); ctx.fillStyle = '#3a1c4c'; ctx.fill();
    // 巢穴紫紋
    ctx.strokeStyle = 'rgba(194,100,255,' + (0.7 * (1 - cr)).toFixed(3) + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-120, 40); ctx.quadraticCurveTo(-60, -20, 0, 30); ctx.quadraticCurveTo(60, -20, 120, 40); ctx.stroke();
    // 大顎
    poly(ctx, [-60, 120, -30, 190, -10, 130]); ctx.fillStyle = '#e8e2d0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#120a18'; ctx.stroke();
    poly(ctx, [60, 120, 30, 190, 10, 130]); ctx.fill(); ctx.stroke();
    // 眼: 紫 → 逐漸熄滅
    var ea = 1 - cr;
    for (var e = -1; e <= 1; e += 2) {
      ell(ctx, e * 52, -10, 20, 12); ctx.fillStyle = 'rgba(194,100,255,' + (0.3 + 0.7 * ea).toFixed(3) + ')'; ctx.fill();
      ell(ctx, e * 52, -10, 8, 5); ctx.fillStyle = 'rgba(255,230,255,' + ea.toFixed(3) + ')'; ctx.fill();
    }
    // 金色裂紋: 從中心往外爬
    ctx.lineCap = 'round';
    for (var c = 0; c < CRACKS.length; c++) {
      var pts = CRACKS[c], n = (pts.length - 1) * clamp(cr * 1.3 - c * 0.03, 0, 1);
      if (n <= 0) continue;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1] + 30);
      for (var k = 1; k <= Math.ceil(n); k++) {
        var f = Math.min(1, n - (k - 1)), px = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, py = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f;
        ctx.lineTo(px, py + 30);
      }
      ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,214,90,0.35)'; ctx.stroke();
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#fff2b0'; ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 碎片 → 素材 ----------
  var SHARDS = [], KINDS = ['wood', 'stone', 'time', 'soul'], G = 900;
  (function () {
    for (var i = 0; i < 48; i++) {
      var a = i * TAU / 48 + (hash(i, 1) - 0.5) * 0.3, r0 = 30 + hash(i, 2) * 120;
      var x0 = BX + Math.cos(a) * r0, y0 = BY + 30 + Math.sin(a) * r0 * 0.8;
      var sp = 260 + hash(i, 3) * 380, vx = Math.cos(a) * sp, vy = Math.sin(a) * sp * 0.8 - 380 - hash(i, 4) * 200;
      // 落地時刻: y0 + vy s + G s²/2 = 落點
      var gy = GY - 6 + hash(i, 6) * 10, A2 = G / 2, B2 = vy, C2 = y0 - gy;
      var land = (-B2 + Math.sqrt(Math.max(0, B2 * B2 - 4 * A2 * C2))) / (2 * A2);
      SHARDS.push({ x0: x0, y0: y0, vx: vx, vy: vy, land: land, gy: gy, kind: KINDS[i % 4], rot: (hash(i, 5) - 0.5) * 14, sz: 14 + hash(i, 7) * 12 });
    }
  })();
  function shards(ctx, t) {
    var s = t - BURST;
    if (s < 0) return;
    for (var i = 0; i < SHARDS.length; i++) {
      var p = SHARDS[i], st = Math.min(s, p.land), x = p.x0 + p.vx * st, y = p.y0 + p.vy * st + G * st * st / 2;
      if (s >= p.land) { y = p.gy - Math.abs(Math.sin((s - p.land) * 9)) * 14 * Math.exp(-(s - p.land) * 5); }
      if (x < -40 || x > W + 40) continue;
      var morph = seg(s, 0.15, 0.55);
      if (morph < 1) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot * st); ctx.globalAlpha = 1 - morph;
        poly(ctx, [-p.sz * 0.6, -p.sz * 0.4, p.sz * 0.5, -p.sz * 0.6, p.sz * 0.7, p.sz * 0.4, -p.sz * 0.2, p.sz * 0.6]);
        ctx.fillStyle = '#3a1c4c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff2b0'; ctx.stroke();
        ctx.restore();
      }
      if (morph > 0) {
        ctx.save(); ctx.globalAlpha = morph;
        matIcon(ctx, p.kind, x, y, 22 * (0.6 + 0.4 * morph));
        if (s > p.land && Math.sin(t * 5 + i * 1.3) > 0.93) { star(ctx, x + 8, y - 10, 5, 4); ctx.fillStyle = '#fff6c0'; ctx.fill(); }
        ctx.restore();
      }
    }
  }
  function flash(ctx, t) {
    var f = seg(t, BURST - 0.08, BURST) * (1 - seg(t, BURST, BURST + 0.45));
    if (f > 0) { ctx.fillStyle = 'rgba(255,250,230,' + f.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    var r = seg(t, BURST, BURST + 0.6);
    if (r > 0 && r < 1) { circle(ctx, BX, BY + 30, 60 + 300 * eOut(r)); ctx.lineWidth = 20 * (1 - r) + 2; ctx.strokeStyle = 'rgba(255,240,190,' + (1 - r).toFixed(3) + ')'; ctx.stroke(); }
  }

  // ---------- 三職業從天而降 ----------
  var HK = 2.4;
  var HEROES = [{ cls: 'hunter', x: 556, t0: 6.2, f: 1 }, { cls: 'sword', x: 640, t0: 6.45, f: 1 }, { cls: 'bomber', x: 724, t0: 6.7, f: -1 }];
  function heroes(ctx, t) {
    for (var i = 0; i < HEROES.length; i++) {
      var h = HEROES[i], u = seg(t, h.t0, h.t0 + 0.45);
      if (u <= 0) continue;
      var feet = GY + 2, fy = u < 1 ? -80 + (feet + 80) * u * u : feet;
      var land = t - (h.t0 + 0.45), sq = land > 0 && land < 0.25 ? 1 - 0.15 * Math.sin(Math.PI * land / 0.25) : 1;
      var hop = 0, ch = t - (8.1 + i * 0.22);
      if (ch > 0 && ch < 0.45) hop = Math.sin(Math.PI * ch / 0.45) * 30;
      var bob = land > 0.3 ? Math.sin((t - h.t0) * 2.6) * 1.5 : 0;
      ctx.save();
      ell(ctx, h.x, feet, 30 * clamp(u, 0.3, 1), 5); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      ctx.translate(h.x, fy - hop + bob);
      ctx.scale(HK / sq, HK * sq); ctx.translate(0, -20);
      hero(ctx, h.cls, h.f, 0, true);
      ctx.restore();
      // 落地揚塵
      if (land > 0 && land < 0.5) {
        var d = land / 0.5;
        for (var k = -1; k <= 1; k += 2) { ctx.save(); ctx.globalAlpha = 1 - d; ell(ctx, h.x + k * (20 + 40 * d), feet - 6, 14 + 10 * d, 8); ctx.fillStyle = '#efe7d6'; ctx.fill(); ctx.restore(); }
      }
    }
  }

  // ---------- 吊掛木牌結算 ----------
  var STAT = { time: '1:12:48', kills: 1284, mats: [['wood', 3420], ['stone', 1910], ['time', 655], ['soul', 1288]] };
  function sign(ctx, t) {
    var a = seg(t, 9.0, 9.8);
    if (a <= 0) return;
    var w = 540, h = 214, x = BX - w / 2, yEnd = 62, y = -h - 20 + (yEnd + h + 20) * eBack(a);
    var sw = Math.sin((t - 9.0) * 3.2) * 0.02 * Math.exp(-(t - 9.0) * 1.2);
    ctx.save(); ctx.translate(BX, 0); ctx.rotate(sw); ctx.translate(-BX, 0);
    // 繩
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 60, -10); ctx.lineTo(x + 60, y + 8); ctx.moveTo(x + w - 60, -10); ctx.lineTo(x + w - 60, y + 8); ctx.stroke();
    board(ctx, x, y, w, h);
    var cnt = eOut(seg(t, 9.6, 10.6));
    tag(ctx, x + 22, y + 20, w - 44, 92);
    text(ctx, '通關時間', x + 44, y + 44, 16, K.inkDim, 'left', true);
    text(ctx, STAT.time, x + w / 2 + 40, y + 70, 48, K.ink, 'center', true);
    text(ctx, '世界已恢復 ・ 8 關全破', x + 30, y + 132, 16, K.creamText, 'left', true, 4, K.edge);
    text(ctx, '打倒怪物 ' + grp(STAT.kills * cnt), x + w - 30, y + 132, 16, K.creamText, 'right', true, 4, K.edge);
    tag(ctx, x + 22, y + 150, w - 44, 44);
    for (var i = 0; i < 4; i++) {
      var mx = x + 50 + i * 122;
      matIcon(ctx, STAT.mats[i][0], mx, y + 172, 22);
      text(ctx, grp(STAT.mats[i][1] * cnt), mx + 16, y + 173, 16, K.ink, 'left', true);
    }
    ctx.restore();
  }

  function draw(ctx, t) {
    t = clamp(Number(t) || 0, 0, DUR);
    ctx.save();
    world(ctx, t);
    blight(ctx, t);
    boss(ctx, t);
    shards(ctx, t);
    heroes(ctx, t);
    flash(ctx, t);
    sign(ctx, t);
    var pulse = 0.7 + 0.3 * Math.cos((t - 10.6) * TAU * 0.8);
    anyKeyHint(ctx, BX, 650, 18, seg(t, 10.6, 11.0) * pulse);
    var fi = 1 - seg(t, 0, 0.4);
    if (fi > 0) { ctx.fillStyle = 'rgba(255,250,235,' + fi.toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'ending', id: 'C', kind: 'anim',
    size: [1280, 720],
    duration: DUR,
    loop: true,
    draw: draw
  };
})();
