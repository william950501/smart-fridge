<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFridgeStore, fridgePresets } from '@/stores/fridge'
import { useInventoryStore, foodDatabase } from '@/stores/inventory'
import { useToast } from '@/composables/useToast'
import { Box, Menu, Grid, Check, CircleCheckFilled, ArrowRight } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const fridgeStore = useFridgeStore()
const inventoryStore = useInventoryStore()
const { showToast } = useToast()

// 當前步驟 (1, 2, 3)
const currentStep = ref(1)
const totalSteps = 3

// =========================================
// 步驟 1：冰箱選擇
// =========================================
const selectedPreset = ref('')

const presets = [
  { key: 'double', name: '經典雙門冰箱', desc: '上冷凍、下冷藏，最常見的家庭款式', icon: Box },
  { key: 'triple', name: '三門變頻冰箱', desc: '獨立蔬果室，食材分類更清楚', icon: Menu },
  { key: 'side', name: '對開雙門冰箱', desc: '左冷凍、右冷藏，大容量收納', icon: Grid }
]

function choosePreset(key) {
  selectedPreset.value = key
}

function nextToStep2() {
  if (!selectedPreset.value) {
    showToast({ title: '請先選擇一個冰箱類型', type: 'warning' })
    return
  }
  // 套用選擇的冰箱結構
  fridgeStore.setFridgeStructure(JSON.parse(JSON.stringify(fridgePresets[selectedPreset.value].structure)))
  currentStep.value = 2
}

// =========================================
// 步驟 2：快速新增食材
// =========================================
// 精選 8 種最常見的基礎食材
const quickFoods = [
  { name: '雞蛋', emoji: '' },
  { name: '牛奶', emoji: '' },
  { name: '高麗菜', emoji: '' },
  { name: '豬絞肉', emoji: '' },
  { name: '豆腐', emoji: '' },
  { name: '番茄', emoji: '' },
  { name: '蘋果', emoji: '' },
  { name: '香蕉', emoji: '' }
]

// 紀錄被勾選的食材
const selectedFoods = ref([])

function toggleFood(name) {
  const index = selectedFoods.value.indexOf(name)
  if (index > -1) {
    selectedFoods.value.splice(index, 1)
  } else {
    selectedFoods.value.push(name)
  }
}

function nextToStep3() {
  // 將選中的食材加入庫存
  const fridgeStructure = fridgeStore.fridgeStructure
  
  // 找一個預設位置（冷藏室的第一層）
  const coldZone = fridgeStructure.find(z => z.name.includes('冷藏') && !z.name.includes('門'))
  const defaultZoneId = coldZone ? coldZone.id : (fridgeStructure[0]?.id || '')
  const defaultShelfId = coldZone?.shelves[0]?.id || fridgeStructure[0]?.shelves[0]?.id || ''

  selectedFoods.value.forEach(foodName => {
    const dbItem = foodDatabase[foodName]
    if (!dbItem) return

    // 根據資料庫推算預設期限
    const days = dbItem.daysFridge || 7
    const expiry = dayjs().add(days, 'day').format('YYYY-MM-DD')

    inventoryStore.addFood({
      name: foodName,
      category: dbItem.category,
      quantity: 1,
      unit: dbItem.unit,
      price: 0,
      zone: defaultZoneId,
      shelf: defaultShelfId,
      expiry,
      isOpened: false,
      note: '初次設定快速加入',
      image: ''
    })
  })

  currentStep.value = 3
}

function skipStep2() {
  currentStep.value = 3
}

// =========================================
// 步驟 3：完成
// =========================================
function finishOnboarding() {
  // 清除引導標記，讓使用者進首頁時可以體驗引導
  localStorage.removeItem('hasSeenFullTour')
  
  showToast({ 
    title: '設定完成！', 
    message: '歡迎使用鮮知，您的冰箱已準備就緒。',
    type: 'success',
    duration: 5000
  })
  
  router.push('/')
}

function goToMealPlan() {
  localStorage.removeItem('hasSeenFullTour')
  router.push('/meal-plan')
}
</script>

