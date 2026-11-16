import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore, foodDatabase } from './inventory'

export const useShoppingStore = defineStore('shopping', () => {
  // =========================================
  // 1. 狀態初始化
  // =========================================
  const savedItems = localStorage.getItem('shoppingItems')
  const items = ref(savedItems ? JSON.parse(savedItems) : [
    { id: 1, name: '鮮奶', quantity: 2, unit: '瓶', unitPrice: 85, isPurchased: false, addedBy: '我' },
    { id: 2, name: '雞蛋', quantity: 1, unit: '盒', unitPrice: 60, isPurchased: true, addedBy: '媽媽' },
    { id: 3, name: '高麗菜', quantity: 1, unit: '顆', unitPrice: 40, isPurchased: false, addedBy: '爸爸' },
  ])

  // 🌟 新增：剛加入的品項 ID 陣列（用於 UI 高亮提示）
  const recentlyAddedIds = ref([])
  let recentTimer = null

  // =========================================
  // 2. 持久化工具
  // =========================================
  function saveItems() {
    localStorage.setItem('shoppingItems', JSON.stringify(items.value))
  }

  // =========================================
  // 3. 核心 Actions
  // =========================================
  function addItem(item, isFromExternal = false) {
    const newId = items.value.length ? Math.max(...items.value.map(i => i.id)) + 1 : 1
    
    items.value.push({
      ...item,
      id: newId,
      unitPrice: item.unitPrice || 0,
      isPurchased: false,
      addedBy: '我',
    })
    saveItems()

    // 如果是從外部（如菜單、食譜）加入，標記為剛加入
    if (isFromExternal) {
      markAsRecentlyAdded(newId)
    }
  }

  function togglePurchased(id) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.isPurchased = !item.isPurchased
      saveItems()
    }
  }

  function removeItem(id) {
    items.value = items.value.filter(i => i.id !== id)
    // 從最近加入清單中移除
    recentlyAddedIds.value = recentlyAddedIds.value.filter(rid => rid !== id)
    saveItems()
  }

  function updateItemPrice(id, price) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.unitPrice = Math.max(0, Number(price) || 0)
      saveItems()
    }
  }

  function updateItemQuantity(id, qty) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.quantity = Math.max(1, Number(qty) || 1)
      saveItems()
    }
  }

  // =========================================
  // 4. 亮點功能：最近加入標記
  // =========================================
  function markAsRecentlyAdded(id) {
    recentlyAddedIds.value.push(id)
    
    // 清除舊的 timer，重新計時 3 秒
    if (recentTimer) clearTimeout(recentTimer)
    recentTimer = setTimeout(() => {
      recentlyAddedIds.value = []
    }, 3000)
  }

  // =========================================
  // 5. 亮點功能：價格歷史對比
  // =========================================
  function getPriceInfo(foodName) {
    const inventoryStore = useInventoryStore()
    const history = inventoryStore.priceHistory.filter(p => p.foodName === foodName)
    
    if (history.length === 0) return null
    
    // 依日期排序，取最新一筆
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date))
    const lastRecord = sorted[0]
    
    return {
      lastPrice: lastRecord.price,
      lastDate: lastRecord.date,
      unit: lastRecord.unit
    }
  }

  // 計算漲跌幅（需搭配當前輸入的單價使用）
  function getPriceChangePercent(foodName, currentPrice) {
    const info = getPriceInfo(foodName)
    if (!info || !currentPrice || info.lastPrice === 0) return null
    
    const diff = currentPrice - info.lastPrice
    const percent = Math.round((diff / info.lastPrice) * 100 * 10) / 10 // 保留一位小數
    
    return {
      diff,
      percent,
      isUp: diff > 0
    }
  }

  // =========================================
  // 6. 亮點功能：超市分區輔助
  // =========================================
  function getCategoryForItem(foodName) {
    // 嘗試從食材資料庫找分類
    const dbItem = foodDatabase[foodName]
    if (dbItem) {
      const cat = dbItem.category
      if (['蔬菜', '水果'].includes(cat)) return '生鮮蔬果'
      if (['肉類', '海鮮'].includes(cat)) return '肉品海鮮'
      if (['乳製品', '蛋類'].includes(cat)) return '乳製品蛋類'
      if (['飲品'].includes(cat)) return '飲品'
      if (['調味料'].includes(cat)) return '調味料'
    }
    return '其他'
  }

  // =========================================
  // 7. Computed 統計
  // =========================================
  const pendingCount = computed(() => items.value.filter(i => !i.isPurchased).length)
  const purchasedCount = computed(() => items.value.filter(i => i.isPurchased).length)

  const pendingCost = computed(() => {
    return items.value
      .filter(i => !i.isPurchased)
      .reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)
  })

  const purchasedCost = computed(() => {
    return items.value
      .filter(i => i.isPurchased)
      .reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)
  })

  const totalCost = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)
  })

  return {
    items,
    recentlyAddedIds,
    addItem,
    togglePurchased,
    removeItem,
    updateItemPrice,
    updateItemQuantity,
    getPriceInfo,
    getPriceChangePercent,
    getCategoryForItem,
    pendingCount,
    purchasedCount,
    pendingCost,
    purchasedCost,
    totalCost,
  }
})