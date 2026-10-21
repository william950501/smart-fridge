<script setup>
import { ref } from 'vue'
import { useRecipeStore } from '@/stores/recipe'
import { useInventoryStore } from '@/stores/inventory'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, ShoppingCart, Delete, Food } from '@element-plus/icons-vue'

const recipeStore = useRecipeStore()
const inventoryStore = useInventoryStore()

// 食譜詳情彈窗
const dialogVisible = ref(false)
const currentRecipe = ref(null)

// 中文星期對照
const weekDays = {
  Monday: '星期一',
  Tuesday: '星期二',
  Wednesday: '星期三',
  Thursday: '星期四',
  Friday: '星期五',
  Saturday: '星期六',
  Sunday: '星期日',
}
const meals = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐'
}

function handleGenerate() {
  recipeStore.generateWeeklyPlan()
}

function handleAddToShopping() {
  recipeStore.addMissingToShoppingList()
}

function handleClear() {
  ElMessageBox.confirm('確定要清空這週的菜單嗎？', '清空菜單', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    recipeStore.clearMealPlan()
    ElMessage.success('已清空菜單')
  }).catch(() => {})
}

function openRecipeDetail(recipe) {
  if (!recipe) return
  currentRecipe.value = recipe
  dialogVisible.value = true
}

// 檢查食譜是否有缺少的食材
function getMissingCount(recipe) {
  if (!recipe) return 0
  const availableFoods = inventoryStore.activeFoods.map(f => f.name)
  return recipe.ingredients.filter(ing => !availableFoods.includes(ing)).length
}
</script>

<template>
  <div class="meal-plan-container">
    <div class="page-header">
      <div>
        <h2>一週菜單規劃</h2>
        <p class="hint">讓 AI 幫您規劃這週的飲食，並自動計算缺少的食材</p>
      </div>
      <div class="header-actions">
        <el-button type="danger" plain @click="handleClear" icon="Delete">清空菜單</el-button>
        <el-button type="success" plain @click="handleAddToShopping" icon="ShoppingCart">缺少食材加購</el-button>
        <el-button type="primary" @click="handleGenerate" icon="MagicStick">AI 智慧排餐</el-button>
      </div>
    </div>

    <!-- 一週菜單列表 -->
    <div class="week-grid">
      <el-card 
        v-for="(dayMeals, dayKey) in recipeStore.mealPlan" 
        :key="dayKey" 
        class="day-card" 
        shadow="hover"
      >
        <template #header>
          <div class="day-header">
            <span>{{ weekDays[dayKey] }}</span>
            <el-tag v-if="!dayMeals.breakfast && !dayMeals.lunch && !dayMeals.dinner" type="info" size="small">未規劃</el-tag>
          </div>
        </template>
        
        <div class="meals-container">
          <!-- 遍歷早、午、晚餐 -->
          <div 
            v-for="(mealName, mealKey) in meals" 
            :key="mealKey" 
            class="meal-slot"
            :class="{ 'has-recipe': dayMeals[mealKey] }"
          >
            <div class="meal-label">{{ mealName }}</div>
            
            <div 
              v-if="dayMeals[mealKey]" 
              class="recipe-card" 
              @click="openRecipeDetail(dayMeals[mealKey])"
            >
              <div class="recipe-name">{{ dayMeals[mealKey].name }}</div>
              <div class="recipe-meta">
                <el-tag 
                  v-if="getMissingCount(dayMeals[mealKey]) > 0" 
                  type="danger" 
                  size="small" 
                  effect="plain"
                >
                  缺 {{ getMissingCount(dayMeals[mealKey]) }} 樣
                </el-tag>
                <el-tag v-else type="success" size="small" effect="plain">食材齊全</el-tag>
              </div>
            </div>
            
            <div v-else class="empty-meal">
              未安排
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 食譜詳情彈窗 -->
    <el-dialog v-model="dialogVisible" :title="currentRecipe?.name" width="500px" align-center class="custom-app-dialog">
      <div v-if="currentRecipe" class="recipe-detail">
        <h4>所需食材</h4>
        <div class="ingredients-list">
          <el-tag 
            v-for="ing in currentRecipe.ingredients" 
            :key="ing"
            :type="inventoryStore.activeFoods.some(f => f.name === ing) ? 'success' : 'info'"
            style="margin-right: 8px; margin-bottom: 8px;"
          >
            {{ ing }} 
            <span v-if="!inventoryStore.activeFoods.some(f => f.name === ing)">(缺少)</span>
          </el-tag>
        </div>

        <h4 style="margin-top: 20px;">料理步驟</h4>
        <ol class="steps-list">
          <li v-for="(step, index) in currentRecipe.steps" :key="index">{{ step }}</li>
        </ol>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">關閉</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.meal-plan-container { width: 100%; max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 24px; flex-wrap: wrap; gap: 16px;
}
.page-header h2 { margin: 0 0 8px 0; color: var(--el-text-color-primary); }
.hint { color: var(--el-text-color-secondary); font-size: 14px; margin: 0; }
.header-actions { display: flex; gap: 12px; }

/* 一週網格排版 */
.week-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.day-card {
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
}

.day-header {
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 600; color: var(--el-text-color-primary); font-size: 16px;
}

.meals-container { display: flex; flex-direction: column; gap: 12px; }

.meal-slot {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px dashed var(--el-border-color);
  transition: all 0.3s;
}
.meal-slot.has-recipe {
  border-style: solid;
  background: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-light);
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.meal-label {
  width: 40px; font-size: 13px; font-weight: bold;
  color: var(--el-text-color-secondary); flex-shrink: 0;
}

/* 食譜卡片 */
.recipe-card {
  flex: 1; display: flex; flex-direction: column; gap: 6px;
  cursor: pointer; transition: transform 0.2s;
}
.recipe-card:hover { transform: translateY(-2px); }

.recipe-name {
  font-size: 15px; font-weight: 500; color: var(--el-text-color-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.recipe-meta { display: flex; gap: 8px; }

.empty-meal {
  flex: 1; font-size: 13px; color: var(--el-text-color-disabled);
}

/* 詳情彈窗 */
.recipe-detail { text-align: left; }
.recipe-detail h4 { color: var(--el-text-color-primary); margin: 0 0 12px 0; }
.steps-list { padding-left: 20px; color: var(--el-text-color-regular); line-height: 1.6; }
.steps-list li { margin-bottom: 6px; }
.dialog-footer { display: flex; justify-content: center; width: 100%; }
</style>