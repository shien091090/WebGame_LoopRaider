/* ctrl-panel 方案 C: 對話木牌 + 逐鍵示範 — 收成一顆拉片「咻」地貼到頂緣, 再像手風琴往右拉開成一條
 * 版面(在角色身上): 頭頂一塊橫向深色木牌(下方尖角指著角色), 一列排開: 金色標題牌「操作方式」| ← → 移動 | ↑ 跳躍 | Z 攻擊 | X 技能
 * 版面(左上角): 資訊列正下方一條單列細條 (10,44) 約 316×32, 只佔第 1 列(和教學橫幅同一條 HUD 疊加帶, 右緣 < 340 不碰橫幅)
 * 0.00~0.40 角色站著
 * 0.40~0.65 木牌從尖角往上「啵」地彈出(上下先拉長再回彈)
 * 0.80~2.80 逐鍵示範: 每 0.5 秒點亮一組(鍵帽轉金頂、字放大), 角色同時做那個動作(跑 / 跳 / 揮砍 / 衝刺)
 * 2.80~3.00 全部回到一般狀態(第一個樣子: 在角色身上展開)
 * 3.00~3.30 手風琴收合: 四組往左擠進標題牌, 木牌寬度縮成一顆拉片
 * 3.30~3.65 拉片沿直線「咻」到左上角, 拉長 + 後方速度線(第二個樣子: 移動途中)
 * 3.65~4.05 在左上角往右拉開, 四組依序滑出
 * 4.05~7.00 固定在左上角(第三個樣子); 射手蜂飛過細條底下時整條退到 0.3 不透明讓路
 * 6.70~7.00 畫面暗下接回開頭(方案頁循環用)
 */
