<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { ElMessage } from 'element-plus'
import { User, Setting, House, SwitchButton, Right } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const userName = computed(() => authStore.user?.name || '測試使用者')
const userEmail = computed(() => authStore.user?.email || 'test@example.com')

const logoutDialogVisible = ref(false)

function goToFamily() { router.push('/family') }
function goToSettings() { router.push('/settings') }

// 打開登出彈窗
function handleLogout() {
  logoutDialogVisible.value = true
}

// 確認登出
function confirmLogout() {
  authStore.logout()
  ElMessage.success('已安全登出')
  logoutDialogVisible.value = false
  router.push('/login')
}
</script>

<template>
  <div class="profile-page-wrapper">
    <div class="profile-container">
      <!-- 使用者資訊卡片 -->
      <div class="user-header-card">
        <el-avatar :size="80" class="avatar">
          {{ userName.charAt(0) }}
        </el-avatar>
        <div class="user-info">
          <h2>{{ userName }}</h2>
          <p>{{ userEmail }}</p>
        </div>
      </div>

      <!-- 家庭資訊卡片 -->
      <div class="family-status-card" @click="goToFamily">
        <div class="family-icon">
          <el-icon size="24"><House /></el-icon>
        </div>
        <div class="family-text">
          <h3>{{ familyStore.familyName }}</h3>
          <p>共 {{ familyStore.members.length }} 位成員</p>
        </div>
        <el-icon class="arrow-icon"><Right /></el-icon>
      </div>

      <!-- 功能列表選單 -->
      <div class="menu-list">
        <div class="menu-item" @click="goToSettings">
          <div class="menu-left">
            <el-icon size="20" color="var(--el-color-primary)"><Setting /></el-icon>
            <span>系統設定</span>
          </div>
          <el-icon color="var(--el-text-color-disabled)"><Right /></el-icon>
        </div>

        <div class="menu-item" @click="goToFamily">
          <div class="menu-left">
            <el-icon size="20" color="var(--el-color-success)"><User /></el-icon>
            <span>家庭成員管理</span>
          </div>
          <el-icon color="var(--el-text-color-disabled)"><Right /></el-icon>
        </div>
      </div>

      <!-- 登出按鈕 -->
      <div class="logout-section">
        <el-button type="danger" plain size="large" class="logout-btn" @click="handleLogout">
          <el-icon style="margin-right: 6px;"><SwitchButton /></el-icon> 登出系統
        </el-button>
      </div>
    </div>

    <!-- 登出確認彈窗 (全新 UI) -->
    <el-dialog v-model="logoutDialogVisible" title="確認登出" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon size="56" color="var(--el-color-danger)" style="margin-bottom: 16px;"><SwitchButton /></el-icon>
        <p class="dialog-title">您確定要登出系統嗎？</p>
        <p class="dialog-subtitle">登出後，需要重新輸入帳號密碼才能繼續使用。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="logoutDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmLogout">確定登出</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 外層包裝，確保滿版且內容置中 */
.profile-page-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
}

.profile-container {
  width: 100%;
  max-width: 600px;
  box-sizing: border-box;
  padding: 0 16px; /* 加上左右 padding 避免手機貼邊 */
}

/* 使用者卡片 */
.user-header-card {
  display: flex;
  flex-direction: column; /* 手機端改為上下排列 */
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 30px 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-8) 0%, var(--el-color-primary-light-9) 100%);
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: var(--el-box-shadow-lighter);
}

/* 電腦版時改回左右排列 */
@media (min-width: 768px) {
  .user-header-card {
    flex-direction: row;
    text-align: left;
    padding: 30px 40px;
  }
}

.avatar {
  background: var(--el-color-primary);
  color: white;
  font-size: 32px;
  border: 4px solid var(--el-bg-color);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  flex-shrink: 0;
}

.user-info h2 {
  margin: 0 0 6px 0;
  color: var(--el-text-color-primary);
  font-size: 24px;
}

.user-info p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

/* 家庭狀態卡片 */
.family-status-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  margin-bottom: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.family-status-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow-light);
  border-color: var(--el-color-primary-light-5);
}

.family-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.family-text {
  flex: 1;
}

.family-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.family-text p {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.arrow-icon {
  color: var(--el-text-color-disabled);
}

/* 功能列表 */
.menu-list {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 30px;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.menu-item:last-child { border-bottom: none; }
.menu-item:hover { background: var(--el-fill-color-light); }

.menu-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

/* 登出按鈕 */
.logout-section { text-align: center; }
.logout-btn { width: 100%; border-radius: 10px; }

/* 彈窗通用樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: 14px; color: var(--el-text-color-secondary); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 120px; }
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