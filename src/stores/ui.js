import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // 深色模式狀態
  const isDark = ref(localStorage.getItem('theme') === 'dark')
  // 長輩模式狀態
  const isElderMode = ref(localStorage.getItem('elderMode') === 'true')

  // --- 深色模式切換 ---
  function toggleTheme() {
    isDark.value = !isDark.value
    applyTheme()
  }

  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // --- 長輩模式切換 ---
  function toggleElderMode() {
    isElderMode.value = !isElderMode.value
    applyElderMode()
  }

  function applyElderMode() {
    if (isElderMode.value) {
      document.documentElement.classList.add('elder-mode')
      localStorage.setItem('elderMode', 'true')
    } else {
      document.documentElement.classList.remove('elder-mode')
      localStorage.setItem('elderMode', 'false')
    }
  }

  // 初始化時執行一次，確保重整後狀態正確
  applyTheme()
  applyElderMode()

  return { 
    isDark, 
    isElderMode, 
    toggleTheme, 
    toggleElderMode 
  }
})