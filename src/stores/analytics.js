import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useInventoryStore, foodDatabase } from './inventory'

export const useAnalyticsStore = defineStore('analytics', () => {
  // 取得食材 Store 的資料來進行計算
  const inventoryStore = useInventoryStore()

  // 1. 浪費紀錄與金額估算 (US-18)
  const wastedItems = computed(() => inventoryStore.foods.filter(f => f.status === 'discarded'))
  
  const totalWastedAmount = computed(() => {
    return wastedItems.value.reduce((sum, item) => {
      // 計算單價 * 丟棄數量
      const unitPrice = item.price / item.quantity
      return sum + (unitPrice * item.discardQuantity)
    }, 0)
  })

  // 2. 類別分佈比例 (給圓餅圖或健康建議用)
  const categoryDistribution = computed(() => {
    const dist = {}
    inventoryStore.activeFoods.forEach(f => { 
      dist[f.category] = (dist[f.category] || 0) + 1 
    })
    return dist
  })

  // 3. 目前庫存總價值
  const totalInventoryValue = computed(() => {
    return inventoryStore.activeFoods.reduce((sum, item) => sum + item.price, 0)
  })

  // 4. 營養素總和估算 (US-22)
  const nutritionSummary = computed(() => {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    
    inventoryStore.activeFoods.forEach(item => {
      const dbItem = foodDatabase[item.name]
      if (dbItem && dbItem.nutrition) {
        // 這裡簡單以數量作為乘數，真實系統需對應重量
        totals.calories += dbItem.nutrition.calories * item.quantity
        totals.protein += dbItem.nutrition.protein * item.quantity
        totals.carbs += dbItem.nutrition.carbs * item.quantity
        totals.fat += dbItem.nutrition.fat * item.quantity
        totals.fiber += dbItem.nutrition.fiber * item.quantity
      }
    })
    return totals
  })

  return {
    wastedItems,
    totalWastedAmount,
    categoryDistribution,
    totalInventoryValue,
    nutritionSummary
  }
})