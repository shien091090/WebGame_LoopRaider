# 音效說明(RD 只需讀這份)

## 聲音風格

**溫暖的木作工坊 + 奇幻小冒險**: 介面是木牌 / 石鍵的實體敲擊聲, 戰鬥是寫實的揮砍、撞擊、碎石, 獎勵與成敗用同一組民俗撥弦 / 鋼鼓樂句(上揚 = 好事、下降 = 可惜); 背景音樂全是 Kevin MacLeod 的民俗 / 奇幻管弦曲。

## 接法

- `index.html` 在 `game.js` **之前**加 `<script src="audio/sound.js"></script>`
- 第一次按鍵時呼叫 `Sound.init()`(重複呼叫無害)。init 之前的 `play` 一律靜默丟棄; init 之前呼叫的 `playMusic` 會記住, init 時才開始播(所以開始畫面可以照常先呼叫 `Sound.playMusic('title')`)
- 未知的事件名 / 曲名一律靜默忽略, 不會報錯
- `M` 鍵: `Sound.setMuted(!Sound.isMuted())`; 聲音開關圖示的 `on` = `!Sound.isMuted()`
- 音效已內嵌在 `sound.js`, 頁面載入時就先解碼好; 背景音樂讀 `audio/assets/music_*.mp3`(路徑相對於 index.html)

## opts 欄位(全部可省略)

| 欄位 | 適用事件 | 意思 |
|---|---|---|
| `volume` | 全部 | 0~1 音量倍率, 預設 1。一般不用傳 |
| `n` | `chain` | 連鎖數(冒出「N 連鎖」的 N)。2 連鎖原音高, 每多 1 升 2 個半音, 10 以上不再升 |
| `on` | `pause` | `true` = 進入暫停、`false` = 離開暫停。**建議傳**; 省略時視為切換(開 → 關 → 開) |

## 音效事件表

響度 = 素材最響 50 毫秒的 RMS(dBFS), 數字越大越響; 執行時不再另外調。全部不循環。

