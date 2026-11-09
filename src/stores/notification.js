import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  // 初始通知資料
  const notifications = ref([
    {
      id: 1,
      type: 'system',
      title: '系統提醒',
      message: '歡迎使用冰智庫！記得定期檢查食材期限喔。',
      isRead: false,
      createdAt: new Date().toISOString(),
      icon: 'Bell'
    }
  ])

  // 取得未讀通知數量
  const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

  // 取得未讀的家庭動態數量
  const unreadFamilyCount = computed(() => notifications.value.filter(n => !n.isRead && n.type === 'family').length)

  // === 核心方法 ===

  // 新增一筆通知
  function addNotification(type, title, message, icon = 'Bell') {
    const newId = notifications.value.length ? Math.max(...notifications.value.map(n => n.id)) + 1 : 1
    
    notifications.value.unshift({
      id: newId,
      type, // 'system' | 'family'
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
      icon
    })
  }

  // 標記單筆為已讀
  function markAsRead(id) {
    const item = notifications.value.find(n => n.id === id)
    if (item) item.isRead = true
  }

  // 全部標記為已讀
  function markAllAsRead() {
    notifications.value.forEach(n => { n.isRead = true })
  }

  // 清空所有通知
  function clearAll() {
    notifications.value = []
  }

  // === 便捷方法 (供 inventory.js 呼叫) ===

  // 通知：有人新增了食材
  function notifyFoodAdded(foodName, userName) {
    addNotification(
      'family', 
      '家庭動態', 
      `${userName} 新增了「${foodName}」到冰箱`, 
      'Plus'
    )
  }

  // 通知：有人把食材吃完
  function notifyFoodEaten(foodName, userName) {
    addNotification(
      'family', 
      '家庭動態', 
      `${userName} 把「${foodName}」吃完了`, 
      'Check'
    )
  }

  // 通知：有人把食材丟棄
  function notifyFoodDiscarded(foodName, userName, quantity) {
    addNotification(
      'family', 
      '家庭動態', 
      `${userName} 丟棄了 ${quantity} 份「${foodName}」`, 
      'Delete'
    )
  }

  // 通知：有人修改了食材數量
  function notifyFoodUpdated(foodName, userName, action) {
    addNotification(
      'family', 
      '家庭動態', 
      `${userName} 更新了「${foodName}」的${action}`, 
      'Edit'
    )
  }

  return {
    notifications,
    unreadCount,
    unreadFamilyCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    notifyFoodAdded,
    notifyFoodEaten,
    notifyFoodDiscarded,
    notifyFoodUpdated
  }
})