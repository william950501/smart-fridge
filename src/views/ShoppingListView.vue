<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useShoppingStore } from '@/stores/shopping'
import { useInventoryStore, foodDatabase } from '@/stores/inventory'
import { useRecipeStore } from '@/stores/recipe'
import { useToast } from '@/composables/useToast'
import FoodForm from '@/components/food/FoodForm.vue'
import PriceCompare from '@/components/shopping/PriceCompare.vue'
import SmartEmpty from '@/components/empty/SmartEmpty.vue'
import { Plus, Upload, MagicStick, ShoppingCart, Food, Wallet, Warning, CircleCheck, DocumentCopy, Grid, List, Delete } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const shoppingStore = useShoppingStore()
const inventoryStore = useInventoryStore()
const recipeStore = useRecipeStore()
const { showToast } = useToast()

const form = reactive({ name: '', quantity: 1, unit: '個', price: 0 })
const units = ['個', '顆', '瓶', '包', '盒', '罐', '把', '克', '毫升', '片', '杯', '條', '根']
const inputRef = ref(null)
const registerDialogVisible = ref(false)
const currentRegisterItem = ref(null)

const costMode = ref('unpurchased')
const unknownPriceFallback = 50
const groupByCategory = ref(false)

const allFoodNames = computed(() => Object.keys(foodDatabase))

function querySearch(queryString, cb) {
  const results = queryString
    ? allFoodNames.value.filter(name => name.toLowerCase().includes(queryString.toLowerCase()))
    : allFoodNames.value
  cb(results.map(name => ({ value: name })))
}

function handleSelectFood(item) {
  const dbItem = foodDatabase[item.value]
  if (dbItem) {
    form.unit = dbItem.unit
    form.price = dbItem.unitPrice || 0
  }
}

// 缺少食材與營養建議
const missingFromMealPlan = computed(() => {
  const needed = new Set()
  Object.values(recipeStore.mealPlan).forEach(day => {
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      if (day[meal]) day[meal].ingredients.forEach(ing => needed.add(ing))
    })
  })
  const available = inventoryStore.activeFoods.map(f => f.name)
  const inShoppingList = shoppingStore.items.map(i => i.name)
  
  return Array.from(needed).filter(ing => !available.includes(ing) && !inShoppingList.includes(ing))
})

const nutritionAdvice = computed(() => {
  if (inventoryStore.activeFoods.length === 0) return null
  const count = {}
  inventoryStore.activeFoods.forEach(f => {
    count[f.category] = (count[f.category] || 0) + 1
  })
  const total = inventoryStore.activeFoods.length
  const veggie = (count['蔬菜'] || 0) + (count['水果'] || 0)
  
  if (veggie / total < 0.3) {
    return { title: '蔬菜水果不足', items: ['高麗菜', '番茄', '菠菜', '蘋果'] }
  }
  return null
})

// 花費預估
const costData = computed(() => {
  let items = []
  if (costMode.value === 'unpurchased') items = shoppingStore.items.filter(i => !i.isPurchased)
  else if (costMode.value === 'purchased') items = shoppingStore.items.filter(i => i.isPurchased)
  else items = shoppingStore.items

  let total = 0
  let unknownCount = 0
  
  items.forEach(item => {
    const price = item.unitPrice > 0 ? item.unitPrice : unknownPriceFallback
    if (!(item.unitPrice > 0)) unknownCount++
    total += price * item.quantity
  })
  
  return { total, unknownCount, count: items.length }
})

const costModeText = computed(() => {
  const map = { 'unpurchased': '未購買', 'purchased': '已勾選', 'all': '全部' }
  return map[costMode.value]
})

// 依超市分區分組
const groupedItems = computed(() => {
  const groups = {
    '生鮮蔬果': [],
    '肉品海鮮': [],
    '乳製品蛋類': [],
    '飲品': [],
    '調味料': [],
    '其他': []
  }

  shoppingStore.items.forEach(item => {
    const cat = shoppingStore.getCategoryForItem(item.name)
    if (groups[cat]) {
      groups[cat].push(item)
    } else {
      groups['其他'].push(item)
    }
  })

  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) delete groups[key]
  })

  return groups
})

