import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const reminderDays = ref(Number(localStorage.getItem('reminderDays')) || 3)
  const notifyStation = ref(localStorage.getItem('notifyStation') !== 'false')
  const notifyLine = ref(localStorage.getItem('notifyLine') === 'true')

  // 新增：個人化設定
  const allergies = ref(JSON.parse(localStorage.getItem('allergies')) || [])
  const dietaryRestrictions = ref(JSON.parse(localStorage.getItem('dietaryRestrictions')) || [])
  const tastePreferences = ref(JSON.parse(localStorage.getItem('tastePreferences')) || [])

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

  return { 
    reminderDays, notifyStation, notifyLine, 
    allergies, dietaryRestrictions, tastePreferences,
    updateSettings, updateProfileSettings 
  }
})