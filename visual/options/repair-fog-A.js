/* repair-fog 方案 A: 藍圖施工 + 從工程處向外推開的霧
 * 一張完整關卡畫面, 3 處工程依序修好(崩梯·寶區 → 堵塞隧道·捷徑 → 巢穴門·巢穴)。
 * 未修: 斷掉 / 塞住的結構 + 角色色虛線「施工藍圖」框出修好後的輪廓 + 工程牌; 後方灰霧。
 * 修復: 先施工(石階一欄一欄落下 / 亂石炸開 / 封印石板沉入地面), 再由工程處畫圓把霧推開(0.8 秒),
 *       推開的邊緣是一圈亮霧, 霧圈掃過的素材、寶箱、怪物依序彈出。
 * 只用 Canvas 2D, 動態完全由 t 決定。
 */
(function () {
  'use strict';
  var Art = window.Art, P = Art.palette, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  var TH = 'plain';

  function cl(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ph(t, a, d) { return cl((t - a) / d, 0, 1); }
  function eOut(p) { return 1 - Math.pow(1 - p, 3); }
  function back(p) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function gnd(ctx, c, r, top) { Art.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, top: top, theme: TH }); }
  function block(ctx, c0, c1, r0, r1) { for (var c = c0; c <= c1; c++) for (var r = r0; r <= r1; r++) gnd(ctx, c, r, r === r0); }
  function star(ctx, x, y, r, n) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, q = (i % 2) ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function stoneIcon(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 19, s / 19);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1420';
    ctx.beginPath(); var a = [-8, 3, -5, -6, 4, -8, 9, -2, 7, 6, -3, 8]; ctx.moveTo(a[0], a[1]); for (var i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]); ctx.closePath();
    ctx.fillStyle = P.stone; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -6); ctx.lineTo(4, -8); ctx.lineTo(9, -2); ctx.lineTo(1, -1); ctx.closePath(); ctx.fillStyle = P.stoneLight; ctx.fill();
    ctx.restore();
  }
  // 寶箱(同底版畫法, 閃光改由 t 驅動)
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
  // 巢口(運作中, 呼吸光由 t 驅動)
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
  function dust(ctx, x, y, q, n, spread) {
    if (q <= 0 || q >= 1) return;
    ctx.save(); ctx.globalAlpha *= (1 - q) * 0.85;
    for (var i = 0; i < n; i++) {
      var a = Math.PI + (i / (n - 1)) * Math.PI, d = spread * eOut(q);
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.45 - 4, 5 + q * 7, 0, TAU);
      ctx.fillStyle = i % 2 ? '#d8d2c4' : '#b9b2a2'; ctx.fill();
    }
    ctx.restore();
  }
  function popAt(ctx, x, y, q, fn) {
    if (q <= 0) return;
    var s = q < 1 ? Math.max(0.01, back(q)) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); fn(); ctx.restore();
    if (q < 0.7) { // 彈出瞬間的一顆白星
      ctx.save(); ctx.globalAlpha *= 1 - q / 0.7;
      star(ctx, x + 12, y - 14, 4 + q * 8, 4); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
    }
  }

  // ---- 工程資料 ----
  var STAIR_COLS = [4, 5, 6, 7, 8];
  var SITES = [
    { role: 'treasure', kind: 'stairs', sign: [110, 576], anchor: [360, 410], cost: 15, label: [260, 430],
      fog: { x: 360, y: 220, w: 280, h: 220 },
      ghost: [160, 600, 160, 560, 200, 560, 200, 520, 240, 520, 240, 480, 280, 480, 280, 440, 320, 440, 320, 400, 360, 400, 360, 600],
      items: [{ k: 'wood', x: 420, y: 378 }, { k: 'wood', x: 462, y: 378 }, { k: 'stone', x: 518, y: 378 }, { k: 'chest', x: 598, y: 383 }, { k: 'bee', x: 500, y: 300 }] },
    { role: 'shortcut', kind: 'rubble', sign: [800, 576], anchor: [880, 560], cost: 30, label: [860, 500],
      fog: { x: 880, y: 520, w: 120, h: 80 },
      ghost: [840, 520, 880, 520, 880, 600, 840, 600],
      items: [] },
    { role: 'nest', kind: 'gate', sign: [1020, 576], anchor: [1120, 540], cost: 45, label: [1080, 462],
      fog: { x: 1120, y: 480, w: 160, h: 120 },
      ghost: [1040, 480, 1120, 480, 1120, 600, 1040, 600],
      items: [{ k: 'brood', x: 1170, y: 572 }, { k: 'nest', x: 1244, y: 576 }] }
  ];
  var START = [1.0, 3.2, 5.4];
  var BUILD = 0.45, FOG_DELAY = 0.3, FOG_DUR = 0.8, DURATION = 8.4;

  function fogRmax(s) {
    var f = s.fog, ax = s.anchor[0], ay = s.anchor[1], m = 0;
    var cs = [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.h], [f.x + f.w, f.y + f.h]];
    for (var i = 0; i < 4; i++) m = Math.max(m, Math.hypot(cs[i][0] - ax, cs[i][1] - ay));
    return m + 24;
  }
  function revealTime(s, i, x, y) {
    var R = fogRmax(s), d = Math.hypot(x - s.anchor[0], y - s.anchor[1]);
    var pr = 1 - Math.cbrt(1 - cl(d / R, 0, 1));
    return START[i] + FOG_DELAY + pr * FOG_DUR;
  }

  function drawItem(ctx, it, t) {
    if (it.k === 'wood' || it.k === 'stone') Art.drawPickup(ctx, { x: it.x, y: it.y, kind: it.k, t: t });
    else if (it.k === 'chest') chest(ctx, it.x, it.y, t);
    else if (it.k === 'bee') Art.drawShooterBee(ctx, { x: it.x, y: it.y + Math.sin(t * 2) * 6, facing: -1, state: 'fly', hit: false, brood: false, t: t });
    else if (it.k === 'brood') Art.drawBroodmother(ctx, { x: it.x, y: it.y, facing: -1, state: 'walk', hit: false, hp: 12, maxHp: 12, t: t });
    else if (it.k === 'nest') nest(ctx, it.x, it.y, t);
  }

  // 施工藍圖: 角色色虛線框出「修好後的樣子」
  function ghost(ctx, s, t, a) {
    if (a <= 0) return;
    var g = s.ghost, col = s.role === 'shortcut' ? P.shortcut : (s.role === 'treasure' ? P.treasure : P.nestRole);
    ctx.save();
    ctx.globalAlpha *= a * (0.55 + 0.3 * Math.sin(t * 3));
    ctx.beginPath(); ctx.moveTo(g[0], g[1]); for (var i = 2; i < g.length; i += 2) ctx.lineTo(g[i], g[i + 1]); ctx.closePath();
    ctx.fillStyle = col; ctx.globalAlpha *= 0.18; ctx.fill(); ctx.globalAlpha /= 0.18;
    ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 18; ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
    ctx.restore();
  }

  function drawStairs(ctx, s, t, st) {
    for (var i = 0; i < STAIR_COLS.length; i++) {
      var c = STAIR_COLS[i], r0 = 14 - i, cs = st + i * 0.07, cp = ph(t, cs, 0.16), r;
      if (t < cs || cp <= 0) {
        for (r = r0; r <= 14; r++) Art.drawWorksite(ctx, { x: c * 40 + 20, y: r * 40 + 20, kind: 'stairs', repaired: false, theme: TH, bottom: r === 14 && i <= 2 });
      } else {
        ctx.save();
        ctx.globalAlpha *= Math.min(1, cp * 2.5);
        ctx.translate(0, -34 * (1 - cp) * (1 - cp));
        for (r = r0; r <= 14; r++) Art.drawWorksite(ctx, { x: c * 40 + 20, y: r * 40 + 20, kind: 'stairs', repaired: true, theme: TH });
        ctx.restore();
        dust(ctx, c * 40 + 20, 600, ph(t, cs + 0.16, 0.35), 5, 22);
      }
    }
  }

  var ROCKS = [[10, 10, 9], [29, 9, 9], [20, 22, 10], [8, 31, 8], [31, 31, 9]];
  function drawRubble(ctx, s, t, st) {
    var rows = [13, 14], L = 840;
    if (t < st) { for (var a = 0; a < 2; a++) Art.drawWorksite(ctx, { x: 860, y: rows[a] * 40 + 20, kind: 'rubble', repaired: false, theme: TH }); return; }
    var q = ph(t, st, 0.5);
    if (q >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - q;
    for (var j = 0; j < 2; j++) {
      var T = rows[j] * 40;
      for (var i = 0; i < ROCKS.length; i++) {
        var rk = ROCKS[i], x0 = L + rk[0], y0 = T + rk[1];
        var dx = (rk[0] - 20) / 20 - 0.6, dy = -0.6 - hash(i, j) * 0.6;
        var x = x0 + dx * 70 * eOut(q), y = y0 + dy * 50 * eOut(q) + 140 * q * q;
        ctx.beginPath(); ctx.arc(x, y, rk[2] * (1 - 0.4 * q), 0, TAU); ctx.fillStyle = P.rubble; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#151920'; ctx.stroke();
      }
    }
    ctx.restore();
    dust(ctx, 860, 600, q, 6, 34);
  }

  function drawGate(ctx, s, t, st) {
    if (t < st) { Art.drawNestGate(ctx, { x: 1080, y: 540, open: false }); return; }
    var q = ph(t, st, 0.4), sh = q < 1 ? Math.sin(t * 90) * 2.5 * (1 - q) : 0;
    ctx.save(); ctx.translate(sh, 0);
    Art.drawNestGate(ctx, { x: 1080, y: 540, open: true });
    if (q < 1) { // 封印石板沉進地面
      ctx.save(); ctx.beginPath(); ctx.rect(1052, 496, 56, 104); ctx.clip();
      var dy = q * q * 108;
      ctx.fillStyle = '#5d5670'; ctx.fillRect(1052, 496 + dy, 56, 104);
      ctx.strokeStyle = P.brood; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.globalAlpha *= 1 - q;
      for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(1062 + i * 12, 520 + dy); ctx.lineTo(1070 + i * 12, 566 + dy); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
    dust(ctx, 1080, 600, ph(t, st + 0.1, 0.45), 6, 40);
  }

  function drawFogA(ctx, s, t, p) {
    if (p >= 1) return;
    var f = s.fog, ax = s.anchor[0], ay = s.anchor[1], r = eOut(p) * fogRmax(s);
    ctx.save();
    ctx.beginPath(); ctx.rect(f.x, f.y, f.w, f.h);
    if (r > 0.5) { ctx.moveTo(ax + r, ay); ctx.arc(ax, ay, r, 0, TAU); }
    ctx.clip('evenodd');
    Art.drawFog(ctx, { x: f.x, y: f.y, w: f.w, h: f.h, alpha: 1, t: t });
    ctx.restore();
    if (r > 0.5) { // 推開的邊緣: 一圈亮霧 + 暖色細線
      ctx.save();
      ctx.beginPath(); ctx.rect(f.x - 4, f.y - 4, f.w + 8, f.h + 8); ctx.clip();
      for (var i = 0; i < 18; i++) {
        var a = i / 18 * TAU + hash(i, 3) * 0.3, rr = r + 4 + hash(i, 5) * 6;
        ctx.beginPath(); ctx.arc(ax + Math.cos(a) * rr, ay + Math.sin(a) * rr, 9 + 10 * (1 - p), 0, TAU);
        ctx.fillStyle = 'rgba(214,218,226,' + (0.85 * (1 - p)).toFixed(3) + ')'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(ax, ay, r, 0, TAU);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,238,180,' + (1 - p).toFixed(3) + ')'; ctx.stroke();
      ctx.restore();
    }
  }

  function costPop(ctx, s, t, st) {
    var q = ph(t, st, 1.0);
    if (q <= 0 || q >= 1) return;
    var x = s.label[0], y = s.label[1] - 30 * eOut(q);
    ctx.save(); ctx.globalAlpha *= q > 0.6 ? (1 - q) / 0.4 : 1;
    stoneIcon(ctx, x - 18, y, 20);
    ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,10,18,0.92)';
    ctx.strokeText('-' + s.cost, x - 4, y + 1); ctx.fillStyle = P.stoneLight; ctx.fillText('-' + s.cost, x - 4, y + 1);
    ctx.restore();
  }

  function sign(ctx, s, t, st) {
    if (t < st) { Art.drawSiteSign(ctx, { x: s.sign[0], y: s.sign[1], role: s.role }); return; }
    var q = ph(t, st, 0.25); if (q >= 1) return;
    ctx.save(); ctx.beginPath(); ctx.rect(s.sign[0] - 30, s.sign[1] - 60, 60, 84); ctx.clip();
    ctx.globalAlpha *= 1 - q; ctx.translate(0, q * 50);
    Art.drawSiteSign(ctx, { x: s.sign[0], y: s.sign[1], role: s.role });
    ctx.restore();
  }

  function drawTunnelBack(ctx, t) {
    ctx.save();
    ctx.fillStyle = '#231a14'; ctx.fillRect(840, 520, 160, 80);
    ctx.fillStyle = '#2e2219';
    for (var i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(850 + i * 24, 528 + hash(i, 1) * 10, 10, 6, 0, 0, TAU); ctx.fill(); }
    // 出口的光
    var g = ctx.createLinearGradient(1000, 0, 930, 0); g.addColorStop(0, 'rgba(255,230,160,0.55)'); g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g; ctx.fillRect(930, 520, 70, 80);
    // 掛燈
    ctx.strokeStyle = '#6a5038'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(940, 520); ctx.lineTo(940, 532); ctx.stroke();
    ctx.beginPath(); ctx.arc(940, 538, 5, 0, TAU); ctx.fillStyle = '#ffd36a'; ctx.fill();
    ctx.beginPath(); ctx.arc(940, 538, 12 + Math.sin(t * 6) * 1.5, 0, TAU); ctx.fillStyle = 'rgba(255,211,106,0.18)'; ctx.fill();
    ctx.restore();
  }

  function drawScene(ctx, t) {
    Art.drawBackground(ctx);
    drawTunnelBack(ctx, t);
    Art.drawLairBack(ctx, { x: 1120, y: 480, w: 160, h: 120 });
    // 地形
    block(ctx, 0, 31, 15, 17);           // 主路地面
    block(ctx, 9, 15, 10, 10);           // 崩梯通往的岩棚(寶區)
    block(ctx, 21, 24, 11, 12);          // 岩壁(下方是隧道)
    block(ctx, 28, 31, 9, 11);           // 右側崖(下方是巢穴)
    flag(ctx, 1220, 320, t);
    // 內容物(迷霧後面): 霧圈掃到才彈出
    var i, j, s;
    for (i = 0; i < SITES.length; i++) {
      s = SITES[i];
      for (j = 0; j < s.items.length; j++) {
        var it = s.items[j], tr = revealTime(s, i, it.x, it.y);
        popAt(ctx, it.x, it.y, ph(t, tr, 0.3), (function (it2) { return function () { drawItem(ctx, it2, t); }; })(it));
      }
    }
    // 結構
    drawStairs(ctx, SITES[0], t, START[0]);
    drawRubble(ctx, SITES[1], t, START[1]);
    drawGate(ctx, SITES[2], t, START[2]);
    for (i = 0; i < SITES.length; i++) ghost(ctx, SITES[i], t, 1 - ph(t, START[i], BUILD));
    // 迷霧
    for (i = 0; i < SITES.length; i++) drawFogA(ctx, SITES[i], t, ph(t, START[i] + FOG_DELAY, FOG_DUR));
    // 工程牌、玩家
    for (i = 0; i < SITES.length; i++) sign(ctx, SITES[i], t, START[i]);
    Art.drawPlayer(ctx, { x: 50, y: 578, cls: 'hunter', facing: 1, pose: 'idle', poseT: 0, invuln: false });
    for (i = 0; i < SITES.length; i++) costPop(ctx, SITES[i], t, START[i]);
  }

  window.VISUAL_OPTION = {
    element: 'repair-fog', id: 'A', kind: 'anim',
    size: [1280, 720],
    duration: DURATION,
    loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DURATION + DURATION) % DURATION;
      ctx.save();
      drawScene(ctx, t);
      // 循環接縫: 結尾淡黑, 開頭淡入
      var k = t > DURATION - 0.4 ? (t - (DURATION - 0.4)) / 0.4 : (t < 0.3 ? 1 - t / 0.3 : 0);
      if (k > 0) { ctx.fillStyle = 'rgba(8,10,16,' + cl(k, 0, 1).toFixed(3) + ')'; ctx.fillRect(0, 0, 1280, 720); }
      ctx.restore();
    }
  };
})();
