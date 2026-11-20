/* repair-fog 方案 B: 特寫輪播 + 石料砸進去「一口氣完工」, 厚霧被炸散
 * 960×540 的特寫鏡頭(場景放大 1.5 倍), 輪流播四種工程: 斷橋·寶區 → 崩梯·捷徑 → 堵塞隧道·寶區 → 巢穴門·巢穴。
 * 未修: 斷掉 / 塞住的結構 + 工程牌; 後方是一團團有體積的厚霧(上亮下暗的霧球堆)。
 * 修復: 3 顆石料從畫面上方(= 面板)沿弧線砸進結構 → 白閃 + 衝擊環, 結構瞬間完工 →
 *       霧球被衝擊往外吹散、縮小淡出(0.8 秒), 露出的素材 / 寶箱 / 怪物依距離先後彈出。
 * 只用 Canvas 2D, 動態完全由 t 決定。
 */
(function () {
  'use strict';
  var Art = window.Art, P = Art.palette, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  var SEG = 2.6, N = 4, DURATION = SEG * N, IMP = 1.0, BLOW = 0.8, K = 1.5;

  function cl(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ph(t, a, d) { return cl((t - a) / d, 0, 1); }
  function eOut(p) { return 1 - Math.pow(1 - p, 3); }
  function back(p) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function gnd(ctx, c, r, top, th) { Art.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: top, theme: th }); }
  function block(ctx, c0, c1, r0, r1, th) { for (var c = c0; c <= c1; c++) for (var r = r0; r <= r1; r++) gnd(ctx, c, r, r === r0, th); }
  function star(ctx, x, y, r, n) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = (i % 2) ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function stoneIcon(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s / 19, s / 19);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1420';
    ctx.beginPath(); var a = [-8, 3, -5, -6, 4, -8, 9, -2, 7, 6, -3, 8]; ctx.moveTo(a[0], a[1]); for (var i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]); ctx.closePath();
    ctx.fillStyle = P.stone; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(4, -8); ctx.lineTo(9, -2); ctx.lineTo(1, -1); ctx.closePath(); ctx.fillStyle = P.stoneLight; ctx.fill();
    ctx.restore();
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
    if (q < 0.7) { ctx.save(); ctx.globalAlpha *= 1 - q / 0.7; star(ctx, x + 12, y - 14, 4 + q * 8, 4); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore(); }
  }

  // ---- 四個特寫(世界座標 640×360, 畫面放大 1.5 倍) ----
  var SCENES = [
    { name: '斷橋', role: 'treasure', theme: 'rock', target: [300, 220], anchor: [400, 210],
      fog: { x: 400, y: 40, w: 240, h: 200 }, sign: [140, 176], player: ['sword', 50, 178],
      cells: [[5, 5, 'end'], [6, 5], [7, 5], [8, 5], [9, 5, 'end']], kind: 'bridge',
      items: [{ k: 'time', x: 450, y: 176 }, { k: 'time', x: 490, y: 176 }, { k: 'frog', x: 532, y: 186 }, { k: 'chest', x: 596, y: 183 }] },
    { name: '崩梯', role: 'shortcut', theme: 'plain', target: [320, 220], anchor: [400, 140],
      fog: { x: 400, y: 0, w: 240, h: 160 }, sign: [180, 256], player: ['hunter', 60, 258],
      cells: [[6, 6, 'bottom'], [7, 5], [7, 6, 'bottom'], [8, 4], [8, 5], [8, 6], [9, 3], [9, 4], [9, 5], [9, 6]], kind: 'stairs',
      items: [{ k: 'flag', x: 560, y: 80 }] },
    { name: '堵塞隧道', role: 'treasure', theme: 'rock', target: [220, 240], anchor: [240, 240],
      fog: { x: 240, y: 200, w: 400, h: 80 }, sign: [150, 256], player: ['bomber', 60, 258],
      cells: [[5, 5], [5, 6]], kind: 'rubble',
      items: [{ k: 'stone', x: 320, y: 258 }, { k: 'stone', x: 360, y: 258 }, { k: 'boar', x: 470, y: 264 }, { k: 'chest', x: 592, y: 263 }] },
    { name: '巢穴門', role: 'nest', theme: 'rock', target: [240, 220], anchor: [280, 220],
      fog: { x: 280, y: 160, w: 360, h: 120 }, sign: [150, 256], player: ['sword', 60, 258],
      cells: [], kind: 'gate',
      items: [{ k: 'brood', x: 420, y: 252 }, { k: 'nest', x: 588, y: 256 }] }
  ];

  function roleCol(r) { return r === 'shortcut' ? P.shortcut : (r === 'treasure' ? P.treasure : P.nestRole); }
  function rmax(sc) {
    var f = sc.fog, m = 0, cs = [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.h], [f.x + f.w, f.y + f.h]];
    for (var i = 0; i < 4; i++) m = Math.max(m, Math.hypot(cs[i][0] - sc.anchor[0], cs[i][1] - sc.anchor[1]));
    return m;
  }

  function terrain(ctx, i, t) {
    if (i === 0) {
      ctx.fillStyle = '#141823'; ctx.fillRect(200, 200, 200, 160);
      for (var c = 5; c <= 9; c++) Art.drawSpike(ctx, { x: c * 40 + 20, y: 340 });
      block(ctx, 0, 4, 5, 8, 'rock'); block(ctx, 10, 15, 5, 8, 'rock');
    } else if (i === 1) {
      block(ctx, 0, 15, 7, 8, 'plain'); block(ctx, 10, 15, 3, 6, 'plain');
    } else if (i === 2) {
      ctx.fillStyle = '#231a14'; ctx.fillRect(200, 200, 440, 80);
      ctx.fillStyle = '#2e2219'; for (var k = 0; k < 16; k++) { ctx.beginPath(); ctx.ellipse(210 + k * 28, 208 + hash(k, 1) * 10, 11, 6, 0, 0, TAU); ctx.fill(); }
      block(ctx, 0, 15, 7, 8, 'rock'); block(ctx, 5, 15, 2, 4, 'rock');
    } else {
      Art.drawLairBack(ctx, { x: 280, y: 160, w: 360, h: 120 });
      block(ctx, 0, 15, 7, 8, 'rock'); block(ctx, 7, 15, 1, 3, 'rock');
    }
  }

  function drawItem(ctx, it, t) {
    if (it.k === 'wood' || it.k === 'stone' || it.k === 'time') Art.drawPickup(ctx, { x: it.x, y: it.y, kind: it.k, t: t });
    else if (it.k === 'chest') chest(ctx, it.x, it.y, t);
    else if (it.k === 'frog') Art.drawFrog(ctx, { x: it.x, y: it.y, facing: -1, state: 'crouch', hit: false, brood: false });
    else if (it.k === 'boar') Art.drawBoar(ctx, { x: it.x, y: it.y, facing: -1, state: 'walk', hit: false, brood: false, t: t });
    else if (it.k === 'brood') Art.drawBroodmother(ctx, { x: it.x, y: it.y, facing: -1, state: 'walk', hit: false, hp: 12, maxHp: 12, t: t });
    else if (it.k === 'nest') nest(ctx, it.x, it.y, t);
    else if (it.k === 'flag') flag(ctx, it.x, it.y, t);
  }

  function structure(ctx, sc, u, t) {
    var rep = u >= IMP, fl = 1 - ph(u, IMP, 0.3), j, c;
    if (sc.kind === 'gate') {
      Art.drawNestGate(ctx, { x: 240, y: 220, open: rep });
      if (rep && fl > 0) { ctx.save(); ctx.globalAlpha *= fl * 0.85; ctx.fillStyle = '#ffffff'; ctx.fillRect(212, 176, 56, 104); ctx.restore(); }
      if (rep) shards(ctx, sc, u, [[226, 200], [254, 196], [222, 236], [258, 232], [230, 266], [252, 262]], '#5d5670');
      return;
    }
    if (sc.kind === 'rubble' && rep) { shards(ctx, sc, u, [[208, 212], [228, 214], [216, 240], [206, 262], [230, 266], [220, 228]], P.rubble, true); return; }
    for (j = 0; j < sc.cells.length; j++) {
      c = sc.cells[j];
      Art.drawWorksite(ctx, { x: c[0] * 40 + 20, y: c[1] * 40 + 20, kind: sc.kind, repaired: rep, theme: sc.theme, end: c[2] === 'end', bottom: c[2] === 'bottom' });
      if (rep && fl > 0) { ctx.save(); ctx.globalAlpha *= fl * 0.9; ctx.fillStyle = '#ffffff'; ctx.fillRect(c[0] * 40, c[1] * 40, 40, 40); ctx.restore(); }
    }
  }
  // 破片飛散(亂石 / 封印石板)
  function shards(ctx, sc, u, pts, col, round) {
    var q = ph(u, IMP, 0.55); if (q >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - q;
    for (var i = 0; i < pts.length; i++) {
      var dx = -0.4 - hash(i, 2) * 0.9, dy = -0.8 - hash(i, 4) * 0.7;
      var x = pts[i][0] + dx * 90 * eOut(q), y = pts[i][1] + dy * 60 * eOut(q) + 160 * q * q, r = (round ? 9 : 8) * (1 - 0.3 * q);
      ctx.save(); ctx.translate(x, y); ctx.rotate(q * (i % 2 ? 4 : -4));
      ctx.beginPath();
      if (round) ctx.arc(0, 0, r, 0, TAU);
      else { ctx.moveTo(-r, -r * 0.6); ctx.lineTo(r * 0.8, -r); ctx.lineTo(r, r * 0.7); ctx.lineTo(-r * 0.6, r); ctx.closePath(); }
      ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 有體積的厚霧: 霧球堆, 上緣受光、下緣陰影
  function puffs(sc) {
    if (sc._p) return sc._p;
    var f = sc.fog, out = [], gy, gx, n = 0;
    for (gy = f.y + 14; gy < f.y + f.h; gy += 26) for (gx = f.x + 12; gx < f.x + f.w; gx += 30) {
      var h = hash(gx * 0.1, gy * 0.1);
      out.push({ x: gx + (h - 0.5) * 14, y: gy + (hash(gy, gx) - 0.5) * 10, r: 20 + h * 12, h: h, i: n++ });
    }
    sc._p = out; return out;
  }
  function fogB(ctx, sc, u, t) {
    var p = ph(u, IMP, BLOW); if (p >= 1) return;
    var f = sc.fog, ax = sc.anchor[0], ay = sc.anchor[1], list = puffs(sc), k, pf;
    ctx.save();
    var ga = ctx.globalAlpha;
    var ex = eOut(p) * 320; // 散開時剪裁框跟著往外長, 避免霧球在 p 剛大於 0 時突然溢出
    ctx.beginPath(); ctx.rect(f.x - ex, f.y - ex, f.w + ex * 2, f.h + ex * 2); ctx.clip();
    var base = 1 - ph(p, 0, 0.3);
    if (base > 0) { ctx.save(); ctx.globalAlpha *= base; ctx.fillStyle = '#868c99'; ctx.fillRect(f.x, f.y, f.w, f.h); ctx.restore(); }
    var layers = [['#6c7280', 4, 5, 1], ['#a2a8b5', 0, 0, 1], ['#cdd1d9', -5, -6, 0.55]];
    for (var L = 0; L < 3; L++) {
      for (k = 0; k < list.length; k++) {
        pf = list[k];
        var dx = pf.x - ax, dy = pf.y - ay, d = Math.hypot(dx, dy) || 1;
        var push = eOut(p) * (120 + pf.h * 110);
        var x = pf.x + Math.sin(t * 0.7 + pf.h * 6) * 4 + dx / d * push;
        var y = pf.y + Math.cos(t * 0.5 + pf.h * 5) * 3 + dy / d * push - 30 * p;
        var r = pf.r * (1 + 0.35 * p) * layers[L][3];
        var a = Math.pow(1 - p, 1.6);
        ctx.globalAlpha = ga * a;
        ctx.beginPath(); ctx.arc(x + layers[L][1], y + layers[L][2], r, 0, TAU); ctx.fillStyle = layers[L][0]; ctx.fill();
      }
    }
    ctx.restore();
  }

  function stones(ctx, sc, u) {
    var tx = sc.target[0], ty = sc.target[1];
    for (var k = 0; k < 3; k++) {
      var st = 0.45 + k * 0.09, sx = 320 + (k - 1) * 70, sy = -30;
      for (var tr = 2; tr >= 0; tr--) {
        var q = ph(u, st - tr * 0.035, 0.42);
        if (q <= 0 || q >= 1) continue;
        var e = q * q, cx = (sx + tx) / 2 + (k - 1) * 40, cy = Math.min(sy, ty) - 40;
        var x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * tx;
        var y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ty;
        ctx.save(); ctx.globalAlpha *= tr === 0 ? 1 : 0.35 / tr;
        stoneIcon(ctx, x, y, tr === 0 ? 18 : 14, q * 6 + k);
        ctx.restore();
      }
    }
    var f = ph(u, IMP, 0.45);
    if (f > 0 && f < 1) {
      ctx.save();
      ctx.beginPath(); ctx.arc(tx, ty, 10 + eOut(f) * 110, 0, TAU);
      ctx.lineWidth = 6 * (1 - f) + 1; ctx.strokeStyle = 'rgba(255,255,255,' + (1 - f).toFixed(3) + ')'; ctx.stroke();
      for (var s = 0; s < 8; s++) {
        var a = s / 8 * TAU + 0.3, d = 14 + eOut(f) * 60;
        ctx.beginPath(); ctx.arc(tx + Math.cos(a) * d, ty + Math.sin(a) * d, 3 * (1 - f) + 0.5, 0, TAU);
        ctx.fillStyle = 'rgba(213,219,226,' + (1 - f).toFixed(3) + ')'; ctx.fill();
      }
      ctx.restore();
    }
  }

  function signB(ctx, sc, u) {
    if (u < IMP) { Art.drawSiteSign(ctx, { x: sc.sign[0], y: sc.sign[1], role: sc.role }); return; }
    var q = ph(u, IMP, 0.45); if (q >= 1) return;
    // 工程牌被衝擊彈飛
    ctx.save(); ctx.globalAlpha *= 1 - q;
    ctx.translate(sc.sign[0] - 50 * q, sc.sign[1] + 24 - 50 * q + 120 * q * q); ctx.rotate(-q * 1.6);
    Art.drawSiteSign(ctx, { x: 0, y: -24, role: sc.role });
    ctx.restore();
  }

  function scene(ctx, i, u, t) {
    var sc = SCENES[i], R = rmax(sc), j;
    terrain(ctx, i, t);
    for (j = 0; j < sc.items.length; j++) {
      var it = sc.items[j], d = Math.hypot(it.x - sc.anchor[0], it.y - sc.anchor[1]);
      var tr = IMP + 0.1 + 0.5 * d / R;
      popAt(ctx, it.x, it.y, ph(u, tr, 0.3), (function (it2) { return function () { drawItem(ctx, it2, t); }; })(it));
    }
    structure(ctx, sc, u, t);
    fogB(ctx, sc, u, t);
    signB(ctx, sc, u);
    var pl = sc.player;
    Art.drawPlayer(ctx, { x: pl[1], y: pl[2], cls: pl[0], facing: 1, pose: 'idle', poseT: 0, invuln: false });
    stones(ctx, sc, u);
  }

  function label(ctx, sc) {
    ctx.save();
    ctx.font = 'bold 18px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var s = sc.name, w = ctx.measureText(s).width || 72;
    ctx.fillStyle = 'rgba(12,16,26,0.82)'; ctx.fillRect(16, 16, w + 44, 32);
    ctx.strokeStyle = roleCol(sc.role); ctx.lineWidth = 2; ctx.strokeRect(16, 16, w + 44, 32);
    ctx.beginPath(); ctx.arc(32, 32, 6, 0, TAU); ctx.fillStyle = roleCol(sc.role); ctx.fill();
    ctx.fillStyle = P.text; ctx.fillText(s, 46, 33);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'repair-fog', id: 'B', kind: 'anim',
    size: [960, 540],
    duration: DURATION,
    loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DURATION + DURATION) % DURATION;
      var i = Math.min(N - 1, Math.floor(t / SEG)), u = t - i * SEG;
      ctx.save();
      ctx.save(); ctx.scale(0.75, 0.75); Art.drawBackground(ctx); ctx.restore();
      ctx.save(); ctx.scale(K, K); scene(ctx, i, u, t); ctx.restore();
      label(ctx, SCENES[i]);
      var k = u > SEG - 0.15 ? (u - (SEG - 0.15)) / 0.15 : (u < 0.15 ? 1 - u / 0.15 : 0);
      if (k > 0) { ctx.fillStyle = 'rgba(8,10,16,' + cl(k, 0, 1).toFixed(3) + ')'; ctx.fillRect(0, 0, 960, 540); }
      ctx.restore();
    }
  };
})();
