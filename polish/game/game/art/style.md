# 連環工程 美術規格(polish)

RD 只需讀這份。`index.html` 必須宣告 `<meta charset="utf-8">`(art.js 內有中文字串)。以 `<script src="game/art/art.js">` 載入, 取用全域 `window.Art`, 不用 ES module。函式名與 state 欄位與 `interface.json` 一一對應, 一個不多一個不少。

## 1. 邏輯畫布

- `Art.canvas = { width: 1280, height: 720 }`(= interface.json 的 canvas; 上一版沒有依裝置加寬, 本版照舊匯出固定寬)
- 美術一律照 1280×720 設計座標畫, 不自己乘縮放。高 DPI 由 RD 呼叫前整體 `ctx.scale(dpr)`; 美術判斷「是否被縮小」時已扣掉底圖倍率(`canvas.width / 1280`)
- 額外匯出(非繪圖函式, RD 不必接): `Art.palette`、`Art.themes`、`Art.icons.mat / item / cls / key`(字典級小圖示, 之後若有說明頁或方案頁要重用就呼叫這裡, 不要另抄)

## 2. 色票(`Art.palette`)

| 名稱 | 色碼 | 用途(只代表這件事) |
|---|---|---|
| wood / woodLight / woodDark | `#b8682a` / `#f2c88c` / `#6a3a14` | 木材(麻繩原木堆), 霧面 |
| stone / stoneLight / stoneDark | `#a9b3be` / `#e6ebf0` / `#5e6874` | 石頭(等角石方, 三面明暗), 霧面 |
| crystal / crystalLight / crystalDark | `#3fd6ea` / `#d2fbff` / `#137c90` | 水晶(青色晶簇, 自帶光暈)。**青色只給水晶**, 敵方提示、技能都不用青 |
| core / coreLight / coreDark / coreEye | `#d94bc6` / `#ffc6f4` / `#6e1a62` / `#ffe14a` | 魔核(帶黃色獸眼的魂火球, 自帶光暈); 升級所等級格也用此色(花魔核買的) |
| sword / hunter / bomber | `#3d8bfd` / `#1fbf9a` / `#f28c28` | 三職業身體色; 技能冷卻環填色; 玩家一律白描邊 |
| brood | `#c264ff` | **巢穴記號**: 背上發光紫紋、巢穴怪紫瞳、巢母、巢穴門爪痕、巢穴底紫脈、巢母之心外光、巢穴工程牌 |
| danger | `#ff4a3a` | 敵方預備投影(紅斜紋、紅點線、紅虛線、紅圈)、巨像符文 / 眼、落石紅描邊 |
| weak | `#ffe066` | **破綻**: 巢母破綻弱點、巨像破綻部位、血條轉黃描邊、暈星。黃只代表「現在打它最划算」 |
| shortcut / treasure / nestRole | `#6fb0ff` / `#ffc83d` / `#c264ff` | 工程角色色(工程牌底、施工藍圖虛線、準備頁角色標誌)。捷徑改成天藍, 避開水晶青 |
| spikeTip | `#e5484d` | 尖刺紅尖(三主題共用) |
| crack / crackLine | `#c99a6c` / `#5a3a22` | 裂岩牆(暖色平板磚 + 裂痕) = 打得破 |
| rubble / rubbleLight | `#4e5868` / `#7d8898` | 堵塞隧道亂石(冷色圓石, 無裂痕) = 打不破 |
| plank / plankDark / stair | `#d59c57` / `#8a5a2a` / `#cbc1ae` | 修好的橋面(新木板 + 釘頭)/ 修好的階梯(切石), 人工感 |
| chest / chestLid / gold | `#c27a2e` / `#dd9238` / `#f2c94c` | 寶箱 |
| goal / goalReached | `#ffd23f` / `#3ccf6e` | 終點旗 未到 / 站在旗上 |
| sand / sandDark | `#e2c99c` / `#8a6a46` | 守門巨像砂岩(場景鹽原是粉紫白, 色相刻意分開) |
| board / plankUi / seam / edge / nail | `#3a2a1f` / `#45321f` / `#21160e` / `#180f09` / `#d9b47a` | 介面木板、板縫、深邊、角釘(ui 方案 A) |
| parch / parchDim / ink / inkDim / cream | `#efe3c6` / `#b8ab8e` / `#2b2118` / `#76664e` / `#f3e6c8` | 羊皮紙牌與深字 / 木板上的淺字 |
| select / selectDeep | `#ffd84a` / `#b8860b` | 選中(金框 + 浮起 + 吊牌三角)、此刻按得下去的石鍵帽金頂、教學箭頭 |
| short | `#c8202c` | 花費不足的數字 + 「缺 N」紅底小標、付不起的動作章斜線 |
| good / goodLight | `#2f8f55` / `#4fd18b` | 已完工、已招募、較高產量、已過關卡框、教學打勾章 |
| hp / newArea | `#ff4d5e` / `#ff8a3d` | 玩家愛心 / 「新區域」小標 |

地形主題(`Art.themes`, 線 / 內部 / 頂面): forest 圓 `#2a1a0e`/`#73502f`/`#5cbf45`; cliff 尖 `#262b3a`/`#5d6680`/`#e8eef5`; mine 方 `#0d0a08`/`#463b35`/`#76664f` + 坑木; salt 小圓角 `#3a2440`/`#ad8299`/`#fbf3ec`(鹽殼白頂 + 粉紅襯邊); lair 圓 `#120818`/`#2d1a38`/`#5a2d6e`(紫脈)。

