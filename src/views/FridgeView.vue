<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useFridgeStore, fridgePresets } from '@/stores/fridge'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Camera, Loading, Box, Menu, Grid, Edit, Delete, WarningFilled, MagicStick, Check, Close, Plus, Document, Refrigerator } from '@element-plus/icons-vue'
import FoodForm from '@/components/food/FoodForm.vue'
import FoodDetailDialog from '@/components/food/FoodDetailDialog.vue'

const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore() 

// --- 狀態管理 ---
const isAiDialogVisible = ref(false)
const isAiScanning = ref(false)
const isEditMode = ref(false)

// 手機版狀態與抽屜
const isMobile = ref(false)
const doorDrawerVisible = ref(false)

// 快速新增彈窗狀態
const quickAddVisible = ref(false)
const quickAddZone = ref('')
const quickAddShelf = ref('')

// 詳情彈窗狀態
const detailVisible = ref(false)
const currentDetailFood = ref(null)

// 拖曳高亮狀態
const dragOverZone = ref('')
const dragOverShelf = ref('')

// 監聽視窗大小變化
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

// --- 統一彈窗狀態管理 ---
const modalState = reactive({
  visible: false, type: 'confirm', title: '', text: '', icon: 'WarningFilled',
  iconColor: 'var(--el-color-warning)', inputValue: '', inputPlaceholder: '',
  confirmText: '確定', confirmType: 'primary', onConfirm: null
})

function openModal(config) {
  Object.assign(modalState, {
    visible: true, type: 'confirm', icon: 'WarningFilled', iconColor: 'var(--el-color-warning)',
    confirmText: '確定', confirmType: 'primary', inputValue: '', ...config
  })
}
function closeModal() { modalState.visible = false }
function handleConfirm() {
  if (modalState.onConfirm) modalState.onConfirm(modalState.inputValue)
  closeModal()
}

// --- 1. 冰箱選擇邏輯 ---
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

// --- 2. 快速新增與詳情邏輯 ---
function openQuickAdd(zoneId, shelfId) {
  if (isEditMode.value) return
  quickAddZone.value = zoneId
  quickAddShelf.value = shelfId
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

// --- 3. 編輯模式邏輯 ---
function addZone() { 
  openModal({
    type: 'prompt', title: '新增區域', text: '請輸入區域名稱 (例如：冷藏門邊)', confirmText: '新增', icon: 'Box', iconColor: 'var(--el-color-primary)',
    onConfirm: (value) => {
      if (!value.trim()) return ElMessage.warning('名稱不能為空')
      const newId = 'zone_' + Date.now()
      fridgeStore.fridgeStructure.push({ id: newId, name: value, shelves: [{ id: newId + '_s1', name: '層架 1' }] })
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('已新增區域')
    }
  })
}
function addShelf(zone) {
  openModal({
    type: 'prompt', title: '新增層架', text: `在「${zone.name}」新增層架`, confirmText: '新增', icon: 'Menu', iconColor: 'var(--el-color-success)',
    onConfirm: (value) => {
      if (!value.trim()) return ElMessage.warning('名稱不能為空')
      zone.shelves.push({ id: 'shelf_' + Date.now(), name: value })
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('已新增層架')
    }
  })
}
function removeShelf(zone, shelfId) {
  const foodsInShelf = inventoryStore.getFoodsByShelf(zone.id, shelfId)
  const hasFoods = foodsInShelf.length > 0
  openModal({
    title: hasFoods ? '警告：層架內有食材' : '刪除層架',
    text: hasFoods ? `此層架還有 ${foodsInShelf.length} 樣食材，刪除後將變成「未指定位置」。` : '確定要刪除這個層架嗎？',
    iconColor: 'var(--el-color-danger)', confirmText: '確定刪除', confirmType: 'danger',
    onConfirm: () => {
      zone.shelves = zone.shelves.filter(s => s.id !== shelfId)
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
      ElMessage.success('已刪除層架')
    }
  })
}
function removeZone(zoneId) {
  openModal({
    title: '刪除區域', text: '確定要刪除整個區域嗎？', iconColor: 'var(--el-color-danger)', confirmText: '確定刪除', confirmType: 'danger',
    onConfirm: () => {
      fridgeStore.fridgeStructure = fridgeStore.fridgeStructure.filter(z => z.id !== zoneId)
      fridgeStore.setFridgeStructure(fridgeStore.fridgeStructure)
    }
  })
}
function resetFridge() {
  openModal({
    title: '重置冰箱', text: '確定要清除目前的冰箱設定嗎？', iconColor: 'var(--el-color-warning)', confirmText: '確定重置', confirmType: 'warning',
    onConfirm: () => { fridgeStore.setFridgeStructure([]); isEditMode.value = false }
  })
}

// --- 4. 拖曳與懸浮操作 ---
const draggedItemId = ref(null)

function onDragStart(event, foodId) {
  draggedItemId.value = foodId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', foodId)
}

function onDragOver(event, zoneId, shelfId) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverZone.value = zoneId
  dragOverShelf.value = shelfId
}