// 監聽路由 action
watch(() => route.query.action, (action) => {
  if (action === 'add') {
    setTimeout(() => { inputRef.value?.focus(); ElMessage.info('請輸入要加入購物清單的品項') }, 300)
    router.replace({ query: { ...route.query, action: undefined } })
  }
}, { immediate: true })

function fillMissingFromMealPlan() {
  if (missingFromMealPlan.value.length === 0) {
    return ElMessage.info('本週菜單所需食材都已齊全或在購物清單中！')
  }
  missingFromMealPlan.value.forEach(name => {
    const dbItem = foodDatabase[name]
    shoppingStore.addItem({ 
      name, 
      quantity: 1, 
      unit: dbItem?.unit || '份',
      unitPrice: dbItem?.unitPrice || 0
    }, true)
  })
  ElMessage.success(`已將 ${missingFromMealPlan.value.length} 樣缺少食材加入購物清單！`)
}

function addNutritionItems(items) {
  let added = 0
  items.forEach(name => {
    const exists = shoppingStore.items.find(i => i.name === name && !i.isPurchased)
    if (!exists) {
      const dbItem = foodDatabase[name]
      shoppingStore.addItem({ 
        name, 
        quantity: 1, 
        unit: dbItem?.unit || '份',
        unitPrice: dbItem?.unitPrice || 0
      }, true)
      added++
    }
  })
  if (added > 0) ElMessage.success(`已加入 ${added} 樣建議食材`)
  else ElMessage.info('這些食材已在清單中！')
}

async function handleAdd() {
  if (!form.name.trim()) return ElMessage.warning('請輸入要購買的品項')
  
  const foodName = form.name.trim()
  
  const exists = shoppingStore.items.find(i => i.name === foodName && !i.isPurchased)
  if (exists) {
    return ElMessage.warning(`「${foodName}」已經在購物清單中囉！`)
  }

  const inStock = inventoryStore.activeFoods.find(f => f.name === foodName)
  if (inStock) {
    try {
      await ElMessageBox.confirm(
        `冰箱內還有 ${inStock.quantity} ${inStock.unit} 的「${foodName}」，確定要加購嗎？`,
        '庫存提醒',
        { confirmButtonText: '確定加購', cancelButtonText: '取消', type: 'warning' }
      )
    } catch (e) {
      return
    }
  }

  shoppingStore.addItem({ 
    name: foodName, 
    quantity: form.quantity, 
    unit: form.unit, 
    unitPrice: form.price 
  })
  ElMessage.success('已加入購物清單')
  
  form.name = ''
  form.quantity = 1
  form.unit = '個'
  form.price = 0
  nextTick(() => { inputRef.value?.focus() })
}

function handleRemove(id) { 
  shoppingStore.removeItem(id) 
}

function openRegisterDialog(item) {
  currentRegisterItem.value = item
  registerDialogVisible.value = true
}

function handleRegisterSubmit(foodData) {
  if (currentRegisterItem.value) {
    inventoryStore.addFood(foodData)
    shoppingStore.removeItem(currentRegisterItem.value.id)
    showToast({
      title: `已將「${foodData.name}」登記至庫存`,
      message: '可前往食材管理查看',
      type: 'success'
    })
    registerDialogVisible.value = false
    currentRegisterItem.value = null
  }
}

function handlePriceChange(row) {
  shoppingStore.updateItemPrice(row.id, row.unitPrice || 0)
}

function focusInput() {
  nextTick(() => { inputRef.value?.focus() })
}

function copyShoppingList() {
  const unpurchased = shoppingStore.items.filter(i => !i.isPurchased)
  if (unpurchased.length === 0) return ElMessage.warning('目前沒有未購買的項目')

  let text = '【鮮知購物清單】\n'
  unpurchased.forEach(item => {
    text += `- ${item.name} ${item.quantity}${item.unit}\n`
  })

  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('清單已複製，可貼到 LINE 給家人')
  }).catch(() => {
    ElMessage.error('複製失敗')
  })
}
</script>

