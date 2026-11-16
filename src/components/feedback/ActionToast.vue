<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'
import {
  CircleCheckFilled,
  CircleCloseFilled,
  WarningFilled,
  InfoFilled,
  Close
} from '@element-plus/icons-vue'

const { toasts, removeToast } = useToast()

// =========================================
// 圖示與顏色對應
// =========================================
const iconMap = {
  success: CircleCheckFilled,
  error: CircleCloseFilled,
  warning: WarningFilled,
  info: InfoFilled
}

function getIcon(type) {
  return iconMap[type] || InfoFilled
}

function getIconColor(type) {
  const map = {
    success: 'var(--sage)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
    info: 'var(--accent)'
  }
  return map[type] || 'var(--accent)'
}

// =========================================
// 裝置與佈局判斷
// =========================================
const isHoverDevice = ref(true)
const isMobile = ref(false)
let mqHover, mqMobile

onMounted(() => {
  mqHover = window.matchMedia('(hover: hover)')
  mqMobile = window.matchMedia('(max-width: 600px)')
  
  isHoverDevice.value = mqHover.matches
  isMobile.value = mqMobile.matches

  mqHover.addEventListener('change', (e) => { isHoverDevice.value = e.matches })
  mqMobile.addEventListener('change', (e) => { isMobile.value = e.matches })
})

onUnmounted(() => {
  mqHover?.removeEventListener('change', () => {})
  mqMobile?.removeEventListener('change', () => {})
})

// 手機端最多顯示 3 則通知，避免佔滿螢幕
const displayToasts = computed(() => {
  if (isMobile.value) {
    return toasts.value.slice(-3)
  }
  return toasts.value
})

// =========================================
// 計時器與 Hover 暫停邏輯
// =========================================
const timers = ref({}) // { [id]: { timeoutId, startTime, remaining } }

function startTimer(toast) {
  if (toast.duration <= 0) return
  
  timers.value[toast.id] = {
    startTime: Date.now(),
    remaining: toast.duration,
    timeoutId: setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration)
  }
}

function pauseTimer(id) {
  if (!isHoverDevice.value) return // 手機端不支援 hover 暫停
  const timer = timers.value[id]
  if (!timer) return
  
  clearTimeout(timer.timeoutId)
  timer.remaining -= Date.now() - timer.startTime
}

function resumeTimer(id) {
  if (!isHoverDevice.value) return
  const timer = timers.value[id]
  if (!timer || timer.remaining <= 0) return
  
  timer.startTime = Date.now()
  timer.timeoutId = setTimeout(() => {
    removeToast(id)
  }, timer.remaining)
}

function clearTimer(id) {
  const timer = timers.value[id]
  if (timer) {
    clearTimeout(timer.timeoutId)
    delete timers.value[id]
  }
}

// 當 Toast 列表變動時，初始化計時器
watch(
  () => toasts.value,
  (newList) => {
    newList.forEach(t => {
      if (!timers.value[t.id]) {
        startTimer(t)
      }
    })
    // 清理已被移除的計時器
    Object.keys(timers.value).forEach(id => {
      if (!newList.find(t => t.id.toString() === id)) {
        clearTimer(id)
      }
    })
  },
  { deep: true, immediate: true }
)

// =========================================
// 手機端手勢下滑關閉
// =========================================
const touchState = ref({ id: null, startY: 0, currentY: 0 })
const offsets = ref({}) // 儲存每個 toast 的位移量

function onTouchStart(e, id) {
  touchState.value = { id, startY: e.touches[0].clientY, currentY: e.touches[0].clientY }
  offsets.value[id] = 0
}

function onTouchMove(e, id) {
  if (touchState.value.id !== id) return
  const diff = e.touches[0].clientY - touchState.value.startY
  
  if (diff > 0) {
    e.preventDefault() // 阻止頁面滾動
    touchState.value.currentY = diff
    // 限制最大位移為 100px，超過則不再增加
    offsets.value[id] = Math.min(diff, 100)
  }
}