色彩張力(驗收時看這幾組):
- 魔核(洋紅火球 + 黃眼)vs 巢穴記號(紫色發光線紋): 色相相鄰, 另用形狀分(魔核是圓團實心圖示, 巢穴記號只以「線紋」出現在怪物背上 / 門上, 從不填滿)。
- 巨像破綻黃 vs 金色 UI 選中: 黃只出現在怪物身上, 金只出現在介面與教學; 兩者不同框。
- 礦坑背景燈光是暖橘點光, 不畫青色晶礦(礦坑地形的半埋晶礦用藍紫 `#6f7de8`, 不浮動不閃星, 和可撿水晶分開)。

## 3. 形狀語言

一句話: **世界物件扁平幾何、怪物圓潤 Q 版無黑描邊(上亮下暗 + 白眼紅瞳)、玩家幾何剪影白描邊; 介面是釘角釘的深色木板 + 羊皮紙牌 + 有厚度的石鍵帽; 地形整塊連成一片、只在外露邊描深邊, 外角依主題 圓(翠林)/ 尖(高崖)/ 方(礦坑)。**

## 4. 理念落實

- **P0 辨識度先於好看**: 三種擋路物 裂岩牆(暖色平板 + 裂痕)/ 亂石(冷色圓石堆、無裂痕)/ 封印石門(厚框 + 紫爪痕)用「材質 + 顏色」兩通道分出誰打得破; 三職業縮到 1/8 只剩盾形 / 三角 / 圓。
- **P1 視覺權重跟著決策迫切度走**: 背景與地圖紙紋最低調; 最亮的是危險投影(紅)、破綻(黃)與教學箭頭(金); 素材飛行投幣時只讓那一格資訊列壓扁、噴火花, 不蓋其他格的數字。
- **P2 規則上存在的東西畫面上必須存在**: 未修的斷橋 / 崩梯每一格畫角色色施工藍圖(看得出修好後會變實心的位置); 盾兵的盾值接在血條前段; 花費逐項比對, 只有不足的那一種變紅 + 「缺 N」; 背包每格寫出裝在哪關哪格; 冷卻環每 1 秒一刻。
- **P3 一個意義一種長相**: 四種素材在地上、噴出粒、飛行、資訊列、卡片、面板、結算、開始畫面、結局全部呼叫同一個 `matIcon`; 號碼釘在工程牌與準備頁工程卡同款; 巢穴記號一律「發光紫紋」; 黃 = 破綻、紅 = 敵方預備、金 = 介面選中 / 可按。
- **P4 關鍵區分至少兩條通道**: 我方 vs 敵方 = 白描邊幾何 vs 無描邊圓潤 + 紅瞳; 一般怪 vs 巢穴怪 = 紅瞳 vs 紫瞳 + 背上發光紫紋; 震波(玩家)= 白色前緣細線 + 朝外小箭頭 vs 爆炸 = 實心橘火球 vs 敵方爆炸圈 = 紅虛線圈; 寶箱 關 / 開 = 金光 + 金帶 vs 灰褐 + 箱蓋立起。
- **P7 每個元素都要掙得它的版面**: 資訊列素材格拿掉用途小字, 只剩圖示、持有數、每分鐘產量; 怪物狀態不寫字, 全靠姿勢與投影; 卡片工程進度只一行小字。
- **P9 以最混亂的那一刻驗收**: 縮圖倍率(<0.2)一律改畫剪影色塊(主角記號、怪物橢圓 + 深框 / 紫框、巨像砂岩塊 + 紅眼、迷霧不透明), 自測對所有世界物件以 1 / 0.5 / 0.125 三種倍率跑過。
- **P13 事件要排隊**: 「獲得道具」提示固定一塊、淡入淡出, 由 RD 依序傳; 教學一次只畫一個階段。
- **P15 回饋強度與份量成正比**: 擊倒煙 小 48 / 巢母 96 / 巨像 320; 連鎖字比 +N 浮字大一號且彈到 1.3 倍; 巢母之心的提示框與圖示是紫色外光。
- **P17 進度類圖形與數字分工**: 技能冷卻只用腳下地面環(不寫秒數); 巨像血條每 1 HP 一道淡刻度 + 換階段白粗刻度, 不再另寫數字。
- **P18 重要資訊不能只存在一瞬間**: 「獲得 道具」閃過後, 結算面板再列一次; 「新區域」標記常駐卡片角落直到重跑。
- **P19 資訊貼著物件**: 冷卻環在角色腳下(頭頂留給怪物血條, 「腳下 = 自己的計量、頭頂 = 敵方血條」分工); 號碼釘在工程牌頂; 花費畫在卡片自己的縮圖區; 「按 ↓ 完成關卡」泡泡尖端指旗子。
- **P21 示意圖要選對錯理解會分岔的例子**: 本輪沒有說明頁(改嵌入式教學), 不適用。

## 5. 判讀約定(RD 請照這些傳值)

