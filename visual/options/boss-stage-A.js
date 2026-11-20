/* boss-stage 方案 A — 天頂星壇
 * 雲海之上的夜空浮島祭壇: 深靛夜空 + 金色星環光暈, 銀白大理石浮島(金邊)。
 * 構圖: 中央一座大浮島當主戰場(巨拳落點), 兩側低浮島 + 踏石 + 中層石板 + 高祭台, 往上收到 Boss 正下方的中央小祭台(近身反擊位)。
 * 四周是雲海深淵(掉下去 = 失敗), 碎岩落在兩側浮島上。
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
  var TA = { skyTop: '#090c26', skyMid: '#1a1c4c', skyLow: '#342a66', top: '#e6ebff', topHi: '#ffffff', trim: '#e0b552', inner: '#535c9e', mark: '#434b86', gold: '#e8c25a', cloud: '#2a2e66', cloudHi: '#4c529a' };

  function tile(ctx, c, r, top, mini) {
    var L = c * 40, T = r * 40;
    ctx.fillStyle = TA.inner; ctx.fillRect(L, T, 40, 40);
    if (!mini) {
      ctx.strokeStyle = TA.mark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(L + 3, T + 30 - (c % 3) * 4); ctx.quadraticCurveTo(L + 18, T + 20, L + 37, T + 32 - (r % 2) * 6); ctx.stroke();
      if ((c + r) % 2 === 0) { poly(ctx, [L + 20, T + 18, L + 25, T + 24, L + 20, T + 30, L + 15, T + 24]); ctx.fillStyle = 'rgba(232,194,90,0.5)'; ctx.fill(); }
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(L + 0.5, T + 0.5, 39, 39);
    }
    if (top) {
      ctx.fillStyle = TA.top; ctx.fillRect(L, T, 40, 10);
      if (!mini) { ctx.fillStyle = TA.topHi; ctx.fillRect(L, T, 40, 2.5); }
      ctx.fillStyle = TA.trim; ctx.fillRect(L, T + 10, 40, 3);
    }
  }
  function slab(ctx, c0, c1, r0, r1, mini) {
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) tile(ctx, c, r, r === r0, mini);
  }
  // 雙側對稱放置
  function pair(ctx, c0, c1, r0, r1, mini) { slab(ctx, c0, c1, r0, r1, mini); slab(ctx, 31 - c1, 31 - c0, r0, r1, mini); }
  // 浮島底下的垂晶(裝飾, 細長透明, 不像實心)
  function crystals(ctx, c0, c1, bottomY) {
    ctx.save();
    for (var c = c0; c <= c1; c++) {
      var x = c * 40 + 20, len = 10 + hash(c, bottomY) * 22;
      poly(ctx, [x - 5, bottomY, x + 5, bottomY, x, bottomY + len]); ctx.fillStyle = 'rgba(160,175,255,0.45)'; ctx.fill();
    }
    ctx.restore();
  }
  // 巨拳落點的金色封印 + 地面裂紋(常駐地貌)
  function seal(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232,194,90,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y + 5, 52, 4, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,16,48,0.7)'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 13); ctx.lineTo(x - 22, y + 34); ctx.lineTo(x - 30, y + 52);
    ctx.moveTo(x + 4, y + 13); ctx.lineTo(x + 14, y + 30); ctx.lineTo(x + 34, y + 44);
    ctx.moveTo(x, y + 13); ctx.lineTo(x + 2, y + 40);
    ctx.stroke();
    ctx.restore();
  }
  function brazier(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = TA.gold; ctx.strokeStyle = '#2a2040'; ctx.lineWidth = 1.5;
    poly(ctx, [x - 10, y - 18, x + 10, y - 18, x + 6, y - 10, x - 6, y - 10]); ctx.fill(); ctx.stroke();
    ctx.fillRect(x - 2, y - 10, 4, 10);
    var g = ctx.createRadialGradient(x, y - 26, 2, x, y - 26, 22);
    g.addColorStop(0, 'rgba(200,225,255,0.9)'); g.addColorStop(1, 'rgba(120,150,255,0)');
    ctx.fillStyle = g; circle(ctx, x, y - 26, 22); ctx.fill();
    poly(ctx, [x - 6, y - 19, x, y - 38, x + 6, y - 19]); ctx.fillStyle = '#cfe0ff'; ctx.fill();
    ctx.restore();
  }

  function background(ctx, mini) {
    var g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, TA.skyTop); g.addColorStop(0.55, TA.skyMid); g.addColorStop(1, TA.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    if (!mini) {
      for (var i = 0; i < 140; i++) {
        var a = 0.25 + hash(i, 9) * 0.5;
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        circle(ctx, hash(i, 1) * 1280, 40 + hash(i, 2) * 520, 0.6 + hash(i, 3) * 1.3); ctx.fill();
      }
      var n = ctx.createRadialGradient(300, 260, 10, 300, 260, 320);
      n.addColorStop(0, 'rgba(120,80,190,0.22)'); n.addColorStop(1, 'rgba(120,80,190,0)');
      ctx.fillStyle = n; ctx.fillRect(0, 0, 1280, 720);
      n = ctx.createRadialGradient(1000, 330, 10, 1000, 330, 300);
      n.addColorStop(0, 'rgba(70,110,200,0.2)'); n.addColorStop(1, 'rgba(70,110,200,0)');
      ctx.fillStyle = n; ctx.fillRect(0, 0, 1280, 720);
    }
    // 星環光暈(縮圖辨識記號)
    ctx.save();
    if (mini) {
      ctx.strokeStyle = 'rgba(232,194,90,0.75)'; ctx.lineWidth = 30;
      circle(ctx, 640, 190, 250); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(232,194,90,0.12)'; ctx.lineWidth = 26; circle(ctx, 640, 190, 250); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,194,90,0.55)'; ctx.lineWidth = 3; circle(ctx, 640, 190, 250); ctx.stroke();
      ctx.lineWidth = 1.5; circle(ctx, 640, 190, 226); ctx.stroke();
      for (var d = 0; d < 48; d++) {
        var an = d / 48 * TAU, r0 = d % 4 === 0 ? 232 : 240;
        ctx.beginPath(); ctx.moveTo(640 + Math.cos(an) * r0, 190 + Math.sin(an) * r0); ctx.lineTo(640 + Math.cos(an) * 250, 190 + Math.sin(an) * 250); ctx.stroke();
      }
      ctx.fillStyle = TA.gold;
      for (var s = 0; s < 12; s++) {
        var sa = s / 12 * TAU + 0.13, sx = 640 + Math.cos(sa) * 250, sy = 190 + Math.sin(sa) * 250;
        poly(ctx, [sx, sy - 6, sx + 2, sy - 2, sx + 6, sy, sx + 2, sy + 2, sx, sy + 6, sx - 2, sy + 2, sx - 6, sy, sx - 2, sy - 2]); ctx.fill();
      }
    }
    ctx.restore();
    // 遠方漂浮殘柱(低對比剪影)
    ctx.fillStyle = '#20245a';
    var far = [[120, 300, 70], [1150, 280, 60], [340, 220, 40], [930, 200, 44]];
    for (var f = 0; f < far.length; f++) {
      var fx = far[f][0], fy = far[f][1], fw = far[f][2];
      poly(ctx, [fx - fw, fy, fx + fw, fy, fx + fw * 0.5, fy + 18, fx, fy + 34, fx - fw * 0.5, fy + 18]); ctx.fill();
      ctx.fillRect(fx - fw * 0.5, fy - 46, 12, 46); ctx.fillRect(fx + fw * 0.2, fy - 30, 12, 30);
    }
    // 雲海(深淵)
    var layers = [[612, TA.cloud, 0.9], [650, '#232758', 1], [690, '#1b1e48', 1]];
    for (var l = 0; l < layers.length; l++) {
      ctx.fillStyle = layers[l][1];
      ctx.beginPath(); ctx.moveTo(0, 720);
      for (var x = 0; x <= 1280; x += 40) ctx.lineTo(x, layers[l][0] + Math.sin(x * 0.02 + l * 1.7) * 10 + Math.sin(x * 0.051 + l) * 5);
      ctx.lineTo(1280, 720); ctx.closePath(); ctx.fill();
      if (l === 0 && !mini) {
        ctx.strokeStyle = TA.cloudHi; ctx.lineWidth = 2; ctx.beginPath();
        for (var x2 = 0; x2 <= 1280; x2 += 40) { var yy = layers[l][0] + Math.sin(x2 * 0.02) * 10 + Math.sin(x2 * 0.051) * 5; if (x2 === 0) ctx.moveTo(x2, yy); else ctx.lineTo(x2, yy); }
        ctx.stroke();
      }
    }
  }

  function terrain(ctx, mini) {
    // 主浮島(巨拳主戰場)
    slab(ctx, 7, 24, 15, 15, mini); slab(ctx, 8, 23, 16, 16, mini); slab(ctx, 10, 21, 17, 17, mini);
    // 兩側低浮島
    pair(ctx, 1, 4, 14, 14, mini); pair(ctx, 2, 3, 15, 15, mini);
    // 踏石
    pair(ctx, 5, 6, 13, 13, mini);
    // 中層石板(碎岩落區)
    pair(ctx, 1, 4, 11, 11, mini);
    // 高祭台
    pair(ctx, 7, 10, 9, 9, mini);
    // 中央小祭台: Boss 正下方的近身反擊位
    slab(ctx, 14, 17, 8, 8, mini);
    if (!mini) {
      crystals(ctx, 1, 4, 480); crystals(ctx, 27, 30, 480); crystals(ctx, 7, 10, 400); crystals(ctx, 21, 24, 400);
      crystals(ctx, 14, 17, 360); crystals(ctx, 5, 6, 560); crystals(ctx, 25, 26, 560); crystals(ctx, 2, 3, 640); crystals(ctx, 28, 29, 640);
      seal(ctx, 440, 600); seal(ctx, 840, 600);
      brazier(ctx, 300, 600); brazier(ctx, 980, 600);
    }
  }

  function scene(ctx, mini) {
    background(ctx, mini);
    terrain(ctx, mini);
    var cx = 640, T = 76;
    // 碎岩落區: 右側中層石板
    telegraph(ctx, 1110, 440, 24, mini ? null : 330);
    telegraph(ctx, 1200, 440, 20, mini ? null : 400);
    // 左拳: 懸在主浮島上方, 落點預告
    telegraph(ctx, 440, 600, 58, 526);
    fist(ctx, 440, 474, -1);
    // 右拳待機
    fist(ctx, 900, 250, 1);
    colossus(ctx, cx, T, 'charge');
    bossBar(ctx, cx, 0.82);
    rock(ctx, 1110, 312, 18, 1.3);
    rock(ctx, 1200, 386, 14, 2.7);
    rock(ctx, 1040, 230, 12, 4.1);
    // 三職業(hero 方案 A 畫法)
    var A = window.Art;
    if (A) {
      A.drawPlayer(ctx, { x: 560, y: 578, cls: 'sword', facing: 1, pose: 'dash', poseT: 0.05 });
      A.drawPlayer(ctx, { x: 120, y: 418, cls: 'bomber', facing: 1, pose: 'throw', poseT: 0.1 });
      A.drawBomb(ctx, { x: 214, y: 362, t: 0 });
      A.drawPlayer(ctx, { x: 900, y: 338, cls: 'hunter', facing: -1, pose: 'shoot', poseT: 0.1 });
      A.drawArrow(ctx, { x: 820, y: 286, angle: Math.atan2(150 - 338, 640 - 900) });
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
    element: 'boss-stage', id: 'A', kind: 'static',
    size: [1280, 720],
    duration: 0,
    loop: false,
    draw: function (ctx, t) {
      ctx.save();
      scene(ctx, false);
      if (window.Art) window.Art.drawHud(ctx, { mode: 'level', stock: { wood: 312, stone: 240, time: 96, soul: 130 }, ratePerMin: { wood: 48.2, stone: 31.5, time: 12.4, soul: 16.0 }, bumpT: {}, bumpDur: 0.15, time: 63.4, run: { wood: 0, stone: 6, time: 3, soul: 9 }, hp: 4, maxHp: 5, skillCdT: 1, skillCdDur: 1, cls: 'sword' });
      thumbCard(ctx, '天頂星壇');
      ctx.restore();
    }
  };
})();
