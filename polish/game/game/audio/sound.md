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
| `unlock_class` | unlock_class | (第 2 輪新增) 解鎖職業, 解鎖特效開始那一刻(只播這個, 不疊 `upgrade`、`ui_confirm`) | — | sfx_unlock_class.mp3(1.33 秒: 反轉力場聲 0.42 秒漸強當光柱降下 → 鐘聲落地 + 同旋律薩克斯 / 撥弦 / 鋼鼓三分軌上揚) | −11 |
| `coin_land` | coin_land | 大地圖飛行素材投進資訊列 | — | sfx_coin_land.mp3(錢幣叮) | −24 |
| `jump` | jump | 起跳 | — | sfx_jump.mp3 | −22 |
| `land` | land | 從高處落地(下落速度 > 600px/秒) | — | sfx_land.mp3 | −18 |
| `slash` | slash | 劍士揮砍: **每按一次 `Z` 呼叫一次**(polish 第 4 輪取消冷卻, 連按每秒可到 8~10 次)。動作重播也照樣呼叫, 不必自己限頻 | — | sfx_slash.mp3(0.15 秒刀聲, 有效長度約 0.11 秒: 0.10 秒後已掉到 −30 dB)。第 4 輪素材不變; sound.js 內建 0.05 秒限頻, 且**新一刀起時前一刀 15 毫秒淡出**, 連按不疊加、不爆音 | −17 |
| `dash` | dash | 衝刺斬 | — | sfx_dash.mp3 | −15 |
| `arrow` | arrow | 獵人自動射箭 | — | sfx_arrow.mp3(弓弦) | −24 |
| `stealth_on` | stealth_on | 潛行開始 | — | sfx_stealth_on.mp3(往下收) | −17 |
| `stealth_off` | stealth_off | 潛行解除 | — | sfx_stealth_off.mp3(往上開, 跟 on 成對) | −16 |
| `bomb_throw` | bomb_throw | 投彈 | — | sfx_bomb_throw.mp3 | −20 |
| `explosion` | explosion | 炸彈 / 甲蟲爆炸 | — | sfx_explosion.mp3 | −11 |
| `shockwave` | shockwave | 炸彈工技能「爆風擊退」發動那一刻(事件名沿用 `shockwave`) | — | sfx_shockwave.mp3(**本輪重做** 0.74 秒: 悶重一擊 + 放慢的寬風切「呼—」往外推 + 壓低的低頻轟; 0.3 秒內就退到 −26 以下, 比 `explosion` 短、少了爆炸的碎裂聲, 聽得出是「推開」不是「炸」) | −13 |
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
| `player_hurt` | player_hurt | 玩家扣血(含尖刺、**炸彈炸到自己**) | — | sfx_player_hurt.mp3 | −13 |
| `skill_ready` | skill_ready | 技能冷卻完成 | — | sfx_skill_ready.mp3 | −21 |
| `goal_reach` | goal_reach | 碰到終點旗、出現「按 ↓」提示 | — | sfx_goal_reach.mp3(短上揚, 未收尾) | −15 |
| `level_clear` | level_clear | 按 `↓` 過關那一刻(世界定格) | — | sfx_level_clear.mp3(同組旋律完整上揚, 撥弦 + 鋼鼓) | −12 |
| `iris_close` | iris_close | (第 2 輪新增) 過關動畫第 1.15 秒, 光圈一口氣收成一點(閃金星)那一刻; 第一次過關動畫晚 0.6 秒開始, 照實際動畫時間呼叫 | — | sfx_iris_close.mp3(0.8 秒: 0.13 秒短風切「咻」→ 亮音「叮」, 「叮」落在呼叫後約 0.13 秒) | −15 |
| `player_death` | player_death | (第 2 輪新增) 死亡動畫開始(血量歸 0 或掉出畫面, 世界暗下)。這一下**不呼叫** `player_hurt` | — | sfx_player_death.mp3(0.65 秒: 重擊 + 降八度的「咚」+ 低鐘餘響, 比受傷沉、持續到碎裂前) | −12 |
| `shatter` | shatter | (第 2 輪新增) 死亡動畫第 0.7 秒, 角色碎成碎片那一刻 | — | sfx_shatter.mp3(0.5 秒: 玻璃重碎 + 4 片越來越小、越來越高的碎片散落) | −14 |
| `level_fail` | level_fail | 失敗面板出現(死亡動畫播完, 約 1.3 秒) | — | sfx_level_fail.mp3(同組旋律下降) | −14 |
| `tutorial_done` | tutorial_done | (第 5 輪改時機) **只在**總結板按 `Z` 關閉、新手教學結束那一刻播一次(不疊 `ui_back`) | — | sfx_tutorial_done.mp3(**第 5 輪重做** 0.95 秒: 薩克斯「小號角」完整上揚句 + 同旋律撥弦墊起音; 跟 `level_clear` 同一段旋律、換樂器) | −14 |
| `tut_pop` | tut_pop | (第 5 輪新增) 教學泡泡 + 大箭頭彈出那一刻; 換句時只在**新泡泡彈出**時播(舊泡泡收起不播); 第一關擋終點提示出現時也播(與 `ui_deny` 疊著播)。演出 2 的卷軸、演出 6 的聚光燈不播這個(各有專屬音) | — | sfx_tut_pop.mp3(0.23 秒: 「啵」+ 短上揚, 0.15 秒到頂) | −17 |
| `tut_type` | tut_type | (第 5 輪新增) 逐字顯示時**每個字出現一次**(含句中按鍵外觀; 空白可不呼叫)。sound.js 內建同名 0.07 秒限頻, RD 不必自己擋 | — | sfx_tut_type.mp3(0.02 秒極短的「嗒」, 每次音高隨機 ±10%) | **−30**(全遊戲最輕) |
| `tut_next` | tut_next | (第 5 輪新增) 「按 Z 繼續」徽章出現後按下 `Z`(地圖 3 → 4、地圖 4 → 總結板)。字還沒打完時按 `Z` 不反應, 也不播 | — | sfx_tut_next.mp3(0.24 秒: 書本放下的「嗒」+ 翻頁) | −19 |
| `tut_panel` | tut_panel | (第 5 輪新增) 演出 2: 操作方式卷軸從角色胸口冒出、開始攤開那一刻 | — | sfx_tut_panel.mp3(0.85 秒: 翻開 + 羊皮紙沙沙展開, 0.58 秒最響) | −20 |
| `tut_dock` | tut_dock | (第 5 輪新增) 操作方式面板滑到左上角**落定**那一刻(落定輕彈開始時) | — | sfx_tut_dock.mp3(0.2 秒: 闔書「扣」+ 輕喀) | −20 |
| `tut_spot` | tut_spot | (第 5 輪新增) 演出 6: 聚光燈開始淡入那一刻(此時泡泡還沒彈出; 0.6 秒後泡泡彈出時照常播 `tut_pop`) | — | sfx_tut_spot.mp3(0.59 秒: 舞台燈開關「喀」+ 悶「咚」+ 燈亮的低嗡餘韻) | −15 |
| `respawn` | respawn | (第 5 輪新增) 第一關教學死亡後重生**開始**(碎片從上方盤旋飛回; 死亡後 1.7 秒) | — | sfx_respawn.mp3(1.38 秒: 碎裂聲**倒放**的碎片聚回 + 越轉越快的棘輪倒帶 + 上揚掃音, 一路漸強到 1.38 秒收住; 開頭有亮音立即出聲) | −14 |
| `respawn_land` | respawn_land | (第 5 輪新增) 重生角色落到起點那一刻(`respawn` 之後約 1.41 秒) | — | sfx_respawn_land.mp3(0.2 秒: 輕落地 + 小亮音「好了」) | −18 |
| `summary_open` | summary_open | (第 5 輪新增) 總結板**開始**從上方滑下那一刻(板子 0.5 秒落定; 聲音裡的「咚」落在呼叫後 0.45 秒) | — | sfx_summary_open.mp3(0.78 秒: 木板滑下的摩擦聲 → 0.45 秒大木板落定) | −15 |
| `summary_card` | summary_card | (第 5 輪新增) 每張卡**開始**從右側滑入時各呼叫一次(0.7 / 1.15 / 1.6 / 2.05 秒, 共 4 次; 「叩」落定在呼叫後 0.3 秒) | — | sfx_summary_card.mp3(0.6 秒: 滑牌 + 木頭輕敲落定)。sound.js 自動讓**連續的卡一張比一張高 2 個半音**(間隔 < 0.8 秒算同一串, 第 4 張 +6 半音), RD 不用傳參數 | −19 |
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
| `tutorial_done` | `ui_back` |

