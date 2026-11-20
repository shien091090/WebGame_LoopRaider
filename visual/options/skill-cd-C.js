/* skill-cd 方案 C — 技能冷卻顯示。前半共用段(場景、時間軸、主角、資訊列)三方案相同, 方案差異在後半。 */
(function () {
  'use strict';
  /* ---------- 三方案共用: 場景、時間軸、主角 ----------
   * 主角造型照 options/hero-A.js 的 hero() 複製(方案頁不會載入 hero-A.js); 挑中搬回遊戲時刪掉複本, 改呼叫遊戲內的主角函式。
   * 資訊列照 options/ui-A.js 的 hud() 複製, 只拿掉原本「職業圖示 + 冷卻環」那一格(冷卻顯示搬到本方案的位置)。
   * 素材圖示照 ui-A.js 的 matIcon() 複製(= 底版 matIcon 造型)。
   * 動態完全由 t 決定; 底版只呼叫不讀牆鐘的函式(drawBackground / drawGround / drawFrog / drawShockwave / drawPoof)。 */
  var ROOT = (typeof window !== 'undefined') ? window : this;
  var ART = (typeof Art !== 'undefined' && Art) ? Art : (ROOT.Art || {});
  var PAL = ART.palette || {};
  function C(k, d) { return PAL[k] || d; }
  var TAU = Math.PI * 2;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';
  var W = 1280, H = 720, GROUND = 600;
  var K = {
    board: '#3a2a1f', plank: '#45321f', seam: '#21160e', edge: '#180f09', nail: '#d9b47a',
    parch: '#efe3c6', ink: '#2b2118', inkDim: '#76664e', gold: '#ffd84a', goldDeep: '#b8860b',
    red: '#ff5a5a', cream: '#f3e6c8', stoneKey: '#ece4d2', stoneKeyDark: '#8f8471'
  };
  var CLS = { sword: C('sword', '#3d8bfd'), hunter: C('hunter', '#1fbf9a'), bomber: C('bomber', '#f28c28') };
  var CLS_LT = { sword: '#a9cbff', hunter: '#9ff0db', bomber: '#ffd29a' };
  var NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  // 一圈 12 秒: 劍士 → 獵人 → 炸彈工。cast = 施放時刻、cd = 冷卻(從施放起算)、act = 技能持續、deny = 冷卻中又按 X
  // 獵人潛行的持續與冷卻規格尚未定, 這裡示意用 持續 1.5 秒 / 冷卻 4 秒(比另兩職業明顯長)
  var SEG = [
    { cls: 'sword', skill: '衝刺斬', len: 3.0, cast: 0.7, cd: 1.2, act: 0.18 },
    { cls: 'hunter', skill: '潛行', len: 5.7, cast: 0.7, cd: 4.0, act: 1.5 },
    { cls: 'bomber', skill: '震波', len: 3.3, cast: 0.7, cd: 1.5, act: 0.4, deny: 1.3 }
  ];
  var DUR = 12;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
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
  function star4(ctx, x, y, r) { poly(ctx, [x, y - r, x + r * 0.22, y - r * 0.22, x + r, y, x + r * 0.22, y + r * 0.22, x, y + r, x - r * 0.22, y + r * 0.22, x - r, y, x - r * 0.22, y - r * 0.22]); }
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function text(ctx, s, x, y, px, col, align, bold, outline, oc) {
    ctx.font = font(px, bold); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = outline; ctx.strokeStyle = oc || K.edge; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); var m = ctx.measureText(s); return (m && isFinite(m.width)) ? m.width : s.length * px; }
  // 石鍵帽(ui-A): hot = 金頂, 此刻按得下去
  function key(ctx, label, cx, cy, px, hot) {
    var w = Math.max(px * 1.7, tw(ctx, label, px, true) + px * 0.9), h = px * 1.6;
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 4); ctx.fillStyle = hot ? K.goldDeep : K.stoneKeyDark; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4); ctx.fillStyle = hot ? K.gold : K.stoneKey; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, label, cx, cy + 0.5, px, K.ink, 'center', true);
    ctx.restore();
  }
  function matIcon(ctx, kind, cx, cy, sz) {
    var k = sz / 20;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1420';
    if (kind === 'wood') {
      rr(ctx, -9, -5, 15, 10, 3); ctx.fillStyle = C('wood', '#c97e3a'); ctx.fill(); ctx.stroke();
      ell(ctx, 5.5, 0, 3.6, 5); ctx.fillStyle = C('woodLight', '#efc07f'); ctx.fill(); ctx.stroke();
      ell(ctx, 5.5, 0, 1.4, 2.2); ctx.strokeStyle = C('woodDark', '#7a4a1e'); ctx.lineWidth = 1; ctx.stroke();
    } else if (kind === 'stone') {
      poly(ctx, [-8, 3, -5, -6, 4, -8, 9, -2, 7, 6, -3, 8]); ctx.fillStyle = C('stone', '#a3adb8'); ctx.fill(); ctx.stroke();
      poly(ctx, [-5, -6, 4, -8, 9, -2, 1, -1]); ctx.fillStyle = C('stoneLight', '#d5dbe2'); ctx.fill();
    } else if (kind === 'time') {
      poly(ctx, [0, -9.5, 7, -2, 0, 9.5, -7, -2]); ctx.fillStyle = C('time', '#3fd6ea'); ctx.fill(); ctx.stroke();
      poly(ctx, [0, -9.5, 3, -2, 0, 9.5, -3, -2]); ctx.fillStyle = C('timeLight', '#b6f4fb'); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0, -9.5);
      ctx.bezierCurveTo(4, -4, 8, -1, 7, 4); ctx.bezierCurveTo(6, 8.5, -6, 8.5, -7, 4); ctx.bezierCurveTo(-8, -1, -3, -3, 0, -9.5); ctx.closePath();
      ctx.fillStyle = C('soul', '#e65ad4'); ctx.fill(); ctx.stroke();
      ell(ctx, 0, 3.5, 3.6, 3.2); ctx.fillStyle = C('soulLight', '#ffb6f2'); ctx.fill();
    }
    ctx.restore();
  }
  function heartShape(ctx, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, 0, -7, -7, -3, -6); ctx.quadraticCurveTo(-1, -6, 0, -3); ctx.quadraticCurveTo(1, -6, 3, -6); ctx.bezierCurveTo(7, -7, 9, 0, 0, 6); ctx.closePath();
    ctx.restore();
  }

  // ---------- 主角(hero 方案 A 造型; 原點 = 判定框中心, 28×40) ----------
  var HC = {
    skin: C('skin', '#f4d2b0'), line: C('outlineHero', '#ffffff'), ink: '#1a1420', pants: '#2b3245',
    gold: C('gold', '#f2c94c'), metal: '#e8eef6', wood: '#8a5a2a', bomb: C('bomb', '#2a2a33'), spark: C('goal', '#ffd23f'),
    lens: C('timeLight', '#b6f4fb'), cape: '#d8434e', hood: '#0f2a24', eye: '#d8fff0'
  };
  function hfs(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.stroke(); } }
  function hlegs(ctx, top, swing) {
    ctx.fillStyle = HC.pants;
    rr(ctx, -7 + swing, top, 5, 20 - top, 1.5); ctx.fill(); rr(ctx, 2 - swing, top, 5, 20 - top, 1.5); ctx.fill();
  }
  function hero(ctx, cls, f, swing) {
    swing = swing || 0;
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 1);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (cls === 'sword') {
      poly(ctx, [-4, -6, -13, 15, -5, 17, 2, -4]); hfs(ctx, HC.cape, 0);
      hlegs(ctx, 13, swing);
      poly(ctx, [-13, -6, 13, -6, 7, 14, -7, 14]); hfs(ctx, CLS.sword, 2);
      ctx.fillStyle = HC.gold; ctx.fillRect(-7, 8, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [-2, -4, 2, -4, 0, 4]); ctx.fill();
      poly(ctx, [-8, -13, -15, -19, -12, -11]); hfs(ctx, HC.gold, 0);
      rr(ctx, -8, -20, 16, 14, 3); hfs(ctx, CLS.sword, 2);
      ctx.fillStyle = HC.ink; ctx.fillRect(-1, -15, 8, 3);
      poly(ctx, [10, -19, 12, -22, 14, -19, 14, -3, 10, -3]); hfs(ctx, HC.metal, 0);
      ctx.lineWidth = 1; ctx.strokeStyle = HC.ink; ctx.stroke();
      ctx.fillStyle = HC.gold; ctx.fillRect(7, -3.5, 10, 3);
      ctx.fillStyle = HC.wood; ctx.fillRect(11, -0.5, 2, 5);
      circle(ctx, 12, 3, 2.6); hfs(ctx, HC.skin, 0);
    } else if (cls === 'hunter') {
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(-0.35);
      ctx.fillStyle = HC.wood; ctx.fillRect(-3, -6, 6, 14);
      ctx.fillStyle = HC.eye; poly(ctx, [-3, -6, -1, -12, 1, -6]); ctx.fill(); poly(ctx, [0, -6, 2.5, -11, 3.5, -6]); ctx.fill();
      ctx.restore();
      hlegs(ctx, 14, swing);
      poly(ctx, [0, -20, 13, 15, -13, 15]); hfs(ctx, CLS.hunter, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; poly(ctx, [0, -20, -13, 15, -5, 15]); ctx.fill();
      poly(ctx, [-1, -13, 7, -9, 6, -4, -3, -4]); ctx.fillStyle = HC.hood; ctx.fill();
      circle(ctx, 2, -8, 1.3); ctx.fillStyle = HC.eye; ctx.fill(); circle(ctx, 5, -7.6, 1.3); ctx.fill();
      circle(ctx, 0, 0, 2); ctx.fillStyle = HC.gold; ctx.fill();
      ctx.strokeStyle = HC.wood; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(3, 2, 15, -1.15, 1.15); ctx.stroke();
      var ex = 3 + Math.cos(1.15) * 15, ey = Math.sin(1.15) * 15;
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, 2 - ey); ctx.lineTo(ex, 2 + ey); ctx.stroke();
      ctx.strokeStyle = C('arrow', '#f3ead8'); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(ex - 1, 2); ctx.lineTo(19, 2); ctx.stroke();
      ctx.fillStyle = '#c9d3df'; poly(ctx, [19, -0.5, 22, 2, 19, 4.5]); ctx.fill();
    } else {
      hlegs(ctx, 15, swing);
      circle(ctx, 0, 5, 12); hfs(ctx, CLS.bomber, 2);
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(8, 13); ctx.stroke();
      for (var i = 0; i < 3; i++) { circle(ctx, -5 + i * 5, 1.5 + i * 4.4, 2.2); ctx.fillStyle = HC.bomb; ctx.fill(); }
      circle(ctx, 0, -11, 8); hfs(ctx, HC.skin, 1.8);
      ctx.beginPath(); ctx.arc(0, -12, 8, Math.PI, 0); ctx.closePath(); hfs(ctx, CLS.bomber, 0);
      ctx.fillStyle = '#3a3f4c'; ctx.fillRect(-8, -12.5, 16, 2.6);
      circle(ctx, 1, -11.2, 3.1); hfs(ctx, HC.lens, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = '#3a3f4c'; ctx.stroke();
      circle(ctx, 6.4, -11.2, 3.1); hfs(ctx, HC.lens, 0); ctx.stroke();
      ctx.strokeStyle = HC.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(3, -6.5, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      circle(ctx, 12, 3, 5.5); ctx.fillStyle = HC.bomb; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = HC.line; ctx.stroke();
      ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(13, -2.5); ctx.quadraticCurveTo(15, -6, 17, -6); ctx.stroke();
      ctx.fillStyle = HC.spark; poly(ctx, [17, -10, 18, -7, 21, -6, 18, -5, 17, -2, 16, -5, 13, -6, 16, -7]); ctx.fill();
    }
    ctx.restore();
  }
  // 武器尖端(面向右, 相對判定框中心): 方案 C 的閃星位置
  var TIP = { sword: [12, -22], hunter: [9, -12], bomber: [17, -6] };

  // ---------- 時間軸 ----------
  function timeline(t) {
    t = Number(t); if (!isFinite(t)) t = 0;
    t = ((t % DUR) + DUR) % DUR;
    var acc = 0, i, sg = SEG[0];
    for (i = 0; i < SEG.length; i++) { sg = SEG[i]; if (t < acc + sg.len || i === SEG.length - 1) break; acc += sg.len; }
    var lt = t - acc, ca = lt - sg.cast;
    var cdLeft = ca < 0 ? 0 : Math.max(0, sg.cd - ca);
    var S = {
      t: t, cls: sg.cls, seg: sg, lt: lt, ca: ca, cd: sg.cd, cdLeft: cdLeft,
      p: cdLeft > 0 ? 1 - cdLeft / sg.cd : 1,
      cooling: cdLeft > 0,
      active: ca >= 0 && ca < sg.act,
      longActive: ca >= 0 && ca < sg.act && sg.act >= 1,   // 只有潛行長到要另外畫「使用中」
      actLeft: (ca >= 0 && ca < sg.act) ? sg.act - ca : 0,
      readyAge: ca < 0 ? 99 + lt : (ca >= sg.cd ? ca - sg.cd : -1),   // 冷卻完成後經過; 段頭本來就可用 = 99+
      steadyT: ca < 0 ? lt : (ca >= sg.cd ? ca - sg.cd : 0),           // 「可用」常駐動態的相位
      denyAge: sg.deny != null ? lt - sg.deny : -1
    };
    var walk = Math.min(lt, 2.4);
    S.x = 400 + 80 * walk;
    if (sg.cls === 'sword' && ca >= 0) S.x += 160 * clamp(ca / 0.18, 0, 1);
    S.y = GROUND - 20;
    S.walking = lt < 2.4 && !(sg.cls === 'sword' && S.active);
    S.swing = S.walking ? Math.sin(lt * TAU * 2.5) * 2 : 0;
    S.bob = S.walking ? -Math.abs(Math.sin(lt * TAU * 2.5)) * 1.5 : 0;
    if (ca >= 0 && ca < 0.25) S.phase = '施放';
    else if (S.longActive) S.phase = '潛行中(冷卻已開始)';
    else if (S.cooling) S.phase = '冷卻中';
    else if (S.readyAge >= 0 && S.readyAge < 0.8) S.phase = '冷卻完成';
    else S.phase = '可用';
    if (S.denyAge >= 0 && S.denyAge < 0.4) S.phase = '冷卻中按 X(不反應)';
    return S;
  }

  // ---------- 場景 ----------
  function drawGroundRow(ctx) {
    var ok = false;
    try {
      if (ART.drawGround) {
        for (var x = 0; x < W; x += 40) {
          ART.drawGround(ctx, { x: x + 20, y: GROUND + 20, top: true, theme: 'plain' });
          ART.drawGround(ctx, { x: x + 20, y: GROUND + 60, top: false, theme: 'plain' });
          ART.drawGround(ctx, { x: x + 20, y: GROUND + 100, top: false, theme: 'plain' });
        }
        ok = true;
      }
    } catch (e) { ok = false; }
    if (!ok) { ctx.fillStyle = '#7b5a3c'; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = '#63c35a'; ctx.fillRect(0, GROUND, W, 10); }
  }
  function drawBack(ctx) {
    var ok = false;
    try { if (ART.drawBackground) { ART.drawBackground(ctx); ok = true; } } catch (e) { ok = false; }
    if (!ok) { ctx.fillStyle = '#1a2233'; ctx.fillRect(0, 0, W, H); }
    drawGroundRow(ctx);
    // 高台 + 跳蛙群(混亂度參考: 怪物也在畫面上時, 冷卻顯示仍要讀得到)
    try {
      if (ART.drawGround) for (var x = 920; x < 1160; x += 40) ART.drawGround(ctx, { x: x + 20, y: 460, top: true, theme: 'plain' });
      if (ART.drawFrog) {
        ART.drawFrog(ctx, { x: 980, y: 426, facing: -1, state: 'crouch', hit: false, brood: false });
        ART.drawFrog(ctx, { x: 1040, y: 426, facing: -1, state: 'crouch', hit: false, brood: false });
        ART.drawFrog(ctx, { x: 1110, y: 586, facing: -1, state: 'crouch', hit: false, brood: false });
      }
    } catch (e) { /* 底版缺函式時略過 */ }
  }
  // 資訊列(ui-A, 已拿掉冷卻環那格)
  var KINDS = ['wood', 'stone', 'time', 'soul'];
  var KIND_USE = { wood: '開路', stone: '修復', time: '加速', soul: '強化' };
  var KIND_DARK = { wood: '#7a4a1e', stone: '#4c5562', time: '#127a8c', soul: '#8e2a80' };
  var STOCK = { wood: 38, stone: 42, time: 17, soul: 9 }, RATE = { wood: 12.4, stone: 5.0, time: 2.1, soul: 0.8 }, RUN = { wood: 5, stone: 2, time: 0, soul: 3 };
  function drawHudBar(ctx, S) {
    ctx.save();
    ctx.fillStyle = K.board; ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = K.plank; ctx.fillRect(0, 0, W, 21);
    ctx.fillStyle = K.seam; ctx.fillRect(0, 21, W, 1.5);
    ctx.fillStyle = K.edge; ctx.fillRect(0, 41, W, 3);
    var i;
    for (i = 0; i < 4; i++) {
      var k = KINDS[i], x0 = 8 + i * 168;
      rr(ctx, x0, 5, 160, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
      matIcon(ctx, k, x0 + 24, 21, 22);
      text(ctx, String(STOCK[k]), x0 + 40, 22, 20, K.ink, 'left', true);
      text(ctx, '+' + RATE[k].toFixed(1) + '/分', x0 + 96, 14, 11, KIND_DARK[k], 'left', true);
      text(ctx, KIND_USE[k], x0 + 96, 29, 10, K.inkDim, 'left', true);
    }
    for (i = 0; i < 3; i++) {
      heartShape(ctx, 718 + i * 24, 21, 1.25);
      if (i < 2) { ctx.fillStyle = C('hp', '#ff4d5e'); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.parch; ctx.stroke(); }
      else { ctx.lineWidth = 1.8; ctx.strokeStyle = '#8a7a60'; ctx.stroke(); }
    }
    rr(ctx, 850, 5, 92, 32, 5); ctx.fillStyle = K.parch; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    circle(ctx, 866, 21, 7); ctx.lineWidth = 2; ctx.strokeStyle = K.ink; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(866, 21); ctx.lineTo(866, 16.5); ctx.moveTo(866, 21); ctx.lineTo(869.5, 21); ctx.stroke();
    text(ctx, (S.lt + 2).toFixed(1) + 's', 879, 22, 18, K.ink, 'left', true);
    rr(ctx, 952, 5, 318, 32, 5); ctx.fillStyle = '#e6d6b2'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = K.edge; ctx.stroke();
    text(ctx, '這趟', 962, 22, 12, K.inkDim, 'left', true);
    for (i = 0; i < 4; i++) {
      var kk = KINDS[i], rx = 1000 + i * 66;
      matIcon(ctx, kk, rx + 9, 21, 17);
      text(ctx, String(RUN[kk]), rx + 21, 22, 16, RUN[kk] > 0 ? K.ink : '#a39478', 'left', true);
    }
    ctx.restore();
  }
  // 主角 + 技能本身的最小示意(技能特效的正式畫法屬 combat-fx, 這裡只為了看出「施放了」)
  function drawHeroAt(ctx, S, glow) {
    var sg = S.seg;
    ctx.save();
    if (sg.cls === 'bomber' && S.ca >= 0 && S.ca < 0.4 && ART.drawShockwave) {
      try { ART.drawShockwave(ctx, { x: S.x, y: S.y + 6, t: S.ca, dur: 0.4, radius: 130 }); } catch (e) { /* 略過 */ }
    }
    if (sg.cls === 'sword' && S.ca >= 0 && S.ca < 0.32) {
      var a = 1 - S.ca / 0.32;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * a).toFixed(3) + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      for (var i = 0; i < 3; i++) { var yy = S.y - 10 + i * 10; ctx.moveTo(S.x - 22, yy); ctx.lineTo(S.x - 22 - 50 * a, yy); }
      ctx.stroke();
    }
    ctx.translate(S.x, S.y + S.bob);
    if (sg.cls === 'sword' && S.active) ctx.rotate(0.2);
    if (sg.cls === 'bomber' && S.ca >= 0 && S.ca < 0.3) { ctx.translate(0, 20); ctx.scale(1.08, 0.9); ctx.translate(0, -20); }
    if (S.longActive) {
      ctx.globalAlpha *= 0.35;
    }
    if (glow) { ctx.shadowColor = glow.color; ctx.shadowBlur = glow.blur; }
    hero(ctx, S.cls, 1, S.swing);
    ctx.restore();
    if (S.longActive) {   // 潛行中: 半透明 + 虛線輪廓(正式畫法見 combat-fx)
      ctx.save(); ctx.translate(S.x, S.y + S.bob);
      ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = CLS_LT.hunter;
      poly(ctx, [0, -22, 15, 17, -15, 17]); ctx.stroke();
      ctx.restore();
    }
    if (S.lt < 0.3 && ART.drawPoof) {   // 換職業(示意)
      try { ART.drawPoof(ctx, { x: S.x, y: S.y, t: S.lt, dur: 0.3, big: false }); } catch (e) { /* 略過 */ }
    }
  }
  // 示意標註(方案頁用, 不是遊戲 UI): 右下角虛線框
  function drawCaption(ctx, S) {
    ctx.save();
    var x = 924, y = 650, w = 340, h = 58;
    rr(ctx, x, y, w, h, 6); ctx.fillStyle = 'rgba(10,12,18,0.72)'; ctx.fill();
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(200,210,230,0.6)'; ctx.stroke(); ctx.setLineDash([]);
    text(ctx, '示意 | ' + NAME[S.cls] + '・' + S.seg.skill + '  冷卻 ' + S.seg.cd.toFixed(1) + ' 秒', x + 12, y + 18, 13, '#c9d1e0', 'left', true);
    var col = S.phase === '可用' ? K.gold : (S.phase === '冷卻完成' ? '#ffffff' : (S.phase.indexOf('按 X') >= 0 ? K.red : '#9aa4b8'));
    text(ctx, '現在: ' + S.phase, x + 12, y + 40, 15, col, 'left', true);
    ctx.restore();
  }

  /* ---------- 方案 C: 角色本體蓄光 + 完成閃光 ----------
   * 不加任何計量條或數字, 冷卻狀態長在主角身上。
   * 冷卻中 = 主角照常(白描邊), 職業亮色光點從四周螺旋聚向胸口; 冷卻越接近完成, 參與的光點越多、胸口光核越大(粗略的進度)。
   * 最後 0.35 秒 = 光核快速閃兩下(預告)。
   * 冷卻完成 = 地面往上一道白光柱 + 職業色光環擴散 + 武器尖端一顆大四芒星「叮」。
   * 可用 = 主角外圍持續一層金色光暈(在白描邊外, 不取代「玩家白描邊」), 武器尖端每 1.2 秒閃一下小星。
   * 施放 = 金光暈碎成 8 片向外飛散(用掉了)。潛行持續中 = 半透明 + 虛線輪廓, 沒有光暈也沒有光點。
   * 冷卻中按 X = 胸口冒一團灰煙「噗」+ 主角小抖。 */
  function motesC(ctx, S) {
    var N = 12, col = CLS_LT[S.cls], cx = S.x, cy = S.y - 2 + S.bob;
    ctx.save();
    for (var i = 0; i < N; i++) {
      if (i / N > S.p + 0.2) continue;   // 越接近完成, 越多光點參與
      var q = ((S.ca * 1.6 + i * 0.381) % 1 + 1) % 1;
      var th = i * 2.399 + q * 2.4, r = 46 * (1 - q) + 5;
      ctx.globalAlpha = Math.sin(Math.PI * q) * 0.95;
      circle(ctx, cx + Math.cos(th) * r, cy + Math.sin(th) * r * 0.9, 2.6); ctx.fillStyle = col; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 胸口光核
    var core = 2 + 5 * S.p, ca = 0.25 + 0.6 * S.p;
    if (S.cdLeft < 0.35) { var w = Math.sin((0.35 - S.cdLeft) / 0.35 * Math.PI * 4); core += 3 * Math.max(0, w); ca = 0.6 + 0.4 * Math.max(0, w); }
    ctx.shadowColor = col; ctx.shadowBlur = 10;
    circle(ctx, cx, cy, core); ctx.fillStyle = 'rgba(255,255,255,' + ca.toFixed(3) + ')'; ctx.fill();
    ctx.restore();
  }
  function fxBehindC(ctx, S) {
    if (!S.cooling && S.readyAge >= 0 && S.readyAge < 0.55) {   // 光柱
      var a = S.readyAge / 0.55;
      ctx.save();
      var g = ctx.createLinearGradient(0, GROUND - 150, 0, GROUND);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,250,220,0.9)');
      ctx.globalAlpha = 1 - a; ctx.fillStyle = g;
      var hw = 22 * (1 - 0.5 * a);
      ctx.fillRect(S.x - hw, GROUND - 150, hw * 2, 150);
      ctx.restore();
    }
  }
  function fxFrontC(ctx, S) {
    ctx.save();
    var f = TIP[S.cls], tx = S.x + f[0], ty = S.y + S.bob + f[1];
    if (S.cooling && !S.longActive) motesC(ctx, S);
    if (!S.cooling) {
      if (S.readyAge >= 0 && S.readyAge < 0.55) {
        var a = S.readyAge / 0.55;
        ctx.globalAlpha = 1 - a; ctx.lineWidth = 4 * (1 - a) + 1.5; ctx.strokeStyle = CLS_LT[S.cls];
        circle(ctx, S.x, S.y, 22 + 50 * a); ctx.stroke();
        ctx.globalAlpha = 1;
        var sr = 14 * Math.sin(Math.PI * Math.min(1, a * 1.3));
        star4(ctx, tx, ty, sr); ctx.fillStyle = '#ffffff'; ctx.fill();
        star4(ctx, tx, ty, sr * 0.5); ctx.fillStyle = K.gold; ctx.fill();
      } else {
        var g = S.steadyT % 1.2;   // 武器尖端週期閃星
        if (g < 0.3) { var s = 6 * Math.sin(Math.PI * g / 0.3); star4(ctx, tx, ty, s); ctx.fillStyle = '#fffbe0'; ctx.fill(); }
      }
    }
    if (S.ca >= 0 && S.ca < 0.3) {   // 施放: 金光暈碎片飛散
      var q = S.ca / 0.3;
      ctx.globalAlpha = 1 - q; ctx.fillStyle = K.gold;
      for (var i = 0; i < 8; i++) {
        var an = i / 8 * TAU + 0.2, r = 20 + 34 * q, px = S.x + Math.cos(an) * r, py = S.y + Math.sin(an) * r * 1.1;
        ctx.save(); ctx.translate(px, py); ctx.rotate(an + q * 3);
        poly(ctx, [-4, -2, 4, -3, 1, 3]); ctx.fill(); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    if (S.denyAge >= 0 && S.denyAge < 0.4) {   // 冷卻中按 X: 灰煙
      var d = S.denyAge / 0.4;
      ctx.globalAlpha = 1 - d; ctx.fillStyle = '#8d8f98';
      var pts = [[0, 0, 6], [-7, -3, 4.5], [7, -4, 4.5], [0, -8, 4]];
      for (i = 0; i < pts.length; i++) { circle(ctx, S.x + 16 + pts[i][0] * (1 + d), S.y - 6 + pts[i][1] * (1 + d) - 10 * d, pts[i][2] * (0.8 + 0.6 * d)); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'skill-cd', id: 'C', kind: 'anim',
    size: [W, H], duration: DUR, loop: true,
    draw: function (ctx, t) {
      var S = timeline(t);
      ctx.save();
      drawBack(ctx);
      fxBehindC(ctx, S);
      var glow = null;
      if (!S.cooling) {
        var a = (S.readyAge >= 0 && S.readyAge < 0.55) ? S.readyAge / 0.55 : 1;
        glow = { color: K.gold, blur: 14 + 16 * (1 - a) };
      }
      if (S.denyAge >= 0 && S.denyAge < 0.25) { S = Object.create(S); S.x = S.x + Math.sin(S.denyAge * 80) * 2.5; }
      drawHeroAt(ctx, S, glow);
      fxFrontC(ctx, S);
      drawHudBar(ctx, S);
      drawCaption(ctx, S);
      ctx.restore();
    }
  };
})();
