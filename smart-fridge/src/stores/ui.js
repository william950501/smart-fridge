import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // 初始狀態從 localStorage 讀取
  const isDark = ref(localStorage.getItem('theme') === 'dark')

  // 切換主題
  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme()
  }

  // 將 class 掛載到 <html> 上
  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // 初始化時執行一次
  applyTheme()

  return { isDark, toggleTheme, applyTheme }
})