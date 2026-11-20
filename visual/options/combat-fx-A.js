/* combat-fx 方案 A: 實體噴落 + 磁吸回收
 * 三條跑道同時播(劍士 / 獵人 / 炸彈工), 沿用底版的特效長相(新月刀光、橘火球、青白震波環、灰擊倒煙)。
 * 每掉 1 HP 就從怪物身上拋出 1 顆真正的素材圖示: 拋物線彈出 → 落地彈一下 → 0.6 秒後被吸回角色身上 → 冒「+N」浮字。
 * 一擊 2 傷 = 同時彈出 2 顆 + 跑道震一下; 擊倒再多噴 1 顆獸魂。
 */
(function () {
  var Art = window.Art, P = Art.palette, TAU = Math.PI * 2;
  var W = 960, H = 540, DUR = 4, LANE = 180, GY = 150;
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
  function label(ctx, s, x, y, px, col) {
    ctx.font = 'bold ' + px + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,10,18,0.9)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  // 素材圖示: 借底版 drawPickup(t=0、x=0 時不浮動、不閃星), 與地上 / 資訊列同一個長相
  function icon(ctx, kind, x, y, sz) {
    ctx.save(); ctx.translate(x, y); var k = (sz || 19) / 19; ctx.scale(k, k);
    Art.drawPickup(ctx, { x: 0, y: 0, kind: kind, t: 0 });
    ctx.restore();
  }

  var MAT = { boar: 'wood', frog: 'wood', shield: 'stone', bee: 'time' };
  var HH = { boar: 32, frog: 28, shield: 44, bee: 32 };

  // ---------- 怪物: 傷害事件 → 血量、死亡時間 ----------
  function mon(o) {
    var sum = 0; o.deathT = null; o.blocks = o.blocks || [];
    for (var i = 0; i < o.evs.length; i++) {
      var e = o.evs[i]; sum += e.dmg; e.kill = false;
      if (sum >= o.max && o.deathT === null) { o.deathT = e.t; e.kill = true; }
    }
    o.mat = MAT[o.type];
    return o;
  }
  function hpAt(m, t) {
    var h = m.max, last = null;
    for (var i = 0; i < m.evs.length; i++) if (m.evs[i].t <= t) { last = m.evs[i]; h -= last.dmg; }
    var lag = h;
    if (last) lag = lerp(h + last.dmg, h, seg(t, last.t + 0.12, last.t + 0.34)); // 掉血那段先白再縮
    return { hp: Math.max(0, h), lag: Math.max(0, lag) };
  }
  function sinceHit(m, t) { var d = 1e9; for (var i = 0; i < m.evs.length; i++) if (t >= m.evs[i].t) d = Math.min(d, t - m.evs[i].t); return d; }

  function hpBar(ctx, cx, y, hp, lag, max) {
    var sw = 9, g = 2, w = max * sw + (max - 1) * g, x0 = cx - w / 2;
    rr(ctx, x0 - 2, y - 2, w + 4, 8, 3); ctx.fillStyle = 'rgba(10,8,14,0.88)'; ctx.fill();
    for (var i = 0; i < max; i++) {
      var x = x0 + i * (sw + g);
      ctx.fillStyle = '#3a3040'; ctx.fillRect(x, y, sw, 4);
      if (i < hp) { ctx.fillStyle = P.hp; ctx.fillRect(x, y, sw, 4); }
      else if (i < lag) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, sw * Math.min(1, lag - i), 4); }
    }
  }

  // 盾已破的盾兵: 底版盾兵去掉整面盾, 手上只剩一截碎盾
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

  function drawMon(ctx, m, t) {
    if (m.deathT !== null && t >= m.deathT) {
      if (t < m.deathT + 0.5) { var dp = m.pos(m.deathT); Art.drawPoof(ctx, { x: dp[0], y: dp[1], t: t - m.deathT, dur: 0.5, big: false }); }
      return;
    }
    var p = m.pos(t), f = m.facing(t), hit = sinceHit(m, t) < 0.09;
    var s = { x: p[0], y: p[1], facing: f, state: m.state(t), hit: hit, brood: false, t: t };
    if (m.type === 'boar') Art.drawBoar(ctx, s);
    else if (m.type === 'frog') Art.drawFrog(ctx, s);
    else if (m.type === 'bee') Art.drawShooterBee(ctx, s);
    else if (m.breakT != null && t >= m.breakT) shieldBroken(ctx, p[0], p[1], f, hit, t);
    else {
      for (var i = 0; i < m.blocks.length; i++) if (t >= m.blocks[i] && t - m.blocks[i] < 0.15) s.state = 'block';
      Art.drawShieldman(ctx, s);
    }
    var hp = hpAt(m, t);
    ctx.save(); hpBar(ctx, p[0], p[1] - HH[m.type] / 2 - 10, hp.hp, hp.lag, m.max); ctx.restore();
  }

  // 盾被打壞的瞬間: 白閃環 + 5 片藍色碎盾往後噴落
  function shieldShatter(ctx, x, y, f, dt) {
    if (dt < 0 || dt > 0.6) return;
    ctx.save();
    var sx = x + f * 9.5;
    if (dt < 0.2) { var q = dt / 0.2; circle(ctx, sx, y, 6 + 26 * q); ctx.lineWidth = 4 * (1 - q) + 1; ctx.strokeStyle = 'rgba(255,255,255,' + (1 - q) + ')'; ctx.stroke(); }
    ctx.globalAlpha = 1 - dt / 0.6;
    for (var i = 0; i < 5; i++) {
      var vx = -f * (40 + i * 28) + (i - 2) * 14, vy = -(170 + (i % 3) * 60);
      var px = sx + vx * dt, py = y - 8 + i * 5 + vy * dt + 650 * dt * dt;
      ctx.save(); ctx.translate(px, py); ctx.rotate((i % 2 ? 1 : -1) * dt * 12);
      poly(ctx, [-4, -5, 4, -4, 3, 5, -3, 4]); ctx.fillStyle = P.shieldPlate; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // 命中火花: 傷害越高射線越長越多; 擊倒加一圈金環
  function hitBurst(ctx, sp, t) {
    var dt = t - sp.t; if (dt < 0 || dt > 0.18) return;
    var q = dt / 0.18, n = 6 + sp.dmg * 2, L = (12 + sp.dmg * 9) * (0.55 + 0.6 * q);
    ctx.save(); ctx.globalAlpha = 1 - q; ctx.lineCap = 'round';
    circle(ctx, sp.x, sp.y, 7 + sp.dmg * 3); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var i = 0; i < n; i++) { var a = i * TAU / n + sp.t; ctx.moveTo(sp.x + Math.cos(a) * L * 0.35, sp.y + Math.sin(a) * L * 0.35); ctx.lineTo(sp.x + Math.cos(a) * L, sp.y + Math.sin(a) * L); }
    ctx.stroke();
    if (sp.kill) { circle(ctx, sp.x, sp.y, 10 + 22 * q); ctx.lineWidth = 3; ctx.strokeStyle = P.gold; ctx.stroke(); }
    ctx.restore();
  }

  // ---------- 素材: 彈出 → 落地彈一下 → 磁吸回角色 ----------
  var MAG = 0.6, MD = 0.25, G = 1300;
  function spillsOf(mons) {
    var out = [];
    for (var j = 0; j < mons.length; j++) {
      var m = mons[j];
      for (var i = 0; i < m.evs.length; i++) {
        var e = m.evs[i], ks = [];
        for (var k = 0; k < e.dmg; k++) ks.push(m.mat);
        if (e.kill) ks.push('soul');
        var p = m.pos(e.t);
        out.push({ t: e.t, x: p[0], y: p[1], kinds: ks, dmg: e.dmg, kill: e.kill });
      }
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }
  function iconPos(sp, i, t, lane) {
    var dt = t - sp.t; if (dt < 0) return null;
    var n = sp.kinds.length, r1 = hash(sp.t * 13 + i, 2.1), r2 = hash(i * 3.7 + 1, sp.t * 9);
    var vx = (i - (n - 1) / 2) * 62 + (r1 - 0.5) * 50, vy = -(330 + r2 * 140), land = GY - 10, a = 0.5 * G;
    var c = sp.y - land, tl = (-vy + Math.sqrt(Math.max(0, vy * vy - 4 * a * c))) / (2 * a);
    function phys(u) {
      if (u < tl) return [sp.x + vx * u, sp.y + vy * u + a * u * u];
      var v = u - tl, vb = -(vy + G * tl) * 0.35, yb = land + vb * v + a * v * v;
      return [sp.x + vx * tl + vx * 0.4 * v, Math.min(land, yb)];
    }
    if (dt < MAG) { var q0 = phys(dt); return { x: q0[0], y: q0[1], s: dt < 0.06 ? 0.4 + 10 * dt : 1 }; }
    var q = seg(dt, MAG, MAG + MD); if (q >= 1) return null;
    var p0 = phys(MAG), h = lane.hero(t), e = q * q;
    return { x: lerp(p0[0], h.x, e), y: lerp(p0[1], GY - 26, e), s: 1 - 0.45 * e };
  }
  function drawSpills(ctx, lane, t) {
    var sps = lane.spills, i, j;
    for (i = 0; i < sps.length; i++) for (j = 0; j < sps[i].kinds.length; j++) {
      var q = iconPos(sps[i], j, t, lane); if (!q) continue;
      icon(ctx, sps[i].kinds[j], q.x, q.y, 19 * q.s);
    }
    // 吸到角色身上的瞬間: 角色周圍一圈素材色閃環
    var h = lane.hero(t);
    for (i = 0; i < sps.length; i++) {
      var ta = sps[i].t + MAG + MD, d = t - ta;
      if (d >= 0 && d < 0.16) {
        ctx.save(); ctx.globalAlpha = 1 - d / 0.16;
        circle(ctx, h.x, GY - 22, 18 + 30 * d); ctx.lineWidth = 3; ctx.strokeStyle = P[sps[i].kinds[0] + 'Light']; ctx.stroke();
        ctx.restore();
      }
    }
    // +N 浮字(底版 drawPopup), 同時存在的往上疊
    var slot = 0;
    for (i = 0; i < sps.length; i++) {
      var ta2 = sps[i].t + MAG + MD, d2 = t - ta2; if (d2 < 0 || d2 >= 0.8) continue;
      var cnt = {}, order = [];
      for (j = 0; j < sps[i].kinds.length; j++) { var k = sps[i].kinds[j]; if (!cnt[k]) { cnt[k] = 0; order.push(k); } cnt[k]++; }
      for (j = 0; j < order.length; j++) {
        Art.drawPopup(ctx, { x: h.x + 10, y: GY - 64 - slot * 20, t: d2, dur: 0.8, kind: order[j], value: cnt[order[j]] });
        slot++;
      }
    }
  }

  function poseAt(t, list, dur) { for (var i = 0; i < list.length; i++) if (t >= list[i] && t - list[i] < dur) return t - list[i]; return -1; }

  // ---------- 跑道 1: 劍士(衝刺斬 2 傷 / 揮砍 1 傷 / 打壞盾) ----------
  var SLASH1 = [0.75, 1.8, 2.1, 2.4];
  var sword = {
    label: '劍士  揮砍 1 傷 · 衝刺斬 2 傷', cls: 'sword',
    hero: function (t) {
      var x = t < 0.3 ? 180 : t < 0.48 ? lerp(180, 340, (t - 0.3) / 0.18) : t < 1.4 ? 340 : t < 1.7 ? lerp(340, 416, (t - 1.4) / 0.3) :
        t < 3.0 ? 416 : t < 3.18 ? lerp(416, 576, (t - 3.0) / 0.18) : 576;
      var f = (t >= 0.6 && t < 1.35) ? -1 : 1, pose = 'idle', pt = 0, s;
      if (t >= 0.3 && t < 0.48) { pose = 'dash'; pt = t - 0.3; }
      else if (t >= 3.0 && t < 3.18) { pose = 'dash'; pt = t - 3.0; }
      else if ((s = poseAt(t, SLASH1, 0.2)) >= 0) { pose = 'slash'; pt = s; }
      else if (t >= 1.4 && t < 1.7) { pose = 'run'; pt = t; }
      return { x: x, facing: f, pose: pose, poseT: pt };
    },
    mons: [
      mon({ type: 'boar', max: 3, pos: function () { return [300, GY - 16]; }, facing: function (t) { return t < 0.5 ? -1 : 1; }, state: function () { return 'walk'; },
        evs: [{ t: 0.435, dmg: 2 }, { t: 0.78, dmg: 1 }] }),
      mon({ type: 'shield', max: 3, pos: function () { return [470, GY - 22]; }, facing: function () { return -1; }, state: function () { return 'walk'; },
        blocks: [1.83], breakT: 2.13, evs: [{ t: 2.43, dmg: 1 }, { t: 3.06, dmg: 2 }] })
    ],
    fx: function (ctx, t) { shieldShatter(ctx, 470, GY - 22, -1, t - 2.13); }
  };

  // ---------- 跑道 2: 獵人(每 0.6 秒自動射箭 / 潛行穿過野豬) ----------
  var FIRE = [{ t: 0.2, tg: [360, GY - 14] }, { t: 0.8, tg: [360, GY - 14] }, { t: 1.4, tg: [420, GY - 95] }];
  var hunter = {
    label: '獵人  自動射箭 每 0.6 秒 · 潛行(無敵、可穿怪)', cls: 'hunter',
    hero: function (t) {
      var x = t < 2.2 ? 170 : t < 3.4 ? lerp(170, 500, (t - 2.2) / 1.2) : 500, pose = 'idle', pt = 0;
      for (var i = 0; i < FIRE.length; i++) if (t >= FIRE[i].t && t - FIRE[i].t < 0.15) { pose = 'shoot'; pt = t - FIRE[i].t; }
      if (t >= 2.2 && t < 3.4) { pose = 'run'; pt = t; }
      return { x: x, facing: 1, pose: pose, poseT: pt };
    },
    mons: [
      mon({ type: 'frog', max: 2, pos: function () { return [360, GY - 14]; }, facing: function () { return -1; }, state: function () { return 'crouch'; },
        evs: [{ t: 0.45, dmg: 1 }, { t: 1.05, dmg: 1 }] }),
      mon({ type: 'bee', max: 1, pos: function (t) { return [420, GY - 95 + Math.sin(t * Math.PI) * 6]; }, facing: function () { return -1; }, state: function () { return 'fly'; },
        evs: [{ t: 1.75, dmg: 1 }] }),
      mon({ type: 'boar', max: 3, pos: function (t) { return [t < 1.6 ? 600 : 600 - 80 * (t - 1.6), GY - 16]; }, facing: function () { return -1; }, state: function () { return 'walk'; }, evs: [] })
    ],
    under: function (ctx, t) { var h = this.hero(t); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, LANE); ctx.clip(); Art.drawRangeRing(ctx, { x: h.x, y: GY - 22, radius: 260 }); ctx.restore(); },
    fx: function (ctx, t) {
      for (var i = 0; i < FIRE.length; i++) {
        var f = FIRE[i], sx = 184, sy = GY - 23, d = Math.hypot(f.tg[0] - sx, f.tg[1] - sy) - 12, fly = d / 700, u = t - f.t;
        if (u < 0 || u >= fly) continue;
        var q = u / fly, a = Math.atan2(f.tg[1] - sy, f.tg[0] - sx);
        Art.drawArrow(ctx, { x: lerp(sx, sx + Math.cos(a) * d, q), y: lerp(sy, sy + Math.sin(a) * d, q), angle: a });
      }
    },
    drawHero: function (ctx, t) { stealthHero(ctx, this.hero(t), t, this.mons[2].pos(t)[0]); }
  };

  // 潛行: 進入(青色碎光往內收)→ 持續(本體剩 28% + 青色流動虛線殼 + 殘影)→ 解除(碎光往外炸)
  function diamonds(ctx, x, y, r, a, rot) {
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#7dffe0';
    for (var i = 0; i < 8; i++) { var an = i * TAU / 8 + rot; var px = x + Math.cos(an) * r, py = y + Math.sin(an) * r * 1.3; poly(ctx, [px, py - 4, px + 3, py, px, py + 4, px - 3, py]); ctx.fill(); }
    ctx.restore();
  }
  function stealthHero(ctx, h, t, boarX) {
    var y = GY - 22, st = { x: h.x, y: y, cls: 'hunter', facing: h.facing, pose: h.pose, poseT: h.poseT };
    if (t < 2.0 || t >= 3.6) { Art.drawPlayer(ctx, st); return; }
    var pe = seg(t, 2.0, 2.2), px = seg(t, 3.4, 3.6), act = t >= 2.2 && t < 3.4;
    ctx.save();
    if (act) for (var k = 3; k >= 1; k--) { ctx.globalAlpha = 0.09; Art.drawPlayer(ctx, { x: h.x - k * 18, y: y, cls: 'hunter', facing: 1, pose: 'run', poseT: t - k * 0.04 }); }
    ctx.globalAlpha = 1 - 0.72 * pe + 0.72 * px;
    Art.drawPlayer(ctx, st);
    var shell = Math.min(pe, 1 - px);
    ctx.globalAlpha = shell;
    ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 50;
    rr(ctx, h.x - 19, y - 28, 38, 56, 13); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7dffe0'; ctx.stroke();
    ctx.setLineDash([]);
    // 正在穿過怪物: 重疊處冒青色「穿透」火花, 怪物不閃白、角色不扣血
    if (act && Math.abs(h.x - boarX) < 40) {
      ctx.globalAlpha = 1;
      for (var i = 0; i < 4; i++) {
        var a = t * 9 + i * TAU / 4, cx = (h.x + boarX) / 2 + Math.cos(a) * 16, cy = y + 4 + Math.sin(a) * 14;
        ctx.strokeStyle = '#7dffe0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4); ctx.stroke();
      }
    }
    ctx.restore();
    if (t < 2.2) diamonds(ctx, h.x, y, 44 * (1 - pe), pe, t * 6);
    if (t >= 3.4) diamonds(ctx, h.x, y, 44 * px, 1 - px, t * 6);
  }

  // ---------- 跑道 3: 炸彈工(炸彈 2 傷 / 震波擊飛撞成一串) ----------
  var bomber = {
    label: '炸彈工  炸彈 2 傷 · 震波擊飛連鎖', cls: 'bomber',
    hero: function (t) {
      var x = t < 1.0 ? 140 : t < 1.52 ? lerp(140, 250, (t - 1.0) / 0.52) : 250, pose = 'idle', pt = 0;
      if (t >= 0.15 && t < 0.35) { pose = 'throw'; pt = t - 0.15; }
      else if (t >= 1.0 && t < 1.52) { pose = 'run'; pt = t; }
      else if (t >= 1.6 && t < 1.9) { pose = 'wave'; pt = t - 1.6; }
      return { x: x, facing: 1, pose: pose, poseT: pt };
    },
    mons: [
      mon({ type: 'frog', max: 2, pos: function () { return [300, GY - 14]; }, facing: function () { return -1; }, state: function () { return 'crouch'; }, evs: [{ t: 0.55, dmg: 2 }] }),
      mon({ type: 'frog', max: 2, pos: function (t) { return [t < 1.94 ? 360 : 360 + 460 * (t - 1.94), GY - 14]; }, facing: function () { return -1; },
        state: function (t) { return t >= 1.94 ? 'flung' : 'crouch'; }, evs: [{ t: 1.94, dmg: 1 }, { t: 2.47, dmg: 1 }] }),
      mon({ type: 'boar', max: 3, pos: function (t) { return [t < 1.98 ? 420 : 420 + 460 * (t - 1.98), GY - 16]; }, facing: function () { return -1; },
        state: function (t) { return t >= 1.98 ? 'flung' : 'walk'; }, evs: [{ t: 1.98, dmg: 2 }, { t: 2.36, dmg: 1 }] })
    ],
    under: function (ctx) {
      Art.drawGround(ctx, { x: 640, y: GY - 20, top: false, theme: 'plain' });
      Art.drawGround(ctx, { x: 640, y: GY - 60, top: false, theme: 'plain' });
      Art.drawGround(ctx, { x: 640, y: GY - 100, top: true, theme: 'plain' });
    },
    fx: function (ctx, t) {
      if (t >= 0.15 && t < 0.55) { var q = (t - 0.15) / 0.4; Art.drawBomb(ctx, { x: lerp(152, 300, q), y: lerp(GY - 30, GY - 14, q) - 280 * q * (1 - q), t: t }); }
      if (t >= 0.55 && t < 0.95) Art.drawExplosion(ctx, { x: 300, y: GY - 14, t: t - 0.55, dur: 0.4, radius: 60 });
      if (t >= 1.6 && t < 2.0) Art.drawShockwave(ctx, { x: 250, y: GY - 22, t: t - 1.6, dur: 0.4, radius: 130 });
      if (t >= 2.47 && t < 3.27) Art.drawChainText(ctx, { x: 596, y: GY - 62, n: 2, t: t - 2.47, dur: 0.8 });
    }
  };

  var LANES = [sword, hunter, bomber];
  for (var li = 0; li < LANES.length; li++) LANES[li].spills = spillsOf(LANES[li].mons);

  function drawLane(ctx, lane, t) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, LANE); ctx.clip();
    // 份量大的一擊(2 傷以上或擊倒)整條跑道震一下
    var off = 0;
    for (var i = 0; i < lane.spills.length; i++) {
      var sp = lane.spills[i], d = t - sp.t;
      if ((sp.dmg >= 2 || sp.kill) && d >= 0 && d < 0.14) off += Math.sin(d * 110) * (2 + sp.dmg) * (1 - d / 0.14);
    }
    ctx.save(); ctx.translate(off, 0);
    for (var x = 20; x < W + 40; x += 40) Art.drawGround(ctx, { x: x, y: GY + 20, top: true, theme: 'plain' });
    if (lane.under) lane.under(ctx, t);
    for (i = 0; i < lane.mons.length; i++) drawMon(ctx, lane.mons[i], t);
    if (lane.drawHero) lane.drawHero(ctx, t);
    else { var h = lane.hero(t); Art.drawPlayer(ctx, { x: h.x, y: GY - 22, cls: lane.cls, facing: h.facing, pose: h.pose, poseT: h.poseT }); }
    if (lane.fx) lane.fx(ctx, t);
    for (i = 0; i < lane.spills.length; i++) hitBurst(ctx, lane.spills[i], t);
    drawSpills(ctx, lane, t);
    ctx.restore();
    label(ctx, lane.label, 12, 18, 14, P.textDim);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(0, LANE - 1, W, 1);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'combat-fx', id: 'A', kind: 'anim',
    size: [W, H], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DUR + DUR) % DUR;
      ctx.save();
      ctx.save(); ctx.scale(W / 1280, H / 720); Art.drawBackground(ctx); ctx.restore();
      for (var i = 0; i < LANES.length; i++) { ctx.save(); ctx.translate(0, i * LANE); drawLane(ctx, LANES[i], t); ctx.restore(); }
      var fade = t < 0.12 ? 1 - t / 0.12 : t > 3.85 ? (t - 3.85) / 0.15 : 0;
      if (fade > 0) { ctx.fillStyle = 'rgba(10,12,20,' + fade + ')'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
  };
})();
