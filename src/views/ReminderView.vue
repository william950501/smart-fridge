<script setup>
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useSettingsStore } from '@/stores/settings'
import { useRecipeStore } from '@/stores/recipe'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Warning, Timer, Check, Close, Document, CircleCheckFilled, WarningFilled, Calendar, Delete } from '@element-plus/icons-vue'
import FoodDetailDialog from '@/components/food/FoodDetailDialog.vue'
import SmartEmpty from '@/components/empty/SmartEmpty.vue'
import dayjs from 'dayjs'

const inventoryStore = useInventoryStore()
const settingsStore = useSettingsStore()
const recipeStore = useRecipeStore()
const router = useRouter()

// 詳情彈窗
const detailVisible = ref(false)
const currentFood = ref(null)

// 吃完確認彈窗
const eatDialogVisible = ref(false)
const eatTarget = ref(null)

// 丟棄彈窗
const discardDialogVisible = ref(false)
const discardTarget = ref(null)
const discardQuantity = ref(1)

// =========================================
// 資料分類整理
// =========================================
const expiredFoods = computed(() => 
  inventoryStore.activeFoods.filter(f => inventoryStore.getDaysLeft(f.expiry, f.isOpened, f.openedExpiry) < 0)
    .sort((a, b) => inventoryStore.getDaysLeft(a.expiry, a.isOpened, a.openedExpiry) - inventoryStore.getDaysLeft(b.expiry, b.isOpened, b.openedExpiry))
)

const todayFoods = computed(() => 
  inventoryStore.activeFoods.filter(f => inventoryStore.getDaysLeft(f.expiry, f.isOpened, f.openedExpiry) === 0)
)

const warningFoods = computed(() => 
  inventoryStore.activeFoods.filter(f => {
    const d = inventoryStore.getDaysLeft(f.expiry, f.isOpened, f.openedExpiry)
    const threshold = settingsStore.getReminderDaysFor(f.category)
    return d > 0 && d <= threshold
  }).sort((a, b) => inventoryStore.getDaysLeft(a.expiry, a.isOpened, a.openedExpiry) - inventoryStore.getDaysLeft(b.expiry, b.isOpened, b.openedExpiry))
)

const totalUrgent = computed(() => expiredFoods.value.length + todayFoods.value.length + warningFoods.value.length)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = dayjs(dateStr)
  const today = dayjs().startOf('day')
  const diff = date.diff(today, 'day')
  
  const formatted = date.format('MM月DD日')
  if (diff === 0) return `${formatted} (今天)`
  if (diff === 1) return `${formatted} (明天)`
  if (diff === -1) return `${formatted} (昨天)`
  return formatted
}

// =========================================
// 操作
// =========================================
function openDetail(food) {
  currentFood.value = food
  detailVisible.value = true
}

function goToRecipe(foodName) {
  router.push({ path: '/recipe', query: { food: foodName } })
}

function addToMealPlan(food) {
  let targetDay = null
  let targetMeal = null
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  for (let day of days) {
    const dayPlan = recipeStore.mealPlan[day]
    if (!dayPlan) continue
    if (!dayPlan.dinner) { targetDay = day; targetMeal = 'dinner'; break }
    if (!dayPlan.lunch) { targetDay = day; targetMeal = 'lunch'; break }
  }

  if (!targetDay) {
    return ElMessage.warning('本週菜單已滿，請先清空部分餐點')
  }

  const recommendations = recipeStore.getRecommendations().filter(r => 
    r.isSafe && r.ingredients.includes(food.name)
  )

  if (recommendations.length === 0) {
    return ElMessage.info(`目前找不到適合用到「${food.name}」的食譜，請前往食譜頁面查看。`)
  }

  const bestRecipe = recommendations[0]
  recipeStore.setMeal(targetDay, targetMeal, bestRecipe)
  
  const dayNames = { Monday: '一', Tuesday: '二', Wednesday: '三', Thursday: '四', Friday: '五', Saturday: '六', Sunday: '日' }
  ElMessage.success(`已將「${bestRecipe.name}」排入週${dayNames[targetDay]}的${targetMeal === 'lunch' ? '午餐' : '晚餐'}`)
}

