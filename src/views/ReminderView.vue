<script setup>
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useSettingsStore } from '@/stores/settings'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Warning, Timer, Check, Close, Document } from '@element-plus/icons-vue'
import FoodDetailDialog from '@/components/food/FoodDetailDialog.vue'

const inventoryStore = useInventoryStore()
const settingsStore = useSettingsStore()
const router = useRouter()

// 詳情彈窗狀態
const detailVisible = ref(false)
const currentFood = ref(null)

// 分類整理食材
const expiredFoods = computed(() => 
  inventoryStore.activeFoods.filter(f => inventoryStore.getDaysLeft(f.expiry) < 0)
    .sort((a, b) => inventoryStore.getDaysLeft(a.expiry) - inventoryStore.getDaysLeft(b.expiry))
)

const todayFoods = computed(() => 
  inventoryStore.activeFoods.filter(f => inventoryStore.getDaysLeft(f.expiry) === 0)
)

const warningFoods = computed(() => 
  inventoryStore.activeFoods.filter(f => {
    const d = inventoryStore.getDaysLeft(f.expiry)
    return d > 0 && d <= settingsStore.reminderDays
  }).sort((a, b) => inventoryStore.getDaysLeft(a.expiry) - inventoryStore.getDaysLeft(b.expiry))
)

// 全部需要注意的總數
const totalUrgent = computed(() => expiredFoods.value.length + todayFoods.value.length + warningFoods.value.length)

// 打開詳情彈窗
function openDetail(food) {
  currentFood.value = food
  detailVisible.value = true
}

// 吃完
function handleEat(food) {
  inventoryStore.markAsEaten(food.id)
  ElMessage.success('已標記為吃完')
}

// 丟棄
function handleDiscard(food) {
  ElMessageBox.prompt(`請輸入「${food.name}」丟棄的數量（最多 ${food.quantity} ${food.unit}）`, '標記丟棄', {
    confirmButtonText: '確定丟棄', cancelButtonText: '取消',
    inputPattern: /^[1-9]\d*$/,
    inputErrorMessage: '請輸入大於 0 的整數',
    inputValidator: (val) => Number(val) <= food.quantity || `不能超過現有數量 ${food.quantity}`,
  }).then(({ value }) => {
    inventoryStore.markAsDiscarded(food.id, Number(value))
    ElMessage.warning('已記錄丟棄')
  }).catch(() => {})
}

function goToInventory() {
  router.push('/inventory')
}
</script>

