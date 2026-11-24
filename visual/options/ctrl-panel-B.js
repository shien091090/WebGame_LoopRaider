/* ctrl-panel 方案 B: 按鍵環繞角色 — 鍵帽按「它讓角色往哪動」擺在身邊, 再一顆一顆飛去左上角拼成鍵盤小圖
 * 版面(在角色身上): ← 在身體左、→ 在身體右、↑ 在頭頂、Z / X 在前上方; 每顆鍵帽旁一張小羊皮紙標功能; 標題緞帶「操作方式」在最上
 *   角色到每顆鍵畫一條淡金虛線(「這個鍵讓我往這邊」)。
 * 版面(左上角): 深色木板 (10,46) 212×88 = 標題列 + 左邊方向鍵組(↑ 在上, ← → 在下, 照鍵盤排法)+ 右邊 Z X 並排, 功能小字貼在鍵下 / 鍵旁
 * 0.00~0.40 角色站著
 * 0.40~1.20 鍵帽依序從角色身上彈出到各自位置(← → ↑ Z X, 間隔 0.12 秒, 回彈), 最後標題緞帶落下
 * 1.20~3.00 停在角色身邊給玩家讀(第一個樣子)
 * 3.00~3.25 左上角木板先淡入(空鍵位用凹槽虛線標出)
 * 3.05~4.15 標題先飛、之後每顆鍵(連同功能字)間隔 0.1 秒沿上拱弧線飛去自己的鍵位, 邊飛邊縮小, 尾巴拖一道淡金弧線(第二個樣子)
 *            兩張「移動」字卡在半空合成一張
 * 每顆落位時壓一下(1.15 → 1)+ 一顆小金星
 * 4.15~7.00 固定在左上角(第三個樣子); 射手蜂飛過木板底下時整塊退到 0.3 不透明讓路
 * 6.70~7.00 畫面暗下接回開頭(方案頁循環用)
 */
