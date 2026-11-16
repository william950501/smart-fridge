<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { useAnalyticsStore } from '@/stores/analytics'
import { useFamilyStore } from '@/stores/family'
import { ArrowRight, Warning, Timer, Refrigerator, Wallet, TrendCharts, UserFilled, MagicStick } from '@element-plus/icons-vue'

const router = useRouter()
const inventoryStore = useInventoryStore()
const authStore = useAuthStore()
const analyticsStore = useAnalyticsStore()
const familyStore = useFamilyStore()

const now = ref(new Date())
let timer = null

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 60000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// =========================================
// 頂部問候語與日期
// =========================================
const greeting = computed(() => {
  const hour = now.value.getHours()
  const name = authStore.user?.name || '使用者'
  if (hour >= 5 && hour < 12) return `早安，${name}`
  if (hour >= 12 && hour < 18) return `午安，${name}`
  return `晚安，${name}`
})

const todayDate = computed(() => {
  const options = { month: 'long', day: 'numeric', weekday: 'long' }
  return now.value.toLocaleDateString('zh-TW', options)
})

// =========================================
// 資料串接
// =========================================
const loading = ref(true)
onMounted(() => {
  setTimeout(() => { loading.value = false }, 400)
})

const recentLogs = computed(() => familyStore.dynamicLog.slice(0, 3))
const priorityItems = computed(() => analyticsStore.urgentHighValueItems.slice(0, 2))

function goToInventoryWithFilter(status) {
  if (status === 'all') router.push('/inventory')
  else router.push({ path: '/inventory', query: { status } })
}

function goToInventory() {
  router.push('/inventory')
}

function goToFoodDetail(foodName) {
  router.push({ path: '/inventory', query: { search: foodName } })
}

function goToAnalytics() {
  router.push('/analytics')
}

function goToFamily() {
  router.push('/family')
}
</script>

