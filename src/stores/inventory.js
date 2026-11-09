import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { useSettingsStore } from './settings'
import { useAuthStore } from './auth'
import { useNotificationStore } from './notification'

const defaultFoodDatabase = {
  '雞蛋': { category: '蛋類', unit: '顆', daysFridge: 21, daysFreezer: 90, daysAfterOpened: 14, nutrition: { calories: 70, protein: 6, carbs: 1, fat: 5, fiber: 0 } },
  '牛奶': { category: '乳製品', unit: '瓶', daysFridge: 7, daysFreezer: 30, daysAfterOpened: 3, nutrition: { calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0 } },
  '高麗菜': { category: '蔬菜', unit: '顆', daysFridge: 14, daysFreezer: 0, daysAfterOpened: 5, nutrition: { calories: 50, protein: 2, carbs: 10, fat: 0, fiber: 4 } },
  '豬絞肉': { category: '肉類', unit: '克', daysFridge: 1, daysFreezer: 90, daysAfterOpened: 1, nutrition: { calories: 250, protein: 20, carbs: 0, fat: 18, fiber: 0 } },
  '豆腐': { category: '其他', unit: '盒', daysFridge: 5, daysFreezer: 0, daysAfterOpened: 2, nutrition: { calories: 80, protein: 8, carbs: 2, fat: 4, fiber: 1 } },
  '番茄': { category: '蔬菜', unit: '顆', daysFridge: 7, daysFreezer: 0, daysAfterOpened: 4, nutrition: { calories: 20, protein: 1, carbs: 4, fat: 0, fiber: 1 } },
}

export const foodDatabase = reactive({ ...defaultFoodDatabase })

