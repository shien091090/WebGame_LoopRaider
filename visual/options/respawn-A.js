/* respawn 方案 A「光柱降下」: 暗幕中一道白光柱從畫面上緣打到起點, 角色在光柱裡減速飄落,
 * 落地瞬間地面擴出兩圈職業色光圈、光柱往上收、暗幕掀開。節奏: 慢、莊重。
 * 取景: 第一關起點附近(世界 x 0~640、y 150~600), 角色站點 (100, 500)、腳底 520。角色用 Art.drawPlayer(hero 方案 A)。
 */
window.VISUAL_OPTION = (function () {
  var VW = 640, VH = 450, OY = 150;          // 取景框與世界 y 偏移
  var PX = 100, PY = 500, FEET = 520;        // 起點(判定框中心)與腳底
  var CLS = 'sword', COL = '#3d8bfd';        // 教學關只有劍士; 光圈 / 光柱邊緣用職業色(不用金: 金只給介面)
  var DUR = 2.6, TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eIn(p) { p = clamp(p, 0, 1); return p * p * p; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function rgba(hex, a) { var c = hex.replace('#', ''); return 'rgba(' + parseInt(c.substr(0, 2), 16) + ',' + parseInt(c.substr(2, 2), 16) + ',' + parseInt(c.substr(4, 2), 16) + ',' + a.toFixed(3) + ')'; }
  function star4(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.28, y - r * 0.28); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.28, y + r * 0.28); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.28, y + r * 0.28); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.28, y - r * 0.28); ctx.closePath(); }

  // 共用場景: 翠林背景 + 起點高台(0~13 欄, 第 13 列頂)+ 高台上方的木材
  function scene(ctx, t) {
    Art.drawBackground(ctx, { theme: 'forest', t: t });
    for (var c = 0; c <= 13; c++) for (var r = 13; r <= 14; r++)
      Art.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, theme: 'forest', open: { n: r === 13, e: c === 13, s: false, w: false } });
    Art.drawPickup(ctx, { x: 380, y: 420, kind: 'wood', t: t });
  }
  // 死亡動畫收尾的暗幕(同 drawDeathFx t=dur 的畫法), dk 0~0.7
  function curtain(ctx, dk) {
    if (dk <= 0.001) return;
    var g = ctx.createRadialGradient(PX, PY, 30, PX, PY, 200);
    g.addColorStop(0, 'rgba(10,6,20,' + (dk * 0.72).toFixed(3) + ')'); g.addColorStop(1, 'rgba(10,6,20,' + dk.toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, OY, VW, VH);
  }

  return {
    element: 'respawn', id: 'A', kind: 'anim',
    size: [VW, VH], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((t % DUR) + DUR) % DUR;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
      ctx.translate(0, -OY);
      scene(ctx, t);

      // 時間軸: 0~0.2 暗幕停留 / 0.2~0.5 光柱往下打 / 0.5~1.1 角色在光柱內減速飄落 / 1.1 落地: 光圈 + 光柱上收 + 暗幕掀開 / 1.4~ 待機
      var LAND = 1.1;
      curtain(ctx, 0.7 * (1 - eOut(seg(t, 1.0, 1.45))));

      var top = OY - 10;
      var down = eOut(seg(t, 0.2, 0.5));                    // 光柱前緣往下
      var retract = eIn(seg(t, LAND, LAND + 0.32));        // 落地後光柱底部往上收
      var wMul = 1 - seg(t, LAND + 0.1, LAND + 0.4);       // 同時變細
      if (down > 0 && wMul > 0) {
        var by = top + (FEET - top) * down, ty = top, bot = by - (FEET - top) * retract;
        if (bot > ty + 1) {
          var hw = 30 * wMul, pulse = 0.9 + 0.1 * Math.sin(t * 22);
          ctx.save();
          // 外暈
          var g0 = ctx.createLinearGradient(PX - hw * 2.2, 0, PX + hw * 2.2, 0);
          g0.addColorStop(0, 'rgba(255,255,255,0)'); g0.addColorStop(0.5, 'rgba(230,240,255,' + (0.22 * pulse).toFixed(3) + ')'); g0.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g0; ctx.fillRect(PX - hw * 2.2, ty, hw * 4.4, bot - ty);
          // 光柱本體: 職業色邊 → 白芯
          var g1 = ctx.createLinearGradient(PX - hw, 0, PX + hw, 0);
          g1.addColorStop(0, rgba(COL, 0)); g1.addColorStop(0.22, rgba(COL, 0.45 * pulse)); g1.addColorStop(0.5, 'rgba(255,255,255,' + (0.85 * pulse).toFixed(3) + ')');
          g1.addColorStop(0.78, rgba(COL, 0.45 * pulse)); g1.addColorStop(1, rgba(COL, 0));
          ctx.fillStyle = g1; ctx.fillRect(PX - hw, ty, hw * 2, bot - ty);
          // 光柱前緣: 往下打時一顆亮頭
          if (down < 1) {
            var hg = ctx.createRadialGradient(PX, by, 0, PX, by, hw * 1.4);
            hg.addColorStop(0, 'rgba(255,255,255,0.95)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(PX, by, hw * 1.4, 0, TAU); ctx.fill();
          }
          // 光柱裡往上飄的光點
          ctx.fillStyle = '#ffffff';
          for (var i = 0; i < 10; i++) {
            var q = (hash(i, 1) + t * (0.5 + hash(i, 2) * 0.6)) % 1;
            var my = bot - q * (bot - ty), mx = PX + (hash(i, 3) - 0.5) * hw * 1.3;
            ctx.globalAlpha = 0.8 * Math.sin(Math.PI * q) * wMul;
            star4(ctx, mx, my, 1.6 + hash(i, 4) * 1.4); ctx.fill();
          }
          ctx.restore();
        }
        // 光柱打到地面: 地面亮斑(角色落地前就先標出落點)
        if (down >= 1 && t < LAND + 0.7) {
          var sa = (t < LAND ? 0.55 + 0.15 * Math.sin(t * 14) : 0.7 * (1 - seg(t, LAND, LAND + 0.7)));
          ctx.save();
          var sg = ctx.createRadialGradient(PX, FEET, 0, PX, FEET, 46);
          sg.addColorStop(0, 'rgba(255,255,255,' + sa.toFixed(3) + ')'); sg.addColorStop(0.5, rgba(COL, sa * 0.5)); sg.addColorStop(1, rgba(COL, 0));
          ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(PX, FEET, 46, 11, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }

      // 角色: 0.5 起從畫面上緣上方減速飄落, 先半透明發白, 越靠近地面越實
      if (t >= 0.5) {
        var fp = seg(t, 0.5, LAND), y = t < LAND ? (OY - 30) + (PY - (OY - 30)) * (1 - Math.pow(1 - fp, 2.2)) : PY;
        var sway = t < LAND ? Math.sin(fp * 9) * 3 * (1 - fp) : 0;    // 羽毛般左右輕晃
        ctx.save();
        if (t < LAND) {
          ctx.globalAlpha = 0.45 + 0.55 * fp;
          ctx.filter = 'brightness(' + (1 + 1.4 * (1 - fp)).toFixed(2) + ')';
        }
        Art.drawPlayer(ctx, { x: PX + sway, y: y, cls: CLS, facing: 1, pose: t < LAND ? 'fall' : 'idle', poseT: t });
        ctx.filter = 'none';
        ctx.restore();
        // 落地閃白(角色輪廓範圍)
        if (t >= LAND && t < LAND + 0.18) {
          ctx.save(); ctx.globalAlpha = 0.8 * (1 - (t - LAND) / 0.18);
          var fg = ctx.createRadialGradient(PX, PY, 0, PX, PY, 26);
          fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(PX, PY, 26, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }

      // 落地光圈: 兩圈貼地橢圓往外擴 + 6 顆星沿光圈噴開
      for (var k = 0; k < 2; k++) {
        var r0 = LAND + k * 0.14, rp = seg(t, r0, r0 + 0.55);
        if (rp <= 0 || rp >= 1) continue;
        var e = eOut(rp);
        ctx.save(); ctx.globalAlpha = 1 - rp;
        ctx.lineWidth = (k === 0 ? 4 : 2.5) * (1 - rp) + 1;
        ctx.strokeStyle = k === 0 ? '#ffffff' : COL;
        ctx.beginPath(); ctx.ellipse(PX, FEET, 16 + 84 * e, 4 + 18 * e, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      var sp = seg(t, LAND, LAND + 0.5);
      if (sp > 0 && sp < 1) {
        ctx.save(); ctx.globalAlpha = 1 - sp; ctx.fillStyle = '#ffffff';
        for (var j = 0; j < 6; j++) {
          var a = Math.PI + j * Math.PI / 5, rr = 20 + 54 * eOut(sp);
          star4(ctx, PX + Math.cos(a) * rr, FEET + Math.sin(a) * rr * 0.5 - 18 * sp, 3); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  };
})();
