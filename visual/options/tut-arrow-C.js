// tut-arrow 方案 C: 彈性波浪管箭頭(像一條甩動的繩子)
// 箭身是一條圓管, 尾端一顆圓頭, 前端圓角胖箭頭; 波浪從尾端一路傳到箭頭(兩端固定、中段甩動),
// 管上的白色條紋持續往目標方向流, 箭頭本身繞尖端左右點頭 + 心跳式兩下脈動。
// 尖端始終停在目標外緣 4px 處不動 — 動的是身體, 指向永遠穩定。
// 遊戲內接法: tutArrowC(ctx, tail, tip, bend, t) — tip = 目標外緣上的點, tail = 箭尾, bend = 彎曲量(±0.2~0.45)
window.VISUAL_OPTION = (function () {
  var PW = 464, PH = 544, GAP = 12, M = 8;
  var GOLD = '#ffd84a', EDGE = '#180f09', CREAM = '#fff6c8';
  var TAU = Math.PI * 2;

  // ---------- 向量小工具 ----------
  function V(x, y) { return { x: x, y: y }; }
  function add(a, b) { return V(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return V(a.x - b.x, a.y - b.y); }
  function mul(a, k) { return V(a.x * k, a.y * k); }
  function len(a) { return Math.sqrt(a.x * a.x + a.y * a.y) || 1; }
  function norm(a) { var l = len(a); return V(a.x / l, a.y / l); }
  function perp(a) { return V(-a.y, a.x); }
  function rot(a, r) { var c = Math.cos(r), s = Math.sin(r); return V(a.x * c - a.y * s, a.x * s + a.y * c); }
  function quad(a, c, b, u) { var v = 1 - u; return V(v * v * a.x + 2 * v * u * c.x + u * u * b.x, v * v * a.y + 2 * v * u * c.y + u * u * b.y); }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - (1 - x) * (1 - x); }
  function line(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }

  // ---------- 三個情境(與 B、C 共用同一套取景) ----------
  function thumb(ctx, x, y) { // 第一關卡片的靜止縮圖(RD 會畫真的縮圖, 這裡只示意)
    ctx.save();
    var g = ctx.createLinearGradient(0, y + 8, 0, y + 98); g.addColorStop(0, '#9fd4ef'); g.addColorStop(1, '#e8f4d8');
    ctx.fillStyle = g; ctx.fillRect(x + 8, y + 8, 160, 90);
    ctx.fillStyle = '#7cc25c'; ctx.beginPath(); ctx.ellipse(x + 60, y + 98, 70, 30, 0, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#73502f'; ctx.fillRect(x + 8, y + 82, 160, 16);
    ctx.fillStyle = '#5cbf45'; ctx.fillRect(x + 8, y + 80, 160, 4);
    ctx.fillStyle = '#3d8bfd'; ctx.fillRect(x + 30, y + 70, 6, 10);
    ctx.restore();
  }
  function scene(ctx, i, t) {
    var A = window.Art;
    if (i === 0) {
      if (A) {
        ctx.save(); ctx.translate(-600, -120); A.drawMapBackground(ctx, { t: t }); ctx.restore();
        A.drawMapLink(ctx, { x1: 246, y1: 258, x2: 290, y2: 98, lit: false });
        A.drawLevelCard(ctx, { x: 290, y: 30, index: 2, name: '藤蔓小徑', theme: 'forest', state: 'sealed', cost: { wood: 30, stone: 0, crystal: 0, core: 0 }, stock: { wood: 5, stone: 0, crystal: 0, core: 0 }, devices: null });
        A.drawLevelCard(ctx, { x: 70, y: 190, index: 1, name: '翠林入口', theme: 'forest', state: 'open', siteCount: 3, repairedCount: 0, devices: [null, null] });
      }
      thumb(ctx, 70, 190);
      return { tail: V(420, 500), tip: V(251, 300), bend: 0.35 }; // 由右下勾上來, 指卡片右緣
    }
    if (i === 1) {
      if (A) {
        ctx.save(); ctx.translate(-728, -86);
        A.drawLevelPanel(ctx, { index: 1, name: '翠林入口', theme: 'forest', row: 2, sites: [], siteSel: null, slots: [null, null], slotSel: 0, storeCount: 0, recordCls: null, recordTime: null, rates: null, speedMul: 1, newArea: false, stock: { wood: 0, stone: 0, crystal: 0, core: 0 } });
        ctx.restore();
      }
      return { tail: V(72, 232), tip: V(262, 382), bend: -0.4 }; // 由左上弧下來, 指「開始挑戰」上緣
    }
    if (A) {
      ctx.save(); ctx.translate(-300, -176); A.drawBackground(ctx, { theme: 'forest', t: t }); ctx.restore();
      for (var k = 0; k < 12; k++) for (var r = 0; r < 3; r++) A.drawGround(ctx, { x: 20 + 40 * k, y: 460 + 40 * r, theme: 'forest', open: { n: r === 0, e: false, s: false, w: false } });
      A.drawPickup(ctx, { x: 210, y: 424, kind: 'wood', t: t });
      A.drawPlayer(ctx, { x: 90, y: 422, cls: 'sword', facing: 1, pose: 'idle', poseT: 0 });
      A.drawBoar(ctx, { x: 330, y: 424, facing: -1, state: 'walk', t: t });
      A.drawHpBar(ctx, { x: 330, y: 400, hp: 3, maxHp: 3 });
    }
    return { tail: V(420, 130), tip: V(358, 410), bend: -0.3 }; // 由右上甩下來, 指野豬右肩(避開頭頂血條)
  }
  function caption(ctx, s) {
    ctx.save();
    ctx.font = 'bold 16px sans-serif';
    var w = ctx.measureText(s).width + 24;
    rr(ctx, 10, 12, w, 30, 6); ctx.fillStyle = 'rgba(10,6,4,0.45)'; ctx.fill();
    rr(ctx, 10, 10, w, 30, 6); ctx.fillStyle = '#efe3c6'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = EDGE; ctx.stroke();
    ctx.fillStyle = '#2b2118'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, 22, 26);
    ctx.restore();
  }
  var CAPS = ['大地圖: 第一關卡片', '準備頁: 開始挑戰', '關卡內: 怪物'];

  // ---------- 方案 C 箭頭 ----------
  var DEEP = '#e0a21c', STRIPE = '#fff3b0', PER = 0.8;
  function cubic(a, b, c, d, u) {
    var v = 1 - u, A0 = v * v * v, A1 = 3 * v * v * u, A2 = 3 * v * u * u, A3 = u * u * u;
    return V(A0 * a.x + A1 * b.x + A2 * c.x + A3 * d.x, A0 * a.y + A1 * b.y + A2 * c.y + A3 * d.y);
  }
  function cubicD(a, b, c, d, u) {
    var v = 1 - u;
    return V(3 * v * v * (b.x - a.x) + 6 * v * u * (c.x - b.x) + 3 * u * u * (d.x - c.x), 3 * v * v * (b.y - a.y) + 6 * v * u * (c.y - b.y) + 3 * u * u * (d.y - c.y));
  }
  function heart(c) { // 心跳: 0.8 秒內兩下
    var a = Math.max(0, 1 - Math.abs(c - 0.08) / 0.08), b = Math.max(0, 1 - Math.abs(c - 0.26) / 0.08);
    return Math.max(a, b * 0.7);
  }
  function arrow(ctx, g, t) {
    var S = g.tail, T = g.tip, D = sub(T, S), L = len(D), n0 = perp(norm(D));
    var C = add(mul(add(S, T), 0.5), mul(n0, g.bend * L));
    var base = norm(sub(T, C)), ang0 = Math.atan2(base.y, base.x);
    var ph = t / PER * TAU;
    var wag = 0.13 * Math.sin(ph + 0.6);
    var dh = V(Math.cos(ang0 + wag), Math.sin(ang0 + wag)), nh = perp(dh);
    var P = sub(T, mul(base, 4));
    var pu = heart(((t % PER) + PER) % PER);
    var hl = 50 * (1 + 0.08 * pu), hw = 32 * (1 + 0.14 * pu);
    var HB = sub(P, mul(dh, hl)), B = sub(P, mul(dh, hl * 0.8));
    var C1 = add(S, mul(sub(C, S), 0.7)), C2 = sub(B, mul(dh, L * 0.28));
    // 身體取樣 + 行進波位移
    var N = 40, pts = [], nrm = [], i;
    for (i = 0; i <= N; i++) {
      var u = i / N, p = cubic(S, C1, C2, B, u), nn = perp(norm(cubicD(S, C1, C2, B, u)));
      var env = Math.pow(Math.sin(Math.PI * u), 1.2);
      pts.push(add(p, mul(nn, 15 * env * Math.sin(TAU * 1.4 * u - ph)))); nrm.push(nn);
    }
    var sl = [0];
    for (i = 1; i <= N; i++) sl.push(sl[i - 1] + len(sub(pts[i], pts[i - 1])));

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 影子 / 外描 / 金管
    ctx.save(); ctx.translate(3, 5); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 30; line(ctx, pts); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = EDGE; ctx.lineWidth = 30; line(ctx, pts); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 22; line(ctx, pts); ctx.stroke();
    // 往目標流動的白條紋(每 0.8 秒流過一格 36px)
    ctx.lineCap = 'butt'; ctx.strokeStyle = STRIPE; ctx.lineWidth = 22;
    var run = null, sp = 36 / PER;
    for (i = 0; i < N; i++) {
      var sm = (sl[i] + sl[i + 1]) / 2, on = ((((sm - sp * t) % 36) + 36) % 36) < 14 && i > 1;
      if (on) { if (!run) run = [pts[i]]; run.push(pts[i + 1]); }
      if ((!on || i === N - 1) && run) { line(ctx, run); ctx.stroke(); run = null; }
    }
    // 管身高光
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    var hp = [];
    for (i = 4; i <= N - 6; i++) hp.push(sub(pts[i], mul(nrm[i], 6)));
    line(ctx, hp); ctx.stroke();
    // 尾端圓頭
    var kr = 14 + 2 * Math.sin(ph);
    ctx.beginPath(); ctx.arc(S.x, S.y, kr, 0, TAU); ctx.fillStyle = DEEP; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = EDGE; ctx.stroke();
    ctx.beginPath(); ctx.arc(S.x - 3, S.y - 3, kr * 0.42, 0, TAU); ctx.fillStyle = STRIPE; ctx.fill();
    // 圓角胖箭頭(繞尖端點頭, 尖端不動)
    var Lp = add(HB, mul(nh, hw)), Rp = sub(HB, mul(nh, hw)), Bc = add(HB, mul(dh, hl * 0.25));
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Lp.x, Lp.y); ctx.quadraticCurveTo(Bc.x, Bc.y, Rp.x, Rp.y); ctx.closePath();
    ctx.save(); ctx.translate(3, 5); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill(); ctx.restore();
    ctx.lineWidth = 9; ctx.strokeStyle = EDGE; ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = GOLD; ctx.stroke();
    var e0 = add(HB, mul(nh, hw * 0.55)), e1 = sub(P, mul(dh, 14));
    ctx.strokeStyle = STRIPE; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x + nh.x * 3, e1.y + nh.y * 3); ctx.stroke();
    ctx.restore();
  }

  return {
    element: 'tut-arrow', id: 'C', kind: 'anim',
    size: [M * 2 + PW * 3 + GAP * 2, M * 2 + PH],
    duration: 1.6,
    loop: true,
    draw: function (ctx, t) {
      t = +t || 0;
      ctx.save();
      ctx.fillStyle = '#120c08'; ctx.fillRect(0, 0, this.size[0], this.size[1]);
      for (var i = 0; i < 3; i++) {
        var px = M + i * (PW + GAP), py = M;
        ctx.save();
        ctx.translate(px, py);
        ctx.beginPath(); ctx.rect(0, 0, PW, PH); ctx.clip();
        var g = scene(ctx, i, t);
        arrow(ctx, g, t);
        caption(ctx, CAPS[i]);
        ctx.restore();
        ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = '#3a2a1f'; ctx.strokeRect(px - 1.5, py - 1.5, PW + 3, PH + 3); ctx.restore();
      }
      ctx.restore();
    }
  };
})();