(function () {
  var W = 1280, H = 720, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var GROUPS = [{ k: ['←', '→'], s: '移動' }, { k: ['↑'], s: '跳躍' }, { k: ['Z'], s: '攻擊' }, { k: ['X'], s: '技能' }];
  var PX = 470, PY = 582;
  var BIG = { px: 20, lpx: 18, h: 60, cy: PY - 18 - 30 - 46 };   // 木牌中心 y 488(底 518, 尖角到 534, 角色頭頂 564)
  var SMALL = { px: 12, lpx: 12, h: 32, x: 10, cy: 60, maxW: 320 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eIn(p) { p = clamp(p, 0, 1); return p * p * p; }
  function eBack(p) { p = clamp(p, 0, 1); var c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(ctx, s, x, y, px, col, align, bold, ow, oc) {
    ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (ow) { ctx.lineJoin = 'round'; ctx.lineWidth = ow; ctx.strokeStyle = oc || '#180f09'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px) { ctx.font = 'bold ' + Math.round(px) + 'px ' + FONT; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  function keyW(ctx, label, px) { return Math.max(px * 1.7, tw(ctx, label, px) + px * 0.9); }

  // 量版面: 標題牌寬 + 每組寬(鍵帽 + 字), 組間留 gap
  function measure(ctx, m) {
    var pad = m.px * 0.7, titleW = tw(ctx, '操作方式', m.lpx) + m.lpx * 1.2, gs = [], total = pad + titleW, gap = m.px * 0.9;
    for (var i = 0; i < GROUPS.length; i++) {
      var w = 0, g = GROUPS[i];
      for (var j = 0; j < g.k.length; j++) w += keyW(ctx, g.k[j], m.px) + (j ? 3 : 0);
      w += 5 + tw(ctx, g.s, m.lpx);
      gs.push(w); total += gap + w;
    }
    return { pad: pad, titleW: titleW, gs: gs, gap: gap, w: total + pad, px: m.px, lpx: m.lpx };
  }
  // 畫木牌: left = 左緣, cy = 中心 y, open = 0(只剩標題拉片)~1(全開), hot = 點亮第幾組(-1 無), k = 整體縮放(小版時字已在 m 內)
  function board(ctx, m, left, cy, h, open, hot, hotQ, tail) {
    var P = Art.palette, fullW = m.w, chipW = m.pad * 2 + m.titleW, w = lerp(chipW, fullW, open), top = cy - h / 2;
    ctx.save();
    rr(ctx, left + 2, top + 3, w, h, 7); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill();
    rr(ctx, left, top, w, h, 7); ctx.fillStyle = 'rgba(58,42,31,0.95)'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#180f09'; ctx.stroke();
    if (tail > 0) { // 指向角色的尖角
      ctx.save(); ctx.globalAlpha *= tail;
      ctx.beginPath(); ctx.moveTo(PX - 12, top + h - 1); ctx.lineTo(PX, top + h + 16); ctx.lineTo(PX + 12, top + h - 1); ctx.closePath();
      ctx.fillStyle = 'rgba(58,42,31,0.95)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = 'rgba(58,42,31,1)'; ctx.fillRect(PX - 10, top + h - 6, 20, 5);
      ctx.restore();
    }
    ctx.save(); rr(ctx, left, top, w, h, 7); ctx.clip();
    // 各組: 從標題牌右側滑出(open 0 時全部擠在標題牌底下)
    var x = left + m.pad + m.titleW, i;
    for (i = 0; i < GROUPS.length; i++) {
      var gp = clamp(open * GROUPS.length - i, 0, 1), g = GROUPS[i];
      var gx = lerp(left + m.pad, x + m.gap, gp);
      if (gp > 0) {
        ctx.save(); ctx.globalAlpha *= gp;
        if (i) { ctx.fillStyle = 'rgba(255,215,160,0.22)'; ctx.fillRect(gx - m.gap / 2 - 0.75, top + h * 0.22, 1.5, h * 0.56); }
        var isHot = i === hot, kx = gx, sc = isHot ? 1 + 0.12 * Math.sin(Math.PI * hotQ) : 1;
        for (var j = 0; j < g.k.length; j++) { var kw = keyW(ctx, g.k[j], m.px); Art.icons.key(ctx, g.k[j], kx + kw / 2, cy - 1.5, m.px * sc, isHot); kx += kw + 3; }
        txt(ctx, g.s, kx + 2, cy + 0.5, m.lpx * sc, isHot ? P.select : P.cream, 'left', true, 3, '#180f09');
        ctx.restore();
      }
      x += m.gap + m.gs[i];
    }
    ctx.restore();
    // 標題牌(拉片本體, 最上層)
    var th = h - 10;
    rr(ctx, left + m.pad * 0.5, cy - th / 2, m.titleW + m.pad * 0.6, th, 5); ctx.fillStyle = P.select; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#180f09'; ctx.stroke();
    txt(ctx, '操作方式', left + m.pad * 0.8 + m.titleW / 2, cy + 0.5, m.lpx, P.ink, 'center', true);
    ctx.restore();
    return w;
  }

  function world(ctx, t, pl) {
    Art.drawBackground(ctx, { theme: 'forest', t: t });
    var c, r;
    for (c = 0; c < 32; c++) for (r = 15; r < 18; r++) Art.drawGround(ctx, { x: 20 + c * 40, y: 20 + r * 40, theme: 'forest', open: { n: r === 15, e: false, s: false, w: false } });
    var plats = [[3, 6, 10], [19, 23, 11], [27, 30, 7]];
    for (var i = 0; i < plats.length; i++) for (c = plats[i][0]; c <= plats[i][1]; c++)
      Art.drawGround(ctx, { x: 20 + c * 40, y: 20 + plats[i][2] * 40, theme: 'forest', open: { n: true, s: true, w: c === plats[i][0], e: c === plats[i][1] } });
    Art.drawPickup(ctx, { x: 860, y: 420, kind: 'stone', t: t });
    Art.drawPickup(ctx, { x: 1140, y: 260, kind: 'crystal', t: t });
    Art.drawPlayer(ctx, pl);
  }
  function beeAt(tt) {
    if (tt < 4.8 || tt > 6.4) return null;
    var q = seg(tt, 4.8, 6.4);
    return { x: lerp(-30, 420, q), y: 66 + 14 * Math.sin(q * TAU * 1.5) };
  }
  function yieldAlpha(tt, R) {
    var n = 8, hit = 0;
    for (var i = 0; i < n; i++) {
      var b = beeAt(tt - i * 0.15 / (n - 1));
      if (b && b.x + 16 > R.x - 4 && b.x - 16 < R.x + R.w + 4 && b.y + 14 > R.y - 4 && b.y - 14 < R.y + R.h + 4) hit++;
    }
    return 1 - 0.7 * hit / n;
  }
  function caption(ctx, ph) {
    var items = ['① 在角色身上展開', '② 移動途中', '③ 固定在左上角'];
    ctx.save();
    rr(ctx, 420, 688, 440, 26, 13); ctx.fillStyle = 'rgba(10,8,6,0.72)'; ctx.fill();
    for (var i = 0; i < 3; i++) txt(ctx, items[i], 497 + i * 143, 701, 13, i === ph ? '#ffd84a' : 'rgba(243,230,200,0.45)', 'center', true);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: "ctrl-panel", id: "C", kind: "anim",
    size: [1280, 720],
    duration: 7,
    loop: true,
    draw: function (ctx, t) {
      t = ((t % 7) + 7) % 7;
      var P = Art.palette;
      var mb = measure(ctx, BIG), ms = measure(ctx, SMALL);
      // 小版超過最大寬就整體壓縮字級(保證右緣 < 340, 不碰教學橫幅)
      if (SMALL.x + ms.w > SMALL.x + SMALL.maxW) { var f = SMALL.maxW / ms.w; ms = measure(ctx, { px: SMALL.px * f, lpx: SMALL.lpx * f }); }
      var bigLeft = clamp(PX - mb.w / 2, 12, W - 12 - mb.w);

      // 角色: 逐鍵示範時做對應動作, 落定後往右跑
      var pl = { x: PX, y: PY, cls: 'sword', facing: 1, pose: 'idle', poseT: t, swingIdx: 0 };
      var hot = -1, hotQ = 0;
      if (t >= 0.8 && t < 2.8) {
        hot = Math.floor((t - 0.8) / 0.5); hotQ = ((t - 0.8) % 0.5) / 0.5;
        if (hot === 0) { pl.pose = 'run'; pl.facing = hotQ < 0.5 ? -1 : 1; pl.x = PX + 14 * Math.sin(hotQ * TAU) * -1; }
        else if (hot === 1) { pl.pose = hotQ < 0.5 ? 'rise' : 'fall'; pl.y = PY - 46 * Math.sin(Math.PI * hotQ); }
        else if (hot === 2) { pl.pose = 'slash'; pl.poseT = (hotQ * 0.5) % 0.25; pl.swingIdx = hotQ < 0.5 ? 0 : 1; }
        else { pl.pose = hotQ < 0.4 ? 'dash' : 'idle'; pl.x = PX + 22 * Math.sin(Math.PI * Math.min(1, hotQ / 0.4)); }
      }
      if (t >= 4.05) { pl.x = lerp(PX, PX + 300, seg(t, 4.05, 7)); pl.pose = 'run'; }

      ctx.save();
      world(ctx, t, pl);
      Art.drawHud(ctx, { mode: 'level', stock: { wood: 3, stone: 2, crystal: 0, core: 0 }, ratePerMin: {}, time: Math.max(0, t - 0.4), hp: 3, maxHp: 3 });
      var b = beeAt(t);
      if (b) Art.drawShooterBee(ctx, { x: b.x, y: b.y, facing: 1, state: 'fly', t: t });

      var ph = t < 3 ? 0 : (t < 4.05 ? 1 : 2);
      if (t >= 0.4) {
        ctx.save();
        if (t < 3.0) { // 彈出 + 逐鍵示範
          var pop = seg(t, 0.4, 0.65), sy = pop < 1 ? Math.max(0.02, eBack(pop)) : 1, sx = pop < 1 ? lerp(0.7, 1, eOut(pop)) : 1;
          ctx.globalAlpha *= seg(t, 0.4, 0.5);
          var tipY = BIG.cy + BIG.h / 2 + 16;
          ctx.translate(PX, tipY); ctx.scale(sx, sy); ctx.translate(-PX, -tipY);
          board(ctx, mb, bigLeft, BIG.cy, BIG.h, 1, hot, hotQ, 1);
        } else if (t < 3.3) { // 手風琴收合(以左緣為軸), 尖角收掉
          var c = eIn(seg(t, 3.0, 3.3));
          board(ctx, mb, bigLeft, BIG.cy, BIG.h, 1 - c, -1, 0, 1 - seg(t, 3.0, 3.1));
        } else if (t < 3.65) { // 拉片直線咻過去: 尺寸同時由大版拉片變小版拉片
          var z = seg(t, 3.3, 3.65), zs = z * z * (3 - 2 * z);
          var x0 = bigLeft, y0 = BIG.cy, x1 = SMALL.x, y1 = SMALL.cy;
          var cx = lerp(x0, x1, zs), cy = lerp(y0, y1, zs);
          var mm = { pad: lerp(mb.pad, ms.pad, zs), titleW: lerp(mb.titleW, ms.titleW, zs), gs: ms.gs, gap: ms.gap, w: 0 };
          var lpx = lerp(BIG.lpx, ms.lpx, zs), hh = lerp(BIG.h, SMALL.h, zs);
          // 速度線(往來的方向)
          var ang = Math.atan2(y0 - y1, x0 - x1), chipW = mm.pad * 2 + mm.titleW;
          ctx.save(); ctx.strokeStyle = 'rgba(255,240,200,0.75)'; ctx.lineCap = 'round';
          for (var i = -2; i <= 2; i++) {
            var ox = cx + chipW / 2 + Math.cos(ang + Math.PI / 2) * i * 7, oy = cy + Math.sin(ang + Math.PI / 2) * i * 7, len = (60 - Math.abs(i) * 14) * Math.sin(Math.PI * z);
            ctx.lineWidth = 3 - Math.abs(i) * 0.6; ctx.beginPath(); ctx.moveTo(ox + Math.cos(ang) * chipW * 0.6, oy + Math.sin(ang) * chipW * 0.6);
            ctx.lineTo(ox + Math.cos(ang) * (chipW * 0.6 + len), oy + Math.sin(ang) * (chipW * 0.6 + len)); ctx.stroke();
          }
          ctx.restore();
          // 拉長(沿移動方向)
          var st = 1 + 0.25 * Math.sin(Math.PI * z);
          ctx.translate(cx + chipW / 2, cy); ctx.rotate(ang); ctx.scale(st, 1 / st); ctx.rotate(-ang); ctx.translate(-(cx + chipW / 2), -cy);
          board(ctx, { pad: mm.pad, titleW: mm.titleW, gs: mm.gs, gap: mm.gap, w: mm.pad * 2 + mm.titleW, px: ms.px, lpx: lpx }, cx, cy, hh, 0, -1, 0, 0);
        } else { // 左上角拉開 → 固定
          var o = eOut(seg(t, 3.65, 4.05));
          var R = { x: SMALL.x, y: SMALL.cy - SMALL.h / 2, w: ms.w, h: SMALL.h };
          if (t >= 4.05) ctx.globalAlpha *= yieldAlpha(t, R);
          board(ctx, ms, SMALL.x, SMALL.cy, SMALL.h, o, -1, 0, 0);
          if (o < 1) { // 拉開時的右緣金光
            var edge = lerp(SMALL.x + ms.pad * 2 + ms.titleW, SMALL.x + ms.w, o);
            ctx.save(); ctx.globalAlpha *= 0.8 * (1 - o); ctx.fillStyle = P.select; ctx.fillRect(edge - 3, SMALL.cy - SMALL.h / 2 + 3, 3, SMALL.h - 6); ctx.restore();
          }
        }
        ctx.restore();
      }

      Art.drawSoundIcon(ctx, { x: 1250, y: 62, on: true });
      caption(ctx, ph);
      var dk = Math.max(seg(t, 6.7, 7), 1 - seg(t, 0, 0.3));
      if (dk > 0) { ctx.fillStyle = 'rgba(8,6,4,' + (0.85 * dk) + ')'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
  };
})();
