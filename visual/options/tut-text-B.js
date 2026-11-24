// tut-text 方案 B: 貼著目標的木板泡泡 + 每字彈跳
// 深色木板泡泡浮在被指物件正上方(尾巴朝下接大箭頭), 換句時泡泡收掉、在下一個目標上方彈出來;
// 每個字從底下彈起再落定(縮放回彈), 剛出現的字是金色、0.3 秒內退成米白; 關鍵詞(你 / 素材 / 修復通道 / 累積素材)常駐金色。
// 「Z 繼續」: 鍵帽騎在泡泡右下角框線上, 每秒往外擴一圈金環; 接句時泡泡不收, 新字接在句尾繼續彈出。
(function () {
  var Art = window.Art, K = Art.palette, W = 1280, H = 720, TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  function font(px) { return 'bold ' + Math.round(px) + 'px ' + FONT; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(q) { return 1 - Math.pow(1 - q, 3); }
  function eBack(q) { var c = 1.9; q -= 1; return 1 + (c + 1) * q * q * q + c * q * q; }
  function hexRgb(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mix(a, b, u) { var p = hexRgb(a), q = hexRgb(b); u = clamp(u, 0, 1); return 'rgb(' + Math.round(p[0] + (q[0] - p[0]) * u) + ',' + Math.round(p[1] + (q[1] - p[1]) * u) + ',' + Math.round(p[2] + (q[2] - p[2]) * u) + ')'; }
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
  // {Z} = 句中鍵帽; [ ] = 關鍵詞(本方案常駐金色); cont = 按 Z 後接在同一段後面的下一句
  var MSG = [
    { s: '這是[你]', sc: 0 },
    { s: '這是[素材],多多收集,不同素材有不同用途', sc: 1 },
    { s: '收集素材後可以[修復通道], 解鎖更多可以去的地方', sc: 2 },
    { s: '直接按{Z}開始關卡吧!', sc: 3 },
    { s: '接著會不斷重演剛剛的通關歷程', cont: ', 源源不絕[累積素材]', sc: 4 }
  ];
  function toks(s) {
    var o = [], i = 0, hl = false;
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === '[') { hl = true; i++; } else if (c === ']') { hl = false; i++; }
      else if (s.substr(i, 3) === '{Z}') { o.push({ k: 'Z' }); i += 3; }
      else { o.push({ c: c, hl: hl }); i++; }
    }
    return o;
  }
  var CFG = { cps: 13, punct: 0.18, keyGap: 0.16, intro: 0.32, settle: 0.32, wait: 1.5, press: 0.26 };
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
    for (var i = 0; i < e.prompts.length; i++) { var p = e.prompts[i]; if (t >= p.a && t < p.p) return { age: t - p.a, down: t >= p.b, dq: (t - p.b) / (p.p - p.b), last: i === e.prompts.length - 1 }; }
    return null;
  }
  function layout(ctx, e, px, maxW, kpx) {
    var x = 0, line = 0, out = [], lw = [0];
    for (var i = 0; i < e.tk.length; i++) {
      var k = e.tk[i], w = k.k ? keyW(ctx, kpx) + 10 : mw(ctx, k.c, px);
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

  // ---------- 方案 B 本體 ----------
  var PX = 30, KPX = 24, LH = 46, PADX = 30, PADY = 22, MAXW = 560;
  function drawBubble(ctx, f) {
    var e = f.e, t = f.t, pr = promptOf(e, t), tg = TGT[e.sc];
    var L = layout(ctx, e, PX, MAXW, KPX), lines = L.lw.length, maxLw = 0;
    for (var i = 0; i < lines; i++) maxLw = Math.max(maxLw, L.lw[i]);
    // 泡泡大小以整段(含接句)先排好, 打字中不會變形; 寬度至少容得下右下角鍵帽
    var bw = Math.max(200, maxLw + PADX * 2 + 24), bh = lines * LH + PADY * 2;
    var bottom = tg.y - 100, by = Math.max(52, bottom - bh), bx = clamp(tg.x - bw / 2, 20, W - 20 - bw);
    var tailX = clamp(tg.x, bx + 34, bx + bw - 70);
    // 進場 / 退場: 以尾巴尖為軸縮放回彈
    var inQ = seg(t, e.t0, e.t0 + CFG.intro), sc = 0.6 + 0.4 * eBack(inQ), al = seg(t, e.t0, e.t0 + CFG.intro * 0.6);
    if (pr && pr.down && pr.last) { sc *= 1 - 0.2 * pr.dq; al *= 1 - pr.dq; }
    ctx.save();
    ctx.globalAlpha *= al;
    ctx.translate(tailX, by + bh + 16); ctx.scale(sc, sc); ctx.translate(-tailX, -(by + bh + 16));
    // 木板泡泡: 落影 + 深木板 + 板縫 + 深邊 + 內側淡金線 + 朝下尾巴
    rr(ctx, bx + 3, by + 6, bw, bh, 14); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    ctx.beginPath(); rr(ctx, bx, by, bw, bh, 14); ctx.fillStyle = K.board; ctx.fill();
    poly(ctx, [tailX - 16, by + bh - 2, tailX + 16, by + bh - 2, tailX, by + bh + 16]); ctx.fill();
    ctx.save(); rr(ctx, bx, by, bw, bh, 14); ctx.clip();
    for (var yy = by + 26; yy < by + bh; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(bx, yy, bw, 1.5); }
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = K.edge;
    ctx.beginPath(); ctx.moveTo(tailX + 16, by + bh); ctx.lineTo(tailX, by + bh + 16); ctx.lineTo(tailX - 16, by + bh); ctx.stroke();
    rr(ctx, bx + 1.5, by + 1.5, bw - 3, bh - 3, 13); ctx.stroke();
    ctx.fillStyle = K.board; ctx.fillRect(tailX - 14.5, by + bh - 3, 29, 3.5);
    rr(ctx, bx + 6, by + 6, bw - 12, bh - 12, 9); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,216,74,0.35)'; ctx.stroke();
    // 字: 每字從下方彈起、縮放回彈落定; 新字金色 0.3 秒退成米白, 關鍵詞常駐金
    var x0 = bx + PADX, y0 = by + PADY + LH / 2;
    for (i = 0; i < L.items.length; i++) {
      var it = L.items[i]; if (t < it.rt) break;
      var age = t - it.rt, q = seg(age, 0, 0.3), s = 0.35 + 0.65 * eBack(q), jy = -14 * Math.sin(Math.PI * q);
      var cx = x0 + it.x + it.w / 2, cy = y0 + it.line * LH + jy;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      if (it.k.k) keyCap(ctx, 0, -2, KPX, false);
      else if (it.k.c !== ' ') {
        ctx.font = font(PX); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = K.edge; ctx.strokeText(it.k.c, 0, 1);
        ctx.fillStyle = it.k.hl ? K.select : mix(K.select, K.cream, seg(age, 0.1, 0.4)); ctx.fillText(it.k.c, 0, 1);
      }
      ctx.restore();
    }
    // 「Z 繼續」: 鍵帽騎在右下角框線上, 每秒外擴一圈金環; 左邊小羊皮紙標「繼續」
    if (pr) {
      var pa = seg(pr.age, 0, 0.2), kx = bx + bw - 30, ky = by + bh;
      ctx.save(); ctx.globalAlpha *= pa;
      var ring = pr.down ? pr.dq : (pr.age % 1) / 1;
      ctx.beginPath(); ctx.arc(kx, ky + 1, 16 + 20 * eOut(ring), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,216,74,' + (0.85 * (1 - ring)).toFixed(3) + ')'; ctx.stroke();
      rr(ctx, kx - 80, ky - 13, 50, 26, 6); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
      ctx.font = font(16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = K.ink; ctx.fillText('繼續', kx - 55, ky + 1);
      var pop = 1 + 0.08 * Math.max(0, Math.sin(pr.age * TAU)); // 跟著金環輕輕一鼓
      ctx.translate(kx, ky); ctx.scale(pop, pop); keyCap(ctx, 0, 0, 20, pr.down);
      ctx.restore();
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'tut-text', id: 'B', kind: 'anim',
    size: [W, H],
    duration: Math.round(S.total * 100) / 100,
    loop: true,
    draw: function (ctx, t) {
      var f = frame(t);
      ctx.save();
      scene(ctx, f.e.sc, t);
      arrowDown(ctx, TGT[f.e.sc].x, TGT[f.e.sc].y, t);
      drawBubble(ctx, f);
      ctx.restore();
    }
  };
})();
