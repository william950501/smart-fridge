<script setup>
import { computed } from 'vue'
import { useShoppingStore } from '@/stores/shopping'
import { CaretTop, CaretBottom, Minus } from '@element-plus/icons-vue'

const props = defineProps({
  name: { type: String, required: true },
  currentPrice: { type: Number, default: 0 }
})

const shoppingStore = useShoppingStore()

// 取得歷史價格資訊
const priceInfo = computed(() => shoppingStore.getPriceInfo(props.name))

// 計算漲跌幅（只有當有歷史紀錄且有當前價格時才計算）
const priceChange = computed(() => {
  if (!props.currentPrice || !priceInfo.value) return null
  return shoppingStore.getPriceChangePercent(props.name, props.currentPrice)
})

// 格式化日期 (2026-10-01 -> 10/01)
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`
  return dateStr
}
</script>

<template>
  <!-- 如果沒有歷史紀錄，直接不渲染 -->
  <div v-if="priceInfo" class="price-compare-wrapper">
    
    <!-- 歷史紀錄 -->
    <div class="history-info">
      <span class="label">上次</span>
      <span class="date">{{ formatDate(priceInfo.lastDate) }}</span>
      <span class="price">${{ priceInfo.lastPrice }}</span>
    </div>

    <!-- 漲跌指示 -->
    <div 
      v-if="priceChange" 
      class="change-info" 
      :class="{
        up: priceChange.diff > 0,
        down: priceChange.diff < 0,
        same: priceChange.diff === 0
      }"
    >
      <template v-if="priceChange.diff > 0">
        <el-icon><CaretTop /></el-icon> 漲 {{ Math.abs(priceChange.percent) }}%
      </template>
      <template v-else-if="priceChange.diff < 0">
        <el-icon><CaretBottom /></el-icon> 跌 {{ Math.abs(priceChange.percent) }}%
      </template>
      <template v-else>
        <el-icon><Minus /></el-icon> 持平
      </template>
    </div>

  </div>
</template>

<style scoped>
.price-compare-wrapper {
  display: flex;
  flex-wrap: wrap; /* 允許換行，防止在狹窄空間內擠壓重疊 */
  align-items: center;
  gap: 4px 8px; /* 縮小上下間距，保留左右間距 */
  font-size: 11px; /* 縮小字體，適應表格與手機卡片 */
  color: var(--muted);
  padding: 4px 6px;
  background: transparent; /* 移除厚重背景 */
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border); /* 改為虛線，視覺更輕量 */
  width: 100%;
  box-sizing: border-box;
  line-height: 1.2;
}

.history-info {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.history-info .label {
  color: var(--muted);
  opacity: 0.8;
}

.history-info .date {
  color: var(--muted);
  opacity: 0.6;
}

.history-info .price {
  color: var(--ink);
  font-weight: 600;
}

/* 漲跌標籤 */
.change-info {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 600;
  font-family: var(--font-body);
  white-space: nowrap;
}

/* 漲價：磚紅 */
.change-info.up {
  color: var(--danger);
}

/* 跌價：橄欖綠 */
.change-info.down {
  color: var(--sage);
}

/* 持平：次要文字 */
.change-info.same {
  color: var(--muted);
}

/* 深色模式微調 */
html.dark .history-info .price {
  color: var(--ink);
}
</style>