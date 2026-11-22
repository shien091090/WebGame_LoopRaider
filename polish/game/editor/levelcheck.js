/* LoopRaider 關卡編輯器 - 關卡檢查(可走範圍模擬 + 問題清單)
 * 傳統腳本: 瀏覽器裡掛在 window.LevelCheck, Node 裡 module.exports。不碰畫面。
 * 走路 / 跳躍照 game.js 的移動規則逐幀模擬(同樣的碰撞、重力、跳躍初速、小跳), 不用技能, 用最慢的職業速度。
 */
(function (root) {
  'use strict';
  var TS = 40, GW = 32, GH = 18, DT = 1 / 60, H = 720;

  // ---------- 環境常數(由呼叫端傳入 game.js 的值, 沒有就用預設)
  function envOf(e) {
    e = e || {};
    var slow = 230;
    if (e.CLS) { slow = 1e9; Object.keys(e.CLS).forEach(function (k) { slow = Math.min(slow, e.CLS[k].speed); }); }
    return {
      GRAV: e.GRAV || 2400, JUMP_V: e.JUMP_V || 720, PW: e.PW || 28, PH: e.PH || 36, SPD: slow,
      MDEF: e.MDEF || {}, DEV_ORDER: e.DEV_ORDER || ['gear', 'bagWood', 'bagStone', 'bagCrystal', 'coreLamp', 'glove', 'horn', 'heart'],
      SITE_COST: e.SITE_COST || null, THEMES: e.THEMES || null
    };
  }

  // ---------- 物件分類(與 game.js buildLevel 相同的列定義)
  var FLYERS = { bee: 1, hawk: 1, bats: 1 };
  function monBodyCell(m) {
    if (FLYERS[m[0]]) return [m[1], m[2]];
    if (m[0] === 'lizard') return [m[1], m[2] + 1];
    return [m[1], m[2] - 1];
  }
  function gateCells(s) { var c = s.gate[0], r = s.gate[1]; return [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]]; }
  function inRect(c, r, f) { return c >= f[0] && c < f[0] + f[2] && r >= f[1] && r < f[1] + f[3]; }
  // 同 game.js zOf: 物件屬於哪處工程(-1 主路; i = 工程 i 的迷霧; -2-i = 斷橋捷徑蓋住的坑底)
  function zOf(d, c, r) {
    var i, k, sites = d.sites || [];
    for (i = 0; i < sites.length; i++) { var fg = sites[i].fog || []; for (k = 0; k < fg.length; k++) if (inRect(c, r, fg[k])) return i; }
    for (i = 0; i < sites.length; i++) {
      var st = sites[i];
      if (st.kind === 'bridge' && st.role === 'shortcut' && r >= 16 && (st.cells || []).some(function (q) { return q[0] === c; })) return -2 - i;
    }
    return -1;
  }

  // ---------- 格表
  function baseGrid(d) {
    var g = [], r, c;
    for (r = 0; r < GH; r++) {
      var row = (d.tiles && d.tiles[r]) || '', a = [];
      for (c = 0; c < GW; c++) { var ch = row.charAt(c); a.push(ch === '#' ? 1 : (ch === 'L' ? 2 : 0)); }
      g.push(a);
    }
    (d.sites || []).forEach(function (s) { (s.cells || []).forEach(function (q) { if (okCell(q[0], q[1])) g[q[1]][q[0]] = 0; }); });
    return g;
  }
  function okCell(c, r) { return c >= 0 && c < GW && r >= 0 && r < GH; }
  // rep: 每處工程是否已修好; cracksSolid: 裂岩牆還在不在
  function solidFor(d, rep, cracksSolid) {
    var g = baseGrid(d), s = g.map(function (row) { return row.map(function (v) { return v ? 1 : 0; }); });
    (d.sites || []).forEach(function (st, i) {
      var repaired = !!rep[i], solid = (st.kind === 'rubble' || st.kind === 'nestgate') ? !repaired : repaired;
      if (!solid) return;
      var cells = st.kind === 'nestgate' ? (st.gate ? gateCells(st) : []) : (st.cells || []);
      cells.forEach(function (q) { if (okCell(q[0], q[1])) s[q[1]][q[0]] = 1; });
    });
    if (cracksSolid) (d.cracks || []).forEach(function (q) { if (okCell(q[0], q[1])) s[q[1]][q[0]] = 1; });
    return s;
  }

  // ---------- 逐幀移動(照 game.js 的 isSol / boxHit / moveX / moveY)
  function World(sol, env) { this.sol = sol; this.env = env; }
  World.prototype.isSol = function (c, r) {
    if (c < 0 || c >= GW) return true;
    if (r < 0 || r >= GH) return false;
    return this.sol[r][c] === 1;
  };
  World.prototype.boxHit = function (x, y, w, h) {
    var c0 = Math.floor((x - w / 2) / TS), c1 = Math.floor((x + w / 2 - 0.001) / TS);
    var r0 = Math.floor((y - h / 2) / TS), r1 = Math.floor((y + h / 2 - 0.001) / TS);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) if (this.isSol(c, r)) return true;
    return false;
  };
  World.prototype.moveX = function (b, dx) {
    if (!dx) return false;
    var n = Math.ceil(Math.abs(dx) / 8), s = dx / n;
    for (var i = 0; i < n; i++) {
      b.x += s;
      if (this.boxHit(b.x, b.y, b.w, b.h)) {
        if (s > 0) b.x = Math.floor((b.x + b.w / 2) / TS) * TS - b.w / 2 - 0.01;
        else b.x = (Math.floor((b.x - b.w / 2) / TS) + 1) * TS + b.w / 2 + 0.01;
        return true;
      }
    }
    return false;
  };
  World.prototype.moveY = function (b, dy) {
    if (!dy) return false;
    var n = Math.ceil(Math.abs(dy) / 8), s = dy / n;
    for (var i = 0; i < n; i++) {
      b.y += s;
      if (this.boxHit(b.x, b.y, b.w, b.h)) {
        if (s > 0) b.y = Math.floor((b.y + b.h / 2) / TS) * TS - b.h / 2 - 0.01;
        else b.y = (Math.floor((b.y - b.h / 2) / TS) + 1) * TS + b.h / 2 + 0.01;
        return true;
      }
    }
    return false;
  };
  // 一次動作: pol = { jump, rel(放開跳鍵的幀, -1 = 按滿), d0, k(換方向的幀), d1 }
  World.prototype.sim = function (x, y, pol, touched) {
    var e = this.env, p = { x: x, y: y, w: e.PW, h: e.PH, vy: 0 }, c0 = Math.floor(x / TS), r0 = Math.floor(y / TS);
    var f, jumpT = 99, onGround = true, left = false, still = 0;
    if (pol.jump) { p.vy = -e.JUMP_V; jumpT = 0; onGround = false; left = true; }
    for (f = 0; f < 240; f++) {
      var dir = (pol.k >= 0 && f >= pol.k) ? pol.d1 : pol.d0;
      var ox = p.x;
      this.moveX(p, dir * e.SPD * DT);
      jumpT += DT;
      if (pol.jump && f === pol.rel && jumpT < 0.15 && p.vy < -e.JUMP_V / 2) p.vy = -e.JUMP_V / 2;
      p.vy = Math.min(p.vy + e.GRAV * DT, 1500);
      var hd = false;
      if (this.moveY(p, p.vy * DT)) { if (p.vy > 0) hd = true; p.vy = 0; }
      onGround = hd;
      if (p.y - p.h / 2 > H + 20) return { dead: true };
      var cc = Math.floor(p.x / TS), rr = Math.floor(p.y / TS);
      if (touched) touched[cc + ',' + rr] = 1;
      if (!onGround) left = true;
      if (onGround) {
        if (pol.jump || left) { if (f > 0) return { land: [cc, rr] }; }
        else if (cc !== c0 || rr !== r0) return { land: [cc, rr] };
        else if (Math.abs(p.x - ox) < 0.001 && ++still > 3) return { blocked: true };
      }
    }
    return { timeout: true };
  };
  var POLICIES = (function () {
    var a = [{ jump: false, rel: -1, d0: -1, k: -1, d1: 0 }, { jump: false, rel: -1, d0: 1, k: -1, d1: 0 }];
    [-1, 0, 1].forEach(function (d0) {
      a.push({ jump: true, rel: -1, d0: d0, k: -1, d1: 0 });
      a.push({ jump: true, rel: 1, d0: d0, k: -1, d1: 0 });
      [6, 14, 22, 30].forEach(function (k) {
        [-1, 0, 1].forEach(function (d1) { if (d1 !== d0) a.push({ jump: true, rel: -1, d0: d0, k: k, d1: d1 }); });
      });
    });
    return a;
  })();

  // 從起點出發的可走範圍: 站立點(格)之間的連線 + 走過 / 跳過的格
  function explore(sol, env, startNode) {
    var W = new World(sol, env), nodes = {}, queue = [], e = env;
    function key(n) { return n[0] + ',' + n[1]; }
    function expand(n) {
      var out = {}, touched = {}, xs = [n[0] * TS + 20, n[0] * TS + 2, n[0] * TS + 38], y = (n[1] + 1) * TS - e.PH / 2 - 0.01;
      touched[key(n)] = 1;
      xs.forEach(function (x) {
        if (W.boxHit(x, y, e.PW, e.PH)) return;
        if (!W.boxHit(x, y + 1, e.PW, e.PH)) return; // 腳下沒地面
        POLICIES.forEach(function (pol) {
          var r = W.sim(x, y, pol, touched);
          if (r.land) out[key(r.land)] = r.land;
        });
      });
      return { to: Object.keys(out).map(function (k) { return out[k]; }), touched: touched };
    }
    var sk = key(startNode);
    nodes[sk] = expand(startNode); queue.push(startNode);
    while (queue.length) {
      var n = queue.shift(), info = nodes[key(n)];
      info.to.forEach(function (m) { var k = key(m); if (!nodes[k]) { nodes[k] = expand(m); queue.push(m); } });
    }
    var touched = {};
    Object.keys(nodes).forEach(function (k) { Object.keys(nodes[k].touched).forEach(function (t) { touched[t] = 1; }); });
    return { nodes: nodes, touched: touched, start: sk };
  }
  // 從哪些站立點能到得了目標(目標 = 一組格子, 身體中心經過即可)
  function canReach(ex, targetCells) {
    var good = {}, rev = {}, k;
    for (k in ex.nodes) {
      ex.nodes[k].to.forEach(function (m) { var mk = m[0] + ',' + m[1]; (rev[mk] = rev[mk] || []).push(k); });
      if (targetCells.some(function (t) { return ex.nodes[k].touched[t]; })) good[k] = 1;
    }
    var q = Object.keys(good);
    while (q.length) { var x = q.pop(); (rev[x] || []).forEach(function (p) { if (!good[p]) { good[p] = 1; q.push(p); } }); }
    return good;
  }
  function clusters(keys) {
    var set = {}, seen = {}, out = [];
    keys.forEach(function (k) { set[k] = 1; });
    keys.forEach(function (k) {
      if (seen[k]) return;
      var grp = [], q = [k]; seen[k] = 1;
      while (q.length) {
        var x = q.pop(), p = x.split(',').map(Number); grp.push(p);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) { var nk = (p[0] + dd[0]) + ',' + (p[1] + dd[1]); if (set[nk] && !seen[nk]) { seen[nk] = 1; q.push(nk); } });
      }
      out.push(grp);
    });
    return out;
  }

  // ---------- 檢查
  var KIND_ZH = { bridge: '斷橋', stairs: '崩梯', rubble: '堵塞隧道', nestgate: '巢穴門' };
  var MON_ZH = { boar: '野豬', frog: '跳蛙', bee: '射手蜂', thorn: '刺藤花', ram: '岩角羊', hawk: '俯衝鷹', lizard: '落石蜥', shield: '盾兵', beetle: '爆炸甲蟲', bats: '蝙蝠群', bat: '蝙蝠', mother: '巢母' };
  var PICK_ZH = { wood: '木材', stone: '石頭', crystal: '水晶' };
  function pos(c, r) { return '(欄 ' + c + ', 列 ' + r + ')'; }
  function repLabel(rep) {
    var on = []; rep.forEach(function (v, i) { if (v) on.push(i + 1); });
    return on.length ? '修好工程 ' + on.join('、') + ' 時' : '工程都沒修時';
  }

  // opt: { idx, env, deep(預設 true: 跑可走範圍模擬) }
  function validate(d, opt) {
    opt = opt || {};
    var env = envOf(opt.env), idx = opt.idx || 0, out = [], boss = idx === 7;
    function add(sev, msg, cells) { out.push({ sev: sev, msg: msg, cells: cells || [] }); }
    var sites = d.sites || [], g = baseGrid(d), sol0 = solidFor(d, [], true);
    function solidAt(c, r) { return !okCell(c, r) ? (c < 0 || c >= GW) : sol0[r][c] === 1; }
    function inside(c, r) { return okCell(c, r); }

    // 結構
    if (!d.start) add('err', '沒有起點。');
    if (!d.goal) add('err', '沒有終點。');
    if (!boss && sites.length !== 3) add(sites.length > 3 ? 'err' : 'warn', '這關有 ' + sites.length + ' 處工程(第 1~7 關應該剛好 3 處)。');
    var nestIdx = -1;
    sites.forEach(function (s, i) {
      var nm = '工程 ' + (i + 1) + '(' + (KIND_ZH[s.kind] || s.kind) + ')';
      if (s.kind === 'nestgate') {
        nestIdx = i;
        if (!s.gate) add('err', nm + ' 還沒放巢穴門(遊戲會當掉)。');
        if (!s.lair) add('err', nm + ' 還沒畫巢穴室範圍(遊戲會當掉)。');
        if (s.role !== 'nest') add('warn', nm + ' 是巢穴門, 角色應該是「巢穴」。');
        if (s.gate) gateCells(s).forEach(function (q) {
          if (!inside(q[0], q[1])) add('err', nm + ' 的巢穴門超出畫面。', [q]);
          else if (g[q[1]][q[0]]) add('warn', nm + ' 的巢穴門蓋在原本就是實心的格子上 ' + pos(q[0], q[1]) + ', 修好後那裡還是牆。', [q]);
        });
      } else {
        if (!s.cells || !s.cells.length) add('err', nm + ' 沒有結構格。');
        if (s.role === 'nest') add('warn', nm + ' 角色是「巢穴」, 但只有巢穴門能當巢穴。');
      }
      if (!s.sign) add('warn', nm + ' 沒有工程牌。');
      else if (!inside(s.sign[0], s.sign[1] - 1)) add('err', nm + ' 的工程牌超出畫面。', [s.sign]);
      else if (!solidAt(s.sign[0], s.sign[1])) add('warn', nm + ' 的工程牌懸空 ' + pos(s.sign[0], s.sign[1] - 1) + '。', [[s.sign[0], s.sign[1] - 1]]);
      (s.cells || []).forEach(function (q) { if (!inside(q[0], q[1])) add('err', nm + ' 的結構格超出畫面 ' + pos(q[0], q[1]) + '。', [q]); });
      if ((s.role === 'treasure' || s.role === 'nest') && !(s.fog || []).length) add('warn', nm + ' 是' + (s.role === 'nest' ? '巢穴' : '寶區') + ', 但沒有迷霧區域。');
      (s.fog || []).forEach(function (f) {
        if (f[0] < 0 || f[1] < 0 || f[0] + f[2] > GW || f[1] + f[3] > GH) add('err', nm + ' 的迷霧超出畫面。', [[f[0], f[1]]]);
      });
      sites.forEach(function (t, j) {
        if (j <= i) return;
        (s.fog || []).forEach(function (a) { (t.fog || []).forEach(function (b) {
          if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) add('warn', '工程 ' + (i + 1) + ' 和工程 ' + (j + 1) + ' 的迷霧重疊(每處工程開出的區域應該分開)。', [[a[0], a[1]], [b[0], b[1]]]);
        }); });
      });
    });

    // 物件
    // 物件所屬區域開放時的實心格(迷霧區裡的東西 = 那處工程修好後)
    var solZ = {};
    function solidIn(c, r, z) {
      if (c < 0 || c >= GW) return true;
      if (r < 0 || r >= GH) return false;
      if (z < 0) return sol0[r][c] === 1;
      if (!solZ[z]) solZ[z] = solidFor(d, sites.map(function (s, j) { return j === z; }), true);
      return solZ[z][r][c] === 1;
    }
    function chkBody(name, c, r, needGround) {
      if (!inside(c, r)) { add('err', name + ' 超出畫面 ' + pos(c, r) + '。', [[c, r]]); return; }
      var z = zOf(d, c, r);
      if (solidIn(c, r, z)) add('err', name + ' 卡在實心格裡 ' + pos(c, r) + '。', [[c, r]]);
      else if (needGround && !solidIn(c, r + 1, z)) add('warn', name + ' 腳下沒有地面 ' + pos(c, r) + '。', [[c, r]]);
    }
    if (d.start) chkBody('起點', d.start[0], d.start[1] - 1, true);
    if (d.goal && !boss) { chkBody('終點', d.goal[0], d.goal[1] - 1, true); if (inside(d.goal[0], d.goal[1] - 2) && solidAt(d.goal[0], d.goal[1] - 2)) add('warn', '終點旗上面一格是實心(旗子有 2 格高)。', [[d.goal[0], d.goal[1] - 2]]); }
    (d.picks || []).forEach(function (p) { chkBody((PICK_ZH[p[0]] || p[0]), p[1], p[2], false); });
    var mons = d.mons || [];
    mons.forEach(function (m) {
      var b = monBodyCell(m), nm = MON_ZH[m[0]] || m[0];
      if (!env.MDEF[m[0]] && m[0] !== 'bats' && Object.keys(env.MDEF).length) add('err', '不認得的怪物種類「' + m[0] + '」' + pos(b[0], b[1]) + '。', [b]);
      if (m[0] === 'lizard') {
        chkBody(nm, b[0], b[1], false);
        if (inside(b[0], b[1]) && !solidAt(m[1], m[2])) add('warn', nm + ' 頭上沒有天花板可以倒掛 ' + pos(b[0], b[1]) + '。', [b]);
      } else chkBody(nm, b[0], b[1], !FLYERS[m[0]]);
      if (m[0] === 'mother') {
        if (nestIdx < 0) add('err', '有巢母但這關沒有巢穴門工程(遊戲會當掉)。', [b]);
        else if (sites[nestIdx].lair && !inRect(b[0], b[1], sites[nestIdx].lair)) add('warn', '巢母不在巢穴室範圍裡 ' + pos(b[0], b[1]) + '。', [b]);
        if (['forest', 'cliff', 'mine'].indexOf(m[3]) < 0) add('warn', '巢母沒有指定主題(翠林 / 高崖 / 礦坑)。', [b]);
      }
    });
    if (d.chest) {
      chkBody('寶箱', d.chest[0], d.chest[1] - 1, true);
      if (env.DEV_ORDER.indexOf(d.chest[2]) < 0) add('err', '寶箱裡的裝置「' + d.chest[2] + '」不存在。', [[d.chest[0], d.chest[1] - 1]]);
    }
    (d.spikes || []).forEach(function (q) { chkBody('尖刺', q[0], q[1], true); });
    (d.cracks || []).forEach(function (q) {
      if (!inside(q[0], q[1])) add('err', '裂岩牆超出畫面。', [q]);
      else if (g[q[1]][q[0]]) add('warn', '裂岩牆放在本來就是實心的格子上 ' + pos(q[0], q[1]) + ', 打破了也還是牆。', [q]);
    });

    // 可走範圍模擬
    var res = { problems: out, reach: null };
    if (opt.deep === false || !d.start || out.some(function (x) { return x.sev === 'err'; })) return res;
    var startNode = [d.start[0], d.start[1] - 1];
    var goalCells = d.goal ? [d.goal[0] + ',' + (d.goal[1] - 1), d.goal[0] + ',' + (d.goal[1] - 2)] : [];
    var n = boss ? 0 : sites.length, combos = [], mask, i;
    for (mask = 0; mask < (1 << n); mask++) { var rep = []; for (i = 0; i < n; i++) rep.push(!!(mask & (1 << i))); combos.push(rep); }
    var cache = {};
    function run(rep, cracksSolid) {
      var k = rep.map(Number).join('') + (cracksSolid ? 'c' : 'o');
      if (!cache[k]) cache[k] = explore(solidFor(d, rep, cracksSolid), env, startNode);
      return cache[k];
    }
    var none = combos[0], seenTrap = {};
    // 1. 終點(每種修復組合都要走得到; 裂岩牆不打)
    if (d.goal && !boss) {
      var bad = [];
      combos.forEach(function (rep) { var ex = run(rep, true); if (!goalCells.some(function (t) { return ex.touched[t]; })) bad.push(repLabel(rep)); });
      if (bad.length) add('err', '終點走不到(不用技能、不打裂岩牆): ' + bad.join('; ') + '。', [[d.goal[0], d.goal[1] - 1]]);
    }
    // 2. 掉進去爬不出來的地方(各種修復組合, 裂岩牆在 / 打掉都算)
    combos.forEach(function (rep) {
      [true, false].forEach(function (cs) {
        if (!cs && !(d.cracks || []).length) return;
        var ex = run(rep, cs), target = (d.goal && !boss) ? goalCells : [ex.start];
        if (d.goal && !boss && !goalCells.some(function (t) { return ex.touched[t]; })) target = [ex.start];
        var good = canReach(ex, target), trap = Object.keys(ex.nodes).filter(function (k) { return !good[k]; });
        clusters(trap).forEach(function (grp) {
          var sig = grp.map(function (p) { return p.join(','); }).sort().join(';');
          if (seenTrap[sig]) return; seenTrap[sig] = 1;
          var p0 = grp[0];
          add('err', '掉進 ' + pos(p0[0], p0[1]) + ' 附近就爬不出來' + (target.length === 2 ? '(回不到終點)' : '(回不到起點)') + ': ' + repLabel(rep) + (cs ? '' : '、裂岩牆打掉後') + '。', grp);
        });
        // 單向落差: 終點還到得了, 但回不到起點那一側(規格: 掉得進去的地方都要爬得回來)
        if (!cs || target.length !== 2) return;
        var back = canReach(ex, [ex.start]), oneway = Object.keys(ex.nodes).filter(function (k) { return good[k] && !back[k]; });
        clusters(oneway).forEach(function (grp) {
          var sig = 'o' + grp.map(function (p) { return p.join(','); }).sort().join(';');
          if (seenTrap[sig]) return; seenTrap[sig] = 1;
          add('warn', '從 ' + pos(grp[0][0], grp[0][1]) + ' 附近回不到起點那一側(單向落差, 只能往終點走): ' + repLabel(rep) + '。', grp);
        });
      });
    });
    // 3. 迷霧區修好前進得去 / 修好後進不去
    sites.forEach(function (s, si) {
      if (boss) return;
      (s.fog || []).forEach(function (f) {
        [true, false].forEach(function (cs) {
          if (!cs && !(d.cracks || []).length) return;
          var ex = run(none, cs), hit = [];
          for (var r = f[1]; r < f[1] + f[3]; r++) for (var c = f[0]; c < f[0] + f[2]; c++) if (ex.touched[c + ',' + r]) hit.push([c, r]);
          if (hit.length) add('err', '工程 ' + (si + 1) + ' 的迷霧區還沒修就進得去' + (cs ? '' : '(打掉裂岩牆後)') + ' ' + pos(hit[0][0], hit[0][1]) + '; 迷霧邊上要有實體擋住。', hit);
        });
        var rep1 = none.map(function (v, j) { return j === si; }), ex1 = run(rep1, true), any = false;
        for (var r2 = f[1]; r2 < f[1] + f[3] && !any; r2++) for (var c2 = f[0]; c2 < f[0] + f[2]; c2++) if (ex1.touched[c2 + ',' + r2]) { any = true; break; }
        if (!any) add('warn', '只修好工程 ' + (si + 1) + ' 時, 它的迷霧區 ' + pos(f[0], f[1]) + ' 還是走不進去。', [[f[0], f[1]]]);
      });
      // 修好後變實心的格子不能壓在原本能站的地方(規則 25); 斷橋捷徑蓋住坑底是遊戲允許的設計(坑底物件只在未修時存在)
      if ((s.kind === 'bridge' && s.role !== 'shortcut') || s.kind === 'stairs') {
        var ex0 = run(none, true), hitN = (s.cells || []).filter(function (q) { return ex0.nodes[q[0] + ',' + q[1]] && okCell(q[0], q[1] + 1) && sol0[q[1] + 1][q[0]] === 1; });
        if (hitN.length) add('warn', '工程 ' + (si + 1) + ' 修好後的實心格壓在原本能站的地方 ' + pos(hitN[0][0], hitN[0][1]) + '(修好反而擋路)。', hitN);
      }
    });
    // 4. 素材 / 寶箱走得到嗎(在它所屬區域開放的狀態下)
    function stateFor(z) { return z >= 0 ? none.map(function (v, j) { return j === z; }) : none; }
    (d.picks || []).forEach(function (p) {
      var z = zOf(d, p[1], p[2]), ex = run(stateFor(z), false);
      if (!ex.touched[p[1] + ',' + p[2]]) add('warn', (PICK_ZH[p[0]] || p[0]) + ' 拿不到 ' + pos(p[1], p[2]) + (z >= 0 ? '(修好工程 ' + (z + 1) + ' 後)' : '') + '。', [[p[1], p[2]]]);
    });
    if (d.chest) {
      var zc = zOf(d, d.chest[0], d.chest[1] - 1), exc = run(stateFor(zc), false);
      if (!exc.touched[d.chest[0] + ',' + (d.chest[1] - 1)]) add('warn', '寶箱拿不到 ' + pos(d.chest[0], d.chest[1] - 1) + (zc >= 0 ? '(修好工程 ' + (zc + 1) + ' 後)' : '') + '。', [[d.chest[0], d.chest[1] - 1]]);
    }
    res.reach = run(none, true);
    res.reachAll = run(combos[combos.length - 1], false);
    return res;
  }

  var api = { validate: validate, explore: explore, solidFor: solidFor, baseGrid: baseGrid, zOf: zOf, monBodyCell: monBodyCell, envOf: envOf,
    KIND_ZH: KIND_ZH, MON_ZH: MON_ZH, PICK_ZH: PICK_ZH, POLICIES: POLICIES,
    _simOne: function (sol, env, x, y, pol) { var r = new World(sol, env).sim(x, y, pol, null); return r.land ? r.land.join(',') : (r.dead ? 'dead' : (r.blocked ? 'blocked' : 'timeout')); } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LevelCheck = api;
})(typeof window !== 'undefined' ? window : this);