function openEatDialog(food) {
  eatTarget.value = food
  eatDialogVisible.value = true
}

function confirmEat() {
  if (!eatTarget.value) return
  inventoryStore.markAsEaten(eatTarget.value.id)
  ElMessage.success(`已將「${eatTarget.value.name}」標記為吃完`)
  eatDialogVisible.value = false
  eatTarget.value = null
}

function openDiscardDialog(food) {
  discardTarget.value = food
  discardQuantity.value = 1
  discardDialogVisible.value = true
}

function confirmDiscard() {
  if (!discardTarget.value) return
  if (discardQuantity.value < 1) return ElMessage.warning('丟棄數量必須大於 0')
  if (discardQuantity.value > discardTarget.value.quantity) {
    return ElMessage.warning(`不能超過現有數量 ${discardTarget.value.quantity}`)
  }
  
  inventoryStore.markAsDiscarded(discardTarget.value.id, discardQuantity.value)
  ElMessage.warning(`已將「${discardTarget.value.name}」丟棄 ${discardQuantity.value} ${discardTarget.value.unit}`)
  discardDialogVisible.value = false
  discardTarget.value = null
}

function batchDiscardExpired() {
  if (expiredFoods.value.length === 0) return
  ElMessageBox.confirm(
    `確定要將 ${expiredFoods.value.length} 樣已過期的食材全部丟棄嗎？這會將它們移至回收桶。`,
    '一鍵清理',
    { confirmButtonText: '確定丟棄', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    expiredFoods.value.forEach(food => {
      inventoryStore.markAsDiscarded(food.id, food.quantity)
    })
    ElMessage.success(`已將 ${expiredFoods.value.length} 樣過期食材移至回收桶`)
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
      <el-button class="btn-outline" @click="goToInventory" :icon="Document">前往食材管理</el-button>
    </div>

    <!-- 統計摘要 -->
    <div class="summary-row" data-tour="reminder-summary">
      <div class="stat-card danger">
        <div class="stat-icon"><el-icon><Warning /></el-icon></div>
        <div class="stat-info">
          <span class="label">已過期</span>
          <span class="value">{{ expiredFoods.length }} <small>項</small></span>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon"><el-icon><Timer /></el-icon></div>
        <div class="stat-info">
          <span class="label">今天到期</span>
          <span class="value">{{ todayFoods.length }} <small>項</small></span>
        </div>
      </div>
      <div class="stat-card primary">
        <div class="stat-icon"><el-icon><Bell /></el-icon></div>
        <div class="stat-info">
          <span class="label">即將到期</span>
          <span class="value">{{ warningFoods.length }} <small>項</small></span>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <SmartEmpty 
      v-if="totalUrgent === 0" 
      type="reminder"
      @primary="goToInventory"
    />

    <!-- 三色時間軸主體 -->
    <div v-else class="timeline-wrapper">
      
      <!-- 1. 已過期區塊 -->
      <div v-if="expiredFoods.length > 0" class="timeline-section">
        <div class="timeline-line"></div>
        <div class="timeline-node node-danger"></div>
        <div class="timeline-content">
          <div class="section-header">
            <div class="title-left danger-text">
              <el-icon><Warning /></el-icon>
              <span>已過期 ({{ expiredFoods.length }})</span>
            </div>
            <el-button type="danger" plain size="small" :icon="Delete" @click="batchDiscardExpired">一鍵清理</el-button>
          </div>
          
          <div class="food-grid">
            <div v-for="food in expiredFoods" :key="food.id" class="food-card card-danger">
              <div class="clickable-area" @click="openDetail(food)">
                <div class="card-top">
                  <span class="name" :title="food.name">{{ food.name }}</span>
                  <el-tag type="danger" effect="light" size="small" round>過期 {{ Math.abs(inventoryStore.getDaysLeft(food.expiry, food.isOpened, food.openedExpiry)) }} 天</el-tag>
                </div>
                <div class="card-info">
                  <span>數量：{{ food.quantity }} {{ food.unit }}</span>
                  <span>期限：{{ formatDate(inventoryStore.getDisplayExpiry(food)) }} <el-tag v-if="food.isOpened" size="small" type="warning" effect="plain" round>已開封</el-tag></span>
                </div>
              </div>
              <div class="action-grid">
                <el-button type="primary" plain size="small" :icon="Document" @click.stop="openDetail(food)">詳情</el-button>
                <el-button type="success" plain size="small" :icon="Check" @click.stop="openEatDialog(food)">吃完</el-button>
                <el-button type="danger" plain size="small" :icon="Close" @click.stop="openDiscardDialog(food)">丟棄</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 今天到期區塊 -->
      <div v-if="todayFoods.length > 0" class="timeline-section">
        <div class="timeline-line"></div>
        <div class="timeline-node node-warning"></div>
        <div class="timeline-content">
          <div class="section-header">
            <div class="title-left warning-text">
              <el-icon><Timer /></el-icon>
              <span>今天到期 ({{ todayFoods.length }})</span>
            </div>
          </div>
          
          <div class="food-grid">
            <div v-for="food in todayFoods" :key="food.id" class="food-card card-warning highlight-warning">
              <div class="clickable-area" @click="openDetail(food)">
                <div class="card-top">
                  <span class="name" :title="food.name">{{ food.name }}</span>
                  <el-tag type="warning" effect="dark" size="small" round>今天到期</el-tag>
                </div>
                <div class="card-info">
                  <span>數量：{{ food.quantity }} {{ food.unit }}</span>
                  <span>期限：{{ formatDate(inventoryStore.getDisplayExpiry(food)) }} <el-tag v-if="food.isOpened" size="small" type="warning" effect="plain" round>已開封</el-tag></span>
                </div>
              </div>
              <div class="action-grid four-cols">
                <el-button type="primary" plain size="small" :icon="Document" @click.stop="openDetail(food)">詳情</el-button>
                <el-button type="warning" plain size="small" :icon="Calendar" @click.stop="addToMealPlan(food)">排餐</el-button>
                <el-button type="success" plain size="small" :icon="Check" @click.stop="openEatDialog(food)">吃完</el-button>
                <el-button type="danger" plain size="small" :icon="Close" @click.stop="openDiscardDialog(food)">丟棄</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. 即將到期區塊 -->
      <div v-if="warningFoods.length > 0" class="timeline-section">
        <div class="timeline-line"></div>
        <div class="timeline-node node-primary"></div>
        <div class="timeline-content">
          <div class="section-header">
            <div class="title-left primary-text">
              <el-icon><Bell /></el-icon>
              <span>即將到期 ({{ warningFoods.length }})</span>
            </div>
          </div>
          
          <div class="food-grid">
            <div v-for="food in warningFoods" :key="food.id" class="food-card card-primary">
              <div class="clickable-area" @click="openDetail(food)">
                <div class="card-top">
                  <span class="name" :title="food.name">{{ food.name }}</span>
                  <el-tag type="success" effect="light" size="small" round>剩 {{ inventoryStore.getDaysLeft(food.expiry, food.isOpened, food.openedExpiry) }} 天</el-tag>
                </div>
                <div class="card-info">
                  <span>數量：{{ food.quantity }} {{ food.unit }}</span>
                  <span>期限：{{ formatDate(inventoryStore.getDisplayExpiry(food)) }} <el-tag v-if="food.isOpened" size="small" type="warning" effect="plain" round>已開封</el-tag></span>
                </div>
              </div>
              <div class="action-grid four-cols">
                <el-button type="primary" plain size="small" :icon="Document" @click.stop="openDetail(food)">詳情</el-button>
                <el-button type="warning" plain size="small" :icon="Calendar" @click.stop="addToMealPlan(food)">排餐</el-button>
                <el-button type="success" plain size="small" :icon="Check" @click.stop="openEatDialog(food)">吃完</el-button>
                <el-button type="danger" plain size="small" :icon="Close" @click.stop="openDiscardDialog(food)">丟棄</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 時間軸末端 -->
      <div class="timeline-end"></div>
    </div>

    <!-- 食品詳情彈窗 -->
    <FoodDetailDialog v-model:visible="detailVisible" :food="currentFood" />

    <!-- 吃完確認彈窗 -->
    <el-dialog v-model="eatDialogVisible" title="確認吃完" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center" v-if="eatTarget">
        <el-icon size="56" color="var(--sage)" style="margin-bottom: 16px;"><CircleCheckFilled /></el-icon>
        <p class="dialog-title">要將「{{ eatTarget.name }}」標記為吃完嗎？</p>
        <p class="dialog-subtitle">這會將該食材從庫存中移除，並記錄為已食用，不計入浪費金額。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="eatDialogVisible = false">取消</el-button>
          <el-button type="success" @click="confirmEat">確定吃完</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 丟棄食材彈窗 -->
    <el-dialog v-model="discardDialogVisible" title="丟棄食材" width="400px" align-center class="custom-app-dialog">
      <div class="discard-dialog-content" v-if="discardTarget">
        <el-icon size="56" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
        <h3 class="discard-title">確定要丟棄「{{ discardTarget.name }}」嗎？</h3>
        <p class="discard-subtitle">目前庫存：{{ discardTarget.quantity }} {{ discardTarget.unit }}</p>
        
        <div class="quantity-input-group">
          <span class="label">丟棄數量：</span>
          <el-input-number v-model="discardQuantity" :min="1" :max="discardTarget.quantity" :step="1" size="large" />
          <span class="unit">{{ discardTarget.unit }}</span>
        </div>

        <div class="discard-hint">
          <el-alert title="丟棄後將計入本月浪費金額。若全部丟棄會移至回收桶，30 天內皆可還原。" type="warning" show-icon :closable="false" />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="discardDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmDiscard">確定丟棄</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.reminder-container { width: 100%; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3); }
.page-header h2 { margin: 0 0 8px 0; font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }

.btn-outline {
  background: transparent !important;
  border: 1px solid var(--border) !important;
  color: var(--ink) !important;
  transition: border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast);
}
.btn-outline:hover { border-color: var(--accent) !important; color: var(--accent) !important; background: var(--accent-light) !important; }

/* =========================================
   頂部統計摘要
   ========================================= */
.summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
.stat-card { border-radius: var(--radius-lg); border: 1px solid var(--border-light); display: flex; align-items: center; padding: var(--space-4); background: var(--surface); gap: var(--space-4); }
.stat-icon { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 24px; }
.stat-info { display: flex; flex-direction: column; }
.stat-info .label { font-size: var(--text-sm); color: var(--muted); margin-bottom: 4px; }
.stat-info .value { font-size: var(--text-xl); font-weight: 700; font-family: var(--font-display); }
.stat-info .value small { font-size: var(--text-sm); font-weight: 500; }
.stat-card.danger .stat-icon { background: var(--el-color-danger-light-9); color: var(--danger); }
.stat-card.danger .value { color: var(--danger); }
.stat-card.warning .stat-icon { background: var(--el-color-warning-light-9); color: var(--warning); }
.stat-card.warning .value { color: var(--warning); }
.stat-card.primary .stat-icon { background: var(--accent-light); color: var(--accent); }
.stat-card.primary .value { color: var(--accent); }

/* =========================================
   三色時間軸
   ========================================= */
.timeline-wrapper { position: relative; padding-left: 32px; margin-bottom: var(--space-8); }
.timeline-line {
  position: absolute; left: 11px; top: 10px; bottom: -30px;
  width: 2px; background: var(--border-light); z-index: 1; transform: translateX(-50%);
}
.timeline-wrapper > .timeline-section:last-of-type .timeline-line { display: none; }
.timeline-node {
  position: absolute; left: 11px; top: 6px; width: 16px; height: 16px;
  border-radius: 50%; border: 3px solid var(--surface); box-sizing: border-box;
  z-index: 2; box-shadow: 0 0 0 1px var(--border-light); transform: translateX(-50%);
}
.node-danger { background: var(--danger); }
.node-warning { background: var(--warning); }
.node-primary { background: var(--accent); }
.timeline-section { position: relative; margin-bottom: var(--space-6); }
.timeline-content { padding-left: 8px; }

/* 區塊標題 */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); min-height: 32px; }
.title-left { display: flex; align-items: center; gap: 8px; font-size: var(--text-lg); font-family: var(--font-display); font-weight: 700; }
.danger-text { color: var(--danger); }
.warning-text { color: var(--warning); }
.primary-text { color: var(--accent); }

