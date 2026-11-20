/* unlock-fx 方案 C — 解鎖職業特效(升級所獵人卡); 依賴底版 art.js 的全域 Art(drawPlayer、icons.mat、palette) */
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

  // ===== 方案 C: 木材投進鎖 → 鎖碎裂 → 全面板彩帶(把付出的素材換成獎勵, 向外擴散) =====
  // 0.5~0.98 花費列的木材一根根跳進鎖(數字 30 倒數到 0), 每進一根鎖彈一下、鎖外金環多亮一格
  // 0.98 鎖炸成碎片 + 白閃 + 職業色衝擊環掃過整列 / 卡底轉綠, 角色跳一下歡呼
  // 0.98~2.6 職業色 / 金 / 米白 / 綠彩帶從卡片噴起, 灑滿升級所再落下 / 1.25~1.45 「已解鎖」章落下
  var N_WOOD = 5, W_GAP = 0.08, W_FLY = 0.26, T_BREAK = 0.98;
  var CONF_COL = [P.hunter, P.select, P.cream, P.goodLight, P.hunter, P.select];
  window.VISUAL_OPTION = {
    element: 'unlock-fx', id: 'C', kind: 'anim',
    size: [VW, VH], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DUR + DUR) % DUR;
      begin(ctx, t);
      var ty = CY - 3, hx = CX + 54, hy = ty + 56, lx = hx, ly = hy + 2;
      var unlocked = t >= T_BREAK, i;
      var arrived = 0, bump = 0;
      for (i = 0; i < N_WOOD; i++) {
        var ta = T0 + i * W_GAP + W_FLY;
        if (t >= ta) { arrived++; var bp = seg(t, ta, ta + 0.12); if (bp < 1) bump = Math.max(bump, Math.sin(bp * Math.PI)); }
      }
      var costN = Math.round(30 * (1 - seg(t, T0, T0 + (N_WOOD - 1) * W_GAP + W_FLY)));
      var hop = seg(t, 1.0, 1.3), hopY = -26 * Math.sin(hop * Math.PI);
      var stP = seg(t, 1.25, 1.45);

      card(ctx, {
        unlocked: unlocked, press: pressOf(t), lockShow: false, costN: costN, costA: 1,
        heroDy: unlocked ? hopY : 0, pose: (t >= 1.0 && t < 2.3) ? 'cheer' : 'idle', poseT: t,
        heroAlpha: 0.35 + 0.35 * (arrived / N_WOOD),
        stampK: lerp(1.8, 1, eIn(stP)), stampA: clamp(stP * 2, 0, 1)
      });
      if (!unlocked) {
        // 鎖外蓄能金環: 每進一根木材亮一格
        if (arrived > 0) {
          ctx.save(); ctx.lineWidth = 4; ctx.lineCap = 'round';
          for (i = 0; i < N_WOOD; i++) {
            var a0 = -Math.PI / 2 + i * TAU / N_WOOD + 0.12, a1 = a0 + TAU / N_WOOD - 0.24;
            ctx.beginPath(); ctx.arc(lx, ly + 2, 24, a0, a1);
            ctx.strokeStyle = i < arrived ? P.select : 'rgba(74,62,46,0.35)'; ctx.stroke();
          }
          circle(ctx, lx, ly + 2, 20); ctx.fillStyle = 'rgba(255,216,74,' + (0.08 * arrived).toFixed(3) + ')'; ctx.fill();
          ctx.restore();
        }
        lock(ctx, lx, ly, 30 * (1 + 0.18 * bump), arrived >= N_WOOD ? '#6a5530' : '#4a3e2e', 0, Math.sin(t * 50) * 0.08 * (arrived / N_WOOD));
        // 飛行中的木材: 從花費列跳弧線進鎖
        for (i = 0; i < N_WOOD; i++) {
          var ts = T0 + i * W_GAP, p = seg(t, ts, ts + W_FLY);
          if (p <= 0 || p >= 1) continue;
          var sx0 = CX + 113, sy0 = ty + 88, wx = lerp(sx0, lx, p), wy = lerp(sy0, ly, p) - 46 * 4 * p * (1 - p);
          ctx.save(); ctx.translate(wx, wy); ctx.rotate(p * 4);
          A.icons.mat(ctx, 'wood', 0, 0, lerp(19, 12, p));
          ctx.restore();
        }
      }
      // 碎裂: 白閃 + 碎片 + 職業色衝擊環
      var bk = t - T_BREAK;
      if (bk >= 0 && bk < 0.7) {
        var fp = seg(t, T_BREAK, T_BREAK + 0.18);
        if (fp < 1) { ctx.save(); ctx.globalAlpha *= 1 - fp; circle(ctx, lx, ly, lerp(16, 46, eOut(fp))); ctx.fillStyle = '#fffbea'; ctx.fill(); ctx.restore(); }
        ctx.save(); ctx.globalAlpha *= 1 - seg(t, T_BREAK + 0.4, T_BREAK + 0.7);
        for (i = 0; i < 9; i++) {
          var ang = -Math.PI / 2 + (hash(i, 1) - 0.5) * 3.6, sp = 160 + 140 * hash(i, 2);
          var px = lx + Math.cos(ang) * sp * bk, py = ly + Math.sin(ang) * sp * bk + 0.5 * 900 * bk * bk;
          ctx.save(); ctx.translate(px, py); ctx.rotate(bk * (6 + 8 * hash(i, 3)) * (i % 2 ? 1 : -1));
          var z = 4 + 4 * hash(i, 4);
          poly(ctx, [-z, -z * 0.6, z * 0.8, -z, z, z * 0.7, -z * 0.5, z]); ctx.fillStyle = i % 3 ? '#4a3e2e' : P.select; ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        var wp = seg(t, T_BREAK, T_BREAK + 0.45);
        if (wp < 1) {
          ctx.save(); ctx.globalAlpha *= 1 - wp;
          ell(ctx, lx, ly, lerp(24, 560, eOut(wp)), lerp(12, 150, eOut(wp))); ctx.lineWidth = lerp(9, 2, wp); ctx.strokeStyle = P.hunter; ctx.stroke();
          ctx.restore();
        }
      }
      // 彩帶: 從卡片上緣噴起, 灑滿取景再落下
      if (bk >= 0) {
        var fade = 1 - seg(t, 2.35, 2.75);
        ctx.save(); ctx.globalAlpha *= fade;
        for (i = 0; i < 46; i++) {
          var h1 = hash(i, 11), h2 = hash(i, 12), h3 = hash(i, 13), d = bk - 0.06 * hash(i, 14);
          if (d <= 0) continue;
          var vx = (h1 - 0.5) * 620, vy = -380 - 300 * h2, ox = hx + (h3 - 0.3) * 120;
          var dr = 1 - Math.exp(-2.2 * d), cx = ox + vx * dr / 2.2, cy = hy - 20 + vy * dr / 2.2 + 0.5 * 520 * d * d;
          var spin = d * (8 + 10 * h3) + i;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin * 0.6); ctx.scale(1, Math.cos(spin));
          ctx.fillStyle = CONF_COL[i % CONF_COL.length];
          if (i % 4 === 3) { star4(ctx, 0, 0, 5); ctx.fill(); } else ctx.fillRect(-5, -2.5, 10, 5);
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  };
})();
