<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFamilyStore } from '@/stores/family'
import { ElMessage } from 'element-plus'
import { User, Setting, House, SwitchButton, Right, Refrigerator, Lock, Camera, Picture, Delete, List } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const userName = computed(() => authStore.user?.name || '使用者')
const userEmail = computed(() => authStore.user?.email || 'test@example.com')
const userAvatar = computed(() => authStore.user?.avatar || '')

// 頭像設定狀態
const isAvatarDialogVisible = ref(false)
const fileInputRef = ref(null)
const isUploading = ref(false)

const avatarColors = [
  { bg: '#F9EAE5', color: '#C25D3A' }, // 赤陶
  { bg: '#EEF1ED', color: '#5A6B53' }, // 橄欖綠
  { bg: '#FBF5EE', color: '#D9A066' }, // 琥珀
  { bg: '#E8F0F8', color: '#2C3E50' }, // 深海藍
  { bg: '#F3E8F8', color: '#8E44AD' }, // 紫羅蘭
  { bg: '#F0F0F0', color: '#333333' }, // 碳灰
]

const presetAvatars = computed(() => {
  const initial = userName.value.charAt(0).toUpperCase()
  return avatarColors.map(c => ({
    type: 'preset',
    value: `preset-${c.bg}-${c.color}`,
    bg: c.bg,
    color: c.color,
    text: initial
  }))
})

// 🌟 亮點：最近家庭動態
const recentLogs = computed(() => familyStore.dynamicLog.slice(0, 3))

// 選擇內建頭像
function selectPresetAvatar(avatarValue) {
  authStore.updateAvatar(avatarValue)
  isAvatarDialogVisible.value = false
  ElMessage.success('已更新頭像')
}

// 觸發檔案上傳
function triggerFileUpload() {
  fileInputRef.value?.click()
}

// 處理上傳的檔案並壓縮
function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    return ElMessage.error('請上傳圖片檔案')
  }

  isUploading.value = true
  const reader = new FileReader()
  
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      // 前端 Canvas 壓縮，大幅減輕後端負擔
      const canvas = document.createElement('canvas')
      const size = 200 // 固定 200x200
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')

      // 裁切為正方形
      const minSize = Math.min(img.width, img.height)
      const startX = (img.width - minSize) / 2
      const startY = (img.height - minSize) / 2
      
      ctx.drawImage(img, startX, startY, minSize, minSize, 0, 0, size, size)
      
      // 轉為 Base64 並更新
      const base64String = canvas.toDataURL('image/jpeg', 0.85)
      authStore.updateAvatar(base64String)
      isAvatarDialogVisible.value = false
      isUploading.value = false
      ElMessage.success('頭像已上傳並壓縮')
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// 移除自訂頭像
function removeAvatar() {
  authStore.updateAvatar('')
  isAvatarDialogVisible.value = false
  ElMessage.info('已恢復預設頭像')
}

// 渲染頭像內容
function getAvatarStyle() {
  if (userAvatar.value.startsWith('preset-')) {
    const parts = userAvatar.value.split('-')
    return { backgroundColor: parts[1], color: parts[2] }
  }
  return { backgroundColor: 'var(--accent)', color: '#FFF' }
}

function getAvatarContent() {
  if (userAvatar.value.startsWith('data:image')) {
    return null // 顯示圖片
  }
  return userName.value.charAt(0).toUpperCase()
}

// 格式化動態時間
function formatLogTime(timeStr) {
  const time = dayjs(timeStr)
  const now = dayjs()
  const diffMin = now.diff(time, 'minute')
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffHour = now.diff(time, 'hour')
  if (diffHour < 24) return `${diffHour} 小時前`
  return time.format('MM/DD')
}

// 路由跳轉
function goToFamily() { router.push('/family') }
function goToSettings() { router.push('/settings') }
function goToFridge() { router.push('/') }
function goToDietary() { router.push('/dietary') }

