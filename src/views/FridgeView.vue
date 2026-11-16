<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore, foodDatabase } from '@/stores/inventory'
import { useFridgeStore, fridgePresets } from '@/stores/fridge'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Camera, Loading, Box, Menu, Grid, Edit, Delete, WarningFilled, MagicStick, Check, Close, Plus, Document, Refrigerator, LocationInformation, Rank, Right, MoreFilled, QuestionFilled, ArrowDown } from '@element-plus/icons-vue'
import FoodForm from '@/components/food/FoodForm.vue'
import FoodDetailDialog from '@/components/food/FoodDetailDialog.vue'

const router = useRouter()
const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()

const isAiDialogVisible = ref(false)
const isAiScanning = ref(false)
const isEditMode = ref(false)

const isMobile = ref(false)
const doorDrawerVisible = ref(false)

const quickAddVisible = ref(false)
const quickAddZone = ref('')
const quickAddShelf = ref('')
const quickAddAutoScan = ref(false)

const detailVisible = ref(false)
const currentDetailFood = ref(null)

const discardDialogVisible = ref(false)
const discardFood = ref(null)
const discardQuantity = ref(1)

const draggedItemId = ref(null)
const dragOverZone = ref('')
const dragOverShelf = ref('')
const isDragging = ref(false)

const draggedZoneIndex = ref(null)
const draggedShelfInfo = ref(null)

// 跨溫區移動彈窗狀態
const crossZoneDialogVisible = ref(false)
const crossZoneData = ref({
  foodId: null, targetZoneId: '', targetShelfId: '',
  fromZone: '', toZone: '', originalExpiry: '', customExpiry: '', isExtend: false
})

// 操作說明彈窗
const guideDialogVisible = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const modalState = reactive({
  visible: false, type: 'confirm', title: '', text: '', icon: 'WarningFilled',
  iconColor: 'var(--warning)', inputValue: '', inputPlaceholder: '',
  confirmText: '確定', confirmType: 'primary', onConfirm: null
})

function openModal(config) {
  Object.assign(modalState, {
    visible: true, type: 'confirm', icon: 'WarningFilled', iconColor: 'var(--warning)',
    confirmText: '確定', confirmType: 'primary', inputValue: '', ...config
  })
}
function closeModal() { modalState.visible = false }
function handleConfirm() {
  if (modalState.onConfirm) modalState.onConfirm(modalState.inputValue)
  closeModal()
}

// =========================================
// 主操作
// =========================================
function handleAddOption(action) {
  if (action === 'manual') {
    router.push({ path: '/inventory', query: { action: 'add' } })
  } else if (action === 'scan') {
    openQuickAdd('', '', true) // 打開帶有自動掃描的快速新增
  }
}

function handleMoreCommand(command) {
  if (command === 'reset') resetFridge()
}

// 選擇冰箱預設
function selectPreset(key) {
  fridgeStore.setFridgeStructure(JSON.parse(JSON.stringify(fridgePresets[key].structure)))
  ElMessage.success(`已套用「${fridgePresets[key].name}」`)
}
function selectCustom() {
  fridgeStore.setFridgeStructure(fridgeStore.getCustomInitialStructure())
  isEditMode.value = true
  ElMessage.success('已建立自訂冰箱，請點擊「編輯結構」來設計您的冰箱')
}
function openAiDialog() {
  isAiDialogVisible.value = true
  isAiScanning.value = false
}
function simulateAiScan() {
  isAiScanning.value = true
  setTimeout(() => {
    isAiScanning.value = false
    isAiDialogVisible.value = false
    const keys = Object.keys(fridgePresets)
    const randomKey = keys[Math.floor(Math.random() * keys.length)]
    selectPreset(randomKey)
  }, 2000)
}

function openQuickAdd(zoneId, shelfId, autoScan = false) {
  if (isEditMode.value || isDragging.value) return
  quickAddZone.value = zoneId
  quickAddShelf.value = shelfId
  quickAddAutoScan.value = autoScan
  quickAddVisible.value = true
}

function handleQuickAddSubmit(food) {
  inventoryStore.addFood(food)
  quickAddVisible.value = false
  ElMessage.success('食材已新增')
}

function openDetail(food) {
  currentDetailFood.value = food
  detailVisible.value = true
}

// =========================================
// 編輯模式（結構調整）
// =========================================
function addZone() {
  openModal({
    type: 'prompt', title: '新增區域', text: '請輸入區域名稱', confirmText: '新增', icon: 'Box', iconColor: 'var(--accent)',
    onConfirm: (value) => {
      if (!value.trim()) return ElMessage.warning('名稱不能為空')
      const newId = 'zone_' + Date.now()
      fridgeStore.fridgeStructure.push({ id: newId, name: value, shelves: [{ id: newId + '_s1', name: '層架 1' }] })
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('已新增區域')
    }
  })
}

function addShelf(zone, insertIndex = -1) {
  openModal({
    type: 'prompt', 
    title: '新增層架', 
    text: `在「${zone.name}」${insertIndex >= 0 ? `第 ${insertIndex + 1} 層位置` : '最下方'}新增層架`, 
    confirmText: '新增', icon: 'Menu', iconColor: 'var(--sage)',
    onConfirm: (value) => {
      if (!value.trim()) return ElMessage.warning('名稱不能為空')
      const newShelf = { id: 'shelf_' + Date.now(), name: value }
      if (insertIndex >= 0) {
        zone.shelves.splice(insertIndex, 0, newShelf)
      } else {
        zone.shelves.push(newShelf)
      }
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('已新增層架')
    }
  })
}

function editName(type, target, zone = null) {
  const currentName = type === 'zone' ? target.name : target.name
  openModal({
    type: 'prompt',
    title: `修改${type === 'zone' ? '區域' : '層架'}名稱`,
    text: '請輸入新名稱',
    inputValue: currentName,
    confirmText: '儲存',
    icon: 'Edit',
    iconColor: 'var(--accent)',
    onConfirm: (value) => {
      if (!value.trim()) return ElMessage.warning('名稱不能為空')
      if (type === 'zone') {
        const z = fridgeStore.fridgeStructure.find(z => z.id === target.id)
        if (z) z.name = value
      } else {
        const s = zone.shelves.find(s => s.id === target.id)
        if (s) s.name = value
      }
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('名稱已更新')
    }
  })
}

function removeShelf(zone, shelfId) {
  const foodsInShelf = inventoryStore.getFoodsByShelf(zone.id, shelfId)
  const hasFoods = foodsInShelf.length > 0
  openModal({
    title: hasFoods ? '警告：層架內有食材' : '刪除層架',
    text: hasFoods ? `此層架還有 ${foodsInShelf.length} 樣食材，刪除後將變成「未指定位置」。` : '確定要刪除這個層架嗎？',
    iconColor: 'var(--danger)', confirmText: '確定刪除', confirmType: 'danger',
    onConfirm: () => {
      if (hasFoods) inventoryStore.unassignFoodsInShelf(zone.id, shelfId)
      zone.shelves = zone.shelves.filter(s => s.id !== shelfId)
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('已刪除層架，食材已移出')
    }
  })
}