<template>
  <div class="shopping-container">
    <div class="page-header">
      <div>
        <h2>家庭購物清單</h2>
        <p class="hint">勾選已購買的項目，可直接登記至冰箱庫存</p>
      </div>
      <div class="header-actions">
        <div class="tag-group">
          <el-tag type="warning" effect="light" size="large" round>待購買：{{ shoppingStore.pendingCount }}</el-tag>
          <el-tag type="success" effect="light" size="large" round>已購買：{{ shoppingStore.purchasedCount }}</el-tag>
        </div>
        <el-button plain :icon="DocumentCopy" @click="copyShoppingList" class="copy-btn">複製清單</el-button>
      </div>
    </div>

    <!-- AI 採買指南 -->
    <el-card shadow="never" class="ai-guide-card">
      <template #header>
        <div class="ai-guide-header">
          <div class="ai-title"><el-icon><MagicStick /></el-icon> AI 飲食與採買指南</div>
        </div>
      </template>

      <div v-if="missingFromMealPlan.length > 0" class="guide-section">
        <div class="guide-item-title">
          <el-icon color="var(--accent)"><Food /></el-icon>
          本週菜單還缺少 {{ missingFromMealPlan.length }} 樣食材：
        </div>
        <div class="guide-items">
          <el-tag v-for="item in missingFromMealPlan" :key="item" size="default" type="primary" effect="plain" round>{{ item }}</el-tag>
        </div>
        <el-button type="primary" plain @click="fillMissingFromMealPlan" class="guide-btn" :icon="Plus" round>
          一鍵補齊本週菜單
        </el-button>
      </div>

      <div v-if="nutritionAdvice" class="guide-section">
        <div class="guide-item-title">
          <el-icon color="var(--warning)"><Warning /></el-icon>
          營養提醒：{{ nutritionAdvice.title }}
        </div>
        <div class="guide-items">
          <el-tag v-for="item in nutritionAdvice.items" :key="item" size="default" type="warning" effect="plain" round>{{ item }}</el-tag>
        </div>
        <el-button type="warning" plain @click="addNutritionItems(nutritionAdvice.items)" class="guide-btn" :icon="Plus" round>
          加入建議食材
        </el-button>
      </div>

      <div v-if="missingFromMealPlan.length === 0 && !nutritionAdvice" class="all-good">
        <el-icon size="20" color="var(--sage)"><CircleCheck /></el-icon>
        <span>太棒了！本週菜單食材已齊全，營養也很均衡。</span>
      </div>
    </el-card>

    <!-- 快速新增區塊 -->
    <el-card shadow="never" class="add-card">
      <div class="add-form">
        <el-autocomplete
          ref="inputRef"
          v-model="form.name"
          :fetch-suggestions="querySearch"
          placeholder="輸入或點擊選擇要買的東西"
          @select="handleSelectFood"
          @keyup.enter="handleAdd"
          clearable
          size="large"
          class="input-name"
          :trigger-on-focus="true"
        />
        <div class="form-row-mobile">
          <div class="quantity-group">
            <el-input-number v-model="form.quantity" :min="1" :max="99" size="large" class="input-qty" />
            <el-select v-model="form.unit" size="large" class="input-unit">
              <el-option v-for="u in units" :key="u" :label="u" :value="u" />
            </el-select>
            <el-input-number v-model="form.price" :min="0" :max="9999" size="large" class="input-price" placeholder="單價" :controls="false" />
          </div>
          <el-button type="primary" size="large" @click="handleAdd" :icon="Plus" class="btn-add">加入</el-button>
        </div>
      </div>
    </el-card>

    <!-- 清單工具列 -->
    <div class="list-toolbar" v-if="shoppingStore.items.length > 0">
      <el-radio-group v-model="groupByCategory" size="small">
        <el-radio-button :value="false"><el-icon><List /></el-icon> 全部列表</el-radio-button>
        <el-radio-button :value="true"><el-icon><Grid /></el-icon> 依超市分區</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 清單列表 -->
    <el-card shadow="never" class="list-card" body-style="padding: 0;">
      
      <!-- 未分組：一般列表 -->
      <template v-if="!groupByCategory">
        
        <!-- 電腦端：表格 -->
        <div class="desktop-table-wrapper">
          <el-table :data="shoppingStore.items" style="width: 100%" :row-class-name="({ row }) => shoppingStore.recentlyAddedIds.includes(row.id) ? 'recently-added-row' : ''">
            <el-table-column label="狀態" width="70" align="center">
              <template #default="{ row }">
                <el-checkbox :model-value="row.isPurchased" @change="shoppingStore.togglePurchased(row.id)" size="large" />
              </template>
            </el-table-column>
            <el-table-column label="品項" min-width="150">
              <template #default="{ row }">
                <span :class="{ 'purchased-text': row.isPurchased }" class="item-name">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="數量" width="100">
              <template #default="{ row }">
                <span :class="{ 'purchased-text': row.isPurchased }">{{ row.quantity }} {{ row.unit }}</span>
              </template>
            </el-table-column>
            
            <!-- 🌟 電腦端價格輸入區 (解決重疊) -->
            <el-table-column label="單價 ($)" width="180" align="center">
              <template #default="{ row }">
                <div class="price-cell">
                  <el-input-number 
                    v-model="row.unitPrice" 
                    :min="0" :max="9999" size="small" controls-position="right"
                    class="price-input"
                    @change="handlePriceChange(row)"
                  />
                  <PriceCompare :name="row.name" :currentPrice="row.unitPrice" />
                </div>
              </template>
            </el-table-column>

            <el-table-column label="小計 ($)" width="100" align="center">
              <template #default="{ row }">
                <span class="subtotal" :class="{ 'purchased-text': row.isPurchased }">
                  {{ (row.unitPrice || 0) * row.quantity }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="160" fixed="right" align="center">
              <template #default="{ row }">
                <div class="action-cell">
                  <el-button v-if="row.isPurchased" type="success" size="small" plain :icon="Upload" @click="openRegisterDialog(row)" round>登記至庫存</el-button>
                  <el-button type="danger" link @click="handleRemove(row.id)">刪除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 📱 手機端：卡片列表 -->
        <div class="mobile-card-list">
          <div 
            v-for="row in shoppingStore.items" 
            :key="row.id" 
            class="mobile-item-card"
            :class="{ 'recently-added-row': shoppingStore.recentlyAddedIds.includes(row.id), 'is-purchased': row.isPurchased }"
          >
            <div class="card-top">
              <el-checkbox :model-value="row.isPurchased" @change="shoppingStore.togglePurchased(row.id)" size="large" class="card-checkbox" />
              <div class="card-name-wrapper">
                <span class="item-name">{{ row.name }}</span>
                <span class="item-qty">{{ row.quantity }} {{ row.unit }}</span>
              </div>
              <el-button type="danger" link :icon="Delete" @click="handleRemove(row.id)" class="card-delete" />
            </div>
            
            <div class="card-bottom">
              <div class="price-block">
                <span class="price-label">單價</span>
                <el-input-number 
                  v-model="row.unitPrice" 
                  :min="0" :max="9999" size="small" controls-position="right"
                  class="mobile-price-input"
                  @change="handlePriceChange(row)"
                />
                <PriceCompare :name="row.name" :currentPrice="row.unitPrice" class="mobile-price-compare" />
              </div>
              
              <div class="subtotal-block">
                <span class="subtotal-label">小計</span>
                <span class="subtotal-value">${{ (row.unitPrice || 0) * row.quantity }}</span>
              </div>
            </div>

            <div v-if="row.isPurchased" class="card-footer">
              <el-button type="success" size="small" plain :icon="Upload" @click="openRegisterDialog(row)" round class="btn-register">登記至庫存</el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 已分組：超市分區 -->
      <template v-else>
        <div v-for="(items, category) in groupedItems" :key="category" class="category-group">
          <div class="category-header">
            <span class="cat-name">{{ category }}</span>
            <span class="cat-count">{{ items.length }} 樣</span>
          </div>

          <!-- 電腦端：分區表格 -->
          <div class="desktop-table-wrapper">
            <el-table :data="items" style="width: 100%" :show-header="false" :row-class-name="({ row }) => shoppingStore.recentlyAddedIds.includes(row.id) ? 'recently-added-row' : ''">
              <el-table-column label="狀態" width="70" align="center">
                <template #default="{ row }">
                  <el-checkbox :model-value="row.isPurchased" @change="shoppingStore.togglePurchased(row.id)" size="large" />
                </template>
              </el-table-column>
              <el-table-column label="品項" min-width="150">
                <template #default="{ row }">
                  <span :class="{ 'purchased-text': row.isPurchased }" class="item-name">{{ row.name }}</span>
                  <span :class="{ 'purchased-text': row.isPurchased }" class="item-qty-inline">{{ row.quantity }} {{ row.unit }}</span>
                </template>
              </el-table-column>
              <el-table-column label="單價 ($)" width="180" align="center">
                <template #default="{ row }">
                  <div class="price-cell">
                    <el-input-number v-model="row.unitPrice" :min="0" :max="9999" size="small" controls-position="right" class="price-input" @change="handlePriceChange(row)" />
                    <PriceCompare :name="row.name" :currentPrice="row.unitPrice" />
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="160" fixed="right" align="center">
                <template #default="{ row }">
                  <div class="action-cell">
                    <el-button v-if="row.isPurchased" type="success" size="small" plain :icon="Upload" @click="openRegisterDialog(row)" round>登記</el-button>
                    <el-button type="danger" link @click="handleRemove(row.id)">刪除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 📱 手機端：分區卡片 -->
          <div class="mobile-card-list">
            <div 
              v-for="row in items" 
              :key="row.id" 
              class="mobile-item-card"
              :class="{ 'recently-added-row': shoppingStore.recentlyAddedIds.includes(row.id), 'is-purchased': row.isPurchased }"
            >
              <div class="card-top">
                <el-checkbox :model-value="row.isPurchased" @change="shoppingStore.togglePurchased(row.id)" size="large" class="card-checkbox" />
                <div class="card-name-wrapper">
                  <span class="item-name">{{ row.name }}</span>
                  <span class="item-qty">{{ row.quantity }} {{ row.unit }}</span>
                </div>
                <el-button type="danger" link :icon="Delete" @click="handleRemove(row.id)" class="card-delete" />
              </div>
              
              <div class="card-bottom">
                <div class="price-block">
                  <span class="price-label">單價</span>
                  <el-input-number v-model="row.unitPrice" :min="0" :max="9999" size="small" controls-position="right" class="mobile-price-input" @change="handlePriceChange(row)" />
                  <PriceCompare :name="row.name" :currentPrice="row.unitPrice" class="mobile-price-compare" />
                </div>
                <div class="subtotal-block">
                  <span class="subtotal-label">小計</span>
                  <span class="subtotal-value">${{ (row.unitPrice || 0) * row.quantity }}</span>
                </div>
              </div>

              <div v-if="row.isPurchased" class="card-footer">
                <el-button type="success" size="small" plain :icon="Upload" @click="openRegisterDialog(row)" round class="btn-register">登記至庫存</el-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 空狀態 -->
      <SmartEmpty 
        v-if="shoppingStore.items.length === 0" 
        type="shopping"
        @primary="focusInput"
        @secondary="router.push('/meal-plan')"
        style="margin: 40px 0;"
      />
    </el-card>

    <!-- 預估花費 -->
    <div class="budget-footer">
      <div class="budget-info">
        <el-radio-group v-model="costMode" size="small" class="cost-switcher">
          <el-radio-button label="unpurchased" value="unpurchased">未購買</el-radio-button>
          <el-radio-button label="purchased" value="purchased">已勾選</el-radio-button>
          <el-radio-button label="all" value="all">全部</el-radio-button>
        </el-radio-group>
        
        <div class="cost-result">
          <el-icon size="20" color="var(--accent)"><Wallet /></el-icon>
          <span class="label">{{ costModeText }}預估花費：</span>
          <span class="cost">約 ${{ costData.total }} 元</span>
          <span v-if="costData.unknownCount > 0" class="unknown-hint">
            （含 {{ costData.unknownCount }} 項未知單價，以 ${{ unknownPriceFallback }} 估算）
          </span>
        </div>
      </div>
    </div>

    <!-- 登記至庫存彈窗 -->
    <el-dialog v-model="registerDialogVisible" title="登記至庫存" width="500px" align-center class="custom-app-dialog" destroy-on-close>
      <FoodForm 
        :key="currentRegisterItem?.id"
        :initial-name="currentRegisterItem?.name" 
        :initial-quantity="currentRegisterItem?.quantity" 
        @submit="handleRegisterSubmit" 
      />
    </el-dialog>
  </div>
</template>

<style scoped>
.shopping-container { width: 100%; max-width: 1000px; margin: 0 auto; }

/* 頁首 */
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-4); }
.page-header h2 { margin: 0 0 8px 0; font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }
.header-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.tag-group { display: flex; gap: 8px; }

