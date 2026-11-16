import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useFridgeStore } from './fridge'

export const useTourStore = defineStore('tour', () => {
  // =========================================
  // 狀態管理
  // =========================================
  const isActive = ref(false)
  const isPaused = ref(false) // 🌟 新增：是否暫停（例如使用者點擊了其他地方）
  const currentIndex = ref(0)
  const hasSeenTour = ref(localStorage.getItem('hasSeenFullTour') === 'true')
  
  const isWaitingForAction = ref(false)
  const isNavigating = ref(false) 
  const showConfetti = ref(false)

  // =========================================
  // 12 個引導步驟（與原本相同）
  // =========================================
  const tourSteps = [
    {
      route: '/',
      target: '.preset-card:first-child',
      title: '歡迎來到鮮知！',
      content: '首先，請點擊選擇一個最接近你家的冰箱類型。',
      placement: 'right',
      action: 'click',
      skipIf: () => useFridgeStore().isFridgeConfigured
    },
    {
      route: '/',
      target: '[data-tour="btn-add-food"]',
      title: '冰箱建好了！',
      content: '現在，請點擊「新增食材」，我們來試著登記第一樣東西。',
      placement: 'bottom',
      action: 'click'
    },
    {
      route: '/inventory',
      target: '[data-tour="food-name-input"]',
      title: '填寫食材資訊',
      content: '請在欄位中輸入「番茄」（或其他食材），系統會自動帶入分類與建議期限，填好後按下送出。',
      placement: 'right',
      action: 'form-submit'
    },
    {
      route: '/',
      target: '[data-tour="first-food-item"]',
      title: '太棒了！食材出現了',
      content: '現在，請點擊它，在彈出的視窗中選擇「標記吃完」，體驗消耗庫存的流程。',
      placement: 'top',
      action: 'mark-eaten'
    },
    {
      route: '/meal-plan',
      target: '[data-tour="meal-plan-generate"]',
      title: 'AI 智慧排餐',
      content: '不知道煮什麼？點擊這裡，AI 會根據你冰箱的食材，自動規劃一週菜單！',
      placement: 'bottom'
    },
    {
      route: '/recipe',
      target: '[data-tour="recipe-card-first"]',
      title: '專屬食譜推薦',
      content: '系統會優先推薦能消耗你快過期食材的料理，並自動過濾過敏原。',
      placement: 'right'
    },
    {
      route: '/shopping',
      target: '[data-tour="shopping-add"]',
      title: '家庭購物清單',
      content: '缺少的食材會自動加入這裡，你也可以手動新增，並勾選是否已購買。',
      placement: 'bottom'
    },
    {
      route: '/reminder',
      target: '[data-tour="reminder-summary"]',
      title: '到期提醒中心',
      content: '這裡集中管理所有即將過期的食材，讓你一眼看出哪些東西該趕快吃掉。',
      placement: 'bottom'
    },
    {
      route: '/dietary',
      target: '[data-tour="dietary-allergy"]',
      title: '過敏與忌口設定',
      content: '設定你的飲食限制，AI 推薦食譜時會自動避開這些食材，守護你的健康。',
      placement: 'bottom'
    },
    {
      route: '/analytics',
      target: '[data-tour="analytics-report"]',
      title: '成本與浪費分析',
      content: '看看這個月你省下了多少錢，浪費了多少食材。數據會說話！',
      placement: 'bottom'
    },
    {
      route: '/family',
      target: '[data-tour="family-join"]',
      title: '家庭共享',
      content: '邀請家人加入，一起維護冰箱庫存與購物清單，避免重複購買。',
      placement: 'bottom'
    },
    {
      route: '/settings',
      target: '[data-tour="tour-restart"]',
      title: '恭喜完成導覽！',
      content: '如果日後忘記了，隨時可以回到系統設定重新觀看。',
      placement: 'bottom'
    }
  ]

  // =========================================
  // 輔助函式
  // =========================================
  
  // 檢查並跳過不需要的步驟（包含業務邏輯 skipIf 與 DOM 存在性）
  function checkSkip(index, isForward = true) {
    let i = index
    while (i >= 0 && i < tourSteps.length) {
      const step = tourSteps[i]
      
      // 1. 業務邏輯跳過
      if (step.skipIf && step.skipIf()) {
        i += isForward ? 1 : -1
        continue
      }

      // 2. DOM 存在性檢查（如果目標元素不在畫面上，直接跳過）
      // 注意：如果引導元件會負責跳轉路由，這裡可能還抓不到元素。
      // 但為了穩定性，我們先在這裡做一個基礎檢查。
      const el = document.querySelector(step.target)
      if (!el) {
        i += isForward ? 1 : -1
        continue
      }

      // 如果都通過，回傳該 index
      return i
    }
    return -1 // 找不到任何有效步驟
  }

  // =========================================
  // Actions
  // =========================================
  
  function startTour() {
    const firstValidIndex = checkSkip(0, true)
    if (firstValidIndex === -1) {
      // 如果一個步驟都跑不了，直接結束
      endTour()
      return
    }

    currentIndex.value = firstValidIndex
    isActive.value = true
    isPaused.value = false
    isWaitingForAction.value = false
    isNavigating.value = false
    showConfetti.value = false
  }

  function nextStep() {
    if (isWaitingForAction.value) return 

    let nextIndex = checkSkip(currentIndex.value + 1, true)
    
    if (nextIndex === -1 || nextIndex >= tourSteps.length) {
      endTour()
      return
    }

    currentIndex.value = nextIndex
    isWaitingForAction.value = false
    
    if (currentIndex.value === tourSteps.length - 1) {
      showConfetti.value = true
    }
  }

  function prevStep() {
    let prevIndex = checkSkip(currentIndex.value - 1, false)
    
    if (prevIndex !== -1) {
      currentIndex.value = prevIndex
      isWaitingForAction.value = false
    }
  }

  function pauseTour() {
    isPaused.value = true
  }

  function resumeTour() {
    isPaused.value = false
  }

  function endTour() {
    isActive.value = false
    isPaused.value = false
    isNavigating.value = false
    hasSeenTour.value = true
    localStorage.setItem('hasSeenFullTour', 'true')
  }

  function resetTour() {
    hasSeenTour.value = false
    localStorage.removeItem('hasSeenFullTour')
    startTour()
  }

  return {
    isActive,
    isPaused,
    currentIndex,
    hasSeenTour,
    isWaitingForAction,
    isNavigating,
    showConfetti,
    tourSteps,
    startTour,
    nextStep,
    prevStep,
    pauseTour,
    resumeTour,
    endTour,
    resetTour
  }
})