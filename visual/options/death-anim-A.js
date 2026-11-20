/* death-anim 方案 A: 擊倒彈飛 → 倒地 → 魂火升起
 * 角色沿用底版 Art.drawPlayer(hero 方案 A); 地形 / 背景 / 擊倒煙 / 失敗面板沿用 Art.drawGround / drawBackground / drawPoof / drawFailPanel。
 * 一圈 7.5 秒 = 三職業各 2.5 秒: 0~0.35 被敵彈打中前 / 0.35~1.65 死亡演出(1.3 秒)/ 1.65 起失敗面板。
 * 蜂彈照底版 drawBeeShot 的造型複製一份改吃 t(底版那支用系統時鐘旋轉); 挑中搬回遊戲時改呼叫匯出版。
 */
(function () {
  var W0 = 480, H0 = 360, CYC = 2.5, HIT = 0.35, DEATH = 1.3, TAU = Math.PI * 2;
  var CLS = ['sword', 'hunter', 'bomber'];
  var COL = { sword: '#3d8bfd', hunter: '#1fbf9a', bomber: '#f28c28' };
  var GT = 150, PX = 104, PY = GT - 18, K = 2, OX = 0, OY = 0; // 世界座標(×2 放大取景)
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function lerp(a, b, p) { return a + (b - a) * p; }

  function heart(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); ctx.closePath();
  }
  // 資訊列愛心(示意): 前兩格已空, 最後一顆在命中那一刻裂成兩半掉落
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
  function panel(ctx, v, dimBase) {
    var a = eOut(seg(v, 0, 0.2));
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,14,' + (dimBase + (0.5 - dimBase) * a).toFixed(3) + ')'; ctx.fillRect(0, 0, W0, H0);
    if (v > 0) {
      ctx.globalAlpha *= a;
      ctx.translate(W0 / 2, H0 / 2); ctx.scale(0.75 * (0.9 + 0.1 * a), 0.75 * (0.9 + 0.1 * a)); ctx.translate(-640, -360);
      Art.drawFailPanel(ctx);
    }
    ctx.restore();
  }
  function fadeBlack(ctx, tl) { // 換職業時的短暗場(首尾都是全黑, 循環接得上)
    var b = Math.max(1 - seg(tl, 0, 0.12), seg(tl, CYC - 0.15, CYC));
    if (b <= 0) return;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,' + b.toFixed(3) + ')'; ctx.fillRect(0, 0, W0, H0); ctx.restore();
  }
  // 魂火: 白色淚滴 + 內含職業縮圖記號(盾形 / 三角 / 圓), 和潛行的「半透明本體 + 虛線殼」分開
  function wisp(ctx, cls, x, y, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
    var g = ctx.createRadialGradient(0, 2, 0, 0, 2, 16); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 2, 16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.bezierCurveTo(3, -8, 8, -3, 8, 3); ctx.arc(0, 3, 8, 0, Math.PI, false); ctx.bezierCurveTo(-8, -3, -3, -8, 0, -15); ctx.closePath();
    ctx.fillStyle = 'rgba(250,252,255,0.92)'; ctx.fill();
    ctx.beginPath();
    if (cls === 'sword') { ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(3, 3.5); ctx.lineTo(0, 7); ctx.lineTo(-3, 3.5); ctx.closePath(); }
    else if (cls === 'hunter') { ctx.moveTo(0, -1); ctx.lineTo(3.8, 6.5); ctx.lineTo(-3.8, 6.5); ctx.closePath(); }
    else ctx.arc(0, 3.5, 3.4, 0, TAU);
    ctx.fillStyle = COL[cls]; ctx.fill();
    ctx.restore();
  }

  function frame(ctx, t) {
    t = Number(t); if (!isFinite(t)) t = 0;
    var tt = ((t % (CYC * 3)) + CYC * 3) % (CYC * 3), ci = Math.floor(tt / CYC) % 3, tl = tt - ci * CYC, cls = CLS[ci];
    var u = tl - HIT; // < 0: 還活著
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W0, H0); ctx.clip();
    ctx.save(); ctx.translate(-80, 0); ctx.scale(0.5, 0.5); Art.drawBackground(ctx, { theme: 'forest', t: 0 }); ctx.restore();
    var sh = (u >= 0 && u < 0.18) ? 3 * (1 - u / 0.18) * Math.sin(u * 140) : 0; // 命中震動(只震世界)
    ctx.save(); ctx.translate(OX + sh, OY); ctx.scale(K, K);
    ground(ctx);
    if (u < 0) {
      beeShot(ctx, PX + 14 + (-u) * 420, PY - 4, tl);
      Art.drawPlayer(ctx, { x: PX, y: PY, cls: cls, facing: 1, pose: 'idle' });
    } else {
      // 位置與角度: 0~0.10 定格 / 0.10~0.50 往後彈飛並轉成仰躺 / 0.50~0.68 落地彈一下 / 之後躺平
      var x = PX, y = PY, ang = 0;
      if (u >= 0.1) {
        var p = seg(u, 0.1, 0.5), pe = eOut(p);
        x = PX - 46 * pe; y = lerp(PY, GT - 14, p) - 120 * p * (1 - p); ang = -Math.PI / 2 * pe;
        if (u >= 0.5) { var q = seg(u, 0.5, 0.68); y = GT - 14 - 5 * Math.sin(Math.PI * q); ang = -Math.PI / 2 + 0.12 * Math.sin(Math.PI * q); }
      }
      if (u >= 0.5 && u < 0.95) Art.drawPoof(ctx, { x: x, y: GT - 3, t: u - 0.5, dur: 0.45, size: 'small' });
      var red = u < 0.5 ? 1 : 1 - seg(u, 0.5, 0.8); // 受擊紅身, 落地後退回職業色
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      if (red < 1) Art.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'idle' });
      if (red > 0) { ctx.save(); ctx.globalAlpha *= red; Art.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'hurt' }); ctx.restore(); }
      ctx.restore();
      if (u < 0.16) { // 命中火花: 白色四角星 + 外擴環(接觸點在角色前緣)
        var hp = u / 0.16, hx = PX + 13, hy = PY - 4;
        ctx.save(); ctx.globalAlpha *= 1 - hp;
        ctx.beginPath(); ctx.arc(hx, hy, 4 + 14 * hp, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        var r = 9 * (1 - hp * 0.4);
        ctx.beginPath(); ctx.moveTo(hx, hy - r); ctx.lineTo(hx + r * 0.28, hy - r * 0.28); ctx.lineTo(hx + r, hy); ctx.lineTo(hx + r * 0.28, hy + r * 0.28); ctx.lineTo(hx, hy + r); ctx.lineTo(hx - r * 0.28, hy + r * 0.28); ctx.lineTo(hx - r, hy); ctx.lineTo(hx - r * 0.28, hy - r * 0.28); ctx.closePath();
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.restore();
      }
      if (u >= 0.68) { // 魂火: 從胸口升起 46, 0.15 秒淡入、最後 0.2 秒淡出
        var w = seg(u, 0.68, DEATH), wa = Math.min(seg(u, 0.68, 0.83), 1 - seg(u, DEATH - 0.2, DEATH));
        wisp(ctx, cls, x + Math.sin(w * TAU * 1.5) * 3, GT - 18 - 46 * eOut(w), wa);
      }
    }
    ctx.restore();
    if (u >= 0.55) { // 四周暗角慢慢收(只壓世界)
      var vg = 0.5 * seg(u, 0.55, DEATH), g = ctx.createRadialGradient(W0 / 2, H0 / 2, 90, W0 / 2, H0 / 2, 300);
      g.addColorStop(0, 'rgba(10,6,16,0)'); g.addColorStop(1, 'rgba(10,6,16,' + vg.toFixed(3) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W0, H0);
    }
    hearts(ctx, u);
    if (u >= DEATH) panel(ctx, u - DEATH, 0);
    fadeBlack(ctx, tl);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'death-anim', id: 'A', kind: 'anim',
    size: [W0, H0],
    duration: CYC * 3,
    loop: true,
    draw: function (ctx, t) { frame(ctx, t); }
  };
})();
