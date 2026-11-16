<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useRecipeStore } from '@/stores/recipe'
import { useInventoryStore } from '@/stores/inventory'
import { useShoppingStore } from '@/stores/shopping'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useToast } from '@/composables/useToast'
import { ElMessage } from 'element-plus'
import { Warning, Food, Timer, Star, StarFilled, CircleCheck, CircleClose, Lock, Delete, MagicStick, InfoFilled, Filter } from '@element-plus/icons-vue'
import RecipeTrashDrawer from '@/components/recipe/RecipeTrashDrawer.vue'

const route = useRoute()
const router = useRouter()
const recipeStore = useRecipeStore()
const inventoryStore = useInventoryStore()
const shoppingStore = useShoppingStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const { showToast } = useToast()

const DAILY_CALORIE_TARGET = 2000

const activeTab = ref('recommend')
const activeMainCategory = ref('全部')
const activeFlavor = ref('全部口味')
const activeFeature = ref('全部特性')
const sortBy = ref('default')
const searchFood = ref(route.query.food || '')

const trashDrawerVisible = ref(false)
const filterDrawerVisible = ref(false) // 🌟 新增：手機端篩選抽屜

const isMobile = ref(false)
function checkMobile() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })

const hasAllergies = computed(() => settingsStore.allergies.length > 0)
const hasDiet = computed(() => settingsStore.dietaryRestrictions.length > 0)
const allRestrictions = computed(() => [...settingsStore.allergies, ...settingsStore.dietaryRestrictions])

watch(() => route.query.food, (newVal) => {
  searchFood.value = newVal || ''
})

const activeFilterCount = computed(() => {
  let count = 0
  if (activeFlavor.value !== '全部口味') count++
  if (activeFeature.value !== '全部特性') count++
  if (sortBy.value !== 'default') count++
  return count
})

function applyFilters(recipes) {
  let recs = [...recipes]
  
  if (searchFood.value) {
    const keyword = searchFood.value.toLowerCase()
    recs = recs.filter(r => 
      r.ingredients.some(ing => ing.toLowerCase().includes(keyword)) ||
      r.name.toLowerCase().includes(keyword)
    )
  }

  if (activeMainCategory.value !== '全部') recs = recs.filter(r => r.mainCategory === activeMainCategory.value)
  if (activeFlavor.value !== '全部口味') recs = recs.filter(r => r.flavor.includes(activeFlavor.value))
  if (activeFeature.value !== '全部特性') recs = recs.filter(r => r.feature.includes(activeFeature.value))
  
  if (sortBy.value === 'caloriesAsc') recs.sort((a, b) => a.calories - b.calories)
  else if (sortBy.value === 'caloriesDesc') recs.sort((a, b) => b.calories - a.calories)
  
  return recs
}

const filteredRecommendations = computed(() => applyFilters(recipeStore.getRecommendations()))
const filteredFavorites = computed(() => applyFilters(recipeStore.favoriteRecipes))

function clearFoodSearch() {
  router.replace({ query: { ...route.query, food: undefined } })
}

function clearAllFilters() {
  activeFlavor.value = '全部口味'
  activeFeature.value = '全部特性'
  sortBy.value = 'default'
}

function getMissingInfo(recipe) {
  const count = recipe.missingIngredients?.length || 0
  if (count === 0) return { text: '食材齊全', type: 'success', icon: CircleCheck }
  if (count <= 2) return { text: `缺 ${count} 樣食材`, type: 'warning', icon: Warning }
  return { text: `缺 ${count} 樣食材`, type: 'danger', icon: CircleClose }
}

// 詳情彈窗與營養圖表
const dialogVisible = ref(false)
const currentRecipe = ref(null)
const macroChartRef = ref(null)
let macroChart = null

