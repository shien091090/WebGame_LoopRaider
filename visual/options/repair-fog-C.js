/* repair-fog 方案 C: 戰略地圖式「未探索區」+ 一道亮線從工程掃進新區域
 * 一張完整關卡畫面(風蝕高崖), 3 處工程以任意順序修(隧道 → 巢穴門 → 斷橋), 左上角同步一張縮圖。
 * 未修: 迷霧畫成深藍黑底 + 斜線網紋 + 角色色虛線框(像地圖上沒探索的區塊), 和天空、地形明顯不同;
 *       虛線框的顏色 = 旁邊工程牌的角色色(捷徑青 / 寶區金 / 巢穴紫)。
 * 修復: 一道鋸齒亮線從工程起點出發, 一路掃過結構(掃到的木板就位 / 亂石化塵 / 石板升起)再掃進迷霧(0.8 秒),
 *       亮線經過的素材、寶箱、怪物依序彈出; 掃完新區域外框亮一圈角色色虛線再淡掉(「地圖變大了」)。
 * 只用 Canvas 2D, 動態完全由 t 決定。
 */
(function () {
  'use strict';
  var Art = window.Art, P = Art.palette, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  var TH = 'sky', DS = 0.3, FD = 0.8, OUTLINE = 1.2, DURATION = 9.0, INSET = 0.18;

  function cl(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ph(t, a, d) { return cl((t - a) / d, 0, 1); }
  function eOut(p) { return 1 - Math.pow(1 - p, 3); }
  function eIO(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function inv(fn, y) { var lo = 0, hi = 1; for (var i = 0; i < 24; i++) { var m = (lo + hi) / 2; if (fn(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; }
  function back(p) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function gnd(ctx, c, r, top) { Art.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: top, theme: TH }); }
  function block(ctx, c0, c1, r0, r1) { for (var c = c0; c <= c1; c++) for (var r = r0; r <= r1; r++) gnd(ctx, c, r, r === r0); }
  function star(ctx, x, y, r, n) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = (i % 2) ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function chest(ctx, x, y, t) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = '#2a1608';
    ctx.beginPath(); ctx.rect(x - 17, y - 2, 34, 19); ctx.fillStyle = P.chest; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 17, y - 2); ctx.quadraticCurveTo(x - 17, y - 14, x, y - 14); ctx.quadraticCurveTo(x + 17, y - 14, x + 17, y - 2); ctx.closePath();
    ctx.fillStyle = P.chestLid; ctx.fill(); ctx.stroke();
    ctx.fillStyle = P.gold; ctx.fillRect(x - 11, y - 12, 4, 29); ctx.fillRect(x + 7, y - 12, 4, 29);
    ctx.beginPath(); ctx.rect(x - 4, y - 5, 8, 8); ctx.fill(); ctx.stroke();
    var tw = 0.6 + 0.4 * Math.sin(t * 5);
    star(ctx, x + 14, y - 13, 3.5 * tw + 1, 4); ctx.fillStyle = '#fff6c0'; ctx.fill();
    ctx.restore();
  }
  function nest(ctx, x, y, t) {
    ctx.save(); var B = y + 24;
    ctx.beginPath(); ctx.moveTo(x - 31, B - 1); ctx.quadraticCurveTo(x - 28, y - 16, x, y - 16); ctx.quadraticCurveTo(x + 28, y - 16, x + 31, B - 1); ctx.closePath();
    ctx.fillStyle = P.nest; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#140a18'; ctx.stroke();
    var pu = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.beginPath(); ctx.ellipse(x, y + 6, 14 + pu * 2, 12 + pu * 2, 0, 0, TAU); ctx.fillStyle = 'rgba(194,100,255,' + (0.25 + pu * 0.25).toFixed(3) + ')'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 6, 10, 8, 0, 0, TAU); ctx.fillStyle = '#0c0410'; ctx.fill(); ctx.strokeStyle = P.brood; ctx.lineWidth = 2; ctx.stroke();
    for (var i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - 12 + i * 6, y + 19, 2.2, 0, TAU); ctx.fillStyle = P.brood; ctx.fill(); }
    ctx.restore();
  }
  function flag(ctx, x, y, t) {
    ctx.save();
    ctx.fillStyle = '#f2f4f8'; ctx.fillRect(x - 12, y - 40, 4, 80);
    var w = Math.sin(t * 4) * 2;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 38); ctx.quadraticCurveTo(x + 6, y - 34 + w, x + 18, y - 30); ctx.quadraticCurveTo(x + 6, y - 24 - w, x - 8, y - 18); ctx.closePath();
    ctx.fillStyle = P.goal; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a2a08'; ctx.stroke();
    star(ctx, x + 2, y - 28, 4.5, 5); ctx.fillStyle = '#e5484d'; ctx.fill();
    ctx.restore();
  }
  function popAt(ctx, x, y, q, fn) {
    if (q <= 0) return;
    var s = q < 1 ? Math.max(0.01, back(q)) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); fn(); ctx.restore();
  }
  function roleCol(r) { return r === 'shortcut' ? P.shortcut : (r === 'treasure' ? P.treasure : P.nestRole); }

  // ---- 工程資料(xs = 亮線起點, 掃過結構後進入 fog) ----
  var SITES = [
    { role: 'treasure', kind: 'bridge', xs: 280, sign: [240, 296], fog: { x: 520, y: 160, w: 280, h: 240 },
      items: [{ k: 'time', x: 580, y: 298 }, { k: 'time', x: 625, y: 298 }, { k: 'bee', x: 665, y: 228 }, { k: 'chest', x: 735, y: 303 }] },
    { role: 'shortcut', kind: 'rubble', xs: 840, sign: [800, 536], fog: { x: 880, y: 480, w: 160, h: 80 }, items: [] },
    { role: 'nest', kind: 'gate', xs: 1040, sign: [1000, 376], fog: { x: 1120, y: 440, w: 160, h: 120 },
      items: [{ k: 'brood', x: 1172, y: 532 }, { k: 'nest', x: 1244, y: 536 }] }
  ];
  // 自由順序: 隧道 → 巢穴門 → 斷橋
  var START = [5.6, 1.0, 3.3];

  function front(i, t) {
    var s = SITES[i], f = s.fog, u = t - START[i];
    if (u < 0) return -1e9;
    if (u < DS) return s.xs + (f.x - s.xs) * u / DS;
    if (u < DS + FD) return f.x + f.w * eIO((u - DS) / FD);
    return 1e9;
  }
  function passTime(i, x) {
    var s = SITES[i], f = s.fog;
    if (x <= f.x) return START[i] + DS * cl((x - s.xs) / (f.x - s.xs), 0, 1);
    return START[i] + DS + FD * inv(eIO, cl((x - f.x) / f.w, 0, 1));
  }

  function drawItem(ctx, it, t) {
    if (it.k === 'time' || it.k === 'stone' || it.k === 'wood') Art.drawPickup(ctx, { x: it.x, y: it.y, kind: it.k, t: t });
    else if (it.k === 'chest') chest(ctx, it.x, it.y, t);
    else if (it.k === 'bee') Art.drawShooterBee(ctx, { x: it.x, y: it.y + Math.sin(t * 2) * 6, facing: -1, state: 'fly', hit: false, brood: false, t: t });
    else if (it.k === 'brood') Art.drawBroodmother(ctx, { x: it.x, y: it.y, facing: -1, state: 'walk', hit: false, hp: 12, maxHp: 12, t: t });
    else if (it.k === 'nest') nest(ctx, it.x, it.y, t);
  }

  function dust(ctx, x, y, q) {
    if (q <= 0 || q >= 1) return;
    ctx.save(); ctx.globalAlpha *= (1 - q) * 0.9;
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI * (0.1 + 0.8 * i / 5), d = 26 * eOut(q);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 6 + q * 8, 0, TAU);
      ctx.fillStyle = i % 2 ? '#c9cdd6' : '#9aa1ae'; ctx.fill();
    }
    ctx.restore();
  }

  function structures(ctx, t) {
    var X, c, cx, j;
    // 斷橋: 亮線掃到哪, 木板鋪到哪
    X = front(0, t);
    for (c = 7; c <= 12; c++) {
      cx = c * 40 + 20; var rep = X >= cx;
      Art.drawWorksite(ctx, { x: cx, y: 340, kind: 'bridge', repaired: rep, theme: TH, end: c === 7 || c === 12 });
      if (rep) { var fl = 1 - cl((X - cx) / 60, 0, 1); if (fl > 0) { ctx.save(); ctx.globalAlpha *= fl * 0.8; ctx.fillStyle = '#fff6d8'; ctx.fillRect(c * 40, 320, 40, 40); ctx.restore(); } }
    }
    // 堵塞隧道: 亂石化塵
    X = front(1, t);
    if (X < 860) { for (j = 12; j <= 13; j++) Art.drawWorksite(ctx, { x: 860, y: j * 40 + 20, kind: 'rubble', repaired: false, theme: TH }); }
    else { var dq = ph(t, passTime(1, 860), 0.45); dust(ctx, 860, 540, dq); dust(ctx, 860, 500, dq); }
    // 巢穴門: 封印石板升進門楣
    X = front(2, t);
    var q = cl((X - 1040) / 80, 0, 1);
    if (q <= 0) Art.drawNestGate(ctx, { x: 1080, y: 500, open: false });
    else {
      Art.drawNestGate(ctx, { x: 1080, y: 500, open: true });
      if (q < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(1052, 456, 56, 104); ctx.clip();
        var dy = -q * 104;
        ctx.fillStyle = '#5d5670'; ctx.fillRect(1052, 456 + dy, 56, 104);
        ctx.strokeStyle = P.brood; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        for (j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(1062 + j * 12, 480 + dy); ctx.lineTo(1070 + j * 12, 526 + dy); ctx.stroke(); }
        ctx.restore();
      }
    }
  }

  // 未探索區: 深藍黑底 + 斜線網紋 + 角色色虛線框; 左緣是正在推進的鋸齒亮線
  function fogC(ctx, i, t) {
    var s = SITES[i], f = s.fog, X = front(i, t);
    if (X >= f.x + f.w) return;
    var started = X > f.x, bx = Math.max(f.x, X), col = roleCol(s.role);
    var pts = [], y;
    for (y = f.y; y <= f.y + f.h + 0.1; y += 8) {
      var jg = started ? (hash(Math.round(y / 8), i + 1) - 0.5) * 18 + Math.sin(t * 25 + y * 0.3) * 3 : 0;
      pts.push([Math.max(f.x, Math.min(f.x + f.w, bx + jg)), Math.min(y, f.y + f.h)]);
    }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(f.x + f.w, f.y);
    for (var k = 0; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.lineTo(f.x + f.w, f.y + f.h); ctx.closePath();
    ctx.fillStyle = 'rgba(18,23,36,0.96)'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(78,96,136,0.55)'; ctx.lineWidth = 2; ctx.beginPath();
    for (var x0 = f.x - f.h; x0 < f.x + f.w; x0 += 14) { ctx.moveTo(x0, f.y + f.h); ctx.lineTo(x0 + f.h, f.y); }
    ctx.stroke();
    ctx.restore();
    // 角色色虛線框(只框還沒掃開的部分)
    ctx.setLineDash([10, 6]); ctx.lineDashOffset = -t * 12; ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.globalAlpha *= 0.85;
    ctx.beginPath(); ctx.moveTo(bx, f.y + 1.5); ctx.lineTo(f.x + f.w - 1.5, f.y + 1.5); ctx.lineTo(f.x + f.w - 1.5, f.y + f.h - 1.5); ctx.lineTo(bx, f.y + f.h - 1.5);
    if (!started) ctx.closePath();
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha /= 0.85;
    if (started) { // 亮線 + 火星
      ctx.beginPath(); for (k = 0; k < pts.length; k++) { if (k) ctx.lineTo(pts[k][0], pts[k][1]); else ctx.moveTo(pts[k][0], pts[k][1]); }
      ctx.shadowColor = '#ffd36a'; ctx.shadowBlur = 14; ctx.lineWidth = 4; ctx.strokeStyle = '#fff1c4'; ctx.stroke(); ctx.shadowBlur = 0;
      for (k = 0; k < 12; k++) {
        var ph2 = (t * 2.2 + hash(k, 9)) % 1, ex = bx - ph2 * 46, ey = f.y + hash(k, 7) * f.h - ph2 * 22;
        ctx.beginPath(); ctx.arc(ex, ey, 2.4 * (1 - ph2) + 0.4, 0, TAU); ctx.fillStyle = 'rgba(255,225,150,' + (1 - ph2).toFixed(3) + ')'; ctx.fill();
      }
    }
    ctx.restore();
  }
  // 結構段的亮線(還沒進迷霧時, 亮線在結構上前進)
  function structSweep(ctx, i, t) {
    var s = SITES[i], f = s.fog, X = front(i, t);
    if (X <= s.xs || X >= f.x) return;
    var y0 = i === 0 ? 300 : (i === 1 ? 470 : 430), y1 = i === 0 ? 372 : 568;
    ctx.save(); ctx.shadowColor = '#ffd36a'; ctx.shadowBlur = 14; ctx.lineWidth = 4; ctx.strokeStyle = '#fff1c4';
    ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X, y1); ctx.stroke(); ctx.restore();
  }
  function outline(ctx, i, t) {
    var s = SITES[i], f = s.fog, q = ph(t, START[i] + DS + FD, OUTLINE);
    if (q <= 0 || q >= 1) return;
    var a = q < 0.5 ? 1 : (1 - q) / 0.5, col = roleCol(s.role);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.save(); ctx.fillStyle = col; ctx.globalAlpha *= 0.14 * (1 - q); ctx.fillRect(f.x, f.y, f.w, f.h); ctx.restore();
    ctx.setLineDash([12, 6]); ctx.lineDashOffset = -t * 40; ctx.lineWidth = 3; ctx.strokeStyle = col;
    var g = 6 * eOut(Math.min(1, q * 2));
    ctx.strokeRect(f.x - g, f.y - g, f.w + g * 2, f.h + g * 2);
    ctx.restore();
  }
  function signC(ctx, i, t) {
    var s = SITES[i], q = ph(t, START[i], 0.3);
    if (q >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - q;
    ctx.translate(s.sign[0], s.sign[1] + 24); ctx.rotate(-q * Math.PI / 2);
    Art.drawSiteSign(ctx, { x: 0, y: -24, role: s.role });
    ctx.restore();
  }

  function drawTunnelBack(ctx, t) {
    ctx.fillStyle = '#1f2330'; ctx.fillRect(840, 480, 200, 80);
    ctx.fillStyle = '#2a2f3e';
    for (var i = 0; i < 8; i++) { ctx.beginPath(); ctx.ellipse(852 + i * 26, 488 + hash(i, 1) * 10, 11, 6, 0, 0, TAU); ctx.fill(); }
    var g = ctx.createLinearGradient(1040, 0, 960, 0); g.addColorStop(0, 'rgba(220,235,255,0.5)'); g.addColorStop(1, 'rgba(220,235,255,0)');
    ctx.fillStyle = g; ctx.fillRect(960, 480, 80, 80);
  }

  function drawWorld(ctx, t) {
    var i, j;
    Art.drawBackground(ctx);
    drawTunnelBack(ctx, t);
    Art.drawLairBack(ctx, { x: 1120, y: 440, w: 160, h: 120 });
    block(ctx, 0, 31, 14, 17);   // 地面
    block(ctx, 0, 6, 8, 13);     // 左崖
    block(ctx, 13, 18, 8, 9);    // 浮島(寶區)
    block(ctx, 21, 25, 10, 11);  // 土丘(下方是隧道)
    block(ctx, 28, 31, 8, 10);   // 右崖(下方是巢穴)
    flag(ctx, 1220, 280, t);
    for (i = 0; i < SITES.length; i++) {
      for (j = 0; j < SITES[i].items.length; j++) {
        var it = SITES[i].items[j];
        popAt(ctx, it.x, it.y, ph(t, passTime(i, it.x - 10), 0.3), (function (it2) { return function () { drawItem(ctx, it2, t); }; })(it));
      }
    }
    structures(ctx, t);
    for (i = 0; i < SITES.length; i++) fogC(ctx, i, t);
    for (i = 0; i < SITES.length; i++) { structSweep(ctx, i, t); outline(ctx, i, t); signC(ctx, i, t); }
    Art.drawPlayer(ctx, { x: 60, y: 298, cls: 'bomber', facing: 1, pose: 'idle', poseT: 0, invuln: false });
  }

  window.VISUAL_OPTION = {
    element: 'repair-fog', id: 'C', kind: 'anim',
    size: [1280, 720],
    duration: DURATION,
    loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DURATION + DURATION) % DURATION;
      ctx.save();
      drawWorld(ctx, t);
      // 左上角同步縮圖(大地圖卡片 / 面板預覽同一套畫法, 縮小後未修 / 已修仍分得出)
      var iw = 1280 * INSET, ih = 720 * INSET;
      ctx.fillStyle = '#0d1119'; ctx.fillRect(16, 16, iw + 8, ih + 8);
      ctx.strokeStyle = '#8fa3bf'; ctx.lineWidth = 2; ctx.strokeRect(16, 16, iw + 8, ih + 8);
      ctx.save(); ctx.translate(20, 20); ctx.scale(INSET, INSET);
      ctx.beginPath(); ctx.rect(0, 0, 1280, 720); ctx.clip();
      drawWorld(ctx, t);
      ctx.restore();
      ctx.font = '13px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,0.9)'; ctx.strokeText('縮圖', 20, ih + 30);
      ctx.fillStyle = P.textDim; ctx.fillText('縮圖', 20, ih + 30);
      var k = t > DURATION - 0.4 ? (t - (DURATION - 0.4)) / 0.4 : (t < 0.3 ? 1 - t / 0.3 : 0);
      if (k > 0) { ctx.fillStyle = 'rgba(8,10,16,' + cl(k, 0, 1).toFixed(3) + ')'; ctx.fillRect(0, 0, 1280, 720); }
      ctx.restore();
    }
  };
})();
