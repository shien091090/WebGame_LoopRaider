/* death-anim 方案 B: 世界暗下定格 → 角色身上爬裂痕 → 碎成職業形狀的碎片
 * 角色沿用底版 Art.drawPlayer(hero 方案 A); 地形 / 背景 / 失敗面板沿用 Art.drawGround / drawBackground / drawFailPanel。
 * 一圈 7.5 秒 = 三職業各 2.5 秒: 0~0.35 被敵彈打中前 / 0.35~1.65 死亡演出(1.3 秒)/ 1.65 起失敗面板。
 * 職業差異: 碎片形狀照縮圖記號的形狀語言(劍士方塊 / 獵人三角 / 炸彈工圓塊), 顏色取該職業身上的配色。
 * 蜂彈照底版 drawBeeShot 的造型複製一份改吃 t(底版那支用系統時鐘旋轉); 挑中搬回遊戲時改呼叫匯出版。
 */
(function () {
  var W0 = 480, H0 = 360, CYC = 2.5, HIT = 0.35, DEATH = 1.3, TAU = Math.PI * 2;
  var CLS = ['sword', 'hunter', 'bomber'];
  var GT = 150, PX = 104, PY = GT - 18, K = 2;
  var SHATTER = 0.55, GRAV = 520;
  var SHARD_COL = {
    sword: ['#3d8bfd', '#3d8bfd', '#d8434e', '#f2c94c', '#e8eef6', '#2b3245'],
    hunter: ['#1fbf9a', '#1fbf9a', '#0f2a24', '#8a5a2a', '#1fbf9a', '#d8fff0'],
    bomber: ['#f28c28', '#f28c28', '#f4d2b0', '#2a2a33', '#f28c28', '#3a3f4c']
  };
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
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

  // 裂痕: 從命中點(角色前緣)往身體爬, 三條主裂 + 分岔; p = 0~1 長度
  var CRACKS = [
    [[13, -4], [6, -6], [1, -12], [-4, -15]],
    [[13, -4], [5, -1], [-2, 2], [-7, 9], [-10, 15]],
    [[13, -4], [8, 4], [3, 10], [4, 16]],
    [[5, -1], [0, -4], [-8, -3]],
    [[1, -12], [6, -16]]
  ];
  function cracks(ctx, p) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-14, -18, 28, 36); ctx.clip();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var pass = 0; pass < 2; pass++) {
      ctx.lineWidth = pass ? 1.3 : 3; ctx.strokeStyle = pass ? '#ffffff' : 'rgba(20,14,30,0.85)';
      for (var c = 0; c < CRACKS.length; c++) {
        var pts = CRACKS[c], cp = clamp(p * 1.4 - (c >= 3 ? 0.4 : 0), 0, 1), n = (pts.length - 1) * cp;
        if (n <= 0) continue;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i <= Math.ceil(n); i++) {
          var f = Math.min(1, n - (i - 1)), a = pts[i - 1], b = pts[i];
          ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 碎片: 4 欄 × 4 列取自身體框, 被往後(命中反方向)炸開, 受重力落地後停住、淡出
  function shards(ctx, cls, s) {
    var cols = SHARD_COL[cls], fade = 1 - seg(s, 0.4, DEATH - SHATTER);
    if (fade <= 0) return;
    ctx.save(); ctx.globalAlpha *= fade;
    for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) {
      var i = r * 4 + c, h1 = hash(i, 1), h2 = hash(i, 2), h3 = hash(i, 3);
      var ox = -10.5 + c * 7, oy = -13.5 + r * 9, sz = 3.2 + h1 * 2.2;
      var vx = -70 - h2 * 110 + ox * 6, vy = -110 - h3 * 150 + oy * 2;
      var x0 = PX + ox, y0 = PY + oy, floor = GT - sz * 0.7;
      // 落地時間: y0 + vy t + g t^2 / 2 = floor
      var A = GRAV / 2, B = vy, C = y0 - floor, land = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
      var te = Math.min(s, land), x = x0 + vx * te, y = Math.min(floor, y0 + vy * te + A * te * te);
      if (s > land) x += vx * 0.12 * (1 - Math.exp(-(s - land) * 8)); // 落地滑一小段
      var rot = (s < land ? s : land) * (h1 - 0.5) * 18;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.beginPath();
      if (cls === 'sword') ctx.rect(-sz * 0.6, -sz * 0.6, sz * 1.2, sz * 1.2);
      else if (cls === 'hunter') { ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.9, sz * 0.7); ctx.lineTo(-sz * 0.9, sz * 0.7); ctx.closePath(); }
      else ctx.arc(0, 0, sz * 0.7, 0, TAU);
      ctx.fillStyle = cols[i % cols.length]; ctx.fill();
      ctx.lineWidth = 0.9; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
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
    ctx.restore();
    // 世界暗下(角色周圍留一圈較亮, 視線收到角色身上); 命中後 0.15 秒內壓到 0.62 並保持到面板
    if (u >= 0) {
      var d = 0.62 * eOut(seg(u, 0, 0.15)), cx = PX * K, cy = PY * K;
      var g = ctx.createRadialGradient(cx, cy, 30, cx, cy, 170);
      g.addColorStop(0, 'rgba(12,8,24,' + (d * 0.55).toFixed(3) + ')'); g.addColorStop(1, 'rgba(12,8,24,' + d.toFixed(3) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W0, H0);
    }
    ctx.save(); ctx.scale(K, K);
    if (u < 0) {
      beeShot(ctx, PX + 14 + (-u) * 420, PY - 4, tl);
      Art.drawPlayer(ctx, { x: PX, y: PY, cls: cls, facing: 1, pose: 'idle' });
    } else if (u < SHATTER) {
      // 定格: 受擊姿勢不動, 抖動逐漸加劇(快裂開了), 裂痕從命中點往身上爬
      var jit = 1.6 * seg(u, 0.15, SHATTER) * Math.sin(u * 120);
      ctx.save(); ctx.translate(PX + jit, PY);
      Art.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'hurt' });
      if (u < 0.1) { // 命中閃白: 身體框白光
        ctx.save(); ctx.globalAlpha *= 0.7 * (1 - u / 0.1); ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.rect(-13, -17, 26, 34); ctx.fill(); ctx.restore();
      }
      cracks(ctx, seg(u, 0.12, SHATTER - 0.05));
      ctx.restore();
    } else {
      var s = u - SHATTER;
      if (s < 0.25) { // 碎裂瞬間: 白環外擴 + 中心白光
        var q = s / 0.25;
        ctx.save(); ctx.globalAlpha *= 1 - q;
        ctx.beginPath(); ctx.arc(PX, PY, 6 + 30 * eOut(q), 0, TAU); ctx.lineWidth = 2.5 * (1 - q) + 0.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        var gg = ctx.createRadialGradient(PX, PY, 0, PX, PY, 20); gg.addColorStop(0, 'rgba(255,255,255,0.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(PX, PY, 20, 0, TAU); ctx.fill();
        ctx.restore();
      }
      shards(ctx, cls, s);
    }
    ctx.restore();
    hearts(ctx, u);
    if (u >= DEATH) panel(ctx, u - DEATH);
    fadeBlack(ctx, tl);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'death-anim', id: 'B', kind: 'anim',
    size: [W0, H0],
    duration: CYC * 3,
    loop: true,
    draw: function (ctx, t) { frame(ctx, t); }
  };
})();
