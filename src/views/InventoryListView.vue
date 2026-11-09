<script setup>
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import FoodForm from '@/components/food/FoodForm.vue'
import FoodDetailDialog from '@/components/food/FoodDetailDialog.vue'
import { Plus, Delete, WarningFilled, Box } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()
const tableRef = ref(null)

const activeTab = ref('stock')
const searchKeyword = ref(route.query.search || '')
const dialogVisible = ref(false)
const autoScan = ref(false)

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

// 自訂食材狀態
const customDialogVisible = ref(false)
const customDeleteVisible = ref(false)
const currentCustomDelete = ref(null)
const customForm = reactive({ name: '', category: '其他', unit: '個', daysFridge: 7, daysFreezer: 0, daysAfterOpened: 0 })
const categories = ['蔬菜', '水果', '肉類', '海鮮', '乳製品', '蛋類', '飲品', '調味料', '其他']
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升']

watch(() => route.query.action, (action) => {
  if (action === 'add' || action === 'scan') {
    activeTab.value = 'stock'
    autoScan.value = action === 'scan'
    dialogVisible.value = true
    router.replace({ query: { ...route.query, action: undefined } })
  }
}, { immediate: true })

watch(() => route.query.search, (newVal) => { 
  searchKeyword.value = newVal || ''
  clearSelection()
})
watch(searchKeyword, () => { clearSelection(); activeTab.value = 'stock' })

const filteredFoods = computed(() => {
  if (!searchKeyword.value) return inventoryStore.activeFoods
  return inventoryStore.activeFoods.filter(f => f.name.includes(searchKeyword.value) || f.category.includes(searchKeyword.value))
})

const filteredCustomFoods = computed(() => {
  if (!searchKeyword.value) return inventoryStore.customFoods
  return inventoryStore.customFoods.filter(f => f.name.includes(searchKeyword.value) || f.category.includes(searchKeyword.value))
})

function openDialog() { autoScan.value = false; dialogVisible.value = true }
function handleAddFood(food) { inventoryStore.addFood(food); dialogVisible.value = false; ElMessage.success('食材已新增') }

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

function openProgressDialog(row) { progressFood.value = row; progressValue.value = row.quantity; progressDialogVisible.value = true }
function saveProgress() { 
  if (progressFood.value) { 
    inventoryStore.updateProgress(progressFood.value.id, progressValue.value)
    ElMessage.success('消耗進度已更新')
    progressDialogVisible.value = false; clearSelection()
  } 
}

function getLocationText(row) {
  const zone = fridgeStore.fridgeStructure.find(z => z.id === row.zone)
  const shelf = zone?.shelves.find(s => s.id === row.shelf)
  return `${zone?.name || '未知'} > ${shelf?.name || '未指定'}`
}

// 🌟 新增：取得目前有效期限的顯示文字
function getDisplayExpiry(row) {
  return (row.isOpened && row.openedExpiry) ? row.openedExpiry : row.expiry
}

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
function goToTrash() { router.push('/trash') }
</script>