<template>
  <div class="reminder-container">
    <div class="page-header">
      <div>
        <h2>到期提醒中心</h2>
        <p class="hint">管理所有過期與即將到期的食材，減少浪費</p>
      </div>
      <el-button type="primary" plain @click="goToInventory" icon="List">前往食材管理</el-button>
    </div>

    <!-- 統計摘要 -->
    <el-row :gutter="20" class="summary-row">
      <el-col :xs="24" :sm="8">
        <el-card shadow="hover" class="stat-card danger">
          <div class="stat-icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-info">
            <span class="label">已過期</span>
            <span class="value">{{ expiredFoods.length }} 項</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="hover" class="stat-card warning">
          <div class="stat-icon"><el-icon><Timer /></el-icon></div>
          <div class="stat-info">
            <span class="label">今天到期</span>
            <span class="value">{{ todayFoods.length }} 項</span>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="hover" class="stat-card primary">
          <div class="stat-icon"><el-icon><Bell /></el-icon></div>
          <div class="stat-info">
            <span class="label">即將到期 ({{ settingsStore.reminderDays }}天內)</span>
            <span class="value">{{ warningFoods.length }} 項</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 空狀態 -->
    <el-empty 
      v-if="totalUrgent === 0" 
      description="太棒了！目前冰箱裡沒有任何食材即將過期。" 
      :image-size="150"
    >
      <el-button type="primary" @click="goToInventory">去逛逛食材庫</el-button>
    </el-empty>

    <!-- 列表區域 -->
    <div v-else class="reminder-list">
      
      <!-- 1. 已過期區塊 -->
      <div v-if="expiredFoods.length > 0" class="section">
        <div class="section-title danger-title">
          <el-icon><Warning /></el-icon> 已過期食材 ({{ expiredFoods.length }})
        </div>
        <el-row :gutter="16">
          <el-col v-for="food in expiredFoods" :key="food.id" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="food-card status-danger" shadow="hover" :body-style="{ padding: '16px' }">
              <!-- 點擊卡片主體開啟詳情 -->
              <div class="clickable-area" @click="openDetail(food)">
                <div class="food-header">
                  <span class="name">{{ food.name }}</span>
                  <el-tag type="danger" effect="dark" size="small">已過期 {{ Math.abs(inventoryStore.getDaysLeft(food.expiry)) }} 天</el-tag>
                </div>
                <div class="food-info">
                  <span>數量：{{ food.quantity }} {{ food.unit }}</span>
                  <span>期限：{{ food.expiry }}</span>
                </div>
              </div>
              <div class="food-actions">
                <el-button type="primary" link size="small" :icon="Document" @click.stop="openDetail(food)">詳情</el-button>
                <el-button type="success" link size="small" :icon="Check" @click.stop="handleEat(food)">吃完</el-button>
                <el-button type="danger" link size="small" :icon="Close" @click.stop="handleDiscard(food)">丟棄</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 2. 今天到期區塊 -->
      <div v-if="todayFoods.length > 0" class="section">
        <div class="section-title warning-title">
          <el-icon><Timer /></el-icon> 今天到期 ({{ todayFoods.length }})
        </div>
        <el-row :gutter="16">
          <el-col v-for="food in todayFoods" :key="food.id" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="food-card status-warning" shadow="hover" :body-style="{ padding: '16px' }">
              <div class="clickable-area" @click="openDetail(food)">
                <div class="food-header">
                  <span class="name">{{ food.name }}</span>
                  <el-tag type="warning" effect="dark" size="small">今天到期</el-tag>
                </div>
                <div class="food-info">
                  <span>數量：{{ food.quantity }} {{ food.unit }}</span>
                  <span>期限：{{ food.expiry }}</span>
                </div>
              </div>
              <div class="food-actions">
                <el-button type="primary" link size="small" :icon="Document" @click.stop="openDetail(food)">詳情</el-button>
                <el-button type="success" link size="small" :icon="Check" @click.stop="handleEat(food)">吃完</el-button>
                <el-button type="danger" link size="small" :icon="Close" @click.stop="handleDiscard(food)">丟棄</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 3. 即將到期區塊 -->
      <div v-if="warningFoods.length > 0" class="section">
        <div class="section-title primary-title">
          <el-icon><Bell /></el-icon> 即將到期 ({{ warningFoods.length }})
        </div>
        <el-row :gutter="16">
          <el-col v-for="food in warningFoods" :key="food.id" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="food-card status-success" shadow="hover" :body-style="{ padding: '16px' }">
              <div class="clickable-area" @click="openDetail(food)">
                <div class="food-header">
                  <span class="name">{{ food.name }}</span>
                  <el-tag type="success" effect="dark" size="small">剩 {{ inventoryStore.getDaysLeft(food.expiry) }} 天</el-tag>
                </div>
                <div class="food-info">
                  <span>數量：{{ food.quantity }} {{ food.unit }}</span>
                  <span>期限：{{ food.expiry }}</span>
                </div>
              </div>
              <div class="food-actions">
                <el-button type="primary" link size="small" :icon="Document" @click.stop="openDetail(food)">詳情</el-button>
                <el-button type="success" link size="small" :icon="Check" @click.stop="handleEat(food)">吃完</el-button>
                <el-button type="danger" link size="small" :icon="Close" @click.stop="handleDiscard(food)">丟棄</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

    </div>

    <!-- 食品詳情彈窗 -->
    <FoodDetailDialog v-model:visible="detailVisible" :food="currentFood" />
  </div>
</template>

<style scoped>
.reminder-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
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
.summary-row {
  margin-bottom: 30px;
}

.stat-card {
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
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
  font-size: 20px;
  font-weight: bold;
}

/* 卡片顏色變化 */
.stat-card.danger .stat-icon { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
.stat-card.danger .value { color: var(--el-color-danger); }
.stat-card.warning .stat-icon { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
.stat-card.warning .value { color: var(--el-color-warning); }
.stat-card.primary .stat-icon { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
.stat-card.primary .value { color: var(--el-color-primary); }

/* 列表區塊 */
.section {
  margin-bottom: 30px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 4px solid transparent;
}

.danger-title { color: var(--el-color-danger); border-left-color: var(--el-color-danger); }
.warning-title { color: var(--el-color-warning); border-left-color: var(--el-color-warning); }
.primary-title { color: var(--el-color-primary); border-left-color: var(--el-color-primary); }

/* 食材卡片 */
.food-card {
  border-radius: 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  margin-bottom: 16px;
  transition: transform 0.2s;
}

.food-card:hover {
  transform: translateY(-2px);
}

/* 點擊區域 */
.clickable-area {
  cursor: pointer;
  margin-bottom: 12px;
}

.food-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.food-header .name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.food-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.food-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
}

/* 左側邊框顏色提示 */
.status-danger { border-left: 4px solid var(--el-color-danger); }
.status-warning { border-left: 4px solid var(--el-color-warning); }
.status-success { border-left: 4px solid var(--el-color-success); }
</style>