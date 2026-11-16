<script setup>
import { ref, reactive, watch, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { foodDatabase, useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Camera, LocationInformation, ChatDotRound, WarningFilled,
  Loading, Refresh, Check, Picture, Delete, MagicStick, Food, Aim
} from '@element-plus/icons-vue'

const props = defineProps({
  initialZone: { type: String, default: '' },
  initialShelf: { type: String, default: '' },
  autoScan: { type: Boolean, default: false },
  initialName: { type: String, default: '' },
  initialQuantity: { type: Number, default: 1 }
})

const emit = defineEmits(['submit'])
const router = useRouter()
const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()
const { showToast } = useToast()

const formRef = ref(null)
const nameInputRef = ref(null)
const fileInputRef = ref(null)

const isExpiryManuallyEdited = ref(false)
const imagePreview = ref('')

// =========================================
// 預設值與常用位置
// =========================================
function getDefaultLocation() {
  const structure = fridgeStore.fridgeStructure
  if (!structure || structure.length === 0) return { zone: '', shelf: '' }

  let defaultZone = structure.find(z => z.name.includes('冷藏') && !z.name.includes('門'))
  if (!defaultZone) defaultZone = structure[0]

  const defaultShelf = defaultZone.shelves && defaultZone.shelves.length > 0 ? defaultZone.shelves[0].id : ''
  return { zone: defaultZone.id, shelf: defaultShelf }
}

const defaultLoc = getDefaultLocation()

const form = reactive({
  name: props.initialName || '',
  category: '',
  quantity: props.initialQuantity || 1,
  unit: '',
  price: 0,
  zone: props.initialZone || defaultLoc.zone,
  shelf: props.initialShelf || defaultLoc.shelf,
  expiry: '',
  isOpened: false,
  note: '',
  image: ''
})

const quickLocations = computed(() => {
  const locations = []
  const structure = fridgeStore.fridgeStructure
  if (!structure || structure.length === 0) return locations

  const coldZone = structure.find(z => z.name.includes('冷藏') && !z.name.includes('門'))
  const freezerZone = structure.find(z => z.name.includes('冷凍') && !z.name.includes('門'))
  const doorZone = structure.find(z => z.name.includes('門'))

  if (coldZone && coldZone.shelves.length > 0) locations.push({ label: '冷藏上層', zone: coldZone.id, shelf: coldZone.shelves[0].id })
  if (coldZone && coldZone.shelves.length > 1) locations.push({ label: '冷藏下層', zone: coldZone.id, shelf: coldZone.shelves[1].id })
  if (freezerZone && freezerZone.shelves.length > 0) locations.push({ label: '冷凍', zone: freezerZone.id, shelf: freezerZone.shelves[0].id })
  if (doorZone && doorZone.shelves.length > 0) locations.push({ label: '門邊', zone: doorZone.id, shelf: doorZone.shelves[0].id })
  return locations
})

function applyQuickLocation(loc) {
  form.zone = loc.zone
  form.shelf = loc.shelf
}

// =========================================
// 驗證規則
// =========================================
const rules = {
  name: [{ required: true, message: '請輸入食材名稱', trigger: 'blur' }],
  category: [{ required: true, message: '請選擇分類', trigger: 'change' }],
  quantity: [{ required: true, message: '請輸入數量', trigger: 'blur' }],
  unit: [{ required: true, message: '請選擇單位', trigger: 'change' }],
  expiry: [{ required: true, message: '請選擇保存期限', trigger: 'change' }],
}

const categories = ['蔬菜', '水果', '肉類', '海鮮', '乳製品', '蛋類', '飲品', '調味料', '其他']
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升', '片', '杯', '條', '根']

// =========================================
// 亮點：AI 存放位置建議與警示邏輯
// =========================================
const storageRules = {
  '乳製品': { targetZone: '冷藏', tip: '乳製品建議放在冷藏室下層，避免開關門時溫度劇烈變化。開封後請盡快飲用。', warn: '放在冷凍庫會導致蛋白質變性、水分分離，退冰後口感會變差。' },
  '蔬菜': { targetZone: '蔬果', tip: '蔬菜建議放進蔬果保鮮室，或用保鮮袋包好放冷藏下層，可延長保鮮期。', warn: '放在冷凍庫會導致蔬菜細胞壁破裂，解凍後會軟爛出水。' },
  '水果': { targetZone: '蔬果', tip: '大部分水果建議放蔬果室。香蕉、芒果等熱帶水果則建議放常溫。', warn: '放錯位置容易導致水果凍傷發黑。' },
  '肉類': { targetZone: '冷凍', tip: '肉類若未馬上食用，建議放冷凍室保存。若隔餐就要煮，可放冷藏室下層。', warn: '放在冷藏室保存期限極短，容易腐敗。' },
  '海鮮': { targetZone: '冷凍', tip: '海鮮非常容易腐敗，建議購買後立刻放冷凍室，並用密封袋包好避免串味。', warn: '冷藏海鮮容易滋生細菌，建議冷凍。' },
  '蛋類': { targetZone: '冷藏', tip: '雞蛋建議放在冷藏室中層，並將鈍端朝上，可保持蛋黃居中。', warn: '放在冷凍庫會導致蛋液膨脹撐破蛋殼。' },
  '飲品': { targetZone: '門', tip: '包裝飲料、調味醬料建議放在門邊置物架，方便取用。但鮮奶建議放冰箱內部。', warn: '部分飲品結冰後體積膨脹會爆裂。' },
  '調味料': { targetZone: '門', tip: '常用調味料（如醬油、番茄醬）建議放門邊置物架，方便烹飪時拿取。', warn: '放錯位置不影響食用，但不易拿取。' },
  '其他': { targetZone: '冷藏', tip: '建議依食材特性選擇合適的存放位置。麵包類建議放冷藏或冷凍，避免發霉。', warn: '請確認該食材是否適合冷凍。' },
}

const currentCategory = computed(() => foodDatabase[form.name]?.category || '其他')
const currentRule = computed(() => storageRules[currentCategory.value] || storageRules['其他'])

const currentZoneName = computed(() => {
  if (!form.zone) return ''
  return fridgeStore.fridgeStructure.find(z => z.id === form.zone)?.name || ''
})

const isLocationCorrect = computed(() => {
  if (!form.name || !form.zone) return true
  const rule = currentRule.value
  const zoneName = currentZoneName.value
  
  if (rule.targetZone === '冷藏' && zoneName.includes('冷凍')) return false
  if (rule.targetZone === '冷凍' && zoneName.includes('冷藏')) return false
  if (rule.targetZone === '門' && !zoneName.includes('門')) return false
  
  return true
})

// =========================================
// 監聽表單變化
// =========================================
watch(() => props.initialName, (newName) => { if (newName !== form.name) form.name = newName })
watch(() => props.initialQuantity, (newQty) => { form.quantity = newQty })

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
    setTimeout(() => { simulatePhotoScan() }, 300)
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

    if (isExpiryManuallyEdited.value) return

    if (form.price === 0 && dbItem.unitPrice) {
      form.price = Math.round(dbItem.unitPrice * form.quantity) || 0
    }

    let defaultDays = 0
    const isFreezer = fridgeStore.fridgeStructure.find(z => z.id === newZone)?.name.includes('冷凍')
    defaultDays = isFreezer ? dbItem.daysFreezer : dbItem.daysFridge

    if (isOpened && dbItem.daysAfterOpened > 0) {
      defaultDays = Math.min(defaultDays, dbItem.daysAfterOpened)
      if (defaultDays === 0) defaultDays = dbItem.daysAfterOpened
    }

    if (defaultDays > 0) form.expiry = dayjs().add(defaultDays, 'day').format('YYYY-MM-DD')
    else form.expiry = ''
  }
})

