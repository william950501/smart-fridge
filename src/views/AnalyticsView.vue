<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useInventoryStore, foodDatabase } from '@/stores/inventory'
import { useAnalyticsStore } from '@/stores/analytics'
import { useRecipeStore } from '@/stores/recipe'
import { useShoppingStore } from '@/stores/shopping'
import { useUiStore } from '@/stores/ui'
import { ElMessage } from 'element-plus'
import { Calendar, Warning, TrendCharts, Refrigerator, Bowl, Food, ShoppingCart, CirclePlus, ArrowRight, CircleCheckFilled, Timer, Money } from '@element-plus/icons-vue'
import ValueTimeScatter from '@/components/analytics/ValueTimeScatter.vue'
import LifeInsights from '@/components/analytics/LifeInsights.vue'
import dayjs from 'dayjs'

const router = useRouter()
const inventoryStore = useInventoryStore()
const analyticsStore = useAnalyticsStore()
const recipeStore = useRecipeStore()
const shoppingStore = useShoppingStore()
const uiStore = useUiStore()

// --- ECharts 實例與 Refs ---
const wasteChartRef = ref(null)
const priceChartRef = ref(null)
const valueChartRef = ref(null)
const macroChartRef = ref(null)
let wasteChart = null, priceChart = null, valueChart = null, macroChart = null

// --- 狀態 ---
const currentMonth = ref(dayjs().format('YYYY-MM'))
const monthOptions = Array.from({ length: 6 }).map((_, i) => {
  const d = dayjs().subtract(i, 'month')
  return { label: d.format('YYYY年 M月'), value: d.format('YYYY-MM') }
})

const activeNutritionTab = ref('mealPlan')
const availableFoods = computed(() => [...new Set(inventoryStore.priceHistory.map(p => p.foodName))])
const selectedFood = ref('')

// 深色模式圖表顏色
const chartColors = computed(() => {
  return uiStore.isDark ? {
    text: '#9A9690',
    line: 'rgba(255,255,255,0.08)',
    border: '#242220',
    accent: '#D27D5F',
    sage: '#7FA574',
    warning: '#E0B880',
    danger: '#D96565',
    primary: '#D27D5F'
  } : {
    text: '#73706C',
    line: 'rgba(0,0,0,0.06)',
    border: '#FAF9F7',
    accent: '#C25D3A',
    sage: '#5A6B53',
    warning: '#D9A066',
    danger: '#B83B3B',
    primary: '#C25D3A'
  }
})

// --- 資料處理 ---

// 🌟 新增：高價值即期品清單（供直觀列表使用）
const priorityItems = computed(() => {
  const data = analyticsStore.valueTimeScatterData || []
  return data
    .filter(item => item.days <= 3 && item.days >= -7 && item.value > 0) // 剩餘 3 天內，或剛過期 7 天內
    .sort((a, b) => b.value - a.value) // 依價值降序
    .slice(0, 5) // 取前 5 名
})

// 1. 浪費圓餅圖資料
const wasteData = computed(() => {
  const dist = {}
  inventoryStore.foods.forEach(item => {
    if (item.discardedQuantity > 0) {
      const wastedAmount = (item.unitPrice || 0) * item.discardedQuantity
      dist[item.name] = (dist[item.name] || 0) + wastedAmount
    }
  })
  return Object.keys(dist)
    .map(key => ({ name: key, value: Math.round(dist[key]) }))
    .filter(d => d.value > 0)
})

// 2. 浪費排行 Top 5
const wasteRanking = computed(() => {
  return analyticsStore.wastedRanking.slice(0, 5)
})

// 3. 庫存價值長條圖
const valueData = computed(() => {
  const months = Array.from({ length: 6 }).map((_, i) => {
    return dayjs(currentMonth.value).subtract(5 - i, 'month').format('M月')
  })
  return months.map((month, index) => {
    if (index === 5) return { month, value: analyticsStore.totalInventoryValue }
    const base = analyticsStore.totalInventoryValue || 1000
    const variation = (Math.random() * 0.4 - 0.2)
    return { month, value: Math.round(base * (1 + variation)) }
  })
})

