<script setup>
import { computed } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { ShoppingBag, Delete, Check, MagicStick } from '@element-plus/icons-vue'
import SmartEmpty from '@/components/empty/SmartEmpty.vue'

const analyticsStore = useAnalyticsStore()

// 取用 Store 中的數據
const insights = computed(() => analyticsStore.lifeInsights)
const advice = computed(() => analyticsStore.lifestyleAdvice)

// 處理沒有資料的空狀態
const isEmpty = computed(() => {
  return insights.value.topBought.length === 0 && 
         insights.value.topWasted.length === 0 && 
         insights.value.topEaten.length === 0
})

// 定義三個維度的顯示設定（使用專案代幣）
const dimensions = [
  { 
    key: 'topBought', 
    title: '最常採買', 
    icon: ShoppingBag, 
    color: 'var(--accent)', 
    bg: 'var(--accent-light)' 
  },
  { 
    key: 'topWasted', 
    title: '最常浪費', 
    icon: Delete, 
    color: 'var(--danger)', 
    bg: 'var(--el-color-danger-light-9)' 
  },
  { 
    key: 'topEaten', 
    title: '最常吃完', 
    icon: Check, 
    color: 'var(--sage)', 
    bg: 'var(--el-color-success-light-9)' 
  }
]
</script>

<template>
  <div class="life-insights-wrapper">
    <!-- 空狀態 -->
    <SmartEmpty 
      v-if="isEmpty" 
      type="default" 
      title="目前資料不足" 
      description="累積更多食材紀錄後，即可查看您的專屬習慣分析與採買建議。" 
      :show-primary="false" 
    />

    <template v-else>
      <!-- 三個維度的榜單 -->
      <div class="insights-grid">
        <div 
          v-for="dim in dimensions" 
          :key="dim.key" 
          class="insight-card"
        >
          <div class="card-header">
            <div class="icon-wrapper" :style="{ background: dim.bg, color: dim.color }">
              <el-icon size="18"><component :is="dim.icon" /></el-icon>
            </div>
            <span class="card-title">{{ dim.title }}</span>
          </div>

          <div class="card-content">
            <template v-if="insights[dim.key].length > 0">
              <div 
                v-for="(item, index) in insights[dim.key]" 
                :key="item.category"
                class="rank-item"
                :class="{ 'is-top-1': index === 0 }"
              >
                <span class="rank-num">{{ index + 1 }}</span>
                <span class="rank-name">{{ item.category }}</span>
                <span class="rank-count">{{ item.count }} 次</span>
              </div>
            </template>
            <div v-else class="no-data">尚無足夠紀錄</div>
          </div>
        </div>
      </div>

      <!-- 智慧文字建議區塊 -->
      <div v-if="advice.length > 0" class="advice-box">
        <div class="advice-header">
          <el-icon><MagicStick /></el-icon>
          <span>生活採買建議</span>
        </div>
        <ul class="advice-list">
          <li v-for="(text, index) in advice" :key="index">{{ text }}</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.life-insights-wrapper {
  width: 100%;
}

/* 網格排版：桌機 3 欄，手機 1 欄 */
.insights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.insight-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px dashed var(--border);
}

.icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.rank-item {
  display: flex;
  align-items: center;
  font-size: var(--text-sm);
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
}
.rank-item:hover {
  background: var(--ground);
}

/* Top 1 視覺強調 */
.rank-item.is-top-1 {
  background: var(--ground);
}
.rank-item.is-top-1 .rank-name {
  font-weight: 700;
  color: var(--ink);
}
.rank-item.is-top-1 .rank-count {
  color: var(--accent);
  font-weight: 600;
}

.rank-num {
  width: 20px;
  color: var(--muted);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-xs);
  flex-shrink: 0;
}

.rank-name {
  flex: 1;
  color: var(--ink);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-count {
  color: var(--muted);
  font-size: var(--text-xs);
  flex-shrink: 0;
  margin-left: 8px;
}

.no-data {
  font-size: var(--text-sm);
  color: var(--muted);
  text-align: center;
  padding: var(--space-4) 0;
  background: var(--ground);
  border-radius: var(--radius-sm);
}

/* 建議區塊 */
.advice-box {
  background: var(--accent-light);
  border: 1px dashed var(--accent);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.advice-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--accent);
  margin-bottom: var(--space-2);
}

.advice-list {
  margin: 0;
  padding-left: 20px;
  color: var(--ink);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.advice-list li {
  margin-bottom: 4px;
}
.advice-list li:last-child {
  margin-bottom: 0;
}

/* 手機端自適應 */
@media (max-width: 768px) {
  .insights-grid {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
  
  .insight-card {
    padding: var(--space-3);
  }
  
  .rank-item {
    padding: 4px 6px;
  }
}
</style>