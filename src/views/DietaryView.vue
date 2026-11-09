<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage } from 'element-plus'
import { Warning, Dish, Sugar, Coffee } from '@element-plus/icons-vue'

const settingsStore = useSettingsStore()

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
  ElMessage.success('飲食偏好已儲存！AI 食譜推薦將立刻為您調整。')
}
</script>

<template>
  <div class="dietary-container">
    <div class="page-header">
      <div>
        <h2>飲食偏好設定</h2>
        <p class="hint">設定您的過敏原與飲食限制，AI 推薦食譜時將自動為您避開。</p>
      </div>
      <el-button type="primary" size="large" @click="handleSave">儲存設定</el-button>
    </div>

    <el-row :gutter="20">
      <!-- 過敏原設定 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="setting-card allergy-card">
          <template #header>
            <div class="card-header">
              <div class="icon-box bg-danger"><el-icon size="24"><Warning /></el-icon></div>
              <div class="header-text">
                <h3>過敏原設定</h3>
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
      </el-col>

      <!-- 飲食限制 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="setting-card diet-card">
          <template #header>
            <div class="card-header">
              <div class="icon-box bg-success"><el-icon size="24"><Dish /></el-icon></div>
              <div class="header-text">
                <h3>飲食限制</h3>
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
      </el-col>

      <!-- 口味偏好 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="setting-card taste-card">
          <template #header>
            <div class="card-header">
              <div class="icon-box bg-warning"><el-icon size="24"><Sugar /></el-icon></div>
              <div class="header-text">
                <h3>口味偏好</h3>
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
    </el-row>
  </div>
</template>

<style scoped>
.dietary-container { width: 100%; max-width: 1000px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-header h2 { margin: 0 0 8px 0; color: var(--el-text-color-primary); }
.hint { color: var(--el-text-color-secondary); font-size: 14px; margin: 0; }

.setting-card { border-radius: 12px; background: var(--el-bg-color); margin-bottom: 20px; }
.card-header { display: flex; align-items: center; gap: 16px; }
.icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bg-danger { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
.bg-success { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.bg-warning { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
.header-text h3 { margin: 0 0 4px 0; font-size: 18px; color: var(--el-text-color-primary); }
.header-text p { margin: 0; font-size: 13px; color: var(--el-text-color-secondary); }

/* 複選框按鈕美化 */
.checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
.checkbox-group :deep(.el-checkbox-button__inner) {
  border-radius: 20px !important;
  border: 1px solid var(--el-border-color) !important;
  padding: 8px 20px;
  box-shadow: none !important;
  transition: all 0.3s;
}
.checkbox-group :deep(.el-checkbox-button.is-checked .el-checkbox-button__inner) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary) !important;
  color: white;
  box-shadow: 0 4px 12px rgba(64,158,255,0.3) !important;
}

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .page-header .el-button { width: 100%; }
}
</style>