function removeZone(zoneId) {
  const foodsInZone = inventoryStore.activeFoods.filter(f => f.zone === zoneId)
  const hasFoods = foodsInZone.length > 0
  
  openModal({
    title: '刪除區域',
    text: hasFoods ? `此區域還有 ${foodsInZone.length} 樣食材，刪除後將變成「未指定位置」。` : '確定要刪除整個區域嗎？',
    iconColor: 'var(--danger)', confirmText: '確定刪除', confirmType: 'danger',
    onConfirm: () => {
      if (hasFoods) inventoryStore.unassignFoodsInZone(zoneId)
      fridgeStore.fridgeStructure = fridgeStore.fridgeStructure.filter(z => z.id !== zoneId)
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('已刪除區域，食材已移出')
    }
  })
}

function resetFridge() {
  openModal({
    title: '重置冰箱', text: '確定要清除目前的冰箱設定嗎？這會將所有食材移至未指定位置。', iconColor: 'var(--danger)', confirmText: '確定重置', confirmType: 'danger',
    onConfirm: () => { fridgeStore.setFridgeStructure([]); isEditMode.value = false }
  })
}

// =========================================
// 拖曳（電腦端）
// =========================================
function onDragStart(event, foodId) {
  if (isEditMode.value || isMobile.value) return
  draggedItemId.value = foodId
  isDragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', foodId)
}

function onDragOver(event, zoneId, shelfId) {
  if (isEditMode.value || isMobile.value) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverZone.value = zoneId
  dragOverShelf.value = shelfId
}

function onDragLeave() {
  if (isMobile.value) return
  dragOverZone.value = ''
  dragOverShelf.value = ''
}

function onDrop(event, targetZoneId, targetShelfId) {
  if (isEditMode.value || isMobile.value) return
  event.preventDefault()
  if (!draggedItemId.value) return
  processDrop(draggedItemId.value, targetZoneId, targetShelfId)
  
  setTimeout(() => {
    draggedItemId.value = null
    isDragging.value = false
    dragOverZone.value = ''
    dragOverShelf.value = ''
  }, 100)
}

function processDrop(foodId, targetZoneId, targetShelfId) {
  const food = inventoryStore.foods.find(f => f.id === foodId)
  if (!food) return

  const sourceZoneId = food.zone
  const sourceIsFreezer = inventoryStore.isFreezerZone(sourceZoneId)
  const targetIsFreezer = inventoryStore.isFreezerZone(targetZoneId)
  const isCrossZone = sourceZoneId !== targetZoneId && (sourceIsFreezer !== targetIsFreezer)

  if (isCrossZone) {
    const recExpiry = inventoryStore.getRecommendedExpiry(food.name, targetZoneId)
    const sourceName = fridgeStore.fridgeStructure.find(z => z.id === sourceZoneId)?.name || '未知區域'
    const targetName = fridgeStore.fridgeStructure.find(z => z.id === targetZoneId)?.name || '未知區域'

    crossZoneData.value = {
      foodId,
      targetZoneId,
      targetShelfId,
      fromZone: sourceName,
      toZone: targetName,
      originalExpiry: food.expiry,
      customExpiry: recExpiry || food.expiry,
      isExtend: targetIsFreezer
    }
    crossZoneDialogVisible.value = true
  } else {
    inventoryStore.moveFood(foodId, targetZoneId, targetShelfId)
    ElMessage.success('已移動食材位置')
  }
}

function confirmCrossZoneMove() {
  const { foodId, targetZoneId, targetShelfId, customExpiry } = crossZoneData.value
  if (!customExpiry) {
    return ElMessage.warning('請選擇保存期限')
  }
  
  inventoryStore.moveFoodWithExpiry(foodId, targetZoneId, targetShelfId, customExpiry)
  ElMessage.success('已移動位置並更新期限')
  crossZoneDialogVisible.value = false
}

// =========================================
// 手機端長按拖曳
// =========================================
let longPressTimer = null
function handleTouchStart(e, food) {
  if (isEditMode.value) return
  draggedItemId.value = food.id
  isDragging.value = false
  
  longPressTimer = setTimeout(() => {
    isDragging.value = true
    if (navigator.vibrate) navigator.vibrate(50)
    ElMessage({ message: '放開手指來選擇位置，或拖曳到目標層架', type: 'info', duration: 1500 })
  }, 500)
}

function handleTouchMove(e) {
  if (!isDragging.value) {
    clearTimeout(longPressTimer)
    return
  }
  e.preventDefault()
  const touch = e.touches[0]
  const targetElement = document.elementFromPoint(touch.clientX, touch.clientY)
  const shelfEl = targetElement?.closest('.fridge-shelf')
  
  if (shelfEl) {
    dragOverShelf.value = shelfEl.dataset.shelfId
    dragOverZone.value = shelfEl.dataset.zoneId
  } else {
    dragOverShelf.value = ''
    dragOverZone.value = ''
  }
}

function handleTouchEnd(e, food) {
  clearTimeout(longPressTimer)
  if (isDragging.value) {
    if (dragOverZone.value && dragOverShelf.value) {
      processDrop(food.id, dragOverZone.value, dragOverShelf.value)
    }
    isDragging.value = false
    draggedItemId.value = null
    dragOverZone.value = ''
    dragOverShelf.value = ''
  } else {
    openDetail(food)
  }
}

// =========================================
// 其他操作
// =========================================
function onZoneDragStart(event, index) {
  if (!isEditMode.value || isMobile.value) return
  draggedZoneIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}
function onZoneDrop(event, targetIndex) {
  if (!isEditMode.value || isMobile.value || draggedZoneIndex.value === null) return
  event.preventDefault()
  const zones = [...fridgeStore.fridgeStructure]
  const [movedZone] = zones.splice(draggedZoneIndex.value, 1)
  zones.splice(targetIndex, 0, movedZone)
  fridgeStore.setFridgeStructure(zones)
  draggedZoneIndex.value = null
  ElMessage.success('已調整區域順序')
}

function onShelfDragStart(event, zoneId, index) {
  if (!isEditMode.value || isMobile.value) return
  draggedShelfInfo.value = { zoneId, index }
  event.dataTransfer.effectAllowed = 'move'
}
function onShelfDrop(event, zone, targetIndex) {
  if (!isEditMode.value || isMobile.value || !draggedShelfInfo.value) return
  event.preventDefault()
  const { zoneId, index: sourceIndex } = draggedShelfInfo.value
  if (zoneId === zone.id) {
    const shelves = [...zone.shelves]
    const [movedShelf] = shelves.splice(sourceIndex, 1)
    shelves.splice(targetIndex, 0, movedShelf)
    zone.shelves = shelves
  } else {
    const sourceZone = fridgeStore.fridgeStructure.find(z => z.id === zoneId)
    if (sourceZone) {
      const [movedShelf] = sourceZone.shelves.splice(sourceIndex, 1)
      zone.shelves.splice(targetIndex, 0, movedShelf)
    }
  }
  fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
  draggedShelfInfo.value = null
  ElMessage.success('已調整層架順序')
}