/* =========================================
   食材卡片網格
   ========================================= */
.food-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); }
.food-card {
  background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  display: flex; flex-direction: column; overflow: hidden;
}
.food-card:hover { border-color: var(--border); box-shadow: var(--shadow-sm); }
.food-card.highlight-warning { background: var(--el-color-warning-light-9); border-color: var(--el-color-warning-light-5); }

/* 卡片左側狀態色條 */
.card-danger { border-left: 4px solid var(--danger); }
.card-warning { border-left: 4px solid var(--warning); }
.card-primary { border-left: 4px solid var(--accent); }

.clickable-area { padding: var(--space-4); cursor: pointer; flex: 1; display: flex; flex-direction: column; gap: var(--space-3); }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.card-top .name { font-size: var(--text-base); font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.card-info { display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--text-sm); color: var(--muted); }
.card-info span { display: flex; align-items: center; gap: 6px; }

/* 🌟 重構操作按鈕：徹底解決爆版 */
.action-grid {
  display: flex; /* 改為 Flex，自動平分 */
  gap: 8px;
  border-top: 1px solid var(--border-light);
  padding: var(--space-3);
  background: var(--ground);
}
.action-grid .el-button {
  flex: 1; /* 平分寬度 */
  margin: 0 !important;
  height: 32px;
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-sm);
  padding: 0 4px;
  white-space: nowrap;
}

