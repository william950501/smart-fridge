import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 定義冰箱範本 (加入冷凍門邊)
export const fridgePresets = {
  'double': {
    name: '經典雙門冰箱',
    structure: [
      { id: 'freezer', name: '冷凍室', shelves: [{ id: 'B1', name: '上層' }, { id: 'B2', name: '下層' }] },
      { id: 'cold', name: '冷藏室', shelves: [{ id: 'A1', name: '上層' }, { id: 'A2', name: '下層' }] },
      { id: 'door', name: '冷藏門邊', shelves: [{ id: 'D1', name: '上層' }, { id: 'D2', name: '下層' }] },
      { id: 'freezer_door', name: '冷凍門邊', shelves: [{ id: 'FD1', name: '上層' }, { id: 'FD2', name: '下層' }] }
    ]
  },
  'triple': {
    name: '三門變頻冰箱',
    structure: [
      { id: 'freezer', name: '冷凍室', shelves: [{ id: 'B1', name: '上層' }, { id: 'B2', name: '下層' }] },
      { id: 'cold', name: '冷藏室', shelves: [{ id: 'A1', name: '上層' }, { id: 'A2', name: '下層' }] },
      { id: 'veggie', name: '蔬果室', shelves: [{ id: 'C1', name: '整層' }] },
      { id: 'door', name: '冷藏門邊', shelves: [{ id: 'D1', name: '上層' }, { id: 'D2', name: '中層' }, { id: 'D3', name: '下層' }] },
      { id: 'freezer_door', name: '冷凍門邊', shelves: [{ id: 'FD1', name: '上層' }, { id: 'FD2', name: '下層' }] }
    ]
  },
  'side': {
    name: '對開雙門冰箱',
    structure: [
      { id: 'freezer', name: '冷凍區(左)', shelves: [{ id: 'B1', name: '上層' }, { id: 'B2', name: '中層' }, { id: 'B3', name: '下層' }] },
      { id: 'cold', name: '冷藏區(右)', shelves: [{ id: 'A1', name: '上層' }, { id: 'A2', name: '中層' }, { id: 'A3', name: '下層' }] },
      { id: 'door', name: '冷藏門邊', shelves: [{ id: 'D1', name: '上層' }, { id: 'D2', name: '中層' }, { id: 'D3', name: '下層' }] },
      { id: 'freezer_door', name: '冷凍門邊', shelves: [{ id: 'FD1', name: '上層' }, { id: 'FD2', name: '中層' }, { id: 'FD3', name: '下層' }] }
    ]
  }
}

export const useFridgeStore = defineStore('fridge', () => {
  const fridgeStructure = ref(JSON.parse(localStorage.getItem('fridgeStructure')) || [])

  const isFridgeConfigured = computed(() => fridgeStructure.value.length > 0)

  function setFridgeStructure(newStructure) {
    fridgeStructure.value = newStructure
    localStorage.setItem('fridgeStructure', JSON.stringify(newStructure))
  }

  function getCustomInitialStructure() {
    return JSON.parse(JSON.stringify(fridgePresets['double'].structure))
  }

  function isDoorZone(zoneName) {
    return zoneName.includes('門邊') || zoneName.includes('門')
  }

  function moveFoodInStructure(foods, foodId, targetZone, targetShelf) {
    const item = foods.find((f) => f.id === foodId)
    if (item) {
      item.zone = targetZone
      item.shelf = targetShelf
    }
  }

  return {
    fridgePresets,
    fridgeStructure,
    isFridgeConfigured,
    setFridgeStructure,
    getCustomInitialStructure,
    isDoorZone,
    moveFoodInStructure
  }
})