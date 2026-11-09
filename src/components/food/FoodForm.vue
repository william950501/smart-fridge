<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { foodDatabase, useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Camera, LocationInformation, Loading, Check, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  initialZone: { type: String, default: '' },
  initialShelf: { type: String, default: '' },
  autoScan: { type: Boolean, default: false },
  initialName: { type: String, default: '' },
  initialQuantity: { type: Number, default: 1 }
})

const emit = defineEmits(['submit'])
const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()
const formRef = ref(null)

const form = reactive({
  name: props.initialName || '', 
  category: '', 
  quantity: props.initialQuantity || 1, 
  unit: '', 
  price: 0, 
  zone: props.initialZone || 'cold', 
  shelf: props.initialShelf || 'A1', 
  expiry: '', 
  isOpened: false
})

const rules = {
  name: [{ required: true, message: '請輸入食材名稱', trigger: 'blur' }],
  category: [{ required: true, message: '請選擇分類', trigger: 'change' }],
  quantity: [{ required: true, message: '請輸入數量', trigger: 'blur' }],
  unit: [{ required: true, message: '請選擇單位', trigger: 'change' }],
  price: [{ required: true, message: '請輸入價格', trigger: 'blur' }],
  expiry: [{ required: true, message: '請選擇保存期限', trigger: 'change' }],
}

const categories = ['蔬菜', '水果', '肉類', '海鮮', '乳製品', '蛋類', '飲品', '調味料', '其他']
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升']

// 存放位置建議字典
const storageRules = {
  '乳製品': { zone: '冷藏室 (下層)', tip: '乳製品建議放在冷藏室下層，避免開關門時溫度劇烈變化。開封後請盡快飲用。' },
  '蔬菜': { zone: '蔬果室 / 冷藏下層', tip: '蔬菜建議放進蔬果保鮮室，或用保鮮袋包好放冷藏下層，可延長保鮮期。' },
  '水果': { zone: '蔬果室 / 冷藏下層', tip: '大部分水果建議放蔬果室。香蕉、芒果等熱帶水果則建議放常溫。' },
  '肉類': { zone: '冷凍室', tip: '肉類若未馬上食用，建議放冷凍室保存。若隔餐就要煮，可放冷藏室下層。' },
  '海鮮': { zone: '冷凍室', tip: '海鮮非常容易腐敗，建議購買後立刻放冷凍室，並用密封袋包好避免串味。' },
  '蛋類': { zone: '冷藏室 (中層)', tip: '雞蛋建議放在冷藏室中層，並將鈍端朝上，可保持蛋黃居中。' },
  '飲品': { zone: '門邊置物架', tip: '包裝飲料、調味醬料建議放在門邊置物架，方便取用。但鮮奶建議放冰箱內部。' },
  '調味料': { zone: '門邊置物架', tip: '常用調味料（如醬油、番茄醬）建議放門邊置物架，方便烹飪時拿取。' },
  '其他': { zone: '冷藏室', tip: '建議依食材特性選擇合適的存放位置。' },
}

const positionSuggestion = computed(() => {
  if (!form.name) return null
  if (foodDatabase[form.name]) {
    const cat = foodDatabase[form.name].category
    return storageRules[cat] || storageRules['其他']
  }
  return null
})

onMounted(() => {
  if (!props.initialZone || !props.initialShelf) {
    const zoneData = fridgeStore.fridgeStructure.find(z => z.id === form.zone)
    if (zoneData && zoneData.shelves.length > 0) form.shelf = zoneData.shelves[0].id
  }
  
  if (form.name) {
    const dbItem = foodDatabase[form.name]
    if (dbItem) {
      form.category = dbItem.category
      form.unit = dbItem.unit
    }
  }

  if (props.autoScan) {
    setTimeout(() => { openCameraDialog() }, 300)
  }
})

watch(() => form.zone, (newZone) => {
  const zoneData = fridgeStore.fridgeStructure.find(z => z.id === newZone)
  if (zoneData && zoneData.shelves.length > 0) form.shelf = zoneData.shelves[0].id
})