/* AI 指南 */
.ai-guide-card { margin-bottom: var(--space-5); border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); }
.ai-guide-header { display: flex; justify-content: space-between; align-items: center; }
.ai-title { font-size: var(--text-base); font-weight: 700; color: var(--accent); display: flex; align-items: center; gap: 6px; font-family: var(--font-display); }
.guide-section { margin-bottom: var(--space-5); padding-bottom: var(--space-5); border-bottom: 1px dashed var(--border); }
.guide-section:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.guide-item-title { display: flex; align-items: center; gap: 6px; font-size: var(--text-sm); font-weight: 500; color: var(--ink); margin-bottom: var(--space-3); }
.guide-items { display: flex; flex-wrap: wrap; gap: 8px; }
.guide-btn { margin-top: 12px; }
.all-good { display: flex; align-items: center; gap: 8px; color: var(--sage); font-weight: 500; font-size: var(--text-sm); padding: var(--space-3) 0; }

/* 新增區塊 */
.add-card { margin-bottom: var(--space-4); border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); }
.add-form { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.input-name { flex: 1; min-width: 240px; }
.form-row-mobile { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.quantity-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.input-qty { width: 110px; }
.input-unit { width: 80px; }
.input-price { width: 100px; }
.input-price :deep(.el-input__wrapper) { padding-left: 8px; padding-right: 8px; }
.input-price :deep(.el-input__inner) { text-align: center; }
.btn-add { min-width: 90px; }

/* 工具列 */
.list-toolbar { display: flex; justify-content: flex-end; margin-bottom: var(--space-2); }
.list-toolbar :deep(.el-radio-button__inner) { display: flex; align-items: center; gap: 4px; }

/* 列表容器 */
.list-card { margin-bottom: var(--space-5); border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); overflow: hidden; }

/* 表格通用 */
.item-name { font-weight: 500; color: var(--ink); font-size: var(--text-base); }
.item-qty-inline { margin-left: 8px; color: var(--muted); font-size: var(--text-xs); }
.subtotal { font-weight: 600; color: var(--ink); font-family: var(--font-display); font-size: var(--text-base); }
.purchased-text { text-decoration: line-through; color: var(--muted); }

/* 🌟 電腦端：價格與操作佈局修正 */
.price-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}
.price-input {
  width: 100%;
  max-width: 130px;
}
.price-input :deep(.el-input__wrapper) {
  padding-left: 8px;
  padding-right: 30px; /* 確保加減號空間 */
}
.action-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* 🌟 剛加入高亮動畫 */
.recently-added-row {
  animation: highlight-fade 3s var(--ease-out) forwards;
}
@keyframes highlight-fade {
  0% { background-color: var(--accent-light); }
  100% { background-color: transparent; }
}

