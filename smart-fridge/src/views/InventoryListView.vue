<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import FoodForm from '@/components/food/FoodForm.vue'
import FoodDetailDialog from '@/components/food/FoodDetailDialog.vue'

const route = useRoute()
const router = useRouter()
const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()
const tableRef = ref(null)

const searchKeyword = ref(route.query.search || '')
const dialogVisible = ref(false)
const autoScan = ref(false) // 控制是否自動觸發 AI 辨識

// 手機版狀態
const isMobile = ref(false)
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

// 表格勾選狀態
const selectedRows = ref([])
const selectAll = ref(false)

// 詳情彈窗狀態
const detailVisible = ref(false)
const currentFood = ref(null)

// 其他彈窗狀態
const eatDialogVisible = ref(false)
const currentEatFood = ref(null)
const deleteDialogVisible = ref(false)
const deleteTargets = ref([])
const isBatchDelete = ref(false)
const progressDialogVisible = ref(false)
const progressFood = ref(null)
const progressValue = ref(0)

// 監聽路由參數 (接收新增動作)
watch(() => route.query.action, (action) => {
  if (action === 'add') {
    autoScan.value = false
    dialogVisible.value = true
    // 清除 URL 參數，避免重整時一直彈出
    router.replace({ query: { ...route.query, action: undefined } })
  } else if (action === 'scan') {
    autoScan.value = true
    dialogVisible.value = true
    router.replace({ query: { ...route.query, action: undefined } })
  }
}, { immediate: true })

// 監聽搜尋框
watch(() => route.query.search, (newVal) => { 
  searchKeyword.value = newVal || ''
  clearSelection()
})
watch(searchKeyword, () => clearSelection())

const filteredFoods = computed(() => {
  if (!searchKeyword.value) return inventoryStore.activeFoods
  return inventoryStore.activeFoods.filter(f => f.name.includes(searchKeyword.value) || f.category.includes(searchKeyword.value))
})

function openDialog() { 
  autoScan.value = false
  dialogVisible.value = true 
}
function handleAddFood(food) { 
  inventoryStore.addFood(food)
  dialogVisible.value = false
  ElMessage.success('食材已新增')
}

function clearSelection() { 
  if (tableRef.value) tableRef.value.clearSelection()
  selectedRows.value = []
  selectAll.value = false 
}
function toggleSelectAll() { if (tableRef.value) tableRef.value.toggleAllSelection() }
function handleSelectionChange(rows) { 
  selectedRows.value = rows
  selectAll.value = rows.length === filteredFoods.value.length && filteredFoods.value.length > 0 
}

function openDetail(row) {
  currentFood.value = row
  detailVisible.value = true
}
function handleDetailUpdated() { clearSelection() }

// 吃完
function openEatDialog(row) { currentEatFood.value = row; eatDialogVisible.value = true }
function confirmEat() { 
  if (currentEatFood.value) { 
    inventoryStore.markAsEaten(currentEatFood.value.id)
    ElMessage.success(`已將「${currentEatFood.value.name}」標記為吃完`)
    eatDialogVisible.value = false
    clearSelection() 
  } 
}

// 刪除
function openDeleteDialog(row) { deleteTargets.value = [row]; isBatchDelete.value = false; deleteDialogVisible.value = true }
function openBatchDeleteDialog() { 
  if (selectedRows.value.length === 0) return
  deleteTargets.value = [...selectedRows.value]
  isBatchDelete.value = true
  deleteDialogVisible.value = true 
}
function confirmDelete() { 
  const ids = deleteTargets.value.map(r => r.id)
  inventoryStore.batchDelete(ids)
  ElMessage.success(`已刪除 ${ids.length} 筆食材紀錄`)
  deleteDialogVisible.value = false
  clearSelection() 
}

