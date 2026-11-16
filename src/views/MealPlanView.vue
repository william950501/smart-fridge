<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipeStore } from '@/stores/recipe'
import { useInventoryStore } from '@/stores/inventory'
import { useShoppingStore } from '@/stores/shopping'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, ShoppingCart, Delete, Refresh, Close, Check, Plus, Clock, Dish, Food, Edit } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const recipeStore = useRecipeStore()
const inventoryStore = useInventoryStore()
const shoppingStore = useShoppingStore()

// =========================================
// 狀態管理
// =========================================
const todayKey = dayjs().format('dddd')
const todayDateStr = dayjs().format('YYYY年MM月DD日')
const selectedDay = ref(todayKey) // 預設選中今天

const weekDays = {
  Monday: '星期一', Tuesday: '星期二', Wednesday: '星期三',
  Thursday: '星期四', Friday: '星期五', Saturday: '星期六', Sunday: '星期日'
}
const meals = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }

// 取得本週日期（用於篩選列）
const weekDates = computed(() => {
  const currentDay = dayjs().day()
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
  const monday = dayjs().add(diffToMonday, 'day')
  
  const dates = []
  const keys = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  keys.forEach((key, index) => {
    const d = monday.add(index, 'day')
    dates.push({
      key: key,
      date: d.format('DD'),
      month: d.format('MM'),
      isToday: key === todayKey
    })
  })
  return dates
})

// 食譜詳情彈窗
const dialogVisible = ref(false)
const currentRecipe = ref(null)

// 換餐/挑選彈窗
const swapDialogVisible = ref(false)
const swapTarget = ref(null) // { day, meal, type: 'swap' | 'addSide' }
const swapOptions = ref([])

// 加配菜選項彈窗
const addSideDialogVisible = ref(false)
const addSideMealKey = ref('lunch')

// =========================================
// 統計數據
// =========================================
const dailyStats = computed(() => {
  const dayMeals = recipeStore.mealPlan[selectedDay.value] || {}
  const d = { calories: 0, protein: 0, cookTime: 0, mealsCount: 0, veggieCount: 0, meatCount: 0 }
  
  Object.values(dayMeals).forEach(meal => {
    if (!meal) return
    const recipes = Array.isArray(meal) ? meal : [meal]
    recipes.forEach(recipe => {
      if (!recipe) return
      d.calories += recipe.calories || 0
      d.protein += recipe.macros?.protein || 0
      d.cookTime += recipe.cookTime || 0
      d.mealsCount++
      if (recipe.diet?.includes('素食')) d.veggieCount++
      else d.meatCount++
    })
  })
  
  d.calories = Math.round(d.calories)
  d.protein = Math.round(d.protein)
  d.cookTime = Math.round(d.cookTime)
  return d
})

// 取得該餐點的食譜陣列
function getMealRecipes(day, mealKey) {
  const meal = recipeStore.mealPlan[day]?.[mealKey]
  if (!meal) return []
  return Array.isArray(meal) ? meal : [meal]
}

// =========================================
// 核心操作
// =========================================
// 🌟 核心：AI 排餐自動搭配配菜
function handleGenerate() { 
  // 1. 先讓原本的邏輯生成一週主餐
  recipeStore.generateWeeklyPlan() 
  
  // 2. 延遲一下確保資料寫入，然後自動補上配菜
  setTimeout(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const safeRecipes = recipeStore.getRecommendations().filter(r => r.isSafe)
    
    days.forEach(day => {
      ['lunch', 'dinner'].forEach(meal => {
        const currentMeal = recipeStore.mealPlan[day]?.[meal]
        
        // 如果該餐點有主食，且尚未變成陣列（代表還沒加配菜）
        if (currentMeal && !Array.isArray(currentMeal)) {
          // 隨機挑選一道配菜（排除主食本身與早餐分類）
          const sideCandidates = safeRecipes.filter(r => 
            r.id !== currentMeal.id && 
            r.mainCategory !== '早餐'
          )
          
          if (sideCandidates.length > 0) {
            const sideDish = sideCandidates[Math.floor(Math.random() * sideCandidates.length)]
            const newArr = [currentMeal, sideDish]
            
            // 寫入 Store
            if (recipeStore.setMeal) {
              recipeStore.setMeal(day, meal, newArr)
            } else {
              recipeStore.mealPlan[day][meal] = newArr
            }
          }
        }
      })
    })
    
    ElMessage.success('已為您生成一週菜單，並自動搭配配菜！')
  }, 150)
}

