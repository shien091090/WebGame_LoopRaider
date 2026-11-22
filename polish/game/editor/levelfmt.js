/* LoopRaider 關卡編輯器 - levels.js 的格式工具(編輯器與 Node 測試共用)
 * 傳統腳本: 瀏覽器裡掛在 window.LevelFmt, Node 裡 module.exports。
 */
(function (root) {
  'use strict';
  var GW = 32, GH = 18;
  var CH_EMPTY = '.', CH_SOLID = '#', CH_LAIR = 'L';

  var HEADER = [
    '// LoopRaider 關卡資料(levels.js) — 由關卡編輯器 editor/index.html 讀寫; 可以手改, 但編輯器存檔會整份重寫(只保留這段說明)。',
    '// game.js 在 index.html 裡排在本檔之後載入, 讀 window.LEVEL_DEFS(8 關, 第 8 關是 Boss 競技場)。',
    '// 座標: c = 欄 0~31(左 → 右), r = 列 0~17(上 → 下), 每格 40px。',
    '// tiles: 18 行字串、每行 32 字, 一字一格:  "." 空    "#" 實心地形    "L" 巢穴實心(碰撞同實心, 外觀畫成巢穴)。',
    '// sites: 每關 3 處工程(順序 = 工程 1~3, 花費在 game.js 的 SITE_COST):',
    '//   kind  斷橋 bridge | 崩梯 stairs | 堵塞隧道 rubble | 巢穴門 nestgate;  role  捷徑 shortcut | 寶區 treasure | 巢穴 nest',
    '//   cells 結構格 [[c, r], ...]: 斷橋 / 崩梯修好後變實心, 堵塞隧道修好前是實心(載入時這些格的地形一律清空); 巢穴門不用',
    '//   sign  工程牌 [c, 站立地面列];  fog 迷霧矩形 [[c, r, 寬, 高], ...]',
    '//   gate  巢穴門左上格 [c, r](門佔 2×2 格);  lair 巢穴室 [c, r, 寬, 高](只有巢穴門有)',
    '// start / goal: [c, 站立地面列] — 角色 / 終點旗站在這一列的頂面上(身體在它上面一列)。',
    '// spikes: [[c, r], ...] 尖刺所在格;  cracks: [[c, r], ...] 裂岩牆格(打得破的實心)。',
    '// picks: [素材 wood|stone|crystal, c, r, 水平微調px(可省略)] — 素材所在格。',
    '// mons: [種類, c, 列, 額外(可省略)] — 列的意思依種類而不同:',
    '//   地面怪 boar 野豬 / frog 跳蛙 / thorn 刺藤花 / ram 岩角羊 / shield 盾兵 / beetle 爆炸甲蟲 / mother 巢母 = 腳踩的地面列(身體在上一列);',
    '//   飛行 bee 射手蜂 / hawk 俯衝鷹 / bats 蝙蝠群 = 所在格列;  lizard 落石蜥 = 倒掛的天花板列(身體在下一列);',
    '//   mother 的額外 = 巢母主題 forest | cliff | mine。巢穴門迷霧裡的怪自動變巢穴怪。',
    '// chest: [c, 站立地面列, 裝置代碼] 或 null;  裝置代碼 gear bagWood bagStone bagCrystal coreLamp glove horn heart。'
  ].join('\n');

  // ---------- tiles <-> 二維格表(0 空 / 1 實心 / 2 巢穴實心)
  function tilesToGrid(tiles) {
    var g = [], r, c;
    for (r = 0; r < GH; r++) {
      var row = (tiles && tiles[r]) || '', a = [];
      for (c = 0; c < GW; c++) { var ch = row.charAt(c); a.push(ch === CH_SOLID ? 1 : (ch === CH_LAIR ? 2 : 0)); }
      g.push(a);
    }
    return g;
  }
  function gridToTiles(g) {
    return g.map(function (row) { return row.map(function (v) { return v === 1 ? CH_SOLID : (v === 2 ? CH_LAIR : CH_EMPTY); }).join(''); });
  }
  // 舊格式 rects(['B'|'L'|'E', c, r, w, h])轉 tiles
  function rectsToTiles(rects) {
    var g = tilesToGrid(null);
    rects.forEach(function (q) {
      var v = q[0] === 'B' ? 1 : (q[0] === 'L' ? 2 : 0);
      for (var rr = q[2]; rr < q[2] + q[4]; rr++) for (var cc = q[1]; cc < q[1] + q[3]; cc++) if (rr >= 0 && rr < GH && cc >= 0 && cc < GW) g[rr][cc] = v;
    });
    return gridToTiles(g);
  }

  // ---------- 輸出(固定欄位順序、一個物件一行, 讓 diff 好讀)
  function lit(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
    var ks = Object.keys(v);
    return '{ ' + ks.map(function (k) { return k + ': ' + lit(v[k]); }).join(', ') + ' }';
  }
  var SITE_KEYS = ['kind', 'role', 'cells', 'sign', 'fog', 'gate', 'lair'];
  function siteLit(s) {
    var parts = [];
    SITE_KEYS.forEach(function (k) {
      if (k === 'gate' || k === 'lair') { if (s.kind !== 'nestgate') return; }
      parts.push(k + ': ' + lit(s[k] === undefined ? (k === 'cells' || k === 'fog' ? [] : null) : s[k]));
    });
    return '{ ' + parts.join(', ') + ' }';
  }
  function listBlock(name, arr, fn, ind) {
    if (!arr || !arr.length) return ind + name + ': []';
    return ind + name + ': [\n' + arr.map(function (x) { return ind + '  ' + fn(x); }).join(',\n') + '\n' + ind + ']';
  }
  function serializeLevel(d, idx, names) {
    var ind = '    ', out = [];
    out.push(ind + 'tiles: [\n' + d.tiles.map(function (t) { return ind + "  '" + t + "'"; }).join(',\n') + '\n' + ind + ']');
    out.push(listBlock('sites', d.sites, siteLit, ind));
    out.push(ind + 'start: ' + lit(d.start) + ', goal: ' + lit(d.goal));
    out.push(ind + 'spikes: ' + lit(d.spikes || []) + ', cracks: ' + lit(d.cracks || []));
    out.push(listBlock('picks', d.picks, lit, ind));
    out.push(listBlock('mons', d.mons, lit, ind));
    out.push(ind + 'chest: ' + lit(d.chest || null));
    var title = '  // ' + (idx + 1) + (names && names[idx] ? ' ' + names[idx] : '');
    return title + '\n  {\n' + out.join(',\n') + '\n  }';
  }
  function serialize(defs, names) {
    return HEADER + '\nwindow.LEVEL_DEFS = [\n' + defs.map(function (d, i) { return serializeLevel(clean(d), i, names); }).join(',\n') + '\n];\n';
  }

  // ---------- 整理成標準形狀(去掉編輯器暫存欄位、補缺的欄位)
  function cp(a) { return a === null || a === undefined ? a : JSON.parse(JSON.stringify(a)); }
  function clean(d) {
    var o = {
      tiles: (d.tiles || []).slice(),
      sites: (d.sites || []).map(function (s) {
        var t = { kind: s.kind, role: s.role, cells: cp(s.cells || []), sign: cp(s.sign || null), fog: cp(s.fog || []) };
        if (s.kind === 'nestgate') { t.gate = cp(s.gate || null); t.lair = cp(s.lair || null); }
        return t;
      }),
      start: cp(d.start || null), goal: cp(d.goal || null),
      spikes: cp(d.spikes || []), cracks: cp(d.cracks || []),
      picks: cp(d.picks || []), mons: cp(d.mons || []),
      chest: cp(d.chest || null)
    };
    while (o.tiles.length < GH) o.tiles.push(new Array(GW + 1).join(CH_EMPTY));
    o.tiles = o.tiles.slice(0, GH).map(function (t) { t = String(t); while (t.length < GW) t += CH_EMPTY; return t.slice(0, GW); });
    return o;
  }

  var api = { GW: GW, GH: GH, HEADER: HEADER, tilesToGrid: tilesToGrid, gridToTiles: gridToTiles, rectsToTiles: rectsToTiles,
    serialize: serialize, serializeLevel: serializeLevel, clean: clean, lit: lit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LevelFmt = api;
})(typeof window !== 'undefined' ? window : this);
