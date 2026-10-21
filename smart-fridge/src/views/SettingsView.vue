<script setup>
import { ref, reactive } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage } from 'element-plus'

const settingsStore = useSettingsStore()

const form = reactive({
  reminderDays: settingsStore.reminderDays,
  notifyStation: settingsStore.notifyStation,
  notifyLine: settingsStore.notifyLine,
  allergies: settingsStore.allergies,
  dietaryRestrictions: settingsStore.dietaryRestrictions,
  tastePreferences: settingsStore.tastePreferences,
})

// 預設選項
const allergyOptions = ['花生', '堅果', '海鮮', '甲殼類', '乳製品', '雞蛋', '麩質', '大豆']
const dietOptions = ['素食', '全素', '低醣', '低鈉', '低脂', '生酮', '無麩質']
const tasteOptions = ['清淡', '重口味', '辛辣', '酸甜', '偏甜', '偏鹹']

function handleSave() {
  settingsStore.updateSettings(form.reminderDays, form.notifyStation, form.notifyLine)
  settingsStore.updateProfileSettings(form.allergies, form.dietaryRestrictions, form.tastePreferences)
  ElMessage.success('所有設定已儲存')
}
</script>

<template>
  <div class="settings-container">
    <el-card class="settings-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>系統與個人偏好設定</span>
        </div>
      </template>

      <el-form :model="form" label-width="120px" class="settings-form">
        <h4 style="color: var(--el-text-color-primary); margin-bottom: 16px;">通知與提醒</h4>
        <el-form-item label="提前提醒天數">
          <el-input-number v-model="form.reminderDays" :min="1" :max="14" />
          <span class="hint">天（距離保存期限前幾天開始提醒）</span>
        </el-form-item>
        <el-form-item label="站內通知">
          <el-switch v-model="form.notifyStation" />
        </el-form-item>
        <el-form-item label="LINE 推播">
          <el-switch v-model="form.notifyLine" />
        </el-form-item>

        <el-divider />

        <h4 style="color: var(--el-text-color-primary); margin-bottom: 16px;">飲食限制與偏好</h4>
        <el-form-item label="過敏原設定">
          <el-select v-model="form.allergies" multiple placeholder="請選擇您的過敏原" style="width: 100%">
            <el-option v-for="item in allergyOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="飲食限制">
          <el-select v-model="form.dietaryRestrictions" multiple placeholder="請選擇您的飲食限制" style="width: 100%">
            <el-option v-for="item in dietOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item label="口味偏好">
          <el-select v-model="form.tastePreferences" multiple placeholder="請選擇您喜歡的口味" style="width: 100%">
            <el-option v-for="item in tasteOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item style="margin-top: 30px;">
          <el-button type="primary" size="large" style="width: 100%;" @click="handleSave">儲存所有設定</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.settings-container { max-width: 700px; margin: 0 auto; }
.settings-card { border-radius: 12px; background: var(--el-bg-color); }
.card-header { font-weight: 600; color: var(--el-text-color-primary); font-size: 16px; }
.hint { margin-left: 10px; color: var(--el-text-color-secondary); font-size: 14px; }
</style>