// tut-arrow 方案 A: 手繪麥克筆弧線箭頭
// 一筆畫出的粗弧線 + 尾端打一個小圈 + 開口 V 字箭頭; 線條以每秒 8 格輕微「抖動重描」(手繪感),
// 每 1 秒朝目標連戳兩下(像在說「這裡!這裡!」), 戳到底時尖端兩側冒出四道強調短線; 整支箭頭繞著尖端微微擺頭。
// 遊戲內接法: tutArrowA(ctx, tail, tip, bend, t) — tip = 目標外緣上的點, tail = 箭尾, bend = 彎曲量(±0.2~0.45, 正負決定往哪邊彎)
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

  // ---------- 方案 A 箭頭 ----------
  function poke(c) { // 0 = 退在 14px 外, 1 = 尖端碰到目標外緣; 一秒內連戳兩下後停住
    if (c < 0.1) return easeOut(c / 0.1);
    if (c < 0.2) return 1 - 0.55 * smooth((c - 0.1) / 0.1);
    if (c < 0.3) return 0.45 + 0.55 * easeOut((c - 0.2) / 0.1);
    if (c < 0.65) return 1 - smooth((c - 0.3) / 0.35);
    return 0;
  }
  function arrow(ctx, g, t) {
    var S = g.tail, T = g.tip, D = sub(T, S), L = len(D), n0 = perp(norm(D));
    var C = add(mul(add(S, T), 0.5), mul(n0, g.bend * L));
    var f = Math.floor(t * 8); // 手繪抖動: 每秒 8 格重描
    var Cj = add(C, V((hash(f * 7 + 1) - 0.5) * 10, (hash(f * 7 + 2) - 0.5) * 10));
    var dh = norm(sub(T, Cj));
    var off = poke(((t % 1) + 1) % 1);
    var shift = mul(dh, -14 * (1 - off));
    var wob = 0.06 * Math.sin(t * Math.PI); // 2 秒一次的擺頭, 繞尖端
    // 主幹: 尾端小圈 + 二次弧線
    var pts = [], i, N = 30;
    var dir0 = norm(sub(Cj, S)), side = g.bend >= 0 ? -1 : 1, nS = mul(perp(dir0), side), R = 12, Cc = add(S, mul(nS, R));
    for (i = 0; i <= 14; i++) { var a = -1.7 * Math.PI * (1 - i / 14); pts.push(add(Cc, add(mul(nS, -R * Math.cos(a)), mul(dir0, R * Math.sin(a))))); }
    for (i = 1; i <= N; i++) {
      var p = quad(S, Cj, T, i / N), jn = (i < N) ? (hash(f * 101 + i) - 0.5) * 1.8 : 0;
      pts.push(add(p, mul(n0, jn)));
    }
    // 開口 V 字箭頭
    var hl = 42, wa = 0.62;
    var w1 = add(T, mul(rot(dh, wa), -hl)), w2 = add(T, mul(rot(dh, -wa), -hl));
    w1 = add(w1, V((hash(f * 13 + 5) - 0.5) * 3, (hash(f * 13 + 6) - 0.5) * 3));
    w2 = add(w2, V((hash(f * 13 + 7) - 0.5) * 3, (hash(f * 13 + 8) - 0.5) * 3));
    var head = [w1, T, w2];

    ctx.save();
    ctx.translate(shift.x, shift.y);
    ctx.translate(T.x, T.y); ctx.rotate(wob); ctx.translate(-T.x, -T.y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 影子
    ctx.save(); ctx.translate(3, 5); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 20; line(ctx, pts); ctx.stroke(); line(ctx, head); ctx.stroke(); ctx.restore();
    // 深色外描 → 金色筆芯
    ctx.strokeStyle = EDGE; ctx.lineWidth = 20; line(ctx, pts); ctx.stroke(); line(ctx, head); ctx.stroke();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 12; line(ctx, pts); ctx.stroke(); line(ctx, head); ctx.stroke();
    // 筆觸高光: 斷成兩截的細米白線, 偏向一側
    ctx.strokeStyle = CREAM; ctx.lineWidth = 3;
    var segs = [[0.22, 0.5], [0.58, 0.8]];
    for (var s = 0; s < segs.length; s++) {
      var hp = [];
      for (i = 0; i <= 8; i++) { var u = segs[s][0] + (segs[s][1] - segs[s][0]) * i / 8; hp.push(add(quad(S, Cj, T, u), mul(n0, -3))); }
      line(ctx, hp); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(w1.x * 0.7 + T.x * 0.3, w1.y * 0.7 + T.y * 0.3); ctx.lineTo(w1.x * 0.25 + T.x * 0.75, w1.y * 0.25 + T.y * 0.75); ctx.stroke();
    // 戳到底時的強調短線(在箭頭兩側, 不蓋目標)
    var ea = clamp((off - 0.5) / 0.5, 0, 1);
    if (ea > 0) {
      ctx.globalAlpha = ea;
      var back = mul(dh, -1), angs = [1.25, -1.25, 1.85, -1.85];
      for (i = 0; i < angs.length; i++) {
        var dv = rot(back, angs[i]), r0 = 30 + (i > 1 ? 4 : 0), r1 = r0 + 14 * ea;
        var a0 = add(T, mul(dv, r0)), a1 = add(T, mul(dv, r1));
        ctx.strokeStyle = EDGE; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 3.5; ctx.stroke();
      }
    }
    ctx.restore();
  }

  return {
    element: 'tut-arrow', id: 'A', kind: 'anim',
    size: [M * 2 + PW * 3 + GAP * 2, M * 2 + PH],
    duration: 2,
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
