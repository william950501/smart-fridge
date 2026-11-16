import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import dayjs from 'dayjs'
import { useSettingsStore } from './settings'
import { useAuthStore } from './auth'
import { useNotificationStore } from './notification'
import { useFridgeStore } from './fridge'

// =========================================
// 食材資料庫（內建 16 種常見食材）
// =========================================
const defaultFoodDatabase = {
  '雞蛋': { category: '蛋類', unit: '顆', daysFridge: 21, daysFreezer: 90, daysAfterOpened: 14, nutrition: { calories: 70, protein: 6, carbs: 1, fat: 5, fiber: 0 } },
  '牛奶': { category: '乳製品', unit: '瓶', daysFridge: 7, daysFreezer: 30, daysAfterOpened: 3, nutrition: { calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0 } },
  '高麗菜': { category: '蔬菜', unit: '顆', daysFridge: 14, daysFreezer: 0, daysAfterOpened: 5, nutrition: { calories: 50, protein: 2, carbs: 10, fat: 0, fiber: 4 } },
  '豬絞肉': { category: '肉類', unit: '克', daysFridge: 1, daysFreezer: 90, daysAfterOpened: 1, nutrition: { calories: 250, protein: 20, carbs: 0, fat: 18, fiber: 0 } },
  '豆腐': { category: '其他', unit: '盒', daysFridge: 5, daysFreezer: 0, daysAfterOpened: 2, nutrition: { calories: 80, protein: 8, carbs: 2, fat: 4, fiber: 1 } },
  '番茄': { category: '蔬菜', unit: '顆', daysFridge: 7, daysFreezer: 0, daysAfterOpened: 4, nutrition: { calories: 20, protein: 1, carbs: 4, fat: 0, fiber: 1 } },
  '豬肉片': { category: '肉類', unit: '克', daysFridge: 2, daysFreezer: 90, daysAfterOpened: 1, nutrition: { calories: 200, protein: 18, carbs: 0, fat: 14, fiber: 0 } },
  '雞胸肉': { category: '肉類', unit: '塊', daysFridge: 2, daysFreezer: 90, daysAfterOpened: 1, nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 } },
  '鮭魚': { category: '海鮮', unit: '片', daysFridge: 2, daysFreezer: 60, daysAfterOpened: 1, nutrition: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 } },
  '菠菜': { category: '蔬菜', unit: '把', daysFridge: 5, daysFreezer: 0, daysAfterOpened: 3, nutrition: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 } },
  '蘋果': { category: '水果', unit: '顆', daysFridge: 30, daysFreezer: 0, daysAfterOpened: 7, nutrition: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 } },
  '香蕉': { category: '水果', unit: '根', daysFridge: 7, daysFreezer: 30, daysAfterOpened: 2, nutrition: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6 } },
  '吐司': { category: '其他', unit: '片', daysFridge: 7, daysFreezer: 30, daysAfterOpened: 3, nutrition: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 } },
  '優格': { category: '乳製品', unit: '杯', daysFridge: 14, daysFreezer: 0, daysAfterOpened: 3, nutrition: { calories: 100, protein: 5, carbs: 12, fat: 3, fiber: 0 } },
  '起司片': { category: '乳製品', unit: '片', daysFridge: 30, daysFreezer: 0, daysAfterOpened: 14, nutrition: { calories: 70, protein: 4, carbs: 1, fat: 5, fiber: 0 } },
  '洋蔥': { category: '蔬菜', unit: '顆', daysFridge: 30, daysFreezer: 0, daysAfterOpened: 10, nutrition: { calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7 } },
}

export const foodDatabase = reactive({ ...defaultFoodDatabase })