// 登出
const logoutDialogVisible = ref(false)
function handleLogout() { logoutDialogVisible.value = true }
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
      
      <!-- 頂部使用者資訊 -->
      <div class="user-section">
        <div 
          class="avatar-wrapper" 
          @click="isAvatarDialogVisible = true"
          title="點擊更換頭像"
        >
          <el-avatar 
            :size="96" 
            class="avatar" 
            :src="userAvatar.startsWith('data:image') ? userAvatar : ''"
            :style="getAvatarStyle()"
          >
            <template v-if="!userAvatar.startsWith('data:image')">
              {{ getAvatarContent() }}
            </template>
          </el-avatar>
          <div class="avatar-overlay">
            <el-icon><Camera /></el-icon>
            <span>更換</span>
          </div>
        </div>
        
        <div class="user-info">
          <h2>{{ userName }}</h2>
          <p>{{ userEmail }}</p>
        </div>
      </div>

      <!-- 🌟 家庭狀態卡片 (加入近期動態預覽) -->
      <div class="family-section">
        <div class="family-status" @click="goToFamily">
          <div class="family-left">
            <div class="icon-box"><el-icon><House /></el-icon></div>
            <div class="family-text">
              <h3>{{ familyStore.familyName }}</h3>
              <p>共 {{ familyStore.members.length }} 位成員</p>
            </div>
          </div>
          <el-icon class="arrow-icon"><Right /></el-icon>
        </div>

        <!-- 動態預覽 (僅在家庭且有動態時顯示) -->
        <div v-if="familyStore.currentUser.role !== 'none' && recentLogs.length > 0" class="mini-log-list">
          <div v-for="log in recentLogs" :key="log.id" class="mini-log-item">
            <span class="log-dot"></span>
            <span class="log-text">
              <strong>{{ log.memberName }}</strong> {{ log.action }}了「{{ log.target }}」
            </span>
            <span class="log-time">{{ formatLogTime(log.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 功能列表 -->
      <div class="menu-list">
        <div class="menu-item" @click="goToFridge">
          <div class="menu-left">
            <el-icon size="20" class="menu-icon"><Refrigerator /></el-icon>
            <span>冰箱結構與位置</span>
          </div>
          <el-icon class="arrow-icon"><Right /></el-icon>
        </div>

        <div class="menu-item" @click="goToDietary">
          <div class="menu-left">
            <el-icon size="20" class="menu-icon"><Lock /></el-icon>
            <span>過敏及忌口設定</span>
          </div>
          <el-icon class="arrow-icon"><Right /></el-icon>
        </div>

        <div class="menu-item" @click="goToSettings">
          <div class="menu-left">
            <el-icon size="20" class="menu-icon"><Setting /></el-icon>
            <span>系統設定</span>
          </div>
          <el-icon class="arrow-icon"><Right /></el-icon>
        </div>

        <div class="menu-item" @click="goToFamily">
          <div class="menu-left">
            <el-icon size="20" class="menu-icon"><User /></el-icon>
            <span>家庭成員管理</span>
          </div>
          <el-icon class="arrow-icon"><Right /></el-icon>
        </div>
      </div>

      <!-- 登出按鈕 -->
      <div class="logout-section">
        <el-button type="danger" link class="logout-btn" @click="handleLogout">
          <el-icon style="margin-right: 6px;"><SwitchButton /></el-icon> 登出系統
        </el-button>
      </div>
    </div>

    <!-- 頭像更換彈窗 -->
    <el-dialog 
      v-model="isAvatarDialogVisible" 
      title="更換頭像" 
      width="400px" 
      align-center 
      class="custom-app-dialog"
    >
      <div class="avatar-dialog-content">
        <p class="dialog-hint">選擇一個預設頭像，或上傳自己的照片。</p>
        
        <div class="preset-avatars">
          <div 
            v-for="preset in presetAvatars" 
            :key="preset.value"
            class="preset-item"
            :style="{ backgroundColor: preset.bg, color: preset.color }"
            @click="selectPresetAvatar(preset.value)"
          >
            {{ preset.text }}
          </div>
        </div>

        <el-divider>或</el-divider>

        <div class="upload-actions">
          <el-button type="primary" plain @click="triggerFileUpload" :icon="Picture" :loading="isUploading" style="width: 100%; margin-bottom: 12px;">
            上傳自訂照片
          </el-button>
          <input 
            type="file" 
            ref="fileInputRef" 
            accept="image/*" 
            style="display: none;" 
            @change="handleFileChange"
          />
          
          <el-button v-if="userAvatar" type="danger" plain @click="removeAvatar" :icon="Delete" style="width: 100%;">
            恢復預設頭像
          </el-button>
        </div>
        <p class="upload-hint">上傳的圖片會在前端自動裁切並壓縮，不會佔用伺服器空間。</p>
      </div>
      <template #footer>
        <el-button @click="isAvatarDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>

    <!-- 登出確認彈窗 -->
    <el-dialog v-model="logoutDialogVisible" title="確認登出" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon size="56" color="var(--danger)" style="margin-bottom: 16px;"><SwitchButton /></el-icon>
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
.profile-page-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: var(--space-6);
}

.profile-container {
  width: 100%;
  max-width: 600px;
  box-sizing: border-box;
  padding: 0 var(--space-4);
}

/* 使用者資訊 */
.user-section {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-bottom: var(--space-8);
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  /* 遵守去 AI 味：縮放不超過 1.02 */
  transition: transform var(--transition-fast);
}
.avatar-wrapper:hover { transform: scale(1.02); }

.avatar {
  font-size: 36px;
  font-weight: 700;
  font-family: var(--font-display);
  border: 2px solid var(--surface);
  box-shadow: var(--shadow-sm);
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(20, 18, 16, 0.5);
  color: #FFF;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
  font-size: 12px;
  font-weight: 500;
}
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }

.user-info h2 {
  margin: 0 0 4px 0;
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--ink);
  letter-spacing: -0.02em;
}
.user-info p {
  margin: 0;
  color: var(--muted);
  font-size: var(--text-sm);
}

