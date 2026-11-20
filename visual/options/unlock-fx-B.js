/* unlock-fx 方案 B — 解鎖職業特效(升級所獵人卡); 依賴底版 art.js 的全域 Art(drawPlayer、icons.mat、palette) */
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

  // ===== 方案 B: 光柱注入 → 角色躍出卡片(焦點在角色本身, 垂直動線) =====
  // 0.5~0.7 金白光柱從上方打到角色位 / 0.55~0.8 鎖化成光點往上散 / 0.65~1.0 灰色剪影由腳往頭灌滿職業色(亮掃線)
  // 1.0 卡底轉綠、閃白 / 1.0~1.5 角色放大躍出卡片(歡呼姿), 背後職業色放射光 + 10 金星噴出
  // 1.5~1.7 落回卡上壓扁回彈 + 揚塵 / 1.6~1.8 「已解鎖」章淡入
  window.VISUAL_OPTION = {
    element: 'unlock-fx', id: 'B', kind: 'anim',
    size: [VW, VH], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((Number(t) || 0) % DUR + DUR) % DUR;
      begin(ctx, t);
      var hx = CX + 54, hy = CY - 3 + 56, unlocked = t >= 1.0;
      var jp = seg(t, 1.0, 1.5), inAir = t >= 1.0 && t < 1.5;
      var land = seg(t, 1.5, 1.7), squash = (t >= 1.5 && t < 1.7) ? Math.sin(land * Math.PI) : 0;
      var stP = seg(t, 1.6, 1.8);

      card(ctx, {
        unlocked: unlocked, press: pressOf(t), hideHero: inAir || (t >= 0.65 && t < 1.0), lockShow: false,
        pose: t < 2.2 && unlocked ? 'cheer' : 'idle', poseT: t, sx: 1 + 0.12 * squash, sy: 1 - 0.16 * squash,
        stampK: lerp(1.3, 1, eOut(stP)), stampA: stP, nameLit: t >= 0.65,
        costA: 1 - seg(t, 0.5, 0.75)
      });
      // 鎖: 0.5 前照常畫; 0.55~0.8 往上浮、放大、淡出 + 光點
      if (t < 0.8) {
        var lp = seg(t, 0.55, 0.8);
        ctx.save(); ctx.globalAlpha *= 1 - lp;
        lock(ctx, hx, hy + 2 - 22 * eOut(lp), 30 * (1 + 0.3 * lp), '#4a3e2e', 0, 0);
        ctx.restore();
        if (lp > 0) {
          ctx.save(); ctx.fillStyle = '#fff3c4'; ctx.globalAlpha *= 1 - lp;
          for (var m = 0; m < 7; m++) { star4(ctx, hx - 18 + 6 * m + Math.sin(m * 2.1) * 4, hy - 4 - (30 + 20 * hash(m, 3)) * lp, 2.6); ctx.fill(); }
          ctx.restore();
        }
      }
      // 剪影灌色(0.65~1.0): 灰剪影 + 由腳往頭的彩色區 + 白色掃線
      if (t >= 0.65 && t < 1.0) {
        var f = eOut(seg(t, 0.65, 0.98)), bot = hy + 40, top = hy - 44, fy = lerp(bot, top, f);
        hero(ctx, CLS, hx, hy, 2.1, 0.35, 'idle', 0);
        ctx.save(); ctx.beginPath(); ctx.rect(hx - 50, fy, 100, bot - fy + 4); ctx.clip();
        hero(ctx, CLS, hx, hy, 2.1, 1, 'idle', 0);
        ctx.restore();
        ctx.save(); ctx.globalAlpha *= 0.9; ctx.fillStyle = '#ffffff'; rr(ctx, hx - 30, fy - 2, 60, 4, 2); ctx.fill(); ctx.restore();
      }
      // 光柱(0.5 打下, 1.25~1.6 收掉)
      var pg = eOut(seg(t, 0.5, 0.7)), pf = 1 - seg(t, 1.25, 1.6);
      if (pg > 0 && pf > 0) {
        var pw = 64 * pg, topY = OY - 10, botY = CY - 3 + CH - 6;
        ctx.save(); ctx.globalAlpha *= 0.85 * pf;
        var g = ctx.createLinearGradient(hx - pw, 0, hx + pw, 0);
        g.addColorStop(0, 'rgba(255,216,74,0)'); g.addColorStop(0.3, 'rgba(255,216,74,0.35)'); g.addColorStop(0.5, 'rgba(255,252,236,0.85)'); g.addColorStop(0.7, 'rgba(255,216,74,0.35)'); g.addColorStop(1, 'rgba(255,216,74,0)');
        ctx.fillStyle = g; ctx.fillRect(hx - pw, topY, pw * 2, botY - topY);
        ell(ctx, hx, botY - 2, pw * 0.9, 7); ctx.fillStyle = 'rgba(255,240,180,0.6)'; ctx.fill();
        ctx.restore();
      }
      // 卡底轉綠的閃白
      var fl = seg(t, 1.0, 1.2);
      if (fl > 0 && fl < 1) { ctx.save(); rr(ctx, CX, CY - 3, CW, CH, 6); ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - fl)).toFixed(3) + ')'; ctx.fill(); ctx.restore(); }
      // 躍出: 放射光 + 金星 + 放大的角色
      if (inAir) {
        var ay = hy - 72 * 4 * jp * (1 - jp), ak = 2.1 + 0.9 * Math.sin(jp * Math.PI);
        var rp = seg(t, 1.02, 1.55);
        ctx.save(); ctx.globalAlpha *= (1 - rp) * 0.85; ctx.translate(hx, ay); ctx.rotate(t * 1.6);
        for (var r = 0; r < 12; r++) {
          var a = r * TAU / 12, L = lerp(36, 112, eOut(rp));
          ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.09) * 20, Math.sin(a - 0.09) * 20); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(a + 0.09) * 20, Math.sin(a + 0.09) * 20); ctx.closePath();
          ctx.fillStyle = r % 2 ? P.select : P.hunter; ctx.fill();
        }
        ctx.restore();
        hero(ctx, CLS, hx, ay, ak, 1, 'cheer', t, 1, 1);
      }
      var sp2 = seg(t, 1.0, 1.6);
      if (sp2 > 0 && sp2 < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - eIn(sp2); ctx.fillStyle = P.select;
        for (var s = 0; s < 10; s++) {
          var b = -Math.PI / 2 + (s - 4.5) * 0.33, R = 40 + 120 * eOut(sp2), sy0 = hy - 10;
          star4(ctx, hx + Math.cos(b) * R * 1.3, sy0 + Math.sin(b) * R + 140 * sp2 * sp2, 5.5 - 2.5 * sp2); ctx.fill();
        }
        ctx.restore();
      }
      // 落地揚塵
      if (land > 0 && land < 1) {
        ctx.save(); ctx.globalAlpha *= 1 - land; ctx.fillStyle = '#efe3c6';
        for (var q = 0; q < 4; q++) { var side = q < 2 ? -1 : 1, off = (q % 2) * 12; circle(ctx, hx + side * (24 + off + 22 * eOut(land)), hy + 36 - 6 * land - off * 0.3, 6 - 2 * land); ctx.fill(); }
        ctx.restore();
      }
      ctx.restore();
    }
  };
})();
