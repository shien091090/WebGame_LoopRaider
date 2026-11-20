/* 開始畫面 方案 C — 橫向奔跑長卷
 * 三位職業排成一列往右狂奔, 地面是一段段不同主題的小關卡串成的長路(草原 → 岩谷 → 高處 → 沼澤, 每 320px 一關),
 * 每關入口立一座關門。三人各用自己的招式清掉路上的怪(劍士揮砍、炸彈工投彈、獵人射箭), 衝過關門那一刻關旗轉綠、
 * 噴出一把素材; 過了的關門被甩到身後仍每 0.5 秒再吐一顆素材, 全部沿弧線飛向遠方山頂的王城。
 * 鏡頭跟著跑(視差捲動), 節奏是每秒過一關的速度感。
 * 循環 4 秒(剛好跑完 4 關 = 1280px, 首尾相接); 所有週期性動態由 t 推出、週期取 4 秒的因數。
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
  function mod(a, n) { return ((a % n) + n) % n; }
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
  function cyc(p, coef, n) { return p * TAU * n / coef; }

  // ---------- 場景資料 ----------
  var V = 320, SEG = 320, GY = 520, LEAD = 600, HK = 1.8;
  var CASTLE = [1134, 178];
  var TH = ['plain', 'rock', 'sky', 'swamp'];
  var SEG_MATS = { plain: ['wood', 'wood', 'soul'], rock: ['stone', 'stone', 'soul'], sky: ['time', 'time', 'wood'], swamp: ['wood', 'soul', 'stone'] };
  var SEG_ITEMS = { plain: ['wood', 'wood'], rock: ['stone', 'wood'], sky: ['time', 'time'], swamp: ['wood', 'stone'] };
  // 每關一隻怪, 由擅長的職業清掉
  var SEG_FOE = { plain: 'frog', rock: 'shield', sky: 'bee', swamp: 'boar' };
  var SEG_KILL = { plain: 'slash', rock: 'bomb', sky: 'arrow', swamp: 'slash' };
  var TRIG = { slash: 655, bomb: 900, arrow: 820 }; // 怪物畫面 x 到這裡時出招
  var HEROES = [
    { cls: 'bomber', x: 440 },
    { cls: 'hunter', x: 520 },
    { cls: 'sword', x: LEAD }
  ];
  var FLYC = 1.1;
  function theme(k) { return TH[mod(k, 4)]; }

  // ---------- 背景(視差: 遠山 1/4 速、近丘 1/2 速、雲 1/2 速; 每層一圈位移剛好是自己花紋週期的整數倍) ----------
  function backdrop(ctx, p) {
    var g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, '#141c34'); g.addColorStop(0.7, '#2c3a62'); g.addColorStop(1, '#4a5a86');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY + 2);
    var dg = ctx.createRadialGradient(CASTLE[0], CASTLE[1] + 60, 20, CASTLE[0], CASTLE[1] + 60, 420);
    dg.addColorStop(0, 'rgba(255,190,110,0.35)'); dg.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = dg; ctx.fillRect(700, 0, 580, GY);
    for (var i = 0; i < 46; i++) {
      var tw = 0.5 + 0.5 * Math.sin(p * TAU * (1 + (i % 3)) + i * 1.9);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.25 * tw).toFixed(3) + ')';
      circle(ctx, hash(i, 7) * W, 10 + hash(i, 8) * 260, 0.8 + hash(i, 9)); ctx.fill();
    }
    // 雲(週期 640, 一圈移 640)
    var co = p * 640;
    ctx.fillStyle = 'rgba(200,215,240,0.12)';
    for (var c = -1; c < 3; c++) {
      var cx = c * 640 + 180 - co, cx2 = c * 640 + 500 - co;
      ell(ctx, cx, 120, 70, 16); ctx.fill(); ell(ctx, cx + 40, 108, 40, 14); ctx.fill();
      ell(ctx, cx2, 210, 54, 12); ctx.fill(); ell(ctx, cx2 - 30, 200, 30, 10); ctx.fill();
    }
    // 遠方王城所在的山(固定不動 = 最遠的地標)
    ctx.fillStyle = '#232b46';
    poly(ctx, [960, GY, 1010, 300, 1060, 232, 1206, 232, 1250, 300, 1290, GY]); ctx.fill();
    ctx.fillStyle = '#2d3756'; ctx.fillRect(1060, 228, 146, 6);
    // 遠山(週期 320, 一圈移 320)
    var fo = p * 320;
    ctx.fillStyle = '#26304e';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (var x = 0; x <= W; x += 16) { var u = x + fo; ctx.lineTo(x, 390 + 26 * Math.sin(u * TAU / 320) + 14 * Math.sin(u * TAU / 160 + 1)); }
    ctx.lineTo(W, GY); ctx.closePath(); ctx.fill();
    // 近丘(週期 640, 一圈移 640)
    var mo = p * 640;
    ctx.fillStyle = '#2e3a58';
    ctx.beginPath(); ctx.moveTo(0, GY);
    for (x = 0; x <= W; x += 16) { u = x + mo; ctx.lineTo(x, 456 + 20 * Math.sin(u * TAU / 640) + 9 * Math.sin(u * TAU / 320 + 2)); }
    ctx.lineTo(W, GY); ctx.closePath(); ctx.fill();
  }

  // ---------- 前景(以 1 倍速捲動, 世界座標 - scroll) ----------
  function prop(ctx, th, x) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = '#141018';
    if (th === 'plain') {
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 5, GY - 50, 10, 50); ctx.strokeRect(x - 5, GY - 50, 10, 50);
      circle(ctx, x, GY - 70, 30); ctx.fillStyle = '#3f8f4a'; ctx.fill(); ctx.stroke();
      circle(ctx, x - 10, GY - 80, 12); ctx.fillStyle = '#5bb563'; ctx.fill();
    } else if (th === 'rock') {
      poly(ctx, [x - 22, GY, x - 18, GY - 70, x - 4, GY - 96, x + 14, GY - 80, x + 22, GY]); ctx.fillStyle = '#8d502c'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6e3a1e'; ctx.beginPath(); ctx.moveTo(x - 14, GY - 30); ctx.lineTo(x + 16, GY - 40); ctx.moveTo(x - 14, GY - 60); ctx.lineTo(x + 12, GY - 66); ctx.stroke();
    } else if (th === 'sky') {
      ctx.fillStyle = '#d8dfe8'; ctx.fillRect(x - 3, GY - 110, 6, 110); ctx.strokeRect(x - 3, GY - 110, 6, 110);
      poly(ctx, [x + 3, GY - 108, x + 40, GY - 100, x + 3, GY - 90]); ctx.fillStyle = '#43d3ff'; ctx.fill(); ctx.stroke();
      ell(ctx, x - 20, GY - 8, 26, 10); ctx.fillStyle = 'rgba(227,234,242,0.6)'; ctx.fill();
    } else {
      ctx.strokeStyle = '#6c8a30'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (var i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 16 + i * 8, GY); ctx.quadraticCurveTo(x - 18 + i * 9, GY - 30, x - 22 + i * 11, GY - 50 - (i % 2) * 14); ctx.stroke(); }
      ell(ctx, x - 6, GY - 54, 3, 8); ctx.fillStyle = '#5a3a22'; ctx.fill();
    }
    ctx.restore();
  }
  function gate(ctx, gx, th, cleared, p, k) {
    var T = (A.themes && A.themes[th]) || { top: '#cccccc', inner: '#666666' };
    ctx.save(); ctx.lineJoin = 'round';
    if (cleared) {
      var hg = ctx.createRadialGradient(gx, GY - 90, 10, gx, GY - 90, 110);
      hg.addColorStop(0, 'rgba(60,207,110,0.28)'); hg.addColorStop(1, 'rgba(60,207,110,0)');
      ctx.fillStyle = hg; ctx.fillRect(gx - 110, GY - 200, 220, 200);
    }
    ctx.lineWidth = 3; ctx.strokeStyle = '#141018';
    // 兩柱 + 拱樑(用主題的內部色與頂色, 看得出這是哪一種主題的關卡入口)
    rr(ctx, gx - 52, GY - 136, 16, 136, 3); ctx.fillStyle = T.inner; ctx.fill(); ctx.stroke();
    rr(ctx, gx + 36, GY - 136, 16, 136, 3); ctx.fillStyle = T.inner; ctx.fill(); ctx.stroke();
    rr(ctx, gx - 60, GY - 150, 120, 18, 5); ctx.fillStyle = T.top; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(gx - 58, GY - 134, 116, 3);
    flag(ctx, gx + 6, GY - 186, 0.75, cleared, Math.sin(p * TAU * 4 + k) * 2);
    ctx.restore();
  }
  function ground(ctx, scroll) {
    var s0 = Math.floor((scroll - 40) / 40);
    for (var i = s0; i < s0 + 36; i++) {
      var wx = i * 40 + 20, sx = wx - scroll;
      if (sx < -20 || sx > W + 20) continue;
      var th = theme(Math.floor(i / 8));
      A.drawGround(ctx, { x: sx, y: GY + 20, top: true, theme: th });
      for (var r = 1; r < 5; r++) A.drawGround(ctx, { x: sx, y: GY + 20 + r * 40, top: false, theme: th });
    }
  }
  function foeAt(ctx, kind, x, y, tt, hit) {
    ctx.save(); ctx.translate(x, y); ctx.scale(HK, HK);
    var st = { x: 0, y: 0, facing: -1, hit: hit, t: tt };
    if (kind === 'frog') { st.state = 'crouch'; A.drawFrog(ctx, st); }
    else if (kind === 'shield') { st.state = 'walk'; st.t = cyc(tt / D, 8, 6); A.drawShieldman(ctx, st); }
    else if (kind === 'bee') { st.state = 'fly'; st.t = cyc(tt / D, 28, 40); A.drawShooterBee(ctx, st); }
    else { st.state = 'walk'; st.t = cyc(tt / D, 12, 10); A.drawBoar(ctx, st); }
    ctx.restore();
  }
  function foeY(kind) { return kind === 'bee' ? 410 : kind === 'frog' ? GY - 14 * HK : kind === 'boar' ? GY - 16 * HK : GY - 22 * HK; }

  // 一關裡的怪物 / 招式 / 地上素材; 回傳此關需要的英雄姿勢 { cls: [pose, poseT] }
  function segment(ctx, k, scroll, tt, p, poses) {
    var th = theme(k), g = k * SEG;
    // 背景擺設
    prop(ctx, th, g + 150 - scroll); prop(ctx, th, g + 280 - scroll);
    // 地上素材
    var items = SEG_ITEMS[th];
    for (var i = 0; i < 2; i++) {
      var ix = g + 80 + i * 50 - scroll, iy = GY - 34 - i * 18;
      if (ix > LEAD + 12) matIcon(ctx, items[i], ix, iy + Math.sin(p * TAU * 3 + i + k) * 2, 22);
      else {
        var pk = (LEAD + 12 - ix) / V;
        if (pk < 0.25) { ctx.save(); ctx.globalAlpha *= 1 - pk / 0.25; star(ctx, ix, iy - pk * 60, 8 + pk * 20, 4); ctx.fillStyle = '#fff6c0'; ctx.fill(); ctx.restore(); }
      }
    }
    // 怪物
    var kind = SEG_FOE[th], how = SEG_KILL[th], fwx = g + 210, fx = fwx - scroll, fy = foeY(kind);
    if (kind === 'bee') fy += Math.sin(p * TAU * 2 + k) * 6;
    var tk = (fwx - TRIG[how]) / V; // 出招時刻(本圈秒數, 可能落在別圈)
    var dt = tt - tk;              // 出招後經過秒數
    var hitDelay = how === 'slash' ? 0.03 : how === 'arrow' ? 0.22 : 0.45;
    if (dt < hitDelay) { if (fx > -60 && fx < W + 60) foeAt(ctx, kind, fx, fy, tt, dt > hitDelay - 0.04 && dt >= 0); }
    else if (dt - hitDelay < 0.5) {
      var pd = dt - hitDelay;
      if (how === 'bomb' && pd < 0.4) A.drawExplosion(ctx, { x: fx, y: fy, t: pd, dur: 0.4, radius: 70 });
      A.drawPoof(ctx, { x: fx, y: fy, t: pd, dur: 0.5, big: true });
    }
    // 招式本身
    if (dt >= 0 && dt < hitDelay) {
      var u = dt / hitDelay, hx = fwx - V * (tk + hitDelay) - 0; // 命中時怪物所在畫面 x
      if (how === 'bomb') {
        var bx0 = 458, by0 = GY - 52;
        var bx = bx0 + (hx - bx0) * u, by = by0 + (fy - by0) * u - 150 * Math.sin(Math.PI * u);
        ctx.save(); ctx.translate(bx, by); ctx.scale(HK, HK); A.drawBomb(ctx, { x: 0, y: 0, t: dt }); ctx.restore();
      } else if (how === 'arrow') {
        var ax0 = 545, ay0 = GY - 42;
        ctx.save(); ctx.translate(ax0 + (hx - ax0) * u, ay0 + (fy - ay0) * u); ctx.scale(HK, HK);
        A.drawArrow(ctx, { x: 0, y: 0, angle: Math.atan2(fy - ay0, hx - ax0) }); ctx.restore();
      }
    }
    var who = how === 'slash' ? 'sword' : how === 'bomb' ? 'bomber' : 'hunter';
    var pose = how === 'slash' ? 'slash' : how === 'bomb' ? 'throw' : 'shoot';
    if (dt >= -0.02 && dt < 0.22) poses[who] = [pose, Math.max(0, dt)];
  }

  // 關門過了之後噴出的素材: 衝過那刻 3 顆, 之後每 0.5 秒 1 顆(3 次); 全部飛往王城
  function emissions(k) {
    var th = theme(k), m = SEG_MATS[th], tg = (k * SEG - LEAD) / V, out = [];
    for (var j = 0; j < 3; j++) out.push({ te: tg + j * 0.05, x: LEAD + (j - 1) * 10 - j * 16, kind: m[j], spread: (j - 1) * 50 });
    for (var n = 1; n <= 3; n++) out.push({ te: tg + n * 0.5, x: LEAD - n * 160, kind: m[(n - 1) % 3], spread: 0 });
    return out;
  }
  function flights(ctx, tt, drawIt) {
    var glow = 0;
    for (var k = -2; k <= 7; k++) {
      var em = emissions(k);
      for (var e = 0; e < em.length; e++) {
        var d = tt - em[e].te;
        if (d < 0 || d >= FLYC + 0.3) continue;
        if (d >= FLYC) { glow = Math.max(glow, 1 - (d - FLYC) / 0.3); continue; }
        if (!drawIt) continue;
        var sx = em[e].x, sy = GY - 150, ex = CASTLE[0], ey = CASTLE[1] + 18;
        var mx = (sx + ex) / 2 + em[e].spread, my = Math.min(sy, ey) - 170;
        var pts = [];
        for (var tr = 3; tr >= 0; tr--) {
          var u = Math.max(0, d / FLYC - tr * 0.04), uu = u * u * (3 - 2 * u) * 0.4 + u * 0.6, v = 1 - uu;
          pts.push([v * v * sx + 2 * v * uu * mx + uu * uu * ex, v * v * sy + 2 * v * uu * my + uu * uu * ey]);
        }
        for (tr = 0; tr < 3; tr++) {
          ctx.globalAlpha = 0.12 + tr * 0.1; circle(ctx, pts[tr][0], pts[tr][1], 3 + tr * 1.4); ctx.fillStyle = PAL[em[e].kind]; ctx.fill();
        }
        ctx.globalAlpha = 1;
        var pop = d < 0.15 ? 0.6 + 0.4 * (d / 0.15) : 1;
        matIcon(ctx, em[e].kind, pts[3][0], pts[3][1], 22 * pop);
      }
    }
    return glow;
  }

  function draw(ctx, t) {
    var p = fr((Number(t) || 0) / D), tt = p * D, scroll = tt * V;
    ctx.save();
    backdrop(ctx, p);
    // 王城(遠景固定) + 素材抵達光
    var glow = flights(ctx, tt, false);
    var cg = ctx.createRadialGradient(CASTLE[0], CASTLE[1], 10, CASTLE[0], CASTLE[1], 130);
    cg.addColorStop(0, 'rgba(255,214,90,' + (0.22 + 0.4 * glow).toFixed(3) + ')'); cg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = cg; ctx.fillRect(CASTLE[0] - 130, CASTLE[1] - 130, 260, 260);
    castle(ctx, CASTLE[0], CASTLE[1], 1.25, clamp(0.2 + glow, 0, 1));
    // 關門(在英雄後面)
    for (var k = -1; k <= 8; k++) {
      var gx = k * SEG - scroll;
      if (gx < -80 || gx > W + 80) continue;
      gate(ctx, gx, theme(k), gx < LEAD, p, k);
    }
    // 各關內容 + 決定英雄姿勢
    var poses = {};
    for (k = -1; k <= 8; k++) {
      var g0 = k * SEG - scroll;
      if (g0 > W + 400 || g0 < -SEG - 400) continue;
      segment(ctx, k, scroll, tt, p, poses);
    }
    ground(ctx, scroll);
    // 英雄: 跑步(一圈 12 步週期), 輕微上下彈
    for (var i = 0; i < HEROES.length; i++) {
      var h = HEROES[i], ps = poses[h.cls], pose = ps ? ps[0] : 'run', pt = ps ? ps[1] : cyc(p, 18, 12);
      var bob = -Math.abs(Math.sin(p * TAU * 12 + i * 0.9)) * 4;
      ell(ctx, h.x, GY + 1, 22, 5); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      // 腳後揚塵(跟著步伐)
      var dp = fr(p * 12 + i * 0.3);
      ctx.save(); ctx.globalAlpha = 0.5 * (1 - dp);
      circle(ctx, h.x - 22 - dp * 30, GY - 6 - dp * 6, 4 + dp * 5); ctx.fillStyle = '#d8dce4'; ctx.fill();
      ctx.restore();
      hero(ctx, h.cls, h.x, GY - 22 * HK + bob, HK, pose, pt, 1);
    }
    // 飛行素材(最上層)
    flights(ctx, tt, true);
    // 底部暗帶 + 開始提示
    var bg = ctx.createLinearGradient(0, 620, 0, H);
    bg.addColorStop(0, 'rgba(10,12,20,0)'); bg.addColorStop(0.4, 'rgba(10,12,20,0.75)'); bg.addColorStop(1, 'rgba(10,12,20,0.9)');
    ctx.fillStyle = bg; ctx.fillRect(0, 620, W, H - 620);
    prompt(ctx, p, 684);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'title', id: 'C', kind: 'anim',
    size: [1280, 720],
    duration: 4,
    loop: true,
    draw: draw
  };
})();
