import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from './inventory'
import { useShoppingStore } from './shopping'
import { useSettingsStore } from './settings'
import { ElMessage } from 'element-plus'

// 模擬食譜資料庫 (加入營養素資料)
const mockRecipes = [
  { 
    id: 101, name: '番茄炒蛋', image: '', 
    ingredients: ['雞蛋', '番茄'], 
    steps: ['將番茄切塊', '將雞蛋打散', '熱鍋炒蛋後盛出', '炒番茄至軟爛', '加入炒蛋拌勻調味即可'], 
    tags: ['家常菜', '快速'],
    allergens: ['蛋類'],
    diet: ['素食'],
    calories: 280,
    macros: { protein: 18, carbs: 12, fat: 16 } // 克
  },
  { 
    id: 102, name: '奶油高麗菜', image: '', 
    ingredients: ['高麗菜', '奶油', '蒜頭'], 
    steps: ['高麗菜洗淨切塊', '蒜頭爆香', '加入高麗菜拌炒', '加點水燜煮', '起鍋前加入奶油調味'], 
    tags: ['蔬菜', '清淡'],
    allergens: ['乳製品'],
    diet: ['素食'],
    calories: 150,
    macros: { protein: 4, carbs: 10, fat: 12 }
  },
  { 
    id: 103, name: '牛奶燉肉', image: '', 
    ingredients: ['牛奶', '豬絞肉', '洋蔥'], 
    steps: ['洋蔥切丁炒軟', '加入豬絞肉炒至變色', '倒入牛奶煮滾', '轉小火燉煮15分鐘', '加鹽調味即可'], 
    tags: ['燉菜', '濃郁'],
    allergens: ['乳製品'],
    diet: ['葷食'],
    calories: 420,
    macros: { protein: 25, carbs: 15, fat: 28 }
  },
  { 
    id: 104, name: '麻婆豆腐', image: '', 
    ingredients: ['豆腐', '豬絞肉', '辣豆瓣醬'], 
    steps: ['豆腐切塊', '炒香豬絞肉與豆瓣醬', '加水與豆腐煮滾', '勾芡起鍋'], 
    tags: ['下飯', '辣'],
    allergens: ['大豆'],
    diet: ['葷食'],
    calories: 350,
    macros: { protein: 22, carbs: 12, fat: 24 }
  },
  { 
    id: 105, name: '法式吐司', image: '', 
    ingredients: ['雞蛋', '牛奶', '吐司'], 
    steps: ['將雞蛋與牛奶打勻', '吐司沾滿蛋液', '熱鍋加奶油', '將吐司煎至兩面金黃'], 
    tags: ['早餐', '甜點'],
    allergens: ['蛋類', '乳製品', '麩質'],
    diet: ['素食'],
    calories: 380,
    macros: { protein: 14, carbs: 45, fat: 16 }
  }
]