// =========================================
// 照片與相機模擬
// =========================================
function triggerPhotoUpload() { fileInputRef.value?.click() }

function handlePhotoChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) return ElMessage.warning('圖片檔案不可超過 5MB')
  if (!file.type.startsWith('image/')) return ElMessage.warning('請上傳圖片檔案')

  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
    form.image = e.target.result
    ElMessage.success('照片已加入 (模擬移除 EXIF)')
  }
  reader.readAsDataURL(file)
}

function removePhoto() {
  imagePreview.value = ''
  form.image = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const cameraDialogVisible = ref(false)
const cameraStep = ref('ready')
const scanResult = ref({ name: '', confidence: 0 })

function openCameraDialog() {
  cameraDialogVisible.value = true
  cameraStep.value = 'ready'
  scanResult.value = { name: '', confidence: 0 }
}

function simulatePhotoScan() {
  cameraDialogVisible.value = true
  startScan()
}

function startScan() {
  cameraStep.value = 'scanning'
  setTimeout(() => {
    const keys = Object.keys(foodDatabase)
    const randomFood = keys[Math.floor(Math.random() * keys.length)]
    const confidence = Math.floor(Math.random() * 15) + 85
    scanResult.value = { name: randomFood, confidence }
    cameraStep.value = 'result'
  }, 1500)
}

function retryScan() {
  cameraStep.value = 'ready'
  scanResult.value = { name: '', confidence: 0 }
}

function confirmResult() {
  form.name = scanResult.value.name
  const dbItem = foodDatabase[form.name]
  form.quantity = Math.floor(Math.random() * 3) + 1
  
  if (dbItem) {
    form.price = (dbItem.unitPrice || Math.floor(Math.random() * 100) + 20) * form.quantity
    form.category = dbItem.category
    form.unit = dbItem.unit
  } else {
    form.price = Math.floor(Math.random() * 100) + 20
  }

  isExpiryManuallyEdited.value = false
  ElMessage.success(`已辨識並帶入「${scanResult.value.name}」及相關資訊`)
  cameraDialogVisible.value = false
}

// =========================================
// 提交與合併
// =========================================
async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    const dup = inventoryStore.findDuplicateFood(form.name)
    
    if (dup && dup.unit === form.unit) {
      try {
        await ElMessageBox.confirm(
          `冰箱內還有 ${dup.quantity} ${dup.unit} 的「${form.name}」，要合併成一筆嗎？`,
          '發現重複食材',
          { confirmButtonText: '合併庫存', cancelButtonText: '分開儲存', type: 'warning' }
        )
        inventoryStore.updateProgress(dup.id, dup.quantity + Number(form.quantity))
        ElMessage.success(`已合併！目前共有 ${dup.quantity + Number(form.quantity)} ${dup.unit}`)
        showToast({ title: '已合併庫存', message: `「${form.name}」數量已更新`, type: 'success' })
        resetForm()
        return
      } catch (e) {}
    }

    emit('submit', { ...form })
    
    showToast({
      title: `已新增「${form.name}」`,
      message: `庫存 +${form.quantity} ${form.unit}，已存放至指定位置`,
      type: 'success',
      actions: [
        { label: '查看庫存', type: 'primary', handler: () => { router.push('/inventory') } },
        { label: '去排菜單', type: 'default', handler: () => { router.push('/meal-plan') } }
      ]
    })

    resetForm()
  })
}

