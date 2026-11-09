<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useInventoryStore, foodDatabase } from '@/stores/inventory'
import { useAnalyticsStore } from '@/stores/analytics'
import { useRecipeStore } from '@/stores/recipe'
import { useShoppingStore } from '@/stores/shopping'
import { ElMessage } from 'element-plus'
import { Calendar, Warning, TrendCharts, Refrigerator, Bowl, Food, ShoppingCart, CirclePlus } from '@element-plus/icons-vue'

const router = useRouter()
const inventoryStore = useInventoryStore()
const analyticsStore = useAnalyticsStore()
const recipeStore = useRecipeStore()
const shoppingStore = useShoppingStore()

// --- ECharts 實例與 Refs ---
const wasteChartRef = ref(null)
const priceChartRef = ref(null)
const valueChartRef = ref(null)
const macroChartRef = ref(null)
let wasteChart = null, priceChart = null, valueChart = null, macroChart = null

// --- 狀態 ---
const activeNutritionTab = ref('mealPlan')
const availableFoods = computed(() => [...new Set(inventoryStore.priceHistory.map(p => p.foodName))])
const selectedFood = ref('')

// --- 資料處理 ---

// 1. 浪費圓餅圖資料
const wasteData = computed(() => {
  const dist = {}
  analyticsStore.wastedItems.forEach(item => {
    dist[item.name] = (dist[item.name] || 0) + (item.price / item.quantity) * item.discardQuantity
  })
  return Object.keys(dist).map(key => ({ name: key, value: Math.round(dist[key]) }))
})

// 2. 浪費排行 Top 5
const wasteRanking = computed(() => {
  const dist = {}
  analyticsStore.wastedItems.forEach(item => {
    if (!dist[item.name]) dist[item.name] = { count: 0, amount: 0 }
    dist[item.name].count += item.discardQuantity
    dist[item.name].amount += (item.price / item.quantity) * item.discardQuantity
  })
  return Object.keys(dist)
    .map(key => ({ name: key, count: dist[key].count, amount: Math.round(dist[key].amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
})

// 3. 庫存價值長條圖
const valueData = ref([
  { month: '5月', value: 1200 }, { month: '6月', value: 1500 },
  { month: '7月', value: 1100 }, { month: '8月', value: 1800 },
  { month: '9月', value: 1600 }, { month: '10月', value: analyticsStore.totalInventoryValue },
])

// 4. 計算營養總和與明細
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
          totals.protein += meal.macros.protein
          totals.carbs += meal.macros.carbs
          totals.fat += meal.macros.fat
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

// 計算三大營養素佔比
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

// AI 飲食建議
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

// 🌟 新增：健康採購建議邏輯
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

// 一鍵將建議加入購物清單
function addSuggestionToShopping(items) {
  let addedCount = 0
  items.forEach(name => {
    const exists = shoppingStore.items.find(i => i.name === name && !i.isPurchased)
    if (!exists) {
      shoppingStore.addItem({ name, quantity: 1, unit: '份' })
      addedCount++
    }
  })
  if (addedCount > 0) {
    ElMessage.success(`已將 ${addedCount} 樣建議食材加入購物清單！`)
  } else {
    ElMessage.info('這些食材已經在購物清單中囉！')
  }
}

const monthlyReport = computed(() => ({
  savedMoney: 320,
  totalWaste: analyticsStore.totalWastedAmount,
  totalItems: inventoryStore.totalCount,
  urgentItems: inventoryStore.urgentFoods.length,
}))

// --- 圖表渲染 ---
onMounted(() => {
  if (wasteChartRef.value) wasteChart = echarts.init(wasteChartRef.value)
  if (priceChartRef.value) priceChart = echarts.init(priceChartRef.value)
  if (valueChartRef.value) valueChart = echarts.init(valueChartRef.value)
  if (macroChartRef.value) macroChart = echarts.init(macroChartRef.value)
  renderWasteChart(); renderValueChart(); renderMacroChart(); updatePriceChart()
})

watch(selectedFood, () => updatePriceChart())
watch(wasteData, () => renderWasteChart(), { deep: true })
watch([() => activeNutritionTab.value, () => currentNutrition.value], () => renderMacroChart(), { deep: true })

function renderWasteChart() {
  if (!wasteChart) return
  if (wasteData.value.length === 0) { wasteChart.clear(); return }
  wasteChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: 'var(--el-text-color-primary)' }, itemWidth: 12, itemHeight: 12 },
    series: [{ name: '浪費金額', type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'], itemStyle: { borderRadius: 8, borderColor: 'var(--el-bg-color)', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } }, data: wasteData.value, color: ['#f56c6c', '#e6a23c', '#909399', '#67c23a', '#409eff'] }]
  })
}

function renderValueChart() {
  if (!valueChart) return
  valueChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    xAxis: { type: 'category', data: valueData.value.map(d => d.month), axisLabel: { color: 'var(--el-text-color-regular)' } },
    yAxis: { type: 'value', name: '金額 ($)', axisLabel: { color: 'var(--el-text-color-regular)' }, splitLine: { lineStyle: { color: 'var(--el-border-color-light)' } } },
    series: [{ data: valueData.value.map(d => d.value), type: 'bar', barWidth: '50%', itemStyle: { color: '#67c23a', borderRadius: [4, 4, 0, 0] } }]
  })
}

