<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventory'
import { useTourStore } from '@/stores/tour'
import { useToast } from '@/composables/useToast'
import { User, Bell, Sunny, Moon, MagicStick, Compass, Brush, Check, Setting } from '@element-plus/icons-vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const inventoryStore = useInventoryStore()
const tourStore = useTourStore()
const { showToast } = useToast()

// =========================================
// 主題設定
// =========================================
const themes = [
  { key: 'terracotta', name: '南歐莊園', desc: '赤陶橙與暖燕麥', bg: '#F5F3EF', accent: '#C25D3A' },
  { key: 'mist-blue', name: '霧灰藍', desc: '冷靜專業的 SaaS 感', bg: '#F8FAFC', accent: '#3B82F6' },
  { key: 'dusty-rose', name: '莫蘭迪粉', desc: '溫柔且帶有生活感', bg: '#FAF8F5', accent: '#D4A5A5' },
  { key: 'emerald-tech', name: '科技綠', desc: '代表新鮮與健康', bg: '#F3F7F4', accent: '#059669' },
  { key: 'obsidian', name: '曜石黑', desc: '極致專注的深色模式', bg: '#0F1115', accent: '#6366F1' },
  { key: 'warm-amber', name: '琥珀暖木', desc: '大地色系質樸感', bg: '#FDFBF7', accent: '#D97706' }
]

// 自訂主題彈窗
const customDialogVisible = ref(false)
const customForm = reactive({
  ground: uiStore.customTheme.ground,
  accent: uiStore.customTheme.accent,
  ink: uiStore.customTheme.ink
})

function selectTheme(key) {
  uiStore.setTheme(key)
  if (key === 'obsidian') {
    showToast({ title: '已切換為曜石黑', message: '已自動啟用深色模式。', type: 'info' })
  }
}

function openCustomDialog() {
  customForm.ground = uiStore.customTheme.ground
  customForm.accent = uiStore.customTheme.accent
  customForm.ink = uiStore.customTheme.ink
  customDialogVisible.value = true
}

// 即時預覽自訂顏色
watch(customForm, (newVal) => {
  uiStore.updateCustomTheme({ ...newVal })
  if (uiStore.themeKey !== 'custom') {
    uiStore.setTheme('custom')
  }
}, { deep: true })

function saveCustomTheme() {
  uiStore.updateCustomTheme({ ...customForm })
  uiStore.setTheme('custom')
  customDialogVisible.value = false
  showToast({ title: '已套用自訂主題', type: 'success' })
}

function toggleDark() {
  uiStore.toggleDark()
}

// =========================================
// 提醒設定 (即時保存)
// =========================================
function updateReminderDays(val) {
  settingsStore.updateSettings(val, settingsStore.notifyStation, settingsStore.notifyLine)
}

function updateNotifyStation(val) {
  settingsStore.updateSettings(settingsStore.reminderDays, val, settingsStore.notifyLine)
}

function updateNotifyLine(val) {
  settingsStore.updateSettings(settingsStore.reminderDays, settingsStore.notifyStation, val)
}

// 即時預警預覽
const previewCount = computed(() => {
  return inventoryStore.activeFoods.filter(f => {
    const d = inventoryStore.getDaysLeft(f.expiry, f.isOpened, f.openedExpiry)
    const threshold = settingsStore.getReminderDaysFor(f.category)
    return d >= 0 && d <= threshold
  }).length
})

const categoryList = computed(() => {
  const categories = ['肉類', '海鮮', '乳製品', '蛋類', '蔬菜', '水果', '飲品', '調味料', '其他']
  return categories.map(cat => {
    const count = inventoryStore.activeFoods.filter(f => f.category === cat).length
    return {
      key: cat,
      days: settingsStore.categoryReminderDays[cat] !== undefined 
              ? settingsStore.categoryReminderDays[cat] 
              : settingsStore.reminderDays,
      count
    }
  })
})

function handleCategoryChange(category, days) {
  settingsStore.updateCategoryReminderDays(category, days)
}

// =========================================
// 無障礙與引導
// =========================================
function toggleElderMode(val) {
  uiStore.toggleElderMode()
  showToast({ title: val ? '已開啟長輩友善模式' : '已恢復正常模式', type: 'success' })
}

