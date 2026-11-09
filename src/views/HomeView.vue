<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'

const router = useRouter()
const inventoryStore = useInventoryStore()

// 模擬載入狀態 (骨架屏)
const loading = ref(true)

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 600) // 模擬 0.6 秒的載入時間
})

function goToInventory() {
  router.push('/inventory')
}
</script>

<template>
  <div class="dashboard-container">
    <h2 class="page-title">儀表板</h2>

    <!-- 骨架屏 -->
    <el-skeleton :loading="loading" animated :count="4">
      <template #template>
        <el-row :gutter="20" class="stat-row">
          <el-col :xs="24" :sm="12" :md="6" v-for="i in 4" :key="i" class="stat-col">
            <el-card shadow="hover" class="stat-card">
              <el-skeleton-item variant="text" style="width: 50%; margin: 0 auto 10px;" />
              <el-skeleton-item variant="h3" style="width: 30%; margin: 0 auto;" />
            </el-card>
          </el-col>
        </el-row>
      </template>

      <template #default>
        <!-- 統計卡片 -->
        <el-row :gutter="20" class="stat-row">
          <el-col :xs="24" :sm="12" :md="6" class="stat-col">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">總食材品項</div>
              <div class="stat-value">{{ inventoryStore.totalCount }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" class="stat-col">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">即將到期</div>
              <div class="stat-value warning">{{ inventoryStore.expiringSoonCount }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" class="stat-col">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">已過期</div>
              <div class="stat-value danger">{{ inventoryStore.expiredCount }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" class="stat-col">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-label">新鮮食材</div>
              <div class="stat-value success">{{ inventoryStore.freshCount }}</div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 需要注意的食材 -->
        <el-card shadow="never" class="urgent-card">
          <template #header>
            <div class="card-header">
              <span>需要注意的食材</span>
              <el-button link type="primary" @click="goToInventory">前往食材管理 →</el-button>
            </div>
          </template>

          <el-empty v-if="inventoryStore.urgentFoods.length === 0" description="目前沒有即將到期的食材，很棒！" />

          <el-row v-else :gutter="20" class="food-row">
            <el-col
              v-for="food in inventoryStore.urgentFoods"
              :key="food.id"
              :xs="24" :sm="12" :md="8" :lg="6"
              class="food-col"
            >
              <div class="food-card" :class="`status-${inventoryStore.getStatus(food.expiry)}`">
                <div class="food-header">
                  <span class="food-name">{{ food.name }}</span>
                  <el-tag :type="inventoryStore.getStatus(food.expiry)" size="small" effect="dark">
                    {{ inventoryStore.getStatusText(food.expiry) }}
                  </el-tag>
                </div>
                <div class="food-meta">{{ food.location || '冰箱' }} ・ {{ food.category }} ・ {{ food.quantity }} {{ food.unit }}</div>
                <div class="food-expiry">保存期限：{{ food.expiry }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.dashboard-container { width: 100%; }
.page-title { margin: 0 0 24px 0; color: var(--el-text-color-primary); }
.stat-row { display: flex; flex-wrap: wrap; }
.stat-col { display: flex; margin-bottom: 20px; }
.stat-card { width: 100%; text-align: center; border-radius: 12px; background-color: var(--el-bg-color); border: 1px solid var(--el-border-color-light); }
.stat-label { font-size: 15px; color: var(--el-text-color-secondary); margin-bottom: 12px; font-weight: 500; }
.stat-value { font-size: 36px; font-weight: bold; color: var(--el-text-color-primary); line-height: 1; animation: popIn 0.5s ease-out; }
@keyframes popIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.stat-value.warning { color: var(--el-color-warning); }
.stat-value.danger { color: var(--el-color-danger); }
.stat-value.success { color: var(--el-color-success); }
.card-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; color: var(--el-text-color-primary); }
.urgent-card { border-radius: 12px; background-color: var(--el-bg-color); border: 1px solid var(--el-border-color-light); }
.food-row { display: flex; flex-wrap: wrap; }
.food-col { display: flex; margin-bottom: 16px; }
.food-card { width: 100%; display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 8px; border-left: 4px solid var(--el-border-color); background: var(--el-fill-color-light); transition: all 0.3s; }
.food-card.status-warning { border-left-color: var(--el-color-warning); background: var(--el-color-warning-light-9); }
.food-card.status-danger { border-left-color: var(--el-color-danger); background: var(--el-color-danger-light-9); }
.food-card.status-success { border-left-color: var(--el-color-success); background: var(--el-color-success-light-9); }
.food-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.food-name { font-size: 16px; font-weight: 600; color: var(--el-text-color-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.food-meta { font-size: 14px; color: var(--el-text-color-regular); }
.food-expiry { font-size: 13px; color: var(--el-text-color-secondary); margin-top: auto; }
</style>