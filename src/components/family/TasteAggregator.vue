<script setup>
import { computed } from 'vue'
import { useFamilyStore } from '@/stores/family'
import { UserFilled, Dish } from '@element-plus/icons-vue'

const familyStore = useFamilyStore()

const tastes = computed(() => familyStore.aggregatedTastes)

// 計算最大值，用於計算進度條比例
const maxCount = computed(() => {
  if (tastes.value.length === 0) return 1
  return Math.max(...tastes.value.map(t => t.count))
})

// 決定長條圖的顏色與樣式（第一名高亮，其餘遞減）
function getBarStyle(index) {
  if (index === 0) return { background: 'var(--accent)', opacity: 1 }
  if (index === 1) return { background: 'var(--accent)', opacity: 0.6 }
  if (index === 2) return { background: 'var(--accent)', opacity: 0.4 }
  return { background: 'var(--muted)', opacity: 0.4 }
}
</script>

<template>
  <div class="taste-aggregator">
    <!-- 標題區 -->
    <div class="ta-header">
      <div class="ta-title">
        <el-icon><Dish /></el-icon> 家庭口味聚合
      </div>
      <p class="ta-desc">綜合全家人的偏好，AI 推薦食譜時會優先符合這些口味。</p>
    </div>

    <!-- 口味排行列表 -->
    <div v-if="tastes.length > 0" class="ta-list">
      <div 
        v-for="(taste, index) in tastes" 
        :key="taste.name" 
        class="ta-item"
        :class="{ 'is-top-1': index === 0 }"
      >
        <div class="ta-label">
          <div class="name-wrapper">
            <span v-if="index === 0" class="crown-icon">👑</span>
            <span class="ta-name">{{ taste.name }}</span>
          </div>
          <span class="ta-count">{{ taste.count }} 人</span>
        </div>
        
        <!-- 背景軌道與動態進度條 -->
        <div 
          class="ta-bar-bg" 
          role="progressbar" 
          :aria-valuenow="taste.count" 
          :aria-valuemin="0" 
          :aria-valuemax="maxCount"
          :aria-label="`${taste.name} 有 ${taste.count} 人喜歡`"
        >
          <div 
            class="ta-bar" 
            :style="{ 
              ...getBarStyle(index),
              transform: `scaleX(${taste.count / maxCount})` 
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else class="ta-empty">
      <div class="ta-empty-icon">
        <el-icon size="32"><UserFilled /></el-icon>
      </div>
      <p class="ta-empty-title">尚未設定口味偏好</p>
      <p class="ta-empty-desc">成員可以在「過敏及忌口設定」中填寫自己喜歡的口味。</p>
    </div>
  </div>
</template>

<style scoped>
.taste-aggregator {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

/* 標題區 */
.ta-header {
  margin-bottom: var(--space-4);
}

.ta-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--ink);
  font-family: var(--font-display);
  margin-bottom: var(--space-2);
}

.ta-desc {
  font-size: var(--text-sm);
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}

/* 列表區 */
.ta-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ta-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ta-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
}

.name-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.crown-icon {
  font-size: 14px;
  line-height: 1;
}

.ta-name {
  font-weight: 500;
  color: var(--ink);
}

/* 第一名文字加粗 */
.is-top-1 .ta-name {
  font-weight: 700;
  color: var(--accent);
}

.ta-count {
  color: var(--muted);
  font-size: var(--text-xs);
  background: var(--ground);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.is-top-1 .ta-count {
  color: var(--accent);
  background: var(--accent-light);
  font-weight: 600;
}

/* 進度條：加粗至 10px */
.ta-bar-bg {
  width: 100%;
  height: 10px;
  background: var(--ground);
  border-radius: var(--radius-round);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.ta-bar {
  height: 100%;
  width: 100%;
  border-radius: var(--radius-round);
  transform-origin: left;
  /* 遵守 Rule 26：只動畫 transform，不寫死 width */
  transition: transform 600ms var(--ease-out), background-color var(--transition-base);
}

/* 空狀態 */
.ta-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) 0;
  text-align: center;
}

.ta-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--ground);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
}

.ta-empty-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 4px 0;
}

.ta-empty-desc {
  font-size: var(--text-xs);
  color: var(--muted);
  margin: 0;
}

/* 手機端微調內距，節省空間 */
@media (max-width: 768px) {
  .taste-aggregator {
    padding: var(--space-4);
  }
  .ta-list {
    gap: var(--space-3);
  }
  .ta-bar-bg {
    height: 8px;
  }
}
</style>