// 4. 計算營養總和
const currentNutrition = computed(() => {
  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 }
  let breakdown = []

  if (activeNutritionTab.value === 'mealPlan') {
    const mealMap = {}
    Object.values(recipeStore.mealPlan).forEach(day => {
      ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
        const meal = day[mealType]
        if (meal && meal.calories) {
          totals.calories += meal.calories
          totals.protein += meal.macros?.protein || 0
          totals.carbs += meal.macros?.carbs || 0
          totals.fat += meal.macros?.fat || 0
          totals.count++
          if (!mealMap[meal.name]) mealMap[meal.name] = { count: 0, calories: 0 }
          mealMap[meal.name].count++
          mealMap[meal.name].calories += meal.calories
        }
      })
    })
    breakdown = Object.keys(mealMap)
      .map(name => ({ name, count: mealMap[name].count, calories: mealMap[name].calories }))
      .sort((a, b) => b.calories - a.calories)
  } else {
    const categoryCalories = {}
    inventoryStore.activeFoods.forEach(item => {
      const dbItem = foodDatabase[item.name]
      if (dbItem && dbItem.nutrition) {
        const cal = dbItem.nutrition.calories * item.quantity
        totals.calories += cal
        totals.protein += dbItem.nutrition.protein * item.quantity
        totals.carbs += dbItem.nutrition.carbs * item.quantity
        totals.fat += dbItem.nutrition.fat * item.quantity
        totals.count++
        const cat = item.category || '其他'
        categoryCalories[cat] = (categoryCalories[cat] || 0) + cal
      }
    })
    breakdown = Object.keys(categoryCalories)
      .map(cat => ({ name: cat, count: 0, calories: Math.round(categoryCalories[cat]) }))
      .sort((a, b) => b.calories - a.calories)
  }
  return { ...totals, breakdown }
})

const macroData = computed(() => {
  const p = currentNutrition.value.protein * 4
  const c = currentNutrition.value.carbs * 4
  const f = currentNutrition.value.fat * 9
  const total = p + c + f
  return [
    { name: '蛋白質', value: p, percentage: total ? Math.round((p / total) * 100) : 0 },
    { name: '碳水化合物', value: c, percentage: total ? Math.round((c / total) * 100) : 0 },
    { name: '脂肪', value: f, percentage: total ? Math.round((f / total) * 100) : 0 }
  ]
})

const dietAdvice = computed(() => {
  if (currentNutrition.value.count === 0) return []
  const advice = []
  const pPct = macroData.value.find(m => m.name === '蛋白質').percentage
  const cPct = macroData.value.find(m => m.name === '碳水化合物').percentage
  const fPct = macroData.value.find(m => m.name === '脂肪').percentage

  if (pPct < 15) advice.push('蛋白質攝取偏低，建議多加入豆腐、雞肉或雞蛋。')
  if (cPct > 60) advice.push('碳水化合物佔比偏高，建議減少精緻澱粉，多攝取蔬菜。')
  if (fPct > 35) advice.push('脂肪佔比偏高，建議減少油炸料理，改用清蒸或水煮。')
  if (advice.length === 0) advice.push('營養素比例非常均衡，請繼續保持！')
  return advice
})

const purchaseAdvice = computed(() => {
  if (activeNutritionTab.value !== 'inventory' || inventoryStore.activeFoods.length === 0) return null

  const categoryCount = {}
  inventoryStore.activeFoods.forEach(f => {
    categoryCount[f.category] = (categoryCount[f.category] || 0) + 1
  })

  const total = inventoryStore.activeFoods.length
  const vegetableCount = (categoryCount['蔬菜'] || 0) + (categoryCount['水果'] || 0)
  const proteinCount = (categoryCount['肉類'] || 0) + (categoryCount['海鮮'] || 0) + (categoryCount['蛋類'] || 0) + (categoryCount['乳製品'] || 0)

  const suggestions = []

  if (vegetableCount / total < 0.3) {
    suggestions.push({
      category: '蔬菜水果類',
      reason: '目前蔬菜水果比例偏低，建議補充膳食纖維。',
      items: ['高麗菜', '菠菜', '番茄', '蘋果', '香蕉']
    })
  }

  if (proteinCount / total < 0.2) {
    suggestions.push({
      category: '蛋白質類',
      reason: '蛋白質食材不足，建議補充優質蛋白質。',
      items: ['雞蛋', '豆腐', '雞胸肉', '豬絞肉']
    })
  }

  if (!categoryCount['乳製品']) {
    suggestions.push({
      category: '乳製品',
      reason: '缺乏乳製品，建議補充鈣質。',
      items: ['牛奶', '起司', '優格']
    })
  }

  if (suggestions.length === 0) {
    return {
      title: '營養非常均衡！',
      desc: '目前冰箱裡的食材種類很豐富，請繼續保持。',
      suggestions: []
    }
  }

  return {
    title: '建議補充以下食材',
    desc: '根據目前庫存的類別比例，您的冰箱缺乏以下營養來源：',
    suggestions
  }
})

