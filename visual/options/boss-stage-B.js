/* boss-stage 方案 B — 機關心室
 * 巨像所守的地底機關大廳: 暗青銅鏽色石壁 + 背後一座緩轉的巨大齒輪, 兩側高牆把戰場圍成封閉的直井。
 * 構圖: 中央挖空成一整片地面(巨拳砸在兩塊銅砧上、大眼光束沿地面橫掃), 平台全部貼著兩側牆壁之字形往上爬,
 * 往上爬 = 躲開光束、拉近到巨拳待機高度反擊; 中央只留一座矮台。
 * 依賴: 方案頁先載入的 window.Art(玩家、箭、炸彈、資訊列、關卡卡片)。只用 Canvas 2D。
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;

  // ---------- 共用小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  // ---------- 守門巨像(final-boss 方案 B, 第一階段)----------
  var SS = { base: '#d4ab72', light: '#f0d4a2', shade: '#a27a49', deep: '#5e4428', line: '#160c12', glyph: '#5fe0d0', eye: '#ffcf4a', hot: '#fff6d8', danger: '#ff4a3d' };
  function sand(ctx, y0, y1) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, SS.light); g.addColorStop(0.35, SS.base); g.addColorStop(1, SS.shade); return g;
  }
  // 分離巨拳(指節朝下), side: -1 左拳 / +1 右拳(拇指朝中線)
  function fist(ctx, fx, fy, side) {
    ctx.save(); ctx.translate(fx, fy);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    rr(ctx, -34, -50, 68, 12, 5); ctx.fillStyle = SS.shade; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(95,224,208,0.75)'; ctx.fillRect(-26, -37, 52, 4);
    var tx = side < 0 ? 40 : -58;
    rr(ctx, tx, -18, 18, 34, 7); ctx.fillStyle = sand(ctx, -18, 16); ctx.fill(); ctx.stroke();
    rr(ctx, -46, -32, 92, 52, 14); ctx.fillStyle = sand(ctx, -32, 20); ctx.fill(); ctx.stroke();
    for (var i = 0; i < 4; i++) { rr(ctx, -44 + i * 22, 12, 20, 30, 6); ctx.fillStyle = sand(ctx, 12, 42); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-38, -14); ctx.lineTo(38, -14); ctx.moveTo(-38, 2); ctx.lineTo(38, 2); ctx.stroke();
    poly(ctx, [0, -26, 7, -19, 0, -12, -7, -19]); ctx.fillStyle = SS.glyph; ctx.fill();
    ctx.restore();
  }
  // 本體: cx 中線, T 頭頂; eye: 'idle' | 'charge' | 'fire'
  function colossus(ctx, cx, T, eye) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var g = ctx.createRadialGradient(cx, T + 100, 20, cx, T + 100, 250);
    g.addColorStop(0, 'rgba(255,207,74,0.16)'); g.addColorStop(1, 'rgba(255,207,74,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 260, T - 40, 520, 330);
    // 懸浮碎片
    for (var k = -1; k <= 1; k++) {
      var sx = cx + k * 40, sy = T + 214 + Math.abs(k) * -8;
      poly(ctx, [sx - 9, sy, sx, sy - 8, sx + 9, sy, sx, sy + 10]); ctx.fillStyle = SS.shade; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = SS.line; ctx.stroke();
    }
    ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    // 龍骨下身
    poly(ctx, [cx - 92, T + 150, cx + 92, T + 150, cx + 34, T + 180, cx, T + 196, cx - 34, T + 180]);
    ctx.fillStyle = SS.shade; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(95,224,208,0.7)'; poly(ctx, [cx, T + 160, cx + 8, T + 172, cx, T + 186, cx - 8, T + 172]); ctx.fill();
    // 肩甲
    for (var s = -1; s <= 1; s += 2) {
      var px = cx + s * 152;
      ctx.fillStyle = 'rgba(95,224,208,0.6)'; ctx.fillRect(Math.min(px - s * 48, cx + s * 104) - 2, T + 92, 8, 26);
      rr(ctx, px - 48, T + 54, 96, 86, 22); ctx.fillStyle = sand(ctx, T + 54, T + 140); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px - 40, T + 82); ctx.lineTo(px + 40, T + 82); ctx.moveTo(px - 42, T + 108); ctx.lineTo(px + 42, T + 108); ctx.stroke();
      ctx.fillStyle = SS.deep; circle(ctx, px - 28, T + 68, 4); ctx.fill(); circle(ctx, px + 28, T + 68, 4); ctx.fill();
      ctx.fillStyle = SS.glyph; ctx.fillRect(px - 20, T + 124, 40, 4);
      ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    }
    // 胸甲
    rr(ctx, cx - 104, T + 96, 208, 66, 14); ctx.fillStyle = sand(ctx, T + 96, T + 162); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
    for (var v = 0; v < 3; v++) { ctx.beginPath(); ctx.moveTo(cx - 90 + v * 10, T + 128); ctx.lineTo(cx - 90 + v * 10, T + 152); ctx.moveTo(cx + 90 - v * 10, T + 128); ctx.lineTo(cx + 90 - v * 10, T + 152); ctx.stroke(); }
    circle(ctx, cx, T + 140, 13); ctx.fillStyle = SS.deep; ctx.fill();
    circle(ctx, cx, T + 140, 8); ctx.fillStyle = SS.glyph; ctx.fill();
    // 頭
    ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    poly(ctx, [cx - 36, T + 2, cx - 26, T - 14, cx + 26, T - 14, cx + 36, T + 2]); ctx.fillStyle = SS.shade; ctx.fill(); ctx.stroke();
    poly(ctx, [cx - 78, T + 14, cx - 64, T, cx + 64, T, cx + 78, T + 14, cx + 78, T + 112, cx + 60, T + 124, cx - 60, T + 124, cx - 78, T + 112]);
    ctx.fillStyle = sand(ctx, T, T + 124); ctx.fill(); ctx.stroke();
    poly(ctx, [cx - 6, T - 10, cx, T - 4, cx + 6, T - 10, cx, T - 16]); ctx.fillStyle = SS.glyph; ctx.fill();
    poly(ctx, [cx - 70, T + 30, cx, T + 42, cx + 70, T + 30, cx + 70, T + 40, cx, T + 52, cx - 70, T + 40]); ctx.fillStyle = SS.deep; ctx.fill();
    ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 56, T + 58); ctx.lineTo(cx - 56, T + 108); ctx.moveTo(cx + 56, T + 58); ctx.lineTo(cx + 56, T + 108); ctx.stroke();
    ctx.strokeStyle = SS.deep; ctx.lineWidth = 3;
    for (var m = 0; m < 3; m++) { ctx.beginPath(); ctx.moveTo(cx - 26, T + 104 + m * 6); ctx.lineTo(cx + 26, T + 104 + m * 6); ctx.stroke(); }
    // 大眼
    var ey = T + 74;
    if (eye === 'charge' || eye === 'fire') {
      var eg = ctx.createRadialGradient(cx, ey, 6, cx, ey, eye === 'fire' ? 90 : 64);
      eg.addColorStop(0, 'rgba(255,230,140,0.85)'); eg.addColorStop(1, 'rgba(255,170,40,0)');
      ctx.fillStyle = eg; circle(ctx, cx, ey, eye === 'fire' ? 90 : 64); ctx.fill();
    }
    circle(ctx, cx, ey, 27); ctx.fillStyle = SS.deep; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = SS.line; ctx.stroke();
    circle(ctx, cx, ey, 19); ctx.fillStyle = SS.eye; ctx.fill();
    circle(ctx, cx, ey, eye === 'idle' ? 7 : 11); ctx.fillStyle = SS.hot; ctx.fill();
    if (eye === 'charge') {
      ctx.strokeStyle = 'rgba(255,214,110,0.9)'; ctx.lineWidth = 2.5;
      for (var a = 0; a < 8; a++) {
        var an = a / 8 * TAU + 0.2, r0 = 36, r1 = 56;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r1, ey + Math.sin(an) * r1); ctx.lineTo(cx + Math.cos(an) * r0, ey + Math.sin(an) * r0); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 頭上長血條: 兩道階段刻度
  function bossBar(ctx, cx, ratio) {
    ctx.save();
    rr(ctx, cx - 222, 44, 444, 12, 4); ctx.fillStyle = 'rgba(10,8,14,0.85)'; ctx.fill();
    ctx.fillStyle = '#ff4d5e'; ctx.fillRect(cx - 219, 47, 438 * ratio, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(cx - 219, 47, 438 * ratio, 2);
    ctx.fillStyle = '#f2f4f8'; ctx.fillRect(cx - 219 + 438 / 3 - 1, 44, 2, 12); ctx.fillRect(cx - 219 + 438 * 2 / 3 - 1, 44, 2, 12);
    ctx.restore();
  }
  // 落點預告: 地面上的影 + 紅色虛線環 + 落下軌跡
  function telegraph(ctx, x, groundY, rx, fromY) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,20,0.45)'; ctx.beginPath(); ctx.ellipse(x, groundY + 1, rx, rx * 0.2, 0, 0, TAU); ctx.fill();
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = SS.danger;
    ctx.beginPath(); ctx.ellipse(x, groundY + 1, rx, rx * 0.2, 0, 0, TAU); ctx.stroke();
    if (fromY != null) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,74,61,0.45)'; ctx.beginPath(); ctx.moveTo(x, fromY); ctx.lineTo(x, groundY - 6); ctx.stroke(); }
    ctx.restore();
  }
  // 碎岩(跟 Boss 同材質)
  function rock(ctx, x, y, r, seed) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,212,162,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r - 4); ctx.lineTo(x - r * 0.4, y - r - 22); ctx.moveTo(x + r * 0.4, y - r - 6); ctx.lineTo(x + r * 0.4, y - r - 18); ctx.stroke();
    var p = [];
    for (var i = 0; i < 7; i++) { var a = i / 7 * TAU + seed, rad = r * (0.75 + hash(seed, i) * 0.35); p.push(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    poly(ctx, p); ctx.fillStyle = sand(ctx, y - r, y + r); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = SS.line; ctx.stroke();
    ctx.restore();
  }

  // ---------- 本方案場景 ----------
  var TB = { bgTop: '#071718', bgLow: '#0f2d2b', gear: '#123a36', gearDark: '#0c2a27', gearRim: '#3a9d8c', wallIn: '#1b3734', wallMark: '#132a28', wallEdge: '#5aa595', top: '#9fe8d4', topHi: '#e4fff6', inner: '#2a534d', mark: '#1f413c', bronze: '#a8743a', bronzeHi: '#d9a35c', pipe: '#3c8c7c' };

  function floorTile(ctx, c, r, top, mini) {
    var L = c * 40, T = r * 40;
    ctx.fillStyle = TB.inner; ctx.fillRect(L, T, 40, 40);
    if (!mini) {
      ctx.strokeStyle = TB.mark; ctx.lineWidth = 2; ctx.strokeRect(L + 4, T + 14, 32, 22);
      ctx.fillStyle = TB.bronze; circle(ctx, L + 8, T + 18, 2); ctx.fill(); circle(ctx, L + 32, T + 18, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 0.5, 39, 39);
    }
    if (top) {
      ctx.fillStyle = TB.top; ctx.fillRect(L, T, 40, 10);
      if (!mini) { ctx.fillStyle = TB.topHi; ctx.fillRect(L, T, 40, 2.5); }
      ctx.fillStyle = TB.bronze; ctx.fillRect(L, T + 10, 40, 3);
    }
  }
  function wallTile(ctx, c, r, mini) {
    var L = c * 40, T = r * 40;
    ctx.fillStyle = TB.wallIn; ctx.fillRect(L, T, 40, 40);
    if (!mini) {
      ctx.strokeStyle = TB.wallMark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L, T + 20); ctx.lineTo(L + 40, T + 20);
      var off = (r % 2) * 20; ctx.moveTo(L + 10 + off, T); ctx.lineTo(L + 10 + off, T + 20); ctx.moveTo(L + 30 - off, T + 20); ctx.lineTo(L + 30 - off, T + 40); ctx.stroke();
    }
  }
  function slab(ctx, c0, c1, r0, r1, mini) {
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) floorTile(ctx, c, r, r === r0, mini);
  }
  function pair(ctx, c0, c1, r0, r1, mini) { slab(ctx, c0, c1, r0, r1, mini); slab(ctx, 31 - c1, 31 - c0, r0, r1, mini); }

  function gearPath(ctx, x, y, r, teeth, depth) {
    ctx.beginPath();
    for (var i = 0; i < teeth * 4; i++) {
      var a = i / (teeth * 4) * TAU, rad = (i % 4 < 2) ? r : r - depth;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); else ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  function gear(ctx, x, y, r, teeth, col, rim, mini) {
    ctx.save();
    gearPath(ctx, x, y, r, teeth, r * 0.08); ctx.fillStyle = col; ctx.fill();
    ctx.lineWidth = mini ? 26 : 3; ctx.strokeStyle = rim; ctx.stroke();
    if (!mini) {
      circle(ctx, x, y, r * 0.78); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = r * 0.09;
      for (var s = 0; s < 6; s++) { var a = s / 6 * TAU + 0.26; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); ctx.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74); ctx.stroke(); }
      circle(ctx, x, y, r * 0.18); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    }
    ctx.restore();
  }
  function pipe(ctx, x, y0, y1) {
    ctx.save();
    ctx.fillStyle = TB.pipe; ctx.fillRect(x - 7, y0, 14, y1 - y0);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 4, y0, 3, y1 - y0);
    ctx.fillStyle = TB.bronze;
    for (var y = y0 + 30; y < y1; y += 120) ctx.fillRect(x - 10, y, 20, 8);
    ctx.restore();
  }
  function lamp(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#2e4a46'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, y - 10); ctx.stroke();
    var g = ctx.createRadialGradient(x, y, 2, x, y, 40);
    g.addColorStop(0, 'rgba(150,255,225,0.55)'); g.addColorStop(1, 'rgba(150,255,225,0)');
    ctx.fillStyle = g; circle(ctx, x, y, 40); ctx.fill();
    rr(ctx, x - 7, y - 10, 14, 18, 4); ctx.fillStyle = '#bff8e8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = TB.bronze; ctx.stroke();
    ctx.restore();
  }
  // 巨拳落點: 嵌在地面的銅砧(常駐地貌)
  function anvil(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = TB.bronze; ctx.fillRect(x - 56, y, 112, 10);
    ctx.fillStyle = TB.bronzeHi; ctx.fillRect(x - 56, y, 112, 2.5);
    ctx.strokeStyle = '#4a2f12'; ctx.lineWidth = 2;
    ctx.beginPath(); for (var i = -2; i <= 2; i++) { ctx.moveTo(x + i * 20 - 4, y + 2); ctx.lineTo(x + i * 20 + 4, y + 9); } ctx.stroke();
    ctx.strokeStyle = 'rgba(8,20,20,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(x - 10, y + 13); ctx.lineTo(x - 26, y + 34); ctx.moveTo(x + 12, y + 13); ctx.lineTo(x + 30, y + 30); ctx.stroke();
    ctx.restore();
  }
  // 碎岩殘堆(地貌, 不是實心)
  function debris(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(162,122,73,0.75)'; ctx.strokeStyle = 'rgba(22,12,18,0.6)'; ctx.lineWidth = 1.5;
    var p = [[-14, 0, 9], [2, -2, 7], [14, 0, 6], [-4, -8, 5]];
    for (var i = 0; i < p.length; i++) { poly(ctx, [x + p[i][0] - p[i][2], y + p[i][1], x + p[i][0], y + p[i][1] - p[i][2], x + p[i][0] + p[i][2], y + p[i][1]]); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  function background(ctx, mini) {
    var g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, TB.bgTop); g.addColorStop(1, TB.bgLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    if (!mini) {
      gear(ctx, 250, 520, 150, 16, TB.gearDark, '#1e5a52', false);
      gear(ctx, 1040, 560, 120, 14, TB.gearDark, '#1e5a52', false);
    }
    // 巨型主齒輪(縮圖辨識記號)
    gear(ctx, 640, 250, 330, 28, TB.gear, TB.gearRim, mini);
    if (!mini) {
      ctx.fillStyle = 'rgba(160,255,230,0.05)';
      poly(ctx, [400, 40, 500, 40, 600, 640, 420, 640]); ctx.fill();
      poly(ctx, [780, 40, 880, 40, 860, 640, 680, 640]); ctx.fill();
      for (var i = 0; i < 24; i++) {
        ctx.fillStyle = 'rgba(170,255,230,' + (0.15 + hash(i, 4) * 0.25).toFixed(2) + ')';
        circle(ctx, 100 + hash(i, 1) * 1080, 80 + hash(i, 2) * 520, 1 + hash(i, 3) * 1.5); ctx.fill();
      }
    }
  }

  function terrain(ctx, mini) {
    // 兩側高牆
    for (var r = 1; r <= 17; r++) { wallTile(ctx, 0, r, mini); wallTile(ctx, 1, r, mini); wallTile(ctx, 30, r, mini); wallTile(ctx, 31, r, mini); }
    ctx.fillStyle = TB.wallEdge; ctx.fillRect(76, 40, 4, 680); ctx.fillRect(1200, 40, 4, 680);
    if (!mini) { pipe(ctx, 30, 40, 720); pipe(ctx, 1250, 40, 720); }
    // 地面(中央整片挖空 = 巨拳與光束的舞台)
    slab(ctx, 2, 29, 16, 17, mini);
    // 中央矮台
    slab(ctx, 13, 18, 15, 15, mini);
    // 貼牆之字形平台
    pair(ctx, 5, 8, 14, 15, mini);
    pair(ctx, 2, 4, 12, 12, mini);
    pair(ctx, 5, 8, 10, 10, mini);
    pair(ctx, 2, 4, 8, 8, mini);
    if (!mini) {
      // 懸空平台的吊鏈
      ctx.save(); ctx.strokeStyle = '#2e4a46'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
      var ch = [206, 354, 926, 1074];
      for (var i = 0; i < ch.length; i++) { ctx.beginPath(); ctx.moveTo(ch[i], 40); ctx.lineTo(ch[i], 400); ctx.stroke(); }
      ctx.restore();
      anvil(ctx, 400, 640); anvil(ctx, 880, 640);
      debris(ctx, 120, 640); debris(ctx, 1160, 640); debris(ctx, 590, 600);
      lamp(ctx, 290, 200); lamp(ctx, 990, 200);
    }
  }

  // 光束: 由大眼射到落點, 外光 → 內芯
  function beam(ctx, x0, y0, x1, y1, w) {
    ctx.save();
    var a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
    ctx.translate(x0, y0); ctx.rotate(a);
    var layers = [[w, 'rgba(255,170,40,0.35)'], [w * 0.55, 'rgba(255,214,110,0.9)'], [w * 0.2, '#fff6d8']];
    for (var i = 0; i < layers.length; i++) { var ww = layers[i][0]; poly(ctx, [0, -ww * 0.35, len, -ww / 2, len, ww / 2, 0, ww * 0.35]); ctx.fillStyle = layers[i][1]; ctx.fill(); }
    ctx.restore();
    ctx.save();
    var g = ctx.createRadialGradient(x1, y1, 4, x1, y1, 46);
    g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(1, 'rgba(255,150,40,0)');
    ctx.fillStyle = g; circle(ctx, x1, y1, 46); ctx.fill();
    ctx.restore();
  }
  // 光束掃過的灼痕(在地面頂帶上)
  function scorch(ctx, x0, x1, y) {
    ctx.save();
    var g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, 'rgba(255,150,50,0.9)');
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), y - 3, Math.abs(x1 - x0), 9);
    ctx.restore();
  }

  function scene(ctx, mini) {
    background(ctx, mini);
    terrain(ctx, mini);
    var cx = 640, T = 76;
    // 光束正由右往左掃過地面
    scorch(ctx, 1000, 770, 641);
    // 碎岩落區: 左側最高的貼牆平台
    telegraph(ctx, 140, 320, 22, mini ? null : 252);
    // 右拳已砸進銅砧(反擊空檔)
    fist(ctx, 880, 598, 1);
    if (!mini) {
      ctx.save(); ctx.fillStyle = 'rgba(220,200,170,0.5)';
      for (var d = 0; d < 5; d++) { ctx.beginPath(); ctx.ellipse(800 + d * 40, 634 - (d % 2) * 6, 18, 9, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // 左拳待機
    fist(ctx, 420, 262, -1);
    colossus(ctx, cx, T, 'fire');
    beam(ctx, cx, T + 74, 752, 600, 46);
    bossBar(ctx, cx, 0.64);
    rock(ctx, 140, 226, 16, 0.8);
    var A = window.Art;
    if (A) {
      A.drawPlayer(ctx, { x: 965, y: 618, cls: 'sword', facing: -1, pose: 'slash', poseT: 0.05 });
      A.drawPlayer(ctx, { x: 300, y: 538, cls: 'bomber', facing: 1, pose: 'throw', poseT: 0.1 });
      A.drawBomb(ctx, { x: 388, y: 478, t: 0 });
      A.drawPlayer(ctx, { x: 1000, y: 378, cls: 'hunter', facing: -1, pose: 'shoot', poseT: 0.1 });
      A.drawArrow(ctx, { x: 930, y: 330, angle: Math.atan2(150 - 378, 640 - 1000) });
    }
  }

  function thumbCard(ctx, name) {
    var A = window.Art, x = 1088, y = 52;
    if (!A) return;
    A.drawLevelCard(ctx, { x: x, y: y, index: 8, name: name, state: 'cleared', cost: null, stock: null, canAfford: true, rates: { wood: 22.4, stone: 18.6, time: 9.8, soul: 30.2 }, recordCls: 'sword', recordTime: 96.4, repairedCount: 3 });
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
    ctx.translate(x + 8, y + 8); ctx.scale(0.125, 0.125);
    scene(ctx, true);
    ctx.restore();
    A.drawCardOverlay(ctx, { x: x, y: y, accelLv: 0, newArea: false, selected: false });
    ctx.save();
    rr(ctx, x, y + 142, 176, 22, 5); ctx.fillStyle = 'rgba(10,14,24,0.8)'; ctx.fill();
    ctx.font = '12px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9d2e3'; ctx.fillText('↑ 大地圖卡片縮圖(實際比例)', x + 88, y + 153);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'boss-stage', id: 'B', kind: 'static',
    size: [1280, 720],
    duration: 0,
    loop: false,
    draw: function (ctx, t) {
      ctx.save();
      scene(ctx, false);
      if (window.Art) window.Art.drawHud(ctx, { mode: 'level', stock: { wood: 312, stone: 240, time: 96, soul: 130 }, ratePerMin: { wood: 48.2, stone: 31.5, time: 12.4, soul: 16.0 }, bumpT: {}, bumpDur: 0.15, time: 63.4, run: { wood: 0, stone: 6, time: 3, soul: 9 }, hp: 4, maxHp: 5, skillCdT: 1, skillCdDur: 1, cls: 'sword' });
      thumbCard(ctx, '機關心室');
      ctx.restore();
    }
  };
})();
