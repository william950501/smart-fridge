<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useShoppingStore } from '@/stores/shopping'

const route = useRoute()
const router = useRouter()
const shoppingStore = useShoppingStore()

const form = reactive({ name: '', quantity: 1, unit: '個' })
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升']

// 用於自動聚焦輸入框
const inputRef = ref(null)

// 監聽路由參數，如果是從「新增選單」點擊加購物車，自動聚焦
watch(() => route.query.action, (action) => {
  if (action === 'add') {
    // 延遲一點點讓頁面渲染完畢後再聚焦
    setTimeout(() => {
      inputRef.value?.focus()
      ElMessage.info('請輸入要加入購物清單的品項')
    }, 300)
    // 清除 URL 參數
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
  
  // 重置表單並重新聚焦
  form.name = ''
  form.quantity = 1
  form.unit = '個'
  inputRef.value?.focus()
}

function handleRemove(id) {
  shoppingStore.removeItem(id)
}
</script>

<template>
  <div class="shopping-container">
    <div class="page-header">
      <div>
        <h2>家庭購物清單</h2>
        <p class="hint">與家人共享採買清單，避免重複購買</p>
      </div>
      <div class="summary">
        <el-tag type="warning" effect="dark" size="large">待購買：{{ shoppingStore.pendingCount }}</el-tag>
        <el-tag type="success" effect="dark" size="large" style="margin-left: 12px;">已購買：{{ shoppingStore.purchasedCount }}</el-tag>
      </div>
    </div>

    <!-- 快速新增區塊 (優化手機版排版) -->
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

    <!-- 清單列表 -->
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

        <el-table-column prop="addedBy" label="新增者" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ row.addedBy }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link @click="handleRemove(row.id)">刪除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="shoppingStore.items.length === 0" description="購物清單空空如也，快去新增吧！" :image-size="120" />
    </el-card>
  </div>
</template>

<style scoped>
.shopping-container {
  width: 100%;
  max-width: 900px;
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

.add-card {
  margin-bottom: 24px;
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
}

.add-form {
  display: flex;
  align-items: center;
  gap: 16px;
}

.input-name {
  flex: 1;
}

.quantity-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.input-qty {
  width: 120px;
}

.input-unit {
  width: 90px;
}

.list-card {
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
}

.item-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 15px;
}

.purchased-text {
  text-decoration: line-through;
  color: var(--el-text-color-disabled);
}

/* 手機版排版優化 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .add-form {
    flex-direction: column;
    align-items: stretch;
  }

  .quantity-group {
    justify-content: space-between;
  }

  .input-qty {
    flex: 1;
  }

  .input-unit {
    flex: 1;
  }
}
</style>