function restartTour() {
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
  setTimeout(() => {
    tourStore.resetTour()
    showToast({ title: '已重新啟動新手引導', type: 'info' })
  }, 300)
}
</script>

<template>
  <div class="settings-container">
    <div class="page-header">
      <h2>系統設定</h2>
      <p class="hint">管理您的個人化操作體驗與通知偏好</p>
    </div>

    <!-- 1. 外觀與主題 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-title"><el-icon><Brush /></el-icon> 外觀與主題</div>
        </div>
      </template>
      
      <div class="theme-section">
        <h3 class="section-subtitle">色彩主題</h3>
        <div class="theme-grid">
          <!-- 預設主題 -->
          <div 
            v-for="theme in themes" 
            :key="theme.key"
            class="theme-card" 
            :class="{ active: uiStore.themeKey === theme.key }"
            @click="selectTheme(theme.key)"
          >
            <div class="color-preview" :style="{ background: theme.bg }">
              <div class="accent-dot" :style="{ background: theme.accent }"></div>
            </div>
            <div class="theme-info">
              <span class="theme-name">{{ theme.name }}</span>
              <span class="theme-desc">{{ theme.desc }}</span>
            </div>
            <div v-if="uiStore.themeKey === theme.key" class="check-icon">
              <el-icon><Check /></el-icon>
            </div>
          </div>

          <!-- 自訂主題卡片 -->
          <div 
            class="theme-card custom-card" 
            :class="{ active: uiStore.themeKey === 'custom' }"
            @click="openCustomDialog"
          >
            <div class="color-preview custom-preview">
              <el-icon size="20"><MagicStick /></el-icon>
            </div>
            <div class="theme-info">
              <span class="theme-name">自訂主題</span>
              <span class="theme-desc">打造專屬你的配色</span>
            </div>
          </div>
        </div>

        <div class="setting-row mt-4">
          <div class="info-block">
            <h3>深色模式</h3>
            <p>切換為暖調深色背景，夜間使用更護眼。</p>
          </div>
          <div class="action-block">
            <el-switch 
              :model-value="uiStore.isDark" 
              @change="toggleDark"
              size="large"
              inline-prompt
              :active-icon="Moon"
              :inactive-icon="Sunny"
              :disabled="uiStore.themeKey === 'obsidian'"
            />
          </div>
        </div>
      </div>
    </el-card>

    <!-- 2. 無障礙與引導 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-title"><el-icon><User /></el-icon> 無障礙與引導</div>
        </div>
      </template>
      <div class="setting-row">
        <div class="info-block">
          <h3>長輩友善模式</h3>
          <p>開啟後，全站字體與按鈕將自動放大，讓操作更清晰不費力。</p>
        </div>
        <div class="action-block">
          <el-switch 
            :model-value="uiStore.isElderMode" 
            @change="toggleElderMode"
            size="large"
            active-text="已開啟"
            inactive-text="已關閉"
          />
        </div>
      </div>
      <el-divider />
      <div class="setting-row">
        <div class="info-block">
          <h3>重看新手引導</h3>
          <p>忘記怎麼操作嗎？點擊右方按鈕，重新播放系統導覽。</p>
        </div>
        <div class="action-block">
          <el-button type="primary" plain :icon="Compass" @click="restartTour" data-tour="tour-restart">
            重新啟動引導
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 3. 通知與提醒 (即時保存) -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-title"><el-icon><Bell /></el-icon> 通知與提醒</div>
          <el-tag type="warning" effect="light" size="small" round>目前影響 {{ previewCount }} 項食材</el-tag>
        </div>
      </template>
      
      <div class="settings-form">
        
        <div class="form-section">
          <label class="form-label">預設提前提醒天數</label>
          <div class="input-group">
            <el-input-number 
              :model-value="settingsStore.reminderDays" 
              @update:model-value="updateReminderDays" 
              :min="1" :max="14" 
              class="days-input"
            />
            <span class="input-hint">天（距離保存期限前幾天開始提醒）</span>
          </div>
          <div class="impact-preview">
            <el-icon><Setting /></el-icon>
            目前設定下，會有 <strong>{{ previewCount }}</strong> 樣食材納入提醒範圍。
          </div>
        </div>

        <div class="form-section">
          <label class="form-label">依類別調整提醒天數</label>
          <p class="form-desc">不同食材的腐敗速度不同，您可以為每個類別設定專屬的提前天數。</p>
          
          <div class="category-grid">
            <div v-for="item in categoryList" :key="item.key" class="category-item">
              <div class="cat-info">
                <span class="cat-name">{{ item.key }}</span>
                <span class="cat-count" v-if="item.count > 0">目前 {{ item.count }} 樣</span>
                <span class="cat-count empty" v-else>無庫存</span>
              </div>
              <div class="cat-input">
                <el-input-number 
                  :model-value="item.days" 
                  @update:model-value="(val) => handleCategoryChange(item.key, val)" 
                  :min="1" :max="14" 
                  size="small" 
                  controls-position="right"
                  class="cat-input-num"
                />
                <span class="unit-text">天</span>
              </div>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="form-section">
          <label class="form-label">通知管道</label>
          <div class="switch-row">
            <div class="switch-info">
              <span class="switch-name">站內通知</span>
              <span class="switch-desc">食材到期時，在系統頂部鈴鐺顯示紅點。</span>
            </div>
            <el-switch :model-value="settingsStore.notifyStation" @change="updateNotifyStation" />
          </div>
          <div class="switch-row">
            <div class="switch-info">
              <span class="switch-name">LINE 推播</span>
              <span class="switch-desc">透過 LINE 官方帳號發送每日摘要（模擬功能）。</span>
            </div>
            <el-switch :model-value="settingsStore.notifyLine" @change="updateNotifyLine" />
          </div>
        </div>

      </div>
    </el-card>

    <!-- 自訂主題彈窗 -->
    <el-dialog v-model="customDialogVisible" title="自訂主題顏色" width="400px" align-center class="custom-app-dialog">
      <div class="custom-theme-content">
        <p class="dialog-hint">調整下方顏色即可即時預覽全站效果。</p>
        
        <div class="color-picker-row">
          <span class="picker-label">背景顏色</span>
          <el-color-picker v-model="customForm.ground" />
        </div>
        <div class="color-picker-row">
          <span class="picker-label">強調顏色</span>
          <el-color-picker v-model="customForm.accent" />
        </div>
        <div class="color-picker-row">
          <span class="picker-label">文字顏色</span>
          <el-color-picker v-model="customForm.ink" />
        </div>

        <!-- 🌟 預覽區域：動態綁定背景與文字，不使用死白 -->
        <div class="preview-box" :style="{ background: customForm.ground, borderColor: customForm.ink + '20' }">
          <div class="preview-card" :style="{ color: customForm.ink }">
            <h4 :style="{ color: customForm.ink }">預覽標題</h4>
            <p :style="{ color: customForm.ink + '99' }">這是一段預覽文字，確認閱讀起來是否舒適。</p>
            <el-button type="primary" round :style="{ background: customForm.accent, borderColor: customForm.accent, color: '#FFF' }">主要按鈕</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="customDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCustomTheme">套用主題</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.settings-container { max-width: 800px; margin: 0 auto; }
