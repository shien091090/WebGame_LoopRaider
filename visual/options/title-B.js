/* 開始畫面 方案 B — 關卡之輪
 * 三位職業放大站在畫面正中的浮島上; 背後一圈金色環道串起 7 枚圓形關卡窗(頂端是王城), 每枚窗裡的小角色不停重跑。
 * 一顆光點沿環道每 4 秒繞一圈: 掃過哪一關, 那一關就亮起、噴出 3 顆素材落進三人腳前的素材堆, 三人輪流出招回應;
 * 繞回王城時王城發光, 下一圈開始。構圖是放射對稱、以角色為主, 節奏是每 0.5 秒一拍。
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
  function hero(ctx, cls, x, y, k, pose, poseT, facing) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    A.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: facing, pose: pose, poseT: poseT, invuln: false });
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
  function cyc(lp, coef, n) { return lp * TAU * n / coef; }

  // ---------- 場景資料 ----------
  var CX = 640, CY = 330, R = 248, WR = 52, N = 8;
  var THEME_BG = {
    plain: ['#4c78a8', '#2c4a70'], sky: ['#6c8cc0', '#3e5684'], rock: ['#7a5040', '#4a2c24'],
    swamp: ['#3c5a4a', '#22342c'], lair: ['#4a2a5a', '#24142e'], throne: ['#5a4a8a', '#2e2550']
  };
  // 第 0 格是王城; 第 7 格是還沒開的關(灰、上鎖, 光點掃過不會亮)
  var SLOTS = [
    null,
    { th: 'plain', cls: 'sword', item: 'wood', mats: ['wood', 'wood', 'soul'] },
    { th: 'sky', cls: 'hunter', item: 'time', mats: ['time', 'time', 'soul'] },
    { th: 'rock', cls: 'bomber', item: 'stone', mats: ['stone', 'stone', 'soul'] },
    { th: 'swamp', cls: 'sword', item: 'wood', mats: ['wood', 'soul', 'stone'] },
    { th: 'lair', cls: 'hunter', item: 'stone', mats: ['soul', 'soul', 'stone'] },
    { th: 'throne', cls: 'bomber', item: 'time', mats: ['time', 'wood', 'stone'] },
    { sealed: true }
  ];
  var FLY = 0.85;
  var HERO_K = 3, FEET_Y = 446;
  var HEROES = [
    { cls: 'hunter', x: 566, f: -1, act: 'shoot' },
    { cls: 'sword', x: 640, f: 1, act: 'slash' },
    { cls: 'bomber', x: 714, f: 1, act: 'throw' }
  ];
  function slotPos(i) { var a = -Math.PI / 2 + i * TAU / N; return [CX + Math.cos(a) * R, CY + Math.sin(a) * R]; }
  function sinceBeat(p, i) { return fr(p - i / N) * D; } // 光點掃過第 i 格後經過的秒數
  function heapPos(j) { return [CX + (j - 1) * 36, 468]; }

  // ---------- 背景 ----------
  function backdrop(ctx, p) {
    var g = ctx.createRadialGradient(CX, CY, 40, CX, CY, 760);
    g.addColorStop(0, '#2c3a62'); g.addColorStop(0.55, '#18203a'); g.addColorStop(1, '#0c1020');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 放射光: 12 道, 一圈剛好轉一道的間距, 首尾相接
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(p * TAU / 12);
    ctx.fillStyle = 'rgba(255,230,160,0.035)';
    for (var i = 0; i < 12; i++) {
      var a = i * TAU / 12;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a - 0.07) * 900, Math.sin(a - 0.07) * 900); ctx.lineTo(Math.cos(a + 0.07) * 900, Math.sin(a + 0.07) * 900);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    for (i = 0; i < 70; i++) {
      var tw = 0.5 + 0.5 * Math.sin(p * TAU * (1 + (i % 3)) + i * 2.3);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.25 * tw).toFixed(3) + ')';
      circle(ctx, hash(i, 4) * W, hash(i, 5) * H, 0.8 + hash(i, 6) * 1.2); ctx.fill();
    }
  }

  // ---------- 環道與光點 ----------
  function track(ctx, p) {
    ctx.save();
    circle(ctx, CX, CY, R); ctx.lineWidth = 30; ctx.strokeStyle = '#161220'; ctx.stroke();
    circle(ctx, CX, CY, R); ctx.lineWidth = 24; ctx.strokeStyle = '#2c2438'; ctx.stroke();
    // 順時針流動的金色虛線(一圈剛好位移 20 個花紋週期)
    ctx.beginPath(); ctx.arc(CX, CY, R, -Math.PI / 2, -Math.PI / 2 + TAU);
    ctx.setLineDash([10, 18]); ctx.lineDashOffset = -p * 28 * 20;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(242,201,76,0.45)'; ctx.stroke();
    ctx.setLineDash([]);
    // 光點尾巴
    var ac = -Math.PI / 2 + p * TAU, segs = 16, span = 1.1;
    ctx.lineCap = 'butt';
    for (var i = 0; i < segs; i++) {
      var a0 = ac - span * (1 - i / segs), a1 = ac - span * (1 - (i + 1) / segs);
      ctx.beginPath(); ctx.arc(CX, CY, R, a0, a1);
      ctx.lineWidth = 6 + 10 * (i / segs);
      ctx.strokeStyle = 'rgba(255,214,90,' + (0.06 + 0.5 * (i / segs)).toFixed(3) + ')';
      ctx.stroke();
    }
    var hx = CX + Math.cos(ac) * R, hy = CY + Math.sin(ac) * R;
    var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 30);
    hg.addColorStop(0, 'rgba(255,248,210,0.95)'); hg.addColorStop(0.35, 'rgba(255,214,90,0.6)'); hg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = hg; circle(ctx, hx, hy, 30); ctx.fill();
    circle(ctx, hx, hy, 8); ctx.fillStyle = '#fffbe8'; ctx.fill();
    ctx.restore();
  }

  // ---------- 關卡窗 ----------
  function windowSlot(ctx, i, p) {
    var s = SLOTS[i], pos = slotPos(i), d = sinceBeat(p, i);
    var ping = s.sealed ? 0 : (d < 0.5 ? 1 - d / 0.5 : 0);
    var bump = 1 + 0.12 * Math.sin(Math.PI * clamp(d / 0.3, 0, 1)) * (s.sealed ? 0 : 1);
    ctx.save();
    ctx.translate(pos[0], pos[1]); ctx.scale(bump, bump);
    if (ping > 0) {
      var gg = ctx.createRadialGradient(0, 0, WR, 0, 0, WR + 34);
      gg.addColorStop(0, 'rgba(255,214,90,' + (0.55 * ping).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = gg; circle(ctx, 0, 0, WR + 34); ctx.fill();
    }
    circle(ctx, 0, 0, WR + 5); ctx.fillStyle = '#161220'; ctx.fill();
    ctx.save(); circle(ctx, 0, 0, WR); ctx.clip();
    if (s.sealed) {
      ctx.fillStyle = '#5f6474'; ctx.fillRect(-WR, -WR, WR * 2, WR * 2);
      ctx.fillStyle = 'rgba(201,205,214,0.35)';
      for (var f = 0; f < 5; f++) { ell(ctx, -40 + f * 20, -10 + (f % 2) * 22, 26, 14); ctx.fill(); }
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, -6, 10, Math.PI, 0); ctx.lineWidth = 5; ctx.strokeStyle = '#2a2d36'; ctx.stroke();
      rr(ctx, -15, -6, 30, 22, 4); ctx.fillStyle = '#2a2d36'; ctx.fill();
      ctx.restore();
      return;
    }
    var bg = THEME_BG[s.th], g = ctx.createLinearGradient(0, -WR, 0, WR);
    g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fillRect(-WR, -WR, WR * 2, WR * 2);
    // 地面
    var T = 22, sc = T / 40, gy = 16;
    ctx.save(); ctx.scale(sc, sc);
    for (var c = -3; c <= 2; c++) {
      var tx = c * T + T / 2;
      A.drawGround(ctx, { x: tx / sc, y: (gy + T / 2) / sc, top: true, theme: s.th });
      A.drawGround(ctx, { x: tx / sc, y: (gy + T * 1.5) / sc, top: false, theme: s.th });
    }
    ctx.restore();
    // 小角色: 一圈橫越兩趟(每趟就是一次重演), 地上素材被撿走後下一趟又在
    var lp = fr(p + i * 0.13), lp2 = fr(lp * 2);
    var hk = 0.62, hx = -WR - 14 + (WR * 2 + 28) * lp2;
    var ix = 8;
    if (hx < ix - 4) matIcon(ctx, s.item, ix, gy - 13 + Math.sin(lp * TAU * 3) * 1.5, 14);
    else if (hx - ix < 22) {
      var sp = (hx - ix + 4) / 26;
      ctx.save(); ctx.globalAlpha *= 1 - sp; star(ctx, ix, gy - 16 - sp * 14, 4 + sp * 6, 4); ctx.fillStyle = '#fff6c0'; ctx.fill(); ctx.restore();
    }
    hero(ctx, s.cls, hx, gy - 22 * hk, hk, 'run', cyc(lp, 18, 10), 1);
    if (ping > 0) { ctx.fillStyle = 'rgba(255,240,180,' + (0.3 * ping).toFixed(3) + ')'; ctx.fillRect(-WR, -WR, WR * 2, WR * 2); }
    ctx.restore();
    // 框: 平時是主題頂色, 被掃到時轉金
    circle(ctx, 0, 0, WR - 1.5); ctx.lineWidth = 3;
    ctx.strokeStyle = ping > 0 ? 'rgba(255,214,90,' + (0.5 + 0.5 * ping).toFixed(3) + ')' : ((A.themes && A.themes[s.th]) ? A.themes[s.th].top : '#cccccc');
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 中央: 浮島、素材堆、三職業 ----------
  function island(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(CX - 124, FEET_Y);
    ctx.quadraticCurveTo(CX - 90, FEET_Y + 52, CX, FEET_Y + 68);
    ctx.quadraticCurveTo(CX + 90, FEET_Y + 52, CX + 124, FEET_Y);
    ctx.closePath();
    var g = ctx.createLinearGradient(0, FEET_Y, 0, FEET_Y + 68);
    g.addColorStop(0, '#6b4a34'); g.addColorStop(1, '#2e1f18');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#161008'; ctx.stroke();
    ell(ctx, CX, FEET_Y, 124, 14); ctx.fillStyle = '#63c35a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#161008'; ctx.stroke();
    ell(ctx, CX, FEET_Y - 3, 116, 8); ctx.fillStyle = '#9be38f'; ctx.fill();
    ctx.restore();
  }
  var HEAP = [
    ['wood', -54, 0], ['stone', -27, 2], ['time', 0, 3], ['soul', 27, 2], ['wood', 54, 0],
    ['stone', -40, -14], ['soul', -13, -12], ['wood', 13, -12], ['time', 40, -14],
    ['time', -26, -26], ['stone', 0, -25], ['soul', 26, -26]
  ];
  function heap(ctx, p) {
    var land = 0;
    for (var i = 1; i < N; i++) { if (SLOTS[i].sealed) continue; var d = sinceBeat(p, i); if (d >= FLY && d < FLY + 0.25) land = Math.max(land, 1 - (d - FLY) / 0.25); }
    var sq = 1 + 0.06 * land;
    ctx.save(); ctx.translate(CX, 488); ctx.scale(sq, 1 / sq);
    var hg = ctx.createRadialGradient(0, -12, 4, 0, -12, 90);
    hg.addColorStop(0, 'rgba(255,214,90,' + (0.22 + 0.3 * land).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = hg; ctx.fillRect(-90, -100, 180, 140);
    for (var k = 0; k < HEAP.length; k++) matIcon(ctx, HEAP[k][0], HEAP[k][1], HEAP[k][2], 24);
    ctx.restore();
  }
  function heroes(ctx, p) {
    var beat = Math.floor(fr(p) * N), d = fr(p * N) * D / N; // 目前拍號與拍內秒數
    for (var i = 0; i < HEROES.length; i++) {
      var h = HEROES[i], pose = 'idle', pt = 0;
      // 第 1~6 拍(對應 6 個開放的關卡)三人輪流出招; 第 0 拍(王城)與第 7 拍(未開放)不出招
      if (beat >= 1 && beat <= 6 && (beat - 1) % 3 === [1, 0, 2][i] && d < 0.28) { pose = h.act; pt = d; }
      var bob = Math.round(Math.sin(p * TAU * 2 + i * 2.1) * 2);
      // 影子
      ell(ctx, h.x, FEET_Y + 2, 30, 6); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
      hero(ctx, h.cls, h.x, FEET_Y - 22 * HERO_K + bob, HERO_K, pose, pt, h.f);
    }
  }
  function flying(ctx, p) {
    for (var i = 1; i < N; i++) {
      var s = SLOTS[i]; if (s.sealed) continue;
      var pos = slotPos(i);
      for (var j = 0; j < 3; j++) {
        var d = sinceBeat(p, i) - j * 0.06;
        if (d < 0 || d >= FLY) continue;
        var u = d / FLY, tg = heapPos(j);
        var mx = (pos[0] + tg[0]) / 2 + (j - 1) * 40, my = Math.min(pos[1], tg[1]) - 120;
        var pts = [];
        for (var tr = 3; tr >= 0; tr--) {
          var uu = Math.max(0, u - tr * 0.05), v = 1 - uu;
          pts.push([v * v * pos[0] + 2 * v * uu * mx + uu * uu * tg[0], v * v * pos[1] + 2 * v * uu * my + uu * uu * tg[1]]);
        }
        for (tr = 0; tr < 3; tr++) {
          ctx.globalAlpha = 0.12 + tr * 0.1; circle(ctx, pts[tr][0], pts[tr][1], 3 + tr * 1.3); ctx.fillStyle = PAL[s.mats[j]]; ctx.fill();
        }
        ctx.globalAlpha = 1;
        matIcon(ctx, s.mats[j], pts[3][0], pts[3][1], 22);
      }
    }
  }

  function draw(ctx, t) {
    var p = fr((Number(t) || 0) / D);
    ctx.save();
    backdrop(ctx, p);
    track(ctx, p);
    for (var i = 1; i < N; i++) windowSlot(ctx, i, p);
    // 王城(第 0 格): 光點回到這裡時發光
    var d0 = sinceBeat(p, 0), cg = d0 < 0.7 ? 1 - d0 / 0.7 : 0;
    var top = slotPos(0);
    var hg = ctx.createRadialGradient(top[0], top[1] - 16, 8, top[0], top[1] - 16, 110);
    hg.addColorStop(0, 'rgba(255,214,90,' + (0.25 + 0.45 * cg).toFixed(3) + ')'); hg.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = hg; ctx.fillRect(top[0] - 110, top[1] - 126, 220, 220);
    castle(ctx, top[0], top[1] - 16, 1.15, clamp(0.2 + cg, 0, 1));
    island(ctx);
    heap(ctx, p);
    heroes(ctx, p);
    flying(ctx, p);
    prompt(ctx, p, 682);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'title', id: 'B', kind: 'anim',
    size: [1280, 720],
    duration: 4,
    loop: true,
    draw: draw
  };
})();
