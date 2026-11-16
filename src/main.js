import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 🌟 必須引入 Element Plus 全量樣式，否則 ElMessage 等彈窗會失去定位！
import 'element-plus/dist/index.css'
// 引入 Element Plus 暗黑模式變數
import 'element-plus/theme-chalk/dark/css-vars.css'
// 引入全域樣式
import './assets/main.css'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 註冊所有 Element Plus 圖示
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 🌟 新增：全域錯誤處理（避免單一元件崩潰導致整個 SPA 白屏）
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Global Error]', err)
  console.warn('[Vue Global Error Info]', info)
  // 後續可在此處加入錯誤回報機制（例如 Sentry 或自訂 Toast）
}

app.use(createPinia())
app.use(router)

app.mount('#app')