function updatePriceChart() {
  if (!priceChart) return
  const foodName = selectedFood.value || availableFoods.value[0]
  if (!foodName) return
  const data = inventoryStore.priceHistory.filter(p => p.foodName === foodName).sort((a, b) => new Date(a.date) - new Date(b.date))
  priceChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    xAxis: { type: 'category', data: data.map(p => p.date), axisLabel: { color: 'var(--el-text-color-regular)' } },
    yAxis: { type: 'value', name: '單價 ($)', axisLabel: { color: 'var(--el-text-color-regular)' }, splitLine: { lineStyle: { color: 'var(--el-border-color-light)' } } },
    series: [{ data: data.map(p => p.price), type: 'line', smooth: true, itemStyle: { color: '#e6a23c' }, areaStyle: { color: 'rgba(230, 162, 60, 0.1)' } }]
  })
}

function renderMacroChart() {
  if (!macroChart) return
  if (currentNutrition.value.count === 0) { macroChart.clear(); return }
  macroChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: 'var(--el-text-color-primary)' }, itemWidth: 12, itemHeight: 12 },
    series: [{ name: '營養佔比', type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'], data: macroData.value, color: ['#409eff', '#67c23a', '#e6a23c'] }]
  })
}

function goToMealPlan() { router.push('/meal-plan') }
</script>

