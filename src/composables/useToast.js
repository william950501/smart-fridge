import { ref } from 'vue'

// 使用模組層級的變數，確保所有元件共用同一個佇列
const toasts = ref([])
let toastIdCounter = 0

export function useToast() {
  /**
   * 顯示自訂 Toast
   * @param {Object} options
   * @param {string} options.title - 標題（必填）
   * @param {string} options.message - 內容說明（選填）
   * @param {'success'|'error'|'warning'|'info'} options.type - 類型（預設 success）
   * @param {number} options.duration - 持續時間（毫秒，預設 8000）
   * @param {Array} options.actions - 動作按鈕陣列 [{ label: '查看庫存', type: 'primary', handler: () => {} }]
   */
  function showToast({ title, message = '', type = 'success', duration = 8000, actions = [] }) {
    const id = ++toastIdCounter

    // 如果超過 4 筆，先移除最舊的一筆（保留空間給新通知）
    if (toasts.value.length >= 4) {
      toasts.value.shift()
    }

    const newToast = {
      id,
      title,
      message,
      type,
      duration, // 僅將時間傳遞給 UI 層，不在這裡執行 setTimeout
      actions: actions.map(action => ({
        ...action,
        // 包裝原本的 handler，讓點擊後能自動關閉 Toast
        onClick: (toastId) => {
          if (typeof action.handler === 'function') {
            action.handler()
          }
          removeToast(toastId)
        }
      }))
    }

    toasts.value.push(newToast)
    return id
  }

  function removeToast(id) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function clearAllToasts() {
    toasts.value = []
  }

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts
  }
}