.page-header { margin-bottom: var(--space-5); }
.page-header h2 { margin: 0 0 8px 0; font-size: var(--text-xl); color: var(--ink); font-family: var(--font-display); font-weight: 700; }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }

.settings-card { 
  border-radius: var(--radius-lg); 
  background: var(--surface); 
  border: 1px solid var(--border-light); 
  margin-bottom: var(--space-5); 
}
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-title { 
  font-size: var(--text-base); 
  font-weight: 700; 
  color: var(--ink); 
  font-family: var(--font-display);
  display: flex; 
  align-items: center; 
  gap: 8px; 
}

/* 設定區塊共用排版 */
.setting-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  gap: var(--space-5); 
  flex-wrap: wrap; /* 防擠壓 */
}
.mt-4 { margin-top: var(--space-4); }
.info-block { flex: 1; min-width: 200px; }
.info-block h3 { margin: 0 0 4px 0; font-size: var(--text-base); color: var(--ink); font-weight: 600; }
.info-block p { margin: 0; font-size: var(--text-sm); color: var(--muted); line-height: 1.5; }
.action-block { flex-shrink: 0; }

/* 主題網格 */
.section-subtitle { font-size: var(--text-sm); font-weight: 600; color: var(--ink); margin: 0 0 12px 0; }
.theme-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
  gap: var(--space-4); 
}

