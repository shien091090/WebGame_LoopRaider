/* death-anim 方案 C: 這趟紀錄中斷 — 世界褪成灰、這趟撿的素材碎成灰、角色像錄影訊號一樣抖動後收成一條線再熄滅
 * 角色沿用底版 Art.drawPlayer(hero 方案 A); 素材圖示用 Art.icons.mat; 地形 / 背景 / 失敗面板沿用 Art.drawGround / drawBackground / drawFailPanel。
 * 一圈 7.5 秒 = 三職業各 2.5 秒: 0~0.35 被敵彈打中前 / 0.35~1.65 死亡演出(1.3 秒)/ 1.65 起失敗面板。
 * 去色用 globalCompositeOperation = 'saturation' 作用於整個取景框(全畫面效果, 剪裁在框內); 遊戲內就是整張畫布。
 * 蜂彈照底版 drawBeeShot 的造型複製一份改吃 t(底版那支用系統時鐘旋轉); 挑中搬回遊戲時改呼叫匯出版。
 */
(function () {
  var W0 = 480, H0 = 360, CYC = 2.5, HIT = 0.35, DEATH = 1.3, TAU = Math.PI * 2;
  var CLS = ['sword', 'hunter', 'bomber'];
  var GT = 150, PX = 104, PY = GT - 18, K = 2;
  var MATS = ['wood', 'stone', 'crystal', 'core'];
  var MAT_OFF = [[-30, -30], [-11, -42], [11, -42], [30, -30]];
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eIn(p) { p = clamp(p, 0, 1); return p * p * p; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  function heart(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); ctx.closePath();
  }
  function hearts(ctx, u) {
    ctx.save();
    ctx.fillStyle = 'rgba(24,15,9,0.82)'; ctx.beginPath(); ctx.rect(8, 6, 84, 28); ctx.fill();
    for (var i = 0; i < 3; i++) {
      var x = 22 + i * 26, y = 21;
      heart(ctx, x, y, 8); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
      if (i < 2) continue;
      if (u < 0) { heart(ctx, x, y, 8); ctx.fillStyle = '#ff4d5e'; ctx.fill(); continue; }
      var p = seg(u, 0, 0.45);
      if (p >= 1) continue;
      for (var s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.globalAlpha *= 1 - p;
        ctx.translate(x + s * 7 * p, y + 12 * p * p); ctx.rotate(s * 0.6 * p);
        ctx.beginPath(); ctx.rect(s < 0 ? -12 : 0, -12, 12, 24); ctx.clip();
        heart(ctx, 0, 0, 8); ctx.fillStyle = '#ff4d5e'; ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function beeShot(ctx, x, y, t) {
    ctx.save(); ctx.fillStyle = '#5a1206';
    for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + t * 6; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); ctx.lineTo(x + Math.cos(a + 0.5) * 3.5, y + Math.sin(a + 0.5) * 3.5); ctx.lineTo(x + Math.cos(a - 0.5) * 3.5, y + Math.sin(a - 0.5) * 3.5); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, 4.4, 0, TAU); ctx.fillStyle = '#ff5a2a'; ctx.fill();
    ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.6, 0, TAU); ctx.fillStyle = '#ffd0a0'; ctx.fill();
    ctx.restore();
  }
  function ground(ctx) { for (var k = 0; k < 7; k++) Art.drawGround(ctx, { x: 20 + k * 40, y: GT + 20, theme: 'forest', open: { n: true } }); }
  function panel(ctx, v) {
    var a = eOut(seg(v, 0, 0.2));
    ctx.save();
    if (v > 0) {
      ctx.globalAlpha *= a;
      ctx.translate(W0 / 2, H0 / 2); ctx.scale(0.75 * (0.9 + 0.1 * a), 0.75 * (0.9 + 0.1 * a)); ctx.translate(-640, -360);
      Art.drawFailPanel(ctx);
    }
    ctx.restore();
  }
  function fadeBlack(ctx, tl) {
    var b = Math.max(1 - seg(tl, 0, 0.12), seg(tl, CYC - 0.15, CYC));
    if (b <= 0) return;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,' + b.toFixed(3) + ')'; ctx.fillRect(0, 0, W0, H0); ctx.restore();
  }

  // 這趟撿到的素材: 命中時從角色身上彈出成扇形(示意「這趟所得」), 0.40~0.70 縮小並碎成灰色方粒落下 = 不入帳
  function lostMats(ctx, u) {
    for (var i = 0; i < 4; i++) {
      var o = MAT_OFF[i], pop = eOut(seg(u, 0.05 + i * 0.03, 0.3 + i * 0.03));
      var x = PX + o[0] * pop, y = PY - 4 + o[1] * pop + Math.sin(u * 9 + i) * 1.2 * pop;
      var br = seg(u, 0.4 + i * 0.04, 0.6 + i * 0.04);
      if (br < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - br * 0.6;
        Art.icons.mat(ctx, MATS[i], x, y, 12 * (0.4 + 0.6 * pop) * (1 - br * 0.5));
        ctx.restore();
      }
      if (br > 0) { // 灰粒
        var q = seg(u, 0.4 + i * 0.04, 0.9 + i * 0.04);
        if (q >= 1) continue;
        ctx.save(); ctx.globalAlpha *= 1 - q; ctx.fillStyle = '#9a9aa2';
        for (var j = 0; j < 5; j++) {
          var a = (j / 5) * TAU + i, d = 3 + 6 * q;
          ctx.fillRect(x + Math.cos(a) * d - 1, y + Math.sin(a) * d * 0.5 + 26 * q * q - 1, 2, 2);
        }
        ctx.restore();
      }
    }
  }
  // 角色訊號抖動: 切成 6 條橫帶, 每 1/24 秒換一次錯位; 偶有一條缺掉
  function glitchPlayer(ctx, cls, u, amt) {
    var step = Math.floor(u * 24), bands = 6, top = -20, hgt = 40 / bands;
    for (var b = 0; b < bands; b++) {
      var h = hash(b, step), dx = (h - 0.5) * 12 * amt;
      if (amt > 0.3 && hash(b + 9, step) > 0.86) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(PX - 40, PY + top + b * hgt, 80, hgt + 0.3); ctx.clip();
      ctx.translate(dx, 0);
      Art.drawPlayer(ctx, { x: PX, y: PY, cls: cls, facing: 1, pose: 'hurt' });
      ctx.restore();
    }
    if (amt > 0) { // 錯位亮條
      ctx.save(); ctx.globalAlpha *= 0.5 * amt; ctx.fillStyle = '#e8f4ff';
      var yb = PY - 18 + hash(3, step) * 36; ctx.fillRect(PX - 16 + (hash(4, step) - 0.5) * 8, yb, 32, 1.2);
      ctx.restore();
    }
  }

  function frame(ctx, t) {
    t = Number(t); if (!isFinite(t)) t = 0;
    var tt = ((t % (CYC * 3)) + CYC * 3) % (CYC * 3), ci = Math.floor(tt / CYC) % 3, tl = tt - ci * CYC, cls = CLS[ci];
    var u = tl - HIT;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W0, H0); ctx.clip();
    ctx.save(); ctx.translate(-80, 0); ctx.scale(0.5, 0.5); Art.drawBackground(ctx, { theme: 'forest', t: 0 }); ctx.restore();
    ctx.save(); ctx.scale(K, K);
    ground(ctx);
    if (u < 0) beeShot(ctx, PX + 14 + (-u) * 420, PY - 4, tl);
    else lostMats(ctx, u);
    ctx.restore();
    if (u >= 0) {
      // 世界褪灰 + 微暗(素材也一起褪), 0.08~0.45
      var sat = eOut(seg(u, 0.08, 0.45));
      if (sat > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = sat;
        ctx.fillStyle = 'hsl(0,0%,50%)'; ctx.fillRect(0, 0, W0, H0); ctx.restore();
        ctx.save(); ctx.fillStyle = 'rgba(14,14,22,' + (0.3 * sat).toFixed(3) + ')'; ctx.fillRect(0, 0, W0, H0); ctx.restore();
      }
      // 掃描線 + 往下滾的淡亮帶
      ctx.save(); ctx.globalAlpha *= 0.18 * sat; ctx.fillStyle = '#000000';
      for (var yy = 0; yy < H0; yy += 4) ctx.fillRect(0, yy, W0, 1.5);
      ctx.globalAlpha = 0.06 * sat; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, (u * 260) % (H0 + 40) - 40, W0, 40);
      ctx.restore();
    }
    // 角色保持彩色(全畫面唯一有顏色的東西), 畫在去色之後
    ctx.save(); ctx.scale(K, K);
    if (u < 0) Art.drawPlayer(ctx, { x: PX, y: PY, cls: cls, facing: 1, pose: 'idle' });
    else if (u < 0.6) {
      glitchPlayer(ctx, cls, u, seg(u, 0.08, 0.5));
      if (u < 0.08) { ctx.save(); ctx.globalAlpha *= 0.7 * (1 - u / 0.08); ctx.fillStyle = '#ffffff'; ctx.fillRect(PX - 13, PY - 17, 26, 34); ctx.restore(); }
    } else if (u < 0.85) {
      // 收成一條橫線: 高壓扁、寬拉長, 同時刷白
      var q = eIn(seg(u, 0.6, 0.85)), sy = 1 - 0.95 * q, sx = 1 + 0.6 * q;
      ctx.save(); ctx.translate(PX, PY); ctx.scale(sx, sy);
      Art.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'hurt' });
      ctx.globalAlpha *= q; ctx.fillStyle = '#f4faff'; ctx.fillRect(-14, -18, 28, 36);
      ctx.restore();
    } else if (u < DEATH) {
      // 線縮成點(0.85~1.0), 點的光暈淡出(1.0~1.3)
      var lw = 1 - eOut(seg(u, 0.85, 1.0)), fade = 1 - seg(u, 1.0, DEATH), w = 44 * lw;
      ctx.save();
      var g = ctx.createRadialGradient(PX, PY, 0, PX, PY, 14); g.addColorStop(0, 'rgba(230,244,255,' + (0.7 * fade).toFixed(3) + ')'); g.addColorStop(1, 'rgba(230,244,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(PX, PY, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + fade.toFixed(3) + ')';
      if (w > 2) ctx.fillRect(PX - w / 2, PY - 1, w, 2);
      ctx.beginPath(); ctx.arc(PX, PY, 2.4 * (0.4 + 0.6 * fade), 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    hearts(ctx, u);
    if (u >= DEATH) panel(ctx, u - DEATH);
    fadeBlack(ctx, tl);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'death-anim', id: 'C', kind: 'anim',
    size: [W0, H0],
    duration: CYC * 3,
    loop: true,
    draw: function (ctx, t) { frame(ctx, t); }
  };
})();
