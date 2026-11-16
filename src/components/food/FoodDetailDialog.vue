<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInventoryStore, foodDatabase } from '@/stores/inventory'
import { useFridgeStore } from '@/stores/fridge'
import { ElMessage } from 'element-plus'
import { User, WarningFilled, ChatDotRound, Clock, Bowl, Check, Delete, Location, Sort, Right } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const props = defineProps({
  visible: { type: Boolean, default: false },
  food: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'updated'])
const router = useRouter()

const inventoryStore = useInventoryStore()
const fridgeStore = useFridgeStore()

const maxQuantity = ref(1)

const form = ref({
  id: null, name: '', category: '', quantity: 1, originalQuantity: 0,
  unit: '', price: 0, zone: '', shelf: '', expiry: '',
  isOpened: false, openedAt: '', openedExpiry: '',
  addedBy: '', note: '', discardedQuantity: 0, moveHistory: []
})

const discardDialogVisible = ref(false)
const discardQuantity = ref(1)

watch([() => props.visible, () => props.food], ([newVisible, newFood]) => {
  if (newVisible && newFood && newFood.id) {
    form.value = {
      id: newFood.id,
      name: newFood.name || '',
      category: newFood.category || '其他',
      quantity: Number(newFood.quantity) || 1,
      originalQuantity: Number(newFood.originalQuantity) || Number(newFood.quantity) || 1,
      unit: newFood.unit || '個',
      price: Number(newFood.price) || 0,
      zone: newFood.zone || '',
      shelf: newFood.shelf || '',
      expiry: newFood.expiry || '',
      isOpened: Boolean(newFood.isOpened),
      openedAt: newFood.openedAt || '',
      openedExpiry: newFood.openedExpiry || '',
      addedBy: newFood.addedBy || '未知',
      note: newFood.note || '',
      discardedQuantity: Number(newFood.discardedQuantity) || 0,
      moveHistory: newFood.moveHistory || [] // 🌟 接收移動歷史
    }
    maxQuantity.value = form.value.quantity
  }
}, { deep: true, immediate: true })

function closeDialog() { emit('update:visible', false) }

const locationText = computed(() => {
  if (!form.value.zone) return '未指定位置'
  const zone = fridgeStore.fridgeStructure.find(z => z.id === form.value.zone)
  if (!zone) return '未指定位置'
  if (!form.value.shelf) return `${zone.name} > 未指定`
  const shelf = zone.shelves.find(s => s.id === form.value.shelf)
  return `${zone.name} > ${shelf?.name || '未指定'}`
})

