<script setup>
import { ref, reactive, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/composables/useToast'
import { Warning, Dish, Sugar } from '@element-plus/icons-vue'
import TasteAggregator from '@/components/family/TasteAggregator.vue'

const settingsStore = useSettingsStore()
const { showToast } = useToast()

// 從 Store 讀取初始值
const form = reactive({
  allergies: [...settingsStore.allergies],
  dietaryRestrictions: [...settingsStore.dietaryRestrictions],
  tastePreferences: [...settingsStore.tastePreferences]
})

const allergyOptions = ['花生', '堅果', '海鮮', '甲殼類', '乳製品', '雞蛋', '麩質', '大豆']
const dietOptions = ['素食', '全素', '低醣', '低鈉', '低脂', '生酮', '無麩質']
const tasteOptions = ['清淡', '重口味', '辛辣', '酸甜', '偏甜', '偏鹹']

// 儲存設定
function handleSave() {
  settingsStore.updateProfileSettings(
    form.allergies,
    form.dietaryRestrictions,
    form.tastePreferences
  )
  showToast({
    title: '飲食偏好已儲存',
    message: 'AI 食譜推薦將立刻為您調整。',
    type: 'success'
  })
}
</script>

<template>
  <div class="dietary-container">
    <div class="page-header">
      <div>
        <h2>飲食偏好設定</h2>
        <p class="hint">設定您的過敏原與飲食限制，AI 推薦食譜時將自動為您避開。</p>
      </div>
      <el-button type="primary" size="large" @click="handleSave" class="save-btn desktop-save">儲存設定</el-button>
    </div>

    <el-row :gutter="24">
      <!-- 左欄：個人設定 -->
      <el-col :xs="24" :md="14">
        
        <!-- 過敏原設定 -->
        <el-card shadow="never" class="setting-card allergy-card" data-tour="dietary-allergy">
          <template #header>
            <div class="card-header">
              <div class="icon-box bg-danger"><el-icon size="24"><Warning /></el-icon></div>
              <div class="header-text">
                <div class="title-row">
                  <h3>過敏原設定</h3>
                  <el-tag v-if="form.allergies.length > 0" type="danger" effect="light" size="small" round>
                    已選 {{ form.allergies.length }} 項
                  </el-tag>
                </div>
                <p>含有以下成分的食譜將被隱藏或標示警告</p>
              </div>
            </div>
          </template>
          <el-checkbox-group v-model="form.allergies" class="checkbox-group">
            <el-checkbox-button v-for="item in allergyOptions" :key="item" :value="item">
              {{ item }}
            </el-checkbox-button>
          </el-checkbox-group>
          <el-alert title="注意：若您有嚴重過敏，食用前請務必再次確認食品成分。" type="warning" show-icon :closable="false" style="margin-top: 16px;" />
        </el-card>

        <!-- 飲食限制 -->
        <el-card shadow="never" class="setting-card diet-card">
          <template #header>
            <div class="card-header">
              <div class="icon-box bg-success"><el-icon size="24"><Dish /></el-icon></div>
              <div class="header-text">
                <div class="title-row">
                  <h3>飲食限制</h3>
                  <el-tag v-if="form.dietaryRestrictions.length > 0" type="success" effect="light" size="small" round>
                    已選 {{ form.dietaryRestrictions.length }} 項
                  </el-tag>
                </div>
                <p>設定您的飲食習慣，AI 將推薦符合條件的食譜</p>
              </div>
            </div>
          </template>
          <el-checkbox-group v-model="form.dietaryRestrictions" class="checkbox-group">
            <el-checkbox-button v-for="item in dietOptions" :key="item" :value="item">
              {{ item }}
            </el-checkbox-button>
          </el-checkbox-group>
        </el-card>

        <!-- 口味偏好 -->
        <el-card shadow="never" class="setting-card taste-card">
          <template #header>
            <div class="card-header">
              <div class="icon-box bg-warning"><el-icon size="24"><Sugar /></el-icon></div>
              <div class="header-text">
                <div class="title-row">
                  <h3>我的口味偏好</h3>
                  <el-tag v-if="form.tastePreferences.length > 0" type="warning" effect="light" size="small" round>
                    已選 {{ form.tastePreferences.length }} 項
                  </el-tag>
                </div>
                <p>選擇您喜歡的口味，讓推薦更貼近您的喜好</p>
              </div>
            </div>
          </template>
          <el-checkbox-group v-model="form.tastePreferences" class="checkbox-group">
            <el-checkbox-button v-for="item in tasteOptions" :key="item" :value="item">
              {{ item }}
            </el-checkbox-button>
          </el-checkbox-group>
        </el-card>

      </el-col>

      <!-- 右欄：家庭口味聚合 -->
      <el-col :xs="24" :md="10">
        <TasteAggregator />
      </el-col>
    </el-row>

    <!-- 📱 手機端懸浮儲存按鈕 -->
    <div class="mobile-save-bar">
      <el-button type="primary" size="large" @click="handleSave" class="mobile-save-btn">
        儲存設定
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.dietary-container { width: 100%; max-width: 1100px; margin: 0 auto; padding-bottom: 80px; /* 預留手機端懸浮按鈕空間 */ }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-4); }
.page-header h2 { margin: 0 0 8px 0; color: var(--ink); font-family: var(--font-display); font-weight: 700; font-size: var(--text-xl); }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }
.save-btn { border-radius: var(--radius-md); }