1. **座標**: 除註明「左上角」外, x, y 都是判定框中心。工程牌 / 寶箱 / 終點旗 / 巢穴門 / 刺藤花 / 巢母底邊貼地 = y + 高/2。
2. **布林只認 `true`**(`open` 的四邊、`repaired`、`end`、`bottom`、`hit`、`brood`、`reached`、`first`、`invuln`、`stealth`、`big`、`weak`、`lit`、`selected`、`newArea`、`anyAffordable`、`owned`、`touch`); 例外: `drawSoundIcon.on` 與 `drawSiteHighlight.active` 只有 `=== false` 才算關、`drawShieldman.hasShield` 只有 `=== false` 才算盾已破。
3. **表外值的預設外觀**(看到這些代表傳錯值): 主題 → forest、工程 kind → rubble、角色 role → shortcut、素材 → wood、職業 → sword、pose → idle、怪物 state → 各自第一種、道具 → bagWood、卡片 state → sealed、預備投影 kind → ring。
4. **閒置值**: 所有 `xxT / xxDur` 照介面「閒置時 xxT = xxDur」判讀; xxT < xxDur 才播。
5. **縮圖剪影門檻**: 函式讀 `ctx.getTransform()` 的縮放(扣底圖倍率), 小於 0.2 改畫剪影; 準備頁預覽 0.5 畫細節版。假 ctx 沒有 `getTransform` 時當成 1。縮圖中的**主角記號**刻意畫成畫面上約 9px(會大於判定框), 否則只剩 3px 看不出職業。
6. **工程牌號碼**: 0.5 倍預覽下號碼自動放大到畫面上至少 10px, 號碼釘會比 36×48 框頂多出至多 12 單位(只在預覽發生)。
7. **施工動畫時間軸**: 介面寫「buildT/buildDur ≥ order×0.7 後開始自己的 0.3 秒」, 但 order = 1 時 0.42 + 0.3 = 0.72 > 0.6, 會在 buildT 到 buildDur 時還沒播完。美術採「每格施工長 = min(0.3, buildDur − 起點)」, 保證 buildT = buildDur 那一刻全部到位(最後鋪的格子施工較快); buildT 還沒到那格的起點時照未修畫(含藍圖)。
8. **落石蜥的血條**: 介面把血條固定在框上緣上方(top−13~top−8), 落石蜥倒掛時那裡是天花板岩頂。`drawHpBar` 的 y 是血條底邊, **建議 RD 對落石蜥改傳 y = 框下緣 + 13**(血條畫在身體下方開闊處); 照介面傳也能畫, 只是會壓在岩頂上。
9. **巨像拳頭超出 size**: 介面 `drawColossus` 外接框是 y 20~580, 但規格的巨拳卡在地面(地面 600、埋 10px)時拳中心約 y 560, 拳底到 610。美術照拳的判定 110×100 畫在 (x, y), 超出外接框屬規格位置使然; 換階段噴飛的肩甲在落地前淡出, 落地後**不留在場上**(避免被看成可站的地形)。
10. **教學階段 6**: 不畫橫幅與箭頭; 完成特效期間若 RD 傳 `tip = { x: 泡泡中心 x, y: 泡泡中心 y }`, 在那裡蓋打勾章 + 6 顆金星。不傳 tip 就什麼都不畫(泡泡本身的「首次」放大脈動由 `drawGoalPrompt.first` 處理)。
11. **系統時鐘動畫**(state 沒給時間的): 玩家無敵閃爍 12Hz、寶箱閃光、終點旗飄動(非慶祝時)、蜂彈旋轉、準備頁框選脈動、結局 t 停在 14 之後的提示字呼吸。暫停時這幾個會繼續動, 屬預期。其餘動畫一律吃 state 的 t / xxT。
12. **全畫面暗幕**由面板函式自己畫: `drawLevelPanel`(在預覽框 (60,96,640,360) **挖空**, 預覽框內請 RD 自己鋪滿)、`drawBackpackPanel`、`drawShopPanel`、`drawClassSelect`、`drawUpgradePage`、`drawPausePanel`。`drawResultPanel`、`drawFailPanel` 不畫暗幕。
13. **字歸屬**: 每個面板 / 卡片 / 提示 / 資訊列內的字(含鍵帽)美術已畫; RD 只畫大地圖最下方 y=690~714 那行操作提示。美術額外畫的字: 失敗面板「這趟作廢, 素材不入帳」; 卡片「可解鎖 · Z」「前一關未過」「7 關全過才開放」; 準備頁紀錄區小標「目前回放」與商店列「用水晶買道具」; 職業卡「擅長: …」。世界物件函式內唯一的字是工程牌號碼。

## 6. 繪製順序補充

照 interface notes 的順序即可。`drawSkillRing` 一次畫完整個環(沒有前後分層), 請在 `drawPlayer` 之前呼叫。`drawTutorial` 的箭頭會畫在橫幅外(依 tip), 請保持在 `drawHud` 之後、`drawSoundIcon` 之前。

## 7. 物件表