export const useInventoryStore = defineStore('inventory', () => {
  const settings = useSettingsStore()
  const authStore = useAuthStore()
  const notificationStore = useNotificationStore()

  const customFoods = ref(JSON.parse(localStorage.getItem('customFoods')) || [])
  customFoods.value.forEach(food => {
    foodDatabase[food.name] = { ...food, isCustom: true }
  })

  // 1. 從 localStorage 讀取初始資料，如果沒有才用預設值
  const initialFoods = JSON.parse(localStorage.getItem('foods'))
  const foods = ref(initialFoods || [
    { id: 1, name: '牛奶', category: '乳製品', quantity: 1, unit: '瓶', price: 85, zone: 'cold', shelf: 'A1', expiry: '2026-10-18', status: 'normal', discardQuantity: 0, addedBy: '測試使用者', isOpened: false, openedExpiry: '', deletedAt: null },
    { id: 2, name: '雞蛋', category: '蛋類', quantity: 6, unit: '顆', price: 60, zone: 'cold', shelf: 'A1', expiry: '2026-10-25', status: 'normal', discardQuantity: 0, addedBy: '測試使用者', isOpened: false, openedExpiry: '', deletedAt: null },
    { id: 3, name: '高麗菜', category: '蔬菜', quantity: 1, unit: '顆', price: 40, zone: 'cold', shelf: 'A2', expiry: '2026-10-30', status: 'normal', discardQuantity: 0, addedBy: '測試使用者', isOpened: false, openedExpiry: '', deletedAt: null },
    { id: 4, name: '豬絞肉', category: '肉類', quantity: 500, unit: '克', price: 120, zone: 'freezer', shelf: 'B1', expiry: '2027-01-15', status: 'normal', discardQuantity: 0, addedBy: '測試使用者', isOpened: false, openedExpiry: '', deletedAt: null },
    { id: 5, name: '番茄', category: '蔬菜', quantity: 1, unit: '盒', price: 50, zone: 'cold', shelf: 'A2', expiry: '2026-10-10', status: 'discarded', discardQuantity: 1, addedBy: '測試使用者', isOpened: false, openedExpiry: '', deletedAt: null },
  ])

  const priceHistory = ref([
    { foodName: '牛奶', unit: '瓶', price: 85, date: '2026-09-01' },
    { foodName: '牛奶', unit: '瓶', price: 90, date: '2026-09-15' },
    { foodName: '牛奶', unit: '瓶', price: 85, date: '2026-10-01' },
    { foodName: '雞蛋', unit: '顆', price: 8, date: '2026-09-10' },
    { foodName: '雞蛋', unit: '顆', price: 10, date: '2026-10-01' },
  ])

  // 2. 新增儲存函式
  function saveFoods() {
    localStorage.setItem('foods', JSON.stringify(foods.value))
  }

  function cleanupTrash() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const beforeLength = foods.value.length
    foods.value = foods.value.filter(f => {
      if (f.status === 'deleted' && f.deletedAt) {
        return new Date(f.deletedAt) > thirtyDaysAgo
      }
      return true
    })
    if (foods.value.length !== beforeLength) saveFoods()
  }
  cleanupTrash()

  const deletedFoods = computed(() => foods.value.filter(f => f.status === 'deleted'))

  function addFood(food) {
    const newId = foods.value.length ? Math.max(...foods.value.map((f) => f.id)) + 1 : 1
    const currentUserName = authStore.user?.name || '家庭成員'

    foods.value.push({ 
      ...food, 
      id: newId, 
      status: 'normal', 
      discardQuantity: 0,
      addedBy: currentUserName,
      isOpened: food.isOpened || false,
      openedExpiry: food.openedExpiry || '',
      deletedAt: null
    })
    
    priceHistory.value.push({ 
      foodName: food.name, 
      unit: food.unit, 
      price: food.price, 
      date: new Date().toISOString().split('T')[0] 
    })

    saveFoods() // 🌟 儲存
    notificationStore.notifyFoodAdded(food.name, currentUserName)
  }

  function markAsEaten(id) {
    const item = foods.value.find((f) => f.id === id)
    if (item) {
      item.status = 'eaten'
      saveFoods() // 🌟 儲存
      notificationStore.notifyFoodEaten(item.name, authStore.user?.name || '家庭成員')
    }
  }

  function markAsDiscarded(id, discardQty) {
    const item = foods.value.find((f) => f.id === id)
    if (item) { 
      item.status = 'discarded'; 
      item.discardQuantity = discardQty 
      saveFoods() // 🌟 儲存
      notificationStore.notifyFoodDiscarded(item.name, authStore.user?.name || '家庭成員', discardQty)
    }
  }

  function batchDelete(ids) { 
    const now = new Date().toISOString()
    foods.value.forEach(f => {
      if (ids.includes(f.id)) {
        f.status = 'deleted'
        f.deletedAt = now
      }
    })
    saveFoods() // 🌟 儲存
  }

  function restoreFood(id) {
    const item = foods.value.find(f => f.id === id)
    if (item && item.status === 'deleted') {
      item.status = 'normal'
      item.deletedAt = null
      saveFoods() // 🌟 儲存
    }
  }

  function permanentlyDelete(id) {
    foods.value = foods.value.filter(f => f.id !== id)
    saveFoods() // 🌟 儲存
  }

  function updateProgress(id, newQuantity) {
    const item = foods.value.find((f) => f.id === id)
    if (item) {
      item.quantity = newQuantity
      if (newQuantity === 0) item.status = 'eaten'
      saveFoods() // 🌟 儲存
      notificationStore.notifyFoodUpdated(item.name, authStore.user?.name || '家庭成員', '消耗進度')
    }
  }

  function moveFood(id, targetZone, targetShelf) {
    const item = foods.value.find((f) => f.id === id)
    if (item) { 
      item.zone = targetZone; 
      item.shelf = targetShelf 
      saveFoods() // 🌟 儲存
    }
  }

  function updateOpenStatus(id, isOpened, openedExpiry) {
    const item = foods.value.find((f) => f.id === id)
    if (item) {
      item.isOpened = isOpened
      item.openedExpiry = isOpened ? openedExpiry : ''
      saveFoods() // 🌟 儲存
    }
  }

  function addCustomFood(food) {
    if (foodDatabase[food.name]) {
      return { success: false, message: '此食材名稱已存在' }
    }
    const newFood = { ...food, isCustom: true }
    foodDatabase[food.name] = newFood
    customFoods.value.push(newFood)
    localStorage.setItem('customFoods', JSON.stringify(customFoods.value))
    return { success: true }
  }

  function removeCustomFood(foodName) {
    const inStock = activeFoods.value.some(f => f.name === foodName)
    delete foodDatabase[foodName]
    customFoods.value = customFoods.value.filter(f => f.name !== foodName)
    localStorage.setItem('customFoods', JSON.stringify(customFoods.value))
    return { success: true, inStock }
  }

  const activeFoods = computed(() => foods.value.filter(f => f.status === 'normal'))

  function getDaysLeft(expiry, isOpened = false, openedExpiry = '') {
    const targetDate = (isOpened && openedExpiry) ? openedExpiry : expiry
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exp = new Date(targetDate); exp.setHours(0, 0, 0, 0)
    return Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
  }

  function getStatus(food) {
    const diffDays = getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)
    if (diffDays < 0) return 'danger'
    return 'success'
  }

  function getStatusText(food) {
    const diffDays = getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)
    const prefix = (food.isOpened && food.openedExpiry) ? '已開封 ' : ''
    if (diffDays < 0) return `${prefix}已過期 ${Math.abs(diffDays)} 天`
    if (diffDays === 0) return `${prefix}今天到期`
    return `${prefix}剩 ${diffDays} 天`
  }

  const totalCount = computed(() => activeFoods.value.length)
  const expiredCount = computed(() => activeFoods.value.filter(f => getDaysLeft(f.expiry, f.isOpened, f.openedExpiry) < 0).length)
  const expiringSoonCount = computed(() => activeFoods.value.filter(f => { 
    const d = getDaysLeft(f.expiry, f.isOpened, f.openedExpiry); 
    return d >= 0 && d <= settings.reminderDays 
  }).length)
  
  const freshCount = computed(() => activeFoods.value.filter(f => getDaysLeft(f.expiry, f.isOpened, f.openedExpiry) > settings.reminderDays).length)
  
  const urgentFoods = computed(() => [...activeFoods.value]
    .filter(f => getDaysLeft(f.expiry, f.isOpened, f.openedExpiry) <= settings.reminderDays)
    .sort((a, b) => getDaysLeft(a.expiry, a.isOpened, a.openedExpiry) - getDaysLeft(b.expiry, b.isOpened, b.openedExpiry))
  )

  function getFoodsByShelf(zoneId, shelfId) { 
    return activeFoods.value.filter(f => f.zone === zoneId && f.shelf === shelfId) 
  }

  return {
    foods, priceHistory, customFoods, deletedFoods,
    addFood, markAsEaten, markAsDiscarded, batchDelete, updateProgress, moveFood,
    restoreFood, permanentlyDelete, updateOpenStatus,
    addCustomFood, removeCustomFood,
    activeFoods, getDaysLeft, getStatus, getStatusText, 
    totalCount, expiredCount, expiringSoonCount, freshCount, urgentFoods, getFoodsByShelf
  }
})