const macroData = computed(() => {
  if (!currentRecipe.value) return []
  const r = currentRecipe.value
  const p = r.macros.protein * 4
  const c = r.macros.carbs * 4
  const f = r.macros.fat * 9
  const total = p + c + f
  return [
    { name: '蛋白質', grams: r.macros.protein, value: p, pct: total ? Math.round((p / total) * 100) : 0, color: 'var(--sage)' },
    { name: '碳水化合物', grams: r.macros.carbs, value: c, pct: total ? Math.round((c / total) * 100) : 0, color: 'var(--warning)' },
    { name: '脂肪', grams: r.macros.fat, value: f, pct: total ? Math.round((f / total) * 100) : 0, color: 'var(--accent)' },
  ]
})

function openRecipeDetail(recipe) {
  currentRecipe.value = recipe
  dialogVisible.value = true
  nextTick(() => {
    setTimeout(() => {
      if (macroChartRef.value) {
        if (macroChart) macroChart.dispose()
        macroChart = echarts.init(macroChartRef.value)
        renderMacroChart()
      }
    }, 100)
  })
}

function renderMacroChart() {
  if (!macroChart || !currentRecipe.value) return
  
  const computedStyle = getComputedStyle(document.documentElement)
  const sageColor = computedStyle.getPropertyValue('--sage').trim() || '#5A6B53'
  const warningColor = computedStyle.getPropertyValue('--warning').trim() || '#D9A066'
  const accentColor = computedStyle.getPropertyValue('--accent').trim() || '#C25D3A'

  const data = macroData.value.map(m => ({ name: m.name, value: m.value }))
  macroChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    series: [{
      name: '營養佔比', type: 'pie', radius: ['65%', '90%'], center: ['50%', '50%'],
      avoidLabelOverlap: false, label: { show: false }, labelLine: { show: false },
      data: data, color: [sageColor, warningColor, accentColor]
    }]
  })
}

function handleResize() { macroChart?.resize() }
onMounted(() => window.addEventListener('resize', handleResize))
onUnmounted(() => window.removeEventListener('resize', handleResize))

function handleToggleFavorite(recipe) {
  recipeStore.toggleFavorite(recipe.id)
  if (recipeStore.isFavorite(recipe.id)) ElMessage.success('已加入收藏')
  else ElMessage.info(`已取消收藏「${recipe.name}」`)
}

function handleDeleteFavorite(recipe) {
  recipeStore.toggleFavorite(recipe.id)
  ElMessage.warning(`已將「${recipe.name}」移至回收桶`)
}

function addMissingToShopping(ingredientName) {
  shoppingStore.addItem({ name: ingredientName, quantity: 1, unit: '份' }, true)
  ElMessage.success(`已將「${ingredientName}」加入購物清單！`)
}

function handleCook(recipe) {
  if (!recipe) return
  if (recipe.missingIngredients?.length > 0) return ElMessage.warning('請先補齊缺少的食材才能一鍵扣庫存')
  if (!recipe.isSafe) return ElMessage.error('此食譜含有您的過敏原，已禁止操作！')
  
  let usedCount = 0
  recipe.ingredients.forEach(ingName => {
    const item = inventoryStore.activeFoods.find(f => f.name === ingName)
    if (item) {
      usedCount++
      if (item.quantity > 1) {
        inventoryStore.updateProgress(item.id, item.quantity - 1)
      } else {
        inventoryStore.markAsEaten(item.id)
      }
    }
  })
  
  showToast({
    title: `已完成「${recipe.name}」`,
    message: `已扣除 ${usedCount} 樣食材庫存。`,
    type: 'success',
    actions: [
      { label: '查看購物清單', type: 'primary', handler: () => { router.push('/shopping') } }
    ]
  })

  dialogVisible.value = false
}

function goToSettings() { router.push('/dietary') }
</script>