/* 超市分區分組樣式 */
.category-group { margin-bottom: var(--space-4); }
.category-group:last-child { margin-bottom: 0; }
.category-header {
  display: flex; align-items: baseline; gap: 8px;
  padding: 12px 16px; background: var(--ground);
  border-bottom: 1px solid var(--border-light);
}
.cat-name { font-size: var(--text-sm); font-weight: 700; color: var(--ink); }
.cat-count { font-size: var(--text-xs); color: var(--muted); }

/* 預算切換器 */
.budget-footer { display: flex; justify-content: flex-end; }
.budget-info { 
  background: var(--surface); border: 1px solid var(--border-light);
  padding: var(--space-4) var(--space-5); border-radius: var(--radius-lg); 
  display: flex; align-items: center; gap: var(--space-5); flex-wrap: wrap;
}
.cost-switcher :deep(.el-radio-button__inner) {
  border-radius: 9999px !important;
  border: 1px solid var(--border) !important;
  background: transparent !important;
  color: var(--muted) !important;
  box-shadow: none !important;
  padding: 6px 16px;
}
.cost-switcher :deep(.el-radio-button:not(:first-child) .el-radio-button__inner) {
  margin-left: 8px;
}
.cost-switcher :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: var(--accent-light) !important;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  font-weight: 600;
}
.cost-result { display: flex; align-items: center; gap: 8px; color: var(--ink); font-size: var(--text-sm); }
.cost-result .label { font-weight: 500; color: var(--muted); }
.cost-result .cost { font-size: var(--text-xl); font-weight: 700; color: var(--accent); font-family: var(--font-display); }
.unknown-hint { font-size: var(--text-xs); color: var(--muted); }

