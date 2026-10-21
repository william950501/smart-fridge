<script setup>
import { ref, watch, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const props = defineProps({
  visible: { type: Boolean, default: false },
  food: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'updated'])

const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()

// 本地表單狀態，避免直接修改 props
const form = ref({
  id: null,
  name: '',
  category: '',
  quantity: 1,
  unit: '',
  price: 0,
  zone: '',
  shelf: '',
  expiry: '',
  isOpened: false
})

// 當彈窗打開或 food 改變時，同步資料
watch(() => props.visible, (newVal) => {
  if (newVal && props.food) {
    form.value = {
      ...props.food,
      isOpened: false // 預設為未開封，若要記錄需在後端加欄位
    }
  }
})

// 關閉彈窗
function closeDialog() {
  emit('update:visible', false)
}

// 取得存放位置文字
const locationText = computed(() => {
  const zone = fridgeStore.fridgeStructure.find(z => z.id === form.value.zone)
  const shelf = zone?.shelves.find(s => s.id === form.value.shelf)
  return `${zone?.name || '未知'} > ${shelf?.name || '未指定'}`
})

// 監聽開封狀態，自動縮短期限 (US-23)
watch(() => form.value.isOpened, (isOpened) => {
  if (isOpened) {
    // 這裡簡單模擬：如果開封，期限強制改為 3 天後 (實務上應對應食材庫的天數)
    const newExpiry = dayjs().add(3, 'day').format('YYYY-MM-DD')
    if (newExpiry < form.value.expiry) {
      form.value.expiry = newExpiry
      ElMessage.warning('已開封，保存期限已自動縮短')
    }
  }
})

// 儲存修改
function handleSave() {
  if (form.value.quantity <= 0) {
    return ElMessage.warning('數量必須大於 0，若已吃完請點擊「標記吃完」')
  }
  inventoryStore.updateProgress(form.value.id, form.value.quantity)
  ElMessage.success('食材資訊已更新')
  emit('updated')
  closeDialog()
}

// 標記吃完
function handleEat() {
  inventoryStore.markAsEaten(form.value.id)
  ElMessage.success('已標記為吃完')
  emit('updated')
  closeDialog()
}

// 標記丟棄
function handleDiscard() {
  ElMessageBox.prompt('請輸入丟棄數量', '丟棄食材', {
    confirmButtonText: '確定', cancelButtonText: '取消',
    inputPattern: /^[1-9]\d*$/,
    inputValidator: (val) => Number(val) <= form.value.quantity || `不能超過現有數量 ${form.value.quantity}`,
  }).then(({ value }) => {
    inventoryStore.markAsDiscarded(form.value.id, Number(value))
    ElMessage.warning('已記錄丟棄')
    emit('updated')
    closeDialog()
  }).catch(() => {})
}
</script>

<template>
  <el-dialog 
    :model-value="visible" 
    @update:model-value="emit('update:visible', $event)"
    title="食材詳細資訊" 
    width="450px" 
    align-center 
    class="custom-app-dialog"
  >
    <div class="detail-content">
      <!-- 頂部資訊 -->
      <div class="header-info">
        <h2 class="food-title">{{ form.name }}</h2>
        <el-tag :type="inventoryStore.getStatus(form.expiry)" effect="dark" size="large">
          {{ inventoryStore.getStatusText(form.expiry) }}
        </el-tag>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span class="label">分類</span>
          <span class="value">{{ form.category }}</span>
        </div>
        <div class="info-item">
          <span class="label">位置</span>
          <span class="value">{{ locationText }}</span>
        </div>
        <div class="info-item">
          <span class="label">購買價格</span>
          <span class="value">${{ form.price }}</span>
        </div>
        <div class="info-item">
          <span class="label">保存期限</span>
          <span class="value">{{ form.expiry }}</span>
        </div>
      </div>

      <el-divider />

      <!-- 編輯區塊 -->
      <div class="edit-section">
        <h4>調整剩餘數量</h4>
        <div class="slider-container">
          <el-slider 
            v-model="form.quantity" 
            :min="1" 
            :max="Math.max(form.quantity, 10)" 
            show-input 
            :show-input-controls="false"
          />
          <span class="unit-text">{{ form.unit }}</span>
        </div>
      </div>

      <!-- US-23: 開封連動 -->
      <div class="opened-section">
        <div class="opened-header">
          <span>是否已開封？</span>
          <el-switch v-model="form.isOpened" active-text="已開封" inactive-text="未開封" />
        </div>
        <p class="opened-hint" v-if="form.isOpened">
          已開封的食材保存期限會縮短，請盡快食用。
        </p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <div class="left-actions">
          <el-button type="success" plain @click="handleEat">標記吃完</el-button>
          <el-button type="danger" plain @click="handleDiscard">標記丟棄</el-button>
        </div>
        <div class="right-actions">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="handleSave">儲存修改</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.detail-content {
  padding: 0 10px;
}

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.food-title {
  margin: 0;
  font-size: 24px;
  color: var(--el-text-color-primary);
  font-weight: bold;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.info-item .value {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.edit-section h4, .opened-section h4 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 10px;
}

.unit-text {
  color: var(--el-text-color-regular);
  font-weight: bold;
  white-space: nowrap;
}

.opened-section {
  margin-top: 24px;
  background: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 8px;
}

.opened-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.opened-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--el-color-warning);
}

/* 自訂 Footer 排版 */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.left-actions, .right-actions {
  display: flex;
  gap: 10px;
}
</style>