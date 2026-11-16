<template>
  <router-view />
  <TourGuide />
  <ActionToast />
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { useUiStore } from '@/stores/ui'
import TourGuide from '@/components/tour/TourGuide.vue'
import ActionToast from '@/components/feedback/ActionToast.vue'

const route = useRoute()
const notificationStore = useNotificationStore()
const uiStore = useUiStore()

let prefersReducedMotionQuery = null
let prefersDarkQuery = null

function handleReducedMotionChange(e) {
  document.documentElement.classList.toggle('reduced-motion', e.matches)
}

function handleDarkModeChange(e) {
  // 🌟 只有當使用者尚未手動設定深色模式時，才跟隨系統偏好
  if (!uiStore.hasManualDarkSetting) {
    document.documentElement.classList.toggle('dark', e.matches)
  }
}

// 動態更新網頁標題
watch(
  () => route.meta.title,
  (title) => {
    if (title) {
      document.title = `${title} | 鮮知 - 智慧食材管理系統`
    } else {
      document.title = '鮮知 - 智慧食材管理系統'
    }
  },
  { immediate: true }
)

onMounted(() => {
  setTimeout(() => {
    try {
      notificationStore.generateDueReminders()
    } catch (err) {
      console.warn('[App] generateDueReminders 執行失敗：', err)
    }
  }, 0)

  prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (prefersReducedMotionQuery.matches) {
    document.documentElement.classList.add('reduced-motion')
  }
  prefersReducedMotionQuery.addEventListener('change', handleReducedMotionChange)

  prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  if (prefersDarkQuery.matches && !uiStore.hasManualDarkSetting) {
    document.documentElement.classList.add('dark')
  }
  prefersDarkQuery.addEventListener('change', handleDarkModeChange)
})

onUnmounted(() => {
  prefersReducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
  prefersDarkQuery?.removeEventListener('change', handleDarkModeChange)
})
</script>