// 機兵工坊 — 美術繪圖模組(explore-2 / game-c)
// 全域物件 window.Art; 純 Canvas 2D 幾何, 無外部資源。
// 只負責「給狀態, 畫出來」: 不算碰撞、不管輸入、不改遊戲狀態。
(function () {
  'use strict';

  var W = 1280, H = 720;
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC","Heiti TC",sans-serif';

  // ---------- 色票 ----------
  var P = {
    bg: '#161b26', bg2: '#222a3a', bgFar: '#283247', bgPipe: '#2e384c',
    mapBg: '#121a2a', mapGrid: '#1d2a42',
    ground: '#3c4352', groundEdge: '#262b36', groundTop: '#8a93a6', groundTopHi: '#c3cad6', bolt: '#5a6274',
    softRock: '#b57c46', softRockDark: '#6e441f', softRockLight: '#dba56b',
    door: '#66768c', doorLight: '#a9b7c8', doorDark: '#3a4558',
    danger: '#ff3b3b', dangerDark: '#8e1a1a', spike: '#d8dde6',
    ore: '#3a6cf0', oreLight: '#9db8ff', oreDark: '#0f1f52',
    battery: '#3ddc5a', batteryDark: '#0e4a1c',
    gear: '#ffd23c', gearDark: '#5a4300',
    drill: '#ff8a1e', heli: '#22c7c0', magnet: '#b36bff',
    botBody: '#e6ebf2', botShade: '#b9c2cf', outline: '#141922', visor: '#1a2433',
    roller: '#9a7b5f', rollerDark: '#5e4733',
    bomber: '#2b2b33', bomberHi: '#5a5a66',
    crab: '#4e8f7a', crabDark: '#2c5a4b', crabShell: '#e9eef4', crabShellDark: '#8a96a6',
    hawk: '#7a5a3c', hawkLight: '#c49a6c', beak: '#e8d8a8',
    enemyEye: '#ff3b3b',
    smoke: '#cfd5df', fire: '#ff9a2e', fireCore: '#fff2c0',
    hud: 'rgba(10,14,22,0.88)', panel: '#1b2230', panelEdge: '#3d4a60', panelHi: '#26303f',
    text: '#f2f5fa', textDim: '#8d97a8', lack: '#5f6878', select: '#ffffff',
    hp: '#ff3b3b', key: '#e8edf4', keyText: '#141922',
    titan: '#c9d2de', titanDark: '#5d6a7c'
  };
  var MAT_COLOR = { ore: P.ore, battery: P.battery, gear: P.gear };
  var MAT_NAME = { ore: '礦石', battery: '電池', gear: '齒輪' };
  var KINDS = ['ore', 'battery', 'gear'];
  var BOTS = ['drill', 'heli', 'magnet'];
  var BOT_COLOR = { drill: P.drill, heli: P.heli, magnet: P.magnet };
  var BOT_NAME = { drill: '鑽頭號', heli: '螺旋號', magnet: '磁力號' };
  var BUILDS = ['none', 'ore', 'battery', 'gear', 'nest', 'spring'];
  var BUILD_ORDER = ['ore', 'battery', 'gear', 'nest', 'spring'];
  var BUILD_NAME = { none: '空樁', ore: '礦石堆', battery: '電池堆', gear: '齒輪堆', nest: '怪物巢', spring: '彈跳板' };
  var BUILD_EFFECT = { ore: '進關時多 4 個該素材', battery: '進關時多 4 個該素材', gear: '進關時多 4 個該素材', nest: '多 4 隻怪物', spring: '彈上捷徑' };
  var POSES = ['idle', 'run', 'rise', 'fall', 'attack', 'drill', 'hover', 'magnet', 'hurt'];
  var SPEED_LABEL = ['×1', '×1.25', '×1.5'];

  // ---------- 小工具 ----------
  function N(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function C(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function NC(v, d, a, b) { return C(N(v, d), a, b); }
  function pick(v, list, d) { return list.indexOf(v) >= 0 ? v : d; }
  function obj(s) { return (s && typeof s === 'object') ? s : {}; }
  function str(v, d) { return (typeof v === 'string' || typeof v === 'number') ? String(v) : d; }
  function mats(o) { o = obj(o); return { ore: NC(o.ore, 0, 0, 1e9), battery: NC(o.battery, 0, 0, 1e9), gear: NC(o.gear, 0, 0, 1e9) }; }
  function clock() {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now() / 1000;
    return Date.now() / 1000;
  }
  function font(px, bold) { return (bold ? 'bold ' : '') + Math.round(px) + 'px ' + FONT; }
  function fmt1(v) { return NC(v, 0, 0, 1e7).toFixed(1); }
  function fmtInt(v) { return String(Math.floor(NC(v, 0, 0, 1e9))); }

  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = font(o.size || 16, o.bold);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'middle';
    if (o.stroke) {
      ctx.lineJoin = 'round'; ctx.lineWidth = o.sw || 3; ctx.strokeStyle = o.stroke;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = o.color || P.text;
    ctx.fillText(s, x, y);
  }
  // 縮圖重用時(RD 以 scale(0.3) 畫回放), 浮字 / 連鎖字放大到讀得到; 扣掉底圖倍率(高 DPI)後才判斷
  function textBoost(ctx) {
    if (!ctx || typeof ctx.getTransform !== 'function') return 1;
    var m = ctx.getTransform();
    if (!m) return 1;
    var sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    var cw = (ctx.canvas && ctx.canvas.width) ? ctx.canvas.width / W : 1;
    var k = sc / (cw || 1);
    if (!(k > 0) || k >= 0.6) return 1;
    return Math.min(2.2, 0.66 / k);
  }
  function tw(ctx, s, px, bold) { ctx.font = font(px, bold); return ctx.measureText(s).width; }

  // 鍵帽: 回傳寬度
  function keyCap(ctx, label, cx, cy, px) {
    px = px || 14;
    var w = Math.max(px * 1.6, tw(ctx, label, px, true) + px * 0.9), h = px * 1.6;
    rr(ctx, cx - w / 2, cy - h / 2, w, h, 4);
    ctx.fillStyle = P.key; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(cx - w / 2 + 2, cy + h / 2 - 4, w - 4, 2);
    txt(ctx, label, cx, cy, { size: px, bold: true, align: 'center', color: P.keyText });
    return w;
  }
  // 一列按鍵提示: items = [[鍵, 說明], ...], 置中於 cx
  function keyHints(ctx, items, cx, cy, px) {
    px = px || 16;
    var gap = px * 1.4, parts = [], total = 0, i;
    for (i = 0; i < items.length; i++) {
      var kw = Math.max(px * 1.6, tw(ctx, items[i][0], px, true) + px * 0.9);
      var lw = tw(ctx, items[i][1], px, false);
      parts.push([kw, lw]); total += kw + 6 + lw + (i ? gap : 0);
    }
    var x = cx - total / 2;
    for (i = 0; i < items.length; i++) {
      if (i) x += gap;
      keyCap(ctx, items[i][0], x + parts[i][0] / 2, cy, px);
      x += parts[i][0] + 6;
      txt(ctx, items[i][1], x, cy, { size: px, color: P.text });
      x += parts[i][1];
    }
  }

  // ---------- 共用圖示 ----------
  // 素材形狀, s = 外框邊長
  function matShape(ctx, kind, cx, cy, s) {
    kind = pick(kind, KINDS, 'ore');
    var h = s / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, s / 14);
    if (kind === 'ore') {
      // 多面晶體
      ctx.beginPath();
      ctx.moveTo(0, -h); ctx.lineTo(h * 0.8, -h * 0.3); ctx.lineTo(h * 0.6, h * 0.85);
      ctx.lineTo(-h * 0.6, h * 0.85); ctx.lineTo(-h * 0.8, -h * 0.3); ctx.closePath();
      ctx.fillStyle = P.ore; ctx.fill();
      ctx.strokeStyle = P.oreDark; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(-h * 0.8, -h * 0.3); ctx.lineTo(-h * 0.1, -h * 0.05); ctx.closePath();
      ctx.fillStyle = P.oreLight; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-h * 0.1, -h * 0.05); ctx.lineTo(0, h * 0.85); ctx.strokeStyle = P.oreDark; ctx.stroke();
    } else if (kind === 'battery') {
      // 直立電池 + 頂蓋 + 閃電
      rr(ctx, -h * 0.5, -h * 0.72, h, h * 1.68, h * 0.18);
      ctx.fillStyle = P.battery; ctx.fill();
      ctx.strokeStyle = P.batteryDark; ctx.stroke();
      ctx.fillStyle = P.batteryDark; ctx.fillRect(-h * 0.22, -h, h * 0.44, h * 0.3);
      ctx.beginPath();
      ctx.moveTo(h * 0.12, -h * 0.5); ctx.lineTo(-h * 0.25, h * 0.08); ctx.lineTo(0, h * 0.08);
      ctx.lineTo(-h * 0.12, h * 0.62); ctx.lineTo(h * 0.25, -h * 0.02); ctx.lineTo(0, -h * 0.02); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();
    } else {
      // 齒輪: 8 齒
      var ro = h * 0.98, ri = h * 0.72, teeth = 8, i;
      ctx.beginPath();
      for (i = 0; i < teeth * 2; i++) {
        var a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
        var r = (i % 2 === 0) ? ro : ri;
        if (i === 0) ctx.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
        ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
        ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      }
      ctx.closePath();
      ctx.fillStyle = P.gear; ctx.fill();
      ctx.strokeStyle = P.gearDark; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, h * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = P.gearDark; ctx.fill();
    }
    ctx.restore();
  }

  // 機兵小頭像(圖示), s = 外框邊長
  function botIcon(ctx, bot, cx, cy, s) {
    bot = pick(bot, BOTS, 'drill');
    var h = s / 2, c = BOT_COLOR[bot];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = Math.max(1, s / 14); ctx.lineJoin = 'round';
    // 頭
    rr(ctx, -h * 0.66, -h * 0.5, h * 1.32, h * 1.2, h * 0.25);
    ctx.fillStyle = P.botBody; ctx.fill(); ctx.strokeStyle = P.outline; ctx.stroke();
    rr(ctx, -h * 0.4, -h * 0.25, h * 0.9, h * 0.42, h * 0.12);
    ctx.fillStyle = P.visor; ctx.fill();
    ctx.fillStyle = c; ctx.fillRect(h * 0.18, -h * 0.17, h * 0.22, h * 0.24);
    ctx.fillStyle = c; ctx.fillRect(-h * 0.66, h * 0.42, h * 1.32, h * 0.16);
    if (bot === 'drill') {
      ctx.beginPath(); ctx.moveTo(h * 0.66, -h * 0.05); ctx.lineTo(h, h * 0.15); ctx.lineTo(h * 0.66, h * 0.35); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.stroke();
    } else if (bot === 'heli') {
      ctx.fillStyle = P.outline; ctx.fillRect(-h * 0.06, -h * 0.82, h * 0.12, h * 0.32);
      rr(ctx, -h * 0.95, -h * 0.98, h * 1.9, h * 0.2, h * 0.1); ctx.fillStyle = c; ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(h * 0.66, h * 0.15, h * 0.26, -Math.PI / 2, Math.PI / 2);
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, s / 7); ctx.stroke();
    }
    ctx.restore();
  }

  // 設施小圖示
  function buildIcon(ctx, build, cx, cy, s) {
    build = pick(build, BUILDS, 'none');
    var h = s / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = Math.max(1, s / 16);
    if (build === 'none') {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = P.textDim; ctx.strokeRect(-h + 1, -h + 1, s - 2, s - 2);
      ctx.setLineDash([]);
    } else if (build === 'ore' || build === 'battery' || build === 'gear') {
      ctx.fillStyle = P.panelHi; ctx.fillRect(-h, h * 0.45, s, h * 0.55);
      ctx.fillStyle = MAT_COLOR[build]; ctx.fillRect(-h, h * 0.45, s, h * 0.16);
      matShape(ctx, build, 0, -h * 0.12, s * 0.7);
    } else if (build === 'nest') {
      ctx.beginPath(); ctx.arc(0, h, h * 0.95, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = '#6a4a35'; ctx.fill(); ctx.strokeStyle = P.outline; ctx.stroke();
      ctx.fillStyle = '#1a120c';
      ctx.beginPath(); ctx.arc(-h * 0.35, h * 0.55, h * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(h * 0.35, h * 0.55, h * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = P.enemyEye;
      ctx.fillRect(-h * 0.42, h * 0.5, h * 0.12, h * 0.1); ctx.fillRect(h * 0.3, h * 0.5, h * 0.12, h * 0.1);
    } else {
      ctx.fillStyle = P.doorDark; ctx.fillRect(-h, h * 0.65, s, h * 0.35);
      ctx.strokeStyle = P.doorLight; ctx.lineWidth = Math.max(1.2, s / 12);
      ctx.beginPath(); ctx.moveTo(-h * 0.5, h * 0.65);
      for (var i = 0; i < 4; i++) { ctx.lineTo(i % 2 ? -h * 0.5 : h * 0.5, h * 0.65 - (i + 1) * h * 0.25); }
      ctx.stroke();
      rr(ctx, -h * 0.85, -h * 0.65, h * 1.7, h * 0.36, h * 0.12);
      ctx.fillStyle = P.botBody; ctx.fill(); ctx.strokeStyle = P.outline; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  // 回放加速 2 格
  function speedBar(ctx, x, y, lv, segW, segH) {
    lv = Math.floor(NC(lv, 0, 0, 2));
    for (var i = 0; i < 2; i++) {
      rr(ctx, x + i * (segW + 3), y, segW, segH, 2);
      ctx.fillStyle = i < lv ? P.text : 'rgba(255,255,255,0.08)'; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = i < lv ? P.text : P.textDim; ctx.stroke();
    }
    return 2 * segW + 3;
  }

  // 花費列: 只畫 > 0 的種類; 回傳結束 x
  function costRow(ctx, x, cy, cost, afford, px) {
    cost = mats(cost); px = px || 16;
    var col = afford ? P.text : P.lack, any = false;
    for (var i = 0; i < KINDS.length; i++) {
      var k = KINDS[i], v = cost[k];
      if (v <= 0) continue;
      any = true;
      ctx.save(); if (!afford) ctx.globalAlpha = 0.55; matShape(ctx, k, x + px * 0.6, cy, px * 1.15); ctx.restore();
      x += px * 1.3;
      var s = fmtInt(v);
      txt(ctx, s, x, cy, { size: px, bold: true, color: col });
      x += tw(ctx, s, px, true) + px * 0.8;
    }
    if (!any) { txt(ctx, '免費', x, cy, { size: px, color: col }); x += tw(ctx, '免費', px, false) + px * 0.8; }
    return x;
  }

  function lockIcon(ctx, cx, cy, s, color) {
    var h = s / 2;
    ctx.save();
    ctx.lineWidth = Math.max(2, s / 9); ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy - h * 0.15, h * 0.45, Math.PI, 0); ctx.stroke();
    rr(ctx, cx - h * 0.65, cy - h * 0.15, h * 1.3, h * 1.0, h * 0.15); ctx.fill();
    ctx.fillStyle = P.panel; ctx.fillRect(cx - h * 0.08, cy + h * 0.1, h * 0.16, h * 0.4);
    ctx.restore();
  }

  function selectFrame(ctx, x, y, w, h) {
    // 畫在框外 4.5px 處、線寬 3 → 最外緣 6px
    ctx.save();
    rr(ctx, x - 4.5, y - 4.5, w + 9, h + 9, 10);
    ctx.lineWidth = 3; ctx.strokeStyle = P.select; ctx.stroke();
    ctx.restore();
  }

  function panelBox(ctx, x, y, w, h, edge) {
    rr(ctx, x + 1, y + 1, w - 2, h - 2, 12);
    ctx.fillStyle = P.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = edge || P.panelEdge; ctx.stroke();
  }

  function heart(ctx, cx, cy, s, full) {
    var h = s / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + h * 0.85);
    ctx.bezierCurveTo(cx - h * 1.3, cy - h * 0.1, cx - h * 0.5, cy - h * 1.05, cx, cy - h * 0.35);
    ctx.bezierCurveTo(cx + h * 0.5, cy - h * 1.05, cx + h * 1.3, cy - h * 0.1, cx, cy + h * 0.85);
    ctx.closePath();
    ctx.fillStyle = full ? P.hp : 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = full ? '#ffd0d0' : P.textDim; ctx.stroke();
  }

  // 擊飛速度線: 畫在飛行方向反側框外, 至多 24px
  function speedLines(ctx, f, hw, hh) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var ys = [-hh * 0.55, 0, hh * 0.55], ls = [14, 20, 14];
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-f * (hw + 3), ys[i]);
      ctx.lineTo(-f * (hw + 3 + ls[i]), ys[i]);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 巨神機圖示
  function titanIcon(ctx, cx, cy, s, lit) {
    var h = s / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.lineWidth = Math.max(1.5, s / 40); ctx.strokeStyle = P.outline;
    // 肩與胸
    rr(ctx, -h * 0.9, -h * 0.15, h * 1.8, h * 1.1, h * 0.12); ctx.fillStyle = P.titanDark; ctx.fill(); ctx.stroke();
    rr(ctx, -h * 0.55, -h * 0.05, h * 1.1, h * 0.9, h * 0.1); ctx.fillStyle = P.titan; ctx.fill(); ctx.stroke();
    // 頭
    rr(ctx, -h * 0.38, -h * 0.85, h * 0.76, h * 0.62, h * 0.1); ctx.fillStyle = P.titan; ctx.fill(); ctx.stroke();
    ctx.fillStyle = P.visor; ctx.fillRect(-h * 0.28, -h * 0.66, h * 0.56, h * 0.18);
    ctx.fillStyle = lit ? '#ffffff' : P.textDim;
    ctx.fillRect(-h * 0.22, -h * 0.62, h * 0.14, h * 0.1); ctx.fillRect(h * 0.08, -h * 0.62, h * 0.14, h * 0.1);
    // 胸前三燈 = 三種素材
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc((i - 1) * h * 0.3, h * 0.35, h * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = lit ? MAT_COLOR[KINDS[i]] : P.lack; ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 背景 ----------
  function drawBackground(ctx) {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.bg2); g.addColorStop(1, P.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 遠景廠房剪影
    ctx.fillStyle = P.bgFar;
    var blocks = [[0, 420, 180, 300], [160, 360, 140, 360], [300, 440, 220, 280], [500, 330, 120, 390], [640, 400, 260, 320], [880, 350, 160, 370], [1040, 430, 240, 290]];
    for (var i = 0; i < blocks.length; i++) { var b = blocks[i]; ctx.fillRect(b[0], b[1], b[2], b[3]); }
    var chim = [[210, 250, 26], [540, 220, 22], [930, 240, 28], [1160, 300, 20]];
    for (i = 0; i < chim.length; i++) { var c = chim[i]; ctx.fillRect(c[0], c[1], c[2], H - c[1]); }
    // 管線
    ctx.strokeStyle = P.bgPipe; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(480, 300); ctx.lineTo(480, 380); ctx.lineTo(1280, 380); ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(700, 120); ctx.lineTo(700, 260); ctx.lineTo(1280, 260); ctx.stroke();
    // 窗格
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (i = 0; i < 16; i++) ctx.fillRect(40 + i * 78, 480, 36, 22);
    ctx.restore();
  }

  function drawMapBackground(ctx) {
    ctx.save();
    ctx.fillStyle = P.mapBg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = P.mapGrid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (var y = 0; y <= H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,110,160,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (x = 0; x <= W; x += 200) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 地形 / 機關 ----------
  function drawGround(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), l = x - 20, t = y - 20;
    ctx.save();
    ctx.fillStyle = P.ground; ctx.fillRect(l, t, 40, 40);
    ctx.strokeStyle = P.groundEdge; ctx.lineWidth = 2; ctx.strokeRect(l + 1, t + 1, 38, 38);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(l + 5, t + 35); ctx.lineTo(l + 35, t + 5); ctx.stroke();
    ctx.fillStyle = P.bolt;
    ctx.fillRect(l + 5, t + 5, 3, 3); ctx.fillRect(l + 32, t + 5, 3, 3);
    ctx.fillRect(l + 5, t + 32, 3, 3); ctx.fillRect(l + 32, t + 32, 3, 3);
    if (s.top === true) {
      ctx.fillStyle = P.groundTop; ctx.fillRect(l, t, 40, 7);
      ctx.fillStyle = P.groundTopHi; ctx.fillRect(l, t, 40, 2);
    }
    ctx.restore();
  }

  function drawSpike(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), l = x - 20;
    ctx.save();
    ctx.fillStyle = P.dangerDark; ctx.fillRect(l, y + 15, 40, 5);
    for (var i = 0; i < 4; i++) {
      var bx = l + i * 10;
      ctx.beginPath(); ctx.moveTo(bx, y + 16); ctx.lineTo(bx + 5, y + 1); ctx.lineTo(bx + 10, y + 16); ctx.closePath();
      ctx.fillStyle = P.spike; ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 2.3, y + 8); ctx.lineTo(bx + 5, y + 1); ctx.lineTo(bx + 7.7, y + 8); ctx.closePath();
      ctx.fillStyle = P.danger; ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx, y + 16); ctx.lineTo(bx + 5, y + 1); ctx.lineTo(bx + 10, y + 16);
      ctx.strokeStyle = P.dangerDark; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  function drawSoftRock(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), l = x - 20, t = y - 20;
    ctx.save();
    ctx.fillStyle = P.softRockDark; ctx.fillRect(l, t, 40, 40);
    // 四塊圓角碎石 = 鬆散、鑽得動
    var chunks = [[l + 2, t + 2, 19, 17], [l + 22, t + 2, 16, 14], [l + 2, t + 21, 15, 17], [l + 19, t + 18, 19, 20]];
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i];
      rr(ctx, c[0], c[1], c[2], c[3], 5);
      ctx.fillStyle = P.softRock; ctx.fill();
      ctx.fillStyle = P.softRockLight; ctx.fillRect(c[0] + 3, c[1] + 2, c[2] - 8, 2);
    }
    // 裂紋
    ctx.strokeStyle = P.softRockDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(l + 8, t + 8); ctx.lineTo(l + 13, t + 12); ctx.lineTo(l + 11, t + 15);
    ctx.moveTo(l + 27, t + 26); ctx.lineTo(l + 32, t + 30); ctx.lineTo(l + 29, t + 34); ctx.stroke();
    ctx.restore();
  }

  function drawMagnetDoor(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), l = x - 20, t = y - 20;
    ctx.save();
    ctx.fillStyle = P.door; ctx.fillRect(l, t, 40, 40);
    ctx.fillStyle = P.doorDark; ctx.fillRect(l, t, 4, 40); ctx.fillRect(l + 36, t, 4, 40);
    ctx.fillStyle = P.doorLight; ctx.fillRect(l + 4, t, 2, 40);
    ctx.strokeStyle = P.doorDark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l, t + 39.5); ctx.lineTo(l + 40, t + 39.5); ctx.stroke();
    // 磁鐵 U 記號(磁力號同色)
    ctx.lineWidth = 6; ctx.strokeStyle = P.magnet; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(x, y + 1, 9, 0, Math.PI); ctx.moveTo(x - 9, y + 1); ctx.lineTo(x - 9, y - 9); ctx.moveTo(x + 9, y + 1); ctx.lineTo(x + 9, y - 9); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 12, y - 13, 6, 5); ctx.fillRect(x + 6, y - 13, 6, 5);
    ctx.restore();
  }

  function drawSlot(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), build = pick(s.build, BUILDS, 'none');
    var dur = NC(s.springDur, 0.25, 0.01, 10), st = NC(s.springT, dur, 0, 1e6);
    var l = x - 40, t = y - 12;
    ctx.save();
    if (build === 'none') {
      // 空樁: 虛線框 + 加號 = 可以蓋
      rr(ctx, l + 1, t + 6, 78, 17, 4);
      ctx.fillStyle = 'rgba(20,26,36,0.75)'; ctx.fill();
      ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = '#d6dde8'; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#d6dde8'; ctx.fillRect(x - 7, t + 13, 14, 3); ctx.fillRect(x - 1.5, t + 8, 3, 13);
    } else if (build === 'ore' || build === 'battery' || build === 'gear') {
      rr(ctx, l + 2, t + 8, 76, 15, 3); ctx.fillStyle = P.panelHi; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
      ctx.fillStyle = MAT_COLOR[build]; ctx.fillRect(l + 4, t + 10, 72, 4);
      for (var i = 0; i < 4; i++) { ctx.fillStyle = P.bolt; ctx.fillRect(l + 10 + i * 18, t + 17, 6, 3); }
    } else if (build === 'nest') {
      ctx.beginPath(); ctx.ellipse(x, y + 11, 38, 22, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = '#6a4a35'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
      ctx.strokeStyle = '#8a654a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y + 12, 28, 14, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      var holes = [-18, 0, 18];
      for (i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(x + holes[i], y + 6 - (i === 1 ? 4 : 0), 6, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a120c'; ctx.fill();
        ctx.fillStyle = P.enemyEye;
        ctx.fillRect(x + holes[i] - 3, y + 5 - (i === 1 ? 4 : 0), 2, 2); ctx.fillRect(x + holes[i] + 1, y + 5 - (i === 1 ? 4 : 0), 2, 2);
      }
    } else {
      // 彈跳板: 底座 + 彈簧 + 板面; 彈起時板面上伸至多 16px
      var p = st < dur ? st / dur : 1;
      var lift = p < 1 ? Math.sin(p * Math.PI) * 16 : 0;
      ctx.fillStyle = P.doorDark; ctx.fillRect(l + 6, t + 18, 68, 6);
      ctx.strokeStyle = P.doorLight; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      var top = t + 6 - lift, bot = t + 18;
      for (var side = -1; side <= 1; side += 2) {
        var cx = x + side * 20;
        ctx.beginPath(); ctx.moveTo(cx, bot);
        for (i = 1; i <= 4; i++) ctx.lineTo(cx + (i % 2 ? 7 : -7), bot - (bot - top) * i / 4);
        ctx.stroke();
      }
      rr(ctx, l + 2, top - 5, 76, 7, 3);
      ctx.fillStyle = P.botBody; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
      ctx.fillStyle = P.textDim;
      for (i = 0; i < 6; i++) ctx.fillRect(l + 10 + i * 11, top - 3, 5, 2);
      if (lift > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - p)).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(x - 30, top - 6, 5, 2.5, 0, 0, Math.PI * 2); ctx.ellipse(x + 30, top - 6, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPickup(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), t = NC(s.t, 0, 0, 1e7), kind = pick(s.kind, KINDS, 'ore');
    var bob = Math.sin(t * 3) * 1.5;
    ctx.save();
    matShape(ctx, kind, x, y + bob, 20);
    var gl = (t * 0.8) % 1;
    if (gl < 0.18) {
      var a = 1 - gl / 0.18;
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(x + 7, y - 11); ctx.lineTo(x + 8.5, y - 8); ctx.lineTo(x + 11.5, y - 6.5); ctx.lineTo(x + 8.5, y - 5); ctx.lineTo(x + 7, y - 2); ctx.lineTo(x + 5.5, y - 5); ctx.lineTo(x + 2.5, y - 6.5); ctx.lineTo(x + 5.5, y - 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawGoal(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), reached = s.reached === true;
    var px = x - 12, top = y - 40, bot = y + 40;
    ctx.save();
    ctx.fillStyle = P.doorDark; ctx.fillRect(x - 18, bot - 6, 24, 6);
    ctx.fillStyle = P.groundTopHi; ctx.fillRect(px - 2, top + 8, 4, bot - top - 12);
    ctx.beginPath(); ctx.arc(px, top + 9, 5, 0, Math.PI * 2);
    ctx.fillStyle = reached ? '#ffffff' : P.textDim; ctx.fill();
    // 未到: 旗掛半桿; 已到: 升到頂並發亮
    var fy = reached ? top + 13 : top + 34, fw = 29, fh = 22, i, j;
    for (i = 0; i < 4; i++) for (j = 0; j < 3; j++) {
      ctx.fillStyle = ((i + j) % 2 === 0) ? '#ffffff' : '#20242c';
      ctx.fillRect(px + 2 + i * (fw / 4), fy + j * (fh / 3), fw / 4 + 0.5, fh / 3 + 0.5);
    }
    ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.strokeRect(px + 2, fy, fw, fh);
    if (reached) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, top + 9, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      var sp = [[x + 14, top + 40], [x + 8, top + 52]];
      for (i = 0; i < sp.length; i++) {
        var sx = sp[i][0], sy = sp[i][1];
        ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 1.5, sy - 1.5); ctx.lineTo(sx + 5, sy); ctx.lineTo(sx + 1.5, sy + 1.5); ctx.lineTo(sx, sy + 5); ctx.lineTo(sx - 1.5, sy + 1.5); ctx.lineTo(sx - 5, sy); ctx.lineTo(sx - 1.5, sy - 1.5); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  // ---------- 玩家 ----------
  function drawPlayer(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), bot = pick(s.bot, BOTS, 'drill');
    var f = s.facing === -1 ? -1 : 1, pose = pick(s.pose, POSES, 'idle'), pt = NC(s.poseT, 0, 0, 1e6);
    var fuel = (s.fuel === null || s.fuel === undefined) ? null : NC(s.fuel, 0, 0, 1);
    var c = BOT_COLOR[bot];
    if (pose === 'hover' && bot !== 'heli') pose = 'rise';
    if (pose === 'magnet' && bot !== 'magnet') pose = 'idle';
    if (pose === 'drill' && bot !== 'drill') pose = 'idle';
    ctx.save();
    ctx.translate(x, y);
    if (s.invuln === true && Math.floor(clock() * 12) % 2 === 0) ctx.globalAlpha = 0.35;

    // 磁吸波紋(不鏡像), 外緣至多 120
    if (pose === 'magnet') {
      ctx.save();
      for (var k = 0; k < 3; k++) {
        var ph = ((pt / 0.45) + k / 3) % 1, r = 18 + ph * 100;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(179,107,255,' + (0.85 * (1 - ph)).toFixed(3) + ')';
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.scale(f, 1);
    if (pose === 'hurt') { ctx.rotate(-0.25); ctx.scale(0.82, 0.82); }

    ctx.lineJoin = 'round';
    
    // 腿
    var la = 0, lb = 0, legTop = 12, legBot = 21.2;
    if (pose === 'run') { la = Math.sin(pt * 16) * 3.5; lb = -la; }
    if (pose === 'rise' || pose === 'hover') legBot = 18;
    if (pose === 'fall') { legTop = 13; }
    ctx.fillStyle = P.botShade; ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5;
    ctx.fillRect(-9 + lb, legTop, 6, legBot - legTop); ctx.strokeRect(-9 + lb, legTop, 6, legBot - legTop);
    ctx.fillStyle = P.botBody;
    ctx.fillRect(3 + la, legTop, 6, legBot - legTop); ctx.strokeRect(3 + la, legTop, 6, legBot - legTop);

    // 螺旋號燃料表(背後)
    if (bot === 'heli' && fuel !== null) {
      ctx.fillStyle = P.visor; ctx.fillRect(-15.5, -7, 4, 18);
      ctx.fillStyle = P.heli; ctx.fillRect(-15.5, -7 + 18 * (1 - fuel), 4, 18 * fuel);
      ctx.lineWidth = 1; ctx.strokeStyle = P.outline; ctx.strokeRect(-15.5, -7, 4, 18);
    }

    // 身體
    rr(ctx, -12, -8, 24, 21, 4);
    ctx.fillStyle = P.botBody; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.fillStyle = c; ctx.fillRect(-11, 3, 22, 4);
    // 頭
    rr(ctx, -10, -20, 20, 13, 4);
    ctx.fillStyle = P.botBody; ctx.fill(); ctx.stroke();
    rr(ctx, -2, -17, 11, 6, 2); ctx.fillStyle = P.visor; ctx.fill();
    if (pose === 'hurt') {
      ctx.strokeStyle = P.danger; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(3, -16); ctx.lineTo(7, -12); ctx.moveTo(7, -16); ctx.lineTo(3, -12); ctx.stroke();
    } else {
      ctx.fillStyle = c; ctx.fillRect(4, -16, 4, 4);
    }

    // 各機兵專屬部件
    if (bot === 'drill') {
      if (pose === 'attack') {
        // 鑽擊: 面向側框外 50x40 內
        ctx.fillStyle = P.botShade; ctx.fillRect(8, -3, 10, 7); ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5; ctx.strokeRect(8, -3, 10, 7);
        ctx.beginPath(); ctx.moveTo(17, -15); ctx.lineTo(64, 0); ctx.lineTo(17, 15); ctx.closePath();
        ctx.fillStyle = P.drill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
        var sp = (pt * 40) % 1;
        ctx.strokeStyle = 'rgba(20,25,34,0.75)'; ctx.lineWidth = 2;
        for (var i = 0; i < 4; i++) {
          var u = (i + sp) / 4, xa = 17 + u * 47, hh = 15 * (1 - u);
          ctx.beginPath(); ctx.moveTo(xa, -hh); ctx.lineTo(xa + 6, hh); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(30, -18); ctx.lineTo(52, -12); ctx.moveTo(30, 18); ctx.lineTo(52, 12); ctx.stroke();
      } else if (pose === 'drill') {
        // 鑽穿: 鑽頭伸進面前一格, 碎屑
        ctx.fillStyle = P.botShade; ctx.fillRect(8, -3, 10, 7);
        ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(40, 0); ctx.lineTo(16, 9); ctx.closePath();
        ctx.fillStyle = P.drill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
        ctx.fillStyle = P.softRockLight;
        var j = Math.floor(pt * 30) % 2;
        ctx.fillRect(28, -14 + j * 3, 4, 4); ctx.fillRect(34, 9 - j * 3, 4, 4); ctx.fillRect(22, -18 + j * 2, 3, 3);
      } else {
        ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(15, 1); ctx.lineTo(8, 5); ctx.closePath();
        ctx.fillStyle = P.drill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
      }
    } else if (bot === 'heli') {
      // 旋翼
      ctx.fillStyle = P.outline; ctx.fillRect(-1, -21, 2, 2);
      var spin = (pose === 'hover' || pose === 'rise') ? 40 : 10, ph2 = pt * spin;
      if (pose === 'hover') {
        ctx.beginPath(); ctx.ellipse(0, -20, 15, 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34,199,192,0.55)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
        // 下方氣流
        ctx.strokeStyle = 'rgba(34,199,192,0.8)'; ctx.lineWidth = 1.5;
        var off = (pt * 30) % 4;
        ctx.beginPath(); ctx.moveTo(-14, 16 + off); ctx.lineTo(-11, 20 + off * 0.5); ctx.moveTo(14, 16 + off); ctx.lineTo(11, 20 + off * 0.5); ctx.stroke();
      } else {
        var bw = Math.max(3, Math.abs(Math.cos(ph2)) * 14);
        rr(ctx, -bw, -21.8, bw * 2, 3, 1.5); ctx.fillStyle = P.heli; ctx.fill();
      }
      // 炮管手
      rr(ctx, 8, -2, 7, 6, 2); ctx.fillStyle = P.botShade; ctx.fill(); ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = P.heli; ctx.fillRect(13, -1, 2, 4);
      if (pose === 'attack' && pt < 0.15) {
        ctx.strokeStyle = P.heli; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(12, 1, 3.5, pt * 40, pt * 40 + Math.PI * 1.4); ctx.stroke();
      }
    } else {
      if (pose === 'attack') {
        // 磁力拳: 面向側框外 60x44 內
        ctx.fillStyle = P.botShade; ctx.fillRect(10, -4, 44, 8);
        ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5; ctx.strokeRect(10, -4, 44, 8);
        rr(ctx, 52, -15, 22, 30, 6); ctx.fillStyle = P.magnet; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(66, -13, 6, 8); ctx.fillRect(66, 5, 6, 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(22, -12); ctx.lineTo(46, -12); ctx.moveTo(22, 12); ctx.lineTo(46, 12); ctx.moveTo(30, -19); ctx.lineTo(46, -19); ctx.stroke();
      } else {
        ctx.lineWidth = 4; ctx.strokeStyle = P.magnet;
        ctx.beginPath(); ctx.arc(10, 2, 3.5, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(8, -4, 3, 3); ctx.fillRect(8, 6, 3, 3);
        if (pose === 'magnet') {
          ctx.beginPath(); ctx.arc(10, 2, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(179,107,255,0.5)'; ctx.fill();
        }
      }
    }

    if (pose === 'hurt') {
      rr(ctx, -12, -20, 24, 33, 4);
      ctx.fillStyle = 'rgba(255,59,59,0.38)'; ctx.fill();
    }
    ctx.restore();
  }

  // ---------- 怪物 ----------
  function hitOverlay(ctx, pathFn) {
    ctx.save(); pathFn(); ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fill(); ctx.restore();
  }
  function enemyEye(ctx, ex, ey, r) {
    ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + r * 0.25, ey, r * 0.55, 0, Math.PI * 2); ctx.fillStyle = P.enemyEye; ctx.fill();
  }

  function drawRoller(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), f = s.facing === -1 ? -1 : 1, t = NC(s.t, 0, 0, 1e7);
    var flying = s.flying === true, r = 15;
    ctx.save();
    ctx.translate(x, y);
    if (flying) speedLines(ctx, f, 16, 16);
    ctx.scale(f, 1);
    var ang = flying ? t * 24 : t * 10;
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = P.roller; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.strokeStyle = P.rollerDark; ctx.lineWidth = 3;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, 0, r - 1.5, i * Math.PI * 2 / 3 - 0.45, i * Math.PI * 2 / 3 + 0.45);
      ctx.lineTo(0, 0); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fillStyle = P.rollerDark; ctx.fill();
    ctx.restore();
    if (flying) {
      ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(5, -9); ctx.lineTo(10, -4); ctx.moveTo(10, -9); ctx.lineTo(5, -4); ctx.stroke();
    } else {
      enemyEye(ctx, 8, -6, 3.5);
    }
    if (s.hit === true) hitOverlay(ctx, function () { ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, Math.PI * 2); });
    ctx.restore();
  }

  function drawBomber(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), f = s.facing === -1 ? -1 : 1;
    var state = pick(s.state, ['walk', 'fuse'], 'walk'), flying = s.flying === true;
    var fd = NC(s.fuseDur, 0.3, 0.01, 10), ft = NC(s.fuseT, fd, 0, 1e6);
    ctx.save();
    ctx.translate(x, y);
    if (flying && state !== 'fuse') speedLines(ctx, f, 14, 14);
    ctx.scale(f, 1);
    if (flying && state !== 'fuse') { ctx.rotate(clock() * 18); ctx.scale(0.88, 0.88); }
    var fusing = state === 'fuse';
    var p = fusing ? C(ft / fd, 0, 1) : 0;
    var br = fusing ? 10 + p * 1.5 : 10, cy = fusing ? 1 : 2;
    // 腳
    if (!flying && !fusing) {
      ctx.fillStyle = P.outline; ctx.fillRect(-7, 11, 4, 3); ctx.fillRect(3, 11, 4, 3);
    }
    // 引信
    ctx.strokeStyle = '#c8b48a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(1, cy - br + 1); ctx.quadraticCurveTo(4, -12, 7, -10); ctx.stroke();
    var spark = Math.floor(clock() * 20) % 2;
    ctx.fillStyle = spark ? '#fff2c0' : P.fire;
    ctx.beginPath(); ctx.arc(7.5, -10.5, fusing ? 3 : 2.2, 0, Math.PI * 2); ctx.fill();
    // 本體
    var bodyCol = P.bomber;
    if (fusing) {
      var freq = 6 + 26 * p;
      bodyCol = (Math.floor(ft * freq * 2) % 2 === 0) ? P.danger : '#ffffff';
    }
    ctx.beginPath(); ctx.arc(0, cy, br, 0, Math.PI * 2);
    ctx.fillStyle = bodyCol; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
    if (!fusing) {
      // 紅色危險帶 + 高光
      ctx.save(); ctx.beginPath(); ctx.arc(0, cy, br - 1, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = P.danger; ctx.fillRect(-br, cy + 2, br * 2, 4);
      ctx.restore();
      ctx.fillStyle = P.bomberHi; ctx.beginPath(); ctx.arc(-4, cy - 5, 2.5, 0, Math.PI * 2); ctx.fill();
      if (flying) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(6, 1); ctx.moveTo(6, -3); ctx.lineTo(2, 1); ctx.stroke();
      } else enemyEye(ctx, 4, -1, 2.8);
    }
    if (s.hit === true) hitOverlay(ctx, function () { ctx.beginPath(); ctx.arc(0, cy, br + 1, 0, Math.PI * 2); });
    ctx.restore();
  }

  function drawCrab(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), f = s.facing === -1 ? -1 : 1;
    var state = pick(s.state, ['walk', 'block'], 'walk'), flying = s.flying === true;
    ctx.save();
    ctx.translate(x, y);
    if (flying) speedLines(ctx, f, 20, 14);
    ctx.scale(f, 1);
    if (flying) { ctx.rotate(Math.sin(clock() * 22) * 0.3); ctx.scale(0.7, -0.7); }
    // 腳
    ctx.strokeStyle = P.crabDark; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var wig = flying ? Math.sin(clock() * 30) * 2 : 0;
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var lx = -12 + i * 6;
      ctx.moveTo(lx, 6); ctx.lineTo(lx - 4, 12.5 + (i % 2 ? wig : -wig));
    }
    ctx.stroke();
    // 軟背(本體)
    ctx.beginPath(); ctx.ellipse(-4, 2, 14, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = P.crab; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-7, 0); ctx.moveTo(-13, 4); ctx.lineTo(-7, 4); ctx.stroke();
    // 眼柄
    ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, -10); ctx.stroke();
    enemyEye(ctx, -2, -11, 2.6);
    // 面向側硬殼: 厚重半圓板 + 鉚釘
    var block = state === 'block';
    ctx.beginPath();
    ctx.moveTo(3, -12); ctx.quadraticCurveTo(18.5, -10, 17, 2); ctx.quadraticCurveTo(16.5, 11, 3, 12); ctx.quadraticCurveTo(9, 0, 3, -12); ctx.closePath();
    ctx.fillStyle = block ? '#ffffff' : P.crabShell; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = P.outline; ctx.stroke();
    ctx.strokeStyle = P.crabShellDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, -9); ctx.quadraticCurveTo(15, 0, 8, 9); ctx.stroke();
    ctx.fillStyle = P.crabShellDark;
    ctx.fillRect(13, -6, 2.5, 2.5); ctx.fillRect(15, 0, 2.5, 2.5); ctx.fillRect(13, 6, 2.5, 2.5);
    if (block) {
      // 擋下: 殼外緣火花短線(框內)
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(15, -10); ctx.lineTo(18, -12.5); ctx.moveTo(15, 8); ctx.lineTo(18, 11); ctx.stroke();
    }
    if (s.hit === true) hitOverlay(ctx, function () { ctx.beginPath(); ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2); });
    ctx.restore();
  }

  function drawHawk(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), f = s.facing === -1 ? -1 : 1, t = NC(s.t, 0, 0, 1e7);
    var state = pick(s.state, ['hover', 'dive', 'return'], 'hover'), flying = s.flying === true;
    ctx.save();
    ctx.translate(x, y);
    if (flying) speedLines(ctx, f, 18, 14);
    ctx.scale(f, 1);
    if (flying) { ctx.rotate(t * 20); ctx.scale(0.72, 0.72); }
    else if (state === 'dive') { ctx.rotate(0.75); ctx.scale(0.76, 0.76); }
    else if (state === 'return') ctx.rotate(-0.18);
    var dive = state === 'dive' && !flying;
    // 尾
    ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(-17, -5); ctx.lineTo(-17, 4); ctx.closePath();
    ctx.fillStyle = P.hawk; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
    // 身體
    ctx.beginPath(); ctx.ellipse(0, 1, 10, 6.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = P.hawk; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1, 3, 6, 3, 0, 0, Math.PI * 2); ctx.fillStyle = P.hawkLight; ctx.fill();
    // 頭 + 喙
    ctx.beginPath(); ctx.arc(9, -3, 5, 0, Math.PI * 2); ctx.fillStyle = P.hawk; ctx.fill(); ctx.strokeStyle = P.outline; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, -4.5); ctx.lineTo(17.5, -1); ctx.lineTo(13, 0); ctx.closePath(); ctx.fillStyle = P.beak; ctx.fill(); ctx.stroke();
    enemyEye(ctx, 10, -4, 2);
    // 翅膀
    var wingY;
    if (dive) {
      // 收翅後掠 + 爪前伸
      ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(-14, -9); ctx.lineTo(-6, 0); ctx.closePath();
      ctx.fillStyle = P.hawkLight; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
      ctx.strokeStyle = P.beak; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(10, 11); ctx.moveTo(0, 6); ctx.lineTo(5, 12); ctx.stroke();
    } else {
      var flapSpeed = state === 'return' ? 7 : 11;
      wingY = Math.sin(t * flapSpeed) * 8;
      if (flying) wingY = 6;
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(5, -2); ctx.lineTo(-6, -5 - wingY); ctx.closePath();
      ctx.fillStyle = P.hawkLight; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.outline; ctx.stroke();
      ctx.strokeStyle = P.beak; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-1, 7); ctx.lineTo(-1, 10); ctx.moveTo(2, 7); ctx.lineTo(2, 10); ctx.stroke();
    }
    if (dive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-16, -9); ctx.moveTo(-4, 9); ctx.lineTo(-14, 9); ctx.stroke();
    }
    if (s.hit === true) hitOverlay(ctx, function () { ctx.beginPath(); ctx.ellipse(1, 0, 16, 10, 0, 0, Math.PI * 2); });
    ctx.restore();
  }

  // ---------- 飛行物 / 特效 ----------
  function drawCycloneShot(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), f = s.facing === -1 ? -1 : 1, t = NC(s.t, 0, 0, 1e7);
    ctx.save();
    ctx.translate(x, y); ctx.scale(f, 1);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = 'rgba(34,199,192,0.22)'; ctx.fill();
    ctx.rotate(-t * 18);
    ctx.lineCap = 'round';
    var radii = [10, 7, 4];
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, 0, radii[i], i * 2.1, i * 2.1 + Math.PI * 1.25);
      ctx.lineWidth = 2.5; ctx.strokeStyle = i === 0 ? P.heli : '#bff7f3'; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  function drawExplosion(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), dur = NC(s.dur, 0.3, 0.01, 10), t = NC(s.t, 0, 0, 1e6);
    var R = NC(s.radius, 90, 4, 2000);
    if (t >= dur) return;
    var p = t / dur, e = 1 - (1 - p) * (1 - p);
    ctx.save();
    var rf = R * (0.35 + 0.65 * e), a = 1 - p * 0.75;
    var g = ctx.createRadialGradient(x, y, 0, x, y, rf);
    g.addColorStop(0, 'rgba(255,242,192,' + a.toFixed(3) + ')');
    g.addColorStop(0.45, 'rgba(255,154,46,' + (a * 0.9).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,59,59,' + (a * 0.35).toFixed(3) + ')');
    ctx.beginPath(); ctx.arc(x, y, rf, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    // 判定外緣: 紅環外緣 = radius
    ctx.beginPath(); ctx.arc(x, y, R - 1.5, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,59,59,' + (0.95 - p * 0.6).toFixed(3) + ')'; ctx.stroke();
    // 放射碎片
    ctx.strokeStyle = 'rgba(255,242,192,' + a.toFixed(3) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (var i = 0; i < 8; i++) {
      var an = i * Math.PI / 4 + 0.3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(an) * rf * 0.55, y + Math.sin(an) * rf * 0.55);
      ctx.lineTo(x + Math.cos(an) * rf * 0.85, y + Math.sin(an) * rf * 0.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPoof(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), dur = NC(s.dur, 0.3, 0.01, 10), t = NC(s.t, 0, 0, 1e6);
    if (t >= dur) return;
    var p = t / dur;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    for (var i = 0; i < 5; i++) {
      var an = i * Math.PI * 2 / 5 - Math.PI / 2, d = 5 + 11 * p, r = 9 - 3 * p;
      ctx.beginPath(); ctx.arc(x + Math.cos(an) * d, y + Math.sin(an) * d, r, 0, Math.PI * 2);
      ctx.fillStyle = P.smoke; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, 7 * (1 - p), 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  }

  function drawChainText(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), n = Math.floor(NC(s.n, 2, 2, 999));
    var dur = NC(s.dur, 0.8, 0.01, 10), t = NC(s.t, 0, 0, 1e6);
    if (t >= dur) return;
    var p = t / dur, dy = -30 * p, a = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
    var pop = 1 + (n >= 4 ? 0.1 : 0.25) * Math.max(0, 1 - p * 6);
    var fs = n >= 4 ? 30 : (n === 3 ? 26 : 22);
    var label = n + ' 連鎖';
    var w = tw(ctx, label, fs, true);
    var maxW = n >= 4 ? 96 : 112;
    if (w * pop > maxW) fs = fs * maxW / (w * pop);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y + dy); var bst = textBoost(ctx); ctx.scale(pop * bst, pop * bst);
    if (n >= 4) {
      // 最醒目: 深色底牌 + 放射線
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (var i = 0; i < 8; i++) {
        var an = i * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(Math.cos(an) * 44, Math.sin(an) * 11); ctx.lineTo(Math.cos(an) * 51, Math.sin(an) * 14); ctx.stroke();
      }
      rr(ctx, -44, -14, 88, 28, 8); ctx.fillStyle = 'rgba(16,20,30,0.85)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
    txt(ctx, label, 0, 1, { size: fs, bold: true, align: 'center', color: '#ffffff', stroke: P.outline, sw: n >= 3 ? 5 : 4 });
    ctx.restore();
  }

  function drawPopup(ctx, s) {
    s = obj(s);
    var x = N(s.x, 0), y = N(s.y, 0), kind = pick(s.kind, KINDS, 'ore'), v = Math.floor(NC(s.value, 1, 0, 99));
    var dur = NC(s.dur, 0.8, 0.01, 10), t = NC(s.t, 0, 0, 1e6);
    if (t >= dur) return;
    var p = t / dur, a = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y - 30 * p);
    var bst2 = textBoost(ctx); if (bst2 !== 1) ctx.scale(bst2, bst2);
    var label = '+' + v, w = tw(ctx, label, 18, true), total = w + 4 + 18;
    var lx = -total / 2;
    txt(ctx, label, lx, 1, { size: 18, bold: true, color: '#ffffff', stroke: P.outline, sw: 4 });
    matShape(ctx, kind, lx + w + 4 + 9, 0, 18);
    ctx.restore();
  }

  // ---------- 大地圖卡片 ----------
  function drawLevelCard(ctx, s) {
    s = obj(s);
    var x = N(s.x, 30), y = N(s.y, 50), idx = Math.floor(NC(s.index, 1, 1, 99));
    var name = str(s.name, ''), state = pick(s.state, ['locked', 'open', 'cleared'], 'locked');
    var rates = mats(s.rates), rbot = pick(s.recordBot, BOTS, 'drill'), rtime = NC(s.recordTime, 0, 0, 1e6);
    var builds = Array.isArray(s.builds) ? s.builds : [];
    var lv = Math.floor(NC(s.speedLv, 0, 0, 2)), afford = s.canAfford === true;
    ctx.save();
    panelBox(ctx, x, y, 400, 290);
    // 縮圖區
    if (state === 'locked') {
      rr(ctx, x + 8, y + 8, 384, 216, 6); ctx.fillStyle = '#10151e'; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, 384, 216); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 10;
      ctx.beginPath();
      for (var k = -216; k < 384; k += 36) { ctx.moveTo(x + 8 + k, y + 224); ctx.lineTo(x + 8 + k + 216, y + 8); }
      ctx.stroke(); ctx.restore();
      lockIcon(ctx, x + 200, y + 78, 52, afford ? P.text : P.lack);
      ctx.font = font(18, true);
      var cw = 0;
      // 先量寬度再置中
      var cost = mats(s.cost), parts = 0;
      for (var i = 0; i < KINDS.length; i++) if (cost[KINDS[i]] > 0) { parts++; cw += 18 * 1.3 + tw(ctx, fmtInt(cost[KINDS[i]]), 18, true) + 18 * 0.8; }
      if (!parts) cw = tw(ctx, '免費', 18, false) + 14;
      costRow(ctx, x + 200 - (cw - 14) / 2, y + 138, cost, afford, 18);
      if (afford) {
        keyHints(ctx, [['Z', '解鎖']], x + 200, y + 182, 16);
      } else {
        txt(ctx, '素材不足', x + 200, y + 182, { size: 16, align: 'center', color: P.lack, bold: true });
      }
    } else {
      ctx.strokeStyle = state === 'cleared' ? '#6c7c96' : P.panelEdge; ctx.lineWidth = 2;
      ctx.strokeRect(x + 7, y + 7, 386, 218);
    }
    // 文字區
    var ty1 = y + 246, ty2 = y + 275;
    txt(ctx, '第 ' + idx + ' 關', x + 14, ty1, { size: 14, color: P.textDim });
    txt(ctx, name, x + 64, ty1, { size: 20, bold: true, color: state === 'locked' ? P.textDim : P.text });
    if (state === 'cleared') {
      // 右上: 回放機兵 + 秒數
      var tstr = fmt1(rtime) + ' 秒';
      var twd = tw(ctx, tstr, 16, true);
      txt(ctx, tstr, x + 388, ty1, { size: 16, bold: true, align: 'right' });
      botIcon(ctx, rbot, x + 388 - twd - 16, ty1, 22);
      // 加速
      var sx = x + 388 - twd - 34 - 84;
      speedBar(ctx, sx, ty1 - 6, lv, 16, 12);
      txt(ctx, SPEED_LABEL[lv], sx + 38, ty1, { size: 14, bold: true, color: lv ? P.text : P.textDim });
      // 下排: 每分鐘產量
      var rx = x + 14;
      for (i = 0; i < KINDS.length; i++) {
        matShape(ctx, KINDS[i], rx + 8, ty2, 16);
        var rs = fmt1(rates[KINDS[i]]);
        txt(ctx, rs, rx + 19, ty2, { size: 15, bold: true, color: rates[KINDS[i]] > 0 ? P.text : P.textDim });
        rx += 19 + tw(ctx, rs, 15, true) + 10;
      }
      txt(ctx, '/分', rx - 6, ty2, { size: 13, color: P.textDim });
      // 改造樁 3 格
      var bx = x + 262;
      for (i = 0; i < 3; i++) buildIcon(ctx, pick(builds[i], BUILDS, 'none'), bx + i * 22, ty2, 18);
      keyHints(ctx, [['X', '改造']], x + 358, ty2, 14);
    } else if (state === 'open') {
      txt(ctx, '未過關', x + 14, ty2, { size: 16, bold: true, color: P.textDim });
    } else {
      txt(ctx, '未開放', x + 14, ty2, { size: 16, color: P.lack });
    }
    if (s.selected === true) selectFrame(ctx, x, y, 400, 290);
    ctx.restore();
  }

  function drawBotCard(ctx, s) {
    s = obj(s);
    var x = N(s.x, 30), y = N(s.y, 350), bot = pick(s.bot, BOTS, 'drill');
    var name = str(s.name, BOT_NAME[bot]), state = pick(s.state, ['locked', 'owned', 'active'], 'locked');
    var afford = s.canAfford === true, c = BOT_COLOR[bot];
    var spec = { drill: '鑽穿軟岩 / 進礦坑', heli: '懸停 / 上高台', magnet: '磁吸 / 開倉庫' }[bot];
    ctx.save();
    panelBox(ctx, x, y, 400, 140, state === 'active' ? c : P.panelEdge);
    if (state === 'active') {
      rr(ctx, x + 2, y + 2, 396, 136, 11); ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke();
    }
    // 頭像
    rr(ctx, x + 14, y + 14, 112, 112, 10); ctx.fillStyle = '#121822'; ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 14, y + 14, 112, 112); ctx.clip();
    if (state === 'locked') ctx.globalAlpha = 0.28;
    ctx.translate(x + 66, y + 72); ctx.scale(2, 2);
    drawPlayer(ctx, { x: 0, y: 0, bot: bot, facing: 1, pose: 'idle', poseT: 0, fuel: bot === 'heli' ? 1 : null, invuln: false });
    ctx.restore();
    if (state === 'locked') lockIcon(ctx, x + 70, y + 70, 36, P.text);
    txt(ctx, name, x + 142, y + 36, { size: 24, bold: true, color: state === 'locked' ? P.textDim : P.text });
    ctx.fillStyle = c; ctx.fillRect(x + 142, y + 54, 28, 4);
    txt(ctx, spec, x + 142, y + 76, { size: 16, color: P.text });
    if (state === 'locked') {
      var ex = costRow(ctx, x + 142, y + 112, s.cost, afford, 16);
      if (afford) keyHints(ctx, [['Z', '解鎖']], Math.min(x + 352, ex + 40), y + 112, 14);
      else txt(ctx, '不足', ex, y + 112, { size: 14, bold: true, color: P.lack });
    } else if (state === 'owned') {
      txt(ctx, '已擁有', x + 142, y + 112, { size: 16, color: P.textDim });
      keyHints(ctx, [['Z', '換上']], x + 250, y + 112, 14);
    } else {
      rr(ctx, x + 142, y + 98, 82, 28, 6); ctx.fillStyle = c; ctx.fill();
      txt(ctx, '出擊中', x + 183, y + 112, { size: 16, bold: true, align: 'center', color: P.outline });
    }
    if (s.selected === true) selectFrame(ctx, x, y, 400, 140);
    ctx.restore();
  }

  function drawGoalCard(ctx, s) {
    s = obj(s);
    var x = N(s.x, 30), y = N(s.y, 510), afford = s.canAfford === true;
    ctx.save();
    panelBox(ctx, x, y, 1220, 110, afford ? '#c9d2de' : P.panelEdge);
    rr(ctx, x + 12, y + 10, 120, 90, 10); ctx.fillStyle = '#121822'; ctx.fill();
    titanIcon(ctx, x + 72, y + 58, 84, afford);
    txt(ctx, '巨神機', x + 152, y + 38, { size: 28, bold: true });
    txt(ctx, '終極目標 · 買下即勝利', x + 152, y + 78, { size: 16, color: P.textDim });
    costRow(ctx, x + 520, y + 55, s.cost, afford, 22);
    if (afford) keyHints(ctx, [['Z', '購買']], x + 1120, y + 55, 18);
    else txt(ctx, '素材不足', x + 1120, y + 55, { size: 18, bold: true, align: 'center', color: P.lack });
    if (s.selected === true) selectFrame(ctx, x, y, 1220, 110);
    ctx.restore();
  }

  // ---------- 改造面板 ----------
  function drawBuildPanel(ctx, s) {
    s = obj(s);
    var X = 40, Y = 60;
    var li = Math.floor(NC(s.levelIndex, 1, 1, 99)), lname = str(s.levelName, '');
    var col = Math.floor(NC(s.col, 0, 0, 3)), opt = Math.floor(NC(s.opt, 0, 0, 4));
    var builds = Array.isArray(s.builds) ? s.builds : [];
    var options = Array.isArray(s.options) ? s.options : [];
    var slotPos = Array.isArray(s.slotPos) ? s.slotPos : [];
    var lv = Math.floor(NC(s.speedLv, 0, 0, 2));
    var i;
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,10,0.66)'; ctx.fillRect(0, 0, W, H);
    panelBox(ctx, X, Y, 1200, 600);
    txt(ctx, '第 ' + li + ' 關 ' + lname + ' 改造', X + 20, Y + 38, { size: 26, bold: true });
    // 預覽外框
    ctx.strokeStyle = '#6c7c96'; ctx.lineWidth = 2; ctx.strokeRect(X + 19, Y + 69, 642, 362);
    // 樁標籤列 (20,440) 640x40
    for (i = 0; i < 3; i++) {
      var sp = slotPos[i], sxp;
      if (Array.isArray(sp)) sxp = N(sp[0], NaN); else sxp = N(obj(sp).x, NaN);
      if (!isFinite(sxp)) sxp = X + 20 + 640 * (i + 1) / 4;
      sxp = C(sxp, X + 20 + 40, X + 660 - 40);
      var on = col === i, bb = pick(builds[i], BUILDS, 'none');
      ctx.beginPath(); ctx.moveTo(sxp, Y + 433); ctx.lineTo(sxp - 7, Y + 443); ctx.lineTo(sxp + 7, Y + 443); ctx.closePath();
      ctx.fillStyle = on ? P.select : 'rgba(255,255,255,0.25)'; ctx.fill();
      rr(ctx, sxp - 40, Y + 445, 80, 32, 6);
      ctx.fillStyle = on ? P.select : P.panelHi; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = on ? P.select : P.panelEdge; ctx.stroke();
      txt(ctx, (i + 1) + ' 號', sxp - 30, Y + 461, { size: 16, bold: true, color: on ? P.outline : P.text });
      ctx.save(); if (on) { rr(ctx, sxp + 8, Y + 449, 26, 24, 4); ctx.fillStyle = P.panel; ctx.fill(); }
      buildIcon(ctx, bb, sxp + 21, Y + 461, 18); ctx.restore();
    }
    // 右側分頁
    var RX = X + 680, RY = Y + 70, tabs = ['1 號', '2 號', '3 號', '加速'];
    for (i = 0; i < 4; i++) {
      var tx = RX + i * 126, sel = col === i;
      rr(ctx, tx, RY, 120, 40, 6);
      ctx.fillStyle = sel ? P.select : P.panelHi; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = sel ? P.select : P.panelEdge; ctx.stroke();
      txt(ctx, tabs[i], tx + (i < 3 ? 38 : 60), RY + 20, { size: 18, bold: true, align: 'center', color: sel ? P.outline : P.text });
      if (i < 3) {
        ctx.save(); if (sel) { rr(ctx, tx + 72, RY + 7, 28, 26, 4); ctx.fillStyle = P.panel; ctx.fill(); }
        buildIcon(ctx, pick(builds[i], BUILDS, 'none'), tx + 86, RY + 20, 20); ctx.restore();
      }
    }
    var CY = RY + 56;
    if (col < 3) {
      var cur = pick(builds[col], BUILDS, 'none');
      if (cur === 'none') {
        for (i = 0; i < 5; i++) {
          var b = BUILD_ORDER[i], o = obj(options[i]), ok = o.canAfford === true, iy = CY + i * 66, isSel = opt === i;
          rr(ctx, RX, iy, 500, 58, 8);
          ctx.fillStyle = isSel ? '#2f3b4f' : P.panelHi; ctx.fill();
          if (isSel) { ctx.lineWidth = 3; ctx.strokeStyle = P.select; ctx.stroke(); }
          ctx.save(); if (!ok) ctx.globalAlpha = 0.5; buildIcon(ctx, b, RX + 32, iy + 29, 36); ctx.restore();
          txt(ctx, BUILD_NAME[b], RX + 62, iy + 19, { size: 18, bold: true, color: ok ? P.text : P.textDim });
          txt(ctx, BUILD_EFFECT[b], RX + 62, iy + 42, { size: 14, color: P.textDim });
          var cmat = mats(o.cost), cw2 = 0, n2 = 0;
          for (var k2 = 0; k2 < KINDS.length; k2++) if (cmat[KINDS[k2]] > 0) { n2++; cw2 += 16 * 1.3 + tw(ctx, fmtInt(cmat[KINDS[k2]]), 16, true) + 16 * 0.8; }
          if (!n2) cw2 = tw(ctx, '免費', 16, false) + 13;
          var endX = RX + 490 - (ok ? 0 : 40);
          costRow(ctx, endX - cw2 + 13, iy + 29, cmat, ok, 16);
          if (!ok) txt(ctx, '不足', RX + 490, iy + 29, { size: 14, bold: true, align: 'right', color: P.lack });
        }
      } else {
        rr(ctx, RX, CY, 500, 150, 10); ctx.fillStyle = P.panelHi; ctx.fill();
        buildIcon(ctx, cur, RX + 70, CY + 75, 80);
        txt(ctx, '已蓋: ' + BUILD_NAME[cur], RX + 140, CY + 58, { size: 26, bold: true });
        txt(ctx, BUILD_EFFECT[cur], RX + 140, CY + 98, { size: 16, color: P.textDim });
      }
    } else {
      rr(ctx, RX, CY, 500, 300, 10); ctx.fillStyle = P.panelHi; ctx.fill();
      txt(ctx, '回放加速', RX + 24, CY + 34, { size: 22, bold: true });
      speedBar(ctx, RX + 24, CY + 66, lv, 90, 26);
      for (i = 0; i < 3; i++) {
        txt(ctx, SPEED_LABEL[i], RX + 24 + i * 93, CY + 116, { size: 16, bold: i === lv, align: i === 0 ? 'left' : 'center', color: i === lv ? P.text : P.textDim });
      }
      txt(ctx, '目前 ' + SPEED_LABEL[lv], RX + 240, CY + 79, { size: 20, bold: true });
      if (lv >= 2 || s.speedCost === null || s.speedCost === undefined) {
        txt(ctx, '加速已滿', RX + 24, CY + 190, { size: 22, bold: true, color: P.textDim });
      } else {
        var sok = s.speedCanAfford === true;
        txt(ctx, '升到 ' + SPEED_LABEL[lv + 1], RX + 24, CY + 170, { size: 18, bold: true, color: sok ? P.text : P.textDim });
        var ex2 = costRow(ctx, RX + 24, CY + 210, s.speedCost, sok, 20);
        if (!sok) txt(ctx, '不足', ex2, CY + 210, { size: 16, bold: true, color: P.lack });
      }
    }
    txt(ctx, '蓋好的設施, 下一趟進關才會出現', RX, Y + 512, { size: 15, color: P.textDim });
    keyHints(ctx, [['←→', '選欄'], ['↑↓', '選項'], ['Z', '蓋下去'], ['X', '關閉']], X + 600, Y + 568, 16);
    ctx.restore();
  }

  // ---------- 資訊列 ----------
  function stockItem(ctx, kind, x, cy, value, rate, px) {
    matShape(ctx, kind, x + 11, cy, 22);
    var v = fmtInt(value);
    txt(ctx, v, x + 28, cy, { size: px, bold: true });
    var w = tw(ctx, v, px, true);
    if (rate !== null) txt(ctx, '+' + fmt1(rate) + '/分', x + 34 + w, cy + 1, { size: 13, color: P.textDim });
  }

  function drawHud(ctx, s) {
    s = obj(s);
    var mode = pick(s.mode, ['map', 'level'], 'map');
    var stock = mats(s.stock), rate = mats(s.ratePerMin);
    var i;
    ctx.save();
    ctx.fillStyle = P.hud; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 39, W, 1);
    if (mode === 'map') {
      for (i = 0; i < 3; i++) stockItem(ctx, KINDS[i], 20 + i * 230, 20, stock[KINDS[i]], rate[KINDS[i]], 20);
    } else {
      for (i = 0; i < 3; i++) stockItem(ctx, KINDS[i], 12 + i * 172, 20, stock[KINDS[i]], rate[KINDS[i]], 18);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(530, 8, 1, 24);
      // 這趟
      var run = mats(s.run);
      txt(ctx, '這趟', 544, 20, { size: 13, color: P.textDim });
      for (i = 0; i < 3; i++) {
        var rx = 580 + i * 72;
        matShape(ctx, KINDS[i], rx + 8, 20, 16);
        txt(ctx, '+' + fmtInt(run[KINDS[i]]), rx + 19, 20, { size: 16, bold: true, color: run[KINDS[i]] > 0 ? P.text : P.textDim });
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(800, 8, 1, 24);
      // 血量
      var maxHp = Math.floor(NC(s.maxHp, 3, 1, 10)), hp = Math.floor(NC(s.hp, maxHp, 0, maxHp));
      for (i = 0; i < maxHp; i++) heart(ctx, 824 + i * 24, 20, 18, i < hp);
      // 機兵 + 技能冷卻
      var bot = pick(s.bot, BOTS, 'drill'), c = BOT_COLOR[bot];
      var cdd = NC(s.skillCdDur, 1, 0.001, 1e4), cdt = NC(s.skillCdT, cdd, 0, 1e6), ready = cdt >= cdd;
      var bx = 824 + maxHp * 24 + 16;
      botIcon(ctx, bot, bx + 12, 20, 24);
      var dx = bx + 46;
      ctx.beginPath(); ctx.arc(dx, 20, 13, 0, Math.PI * 2);
      ctx.fillStyle = ready ? c : '#121822'; ctx.fill();
      if (!ready) {
        ctx.beginPath(); ctx.moveTo(dx, 20); ctx.arc(dx, 20, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cdt / cdd)); ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(dx, 20, 13, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = ready ? '#ffffff' : P.textDim; ctx.stroke();
      txt(ctx, 'X', dx, 21, { size: 14, bold: true, align: 'center', color: ready ? P.outline : P.textDim });
      // 秒數
      txt(ctx, fmt1(s.time) + ' 秒', 1266, 20, { size: 20, bold: true, align: 'right' });
    }
    ctx.restore();
  }

  // ---------- 面板 ----------
  function drawResultPanel(ctx, s) {
    s = obj(s);
    var X = 280, Y = 150, bot = pick(s.bot, BOTS, 'drill'), run = mats(s.run), rates = mats(s.rates), i;
    ctx.save();
    panelBox(ctx, X, Y, 720, 420, '#c9d2de');
    txt(ctx, '過關', X + 360, Y + 58, { size: 44, bold: true, align: 'center' });
    botIcon(ctx, bot, X + 60, Y + 58, 44);
    txt(ctx, BOT_NAME[bot], X + 90, Y + 58, { size: 16, color: P.textDim });
    txt(ctx, fmt1(s.time) + ' 秒', X + 660, Y + 58, { size: 26, bold: true, align: 'right' });
    // 這趟素材
    rr(ctx, X + 40, Y + 110, 640, 64, 8); ctx.fillStyle = P.panelHi; ctx.fill();
    txt(ctx, '這趟取得', X + 60, Y + 142, { size: 16, color: P.textDim });
    for (i = 0; i < 3; i++) {
      matShape(ctx, KINDS[i], X + 210 + i * 150, Y + 142, 28);
      txt(ctx, fmtInt(run[KINDS[i]]), X + 232 + i * 150, Y + 142, { size: 24, bold: true, color: run[KINDS[i]] > 0 ? P.text : P.textDim });
    }
    rr(ctx, X + 40, Y + 186, 640, 64, 8); ctx.fillStyle = P.panelHi; ctx.fill();
    txt(ctx, '回放每分鐘', X + 60, Y + 218, { size: 16, color: P.textDim });
    for (i = 0; i < 3; i++) {
      matShape(ctx, KINDS[i], X + 210 + i * 150, Y + 218, 24);
      txt(ctx, fmt1(rates[KINDS[i]]), X + 230 + i * 150, Y + 218, { size: 22, bold: true, color: rates[KINDS[i]] > 0 ? P.text : P.textDim });
    }
    // 存檔狀態
    var rep = s.replaced === true, msg = rep ? '已取代舊回放' : '已存成回放';
    var mw = tw(ctx, msg, 20, true) + 48;
    rr(ctx, X + 360 - mw / 2, Y + 278, mw, 40, 20);
    ctx.fillStyle = rep ? '#3a3f4c' : '#24384a'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.text; ctx.stroke();
    // 圖示: 取代 = 循環箭頭, 首次 = 圓點
    var ix = X + 360 - mw / 2 + 22, iy = Y + 298;
    ctx.strokeStyle = P.text; ctx.lineWidth = 2;
    if (rep) {
      ctx.beginPath(); ctx.arc(ix, iy, 7, 0.3, Math.PI * 1.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix + 7, iy - 7); ctx.lineTo(ix + 7, iy - 1); ctx.lineTo(ix + 1, iy - 3); ctx.closePath(); ctx.fillStyle = P.text; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(ix, iy, 5, 0, Math.PI * 2); ctx.fillStyle = P.text; ctx.fill();
    }
    txt(ctx, msg, ix + 16, iy, { size: 20, bold: true });
    keyHints(ctx, [['Z', '回大地圖'], ['X', '再跑一次']], X + 360, Y + 376, 18);
    ctx.restore();
  }

  function drawFailPanel(ctx) {
    var X = 380, Y = 240;
    ctx.save();
    panelBox(ctx, X, Y, 520, 240, P.danger);
    txt(ctx, '失敗', X + 260, Y + 86, { size: 48, bold: true, align: 'center', color: P.danger });
    keyHints(ctx, [['Z', '重來'], ['X', '回大地圖']], X + 260, Y + 180, 18);
    ctx.restore();
  }

  function drawPausePanel(ctx, s) {
    s = obj(s);
    var mode = pick(s.mode, ['level', 'map'], 'level'), X = 380, Y = 220;
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,10,0.6)'; ctx.fillRect(0, 0, W, H);
    panelBox(ctx, X, Y, 520, 280);
    // 暫停符號
    ctx.fillStyle = P.text; ctx.fillRect(X + 196, Y + 52, 10, 36); ctx.fillRect(X + 214, Y + 52, 10, 36);
    txt(ctx, '暫停', X + 240, Y + 70, { size: 40, bold: true });
    if (mode === 'level') {
      keyHints(ctx, [['Esc', '繼續'], ['Z', '重來'], ['X', '回大地圖']], X + 260, Y + 160, 18);
      txt(ctx, '回大地圖: 這趟不算, 舊回放保留', X + 260, Y + 222, { size: 15, align: 'center', color: P.textDim });
    } else {
      keyHints(ctx, [['Esc', '繼續']], X + 260, Y + 170, 18);
    }
    ctx.restore();
  }

  function drawEndingPanel(ctx, s) {
    s = obj(s);
    var X = 280, Y = 150, tt = Math.floor(NC(s.totalTime, 0, 0, 1e8));
    var m = Math.floor(tt / 60), sec = tt % 60;
    ctx.save();
    panelBox(ctx, X, Y, 720, 420, '#c9d2de');
    titanIcon(ctx, X + 360, Y + 120, 150, true);
    txt(ctx, '巨神機啟動', X + 360, Y + 238, { size: 40, bold: true, align: 'center' });
    txt(ctx, '總遊玩時間  ' + m + ':' + (sec < 10 ? '0' : '') + sec, X + 360, Y + 296, { size: 24, bold: true, align: 'center', color: P.text });
    keyHints(ctx, [['Z', '重新開始']], X + 360, Y + 370, 18);
    ctx.restore();
  }

  // ---------- 說明頁示意圖 ----------
  // 只畫在 (x,y,w,h) 內; 頁標題、說明文字、頁碼、翻頁提示由 RD 畫。
  var GUIDE_SIZE = [[480, 264], [600, 220], [480, 300], [560, 240]];

  function lbl(ctx, s, x, y, px, k) {
    txt(ctx, s, x, y, { size: px / k, bold: true, align: 'center', color: '#ffffff', stroke: P.outline, sw: 4 / k });
  }
  function arrowHead(ctx, x, y, ang, sz) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(ang - 0.5) * sz, y - Math.sin(ang - 0.5) * sz);
    ctx.lineTo(x - Math.cos(ang + 0.5) * sz, y - Math.sin(ang + 0.5) * sz);
    ctx.closePath(); ctx.fill();
  }
  function frameBg(ctx, x, y, w, h) {
    rr(ctx, x, y, w, h, 8); ctx.fillStyle = '#0f141d'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = P.panelEdge; ctx.stroke();
  }
  function groundRow(ctx, c0, c1, row) {
    for (var c = c0; c <= c1; c++) drawGround(ctx, { x: c * 40 + 20, y: row * 40 + 20, top: true });
  }

  function guide1(ctx, k) {
    frameBg(ctx, 0, 0, 480, 264);
    ctx.save();
    rr(ctx, 0, 0, 480, 264, 8); ctx.clip();
    ctx.scale(0.6, 0.6);
    drawBackground(ctx);
    for (var c = 0; c < 20; c++) {
      drawGround(ctx, { x: c * 40 + 20, y: 380, top: c !== 6 });
      drawGround(ctx, { x: c * 40 + 20, y: 420, top: false });
    }
    drawGround(ctx, { x: 260, y: 340, top: true });
    drawPickup(ctx, { x: 260, y: 304, kind: 'ore', t: 0.3 });
    drawRoller(ctx, { x: 410, y: 344, facing: -1, flying: false, hit: false, t: 0.2 });
    drawRoller(ctx, { x: 446, y: 344, facing: -1, flying: false, hit: false, t: 0.7 });
    drawBomber(ctx, { x: 482, y: 346, facing: -1, state: 'walk', flying: false, hit: false, fuseT: 0.3, fuseDur: 0.3 });
    drawBomber(ctx, { x: 514, y: 346, facing: -1, state: 'walk', flying: false, hit: false, fuseT: 0.3, fuseDur: 0.3 });
    drawGoal(ctx, { x: 740, y: 320, reached: false });
    drawPlayer(ctx, { x: 60, y: 338, bot: 'drill', facing: 1, pose: 'idle', poseT: 0, fuel: null, invuln: false });
    // 虛線路線: 你 → 礦石 → 終點旗
    ctx.save();
    ctx.setLineDash([12, 9]); ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(84, 322); ctx.quadraticCurveTo(170, 230, 248, 286);
    ctx.moveTo(276, 286); ctx.quadraticCurveTo(470, 150, 700, 300); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = '#ffffff';
    arrowHead(ctx, 704, 304, Math.atan2(300 - 225, 700 - 585), 18);
    ctx.restore();
    ctx.restore();
    lbl(ctx, '你', 36, 176, 15, k);
    lbl(ctx, '終點旗', 444, 158, 15, k);
  }

  function guide2(ctx, k) {
    var i, x0;
    for (i = 0; i < 4; i++) {
      x0 = i * 152;
      frameBg(ctx, x0, 0, 144, 220);
      ctx.save();
      rr(ctx, x0, 0, 144, 220, 8); ctx.clip();
      for (var c = 0; c < 4; c++) drawGround(ctx, { x: x0 + 20 + c * 40, y: 200, top: true });
      ctx.restore();
    }
    // 1. ←→ 跑
    x0 = 0;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0 + 34, 146); ctx.lineTo(x0 + 50, 146); ctx.moveTo(x0 + 28, 160); ctx.lineTo(x0 + 48, 160); ctx.moveTo(x0 + 34, 172); ctx.lineTo(x0 + 50, 172); ctx.stroke(); ctx.restore();
    drawPlayer(ctx, { x: x0 + 76, y: 158, bot: 'drill', facing: 1, pose: 'run', poseT: 0.1, fuel: null, invuln: false });
    keyCap(ctx, '←', x0 + 58, 112, 15); keyCap(ctx, '→', x0 + 94, 112, 15);
    // 2. 空白鍵 跳
    x0 = 152;
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0 + 40, 178); ctx.quadraticCurveTo(x0 + 52, 120, x0 + 66, 122); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(207,213,223,0.6)';
    ctx.beginPath(); ctx.arc(x0 + 34, 176, 4, 0, Math.PI * 2); ctx.arc(x0 + 46, 177, 3, 0, Math.PI * 2); ctx.fill();
    drawPlayer(ctx, { x: x0 + 78, y: 100, bot: 'drill', facing: 1, pose: 'rise', poseT: 0.1, fuel: null, invuln: false });
    keyCap(ctx, '空白鍵', x0 + 78, 46, 15);
    // 3. Z 鑽擊, 滾石蟲被擊飛(血 2 → 剩 1, 還活著)
    x0 = 304;
    drawPlayer(ctx, { x: x0 + 26, y: 158, bot: 'drill', facing: 1, pose: 'attack', poseT: 0.05, fuel: null, invuln: false });
    drawRoller(ctx, { x: x0 + 126, y: 150, facing: 1, flying: true, hit: false, t: 0.3 });
    keyCap(ctx, 'Z', x0 + 26, 112, 15);
    // 4. X 鑽穿面前一格軟岩
    x0 = 456;
    drawSoftRock(ctx, { x: x0 + 90, y: 120 });
    drawPlayer(ctx, { x: x0 + 48, y: 158, bot: 'drill', facing: 1, pose: 'drill', poseT: 0.05, fuel: null, invuln: false });
    drawPoof(ctx, { x: x0 + 92, y: 160, t: 0.08, dur: 0.3 });
    ctx.fillStyle = P.softRock;
    var chips = [[104, 146, 6], [116, 156, 5], [110, 172, 6], [124, 166, 4], [98, 170, 4]];
    for (i = 0; i < chips.length; i++) ctx.fillRect(x0 + chips[i][0], chips[i][1], chips[i][2], chips[i][2]);
    keyCap(ctx, 'X', x0 + 34, 112, 15);
  }

  function guide3(ctx, k) {
    // 頂端資訊列片段: 礦石 12 → 13
    rr(ctx, 120, 2, 240, 38, 6); ctx.fillStyle = P.hud; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = P.panelEdge; ctx.stroke();
    matShape(ctx, 'ore', 146, 21, 22);
    txt(ctx, '12', 164, 21, { size: 20, bold: true, color: P.textDim });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(196, 20, 26, 2); arrowHead(ctx, 232, 21, 0, 11);
    txt(ctx, '13', 244, 21, { size: 24, bold: true, color: '#ffffff' });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(244, 34, 28, 2);
    // 已過關的關卡卡片
    var cs = 0.82, cx = 76, cy = 52;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(cs, cs);
    drawLevelCard(ctx, { x: 0, y: 0, index: 1, name: '廢料場', state: 'cleared', rates: { ore: 4.5, battery: 0, gear: 0 }, recordBot: 'drill', recordTime: 13.2, builds: ['none', 'none', 'none'], speedLv: 0, cost: { ore: 0, battery: 0, gear: 0 }, canAfford: true, selected: false });
    // 縮圖: 剛才那趟的重演(放大局部)
    ctx.save();
    ctx.beginPath(); ctx.rect(8, 8, 384, 216); ctx.clip();
    ctx.translate(8, 8); ctx.scale(0.8, 0.8);
    drawBackground(ctx);
    for (var c = 0; c < 12; c++) { drawGround(ctx, { x: c * 40 + 20, y: 220, top: true }); drawGround(ctx, { x: c * 40 + 20, y: 260, top: false }); }
    for (var r = 2; r < 5; r++) drawGround(ctx, { x: 420, y: r * 40 + 20, top: r === 2 });
    drawPlayer(ctx, { x: 80, y: 178, bot: 'drill', facing: 1, pose: 'attack', poseT: 0.05, fuel: null, invuln: false });
    ctx.save(); ctx.setLineDash([8, 7]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(150, 176); ctx.lineTo(362, 176); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.5;
    drawRoller(ctx, { x: 250, y: 176, facing: 1, flying: true, hit: false, t: 0.4 });
    ctx.restore();
    drawPoof(ctx, { x: 384, y: 182, t: 0.1, dur: 0.3 });
    ctx.restore();
    ctx.restore();
    // +1 浮字(外層原尺寸)與連到資訊列的虛線
    var px = cx + (8 + 384 * 0.8) * cs, py = cy + (8 + 132 * 0.8) * cs;
    drawPopup(ctx, { x: px, y: py, t: 0.2, dur: 0.8, kind: 'ore', value: 1 });
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + 8, py - 22); ctx.quadraticCurveTo(px + 30, 60, 286, 30); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; arrowHead(ctx, 282, 28, Math.PI + 0.35, 10);
  }

  function guide4Scene(ctx) {
    drawBackground(ctx);
    for (var c = 0; c < 14; c++) { drawGround(ctx, { x: c * 40 + 20, y: 340, top: true }); drawGround(ctx, { x: c * 40 + 20, y: 380, top: false }); }
    for (c = 4; c < 8; c++) drawGround(ctx, { x: c * 40 + 20, y: 220, top: true });
    drawPickup(ctx, { x: 190, y: 186, kind: 'ore', t: 0 });
    drawPickup(ctx, { x: 240, y: 186, kind: 'ore', t: 0.5 });
    drawPickup(ctx, { x: 290, y: 186, kind: 'ore', t: 1 });
    drawPickup(ctx, { x: 450, y: 300, kind: 'ore', t: 0.2 });
    drawRoller(ctx, { x: 336, y: 304, facing: -1, flying: false, hit: false, t: 0 });
    drawBomber(ctx, { x: 370, y: 306, facing: -1, state: 'walk', flying: false, hit: false, fuseT: 0.3, fuseDur: 0.3 });
    drawRoller(ctx, { x: 404, y: 304, facing: -1, flying: false, hit: false, t: 0.5 });
    drawGoal(ctx, { x: 500, y: 280, reached: false });
    drawPlayer(ctx, { x: 40, y: 298, bot: 'drill', facing: 1, pose: 'idle', poseT: 0, fuel: null, invuln: false });
  }

  function guide4(ctx, k) {
    var sides = [0, 290];
    for (var i = 0; i < 2; i++) {
      var x0 = sides[i];
      frameBg(ctx, x0, 0, 270, 200);
      ctx.save();
      rr(ctx, x0, 0, 270, 200, 8); ctx.clip();
      ctx.translate(x0, 0); ctx.scale(0.5, 0.5);
      guide4Scene(ctx);
      ctx.setLineDash([12, 9]); ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
      ctx.beginPath();
      if (i === 0) {
        // 繞路: 上平台撿素材 → 下來打怪 → 撿地上素材 → 終點
        ctx.moveTo(56, 290); ctx.quadraticCurveTo(110, 150, 180, 172); ctx.lineTo(300, 172);
        ctx.quadraticCurveTo(330, 200, 336, 270); ctx.lineTo(450, 286); ctx.quadraticCurveTo(470, 260, 474, 270);
      } else {
        // 直衝: 一跳越過怪群直達終點
        ctx.moveTo(56, 290); ctx.lineTo(260, 290); ctx.quadraticCurveTo(370, 180, 472, 276);
      }
      ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#ffffff';
      arrowHead(ctx, 478, 282, i === 0 ? 0.9 : Math.atan2(276 - 228, 472 - 421), 18);
      ctx.restore();
    }
    lbl(ctx, '素材多 / 秒數長', 135, 222, 15, k);
    lbl(ctx, '素材少 / 秒數短', 425, 222, 15, k);
  }

  var GUIDE_FN = [guide1, guide2, guide3, guide4];

  function drawGuidePage(ctx, s) {
    s = obj(s);
    var page = Math.floor(NC(s.page, 0, 0, GUIDE_FN.length - 1));
    var x = N(s.x, 0), y = N(s.y, 0), w = NC(s.w, GUIDE_SIZE[page][0], 1, 4000), h = NC(s.h, GUIDE_SIZE[page][1], 1, 4000);
    var vw = GUIDE_SIZE[page][0], vh = GUIDE_SIZE[page][1];
    var k = Math.min(w / vw, h / vh);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
    ctx.scale(k, k);
    GUIDE_FN[page](ctx, k);
    ctx.restore();
  }

  window.Art = {
    canvas: { width: W, height: H },
    palette: {
      bg: P.bg, mapBg: P.mapBg, ground: P.ground, groundTop: P.groundTop, softRock: P.softRock, magnetDoor: P.door,
      danger: P.danger, spike: P.spike,
      ore: P.ore, battery: P.battery, gear: P.gear,
      player: P.botBody, drill: P.drill, heli: P.heli, magnet: P.magnet,
      roller: P.roller, bomber: P.bomber, crab: P.crab, crabShell: P.crabShell, hawk: P.hawk, enemyEye: P.enemyEye,
      cyclone: P.heli, explosion: P.fire, smoke: P.smoke,
      hud: P.hud, panel: P.panel, panelEdge: P.panelEdge, text: P.text, textDim: P.textDim, lack: P.lack, select: P.select, hp: P.hp
    },
    drawBackground: drawBackground,
    drawMapBackground: drawMapBackground,
    drawGround: drawGround,
    drawSpike: drawSpike,
    drawSoftRock: drawSoftRock,
    drawMagnetDoor: drawMagnetDoor,
    drawSlot: drawSlot,
    drawPickup: drawPickup,
    drawGoal: drawGoal,
    drawPlayer: drawPlayer,
    drawRoller: drawRoller,
    drawBomber: drawBomber,
    drawCrab: drawCrab,
    drawHawk: drawHawk,
    drawCycloneShot: drawCycloneShot,
    drawExplosion: drawExplosion,
    drawPoof: drawPoof,
    drawChainText: drawChainText,
    drawPopup: drawPopup,
    drawLevelCard: drawLevelCard,
    drawBotCard: drawBotCard,
    drawGoalCard: drawGoalCard,
    drawBuildPanel: drawBuildPanel,
    drawHud: drawHud,
    drawResultPanel: drawResultPanel,
    drawFailPanel: drawFailPanel,
    drawPausePanel: drawPausePanel,
    drawEndingPanel: drawEndingPanel,
    drawGuidePage: drawGuidePage
  };
})();
