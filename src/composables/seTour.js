import { ref } from 'vue'

// 使用全域狀態，避免多次呼叫時狀態不同步
const hasSeenTour = ref(localStorage.getItem('hasSeenTour') === 'true')

export function useTour() {
  // 定義引導步驟
  const tourSteps = [
    {
      target: '.sidebar-header .menu-btn',
      title: '展開完整功能',
      content: '點擊這裡可以展開左側選單，查看所有食材管理與 AI 智慧應用。',
      placement: 'right'
    },
    {
      target: '.sidebar-menu .menu-item:nth-child(1)',
      title: '你的冰箱視圖',
      content: '這是系統的主畫面。在這裡你可以看到所有食材的存放位置與即期狀態。',
      placement: 'right'
    },
    {
      target: '.sidebar-menu .contextual-cta',
      title: 'AI 智慧排餐',
      content: '不知道今晚煮什麼？點擊這裡，AI 會根據你冰箱的食材推薦專屬菜單。',
      placement: 'right'
    },
    {
      target: '[data-tour="btn-add-food"]',
      title: '快速新增食材',
      content: '買了新食材嗎？點擊這裡手動輸入，或者使用「拍照建檔」讓 AI 幫你辨識。',
      placement: 'bottom'
    },
    {
      target: '.right-header .notification-badge',
      title: '到期提醒中心',
      content: '如果有食材即將過期，這裡會出現紅點提示，點擊即可快速查看。',
      placement: 'bottom'
    }
  ]

  // 標記為已看過
  function completeTour() {
    hasSeenTour.value = true
    localStorage.setItem('hasSeenTour', 'true')
  }

  // 重置狀態（讓設定頁可以重新觸發）
  function resetTour() {
    hasSeenTour.value = false
    localStorage.removeItem('hasSeenTour')
  }

  return {
    tourSteps,
    hasSeenTour,
    completeTour,
    resetTour
  }
}