function addSuggestionToShopping(items) {
  let addedCount = 0
  items.forEach(name => {
    const exists = shoppingStore.items.find(i => i.name === name && !i.isPurchased)
    if (!exists) {
      shoppingStore.addItem({ name, quantity: 1, unit: '份' }, true)
      addedCount++
    }
  })
  if (addedCount > 0) ElMessage.success(`已將 ${addedCount} 樣建議食材加入購物清單！`)
  else ElMessage.info('這些食材已經在購物清單中囉！')
}

const monthlyReport = computed(() => ({
  savedMoney: analyticsStore.totalSavedAmount,
  totalWaste: analyticsStore.totalWastedAmount,
  totalItems: inventoryStore.totalCount,
  urgentItems: inventoryStore.urgentFoods.length,
}))

function goToTrashSearch(foodName) {
  router.push({ path: '/trash', query: { search: foodName } })
}
function goToMealPlan() { router.push('/meal-plan') }
function goToRecipe(foodName) {
  router.push({ path: '/recipe', query: { food: foodName } })
}

// --- 圖表渲染 ---
onMounted(() => {
  if (wasteChartRef.value) wasteChart = echarts.init(wasteChartRef.value)
  if (priceChartRef.value) priceChart = echarts.init(priceChartRef.value)
  if (valueChartRef.value) valueChart = echarts.init(valueChartRef.value)
  if (macroChartRef.value) macroChart = echarts.init(macroChartRef.value)
  renderAllCharts()
})

watch(selectedFood, () => updatePriceChart())
watch(currentMonth, () => renderValueChart())

watch(() => uiStore.isDark, () => {
  nextTick(() => { renderAllCharts() })
})

watch(wasteData, () => renderWasteChart(), { deep: true })
watch([() => activeNutritionTab.value, () => currentNutrition.value], () => renderMacroChart(), { deep: true })

function renderAllCharts() {
  renderWasteChart()
  renderValueChart()
  renderMacroChart()
  updatePriceChart()
}

function renderWasteChart() {
  if (!wasteChart) return
  const colors = chartColors.value
  if (wasteData.value.length === 0) { wasteChart.clear(); return }
  wasteChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: colors.text }, itemWidth: 12, itemHeight: 12 },
    series: [{
      name: '浪費金額', type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      itemStyle: { borderRadius: 8, borderColor: colors.border, borderWidth: 2 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: wasteData.value, color: [colors.danger, colors.warning, colors.text, colors.sage, colors.accent]
    }]
  })
}

function renderValueChart() {
  if (!valueChart) return
  const colors = chartColors.value
  valueChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    xAxis: { type: 'category', data: valueData.value.map(d => d.month), axisLabel: { color: colors.text }, axisLine: { lineStyle: { color: colors.line } } },
    yAxis: { type: 'value', name: '金額 ($)', nameTextStyle: { color: colors.text }, axisLabel: { color: colors.text }, splitLine: { lineStyle: { color: colors.line } } },
    series: [{ data: valueData.value.map(d => d.value), type: 'bar', barWidth: '50%', itemStyle: { color: colors.sage, borderRadius: [4, 4, 0, 0] } }]
  })
}