| 事件名 | 規格音效清單 | 何時呼叫 | opts | 素材檔 | 響度 |
|---|---|---|---|---|---|
| `ui_move` | ui_move | 大地圖 / 面板游標移動、換列 | — | sfx_ui_move.mp3(木頭輕敲) | −24 |
| `ui_confirm` | ui_confirm | 打開面板、確定 | — | sfx_ui_confirm.mp3(木頭重敲 + 按鍵喀) | −19 |
| `ui_back` | ui_back | 關閉面板 / 返回 | — | sfx_ui_back.mp3 | −23 |
| `ui_deny` | ui_deny | 錢不夠、封鎖、冷卻中、售完時按 `Z` / `X` | — | sfx_ui_deny.mp3(低悶短音) | −20 |
| `title_start` | title_start | 開始畫面按鍵進遊戲(同一鍵先 `init()` 再播) | — | sfx_title_start.mp3(木門推開 + 上揚撥弦) | −14 |
| `unlock_level` | unlock_level | 解鎖關卡 | — | sfx_unlock_level.mp3(上揚鋼鼓) | −15 |
| `repair` | repair | 修好工程(施工開始) | — | sfx_repair.mp3(石塊落定 + 兩下釘木板) | −15 |
| `fog_clear` | fog_clear | 迷霧推開(施工後 0.6 秒) | — | sfx_fog_clear.mp3(慢風切 + 亮音) | −16 |
| `buy_item` | buy_item | 商店買下 | — | sfx_buy_item.mp3(錢幣 + 亮音) | −18 |
| `equip` | equip | 在裝置倉庫安裝 / 拆下裝置 | — | sfx_equip.mp3(金屬卡榫) | −18 |
| `upgrade` | upgrade | 強化(移速 / 血量 / 冷卻 / 攻擊) | — | sfx_upgrade.mp3(鐵鎚敲鐵 + 短上揚) | −14 |
| `unlock_class` | unlock_class | **本輪新增** 解鎖職業, 解鎖特效開始那一刻(只播這個, 不疊 `upgrade`、`ui_confirm`) | — | sfx_unlock_class.mp3(1.33 秒: 反轉力場聲 0.42 秒漸強當光柱降下 → 鐘聲落地 + 同旋律薩克斯 / 撥弦 / 鋼鼓三分軌上揚) | −11 |
| `coin_land` | coin_land | 大地圖飛行素材投進資訊列 | — | sfx_coin_land.mp3(錢幣叮) | −24 |
| `jump` | jump | 起跳 | — | sfx_jump.mp3 | −22 |
| `land` | land | 從高處落地(下落速度 > 600px/秒) | — | sfx_land.mp3 | −18 |
| `slash` | slash | 劍士揮砍 | — | sfx_slash.mp3 | −17 |
| `dash` | dash | 衝刺斬 | — | sfx_dash.mp3 | −15 |
| `arrow` | arrow | 獵人自動射箭 | — | sfx_arrow.mp3(弓弦) | −24 |
| `stealth_on` | stealth_on | 潛行開始 | — | sfx_stealth_on.mp3(往下收) | −17 |
| `stealth_off` | stealth_off | 潛行解除 | — | sfx_stealth_off.mp3(往上開, 跟 on 成對) | −16 |
| `bomb_throw` | bomb_throw | 投彈 | — | sfx_bomb_throw.mp3 | −20 |
| `explosion` | explosion | 炸彈 / 甲蟲爆炸 | — | sfx_explosion.mp3 | −11 |
| `shockwave` | shockwave | 震波 | — | sfx_shockwave.mp3 | −13 |
| `hit` | hit | 怪物損失 HP | — | sfx_hit.mp3 | −17 |
| `hit_block` | hit_block | 打在盾上 / 打在不在破綻的巨像上 | — | sfx_hit_block.mp3(金屬板叮) | −18 |
| `shield_break` | shield_break | 盾碎 | — | sfx_shield_break.mp3 | −13.5 |
| `drop_collect` | drop_collect | 噴出的素材粒被吸回玩家 | — | sfx_drop_collect.mp3 | −24 |
| `pickup` | pickup | 撿到地上素材 | — | sfx_pickup.mp3 | −18 |
| `chest_open` | chest_open | 開寶箱 | — | sfx_chest_open.mp3 | −15 |
| `item_get` | item_get | 「獲得 <裝置名>」提示出現 | — | sfx_item_get.mp3(薩克斯小號角) | −14 |
| `monster_down` | monster_down | 一般怪被擊倒 | — | sfx_monster_down.mp3 | −14 |
| `chain` | chain | 冒出「N 連鎖」 | `n` | sfx_chain.mp3(雙撥弦, 隨 N 升高) | −18.6 |
| `brood_down` | brood_down | 巢母被擊倒 | — | sfx_brood_down.mp3 | −10 |
| `windup` | windup | 野豬 / 岩角羊 / 巢母衝撞預備、刺藤花拉鞭(預備開始那一刻) | — | sfx_windup.mp3(0.5 秒反轉鐘聲漸強) | −15 |
| `bee_shot` | bee_shot | 射手蜂射出蜂彈 | — | sfx_bee_shot.mp3(尖哨) | −19 |
| `hawk_dive` | hawk_dive | 俯衝鷹開始俯衝 | — | sfx_hawk_dive.mp3(1 秒呼嘯) | −17 |
| `rock_drop` | rock_drop | 落石蜥丟石 / 巢母噴石彈(3 顆石彈同時噴只呼叫一次即可) | — | sfx_rock_drop.mp3 | −20 |
| `beetle_fuse` | beetle_fuse | 甲蟲開始閃爍 | — | sfx_beetle_fuse.mp3(0.8 秒引信 + 越來越密的滴答, 對齊閃爍長度) | −19 |
| `player_hurt` | player_hurt | 玩家扣血(含尖刺) | — | sfx_player_hurt.mp3 | −13 |
| `skill_ready` | skill_ready | 技能冷卻完成 | — | sfx_skill_ready.mp3 | −21 |
| `goal_reach` | goal_reach | 碰到終點旗、出現「按 ↓」提示 | — | sfx_goal_reach.mp3(短上揚, 未收尾) | −15 |
| `level_clear` | level_clear | 按 `↓` 過關那一刻(世界定格) | — | sfx_level_clear.mp3(同組旋律完整上揚, 撥弦 + 鋼鼓) | −12 |
| `iris_close` | iris_close | **本輪新增** 過關動畫第 1.15 秒, 光圈一口氣收成一點(閃金星)那一刻; 第一次過關動畫晚 0.6 秒開始, 照實際動畫時間呼叫 | — | sfx_iris_close.mp3(0.8 秒: 0.13 秒短風切「咻」→ 亮音「叮」, 「叮」落在呼叫後約 0.13 秒) | −15 |
| `player_death` | player_death | **本輪新增** 死亡動畫開始(血量歸 0 或掉出畫面, 世界暗下)。這一下**不呼叫** `player_hurt` | — | sfx_player_death.mp3(0.65 秒: 重擊 + 降八度的「咚」+ 低鐘餘響, 比受傷沉、持續到碎裂前) | −12 |
| `shatter` | shatter | **本輪新增** 死亡動畫第 0.7 秒, 角色碎成碎片那一刻 | — | sfx_shatter.mp3(0.5 秒: 玻璃重碎 + 4 片越來越小、越來越高的碎片散落) | −14 |
| `level_fail` | level_fail | 失敗面板出現(死亡動畫播完, 約 1.3 秒) | — | sfx_level_fail.mp3(同組旋律下降) | −14 |
| `tutorial_done` | tutorial_done | 教學階段完成特效 | — | sfx_tutorial_done.mp3 | −17 |
| `boss_slam` | boss_slam | 巨拳砸地(砸到的那一刻) | — | sfx_boss_slam.mp3 | −10 |
| `boss_beam_charge` | boss_beam_charge | 大眼聚光預備開始 | — | sfx_boss_beam_charge.mp3(1.2 秒漸強, 尾端接光束) | −15 |
| `boss_beam` | boss_beam | 光束開始掃射 | — | sfx_boss_beam.mp3(1 秒) | −13 |
| `boss_rock` | boss_rock | 碎岩落下(每顆落地時) | — | sfx_boss_rock.mp3 | −14 |
| `boss_weak` | boss_weak | 巨像露出破綻 | — | sfx_boss_weak.mp3(上揚鋼鼓 + 亮音) | −13 |
| `boss_phase` | boss_phase | 巨像換階段 | — | sfx_boss_phase.mp3(低吼 + 低頻轟) | −11 |
| `boss_down` | boss_down | 巨像崩解 | — | sfx_boss_down.mp3(2.7 秒: 爆炸 + 吼 + 1.3 秒後接過關旋律) | −9 |
| `pause` | pause | 暫停 / 繼續(開與關都呼叫) | `on` | sfx_pause.mp3 | −21 |

