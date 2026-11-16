<script setup>
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useRecipeStore } from '@/stores/recipe'
import { useFridgeStore } from '@/stores/fridge'
import { useToast } from '@/composables/useToast'
import { ElMessage } from 'element-plus'
import { Delete, RefreshLeft, WarningFilled, Box, Bowl, Food } from '@element-plus/icons-vue'
import SmartEmpty from '@/components/empty/SmartEmpty.vue'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'

const router = useRouter()

const inventoryStore = useInventoryStore()
const recipeStore = useRecipeStore()
const fridgeStore = useFridgeStore()
const { showToast } = useToast()

const activeTab = ref('food')

// =========================================
// 多選狀態
// =========================================
const selectedFoods = ref([])
const selectedRecipes = ref([])

function toggleSelectFood(id) {
  const index = selectedFoods.value.indexOf(id)
  if (index > -1) selectedFoods.value.splice(index, 1)
  else selectedFoods.value.push(id)
}

function toggleSelectRecipe(id) {
  const index = selectedRecipes.value.indexOf(id)
  if (index > -1) selectedRecipes.value.splice(index, 1)
  else selectedRecipes.value.push(id)
}

function toggleSelectAllFoods() {
  if (selectedFoods.value.length === trashFoods.value.length) {
    selectedFoods.value = []
  } else {
    selectedFoods.value = trashFoods.value.map(f => f.id)
  }
}

function toggleSelectAllRecipes() {
  if (selectedRecipes.value.length === trashRecipes.value.length) {
    selectedRecipes.value = []
  } else {
    selectedRecipes.value = trashRecipes.value.map(r => r.id)
  }
}

// 切換 Tab 時清空選取
function handleTabChange() {
  selectedFoods.value = []
  selectedRecipes.value = []
}

// =========================================
// 永久刪除彈窗狀態
// =========================================
const deleteDialogVisible = ref(false)
const deleteTarget = ref(null)
const deleteType = ref('food') // 'food' | 'recipe' | 'batch-food' | 'batch-recipe'

// =========================================
// 食材回收桶邏輯
// =========================================
const trashFoods = computed(() => {
  return inventoryStore.deletedFoods.map(item => {
    let daysLeft = 0
    let displayTime = '未知時間'
    let locationLost = false

    if (item.deletedAt && dayjs(item.deletedAt).isValid()) {
      const deletedDate = dayjs(item.deletedAt)
      const daysPassed = dayjs().diff(deletedDate, 'day')
      daysLeft = Math.max(0, 30 - daysPassed)
      displayTime = deletedDate.format('YYYY-MM-DD HH:mm')
    }

    // 🌟 檢查原位置是否還在
    if (item.zone) {
      const zoneExists = fridgeStore.fridgeStructure.some(z => z.id === item.zone)
      if (!zoneExists) {
        locationLost = true
      }
    }

    return { ...item, daysLeft, displayTime, locationLost }
  })
})

function handleRestoreFood(item) {
  // 如果原位置不見了，先清空位置
  if (item.locationLost) {
    inventoryStore.moveFood(item.id, '', '')
  }
  inventoryStore.restoreFood(item.id)
  
  // 從選取中移除
  selectedFoods.value = selectedFoods.value.filter(id => id !== item.id)
  
  showToast({ 
    title: `已還原「${item.name}」`, 
    message: item.locationLost ? '原存放位置已刪除，已移至「未指定位置」。' : '已成功放回冰箱庫存。',
    type: 'success' 
  })
}

function handleBatchRestoreFood() {
  if (selectedFoods.value.length === 0) return
  let count = 0
  selectedFoods.value.forEach(id => {
    const item = trashFoods.value.find(f => f.id === id)
    if (item) {
      if (item.locationLost) inventoryStore.moveFood(item.id, '', '')
      inventoryStore.restoreFood(item.id)
      count++
    }
  })
  selectedFoods.value = []
  showToast({ title: `已批次還原 ${count} 筆食材`, type: 'success' })
}