function onDragLeave() {
  dragOverZone.value = ''
  dragOverShelf.value = ''
}

function onDrop(event, zoneId, shelfId) {
  event.preventDefault()
  if (draggedItemId.value) {
    inventoryStore.moveFood(draggedItemId.value, zoneId, shelfId)
    ElMessage.success('已移動食材位置')
    draggedItemId.value = null
  }
  dragOverZone.value = ''
  dragOverShelf.value = ''
}

function handleEat(id) {
  inventoryStore.markAsEaten(id)
  ElMessage.success('已標記為吃完')
}
function handleDiscard(id, qty) {
  ElMessageBox.prompt('請輸入丟棄數量', '丟棄食材', {
    confirmButtonText: '確定', cancelButtonText: '取消',
    inputPattern: /^[1-9]\d*$/,
    inputValidator: (val) => Number(val) <= qty || `不能超過現有數量 ${qty}`,
  }).then(({ value }) => {
    inventoryStore.markAsDiscarded(id, Number(value))
    ElMessage.warning('已記錄丟棄')
  }).catch(() => {})
}

// --- 5. 判斷層架狀態 (紅/黃/綠) ---
function getShelfStatus(zoneId, shelfId) {
  const foods = inventoryStore.getFoodsByShelf(zoneId, shelfId)
  if (foods.length === 0) return 'empty'
  
  let hasExpired = false
  let hasFresh = false
  
  foods.forEach(food => {
    if (inventoryStore.getDaysLeft(food.expiry) < 0) hasExpired = true
    else hasFresh = true
  })

  if (hasExpired && hasFresh) return 'warning'
  if (hasExpired) return 'danger'
  return 'success'
}

function isDoorZone(zoneName) {
  return fridgeStore.isDoorZone(zoneName)
}
</script>

