專題為一套手機優先的響應式網頁 (RWD)，以「家庭」為單位記錄冰箱食材的位置與保存期限。結合 AI 食譜推薦、一週菜單規劃與數據分析，旨在減少食物浪費、簡化採買流程並提供健康飲食建議。

> 技術架構：前端 Vue 3 單頁應用程式 (SPA)，目前使用 Pinia Mock Data 進行邏輯驗證，已準備好隨時串接 Laravel 後端 API。

---

##  核心技術棧

- **前端框架**：Vue 3 (Composition API) + Vite
- **狀態管理**：Pinia
- **路由管理**：Vue Router 4 (含登入攔截守衛)
- **UI 元件庫**：Element Plus (含自動按需引入)
- **圖表視覺化**：ECharts
- **時間處理**：Day.js

---

##  常用終端機指令 (Terminal Commands)

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

---

##  專案資料夾結構與作用一覽

```text
smart-fridge/
│
├── public/                 # 靜態資源 (如 favicon.ico)
├── index.html              # 網頁的入口 HTML 檔
├── package.json            # 專案設定檔 (記錄套件版本與執行指令)
├── vite.config.js          # Vite 建置工具設定檔 (含 Element Plus 自動引入設定)
│
└── src/                    # 專案主要原始碼
    │
    ├── main.js             # 程式進入點 (初始化 Vue、Pinia、Router、圖示、深色模式)
    ├── App.vue             # 根元件 (放置 <router-view />)
    │
    ├── assets/             # 靜態資源
    │   └── main.css        # 全域樣式 (已清空預設邊距)
    │
    ├── router/             # 路由設定
    │   └── index.js        # 定義所有頁面路徑，包含「未登入攔截」的守衛邏輯
    │
    ├── layouts/            # 版面配置
    │   └── DefaultLayout.vue # 主版面 (手風琴側邊欄、手機漢堡/底部選單、全域搜尋、通知、深淺色切換)
    │
    ├── stores/             # Pinia 狀態管理 (核心商業邏輯)
    │   ├── auth.js         # 登入狀態 (模擬登入/登出、使用者資訊)
    │   ├── fridge.js       # 冰箱結構 (管理冰箱範本、隔層結構、拖曳位置)
    │   ├── inventory.js    # 食材庫存 (食材 CRUD、預設期限、過期狀態計算)
    │   ├── analytics.js    # 數據分析 (浪費金額、庫存價值、營養素加總)
    │   ├── recipe.js       # AI 食譜 (推薦演算法、過敏原過濾、一週菜單狀態)
    │   ├── shopping.js     # 購物清單 (新增、勾選、刪除)
    │   ├── family.js       # 家庭管理 (成員名單、邀請碼產生與驗證)
    │   ├── settings.js     # 系統設定 (提醒天數、過敏原、飲食限制、口味偏好)
    │   └── ui.js           # 介面狀態 (深色/淺色模式切換)
    │
    ├── components/         # 可重複使用的共用元件
    │   └── food/
    │       ├── FoodForm.vue       # 新增食材表單 (含自動帶入期限、模擬 AI 拍照)
    │       └── FoodDetailDialog.vue # 食品詳情彈窗 (編輯、吃完、丟棄、調整進度)
    │
    └── views/              # 頁面級元件 (對應路由)
        ├── LoginView.vue        # 登入/註冊頁 (毛玻璃 UI、密碼 8 碼驗證)
        ├── HomeView.vue         # 首頁儀表板 (統計卡片、即將到期、骨架屏)
        ├── FridgeView.vue       # 冰箱視圖 (視覺化、HTML5 拖曳、手機門邊抽屜)
        ├── InventoryListView.vue# 食材管理 (電腦表格/手機卡片、批次操作)
        ├── RecipeView.vue       # AI 食譜推薦 (分類篩選、過敏原半透明提示、收藏)
        ├── MealPlanView.vue     # 一週菜單規劃 (日曆式排版、一鍵生成與加購)
        ├── ShoppingListView.vue # 購物清單 (快速新增、自動聚焦)
        ├── ReminderView.vue     # 到期提醒中心 (過期/今日/即期分類)
        ├── AnalyticsView.vue    # 分析報表 (ECharts 圖表、浪費排行、食譜營養分析)
        ├── FamilyView.vue       # 家庭管理 (邀請碼、成員權限)
        ├── ProfileView.vue      # 我的 (個人資訊、快捷入口)
        ├── CustomFoodView.vue   # 自訂食材管理 (建立專屬食材字典與預設天數)
        └── SettingsView.vue     # 系統設定 (提醒、過敏原、口味設定)
```

---

##  系統亮點設計

1. **手機端極致體驗**：嚴格遵守手機版底部導覽列（冰箱、採買、新增、提醒、我的），並將「新增」做成凸起的圓形大按鈕。漢堡選單支援手風琴收合。
2. **視覺化冰箱拖曳**：支援多種預設冰箱（雙門、三門、對開），並可自訂隔層。手機版專屬「冰箱門邊抽屜」，完美解決橫向爆版問題。
3. **AI 過敏原守護**：食譜推薦演算法會自動讀取系統設定的過敏原，含有過敏原的食譜會往後排序並以「半透明+灰階」顯示，點擊也無法一鍵扣庫存。
4. **閉環設計**：從 AI 排餐 → 缺少食材一鍵加入購物車 → 購買後轉入庫存，形成完整的防止浪費生態圈。
5. **全域深淺色模式**：所有頁面、彈窗、按鈕皆使用 Element Plus CSS 變數，切換模式時過渡滑順。

---

##  開發注意事項

1. **顏色與樣式**：請盡量使用 Element Plus 的 CSS 變數 (例如 `var(--el-text-color-primary)`、`var(--el-bg-color)`)，這樣深色與淺色模式才能自動切換。
2. **圖示 (Icons)**：專案已在 `main.js` 全域註冊，可以直接使用 `<el-icon><Dish /></el-icon>` 等標籤，無需在每個檔案 import。
3. **新頁面新增**：在 `views/` 建立 `.vue` 檔後，記得去 `router/index.js` 註冊路由，並在 `DefaultLayout.vue` 的側邊選單與手機選單加入連結。
4. **彈窗規範**：請統一使用 `<el-dialog class="custom-app-dialog">` 以維持全站彈窗 UI 的一致性，避免使用原生的 `ElMessageBox`。
5. **資料儲存**：目前登入狀態、深淺色模式、自訂食材與冰箱結構皆使用 `localStorage` 儲存，重整頁面不會消失。
```

---

這份 `README.md` 清楚交代了專案的技術棧、啟動方式、目錄結構（包含我們辛苦拆分出來的各項 Store 與 View）以及五大亮點。直接貼上即可使用！