/* 覆蓋 Element Plus 按鈕樣式 */
.action-grid .el-button--primary.is-plain { color: var(--accent) !important; border-color: var(--accent) !important; background: var(--surface) !important; }
.action-grid .el-button--warning.is-plain { color: var(--warning) !important; border-color: var(--warning) !important; background: var(--surface) !important; }
.action-grid .el-button--success.is-plain { color: var(--sage) !important; border-color: var(--sage) !important; background: var(--surface) !important; }
.action-grid .el-button--danger.is-plain { color: var(--danger) !important; border-color: var(--danger) !important; background: var(--surface) !important; }

/* 時間軸末端圓點 */
.timeline-end { position: absolute; left: 11px; bottom: 0; width: 8px; height: 8px; border-radius: 50%; background: var(--border); transform: translateX(-50%); }

/* 彈窗共用 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: var(--space-4); width: 100%; }
.dialog-footer .el-button { width: 120px; }

/* 丟棄彈窗 */
.discard-dialog-content { text-align: center; padding: 10px 0; }
.discard-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.discard-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; }
.quantity-input-group { display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 20px; }
.quantity-input-group .label { font-size: var(--text-base); color: var(--ink); font-weight: 500; }
.quantity-input-group .unit { font-size: var(--text-base); color: var(--muted); }
.discard-hint { text-align: left; }

/* =========================================
   📱 手機端專屬自適應
   ========================================= */
@media (max-width: 768px) {
  .summary-row { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .food-grid { grid-template-columns: 1fr; }
  
  /* 1. 手機端徹底隱藏時間軸線條與圓點，節省寬度 */
  .timeline-wrapper { padding-left: 0; margin-bottom: 0; }
  .timeline-line, .timeline-node, .timeline-end { display: none; }
  .timeline-content { padding-left: 0; }
  
  /* 2. 卡片按鈕在手機端平均分配 */
  .action-grid .el-button {
    height: 36px;
    font-size: 12px;
  }

  /* 3. 區塊標題微調 */
  .title-left { font-size: var(--text-base); }
}
</style>

<style>
.custom-app-dialog { 
  --el-dialog-bg-color: var(--surface); 
  --el-dialog-border-radius: var(--radius-lg); 
  --el-dialog-padding-primary: 24px; 
}
.custom-app-dialog .el-dialog__header { 
  margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light); 
  padding-bottom: 16px; margin-bottom: 16px; 
}
.custom-app-dialog .el-dialog__title { 
  font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); 
}
</style>