<template>
  <div class="fridge-container">
    <!-- 選擇冰箱畫面 -->
    <div v-if="!fridgeStore.isFridgeConfigured" class="select-wrapper">
      <div class="page-header">
        <h2>歡迎使用冰智庫</h2>
        <p class="hint">請先選擇您的冰箱類型，系統將為您建立專屬的視覺化空間</p>
      </div>
      <div class="section-title">選擇預設冰箱</div>
      <el-row :gutter="24" class="preset-row">
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="preset-card" shadow="hover" @click="selectPreset('double')">
            <div class="icon-wrapper bg-primary"><el-icon size="32" color="var(--el-color-primary)"><Box /></el-icon></div>
            <h3>經典雙門冰箱</h3><p>上冷凍、下冷藏，最常見的家庭款式</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="preset-card" shadow="hover" @click="selectPreset('triple')">
            <div class="icon-wrapper bg-success"><el-icon size="32" color="var(--el-color-success)"><Menu /></el-icon></div>
            <h3>三門變頻冰箱</h3><p>獨立蔬果室，食材分類更清楚</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8">
          <el-card class="preset-card" shadow="hover" @click="selectPreset('side')">
            <div class="icon-wrapper bg-warning"><el-icon size="32" color="var(--el-color-warning)"><Grid /></el-icon></div>
            <h3>對開雙門冰箱</h3><p>左冷凍、右冷藏，大容量收納</p>
          </el-card>
        </el-col>
      </el-row>
      <div class="section-title" style="margin-top: 30px;">進階設定</div>
      <el-row :gutter="24" class="preset-row">
        <el-col :xs="24" :sm="12">
          <el-card class="preset-card custom-card" shadow="hover" @click="selectCustom">
            <div class="icon-wrapper bg-info"><el-icon size="32" color="var(--el-color-info)"><Edit /></el-icon></div>
            <h3>自訂專屬冰箱</h3><p>手動建立符合您家冰箱的隔層與門邊置物架</p>
          </el-card>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-card class="preset-card ai-card" shadow="hover" @click="openAiDialog">
            <div class="icon-wrapper bg-purple"><el-icon size="32" color="#8e44ad"><MagicStick /></el-icon></div>
            <h3>AI 智慧辨識</h3><p>拍照讓 AI 自動辨識並建立冰箱結構</p>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 冰箱視圖 -->
    <div v-else class="fridge-view-wrapper">
      <div class="toolbar">
        <div>
          <h2>冰箱視覺化配置</h2>
          <p class="hint">提示：滑鼠拖曳食材可改變位置，點擊空層架可直接新增</p>
        </div>
        <div class="toolbar-actions">
          <!-- 手機版專屬：開啟冰箱門抽屜 -->
          <el-button v-if="isMobile" type="info" plain @click="doorDrawerVisible = true" icon="Refrigerator">
            查看冰箱門
          </el-button>
          <el-button v-if="isEditMode" type="primary" @click="addZone" icon="Plus">新增區域</el-button>
          <el-button :type="isEditMode ? 'success' : 'default'" @click="isEditMode = !isEditMode">
            {{ isEditMode ? '完成編輯' : '編輯結構' }}
          </el-button>
          <el-button type="danger" plain @click="resetFridge">重置冰箱</el-button>
        </div>
      </div>

      <div class="fridge-wrapper">
        <div class="fridge-body">
          <div class="fridge-light"></div>

          <!-- 門邊區 (電腦版顯示) -->
          <div class="fridge-doors" v-if="!isMobile && fridgeStore.fridgeStructure.some(z => isDoorZone(z.name))">
            <div v-for="zone in fridgeStore.fridgeStructure.filter(z => isDoorZone(z.name))" :key="zone.id" class="door-zone">
              <div class="zone-title">{{ zone.name }} <el-button v-if="isEditMode" type="danger" link @click="removeZone(zone.id)"><el-icon><Delete /></el-icon></el-button></div>
              <div class="shelves-container">
                <div v-for="shelf in zone.shelves" :key="shelf.id" 
                  class="fridge-shelf door-shelf" 
                  :class="[`status-${getShelfStatus(zone.id, shelf.id)}`, { 'drag-over': dragOverShelf === shelf.id }]"
                  @dragover="onDragOver($event, zone.id, shelf.id)"
                  @dragleave="onDragLeave"
                  @drop="onDrop($event, zone.id, shelf.id)"
                  @click="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0 ? openQuickAdd(zone.id, shelf.id) : null"
                >
                  <div class="shelf-label">{{ shelf.name }} <el-button v-if="isEditMode" type="danger" link size="small" @click.stop="removeShelf(zone, shelf.id)">×</el-button></div>
                  <div class="food-items">
                    <el-popover v-for="food in inventoryStore.getFoodsByShelf(zone.id, shelf.id)" :key="food.id" placement="top" :width="220" trigger="hover">
                      <template #reference>
                        <div class="food-item" draggable="true" @dragstart="onDragStart($event, food.id)">
                          <el-tag :type="inventoryStore.getStatus(food.expiry)" size="small" effect="dark" class="food-tag">{{ food.name }}</el-tag>
                          <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                        </div>
                      </template>
                      <div class="popover-content">
                        <div class="popover-title">{{ food.name }}</div>
                        <div class="popover-info">數量：{{ food.quantity }} {{ food.unit }}</div>
                        <div class="popover-info">期限：{{ food.expiry }} ({{ inventoryStore.getStatusText(food.expiry) }})</div>
                        <div class="popover-actions">
                          <el-button type="primary" size="small" icon="Document" @click="openDetail(food)">詳情</el-button>
                          <el-button type="success" size="small" icon="Check" @click="handleEat(food.id)">吃完</el-button>
                          <el-button type="danger" size="small" icon="Close" @click="handleDiscard(food.id, food.quantity)">丟棄</el-button>
                        </div>
                      </div>
                    </el-popover>
                    <div v-if="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0" class="empty-shelf" @click="openQuickAdd(zone.id, shelf.id)">
                      <el-icon><Plus /></el-icon> 點擊新增
                    </div>
                  </div>
                  <el-button v-if="isEditMode" type="primary" link size="small" class="add-shelf-btn" @click.stop="addShelf(zone)">+ 加層架</el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 主體區 -->
          <div class="fridge-main-zones">
            <div v-for="zone in fridgeStore.fridgeStructure.filter(z => !isDoorZone(z.name))" :key="zone.id" class="fridge-zone">
              <div class="zone-title">{{ zone.name }} <el-button v-if="isEditMode" type="danger" link @click="removeZone(zone.id)"><el-icon><Delete /></el-icon></el-button></div>
              <div class="shelves-container">
                <div v-for="shelf in zone.shelves" :key="shelf.id" 
                  class="fridge-shelf" 
                  :class="[`status-${getShelfStatus(zone.id, shelf.id)}`, { 'drag-over': dragOverShelf === shelf.id }]"
                  @dragover="onDragOver($event, zone.id, shelf.id)"
                  @dragleave="onDragLeave"
                  @drop="onDrop($event, zone.id, shelf.id)"
                  @click="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0 ? openQuickAdd(zone.id, shelf.id) : null"
                >
                  <div class="shelf-label">{{ shelf.name }} <el-button v-if="isEditMode" type="danger" link size="small" @click.stop="removeShelf(zone, shelf.id)">×</el-button></div>
                  <div class="food-items">
                    <el-popover v-for="food in inventoryStore.getFoodsByShelf(zone.id, shelf.id)" :key="food.id" placement="top" :width="220" trigger="hover">
                      <template #reference>
                        <div class="food-item" draggable="true" @dragstart="onDragStart($event, food.id)">
                          <el-tag :type="inventoryStore.getStatus(food.expiry)" size="small" effect="dark" class="food-tag">{{ food.name }}</el-tag>
                          <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                        </div>
                      </template>
                      <div class="popover-content">
                        <div class="popover-title">{{ food.name }}</div>
                        <div class="popover-info">數量：{{ food.quantity }} {{ food.unit }}</div>
                        <div class="popover-info">期限：{{ food.expiry }} ({{ inventoryStore.getStatusText(food.expiry) }})</div>
                        <div class="popover-actions">
                          <el-button type="primary" size="small" icon="Document" @click="openDetail(food)">詳情</el-button>
                          <el-button type="success" size="small" icon="Check" @click="handleEat(food.id)">吃完</el-button>
                          <el-button type="danger" size="small" icon="Close" @click="handleDiscard(food.id, food.quantity)">丟棄</el-button>
                        </div>
                      </div>
                    </el-popover>

                    <div v-if="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0" class="empty-shelf" @click="openQuickAdd(zone.id, shelf.id)">
                      <el-icon><Plus /></el-icon> 點擊新增
                    </div>
                  </div>
                  <el-button v-if="isEditMode" type="primary" link size="small" class="add-shelf-btn" @click.stop="addShelf(zone)">+ 加層架</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手機版：冰箱門抽屜 (加入編輯功能) -->
    <el-drawer v-model="doorDrawerVisible" title="門邊置物架" direction="btt" size="70%" class="door-drawer">
      <div class="drawer-content">
        <!-- 抽屜內的編輯按鈕 -->
        <div v-if="isEditMode" class="drawer-edit-actions" style="margin-bottom: 16px; text-align: center;">
          <el-button type="primary" @click="addZone" icon="Plus" size="small">新增區域</el-button>
        </div>

        <div v-for="zone in fridgeStore.fridgeStructure.filter(z => isDoorZone(z.name))" :key="zone.id" class="door-zone">
          <div class="zone-title" style="justify-content: center; gap: 10px;">
            {{ zone.name }}
            <el-button v-if="isEditMode" type="danger" link @click="removeZone(zone.id)"><el-icon><Delete /></el-icon></el-button>
          </div>
          
          <div class="shelves-container">
            <div v-for="shelf in zone.shelves" :key="shelf.id" 
              class="fridge-shelf door-shelf" 
              :class="[`status-${getShelfStatus(zone.id, shelf.id)}`]"
            >
              <div class="shelf-label">
                {{ shelf.name }}
                <el-button v-if="isEditMode" type="danger" link size="small" @click.stop="removeShelf(zone, shelf.id)">×</el-button>
              </div>
              <div class="food-items">
                <div v-for="food in inventoryStore.getFoodsByShelf(zone.id, shelf.id)" :key="food.id" class="food-item" @click="openDetail(food)">
                  <el-tag :type="inventoryStore.getStatus(food.expiry)" size="small" effect="dark" class="food-tag">{{ food.name }}</el-tag>
                  <span class="food-qty">{{ food.quantity }}{{ food.unit }}</span>
                </div>
                <div v-if="inventoryStore.getFoodsByShelf(zone.id, shelf.id).length === 0" class="empty-shelf">
                  空
                </div>
              </div>
              <el-button v-if="isEditMode" type="primary" link size="small" class="add-shelf-btn" @click.stop="addShelf(zone)">+ 加層架</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 快速新增食材彈窗 -->
    <el-dialog v-model="quickAddVisible" title="快速新增食材" width="500px" align-center class="custom-app-dialog">
      <FoodForm :initial-zone="quickAddZone" :initial-shelf="quickAddShelf" @submit="handleQuickAddSubmit" />
    </el-dialog>

    <!-- 食品詳情彈窗 -->
    <FoodDetailDialog v-model:visible="detailVisible" :food="currentDetailFood" />

    <!-- 統一彈出視窗 -->
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

    <!-- AI 拍照辨識 Dialog -->
    <el-dialog v-model="isAiDialogVisible" title="AI 冰箱結構辨識" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <template v-if="!isAiScanning">
          <el-icon size="64" color="var(--el-text-color-secondary)" style="margin-bottom: 16px;"><Camera /></el-icon>
          <p class="dialog-title">請拍攝或上傳一張冰箱內部的照片</p>
          <el-upload action="#" :auto-upload="false" :show-file-list="false" style="margin-top: 16px;"><el-button type="primary" plain>選擇照片</el-button></el-upload>
          <el-button type="success" style="margin-top: 24px; width: 100%;" @click="simulateAiScan">開始模擬辨識</el-button>
        </template>
        <template v-else>
          <el-icon class="is-loading" size="64" color="var(--el-color-primary)" style="margin-bottom: 16px;"><Loading /></el-icon>
          <p class="dialog-title">AI 正在分析冰箱結構，請稍候...</p>
          <el-progress :percentage="100" :indeterminate="true" :duration="2" style="margin-top: 20px;" />
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.fridge-container { width: 100%; max-width: 1000px; margin: 0 auto; }
.select-wrapper { padding: 20px; }
.page-header { margin-bottom: 30px; text-align: center; }
.page-header h2 { margin: 0 0 12px 0; color: var(--el-text-color-primary); font-size: 28px; font-weight: bold; }
.hint { color: var(--el-text-color-secondary); font-size: 15px; margin: 0; }
.section-title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); margin-bottom: 16px; padding-left: 12px; border-left: 4px solid var(--el-color-primary); }
.preset-row { margin-bottom: 20px; }
.preset-card { cursor: pointer; border-radius: 16px; transition: all 0.3s; display: flex; flex-direction: column; padding: 24px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); box-sizing: border-box; min-height: 200px; text-align: left; }
.preset-card:hover { transform: translateY(-4px); box-shadow: var(--el-box-shadow-light); border-color: var(--el-color-primary); }
.icon-wrapper { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; align-self: flex-start; }
.bg-primary { background: var(--el-color-primary-light-9); }
.bg-success { background: var(--el-color-success-light-9); }
.bg-warning { background: var(--el-color-warning-light-9); }
.bg-info { background: var(--el-color-info-light-9); }
.bg-purple { background: rgba(142, 68, 173, 0.1); }
.preset-card h3 { margin: 0 0 8px 0; color: var(--el-text-color-primary); font-size: 18px; }
.preset-card p { color: var(--el-text-color-secondary); font-size: 14px; margin: 0; line-height: 1.5; flex: 1; }
.custom-card { border-style: dashed; border-width: 2px; }
.custom-card:hover { border-color: var(--el-color-info); }
.ai-card { background: linear-gradient(135deg, var(--el-bg-color) 0%, rgba(142, 68, 173, 0.05) 100%); border: 1px solid rgba(142, 68, 173, 0.2); }
.ai-card:hover { border-color: #8e44ad; box-shadow: 0 8px 24px rgba(142, 68, 173, 0.15); }

/* 冰箱視圖：手機版調整 */
.fridge-view-wrapper { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.toolbar h2 { margin: 0 0 8px 0; color: var(--el-text-color-primary); }
.toolbar-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.fridge-wrapper { display: flex; justify-content: center; }
.fridge-body { background: linear-gradient(145deg, var(--el-border-color-lighter) 0%, var(--el-border-color-light) 100%); border: 8px solid var(--el-border-color); border-radius: 20px; padding: 24px; display: flex; gap: 24px; width: 100%; box-shadow: inset 0 0 30px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.1); position: relative; overflow: hidden; }
.fridge-light { position: absolute; top: 0; left: 0; right: 0; height: 150px; background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%); pointer-events: none; z-index: 0; }
html.dark .fridge-light { background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%); }
.fridge-doors { width: 200px; flex-shrink: 0; border-right: 2px dashed var(--el-border-color); padding-right: 24px; display: flex; flex-direction: column; gap: 20px; z-index: 1; }
.fridge-main-zones { flex: 1; display: flex; flex-direction: column; gap: 24px; z-index: 1; }
.fridge-zone, .door-zone { background: var(--el-bg-color); border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid var(--el-border-color-lighter); }
.zone-title { font-size: 16px; font-weight: bold; color: var(--el-text-color-primary); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.shelves-container { display: flex; flex-direction: column; gap: 16px; }

.fridge-shelf { background: var(--el-fill-color-light); border: 2px solid var(--el-border-color); border-radius: 10px; height: 140px; padding: 12px; transition: all 0.3s ease; position: relative; display: flex; flex-direction: column; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5); cursor: pointer; }
html.dark .fridge-shelf { box-shadow: inset 0 2px 4px rgba(255,255,255,0.05); }
.door-shelf { height: 100px; }
.food-items { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; overflow: hidden; flex: 1; align-content: flex-start; }

