/* replay-map 方案 A: 彗星長弧
 * 大地圖回放與素材飛行。需先載入底版 deepen-3/game-a/game/art/art.js(全域 Art)。
 * 只用 Canvas 2D; 不碰 DOM、不用計時器, 畫面完全由 t(秒)決定。
 */
(function () {
  'use strict';
  // ===== 共用: 大地圖版位、回放錄影、素材飛行時間軸(三個方案相同, 只差畫法) =====
  // 一圈 15 秒演出「越後期越熱鬧」: 開場第 1、2 關已過關, 之後第 3~8 關陸續過關, 同時在飛的素材越來越多。
  // 動態完全由 t 決定: 每關回放以 (t - 過關時刻) 對錄影長度取餘; 每個拿素材事件的第 k 次發生時刻可直接算出。
  var DUR = 15, FLY = 0.7, TH = 0.125, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var KINDS = ['wood', 'stone', 'time', 'soul'];
  var HUDX = { wood: 36, stone: 206, time: 376, soul: 546 }, HUDY = 20; // 資訊列四格圖示中心(= art.js 的 hudCell)
  var BASE = { wood: 46, stone: 31, time: 12, soul: 20 };
  var GOAL_COST = { wood: 300, stone: 220, time: 100, soul: 120 };
  var MULT = [1, 1.25, 1.5];
  var FOE_H = { boar: 32, shield: 44, bee: 32, frog: 28 };
  var FOE_DROP = { boar: [['wood', 3], ['soul', 1]], shield: [['stone', 3], ['soul', 1]], bee: [['time', 2], ['soul', 1]], frog: [['wood', 2], ['soul', 1]] };
  var FOE_SET = { plain: ['frog', 'boar', 'bee'], sky: ['bee', 'frog', 'bee'], rock: ['boar', 'shield', 'boar'], swamp: ['frog', 'frog', 'shield'], throne: ['boar', 'shield', 'bee'] };
  var PICK_SET = { plain: ['wood', 'wood', 'stone', 'time'], sky: ['time', 'wood', 'time', 'stone'], rock: ['stone', 'wood', 'stone', 'stone'], swamp: ['wood', 'stone', 'wood', 'time'], throne: ['wood', 'stone', 'time', 'stone'] };
  var CARDS = [
    { i: 1, x: 40, y: 281, name: '草原', theme: 'plain', cls: 'sword', P: 12, clear: 0, accel: 2, newArea: false, rep: 1, bonus: [['wood', 4]] },
    { i: 2, x: 290, y: 131, name: '懸崖棧道', theme: 'sky', cls: 'hunter', P: 14, clear: 0, accel: 1, newArea: false, rep: 0, bonus: [['time', 2]] },
    { i: 3, x: 290, y: 431, name: '野豬峽谷', theme: 'rock', cls: 'bomber', P: 14, clear: 2.5, accel: 0, newArea: true, rep: 2, bonus: [['stone', 3]] },
    { i: 4, x: 540, y: 56, name: '蜂巢高塔', theme: 'sky', cls: 'hunter', P: 16, clear: 5, accel: 0, newArea: false, rep: 0, bonus: null },
    { i: 5, x: 540, y: 206, name: '斷橋', theme: 'sky', cls: 'sword', P: 13, clear: 6.5, accel: 1, newArea: false, rep: 0, bonus: null },
    { i: 6, x: 540, y: 356, name: '盾兵要塞', theme: 'rock', cls: 'bomber', P: 15, clear: 8, accel: 0, newArea: true, rep: 1, bonus: [['soul', 2]] },
    { i: 7, x: 540, y: 506, name: '蛙沼', theme: 'swamp', cls: 'sword', P: 14, clear: 9.5, accel: 0, newArea: false, rep: 0, bonus: null },
    { i: 8, x: 790, y: 281, name: '王座', theme: 'throne', cls: 'bomber', P: 18, clear: 11, accel: 0, newArea: false, rep: 0, bonus: [['soul', 4]] }
  ];
  var LINKS = [[1, 2], [1, 3], [2, 4], [2, 5], [3, 6], [3, 7], [5, 8], [6, 8]];

  function rnd(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
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
  function txt(ctx, s, x, y, px, col, align, outline) {
    ctx.font = 'bold ' + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = 'rgba(8,10,18,0.92)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px) { ctx.font = 'bold ' + px + 'px ' + FONT; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  // 素材圖示: 直接借 art.js 的地上素材畫法(t=0 時不浮動、不閃星 = 純圖示), 全遊戲同一個長相
  function icon(ctx, kind, x, y, k, rot, sx, sy) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.scale(k * (sx || 1), k * (sy || 1));
    window.Art.drawPickup(ctx, { x: 0, y: 0, kind: kind, t: 0 });
    ctx.restore();
  }

  // 每關一條假錄影: 地形、地上素材、怪物、終點(關卡座標 1280×720, 縮圖 ×0.125)
  function build(c) {
    var s = c.i, tops = [], col, k;
    var base = 12 + Math.floor(rnd(s, 1) * 3);
    for (col = 0; col < 32; col++) tops.push(clamp(base + Math.round(Math.sin(col * 0.33 + s * 1.7) * 1.4 + Math.sin(col * 0.9 + s) * 0.6), 9, 15));
    for (col = 0; col < 3; col++) { tops[col] = tops[3]; tops[31 - col] = tops[28]; }
    var span = 0.95 * c.P;
    var topAt = function (x) { return tops[clamp(Math.floor(x / 40), 0, 31)] * 40; };
    var tauAt = function (x) { return span * clamp((x - 60) / 1120, 0, 1); };
    var lv = { tops: tops, topAt: topAt, span: span, picks: [], foes: [], events: [] };
    var ps = PICK_SET[c.theme], fs = FOE_SET[c.theme];
    for (k = 0; k < 5; k++) {
      var px = 170 + k * 210 + rnd(s, k + 10) * 60;
      var pk = { x: px, y: topAt(px) - 26 - (k % 2 ? 50 : 0), kind: ps[k % ps.length], tau: tauAt(px) };
      lv.picks.push(pk); lv.events.push({ tau: pk.tau, x: pk.x, y: pk.y, parts: [[pk.kind, 1]] });
    }
    for (k = 0; k < fs.length; k++) {
      var fx = 300 + k * 300 + rnd(s, k + 30) * 80, type = fs[k];
      var fy = type === 'bee' ? topAt(fx) - 80 : topAt(fx) - FOE_H[type] / 2;
      var fo = { type: type, x: fx, y: fy, tau: tauAt(fx - 50) };
      lv.foes.push(fo); lv.events.push({ tau: fo.tau, x: fx, y: fy, parts: FOE_DROP[type] });
    }
    lv.goal = { x: 1200, y: topAt(1200) - 40, tau: span };
    if (c.bonus) lv.events.push({ tau: span, x: 1200, y: lv.goal.y - 20, parts: c.bonus });
    return lv;
  }
  var LV = CARDS.map(build);

  // 某一刻的完整狀態: 每關回放進度、在飛的素材、資訊列持有數 / 跳動 / 每分鐘產量
  function sim(t) {
    var out = { flights: [], arrivals: [], stock: {}, bump: {}, rate: {}, cards: [] };
    KINDS.forEach(function (k) { out.stock[k] = BASE[k]; out.bump[k] = 99; out.rate[k] = 0; });
    for (var ci = 0; ci < CARDS.length; ci++) {
      var c = CARDS[ci], lv = LV[ci], m = MULT[c.accel], Pe = c.P / m;
      var cs = { cleared: t >= c.clear, tau: 0, rates: { wood: 0, stone: 0, time: 0, soul: 0 } };
      if (cs.cleared) {
        var dt = t - c.clear;
        cs.tau = (((dt % Pe) + Pe) % Pe) * m;
        for (var ej = 0; ej < lv.events.length; ej++) {
          var e = lv.events[ej], o = e.tau / m, pi;
          for (pi = 0; pi < e.parts.length; pi++) cs.rates[e.parts[pi][0]] += e.parts[pi][1] / Pe * 60;
          if (dt < o) continue;
          var kL = Math.floor((dt - o) / Pe);
          for (var kk = kL; kk >= Math.max(0, kL - 1); kk--) {
            var age = dt - o - kk * Pe;
            if (age < 0 || age >= FLY) continue;
            for (pi = 0; pi < e.parts.length; pi++) {
              var kind = e.parts[pi][0], n = e.parts[pi][1], fl = Math.min(n, 5);
              for (var q = 0; q < fl; q++) {
                var sd = c.i * 101 + ej * 13 + pi * 5 + q;
                out.flights.push({
                  kind: kind, ci: ci, q: q, part: pi, age: age, p: age / FLY, value: q === fl - 1 ? n - (fl - 1) : 1,
                  seed: rnd(sd, kk + 1),
                  ox: c.x + 8 + e.x * TH, oy: c.y + 8 + e.y * TH,
                  sx: c.x + 8 + e.x * TH + (rnd(sd, 7) - 0.5) * 12, sy: c.y + 8 + e.y * TH + (rnd(sd, 9) - 0.5) * 12,
                  ex: HUDX[kind], ey: HUDY
                });
              }
            }
          }
          if (dt - o >= FLY) {
            var kA = Math.floor((dt - o - FLY) / Pe), last = dt - o - FLY - kA * Pe;
            for (pi = 0; pi < e.parts.length; pi++) {
              var kd = e.parts[pi][0], nn = e.parts[pi][1];
              out.stock[kd] += nn * (kA + 1);
              if (last < out.bump[kd]) out.bump[kd] = last;
              if (last < 1) out.arrivals.push({ kind: kd, age: last, value: nn, ci: ci });
            }
          }
        }
        KINDS.forEach(function (k) { out.rate[k] += cs.rates[k]; });
      }
      out.cards.push(cs);
    }
    return out;
  }

  function drawFoe(ctx, fo, t) {
    var A = window.Art, st = { x: fo.x, y: fo.y, facing: -1, hit: false, brood: false, t: t };
    if (fo.type === 'boar') { st.x += Math.sin(t * 1.5 + fo.x) * 10; st.state = 'walk'; A.drawBoar(ctx, st); }
    else if (fo.type === 'shield') { st.x += Math.sin(t + fo.x) * 6; st.state = 'walk'; A.drawShieldman(ctx, st); }
    else if (fo.type === 'bee') { st.y += Math.sin(t * 3 + fo.x) * 8; st.state = 'fly'; A.drawShooterBee(ctx, st); }
    else { st.state = 'crouch'; A.drawFrog(ctx, st); }
  }
  // 縮圖回放: 以關卡座標畫, 外面整組 ×0.125(art.js 會自動切成剪影)
  function drawThumb(ctx, c, lv, tau, t) {
    var A = window.Art, th = (A.themes && A.themes[c.theme]) || { top: '#63c35a', inner: '#7b5a3c' }, i;
    ctx.save();
    ctx.beginPath(); ctx.rect(c.x + 8, c.y + 8, 160, 90); ctx.clip();
    ctx.translate(c.x + 8, c.y + 8); ctx.scale(TH, TH);
    A.drawBackground(ctx);
    for (i = 0; i < 32; i++) {
      var ty = lv.tops[i] * 40;
      ctx.fillStyle = th.inner; ctx.fillRect(i * 40, ty, 41, 720 - ty);
      ctx.fillStyle = th.top; ctx.fillRect(i * 40, ty, 41, 12);
    }
    for (i = 0; i < lv.picks.length; i++) { var p = lv.picks[i]; if (tau < p.tau) A.drawPickup(ctx, { x: p.x, y: p.y, kind: p.kind, t: t }); }
    A.drawGoal(ctx, { x: lv.goal.x, y: lv.goal.y, reached: tau >= lv.goal.tau });
    for (i = 0; i < lv.foes.length; i++) {
      var fo = lv.foes[i];
      if (tau < fo.tau) drawFoe(ctx, fo, t);
      else if (tau - fo.tau < 0.5) A.drawPoof(ctx, { x: fo.x, y: fo.y, t: tau - fo.tau, dur: 0.5, big: false });
    }
    var px = 60 + 1120 * Math.min(1, tau / lv.span);
    var hop = tau < lv.span ? 44 * Math.max(0, Math.sin(tau * 5.2)) : 0;
    A.drawPlayer(ctx, { x: px, y: lv.topAt(px) - 22 - hop, cls: c.cls, facing: 1, pose: hop > 2 ? 'rise' : 'run', poseT: tau, invuln: false });
    ctx.restore();
  }

  // 整張大地圖(不含飛行素材): hook.under 在卡片下層, hook.cardXform 卡片變換, hook.overlay 卡片上層
  function drawScene(ctx, t, S, hook) {
    var A = window.Art, ci;
    A.drawMapBackground(ctx);
    if (hook.under) hook.under(ctx, t, S);
    for (ci = 0; ci < LINKS.length; ci++) {
      var a = CARDS[LINKS[ci][0] - 1], b = CARDS[LINKS[ci][1] - 1];
      A.drawMapLink(ctx, { x1: a.x + 176, y1: a.y + 68, x2: b.x, y2: b.y + 68, lit: t >= a.clear });
    }
    A.drawWorkshopCard(ctx, { x: 40, y: 506, anyAffordable: false, selected: false });
    A.drawGoalCard(ctx, { x: 1040, y: 281, cost: GOAL_COST, stock: S.stock, canAfford: false, selected: false });
    for (ci = 0; ci < CARDS.length; ci++) {
      var c = CARDS[ci], cs = S.cards[ci];
      ctx.save();
      if (hook.cardXform) hook.cardXform(ctx, c, cs, t);
      A.drawLevelCard(ctx, { x: c.x, y: c.y, index: c.i, name: c.name, state: cs.cleared ? 'cleared' : 'open', cost: null, stock: null, canAfford: true, rates: cs.rates, recordCls: c.cls, recordTime: c.P, repairedCount: c.rep });
      if (cs.cleared) drawThumb(ctx, c, LV[ci], cs.tau, t);
      if (hook.overlay) hook.overlay(ctx, c, cs, t, ci, S);
      ctx.restore();
    }
    A.drawHud(ctx, { mode: 'map', stock: S.stock, ratePerMin: S.rate, bumpT: S.bump, bumpDur: 0.22 });
  }
  function wrapT(t) { t = Number(t); if (!isFinite(t)) t = 0; return ((t % DUR) + DUR) % DUR; }

  // ===== 方案 A: 彗星長弧 =====
  // 每顆素材各走一條自己的高弧, 拖一條素材色的漸細緞帶; 出發點在縮圖上冒一圈小環, 抵達時資訊列圖示外擴一圈光環。
  // 不雜亂的做法: 同時在飛的越多, 緞帶越淡越短(圖示本身不變), 畫面熱鬧靠「弧的數量」而不是每條弧變亮。
  var ID = 'A';
  function easeIO(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function posA(f, p) {
    var j = (f.seed - 0.5) * 90;
    var cx = f.ex + (f.sx - f.ex) * 0.3 + j, cy = f.ey + Math.max(70, (f.sy - f.ey) * 0.45) + j * 0.4;
    var u = easeIO(clamp(p, 0, 1)), a = 1 - u;
    return [a * a * f.sx + 2 * a * u * cx + u * u * f.ex, a * a * f.sy + 2 * a * u * cy + u * u * f.ey];
  }
  function overlayA(ctx, c, cs, t) {
    var PAL = window.Art.palette;
    window.Art.drawCardOverlay(ctx, { x: c.x, y: c.y, accelLv: cs.cleared ? c.accel : 0, newArea: cs.cleared && c.newArea, selected: false });
    var a = t - c.clear;
    if (c.clear > 0 && a >= 0 && a < 0.9) { // 剛過關: 綠框往外擴散一次
      var q = a / 0.9;
      ctx.save(); ctx.globalAlpha = 1 - q; ctx.lineWidth = 4 * (1 - q) + 1; ctx.strokeStyle = PAL.good;
      rr(ctx, c.x - 3 - q * 10, c.y - 3 - q * 10, 182 + q * 20, 142 + q * 20, 12); ctx.stroke(); ctx.restore();
    }
  }
  function drawFrame(ctx, t) {
    var PAL = window.Art.palette;
    t = wrapT(t);
    var S = sim(t);
    drawScene(ctx, t, S, { overlay: overlayA });
    var fs = S.flights, dens = clamp(16 / (fs.length + 4), 0.38, 1), i, k;
    ctx.save();
    // 出發: 縮圖上該位置冒一圈素材色小環(每個事件一圈)
    for (i = 0; i < fs.length; i++) {
      var f = fs[i];
      if (f.q !== 0 || f.age >= 0.25) continue;
      var r = f.age / 0.25;
      ctx.globalAlpha = 1 - r; ctx.lineWidth = 2; ctx.strokeStyle = PAL[f.kind + 'Light'];
      circle(ctx, f.ox, f.oy, 2 + r * 10); ctx.stroke();
    }
    // 緞帶拖尾
    ctx.lineCap = 'round';
    for (i = 0; i < fs.length; i++) {
      f = fs[i];
      var prev = posA(f, f.p), steps = Math.round(4 + 6 * dens);
      for (k = 1; k <= steps; k++) {
        var pp = f.p - k * 0.028; if (pp < 0) break;
        var cur = posA(f, pp);
        ctx.globalAlpha = Math.max(0, (0.62 - k * 0.06)) * dens;
        ctx.strokeStyle = k < 3 ? PAL[f.kind + 'Light'] : PAL[f.kind];
        ctx.lineWidth = Math.max(1, 8 - k * 0.8);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
        prev = cur;
      }
    }
    // 彗星頭: 柔光 + 素材圖示
    for (i = 0; i < fs.length; i++) {
      f = fs[i];
      var pos = posA(f, f.p);
      ctx.globalAlpha = 0.28 * dens; ctx.fillStyle = PAL[f.kind + 'Light'];
      circle(ctx, pos[0], pos[1], 11); ctx.fill();
      ctx.globalAlpha = 1;
      icon(ctx, f.kind, pos[0], pos[1], 0.85 + 0.2 * f.p);
    }
    // 抵達: 資訊列圖示外擴光環(數字跳動由 drawHud 的 bumpT 負責)
    for (i = 0; i < KINDS.length; i++) {
      k = KINDS[i];
      var b = S.bump[k];
      if (b >= 0.4) continue;
      var q = b / 0.4;
      ctx.globalAlpha = 1 - q; ctx.lineWidth = 3 * (1 - q) + 0.5; ctx.strokeStyle = PAL[k + 'Light'];
      circle(ctx, HUDX[k], HUDY, 12 + q * 16); ctx.stroke();
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'replay-map', id: ID, kind: 'anim',
    size: [1280, 720],
    duration: DUR,
    loop: true,
    draw: function (ctx, t) { drawFrame(ctx, t); }
  };
})();
