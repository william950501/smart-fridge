<script setup>
import { ref, computed, watch, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs' // 🌟 補上缺失的依賴，避免報錯
import { useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import { useSettingsStore } from '@/stores/settings'
import FoodForm from '@/components/food/FoodForm.vue'
import FoodDetailDialog from '@/components/food/FoodDetailDialog.vue'
import SmartEmpty from '@/components/empty/SmartEmpty.vue'
import { Plus, Delete, WarningFilled, ChatDotRound, Location, Rank, CircleCheck, Right, Bottom } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()
const settingsStore = useSettingsStore()
const tableRef = ref(null)

const activeTab = ref('stock')
const searchKeyword = ref(route.query.search || '')
const statusFilter = ref(route.query.status || 'all')
const locationFilter = ref(route.query.location || 'all')
const sortBy = ref('default')

const dialogVisible = ref(false)
const autoScan = ref(false)

const quickRegisterData = reactive({
  name: '', quantity: 1, unit: '', zone: '', shelf: ''
})

const isMobile = ref(false)
function checkMobile() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })

const selectedRows = ref([])
const selectAll = ref(false)
const detailVisible = ref(false)
const currentFood = ref(null)
const eatDialogVisible = ref(false)
const currentEatFood = ref(null)
const deleteDialogVisible = ref(false)
const deleteTargets = ref([])
const isBatchDelete = ref(false)
const progressDialogVisible = ref(false)
const progressFood = ref(null)
const progressValue = ref(0)

const moveDialogVisible = ref(false)
const targetZoneId = ref('')
const targetShelfId = ref('')

const customDialogVisible = ref(false)
const customDeleteVisible = ref(false)
const currentCustomDelete = ref(null)
const customForm = reactive({ name: '', category: '其他', unit: '個', daysFridge: 7, daysFreezer: 0, daysAfterOpened: 0 })
const categories = ['蔬菜', '水果', '肉類', '海鮮', '乳製品', '蛋類', '飲品', '調味料', '其他']
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升', '片', '杯', '條', '根']

// =========================================
// 路由與篩選監聽
// =========================================
watch(() => route.query.action, (action) => {
  if (action === 'add' || action === 'scan') {
    activeTab.value = 'stock'
    autoScan.value = action === 'scan'
    dialogVisible.value = true
    router.replace({ query: { ...route.query, action: undefined } })
  }
}, { immediate: true })

watch(() => route.query.search, (newVal) => { searchKeyword.value = newVal || ''; clearSelection() })
watch(() => route.query.status, (newVal) => { statusFilter.value = newVal || 'all'; clearSelection() })
watch(() => route.query.location, (newVal) => { locationFilter.value = newVal || 'all'; clearSelection() })
watch(searchKeyword, () => { clearSelection(); activeTab.value = 'stock' })

// =========================================
// 資料過濾與排序
// =========================================
const filteredFoods = computed(() => {
  let foods = inventoryStore.activeFoods

  if (statusFilter.value !== 'all') {
    foods = foods.filter(f => {
      const days = inventoryStore.getDaysLeft(f.expiry, f.isOpened, f.openedExpiry)
      if (statusFilter.value === 'expired') return days < 0
      if (statusFilter.value === 'expiring') return days >= 0 && days <= settingsStore.getReminderDaysFor(f.category)
      if (statusFilter.value === 'fresh') return days > settingsStore.getReminderDaysFor(f.category)
      return true
    })
  }

  if (locationFilter.value !== 'all') {
    if (locationFilter.value === 'unassigned') foods = foods.filter(f => !f.zone)
    else foods = foods.filter(f => f.zone === locationFilter.value)
  }

  if (searchKeyword.value) {
    foods = foods.filter(f => f.name.includes(searchKeyword.value) || f.category.includes(searchKeyword.value))
  }

  if (sortBy.value === 'valueDesc') {
    foods.sort((a, b) => ((b.unitPrice || 0) * b.quantity) - ((a.unitPrice || 0) * a.quantity))
  } else if (sortBy.value === 'valueAsc') {
    foods.sort((a, b) => ((a.unitPrice || 0) * a.quantity) - ((b.unitPrice || 0) * b.quantity))
  }

  return foods
})

