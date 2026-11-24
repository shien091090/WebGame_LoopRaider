/* ctrl-panel 方案 A: 羊皮紙卷軸 — 整張清單原樣縮小, 沿弧線滑到左上角
 * 版面: 直式清單卡(上下兩根木軸的羊皮紙卷), 標題「操作方式」+ 4 列「鍵帽 | 功能」, 鍵帽一欄對齊, 字一欄對齊
 * 0.00~0.40 角色站著
 * 0.40~0.65 捲起的卷軸從角色胸口冒出、往上浮到頭頂上方並放大
 * 0.65~1.25 卷軸往下攤開(下軸往下滾), 清單一列一列露出; 攤開後卡底長出指向角色的小尖角
 * 1.25~3.00 停在角色頭上給玩家讀(第一個樣子: 在角色身上展開)
 * 3.00~4.00 尖角收起, 整張卡縮成 0.6 倍沿上拱弧線滑到左上角, 途中半捲(高度縮 25%)再攤回, 後方拖 5 顆金色光點(第二個樣子: 移動途中)
 * 4.00~4.30 落定: 木軸輕彈一下 + 金框閃一下
 * 4.30~7.00 固定在左上角 (18,54) 約 150×136(含木軸約 x 8~178、y 50~194; 第三個樣子); 射手蜂飛過卡片底下時整張退到 0.3 不透明讓路, 飛走後回到 1
 * 6.70~7.00 畫面暗下接回開頭(方案頁循環用, 遊戲裡沒有)
 * 鍵帽: Art.icons.key(遊戲現行石鍵帽); 角色、背景、地形、資訊列、聲音圖示、射手蜂: Art 現行畫法。
 */
