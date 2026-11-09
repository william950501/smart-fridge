<script setup>
import { ref, computed } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import dayjs from 'dayjs'
import { Bell, User, Check, Delete, Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const notificationStore = useNotificationStore()

// 控制抽屜開關
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 格式化時間 (例如：剛剛、5分鐘前、10/25)
function formatTime(timeString) {
  const now = dayjs()
  const time = dayjs(timeString)
  const diffMinutes = now.diff(time, 'minute')
  
  if (diffMinutes < 1) return '剛剛'
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`
  
  const diffHours = now.diff(time, 'hour')
  if (diffHours < 24) return `${diffHours} 小時前`
  
  return time.format('MM/DD HH:mm')
}

// 取得對應的圖示
function getIcon(iconName) {
  const icons = { Bell, User, Check, Delete, Plus }
  return icons[iconName] || Bell
}

// 取得對應的顏色
function getIconColor(type) {
  return type === 'system' ? 'var(--el-color-danger)' : 'var(--el-color-primary)'
}

function getIconBg(type) {
  return type === 'system' ? 'var(--el-color-danger-light-9)' : 'var(--el-color-primary-light-9)'
}

// 點擊單筆通知標記為已讀
function handleRead(item) {
  if (!item.isRead) {
    notificationStore.markAsRead(item.id)
  }
}

function handleMarkAllRead() {
  notificationStore.markAllAsRead()
}

function handleClearAll() {
  notificationStore.clearAll()
}
</script>

<template>
  <el-drawer
    v-model="visible"
    title="通知中心"
    direction="rtl"
    size="360px"
    class="notification-drawer"
  >
    <template #header>
      <div class="drawer-header">
        <span class="title">通知中心</span>
        <el-button 
          v-if="notificationStore.notifications.length > 0" 
          type="primary" 
          link 
          size="small"
          @click="handleMarkAllRead"
        >
          全部已讀
        </el-button>
      </div>
    </template>

    <div class="drawer-body">
      <!-- 空狀態 -->
      <el-empty 
        v-if="notificationStore.notifications.length === 0" 
        description="目前沒有任何通知" 
        :image-size="100"
      />

      <!-- 通知列表 -->
      <div v-else class="notification-list">
        <div 
          v-for="item in notificationStore.notifications" 
          :key="item.id"
          class="notification-item"
          :class="{ 'is-unread': !item.isRead }"
          @click="handleRead(item)"
        >
          <!-- 左側圖示 -->
          <div class="item-icon" :style="{ background: getIconBg(item.type), color: getIconColor(item.type) }">
            <el-icon size="20"><component :is="getIcon(item.icon)" /></el-icon>
          </div>

          <!-- 右側內容 -->
          <div class="item-content">
            <div class="item-header">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div class="item-message">{{ item.message }}</div>
          </div>

          <!-- 未讀紅點 -->
          <div v-if="!item.isRead" class="unread-dot"></div>
        </div>
      </div>
    </div>

    <!-- 底部清空按鈕 -->
    <template #footer v-if="notificationStore.notifications.length > 0">
      <div class="drawer-footer">
        <el-button type="danger" plain style="width: 100%;" @click="handleClearAll">
          清空所有通知
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.drawer-header .title {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.drawer-body {
  height: 100%;
  overflow-y: auto;
  padding: 0 4px;
}

/* 列表樣式 */
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.notification-item:hover {
  background: var(--el-fill-color-light);
}

.notification-item.is-unread {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-7);
}

/* 圖示 */
.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 內容 */
.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.item-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.item-message {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  word-break: break-all;
}

/* 未讀紅點 */
.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: var(--el-color-danger);
  border-radius: 50%;
}

.drawer-footer {
  padding: 10px 0;
  border-top: 1px solid var(--el-border-color-light);
}
</style>

<style>
/* 覆寫抽屜標題樣式 */
.notification-drawer .el-drawer__header {
  margin-bottom: 0;
  padding: 20px 20px 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}
.notification-drawer .el-drawer__body {
  padding: 16px 20px;
  background: var(--el-bg-color-page);
}
</style>