const filteredCustomFoods = computed(() => {
  if (!searchKeyword.value) return inventoryStore.customFoods
  return inventoryStore.customFoods.filter(f => f.name.includes(searchKeyword.value) || f.category.includes(searchKeyword.value))
})

const isFiltered = computed(() => statusFilter.value !== 'all' || locationFilter.value !== 'all' || !!searchKeyword.value || sortBy.value !== 'default')

function clearFilters() {
  router.push('/inventory')
  sortBy.value = 'default'
}

function handleStatusChange(val) { router.push({ query: { ...route.query, status: val === 'all' ? undefined : val } }) }
function handleLocationChange(val) { router.push({ query: { ...route.query, location: val === 'all' ? undefined : val } }) }

// =========================================
// 核心操作
// =========================================
function openDialog() { 
  quickRegisterData.name = ''
  quickRegisterData.quantity = 1
  quickRegisterData.unit = ''
  autoScan.value = false
  dialogVisible.value = true 
}

function handleAddFood(food) { 
  inventoryStore.addFood(food)
  ElMessage.success('食材已新增')
}

function openQuickRegister(customFood) {
  quickRegisterData.name = customFood.name
  quickRegisterData.quantity = 1
  quickRegisterData.unit = customFood.unit
  
  const defaultZone = fridgeStore.fridgeStructure.find(z => z.name.includes('冷藏') && !z.name.includes('門'))
  if (defaultZone) {
    quickRegisterData.zone = defaultZone.id
    quickRegisterData.shelf = defaultZone.shelves[0]?.id || ''
  }
  
  autoScan.value = false
  dialogVisible.value = true
}

function clearSelection() { 
  if (tableRef.value) tableRef.value.clearSelection()
  selectedRows.value = []; selectAll.value = false 
}
function toggleSelectAll() { if (tableRef.value) tableRef.value.toggleAllSelection() }
function handleSelectionChange(rows) { 
  selectedRows.value = rows
  selectAll.value = rows.length === filteredFoods.value.length && filteredFoods.value.length > 0 
}

function openDetail(row) { currentFood.value = row; detailVisible.value = true }
function handleDetailUpdated() { clearSelection() }

function openEatDialog(row) { currentEatFood.value = row; eatDialogVisible.value = true }
function confirmEat() { 
  if (currentEatFood.value) { 
    inventoryStore.markAsEaten(currentEatFood.value.id)
    ElMessage.success(`已將「${currentEatFood.value.name}」標記為吃完`)
    eatDialogVisible.value = false; clearSelection() 
  } 
}

function openDeleteDialog(row) { deleteTargets.value = [row]; isBatchDelete.value = false; deleteDialogVisible.value = true }
function openBatchDeleteDialog() { 
  if (selectedRows.value.length === 0) return
  deleteTargets.value = [...selectedRows.value]; isBatchDelete.value = true; deleteDialogVisible.value = true 
}
function confirmDelete() { 
  const ids = deleteTargets.value.map(r => r.id)
  inventoryStore.batchDelete(ids)
  ElMessage.success(`已將 ${ids.length} 筆食材移至回收桶`)
  deleteDialogVisible.value = false; clearSelection() 
}

function openMoveDialog() {
  if (selectedRows.value.length === 0) return
  targetZoneId.value = ''
  targetShelfId.value = ''
  moveDialogVisible.value = true
}

watch(targetZoneId, (newZone) => {
  const zone = fridgeStore.fridgeStructure.find(z => z.id === newZone)
  if (zone && zone.shelves.length > 0) targetShelfId.value = zone.shelves[0].id
  else targetShelfId.value = ''
})

function confirmMove() {
  if (!targetZoneId.value || !targetShelfId.value) return ElMessage.warning('請選擇目標區域與層架')
  const ids = selectedRows.value.map(r => r.id)
  inventoryStore.batchUpdateLocation(ids, targetZoneId.value, targetShelfId.value)
  ElMessage.success(`已將 ${ids.length} 筆食材移至新位置`)
  moveDialogVisible.value = false
  clearSelection()
}