(function () {
  var W = 1280, H = 720, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var ROWS = [{ k: ['←', '→'], s: '移動' }, { k: ['↑'], s: '跳躍' }, { k: ['Z'], s: '攻擊' }, { k: ['X'], s: '技能' }];
  var PX = 300, PY = 582;                 // 角色中心(判定框 28×36, 腳底 600)
  var BW = 250, BH = 226;                 // 卡片原尺寸(在角色身上時)
  var BIGX = PX - BW / 2, BIGY = 300;     // 在角色身上時卡片左上角(卡底 526, 角色頭頂 564)
  var KF = 0.6, FX = 18, FY = 54;         // 固定在左上角: 0.6 倍 → 紙 150×136 (18~168, 54~190); 含木軸 約 (8~178, 50~194)

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eInOut(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function star4(ctx, x, y, r) { var q = r * 0.28; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + q, y - q); ctx.lineTo(x + r, y); ctx.lineTo(x + q, y + q); ctx.lineTo(x, y + r); ctx.lineTo(x - q, y + q); ctx.lineTo(x - r, y); ctx.lineTo(x - q, y - q); ctx.closePath(); }
  function txt(ctx, s, x, y, px, col, align, bold, ow, oc) {
    ctx.font = (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (ow) { ctx.lineJoin = 'round'; ctx.lineWidth = ow; ctx.strokeStyle = oc || '#180f09'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function keyW(ctx, label, px) { ctx.font = 'bold ' + Math.round(px) + 'px ' + FONT; var m = ctx.measureText(label), w = (m && isFinite(m.width)) ? m.width : px; return Math.max(px * 1.7, w + px * 0.9); }

  // ---------- 場景 ----------
  function world(ctx, t, pl) {
    Art.drawBackground(ctx, { theme: 'forest', t: t });
    var c, r;
    for (c = 0; c < 32; c++) for (r = 15; r < 18; r++) Art.drawGround(ctx, { x: 20 + c * 40, y: 20 + r * 40, theme: 'forest', open: { n: r === 15, e: false, s: false, w: false } });
    var plats = [[2, 5, 11], [12, 16, 12], [21, 25, 9]];
    for (var i = 0; i < plats.length; i++) for (c = plats[i][0]; c <= plats[i][1]; c++)
      Art.drawGround(ctx, { x: 20 + c * 40, y: 20 + plats[i][2] * 40, theme: 'forest', open: { n: true, s: true, w: c === plats[i][0], e: c === plats[i][1] } });
    Art.drawPickup(ctx, { x: 980, y: 340, kind: 'wood', t: t });
    Art.drawPickup(ctx, { x: 560, y: 460, kind: 'stone', t: t });
    Art.drawPlayer(ctx, pl);
  }
  // 射手蜂: 4.8~6.4 秒從左邊飛過左上角(卡片底下)
  function beeAt(tt) {
    var q = seg(tt, 4.8, 6.4); if (tt < 4.8 || tt > 6.4) return null;
    return { x: lerp(-30, 420, q), y: 120 + 26 * Math.sin(q * TAU * 1.5) };
  }
  // 讓路: 過去 0.15 秒內有幾成時間蜂與卡片範圍(外擴 4)重疊 → alpha 1 → 0.3
  function yieldAlpha(tt, R) {
    var n = 8, hit = 0;
    for (var i = 0; i < n; i++) {
      var b = beeAt(tt - i * 0.15 / (n - 1));
      if (b && b.x + 16 > R.x - 4 && b.x - 16 < R.x + R.w + 4 && b.y + 14 > R.y - 4 && b.y - 14 < R.y + R.h + 4) hit++;
    }
    return 1 - 0.7 * hit / n;
  }

  // ---------- 卷軸卡(原點 = 卡片左上, 原尺寸單位) ----------
  function rod(ctx, y, w) {
    var g = ctx.createLinearGradient(0, y - 6, 0, y + 6); g.addColorStop(0, '#c98a4a'); g.addColorStop(0.5, '#8a5a2a'); g.addColorStop(1, '#4a2e14');
    rr(ctx, -8, y - 6, w + 16, 12, 6); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#180f09'; ctx.stroke();
    for (var s = -1; s <= 1; s += 2) {
      var kx = s < 0 ? -10 : w + 10;
      ctx.beginPath(); ctx.arc(kx, y, 7, 0, TAU); ctx.fillStyle = '#d9b47a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#180f09'; ctx.stroke();
    }
  }
  function card(ctx, h, tailA, flash) {
    var P = Art.palette;
    // 紙
    ctx.save();
    rr(ctx, 2, 4, BW, h, 4); ctx.fillStyle = 'rgba(10,6,4,0.4)'; ctx.fill();
    rr(ctx, 0, 0, BW, h, 4); ctx.fillStyle = P.parch; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = flash > 0 ? 'rgba(255,216,74,' + (0.6 + 0.4 * flash) + ')' : '#180f09'; if (flash > 0) ctx.lineWidth = 2 + 3 * flash; ctx.stroke();
    ctx.save(); rr(ctx, 0, 0, BW, h, 4); ctx.clip();
    ctx.fillStyle = 'rgba(120,90,40,0.10)'; for (var yy = 18; yy < BH; yy += 22) ctx.fillRect(6, yy, BW - 12, 1);
    // 標題
    ctx.fillStyle = P.select; rr(ctx, 14, 16, 6, 26, 3); ctx.fill();
    txt(ctx, '操作方式', BW / 2 + 4, 30, 22, P.ink, 'center', true);
    ctx.fillStyle = 'rgba(43,33,24,0.35)'; ctx.fillRect(18, 52, BW - 36, 1.5);
    // 4 列: 鍵帽欄中心 x 72, 功能字欄起點 x 128
    for (var i = 0; i < ROWS.length; i++) {
      var cy = 80 + i * 38, ks = ROWS[i].k, px = 18, gap = 6, tw = 0, j;
      for (j = 0; j < ks.length; j++) tw += keyW(ctx, ks[j], px) + (j ? gap : 0);
      var kx = 72 - tw / 2;
      for (j = 0; j < ks.length; j++) { var kw = keyW(ctx, ks[j], px); Art.icons.key(ctx, ks[j], kx + kw / 2, cy - 1, px, false); kx += kw + gap; }
      txt(ctx, ROWS[i].s, 128, cy + 1, 20, P.ink, 'left', true);
      if (i < ROWS.length - 1) { ctx.fillStyle = 'rgba(43,33,24,0.12)'; ctx.fillRect(24, cy + 19, BW - 48, 1); }
    }
    ctx.restore();
    // 指向角色的尖角(只在角色身上時)
    if (tailA > 0) {
      ctx.globalAlpha *= tailA;
      ctx.beginPath(); ctx.moveTo(BW / 2 - 12, h - 1); ctx.lineTo(BW / 2, h + 16); ctx.lineTo(BW / 2 + 12, h - 1); ctx.closePath();
      ctx.fillStyle = P.parch; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#180f09'; ctx.stroke();
      ctx.fillStyle = P.parch; ctx.fillRect(BW / 2 - 10, h - 9, 20, 9);
      ctx.globalAlpha /= tailA;
    }
    ctx.restore();
    rod(ctx, 0, BW); rod(ctx, h, BW);
  }

  // 卡片左上角沿弧線: 起點 (BIGX, BIGY) → 控制點 (BIGX − 40, 60) → 終點 (FX, FY); y 單調遞減, 不會碰到資訊列
  function pathAt(s) {
    var cx = BIGX - 40, cy = 60, u = 1 - s;
    return { x: u * u * BIGX + 2 * u * s * cx + s * s * FX, y: u * u * BIGY + 2 * u * s * cy + s * s * FY };
  }

  function caption(ctx, ph) {
    var items = ['① 在角色身上展開', '② 移動途中', '③ 固定在左上角'];
    ctx.save();
    rr(ctx, 420, 688, 440, 26, 13); ctx.fillStyle = 'rgba(10,8,6,0.72)'; ctx.fill();
    for (var i = 0; i < 3; i++) txt(ctx, items[i], 497 + i * 143, 701, 13, i === ph ? '#ffd84a' : 'rgba(243,230,200,0.45)', 'center', true);
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: "ctrl-panel", id: "A", kind: "anim",
    size: [1280, 720],
    duration: 7,
    loop: true,
    draw: function (ctx, t) {
      t = ((t % 7) + 7) % 7;
      var P = Art.palette;
      // 角色: 展開前後站著看卡, 落定後往右跑
      var run = seg(t, 4.3, 7), pl = { x: PX, y: PY, cls: 'sword', facing: 1, pose: 'idle', poseT: t };
      if (t >= 4.3) { pl.x = lerp(PX, PX + 330, run); pl.pose = 'run'; }
      ctx.save();
      world(ctx, t, pl);
      Art.drawHud(ctx, { mode: 'level', stock: { wood: 3, stone: 2, crystal: 0, core: 0 }, ratePerMin: {}, time: Math.max(0, t - 0.4), hp: 3, maxHp: 3 });

      var b = beeAt(t);
      if (b) Art.drawShooterBee(ctx, { x: b.x, y: b.y, facing: 1, state: 'fly', t: t });

      var ph = t < 3 ? 0 : (t < 4 ? 1 : 2);
      if (t >= 0.4) {
        ctx.save();
        if (t < 0.65) { // 捲起的卷軸從胸口浮上來
          var q = eOut(seg(t, 0.4, 0.65)), k0 = lerp(0.25, 1, q);
          ctx.globalAlpha *= q;
          ctx.translate(lerp(PX, BIGX + BW / 2, q), lerp(PY - 4, BIGY, q)); ctx.scale(k0, k0); ctx.translate(-BW / 2, 0);
          card(ctx, 0, 0, 0);
        } else if (t < 3) { // 攤開 → 停在頭上
          var u = eOut(seg(t, 0.65, 1.25)), tail = seg(t, 1.15, 1.3);
          ctx.translate(BIGX, BIGY);
          card(ctx, Math.max(0, BH * u), tail, 0);
        } else if (t < 4) { // 縮小沿弧線滑行, 途中半捲, 拖金色光點
          var s = eInOut(seg(t, 3, 4)), kk = lerp(1, KF, s), hh = BH * (1 - 0.25 * Math.sin(Math.PI * s));
          var tailB = 1 - seg(t, 3, 3.12);
          for (var i = 5; i >= 1; i--) { // 光點: 卡片中心過去的位置
            var sp = eInOut(seg(t - i * 0.05, 3, 4)); if (sp <= 0) continue;
            var pp = pathAt(sp), pk = lerp(1, KF, sp);
            ctx.save(); ctx.globalAlpha *= 0.65 * (1 - i / 6);
            star4(ctx, pp.x + BW * pk / 2, pp.y + BH * pk / 2, 8 - i); ctx.fillStyle = P.select; ctx.fill(); ctx.restore();
          }
          var p = pathAt(s);
          ctx.translate(p.x, p.y); ctx.scale(kk, kk);
          card(ctx, hh, tailB, 0);
        } else { // 固定左上角; 落定時輕彈 + 金框閃, 之後蜂飛過時讓路
          var a = seg(t, 4, 4.3), bounce = 1 + 0.05 * Math.sin(Math.PI * a), fl = a < 1 ? 1 - a : 0;
          var R = { x: FX - 6, y: FY - 4, w: BW * KF + 12, h: BH * KF + 8 };
          ctx.globalAlpha *= yieldAlpha(t, R);
          ctx.translate(FX + BW * KF / 2, FY); ctx.scale(KF * bounce, KF * bounce); ctx.translate(-BW / 2, 0);
          card(ctx, BH, 0, fl);
          if (fl > 0) { ctx.globalAlpha *= fl; for (var j = 0; j < 4; j++) { star4(ctx, j % 2 ? BW + 14 : -14, j < 2 ? -8 : BH + 8, 10 * fl); ctx.fillStyle = P.select; ctx.fill(); } }
        }
        ctx.restore();
      }

      Art.drawSoundIcon(ctx, { x: 1250, y: 62, on: true });
      caption(ctx, ph);
      // 循環接縫(方案頁專用)
      var dk = Math.max(seg(t, 6.7, 7), 1 - seg(t, 0, 0.3));
      if (dk > 0) { ctx.fillStyle = 'rgba(8,6,4,' + (0.85 * dk) + ')'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
  };
})();
