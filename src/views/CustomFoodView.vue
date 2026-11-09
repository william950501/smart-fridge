<script setup>
import { ref, reactive, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Box, WarningFilled } from '@element-plus/icons-vue'

const inventoryStore = useInventoryStore()

// 新增彈窗狀態
const addDialogVisible = ref(false)
const formRef = ref(null)

// 刪除彈窗狀態
const deleteDialogVisible = ref(false)
const currentDeleteFood = ref(null)

// 表單資料
const form = reactive({
  name: '',
  category: '其他',
  unit: '個',
  daysFridge: 7,
  daysFreezer: 0,
  daysAfterOpened: 0
})

const categories = ['蔬菜', '水果', '肉類', '海鮮', '乳製品', '蛋類', '飲品', '調味料', '其他']
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升']

const rules = {
  name: [{ required: true, message: '請輸入食材名稱', trigger: 'blur' }],
  category: [{ required: true, message: '請選擇分類', trigger: 'change' }],
  unit: [{ required: true, message: '請選擇預設單位', trigger: 'change' }],
}

// 計算自訂食材總數
const customFoodsCount = computed(() => inventoryStore.customFoods.length)

function openAddDialog() {
  formRef.value?.resetFields()
  form.name = ''
  form.category = '其他'
  form.unit = '個'
  form.daysFridge = 7
  form.daysFreezer = 0
  form.daysAfterOpened = 0
  addDialogVisible.value = true
}

function handleSubmit() {
  if (!formRef.value) return
  formRef.value.validate((valid) => {
    if (valid) {
      const result = inventoryStore.addCustomFood({ ...form })
      if (result.success) {
        ElMessage.success('已新增自訂食材！')
        addDialogVisible.value = false
      } else {
        ElMessage.error(result.message)
      }
    }
  })
}

function openDeleteDialog(food) {
  currentDeleteFood.value = food
  deleteDialogVisible.value = true
}

function confirmDelete() {
  if (currentDeleteFood.value) {
    inventoryStore.removeCustomFood(currentDeleteFood.value.name)
    ElMessage.success('已刪除自訂食材')
    deleteDialogVisible.value = false
  }
}
</script>

<template>
  <div class="custom-food-container">
    <div class="page-header">
      <div>
        <h2>自訂食材管理</h2>
        <p class="hint">管理您專屬的食材字典，新增後即可在登記食材時快速選用</p>
      </div>
      <el-button type="primary" @click="openAddDialog" :icon="Plus">新增自訂食材</el-button>
    </div>

    <!-- 統計卡片 -->
    <el-card shadow="never" class="stat-card">
      <div class="stat-content">
        <div class="stat-icon">
          <el-icon size="32"><Box /></el-icon>
        </div>
        <div class="stat-info">
          <span class="label">目前已建立的自訂食材</span>
          <span class="value">{{ customFoodsCount }} 項</span>
        </div>
      </div>
    </el-card>

    <!-- 空狀態 -->
    <el-empty 
      v-if="customFoodsCount === 0" 
      description="還沒有建立任何自訂食材，點擊右上角開始新增吧！" 
      :image-size="150"
    />

    <!-- 自訂食材列表 -->
    <el-row v-else :gutter="20">
      <el-col 
        v-for="food in inventoryStore.customFoods" 
        :key="food.name" 
        :xs="24" :sm="12" :md="8" :lg="6"
      >
        <el-card class="food-card" shadow="hover">
          <div class="food-header">
            <span class="name">{{ food.name }}</span>
            <el-tag size="small" type="success" effect="plain">{{ food.category }}</el-tag>
          </div>
          
          <div class="food-info">
            <div class="info-row">
              <span class="label">預設單位</span>
              <span class="val">{{ food.unit }}</span>
            </div>
            <div class="info-row">
              <span class="label">冷藏天數</span>
              <span class="val">{{ food.daysFridge }} 天</span>
            </div>
            <div class="info-row" v-if="food.daysFreezer > 0">
              <span class="label">冷凍天數</span>
              <span class="val">{{ food.daysFreezer }} 天</span>
            </div>
            <div class="info-row" v-if="food.daysAfterOpened > 0">
              <span class="label">開封後天數</span>
              <span class="val">{{ food.daysAfterOpened }} 天</span>
            </div>
          </div>

          <div class="food-actions">
            <el-button type="danger" plain size="small" :icon="Delete" @click="openDeleteDialog(food)">
              刪除
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新增自訂食材彈窗 -->
    <el-dialog v-model="addDialogVisible" title="新增自訂食材" width="500px" align-center class="custom-app-dialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="食材名稱" prop="name">
          <el-input v-model="form.name" placeholder="例如：韓式泡菜" />
        </el-form-item>

        <el-form-item label="分類" prop="category">
          <el-select v-model="form.category" style="width: 100%">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>

        <el-form-item label="預設單位" prop="unit">
          <el-select v-model="form.unit" style="width: 100%">
            <el-option v-for="u in units" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">預設保存天數</el-divider>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="冷藏" label-width="80px">
              <el-input-number v-model="form.daysFridge" :min="0" :max="365" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="冷凍" label-width="80px">
              <el-input-number v-model="form.daysFreezer" :min="0" :max="365" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="開封後天數">
          <el-input-number v-model="form.daysAfterOpened" :min="0" :max="365" style="width: 100%" />
        </el-form-item>

        <div class="form-tip">
          提示：若設定冷藏/冷凍天數，新增食材時會自動帶入保存期限。
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">建立食材</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 刪除確認彈窗 -->
    <el-dialog v-model="deleteDialogVisible" title="刪除自訂食材" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon size="56" color="var(--el-color-danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
        <p class="dialog-title">確定要刪除「{{ currentDeleteFood?.name }}」嗎？</p>
        <p class="dialog-subtitle">刪除後，未來新增食材時將無法從清單中選用此項目。</p>
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
.custom-food-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.hint {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin: 0;
}

/* 統計卡片 */
.stat-card {
  border-radius: 12px;
  background: linear-gradient(135deg, var(--el-bg-color) 0%, var(--el-color-primary-light-9) 100%);
  border: 1px solid var(--el-border-color-light);
  margin-bottom: 24px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-info .label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.stat-info .value {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
}

/* 食材卡片 */
.food-card {
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  margin-bottom: 20px;
}

.food-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.food-header .name {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.food-info {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
}

.info-row .label {
  color: var(--el-text-color-secondary);
}

.info-row .val {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.food-actions {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
  text-align: right;
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding-left: 100px;
  margin-top: -8px;
}

/* 彈窗共用樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: 14px; color: var(--el-text-color-secondary); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 120px; }

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
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
</style>