function openDeleteFoodDialog(item) {
  deleteTarget.value = item
  deleteType.value = 'food'
  deleteDialogVisible.value = true
}

function openBatchDeleteFoodDialog() {
  if (selectedFoods.value.length === 0) return
  deleteTarget.value = { name: `選中的 ${selectedFoods.value.length} 筆食材` }
  deleteType.value = 'batch-food'
  deleteDialogVisible.value = true
}

// =========================================
// 食譜回收桶邏輯
// =========================================
const trashRecipes = computed(() => {
  return recipeStore.deletedFavoriteRecipes.map(item => {
    let displayTime = '未知時間'
    if (item.deletedAt && dayjs(item.deletedAt).isValid()) {
      displayTime = dayjs(item.deletedAt).format('YYYY-MM-DD HH:mm')
    }
    const daysLeft = item.daysLeft !== undefined ? item.daysLeft : 0
    return { ...item, daysLeft, displayTime }
  })
})

function handleRestoreRecipe(recipe) {
  recipeStore.restoreFavorite(recipe.id)
  selectedRecipes.value = selectedRecipes.value.filter(id => id !== recipe.id)
  showToast({ title: `已還原「${recipe.name}」`, message: '已成功加回收藏。', type: 'success' })
}

function handleBatchRestoreRecipe() {
  if (selectedRecipes.value.length === 0) return
  let count = 0
  selectedRecipes.value.forEach(id => {
    recipeStore.restoreFavorite(id)
    count++
  })
  selectedRecipes.value = []
  showToast({ title: `已批次還原 ${count} 筆食譜`, type: 'success' })
}

function openDeleteRecipeDialog(item) {
  deleteTarget.value = item
  deleteType.value = 'recipe'
  deleteDialogVisible.value = true
}

function openBatchDeleteRecipeDialog() {
  if (selectedRecipes.value.length === 0) return
  deleteTarget.value = { name: `選中的 ${selectedRecipes.value.length} 筆食譜` }
  deleteType.value = 'batch-recipe'
  deleteDialogVisible.value = true
}

// =========================================
// 確認永久刪除
// =========================================
function confirmDelete() {
  if (!deleteTarget.value) return

  if (deleteType.value === 'food') {
    inventoryStore.permanentlyDelete(deleteTarget.value.id)
    showToast({ title: '已永久刪除', type: 'success' })
  } else if (deleteType.value === 'recipe') {
    recipeStore.permanentlyDeleteFavorite(deleteTarget.value.id)
    showToast({ title: '已永久刪除', type: 'success' })
  } else if (deleteType.value === 'batch-food') {
    selectedFoods.value.forEach(id => inventoryStore.permanentlyDelete(id))
    showToast({ title: '已批次永久刪除', type: 'success' })
    selectedFoods.value = []
  } else if (deleteType.value === 'batch-recipe') {
    selectedRecipes.value.forEach(id => recipeStore.permanentlyDeleteFavorite(id))
    showToast({ title: '已批次永久刪除', type: 'success' })
    selectedRecipes.value = []
  }

  deleteDialogVisible.value = false
  deleteTarget.value = null
}
</script>

