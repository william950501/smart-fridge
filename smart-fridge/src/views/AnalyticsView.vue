<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useInventoryStore } from '@/stores/inventory'
import { useAnalyticsStore } from '@/stores/analytics'
import { useRecipeStore } from '@/stores/recipe'
import { Calendar, Warning, TrendCharts } from '@element-plus/icons-vue'

const router = useRouter()
const inventoryStore = useInventoryStore()
const analyticsStore = useAnalyticsStore()
const recipeStore = useRecipeStore()

// --- ECharts 實例與 Refs ---
const wasteChartRef = ref(null)
const priceChartRef = ref(null)
const valueChartRef = ref(null)
const macroChartRef = ref(null)
let wasteChart = null, priceChart = null, valueChart = null, macroChart = null

// --- 資料處理 ---
const availableFoods = computed(() => [...new Set(inventoryStore.priceHistory.map(p => p.foodName))])
const selectedFood = ref('')

// 1. 浪費圓餅圖資料
const wasteData = computed(() => {
  const dist = {}
  analyticsStore.wastedItems.forEach(item => {
    dist[item.name] = (dist[item.name] || 0) + (item.price / item.quantity) * item.discardQuantity
  })
  return Object.keys(dist).map(key => ({ name: key, value: Math.round(dist[key]) }))
})

// 2. 浪費排行 Top 5 (US-18)
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

// 3. 庫存價值長條圖資料 (模擬)
const valueData = ref([
  { month: '5月', value: 1200 }, { month: '6月', value: 1500 },
  { month: '7月', value: 1100 }, { month: '8月', value: 1800 },
  { month: '9月', value: 1600 }, { month: '10月', value: analyticsStore.totalInventoryValue },
])

// 4. 本週菜單營養總和 (US-22)
const weeklyNutrition = computed(() => {
  let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, mealsCount: 0 }
  Object.values(recipeStore.mealPlan).forEach(day => {
    ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
      const meal = day[mealType]
      if (meal && meal.calories) {
        totals.calories += meal.calories
        totals.protein += meal.macros.protein
        totals.carbs += meal.macros.carbs
        totals.fat += meal.macros.fat
        totals.mealsCount++
      }
    })
  })
  return totals
})

// 計算三大營養素的熱量佔比 (蛋白質*4, 碳水*4, 脂肪*9)
const macroData = computed(() => {
  const p = weeklyNutrition.value.protein * 4
  const c = weeklyNutrition.value.carbs * 4
  const f = weeklyNutrition.value.fat * 9
  const total = p + c + f
  return [
    { name: '蛋白質', value: p, percentage: total ? Math.round((p / total) * 100) : 0 },
    { name: '碳水化合物', value: c, percentage: total ? Math.round((c / total) * 100) : 0 },
    { name: '脂肪', value: f, percentage: total ? Math.round((f / total) * 100) : 0 }
  ]
})

// 5. AI 飲食建議文字 (US-22)
const dietAdvice = computed(() => {
  if (weeklyNutrition.value.mealsCount === 0) return []
  
  const advice = []
  const pPct = macroData.value.find(m => m.name === '蛋白質').percentage
  const cPct = macroData.value.find(m => m.name === '碳水化合物').percentage
  const fPct = macroData.value.find(m => m.name === '脂肪').percentage

  if (pPct < 15) advice.push('蛋白質攝取偏低，建議下週菜單多加入豆腐、雞肉或雞蛋。')
  if (cPct > 60) advice.push('碳水化合物佔比偏高，建議減少精緻澱粉，多攝取蔬菜。')
  if (fPct > 35) advice.push('脂肪佔比偏高，建議減少油炸料理，改用清蒸或水煮。')
  
  if (advice.length === 0) {
    advice.push('營養素比例非常均衡，請繼續保持！')
  }
  
  return advice
})

// 月度報告文字總結
const monthlyReport = computed(() => {
  return {
    savedMoney: 320,
    totalWaste: analyticsStore.totalWastedAmount,
    totalItems: inventoryStore.totalCount,
    urgentItems: inventoryStore.urgentFoods.length,
  }
})

// --- 初始化圖表 ---
onMounted(() => {
  if (wasteChartRef.value) wasteChart = echarts.init(wasteChartRef.value)
  if (priceChartRef.value) priceChart = echarts.init(priceChartRef.value)
  if (valueChartRef.value) valueChart = echarts.init(valueChartRef.value)
  if (macroChartRef.value) macroChart = echarts.init(macroChartRef.value)
  
  renderWasteChart()
  renderValueChart()
  renderMacroChart()
  updatePriceChart()
})

watch(selectedFood, () => updatePriceChart())
watch(wasteData, () => renderWasteChart(), { deep: true })
watch(macroData, () => renderMacroChart(), { deep: true })