.fridge-shelf.drag-over { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); box-shadow: 0 0 15px rgba(64,158,255,0.4); transform: scale(1.02); }

.shelf-label { position: absolute; top: -10px; left: 12px; background: var(--el-bg-color); padding: 0 8px; font-size: 12px; font-weight: 500; color: var(--el-text-color-secondary); border-radius: 6px; border: 1px solid var(--el-border-color); display: flex; align-items: center; gap: 5px; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

.fridge-shelf.status-warning { border-color: var(--el-color-warning); background: var(--el-color-warning-light-9); }
.fridge-shelf.status-danger { border-color: var(--el-color-danger); background: var(--el-color-danger-light-9); }
.fridge-shelf.status-success { border-color: var(--el-color-success); background: var(--el-color-success-light-9); }

.food-item { display: flex; align-items: center; gap: 4px; background: var(--el-bg-color); padding: 4px 8px; border-radius: 20px; cursor: grab; box-shadow: 0 2px 6px rgba(0,0,0,0.08); border: 1px solid var(--el-border-color-light); user-select: none; font-size: 12px; transition: transform 0.2s; }
.food-item:hover { transform: scale(1.05); }
.food-item:active { cursor: grabbing; }

.food-tag { max-width: 65px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 6px; }
.food-qty { font-size: 11px; color: var(--el-text-color-regular); white-space: nowrap; }

.empty-shelf { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--el-text-color-disabled); font-size: 13px; gap: 4px; transition: all 0.3s; }
.fridge-shelf:hover .empty-shelf { color: var(--el-color-primary); }
.fridge-shelf:hover .empty-shelf .el-icon { transform: scale(1.2); }
.add-shelf-btn { width: 100%; border: 1px dashed var(--el-border-color); margin-top: 8px; flex-shrink: 0; border-radius: 6px; }

