// tut-text 方案 C: 全寬字幕條 + 每字淡入上浮
// 畫面最下方一條橫貫全寬的半透明木板字幕條(壓在地面磚上, 不擋遊玩層), 大字置中;
// 每個字從下方 16px 淡入浮上定位, 字尾跟著一團淡金餘光往右推進(像一道光掃過句子); 換句時舊句往上淡出, 字幕條上緣走一道金光。
// 「Z 繼續」: 字幕條右端, 三個 › 一路往鍵帽流過去 + 鍵帽每 0.9 秒按一下; 接句時舊字不動, 新字接在句尾繼續浮上來。
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

  // ---------- 範例台詞與時間軸 ----------
  var MSG = [
    { s: '這是你', sc: 0 },
    { s: '這是素材,多多收集,不同素材有不同用途', sc: 1 },
    { s: '收集素材後可以修復通道, 解鎖更多可以去的地方', sc: 2 },
    { s: '直接按{Z}開始關卡吧!', sc: 3 },
    { s: '接著會不斷重演剛剛的通關歷程', cont: ', 源源不絕累積素材', sc: 4 }
  ];
  function toks(s) { var o = [], i = 0; while (i < s.length) { if (s.substr(i, 3) === '{Z}') { o.push({ k: 'Z' }); i += 3; } else { o.push({ c: s.charAt(i) }); i++; } } return o; }
  var CFG = { cps: 15, punct: 0.15, keyGap: 0.14, intro: 0.4, settle: 0.4, wait: 1.5, press: 0.35 };
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
    for (var i = 0; i < S.list.length; i++) if (t < S.list[i].t1) return { e: S.list[i], t: t, i: i };
    return { e: S.list[S.list.length - 1], t: t, i: S.list.length - 1 };
  }
  function promptOf(e, t) {
    for (var i = 0; i < e.prompts.length; i++) { var p = e.prompts[i]; if (t >= p.a && t < p.p) return { age: t - p.a, down: t >= p.b, dq: (t - p.b) / (p.p - p.b), last: i === e.prompts.length - 1 }; }
    return null;
  }
  function layout(ctx, e, px, maxW, kpx) {
    var x = 0, line = 0, out = [], lw = [0];
    for (var i = 0; i < e.tk.length; i++) {
      var k = e.tk[i], w = k.k ? keyW(ctx, kpx) + 12 : mw(ctx, k.c, px);
      if (x + w > maxW && x > 0 && !(k.c && /[,!、。]/.test(k.c))) { x = 0; line++; lw.push(0); }
      if (x === 0 && k.c === ' ') w = 0;
      out.push({ k: k, x: x, line: line, w: w, rt: e.rt[i] }); x += w; lw[line] = x;
    }
    return { items: out, lw: lw };
  }

  // ---------- 底下的遊戲畫面(遊戲現行畫法) ----------
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
  function arrowDown(ctx, x, y, t) { // 暫定大箭頭(造型看 tut-arrow 元素)
    var o = 8 * (0.5 - 0.5 * Math.cos(t * TAU / 0.8));
    ctx.save(); ctx.translate(x, y - 6 - o);
    poly(ctx, [0, 0, 26, -30, 11, -30, 11, -66, -11, -66, -11, -30, -26, -30]);
    ctx.fillStyle = K.select; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.restore();
  }

  // ---------- 方案 C 本體 ----------
  var BY = 606, BH = 114, PX = 34, KPX = 26, LH = 46, MAXW = 960;
  function drawStrip(ctx, f) {
    var e = f.e, t = f.t, pr = promptOf(e, t);
    ctx.save();
    // 字幕條: 半透明深木板(0.9)橫貫全寬 + 上緣深邊 + 金線 + 淡板縫
    ctx.fillStyle = 'rgba(42,30,21,0.9)'; ctx.fillRect(0, BY, W, BH);
    ctx.fillStyle = 'rgba(33,22,14,0.9)'; ctx.fillRect(0, BY + 56, W, 1.5);
    ctx.fillStyle = K.edge; ctx.fillRect(0, BY - 3, W, 4);
    ctx.fillStyle = K.select; ctx.fillRect(0, BY + 1, W, 2);
    // 新句開場: 上緣金線從左走到右一道亮光
    var sw = seg(t, e.t0, e.t0 + CFG.intro + 0.2);
    if (sw > 0 && sw < 1) {
      var sx = -120 + (W + 240) * eOut(sw);
      var g = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
      g.addColorStop(0, 'rgba(255,240,170,0)'); g.addColorStop(0.5, 'rgba(255,248,210,0.95)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 120, BY - 2, 240, 6);
    }
    // 字: 每行置中(以整段含接句先排好, 打字中不會左右跳); 每字 0.4 秒淡入 + 從下方 16px 浮上
    var L = layout(ctx, e, PX, MAXW, KPX), lines = L.lw.length, y0 = BY + BH / 2 - (lines - 1) * LH / 2 + 2;
    var outQ = (pr && pr.down && pr.last) ? pr.dq : 0; // 換句: 舊句往上淡出
    ctx.save();
    ctx.globalAlpha *= 1 - outQ; ctx.translate(0, -18 * eOut(outQ));
    var head = null;
    for (var i = 0; i < L.items.length; i++) {
      var it = L.items[i]; if (t < it.rt) break;
      var age = t - it.rt, q = seg(age, 0, 0.4), x = (W - L.lw[it.line]) / 2 - 40 + it.x, y = y0 + it.line * LH + 16 * (1 - eOut(q));
      ctx.save(); ctx.globalAlpha *= eOut(q);
      if (it.k.k) keyCap(ctx, x + 6 + keyW(ctx, KPX) / 2, y - 2, KPX, false);
      else if (it.k.c !== ' ') {
        ctx.font = font(PX); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        var glow = 1 - seg(age, 0, 0.6); // 剛浮上來的字外圈淡金餘光
        if (glow > 0) { ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(255,216,74,' + (0.45 * glow).toFixed(3) + ')'; ctx.strokeText(it.k.c, x, y + 1); }
        ctx.lineWidth = 7; ctx.strokeStyle = K.edge; ctx.strokeText(it.k.c, x, y + 1);
        ctx.fillStyle = '#fff6e0'; ctx.fillText(it.k.c, x, y + 1);
      }
      ctx.restore();
      head = { x: x + it.w, y: y0 + it.line * LH, age: age };
    }
    // 句尾光團: 打字中跟在最新一字後面, 停下 0.4 秒後散掉
    if (head && !pr) {
      var hq = 1 - seg(head.age, 0.2, 0.6);
      if (hq > 0) {
        var rg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 30);
        rg.addColorStop(0, 'rgba(255,236,150,' + (0.55 * hq).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = rg; ctx.fillRect(head.x - 30, head.y - 30, 60, 60);
      }
    }
    ctx.restore();
    // 「Z 繼續」: 右端; 三個 › 依序亮起往鍵帽流 + 鍵帽每 0.9 秒按一下
    if (pr) {
      var pa = seg(pr.age, 0, 0.25), kx = 1206, ky = BY + 46;
      ctx.save(); ctx.globalAlpha *= pa;
      for (var c = 0; c < 3; c++) {
        var ph = ((pr.age * 1.6 - c * 0.22) % 1 + 1) % 1, ca = 0.25 + 0.75 * Math.max(0, 1 - Math.abs(ph - 0.5) * 3);
        var cx0 = kx - 66 + c * 13;
        ctx.beginPath(); ctx.moveTo(cx0, ky - 8); ctx.lineTo(cx0 + 7, ky); ctx.lineTo(cx0, ky + 8);
        ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,216,74,' + ca.toFixed(3) + ')'; ctx.stroke();
      }
      keyCap(ctx, kx, ky, 22, pr.down || (pr.age % 0.9) > 0.72);
      ctx.font = font(16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4; ctx.strokeStyle = K.edge; ctx.strokeText('繼續', kx, ky + 36); ctx.fillStyle = K.cream; ctx.fillText('繼續', kx, ky + 36);
      ctx.restore();
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'tut-text', id: 'C', kind: 'anim',
    size: [W, H],
    duration: Math.round(S.total * 100) / 100,
    loop: true,
    draw: function (ctx, t) {
      var f = frame(t);
      ctx.save();
      scene(ctx, f.e.sc, t);
      arrowDown(ctx, TGT[f.e.sc].x, TGT[f.e.sc].y, t);
      drawStrip(ctx, f);
      ctx.restore();
    }
  };
})();