function handleEat(id) {
  inventoryStore.markAsEaten(id)
  ElMessage.success('已標記為吃完')
}

function openDiscardDialog(food) {
  discardFood.value = food
  discardQuantity.value = 1
  discardDialogVisible.value = true
}

function confirmDiscard() {
  if (!discardFood.value) return
  if (discardQuantity.value < 1) return ElMessage.warning('丟棄數量必須大於 0')
  if (discardQuantity.value > discardFood.value.quantity) {
    return ElMessage.warning(`不能超過現有數量 ${discardFood.value.quantity}`)
  }
  inventoryStore.markAsDiscarded(discardFood.value.id, discardQuantity.value)
  ElMessage.warning(`已將「${discardFood.value.name}」丟棄 ${discardQuantity.value} ${discardFood.value.unit}`)
  discardDialogVisible.value = false
  discardFood.value = null
}

function getFoodLevel(food) {
  const days = inventoryStore.getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)
  if (days < 0) return 'expired'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'warning'
  return 'fresh'
}

function getShelfStatusInfo(zoneId, shelfId) {
  const foods = inventoryStore.getFoodsByShelf(zoneId, shelfId)
  if (foods.length === 0) return { type: 'empty', counts: { expired: 0, urgent: 0, warning: 0, fresh: 0 }, total: 0 }
  const counts = { expired: 0, urgent: 0, warning: 0, fresh: 0 }
  foods.forEach(food => { counts[getFoodLevel(food)]++ })
  let type = 'fresh'
  if (counts.expired > 0) type = 'expired'
  else if (counts.urgent > 0) type = 'urgent'
  else if (counts.warning > 0) type = 'warning'
  return { type, counts, total: foods.length }
}

function isDoorZone(zoneName) { return fridgeStore.isDoorZone(zoneName) }

function getSuggestedZoneName(food) {
  const cat = food?.category || foodDatabase[food?.name]?.category
  const rules = {
    '乳製品': '冷藏室', '蔬菜': '蔬果室 / 冷藏', '水果': '蔬果室 / 冷藏',
    '肉類': '冷凍室', '海鮮': '冷凍室', '蛋類': '冷藏室',
    '飲品': '門邊', '調味料': '門邊', '其他': '冷藏室'
  }
  return rules[cat] || '冷藏室'
}

function getCrossZoneIcon(food) {
  if (!food.moveHistory || food.moveHistory.length === 0) return null
  const lastMove = food.moveHistory[food.moveHistory.length - 1]
  if (lastMove.from.includes('冷凍') && lastMove.to.includes('冷藏')) return '🔥'
  if (lastMove.from.includes('冷藏') && lastMove.to.includes('冷凍')) return '❄️'
  return null
}
function getCrossZoneTitle(food) {
  if (!food.moveHistory || food.moveHistory.length === 0) return ''
  const lastMove = food.moveHistory[food.moveHistory.length - 1]
  return `上次移動：${lastMove.from} → ${lastMove.to}`
}
</script>

