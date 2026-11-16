<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRecipeStore } from '@/stores/recipe'
import { ElMessage } from 'element-plus'
import { Delete, RefreshLeft, WarningFilled } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import SmartEmpty from '@/components/empty/SmartEmpty.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const recipeStore = useRecipeStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const trashItems = computed(() => recipeStore.deletedFavoriteRecipes)

// 偵測手機端以調整抽屜寬度
const isMobile = ref(false)
function checkMobile() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })

// 永久刪除彈窗狀態
const deleteDialogVisible = ref(false)
const deleteTarget = ref(null)

function handleRestore(recipe) {
  recipeStore.restoreFavorite(recipe.id)
  ElMessage.success(`已將「${recipe.name}」還原至收藏`)
}

function openDeleteDialog(recipe) {
  deleteTarget.value = recipe
  deleteDialogVisible.value = true
}

function confirmDelete() {
  if (!deleteTarget.value) return
  recipeStore.permanentlyDeleteFavorite(deleteTarget.value.id)
  ElMessage.warning('已永久刪除')
  deleteDialogVisible.value = false
  deleteTarget.value = null
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :size="isMobile ? '90%' : '380px'"
    direction="rtl"
    class="recipe-trash-drawer"
  >
    <template #header>
      <div class="drawer-header">
        <span class="title">食譜回收桶</span>
        <span class="subtitle">保留 30 天</span>
      </div>
    </template>

    <div class="drawer-body">
      <SmartEmpty
        v-if="trashItems.length === 0"
        type="trash"
        size="small"
        title="目前沒有被刪除的食譜"
        description="刪除的食譜會保留 30 天，期間內皆可還原。"
      />

      <div v-else class="trash-list">
        <div v-for="item in trashItems" :key="item.id" class="trash-item">
          <div class="item-header">
            <span class="name">{{ item.name }}</span>
            <el-tag v-if="item.daysLeft <= 5" type="danger" effect="plain" size="small" round>
              剩 {{ item.daysLeft }} 天清除
            </el-tag>
            <el-tag v-else type="info" effect="plain" size="small" round>
              保留 {{ item.daysLeft }} 天
            </el-tag>
          </div>
          
          <div class="item-info">
            <div class="info-row"><span class="label">分類</span><span class="val">{{ item.mainCategory }}</span></div>
            <div class="info-row"><span class="label">熱量</span><span class="val">{{ item.calories }} kcal</span></div>
            <div class="info-row"><span class="label">刪除時間</span><span class="val">{{ dayjs(item.deletedAt).format('YYYY-MM-DD HH:mm') }}</span></div>
          </div>

          <div class="item-actions">
            <el-button type="success" plain size="small" :icon="RefreshLeft" @click="handleRestore(item)">
              還原收藏
            </el-button>
            <el-button type="danger" plain size="small" :icon="Delete" @click="openDeleteDialog(item)">
              永久刪除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 自訂永久刪除彈窗 -->
    <el-dialog v-model="deleteDialogVisible" title="永久刪除" width="400px" align-center class="custom-app-dialog" append-to-body>
      <div class="dialog-content-center" v-if="deleteTarget">
        <el-icon size="56" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
        <p class="dialog-title">確定要永久刪除「{{ deleteTarget.name }}」嗎？</p>
        <p class="dialog-subtitle">此動作無法復原，該食譜將從系統中徹底移除。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete">確定刪除</el-button>
        </span>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
}
.drawer-header .title {
  font-size: 18px;
  font-weight: 700;
  font-family: var(--font-display);
  color: var(--ink);
}
.drawer-header .subtitle {
  font-size: 12px;
  color: var(--muted);
}

.drawer-body {
  height: 100%;
  overflow-y: auto;
  padding: 0 4px;
}

.trash-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trash-item {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 16px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.trash-item:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.item-header .name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: line-through;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.item-info {
  margin-bottom: 16px;
  background: var(--ground);
  padding: 12px;
  border-radius: var(--radius-sm);
}

.info-row {
  display: flex;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}
.info-row:last-child { margin-bottom: 0; }

.info-row .label {
  width: 70px;
  flex-shrink: 0;
  color: var(--muted);
}
.info-row .val {
  color: var(--ink);
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 10px;
  border-top: 1px dashed var(--border-light);
  padding-top: 12px;
}

.item-actions .el-button {
  flex: 1;
  margin: 0;
}

/* 彈窗樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 18px; font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: 14px; color: var(--muted); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 120px; }

/* 手機端按鈕改為上下堆疊，避免擁擠 */
@media (max-width: 480px) {
  .item-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>

<style>
/* 抽屜標題與內容背景覆寫 */
.recipe-trash-drawer .el-drawer__header {
  margin-bottom: 0;
  padding: 20px 20px 16px 20px;
  border-bottom: 1px solid var(--border-light);
  background: var(--surface);
}
.recipe-trash-drawer .el-drawer__body {
  padding: 16px 20px;
  background: var(--ground);
}
</style>