<template>
  <div class="trash-container">
    <div class="page-header">
      <div>
        <h2>回收桶</h2>
        <p class="hint">誤刪的項目會保留 30 天，超過期限將自動永久清除</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="trash-tabs" @tab-change="handleTabChange">
      <!-- ================= 食材回收桶 ================= -->
      <el-tab-pane name="food">
        <template #label>
          <div class="tab-label"><el-icon><Food /></el-icon> 食材回收桶 ({{ trashFoods.length }})</div>
        </template>
        
        <SmartEmpty 
          v-if="trashFoods.length === 0" 
          type="trash" 
          @primary="router.push('/inventory')"
        />

        <div v-else>
          <!-- 批次操作列 -->
          <div class="batch-bar">
            <el-checkbox 
              :model-value="selectedFoods.length === trashFoods.length && trashFoods.length > 0" 
              @change="toggleSelectAllFoods"
            >全選</el-checkbox>
            
            <div class="batch-actions" v-if="selectedFoods.length > 0">
              <el-button type="success" plain size="small" :icon="RefreshLeft" @click="handleBatchRestoreFood">
                批次還原 ({{ selectedFoods.length }})
              </el-button>
              <el-button type="danger" plain size="small" :icon="Delete" @click="openBatchDeleteFoodDialog">
                批次永久刪除
              </el-button>
            </div>
          </div>

          <el-row :gutter="16">
            <el-col v-for="item in trashFoods" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
              <div class="trash-card" :class="{ 'is-selected': selectedFoods.includes(item.id) }">
                <!-- 頂部標籤 -->
                <div class="card-top-bar">
                  <div class="card-type"><el-icon><Food /></el-icon> 食材</div>
                  <div class="card-expiry" :class="{ 'urgent': item.daysLeft <= 5 }">
                    {{ item.daysLeft <= 5 ? `剩 ${item.daysLeft} 天清除` : `保留 ${item.daysLeft} 天` }}
                  </div>
                </div>

                <div class="card-body">
                  <div class="card-header-row">
                    <el-checkbox 
                      :model-value="selectedFoods.includes(item.id)" 
                      @change="() => toggleSelectFood(item.id)"
                      class="card-checkbox"
                    />
                    <span class="name">{{ item.name }}</span>
                  </div>
                  
                  <div class="card-info">
                    <div class="info-row"><span class="label">數量</span><span class="val">{{ item.quantity }} {{ item.unit }}</span></div>
                    <div class="info-row"><span class="label">期限</span><span class="val">{{ item.expiry }}</span></div>
                    <div class="info-row"><span class="label">刪除時間</span><span class="val">{{ item.displayTime }}</span></div>
                    <div v-if="item.locationLost" class="location-warning">
                      <el-icon><WarningFilled /></el-icon> 原存放位置已刪除
                    </div>
                  </div>
                </div>

                <div class="card-actions">
                  <el-button type="success" plain size="small" :icon="RefreshLeft" @click="handleRestoreFood(item)">還原</el-button>
                  <el-button type="danger" plain size="small" :icon="Delete" @click="openDeleteFoodDialog(item)">永久刪除</el-button>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>

      <!-- ================= 食譜回收桶 ================= -->
      <el-tab-pane name="recipe">
        <template #label>
          <div class="tab-label"><el-icon><Bowl /></el-icon> 食譜回收桶 ({{ trashRecipes.length }})</div>
        </template>
        
        <SmartEmpty 
          v-if="trashRecipes.length === 0" 
          type="trash" 
          @primary="router.push('/recipe')"
        />

        <div v-else>
          <div class="batch-bar">
            <el-checkbox 
              :model-value="selectedRecipes.length === trashRecipes.length && trashRecipes.length > 0" 
              @change="toggleSelectAllRecipes"
            >全選</el-checkbox>
            
            <div class="batch-actions" v-if="selectedRecipes.length > 0">
              <el-button type="success" plain size="small" :icon="RefreshLeft" @click="handleBatchRestoreRecipe">
                批次還原 ({{ selectedRecipes.length }})
              </el-button>
              <el-button type="danger" plain size="small" :icon="Delete" @click="openBatchDeleteRecipeDialog">
                批次永久刪除
              </el-button>
            </div>
          </div>

          <el-row :gutter="16">
            <el-col v-for="item in trashRecipes" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
              <div class="trash-card" :class="{ 'is-selected': selectedRecipes.includes(item.id) }">
                <div class="card-top-bar">
                  <div class="card-type recipe-type"><el-icon><Bowl /></el-icon> 食譜</div>
                  <div class="card-expiry" :class="{ 'urgent': item.daysLeft <= 5 }">
                    {{ item.daysLeft <= 5 ? `剩 ${item.daysLeft} 天清除` : `保留 ${item.daysLeft} 天` }}
                  </div>
                </div>

                <div class="card-body">
                  <div class="card-header-row">
                    <el-checkbox 
                      :model-value="selectedRecipes.includes(item.id)" 
                      @change="() => toggleSelectRecipe(item.id)"
                      class="card-checkbox"
                    />
                    <span class="name">{{ item.name }}</span>
                  </div>
                  
                  <div class="card-info">
                    <div class="info-row"><span class="label">分類</span><span class="val">{{ item.mainCategory }}</span></div>
                    <div class="info-row"><span class="label">熱量</span><span class="val">{{ item.calories }} kcal</span></div>
                    <div class="info-row"><span class="label">刪除時間</span><span class="val">{{ item.displayTime }}</span></div>
                  </div>
                </div>

                <div class="card-actions">
                  <el-button type="success" plain size="small" :icon="RefreshLeft" @click="handleRestoreRecipe(item)">還原收藏</el-button>
                  <el-button type="danger" plain size="small" :icon="Delete" @click="openDeleteRecipeDialog(item)">永久刪除</el-button>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 永久刪除彈窗 -->
    <el-dialog v-model="deleteDialogVisible" title="永久刪除" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center" v-if="deleteTarget">
        <el-icon size="56" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
        <p class="dialog-title">確定要永久刪除「{{ deleteTarget.name }}」嗎？</p>
        <p class="dialog-subtitle">此動作無法復原，該項目將從系統中徹底移除。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete">確定刪除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.trash-container { width: 100%; max-width: 1100px; margin: 0 auto; }