<template>
  <div class="inventory-container">
    <div class="page-header">
      <h2>食材管理</h2>
      <div class="header-actions">
        <el-button type="danger" plain @click="goToTrash" icon="Delete">回收桶</el-button>
        <el-button v-if="activeTab === 'stock' && !isMobile" type="primary" @click="openDialog" icon="Plus">新增食材</el-button>
        <el-button v-if="activeTab === 'custom'" type="primary" @click="openCustomDialog" icon="Plus">新增自訂食材</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="inventory-tabs">
      <el-tab-pane label="冰箱庫存" name="stock">
        <div class="tab-action-bar" v-if="!isMobile">
          <div class="batch-controls">
            <el-checkbox :model-value="selectAll" @change="toggleSelectAll">全選</el-checkbox>
            <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="openBatchDeleteDialog">批次刪除 ({{ selectedRows.length }})</el-button>
          </div>
          <el-button type="primary" @click="openDialog" icon="Plus">新增食材</el-button>
        </div>
        
        <el-alert v-if="searchKeyword" :title="`正在搜尋：${searchKeyword}`" type="info" show-icon closable @close="searchKeyword = ''" style="margin-bottom: 16px;" />

        <el-card shadow="never" v-if="!isMobile">
          <el-table ref="tableRef" :data="filteredFoods" style="width: 100%" row-key="id" @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="食材名稱" min-width="120">
              <template #default="{ row }">
                <div class="food-name-cell">
                  <span>{{ row.name }}</span>
                  <el-tag v-if="row.isOpened" type="warning" size="small" effect="plain">已開封</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分類" width="100" />
            <el-table-column label="存放位置" min-width="140">
              <template #default="{ row }">
                <el-tag size="small" :type="row.zone === 'freezer' ? 'info' : 'primary'">{{ getLocationText(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="數量" width="100">
              <template #default="{ row }">{{ row.quantity }} {{ row.unit }}</template>
            </el-table-column>
            <el-table-column prop="addedBy" label="購買者" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="success" effect="plain">{{ row.addedBy || '未知' }}</el-tag>
              </template>
            </el-table-column>
            
            <!-- 🌟 修改：保存期限顯示邏輯 -->
            <el-table-column label="保存期限" width="140">
              <template #default="{ row }">
                <span :style="{ color: (row.isOpened && row.openedExpiry) ? 'var(--el-color-warning)' : '' }">
                  {{ getDisplayExpiry(row) }}
                </span>
              </template>
            </el-table-column>
            
            <el-table-column label="狀態" width="150">
              <template #default="{ row }">
                <el-tag :type="inventoryStore.getStatus(row)">{{ inventoryStore.getStatusText(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button type="info" link @click="openDetail(row)">詳情</el-button>
                <el-button type="primary" link @click="openProgressDialog(row)">進度</el-button>
                <el-button type="success" link @click="openEatDialog(row)">吃完</el-button>
                <el-button type="danger" link @click="openDeleteDialog(row)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="filteredFoods.length === 0" description="找不到符合的食材，或目前冰箱是空的">
            <el-button type="primary" @click="openDialog">馬上新增第一筆食材</el-button>
          </el-empty>
        </el-card>

        <div class="mobile-card-list" v-else>
          <el-empty v-if="filteredFoods.length === 0" description="找不到符合的食材，或目前冰箱是空的">
            <el-button type="primary" @click="openDialog">馬上新增第一筆食材</el-button>
          </el-empty>
          <el-card v-for="food in filteredFoods" :key="food.id" class="food-card" shadow="hover">
            <div class="card-top">
              <div class="food-title">
                <span class="name">{{ food.name }}</span>
                <div style="display: flex; gap: 8px;">
                  <el-tag v-if="food.isOpened" type="warning" size="small" effect="plain">已開封</el-tag>
                  <el-tag :type="inventoryStore.getStatus(food)" size="small" effect="dark">{{ inventoryStore.getStatusText(food) }}</el-tag>
                </div>
              </div>
            </div>
            <div class="card-info">
              <div class="info-row"><span>位置：</span>{{ getLocationText(food) }}</div>
              <div class="info-row"><span>數量：</span>{{ food.quantity }} {{ food.unit }}</div>
              <div class="info-row"><span>購買者：</span>{{ food.addedBy || '未知' }}</div>
              <!-- 🌟 修改：保存期限顯示邏輯 -->
              <div class="info-row">
                <span>期限：</span>
                <span :style="{ color: (food.isOpened && food.openedExpiry) ? 'var(--el-color-warning)' : '' }">
                  {{ getDisplayExpiry(food) }}
                </span>
              </div>
            </div>
            <div class="card-actions">
              <el-button type="info" plain size="small" @click="openDetail(food)">詳情</el-button>
              <el-button type="primary" plain size="small" @click="openProgressDialog(food)">進度</el-button>
              <el-button type="success" plain size="small" @click="openEatDialog(food)">吃完</el-button>
              <el-button type="danger" plain size="small" @click="openDeleteDialog(food)">刪除</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="自訂食材庫" name="custom">
        <el-alert title="這裡管理您專屬的食材字典，新增後即可在登記食材時快速選用。" type="info" show-icon :closable="false" style="margin-bottom: 16px;" />
        <el-empty v-if="filteredCustomFoods.length === 0" description="還沒有建立任何自訂食材，點擊右上角開始新增吧！" :image-size="120" />
        
        <el-row v-else :gutter="20">
          <el-col v-for="food in filteredCustomFoods" :key="food.name" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="custom-food-card" shadow="hover">
              <div class="food-header">
                <span class="name">{{ food.name }}</span>
                <el-tag size="small" type="success" effect="plain">{{ food.category }}</el-tag>
              </div>
              <div class="food-info">
                <div class="info-row"><span class="label">預設單位</span><span class="val">{{ food.unit }}</span></div>
                <div class="info-row"><span class="label">冷藏天數</span><span class="val">{{ food.daysFridge }} 天</span></div>
                <div class="info-row" v-if="food.daysFreezer > 0"><span class="label">冷凍天數</span><span class="val">{{ food.daysFreezer }} 天</span></div>
                <div class="info-row" v-if="food.daysAfterOpened > 0"><span class="label">開封後天數</span><span class="val">{{ food.daysAfterOpened }} 天</span></div>
              </div>
              <div class="food-actions">
                <el-button type="danger" plain size="small" :icon="Delete" @click="openCustomDelete(food)">刪除</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialogVisible" title="新增食材" width="500px" class="custom-app-dialog">
      <FoodForm :autoScan="autoScan" @submit="handleAddFood" />
    </el-dialog>

    <FoodDetailDialog v-model:visible="detailVisible" :food="currentFood" @updated="handleDetailUpdated" />

    <el-dialog v-model="eatDialogVisible" title="確認吃完" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center" v-if="currentEatFood"><el-icon size="48" color="var(--el-color-success)" style="margin-bottom: 16px;"><CircleCheckFilled /></el-icon><p class="dialog-title">要將「{{ currentEatFood.name }}」標記為吃完嗎？</p><p class="dialog-subtitle">這會將該食材從庫存中移除，並記錄為已食用。</p></div>
      <template #footer><el-button @click="eatDialogVisible = false">取消</el-button><el-button type="success" @click="confirmEat">確定吃完</el-button></template>
    </el-dialog>
    
    <el-dialog v-model="deleteDialogVisible" title="移至回收桶" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center"><el-icon size="48" color="var(--el-color-danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon><p class="dialog-title">{{ isBatchDelete ? `確定要刪除選中的 ${deleteTargets.length} 筆食材嗎？` : `確定要刪除「${deleteTargets[0]?.name}」嗎？` }}</p><p class="dialog-subtitle">刪除後將移至回收桶，30 天內皆可還原。</p></div>
      <template #footer><el-button @click="deleteDialogVisible = false">取消</el-button><el-button type="danger" @click="confirmDelete">確定刪除</el-button></template>
    </el-dialog>
    
    <el-dialog v-model="progressDialogVisible" title="更新消耗進度" width="400px" align-center class="custom-app-dialog">
      <div v-if="progressFood" class="dialog-content-center"><h3 class="dialog-title">{{ progressFood.name }}</h3><p class="dialog-subtitle">原始登記數量：{{ progressFood.quantity }} {{ progressFood.unit }}</p><div class="slider-wrapper"><el-slider v-model="progressValue" :min="0" :max="progressFood.quantity" show-stops :marks="{ 0: '用完', [progressFood.quantity]: '滿' }" /></div><div class="progress-result">剩餘：<span class="highlight">{{ progressValue }}</span> {{ progressFood.unit }}</div></div>
      <template #footer><el-button @click="progressDialogVisible = false">取消</el-button><el-button type="primary" @click="saveProgress">儲存進度</el-button></template>
    </el-dialog>

    <el-dialog v-model="customDialogVisible" title="新增自訂食材" width="500px" align-center class="custom-app-dialog">
      <el-form :model="customForm" label-width="100px">
        <el-form-item label="食材名稱" required><el-input v-model="customForm.name" placeholder="例如：韓式泡菜" /></el-form-item>
        <el-form-item label="分類" required><el-select v-model="customForm.category" style="width: 100%"><el-option v-for="c in categories" :key="c" :label="c" :value="c" /></el-select></el-form-item>
        <el-form-item label="預設單位" required><el-select v-model="customForm.unit" style="width: 100%"><el-option v-for="u in units" :key="u" :label="u" :value="u" /></el-select></el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="冷藏天數" label-width="80px"><el-input-number v-model="customForm.daysFridge" :min="0" style="width: 100%" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="冷凍天數" label-width="80px"><el-input-number v-model="customForm.daysFreezer" :min="0" style="width: 100%" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="開封後天數"><el-input-number v-model="customForm.daysAfterOpened" :min="0" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="customDialogVisible = false">取消</el-button><el-button type="primary" @click="handleAddCustom">建立食材</el-button></template>
    </el-dialog>

    <el-dialog v-model="customDeleteVisible" title="刪除自訂食材" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center"><el-icon size="48" color="var(--el-color-danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon><p class="dialog-title">確定要刪除「{{ currentCustomDelete?.name }}」嗎？</p><p class="dialog-subtitle">刪除後，未來新增食材時將無法快速選用此項目。</p></div>
      <template #footer><el-button @click="customDeleteVisible = false">取消</el-button><el-button type="danger" @click="confirmCustomDelete">確定刪除</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.inventory-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.page-header h2 { margin: 0; color: var(--el-text-color-primary); }
.header-actions { display: flex; gap: 12px; }

.inventory-tabs {
  background: var(--el-bg-color);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
}

.tab-action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.batch-controls { display: flex; align-items: center; gap: 12px; }

.food-name-cell { display: flex; align-items: center; gap: 8px; }

.mobile-card-list { display: flex; flex-direction: column; gap: 16px; }
.food-card { border-radius: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); }
.card-top { margin-bottom: 12px; }
.food-title { display: flex; justify-content: space-between; align-items: center; }
.food-title .name { font-size: 18px; font-weight: bold; color: var(--el-text-color-primary); }
.card-info { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; font-size: 14px; color: var(--el-text-color-regular); }
.info-row span { color: var(--el-text-color-secondary); }
.card-actions { display: flex; justify-content: space-between; border-top: 1px solid var(--el-border-color-lighter); padding-top: 12px; gap: 8px; }
.card-actions .el-button { flex: 1; margin: 0; }

.custom-food-card { border-radius: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); margin-bottom: 20px; }
.custom-food-card .food-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.custom-food-card .food-header .name { font-size: 18px; font-weight: bold; color: var(--el-text-color-primary); }
.custom-food-card .food-info { margin-bottom: 16px; }
.custom-food-card .info-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
.custom-food-card .info-row .label { color: var(--el-text-color-secondary); }
.custom-food-card .info-row .val { color: var(--el-text-color-primary); font-weight: 500; }
.custom-food-card .food-actions { border-top: 1px solid var(--el-border-color-lighter); padding-top: 12px; text-align: right; }

.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: 14px; color: var(--el-text-color-secondary); margin: 0 0 20px 0; }
.slider-wrapper { padding: 0 20px; margin-bottom: 30px; }
.progress-result { font-size: 16px; color: var(--el-text-color-primary); background: var(--el-fill-color-light); padding: 12px; border-radius: 8px; display: inline-block; }
.progress-result .highlight { font-size: 24px; font-weight: bold; color: var(--el-color-primary); margin: 0 4px; }
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
</style>