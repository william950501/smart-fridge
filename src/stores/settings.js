import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // =========================================
  // 1. 狀態初始化（含 localStorage）
  // =========================================
  
  // 依 PDF 問卷結果，預設提前 2 天
  const reminderDays = ref(Number(localStorage.getItem('reminderDays')) || 2)
  
  const notifyStation = ref(localStorage.getItem('notifyStation') !== 'false')
  const notifyLine = ref(localStorage.getItem('notifyLine') === 'true')

  // 個人化設定
  const allergies = ref(JSON.parse(localStorage.getItem('allergies')) || [])
  const dietaryRestrictions = ref(JSON.parse(localStorage.getItem('dietaryRestrictions')) || [])
  const tastePreferences = ref(JSON.parse(localStorage.getItem('tastePreferences')) || [])

  // 🌟 新增：類別化提醒天數（Category-specific reminder days）
  // 預設值可依使用習慣調整，這裡給定符合 PDF 需求的初始值
  const defaultCategoryDays = {
    '肉類': 1,
    '海鮮': 1,
    '乳製品': 3,
    '蛋類': 5,
    '蔬菜': 3,
    '水果': 4,
    '飲品': 3,
    '調味料': 7,
    '其他': 2
  }
  const categoryReminderDays = ref(
    JSON.parse(localStorage.getItem('categoryReminderDays')) || defaultCategoryDays
  )

  // =========================================
  // 2. 核心 Actions
  // =========================================

  function updateSettings(days, station, line) {
    reminderDays.value = days
    notifyStation.value = station
    notifyLine.value = line
    localStorage.setItem('reminderDays', days)
    localStorage.setItem('notifyStation', station)
    localStorage.setItem('notifyLine', line)
  }

  function updateProfileSettings(newAllergies, newDiet, newTaste) {
    allergies.value = newAllergies
    dietaryRestrictions.value = newDiet
    tastePreferences.value = newTaste
    
    localStorage.setItem('allergies', JSON.stringify(newAllergies))
    localStorage.setItem('dietaryRestrictions', JSON.stringify(newDiet))
    localStorage.setItem('tastePreferences', JSON.stringify(newTaste))
  }

  // 🌟 新增：更新單一類別的提醒天數
  function updateCategoryReminderDays(category, days) {
    categoryReminderDays.value[category] = Number(days)
    localStorage.setItem('categoryReminderDays', JSON.stringify(categoryReminderDays.value))
  }

  // =========================================
  // 3. Computed & Getters
  // =========================================

  // 🌟 新增：根據食材類別取得專屬提醒天數
  // 若無該類別設定，則回退到全域的 reminderDays
  function getReminderDaysFor(category) {
    if (category && categoryReminderDays.value[category] !== undefined) {
      return categoryReminderDays.value[category]
    }
    return reminderDays.value
  }

  return { 
    reminderDays, 
    notifyStation, 
    notifyLine, 
    allergies, 
    dietaryRestrictions, 
    tastePreferences,
    categoryReminderDays,
    updateSettings, 
    updateProfileSettings,
    updateCategoryReminderDays,
    getReminderDaysFor
  }
})