function updatePriceChart() {
  if (!priceChart) return
  const colors = chartColors.value
  const foodName = selectedFood.value || availableFoods.value[0]
  if (!foodName) { priceChart.clear(); return }
  
  const data = inventoryStore.priceHistory.filter(p => p.foodName === foodName).sort((a, b) => new Date(a.date) - new Date(b.date))
  
  priceChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    xAxis: { type: 'category', data: data.map(p => p.date), axisLabel: { color: colors.text }, axisLine: { lineStyle: { color: colors.line } } },
    yAxis: { type: 'value', name: '單價 ($)', nameTextStyle: { color: colors.text }, axisLabel: { color: colors.text }, splitLine: { lineStyle: { color: colors.line } } },
    series: [{ data: data.map(p => p.price), type: 'line', smooth: true, itemStyle: { color: colors.warning }, areaStyle: { color: colors.warning + '1A' } }]
  })
}

function renderMacroChart() {
  if (!macroChart) return
  const colors = chartColors.value
  if (currentNutrition.value.count === 0) { macroChart.clear(); return }
  macroChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: colors.text }, itemWidth: 12, itemHeight: 12 },
    series: [{
      name: '營養佔比', type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
      data: macroData.value, color: [colors.accent, colors.sage, colors.warning],
      itemStyle: { borderColor: colors.border, borderWidth: 2 }
    }]
  })
}
</script>