.popover-content { text-align: center; }
.popover-title { font-weight: bold; font-size: 16px; color: var(--el-text-color-primary); margin-bottom: 8px; }
.popover-info { font-size: 13px; color: var(--el-text-color-secondary); margin-bottom: 4px; }
.popover-actions { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }

.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 16px; font-weight: 500; color: var(--el-text-color-primary); margin: 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 100px; }

/* 手機版抽屜樣式 */
.drawer-content { padding: 10px 20px; }
.drawer-content .door-zone { box-shadow: none; border: none; padding: 0; background: transparent; margin-bottom: 24px; }
.drawer-content .fridge-shelf { height: auto; min-height: 100px; }

/* RWD 調整 */
@media (max-width: 768px) {
  .fridge-body { flex-direction: column; padding: 16px; gap: 16px; }
  .fridge-main-zones { width: 100%; }
  .fridge-doors { width: 100%; border-right: none; padding-right: 0; }
  .toolbar-actions { width: 100%; justify-content: space-between; }
  .toolbar-actions .el-button { flex: 1; margin-left: 0 !important; }
}
</style>

<style>
.custom-app-dialog {
  --el-dialog-bg-color: var(--el-bg-color-overlay);
  --el-dialog-border-radius: 16px;
  --el-dialog-padding-primary: 24px;
}
.custom-app-dialog .el-dialog__header {
  margin-right: 0; text-align: center; border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 16px; margin-bottom: 16px;
}
.custom-app-dialog .el-dialog__title {
  font-size: 18px; font-weight: 600; color: var(--el-text-color-primary);
}
/* 覆寫抽屜樣式以適應深淺色 */
.door-drawer .el-drawer__header { margin-bottom: 0; border-bottom: 1px solid var(--el-border-color-light); padding-bottom: 16px; color: var(--el-text-color-primary); font-weight: 600; }
.door-drawer .el-drawer__body { background: var(--el-bg-color); }
</style>