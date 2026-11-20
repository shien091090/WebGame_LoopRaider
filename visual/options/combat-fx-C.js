/* combat-fx 方案 C: 光球懸停 + 拖尾吸收 + 擊倒慢動作(光效)
 * 三格並排(劍士 / 獵人 / 炸彈工), 同一時間各演一段。特效改成發光的光線與火花(刀光是光弧、爆炸是火花環、震波是多層細光環)。
 * 掉 1 HP = 怪物身上爆出 1 顆發光素材球(球心是素材圖示), 先往外炸開懸停一瞬, 再拖著光尾被吸進角色胸口;
 * 擊倒那一下世界放慢到 0.4 倍 0.2 秒, 讓「一次噴好幾顆」看得清楚。角色頭上的收穫串把這一連串吸到的素材按種類合併計數。
 */
(function () {
  var Art = window.Art, P = Art.palette, TAU = Math.PI * 2;
  var W = 960, H = 540, PW = 320, GY = 400, DUR = 4.4;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
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
  function txt(ctx, s, x, y, px, col, align) {
    ctx.font = 'bold ' + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, px * 0.24); ctx.strokeStyle = 'rgba(6,8,16,0.92)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function icon(ctx, kind, x, y, sz) {
    ctx.save(); ctx.translate(x, y); var k = (sz || 19) / 19; ctx.scale(k, k);
    Art.drawPickup(ctx, { x: 0, y: 0, kind: kind, t: 0 });
    ctx.restore();
  }
  function glow(ctx, x, y, r, col, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.1, r));
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha *= a; circle(ctx, x, y, r); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }
  function flare(ctx, x, y, r, col) { // 四芒光(命中點)
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fillStyle = col; ctx.fill();
  }

  var MAT = { boar: 'wood', frog: 'wood', shield: 'stone', bee: 'time' };
  var HH = { boar: 32, frog: 28, shield: 44, bee: 32 };
  var KINDS = ['wood', 'stone', 'time', 'soul'];

  function mon(o) {
    var sum = 0; o.deathT = null; o.blocks = o.blocks || [];
    for (var i = 0; i < o.evs.length; i++) {
      var e = o.evs[i]; sum += e.dmg; e.kill = false;
      if (sum >= o.max && o.deathT === null) { o.deathT = e.t; e.kill = true; }
    }
    o.mat = MAT[o.type];
    return o;
  }
  function hpAt(m, w) {
    var h = m.max, last = null;
    for (var i = 0; i < m.evs.length; i++) if (m.evs[i].t <= w) { last = m.evs[i]; h -= last.dmg; }
    var lag = last ? lerp(h + last.dmg, h, seg(w, last.t + 0.1, last.t + 0.3)) : h;
    return { hp: Math.max(0, h), lag: Math.max(0, lag) };
  }

  // ---------- 三格的世界時間軸 ----------
  var SL = [0.2, 0.5, 0.8, 1.7, 2.0, 2.3];
  var FIRE = [{ t: 0.2, tg: [170, GY - 14] }, { t: 0.8, tg: [170, GY - 14] }, { t: 1.4, tg: [220, GY - 110] }];
  var PANELS = [
    { cls: 'sword', name: '劍士', sub: '揮砍 1 傷 · 衝刺斬 2 傷',
      hero: function (w) {
        var x = w < 1.2 ? 44 : w < 1.38 ? lerp(44, 204, (w - 1.2) / 0.18) : 204, pose = 'idle', pt = 0;
        if (w >= 1.2 && w < 1.38) { pose = 'dash'; pt = w - 1.2; }
        for (var i = 0; i < SL.length; i++) if (w >= SL[i] && w - SL[i] < 0.2) { pose = 'slash'; pt = 0.15 + w - SL[i]; } // 不畫底版新月, 改畫光弧
        return { x: x, facing: 1, pose: pose, poseT: pt };
      },
      mons: [
        mon({ type: 'shield', max: 3, pos: function () { return [100, GY - 22]; }, facing: function () { return -1; }, state: function () { return 'walk'; },
          blocks: [0.23], breakT: 0.53, evs: [{ t: 0.83, dmg: 1 }, { t: 1.263, dmg: 2 }] }),
        mon({ type: 'boar', max: 3, pos: function () { return [250, GY - 16]; }, facing: function () { return -1; }, state: function () { return 'walk'; },
          evs: [{ t: 1.73, dmg: 1 }, { t: 2.03, dmg: 1 }, { t: 2.33, dmg: 1 }] })
      ] },
    { cls: 'hunter', name: '獵人', sub: '自動射箭 · 潛行(無敵、可穿怪)',
      hero: function (w) {
        var x = w < 2.2 ? 40 : w < 3.3 ? lerp(40, 260, (w - 2.2) / 1.1) : 260, pose = 'idle', pt = 0;
        for (var i = 0; i < FIRE.length; i++) if (w >= FIRE[i].t && w - FIRE[i].t < 0.15) { pose = 'shoot'; pt = w - FIRE[i].t; }
        if (w >= 2.2 && w < 3.3) { pose = 'run'; pt = w; }
        return { x: x, facing: 1, pose: pose, poseT: pt };
      },
      mons: [
        mon({ type: 'frog', max: 2, pos: function () { return [170, GY - 14]; }, facing: function () { return -1; }, state: function () { return 'crouch'; },
          evs: [{ t: 0.37, dmg: 1 }, { t: 0.97, dmg: 1 }] }),
        mon({ type: 'bee', max: 1, pos: function (w) { return [220, GY - 110 + Math.sin(w * Math.PI) * 6]; }, facing: function () { return -1; }, state: function () { return 'fly'; },
          evs: [{ t: 1.65, dmg: 1 }] }),
        mon({ type: 'boar', max: 3, pos: function (w) { return [w < 1.8 ? 300 : 300 - 80 * (w - 1.8), GY - 16]; }, facing: function () { return -1; }, state: function () { return 'walk'; }, evs: [] })
      ] },
    { cls: 'bomber', name: '炸彈工', sub: '震波擊飛連鎖 · 炸彈 2 傷',
      hero: function (w) {
        var pose = 'idle', pt = 0;
        if (w >= 0.3 && w < 0.6) { pose = 'wave'; pt = w - 0.3; }
        else if (w >= 2.0 && w < 2.2) { pose = 'throw'; pt = w - 2.0; }
        return { x: 30, facing: 1, pose: pose, poseT: pt };
      },
      mons: [
        mon({ type: 'frog', max: 2, pos: function (w) { return [w < 0.608 ? 130 : 130 + 460 * (w - 0.608), GY - 14]; }, facing: function () { return -1; },
          state: function (w) { return w >= 0.608 ? 'flung' : 'crouch'; }, evs: [{ t: 0.608, dmg: 1 }, { t: 0.943, dmg: 1 }] }),
        mon({ type: 'boar', max: 3, pos: function (w) { return [w < 0.652 ? 190 : 190 + 460 * (w - 0.652), GY - 16]; }, facing: function () { return -1; },
          state: function (w) { return w >= 0.652 ? 'flung' : 'walk'; }, evs: [{ t: 0.652, dmg: 2 }, { t: 0.839, dmg: 1 }] }),
        mon({ type: 'frog', max: 2, pos: function (w) { var p = seg(w, 1.4, 1.8); return [lerp(340, 210, p), GY - 14 - 320 * p * (1 - p)]; }, facing: function () { return -1; },
          state: function (w) { return w >= 1.4 && w < 1.8 ? 'jump' : 'crouch'; }, evs: [{ t: 2.42, dmg: 2 }] })
      ] }
  ];

  // ---------- 擊倒慢動作: 擊倒後 0.2 秒世界以 0.4 倍速前進 ----------
  var STEP = 0.002;
  PANELS.forEach(function (pn) {
    var kills = [];
    pn.mons.forEach(function (m) { if (m.deathT !== null) kills.push(m.deathT); });
    var tab = [0], w = 0, r = 0;
    while (r < DUR + 0.1) {
      var slow = false;
      for (var i = 0; i < kills.length; i++) if (w >= kills[i] && w < kills[i] + 0.2) slow = true;
      var dw = STEP * (slow ? 0.4 : 1); w += dw; r += STEP; tab.push(w);
    }
    pn.tab = tab; pn.kills = kills;
    // 素材球
    var orbs = [];
    pn.mons.forEach(function (m) {
      m.evs.forEach(function (e) {
        var ks = [], p = m.pos(e.t);
        for (var k = 0; k < e.dmg; k++) ks.push(m.mat);
        if (e.kill) ks.push('soul');
        for (k = 0; k < ks.length; k++) orbs.push({ t: e.t, x: p[0], y: p[1], kind: ks[k], i: k, n: ks.length, done: e.t + 0.65 });
      });
    });
    pn.orbs = orbs;
  });
  function worldOf(pn, t) { var i = clamp(Math.floor(t / STEP), 0, pn.tab.length - 2), f = t / STEP - i; return lerp(pn.tab[i], pn.tab[i + 1], clamp(f, 0, 1)); }
  function slowAmt(pn, w) { var s = 0; for (var i = 0; i < pn.kills.length; i++) { var d = w - pn.kills[i]; if (d >= 0 && d < 0.3) s = Math.max(s, d < 0.2 ? 1 : 1 - (d - 0.2) / 0.1); } return s; }

  // 素材球: 往外炸開(阻尼)→ 懸停 → 拖光尾吸進角色胸口
  var HOVER = 0.35, HOME = 0.3;
  function orbAt(pn, o, w) {
    var d = w - o.t; if (d < 0 || d >= HOVER + HOME) return null;
    var a = -Math.PI / 2 + (o.i - (o.n - 1) / 2) * 0.75 + (hash(o.t * 31, o.i) - 0.5) * 0.4, sp = 230 + 90 * hash(o.i, o.t * 17), k = 9;
    function burst(u) { var f = (1 - Math.exp(-k * u)) / k; return [o.x + Math.cos(a) * sp * f, o.y + Math.sin(a) * sp * f]; }
    if (d < HOVER) { var b = burst(d); return { x: b[0], y: b[1] + Math.sin(d * 18 + o.i) * 1.5, s: d < 0.05 ? 0.3 + 14 * d : 1 }; }
    var p0 = burst(HOVER), q = (d - HOVER) / HOME, e = q * q * q, h = pn.hero(w);
    return { x: lerp(p0[0], h.x, e), y: lerp(p0[1], GY - 26, e), s: 1 - 0.5 * e };
  }
  function drawOrbs(ctx, pn, w) {
    for (var i = 0; i < pn.orbs.length; i++) {
      var o = pn.orbs[i], q = orbAt(pn, o, w); if (!q) continue;
      var light = P[o.kind + 'Light'], base = P[o.kind];
      for (var tr = 4; tr >= 1; tr--) { // 光尾
        var qq = orbAt(pn, o, w - tr * 0.025); if (!qq) continue;
        glow(ctx, qq.x, qq.y, 9 * q.s * (1 - tr * 0.15), light, 0.5 - tr * 0.1);
      }
      glow(ctx, q.x, q.y, 18 * q.s, base, 0.9);
      circle(ctx, q.x, q.y, 9 * q.s); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
      icon(ctx, o.kind, q.x, q.y, 14 * q.s);
    }
  }

  // ---------- 光效 ----------
  function lightSlash(ctx, x, y, d) { // 揮砍: 三道細光弧掃過 0.15 秒
    if (d < 0 || d > 0.15) return;
    var q = d / 0.15, a1 = -1.5 + 2.6 * Math.min(1, q * 1.6);
    ctx.save(); ctx.translate(x + 10, y); ctx.lineCap = 'round'; ctx.shadowColor = '#8ecbff'; ctx.shadowBlur = 10;
    for (var k = 0; k < 3; k++) {
      var r = 30 + k * 7, a0 = a1 - 1.1 + k * 0.15;
      ctx.globalAlpha = (1 - q) * (1 - k * 0.25);
      ctx.beginPath(); ctx.arc(0, 0, r, Math.max(-1.5, a0), a1); ctx.lineWidth = k === 0 ? 4 : 2; ctx.strokeStyle = k === 0 ? '#ffffff' : '#9fd2ff'; ctx.stroke();
    }
    ctx.restore();
  }
  function dashLine(ctx, x0, x1, y, d) { // 衝刺斬: 一條亮光線 + 光點散開
    if (d < 0 || d > 0.45) return;
    var xe = lerp(x0, x1, Math.min(1, d / 0.18)), a = d < 0.18 ? 1 : 1 - (d - 0.18) / 0.27;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.shadowColor = '#8ecbff'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xe, y); ctx.lineWidth = 5 * a + 1; ctx.strokeStyle = '#d6ecff'; ctx.stroke();
    ctx.shadowBlur = 0;
    if (d > 0.18) for (var i = 0; i < 8; i++) { var px = lerp(x0, x1, (i + 0.5) / 8), py = y - (d - 0.18) * (40 + 30 * hash(i, 3)) * (i % 2 ? 1 : -0.6); circle(ctx, px, py, 1.8); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    ctx.restore();
  }
  function sparkBlast(ctx, x, y, d, R) { // 炸彈: 白色閃核 → 橘色火花環向外射到半徑 R
    if (d < 0 || d > 0.4) return;
    var q = d / 0.4;
    ctx.save();
    if (q < 0.25) glow(ctx, x, y, R * (0.5 + q * 2), '#fff4c0', 1 - q * 4);
    ctx.globalAlpha = 1 - q; ctx.lineCap = 'round'; ctx.shadowColor = P.fire; ctx.shadowBlur = 8;
    circle(ctx, x, y, R * Math.min(1, 0.3 + q * 1.4) - 1); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffb347'; ctx.stroke();
    ctx.beginPath();
    for (var i = 0; i < 14; i++) { var an = i * TAU / 14 + 0.2, r0 = R * (0.2 + q * 0.8), r1 = r0 + 12 * (1 - q); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); }
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffe08a'; ctx.stroke();
    ctx.restore();
  }
  function ringWave(ctx, x, y, d, R) { // 震波: 三道錯開的細青光環擴到半徑 R
    if (d < 0 || d > 0.4) return;
    ctx.save(); ctx.shadowColor = P.shock; ctx.shadowBlur = 10;
    for (var k = 0; k < 3; k++) {
      var q = clamp((d - k * 0.05) / 0.35, 0, 1); if (q <= 0 || q >= 1) continue;
      ctx.globalAlpha = (1 - q) * (1 - k * 0.25);
      circle(ctx, x, y, R * q - 1); ctx.lineWidth = 3 - k * 0.7; ctx.strokeStyle = k ? '#7fe9ff' : '#e6fcff'; ctx.stroke();
    }
    ctx.restore();
  }
  function glassShatter(ctx, x, y, f, d) { // 盾被打壞: 盾化成 6 片玻璃碎片 + 白閃
    if (d < 0 || d > 0.6) return;
    var sx = x + f * 9.5;
    ctx.save();
    if (d < 0.12) glow(ctx, sx, y, 34, '#ffffff', 1 - d / 0.12);
    ctx.globalAlpha = 1 - d / 0.6;
    for (var i = 0; i < 6; i++) {
      var an = -Math.PI / 2 + (i - 2.5) * 0.55, v = 120 + 40 * (i % 3);
      var px = sx + Math.cos(an) * v * d - f * 40 * d, py = y + Math.sin(an) * v * d + 500 * d * d;
      ctx.save(); ctx.translate(px, py); ctx.rotate(d * (6 + i));
      poly(ctx, [0, -6, 4, 3, -4, 4]); ctx.fillStyle = 'rgba(140,180,230,0.85)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      if ((i + Math.floor(d * 20)) % 3 === 0) flare(ctx, 0, 0, 5, '#ffffff');
      ctx.restore();
    }
    ctx.restore();
  }
  function fadePoof(ctx, x, y, d) { // 擊倒: 身形碎成上飄的灰白光粒, 0.5 秒
    if (d < 0 || d > 0.5) return;
    var q = d / 0.5;
    ctx.save();
    for (var i = 0; i < 12; i++) {
      var ox = (hash(i, 1) - 0.5) * 30, oy = (hash(i, 2) - 0.5) * 22, up = 30 + 30 * hash(i, 3);
      var px = x + ox * (1 + q * 0.8), py = y + oy - up * q, r = (3.5 + 2 * hash(i, 4)) * (1 - q * 0.7);
      ctx.globalAlpha = 1 - q; circle(ctx, px, py, r); ctx.fillStyle = i % 3 ? '#cfd5df' : '#ffffff'; ctx.fill();
    }
    ctx.restore();
  }
  function hitFlare(ctx, x, y, d, dmg, kill) {
    if (d < 0 || d > 0.16) return;
    var q = d / 0.16, r = (12 + 9 * dmg) * (0.7 + 0.5 * q);
    ctx.save(); ctx.globalAlpha = 1 - q;
    glow(ctx, x, y, r * 1.3, kill ? '#fff1b0' : '#ffffff', 0.9);
    flare(ctx, x, y, r, '#ffffff');
    ctx.restore();
  }

  // 盾已破的盾兵
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
  // 血條: 細長發光條, 掉的那段先亮白再縮
  function hpBar(ctx, cx, y, hp, lag, max) {
    var w = max * 11, x0 = cx - w / 2;
    rr(ctx, x0 - 2, y - 2, w + 4, 7, 3.5); ctx.fillStyle = 'rgba(6,6,12,0.9)'; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, y, w * lag / max, 3);
    ctx.save(); ctx.shadowColor = P.hp; ctx.shadowBlur = 6; ctx.fillStyle = P.hp; ctx.fillRect(x0, y, w * hp / max, 3); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; for (var i = 1; i < max; i++) ctx.fillRect(x0 + i * 11 - 0.5, y, 1, 3);
  }

  function drawMon(ctx, m, w) {
    if (m.deathT !== null && w >= m.deathT) { var dp = m.pos(m.deathT); fadePoof(ctx, dp[0], dp[1], w - m.deathT); return; }
    var p = m.pos(w), f = m.facing(w), hit = false, i;
    for (i = 0; i < m.evs.length; i++) if (w >= m.evs[i].t && w - m.evs[i].t < 0.08) hit = true;
    var s = { x: p[0], y: p[1], facing: f, state: m.state(w), hit: hit, brood: false, t: w };
    if (m.type === 'boar') Art.drawBoar(ctx, s);
    else if (m.type === 'frog') Art.drawFrog(ctx, s);
    else if (m.type === 'bee') Art.drawShooterBee(ctx, s);
    else if (m.breakT != null && w >= m.breakT) shieldBroken(ctx, p[0], p[1], f, hit, w);
    else {
      for (i = 0; i < m.blocks.length; i++) if (w >= m.blocks[i] && w - m.blocks[i] < 0.12) s.state = 'block';
      Art.drawShieldman(ctx, s);
    }
    var hp = hpAt(m, w);
    ctx.save(); hpBar(ctx, p[0], p[1] - HH[m.type] / 2 - 10, hp.hp, hp.lag, m.max); ctx.restore();
  }

  function holoHunter(ctx, h, w, y, boarX) { // 潛行: 全息投影(半透明 + 青色發光輪廓 + 掃描線閃爍)
    var st = { x: h.x, y: y, cls: 'hunter', facing: 1, pose: h.pose, poseT: h.poseT };
    if (w < 2.0 || w >= 3.5) { Art.drawPlayer(ctx, st); return; }
    var on = Math.min(seg(w, 2.0, 2.2), 1 - seg(w, 3.3, 3.5)), flick = (Math.floor(w * 30) % 7 === 0) ? 0.5 : 1;
    ctx.save();
    ctx.globalAlpha = 1 - 0.78 * on; Art.drawPlayer(ctx, st);
    ctx.globalAlpha = on * flick;
    rr(ctx, h.x - 16, y - 25, 32, 50, 11);
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(31,191,154,0.18)'; ctx.fillRect(h.x - 16, y - 25, 32, 50);
    ctx.fillStyle = 'rgba(160,255,230,0.55)';
    for (var k = 0; k < 6; k++) { var sy = y - 25 + ((w * 60 + k * 9) % 54); ctx.fillRect(h.x - 16, sy, 32, 1.5); }
    ctx.restore();
    ctx.shadowColor = '#5fffd8'; ctx.shadowBlur = 12; ctx.lineWidth = 2; ctx.strokeStyle = '#9fffe6'; ctx.stroke(); ctx.shadowBlur = 0;
    // 進入 / 解除: 上下兩道掃描光帶
    var sweep = w < 2.2 ? seg(w, 2.0, 2.2) : w >= 3.3 ? 1 - seg(w, 3.3, 3.5) : -1;
    if (sweep >= 0) { ctx.globalAlpha = 1; ctx.fillStyle = '#c8fff0'; ctx.fillRect(h.x - 20, y + 25 - 50 * sweep - 1.5, 40, 3); }
    // 穿過怪物: 重疊處的怪身上出現青色干擾線(不閃白 = 沒有受傷)
    if (w >= 2.2 && w < 3.3 && Math.abs(h.x - boarX) < 40) {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#7dffe0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (var j = 0; j < 5; j++) { var ly = y - 6 + j * 6, ox = Math.sin(w * 40 + j) * 4; ctx.moveTo((h.x + boarX) / 2 - 18 + ox, ly); ctx.lineTo((h.x + boarX) / 2 + 18 + ox, ly); } ctx.stroke();
    }
    ctx.restore();
  }

  // 收穫串: 角色頭上, 這一連串(間隔 < 1 秒)吸到的素材按種類合併成 [圖示 ×n]
  function harvestChips(ctx, pn, w) {
    var done = pn.orbs.filter(function (o) { return o.done <= w; }).sort(function (a, b) { return a.done - b.done; });
    if (!done.length) return;
    var last = done[done.length - 1].done, gap = w - last; if (gap > 1.0) return;
    var start = 0; for (var i = done.length - 1; i > 0; i--) if (done[i].done - done[i - 1].done > 1.0) { start = i; break; }
    var cnt = {}, bump = {}, order = [];
    for (i = start; i < done.length; i++) { var k = done[i].kind; if (!cnt[k]) { cnt[k] = 0; } cnt[k]++; if (w - done[i].done < 0.14) bump[k] = 1 - (w - done[i].done) / 0.14; }
    KINDS.forEach(function (k) { if (cnt[k]) order.push(k); });
    var h = pn.hero(w), cw = 46, x0 = clamp(h.x - order.length * cw / 2, 6, PW - 6 - order.length * cw), y = GY - 70;
    ctx.save(); ctx.globalAlpha = gap > 0.7 ? 1 - (gap - 0.7) / 0.3 : 1;
    for (i = 0; i < order.length; i++) {
      var kk = order[i], cx = x0 + i * cw, b = bump[kk] || 0;
      ctx.save(); ctx.translate(cx + cw / 2, y); ctx.scale(1 + 0.25 * b, 1 + 0.25 * b);
      rr(ctx, -cw / 2 + 2, -11, cw - 4, 22, 11); ctx.fillStyle = 'rgba(8,10,20,0.85)'; ctx.fill();
      ctx.lineWidth = 1.5 + b * 1.5; ctx.strokeStyle = P[kk + 'Light']; ctx.stroke();
      icon(ctx, kk, -10, 0, 14);
      txt(ctx, '×' + cnt[kk], 0, 1, 13, '#ffffff', 'left');
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPanel(ctx, pn, t) {
    var w = worldOf(pn, t), h = pn.hero(w), hy = GY - 22, i, sl = slowAmt(pn, w);
    // 背景: 底版關卡背景 + 壓暗, 慢動作時再暗一層並收邊
    ctx.save(); ctx.scale(0.75, 0.75); ctx.translate(-pn.idx * PW / 0.75, 0); Art.drawBackground(ctx); ctx.restore();
    ctx.fillStyle = 'rgba(4,6,14,' + (0.35 + 0.2 * sl) + ')'; ctx.fillRect(0, 0, PW, H);
    for (var x = 20; x < PW + 40; x += 40) for (var r = 0; r < 4; r++) Art.drawGround(ctx, { x: x, y: GY + 20 + r * 40, top: r === 0, theme: 'plain' });
    if (pn.cls === 'hunter') Art.drawRangeRing(ctx, { x: h.x, y: hy, radius: 260 });
    if (pn.cls === 'bomber') Art.drawGround(ctx, { x: 310, y: GY - 20, top: true, theme: 'plain' });
    for (i = 0; i < pn.mons.length; i++) drawMon(ctx, pn.mons[i], w);
    if (pn.cls === 'sword') dashLine(ctx, 44, 204, hy + 2, w - 1.2);
    if (pn.cls === 'hunter') holoHunter(ctx, h, w, hy, pn.mons[2].pos(w)[0]);
    else Art.drawPlayer(ctx, { x: h.x, y: hy, cls: pn.cls, facing: h.facing, pose: h.pose, poseT: h.poseT });
    if (pn.cls === 'sword') { for (i = 0; i < SL.length; i++) lightSlash(ctx, h.x, hy, w - SL[i]); glassShatter(ctx, 100, GY - 22, -1, w - 0.53); }
    if (pn.cls === 'hunter') {
      for (i = 0; i < FIRE.length; i++) {
        var F = FIRE[i], sx = 54, sy = GY - 23, d = Math.hypot(F.tg[0] - sx, F.tg[1] - sy) - 12, fly = d / 700, q = (w - F.t) / fly;
        if (q < 0 || q >= 1) continue;
        var an = Math.atan2(F.tg[1] - sy, F.tg[0] - sx), ax = sx + Math.cos(an) * d * q, ay = sy + Math.sin(an) * d * q;
        ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = '#5fffd8'; ctx.shadowBlur = 8; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(ax - Math.cos(an) * 40, ay - Math.sin(an) * 40); ctx.lineTo(ax, ay); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7dffe0'; ctx.stroke(); ctx.restore();
        Art.drawArrow(ctx, { x: ax, y: ay, angle: an });
      }
    }
    if (pn.cls === 'bomber') {
      ringWave(ctx, 30, hy, w - 0.3, 130);
      if (w >= 2.0 && w < 2.42) { var bq = (w - 2.0) / 0.42; Art.drawBomb(ctx, { x: lerp(42, 155, bq), y: lerp(GY - 30, GY - 10, bq) - 260 * bq * (1 - bq), t: w }); }
      sparkBlast(ctx, 155, GY - 10, w - 2.42, 60);
    }
    // 命中光芒
    pn.mons.forEach(function (m) { m.evs.forEach(function (e) { var p = m.pos(e.t); hitFlare(ctx, p[0], p[1], w - e.t, e.dmg, e.kill); }); });
    drawOrbs(ctx, pn, w);
    // 吸進角色: 胸口亮一圈素材色
    for (i = 0; i < pn.orbs.length; i++) { var dd = w - pn.orbs[i].done; if (dd >= 0 && dd < 0.12) glow(ctx, h.x, hy, 26, P[pn.orbs[i].kind + 'Light'], 0.8 * (1 - dd / 0.12)); }
    harvestChips(ctx, pn, w);
    if (pn.cls === 'bomber') {
      var dc = w - 0.943;
      if (dc >= 0 && dc < 0.8) {
        var pop = dc < 0.1 ? 0.5 + 5 * dc : dc < 0.2 ? 1.3 - 3 * (dc - 0.1) : 1;
        ctx.save(); ctx.translate(250, GY - 120 - 20 * dc); ctx.scale(pop, pop); ctx.globalAlpha = dc < 0.6 ? 1 : 1 - (dc - 0.6) / 0.2;
        ctx.strokeStyle = 'rgba(255,216,74,0.7)'; ctx.lineWidth = 2; ctx.beginPath();
        for (i = 0; i < 12; i++) { var ra = i * TAU / 12 + dc * 2; ctx.moveTo(Math.cos(ra) * 30, Math.sin(ra) * 18); ctx.lineTo(Math.cos(ra) * 58, Math.sin(ra) * 34); }
        ctx.stroke();
        ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 14; txt(ctx, '2 連鎖', 0, 0, 26, '#ffd84a', 'center');
        ctx.restore();
      }
    }
    // 慢動作時四周收暗邊
    if (sl > 0) { ctx.save(); ctx.globalAlpha = sl * 0.6; ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeRect(0, 0, PW, H); ctx.restore(); }
    txt(ctx, pn.name, 14, 22, 18, P[pn.cls], 'left');
    txt(ctx, pn.sub, 14, 46, 13, P.textDim, 'left');
  }
  PANELS.forEach(function (pn, i) { pn.idx = i; });

  window.VISUAL_OPTION = {
    element: 'combat-fx', id: 'C', kind: 'anim',
    size: [W, H], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DUR + DUR) % DUR;
      ctx.save();
      ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < PANELS.length; i++) {
        ctx.save(); ctx.translate(i * PW, 0);
        ctx.beginPath(); ctx.rect(0, 0, PW, H); ctx.clip();
        drawPanel(ctx, PANELS[i], t);
        ctx.restore();
        if (i) { ctx.fillStyle = '#05070d'; ctx.fillRect(i * PW - 2, 0, 4, H); }
      }
      var fade = t < 0.1 ? 1 - t / 0.1 : t > DUR - 0.15 ? (t - (DUR - 0.15)) / 0.15 : 0;
      if (fade > 0) { ctx.fillStyle = 'rgba(5,7,13,' + fade + ')'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
  };
})();