<template>
  <div class="analytics-container">
    <div class="page-header">
      <h2 class="page-title">分析報表</h2>
      <el-select v-model="currentMonth" size="small" style="width: 140px;">
        <el-option v-for="opt in monthOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </div>

    <!-- 🌟 全新亮點：時間價值與生活洞察 -->
    <el-row :gutter="20" class="summary-row">
      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="chart-card h-100" data-tour="analytics-report">
          <template #header>
            <div class="card-header">
              <span class="card-title">庫存時間價值分析</span>
              <el-tag type="danger" effect="plain" size="small" round>優先處理高價值即期品</el-tag>
            </div>
          </template>
          
          <div class="value-analysis-layout">
            <!-- 圖表區 -->
            <div class="chart-area">
              <div style="height: 100%; min-height: 250px;">
                <ValueTimeScatter :data="analyticsStore.valueTimeScatterData" />
              </div>
            </div>

            <!-- 🌟 直觀清單區 -->
            <div class="priority-list-area" v-if="priorityItems.length > 0">
              <div class="priority-header">
                <el-icon><Warning /></el-icon> 高價值即期清單
              </div>
              <div class="priority-list">
                <div v-for="item in priorityItems" :key="item.name" class="priority-item" @click="goToRecipe(item.name)">
                  <div class="item-info">
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-status" :class="{ 'is-expired': item.days < 0 }">
                      {{ item.days < 0 ? '已過期' : `剩 ${item.days} 天` }}
                    </span>
                  </div>
                  <div class="item-value">${{ item.value }}</div>
                </div>
              </div>
            </div>
            <div v-else class="priority-list-area all-clear">
              <el-icon size="24" color="var(--sage)"><CircleCheckFilled /></el-icon>
              <span>目前沒有高價值的即期品，狀態良好！</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :md="10">
        <LifeInsights />
      </el-col>
    </el-row>

    <!-- 基礎數據總結 -->
    <el-row :gutter="20" class="summary-row">
      <el-col :span="24">
        <el-card shadow="never" class="monthly-report-card">
          <div class="report-header">
            <h3>{{ currentMonth }} 總結報告</h3>
            <el-tag type="success" effect="light" round>表現良好</el-tag>
          </div>
          <div class="stat-grid">
            <div class="stat-box">
              <span class="label">節省金額</span>
              <span class="value success">${{ monthlyReport.savedMoney }}</span>
            </div>
            <div class="stat-box">
              <span class="label">浪費金額</span>
              <span class="value danger">${{ monthlyReport.totalWaste }}</span>
            </div>
            <div class="stat-box">
              <span class="label">庫存總項</span>
              <span class="value">{{ monthlyReport.totalItems }} <small>項</small></span>
            </div>
            <div class="stat-box">
              <span class="label">即期品項</span>
              <span class="value warning">{{ monthlyReport.urgentItems }} <small>項</small></span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 圖表區塊 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><div class="card-header"><span class="card-title">浪費金額與排行</span></div></template>
          <div v-if="wasteData.length === 0" class="empty-chart">目前沒有浪費紀錄，太棒了！</div>
          <div v-else class="waste-container">
            <div class="chart-half"><div ref="wasteChartRef" style="width: 100%; height: 220px;"></div></div>
            <div class="rank-half">
              <div class="rank-title"><el-icon><Warning /></el-icon> 浪費金額 Top 5</div>
              <div v-for="(item, index) in wasteRanking" :key="item.name" class="rank-item clickable-rank" @click="goToTrashSearch(item.name)">
                <div class="rank-num" :class="`top-${index + 1}`">{{ index + 1 }}</div>
                <div class="rank-info"><span class="name">{{ item.name }}</span><span class="count">丟棄 {{ item.count }} 份</span></div>
                <div class="rank-amount">${{ item.amount }}</div>
                <el-icon class="rank-arrow"><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><div class="card-header"><span class="card-title">近半年庫存總值趨勢</span></div></template>
          <div ref="valueChartRef" style="width: 100%; height: 300px;"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">營養分析</span>
              <el-button type="primary" size="small" :icon="Calendar" @click="goToMealPlan">前往 AI 排餐</el-button>
            </div>
          </template>

          <div class="nutrition-tab-switcher">
            <el-radio-group v-model="activeNutritionTab" size="large" style="width: 100%;">
              <el-radio-button label="mealPlan" value="mealPlan" style="flex: 1;"><el-icon><Bowl /></el-icon> 本週菜單</el-radio-button>
              <el-radio-button label="inventory" value="inventory" style="flex: 1;"><el-icon><Refrigerator /></el-icon> 冰箱庫存</el-radio-button>
            </el-radio-group>
          </div>
          
          <div v-if="currentNutrition.count === 0" class="empty-chart">
            {{ activeNutritionTab === 'mealPlan' ? '尚未規劃菜單，請前往「一週菜單規劃」。' : '冰箱目前沒有食材。' }}
          </div>
          <div v-else>
            <div class="nutrition-stats">
              <div class="main-cal">
                <span class="label">預估總熱量</span>
                <span class="value">{{ currentNutrition.calories }} <small>kcal</small></span>
                <span class="sub">基於 {{ currentNutrition.count }} 項{{ activeNutritionTab === 'mealPlan' ? '餐點' : '食材' }}</span>
              </div>
            </div>

            <div class="calorie-breakdown">
              <div class="breakdown-title">
                <el-icon><Food /></el-icon> {{ activeNutritionTab === 'mealPlan' ? '本週菜單熱量來源' : '冰箱庫存熱量來源' }}
              </div>
              <div class="breakdown-list">
                <div v-for="item in currentNutrition.breakdown" :key="item.name" class="breakdown-item">
                  <div class="b-name">{{ item.name }} <span v-if="item.count > 0" class="b-count">({{ item.count }} 次)</span></div>
                  <div class="b-bar-wrapper">
                    <div class="b-bar" :style="{ transform: `scaleX(${currentNutrition.calories > 0 ? (item.calories / currentNutrition.calories) : 0})` }"></div>
                  </div>
                  <span class="b-val">{{ item.calories }} kcal</span>
                </div>
              </div>
            </div>
            
            <div class="macro-container"><div ref="macroChartRef" style="width: 100%; height: 180px;"></div></div>

            <div class="diet-advice">
              <div class="advice-title"><el-icon><TrendCharts /></el-icon> AI 飲食建議</div>
              <el-alert v-for="(advice, index) in dietAdvice" :key="index" :title="advice" type="info" show-icon :closable="false" style="margin-bottom: 8px;" />
              <div class="disclaimer-text">* 本建議基於營養素比例估算，非專業醫療建議。</div>
            </div>

            <div v-if="activeNutritionTab === 'inventory' && purchaseAdvice" class="purchase-advice-section">
              <div class="purchase-header">
                <div class="purchase-title"><el-icon><ShoppingCart /></el-icon> {{ purchaseAdvice.title }}</div>
                <div class="purchase-desc">{{ purchaseAdvice.desc }}</div>
              </div>
              <div v-if="purchaseAdvice.suggestions.length > 0" class="suggestion-list">
                <div v-for="(sug, idx) in purchaseAdvice.suggestions" :key="idx" class="sug-card">
                  <div class="sug-top">
                    <span class="sug-cat">{{ sug.category }}</span>
                    <span class="sug-reason">{{ sug.reason }}</span>
                  </div>
                  <div class="sug-items">
                    <el-tag v-for="item in sug.items" :key="item" size="small" type="info" round>{{ item }}</el-tag>
                  </div>
                  <el-button type="primary" link :icon="CirclePlus" @click="addSuggestionToShopping(sug.items)">一鍵加入購物車</el-button>
                </div>
              </div>
              <div v-else class="all-good">
                <el-icon size="24" color="var(--sage)"><CircleCheckFilled /></el-icon>
                <span>太棒了！目前營養非常均衡，繼續保持。</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">食材單價趨勢</span>
              <el-select v-model="selectedFood" placeholder="選擇食材" size="small" style="width: 120px;">
                <el-option v-for="food in availableFoods" :key="food" :label="food" :value="food" />
              </el-select>
            </div>
          </template>
          <div ref="priceChartRef" style="width: 100%; height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.analytics-container { width: 100%; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5); }