(function () {
  var W = 1280, H = 720, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var PX = 640, PY = 582;
  var PLATE = { x: 10, y: 46, w: 212, h: 88 };
  // 每一項: 在角色身邊的位置(鍵中心)、字卡相對鍵的位置; 落位後的鍵中心、字相對位置
  // big: 鍵 px 22、字 16; small: 鍵 px 13、字 11
  var ITEMS = [
    { key: '←', s: '移動', bx: PX - 70, by: PY - 8, bl: [-58, 0], sx: 34, sy: 104, sl: [20, 20] },
    { key: '→', s: '移動', bx: PX + 70, by: PY - 8, bl: [58, 0], sx: 70, sy: 104, sl: [-16, 20] },
    { key: '↑', s: '跳躍', bx: PX, by: PY - 82, bl: [0, -34], sx: 52, sy: 80, sl: [34, 0] },
    { key: 'Z', s: '攻擊', bx: PX + 78, by: PY - 150, bl: [0, -34], sx: 142, sy: 94, sl: [0, 24] },
    { key: 'X', s: '技能', bx: PX + 150, by: PY - 150, bl: [0, -34], sx: 186, sy: 94, sl: [0, 24] }
  ];
  var TITLE = { bx: PX + 30, by: PY - 236, sx: 60, sy: 58 };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eBack(p) { p = clamp(p, 0, 1); var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function eInOut(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star4(ctx, x, y, r) { var q = r * 0.28; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + q, y - q); ctx.lineTo(x + r, y); ctx.lineTo(x + q, y + q); ctx.lineTo(x, y + r); ctx.lineTo(x - q, y + q); ctx.lineTo(x - r, y); ctx.lineTo(x - q, y - q); ctx.closePath(); }
  function txt(ctx, s, x, y, px, col, align, bold, ow, oc) {
    ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (ow) { ctx.lineJoin = 'round'; ctx.lineWidth = ow; ctx.strokeStyle = oc || '#180f09'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px) { ctx.font = 'bold ' + Math.round(px) + 'px ' + FONT; var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  function keyW(ctx, label, px) { return Math.max(px * 1.7, tw(ctx, label, px) + px * 0.9); }

  // ---------- 場景 ----------
  function world(ctx, t, pl) {
    Art.drawBackground(ctx, { theme: 'forest', t: t });
    var c, r;
    for (c = 0; c < 32; c++) for (r = 15; r < 18; r++) Art.drawGround(ctx, { x: 20 + c * 40, y: 20 + r * 40, theme: 'forest', open: { n: r === 15, e: false, s: false, w: false } });
    var plats = [[1, 4, 6], [9, 12, 11], [24, 28, 10]];
    for (var i = 0; i < plats.length; i++) for (c = plats[i][0]; c <= plats[i][1]; c++)
      Art.drawGround(ctx, { x: 20 + c * 40, y: 20 + plats[i][2] * 40, theme: 'forest', open: { n: true, s: true, w: c === plats[i][0], e: c === plats[i][1] } });
    Art.drawPickup(ctx, { x: 1060, y: 380, kind: 'crystal', t: t });
    Art.drawPickup(ctx, { x: 420, y: 420, kind: 'wood', t: t });
    Art.drawPlayer(ctx, pl);
  }
  function beeAt(tt) {
    if (tt < 4.8 || tt > 6.4) return null;
    var q = seg(tt, 4.8, 6.4);
    return { x: lerp(-30, 420, q), y: 104 + 22 * Math.sin(q * TAU * 1.5) };
  }
  function yieldAlpha(tt, R) {
    var n = 8, hit = 0;
    for (var i = 0; i < n; i++) {
      var b = beeAt(tt - i * 0.15 / (n - 1));
      if (b && b.x + 16 > R.x - 4 && b.x - 16 < R.x + R.w + 4 && b.y + 14 > R.y - 4 && b.y - 14 < R.y + R.h + 4) hit++;
    }
    return 1 - 0.7 * hit / n;
  }

  // ---------- 零件 ----------
  function chip(ctx, s, cx, cy, px, a) { // 羊皮紙小字卡(在角色身邊時)
    var w = tw(ctx, s, px) + px * 0.9, h = px * 1.55, P = Art.palette;
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, cx - w / 2, cy - h / 2 + 2, w, h, 5); ctx.fillStyle = 'rgba(10,6,4,0.4)'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 5); ctx.fillStyle = P.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#180f09'; ctx.stroke();
    txt(ctx, s, cx, cy + 0.5, px, P.ink, 'center', true);
    ctx.restore();
  }
  function plainLabel(ctx, s, cx, cy, px, a) { // 木板上的淺字(落位後)
    ctx.save(); ctx.globalAlpha *= a; txt(ctx, s, cx, cy, px, Art.palette.cream, 'center', true, 3, '#180f09'); ctx.restore();
  }
  function ribbon(ctx, cx, cy, k, a) { // 標題緞帶
    var P = Art.palette;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(k, k);
    var w = 150, h = 34;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 18, -h / 2 + 6); ctx.lineTo(-w / 2, -h / 2 + 6); ctx.lineTo(-w / 2, h / 2 + 6); ctx.lineTo(-w / 2 - 18, h / 2 + 6); ctx.lineTo(-w / 2 - 10, 6); ctx.closePath();
    ctx.fillStyle = P.selectDeep; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#180f09'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2 + 18, -h / 2 + 6); ctx.lineTo(w / 2, -h / 2 + 6); ctx.lineTo(w / 2, h / 2 + 6); ctx.lineTo(w / 2 + 18, h / 2 + 6); ctx.lineTo(w / 2 + 10, 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    rr(ctx, -w / 2, -h / 2, w, h, 4); ctx.fillStyle = P.select; ctx.fill(); ctx.stroke();
    txt(ctx, '操作方式', 0, 1, 22, P.ink, 'center', true);
    ctx.restore();
  }
  function plate(ctx, a, slots) { // 左上角木板; slots = 空鍵位虛線
    var P = Art.palette, x = PLATE.x, y = PLATE.y, w = PLATE.w, h = PLATE.h;
    ctx.save(); ctx.globalAlpha *= a;
    rr(ctx, x + 2, y + 3, w, h, 8); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = 'rgba(58,42,31,0.94)'; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip(); ctx.fillStyle = '#21160e'; ctx.fillRect(x, y + 24, w, 1.5); ctx.fillRect(x, y + 60, w, 1.5); ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = '#180f09'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,160,0.25)'; ctx.fillRect(x + 118, y + 30, 1.5, h - 40); // 方向鍵組 | 動作鍵 分隔
    var nails = [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]];
    for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(nails[i][0], nails[i][1], 2.2, 0, TAU); ctx.fillStyle = P.nail; ctx.fill(); }
    if (slots > 0) {
      ctx.globalAlpha *= slots; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(243,230,200,0.6)';
      for (var j = 0; j < ITEMS.length; j++) rr(ctx, ITEMS[j].sx - 11, ITEMS[j].sy - 10, 22, 21, 4), ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  // 上拱弧線
  function arcPt(x0, y0, x1, y1, s, lift) {
    var cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - lift, u = 1 - s;
    return { x: u * u * x0 + 2 * u * s * cx + s * s * x1, y: Math.max(58, u * u * y0 + 2 * u * s * cy + s * s * y1) };
  }
  function caption(ctx, ph) {
    var items = ['① 在角色身上展開', '② 移動途中', '③ 固定在左上角'];
    ctx.save();
    rr(ctx, 420, 688, 440, 26, 13); ctx.fillStyle = 'rgba(10,8,6,0.72)'; ctx.fill();
    for (var i = 0; i < 3; i++) txt(ctx, items[i], 497 + i * 143, 701, 13, i === ph ? '#ffd84a' : 'rgba(243,230,200,0.45)', 'center', true);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: "ctrl-panel", id: "B", kind: "anim",
    size: [1280, 720],
    duration: 7,
    loop: true,
    draw: function (ctx, t) {
      t = ((t % 7) + 7) % 7;
      var P = Art.palette, i;
      var pl = { x: PX, y: PY, cls: 'sword', facing: 1, pose: 'idle', poseT: t };
      if (t >= 4.3) { pl.x = lerp(PX, PX + 300, seg(t, 4.3, 7)); pl.pose = 'run'; }
      ctx.save();
      world(ctx, t, pl);
      Art.drawHud(ctx, { mode: 'level', stock: { wood: 3, stone: 2, crystal: 0, core: 0 }, ratePerMin: {}, time: Math.max(0, t - 0.4), hp: 3, maxHp: 3 });
      var b = beeAt(t);
      if (b) Art.drawShooterBee(ctx, { x: b.x, y: b.y, facing: 1, state: 'fly', t: t });

      var ph = t < 3 ? 0 : (t < 4.15 ? 1 : 2);
      var R = { x: PLATE.x, y: PLATE.y, w: PLATE.w, h: PLATE.h }, ya = t >= 4.15 ? yieldAlpha(t, R) : 1;

      // 左上角木板(3.0 起淡入, 鍵位虛線在鍵到之前顯示)
      var pa = seg(t, 3, 3.25);
      if (pa > 0) { ctx.save(); ctx.globalAlpha *= ya; plate(ctx, pa, 1 - seg(t, 3.9, 4.15)); ctx.restore(); }

      // 角色身邊的虛線(只在展開時)
      var la = seg(t, 1.0, 1.3) * (1 - seg(t, 3, 3.2));
      if (la > 0) {
        ctx.save(); ctx.globalAlpha *= 0.55 * la; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 20; ctx.lineWidth = 2; ctx.strokeStyle = P.select;
        for (i = 0; i < ITEMS.length; i++) { ctx.beginPath(); ctx.moveTo(PX, PY - 6); ctx.lineTo(lerp(PX, ITEMS[i].bx, 0.82), lerp(PY - 6, ITEMS[i].by, 0.82)); ctx.stroke(); }
        ctx.setLineDash([]); ctx.restore();
      }

      // 標題: 1.0 落下 → 3.05 飛
      if (t >= 1.0) {
        var tf = seg(t, 3.05, 3.6), ts = eInOut(tf);
        if (tf <= 0) {
          var td = eBack(seg(t, 1.0, 1.3));
          ribbon(ctx, TITLE.bx, TITLE.by - 30 * (1 - td), 1, seg(t, 1.0, 1.15));
        } else if (tf < 1) {
          var tp = arcPt(TITLE.bx, TITLE.by, TITLE.sx + 40, TITLE.sy, ts, 60);
          ribbon(ctx, tp.x, tp.y, lerp(1, 0.5, ts), 1 - seg(tf, 0.7, 1));
          ctx.save(); ctx.globalAlpha *= seg(tf, 0.6, 1); ctx.globalAlpha *= ya; txt(ctx, '操作方式', PLATE.x + 16, TITLE.sy, 13, P.select, 'left', true, 3, '#180f09'); ctx.restore();
        } else {
          ctx.save(); ctx.globalAlpha *= ya; txt(ctx, '操作方式', PLATE.x + 16, TITLE.sy, 13, P.select, 'left', true, 3, '#180f09'); ctx.restore();
        }
      }

      // 鍵帽
      for (i = 0; i < ITEMS.length; i++) {
        var it = ITEMS[i], t0 = 0.4 + i * 0.12;
        if (t < t0) continue;
        var f0 = 3.15 + i * 0.1, f1 = f0 + 0.55, kx, ky, kpx, lx, ly, lpx, lab = 'chip', la2 = 1, sq = 1;
        if (t < f0) { // 從身上彈出 → 停在身邊
          var p = eBack(seg(t, t0, t0 + 0.3)), pe = seg(t, t0, t0 + 0.3);
          kx = lerp(PX, it.bx, pe < 1 ? eOut(pe) : 1); ky = lerp(PY - 6, it.by, pe < 1 ? eOut(pe) : 1);
          kpx = 22 * Math.max(0.05, p); lx = kx + it.bl[0]; ly = ky + it.bl[1]; lpx = 16; la2 = seg(t, t0 + 0.2, t0 + 0.4);
        } else if (t < f1) { // 飛行
          var s = eInOut(seg(t, f0, f1)), q = arcPt(it.bx, it.by, it.sx, it.sy, s, 90);
          // 拖尾: 走過的弧線
          ctx.save(); ctx.globalAlpha *= 0.45; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = P.select; ctx.beginPath();
          for (var j = 0; j <= 8; j++) { var sj = Math.max(0, s - 0.25 + j * 0.25 / 8), qj = arcPt(it.bx, it.by, it.sx, it.sy, sj, 90); if (j) ctx.lineTo(qj.x, qj.y); else ctx.moveTo(qj.x, qj.y); }
          ctx.stroke(); ctx.restore();
          kx = q.x; ky = q.y; kpx = lerp(22, 13, s);
          lx = kx + lerp(it.bl[0], it.sl[0], s); ly = ky + lerp(it.bl[1], it.sl[1], s); lpx = lerp(16, 11, s);
          lab = s < 0.7 ? 'chip' : 'plain'; la2 = 1;
          if (s > 0.85 && i === 1) la2 = 0; // 兩張「移動」在空中合成一張: → 的字卡併進 ← 的
          if (i === 1) { lx = lerp(lx, ITEMS[0].sx + ITEMS[0].sl[0], s); ly = lerp(ly, ITEMS[0].sy + ITEMS[0].sl[1], s); }
        } else { // 落位
          var land = seg(t, f1, f1 + 0.15);
          sq = 1 + 0.15 * Math.sin(Math.PI * land);
          kx = it.sx; ky = it.sy; kpx = 13 * sq; lx = kx + it.sl[0]; ly = ky + it.sl[1]; lpx = 11; lab = 'plain'; la2 = i === 1 ? 0 : 1;
          if (land < 1) { ctx.save(); ctx.globalAlpha *= (1 - land); star4(ctx, kx + 12, ky - 10, 6); ctx.fillStyle = P.select; ctx.fill(); ctx.restore(); }
        }
        ctx.save(); if (t >= f1) ctx.globalAlpha *= ya;
        if (la2 > 0) { if (lab === 'chip') chip(ctx, it.s, lx, ly, lpx, la2); else plainLabel(ctx, it.s, lx, ly, lpx, la2); }
        Art.icons.key(ctx, it.key, kx, ky, kpx, false);
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