<template>
  <div class="onboarding-wrapper">
    <!-- 頂部進度指示器 -->
    <div class="progress-header">
      <div class="step-indicator">
        <span class="step-num">步驟 {{ currentStep }} <span class="step-total">/ {{ totalSteps }}</span></span>
      </div>
      <div class="progress-bar-wrapper">
        <div v-for="i in totalSteps" :key="i" class="progress-step" :class="{ active: currentStep >= i }"></div>
      </div>
    </div>

    <!-- 步驟 1：選擇冰箱 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="step-header">
        <h1 class="step-title">歡迎使用鮮知</h1>
        <p class="step-desc">首先，請選擇最接近您家中的冰箱類型，系統將為您建立專屬空間。</p>
      </div>

      <div class="preset-grid">
        <div 
          v-for="preset in presets" 
          :key="preset.key"
          class="preset-card"
          :class="{ selected: selectedPreset === preset.key }"
          @click="choosePreset(preset.key)"
        >
          <div class="preset-icon">
            <el-icon size="28"><component :is="preset.icon" /></el-icon>
          </div>
          <div class="preset-info">
            <h3>{{ preset.name }}</h3>
            <p>{{ preset.desc }}</p>
          </div>
          <div class="check-circle" v-if="selectedPreset === preset.key">
            <el-icon><Check /></el-icon>
          </div>
        </div>
      </div>

      <div class="step-actions">
        <el-button type="primary" size="large" :disabled="!selectedPreset" @click="nextToStep2" class="next-btn">
          下一步 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 步驟 2：快速新增食材 -->
    <div v-if="currentStep === 2" class="step-content">
      <div class="step-header">
        <h1 class="step-title">快速建立庫存</h1>
        <p class="step-desc">點擊下方常見食材，一鍵加入冰箱。您隨時可以手動新增其他食材。</p>
      </div>

      <div class="quick-foods-grid">
        <div 
          v-for="food in quickFoods" 
          :key="food.name"
          class="food-chip"
          :class="{ selected: selectedFoods.includes(food.name) }"
          @click="toggleFood(food.name)"
        >
          <span class="food-name">{{ food.name }}</span>
          <el-icon v-if="selectedFoods.includes(food.name)" class="check-icon"><Check /></el-icon>
        </div>
      </div>

      <div class="step-actions flex-between">
        <el-button link @click="skipStep2" class="skip-btn">暫時跳過</el-button>
        <el-button type="primary" size="large" @click="nextToStep3" class="next-btn">
          完成建立 ({{ selectedFoods.length }}) <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 步驟 3：完成 -->
    <div v-if="currentStep === 3" class="step-content complete-step">
      <div class="complete-icon-wrapper">
        <el-icon size="48" class="complete-icon"><CircleCheckFilled /></el-icon>
      </div>
      
      <h1 class="step-title">冰箱已就緒！</h1>
      <p class="step-desc">您已經完成了初步設定，現在可以開始享受鮮知帶來的便利生活。</p>

      <div class="summary-card">
        <div class="summary-item">
          <span class="label">已建立冰箱</span>
          <span class="value">{{ presets.find(p => p.key === selectedPreset)?.name || '自訂冰箱' }}</span>
        </div>
        <div class="summary-item">
          <span class="label">已加入食材</span>
          <span class="value">{{ selectedFoods.length }} 樣</span>
        </div>
      </div>

      <div class="step-actions vertical-actions">
        <el-button type="primary" size="large" @click="finishOnboarding" class="finish-btn">
          進入我的冰箱
        </el-button>
        <el-button plain size="large" @click="goToMealPlan" class="secondary-btn">
          直接去排一週菜單
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-wrapper {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--ground);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(24px, 6vh, 48px) 16px;
}

/* =========================================
   進度條與指示器
   ========================================= */
.progress-header {
  width: 100%;
  max-width: 480px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-indicator {
  text-align: right;
}

.step-num {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent);
}

.step-total {
  color: var(--muted);
  font-weight: 400;
}

.progress-bar-wrapper {
  display: flex;
  gap: 8px;
  width: 100%;
}

.progress-step {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: var(--radius-round);
  transition: background-color var(--transition-fast);
}

.progress-step.active {
  background: var(--accent);
}

/* =========================================
   共用區塊
   ========================================= */
.step-content {
  width: 100%;
  max-width: 560px;
  animation: fade-in 300ms var(--ease-out);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-header {
  text-align: center;
  margin-bottom: 28px;
}

.step-title {
  font-family: var(--font-display);
  font-size: clamp(22px, 5vw, 32px);
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.step-desc {
  font-size: var(--text-sm);
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

/* =========================================
   步驟 1：冰箱選擇
   ========================================= */
.preset-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  position: relative;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.preset-card:hover {
  border-color: var(--accent);
}

.preset-card.selected {
  border-color: var(--accent);
  background: var(--accent-light);
}

.preset-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--ground);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.preset-card.selected .preset-icon {
  background: var(--surface);
  color: var(--accent);
}

.preset-info h3 {
  margin: 0 0 4px 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ink);
}

.preset-info p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--muted);
}

.check-circle {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: #FFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* =========================================
   步驟 2：快速食材
   ========================================= */
.quick-foods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.food-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.food-chip:hover {
  border-color: var(--accent);
}

.food-chip.selected {
  border-color: var(--accent);
  background: var(--accent-light);
}

.food-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
}

.food-chip.selected .food-name {
  color: var(--accent);
  font-weight: 600;
}

.check-icon {
  position: absolute;
  top: 6px;
  right: 6px;
  color: var(--accent);
  font-size: 14px;
}

/* =========================================
   步驟 3：完成
   ========================================= */
.complete-step {
  text-align: center;
}

.complete-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--el-color-success-light-9);
  color: var(--sage);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px auto;
}

.summary-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--text-sm);
}

.summary-item .label {
  color: var(--muted);
}

.summary-item .value {
  color: var(--ink);
  font-weight: 600;
}

/* =========================================
   按鈕與排版
   ========================================= */
.step-actions {
  display: flex;
  justify-content: center;
}

.flex-between {
  justify-content: space-between;
  align-items: center;
}

.next-btn, .finish-btn {
  width: 100%;
  max-width: 240px;
  border-radius: var(--radius-md);
  height: 44px;
}

.vertical-actions {
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.secondary-btn {
  width: 100%;
  max-width: 240px;
  border-radius: var(--radius-md);
  border-color: var(--border);
  color: var(--ink);
  height: 44px;
}

/* =========================================
   📱 手機端自適應
   ========================================= */
@media (max-width: 600px) {
  .onboarding-wrapper { padding: 24px 16px; }
  
  /* 食材網格改為 3 欄，確保文字不換行 */
  .quick-foods-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  
  .food-chip { padding: 14px 4px; }
  
  /* 跳過按鈕與主按鈕堆疊 */
  .flex-between {
    flex-direction: column-reverse;
    gap: 16px;
  }
  
  .skip-btn {
    width: 100%;
    text-align: center;
    justify-content: center;
    margin: 0;
  }
  
  .next-btn, .finish-btn, .secondary-btn {
    max-width: 100%;
  }
}
</style>