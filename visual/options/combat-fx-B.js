/* combat-fx 方案 B: 血條就是素材串 + 頓幀 + 直飛資訊列(漫畫墨線)
 * 單一舞台, 三職業依序上場(劍士 → 獵人 → 炸彈工), 世界放大 1.5 倍、上方是遊戲本身的資訊列(縮 0.75)。
 * 怪物頭上的血條每一格就是一顆該怪的素材: 掉 1 HP = 那一格的素材從血條上彈出, 沿弧線飛進資訊列「這趟」的同種素材格;
 * 擊倒時從身體再飛出一顆獸魂。每一擊依傷害大小頓幀(凍住 0.07~0.15 秒)並冒墨線衝擊星, 份量越重凍越久、星越大。
 */
(function () {
  var Art = window.Art, P = Art.palette, TAU = Math.PI * 2;
  var W = 960, H = 540, ZOOM = 1.5, TOP = 30, GY = 280; // 世界座標: 地面頂 y=280
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  var INK = '#14101a';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eio(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function inkText(ctx, s, x, y, px, col, align) {
    ctx.font = 'bold ' + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, px * 0.22); ctx.strokeStyle = INK; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function icon(ctx, kind, x, y, sz) {
    ctx.save(); ctx.translate(x, y); var k = (sz || 19) / 19; ctx.scale(k, k);
    Art.drawPickup(ctx, { x: 0, y: 0, kind: kind, t: 0 });
    ctx.restore();
  }
  // 鋸齒衝擊星(漫畫打擊框)
  function impactStar(ctx, x, y, r, n, fill, rot) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = rot + i * Math.PI / n, k = i % 2 ? 0.48 + 0.12 * ((i * 7) % 3) / 2 : 1;
      ctx.lineTo(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  }
  function toScreen(x, y) { return [x * ZOOM, TOP + y * ZOOM]; }

  var MAT = { boar: 'wood', frog: 'wood', shield: 'stone', bee: 'time' };
  var HH = { boar: 32, frog: 28, shield: 44, bee: 32 };
  var KINDS = ['wood', 'stone', 'time', 'soul'];

  // ---------- 三幕(世界時間, 每幕 3 秒) ----------
  function mon(o) {
    var sum = 0; o.deathT = null; o.blocks = o.blocks || [];
    for (var i = 0; i < o.evs.length; i++) {
      var e = o.evs[i]; e.before = o.max - sum; sum += e.dmg; e.after = Math.max(0, o.max - sum); e.kill = false;
      if (e.after === 0 && o.deathT === null) { o.deathT = e.t; e.kill = true; }
    }
    o.mat = MAT[o.type];
    return o;
  }
  var A0 = 0, A1 = 3, A2 = 6, WEND = 9;
  var SL0 = [0.3, 1.6, 1.95, 2.3];
  var FIRE = [{ t: 0.2, tg: [260, GY - 14] }, { t: 0.8, tg: [260, GY - 14] }, { t: 1.4, tg: [300, GY - 100] }];
  var ACTS = [
    { a: A0, cls: 'sword', name: '劍士  揮砍 1 傷 · 衝刺斬 2 傷', skills: [0.75, 2.6], cd: 1.2,
      hero: function (u) {
        var x = u < 0.75 ? 120 : u < 0.93 ? lerp(120, 280, (u - 0.75) / 0.18) : u < 1.2 ? 280 : u < 1.5 ? lerp(280, 346, (u - 1.2) / 0.3) :
          u < 2.6 ? 346 : u < 2.78 ? lerp(346, 506, (u - 2.6) / 0.18) : 506;
        var pose = 'idle', pt = 0, i;
        if (u >= 0.75 && u < 0.93) { pose = 'dash'; pt = u - 0.75; }
        else if (u >= 2.6 && u < 2.78) { pose = 'dash'; pt = u - 2.6; }
        else if (u >= 1.2 && u < 1.5) { pose = 'run'; pt = u; }
        for (i = 0; i < SL0.length; i++) if (u >= SL0[i] && u - SL0[i] < 0.2) { pose = 'slash'; pt = 0.15 + (u - SL0[i]); } // poseT ≥ 0.15: 用本方案自己的墨線刀光
        return { x: x, facing: 1, pose: pose, poseT: pt };
      },
      mons: [
        mon({ type: 'boar', max: 3, pos: function () { return [170, GY - 16]; }, facing: function () { return -1; }, state: function () { return 'walk'; },
          evs: [{ t: 0.33, dmg: 1 }, { t: 0.806, dmg: 2 }] }),
        mon({ type: 'shield', max: 3, pos: function () { return [400, GY - 22]; }, facing: function () { return -1; }, state: function () { return 'walk'; },
          blocks: [1.63], breakT: 1.98, evs: [{ t: 2.33, dmg: 1 }, { t: 2.661, dmg: 2 }] })
      ] },
    { a: A1, cls: 'hunter', name: '獵人  自動射箭 每 0.6 秒 · 潛行(無敵、可穿怪)', skills: [1.9], cd: 3,
      hero: function (u) {
        var x = u < 2.1 ? 120 : u < 2.85 ? lerp(120, 315, (u - 2.1) / 0.75) : 315, pose = 'idle', pt = 0;
        for (var i = 0; i < FIRE.length; i++) if (u >= FIRE[i].t && u - FIRE[i].t < 0.15) { pose = 'shoot'; pt = u - FIRE[i].t; }
        if (u >= 2.1 && u < 2.85) { pose = 'run'; pt = u; }
        return { x: x, facing: 1, pose: pose, poseT: pt };
      },
      mons: [
        mon({ type: 'frog', max: 2, pos: function () { return [260, GY - 14]; }, facing: function () { return -1; }, state: function () { return 'crouch'; },
          evs: [{ t: 0.38, dmg: 1 }, { t: 0.98, dmg: 1 }] }),
        mon({ type: 'bee', max: 1, pos: function (u) { return [300, GY - 100 + Math.sin(u * Math.PI) * 6]; }, facing: function () { return -1; }, state: function () { return 'fly'; },
          evs: [{ t: 1.645, dmg: 1 }] }),
        mon({ type: 'boar', max: 3, pos: function (u) { return [u < 1 ? 420 : 420 - 80 * (u - 1), GY - 16]; }, facing: function () { return -1; }, state: function () { return 'walk'; }, evs: [] })
      ] },
    { a: A2, cls: 'bomber', name: '炸彈工  炸彈 2 傷 · 震波擊飛連鎖', skills: [1.4], cd: 1.5,
      hero: function (u) {
        var x = u < 0.9 ? 110 : u < 1.3 ? lerp(110, 200, (u - 0.9) / 0.4) : 200, pose = 'idle', pt = 0;
        if (u >= 0.15 && u < 0.35) { pose = 'throw'; pt = u - 0.15; }
        else if (u >= 0.9 && u < 1.3) { pose = 'run'; pt = u; }
        else if (u >= 1.4 && u < 1.7) { pose = 'wave'; pt = u - 1.4; }
        return { x: x, facing: 1, pose: pose, poseT: pt };
      },
      mons: [
        mon({ type: 'frog', max: 2, pos: function () { return [250, GY - 14]; }, facing: function () { return -1; }, state: function () { return 'crouch'; }, evs: [{ t: 0.5, dmg: 2 }] }),
        mon({ type: 'frog', max: 2, pos: function (u) { return [u < 1.74 ? 310 : 310 + 460 * (u - 1.74), GY - 14]; }, facing: function () { return -1; },
          state: function (u) { return u >= 1.74 ? 'flung' : 'crouch'; }, evs: [{ t: 1.74, dmg: 1 }, { t: 2.245, dmg: 1 }] }),
        mon({ type: 'boar', max: 3, pos: function (u) { return [u < 1.783 ? 370 : 370 + 460 * (u - 1.783), GY - 16]; }, facing: function () { return -1; },
          state: function (u) { return u >= 1.783 ? 'flung' : 'walk'; }, evs: [{ t: 1.783, dmg: 2 }, { t: 2.14, dmg: 1 }] })
      ] }
  ];

  // ---------- 頓幀: 每一擊凍住世界(真實時間 → 世界時間) ----------
  var FR = [];
  ACTS.forEach(function (act) {
    act.mons.forEach(function (m) {
      m.evs.forEach(function (e) { FR.push({ w: act.a + e.t, d: 0.04 + 0.03 * e.dmg + (e.kill ? 0.05 : 0), kind: 'hit', dmg: e.dmg, kill: e.kill }); });
      m.blocks.forEach(function (b) { FR.push({ w: act.a + b, d: 0.05, kind: 'block' }); });
      if (m.breakT != null) FR.push({ w: act.a + m.breakT, d: 0.1, kind: 'break' });
    });
  });
  FR.sort(function (a, b) { return a.w - b.w; });
  var FTOT = 0; FR.forEach(function (f) { FTOT += f.d; });
  var DUR = WEND + FTOT;
  function worldT(t) {
    var acc = 0;
    for (var i = 0; i < FR.length; i++) {
      var fr = FR[i].w + acc;
      if (t < fr) break;
      if (t < fr + FR[i].d) return { w: FR[i].w, fz: FR[i], ft: t - fr };
      acc += FR[i].d;
    }
    return { w: t - acc, fz: null, ft: 0 };
  }
  function realOf(w) { var acc = 0; for (var i = 0; i < FR.length && FR[i].w < w; i++) acc += FR[i].d; return w + acc; }

  // ---------- 素材代幣: 血條上的一格 → 飛進資訊列「這趟」 ----------
  var RUN_X = [793.5, 834.75, 876, 917.25], RUN_Y = 15; // = 底版資訊列「這趟」四個圖示 ×0.75
  var POP = 0.1, FLY = 0.5;
  function slotPos(m, j, p) { return [p[0] - (m.max - 1) * 5 + j * 10, p[1] - HH[m.type] / 2 - 9]; }
  var TOKENS = [];
  ACTS.forEach(function (act) {
    act.mons.forEach(function (m) {
      m.evs.forEach(function (e) {
        var R = realOf(act.a + e.t), p = m.pos(e.t), n = 0;
        for (var j = e.before - 1; j >= e.after; j--) { var s = toScreen.apply(null, slotPos(m, j, p)); TOKENS.push({ m: m, slot: j, kind: m.mat, R: R + n * 0.06, sx: s[0], sy: s[1] }); n++; }
        if (e.kill) { var c = toScreen(p[0], p[1]); TOKENS.push({ m: m, slot: -1, kind: 'soul', R: R + n * 0.06, sx: c[0], sy: c[1] }); }
      });
    });
  });
  TOKENS.forEach(function (k) { k.ex = RUN_X[KINDS.indexOf(k.kind)]; k.ey = RUN_Y; k.arrive = k.R + POP + FLY; });
  function tokenAt(k, t) {
    var d = t - k.R; if (d < 0 || d >= POP + FLY) return null;
    if (d < POP) return { x: k.sx, y: k.sy, s: 1 + 0.7 * (d / POP), pop: d / POP };
    var q = eio((d - POP) / FLY), cx = (k.sx + k.ex) / 2, cy = Math.min(k.sy, k.ey) - 70;
    var a = 1 - q;
    return { x: a * a * k.sx + 2 * a * q * cx + q * q * k.ex, y: a * a * k.sy + 2 * a * q * cy + q * q * k.ey, s: lerp(1.7, 1.0, q), pop: -1, q: q };
  }

  // 血條 = 素材串: 還在的格畫該怪素材, 掉了的格是挖空的凹槽
  function tokenBar(ctx, m, p, hp, t) {
    var w = m.max * 10 + 2, x0 = p[0] - w / 2, y = p[1] - HH[m.type] / 2 - 9;
    rr(ctx, x0, y - 6, w, 12, 6); ctx.fillStyle = 'rgba(14,10,20,0.88)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
    for (var j = 0; j < m.max; j++) {
      var s = slotPos(m, j, p);
      if (j < hp) icon(ctx, m.mat, s[0], s[1], 9);
      else { circle(ctx, s[0], s[1], 3.2); ctx.fillStyle = '#050307'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke(); }
    }
  }

  // ---------- 盾兵(盾已破) ----------
  function shieldBroken(ctx, x, y, f, hit, t) {
    var C = function (c) { return hit ? '#ffffff' : c; };
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.strokeStyle = P.outlineFoe;
    var lg = Math.sin(t * 8) * 2;
    ctx.fillStyle = C('#3a4050'); ctx.fillRect(-6 + lg, 12, 5, 10); ctx.fillRect(1 - lg, 12, 5, 10);
    rr(ctx, -9, -6, 16, 19, 4); ctx.fillStyle = C(P.shield); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    rr(ctx, -8, -21, 15, 15, 5); ctx.fillStyle = C('#56607a'); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#120a0a'; ctx.fillRect(f > 0 ? 0 : -6.5, -15.5, 6.5, 3);
    circle(ctx, f * 3.5, -14, 1.4); ctx.fillStyle = C(P.foeEye); ctx.fill();
    var sx = f > 0 ? 4.5 : -14.5;
    poly(ctx, [sx, 15, sx, 5, sx + 3, 8, sx + 5, 3, sx + 8, 7, sx + 10, 4, sx + 10, 15]);
    ctx.fillStyle = C('#34506e'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }
  // 盾被打壞: 沿鋸齒裂縫劈成兩半, 兩片各自旋轉掉落
  function shieldSplit(ctx, x, y, f, d) {
    if (d < 0 || d > 0.55) return;
    var sx = x + f * 9.5;
    ctx.save(); ctx.globalAlpha = 1 - seg(d, 0.35, 0.55);
    for (var h = 0; h < 2; h++) {
      var dir = h ? 1 : -1;
      ctx.save(); ctx.translate(sx - f * 30 * d, y + dir * 6 + 420 * d * d - 60 * d); ctx.rotate(dir * d * 5);
      if (h) poly(ctx, [-5, 0, -2, -2, 1, 1, 5, -1, 5, 15, -5, 15]); else poly(ctx, [-5, -15, 5, -15, 5, -1, 1, 1, -2, -2, -5, 0]);
      ctx.fillStyle = P.shieldPlate; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- 墨線特效 ----------
  function inkSlash(ctx, x, y, f, d) { // 揮砍: 粗楔形刀痕 + 墨邊, 0.15 秒
    if (d < 0 || d > 0.15) return;
    var q = d / 0.15;
    ctx.save(); ctx.translate(x + f * 12, y); ctx.scale(f, 1); ctx.globalAlpha = 1 - q * q;
    ctx.beginPath(); ctx.moveTo(-2, -24); ctx.quadraticCurveTo(52, -14, 44, 18); ctx.quadraticCurveTo(34, 2, -2, -16); ctx.closePath();
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(48, 24); ctx.lineTo(54, 30); ctx.moveTo(40, 26); ctx.lineTo(43, 33); ctx.stroke();
    ctx.restore();
  }
  function dashStreak(ctx, x0, x1, y, d) { // 衝刺斬: 起點到現在位置的白色長墨痕, 留 0.25 秒
    if (d < 0 || d > 0.43) return;
    ctx.save(); ctx.globalAlpha = d < 0.18 ? 1 : 1 - (d - 0.18) / 0.25;
    var xe = lerp(x0, x1, Math.min(1, d / 0.18)), dir = x1 > x0 ? 1 : -1;
    poly(ctx, [x0, y, xe - dir * 8, y - 7, xe, y, xe - dir * 8, y + 7]);
    ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
  function comicBoom(ctx, x, y, d, R) { // 炸彈: 鋸齒爆炸形(橘 + 黃心)+ 墨邊, 0.4 秒
    if (d < 0 || d > 0.4) return;
    var q = d / 0.4, r = R * (0.5 + 0.5 * Math.min(1, q * 2.2));
    ctx.save(); ctx.globalAlpha = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
    impactStar(ctx, x, y, r, 11, P.fire, 0.2 + q * 0.6);
    impactStar(ctx, x, y, r * 0.58, 9, '#ffe066', -0.3 - q * 0.4);
    ctx.setLineDash([4, 5]); circle(ctx, x, y, R - 1); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,154,42,0.6)'; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function groundWave(ctx, x, y, d, R) { // 震波: 貼地往兩側推的白色浪頭 + 範圍虛線圈, 0.4 秒
    if (d < 0 || d > 0.4) return;
    var q = d / 0.4, r = R * eio(Math.min(1, q * 1.15));
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - q); ctx.setLineDash([5, 5]); circle(ctx, x, y, R - 1); ctx.lineWidth = 1.5; ctx.strokeStyle = P.shock; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1 - q * q;
    for (var s = -1; s <= 1; s += 2) {
      var cx = x + s * r, gy = GY;
      ctx.beginPath(); ctx.moveTo(cx - s * 26, gy); ctx.quadraticCurveTo(cx - s * 8, gy - 34 * (1 - q * 0.5), cx + s * 6, gy - 16 * (1 - q * 0.4)); ctx.quadraticCurveTo(cx, gy - 6, cx + s * 4, gy); ctx.closePath();
      ctx.fillStyle = '#e9fdff'; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - s * 20, gy - 18); ctx.lineTo(cx - s * 30, gy - 22); ctx.stroke();
    }
    ctx.restore();
  }
  function comicPoof(ctx, x, y, d) { // 擊倒煙: 墨邊卡通雲 + 小星, 0.5 秒
    if (d < 0 || d > 0.5) return;
    var q = d / 0.5, k = 0.7 + 0.6 * q;
    var pts = [[0, -2, 11], [-11, 2, 8], [11, 2, 8], [-6, 9, 7], [6, 9, 7], [0, -12, 7]];
    ctx.save(); ctx.globalAlpha = q < 0.55 ? 1 : 1 - (q - 0.55) / 0.45; ctx.translate(x, y - 10 * q); ctx.scale(k, k);
    var i;
    for (i = 0; i < pts.length; i++) { circle(ctx, pts[i][0], pts[i][1], pts[i][2] + 1.5); ctx.fillStyle = INK; ctx.fill(); }
    for (i = 0; i < pts.length; i++) { circle(ctx, pts[i][0], pts[i][1], pts[i][2]); ctx.fillStyle = i % 2 ? '#eef0f4' : '#d4d8e0'; ctx.fill(); }
    for (i = 0; i < 3; i++) { var a = -Math.PI / 2 + (i - 1) * 0.9; impactStar(ctx, Math.cos(a) * 22, Math.sin(a) * 18, 4, 4, '#ffe066', 0); }
    ctx.restore();
  }

  function drawMon(ctx, m, u, t, fz) {
    if (m.deathT !== null && u >= m.deathT) return;
    var p = m.pos(u), f = m.facing(u), hit = false, i;
    for (i = 0; i < m.evs.length; i++) if (u >= m.evs[i].t && u - m.evs[i].t < 0.08) hit = true;
    var jit = 0;
    if (fz && fz.kind !== 'block') for (i = 0; i < m.evs.length; i++) if (Math.abs(m.evs[i].t - u) < 1e-6) jit = (Math.floor(t * 60) % 2 ? 2 : -2);
    var s = { x: p[0] + jit, y: p[1], facing: f, state: m.state(u), hit: hit, brood: false, t: u };
    if (m.type === 'boar') Art.drawBoar(ctx, s);
    else if (m.type === 'frog') Art.drawFrog(ctx, s);
    else if (m.type === 'bee') Art.drawShooterBee(ctx, s);
    else if (m.breakT != null && u >= m.breakT) shieldBroken(ctx, s.x, p[1], f, hit, u);
    else {
      for (i = 0; i < m.blocks.length; i++) if (u >= m.blocks[i] && u - m.blocks[i] < 0.12) s.state = 'block';
      Art.drawShieldman(ctx, s);
    }
    var hp = m.max;
    for (i = 0; i < m.evs.length; i++) if (u >= m.evs[i].t) hp = m.evs[i].after;
    tokenBar(ctx, m, p, hp, t);
  }

  function hunterStealth(ctx, h, u, y) {
    var pe = seg(u, 1.9, 2.1), px = seg(u, 2.85, 3.0);
    var st = { x: h.x, y: y, cls: 'hunter', facing: 1, pose: h.pose, poseT: h.poseT };
    if (u < 1.9) { Art.drawPlayer(ctx, st); return; }
    var on = Math.min(pe, 1 - px);
    ctx.save();
    ctx.globalAlpha = 1 - 0.7 * on; Art.drawPlayer(ctx, st);
    // 斜線網點把角色蓋成「影子」, 墨色虛線輪廓 = 無敵、可穿
    ctx.globalAlpha = on;
    rr(ctx, h.x - 15, y - 23, 30, 46, 9);
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(31,191,154,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (var k = -60; k < 60; k += 6) { ctx.moveTo(h.x + k - 30, y + 30); ctx.lineTo(h.x + k + 30, y - 30); } ctx.stroke();
    ctx.restore();
    ctx.setLineDash([5, 3]); ctx.lineDashOffset = -u * 40; rr(ctx, h.x - 17, y - 25, 34, 50, 10); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineDashOffset = -u * 40 + 4; ctx.lineWidth = 1.2; ctx.strokeStyle = '#7dffe0'; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 進入 / 解除: 墨點往內收 / 往外濺
    var r = u < 2.1 ? 40 * (1 - pe) : u >= 2.85 ? 40 * px : -1, a = u < 2.1 ? pe : 1 - px;
    if (r >= 0) {
      ctx.save(); ctx.globalAlpha = a;
      for (var i = 0; i < 7; i++) { var an = i * TAU / 7 + 0.4; circle(ctx, h.x + Math.cos(an) * r, y + Math.sin(an) * r * 1.2, 3.5 - (i % 2)); ctx.fillStyle = INK; ctx.fill(); }
      ctx.restore();
    }
  }

  function drawAct(ctx, act, u, t, fz) {
    var i, h = act.hero(u), hy = GY - 22;
    if (act.cls === 'hunter') ctx.save(), Art.drawRangeRing(ctx, { x: h.x, y: hy, radius: 260 }), ctx.restore();
    if (act.cls === 'bomber') for (i = 0; i < 3; i++) Art.drawGround(ctx, { x: 580, y: GY - 20 - i * 40, top: i === 2, theme: 'plain' });
    for (i = 0; i < act.mons.length; i++) drawMon(ctx, act.mons[i], u, t, fz);
    // 擊倒煙(世界時間)
    act.mons.forEach(function (m) { if (m.deathT !== null) { var dp = m.pos(m.deathT); comicPoof(ctx, dp[0], dp[1], u - m.deathT); } });
    if (act.cls === 'sword') {
      dashStreak(ctx, 120, 280, hy + 2, u - 0.75); dashStreak(ctx, 346, 506, hy + 2, u - 2.6);
    }
    if (act.cls === 'hunter') hunterStealth(ctx, h, u, hy);
    else Art.drawPlayer(ctx, { x: h.x, y: hy, cls: act.cls, facing: h.facing, pose: h.pose, poseT: h.poseT });
    if (act.cls === 'sword') for (i = 0; i < SL0.length; i++) inkSlash(ctx, h.x, hy, 1, u - SL0[i]);
    if (act.cls === 'sword') { var sm = act.mons[1]; shieldSplit(ctx, sm.pos(0)[0], sm.pos(0)[1], -1, u - sm.breakT); }
    if (act.cls === 'hunter') {
      for (i = 0; i < FIRE.length; i++) {
        var F = FIRE[i], sx = 134, sy = GY - 23, d = Math.hypot(F.tg[0] - sx, F.tg[1] - sy) - 12, fly = d / 700, q = (u - F.t) / fly;
        if (q < 0 || q >= 1) continue;
        var an = Math.atan2(F.tg[1] - sy, F.tg[0] - sx), ax = sx + Math.cos(an) * d * q, ay = sy + Math.sin(an) * d * q;
        ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax - Math.cos(an) * 34, ay - Math.sin(an) * 34 - 3); ctx.lineTo(ax - Math.cos(an) * 16, ay - Math.sin(an) * 16 - 3);
        ctx.moveTo(ax - Math.cos(an) * 30, ay - Math.sin(an) * 30 + 3); ctx.lineTo(ax - Math.cos(an) * 16, ay - Math.sin(an) * 16 + 3); ctx.stroke(); ctx.restore();
        Art.drawArrow(ctx, { x: ax, y: ay, angle: an });
      }
    }
    if (act.cls === 'bomber') {
      if (u >= 0.15 && u < 0.5) { var bq = (u - 0.15) / 0.35; Art.drawBomb(ctx, { x: lerp(122, 250, bq), y: lerp(GY - 30, GY - 14, bq) - 240 * bq * (1 - bq), t: u }); }
      comicBoom(ctx, 250, GY - 14, u - 0.5, 60);
      groundWave(ctx, 200, hy, u - 1.4, 130);
    }
  }

  // 衝擊星(真實時間, 在頓幀那一下冒出): 大小 ∝ 傷害, 擊倒多一層金星; 擋下 = 小黃星
  function drawImpacts(ctx, act, t) {
    act.mons.forEach(function (m) {
      m.evs.forEach(function (e) {
        var R = realOf(act.a + e.t), d = t - R; if (d < 0 || d > 0.2) return;
        var p = m.pos(e.t), q = d / 0.2, r = (13 + 8 * e.dmg) * (0.8 + 0.4 * q);
        ctx.save(); ctx.globalAlpha = 1 - q * q;
        impactStar(ctx, p[0], p[1], r, 8 + 2 * e.dmg, '#ffffff', e.t);
        if (e.kill) impactStar(ctx, p[0], p[1], r * 0.5, 6, P.gold, -e.t);
        ctx.restore();
      });
      m.blocks.forEach(function (b) {
        var d = t - realOf(act.a + b); if (d < 0 || d > 0.15) return;
        var p = m.pos(b); ctx.save(); ctx.globalAlpha = 1 - d / 0.15; impactStar(ctx, p[0] - 16, p[1] - 4, 9, 5, '#ffe14d', 0.3); ctx.restore();
      });
      if (m.breakT != null) {
        var d2 = t - realOf(act.a + m.breakT);
        if (d2 >= 0 && d2 < 0.22) { var p2 = m.pos(m.breakT); ctx.save(); ctx.globalAlpha = 1 - d2 / 0.22; impactStar(ctx, p2[0] - 10, p2[1], 26, 10, '#dff0ff', 0.1); ctx.restore(); }
      }
    });
  }

  function chainBadge(ctx, x, y, n, d) { // 「N 連鎖」: 黃色爆框徽章 + 墨邊字, 0.8 秒
    if (d < 0 || d > 0.8) return;
    var pop = d < 0.1 ? 0.4 + 6 * d : d < 0.2 ? 1.0 + 0.3 * (1 - (d - 0.1) / 0.1) : 1, a = d < 0.6 ? 1 : 1 - (d - 0.6) / 0.2;
    ctx.save(); ctx.translate(x, y - 20 * (d / 0.8)); ctx.scale(pop, pop); ctx.globalAlpha = a;
    impactStar(ctx, 0, 0, 46, 12, '#ffd84a', 0.15);
    inkText(ctx, n + ' 連鎖', 0, 1, 24, '#ffffff', 'center');
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'combat-fx', id: 'B', kind: 'anim',
    size: [W, H], duration: Math.round(DUR * 100) / 100, loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DUR + DUR) % DUR;
      var wt = worldT(t), w = wt.w, ai = w < A1 ? 0 : w < A2 ? 1 : 2, act = ACTS[ai], u = w - act.a;
      ctx.save();
      ctx.save(); ctx.scale(W / 1280, H / 720); Art.drawBackground(ctx); ctx.restore();
      // 世界
      ctx.save(); ctx.translate(0, TOP); ctx.scale(ZOOM, ZOOM);
      for (var x = 20; x < 660; x += 40) for (var r = 0; r < 2; r++) Art.drawGround(ctx, { x: x, y: GY + 20 + r * 40, top: r === 0, theme: 'plain' });
      drawAct(ctx, act, u, t, wt.fz);
      drawImpacts(ctx, act, t);
      if (ai === 2) { var fc = act.mons[1]; chainBadge(ctx, fc.pos(2.245)[0], GY - 62, 2, u - 2.245); }
      ctx.restore();
      // 資訊列(遊戲本身的, 縮 0.75)+ 這趟計數 = 已飛到的代幣
      var run = { wood: 0, stone: 0, time: 0, soul: 0 }, i;
      for (i = 0; i < TOKENS.length; i++) if (t >= TOKENS[i].arrive) run[TOKENS[i].kind]++;
      var lastSk = -1e9; for (i = 0; i < act.skills.length; i++) if (u >= act.skills[i]) lastSk = act.skills[i];
      ctx.save(); ctx.scale(0.75, 0.75);
      Art.drawHud(ctx, { mode: 'level', stock: { wood: 48, stone: 21, time: 9, soul: 14 }, ratePerMin: { wood: 6.2, stone: 3.1, time: 1.4, soul: 2 },
        time: w, run: run, hp: 3, maxHp: 3, cls: act.cls, skillCdT: Math.min(act.cd, u - lastSk), skillCdDur: act.cd });
      ctx.restore();
      inkText(ctx, act.name, 14, TOP + 22, 15, P.text, 'left');
      // 飛行中的代幣
      for (i = 0; i < TOKENS.length; i++) {
        var k = TOKENS[i], q = tokenAt(k, t); if (!q) continue;
        if (q.pop >= 0) { ctx.save(); ctx.globalAlpha = 1 - q.pop; circle(ctx, q.x, q.y, 6 + 14 * q.pop); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore(); }
        else for (var tr = 3; tr >= 1; tr--) {
          var qq = tokenAt(k, t - tr * 0.03); if (!qq || qq.pop >= 0) continue;
          ctx.save(); ctx.globalAlpha = 0.18 * (4 - tr); circle(ctx, qq.x, qq.y, 5); ctx.fillStyle = P[k.kind + 'Light']; ctx.fill(); ctx.restore();
        }
        icon(ctx, k.kind, q.x, q.y, 13 * q.s);
      }
      // 飛到的瞬間: 這趟那一格閃一圈
      for (i = 0; i < TOKENS.length; i++) {
        var dd = t - TOKENS[i].arrive;
        if (dd >= 0 && dd < 0.18) { ctx.save(); ctx.globalAlpha = 1 - dd / 0.18; circle(ctx, TOKENS[i].ex, TOKENS[i].ey, 8 + 12 * dd / 0.18); ctx.lineWidth = 2; ctx.strokeStyle = P[TOKENS[i].kind + 'Light']; ctx.stroke(); ctx.restore(); }
      }
      // 換幕: 斜向墨色分鏡刷過
      var bounds = [realOf(A1), realOf(A2), DUR, 0];
      for (i = 0; i < bounds.length; i++) {
        var dw = t - bounds[i];
        if (dw > -0.12 && dw < 0.12) {
          var x0 = lerp(-300, W + 300, (dw + 0.12) / 0.24);
          ctx.save(); poly(ctx, [x0 - 260, 0, x0 + 60, 0, x0 + 260, H, x0 - 60, H]); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
        }
      }
      ctx.restore();
    }
  };
})();
