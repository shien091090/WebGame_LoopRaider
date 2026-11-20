/* 開始畫面 方案 A — 山體剖面
 * 一座山切開成剖面, 山腹裡嵌著 4 間小關卡(各自一個主題、一位職業), 每間都在自己重跑那一趟:
 * 跑到終點旗 → 冒出素材 → 角色淡出回到起點重演。素材沿山中央的石階一路往上送進山頂王城。
 * 鏡頭不動, 節奏 = 4 間關卡錯開相位、此起彼落的「到旗 → 噴素材」。
 * 循環 4 秒; 所有週期性動態都由 t 推出、週期取 4 秒的因數。
 */
(function () {
  'use strict';
  var A = window.Art || {};
  var PAL = A.palette || {};
  var TAU = Math.PI * 2, D = 4, W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  // ---------- 共用小工具 ----------
  function fr(v) { return v - Math.floor(v); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
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
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function star(ctx, x, y, r, n) {
    n = n || 5; ctx.beginPath();
    for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, r2 = (i % 2) ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); }
    ctx.closePath();
  }
  // 素材圖示: 照搬遊戲內同一個長相(art.js 未匯出, 這裡複製一份, 畫法一字不改)
  function matIcon(ctx, kind, cx, cy, sz) {
    var k = sz / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1420';
    if (kind === 'wood') {
      rr(ctx, -9, -5, 15, 10, 3); ctx.fillStyle = PAL.wood; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, -1.6); ctx.lineTo(1, -1.6); ctx.moveTo(-4, 2); ctx.lineTo(2, 2);
      ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 1; ctx.stroke();
      ell(ctx, 5.5, 0, 3.6, 5); ctx.fillStyle = PAL.woodLight; ctx.fill(); ctx.strokeStyle = '#1a1420'; ctx.lineWidth = 1.6; ctx.stroke();
      ell(ctx, 5.5, 0, 1.4, 2.2); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'stone') {
      poly(ctx, [-8, 3, -5, -6, 4, -8, 9, -2, 7, 6, -3, 8]); ctx.fillStyle = PAL.stone; ctx.fill(); ctx.stroke();
      poly(ctx, [-5, -6, 4, -8, 9, -2, 1, -1]); ctx.fillStyle = PAL.stoneLight; ctx.fill();
      ctx.beginPath(); ctx.moveTo(1, -1); ctx.lineTo(-3, 8); ctx.strokeStyle = PAL.stoneDark; ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'time') {
      poly(ctx, [0, -9.5, 7, -2, 0, 9.5, -7, -2]); ctx.fillStyle = PAL.time; ctx.fill(); ctx.stroke();
      poly(ctx, [0, -9.5, 3, -2, 0, 9.5, -3, -2]); ctx.fillStyle = PAL.timeLight; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(7, -2); ctx.strokeStyle = PAL.timeDark; ctx.lineWidth = 1; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -9.5);
      ctx.bezierCurveTo(4, -4, 8, -1, 7, 4); ctx.bezierCurveTo(6, 8.5, -6, 8.5, -7, 4); ctx.bezierCurveTo(-8, -1, -3, -3, 0, -9.5); ctx.closePath();
      ctx.fillStyle = PAL.soul; ctx.fill(); ctx.stroke();
      ell(ctx, 0, 3.5, 3.6, 3.2); ctx.fillStyle = PAL.soulLight; ctx.fill();
      circle(ctx, -1.6, 3, 0.9); ctx.fillStyle = '#3a0f34'; ctx.fill(); circle(ctx, 1.6, 3, 0.9); ctx.fill();
    }
    ctx.restore();
  }
  // 王城: 照搬遊戲內王城卡片 / 結束面板的城堡造型, 外光改由 glow(0~1)控制
  function castle(ctx, cx, cy, k, glow) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#120e08';
    if (glow > 0) { ctx.shadowColor = PAL.gold; ctx.shadowBlur = 8 + 18 * glow; }
    ctx.fillStyle = '#d8cdb0';
    poly(ctx, [-40, 26, -40, -6, -34, -6, -34, -12, -28, -12, -28, -6, -22, -6, -22, -12, -16, -12, -16, -6, 16, -6, 16, -12, 22, -12, 22, -6, 28, -6, 28, -12, 34, -12, 34, -6, 40, -6, 40, 26]); ctx.fill();
    ctx.shadowBlur = 0; ctx.stroke();
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-12, -26, 24, 52); ctx.strokeRect(-12, -26, 24, 52);
    poly(ctx, [-15, -26, 0, -42, 15, -26]); ctx.fillStyle = '#5d4b88'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = PAL.gold; ctx.fillRect(-1, -52, 2, 11); poly(ctx, [1, -52, 10, -49, 1, -46]); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, 26); ctx.lineTo(-7, 12); ctx.arc(0, 12, 7, Math.PI, 0); ctx.lineTo(7, 26); ctx.closePath();
    ctx.fillStyle = glow > 0.05 ? 'rgba(255,214,90,' + (0.35 + 0.65 * glow).toFixed(3) + ')' : '#3a2a1a'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = glow > 0.05 ? '#ffe27a' : '#3a4a6a'; ctx.fillRect(-3, -14, 6, 8); ctx.fillRect(-30, 4, 6, 8); ctx.fillRect(24, 4, 6, 8);
    ctx.restore();
  }
  // 職業角色: 直接用遊戲內 Art.drawPlayer, 整體縮放(invuln 一律 false, 不吃牆鐘)
  function hero(ctx, cls, x, y, k, pose, poseT, facing) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    A.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: facing, pose: pose, poseT: poseT, invuln: false });
    ctx.restore();
  }
  // 終點旗(遊戲內 drawGoal 的旗飄動吃牆鐘, 這裡照同一造型改由 t 驅動)
  function flag(ctx, x, y, k, reached, wv) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#e6e9ef'; ctx.fillRect(-13, -36, 4, 72);
    circle(ctx, -11, -37, 2.5); ctx.fillStyle = PAL.gold; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9, -35); ctx.quadraticCurveTo(4, -37 + wv, 18, -31);
    ctx.quadraticCurveTo(4, -25 - wv, -9, -15); ctx.closePath();
    ctx.fillStyle = reached ? PAL.goalReached : PAL.goal; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a1408'; ctx.stroke();
    if (reached) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3, -27); ctx.lineTo(1, -23); ctx.lineTo(8, -31); ctx.stroke();
    } else { star(ctx, 1, -26, 5); ctx.fillStyle = '#e5484d'; ctx.fill(); }
    ctx.restore();
  }
  function prompt(ctx, p, y) {
    var s = '按任意按鍵開始遊戲';
    ctx.save();
    ctx.globalAlpha = 0.62 + 0.38 * (0.5 + 0.5 * Math.cos(p * TAU * 2));
    ctx.font = 'bold 26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,10,18,0.92)'; ctx.strokeText(s, W / 2, y);
    ctx.fillStyle = '#f2f4f8'; ctx.fillText(s, W / 2, y);
    ctx.restore();
  }
  // 以「每圈 n 次」把 lp(0~1)換成遊戲函式內部 sin(coef·t) 的 t, 讓待機動態剛好接得上循環
  function cyc(lp, coef, n) { return lp * TAU * n / coef; }

  // ---------- 場景資料 ----------
  var SHAFT_X = 640, SHAFT_TOP = 192, SHAFT_BOT = 640;
  var MT = [40, 720, 200, 560, 300, 450, 400, 320, 470, 250, 540, 195, 740, 195, 810, 250, 880, 320, 980, 450, 1080, 560, 1240, 720];
  var ROOM_BG = { plain: ['#4c78a8', '#2c4a70'], swamp: ['#3c5a4a', '#22342c'], rock: ['#7a5040', '#4a2c24'], sky: ['#6c8cc0', '#3e5684'] };
  var ROOMS = [
    { x: 285, y: 485, w: 320, h: 105, th: 'plain', cls: 'sword', off: 0.00, mir: false, ev: 'slash', mats: ['wood', 'soul', 'wood'], items: [{ k: 'wood', f: 0.26 }, { k: 'stone', f: 0.84 }] },
    { x: 675, y: 485, w: 320, h: 105, th: 'swamp', cls: 'hunter', off: 0.50, mir: true, ev: 'shoot', mats: ['time', 'soul', 'time'], items: [{ k: 'wood', f: 0.26 }, { k: 'time', f: 0.84 }] },
    { x: 395, y: 340, w: 225, h: 95, th: 'rock', cls: 'bomber', off: 0.25, mir: false, ev: 'throw', mats: ['stone', 'soul', 'stone'], items: [{ k: 'stone', f: 0.3 }] },
    { x: 660, y: 340, w: 225, h: 95, th: 'sky', cls: 'sword', off: 0.75, mir: true, ev: 'jump', mats: ['time', 'wood', 'stone'], items: [{ k: 'time', f: 0.5, lift: 26 }, { k: 'time', f: 0.7 }] }
  ];
  var HK = 0.72, TILE = 24, RUN_END = 0.78, EMIT = 0.80, FLY = 1.5;

  function roomPlan(r) {
    var gTop = r.h - TILE;
    var x0 = 18, x1 = r.w - 50;
    var plan = { gTop: gTop, x0: x0, x1: x1, flagX: r.w - 24 };
    plan.fx = r.ev === 'shoot' ? r.w * 0.66 : r.w * 0.58;
    if (r.ev === 'slash') plan.kill = (plan.fx - 32 - x0) / (x1 - x0) * RUN_END;
    else if (r.ev === 'shoot') plan.kill = (plan.fx - 110 - x0) / (x1 - x0) * RUN_END;
    else if (r.ev === 'throw') plan.kill = (plan.fx - 80 - x0) / (x1 - x0) * RUN_END;
    plan.gap = r.ev === 'jump' ? { a: r.w * 0.5 - TILE, b: r.w * 0.5 + TILE } : null;
    return plan;
  }
  function heroX(plan, lp) { return lp < RUN_END ? plan.x0 + (plan.x1 - plan.x0) * (lp / RUN_END) : plan.x1; }

  // ---------- 背景 ----------
  function sky(ctx, p) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#111827'); g.addColorStop(0.6, '#25304e'); g.addColorStop(1, '#2e3858');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 64; i++) {
      var tw = 0.5 + 0.5 * Math.sin(p * TAU * (1 + (i % 3)) + i * 1.7);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + 0.3 * tw).toFixed(3) + ')';
      circle(ctx, hash(i, 1) * W, 12 + hash(i, 2) * 380, 0.8 + hash(i, 3) * 1.2); ctx.fill();
    }
    ctx.fillStyle = '#1d2640';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 40) ctx.lineTo(x, 540 + Math.sin(x * 0.007) * 40 + Math.sin(x * 0.019) * 16);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  function mountain(ctx) {
    var g = ctx.createLinearGradient(0, 195, 0, H);
    g.addColorStop(0, '#53466a'); g.addColorStop(1, '#2a2438');
    poly(ctx, MT); ctx.fillStyle = g; ctx.fill();
    ctx.save(); poly(ctx, MT); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 3;
    for (var i = 0; i < 6; i++) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 40) { var y = 250 + i * 80 + Math.sin(x * 0.011 + i * 1.3) * 14; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = '#6e5f8c'; ctx.fillRect(0, 195, W, 7); // 山頂平台亮緣
    ctx.restore();
    poly(ctx, MT); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#161220'; ctx.stroke();
  }
  // 未開放的關卡: 灰霧小室 + 鎖, 讓「地圖還很大、還有關沒開」看得到
  function sealedRoom(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = '#5f6474'; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    ctx.fillStyle = 'rgba(201,205,214,0.35)';
    for (var i = 0; i < 4; i++) { ell(ctx, x + 14 + i * w / 3.5, y + h * 0.55 + (i % 2) * 8, 22, 12); ctx.fill(); }
    ctx.restore();
    rr(ctx, x, y, w, h, 8); ctx.lineWidth = 4; ctx.strokeStyle = '#161220'; ctx.stroke();
    var cx = x + w / 2, cy = y + h / 2 + 3;
    ctx.beginPath(); ctx.arc(cx, cy - 4, 6, Math.PI, 0); ctx.lineWidth = 3; ctx.strokeStyle = '#2a2d36'; ctx.stroke();
    rr(ctx, cx - 9, cy - 4, 18, 13, 2.5); ctx.fillStyle = '#2a2d36'; ctx.fill();
  }

  // ---------- 石階(關卡出口 → 中央石階 → 王城) ----------
  function roomExit(r, plan) {
    var ex = r.mir ? r.x + (r.w - plan.flagX) : r.x + plan.flagX;
    return { x: ex, y: r.y + plan.gTop - 14 };
  }
  function roads(ctx, p) {
    ctx.save();
    ctx.lineCap = 'butt';
    // 分支: 每間關卡的終點側接到中央石階
    for (var i = 0; i < ROOMS.length; i++) {
      var r = ROOMS[i], pl = roomPlan(r), e = roomExit(r, pl);
      var sx = r.mir ? r.x : r.x + r.w;
      ctx.lineWidth = 14; ctx.strokeStyle = '#231c2c';
      ctx.beginPath(); ctx.moveTo(sx, e.y); ctx.lineTo(SHAFT_X, e.y); ctx.stroke();
    }
    // 中央石階
    rr(ctx, SHAFT_X - 12, SHAFT_TOP, 24, SHAFT_BOT - SHAFT_TOP, 4); ctx.fillStyle = '#231c2c'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2;
    ctx.beginPath(); for (var y = SHAFT_TOP + 10; y < SHAFT_BOT; y += 14) { ctx.moveTo(SHAFT_X - 10, y); ctx.lineTo(SHAFT_X + 10, y); } ctx.stroke();
    // 金色流動虛線: 往上流, 一圈剛好位移 6 個花紋週期
    ctx.setLineDash([8, 20]); ctx.lineDashOffset = p * 28 * 6;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(242,201,76,0.55)';
    ctx.beginPath(); ctx.moveTo(SHAFT_X, SHAFT_BOT); ctx.lineTo(SHAFT_X, SHAFT_TOP); ctx.stroke();
    for (i = 0; i < ROOMS.length; i++) {
      r = ROOMS[i]; pl = roomPlan(r); e = roomExit(r, pl);
      sx = r.mir ? r.x : r.x + r.w;
      ctx.beginPath(); ctx.moveTo(sx, e.y); ctx.lineTo(SHAFT_X, e.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------- 一間關卡 ----------
  function room(ctx, r, p) {
    var lp = fr(p + r.off), pl = roomPlan(r), gTop = pl.gTop;
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.clip();
    if (r.mir) { ctx.translate(r.x + r.w, r.y); ctx.scale(-1, 1); } else ctx.translate(r.x, r.y);
    // 底色
    var bg = ROOM_BG[r.th], g = ctx.createLinearGradient(0, 0, 0, r.h);
    g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, r.w, r.h);
    // 地面(遊戲內地形磚, 縮 0.6)
    var s = TILE / 40;
    ctx.save(); ctx.scale(s, s);
    for (var i = 0; i * TILE < r.w; i++) {
      var cx = i * TILE + TILE / 2;
      var inGap = pl.gap && cx > pl.gap.a && cx < pl.gap.b;
      if (inGap) { A.drawSpike(ctx, { x: cx / s, y: (r.h - TILE / 2) / s }); continue; }
      A.drawGround(ctx, { x: cx / s, y: (r.h - TILE / 2) / s, top: true, theme: r.th });
    }
    ctx.restore();
    // 終點旗
    var reached = lp >= RUN_END;
    flag(ctx, pl.flagX, gTop - 40 * 0.55, 0.55, reached, Math.sin(p * TAU * 4 + r.off * 9) * 2);
    // 地上素材(英雄經過即消失, 重演時跟著回來)
    var hx = heroX(pl, lp), fadeIn = clamp(lp / 0.05, 0, 1);
    for (i = 0; i < r.items.length; i++) {
      var it = r.items[i], ix = r.w * it.f, iy = gTop - 15 - (it.lift || 0);
      if (hx < ix - 4) {
        ctx.save(); ctx.globalAlpha *= fadeIn;
        matIcon(ctx, it.k, ix, iy + Math.sin(lp * TAU * 3 + i) * 1.8, 15);
        ctx.restore();
      } else {
        var pk = (hx - ix + 4) / ((pl.x1 - pl.x0) / RUN_END) * D; // 拾取後經過秒數
        if (pk < 0.25 && lp < RUN_END) {
          ctx.save(); ctx.globalAlpha *= 1 - pk / 0.25;
          star(ctx, ix, iy - pk * 40, 5 + pk * 10, 4); ctx.fillStyle = '#fff6c0'; ctx.fill();
          ctx.restore();
        }
      }
    }
    // 事件: 怪物與職業招式
    var kill = pl.kill, fy, sinceKill = (lp - (kill || 0)) * D;
    if (r.ev === 'slash') {
      fy = gTop - 14 * HK;
      if (lp < kill + 0.01) { ctx.save(); ctx.translate(pl.fx, fy); ctx.scale(HK, HK); A.drawFrog(ctx, { x: 0, y: 0, facing: -1, state: 'crouch', hit: lp > kill - 0.005 }); ctx.restore(); }
      else if (sinceKill < 0.55) A.drawPoof(ctx, { x: pl.fx, y: fy, t: sinceKill - 0.04, dur: 0.5 });
    } else if (r.ev === 'shoot') {
      fy = gTop - 46 + Math.sin(lp * TAU * 2) * 4;
      var hitT = kill + 0.2 / D;
      if (lp < hitT) { ctx.save(); ctx.translate(pl.fx, fy); ctx.scale(HK, HK); A.drawShooterBee(ctx, { x: 0, y: 0, facing: -1, state: 'fly', t: cyc(lp, 28, 40) }); ctx.restore(); }
      else if ((lp - hitT) * D < 0.5) A.drawPoof(ctx, { x: pl.fx, y: fy, t: (lp - hitT) * D, dur: 0.5 });
      if (lp >= kill && lp < hitT) {
        var u = (lp - kill) / (hitT - kill), ax0 = heroX(pl, kill) + 12, ay0 = gTop - 22 * HK;
        var axx = ax0 + (pl.fx - ax0) * u, ayy = ay0 + (fy - ay0) * u;
        ctx.save(); ctx.translate(axx, ayy); ctx.scale(HK, HK); A.drawArrow(ctx, { x: 0, y: 0, angle: Math.atan2(fy - ay0, pl.fx - ax0) }); ctx.restore();
      }
    } else if (r.ev === 'throw') {
      fy = gTop - 16 * HK;
      var land = kill + 0.35 / D;
      if (lp < land) { ctx.save(); ctx.translate(pl.fx, fy); ctx.scale(HK, HK); A.drawBoar(ctx, { x: 0, y: 0, facing: -1, state: 'walk', t: cyc(lp, 12, 10) }); ctx.restore(); }
      if (lp >= kill && lp < land) {
        var ub = (lp - kill) / (land - kill), bx0 = heroX(pl, kill) + 10, by0 = gTop - 30;
        var bxx = bx0 + (pl.fx - bx0) * ub, byy = by0 + (fy - by0) * ub - 40 * Math.sin(Math.PI * ub);
        ctx.save(); ctx.translate(bxx, byy); ctx.scale(HK, HK); A.drawBomb(ctx, { x: 0, y: 0, t: 0 }); ctx.restore();
      }
      var ex = (lp - land) * D;
      if (ex >= 0 && ex < 0.4) {
        ctx.save(); ctx.translate(pl.fx, fy); ctx.scale(HK, HK); A.drawExplosion(ctx, { x: 0, y: 0, t: ex, dur: 0.4, radius: 50 }); ctx.restore();
        if (ex < 0.5) A.drawPoof(ctx, { x: pl.fx, y: fy, t: ex, dur: 0.5 });
      }
    }
    // 英雄
    var hy = gTop - 22 * HK, pose = 'run', pt = cyc(lp, 18, 10);
    if (lp >= RUN_END) { pose = 'idle'; pt = 0; }
    if (r.ev === 'slash' && lp >= kill - 0.01 && (lp - kill + 0.01) * D < 0.15) { pose = 'slash'; pt = (lp - kill + 0.01) * D; }
    if (r.ev === 'shoot' && lp >= kill - 0.02 && (lp - kill) * D < 0.12) { pose = 'shoot'; pt = 0; }
    if (r.ev === 'throw' && lp >= kill - 0.01 && (lp - kill) * D < 0.18) { pose = 'throw'; pt = 0; }
    if (pl.gap) {
      var ja = pl.gap.a - 30, jb = pl.gap.b + 30;
      if (hx > ja && hx < jb) { var ju = (hx - ja) / (jb - ja); hy -= 34 * Math.sin(Math.PI * ju); pose = ju < 0.5 ? 'rise' : 'fall'; }
    }
    var ha = 1;
    if (lp > 0.92) ha = 1 - (lp - 0.92) / 0.08;
    else if (lp < 0.05) ha = lp / 0.05;
    ctx.save(); ctx.globalAlpha *= clamp(ha, 0, 1);
    hero(ctx, r.cls, hx, hy, HK, pose, pt, 1);
    ctx.restore();
    // 重演起點的淡白閃(告訴玩家「這一趟又從頭開始」)
    if (lp < 0.06) { ctx.fillStyle = 'rgba(255,255,255,' + (0.18 * (1 - lp / 0.06)).toFixed(3) + ')'; ctx.fillRect(0, 0, r.w, r.h); }
    ctx.restore();
    // 外框: 到旗那一刻轉金
    var flash = (lp >= RUN_END && lp < RUN_END + 0.12) ? 1 - (lp - RUN_END) / 0.12 : 0;
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.lineWidth = 5; ctx.strokeStyle = '#161220'; ctx.stroke();
    if (flash > 0) {
      ctx.shadowColor = PAL.gold; ctx.shadowBlur = 16 * flash;
      rr(ctx, r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 9); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(242,201,76,' + flash.toFixed(3) + ')'; ctx.stroke();
    } else {
      rr(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 8); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 素材沿石階送進王城 ----------
  function pathAt(pts, u) {
    var L = 0, seg = [], i;
    for (i = 0; i < pts.length - 1; i++) { var l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); L += l; }
    var d = clamp(u, 0, 1) * L;
    for (i = 0; i < seg.length; i++) {
      if (d <= seg[i] || i === seg.length - 1) { var k = seg[i] > 0 ? clamp(d / seg[i], 0, 1) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
      d -= seg[i];
    }
    return pts[pts.length - 1];
  }
  // 素材抵達王城後 0.35 秒內的光量(0~1), 王城外光與門窗亮度跟著它
  function arrivalGlow(p) {
    var g = 0;
    for (var i = 0; i < ROOMS.length; i++) {
      var lp = fr(p + ROOMS[i].off);
      for (var j = 0; j < ROOMS[i].mats.length; j++) {
        var age = fr(lp - (EMIT + j * 0.035)) * D;
        if (age >= FLY && age < FLY + 0.35) g = Math.max(g, 1 - (age - FLY) / 0.35);
      }
    }
    return g;
  }
  function tokens(ctx, p) {
    for (var i = 0; i < ROOMS.length; i++) {
      var r = ROOMS[i], pl = roomPlan(r), e = roomExit(r, pl), lp = fr(p + r.off);
      var pts = [[e.x, e.y - 18], [SHAFT_X, e.y - 18], [SHAFT_X, SHAFT_TOP - 4]];
      for (var j = 0; j < r.mats.length; j++) {
        var age = fr(lp - (EMIT + j * 0.035)) * D;
        if (age < FLY) {
          var u = age / FLY, q = pathAt(pts, u * u * (3 - 2 * u) * 0.25 + u * 0.75);
          var hop = age < 0.25 ? -18 * Math.sin(Math.PI * age / 0.25) : 0;
          var k = r.mats[j];
          for (var tr = 3; tr >= 1; tr--) {
            var qq = pathAt(pts, Math.max(0, u - tr * 0.025));
            ctx.globalAlpha = 0.45 - tr * 0.11; circle(ctx, qq[0], qq[1], 6 - tr * 1.2); ctx.fillStyle = PAL[k]; ctx.fill();
          }
          ctx.globalAlpha = 1;
          matIcon(ctx, k, q[0], q[1] + hop, 18);
        } else if (age < FLY + 0.35) {
          var a2 = (age - FLY) / 0.35;
          ctx.save(); ctx.globalAlpha = 1 - a2;
          star(ctx, SHAFT_X + (j - 1) * 14, SHAFT_TOP - 10 - a2 * 22, 6 + a2 * 6, 4); ctx.fillStyle = '#fff3b0'; ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  function draw(ctx, t) {
    var p = fr((Number(t) || 0) / D);
    ctx.save();
    sky(ctx, p);
    mountain(ctx);
    sealedRoom(ctx, 300, 604, 116, 52);
    sealedRoom(ctx, 864, 604, 116, 52);
    roads(ctx, p);
    for (var i = 0; i < ROOMS.length; i++) room(ctx, ROOMS[i], p);
    // 王城光暈 + 王城(先算素材抵達的光, 再畫城, 最後畫飛行素材在最上層)
    var glow = arrivalGlow(p);
    var base = 0.3 + 0.08 * Math.sin(p * TAU * 2);
    var hg = ctx.createRadialGradient(640, 140, 10, 640, 140, 150);
    hg.addColorStop(0, 'rgba(255,214,90,' + (base + 0.4 * glow).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = hg; ctx.fillRect(480, 0, 320, 300);
    castle(ctx, 640, 157, 1.5, clamp(0.25 + glow, 0, 1));
    tokens(ctx, p);
    // 底部暗帶 + 開始提示
    var bg = ctx.createLinearGradient(0, 610, 0, H);
    bg.addColorStop(0, 'rgba(10,12,20,0)'); bg.addColorStop(0.45, 'rgba(10,12,20,0.78)'); bg.addColorStop(1, 'rgba(10,12,20,0.92)');
    ctx.fillStyle = bg; ctx.fillRect(0, 610, W, H - 610);
    prompt(ctx, p, 680);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'title', id: 'A', kind: 'anim',
    size: [1280, 720],
    duration: 4,
    loop: true,
    draw: draw
  };
})();
