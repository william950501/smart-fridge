<script setup>
import { ref, watch, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const props = defineProps({
  visible: { type: Boolean, default: false },
  food: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'updated'])

const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()

const maxQuantity = ref(1)

const form = ref({
  id: null, name: '', category: '', quantity: 1, unit: '', price: 0, 
  zone: '', shelf: '', expiry: '', isOpened: false, openedExpiry: '', addedBy: ''
})

watch(() => props.visible, (newVal) => {
  if (newVal && props.food) {
    form.value = {
      id: props.food.id,
      name: props.food.name,
      category: props.food.category,
      quantity: props.food.quantity,
      unit: props.food.unit,
      price: props.food.price,
      zone: props.food.zone,
      shelf: props.food.shelf,
      expiry: props.food.expiry,
      isOpened: props.food.isOpened || false,
      openedExpiry: props.food.openedExpiry || '',
      addedBy: props.food.addedBy || '未知'
    }
    maxQuantity.value = props.food.quantity
  }
}, { immediate: true })

function closeDialog() { emit('update:visible', false) }

const locationText = computed(() => {
  const zone = fridgeStore.fridgeStructure.find(z => z.id === form.value.zone)
  const shelf = zone?.shelves.find(s => s.id === form.value.shelf)
  return `${zone?.name || '未知'} > ${shelf?.name || '未指定'}`
})

watch(() => form.value.isOpened, (isOpened) => {
  if (isOpened && !form.value.openedExpiry) {
    const dbItem = inventoryStore.customFoods.find(f => f.name === form.value.name)
    let defaultDays = 3
    if (dbItem && dbItem.daysAfterOpened > 0) {
      defaultDays = dbItem.daysAfterOpened
    }
    form.value.openedExpiry = dayjs().add(defaultDays, 'day').format('YYYY-MM-DD')
  }
})

const displayExpiry = computed(() => {
  return (form.value.isOpened && form.value.openedExpiry) ? form.value.openedExpiry : form.value.expiry
})

function handleSave() {
  if (form.value.quantity <= 0) {
    return ElMessage.warning('數量必須大於 0，若已吃完請點擊「標記吃完」')
  }
  
  inventoryStore.updateProgress(form.value.id, form.value.quantity)
  inventoryStore.updateOpenStatus(form.value.id, form.value.isOpened, form.value.openedExpiry)
  
  ElMessage.success('食材資訊已更新')
  emit('updated')
  closeDialog()
}

function handleEat() {
  inventoryStore.markAsEaten(form.value.id)
  ElMessage.success('已標記為吃完')
  emit('updated')
  closeDialog()
}

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
      <div class="header-info">
        <h2 class="food-title">{{ form.name }}</h2>
        <el-tag :type="inventoryStore.getStatus(form)" effect="dark" size="large">
          {{ inventoryStore.getStatusText(form) }}
        </el-tag>
      </div>

      <div class="info-grid">
        <div class="info-item"><span class="label">分類</span><span class="value">{{ form.category }}</span></div>
        <div class="info-item"><span class="label">位置</span><span class="value">{{ locationText }}</span></div>
        <div class="info-item"><span class="label">購買者</span><span class="value buyer-tag"><el-icon><User /></el-icon>{{ form.addedBy }}</span></div>
        <div class="info-item"><span class="label">價格</span><span class="value">${{ form.price }}</span></div>
        <div class="info-item"><span class="label">原始期限</span><span class="value">{{ form.expiry }}</span></div>
        <div class="info-item">
          <span class="label">目前有效期限</span>
          <span class="value" :class="{ 'opened-date': form.isOpened }">{{ displayExpiry }}</span>
        </div>
      </div>

      <el-divider />

      <div class="edit-section">
        <h4>調整剩餘數量</h4>
        <div class="slider-container">
          <!-- 移除 show-input，改用獨立的 el-input-number -->
          <el-slider v-model="form.quantity" :min="1" :max="maxQuantity" style="flex: 1;" />
          <el-input-number v-model="form.quantity" :min="1" :max="maxQuantity" :step="1" class="quantity-input" />
          <span class="unit-text">{{ form.unit }}</span>
        </div>
      </div>

      <div class="opened-section">
        <div class="opened-header">
          <span class="opened-label">是否已開封？</span>
          <el-switch v-model="form.isOpened" active-text="已開封" inactive-text="未開封" />
        </div>
        
        <div v-if="form.isOpened" class="opened-date-picker">
          <span class="date-label">開封後有效期限：</span>
          <el-date-picker 
            v-model="form.openedExpiry" 
            type="date" 
            placeholder="選擇日期" 
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
          <p class="date-hint">提示：您可以手動修改此日期，儲存後列表將以此日期為準。</p>
        </div>
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
.detail-content { padding: 0 10px; }
.header-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.food-title { margin: 0; font-size: 24px; color: var(--el-text-color-primary); font-weight: bold; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-item .label { font-size: 13px; color: var(--el-text-color-secondary); }
.info-item .value { font-size: 15px; font-weight: 500; color: var(--el-text-color-primary); }
.buyer-tag { display: flex; align-items: center; gap: 4px; color: var(--el-color-success); }
.opened-date { color: var(--el-color-warning); font-weight: bold; }
.edit-section h4, .opened-section h4 { margin: 0 0 16px 0; color: var(--el-text-color-primary); font-size: 15px; }

/* 調整滑條與輸入框的排版 */
.slider-container { display: flex; align-items: center; gap: 12px; }
.quantity-input { width: 110px; flex-shrink: 0; }
.unit-text { color: var(--el-text-color-regular); font-weight: bold; white-space: nowrap; }

.opened-section { margin-top: 24px; background: var(--el-fill-color-lighter); padding: 16px; border-radius: 12px; border: 1px dashed var(--el-border-color); }
.opened-header { display: flex; justify-content: space-between; align-items: center; }
.opened-label { font-size: 15px; font-weight: 600; color: var(--el-text-color-primary); }
.opened-date-picker { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--el-border-color-lighter); }
.date-label { display: block; font-size: 14px; color: var(--el-text-color-secondary); margin-bottom: 8px; }
.date-hint { font-size: 12px; color: var(--el-text-color-secondary); margin: 8px 0 0 0; }
.dialog-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.left-actions, .right-actions { display: flex; gap: 10px; }
</style>