export const useInventoryStore = defineStore('inventory', () => {
  const settings = useSettingsStore()
  const authStore = useAuthStore()
  const notificationStore = useNotificationStore()

  // =========================================
  // 自訂食材載入
  // =========================================
  const customFoods = ref(JSON.parse(localStorage.getItem('customFoods')) || [])
  customFoods.value.forEach(food => {
    foodDatabase[food.name] = { ...food, isCustom: true }
  })

  // =========================================
  // 初始庫存資料
  // =========================================
  const initialFoods = JSON.parse(localStorage.getItem('foods'))
  const foods = ref(initialFoods || [
    { id: 1, name: '牛奶', category: '乳製品', quantity: 1, originalQuantity: 1, unit: '瓶', price: 85, unitPrice: 85, zone: 'cold', shelf: 'A1', expiry: '2026-10-18', status: 'normal', discardedQuantity: 0, addedBy: '測試使用者', isOpened: false, openedAt: '', openedExpiry: '', deletedAt: null, note: '記得這週末前喝完', moveHistory: [] },
    { id: 2, name: '雞蛋', category: '蛋類', quantity: 6, originalQuantity: 6, unit: '顆', price: 60, unitPrice: 10, zone: 'cold', shelf: 'A1', expiry: '2026-10-25', status: 'normal', discardedQuantity: 0, addedBy: '測試使用者', isOpened: false, openedAt: '', openedExpiry: '', deletedAt: null, note: '', moveHistory: [] },
    { id: 3, name: '高麗菜', category: '蔬菜', quantity: 1, originalQuantity: 1, unit: '顆', price: 40, unitPrice: 40, zone: 'cold', shelf: 'A2', expiry: '2026-10-30', status: 'normal', discardedQuantity: 0, addedBy: '測試使用者', isOpened: false, openedAt: '', openedExpiry: '', deletedAt: null, note: '媽媽買的', moveHistory: [] },
    { id: 4, name: '豬絞肉', category: '肉類', quantity: 500, originalQuantity: 500, unit: '克', price: 120, unitPrice: 0.24, zone: 'freezer', shelf: 'B1', expiry: '2027-01-15', status: 'normal', discardedQuantity: 0, addedBy: '測試使用者', isOpened: false, openedAt: '', openedExpiry: '', deletedAt: null, note: '', moveHistory: [] },
    { id: 5, name: '番茄', category: '蔬菜', quantity: 1, originalQuantity: 1, unit: '盒', price: 50, unitPrice: 50, zone: 'cold', shelf: 'A2', expiry: '2026-10-10', status: 'discarded', discardedQuantity: 1, addedBy: '測試使用者', isOpened: false, openedAt: '', openedExpiry: '', deletedAt: '2026-10-11T10:00:00.000Z', note: '', moveHistory: [] },
  ])

  // 兼容舊資料
  foods.value.forEach(f => {
    if (f.originalQuantity === undefined) f.originalQuantity = f.quantity || 1
    if (f.unitPrice === undefined) f.unitPrice = f.price && f.originalQuantity ? f.price / f.originalQuantity : 0
    if (f.discardedQuantity === undefined) f.discardedQuantity = f.discardQuantity || 0
    if (f.openedAt === undefined) f.openedAt = ''
    if (f.moveHistory === undefined) f.moveHistory = [] // 🌟 新增：兼容舊資料
    delete f.discardQuantity
  })

  const priceHistory = ref([
    { foodName: '牛奶', unit: '瓶', price: 85, date: '2026-09-01' },
    { foodName: '牛奶', unit: '瓶', price: 90, date: '2026-09-15' },
    { foodName: '牛奶', unit: '瓶', price: 85, date: '2026-10-01' },
    { foodName: '雞蛋', unit: '顆', price: 8, date: '2026-09-10' },
    { foodName: '雞蛋', unit: '顆', price: 10, date: '2026-10-01' },
  ])

  // =========================================
  // 內部工具
  // =========================================
  function saveFoods() {
    localStorage.setItem('foods', JSON.stringify(foods.value))
  }

  function cleanupTrash() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const beforeLength = foods.value.length
    foods.value = foods.value.filter(f => {
      if ((f.status === 'deleted' || f.status === 'discarded') && f.deletedAt) {
        return new Date(f.deletedAt) > thirtyDaysAgo
      }
      return true
    })
    if (foods.value.length !== beforeLength) saveFoods()
  }
  cleanupTrash()

  const deletedFoods = computed(() => foods.value.filter(f => f.status === 'deleted' || f.status === 'discarded'))

  // =========================================
  // 🌟 新增：尋找重複食材（供 UI 呼叫）
  // =========================================
  function findDuplicateFood(name) {
    if (!name) return null
    return activeFoods.value.find(f => f.name === name) || null
  }

  // =========================================
  // CRUD：新增 / 吃完 / 丟棄 / 刪除 / 還原
  // =========================================

  function addFood(food) {
    const newId = foods.value.length ? Math.max(...foods.value.map((f) => f.id)) + 1 : 1
    const currentUserName = authStore.user?.name || '家庭成員'
    const qty = Number(food.quantity) || 1
    const price = Number(food.price) || 0

    foods.value.push({
      ...food,
      id: newId,
      status: 'normal',
      originalQuantity: qty,
      unitPrice: price > 0 ? price / qty : 0,
      discardedQuantity: 0,
      addedBy: currentUserName,
      isOpened: food.isOpened || false,
      openedAt: food.isOpened ? new Date().toISOString() : '',
      openedExpiry: food.openedExpiry || '',
      deletedAt: null,
      note: food.note || '',
      moveHistory: [] // 🌟 初始化移動歷程
    })

    if (price > 0) {
      priceHistory.value.push({
        foodName: food.name,
        unit: food.unit,
        price: price,
        date: new Date().toISOString().split('T')[0]
      })
    }

    saveFoods()
    notificationStore.notifyFoodAdded(food.name, currentUserName)
  }

  function markAsEaten(id) {
    const item = foods.value.find((f) => f.id === id)
    if (item) {
      item.status = 'eaten'
      saveFoods()
      notificationStore.notifyFoodEaten(item.name, authStore.user?.name || '家庭成員')
    }
  }

  function markAsDiscarded(id, discardQty) {
    const item = foods.value.find((f) => f.id === id)
    if (!item) return

    const qty = Math.min(Math.max(1, Number(discardQty) || 1), item.quantity)

    if (qty < item.quantity) {
      item.quantity -= qty
      item.discardedQuantity = (item.discardedQuantity || 0) + qty
    } else {
      item.discardedQuantity = (item.discardedQuantity || 0) + item.quantity
      item.quantity = 0
      item.status = 'discarded'
      item.deletedAt = new Date().toISOString()
    }

    saveFoods()
    notificationStore.notifyFoodDiscarded(item.name, authStore.user?.name || '家庭成員', qty)
  }

  function batchDelete(ids) {
    const now = new Date().toISOString()
    foods.value.forEach(f => {
      if (ids.includes(f.id)) {
        f.status = 'deleted'
        f.deletedAt = now
      }
    })
    saveFoods()
  }

  function restoreFood(id) {
    const item = foods.value.find(f => f.id === id)
    if (item && (item.status === 'deleted' || item.status === 'discarded')) {
      item.status = 'normal'
      item.deletedAt = null
      if (item.quantity === 0) {
        item.quantity = 1
      }
      item.discardedQuantity = 0
      saveFoods()
    }
  }

  function permanentlyDelete(id) {
    foods.value = foods.value.filter(f => f.id !== id)
    saveFoods()
  }

  function updateProgress(id, newQuantity) {
    const item = foods.value.find((f) => f.id === id)
    if (item) {
      item.quantity = newQuantity
      if (newQuantity === 0) item.status = 'eaten'
      saveFoods()
      notificationStore.notifyFoodUpdated(item.name, authStore.user?.name || '家庭成員', '消耗進度')
    }
  }

  // =========================================
  // 🌟 移動位置（加入歷史紀錄）
  // =========================================

  function moveFood(id, targetZone, targetShelf) {
    const item = foods.value.find((f) => f.id === id)
    if (!item) return

    const oldZone = item.zone || ''
    const oldShelf = item.shelf || ''
    
    item.zone = targetZone
    item.shelf = targetShelf

    // 記錄移動歷史（只有位置真的有變更時才記錄）
    if (oldZone !== targetZone || oldShelf !== targetShelf) {
      const fridge = useFridgeStore()
      const fromZoneName = fridge.fridgeStructure.find(z => z.id === oldZone)?.name || '未指定'
      const toZoneName = fridge.fridgeStructure.find(z => z.id === targetZone)?.name || '未指定'
      const fromShelfName = fridge.fridgeStructure.find(z => z.id === oldZone)?.shelves.find(s => s.id === oldShelf)?.name || ''
      const toShelfName = fridge.fridgeStructure.find(z => z.id === targetZone)?.shelves.find(s => s.id === targetShelf)?.name || ''
      
      if (!item.moveHistory) item.moveHistory = []
      item.moveHistory.push({
        date: new Date().toISOString(),
        from: `${fromZoneName} ${fromShelfName}`.trim(),
        to: `${toZoneName} ${toShelfName}`.trim(),
        note: '移動位置'
      })
    }
    saveFoods()
  }

  function moveFoodWithExpiry(id, targetZone, targetShelf, newExpiry) {
    const item = foods.value.find((f) => f.id === id)
    if (!item) return
    
    const oldZone = item.zone || ''
    const oldShelf = item.shelf || ''
    const oldExpiry = item.expiry || ''
    
    item.zone = targetZone
    item.shelf = targetShelf
    if (newExpiry) item.expiry = newExpiry
    
    if (oldZone !== targetZone || oldShelf !== targetShelf || oldExpiry !== newExpiry) {
      const fridge = useFridgeStore()
      const fromZoneName = fridge.fridgeStructure.find(z => z.id === oldZone)?.name || '未指定'
      const toZoneName = fridge.fridgeStructure.find(z => z.id === targetZone)?.name || '未指定'
      const fromShelfName = fridge.fridgeStructure.find(z => z.id === oldZone)?.shelves.find(s => s.id === oldShelf)?.name || ''
      const toShelfName = fridge.fridgeStructure.find(z => z.id === targetZone)?.shelves.find(s => s.id === targetShelf)?.name || ''
      
      if (!item.moveHistory) item.moveHistory = []
      
      let note = '移動位置'
      if (oldExpiry !== newExpiry) {
        note = `移動位置並調整期限 (${oldExpiry} → ${newExpiry})`
      }
      
      item.moveHistory.push({
        date: new Date().toISOString(),
        from: `${fromZoneName} ${fromShelfName}`.trim(),
        to: `${toZoneName} ${toShelfName}`.trim(),
        note: note
      })
    }
    saveFoods()
  }

  // 🌟 批次移動位置
  function batchUpdateLocation(ids, targetZone, targetShelf) {
    const fridge = useFridgeStore()
    const toZoneName = fridge.fridgeStructure.find(z => z.id === targetZone)?.name || '未指定'
    const toShelfName = fridge.fridgeStructure.find(z => z.id === targetZone)?.shelves.find(s => s.id === targetShelf)?.name || ''

    foods.value.forEach(f => {
      if (ids.includes(f.id) && f.status === 'normal') {
        const oldZone = f.zone || ''
        const oldShelf = f.shelf || ''
        
        f.zone = targetZone
        f.shelf = targetShelf

        if (oldZone !== targetZone || oldShelf !== targetShelf) {
          const fromZoneName = fridge.fridgeStructure.find(z => z.id === oldZone)?.name || '未指定'
          const fromShelfName = fridge.fridgeStructure.find(z => z.id === oldZone)?.shelves.find(s => s.id === oldShelf)?.name || ''
          
          if (!f.moveHistory) f.moveHistory = []
          f.moveHistory.push({
            date: new Date().toISOString(),
            from: `${fromZoneName} ${fromShelfName}`.trim(),
            to: `${toZoneName} ${toShelfName}`.trim(),
            note: '批次移動位置'
          })
        }
      }
    })
    saveFoods()
  }

  // =========================================
  // 刪除隔層 / 區域時，食品變「未指定位置」
  // =========================================

  function unassignFoodsInShelf(zoneId, shelfId) {
    const affected = foods.value.filter(f => f.zone === zoneId && f.shelf === shelfId && f.status === 'normal')
    affected.forEach(f => { 
      f.shelf = '' 
      if (!f.moveHistory) f.moveHistory = []
      f.moveHistory.push({
        date: new Date().toISOString(),
        from: '原存放層架',
        to: '未指定位置',
        note: '層架已刪除'
      })
    })
    saveFoods()
    return affected.length
  }

  function unassignFoodsInZone(zoneId) {
    const affected = foods.value.filter(f => f.zone === zoneId && f.status === 'normal')
    affected.forEach(f => { 
      f.zone = ''; 
      f.shelf = ''
      if (!f.moveHistory) f.moveHistory = []
      f.moveHistory.push({
        date: new Date().toISOString(),
        from: '原存放區域',
        to: '未指定位置',
        note: '區域已刪除'
      })
    })
    saveFoods()
    return affected.length
  }

  // =========================================
  // 開封狀態
  // =========================================

  function updateOpenStatus(id, isOpened, openedExpiry) {
    const item = foods.value.find((f) => f.id === id)
    if (!item) return
    const wasOpened = item.isOpened
    item.isOpened = isOpened
    item.openedExpiry = isOpened ? openedExpiry : ''
    if (isOpened && !wasOpened && !item.openedAt) {
      item.openedAt = new Date().toISOString()
    }
    if (!isOpened) {
      item.openedAt = ''
    }
    saveFoods()
  }

  // =========================================
  // 自訂食材字典
  // =========================================

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
    if (!inStock) {
      delete foodDatabase[foodName]
    }
    customFoods.value = customFoods.value.filter(f => f.name !== foodName)
    localStorage.setItem('customFoods', JSON.stringify(customFoods.value))
    return { success: true, inStock }
  }

  // =========================================
  // 智慧推薦
  // =========================================

  function getRecommendedExpiry(foodName, targetZoneId, fromDate = dayjs()) {
    const dbItem = foodDatabase[foodName]
    if (!dbItem) return null

    const fridge = useFridgeStore()
    const zone = fridge.fridgeStructure.find(z => z.id === targetZoneId)
    if (!zone) return null

    const isFreezer = zone.name.includes('冷凍')
    const days = isFreezer ? dbItem.daysFreezer : dbItem.daysFridge
    if (!days || days <= 0) return null

    return dayjs(fromDate).add(days, 'day').format('YYYY-MM-DD')
  }

  function isFreezerZone(zoneId) {
    const fridge = useFridgeStore()
    const zone = fridge.fridgeStructure.find(z => z.id === zoneId)
    return zone ? zone.name.includes('冷凍') : false
  }

  function getDisplayExpiry(food) {
    if (!food) return ''
    return (food.isOpened && food.openedExpiry) ? food.openedExpiry : food.expiry
  }

  // =========================================
  // Computed
  // =========================================

  const activeFoods = computed(() => foods.value.filter(f => f.status === 'normal'))

  function getDaysLeft(expiry, isOpened = false, openedExpiry = '') {
    const targetDate = (isOpened && openedExpiry) ? openedExpiry : expiry
    if (!targetDate) return 9999
    
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exp = new Date(targetDate); exp.setHours(0, 0, 0, 0)
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
    
    return isNaN(diff) ? 9999 : diff
  }

  function getStatus(food) {
    const diffDays = getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)
    if (diffDays < 0) return 'danger'
    
    const threshold = settings.getReminderDaysFor ? settings.getReminderDaysFor(food.category) : settings.reminderDays
    if (diffDays <= threshold) return 'warning'
    
    return 'success'
  }

  function getStatusText(food) {
    const diffDays = getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)
    const prefix = (food.isOpened && food.openedExpiry) ? '已開封 ' : ''
    
    if (diffDays < 0) return `${prefix}已過期 ${Math.abs(diffDays)} 天`
    if (diffDays === 0) return `${prefix}今天到期`
    if (diffDays === 9999) return '無期限'
    return `${prefix}剩 ${diffDays} 天`
  }

  const totalCount = computed(() => activeFoods.value.length)

  const expiredCount = computed(() =>
    activeFoods.value.filter(f => getDaysLeft(f.expiry, f.isOpened, f.openedExpiry) < 0).length
  )

  const expiringSoonCount = computed(() =>
    activeFoods.value.filter(f => {
      const d = getDaysLeft(f.expiry, f.isOpened, f.openedExpiry)
      const threshold = settings.getReminderDaysFor ? settings.getReminderDaysFor(f.category) : settings.reminderDays
      return d >= 0 && d <= threshold
    }).length
  )

  const freshCount = computed(() =>
    activeFoods.value.filter(f => {
      const d = getDaysLeft(f.expiry, f.isOpened, f.openedExpiry)
      const threshold = settings.getReminderDaysFor ? settings.getReminderDaysFor(f.category) : settings.reminderDays
      return d > threshold
    }).length
  )

  const urgentFoods = computed(() =>
    [...activeFoods.value]
      .filter(f => {
        const d = getDaysLeft(f.expiry, f.isOpened, f.openedExpiry)
        const threshold = settings.getReminderDaysFor ? settings.getReminderDaysFor(f.category) : settings.reminderDays
        return d <= threshold
      })
      .sort((a, b) => getDaysLeft(a.expiry, a.isOpened, a.openedExpiry) - getDaysLeft(b.expiry, b.isOpened, b.openedExpiry))
  )

  function getFoodsByShelf(zoneId, shelfId) {
    return activeFoods.value.filter(f => f.zone === zoneId && f.shelf === shelfId)
  }

  return {
    foods, priceHistory, customFoods, deletedFoods,
    addFood, markAsEaten, markAsDiscarded, batchDelete, updateProgress,
    moveFood, moveFoodWithExpiry, batchUpdateLocation,
    unassignFoodsInShelf, unassignFoodsInZone,
    restoreFood, permanentlyDelete, updateOpenStatus,
    addCustomFood, removeCustomFood,
    getRecommendedExpiry, isFreezerZone,
    getDisplayExpiry,
    findDuplicateFood,
    activeFoods, getDaysLeft, getStatus, getStatusText,
    totalCount, expiredCount, expiringSoonCount, freshCount, urgentFoods, getFoodsByShelf
  }
})