watch(() => form.value.isOpened, (isOpened) => {
  if (isOpened && !form.value.openedExpiry) {
    const dbItem = foodDatabase[form.value.name]
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

const openedDaysAgo = computed(() => {
  if (!form.value.isOpened || !form.value.openedAt) return null
  const opened = dayjs(form.value.openedAt).startOf('day')
  const today = dayjs().startOf('day')
  const diff = today.diff(opened, 'day')
  return diff >= 0 ? diff : 0
})

const isFullDiscard = computed(() => discardQuantity.value >= form.value.quantity)

const safeStatus = computed(() => {
  if (!form.value.expiry && !form.value.openedExpiry) return 'info'
  const status = inventoryStore.getStatus(form.value)
  return ['success', 'warning', 'danger', 'info'].includes(status) ? status : 'info'
})

// 格式化日期 (只保留 MM/DD)
const formatShortDate = (dateStr) => {
  if (!dateStr) return ''
  return dayjs(dateStr).format('MM/DD')
}

function handleSave() {
  if (form.value.quantity <= 0) {
    return ElMessage.warning('數量必須大於 0，若已吃完請點擊「標記吃完」')
  }
  if (!form.value.expiry) {
    return ElMessage.warning('請選擇保存期限，不可清空日期')
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

function openDiscardDialog() {
  discardQuantity.value = 1
  discardDialogVisible.value = true
}

function confirmDiscard() {
  if (discardQuantity.value < 1) {
    return ElMessage.warning('丟棄數量必須大於 0')
  }
  if (discardQuantity.value > form.value.quantity) {
    return ElMessage.warning(`不能超過現有數量 ${form.value.quantity}`)
  }

  const qty = discardQuantity.value
  const willBeFullDiscard = qty >= form.value.quantity

  inventoryStore.markAsDiscarded(form.value.id, qty)

  if (willBeFullDiscard) {
    ElMessage.warning(`已將「${form.value.name}」全部丟棄，已移至回收桶`)
    emit('updated')
    discardDialogVisible.value = false
    closeDialog()
  } else {
    ElMessage.warning(`已將「${form.value.name}」丟棄 ${qty} ${form.value.unit}，還剩 ${form.value.quantity - qty} ${form.value.unit}`)
    form.value.quantity -= qty
    form.value.discardedQuantity = (form.value.discardedQuantity || 0) + qty
    maxQuantity.value = form.value.quantity
    emit('updated')
    discardDialogVisible.value = false
  }
}

function goToRecipe() {
  closeDialog()
  router.push({ path: '/recipe', query: { food: form.value.name } })
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    width="480px"
    align-center
    class="custom-app-dialog detail-dialog"
    append-to-body
  >
    <template #header>
      <div class="dialog-header">
        <h2 class="food-title">{{ form.name }}</h2>
        <el-tag :type="safeStatus" effect="dark" size="large" round>
          {{ inventoryStore.getStatusText(form) }}
        </el-tag>
      </div>
    </template>

    <div class="detail-content">
      <div class="info-grid">
        <div class="info-item"><span class="label">分類</span><span class="value">{{ form.category }}</span></div>
        <div class="info-item">
          <span class="label">位置</span>
          <span class="value location-val" :class="{ 'unassigned': !form.zone }">
            <el-icon v-if="form.zone"><Location /></el-icon>{{ locationText }}
          </span>
        </div>
        <div class="info-item"><span class="label">購買者</span><span class="value buyer-tag"><el-icon><User /></el-icon>{{ form.addedBy }}</span></div>
        <div class="info-item"><span class="label">價格</span><span class="value">{{ form.price > 0 ? `$${form.price}` : '未記錄' }}</span></div>
        
        <div class="info-item"><span class="label">原始期限</span><span class="value">{{ form.expiry || '無' }}</span></div>
        <div class="info-item">
          <span class="label">目前有效期限</span>
          <span class="value" :class="{ 'opened-date': form.isOpened }">{{ displayExpiry || '無' }}</span>
        </div>
        <div v-if="form.discardedQuantity > 0" class="info-item discarded-item">
          <span class="label">累計丟棄</span>
          <span class="value discarded-value">{{ form.discardedQuantity }} {{ form.unit }}</span>
        </div>
        <div v-if="form.isOpened && openedDaysAgo !== null" class="info-item">
          <span class="label">已開封</span>
          <span class="value opened-days">
            <el-icon><Clock /></el-icon>
            {{ openedDaysAgo === 0 ? '今天開封' : `${openedDaysAgo} 天` }}
          </span>
        </div>
      </div>

      <!-- 🌟 食材歷程時間軸（整合移動紀錄） -->
      <div class="timeline-section">
        <div class="timeline-title">食材歷程</div>
        <div class="timeline-list">
          
          <!-- 1. 入庫節點 -->
          <div class="timeline-item">
            <div class="dot in-stock"></div>
            <div class="time-content">
              <span class="time-label">入庫</span>
              <span class="time-desc">剩餘 {{ form.quantity }} {{ form.unit }}</span>
            </div>
          </div>

          <!-- 2. 開封節點 -->
          <div v-if="form.isOpened" class="timeline-item">
            <div class="dot opened"></div>
            <div class="time-content">
              <span class="time-label">已開封</span>
              <span class="time-desc">有效期限縮短至 {{ form.openedExpiry }}</span>
            </div>
          </div>

          <!-- 3. 移動紀錄節點（遍歷 moveHistory） -->
          <div 
            v-for="(move, index) in form.moveHistory" 
            :key="'move-'+index" 
            class="timeline-item move-item"
          >
            <div class="dot moved"></div>
            <div class="time-content">
              <span class="time-label">
                <el-icon><Sort /></el-icon> 移動位置
                <span class="move-date">{{ formatShortDate(move.date) }}</span>
              </span>
              <div class="move-detail">
                <span class="move-from">{{ move.from }}</span>
                <el-icon><Right /></el-icon>
                <span class="move-to">{{ move.to }}</span>
              </div>
              <span v-if="move.note && move.note !== '移動位置'" class="move-note">
                {{ move.note }}
              </span>
            </div>
          </div>

          <!-- 4. 當前狀態節點 -->
          <div class="timeline-item current-item">
            <div class="dot current"></div>
            <div class="time-content">
              <span class="time-label">當前狀態</span>
              <span class="time-desc">{{ inventoryStore.getStatusText(form) }}</span>
            </div>
          </div>

        </div>
      </div>

      <div v-if="form.note" class="note-section">
        <div class="note-header">
          <el-icon><ChatDotRound /></el-icon> 便利貼備註
        </div>
        <div class="note-body">{{ form.note }}</div>
      </div>

      <!-- 調整數量區塊 -->
      <div class="edit-section">
        <h4>調整剩餘數量</h4>
        <div class="slider-container">
          <el-slider v-model="form.quantity" :min="1" :max="maxQuantity" class="slider-input" />
          <div class="quantity-input-group">
            <el-input-number v-model="form.quantity" :min="1" :max="maxQuantity" :step="1" class="quantity-input" />
            <span class="unit-text">{{ form.unit }}</span>
          </div>
        </div>
        <p v-if="form.originalQuantity > form.quantity" class="quantity-hint">
          原始入庫：{{ form.originalQuantity }} {{ form.unit }} ・ 目前已用：{{ form.originalQuantity - form.quantity }} {{ form.unit }}
        </p>
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
      <div class="dialog-footer-grid">
        <el-button plain class="action-btn-recipe grid-full" @click="goToRecipe" :icon="Bowl">能煮什麼？</el-button>
        
        <div class="footer-actions-row">
          <el-button type="danger" plain @click="openDiscardDialog" :icon="Delete">丟棄</el-button>
          <el-button type="success" plain @click="handleEat" :icon="Check">吃完</el-button>
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="handleSave">儲存</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <el-dialog v-model="discardDialogVisible" title="丟棄食材" width="420px" align-center class="custom-app-dialog" append-to-body>
    <div class="discard-dialog-content">
      <el-icon size="56" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
      <h3 class="discard-title">確定要丟棄「{{ form.name }}」嗎？</h3>
      <p class="discard-subtitle">目前庫存：{{ form.quantity }} {{ form.unit }}</p>

      <div class="discard-qty-wrapper">
        <span class="label">丟棄數量：</span>
        <el-input-number v-model="discardQuantity" :min="1" :max="form.quantity" :step="1" size="large" class="discard-input" />
        <span class="unit">{{ form.unit }}</span>
      </div>

      <div class="discard-preview" :class="isFullDiscard ? 'preview-full' : 'preview-partial'">
        <template v-if="isFullDiscard">
          <el-icon><WarningFilled /></el-icon>
          <span>將<strong>全部丟棄</strong>，此食材會移至回收桶（30 天內可還原）</span>
        </template>
        <template v-else>
          <el-icon><WarningFilled /></el-icon>
          <span>將丟棄 <strong>{{ discardQuantity }}</strong> {{ form.unit }}，冰箱內<strong>保留 {{ form.quantity - discardQuantity }}</strong> {{ form.unit }}</span>
        </template>
      </div>

      <div class="discard-hint">
        <el-alert title="丟棄後將計入本月浪費金額。若為全部丟棄會移至回收桶，30 天內皆可還原。" type="warning" show-icon :closable="false" />
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer-center">
        <el-button @click="discardDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDiscard">確定丟棄</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.detail-dialog :deep(.el-dialog__header) {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.food-title { margin: 0; font-size: 22px; color: var(--ink); font-family: var(--font-display); font-weight: 700; }

.detail-content { 
  padding: 0 10px; 
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.info-grid { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 16px; 
  margin-bottom: 20px; 
}
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-item .label { font-size: var(--text-xs); color: var(--muted); }
.info-item .value { font-size: var(--text-sm); font-weight: 500; color: var(--ink); word-break: break-word; }
.location-val { display: flex; align-items: flex-start; gap: 4px; }
.buyer-tag { display: flex; align-items: center; gap: 4px; color: var(--sage); }
.opened-date { color: var(--warning); font-weight: bold; }
.unassigned { color: var(--muted); font-style: italic; }
.opened-days { display: flex; align-items: center; gap: 4px; color: var(--warning); }
.discarded-item .discarded-value { color: var(--danger); font-weight: 600; }

/* 🌟 時間軸優化 */
.timeline-section {
  background: var(--surface-hover);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  border: 1px solid var(--border-light);
}
.timeline-title { font-size: var(--text-sm); font-weight: 600; color: var(--ink); margin-bottom: 12px; }
.timeline-list { position: relative; padding-left: 12px; }
.timeline-list::before {
  content: ''; position: absolute; left: 16px; top: 6px; bottom: 6px;
  width: 2px; background: var(--border); z-index: 1;
}
.timeline-item { display: flex; gap: 12px; position: relative; z-index: 2; margin-bottom: 16px; }
.timeline-item:last-child { margin-bottom: 0; }
.dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; border: 2px solid var(--surface); }
.dot.in-stock { background: var(--accent); }
.dot.opened { background: var(--warning); }
.dot.moved { background: #8B5CF6; } /* 移動用紫色標記 */
.dot.current { background: var(--sage); }

.time-content { display: flex; flex-direction: column; gap: 2px; width: 100%; }
.time-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 4px; }
.time-desc { font-size: var(--text-xs); color: var(--muted); }

/* 移動紀錄專屬樣式 */
.move-date { font-size: 11px; color: var(--muted); margin-left: 4px; font-weight: normal; }
.move-detail { display: flex; align-items: center; gap: 4px; font-size: var(--text-xs); color: var(--muted); margin-top: 2px; }
.move-detail .move-from { text-decoration: line-through; opacity: 0.7; }
.move-detail .move-to { font-weight: 600; color: #8B5CF6; }
.move-note { font-size: 11px; color: var(--accent); margin-top: 2px; display: inline-block; }

.note-section {
  margin-bottom: 20px;
  background: var(--accent-light);
  border: 1px dashed var(--accent);
  border-radius: var(--radius-md);
  padding: 12px 16px;
}
.note-header {
  font-size: var(--text-xs); font-weight: 600; color: var(--accent);
  display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
}
.note-body { font-size: var(--text-sm); color: var(--ink); line-height: 1.5; white-space: pre-wrap; }

.edit-section h4 { margin: 0 0 12px 0; color: var(--ink); font-size: var(--text-sm); }
.slider-container { display: flex; flex-direction: column; gap: 16px; }
.slider-input { width: 100%; }
.quantity-input-group { display: flex; align-items: center; gap: 12px; }
.quantity-input { width: 140px; }
.unit-text { color: var(--muted); font-weight: 500; white-space: nowrap; }
.quantity-hint { font-size: var(--text-xs); color: var(--muted); margin: 12px 0 0 0; }

.opened-section { margin-top: 20px; background: var(--ground); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border); }
.opened-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.opened-label { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
.opened-date-picker { margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border); }
.date-label { display: block; font-size: var(--text-xs); color: var(--muted); margin-bottom: 8px; }
.date-hint { font-size: var(--text-xs); color: var(--muted); margin: 8px 0 0 0; }

.dialog-footer-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  flex-shrink: 0;
}

.grid-full { width: 100%; }

.footer-actions-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.footer-actions-row .el-button {
  flex: 1;
  margin: 0 !important;
}

.action-btn-recipe {
  border-color: var(--border) !important;
  color: var(--ink) !important;
}
.action-btn-recipe:hover { 
  border-color: var(--accent) !important; 
  color: var(--accent) !important; 
  background: var(--accent-light) !important; 
}

/* 丟棄彈窗樣式 */
.discard-dialog-content { text-align: center; padding: 10px 0; }
.discard-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.discard-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; }

.discard-qty-wrapper { display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 16px; }
.discard-qty-wrapper .label { font-size: var(--text-base); color: var(--ink); font-weight: 500; }
.discard-qty-wrapper .unit { font-size: var(--text-base); color: var(--muted); }
.discard-input { width: 140px; }

.discard-preview {
  display: flex; align-items: center; gap: 8px; padding: 12px 16px;
  border-radius: var(--radius-sm); font-size: var(--text-sm); line-height: 1.5;
  text-align: left; margin-bottom: 16px; border: 1px solid;
}
.discard-preview strong { font-weight: 700; }
.preview-partial { background: var(--el-color-warning-light-9); border-color: var(--el-color-warning-light-5); color: var(--el-color-warning-dark-2); }
.preview-full { background: var(--el-color-danger-light-9); border-color: var(--el-color-danger-light-5); color: var(--el-color-danger-dark-2); }

.discard-hint { text-align: left; }
.dialog-footer-center { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer-center .el-button { width: 120px; margin: 0; }

/* 手機端專屬自適應 */
@media (max-width: 601px) {
  .detail-content {
    max-height: calc(100vh - 200px);
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .dialog-footer-grid {
    flex-direction: column;
  }

  .footer-actions-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .footer-actions-row .el-button {
    width: 100%;
  }

  .discard-qty-wrapper {
    flex-wrap: wrap;
    justify-content: center;
  }
  .discard-input {
    width: 120px;
  }
}
</style>

<style>
.custom-app-dialog { 
  --el-dialog-bg-color: var(--surface); 
  --el-dialog-border-radius: var(--radius-lg); 
  --el-dialog-padding-primary: 24px; 
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.custom-app-dialog .el-dialog__header { 
  margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light); 
  padding-bottom: 16px; margin-bottom: 16px; 
}
.custom-app-dialog .el-dialog__title { 
  font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); 
}
.custom-app-dialog .el-dialog__body {
  flex: 1;
  overflow: hidden;
  padding-top: 0;
}
.custom-app-dialog .el-dialog__footer {
  flex-shrink: 0;
}

@media (max-width: 601px) {
  .custom-app-dialog {
    width: 92vw !important;
    max-width: 92vw;
    margin: 4vh auto !important;
  }
}
</style>