function onTouchEnd(id) {
  if (touchState.value.id !== id) return
  const diff = touchState.value.currentY - touchState.value.startY
  
  if (diff > 50) {
    // 超過 50px 視為關閉手勢
    removeToast(id)
  } else {
    // 回復原位
    offsets.value[id] = 0
  }
  touchState.value = { id: null, startY: 0, currentY: 0 }
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast-slide">
        <div
          v-for="toast in displayToasts"
          :key="toast.id"
          class="toast-item"
          :class="`toast-${toast.type}`"
          :style="{ 
            transform: offsets[toast.id] ? `translateY(${offsets[toast.id]}px)` : '',
            opacity: offsets[toast.id] ? 1 - offsets[toast.id] / 100 : 1 
          }"
          @mouseenter="pauseTimer(toast.id)"
          @mouseleave="resumeTimer(toast.id)"
          @touchstart.passive="onTouchStart($event, toast.id)"
          @touchmove="onTouchMove($event, toast.id)"
          @touchend="onTouchEnd(toast.id)"
        >
          <!-- 頂部：圖示與關閉按鈕 -->
          <div class="toast-header">
            <div class="toast-icon-wrapper" :style="{ color: getIconColor(toast.type) }">
              <el-icon size="20">
                <component :is="getIcon(toast.type)" />
              </el-icon>
            </div>
            
            <button class="toast-close" @click="removeToast(toast.id)" aria-label="關閉通知">
              <el-icon><Close /></el-icon>
            </button>
          </div>

          <!-- 中間：標題與內容 -->
          <div class="toast-body">
            <h4 class="toast-title">{{ toast.title }}</h4>
            <p v-if="toast.message" class="toast-message">{{ toast.message }}</p>
          </div>

          <!-- 底部：操作按鈕（如果有） -->
          <div v-if="toast.actions && toast.actions.length > 0" class="toast-actions">
            <el-button
              v-for="(action, index) in toast.actions"
              :key="index"
              :type="action.type || 'default'"
              size="small"
              :plain="index > 0"
              @click="action.onClick(toast.id)"
              class="toast-action-btn"
            >
              {{ action.label }}
            </el-button>
          </div>

          <!-- 倒數進度條（如果有設定 duration） -->
          <div 
            v-if="toast.duration > 0" 
            class="toast-progress" 
            :style="{ animationDuration: `${toast.duration}ms` }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* =========================================
   容器：固定在右上角，避開 Header 的高度
   ========================================= */
.toast-container {
  position: fixed;
  top: 80px; /* 留給桌面端 Header 的空間 */
  right: 24px;
  z-index: 99999; 
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none; /* 讓容器不擋住點擊，只有卡片本身可以點 */
}

/* =========================================
   單張 Toast 卡片
   ========================================= */
.toast-item {
  pointer-events: auto;
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden; /* 為了讓進度條可以貼齊底部 */
  /* 為觸控滑動準備過渡效果 */
  transition: transform 150ms var(--ease-out), opacity 150ms var(--ease-out);
  will-change: transform, opacity;
}

/* 圖示與關閉按鈕 */
.toast-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-2);
}

.toast-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: var(--ground);
}

.toast-close {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.toast-close:hover {
  color: var(--ink);
  background: var(--surface-hover);
}

/* 內容 */
.toast-body {
  margin-bottom: var(--space-3);
}

.toast-title {
  margin: 0 0 4px 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
}

.toast-message {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
  line-height: 1.5;
}

/* 按鈕群 */
.toast-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-2);
}

.toast-action-btn {
  margin: 0 !important;
}

/* =========================================
   倒數進度條
   ========================================= */
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--accent);
  width: 100%;
  transform-origin: left;
  animation: toast-progress-shrink linear forwards;
}

/* Hover 時暫停動畫（僅限滑鼠設備） */
@media (hover: hover) {
  .toast-item:hover .toast-progress {
    animation-play-state: paused;
  }
}

/* 根據不同類型改變進度條顏色 */
.toast-success .toast-progress { background: var(--sage); }
.toast-error .toast-progress { background: var(--danger); }
.toast-warning .toast-progress { background: var(--warning); }
.toast-info .toast-progress { background: var(--accent); }

@keyframes toast-progress-shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

/* =========================================
   TransitionGroup 動效 (只動 transform & opacity)
   ========================================= */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: opacity 250ms var(--ease-out), transform 250ms var(--ease-out);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.toast-slide-move {
  transition: transform 250ms var(--ease-out);
}

/* =========================================
   手機端自適應
   ========================================= */
@media (max-width: 600px) {
  .toast-container {
    /* 下移位置，避開頂部 Header */
    top: calc(var(--header-h) + var(--safe-top) + 12px);
    right: var(--page-pad-x);
    left: var(--page-pad-x);
    gap: 8px;
  }

  .toast-item {
    width: 100%;
    /* 確保內距不影響滑動計算 */
    padding: var(--space-3) var(--space-4);
  }
}

/* =========================================
   無障礙：減少動效
   ========================================= */
@media (prefers-reduced-motion: reduce) {
  .toast-progress {
    animation: none;
    transform: scaleX(1); 
  }
  .toast-slide-enter-active,
  .toast-slide-leave-active,
  .toast-slide-move {
    transition: none;
  }
  .toast-item {
    transition: none;
  }
}
</style>