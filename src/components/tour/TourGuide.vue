<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTourStore } from '@/stores/tour'
import { Close, ArrowRight, ArrowLeft } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const tourStore = useTourStore()

const bubbleRef = ref(null)
const isReady = ref(false)

// 高亮區域與氣泡位置狀態
const spotlight = reactive({ x: 0, y: 0, width: 0, height: 0 })
const bubblePos = reactive({ x: 0, y: 0, placement: 'bottom' })

// ResizeObserver 用於監聽目標元素尺寸變化
let resizeObserver = null

const currentStep = computed(() => tourStore.tourSteps[tourStore.currentIndex] || null)
const totalSteps = computed(() => tourStore.tourSteps.length)
const isLastStep = computed(() => tourStore.currentIndex === totalSteps.value - 1)

const isVisible = computed(() =>
  tourStore.isActive && !tourStore.isPaused && isReady.value && !!currentStep.value
)

// =========================================
// 等待元素出現（支援路由跳轉後的動態渲染）
// =========================================
async function waitForElement(selector, maxRetries = 8, interval = 150) {
  for (let i = 0; i < maxRetries; i++) {
    const el = document.querySelector(selector)
    if (el) return el
    await new Promise(r => setTimeout(r, interval))
  }
  return null
}

// =========================================
// 核心：計算 Spotlight 與氣泡位置（含手機端防遮擋）
// =========================================
function computePositions(el) {
  if (!el || !bubbleRef.value) return

  const rect = el.getBoundingClientRect()
  const pad = 8
  const s = {
    x: rect.left - pad,
    y: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2
  }
  Object.assign(spotlight, s)

  // 取得氣泡實際尺寸
  const bubbleWidth = bubbleRef.value.offsetWidth
  const bubbleHeight = bubbleRef.value.offsetHeight

  const gap = 16 // 氣泡與高亮區域的間距
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 16 // 氣泡與視窗邊緣的最小距離

  let placement = currentStep.value?.placement || 'bottom'
  let bx = 0
  let by = 0

  // 判斷空間是否足夠，不夠則翻轉
  const spaceBelow = vh - (s.y + s.height)
  const spaceAbove = s.y
  const spaceRight = vw - (s.x + s.width)
  const spaceLeft = s.x

  if (placement === 'bottom' && spaceBelow < bubbleHeight + gap) {
    placement = 'top'
  } else if (placement === 'top' && spaceAbove < bubbleHeight + gap) {
    placement = 'bottom'
  } else if (placement === 'right' && spaceRight < bubbleWidth + gap) {
    placement = 'left'
  } else if (placement === 'left' && spaceLeft < bubbleWidth + gap) {
    placement = 'right'
  }

  // 根據最終 placement 計算座標
  switch (placement) {
    case 'top':
      bx = s.x + s.width / 2 - bubbleWidth / 2
      by = s.y - bubbleHeight - gap
      break
    case 'bottom':
      bx = s.x + s.width / 2 - bubbleWidth / 2
      by = s.y + s.height + gap
      break
    case 'left':
      bx = s.x - bubbleWidth - gap
      by = s.y + s.height / 2 - bubbleHeight / 2
      break
    case 'right':
      bx = s.x + s.width + gap
      by = s.y + s.height / 2 - bubbleHeight / 2
      break
  }

  // 邊界碰撞處理（確保氣泡不超出視窗）
  bx = Math.max(margin, Math.min(bx, vw - bubbleWidth - margin))
  by = Math.max(margin, Math.min(by, vh - bubbleHeight - margin))

  Object.assign(bubblePos, { x: bx, y: by, placement })
}