全部素材來源與授權見 credits.md; 沒有程式產生的音效。

### 額外(選用)

- `Sound.stop(name)`: 立刻收掉某事件正在響的聲音。規格說預備中被擊倒的怪「那一招不得發生」, 想讓聲音也跟著斷可在擊倒時呼叫 `Sound.stop('windup')` / `Sound.stop('beetle_fuse')` / `Sound.stop('boss_beam_charge')`。不呼叫也沒關係(這三個音都 ≤ 1.2 秒)。

## 背景音樂

`Sound.playMusic(曲名)` 循環播放; 換到另一首時舊曲淡出 0.8 秒、新曲淡入。同一首重複呼叫不會從頭播。`Sound.stopMusic()` 淡出停止。

| 曲名 | 何時播 | 素材檔(原曲) | 長度 |
|---|---|---|---|
| `title` | 開始畫面 | music_title.mp3(Village Consort) | 3:35 |
| `map` | 大地圖與所有面板 | music_map.mp3(Carefree) | 3:24 |
| `forest` | 翠林谷地關卡(1~3) | music_forest.mp3(Thatched Villagers) | 4:05 |
| `cliff` | 風蝕高崖關卡(4、5) | music_cliff.mp3(Celtic Impulse) | 2:36 |
| `mine` | 地底礦坑關卡(6、7) | music_mine.mp3(Achaidh Cheide) | 2:13 |
| `boss` | 第 8 關 | music_boss.mp3(Black Vortex) | 2:47 |
| `ending` | 結局動畫 | music_ending.mp3(Eternal Hope) | 4:42 |

**背景音樂是 CC BY 4.0, 遊戲裡要放署名**(例: 結局卷軸最後或暫停面板), 文字見 credits.md。

