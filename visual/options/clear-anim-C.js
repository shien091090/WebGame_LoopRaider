/* clear-anim 方案 C: 鏡頭推近 + 木框光圈收合(畫面本身收束, 資訊列不動)
 * 0.00~0.12 定格白閃: 世界停住, 角色換歡呼、旗子揮動
 * 0.08~0.72 鏡頭以「角色與旗子之間」為中心推近到 1.7 倍; 同時光圈(介面木板 + 金色圈邊 + 8 顆角釘)從畫面外收到半徑 130, 只框住角色與旗
 * 0.72~0.86 光圈回彈一下(130 → 148 → 130), 圈內角色跳起、旗頂噴金星
 * 0.86~1.15 停在圈裡讓玩家看清「我過關了」
 * 1.15~1.40 光圈一口氣收成一點, 收合處閃一顆金星; 畫面全成介面木板(遊戲裡結算面板直接疊在這塊木板上)
 * 1.40~1.80 停在全木板 + 資訊列
 * 資訊列畫在最上層、不跟著推近(常駐資訊不隨鏡頭動)。角色: Art.drawPlayer; 旗: 照 Art.drawGoal 造型重畫。
 */
window.VISUAL_OPTION = {
  element: "clear-anim", id: "C", kind: "anim",
  size: [1280, 720],
  duration: 1.8,
  loop: true,
  draw: function (ctx, t) {
    var W = 1280, H = 720, TAU = Math.PI * 2, P = Art.palette;
    var GX = 1120, GY = 560, FLOOR = 600, PX = 1086, PY = 582;
    var FX = 1100, FY = 552;          // 推近與光圈的中心(角色與旗子之間)
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
    function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
    function eIn(p) { p = clamp(p, 0, 1); return p * p * p; }
    function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
    function eInOut(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function lerp(a, b, p) { return a + (b - a) * p; }
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

    var T = clamp(t, 0, 1.4), i, q;
    // 光圈半徑: 收 → 回彈 → 停 → 收成一點
    var R0 = 1260, RH = 130, r;
    if (T < 0.08) r = R0;
    else if (T < 0.72) r = lerp(R0, RH, eInOut(seg(T, 0.08, 0.72)));
    else if (T < 0.86) r = RH + 18 * Math.sin(Math.PI * seg(T, 0.72, 0.86));
    else if (T < 1.15) r = RH;
    else r = RH * (1 - eIn(seg(T, 1.15, 1.38)));
    var z = 1 + 0.7 * sm(seg(T, 0.08, 0.72));

    ctx.save();
    // ---- 世界(以 F 為中心推近; F 在畫面上不動, 四邊不會露出世界外)----
    if (r > 0.5) {
      ctx.save();
      ctx.translate(FX, FY); ctx.scale(z, z); ctx.translate(-FX, -FY);
      scene(t);
      flag(GX, GY, Math.sin(T * 18) * (T < 0.12 ? 2 : 6));
      var hop = T >= 0.72 ? -26 * Math.sin(Math.PI * seg(T, 0.72, 0.98)) : 0;
      ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#10180c'; ctx.beginPath(); ctx.ellipse(PX, FLOOR - 1, 13, 3.5, 0, 0, TAU); ctx.fill(); ctx.restore();
      Art.drawPlayer(ctx, { x: PX, y: PY + hop, cls: 'sword', facing: 1, pose: T < 0.06 ? 'idle' : 'cheer', poseT: T });
      if (T >= 0.74) { // 旗頂金星(和 drawGoal 慶祝同色)
        q = seg(T, 0.74, 1.3);
        for (i = 0; i < 9; i++) {
          var a = -Math.PI / 2 + (i - 4) * 0.22, d = (26 + 22 * hash(i, 3)) * eOut(q);
          ctx.globalAlpha = 1 - q; star4(GX + 4 + Math.cos(a) * d, GY - 40 + Math.sin(a) * d + 18 * q * q, 4 * (1 - q) + 1.2);
          ctx.fillStyle = i % 2 ? P.select : '#fff6c0'; ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // 定格白閃
      if (T < 0.14) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 * (1 - T / 0.14)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    // ---- 光圈遮罩: 介面木板(ui 方案 A 的板色 + 水平板縫)----
    if (r < R0 - 1) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H);
      if (r > 0.5) { ctx.moveTo(FX + r, FY); ctx.arc(FX, FY, r, 0, TAU, true); }
      ctx.clip('evenodd');
      ctx.fillStyle = P.board; ctx.fillRect(0, 0, W, H);
      for (var yy = 26; yy < H; yy += 26) { ctx.fillStyle = P.seam; ctx.fillRect(0, yy, W, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(0, yy + 1.5, W, 1); }
      // 圈內緣往外的淡暗影, 讓圈看起來像挖穿木板
      if (r > 0.5) {
        var sh = ctx.createRadialGradient(FX, FY, r, FX, FY, r + 40);
        sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sh; ctx.fillRect(FX - r - 40, FY - r - 40, (r + 40) * 2, (r + 40) * 2);
      }
      ctx.restore();
      if (r > 0.5) { // 圈邊: 深邊 + 金邊 + 角釘(角釘緩慢轉)
        ctx.save();
        ctx.lineWidth = 9; ctx.strokeStyle = P.edge; ctx.beginPath(); ctx.arc(FX, FY, r + 1, 0, TAU); ctx.stroke();
        ctx.lineWidth = 4; ctx.strokeStyle = P.select; ctx.beginPath(); ctx.arc(FX, FY, r, 0, TAU); ctx.stroke();
        if (T >= 0.72 && T < 1.0) { // 回彈時金邊外光
          ctx.globalAlpha = 1 - seg(T, 0.72, 1.0); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,216,74,0.45)';
          ctx.beginPath(); ctx.arc(FX, FY, r + 8, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (r < 700) {
          for (i = 0; i < 8; i++) {
            var na = i / 8 * TAU + T * 0.9, nx = FX + Math.cos(na) * (r + 13), ny = FY + Math.sin(na) * (r + 13);
            ctx.beginPath(); ctx.arc(nx, ny, 3, 0, TAU); ctx.fillStyle = P.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
    // 收合處金星
    if (T >= 1.26) {
      q = seg(T, 1.26, 1.4);
      var sr = 30 * Math.sin(Math.PI * q);
      if (sr > 0.2) { star4(FX, FY, sr); ctx.fillStyle = P.select; ctx.fill(); star4(FX, FY, sr * 0.45); ctx.fillStyle = '#fffbe6'; ctx.fill(); }
    }

    // ---- 資訊列: 最上層、不跟鏡頭動 ----
    Art.drawHud(ctx, { mode: 'level', stock: { wood: 42, stone: 18, crystal: 9, core: 4 }, ratePerMin: { wood: 6.2, stone: 2.4, crystal: 1.5, core: 0.6 }, time: 23.4, hp: 2, maxHp: 3 });
    ctx.restore();
  }
};
