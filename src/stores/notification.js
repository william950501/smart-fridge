import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from './inventory'
import { useSettingsStore } from './settings'

export const useNotificationStore = defineStore('notification', () => {
  // =========================================
  // 1. 狀態初始化與持久化
  // =========================================
  const savedNotifications = JSON.parse(localStorage.getItem('appNotifications'))
  
  const notifications = ref(savedNotifications || [
    {
      id: 1,
      type: 'system',
      title: '歡迎使用鮮知',
      message: '記得定期檢查食材期限，減少浪費從今天開始。',
      isRead: false,
      createdAt: new Date().toISOString(),
      icon: 'Bell'
    }
  ])

  function saveNotifications() {
    localStorage.setItem('appNotifications', JSON.stringify(notifications.value))
  }

  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)
  const unreadFamilyCount = computed(() => notifications.value.filter(n => !n.isRead && n.type === 'family').length)

  // =========================================
  // 2. 核心 Actions
  // =========================================
  
  function addNotification(type, title, message, icon = 'Bell') {
    const settingsStore = useSettingsStore()
    
    // 🌟 新增：如果使用者關閉了站內通知，則不推入
    if (!settingsStore.notifyStation) return

    const newId = notifications.value.length ? Math.max(...notifications.value.map(n => n.id)) + 1 : 1
    
    notifications.value.unshift({
      id: newId,
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
      icon
    })
    
    saveNotifications()
  }

  function markAsRead(id) {
    const item = notifications.value.find(n => n.id === id)
    if (item && !item.isRead) {
      item.isRead = true
      saveNotifications()
    }
  }

  function markAllAsRead() {
    notifications.value.forEach(n => { n.isRead = true })
    saveNotifications()
  }

  function clearAll() {
    notifications.value = []
    saveNotifications()
  }

  // =========================================
  // 3. 模擬後端排程：掃描即期食材
  // =========================================
  function generateDueReminders() {
    const inventoryStore = useInventoryStore()
    const settingsStore = useSettingsStore()

    // 如果關閉站內通知，就不掃描
    if (!settingsStore.notifyStation) return

    const dueFoods = inventoryStore.activeFoods.filter(f => {
      const days = inventoryStore.getDaysLeft(f.expiry, f.isOpened, f.openedExpiry)
      
      // 預留：未來可改為 settingsStore.getReminderDaysFor(f.category)
      // 目前先用全域的 reminderDays
      const thresholdDays = settingsStore.reminderDays
      
      return days <= thresholdDays
    })

    dueFoods.forEach(food => {
      const days = inventoryStore.getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)
      let statusText = ''
      if (days < 0) statusText = `已過期 ${Math.abs(days)} 天`
      else if (days === 0) statusText = '今天到期'
      else statusText = `只剩 ${days} 天`

      // 防重複：檢查最近 20 筆通知中是否已有該食材的未讀提醒
      const isDuplicate = notifications.value
        .slice(0, 20)
        .some(n => n.message.includes(food.name) && !n.isRead && n.title === '食材到期提醒')

      if (!isDuplicate) {
        addNotification(
          'system',
          '食材到期提醒',
          `您的「${food.name}」${statusText}，請盡快處理。`,
          'WarningFilled'
        )
      }
    })
  }

  // =========================================
  // 4. 便捷方法（供 inventory.js 呼叫）
  // =========================================
  function notifyFoodAdded(foodName, userName) {
    addNotification('family', '家庭動態', `${userName} 新增了「${foodName}」到冰箱`, 'Plus')
  }

  function notifyFoodEaten(foodName, userName) {
    addNotification('family', '家庭動態', `${userName} 把「${foodName}」吃完了`, 'Check')
  }

  function notifyFoodDiscarded(foodName, userName, quantity) {
    addNotification('family', '家庭動態', `${userName} 丟棄了 ${quantity} 份「${foodName}」`, 'Delete')
  }

  function notifyFoodUpdated(foodName, userName, action) {
    addNotification('family', '家庭動態', `${userName} 更新了「${foodName}」的${action}`, 'Edit')
  }

  return {
    notifications,
    unreadCount,
    unreadFamilyCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    generateDueReminders,
    notifyFoodAdded,
    notifyFoodEaten,
    notifyFoodDiscarded,
    notifyFoodUpdated
  }
})