## 暫停時音樂壓低一半

- 暫停打開時 `Sound.play('pause', { on: true })`, 關掉時 `Sound.play('pause', { on: false })`; 音樂音量自動壓到一半、恢復。靜音中照樣記住狀態
- 從暫停面板選「重來」「回大地圖」離開時, 也請呼叫 `Sound.play('pause', { on: false })`(不播也可以: 換到另一首曲子、或關卡內出現跳躍 / 攻擊 / 受傷等動作音時, 會自動解除壓低, 當作保險)

| 開始事件 | 結束事件 | 效果 |
|---|---|---|
| `pause` + `{on:true}` | `pause` + `{on:false}` / 換曲 / 關卡動作音 | 音樂 × 0.5 |

## 同時觸發的處理

規格的「同一瞬間」規則照規格由 RD 只呼叫該播的那個; `sound.js` 另外做了保險, 同一瞬間(0.06 秒內)兩個都呼叫了也只會聽到大的那個:

| 播這個 | 讓位(不出聲 / 已響的立刻收掉) |
|---|---|
| `monster_down` | `hit` |
| `brood_down` | `hit`、`monster_down` |
| `boss_down` | `hit`、`monster_down`、`hit_block`、`boss_phase` |
| `boss_phase` | `hit` |
| `shield_break` | `hit_block` |
| `level_fail` | `player_hurt` |
| `player_death` | `player_hurt` |

- 死亡: `player_death`(0 秒)→ `shatter`(0.7 秒)→ `level_fail`(1.3 秒), 三者依時間各播一次, 由 RD 照死亡動畫的時間呼叫; `player_death` 的餘響在 0.65 秒收掉, 不會和碎裂聲疊糊
- 過關: `level_clear`(按 `↓`)→ `iris_close`(1.15 秒); 第一次過關時 `tutorial_done` 跟 `level_clear` 疊著播
- 解鎖職業: 只播 `unlock_class`(教學階段 11 的 `tutorial_done` 疊著播)
- 疊著播的: `monster_down` + `chain`; `chest_open` + `item_get`(後者晚 0.15 秒, 由 RD 延遲呼叫); `repair` 後 0.6 秒 `fog_clear`
- 甲蟲被擊飛撞爆只播 `explosion`(由 RD 不呼叫 `monster_down`)
- 限頻(同名事件最短間隔, RD 有做也無害): `hit` 0.05 秒、`coin_land` 0.06 秒、`drop_collect` 0.08 秒、`hit_block` 0.05 秒、`ui_move` 0.03 秒、`arrow` 0.05 秒、`rock_drop` 0.05 秒、`boss_rock` 0.08 秒、`pickup` 0.03 秒
- 會連發的事件(`hit`、`coin_land`、`drop_collect`、`arrow`、`slash`、`pickup` 等)每次隨機微調音高 ±4~8%, 不會像機關槍
- 音量層級: Boss / 巢母大事件(−9~−11)> 爆炸、受傷、死亡、過關、解鎖職業(−11~−14)> 一般戰鬥(−15~−18)> 介面與背景性的連發音(−21~−24)。玩家受傷(−13)刻意比打怪的 `hit`(−17)響, 不會被淹沒; `player_death`(−12)比 `player_hurt` 響且尾音長(受傷 0.15 秒就掉到 −26, 死亡維持 −17~−22 到 0.4 秒), 聽得出「這下是死了」; `unlock_class`(−11)比 `upgrade`(−14)響、長(1.33 對 0.5 秒有效長度), 規格要的「更隆重」

## 理念或經驗落實