watch([() => form.name, () => form.zone, () => form.isOpened], ([newName, newZone, isOpened]) => {
  if (foodDatabase[newName]) {
    const dbItem = foodDatabase[newName]
    form.category = dbItem.category
    form.unit = dbItem.unit

    let defaultDays = 0
    if (newZone === 'cold') defaultDays = dbItem.daysFridge
    if (newZone === 'freezer') defaultDays = dbItem.daysFreezer

    if (isOpened && dbItem.daysAfterOpened > 0) {
      defaultDays = Math.min(defaultDays, dbItem.daysAfterOpened)
      if (defaultDays === 0) defaultDays = dbItem.daysAfterOpened
    }

    if (defaultDays > 0) {
      form.expiry = dayjs().add(defaultDays, 'day').format('YYYY-MM-DD')
    } else {
      form.expiry = '' 
    }
  }
})

// === 🌟 全新：相機模擬彈窗邏輯 ===
const cameraDialogVisible = ref(false)
const cameraStep = ref('ready') // 'ready' | 'scanning' | 'result'
const scanResult = ref({ name: '', confidence: 0 })

function openCameraDialog() {
  cameraDialogVisible.value = true
  cameraStep.value = 'ready'
  scanResult.value = { name: '', confidence: 0 }
}

function startScan() {
  cameraStep.value = 'scanning'
  setTimeout(() => {
    const keys = Object.keys(foodDatabase)
    const randomFood = keys[Math.floor(Math.random() * keys.length)]
    // 模擬 85% ~ 99% 的置信度
    const confidence = Math.floor(Math.random() * 15) + 85
    scanResult.value = { name: randomFood, confidence }
    cameraStep.value = 'result'
  }, 2000)
}

function retryScan() {
  cameraStep.value = 'ready'
  scanResult.value = { name: '', confidence: 0 }
}

function confirmResult() {
  form.name = scanResult.value.name
  form.quantity = Math.floor(Math.random() * 3) + 1
  form.price = Math.floor(Math.random() * 100) + 20
  ElMessage.success(`已辨識並帶入「${scanResult.value.name}」`)
  cameraDialogVisible.value = false
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      emit('submit', { ...form })
      formRef.value.resetFields()
      form.zone = 'cold'; form.shelf = 'A1'; form.isOpened = false
    }
  })
}
</script>

