<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useShoppingStore } from '@/stores/shopping'
import { useInventoryStore } from '@/stores/inventory'
import FoodForm from '@/components/food/FoodForm.vue'
import { Plus, Upload } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const shoppingStore = useShoppingStore()
const inventoryStore = useInventoryStore()

const form = reactive({ name: '', quantity: 1, unit: '個' })
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升']
const inputRef = ref(null)

// 登記至庫存彈窗狀態
const registerDialogVisible = ref(false)
const currentRegisterItem = ref(null)

watch(() => route.query.action, (action) => {
  if (action === 'add') {
    setTimeout(() => {
      inputRef.value?.focus()
      ElMessage.info('請輸入要加入購物清單的品項')
    }, 300)
    router.replace({ query: { ...route.query, action: undefined } })
  }
}, { immediate: true })

function handleAdd() {
  if (!form.name.trim()) {
    ElMessage.warning('請輸入要購買的品項')
    inputRef.value?.focus()
    return
  }
  shoppingStore.addItem({ name: form.name.trim(), quantity: form.quantity, unit: form.unit })
  ElMessage.success('已加入購物清單')
  form.name = ''; form.quantity = 1; form.unit = '個'
  inputRef.value?.focus()
}

function handleRemove(id) {
  shoppingStore.removeItem(id)
}

// 打開登記彈窗
function openRegisterDialog(item) {
  currentRegisterItem.value = item
  registerDialogVisible.value = true
}

// 處理表單送出
function handleRegisterSubmit(foodData) {
  if (currentRegisterItem.value) {
    // 1. 加入庫存
    inventoryStore.addFood(foodData)
    // 2. 從購物清單移除該項目
    shoppingStore.removeItem(currentRegisterItem.value.id)
    
    ElMessage.success(`已將「${foodData.name}」登記至庫存`)
    registerDialogVisible.value = false
    currentRegisterItem.value = null
  }
}
</script>

<template>
  <div class="shopping-container">
    <div class="page-header">
      <div>
        <h2>家庭購物清單</h2>
        <p class="hint">勾選已購買的項目，可直接登記至冰箱庫存</p>
      </div>
      <div class="summary">
        <el-tag type="warning" effect="dark" size="large">待購買：{{ shoppingStore.pendingCount }}</el-tag>
        <el-tag type="success" effect="dark" size="large" style="margin-left: 12px;">已購買：{{ shoppingStore.purchasedCount }}</el-tag>
      </div>
    </div>

    <el-card shadow="never" class="add-card">
      <div class="add-form">
        <el-input 
          ref="inputRef"
          v-model="form.name" 
          placeholder="輸入要買的東西 (例如：牛奶)" 
          @keyup.enter="handleAdd"
          clearable
          size="large"
          class="input-name"
        />
        <div class="quantity-group">
          <el-input-number v-model="form.quantity" :min="1" :max="99" size="large" class="input-qty" />
          <el-select v-model="form.unit" size="large" class="input-unit">
            <el-option v-for="u in units" :key="u" :label="u" :value="u" />
          </el-select>
          <el-button type="primary" size="large" @click="handleAdd" icon="Plus">加入</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="list-card">
      <el-table :data="shoppingStore.items" style="width: 100%">
        <el-table-column label="狀態" width="80" align="center">
          <template #default="{ row }">
            <el-checkbox 
              :model-value="row.isPurchased" 
              @change="shoppingStore.togglePurchased(row.id)" 
              size="large"
            />
          </template>
        </el-table-column>

        <el-table-column label="品項" min-width="150">
          <template #default="{ row }">
            <span :class="{ 'purchased-text': row.isPurchased }" class="item-name">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="數量" width="120">
          <template #default="{ row }">
            <span :class="{ 'purchased-text': row.isPurchased }">{{ row.quantity }} {{ row.unit }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <!-- 如果已勾選購買，顯示登記按鈕 -->
            <el-button 
              v-if="row.isPurchased" 
              type="success" 
              size="small" 
              plain 
              :icon="Upload"
              @click="openRegisterDialog(row)"
            >
              登記至庫存
            </el-button>
            <el-button type="danger" link @click="handleRemove(row.id)">刪除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="shoppingStore.items.length === 0" description="購物清單空空如也，快去新增吧！" :image-size="120" />
    </el-card>

    <!-- 登記至庫存彈窗 -->
    <el-dialog v-model="registerDialogVisible" title="登記至庫存" width="500px" align-center class="custom-app-dialog">
      <FoodForm 
        :initial-name="currentRegisterItem?.name" 
        :initial-quantity="currentRegisterItem?.quantity" 
        @submit="handleRegisterSubmit" 
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.shopping-container { width: 100%; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-header h2 { margin: 0 0 8px 0; color: var(--el-text-color-primary); }
.hint { color: var(--el-text-color-secondary); font-size: 14px; margin: 0; }
.add-card { margin-bottom: 24px; border-radius: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); }
.add-form { display: flex; align-items: center; gap: 16px; }
.input-name { flex: 1; }
.quantity-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.input-qty { width: 120px; }
.input-unit { width: 90px; }
.list-card { border-radius: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); }
.item-name { font-weight: 500; color: var(--el-text-color-primary); font-size: 15px; }
.purchased-text { text-decoration: line-through; color: var(--el-text-color-disabled); }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .add-form { flex-direction: column; align-items: stretch; }
  .quantity-group { justify-content: space-between; }
  .input-qty, .input-unit { flex: 1; }
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