<template>
  <div class="fridge-container">
    <!-- ================= 選擇冰箱畫面 ================= -->
    <div v-if="!fridgeStore.isFridgeConfigured" class="select-wrapper">
      <div class="page-header">
        <h2>歡迎使用鮮知</h2>
        <p class="hint">請先選擇您的冰箱類型，系統將為您建立專屬的視覺化空間</p>
      </div>
      <div class="section-title">選擇預設冰箱</div>
      <el-row :gutter="24" class="preset-row">
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="preset-card" shadow="hover" @click="selectPreset('double')">
            <div class="icon-wrapper bg-primary"><el-icon size="32" color="var(--accent)"><Box /></el-icon></div>
            <h3>經典雙門冰箱</h3><p>上冷凍、下冷藏，最常見的家庭款式</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="preset-card" shadow="hover" @click="selectPreset('triple')">
            <div class="icon-wrapper bg-success"><el-icon size="32" color="var(--sage)"><Menu /></el-icon></div>
            <h3>三門變頻冰箱</h3><p>獨立蔬果室，食材分類更清楚</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="preset-card" shadow="hover" @click="selectPreset('side')">
            <div class="icon-wrapper bg-warning"><el-icon size="32" color="var(--warning)"><Grid /></el-icon></div>
            <h3>對開雙門冰箱</h3><p>左冷凍、右冷藏，大容量收納</p>
          </el-card>
        </el-col>
      </el-row>
      <div class="section-title" style="margin-top: 30px;">進階設定</div>
      <el-row :gutter="24" class="preset-row">
        <el-col :xs="24" :sm="12">
          <el-card class="preset-card custom-card" shadow="hover" @click="selectCustom">
            <div class="icon-wrapper bg-info"><el-icon size="32" color="var(--muted)"><Edit /></el-icon></div>
            <h3>自訂專屬冰箱</h3><p>手動建立符合您家冰箱的隔層與門邊置物架</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-card class="preset-card ai-card" shadow="hover" @click="openAiDialog">
            <div class="icon-wrapper bg-purple"><el-icon size="32" color="var(--accent)"><MagicStick /></el-icon></div>
            <h3>AI 智慧辨識</h3><p>拍照讓 AI 自動辨識並建立冰箱結構</p>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- ================= 冰箱視圖 ================= -->
    <div v-else class="fridge-view-wrapper">
      
      <!-- 狀態圖例 -->
      <div class="status-legend" v-if="!isEditMode">
        <div class="legend-title">狀態說明：</div>
        <div class="legend-item"><span class="legend-dot expired"></span>已過期</div>
        <div class="legend-item"><span class="legend-dot urgent"></span>快過期 (3天內)</div>
        <div class="legend-item"><span class="legend-dot warning"></span>即將到期 (7天內)</div>
        <div class="legend-item"><span class="legend-dot fresh"></span>新鮮</div>
      </div>
      <div class="status-legend edit-legend" v-else>
        <div class="legend-title" style="color: var(--accent);"><el-icon><Edit /></el-icon> 編輯模式：</div>
        <div class="legend-item">手機端請使用下方按鈕調整，電腦端可拖曳排序</div>
      </div>

      <!-- 🌟 重構：頂部工具列 -->
      <div class="toolbar" :class="{ 'is-editing': isEditMode }">
        <div class="toolbar-title">
          <h2>冰箱視覺化配置</h2>
          <p class="hint desktop-only" v-if="!isEditMode">提示：滑鼠拖曳食材可改變位置，點擊空層架可直接新增</p>
        </div>
        
        <div class="toolbar-actions">
          <!-- 操作說明 -->
          <el-button class="btn-icon" circle text @click="guideDialogVisible = true" title="操作說明">
            <el-icon size="20"><QuestionFilled /></el-icon>
          </el-button>

          <template v-if="!isEditMode">
            <!-- 主要操作：新增食材 (下拉選單) -->
            <el-dropdown trigger="click" @command="handleAddOption" class="main-add-dropdown">
              <el-button type="primary" size="large" :icon="Plus" data-tour="btn-add-food">
                新增食材 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="manual" :icon="Document">手動輸入食材</el-dropdown-item>
                  <el-dropdown-item command="scan" :icon="Camera">AI 拍照辨識</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <!-- 次要操作：編輯結構 -->
            <el-button class="btn-secondary-ghost" size="large" @click="isEditMode = true" :icon="Edit">
              編輯結構
            </el-button>
            
            <!-- 更多操作 -->
            <el-dropdown trigger="click" @command="handleMoreCommand" class="desktop-only">
              <el-button class="btn-icon" circle text>
                <el-icon size="20"><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="reset" :icon="Delete" style="color: var(--danger);">重置冰箱</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>

          <!-- 編輯模式下的工具列 -->
          <template v-else>
            <el-button type="primary" plain @click="addZone" :icon="Plus">新增區域</el-button>
            <el-button type="success" @click="isEditMode = false" :icon="Check">完成編輯</el-button>
            <el-button type="danger" link @click="resetFridge" class="btn-danger-text desktop-only">重置冰箱</el-button>
          </template>
        </div>
      </div>

      <!-- 手機端專屬：查看冰箱門觸發器 -->
      <div v-if="isMobile && !isEditMode && fridgeStore.fridgeStructure.some(z => isDoorZone(z.name))" class="mobile-door-trigger" @click="doorDrawerVisible = true">
        <el-icon size="20"><Refrigerator /></el-icon>
        <span>打開門邊置物架 ({{ fridgeStore.fridgeStructure.filter(z => isDoorZone(z.name)).length }} 區)</span>
      </div>

      <div class="fridge-wrapper">
        <div class="fridge-body">
          <div class="fridge-light"></div>

          <!-- 門邊區 (電腦端顯示) -->
          <div class="fridge-doors" v-if="!isMobile && fridgeStore.fridgeStructure.some(z => isDoorZone(z.name))">
            <div 
              v-for="(zone, zIndex) in fridgeStore.fridgeStructure.filter(z => isDoorZone(z.name))" 
              :key="zone.id" 
              class="door-zone"
              :draggable="isEditMode && !isMobile"
              @dragstart="onZoneDragStart($event, fridgeStore.fridgeStructure.indexOf(zone))"
              @dragover.prevent
              @drop="onZoneDrop($event, fridgeStore.fridgeStructure.indexOf(zone))"
            >
              <div class="zone-title">
                <div class="zone-title-left">
                  <el-icon v-if="isEditMode && !isMobile" class="drag-handle"><Rank /></el-icon>
                  <span @dblclick="isEditMode ? editName('zone', zone) : null" :class="{ 'editable-text': isEditMode }">{{ zone.name }}</span>
                </div>
                <el-button v-if="isEditMode" type="danger" link @click="removeZone(zone.id)"><el-icon><Delete /></el-icon></el-button>
              </div>
              
              <div class="shelves-container">
                <div v-if="isEditMode" class="insert-shelf-btn" @click="addShelf(zone, 0)">
                  <el-icon><Plus /></el-icon> 在此插入層架
                </div>

                <div 
                  v-for="(shelf, sIndex) in zone.shelves" 
                  :key="shelf.id" 
                  class="fridge-shelf door-shelf" 
                  :class="[`shelf-${getShelfStatusInfo(zone.id, shelf.id).type}`, { 'drag-over': dragOverShelf === shelf.id, 'edit-shelf': isEditMode }]"
                  :data-zone-id="zone.id"
                  :data-shelf-id="shelf.id"
                  :draggable="isEditMode && !isMobile"
                  @dragstart.stop="onShelfDragStart($event, zone.id, sIndex)"
                  @dragover.prevent
                  @drop.stop="onShelfDrop($event, zone, sIndex)"
                  @dragover="!isEditMode && onDragOver($event, zone.id, shelf.id)"
                  @dragleave="onDragLeave"
                  @drop="!isEditMode && onDrop($event, zone.id, shelf.id)"
                  @click="!isEditMode && inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0 ? openQuickAdd(zone.id, shelf.id) : null"
                >
                  <div class="shelf-header">
                    <div class="shelf-label">
                      <el-icon v-if="isEditMode && !isMobile" class="drag-handle-small"><Rank /></el-icon>
                      <span @dblclick.stop="isEditMode ? editName('shelf', shelf, zone) : null" :class="{ 'editable-text': isEditMode }">{{ shelf.name }}</span>
                      <el-button v-if="isEditMode" type="danger" link size="small" @click.stop="removeShelf(zone, shelf.id)">×</el-button>
                    </div>
                    <div v-if="getShelfStatusInfo(zone.id, shelf.id).total > 0 && !isEditMode" class="shelf-badges">
                      <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.expired > 0" class="badge expired">{{ getShelfStatusInfo(zone.id, shelf.id).counts.expired }} 過期</span>
                      <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.urgent > 0" class="badge urgent">{{ getShelfStatusInfo(zone.id, shelf.id).counts.urgent }} 快過期</span>
                      <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.warning > 0" class="badge warning">{{ getShelfStatusInfo(zone.id, shelf.id).counts.warning }} 即期</span>
                    </div>
                  </div>
                  
                  <div class="food-items" v-if="!isEditMode">
                    <template v-for="(food, index) in inventoryStore.getFoodsByShelf(zone.id, shelf.id)" :key="food.id">
                      <el-popover v-if="!isMobile" placement="top" :width="240" trigger="hover">
                        <template #reference>
                          <div class="food-item" :draggable="true" @dragstart="onDragStart($event, food.id)" @dragend="isDragging = false" :data-tour="index === 0 ? 'first-food-item' : null">
                            <span v-if="getCrossZoneIcon(food)" class="cross-zone-icon" :title="getCrossZoneTitle(food)">{{ getCrossZoneIcon(food) }}</span>
                            <span class="food-tag" :class="`level-${getFoodLevel(food)}`">{{ food.name }}</span>
                            <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                          </div>
                        </template>
                        <div class="popover-content">
                          <div class="popover-title">{{ food.name }}</div>
                          <div class="popover-info">數量：{{ food.quantity }} {{ food.unit }}</div>
                          <div class="popover-info">期限：{{ inventoryStore.getDisplayExpiry(food) }} ({{ inventoryStore.getStatusText(food) }})</div>
                          <div class="popover-suggestion"><el-icon><LocationInformation /></el-icon> 建議位置：{{ getSuggestedZoneName(food) }}</div>
                          <div class="popover-actions">
                            <el-button type="primary" size="small" @click="openDetail(food)">詳情</el-button>
                            <el-button type="success" size="small" @click="handleEat(food.id)">吃完</el-button>
                            <el-button type="danger" plain size="small" @click="openDiscardDialog(food)">丟棄</el-button>
                          </div>
                        </div>
                      </el-popover>

                      <div v-else class="food-item mobile-draggable" :class="{ 'is-dragging-ghost': isDragging && draggedItemId === food.id }" @touchstart="handleTouchStart($event, food)" @touchmove="handleTouchMove" @touchend="handleTouchEnd($event, food)" @click.stop>
                        <span v-if="getCrossZoneIcon(food)" class="cross-zone-icon">{{ getCrossZoneIcon(food) }}</span>
                        <span class="food-tag" :class="`level-${getFoodLevel(food)}`">{{ food.name }}</span>
                        <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                      </div>
                    </template>
                    <div v-if="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0" class="empty-shelf" @click="openQuickAdd(zone.id, shelf.id)">
                      <el-icon><Plus /></el-icon> 點擊新增
                    </div>
                  </div>
                  <div v-else class="edit-shelf-placeholder">拖曳把手調整順序</div>
                </div>

                <div v-if="isEditMode" class="insert-shelf-btn" @click="addShelf(zone, zone.shelves.length)">
                  <el-icon><Plus /></el-icon> 在最下方新增層架
                </div>
              </div>
            </div>
          </div>

          <!-- 主體區 -->
          <div class="fridge-main-zones">
            <div 
              v-for="(zone, zIndex) in fridgeStore.fridgeStructure.filter(z => !isDoorZone(z.name))" 
              :key="zone.id" 
              class="fridge-zone"
              :draggable="isEditMode && !isMobile"
              @dragstart="onZoneDragStart($event, fridgeStore.fridgeStructure.indexOf(zone))"
              @dragover.prevent
              @drop="onZoneDrop($event, fridgeStore.fridgeStructure.indexOf(zone))"
            >
              <div class="zone-title">
                <div class="zone-title-left">
                  <el-icon v-if="isEditMode && !isMobile" class="drag-handle"><Rank /></el-icon>
                  <span @dblclick="isEditMode ? editName('zone', zone) : null" :class="{ 'editable-text': isEditMode }">{{ zone.name }}</span>
                </div>
                <el-button v-if="isEditMode" type="danger" link @click="removeZone(zone.id)"><el-icon><Delete /></el-icon></el-button>
              </div>
              
              <div class="shelves-container">
                <div v-if="isEditMode" class="insert-shelf-btn" @click="addShelf(zone, 0)">
                  <el-icon><Plus /></el-icon> 在此插入層架
                </div>

                <div 
                  v-for="(shelf, sIndex) in zone.shelves" 
                  :key="shelf.id" 
                  class="fridge-shelf" 
                  :class="[`shelf-${getShelfStatusInfo(zone.id, shelf.id).type}`, { 'drag-over': dragOverShelf === shelf.id, 'edit-shelf': isEditMode }]"
                  :data-zone-id="zone.id"
                  :data-shelf-id="shelf.id"
                  :draggable="isEditMode && !isMobile"
                  @dragstart.stop="onShelfDragStart($event, zone.id, sIndex)"
                  @dragover.prevent
                  @drop.stop="onShelfDrop($event, zone, sIndex)"
                  @dragover="!isEditMode && onDragOver($event, zone.id, shelf.id)"
                  @dragleave="onDragLeave"
                  @drop="!isEditMode && onDrop($event, zone.id, shelf.id)"
                  @click="!isEditMode && inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0 ? openQuickAdd(zone.id, shelf.id) : null"
                >
                  <div class="shelf-header">
                    <div class="shelf-label">
                      <el-icon v-if="isEditMode && !isMobile" class="drag-handle-small"><Rank /></el-icon>
                      <span @dblclick.stop="isEditMode ? editName('shelf', shelf, zone) : null" :class="{ 'editable-text': isEditMode }">{{ shelf.name }}</span>
                      <el-button v-if="isEditMode" type="danger" link size="small" @click.stop="removeShelf(zone, shelf.id)">×</el-button>
                    </div>
                    <div v-if="getShelfStatusInfo(zone.id, shelf.id).total > 0 && !isEditMode" class="shelf-badges">
                      <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.expired > 0" class="badge expired">{{ getShelfStatusInfo(zone.id, shelf.id).counts.expired }} 過期</span>
                      <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.urgent > 0" class="badge urgent">{{ getShelfStatusInfo(zone.id, shelf.id).counts.urgent }} 快過期</span>
                      <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.warning > 0" class="badge warning">{{ getShelfStatusInfo(zone.id, shelf.id).counts.warning }} 即期</span>
                    </div>
                  </div>
                  
                  <div class="food-items" v-if="!isEditMode">
                    <template v-for="(food, index) in inventoryStore.getFoodsByShelf(zone.id, shelf.id)" :key="food.id">
                      <el-popover v-if="!isMobile" placement="top" :width="240" trigger="hover">
                        <template #reference>
                          <div class="food-item" :draggable="true" @dragstart="onDragStart($event, food.id)" @dragend="isDragging = false" :data-tour="index === 0 ? 'first-food-item' : null">
                            <span v-if="getCrossZoneIcon(food)" class="cross-zone-icon" :title="getCrossZoneTitle(food)">{{ getCrossZoneIcon(food) }}</span>
                            <span class="food-tag" :class="`level-${getFoodLevel(food)}`">{{ food.name }}</span>
                            <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                          </div>
                        </template>
                        <div class="popover-content">
                          <div class="popover-title">{{ food.name }}</div>
                          <div class="popover-info">數量：{{ food.quantity }} {{ food.unit }}</div>
                          <div class="popover-info">期限：{{ inventoryStore.getDisplayExpiry(food) }} ({{ inventoryStore.getStatusText(food) }})</div>
                          <div class="popover-suggestion"><el-icon><LocationInformation /></el-icon> 建議位置：{{ getSuggestedZoneName(food) }}</div>
                          <div class="popover-actions">
                            <el-button type="primary" size="small" @click="openDetail(food)">詳情</el-button>
                            <el-button type="success" size="small" @click="handleEat(food.id)">吃完</el-button>
                            <el-button type="danger" plain size="small" @click="openDiscardDialog(food)">丟棄</el-button>
                          </div>
                        </div>
                      </el-popover>

                      <div v-else class="food-item mobile-draggable" :class="{ 'is-dragging-ghost': isDragging && draggedItemId === food.id }" @touchstart="handleTouchStart($event, food)" @touchmove="handleTouchMove" @touchend="handleTouchEnd($event, food)" @click.stop>
                        <span v-if="getCrossZoneIcon(food)" class="cross-zone-icon">{{ getCrossZoneIcon(food) }}</span>
                        <span class="food-tag" :class="`level-${getFoodLevel(food)}`">{{ food.name }}</span>
                        <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                      </div>
                    </template>
                    <div v-if="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0" class="empty-shelf" @click="openQuickAdd(zone.id, shelf.id)">
                      <el-icon><Plus /></el-icon> 點擊新增
                    </div>
                  </div>
                  <div v-else class="edit-shelf-placeholder">拖曳把手調整順序</div>
                </div>

                <div v-if="isEditMode" class="insert-shelf-btn" @click="addShelf(zone, zone.shelves.length)">
                  <el-icon><Plus /></el-icon> 在最下方新增層架
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手機版：冰箱門抽屜 -->
    <el-drawer v-model="doorDrawerVisible" title="門邊置物架" direction="btt" size="70%" class="door-drawer">
      <div class="drawer-content">
        <div v-if="isEditMode" class="drawer-edit-actions" style="margin-bottom: 16px; text-align: center;">
          <el-button type="primary" @click="addZone" icon="Plus" size="small">新增區域</el-button>
        </div>
        <div v-for="zone in fridgeStore.fridgeStructure.filter(z => isDoorZone(z.name))" :key="zone.id" class="door-zone">
          <div class="zone-title" style="justify-content: center; gap: 10px;">
            {{ zone.name }}
            <el-button v-if="isEditMode" type="danger" link @click="removeZone(zone.id)"><el-icon><Delete /></el-icon></el-button>
          </div>
          <div class="shelves-container">
            <div v-for="shelf in zone.shelves" :key="shelf.id" class="fridge-shelf door-shelf" :class="`shelf-${getShelfStatusInfo(zone.id, shelf.id).type}`">
              <div class="shelf-header">
                <div class="shelf-label">{{ shelf.name }} <el-button v-if="isEditMode" type="danger" link size="small" @click.stop="removeShelf(zone, shelf.id)">×</el-button></div>
                <div v-if="getShelfStatusInfo(zone.id, shelf.id).total > 0" class="shelf-badges">
                  <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.expired > 0" class="badge expired">{{ getShelfStatusInfo(zone.id, shelf.id).counts.expired }} 過期</span>
                  <span v-if="getShelfStatusInfo(zone.id, shelf.id).counts.urgent > 0" class="badge urgent">{{ getShelfStatusInfo(zone.id, shelf.id).counts.urgent }} 快過期</span>
                </div>
              </div>
              <div class="food-items">
                <div v-for="food in inventoryStore.getFoodsByShelf(zone.id, shelf.id)" :key="food.id" class="food-item" @click="openDetail(food)">
                  <span v-if="getCrossZoneIcon(food)" class="cross-zone-icon">{{ getCrossZoneIcon(food) }}</span>
                  <span class="food-tag" :class="`level-${getFoodLevel(food)}`">{{ food.name }}</span>
                  <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                </div>
                <div v-if="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0" class="empty-shelf">空</div>
              </div>
              <el-button v-if="isEditMode" type="primary" link size="small" class="add-shelf-btn" @click.stop="addShelf(zone)">+ 加層架</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 快速新增彈窗 -->
    <el-dialog v-model="quickAddVisible" title="快速新增食材" width="500px" align-center class="custom-app-dialog" destroy-on-close>
      <FoodForm :initial-zone="quickAddZone" :initial-shelf="quickAddShelf" :autoScan="quickAddAutoScan" @submit="handleQuickAddSubmit" />
    </el-dialog>

    <!-- 食材詳情彈窗 -->
    <FoodDetailDialog v-model:visible="detailVisible" :food="currentDetailFood" />

    <!-- 跨溫區移動彈窗 -->
    <el-dialog v-model="crossZoneDialogVisible" title="跨溫區移動" width="420px" align-center class="custom-app-dialog" :close-on-click-modal="false">
      <div class="cross-zone-content">
        <div class="zone-change-visual">
          <div class="zone-badge">{{ crossZoneData.fromZone }}</div>
          <el-icon size="20" color="var(--accent)"><Right /></el-icon>
          <div class="zone-badge highlight">{{ crossZoneData.toZone }}</div>
        </div>
        <el-alert :title="crossZoneData.isExtend ? '移至冷凍庫，建議延長保存期限。' : '移至冷藏室，保存期限將大幅縮短！'" :type="crossZoneData.isExtend ? 'success' : 'warning'" show-icon :closable="false" style="margin-bottom: 20px;" />
        <div class="expiry-compare-box">
          <div class="expiry-row"><span class="label">原本期限</span><span class="value">{{ crossZoneData.originalExpiry }}</span></div>
          <div class="expiry-row"><span class="label">建議新期限</span><span class="value highlight">{{ crossZoneData.customExpiry }}</span></div>
        </div>
        <div class="date-picker-wrapper">
          <span class="picker-label">自訂期限：</span>
          <el-date-picker v-model="crossZoneData.customExpiry" type="date" placeholder="選擇日期" value-format="YYYY-MM-DD" style="width: 100%;" />
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="crossZoneDialogVisible = false">取消移動</el-button>
          <el-button type="primary" @click="confirmCrossZoneMove">確認移動並更新</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 操作說明彈窗 -->
    <el-dialog v-model="guideDialogVisible" title="操作說明" width="400px" align-center class="custom-app-dialog">
      <div class="guide-content">
        <div class="guide-section">
          <h4><el-icon><Monitor /></el-icon> 電腦端</h4>
          <ul>
            <li>點擊食材：查看詳細資訊。</li>
            <li>按住食材拖曳：移動到其他層架或溫區。</li>
            <li>點擊空層架：快速新增食材。</li>
          </ul>
        </div>
        <div class="guide-section">
          <h4><el-icon><Cellphone /></el-icon> 手機端</h4>
          <ul>
            <li>點擊食材：查看詳細資訊。</li>
            <li><strong>長按食材 (約0.5秒)：</strong> 進入拖曳模式，滑動手指即可移動位置。</li>
            <li>點擊「打開門邊置物架」按鈕：查看門邊空間。</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="guideDialogVisible = false">我知道了</el-button>
      </template>
    </el-dialog>

    <!-- 丟棄彈窗 -->
    <el-dialog v-model="discardDialogVisible" title="丟棄食材" width="400px" align-center class="custom-app-dialog">
      <div class="discard-dialog-content" v-if="discardFood">
        <el-icon size="56" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
        <h3 class="discard-title">確定要丟棄「{{ discardFood.name }}」嗎？</h3>
        <p class="discard-subtitle">目前庫存：{{ discardFood.quantity }} {{ discardFood.unit }}</p>
        <div class="quantity-input-group">
          <span class="label">丟棄數量：</span>
          <el-input-number v-model="discardQuantity" :min="1" :max="discardFood.quantity" :step="1" size="large" />
          <span class="unit">{{ discardFood.unit }}</span>
        </div>
        <div class="discard-hint">
          <el-alert title="丟棄後將計入本月浪費金額。若全部丟棄會移至回收桶，30 天內皆可還原。" type="warning" show-icon :closable="false" />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="discardDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDiscard">確定丟棄</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 通用輸入彈窗 -->
    <el-dialog v-model="modalState.visible" :title="modalState.title" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon :size="48" :color="modalState.iconColor" style="margin-bottom: 16px;"><component :is="modalState.icon" /></el-icon>
        <p class="dialog-title">{{ modalState.text }}</p>
        <el-input v-if="modalState.type === 'prompt'" v-model="modalState.inputValue" :placeholder="modalState.inputPlaceholder" style="margin-top: 16px;" @keyup.enter="handleConfirm" />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeModal">取消</el-button>
          <el-button :type="modalState.confirmType" @click="handleConfirm">{{ modalState.confirmText }}</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- AI 結構辨識彈窗 -->
    <el-dialog v-model="isAiDialogVisible" title="AI 冰箱結構辨識" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <template v-if="!isAiScanning">
          <el-icon size="64" color="var(--muted)" style="margin-bottom: 16px;"><Camera /></el-icon>
          <p class="dialog-title">請拍攝或上傳一張冰箱內部的照片</p>
          <el-upload action="#" :auto-upload="false" :show-file-list="false" style="margin-top: 16px;"><el-button plain>選擇照片</el-button></el-upload>
          <el-button type="primary" style="margin-top: 24px; width: 100%;" @click="simulateAiScan">開始模擬辨識</el-button>
        </template>
        <template v-else>
          <el-icon class="is-loading" size="64" color="var(--accent)" style="margin-bottom: 16px;"><Loading /></el-icon>
          <p class="dialog-title">AI 正在分析冰箱結構，請稍候...</p>
          <el-progress :percentage="100" :indeterminate="true" :duration="2" style="margin-top: 20px;" />
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.fridge-container { width: 100%; max-width: 1100px; margin: 0 auto; }