<template>
  <div class="dashboard-container">
    <!-- 頂部標題區 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">{{ greeting }}</h1>
        <p class="page-date">{{ todayDate }} ・ 今天想煮點什麼嗎？</p>
      </div>
      <el-button class="btn-outline desktop-only" @click="goToInventory" :icon="Refrigerator">前往食材管理</el-button>
    </div>

    <!-- 高價值即期警示條 -->
    <div v-if="priorityItems.length > 0" class="priority-alert">
      <div class="alert-content">
        <el-icon class="alert-icon"><Warning /></el-icon>
        <div class="alert-text">
          <strong>優先處理提醒</strong>
          <span>冰箱內有高價值且即將到期的食材，建議盡快食用。</span>
        </div>
      </div>
      <div class="alert-items">
        <el-tag 
          v-for="item in priorityItems" 
          :key="item.id" 
          type="danger" 
          effect="plain" 
          round
          class="alert-tag"
          @click="goToFoodDetail(item.name)"
        >
          {{ item.name }} ({{ item.days < 0 ? '已過期' : `剩 ${item.days} 天` }})
        </el-tag>
      </div>
    </div>

    <!-- Bento Grid 排版 -->
    <el-skeleton :loading="loading" animated :count="4">
      <template #template>
        <div class="bento-grid">
          <div v-for="i in 4" :key="i" class="bento-card skeleton-card">
            <el-skeleton-item variant="text" style="width: 50%; margin-bottom: 12px;" />
            <el-skeleton-item variant="h1" style="width: 30%;" />
          </div>
        </div>
      </template>

      <template #default>
        <div class="bento-grid">
          
          <!-- 卡片 1：即將到期 (佔 2 格寬) -->
          <div class="bento-card card-warning" @click="goToInventoryWithFilter('expiring')">
            <div class="card-header-row">
              <div class="card-label">即將到期</div>
              <div class="card-icon"><el-icon><Timer /></el-icon></div>
            </div>
            <div class="card-value">{{ inventoryStore.expiringSoonCount }}</div>
            <div class="card-hint">立即處理 <el-icon><ArrowRight /></el-icon></div>
          </div>

          <!-- 卡片 2：本月節省 -->
          <div class="bento-card card-saved" @click="goToAnalytics">
            <div class="card-header-row">
              <div class="card-label">本月節省</div>
              <div class="card-icon"><el-icon><Wallet /></el-icon></div>
            </div>
            <div class="card-value">${{ analyticsStore.totalSavedAmount }}</div>
            <div class="card-hint">觀看分析 <el-icon><ArrowRight /></el-icon></div>
          </div>

          <!-- 卡片 3：總食材 -->
          <div class="bento-card card-total" @click="goToInventoryWithFilter('all')">
            <div class="card-label">總食材品項</div>
            <div class="card-value">{{ inventoryStore.totalCount }}</div>
            <div class="card-hint">查看全部 <el-icon><ArrowRight /></el-icon></div>
          </div>

          <!-- 卡片 5：已過期 (佔 1 格) -->
          <div class="bento-card card-danger" @click="goToInventoryWithFilter('expired')">
            <div class="card-label">已過期</div>
            <div class="card-value">{{ inventoryStore.expiredCount }}</div>
            <div class="card-hint">查看過期品 <el-icon><ArrowRight /></el-icon></div>
          </div>

          <!-- 卡片 4：家庭動態 (佔 2 格寬) -->
          <div class="bento-card card-family" @click="goToFamily">
            <div class="card-header-row">
              <div class="card-label">家庭動態</div>
              <div class="card-icon"><el-icon><UserFilled /></el-icon></div>
            </div>
            <div class="family-logs">
              <div v-if="recentLogs.length === 0" class="empty-log">目前沒有動態</div>
              <div v-for="log in recentLogs" :key="log.id" class="log-item">
                <span class="log-user">{{ log.memberName }}</span>
                <span class="log-action">{{ log.action }}了</span>
                <span class="log-target">「{{ log.target }}」</span>
              </div>
            </div>
            <div class="card-hint">查看家庭 <el-icon><ArrowRight /></el-icon></div>
          </div>

        </div>

        <!-- 需要注意的食材列表 -->
        <el-card shadow="never" class="urgent-card">
          <template #header>
            <div class="list-header">
              <span class="title">需要注意的食材</span>
              <el-button link type="primary" @click="goToInventory">查看全部 →</el-button>
            </div>
          </template>

          <div v-if="inventoryStore.urgentFoods.length === 0" class="empty-urgent">
            <el-icon size="32" color="var(--sage)"><MagicStick /></el-icon>
            <p>目前沒有即將到期的食材，冰箱狀況良好！</p>
            <el-button type="primary" plain @click="goToInventory">去逛逛食材庫</el-button>
          </div>

          <div v-else class="food-grid">
            <div
              v-for="food in inventoryStore.urgentFoods"
              :key="food.id"
              class="food-card" 
              :class="`status-${inventoryStore.getStatus(food)}`" 
              @click="goToFoodDetail(food.name)"
            >
              <div class="food-header">
                <span class="food-name">{{ food.name }}</span>
                <el-tag :type="inventoryStore.getStatus(food)" size="small" effect="light" round>
                  {{ inventoryStore.getStatusText(food) }}
                </el-tag>
              </div>
              
              <div class="food-meta">
                <span>{{ food.category }}</span>
                <span class="dot">・</span>
                <span>{{ food.quantity }} {{ food.unit }}</span>
              </div>
              
              <div class="food-expiry-row">
                <span class="expiry-text">{{ inventoryStore.getDisplayExpiry(food) }}</span>
                <el-tag v-if="food.isOpened" size="small" type="warning" effect="plain" round>已開封</el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.dashboard-container { width: 100%; max-width: 1000px; margin: 0 auto; }

/* 標題區 */
.page-header {
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);
}
.page-title { 
  margin: 0 0 var(--space-2) 0; 
  font-size: var(--text-2xl); 
  font-weight: 700; 
  letter-spacing: -0.02em; 
}
.page-date { margin: 0; color: var(--muted); font-size: var(--text-sm); }

.btn-outline {
  background: transparent !important;
  border: 1px solid var(--border) !important;
  color: var(--ink) !important;
  transition: border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast);
}
.btn-outline:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  background: var(--accent-light) !important;
}

/* 高價值警示條 */
.priority-alert {
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-5);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.alert-content { display: flex; align-items: center; gap: var(--space-3); }
.alert-icon { color: var(--warning); font-size: 24px; flex-shrink: 0; }
.alert-text strong { display: block; font-size: var(--text-sm); color: var(--ink); margin-bottom: 2px; }
.alert-text span { font-size: var(--text-xs); color: var(--muted); }
.alert-items { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.alert-tag { cursor: pointer; }
.alert-tag:hover { opacity: 0.8; }

/* Bento Grid */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.bento-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex; flex-direction: column;
  cursor: pointer;
  position: relative;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.bento-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--border);
}