// 進度
function openProgressDialog(row) { progressFood.value = row; progressValue.value = row.quantity; progressDialogVisible.value = true }
function saveProgress() { 
  if (progressFood.value) { 
    inventoryStore.updateProgress(progressFood.value.id, progressValue.value)
    ElMessage.success('消耗進度已更新')
    progressDialogVisible.value = false
    clearSelection()
  } 
}

function getLocationText(row) {
  const zone = fridgeStore.fridgeStructure.find(z => z.id === row.zone)
  const shelf = zone?.shelves.find(s => s.id === row.shelf)
  return `${zone?.name || '未知'} > ${shelf?.name || '未指定'}`
}
</script>

<template>
  <div class="inventory-container">
    <div class="page-header">
      <h2>食材清單</h2>
      <div class="header-actions" v-if="!isMobile">
        <div class="batch-controls">
          <el-checkbox :model-value="selectAll" @change="toggleSelectAll">全選</el-checkbox>
          <el-button type="danger" plain :disabled="selectedRows.length === 0" @click="openBatchDeleteDialog">批次刪除 ({{ selectedRows.length }})</el-button>
        </div>
        <el-button type="primary" @click="openDialog" icon="Plus">新增食材</el-button>
      </div>
      <!-- 手機版只顯示新增按鈕 -->
      <el-button v-else type="primary" @click="openDialog" icon="Plus">新增食材</el-button>
    </div>

    <el-alert v-if="searchKeyword" :title="`正在搜尋：${searchKeyword}`" type="info" show-icon closable @close="searchKeyword = ''" style="margin-bottom: 16px;" />
    
    <!-- 電腦版：表格模式 -->
    <el-card shadow="never" v-if="!isMobile">
      <el-table ref="tableRef" :data="filteredFoods" style="width: 100%" row-key="id" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="食材名稱" min-width="120" />
        <el-table-column label="存放位置" min-width="140"><template #default="{ row }"><el-tag size="small" :type="row.zone === 'freezer' ? 'info' : 'primary'">{{ getLocationText(row) }}</el-tag></template></el-table-column>
        <el-table-column prop="category" label="分類" width="100" />
        <el-table-column label="數量" width="100"><template #default="{ row }">{{ row.quantity }} {{ row.unit }}</template></el-table-column>
        <el-table-column prop="expiry" label="保存期限" width="120" />
        <el-table-column label="狀態" width="120"><template #default="{ row }"><el-tag :type="inventoryStore.getStatus(row.expiry)">{{ inventoryStore.getStatusText(row.expiry) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="info" link @click="openDetail(row)">詳情</el-button>
            <el-button type="primary" link @click="openProgressDialog(row)">進度</el-button>
            <el-button type="success" link @click="openEatDialog(row)">吃完</el-button>
            <el-button type="danger" link @click="openDeleteDialog(row)">刪除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="filteredFoods.length === 0" description="找不到符合的食材，或目前冰箱是空的"><el-button type="primary" @click="openDialog">馬上新增第一筆食材</el-button></el-empty>
    </el-card>

    <!-- 手機版：卡片模式 -->
    <div class="mobile-card-list" v-else>
      <el-empty v-if="filteredFoods.length === 0" description="找不到符合的食材，或目前冰箱是空的">
        <el-button type="primary" @click="openDialog">馬上新增第一筆食材</el-button>
      </el-empty>

      <el-card v-for="food in filteredFoods" :key="food.id" class="food-card" shadow="hover">
        <div class="card-top">
          <div class="food-title">
            <span class="name">{{ food.name }}</span>
            <el-tag :type="inventoryStore.getStatus(food.expiry)" size="small" effect="dark">
              {{ inventoryStore.getStatusText(food.expiry) }}
            </el-tag>
          </div>
        </div>
        
        <div class="card-info">
          <div class="info-row"><span>位置：</span>{{ getLocationText(food) }}</div>
          <div class="info-row"><span>數量：</span>{{ food.quantity }} {{ food.unit }}</div>
          <div class="info-row"><span>期限：</span>{{ food.expiry }}</div>
        </div>

        <div class="card-actions">
          <el-button type="info" plain size="small" @click="openDetail(food)">詳情</el-button>
          <el-button type="primary" plain size="small" @click="openProgressDialog(food)">進度</el-button>
          <el-button type="success" plain size="small" @click="openEatDialog(food)">吃完</el-button>
          <el-button type="danger" plain size="small" @click="openDeleteDialog(food)">刪除</el-button>
        </div>
      </el-card>
    </div>

    <!-- 彈窗區塊 -->
    <el-dialog v-model="dialogVisible" title="新增食材" width="500px" class="custom-app-dialog">
      <FoodForm :autoScan="autoScan" @submit="handleAddFood" />
    </el-dialog>

    <FoodDetailDialog v-model:visible="detailVisible" :food="currentFood" @updated="handleDetailUpdated" />

    <el-dialog v-model="eatDialogVisible" title="確認吃完" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center" v-if="currentEatFood"><el-icon size="48" color="var(--el-color-success)" style="margin-bottom: 16px;"><CircleCheckFilled /></el-icon><p class="dialog-title">要將「{{ currentEatFood.name }}」標記為吃完嗎？</p><p class="dialog-subtitle">這會將該食材從庫存中移除，並記錄為已食用。</p></div>
      <template #footer><el-button @click="eatDialogVisible = false">取消</el-button><el-button type="success" @click="confirmEat">確定吃完</el-button></template>
    </el-dialog>
    
    <el-dialog v-model="deleteDialogVisible" title="確認刪除" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center"><el-icon size="48" color="var(--el-color-danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon><p class="dialog-title">{{ isBatchDelete ? `確定要刪除選中的 ${deleteTargets.length} 筆食材嗎？` : `確定要永久刪除「${deleteTargets[0]?.name}」嗎？` }}</p><p class="dialog-subtitle">刪除後資料將無法恢復，請謹慎操作。</p></div>
      <template #footer><el-button @click="deleteDialogVisible = false">取消</el-button><el-button type="danger" @click="confirmDelete">確定刪除</el-button></template>
    </el-dialog>
    
    <el-dialog v-model="progressDialogVisible" title="更新消耗進度" width="400px" align-center class="custom-app-dialog">
      <div v-if="progressFood" class="dialog-content-center"><h3 class="dialog-title">{{ progressFood.name }}</h3><p class="dialog-subtitle">原始登記數量：{{ progressFood.quantity }} {{ progressFood.unit }}</p><div class="slider-wrapper"><el-slider v-model="progressValue" :min="0" :max="progressFood.quantity" show-stops :marks="{ 0: '用完', [progressFood.quantity]: '滿' }" /></div><div class="progress-result">剩餘：<span class="highlight">{{ progressValue }}</span> {{ progressFood.unit }}</div></div>
      <template #footer><el-button @click="progressDialogVisible = false">取消</el-button><el-button type="primary" @click="saveProgress">儲存進度</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.inventory-container { width: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.page-header h2 { margin: 0; color: var(--el-text-color-primary); }
.header-actions { display: flex; align-items: center; gap: 16px; }
.batch-controls { display: flex; align-items: center; gap: 12px; background: var(--el-fill-color-light); padding: 6px 12px; border-radius: 8px; }

/* 手機版卡片樣式 */
.mobile-card-list { display: flex; flex-direction: column; gap: 16px; }
.food-card { border-radius: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); }
.card-top { margin-bottom: 12px; }
.food-title { display: flex; justify-content: space-between; align-items: center; }
.food-title .name { font-size: 18px; font-weight: bold; color: var(--el-text-color-primary); }
.card-info { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; font-size: 14px; color: var(--el-text-color-regular); }
.info-row span { color: var(--el-text-color-secondary); }
.card-actions { display: flex; justify-content: space-between; border-top: 1px solid var(--el-border-color-lighter); padding-top: 12px; gap: 8px; }
.card-actions .el-button { flex: 1; margin: 0; }

/* 彈窗共用樣式 */
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