function resetForm() {
  form.name = ''
  form.quantity = 1
  form.price = 0
  form.expiry = ''
  form.isOpened = false
  form.note = ''
  form.image = ''
  imagePreview.value = ''
  isExpiryManuallyEdited.value = false

  if (fileInputRef.value) fileInputRef.value.value = ''
  formRef.value.clearValidate()

  nextTick(() => {
    const inputEl = nameInputRef.value?.$el?.querySelector('input')
    if (inputEl) inputEl.focus()
  })
}
</script>

<template>
  <div class="food-form-wrapper">
    <!-- AI 拍照辨識入口 -->
    <div class="ai-scan-card" @click="openCameraDialog">
      <div class="scan-icon-wrapper">
        <el-icon size="28"><Camera /></el-icon>
        <div class="scan-pulse"></div>
      </div>
      <div class="scan-text">
        <h3>AI 智慧拍照辨識</h3>
        <p>對準食材，自動填入品名與建議期限</p>
      </div>
      <el-button type="primary" round class="scan-btn">開始掃描</el-button>
    </div>

    <!-- 上傳照片區 -->
    <div class="upload-section">
      <el-button class="btn-photo" @click="triggerPhotoUpload" plain>
        <el-icon style="margin-right: 6px;"><Picture /></el-icon> 或上傳食材照片
      </el-button>
      <input type="file" ref="fileInputRef" accept="image/*" style="display: none;" @change="handlePhotoChange" />
    </div>

    <div v-if="imagePreview" class="photo-preview-box">
      <img :src="imagePreview" alt="食材照片預覽" class="preview-img" />
      <div class="preview-overlay">
        <el-button type="danger" circle size="small" :icon="Delete" @click="removePhoto" />
      </div>
    </div>

    <el-divider>或手動輸入</el-divider>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" @submit.prevent class="responsive-form">
      
      <el-form-item label="食材名稱" prop="name">
        <el-autocomplete
          ref="nameInputRef"
          v-model="form.name"
          :fetch-suggestions="(queryString, cb) => {
            const results = Object.keys(foodDatabase).filter(k => k.includes(queryString)).map(k => ({ value: k }))
            cb(results)
          }"
          placeholder="例如：牛奶"
          clearable
          style="width: 100%;"
          data-tour="food-name-input"
          @keyup.enter="handleSubmit"
        />
      </el-form-item>

      <!-- AI 存放位置建議卡片 -->
      <transition name="slide-fade">
        <div v-if="form.name && form.zone" class="ai-suggestion-card" :class="isLocationCorrect ? 'is-correct' : 'is-wrong'">
          <div class="suggestion-header">
            <div class="suggestion-title">
              <el-icon><MagicStick /></el-icon> AI 存放位置建議
            </div>
            <el-tag :type="isLocationCorrect ? 'success' : 'warning'" effect="dark" size="small" round>
              {{ isLocationCorrect ? '位置合適' : '位置需調整' }}
            </el-tag>
          </div>
          <div class="suggestion-body">
            <div class="suggest-target">
              建議放在：<strong>{{ currentRule.targetZone }}</strong>
            </div>
            <p class="suggest-desc">
              {{ isLocationCorrect ? currentRule.tip : currentRule.warn }}
            </p>
          </div>
          <div v-if="!isLocationCorrect" class="suggestion-action">
            <el-button type="warning" plain size="small" round @click="form.zone = ''">重新選擇位置</el-button>
          </div>
        </div>
      </transition>

      <!-- 常用位置 Quick Chips -->
      <el-form-item label="存放位置">
        <div class="quick-locations">
          <div 
            v-for="(loc, index) in quickLocations" 
            :key="index"
            class="loc-chip"
            :class="{ active: form.zone === loc.zone && form.shelf === loc.shelf }"
            @click="applyQuickLocation(loc)"
          >
            {{ loc.label }}
          </div>
        </div>
      </el-form-item>

      <el-collapse class="advanced-location">
        <el-collapse-item title="進階位置選擇" name="1">
          <div class="advanced-loc-grid">
            <el-form-item label="區域" prop="zone" label-width="60px">
              <el-select v-model="form.zone" style="width: 100%">
                <el-option v-for="z in fridgeStore.fridgeStructure" :key="z.id" :label="z.name" :value="z.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="隔層" prop="shelf" label-width="60px">
              <el-select v-model="form.shelf" style="width: 100%">
                <el-option v-for="s in fridgeStore.fridgeStructure.find(z => z.id === form.zone)?.shelves || []" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
          </div>
        </el-collapse-item>
      </el-collapse>

      <el-form-item label="分類" prop="category">
        <el-select v-model="form.category" placeholder="請選擇分類" style="width: 100%">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>

      <!-- 數量與單位：自適應 Flex 佈局 -->
      <div class="inline-form-row">
        <el-form-item label="數量" prop="quantity" class="flex-item-qty">
          <el-input-number v-model="form.quantity" :min="1" :max="999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="單位" prop="unit" class="flex-item-unit">
          <el-select v-model="form.unit" placeholder="單位" style="width: 100%">
            <el-option v-for="u in units" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="購買價格" prop="price">
        <el-input-number v-model="form.price" :min="0" :precision="0" style="width: 100%" placeholder="選填" />
      </el-form-item>

      <el-form-item label="已開封">
        <div class="switch-wrapper">
          <el-switch v-model="form.isOpened" active-text="已開封" inactive-text="未開封" />
          <div v-if="form.isOpened" class="opened-hint">
            <el-icon color="var(--warning)"><WarningFilled /></el-icon> 開封後保存期限將自動縮短
          </div>
        </div>
      </el-form-item>

      <el-form-item label="保存期限" prop="expiry">
        <el-date-picker v-model="form.expiry" type="date" placeholder="選擇日期" value-format="YYYY-MM-DD" style="width: 100%" @change="isExpiryManuallyEdited = true" />
      </el-form-item>

      <el-form-item label="便利貼備註">
        <el-input v-model="form.note" type="textarea" :rows="2" placeholder="選填，例如：媽媽買的、記得先吃..." maxlength="50" show-word-limit />
      </el-form-item>

      <el-form-item style="margin-top: 24px;">
        <el-button type="primary" @click="handleSubmit" class="submit-btn">送出（可連續新增）</el-button>
      </el-form-item>
    </el-form>

    <!-- 相機模擬彈窗 -->
    <el-dialog v-model="cameraDialogVisible" title="AI 食材辨識" width="400px" align-center class="custom-app-dialog" :close-on-click-modal="false">
      <div class="camera-content">
        <div v-if="cameraStep === 'ready'" class="camera-step">
          <div class="camera-viewfinder">
            <el-icon size="48" color="#FFF"><Camera /></el-icon>
            <span class="viewfinder-text">對準食材以進行辨識</span>
          </div>
          <el-button type="primary" style="width: 100%; margin-top: 20px;" @click="startScan">開始掃描</el-button>
        </div>

        <div v-if="cameraStep === 'scanning'" class="camera-step">
          <div class="camera-viewfinder scanning">
            <div class="scan-line"></div>
            <el-icon class="is-loading" size="48" color="var(--accent)"><Loading /></el-icon>
            <span class="viewfinder-text">AI 辨識中，請稍候...</span>
          </div>
        </div>

        <div v-if="cameraStep === 'result'" class="camera-step">
          <el-result icon="success" title="辨識完成" :sub-title="`偵測到：${scanResult.name}`">
            <template #extra>
              <div class="confidence-box">
                <span>AI 置信度</span>
                <el-progress :percentage="scanResult.confidence" :color="scanResult.confidence > 90 ? 'var(--sage)' : 'var(--warning)'" />
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