export const useRecipeStore = defineStore('recipe', () => {
  const recipes = ref(mockRecipes)
  const favorites = ref(JSON.parse(localStorage.getItem('favorites')) || [])
  
  const mealPlan = ref(JSON.parse(localStorage.getItem('mealPlan')) || {
    Monday: { breakfast: null, lunch: null, dinner: null },
    Tuesday: { breakfast: null, lunch: null, dinner: null },
    Wednesday: { breakfast: null, lunch: null, dinner: null },
    Thursday: { breakfast: null, lunch: null, dinner: null },
    Friday: { breakfast: null, lunch: null, dinner: null },
    Saturday: { breakfast: null, lunch: null, dinner: null },
    Sunday: { breakfast: null, lunch: null, dinner: null },
  })

  function saveFavorites() { localStorage.setItem('favorites', JSON.stringify(favorites.value)) }
  function saveMealPlan() { localStorage.setItem('mealPlan', JSON.stringify(mealPlan.value)) }

  function toggleFavorite(recipeId) {
    const index = favorites.value.indexOf(recipeId)
    if (index > -1) favorites.value.splice(index, 1)
    else favorites.value.push(recipeId)
    saveFavorites()
  }

  function isFavorite(recipeId) { return favorites.value.includes(recipeId) }

  function checkIsSafe(recipe) {
    const settingsStore = useSettingsStore()
    const userAllergies = settingsStore.allergies || []
    const userDiet = settingsStore.dietaryRestrictions || []
    const hasAllergen = recipe.allergens?.some(allergen => userAllergies.includes(allergen))
    if (hasAllergen) return false
    if (userDiet.includes('素食') && recipe.diet.includes('葷食')) return false
    return true
  }

  const allCategories = computed(() => {
    const tags = new Set()
    recipes.value.forEach(r => r.tags.forEach(t => tags.add(t)))
    return ['全部', ...Array.from(tags)]
  })

  const getRecommendations = () => {
    const inventoryStore = useInventoryStore()
    const availableFoods = inventoryStore.activeFoods.map(f => f.name)
    const urgentFoods = inventoryStore.urgentFoods.map(f => f.name)

    const scoredRecipes = recipes.value.map(recipe => {
      let matchCount = 0, missingIngredients = [], usedUrgentFoods = []
      recipe.ingredients.forEach(ing => {
        if (availableFoods.includes(ing)) {
          matchCount++
          if (urgentFoods.includes(ing)) usedUrgentFoods.push(ing)
        } else missingIngredients.push(ing)
      })
      const matchScore = Math.round((matchCount / recipe.ingredients.length) * 100)
      const urgencyBonus = usedUrgentFoods.length * 20
      
      return { 
        ...recipe, 
        matchScore, 
        urgencyBonus, 
        totalScore: matchScore + urgencyBonus, 
        missingIngredients, 
        usedUrgentFoods,
        isSafe: checkIsSafe(recipe)
      }
    })
      
    return scoredRecipes.filter(r => r.matchScore > 0).sort((a, b) => {
      if (a.isSafe !== b.isSafe) return a.isSafe ? -1 : 1
      return b.totalScore - a.totalScore
    })
  }

  function generateWeeklyPlan() {
    const recommendations = getRecommendations().filter(r => r.isSafe)
    if (recommendations.length === 0) {
      ElMessage.warning('沒有符合您過敏原設定的食譜，無法規劃菜單！')
      return
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    days.forEach(day => {
      const breakfasts = recommendations.filter(r => r.tags.includes('早餐'))
      mealPlan.value[day].breakfast = breakfasts.length > 0 ? breakfasts[Math.floor(Math.random() * breakfasts.length)] : recommendations[0]
      mealPlan.value[day].lunch = recommendations[Math.floor(Math.random() * recommendations.length)]
      mealPlan.value[day].dinner = recommendations[Math.floor(Math.random() * recommendations.length)]
    })

    saveMealPlan()
    ElMessage.success('已為您生成專屬的一週菜單 (已自動避開過敏原)！')
  }

  function addMissingToShoppingList() {
    const shoppingStore = useShoppingStore()
    const inventoryStore = useInventoryStore()
    
    const neededIngredients = new Set()
    Object.values(mealPlan.value).forEach(day => {
      ['breakfast', 'lunch', 'dinner'].forEach(meal => {
        if (day[meal]) day[meal].ingredients.forEach(ing => neededIngredients.add(ing))
      })
    })

    const availableFoods = inventoryStore.activeFoods.map(f => f.name)
    let addedCount = 0

    neededIngredients.forEach(ing => {
      if (!availableFoods.includes(ing)) {
        const exists = shoppingStore.items.find(i => i.name === ing && !i.isPurchased)
        if (!exists) {
          shoppingStore.addItem({ name: ing, quantity: 1, unit: '份' })
          addedCount++
        }
      }
    })

    if (addedCount > 0) ElMessage.success(`已將 ${addedCount} 樣缺少的食材加入購物清單！`)
    else ElMessage.info('太棒了！這週菜單所需的食材冰箱裡都有。')
  }

  function clearMealPlan() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    days.forEach(day => { mealPlan.value[day] = { breakfast: null, lunch: null, dinner: null } })
    saveMealPlan()
  }

  const favoriteRecipes = computed(() => recipes.value.filter(r => favorites.value.includes(r.id)))

  return { 
    recipes, favorites, mealPlan, allCategories,
    toggleFavorite, isFavorite, getRecommendations, 
    generateWeeklyPlan, addMissingToShoppingList, clearMealPlan,
    favoriteRecipes 
  }
})