<template>
  <div class="recipe-container">
    <!-- 頂部標題與工具列 -->
    <div class="page-header">
      <div>
        <h2>AI 食譜推薦</h2>
        <p class="hint">根據您冰箱現有的食材與家庭口味，優先為您推薦料理！</p>
      </div>
      
      <div class="header-actions">
        <el-popover v-if="hasAllergies || hasDiet" placement="bottom-end" :width="340" trigger="click">
          <template #reference>
            <el-tag type="warning" effect="plain" class="allergy-tag" round>
              <el-icon style="margin-right: 6px;"><Lock /></el-icon> 過敏及忌口提醒
            </el-tag>
          </template>
          <div class="guard-detail">
            <h4>已啟用的過敏原與飲食限制</h4>
            <p class="guard-hint">含有以下成分的食譜將半透明顯示並往後排序：</p>
            <div class="guard-tags">
              <el-tag v-for="item in allRestrictions" :key="item" type="danger" size="default" effect="plain">{{ item }}</el-tag>
            </div>
            <el-button size="large" type="primary" plain style="width: 100%; margin-top: 16px;" @click="goToSettings">修改設定</el-button>
          </div>
        </el-popover>

        <el-button type="info" plain :icon="Delete" @click="trashDrawerVisible = true">
          食譜回收桶
        </el-button>
      </div>
    </div>

    <!-- 消耗意圖 Banner -->
    <el-alert
      v-if="searchFood"
      :title="`為你找到 ${filteredRecommendations.length} 道能消耗「${searchFood}」的食譜`"
      type="primary"
      show-icon
      class="food-search-alert"
    >
      <template #default>
        <span class="alert-hint">優先顯示能消耗即期食材的料理</span>
        <el-button size="small" type="primary" plain @click="clearFoodSearch">清除搜尋</el-button>
      </template>
    </el-alert>

    <!-- 篩選區塊 -->
    <div class="filter-section">
      <el-tabs v-model="activeMainCategory" class="main-category-tabs">
        <el-tab-pane v-for="cat in recipeStore.mainCategories" :key="cat" :label="cat" :name="cat" />
      </el-tabs>

      <!-- 電腦端：完整篩選 -->
      <div class="secondary-filters desktop-only">
        <div class="tag-filters">
          <span class="filter-label">口味：</span>
          <el-radio-group v-model="activeFlavor" size="small">
            <el-radio-button v-for="flavor in recipeStore.flavorTags" :key="flavor" :label="flavor" :value="flavor">{{ flavor }}</el-radio-button>
          </el-radio-group>
          
          <span class="filter-label" style="margin-left: 16px;">特性：</span>
          <el-radio-group v-model="activeFeature" size="small">
            <el-radio-button v-for="feat in recipeStore.featureTags" :key="feat" :label="feat" :value="feat">{{ feat }}</el-radio-button>
          </el-radio-group>
        </div>
        
        <el-select v-model="sortBy" placeholder="熱量排序" style="width: 140px;" size="small">
          <el-option label="預設排序" value="default" />
          <el-option label="熱量：低到高" value="caloriesAsc" />
          <el-option label="熱量：高到低" value="caloriesDesc" />
        </el-select>
      </div>

      <!-- 手機端：篩選按鈕 -->
      <div class="mobile-filter-bar mobile-only">
        <el-button 
          :type="activeFilterCount > 0 ? 'primary' : 'default'" 
          plain 
          :icon="Filter" 
          @click="filterDrawerVisible = true"
        >
          篩選 {{ activeFilterCount > 0 ? `(${activeFilterCount})` : '' }}
        </el-button>
        <span class="filter-summary" v-if="activeFilterCount > 0">
          {{ activeFlavor !== '全部口味' ? activeFlavor : '' }}
          {{ activeFeature !== '全部特性' ? activeFeature : '' }}
        </span>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="recipe-tabs">
      <el-tab-pane label="為你推薦" name="recommend">
        <el-empty v-if="filteredRecommendations.length === 0" description="目前沒有符合該條件的食譜，請嘗試放寬篩選。" />
        
        <el-row :gutter="20" class="card-row">
          <el-col v-for="(recipe, index) in filteredRecommendations" :key="recipe.id" :xs="24" :sm="12" :md="8" :lg="6" class="card-col">
            <el-card 
              class="recipe-card" 
              :class="{ 'unsafe-card': !recipe.isSafe }" 
              :data-tour="index === 0 ? 'recipe-card-first' : null"
              shadow="hover" 
              :body-style="{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }"
            >
              <div class="recipe-info">
                <div class="recipe-title-row">
                  <h3>{{ recipe.name }}</h3>
                  <el-button :type="recipeStore.isFavorite(recipe.id) ? 'warning' : 'info'" circle text @click="handleToggleFavorite(recipe)">
                    <el-icon><StarFilled v-if="recipeStore.isFavorite(recipe.id)" /><Star v-else /></el-icon>
                  </el-button>
                </div>

                <div class="meta-tags">
                  <el-tag size="small" type="info" effect="plain">{{ recipe.mainCategory }}</el-tag>
                  <el-tag v-if="recipe.isTasteMatch" size="small" type="success" effect="light" :icon="MagicStick">符合口味</el-tag>
                  <el-tag size="small" type="danger" effect="plain" :icon="Food" class="calorie-tag">
                    {{ recipe.calories }} kcal
                    <span class="calorie-percent">({{ Math.round((recipe.calories / DAILY_CALORIE_TARGET) * 100) }}%)</span>
                  </el-tag>
                </div>
                
                <div class="flavor-tags" v-if="recipe.flavor.length > 0 || recipe.feature.length > 0">
                  <el-tag v-for="f in recipe.flavor" :key="f" size="small" type="warning" effect="light">{{ f }}</el-tag>
                  <el-tag v-for="f in recipe.feature" :key="f" size="small" type="success" effect="light">{{ f }}</el-tag>
                </div>

                <div class="match-info">
                  <el-progress :percentage="recipe.matchScore" :status="recipe.isSafe ? (recipe.matchScore === 100 ? 'success' : '') : 'exception'" />
                  <div class="used-urgent" v-if="recipe.usedUrgentFoods?.length > 0">
                    <el-tag type="danger" size="small" effect="dark">消耗即期品：{{ recipe.usedUrgentFoods.join(', ') }}</el-tag>
                  </div>
                </div>
                
                <div class="missing-info" :class="getMissingInfo(recipe).type">
                  <el-icon><component :is="getMissingInfo(recipe).icon" /></el-icon>
                  {{ getMissingInfo(recipe).text }}
                  <span v-if="recipe.missingIngredients?.length > 0" class="missing-names">({{ recipe.missingIngredients.join(', ') }})</span>
                </div>

                <el-button type="primary" class="detail-btn" @click="openRecipeDetail(recipe)">查看作法</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="我的收藏" name="favorites">
        <el-empty v-if="filteredFavorites.length === 0" description="目前沒有符合該條件的收藏食譜。" />
        
        <el-row :gutter="20" class="card-row">
          <el-col v-for="recipe in filteredFavorites" :key="recipe.id" :xs="24" :sm="12" :md="8" :lg="6" class="card-col">
            <el-card class="recipe-card" shadow="hover" :body-style="{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }">
              <div class="recipe-info">
                <div class="recipe-title-row">
                  <h3>{{ recipe.name }}</h3>
                  <div class="action-icons">
                    <el-button type="danger" circle text @click="handleDeleteFavorite(recipe)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>

                <div class="meta-tags">
                  <el-tag size="small" type="info" effect="plain">{{ recipe.mainCategory }}</el-tag>
                  <el-tag v-if="recipe.isTasteMatch" size="small" type="success" effect="light" :icon="MagicStick">符合口味</el-tag>
                  <el-tag size="small" type="danger" effect="plain" :icon="Food" class="calorie-tag">
                    {{ recipe.calories }} kcal
                    <span class="calorie-percent">({{ Math.round((recipe.calories / DAILY_CALORIE_TARGET) * 100) }}%)</span>
                  </el-tag>
                </div>
                
                <div class="flavor-tags" v-if="recipe.flavor?.length > 0 || recipe.feature?.length > 0">
                  <el-tag v-for="f in recipe.flavor" :key="f" size="small" type="warning" effect="light">{{ f }}</el-tag>
                  <el-tag v-for="f in recipe.feature" :key="f" size="small" type="success" effect="light">{{ f }}</el-tag>
                </div>

                <div class="missing-info" :class="getMissingInfo(recipe).type">
                  <el-icon><component :is="getMissingInfo(recipe).icon" /></el-icon>
                  {{ getMissingInfo(recipe).text }}
                  <span v-if="recipe.missingIngredients?.length > 0" class="missing-names">({{ recipe.missingIngredients.join(', ') }})</span>
                </div>

                <el-button type="primary" class="detail-btn" @click="openRecipeDetail(recipe)">查看作法</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <!-- 手機端篩選抽屜 (Bottom Sheet) -->
    <el-drawer 
      v-model="filterDrawerVisible" 
      direction="btt" 
      size="auto" 
      :with-header="false" 
      class="mobile-filter-drawer"
    >
      <div class="filter-sheet-content">
        <div class="sheet-header">
          <span class="sheet-title">篩選食譜</span>
          <el-button text @click="clearAllFilters">重置</el-button>
        </div>
        
        <div class="sheet-section">
          <h4>口味</h4>
          <div class="filter-tags">
            <el-tag 
              v-for="flavor in recipeStore.flavorTags" 
              :key="flavor" 
              :type="activeFlavor === flavor ? 'primary' : 'info'"
              :effect="activeFlavor === flavor ? 'dark' : 'plain'"
              @click="activeFlavor = flavor"
              round
            >
              {{ flavor }}
            </el-tag>
          </div>
        </div>

        <div class="sheet-section">
          <h4>特性</h4>
          <div class="filter-tags">
            <el-tag 
              v-for="feat in recipeStore.featureTags" 
              :key="feat" 
              :type="activeFeature === feat ? 'primary' : 'info'"
              :effect="activeFeature === feat ? 'dark' : 'plain'"
              @click="activeFeature = feat"
              round
            >
              {{ feat }}
            </el-tag>
          </div>
        </div>

        <div class="sheet-section">
          <h4>排序</h4>
          <div class="filter-tags">
            <el-tag 
              v-for="opt in [{ label: '預設', value: 'default' }, { label: '熱量低到高', value: 'caloriesAsc' }, { label: '熱量高到低', value: 'caloriesDesc' }]"
              :key="opt.value"
              :type="sortBy === opt.value ? 'primary' : 'info'"
              :effect="sortBy === opt.value ? 'dark' : 'plain'"
              @click="sortBy = opt.value"
              round
            >
              {{ opt.label }}
            </el-tag>
          </div>
        </div>

        <el-button type="primary" class="apply-btn" @click="filterDrawerVisible = false">套用篩選</el-button>
      </div>
    </el-drawer>

    <!-- 食譜詳情彈窗 -->
    <el-dialog v-model="dialogVisible" :title="currentRecipe?.name" width="550px" class="custom-app-dialog" @closed="macroChart?.dispose()">
      <div v-if="currentRecipe" class="recipe-detail">
        <el-alert v-if="!currentRecipe.isSafe" title="警告：此食譜含有您的過敏原或禁忌食材！" type="error" show-icon :closable="false" style="margin-bottom: 16px;" />

        <div class="nutrition-section">
          <h4>營養素與熱量分析</h4>
          <div class="chart-and-data">
            <div class="chart-wrapper">
              <div ref="macroChartRef" class="chart-canvas"></div>
              <div class="chart-center-text">
                <span class="cal-num">{{ currentRecipe.calories }}</span>
                <span class="cal-unit">kcal</span>
              </div>
            </div>
            <div class="macro-data">
              <div class="calorie-daily-info">
                <el-icon><InfoFilled /></el-icon>
                佔每日建議攝取量 (2000 kcal) 的 <strong>{{ Math.round((currentRecipe.calories / DAILY_CALORIE_TARGET) * 100) }}%</strong>
              </div>
              <div v-for="m in macroData" :key="m.name" class="macro-item">
                <div class="macro-header">
                  <span class="macro-name">{{ m.name }}</span>
                  <span class="macro-val">{{ m.grams }}g ({{ m.pct }}%)</span>
                </div>
                <el-progress :percentage="m.pct" :color="m.color" :show-text="false" :stroke-width="6" />
              </div>
            </div>
          </div>
        </div>

        <h4>所需食材</h4>
        <div class="ingredients-list">
          <div v-for="ing in currentRecipe.ingredients" :key="ing" class="ing-item">
            <el-tag :type="inventoryStore.activeFoods.some(f => f.name === ing) ? 'success' : 'info'">
              {{ ing }} <span v-if="!inventoryStore.activeFoods.some(f => f.name === ing)">(缺少)</span>
            </el-tag>
            <el-button v-if="!inventoryStore.activeFoods.some(f => f.name === ing)" type="primary" size="small" plain @click="addMissingToShopping(ing)">+ 加入購物車</el-button>
          </div>
        </div>

        <h4 style="margin-top: 20px;">料理步驟</h4>
        <ol class="steps-list">
          <li v-for="(step, index) in currentRecipe.steps" :key="index">{{ step }}</li>
        </ol>
        
        <div class="disclaimer">
          <el-alert title="推薦僅供參考，過敏請自行確認成分" type="info" :closable="false" show-icon />
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">關閉</el-button>
          <el-button type="primary" :disabled="currentRecipe?.missingIngredients?.length > 0 || !currentRecipe?.isSafe" @click="handleCook(currentRecipe)">
            {{ currentRecipe?.isSafe ? '一鍵扣庫存' : '含有過敏原，無法扣庫存' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 食譜回收桶抽屜 -->
    <RecipeTrashDrawer v-model="trashDrawerVisible" />
  </div>
</template>

<style scoped>
.recipe-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
.page-header h2 { margin: 0 0 8px 0; color: var(--ink); font-size: var(--text-xl); font-weight: 700; font-family: var(--font-display); }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }
.header-actions { display: flex; align-items: center; gap: 16px; }

.allergy-tag { 
  cursor: pointer; 
  transition: background-color var(--transition-fast), border-color var(--transition-fast); 
  padding: 8px 16px; 
  font-size: 15px; 
  border-radius: var(--radius-round); 
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-5);
  color: var(--warning);
}
.allergy-tag:hover { background: var(--surface); border-color: var(--warning); }
.guard-detail { padding: 16px; text-align: center; }
.guard-detail h4 { margin: 0 0 12px 0; color: var(--ink); font-size: 18px; font-family: var(--font-display); }
.guard-hint { font-size: 14px; color: var(--muted); margin: 0 0 16px 0; line-height: 1.6; }
.guard-tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 20px; }

