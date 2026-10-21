import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { useSettingsStore } from './settings'

// 預設的食材資料字典
const defaultFoodDatabase = {
  '雞蛋': { category: '蛋類', unit: '顆', daysFridge: 21, daysFreezer: 90, daysAfterOpened: 14, nutrition: { calories: 70, protein: 6, carbs: 1, fat: 5, fiber: 0 } },
  '牛奶': { category: '乳製品', unit: '瓶', daysFridge: 7, daysFreezer: 30, daysAfterOpened: 3, nutrition: { calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0 } },
  '高麗菜': { category: '蔬菜', unit: '顆', daysFridge: 14, daysFreezer: 0, daysAfterOpened: 5, nutrition: { calories: 50, protein: 2, carbs: 10, fat: 0, fiber: 4 } },
  '豬絞肉': { category: '肉類', unit: '克', daysFridge: 1, daysFreezer: 90, daysAfterOpened: 1, nutrition: { calories: 250, protein: 20, carbs: 0, fat: 18, fiber: 0 } },
  '豆腐': { category: '其他', unit: '盒', daysFridge: 5, daysFreezer: 0, daysAfterOpened: 2, nutrition: { calories: 80, protein: 8, carbs: 2, fat: 4, fiber: 1 } },
  '番茄': { category: '蔬菜', unit: '顆', daysFridge: 7, daysFreezer: 0, daysAfterOpened: 4, nutrition: { calories: 20, protein: 1, carbs: 4, fat: 0, fiber: 1 } },
}

// 使用 reactive 讓外部可以動態新增食材
export const foodDatabase = reactive({ ...defaultFoodDatabase })

export const useInventoryStore = defineStore('inventory', () => {
  const settings = useSettingsStore()

  // 自訂食材列表 (儲存使用者的自訂食材)
  const customFoods = ref(JSON.parse(localStorage.getItem('customFoods')) || [])

  // 初始化時，將自訂食材合併到 foodDatabase 中
  customFoods.value.forEach(food => {
    foodDatabase[food.name] = { ...food, isCustom: true }
  })

  // === 核心資料 ===
  const foods = ref([
    { id: 1, name: '牛奶', category: '乳製品', quantity: 1, unit: '瓶', price: 85, zone: 'cold', shelf: 'A1', expiry: '2026-10-18', status: 'normal', discardQuantity: 0 },
    { id: 2, name: '雞蛋', category: '蛋類', quantity: 6, unit: '顆', price: 60, zone: 'cold', shelf: 'A1', expiry: '2026-10-25', status: 'normal', discardQuantity: 0 },
    { id: 3, name: '高麗菜', category: '蔬菜', quantity: 1, unit: '顆', price: 40, zone: 'cold', shelf: 'A2', expiry: '2026-10-30', status: 'normal', discardQuantity: 0 },
    { id: 4, name: '豬絞肉', category: '肉類', quantity: 500, unit: '克', price: 120, zone: 'freezer', shelf: 'B1', expiry: '2027-01-15', status: 'normal', discardQuantity: 0 },
    { id: 5, name: '番茄', category: '蔬菜', quantity: 1, unit: '盒', price: 50, zone: 'cold', shelf: 'A2', expiry: '2026-10-10', status: 'discarded', discardQuantity: 1 },
  ])

  const priceHistory = ref([
    { foodName: '牛奶', unit: '瓶', price: 85, date: '2026-09-01' },
    { foodName: '牛奶', unit: '瓶', price: 90, date: '2026-09-15' },
    { foodName: '牛奶', unit: '瓶', price: 85, date: '2026-10-01' },
    { foodName: '雞蛋', unit: '顆', price: 8, date: '2026-09-10' },
    { foodName: '雞蛋', unit: '顆', price: 10, date: '2026-10-01' },
  ])

  // === 動作 (Actions) ===
  function addFood(food) {
    const newId = foods.value.length ? Math.max(...foods.value.map((f) => f.id)) + 1 : 1
    foods.value.push({ ...food, id: newId, status: 'normal', discardQuantity: 0 })
    
    priceHistory.value.push({ 
      foodName: food.name, 
      unit: food.unit, 
      price: food.price, 
      date: new Date().toISOString().split('T')[0] 
    })
  }

  // === 自訂食材管理 ===
  function addCustomFood(food) {
    // 避免名稱重複
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
    delete foodDatabase[foodName]
    customFoods.value = customFoods.value.filter(f => f.name !== foodName)
    localStorage.setItem('customFoods', JSON.stringify(customFoods.value))
  }

  // === 其他原有動作 ===
  function markAsEaten(id) {
    const item = foods.value.find((f) => f.id === id)
    if (item) item.status = 'eaten'
  }

  function markAsDiscarded(id, discardQty) {
    const item = foods.value.find((f) => f.id === id)
    if (item) { item.status = 'discarded'; item.discardQuantity = discardQty }
  }

  function batchDelete(ids) { foods.value = foods.value.filter(f => !ids.includes(f.id)) }

  function updateProgress(id, newQuantity) {
    const item = foods.value.find((f) => f.id === id)
    if (item) {
      item.quantity = newQuantity
      if (newQuantity === 0) item.status = 'eaten'
    }
  }

  function moveFood(id, targetZone, targetShelf) {
    const item = foods.value.find((f) => f.id === id)
    if (item) { item.zone = targetZone; item.shelf = targetShelf }
  }

  const activeFoods = computed(() => foods.value.filter(f => f.status === 'normal'))

  function getDaysLeft(expiry) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exp = new Date(expiry); exp.setHours(0, 0, 0, 0)
    return Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
  }

  function getStatus(expiry) {
    const diffDays = getDaysLeft(expiry)
    if (diffDays < 0) return 'danger'
    return 'success'
  }

  function getStatusText(expiry) {
    const diffDays = getDaysLeft(expiry)
    if (diffDays < 0) return `已過期 ${Math.abs(diffDays)} 天`
    if (diffDays === 0) return '今天到期'
    return `剩 ${diffDays} 天`
  }

  const totalCount = computed(() => activeFoods.value.length)
  const expiredCount = computed(() => activeFoods.value.filter(f => getDaysLeft(f.expiry) < 0).length)
  const expiringSoonCount = computed(() => activeFoods.value.filter(f => { const d = getDaysLeft(f.expiry); return d >= 0 && d <= settings.reminderDays }).length)
  const freshCount = computed(() => activeFoods.value.filter(f => getDaysLeft(f.expiry) > settings.reminderDays).length)
  const urgentFoods = computed(() => [...activeFoods.value].filter(f => getDaysLeft(f.expiry) <= settings.reminderDays).sort((a, b) => getDaysLeft(a.expiry) - getDaysLeft(b.expiry)))

  function getFoodsByShelf(zoneId, shelfId) { 
    return activeFoods.value.filter(f => f.zone === zoneId && f.shelf === shelfId) 
  }

  return {
    foods, priceHistory, customFoods,
    addFood, markAsEaten, markAsDiscarded, batchDelete, updateProgress, moveFood,
    addCustomFood, removeCustomFood,
    activeFoods, getDaysLeft, getStatus, getStatusText, 
    totalCount, expiredCount, expiringSoonCount, freshCount, urgentFoods, getFoodsByShelf
  }
})