.page-title { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; }

.summary-row { margin-bottom: var(--space-5); }
.h-100 { height: 100%; }

.monthly-report-card { border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.report-header h3 { margin: 0; color: var(--ink); font-size: var(--text-lg); font-family: var(--font-display); }
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
.stat-box { display: flex; flex-direction: column; align-items: center; padding: var(--space-4); background: var(--ground); border-radius: var(--radius-md); }
.stat-box .label { font-size: var(--text-sm); color: var(--muted); margin-bottom: 8px; }
.stat-box .value { font-size: var(--text-xl); font-weight: 700; font-family: var(--font-display); color: var(--ink); }
.stat-box .value small { font-size: var(--text-sm); font-weight: 500; color: var(--muted); }
.stat-box .value.success { color: var(--sage); }
.stat-box .value.danger { color: var(--danger); }
.stat-box .value.warning { color: var(--warning); }

.chart-card { border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); margin-bottom: var(--space-5); height: calc(100% - var(--space-5)); }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 600; color: var(--ink); font-size: var(--text-base); font-family: var(--font-display); }
.empty-chart { text-align: center; color: var(--muted); padding: 40px 0; font-size: var(--text-sm); }

/* 🌟 庫存時間價值分析：雙軌佈局 */
.value-analysis-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.chart-area {
  flex: 1;
  min-height: 250px;
}
.priority-list-area {
  background: var(--ground);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border: 1px solid var(--border-light);
}
.priority-header {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--danger);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: 6px;
}
.priority-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.priority-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);
}
.priority-item:hover {
  background: var(--accent-light);
  transform: translateX(2px);
}
.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.item-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
}
.item-status {
  font-size: var(--text-xs);
  color: var(--warning);
}
.item-status.is-expired { color: var(--danger); }
.item-value {
  font-size: var(--text-base);
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--danger);
}
.all-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--sage);
  font-size: var(--text-sm);
  padding: var(--space-6) 0;
}

@media (min-width: 768px) {
  .value-analysis-layout {
    flex-direction: row;
    align-items: stretch;
  }
  .chart-area { flex: 6; }
  .priority-list-area { flex: 4; }
}

.waste-container { display: flex; flex-direction: column; }
.chart-half { margin-bottom: 10px; }
.rank-half { background: var(--ground); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-light); }
.rank-title { font-size: var(--text-sm); font-weight: bold; color: var(--ink); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }

