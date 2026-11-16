import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useInventoryStore, foodDatabase } from './inventory'
import { useSettingsStore } from './settings'

export const useAnalyticsStore = defineStore('analytics', () => {
  const inventoryStore = useInventoryStore()
  const settingsStore = useSettingsStore()

  // =========================================
  // 內部 Helper
  // =========================================
  function getDaysLeftSafe(food) {
    if (!food || !food.expiry) return 999 // 沒有期限視為新鮮
    return inventoryStore.getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)
  }

  // =========================================
  // 1. 浪費紀錄與金額（保留原邏輯）
  // =========================================
  const wastedItems = computed(() => {
    return inventoryStore.foods
      .filter(f => (f.discardedQuantity || 0) > 0)
      .map(f => ({
        ...f,
        wastedAmount: (f.unitPrice || 0) * f.discardedQuantity
      }))
  })

  const totalWastedAmount = computed(() => {
    return Math.round(
      wastedItems.value.reduce((sum, item) => sum + item.wastedAmount, 0)
    )
  })

  const wastedRanking = computed(() => {
    const dist = {}
    wastedItems.value.forEach(item => {
      if (!dist[item.name]) {
        dist[item.name] = { name: item.name, count: 0, amount: 0 }
      }
      dist[item.name].count += item.discardedQuantity
      dist[item.name].amount += item.wastedAmount
    })
    return Object.values(dist)
      .map(d => ({ ...d, amount: Math.round(d.amount) }))
      .sort((a, b) => b.amount - a.amount)
  })

  // =========================================
  // 2. 類別分佈與總價值（保留原邏輯）
  // =========================================
  const categoryDistribution = computed(() => {
    const dist = {}
    inventoryStore.activeFoods.forEach(f => {
      dist[f.category] = (dist[f.category] || 0) + 1
    })
    return dist
  })

  const totalInventoryValue = computed(() => {
    return Math.round(
      inventoryStore.activeFoods.reduce(
        (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
        0
      )
    )
  })

  // =========================================
  // 3. 營養素總和（保留原邏輯）
  // =========================================
  const nutritionSummary = computed(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    inventoryStore.activeFoods.forEach(item => {
      const dbItem = foodDatabase[item.name]
      if (dbItem && dbItem.nutrition) {
        totals.calories += dbItem.nutrition.calories * item.quantity
        totals.protein += dbItem.nutrition.protein * item.quantity
        totals.carbs += dbItem.nutrition.carbs * item.quantity
        totals.fat += dbItem.nutrition.fat * item.quantity
      }
    })
    return totals
  })

  // =========================================
  // 🌟 4. 亮點新增：時間值散佈圖資料
  // =========================================
  const valueTimeScatterData = computed(() => {
    return inventoryStore.activeFoods
      .map(food => {
        const days = getDaysLeftSafe(food)
        const value = Math.round((food.unitPrice || 0) * food.quantity)
        const threshold = settingsStore.getReminderDaysFor(food.category)
        
        let status = 'fresh'
        if (days < 0) status = 'expired'
        else if (days <= threshold) status = 'urgent'
        else if (days <= threshold + 3) status = 'warning'

        return {
          id: food.id,
          name: food.name,
          category: food.category,
          days,
          value,
          quantity: food.quantity,
          unit: food.unit,
          status
        }
      })
      .filter(d => d.value > 0) // 價值為 0 的不畫，避免圖表被壓縮
  })

  // 快過期且高價值：最需要優先處理的食材
  const urgentHighValueItems = computed(() => {
    const all = valueTimeScatterData.value
    if (all.length === 0) return []
    
    const avgValue = all.reduce((sum, d) => sum + d.value, 0) / all.length
    
    return all
      .filter(d => (d.status === 'expired' || d.status === 'urgent') && d.value >= avgValue)
      .sort((a, b) => b.value - a.value)
  })

  // =========================================
  // 🌟 5. 亮點新增：生活習慣洞察
  // =========================================
  const lifeInsights = computed(() => {
    // 1. 常買類別（統計所有歷史紀錄，包含已吃完、已丟棄）
    const buyCount = {}
    inventoryStore.foods.forEach(f => {
      buyCount[f.category] = (buyCount[f.category] || 0) + 1
    })
    const topBought = Object.entries(buyCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // 2. 常浪費類別
    const wasteCount = {}
    wastedItems.value.forEach(f => {
      wasteCount[f.category] = (wasteCount[f.category] || 0) + 1
    })
    const topWasted = Object.entries(wasteCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // 3. 常吃完類別
    const eatenCount = {}
    inventoryStore.foods
      .filter(f => f.status === 'eaten')
      .forEach(f => {
        eatenCount[f.category] = (eatenCount[f.category] || 0) + 1
      })
    const topEaten = Object.entries(eatenCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return { topBought, topWasted, topEaten }
  })

  // 根據統計結果生成文字建議
  const lifestyleAdvice = computed(() => {
    const advice = []
    const { topBought, topWasted, topEaten } = lifeInsights.value

    // 如果有「常浪費」且該類別也有「常買」，就給出具體警告
    if (topWasted.length > 0 && topBought.length > 0) {
      const mostWasted = topWasted[0]
      const boughtSame = topBought.find(b => b.category === mostWasted.category)
      if (boughtSame && boughtSame.count >= 2) {
        advice.push(`「${mostWasted.category}」是您最常浪費的類別，建議每次少量購買。`)
      }
    }

    if (topEaten.length > 0) {
      advice.push(`「${topEaten[0].category}」是您家最常吃完的類別，可以安心多買一些。`)
    }

    if (advice.length === 0) {
      advice.push('目前沒有明顯的消費習慣趨勢，繼續保持！')
    }
    return advice
  })

  // =========================================
  // 🌟 6. 亮點新增：價格趨勢（從 priceHistory 推算）
  // =========================================
  const availablePriceFoods = computed(() => {
    return [...new Set(inventoryStore.priceHistory.map(p => p.foodName))]
  })

  function getPriceTrendByFood(foodName) {
    return inventoryStore.priceHistory
      .filter(p => p.foodName === foodName)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(p => ({ date: p.date, price: p.price }))
  }

  // =========================================
  // 🌟 7. 亮點新增：累計節省金額
  // =========================================
  const totalSavedAmount = computed(() => {
    // 已經吃完的食材，其價值視為「成功消耗，未浪費」
    return Math.round(
      inventoryStore.foods
        .filter(f => f.status === 'eaten')
        .reduce((sum, item) => {
          const qty = item.originalQuantity || item.quantity || 1
          return sum + (item.unitPrice || 0) * qty
        }, 0)
    )
  })

  // =========================================
  // 🌟 8. 亮點新增：庫齡分佈
  // =========================================
  const ageDistribution = computed(() => {
    const dist = { '0-3天': 0, '4-7天': 0, '8-14天': 0, '15天以上': 0 }
    inventoryStore.activeFoods.forEach(f => {
      const days = getDaysLeftSafe(f)
      if (days <= 3) dist['0-3天']++
      else if (days <= 7) dist['4-7天']++
      else if (days <= 14) dist['8-14天']++
      else dist['15天以上']++
    })
    return dist
  })

  return {
    // 保留
    wastedItems,
    totalWastedAmount,
    wastedRanking,
    categoryDistribution,
    totalInventoryValue,
    nutritionSummary,
    
    // 新增：時間值散佈圖
    valueTimeScatterData,
    urgentHighValueItems,
    
    // 新增：生活習慣洞察
    lifeInsights,
    lifestyleAdvice,
    
    // 新增：價格趨勢
    availablePriceFoods,
    getPriceTrendByFood,
    
    // 新增：節省與庫齡
    totalSavedAmount,
    ageDistribution
  }
})