/* boss-stage 方案 C — 鹽原斷門
 * 黃昏的白色鹽原, 天空由深紫漸到桃粉; 遠景兩根斷裂的巨門石柱, 巨像就懸在門的缺口中「守門」。
 * 構圖: 低地平線、開闊橫向。全寬一整片鹽殼地面, 兩側倒下的柱鼓當矮台, 中央一條倒塌的門楣橫跨成「屋頂」:
 * 門楣下方是躲碎岩與光束的掩蔽, 門楣上的兩塊柱頭是靠近巨像的高位; 巨拳砸在兩端開闊地。
 * 依賴: 方案頁先載入的 window.Art(玩家、箭、炸彈、資訊列、關卡卡片)。只用 Canvas 2D。
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;

  // ---------- 共用小工具 ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  // ---------- 守門巨像(final-boss 方案 B, 第一階段)----------
  var SS = { base: '#d4ab72', light: '#f0d4a2', shade: '#a27a49', deep: '#5e4428', line: '#160c12', glyph: '#5fe0d0', eye: '#ffcf4a', hot: '#fff6d8', danger: '#ff4a3d' };
  function sand(ctx, y0, y1) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, SS.light); g.addColorStop(0.35, SS.base); g.addColorStop(1, SS.shade); return g;
  }
  // 分離巨拳(指節朝下), side: -1 左拳 / +1 右拳(拇指朝中線)
  function fist(ctx, fx, fy, side) {
    ctx.save(); ctx.translate(fx, fy);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    rr(ctx, -34, -50, 68, 12, 5); ctx.fillStyle = SS.shade; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(95,224,208,0.75)'; ctx.fillRect(-26, -37, 52, 4);
    var tx = side < 0 ? 40 : -58;
    rr(ctx, tx, -18, 18, 34, 7); ctx.fillStyle = sand(ctx, -18, 16); ctx.fill(); ctx.stroke();
    rr(ctx, -46, -32, 92, 52, 14); ctx.fillStyle = sand(ctx, -32, 20); ctx.fill(); ctx.stroke();
    for (var i = 0; i < 4; i++) { rr(ctx, -44 + i * 22, 12, 20, 30, 6); ctx.fillStyle = sand(ctx, 12, 42); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-38, -14); ctx.lineTo(38, -14); ctx.moveTo(-38, 2); ctx.lineTo(38, 2); ctx.stroke();
    poly(ctx, [0, -26, 7, -19, 0, -12, -7, -19]); ctx.fillStyle = SS.glyph; ctx.fill();
    ctx.restore();
  }
  // 本體: cx 中線, T 頭頂; eye: 'idle' | 'charge' | 'fire'
  function colossus(ctx, cx, T, eye) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var g = ctx.createRadialGradient(cx, T + 100, 20, cx, T + 100, 250);
    g.addColorStop(0, 'rgba(255,207,74,0.16)'); g.addColorStop(1, 'rgba(255,207,74,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 260, T - 40, 520, 330);
    // 懸浮碎片
    for (var k = -1; k <= 1; k++) {
      var sx = cx + k * 40, sy = T + 214 + Math.abs(k) * -8;
      poly(ctx, [sx - 9, sy, sx, sy - 8, sx + 9, sy, sx, sy + 10]); ctx.fillStyle = SS.shade; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = SS.line; ctx.stroke();
    }
    ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    // 龍骨下身
    poly(ctx, [cx - 92, T + 150, cx + 92, T + 150, cx + 34, T + 180, cx, T + 196, cx - 34, T + 180]);
    ctx.fillStyle = SS.shade; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(95,224,208,0.7)'; poly(ctx, [cx, T + 160, cx + 8, T + 172, cx, T + 186, cx - 8, T + 172]); ctx.fill();
    // 肩甲
    for (var s = -1; s <= 1; s += 2) {
      var px = cx + s * 152;
      ctx.fillStyle = 'rgba(95,224,208,0.6)'; ctx.fillRect(Math.min(px - s * 48, cx + s * 104) - 2, T + 92, 8, 26);
      rr(ctx, px - 48, T + 54, 96, 86, 22); ctx.fillStyle = sand(ctx, T + 54, T + 140); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px - 40, T + 82); ctx.lineTo(px + 40, T + 82); ctx.moveTo(px - 42, T + 108); ctx.lineTo(px + 42, T + 108); ctx.stroke();
      ctx.fillStyle = SS.deep; circle(ctx, px - 28, T + 68, 4); ctx.fill(); circle(ctx, px + 28, T + 68, 4); ctx.fill();
      ctx.fillStyle = SS.glyph; ctx.fillRect(px - 20, T + 124, 40, 4);
      ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    }
    // 胸甲
    rr(ctx, cx - 104, T + 96, 208, 66, 14); ctx.fillStyle = sand(ctx, T + 96, T + 162); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
    for (var v = 0; v < 3; v++) { ctx.beginPath(); ctx.moveTo(cx - 90 + v * 10, T + 128); ctx.lineTo(cx - 90 + v * 10, T + 152); ctx.moveTo(cx + 90 - v * 10, T + 128); ctx.lineTo(cx + 90 - v * 10, T + 152); ctx.stroke(); }
    circle(ctx, cx, T + 140, 13); ctx.fillStyle = SS.deep; ctx.fill();
    circle(ctx, cx, T + 140, 8); ctx.fillStyle = SS.glyph; ctx.fill();
    // 頭
    ctx.lineWidth = 3; ctx.strokeStyle = SS.line;
    poly(ctx, [cx - 36, T + 2, cx - 26, T - 14, cx + 26, T - 14, cx + 36, T + 2]); ctx.fillStyle = SS.shade; ctx.fill(); ctx.stroke();
    poly(ctx, [cx - 78, T + 14, cx - 64, T, cx + 64, T, cx + 78, T + 14, cx + 78, T + 112, cx + 60, T + 124, cx - 60, T + 124, cx - 78, T + 112]);
    ctx.fillStyle = sand(ctx, T, T + 124); ctx.fill(); ctx.stroke();
    poly(ctx, [cx - 6, T - 10, cx, T - 4, cx + 6, T - 10, cx, T - 16]); ctx.fillStyle = SS.glyph; ctx.fill();
    poly(ctx, [cx - 70, T + 30, cx, T + 42, cx + 70, T + 30, cx + 70, T + 40, cx, T + 52, cx - 70, T + 40]); ctx.fillStyle = SS.deep; ctx.fill();
    ctx.strokeStyle = SS.shade; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 56, T + 58); ctx.lineTo(cx - 56, T + 108); ctx.moveTo(cx + 56, T + 58); ctx.lineTo(cx + 56, T + 108); ctx.stroke();
    ctx.strokeStyle = SS.deep; ctx.lineWidth = 3;
    for (var m = 0; m < 3; m++) { ctx.beginPath(); ctx.moveTo(cx - 26, T + 104 + m * 6); ctx.lineTo(cx + 26, T + 104 + m * 6); ctx.stroke(); }
    // 大眼
    var ey = T + 74;
    if (eye === 'charge' || eye === 'fire') {
      var eg = ctx.createRadialGradient(cx, ey, 6, cx, ey, eye === 'fire' ? 90 : 64);
      eg.addColorStop(0, 'rgba(255,230,140,0.85)'); eg.addColorStop(1, 'rgba(255,170,40,0)');
      ctx.fillStyle = eg; circle(ctx, cx, ey, eye === 'fire' ? 90 : 64); ctx.fill();
    }
    circle(ctx, cx, ey, 27); ctx.fillStyle = SS.deep; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = SS.line; ctx.stroke();
    circle(ctx, cx, ey, 19); ctx.fillStyle = SS.eye; ctx.fill();
    circle(ctx, cx, ey, eye === 'idle' ? 7 : 11); ctx.fillStyle = SS.hot; ctx.fill();
    if (eye === 'charge') {
      ctx.strokeStyle = 'rgba(255,214,110,0.9)'; ctx.lineWidth = 2.5;
      for (var a = 0; a < 8; a++) {
        var an = a / 8 * TAU + 0.2, r0 = 36, r1 = 56;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * r1, ey + Math.sin(an) * r1); ctx.lineTo(cx + Math.cos(an) * r0, ey + Math.sin(an) * r0); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 頭上長血條: 兩道階段刻度
  function bossBar(ctx, cx, ratio) {
    ctx.save();
    rr(ctx, cx - 222, 44, 444, 12, 4); ctx.fillStyle = 'rgba(10,8,14,0.85)'; ctx.fill();
    ctx.fillStyle = '#ff4d5e'; ctx.fillRect(cx - 219, 47, 438 * ratio, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(cx - 219, 47, 438 * ratio, 2);
    ctx.fillStyle = '#f2f4f8'; ctx.fillRect(cx - 219 + 438 / 3 - 1, 44, 2, 12); ctx.fillRect(cx - 219 + 438 * 2 / 3 - 1, 44, 2, 12);
    ctx.restore();
  }
  // 落點預告: 地面上的影 + 紅色虛線環 + 落下軌跡
  function telegraph(ctx, x, groundY, rx, fromY) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,6,20,0.45)'; ctx.beginPath(); ctx.ellipse(x, groundY + 1, rx, rx * 0.2, 0, 0, TAU); ctx.fill();
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = SS.danger;
    ctx.beginPath(); ctx.ellipse(x, groundY + 1, rx, rx * 0.2, 0, 0, TAU); ctx.stroke();
    if (fromY != null) { ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,74,61,0.45)'; ctx.beginPath(); ctx.moveTo(x, fromY); ctx.lineTo(x, groundY - 6); ctx.stroke(); }
    ctx.restore();
  }
  // 碎岩(跟 Boss 同材質)
  function rock(ctx, x, y, r, seed) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,212,162,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r - 4); ctx.lineTo(x - r * 0.4, y - r - 22); ctx.moveTo(x + r * 0.4, y - r - 6); ctx.lineTo(x + r * 0.4, y - r - 18); ctx.stroke();
    var p = [];
    for (var i = 0; i < 7; i++) { var a = i / 7 * TAU + seed, rad = r * (0.75 + hash(seed, i) * 0.35); p.push(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    poly(ctx, p); ctx.fillStyle = sand(ctx, y - r, y + r); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = SS.line; ctx.stroke();
    ctx.restore();
  }

  // ---------- 本方案場景 ----------
  var TC = { sky0: '#2a1f4e', sky1: '#5e4180', sky2: '#c47d9c', sky3: '#f4c2a2', far: '#a3789f', ruin: '#4e3a68', ruinHi: '#6b5287', top: '#fbf3ec', topHi: '#ffffff', trim: '#e3c4d2', inner: '#ad8299', mark: '#966c84', drum: '#c7a7b9', lintel: '#9a7090' };

  function tile(ctx, c, r, top, mini, kind) {
    var L = c * 40, T = r * 40;
    ctx.fillStyle = kind === 'drum' ? TC.drum : kind === 'lintel' ? TC.lintel : TC.inner;
    ctx.fillRect(L, T, 40, 40);
    if (!mini) {
      ctx.strokeStyle = TC.mark; ctx.lineWidth = 2;
      if (kind === 'drum') {
        // 柱鼓: 直向凹槽
        ctx.beginPath(); for (var i = 1; i < 4; i++) { ctx.moveTo(L + i * 10, T + 2); ctx.lineTo(L + i * 10, T + 38); } ctx.stroke();
      } else if (kind === 'lintel') {
        // 門楣: 浮雕帶
        ctx.beginPath(); ctx.moveTo(L, T + 16); ctx.lineTo(L + 40, T + 16); ctx.moveTo(L, T + 32); ctx.lineTo(L + 40, T + 32); ctx.stroke();
        poly(ctx, [L + 20, T + 19, L + 26, T + 24, L + 20, T + 29, L + 14, T + 24]); ctx.fillStyle = 'rgba(255,240,230,0.35)'; ctx.fill();
      } else {
        // 鹽殼: 六角裂紋
        ctx.beginPath(); ctx.moveTo(L + 4, T + 24); ctx.lineTo(L + 12, T + 18); ctx.lineTo(L + 24, T + 20); ctx.lineTo(L + 30, T + 30); ctx.lineTo(L + 22, T + 38);
        ctx.moveTo(L + 24, T + 20); ctx.lineTo(L + 34, T + 14); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(40,20,40,0.22)'; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 0.5, 39, 39);
    }
    if (top) {
      ctx.fillStyle = TC.top; ctx.fillRect(L, T, 40, 10);
      if (!mini) { ctx.fillStyle = TC.topHi; ctx.fillRect(L, T, 40, 2.5); }
      ctx.fillStyle = TC.trim; ctx.fillRect(L, T + 10, 40, 3);
    }
  }
  function slab(ctx, c0, c1, r0, r1, mini, kind) {
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) tile(ctx, c, r, r === r0, mini, kind);
  }
  function pair(ctx, c0, c1, r0, r1, mini, kind) { slab(ctx, c0, c1, r0, r1, mini, kind); slab(ctx, 31 - c1, 31 - c0, r0, r1, mini, kind); }

  // 遠景斷門石柱(縮圖辨識記號)
  function gatePillar(ctx, x0, x1, jag, mini) {
    ctx.save();
    ctx.fillStyle = TC.ruin;
    var p = [x0, 640, x0, jag[0]];
    var n = jag.length - 1;
    for (var i = 1; i < n; i++) p.push(x0 + (x1 - x0) * i / n, jag[i]);
    p.push(x1, jag[n], x1, 640);
    poly(ctx, p); ctx.fill();
    if (!mini) {
      ctx.strokeStyle = TC.ruinHi; ctx.lineWidth = 3;
      var top = Math.max.apply(null, jag) + 16;
      ctx.beginPath(); for (var k = 1; k < 4; k++) { var fx = x0 + (x1 - x0) * k / 4; ctx.moveTo(fx, top); ctx.lineTo(fx, 600); } ctx.stroke();
      // 柱上刻的大眼紋(呼應巨像)
      var ex = (x0 + x1) / 2, ey = top + 70;
      ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(ex, ey, 36, 20, 0, 0, TAU); ctx.stroke();
      circle(ctx, ex, ey, 9); ctx.fillStyle = TC.ruinHi; ctx.fill();
    }
    ctx.restore();
  }
  // 巨拳落點: 鹽殼上的放射狀坑(常駐地貌)
  function crater(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(150,100,130,0.45)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 56, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,70,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(x - 8, y + 13); ctx.lineTo(x - 28, y + 30); ctx.lineTo(x - 40, y + 50);
    ctx.moveTo(x + 6, y + 13); ctx.lineTo(x + 20, y + 34); ctx.moveTo(x, y + 13); ctx.lineTo(x - 2, y + 44); ctx.stroke();
    ctx.restore();
  }
  // 光束掃過留下的玻璃化鹽痕(門楣頂上)
  function glassStreak(ctx, x0, x1, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(190,240,255,0.75)'; ctx.fillRect(x0, y + 3, x1 - x0, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x0 + 20, y + 3, (x1 - x0) * 0.4, 1.5);
    ctx.restore();
  }

  function background(ctx, mini) {
    var g = ctx.createLinearGradient(0, 0, 0, 640);
    g.addColorStop(0, TC.sky0); g.addColorStop(0.38, TC.sky1); g.addColorStop(0.78, TC.sky2); g.addColorStop(1, TC.sky3);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    if (!mini) {
      for (var i = 0; i < 50; i++) {
        ctx.fillStyle = 'rgba(255,240,255,' + (0.2 + hash(i, 5) * 0.4).toFixed(2) + ')';
        circle(ctx, hash(i, 1) * 1280, 44 + hash(i, 2) * 200, 0.6 + hash(i, 3)); ctx.fill();
      }
      // 低垂的條狀雲
      ctx.fillStyle = 'rgba(255,200,200,0.18)';
      ctx.fillRect(0, 430, 1280, 6); ctx.fillRect(160, 470, 900, 4); ctx.fillRect(500, 505, 780, 5);
    }
    // 地平線遠方台地
    ctx.fillStyle = TC.far;
    ctx.beginPath(); ctx.moveTo(0, 640); ctx.lineTo(0, 600); ctx.lineTo(120, 600); ctx.lineTo(150, 584); ctx.lineTo(330, 584); ctx.lineTo(350, 604);
    ctx.lineTo(880, 606); ctx.lineTo(910, 590); ctx.lineTo(1060, 590); ctx.lineTo(1090, 602); ctx.lineTo(1280, 602); ctx.lineTo(1280, 640); ctx.closePath(); ctx.fill();
    // 斷門: 左柱較高、帶一段斷掉的門楣; 右柱斷得較低
    gatePillar(ctx, 140, 290, [128, 112, 126, 108, 120], mini);
    ctx.fillStyle = TC.ruin;
    poly(ctx, [140, 108, 470, 118, 456, 136, 478, 150, 440, 166, 290, 166]); ctx.fill();
    gatePillar(ctx, 990, 1140, [236, 214, 252, 226, 246], mini);
    if (mini) { ctx.fillStyle = TC.ruin; ctx.fillRect(140, 108, 150, 540); ctx.fillRect(990, 214, 150, 430); }
  }

  function terrain(ctx, mini) {
    // 全寬鹽殼地面
    slab(ctx, 0, 31, 16, 17, mini, 'salt');
    // 倒下的柱鼓(矮台)
    pair(ctx, 5, 8, 14, 15, mini, 'drum');
    // 踏石
    pair(ctx, 9, 10, 12, 12, mini, 'drum');
    // 倒塌門楣: 橫跨中央, 底下是掩蔽
    slab(ctx, 11, 20, 11, 11, mini, 'lintel');
    // 門楣上的兩塊柱頭: 高位
    pair(ctx, 12, 13, 9, 10, mini, 'drum');
    if (!mini) {
      // 門楣下的陰影 = 掩蔽區
      ctx.save(); ctx.fillStyle = 'rgba(60,30,70,0.28)'; ctx.fillRect(440, 480, 400, 160); ctx.restore();
      crater(ctx, 90, 640); crater(ctx, 1190, 640);
      glassStreak(ctx, 450, 830, 440);
      // 鹽面倒影光
      ctx.save(); ctx.fillStyle = 'rgba(255,190,210,0.35)';
      ctx.fillRect(0, 643, 160, 2); ctx.fillRect(380, 646, 60, 2); ctx.fillRect(1100, 644, 180, 2);
      ctx.restore();
    }
  }

  function scene(ctx, mini) {
    background(ctx, mini);
    terrain(ctx, mini);
    var cx = 640, T = 76;
    // 左拳已砸進左端鹽地(反擊空檔)
    fist(ctx, 90, 598, -1);
    if (!mini) {
      ctx.save(); ctx.fillStyle = 'rgba(255,240,240,0.55)';
      for (var d = 0; d < 4; d++) { ctx.beginPath(); ctx.ellipse(30 + d * 40, 634 - (d % 2) * 6, 16, 8, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // 右拳待機
    fist(ctx, 1000, 280, 1);
    colossus(ctx, cx, T, 'idle');
    bossBar(ctx, cx, 0.46);
    // 碎岩雨: 落在柱鼓、門楣頂、右端鹽地(門楣下方安全)
    telegraph(ctx, 300, 560, 22, mini ? null : 452);
    telegraph(ctx, 1050, 560, 22, mini ? null : 442);
    telegraph(ctx, 1180, 640, 20, mini ? null : 518);
    telegraph(ctx, 640, 440, 22, mini ? null : 350);
    rock(ctx, 300, 430, 18, 0.6);
    rock(ctx, 1050, 420, 17, 2.2);
    rock(ctx, 1180, 500, 15, 3.4);
    rock(ctx, 640, 326, 16, 5.1);
    var A = window.Art;
    if (A) {
      A.drawPlayer(ctx, { x: 172, y: 618, cls: 'sword', facing: -1, pose: 'slash', poseT: 0.05 });
      A.drawPlayer(ctx, { x: 700, y: 618, cls: 'bomber', facing: 1, pose: 'run', poseT: 0.1 });
      A.drawPlayer(ctx, { x: 520, y: 338, cls: 'hunter', facing: 1, pose: 'shoot', poseT: 0.1 });
      A.drawArrow(ctx, { x: 572, y: 290, angle: Math.atan2(150 - 338, 640 - 520) });
    }
  }

  function thumbCard(ctx, name) {
    var A = window.Art, x = 1088, y = 52;
    if (!A) return;
    A.drawLevelCard(ctx, { x: x, y: y, index: 8, name: name, state: 'cleared', cost: null, stock: null, canAfford: true, rates: { wood: 22.4, stone: 18.6, time: 9.8, soul: 30.2 }, recordCls: 'sword', recordTime: 96.4, repairedCount: 3 });
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
    ctx.translate(x + 8, y + 8); ctx.scale(0.125, 0.125);
    scene(ctx, true);
    ctx.restore();
    A.drawCardOverlay(ctx, { x: x, y: y, accelLv: 0, newArea: false, selected: false });
    ctx.save();
    rr(ctx, x, y + 142, 176, 22, 5); ctx.fillStyle = 'rgba(10,14,24,0.8)'; ctx.fill();
    ctx.font = '12px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9d2e3'; ctx.fillText('↑ 大地圖卡片縮圖(實際比例)', x + 88, y + 153);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'boss-stage', id: 'C', kind: 'static',
    size: [1280, 720],
    duration: 0,
    loop: false,
    draw: function (ctx, t) {
      ctx.save();
      scene(ctx, false);
      if (window.Art) window.Art.drawHud(ctx, { mode: 'level', stock: { wood: 312, stone: 240, time: 96, soul: 130 }, ratePerMin: { wood: 48.2, stone: 31.5, time: 12.4, soul: 16.0 }, bumpT: {}, bumpDur: 0.15, time: 63.4, run: { wood: 0, stone: 6, time: 3, soul: 9 }, hp: 4, maxHp: 5, skillCdT: 1, skillCdDur: 1, cls: 'sword' });
      thumbCard(ctx, '鹽原斷門');
      ctx.restore();
    }
  };
})();
