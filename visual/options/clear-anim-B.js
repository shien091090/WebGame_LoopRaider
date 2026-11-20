/* clear-anim 方案 B: 素材匯聚爆開 → 入帳(把「這趟所得過關才入帳」演出來)
 * 0.00~0.26 這趟撿到的素材(圖示照 Art.icons.mat)從角色身上一顆顆彈出, 圍成一圈繞著角色
 * 0.26~0.62 圈越轉越快、越縮越小, 整團升到旗子上方匯成一點
 * 0.56~0.78 匯聚點長成四色光球(外圈四段 = 木 / 石 / 晶 / 核), 外圍細線往內吸
 * 0.78     爆開: 金色衝擊環 + 12 道光芒 + 全畫面淡閃, 素材往外噴一小段
 * 0.88~1.42 素材一顆顆沿弧線(Art.drawFlyingMaterial, 和大地圖回放飛行同一個長相)飛進資訊列;
 *           每顆飛到時該格持有數 +1、投幣壓扁(Art.drawHud 的 bumpT); 該種最後一顆到時格下冒「+N」(Art.drawPopup)
 * 1.42~1.90 停在入帳完的畫面(遊戲裡此時出結算面板)
 */
window.VISUAL_OPTION = {
  element: "clear-anim", id: "B", kind: "anim",
  size: [1280, 720],
  duration: 1.9,
  loop: true,
  draw: function (ctx, t) {
    var W = 1280, H = 720, TAU = Math.PI * 2, P = Art.palette;
    var GX = 1120, GY = 560, FLOOR = 600, PX = 1086, PY = 582;
    var HX = 1086, HY = 566;          // 角色身體中心
    var OX = 1100, OY = 462;          // 匯聚點(旗子上方)
    var SLOT = { wood: 36, stone: 206, crystal: 376, core: 546 }; // 資訊列各格圖示中心 x(y = 20)
    var BASE = { wood: 42, stone: 18, crystal: 9, core: 4 };
    var KC = { wood: P.wood, stone: P.stone, crystal: P.crystal, core: P.core };
    // 這趟所得: 木 5 / 石 3 / 晶 3 / 核 2, 交錯排(圈上顏色混在一起)
    var LIST = ['wood', 'stone', 'crystal', 'core', 'wood', 'stone', 'crystal', 'wood', 'core', 'stone', 'crystal', 'wood', 'wood'];
    var N = LIST.length, FLY = 0.3, BURST = 0.78;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
    function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
    function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
    function lerp(a, b, p) { return a + (b - a) * p; }
    function backOut(p) { p = clamp(p, 0, 1); var c = 2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
    function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function star4(x, y, r) { ctx.beginPath(); var q = r * 0.28; ctx.moveTo(x, y - r); ctx.lineTo(x + q, y - q); ctx.lineTo(x + r, y); ctx.lineTo(x + q, y + q); ctx.lineTo(x, y + r); ctx.lineTo(x - q, y + q); ctx.lineTo(x - r, y); ctx.lineTo(x - q, y - q); ctx.closePath(); }

    function scene(tt) {
      Art.drawBackground(ctx, { theme: 'forest', t: tt });
      var c, r;
      for (c = 0; c < 32; c++) for (r = 0; r < 3; r++) Art.drawGround(ctx, { x: 20 + c * 40, y: 620 + r * 40, theme: 'forest', open: { n: r === 0, e: false, s: false, w: false } });
      var plats = [[5, 9, 460], [15, 18, 380], [23, 25, 480]];
      for (var i = 0; i < plats.length; i++) for (c = plats[i][0]; c <= plats[i][1]; c++)
        Art.drawGround(ctx, { x: 20 + c * 40, y: plats[i][2], theme: 'forest', open: { n: true, s: true, w: c === plats[i][0], e: c === plats[i][1] } });
    }
    // 終點旗(照 Art.drawGoal 的 reached 造型重畫, 擺動由 t 決定)
    function flag(x, y, wv) {
      var lift = -3;
      ctx.save();
      rr(x - 18, y + 34, 14, 6, 2); ctx.fillStyle = '#555c6a'; ctx.fill();
      ctx.fillStyle = '#e6e9ef'; ctx.fillRect(x - 13, y - 36, 4, 70);
      ctx.beginPath(); ctx.arc(x - 11, y - 37, 2.5, 0, TAU); ctx.fillStyle = P.gold; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 9, y - 35 + lift); ctx.quadraticCurveTo(x + 4, y - 37 + wv + lift, x + 19, y - 31 + lift + wv * 0.5);
      ctx.quadraticCurveTo(x + 4, y - 25 - wv + lift, x - 9, y - 15 + lift); ctx.closePath();
      ctx.fillStyle = P.goalReached; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 27 + lift); ctx.lineTo(x + 1, y - 23 + lift); ctx.lineTo(x + 8, y - 31 + lift); ctx.stroke();
      ctx.restore();
    }
    // 第 i 顆在匯聚前的位置(T < 0.62)
    function orbitPos(i, T) {
      var a0 = i * 0.012, pp = seg(T, a0, a0 + 0.18);
      var c = seg(T, 0.26, 0.62), cc = c * c;
      var ang = -Math.PI / 2 + i / N * TAU + T * 2.2 + cc * TAU * 1.4;
      var R = 86 * backOut(pp) * (1 - cc);
      var cx = lerp(HX, OX, sm(c)), cy = lerp(HY, OY, sm(c));
      return { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R * 0.8, s: (pp > 0 ? backOut(pp) : 0) * (1 - 0.55 * cc), on: pp > 0 && c < 1 };
    }
    function sprayPos(i, T) { var a = i / N * TAU + 0.4, d = 64 * eOut(seg(T, BURST, BURST + 0.1)); return { x: OX + Math.cos(a) * d, y: OY + Math.sin(a) * d * 0.8 }; }
    function flyStart(i) { return 0.88 + i * 0.02; }

    var T = clamp(t, 0, 1.42), i, q;
    ctx.save();
    scene(t);
    flag(GX, GY, Math.sin(T * 16) * (T < BURST ? 3 : 6 * (1 - 0.6 * seg(T, 1, 1.42))));

    // 角色: 一直歡呼, 爆開那刻小跳
    var hop = T >= BURST ? -16 * Math.sin(Math.PI * seg(T, BURST, BURST + 0.24)) : 0;
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#10180c'; ctx.beginPath(); ctx.ellipse(PX, FLOOR - 1, 13, 3.5, 0, 0, TAU); ctx.fill(); ctx.restore();
    Art.drawPlayer(ctx, { x: PX, y: PY + hop, cls: 'sword', facing: 1, pose: 'cheer', poseT: T });

    // 1) 彈出 + 繞圈匯聚(帶短拖尾)
    if (T < 0.62) {
      for (i = 0; i < N; i++) {
        var k = LIST[i];
        for (var tr = 3; tr >= 1; tr--) {
          var pt = orbitPos(i, T - tr * 0.022);
          if (!pt.on || T < 0.26) continue;
          ctx.globalAlpha = 0.35 * (1 - tr / 4); ctx.fillStyle = KC[k];
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 5 * pt.s, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        var o = orbitPos(i, T);
        if (o.on && o.s > 0.05) Art.icons.mat(ctx, k, o.x, o.y, 24 * o.s);
      }
    }
    // 2) 四色光球 + 往內吸的細線
    if (T >= 0.56 && T < BURST + 0.04) {
      var g0 = seg(T, 0.56, 0.74), ro = 6 + 16 * eOut(g0) + 2 * Math.sin(T * 60) * g0;
      var gl = ctx.createRadialGradient(OX, OY, 0, OX, OY, ro * 2.4);
      gl.addColorStop(0, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.35, 'rgba(255,230,140,0.75)'); gl.addColorStop(1, 'rgba(255,216,74,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(OX, OY, ro * 2.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(OX, OY, ro, 0, TAU); ctx.fillStyle = '#fffdf0'; ctx.fill();
      var ks = ['wood', 'stone', 'crystal', 'core'], rot = T * 14;
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (i = 0; i < 4; i++) { ctx.strokeStyle = KC[ks[i]]; ctx.beginPath(); ctx.arc(OX, OY, ro + 6, rot + i * TAU / 4, rot + i * TAU / 4 + TAU / 4 - 0.35); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,246,200,0.8)'; ctx.lineWidth = 2;
      for (i = 0; i < 8; i++) {
        var la = i / 8 * TAU + 0.2, ph = ((T - 0.56) * 5 + hash(i, 2)) % 1, r1 = lerp(80, ro + 10, ph);
        ctx.globalAlpha = 0.8 * ph; ctx.beginPath(); ctx.moveTo(OX + Math.cos(la) * r1, OY + Math.sin(la) * r1); ctx.lineTo(OX + Math.cos(la) * (r1 + 18), OY + Math.sin(la) * (r1 + 18)); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // 3) 爆開: 金色衝擊環 + 光芒 + 淡閃
    if (T >= BURST && T < BURST + 0.34) {
      q = seg(T, BURST, BURST + 0.34);
      ctx.save(); ctx.globalAlpha = 1 - q;
      ctx.lineWidth = 7 * (1 - q) + 1; ctx.strokeStyle = P.select; ctx.beginPath(); ctx.arc(OX, OY, 20 + 140 * eOut(q), 0, TAU); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff6c0'; ctx.lineCap = 'round';
      for (i = 0; i < 12; i++) { var ra = i / 12 * TAU, a1 = 26 + 60 * eOut(q), a2 = a1 + 34 * (1 - q); ctx.beginPath(); ctx.moveTo(OX + Math.cos(ra) * a1, OY + Math.sin(ra) * a1); ctx.lineTo(OX + Math.cos(ra) * a2, OY + Math.sin(ra) * a2); ctx.stroke(); }
      ctx.restore();
      if (q < 0.5) { ctx.fillStyle = 'rgba(255,248,220,' + (0.18 * (1 - q * 2)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    // 4) 資訊列入帳: 先算每格已到幾顆、最後一顆到的時間
    var got = { wood: 0, stone: 0, crystal: 0, core: 0 }, total = { wood: 0, stone: 0, crystal: 0, core: 0 }, last = {}, bump = {};
    for (i = 0; i < N; i++) {
      var kk = LIST[i], arr = flyStart(i) + FLY; total[kk]++;
      if (T >= arr) { got[kk]++; last[kk] = arr; bump[kk] = T - arr; }
    }
    var stock = {};
    for (var key in BASE) stock[key] = BASE[key] + got[key];
    Art.drawHud(ctx, { mode: 'level', stock: stock, ratePerMin: { wood: 6.2, stone: 2.4, crystal: 1.5, core: 0.6 }, bumpT: bump, bumpDur: 0.2, time: 23.4, hp: 2, maxHp: 3 });
    // 「+N」在格下冒出(該種全部到齊後)
    for (key in total) if (got[key] === total[key] && last[key] !== undefined)
      Art.drawPopup(ctx, { x: SLOT[key] + 45, y: 62, kind: key, value: total[key], t: clamp(t, 0, 1.9) - last[key], dur: 0.9 });

    // 5) 噴開 → 飛進資訊列(畫在資訊列之上)
    if (T >= BURST) {
      for (i = 0; i < N; i++) {
        var k2 = LIST[i], s0 = flyStart(i), sp = sprayPos(i, T);
        if (T >= s0 + FLY) continue;
        if (T < s0) { // 噴開後原地輕晃等著出發
          Art.icons.mat(ctx, k2, sp.x, sp.y + Math.sin(T * 18 + i) * 2, 24);
          continue;
        }
        var f = seg(T, s0, s0 + FLY), fe = f * f * (3 - 2 * f), sx = sprayPos(i, s0);
        var tx = SLOT[k2], ty = 20, cx2 = lerp(sx.x, tx, 0.45), cy2 = 120 - 50 * hash(i, 7);
        var bx = (1 - fe) * (1 - fe) * sx.x + 2 * (1 - fe) * fe * cx2 + fe * fe * tx;
        var by = (1 - fe) * (1 - fe) * sx.y + 2 * (1 - fe) * fe * cy2 + fe * fe * ty;
        ctx.save(); ctx.translate(bx, by); var sc = lerp(1.4, 1, fe); ctx.scale(sc, sc);
        Art.drawFlyingMaterial(ctx, { x: 0, y: 0, kind: k2, t: f * 0.7, dur: 0.7 });
        ctx.restore();
      }
    }
    ctx.restore();
  }
};
