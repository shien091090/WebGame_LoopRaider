/* unlock-fx 方案 A — 解鎖職業特效(升級所獵人卡); 依賴底版 art.js 的全域 Art(drawPlayer、icons.mat、palette) */
(function () {
  'use strict';
  // ---- 共用: 升級所「解鎖職業」列取景(畫法照 polish art.js 的 ui 方案 A: 木板 + 羊皮紙牌 + 石鍵帽) ----
  // 取景: 頁面座標 (45,32) 起 640×336, 放大 1.25 倍 = 800×420。特效對象是左格「獵人」卡 (100,124,530,116)。
  // 時間軸(三方案共用): 0~0.4 鎖住待按 / 0.4~0.5 按下 Z / 0.5~1.8 解鎖特效(1.3 秒) / 1.8~2.8 已解鎖停留, 循環。
  var A = window.Art, P = A.palette, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var VW = 800, VH = 420, S = 1.25, OX = 45, OY = 32;
  var CX = 100, CY = 124, CW = 530, CH = 116;
  var T_PRESS = 0.4, T0 = 0.5, DUR = 2.8;
  var CLS = 'hunter';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eIn(p) { p = clamp(p, 0, 1); return p * p * p; }
  function eBack(p) { p = clamp(p, 0, 1); var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function font(px, b) { return (b ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || P.edge; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, b) { ctx.font = font(px, b); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : String(s).length * px; }
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
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]); }

  function board(ctx, x, y, w, h, tint) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = tint || P.board; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = P.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = P.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { circle(ctx, n[i][0], n[i][1], 2.6); ctx.fillStyle = P.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = P.edge; ctx.stroke(); }
    ctx.restore();
  }
  function tag(ctx, x, y, w, h, sel, look) {
    ctx.save();
    var lift = sel === 'hot' ? 3 : 0;
    if (lift) { rr(ctx, x + 2, y + 3, w, h, 6); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); }
    y -= lift;
    var bg = look === 'done' ? '#d6e6c6' : P.parch;
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
    if (sel === 'hot') {
      rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 7); ctx.lineWidth = 4; ctx.strokeStyle = P.select; ctx.stroke();
      poly(ctx, [x + w / 2 - 8, y - 4, x + w / 2 + 8, y - 4, x + w / 2, y + 5]); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke();
    } else {
      rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.stroke();
    }
    ctx.restore();
    return y;
  }
  function groove(ctx, x, y, w, h, label, on) {
    ctx.save();
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = on ? '#33261a' : P.groove; ctx.fill();
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 6); ctx.lineWidth = on ? 2.5 : 1; ctx.strokeStyle = on ? P.select : 'rgba(0,0,0,0.6)'; ctx.stroke();
    if (on) { poly(ctx, [x - 14, y + h / 2 - 9, x - 2, y + h / 2, x - 14, y + h / 2 + 9]); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke(); }
    if (label) text(ctx, label, x + 10, y + 11, 12, on ? P.select : P.labelDim, 'left', true, 3, P.edge);
    ctx.restore();
  }
  // 金色動作章(此刻按得下去); press 0~1 = 被按下的深度
  function actHot(ctx, s, x, y, px, press) {
    var w = tw(ctx, s, px, true) + px * 1.2, h = px * 1.7, lx = x - w, d = 3 * clamp(press || 0, 0, 1);
    ctx.save();
    rr(ctx, lx, y - h / 2 + 3, w, h, 4); ctx.fillStyle = P.selectDeep; ctx.fill();
    rr(ctx, lx, y - h / 2 + d, w, h, 4); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.edge; ctx.stroke();
    text(ctx, s, lx + w / 2, y + 0.5 + d, px, P.ink, 'center', true);
    ctx.restore();
  }
  // 鎖(同職業選擇彈窗的鎖); open 0~1 = 鎖環以右腳為軸抬起轉開; rot = 整顆旋轉
  function lock(ctx, cx, cy, sz, col, open, rot) {
    var k = sz / 24;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot || 0); ctx.scale(k, k);
    ctx.save();
    if (open) { ctx.translate(6, 1 - 5 * open); ctx.rotate(-0.9 * open); ctx.translate(-6, -1); }
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -3, 6, Math.PI, 0); ctx.lineTo(6, 1); ctx.moveTo(-6, 1); ctx.lineTo(-6, -3); ctx.stroke();
    ctx.restore();
    rr(ctx, -9, 0, 18, 13, 2.5); ctx.fillStyle = col; ctx.fill();
    circle(ctx, 0, 5.5, 2); ctx.fillStyle = '#141a22'; ctx.fill();
    ctx.restore();
  }
  // 角色(hero 方案 A, 直接呼叫遊戲的 drawPlayer); 錨點在腳底, sx / sy 擠壓不移動腳底
  function hero(ctx, cls, cx, cy, k, alpha, pose, poseT, sx, sy) {
    ctx.save(); ctx.translate(cx, cy + 18 * k); ctx.scale(k * (sx || 1), k * (sy || 1)); ctx.translate(0, -18);
    if (alpha < 1) ctx.globalAlpha *= clamp(alpha, 0, 1);
    A.drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: pose || 'idle', poseT: poseT || 0 });
    ctx.restore();
  }
  // 「已解鎖」綠框斜章(原「已招募」)
  function stamp(ctx, x, y, k, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.1); ctx.scale(k, k); ctx.globalAlpha *= clamp(alpha, 0, 1);
    rr(ctx, -50, -15, 100, 30, 4); ctx.lineWidth = 2.5; ctx.strokeStyle = P.good; ctx.stroke();
    text(ctx, '已解鎖', 0, 0.5, 16, P.good, 'center', true);
    ctx.restore();
  }
  // 花費列: 木材圖示 + 數字(此例持有足夠, 不畫「缺 N」)
  function costWood(ctx, x, y, n, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(alpha, 0, 1);
    A.icons.mat(ctx, 'wood', x + 9.4, y, 18.75);
    text(ctx, String(n), x + 21.75, y + 0.5, 15, P.ink, 'left', true);
    ctx.restore();
  }
  // 升級所背板 + 右格(炸彈工, 鎖住未選) + 下方移速列
  function page(ctx) {
    ctx.save();
    board(ctx, 40, 48, 1200, 640, '#33263a');
    text(ctx, '升級所', 60, 72, 22, P.cream, 'left', true, 4, P.edge);
    groove(ctx, 80, 100, 1120, 150, '解鎖職業', true);
    var ty = tag(ctx, 650, 124, 530, 116, null, 'normal');
    hero(ctx, 'bomber', 704, ty + 56, 2.1, 0.35, 'idle', 0);
    lock(ctx, 704, ty + 58, 30, '#4a3e2e', 0, 0);
    text(ctx, '炸彈工', 754, ty + 30, 20, P.ink, 'left', true);
    groove(ctx, 80, 262, 1120, 84, null, false);
    var t2 = tag(ctx, 92, 272, 1096, 64, null, 'normal');
    text(ctx, '移速', 112, t2 + 32, 20, P.ink, 'left', true);
    for (var j = 0; j < 3; j++) { rr(ctx, 230 + j * 28, t2 + 24, 22, 16, 3); ctx.fillStyle = j < 1 ? P.core : '#cfc2a2'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = P.edge; ctx.stroke(); }
    text(ctx, '移速 +8%', 360, t2 + 32, 17, P.ink, 'left', true);
    ctx.restore();
  }
  // 獵人卡: o.unlocked 決定底色 / 鎖 / 花費 / 章; 其他欄位給各方案調演出
  function card(ctx, o) {
    var ty = tag(ctx, CX, CY, CW, CH, 'hot', o.unlocked ? 'done' : 'normal');
    var hx = CX + 54, hy = ty + 56;
    if (!o.hideHero) hero(ctx, CLS, hx + (o.heroDx || 0), hy + (o.heroDy || 0), o.heroK || 2.1, o.unlocked ? 1 : (o.heroAlpha == null ? 0.35 : o.heroAlpha), o.pose, o.poseT, o.sx, o.sy);
    if (!o.unlocked && o.lockShow !== false) lock(ctx, hx, hy + 2, 30, '#4a3e2e', o.lockOpen || 0, o.lockRot || 0);
    text(ctx, '獵人', CX + 104, ty + 30, 20, o.unlocked || o.nameLit ? P.ink : '#5e5240', 'left', true);
    text(ctx, '擅長: 潛行穿怪群', CX + 104, ty + 56, 13, P.inkDim, 'left', true);
    if (o.unlocked) stamp(ctx, CX + 440, ty + 58, o.stampK == null ? 1 : o.stampK, o.stampA == null ? 1 : o.stampA);
    else {
      costWood(ctx, CX + 104, ty + 88, o.costN == null ? 30 : o.costN, o.costA == null ? 1 : o.costA);
      if (o.btnA !== 0) actHot(ctx, 'Z 解鎖', CX + 514, ty + 88, 13, o.press || 0);
    }
    return ty;
  }
  function pressOf(t) { return t < T_PRESS ? 0 : (t < T0 ? seg(t, T_PRESS, T0) : 1 - seg(t, T0, T0 + 0.12)); }
  function begin(ctx, t) {
    ctx.save();
    ctx.fillStyle = '#14222a'; ctx.fillRect(0, 0, VW, VH);
    ctx.scale(S, S); ctx.translate(-OX, -OY);
    page(ctx);
  }

  // ===== 方案 A: 開鎖 → 翻牌 → 蓋章(卡片本身的手感三拍) =====
  // 0.5~0.8 鎖越抖越兇 / 0.8 喀一聲鎖環彈開, 鎖被甩出卡外落下 / 0.85~1.15 整張卡翻面(背面米白 → 正面綠底)
  // 1.15~1.4 角色彈一下 + 職業色光圈 / 1.35~1.5 「已解鎖」章從大砸下, 1.5 落章時卡震 + 綠色墨圈 + 6 金星
  window.VISUAL_OPTION = {
    element: 'unlock-fx', id: 'A', kind: 'anim',
    size: [VW, VH], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DUR + DUR) % DUR;
      begin(ctx, t);
      var hx = CX + 54, hyL = CY - 3 + 56;
      var flip = seg(t, 0.85, 1.15), unlocked = t >= 1.0;
      var sx = (flip > 0 && flip < 1) ? Math.max(0.03, Math.abs(Math.cos(flip * Math.PI))) : 1;
      var shakeA = seg(t, 0.5, 0.8);
      var lockRot = t < 0.8 ? Math.sin(t * 46) * 0.26 * shakeA * shakeA : 0;
      var impact = seg(t, 1.5, 1.66), jolt = (t >= 1.5 && t < 1.66) ? Math.sin(impact * Math.PI * 3) * 3 * (1 - impact) : 0;
      var pop = seg(t, 1.15, 1.4), popK = 2.1 * (1 + 0.22 * Math.sin(pop * Math.PI));
      var sp = seg(t, 1.35, 1.5);

      // 角色出場光圈(卡片後面不畫, 畫在角色後方的卡面上: 先畫卡再疊)
      ctx.save();
      ctx.translate(CX + CW / 2, CY + CH / 2 + jolt); ctx.scale(sx, 1); ctx.translate(-(CX + CW / 2), -(CY + CH / 2));
      card(ctx, {
        unlocked: unlocked, press: pressOf(t), lockShow: t < 0.8, lockRot: lockRot,
        heroK: unlocked ? popK : 2.1, pose: (t >= 1.15 && t < 2.3) ? 'cheer' : 'idle', poseT: t,
        stampK: sp > 0 ? lerp(2.4, 1, eIn(sp)) : 1, stampA: sp > 0 ? clamp(sp * 2.5, 0, 1) : 0,
        costA: 1 - seg(t, 0.5, 0.7)
      });
      if (flip > 0 && flip < 1) { // 翻面時的反光: 越側立越亮
        rr(ctx, CX, CY - 3, CW, CH, 6); ctx.fillStyle = 'rgba(255,246,214,' + (0.75 * (1 - sx)).toFixed(3) + ')'; ctx.fill();
      }
      ctx.restore();

      // 角色彈出時的職業色光圈
      if (pop > 0 && pop < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - pop;
        circle(ctx, hx, hyL, lerp(22, 62, eOut(pop))); ctx.lineWidth = lerp(8, 2, pop); ctx.strokeStyle = P.hunter; ctx.stroke();
        ctx.restore();
      }
      // 花費扣掉: 「−30」木材往上飄
      var cp = seg(t, 0.5, 1.1);
      if (cp > 0 && cp < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - eIn(cp);
        var fy = CY - 3 + 88 - 26 * eOut(cp);
        A.icons.mat(ctx, 'wood', CX + 113, fy, 18);
        text(ctx, '−30', CX + 126, fy + 0.5, 16, '#7a4a1e', 'left', true, 3, '#fbf6ea');
        ctx.restore();
      }
      // 喀: 鎖彈開的火花 + 甩出去的鎖
      if (t >= 0.8 && t < 1.4) {
        var d = t - 0.8, lx = hx - 120 * d, ly = hyL + 2 - 220 * d + 0.5 * 980 * d * d;
        ctx.save(); ctx.globalAlpha *= 1 - seg(t, 1.15, 1.4);
        lock(ctx, lx, ly, 30, '#4a3e2e', 1, -d * 7);
        ctx.restore();
        var sk = seg(t, 0.8, 0.95);
        if (sk < 1) {
          ctx.save(); ctx.globalAlpha *= 1 - sk; ctx.strokeStyle = P.select; ctx.lineWidth = 3; ctx.lineCap = 'round';
          for (var i = 0; i < 6; i++) {
            var a = -Math.PI / 2 + (i - 2.5) * 0.5, r0 = 16 + 14 * sk, r1 = 26 + 22 * sk;
            ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * r0, hyL - 4 + Math.sin(a) * r0); ctx.lineTo(hx + Math.cos(a) * r1, hyL - 4 + Math.sin(a) * r1); ctx.stroke();
          }
          ctx.restore();
        }
      }
      // 落章: 綠色墨圈 + 短放射線 + 6 金星
      var mx = CX + 440, my = CY - 3 + 58 + jolt;
      var ip = seg(t, 1.5, 1.8);
      if (ip > 0 && ip < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - ip;
        ctx.translate(mx, my); ctx.rotate(-0.1);
        rr(ctx, -50 - 18 * eOut(ip), -15 - 10 * eOut(ip), 100 + 36 * eOut(ip), 30 + 20 * eOut(ip), 8); ctx.lineWidth = 3; ctx.strokeStyle = P.goodLight; ctx.stroke();
        ctx.strokeStyle = P.good; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (var j = 0; j < 8; j++) {
          var b = j * TAU / 8 + 0.2, rx0 = 60 + 18 * ip, ry0 = 24 + 10 * ip;
          ctx.beginPath(); ctx.moveTo(Math.cos(b) * rx0, Math.sin(b) * ry0); ctx.lineTo(Math.cos(b) * (rx0 + 10), Math.sin(b) * (ry0 + 6)); ctx.stroke();
        }
        ctx.restore();
      }
      var gp = seg(t, 1.5, 1.95);
      if (gp > 0 && gp < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - eIn(gp); ctx.fillStyle = P.select;
        for (var k = 0; k < 6; k++) {
          var c = -Math.PI / 2 + (k - 2.5) * 0.42, R = 30 + 50 * eOut(gp);
          star4(ctx, mx + Math.cos(c) * R * 1.6, my - 6 + Math.sin(c) * R, 5 - 2 * gp); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  };
})();
