import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 引入 Element Plus 暗黑模式變數
import 'element-plus/theme-chalk/dark/css-vars.css'
// 引入全域樣式
import './assets/main.css'

// 引入所有 Element Plus 圖示
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 全域註冊圖示
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)

app.mount('#app')