/* 卡片分配 */
.card-warning { grid-column: span 2; background: var(--accent-light); border-color: rgba(194, 93, 58, 0.2); }
.card-saved { grid-column: span 1; background: var(--surface); }
.card-total { grid-column: span 1; }
.card-family { grid-column: span 2; background: var(--el-color-primary-light-9); border-color: var(--el-color-primary-light-7); }
.card-danger { grid-column: span 1; }

.card-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.card-icon { font-size: 28px; color: var(--accent); opacity: 0.6; }

.card-label { font-size: var(--text-sm); color: var(--muted); font-weight: 500; margin-bottom: var(--space-3); }
.card-value { 
  font-family: var(--font-display); 
  font-size: var(--text-2xl); 
  font-weight: 700; 
  color: var(--ink); 
  line-height: 1; 
}
.card-warning .card-value { color: var(--accent); font-size: var(--text-hero); }
.card-saved .card-value { color: var(--sage); }
.card-danger .card-value { color: var(--danger); }

.card-hint {
  font-size: var(--text-xs); color: var(--muted); margin-top: auto; padding-top: var(--space-4);
  display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity var(--transition-fast), transform var(--transition-fast);
}
.bento-card:hover .card-hint { opacity: 1; transform: translateX(2px); color: var(--accent); }

.skeleton-card { height: 140px; }

/* 家庭動態列表 */
.family-logs { display: flex; flex-direction: column; gap: 6px; margin-top: var(--space-2); }
.empty-log { font-size: var(--text-xs); color: var(--muted); }
.log-item { font-size: var(--text-sm); color: var(--ink); display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.log-user { font-weight: 600; color: var(--accent); }
.log-action { color: var(--muted); font-size: var(--text-xs); }
.log-target { font-weight: 500; }

/* 需要注意的食材區塊 */
.urgent-card { border-radius: var(--radius-lg); }
.list-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); }

.empty-urgent {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: var(--space-6) 0; gap: var(--space-3); text-align: center;
}
.empty-urgent p { color: var(--muted); font-size: var(--text-sm); margin: 0; }

.food-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-4);
}

.food-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex; flex-direction: column; gap: var(--space-3);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.food-card:hover {
  border-color: var(--border);
  box-shadow: var(--shadow-sm);
}

.food-card.status-warning { border-color: var(--warning); }
.food-card.status-danger { border-color: var(--danger); }

.food-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.food-name { font-size: var(--text-base); font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.food-meta { font-size: var(--text-sm); color: var(--muted); display: flex; align-items: center; }
.food-meta .dot { margin: 0 6px; color: var(--border); }
.food-expiry-row { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.expiry-text { font-size: var(--text-sm); font-weight: 500; color: var(--muted); }

/* =========================================
   📱 手機端自適應優化
   ========================================= */
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .page-title { font-size: var(--text-xl); }
  
  /* 1. Bento Grid 改為雙欄，大卡片跨兩欄，小卡片各佔一欄 */
  .bento-grid { 
    grid-template-columns: 1fr 1fr; 
    gap: var(--space-3);
  }
  .card-warning, .card-family { grid-column: span 2; }
  .card-saved, .card-total, .card-danger { grid-column: span 1; }
  
  /* 縮小卡片內距與字體，避免過於擁擠 */
  .bento-card { padding: var(--space-4); }
  .card-warning .card-value { font-size: var(--text-2xl); }
  .card-saved .card-value, .card-total .card-value, .card-danger .card-value { font-size: var(--text-xl); }
  .card-label { font-size: var(--text-xs); margin-bottom: var(--space-2); }
  .card-hint { opacity: 1; transform: none; padding-top: var(--space-3); }

  /* 2. 警示條排版 */
  .priority-alert { flex-direction: column; align-items: flex-start; padding: var(--space-3); }
  .alert-items { width: 100%; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
  .alert-items::-webkit-scrollbar { display: none; }
  .alert-tag { flex-shrink: 0; }

  /* 3. 需要注意的食材：改為橫向滑動，節省垂直空間 */
  .food-grid {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: var(--space-3);
    padding-bottom: var(--space-2);
    -webkit-overflow-scrolling: touch;
    /* 取消 grid 限制 */
    grid-template-columns: none;
  }
  .food-grid::-webkit-scrollbar { display: none; }
  
  .food-card {
    min-width: 200px;
    flex-shrink: 0;
    scroll-snap-align: start;
    padding: var(--space-3);
  }
}
</style>