.theme-card {
  display: flex; 
  align-items: center; 
  gap: var(--space-3);
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--ground);
  transition: border-color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);
  position: relative;
}
.theme-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.theme-card.active { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 1px var(--accent); }

.color-preview {
  width: 40px; height: 40px; border-radius: var(--radius-sm); flex-shrink: 0;
  border: 1px solid var(--border-light);
  position: relative;
  overflow: hidden;
}
.accent-dot {
  position: absolute; bottom: 6px; right: 6px;
  width: 12px; height: 12px; border-radius: 50%;
}
.custom-preview { 
  background: var(--surface); 
  display: flex; align-items: center; justify-content: center; 
  color: var(--muted); 
  border-style: dashed;
}

.theme-info { display: flex; flex-direction: column; min-width: 0; }
.theme-name { font-size: var(--text-sm); font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.theme-desc { font-size: var(--text-xs); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.check-icon {
  position: absolute; top: 8px; right: 8px;
  color: var(--accent); font-size: 16px;
}

/* 表單排版 */
.settings-form { margin-top: var(--space-2); }
.form-section { margin-bottom: var(--space-6); }
.form-label { display: block; font-size: var(--text-base); font-weight: 600; color: var(--ink); margin-bottom: var(--space-2); }
.form-desc { font-size: var(--text-sm); color: var(--muted); margin: 0 0 var(--space-4) 0; }

.input-group { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.days-input { width: 120px; }
.input-hint { font-size: var(--text-sm); color: var(--muted); }

.impact-preview {
  margin-top: var(--space-3);
  background: var(--accent-light);
  color: var(--accent);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 類別 Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}
.category-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px;
  background: var(--ground);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  gap: 8px;
}
.cat-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.cat-name { font-size: var(--text-sm); font-weight: 500; color: var(--ink); }
.cat-count { font-size: var(--text-xs); color: var(--accent); white-space: nowrap; }
.cat-count.empty { color: var(--muted); }
.cat-input { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.cat-input-num { width: 90px; }
.unit-text { font-size: var(--text-xs); color: var(--muted); }

/* 開關列表 */
.switch-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: var(--space-3) 0;
  border-bottom: 1px dashed var(--border-light);
}
.switch-row:last-child { border-bottom: none; }
.switch-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.switch-name { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
.switch-desc { font-size: var(--text-xs); color: var(--muted); line-height: 1.4; }

/* 自訂主題彈窗 */
.custom-theme-content { padding: 0 10px; }
.dialog-hint { font-size: var(--text-sm); color: var(--muted); margin-bottom: var(--space-4); }
.color-picker-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
.picker-label { font-size: var(--text-sm); font-weight: 500; color: var(--ink); }

.preview-box {
  margin-top: var(--space-5);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  transition: background-color var(--transition-base), border-color var(--transition-base);
}
.preview-card {
  /* 移除寫死的 background: #FFFFFF */
  background: var(--surface);
  padding: 16px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  text-align: left;
}
.preview-card h4 { margin: 0 0 8px 0; font-family: var(--font-display); }
.preview-card p { margin: 0 0 12px 0; font-size: var(--text-sm); }

/* =========================================
   📱 手機端自適應
   ========================================= */
@media (max-width: 768px) {
  .setting-row { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
  .action-block { width: 100%; }
  
  /* 1. 主題卡片改為雙欄 */
  .theme-grid { 
    grid-template-columns: repeat(2, 1fr); 
    gap: 12px;
  }
  .theme-card { 
    flex-direction: column; 
    align-items: flex-start; 
    padding: 10px; 
    gap: 8px;
  }
  .color-preview { width: 100%; height: 32px; }
  .accent-dot { bottom: 4px; right: 4px; width: 10px; height: 10px; }
  .theme-desc { display: none; } /* 手機端隱藏說明文字，節省空間 */
  .theme-name { font-size: 13px; }
  .check-icon { top: 6px; right: 6px; }

  /* 2. 類別提醒 */
  .category-grid { grid-template-columns: 1fr; }
  .cat-input-num { width: 100px; }

  /* 3. 開關列 */
  .switch-row { flex-direction: row; align-items: center; } /* 保持左右，但允許換行 */
  .switch-info { flex: 1; }
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
@media (max-width: 601px) {
  .custom-app-dialog { width: 92vw !important; max-width: 92vw; margin: 4vh auto !important; }
}
</style>