/* =========================================
   📱 手機端專屬佈局 (<= 768px)
   ========================================= */
.desktop-table-wrapper { display: block; }
.mobile-card-list { display: none; }

@media (max-width: 768px) {
  .desktop-table-wrapper { display: none; }
  .mobile-card-list { display: flex; flex-direction: column; gap: 12px; padding: 12px; background: var(--ground); }

  /* 頁首調整 */
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: space-between; }
  .tag-group { flex-wrap: wrap; }
  .copy-btn { width: 100%; }

  /* 輸入區塊：手機端兩行排列 */
  .add-form { flex-direction: column; align-items: stretch; gap: 12px; }
  .input-name { width: 100%; min-width: 0; }
  .form-row-mobile { display: flex; width: 100%; gap: 8px; }
  .quantity-group { flex: 1; display: flex; gap: 8px; }
  .input-qty { width: 80px; }
  .input-unit { width: 70px; }
  .input-price { flex: 1; width: auto; }
  .btn-add { width: 100%; margin-top: 4px; }

  /* 卡片樣式 */
  .mobile-item-card {
    background: var(--surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--shadow-sm);
    transition: opacity var(--transition-fast);
  }
  .mobile-item-card.is-purchased { opacity: 0.6; background: var(--surface-hover); }

  .card-top { display: flex; align-items: flex-start; gap: 10px; }
  .card-checkbox { margin-top: 2px; }
  .card-name-wrapper { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .card-name-wrapper .item-name { font-size: 16px; font-weight: 600; }
  .card-name-wrapper .item-qty { font-size: 12px; color: var(--muted); }
  .card-delete { margin-top: -4px; }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-top: 1px dashed var(--border-light);
    padding-top: 10px;
  }
  .price-block { display: flex; flex-direction: column; gap: 4px; }
  .price-label { font-size: 12px; color: var(--muted); }
  .mobile-price-input { width: 120px; }
  .mobile-price-input :deep(.el-input__wrapper) { padding-right: 28px; }
  .mobile-price-compare { margin-top: 2px; }

  .subtotal-block { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
  .subtotal-label { font-size: 12px; color: var(--muted); }
  .subtotal-value { font-size: 18px; font-weight: 700; color: var(--accent); font-family: var(--font-display); }

  .card-footer { border-top: 1px solid var(--border-light); padding-top: 10px; display: flex; justify-content: flex-end; }
  .btn-register { width: 100%; }

  /* 分組標題 */
  .category-header { padding: 10px 12px; border-radius: var(--radius-sm) var(--radius-sm) 0 0; }

  /* 預算列：手機端滿版 */
  .budget-footer { justify-content: center; margin-bottom: 24px; }
  .budget-info { width: 100%; flex-direction: column; gap: 12px; text-align: center; padding: 16px; }
  .cost-result { flex-wrap: wrap; justify-content: center; }
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