<template>
  <div class="food-form-wrapper">
    <div class="scan-section">
      <el-button type="primary" plain @click="openCameraDialog" style="width: 100%;">
        <el-icon style="margin-right: 8px;"><Camera /></el-icon>
        📷 拍照辨識食材 (模擬)
      </el-button>
      <p class="scan-hint">點擊開啟相機，AI 將自動辨識食材名稱</p>
    </div>

    <el-divider>或手動輸入</el-divider>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="食材名稱" prop="name">
        <el-autocomplete
          v-model="form.name"
          :fetch-suggestions="(queryString, cb) => {
            const results = Object.keys(foodDatabase).filter(k => k.includes(queryString)).map(k => ({ value: k }))
            cb(results)
          }"
          placeholder="例如：牛奶"
          clearable
          style="width: 100%;"
        />
      </el-form-item>

      <div v-if="positionSuggestion" class="suggestion-box">
        <div class="suggestion-title">
          <el-icon><LocationInformation /></el-icon> 建議存放位置：{{ positionSuggestion.zone }}
        </div>
        <div class="suggestion-tip">{{ positionSuggestion.tip }}</div>
      </div>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="區域" prop="zone">
            <el-select v-model="form.zone" style="width: 100%">
              <el-option v-for="z in fridgeStore.fridgeStructure" :key="z.id" :label="z.name" :value="z.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="隔層" prop="shelf" label-width="60px">
            <el-select v-model="form.shelf" style="width: 100%">
              <el-option v-for="s in fridgeStore.fridgeStructure.find(z => z.id === form.zone)?.shelves" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="分類" prop="category">
        <el-select v-model="form.category" placeholder="請選擇分類" style="width: 100%">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="數量" prop="quantity">
            <el-input-number v-model="form.quantity" :min="1" :max="999" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="單位" prop="unit" label-width="60px">
            <el-select v-model="form.unit" placeholder="單位" style="width: 100%">
              <el-option v-for="u in units" :key="u" :label="u" :value="u" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="購買價格" prop="price">
        <el-input-number v-model="form.price" :min="0" :precision="0" style="width: 100%" />
      </el-form-item>

      <el-form-item label="已開封">
        <el-switch v-model="form.isOpened" active-text="已開封" inactive-text="未開封" />
        <div v-if="form.isOpened" class="opened-hint">
          <el-icon color="var(--el-color-warning)"><WarningFilled /></el-icon>
          開封後保存期限將自動縮短
        </div>
      </el-form-item>

      <el-form-item label="保存期限" prop="expiry">
        <el-date-picker v-model="form.expiry" type="date" placeholder="選擇日期" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSubmit" style="width: 100%;">送出</el-button>
      </el-form-item>
    </el-form>

    <!-- 🌟 相機模擬彈窗 -->
    <el-dialog 
      v-model="cameraDialogVisible" 
      title="AI 食材辨識" 
      width="400px" 
      align-center 
      class="custom-app-dialog"
      :close-on-click-modal="false"
    >
      <div class="camera-content">
        <!-- 步驟一：準備畫面 -->
        <div v-if="cameraStep === 'ready'" class="camera-step">
          <div class="camera-viewfinder">
            <el-icon size="48" color="var(--el-text-color-disabled)"><Camera /></el-icon>
            <span class="viewfinder-text">對準食材以進行辨識</span>
          </div>
          <el-button type="primary" style="width: 100%; margin-top: 20px;" @click="startScan">開始掃描</el-button>
        </div>

        <!-- 步驟二：掃描中 -->
        <div v-if="cameraStep === 'scanning'" class="camera-step">
          <div class="camera-viewfinder scanning">
            <div class="scan-line"></div>
            <el-icon class="is-loading" size="48" color="var(--el-color-primary)"><Loading /></el-icon>
            <span class="viewfinder-text">AI 辨識中，請稍候...</span>
          </div>
        </div>

        <!-- 步驟三：辨識結果 -->
        <div v-if="cameraStep === 'result'" class="camera-step">
          <el-result icon="success" title="辨識完成" :sub-title="`偵測到：${scanResult.name}`">
            <template #extra>
              <div class="confidence-box">
                <span>AI 置信度</span>
                <el-progress :percentage="scanResult.confidence" :color="scanResult.confidence > 90 ? '#67c23a' : '#e6a23c'" />
              </div>
            </template>
          </el-result>
          <div class="result-actions">
            <el-button :icon="Refresh" @click="retryScan">重新掃描</el-button>
            <el-button type="primary" :icon="Check" @click="confirmResult">確認帶入</el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.food-form-wrapper { padding: 0 10px; }
.scan-section { text-align: center; margin-bottom: 20px; }
.scan-hint { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 8px; }
:deep(.el-divider__text) { color: var(--el-text-color-secondary); background-color: var(--el-bg-color-overlay); }
.opened-hint { font-size: 12px; color: var(--el-color-warning); margin-top: 4px; display: flex; align-items: center; gap: 4px; }

.suggestion-box {
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-success-light-9) 100%);
  border: 1px dashed var(--el-color-primary-light-5);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.suggestion-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.suggestion-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

/* 🌟 相機彈窗樣式 */
.camera-content {
  text-align: center;
}
.camera-step {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.camera-viewfinder {
  width: 100%;
  height: 200px;
  background: #000;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  color: #fff;
}
.viewfinder-text {
  font-size: 14px;
  color: #fff;
  z-index: 2;
}

/* 掃描動畫 */
.scanning .scan-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--el-color-primary);
  box-shadow: 0 0 10px var(--el-color-primary);
  animation: scan 1.5s infinite linear;
  z-index: 1;
}
@keyframes scan {
  0% { top: 0; }
  50% { top: 100%; }
  100% { top: 0; }
}

.confidence-box {
  width: 100%;
  text-align: left;
  margin-top: 10px;
}
.confidence-box span {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: block;
  margin-bottom: 6px;
}
.result-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-top: 20px;
}
.result-actions .el-button {
  flex: 1;
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