/* 🌟 家庭狀態與動態 */
.family-section {
  margin-bottom: var(--space-6);
}

.family-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--accent-light);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);
}
.family-status:hover { background: var(--el-color-primary-light-8); transform: translateY(-2px); }

.family-left { display: flex; align-items: center; gap: var(--space-4); }
.icon-box {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.4);
  color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.family-text h3 { margin: 0 0 2px 0; font-size: var(--text-base); color: var(--ink); font-weight: 600; }
.family-text p { margin: 0; font-size: var(--text-xs); color: var(--muted); }

/* 動態列表 */
.mini-log-list {
  margin-top: var(--space-3);
  padding: 0 var(--space-2);
}
.mini-log-item {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--text-xs); color: var(--muted);
  padding: 4px 0;
}
.log-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--border); flex-shrink: 0;
}
.log-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.log-text strong { color: var(--ink); font-weight: 600; }
.log-time { flex-shrink: 0; opacity: 0.8; }

/* 功能列表 */
.menu-list {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-8);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) 0;
  cursor: pointer;
  border-bottom: 1px solid var(--border-light);
  transition: background-color var(--transition-fast), padding var(--transition-fast);
}
.menu-item:last-child { border-bottom: none; }
.menu-item:hover { background: var(--surface-hover); padding-left: var(--space-2); padding-right: var(--space-2); border-radius: var(--radius-sm); }

.menu-left { display: flex; align-items: center; gap: var(--space-4); }
.menu-icon { color: var(--muted); transition: color var(--transition-fast); }
.menu-item:hover .menu-icon { color: var(--accent); }
.menu-left span { font-size: var(--text-base); color: var(--ink); font-weight: 500; }

.arrow-icon { color: var(--border); transition: transform var(--transition-fast), color var(--transition-fast); }
.menu-item:hover .arrow-icon, .family-status:hover .arrow-icon { transform: translateX(2px); color: var(--accent); }

/* 登出按鈕 */
.logout-section { text-align: center; padding-bottom: var(--space-6); }
.logout-btn { font-size: var(--text-sm); color: var(--muted) !important; }
.logout-btn:hover { color: var(--danger) !important; }

/* 頭像彈窗內容 */
.avatar-dialog-content { text-align: center; }
.dialog-hint { font-size: var(--text-sm); color: var(--muted); margin-bottom: var(--space-5); }

.preset-avatars {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.preset-item {
  width: 48px; height: 48px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; font-family: var(--font-display);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  border: 2px solid transparent;
}
.preset-item:hover { transform: scale(1.02); border-color: var(--border); box-shadow: var(--shadow-sm); }

.upload-actions { margin-top: var(--space-4); }
.upload-hint { font-size: var(--text-xs); color: var(--muted); margin-top: var(--space-3); line-height: 1.5; }

/* 通用彈窗樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: var(--space-4); width: 100%; }
.dialog-footer .el-button { width: 120px; }
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