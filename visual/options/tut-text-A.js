// tut-text 方案 A: 固定橫幅 + 打字機
// 羊皮紙長橫幅固定停在資訊列下方(不跟著目標跑, 指向交給大箭頭); 字一個一個「打」出來, 墨色游標跟在字尾,
// 標點後停頓一拍; 打完游標閃爍, 橫幅右下角出現「Z 繼續」(鍵帽每 0.9 秒自己按一下 + ▼ 上下跳)。
// 接句: 按 Z 後不清空, 游標從句尾繼續打下一句。
(function () {
  var Art = window.Art, K = Art.palette, W = 1280, H = 720, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  function font(px) { return 'bold ' + Math.round(px) + 'px ' + FONT; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(q) { return 1 - Math.pow(1 - q, 3); }
  function mw(ctx, s, px) {
    ctx.font = font(px); var m = ctx.measureText(s), w = (m && isFinite(m.width)) ? m.width : 0;
    if (!(w > 0)) { w = 0; for (var i = 0; i < s.length; i++) w += /[\x00-\x7f]/.test(s.charAt(i)) ? px * 0.55 : px; }
    return w;
  }
  function keyW(ctx, px) { return Math.max(px * 1.7, mw(ctx, 'Z', px) + px * 0.9); }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  // 鍵帽: 平常用遊戲字典的石鍵帽(Art.icons.key, 金頂 = 此刻按得下去); down = 按下去那一下(帽頂沉 2.5px、亮一階)
  function keyCap(ctx, cx, cy, px, down) {
    if (!down) return Art.icons.key(ctx, 'Z', cx, cy, px, true);
    var w = keyW(ctx, px), h = px * 1.6;
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 4); ctx.fillStyle = K.selectDeep; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2 + 2.5, w, h, 4); ctx.fillStyle = '#fff0a0'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.font = font(px); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = K.ink; ctx.fillText('Z', cx, cy + 3);
    ctx.restore(); return w;
  }

  // ---------- 範例台詞與時間軸(三方案共用同一套台詞) ----------
  // {Z} = 句中鍵帽; cont = 顯示完、按 Z 後接在同一段後面逐字接上的下一句
  var MSG = [
    { s: '這是你', sc: 0 },
    { s: '這是素材,多多收集,不同素材有不同用途', sc: 1 },
    { s: '收集素材後可以修復通道, 解鎖更多可以去的地方', sc: 2 },
    { s: '直接按{Z}開始關卡吧!', sc: 3 },
    { s: '接著會不斷重演剛剛的通關歷程', cont: ', 源源不絕累積素材', sc: 4 }
  ];
  function toks(s) { var o = [], i = 0; while (i < s.length) { if (s.substr(i, 3) === '{Z}') { o.push({ k: 'Z' }); i += 3; } else { o.push({ c: s.charAt(i) }); i++; } } return o; }
  var CFG = { cps: 16, punct: 0.22, keyGap: 0.14, intro: 0.3, settle: 0.15, wait: 1.5, press: 0.2 };
  var S = (function () {
    var t = 0, list = [];
    MSG.forEach(function (m) {
      var e = { sc: m.sc, t0: t, tk: [], rt: [], prompts: [] };
      t += CFG.intro;
      (m.cont ? [m.s, m.cont] : [m.s]).forEach(function (p) {
        toks(p).forEach(function (k) {
          e.tk.push(k); e.rt.push(t);
          t += k.k ? CFG.keyGap : 1 / CFG.cps;
          if (k.c && /[,!]/.test(k.c)) t += CFG.punct;
        });
        t += CFG.settle;
        var a = t; t += CFG.wait; var b = t; t += CFG.press;
        e.prompts.push({ a: a, b: b, p: t });
      });
      e.t1 = t; list.push(e);
    });
    return { list: list, total: t };
  })();
  function frame(t) {
    t = ((t % S.total) + S.total) % S.total;
    for (var i = 0; i < S.list.length; i++) if (t < S.list[i].t1) return { e: S.list[i], t: t };
    return { e: S.list[S.list.length - 1], t: t };
  }
  function promptOf(e, t) {
    for (var i = 0; i < e.prompts.length; i++) { var p = e.prompts[i]; if (t >= p.a && t < p.p) return { age: t - p.a, down: t >= p.b }; }
    return null;
  }
  // 逐字排版(字寬量測; 標點不放行首)
  function layout(ctx, e, px, maxW, kpx) {
    var x = 0, line = 0, out = [];
    for (var i = 0; i < e.tk.length; i++) {
      var k = e.tk[i], w = k.k ? keyW(ctx, kpx) + 10 : mw(ctx, k.c, px);
      if (x + w > maxW && x > 0 && !(k.c && /[,!、。]/.test(k.c))) { x = 0; line++; }
      if (x === 0 && k.c === ' ') w = 0;
      out.push({ k: k, x: x, line: line, w: w, rt: e.rt[i] }); x += w;
    }
    return out;
  }

  // ---------- 底下的遊戲畫面(用遊戲現行畫法, 只為看出字在各種背景上都清楚) ----------
  var TGT = [{ x: 400, y: 556 }, { x: 760, y: 566 }, { x: 900, y: 548 }, { x: 788, y: 296 }, { x: 788, y: 296 }];
  var STOCK = { wood: 12, stone: 5, crystal: 3, core: 1 }, RATE = { wood: 6, stone: 2, crystal: 1, core: 0 };
  function scene(ctx, sc, t) {
    if (sc < 3) {
      var th = ['forest', 'cliff', 'mine'][sc];
      Art.drawBackground(ctx, { theme: th, t: t });
      for (var gx = 20; gx < W; gx += 40) for (var gy = 620; gy < H + 20; gy += 40) Art.drawGround(ctx, { x: gx, y: gy, theme: th, open: { n: gy === 620 } });
      Art.drawPlayer(ctx, { x: 400, y: 580, cls: 'sword', facing: 1, pose: 'idle' });
      if (sc === 1) ['wood', 'stone', 'crystal'].forEach(function (k, i) { Art.drawPickup(ctx, { x: 720 + i * 40, y: 585, kind: k, t: t + i * 0.3 }); });
      if (sc === 2) { Art.drawSiteSign(ctx, { x: 900, y: 576, role: 'shortcut', num: 1 }); Art.drawSiteSign(ctx, { x: 1060, y: 576, role: 'treasure', num: 2 }); }
      Art.drawHud(ctx, { mode: 'level', stock: STOCK, ratePerMin: RATE, time: 6.2, hp: 3, maxHp: 3 });
    } else {
      Art.drawMapBackground(ctx, { t: t });
      Art.drawLevelCard(ctx, { x: 700, y: 300, index: 1, name: '翠林入口', theme: 'forest', state: sc === 3 ? 'open' : 'cleared', devices: [null, null], rates: RATE, recordCls: 'sword', recordTime: 42.5, siteCount: 3, repairedCount: 0 });
      Art.drawHud(ctx, { mode: 'map', stock: STOCK, ratePerMin: RATE });
    }
    Art.drawSoundIcon(ctx, { x: 1250, y: 62, on: true });
  }
  // 暫定大箭頭(真正的造型看 tut-arrow 元素), 朝下指 (x, y)
  function arrowDown(ctx, x, y, t) {
    var o = 8 * (0.5 - 0.5 * Math.cos(t * TAU / 0.8));
    ctx.save(); ctx.translate(x, y - 6 - o);
    poly(ctx, [0, 0, 26, -30, 11, -30, 11, -66, -11, -66, -11, -30, -26, -30]);
    ctx.fillStyle = K.select; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.restore();
  }

  // ---------- 方案 A 本體 ----------
  var BX = 190, BY = 58, BW = 900, BH = 132, PX = 30, KPX = 24, LH = 46;
  function drawBanner(ctx, f) {
    var e = f.e, t = f.t, pr = promptOf(e, t), items = layout(ctx, e, PX, BW - 160, KPX);
    var lines = items.length ? items[items.length - 1].line + 1 : 1;
    var tx = BX + 44, ty = BY + BH / 2 - (lines - 1) * LH / 2;
    ctx.save();
    // 橫幅: 落影 + 羊皮紙 + 深邊 + 左側金條(和遊戲現行教學橫幅同一家族, 放大成兩行高)
    rr(ctx, BX, BY + 5, BW, BH, 10); ctx.fillStyle = 'rgba(10,6,4,0.5)'; ctx.fill();
    rr(ctx, BX, BY, BW, BH, 10); ctx.fillStyle = K.parch; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.10)'; ctx.fillRect(BX + 4, BY + BH - 10, BW - 8, 6);
    rr(ctx, BX + 1.5, BY + 1.5, BW - 3, BH - 3, 9); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, BX + 10, BY + 12, 9, BH - 24, 4); ctx.fillStyle = K.select; ctx.fill();
    // 按下 Z 那一下: 整條橫幅閃一層淡金(換句的回饋)
    if (pr && pr.down) { rr(ctx, BX, BY, BW, BH, 10); ctx.fillStyle = 'rgba(255,216,74,0.25)'; ctx.fill(); }
    // 字: 打字機 = 到時間就整個出現(不淡入), 最新的一字墨色略深一瞬(像剛落墨)
    var last = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i]; if (t < it.rt) break;
      var x = tx + it.x, y = ty + it.line * LH, age = t - it.rt;
      if (it.k.k) keyCap(ctx, x + 5 + keyW(ctx, KPX) / 2, y - 2, KPX, false);
      else { ctx.font = font(PX); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = age < 0.06 ? '#000000' : K.ink; ctx.fillText(it.k.c, x, y + 1); }
      last = it;
    }
    // 游標: 打字中實心不閃, 等按鍵時 0.5 秒閃一次
    var cx = last ? tx + last.x + last.w + 3 : tx, cl = last ? last.line : 0, typing = !pr;
    if (typing || Math.floor(t / 0.5) % 2 === 0) { ctx.fillStyle = K.ink; ctx.fillRect(cx, ty + cl * LH - PX * 0.55, 4, PX * 1.1); }
    // 「Z 繼續」: 橫幅右下角; 淡入 0.2 秒; 鍵帽每 0.9 秒自己按一下 + ▼ 上下跳
    if (pr) {
      var al = seg(pr.age, 0, 0.2), kx = BX + BW - 78, ky = BY + BH - 30;
      ctx.globalAlpha *= al;
      var tap = pr.down || (pr.age % 0.9) > 0.72;
      keyCap(ctx, kx, ky, 20, tap);
      ctx.font = font(18); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = K.inkDim; ctx.fillText('繼續', kx + 22, ky + 1);
      var bob = 4 * Math.abs(Math.sin(pr.age * Math.PI / 0.6));
      poly(ctx, [kx + 70, ky - 6 + bob, kx + 82, ky - 6 + bob, kx + 76, ky + 3 + bob]); ctx.fillStyle = K.selectDeep; ctx.fill();
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'tut-text', id: 'A', kind: 'anim',
    size: [W, H],
    duration: Math.round(S.total * 100) / 100,
    loop: true,
    draw: function (ctx, t) {
      var f = frame(t);
      ctx.save();
      scene(ctx, f.e.sc, t);
      arrowDown(ctx, TGT[f.e.sc].x, TGT[f.e.sc].y, t);
      drawBanner(ctx, f);
      ctx.restore();
    }
  };
})();