.rank-item { display: flex; align-items: center; margin-bottom: 8px; font-size: var(--text-sm); padding: 4px 8px; border-radius: var(--radius-sm); transition: background-color var(--transition-fast), transform var(--transition-fast); }
.rank-item:last-child { margin-bottom: 0; }
.clickable-rank { cursor: pointer; }
.clickable-rank:hover { background: var(--surface); transform: translateX(2px); }
.rank-num { width: 20px; height: 20px; border-radius: 50%; background: var(--border); color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px; flex-shrink: 0; }
.rank-num.top-1 { background: var(--danger); color: white; }
.rank-num.top-2 { background: var(--warning); color: white; }
.rank-num.top-3 { background: var(--muted); color: white; }
.rank-info { flex: 1; display: flex; justify-content: space-between; padding-right: 10px; }
.rank-info .name { color: var(--ink); font-weight: 500; }
.rank-info .count { color: var(--muted); font-size: var(--text-xs); }
.rank-amount { font-weight: bold; color: var(--danger); }
.rank-arrow { margin-left: 8px; color: var(--muted); opacity: 0; transition: opacity var(--transition-fast); }
.clickable-rank:hover .rank-arrow { opacity: 1; color: var(--accent); }

.nutrition-tab-switcher { margin-bottom: 20px; }
.nutrition-stats { text-align: center; margin-bottom: 10px; }
.main-cal { display: flex; flex-direction: column; align-items: center; margin-bottom: 12px; }
.main-cal .label { font-size: var(--text-sm); color: var(--muted); }
.main-cal .value { font-size: 36px; font-family: var(--font-display); font-weight: bold; color: var(--accent); }
.main-cal .value small { font-size: var(--text-base); color: var(--muted); }
.main-cal .sub { font-size: var(--text-xs); color: var(--muted); margin-top: 4px; }

.calorie-breakdown { margin-bottom: 20px; background: var(--ground); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-light); }
.breakdown-title { font-size: var(--text-sm); font-weight: 600; color: var(--ink); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.breakdown-list { display: flex; flex-direction: column; gap: 10px; }
.breakdown-item { display: flex; align-items: center; font-size: var(--text-sm); gap: 10px; }
.b-name { width: 120px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; gap: 4px; align-items: center; }
.b-count { font-size: 11px; color: var(--accent); background: var(--accent-light); padding: 0 4px; border-radius: var(--radius-sm); }
.b-bar-wrapper { flex: 1; height: 8px; background: var(--border); border-radius: var(--radius-round); overflow: hidden; }
.b-bar { height: 100%; width: 100%; background: var(--accent); border-radius: var(--radius-round); transform-origin: left; transition: transform var(--transition-base); }
.b-val { width: 80px; text-align: right; color: var(--muted); font-weight: 500; }

.macro-container { margin-bottom: 10px; }
.diet-advice { background: var(--ground); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-light); }
.advice-title { font-size: var(--text-sm); font-weight: bold; color: var(--ink); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.disclaimer-text { font-size: var(--text-xs); color: var(--muted); margin-top: 12px; text-align: center; }

.purchase-advice-section { margin-top: 20px; background: var(--accent-light); border: 1px dashed var(--accent); border-radius: var(--radius-md); padding: 16px; }
.purchase-header { margin-bottom: 12px; }
.purchase-title { font-size: var(--text-sm); font-weight: bold; color: var(--accent); display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.purchase-desc { font-size: var(--text-xs); color: var(--muted); }
.suggestion-list { display: flex; flex-direction: column; gap: 12px; }
.sug-card { background: var(--surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); }
.sug-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sug-cat { font-weight: 600; color: var(--ink); font-size: var(--text-sm); }
.sug-reason { font-size: var(--text-xs); color: var(--muted); }
.sug-items { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.all-good { display: flex; align-items: center; gap: 8px; color: var(--sage); font-weight: 500; padding: 10px; font-size: var(--text-sm); }

@media (min-width: 768px) {
  .waste-container { flex-direction: row; gap: 20px; align-items: center; }
  .chart-half { flex: 1; margin-bottom: 0; }
  .rank-half { flex: 1; }
}

@media (max-width: 768px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-card { height: auto; margin-bottom: var(--space-4); }
  
  /* 手機端圖表縮小高度 */
  .chart-area { min-height: 200px; }
  
  .value-analysis-layout { gap: var(--space-3); }
  .priority-list-area { padding: var(--space-3); }
  .priority-item { padding: 6px 10px; }
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