/* AI 掃描卡片 */
.ai-scan-card {
  background: var(--surface);
  border: 1px dashed var(--accent);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  cursor: pointer;
  margin-bottom: var(--space-3);
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}
.ai-scan-card:hover {
  background: var(--accent-light);
  border-style: solid;
}
.scan-icon-wrapper {
  position: relative;
  width: 56px; height: 56px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #FFF;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.scan-pulse {
  position: absolute; inset: -4px; border-radius: var(--radius-md);
  border: 2px solid var(--accent);
  opacity: 0; animation: pulse-ring 2s infinite;
}
@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.5; }
  100% { transform: scale(1.2); opacity: 0; }
}
.scan-text { flex: 1; }
.scan-text h3 { margin: 0 0 4px 0; font-size: var(--text-base); color: var(--ink); font-weight: 700; }
.scan-text p { margin: 0; font-size: var(--text-xs); color: var(--muted); }
.scan-btn { flex-shrink: 0; }

.upload-section { text-align: center; margin-bottom: var(--space-4); }
.btn-photo {
  border-color: var(--border); color: var(--ink);
  transition: border-color var(--transition-fast), color var(--transition-fast);
}
.btn-photo:hover { border-color: var(--accent); color: var(--accent); }

.photo-preview-box { position: relative; width: 100%; height: 160px; border-radius: var(--radius-md); overflow: hidden; margin-bottom: var(--space-4); border: 1px solid var(--border-light); }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.preview-overlay { position: absolute; top: 8px; right: 8px; }

