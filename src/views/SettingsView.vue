<script setup>
import { ref, reactive } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { ElMessage } from 'element-plus'
import { User, Bell, Setting, InfoFilled } from '@element-plus/icons-vue'

const settingsStore = useSettingsStore()
const uiStore = useUiStore()

const form = reactive({
  reminderDays: settingsStore.reminderDays,
  notifyStation: settingsStore.notifyStation,
  notifyLine: settingsStore.notifyLine,
})

function handleSave() {
  settingsStore.updateSettings(form.reminderDays, form.notifyStation, form.notifyLine)
  ElMessage.success('通知設定已儲存')
}

function toggleElderMode(val) {
  uiStore.toggleElderMode()
  ElMessage.success(val ? '已開啟長輩友善模式' : '已恢復正常模式')
}
</script>

<template>
  <div class="settings-container">
    <div class="page-header">
      <h2>系統設定</h2>
      <p class="hint">管理您的個人化操作體驗與通知偏好</p>
    </div>

    <!-- 長輩友善模式 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-title"><el-icon><User /></el-icon> 長輩友善模式</div>
        </div>
      </template>
      <div class="elder-mode-content">
        <div class="elder-info">
          <h3>放大字體與按鈕</h3>
          <p>開啟後，全站字體與按鈕將自動放大，讓操作更清晰不費力，適合長輩或視力不佳者使用。</p>
        </div>
        <div class="elder-switch">
          <el-switch 
            :model-value="uiStore.isElderMode" 
            @change="toggleElderMode"
            size="large"
            active-text="已開啟"
            inactive-text="已關閉"
          />
        </div>
      </div>
    </el-card>

    <!-- 通知與提醒設定 -->
    <el-card shadow="never" class="settings-card">
      <template #header>
        <div class="card-header">
          <div class="header-title"><el-icon><Bell /></el-icon> 通知與提醒</div>
        </div>
      </template>
      <el-form :model="form" label-width="120px" class="settings-form">
        <el-form-item label="提前提醒天數">
          <div class="input-group">
            <el-input-number v-model="form.reminderDays" :min="1" :max="14" />
            <span class="hint">天（距離保存期限前幾天開始提醒）</span>
          </div>
        </el-form-item>
        <el-form-item label="站內通知">
          <el-switch v-model="form.notifyStation" active-text="開啟" inactive-text="關閉" />
        </el-form-item>
        <el-form-item label="LINE 推播">
          <el-switch v-model="form.notifyLine" active-text="開啟" inactive-text="關閉" />
          <div class="line-tip">開啟後，系統會透過 LINE 官方帳號發送每日摘要（此為模擬功能）。</div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSave" style="width: 200px;">儲存通知設定</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    </div>
</template>

<style scoped>
.settings-container { max-width: 800px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px 0; color: var(--el-text-color-primary); }
.hint { color: var(--el-text-color-secondary); font-size: 14px; margin: 0; }

.settings-card { border-radius: 12px; background: var(--el-bg-color); margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-title { font-size: 16px; font-weight: 600; color: var(--el-text-color-primary); display: flex; align-items: center; gap: 8px; }

/* 長輩模式內容 */
.elder-mode-content { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.elder-info h3 { margin: 0 0 4px 0; font-size: 16px; color: var(--el-text-color-primary); }
.elder-info p { margin: 0; font-size: 14px; color: var(--el-text-color-secondary); line-height: 1.5; }
.elder-switch { flex-shrink: 0; }

/* 表單設定 */
.settings-form { margin-top: 10px; }
.input-group { display: flex; align-items: center; }
.line-tip { width: 100%; font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }

/* 關於系統 */
.about-content p { margin: 8px 0; font-size: 14px; color: var(--el-text-color-regular); }
.about-content strong { color: var(--el-color-primary); }

@media (max-width: 768px) {
  .elder-mode-content { flex-direction: column; align-items: flex-start; }
  .elder-switch { margin-top: 12px; }
}
</style>