| 物件 | 函式 | state 欄位 | 各狀態外觀 |
|---|---|---|---|
| 開始畫面 | `drawTitle(ctx, s)` | t, touch | 深藍放射光 + 金色環道(半徑 265, 中心 (640,340))串 8 枚窗(頂端粉紫斷門、順時針 翠林 3 / 高崖 2 / 礦坑 2), 窗內小角色重跑; 光點 4 秒一圈、每 0.5 秒掃一窗 → 窗亮 + 噴 3 顆素材(翠林木材 / 高崖石頭 / 礦坑水晶 / 斷門魔核)落進中央倉庫大門, 屋頂彈一下(至多 1.04 倍、底邊不動)、門口素材堆長高; 光點回頂端時斷門門縫閃光、素材堆回原高。底下 (640,668) 20px「按任意按鍵開始遊戲」/ touch「點擊畫面開始遊戲」, 1.2 秒呼吸(alpha 0.55~1)。沒有任何標題字 |
| 關卡背景 | `drawBackground(ctx, s)` | theme, t | forest 圓丘 + 棒棒糖樹 + 兩側樹幹 + 飄花粉; cliff 尖塔 + 斜肩台地 + 沙漏岩柱 + 流動風線; mine 豎井 + 鷹架 + 三盞閃爍礦燈 + 浮塵; salt 深紫→桃粉天空、星、流動條雲、兩根斷裂巨門石柱(缺口在中央上方) |
| 大地圖背景 | `drawMapBackground(ctx, s)` | t | 深青底 + 淡格線 + 等高線; x>940 漸層成黃昏地平線與很小的斷門剪影, 條雲緩慢飄 |
| 地面 | `drawGround(ctx, s)` | x, y, theme, open{n,e,s,w} | 只在外露邊描深邊、相鄰格無縫; 外角 圓 / 斜切 / 直角 / 小圓角; open.n 畫頂面(苔緣扇貝 / 鋸齒白岩 / 坑木頂 / 白鹽殼 + 粉襯 / 紫頂); 沒傳 open 時用舊欄位 top |
| 巢穴底 | `drawLairBack(ctx, s)` | x, y(左上), w, h, lairTheme | 暗紫挖空底 + 主題巢壁(根團 / 岩鋸齒 / 坑木)+ 發光紫紋 + 卵囊 |
| 尖刺 | `drawSpike(ctx, s)` | x, y, theme | 下半 40×20; 翠林荊棘、高崖 / 鹽原岩刺、礦坑鐵釘板, 一律紅尖 |
| 裂岩牆 | `drawCrackWall(ctx, s)` | x, y, hp, theme | 暖色平板磚; hp3 一道裂、hp2 分岔、hp1 滿裂 + 兩角缺塊; 外框色跟主題線色 |
| 工程結構 | `drawWorksite(ctx, s)` | x, y, kind, role, repaired, theme, end, bottom, buildT, buildDur, order | 未修: bridge end = 殘樁 + 斷板、其餘空; stairs bottom = 地上碎石堆、其餘空; 兩者每格 role 色虛線藍圖(內縮 3px, 半透明); rubble = 冷色圓石堆(打不壞的樣子, 無藍圖)。已修: 新木板橋(礦坑加鐵軌)/ 切石階(頂邊主題色)/ rubble 不畫。施工: 石階從上方 40 落下、木板由薄翻厚、亂石炸開(碎片至多框外 24) |
| 巢穴門 | `drawNestGate(ctx, s)` | x, y, open, lairTheme, buildT, buildDur | 80×80; 封印 = 灰紫石板 + 三道發光紫爪痕 + 封印環 + 門楣紫紋章 + nest 色虛線藍圖; 施工 = 石板沉入地面; 打開 = 只剩門框(內淨空 64×72)+ 淡紫門內光; 門框材質依 lairTheme |
| 工程牌 | `drawSiteSign(ctx, s)` | x, y, role, num | 木柱 + 角色色牌 + 牌心標誌(捷徑雙箭頭 / 寶區寶箱 / 巢穴爪印)+ 頂端金屬圓釘寫號碼(≥12px, 預覽中畫面上 ≥10px) |
| 迷霧 | `drawFog(ctx, s)` | x, y(左上), w, h, t, theme, clearP, ox, oy, maxR | 不透明主題霧色 + 流動霧團(圓團 / 橫向尖雲 / 方塊); 推開時圓內不畫, 圓外一圈寬 16 亮霧 + 暖色細線, 隨 clearP 淡出; 霧團以世界 80×40 格定位, 兩個矩形接起來無縫 |
| 預備投影 | `drawTelegraph(ctx, s)` | kind, x, y, x2, y2, w, h, r, pts, p, t | 紅色系, p 越大越濃、脈動越快; lane 斜紋帶 + 前進箭頭; aim 點線 + 準星; dive 虛線 + 十字; column 落柱斜紋 + 地面紅橢圓; ring 地面虛線橢圓; blast 紅虛線圈; sweep 斜紋長方形; arc 虛線折線 + 箭頭; crack 地裂 + 冒煙; path 紅虛線 + 流動箭頭 + 終點箭頭 + 起點準星 |
| 地上素材 | `drawPickup(ctx, s)` | x, y, kind, t | 素材圖示 18px, t 輕微浮動 + 閃星 |
| 噴出素材粒 | `drawDropBit(ctx, s)` | x, y, kind, t, dur, vx, vy | 14px 圖示; 0~0.4 旋轉、0.4~0.6 落地壓扁(底邊不動)、0.6~1.0 沿速度拉長 + 反方向淡拖尾 ≤16 |
| 寶箱 | `drawChest(ctx, s)` | x, y, open | 關 = 橘金箱 + 金帶金鎖 + 金色地光 + 閃星; 開 = 灰褐空箱、箱蓋立起、無光 |
| 終點旗 | `drawGoal(ctx, s)` | x, y, reached, cheerT, cheerDur | 白旗桿; 未到 = 金旗紅星飄動; reached = 旗揚起轉綠 + 白勾; 慶祝 = 大幅揮動 + 金色光點往上噴 ≤40 |
| 完成提示 | `drawGoalPrompt(ctx, s)` | x, y, first, t | 羊皮紙泡泡 200×48(底邊 y−8)+ 尖端 (x, y−2); 「按 [↓] 完成關卡」18px, 鍵帽輕彈; 泡泡左右夾在 8~1272; first = 金框 + 1.15 倍 + 0.8 秒脈動 |
| 玩家 | `drawPlayer(ctx, s)` | x, y, cls, facing, pose, poseT, invuln, stealth, stealthT, stealthDur, unstealthT, unstealthDur | 劍士倒梯形藍盾身 + 方盔 + 紅披風 + 直劍; 獵人綠尖錐斗篷 + 兜帽兩點亮眼 + 弓; 炸彈工橘圓桶 + 大護目鏡 + 手持炸彈。run 擺腿; rise 收腿; fall 張腿; slash 劍平舉 + 面向側新月刀光(0.15 秒); dash 前傾 + 反方向速度線 ≤60; throw 手前伸; wave 蹲低雙手張開; hurt 紅身後仰; cheer 舉武器 + 頭頂小金星; invuln 閃爍; stealth 本體 0.35 + 青白虛線殼, 最後 0.5 秒殼閃爍; 現身 = 外擴白環 + 6 星 ≤12 |
| 技能冷卻環 | `drawSkillRing(ctx, s)` | x, y(腳底中點), cls, cdT, cdDur, readyT, readyDur, castT, castDur, denyT, denyDur, stealthLeft, stealthDur | 貼地橢圓 56×16; 冷卻 = 深軌道 + 職業色由後方順時針長滿 + 每秒一刻; 最後 0.35 秒轉金 + 亮邊; 可用 = 靜止金環 + 淡金地光; 剛好 = 閃白轉金 + 波紋(≤88×28)+ 6 金星上飄 ≤30; 施放 = 金環脹開淡出(≤80×24); 拒絕 = 左右抖 ±3 + 閃紅; 潛行 = 內圈虛線(長度 = 剩餘比例)。不寫數字 |
| 射程圈 | `drawRangeRing(ctx, s)` | x, y, radius | 獵人綠半透明虛線圈 |
| 血條 | `drawHpBar(ctx, s)` | x, y(血條底邊), hp, maxHp, shield, maxShield, chip, chipT, chipDur, big, weak | 圓角連續條, 寬 min(96, max(16, 6×總量+4)), 高 5 / big 7; 盾值段在左(藍灰)、血量段在右(紅), 中間深色分隔; 剛扣段白色縮回; weak 血量段轉黃 + 黃描邊 |
| 野豬 | `drawBoar(ctx, s)` | x, y, facing, state, flingDir, hit, brood, t | walk 擺腿; windup 壓低 + 刨地揚塵 + 怒眉紅光眼; charge 前傾 + 框內速度線; stun 螺旋眼 + 星; flung 往 flingDir 傾斜 + 框外反方向速度線 ≤40 |
| 跳蛙 | `drawFrog(ctx, s)` | x, y, facing, state, flingDir, hit, brood | crouch 扁趴; jump 圓身 + 後腿伸直; flung 同上 |
| 射手蜂 | `drawShooterBee(ctx, s)` | x, y, facing, state, flingDir, hit, brood, t | fly 拍翅; aim 前傾轉橘 + 尾針紅光脈動; flung |
| 刺藤花 | `drawThorn(ctx, s)` | x, y, facing, state, stateT, hit, brood, t | idle 擺動; windup 藤鞭往後拉 + 花瓣張開 + 紅尖; whip 藤鞭沿地甩到面向側(至多框外 137)+ 揮痕; recover 藤鞭垂在地上 |
| 岩角羊 | `drawRam(ctx, s)` | x, y, facing, state, flingDir, hit, brood, t | walk; windup 低頭 + 後蹄刨地; butt 前傾 + 速度線; stagger 搖晃 + 螺旋眼 + 星; flung |
| 俯衝鷹 | `drawHawk(ctx, s)` | x, y, facing, state, flingDir, angle, hit, brood, t | circle 拍翅; hover 翅膀高舉 + 爪下伸; dive 收翅箭形朝 angle(縮放收進框內); return 半展翅朝 angle; flung |
| 落石蜥 | `drawLizard(ctx, s)` | x, y, facing, state, hit, brood, t | 倒掛, 腳抓天花板; crawl 擺腳; windup 尾巴捲石; throw 尾巴下甩 |
| 敵方投石 | `drawRockShot(ctx, s)` | x, y, t, kind | 不規則石塊旋轉 + 紅色危險描邊; lizard 褐灰、spit 藍灰 |
| 盾兵 | `drawShieldman(ctx, s)` | x, y, facing, state, flingDir, hit, brood, t, hasShield, breakT, breakDur | 有盾 = 面向側藍色大盾; block 盾閃白 + 黃火花; 盾已破 = 身體露出橘色 + 殘把手 + 怒眉; breakT 盾碎白環 + 5 片碎盾噴開 ≤24 |
| 爆炸甲蟲 | `drawBeetle(ctx, s)` | x, y, facing, state, flingDir, fuseT, fuseDur, hit, brood, t | 靛色甲殼 + 橘色腹縫 + 背上引信; fuse 白 / 橘越閃越快、膨脹到 1.15 倍、紅光暈 |
| 蝙蝠 | `drawBat(ctx, s)` | x, y, facing, state, flingDir, hit, brood, t | 紫灰小蝠拍翅; flung |
| 巢母 | `drawBroodmother(ctx, s)` | x, y, kind, facing, state, stateT, stateDur, hit, t | forest 巨牙獸母(苔刺背 + 獠牙); cliff 崖蜥母(岩刺背 + 粗尾, windup 前身立起、spit 張口、pant 吐舌冒汗); mine 鑽地甲后(靛殼 + 轉動鑽頭角, burrow 沉入、under 只剩土堆、erupt 竄出 + 噴土、stuck 斜卡在地上)。三者背上都有發光紫紋; 破綻(stun / pant / stuck)= 弱點發黃光 + 螺旋眼 + 星 |
| 守門巨像 | `drawColossus(ctx, s)` | hx, hy, phase, eye, lid, split, weak, angry, lf, rf, blocks, plFall, roar, steam, hit, ko, koT, koDur, t | 砂岩機關頭(石冠 + 紅符文 + 大眼 + 嘴格柵), 判定 200×160; phase 2 臉裂紋 + 額頭紅縫; phase 3 上下兩半分開 44×split, 中間發光核心眼(90×90); eye 聚光紅暈 + 光線內收; lid 眼皮; 雙拳 110×100(stuck 冒碎石); 浮石 70×60(falling 上方速度線); weak 對應部位轉黃 + 閃星; roar 震動 ±4 + 符文閃紅; steam 蒸氣; hit 閃白; ko 碎塊往下散落淡出 |
| 光束 | `drawBossBeam(ctx, s)` | x1, y1, x2, y2, w, t | 紅外暈 + 寬 w 紅光柱 + 白熱芯 + 流動亮段; 終點灼燒火花 + 淡藍玻璃化鹽痕 |
| 巨像血條 | `drawBossHpBar(ctx, s)` | x, y(中心), hp, maxHp, marks, chip, chipT, chipDur, weak | 360×12 圓角條, 每 1 HP 淡刻度, marks 白粗刻度; weak 轉黃 + 黃描邊 |
| 蜂彈 / 箭 / 炸彈 | `drawBeeShot` / `drawArrow` / `drawBomb` | x, y / x, y, angle / x, y, t | 紅橘圓 + 深色尖刺環 / 米白箭身 + 綠箭羽 / 黑球白邊 + 引信星火、旋轉 |
| 爆炸 | `drawExplosion(ctx, s)` | x, y, t, dur, radius, kind | 橘火球由 45% 擴到 radius 淡出; beetle 偏紅 + 8 片靛色甲殼碎片 |
| 震波 | `drawShockwave(ctx, s)` | x, y, t, dur, radius | 白色前緣環(外緣在 t=dur 剛好到 radius)+ 內側淡橘細線 + 8 個朝外小箭頭 + 極淡暖色面 |
| 擊倒煙 | `drawPoof(ctx, s)` | x, y, t, dur, size | 灰白煙團擴散淡出; big ×1.85 + 紫碎屑、huge ×5.6 + 砂岩碎屑 |
| 浮字 / 連鎖字 | `drawPopup` / `drawChainText` | x, y, t, dur, kind, value / x, y, n, t, dur | 素材圖示 +「+N」(素材亮色深描邊)上移 30 淡出 / 金色「n 連鎖」彈到 1.3 倍上移淡出 |
| 道具圖示 | `drawItemIcon(ctx, s)` | x, y, type, size | 三種袋子(袋色 + 素材圖示)、魔核燈(提燈 + 魔核)、拾荒手套、獵人號角(象牙角 + 紅帶)、巢母之心(紫心金框紫外光)、加速齒輪(銅齒輪 + ▶▶) |
| 獲得提示 | `drawItemNotice(ctx, s)` | type, t, dur | (440,100) 400×44 羊皮紙 + 金框(巢母之心紫框), 圖示 +「獲得 <道具名>」, 前 0.2 淡入、後 0.3 淡出 |
| 資訊列 | `drawHud(ctx, s)` | mode, stock, ratePerMin, bumpT, bumpDur, time, hp, maxHp | 0~40 木板條; 四格羊皮紙(x=16/186/356/526, 寬 162): 圖示(中心 x+20, y 20)、持有數、右對齊「+x.x/分」; bump 中整格壓扁 0.85 + 圖示壓扁 + 數字 1.3 倍 + 火花; level 再畫愛心格(724 起, maxHp 顆)與時鐘格「xx.xs」 |
| 聲音開關 | `drawSoundIcon(ctx, s)` | x, y, on | 36×36 石鍵帽; 開 = 米白帽 + 喇叭聲波; 關 = 灰帽 + 喇叭打叉(不用紅); 右下角小字「M」10px |
| 新手教學 | `drawTutorial(ctx, s)` | stage, text, keys, pressed, bx, by, bw, bh, tip, doneT, doneDur, t | 羊皮紙橫幅(左側金條)+ 文字 18/20px + 鍵帽; pressed 的鍵帽金頂 + 綠勾; tip = 金色粗箭頭(長 36 寬 24), 0.8 秒沿指向軸往後彈 6px; 完成 = 橫幅轉金 + 右端綠色打勾章蓋下 + 6 金星噴 ≤40, 最後 0.2 秒淡出 |
| 地圖連線 | `drawMapLink(ctx, s)` | x1, y1, x2, y2, lit | S 形曲線; lit 金色粗線 + 外光; 暗 = 灰虛線 |
| 關卡卡片 | `drawLevelCard(ctx, s)` | x, y(左上), index, name, theme, state, cost, stock, need, rates, recordCls, recordTime, repairedCount, siteCount | 木框依主題染色(第 8 關粉紫雙框 + 角落斷門紋); sealed 壓暗 + 灰鎖 + 花費 / 第 8 關畫斷門剪影 +「還差 N 關」; buyable 金虛線框 + 金鎖 + 花費(不足紅); open 米色框、縮圖區鋪深底等 RD 疊縮圖、「未過關」; cleared 綠框、職業記號 + 秒數 + 四種產量。第一行右側「工程 r/s」(siteCount 0 不畫) |
| 卡片上層 | `drawCardOverlay(ctx, s)` | x, y, speedMul, newArea, selected, replayP, marks | 縮圖外框(內部透明); speedMul>1 右上銅色齒輪徽章「×1.25」; newArea 左上橘色「新區域」; 回放進度條 + 素材色點(播過亮、未播暗, 剛經過的放大 + 白圈)+ 白色播放頭; selected 金框(框外 4~6)+ 頂端吊牌三角 |
| 升級所卡片 | `drawWorkshopCard(ctx, s)` | x, y, anyAffordable, selected | 紫木框 + 鐵砧鐵鎚 + 爐火光 +「升級所」; anyAffordable 右上金色「!」圓章 |
| 飛行素材 | `drawFlyingMaterial(ctx, s)` | x, y, kind, t, dur | 17px 素材圖示, 依 t 水平翻轉(像硬幣), 沒有拖尾 |
| 關卡準備頁 | `drawLevelPanel(ctx, s)` | index, name, theme, row, sites, siteSel, slots, slotSel, bagCount, shopLeft, recordCls, recordTime, rates, speedMul, newArea, stock | 版位照介面; 選中列 = 金邊凹槽 + 左側 ▶; 工程卡 = 號碼釘 + 角色標誌 + 角色名 + 結構名, open 畫花費(不足紅 + 缺 N)+「Z 修復」章(付不起灰 + 紅斜線), done 斜蓋綠色「已完工」; 道具格 = 「N 號格」+ 圖示 40 + 名稱 + 效果 / 「空」, 選中格右上「Z 打開背包」或紅字「尚無道具」; 商店列 = 小招牌 +「商店」+「有貨 N 種」/「全部售完」+「Z 打開商店」; 開始挑戰列 = 大石鍵「開始挑戰」+ Z 鍵帽; (60,598,640,48) 教學帶留空 |
| 工程框選 | `drawSiteHighlight(ctx, s)` | x, y, w, h, active | 外緣 = (x,y,w,h) 的金框 + 流動深色虛線 + 四角加粗; active 脈動 |
| 背包 | `drawBackpackPanel(ctx, s)` | slotNo, level, items, sel | 暗幕 + 木板; 8×3 格 80×80; 第 0 格「卸下」(虛框 + 紅斜線); 道具格圖示 56 + 下緣小字(「未裝」/「3關2號」/ 金底「這一格」); 巢母之心格加淡紫光; 選中 = 金框 + 浮起; 下方說明區 + 按鍵列 |
| 商店 | `drawShopPanel(ctx, s)` | entries, sel, stock | 暗幕 + 木板; 標題「商店」+ 右上水晶持有; 6 列: 圖示 40、名稱、效果、價格(不足紅 + 缺 N)、「剩 N」; 售完 = 整列變灰 + 斜蓋「售完」; 選中列金框 + 左側 ▶ |
| 職業選擇 | `drawClassSelect(ctx, s)` | classes, sel | 暗幕 + 木板; 三張卡: 角色 2.5 倍、名稱、「擅長: …」; 未招募 = 變暗 + 鎖 +「到升級所招募」; 選中 = 金框 + 浮起 + 吊牌三角, 已招募且選中 =「Z 出發」金章 |
| 升級所 | `drawUpgradePage(ctx, s)` | row, recruits, recruitSel, stats, stock | 暗幕 + 紫木板; 招募列兩格(角色、名稱、擅長、已招募綠章 / 木材花費 +「Z 招募」); 四列強化: 名稱、等級格(魔核色)、目前效果 →(綠)下一級效果、魔核花費 +「Z 強化」/ 斜蓋「已滿」 |
| 結算 | `drawResultPanel(ctx, s)` | time, run, rates, cls, items, oldTime, oldRates, oldCls | 綠緞帶「過關」+「這一趟獲得」四種; 首次 = 職業 + 秒數 + 每分鐘產量 + 綠框「已存成回放」+ [Z] 回大地圖; 比較 = 兩欄(這一趟 / 目前回放), 較高一方綠字 + ▲、較低灰; 道具「獲得 X」; [Z] 採用這一趟 [X] 保留舊的 |
| 失敗 | `drawFailPanel(ctx)` | — | 暗紅木板「失敗」+「這趟作廢, 素材不入帳」+ [Z] 重來 [X] 回大地圖 |
| 暫停 | `drawPausePanel(ctx, s)` | mode, touch | 暗幕 + 木板「暫停」; [Esc] 繼續(touch 時改成金色「繼續」章, 不出現 Esc); level: [Z] 重來 [X] 回大地圖; map: [Z] 下載遊玩紀錄 |
| 結局 | `drawEnding(ctx, s)` | t, totalTime, kills, totals | 14 秒: 白光淡入 → 三人跑上高崖 → 天色深藍轉金、日出 + 長影 → 劍士跳起金星 / 獵人射箭化金星雨 / 炸彈工四色素材煙火 → 山谷 8 盞燈由遠到近亮、倉庫亮 → 9.9~10.7 頂端卷軸展開: 通關時間(m:ss, 滿 1 小時 h:mm:ss)、8 關全破、擊倒怪物 N、四種總收成(10.4~11.4 數字滾動); t≥10.4 底下 (640,660)「按任意按鍵回到大地圖」1.2 秒呼吸 |

