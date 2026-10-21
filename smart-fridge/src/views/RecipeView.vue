<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipeStore } from '@/stores/recipe'
import { useInventoryStore } from '@/stores/inventory'
import { useShoppingStore } from '@/stores/shopping'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage } from 'element-plus'
import { Setting, Warning } from '@element-plus/icons-vue'

const router = useRouter()
const recipeStore = useRecipeStore()
const inventoryStore = useInventoryStore()
const shoppingStore = useShoppingStore()
const settingsStore = useSettingsStore()

const activeTab = ref('recommend')
const activeCategory = ref('全部') // 目前選中的分類

const hasAllergies = computed(() => settingsStore.allergies.length > 0)
const hasDiet = computed(() => settingsStore.dietaryRestrictions.length > 0)
const allRestrictions = computed(() => [...settingsStore.allergies, ...settingsStore.dietaryRestrictions])

// 取得所有推薦並依分類過濾
const filteredRecommendations = computed(() => {
  const recs = recipeStore.getRecommendations()
  if (activeCategory.value === '全部') return recs
  return recs.filter(r => r.tags.includes(activeCategory.value))
})

const dialogVisible = ref(false)
const currentRecipe = ref(null)

function openRecipeDetail(recipe) {
  currentRecipe.value = recipe
  dialogVisible.value = true
}

function handleToggleFavorite(recipe) {
  recipeStore.toggleFavorite(recipe.id)
  if (recipeStore.isFavorite(recipe.id)) ElMessage.success('已加入收藏')
  else ElMessage.info('已取消收藏')
}

function addMissingToShopping(ingredientName) {
  shoppingStore.addItem({ name: ingredientName, quantity: 1, unit: '份' })
  ElMessage.success(`已將「${ingredientName}」加入購物清單！`)
}

function handleCook(recipe) {
  if (recipe.missingIngredients.length > 0) return ElMessage.warning('請先補齊缺少的食材才能一鍵扣庫存')
  if (!recipe.isSafe) return ElMessage.error('此食譜含有您的過敏原，已禁止操作！') // 防呆
  
  recipe.ingredients.forEach(ingName => {
    const item = inventoryStore.activeFoods.find(f => f.name === ingName)
    if (item && item.quantity > 1) item.quantity -= 1
    else if (item && item.quantity === 1) inventoryStore.markAsEaten(item.id)
  })
  ElMessage.success(`已根據「${recipe.name}」扣除庫存！`)
  dialogVisible.value = false
}

function goToSettings() {
  router.push('/settings')
}
</script>