function handleAddToShopping() { 
  recipeStore.addMissingToShoppingList() 
}

function handleClear() {
  ElMessageBox.confirm(`確定要清空${weekDays[selectedDay.value]}的菜單嗎？`, '清空菜單', {
    confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning',
  }).then(() => {
    if (recipeStore.clearDay) {
      recipeStore.clearDay(selectedDay.value)
    } else {
      Object.keys(recipeStore.mealPlan[selectedDay.value]).forEach(k => {
        recipeStore.clearMeal(selectedDay.value, k)
      })
    }
    ElMessage.success('已清空該日菜單')
  }).catch(() => {})
}

function openRecipeDetail(recipe) {
  if (!recipe) return
  currentRecipe.value = recipe
  dialogVisible.value = true
}

function getMissingCount(recipe) {
  if (!recipe) return 0
  const availableFoods = inventoryStore.activeFoods.map(f => f.name)
  return recipe.ingredients.filter(ing => !availableFoods.includes(ing)).length
}

// 替換特定餐點或配菜
function handleSwap(mealKey, index = 0) {
  let recommendations = recipeStore.getRecommendations().filter(r => r.isSafe)
  if (mealKey === 'breakfast') recommendations = recommendations.filter(r => r.mainCategory === '早餐')
  
  if (recommendations.length === 0) return ElMessage.warning('目前沒有其他適合的食譜可替換')

  const newRecipe = recommendations[Math.floor(Math.random() * recommendations.length)]
  
  if (Array.isArray(recipeStore.mealPlan[selectedDay.value][mealKey])) {
    const newArr = [...recipeStore.mealPlan[selectedDay.value][mealKey]]
    newArr[index] = newRecipe
    recipeStore.setMeal(selectedDay.value, mealKey, newArr)
  } else {
    recipeStore.setMeal(selectedDay.value, mealKey, newRecipe)
  }
  
  ElMessage.success(`已替換為「${newRecipe.name}」`)
}

// 移除餐點或配菜
function handleRemoveMeal(mealKey, index = -1) {
  const current = recipeStore.mealPlan[selectedDay.value][mealKey]
  if (Array.isArray(current) && index >= 0) {
    const newArr = current.filter((_, i) => i !== index)
    if (newArr.length === 0) recipeStore.clearMeal(selectedDay.value, mealKey)
    else recipeStore.setMeal(selectedDay.value, mealKey, newArr)
  } else {
    recipeStore.clearMeal(selectedDay.value, mealKey)
  }
  ElMessage.info('已移除該餐點')
}

// =========================================
// 換餐與加配菜流程
// =========================================
function openSwapDialog(mealKey, type = 'swap') {
  swapTarget.value = { day: selectedDay.value, meal: mealKey, type }
  let recommendations = recipeStore.getRecommendations().filter(r => r.isSafe)
  if (mealKey === 'breakfast') recommendations = recommendations.filter(r => r.mainCategory === '早餐')
  swapOptions.value = recommendations.slice(0, 20)
  swapDialogVisible.value = true
}

function selectSwapRecipe(recipe) {
  if (!swapTarget.value) return
  const { day, meal, type } = swapTarget.value

  if (type === 'swap') {
    recipeStore.setMeal(day, meal, recipe)
    ElMessage.success(`已替換為「${recipe.name}」`)
  } else if (type === 'addSide') {
    addSideDish(meal, recipe)
  }
  
  swapDialogVisible.value = false
}

// 點擊加配菜按鈕
function openAddSideDialog(mealKey) {
  addSideMealKey.value = mealKey
  addSideDialogVisible.value = true
}

// 選擇加配菜的方式
function handleAddSideOption(option) {
  addSideDialogVisible.value = false
  
  if (option === 'ai') {
    let recommendations = recipeStore.getRecommendations().filter(r => r.isSafe)
    if (addSideMealKey.value === 'breakfast') recommendations = recommendations.filter(r => r.mainCategory === '早餐')
    if (recommendations.length === 0) return ElMessage.warning('目前沒有推薦的配菜')
    
    const random = recommendations[Math.floor(Math.random() * recommendations.length)]
    addSideDish(addSideMealKey.value, random)
  } else if (option === 'manual') {
    openSwapDialog(addSideMealKey.value, 'addSide')
  }
}

