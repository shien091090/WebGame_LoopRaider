/* 回放冒險 關卡編輯器 - 介面與編輯邏輯
 * 讀 ../game/levels.js(window.LEVEL_DEFS)、../game/art/art.js(window.Art)、../game/game.js(__LR_TEST 模式, 只拿常數);
 * 格式工具 levelfmt.js(LevelFmt)、檢查 levelcheck.js(LevelCheck)。
 */
(function () {
  'use strict';
  var W = window, TS = 40, GW = 32, GH = 18;
  var Fmt = W.LevelFmt, LC = W.LevelCheck;

  // ---------------------------------------------------------------- 遊戲常數(game.js 載入失敗時用預設)
  var NAMES = W.LEVEL_NAMES || ['林間小徑', '藤蔓斜坡', '野豬谷地', '岩柱塔', '吊橋峽谷', '礦車隧道', '晶礦深井', '鹽原斷門'];
  var THEMES = W.THEMES || ['forest', 'forest', 'forest', 'cliff', 'cliff', 'mine', 'mine', 'salt'];
  var SITE_COST = W.SITE_COST || [[6, 10, 14], [16, 24, 32], [16, 24, 36], [30, 40, 50], [30, 40, 55], [40, 55, 70], [40, 55, 70], [0, 0, 0]];
  var DEV_ORDER = W.DEV_ORDER || ['gear', 'bagWood', 'bagStone', 'bagCrystal', 'coreLamp', 'glove', 'horn', 'heart'];
  var MDEF = W.MDEF || {
    boar: { w: 48, h: 32, hp: 4 }, frog: { w: 32, h: 28, hp: 3 }, bee: { w: 32, h: 32, hp: 2 }, thorn: { w: 40, h: 48, hp: 5 }, ram: { w: 44, h: 36, hp: 5 },
    hawk: { w: 40, h: 28, hp: 3 }, lizard: { w: 36, h: 24, hp: 3 }, shield: { w: 32, h: 40, hp: 4, sh: 3 }, beetle: { w: 32, h: 24, hp: 2 }, bat: { w: 24, h: 20, hp: 1 }, mother: { w: 64, h: 56, hp: 14 }
  };
  var PREVIEW_STATE = W.PREVIEW_STATE || { boar: 'walk', frog: 'crouch', bee: 'fly', thorn: 'idle', ram: 'walk', hawk: 'circle', lizard: 'crawl', shield: 'walk', beetle: 'crawl', bat: 'fly', mother: 'walk' };
  var ENV = { GRAV: W.GRAV, JUMP_V: W.JUMP_V, PW: W.PW, PH: W.PH, CLS: W.CLS, MDEF: MDEF, DEV_ORDER: DEV_ORDER, SITE_COST: SITE_COST };
  var THEME_ZH = { forest: '翠林', cliff: '高崖', mine: '礦坑', salt: '鹽原', nest: '巢穴' };
  var KIND_ZH = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道', nestgate: '巢穴門' };
  var ROLE_ZH = { shortcut: '捷徑', treasure: '寶區', nest: '巢穴' };
  var PICK_ZH = { wood: '木材', stone: '石頭', crystal: '水晶' };
  var DEV_ZH = { gear: '疾時機關', bagWood: '聚木機關', bagStone: '聚石機關', bagCrystal: '聚晶機關', coreLamp: '聚核機關', glove: '拾遺機關', horn: '驅獸機關', heart: '巢心機關' };
  var SITE_COL = ['#4aa8ff', '#ffb02e', '#c264ff'];
  // 怪物清單(只列 game.js MDEF 裡有的種類; 蝙蝠群 = MDEF 的 bat 三隻一組)
  var MONS = [['boar', '野豬', 'forest'], ['frog', '跳蛙', 'forest'], ['bee', '射手蜂', 'forest'], ['thorn', '刺藤花', 'forest'],
    ['ram', '岩角羊', 'cliff'], ['hawk', '俯衝鷹', 'cliff'], ['lizard', '落石蜥', 'cliff'],
    ['shield', '盾兵', 'mine'], ['beetle', '爆炸甲蟲', 'mine'], ['bats', '蝙蝠群', 'mine'], ['mother', '巢母', 'nest']].filter(function (m) { return !!MDEF[m[0] === 'bats' ? 'bat' : m[0]]; });
  var MON_ZH = {}; MONS.forEach(function (m) { MON_ZH[m[0]] = m[1]; });
  var FLYER = { bee: 1, hawk: 1, bats: 1 };
  var TOOL_ZH = { select: '選取移動', solid: '畫實心地形', lair: '畫巢穴實心地形', erase: '清除地形', mon: '放怪物', pick: '放素材', chest: '放寶箱', spike: '放尖刺', crack: '放裂岩牆',
    start: '放起點', goal: '放終點', cells: '畫工程結構格', sign: '放工程牌', fog: '拉迷霧矩形', gate: '放巢穴門', lairroom: '拉巢穴室範圍' };
  var TOOL_HINT = {
    select: '左鍵點物件選取、拖曳搬家; 右鍵刪除; Delete 刪除選取的物件',
    solid: '左鍵拖曳畫實心(Shift 拖曳 = 矩形); 右鍵擦掉', lair: '左鍵拖曳畫巢穴實心(Shift 拖曳 = 矩形); 右鍵擦掉', erase: '左鍵拖曳擦掉地形(Shift 拖曳 = 矩形)',
    mon: '左鍵點怪物身體要在的格子; 右鍵刪除', pick: '左鍵點素材所在格; 右鍵刪除', chest: '左鍵點寶箱所在格(腳下要有地面); 每關只有 1 個',
    spike: '左鍵拖曳放尖刺(放在地面上方那格); 右鍵刪除', crack: '左鍵拖曳放裂岩牆(要放在空格上); 右鍵刪除',
    start: '左鍵點角色出生的格子(腳下要有地面)', goal: '左鍵點終點旗所在格(腳下要有地面, 旗子 2 格高)',
    cells: '左鍵拖曳加入目前工程的結構格; 右鍵拖曳移除', sign: '左鍵點目前工程的工程牌位置(腳下要有地面)',
    fog: '左鍵拖曳拉一塊目前工程的迷霧; 右鍵點迷霧刪掉', gate: '左鍵點巢穴門的左上格(門 2×2 格)', lairroom: '左鍵拖曳拉出巢穴室範圍'
  };

  // ---------------------------------------------------------------- 狀態
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d');
  var scene = document.createElement('canvas'); scene.width = 1280; scene.height = 720;
  var sctx = scene.getContext('2d');
  var DRAFT_KEY = 'LoopRaider.levelEditor.draft';
  var S = {
    defs: [], lv: 0, tool: 'select', rectMode: false,
    monType: 'boar', motherTheme: 'forest', pickKind: 'wood', chestDev: 'bagWood', siteIdx: 0,
    sel: null, selCycle: null, hover: null, drag: null, pending: null,
    undo: [], redo: [], savedJSON: '', sceneDirty: true,
    rep: [false, false, false], fogMode: 'half', grid: true, showReach: false,
    check: [], flash: null, flashIdx: -1, checkTimer: 0, draftTimer: 0
  };
  var loadErr = [];
  if (!Fmt) loadErr.push('levelfmt.js 沒載入');
  if (!LC) loadErr.push('levelcheck.js 沒載入');
  if (!W.Art) loadErr.push('art/art.js 沒載入, 改用簡單圖形');
  if (!W.MDEF) loadErr.push('game.js 沒載入或出錯, 怪物 / 關卡名稱改用編輯器內建的預設值');
  if (!W.LEVEL_DEFS || !W.LEVEL_DEFS.length) loadErr.push('../game/levels.js 沒載入, 先給 8 個空白關卡');
  S.defs = (W.LEVEL_DEFS && W.LEVEL_DEFS.length ? W.LEVEL_DEFS : NAMES.map(function () { return {}; })).map(function (d) { return Fmt.clean(d); });
  S.savedJSON = S.fileJSON = JSON.stringify(S.defs); // savedJSON = 最後一次存檔 / 下載的內容; fileJSON = 確定寫進 levels.js 的內容
  function cur() { return S.defs[S.lv]; }
  function theme() { return THEMES[S.lv] || 'forest'; }

  // ---------------------------------------------------------------- 小工具
  function inGrid(c, r) { return c >= 0 && c < GW && r >= 0 && r < GH; }
  function tileAt(d, c, r) { return inGrid(c, r) ? d.tiles[r].charAt(c) : '#'; }
  function setTile(d, c, r, ch) {
    if (!inGrid(c, r)) return false;
    var row = d.tiles[r];
    if (row.charAt(c) === ch) return false;
    d.tiles[r] = row.slice(0, c) + ch + row.slice(c + 1);
    return true;
  }
  function eqCell(a, c, r) { return a && a[0] === c && a[1] === r; }
  var toastT = 0;
  function toast(html, ms) {
    var t = $('toast'); t.innerHTML = html; t.className = 'show';
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, ms || 3500);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  // ---------------------------------------------------------------- 復原 / 重做
  function beginEdit() { if (S.pending === null) S.pending = { lv: S.lv, json: JSON.stringify(cur()) }; }
  function endEdit() {
    if (S.pending === null) return;
    var p = S.pending; S.pending = null;
    if (p.lv === S.lv && JSON.stringify(cur()) === p.json) return;
    S.undo.push(p); if (S.undo.length > 300) S.undo.shift();
    S.redo = [];
    changed();
  }
  function edit(fn) { beginEdit(); fn(); endEdit(); }
  function undoRedo(from, to) {
    if (!from.length) return;
    var e = from.pop();
    to.push({ lv: e.lv, json: JSON.stringify(S.defs[e.lv]) });
    S.defs[e.lv] = JSON.parse(e.json);
    S.check[e.lv] = null; S.sel = null;
    if (S.lv !== e.lv) switchLevel(e.lv, true);
    changed();
  }
  function changed() {
    S.sceneDirty = true;
    refreshAll();
    clearTimeout(S.checkTimer); S.checkTimer = setTimeout(runCheck, 350);
    clearTimeout(S.draftTimer); S.draftTimer = setTimeout(saveDraft, 800);
  }

  // ---------------------------------------------------------------- 物件位置(與 game.js buildLevel 同公式)
  function monPos(m) {
    var t = m[0], x = m[1] * TS + 20;
    if (FLYER[t]) return { x: x, y: m[2] * TS + 20 };
    if (t === 'lizard') return { x: x, y: (m[2] + 1) * TS + 12 };
    return { x: x, y: m[2] * TS - (MDEF[t] ? MDEF[t].h : 32) / 2 };
  }
  // 「身體所在格」→ 存檔用的列
  function monRowFromCell(type, r) { return FLYER[type] ? r : (type === 'lizard' ? r - 1 : r + 1); }
  function brood(d, m) {
    var b = LC.monBodyCell(m), z = LC.zOf(d, m[0] === 'lizard' ? m[1] : b[0], m[0] === 'lizard' ? m[2] : b[1]);
    return z >= 0 && d.sites[z] && d.sites[z].kind === 'nestgate' && m[0] !== 'mother';
  }
  // 可點選物件的外框(px, 中心 + 寬高)
  function objects(d) {
    var a = [];
    d.picks.forEach(function (p, i) { a.push({ t: 'pick', i: i, x: p[1] * TS + 20 + (p[3] || 0), y: p[2] * TS + 20, w: 28, h: 28 }); });
    d.mons.forEach(function (m, i) {
      var p = monPos(m), D = MDEF[m[0]] || { w: 32, h: 32 };
      if (m[0] === 'bats') a.push({ t: 'mon', i: i, x: p.x, y: p.y, w: 120, h: 120 });
      else a.push({ t: 'mon', i: i, x: p.x, y: p.y, w: Math.max(D.w, 30), h: Math.max(D.h, 30) });
    });
    if (d.chest) a.push({ t: 'chest', x: d.chest[0] * TS + 20, y: d.chest[1] * TS - 18, w: 40, h: 36 });
    if (d.start) a.push({ t: 'start', x: d.start[0] * TS + 20, y: d.start[1] * TS - 18, w: 30, h: 38 });
    if (d.goal) a.push({ t: 'goal', x: d.goal[0] * TS + 20, y: d.goal[1] * TS - 40, w: 40, h: 80 });
    d.spikes.forEach(function (q, i) { a.push({ t: 'spike', i: i, x: q[0] * TS + 20, y: q[1] * TS + 20, w: 40, h: 40 }); });
    d.cracks.forEach(function (q, i) { a.push({ t: 'crack', i: i, x: q[0] * TS + 20, y: q[1] * TS + 20, w: 40, h: 40 }); });
    d.sites.forEach(function (s, i) {
      if (s.sign) a.push({ t: 'sign', i: i, x: s.sign[0] * TS + 20, y: s.sign[1] * TS - 24, w: 36, h: 48 });
      if (s.kind === 'nestgate' && s.gate) a.push({ t: 'gate', i: i, x: (s.gate[0] + 1) * TS, y: (s.gate[1] + 1) * TS, w: 80, h: 80 });
    });
    return a;
  }
  function hitAt(x, y) {
    return objects(cur()).filter(function (o) { return Math.abs(x - o.x) <= o.w / 2 && Math.abs(y - o.y) <= o.h / 2; })
      .sort(function (a, b) { return a.w * a.h - b.w * b.h; });
  }
  function sameObj(a, b) { return a && b && a.t === b.t && a.i === b.i; }
  // 物件的格座標參照(拖曳時整體平移)
  function objRef(d, o) {
    var r = objRef0(d, o);
    return r && r.arr ? r : null;
  }
  function objRef0(d, o) {
    switch (o.t) {
      case 'pick': return { arr: d.picks[o.i], ci: 1 };
      case 'mon': return { arr: d.mons[o.i], ci: 1 };
      case 'chest': return { arr: d.chest, ci: 0 };
      case 'start': return { arr: d.start, ci: 0 };
      case 'goal': return { arr: d.goal, ci: 0 };
      case 'spike': return { arr: d.spikes[o.i], ci: 0 };
      case 'crack': return { arr: d.cracks[o.i], ci: 0 };
      case 'sign': return { arr: d.sites[o.i] && d.sites[o.i].sign, ci: 0 };
      case 'gate': return { arr: d.sites[o.i] && d.sites[o.i].gate, ci: 0 };
    }
    return null;
  }
  function deleteObj(d, o) {
    switch (o.t) {
      case 'pick': d.picks.splice(o.i, 1); break;
      case 'mon': d.mons.splice(o.i, 1); break;
      case 'chest': d.chest = null; break;
      case 'start': d.start = null; break;
      case 'goal': d.goal = null; break;
      case 'spike': d.spikes.splice(o.i, 1); break;
      case 'crack': d.cracks.splice(o.i, 1); break;
      case 'sign': d.sites[o.i].sign = null; break;
      case 'gate': d.sites[o.i].gate = null; break;
    }
  }
  function objName(d, o) {
    switch (o.t) {
      case 'pick': return PICK_ZH[d.picks[o.i][0]] || d.picks[o.i][0];
      case 'mon': return (MON_ZH[d.mons[o.i][0]] || d.mons[o.i][0]) + (brood(d, d.mons[o.i]) ? '(巢穴怪)' : '');
      case 'chest': return '寶箱';
      case 'start': return '起點';
      case 'goal': return '終點';
      case 'spike': return '尖刺';
      case 'crack': return '裂岩牆';
      case 'sign': return '工程 ' + (o.i + 1) + ' 的工程牌';
      case 'gate': return '工程 ' + (o.i + 1) + ' 的巢穴門';
    }
    return '';
  }

  // ---------------------------------------------------------------- 繪製
  function art(name, state, fb) {
    if (W.Art && typeof W.Art[name] === 'function') {
      try { W.Art[name](sctxNow, state); return; } catch (e) { if (W.console) console.warn(name, e); }
    }
    if (fb) fb(sctxNow);
  }
  var sctxNow = sctx;
  function box(c, x, y, w, h, fill, label, color) {
    c.save(); c.fillStyle = fill; c.fillRect(x - w / 2, y - h / 2, w, h);
    if (label) { c.fillStyle = color || '#fff'; c.font = 'bold 12px "Microsoft JhengHei",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y); }
    c.restore();
  }
  function siteMeta(st) {
    var cs = {}, meta = [], maxR = -1, cmin = 99, cmax = -1;
    st.cells.forEach(function (q) { cs[q[0] + ',' + q[1]] = 1; maxR = Math.max(maxR, q[1]); cmin = Math.min(cmin, q[0]); cmax = Math.max(cmax, q[0]); });
    st.cells.forEach(function (q) {
      var c = q[0], r = q[1], a = c, b = c;
      while (cs[(a - 1) + ',' + r]) a--;
      while (cs[(b + 1) + ',' + r]) b++;
      var o = { c: c, r: r, end: false, bottom: false, order: 0 };
      if (st.kind === 'bridge') { o.end = (c === a || c === b); var md = Math.floor((b - a) / 2); o.order = md > 0 ? Math.min(c - a, b - c) / md : 0; }
      else if (st.kind === 'stairs') { o.bottom = (r === maxR); o.order = cmax > cmin ? (c - cmin) / (cmax - cmin) : 0; }
      meta.push(o);
    });
    return meta;
  }
  function drawMonster(m, d) {
    var p = monPos(m), t = m[0], br = brood(d, m);
    function one(type, x, y) {
      var D = MDEF[type] || { w: 32, h: 32 };
      var s = { x: x, y: y, facing: -1, state: PREVIEW_STATE[type], flingDir: 0, hit: false, brood: br, t: 0 }, fn = null;
      switch (type) {
        case 'boar': fn = 'drawBoar'; break;
        case 'frog': fn = 'drawFrog'; delete s.t; break;
        case 'bee': fn = 'drawShooterBee'; break;
        case 'thorn': fn = 'drawThorn'; s.stateT = 0; delete s.flingDir; break;
        case 'ram': fn = 'drawRam'; break;
        case 'hawk': fn = 'drawHawk'; s.angle = 0; break;
        case 'lizard': fn = 'drawLizard'; delete s.flingDir; break;
        case 'shield': fn = 'drawShieldman'; s.hasShield = true; s.breakT = 0.4; s.breakDur = 0.4; break;
        case 'beetle': fn = 'drawBeetle'; s.fuseT = 0.8; s.fuseDur = 0.8; break;
        case 'bat': fn = 'drawBat'; break;
        case 'mother': fn = 'drawBroodmother'; s = { x: x, y: y, kind: m[3] || 'forest', facing: -1, state: 'walk', stateT: 0, stateDur: 0, hit: false, t: 0 }; break;
      }
      art(fn, s, function (c) { box(c, x, y, D.w, D.h, br ? 'rgba(150,60,200,.8)' : 'rgba(200,50,50,.8)', MON_ZH[t] || t); });
    }
    if (t === 'bats') { for (var i = 0; i < 3; i++) one('bat', p.x + 50 * Math.cos(i * 2.0944), p.y + 50 * Math.sin(i * 2.0944)); }
    else one(t, p.x, p.y);
  }
  function renderScene() {
    var c = sctx, d = cur(), th = theme(), base = LC.baseGrid(d), r, cc;
    sctxNow = c;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1280, 720);
    art('drawBackground', { theme: th, t: 0 }, function (k) { k.fillStyle = '#25324a'; k.fillRect(0, 0, 1280, 720); });
    d.sites.forEach(function (s) { if (s.kind === 'nestgate' && s.lair) art('drawLairBack', { x: s.lair[0] * TS, y: s.lair[1] * TS, w: s.lair[2] * TS, h: s.lair[3] * TS, lairTheme: th }, function (k) { k.fillStyle = 'rgba(80,30,100,.5)'; k.fillRect(s.lair[0] * TS, s.lair[1] * TS, s.lair[2] * TS, s.lair[3] * TS); }); });
    function sb(x, y) { if (x < 0 || x >= GW || y >= GH) return true; if (y < 0) return false; return base[y][x] > 0; }
    for (r = 0; r < GH; r++) for (cc = 0; cc < GW; cc++) {
      var v = base[r][cc];
      if (!v) continue;
      (function (v, cc, r) {
        art('drawGround', { x: cc * TS + 20, y: r * TS + 20, theme: v === 2 ? 'lair' : th, open: { n: !sb(cc, r - 1), e: !sb(cc + 1, r), s: !sb(cc, r + 1), w: !sb(cc - 1, r) } },
          function (k) { k.fillStyle = v === 2 ? '#5a3a6a' : '#6a5038'; k.fillRect(cc * TS, r * TS, TS, TS); });
      })(v, cc, r);
    }
    d.spikes.forEach(function (q) { art('drawSpike', { x: q[0] * TS + 20, y: q[1] * TS + 20, theme: th }, function (k) { box(k, q[0] * TS + 20, q[1] * TS + 30, 36, 20, '#e5484d', '刺'); }); });
    d.cracks.forEach(function (q) { art('drawCrackWall', { x: q[0] * TS + 20, y: q[1] * TS + 20, hp: 3, theme: th }, function (k) { box(k, q[0] * TS + 20, q[1] * TS + 20, 40, 40, '#c99a6c', '裂'); }); });
    d.sites.forEach(function (st, i) {
      var rp = !!S.rep[i];
      if (st.kind === 'nestgate') {
        if (st.gate) art('drawNestGate', { x: (st.gate[0] + 1) * TS, y: (st.gate[1] + 1) * TS, open: rp, lairTheme: th, buildT: rp ? 0.6 : 0, buildDur: 0.6 }, function (k) { box(k, (st.gate[0] + 1) * TS, (st.gate[1] + 1) * TS, 80, 80, rp ? 'rgba(90,60,110,.4)' : '#5a3a6a', '巢穴門'); });
        return;
      }
      if (st.kind === 'rubble' && rp) return;
      siteMeta(st).forEach(function (o) {
        art('drawWorksite', { x: o.c * TS + 20, y: o.r * TS + 20, kind: st.kind, role: st.role, repaired: rp, theme: th, end: o.end, bottom: o.bottom, buildT: rp ? 0.6 : 0, buildDur: 0.6, order: o.order },
          function (k) { box(k, o.c * TS + 20, o.r * TS + 20, 38, 38, rp || st.kind === 'rubble' ? '#7d8898' : 'rgba(125,136,152,.35)', KIND_ZH[st.kind].charAt(0)); });
      });
    });
    d.picks.forEach(function (p) {
      var x = p[1] * TS + 20 + (p[3] || 0), y = p[2] * TS + 20;
      art('drawPickup', { x: x, y: y, kind: p[0], t: 0 }, function (k) { box(k, x, y, 22, 22, { wood: '#b8682a', stone: '#a9b3be', crystal: '#3fd6ea' }[p[0]] || '#fff', PICK_ZH[p[0]].charAt(0), '#000'); });
    });
    if (d.chest) art('drawChest', { x: d.chest[0] * TS + 20, y: d.chest[1] * TS - 18, open: false }, function (k) { box(k, d.chest[0] * TS + 20, d.chest[1] * TS - 18, 40, 36, '#c27a2e', '寶箱'); });
    if (d.goal) {
      var gx = S.lv === 7 ? 640 : d.goal[0] * TS + 20;
      art('drawGoal', { x: gx, y: d.goal[1] * TS - 40, reached: false, cheerT: 1.4, cheerDur: 1.4 }, function (k) { box(k, gx, d.goal[1] * TS - 40, 40, 80, '#ffd23f', '終點', '#000'); });
    }
    d.mons.forEach(function (m) { drawMonster(m, d); });
    if (S.lv === 7 && W.BOSS_IDLE && W.Art && W.Art.drawColossus) {
      c.save(); c.globalAlpha = 0.55;
      try { var B = W.BOSS_IDLE; W.Art.drawColossus(c, { hx: B.hx, hy: B.hy, phase: B.phase, eye: B.eye, lid: B.lid, split: B.split, weak: B.weak, angry: B.angry, lf: B.lf, rf: B.rf, blocks: B.blocks, plFall: 0, roar: 0, steam: 0, hit: false, ko: false, koT: 1.5, koDur: 1.5, t: 0 }); } catch (e) { }
      c.restore();
    }
    if (d.start) art('drawPlayer', { x: d.start[0] * TS + 20, y: d.start[1] * TS - 18, cls: 'sword', facing: 1, pose: 'idle', poseT: 0, invuln: 0, stealth: false, stealthT: 2.5, stealthDur: 2.5, unstealthT: 0.3, unstealthDur: 0.3 },
      function (k) { box(k, d.start[0] * TS + 20, d.start[1] * TS - 18, 28, 36, '#3d8bfd', '起'); });
    if (S.fogMode !== 'off') {
      d.sites.forEach(function (st, i) {
        if (S.rep[i]) return;
        st.fog.forEach(function (f) {
          c.save(); c.globalAlpha = S.fogMode === 'half' ? 0.5 : 1;
          art('drawFog', { x: f[0] * TS, y: f[1] * TS, w: f[2] * TS, h: f[3] * TS, t: 0, theme: th, clearP: 0, ox: (f[0] + f[2] / 2) * TS, oy: (f[1] + f[3] / 2) * TS, maxR: 0 },
            function (k) { k.fillStyle = 'rgba(200,210,230,.8)'; k.fillRect(f[0] * TS, f[1] * TS, f[2] * TS, f[3] * TS); });
          c.restore();
        });
      });
    }
    d.sites.forEach(function (st, i) {
      if (!st.sign) return;
      // 預覽修好時遊戲裡牌子會消失, 但編輯時仍要看得到位置才能選取 / 移動, 改畫半透明
      c.save(); if (S.rep[i]) c.globalAlpha = 0.35;
      art('drawSiteSign', { x: st.sign[0] * TS + 20, y: st.sign[1] * TS - 24, role: st.role, num: i + 1 }, function (k) { box(k, st.sign[0] * TS + 20, st.sign[1] * TS - 24, 36, 48, '#8a5a2a', '牌' + (i + 1)); });
      c.restore();
    });
    c.restore();
    S.sceneDirty = false;
  }
  function dashRect(c, x, y, w, h, col, lw, dash) {
    c.save(); c.strokeStyle = col; c.lineWidth = lw || 2; c.setLineDash(dash || [6, 4]); c.strokeRect(x + 1, y + 1, w - 2, h - 2); c.restore();
  }
  function label(c, s, x, y, col, bg) {
    c.save(); c.font = 'bold 13px "Microsoft JhengHei",sans-serif'; c.textBaseline = 'top';
    var w = c.measureText(s).width + 8;
    c.fillStyle = bg || 'rgba(0,0,0,.7)'; c.fillRect(x, y, w, 18);
    c.fillStyle = col || '#fff'; c.fillText(s, x + 4, y + 2); c.restore();
  }
  function render() {
    if (S.sceneDirty) renderScene();
    var c = ctx, d = cur();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, 1280, 720);
    c.drawImage(scene, 0, 0);
    // 可走範圍
    var ck = S.check[S.lv];
    if (S.showReach && ck && ck.reach) {
      c.save(); c.fillStyle = 'rgba(80,230,120,.22)';
      Object.keys(ck.reach.touched).forEach(function (k) { var p = k.split(','); c.fillRect(+p[0] * TS, +p[1] * TS, TS, TS); });
      c.fillStyle = 'rgba(80,255,140,.9)';
      Object.keys(ck.reach.nodes).forEach(function (k) { var p = k.split(','); c.beginPath(); c.arc(+p[0] * TS + 20, +p[1] * TS + 34, 4, 0, 7); c.fill(); });
      c.restore();
    }
    // 格線 + 欄列編號
    if (S.grid) {
      c.save(); c.strokeStyle = 'rgba(255,255,255,.13)'; c.lineWidth = 1; c.beginPath();
      for (var x = 0; x <= GW; x++) { c.moveTo(x * TS + 0.5, 0); c.lineTo(x * TS + 0.5, 720); }
      for (var y = 0; y <= GH; y++) { c.moveTo(0, y * TS + 0.5); c.lineTo(1280, y * TS + 0.5); }
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.beginPath();
      for (x = 0; x <= GW; x += 5) { c.moveTo(x * TS + 0.5, 0); c.lineTo(x * TS + 0.5, 720); }
      for (y = 0; y <= GH; y += 5) { c.moveTo(0, y * TS + 0.5); c.lineTo(1280, y * TS + 0.5); }
      c.stroke();
      c.font = '10px sans-serif'; c.fillStyle = 'rgba(255,255,255,.55)'; c.textBaseline = 'top';
      for (x = 0; x < GW; x++) c.fillText(String(x), x * TS + 2, 1);
      for (y = 1; y < GH; y++) c.fillText(String(y), 2, y * TS + 2);
      c.restore();
    }
    // 工程標示
    d.sites.forEach(function (st, i) {
      var col = SITE_COL[i] || '#fff', act = i === S.siteIdx;
      c.save(); c.globalAlpha = act ? 1 : 0.6;
      st.cells.forEach(function (q) { dashRect(c, q[0] * TS, q[1] * TS, TS, TS, col, act ? 2 : 1.5, [4, 3]); });
      if (st.cells.length) { var q0 = st.cells[0]; label(c, (i + 1) + ' ' + KIND_ZH[st.kind], q0[0] * TS, q0[1] * TS - 18, col); }
      st.fog.forEach(function (f) { dashRect(c, f[0] * TS, f[1] * TS, f[2] * TS, f[3] * TS, col, act ? 3 : 2, [10, 6]); label(c, '工程' + (i + 1) + ' 迷霧', f[0] * TS + 2, f[1] * TS + 2, col); });
      if (st.kind === 'nestgate') {
        if (st.lair) { dashRect(c, st.lair[0] * TS, st.lair[1] * TS, st.lair[2] * TS, st.lair[3] * TS, '#e07bff', 1.5, [3, 5]); label(c, '巢穴室', st.lair[0] * TS + 2, (st.lair[1] + st.lair[3]) * TS - 20, '#e07bff'); }
        if (st.gate) { dashRect(c, st.gate[0] * TS, st.gate[1] * TS, 80, 80, col, 2, [4, 3]); label(c, (i + 1) + ' 巢穴門', st.gate[0] * TS, st.gate[1] * TS - 18, col); }
      }
      c.restore();
    });
    if (d.start) label(c, '起點', d.start[0] * TS + 2, d.start[1] * TS - 58, '#9cd0ff');
    if (d.goal) label(c, S.lv === 7 ? '終點(Boss 倒下後落在中央)' : '終點', (S.lv === 7 ? 640 - 20 : d.goal[0] * TS) + 2, d.goal[1] * TS - 100, '#ffe27a');
    // 問題標示
    if (S.flash && S.flash.length) {
      c.save(); c.fillStyle = 'rgba(255,60,60,.28)'; c.strokeStyle = '#ff4a4a'; c.lineWidth = 2;
      S.flash.forEach(function (q) { c.fillRect(q[0] * TS, q[1] * TS, TS, TS); c.strokeRect(q[0] * TS + 1, q[1] * TS + 1, TS - 2, TS - 2); });
      c.restore();
    }
    // 選取
    if (S.sel) {
      var o = objects(d).filter(function (x) { return sameObj(x, S.sel); })[0];
      if (o) { c.save(); c.strokeStyle = '#ffd84a'; c.lineWidth = 2; c.setLineDash([5, 3]); c.strokeRect(o.x - o.w / 2 - 3, o.y - o.h / 2 - 3, o.w + 6, o.h + 6); c.restore(); }
    }
    // 拖曳矩形預覽
    if (S.drag && S.drag.kind === 'rect' && S.hover) {
      var rc = rectOf(S.drag.c0, S.drag.r0, S.hover.c, S.hover.r);
      c.save(); c.fillStyle = 'rgba(255,216,74,.18)'; c.fillRect(rc[0] * TS, rc[1] * TS, rc[2] * TS, rc[3] * TS); c.restore();
      dashRect(c, rc[0] * TS, rc[1] * TS, rc[2] * TS, rc[3] * TS, '#ffd84a', 2, [6, 3]);
      label(c, rc[2] + '×' + rc[3], rc[0] * TS + 2, rc[1] * TS + 2, '#ffd84a');
    }
    // 游標格
    if (S.hover && inGrid(S.hover.c, S.hover.r)) {
      var hc = S.hover.c, hr = S.hover.r, hw = 1, hh = 1;
      if (S.tool === 'gate') { hw = 2; hh = 2; }
      c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.strokeRect(hc * TS + 1, hr * TS + 1, hw * TS - 2, hh * TS - 2); c.restore();
    }
  }
  var rafPending = false;
  function redraw() { if (rafPending) return; rafPending = true; requestAnimationFrame(function () { rafPending = false; render(); }); }

  // ---------------------------------------------------------------- 滑鼠
  function rectOf(c0, r0, c1, r1) {
    c0 = Math.max(0, Math.min(GW - 1, c0)); c1 = Math.max(0, Math.min(GW - 1, c1));
    r0 = Math.max(0, Math.min(GH - 1, r0)); r1 = Math.max(0, Math.min(GH - 1, r1));
    return [Math.min(c0, c1), Math.min(r0, r1), Math.abs(c1 - c0) + 1, Math.abs(r1 - r0) + 1];
  }
  function evPos(e) {
    var b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * 1280 / b.width, y = (e.clientY - b.top) * 720 / b.height;
    return { x: x, y: y, c: Math.floor(x / TS), r: Math.floor(y / TS) };
  }
  var TERRAIN = { solid: '#', lair: 'L', erase: '.' };
  function curSite() { return cur().sites[S.siteIdx] || null; }
  function needSite() {
    if (!curSite()) { toast('這關還沒有工程 ' + (S.siteIdx + 1) + ', 先在右邊「工程」按「新增工程」。'); return false; }
    return true;
  }
  function paintCell(p) {
    var d = cur();
    if (!inGrid(p.c, p.r)) return;
    var t = S.drag;
    if (t.tool === 'spike' || t.tool === 'crack') {
      var arr = t.tool === 'spike' ? d.spikes : d.cracks, ix = -1;
      arr.forEach(function (q, i) { if (eqCell(q, p.c, p.r)) ix = i; });
      if (t.erase) { if (ix >= 0) arr.splice(ix, 1); }
      else if (ix < 0) arr.push([p.c, p.r]);
    } else if (t.tool === 'cells') {
      var st = curSite(), k = -1;
      st.cells.forEach(function (q, i) { if (eqCell(q, p.c, p.r)) k = i; });
      if (t.erase) { if (k >= 0) st.cells.splice(k, 1); }
      else if (k < 0) st.cells.push([p.c, p.r]);
    } else setTile(d, p.c, p.r, t.ch);
    S.sceneDirty = true;
  }
  function placeAt(p, e) {
    var d = cur(), c = p.c, r = p.r;
    if (!inGrid(c, r)) return;
    edit(function () {
      switch (S.tool) {
        case 'mon':
          var m = [S.monType, c, monRowFromCell(S.monType, r)];
          if (S.monType === 'mother') m.push(S.motherTheme);
          d.mons.push(m); S.sel = { t: 'mon', i: d.mons.length - 1 }; break;
        case 'pick': d.picks.push([S.pickKind, c, r]); S.sel = { t: 'pick', i: d.picks.length - 1 }; break;
        case 'chest': d.chest = [c, r + 1, d.chest ? d.chest[2] : S.chestDev]; S.sel = { t: 'chest' }; break;
        case 'start': d.start = [c, r + 1]; S.sel = { t: 'start' }; break;
        case 'goal': d.goal = [c, r + 1]; S.sel = { t: 'goal' }; break;
        case 'sign': if (needSite()) { curSite().sign = [c, r + 1]; S.sel = { t: 'sign', i: S.siteIdx }; } break;
        case 'gate':
          if (!needSite()) break;
          if (curSite().kind !== 'nestgate') { toast('工程 ' + (S.siteIdx + 1) + ' 不是巢穴門, 先在右邊把結構改成「巢穴門」。'); break; }
          curSite().gate = [Math.min(c, GW - 2), Math.min(r, GH - 2)]; S.sel = { t: 'gate', i: S.siteIdx }; break;
      }
    });
  }
  function onDown(e) {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    var p = evPos(e), right = e.button === 2, d = cur(), tool = S.tool;
    S.hover = p;
    if (TERRAIN[tool] !== undefined) {
      var ch = right ? '.' : TERRAIN[tool];
      if (S.rectMode || e.shiftKey) S.drag = { kind: 'rect', c0: p.c, r0: p.r, ch: ch, tool: tool };
      else { beginEdit(); S.drag = { kind: 'paint', ch: ch, tool: tool }; paintCell(p); }
      redraw(); return;
    }
    if (tool === 'spike' || tool === 'crack' || tool === 'cells') {
      if (tool === 'cells' && !needSite()) return;
      if (tool === 'cells' && curSite().kind === 'nestgate') { toast('巢穴門不用結構格, 改用「巢穴門」工具放門。'); return; }
      beginEdit(); S.drag = { kind: 'paint', tool: tool, erase: right }; paintCell(p); redraw(); return;
    }
    if (tool === 'fog' || tool === 'lairroom') {
      if (!needSite()) return;
      if (tool === 'lairroom' && curSite().kind !== 'nestgate') { toast('只有巢穴門工程有巢穴室, 先把結構改成「巢穴門」。'); return; }
      if (right && tool === 'fog') {
        edit(function () {
          var sites = [S.siteIdx].concat([0, 1, 2].filter(function (i) { return i !== S.siteIdx; })), done = false;
          sites.forEach(function (si) {
            var st = d.sites[si]; if (!st || done) return;
            for (var k = st.fog.length - 1; k >= 0; k--) { var f = st.fog[k]; if (p.c >= f[0] && p.c < f[0] + f[2] && p.r >= f[1] && p.r < f[1] + f[3]) { st.fog.splice(k, 1); done = true; break; } }
          });
        });
        return;
      }
      if (!right) { S.drag = { kind: 'rect', c0: p.c, r0: p.r, tool: tool }; redraw(); }
      return;
    }
    if (tool === 'select' || right) {
      var hits = hitAt(p.x, p.y);
      if (right) {
        if (hits.length) { edit(function () { deleteObj(d, hits[0]); }); S.sel = null; refreshAll(); }
        return;
      }
      var ix = -1; hits.forEach(function (h, i) { if (sameObj(h, S.sel)) ix = i; });
      var pickObj = ix >= 0 ? hits[ix] : (hits[0] || null);
      S.sel = pickObj ? { t: pickObj.t, i: pickObj.i } : null;
      if (pickObj) {
        var ref = objRef(d, pickObj);
        S.drag = { kind: 'move', c0: p.c, r0: p.r, orig: ref ? [ref.arr[ref.ci], ref.arr[ref.ci + 1]] : null, moved: false,
          cycle: ix >= 0 && hits.length > 1 ? hits[(ix + 1) % hits.length] : null };
      }
      refreshSel(); redraw(); return;
    }
    placeAt(p, e); refreshAll(); redraw();
  }
  function onMove(e) {
    var p = evPos(e), d = cur();
    var old = S.hover; S.hover = p;
    $('stCell').textContent = inGrid(p.c, p.r) ? ('欄 ' + p.c + ' · 列 ' + p.r + '    ' + cellInfo(p.c, p.r)) : '—';
    if (S.drag) {
      if (S.drag.kind === 'paint') paintCell(p);
      else if (S.drag.kind === 'move' && S.drag.orig && S.sel) {
        var dc = p.c - S.drag.c0, dr = p.r - S.drag.r0, ref = objRef(d, S.sel);
        if (ref && (dc || dr || S.drag.moved)) {
          if (!S.drag.moved) { beginEdit(); S.drag.moved = true; }
          ref.arr[ref.ci] = S.drag.orig[0] + dc; ref.arr[ref.ci + 1] = S.drag.orig[1] + dr;
          S.sceneDirty = true;
        }
      }
      redraw(); return;
    }
    if (!old || old.c !== p.c || old.r !== p.r) redraw();
  }
  function onUp(e) {
    var t = S.drag; if (!t) return;
    S.drag = null;
    var d = cur();
    if (t.kind === 'paint') endEdit();
    else if (t.kind === 'move') { if (t.moved) endEdit(); else if (t.cycle) S.sel = { t: t.cycle.t, i: t.cycle.i }; }
    else if (t.kind === 'rect' && S.hover) {
      var rc = rectOf(t.c0, t.r0, S.hover.c, S.hover.r);
      edit(function () {
        if (t.tool === 'fog') curSite().fog.push(rc);
        else if (t.tool === 'lairroom') curSite().lair = rc;
        else for (var r = rc[1]; r < rc[1] + rc[3]; r++) for (var c = rc[0]; c < rc[0] + rc[2]; c++) setTile(d, c, r, t.ch);
      });
    }
    refreshAll(); redraw();
  }
  function cellInfo(c, r) {
    var ch = tileAt(cur(), c, r);
    var s = ch === '#' ? '實心' : (ch === 'L' ? '巢穴實心' : '空');
    var hits = hitAt(c * TS + 20, r * TS + 20).map(function (o) { return objName(cur(), o); });
    return s + (hits.length ? ' · ' + hits.join('、') : '');
  }

  // ---------------------------------------------------------------- 面板
  function refreshLevels() {
    var h = '';
    NAMES.forEach(function (n, i) {
      var ck = S.check[i], errs = ck ? ck.problems.filter(function (p) { return p.sev === 'err'; }).length : 0;
      h += '<button data-lv="' + i + '" class="' + (i === S.lv ? 'on' : '') + '" title="' + esc(n) + '">' + (i + 1) + ' ' + esc(n) + '<small>' + (THEME_ZH[THEMES[i]] || '') + '</small>' + (errs ? '<span class="badge">' + errs + '</span>' : '') + '</button>';
    });
    $('levels').innerHTML = h;
  }
  function refreshTools() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (b) { b.classList.toggle('on', b.getAttribute('data-tool') === S.tool); });
    $('rectMode').checked = S.rectMode;
    $('stHint').textContent = (TOOL_ZH[S.tool] || '') + ': ' + (TOOL_HINT[S.tool] || '');
    $('curSiteLbl').textContent = '工程 ' + (S.siteIdx + 1);
    var o = $('toolOpts'), h = '', th = theme();
    if (S.tool === 'mon') {
      h += '<div class="olist">';
      MONS.forEach(function (m) {
        var other = m[2] !== 'nest' && m[2] !== th;
        h += '<button data-mon="' + m[0] + '" class="' + (S.monType === m[0] ? 'on ' : '') + (other ? 'other' : '') + '"><canvas width="64" height="64" data-icon="' + m[0] + '"></canvas>' + m[1] + '<span class="th">' + THEME_ZH[m[2]] + '</span></button>';
      });
      h += '</div>';
      if (S.monType === 'mother') {
        h += '<div class="row"><label>巢母主題</label><select id="motherTheme">' + ['forest', 'cliff', 'mine'].map(function (t) { return '<option value="' + t + '"' + (S.motherTheme === t ? ' selected' : '') + '>' + THEME_ZH[t] + '</option>'; }).join('') + '</select></div>';
      }
      h += '<div class="hint">灰掉的是別的主題的怪(還是可以放)。' + (FLYER[S.monType] ? '飛行怪: 點牠所在的格子。' : (S.monType === 'lizard' ? '落石蜥: 點天花板正下方那一格。' : '地面怪: 點身體所在的格子, 腳下那格要是地面。')) + '</div>';
    } else if (S.tool === 'pick') {
      h += '<div class="olist">' + ['wood', 'stone', 'crystal'].map(function (k) { return '<button data-pk="' + k + '" class="' + (S.pickKind === k ? 'on' : '') + '"><canvas width="64" height="64" data-icon="pick:' + k + '"></canvas>' + PICK_ZH[k] + '</button>'; }).join('') + '</div>';
      h += '<div class="hint">同一格可以放好幾個, 選起來後在右邊用「水平微調」錯開。</div>';
    } else if (S.tool === 'chest') {
      h += '<div class="row"><label>裝置</label><select id="chestDev">' + DEV_ORDER.map(function (k) { return '<option value="' + k + '"' + (S.chestDev === k ? ' selected' : '') + '>' + (DEV_ZH[k] || k) + '</option>'; }).join('') + '</select></div>';
      h += '<div class="hint">每關只有 1 個寶箱; 再點一次 = 搬到新位置。</div>';
    } else if (TERRAIN[S.tool] !== undefined) {
      h += '<div class="hint">「實心」是一般地形, 「巢穴實心」畫成巢穴室裡的牆(碰撞一樣)。按住 Shift 拖曳 = 矩形一次填滿。</div>';
    } else if (['cells', 'sign', 'fog', 'gate', 'lairroom'].indexOf(S.tool) >= 0) {
      h += '<div class="hint">正在編輯 <b style="color:' + SITE_COL[S.siteIdx] + '">工程 ' + (S.siteIdx + 1) + '</b>(按 1 / 2 / 3 或右邊分頁切換)。</div>';
    } else h += '<div class="hint">點物件選取, 拖曳搬家, 右鍵或 Delete 刪除。</div>';
    o.innerHTML = h;
    Array.prototype.forEach.call(o.querySelectorAll('canvas[data-icon]'), drawIcon);
  }
  function drawIcon(cvs) {
    var k = cvs.getAttribute('data-icon'), c = cvs.getContext('2d');
    c.clearRect(0, 0, 64, 64);
    if (!W.Art) return;
    sctxNow = c;
    c.save();
    try {
      if (k.indexOf('pick:') === 0) { c.translate(32, 32); c.scale(1.6, 1.6); W.Art.drawPickup(c, { x: 0, y: 0, kind: k.slice(5), t: 0 }); }
      else if (k === 'bats') {
        c.translate(32, 32); c.scale(1.2, 1.2);
        [[-10, 6], [10, 6], [0, -9]].forEach(function (q) { W.Art.drawBat(c, { x: q[0], y: q[1], facing: -1, state: 'fly', flingDir: 0, hit: false, brood: false, t: 0 }); });
      }
      else {
        var t = k, D = MDEF[t] || { w: 32, h: 32 }, s = Math.min(1.4, 56 / Math.max(D.w, D.h));
        var m = [k, 5, 5, S.motherTheme], p = monPos(m);
        c.translate(32, 32); c.scale(s, s); c.translate(-p.x, -p.y);
        drawMonster(m, { sites: [], tiles: [] });
      }
    } catch (e) { }
    c.restore();
    sctxNow = sctx;
  }
  function refreshSel() {
    var d = cur(), o = S.sel, h = '';
    if (o && !objRef(d, o)) o = S.sel = null;
    if (!o) { $('selBox').innerHTML = '<div class="none">沒有選取。用「選取移動」工具點畫面上的物件。</div>'; return; }
    h += '<div class="row"><b>' + esc(objName(d, o)) + '</b>';
    var ref = objRef(d, o);
    if (ref) h += '<span style="color:var(--dim)">欄 ' + ref.arr[ref.ci] + ' · 列 ' + ref.arr[ref.ci + 1] + '</span>';
    h += '<button id="selDel" style="margin-left:auto">刪除</button></div>';
    if (o.t === 'pick') {
      var p = d.picks[o.i];
      h += '<div class="row"><label>種類</label><select id="selPk">' + ['wood', 'stone', 'crystal'].map(function (k) { return '<option value="' + k + '"' + (p[0] === k ? ' selected' : '') + '>' + PICK_ZH[k] + '</option>'; }).join('') + '</select></div>';
      h += '<div class="row"><label>水平微調</label><input type="number" id="selDx" min="-20" max="20" step="2" value="' + (p[3] || 0) + '" style="width:70px"> px</div>';
    } else if (o.t === 'mon') {
      var m = d.mons[o.i];
      h += '<div class="row"><label>種類</label><select id="selMon">' + MONS.map(function (x) { return '<option value="' + x[0] + '"' + (m[0] === x[0] ? ' selected' : '') + '>' + x[1] + '(' + THEME_ZH[x[2]] + ')</option>'; }).join('') + '</select></div>';
      if (m[0] === 'mother') h += '<div class="row"><label>巢母主題</label><select id="selMk">' + ['forest', 'cliff', 'mine'].map(function (t) { return '<option value="' + t + '"' + (m[3] === t ? ' selected' : '') + '>' + THEME_ZH[t] + '</option>'; }).join('') + '</select></div>';
      var D = MDEF[m[0] === 'bats' ? 'bat' : m[0]];
      if (D) h += '<div class="row" style="color:var(--dim);font-size:12px">血 ' + D.hp + (D.sh ? ' + 盾 ' + D.sh : '') + (m[0] === 'bats' ? ' × 3 隻' : '') + '</div>';
    } else if (o.t === 'chest') {
      h += '<div class="row"><label>裝置</label><select id="selDev">' + DEV_ORDER.map(function (k) { return '<option value="' + k + '"' + (d.chest[2] === k ? ' selected' : '') + '>' + (DEV_ZH[k] || k) + '</option>'; }).join('') + '</select></div>';
    }
    $('selBox').innerHTML = h;
  }
  function refreshSites() {
    var d = cur(), h = '';
    [0, 1, 2].forEach(function (i) { h += '<button data-s="' + i + '" class="' + (i === S.siteIdx ? 'on' : '') + '"' + (d.sites[i] ? '' : ' style="opacity:.5"') + '>工程 ' + (i + 1) + '</button>'; });
    $('siteTabs').innerHTML = h;
    var st = d.sites[S.siteIdx];
    h = '';
    if (!st) {
      h = '<div class="row" style="color:var(--dim)">這關沒有工程 ' + (S.siteIdx + 1) + '。</div>';
      if (d.sites.length < 3 && S.lv !== 7) h += '<button id="siteAdd">新增工程</button>';
      if (S.lv === 7) h += '<div class="row" style="color:var(--dim);font-size:12px">第 8 關是 Boss 競技場, 沒有工程。</div>';
    } else {
      var cost = (SITE_COST[S.lv] || [])[S.siteIdx];
      h += '<div class="row"><label>結構</label><select id="siteKind">' + Object.keys(KIND_ZH).map(function (k) { return '<option value="' + k + '"' + (st.kind === k ? ' selected' : '') + '>' + KIND_ZH[k] + '</option>'; }).join('') + '</select>';
      h += '<label style="min-width:0">角色</label><select id="siteRole">' + Object.keys(ROLE_ZH).map(function (k) { return '<option value="' + k + '"' + (st.role === k ? ' selected' : '') + '>' + ROLE_ZH[k] + '</option>'; }).join('') + '</select></div>';
      h += '<div class="row" style="font-size:12px;color:var(--dim)">花費 石頭 ' + (cost === undefined ? '?' : cost) + '(改花費要改 game.js 的 SITE_COST)</div>';
      if (st.kind !== 'nestgate') h += '<div class="row"><label>結構格</label>' + st.cells.length + ' 格 <button id="siteClrCells">清空</button></div>';
      else {
        h += '<div class="row"><label>巢穴門</label>' + (st.gate ? '欄 ' + st.gate[0] + ' · 列 ' + st.gate[1] : '<span style="color:var(--err)">還沒放</span>') + '</div>';
        h += '<div class="row"><label>巢穴室</label>' + (st.lair ? st.lair[2] + '×' + st.lair[3] + '(欄 ' + st.lair[0] + ' · 列 ' + st.lair[1] + ')' : '<span style="color:var(--err)">還沒畫</span>') + '</div>';
      }
      h += '<div class="row"><label>工程牌</label>' + (st.sign ? '欄 ' + st.sign[0] + ' · 列 ' + (st.sign[1] - 1) : '<span style="color:var(--warn)">還沒放</span>') + '</div>';
      h += '<div class="fogs"><div><span style="color:var(--dim)">迷霧 ' + st.fog.length + ' 塊</span></div>';
      st.fog.forEach(function (f, k) { h += '<div><span>' + f[2] + '×' + f[3] + '(欄 ' + f[0] + ' · 列 ' + f[1] + ')</span><button data-delfog="' + k + '">刪</button></div>'; });
      h += '</div><div class="row"><button id="siteDel">刪除這處工程</button></div>';
    }
    $('siteBox').innerHTML = h;
    var rb = '';
    d.sites.forEach(function (s, i) { rb += '<label style="min-width:0;margin-right:6px;color:' + SITE_COL[i] + '"><input type="checkbox" data-rep="' + i + '"' + (S.rep[i] ? ' checked' : '') + '> ' + (i + 1) + '</label>'; });
    $('repBoxes').innerHTML = rb || '<span style="color:var(--dim)">(沒有工程)</span>';
  }
  function refreshProblems() {
    var ck = S.check[S.lv], el = $('problems');
    if (!ck) { el.innerHTML = '<div style="color:var(--dim)">檢查中…</div>'; $('probSum').textContent = ''; return; }
    var P = ck.problems, ne = 0, nw = 0;
    P.forEach(function (p) { if (p.sev === 'err') ne++; else if (p.sev === 'warn') nw++; });
    $('probSum').textContent = '嚴重 ' + ne + ' · 注意 ' + nw + (ck.ms ? ' · ' + ck.ms + 'ms' : '');
    if (!P.length) { el.innerHTML = '<div class="ok">✔ 沒發現問題</div>'; return; }
    el.innerHTML = P.map(function (p, i) { return '<div class="p ' + p.sev + (i === S.flashIdx ? ' picked' : '') + '" data-pi="' + i + '">' + (p.sev === 'err' ? '⛔ ' : (p.sev === 'warn' ? '⚠ ' : 'ℹ ')) + esc(p.msg) + '</div>'; }).join('');
  }
  function refreshStats() {
    var d = cur(), rows = {}, order = [];
    function row(k) { if (!rows[k]) { rows[k] = { wood: 0, stone: 0, crystal: 0, mons: 0, hp: 0, sh: 0 }; order.push(k); } return rows[k]; }
    function zname(z) { return z === -1 ? '主路' : (z >= 0 ? '工程 ' + (z + 1) + ' 區' : '斷橋下坑底'); }
    row('主路');
    d.picks.forEach(function (p) { var r = row(zname(LC.zOf(d, p[1], p[2]))); r[p[0]] = (r[p[0]] || 0) + 1; });
    d.mons.forEach(function (m) {
      var b = LC.monBodyCell(m), z = LC.zOf(d, m[0] === 'lizard' ? m[1] : b[0], m[0] === 'lizard' ? m[2] : b[1]), r = row(zname(z));
      var D = MDEF[m[0] === 'bats' ? 'bat' : m[0]] || { hp: 0 }, n = m[0] === 'bats' ? 3 : 1;
      r.mons += 1; r.hp += D.hp * n; r.sh += (D.sh || 0) * n;
    });
    var h = '<table><tr><th>區域</th><th>木</th><th>石</th><th>晶</th><th>怪</th><th>總血</th></tr>';
    order.forEach(function (k) { var r = rows[k]; h += '<tr><td>' + k + '</td><td>' + r.wood + '</td><td>' + r.stone + '</td><td>' + r.crystal + '</td><td>' + r.mons + '</td><td>' + r.hp + (r.sh ? '+盾' + r.sh : '') + '</td></tr>'; });
    h += '</table><div style="margin-top:4px">尖刺 ' + d.spikes.length + ' · 裂岩牆 ' + d.cracks.length + (d.chest ? ' · 寶箱: ' + (DEV_ZH[d.chest[2]] || d.chest[2]) : ' · 沒有寶箱') + '</div>';
    $('stats').innerHTML = h;
  }
  function refreshSaveState() {
    var dirty = JSON.stringify(S.defs) !== S.savedJSON, el = $('saveState');
    el.textContent = dirty ? '● 有還沒存檔的修改' : (S.lastSave ? '已存檔 ' + S.lastSave : '和檔案相同');
    el.className = dirty ? 'dirty' : '';
    $('bUndo').disabled = !S.undo.length; $('bRedo').disabled = !S.redo.length;
    document.title = (dirty ? '● ' : '') + '回放冒險 關卡編輯器';
  }
  function refreshAll() { refreshLevels(); refreshTools(); refreshSel(); refreshSites(); refreshProblems(); refreshStats(); refreshSaveState(); redraw(); }

  // ---------------------------------------------------------------- 檢查
  function runCheckFor(i) {
    var t0 = Date.now(), res;
    try { res = LC.validate(S.defs[i], { idx: i, env: ENV }); }
    catch (e) { res = { problems: [{ sev: 'err', msg: '檢查程式出錯: ' + e.message, cells: [] }] }; }
    res.ms = Date.now() - t0;
    S.check[i] = res;
  }
  function runCheck() {
    runCheckFor(S.lv);
    S.flash = null; S.flashIdx = -1;
    refreshLevels(); refreshProblems(); redraw();
  }
  function checkAllLater() {
    var i = 0;
    (function next() {
      if (i >= S.defs.length) { refreshLevels(); return; }
      if (!S.check[i]) runCheckFor(i);
      i++; refreshLevels();
      if (i - 1 === S.lv) refreshProblems();
      setTimeout(next, 30);
    })();
  }

  // ---------------------------------------------------------------- 存檔
  function textOut() { return Fmt.serialize(S.defs, NAMES); }
  function idb() {
    return new Promise(function (res, rej) {
      try { var q = indexedDB.open('LoopRaiderLevelEditor', 1); q.onupgradeneeded = function () { q.result.createObjectStore('kv'); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }
      catch (e) { rej(e); }
    });
  }
  function idbGet(k) { return idb().then(function (db) { return new Promise(function (res, rej) { var r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }); }
  function idbSet(k, v) { return idb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); }; }); }); }
  var fileHandle = null;
  function markSaved(how, keepDraft) {
    S.savedJSON = JSON.stringify(S.defs);
    var d = new Date(); S.lastSave = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + (how ? '(' + how + ')' : '');
    if (!keepDraft) S.fileJSON = S.savedJSON;
    if (keepDraft) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ t: Date.now(), defs: S.defs })); } catch (e) { } refreshSaveState(); return; }
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { }
    $('draftBanner').className = 'banner';
    refreshSaveState();
  }
  function confirmProblems() {
    var bad = [];
    S.defs.forEach(function (d, i) { if (!S.check[i]) runCheckFor(i); var n = S.check[i].problems.filter(function (p) { return p.sev === 'err'; }).length; if (n) bad.push('第 ' + (i + 1) + ' 關 ' + n + ' 個'); });
    refreshLevels();
    return !bad.length || W.confirm('還有嚴重問題: ' + bad.join('、') + '。\n有些問題(例如巢穴門沒放好)會讓遊戲打不開。\n\n還是要存檔嗎?');
  }
  // 回傳 Promise<'file' | 'download' | false>
  function save(forcePick) {
    // 先拿檔案(存檔視窗 / 要求權限都需要「剛點過按鈕」的使用者手勢), 拿到後才跳嚴重問題確認;
    // 先跳 confirm 會用掉手勢, 之後存檔視窗開不出來, 按確定後就沒反應
    var text = textOut();
    if (!W.showSaveFilePicker) { if (!confirmProblems()) return Promise.resolve(false); download(text); return Promise.resolve('download'); }
    var h = forcePick ? null : fileHandle;
    var getH = h ? Promise.resolve(h) : (forcePick ? Promise.resolve(null) : idbGet('levels').catch(function () { return null; }));
    return getH.then(function (hh) {
      if (!hh) return null;
      return hh.queryPermission({ mode: 'readwrite' }).then(function (p) { return p === 'granted' ? p : hh.requestPermission({ mode: 'readwrite' }); })
        .then(function (p) { return p === 'granted' ? hh : null; }).catch(function () { return null; });
    }).then(function (hh) {
      if (hh) return hh;
      toast('請在存檔視窗裡找到 <b>polish\\game\\game\\levels.js</b>, 選它並按「取代」。', 8000);
      return W.showSaveFilePicker({ suggestedName: 'levels.js', types: [{ description: 'levels.js 關卡資料', accept: { 'text/javascript': ['.js'] } }] });
    }).then(function (hh) {
      if (!hh) return false;
      if (!confirmProblems()) { toast('取消存檔'); return false; }
      if (hh.name !== 'levels.js' && !W.confirm('你選的檔案叫「' + hh.name + '」, 不是 levels.js, 遊戲不會讀它。還是要存嗎?')) return false;
      return hh.createWritable().then(function (w) { return w.write(text).then(function () { return w.close(); }); }).then(function () {
        fileHandle = hh; idbSet('levels', hh).catch(function () { });
        markSaved(hh.name); toast('✔ 已存到 ' + esc(hh.name)); return 'file';
      });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') { toast('取消存檔'); return false; }
      toast('直接存檔失敗(' + esc(e && e.message || e) + '), 改用下載。', 6000);
      download(text); return 'download';
    });
  }
  function download(text) {
    try {
      var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      a.href = url; a.download = 'levels.js'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      markSaved('已下載', true);
      toast('已下載 levels.js。請把它搬到 <b>polish\\game\\game\\</b> 取代舊的 levels.js, 遊戲才會用新關卡。', 10000);
    } catch (e) { toast('下載失敗: ' + esc(e.message)); }
  }
  function play() {
    var dirty = JSON.stringify(S.defs) !== S.savedJSON;
    var rep = cur().sites.map(function (s, i) { return S.rep[i] ? '1' : '0'; }).join('');
    var url = '../game/index.html?level=' + (S.lv + 1) + '&cls=' + $('playCls').value + (rep ? '&rep=' + rep : '');
    function go(how) {
      var w = null;
      try { w = W.open(url, '_blank'); } catch (e) { w = null; }
      if (!w) toast('瀏覽器擋住了新分頁, <a href="' + url + '" target="_blank">點這裡開試玩</a>' + (how === 'download' ? '(記得先把下載的 levels.js 放進 game 資料夾)' : ''), 12000);
      else if (how === 'download') toast('已開試玩分頁; 要先把下載的 levels.js 放進 game 資料夾再重新整理, 才會是新關卡。', 10000);
    }
    if (!dirty) { go('file'); return; }
    save(false).then(function (how) {
      if (how) go(how);
      else if (W.confirm('沒有存檔, 試玩的會是舊版關卡。還是要開嗎?')) go('file');
    });
  }

  // ---------------------------------------------------------------- 草稿
  function saveDraft() {
    try {
      if (JSON.stringify(S.defs) === S.fileJSON) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ t: Date.now(), defs: S.defs }));
    } catch (e) { }
  }
  function checkDraft() {
    var dr = null;
    try { dr = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { dr = null; }
    if (!dr || !dr.defs || JSON.stringify(dr.defs) === S.fileJSON) return;
    var d = new Date(dr.t);
    $('draftText').textContent = '找到 ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' 還沒存檔的草稿(和 levels.js 不同)。';
    $('draftBanner').className = 'banner show';
    $('bDraftLoad').onclick = function () {
      S.undo = []; S.redo = [];
      S.defs = dr.defs.map(function (x) { return Fmt.clean(x); }); S.check = []; S.sel = null;
      $('draftBanner').className = 'banner'; changed(); checkAllLater(); toast('已載入草稿(還沒存回檔案)');
    };
    $('bDraftDrop').onclick = function () { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { } $('draftBanner').className = 'banner'; };
  }

  // ---------------------------------------------------------------- 事件
  function setTool(t) { S.tool = t; S.drag = null; refreshTools(); redraw(); }
  function switchLevel(i, keepUndo) {
    if (i < 0 || i >= S.defs.length) return;
    S.lv = i; S.sel = null; S.flash = null; S.flashIdx = -1; S.rep = [false, false, false]; S.sceneDirty = true;
    if (!S.check[i]) runCheckFor(i);
    refreshAll();
  }
  function setSite(i) { S.siteIdx = i; refreshTools(); refreshSites(); redraw(); }
  cv.addEventListener('mousedown', onDown);
  W.addEventListener('mousemove', function (e) { if (e.target === cv || S.drag) onMove(e); });
  W.addEventListener('mouseup', onUp);
  cv.addEventListener('mouseleave', function () { if (!S.drag) { S.hover = null; redraw(); } });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  $('levels').addEventListener('click', function (e) { var b = e.target.closest('[data-lv]'); if (b) switchLevel(+b.getAttribute('data-lv')); });
  $('tools').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tool]'); if (b) { setTool(b.getAttribute('data-tool')); return; }
    b = e.target.closest('[data-mon]'); if (b) { S.monType = b.getAttribute('data-mon'); refreshTools(); return; }
    b = e.target.closest('[data-pk]'); if (b) { S.pickKind = b.getAttribute('data-pk'); refreshTools(); }
  });
  $('tools').addEventListener('change', function (e) {
    if (e.target.id === 'rectMode') S.rectMode = e.target.checked;
    if (e.target.id === 'motherTheme') { S.motherTheme = e.target.value; refreshTools(); }
    if (e.target.id === 'chestDev') S.chestDev = e.target.value;
  });
  $('selBox').addEventListener('click', function (e) { if (e.target.id === 'selDel' && S.sel) { var o = S.sel; edit(function () { deleteObj(cur(), o); }); S.sel = null; refreshAll(); } });
  $('selBox').addEventListener('change', function (e) {
    var d = cur(), o = S.sel, v = e.target.value; if (!o) return;
    edit(function () {
      if (e.target.id === 'selPk') d.picks[o.i][0] = v;
      if (e.target.id === 'selDx') { var n = Math.max(-20, Math.min(20, Math.round(+v || 0))); if (n) d.picks[o.i][3] = n; else d.picks[o.i].length = 3; }
      if (e.target.id === 'selMk') d.mons[o.i][3] = v;
      if (e.target.id === 'selDev') d.chest[2] = v;
      if (e.target.id === 'selMon') {
        var m = d.mons[o.i], body = LC.monBodyCell(m);
        d.mons[o.i] = [v, m[1], monRowFromCell(v, body[1])];
        if (v === 'mother') d.mons[o.i].push(m[3] || S.motherTheme);
      }
    });
    refreshAll();
  });
  $('siteTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) setSite(+b.getAttribute('data-s')); });
  $('siteBox').addEventListener('click', function (e) {
    var d = cur(), st = d.sites[S.siteIdx], id = e.target.id;
    if (id === 'siteAdd') { edit(function () { while (d.sites.length <= S.siteIdx) d.sites.push({ kind: 'rubble', role: 'shortcut', cells: [], sign: null, fog: [] }); }); setSite(S.siteIdx); return; }
    if (!st) return;
    if (id === 'siteClrCells') edit(function () { st.cells = []; });
    if (id === 'siteDel' && W.confirm('刪除工程 ' + (S.siteIdx + 1) + '? 後面的工程編號會往前移。')) edit(function () { d.sites.splice(S.siteIdx, 1); });
    var k = e.target.getAttribute('data-delfog');
    if (k !== null) edit(function () { st.fog.splice(+k, 1); });
    // 只有按到按鈕才重畫面板; 點下拉選單也會觸發 click, 這時重畫會把展開中的選單砍掉
    if (id === 'siteClrCells' || id === 'siteDel' || k !== null) refreshAll();
  });
  $('siteBox').addEventListener('change', function (e) {
    var st = cur().sites[S.siteIdx]; if (!st) return;
    edit(function () {
      if (e.target.id === 'siteKind') {
        st.kind = e.target.value;
        if (st.kind === 'nestgate') { st.cells = []; st.role = 'nest'; if (!st.gate) st.gate = null; if (!st.lair) st.lair = null; }
        else { delete st.gate; delete st.lair; if (st.role === 'nest') st.role = 'treasure'; }
      }
      if (e.target.id === 'siteRole') st.role = e.target.value;
    });
    refreshAll();
  });
  $('repBoxes').addEventListener('change', function (e) { var i = e.target.getAttribute('data-rep'); if (i !== null) { S.rep[+i] = e.target.checked; S.sceneDirty = true; redraw(); } });
  $('fogMode').addEventListener('change', function (e) { S.fogMode = e.target.value; S.sceneDirty = true; redraw(); });
  $('showGrid').addEventListener('change', function (e) { S.grid = e.target.checked; redraw(); });
  $('showReach').addEventListener('change', function (e) { S.showReach = e.target.checked; redraw(); });
  $('problems').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pi]'); if (!b) return;
    var i = +b.getAttribute('data-pi'), p = S.check[S.lv].problems[i];
    if (S.flashIdx === i) { S.flash = null; S.flashIdx = -1; } else { S.flash = p.cells; S.flashIdx = i; }
    refreshProblems(); redraw();
  });
  $('bUndo').onclick = function () { undoRedo(S.undo, S.redo); };
  $('bRedo').onclick = function () { undoRedo(S.redo, S.undo); };
  $('bSave').onclick = function () { save(false); };
  $('bDownload').onclick = function () { if (confirmProblems()) download(textOut()); };
  $('bRepick').onclick = function () { fileHandle = null; idbSet('levels', null).catch(function () { }); save(true); };
  $('bPlay').onclick = play;
  $('bHelp').onclick = function () { $('help').classList.toggle('show'); };
  $('help').addEventListener('click', function (e) { if (e.target.id === 'help') $('help').classList.remove('show'); });
  var KEY_TOOL = { KeyV: 'select', KeyB: 'solid', KeyN: 'lair', KeyE: 'erase', KeyM: 'mon', KeyP: 'pick', KeyK: 'chest', KeyS: 'spike', KeyC: 'crack', KeyQ: 'start', KeyG: 'goal',
    KeyW: 'cells', KeyI: 'sign', KeyF: 'fog', KeyD: 'gate', KeyA: 'lairroom' };
  W.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    var ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) undoRedo(S.redo, S.undo); else undoRedo(S.undo, S.redo); return; }
    if (ctrl && e.code === 'KeyY') { e.preventDefault(); undoRedo(S.redo, S.undo); return; }
    if (ctrl && e.code === 'KeyS') { e.preventDefault(); save(false); return; }
    if (ctrl || e.altKey) return;
    if (e.code === 'Delete' || e.code === 'Backspace') { if (S.sel) { e.preventDefault(); var o = S.sel; edit(function () { deleteObj(cur(), o); }); S.sel = null; refreshAll(); } return; }
    if (e.code === 'Escape') { S.sel = null; S.drag = null; S.flash = null; S.flashIdx = -1; $('help').classList.remove('show'); refreshAll(); return; }
    if (e.code === 'KeyH') { $('help').classList.toggle('show'); return; }
    if (e.code === 'KeyR') { S.rectMode = !S.rectMode; refreshTools(); return; }
    if (e.code === 'BracketLeft') { switchLevel(S.lv - 1); return; }
    if (e.code === 'BracketRight') { switchLevel(S.lv + 1); return; }
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') { setSite(+e.code.slice(5) - 1); return; }
    if (KEY_TOOL[e.code]) { setTool(KEY_TOOL[e.code]); }
  });
  W.addEventListener('beforeunload', function (e) { if (JSON.stringify(S.defs) !== S.savedJSON) { saveDraft(); e.preventDefault(); e.returnValue = ''; } });

  // ---------------------------------------------------------------- 開始
  if (loadErr.length) { $('loadBanner').textContent = '⚠ ' + loadErr.join('; '); $('loadBanner').className = 'banner bad show'; }
  switchLevel(0);
  checkDraft();
  setTimeout(checkAllLater, 50);
  // 給 Node 測試用
  W.__LevelEditor = { S: S, textOut: textOut, render: render, edit: edit, undo: function () { undoRedo(S.undo, S.redo); }, redo: function () { undoRedo(S.redo, S.undo); }, switchLevel: switchLevel, setTool: setTool,
    onDown: onDown, onMove: onMove, onUp: onUp, objects: objects };
})();