- 死亡: `player_death`(0 秒)→ `shatter`(0.7 秒)→ `level_fail`(1.3 秒), 三者依時間各播一次, 由 RD 照死亡動畫的時間呼叫; `player_death` 的餘響在 0.65 秒收掉, 不會和碎裂聲疊糊
- 過關: `level_clear`(按 `↓`)→ `iris_close`(1.15 秒)。(第 5 輪起 `tutorial_done` 不再跟過關疊播)
- 解鎖職業: 只播 `unlock_class`
- **新手教學(第 5 輪)**, 依時間各播一次:
  - 地圖 1 / 準備 1 按 `Z` 完成: 只播該畫面原本的 `ui_confirm`, 不另播教學音; 泡泡出現時照常 `tut_pop`、打字 `tut_type`
  - 第一關演出: 演出 1 `tut_pop` → 打字 `tut_type`… → 演出 2 `tut_panel`(卷軸冒出)→ 示範時照播 `jump`、`slash` ×2、`dash` → `tut_dock`(落定)→ 演出 3~5 各 `tut_pop` + 打字 → 演出 6 `tut_spot`(聚光燈淡入)→ 0.6 秒後 `tut_pop` + 打字
  - `tut_type` 與 `tut_pop` 不會同時(彈出 0.32 秒後才打字); 地圖 2a 往後接句時不再播 `tut_pop`, 只播接上的字的 `tut_type`
  - 地圖 3 / 4 按 `Z`: `tut_next`, 接著新泡泡彈出時 `tut_pop`
  - 總結板: `summary_open`(滑下開始)→ `summary_card` ×4(每張滑入開始, 自動逐張升高)→ 按 `Z` 關閉只播 `tutorial_done`
  - 第一關擋終點: `ui_deny` 與 `tut_pop` 疊著播
  - 教學死亡: `player_death`(0 秒)→ `shatter`(0.7 秒)→ **不播** `level_fail` → `respawn`(1.7 秒)→ `respawn_land`(約 3.11 秒)。`respawn` 是 `shatter` 倒放做的, 聽得出「碎掉的又倒帶回來」
  - 音量: 教學音都比遊戲回饋輕(`tut_type` −30 最輕, 打字一整句也不吵; 卷軸 / 收好 −20、翻頁 −19、彈出 −17), 只有聚光燈 `tut_spot` −15 與總結板落定 −15 稍重, 是規格要的「注意這裡」與「收尾」
