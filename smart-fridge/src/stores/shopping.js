import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useShoppingStore = defineStore('shopping', () => {
  // 初始購物清單資料
  const items = ref([
    { id: 1, name: '鮮奶', quantity: 2, unit: '瓶', isPurchased: false, addedBy: '我' },
    { id: 2, name: '雞蛋', quantity: 1, unit: '盒', isPurchased: true, addedBy: '媽媽' },
    { id: 3, name: '高麗菜', quantity: 1, unit: '顆', isPurchased: false, addedBy: '爸爸' },
  ])

  // 新增項目
  function addItem(item) {
    const newId = items.value.length
      ? Math.max(...items.value.map((i) => i.id)) + 1
      : 1
    items.value.push({
      ...item,
      id: newId,
      isPurchased: false,
      addedBy: '我', // 未來串接登入系統後可改為當前使用者名稱
    })
  }

  // 切換購買狀態 (勾選/取消勾選)
  function togglePurchased(id) {
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.isPurchased = !item.isPurchased
    }
  }

  // 刪除項目
  function removeItem(id) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  // 待購買數量
  const pendingCount = computed(() => items.value.filter((i) => !i.isPurchased).length)
  
  // 已購買數量
  const purchasedCount = computed(() => items.value.filter((i) => i.isPurchased).length)

  return {
    items,
    addItem,
    togglePurchased,
    removeItem,
    pendingCount,
    purchasedCount,
  }
})