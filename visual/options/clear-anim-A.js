/* clear-anim 方案 A: 升旗歡呼(在旗子原地演, 鏡頭不動)
 * 0.00~0.10 角色蹲下蓄力 / 旗桿開始往上伸
 * 0.10~0.48 角色第一跳(cheer)/ 旗桿伸高 48、旗面沿桿爬到新頂端並回彈
 * 0.48     旗面到頂: 白閃 + 打勾章放大蓋下 + 旗面放大 1.25 倍, 金星從旗面往上噴, 腳下金色地光
 * 0.50~0.86 角色第二跳(較低)落地揚塵; 旗子大幅揮動
 * 0.86~1.30 收: 揮動減弱、地光退成淡光, 角色舉劍定住
 * 1.30~1.70 停在最後一幀(遊戲裡此時出結算面板)
 * 角色: Art.drawPlayer(pose cheer); 旗: 照 Art.drawGoal 的造型、色票重畫(要能加高旗桿與放大旗面)。
 */
window.VISUAL_OPTION = {
  element: "clear-anim", id: "A", kind: "anim",
  size: [1280, 720],
  duration: 1.7,
  loop: true,
  draw: function (ctx, t) {
    var W = 1280, H = 720, TAU = Math.PI * 2, P = Art.palette;
    var GX = 1120, GY = 560, FLOOR = 600, PX = 1086, PY = 582;
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
    function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
    function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
    function backOut(p) { p = clamp(p, 0, 1); var c = 2.2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
    function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function star4(x, y, r) { ctx.beginPath(); var q = r * 0.28; ctx.moveTo(x, y - r); ctx.lineTo(x + q, y - q); ctx.lineTo(x + r, y); ctx.lineTo(x + q, y + q); ctx.lineTo(x, y + r); ctx.lineTo(x - q, y + q); ctx.lineTo(x - r, y); ctx.lineTo(x - q, y - q); ctx.closePath(); }

    // ---- 關卡場景(翠林谷地: 地面一排 + 兩塊浮台)----
    function scene(tt) {
      Art.drawBackground(ctx, { theme: 'forest', t: tt });
      var c, r;
      for (c = 0; c < 32; c++) for (r = 0; r < 3; r++) Art.drawGround(ctx, { x: 20 + c * 40, y: 620 + r * 40, theme: 'forest', open: { n: r === 0, e: false, s: false, w: false } });
      var plats = [[5, 9, 460], [15, 18, 380], [23, 25, 480]];
      for (var i = 0; i < plats.length; i++) for (c = plats[i][0]; c <= plats[i][1]; c++)
        Art.drawGround(ctx, { x: 20 + c * 40, y: plats[i][2], theme: 'forest', open: { n: true, s: true, w: c === plats[i][0], e: c === plats[i][1] } });
    }
    // ---- 終點旗(造型與色票照 Art.drawGoal; reached = 綠旗白勾)----
    // ext 旗桿加高, up 旗面上移, wv 擺幅, cs 旗面縮放(以掛點為軸), chk 打勾縮放, flash 旗面白閃 0~1
    function flag(x, y, o) {
      var ext = o.ext, up = o.up, wv = o.wv, cs = o.cs, lift = -3 - up;
      ctx.save();
      rr(x - 18, y + 34, 14, 6, 2); ctx.fillStyle = '#555c6a'; ctx.fill();
      ctx.fillStyle = '#e6e9ef'; ctx.fillRect(x - 13, y - 36 - ext, 4, 70 + ext);
      ctx.beginPath(); ctx.arc(x - 11, y - 37 - ext, 2.5, 0, TAU); ctx.fillStyle = P.gold; ctx.fill();
      ctx.translate(x - 9, y - 35 + lift); ctx.scale(cs, cs); ctx.translate(-(x - 9), -(y - 35 + lift));
      ctx.beginPath(); ctx.moveTo(x - 9, y - 35 + lift); ctx.quadraticCurveTo(x + 4, y - 37 + wv + lift, x + 19, y - 31 + lift + wv * 0.5);
      ctx.quadraticCurveTo(x + 4, y - 25 - wv + lift, x - 9, y - 15 + lift); ctx.closePath();
      ctx.fillStyle = P.goalReached; ctx.fill();
      if (o.flash > 0) { ctx.save(); ctx.globalAlpha *= o.flash; ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore(); }
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
      var cx = x + 2.5, cy = y - 27 + lift;
      ctx.translate(cx, cy); ctx.scale(o.chk, o.chk); ctx.translate(-cx, -cy);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x - 3, y - 27 + lift); ctx.lineTo(x + 1, y - 23 + lift); ctx.lineTo(x + 8, y - 31 + lift); ctx.stroke();
      ctx.restore();
    }

    var T = clamp(t, 0, 1.3);
    ctx.save();
    scene(t);

    // 腳下金色地光(0.48 起亮, 之後退成淡光)
    var glow = T < 0.48 ? 0.25 * seg(T, 0.3, 0.48) : 0.6 - 0.38 * seg(T, 0.55, 1.2);
    if (glow > 0.01) {
      ctx.save(); ctx.translate(GX - 20, FLOOR); ctx.scale(1, 0.32);
      var g = ctx.createRadialGradient(0, 0, 4, 0, 0, 150);
      g.addColorStop(0, 'rgba(255,216,74,' + glow.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,216,74,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.fill(); ctx.restore();
    }
    // 旗桿背後的光柱(旗面到頂那一刻最亮)
    var beam = T < 0.48 ? 0 : 0.35 * (1 - seg(T, 0.48, 1.1));
    if (beam > 0.01) {
      var bg = ctx.createLinearGradient(0, FLOOR, 0, FLOOR - 260);
      bg.addColorStop(0, 'rgba(255,236,150,' + beam.toFixed(3) + ')'); bg.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = bg; ctx.fillRect(GX - 36, FLOOR - 260, 50, 260);
    }

    // 旗: 桿伸高 → 旗面爬升回彈 → 到頂放大 + 打勾蓋章
    var ext = 48 * eOut(seg(T, 0.02, 0.3));
    var up = 48 * backOut(seg(T, 0.1, 0.48));
    var hit = seg(T, 0.48, 0.7);
    var cs = T < 0.48 ? 1 : 1.25 + 0.15 * Math.sin(Math.PI * seg(T, 0.48, 0.62));
    var chk = T < 0.48 ? 1 : 1 + 0.9 * (1 - eOut(hit));
    var amp = T < 0.45 ? 2 : 7 * (1 - 0.65 * seg(T, 0.9, 1.3));
    var wv = Math.sin(T * (T < 0.45 ? 10 : 22)) * amp;
    flag(GX, GY, { ext: ext, up: up, wv: wv, cs: cs, chk: chk, flash: T < 0.48 ? 0 : 1 - seg(T, 0.48, 0.6) });

    // 金星從旗面往上噴(呼應 drawGoal 慶祝的金色光點, 份量放大)
    if (T >= 0.48) {
      var q = seg(T, 0.48, 1.25), ox = GX + 6, oy = GY - 28 - 3 - up;
      for (var i = 0; i < 14; i++) {
        var a = -Math.PI / 2 + (i - 6.5) * 0.17, d = (46 + 46 * hash(i, 1)) * eOut(q);
        ctx.globalAlpha = 1 - q;
        star4(ox + Math.cos(a) * d, oy + Math.sin(a) * d + 40 * q * q, 5.5 * (1 - q) + 1.5);
        ctx.fillStyle = i % 2 ? P.select : '#fff6c0'; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // 角色: 蹲 → 大跳 → 落地 → 小跳 → 落地定住
    var yOff = 0, sq = 0, pose = 'cheer', p;
    if (T < 0.1) { pose = 'idle'; sq = 0.18 * sm(T / 0.1); }
    else if (T < 0.42) { p = (T - 0.1) / 0.32; yOff = -40 * 4 * p * (1 - p); sq = -0.08 * (1 - p); }
    else if (T < 0.5) { p = (T - 0.42) / 0.08; sq = 0.14 * Math.sin(Math.PI * p); }
    else if (T < 0.76) { p = (T - 0.5) / 0.26; yOff = -22 * 4 * p * (1 - p); }
    else if (T < 0.86) { p = (T - 0.76) / 0.1; sq = 0.08 * Math.sin(Math.PI * p); }
    // 影子
    ctx.save(); ctx.globalAlpha = 0.28 * (1 + yOff / 80); ctx.fillStyle = '#10180c';
    ctx.beginPath(); ctx.ellipse(PX, FLOOR - 1, 13 * (1 + yOff / 120), 3.5, 0, 0, TAU); ctx.fill(); ctx.restore();
    // 落地揚塵
    var lands = [0.42, 0.76];
    for (var k = 0; k < 2; k++) {
      var dq = seg(T, lands[k], lands[k] + 0.3);
      if (dq > 0 && dq < 1) {
        ctx.save(); ctx.globalAlpha = 0.7 * (1 - dq); ctx.fillStyle = '#efe6cc';
        for (var j = -1; j <= 1; j += 2) { ctx.beginPath(); ctx.arc(PX + j * (10 + 22 * eOut(dq)), FLOOR - 4 - 6 * dq, 4 + 3 * dq - k, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(PX, FLOOR); ctx.scale(1 + sq * 0.6, 1 - sq); ctx.translate(-PX, -FLOOR);
    Art.drawPlayer(ctx, { x: PX, y: PY + yOff, cls: 'sword', facing: 1, pose: pose, poseT: T });
    ctx.restore();

    // 旗面到頂的瞬間: 全畫面淡暖白一閃(只 0.2 秒)
    if (T >= 0.48 && T < 0.68) { ctx.fillStyle = 'rgba(255,248,220,' + (0.2 * (1 - seg(T, 0.48, 0.68))).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }

    Art.drawHud(ctx, { mode: 'level', stock: { wood: 42, stone: 18, crystal: 9, core: 4 }, ratePerMin: { wood: 6.2, stone: 2.4, crystal: 1.5, core: 0.6 }, time: 23.4, hp: 2, maxHp: 3 });
    ctx.restore();
  }
};