- 疊著播的: `monster_down` + `chain`; `chest_open` + `item_get`(後者晚 0.15 秒, 由 RD 延遲呼叫); `repair` 後 0.6 秒 `fog_clear`
- 甲蟲被擊飛撞爆只播 `explosion`(由 RD 不呼叫 `monster_down`)
- 炸彈炸到自己: `explosion` 與 `player_hurt` 同一刻都播, 不互相讓位(爆炸 −11 的低頻轟 + 受傷 −13 的中頻「咚」, 頻段不同, 聽得出「炸到自己了」)
- 劍士連按揮砍: `slash` 每按一次一聲(每秒 8~10 次時間隔 0.1~0.125 秒, 刀聲主體 0.11 秒, 不糊); 兩下間隔小於 0.05 秒的只出第一聲; 新一刀出聲時前一刀在 15 毫秒內淡出(不是硬切, 沒有喀聲), 同一時間最多一刀在響, 峰值不會疊加爆音
- 限頻(同名事件最短間隔, RD 有做也無害): `tut_type` 0.07 秒、`tut_pop` 0.05 秒、`slash` 0.05 秒、`hit` 0.05 秒、`coin_land` 0.06 秒、`drop_collect` 0.08 秒、`hit_block` 0.05 秒、`ui_move` 0.03 秒、`arrow` 0.05 秒、`rock_drop` 0.05 秒、`boss_rock` 0.08 秒、`pickup` 0.03 秒
- 會連發的事件(`hit`、`coin_land`、`drop_collect`、`arrow`、`slash`、`pickup`、`tut_type` 等)每次隨機微調音高 ±4~10%, 不會像機關槍
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
- **同編號疊多種樂器 = 大一號的同家族**(素材來源 / 成對事件(續)): 第 2 輪新增的 `unlock_class` 用 10 號旋律(+2→+7 上揚), 疊薩克斯 + 撥弦 + 鋼鼓三分軌, 是 `item_get`(薩克斯 + 撥弦)與 `unlock_level`(鋼鼓)的大一號; 不用過關的 02 號, 免得跟過關混淆; 薩克斯起音慢, 提早 0.06 秒擺並墊撥弦當起音
- **蓄力用反轉素材, 尾端正好是撞擊**(事件設計): `unlock_class` 前 0.42 秒是反轉力場聲(光柱降下), 尾端接鐘聲落地與上揚樂句(角色躍出); 開頭墊一層亮音, 到峰值一成 0 毫秒
- **第 2 輪新增 4 個音效全用上一輪已下載的 Kenney / OpenGameArt CC0 素材包**(授權與下載): 跟既有音效同源, 聲音風格一致, 不需新的授權來源
- **第 3 輪(本輪)只改兩個音, 其餘 53 個音效與 7 首音樂原檔不動**(沿用任務): `slash` 從同一支刀聲剪短到 0.15 秒(主體能量本來就在前 0.1 秒, 0.1 秒後已掉到 −31); `shockwave` 改用本作 `dash` / `fog_clear` 用過的同一支風切(Battle Sound Effects)當「推開」的主體, 墊 Impact Sounds 的悶擊與 Sci-fi 的低頻轟, 全部是既有素材包, 與 `dash`(風切加速)、`hawk_dive`(風切放慢)同一家族
- **即時回饋音要在 0.03 秒內出聲**(技術 / 即時回饋延遲): 本輪兩個音重量過, `slash` 到峰值一成 4 毫秒、`shockwave` 0 毫秒(悶擊層打頭)
- **限幅只壓起音尖峰, 最多 4 dB**(混音與音量 / 打擊類素材): `beetle_fuse` 限幅 3.2 dB 後停在 −18.8(目標 −16), 表上寫的是實際量到的響度
- **暫停壓低的掛勾放在 play 最前面, 不受靜音與限頻影響; 換曲時清掉, 保留 0.15 秒內剛設的**(技術 / 壓低原因): 照做; 本作只有暫停一種原因, 另加「關卡動作音出現就解除」當 RD 漏呼叫的保險
- **第 4 輪(本輪)音效不新增事件, 55 個音效與 7 首音樂原檔全部沿用**(沿用任務): 只為 `slash` 的「每按一次播一次、每秒 8~10 下」加執行時處理; 重量現有刀聲(峰值 −3 dBFS、10 毫秒包絡 0.10 秒後 −30 dB), 長度已夠短, 不換素材
- **連發音不能被同名的前一聲切掉, 但也不能疊到爆音**(規格: 可快速連播不糊、不爆音): 一般連發音(`hit`、`arrow` 等)各自疊著播; `slash` 峰值高(−3 dBFS)、又可能 0.05 秒連兩下, 改成「新的一刀起、前一刀 15 毫秒線性淡出」, 跟限頻 0.05 秒一起寫在 sound.js
- **冒煙測試用假 Audio / AudioContext 逐一驗**(技術): 第 4 輪加驗 `slash` 每 0.1 秒都出聲、前一聲有排淡出、0.02 秒內第二下被限頻; init 前呼叫、interface.json 的 55 個事件各一次、讓位(含本輪新增的 `player_death` 讓 `player_hurt`)、死亡三段依序、靜音、無 Web Audio 退回播放池, 全部通過