.setting-card { border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); margin-bottom: var(--space-4); }
.card-header { display: flex; align-items: flex-start; gap: 16px; }
.icon-box { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bg-danger { background: var(--el-color-danger-light-9); color: var(--danger); }
.bg-success { background: var(--el-color-success-light-9); color: var(--sage); }
.bg-warning { background: var(--el-color-warning-light-9); color: var(--warning); }

.header-text { flex: 1; min-width: 0; }
.title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.header-text h3 { margin: 0; font-size: var(--text-base); color: var(--ink); font-weight: 600; }
.header-text p { margin: 0; font-size: var(--text-sm); color: var(--muted); }

/* 複選框按鈕美化 */
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
.checkbox-group :deep(.el-checkbox-button__inner) {
  border-radius: var(--radius-round) !important;
  border: 1px solid var(--border) !important;
  padding: 8px 20px;
  box-shadow: none !important;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}
.checkbox-group :deep(.el-checkbox-button.is-checked .el-checkbox-button__inner) {
  background-color: var(--accent);
  border-color: var(--accent) !important;
  color: white;
  box-shadow: 0 4px 12px rgba(194, 93, 58, 0.2) !important;
}

/* 手機端懸浮按鈕：預設隱藏 */
.mobile-save-bar { display: none; }

/* =========================================
   📱 手機端自適應
   ========================================= */
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .desktop-save { display: none; } /* 隱藏頂部按鈕 */

  /* 1. 顯示底部懸浮按鈕 */
  .mobile-save-bar {
    display: block;
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(var(--bottom-nav-h) + var(--safe-bottom));
    padding: 12px var(--page-pad-x);
    background: var(--surface);
    border-top: 1px solid var(--border-light);
    z-index: 99;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
  }
  .mobile-save-btn {
    width: 100%;
    height: 44px;
    font-size: var(--text-base);
    font-weight: 600;
    border-radius: var(--radius-md);
  }

  /* 2. 圖示縮小，避免擠壓標題 */
  .card-header { gap: 12px; }
  .icon-box { width: 36px; height: 36px; border-radius: var(--radius-sm); }
  .icon-box .el-icon { font-size: 18px !important; }
  .header-text h3 { font-size: var(--text-sm); }
  .header-text p { font-size: var(--text-xs); }

  /* 3. Checkbox 標籤緊湊化 */
  .checkbox-group { gap: 8px; }
  .checkbox-group :deep(.el-checkbox-button__inner) {
    padding: 6px 14px;
    font-size: 13px;
  }
}
</style>