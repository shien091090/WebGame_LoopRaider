/* 魔印獵場 — 美術 (deepen-1 / game-b)
 * 全域物件 window.Art, 不用 ES module。全部 Canvas 2D 幾何繪製, 不引外部資源。
 * 每個函式只負責「給狀態 → 畫出來」, 自己 save/restore。
 */
(function () {
  'use strict';

  var W = 1280, H = 720;

  var PAL = {
    bg1: '#22345a', bg2: '#4a6a96', hill: '#2f4672',
    mapBg1: '#111827', mapBg2: '#1b2944',
    outline: '#141826',
    sword: '#3d8bff', hunter: '#22b866', bomber: '#ff8a2a',
    skin: '#ffd9b0',
    wood: '#d08b3e', ench: '#a066ff', time: '#3fdcf5',
    blast: '#ff2d6a', rich: '#ffc400', pack: '#39d96a', magnet: '#4f7dff',
    boar: '#8a4b2a', shield: '#7b8794', shieldPlate: '#c3d2e6', bee: '#ffcc2a', frog: '#8fd14f',
    beeShot: '#ff2e4d', spike: '#dfe3ea', danger: '#e8313a',
    crack: '#cdbb9a', hook: '#ffcf4a', chest: '#a0612e', gold: '#ffd23a',
    explosion: '#ff7a1a', shock: '#c8f4ff', poof: '#d6d8e0',
    hudBg: 'rgba(10,14,26,0.86)', panel: '#1e2740', panelHi: '#2b3858', panelEdge: '#4a5a82',
    text: '#f2f5ff', textDim: '#9aa6c4', ok: '#5be38a', bad: '#ff5a5a', select: '#ffe066', pending: '#ff9a2a',
    linkLit: '#ffd23a', linkDark: '#3c4866'
  };

  var THEME = {
    plain: { body: '#7a5233', dark: '#5f3f27', top: '#5cbf4a', topDark: '#3f9233' },
    sky: { body: '#8d9bb5', dark: '#6f7c96', top: '#eef4ff', topDark: '#c3d0e6' },
    rock: { body: '#9a4e2e', dark: '#7d3c22', top: '#d0864a', topDark: '#a9632f' },
    swamp: { body: '#3b4a35', dark: '#2b3727', top: '#6f8f3a', topDark: '#4d6a26' },
    throne: { body: '#463a63', dark: '#352b4d', top: '#d9b545', topDark: '#a8862a' }
  };

  var NAME = { blast: '爆裂印', rich: '豐饒印', pack: '招群印', magnet: '磁石印' };
  var EFFECT = { blast: '打倒時爆炸, 炸飛周圍的怪', rich: '血變多, 掉落 ×3', pack: '帶兩隻跟班出場', magnet: '打倒時吸來附近素材' };
  var CLSNAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var CLSGOOD = { sword: '跨寬坑', hunter: '上高台', bomber: '破岩牆、擊飛' };
  var MATUSE = { wood: '開路', ench: '解封', time: '加速' };
  var KINDS = ['wood', 'ench', 'time'];
  var MARKS = ['blast', 'rich', 'pack', 'magnet'];
  var CLASSES = ['sword', 'hunter', 'bomber'];
  var MONSTERS = ['boar', 'shield', 'bee', 'frog'];
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

  // ---------- 正規化 ----------
  function num(v, d, lo, hi) {
    v = (typeof v === 'number' && isFinite(v)) ? v : d;
    if (lo !== undefined && v < lo) v = lo;
    if (hi !== undefined && v > hi) v = hi;
    return v;
  }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function S(st) { return (st && typeof st === 'object') ? st : {}; }
  function mark(v) { return MARKS.indexOf(v) >= 0 ? v : null; }
  function kindOf(v) { return pick(v, KINDS, 'wood'); }
  function clsOf(v) { return pick(v, CLASSES, 'sword'); }
  function fmt1(v) { return num(v, 0, -1e6, 1e6).toFixed(1); }
  function int(v) { return String(Math.round(num(v, 0, -1e9, 1e9))); }
  function trio(o) { o = S(o); return { wood: num(o.wood, 0, 0, 1e9), ench: num(o.ench, 0, 0, 1e9), time: num(o.time, 0, 0, 1e9) }; }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000; }

  // ---------- 色彩 ----------
  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) {
    var A = hex2rgb(a), B = hex2rgb(b);
    var r = Math.round(A[0] + (B[0] - A[0]) * k), g = Math.round(A[1] + (B[1] - A[1]) * k), bl = Math.round(A[2] + (B[2] - A[2]) * k);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  function rgba(h, a) { var c = hex2rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function painter(hit) { return hit ? function (c) { return mix(c, '#ffffff', 0.8); } : function (c) { return c; }; }

  // ---------- 形狀 ----------
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
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2); }
  function fillStroke(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, c, lw) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = c; ctx.lineWidth = lw || 2; ctx.stroke();
  }
  function star(ctx, cx, cy, n, ro, ri, rot) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = (rot || 0) + i * Math.PI / n - Math.PI / 2;
      var r = i % 2 === 0 ? ro : ri;
      if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function heart(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.45);
    ctx.bezierCurveTo(cx - s * 0.6, cy + s * 0.05, cx - s * 0.5, cy - s * 0.5, cx, cy - s * 0.18);
    ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.5, cx + s * 0.6, cy + s * 0.05, cx, cy + s * 0.45);
    ctx.closePath();
  }

  // ---------- 文字 ----------
  function font(size, bold) { return (bold ? 'bold ' : '') + size + 'px ' + FONT; }
  function text(ctx, s, x, y, size, color, align, bold, outline) {
    ctx.font = font(size, bold);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (outline) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = outline; ctx.lineWidth = Math.max(3, size * 0.22);
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function tw(ctx, s, size, bold) { ctx.font = font(size, bold); var m = ctx.measureText(s); return (m && m.width) || s.length * size * 0.6; }

  // 鍵帽: 中心 cx, cy, 高 h
  function keycap(ctx, label, cx, cy, h, dim) {
    h = h || 24;
    var fs = Math.round(h * 0.58);
    var w = Math.max(h, tw(ctx, label, fs, true) + h * 0.55);
    ctx.save();
    rr(ctx, cx - w / 2, cy - h / 2 + 2, w, h, 5);
    ctx.fillStyle = dim ? '#2a3046' : '#8c97b8'; ctx.fill();
    rr(ctx, cx - w / 2, cy - h / 2, w, h - 2, 5);
    ctx.fillStyle = dim ? '#3a4260' : '#eef2ff'; ctx.fill();
    ctx.strokeStyle = dim ? '#4a5272' : '#5a6488'; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, label, cx, cy - 1, fs, dim ? '#7d86a3' : '#1a2036', 'center', true);
    ctx.restore();
    return w;
  }
  // 一排「鍵 + 動作」提示, 置中於 cx
  function keyHints(ctx, list, cx, cy, h, size) {
    h = h || 24; size = size || 16;
    var gap = 22, parts = [], total = 0, i;
    for (i = 0; i < list.length; i++) {
      var kw = Math.max(h, tw(ctx, list[i][0], Math.round(h * 0.58), true) + h * 0.55);
      var lw = tw(ctx, list[i][1], size, true);
      parts.push([kw, lw]);
      total += kw + 6 + lw + (i ? gap : 0);
    }
    var x = cx - total / 2;
    for (i = 0; i < list.length; i++) {
      if (i) x += gap;
      keycap(ctx, list[i][0], x + parts[i][0] / 2, cy, h, list[i][2]);
      x += parts[i][0] + 6;
      text(ctx, list[i][1], x, cy, size, list[i][2] ? PAL.textDim : PAL.text, 'left', true);
      x += parts[i][1];
    }
  }

  // ---------- 縮圖偵測 ----------
  // RD 以 ctx.scale 重用關卡函式畫縮圖(0.125)時, 細節糊成一團; 改畫高對比剪影
  function viewScale(ctx) {
    try {
      var m = ctx.getTransform();
      if (!m) return 1;
      var base = (ctx.canvas && ctx.canvas.width) ? ctx.canvas.width / W : 1;
      if (!(base > 0)) base = 1;
      var s = Math.sqrt(m.a * m.a + m.b * m.b) / base;
      return (s > 0 && isFinite(s)) ? s : 1;
    } catch (e) { return 1; }
  }

  // ---------- 共用圖示 ----------
  // 素材圖示: 木材 = 原木、印墨 = 墨滴、時晶 = 菱形晶體; s 為外接尺寸
  function matIcon(ctx, kind, cx, cy, s) {
    kind = kindOf(kind);
    var h = s / 2;
    ctx.save();
    ctx.lineJoin = 'round';
    var lw = Math.max(1, s * 0.08);
    if (kind === 'wood') {
      rr(ctx, cx - h + lw / 2, cy - h * 0.62, s - lw, h * 1.24, h * 0.3);
      fillStroke(ctx, PAL.wood, PAL.outline, lw);
      line(ctx, cx - h * 0.7, cy - h * 0.15, cx + h * 0.1, cy - h * 0.15, '#9a5f22', lw * 0.8);
      line(ctx, cx - h * 0.55, cy + h * 0.25, cx + h * 0.05, cy + h * 0.25, '#9a5f22', lw * 0.8);
      ell(ctx, cx + h * 0.5, cy, h * 0.36, h * 0.5);
      fillStroke(ctx, '#f2c88a', PAL.outline, lw * 0.8);
      ell(ctx, cx + h * 0.5, cy, h * 0.14, h * 0.22);
      ctx.strokeStyle = '#b07a3a'; ctx.lineWidth = lw * 0.7; ctx.stroke();
    } else if (kind === 'ench') {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h + lw / 2);
      ctx.bezierCurveTo(cx + h * 0.25, cy - h * 0.45, cx + h * 0.78, cy - h * 0.05, cx + h * 0.72, cy + h * 0.32);
      ctx.arc(cx, cy + h * 0.28, h * 0.72 - lw / 2, 0.05, Math.PI - 0.05);
      ctx.bezierCurveTo(cx - h * 0.78, cy - h * 0.05, cx - h * 0.25, cy - h * 0.45, cx, cy - h + lw / 2);
      ctx.closePath();
      fillStroke(ctx, PAL.ench, PAL.outline, lw);
      circle(ctx, cx - h * 0.25, cy + h * 0.15, h * 0.16);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    } else {
      var a = h - lw / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - a);
      ctx.lineTo(cx + a * 0.72, cy - a * 0.2);
      ctx.lineTo(cx, cy + a);
      ctx.lineTo(cx - a * 0.72, cy - a * 0.2);
      ctx.closePath();
      fillStroke(ctx, PAL.time, PAL.outline, lw);
      ctx.beginPath();
      ctx.moveTo(cx - a * 0.72, cy - a * 0.2); ctx.lineTo(cx, cy - a * 0.05); ctx.lineTo(cx + a * 0.72, cy - a * 0.2);
      ctx.moveTo(cx, cy - a * 0.05); ctx.lineTo(cx, cy + a);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = lw * 0.7; ctx.stroke();
    }
    ctx.restore();
  }

  // 印記圖示: 圓形徽章(印記色) + 白色符號; s 為直徑
  function markGlyph(ctx, type, cx, cy, s) {
    type = mark(type) || 'blast';
    var r = s / 2, c = PAL[type];
    var lw = Math.max(1, s * 0.07);
    ctx.save();
    circle(ctx, cx, cy, r - lw / 2);
    fillStroke(ctx, c, PAL.outline, lw);
    circle(ctx, cx, cy, r * 0.78);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    ctx.lineJoin = 'round';
    if (type === 'blast') {
      star(ctx, cx, cy, 8, r * 0.72, r * 0.34, 0);
      fillStroke(ctx, '#ffffff', PAL.outline, lw * 0.6);
      circle(ctx, cx, cy, r * 0.22); ctx.fillStyle = '#ffe14a'; ctx.fill();
    } else if (type === 'rich') {
      // 碗 + 滿出來的三種素材
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.66, cy + r * 0.05);
      ctx.lineTo(cx + r * 0.66, cy + r * 0.05);
      ctx.quadraticCurveTo(cx + r * 0.6, cy + r * 0.66, cx, cy + r * 0.66);
      ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 0.66, cx - r * 0.66, cy + r * 0.05);
      ctx.closePath();
      fillStroke(ctx, '#ffffff', PAL.outline, lw * 0.6);
      var d = r * 0.26;
      circle(ctx, cx - r * 0.33, cy - r * 0.12, d); fillStroke(ctx, PAL.wood, PAL.outline, lw * 0.5);
      circle(ctx, cx + r * 0.33, cy - r * 0.12, d); fillStroke(ctx, PAL.time, PAL.outline, lw * 0.5);
      circle(ctx, cx, cy - r * 0.42, d); fillStroke(ctx, PAL.ench, PAL.outline, lw * 0.5);
    } else if (type === 'pack') {
      // 三個小身影, 中間較大
      var fig = function (x, y, k) {
        circle(ctx, x, y - r * 0.32 * k, r * 0.2 * k);
        fillStroke(ctx, '#ffffff', PAL.outline, lw * 0.5);
        rr(ctx, x - r * 0.24 * k, y - r * 0.1 * k, r * 0.48 * k, r * 0.5 * k, r * 0.16 * k);
        fillStroke(ctx, '#ffffff', PAL.outline, lw * 0.5);
      };
      fig(cx - r * 0.42, cy + r * 0.12, 0.8);
      fig(cx + r * 0.42, cy + r * 0.12, 0.8);
      fig(cx, cy + r * 0.05, 1.15);
    } else {
      // 磁鐵: U 形
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.02, r * 0.4, 0, Math.PI, false);
      ctx.strokeStyle = PAL.outline; ctx.lineWidth = r * 0.42; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.28; ctx.stroke();
      ctx.lineCap = 'butt';
      [-1, 1].forEach(function (sd) {
        rr(ctx, cx + sd * r * 0.4 - r * 0.15, cy - r * 0.55, r * 0.3, r * 0.58, 1);
        fillStroke(ctx, '#ffffff', PAL.outline, lw * 0.5);
        rr(ctx, cx + sd * r * 0.4 - r * 0.15, cy - r * 0.55, r * 0.3, r * 0.2, 1);
        fillStroke(ctx, sd < 0 ? '#ff5a5a' : '#c8d0e0', PAL.outline, lw * 0.5);
      });
    }
    ctx.restore();
  }

  // 職業小圖示: 職業色圓 + 白色武器符號
  function clsIcon(ctx, cls, cx, cy, s) {
    cls = clsOf(cls);
    var r = s / 2, lw = Math.max(1, s * 0.07);
    ctx.save();
    circle(ctx, cx, cy, r - lw / 2);
    fillStroke(ctx, PAL[cls], PAL.outline, lw);
    ctx.lineCap = 'round';
    if (cls === 'sword') {
      line(ctx, cx - r * 0.45, cy + r * 0.45, cx + r * 0.5, cy - r * 0.5, '#ffffff', r * 0.22);
      line(ctx, cx - r * 0.55, cy + r * 0.05, cx - r * 0.05, cy + r * 0.55, '#ffffff', r * 0.16);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.arc(cx - r * 0.2, cy, r * 0.55, -Math.PI / 2, Math.PI / 2);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.16; ctx.stroke();
      line(ctx, cx - r * 0.2, cy - r * 0.55, cx - r * 0.2, cy + r * 0.55, '#ffffff', r * 0.07);
      line(ctx, cx - r * 0.45, cy, cx + r * 0.6, cy, '#ffffff', r * 0.12);
    } else {
      circle(ctx, cx - r * 0.08, cy + r * 0.12, r * 0.42); ctx.fillStyle = '#ffffff'; ctx.fill();
      line(ctx, cx + r * 0.15, cy - r * 0.2, cx + r * 0.42, cy - r * 0.5, '#ffffff', r * 0.12);
      circle(ctx, cx + r * 0.48, cy - r * 0.56, r * 0.12); ctx.fillStyle = '#ffe14a'; ctx.fill();
    }
    ctx.restore();
  }

  function lockIcon(ctx, cx, cy, s, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.12, s * 0.24, Math.PI, 0);
    ctx.strokeStyle = color; ctx.lineWidth = s * 0.1; ctx.stroke();
    rr(ctx, cx - s * 0.36, cy - s * 0.12, s * 0.72, s * 0.56, s * 0.08);
    fillStroke(ctx, color, PAL.outline, Math.max(1, s * 0.05));
    circle(ctx, cx, cy + s * 0.1, s * 0.08); ctx.fillStyle = PAL.outline; ctx.fill();
    ctx.restore();
  }

  function costRow(ctx, cost, cx, cy, size, bad) {
    cost = trio(cost);
    var list = KINDS.filter(function (k) { return cost[k] > 0; });
    var parts = list.map(function (k) { return [k, int(cost[k])]; });
    var total = 0, gap = size * 0.6;
    parts.forEach(function (p, i) { p.push(tw(ctx, p[1], size, true)); total += size + 4 + p[2] + (i ? gap : 0); });
    var x = cx - total / 2;
    parts.forEach(function (p, i) {
      if (i) x += gap;
      matIcon(ctx, p[0], x + size / 2, cy, size);
      x += size + 4;
      var isBad = typeof bad === 'object' && bad ? !!bad[p[0]] : !!bad;
      text(ctx, p[1], x, cy, size, isBad ? PAL.bad : PAL.text, 'left', true, PAL.outline);
      x += p[2];
    });
    return total;
  }

  function panelBox(ctx, x, y, w, h, fill, edge) {
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 12);
    ctx.fillStyle = fill || PAL.panel; ctx.fill();
    ctx.strokeStyle = edge || PAL.panelEdge; ctx.lineWidth = 2; ctx.stroke();
  }
  function dim(ctx, a, hole) {
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    if (hole) ctx.rect(hole[0], hole[1], hole[2], hole[3]);
    ctx.fillStyle = 'rgba(6,9,18,' + a + ')';
    ctx.fill('evenodd');
  }

  // ---------- 背景 ----------
  function skyFill(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, PAL.bg1); g.addColorStop(1, PAL.bg2);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  function drawBackground(ctx) {
    ctx.save();
    skyFill(ctx, 0, 0, W, H);
    ctx.fillStyle = rgba(PAL.hill, 0.55);
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var i = 0; i <= 16; i++) {
      var x = i * 80, y = 470 + Math.sin(i * 1.3) * 50 + Math.cos(i * 0.7) * 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    [[180, 130, 60], [520, 90, 80], [900, 150, 70], [1150, 80, 50]].forEach(function (c) {
      ell(ctx, c[0], c[1], c[2], c[2] * 0.35); ctx.fill();
      ell(ctx, c[0] + c[2] * 0.5, c[1] + 6, c[2] * 0.6, c[2] * 0.28); ctx.fill();
    });
    ctx.restore();
  }
  function drawMapBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PAL.mapBg1); g.addColorStop(1, PAL.mapBg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(160,190,255,0.07)';
    for (var y = 60; y < H; y += 40) for (var x = 20; x < W; x += 40) ctx.fillRect(x, y, 2, 2);
    ctx.restore();
  }

  // ---------- 地形 ----------
  function drawGround(ctx, st) {
    st = S(st);
    var x = num(st.x, 0) - 20, y = num(st.y, 0) - 20;
    var th = THEME[st.theme] || THEME.plain, theme = THEME[st.theme] ? st.theme : 'plain';
    ctx.save();
    ctx.fillStyle = th.body; ctx.fillRect(x, y, 40, 40);
    ctx.fillStyle = th.dark;
    if (theme === 'plain') {
      ctx.fillRect(x + 8, y + 20, 4, 3); ctx.fillRect(x + 26, y + 30, 5, 3); ctx.fillRect(x + 18, y + 12, 3, 3);
    } else if (theme === 'sky') {
      ctx.fillRect(x, y + 19, 40, 2); ctx.fillRect(x + 19, y, 2, 19); ctx.fillRect(x + 8, y + 21, 2, 19); ctx.fillRect(x + 30, y + 21, 2, 19);
    } else if (theme === 'rock') {
      ctx.beginPath();
      ctx.moveTo(x, y + 14); ctx.lineTo(x + 40, y + 6); ctx.lineTo(x + 40, y + 9); ctx.lineTo(x, y + 17); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y + 30); ctx.lineTo(x + 40, y + 22); ctx.lineTo(x + 40, y + 25); ctx.lineTo(x, y + 33); ctx.closePath(); ctx.fill();
    } else if (theme === 'swamp') {
      circle(ctx, x + 12, y + 24, 3); ctx.fill(); circle(ctx, x + 28, y + 14, 2.5); ctx.fill(); circle(ctx, x + 26, y + 32, 2); ctx.fill();
    } else {
      ctx.strokeStyle = th.dark; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, 34, 34);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 4, y + 4, 32, 4);
    }
    if (st.top) {
      ctx.fillStyle = th.top;
      if (theme === 'plain') {
        ctx.fillRect(x, y, 40, 7);
        ctx.beginPath();
        for (var i = 0; i < 5; i++) { ctx.moveTo(x + i * 8, y + 7); ctx.lineTo(x + i * 8 + 4, y + 11); ctx.lineTo(x + i * 8 + 8, y + 7); }
        ctx.fill();
        ctx.fillStyle = th.topDark; ctx.fillRect(x, y + 5, 40, 2);
      } else if (theme === 'sky') {
        ctx.fillRect(x, y, 40, 5);
        circle(ctx, x + 8, y + 5, 4); ctx.fill(); circle(ctx, x + 22, y + 5, 5); ctx.fill(); circle(ctx, x + 34, y + 5, 4); ctx.fill();
      } else if (theme === 'rock') {
        ctx.fillRect(x, y, 40, 6);
        ctx.fillStyle = th.topDark; ctx.fillRect(x, y + 6, 40, 2);
      } else if (theme === 'swamp') {
        ctx.fillRect(x, y, 40, 7);
        ctx.beginPath(); ctx.moveTo(x + 6, y + 7); ctx.lineTo(x + 9, y + 13); ctx.lineTo(x + 12, y + 7);
        ctx.moveTo(x + 24, y + 7); ctx.lineTo(x + 27, y + 15); ctx.lineTo(x + 30, y + 7); ctx.fill();
      } else {
        ctx.fillRect(x, y, 40, 6);
        ctx.fillStyle = th.topDark; ctx.fillRect(x, y + 6, 40, 1);
        ctx.fillStyle = '#fff3b0'; ctx.fillRect(x + 9, y + 2, 2, 2); ctx.fillRect(x + 29, y + 2, 2, 2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, 40, 1);
    }
    ctx.restore();
  }

  function drawSpike(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    ctx.fillStyle = PAL.danger; ctx.fillRect(x - 20, y + 16, 40, 4);
    for (var i = 0; i < 4; i++) {
      var bx = x - 20 + i * 10;
      ctx.beginPath();
      ctx.moveTo(bx + 1, y + 17); ctx.lineTo(bx + 5, y + 1.5); ctx.lineTo(bx + 9, y + 17); ctx.closePath();
      fillStroke(ctx, PAL.spike, PAL.outline, 1.5);
      ctx.beginPath(); ctx.moveTo(bx + 3.6, y + 7); ctx.lineTo(bx + 5, y + 1.5); ctx.lineTo(bx + 6.4, y + 7); ctx.closePath();
      ctx.fillStyle = PAL.danger; ctx.fill();
    }
    ctx.restore();
  }

  function drawCrackWall(ctx, st) {
    st = S(st);
    var x = num(st.x, 0) - 20, y = num(st.y, 0) - 20;
    var hp = Math.round(num(st.hp, 3, 1, 3));
    var body = hp === 3 ? PAL.crack : hp === 2 ? '#bda886' : '#a68f6c';
    ctx.save();
    ctx.fillStyle = body; ctx.fillRect(x, y, 40, 40);
    // 磚縫(和一般地面區分: 淺色砌磚 + 深外框)
    ctx.fillStyle = 'rgba(80,60,40,0.35)';
    ctx.fillRect(x, y + 13, 40, 2); ctx.fillRect(x, y + 26, 40, 2);
    ctx.fillRect(x + 19, y, 2, 13); ctx.fillRect(x + 9, y + 15, 2, 11); ctx.fillRect(x + 29, y + 15, 2, 11); ctx.fillRect(x + 19, y + 28, 2, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 2, y + 2, 36, 2);
    ctx.strokeStyle = '#4a3828'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 38, 38);
    // 裂痕: hp 越低越多
    ctx.strokeStyle = '#2a1c10'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 14, y + 14); ctx.lineTo(x + 12, y + 22); ctx.lineTo(x + 20, y + 30);
    if (hp <= 2) { ctx.moveTo(x + 36, y + 6); ctx.lineTo(x + 26, y + 16); ctx.lineTo(x + 30, y + 24); ctx.lineTo(x + 22, y + 36); ctx.moveTo(x + 14, y + 14); ctx.lineTo(x + 24, y + 12); }
    if (hp <= 1) { ctx.moveTo(x + 4, y + 30); ctx.lineTo(x + 12, y + 22); ctx.moveTo(x + 20, y + 30); ctx.lineTo(x + 34, y + 34); ctx.moveTo(x + 26, y + 16); ctx.lineTo(x + 36, y + 20); ctx.moveTo(x + 20, y + 4); ctx.lineTo(x + 24, y + 12); }
    ctx.stroke();
    if (hp <= 1) {
      // 缺角
      ctx.fillStyle = '#2a1c10';
      ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 10, y + 2); ctx.lineTo(x + 2, y + 9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 38, y + 38); ctx.lineTo(x + 29, y + 38); ctx.lineTo(x + 38, y + 30); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawHookRing(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    line(ctx, x, y - 30, x, y - 9, '#6b4a2a', 3);
    circle(ctx, x, y, 9);
    ctx.strokeStyle = PAL.outline; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = PAL.hook; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 9, -2.4, -1.4); ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function drawPickup(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0, -1e6, 1e6);
    var kind = kindOf(st.kind);
    ctx.save();
    if (viewScale(ctx) < 0.3) {
      // 縮圖: 放大成 24px 實心色塊
      matIcon(ctx, kind, x, y, 24);
    } else {
      var bob = Math.sin(t * 3) * 1.5;
      matIcon(ctx, kind, x, y + bob, 20);
      var gl = (Math.sin(t * 4) + 1) / 2;
      if (gl > 0.7) {
        star(ctx, x + 7, y - 7 + bob, 4, 3.5, 1, 0);
        ctx.fillStyle = 'rgba(255,255,255,' + ((gl - 0.7) * 3).toFixed(2) + ')'; ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawChest(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    if (!st.open) {
      rr(ctx, x - 19, y - 4, 38, 21, 3); fillStroke(ctx, PAL.chest, PAL.outline, 2);
      rr(ctx, x - 19, y - 16, 38, 14, 7); fillStroke(ctx, '#b8723a', PAL.outline, 2);
      ctx.fillStyle = PAL.gold;
      ctx.fillRect(x - 13, y - 15, 4, 31); ctx.fillRect(x + 9, y - 15, 4, 31);
      rr(ctx, x - 5, y - 7, 10, 11, 2); fillStroke(ctx, PAL.gold, PAL.outline, 1.5);
      circle(ctx, x, y - 2, 1.5); ctx.fillStyle = PAL.outline; ctx.fill();
      star(ctx, x + 14, y - 13, 4, 4, 1.2, 0); ctx.fillStyle = '#ffffff'; ctx.fill();
    } else {
      // 開著的空箱: 蓋子翻到後方、褪色、沒有鎖
      rr(ctx, x - 18, y - 17, 36, 9, 3); fillStroke(ctx, '#5c4c3e', PAL.outline, 2);
      rr(ctx, x - 19, y - 6, 38, 23, 3); fillStroke(ctx, '#6d5a48', PAL.outline, 2);
      ctx.fillStyle = '#1d1410'; ctx.fillRect(x - 16, y - 4, 32, 6);
      ctx.fillStyle = '#8e8676'; ctx.fillRect(x - 13, y + 2, 4, 14); ctx.fillRect(x + 9, y + 2, 4, 14);
    }
    ctx.restore();
  }

  function drawGoal(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), reached = !!st.reached;
    ctx.save();
    rr(ctx, x - 18, y + 33, 26, 7, 2); fillStroke(ctx, '#8a8f9e', PAL.outline, 1.5);
    line(ctx, x - 5, y + 34, x - 5, y - 34, PAL.outline, 5);
    line(ctx, x - 5, y + 34, x - 5, y - 34, '#eceff5', 3);
    circle(ctx, x - 5, y - 35, 4); fillStroke(ctx, reached ? PAL.gold : '#eceff5', PAL.outline, 1.5);
    var fx = x - 3, fy = y - 31, fw = 22, fh = 18;
    if (!reached) {
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#1a1d2a' : '#ffffff';
        ctx.fillRect(fx + c * fw / 4, fy + r * fh / 3, fw / 4, fh / 3);
      }
      ctx.strokeStyle = PAL.outline; ctx.lineWidth = 1.5; ctx.strokeRect(fx, fy, fw, fh);
    } else {
      ctx.beginPath(); ctx.rect(fx, fy, fw, fh);
      fillStroke(ctx, PAL.gold, PAL.outline, 1.5);
      star(ctx, fx + fw / 2, fy + fh / 2, 5, 7, 3, 0); ctx.fillStyle = '#ffffff'; ctx.fill();
      star(ctx, x + 14, y - 8, 4, 5, 1.4, 0); ctx.fillStyle = '#fff6c8'; ctx.fill();
      star(ctx, x - 14, y - 18, 4, 4, 1.2, 0); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 印記 ----------
  function drawMarkAura(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0, -1e6, 1e6);
    var type = mark(st.type) || 'blast', c = PAL[type];
    var p = (Math.sin(t * 5) + 1) / 2;
    ctx.save();
    if (viewScale(ctx) < 0.3) {
      ell(ctx, x, y, 36, 28); ctx.fillStyle = rgba(c, 0.55); ctx.fill();
      ell(ctx, x, y, 33, 25); ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.stroke();
    } else {
      ell(ctx, x, y, 35, 27);
      var g = ctx.createRadialGradient(x, y, 4, x, y, 35);
      g.addColorStop(0, rgba(c, 0.05)); g.addColorStop(1, rgba(c, 0.42 + 0.2 * p));
      ctx.fillStyle = g; ctx.fill();
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 20;
      ell(ctx, x, y, 34, 26); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([]);
      // 上升的小光點
      for (var i = 0; i < 4; i++) {
        var ph = (t * 0.8 + i * 0.25) % 1;
        var px = x + Math.cos(i * 1.9) * 22, py = y + 18 - ph * 36;
        circle(ctx, px, py, 2); ctx.fillStyle = rgba(c, 1 - ph); ctx.fill();
      }
    }
    // 頭頂印記圖示 20x20 中心 (x, y-38)
    markGlyph(ctx, type, x, y - 38, 20);
    ctx.restore();
  }

  function drawMarkSpot(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), type = mark(st.type);
    ctx.save();
    if (st.sealed) {
      rr(ctx, x - 16, y - 16, 32, 32, 6); fillStroke(ctx, '#3a4058', PAL.outline, 2);
      lockIcon(ctx, x, y, 22, '#9aa3bd');
    } else if (!type) {
      rr(ctx, x - 15, y - 15, 30, 30, 6);
      ctx.fillStyle = 'rgba(20,24,38,0.6)'; ctx.fill();
      ctx.setLineDash([4, 3]); ctx.strokeStyle = '#e8ecf8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    } else {
      rr(ctx, x - 16.5, y - 16.5, 33, 33, 7); fillStroke(ctx, 'rgba(20,24,38,0.75)', PAL[type], 2.5);
      markGlyph(ctx, type, x, y, 26);
    }
    // 指向下方怪物的小三角
    ctx.beginPath(); ctx.moveTo(x - 4, y + 16); ctx.lineTo(x + 4, y + 16); ctx.lineTo(x, y + 18); ctx.closePath();
    ctx.fillStyle = '#e8ecf8'; ctx.fill();
    ctx.restore();
  }

  function drawMagnetPulse(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var dur = num(st.dur, 0.4, 0.01, 100), t = num(st.t, 0, 0, dur);
    var R = num(st.radius, 240, 0, 240);
    var p = t / dur;
    var r = R * (1 - 0.85 * p);
    var a = p < 0.8 ? 1 : (1 - p) / 0.2;
    ctx.save();
    circle(ctx, x, y, R); ctx.fillStyle = rgba(PAL.magnet, 0.07 * a); ctx.fill();
    circle(ctx, x, y, Math.max(1, r - 3)); ctx.strokeStyle = rgba(PAL.magnet, 0.9 * a); ctx.lineWidth = 6; ctx.stroke();
    circle(ctx, x, y, Math.max(1, r - 3)); ctx.strokeStyle = rgba('#dfe6ff', 0.8 * a); ctx.lineWidth = 2; ctx.stroke();
    // 內收箭頭(和震波外推相反)
    for (var i = 0; i < 8; i++) {
      var ang = i * Math.PI / 4 + 0.2;
      var tip = Math.max(4, r - 26), base = Math.max(6, r - 10);
      var cx = Math.cos(ang), sy = Math.sin(ang), nx = -sy, ny = cx;
      ctx.beginPath();
      ctx.moveTo(x + cx * base + nx * 8, y + sy * base + ny * 8);
      ctx.lineTo(x + cx * tip, y + sy * tip);
      ctx.lineTo(x + cx * base - nx * 8, y + sy * base - ny * 8);
      ctx.strokeStyle = rgba(PAL.magnet, a); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoutePath(ctx, st) {
    st = S(st);
    var pts = Array.isArray(st.points) ? st.points : [];
    var cls = clsOf(st.cls);
    var n = Math.min(pts.length, 5000);
    var P = [];
    for (var i = 0; i < n; i++) { var q = pts[i]; if (q && isFinite(q.x) && isFinite(q.y)) P.push(q); }
    if (P.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y);
    for (i = 1; i < P.length; i++) ctx.lineTo(P[i].x, P[i].y);
    ctx.strokeStyle = 'rgba(10,14,26,0.45)'; ctx.lineWidth = 10; ctx.stroke();
    ctx.setLineDash([18, 12]);
    ctx.strokeStyle = rgba(PAL[cls], 0.85); ctx.lineWidth = 6; ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, P[0].x, P[0].y, 9); fillStroke(ctx, PAL[cls], '#ffffff', 3);
    var a = P[P.length - 1], b = P[P.length - 2], k = P.length - 2;
    while (k > 0 && Math.hypot(a.x - b.x, a.y - b.y) < 6) { k--; b = P[k]; }
    var ang = Math.atan2(a.y - b.y, a.x - b.x);
    ctx.translate(a.x, a.y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-12, -12); ctx.lineTo(-6, 0); ctx.lineTo(-12, 12); ctx.closePath();
    fillStroke(ctx, PAL[cls], '#ffffff', 2.5);
    ctx.restore();
  }

  // ---------- 玩家 ----------
  // 本體在 28x44 內; 局部座標原點 = 框中心, 面向右
  function playerBody(ctx, cls, pose, poseT) {
    var col = PAL[cls], O = PAL.outline;
    var hurt = pose === 'hurt';
    var body = hurt ? mix(col, '#ff3b3b', 0.45) : col;
    var crouch = pose === 'wave' ? 4 : 0;
    var lean = pose === 'hurt' ? -2 : (pose === 'dash' ? 2 : 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 腿
    var lA = 0, lB = 0, legH = 10;
    if (pose === 'run') { var s = Math.sin(poseT * 16); lA = s * 3; lB = -s * 3; }
    if (pose === 'rise') legH = 7;
    if (pose === 'dash') { lA = -2; lB = 2; }
    rr(ctx, -6 + lA, 21 - legH, 5, legH, 2); fillStroke(ctx, '#2c3350', O, 1.5);
    rr(ctx, 1 + lB, 21 - legH, 5, legH, 2); fillStroke(ctx, '#2c3350', O, 1.5);
    var topY = -4 + crouch;
    // 身體
    rr(ctx, -8 + lean, topY, 16, 22 - legH - topY + 1, 4); fillStroke(ctx, body, O, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-7 + lean, topY + 10, 14, 3);
    // 頭
    var hy = topY - 7;
    circle(ctx, lean, hy, 7); fillStroke(ctx, PAL.skin, O, 2);
    if (hurt) {
      line(ctx, 1 + lean, hy - 3, 5 + lean, hy + 1, O, 1.5); line(ctx, 5 + lean, hy - 3, 1 + lean, hy + 1, O, 1.5);
    } else {
      circle(ctx, 3.2 + lean, hy - 0.5, 1.4); ctx.fillStyle = O; ctx.fill();
    }
    // 頭飾
    if (cls === 'sword') {
      ctx.beginPath(); ctx.arc(lean, hy - 1, 7.5, Math.PI, 0); ctx.closePath();
      fillStroke(ctx, '#c9d4e8', O, 1.5);
      ctx.beginPath(); ctx.moveTo(-4 + lean, hy - 7); ctx.quadraticCurveTo(-1 + lean, hy - 10.5, 4 + lean, hy - 8); ctx.closePath();
      fillStroke(ctx, col, O, 1.2);
    } else if (cls === 'hunter') {
      ctx.beginPath(); ctx.moveTo(-7.5 + lean, hy + 1); ctx.quadraticCurveTo(-7 + lean, hy - 8, lean, hy - 8);
      ctx.lineTo(-8 + lean, hy - 10); ctx.lineTo(-9 + lean, hy - 3); ctx.closePath();
      fillStroke(ctx, '#167a43', O, 1.2);
      ctx.beginPath(); ctx.arc(lean, hy - 1, 7.5, Math.PI, Math.PI * 1.75); ctx.strokeStyle = '#167a43'; ctx.lineWidth = 3; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(lean, hy - 1.5, 7.5, Math.PI, 0); ctx.closePath();
      fillStroke(ctx, '#c45e12', O, 1.5);
      rr(ctx, -2 + lean, hy - 5, 9, 4, 2); fillStroke(ctx, '#bfefff', O, 1.2);
    }
    // 手 / 武器
    var ax = 8 + lean, ay = topY + 6;
    if (cls === 'sword') {
      if (pose === 'slash') {
        line(ctx, ax - 2, ay, 13, ay - 2, O, 4); line(ctx, ax - 2, ay, 13, ay - 2, '#eef4ff', 2);
      } else if (pose === 'dash') {
        line(ctx, 2, ay + 2, 14, ay + 2, O, 4); line(ctx, 2, ay + 2, 14, ay + 2, '#eef4ff', 2);
      } else {
        line(ctx, ax + 2, ay + 4, ax + 2, Math.max(-20, ay - 14), O, 4); line(ctx, ax + 2, ay + 4, ax + 2, Math.max(-20, ay - 14), '#eef4ff', 2);
        line(ctx, ax - 1, ay + 1, ax + 5, ay + 1, '#8a6a2a', 2.5);
      }
    } else if (cls === 'hunter') {
      var pull = pose === 'shoot' ? 4 : 0;
      ctx.beginPath(); ctx.arc(ax - 4, ay + 2, 8, -1.2, 1.2); ctx.strokeStyle = O; ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = '#a4733a'; ctx.lineWidth = 2; ctx.stroke();
      line(ctx, ax - 1.5, ay - 6.5, ax - 1.5 - pull, ay + 2, '#eeeeee', 1);
      line(ctx, ax - 1.5 - pull, ay + 2, ax - 1.5, ay + 10.5, '#eeeeee', 1);
      if (pose === 'shoot') line(ctx, ax - 6, ay + 2, 13, ay + 2, '#f4ead2', 1.5);
      if (pose === 'hook') line(ctx, -2, topY + 4, -3, -21, O, 3);
    } else {
      if (pose === 'throw') {
        line(ctx, ax - 3, ay, 11.5, ay - 3, body, 4);
      } else if (pose === 'wave') {
        line(ctx, -6, ay, -11, ay + 8, body, 4); line(ctx, 6, ay, 11, ay + 8, body, 4);
        line(ctx, -13, 21, 13, 21, rgba(PAL.shock, 0.9), 2);
      } else {
        circle(ctx, ax + 1, ay + 4, 4.5); fillStroke(ctx, '#2a2a33', O, 1.5);
        line(ctx, ax + 2, ay, ax + 4, ay - 3, '#c9a36a', 1.5);
      }
    }
    if (pose === 'fall') { line(ctx, -7 + lean, topY + 2, -11, topY - 5, body, 3.5); }
  }

  function drawPlayer(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var cls = clsOf(st.cls), f = st.facing === -1 ? -1 : 1;
    var pose = pick(st.pose, ['idle', 'run', 'rise', 'fall', 'slash', 'dash', 'shoot', 'hook', 'throw', 'wave', 'hurt'], 'idle');
    var poseT = num(st.poseT, 0, 0, 1e6);
    ctx.save();
    if (st.invuln) {
      var ph = Math.floor(now() * 12) % 2;
      ctx.globalAlpha = ph ? 0.3 : 0.9;
    }
    if (viewScale(ctx) < 0.3) {
      // 縮圖: 整框職業色 + 白框, 一眼找到「你」
      rr(ctx, x - 13, y - 21, 26, 42, 6);
      fillStroke(ctx, PAL[cls], '#ffffff', 5);
      ctx.restore();
      return;
    }
    ctx.translate(x, y); ctx.scale(f, 1);
    // 衝刺斬速度線: 衝刺反方向框外至多 60px
    if (pose === 'dash') {
      for (var i = 0; i < 4; i++) {
        var ly = -14 + i * 9, len = 30 + (i % 2) * 22;
        line(ctx, -14, ly, -14 - len, ly, 'rgba(220,235,255,0.75)', 3);
      }
    }
    playerBody(ctx, cls, pose, poseT);
    // 刀光: 面向側框外 50x40
    if (pose === 'slash' && poseT < 0.15) {
      var a = 1 - poseT / 0.15;
      ctx.beginPath();
      ctx.ellipse(14, 0, 48, 19, 0, -Math.PI / 2, Math.PI / 2);
      ctx.ellipse(14, 0, 26, 11, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(235,245,255,' + (0.9 * a).toFixed(3) + ')'; ctx.fill();
      ctx.strokeStyle = rgba(PAL.sword, a); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }

  function drawRangeRing(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), r = num(st.radius, 260, 1, 260);
    ctx.save();
    circle(ctx, x, y, r - 1);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = rgba(PAL.hunter, 0.55); ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---------- 怪物 ----------
  // 共用框架: 原點移到(跟班縮放後的)框底中心, 面向右; 回傳 painter
  function monsterFrame(ctx, st, w, h, fn) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var m = st.minion ? 0.75 : 1;
    var f = st.facing === -1 ? -1 : 1;
    var flung = st.state === 'flung';
    var P = painter(!!st.hit);
    ctx.save();
    ctx.translate(x, y + h * m / 2);
    ctx.scale(m, m);
    if (viewScale(ctx) < 0.3) {
      // 縮圖剪影
      ctx.translate(0, -h / 2);
      if (flung) ctx.rotate(-0.4 * f);
      ell(ctx, 0, 0, w / 2 - 3, h / 2 - 3);
      fillStroke(ctx, P(fn.tiny), PAL.outline, 6);
      ctx.restore();
      return;
    }
    if (flung) {
      // 速度線: 畫在 facing 那側框外(被打飛時面向攻擊來源、往背後飛)
      for (var i = 0; i < 3; i++) {
        var ly = -h * 0.25 - i * h * 0.25;
        line(ctx, f * (w / 2 + 4), ly, f * (w / 2 + 2 + 18 + (i % 2) * 16), ly, 'rgba(255,255,255,0.8)', 3);
      }
    }
    ctx.scale(f, 1);
    if (flung) {
      ctx.translate(0, -h / 2); ctx.rotate(-0.38); ctx.scale(0.74, 0.74); ctx.translate(0, h / 2);
    }
    fn(ctx, P, num(st.t, 0, -1e6, 1e6), st.state);
    ctx.restore();
  }

  function boarFn(ctx, P, t, s) {
    var O = PAL.outline;
    var dx = s === 'windup' ? -1.5 + Math.sin(t * 50) * 0.8 : 0;
    var headDrop = (s === 'charge' || s === 'windup') ? 3 : (s === 'stun' ? 2 : 0);
    ctx.translate(dx, 0);
    // 腿
    var sw = s === 'walk' ? Math.sin(t * 10) * 2 : (s === 'charge' ? Math.sin(t * 30) * 3 : 0);
    [[-14, sw], [-6, -sw], [5, sw], [12, -sw]].forEach(function (L) {
      rr(ctx, L[0] - 2 + L[1] * 0.5, -8, 5, 8, 1.5); fillStroke(ctx, P('#4a2814'), O, 1.5);
    });
    // 身體
    ell(ctx, -3, -16, 18, 11); fillStroke(ctx, P(PAL.boar), O, 2);
    // 鬃毛
    ctx.beginPath(); ctx.moveTo(-16, -22);
    for (var i = 0; i < 5; i++) { ctx.lineTo(-13 + i * 5, -29); ctx.lineTo(-10 + i * 5, -24); }
    ctx.closePath(); fillStroke(ctx, P('#4a2814'), O, 1.2);
    // 頭
    ell(ctx, 13, -14 + headDrop, 8, 8); fillStroke(ctx, P('#9c5832'), O, 2);
    rr(ctx, 18, -14 + headDrop, 5, 6, 2); fillStroke(ctx, P('#d08a7a'), O, 1.5);
    // 獠牙
    ctx.beginPath(); ctx.moveTo(17, -8 + headDrop); ctx.lineTo(22, -12 + headDrop); ctx.lineTo(19, -6 + headDrop); ctx.closePath();
    fillStroke(ctx, '#fffaf0', O, 1);
    // 耳
    ctx.beginPath(); ctx.moveTo(8, -20 + headDrop); ctx.lineTo(10, -27 + headDrop); ctx.lineTo(13, -21 + headDrop); ctx.closePath();
    fillStroke(ctx, P('#7a3e1e'), O, 1.2);
    // 眼
    if (s === 'stun') {
      line(ctx, 12, -18, 16, -14, O, 1.5); line(ctx, 16, -18, 12, -14, O, 1.5);
    } else {
      circle(ctx, 14, -17 + headDrop, s === 'windup' || s === 'charge' ? 2.2 : 1.6);
      ctx.fillStyle = (s === 'windup' || s === 'charge') ? '#ff2a2a' : O; ctx.fill();
    }
    if (s === 'windup') {
      // 後腳刨土
      ctx.fillStyle = 'rgba(200,170,130,0.8)';
      circle(ctx, -16, -4, 3); ctx.fill(); circle(ctx, -11, -2, 2.5); ctx.fill();
      // 鼻孔噴氣
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      circle(ctx, 22, -20, 2); ctx.fill();
    }
    if (s === 'charge') {
      for (var k = 0; k < 3; k++) line(ctx, -23, -22 + k * 6, -23 + 6, -22 + k * 6, 'rgba(255,255,255,0.8)', 2);
    }
    if (s === 'stun') {
      for (var j = 0; j < 3; j++) {
        var a = t * 4 + j * Math.PI * 2 / 3;
        star(ctx, Math.cos(a) * 14, -42 + Math.sin(a) * 4, 5, 5, 2.2, 0);
        fillStroke(ctx, '#ffe14a', O, 1);
      }
    }
  }
  boarFn.tiny = PAL.boar;
  function drawBoar(ctx, st) {
    st = S(st);
    var s = pick(st.state, ['walk', 'windup', 'charge', 'stun', 'flung'], 'walk');
    var st2 = {}; for (var k in st) st2[k] = st[k]; st2.state = s;
    monsterFrame(ctx, st2, 48, 32, boarFn);
  }

  function shieldFn(ctx, P, t, s) {
    var O = PAL.outline;
    var sw = s === 'walk' ? Math.sin(t * 8) * 2 : 0;
    rr(ctx, -8 + sw, -11, 5, 11, 2); fillStroke(ctx, P('#3a4152'), O, 1.5);
    rr(ctx, -1 - sw, -11, 5, 11, 2); fillStroke(ctx, P('#3a4152'), O, 1.5);
    rr(ctx, -10, -30, 16, 21, 4); fillStroke(ctx, P(PAL.shield), O, 2);
    ctx.fillStyle = P('#5c6676'); ctx.fillRect(-9, -20, 14, 3);
    // 頭盔
    ell(ctx, -2, -35, 7, 7); fillStroke(ctx, P('#9aa6b6'), O, 2);
    ctx.fillStyle = O; ctx.fillRect(-1, -36, 7, 2);
    line(ctx, -2, -41, -2, -43, P('#c84040'), 2);
    // 盾(面向側)
    var block = s === 'block';
    rr(ctx, 5, -38, 9, 33, 4);
    fillStroke(ctx, block ? '#ffffff' : P(PAL.shieldPlate), O, 2.5);
    ctx.fillStyle = block ? PAL.select : P('#6a7fa3');
    ctx.beginPath(); ctx.moveTo(10, -30); ctx.lineTo(13, -22); ctx.lineTo(10, -14); ctx.lineTo(7, -22); ctx.closePath(); ctx.fill();
    if (block) {
      line(ctx, 8, -36, 14, -40 + 3, PAL.select, 2);
      line(ctx, 9, -8, 14, -6, PAL.select, 2);
    }
  }
  shieldFn.tiny = PAL.shieldPlate;
  function drawShieldman(ctx, st) {
    st = S(st);
    var s = pick(st.state, ['walk', 'block', 'flung'], 'walk');
    var st2 = {}; for (var k in st) st2[k] = st[k]; st2.state = s;
    monsterFrame(ctx, st2, 32, 44, shieldFn);
  }

  function beeFn(ctx, P, t, s) {
    var O = PAL.outline, aim = s === 'aim';
    var cy = -16;
    // 翅膀
    var fl = 2 + Math.abs(Math.sin(t * 30)) * 3;
    ell(ctx, -4, cy - 9, 6, fl); fillStroke(ctx, 'rgba(235,245,255,0.8)', O, 1.2);
    ell(ctx, 3, cy - 9, 5, fl * 0.85); fillStroke(ctx, 'rgba(235,245,255,0.8)', O, 1.2);
    // 毒針(背後)
    ctx.beginPath(); ctx.moveTo(-11, cy - 2); ctx.lineTo(-15, cy + 1); ctx.lineTo(-11, cy + 3); ctx.closePath(); fillStroke(ctx, O, O, 1);
    // 身體
    ell(ctx, -2, cy, 10, 8); fillStroke(ctx, P(PAL.bee), O, 2);
    ctx.fillStyle = aim ? PAL.beeShot : P('#2a2230');
    ctx.fillRect(-6, cy - 7, 3, 14); ctx.fillRect(-1, cy - 7.5, 3, 15);
    // 頭
    circle(ctx, 9, cy, 5); fillStroke(ctx, P('#3a3040'), O, 1.5);
    circle(ctx, 10.5, cy - 1.5, 1.6); ctx.fillStyle = aim ? '#ff6a6a' : '#ffffff'; ctx.fill();
    if (aim) {
      // 前方蓄能紅點(和蜂彈同色)
      var k = (Math.sin(t * 25) + 1) / 2;
      circle(ctx, 12, cy + 4, 2.2 + k);
      fillStroke(ctx, PAL.beeShot, O, 1);
    }
  }
  beeFn.tiny = PAL.bee;
  function drawShooterBee(ctx, st) {
    st = S(st);
    var s = pick(st.state, ['fly', 'aim', 'flung'], 'fly');
    var st2 = {}; for (var k in st) st2[k] = st[k]; st2.state = s;
    monsterFrame(ctx, st2, 32, 32, beeFn);
  }

  function frogFn(ctx, P, t, s) {
    var O = PAL.outline;
    if (s === 'jump') {
      // 伸展的後腿
      line(ctx, -5, -10, -10, -2.5, O, 5); line(ctx, -5, -10, -10, -2.5, P('#6aa83a'), 3);
      line(ctx, 3, -10, 6, -2.5, O, 5); line(ctx, 3, -10, 6, -2.5, P('#6aa83a'), 3);
      ell(ctx, 0, -16, 10, 10); fillStroke(ctx, P(PAL.frog), O, 2);
      ell(ctx, 2, -12, 6, 5); ctx.fillStyle = P('#e4f5b0'); ctx.fill();
      circle(ctx, 5, -24, 3.5); fillStroke(ctx, '#ffffff', O, 1.5);
      circle(ctx, 6, -24, 1.5); ctx.fillStyle = O; ctx.fill();
      line(ctx, 8, -14, 13, -18, P('#6aa83a'), 3);
    } else {
      // 蹲
      ell(ctx, -9, -4, 6, 4); fillStroke(ctx, P('#6aa83a'), O, 1.5);
      ell(ctx, 9, -4, 6, 4); fillStroke(ctx, P('#6aa83a'), O, 1.5);
      ell(ctx, 0, -9, 14, 8); fillStroke(ctx, P(PAL.frog), O, 2);
      ell(ctx, 3, -6, 8, 3.5); ctx.fillStyle = P('#e4f5b0'); ctx.fill();
      circle(ctx, -3, -17, 3.5); fillStroke(ctx, P(PAL.frog), O, 1.5);
      circle(ctx, 6, -17, 4); fillStroke(ctx, '#ffffff', O, 1.5);
      circle(ctx, 7, -17, 1.8); ctx.fillStyle = O; ctx.fill();
      line(ctx, 6, -7, 12, -7, O, 1.2);
    }
  }
  frogFn.tiny = PAL.frog;
  function drawFrog(ctx, st) {
    st = S(st);
    var s = pick(st.state, ['crouch', 'jump', 'flung'], 'crouch');
    var st2 = {}; for (var k in st) st2[k] = st[k]; st2.state = s;
    monsterFrame(ctx, st2, 32, 28, frogFn);
  }

  // ---------- 飛行物 ----------
  function drawBeeShot(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    ctx.save();
    star(ctx, x, y, 4, 6, 3.6, Math.PI / 4); ctx.fillStyle = PAL.outline; ctx.fill();
    circle(ctx, x, y, 4.2); fillStroke(ctx, PAL.beeShot, PAL.outline, 1.2);
    circle(ctx, x - 1, y - 1, 1.3); ctx.fillStyle = '#ffd0d8'; ctx.fill();
    ctx.restore();
  }
  function drawArrow(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), a = num(st.angle, 0, -100, 100);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    line(ctx, -10, 0, 6, 0, PAL.outline, 3);
    line(ctx, -10, 0, 6, 0, '#f4ead2', 1.6);
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.closePath(); fillStroke(ctx, '#ffffff', PAL.outline, 1);
    ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-7, 0); ctx.lineTo(-12, 3); ctx.closePath(); ctx.fillStyle = PAL.hunter; ctx.fill();
    ctx.restore();
  }
  function drawBomb(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), t = num(st.t, 0, -1e6, 1e6);
    ctx.save();
    circle(ctx, x - 1, y + 1.5, 5.5); fillStroke(ctx, '#2a2a33', PAL.outline, 1.5);
    circle(ctx, x - 3, y - 0.5, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    line(ctx, x + 2, y - 3, x + 4.5, y - 5.5, '#c9a36a', 1.5);
    var k = Math.floor(t * 20) % 2;
    star(ctx, x + 5, y - 5.5, 4, k ? 2.5 : 2, 0.8, k ? 0.4 : 0); ctx.fillStyle = '#ffe14a'; ctx.fill();
    ctx.restore();
  }

  // ---------- 特效 ----------
  function easeOut(p) { return 1 - (1 - p) * (1 - p); }
  function drawExplosion(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var R = num(st.radius, 60, 1, 140), dur = num(st.dur, 0.25, 0.01, 100), t = num(st.t, 0, 0, dur);
    var p = t / dur, r = R * (0.35 + 0.65 * easeOut(p)), a = 1 - p * p;
    ctx.save();
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,250,210,' + a + ')');
    g.addColorStop(0.45, 'rgba(255,200,60,' + a + ')');
    g.addColorStop(0.8, rgba(PAL.explosion, a * 0.9));
    g.addColorStop(1, 'rgba(200,40,20,' + a * 0.6 + ')');
    circle(ctx, x, y, r); ctx.fillStyle = g; ctx.fill();
    // 火舌
    star(ctx, x, y, 9, r, r * 0.72, p * 0.6); ctx.fillStyle = rgba(PAL.explosion, a * 0.45); ctx.fill();
    if (R >= 100) {
      // 爆裂印: 外緣帶印記色
      circle(ctx, x, y, Math.max(1, r - 3)); ctx.strokeStyle = rgba(PAL.blast, a); ctx.lineWidth = 6; ctx.stroke();
    }
    ctx.restore();
  }
  function drawShockwave(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var R = num(st.radius, 130, 1, 130), dur = num(st.dur, 0.3, 0.01, 100), t = num(st.t, 0, 0, dur);
    var p = t / dur, r = Math.max(6, R * easeOut(Math.min(1, p * 1.15))), a = 1 - p;
    var lw = 7 - 4 * p;
    ctx.save();
    circle(ctx, x, y, r); ctx.fillStyle = rgba(PAL.shock, 0.08 * a); ctx.fill();
    circle(ctx, x, y, Math.max(1, r - lw / 2)); ctx.strokeStyle = rgba(PAL.shock, a); ctx.lineWidth = lw; ctx.stroke();
    // 外推箭頭
    for (var i = 0; i < 8; i++) {
      var ang = i * Math.PI / 4;
      var tip = r - lw, base = Math.max(0, tip - 14);
      var cx = Math.cos(ang), sy = Math.sin(ang), nx = -sy, ny = cx;
      ctx.beginPath();
      ctx.moveTo(x + cx * base + nx * 7, y + sy * base + ny * 7);
      ctx.lineTo(x + cx * tip, y + sy * tip);
      ctx.lineTo(x + cx * base - nx * 7, y + sy * base - ny * 7);
      ctx.strokeStyle = rgba('#ffffff', a); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  }
  function drawPoof(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var dur = num(st.dur, 0.3, 0.01, 100), t = num(st.t, 0, 0, dur), p = t / dur;
    var a = 1 - p;
    ctx.save();
    for (var i = 0; i < 6; i++) {
      var ang = i * Math.PI / 3 + 0.3, d = 4 + 10 * easeOut(p), r = 5 + 5 * p;
      circle(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, r);
      ctx.fillStyle = rgba(PAL.poof, 0.85 * a); ctx.fill();
    }
    circle(ctx, x, y, 7 * (1 - p) + 1); ctx.fillStyle = rgba('#ffffff', a); ctx.fill();
    ctx.restore();
  }

  function drawPopup(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var dur = num(st.dur, 0.8, 0.01, 100), t = num(st.t, 0, 0, dur), p = t / dur;
    var kind = kindOf(st.kind), v = Math.round(num(st.value, 1, 0, 99));
    var a = p < 0.6 ? 1 : (1 - p) / 0.4;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    var yy = y - 30 * easeOut(p);
    matIcon(ctx, kind, x - 14, yy, 18);
    text(ctx, '+' + v, x - 2, yy, 18, mix(PAL[kind], '#ffffff', 0.35), 'left', true, PAL.outline);
    ctx.restore();
  }
  function drawChainText(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var dur = num(st.dur, 0.8, 0.01, 100), t = num(st.t, 0, 0, dur), p = t / dur;
    var n = Math.round(num(st.n, 2, 0, 999));
    var sc = p < 0.12 ? 1 + 0.3 * (p / 0.12) : (p < 0.35 ? 1.3 - 0.3 * ((p - 0.12) / 0.23) : 1);
    var a = p < 0.7 ? 1 : (1 - p) / 0.3;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(x, y - 30 * easeOut(p)); ctx.scale(sc, sc);
    text(ctx, n + ' 連鎖', 0, 0, 26, PAL.gold, 'center', true, PAL.outline);
    ctx.restore();
  }

  function drawItemIcon(ctx, st) {
    st = S(st);
    ctx.save();
    markGlyph(ctx, st.type, num(st.x, 0), num(st.y, 0), 32);
    ctx.restore();
  }
  function drawItemNotice(ctx, st) {
    st = S(st);
    var type = mark(st.type) || 'blast';
    var dur = num(st.dur, 1.5, 0.01, 100), t = num(st.t, 0, 0, dur);
    var a = t < 0.2 ? t / 0.2 : (t > dur - 0.3 ? Math.max(0, (dur - t) / 0.3) : 1);
    ctx.save();
    ctx.globalAlpha = a;
    var x = 440, y = 52;
    rr(ctx, x + 1.5, y + 1.5, 397, 41, 10); ctx.fillStyle = 'rgba(16,20,34,0.9)'; ctx.fill();
    ctx.strokeStyle = PAL[type]; ctx.lineWidth = 2.5; ctx.stroke();
    var w1 = tw(ctx, '獲得 ', 20, true), w2 = tw(ctx, NAME[type], 20, true);
    var total = 32 + 10 + w1 + w2, sx = x + 200 - total / 2;
    markGlyph(ctx, type, sx + 16, y + 22, 32);
    text(ctx, '獲得 ', sx + 42, y + 22, 20, PAL.text, 'left', true);
    text(ctx, NAME[type], sx + 42 + w1, y + 22, 20, mix(PAL[type], '#ffffff', 0.25), 'left', true);
    ctx.restore();
  }

  // ---------- 大地圖 ----------
  function drawMapLink(ctx, st) {
    st = S(st);
    var x1 = num(st.x1, 0), y1 = num(st.y1, 0), x2 = num(st.x2, 0), y2 = num(st.y2, 0);
    var mx = (x1 + x2) / 2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    if (st.lit) {
      ctx.strokeStyle = 'rgba(255,210,58,0.25)'; ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = PAL.linkLit; ctx.lineWidth = 4; ctx.stroke();
    } else {
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = PAL.linkDark; ctx.lineWidth = 3; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawLevelCard(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var idx = Math.round(num(st.index, 1, 0, 99));
    var name = typeof st.name === 'string' ? st.name : '';
    var s = pick(st.state, ['sealed', 'buyable', 'open', 'cleared'], 'sealed');
    ctx.save();
    rr(ctx, x + 1, y + 1, 174, 134, 10);
    ctx.fillStyle = s === 'cleared' ? '#26324e' : '#212a42'; ctx.fill();
    ctx.strokeStyle = s === 'cleared' ? '#5f7bb0' : PAL.panelEdge; ctx.lineWidth = 2; ctx.stroke();
    // 縮圖區
    ctx.fillStyle = '#0e1422'; ctx.fillRect(x + 8, y + 8, 160, 90);
    if (s === 'sealed' || s === 'buyable') {
      var ok = s === 'buyable' && st.canAfford !== false;
      if (s === 'buyable') {
        ctx.fillStyle = 'rgba(255,210,58,0.08)'; ctx.fillRect(x + 8, y + 8, 160, 90);
      }
      lockIcon(ctx, x + 88, y + 40, 34, s === 'sealed' ? '#5a6280' : (ok ? PAL.gold : '#b0a070'));
      costRow(ctx, st.cost, x + 88, y + 80, 15, s === 'buyable' ? !ok : false);
    }
    // 文字區
    var nameCol = s === 'sealed' ? PAL.textDim : PAL.text;
    text(ctx, idx + ' ' + name, x + 10, y + 114, 15, nameCol, 'left', true);
    if (s === 'cleared') {
      var rt = st.recordTime;
      text(ctx, fmt1(rt) + '秒', x + 168, y + 114, 13, PAL.text, 'right', true);
      var tws = tw(ctx, fmt1(rt) + '秒', 13, true);
      clsIcon(ctx, st.recordCls, x + 168 - tws - 11, y + 114, 16);
      var r = trio(st.rates);
      KINDS.forEach(function (k, i) {
        var gx = x + 10 + i * 54;
        matIcon(ctx, k, gx + 6, y + 129, 12);
        text(ctx, fmt1(r[k]), gx + 15, y + 129, 12, PAL.text, 'left', true);
      });
    } else if (s === 'open') {
      text(ctx, '未過關', x + 10, y + 129, 12, PAL.textDim, 'left', false);
    } else if (s === 'buyable') {
      var ok2 = st.canAfford !== false;
      text(ctx, ok2 ? '可解鎖' : '可解鎖 · 木材不足', x + 10, y + 129, 12, ok2 ? PAL.ok : '#d0a060', 'left', true);
    } else {
      text(ctx, '封鎖 · 先通過前一關', x + 10, y + 129, 12, PAL.textDim, 'left', false);
    }
    if (s === 'sealed') {
      rr(ctx, x, y, 176, 136, 10); ctx.fillStyle = 'rgba(6,9,18,0.45)'; ctx.fill();
    }
    ctx.restore();
  }

  function drawCardOverlay(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var lv = Math.round(num(st.accelLv, 0, 0, 2));
    ctx.save();
    ctx.strokeStyle = '#9fb0d0'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 8, 160, 90);
    if (lv > 0) {
      var label = lv === 1 ? '×1.25' : '×1.5';
      var w = tw(ctx, label, 12, true) + 10;
      rr(ctx, x + 11, y + 11, w, 17, 4); fillStroke(ctx, PAL.time, PAL.outline, 1.5);
      text(ctx, label, x + 11 + w / 2, y + 19.5, 12, '#06222a', 'center', true);
    }
    if (st.pending) {
      var w2 = tw(ctx, '重跑生效', 11, true) + 18;
      var bx = x + 165 - w2;
      rr(ctx, bx, y + 11, w2, 17, 4); fillStroke(ctx, PAL.pending, PAL.outline, 1.5);
      // 循環箭頭小符號
      ctx.beginPath(); ctx.arc(bx + 8, y + 19.5, 3.5, 0.3, Math.PI * 1.7);
      ctx.strokeStyle = '#2a1400'; ctx.lineWidth = 1.5; ctx.stroke();
      text(ctx, '重跑生效', bx + 14, y + 19.5, 11, '#2a1400', 'left', true);
    }
    if (st.selected) {
      var p = (Math.sin(now() * 6) + 1) / 2;
      rr(ctx, x - 4, y - 4, 184, 144, 13);
      ctx.strokeStyle = 'rgba(255,224,102,' + (0.75 + 0.25 * p).toFixed(2) + ')'; ctx.lineWidth = 3.5; ctx.stroke();
    }
    ctx.restore();
  }

  function archShape(ctx, cx, by, w, h, col) {
    var O = PAL.outline;
    rr(ctx, cx - w / 2, by - h, w, h, 3); fillStroke(ctx, col, O, 2);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.22, by);
    ctx.lineTo(cx - w * 0.22, by - h * 0.45);
    ctx.arc(cx, by - h * 0.45, w * 0.22, Math.PI, 0);
    ctx.lineTo(cx + w * 0.22, by);
    ctx.closePath();
    fillStroke(ctx, '#151b2c', O, 2);
    rr(ctx, cx - w / 2 - 4, by - h - 6, w + 8, 8, 2); fillStroke(ctx, mix(col, '#ffffff', 0.2), O, 2);
    star(ctx, cx, by - h - 12, 5, 6, 2.6, 0); fillStroke(ctx, PAL.gold, O, 1.2);
  }

  function drawGoalCard(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0);
    var ca = st.canAfford;
    var all = typeof ca === 'object' && ca ? (ca.wood !== false && ca.ench !== false && ca.time !== false) : !!ca;
    var bad = typeof ca === 'object' && ca ? { wood: ca.wood === false, ench: ca.ench === false, time: ca.time === false } : !all;
    ctx.save();
    rr(ctx, x + 1.5, y + 1.5, 197, 133, 10);
    ctx.fillStyle = all ? '#3a3220' : '#232a40'; ctx.fill();
    ctx.strokeStyle = all ? PAL.gold : '#7a6a3a'; ctx.lineWidth = 2.5; ctx.stroke();
    if (all) {
      circle(ctx, x + 100, y + 44, 40); ctx.fillStyle = 'rgba(255,210,58,0.18)'; ctx.fill();
    }
    archShape(ctx, x + 100, y + 76, 84, 50, all ? '#e8c860' : '#a99a70');
    text(ctx, '凱旋門', x + 100, y + 92, 16, all ? PAL.gold : PAL.text, 'center', true);
    costRow(ctx, st.cost, x + 100, y + 116, 14, bad);
    if (st.selected) {
      var p = (Math.sin(now() * 6) + 1) / 2;
      rr(ctx, x - 4, y - 4, 208, 144, 13);
      ctx.strokeStyle = 'rgba(255,224,102,' + (0.75 + 0.25 * p).toFixed(2) + ')'; ctx.lineWidth = 3.5; ctx.stroke();
    }
    ctx.restore();
  }

  var HUD_ICON = { wood: [36, 20], ench: [256, 20], time: [476, 20] };
  function drawFlyingMaterial(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), kind = kindOf(st.kind);
    var dur = num(st.dur, 0.7, 0.01, 100), t = num(st.t, 0, 0, dur);
    var tg = HUD_ICON[kind];
    var dx = tg[0] - x, dy = tg[1] - y, d = Math.hypot(dx, dy) || 1;
    var ux = -dx / d, uy = -dy / d;
    var len = Math.min(24, d * 0.5) * (t < 0.05 ? t / 0.05 : 1);
    ctx.save();
    if (len > 1) {
      var g = ctx.createLinearGradient(x, y, x + ux * (10 + len), y + uy * (10 + len));
      g.addColorStop(0, rgba(PAL[kind], 0.8)); g.addColorStop(1, rgba(PAL[kind], 0));
      line(ctx, x + ux * 6, y + uy * 6, x + ux * (7 + len), y + uy * (7 + len), g, 6);
    }
    circle(ctx, x, y, 10); ctx.fillStyle = rgba('#ffffff', 0.25); ctx.fill();
    matIcon(ctx, kind, x, y, 17);
    ctx.restore();
  }

  // ---------- 怪物小圖示(面板用, 共用遊戲內畫法) ----------
  var MONFN = { boar: [drawBoar, 48, 32, 'walk'], shield: [drawShieldman, 32, 44, 'walk'], bee: [drawShooterBee, 32, 32, 'fly'], frog: [drawFrog, 32, 28, 'crouch'] };
  function monsterMini(ctx, mon, cx, cy, s) {
    var d = MONFN[pick(mon, MONSTERS, 'boar')];
    var k = s / Math.max(d[1], d[2]);
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(k, k);
    d[0](ctx, { x: 0, y: 0, facing: 1, state: d[3], hit: false, minion: false, t: 0 });
    ctx.restore();
  }

  // ---------- 關卡面板 ----------
  function rowBox(ctx, x, y, w, h, title, active) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = active ? '#28355a' : '#222b44'; ctx.fill();
    ctx.strokeStyle = active ? PAL.select : '#3c4a6c'; ctx.lineWidth = active ? 3 : 1.5; ctx.stroke();
    text(ctx, title, x + 12, y + 14, 14, active ? PAL.select : PAL.textDim, 'left', true);
  }
  function slotCell(ctx, x, y, item, hl) {
    // 背包一格 74x74
    rr(ctx, x, y, 74, 74, 8);
    if (!item) {
      ctx.fillStyle = 'rgba(14,18,30,0.6)'; ctx.fill();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#3f4a68'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    ctx.fillStyle = '#16203a'; ctx.fill();
    ctx.strokeStyle = hl ? PAL.select : '#4a5a82'; ctx.lineWidth = hl ? 3 : 1.5; ctx.stroke();
    var type = mark(item.type) || 'blast';
    markGlyph(ctx, type, x + 37, y + 30, 34);
    var w = item.where;
    var label = (w && typeof w === 'object') ? ('第' + Math.round(num(w.level, 1)) + '關 ' + Math.round(num(w.slot, 1)) + '號') : '未裝';
    text(ctx, label, x + 37, y + 62, 12, (w && typeof w === 'object') ? PAL.text : PAL.textDim, 'center', true);
  }

  function drawLevelPanel(ctx, st) {
    st = S(st);
    var idx = Math.round(num(st.index, 1, 0, 99));
    var name = typeof st.name === 'string' ? st.name : '';
    var row = Math.round(num(st.row, 0, 0, 2));
    var classes = Array.isArray(st.classes) ? st.classes : [];
    var clsSel = Math.round(num(st.clsSel, 0, 0, 2));
    var slots = Array.isArray(st.slots) ? st.slots : [];
    var slotSel = Math.round(num(st.slotSel, 0, 0, 3));
    var items = Array.isArray(st.items) ? st.items.slice(0, 8) : [];
    var lv = Math.round(num(st.accelLv, 0, 0, 2));
    ctx.save();
    var hole = [60, 96, 640, 360];
    dim(ctx, 0.6, hole);
    // 面板(挖空預覽區, 不論 RD 先畫或後畫預覽都不被蓋)
    ctx.beginPath();
    ctx.rect(40, 48, 1200, 640);
    ctx.rect(hole[0], hole[1], hole[2], hole[3]);
    ctx.fillStyle = PAL.panel; ctx.fill('evenodd');
    rr(ctx, 41, 49, 1198, 638, 14); ctx.strokeStyle = PAL.panelEdge; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, '第 ' + idx + ' 關  ' + name, 60, 74, 22, PAL.text, 'left', true);
    ctx.strokeStyle = '#6a7aa0'; ctx.lineWidth = 2; ctx.strokeRect(59, 95, 642, 362);

    // 背包
    text(ctx, '印記背包', 694, 468, 12, PAL.textDim, 'right', true);
    var curSlot = slots[slotSel];
    for (var i = 0; i < 8; i++) {
      var it = items[i];
      var hl = !!(it && it.where && Math.round(num(it.where.level, -1)) === idx && Math.round(num(it.where.slot, -1)) === slotSel + 1);
      slotCell(ctx, 60 + i * 80, 476, it && typeof it === 'object' ? it : null, hl && row === 1);
    }

    // 職業列
    rowBox(ctx, 720, 96, 480, 150, '職業', row === 0);
    for (i = 0; i < 3; i++) {
      var c = S(classes[i]);
      var cls = clsOf(c.cls || CLASSES[i]);
      var cx = 727 + i * 158, cy = 116;
      var sel = clsSel === i, owned = !!c.owned;
      rr(ctx, cx, cy, 150, 122, 8);
      ctx.fillStyle = sel ? '#33426a' : '#1a2238'; ctx.fill();
      ctx.strokeStyle = sel ? (row === 0 ? PAL.select : '#c8d0e8') : '#3a4666'; ctx.lineWidth = sel ? 3 : 1.5; ctx.stroke();
      ctx.save();
      if (!owned) ctx.globalAlpha = 0.45;
      ctx.translate(cx + 75, cy + 36); ctx.scale(1.15, 1.15);
      drawPlayer(ctx, { x: 0, y: 0, cls: cls, facing: 1, pose: 'idle', poseT: 0, invuln: false });
      ctx.restore();
      if (!owned) lockIcon(ctx, cx + 128, cy + 18, 18, '#9aa3bd');
      text(ctx, CLSNAME[cls], cx + 75, cy + 72, 16, owned ? PAL.text : PAL.textDim, 'center', true);
      text(ctx, '擅長 ' + CLSGOOD[cls], cx + 75, cy + 90, 12, PAL.textDim, 'center', false);
      if (!owned) {
        var aff = c.canAfford !== false;
        var cw = costRow(ctx, c.cost, cx + 45, cy + 108, 13, !aff);
        keyHints(ctx, [['Z', '招募', !aff]], cx + 110, cy + 108, 20, 12);
      } else if (sel) {
        keyHints(ctx, [['Z', '出發']], cx + 75, cy + 108, 20, 14);
      }
    }

    // 印位列
    rowBox(ctx, 720, 262, 480, 190, '印位', row === 1);
    for (i = 0; i < 4; i++) {
      var sl = S(slots[i]);
      var sx = 728 + i * 117, sy = 284;
      var ss = slotSel === i;
      rr(ctx, sx, sy, 110, 62, 8);
      ctx.fillStyle = ss ? '#33426a' : '#1a2238'; ctx.fill();
      ctx.strokeStyle = ss ? (row === 1 ? PAL.select : '#c8d0e8') : '#3a4666'; ctx.lineWidth = ss ? 3 : 1.5; ctx.stroke();
      text(ctx, (i + 1) + '號', sx + 6, sy + 10, 11, PAL.textDim, 'left', true);
      monsterMini(ctx, sl.monster, sx + 32, sy + 36, 34);
      var tp = mark(sl.type);
      if (sl.sealed) lockIcon(ctx, sx + 80, sy + 33, 26, '#8a93ad');
      else if (tp) markGlyph(ctx, tp, sx + 80, sy + 33, 30);
      else {
        circle(ctx, sx + 80, sy + 33, 13);
        ctx.setLineDash([3, 3]); ctx.strokeStyle = '#c8d0e8'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    var cs = S(curSlot);
    var dy = 372;
    if (cs.sealed) {
      lockIcon(ctx, 752, dy + 12, 30, '#8a93ad');
      text(ctx, (slotSel + 1) + '號 封印中', 776, dy, 16, PAL.text, 'left', true);
      text(ctx, '解封', 776, dy + 26, 14, PAL.textDim, 'left', true);
      var affU = st.canAffordUnseal !== false;
      matIcon(ctx, 'ench', 820, dy + 26, 16);
      text(ctx, int(st.unsealCost), 832, dy + 26, 15, affU ? PAL.text : PAL.bad, 'left', true, PAL.outline);
      keyHints(ctx, [['Z', '解封', !affU]], 1130, dy + 13, 24, 15);
    } else {
      var ct = mark(cs.type);
      if (ct) {
        markGlyph(ctx, ct, 756, dy + 12, 36);
        text(ctx, NAME[ct], 784, dy, 17, mix(PAL[ct], '#ffffff', 0.3), 'left', true);
        text(ctx, EFFECT[ct], 784, dy + 24, 14, PAL.text, 'left', false);
      } else {
        circle(ctx, 756, dy + 12, 16);
        ctx.setLineDash([4, 3]); ctx.strokeStyle = '#c8d0e8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        text(ctx, '空', 784, dy + 12, 17, PAL.textDim, 'left', true);
      }
      keyHints(ctx, [['Z', '換印記']], 1130, dy + 13, 24, 15);
    }
    if (st.pending) {
      rr(ctx, 732, 422, 456, 24, 6); ctx.fillStyle = 'rgba(255,154,42,0.16)'; ctx.fill();
      ctx.beginPath(); ctx.arc(748, 434, 6, 0.3, Math.PI * 1.7); ctx.strokeStyle = PAL.pending; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, '下一趟進關才生效', 762, 434, 14, PAL.pending, 'left', true);
    }

    // 加速器列
    rowBox(ctx, 720, 468, 480, 90, '回放加速器', row === 2);
    var mult = ['×1', '×1.25', '×1.5'];
    text(ctx, '目前', 734, 524, 13, PAL.textDim, 'left', true);
    text(ctx, mult[lv], 770, 524, 24, PAL.time, 'left', true);
    if (st.accelCost === null || st.accelCost === undefined || lv >= 2) {
      text(ctx, '已滿', 1185, 524, 16, PAL.textDim, 'right', true);
    } else {
      var affA = st.canAffordAccel !== false;
      text(ctx, '下一級 ' + mult[lv + 1], 880, 524, 15, PAL.text, 'left', true);
      matIcon(ctx, 'time', 990, 524, 16);
      text(ctx, int(st.accelCost), 1002, 524, 15, affA ? PAL.text : PAL.bad, 'left', true, PAL.outline);
      keyHints(ctx, [['Z', '購買', !affA]], 1130, 524, 24, 15);
    }

    // 回放資訊
    rr(ctx, 720, 574, 480, 80, 10); ctx.fillStyle = '#1a2238'; ctx.fill();
    text(ctx, '目前回放', 734, 590, 13, PAL.textDim, 'left', true);
    if (st.recordCls && st.recordTime !== null && st.recordTime !== undefined) {
      clsIcon(ctx, st.recordCls, 746, 626, 24);
      text(ctx, fmt1(st.recordTime) + ' 秒', 764, 626, 18, PAL.text, 'left', true);
      var rates = trio(st.rates);
      text(ctx, '每分', 868, 626, 12, PAL.textDim, 'left', true);
      KINDS.forEach(function (k, j) {
        var gx = 904 + j * 96;
        matIcon(ctx, k, gx + 8, 626, 16);
        text(ctx, fmt1(rates[k]), gx + 20, 626, 16, PAL.text, 'left', true);
      });
    } else {
      text(ctx, '尚無回放', 960, 626, 16, PAL.textDim, 'center', true);
    }

    // 提示列
    keyHints(ctx, [['↑↓', '換列'], ['←→', '選擇'], ['Z', '確定'], ['X', '關閉']], 380, 676, 22, 14);
    ctx.restore();
  }

  function drawSlotCursor(ctx, st) {
    st = S(st);
    var x = num(st.x, 0), y = num(st.y, 0), act = !!st.active;
    var p = act ? (Math.sin(now() * 7) + 1) / 2 : 0;
    var h = 28 + 5 * p, L = 12;
    ctx.save();
    ctx.strokeStyle = act ? PAL.select : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = act ? 4 : 2; ctx.lineCap = 'round';
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(x + s[0] * h, y + s[1] * (h - L));
      ctx.lineTo(x + s[0] * h, y + s[1] * h);
      ctx.lineTo(x + s[0] * (h - L), y + s[1] * h);
      ctx.stroke();
    });
    ctx.restore();
  }

  // ---------- HUD ----------
  function hudCell(ctx, kind, cx0, stockStr, rate, bumpK, use) {
    var ic = HUD_ICON[kind];
    matIcon(ctx, kind, ic[0] - 16 + cx0, ic[1], 22);
    var sx = cx0 + 38;
    ctx.save();
    var sc = 1 + 0.3 * bumpK;
    ctx.translate(sx, 20); ctx.scale(sc, sc);
    text(ctx, stockStr, 0, 0, 19, bumpK > 0 ? mix(PAL.text, PAL[kind], 0.4) : PAL.text, 'left', true);
    ctx.restore();
    if (rate !== null) text(ctx, '+' + rate + '/分', cx0 + 104, 20, 13, mix(PAL[kind], '#ffffff', 0.35), 'left', true);
    if (use) text(ctx, use, cx0 + 216, 20, 12, PAL.textDim, 'right', false);
  }
  function drawHud(ctx, st) {
    st = S(st);
    var stock = trio(st.stock), rpm = trio(st.ratePerMin), bt = S(st.bumpT);
    var bd = num(st.bumpDur, 0.15, 0, 100);
    ctx.save();
    ctx.fillStyle = PAL.hudBg; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(120,140,200,0.35)'; ctx.fillRect(0, 39, W, 1);
    var x0 = { wood: 16, ench: 236, time: 456 };
    KINDS.forEach(function (k) {
      var b = num(bt[k], bd, 0, 1e6);
      var bk = bd > 0 ? Math.max(0, Math.min(1, 1 - b / bd)) : 0;
      hudCell(ctx, k, x0[k], int(stock[k]), fmt1(rpm[k]), bk, MATUSE[k]);
    });
    if (st.mode === 'level') {
      ctx.fillStyle = 'rgba(120,140,200,0.25)'; ctx.fillRect(690, 6, 1, 28);
      // 秒數
      circle(ctx, 714, 20, 8); ctx.strokeStyle = PAL.text; ctx.lineWidth = 2; ctx.stroke();
      line(ctx, 714, 20, 714, 15, PAL.text, 2); line(ctx, 714, 20, 718, 20, PAL.text, 2);
      text(ctx, fmt1(st.time) + ' 秒', 728, 20, 17, PAL.text, 'left', true);
      // 這趟素材
      var run = trio(st.run);
      text(ctx, '這趟', 812, 20, 12, PAL.textDim, 'left', true);
      KINDS.forEach(function (k, i) {
        var gx = 844 + i * 50;
        matIcon(ctx, k, gx + 8, 20, 16);
        text(ctx, int(run[k]), gx + 19, 20, 15, PAL.text, 'left', true);
      });
      // 血量
      var mh = Math.round(num(st.maxHp, 3, 0, 8)), hp = Math.round(num(st.hp, mh, 0, mh));
      for (var i = 0; i < mh; i++) {
        heart(ctx, 1012 + i * 22, 21, 20);
        if (i < hp) fillStroke(ctx, '#ff4a5a', PAL.outline, 2);
        else fillStroke(ctx, '#2a2f44', '#6a7290', 1.5);
      }
      // 技能冷卻
      var cdD = num(st.skillCdDur, 1, 0.001, 1e6), cdT = num(st.skillCdT, cdD, 0, cdD);
      var ready = cdT >= cdD;
      var icx = 1192, icy = 20;
      clsIcon(ctx, st.cls, icx, icy, 28);
      if (!ready) {
        var rem = 1 - cdT / cdD;
        ctx.beginPath(); ctx.moveTo(icx, icy);
        ctx.arc(icx, icy, 13.5, -Math.PI / 2, -Math.PI / 2 + rem * Math.PI * 2);
        ctx.closePath(); ctx.fillStyle = 'rgba(6,9,18,0.7)'; ctx.fill();
      } else {
        circle(ctx, icx, icy, 15.5); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      }
      keycap(ctx, 'X', icx - 27, icy, 20, !ready);
      // 這趟的印記
      var it = mark(st.itemThisRun);
      if (it) markGlyph(ctx, it, 1248, 20, 26);
      else {
        circle(ctx, 1248, 20, 11);
        ctx.setLineDash([3, 3]); ctx.strokeStyle = '#4a5476'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // ---------- 面板 ----------
  function drawResultPanel(ctx, st) {
    st = S(st);
    var X = 280, Y = 150;
    var item = mark(st.item);
    var cmp = st.oldTime !== null && st.oldTime !== undefined;
    ctx.save();
    dim(ctx, 0.45);
    panelBox(ctx, X, Y, 720, 420, PAL.panel, PAL.gold);
    text(ctx, '過關', X + 360, Y + 40, 34, PAL.gold, 'center', true, PAL.outline);
    var run = trio(st.run), rates = trio(st.rates);
    // 這趟拿到
    text(ctx, '這趟拿到', X + 40, Y + 88, 14, PAL.textDim, 'left', true);
    KINDS.forEach(function (k, i) {
      var gx = X + 130 + i * 90;
      matIcon(ctx, k, gx, Y + 88, 22);
      text(ctx, int(run[k]), gx + 16, Y + 88, 20, PAL.text, 'left', true);
    });
    if (item) {
      markGlyph(ctx, item, X + 470, Y + 88, 30);
      text(ctx, '獲得 ' + NAME[item], X + 492, Y + 88, 17, mix(PAL[item], '#ffffff', 0.3), 'left', true);
    }
    if (!cmp) {
      clsIcon(ctx, st.cls, X + 300, Y + 150, 32);
      text(ctx, fmt1(st.time) + ' 秒', X + 324, Y + 150, 26, PAL.text, 'left', true);
      text(ctx, '每分鐘產量', X + 360, Y + 200, 14, PAL.textDim, 'center', true);
      KINDS.forEach(function (k, i) {
        var gx = X + 220 + i * 110;
        matIcon(ctx, k, gx, Y + 236, 24);
        text(ctx, fmt1(rates[k]), gx + 18, Y + 236, 20, PAL.text, 'left', true);
      });
      text(ctx, '已存成回放', X + 360, Y + 300, 18, PAL.ok, 'center', true);
      keyHints(ctx, [['Z', '回大地圖']], X + 360, Y + 372, 28, 18);
    } else {
      var oldR = trio(st.oldRates);
      var colX = [X + 300, X + 520];
      // 欄頭
      rr(ctx, colX[0] - 90, Y + 118, 180, 228, 10); ctx.fillStyle = '#2a3658'; ctx.fill();
      rr(ctx, colX[1] - 90, Y + 118, 180, 228, 10); ctx.fillStyle = '#1a2238'; ctx.fill();
      text(ctx, '這一趟', colX[0], Y + 138, 17, PAL.text, 'center', true);
      text(ctx, '目前回放', colX[1], Y + 138, 17, PAL.textDim, 'center', true);
      clsIcon(ctx, st.cls, colX[0] - 40, Y + 174, 24);
      text(ctx, fmt1(st.time) + ' 秒', colX[0] - 22, Y + 174, 18, PAL.text, 'left', true);
      clsIcon(ctx, st.oldCls, colX[1] - 40, Y + 174, 24);
      text(ctx, fmt1(st.oldTime) + ' 秒', colX[1] - 22, Y + 174, 18, PAL.text, 'left', true);
      text(ctx, '每分', X + 120, Y + 174, 13, PAL.textDim, 'left', true);
      KINDS.forEach(function (k, i) {
        var ry = Y + 220 + i * 42;
        matIcon(ctx, k, X + 130, ry, 24);
        text(ctx, MATUSE[k], X + 148, ry, 12, PAL.textDim, 'left', false);
        var a = rates[k], b = oldR[k];
        [[a, b, colX[0]], [b, a, colX[1]]].forEach(function (v) {
          var hi = v[0] > v[1] + 1e-9;
          if (hi) {
            rr(ctx, v[2] - 70, ry - 15, 140, 30, 6); ctx.fillStyle = 'rgba(91,227,138,0.18)'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(v[2] + 42, ry + 5); ctx.lineTo(v[2] + 50, ry - 6); ctx.lineTo(v[2] + 58, ry + 5); ctx.closePath();
            ctx.fillStyle = PAL.ok; ctx.fill();
          }
          text(ctx, fmt1(v[0]), v[2], ry, 20, hi ? PAL.ok : PAL.text, 'center', true);
        });
      });
      keyHints(ctx, [['Z', '採用這一趟'], ['X', '保留舊的']], X + 360, Y + 382, 28, 18);
    }
    ctx.restore();
  }
  function drawFailPanel(ctx) {
    ctx.save();
    panelBox(ctx, 380, 240, 520, 240, PAL.panel, PAL.bad);
    text(ctx, '失敗', 640, 310, 40, PAL.bad, 'center', true, PAL.outline);
    text(ctx, '這趟的素材與寶箱不入帳', 640, 362, 15, PAL.textDim, 'center', false);
    keyHints(ctx, [['Z', '重來'], ['X', '回大地圖']], 640, 422, 28, 18);
    ctx.restore();
  }
  function drawPausePanel(ctx, st) {
    st = S(st);
    ctx.save();
    dim(ctx, 0.55);
    panelBox(ctx, 380, 220, 520, 280);
    text(ctx, '暫停', 640, 300, 40, PAL.text, 'center', true, PAL.outline);
    if (st.mode === 'map') keyHints(ctx, [['Esc', '繼續']], 640, 420, 28, 18);
    else {
      text(ctx, '回大地圖時這趟作廢', 640, 360, 15, PAL.textDim, 'center', false);
      keyHints(ctx, [['Esc', '繼續'], ['Z', '重來'], ['X', '回大地圖']], 640, 420, 28, 18);
    }
    ctx.restore();
  }
  function drawEndingPanel(ctx, st) {
    st = S(st);
    var tt = Math.max(0, Math.floor(num(st.totalTime, 0, 0, 1e7)));
    var mm = Math.floor(tt / 60), ss = tt % 60;
    ctx.save();
    dim(ctx, 0.5);
    panelBox(ctx, 280, 150, 720, 420, PAL.panel, PAL.gold);
    circle(ctx, 640, 260, 90); ctx.fillStyle = 'rgba(255,210,58,0.14)'; ctx.fill();
    archShape(ctx, 640, 320, 170, 110, '#e8c860');
    text(ctx, '凱旋門落成', 640, 370, 36, PAL.gold, 'center', true, PAL.outline);
    text(ctx, '總遊玩時間  ' + mm + ':' + (ss < 10 ? '0' : '') + ss, 640, 430, 22, PAL.text, 'center', true);
    keyHints(ctx, [['Z', '重新開始']], 640, 510, 28, 18);
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  var GUIDE_V = [[480, 270], [600, 220], [480, 300], [560, 240], [600, 200]];
  // 在示意圖空間畫短標籤, 畫面字級固定 px
  function glabel(ctx, s, x, y, k, px, color) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1 / k, 1 / k);
    text(ctx, s, 0, 0, px || 14, color || PAL.text, 'center', true, PAL.outline);
    ctx.restore();
  }
  function groundRow(ctx, x0, x1, yTop, theme, rows) {
    for (var gx = x0; gx < x1; gx += 40) for (var r = 0; r < (rows || 1); r++)
      drawGround(ctx, { x: gx + 20, y: yTop + 20 + r * 40, top: r === 0, theme: theme });
  }
  function dashedArrow(ctx, pts, color, lw) {
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].length === 4) ctx.quadraticCurveTo(pts[i][0], pts[i][1], pts[i][2], pts[i][3]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.setLineDash([lw * 3, lw * 2.2]);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
    ctx.setLineDash([]);
    var e = pts[pts.length - 1], b = pts[pts.length - 2];
    var ex = e.length === 4 ? e[2] : e[0], ey = e.length === 4 ? e[3] : e[1];
    var bx = e.length === 4 ? e[0] : (b.length === 4 ? b[2] : b[0]), by = e.length === 4 ? e[1] : (b.length === 4 ? b[3] : b[1]);
    var a = Math.atan2(ey - by, ex - bx);
    ctx.translate(ex, ey); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(lw * 1.5, 0); ctx.lineTo(-lw * 3, -lw * 2.6); ctx.lineTo(-lw * 3, lw * 2.6); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
  }

  function guide0(ctx, k) {
    // 第 1 關縮小版(關卡座標 800x450 × 0.6)
    var s = 0.6;
    skyFill(ctx, 0, 0, 480, 270);
    ctx.save(); ctx.scale(s, s);
    groundRow(ctx, 0, 800, 370, 'plain', 2);
    drawGoal(ctx, { x: 740, y: 330, reached: false });
    drawChest(ctx, { x: 520, y: 352, open: false });
    drawFrog(ctx, { x: 290, y: 356, facing: 1, state: 'crouch', hit: false, minion: false });
    drawShieldman(ctx, { x: 345, y: 348, facing: -1, state: 'walk', hit: false, minion: false, t: 0 });
    drawFrog(ctx, { x: 400, y: 356, facing: -1, state: 'crouch', hit: false, minion: false });
    drawPickup(ctx, { x: 175, y: 352, kind: 'wood', t: 0 });
    drawPlayer(ctx, { x: 70, y: 348, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
    dashedArrow(ctx, [[92, 340], [175, 336], [345, 210, 520, 322], [700, 322]], '#ffe066', 5);
    var K = k * s;
    glabel(ctx, '你', 70, 300, K, 15, PAL.select);
    glabel(ctx, '終點旗', 740, 266, K, 15, PAL.text);
    ctx.restore();
  }
  function guideCell(ctx, x, w, h) {
    rr(ctx, x + 4, 4, w - 8, h - 8, 10);
    ctx.save(); ctx.clip();
    skyFill(ctx, x, 0, w, h);
    groundRow(ctx, x, x + w, h - 44, 'plain', 2);
    ctx.restore();
    rr(ctx, x + 4, 4, w - 8, h - 8, 10); ctx.strokeStyle = '#4a5a82'; ctx.lineWidth = 2; ctx.stroke();
  }
  function guide1(ctx, k) {
    var gy = 176, sc = 1.3;
    for (var i = 0; i < 4; i++) guideCell(ctx, i * 150, 150, 220);
    function P(cx, footY, pose, poseT) {
      ctx.save(); ctx.translate(cx, footY); ctx.scale(sc, sc);
      drawPlayer(ctx, { x: 0, y: -22, cls: 'sword', facing: 1, pose: pose, poseT: poseT, invuln: false });
      ctx.restore();
    }
    // 1 跑
    P(75, gy, 'run', 0.05);
    keycap(ctx, '←', 30, 128, 26); keycap(ctx, '→', 120, 128, 26);
    // 2 跳
    P(225, gy - 44, 'rise', 0);
    keycap(ctx, '空白鍵', 225, gy - 18, 24);
    // 3 揮砍
    P(335, gy, 'slash', 0.03);
    keycap(ctx, 'Z', 335, 82, 26);
    // 4 衝刺斬穿過跳蛙
    ctx.save(); ctx.translate(500, gy); ctx.scale(sc, sc);
    ctx.globalAlpha = 0.5;
    drawFrog(ctx, { x: 0, y: -14, facing: -1, state: 'crouch', hit: true, minion: false });
    ctx.globalAlpha = 1;
    drawPoof(ctx, { x: 0, y: -16, t: 0.08, dur: 0.3 });
    ctx.restore();
    P(560, gy, 'dash', 0.05);
    keycap(ctx, 'X', 560, 82, 26);
  }
  function guide2(ctx, k) {
    // 頂端資訊列(木材格) + 已過關卡片(縮圖為局部放大) + 飛向資訊列的木材
    ctx.fillStyle = PAL.hudBg; ctx.fillRect(0, 0, 480, 40);
    ctx.fillStyle = 'rgba(120,140,200,0.35)'; ctx.fillRect(0, 39, 480, 1);
    hudCell(ctx, 'wood', 16, '', null, 0, null);
    text(ctx, '12', 54, 20, 16, PAL.textDim, 'left', true);
    text(ctx, '→', 78, 20, 16, PAL.textDim, 'left', true);
    ctx.save(); ctx.translate(100, 20); ctx.scale(1.25, 1.25);
    text(ctx, '13', 0, 0, 19, mix(PAL.text, PAL.wood, 0.4), 'left', true); ctx.restore();
    var cx = 268, cy = 140;
    ctx.fillStyle = PAL.mapBg2; ctx.fillRect(0, 40, 480, 260);
    drawLevelCard(ctx, { x: cx, y: cy, index: 1, name: '草原', state: 'cleared', cost: null, canAfford: true, rates: { wood: 24.0, ench: 7.5, time: 5.0 }, recordCls: 'sword', recordTime: 20.0 });
    // 縮圖內容: 局部放大
    ctx.save();
    ctx.beginPath(); ctx.rect(cx + 8, cy + 8, 160, 90); ctx.clip();
    ctx.translate(cx + 8, cy + 8); ctx.scale(0.5, 0.5);
    skyFill(ctx, 0, 0, 320, 180);
    groundRow(ctx, 0, 320, 120, 'plain', 2);
    drawFrog(ctx, { x: 260, y: 106, facing: -1, state: 'crouch', hit: false, minion: false });
    drawPlayer(ctx, { x: 120, y: 98, cls: 'sword', facing: 1, pose: 'run', poseT: 0.1, invuln: false });
    drawPickup(ctx, { x: 140, y: 96, kind: 'wood', t: 0 });
    ctx.restore();
    drawCardOverlay(ctx, { x: cx, y: cy, accelLv: 0, pending: false, selected: false });
    // 弧線 + 飛行木材
    var sx = cx + 8 + 70, sy = cy + 8 + 48;
    dashedArrow(ctx, [[sx, sy], [150, 150, 40, 36]], 'rgba(255,224,102,0.8)', 2.5);
    drawFlyingMaterial(ctx, { x: 171, y: 133, kind: 'wood', t: 0.4, dur: 0.7 });
  }
  function miniLevel(ctx) {
    skyFill(ctx, 0, 0, 640, 400);
    groundRow(ctx, 0, 640, 360, 'plain', 1);
    for (var gx = 240; gx < 440; gx += 40) drawGround(ctx, { x: gx + 20, y: 260, top: true, theme: 'plain' });
    drawGoal(ctx, { x: 600, y: 320, reached: false });
    drawPickup(ctx, { x: 270, y: 222, kind: 'wood', t: 0 });
    drawPickup(ctx, { x: 310, y: 222, kind: 'ench', t: 0 });
    drawPickup(ctx, { x: 410, y: 222, kind: 'time', t: 0 });
    drawPickup(ctx, { x: 130, y: 340, kind: 'wood', t: 0 });
    drawBoar(ctx, { x: 360, y: 224, facing: -1, state: 'walk', hit: false, minion: false, t: 0 });
    drawFrog(ctx, { x: 180, y: 346, facing: 1, state: 'crouch', hit: false, minion: false });
    drawPlayer(ctx, { x: 40, y: 338, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: false });
  }
  function guide3(ctx, k) {
    var sc = 0.42, pw = 640 * sc, ph = 400 * sc;
    [0, 1].forEach(function (i) {
      var ox = i * 290 + (270 - pw) / 2, oy = 6;
      ctx.save();
      ctx.translate(ox, oy);
      rr(ctx, 0, 0, pw, ph, 6); ctx.save(); ctx.clip();
      ctx.scale(sc, sc);
      miniLevel(ctx);
      var pts = i === 0
        ? [[40, 338], [130, 338], [180, 300], [210, 260], [250, 222], [300, 222], [360, 200], [410, 222], [440, 230], [470, 300], [520, 338], [590, 338]]
        : [[40, 338], [150, 338], [300, 338], [450, 338], [590, 338]];
      drawRoutePath(ctx, { points: pts.map(function (p) { return { x: p[0], y: p[1] }; }), cls: 'sword' });
      ctx.restore();
      rr(ctx, 0, 0, pw, ph, 6); ctx.strokeStyle = '#4a5a82'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      var lx = i * 290 + 135;
      glabel(ctx, i === 0 ? '素材多 / 秒數長' : '素材少 / 秒數短', lx, oy + ph + 30, k, 16, PAL.text);
    });
  }
  function guide4(ctx, k) {
    function arrow(x) {
      ctx.beginPath(); ctx.moveTo(x - 14, 100); ctx.lineTo(x + 6, 100);
      ctx.strokeStyle = PAL.select; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 16, 100); ctx.lineTo(x + 2, 89); ctx.lineTo(x + 2, 111); ctx.closePath();
      ctx.fillStyle = PAL.select; ctx.fill();
    }
    // 1 打開的寶箱 + 爆裂印
    guideCell(ctx, 0, 180, 200);
    drawChest(ctx, { x: 90, y: 138, open: true });
    ctx.save(); ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(74, 122); ctx.lineTo(60, 80); ctx.lineTo(120, 80); ctx.lineTo(106, 122); ctx.closePath();
    ctx.fillStyle = '#fff6c8'; ctx.fill(); ctx.restore();
    drawItemIcon(ctx, { x: 90, y: 72, type: 'blast' });
    arrow(200);
    // 2 背包格
    rr(ctx, 224, 26, 152, 148, 10); ctx.fillStyle = PAL.panel; ctx.fill(); ctx.strokeStyle = PAL.panelEdge; ctx.lineWidth = 2; ctx.stroke();
    slotCell(ctx, 263, 63, { type: 'blast', where: { level: 1, slot: 1 } }, true);
    glabel(ctx, '背包', 300, 46, k, 13, PAL.textDim);
    arrow(400);
    // 3 帶印的盾兵
    guideCell(ctx, 420, 180, 200);
    ctx.save(); ctx.translate(510, 156); ctx.scale(1.35, 1.35);
    drawMarkAura(ctx, { x: 0, y: -22, type: 'blast', t: 0.3 });
    drawShieldman(ctx, { x: 0, y: -22, facing: -1, state: 'walk', hit: false, minion: false, t: 0 });
    ctx.restore();
  }
  var GUIDES = [guide0, guide1, guide2, guide3, guide4];
  function drawGuidePage(ctx, st) {
    st = S(st);
    var page = Math.round(num(st.page, 0, 0, GUIDES.length - 1));
    var x = num(st.x, 0), y = num(st.y, 0), w = num(st.w, GUIDE_V[page][0], 1, 4000), h = num(st.h, GUIDE_V[page][1], 1, 4000);
    var vw = GUIDE_V[page][0], vh = GUIDE_V[page][1];
    var k = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
    ctx.scale(k, k);
    GUIDES[page](ctx, k);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: PAL,
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawSpike: drawSpike,
    drawCrackWall: drawCrackWall,
    drawHookRing: drawHookRing,
    drawPickup: drawPickup,
    drawChest: drawChest,
    drawGoal: drawGoal,
    drawMarkAura: drawMarkAura,
    drawMarkSpot: drawMarkSpot,
    drawMagnetPulse: drawMagnetPulse,
    drawRoutePath: drawRoutePath,
    drawPlayer: drawPlayer,
    drawRangeRing: drawRangeRing,
    drawBoar: drawBoar,
    drawShieldman: drawShieldman,
    drawShooterBee: drawShooterBee,
    drawFrog: drawFrog,
    drawBeeShot: drawBeeShot,
    drawArrow: drawArrow,
    drawBomb: drawBomb,
    drawExplosion: drawExplosion,
    drawShockwave: drawShockwave,
    drawPoof: drawPoof,
    drawPopup: drawPopup,
    drawChainText: drawChainText,
    drawItemIcon: drawItemIcon,
    drawItemNotice: drawItemNotice,
    drawMapLink: drawMapLink,
    drawLevelCard: drawLevelCard,
    drawCardOverlay: drawCardOverlay,
    drawGoalCard: drawGoalCard,
    drawFlyingMaterial: drawFlyingMaterial,
    drawLevelPanel: drawLevelPanel,
    drawSlotCursor: drawSlotCursor,
    drawHud: drawHud,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEndingPanel: drawEndingPanel,
    drawGuidePage: drawGuidePage
  };
})();
