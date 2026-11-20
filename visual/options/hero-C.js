/* hero 方案 C: 點陣像素 — 三人都是 12×18 格的手繪點陣(每格 2px, 外圈自動補 1 格白邊 = 28×40 判定框)。
 * 劍士直立、獵人前傾駝背、炸彈工圓滾外八, 靠站姿與大色塊分人; 縮圖另有手繪的 5×7 微點陣(每格 1 螢幕 px),
 * 大地圖上不是把大圖縮小, 而是換一張專為 1/8 畫的小圖。 */
(function () {
  'use strict';
  var CLS = ['sword', 'hunter', 'bomber'];
  var NAME = { sword: '劍士', hunter: '獵人', bomber: '炸彈工' };
  var ROLE = { sword: '近戰揮砍・衝刺斬', hunter: '自動射箭・潛行', bomber: '拋炸彈・震波擊飛' };
  var FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
  function P(k, d) { try { if (typeof Art !== 'undefined' && Art.palette && Art.palette[k]) return Art.palette[k]; } catch (e) {} return d; }

  // 職業三階色: 主色 / 暗 / 亮
  var TONE = {
    sword: [P('sword', '#3d8bfd'), '#1f4fa8', '#9cc4ff'],
    hunter: [P('hunter', '#1fbf9a'), '#0f6b56', '#8ff0d6'],
    bomber: [P('bomber', '#f28c28'), '#a5520e', '#ffd09a']
  };
  // 共用字元色
  var FIX = {
    K: '#1a1420', S: P('skin', '#f4d2b0'), M: '#e8eef6', m: '#8f9cad', G: P('gold', '#f2c94c'), W: '#8a5a2a',
    P: '#2b3245', R: '#d8434e', X: P('bomb', '#2a2a33'), Y: P('goal', '#ffd23f'), g: P('timeLight', '#b6f4fb'),
    E: '#d8fff0', A: P('arrow', '#f3ead8'), H: '#0f2a24'
  };
  var OUT = P('outlineHero', '#ffffff');

  // 12 寬 × 18 高, 面向右。B/b/L = 職業主 / 暗 / 亮色
  var SPR = {
    sword: [
      '.....GG.....',
      '...BBBBB....',
      '..BBBBBBB.M.',
      '..BmmmmmB.M.',
      '..BSSSKSB.M.',
      '..BSSSSSB.M.',
      '...SSSSS..M.',
      '.RBBBBBBBGGG',
      'RRBBLBBBBSW.',
      'RRBBLBBBBB..',
      'RRBBLBBBB...',
      'RRbbbbbbb...',
      '.RBGGGGGB...',
      '.RBBBBBBB...',
      '..PP..PP....',
      '..PP..PP....',
      '..PP..PP....',
      '.KKK..KKK...'
    ],
    hunter: [
      '............',
      '...bb.......',
      '..bBBB....W.',
      '.bBBBBB....W',
      '.bBBBBBB...W',
      '.bBHHHHB...W',
      '.bBHEHEB...W',
      '.bbBHHHBSAAA',
      'WbbBBBBBB..W',
      'WbbBLBBBB..W',
      '.bbBLBBBB..W',
      '.bbBbbbbB.W.',
      '.bbBBBBBBW..',
      '..bBBBBBB...',
      '...PP.PP....',
      '..PP...PP...',
      '..PP...PP...',
      '.KKK...KKK..'
    ],
    bomber: [
      '...BBBBB....',
      '..BBBBBBB...',
      '..KKKKKKKK..',
      '..SKggKggK..',
      '..SSKKSKKSY.',
      '..SSSSSSSY..',
      '...SKKKS.K..',
      '.BBBBBBBXXX.',
      'BBBBBBBXXXXX',
      'BBXBXBXXXXXX',
      'BBBBBBBXXXXX',
      'BBBBBBBSXXX.',
      'BbbbbbbbB...',
      '.BBBBBBBB...',
      '..PPP.PPP...',
      '..PP...PP...',
      '.PP.....PP..',
      'KKK.....KKK.'
    ]
  };
  // 縮圖微點陣 5 寬 × 7 高(外圈再補 1 格白邊 = 7×9 螢幕 px)
  var MICRO = {
    sword: ['.BB.M', 'BmB.M', 'BBBGG', 'LBBS.', 'BBB..', 'P.P..', 'P.P..'],
    hunter: ['.b...', 'bBB.W', 'bHE.W', 'bBBAA', 'bBB.W', '.P.P.', 'P...P'],
    bomber: ['.BB..', 'Kgg..', 'SSS.Y', 'BBBX.', 'BBXXX', 'BBXX.', 'P..P.']
  };

  function colorOf(cls, ch) {
    if (ch === 'B') return TONE[cls][0];
    if (ch === 'b') return TONE[cls][1];
    if (ch === 'L') return TONE[cls][2];
    return FIX[ch] || null;
  }
  function cellAt(rows, c, r) {
    if (r < 0 || r >= rows.length) return '.';
    var row = rows[r]; if (c < 0 || c >= row.length) return '.';
    return row.charAt(c);
  }
  // 畫一張點陣: 外圈 1 格白邊(8 鄰), 再畫本體。左上角 = (ox, oy), 每格 cell
  function blit(ctx, cls, rows, ox, oy, cell) {
    var h = rows.length, w = rows[0].length, r, c, dr, dc, hit;
    ctx.fillStyle = OUT;
    for (r = -1; r <= h; r++) for (c = -1; c <= w; c++) {
      if (cellAt(rows, c, r) !== '.') continue;
      hit = false;
      for (dr = -1; dr <= 1 && !hit; dr++) for (dc = -1; dc <= 1; dc++) if (cellAt(rows, c + dc, r + dr) !== '.') { hit = true; break; }
      if (hit) ctx.fillRect(ox + (c + 1) * cell, oy + (r + 1) * cell, cell, cell);
    }
    for (r = 0; r < h; r++) for (c = 0; c < w; c++) {
      var col = colorOf(cls, rows[r].charAt(c));
      if (!col) continue;
      ctx.fillStyle = col; ctx.fillRect(ox + (c + 1) * cell, oy + (r + 1) * cell, cell, cell);
    }
  }

  // 主角本體: 原點 = 判定框中心, 單位 = 遊戲 px; 12×18 格 × 2px + 白邊 = 28×40。f = 面向
  function hero(ctx, cls, f) {
    ctx.save(); ctx.scale(f === -1 ? -1 : 1, 1);
    blit(ctx, cls, SPR[cls], -14, -20, 2);
    ctx.restore();
  }
  // 縮圖記號(大地圖 1/8): 原點 = 腳底中心, 單位 = 螢幕 px(7×9)
  function thumb(ctx, cls) {
    ctx.save();
    blit(ctx, cls, MICRO[cls], -3, -9, 1); // 整數格對齊螢幕像素, 1/8 縮圖時不糊
    ctx.restore();
  }

  // ---------- 方案頁版面(三方案共用同一套版面, 只換主角畫法) ----------
  function label(ctx, s, x, y, px, col, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + px + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function ground(ctx, x0, x1, top) {
    var ok = false;
    try { if (typeof Art !== 'undefined' && Art.drawGround) { for (var x = x0; x < x1; x += 40) Art.drawGround(ctx, { x: x + 20, y: top + 20, top: true, theme: 'plain' }); ok = true; } } catch (e) { ok = false; }
    if (!ok) { ctx.fillStyle = '#7b5a3c'; ctx.fillRect(x0, top, x1 - x0, 40); ctx.fillStyle = '#63c35a'; ctx.fillRect(x0, top, x1 - x0, 10); }
  }
  function scene(ctx) {
    ctx.save();
    try { ctx.imageSmoothingEnabled = false; } catch (e) {}
    var g = ctx.createLinearGradient(0, 0, 0, 400); g.addColorStop(0, P('bg', '#1a2233')); g.addColorStop(1, P('bgLow', '#273149'));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 720, 400);
    label(ctx, '×3 檢視(虛線 = 判定框 28×40, 三人同框)', 16, 18, 12, '#9aa4b8');
    ctx.fillStyle = '#2f3a52'; ctx.fillRect(40, 215, 640, 3);
    for (var i = 0; i < 3; i++) {
      var cls = CLS[i], cx = 140 + 220 * i;
      ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.strokeRect(cx - 42, 95, 84, 120); ctx.restore();
      ctx.save(); ctx.translate(cx, 155); ctx.scale(3, 3); hero(ctx, cls, 1); ctx.restore();
      label(ctx, NAME[cls], cx, 238, 18, TONE[cls][0], 'center', true);
      label(ctx, ROLE[cls], cx, 258, 12, '#9aa4b8', 'center');
    }
    ctx.fillStyle = '#3c4860'; ctx.fillRect(16, 276, 688, 1);
    // 遊戲內 1×
    label(ctx, '遊戲內 1×', 20, 292, 12, '#9aa4b8');
    ctx.save(); ctx.beginPath(); ctx.rect(20, 300, 290, 92); ctx.clip();
    ground(ctx, 20, 320, 360);
    for (i = 0; i < 3; i++) { ctx.save(); ctx.translate(70 + 90 * i, 340); hero(ctx, CLS[i], i === 2 ? -1 : 1); ctx.restore(); }
    ctx.restore();
    // 大地圖縮圖 1/8
    label(ctx, '大地圖縮圖 1/8', 334, 292, 12, '#9aa4b8');
    ctx.fillStyle = P('mapBg', '#15242a'); ctx.fillRect(334, 300, 170, 92);
    ctx.fillStyle = P('bg', '#1a2233'); ctx.fillRect(340, 306, 158, 80);
    ctx.fillStyle = '#7b5a3c'; ctx.fillRect(340, 372, 158, 14); ctx.fillStyle = '#63c35a'; ctx.fillRect(340, 372, 158, 2);
    ctx.fillStyle = '#7b5a3c'; ctx.fillRect(420, 352, 40, 6); ctx.fillStyle = '#63c35a'; ctx.fillRect(420, 352, 40, 1.5);
    ctx.save(); ctx.translate(372, 372); thumb(ctx, 'sword'); ctx.restore();
    ctx.save(); ctx.translate(438, 352); thumb(ctx, 'hunter'); ctx.restore();
    ctx.save(); ctx.translate(478, 372); thumb(ctx, 'bomber'); ctx.restore();
    // 縮圖放大 ×4
    label(ctx, '縮圖微點陣放大 ×4', 528, 292, 12, '#9aa4b8');
    ctx.fillStyle = P('bg', '#1a2233'); ctx.fillRect(528, 300, 176, 92);
    for (i = 0; i < 3; i++) { ctx.save(); ctx.translate(562 + 54 * i, 382); ctx.scale(4, 4); thumb(ctx, CLS[i]); ctx.restore(); }
    ctx.restore();
  }

  window.VISUAL_OPTION = {
    element: 'hero', id: 'C', kind: 'static',
    size: [720, 400], duration: 0, loop: false,
    draw: function (ctx, t) { scene(ctx); }
  };
})();
