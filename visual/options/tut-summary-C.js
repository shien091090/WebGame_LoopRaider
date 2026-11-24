/* tut-summary 方案 C — 新手教學總結板(動態, 8 秒一圈)
 * 底版 polish/game/game/art/art.js(全域 Art)須先載入; 本檔只定義 window.VISUAL_OPTION。
 * 介面沿用 ui 方案 A(木板 + 羊皮紙 + 石鍵帽 + 金色選中); 小圖全部呼叫遊戲現行的 Art.drawXxx 縮小畫。
 */
(function () {
  'use strict';
  // ================= 共用(三個方案檔內容相同的一段) =================
  // 底版: polish/game/game/art/art.js(全域 Art)。能呼叫 Art.xxx 的一律呼叫; 以下幾個是照底版內部函式複製的,
  // 挑中搬回遊戲時刪掉複本、改呼叫 art.js 內部同名函式:
  //   board()   ← art.js board()(木板面板)
  //   stamp()   ← art.js stamp()(教學打勾章)
  //   flag()    ← art.js drawGoal() 簡化(底版待機飄動讀系統時鐘, 方案頁「同一個 t 同一幀」不能用)
  //   lockMini()← art.js lockIcon() 簡化
  var A = (typeof window !== 'undefined' && window.Art) ? window.Art : {};
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var P = A.palette || {};
  var K = {
    board: '#3a2a1f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a', groove: '#2a1d14',
    parch: '#efe3c6', parchDim: '#b8ab8e', ink: '#2b2118', inkDim: '#76664e', cream: '#f3e6c8',
    select: '#ffd84a', selectDeep: '#b8860b', good: '#2f8f55', goodLight: '#4fd18b'
  };
  for (var kk in K) if (P[kk]) K[kk] = P[kk];
  var HUD_X = { wood: 16, stone: 186, crystal: 356, core: 526 };
  // 四塊的文字(*...* = 螢光筆標出的關鍵詞)
  var TEXTS = [
    ['*刷關卡*'],
    ['*刷越快*，', '素材累積越快'],
    ['素材可解鎖', '*修復工程*、', '解鎖*新關卡*'],
    ['有空也多去', '*升級所*和*商店*', '看看吧！']
  ];

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eBack(p) { p = clamp(p, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function sm(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function fr(v) { return v - Math.floor(v); }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function poly(ctx, p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (var i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); }
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.28, y - r * 0.28, x + r, y, x + r * 0.28, y + r * 0.28, x, y + r, x - r * 0.28, y + r * 0.28, x - r, y, x - r * 0.28, y - r * 0.28]); }
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : String(s).length * px; }
  function txt(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold !== false); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || K.edge; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function call(name, ctx, st) { if (typeof A[name] === 'function') A[name](ctx, st); }
  function mat(ctx, kind, x, y, size) {
    if (A.icons && A.icons.mat) A.icons.mat(ctx, kind, x, y, size);
    else { circle(ctx, x, y, size / 2); ctx.fillStyle = '#b8682a'; ctx.fill(); }
  }
  function key(ctx, label, cx, cy, px, hot) {
    if (A.icons && A.icons.key) return A.icons.key(ctx, label, cx, cy, px, hot);
    var w = px * 1.7; rr(ctx, cx - w / 2, cy - px * 0.8, w, px * 1.6, 4); ctx.fillStyle = hot ? K.select : '#ece4d2'; ctx.fill();
    txt(ctx, label, cx, cy, px, K.ink, 'center'); return w;
  }
  function keyW(ctx, label, px) { return Math.max(px * 1.7, tw(ctx, label, px, true) + px * 0.9); }
  // 木板面板(照 art.js board())
  function board(ctx, x, y, w, h, tint) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = tint || K.board; ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 8); ctx.clip();
    for (var yy = y + 26; yy < y + h; yy += 26) { ctx.fillStyle = K.seam; ctx.fillRect(x, yy, w, 1.5); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, yy + 1.5, w, 1); }
    ctx.restore();
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.18)'; ctx.stroke();
    var n = [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]];
    for (var i = 0; i < 4; i++) { circle(ctx, n[i][0], n[i][1], 2.6); ctx.fillStyle = K.nail; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = K.edge; ctx.stroke(); }
    ctx.restore();
  }
  // 羊皮紙底(同 art.js tag() 的無選取樣式)
  function parch(ctx, x, y, w, h, dashed) {
    ctx.save();
    rr(ctx, x + 2, y + 4, w, h, 7); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    rr(ctx, x, y, w, h, 7); ctx.fillStyle = K.parch; ctx.fill();
    ctx.fillStyle = 'rgba(120,90,40,0.12)'; ctx.fillRect(x + 3, y + h - 6, w - 6, 3);
    if (dashed) { ctx.setLineDash([8, 5]); rr(ctx, x + 3, y + 3, w - 6, h - 6, 5); ctx.lineWidth = 2; ctx.strokeStyle = K.inkDim; ctx.stroke(); ctx.setLineDash([]); }
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 7); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.restore();
  }
  // 教學打勾章(照 art.js stamp(); q 0→1 從 1.6 倍砸下)
  function stamp(ctx, x, y, q, k) {
    var s = (q < 0.3 ? 1.6 - 0.6 * (q / 0.3) : 1) * (k || 1);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.2);
    circle(ctx, 0, 0, 15); ctx.fillStyle = K.good; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-2, 6); ctx.lineTo(8, -6); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }
  // 號碼釘(金圓 + 深字, 同工程牌號碼釘的語言)
  function pin(ctx, n, x, y, r) {
    ctx.save();
    circle(ctx, x + 1, y + 2, r); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    circle(ctx, x, y, r); ctx.fillStyle = K.select; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = K.edge; ctx.stroke();
    circle(ctx, x - r * 0.3, y - r * 0.35, r * 0.28); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
    txt(ctx, String(n), x, y + 1, r * 1.15, K.ink, 'center');
    ctx.restore();
  }
  // 一行文字, *xx* 段落底下畫金色螢光筆; align 'left' / 'center'
  function rich(ctx, line, x, y, px, align) {
    var parts = String(line).split('*'), total = 0, ws = [], i;
    for (i = 0; i < parts.length; i++) { ws.push(parts[i] ? tw(ctx, parts[i], px, true) : 0); total += ws[i]; }
    var cx = align === 'center' ? x - total / 2 : x;
    for (i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (i % 2 === 1) { rr(ctx, cx - 3, y - px * 0.1, ws[i] + 6, px * 0.55, 3); ctx.fillStyle = 'rgba(255,216,74,0.75)'; ctx.fill(); }
      txt(ctx, parts[i], cx, y, px, K.ink, 'left', true);
      cx += ws[i];
    }
    return total;
  }
  function richLines(ctx, lines, x, cy, px, align, lh) {
    var y0 = cy - (lines.length - 1) * lh / 2;
    for (var i = 0; i < lines.length; i++) rich(ctx, lines[i], x, y0 + i * lh, px, align);
  }
  // 「按 [Z] 關閉」: 鍵帽金頂(此刻按得下去), 呼吸脈動
  function closeHint(ctx, cx, cy, px, t, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    var kw = keyW(ctx, 'Z', px), w1 = tw(ctx, '按', px, true), w2 = tw(ctx, '關閉', px, true), g = 10, total = w1 + g + kw + g + w2, x = cx - total / 2;
    txt(ctx, '按', x, cy, px, K.cream, 'left', true, 5, K.edge);
    var ks = 1 + 0.07 * (0.5 - 0.5 * Math.cos(t * TAU / 1.0));
    ctx.save(); ctx.translate(x + w1 + g + kw / 2, cy); ctx.scale(ks, ks); key(ctx, 'Z', 0, 0, px, true); ctx.restore();
    txt(ctx, '關閉', x + w1 + g + kw + g, cy, px, K.cream, 'left', true, 5, K.edge);
    ctx.restore();
  }
  // 教學尾聲的背景: 第一關的定格畫面 + 暗幕(總結板蓋在上面)
  function backdrop(ctx) {
    ctx.save();
    call('drawBackground', ctx, { theme: 'forest', t: 0 });
    for (var c = 0; c < 32; c++) {
      call('drawGround', ctx, { x: c * 40 + 20, y: 620, theme: 'forest', open: { n: true, e: c === 31, s: false, w: c === 0 } });
      call('drawGround', ctx, { x: c * 40 + 20, y: 660, theme: 'forest', open: { n: false, e: c === 31, s: false, w: c === 0 } });
      call('drawGround', ctx, { x: c * 40 + 20, y: 700, theme: 'forest', open: { n: false, e: c === 31, s: false, w: c === 0 } });
    }
    call('drawPlayer', ctx, { x: 980, y: 582, cls: 'sword', facing: -1, pose: 'idle', poseT: 0 });
    call('drawHud', ctx, { mode: 'level', stock: { wood: 14, stone: 6, crystal: 3, core: 1 }, ratePerMin: { wood: 0, stone: 0, crystal: 0, core: 0 }, time: 48.6, hp: 3, maxHp: 3 });
    ctx.fillStyle = 'rgba(12,8,6,0.66)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  // ---------- 四張小圖(遊戲現行畫法縮小; 世界視窗 640×360, 依框寬縮放) ----------
  var VW = 640, VH = 360;
  function groundRow(ctx, c0, c1, top, theme) {
    for (var c = c0; c <= c1; c++) {
      call('drawGround', ctx, { x: c * 40 + 20, y: top + 20, theme: theme, open: { n: true, e: c === c1, s: false, w: c === c0 } });
      call('drawGround', ctx, { x: c * 40 + 20, y: top + 60, theme: theme, open: { n: false, e: c === c1, s: false, w: c === c0 } });
    }
  }
  function flag(ctx, x, ground, reached) { // 照 drawGoal 造型簡化(不飄動)
    ctx.save();
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x - 2, ground - 80, 4, 80); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.strokeRect(x - 2, ground - 80, 4, 80);
    poly(ctx, [x + 2, ground - 78, x + 34, ground - 68, x + 2, ground - 56]); ctx.fillStyle = reached ? '#3ccf6e' : '#ffd23f'; ctx.fill(); ctx.stroke();
    if (reached) { ctx.beginPath(); ctx.moveTo(x + 8, ground - 68); ctx.lineTo(x + 12, ground - 63); ctx.lineTo(x + 20, ground - 72); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff'; ctx.stroke(); }
    else { star4(ctx, x + 14, ground - 67, 5); ctx.fillStyle = '#e5484d'; ctx.fill(); }
    ctx.restore();
  }
  function lockMini(ctx, x, y, s, col) { // 照 lockIcon 簡化
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, -4, 7, Math.PI, 0); ctx.lineWidth = 3.5; ctx.strokeStyle = col; ctx.stroke();
    rr(ctx, -10, -4, 20, 15, 3); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    circle(ctx, 0, 2, 2.2); ctx.fillStyle = K.edge; ctx.fill();
    ctx.restore();
  }
  function arcPt(x0, y0, x1, y1, lift, q) { // 拋物弧
    var mx = (x0 + x1) / 2, my = Math.min(y0, y1) - lift, u = 1 - q;
    return [u * u * x0 + 2 * u * q * mx + q * q * x1, u * u * y0 + 2 * u * q * my + q * q * y1];
  }
  function loopFade(ctx, u) { // 小圖每圈頭尾 0.2 秒暗下, 重來不跳格
    var a = u < 0.05 ? 1 - u / 0.05 : (u > 0.95 ? (u - 0.95) / 0.05 : 0);
    if (a > 0) { ctx.fillStyle = 'rgba(10,8,6,' + (0.85 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }
  }
  // 1 刷關卡: 劍士跑過翠林關卡, 撿素材、跳過野豬、抵達終點旗(4 秒一圈)
  function mini1(ctx, lt) {
    var u = fr(lt / 4), i;
    call('drawBackground', ctx, { theme: 'forest', t: 0 });
    groundRow(ctx, 0, 15, 300, 'forest');
    var run = clamp(u / 0.8, 0, 1), px = 50 + 540 * run, h = 0, pose = 'run', pt = lt;
    if (px > 380 && px < 480) { var jq = (px - 380) / 100; h = 74 * Math.sin(Math.PI * jq); pose = jq < 0.5 ? 'rise' : 'fall'; }
    if (u >= 0.8) { pose = 'cheer'; pt = (u - 0.8) * 4; }
    flag(ctx, 600, 300, px >= 589);
    call('drawBoar', ctx, { x: 430, y: 284, facing: -1, state: 'walk', t: lt });
    var pk = [[210, 276, 'wood'], [310, 276, 'stone'], [530, 276, 'crystal']];
    for (i = 0; i < pk.length; i++) {
      var uk = (pk[i][0] - 50) / 540 * 0.8, since = (u - uk) * 4;
      if (since < 0) call('drawPickup', ctx, { x: pk[i][0], y: pk[i][1], kind: pk[i][2], t: lt });
      else if (since < 0.6) call('drawPopup', ctx, { x: pk[i][0], y: pk[i][1] - 22, t: since, dur: 0.6, kind: pk[i][2], value: 1 });
    }
    call('drawPlayer', ctx, { x: px, y: 282 - h, cls: 'sword', facing: 1, pose: pose, poseT: pt });
    loopFade(ctx, u);
  }
  // 卡片縮圖內的回放(大地圖卡片的長相: 主題背景 + 地面 + 主角記號)
  function cardThumb(ctx, x, y, p, theme) {
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 160, 90); ctx.clip();
    ctx.translate(x + 8, y + 8); ctx.scale(0.125, 0.125);
    call('drawBackground', ctx, { theme: theme, t: 0 });
    var cap = theme === 'cliff' ? '#e8eef5' : '#5cbf45', inner = theme === 'cliff' ? '#5d6680' : '#73502f';
    ctx.fillStyle = inner; ctx.fillRect(0, 600, 1280, 120); ctx.fillStyle = cap; ctx.fillRect(0, 600, 1280, 24);
    if (p !== null) call('drawPlayer', ctx, { x: 90 + 1100 * p, y: 582, cls: 'sword', facing: 1, pose: 'run', poseT: 0 });
    ctx.restore();
  }
  // 2 刷越快, 素材累積越快: 兩張已過關卡片並排回放, 右邊跑得快一倍, 素材飛進資訊列的次數也多一倍
  function mini2(ctx, lt) {
    var i, j, k;
    ctx.save(); ctx.translate(-430, -150); call('drawMapBackground', ctx, { t: 0 }); ctx.restore();
    var cards = [
      { x: 74, y: 160, per: 4, time: 42.0, rates: { wood: 1.4, stone: 1.4, crystal: 0, core: 0 }, marks: [[0.35, 'wood'], [0.75, 'stone']], lab: '42 秒一趟' },
      { x: 390, y: 160, per: 2, time: 21.0, rates: { wood: 2.9, stone: 0, crystal: 2.9, core: 0 }, marks: [[0.35, 'wood'], [0.75, 'crystal']], lab: '21 秒一趟' }
    ];
    var got = { wood: 0, stone: 0, crystal: 0, core: 0 }, bump = {}, flights = [];
    for (i = 0; i < cards.length; i++) {
      var cd = cards[i];
      for (j = 0; j < cd.marks.length; j++) {
        var mp = cd.marks[j][0], kind = cd.marks[j][1];
        for (k = 0; k <= Math.floor(lt / cd.per); k++) {
          var since = lt - (k + mp) * cd.per;
          if (since < 0) continue;
          if (since < 0.7) flights.push({ x0: cd.x + 8 + 160 * mp, y0: cd.y + 80, kind: kind, q: since / 0.7 });
          else { got[kind]++; var b = since - 0.7; if (b < 0.2 && (bump[kind] === undefined || b < bump[kind])) bump[kind] = b; }
        }
      }
    }
    for (i = 0; i < cards.length; i++) {
      var c = cards[i], p = fr(lt / c.per);
      call('drawLevelCard', ctx, { x: c.x, y: c.y, index: 1, name: '林間小徑', theme: 'forest', state: 'cleared', recordCls: 'sword', recordTime: c.time, rates: c.rates, devices: [null, null], repairedCount: 0, siteCount: 0 });
      cardThumb(ctx, c.x, c.y, p, 'forest');
      call('drawCardOverlay', ctx, { x: c.x, y: c.y, speedMul: 1, newArea: false, selected: false, replayP: p, marks: [{ p: c.marks[0][0], kind: c.marks[0][1] }, { p: c.marks[1][0], kind: c.marks[1][1] }] });
      // 卡片上方的讀數牌(小圖裡唯一放大的字; 方案頁示意用)
      var fast = i === 1, lw = tw(ctx, c.lab, 30, true) + 30;
      rr(ctx, c.x + 88 - lw / 2, c.y - 62, lw, 46, 8); ctx.fillStyle = fast ? K.select : K.parch; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
      txt(ctx, c.lab, c.x + 88, c.y - 38, 30, K.ink, 'center', true);
    }
    call('drawHud', ctx, { mode: 'map', stock: { wood: 12 + got.wood, stone: 5 + got.stone, crystal: 3 + got.crystal, core: 0 }, ratePerMin: { wood: 4.3, stone: 1.4, crystal: 2.9, core: 0 }, bumpT: bump, bumpDur: 0.2 });
    for (i = 0; i < flights.length; i++) {
      var f = flights[i], pt = arcPt(f.x0, f.y0, HUD_X[f.kind] + 20, 20, 70, eOut(f.q * 0.85 + 0.15 * f.q * f.q));
      call('drawFlyingMaterial', ctx, { x: pt[0], y: pt[1], kind: f.kind, t: f.q * 0.7, dur: 0.7 });
    }
  }
  // 3 素材可解鎖修復工程、解鎖新關卡: 左 = 石頭飛進斷橋 → 橋修好、迷霧散開; 右 = 木材飛進上鎖卡片 → 開鎖成新關卡(4 秒一圈)
  function mini3(ctx, lt) {
    var u = fr(lt / 4) * 4, i;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 344, VH); ctx.clip();
    call('drawBackground', ctx, { theme: 'forest', t: 0 });
    groundRow(ctx, 0, 3, 260, 'forest'); groundRow(ctx, 6, 9, 260, 'forest');
    call('drawPickup', ctx, { x: 268, y: 236, kind: 'crystal', t: lt }); call('drawPickup', ctx, { x: 302, y: 222, kind: 'crystal', t: lt + 0.4 });
    var rep = u >= 1.0, bT = clamp(u - 1.0, 0, 0.6);
    call('drawWorksite', ctx, { x: 180, y: 280, kind: 'bridge', role: 'shortcut', repaired: rep, theme: 'forest', end: true, buildT: bT, buildDur: 0.6, order: 0 });
    call('drawWorksite', ctx, { x: 220, y: 280, kind: 'bridge', role: 'shortcut', repaired: rep, theme: 'forest', end: false, buildT: bT, buildDur: 0.6, order: 1 });
    call('drawFog', ctx, { x: 244, y: 110, w: 100, h: 190, t: 0.5, theme: 'forest', clearP: sm(seg(u, 1.4, 2.2)), ox: 244, oy: 270, maxR: 230 });
    call('drawSiteSign', ctx, { x: 136, y: 236, role: 'shortcut', num: 1 });
    if (u > 0.4 && u < 1.0) { var sp = arcPt(60, 30, 200, 262, 30, eOut((u - 0.4) / 0.6)); call('drawFlyingMaterial', ctx, { x: sp[0], y: sp[1], kind: 'stone', t: u - 0.4, dur: 0.6 }); }
    ctx.restore();
    // 右半: 大地圖的一角
    ctx.save(); ctx.beginPath(); ctx.rect(344, 0, VW - 344, VH); ctx.clip();
    ctx.save(); ctx.translate(-520, -200); call('drawMapBackground', ctx, { t: 0 }); ctx.restore();
    var open = u >= 2.5, shake = (u > 2.3 && u < 2.5) ? Math.sin(u * 90) * 4 : 0, cx = 404 + shake, cy = 112;
    call('drawLevelCard', ctx, { x: cx, y: cy, index: 2, name: '崖邊小路', theme: 'cliff', state: open ? 'open' : 'buyable', cost: { wood: 20, stone: 0, crystal: 0, core: 0 }, stock: { wood: 35, stone: 0, crystal: 0, core: 0 }, devices: open ? [null, null] : null });
    if (open) {
      cardThumb(ctx, cx, cy, null, 'cliff');
      call('drawCardOverlay', ctx, { x: cx, y: cy, speedMul: 1, newArea: false, selected: false, replayP: null });
      var fq = seg(u, 2.5, 2.9);
      if (fq < 1) { rr(ctx, cx, cy, 176, 136, 8); ctx.fillStyle = 'rgba(255,248,220,' + (0.85 * (1 - fq)).toFixed(3) + ')'; ctx.fill(); }
      var lq = seg(u, 2.5, 3.1);
      if (lq < 1) { ctx.save(); ctx.globalAlpha *= 1 - lq; lockMini(ctx, cx + 88, cy + 38 - 70 * eOut(lq), 1.5 + lq, K.select); ctx.restore(); }
      var bq = seg(u, 2.5, 3.0);
      if (bq > 0 && bq < 1) { ctx.save(); ctx.globalAlpha *= 1 - bq; ctx.fillStyle = K.select; for (i = 0; i < 8; i++) { var a = i * TAU / 8, d = 70 + 40 * eOut(bq); star4(ctx, cx + 88 + Math.cos(a) * d, cy + 68 + Math.sin(a) * d * 0.7, 9); ctx.fill(); } ctx.restore(); }
    }
    if (u > 1.8 && u < 2.4) { var wp = arcPt(600, 20, 492, 150, 20, eOut((u - 1.8) / 0.6)); call('drawFlyingMaterial', ctx, { x: wp[0], y: wp[1], kind: 'wood', t: u - 1.8, dur: 0.6 }); }
    ctx.restore();
    ctx.fillStyle = K.edge; ctx.fillRect(342, 0, 5, VH);
    loopFade(ctx, u / 4);
  }
  // 4 有空也多去升級所和商店看看吧: 營地的兩張建築卡輪流被選中, 魔核跳進升級所、水晶跳進商店(4 秒一圈)
  function mini4(ctx, lt) {
    var u = fr(lt / 4) * 4, i;
    var g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#3e3227'); g.addColorStop(1, '#2e251c'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
    for (i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, 60 * i + 20); ctx.lineTo(VW, 60 * i + 20); ctx.stroke(); }
    var lamps = [[40, 70], [600, 70]];
    for (i = 0; i < 2; i++) {
      var lg = ctx.createRadialGradient(lamps[i][0], lamps[i][1], 2, lamps[i][0], lamps[i][1], 90); lg.addColorStop(0, 'rgba(255,208,138,0.45)'); lg.addColorStop(1, 'rgba(255,208,138,0)');
      ctx.fillStyle = lg; ctx.fillRect(lamps[i][0] - 90, lamps[i][1] - 90, 180, 180);
      ctx.fillStyle = '#2a201a'; ctx.fillRect(lamps[i][0] - 2, lamps[i][1], 4, 70); ctx.fillStyle = '#ffd08a'; ctx.fillRect(lamps[i][0] - 6, lamps[i][1] - 8, 12, 12);
    }
    var wsSel = u < 2, wx = 90, sx = 374, cy = 70;
    call('drawWorkshopCard', ctx, { x: wx, y: cy - (wsSel ? 4 : 0), anyAffordable: true, allDone: false, selected: wsSel });
    call('drawShopCard', ctx, { x: sx, y: cy - (wsSel ? 0 : 4), anyAffordable: true, soldOut: false, selected: !wsSel });
    var chips = [[wx, 'core', '強化角色'], [sx, 'crystal', '買裝置']];
    for (i = 0; i < 2; i++) {
      var x = chips[i][0], w = 176, y = 236;
      rr(ctx, x, y, w, 56, 8); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.stroke();
      mat(ctx, chips[i][1], x + 32, y + 28, 34);
      txt(ctx, chips[i][2], x + 56, y + 29, 28, K.ink, 'left', true);
    }
    var hops = [[0.3, wx, 'core'], [2.3, sx, 'crystal']];
    for (i = 0; i < 2; i++) {
      var q = seg(u, hops[i][0], hops[i][0] + 0.7);
      if (q > 0 && q < 1) { var hp = arcPt(hops[i][1] + 32, 264, hops[i][1] + 88, 130, 60, sm(q)); ctx.save(); ctx.globalAlpha *= q > 0.85 ? (1 - q) / 0.15 : 1; mat(ctx, hops[i][2], hp[0], hp[1], 30 * (1 - 0.3 * q)); ctx.restore(); }
    }
    loopFade(ctx, u / 4);
  }
  var MINIS = [mini1, mini2, mini3, mini4];
  // 在 (x,y,w,h) 畫第 i 張小圖, lt = 這塊出現後的秒數; 框 = 卡片縮圖同款深邊 + 淡金內線
  function mini(ctx, i, x, y, w, h, lt) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#10141c'; ctx.fillRect(x, y, w, h);
    ctx.translate(x, y); ctx.scale(w / VW, h / VH);
    MINIS[i](ctx, Math.max(0, lt));
    ctx.restore();
    ctx.save();
    ctx.lineWidth = 3; ctx.strokeStyle = K.edge; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,215,160,0.4)'; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.restore();
  }
  // 標題(三個方案共用字串)
  var TITLE = '新手教學總結';

  // ================= 方案 C: 直列卷軸逐條展開 + 打勾章 =================
  // 板子從中線上下撐開 → 左側先排好 4 支捲起的羊皮紙軸 → 依序往右攤開(捲軸跟著展開緣移動), 攤開後右端蓋綠色打勾章
  // (沿用教學完成的打勾章, 意思是「這件學過了」)→ 最後出現「按 [Z] 關閉」。
  var BX = 230, BW = 820, BH = 664, BCY = 362;
  var RX = 262, RW = 756, RH = 118, RY = [112, 240, 368, 496];
  var T_ROW = [0.6, 1.2, 1.8, 2.4], ROLL = 0.5, T_HINT = 3.4;
  var TEXTS_C = [['*刷關卡*'], ['*刷越快*，素材累積越快'], ['素材可解鎖*修復工程*、', '解鎖*新關卡*'], ['有空也多去*升級所*和*商店*看看吧！']];

  function roller(ctx, x, y) { // 捲起的紙軸(寬 16, 比列高出上下各 4)
    var g = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
    g.addColorStop(0, '#8f8471'); g.addColorStop(0.45, '#f6ecd4'); g.addColorStop(1, '#a89c80');
    rr(ctx, x - 8, y - 4, 16, RH + 8, 6); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.edge; ctx.stroke();
    ctx.fillStyle = '#6a3a14'; rr(ctx, x - 5, y - 9, 10, 7, 2); ctx.fill(); rr(ctx, x - 5, y + RH + 2, 10, 7, 2); ctx.fill();
  }
  function row(ctx, i, y, lt) {
    parch(ctx, RX, y, RW, RH);
    pin(ctx, i + 1, RX + 30, y + RH / 2, 19);
    mini(ctx, i, RX + 60, y + 8, 182, 102, lt);
    richLines(ctx, TEXTS_C[i], RX + 266, y + RH / 2, 26, 'left', 40);
  }

  window.VISUAL_OPTION = {
    element: 'tut-summary', id: 'C', kind: 'anim',
    size: [1280, 720],
    duration: 8,
    loop: true,
    draw: function (ctx, t) {
      ctx.save();
      backdrop(ctx);
      var out = 1 - seg(t, 7.4, 8), bin = seg(t, 0, 0.45), i;
      if (out <= 0 || bin <= 0) { ctx.restore(); return; }
      ctx.globalAlpha *= out;
      // 板子由中線上下撐開(內容裁在撐開範圍內)
      var h = Math.max(20, BH * eBack(bin)), by = BCY - h / 2;
      board(ctx, BX, by, BW, h);
      ctx.beginPath(); ctx.rect(BX, by, BW, h); ctx.clip();
      var tq = eOut(seg(t, 0.25, 0.6));
      ctx.save(); ctx.globalAlpha *= tq;
      txt(ctx, TITLE, 640, 72, 32, K.cream, 'center', true, 6, K.edge);
      var lw = 150 * tq; ctx.fillStyle = K.select;
      ctx.fillRect(640 - 120 - lw, 70, lw, 3); ctx.fillRect(640 + 120, 70, lw, 3);
      star4(ctx, 640 - 126 - lw, 71.5, 6); ctx.fill(); star4(ctx, 640 + 126 + lw, 71.5, 6); ctx.fill();
      ctx.restore();
      for (i = 0; i < 4; i++) {
        var y = RY[i], T0 = T_ROW[i], q = eOut(seg(t, T0, T0 + ROLL));
        if (q <= 0) { if (bin >= 1) roller(ctx, RX + 8, y); continue; }
        var vw = Math.max(16, RW * q);
        ctx.save(); ctx.beginPath(); ctx.rect(RX - 4, y - 8, vw + 4, RH + 16); ctx.clip();
        row(ctx, i, y, t - T0 - ROLL * 0.5);
        ctx.restore();
        if (q < 1) roller(ctx, RX + vw - 8 * (1 - q), y);
        var sq = seg(t, T0 + ROLL + 0.05, T0 + ROLL + 0.35); // 打勾章砸下
        if (sq > 0) {
          stamp(ctx, RX + RW - 44, y + RH / 2, sq, 1.45);
          if (sq < 1) { ctx.save(); ctx.globalAlpha *= 1 - sq; ctx.fillStyle = K.select; for (var j = 0; j < 6; j++) { var a = j * TAU / 6 - Math.PI / 2, d = 26 + 30 * eOut(sq); star4(ctx, RX + RW - 44 + Math.cos(a) * d, y + RH / 2 + Math.sin(a) * d, 6 * (1 - 0.5 * sq)); ctx.fill(); } ctx.restore(); }
        }
      }
      closeHint(ctx, 640, 656, 22, t, eOut(seg(t, T_HINT, T_HINT + 0.4)));
      ctx.restore();
    }
  };
})();