/* =========================================
   按鈕與工具列重構
   ========================================= */
.toolbar {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: var(--space-5); flex-wrap: wrap; gap: 12px;
  padding: 12px 16px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  transition: background-color var(--transition-base), border-color var(--transition-base);
}

/* 編輯模式下工具列加深，提示使用者 */
.toolbar.is-editing {
  background: var(--accent-light);
  border-color: var(--accent);
}

.toolbar-title h2 { margin: 0 0 4px 0; font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }

.toolbar-actions {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}

/* 主操作下拉按鈕 */
.main-add-dropdown :deep(.el-button) {
  height: 44px;
  padding: 0 20px;
  font-size: var(--text-base);
  border-radius: var(--radius-md);
  font-weight: 600;
}

/* 次要操作幽靈按鈕 */
.btn-secondary-ghost {
  height: 44px;
  background: var(--surface) !important;
  border: 1px solid var(--border) !important;
  color: var(--ink) !important;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}
.btn-secondary-ghost:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  background: var(--accent-light) !important;
}

/* 純圖示按鈕 */
.btn-icon {
  width: 44px;
  height: 44px;
  color: var(--muted);
  background: transparent;
}
.btn-icon:hover { color: var(--accent); background: var(--accent-light); }

.btn-danger-text { color: var(--danger) !important; padding: 0 12px; }
.btn-danger-text:hover { background: var(--el-color-danger-light-9) !important; color: var(--danger) !important; }