.food-search-alert {
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--el-color-primary-light-7);
  background: var(--el-color-primary-light-9);
}
.food-search-alert :deep(.el-alert__content) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.alert-hint { font-size: var(--text-xs); color: var(--accent); }

.filter-section { background: var(--ground); padding: 16px 20px 20px; border-radius: var(--radius-md); border: 1px solid var(--border-light); margin-bottom: 24px; }
.main-category-tabs :deep(.el-tabs__header) { margin-bottom: 16px; }
.main-category-tabs :deep(.el-tabs__item) { font-size: var(--text-base); font-weight: 600; height: 48px; color: var(--muted); }
.main-category-tabs :deep(.el-tabs__item.is-active) { color: var(--accent); }
.main-category-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background: var(--border-light); }
.secondary-filters { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.tag-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.filter-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink); white-space: nowrap; }

/* 手機端篩選按鈕 */
.mobile-filter-bar { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  margin-top: 12px; 
}
.filter-summary {
  font-size: var(--text-xs);
  color: var(--accent);
  background: var(--accent-light);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.recipe-tabs { background: var(--surface); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); }
.card-row { display: flex; flex-wrap: wrap; }
.card-col { display: flex; margin-bottom: 20px; }
.recipe-card { 
  width: 100%; border-radius: var(--radius-lg); overflow: hidden; 
  transition: transform var(--transition-fast), box-shadow var(--transition-fast); 
  border: 1px solid var(--border-light); background-color: var(--surface); 
}
.recipe-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border); }
.unsafe-card { opacity: 0.5; filter: grayscale(0.8); }
.unsafe-card:hover { opacity: 0.9; filter: grayscale(0); }

