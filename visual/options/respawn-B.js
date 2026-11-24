/* respawn 方案 B「雲中掉落」: 暗幕先掀開, 起點正上方噗地冒出一朵小雲, 角色從雲底被吐出、加速直直掉下,
 * 落地壓扁 + 兩側噴土 → 彈起一小下 → 再小壓扁 → 站好; 雲散成小團飄開。節奏: 快、Q 彈、有點好笑。
 * 取景: 第一關起點附近(世界 x 0~640、y 150~600), 角色站點 (100, 500)、腳底 520。角色用 Art.drawPlayer(hero 方案 A)。
 */
window.VISUAL_OPTION = (function () {
  var VW = 640, VH = 450, OY = 150;
  var PX = 100, PY = 500, FEET = 520;
  var CLS = 'sword';
  var DUR = 2.4, TAU = Math.PI * 2;
  var CY = OY + 46;                       // 雲中心(畫面上緣往下 46)
  var DROP0 = 0.62, Y0 = CY + 8;          // 角色從雲底吐出的時刻與高度
  var G = 3600;                           // 下墜加速度(px/s²): 300px 約 0.4 秒掉完
  var LAND = DROP0 + Math.sqrt(2 * (PY - Y0) / G);

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function backOut(p) { p = clamp(p, 0, 1); var s = 2.2; p -= 1; return p * p * ((s + 1) * p + s) + 1; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  function scene(ctx, t) {
    Art.drawBackground(ctx, { theme: 'forest', t: t });
    for (var c = 0; c <= 13; c++) for (var r = 13; r <= 14; r++)
      Art.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, theme: 'forest', open: { n: r === 13, e: c === 13, s: false, w: false } });
    Art.drawPickup(ctx, { x: 380, y: 420, kind: 'wood', t: t });
  }
  function curtain(ctx, dk) {
    if (dk <= 0.001) return;
    var g = ctx.createRadialGradient(PX, PY, 30, PX, PY, 200);
    g.addColorStop(0, 'rgba(10,6,20,' + (dk * 0.72).toFixed(3) + ')'); g.addColorStop(1, 'rgba(10,6,20,' + dk.toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, OY, VW, VH);
  }
  // 卡通雲: 平底 + 三個圓頂, 白身淡藍灰底影; k = 縮放, open = 雲底張口程度(吐出角色時)
  function cloud(ctx, x, y, k, open) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    var bumps = [[-30, 2, 16], [-12, -10, 21], [12, -8, 19], [30, 3, 15]];
    ctx.fillStyle = '#9fb0c2';
    for (var i = 0; i < bumps.length; i++) { ctx.beginPath(); ctx.arc(bumps[i][0], bumps[i][1] + 4, bumps[i][2], 0, TAU); ctx.fill(); }
    ctx.fillRect(-30, 4, 60, 15);
    ctx.fillStyle = '#ffffff';
    for (i = 0; i < bumps.length; i++) { ctx.beginPath(); ctx.arc(bumps[i][0], bumps[i][1], bumps[i][2], 0, TAU); ctx.fill(); }
    ctx.fillRect(-30, 0, 60, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(-16, -16, 6, 0, TAU); ctx.fill();
    if (open > 0) { // 雲底張開的深色口
      ctx.fillStyle = 'rgba(70,86,110,' + (0.8 * open).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(0, 13, 14 * open, 4 * open, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function puff(ctx, x, y, r, a) {
    if (a <= 0.01 || r <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = '#e9ddc6'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(160,130,90,0.5)'; ctx.beginPath(); ctx.arc(x + r * 0.25, y + r * 0.3, r * 0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  return {
    element: 'respawn', id: 'B', kind: 'anim',
    size: [VW, VH], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((t % DUR) + DUR) % DUR;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
      ctx.translate(0, -OY);
      scene(ctx, t);
      // 時間軸: 0~0.3 暗幕掀開 / 0.3~0.5 雲噗地冒出 / 0.5~0.62 雲鼓脹抖動 / 0.62 吐出角色、加速下墜 / LAND(≈1.03)壓扁噴土 → 彈起 → 小壓扁 → 站好 / 雲 0.75 起散開
      curtain(ctx, 0.7 * (1 - eOut(seg(t, 0, 0.3))));

      // 雲
      if (t >= 0.3) {
        var app = backOut(seg(t, 0.3, 0.5));
        var swell = t < DROP0 ? 1 + 0.08 * seg(t, 0.5, DROP0) + 0.03 * Math.sin(t * 70) * seg(t, 0.5, DROP0) : 1;
        var gone = seg(t, 0.75, 1.15);
        if (gone < 1) {
          if (gone <= 0) cloud(ctx, PX, CY, 0.9 * app * swell, seg(t, 0.55, DROP0) * (1 - seg(t, DROP0, DROP0 + 0.15)));
          else { // 散開: 分成 4 小團往外飄淡出
            ctx.save(); ctx.globalAlpha = 1 - gone;
            for (var i = 0; i < 4; i++) {
              var a = -Math.PI * 0.9 + i * Math.PI * 0.6, d = 30 * eOut(gone);
              ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(PX + (i - 1.5) * 18 + Math.cos(a) * d, CY - 4 + Math.sin(a) * d * 0.5, (15 - 3 * i % 2) * (1 - 0.5 * gone), 0, TAU); ctx.fill();
            }
            ctx.restore();
          }
        }
        // 冒出那一下: 外擴的白色小環
        var pp = seg(t, 0.3, 0.48);
        if (pp > 0 && pp < 1) { ctx.save(); ctx.globalAlpha = 1 - pp; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(PX, CY, 30 + 40 * pp, 18 + 22 * pp, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
      }

      // 角色
      if (t >= DROP0) {
        var y, sx = 1, sy = 1, pose = 'fall';
        if (t < LAND) {
          var u = t - DROP0, v = G * u;                // 速度
          y = Y0 + 0.5 * G * u * u;
          var st = clamp(v / 1500, 0, 1);              // 越快拉得越長
          sx = 1 - 0.12 * st; sy = 1 + 0.16 * st;
          // 速度線: 角色頭頂上方往上拖
          ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineCap = 'round';
          var ls = [[-10, 1], [0, 1.4], [10, 0.9]];
          for (var k = 0; k < ls.length; k++) {
            var len = Math.min(70, 50 * st * ls[k][1]), x0 = PX + ls[k][0], yTop = y - 22 - len;
            if (len < 4) continue;
            ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, Math.max(yTop, Y0)); ctx.lineTo(x0, y - 22); ctx.stroke();
          }
          ctx.restore();
        } else {
          var L = t - LAND; pose = 'idle'; y = PY;
          if (L < 0.12) { // 著地瞬間壓到最扁(寬 1.38、高 0.64), 0.12 秒回彈
            var sq = 0.36 * Math.cos(Math.PI * 0.5 * L / 0.12); sx = 1 + sq * 1.05; sy = 1 - sq;
          } else if (L < 0.34) { // 彈起 14px, 微拉長
            var h = (L - 0.12) / 0.22, sh = Math.sin(Math.PI * h); y = PY - 14 * sh;
            sx = 1 - 0.08 * sh; sy = 1 + 0.1 * sh; pose = h < 0.5 ? 'rise' : 'fall';
          } else if (L < 0.46) { // 第二次小壓扁
            var m = Math.sin(Math.PI * (L - 0.34) / 0.12); sx = 1 + 0.14 * m; sy = 1 - 0.13 * m;
          } else if (L < 0.56) { // 微微回彈後站定
            var n = Math.sin(Math.PI * (L - 0.46) / 0.1); sx = 1 - 0.03 * n; sy = 1 + 0.03 * n;
          }
        }
        // 縮放以腳底為軸(底邊不動)
        var feet = y + 20;
        ctx.save();
        ctx.translate(PX, feet); ctx.scale(sx, sy); ctx.translate(-PX, -feet);
        Art.drawPlayer(ctx, { x: PX, y: y, cls: CLS, facing: 1, pose: pose, poseT: t });
        ctx.restore();
      }

      // 落地: 兩側各噴 3 團土 + 地面衝擊短線; 第二次小落地再噴 1 對小團
      var dp = seg(t, LAND, LAND + 0.45);
      if (dp > 0 && dp < 1) {
        for (var j = 0; j < 6; j++) {
          var side = j < 3 ? -1 : 1, idx = j % 3, e = eOut(dp);
          var dx = side * (16 + (22 + idx * 14) * e), dy = -(6 + idx * 5) * Math.sin(Math.PI * Math.min(1, dp * 1.4));
          puff(ctx, PX + dx, FEET - 4 + dy, (5 + idx * 1.5) * (0.6 + 0.6 * e), 1 - dp);
        }
        ctx.save(); ctx.globalAlpha = 1 - dp; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (var w = 0; w < 4; w++) { // 衝擊短線: 從腳邊往左上 / 右上斜射
          var sd = w < 2 ? -1 : 1, ang = 0.3 + (w % 2) * 0.45, r1 = 20 + 14 * eOut(dp), r2 = r1 + 9;
          ctx.beginPath();
          ctx.moveTo(PX + sd * Math.cos(ang) * r1, FEET - 4 - Math.sin(ang) * r1);
          ctx.lineTo(PX + sd * Math.cos(ang) * r2, FEET - 4 - Math.sin(ang) * r2); ctx.stroke();
        }
        ctx.restore();
      }
      var dp2 = seg(t, LAND + 0.34, LAND + 0.64);
      if (dp2 > 0 && dp2 < 1) { puff(ctx, PX - 16 - 14 * eOut(dp2), FEET - 3, 4, 1 - dp2); puff(ctx, PX + 16 + 14 * eOut(dp2), FEET - 3, 4, 1 - dp2); }
      ctx.restore();
    }
  };
})();