function openProgressDialog(row) { progressFood.value = row; progressValue.value = row.quantity; progressDialogVisible.value = true }
function saveProgress() { 
  if (progressFood.value) { 
    inventoryStore.updateProgress(progressFood.value.id, progressValue.value)
    ElMessage.success('消耗進度已更新')
    progressDialogVisible.value = false; clearSelection()
  } 
}

function getLocationText(row) {
  if (!row.zone) return '未指定位置'
  const zone = fridgeStore.fridgeStructure.find(z => z.id === row.zone)
  if (!zone) return '未指定位置'
  if (!row.shelf) return `${zone.name} > 未指定`
  const shelf = zone.shelves.find(s => s.id === row.shelf)
  return `${zone.name} > ${shelf?.name || '未指定'}`
}

function getFoodValue(row) {
  if (!row.unitPrice || row.unitPrice <= 0) return '未記錄'
  return `$${Math.round(row.unitPrice * row.quantity)}`
}

function copyNote(text) {
  navigator.clipboard.writeText(text).then(() => ElMessage.success('備註已複製')).catch(() => ElMessage.error('複製失敗'))
}

// 自訂食材 CRUD
function openCustomDialog() {
  customForm.name = ''; customForm.category = '其他'; customForm.unit = '個'
  customForm.daysFridge = 7; customForm.daysFreezer = 0; customForm.daysAfterOpened = 0
  customDialogVisible.value = true
}
function handleAddCustom() {
  if (!customForm.name.trim()) return ElMessage.warning('請輸入食材名稱')
  const result = inventoryStore.addCustomFood({ ...customForm })
  if (result.success) { ElMessage.success('已新增自訂食材'); customDialogVisible.value = false }
  else { ElMessage.error(result.message) }
}
function openCustomDelete(food) { currentCustomDelete.value = food; customDeleteVisible.value = true }
function confirmCustomDelete() {
  if (currentCustomDelete.value) {
    const result = inventoryStore.removeCustomFood(currentCustomDelete.value.name)
    if (result.inStock) ElMessage.warning('已刪除字典，但冰箱內仍有此食材庫存')
    else ElMessage.success('已刪除自訂食材')
    customDeleteVisible.value = false
  }
}
</script>