.recipe-info { padding: 16px; display: flex; flex-direction: column; flex: 1; }
.recipe-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.recipe-title-row h3 { margin: 0; font-size: var(--text-lg); color: var(--ink); font-family: var(--font-display); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.action-icons { display: flex; gap: 4px; }
.meta-tags { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }

.calorie-tag { display: inline-flex; align-items: center; gap: 2px; }
.calorie-percent { font-size: 11px; opacity: 0.8; font-weight: normal; }

.flavor-tags { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }

.match-info { margin-bottom: 12px; }
.used-urgent { margin-top: 8px; min-height: 24px; }

.missing-info { font-size: var(--text-sm); margin-bottom: 12px; display: flex; align-items: center; gap: 4px; min-height: 20px; }
.missing-info.success { color: var(--sage); }
.missing-info.warning { color: var(--warning); }
.missing-info.danger { color: var(--danger); }
.missing-names { font-size: var(--text-xs); opacity: 0.8; margin-left: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

.detail-btn { width: 100%; border-radius: var(--radius-md); margin-top: auto; }

.recipe-detail { text-align: left; }
.recipe-detail h4 { color: var(--ink); margin: 16px 0 8px 0; font-family: var(--font-display); }
.nutrition-section { background: var(--ground); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; border: 1px solid var(--border-light); }
.chart-and-data { display: flex; align-items: center; gap: 20px; }
.chart-wrapper { position: relative; width: 150px; height: 150px; flex-shrink: 0; }
.chart-canvas { width: 100%; height: 100%; }
.chart-center-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; display: flex; flex-direction: column; }
.cal-num { font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; color: var(--ink); line-height: 1.2; }
.cal-unit { font-size: var(--text-xs); color: var(--muted); }

.macro-data { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }

.calorie-daily-info {
  display: flex; align-items: center; gap: 6px; font-size: var(--text-xs);
  color: var(--muted); background: var(--surface); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px dashed var(--border);
}
.calorie-daily-info strong { color: var(--accent); font-size: var(--text-sm); }

.macro-item { display: flex; flex-direction: column; gap: 6px; }
.macro-header { display: flex; justify-content: space-between; font-size: var(--text-sm); }
.macro-name { color: var(--ink); white-space: nowrap; }
.macro-val { color: var(--muted); font-size: var(--text-xs); white-space: nowrap; }

.ingredients-list .ing-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.steps-list { padding-left: 20px; color: var(--muted); line-height: 1.6; font-size: var(--text-sm); }
.steps-list li { margin-bottom: 6px; }
.disclaimer { margin-top: 20px; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }

/* 手機端篩選抽屜 */
.mobile-filter-drawer .el-drawer__body { padding: 0; }
.filter-sheet-content { padding: var(--space-5); background: var(--surface); border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.sheet-title { font-size: var(--text-lg); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.sheet-section { margin-bottom: var(--space-4); }
.sheet-section h4 { margin: 0 0 10px 0; font-size: var(--text-sm); color: var(--muted); font-weight: 600; }
.filter-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.filter-tags .el-tag { cursor: pointer; margin: 0; }
.apply-btn { width: 100%; height: 44px; margin-top: var(--space-3); border-radius: var(--radius-md); }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: space-between; }
  
  .filter-section { padding: 12px; }
  .main-category-tabs :deep(.el-tabs__item) { font-size: var(--text-sm); height: 40px; padding: 0 12px; }
  
  .recipe-tabs { padding: 12px; }
  .card-row { gap: 12px; }
  .card-col { margin-bottom: 0; }
  
  .recipe-info { padding: 12px; }
  .recipe-title-row h3 { font-size: var(--text-base); }
  
  .chart-and-data { flex-direction: column; align-items: center; gap: 16px; }
  .macro-data { width: 100%; }
}
</style>

<style>
.custom-app-dialog { --el-dialog-bg-color: var(--surface); --el-dialog-border-radius: var(--radius-lg); --el-dialog-padding-primary: 24px; }
.custom-app-dialog .el-dialog__header { margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light); padding-bottom: 16px; margin-bottom: 16px; }
.custom-app-dialog .el-dialog__title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); }
@media (max-width: 601px) {
  .custom-app-dialog { width: 92vw !important; max-width: 92vw; margin: 4vh auto !important; }
}
</style>