<template>
  <div class="recipe-container">
    <div class="page-header">
      <div>
        <h2>AI 食譜推薦</h2>
        <p class="hint">根據您冰箱現有的食材，優先為您推薦快過期的料理！</p>
      </div>
    </div>

    <!-- 過敏原與飲食限制提示橫幅 -->
    <el-alert 
      v-if="hasAllergies || hasDiet" 
      type="warning" 
      show-icon 
      :closable="false" 
      class="allergy-alert"
    >
      <template #title>
        <div class="alert-content">
          <div class="alert-top">
            <span>已啟用飲食守護：含有以下過敏原的食譜已為您往後排序並以半透明顯示</span>
            <el-button size="small" type="warning" plain :icon="Setting" @click="goToSettings">修改設定</el-button>
          </div>
          <div class="tags-row">
            <el-tag v-for="item in allRestrictions" :key="item" type="danger" size="small" effect="dark" style="margin-right: 6px;">
              {{ item }}
            </el-tag>
          </div>
        </div>
      </template>
    </el-alert>

    <el-tabs v-model="activeTab" class="recipe-tabs">
      <el-tab-pane label="為你推薦" name="recommend">
        
        <!-- 分類篩選列 -->
        <div class="category-filter">
          <el-radio-group v-model="activeCategory" size="default">
            <el-radio-button v-for="cat in recipeStore.allCategories" :key="cat" :label="cat" :value="cat">
              {{ cat }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <el-empty v-if="filteredRecommendations.length === 0" description="目前沒有符合該分類的食譜，或是冰箱食材不足。" />
        
        <el-row :gutter="20" class="card-row">
          <el-col v-for="recipe in filteredRecommendations" :key="recipe.id" :xs="24" :sm="12" :md="8" :lg="6" class="card-col">
            <el-card 
              class="recipe-card" 
              :class="{ 'unsafe-card': !recipe.isSafe }"
              shadow="hover" 
              :body-style="{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }"
            >
              <img v-if="recipe.image" :src="recipe.image" class="recipe-image" />
              
              <div class="recipe-info">
                <div class="recipe-title-row">
                  <h3>{{ recipe.name }}</h3>
                  <el-button 
                    :type="recipeStore.isFavorite(recipe.id) ? 'warning' : 'info'" 
                    circle 
                    text
                    @click="handleToggleFavorite(recipe)"
                  >
                    <el-icon><StarFilled v-if="recipeStore.isFavorite(recipe.id)" /><Star v-else /></el-icon>
                  </el-button>
                </div>

                <!-- 如果含有過敏原，顯示警告標籤 -->
                <div v-if="!recipe.isSafe" class="allergen-warning">
                  <el-tag type="danger" size="small" :icon="Warning">含有您的過敏原/禁忌</el-tag>
                </div>
                
                <div class="match-info">
                  <el-progress :percentage="recipe.matchScore" :status="recipe.isSafe ? (recipe.matchScore === 100 ? 'success' : '') : 'exception'" />
                  <div class="tags">
                    <el-tag v-if="recipe.usedUrgentFoods.length > 0" type="danger" size="small" effect="dark">
                      消耗即期品：{{ recipe.usedUrgentFoods.join(', ') }}
                    </el-tag>
                  </div>
                </div>
                
                <div class="missing-info" v-if="recipe.missingIngredients.length > 0">
                  缺：{{ recipe.missingIngredients.join(', ') }}
                </div>
                <div class="missing-info success" v-else>
                  食材齊全！
                </div>

                <el-button type="primary" class="detail-btn" @click="openRecipeDetail(recipe)">
                  查看作法
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 收藏分頁 -->
      <el-tab-pane label="我的收藏" name="favorites">
        <el-empty v-if="recipeStore.favoriteRecipes.length === 0" description="還沒有收藏任何食譜喔！" />
        
        <el-row :gutter="20" class="card-row">
          <el-col v-for="recipe in recipeStore.favoriteRecipes" :key="recipe.id" :xs="24" :sm="12" :md="8" :lg="6" class="card-col">
            <el-card class="recipe-card" shadow="hover" :body-style="{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }">
              <img v-if="recipe.image" :src="recipe.image" class="recipe-image" />
              <div class="recipe-info">
                <div class="recipe-title-row">
                  <h3>{{ recipe.name }}</h3>
                  <el-button type="warning" circle text @click="handleToggleFavorite(recipe)">
                    <el-icon><StarFilled /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" class="detail-btn" @click="openRecipeDetail(recipe)">
                  查看作法
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>

    <!-- 食譜詳情彈窗 -->
    <el-dialog v-model="dialogVisible" :title="currentRecipe?.name" width="500px" class="custom-app-dialog">
      <div v-if="currentRecipe" class="recipe-detail">
        <img v-if="currentRecipe.image" :src="currentRecipe.image" class="detail-image" />
        
        <el-alert v-if="!currentRecipe.isSafe" title="警告：此食譜含有您的過敏原或禁忌食材！" type="error" show-icon :closable="false" style="margin-bottom: 16px;" />

        <h4>所需食材</h4>
        <div class="ingredients-list">
          <div v-for="ing in currentRecipe.ingredients" :key="ing" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <el-tag :type="inventoryStore.activeFoods.some(f => f.name === ing) ? 'success' : 'info'">
              {{ ing }} <span v-if="!inventoryStore.activeFoods.some(f => f.name === ing)">(缺少)</span>
            </el-tag>
            <el-button 
              v-if="!inventoryStore.activeFoods.some(f => f.name === ing)" 
              type="primary" 
              size="small" 
              plain 
              @click="addMissingToShopping(ing)"
            >
              + 加入購物車
            </el-button>
          </div>
        </div>

        <h4 style="margin-top: 20px;">料理步驟</h4>
        <ol class="steps-list">
          <li v-for="(step, index) in currentRecipe.steps" :key="index">{{ step }}</li>
        </ol>
        
        <div class="disclaimer">
          <el-alert title="推薦僅供參考，過敏請自行確認成分" type="info" :closable="false" show-icon />
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">關閉</el-button>
          <el-button 
            type="primary" 
            :disabled="currentRecipe?.missingIngredients?.length > 0 || !currentRecipe?.isSafe"
            @click="handleCook(currentRecipe)"
          >
            {{ currentRecipe?.isSafe ? '一鍵扣庫存 (做完這道菜)' : '含有過敏原，無法扣庫存' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.recipe-container { width: 100%; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 8px 0; color: var(--el-text-color-primary); }
.hint { color: var(--el-text-color-secondary); font-size: 14px; margin: 0; }

/* 過敏原提示橫幅 */
.allergy-alert { margin-bottom: 20px; border-radius: 12px; }
.alert-content { display: flex; flex-direction: column; gap: 10px; }
.alert-top { display: flex; justify-content: space-between; align-items: center; }
.tags-row { display: flex; flex-wrap: wrap; gap: 4px; }

/* 分類篩選 */
.category-filter {
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.category-filter::-webkit-scrollbar { display: none; }

.recipe-tabs {
  background: var(--el-bg-color);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
}

.card-row { display: flex; flex-wrap: wrap; }
.card-col { display: flex; margin-bottom: 20px; }

.recipe-card {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  border: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color);
}
.recipe-card:hover { transform: translateY(-5px); box-shadow: var(--el-box-shadow-light); }

/* 含有過敏原的卡片樣式 */
.unsafe-card {
  opacity: 0.5;
  filter: grayscale(0.8);
}
.unsafe-card:hover {
  opacity: 0.9;
  filter: grayscale(0);
}

.recipe-image { width: 100%; height: 160px; object-fit: cover; }
.recipe-info { padding: 16px; display: flex; flex-direction: column; flex: 1; }
.recipe-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.recipe-title-row h3 { margin: 0; font-size: 18px; color: var(--el-text-color-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.allergen-warning { margin-bottom: 8px; }
.match-info { margin-bottom: 12px; }
.tags { margin-top: 8px; min-height: 24px; }
.missing-info { font-size: 13px; color: var(--el-color-danger); margin-bottom: 12px; min-height: 20px; }
.missing-info.success { color: var(--el-color-success); }

.detail-btn { width: 100%; border-radius: 8px; margin-top: auto; }

/* 詳情彈窗樣式 */
.recipe-detail { text-align: left; }
.detail-image { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 16px; }
.recipe-detail h4 { color: var(--el-text-color-primary); margin: 16px 0 8px 0; }
.steps-list { padding-left: 20px; color: var(--el-text-color-regular); line-height: 1.6; }
.steps-list li { margin-bottom: 6px; }
.disclaimer { margin-top: 20px; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
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