/* 森林獸徑 — 美術(explore-2 / game-b)
 * 全域物件 window.Art; 全部 Canvas 2D 幾何繪製, 無外部資源。
 * 只負責「給狀態 → 畫出來」, 不含任何遊戲邏輯。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  var C = {
    bg: '#1d3330', bgTop: '#163029', bgBottom: '#2a4436', bgTree: '#24413a', bgTreeFar: '#1f3a33',
    mapBg: '#18231f', mapBg2: '#22332b',
    panel: '#1e2b25', panelLine: '#4b6b58', panelDark: '#141d19',
    text: '#f2f5ee', textDim: '#9fb0a6', textFaint: '#6f8178',
    outline: '#16120e',
    // 地形
    dirt: '#7a5233', dirtDark: '#5e3e26', dirtLine: '#6a4529', grass: '#62b043', grassDark: '#3f8a2e',
    leaf: '#3f8f3c', leafDark: '#2c6b2c', leafLight: '#79c45a',
    soil: '#c49a62', soilDark: '#a07a48', soilCrumb: '#8c6638', soilEdge: '#e2c08c',
    spike: '#c9d1d6', spikeDark: '#7d8890', danger: '#e5383b',
    // 素材
    acorn: '#9c5a2e', acornCap: '#5c3a1c', acornLight: '#c98652',
    ore: '#6fd3ff', oreDark: '#2b8fc4', oreLight: '#e4f7ff',
    honey: '#f2a516', honeyDark: '#b8740a', honeyLight: '#ffd36b',
    // 玩家(白外框 = 只有玩家有)
    playerOutline: '#ffffff',
    squirrel: '#d9773b', squirrelBelly: '#f6cf9f', squirrelTail: '#b9592a',
    pangolin: '#c79a5b', pangolinDark: '#7d5a2e', pangolinSkin: '#ecd0a7',
    bear: '#7b4a2a', bearDark: '#57321b', bearMuzzle: '#c89a6e',
    // 怪物
    hedgehog: '#b98a5e', hedgehogFace: '#f0d6b0', hedgehogSpine: '#3b302a', hedgehogSpineTip: '#e8e2d6',
    snake: '#9b59d0', snakeBelly: '#d9b8f2', bush: '#3e8f3a', bushDark: '#2b6a29', bushLight: '#5fb24f',
    wasp: '#ffd23a', waspBlack: '#222018', waspWing: 'rgba(220,240,255,0.75)',
    mole: '#8d7b6b', moleDark: '#5e5045', moleNose: '#f29bb0', hole: '#1b130d', holeRim: '#6b4a2e',
    // 語意色
    gold: '#ffd84a', goldDark: '#b88a00', medalEmpty: '#7d8a84',
    ok: '#6fdc8c', boost: '#b388ff', heart: '#ff5a5f', select: '#ffffff',
    stun: '#fff27a', hit: '#ffffff'
  };

  // ---------- 共用小工具 ----------
  function num(v, d) { v = +v; return isFinite(v) ? v : (d === undefined ? 0 : d); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function spN(sp) { return (sp === 'pangolin' || sp === 'bear') ? sp : 'squirrel'; }
  function kindN(k) { return (k === 'ore' || k === 'honey') ? k : 'acorn'; }
  function S(o) { return (o && typeof o === 'object') ? o : {}; }
  function mats(o) { o = S(o); return { acorn: num(o.acorn), ore: num(o.ore), honey: num(o.honey) }; }
  function nowSec() {
    return ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) / 1000;
  }
  function fix1(v) { return num(v).toFixed(1); }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  function setFont(ctx, size, bold) { ctx.font = (bold ? 'bold ' : '') + Math.round(size) + 'px ' + FONT; }
  // 文字: 帶深色描邊(P10)
  function txt(ctx, s, x, y, size, color, align, bold, outline) {
    setFont(ctx, size, bold);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (outline !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(2, size / 5);
      ctx.strokeStyle = typeof outline === 'string' ? outline : 'rgba(10,14,12,0.85)';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color || C.text;
    ctx.fillText(s, x, y);
  }
  function textW(ctx, s, size, bold) { setFont(ctx, size, bold); return ctx.measureText ? (ctx.measureText(s).width || s.length * size * 0.6) : s.length * size * 0.6; }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2); }
  function star(ctx, x, y, r1, r2, n) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 ? r2 : r1, a = -Math.PI / 2 + i * Math.PI / n;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function curScale(ctx) {
    try {
      if (ctx.getTransform) { var m = ctx.getTransform(); var s = Math.sqrt(m.a * m.a + m.b * m.b); if (isFinite(s) && s > 0) return s; }
    } catch (e) { /* ignore */ }
    return 1;
  }

  // ---------- 素材圖示(三種: 圓 + 帽 / 直立菱形 / 六角)----------
  function kindIcon(ctx, kind, cx, cy, s, mono) {
    kind = kindN(kind);
    var r = s / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, s / 12);
    ctx.strokeStyle = mono ? 'rgba(0,0,0,0)' : C.outline;
    if (kind === 'acorn') {
      // 果實
      ell(ctx, 0, r * 0.22, r * 0.66, r * 0.72);
      ctx.fillStyle = mono || C.acorn; ctx.fill(); ctx.stroke();
      // 帽
      ctx.beginPath();
      ctx.moveTo(-r * 0.86, -r * 0.08);
      ctx.quadraticCurveTo(-r * 0.86, -r * 0.78, 0, -r * 0.78);
      ctx.quadraticCurveTo(r * 0.86, -r * 0.78, r * 0.86, -r * 0.08);
      ctx.closePath();
      ctx.fillStyle = mono || C.acornCap; ctx.fill(); ctx.stroke();
      // 梗
      ctx.beginPath(); ctx.moveTo(0, -r * 0.78); ctx.lineTo(r * 0.12, -r * 0.98);
      ctx.lineWidth = Math.max(1, s / 9); ctx.strokeStyle = mono || C.acornCap; ctx.stroke();
      if (!mono) { ell(ctx, -r * 0.25, r * 0.25, r * 0.14, r * 0.28); ctx.fillStyle = C.acornLight; ctx.fill(); }
    } else if (kind === 'ore') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.98); ctx.lineTo(r * 0.68, -r * 0.1); ctx.lineTo(0, r * 0.98); ctx.lineTo(-r * 0.68, -r * 0.1); ctx.closePath();
      ctx.fillStyle = mono || C.ore; ctx.fill(); ctx.stroke();
      if (!mono) {
        ctx.beginPath(); ctx.moveTo(0, -r * 0.98); ctx.lineTo(r * 0.68, -r * 0.1); ctx.lineTo(0, r * 0.1); ctx.closePath();
        ctx.fillStyle = C.oreDark; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.2); ctx.lineTo(0, -r * 0.7); ctx.lineWidth = Math.max(1, s / 10); ctx.strokeStyle = C.oreLight; ctx.stroke();
      }
    } else {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 6 + i * Math.PI / 3;
        var px = Math.cos(a) * r * 0.92, py = Math.sin(a) * r * 0.92;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = mono || C.honey; ctx.fill(); ctx.stroke();
      if (!mono) {
        ctx.beginPath();
        for (var j = 0; j < 6; j++) {
          var b = Math.PI / 6 + j * Math.PI / 3;
          var qx = Math.cos(b) * r * 0.48, qy = Math.sin(b) * r * 0.48;
          if (j === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
        }
        ctx.closePath(); ctx.fillStyle = C.honeyLight; ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- 動物頭像小圖示(HUD、卡片、結算)----------
  function spIcon(ctx, sp, cx, cy, s, mono) {
    sp = spN(sp);
    var r = s / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, s / 14);
    ctx.strokeStyle = mono ? 'rgba(0,0,0,0)' : C.outline;
    function F(c) { return mono || c; }
    if (sp === 'squirrel') {
      // 尾巴(後方大捲)
      ell(ctx, -r * 0.55, -r * 0.05, r * 0.4, r * 0.75); ctx.fillStyle = F(C.squirrelTail); ctx.fill(); ctx.stroke();
      // 耳
      ell(ctx, r * 0.02, -r * 0.62, r * 0.17, r * 0.3); ctx.fillStyle = F(C.squirrel); ctx.fill(); ctx.stroke();
      ell(ctx, r * 0.42, -r * 0.62, r * 0.17, r * 0.3); ctx.fill(); ctx.stroke();
      circle(ctx, r * 0.22, r * 0.05, r * 0.6); ctx.fill(); ctx.stroke();
      if (!mono) {
        ell(ctx, r * 0.42, r * 0.28, r * 0.3, r * 0.22); ctx.fillStyle = C.squirrelBelly; ctx.fill();
        circle(ctx, r * 0.4, -r * 0.08, r * 0.09); ctx.fillStyle = C.outline; ctx.fill();
      }
    } else if (sp === 'pangolin') {
      ell(ctx, 0, r * 0.05, r * 0.86, r * 0.7); ctx.fillStyle = F(C.pangolin); ctx.fill(); ctx.stroke();
      if (!mono) {
        ctx.strokeStyle = C.pangolinDark; ctx.lineWidth = Math.max(1, s / 16);
        for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.15 + i * r * 0.0, r * 0.75, r * (0.5 + i * 0.28), Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        ell(ctx, r * 0.55, r * 0.25, r * 0.32, r * 0.22); ctx.fillStyle = C.pangolinSkin; ctx.fill();
        circle(ctx, r * 0.55, r * 0.12, r * 0.08); ctx.fillStyle = C.outline; ctx.fill();
      }
    } else {
      circle(ctx, -r * 0.5, -r * 0.6, r * 0.25); ctx.fillStyle = F(C.bear); ctx.fill(); ctx.stroke();
      circle(ctx, r * 0.5, -r * 0.6, r * 0.25); ctx.fill(); ctx.stroke();
      circle(ctx, 0, r * 0.05, r * 0.78); ctx.fill(); ctx.stroke();
      if (!mono) {
        ell(ctx, 0, r * 0.32, r * 0.36, r * 0.26); ctx.fillStyle = C.bearMuzzle; ctx.fill();
        circle(ctx, 0, r * 0.22, r * 0.1); ctx.fillStyle = C.outline; ctx.fill();
        circle(ctx, -r * 0.3, -r * 0.08, r * 0.08); ctx.fill();
        circle(ctx, r * 0.3, -r * 0.08, r * 0.08); ctx.fill();
      }
    }
    ctx.restore();
  }

  // 金章 / 灰色空章(字典: 金 = 達到標準時間)
  function medal(ctx, cx, cy, r, gold) {
    ctx.save();
    if (gold) {
      circle(ctx, cx, cy, r); ctx.fillStyle = C.gold; ctx.fill();
      ctx.lineWidth = Math.max(1.5, r / 7); ctx.strokeStyle = C.goldDark; ctx.stroke();
      circle(ctx, cx, cy, r * 0.74); ctx.lineWidth = Math.max(1, r / 12); ctx.stroke();
      star(ctx, cx, cy, r * 0.5, r * 0.22, 5); ctx.fillStyle = C.goldDark; ctx.fill();
    } else {
      circle(ctx, cx, cy, r - 1); ctx.fillStyle = 'rgba(125,138,132,0.15)'; ctx.fill();
      ctx.setLineDash([Math.max(2, r / 4), Math.max(2, r / 5)]);
      ctx.lineWidth = Math.max(1.5, r / 8); ctx.strokeStyle = C.medalEmpty; ctx.stroke();
      ctx.setLineDash([]);
      star(ctx, cx, cy, r * 0.5, r * 0.22, 5); ctx.lineWidth = Math.max(1, r / 14); ctx.stroke();
    }
    ctx.restore();
  }

  function keycap(ctx, label, cx, cy, h) {
    h = h || 26;
    ctx.save();
    var size = Math.round(h * 0.55);
    var w = Math.max(h, textW(ctx, label, size, true) + h * 0.6);
    rr(ctx, cx - w / 2, cy - h / 2 + 2, w, h, h * 0.22); ctx.fillStyle = '#7d8a84'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h - 2, h * 0.22); ctx.fillStyle = '#eef2ec'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#2b332f'; ctx.stroke();
    txt(ctx, label, cx, cy - 1, size, '#1c2420', 'center', true, false);
    ctx.restore();
    return w;
  }
  // 「鍵 + 動作」一組, 回傳寬度
  function keyHint(ctx, key, label, x, cy, h, color) {
    var kw = keycap(ctx, key, x + Math.max(h, textW(ctx, key, Math.round(h * 0.55), true) + h * 0.6) / 2, cy, h);
    txt(ctx, label, x + kw + 8, cy, Math.round(h * 0.62), color || C.text, 'left', true);
    return kw + 8 + textW(ctx, label, Math.round(h * 0.62), true);
  }

  function heart(ctx, cx, cy, s, full) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.42);
    ctx.bezierCurveTo(cx - s * 0.6, cy, cx - s * 0.5, cy - s * 0.48, cx, cy - s * 0.2);
    ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.48, cx + s * 0.6, cy, cx, cy + s * 0.42);
    ctx.closePath();
    if (full) { ctx.fillStyle = C.heart; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a1416'; ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#7d8a84'; ctx.stroke(); }
    ctx.restore();
  }

  // 一列素材數字(只畫 >0 的種類, 或全畫)
  function matRow(ctx, m, x, cy, size, opts) {
    opts = opts || {};
    var kinds = ['acorn', 'ore', 'honey'], cx = x;
    for (var i = 0; i < 3; i++) {
      var k = kinds[i], v = m[k];
      if (opts.onlyPositive && !(v > 0)) continue;
      kindIcon(ctx, k, cx + size / 2, cy, size, opts.mono);
      var s = opts.fmt ? opts.fmt(v) : String(Math.floor(num(v)));
      txt(ctx, s, cx + size + 4, cy, Math.round(size * 0.8), opts.color || C.text, 'left', true);
      cx += size + 4 + textW(ctx, s, Math.round(size * 0.8), true) + (opts.gap || 14);
    }
    return cx - x;
  }

  function panelBox(ctx, x, y, w, h, line) {
    ctx.save();
    rr(ctx, x + 4, y + 6, w - 4, h - 6, 14); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    rr(ctx, x, y, w - 4, h - 6, 14); ctx.fillStyle = C.panel; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = line || C.panelLine; ctx.stroke();
    ctx.restore();
  }

  function stunStars(ctx, cx, topY, t) {
    ctx.save();
    t = num(t, nowSec());
    for (var i = 0; i < 3; i++) {
      var a = t * 5 + i * Math.PI * 2 / 3;
      var sx = cx + Math.cos(a) * 9, sy = topY - 8 + Math.sin(a) * 3;
      star(ctx, sx, sy, 4.5, 2, 5);
      ctx.fillStyle = C.stun; ctx.fill(); ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.strokeStyle = '#6b5a00'; ctx.stroke();
    }
    ctx.restore();
  }

  // ================= 背景 =================
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bgTop); g.addColorStop(1, C.bgBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 遠景樹: 低對比圓冠剪影(P1: 背景最低調)
    var i, x;
    ctx.fillStyle = C.bgTreeFar;
    for (i = 0; i < 9; i++) {
      x = 40 + i * 150;
      ctx.fillRect(x - 6, 260, 12, 460);
      circle(ctx, x, 250, 70); ctx.fill();
    }
    ctx.fillStyle = C.bgTree;
    for (i = 0; i < 7; i++) {
      x = 110 + i * 185;
      ctx.fillRect(x - 10, 360, 20, 360);
      circle(ctx, x - 30, 350, 60); ctx.fill();
      circle(ctx, x + 30, 340, 64); ctx.fill();
      circle(ctx, x, 300, 70); ctx.fill();
    }
    // 光斑
    ctx.fillStyle = 'rgba(255,255,220,0.04)';
    for (i = 0; i < 6; i++) { circle(ctx, 160 + i * 210, 120 + (i % 2) * 60, 90); ctx.fill(); }
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.mapBg2); g.addColorStop(1, C.mapBg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(120,180,120,0.05)';
    for (var i = 0; i < 26; i++) {
      var x = (i * 197) % W, y = 40 + ((i * 131) % 620);
      ell(ctx, x, y, 26, 12, (i % 5) * 0.6); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 664, W, 56);
    ctx.restore();
  }

  // ================= 地形 =================
  function drawGround(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), top = !!s.top, leaf = s.kind === 'leaf';
    var L = x - 20, T = y - 20;
    ctx.save();
    if (!leaf) {
      ctx.fillStyle = C.dirt; ctx.fillRect(L, T, 40, 40);
      // 實心土: 橫向地層線
      ctx.fillStyle = C.dirtLine;
      ctx.fillRect(L, T + 14, 40, 3); ctx.fillRect(L, T + 29, 40, 3);
      ctx.fillStyle = C.dirtDark;
      ctx.fillRect(L + 6, T + 20, 10, 4); ctx.fillRect(L + 24, T + 6, 9, 4); ctx.fillRect(L + 22, T + 34, 12, 3);
      if (top) {
        ctx.fillStyle = C.grassDark; ctx.fillRect(L, T, 40, 9);
        ctx.fillStyle = C.grass; ctx.fillRect(L, T, 40, 6);
        ctx.fillStyle = C.grassDark;
        for (var i = 0; i < 4; i++) { ell(ctx, L + 5 + i * 10, T + 9, 5, 3); ctx.fill(); }
      }
    } else {
      ctx.fillStyle = C.leafDark; ctx.fillRect(L, T, 40, 40);
      ctx.fillStyle = C.leaf;
      circle(ctx, L + 10, T + 14, 10); ctx.fill();
      circle(ctx, L + 30, T + 22, 10); ctx.fill();
      circle(ctx, L + 12, T + 32, 8); ctx.fill();
      if (top) {
        // 樹冠頂: 圓葉起伏(不用尖葉, 尖角保留給危險)
        ctx.fillStyle = C.leafLight;
        ctx.fillRect(L, T + 4, 40, 6);
        for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(L + 5 + j * 10, T + 6, 5, Math.PI, 0); ctx.fill(); }
        ctx.strokeStyle = C.leafDark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(L, T + 10); ctx.lineTo(L + 40, T + 10); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSoil(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), open = s.open === true;
    var L = x - 20, T = y - 20;
    ctx.save();
    if (open) ctx.globalAlpha = 0.35;
    ctx.fillStyle = C.soil; ctx.fillRect(L, T, 40, 40);
    // 軟土: 圓顆粒(實心土是橫向地層, 兩者紋理方向不同)
    ctx.fillStyle = C.soilCrumb;
    var pts = [[7, 7, 3], [20, 5, 2.5], [32, 9, 3], [12, 18, 2.5], [27, 19, 3.5], [5, 29, 3], [18, 31, 2.5], [33, 32, 3]];
    for (var i = 0; i < pts.length; i++) { circle(ctx, L + pts[i][0], T + pts[i][1], pts[i][2]); ctx.fill(); }
    ctx.fillStyle = C.soilEdge;
    circle(ctx, L + 14, T + 10, 1.8); ctx.fill(); circle(ctx, L + 25, T + 28, 1.8); ctx.fill();
    ctx.globalAlpha = 1;
    // 虛線內框: 鑽地中也保留, 讓玩家看得到軟土範圍
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2; ctx.strokeStyle = open ? 'rgba(226,192,140,0.8)' : C.soilDark;
    ctx.strokeRect(L + 2, T + 2, 36, 36);
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawSpike(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y);
    var L = x - 20, B = y + 20;
    ctx.save();
    ctx.fillStyle = C.danger; ctx.fillRect(L, B - 5, 40, 5);
    ctx.lineJoin = 'miter';
    for (var i = 0; i < 4; i++) {
      var bx = L + i * 10;
      ctx.beginPath(); ctx.moveTo(bx + 0.5, B - 5); ctx.lineTo(bx + 5, B - 20); ctx.lineTo(bx + 9.5, B - 5); ctx.closePath();
      ctx.fillStyle = C.spike; ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 5, B - 20); ctx.lineTo(bx + 9.5, B - 5); ctx.lineTo(bx + 5, B - 5); ctx.closePath();
      ctx.fillStyle = C.spikeDark; ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 3.2, B - 14); ctx.lineTo(bx + 5, B - 20); ctx.lineTo(bx + 6.8, B - 14); ctx.closePath();
      ctx.fillStyle = C.danger; ctx.fill();
    }
    ctx.restore();
  }

  function drawHive(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), shaken = s.shaken === true;
    ctx.save();
    // 樹枝(框外上方至多 20px)
    ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 15, y - 36); ctx.lineTo(x + 15, y - 33); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x, y - 20); ctx.stroke();
    var body = shaken ? '#b8ad98' : C.honey, band = shaken ? '#8f8573' : C.honeyDark;
    // 巢身: 上窄下寬的層疊
    var rows = [[-14, 9, 6], [-5, 14, 6], [5, 17, 6], [14, 13, 6]];
    for (var i = 0; i < rows.length; i++) {
      ell(ctx, x, y + rows[i][0], rows[i][1], rows[i][2] + 1.5);
      ctx.fillStyle = body; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = band; ctx.stroke();
    }
    // 巢口
    ell(ctx, x, y + 8, 4, 3.5); ctx.fillStyle = '#2a1a08'; ctx.fill();
    if (!shaken) {
      // 蜂蜜滴 + 亮點(還拿得到)
      ctx.fillStyle = C.honeyLight;
      ell(ctx, x - 6, y - 8, 3, 2); ctx.fill();
      ctx.fillStyle = C.honey;
      ctx.beginPath(); ctx.moveTo(x + 6, y + 18); ctx.quadraticCurveTo(x + 10, y + 21, x + 6, y + 22); ctx.quadraticCurveTo(x + 2, y + 21, x + 6, y + 18); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = C.honeyDark; ctx.stroke();
    } else {
      // 空巢: 裂痕 + 灰化
      ctx.strokeStyle = '#5d5548'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 8, y - 10); ctx.lineTo(x - 3, y - 3); ctx.lineTo(x - 7, y + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 9, y + 2); ctx.lineTo(x + 4, y + 10); ctx.stroke();
    }
    ctx.restore();
  }

  function drawPickup(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), t = num(s.t), k = kindN(s.kind);
    var bob = Math.sin(t * 3) * 2;
    ctx.save();
    // 可撿的光暈(橡實彈沒有)
    circle(ctx, x, y, 11.5);
    ctx.fillStyle = 'rgba(255,255,230,' + (0.16 + 0.08 * Math.sin(t * 4)) + ')'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,230,0.45)'; ctx.stroke();
    kindIcon(ctx, k, x, y + bob, 17);
    ctx.restore();
  }

  function drawGoal(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), reached = s.reached === true;
    var B = y + 40, T = y - 40;
    ctx.save();
    // 底座
    rr(ctx, x - 16, B - 6, 32, 6, 2); ctx.fillStyle = '#6f6a60'; ctx.fill();
    // 旗桿
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x - 13, T + 4, 4, 74);
    circle(ctx, x - 11, T + 4, 4); ctx.fillStyle = reached ? C.gold : '#e8e2d0'; ctx.fill();
    // 旗面: 未到 = 黑白格(終點), 已到 = 金旗
    var fx = x - 9, fy = T + 8, fw = 28, fh = 20;
    if (!reached) {
      for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#1c1c1c' : '#f6f6f6';
        ctx.fillRect(fx + c * fw / 6, fy + r * fh / 4, fw / 6 + 0.3, fh / 4 + 0.3);
      }
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#1c1c1c'; ctx.strokeRect(fx, fy, fw, fh);
    } else {
      ctx.fillStyle = C.gold; ctx.fillRect(fx, fy, fw, fh);
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.goldDark; ctx.strokeRect(fx, fy, fw, fh);
      star(ctx, fx + fw / 2, fy + fh / 2, 7, 3, 5); ctx.fillStyle = C.goldDark; ctx.fill();
      ctx.fillStyle = '#fff6c0';
      circle(ctx, x + 12, y - 2, 2.5); ctx.fill(); circle(ctx, x - 2, y + 10, 2); ctx.fill(); circle(ctx, x + 14, y + 22, 2); ctx.fill();
    }
    ctx.restore();
  }

  // ================= 玩家 =================
  // 先畫白色粗輪廓(只有玩家有), 再填色
  function silo(ctx, fn, col) {
    ctx.lineWidth = 3; ctx.strokeStyle = C.playerOutline; ctx.lineJoin = 'round';
    fn(); ctx.stroke(); ctx.fillStyle = col; ctx.fill();
  }

  function drawSquirrel(ctx, pose, pt, hurt) {
    var run = pose === 'run', phase = Math.sin(pt * 22);
    var dy = 0;
    if (pose === 'rise') dy = -1;
    if (pose === 'glide') {
      // 滑翔: 身體壓扁、皮膜張開、尾巴拖平
      silo(ctx, function () { ell(ctx, -6, 3, 7, 4, -0.15); }, C.squirrelTail);
      silo(ctx, function () { ell(ctx, 1, 2, 11.5, 5); }, C.squirrelBelly);
      silo(ctx, function () { ell(ctx, 1, 0, 8, 6); }, C.squirrel);
      silo(ctx, function () { circle(ctx, 7, -4, 5); }, C.squirrel);
      silo(ctx, function () { ell(ctx, 6, -10, 2, 3); }, C.squirrel);
      circle(ctx, 10, -5, 1.4); ctx.fillStyle = C.outline; ctx.fill();
      return;
    }
    // 尾巴
    silo(ctx, function () { ell(ctx, -6, -3 + dy, 6.5, 11); }, C.squirrelTail);
    silo(ctx, function () { ell(ctx, -8, -11 + dy, 4.5, 3.5); }, C.squirrelTail);
    // 腳
    var f1 = run ? phase * 4 : 0;
    ctx.fillStyle = C.squirrel;
    if (pose === 'fall') { ell(ctx, -1, 11, 2.5, 3); ctx.fill(); ell(ctx, 6, 11, 2.5, 3); ctx.fill(); }
    else { ell(ctx, 0 + f1, 13, 3.5, 2.5); ctx.fill(); ell(ctx, 6 - f1, 13, 3.5, 2.5); ctx.fill(); }
    // 身
    silo(ctx, function () { ell(ctx, 2, 3 + dy, 7, 9); }, C.squirrel);
    ell(ctx, 5, 5 + dy, 3.5, 6); ctx.fillStyle = C.squirrelBelly; ctx.fill();
    // 頭
    silo(ctx, function () { ell(ctx, 4, -11 + dy, 1.8, 2.8); }, C.squirrel);
    silo(ctx, function () { circle(ctx, 6, -6 + dy, 6); }, C.squirrel);
    ell(ctx, 9.5, -4 + dy, 2.5, 2); ctx.fillStyle = C.squirrelBelly; ctx.fill();
    // 眼
    if (hurt) {
      ctx.strokeStyle = C.outline; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(6.5, -9 + dy); ctx.lineTo(9.5, -6 + dy); ctx.moveTo(9.5, -9 + dy); ctx.lineTo(6.5, -6 + dy); ctx.stroke();
    } else { circle(ctx, 8.5, -7 + dy, 1.4); ctx.fillStyle = C.outline; ctx.fill(); }
    // 手
    if (pose === 'throw') {
      var k = clamp(pt / 0.15, 0, 1);
      ctx.strokeStyle = C.squirrel; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(9 + 3 * k, -4 + 2 * k); ctx.stroke();
    } else {
      ell(ctx, 8, 3 + dy, 2, 2.2); ctx.fillStyle = C.squirrel; ctx.fill();
    }
  }

  function drawPangolin(ctx, pose, pt, hurt) {
    if (pose === 'roll') {
      ctx.save();
      ctx.rotate(pt * 24);
      silo(ctx, function () { circle(ctx, 0, 0, 12.5); }, C.pangolin);
      ctx.strokeStyle = C.pangolinDark; ctx.lineWidth = 2;
      for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, 4 + i * 2.6, i * 1.3, i * 1.3 + Math.PI * 1.1); ctx.stroke(); }
      ctx.restore();
      // 速度線(框內)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-13, -4); ctx.moveTo(-15, 4); ctx.lineTo(-13, 4); ctx.stroke();
      return;
    }
    var dig = pose === 'dig';
    var run = pose === 'run', ph = run ? Math.sin(pt * 20) * 2 : 0;
    // 尾
    silo(ctx, function () {
      ctx.beginPath(); ctx.moveTo(-8, 2); ctx.quadraticCurveTo(-13.5, 6, -13.5, 11.5); ctx.lineTo(-10, 11); ctx.quadraticCurveTo(-9, 7, -4, 6); ctx.closePath();
    }, C.pangolin);
    // 腳
    ctx.fillStyle = C.pangolinSkin;
    ell(ctx, -5 + ph, 11.5, 3, 2); ctx.fill(); ell(ctx, 6 - ph, 11.5, 3, 2); ctx.fill();
    // 身(拱背)
    silo(ctx, function () {
      ctx.beginPath(); ctx.moveTo(-11, 10); ctx.quadraticCurveTo(-12, -11, 2, -11); ctx.quadraticCurveTo(12, -10, 12, 6); ctx.lineTo(12, 10); ctx.closePath();
    }, C.pangolin);
    // 鱗片弧線: 剪在身體內
    ctx.save();
    ctx.beginPath(); ctx.moveTo(-11, 10); ctx.quadraticCurveTo(-12, -11, 2, -11); ctx.quadraticCurveTo(12, -10, 12, 6); ctx.lineTo(12, 10); ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = C.pangolinDark; ctx.lineWidth = 1.6;
    for (var j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(1, 12, 8 + j * 5, Math.PI * 1.12, Math.PI * 1.9); ctx.stroke(); }
    ctx.restore();
    // 頭(尖吻)
    silo(ctx, function () {
      ctx.beginPath(); ctx.moveTo(9, -2); ctx.quadraticCurveTo(14.5, 2, 14.2, 7); ctx.lineTo(9, 9); ctx.closePath();
    }, C.pangolinSkin);
    if (hurt) {
      ctx.strokeStyle = C.outline; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(13, 4); ctx.moveTo(13, 1); ctx.lineTo(10, 4); ctx.stroke();
    } else { circle(ctx, 11.5, 2.5, 1.3); ctx.fillStyle = C.outline; ctx.fill(); }
    if (dig) {
      // 爪 + 土屑(框內)
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(12, 10); ctx.lineTo(15, 12); ctx.moveTo(10, 11); ctx.lineTo(13, 13.5); ctx.stroke();
      ctx.fillStyle = C.soilCrumb;
      var a = pt * 12;
      circle(ctx, 13 + Math.cos(a) * 1.5, -6 + Math.sin(a) * 1.5, 1.6); ctx.fill();
      circle(ctx, 6 + Math.sin(a) * 1.5, -12, 1.4); ctx.fill();
    }
  }

  function drawBear(ctx, pose, pt, hurt) {
    var shake = pose === 'shake';
    var jx = shake ? Math.sin(pt * 70) * 2 : 0;
    var run = pose === 'run', ph = run ? Math.sin(pt * 18) * 3 : 0;
    ctx.save();
    ctx.translate(jx, 0);
    // 腿
    ctx.fillStyle = C.bearDark;
    rr(ctx, -9 + ph, 14, 7, 8, 3); ctx.fill(); rr(ctx, 3 - ph, 14, 7, 8, 3); ctx.fill();
    // 身
    silo(ctx, function () { rr(ctx, -12, -4, 24, 21, 9); }, C.bear);
    ell(ctx, 3, 6, 6, 7); ctx.fillStyle = C.bearMuzzle; ctx.fill();
    // 耳 + 頭
    silo(ctx, function () { circle(ctx, -4, -17, 3.5); }, C.bear);
    silo(ctx, function () { circle(ctx, 8, -17, 3.5); }, C.bear);
    silo(ctx, function () { circle(ctx, 3, -10, 9.5); }, C.bear);
    ell(ctx, 8, -7, 4.5, 3.5); ctx.fillStyle = C.bearMuzzle; ctx.fill();
    circle(ctx, 11, -8, 1.6); ctx.fillStyle = C.outline; ctx.fill();
    if (hurt) {
      ctx.strokeStyle = C.outline; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(3, -14); ctx.lineTo(6, -11); ctx.moveTo(6, -14); ctx.lineTo(3, -11); ctx.stroke();
    } else { circle(ctx, 5, -12.5, 1.5); ctx.fillStyle = C.outline; ctx.fill(); }
    // 手臂
    ctx.fillStyle = C.bearDark;
    if (pose === 'swipe') { rr(ctx, 6, -4, 12, 6, 3); ctx.fill(); }
    else if (shake) { rr(ctx, -15, -8, 5, 10, 2.5); ctx.fill(); rr(ctx, 10, -8, 5, 10, 2.5); ctx.fill(); }
    else { rr(ctx, 6, 0, 6, 10, 3); ctx.fill(); }
    ctx.restore();
    if (shake) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -2, 17, Math.PI * 0.85, Math.PI * 1.15); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -2, 17, -Math.PI * 0.15, Math.PI * 0.15); ctx.stroke();
    }
    if (pose === 'swipe' && pt < 0.15) {
      // 爪痕: 面向側框外 60x44(x 18~78)
      var a = 1 - pt / 0.15;
      ctx.globalAlpha = a;
      ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        var ox = 26 + i * 12;
        ctx.strokeStyle = 'rgba(30,20,10,0.6)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(ox, -16); ctx.quadraticCurveTo(ox + 14, 0, ox + 6, 16); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ox, -16); ctx.quadraticCurveTo(ox + 14, 0, ox + 6, 16); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawPlayer(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), sp = spN(s.sp);
    var facing = num(s.facing, 1) < 0 ? -1 : 1;
    var pose = typeof s.pose === 'string' ? s.pose : 'idle';
    var pt = Math.max(0, num(s.poseT));
    ctx.save();
    if (s.invuln === true) {
      var ph = Math.floor(nowSec() * 12) % 2;
      ctx.globalAlpha = ph ? 0.3 : 0.9;
    }
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    var hurt = pose === 'hurt';
    if (sp === 'squirrel') drawSquirrel(ctx, pose, pt, hurt);
    else if (sp === 'pangolin') drawPangolin(ctx, pose, pt, hurt);
    else drawBear(ctx, pose, pt, hurt);
    ctx.restore();
  }

  // ================= 怪物(深色外框; 受擊閃 = 整隻換白)=================
  function drawHedgehog(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), t = num(s.t);
    var f = num(s.facing, 1) < 0 ? -1 : 1, hit = s.hit === true, stun = s.stun === true;
    var bob = stun ? 0 : Math.abs(Math.sin(t * 8)) * 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);
    ctx.lineJoin = 'round';
    // 腳
    ctx.fillStyle = hit ? C.hit : '#5b4330';
    ell(ctx, -8, 12, 3, 2); ctx.fill(); ell(ctx, 6, 12, 3, 2); ctx.fill();
    // 背刺: 深色尖三角(尖角 = 危險), 白刺尖
    var sp = hit ? C.hit : C.hedgehogSpine;
    for (var i = 0; i < 7; i++) {
      var a = Math.PI * (1.08 + i * 0.12);
      var bx = -3 + Math.cos(a) * 11, by = 2 - bob + Math.sin(a) * 9;
      var tx = -3 + Math.cos(a) * 14.5, ty = 2 - bob + Math.sin(a) * 14.5;
      var nx = -Math.sin(a) * 3.5, ny = Math.cos(a) * 3.5;
      ctx.beginPath(); ctx.moveTo(bx + nx, by + ny); ctx.lineTo(tx, ty); ctx.lineTo(bx - nx, by - ny); ctx.closePath();
      ctx.fillStyle = sp; ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - Math.cos(a) * 4 + nx * 0.4, ty - Math.sin(a) * 4 + ny * 0.4); ctx.lineTo(tx - Math.cos(a) * 4 - nx * 0.4, ty - Math.sin(a) * 4 - ny * 0.4); ctx.closePath();
      ctx.fillStyle = hit ? C.hit : C.hedgehogSpineTip; ctx.fill();
    }
    // 身
    ell(ctx, -1, 4 - bob, 13, 8.5); ctx.fillStyle = hit ? C.hit : C.hedgehog; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
    // 臉
    ell(ctx, 10, 6 - bob, 6.5, 5); ctx.fillStyle = hit ? C.hit : C.hedgehogFace; ctx.fill(); ctx.stroke();
    circle(ctx, 16, 6 - bob, 1.8); ctx.fillStyle = C.outline; ctx.fill();
    if (stun) {
      ctx.strokeStyle = C.outline; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(10, 3 - bob, 2, 0, Math.PI * 1.6); ctx.stroke();
    } else { circle(ctx, 10.5, 3 - bob, 1.5); ctx.fillStyle = C.outline; ctx.fill(); }
    ctx.restore();
    if (stun) { ctx.save(); stunStars(ctx, x, y - 14, t); ctx.restore(); }
  }

  function drawBush(ctx, x, y) {
    ctx.fillStyle = C.bushDark;
    circle(ctx, x - 11, y + 4, 9); ctx.fill();
    circle(ctx, x + 11, y + 4, 9); ctx.fill();
    circle(ctx, x, y - 1, 13); ctx.fill();
    ctx.fillStyle = C.bush;
    circle(ctx, x - 10, y + 5, 7.5); ctx.fill();
    circle(ctx, x + 10, y + 5, 7.5); ctx.fill();
    circle(ctx, x, y, 11); ctx.fill();
    ctx.fillRect(x - 18, y + 6, 36, 8);
    ctx.fillStyle = C.bushLight;
    circle(ctx, x - 4, y - 5, 3.5); ctx.fill(); circle(ctx, x + 9, y + 1, 2.5); ctx.fill();
  }

  function drawSnake(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y);
    var f = num(s.facing, 1) < 0 ? -1 : 1, hit = s.hit === true, stun = s.stun === true;
    var st = s.state, stT = Math.max(0, num(s.stateT));
    var e = 0;
    if (st === 'strike') e = 80 * clamp(stT / 0.25, 0, 1);
    else if (st === 'out') e = 80;
    else if (st === 'retreat') e = 80 * (1 - clamp(stT / 0.5, 0, 1));
    ctx.save();
    if (e > 0) {
      var hx = x + f * e, hy = y + 2;
      // 蛇身
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      var n = 12;
      for (var i = 0; i <= n; i++) {
        var k = i / n, px = x + f * e * k, py = y + 8 - 6 * k + Math.sin(k * Math.PI * 2.5) * 3.5 * (1 - k * 0.6);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineWidth = 11; ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.lineWidth = 8; ctx.strokeStyle = hit ? C.hit : C.snake; ctx.stroke();
      ctx.lineWidth = 2.5; ctx.strokeStyle = hit ? C.hit : C.snakeBelly; ctx.stroke();
      // 頭
      ell(ctx, hx, hy, 9, 7); ctx.fillStyle = hit ? C.hit : C.snake; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
      circle(ctx, hx + f * 3, hy - 3, 2.2); ctx.fillStyle = '#ffe14a'; ctx.fill();
      if (stun) {
        ctx.strokeStyle = C.outline; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx + f * 3, hy - 3, 1.4, 0, Math.PI * 1.5); ctx.stroke();
      } else { ctx.fillStyle = C.outline; ctx.fillRect(hx + f * 3 - 0.6, hy - 5, 1.2, 4); }
      if (!stun && !hit) {
        ctx.strokeStyle = C.danger; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx + f * 9, hy + 1); ctx.lineTo(hx + f * 13, hy + 1); ctx.lineTo(hx + f * 15, hy - 1); ctx.moveTo(hx + f * 13, hy + 1); ctx.lineTo(hx + f * 15, hy + 3); ctx.stroke();
      }
    }
    // 草叢(任何狀態都畫, 蓋在蛇身根部之上)
    drawBush(ctx, x, y);
    if (st !== 'strike' && st !== 'out' && st !== 'retreat') {
      // 藏著: 草叢裡隱約一對眼睛
      ctx.fillStyle = 'rgba(255,225,74,0.7)';
      ell(ctx, x - 3, y - 2, 1.8, 1.4); ctx.fill(); ell(ctx, x + 3, y - 2, 1.8, 1.4); ctx.fill();
      ctx.fillStyle = C.outline; ctx.fillRect(x - 3.4, y - 3.2, 0.8, 2.4); ctx.fillRect(x + 2.6, y - 3.2, 0.8, 2.4);
    }
    ctx.restore();
    if (stun && e > 0) { ctx.save(); stunStars(ctx, x + f * e, y - 7, nowSec()); ctx.restore(); }
  }

  function drawWasp(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), t = num(s.t);
    var f = num(s.facing, 1) < 0 ? -1 : 1, hit = s.hit === true, stun = s.stun === true;
    var chase = s.state === 'chase' && !stun;
    var hover = stun ? 0 : Math.sin(t * 6) * 1.5;
    ctx.save();
    ctx.translate(x, y + hover);
    ctx.scale(f, 1);
    if (chase) ctx.rotate(0.15);
    // 翅膀
    var flap = stun ? 0.3 : Math.abs(Math.sin(t * 40));
    ctx.fillStyle = hit ? C.hit : C.waspWing;
    ell(ctx, -2, -4, 5, 2.5 + flap * 1.5, -0.5); ctx.fill();
    ell(ctx, 3, -4, 4, 2 + flap * 1.2, 0.4); ctx.fill();
    // 身(黃黑條)
    ell(ctx, -1, 2, 9, 6); ctx.fillStyle = hit ? C.hit : C.wasp; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
    if (!hit) {
      ctx.save(); ell(ctx, -1, 2, 9, 6); ctx.clip();
      ctx.fillStyle = C.waspBlack; ctx.fillRect(-6, -5, 3, 14); ctx.fillRect(-1, -5, 3, 14);
      ctx.restore();
    }
    // 尾針
    ctx.beginPath(); ctx.moveTo(-10, 1); ctx.lineTo(-13, 3); ctx.lineTo(-10, 4.5); ctx.closePath(); ctx.fillStyle = C.outline; ctx.fill();
    // 頭
    circle(ctx, 8, 0, 4.5); ctx.fillStyle = hit ? C.hit : C.waspBlack; ctx.fill();
    if (chase) {
      // 被惹毛: 紅眼 + 怒眉
      circle(ctx, 9.5, -0.5, 1.8); ctx.fillStyle = C.danger; ctx.fill();
      ctx.strokeStyle = C.danger; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(6.5, -4.5); ctx.lineTo(11, -2.5); ctx.stroke();
    } else if (stun) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(9.5, -0.5, 1.6, 0, Math.PI * 1.5); ctx.stroke();
    } else {
      circle(ctx, 9.5, -0.5, 1.5); ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.restore();
    if (chase) {
      // 追擊速度線(框內, 身後)
      ctx.save();
      ctx.strokeStyle = 'rgba(229,56,59,0.7)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - f * 13.5, y - 6); ctx.lineTo(x - f * 11, y - 6); ctx.moveTo(x - f * 13.5, y + 9); ctx.lineTo(x - f * 11, y + 9); ctx.stroke();
      ctx.restore();
    }
    if (stun) { ctx.save(); stunStars(ctx, x, y - 12, t); ctx.restore(); }
  }

  function drawMole(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), hit = s.hit === true, stun = s.stun === true;
    var up = s.state === 'up';
    var B = y + 16;
    ctx.save();
    // 洞(土堆邊 + 黑洞)
    ell(ctx, x, B - 4, 15.5, 4); ctx.fillStyle = C.holeRim; ctx.fill();
    ell(ctx, x, B - 4.5, 11, 2.8); ctx.fillStyle = C.hole; ctx.fill();
    if (up) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x - 16, y - 16, 32, 28); ctx.clip();
      // 身(從洞口冒出)
      ctx.beginPath();
      ctx.moveTo(x - 12, B - 4);
      ctx.lineTo(x - 12, y - 4);
      ctx.quadraticCurveTo(x - 12, y - 15.5, x, y - 15.5);
      ctx.quadraticCurveTo(x + 12, y - 15.5, x + 12, y - 4);
      ctx.lineTo(x + 12, B - 4);
      ctx.closePath();
      ctx.fillStyle = hit ? C.hit : C.mole; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
      ell(ctx, x, y + 2, 7, 5); ctx.fillStyle = hit ? C.hit : '#b8a593'; ctx.fill();
      circle(ctx, x, y - 2, 2.6); ctx.fillStyle = hit ? C.hit : C.moleNose; ctx.fill();
      if (stun) {
        ctx.strokeStyle = C.outline; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x - 5, y - 7, 1.6, 0, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 5, y - 7, 1.6, 0, Math.PI * 1.5); ctx.stroke();
      } else {
        ctx.fillStyle = C.outline;
        circle(ctx, x - 5, y - 7, 1.5); ctx.fill(); circle(ctx, x + 5, y - 7, 1.5); ctx.fill();
      }
      // 爪(搭在洞口)
      ctx.fillStyle = hit ? C.hit : C.moleNose;
      ell(ctx, x - 9, B - 6, 3.5, 2); ctx.fill(); ell(ctx, x + 9, B - 6, 3.5, 2); ctx.fill();
      ctx.restore();
      // 洞前緣蓋住身體底部
      ctx.beginPath(); ctx.ellipse(x, B - 4, 15.5, 4, 0, 0, Math.PI); ctx.fillStyle = C.holeRim; ctx.fill();
    }
    ctx.restore();
    if (stun && up) { ctx.save(); stunStars(ctx, x, y - 16, nowSec()); ctx.restore(); }
  }

  // ================= 特效 =================
  function drawAcornShot(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), t = num(s.t);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 18);
    // 比地上的橡實小、白邊、無光暈、旋轉
    circle(ctx, 0, 0, 5.5); ctx.fillStyle = '#ffffff'; ctx.fill();
    kindIcon(ctx, 'acorn', 0, 0, 9);
    ctx.restore();
  }

  function drawShakeWave(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.3));
    var p = clamp(num(s.t) / dur, 0, 1), R = clamp(num(s.radius, 120), 0, 120);
    if (p >= 1) return;
    ctx.save();
    // 判定外緣(全程虛線, 讓範圍看得到)
    ctx.globalAlpha = 0.7 * (1 - p * 0.5);
    ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = '#fff3c4';
    circle(ctx, x, y, R - 1); ctx.stroke();
    ctx.setLineDash([]);
    // 擴散環: 外緣 = 目前半徑, 最終 = radius
    var e = 1 - Math.pow(1 - p, 2);
    var r = R * (0.25 + 0.75 * e);
    ctx.globalAlpha = 1 - p * 0.85;
    circle(ctx, x, y, r); ctx.fillStyle = 'rgba(255,230,160,0.12)'; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(255,236,170,0.9)';
    circle(ctx, x, y, Math.max(0, r - 4)); ctx.stroke();
    ctx.restore();
  }

  function drawPoof(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.3));
    var p = clamp(num(s.t) / dur, 0, 1);
    if (p >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    var d = 4 + 10 * p, r = 7 + 3 * p;
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 + 0.3;
      circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r);
      ctx.fillStyle = i % 2 ? '#e8ece6' : '#c9d0c9'; ctx.fill();
    }
    circle(ctx, x, y, 8 * (1 - p) + 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  function drawPopup(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), dur = Math.max(0.01, num(s.dur, 0.8));
    var p = clamp(num(s.t) / dur, 0, 1);
    if (p >= 1) return;
    var k = kindN(s.kind);
    var v = (s.value === undefined || s.value === null) ? '1' : String(s.value);
    // 縮圖內(畫布縮到 0.5 倍以下)把浮字放大, 讓縮圖上也讀得到
    var sc = curScale(ctx), boost = sc < 0.5 ? clamp(0.75 / sc, 1, 3) : 1;
    ctx.save();
    ctx.translate(x, y - 30 * p);
    ctx.scale(boost, boost);
    ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    var label = '+' + v;
    var tw = textW(ctx, label, 18, true);
    var total = tw + 4 + 16;
    var lx = -total / 2;
    txt(ctx, label, lx, 0, 18, '#ffffff', 'left', true, 'rgba(10,14,12,0.95)');
    kindIcon(ctx, k, lx + tw + 4 + 8, 0, 16);
    ctx.restore();
  }

  // ================= 大地圖卡片 =================
  function selFrame(ctx, x, y, w, h) {
    ctx.save();
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 16);
    ctx.lineWidth = 4; ctx.strokeStyle = C.select; ctx.stroke();
    rr(ctx, x - 1, y - 1, w + 2, h + 2, 14);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
    ctx.restore();
  }

  function costBlock(ctx, cost, x, cy, size, ok) {
    var m = mats(cost);
    return matRow(ctx, m, x, cy, size, { onlyPositive: true, color: ok ? C.text : C.textFaint, gap: 16 });
  }

  function lockIcon(ctx, cx, cy, s, col) {
    ctx.save();
    ctx.lineWidth = s * 0.14; ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.28, Math.PI, 0); ctx.lineTo(cx + s * 0.28, cy + s * 0.05); ctx.moveTo(cx - s * 0.28, cy - s * 0.12); ctx.lineTo(cx - s * 0.28, cy + s * 0.05); ctx.stroke();
    rr(ctx, cx - s * 0.42, cy, s * 0.84, s * 0.6, s * 0.1); ctx.fillStyle = col; ctx.fill();
    circle(ctx, cx, cy + s * 0.26, s * 0.08); ctx.fillStyle = C.panelDark; ctx.fill();
    ctx.restore();
  }

  function drawLevelCard(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y);
    var st = (s.state === 'open' || s.state === 'cleared') ? s.state : 'locked';
    var idx = Math.floor(num(s.index, 1));
    var name = s.name ? String(s.name) : '';
    var ok = s.canAfford === true;
    ctx.save();
    rr(ctx, x, y, 400, 290, 14); ctx.fillStyle = C.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = st === 'locked' ? '#36483f' : C.panelLine; ctx.stroke();
    // 縮圖區
    if (st === 'locked') {
      rr(ctx, x + 8, y + 8, 384, 216, 8); ctx.fillStyle = C.panelDark; ctx.fill();
      lockIcon(ctx, x + 200, y + 72, 56, ok ? C.text : C.textFaint);
      var cm = mats(s.cost);
      var w = 0, ks = ['acorn', 'ore', 'honey'];
      // 先量寬度以置中
      var tmpW = 0;
      for (var i = 0; i < 3; i++) if (cm[ks[i]] > 0) tmpW += 26 + 4 + textW(ctx, String(Math.floor(cm[ks[i]])), 21, true) + 16;
      w = tmpW - 16;
      costBlock(ctx, cm, x + 200 - w / 2, y + 150, 26, ok);
      if (ok) {
        keyHint(ctx, 'Z', '解鎖', x + 158, y + 194, 26, C.ok);
      } else {
        txt(ctx, '素材不足', x + 200, y + 194, 17, C.textFaint, 'center', true);
      }
    } else {
      ctx.fillStyle = '#0c1410'; ctx.fillRect(x + 8, y + 8, 384, 216);
      ctx.lineWidth = 2; ctx.strokeStyle = '#0a0f0c'; ctx.strokeRect(x + 7, y + 7, 386, 218);
    }
    // 文字區 y+224~290
    // 三行: 關名 + 標準時間 / 回放動物 + 回放秒數 / 每分鐘產量; 右側金章
    txt(ctx, idx + '  ' + name, x + 14, y + 240, 20, st === 'locked' ? C.textDim : C.text, 'left', true);
    if (st === 'locked') {
      txt(ctx, '未開放', x + 14, y + 268, 15, C.textFaint, 'left', true);
    } else {
      txt(ctx, '標準 ' + Math.round(num(s.parTime)) + ' 秒', x + 334, y + 240, 16, C.textDim, 'right', true);
      if (st === 'open') {
        txt(ctx, '未過關', x + 14, y + 268, 16, C.textDim, 'left', true);
      } else {
        spIcon(ctx, s.recordSp, x + 24, y + 263, 20);
        txt(ctx, '回放 ' + fix1(s.recordTime) + ' 秒', x + 40, y + 263, 14, C.text, 'left', true);
        matRow(ctx, mats(s.rates), x + 14, y + 282, 15, { fmt: function (v) { return fix1(v) + '/分'; }, gap: 10 });
        medal(ctx, x + 370, y + 262, 22, s.gold === true);
      }
    }
    ctx.restore();
    if (s.selected === true) selFrame(ctx, x, y, 400, 290);
  }

  var SP_TRAIT = { squirrel: '滑翔 / 上樹冠', pangolin: '鑽地 / 進地下', bear: '搖蜂巢' };
  function drawSpeciesCard(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), sp = spN(s.sp);
    var st = (s.state === 'owned' || s.state === 'active') ? s.state : 'locked';
    var ok = s.canAfford === true;
    var name = s.name ? String(s.name) : '';
    ctx.save();
    rr(ctx, x, y, 400, 140, 14); ctx.fillStyle = C.panel; ctx.fill();
    ctx.lineWidth = st === 'active' ? 4 : 2;
    ctx.strokeStyle = st === 'active' ? C.ok : (st === 'locked' ? '#36483f' : C.panelLine);
    ctx.stroke();
    // 頭像
    circle(ctx, x + 70, y + 70, 50); ctx.fillStyle = st === 'locked' ? C.panelDark : '#2c3e35'; ctx.fill();
    spIcon(ctx, sp, x + 70, y + 72, 76, st === 'locked' ? '#3f514a' : null);
    if (st === 'locked') lockIcon(ctx, x + 104, y + 104, 26, C.textDim);
    txt(ctx, name, x + 140, y + 34, 24, st === 'locked' ? C.textDim : C.text, 'left', true);
    txt(ctx, SP_TRAIT[sp], x + 140, y + 66, 17, st === 'locked' ? C.textFaint : C.textDim, 'left', true);
    if (st === 'locked') {
      costBlock(ctx, s.cost, x + 140, y + 108, 22, ok);
      if (ok) keyHint(ctx, 'Z', '解鎖', x + 318, y + 108, 24, C.ok);
      else txt(ctx, '不足', x + 386, y + 108, 15, C.textFaint, 'right', true);
    } else if (st === 'owned') {
      keyHint(ctx, 'Z', '換成這隻', x + 140, y + 108, 24, C.text);
    } else {
      rr(ctx, x + 140, y + 94, 104, 28, 14); ctx.fillStyle = C.ok; ctx.fill();
      txt(ctx, '目前動物', x + 192, y + 108, 16, '#10301c', 'center', true, false);
    }
    ctx.restore();
    if (s.selected === true) selFrame(ctx, x, y, 400, 140);
  }

  function festivalIcon(ctx, cx, cy, s) {
    ctx.save();
    ctx.strokeStyle = '#d9c9a0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - s, cy - s * 0.55); ctx.quadraticCurveTo(cx, cy - s * 0.1, cx + s, cy - s * 0.55); ctx.stroke();
    var cols = ['#ff8a5c', C.gold, '#ff8a5c', C.gold, '#ff8a5c'];
    for (var i = 0; i < 5; i++) {
      var k = i / 4, lx = cx - s + k * 2 * s, ly = cy - s * 0.55 + Math.sin(k * Math.PI) * s * 0.22;
      ell(ctx, lx, ly + s * 0.25, s * 0.15, s * 0.2); ctx.fillStyle = cols[i]; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = '#3a2a1a'; ctx.stroke();
    }
    // 篝火(圓形火焰)
    ctx.fillStyle = '#ff9a3c'; ell(ctx, cx, cy + s * 0.45, s * 0.28, s * 0.32); ctx.fill();
    ctx.fillStyle = C.gold; ell(ctx, cx, cy + s * 0.52, s * 0.14, s * 0.2); ctx.fill();
    ctx.fillStyle = '#6b4a2e'; rr(ctx, cx - s * 0.4, cy + s * 0.72, s * 0.8, s * 0.12, 3); ctx.fill();
    ctx.restore();
  }

  function drawGoalCard(ctx, state) {
    var s = S(state), x = num(s.x), y = num(s.y), ok = s.canAfford === true;
    ctx.save();
    rr(ctx, x, y, 1220, 110, 14); ctx.fillStyle = C.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = ok ? C.ok : C.panelLine; ctx.stroke();
    festivalIcon(ctx, x + 70, y + 52, 46);
    txt(ctx, '森林祭典', x + 140, y + 38, 28, C.text, 'left', true);
    txt(ctx, '終極目標: 買下就完成遊戲', x + 140, y + 76, 16, C.textDim, 'left', true);
    txt(ctx, '花費', x + 520, y + 55, 16, C.textDim, 'left', true);
    costBlock(ctx, s.cost, x + 568, y + 55, 30, ok);
    if (ok) keyHint(ctx, 'Z', '舉辦祭典', x + 1040, y + 55, 30, C.ok);
    else txt(ctx, '素材不足', x + 1196, y + 55, 18, C.textFaint, 'right', true);
    ctx.restore();
    if (s.selected === true) selFrame(ctx, x, y, 1220, 110);
  }

  // ================= HUD =================
  function drawHud(ctx, state) {
    var s = S(state);
    var level = s.mode === 'level';
    ctx.save();
    ctx.fillStyle = 'rgba(12,18,15,0.82)'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 39, W, 1);
    var stock = mats(s.stock), rate = mats(s.ratePerMin);
    var boost = level && s.liveBoost === true;
    var ks = ['acorn', 'ore', 'honey'];
    // 持有 + 每分鐘產量
    var sx = level ? 720 : 440;
    if (level) { txt(ctx, '持有', sx - 6, 20, 13, C.textDim, 'right', true); }
    for (var i = 0; i < 3; i++) {
      var bx = sx + i * 130;
      kindIcon(ctx, ks[i], bx + 11, 20, 20);
      txt(ctx, String(Math.floor(stock[ks[i]])), bx + 25, 20, 18, C.text, 'left', true);
      var sw = textW(ctx, String(Math.floor(stock[ks[i]])), 18, true);
      txt(ctx, '+' + fix1(rate[ks[i]]) + '/分', bx + 29 + sw, 21, 13, boost ? C.boost : C.textDim, 'left', true);
    }
    if (level) {
      // 物種 + 血量
      spIcon(ctx, s.sp, 22, 20, 28);
      var maxHp = clamp(Math.floor(num(s.maxHp, 3)), 0, 10), hp = clamp(Math.floor(num(s.hp)), 0, maxHp);
      for (var h = 0; h < maxHp; h++) heart(ctx, 52 + h * 22, 21, 20, h < hp);
      // 技能冷卻(X 鍵帽 + 已恢復扇形)
      var dur = Math.max(0.001, num(s.skillCdDur, 1)), cd = clamp(num(s.skillCdT, dur) / dur, 0, 1);
      var cx = 52 + maxHp * 22 + 18;
      circle(ctx, cx, 20, 14); ctx.fillStyle = '#23302a'; ctx.fill();
      if (cd < 1) {
        ctx.beginPath(); ctx.moveTo(cx, 20); ctx.arc(cx, 20, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cd); ctx.closePath();
        ctx.fillStyle = 'rgba(111,220,140,0.45)'; ctx.fill();
        ctx.setLineDash([3, 3]); circle(ctx, cx, 20, 13); ctx.lineWidth = 2; ctx.strokeStyle = C.textFaint; ctx.stroke(); ctx.setLineDash([]);
        txt(ctx, 'X', cx, 20, 13, C.textDim, 'center', true);
      } else {
        circle(ctx, cx, 20, 13); ctx.fillStyle = C.ok; ctx.fill();
        txt(ctx, 'X', cx, 20, 14, '#10301c', 'center', true, false);
      }
      // 時間 vs 標準時間
      var tm = Math.max(0, num(s.time)), par = Math.max(0.001, num(s.parTime, 1));
      var within = tm <= par;
      var tx0 = cx + 30;
      medal(ctx, tx0 + 10, 19, 10, within);
      txt(ctx, fix1(tm), tx0 + 26, 17, 20, within ? C.gold : C.textDim, 'left', true);
      var tw = textW(ctx, fix1(tm), 20, true);
      txt(ctx, '/ 標準 ' + Math.round(par) + ' 秒', tx0 + 30 + tw, 18, 13, C.textDim, 'left', true);
      // 標準時間進度條: 走到底 = 標準時間到
      var barX = tx0 + 26, barW = 150;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(barX, 31, barW, 4);
      if (within) { ctx.fillStyle = C.gold; ctx.fillRect(barX, 31, barW * (tm / par), 4); }
      else { ctx.fillStyle = C.medalEmpty; ctx.fillRect(barX, 31, barW, 4); txt(ctx, '超過', barX + barW + 6, 33, 11, C.textDim, 'left', true); }
      // 這趟
      var rx = 488;
      txt(ctx, '這趟', rx, 20, 13, C.textDim, 'left', true);
      matRow(ctx, mats(s.run), rx + 32, 20, 18, { gap: 10 });
      // 現場加成
      if (boost) {
        rr(ctx, 1112, 6, 160, 28, 14); ctx.fillStyle = C.boost; ctx.fill();
        // 快轉符號(圓角)
        ctx.fillStyle = '#20103f';
        for (var j = 0; j < 2; j++) {
          ctx.beginPath(); ctx.moveTo(1126 + j * 8, 13); ctx.lineTo(1134 + j * 8, 20); ctx.lineTo(1126 + j * 8, 27); ctx.closePath(); ctx.fill();
        }
        txt(ctx, '現場加成 ×2', 1150, 20, 16, '#20103f', 'left', true, false);
      }
    } else {
      txt(ctx, '持有素材 / 每分鐘產量', 428, 20, 14, C.textDim, 'right', true);
    }
    ctx.restore();
  }

  // ================= 面板 =================
  function drawResultPanel(ctx, state) {
    var s = S(state), X = 280, Y = 150, gold = s.gold === true;
    ctx.save();
    panelBox(ctx, X, Y, 720, 420, gold ? C.gold : C.panelLine);
    txt(ctx, '過關!', X + 40, Y + 50, 40, C.text, 'left', true);
    spIcon(ctx, s.sp, X + 178, Y + 50, 40);
    txt(ctx, '時間 ' + fix1(s.time) + ' 秒', X + 40, Y + 112, 24, gold ? C.gold : C.text, 'left', true);
    txt(ctx, '標準 ' + Math.round(num(s.parTime)) + ' 秒', X + 40, Y + 146, 18, C.textDim, 'left', true);
    medal(ctx, X + 600, Y + 104, 46, gold);
    if (gold) txt(ctx, '重播產量 ×1.5', X + 600, Y + 172, 20, C.gold, 'center', true);
    else txt(ctx, '未達標準時間', X + 600, Y + 172, 18, C.textDim, 'center', true);
    // 這趟 / 每分鐘
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, X + 30, Y + 200, 656, 104, 10); ctx.fill();
    txt(ctx, '這趟拿到', X + 50, Y + 228, 16, C.textDim, 'left', true);
    matRow(ctx, mats(s.run), X + 150, Y + 228, 24, { gap: 26 });
    txt(ctx, '重播產量', X + 50, Y + 276, 16, C.textDim, 'left', true);
    matRow(ctx, mats(s.rates), X + 150, Y + 276, 24, { gap: 22, fmt: function (v) { return fix1(v) + '/分'; } });
    txt(ctx, s.replaced === true ? '已取代舊回放' : '已存成回放', X + 357, Y + 334, 18, C.text, 'center', true);
    var w1 = 0;
    w1 = keyHint(ctx, 'Z', '回大地圖', X + 190, Y + 378, 30, C.text);
    keyHint(ctx, 'X', '再跑一次', X + 190 + w1 + 40, Y + 378, 30, C.text);
    ctx.restore();
  }

  function drawFailPanel(ctx) {
    var X = 380, Y = 240;
    ctx.save();
    panelBox(ctx, X, Y, 520, 240, C.danger);
    txt(ctx, '失敗', X + 258, Y + 70, 44, C.danger, 'center', true);
    txt(ctx, '這趟不算, 素材不入帳', X + 258, Y + 118, 16, C.textDim, 'center', true);
    var w1 = keyHint(ctx, 'Z', '重來', X + 110, Y + 176, 30, C.text);
    keyHint(ctx, 'X', '回大地圖', X + 110 + w1 + 40, Y + 176, 30, C.text);
    ctx.restore();
  }

  function drawPausePanel(ctx, state) {
    var s = S(state), X = 380, Y = 220, level = s.mode === 'level';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
    panelBox(ctx, X, Y, 520, 280);
    txt(ctx, '暫停', X + 258, Y + 60, 40, C.text, 'center', true);
    if (level) {
      var w1 = keyHint(ctx, 'Esc', '繼續', X + 40, Y + 140, 30, C.text);
      var w2 = keyHint(ctx, 'Z', '重來', X + 40 + w1 + 28, Y + 140, 30, C.text);
      keyHint(ctx, 'X', '回大地圖', X + 40 + w1 + 28 + w2 + 28, Y + 140, 30, C.text);
      txt(ctx, '回大地圖: 這趟不算, 舊回放保留', X + 258, Y + 210, 16, C.textDim, 'center', true);
    } else {
      keyHint(ctx, 'Esc', '繼續', X + 200, Y + 150, 30, C.text);
    }
    ctx.restore();
  }

  function drawEndingPanel(ctx, state) {
    var s = S(state), X = 280, Y = 150;
    var tt = Math.max(0, Math.floor(num(s.totalTime)));
    var mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.save();
    panelBox(ctx, X, Y, 720, 420, C.gold);
    festivalIcon(ctx, X + 358, Y + 110, 130);
    txt(ctx, '森林祭典開始了', X + 358, Y + 236, 40, C.gold, 'center', true);
    txt(ctx, '總遊玩時間 ' + mm + ':' + (ss < 10 ? '0' : '') + ss, X + 358, Y + 296, 24, C.text, 'center', true);
    keyHint(ctx, 'Z', '重新開始', X + 290, Y + 362, 30, C.text);
    ctx.restore();
  }

  // ================= 說明頁示意圖 =================
  var GUIDE_SIZE = [[640, 200], [600, 220], [480, 220], [480, 300], [560, 260]];

  function label(ctx, s, x, y, size) { txt(ctx, s, x, y, size || 13, '#ffffff', 'center', true); }

  // 圓頭虛線箭頭
  function dashArrow(ctx, pts, col, lw) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = lw || 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash([8, 7]);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    var a = pts[pts.length - 1], b = pts[pts.length - 2];
    var ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
    ctx.beginPath();
    ctx.moveTo(a[0] - Math.cos(ang - 0.6) * 12, a[1] - Math.sin(ang - 0.6) * 12);
    ctx.lineTo(a[0], a[1]);
    ctx.lineTo(a[0] - Math.cos(ang + 0.6) * 12, a[1] - Math.sin(ang + 0.6) * 12);
    ctx.stroke();
    ctx.restore();
  }

  function cellBg(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 10); ctx.fillStyle = 'rgba(29,51,48,0.9)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.stroke();
  }

  // 一列地面(以 tile 大小 k*40 畫), 世界函式以 scale 呼叫
  function groundRow(ctx, x0, x1, topY, k) {
    ctx.save();
    ctx.translate(0, 0);
    for (var gx = x0; gx < x1 - 0.1; gx += 40 * k) {
      ctx.save(); ctx.translate(gx + 20 * k, topY + 20 * k); ctx.scale(k, k);
      drawGround(ctx, { x: 0, y: 0, kind: 'dirt', top: true });
      ctx.restore();
    }
    ctx.restore();
  }
  function at(ctx, fn, x, y, k, st) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    st = st || {}; st.x = 0; st.y = 0;
    fn(ctx, st);
    ctx.restore();
  }

  function guide0(ctx) { // 640x200
    cellBg(ctx, 0, 0, 640, 200);
    var k = 0.75, top = 160;
    ctx.save(); rr(ctx, 0, 0, 640, 200, 10); ctx.clip();
    groundRow(ctx, 0, 300, top, k);
    groundRow(ctx, 340, 640, top, k);
    ctx.restore();
    // 兩段接縫: 兩條圓頭波浪線(表示中間還很長)
    ctx.save(); ctx.strokeStyle = '#d6e3da'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (var j = 0; j < 2; j++) {
      ctx.beginPath();
      for (var i = 0; i <= 10; i++) { var yy = 120 + i * 8, xx = 312 + j * 14 + Math.sin(i * 1.2) * 4; if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
      ctx.stroke();
    }
    ctx.restore();
    at(ctx, drawPlayer, 36, top - 16 * 1.6, 1.6, { sp: 'squirrel', facing: 1, pose: 'run', poseT: 0.1 });
    at(ctx, drawPickup, 120, top - 26, 1.3, { kind: 'acorn', t: 0 });
    at(ctx, drawPickup, 160, top - 26, 1.3, { kind: 'acorn', t: 0.5 });
    at(ctx, drawHedgehog, 240, top - 14 * 1.4, 1.4, { facing: -1, t: 0 });
    at(ctx, drawPickup, 420, top - 26, 1.3, { kind: 'acorn', t: 1 });
    at(ctx, drawPickup, 470, top - 26, 1.3, { kind: 'acorn', t: 1.5 });
    at(ctx, drawGoal, 590, top - 40 * 1.3, 1.3, { reached: false });
    dashArrow(ctx, [[60, 40], [540, 40]], '#ffffff', 3);
    label(ctx, '你', 36, 76, 15);
    label(ctx, '終點旗', 590, 16, 14);
  }

  function guide1(ctx) { // 600x220, 四格
    var cw = 142, gap = 10.67;
    for (var c = 0; c < 4; c++) {
      var cx = c * (cw + gap);
      cellBg(ctx, cx, 0, cw, 220);
      ctx.save(); rr(ctx, cx, 0, cw, 220, 10); ctx.clip();
      groundRow(ctx, cx, cx + cw + 20, 190, 0.6);
      ctx.restore();
    }
    var k = 1.6, gy = 190 - 16 * k; // 松鼠站地上時中心
    // 1: ← → 跑
    var x0 = 71;
    at(ctx, drawPlayer, x0 + 6, gy, k, { sp: 'squirrel', facing: 1, pose: 'run', poseT: 0.05 });
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 - 40, gy - 8); ctx.lineTo(x0 - 26, gy - 8); ctx.moveTo(x0 - 44, gy + 6); ctx.lineTo(x0 - 28, gy + 6); ctx.stroke(); ctx.restore();
    keycap(ctx, '←', x0 - 20, 46, 30); keycap(ctx, '→', x0 + 20, 46, 30);
    // 2: 空白鍵 跳
    x0 = 71 + 152.67;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(x0 - 40, gy + 10); ctx.quadraticCurveTo(x0 - 18, 70, x0, 100); ctx.stroke(); ctx.restore();
    at(ctx, drawPlayer, x0 + 4, 104, k, { sp: 'squirrel', facing: 1, pose: 'rise', poseT: 0.1 });
    keycap(ctx, '空白鍵', x0, 46, 30);
    // 3: Z 丟橡實
    x0 = 71 + 152.67 * 2;
    at(ctx, drawPlayer, x0 - 32, gy, k, { sp: 'squirrel', facing: 1, pose: 'throw', poseT: 0.15 });
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 - 14, gy - 10); ctx.quadraticCurveTo(x0 + 8, gy - 50, x0 + 34, gy - 30); ctx.stroke(); ctx.restore();
    at(ctx, drawAcornShot, x0 + 38, gy - 26, 1.6, { t: 0.2 });
    keycap(ctx, 'Z', x0, 46, 30);
    // 4: X 滑翔(緩降軌跡 vs 一般下落)
    x0 = 71 + 152.67 * 3;
    ctx.save(); ctx.lineCap = 'round';
    ctx.setLineDash([4, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(160,175,168,0.8)';
    ctx.beginPath(); ctx.moveTo(x0 - 50, 84); ctx.quadraticCurveTo(x0 - 34, 110, x0 - 30, 182); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(x0 - 50, 84); ctx.quadraticCurveTo(x0 - 10, 104, x0 + 50, 128); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    at(ctx, drawPlayer, x0 + 10, 112, k, { sp: 'squirrel', facing: 1, pose: 'glide', poseT: 0.3 });
    txt(ctx, '一般', x0 - 46, 150, 12, C.textDim, 'center', true);
    keycap(ctx, 'X', x0, 46, 30);
  }

  function guide2(ctx) { // 480x220, 兩格
    var cw = 230;
    for (var c = 0; c < 2; c++) {
      var cx = c * 250;
      cellBg(ctx, cx, 0, cw, 220);
      ctx.save(); rr(ctx, cx, 0, cw, 220, 10); ctx.clip();
      groundRow(ctx, cx, cx + cw + 30, 180, 0.75);
      ctx.restore();
    }
    var k = 1.6;
    var moleY = 180 - 16 * k; // 地鼠冒出時中心(底邊貼地)
    // 左: 松鼠下落 → 地鼠(冒出)頭上
    at(ctx, drawMole, 115, moleY, k, { state: 'up' });
    at(ctx, drawPlayer, 115, moleY - 16 * k - 16 * k - 20, k, { sp: 'squirrel', facing: 1, pose: 'fall', poseT: 0.1 });
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(158, 54); ctx.lineTo(158, 92); ctx.moveTo(150, 84); ctx.lineTo(158, 92); ctx.lineTo(166, 84); ctx.stroke(); ctx.restore();
    // 右: 地鼠化成煙、松鼠彈起、+1 晶礦
    var rx = 250 + 115;
    at(ctx, drawPoof, rx, moleY, k, { t: 0.12, dur: 0.3 });
    at(ctx, drawPlayer, rx, 50, k, { sp: 'squirrel', facing: 1, pose: 'rise', poseT: 0.05 });
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(rx - 44, 98); ctx.lineTo(rx - 44, 60); ctx.moveTo(rx - 52, 68); ctx.lineTo(rx - 44, 60); ctx.lineTo(rx - 36, 68); ctx.stroke(); ctx.restore();
    at(ctx, drawPopup, rx + 58, moleY - 18, 1, { t: 0.1, dur: 0.8, kind: 'ore', value: '1' });
    // 中間的順序箭頭
    dashArrow(ctx, [[234, 110], [246, 110]], '#ffffff', 3);
  }

  function miniLevelScene(ctx) { // 1280x720 座標, 外部已 scale
    drawBackground(ctx);
    for (var gx = 20; gx < 1280; gx += 40) {
      drawGround(ctx, { x: gx, y: 620, kind: 'dirt', top: true });
      drawGround(ctx, { x: gx, y: 660, kind: 'dirt', top: false });
      drawGround(ctx, { x: gx, y: 700, kind: 'dirt', top: false });
    }
    drawPlayer(ctx, { x: 360, y: 584, sp: 'squirrel', facing: 1, pose: 'throw', poseT: 0.1 });
    drawPickup(ctx, { x: 200, y: 560, kind: 'acorn', t: 0 });
    drawPoof(ctx, { x: 760, y: 586, t: 0.1, dur: 0.3 });
    drawPopup(ctx, { x: 760, y: 540, t: 0.15, dur: 0.8, kind: 'acorn', value: '2' });
  }

  function guide3(ctx) { // 480x300
    // 頂端資訊列的橡實數: 前 → 後
    rr(ctx, 70, 0, 340, 40, 8); ctx.fillStyle = 'rgba(12,18,15,0.9)'; ctx.fill();
    kindIcon(ctx, 'acorn', 104, 20, 22);
    txt(ctx, '12', 122, 20, 20, C.textDim, 'left', true);
    dashArrow(ctx, [[160, 20], [196, 20]], '#ffffff', 3);
    txt(ctx, '14', 206, 20, 22, C.text, 'left', true);
    label(ctx, '持有數變多', 316, 20, 14);
    // 已過關的關卡卡片(縮 0.82)
    var k = 0.82, cx = (480 - 400 * k) / 2, cy = 52;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '林道', state: 'cleared', rates: { acorn: 6.6, ore: 2.2, honey: 0 }, recordSp: 'squirrel', recordTime: 27.4, parTime: 24, gold: false, cost: {}, canAfford: false, selected: false });
    // 縮圖: 重演剛才那趟
    ctx.save();
    ctx.beginPath(); ctx.rect(8, 8, 384, 216); ctx.clip();
    ctx.translate(8, 8); ctx.scale(0.3, 0.3);
    miniLevelScene(ctx);
    // 橡實彈的軌跡(示意)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 6; ctx.setLineDash([14, 14]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(390, 570); ctx.quadraticCurveTo(570, 440, 740, 580); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    ctx.restore();
  }

  function routeMini(ctx, ox, oy, mode) { // 一張 260x146 的同一關示意
    var k = 260 / 1280;
    ctx.save();
    ctx.beginPath(); rr(ctx, ox, oy, 260, 146, 6); ctx.clip();
    ctx.translate(ox, oy); ctx.scale(k, k);
    drawBackground(ctx);
    var gx;
    for (gx = 20; gx < 1280; gx += 40) { drawGround(ctx, { x: gx, y: 620, kind: 'dirt', top: true }); drawGround(ctx, { x: gx, y: 660, kind: 'dirt', top: false }); drawGround(ctx, { x: gx, y: 700, kind: 'dirt', top: false }); }
    // 入口台階 + 樹冠平台
    drawGround(ctx, { x: 220, y: 580, kind: 'dirt', top: true });
    drawGround(ctx, { x: 260, y: 580, kind: 'dirt', top: true });
    for (gx = 300; gx < 520; gx += 40) drawGround(ctx, { x: gx, y: 260, kind: 'leaf', top: true });
    for (gx = 760; gx < 980; gx += 40) drawGround(ctx, { x: gx, y: 260, kind: 'leaf', top: true });
    // 樹冠上的橡實
    var ac = [340, 400, 460, 800, 860, 920];
    for (var i = 0; i < ac.length; i++) at(ctx, drawPickup, ac[i], 210, 1.8, { kind: 'acorn', t: i });
    // 地面上的橡實
    at(ctx, drawPickup, 600, 570, 1.8, { kind: 'acorn', t: 0 });
    at(ctx, drawPickup, 1080, 570, 1.8, { kind: 'acorn', t: 0 });
    at(ctx, drawGoal, 1220, 600 - 40 * 1.8, 1.8, { reached: false });
    at(ctx, drawPlayer, 70, 600 - 16 * 2.2, 2.2, { sp: 'squirrel', facing: 1, pose: 'idle', poseT: 0 });
    ctx.restore();
    // 路線(外層座標, 線寬固定)
    function P(x, y) { return [ox + x * k, oy + y * k]; }
    if (mode === 'detour') {
      dashArrow(ctx, [P(120, 560), P(250, 420), P(320, 200), P(520, 200), P(640, 160), P(760, 200), P(980, 200), P(1060, 480), P(1170, 560)], '#ffffff', 2.5);
    } else {
      dashArrow(ctx, [P(120, 575), P(1170, 575)], '#ffffff', 2.5);
    }
    rr(ctx, ox, oy, 260, 146, 6); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
  }

  function guide4(ctx) { // 560x260
    routeMini(ctx, 10, 6, 'detour');
    routeMini(ctx, 290, 6, 'straight');
    // 左: 素材多 / 30 秒 + 灰色空章
    var row = [[10, 'detour'], [290, 'straight']];
    for (var i = 0; i < 2; i++) {
      var ox = row[i][0], left = i === 0;
      var n = left ? 6 : 2;
      for (var j = 0; j < n; j++) kindIcon(ctx, 'acorn', ox + 16 + j * 20, 172, 16);
      txt(ctx, left ? '素材多 / 30 秒' : '素材少 / 20 秒', ox + 8, 204, 17, C.text, 'left', true);
      medal(ctx, ox + 232, 196, 20, !left);
      txt(ctx, '標準 24 秒', ox + 8, 236, 13, C.textDim, 'left', true);
    }
  }

  var GUIDES = [guide0, guide1, guide2, guide3, guide4];

  function drawGuidePage(ctx, state) {
    var s = S(state);
    var p = Math.floor(num(s.page));
    if (p < 0 || p >= GUIDES.length) return;
    var x = num(s.x), y = num(s.y), w = Math.max(1, num(s.w, GUIDE_SIZE[p][0])), h = Math.max(1, num(s.h, GUIDE_SIZE[p][1]));
    var VW = GUIDE_SIZE[p][0], VH = GUIDE_SIZE[p][1];
    var k = Math.min(w / VW, h / VH);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - VW * k) / 2, y + (h - VH * k) / 2);
    ctx.scale(k, k);
    GUIDES[p](ctx);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: C,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawSoil: drawSoil,
    drawSpike: drawSpike,
    drawHive: drawHive,
    drawPickup: drawPickup,
    drawGoal: drawGoal,
    drawPlayer: drawPlayer,
    drawHedgehog: drawHedgehog,
    drawSnake: drawSnake,
    drawWasp: drawWasp,
    drawMole: drawMole,
    drawAcornShot: drawAcornShot,
    drawShakeWave: drawShakeWave,
    drawPoof: drawPoof,
    drawPopup: drawPopup,
    drawLevelCard: drawLevelCard,
    drawSpeciesCard: drawSpeciesCard,
    drawGoalCard: drawGoalCard,
    drawHud: drawHud,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEndingPanel: drawEndingPanel,
    drawGuidePage: drawGuidePage,
    guidePageSize: GUIDE_SIZE
  };
})();