<template>
  <div class="analytics-container">
    <h2 class="page-title">分析報表</h2>

    <el-row :gutter="20" class="summary-row">
      <el-col :span="24">
        <el-card shadow="hover" class="monthly-report-card">
          <div class="report-header">
            <h3>本月總結報告</h3>
            <el-tag type="success">表現良好</el-tag>
          </div>
          <el-row :gutter="20">
            <el-col :xs="12" :sm="6"><div class="stat-box"><span class="label">節省金額</span><span class="value success">${{ monthlyReport.savedMoney }}</span></div></el-col>
            <el-col :xs="12" :sm="6"><div class="stat-box"><span class="label">浪費金額</span><span class="value danger">${{ monthlyReport.totalWaste }}</span></div></el-col>
            <el-col :xs="12" :sm="6"><div class="stat-box"><span class="label">庫存總項</span><span class="value">{{ monthlyReport.totalItems }} 項</span></div></el-col>
            <el-col :xs="12" :sm="6"><div class="stat-box"><span class="label">即期品項</span><span class="value warning">{{ monthlyReport.urgentItems }} 項</span></div></el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header><div class="card-header"><span class="card-title">浪費金額與排行</span><el-tag type="danger" effect="plain" size="small">US-18</el-tag></div></template>
          <div v-if="wasteData.length === 0" style="text-align: center; color: var(--el-text-color-secondary); padding: 40px 0;">目前沒有浪費紀錄，太棒了！</div>
          <div v-else class="waste-container">
            <div class="chart-half"><div ref="wasteChartRef" style="width: 100%; height: 220px;"></div></div>
            <div class="rank-half">
              <div class="rank-title"><el-icon><Warning /></el-icon> 浪費金額 Top 5</div>
              <div v-for="(item, index) in wasteRanking" :key="item.name" class="rank-item">
                <div class="rank-num" :class="`top-${index + 1}`">{{ index + 1 }}</div>
                <div class="rank-info"><span class="name">{{ item.name }}</span><span class="count">丟棄 {{ item.count }} 份</span></div>
                <div class="rank-amount">${{ item.amount }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header><div class="card-header"><span class="card-title">近半年庫存總值趨勢</span></div></template>
          <div ref="valueChartRef" style="width: 100%; height: 300px;"></div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
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
          
          <div v-if="currentNutrition.count === 0" style="text-align: center; color: var(--el-text-color-secondary); padding: 40px 0;">
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
                  <div class="b-bar-wrapper"><div class="b-bar" :style="{ width: (currentNutrition.calories > 0 ? (item.calories / currentNutrition.calories * 100) : 0) + '%' }"></div></div>
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

            <!-- 🌟 健康採購建議區塊 -->
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
                    <el-tag v-for="item in sug.items" :key="item" size="small" type="info">{{ item }}</el-tag>
                  </div>
                  <el-button type="primary" link :icon="CirclePlus" @click="addSuggestionToShopping(sug.items)">一鍵加入購物車</el-button>
                </div>
              </div>
              <div v-else class="all-good">
                <el-icon size="24" color="var(--el-color-success)"><CircleCheckFilled /></el-icon>
                <span>太棒了！目前營養非常均衡，繼續保持。</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">食材單價趨勢</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <el-tag type="warning" effect="plain" size="small">US-17</el-tag>
                <el-select v-model="selectedFood" placeholder="選擇食材" size="small" style="width: 100px;"><el-option v-for="food in availableFoods" :key="food" :label="food" :value="food" /></el-select>
              </div>
            </div>
          </template>
          <div ref="priceChartRef" style="width: 100%; height: 300px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.analytics-container { width: 100%; }
.page-title { margin: 0 0 24px 0; color: var(--el-text-color-primary); }
.summary-row { margin-bottom: 20px; }
.monthly-report-card { border-radius: 12px; background: var(--el-bg-color); }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.report-header h3 { margin: 0; color: var(--el-text-color-primary); }
.stat-box { display: flex; flex-direction: column; align-items: center; padding: 15px; background: var(--el-fill-color-light); border-radius: 8px; }
.stat-box .label { font-size: 14px; color: var(--el-text-color-secondary); margin-bottom: 8px; }
.stat-box .value { font-size: 24px; font-weight: bold; color: var(--el-text-color-primary); }
.stat-box .value.success { color: var(--el-color-success); }
.stat-box .value.danger { color: var(--el-color-danger); }
.stat-box .value.warning { color: var(--el-color-warning); }
.chart-card { border-radius: 12px; background: var(--el-bg-color); margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 600; color: var(--el-text-color-primary); font-size: 16px; }
.waste-container { display: flex; flex-direction: column; }
.chart-half { margin-bottom: 10px; }
.rank-half { background: var(--el-fill-color-lighter); padding: 16px; border-radius: 12px; }
.rank-title { font-size: 14px; font-weight: bold; color: var(--el-text-color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.rank-item { display: flex; align-items: center; margin-bottom: 8px; font-size: 13px; }
.rank-item:last-child { margin-bottom: 0; }
.rank-num { width: 20px; height: 20px; border-radius: 50%; background: var(--el-border-color); color: var(--el-text-color-secondary); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px; }
.rank-num.top-1 { background: #f56c6c; color: white; }
.rank-num.top-2 { background: #e6a23c; color: white; }
.rank-num.top-3 { background: #909399; color: white; }
.rank-info { flex: 1; display: flex; justify-content: space-between; padding-right: 10px; }
.rank-info .name { color: var(--el-text-color-primary); font-weight: 500; }
.rank-info .count { color: var(--el-text-color-secondary); font-size: 12px; }
.rank-amount { font-weight: bold; color: var(--el-color-danger); }
.nutrition-tab-switcher { margin-bottom: 20px; }
.nutrition-stats { text-align: center; margin-bottom: 10px; }
.main-cal { display: flex; flex-direction: column; align-items: center; margin-bottom: 12px; }
.main-cal .label { font-size: 14px; color: var(--el-text-color-secondary); }
.main-cal .value { font-size: 36px; font-weight: bold; color: var(--el-color-primary); }
.main-cal .value small { font-size: 16px; color: var(--el-text-color-secondary); }
.main-cal .sub { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.calorie-breakdown { margin-bottom: 20px; background: var(--el-fill-color-lighter); padding: 16px; border-radius: 12px; }
.breakdown-title { font-size: 14px; font-weight: 600; color: var(--el-text-color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.breakdown-list { display: flex; flex-direction: column; gap: 10px; }
.breakdown-item { display: flex; align-items: center; font-size: 13px; gap: 10px; }
.b-name { width: 120px; color: var(--el-text-color-regular); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; gap: 4px; align-items: center; }
.b-count { font-size: 11px; color: var(--el-color-primary); background: var(--el-color-primary-light-9); padding: 0 4px; border-radius: 4px; }
.b-bar-wrapper { flex: 1; height: 8px; background: var(--el-border-color-light); border-radius: 4px; overflow: hidden; }
.b-bar { height: 100%; background: var(--el-color-primary); border-radius: 4px; transition: width 0.5s ease; }
.b-val { width: 80px; text-align: right; color: var(--el-text-color-secondary); font-weight: 500; }
.macro-container { margin-bottom: 10px; }
.diet-advice { background: var(--el-fill-color-lighter); padding: 16px; border-radius: 12px; }
.advice-title { font-size: 14px; font-weight: bold; color: var(--el-text-color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.disclaimer-text { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 12px; text-align: center; }

/* 🌟 健康採購建議樣式 */
.purchase-advice-section {
  margin-top: 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-success-light-9) 100%);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 12px;
  padding: 16px;
}
.purchase-header { margin-bottom: 12px; }
.purchase-title { font-size: 15px; font-weight: bold; color: var(--el-color-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.purchase-desc { font-size: 13px; color: var(--el-text-color-secondary); }
.suggestion-list { display: flex; flex-direction: column; gap: 12px; }
.sug-card {
  background: var(--el-bg-color);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
.sug-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sug-cat { font-weight: 600; color: var(--el-text-color-primary); font-size: 14px; }
.sug-reason { font-size: 12px; color: var(--el-text-color-secondary); }
.sug-items { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.all-good { display: flex; align-items: center; gap: 8px; color: var(--el-color-success); font-weight: 500; padding: 10px; }

@media (min-width: 768px) {
  .waste-container { flex-direction: row; gap: 20px; align-items: center; }
  .chart-half { flex: 1; margin-bottom: 0; }
  .rank-half { flex: 1; }
}
</style>