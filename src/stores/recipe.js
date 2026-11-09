import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from './inventory'
import { useShoppingStore } from './shopping'
import { useSettingsStore } from './settings'
import { ElMessage } from 'element-plus'

// 🌟 擴充後的食譜資料庫 (15 個食譜)
const mockRecipes = [
  { id: 101, name: '番茄炒蛋', image: '', ingredients: ['雞蛋', '番茄'], steps: ['將番茄切塊', '將雞蛋打散', '熱鍋炒蛋後盛出', '炒番茄至軟爛', '加入炒蛋拌勻調味即可'], tags: ['家常菜', '快速'], allergens: ['蛋類'], diet: ['素食'], calories: 280, macros: { protein: 18, carbs: 12, fat: 16 } },
  { id: 102, name: '奶油高麗菜', image: '', ingredients: ['高麗菜', '奶油', '蒜頭'], steps: ['高麗菜洗淨切塊', '蒜頭爆香', '加入高麗菜拌炒', '加點水燜煮', '起鍋前加入奶油調味'], tags: ['蔬菜', '清淡'], allergens: ['乳製品'], diet: ['素食'], calories: 150, macros: { protein: 4, carbs: 10, fat: 12 } },
  { id: 103, name: '牛奶燉肉', image: '', ingredients: ['牛奶', '豬絞肉', '洋蔥'], steps: ['洋蔥切丁炒軟', '加入豬絞肉炒至變色', '倒入牛奶煮滾', '轉小火燉煮15分鐘', '加鹽調味即可'], tags: ['燉菜', '濃郁', '主食'], allergens: ['乳製品'], diet: ['葷食'], calories: 420, macros: { protein: 25, carbs: 15, fat: 28 } },
  { id: 104, name: '麻婆豆腐', image: '', ingredients: ['豆腐', '豬絞肉', '辣豆瓣醬'], steps: ['豆腐切塊', '炒香豬絞肉與豆瓣醬', '加水與豆腐煮滾', '勾芡起鍋'], tags: ['下飯', '辣', '主食'], allergens: ['大豆'], diet: ['葷食'], calories: 350, macros: { protein: 22, carbs: 12, fat: 24 } },
  { id: 105, name: '法式吐司', image: '', ingredients: ['雞蛋', '牛奶', '吐司'], steps: ['將雞蛋與牛奶打勻', '吐司沾滿蛋液', '熱鍋加奶油', '將吐司煎至兩面金黃'], tags: ['早餐', '甜點'], allergens: ['蛋類', '乳製品', '麩質'], diet: ['素食'], calories: 380, macros: { protein: 14, carbs: 45, fat: 16 } },
  { id: 106, name: '蒜香雞胸肉', image: '', ingredients: ['雞胸肉', '蒜頭', '橄欖油'], steps: ['雞胸肉切塊', '蒜頭切末', '熱鍋後爆香蒜頭', '加入雞胸肉煎至兩面金黃'], tags: ['低脂', '快速', '主食'], allergens: [], diet: ['葷食'], calories: 220, macros: { protein: 35, carbs: 2, fat: 8 } },
  { id: 107, name: '清炒青江菜', image: '', ingredients: ['青江菜', '蒜頭', '鹽'], steps: ['青江菜洗淨切段', '蒜頭爆香', '加入青江菜快炒', '加鹽調味即可'], tags: ['蔬菜', '清淡', '快速'], allergens: [], diet: ['素食'], calories: 60, macros: { protein: 3, carbs: 5, fat: 3 } },
  { id: 108, name: '味噌豆腐湯', image: '', ingredients: ['豆腐', '味噌', '蔥'], steps: ['水煮滾', '加入豆腐塊', '轉小火加入味噌攪拌', '撒上蔥花即可'], tags: ['湯品', '清淡'], allergens: ['大豆'], diet: ['素食'], calories: 90, macros: { protein: 6, carbs: 8, fat: 4 } },
  { id: 109, name: '馬鈴薯燉肉', image: '', ingredients: ['馬鈴薯', '豬肉塊', '紅蘿蔔'], steps: ['馬鈴薯與紅蘿蔔切塊', '豬肉塊煎至變色', '加入蔬菜與水燉煮', '收汁調味'], tags: ['燉菜', '主食'], allergens: [], diet: ['葷食'], calories: 400, macros: { protein: 20, carbs: 30, fat: 18 } },
  { id: 110, name: '鮭魚炒飯', image: '', ingredients: ['鮭魚', '白飯', '雞蛋'], steps: ['鮭魚煎熟剝碎', '炒蛋後加入白飯', '加入鮭魚拌炒', '調味起鍋'], tags: ['主食', '快速'], allergens: ['海鮮', '蛋類'], diet: ['葷食'], calories: 450, macros: { protein: 22, carbs: 50, fat: 15 } },
  { id: 111, name: '香蕉燕麥粥', image: '', ingredients: ['香蕉', '燕麥', '牛奶'], steps: ['燕麥加水煮軟', '加入牛奶拌勻', '放入切片的香蕉', '煮滾即可'], tags: ['早餐', '甜點', '低脂'], allergens: ['乳製品', '麩質'], diet: ['素食'], calories: 300, macros: { protein: 10, carbs: 45, fat: 8 } },
  { id: 112, name: '涼拌小黃瓜', image: '', ingredients: ['小黃瓜', '蒜頭', '醋'], steps: ['小黃瓜拍碎切段', '加入蒜末與醋', '攪拌均勻冰鎮'], tags: ['小菜', '清淡', '快速'], allergens: [], diet: ['素食'], calories: 40, macros: { protein: 1, carbs: 6, fat: 1 } },
  { id: 113, name: '紅燒牛肉麵', image: '', ingredients: ['牛肉', '麵條', '蔥', '薑'], steps: ['牛肉切塊川燙', '爆香蔥薑與牛肉', '加水與醬油燉煮', '煮麵條並淋上湯汁'], tags: ['主食', '濃郁'], allergens: ['麩質', '大豆'], diet: ['葷食'], calories: 550, macros: { protein: 30, carbs: 60, fat: 20 } },
  { id: 114, name: '可樂雞翅', image: '', ingredients: ['雞翅', '可樂', '醬油'], steps: ['雞翅劃刀', '煎至兩面金黃', '倒入可樂與醬油', '煮至收汁'], tags: ['下飯', '主食'], allergens: ['大豆'], diet: ['葷食'], calories: 320, macros: { protein: 18, carbs: 25, fat: 16 } },
  { id: 115, name: '玉米濃湯', image: '', ingredients: ['玉米粒', '牛奶', '麵粉'], steps: ['玉米粒打成泥', '加入牛奶煮滾', '加入麵粉勾芡', '加鹽調味'], tags: ['湯品', '早餐'], allergens: ['乳製品', '麩質'], diet: ['素食'], calories: 200, macros: { protein: 5, carbs: 30, fat: 7 } }
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
      // 早餐優先挑選有「早餐」標籤的，若無則隨機
      const breakfasts = recommendations.filter(r => r.tags.includes('早餐'))
      mealPlan.value[day].breakfast = breakfasts.length > 0 
        ? breakfasts[Math.floor(Math.random() * breakfasts.length)] 
        : recommendations[Math.floor(Math.random() * recommendations.length)]
      
      // 午晚餐優先挑選有「主食」或「下飯」標籤的
      const mainDishes = recommendations.filter(r => r.tags.includes('主食') || r.tags.includes('下飯') || r.tags.includes('燉菜'))
      const lunchPool = mainDishes.length > 0 ? mainDishes : recommendations
      const dinnerPool = mainDishes.length > 0 ? mainDishes : recommendations

      mealPlan.value[day].lunch = lunchPool[Math.floor(Math.random() * lunchPool.length)]
      mealPlan.value[day].dinner = dinnerPool[Math.floor(Math.random() * dinnerPool.length)]
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