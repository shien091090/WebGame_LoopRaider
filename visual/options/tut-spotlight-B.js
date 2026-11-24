/* tut-spotlight 方案 B — 聚光燈挖洞: 場景壓到很暗, 每處修復點一盞從上方照下的柔邊聚光燈(光錐 + 飄塵 + 暖白光緣); 箭頭戳進光洞
 * 依賴底版 polish/game/game/art/art.js(全域 Art)畫場景、工程結構、工程牌、迷霧、資訊列、教學橫幅; 不改 art.js。
 * 大箭頭與文字框為暫定樣式(待 tut-arrow / tut-text 定案)。只用 Canvas 2D, 畫面完全由 t 決定。
 */
(function () {
  'use strict';
  var W = 1280, H = 720, G = 40, TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function fr(v) { return v - Math.floor(v); }
  function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }

  // ---------- 第 1 關示意場景(32×18 格; 工程位置照 spec 第 1 關簡化排版) ----------
  // 1 = 地面格, 2 = 堵塞隧道亂石(畫成工程結構, 但對鄰格算實心)
  var MAP = (function () {
    var m = [], r, c;
    for (r = 0; r < 18; r++) { m.push([]); for (c = 0; c < 32; c++) m[r].push(0); }
    function fill(c0, c1, r0, r1, v) { for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) m[rr][cc] = v; }
    fill(0, 4, 10, 12, 1); fill(5, 13, 10, 11, 1); fill(0, 0, 13, 14, 1);      // 起點高台(下方挖出藏寶處 3 的石室)
    fill(0, 3, 15, 17, 1); fill(12, 31, 15, 17, 1);                            // 地面(第 4~11 欄是深坑)
    fill(27, 27, 8, 12, 1); fill(28, 30, 8, 10, 1); fill(31, 31, 8, 14, 1);    // 右側岩塊與右上岩台
    fill(27, 27, 13, 14, 2);                                                   // 堵塞隧道入口
    return m;
  })();
  function solid(c, r) { if (c < 0 || c > 31 || r > 17) return true; if (r < 0) return false; return MAP[r][c] > 0; }
  var STAIRS = [[16, 14], [18, 13], [20, 12], [22, 11], [24, 10], [26, 9]];
  var FOGS = [[1120, 440, 120, 160], [1080, 200, 200, 120], [40, 520, 160, 80]]; // 工程 1 / 2 / 3 的迷霧
  var SIGN_X = [1040, 610, 505], SIGN_Y = 576;                                  // 工程牌(底邊貼地 y 600)

  // 三處修復點: 每處 = 工程牌 + 結構格 + 迷霧 的矩形清單(互相貼齊不重疊), 箭頭尖端與指向
  function signRect(x) { return [x - 18, 551, 36, 49]; }
  var SITES = [
    { rects: [signRect(SIGN_X[0]), [1080, 520, 40, 80], FOGS[0]], tip: [1040, 546, Math.PI / 2] },
    { rects: [signRect(SIGN_X[1])].concat(STAIRS.map(function (p) { return [p[0] * G, p[1] * G, G, G]; }), [FOGS[1]]), tip: [900, 436, Math.PI / 2] },
    { rects: [signRect(SIGN_X[2]), [160, 600, 320, 40], FOGS[2]], tip: [330, 596, Math.PI / 2] }
  ];
  var ALL_RECTS = SITES[0].rects.concat(SITES[1].rects, SITES[2].rects);
  var TEXT = '收集素材後可以修復通道, 解鎖更多可以去的地方';

  function drawScene(ctx, t) {
    var A = window.Art, r, c, i;
    A.drawBackground(ctx, { theme: 'forest', t: t });
    for (r = 0; r < 18; r++) for (c = 0; c < 32; c++) {
      if (MAP[r][c] !== 1) continue;
      A.drawGround(ctx, { x: c * G + 20, y: r * G + 20, theme: 'forest', open: { n: !solid(c, r - 1), e: !solid(c + 1, r), s: !solid(c, r + 1), w: !solid(c - 1, r) } });
    }
    for (c = 4; c <= 11; c++) A.drawWorksite(ctx, { x: c * G + 20, y: 15 * G + 20, kind: 'bridge', role: 'treasure', repaired: false, theme: 'forest', end: c === 4 || c === 11 });
    for (i = 0; i < STAIRS.length; i++) A.drawWorksite(ctx, { x: STAIRS[i][0] * G + 20, y: STAIRS[i][1] * G + 20, kind: 'stairs', role: 'treasure', repaired: false, theme: 'forest', bottom: i === 0 });
    A.drawWorksite(ctx, { x: 27 * G + 20, y: 13 * G + 20, kind: 'rubble', role: 'treasure', repaired: false, theme: 'forest' });
    A.drawWorksite(ctx, { x: 27 * G + 20, y: 14 * G + 20, kind: 'rubble', role: 'treasure', repaired: false, theme: 'forest' });
    for (i = 0; i < 3; i++) A.drawSiteSign(ctx, { x: SIGN_X[i], y: SIGN_Y, role: 'treasure', num: i + 1 });
    A.drawPickup(ctx, { x: 780, y: 580, kind: 'wood', t: t });
    A.drawPickup(ctx, { x: 860, y: 580, kind: 'stone', t: t + 0.4 });
    A.drawBoar(ctx, { x: 965, y: 584, facing: -1, state: 'walk', t: 0.3 });
    A.drawPlayer(ctx, { x: 100, y: 382, cls: 'sword', facing: 1, pose: 'idle', poseT: 0 });
    for (i = 0; i < 3; i++) A.drawFog(ctx, { x: FOGS[i][0], y: FOGS[i][1], w: FOGS[i][2], h: FOGS[i][3], t: t, theme: 'forest', clearP: 0 });
  }
  function drawUi(ctx) {
    window.Art.drawHud(ctx, { mode: 'level', stock: { wood: 3, stone: 2, crystal: 0, core: 0 }, ratePerMin: { wood: 0, stone: 0, crystal: 0, core: 0 }, time: 42.3, hp: 3, maxHp: 3 });
    window.Art.drawSoundIcon(ctx, { x: 1250, y: 62, on: true });
  }
  function drawText(ctx, t, bx, by, bw, bh) {
    window.Art.drawTutorial(ctx, { stage: '14', text: TEXT, keys: ['z'], pressed: [], bx: bx, by: by, bw: bw, bh: bh, tip: null, t: t });
  }

  // ---------- 形狀工具 ----------
  function rrp(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function grow(rc, e) { return [rc[0] - e, rc[1] - e, rc[2] + 2 * e, rc[3] + 2 * e, Math.max(2, e + 2)]; }
  // 剪裁成「所有矩形(外擴 e)的聯集之外」: 逐一交集各矩形的補集, 矩形重疊也正確
  function clipOut(ctx, rects, e) {
    for (var i = 0; i < rects.length; i++) {
      var g = grow(rects[i], e);
      ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); rrp(ctx, g[0], g[1], g[2], g[3], g[4]); ctx.clip('evenodd');
    }
  }
  // 聯集外緣的一圈帶子(外擴 e 起、寬 lw): 只剩整體外輪廓, 相鄰矩形之間的內邊不畫
  function band(ctx, rects, e, lw, style, dash, dashOff) {
    ctx.save(); clipOut(ctx, rects, e);
    ctx.lineWidth = lw; ctx.strokeStyle = style;
    if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOff || 0; }
    for (var i = 0; i < rects.length; i++) { var g = grow(rects[i], e + lw / 2); ctx.beginPath(); rrp(ctx, g[0], g[1], g[2], g[3], g[4]); ctx.stroke(); }
    ctx.restore();
  }
  // 暫定大箭頭(tut-arrow 未定案前沿用教學箭頭的金底深邊造型, 放大 k 倍); 尖端在 (x, y), off = 沿指向軸往後退
  function bigArrow(ctx, x, y, ang, k, off, glow) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.translate(-Math.max(0, off), 0); ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -14); ctx.lineTo(-18, -6); ctx.lineTo(-40, -6); ctx.lineTo(-40, 6); ctx.lineTo(-18, 6); ctx.lineTo(-18, 14); ctx.closePath();
    if (glow > 0) { ctx.shadowColor = 'rgba(255,216,74,0.95)'; ctx.shadowBlur = glow; }
    ctx.fillStyle = '#ffd84a'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.6 / k * 1.6; ctx.strokeStyle = '#180f09'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3.5, 0); ctx.lineTo(-15, -9); ctx.lineTo(-15, -2.5); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    ctx.restore();
  }

  // ---------- 方案 B: 聚光燈挖洞壓暗 ----------
  // 場景壓到很暗, 三處修復點各打一盞從畫面上方照下來的聚光燈: 柔邊橢圓光洞 + 暖白光緣 + 光錐 + 錐內飄塵;
  // 光洞緩慢呼吸、光錐頂端輕晃; 箭頭從暗處「戳」進光洞。文字框放在中央上方的暗處。2.4 秒一圈。
  var DUR = 2.4;
  // 光洞(可重疊): cx, cy, rx, ry, 旋轉; site = 屬於哪一處
  var HOLES = [
    { site: 0, cx: 1132, cy: 520, rx: 150, ry: 118, rot: 0 },                       // 工程 1: 牌 + 亂石 + 石室迷霧
    { site: 1, cx: 838, cy: 476, rx: 276, ry: 64, rot: Math.atan2(-200, 455) },     // 工程 2: 牌 + 斜上的崩梯
    { site: 1, cx: 1180, cy: 260, rx: 142, ry: 86, rot: 0 },                        //         右上岩台迷霧
    { site: 2, cx: 120, cy: 560, rx: 113, ry: 58, rot: 0, noCone: true },                        // 工程 3: 高台下迷霧
    { site: 2, cx: 335, cy: 600, rx: 240, ry: 75, rot: 0 }                          //         斷橋 + 牌
  ];
  var LAYERS = 8, STEP = 7, DIM = 0.72, LA = 1 - Math.pow(1 - DIM, 1 / LAYERS);
  function holePath(ctx, h, b, e) { ctx.ellipse(h.cx, h.cy, Math.max(1, h.rx * b + e), Math.max(1, h.ry * b + e), h.rot, 0, TAU); }
  function hExt(h, b) { var c = Math.cos(h.rot), s = Math.sin(h.rot), rx = h.rx * b, ry = h.ry * b; return Math.sqrt(rx * rx * c * c + ry * ry * s * s); }
  function draw(ctx, t) {
    t = Number(t) || 0;
    var p = fr(t / DUR), i, k, j;
    drawScene(ctx, 3 + 0.8 * Math.sin(p * TAU));
    var b = 1 + 0.03 * Math.sin(p * TAU * 2); // 光洞呼吸(一圈 2 次)
    // 柔邊壓暗: 8 層, 每層挖的洞比前一層大 7px, 越外面疊越多層 → 從光緣往外 49px 漸暗到 72%
    for (k = 0; k < LAYERS; k++) {
      ctx.save();
      for (i = 0; i < HOLES.length; i++) { ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); holePath(ctx, HOLES[i], b, k * STEP); ctx.clip('evenodd'); }
      ctx.fillStyle = 'rgba(6,7,16,' + LA.toFixed(4) + ')'; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // 光錐: 從畫面上方打到光洞, 越往下越亮; 錐頂左右輕晃
    for (i = 0; i < HOLES.length; i++) {
      if (HOLES[i].noCone) continue; // 同一處的兩個光洞相鄰時只打一道光錐
      var h = HOLES[i], ex =hExt(h, b) * 0.92, sx = h.cx + 40 + 16 * Math.sin(p * TAU + i * 1.7);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(sx - 16, -10); ctx.lineTo(sx + 16, -10); ctx.lineTo(h.cx + ex, h.cy); ctx.lineTo(h.cx - ex, h.cy); ctx.closePath();
      var lg = ctx.createLinearGradient(0, -10, 0, h.cy);
      lg.addColorStop(0, 'rgba(255,238,196,0.10)'); lg.addColorStop(0.7, 'rgba(255,238,196,0.06)'); lg.addColorStop(1, 'rgba(255,238,196,0.12)');
      ctx.fillStyle = lg; ctx.fill(); ctx.clip();
      // 錐內飄塵(往下飄, 頭尾淡入淡出, 循環無接縫)
      for (j = 0; j < 7; j++) {
        var u = fr(p + j / 7), yy = -10 + u * (h.cy - 10), xx = sx + (h.cx - sx) * u + Math.sin(j * 2.3 + p * TAU) * ex * 0.6 * u;
        ctx.globalAlpha = 0.7 * Math.sin(Math.PI * u);
        ctx.fillStyle = '#fff3d0'; ctx.beginPath(); ctx.arc(xx, yy, 1.6 + (j % 3) * 0.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // 光緣: 暖白細線 + 外暈(就是修復點的邊緣光)
    ctx.save(); ctx.shadowColor = 'rgba(255,226,150,0.95)'; ctx.shadowBlur = 12; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,236,180,0.9)';
    // 重疊的光洞只描聯集外緣: 每條描邊剪掉其他光洞的內部
    for (i = 0; i < HOLES.length; i++) {
      ctx.save();
      for (j = 0; j < HOLES.length; j++) { if (j === i) continue; ctx.beginPath(); ctx.rect(-60, -60, W + 120, H + 120); holePath(ctx, HOLES[j], b, 0); ctx.clip('evenodd'); }
      ctx.beginPath(); holePath(ctx, HOLES[i], b, 1); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    drawUi(ctx);
    // 箭頭: 1.2 秒一次「戳」: 0.2 秒快速戳進(退 18 → 0), 再慢慢退回
    var q = fr(t / 1.2), off = q < 0.17 ? 18 * (1 - eOut(q / 0.17)) : 18 * sm((q - 0.17) / 0.83);
    for (i = 0; i < SITES.length; i++) { var tp = SITES[i].tip; bigArrow(ctx, tp[0], tp[1], tp[2], 2.2, off, q < 0.3 ? 14 * (1 - q / 0.3) : 0); }
    drawText(ctx, t, 290, 128, 700, 56);
  }
  window.VISUAL_OPTION = { element: 'tut-spotlight', id: 'B', kind: 'anim', size: [W, H], duration: DUR, loop: true, draw: draw };
})();
