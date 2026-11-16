/* 三職工坊 — 美術 (explore-1 / game-b)
 * 全部 Canvas 2D 幾何繪製, 不引外部資源。
 * 契約: window.Art.drawXxx(ctx, state), 每個函式自己 save/restore。
 */
(function () {
  'use strict';

  // ---------- 設計常數 ----------
  var W = 1280, H = 720, HUD_H = 40, TILE = 40;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var C = {
    // 背景(低調, 不搶戲)
    bgTop: '#2b3c55', bgBottom: '#18212e', bgHillFar: '#24344a', bgHillNear: '#1f2c3d', bgTree: '#1b2736',
    mapBg: '#161b26', mapBand: '#1c2230',
    // 地形
    earth: '#5c4634', earthDark: '#46352a', earthSpeck: '#6d5541', grass: '#6aa84a', grassDark: '#4c7d35',
    oreStone: '#3f4350', oreStoneEdge: '#2c2f38',
    rubble: '#9a948c', rubbleDark: '#6b665f', rubbleCrack: '#3a3733',
    spikeMetal: '#cfd5de', spikeBase: '#5d6470',
    wood: '#a8743f', woodDark: '#7a5129', rope: '#c9a46a', ropeDark: '#8a6a3c',
    pole: '#e6e9ef', goalFlag: '#46d2ff', goalDone: '#ffffff',
    // 職業色 = 該職業素材色(一個意義一種長相)
    hunter: '#4cc85a', miner: '#f0c030', fairy: '#d26cf0',
    hunterDark: '#2f7a37', minerDark: '#9a7a1c', fairyDark: '#84409a',
    // 怪物
    wolf: '#9aa3b2', wolfDark: '#6c7484', beetle: '#3e5674', beetleRim: '#8fb0d6', beetleDark: '#1f2c3d',
    // 保留色
    danger: '#ff4d4d',
    // UI
    text: '#f2f4f8', textDim: '#9aa5b5', textDark: '#141a24',
    panel: '#1e2633', panelDeep: '#121822', panelEdge: '#3a4659', hud: 'rgba(12,16,24,0.82)',
    select: '#ffffff', skin: '#f0c8a0'
  };
  var CLS = ['hunter', 'miner', 'fairy'];
  var MAT_OF = { hunter: 'fang', miner: 'ore', fairy: 'dew' };
  var CLS_OF = { fang: 'hunter', ore: 'miner', dew: 'fairy' };
  var MAT_NAME = { fang: '獸牙', ore: '礦石', dew: '花露' };
  var CLS_NAME = { hunter: '獵人', miner: '礦工', fairy: '精靈' };
  var MAT_COLOR = { fang: C.hunter, ore: C.miner, dew: C.fairy };

  // ---------- 正規化 ----------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function nCls(v) { return CLS.indexOf(v) >= 0 ? v : 'hunter'; }
  function nMat(v) { return MAT_COLOR[v] ? v : 'fang'; }
  function nFacing(v) { return v === -1 ? -1 : 1; }
  function obj(s) { return (s && typeof s === 'object') ? s : {}; }
  function mats(v) {
    v = obj(v);
    return { fang: num(v.fang, 0), ore: num(v.ore, 0), dew: num(v.dew, 0) };
  }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function str(v, d) { return (typeof v === 'string' || typeof v === 'number') ? String(v) : d; }
  function f1(v) { return num(v, 0).toFixed(1); }
  function prog(t, dur) { // 0..1 進行中, -1 閒置
    t = num(t, 0); dur = num(dur, 0);
    if (!(dur > 0) || t >= dur || t < 0) return -1;
    return t / dur;
  }
  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
  }
  function hash(a, b) {
    var h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  // ---------- 基本形 ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }
  function font(px, bold) { return (bold ? 'bold ' : '') + px + 'px ' + FONT; }
  function text(ctx, s, x, y, px, color, align, bold, base) {
    ctx.font = font(px, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = base || 'middle';
    ctx.fillText(s, x, y);
  }
  // 帶深色描邊的字(壓在遊戲世界上時用)
  function otext(ctx, s, x, y, px, color, align, bold) {
    ctx.font = font(px, bold);
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, px / 5);
    ctx.strokeStyle = 'rgba(10,14,20,0.9)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function textW(ctx, s, px, bold) { ctx.font = font(px, bold); return ctx.measureText(s).width || s.length * px * 0.6; }

  // 鍵帽, (x, y) = 左緣中點, 回傳寬度
  function keycap(ctx, label, x, y, h) {
    h = h || 26;
    var px = Math.round(h * 0.55);
    var w = Math.max(h, textW(ctx, label, px, true) + h * 0.6);
    rr(ctx, x, y - h / 2, w, h, 5);
    ctx.fillStyle = '#e8ecf2';
    ctx.fill();
    ctx.fillStyle = '#9aa3b2';
    ctx.fillRect(x + 3, y + h / 2 - 4, w - 6, 3);
    text(ctx, label, x + w / 2, y - 1, px, C.textDark, 'center', true);
    return w;
  }

  // ---------- 素材圖示(形狀分種類, 顏色 = 職業色) ----------
  function matIcon(ctx, type, cx, cy, r) {
    type = nMat(type);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.5, r * 0.18);
    ctx.strokeStyle = 'rgba(10,14,20,0.9)';
    ctx.fillStyle = MAT_COLOR[type];
    ctx.beginPath();
    if (type === 'fang') { // 彎牙
      ctx.moveTo(-r * 0.75, -r * 0.8);
      ctx.quadraticCurveTo(r * 0.1, -r * 1.0, r * 0.75, -r * 0.8);
      ctx.quadraticCurveTo(r * 0.6, r * 0.2, -r * 0.15, r * 0.95);
      ctx.quadraticCurveTo(-r * 0.05, r * 0.1, -r * 0.75, -r * 0.8);
    } else if (type === 'ore') { // 六角寶石
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 6 + i * Math.PI / 3;
        var px = Math.cos(a) * r * 0.95, py = Math.sin(a) * r * 0.95;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    } else { // 水滴
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.9, r * 0.05, r * 0.7, r * 0.45);
      ctx.arc(0, r * 0.3, r * 0.7, 0.2, Math.PI - 0.2);
      ctx.quadraticCurveTo(-r * 0.9, r * 0.05, 0, -r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 鎖頭
  function lockIcon(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.28, Math.PI, 0);
    ctx.lineTo(s * 0.28, 0);
    ctx.moveTo(-s * 0.28, 0);
    ctx.lineTo(-s * 0.28, -s * 0.15);
    ctx.stroke();
    rr(ctx, -s * 0.42, 0, s * 0.84, s * 0.6, s * 0.08);
    ctx.fill();
    ctx.fillStyle = C.panelDeep;
    ctx.beginPath();
    ctx.arc(0, s * 0.25, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 配方列: 只畫非 0 的種類; 缺的那種紅字 + 底線 + 「缺」
  function costRow(ctx, cost, missing, x, y, px, align) {
    cost = mats(cost);
    missing = arr(missing);
    var items = [];
    ['fang', 'ore', 'dew'].forEach(function (k) { if (cost[k] > 0) items.push(k); });
    var r = px * 0.55, gap = px * 0.9;
    var widths = items.map(function (k) {
      var lack = missing.indexOf(k) >= 0;
      return r * 2 + 6 + textW(ctx, String(cost[k]), px, true) + (lack ? textW(ctx, '缺', px * 0.7, true) + 8 : 0);
    });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + Math.max(0, items.length - 1) * gap;
    var cx = align === 'center' ? x - total / 2 : (align === 'right' ? x - total : x);
    items.forEach(function (k, i) {
      var lack = missing.indexOf(k) >= 0;
      matIcon(ctx, k, cx + r, y, r);
      var tx = cx + r * 2 + 6;
      var s = String(cost[k]);
      text(ctx, s, tx, y, px, lack ? C.danger : C.text, 'left', true);
      var sw = textW(ctx, s, px, true);
      if (lack) {
        ctx.fillStyle = C.danger;
        ctx.fillRect(tx, y + px * 0.55, sw, 2);
        rr(ctx, tx + sw + 4, y - px * 0.42, textW(ctx, '缺', px * 0.7, true) + 6, px * 0.84, 3);
        ctx.fill();
        text(ctx, '缺', tx + sw + 7, y, px * 0.7, '#fff', 'left', true);
      }
      cx += widths[i] + gap;
    });
    return total;
  }

  function selectFrame(ctx, x, y, w, h) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.select;
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 12);
    ctx.stroke();
    // 四角加粗, 一眼看得出是游標
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    rr(ctx, x - 1, y - 1, w + 2, h + 2, 9);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 角色(三職業共用骨架) ----------
  // 本地座標: 中心 (0,0), 面向右, 判定框 x∈[-14,14] y∈[-22,22]
  // o: pose, skillK, autoK, autoA(本地角度), tint: null|'flash'|'shadow', t
  function figure(ctx, cls, o) {
    var pose = o.pose, t = o.t || 0, tint = o.tint;
    function col(c) { return tint === 'flash' ? '#ffd6d6' : (tint === 'shadow' ? '#2b3242' : c); }
    var ph = Math.sin(t * 14);
    var feet;
    if (pose === 'run') feet = [[-3 + ph * 6, 19.5 - Math.max(0, ph) * 3], [3 - ph * 6, 19.5 - Math.max(0, -ph) * 3]];
    else if (pose === 'rise') feet = [[-5, 15], [3, 17]];
    else if (pose === 'fall') feet = [[-7, 19], [6, 18]];
    else if (pose === 'glide') feet = [[-3, 18], [3, 17]];
    else if (pose === 'hurt') feet = [[-6, 18], [5, 19.5]];
    else feet = [[-4, 19.5], [4, 19.5]];

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 精靈翅膀在身後
    if (cls === 'fairy') {
      ctx.fillStyle = tint ? col('#000') : 'rgba(248,214,255,0.7)';
      ctx.strokeStyle = col('#f3c4ff');
      ctx.lineWidth = 1.2;
      if (pose === 'glide') {
        [[-5, -9, -0.75], [5, -9, 0.75]].forEach(function (w) {
          ctx.beginPath(); ctx.ellipse(w[0], w[1], 5, 10, w[2], 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
      } else {
        var flap = pose === 'rise' || pose === 'fall' ? Math.sin(t * 30) * 0.25 : 0;
        ctx.beginPath(); ctx.ellipse(-7, -4, 4, 9, -0.5 + flap, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-4, 3, 3, 6, -1.0 + flap, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }

    // 腿
    var legCol = cls === 'hunter' ? '#3b4a2c' : (cls === 'miner' ? '#353b48' : C.skin);
    ctx.strokeStyle = col(legCol);
    ctx.lineWidth = cls === 'fairy' ? 3 : 4;
    feet.forEach(function (f, i) {
      ctx.beginPath(); ctx.moveTo(i ? 3 : -3, 9); ctx.lineTo(f[0], f[1]); ctx.stroke();
    });

    // 礦工鎬子(閒置時背在背後)
    var swinging = cls === 'miner' && (o.skillK >= 0 || o.autoK >= 0);
    if (cls === 'miner' && !swinging) {
      ctx.strokeStyle = col(C.woodDark); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-3, 8); ctx.lineTo(-10, -9); ctx.stroke();
      ctx.strokeStyle = col('#aab2bf'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-13, -5); ctx.quadraticCurveTo(-11, -12, -5, -13); ctx.stroke();
    }

    // 身體
    if (cls === 'hunter') {
      ctx.fillStyle = col(C.hunter);
      rr(ctx, -7, -6, 14, 17, 4); ctx.fill();
      ctx.fillStyle = col('#6b4a2a'); ctx.fillRect(-7, 3, 14, 2.5);
      // 箭袋
      ctx.fillStyle = col('#7a5129'); rr(ctx, -10, -6, 4, 11, 1.5); ctx.fill();
    } else if (cls === 'miner') {
      ctx.fillStyle = col('#c9cdd4'); rr(ctx, -8, -6, 16, 9, 3); ctx.fill();
      ctx.fillStyle = col('#4f6788'); rr(ctx, -8, -1, 16, 12, 3); ctx.fill();
      ctx.fillStyle = col('#3c5170'); ctx.fillRect(-5, -6, 2.5, 6); ctx.fillRect(2.5, -6, 2.5, 6);
    } else {
      ctx.fillStyle = col(C.fairy);
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(8, 11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col(C.fairyDark); ctx.fillRect(-3, -6, 6, 5);
    }

    // 頭
    if (cls === 'hunter') {
      ctx.fillStyle = col(C.hunter);
      ctx.beginPath(); ctx.arc(0, -12.5, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, -18); ctx.lineTo(-13, -9); ctx.lineTo(-5, -7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col(C.skin);
      ctx.beginPath(); ctx.arc(2.5, -11.5, 5.2, 0, Math.PI * 2); ctx.fill();
    } else if (cls === 'miner') {
      ctx.fillStyle = col(C.skin);
      ctx.beginPath(); ctx.arc(1, -11, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col(C.miner);
      ctx.beginPath(); ctx.arc(1, -13, 7.5, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillRect(-8, -13.5, 18, 2.5);
      ctx.fillStyle = col('#ffffff');
      ctx.beginPath(); ctx.arc(7, -15.5, 2.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = col('#f3e6ff');
      ctx.beginPath(); ctx.arc(0, -12.5, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(-11, -6); ctx.lineTo(-4, -8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col(C.skin);
      ctx.beginPath(); ctx.arc(2, -11.5, 5, 0, Math.PI * 2); ctx.fill();
      // 頭頂光點
      ctx.fillStyle = col('#ffffff');
      ctx.beginPath(); ctx.arc(-1, -20, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // 眼
    if (!tint || tint === 'flash') {
      ctx.fillStyle = '#1a1d24';
      ctx.beginPath(); ctx.arc(5, -12, 1.2, 0, Math.PI * 2); ctx.fill();
    }

    // 武器 / 出手
    if (cls === 'hunter') {
      ctx.save();
      ctx.translate(2, -1);
      var bowA = o.autoK >= 0 ? clamp(o.autoA, -1.3, 1.3) : 0;
      ctx.rotate(bowA);
      var pull = o.skillK >= 0 ? 1 : (o.autoK >= 0 ? 0.6 * (1 - o.autoK) : 0);
      ctx.strokeStyle = col(C.woodDark); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(1, 0, 10, -1.1, 1.1); ctx.stroke();
      var ex = 1 + Math.cos(1.1) * 10, ey = Math.sin(1.1) * 10;
      var sx = ex - pull * 7;
      ctx.strokeStyle = col('#e8e2d0'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, -ey); ctx.lineTo(sx, 0); ctx.lineTo(ex, ey); ctx.stroke();
      if (o.skillK >= 0 && !tint) { // 穿透箭: 發光的搭箭
        ctx.strokeStyle = '#eaffea'; ctx.lineWidth = 2.5;
        ctx.shadowColor = C.hunter; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(10.5, 0); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    } else if (cls === 'miner' && swinging) {
      ctx.save();
      ctx.translate(0, -3);
      var a = o.skillK >= 0 ? (-0.9 + 1.4 * Math.min(1, o.skillK * 2)) : clamp(o.autoA, -1.4, 1.4);
      ctx.rotate(a);
      ctx.strokeStyle = col(C.woodDark); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.strokeStyle = col('#dfe4ea'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(8, -6); ctx.quadraticCurveTo(12.5, 0, 8, 6); ctx.stroke();
      ctx.restore();
    } else if (cls === 'fairy') {
      ctx.strokeStyle = col(C.skin); ctx.lineWidth = 2.5;
      var ha = o.autoK >= 0 ? clamp(o.autoA, -1.4, 1.4) : 0.9;
      ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(2 + Math.cos(ha) * 8, -3 + Math.sin(ha) * 8); ctx.stroke();
      if (o.autoK >= 0 && !tint) {
        var px = 2 + Math.cos(ha) * 10, py = -3 + Math.sin(ha) * 10;
        ctx.fillStyle = '#ffffff';
        star(ctx, px, py, 3.5 * (1 - o.autoK * 0.5), 1.4);
      }
    }
  }

  function star(ctx, x, y, r, ri) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? ri : r;
      var px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 職業小圖示(只取頭與肩, 縮在 s×s 方塊)
  function clsIcon(ctx, cls, cx, cy, s, tint) {
    ctx.save();
    ctx.translate(cx, cy);
    var k = s / 44;
    ctx.scale(k, k);
    figure(ctx, nCls(cls), { pose: 'idle', skillK: -1, autoK: -1, autoA: 0, tint: tint || null, t: 0 });
    ctx.restore();
  }

  function playerCore(ctx, s, ghost) {
    var cls = nCls(s.cls), facing = nFacing(s.facing);
    var pose = ['idle', 'run', 'rise', 'fall', 'glide', 'hurt'].indexOf(s.pose) >= 0 ? s.pose : 'idle';
    if (pose === 'glide' && cls !== 'fairy') pose = 'fall';
    var x = num(s.x, 0), y = num(s.y, 0);
    var skillK = ghost ? -1 : prog(s.skillT, s.skillDur);
    var autoK = ghost ? -1 : prog(s.autoT, s.autoDur);
    var worldA = num(s.autoAngle, 0);
    var localA = facing > 0 ? worldA : Math.PI - worldA;
    localA = Math.atan2(Math.sin(localA), Math.cos(localA));
    var t = now() + (ghost ? 0.37 * CLS.indexOf(cls) : 0);

    ctx.save();
    // 礦工自動揮鎬弧光: 世界座標, 朝 autoAngle, 半徑 70 以內
    if (!ghost && cls === 'miner' && autoK >= 0) {
      ctx.save();
      ctx.globalAlpha = 0.85 * (1 - autoK);
      var sweep = -0.7 + 1.4 * Math.min(1, autoK * 1.6);
      ctx.fillStyle = 'rgba(255,236,170,0.55)';
      ctx.strokeStyle = '#fff6d6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 66, worldA - 0.7, worldA + sweep);
      ctx.arc(x, y, 34, worldA + sweep, worldA - 0.7, true);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 66, worldA - 0.7, worldA + sweep);
      ctx.stroke();
      ctx.restore();
    }
    ctx.translate(x, y);
    var tint = null;
    if (ghost) {
      ctx.globalAlpha = 0.62;
    } else {
      var inv = s.invuln;
      var invOn = inv === true || (typeof inv === 'number' && isFinite(inv) && inv > 0);
      if (invOn && Math.floor(now() * 12) % 2) ctx.globalAlpha = 0.35;
      if (pose === 'hurt') tint = (Math.floor(now() * 16) % 2) ? 'flash' : null;
    }
    if (pose === 'hurt') { ctx.rotate(-0.15 * facing); ctx.scale(0.9, 0.9); }
    ctx.scale(facing, 1);
    figure(ctx, cls, { pose: pose, skillK: skillK, autoK: autoK, autoA: localA, tint: tint, t: t });
    if (ghost) {
      // 殘影: 職業色外框, 縮圖裡靠主色認人
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = C[cls];
      ctx.lineWidth = 2;
      rr(ctx, -12, -21, 24, 42, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- 地形繪製 ----------
  function groundTile(ctx, x, y, top) {
    var l = x - 20, t = y - 20;
    ctx.fillStyle = C.earth;
    ctx.fillRect(l, t, TILE, TILE);
    ctx.fillStyle = C.earthDark;
    ctx.fillRect(l, t + 36, TILE, 4);
    ctx.fillStyle = C.earthSpeck;
    for (var i = 0; i < 3; i++) {
      var hx = hash(x + i * 7, y), hy = hash(y + i * 3, x);
      ctx.fillRect(l + 4 + hx * 30, t + (top ? 12 : 4) + hy * 22, 4, 3);
    }
    if (top) {
      ctx.fillStyle = C.grass;
      ctx.fillRect(l, t, TILE, 8);
      ctx.fillStyle = C.grassDark;
      ctx.fillRect(l, t + 8, TILE, 2);
      ctx.beginPath();
      for (var j = 0; j < 5; j++) {
        var gx = l + 2 + j * 7.5;
        ctx.moveTo(gx, t + 8); ctx.lineTo(gx + 3, t + 12); ctx.lineTo(gx + 6, t + 8);
      }
      ctx.fillStyle = C.grass; ctx.fill();
    }
  }

  // ---------- 背景 ----------
  function sceneBg(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.bgTop);
    g.addColorStop(1, C.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // 遠山
    ctx.fillStyle = C.bgHillFar;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    for (var x = 0; x <= w; x += 80) ctx.lineTo(x, h * 0.55 + Math.sin(x * 0.006) * h * 0.06 + Math.sin(x * 0.017) * h * 0.02);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    // 近樹影
    ctx.fillStyle = C.bgTree;
    for (var i = 0; i < Math.ceil(w / 110); i++) {
      var tx = i * 110 + 30 + hash(i, 3) * 50, th = h * (0.14 + hash(i, 9) * 0.1), ty = h * 0.78;
      ctx.beginPath();
      ctx.moveTo(tx, ty - th); ctx.lineTo(tx + 26, ty); ctx.lineTo(tx - 26, ty); ctx.closePath(); ctx.fill();
      ctx.fillRect(tx - 3, ty, 6, 10);
    }
    ctx.fillStyle = C.bgHillNear;
    ctx.fillRect(0, h * 0.78 + 10, w, h);
  }

  // ---------- 飛空艇圖示 ----------
  function airship(ctx, cx, cy, s, dim) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.globalAlpha *= dim ? 0.55 : 1;
    ctx.fillStyle = '#c9b48a';
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -8, 30, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#9c865c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-28, -8); ctx.lineTo(28, -8); ctx.moveTo(-18, -18); ctx.lineTo(-18, 2); ctx.moveTo(0, -21); ctx.lineTo(0, 5); ctx.moveTo(18, -18); ctx.lineTo(18, 2); ctx.stroke();
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-8, 11); ctx.moveTo(10, 4); ctx.lineTo(8, 11); ctx.stroke();
    ctx.fillStyle = C.wood;
    rr(ctx, -12, 10, 24, 8, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e6e9ef';
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(-38, -16); ctx.lineTo(-38, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function panelBox(ctx, x, y, w, h, edge) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(ctx, x + 4, y + 6, w, h, 14); ctx.fill();
    ctx.fillStyle = C.panel;
    rr(ctx, x, y, w, h, 14); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = edge || C.panelEdge;
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 13); ctx.stroke();
  }

  function heart(ctx, cx, cy, r, full) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx - r * 1.3, cy, cx - r * 0.9, cy - r * 1.1, cx, cy - r * 0.4);
    ctx.bezierCurveTo(cx + r * 0.9, cy - r * 1.1, cx + r * 1.3, cy, cx, cy + r * 0.9);
    ctx.closePath();
    if (full) { ctx.fillStyle = C.danger; ctx.fill(); }
    ctx.lineWidth = 1.5; ctx.strokeStyle = full ? '#ffb3b3' : '#5a6474'; ctx.stroke();
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(num(sec, 0)));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // =====================================================================
  var Art = {
    canvas: { width: W, height: H },
    palette: {
      bg: C.bgTop, mapBg: C.mapBg, ground: C.earth, grass: C.grass,
      hunter: C.hunter, miner: C.miner, fairy: C.fairy,
      fang: C.hunter, ore: C.miner, dew: C.fairy,
      danger: C.danger, goal: C.goalFlag, wolf: C.wolf, beetle: C.beetle,
      oreVein: C.oreStone, rubble: C.rubble, bridge: C.wood, rope: C.rope,
      panel: C.panel, text: C.text, textDim: C.textDim, select: C.select
    },

    drawBackground: function (ctx) {
      ctx.save();
      sceneBg(ctx, W, H);
      ctx.restore();
    },

    drawMapBackground: function (ctx) {
      ctx.save();
      ctx.fillStyle = C.mapBg;
      ctx.fillRect(0, 0, W, H);
      // 三個區帶: 關卡 / 職業與產量 / 終極目標
      ctx.fillStyle = C.mapBand;
      ctx.fillRect(0, 50, W, 310);
      ctx.fillRect(0, 520, W, 110);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (var x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, HUD_H); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
      ctx.restore();
    },

    drawGround: function (ctx, s) {
      s = obj(s);
      ctx.save();
      groundTile(ctx, num(s.x, 0), num(s.y, 0), s.top === true);
      ctx.restore();
    },

    drawSpike: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0);
      ctx.save();
      // 判定 = 下半 40×20
      ctx.fillStyle = C.spikeBase;
      ctx.fillRect(x - 20, y + 15, 40, 5);
      for (var i = 0; i < 4; i++) {
        var bx = x - 20 + i * 10;
        ctx.fillStyle = C.spikeMetal;
        ctx.beginPath(); ctx.moveTo(bx + 0.5, y + 15); ctx.lineTo(bx + 5, y); ctx.lineTo(bx + 9.5, y + 15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.danger;
        ctx.beginPath(); ctx.moveTo(bx + 3.2, y + 6); ctx.lineTo(bx + 5, y); ctx.lineTo(bx + 6.8, y + 6); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    drawOreVein: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), l = x - 20, t = y - 20;
      ctx.save();
      ctx.fillStyle = C.oreStoneEdge;
      ctx.fillRect(l, t, 40, 40);
      ctx.fillStyle = C.oreStone;
      ctx.fillRect(l + 2, t + 2, 36, 36);
      // 礦晶(礦工色)
      var gems = [[-8, -7, 7], [8, -2, 6], [-3, 9, 6]];
      gems.forEach(function (g) {
        ctx.save();
        ctx.translate(x + g[0], y + g[1]);
        var r = g[2];
        ctx.fillStyle = C.minerDark;
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.miner;
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r * 0.2); ctx.lineTo(-r * 0.6, -r * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff6c8';
        ctx.fillRect(-1, -r * 0.6, 2, 2);
        ctx.restore();
      });
      // 閃光(說明這是寶)
      var tw = (Math.sin(now() * 3 + x * 0.1) + 1) / 2;
      ctx.globalAlpha = 0.4 + 0.6 * tw;
      ctx.fillStyle = '#fffbe6';
      star(ctx, x + 11, y - 12, 3.5, 1);
      ctx.restore();
    },

    drawRubbleWall: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), l = x - 20, t = y - 20;
      ctx.save();
      ctx.fillStyle = C.rubbleDark;
      ctx.fillRect(l, t, 40, 40);
      // 不規則石塊
      var stones = [[1, 1, 20, 12], [22, 1, 17, 12], [1, 14, 13, 12], [15, 14, 24, 12], [1, 27, 22, 12], [24, 27, 15, 12]];
      stones.forEach(function (b, i) {
        ctx.fillStyle = i % 2 ? '#a7a198' : C.rubble;
        rr(ctx, l + b[0], t + b[1], b[2], b[3], 3); ctx.fill();
      });
      // 裂紋
      ctx.strokeStyle = C.rubbleCrack; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l + 10, t + 4); ctx.lineTo(l + 17, t + 15); ctx.lineTo(l + 13, t + 22); ctx.lineTo(l + 22, t + 31); ctx.lineTo(l + 19, t + 37);
      ctx.moveTo(l + 17, t + 15); ctx.lineTo(l + 28, t + 19);
      ctx.stroke();
      // 礦工色虛線角框 = 只有礦工打得開
      ctx.strokeStyle = C.miner; ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(l + 3, t + 3, 34, 34);
      ctx.setLineDash([]);
      ctx.restore();
    },

    drawFlower: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
      var on = s.collectible === true;
      ctx.save();
      if (on) {
        var br = 0.5 + 0.5 * Math.sin(t * 3);
        var gr = ctx.createRadialGradient(x, y - 3, 2, x, y - 3, 12 + 6 * br);
        gr.addColorStop(0, 'rgba(240,170,255,0.75)');
        gr.addColorStop(1, 'rgba(210,108,240,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(x, y - 3, 12 + 6 * br, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = 0.45;
      }
      // 莖葉
      ctx.strokeStyle = on ? '#5fb85a' : '#6a7280'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y - 2); ctx.stroke();
      ctx.fillStyle = on ? '#5fb85a' : '#6a7280';
      ctx.beginPath(); ctx.ellipse(x + 4, y + 8, 4, 2, -0.5, 0, Math.PI * 2); ctx.fill();
      // 花瓣
      var pc = on ? C.fairy : '#8a8f9a';
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        ctx.fillStyle = pc;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 5.5, y - 4 + Math.sin(a) * 5.5, 4.5, 3.2, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = on ? '#ffffff' : '#b0b4bc';
      ctx.beginPath(); ctx.arc(x, y - 4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    drawRopeKnot: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0);
      var topY = HUD_H;
      ctx.save();
      ctx.lineCap = 'round';
      if (s.cut === true) {
        // 只剩斷掉的繩頭(從上方垂下, 末端散開)
        ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, Math.min(topY, y - 12)); ctx.lineTo(x, y - 6); ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 6); ctx.lineTo(x - 4, y - 1);
        ctx.moveTo(x, y - 6); ctx.lineTo(x, y);
        ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y - 1);
        ctx.stroke();
      } else {
        ctx.strokeStyle = C.rope; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, Math.min(topY, y - 12)); ctx.lineTo(x, y - 6); ctx.stroke();
        // 結
        ctx.fillStyle = C.rope;
        ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.ropeDark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x - 5, y - 3); ctx.lineTo(x + 5, y + 3); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x + 5, y - 3); ctx.stroke();
        // 獵人色虛線靶環 = 獵人的目標
        ctx.strokeStyle = C.hunter; ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(x, y, 10.5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    },

    drawBridge: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), l = x - 20, t = y - 20;
      ctx.save();
      if (s.lowered === true) {
        ctx.fillStyle = C.woodDark;
        ctx.fillRect(l, t, 40, 16);
        ctx.fillStyle = C.wood;
        ctx.fillRect(l, t, 40, 12);
        ctx.fillStyle = C.woodDark;
        ctx.fillRect(l + 19, t, 2, 12);
        ctx.fillStyle = '#e0c49a';
        [[l + 4, t + 6], [l + 15, t + 6], [l + 25, t + 6], [l + 36, t + 6]].forEach(function (p) { ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2); });
      } else {
        // 收起: 淡色虛框 = 「這裡之後會有橋」, 獵人色
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = C.hunter; ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(l + 1, t + 1, 38, 14);
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = C.hunter;
        ctx.fillRect(l + 1, t + 1, 38, 14);
      }
      ctx.restore();
    },

    drawGoal: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), done = s.reached === true;
      var bot = y + 40, top = y - 40;
      ctx.save();
      // 底座
      ctx.fillStyle = '#5d6470';
      rr(ctx, x - 12, bot - 6, 24, 6, 2); ctx.fill();
      // 旗桿
      ctx.fillStyle = C.pole;
      ctx.fillRect(x - 12, top + 4, 3, 74);
      ctx.beginPath(); ctx.arc(x - 10.5, top + 4, 3, 0, Math.PI * 2); ctx.fill();
      // 旗面
      var wv = Math.sin(now() * 4) * 2;
      ctx.fillStyle = done ? C.goalDone : C.goalFlag;
      ctx.beginPath();
      ctx.moveTo(x - 9, top + 8);
      ctx.quadraticCurveTo(x + 4, top + 6 + wv, x + 19, top + 10);
      ctx.lineTo(x + 19, top + 32);
      ctx.quadraticCurveTo(x + 4, top + 28 + wv, x - 9, top + 30);
      ctx.closePath(); ctx.fill();
      if (done) {
        ctx.strokeStyle = '#2a8a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x - 1, top + 19); ctx.lineTo(x + 4, top + 24); ctx.lineTo(x + 12, top + 14); ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        star(ctx, x + 5, top + 19, 6, 2.5);
      }
      ctx.restore();
    },

    drawPlayer: function (ctx, s) {
      s = obj(s);
      ctx.save();
      playerCore(ctx, s, false);
      ctx.restore();
    },

    drawGhost: function (ctx, s) {
      s = obj(s);
      ctx.save();
      playerCore(ctx, s, true);
      ctx.restore();
    },

    drawRangeRing: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), r = clamp(num(s.radius, 0), 0, 240);
      var c = C[nCls(s.cls)];
      ctx.save();
      if (r > 2) {
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = c; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    },

    drawWolf: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), f = nFacing(s.facing);
      var hp = num(s.hp, 3), max = Math.max(1, num(s.maxHp, 3));
      var hurt = prog(s.hurtT, s.hurtDur) >= 0;
      var t = now() + x * 0.01;
      ctx.save();
      ctx.translate(x, y);
      ctx.save();
      ctx.scale(f, 1);
      var body = hurt ? '#ffffff' : C.wolf, dark = hurt ? '#ffffff' : C.wolfDark;
      // 腿(底邊貼地 y=15)
      var ph = Math.sin(t * 12) * 3;
      ctx.strokeStyle = dark; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      [[-12, ph], [-6, -ph], [7, -ph], [12, ph]].forEach(function (l) {
        ctx.beginPath(); ctx.moveTo(l[0], 4); ctx.lineTo(l[0] + l[1] * 0.6, 13); ctx.stroke();
      });
      // 尾
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-22, -9, -21, 0); ctx.quadraticCurveTo(-18, 1, -14, 2); ctx.closePath(); ctx.fill();
      // 身
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(-1, 0, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.ellipse(-2, -4, 11, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      // 頭
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.moveTo(9, -9); ctx.lineTo(21, -3); ctx.lineTo(20, 2); ctx.lineTo(9, 5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, -9); ctx.lineTo(11, -15); ctx.lineTo(15, -7); ctx.closePath(); ctx.fill();
      // 紅眼 = 會傷人
      if (!hurt) { ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(15, -3, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (hp < max) hpBar(ctx, 44, 15, hp, max);
      ctx.restore();
    },

    drawBeetle: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), f = nFacing(s.facing);
      var hp = num(s.hp, 6), max = Math.max(1, num(s.maxHp, 6));
      var hurt = prog(s.hurtT, s.hurtDur) >= 0;
      var t = now() + x * 0.01;
      ctx.save();
      ctx.translate(x, y);
      ctx.save();
      ctx.scale(f, 1);
      var ph = Math.sin(t * 8) * 2;
      // 腳(底邊 y=16)
      ctx.strokeStyle = hurt ? '#ffffff' : C.beetleDark; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      [-12, -2, 8].forEach(function (lx, i) {
        ctx.beginPath(); ctx.moveTo(lx, 6); ctx.lineTo(lx + (i % 2 ? ph : -ph) - 3, 14.5); ctx.stroke();
      });
      // 頭與角
      ctx.fillStyle = hurt ? '#ffffff' : C.beetleDark;
      ctx.beginPath(); ctx.arc(15, 4, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.quadraticCurveTo(23.5, -4, 22, -11); ctx.lineTo(20, -3); ctx.closePath(); ctx.fill();
      // 殼(厚外框 = 硬)
      ctx.fillStyle = hurt ? '#ffffff' : C.beetle;
      ctx.strokeStyle = hurt ? '#ffffff' : C.beetleDark; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-21, 8); ctx.quadraticCurveTo(-20, -13, 0, -13); ctx.quadraticCurveTo(16, -13, 15, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (!hurt) {
        ctx.strokeStyle = C.beetleRim; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(-3, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(-3, 8, 14, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = C.beetleRim;
        [[-12, 0], [6, 0], [-8, -6], [2, -6]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.4, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = C.danger; ctx.beginPath(); ctx.arc(17, 3, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      if (hp < max) hpBar(ctx, 48, 16, hp, max);
      ctx.restore();
    },

    drawHunterArrow: function (ctx, s) {
      s = obj(s);
      ctx.save();
      ctx.translate(num(s.x, 0), num(s.y, 0));
      ctx.rotate(num(s.angle, 0));
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(7, 0); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(6, -3); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.hunter;
      ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-6, 0); ctx.lineTo(-12, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    drawPierceShot: function (ctx, s) {
      s = obj(s);
      var x0 = num(s.x0, 0), y = num(s.y, 0), dir = s.dir === -1 ? -1 : 1;
      var dur = num(s.dur, 0.15), t = clamp(num(s.t, 0), 0, dur > 0 ? dur : 1);
      var k = dur > 0 ? t / dur : 1;
      if (k >= 1) return;
      var x1 = dir > 0 ? W : 0;
      var lx = Math.min(x0, x1), w = Math.abs(x1 - x0);
      ctx.save();
      ctx.globalAlpha = 1 - k * 0.7;
      var hh = 8 * (1 - k * 0.5);
      ctx.fillStyle = 'rgba(76,200,90,0.55)';
      ctx.fillRect(lx, y - hh, w, hh * 2);
      ctx.fillStyle = '#eaffea';
      ctx.fillRect(lx, y - hh * 0.35, w, hh * 0.7);
      // 起點閃光
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x0, y, 8 * (1 - k), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    drawOrb: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), t = num(s.t, 0);
      ctx.save();
      // 拖尾: 繞行的小光點(20px 內)
      for (var i = 0; i < 4; i++) {
        var a = t * 9 + i * 1.6, rd = 9 + i * 2.5;
        ctx.globalAlpha = 0.5 - i * 0.1;
        ctx.fillStyle = '#f3c4ff';
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rd, y + Math.sin(a) * rd, 2.2 - i * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      var g = ctx.createRadialGradient(x, y, 1, x, y, 7);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#efb4ff');
      g.addColorStop(1, 'rgba(210,108,240,0.2)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },

    drawPoof: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), dur = num(s.dur, 0.3);
      var k = dur > 0 ? clamp(num(s.t, 0) / dur, 0, 1) : 1;
      if (k >= 1) return;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      for (var i = 0; i < 6; i++) {
        var a = i * Math.PI / 3 + 0.3;
        var d = 4 + 10 * k, r = 6 + 3.5 * k;
        ctx.fillStyle = i % 2 ? '#d8dce4' : '#b8bec9';
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#7a7f8a';
      for (var j = 0; j < 4; j++) {
        var b = j * Math.PI / 2 + 0.8, dd = 8 + 13 * k;
        ctx.fillRect(x + Math.cos(b) * dd - 1.5, y + Math.sin(b) * dd - 1.5, 3, 3);
      }
      ctx.restore();
    },

    // ---------------- 大地圖 ----------------
    drawLevelCard: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0);
      var open = s.state === 'open';
      var idx = num(s.index, 1);
      ctx.save();
      panelBox(ctx, x, y, 400, 290);
      // 縮圖區
      if (open) {
        ctx.fillStyle = C.panelDeep;
        ctx.fillRect(x + 8, y + 8, 384, 216);
        ctx.strokeStyle = '#5a6a80'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 7, y + 7, 386, 218);
      } else {
        ctx.fillStyle = '#10141c';
        ctx.fillRect(x + 8, y + 8, 384, 216);
        ctx.strokeStyle = '#2a3242'; ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.strokeRect(x + 9, y + 9, 382, 214);
        ctx.setLineDash([]);
        lockIcon(ctx, x + 200, y + 80, 52, '#6b778a');
        text(ctx, '解鎖需要', x + 200, y + 140, 16, C.textDim, 'center');
        costRow(ctx, s.cost, s.missing, x + 200, y + 176, 22, 'center');
      }
      // 文字區 224~290
      var name = str(s.name, '');
      text(ctx, '第' + idx + '關', x + 16, y + 246, 15, C.textDim, 'left', true);
      text(ctx, name, x + 16 + textW(ctx, '第' + idx + '關', 15, true) + 8, y + 246, 20, open ? C.text : C.textDim, 'left', true);
      if (!open) {
        text(ctx, '未開放', x + 384, y + 246, 15, C.textDim, 'right');
      }
      var tracks = arr(s.tracks).slice();
      if (open) {
        if (!tracks.length) {
          text(ctx, '尚無回放', x + 16, y + 274, 15, C.textDim, 'left');
        } else {
          var cx = x + 16;
          tracks.forEach(function (tr) {
            tr = obj(tr);
            var c = nCls(tr.cls);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            rr(ctx, cx - 4, y + 261, 118, 26, 6); ctx.fill();
            clsIcon(ctx, c, cx + 9, y + 274, 22);
            matIcon(ctx, MAT_OF[c], cx + 30, y + 274, 8);
            text(ctx, f1(tr.rate) + '/分', cx + 42, y + 274, 15, C[c], 'left', true);
            cx += 124;
          });
        }
      }
      if (s.selected === true) selectFrame(ctx, x, y, 400, 290);
      ctx.restore();
    },

    drawClassCard: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), cls = nCls(s.cls);
      var st = s.state === 'active' ? 'active' : (s.state === 'owned' ? 'owned' : 'locked');
      ctx.save();
      panelBox(ctx, x, y, 240, 140, st === 'active' ? C[cls] : null);
      if (st === 'active') {
        ctx.strokeStyle = C[cls]; ctx.lineWidth = 4;
        rr(ctx, x + 2, y + 2, 236, 136, 12); ctx.stroke();
      }
      // 頭像
      ctx.fillStyle = st === 'locked' ? '#151a24' : 'rgba(255,255,255,0.05)';
      rr(ctx, x + 10, y + 12, 70, 116, 8); ctx.fill();
      ctx.save();
      ctx.translate(x + 45, y + 72);
      ctx.scale(2.1, 2.1);
      figure(ctx, cls, { pose: 'idle', skillK: -1, autoK: -1, autoA: 0, tint: st === 'locked' ? 'shadow' : null, t: 0 });
      ctx.restore();
      var name = str(s.name, CLS_NAME[cls]);
      text(ctx, name, x + 92, y + 30, 22, st === 'locked' ? C.textDim : C.text, 'left', true);
      if (st === 'active') {
        var bw = textW(ctx, '使用中', 13, true) + 12;
        ctx.fillStyle = C[cls];
        rr(ctx, x + 228 - bw, y + 18, bw, 22, 11); ctx.fill();
        text(ctx, '使用中', x + 228 - bw / 2, y + 29, 13, C.textDark, 'center', true);
      }
      // 採集素材
      var m = MAT_OF[cls];
      text(ctx, '採集', x + 92, y + 62, 14, C.textDim, 'left');
      matIcon(ctx, m, x + 136, y + 62, 9);
      text(ctx, MAT_NAME[m], x + 150, y + 62, 16, C[cls], 'left', true);
      if (st === 'locked') {
        lockIcon(ctx, x + 100, y + 100, 20, '#6b778a');
        costRow(ctx, s.cost, s.missing, x + 114, y + 104, 14, 'left');
      } else if (st === 'owned') {
        text(ctx, '已擁有', x + 92, y + 104, 14, C.textDim, 'left');
      }
      if (s.selected === true) selectFrame(ctx, x, y, 240, 140);
      ctx.restore();
    },

    drawIncomePanel: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0), inc = mats(s.income);
      ctx.save();
      panelBox(ctx, x, y, 420, 140);
      text(ctx, '每分鐘產量', x + 16, y + 20, 14, C.textDim, 'left', true);
      ['fang', 'ore', 'dew'].forEach(function (k, i) {
        var ry = y + 50 + i * 34;
        matIcon(ctx, k, x + 30, ry, 11);
        text(ctx, MAT_NAME[k], x + 50, ry, 17, C.text, 'left');
        text(ctx, CLS_NAME[CLS_OF[k]], x + 104, ry, 13, C.textDim, 'left');
        text(ctx, '+' + f1(inc[k]), x + 360, ry, 20, MAT_COLOR[k], 'right', true);
        text(ctx, '/分', x + 366, ry, 13, C.textDim, 'left');
      });
      ctx.restore();
    },

    drawGoalCard: function (ctx, s) {
      s = obj(s);
      var x = num(s.x, 0), y = num(s.y, 0);
      var missing = arr(s.missing), can = missing.length === 0;
      ctx.save();
      panelBox(ctx, x, y, 1220, 90, can ? '#ffffff' : null);
      airship(ctx, x + 70, y + 47, 1.15, !can);
      text(ctx, '終極目標', x + 130, y + 28, 14, C.textDim, 'left');
      text(ctx, '飛空艇', x + 130, y + 58, 28, C.text, 'left', true);
      text(ctx, '需要', x + 560, y + 45, 15, C.textDim, 'right');
      costRow(ctx, s.cost, missing, x + 576, y + 45, 24, 'left');
      if (can) {
        ctx.fillStyle = '#ffffff';
        rr(ctx, x + 1080, y + 28, 120, 34, 17); ctx.fill();
        text(ctx, '可購買', x + 1140, y + 45, 17, C.textDark, 'center', true);
      } else {
        text(ctx, '素材不足', x + 1200, y + 45, 15, C.textDim, 'right');
      }
      if (s.selected === true) selectFrame(ctx, x, y, 1220, 90);
      ctx.restore();
    },

    drawPopup: function (ctx, s) {
      s = obj(s);
      var dur = num(s.dur, 0.8);
      var k = dur > 0 ? clamp(num(s.t, 0) / dur, 0, 1) : 1;
      if (k >= 1) return;
      var x = num(s.x, 0), y = num(s.y, 0) - 30 * k;
      var type = nMat(s.type);
      ctx.save();
      ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      var label = '+' + Math.round(num(s.value, 1));
      var w = textW(ctx, label, 18, true);
      var total = w + 4 + 16;
      var lx = x - total / 2;
      otext(ctx, label, lx + w / 2, y, 18, MAT_COLOR[type], 'center', true);
      matIcon(ctx, type, lx + w + 4 + 8, y, 8);
      ctx.restore();
    },

    drawHud: function (ctx, s) {
      s = obj(s);
      var level = s.mode === 'level';
      var stock = mats(s.stock), inc = mats(s.income);
      ctx.save();
      ctx.fillStyle = C.hud;
      ctx.fillRect(0, 0, W, HUD_H);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, HUD_H - 1, W, 1);
      // 中段: 三種素材(兩種模式同一位置)
      ['fang', 'ore', 'dew'].forEach(function (k, i) {
        var bx = 380 + i * 175;
        matIcon(ctx, k, bx + 10, 20, 10);
        text(ctx, String(Math.floor(stock[k])), bx + 26, 20, 20, C.text, 'left', true);
        var sw = textW(ctx, String(Math.floor(stock[k])), 20, true);
        text(ctx, '+' + f1(inc[k]) + '/分', bx + 32 + sw, 21, 13, MAT_COLOR[k], 'left');
      });
      if (level) {
        var cls = nCls(s.cls);
        // 左段: 職業 + 血量 + 技能
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        rr(ctx, 6, 4, 34, 32, 6); ctx.fill();
        ctx.strokeStyle = C[cls]; ctx.lineWidth = 2;
        rr(ctx, 6, 4, 34, 32, 6); ctx.stroke();
        clsIcon(ctx, cls, 23, 21, 28);
        var hp = clamp(num(s.hp, 0), 0, 10), max = clamp(num(s.maxHp, 3), 1, 10);
        for (var i = 0; i < max; i++) heart(ctx, 60 + i * 24, 21, 9, i < hp);
        // 技能鍵 X + 冷卻扇形
        var kx = 60 + max * 24 + 14;
        var cdT = num(s.skillCdT, 1), cdD = num(s.skillCdDur, 1);
        var ready = !(cdD > 0) || cdT >= cdD;
        ctx.save();
        ctx.globalAlpha = ready ? 1 : 0.55;
        var kw = keycap(ctx, 'X', kx, 20, 28);
        ctx.restore();
        if (!ready) {
          var rem = 1 - clamp(cdT / cdD, 0, 1);
          ctx.fillStyle = 'rgba(12,16,24,0.75)';
          ctx.beginPath(); ctx.moveTo(kx + kw / 2, 20);
          ctx.arc(kx + kw / 2, 20, 13, -Math.PI / 2, -Math.PI / 2 + rem * Math.PI * 2); ctx.closePath(); ctx.fill();
        } else {
          ctx.strokeStyle = C[cls]; ctx.lineWidth = 2;
          rr(ctx, kx - 2, 4, kw + 4, 32, 7); ctx.stroke();
        }
        var sk = cls === 'hunter' ? '穿透箭' : (cls === 'miner' ? '鎬擊' : '滑翔');
        text(ctx, sk, kx + kw + 8, 21, 14, ready ? C.text : C.textDim, 'left');
        // 右段: 這趟 / 紀錄
        text(ctx, f1(s.time) + ' 秒', 960, 21, 18, C.text, 'right', true);
        text(ctx, '本趟', 990, 21, 13, C.textDim, 'left');
        var rt = nMat(s.runType);
        matIcon(ctx, rt, 1032, 20, 9);
        text(ctx, '×' + Math.floor(num(s.runCount, 0)), 1044, 21, 18, MAT_COLOR[rt], 'left', true);
        text(ctx, '紀錄', 1110, 21, 13, C.textDim, 'left');
        var rec = (s.recordRate === null || s.recordRate === undefined || !isFinite(Number(s.recordRate))) ? '—' : f1(Number(s.recordRate)) + '/分';
        text(ctx, rec, 1270, 21, 16, C.text, 'right', true);
      }
      ctx.restore();
    },

    drawResultPanel: function (ctx, s) {
      s = obj(s);
      var x = 320, y = 160, cls = nCls(s.cls), type = nMat(s.type);
      var res = ['first', 'record', 'kept'].indexOf(s.result) >= 0 ? s.result : 'kept';
      ctx.save();
      panelBox(ctx, x, y, 640, 400, C[cls]);
      text(ctx, '過關', x + 320, y + 44, 36, C.text, 'center', true);
      clsIcon(ctx, cls, x + 270, y + 96, 40);
      text(ctx, CLS_NAME[cls], x + 296, y + 96, 20, C[cls], 'left', true);
      // 數值列
      var rows = [
        ['秒數', f1(s.time) + ' 秒', C.text],
        ['採到', null, C.text],
        ['效率', f1(s.rate) + ' /分', MAT_COLOR[type]]
      ];
      rows.forEach(function (r, i) {
        var ry = y + 148 + i * 40;
        text(ctx, r[0], x + 200, ry, 17, C.textDim, 'left');
        if (r[1] === null) {
          matIcon(ctx, type, x + 300, ry, 11);
          text(ctx, '× ' + Math.floor(num(s.count, 0)) + '  ' + MAT_NAME[type], x + 318, ry, 22, C.text, 'left', true);
        } else {
          text(ctx, r[1], x + 290, ry, 22, r[2], 'left', true);
        }
      });
      // 結果
      var old = (s.oldRate === null || s.oldRate === undefined || !isFinite(Number(s.oldRate))) ? null : Number(s.oldRate);
      var by = y + 278, msg, sub, fill;
      if (res === 'first') { msg = '新增一條回放'; sub = '這條回放會在大地圖上一直產出' + MAT_NAME[type]; fill = C[cls]; }
      else if (res === 'record') { msg = '新紀錄! 已取代舊回放'; sub = '原紀錄 ' + (old === null ? '—' : old.toFixed(1)) + ' /分 → ' + f1(s.rate) + ' /分'; fill = '#ffffff'; }
      else { msg = '保留原回放'; sub = '這趟沒超過原紀錄 ' + (old === null ? '—' : old.toFixed(1)) + ' /分'; fill = '#5d6878'; }
      ctx.fillStyle = fill;
      rr(ctx, x + 150, by - 20, 340, 40, 20); ctx.fill();
      text(ctx, msg, x + 320, by, 19, res === 'kept' ? C.text : C.textDark, 'center', true);
      text(ctx, sub, x + 320, by + 36, 14, C.textDim, 'center');
      // 按鍵
      var fy = y + 364;
      var w1 = keycap(ctx, 'Z', x + 170, fy, 28);
      text(ctx, '回大地圖', x + 170 + w1 + 8, fy, 16, C.text, 'left');
      var w2 = keycap(ctx, 'X', x + 350, fy, 28);
      text(ctx, '再跑一次', x + 350 + w2 + 8, fy, 16, C.text, 'left');
      ctx.restore();
    },

    drawFailPanel: function (ctx) {
      var x = 380, y = 240;
      ctx.save();
      panelBox(ctx, x, y, 520, 240, C.danger);
      text(ctx, '失敗', x + 260, y + 62, 40, C.danger, 'center', true);
      text(ctx, '這趟採到的素材不入帳, 也不存回放', x + 260, y + 112, 15, C.textDim, 'center');
      var fy = y + 180;
      var w1 = keycap(ctx, 'Z', x + 110, fy, 30);
      text(ctx, '重來', x + 110 + w1 + 8, fy, 18, C.text, 'left');
      var w2 = keycap(ctx, 'X', x + 280, fy, 30);
      text(ctx, '回大地圖', x + 280 + w2 + 8, fy, 18, C.text, 'left');
      ctx.restore();
    },

    drawPausePanel: function (ctx, s) {
      s = obj(s);
      var x = 380, y = 220, lv = s.mode === 'level';
      ctx.save();
      ctx.fillStyle = 'rgba(6,9,14,0.6)';
      ctx.fillRect(0, 0, W, H);
      panelBox(ctx, x, y, 520, 280);
      text(ctx, '暫停', x + 260, y + 70, 40, C.text, 'center', true);
      var fy = y + 170;
      if (lv) {
        var items = [['Esc', '繼續'], ['Z', '重來'], ['X', '回大地圖']];
        var cx = x + 60;
        items.forEach(function (it) {
          var kw = keycap(ctx, it[0], cx, fy, 30);
          text(ctx, it[1], cx + kw + 8, fy, 18, C.text, 'left');
          cx += kw + 8 + textW(ctx, it[1], 18) + 34;
        });
      } else {
        var kw = keycap(ctx, 'Esc', x + 200, fy, 30);
        text(ctx, '繼續', x + 200 + kw + 8, fy, 18, C.text, 'left');
      }
      ctx.restore();
    },

    drawEndingPanel: function (ctx, s) {
      s = obj(s);
      var x = 280, y = 150;
      ctx.save();
      panelBox(ctx, x, y, 720, 420, '#ffffff');
      airship(ctx, x + 360, y + 120, 2.4, false);
      text(ctx, '飛空艇完成', x + 360, y + 236, 40, C.text, 'center', true);
      text(ctx, '總遊玩時間', x + 360, y + 290, 16, C.textDim, 'center');
      text(ctx, fmtTime(s.totalTime), x + 360, y + 324, 32, C.text, 'center', true);
      var fy = y + 384;
      var kw = keycap(ctx, 'Z', x + 290, fy, 30);
      text(ctx, '重新開始', x + 290 + kw + 8, fy, 18, C.text, 'left');
      ctx.restore();
    },

    // ---------------- 說明頁示意圖 ----------------
    drawGuidePage: function (ctx, s) {
      s = obj(s);
      var page = Math.floor(num(s.page, 0));
      var bx = num(s.x, 0), by = num(s.y, 0), bw = Math.max(1, num(s.w, 480)), bh = Math.max(1, num(s.h, 270));
      var g = GUIDE[page];
      if (!g) return;
      var k = Math.min(bw / g.w, bh / g.h);
      ctx.save();
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      ctx.translate(bx + (bw - g.w * k) / 2, by + (bh - g.h * k) / 2);
      ctx.scale(k, k);
      ctx.beginPath(); ctx.rect(0, 0, g.w, g.h); ctx.clip();
      g.draw(ctx);
      ctx.restore();
    }
  };

  function hpBar(ctx, w, halfH, hp, max) {
    var by = -halfH - 6 - 4;
    ctx.fillStyle = 'rgba(10,14,20,0.85)';
    ctx.fillRect(-w / 2, by, w, 4);
    ctx.fillStyle = C.danger;
    ctx.fillRect(-w / 2, by, w * clamp(hp / max, 0, 1), 4);
  }

  // ---------- 說明頁 ----------
  function miniScene(ctx, w, h) { sceneBg(ctx, w, h); }
  function groundRow(ctx, x0, x1, topY, rows) {
    for (var gx = x0; gx < x1; gx += TILE) {
      for (var r = 0; r < (rows || 1); r++) groundTile(ctx, gx + 20, topY + 20 + r * TILE, r === 0);
    }
  }
  function label(ctx, s, x, y, color) { otext(ctx, s, x, y, 16, color || C.text, 'center', true); }
  function dashedArrow(ctx, pts, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    var a = Math.atan2(pts[2][1] - pts[1][1], pts[2][0] - pts[1][0]);
    ctx.fillStyle = color;
    ctx.translate(pts[2][0], pts[2][1]); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-9, -7); ctx.lineTo(-9, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function P(st) { return Object.assign({ facing: 1, pose: 'idle', skillT: 1, skillDur: 1, autoT: 1, autoDur: 1, autoAngle: 0, invuln: false }, st); }

  var GUIDE = [
    { // 第 1 頁: 衝到終點 (480×270, 遊戲原尺寸)
      w: 480, h: 270,
      draw: function (ctx) {
        miniScene(ctx, 480, 270);
        var gt = 230;
        groundRow(ctx, 0, 480, gt, 1);
        Art.drawOreVein(ctx, { x: 300, y: gt - 20 });
        Art.drawFlower(ctx, { x: 360, y: gt - 14, t: 0, collectible: false });
        Art.drawWolf(ctx, { x: 160, y: gt - 15, facing: -1, hp: 3, maxHp: 3, hurtT: 1, hurtDur: 1 });
        Art.drawWolf(ctx, { x: 230, y: gt - 15, facing: 1, hp: 3, maxHp: 3, hurtT: 1, hurtDur: 1 });
        Art.drawGoal(ctx, { x: 440, y: gt - 40, reached: false });
        Art.drawPlayer(ctx, P({ x: 40, y: gt - 22, cls: 'hunter' }));
        dashedArrow(ctx, [[62, gt - 60], [250, 40], [420, gt - 86]], '#ffffff');
        label(ctx, '你', 40, gt - 62);
        label(ctx, '終點', 440, gt - 104);
      }
    },
    { // 第 2 頁: 操作 (520×200), 三格各一張獵人
      w: 520, h: 200,
      draw: function (ctx) {
        miniScene(ctx, 520, 200);
        var gt = 160;
        groundRow(ctx, 0, 520, gt, 1);
        // 分隔
        ctx.fillStyle = 'rgba(10,14,20,0.45)';
        ctx.fillRect(172, 0, 3, gt); ctx.fillRect(345, 0, 3, gt);
        // ← → 跑
        ctx.save(); ctx.globalAlpha = 0.3;
        Art.drawPlayer(ctx, P({ x: 62, y: gt - 22, cls: 'hunter', pose: 'run' }));
        ctx.restore();
        Art.drawPlayer(ctx, P({ x: 96, y: gt - 22, cls: 'hunter', pose: 'run' }));
        var w1 = keycap(ctx, '←', 48, 34, 28); keycap(ctx, '→', 48 + w1 + 6, 34, 28);
        // Z 跳
        Art.drawPlayer(ctx, P({ x: 258, y: gt - 22 - 70, cls: 'hunter', pose: 'rise' }));
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(258, gt - 4); ctx.lineTo(258, gt - 62); ctx.stroke(); ctx.setLineDash([]);
        keycap(ctx, 'Z', 196, 34, 28);
        // X 穿透箭
        Art.drawPierceShot(ctx, { x0: 380, y: gt - 23, dir: 1, t: 0.03, dur: 0.15 });
        Art.drawPlayer(ctx, P({ x: 380, y: gt - 22, cls: 'hunter', skillT: 0.05, skillDur: 0.15 }));
        keycap(ctx, 'X', 366, 34, 28);
        // 角落 Esc 暫停
        var kw = keycap(ctx, 'Esc', 420, 186, 20);
        otext(ctx, '暫停', 420 + kw + 20, 186, 13, C.text, 'center', true);
      }
    },
    { // 第 3 頁: 自動攻擊 (480×270), 遊戲座標縮 0.5
      w: 480, h: 270,
      draw: function (ctx) {
        miniScene(ctx, 480, 270);
        ctx.save();
        ctx.scale(0.5, 0.5);
        var gt = 480;
        // 獵人 (240, 458), 射程 240; 圈內狼距 170, 圈外狼距 560
        Art.drawRangeRing(ctx, { x: 240, y: gt - 22, radius: 240, cls: 'hunter' });
        groundRow(ctx, 0, 960, gt, 2);
        Art.drawWolf(ctx, { x: 410, y: gt - 15, facing: -1, hp: 2, maxHp: 3, hurtT: 1, hurtDur: 1 });
        Art.drawWolf(ctx, { x: 800, y: gt - 15, facing: -1, hp: 3, maxHp: 3, hurtT: 1, hurtDur: 1 });
        Art.drawHunterArrow(ctx, { x: 340, y: gt - 22, angle: 0 });
        Art.drawPlayer(ctx, P({ x: 240, y: gt - 22, cls: 'hunter', autoT: 0.04, autoDur: 0.12, autoAngle: 0 }));
        ctx.restore();
        label(ctx, '圈內', 205, 196, C.hunter);
        label(ctx, '圈外', 400, 196, C.textDim);
      }
    },
    { // 第 4 頁: 過關後一直重播 (480×300)
      w: 480, h: 300,
      draw: function (ctx) {
        ctx.fillStyle = C.mapBg; ctx.fillRect(0, 0, 480, 300);
        // 頂端資訊列的獸牙數: 12 → 13
        ctx.fillStyle = C.hud; ctx.fillRect(0, 0, 480, 44);
        matIcon(ctx, 'fang', 150, 22, 12);
        text(ctx, '12', 172, 23, 22, C.textDim, 'left', true);
        dashedArrow(ctx, [[206, 23], [228, 23], [252, 23]], C.hunter);
        text(ctx, '13', 262, 23, 26, C.text, 'left', true);
        // 關卡卡片(縮 0.8)
        ctx.save();
        ctx.translate(80, 58);
        ctx.scale(0.8, 0.8);
        Art.drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '森林', state: 'open', tracks: [{ cls: 'hunter', rate: 8.6 }], cost: { fang: 0, ore: 0, dew: 0 }, missing: [], selected: false });
        // 縮圖(同 RD 的做法: (8,8) 起 scale 0.3)
        ctx.save();
        ctx.beginPath(); ctx.rect(8, 8, 384, 216); ctx.clip();
        ctx.translate(8, 8); ctx.scale(0.3, 0.3);
        Art.drawBackground(ctx);
        groundRow(ctx, 0, 1280, 600, 3);
        for (var gx = 480; gx < 640; gx += 40) groundTile(ctx, gx + 20, 580, true);
        Art.drawGoal(ctx, { x: 1220, y: 560, reached: false });
        Art.drawGhost(ctx, { x: 700, y: 578, cls: 'hunter', facing: 1, pose: 'run' });
        ctx.restore();
        // +1 浮字在殘影位置(卡片座標: 8 + 700×0.3, 8 + 578×0.3)
        Art.drawPopup(ctx, { x: 218, y: 160, t: 0.25, dur: 0.8, type: 'fang', value: 1 });
        ctx.restore();
      }
    },
    { // 第 5 頁: 撿多還是跑快 (560×240), 兩格各 270×200, 遊戲座標縮 0.5
      w: 560, h: 240,
      draw: function (ctx) {
        ctx.fillStyle = C.mapBg; ctx.fillRect(0, 0, 560, 240);
        [0, 290].forEach(function (ox, i) {
          ctx.save();
          ctx.translate(ox, 0);
          ctx.beginPath(); ctx.rect(0, 0, 270, 196); ctx.clip();
          miniScene(ctx, 270, 196);
          ctx.scale(0.5, 0.5);
          var gt = 340;
          if (i === 0) Art.drawRangeRing(ctx, { x: 150, y: gt - 22, radius: 240, cls: 'hunter' });
          groundRow(ctx, 0, 540, gt, 2);
          Art.drawGoal(ctx, { x: 510, y: gt - 40, reached: false });
          if (i === 0) {
            // 停在狼旁打: 一隻剛倒(煙), 一隻被射中
            Art.drawPoof(ctx, { x: 240, y: gt - 15, t: 0.1, dur: 0.3 });
            Art.drawWolf(ctx, { x: 320, y: gt - 15, facing: -1, hp: 1, maxHp: 3, hurtT: 0.05, hurtDur: 0.15 });
            Art.drawHunterArrow(ctx, { x: 270, y: gt - 22, angle: 0 });
            Art.drawPlayer(ctx, P({ x: 150, y: gt - 22, cls: 'hunter', autoT: 0.06, autoDur: 0.12, autoAngle: 0 }));
            // 浮字用畫面原尺寸(不跟著 0.5 縮), 位置在倒下的狼上方
            ctx.scale(2, 2);
            Art.drawPopup(ctx, { x: 120, y: (gt - 40) / 2, t: 0.2, dur: 0.8, type: 'fang', value: 1 });
          } else {
            // 直衝終點: 狼留在身後
            Art.drawWolf(ctx, { x: 160, y: gt - 15, facing: 1, hp: 3, maxHp: 3, hurtT: 1, hurtDur: 1 });
            Art.drawWolf(ctx, { x: 250, y: gt - 15, facing: -1, hp: 3, maxHp: 3, hurtT: 1, hurtDur: 1 });
            ctx.save(); ctx.globalAlpha = 0.25;
            Art.drawPlayer(ctx, P({ x: 340, y: gt - 22 - 40, cls: 'hunter', pose: 'run' }));
            ctx.restore();
            dashedArrow(ctx, [[40, gt - 70], [250, gt - 170], [440, gt - 40]], '#ffffff');
            Art.drawPlayer(ctx, P({ x: 450, y: gt - 22, cls: 'hunter', pose: 'run' }));
          }
          ctx.restore();
        });
        // 下方標籤
        matIcon(ctx, 'fang', 60, 218, 9);
        text(ctx, '獸牙多 / 秒數長', 74, 218, 16, C.text, 'left', true);
        matIcon(ctx, 'fang', 350, 218, 9);
        text(ctx, '獸牙少 / 秒數短', 364, 218, 16, C.text, 'left', true);
      }
    }
  ];

  window.Art = Art;
})();