:deep(.el-divider__text) { color: var(--muted); background-color: var(--surface); font-size: var(--text-sm); }

/* AI 建議卡片 */
.ai-suggestion-card {
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  border: 1px solid;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}
.ai-suggestion-card.is-correct {
  background: var(--el-color-success-light-9);
  border-color: var(--el-color-success-light-5);
}
.ai-suggestion-card.is-wrong {
  background: var(--el-color-warning-light-9);
  border-color: var(--el-color-warning-light-5);
}
.suggestion-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);
}
.suggestion-title {
  font-size: var(--text-sm); font-weight: 700; display: flex; align-items: center; gap: 6px;
  color: var(--ink);
}
.is-correct .suggestion-title .el-icon { color: var(--sage); }
.is-wrong .suggestion-title .el-icon { color: var(--warning); }

.suggestion-body { font-size: var(--text-sm); line-height: 1.5; margin-bottom: var(--space-2); }
.suggest-target strong { color: var(--accent); font-size: var(--text-base); }
.suggest-desc { margin: 4px 0 0 0; color: var(--muted); font-size: var(--text-xs); }

.suggestion-action { text-align: right; margin-top: var(--space-2); }

/* 位置 Chips */
.quick-locations { display: flex; flex-wrap: wrap; gap: 8px; }
.loc-chip {
  padding: 6px 12px; border-radius: var(--radius-round); border: 1px solid var(--border);
  font-size: var(--text-sm); color: var(--muted); cursor: pointer;
  transition: border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast);
}
.loc-chip:hover { border-color: var(--accent); color: var(--accent); }
.loc-chip.active { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 600; }