## 8. 尺寸表

| 物件 | 尺寸(px) | 框外例外(介面允許或規格位置) |
|---|---|---|
| 地面 / 尖刺 / 裂岩牆 / 工程結構 | 40×40 | 都剪裁在格內; 尖刺只畫下半 40×20; 施工中至多左右 24、上 44 |
| 巢穴底 / 迷霧 | w×h | 剪裁在矩形內 |
| 巢穴門 | 80×80 | 門框 8 寬, 內淨空 64×72 |
| 工程牌 | 36×48 | 0.5 倍預覽時號碼釘上緣多出 ≤12 |
| 地上素材 / 噴出粒 / 飛行素材 | 24×24 / 16×16 / 20×20 | 噴出粒拖尾 ≤16 |
| 寶箱 / 終點旗 / 完成提示 | 40×36 / 40×80 / 200×48 | 旗慶祝光點上方 ≤40; 提示首次 1.15 倍 |
| 玩家 | 28×36 | slash 面向側 50×40; dash 反方向 ≤60; 現身閃光 ≤12; 縮圖記號約畫面 9px |
| 技能環 | 56×16 | 剛好波紋 88×28 + 星上 30; 施放 80×24 |
| 血條 / 巨像血條 | 寬依公式 × 5(big 7)/ 360×12 | |
| 野豬 / 跳蛙 / 射手蜂 / 刺藤花 | 48×32 / 32×28 / 32×32 / 40×48 | 擊飛速度線框外 ≤40; 暈星在框上緣上方 18~36; 刺藤花 whip 面向側 ≤137 |
| 岩角羊 / 俯衝鷹 / 落石蜥 / 盾兵 / 爆炸甲蟲 / 蝙蝠 | 44×36 / 40×28 / 36×24 / 32×40 / 32×24 / 24×20 | 盾碎碎片 ≤24; 甲蟲 fuse 1.15 倍 |
| 巢母 | 64×56 | 破綻星在框上緣上方 18~36 |
| 守門巨像 | 760×560 外接框(以 (640,300) 為中心) | 頭 200×160、拳 110×100、浮石 70×60、核心眼 90×90; 卡地的拳與崩解碎塊可超出外接框(判讀約定 9) |
| 光束 | 寬 w + 外暈 12 | |
| 投石 / 蜂彈 / 箭 / 炸彈 | 20×20 / 12×12 / 24×6(沿飛行方向)/ 16×16 | |
| 爆炸 / 震波 | 半徑 radius(外緣) | |
| 擊倒煙 | small 48 / big 96 / huge 320 | |
| 浮字 / 連鎖字 | 56×24 / 120×32 | 上移 30、連鎖字 1.3 倍 |
| 道具圖示 | size×size(24~64) | |
| 獲得提示 | 400×44 @ (440,100) | |
| 資訊列 | 1280×40 @ (0,0) | 投幣火花可超出下緣 ≤12 |
| 聲音開關 | 36×36 | |
| 教學橫幅 | (bx,by,bw,bh) | 箭頭依 tip 可在任何位置; 完成金星 ≤40 |
| 卡片 / 卡片上層 / 升級所卡片 | 176×136 | 選中框外 ≤6 |
| 準備頁 / 升級所 | 1200×640 @ (40,48) | 暗幕全畫面 |
| 背包 / 商店 / 職業選擇 | 800×480 @ (240,120) / 800×480 @ (240,120) / 700×320 @ (290,200) | 暗幕全畫面 |
| 結算 / 失敗 / 暫停 | 720×420 @ (280,150) / 520×240 @ (380,240) / 520×280 @ (380,220) | 暫停暗幕全畫面 |
| 開始畫面 / 結局 / 背景 | 1280×720 | 剪裁在畫布內 |