/* 選擇冰箱畫面 */
.select-wrapper { padding: 20px; }
.page-header { margin-bottom: 30px; text-align: center; }
.page-header h2 { margin: 0 0 12px 0; font-size: var(--text-xl); }
.section-title { font-size: var(--text-lg); font-weight: 600; margin-bottom: 16px; padding-left: 12px; border-left: 2px solid var(--accent); }
.preset-row { margin-bottom: 20px; }
.preset-card { cursor: pointer; border-radius: var(--radius-lg); display: flex; flex-direction: column; padding: 24px; min-height: 200px; text-align: left; }
.preset-card:hover { border-color: var(--accent); }
.icon-wrapper { width: 56px; height: 56px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.bg-primary { background: var(--accent-light); }
.bg-success { background: var(--el-color-success-light-9); }
.bg-warning { background: var(--el-color-warning-light-9); }
.bg-info { background: var(--border-light); }
.bg-purple { background: var(--accent-light); }
.preset-card h3 { margin: 0 0 8px 0; font-size: var(--text-base); }
.preset-card p { color: var(--muted); font-size: var(--text-sm); margin: 0; line-height: 1.5; flex: 1; }

/* 狀態圖例 */
.status-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 12px 16px; background: var(--surface); border-radius: var(--radius-md); margin-bottom: var(--space-4); border: 1px solid var(--border-light); }
.edit-legend { border-color: var(--accent); background: var(--accent-light); }
.legend-title { font-size: var(--text-sm); font-weight: 600; display: flex; align-items: center; gap: 4px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--text-xs); color: var(--muted); }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.legend-dot.expired { background: var(--danger); }
.legend-dot.urgent { background: var(--accent); }
.legend-dot.warning { background: var(--warning); }
.legend-dot.fresh { background: var(--sage); }