.advanced-location { margin-bottom: var(--space-4); border: none; }
.advanced-location :deep(.el-collapse-item__header) { font-size: var(--text-sm); color: var(--muted); border-bottom: 1px dashed var(--border-light); }
.advanced-location :deep(.el-collapse-item__wrap) { border-bottom: none; }
.advanced-loc-grid { display: flex; gap: 12px; width: 100%; }
.advanced-loc-grid .el-form-item { flex: 1; margin-bottom: 0; }

.opened-hint { font-size: var(--text-xs); color: var(--warning); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
.switch-wrapper { display: flex; flex-direction: column; align-items: flex-start; }

/* 數量與單位 Flex 佈局 */
.inline-form-row {
  display: flex;
  gap: 16px;
}
.flex-item-qty { flex: 2; } /* 數量輸入框給較大空間 */
.flex-item-unit { flex: 1; } /* 單位選擇給較小空間 */
.inline-form-row :deep(.el-form-item__content) {
  width: 100%;
}

.submit-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
}

/* 相機模擬介面 */
.camera-content { text-align: center; }
.camera-step { display: flex; flex-direction: column; align-items: center; }
.camera-viewfinder {
  width: 100%; height: 200px; background: #211F1C; border-radius: var(--radius-md);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; position: relative; overflow: hidden; color: #FFF;
}
.viewfinder-text { font-size: var(--text-sm); color: #FFF; z-index: 2; }
.scanning .scan-line {
  position: absolute; top: 0; left: 0; width: 100%; height: 4px;
  background: var(--accent); box-shadow: 0 0 10px var(--accent);
  animation: scan 1.5s infinite linear; z-index: 1;
}
@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }

.confidence-box { width: 100%; text-align: left; margin-top: 10px; }
.confidence-box span { font-size: var(--text-xs); color: var(--muted); display: block; margin-bottom: 6px; }
.result-actions { display: flex; gap: var(--space-3); width: 100%; margin-top: var(--space-4); }
.result-actions .el-button { flex: 1; }

/* =========================================
   📱 手機端自適應優化
   ========================================= */
@media (max-width: 600px) {
  /* 1. AI 掃描卡片改為垂直堆疊 */
  .ai-scan-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  .scan-btn {
    width: 100%;
  }

  /* 2. 表單 Label 置頂 */
  .responsive-form :deep(.el-form-item) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 18px;
  }
  .responsive-form :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left;
    justify-content: flex-start;
    padding: 0 0 6px 0;
    line-height: 1.2;
    margin-bottom: 0;
  }
  .responsive-form :deep(.el-form-item__content) {
    margin-left: 0 !important;
    width: 100%;
  }

  /* 3. 進階位置雙欄改單欄 */
  .advanced-loc-grid {
    flex-direction: column;
    gap: 16px;
  }
  .advanced-loc-grid :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left;
    justify-content: flex-start;
  }

  /* 4. 數量與單位：改為垂直排列，避免輸入框過窄 */
  .inline-form-row {
    flex-direction: column;
    gap: 18px; /* 補足因 label 置頂產生的間距 */
  }

  /* 5. 日期選擇器與其他輸入框滿寬 */
  :deep(.el-date-editor.el-input) {
    width: 100% !important;
  }

  /* 6. 相機彈窗按鈕滿寬 */
  .result-actions {
    flex-direction: column;
    gap: 8px;
  }
  .result-actions .el-button {
    width: 100%;
    margin: 0;
  }
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

@media (max-width: 600px) {
  .custom-app-dialog {
    width: 92vw !important;
    max-width: 92vw;
    margin: 4vh auto !important;
  }
}
</style>