## 9. 自查紀錄

- `node --check` 通過
- Node vm + 追蹤變換矩陣 / 矩形剪裁 / 弧照實際角度取樣的假 ctx: 64 個匯出函式 × 各狀態組合 × 3 個系統時鐘相位, 世界物件再各以縮放 0.5 / 0.125 跑一輪, 共 11193 次呼叫: 0 拋錯、save/restore 全成對、globalAlpha 不外漏、0 個非有限值、外接框 **0 筆超出**(上表的例外照允許框算)、畫面上最小字 10px、沒用 `globalCompositeOperation`
- 壞狀態(undefined、null、空物件、NaN、Infinity、1e9、負數、每個欄位塞表外字串 / 物件)每個函式都餵過, 不拋錯
- 介面每個函式的每個 state 欄位都在函式內被讀到(含怪物共用外殼)
- 數值回讀: 資訊列四格持有數與產量落在各自格內、時間正確; 卡片 / 準備頁工程卡 / 商店 / 升級所花費只有不足那幾種是紅字且「缺 N」數字正確; 結算比較 ▲ 標在較高一方; 結局卷軸時間 h:mm:ss / m:ss、擊倒數與四種總收成正確、10.4 秒前不畫提示字; 教學鍵帽字在橫幅內; 觸控暫停面板沒有「Esc」; 開始畫面只有一行提示字(依 touch 換字)
- 開始畫面 t 與 t+4 外接框相同(4 秒無接縫循環)
