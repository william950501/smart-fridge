# 🧊 鮮知 (Xianzhi) - 智慧食材管理系統

本專題為一套**手機優先的響應式網頁 (RWD)**，以「家庭」為單位記錄冰箱食材的位置與保存期限。結合 AI 食譜推薦、一週菜單規劃與數據分析，旨在**減少食物浪費、簡化採買流程並提供健康飲食建議**。

> **技術架構**：前端 Vue 3 單頁應用程式 (SPA)，目前使用 Pinia Mock Data 進行邏輯驗證，並透過 `localStorage` 實作資料持久化，已準備好隨時串接 Laravel 後端 API。

---

## 🛠️ 核心技術棧

- **前端框架**：Vue 3 (Composition API) + Vite
- **狀態管理**：Pinia (含手動 localStorage 持久化)
- **路由管理**：Vue Router 4 (含登入攔截守衛)
- **UI 元件庫**：Element Plus (含自動按需引入、自訂彈窗樣式)
- **圖表視覺化**：ECharts
- **時間處理**：Day.js

---

## 💻 常用終端機指令 (Terminal Commands)

**1. 安裝依賴套件** (初次下載專案或新增套件時執行)：
```bash
npm install
```

**2. 啟動開發伺服器** (平時開發時使用)：
```bash
npm run dev
```
*(啟動後在瀏覽器打開 `http://localhost:5173/`)*

**3. 暫停 / 停止開發伺服器**：
> 在終端機按下鍵盤的 `Ctrl + C`

**4. 打包正式環境版本** (專題 Demo 或部署時使用)：
```bash
npm run build
```
*(打包後的檔案會產生在 `dist/` 資料夾中)*

**5. Git 版本控制提交**：
```bash
# 1. 將修改過的檔案加入暫存區
git add .

# 2. 提交變更並說明這次更新的內容
git commit -m "Update smart fridge project"

# 3. 推送到遠端分支
git push
```

---

## 📂 最新專案資料夾結構與作用一覽

```text
smart-fridge/                      # 專案根目錄 (Vue 3 + Vite)
│
├── public/                        # 靜態資源 (如 favicon)
├── index.html                     # 網頁入口 HTML (引入 Google Fonts 與 Vite 腳本)
├── package.json                   # 專案設定檔
├── vite.config.js                 # Vite 設定檔
│
└── src/                           # 專案主要原始碼
    │
    ├── main.js                    # 程式進入點 (初始化 Vue, Pinia, Router, Element Plus)
    ├── App.vue                    # 根元件 (僅放置 <router-view />)
    │
    ├── assets/                    # 靜態資源與樣式
    │   └── main.css               # 🌟 雙主題設計代幣 (預設赤陶橙 / 洋流橘紅)、全域樣式、微對比元件覆寫
    │
    ├── router/                    # 路由設定
    │   └── index.js               # 定義所有頁面路徑、登入守衛 (BeforeEach)、動態加載設定
    │
    ├── layouts/                   # 版面配置
    │   └── DefaultLayout.vue      # 主版面 (收合式側邊欄、Header、全域搜尋、通知抽屜、手機底部選單)
    │
    ├── stores/                    # Pinia 狀態管理 (核心商業邏輯)
    │   ├── auth.js                # 登入狀態 (Token 保存、Base64 頭像狀態與更新)
    │   ├── fridge.js              # 冰箱結構 (預設範本、自訂冰箱結構增刪)
    │   ├── inventory.js           # 食材庫存 (CRUD、期限計算、回收桶、開封狀態、自訂食材字典)
    │   ├── recipe.js              # 食譜推薦 (50道食譜庫、推薦演算法、過敏原過濾、收藏與回收桶)
    │   ├── shopping.js            # 購物清單 (新增、勾選、刪除、花費計算)
    │   ├── analytics.js           # 數據分析 (浪費金額、庫存價值、營養素加總計算)
    │   ├── family.js              # 家庭管理 (成員名單、邀請碼產生與驗證)
    │   ├── notification.js        # 通知中心 (含前端模擬排程 generateDueReminders、家庭動態)
    │   ├── settings.js            # 系統設定 (提醒天數、過敏原、飲食限制、口味偏好)
    │   └── ui.js                  # 介面狀態 (長輩模式、側邊欄收合狀態)
    │
    ├── components/                # 可重複使用的共用元件
    │   ├── food/
    │   │   ├── FoodForm.vue       # 新增食材表單 (含連續新增、期限自動推算、AI 模擬相機)
    │   │   └── FoodDetailDialog.vue # 食品詳情彈窗 (編輯數量、開封狀態、吃完、丟棄)
    │   ├── recipe/
    │   │   └── RecipeTrashDrawer.vue # 食譜回收桶抽屜 (還原收藏、永久刪除)
    │   └── notification/
    │       └── NotificationDrawer.vue # 右側滑出通知抽屜
    │
    └── views/                     # 頁面級元件 (對應路由)
        ├── LoginView.vue          # 登入/註冊頁 (毛玻璃與微對比 UI)
        ├── ForgotPasswordView.vue # 忘記密碼頁
        ├── HomeView.vue           # 首頁儀表板 (Bento Grid 不對稱排版)
        ├── FridgeView.vue         # 冰箱視圖 (4色狀態、HTML5拖曳、手機端專屬冰箱門抽屜)
        ├── InventoryListView.vue  # 食材管理 (Tabs庫存/自訂、快速登記自訂食材、批次操作)
        ├── RecipeView.vue         # AI 食譜推薦 (雙層篩選、過敏原標示、營養圓餅圖)
        ├── MealPlanView.vue       # 一週菜單規劃 (日曆排版、拖拉換餐、一鍵加購食材)
        ├── DietaryView.vue        # 過敏及忌口設定 (與 AI 食譜深度串接)
        ├── ShoppingListView.vue   # 購物清單 (AI 採買指南、預估花費切換、登記至庫存)
        ├── ReminderView.vue       # 到期提醒中心 (三區塊分類、一鍵清理)
        ├── AnalyticsView.vue      # 成本與浪費分析 (ECharts 雙Tab營養分析、採購建議)
        ├── FamilyView.vue         # 家庭管理 (邀請碼、成員權限)
        ├── ProfileView.vue        # 我的 (前端 Canvas 壓縮頭像上傳、大留白手帳排版)
        ├── SettingsView.vue       # 系統設定 (長輩模式開關、提醒設定)
        └── TrashView.vue          # 回收桶 (食材與食譜雙 Tab、30 天保留)
```

