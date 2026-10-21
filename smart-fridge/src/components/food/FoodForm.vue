<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { foodDatabase, useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'

const props = defineProps({
  initialZone: { type: String, default: '' },
  initialShelf: { type: String, default: '' },
  autoScan: { type: Boolean, default: false } // 新增：是否自動觸發拍照
})

const emit = defineEmits(['submit'])
const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()
const formRef = ref(null)

const form = reactive({
  name: '', category: '', quantity: 1, unit: '', price: 0, 
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

// 初始化
onMounted(() => {
  if (!props.initialZone || !props.initialShelf) {
    const zoneData = fridgeStore.fridgeStructure.find(z => z.id === form.zone)
    if (zoneData && zoneData.shelves.length > 0) form.shelf = zoneData.shelves[0].id
  }
  // 如果設定為自動掃描，延遲一點點讓彈窗動畫跑完後觸發
  if (props.autoScan) {
    setTimeout(() => {
      simulatePhotoScan()
    }, 300)
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

const isScanning = ref(false)
function simulatePhotoScan() {
  isScanning.value = true
  setTimeout(() => {
    isScanning.value = false
    const keys = Object.keys(foodDatabase)
    const randomFood = keys[Math.floor(Math.random() * keys.length)]
    form.name = randomFood
    form.quantity = Math.floor(Math.random() * 3) + 1
    form.price = Math.floor(Math.random() * 100) + 20
    ElMessage.success(`AI 辨識成功：偵測到「${randomFood}」`)
  }, 1500)
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

function handleReset() {
  formRef.value?.resetFields()
  form.isOpened = false
}
</script>

<template>
  <div class="food-form-wrapper">
    <div class="scan-section">
      <el-button type="primary" plain :loading="isScanning" @click="simulatePhotoScan" style="width: 100%;">
        <el-icon v-if="!isScanning" style="margin-right: 8px;"><Camera /></el-icon>
        {{ isScanning ? 'AI 正在辨識中...' : '📷 拍照辨識食材 (模擬)' }}
      </el-button>
      <p class="scan-hint">對準食材拍照，AI 將自動填入名稱與數量</p>
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
  </div>
</template>

<style scoped>
.food-form-wrapper { padding: 0 10px; }
.scan-section { text-align: center; margin-bottom: 20px; }
.scan-hint { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 8px; }
:deep(.el-divider__text) { color: var(--el-text-color-secondary); background-color: var(--el-bg-color-overlay); }
.opened-hint { font-size: 12px; color: var(--el-color-warning); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
</style>