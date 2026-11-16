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

5. 強制推送到 GitHub (若遇到衝突或需要覆蓋遠端時使用)：
   > git push -u origin main -f

ngrok http 80 --url https://roundness-aware-octagon.ngrok-free.dev
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
    ├── main.js             # 程式進入點 (初始化 Vue、Pinia、Router、圖示、深色模式變數)
    ├── App.vue             # 根元件 (放置 <router-view />)
    │
    ├── assets/             # 靜態資源
    │   └── main.css        # 全域樣式 (已清空預設樣式，並加入長輩模式 .elder-mode 放大規則)
    │
    ├── router/             # 路由設定
    │   └── index.js        # 定義所有頁面路徑，包含「未登入攔截」的守衛邏輯
    │
    ├── layouts/            # 版面配置
    │   └── DefaultLayout.vue # 主版面 (手風琴側邊選單、手機漢堡/底部導覽列、全域搜尋、通知抽屜、深淺色/長輩模式切換)
    │
    ├── stores/             # Pinia 狀態管理 (負責處理資料邏輯與商業邏輯)
    │   ├── auth.js         # 登入狀態 (模擬登入/登出、使用者資訊)
    │   ├── fridge.js       # 冰箱結構 (預設範本、隔層結構、自訂冰箱邏輯)
    │   ├── inventory.js    # 食材與庫存 (食材 CRUD、期限計算、回收桶、開封狀態)
    │   ├── analytics.js    # 數據分析 (浪費金額、庫存價值、營養素加總)
    │   ├── recipe.js       # AI 食譜 (15 道食譜庫、推薦演算法、過敏原過濾、一週菜單狀態)
    │   ├── shopping.js     # 購物清單 (新增、勾選、刪除)
    │   ├── family.js       # 家庭管理 (成員名單、邀請碼產生與驗證)
    │   ├── notification.js # 通知中心 (系統提醒、家庭動態紀錄)
    │   ├── settings.js     # 系統設定 (提醒天數、過敏原、飲食限制、口味偏好)
    │   └── ui.js           # 介面狀態 (深色/淺色模式切換、長輩友善模式開關)
    │
    ├── components/         # 可重複使用的共用元件
    │   ├── food/
    │   │   ├── FoodForm.vue         # 新增食材表單 (含自動帶入期限、AI 模擬相機辨識、位置建議)
    │   │   └── FoodDetailDialog.vue # 食品詳情彈窗 (編輯數量、開封日期、吃完、丟棄)
    │   └── notification/
    │       └── NotificationDrawer.vue # 右側滑出通知抽屜 (家庭動態、已讀功能)
    │
    └── views/              # 頁面級元件 (對應路由)
        ├── LoginView.vue        # 登入/註冊頁 (毛玻璃 UI、密碼 8 碼驗證)
        ├── HomeView.vue         # 首頁儀表板 (統計卡片、即將到期食材、骨架屏)
        ├── InventoryListView.vue# 食材管理 (Tabs 整合自訂食材、電腦表格/手機卡片、購買者標註)
        ├── FridgeView.vue       # 冰箱視圖 (視覺化冰箱、HTML5 拖曳功能、手機門邊抽屜)
        ├── RecipeView.vue       # AI 食譜推薦 (匹配度計算、過敏原半透明提示、收藏)
        ├── MealPlanView.vue     # 一週菜單規劃 (日曆式排版、一鍵 AI 排餐與加購)
        ├── DietaryView.vue      # 過敏與忌口設定 (獨立頁面、與 AI 食譜深度串接)
        ├── ShoppingListView.vue # 購物清單 (快速新增、已購買一鍵轉庫存)
        ├── ReminderView.vue     # 到期提醒中心 (過期/今日/即期分類、可直接看詳情)
        ├── AnalyticsView.vue    # 成本與浪費分析 (ECharts、雙 Tab 營養分析、健康採購建議)
        ├── FamilyView.vue       # 家庭管理 (邀請碼產生、成員權限、退出家庭)
        ├── ProfileView.vue      # 我的 (個人資訊、家庭狀態、快捷入口)
        ├── SettingsView.vue     # 系統設定 (調整提醒天數、長輩模式開關)
        └── TrashView.vue        # 回收桶 (30天保留、還原、永久刪除)


==================================================
【三、 開發注意事項】
==================================================
1. 顏色與樣式：請全面使用 Element Plus 的 CSS 變數 (例如 var(--el-text-color-primary)、var(--el-bg-color))，這樣深色與淺色模式才能自動切換。
2. 圖示 (Icons)：專案已在 main.js 全域註冊，可以直接使用 <el-icon><Dish /></el-icon> 等標籤，無需在每個檔案 import。
3. 彈窗規範：請統一使用 <el-dialog class="custom-app-dialog"> 以維持全站彈窗 UI 的一致性，避免使用原生的 ElMessageBox。
4. 長輩模式：如需調整字體大小，請修改 main.css 中的 .elder-mode 變數，切勿在 Vue 元件中寫死固定的 font-size。
5. 新頁面新增：在 views/ 建立 .vue 檔後，記得去 router/index.js 註冊路由，並在 DefaultLayout.vue 的側邊選單與手機選單加入連結。
6. 資料儲存：目前登入狀態、深淺色模式、長輩模式、冰箱結構、自訂食材、家庭成員、通知與回收桶皆使用 localStorage 儲存，重整頁面不會消失。