---

## ✨ 最新系統亮點設計

1. **雙主題切換**：內建「南歐莊園（赤陶橙）」與「洋流橘紅（Sunwave）」雙主題，透過 CSS 代幣 (Tokens) 實現，可隨時切換不同視覺氛圍。
2. **極致「降低輸入負擔」**：新增食材支援「連續新增」模式（保留區域與分類，一鍵清空輸入框）；自訂食材庫支援「一鍵快速登記」，大幅減少重複點擊。
3. **前端減輕後端負擔**：
   - **頭像壓縮**：上傳頭像時，前端使用 Canvas 裁切並壓縮為 200x200 的 Base64 字串才存入，後端無需處理圖片。
   - **模擬排程提醒**：`notification.js` 實作了前端排程掃描，載入系統時自動檢查即期食材並推入通知，完美模擬後端排程邏輯。
4. **微對比視覺語彙**：嚴格遵守「去 AI 味」規則，移除所有刺眼漸層與左側粗彩條。改以極細邊框、微暖背景色與克制的陰影（`--shadow-sm/md/lg`）來建立層級。
5. **手機端極致體驗**：新增「深海藍」全寬觸控按鈕，讓使用者在手機端能一眼注意到「打開冰箱門邊置物架」功能。
6. **AI 過敏原守護**：食譜推薦演算法會自動讀取過敏原，含有過敏原的食譜會以「半透明+灰階」顯示並禁用一鍵扣庫存。
7. **完整閉環設計**：從 AI 排餐 → 缺少食材一鍵加入購物車 → 購買後轉入庫存，形成完整的防止浪費生態圈。

---

## ⚠️ 開發注意事項

1. **顏色與樣式**：請一律使用 `main.css` 定義的設計代幣（例如 `var(--ink)`、`var(--surface)`、`var(--accent)`），**禁止寫死色碼**，這樣才能完美支援雙主題切換與微對比。
2. **動畫規範**：禁止使用 `transition: all`。Hover 位移限制在 `2px` 內，縮放限制在 `1.02` 內，且僅動畫 `transform` 與 `opacity`。
3. **圖示 (Icons)**：專案已在 `main.js` 全域註冊，可以直接使用 `<el-icon><Dish /></el-icon>` 等標籤，無需在每個檔案 import。**嚴格禁止在 UI 中使用 Emoji**。
4. **新頁面新增**：在 `views/` 建立 `.vue` 檔後，記得去 `router/index.js` 註冊路由，並在 `DefaultLayout.vue` 的選單加入連結。
5. **彈窗規範**：請統一使用 `<el-dialog class="custom-app-dialog">` 以維持全站彈窗 UI 的一致性。
6. **長輩模式**：如需調整字體大小，請修改 `main.css` 中的 `html.elder-mode` 變數，切勿在 Vue 元件中寫死固定的 `font-size`。
7. **資料儲存**：目前登入狀態、雙主題、長輩模式、冰箱結構、自訂食材、家庭成員、通知、頭像與回收桶皆使用 `localStorage` 儲存，重整頁面不會消失。