.page-header { margin-bottom: var(--space-5); }
.page-header h2 { margin: 0 0 8px 0; color: var(--ink); font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }

.trash-tabs { background: var(--surface); padding: var(--space-5); border-radius: var(--radius-lg); border: 1px solid var(--border-light); }
.tab-label { display: flex; align-items: center; gap: 6px; font-size: var(--text-base); font-weight: 600; }

/* 批次操作列 */
.batch-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--ground);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-light);
}
.batch-actions { display: flex; gap: var(--space-2); }

/* 卡片設計（移除左側粗彩條） */
.trash-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  overflow: hidden;
  transition: opacity var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  display: flex;
  flex-direction: column;
}
.trash-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}
.trash-card.is-selected {
  border-color: var(--accent);
  background: var(--accent-light);
}

/* 頂部標籤 */
.card-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--ground);
  border-bottom: 1px solid var(--border-light);
  font-size: var(--text-xs);
}
.card-type {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-weight: 600;
}
.card-type.recipe-type { color: var(--accent); }
.card-expiry { color: var(--muted); font-weight: 500; }
.card-expiry.urgent { color: var(--danger); }

/* 內容區 */
.card-body { padding: var(--space-4); flex: 1; display: flex; flex-direction: column; }
.card-header-row { display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-3); }
.card-checkbox { flex-shrink: 0; }
.card-header-row .name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--ink);
  text-decoration: line-through;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-display);
}

.card-info { display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
.info-row { display: flex; justify-content: space-between; font-size: var(--text-sm); }
.info-row .label { color: var(--muted); }
.info-row .val { color: var(--ink); font-weight: 500; }

.location-warning {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--danger);
  background: var(--el-color-danger-light-9);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  margin-top: 6px;
}

/* 底部按鈕 */
.card-actions {
  display: flex;
  border-top: 1px solid var(--border-light);
  padding: var(--space-3) var(--space-4);
  gap: var(--space-2);
}
.card-actions .el-button { flex: 1; margin: 0; }

/* 彈窗共用樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 120px; }
</style>

<style>
.custom-app-dialog { --el-dialog-bg-color: var(--surface); --el-dialog-border-radius: var(--radius-lg); --el-dialog-padding-primary: 24px; }
.custom-app-dialog .el-dialog__header { margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light); padding-bottom: 16px; margin-bottom: 16px; }
.custom-app-dialog .el-dialog__title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); }
</style>