// =========================================
// 主流程：切換路由 → 等待目標 → 定位
// =========================================
async function syncAndLocate() {
  if (!tourStore.isActive || tourStore.isPaused) return
  if (!currentStep.value) return

  isReady.value = false
  const step = currentStep.value

  // 1. 若需要切換路由
  if (route.path !== step.route) {
    try {
      await router.push(step.route)
      await nextTick()
      await new Promise(r => setTimeout(r, 400)) // 等待頁面渲染
    } catch (err) {
      console.warn('[TourGuide] 路由切換失敗：', err)
    }
  }

  // 2. 等待目標元素
  const el = await waitForElement(step.target)
  if (!el) {
    console.warn(`[TourGuide] 找不到目標元素：${step.target}，自動跳過`)
    setTimeout(() => tourStore.nextStep(), 100)
    return
  }

  // 3. 滾動到目標元素（若不在視窗內）
  const rect = el.getBoundingClientRect()
  const inViewport =
    rect.top >= 0 && rect.left >= 0 &&
    rect.bottom <= window.innerHeight && rect.right <= window.innerWidth

  if (!inViewport) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await new Promise(r => setTimeout(r, 400))
  }

  // 4. 渲染氣泡並計算位置
  isReady.value = true
  await nextTick()
  await new Promise(r => setTimeout(r, 50))
  computePositions(el)

  // 5. 設定 ResizeObserver 監聽元素尺寸變化
  if (resizeObserver) resizeObserver.disconnect()
  resizeObserver = new ResizeObserver(() => {
    const currentEl = document.querySelector(step.target)
    if (currentEl) computePositions(currentEl)
  })
  resizeObserver.observe(el)
}

// =========================================
// 監聽與事件
// =========================================
watch(
  () => [tourStore.isActive, tourStore.currentIndex],
  () => { syncAndLocate() }
)

function handleResize() {
  if (!isVisible.value) return
  const el = document.querySelector(currentStep.value.target)
  if (el) computePositions(el)
}

function handleScroll() {
  if (!isVisible.value) return
  const el = document.querySelector(currentStep.value.target)
  if (el) computePositions(el)
}

function handleKeydown(e) {
  if (!isVisible.value) return
  if (e.key === 'Escape') {
    handleEnd()
  } else if (e.key === 'ArrowRight') {
    if (tourStore.isWaitingForAction) return
    tourStore.nextStep()
  } else if (e.key === 'ArrowLeft') {
    if (tourStore.isWaitingForAction) return
    tourStore.prevStep()
  }
}

function handleEnd() {
  tourStore.endTour()
}

function handleSkip() {
  tourStore.endTour()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('keydown', handleKeydown)
  if (resizeObserver) resizeObserver.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div
        v-if="isVisible"
        class="tour-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`tour-title-${tourStore.currentIndex}`"
        :aria-describedby="`tour-content-${tourStore.currentIndex}`"
      >
        <!-- SVG Mask：挖洞高亮 + 模糊背景 -->
        <svg class="tour-mask" width="100%" height="100%" aria-hidden="true">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                :x="spotlight.x"
                :y="spotlight.y"
                :width="spotlight.width"
                :height="spotlight.height"
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(20, 18, 16, 0.6)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        <!-- Spotlight 邊框（帶有微光暈） -->
        <div
          v-if="spotlight.width > 0"
          class="tour-spotlight-border"
          :style="{
            left: spotlight.x + 'px',
            top: spotlight.y + 'px',
            width: spotlight.width + 'px',
            height: spotlight.height + 'px'
          }"
        ></div>

        <!-- 氣泡 -->
        <div
          ref="bubbleRef"
          class="tour-bubble"
          :class="`placement-${bubblePos.placement}`"
          :style="{ left: bubblePos.x + 'px', top: bubblePos.y + 'px' }"
        >
          <!-- 指向箭頭 -->
          <div class="tour-arrow" :class="`arrow-${bubblePos.placement}`"></div>

          <!-- 頭部 -->
          <div class="tour-bubble-header">
            <span class="tour-step-count">
              步驟 {{ tourStore.currentIndex + 1 }} / {{ totalSteps }}
            </span>
            <button class="tour-close-btn" @click="handleEnd" aria-label="結束引導">
              <el-icon><Close /></el-icon>
            </button>
          </div>

          <!-- 標題 -->
          <h4 :id="`tour-title-${tourStore.currentIndex}`" class="tour-title">
            {{ currentStep.title }}
          </h4>

          <!-- 內容 -->
          <p :id="`tour-content-${tourStore.currentIndex}`" class="tour-content">
            {{ currentStep.content }}
          </p>

          <!-- 底部導航 -->
          <div class="tour-footer">
            <el-button
              v-if="!tourStore.isWaitingForAction"
              text
              size="small"
              class="tour-skip-btn"
              @click="handleSkip"
            >
              略過引導
            </el-button>
            <div v-else class="tour-action-hint">
              請完成上方指示繼續
            </div>

            <div class="tour-nav">
              <el-button
                v-if="!tourStore.isWaitingForAction"
                size="small"
                :disabled="tourStore.currentIndex === 0"
                @click="tourStore.prevStep"
                :icon="ArrowLeft"
                circle
                plain
              />
              <el-button
                v-if="!tourStore.isWaitingForAction"
                type="primary"
                size="small"
                @click="tourStore.nextStep"
                round
              >
                {{ isLastStep ? '完成' : '下一步' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* =========================================
   遮罩與高亮
   ========================================= */
.tour-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
}

.tour-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* 加入微弱的模糊效果，讓背景更柔和 */
  backdrop-filter: blur(2px);
}

