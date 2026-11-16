<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useUiStore } from '@/stores/ui'
import { DataAnalysis } from '@element-plus/icons-vue'

const props = defineProps({
  data: { type: Array, default: () => [] }
})

const uiStore = useUiStore()
const chartRef = ref(null)
let chartInstance = null

// =========================================
// 顏色與樣式配置
// =========================================
const statusColors = {
  expired: '#B83B3B', // 磚紅
  urgent: '#D9A066',  // 琥珀
  warning: '#C25D3A', // 赤陶
  fresh: '#5A6B53'    // 橄欖綠
}

function getStatusText(status) {
  return {
    expired: '已過期',
    urgent: '快過期',
    warning: '即將到期',
    fresh: '新鮮'
  }[status] || '未知'
}

function getThemeColors() {
  return {
    text: uiStore.isDark ? '#9A9690' : '#73706C',
    line: uiStore.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    tooltipBg: uiStore.isDark ? '#242220' : '#FAF9F7',
    tooltipText: uiStore.isDark ? '#F5F3EF' : '#211F1C'
  }
}

// =========================================
// 渲染圖表
// =========================================
function renderChart() {
  if (!chartInstance) return
  const colors = getThemeColors()

  if (props.data.length === 0) {
    chartInstance.clear()
    return
  }

  // 將資料按狀態分組
  const seriesData = {
    expired: [],
    urgent: [],
    warning: [],
    fresh: []
  }

  props.data.forEach(item => {
    const status = item.status || 'fresh'
    seriesData[status].push({
      name: item.name,
      value: [item.days, item.value],
      raw: item
    })
  })

  const allSeries = Object.keys(statusColors).map(status => ({
    name: getStatusText(status),
    type: 'scatter',
    data: seriesData[status],
    symbolSize: (val) => {
      // 圓點大小：根據價值縮放，最小 14px（方便手機點），最大 28px
      return Math.min(Math.max(val[1] / 10, 14), 28)
    },
    itemStyle: {
      color: statusColors[status],
      opacity: 0.85,
      shadowBlur: 4,
      shadowColor: 'rgba(0,0,0,0.1)'
    },
    label: {
      show: true,
      formatter: '{b}',
      position: 'top',
      color: colors.text,
      fontSize: 11,
      fontWeight: 600,
      distance: 6,
      // 加上微弱背景，避免文字與虛線重疊看不清
      backgroundColor: uiStore.isDark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)',
      padding: [2, 4],
      borderRadius: 4
    },
    labelLayout: {
      hideOverlap: true // 隱藏重疊的標籤
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)',
        borderColor: '#fff',
        borderWidth: 2
      },
      label: { show: true, fontWeight: 700, fontSize: 12 }
    }
  }))

  // 計算邊界，確保不會擠在邊緣
  const maxDays = Math.max(...props.data.map(d => d.days), 7)
  const minDays = Math.min(...props.data.map(d => d.days), -3)
  const maxValue = Math.max(...props.data.map(d => d.value), 100)

  const option = {
    grid: {
      top: 30, // 留給 Y 軸名稱
      right: 20,
      bottom: 30, // 留給 X 軸名稱
      left: 45, // 留給 Y 軸數字
      containLabel: true
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.line,
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: colors.tooltipText, fontSize: 13 },
      formatter: (params) => {
        const item = params.data.raw
        const statusText = getStatusText(item.status)
        const daysText = item.days < 0 ? `已過期 ${Math.abs(item.days)} 天` : `剩 ${item.days} 天`
        
        return `
          <div style="font-weight:bold;margin-bottom:6px;font-size:14px;border-bottom:1px solid ${colors.line};padding-bottom:4px;">
            ${item.name}
          </div>
          <div style="font-size:12px;margin-bottom:4px;">
            狀態：<span style="color:${statusColors[item.status]};font-weight:bold;">${statusText}</span> (${daysText})
          </div>
          <div style="font-size:12px;margin-bottom:4px;">數量：${item.quantity} ${item.unit}</div>
          <div style="font-size:12px;font-weight:bold;">價值：$${item.value}</div>
        `
      }
    },
    xAxis: {
      type: 'value',
      name: '剩餘天數',
      nameLocation: 'middle',
      nameGap: 25,
      nameTextStyle: { color: colors.text, fontSize: 12 },
      min: minDays - 1,
      max: maxDays + 1,
      splitNumber: 4, // 限制刻度數量，防重疊
      axisLabel: { 
        color: colors.text, 
        fontSize: 11,
        formatter: (val) => {
          if (val === 0) return '今天'
          return Math.round(val)
        }
      },
      axisLine: { lineStyle: { color: colors.line } },
      splitLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '價值 ($)',
      nameLocation: 'end',
      nameTextStyle: { color: colors.text, fontSize: 11, align: 'left' },
      min: 0,
      max: maxValue * 1.2,
      splitNumber: 4, // 限制刻度數量
      axisLabel: { 
        color: colors.text, 
        fontSize: 11,
        formatter: (val) => `$${val}`
      },
      splitLine: { 
        lineStyle: { 
          color: colors.line,
          type: 'dashed' 
        } 
      },
      axisTick: { show: false }
    },
    series: [
      ...allSeries,
      {
        // 只在 0 的位置畫一條細虛線，去除原本粗黑線的問題
        type: 'line',
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          label: { show: false }, // 隱藏文字避免重疊
          lineStyle: { 
            color: uiStore.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', 
            type: 'dashed', 
            width: 1 
          },
          data: [{ xAxis: 0 }]
        },
        data: []
      }
    ]
  }

  chartInstance.setOption(option, true)
}

// =========================================
// 生命週期與監聽
// =========================================
onMounted(() => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    renderChart()
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})

function handleResize() {
  chartInstance?.resize()
}

watch(() => props.data, () => {
  nextTick(() => { renderChart() })
}, { deep: true })

watch(() => uiStore.isDark, () => {
  nextTick(() => { renderChart() })
})
</script>

<template>
  <div class="scatter-wrapper">
    <!-- 空狀態 -->
    <div v-if="data.length === 0" class="empty-state">
      <div class="empty-icon">
        <el-icon size="32"><DataAnalysis /></el-icon>
      </div>
      <p class="empty-text">目前沒有足夠的庫存資料來產生分析</p>
    </div>
    
    <!-- 圖表 -->
    <div v-else ref="chartRef" class="chart-container"></div>
  </div>
</template>

<style scoped>
.scatter-wrapper {
  width: 100%;
  height: 100%;
  min-height: 300px;
  background: var(--surface);
  border-radius: var(--radius-md);
  position: relative;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  gap: var(--space-3);
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--ground);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: var(--text-sm);
  color: var(--muted);
  margin: 0;
}

/* 手機端確保高度足夠 */
@media (max-width: 768px) {
  .scatter-wrapper, .chart-container {
    min-height: 320px; 
  }
}
</style>