- **即時回饋音要在 0.03 秒內出聲**(技術 / 即時回饋延遲): 按鍵直接觸發的音(介面、跳、揮砍、衝刺、投彈、潛行)量過「到峰值一成的時間」都在 0~27 毫秒(`equip` 32 毫秒略超, 是卡榫聲本身的前段); 全部音效以 mp3 base64 內嵌, 頁面載入時用 OfflineAudioContext 先解碼, init 後走 Web Audio 播放, 沒有 Web Audio 才退回 4 複本的 `<audio>` 播放池
- **lamejs 輸出的 mp3 沒有 LAME 標頭, 開頭會多出編碼延遲**(技術 / lamejs): 檔頭補 20 毫秒數位靜音, 執行時找第一個 |樣本| > 0.002 往前 3 毫秒起播(量得實際起點 31~48 毫秒); 退回 `<audio>` 時跳過開頭 0.03 秒
- **刻意漸強的音要有立即出聲的層墊著**(技術 / 即時回饋延遲): `windup`、`boss_beam_charge` 是反轉的鐘 / 力場聲, 各墊一層立即出聲的低吼 / 鐘聲, 到峰值一成從 271 / 622 毫秒降到 15 / 0 毫秒
- **蓄力用反轉素材, 尾端正好是撞擊**(事件設計 / 蓄力 → 撞擊): `windup`(0.5 秒)與 `boss_beam_charge`(1.2 秒)的長度對齊規格的預備時間, 尾端接上攻擊
- **背景音樂用現成整首曲子, 不用短循環**(素材來源 / 程式合成音樂被嫌膩): 7 首都是 2:13~4:42 的完整曲子, 一關聽不到幾輪重複
- **incompetech 曲庫清單先篩再下載**(素材來源 / incompetech): 用 `pieces.json` 依曲風欄(Bright / Driving / Calming…)與樂器挑出同一個民俗 / 奇幻家族, 7 首風格一致
- **CC BY 音樂署名**(授權與下載 / 署名文字): credits.md 附 incompetech 格式的署名文字, 回報提醒製作人遊戲內要放
- **Kenney 下載帶瀏覽器標頭、走 download-link 取簽名網址, 檢查 `PK` 檔頭**(授權與下載 / Kenney 403): 照做, 7 個 Kenney 包一次下成功
- **頁面列多種授權時選 CC0**(授權與下載 / 混合授權): Battle Sound Effects 頁面同列 CC-BY / CC-BY-SA / CC0, 選 CC0 並寫在 credits.md
- **成對事件取同一段旋律**(素材來源 / 成對事件): Kenney Music Jingles 每種樂器的同編號是同一段旋律 — `goal_reach`(短上揚, 未收尾)→ `level_clear`(完整上揚, 撥弦 + 鋼鼓兩分軌); `level_fail` 用同組的下降句; `boss_down` 尾段接 `level_clear` 的同一句, 聽得出是「大一號的過關」
- **同編號疊多種樂器 = 大一號的同家族**(素材來源 / 成對事件(續)): 本輪新增的 `unlock_class` 用 10 號旋律(+2→+7 上揚), 疊薩克斯 + 撥弦 + 鋼鼓三分軌, 是 `item_get`(薩克斯 + 撥弦)與 `unlock_level`(鋼鼓)的大一號; 不用過關的 02 號, 免得跟過關混淆; 薩克斯起音慢, 提早 0.06 秒擺並墊撥弦當起音
- **蓄力用反轉素材, 尾端正好是撞擊**(事件設計): `unlock_class` 前 0.42 秒是反轉力場聲(光柱降下), 尾端接鐘聲落地與上揚樂句(角色躍出); 開頭墊一層亮音, 到峰值一成 0 毫秒
- **本輪新增 4 個音效全用上一輪已下載的 Kenney / OpenGameArt CC0 素材包**(授權與下載): 跟既有音效同源, 聲音風格一致, 不需新的授權來源
- **限幅只壓起音尖峰, 最多 4 dB**(混音與音量 / 打擊類素材): `beetle_fuse` 限幅 3.2 dB 後停在 −18.8(目標 −16), 表上寫的是實際量到的響度
- **暫停壓低的掛勾放在 play 最前面, 不受靜音與限頻影響; 換曲時清掉, 保留 0.15 秒內剛設的**(技術 / 壓低原因): 照做; 本作只有暫停一種原因, 另加「關卡動作音出現就解除」當 RD 漏呼叫的保險
- **冒煙測試用假 Audio / AudioContext 逐一驗**(技術): init 前呼叫、interface.json 的 55 個事件各一次、讓位(含本輪新增的 `player_death` 讓 `player_hurt`)、死亡三段依序、靜音、無 Web Audio 退回播放池, 全部通過

輕重與辨識度都是量測數字推定的, **聽感待試玩確認**。
