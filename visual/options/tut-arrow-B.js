// tut-arrow 方案 B: 漫畫風粗彎箭頭(實心、前粗後細、帶立體厚度)
// 箭身是一條由細變粗的彎曲緞帶, 大箭頭帶倒鉤, 右下有深金色「厚度」與粗黑描邊(漫畫貼紙感);
// 每 1 秒「拉弓 → 彈射」: 先往後蓄力、彎度加大、尾端微抖, 再猛然彈向目標, 命中瞬間整支壓扁回彈,
// 尖端兩側爆出漫畫衝擊刺, 箭尾拖速度線。尖端最遠只到目標外緣, 不穿進物件。
// 遊戲內接法: tutArrowB(ctx, tail, tip, bend, t) — tip = 目標外緣上的點, tail = 箭尾, bend = 彎曲量(±0.2~0.45)
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

  // ---------- 方案 B 箭頭 ----------
  var DEEP = '#b8860b';
  function arrow(ctx, g, t) {
    var c = ((t % 1) + 1) % 1, pull = 0, k = g.bend, sq = 1, trem = 0, impact = -1, speed = 0;
    if (c < 0.4) { var p = smooth(c / 0.4); pull = 26 * p; k = g.bend * (1 + 0.35 * p); if (c > 0.28) trem = (c - 0.28) / 0.12; }
    else if (c < 0.5) { var q = (c - 0.4) / 0.1; pull = 26 * (1 - q * q); k = g.bend * (1 + 0.35 * (1 - q)); speed = q; }
    else { var x = c - 0.5, damp = Math.exp(-7 * x) * Math.cos(18 * x); sq = 1 - 0.2 * damp; k = g.bend * (1 - 0.15 * damp); impact = x / 0.3; speed = clamp(1 - x / 0.12, 0, 1); }
    var S = g.tail, T = g.tip, D = sub(T, S), L = len(D), n0 = perp(norm(D));
    var C = add(mul(add(S, T), 0.5), mul(n0, k * L));
    var dh = norm(sub(T, C)), nh = perp(dh);
    var back = mul(dh, -pull);
    if (trem > 0) back = add(back, V(Math.sin(t * 157) * 1.8 * trem, Math.cos(t * 131) * 1.8 * trem));
    var S2 = add(S, back), C2 = add(C, back), P = add(T, back);
    var hl = 56, B = sub(P, mul(dh, hl));
    // 緞帶外形: 半寬 7 → 16, 箭頭半寬 40 + 往後掃的倒鉤, 尾端 V 形缺口
    var N = 26, left = [], right = [], i;
    for (i = 0; i <= N; i++) {
      var u = i / N, pt = quad(S2, C2, B, u);
      var tg = norm(add(mul(sub(C2, S2), 2 * (1 - u)), mul(sub(B, C2), 2 * u))), nn = perp(tg), w = 7 + 9 * u;
      left.push(add(pt, mul(nn, w))); right.push(sub(pt, mul(nn, w)));
    }
    var dir0 = norm(sub(C2, S2));
    var shape = left.slice();
    shape.push(add(B, mul(nh, 16)), add(add(B, mul(nh, 40)), mul(dh, -12)), P, add(sub(B, mul(nh, 40)), mul(dh, -12)), sub(B, mul(nh, 16)));
    for (i = N; i >= 0; i--) shape.push(right[i]);
    shape.push(add(S2, mul(dir0, 9)));
    function path() { line(ctx, shape); ctx.closePath(); }

    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 箭尾速度線(彈射時)
    if (speed > 0) {
      ctx.save(); ctx.globalAlpha = speed; ctx.strokeStyle = CREAM; ctx.lineWidth = 3;
      var nS = perp(dir0);
      for (i = -1; i <= 1; i++) {
        var a0 = add(sub(S2, mul(dir0, 12)), mul(nS, i * 11)), a1 = add(sub(S2, mul(dir0, 42 - Math.abs(i) * 8)), mul(nS, i * 11));
        ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
      }
      ctx.restore();
    }
    // 命中壓扁: 以尖端為錨, 沿指向縮、橫向撐(尖端位置不變)
    var ang = Math.atan2(dh.y, dh.x);
    ctx.translate(P.x, P.y); ctx.rotate(ang); ctx.scale(sq, 1 + (1 - sq) * 0.7); ctx.rotate(-ang); ctx.translate(-P.x, -P.y);
    // 厚度(往右下擠出)
    ctx.save(); ctx.translate(5, 6); path(); ctx.fillStyle = DEEP; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = EDGE; ctx.stroke(); ctx.restore();
    // 本體
    path();
    var gr = ctx.createLinearGradient(S2.x, S2.y, P.x, P.y); gr.addColorStop(0, '#ffe98a'); gr.addColorStop(0.6, GOLD); gr.addColorStop(1, '#ffc928');
    ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = EDGE; ctx.stroke();
    // 高光
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3.5;
    var hp = [];
    for (i = 3; i <= 21; i++) { var uu = i / N, pp = quad(S2, C2, B, uu), tt = norm(add(mul(sub(C2, S2), 2 * (1 - uu)), mul(sub(B, C2), 2 * uu))); hp.push(add(pp, mul(perp(tt), (7 + 9 * uu) * 0.45))); }
    line(ctx, hp); ctx.stroke();
    var h0 = add(add(B, mul(nh, 22)), mul(dh, 4)), h1 = add(sub(P, mul(dh, 16)), mul(nh, 5));
    ctx.beginPath(); ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y); ctx.stroke();
    ctx.restore();
    // 命中衝擊刺(尖端兩側往後的扇面, 不蓋目標)
    if (impact >= 0 && impact <= 1) {
      ctx.save(); ctx.globalAlpha = 1 - impact; ctx.lineJoin = 'round';
      var bk = mul(dh, -1), angs = [0.95, -0.95, 1.4, -1.4, 1.85, -1.85];
      for (i = 0; i < angs.length; i++) {
        var dv = rot(bk, angs[i]), pv = perp(dv), r0 = 34 + 12 * impact, r1 = r0 + 8 + 18 * (1 - impact) * (i < 2 ? 1.2 : 1);
        var b1 = add(add(P, mul(dv, r0)), mul(pv, 4)), b2 = sub(add(P, mul(dv, r0)), mul(pv, 4)), tp = add(P, mul(dv, r1));
        ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(tp.x, tp.y); ctx.lineTo(b2.x, b2.y); ctx.closePath();
        ctx.fillStyle = i < 2 ? '#ffffff' : GOLD; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = EDGE; ctx.stroke();
      }
      ctx.restore();
    }
  }

  return {
    element: 'tut-arrow', id: 'B', kind: 'anim',
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
