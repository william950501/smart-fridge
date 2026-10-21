==================================================
智慧食材管理系統 - 專案結構與指令說明
==================================================

【一、 常用終端機指令 (Terminal Commands)】

1. 安裝依賴套件 (初次下載專案或新增套件時執行)：
   > npm install

2. 啟動開發伺服器 (平時開發時使用)：
   > npm run dev
   (啟動後在瀏覽器打開 http://localhost:5173/)

3. 暫停 / 停止開發伺服器：
   > 在終端機按下鍵盤的 Ctrl + C

4. 打包正式環境版本 (專題 Demo 或部署時使用)：
   > npm run build
   (打包後的檔案會產生在 dist/ 資料夾中)


==================================================
【二、 專案資料夾結構與作用一覽】
==================================================

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
    │   └── main.css        # 全域樣式 (已清空預設樣式，避免影響排版)
    │
    ├── router/             # 路由設定
    │   └── index.js        # 定義所有頁面路徑，包含「未登入攔截」的守衛邏輯
    │
    ├── layouts/            # 版面配置
    │   └── DefaultLayout.vue # 主版面 (含側邊導覽列、頂部 Header、全局搜尋、通知鈴鐺、手機版漢堡選單)
    │
    ├── stores/             # Pinia 狀態管理 (負責處理資料邏輯與商業邏輯)
    │   ├── auth.js         # 登入狀態 (模擬登入/登出、使用者資訊)
    │   ├── inventory.js    # 食材與冰箱 (食材清單、冰箱隔層結構、預設期限、浪費金額計算)
    │   ├── shopping.js     # 購物清單 (新增、勾選、刪除)
    │   ├── recipe.js       # AI 食譜 (模擬資料庫、推薦演算法、收藏功能)
    │   ├── settings.js     # 系統設定 (提前提醒天數、通知開關)
    │   └── ui.js           # 介面狀態 (深色/淺色模式切換)
    │
    ├── components/         # 可重複使用的共用元件
    │   └── food/
    │       └── FoodForm.vue # 新增食材表單彈窗 (含自動帶入預設期限與單位)
    │
    └── views/              # 頁面級元件 (對應路由)
        ├── LoginView.vue        # 登入頁
        ├── HomeView.vue         # 首頁儀表板 (統計卡片、即將到期食材、骨架屏)
        ├── InventoryListView.vue# 食材管理 (表格列表、吃完/丟棄功能、接收搜尋參數)
        ├── FridgeView.vue       # 冰箱視圖 (視覺化冰箱、HTML5 拖曳功能)
        ├── ShoppingListView.vue # 購物清單
        ├── RecipeView.vue       # AI 食譜推薦 (匹配度計算、收藏、一鍵扣庫存/加購物車)
        ├── AnalyticsView.vue    # 分析報表 (浪費金額估算、健康比例、ECharts 價格趨勢圖)
        └── SettingsView.vue     # 系統設定 (調整提醒天數與開關)

==================================================
【三、 開發注意事項】
==================================================
1. 顏色與樣式：請盡量使用 Element Plus 的 CSS 變數 (例如 var(--el-text-color-primary)、var(--el-bg-color))，這樣深色與淺色模式才能自動切換。
2. 圖示 (Icons)：專案已在 main.js 全域註冊，可以直接使用 <el-icon><Dish /></el-icon> 等標籤。
3. 新頁面新增：在 views/ 建立 .vue 檔後，記得去 router/index.js 註冊路由，並在 DefaultLayout.vue 的側邊選單加入連結。
4. 資料儲存：目前登入狀態與深淺色模式使用 localStorage 儲存，重整頁面不會消失。