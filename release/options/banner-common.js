// 橫幅 D~H 共用小工具(只組合 window.Art 的繪製函式, 不另畫遊戲物件)
window.BN = (function () {
  var TAU = Math.PI * 2;
  function make() {
    var cv = document.getElementById('c'), ctx = cv.getContext('2d'), A = window.Art;
    var B = { ctx: ctx, A: A, W: 1680, H: 720, TAU: TAU };
    B.hash = function (a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
    B.at = function (x, y, k, fn, rot) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(k, k); fn(); ctx.restore(); };
    B.vgrad = function (y0, y1, stops) { var g = ctx.createLinearGradient(0, y0, 0, y1); for (var i = 0; i < stops.length; i += 2) g.addColorStop(stops[i], stops[i + 1]); return g; };
    B.glow = function (x, y, r, col, a) {
      var g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    B.mat = function (kind, x, y, s, glow) {
      if (glow) B.glow(x, y, s * 1.05, '255,250,210', glow);
      A.icons.mat(ctx, kind, x, y, s);
    };
    B.shadow = function (x, y, rx, a) { ctx.save(); ctx.translate(x, y + 2); ctx.scale(1, 0.18); ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fillStyle = 'rgba(40,50,40,' + (a || 0.25) + ')'; ctx.fill(); ctx.restore(); };
    // 主角: 腳底在 (x, gy), 倍率 k
    B.hero = function (x, gy, k, cls, pose, opt) {
      opt = opt || {};
      ctx.save(); if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
      B.at(x, gy - 18 * k, k, function () { A.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: opt.facing || 1, pose: pose, poseT: opt.poseT || 0.1, swingIdx: 0 }); });
      ctx.restore();
    };
    // 一排地形格: 頂緣 top, 倍率 k, 從 x0 鋪到 x1, rows 列
    B.ground = function (theme, x0, x1, top, k, rows) {
      ctx.save(); ctx.scale(k, k);
      var c0 = Math.floor(x0 / k / 40), c1 = Math.ceil(x1 / k / 40), r, c;
      for (r = 0; r < (rows || 2); r++) for (c = c0; c <= c1; c++) A.drawGround(ctx, { x: c * 40 + 20, y: top / k + 20 + r * 40, theme: theme, open: { n: r === 0 } });
      ctx.restore();
    };
    B.cloud = function (x, y, s, a) {
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (a || 0.85) + ')';
      [[0, 0, 1], [-0.9, 0.2, 0.7], [0.9, 0.25, 0.75], [-0.4, -0.35, 0.65], [0.4, -0.3, 0.7]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, TAU); ctx.fill(); });
      ctx.fillRect(x - 1.3 * s, y + 0.2 * s, 2.6 * s, 0.75 * s);
      ctx.restore();
    };
    B.KINDS = ['wood', 'stone', 'crystal', 'core'];
    return B;
  }
  return { make: make };
})();
