/* respawn 方案 C「碎片倒帶聚合」: 死亡動畫碎成的職業形狀碎片(劍士方塊, 同 death-anim B 的配色)從畫面上方
 * 盤旋著飛回來, 在起點上空 60px 聚成人形 → 往內收的白環一閃、角色發白成形 → 短短掉落到起點、腳下揚一小撮塵, 暗幕才掀開。
 * 節奏: 先聚(慢)後落(快), 像把死亡倒帶。
 * 取景: 第一關起點附近(世界 x 0~640、y 150~600), 角色站點 (100, 500)、腳底 520。角色用 Art.drawPlayer(hero 方案 A)。
 */
window.VISUAL_OPTION = (function () {
  var VW = 640, VH = 450, OY = 150;
  var PX = 100, PY = 500, FEET = 520;
  var GX = PX, GY = PY - 60;               // 聚合點(起點上空 60)
  var CLS = 'sword';
  // 同 art.js 死亡碎片的劍士配色: 藍身、藍身、紅披風、金、劍銀、褲
  var SHARD = ['#3d8bfd', '#3d8bfd', '#d8434e', '#f2c94c', '#e8eef6', '#2b3245'];
  var DUR = 2.6, TAU = Math.PI * 2, N = 14;
  var FORM = 1.05;                         // 成形瞬間
  var DROP0 = 1.2, G = 2600, LAND = DROP0 + Math.sqrt(2 * (PY - GY) / G); // ≈ 1.41

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eOut(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eInOut(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  function scene(ctx, t) {
    Art.drawBackground(ctx, { theme: 'forest', t: t });
    for (var c = 0; c <= 13; c++) for (var r = 13; r <= 14; r++)
      Art.drawGround(ctx, { x: c * 40 + 20, y: r * 40 + 20, theme: 'forest', open: { n: r === 13, e: c === 13, s: false, w: false } });
    Art.drawPickup(ctx, { x: 380, y: 420, kind: 'wood', t: t });
  }
  function curtain(ctx, dk) {
    if (dk <= 0.001) return;
    var g = ctx.createRadialGradient(PX, PY, 30, PX, PY, 200);
    g.addColorStop(0, 'rgba(10,6,20,' + (dk * 0.72).toFixed(3) + ')'); g.addColorStop(1, 'rgba(10,6,20,' + dk.toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, OY, VW, VH);
  }
  // 第 i 片碎片在時間 t 的位置與旋轉: 從畫面上緣散開處出發, 沿縮小的螺旋繞進聚合點, 最後停在人形格位
  function shardAt(i, t) {
    var c = i % 4, r = Math.floor(i / 4);
    var tx = GX - 10.5 + c * 7, ty = GY - 13.5 + r * 9;             // 人形格位(同死亡碎片的拆法)
    var sx = 30 + hash(i, 5) * 360, sy = OY - 20 + hash(i, 6) * 60;   // 起點: 畫面上緣附近, 散在右上方
    var t0 = 0.12 + hash(i, 7) * 0.25, t1 = 0.95;                     // 各自錯開出發, 0.95 全部到位
    var p = eInOut(seg(t, t0, t1));
    var bx = sx + (tx - sx) * p, by = sy + (ty - sy) * p;
    var sw = (1 - p) * (34 + hash(i, 8) * 30), ang = hash(i, 9) * TAU + p * 7;   // 螺旋偏移, 越近越小
    return { x: bx + Math.cos(ang) * sw, y: by + Math.sin(ang) * sw * 0.6, rot: (1 - p) * (hash(i, 1) - 0.5) * 14, p: p, started: t >= t0 };
  }

  return {
    element: 'respawn', id: 'C', kind: 'anim',
    size: [VW, VH], duration: DUR, loop: true,
    draw: function (ctx, t) {
      t = ((t % DUR) + DUR) % DUR;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
      ctx.translate(0, -OY);
      scene(ctx, t);
      // 時間軸: 0~0.95 碎片從上方盤旋聚回(暗幕維持) / 0.95~1.05 收緊 + 聚合點發光 / 1.05 內收白環閃、角色發白成形 /
      //         1.2 往下掉 60px / LAND(≈1.41)腳下小塵 + 落點短亮線 / 1.15~1.6 暗幕掀開 / 之後待機
      curtain(ctx, 0.7 * (1 - eOut(seg(t, 1.15, 1.6))));

      // 聚合點微光(碎片越聚越亮)
      var gl = seg(t, 0.5, FORM) * (1 - seg(t, FORM, FORM + 0.2));
      if (gl > 0) {
        ctx.save();
        var g = ctx.createRadialGradient(GX, GY, 0, GX, GY, 34);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.55 * gl).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(GX, GY, 34, 0, TAU); ctx.fill();
        ctx.restore();
      }

      // 碎片(成形前)
      if (t < FORM + 0.05) {
        var fadeOut = 1 - seg(t, FORM - 0.02, FORM + 0.05);
        for (var i = 0; i < N; i++) {
          var s = shardAt(i, t);
          if (!s.started) continue;
          var sz = 3.2 + hash(i, 1) * 2.4;
          // 拖尾: 往回取 3 個舊位置畫淡點
          ctx.save();
          for (var k = 3; k >= 1; k--) {
            var o = shardAt(i, t - k * 0.035);
            ctx.globalAlpha = 0.18 * (4 - k) / 3 * fadeOut * (1 - s.p * 0.6);
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(o.x, o.y, sz * 0.5, 0, TAU); ctx.fill();
          }
          ctx.globalAlpha = fadeOut * Math.min(1, seg(t, 0.12 + hash(i, 7) * 0.25, 0.22 + hash(i, 7) * 0.25) + 0.2);
          ctx.translate(s.x, s.y); ctx.rotate(s.rot);
          ctx.beginPath(); ctx.rect(-sz * 0.6, -sz * 0.6, sz * 1.2, sz * 1.2);
          ctx.fillStyle = SHARD[i % SHARD.length]; ctx.fill(); ctx.lineWidth = 0.9; ctx.strokeStyle = '#ffffff'; ctx.stroke();
          ctx.restore();
        }
      }

      // 成形: 往內收的白環(死亡碎裂閃光的倒放)
      var ip = seg(t, FORM - 0.12, FORM + 0.04);
      if (ip > 0 && ip < 1) {
        ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * ip;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 + 2.5 * ip;
        ctx.beginPath(); ctx.arc(GX, GY, 44 - 30 * eOut(ip), 0, TAU); ctx.stroke();
        ctx.restore();
      }

      // 角色: 成形後先發白, 0.25 秒退回原色; 1.2 起往下掉
      if (t >= FORM) {
        var y = GY, pose = 'idle';
        if (t >= DROP0 && t < LAND) { var u = t - DROP0; y = GY + 0.5 * G * u * u; pose = 'fall'; }
        else if (t >= LAND) y = PY;
        var wh = 1 - seg(t, FORM, FORM + 0.28);
        ctx.save();
        if (wh > 0) ctx.filter = 'brightness(' + (1 + 2.2 * wh).toFixed(2) + ')';
        Art.drawPlayer(ctx, { x: PX, y: y, cls: CLS, facing: 1, pose: pose, poseT: t });
        ctx.filter = 'none';
        ctx.restore();
        if (t < FORM + 0.12) { // 成形閃光
          ctx.save(); ctx.globalAlpha = 0.9 * (1 - (t - FORM) / 0.12);
          var fg = ctx.createRadialGradient(GX, GY, 0, GX, GY, 24);
          fg.addColorStop(0, 'rgba(255,255,255,1)'); fg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(GX, GY, 24, 0, TAU); ctx.fill();
          ctx.restore();
        }
        // 成形後在空中停住的 0.15 秒: 身上 4 顆小星往外散(碎片「黏好」的餘光)
        var sp = seg(t, FORM, FORM + 0.3);
        if (sp > 0 && sp < 1) {
          ctx.save(); ctx.globalAlpha = 1 - sp; ctx.fillStyle = '#ffffff';
          for (var j = 0; j < 4; j++) {
            var a = j * TAU / 4 + 0.6, rr = 16 + 14 * eOut(sp), cx = GX + Math.cos(a) * rr, cy = GY + Math.sin(a) * rr * 1.2;
            ctx.beginPath(); ctx.moveTo(cx, cy - 3); ctx.lineTo(cx + 0.9, cy - 0.9); ctx.lineTo(cx + 3, cy); ctx.lineTo(cx + 0.9, cy + 0.9);
            ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 0.9, cy + 0.9); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx - 0.9, cy - 0.9); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }
      }

      // 落地: 腳下兩撮小塵 + 地面一條短亮線(輕落, 份量比 B 小)
      var dp = seg(t, LAND, LAND + 0.35);
      if (dp > 0 && dp < 1) {
        ctx.save(); ctx.globalAlpha = 1 - dp;
        for (var m = -1; m <= 1; m += 2) {
          var dx = m * (12 + 18 * eOut(dp));
          ctx.fillStyle = '#e9ddc6'; ctx.beginPath(); ctx.arc(PX + dx, FEET - 3 - 4 * Math.sin(Math.PI * dp), 3.5 + 2 * dp, 0, TAU); ctx.fill();
        }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        var hw = 10 + 22 * eOut(dp);
        ctx.beginPath(); ctx.moveTo(PX - hw, FEET - 1); ctx.lineTo(PX + hw, FEET - 1); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  };
})();
