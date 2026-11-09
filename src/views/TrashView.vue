<script setup>
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, RefreshLeft, WarningFilled, Box } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const inventoryStore = useInventoryStore()

// 取得回收桶列表並計算剩餘天數
const trashItems = computed(() => {
  return inventoryStore.deletedFoods.map(item => {
    // 計算從刪除到今天過了幾天
    const deletedDate = dayjs(item.deletedAt)
    const daysPassed = dayjs().diff(deletedDate, 'day')
    const daysLeft = 30 - daysPassed

    return {
      ...item,
      daysLeft: daysLeft > 0 ? daysLeft : 0
    }
  })
})

// 還原食材
function handleRestore(item) {
  inventoryStore.restoreFood(item.id)
  ElMessage.success(`已將「${item.name}」還原至庫存`)
}

// 永久刪除
function handlePermanentDelete(item) {
  ElMessageBox.confirm(
    `確定要永久刪除「${item.name}」嗎？此動作無法復原。`,
    '永久刪除',
    {
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消',
      type: 'error',
    }
  ).then(() => {
    inventoryStore.permanentlyDelete(item.id)
    ElMessage.warning('已永久刪除')
  }).catch(() => {})
}
</script>

<template>
  <div class="trash-container">
    <div class="page-header">
      <div>
        <h2>回收桶</h2>
        <p class="hint">誤刪的食材會保留 30 天，超過期限將自動永久清除</p>
      </div>
    </div>

    <!-- 空狀態 -->
    <el-empty 
      v-if="trashItems.length === 0" 
      description="回收桶是空的，沒有被刪除的食材。" 
      :image-size="150"
    >
      <el-icon size="60" color="var(--el-text-color-disabled)"><Box /></el-icon>
    </el-empty>

    <!-- 回收桶列表 -->
    <el-row v-else :gutter="20">
      <el-col 
        v-for="item in trashItems" 
        :key="item.id" 
        :xs="24" :sm="12" :md="8" :lg="6"
      >
        <el-card class="trash-card" shadow="hover">
          <div class="card-header">
            <span class="name">{{ item.name }}</span>
            <el-tag type="danger" effect="plain" size="small" v-if="item.daysLeft <= 5">
              剩 {{ item.daysLeft }} 天清除
            </el-tag>
            <el-tag type="info" effect="plain" size="small" v-else>
              保留 {{ item.daysLeft }} 天
            </el-tag>
          </div>

          <div class="card-info">
            <div class="info-row">
              <span class="label">數量</span>
              <span class="val">{{ item.quantity }} {{ item.unit }}</span>
            </div>
            <div class="info-row">
              <span class="label">期限</span>
              <span class="val">{{ item.expiry }}</span>
            </div>
            <div class="info-row">
              <span class="label">刪除時間</span>
              <span class="val">{{ dayjs(item.deletedAt).format('YYYY-MM-DD HH:mm') }}</span>
            </div>
          </div>

          <div class="card-actions">
            <el-button 
              type="success" 
              plain 
              size="small" 
              :icon="RefreshLeft" 
              @click="handleRestore(item)"
            >
              還原
            </el-button>
            <el-button 
              type="danger" 
              plain 
              size="small" 
              :icon="Delete" 
              @click="handlePermanentDelete(item)"
            >
              永久刪除
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.trash-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
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

/* 卡片樣式 */
.trash-card {
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  margin-bottom: 20px;
  opacity: 0.85;
  transition: opacity 0.3s, transform 0.3s;
}

.trash-card:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header .name {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  text-decoration: line-through; /* 刪除線表示已刪除 */
  opacity: 0.7;
}

.card-info {
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

.card-actions {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
  gap: 10px;
}

.card-actions .el-button {
  flex: 1;
  margin: 0;
}
</style>