.fridge-view-wrapper { padding: 0; }
.fridge-wrapper { display: flex; justify-content: center; margin-top: var(--space-4); }

/* 手機端專屬：查看冰箱門觸發器 */
.mobile-door-trigger {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px;
  background: var(--surface); color: var(--ink); border: 1px solid var(--border); border-radius: var(--radius-md);
  font-weight: 600; font-size: var(--text-sm); margin-bottom: var(--space-4); cursor: pointer;
  box-shadow: var(--shadow-sm); transition: background-color var(--transition-fast), border-color var(--transition-fast);
}
.mobile-door-trigger:active { background: var(--surface-hover); border-color: var(--accent); }

/* 冰箱材質 */
.fridge-body { background: var(--fridge-body); border: 8px solid var(--fridge-frame); border-radius: 24px; padding: 24px; display: flex; gap: 24px; width: 100%; box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05), var(--shadow-md); position: relative; overflow: hidden; }
.fridge-light { position: absolute; top: 0; left: 0; right: 0; height: 180px; background: linear-gradient(180deg, var(--fridge-light) 0%, transparent 100%); pointer-events: none; z-index: 0; }
.fridge-doors { width: 200px; flex-shrink: 0; border-right: 1px dashed var(--border); padding-right: 24px; display: flex; flex-direction: column; gap: 20px; z-index: 1; }
.fridge-main-zones { flex: 1; display: flex; flex-direction: column; gap: 24px; z-index: 1; }

.fridge-zone, .door-zone { background: rgba(255, 255, 255, 0.1); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border-light); backdrop-filter: blur(4px); }
.fridge-zone[draggable="true"], .door-zone[draggable="true"] { cursor: grab; border: 1px dashed var(--accent); }

.zone-title { font-size: var(--text-base); font-weight: 600; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.zone-title-left { display: flex; align-items: center; gap: 8px; }
.drag-handle { color: var(--accent); cursor: grab; }
.drag-handle-small { color: var(--accent); font-size: 12px; cursor: grab; }
.editable-text { border-bottom: 1px dashed var(--accent); cursor: text; padding: 0 4px; }

.shelves-container { display: flex; flex-direction: column; gap: 12px; }

/* 插入層架按鈕（只在編輯模式出現，帶有 hover 效果） */
.insert-shelf-btn {
  display: flex; align-items: center; justify-content: center; gap: 4px; height: 40px;
  border: 1px dashed var(--accent); border-radius: var(--radius-sm); color: var(--accent);
  font-size: var(--text-xs); cursor: pointer; opacity: 0.6;
  transition: opacity var(--transition-fast), background-color var(--transition-fast);
}
.insert-shelf-btn:hover { opacity: 1; background: rgba(255, 255, 255, 0.2); }

.fridge-shelf { background: var(--fridge-shelf); border: 1px solid var(--border); border-radius: var(--radius-md); height: 140px; padding: 12px; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); position: relative; display: flex; flex-direction: column; cursor: pointer; box-shadow: var(--shadow-sm); }
.door-shelf { height: 100px; }