<template>
  <div class="inventory-container">
    <div class="page-header">
      <h2>食材管理</h2>
    </div>

    <!-- 篩選列 -->
    <div class="filter-bar">
      <div class="filter-status-row">
        <el-radio-group :model-value="statusFilter" @change="handleStatusChange" size="small" class="custom-radio-group status-scroll">
          <el-radio-button label="all" value="all">全部</el-radio-button>
          <el-radio-button label="fresh" value="fresh">新鮮</el-radio-button>
          <el-radio-button label="expiring" value="expiring">即將到期</el-radio-button>
          <el-radio-button label="expired" value="expired">已過期</el-radio-button>
        </el-radio-group>
      </div>
      
      <div class="filter-dropdown-row">
        <el-select :model-value="locationFilter" @change="handleLocationChange" size="small" class="filter-select">
          <el-option label="全部位置" value="all" />
          <el-option v-for="zone in fridgeStore.fridgeStructure" :key="zone.id" :label="zone.name" :value="zone.id" />
          <el-option label="未指定位置" value="unassigned" />
        </el-select>

        <el-select v-model="sortBy" size="small" class="filter-select">
          <el-option label="預設（依期限）" value="default" />
          <el-option label="價值（高到低）" value="valueDesc" />
          <el-option label="價值（低到高）" value="valueAsc" />
        </el-select>

        <el-tag v-if="isFiltered" type="info" closable @close="clearFilters" round class="filter-clear-tag">清除篩選</el-tag>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="inventory-tabs">
      <el-tab-pane label="冰箱庫存" name="stock">
        
        <!-- 手機端專屬：新增按鈕 -->
        <div class="mobile-add-wrapper" v-if="isMobile">
          <el-button type="primary" @click="openDialog" :icon="Plus" class="mobile-add-btn">新增食材</el-button>
        </div>

        <!-- 電腦端：批次操作列 -->
        <div class="tab-action-bar" v-if="!isMobile">
          <div class="batch-controls">
            <el-checkbox :model-value="selectAll" @change="toggleSelectAll">全選</el-checkbox>
            <el-button type="primary" plain :disabled="selectedRows.length === 0" @click="openMoveDialog">批次移動 ({{ selectedRows.length }})</el-button>
            <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="openBatchDeleteDialog">批次刪除 ({{ selectedRows.length }})</el-button>
          </div>
          <el-button type="primary" @click="openDialog" :icon="Plus">新增食材</el-button>
        </div>

        <!-- 電腦端：表格 -->
        <el-card shadow="never" v-if="!isMobile" class="table-card">
          <el-table ref="tableRef" :data="filteredFoods" style="width: 100%" row-key="id" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="50" fixed="left" />
            <el-table-column prop="name" label="食材名稱" min-width="160">
              <template #default="{ row }">
                <div class="food-name-cell">
                  <span>{{ row.name }}</span>
                  <el-tooltip v-if="row.isOpened" :content="`開封時間：${dayjs(row.openedAt).format('YYYY-MM-DD')}`" placement="top">
                    <el-tag type="warning" size="small" effect="dark" round :icon="CircleCheck" class="opened-tag">已開封</el-tag>
                  </el-tooltip>
                </div>
                <div v-if="row.note" class="table-note">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>{{ row.note }}</span>
                  <el-button link size="small" @click.stop="copyNote(row.note)" class="copy-btn" title="複製備註">複製</el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分類" width="90" />
            <el-table-column label="存放位置" min-width="140">
              <template #default="{ row }">
                <el-tag v-if="!row.zone" size="small" type="info" effect="plain" round><el-icon><Location /></el-icon> 未指定</el-tag>
                <el-tag v-else size="small" :type="inventoryStore.isFreezerZone(row.zone) ? 'info' : 'primary'" effect="light" round>{{ getLocationText(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="數量" width="90">
              <template #default="{ row }">{{ row.quantity }} {{ row.unit }}</template>
            </el-table-column>
            <el-table-column label="價值" width="100">
              <template #default="{ row }">
                <span :style="{ color: getFoodValue(row) === '未記錄' ? 'var(--muted)' : 'var(--ink)' }">{{ getFoodValue(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="addedBy" label="購買者" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="success" effect="plain" round>{{ row.addedBy || '未知' }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="保存期限" width="160">
              <template #default="{ row }">
                <div v-if="row.isOpened && row.openedExpiry" class="expiry-change-cell">
                  <span class="old-expiry">{{ row.expiry }}</span>
                  <el-icon class="arrow-icon"><Right /></el-icon>
                  <span class="new-expiry">{{ row.openedExpiry }}</span>
                </div>
                <span v-else>{{ row.expiry || '無' }}</span>
              </template>
            </el-table-column>

            <el-table-column label="狀態" width="130">
              <template #default="{ row }">
                <el-tooltip :content="inventoryStore.getStatusText(row)" placement="top" :show-after="300">
                  <el-tag :type="inventoryStore.getStatus(row)" class="status-tag" effect="light" round>
                    {{ inventoryStore.getStatusText(row) }}
                  </el-tag>
                </el-tooltip>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openDetail(row)">詳情</el-button>
                <el-button type="warning" link @click="openProgressDialog(row)">進度</el-button>
                <el-button type="success" link @click="openEatDialog(row)">吃完</el-button>
                <el-button type="danger" link @click="openDeleteDialog(row)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <SmartEmpty v-if="filteredFoods.length === 0" :type="isFiltered ? 'search' : 'inventory'" @primary="isFiltered ? clearFilters() : openDialog()" @secondary="router.push('/onboarding')" />
        </el-card>

        <!-- 手機端：卡片 -->
        <div class="mobile-card-list" v-else>
          <SmartEmpty v-if="filteredFoods.length === 0" :type="isFiltered ? 'search' : 'inventory'" @primary="isFiltered ? clearFilters() : openDialog()" @secondary="router.push('/onboarding')" />
          <el-card v-for="food in filteredFoods" :key="food.id" class="food-card" shadow="hover">
            <div class="card-top">
              <div class="food-title">
                <span class="name">{{ food.name }}</span>
                <div style="display: flex; gap: 8px;">
                  <el-tag v-if="food.isOpened" type="warning" size="small" effect="dark" round :icon="CircleCheck">已開封</el-tag>
                  <el-tag :type="inventoryStore.getStatus(food)" size="small" effect="light" round>{{ inventoryStore.getStatusText(food) }}</el-tag>
                </div>
              </div>
            </div>
            <div class="card-info">
              <div class="info-row">
                <span class="label">位置：</span>
                <span v-if="!food.zone" style="color: var(--muted);">未指定位置</span>
                <span v-else>{{ getLocationText(food) }}</span>
              </div>
              <div class="info-row"><span class="label">數量：</span>{{ food.quantity }} {{ food.unit }}</div>
              <div class="info-row"><span class="label">價值：</span>{{ getFoodValue(food) }}</div>
              
              <div class="info-row">
                <span class="label">期限：</span>
                <div v-if="food.isOpened && food.openedExpiry" class="expiry-change-mobile">
                  <span class="old">{{ food.expiry }}</span>
                  <el-icon><Right /></el-icon>
                  <span class="new">{{ food.openedExpiry }}</span>
                </div>
                <span v-else>{{ food.expiry || '無' }}</span>
              </div>
            </div>
            
            <!-- 手機端：改為 2x2 Grid -->
            <div class="card-actions-grid">
              <el-button type="primary" plain size="small" @click="openDetail(food)">詳情</el-button>
              <el-button type="warning" plain size="small" @click="openProgressDialog(food)">進度</el-button>
              <el-button type="success" plain size="small" @click="openEatDialog(food)">吃完</el-button>
              <el-button type="danger" plain size="small" @click="openDeleteDialog(food)">刪除</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 自訂食材庫 Tab -->
      <el-tab-pane label="自訂食材庫" name="custom">
        <div class="tab-action-bar custom-tab-bar">
          <el-alert title="這裡管理您專屬的食材字典，新增後即可在登記食材時快速選用。" type="info" show-icon :closable="false" class="custom-alert" />
          <el-button type="primary" @click="openCustomDialog" :icon="Plus" class="custom-add-btn">新增自訂食材</el-button>
        </div>

        <SmartEmpty v-if="filteredCustomFoods.length === 0" type="default" title="還沒有建立任何自訂食材" description="如果您常買特定品牌的食材，可以在這裡建立專屬字典，未來登記時可快速選用。" primaryText="立即建立" @primary="openCustomDialog" />
        
        <el-row v-else :gutter="16">
          <el-col v-for="food in filteredCustomFoods" :key="food.name" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="custom-food-card" shadow="hover">
              <div class="food-header">
                <span class="name">{{ food.name }}</span>
                <el-tag size="small" type="success" effect="plain" round>{{ food.category }}</el-tag>
              </div>
              <div class="food-info">
                <div class="info-row"><span class="label">預設單位</span><span class="val">{{ food.unit }}</span></div>
                <div class="info-row"><span class="label">冷藏天數</span><span class="val">{{ food.daysFridge }} 天</span></div>
                <div class="info-row" v-if="food.daysFreezer > 0"><span class="label">冷凍天數</span><span class="val">{{ food.daysFreezer }} 天</span></div>
                <div class="info-row" v-if="food.daysAfterOpened > 0"><span class="label">開封後天數</span><span class="val">{{ food.daysAfterOpened }} 天</span></div>
              </div>
              <div class="food-actions">
                <el-button type="primary" plain size="small" :icon="Plus" @click="openQuickRegister(food)">立即登記</el-button>
                <el-button type="danger" plain size="small" :icon="Delete" @click="openCustomDelete(food)">刪除</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <!-- 彈窗區塊 -->
    <el-dialog v-model="dialogVisible" title="新增食材" width="500px" class="custom-app-dialog" destroy-on-close>
      <FoodForm :initial-name="quickRegisterData.name" :initial-quantity="quickRegisterData.quantity" :initial-zone="quickRegisterData.zone" :initial-shelf="quickRegisterData.shelf" :autoScan="autoScan" @submit="handleAddFood" />
    </el-dialog>

    <FoodDetailDialog v-model:visible="detailVisible" :food="currentFood" @updated="handleDetailUpdated" />

    <el-dialog v-model="eatDialogVisible" title="確認吃完" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center" v-if="currentEatFood"><el-icon size="48" color="var(--sage)" style="margin-bottom: 16px;"><CircleCheck /></el-icon><p class="dialog-title">要將「{{ currentEatFood.name }}」標記為吃完嗎？</p><p class="dialog-subtitle">這會將該食材從庫存中移除，並記錄為已食用。</p></div>
      <template #footer><el-button @click="eatDialogVisible = false">取消</el-button><el-button type="success" @click="confirmEat">確定吃完</el-button></template>
    </el-dialog>
    
    <el-dialog v-model="deleteDialogVisible" title="移至回收桶" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center"><el-icon size="48" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon><p class="dialog-title">{{ isBatchDelete ? `確定要刪除選中的 ${deleteTargets.length} 筆食材嗎？` : `確定要刪除「${deleteTargets[0]?.name}」嗎？` }}</p><p class="dialog-subtitle">刪除後將移至回收桶，30 天內皆可還原。</p></div>
      <template #footer><el-button @click="deleteDialogVisible = false">取消</el-button><el-button type="danger" @click="confirmDelete">確定刪除</el-button></template>
    </el-dialog>

    <el-dialog v-model="moveDialogVisible" title="批次移動位置" width="400px" align-center class="custom-app-dialog">
      <div class="move-dialog-content">
        <p class="dialog-subtitle">將選中的 {{ selectedRows.length }} 筆食材移動至：</p>
        <el-form label-width="60px">
          <el-form-item label="區域">
            <el-select v-model="targetZoneId" placeholder="請選擇區域" style="width: 100%">
              <el-option v-for="z in fridgeStore.fridgeStructure" :key="z.id" :label="z.name" :value="z.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="層架">
            <el-select v-model="targetShelfId" placeholder="請選擇層架" style="width: 100%" :disabled="!targetZoneId">
              <el-option v-for="s in fridgeStore.fridgeStructure.find(z => z.id === targetZoneId)?.shelves || []" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <template #footer><el-button @click="moveDialogVisible = false">取消</el-button><el-button type="primary" @click="confirmMove">確定移動</el-button></template>
    </el-dialog>
    
    <el-dialog v-model="progressDialogVisible" title="更新消耗進度" width="400px" align-center class="custom-app-dialog">
      <div v-if="progressFood" class="dialog-content-center"><h3 class="dialog-title">{{ progressFood.name }}</h3><p class="dialog-subtitle">原始登記數量：{{ progressFood.quantity }} {{ progressFood.unit }}</p><div class="slider-wrapper"><el-slider v-model="progressValue" :min="0" :max="progressFood.quantity" show-stops :marks="{ 0: '用完', [progressFood.quantity]: '滿' }" /></div><div class="progress-result">剩餘：<span class="highlight">{{ progressValue }}</span> {{ progressFood.unit }}</div></div>
      <template #footer><el-button @click="progressDialogVisible = false">取消</el-button><el-button type="primary" @click="saveProgress">儲存進度</el-button></template>
    </el-dialog>

    <el-dialog v-model="customDialogVisible" title="新增自訂食材" width="500px" align-center class="custom-app-dialog">
      <el-form :model="customForm" label-width="100px" class="responsive-form">
        <el-form-item label="食材名稱" required><el-input v-model="customForm.name" placeholder="例如：韓式泡菜" /></el-form-item>
        <el-form-item label="分類" required><el-select v-model="customForm.category" style="width: 100%"><el-option v-for="c in categories" :key="c" :label="c" :value="c" /></el-select></el-form-item>
        <el-form-item label="預設單位" required><el-select v-model="customForm.unit" style="width: 100%"><el-option v-for="u in units" :key="u" :label="u" :value="u" /></el-select></el-form-item>
        <div class="inline-form-row">
          <el-form-item label="冷藏天數" label-width="80px" class="flex-item"><el-input-number v-model="customForm.daysFridge" :min="0" style="width: 100%" /></el-form-item>
          <el-form-item label="冷凍天數" label-width="80px" class="flex-item"><el-input-number v-model="customForm.daysFreezer" :min="0" style="width: 100%" /></el-form-item>
        </div>
        <el-form-item label="開封後天數"><el-input-number v-model="customForm.daysAfterOpened" :min="0" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="customDialogVisible = false">取消</el-button><el-button type="primary" @click="handleAddCustom">建立食材</el-button></template>
    </el-dialog>

    <el-dialog v-model="customDeleteVisible" title="刪除自訂食材" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center"><el-icon size="48" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon><p class="dialog-title">確定要刪除「{{ currentCustomDelete?.name }}」嗎？</p><p class="dialog-subtitle">刪除後，未來新增食材時將無法快速選用此項目。</p></div>
      <template #footer><el-button @click="customDeleteVisible = false">取消</el-button><el-button type="danger" @click="confirmCustomDelete">確定刪除</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.inventory-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3); }
.page-header h2 { margin: 0; color: var(--ink); font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; }

/* 篩選列 */
.filter-bar {
  display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-4);
  margin-bottom: var(--space-4); background: var(--surface); padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md); border: 1px solid var(--border-light);
  position: sticky; top: 0; z-index: 10; box-shadow: var(--shadow-sm);
}
.filter-status-row { display: flex; align-items: center; }
.filter-dropdown-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.filter-select { width: 140px; }

.custom-radio-group :deep(.el-radio-button__inner) {
  border-radius: 9999px !important; border: 1px solid var(--border) !important;
  background: transparent !important; color: var(--muted) !important;
  box-shadow: none !important; margin-right: 8px; padding: 6px 16px;
}
.custom-radio-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: var(--accent-light) !important; border-color: var(--accent) !important;
  color: var(--accent) !important; font-weight: 600;
}

.inventory-tabs { background: var(--surface); padding: var(--space-5); border-radius: var(--radius-lg); border: 1px solid var(--border-light); min-width: 0; overflow: hidden; }

.tab-action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: 12px; }
.batch-controls { display: flex; align-items: center; gap: var(--space-3); }
.food-name-cell { display: flex; align-items: center; gap: var(--space-2); }

.opened-tag { cursor: help; }
.expiry-change-cell { display: flex; align-items: center; gap: 6px; font-size: var(--text-sm); }
.expiry-change-cell .old-expiry { text-decoration: line-through; color: var(--muted); opacity: 0.7; font-size: var(--text-xs); }
.expiry-change-cell .arrow-icon { color: var(--warning); font-size: 12px; }
.expiry-change-cell .new-expiry { color: var(--warning); font-weight: 600; }

.expiry-change-mobile { display: flex; align-items: center; gap: 4px; }
.expiry-change-mobile .old { text-decoration: line-through; color: var(--muted); font-size: var(--text-xs); opacity: 0.7; }
.expiry-change-mobile .el-icon { color: var(--warning); font-size: 12px; }
.expiry-change-mobile .new { color: var(--warning); font-weight: 600; }

.table-note { display: flex; align-items: center; gap: 4px; font-size: var(--text-xs); color: var(--muted); margin-top: 4px; line-height: 1.4; }
.copy-btn { color: var(--muted) !important; padding: 0 4px !important; height: auto !important; transition: color var(--transition-fast); }
.copy-btn:hover { color: var(--accent) !important; }
.status-tag { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table-card { width: 100%; min-width: 0; }

.mobile-card-list { display: flex; flex-direction: column; gap: var(--space-4); }
.food-card { border-radius: var(--radius-md); background: var(--surface); border: 1px solid var(--border-light); }
.card-top { margin-bottom: var(--space-3); }
.food-title { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.food-title .name { font-size: var(--text-lg); font-weight: 700; color: var(--ink); font-family: var(--font-display); line-height: 1.2; }
.card-info { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); font-size: var(--text-sm); color: var(--ink); }
.info-row { display: flex; align-items: flex-start; }
.info-row .label { color: var(--muted); flex-shrink: 0; width: 50px; }

/* 🌟 手機端卡片按鈕 2x2 Grid */
.card-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  border-top: 1px solid var(--border-light);
  padding-top: var(--space-3);
}
.card-actions-grid .el-button { margin: 0; width: 100%; }

/* 自訂食材庫 */
.custom-tab-bar { align-items: stretch; gap: 16px; }
.custom-alert { flex: 1; }
.custom-add-btn { flex-shrink: 0; }
.custom-food-card { border-radius: var(--radius-md); background: var(--surface); border: 1px solid var(--border-light); margin-bottom: var(--space-5); }
.custom-food-card .food-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.custom-food-card .food-header .name { font-size: var(--text-base); font-weight: 700; color: var(--ink); }
.custom-food-card .food-info { margin-bottom: var(--space-4); }
.custom-food-card .info-row { display: flex; justify-content: space-between; font-size: var(--text-sm); margin-bottom: var(--space-2); }
.custom-food-card .info-row .label { color: var(--muted); width: auto; }
.custom-food-card .info-row .val { color: var(--ink); font-weight: 500; }
.custom-food-card .food-actions { border-top: 1px solid var(--border-light); padding-top: var(--space-3); display: flex; justify-content: flex-end; gap: var(--space-2); }

.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; }
.slider-wrapper { padding: 0 20px; margin-bottom: 30px; }
.progress-result { font-size: var(--text-base); color: var(--ink); background: var(--ground); padding: 12px; border-radius: var(--radius-md); display: inline-block; }
.progress-result .highlight { font-size: var(--text-xl); font-weight: bold; color: var(--accent); margin: 0 4px; }

.move-dialog-content { padding: 0 10px; }
.move-dialog-content .dialog-subtitle { text-align: left; margin-bottom: 16px; }

/* 🌟 手機端自適應 */
@media (max-width: 768px) {
  .filter-bar { 
    flex-direction: column; 
    align-items: stretch; 
    gap: var(--space-3); 
    padding: var(--space-3);
    /* 取消 sticky，避免遮擋 */
    position: relative; 
    top: auto;
  }
  .filter-status-row { width: 100%; overflow: hidden; }
  
  /* 狀態列橫向滑動 */
  .status-scroll {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    width: 100%;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
  .status-scroll::-webkit-scrollbar { display: none; }
  .status-scroll :deep(.el-radio-button__inner) { margin-right: 6px; }

  .filter-dropdown-row { width: 100%; justify-content: space-between; }
  .filter-select { flex: 1; width: auto; min-width: 0; }
  .filter-clear-tag { width: 100%; text-align: center; justify-content: center; }

  .inventory-tabs { padding: var(--space-3); }
  
  /* 手機端新增按鈕 */
  .mobile-add-wrapper { margin-bottom: var(--space-3); }
  .mobile-add-btn { width: 100%; height: 40px; }

  .custom-tab-bar { flex-direction: column; gap: 12px; }
  .custom-alert { margin-right: 0; }
  .custom-add-btn { width: 100%; }
  .custom-food-card .food-actions { flex-direction: column; gap: 8px; }
  .custom-food-card .food-actions .el-button { width: 100%; margin: 0; }

  /* 自訂食材表單手機端調整 */
  .responsive-form :deep(.el-form-item) { flex-direction: column; align-items: flex-start; }
  .responsive-form :deep(.el-form-item__label) { width: 100% !important; text-align: left; justify-content: flex-start; padding-bottom: 4px; }
  .responsive-form :deep(.el-form-item__content) { margin-left: 0 !important; width: 100%; }
  
  .inline-form-row { display: flex; flex-direction: column; gap: 0; width: 100%; }
  .flex-item { width: 100%; }
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
@media (max-width: 768px) {
  .custom-app-dialog { width: 92vw !important; max-width: 92vw; margin: 4vh auto !important; }
}
</style>