.tour-spotlight-border {
  position: fixed;
  pointer-events: none;
  border: 2px solid var(--accent);
  border-radius: var(--radius-lg);
  box-shadow: 0 0 0 4px rgba(194, 93, 58, 0.2), 0 0 20px rgba(194, 93, 58, 0.15);
  z-index: 9999;
  transition: left 250ms var(--ease-out),
              top 250ms var(--ease-out),
              width 250ms var(--ease-out),
              height 250ms var(--ease-out);
}

/* =========================================
   氣泡（玻璃擬態質感）
   ========================================= */
.tour-bubble {
  position: fixed;
  width: clamp(280px, 90vw, 380px);
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: var(--space-5) var(--space-5);
  z-index: 10000;
  pointer-events: auto;
  transition: left 300ms var(--ease-out), top 300ms var(--ease-out);
}

/* 深色模式下的氣泡背景 */
html.dark .tour-bubble {
  background: rgba(30, 30, 30, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
}

/* 指向箭頭 */
.tour-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: inherit;
  border: inherit;
  border-radius: 2px;
  z-index: -1;
}

.arrow-top {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-top: none;
  border-left: none;
}

.arrow-bottom {
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  border-bottom: none;
  border-right: none;
}

.arrow-left {
  right: -6px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-bottom: none;
  border-left: none;
}

.arrow-right {
  left: -6px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  border-top: none;
  border-right: none;
}

/* 頭部 */
.tour-bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.tour-step-count {
  font-size: var(--text-xs);
  color: var(--muted);
  letter-spacing: 0.04em;
  font-family: var(--font-body);
  font-weight: 600;
  background: var(--ground);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.tour-close-btn {
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

.tour-close-btn:hover {
  color: var(--ink);
  background: var(--surface-hover);
}

.tour-title {
  margin: 0 0 var(--space-2) 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.tour-content {
  margin: 0 0 var(--space-5) 0;
  font-size: var(--text-sm);
  color: var(--muted);
  line-height: 1.6;
}

/* 底部導航 */
.tour-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: var(--space-3);
  flex-wrap: wrap;
}

html.dark .tour-footer {
  border-top-color: rgba(255, 255, 255, 0.1);
}

.tour-skip-btn {
  color: var(--muted) !important;
  padding: 0 !important;
  font-size: var(--text-xs) !important;
}

.tour-skip-btn:hover {
  color: var(--ink) !important;
}

.tour-action-hint {
  font-size: var(--text-xs);
  color: var(--accent);
  font-weight: 500;
}

.tour-nav {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
  align-items: center;
}

.tour-nav .el-button {
  border-radius: var(--radius-round);
}

/* =========================================
   進場 / 退場動效
   ========================================= */
.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity 250ms var(--ease-out), transform 250ms var(--ease-out);
}

.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* =========================================
   📱 手機端專屬自適應
   ========================================= */
@media (max-width: 600px) {
  .tour-bubble {
    width: calc(100vw - 32px);
    max-width: none;
    padding: var(--space-4);
    /* 手機端通常需要更多垂直空間，移除高度限制讓它自然滾動 */
    max-height: 70vh;
  }

  .tour-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .tour-nav {
    margin-left: 0;
    justify-content: space-between;
  }

  .tour-nav .el-button {
    flex: 1;
  }
  
  /* 手機端隱藏箭頭，避免因翻轉而錯位 */
  .tour-arrow {
    display: none;
  }
}
</style>