- **第 5 輪(本輪)沿用 55 個既有音效與 7 首音樂原檔不動**(沿用任務): 只新增 10 個教學事件、重做 `tutorial_done`; 全部取自 Kenney CC0 包(其中 5 個是上一輪已用的包, 只多 Casino Audio 一包拿紙牌聲), 跟既有的木作 / 書本 / 撥弦家族同一套質感
- **成對事件取同一段素材**(素材來源 / 成對事件): `respawn` 直接用 `shatter` 的五片玻璃**反轉**、時間倒排, 碎裂與重生是一對「碎掉 → 倒帶回來」; `tutorial_done` 用 Music Jingles 02 號(過關那段旋律)換成薩克斯 — 「換樂器不換旋律」, 聽得出同一家族又不會跟過關搞混
- **蓄力用反轉素材, 尾端正好是事件點**(事件設計 / 蓄力 → 撞擊): `respawn` 的反轉低鐘與碎片都對齊 1.38 秒收尾, 剛好接在 1.41 秒的 `respawn_land` 前; 量 20 毫秒包絡確認從開頭一路爬升(約 −50 → −28 dB 再到碎片峰值), 中段沒有無聲的空洞(第一版中段掉到 −58, 加一層漸加速的棘輪聲才補上)
- **刻意漸強的音要有立即出聲的層墊著**(技術 / 即時回饋延遲): `respawn` 開頭墊亮音、到峰值一成 0 毫秒; `summary_open` 的滑動聲跳過素材開頭 0.1 秒的輕前奏, 從 172 毫秒縮到 29 毫秒
- **即時回饋音要在 0.03 秒內出聲**(技術 / 即時回饋延遲): 按鍵直接觸發的 `tut_next` 到峰值一成 1 毫秒; `tut_pop`、`tut_type`、`tut_dock`、`tut_spot`、`respawn_land` 都是 0 毫秒
- **連發音加限頻 + 隨機音高**(技術 / 連發): `tut_type` 每秒 13 字, 0.07 秒限頻、±10% 音高、響度 −30, 整句打字是細碎的顆粒聲
- **冒煙測試**(技術): 本輪加驗 65 個事件都有內嵌音檔、`tut_type` 每 0.077 秒都出聲且 0.03 秒內第二下被擋、`summary_card` 四張逐張升高(第 4 張 +6 半音)、隔 3 秒回原音高、`tutorial_done` 擋同刻的 `ui_back`、`ui_deny` + `tut_pop` 疊播、教學死亡 → 重生四聲依序、無 Web Audio 退回播放池, 全部通過

輕重與辨識度都是量測數字推定的, **聽感待試玩確認**。