function renderWasteChart() {
  if (!wasteChart) return
  if (wasteData.value.length === 0) { wasteChart.clear(); return }
  wasteChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: 'var(--el-text-color-primary)' }, itemWidth: 12, itemHeight: 12 },
    series: [{
      name: '浪費金額', type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      itemStyle: { borderRadius: 8, borderColor: 'var(--el-bg-color)', borderWidth: 2 },
      label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: wasteData.value, color: ['#f56c6c', '#e6a23c', '#909399', '#67c23a', '#409eff']
    }]
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
  if (weeklyNutrition.value.mealsCount === 0) { macroChart.clear(); return }
  macroChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: '0%', left: 'center', textStyle: { color: 'var(--el-text-color-primary)' }, itemWidth: 12, itemHeight: 12 },
    series: [{
      name: '營養佔比', type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
      data: macroData.value,
      color: ['#409eff', '#67c23a', '#e6a23c']
    }]
  })
}

function goToMealPlan() {
  router.push('/meal-plan')
}
</script>

<template>
  <div class="analytics-container">
    <h2 class="page-title">分析報表</h2>

    <!-- 頂部數據總結 -->
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
      <!-- 1. 浪費分析 (US-18) -->
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">浪費金額與排行</span>
              <el-tag type="danger" effect="plain" size="small">US-18 過期損失估算</el-tag>
            </div>
          </template>
          <div v-if="wasteData.length === 0" style="text-align: center; color: var(--el-text-color-secondary); padding: 40px 0;">目前沒有浪費紀錄，太棒了！</div>
          <div v-else class="waste-container">
            <div class="chart-half">
              <div ref="wasteChartRef" style="width: 100%; height: 220px;"></div>
            </div>
            <div class="rank-half">
              <div class="rank-title"><el-icon><Warning /></el-icon> 浪費金額 Top 5</div>
              <div v-for="(item, index) in wasteRanking" :key="item.name" class="rank-item">
                <div class="rank-num" :class="`top-${index + 1}`">{{ index + 1 }}</div>
                <div class="rank-info">
                  <span class="name">{{ item.name }}</span>
                  <span class="count">丟棄 {{ item.count }} 份</span>
                </div>
                <div class="rank-amount">${{ item.amount }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 2. 庫存價值長條圖 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">近半年庫存總值趨勢</span>
            </div>
          </template>
          <div ref="valueChartRef" style="width: 100%; height: 300px;"></div>
        </el-card>
      </el-col>

      <!-- 3. 本週菜單營養分析 (US-22) -->
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">本週菜單營養分析</span>
              <el-button type="primary" size="small" :icon="Calendar" @click="goToMealPlan">前往 AI 排餐</el-button>
            </div>
          </template>
          
          <div v-if="weeklyNutrition.mealsCount === 0" style="text-align: center; color: var(--el-text-color-secondary); padding: 40px 0;">
            尚未規劃菜單，請點擊右上角前往「一週菜單規劃」。
          </div>
          <div v-else>
            <div class="nutrition-stats">
              <div class="main-cal">
                <span class="label">預估總熱量</span>
                <span class="value">{{ weeklyNutrition.calories }} <small>kcal</small></span>
                <span class="sub">基於已安排的 {{ weeklyNutrition.mealsCount }} 餐</span>
              </div>
            </div>
            
            <div class="macro-container">
              <div ref="macroChartRef" style="width: 100%; height: 200px;"></div>
            </div>

            <!-- AI 飲食建議 (US-22) -->
            <div class="diet-advice">
              <div class="advice-title"><el-icon><TrendCharts /></el-icon> AI 飲食建議</div>
              <el-alert
                v-for="(advice, index) in dietAdvice"
                :key="index"
                :title="advice"
                type="info"
                show-icon
                :closable="false"
                style="margin-bottom: 8px;"
              />
              <div class="disclaimer-text">* 本建議基於食譜預估營養素，非專業醫療建議。</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 4. 單價趨勢圖 (US-17) -->
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">食材單價趨勢</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <el-tag type="warning" effect="plain" size="small">US-17 價格紀錄</el-tag>
                <el-select v-model="selectedFood" placeholder="選擇食材" size="small" style="width: 100px;">
                  <el-option v-for="food in availableFoods" :key="food" :label="food" :value="food" />
                </el-select>
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

/* 浪費分析區塊 */
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

/* 營養分析區塊 */
.nutrition-stats { text-align: center; margin-bottom: 10px; }
.main-cal { display: flex; flex-direction: column; align-items: center; margin-bottom: 12px; }
.main-cal .label { font-size: 14px; color: var(--el-text-color-secondary); }
.main-cal .value { font-size: 36px; font-weight: bold; color: var(--el-color-primary); }
.main-cal .value small { font-size: 16px; color: var(--el-text-color-secondary); }
.main-cal .sub { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }

.macro-container { margin-bottom: 10px; }

.diet-advice { background: var(--el-fill-color-lighter); padding: 16px; border-radius: 12px; }
.advice-title { font-size: 14px; font-weight: bold; color: var(--el-text-color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.disclaimer-text { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 12px; text-align: center; }

@media (min-width: 768px) {
  .waste-container { flex-direction: row; gap: 20px; align-items: center; }
  .chart-half { flex: 1; margin-bottom: 0; }
  .rank-half { flex: 1; }
}
</style>