// 實際將配菜加入陣列
function addSideDish(mealKey, recipe) {
  const day = selectedDay.value
  const current = recipeStore.mealPlan[day]?.[mealKey]
  let newArr = []
  
  if (Array.isArray(current)) {
    newArr = [...current, recipe]
  } else if (current) {
    newArr = [current, recipe]
  } else {
    newArr = [recipe]
  }
  
  if (recipeStore.setMeal) {
    recipeStore.setMeal(day, mealKey, newArr)
  } else {
    recipeStore.mealPlan[day][mealKey] = newArr
  }
  ElMessage.success(`已加入配菜「${recipe.name}」`)
}

function addSingleIngredientToShopping(ingName) {
  const exists = shoppingStore.items.find(i => i.name === ingName && !i.isPurchased)
  if (exists) {
    ElMessage.info(`「${ingName}」已在購物清單中`)
    return
  }
  shoppingStore.addItem({ name: ingName, quantity: 1, unit: '份' }, true)
  ElMessage.success(`已將「${ingName}」加入購物清單`)
}

function goToShopping() {
  dialogVisible.value = false
  router.push('/shopping')
}
</script>

<template>
  <div class="meal-plan-container">
    <!-- 頂部標題與操作 -->
    <div class="page-header">
      <div>
        <div class="title-row">
          <h2>一週菜單規劃</h2>
          <el-tag type="success" effect="light" round class="today-date-tag">今天是 {{ todayDateStr }}</el-tag>
        </div>
        <p class="hint">點擊下方日期切換，針對家庭成員需求搭配一主食與配菜。</p>
      </div>
      <div class="header-actions">
        <el-button type="danger" plain @click="handleClear" :icon="Delete">清空當天</el-button>
        <el-button class="btn-secondary" @click="handleAddToShopping" :icon="ShoppingCart">補齊食材</el-button>
        <el-button type="primary" @click="handleGenerate" :icon="MagicStick" data-tour="meal-plan-generate">AI 排餐</el-button>
      </div>
    </div>

    <!-- 🌟 日期篩選列 -->
    <div class="date-filter-bar">
      <div 
        v-for="day in weekDates" 
        :key="day.key"
        class="date-tab"
        :class="{ 'is-active': selectedDay === day.key, 'is-today': day.isToday }"
        @click="selectedDay = day.key"
      >
        <span class="day-name">{{ weekDays[day.key] }}</span>
        <span class="day-date">{{ day.month }}/{{ day.date }}</span>
        <span v-if="day.isToday" class="today-dot"></span>
      </div>
    </div>

    <!-- 當日統計條 -->
    <div class="daily-stats-bar" v-if="dailyStats.mealsCount > 0">
      <div class="stat-item"><span>已安排</span><strong>{{ dailyStats.mealsCount }}</strong> 道</div>
      <div class="divider"></div>
      <div class="stat-item"><span>總熱量</span><strong>{{ dailyStats.calories }}</strong> kcal</div>
      <div class="divider"></div>
      <div class="stat-item"><span>蛋白質</span><strong>{{ dailyStats.protein }}</strong> g</div>
      <div class="divider"></div>
      <div class="stat-item"><el-icon><Clock /></el-icon><span>時間</span><strong>{{ dailyStats.cookTime }}</strong> 分</div>
      <div class="divider"></div>
      <div class="stat-item"><el-icon><Dish /></el-icon><span>葷素</span><strong>{{ dailyStats.meatCount }}:{{ dailyStats.veggieCount }}</strong></div>
    </div>

    <!-- 當日菜單內容 -->
    <div class="daily-menu-container">
      <!-- 早餐區塊 -->
      <div class="meal-section">
        <div class="section-header">
          <span class="meal-title"><el-icon><Food /></el-icon> 早餐</span>
          <span class="meal-tip">全家統一</span>
        </div>
        <div class="meal-content">
          <template v-if="getMealRecipes(selectedDay, 'breakfast').length > 0">
            <div v-for="(recipe, idx) in getMealRecipes(selectedDay, 'breakfast')" :key="recipe.id" class="recipe-card full-width">
              <div class="card-top">
                <div class="card-title">{{ recipe.name }}</div>
                <div class="card-actions">
                  <el-button type="primary" link :icon="Refresh" @click="handleSwap('breakfast', idx)">換</el-button>
                  <el-button type="danger" link :icon="Close" @click="handleRemoveMeal('breakfast', idx)">刪</el-button>
                </div>
              </div>
              <div class="card-meta">
                <el-tag v-if="getMissingCount(recipe) > 0" type="danger" size="small" effect="plain" round>缺 {{ getMissingCount(recipe) }} 樣</el-tag>
                <el-tag v-else type="success" size="small" effect="plain" round>食材齊全</el-tag>
                <span class="cal">{{ recipe.calories }} kcal</span>
              </div>
              <el-button class="detail-btn" text bg @click="openRecipeDetail(recipe)">查看作法</el-button>
            </div>
          </template>
          <div v-else class="empty-card" @click="openSwapDialog('breakfast')">
            <el-icon><Plus /></el-icon> 安排早餐
          </div>
        </div>
      </div>

      <!-- 午餐與晚餐區塊 (一主食 + 配菜) -->
      <div class="meal-section combined-meals">
        <div class="meal-col">
          <div class="section-header">
            <span class="meal-title"><el-icon><Food /></el-icon> 午餐</span>
          </div>
          <div class="meal-content">
            <template v-if="getMealRecipes(selectedDay, 'lunch').length > 0">
              <!-- 主食 (第一道) -->
              <div class="recipe-card main-dish">
                <div class="dish-type-badge">主食</div>
                <div class="card-top">
                  <div class="card-title">{{ getMealRecipes(selectedDay, 'lunch')[0].name }}</div>
                  <div class="card-actions">
                    <el-button type="primary" link :icon="Refresh" @click="handleSwap('lunch', 0)">換</el-button>
                    <el-button type="danger" link :icon="Close" @click="handleRemoveMeal('lunch', 0)">刪</el-button>
                  </div>
                </div>
                <div class="card-meta">
                  <el-tag v-if="getMissingCount(getMealRecipes(selectedDay, 'lunch')[0]) > 0" type="danger" size="small" effect="plain" round>缺 {{ getMissingCount(getMealRecipes(selectedDay, 'lunch')[0]) }} 樣</el-tag>
                  <el-tag v-else type="success" size="small" effect="plain" round>食材齊全</el-tag>
                </div>
              </div>
              
              <!-- 配菜 (第二道以後) -->
              <div v-for="(recipe, idx) in getMealRecipes(selectedDay, 'lunch').slice(1)" :key="recipe.id" class="recipe-card side-dish">
                <div class="dish-type-badge side">配菜</div>
                <div class="card-top">
                  <div class="card-title">{{ recipe.name }}</div>
                  <div class="card-actions">
                    <el-button type="danger" link :icon="Close" @click="handleRemoveMeal('lunch', idx + 1)">刪</el-button>
                  </div>
                </div>
              </div>
              
              <el-button class="add-side-btn" plain size="small" :icon="Plus" @click="openAddSideDialog('lunch')">加配菜</el-button>
            </template>
            <div v-else class="empty-card" @click="openSwapDialog('lunch')">
              <el-icon><Plus /></el-icon> 安排午餐
            </div>
          </div>
        </div>

        <div class="meal-col">
          <div class="section-header">
            <span class="meal-title"><el-icon><Food /></el-icon> 晚餐</span>
          </div>
          <div class="meal-content">
            <template v-if="getMealRecipes(selectedDay, 'dinner').length > 0">
               <!-- 主食 (第一道) -->
              <div class="recipe-card main-dish">
                <div class="dish-type-badge">主食</div>
                <div class="card-top">
                  <div class="card-title">{{ getMealRecipes(selectedDay, 'dinner')[0].name }}</div>
                  <div class="card-actions">
                    <el-button type="primary" link :icon="Refresh" @click="handleSwap('dinner', 0)">換</el-button>
                    <el-button type="danger" link :icon="Close" @click="handleRemoveMeal('dinner', 0)">刪</el-button>
                  </div>
                </div>
                <div class="card-meta">
                  <el-tag v-if="getMissingCount(getMealRecipes(selectedDay, 'dinner')[0]) > 0" type="danger" size="small" effect="plain" round>缺 {{ getMissingCount(getMealRecipes(selectedDay, 'dinner')[0]) }} 樣</el-tag>
                  <el-tag v-else type="success" size="small" effect="plain" round>食材齊全</el-tag>
                </div>
              </div>
              
              <!-- 配菜 (第二道以後) -->
              <div v-for="(recipe, idx) in getMealRecipes(selectedDay, 'dinner').slice(1)" :key="recipe.id" class="recipe-card side-dish">
                <div class="dish-type-badge side">配菜</div>
                <div class="card-top">
                  <div class="card-title">{{ recipe.name }}</div>
                  <div class="card-actions">
                    <el-button type="danger" link :icon="Close" @click="handleRemoveMeal('dinner', idx + 1)">刪</el-button>
                  </div>
                </div>
              </div>
              
              <el-button class="add-side-btn" plain size="small" :icon="Plus" @click="openAddSideDialog('dinner')">加配菜</el-button>
            </template>
            <div v-else class="empty-card" @click="openSwapDialog('dinner')">
              <el-icon><Plus /></el-icon> 安排晚餐
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 食譜詳情彈窗 -->
    <el-dialog v-model="dialogVisible" :title="currentRecipe?.name" width="500px" align-center class="custom-app-dialog">
      <div v-if="currentRecipe" class="recipe-detail">
        <h4>所需食材</h4>
        <div class="ingredients-list">
          <div v-for="ing in currentRecipe.ingredients" :key="ing" class="ing-item">
            <span class="ing-name">{{ ing }}</span>
            <el-tag v-if="inventoryStore.activeFoods.some(f => f.name === ing)" type="success" effect="light" size="small" round>已有</el-tag>
            <el-button v-else type="primary" link size="small" :icon="Plus" @click="addSingleIngredientToShopping(ing)">缺少，加入購物車</el-button>
          </div>
        </div>
        <h4 style="margin-top: 24px;">料理步驟</h4>
        <ol class="steps-list">
          <li v-for="(step, index) in currentRecipe.steps" :key="index">{{ step }}</li>
        </ol>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="goToShopping" :icon="ShoppingCart">前往購物清單</el-button>
          <el-button type="primary" @click="dialogVisible = false">關閉</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 換餐/挑選食譜彈窗 -->
    <el-dialog v-model="swapDialogVisible" :title="swapTarget?.type === 'addSide' ? '手動挑選配菜' : '替換餐點'" width="500px" align-center class="custom-app-dialog">
      <div class="swap-dialog-content">
        <p class="swap-hint">
          為 {{ weekDays[swapTarget?.day] }} 的 {{ meals[swapTarget?.meal] || swapTarget?.meal }} 
          {{ swapTarget?.type === 'addSide' ? '新增一道配菜：' : '選擇一道替換食譜：' }}
        </p>
        <el-empty v-if="swapOptions.length === 0" description="目前沒有推薦食譜" :image-size="80" />
        <div v-else class="swap-list">
          <div v-for="r in swapOptions" :key="r.id" class="swap-item" @click="selectSwapRecipe(r)">
            <div class="swap-item-info">
              <span class="swap-item-name">{{ r.name }}</span>
              <span class="swap-item-cal">{{ r.calories }} kcal</span>
            </div>
            <el-button type="primary" plain size="small">{{ swapTarget?.type === 'addSide' ? '加入' : '選擇' }}</el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 加配菜方式選擇彈窗 -->
    <el-dialog v-model="addSideDialogVisible" title="新增配菜" width="400px" align-center class="custom-app-dialog">
      <div class="add-side-options">
        <div class="option-card" @click="handleAddSideOption('ai')">
          <div class="icon-box ai-icon"><el-icon><MagicStick /></el-icon></div>
          <h4>AI 推薦配菜</h4>
          <p>根據冰箱現有食材與家庭口味，自動推薦一道合適的配菜。</p>
        </div>
        <div class="option-card" @click="handleAddSideOption('manual')">
          <div class="icon-box manual-icon"><el-icon><Edit /></el-icon></div>
          <h4>手動挑選配菜</h4>
          <p>從符合條件的安全食譜中，自己挑選想吃的配菜。</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.meal-plan-container { width: 100%; max-width: 1000px; margin: 0 auto; }