.fridge-shelf.edit-shelf { cursor: grab; border: 1px dashed var(--accent); height: 80px; justify-content: center; background: rgba(255, 255, 255, 0.1); }
.edit-shelf-placeholder { display: flex; align-items: center; justify-content: center; color: var(--accent); font-size: var(--text-xs); opacity: 0.8; }

.fridge-shelf.shelf-expired { border-color: var(--danger); background: var(--el-color-danger-light-9); }
.fridge-shelf.shelf-urgent { border-color: var(--accent); background: var(--accent-light); }
.fridge-shelf.shelf-warning { border-color: var(--warning); background: var(--el-color-warning-light-9); }
.fridge-shelf.shelf-fresh { border-color: var(--sage); background: var(--el-color-success-light-9); }
.fridge-shelf.drag-over { border-color: var(--accent) !important; box-shadow: 0 0 0 2px var(--accent) inset; transform: scale(1.02); }

.shelf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; z-index: 2; }
.shelf-label { background: var(--surface); padding: 2px 10px; font-size: var(--text-xs); font-weight: 600; color: var(--ink); border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; align-items: center; gap: 5px; box-shadow: var(--shadow-sm); }

.shelf-badges { display: flex; gap: 6px; }
.badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 600; color: white; }
.badge.expired { background: var(--danger); }
.badge.urgent { background: var(--accent); }
.badge.warning { background: var(--warning); }

.food-items { display: flex; flex-wrap: wrap; gap: 8px; overflow: hidden; flex: 1; align-content: flex-start; }
.food-item { display: flex; align-items: center; gap: 6px; background: var(--surface); padding: 4px 10px; border-radius: var(--radius-sm); cursor: grab; border: 1px solid var(--border-light); box-shadow: var(--shadow-sm); transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity 0.2s; position: relative; }

@media (max-width: 768px) {
  .food-item.mobile-draggable { cursor: pointer; touch-action: pan-y; }
  .food-item.is-dragging-ghost { opacity: 0.4; transform: scale(0.95); border: 1px dashed var(--accent); pointer-events: none; }
}

.food-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.cross-zone-icon { font-size: 12px; margin-right: -2px; cursor: help; }
.food-tag { font-size: var(--text-xs); font-weight: 600; padding: 1px 0; color: var(--ink); }
.food-tag.level-expired { color: var(--danger); }
.food-tag.level-urgent { color: var(--accent); }
.food-tag.level-warning { color: var(--warning); }
.food-tag.level-fresh { color: var(--sage); }

.food-qty { font-size: 11px; color: var(--muted); }
.empty-shelf { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: var(--text-xs); gap: 4px; border: 1px dashed transparent; transition: color var(--transition-fast), border-color var(--transition-fast); }
.fridge-shelf:hover .empty-shelf { color: var(--accent); border-color: var(--accent); }

.popover-content { text-align: center; }
.popover-title { font-weight: 700; font-size: var(--text-base); margin-bottom: 8px; }
.popover-info { font-size: var(--text-sm); color: var(--muted); margin-bottom: 4px; }
.popover-suggestion { font-size: var(--text-xs); color: var(--sage); background: var(--el-color-success-light-9); padding: 4px; border-radius: var(--radius-sm); margin: 8px 0; display: flex; align-items: center; justify-content: center; gap: 4px; }
.popover-actions { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }

/* 跨溫區彈窗樣式 */
.cross-zone-content { padding: 0 10px; }
.zone-change-visual { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 24px; }
.zone-badge { background: var(--surface-hover); padding: 8px 16px; border-radius: var(--radius-md); font-weight: 600; font-size: var(--text-base); color: var(--muted); }
.zone-badge.highlight { background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent); }
.expiry-compare-box { background: var(--ground); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; }
.expiry-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: var(--text-sm); }
.expiry-row:last-child { margin-bottom: 0; }
.expiry-row .label { color: var(--muted); }
.expiry-row .value { font-weight: 600; color: var(--ink); }
.expiry-row .value.highlight { color: var(--accent); }
.date-picker-wrapper { display: flex; flex-direction: column; gap: 8px; }
.picker-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }

/* 操作說明 */
.guide-content { padding: 10px; }
.guide-section { margin-bottom: 20px; }
.guide-section h4 { display: flex; align-items: center; gap: 8px; font-size: var(--text-base); margin-bottom: 8px; color: var(--ink); }
.guide-section ul { padding-left: 20px; margin: 0; font-size: var(--text-sm); color: var(--muted); line-height: 1.6; }
.guide-section li strong { color: var(--accent); }

.drawer-content { padding: 10px 20px; }
.drawer-content .door-zone { box-shadow: none; border: none; padding: 0; background: transparent; margin-bottom: 24px; }
.drawer-content .fridge-shelf { height: auto; min-height: 100px; }

.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 120px; }

.discard-dialog-content { text-align: center; padding: 10px 0; }
.discard-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.discard-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; }
.quantity-input-group { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 20px; }
.quantity-input-group .label { font-size: var(--text-base); color: var(--ink); font-weight: 500; }
.quantity-input-group .unit { font-size: var(--text-base); color: var(--muted); }
.discard-hint { text-align: left; }

/* =========================================
   📱 手機端自適應優化
   ========================================= */
@media (max-width: 768px) {
  .fridge-view-wrapper { padding: 0; }
  
  /* 工具列手機端：改為垂直堆疊，按鈕滿寬 */
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
  }
  .toolbar-actions {
    width: 100%;
    justify-content: space-between;
    margin-top: 8px;
  }
  .main-add-dropdown { flex: 1; }
  .main-add-dropdown :deep(.el-button) { width: 100%; }
  .btn-secondary-ghost { flex: 1; }
  
  .fridge-body { flex-direction: column; padding: 12px; gap: 12px; border-width: 4px; border-radius: 16px; }
  .fridge-main-zones { width: 100%; gap: 16px; }
  .fridge-doors { display: none; }
  .fridge-zone { padding: 12px; }
  .zone-title { font-size: var(--text-sm); margin-bottom: 12px; }
  .fridge-shelf { height: 110px; padding: 10px; }
  
  .status-legend { gap: 10px; padding: 10px 12px; }
  .legend-item { font-size: 11px; }
  
  .insert-shelf-btn { height: 44px; font-size: var(--text-sm); }
  .fridge-shelf.edit-shelf { height: 70px; }
  .food-item { padding: 6px 12px; cursor: pointer; }
}
</style>

<style>
.custom-app-dialog { 
  --el-dialog-bg-color: var(--surface); 
  --el-dialog-border-radius: var(--radius-lg); 
  --el-dialog-padding-primary: 24px; 
}
.custom-app-dialog .el-dialog__header { 
  margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light); 
  padding-bottom: 16px; margin-bottom: 16px; 
}
.custom-app-dialog .el-dialog__title { 
  font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); 
}
.door-drawer .el-drawer__header { 
  margin-bottom: 0; border-bottom: 1px solid var(--border-light); padding-bottom: 16px; font-weight: 600; 
}
.door-drawer .el-drawer__body { background: var(--ground); }
@media (max-width: 768px) {
  .custom-app-dialog { width: 92vw !important; max-width: 92vw; margin: 4vh auto !important; }
}
</style>