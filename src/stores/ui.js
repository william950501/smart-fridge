import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const isElderMode = ref(localStorage.getItem('elderMode') === 'true')
  const isSidebarExpanded = ref(localStorage.getItem('sidebarExpanded') === 'true')

  const savedDark = localStorage.getItem('darkMode')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = ref(savedDark !== null ? savedDark === 'true' : prefersDark)

  const savedThemeKey = localStorage.getItem('themeKey') || 'terracotta'
  const themeKey = ref(savedThemeKey)

  const savedCustomTheme = JSON.parse(localStorage.getItem('customTheme')) || {
    ground: '#F5F3EF',
    accent: '#C25D3A',
    ink: '#211F1C'
  }
  const customTheme = ref(savedCustomTheme)

  // =========================================
  // Actions
  // =========================================
  
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

  function toggleSidebar() {
    isSidebarExpanded.value = !isSidebarExpanded.value
    localStorage.setItem('sidebarExpanded', isSidebarExpanded.value.toString())
  }

  // 切換深色模式
  function toggleDark() {
    // 如果目前是「曜石黑」主題，點擊深色切換時，強制切換回預設的赤陶橙
    if (themeKey.value === 'obsidian') {
      setTheme('terracotta')
      return
    }

    isDark.value = !isDark.value
    applyDarkMode()
    
    if (themeKey.value === 'custom') {
      applyTheme()
    }
  }

  function applyDarkMode() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'false')
    }
  }

  // 切換主題
  function setTheme(key) {
    themeKey.value = key
    localStorage.setItem('themeKey', key)
    
    // 深色模式與主題的連動
    if (key === 'obsidian') {
      isDark.value = true
    } else {
      // 如果從曜石黑切走，或者切換到其他主題，預設恢復淺色模式
      isDark.value = false
    }
    
    applyDarkMode()
    applyTheme()
  }

  function updateCustomTheme(colors) {
    customTheme.value = { ...customTheme.value, ...colors }
    localStorage.setItem('customTheme', JSON.stringify(customTheme.value))
    if (themeKey.value === 'custom') {
      applyTheme()
    }
  }

  function applyTheme() {
    const root = document.documentElement
    
    // 1. 清除所有預設主題 class
    const presetThemes = [
      'theme-mist-blue', 'theme-dusty-rose', 'theme-emerald-tech',
      'theme-obsidian', 'theme-warm-amber'
    ]
    presetThemes.forEach(t => root.classList.remove(t))
    
    // 2. 清除自訂注入的 inline 變數
    const customVars = [
      '--ground', '--surface', '--surface-hover', '--ink', '--muted', '--border',
      '--accent', '--accent-hover', '--accent-light', '--el-color-primary'
    ]
    customVars.forEach(v => root.style.removeProperty(v))

    // 3. 套用預設主題
    if (themeKey.value !== 'terracotta' && themeKey.value !== 'custom') {
      root.classList.add(`theme-${themeKey.value}`)
      return
    }

    // 4. 套用自訂主題（動態注入）
    if (themeKey.value === 'custom') {
      const g = customTheme.value.ground
      const a = customTheme.value.accent
      const i = customTheme.value.ink
      
      // 如果是自訂且開啟深色模式，優先使用深色背景，但保留自訂強調色
      if (isDark.value) {
        root.style.setProperty('--accent', a)
        root.style.setProperty('--accent-hover', darken(a, 15))
        root.style.setProperty('--accent-light', rgba(a, 0.15))
        root.style.setProperty('--el-color-primary', a)
      } else {
        const isDarkGround = checkIsDark(g)
        root.style.setProperty('--ground', g)
        root.style.setProperty('--surface', isDarkGround ? lighten(g, 10) : lighten(g, 5))
        root.style.setProperty('--surface-hover', isDarkGround ? lighten(g, 15) : darken(g, 5))
        root.style.setProperty('--ink', i)
        root.style.setProperty('--muted', isDarkGround ? lighten(i, 40) : darken(i, 40))
        root.style.setProperty('--border', isDarkGround ? lighten(g, 20) : darken(g, 10))
        root.style.setProperty('--accent', a)
        root.style.setProperty('--accent-hover', darken(a, 15))
        root.style.setProperty('--accent-light', isDarkGround ? rgba(a, 0.15) : lighten(a, 85))
        root.style.setProperty('--el-color-primary', a)
      }
    }
  }

  // =========================================
  // 輔助顏色計算 (略，保持原樣)
  // =========================================
  function checkIsDark(hex) {
    if (!hex || hex.length < 7) return false
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma < 128
  }

  function lighten(hex, percent) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)))
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)))
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  function darken(hex, percent) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    r = Math.max(0, Math.floor(r * (1 - percent / 100)))
    g = Math.max(0, Math.floor(g * (1 - percent / 100)))
    b = Math.max(0, Math.floor(b * (1 - percent / 100)))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  function rgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // 初始化
  applyElderMode()
  applyDarkMode()
  applyTheme()

  return { 
    isElderMode, 
    toggleElderMode,
    isSidebarExpanded,
    toggleSidebar,
    isDark,
    toggleDark,
    themeKey,
    setTheme,
    customTheme,
    updateCustomTheme
  }
})