/* 頂部標題 */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);
}
.title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.page-header h2 { margin: 0; font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.today-date-tag { font-weight: 600; }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }
.header-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.btn-secondary { background: var(--sage) !important; border: none !important; color: #fff !important; }

/* 🌟 日期篩選列 */
.date-filter-bar {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 8px;
  gap: 8px;
  margin-bottom: var(--space-4);
  overflow-x: auto;
  scrollbar-width: none;
}
.date-filter-bar::-webkit-scrollbar { display: none; }

.date-tab {
  flex: 1;
  min-width: 65px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  position: relative;
}
.date-tab:hover { background: var(--ground); }
.date-tab.is-active { background: var(--accent); color: #fff; box-shadow: var(--shadow-sm); }
.date-tab.is-active .day-name, .date-tab.is-active .day-date { color: #fff; }

.day-name { font-size: var(--text-xs); color: var(--muted); margin-bottom: 4px; font-weight: 500; }
.day-date { font-size: var(--text-base); font-family: var(--font-display); font-weight: 700; color: var(--ink); line-height: 1.2; }
.today-dot {
  position: absolute; top: 6px; right: 6px; width: 6px; height: 6px;
  background: var(--danger); border-radius: 50%;
}
.date-tab.is-active .today-dot { background: #fff; }

/* 當日統計 */
.daily-stats-bar {
  display: flex; align-items: center; gap: 12px;
  background: var(--ground); border: 1px solid var(--border-light);
  padding: 10px 16px; border-radius: var(--radius-md); margin-bottom: var(--space-4);
  overflow-x: auto; white-space: nowrap; scrollbar-width: none;
}
.daily-stats-bar::-webkit-scrollbar { display: none; }
.stat-item { display: flex; align-items: baseline; gap: 4px; font-size: var(--text-xs); color: var(--muted); }
.stat-item strong { color: var(--ink); font-size: var(--text-base); font-family: var(--font-display); font-weight: 700; }
.stat-item .el-icon { color: var(--accent); }
.divider { width: 1px; height: 14px; background: var(--border); flex-shrink: 0; }

/* 菜單內容區 */
.daily-menu-container { display: flex; flex-direction: column; gap: var(--space-4); }
.meal-section { background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); overflow: hidden; }
.section-header { padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; }
.meal-title { font-size: var(--text-base); font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.meal-tip { font-size: var(--text-xs); color: var(--muted); }
.meal-content { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

/* 餐點卡片 */
.recipe-card {
  background: var(--ground); border: 1px solid var(--border-light); border-radius: var(--radius-md);
  padding: 16px; display: flex; flex-direction: column; gap: 8px; position: relative;
}
.recipe-card.full-width { background: var(--surface); border-color: var(--border); }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.card-title { font-size: var(--text-base); font-weight: 600; color: var(--ink); flex: 1; }
.card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.card-meta { display: flex; justify-content: space-between; align-items: center; }
.cal { font-size: var(--text-xs); color: var(--muted); }
.detail-btn { margin-top: 4px; width: 100%; background: var(--surface) !important; border: 1px solid var(--border-light) !important; }
.detail-btn:hover { background: var(--accent-light) !important; color: var(--accent) !important; }

.empty-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100px; background: var(--ground); border: 1px dashed var(--border); border-radius: var(--radius-md);
  color: var(--muted); cursor: pointer; gap: 4px; transition: border-color var(--transition-fast);
}
.empty-card:hover { border-color: var(--accent); color: var(--accent); }

/* 午晚餐並排與配菜 */
.combined-meals { display: flex; flex-direction: row; gap: var(--space-4); }
.meal-col { flex: 1; display: flex; flex-direction: column; }
.meal-col .meal-section { flex: 1; }
.main-dish { border-color: var(--accent-light); background: var(--surface); }
.side-dish { padding: 12px 16px; background: var(--ground); }
.dish-type-badge {
  position: absolute; top: -1px; left: -1px;
  background: var(--accent); color: white; font-size: 10px; font-weight: 600;
  padding: 2px 8px; border-radius: var(--radius-md) 0 var(--radius-md) 0;
}
.dish-type-badge.side { background: var(--muted); }
.add-side-btn { width: 100%; border-style: dashed; color: var(--muted); }
.add-side-btn:hover { border-color: var(--accent); color: var(--accent); }

/* 加配菜彈窗選項 */
.add-side-options { display: flex; gap: 16px; }
.option-card {
  flex: 1; padding: 24px 16px; border: 1px solid var(--border); border-radius: var(--radius-lg);
  text-align: center; cursor: pointer; transition: border-color var(--transition-fast), background-color var(--transition-fast);
}
.option-card:hover { border-color: var(--accent); background: var(--accent-light); }
.icon-box { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 24px; }
.ai-icon { background: var(--accent-light); color: var(--accent); }
.manual-icon { background: var(--ground); color: var(--muted); }
.option-card h4 { margin: 0 0 8px 0; font-size: var(--text-base); color: var(--ink); font-weight: 600; }
.option-card p { margin: 0; font-size: var(--text-xs); color: var(--muted); line-height: 1.5; }

/* 彈窗樣式 */
.recipe-detail h4 { color: var(--ink); margin: 0 0 12px 0; font-family: var(--font-display); }
.ingredients-list { display: flex; flex-direction: column; gap: 6px; }
.ing-item { display: flex; justify-content: space-between; align-items: center; background: var(--ground); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); }
.ing-name { font-size: var(--text-sm); color: var(--ink); font-weight: 500; }
.steps-list { padding-left: 20px; color: var(--muted); line-height: 1.6; font-size: var(--text-sm); }
.steps-list li { margin-bottom: 6px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: var(--space-4); width: 100%; }

.swap-dialog-content { padding: 0 10px; }
.swap-hint { color: var(--muted); font-size: var(--text-sm); margin-bottom: 16px; }
.swap-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.swap-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--border-light); border-radius: var(--radius-sm); cursor: pointer; transition: border-color var(--transition-fast); }
.swap-item:hover { border-color: var(--accent); background: var(--ground); }
.swap-item-info { display: flex; flex-direction: column; gap: 4px; }
.swap-item-name { font-weight: 500; color: var(--ink); font-size: var(--text-sm); }
.swap-item-cal { font-size: var(--text-xs); color: var(--muted); }

/* =========================================
   📱 手機端專屬自適應
   ========================================= */
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .title-row { flex-direction: column; align-items: flex-start; gap: 4px; margin-bottom: 0; }
  .header-actions { width: 100%; justify-content: space-between; }
  .header-actions .el-button { flex: 1; margin-left: 0 !important; padding: 8px 0; }
  
  /* 日期列手機端靠左，不強制平分 */
  .date-filter-bar { justify-content: flex-start; padding: 8px; gap: 4px; }
  .date-tab { flex: 0 0 auto; min-width: 60px; padding: 8px 0; border-radius: var(--radius-sm); }
  .day-date { font-size: var(--text-sm); }

  /* 每日統計橫向滑動 */
  .daily-stats-bar { padding: 8px 12px; gap: 8px; }

  /* 午晚餐手機端改為上下堆疊 */
  .combined-meals { flex-direction: column; }
  
  .meal-section { border-radius: var(--radius-md); }
  .section-header { padding: 10px 12px; }
  .meal-content { padding: 12px; }
  
  .recipe-card { padding: 12px; }
  .card-title { font-size: var(--text-sm); }
  .detail-btn { display: none; } /* 手機端隱藏查看作法按鈕，直接點擊卡片即可 */
  
  /* 加配菜選項手機端改為上下 */
  .add-side-options { flex-direction: column; }
}
</style>

<style>
.custom-app-dialog { 
  --el-dialog-bg-color: var(--surface); 
  --el-dialog-border-radius: var(--radius-lg); 
  --el-dialog-padding-primary: 24px; 
}
.custom-app-dialog .el-dialog__header { 
  margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light); 
  padding-bottom: 16px; margin-bottom: 16px; 
}
.custom-app-dialog .el-dialog__title { 
  font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); 
}
@media (max-width: 601px) {
  .custom-app-dialog { width: 92vw !important; max-width: 92vw; margin: 4vh auto !important; }
}
</style>