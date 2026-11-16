<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useUiStore } from '@/stores/ui'
import { useToast } from '@/composables/useToast'
import {
  Plus, Camera, ShoppingCart, Odometer, Refrigerator, Bell, Bowl, Calendar,
  DataAnalysis, List, User, Setting, Menu, SwitchButton, Delete, MagicStick,
  Edit, Search, Close, Notification, Warning, Lock, Document
} from '@element-plus/icons-vue'
import NotificationDrawer from '@/components/notification/NotificationDrawer.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const uiStore = useUiStore()
const { showToast } = useToast()

const notificationDrawerVisible = ref(false)
const announcementVisible = ref(false)
const searchQuery = ref('')
const searchFocused = ref(false)
const drawerVisible = ref(false)
const addMenuVisible = ref(false)
const logoutDialogVisible = ref(false)
const mobileSearchVisible = ref(false)

const isExpanded = computed(() => uiStore.isSidebarExpanded)

// =========================================
// 最近搜尋歷史
// =========================================
const searchHistory = ref(JSON.parse(localStorage.getItem('searchHistory')) || [])

function addSearchHistory(query) {
  if (!query.trim()) return
  const q = query.trim()
  searchHistory.value = [q, ...searchHistory.value.filter(item => item !== q)].slice(0, 5)
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

function clearSearchHistory() {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

function goToSearch(query) {
  searchQuery.value = query
  handleGlobalSearch()
}

// =========================================
// 搜尋與導航
// =========================================
function goHome() {
  router.push('/')
  drawerVisible.value = false
}

function handleGlobalSearch() {
  if (searchQuery.value.trim()) {
    addSearchHistory(searchQuery.value)
    router.push({ path: '/inventory', query: { search: searchQuery.value.trim() } })
    drawerVisible.value = false
    searchFocused.value = false
    mobileSearchVisible.value = false
  }
}

function openAddMenu() {
  addMenuVisible.value = true
  drawerVisible.value = false
}

function handleAddOption(action) {
  addMenuVisible.value = false
  if (action === 'manual') router.push({ path: '/inventory', query: { action: 'add' } })
  else if (action === 'scan') router.push({ path: '/inventory', query: { action: 'scan' } })
  else if (action === 'shopping') router.push({ path: '/shopping', query: { action: 'add' } })
}

watch(() => route.path, () => {
  searchQuery.value = ''
  searchFocused.value = false
  drawerVisible.value = false
  mobileSearchVisible.value = false
})

// =========================================
// 用戶與設定
// =========================================
function handleUserCommand(command) {
  if (command === 'profile') router.push('/profile')
  else if (command === 'settings') router.push('/settings')
  else if (command === 'logout') openLogoutDialog()
  else if (command === 'trash') router.push('/trash')
}

function openLogoutDialog() { logoutDialogVisible.value = true }

function confirmLogout() {
  authStore.logout()
  showToast({ title: '已安全登出', type: 'success' })
  logoutDialogVisible.value = false
  router.push('/login')
}

// =========================================
// 選單設定
// =========================================
const coreMenu = [
  { path: '/', icon: Refrigerator, label: '冰箱視圖' },
  { path: '/dashboard', icon: Odometer, label: '儀表板' },
  { path: '/shopping', icon: ShoppingCart, label: '購物' },
  { path: '/reminder', icon: Bell, label: '提醒' },
  { path: '/profile', icon: User, label: '我的' },
]

const smartAppsMenu = [
  { path: '/inventory', icon: List, label: '食材管理' },
  { path: '/recipe', icon: Bowl, label: 'AI 食譜推薦' },
  { path: '/meal-plan', icon: Calendar, label: '一週菜單' },
  { path: '/analytics', icon: DataAnalysis, label: '價值與損耗分析' },
  { path: '/dietary', icon: Lock, label: '過敏及忌口' },
]

const systemMenu = [
  { path: '/family', icon: User, label: '家庭管理' },
  { path: '/settings', icon: Setting, label: '系統設定' },
]

// 🌟 新增：其他選單
const otherMenu = [
  { path: '/manual', icon: Document, label: '使用說明' },
  { path: '/announcement', icon: Notification, label: '系統公告', action: 'announcement' },
  { path: '/trash', icon: Delete, label: '回收桶' }
]

// 處理「其他」選單的點擊
function handleOtherMenu(item) {
  if (item.action === 'announcement') {
    announcementVisible.value = true
    drawerVisible.value = false
  } else {
    router.push(item.path)
    drawerVisible.value = false
  }
}

function isActive(path) {
  return route.path === path
}

// =========================================
// 全域鍵盤快捷鍵
// =========================================
const searchInputRef = ref(null)
const mobileSearchInputRef = ref(null)

function handleKeydown(e) {
  const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
  
  if (e.key === 'Escape') {
    if (addMenuVisible.value) addMenuVisible.value = false
    if (logoutDialogVisible.value) logoutDialogVisible.value = false
    if (notificationDrawerVisible.value) notificationDrawerVisible.value = false
    if (announcementVisible.value) announcementVisible.value = false
    if (drawerVisible.value) drawerVisible.value = false
    if (mobileSearchVisible.value) mobileSearchVisible.value = false
    searchFocused.value = false
    if (document.activeElement) document.activeElement.blur()
    return
  }

  if (isInput) return

  if (e.key === '/') {
    e.preventDefault()
    if (window.innerWidth <= 768) {
      mobileSearchVisible.value = true
      setTimeout(() => mobileSearchInputRef.value?.focus(), 100)
    } else {
      searchInputRef.value?.focus()
    }
  } else if (e.key.toLowerCase() === 'n') {
    e.preventDefault()
    openAddMenu()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <el-container class="app-layout">
    <!-- 左側邊欄 (電腦版) -->
    <el-aside class="app-aside desktop-aside" :class="{ 'is-expanded': isExpanded }">
      <div class="sidebar-header">
        <button class="menu-btn" @click="uiStore.toggleSidebar" aria-label="切換側邊欄">
          <el-icon><Menu /></el-icon>
        </button>
        <div class="logo-text" @click="goHome">鮮知</div>
      </div>

      <div class="sidebar-menu">
        <div 
          v-for="item in coreMenu" 
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          @click="router.push(item.path)"
        >
          <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
          <span class="menu-label">{{ item.label }}</span>
        </div>

        <el-tooltip content="今晚吃什麼？一鍵 AI 排餐" placement="right" :disabled="isExpanded">
          <div class="contextual-cta" @click="router.push('/meal-plan')">
            <div class="cta-icon-wrapper">
              <el-icon class="cta-icon"><MagicStick /></el-icon>
            </div>
            <span class="mobile-cta-label">排餐</span>
            <div class="cta-text">
              <strong>今晚吃什麼？</strong>
              <span>一鍵 AI 排餐</span>
            </div>
          </div>
        </el-tooltip>

        <template v-if="isExpanded">
          <div class="menu-section-title">智慧應用</div>
          <div 
            v-for="item in smartAppsMenu" 
            :key="item.path"
            class="menu-item"
            :class="{ active: isActive(item.path) }"
            @click="router.push(item.path)"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>

          <div class="menu-section-title">系統與帳號</div>
          <div 
            v-for="item in systemMenu" 
            :key="item.path"
            class="menu-item"
            :class="{ active: isActive(item.path) }"
            @click="router.push(item.path)"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>

          <!-- 🌟 新增：電腦版「其他」群組 -->
          <div class="menu-section-title">其他</div>
          <div 
            v-for="item in otherMenu" 
            :key="item.label"
            class="menu-item"
            :class="{ active: isActive(item.path) }"
            @click="handleOtherMenu(item)"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>
        </template>
      </div>

      <div class="sidebar-profile" @click="router.push('/profile')">
        <el-avatar :size="32" class="avatar">{{ authStore.user?.name?.charAt(0) || 'U' }}</el-avatar>
        <div class="profile-info" v-if="isExpanded">
          <strong>{{ authStore.user?.name || '使用者' }}</strong>
          <span>我的智慧家庭</span>
        </div>
      </div>
    </el-aside>

    <!-- 手機版側邊抽屜 -->
    <el-drawer v-model="drawerVisible" direction="ltr" size="280px" :with-header="false" class="mobile-drawer">
      <div class="mobile-drawer-inner">
        <!-- Header -->
        <div class="sidebar-header" @click="goHome">
          <div class="logo-text is-expanded">鮮知</div>
        </div>

        <!-- Menu -->
        <div class="sidebar-menu is-expanded">
          <!-- 核心功能 -->
          <div 
            v-for="item in coreMenu" 
            :key="item.path"
            class="menu-item"
            :class="{ active: isActive(item.path) }"
            @click="router.push(item.path); drawerVisible = false"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>

          <!-- AI 排餐 CTA -->
          <div class="contextual-cta" @click="router.push('/meal-plan'); drawerVisible = false">
            <div class="cta-icon-wrapper">
              <el-icon class="cta-icon"><MagicStick /></el-icon>
            </div>
            <div class="cta-text">
              <strong>今晚吃什麼？</strong>
              <span>一鍵 AI 排餐</span>
            </div>
          </div>

          <!-- 智慧應用 -->
          <div class="menu-section-title">智慧應用</div>
          <div 
            v-for="item in smartAppsMenu" 
            :key="item.path"
            class="menu-item"
            :class="{ active: isActive(item.path) }"
            @click="router.push(item.path); drawerVisible = false"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>

          <!-- 系統與帳號 -->
          <div class="menu-section-title">系統與帳號</div>
          <div 
            v-for="item in systemMenu" 
            :key="item.path"
            class="menu-item"
            :class="{ active: isActive(item.path) }"
            @click="router.push(item.path); drawerVisible = false"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>

          <!-- 🌟 新增：手機版「其他」群組 -->
          <div class="menu-section-title">其他</div>
          <div 
            v-for="item in otherMenu" 
            :key="item.label"
            class="menu-item" 
            :class="{ active: isActive(item.path) }"
            @click="handleOtherMenu(item)"
          >
            <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>
        </div>

        <!-- 底部個人資料 -->
        <div class="sidebar-profile is-expanded" @click="router.push('/profile'); drawerVisible = false">
          <el-avatar :size="32" class="avatar">{{ authStore.user?.name?.charAt(0) || 'U' }}</el-avatar>
          <div class="profile-info is-expanded">
            <strong>{{ authStore.user?.name || '使用者' }}</strong>
            <span>我的智慧家庭</span>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-container class="main-wrapper">
      <!-- 頂部 Header -->
      <el-header class="app-header">
        <div class="left-header">
          <el-button class="mobile-menu-btn" text @click="drawerVisible = true" aria-label="開啟選單">
            <el-icon size="24"><Menu /></el-icon>
          </el-button>
          <span class="page-title desktop-only">{{ route.meta.title || '鮮知 - 智慧食材管理系統' }}</span>
          
          <!-- 電腦端搜尋 -->
          <div class="global-search desktop-only">
            <el-popover
              placement="bottom-start"
              :width="280"
              trigger="manual"
              :visible="searchFocused && !searchQuery && searchHistory.length > 0"
            >
              <template #reference>
                <el-input 
                  ref="searchInputRef"
                  v-model="searchQuery" 
                  placeholder="搜尋食材... (按 / 聚焦)" 
                  prefix-icon="Search" 
                  clearable 
                  @keyup.enter="handleGlobalSearch"
                  @focus="searchFocused = true"
                  @blur="searchFocused = false"
                  size="small" 
                />
              </template>
              <div class="search-history-box">
                <div class="history-header">
                  <span>最近搜尋</span>
                  <el-button link size="small" @click="clearSearchHistory">清除</el-button>
                </div>
                <div v-for="h in searchHistory" :key="h" class="history-item" @click="goToSearch(h)">
                  <el-icon><Search /></el-icon> {{ h }}
                </div>
              </div>
            </el-popover>
          </div>
        </div>

        <div class="right-header">
          <!-- 手機端搜尋按鈕 -->
          <el-button class="header-icon-btn mobile-only" text @click="mobileSearchVisible = true" aria-label="搜尋">
            <el-icon size="20"><Search /></el-icon>
          </el-button>

          <!-- 系統公告 -->
          <el-tooltip content="系統公告" placement="bottom">
            <el-button class="header-text-btn" text @click="announcementVisible = true">
              <el-icon size="18"><Notification /></el-icon>
              <span class="btn-text">公告</span>
            </el-button>
          </el-tooltip>

          <!-- 通知中心 -->
          <el-tooltip content="通知中心" placement="bottom">
            <el-badge :value="notificationStore.unreadCount" :hidden="notificationStore.unreadCount === 0" class="notification-badge">
              <el-button class="header-icon-btn" text @click="notificationDrawerVisible = true" aria-label="通知中心">
                <el-icon size="20"><Bell /></el-icon>
              </el-button>
            </el-badge>
          </el-tooltip>

          <!-- 使用者頭像與下拉選單 -->
          <el-dropdown @command="handleUserCommand" trigger="click">
            <span class="user-info" aria-label="使用者選單">
              <el-avatar :size="32" class="user-avatar">{{ authStore.user?.name?.charAt(0) || 'U' }}</el-avatar>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile" :icon="User">我的</el-dropdown-item>
                <el-dropdown-item command="settings" :icon="Setting">系統設定</el-dropdown-item>
                <el-dropdown-item command="trash" :icon="Delete">回收桶</el-dropdown-item>
                <el-dropdown-item command="logout" :icon="SwitchButton" divided>登出系統</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="app-main">
        <transition name="slide-fade" mode="out-in">
          <router-view :key="route.path" />
        </transition>
      </el-main>
    </el-container>

    <!-- 手機版全屏搜尋層 -->
    <transition name="fade">
      <div v-if="mobileSearchVisible" class="mobile-search-overlay">
        <div class="mobile-search-header">
          <el-input 
            ref="mobileSearchInputRef"
            v-model="searchQuery" 
            placeholder="搜尋食材..." 
            prefix-icon="Search" 
            clearable 
            @keyup.enter="handleGlobalSearch"
            size="large"
          />
          <el-button text class="cancel-btn" @click="mobileSearchVisible = false">取消</el-button>
        </div>
        <div class="mobile-search-body">
          <div v-if="searchHistory.length > 0" class="search-history-box">
            <div class="history-header">
              <span>最近搜尋</span>
              <el-button link size="small" @click="clearSearchHistory">清除</el-button>
            </div>
            <div v-for="h in searchHistory" :key="h" class="history-item" @click="goToSearch(h)">
              <el-icon><Search /></el-icon> {{ h }}
            </div>
          </div>
          <div v-else class="empty-hint">輸入關鍵字來尋找食材</div>
        </div>
      </div>
    </transition>

    <!-- 手機版底部導航列 -->
    <div class="mobile-bottom-nav">
      <div class="nav-item" :class="{ active: route.path === '/' }" @click="router.push('/')"><el-icon><Refrigerator /></el-icon><span>冰箱</span></div>
      <div class="nav-item" :class="{ active: route.path === '/shopping' }" @click="router.push('/shopping')"><el-icon><ShoppingCart /></el-icon><span>採買</span></div>
      <div class="nav-item add-btn-item" @click="openAddMenu"><div class="add-circle"><el-icon size="24"><Plus /></el-icon></div><span style="margin-top: 2px;">新增</span></div>
      <div class="nav-item" :class="{ active: route.path === '/reminder' }" @click="router.push('/reminder')"><el-icon><Bell /></el-icon><span>提醒</span></div>
      <div class="nav-item" :class="{ active: route.path === '/profile' }" @click="router.push('/profile')"><el-icon><User /></el-icon><span>我的</span></div>
    </div>

    <!-- 新增彈窗 (手機端 Bottom Sheet) -->
    <el-dialog v-model="addMenuVisible" title="您想要新增什麼？" width="400px" align-center class="custom-app-dialog add-menu-dialog mobile-bottom-sheet">
      <div class="add-options">
        <div class="add-option-card" @click="handleAddOption('manual')"><div class="icon-box bg-primary"><el-icon size="28"><Edit /></el-icon></div><div class="text-box"><h4>手動新增食材</h4><p>輸入品名、數量與期限</p></div></div>
        <div class="add-option-card" @click="handleAddOption('scan')"><div class="icon-box bg-success"><el-icon size="28"><Camera /></el-icon></div><div class="text-box"><h4>拍照辨識食材</h4><p>透過 AI 自動填入資訊</p></div></div>
        <div class="add-option-card" @click="handleAddOption('shopping')"><div class="icon-box bg-warning"><el-icon size="28"><ShoppingCart /></el-icon></div><div class="text-box"><h4>加入購物清單</h4><p>快速記錄待買物品</p></div></div>
      </div>
    </el-dialog>

    <!-- 系統公告彈窗 -->
    <el-dialog v-model="announcementVisible" title="系統公告" width="450px" align-center class="custom-app-dialog">
      <div class="announcement-content">
        <div class="announcement-item">
          <el-tag type="danger" size="small" effect="dark" round>最新</el-tag>
          <h4>鮮知 v2.0 全新升級！</h4>
          <p>我們優化了介面與 AI 推薦演算法，現在支援「家庭口味聚合」與「庫存價值分析」，快來體驗！</p>
          <span class="announcement-date">2026-11-15</span>
        </div>
        <el-divider />
        <div class="announcement-item">
          <el-tag type="info" size="small" effect="plain" round>功能</el-tag>
          <h4>新增「拍照辨識食材」</h4>
          <p>現在起，您可以在「新增食材」時使用 AI 模擬拍照功能，自動辨識品項與期限。</p>
          <span class="announcement-date">2026-11-10</span>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="announcementVisible = false">我知道了</el-button>
      </template>
    </el-dialog>

    <!-- 登出彈窗 -->
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

    <NotificationDrawer v-model="notificationDrawerVisible" />
  </el-container>
</template>

<style scoped>
.app-layout { 
  height: 100vh; 
  height: 100dvh;
  width: 100%; 
  display: flex; 
  overflow: hidden; 
  background-color: var(--ground); 
}

/* --- 側邊欄 --- */
.app-aside { 
  width: 84px; 
  background: var(--surface); 
  border-right: 1px solid var(--border); 
  display: flex; 
  flex-direction: column; 
  transition: width 300ms var(--ease-out); 
  z-index: 10; 
  overflow: hidden; 
}
.app-aside.is-expanded { width: 240px; }
.sidebar-header { 
  height: 64px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  border-bottom: 1px solid var(--border-light); 
  padding: 0 16px; 
  flex-shrink: 0; 
}
.is-expanded .sidebar-header { justify-content: flex-start; }
.menu-btn { 
  background: none; 
  border: none; 
  color: var(--ink); 
  font-size: 24px; 
  cursor: pointer; 
  padding: 8px; 
  border-radius: var(--radius-sm); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transition: background-color var(--transition-fast); 
}
.menu-btn:hover { background: var(--border-light); }
.logo-text { 
  font-family: var(--font-display); 
  font-size: 22px; 
  font-weight: 700; 
  color: var(--accent); 
  margin-left: 12px; 
  white-space: nowrap; 
  cursor: pointer; 
  opacity: 0; 
  width: 0; 
  display: none; 
  transition: opacity 200ms var(--ease-out); 
}
.is-expanded .logo-text { opacity: 1; width: auto; display: block; }
.sidebar-menu { 
  flex: 1; 
  padding: 16px 8px; 
  display: flex; 
  flex-direction: column; 
  gap: 4px; 
  overflow-y: auto; 
}
.sidebar-menu::-webkit-scrollbar { display: none; }
.menu-item { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  padding: 12px 4px; 
  border-radius: var(--radius-md); 
  color: var(--muted); 
  cursor: pointer; 
  transition: background-color var(--transition-fast), color var(--transition-fast); 
  text-align: center; 
}
.menu-icon { font-size: 22px; margin-bottom: 4px; }
.menu-label { font-size: 11px; font-weight: 500; white-space: nowrap; }
.menu-item:hover { background: var(--surface-hover); color: var(--ink); }
.menu-item.active { background: var(--accent-light); color: var(--accent); }
.menu-item.active .menu-icon { color: var(--accent); }
.is-expanded .menu-item { flex-direction: row; justify-content: flex-start; padding: 10px 16px; text-align: left; }
.is-expanded .menu-icon { margin-bottom: 0; margin-right: 12px; min-width: 24px; }
.is-expanded .menu-label { font-size: 14px; font-weight: 600; }
.menu-section-title { 
  font-size: 11px; 
  font-weight: 700; 
  color: var(--muted); 
  text-transform: uppercase; 
  letter-spacing: 0.05em; 
  margin: 16px 16px 8px; 
  display: none; 
}
.is-expanded .menu-section-title { display: block; }
.contextual-cta { 
  margin: 12px 8px; 
  background: var(--surface); 
  border: 1px solid var(--border); 
  border-radius: var(--radius-md); 
  padding: 12px 4px; 
  height: 72px; 
  box-sizing: border-box; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  gap: 4px; 
  cursor: pointer; 
  transition: border-color var(--transition-fast), background-color var(--transition-fast); 
  overflow: hidden; 
  position: relative; 
}
.is-expanded .contextual-cta { 
  flex-direction: row; 
  padding: 12px 16px; 
  height: auto; 
  min-height: 64px; 
  justify-content: flex-start; 
  gap: 12px; 
}
.contextual-cta:hover { border-color: var(--accent); background: var(--accent-light); }
.cta-icon-wrapper { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cta-icon { font-size: 22px; color: var(--accent); }
.mobile-cta-label { font-size: 11px; font-weight: 600; color: var(--accent); white-space: nowrap; }
.cta-text { display: none; text-align: left; width: 100%; }
.is-expanded .cta-text { display: block; }
.is-expanded .mobile-cta-label { display: none; }
.cta-text strong { display: block; font-size: 14px; color: var(--ink); line-height: 1.3; margin-bottom: 2px; }
.cta-text span { font-size: 12px; color: var(--muted); line-height: 1.2; display: block; }
.sidebar-profile { 
  padding: 16px; 
  border-top: 1px solid var(--border-light); 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 8px; 
  cursor: pointer; 
  transition: background-color var(--transition-fast); 
  white-space: nowrap; 
  flex-shrink: 0; 
}
.sidebar-profile:hover { background: var(--surface-hover); }
.avatar { background: var(--accent); color: #FFF; font-weight: bold; }
.profile-info { display: none; text-align: left; }
.is-expanded .sidebar-profile { flex-direction: row; padding: 16px; }
.is-expanded .profile-info { display: block; margin-left: 12px; }
.profile-info strong { display: block; font-size: 14px; color: var(--ink); }
.profile-info span { font-size: 12px; color: var(--muted); }

/* --- Header --- */
.main-wrapper { display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; }
.app-header { 
  height: var(--header-h); 
  flex-shrink: 0; 
  background: var(--surface); 
  border-bottom: 1px solid var(--border-light); 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 0 var(--page-pad-x); 
  z-index: 20; 
}
.left-header { display: flex; align-items: center; gap: 16px; height: 100%; }
.page-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.global-search { width: 250px; position: relative; }

/* 🌟 Header 右側圖示群組：統一高度與等距間距 */
.right-header { 
  display: flex; 
  align-items: center; 
  gap: 8px;
  height: 100%;
}

/* 🌟 純圖示按鈕 (搜尋、鈴鐺) */
.header-icon-btn { 
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted); 
  padding: 0;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}
.header-icon-btn:hover { background: var(--surface-hover); color: var(--ink); }

/* 🌟 帶文字的按鈕 (公告) */
.header-text-btn {
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}
.header-text-btn:hover { background: var(--surface-hover); color: var(--ink); }
.header-text-btn .btn-text {
  font-size: 14px;
  font-weight: 600;
}

.user-info { 
  display: flex; 
  align-items: center; 
  justify-content: center;
  cursor: pointer; 
  padding: 4px; 
  border-radius: 50%; 
  transition: background-color var(--transition-fast); 
  margin-left: 4px;
}
.user-info:hover { background: var(--surface-hover); }
.user-avatar { background: var(--accent); color: #fff; }

.app-main { flex: 1; overflow-y: auto; background: var(--ground); padding: var(--space-5); }

/* 通知角標客製化 */
.notification-badge {
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.el-badge__content.is-fixed) {
  top: 8px;
  right: 10px;
  border: 2px solid var(--surface);
  padding: 0 4px;
  height: 16px;
  line-height: 12px;
}

/* 搜尋歷史 Popover */
.search-history-box { padding: 4px 0; }
.history-header { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-xs); color: var(--muted); margin-bottom: 8px; padding: 0 8px; }
.history-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; font-size: var(--text-sm); color: var(--ink); border-radius: var(--radius-sm); cursor: pointer; transition: background-color var(--transition-fast); }
.history-item:hover { background: var(--surface-hover); }

/* 手機版全屏搜尋 */
.mobile-search-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: var(--surface);
  z-index: 2000;
  display: flex; flex-direction: column;
}
.mobile-search-header {
  display: flex; align-items: center; gap: 12px;
  padding: calc(var(--safe-top) + 12px) 16px 12px;
  border-bottom: 1px solid var(--border-light);
}
.cancel-btn { color: var(--muted); padding: 0 8px; }
.mobile-search-body { padding: 16px; flex: 1; overflow-y: auto; }
.empty-hint { text-align: center; color: var(--muted); margin-top: 40px; font-size: var(--text-sm); }

/* 公告內容樣式 */
.announcement-content { padding: 0 10px; }
.announcement-item { display: flex; flex-direction: column; gap: 6px; }
.announcement-item h4 { margin: 0; font-size: var(--text-base); color: var(--ink); font-weight: 600; }
.announcement-item p { margin: 0; font-size: var(--text-sm); color: var(--muted); line-height: 1.5; }
.announcement-date { font-size: var(--text-xs); color: var(--border); margin-top: 4px; }

.slide-fade-enter-active { transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out); }
.slide-fade-leave-active { transition: opacity 150ms var(--ease-out), transform 150ms var(--ease-out); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(10px); opacity: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms var(--ease-out); }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.mobile-menu-btn { display: none; }
.mobile-bottom-nav { display: none; }

.add-options { display: flex; flex-direction: column; gap: 12px; padding: 10px 0; }
.add-option-card { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
  padding: 16px; 
  background: var(--surface); 
  border-radius: var(--radius-md); 
  cursor: pointer; 
  transition: border-color var(--transition-fast), background-color var(--transition-fast); 
  border: 1px solid var(--border-light); 
}
.add-option-card:hover { background: var(--surface-hover); border-color: var(--border); }
.icon-box { width: 48px; height: 48px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bg-primary { background: var(--accent-light); color: var(--accent); }
.bg-success { background: var(--el-color-success-light-9); color: var(--sage); }
.bg-warning { background: var(--el-color-warning-light-9); color: var(--warning); }
.text-box h4 { margin: 0 0 4px 0; color: var(--ink); font-size: 16px; font-family: var(--font-body); }
.text-box p { margin: 0; color: var(--muted); font-size: 13px; }

.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 18px; font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: 14px; color: var(--muted); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 120px; }

@media (max-width: 768px) {
  .desktop-aside { display: none; }
  .mobile-menu-btn { display: block; }
  .desktop-only { display: none !important; }
  
  .app-header { padding: 0 12px; gap: 4px; }
  .right-header { gap: 2px; padding-right: 4px; }
  
  .app-main { 
    padding: var(--space-4); 
    padding-bottom: calc(var(--bottom-nav-h) + var(--space-6) + var(--safe-bottom)); 
  }
  
  .mobile-bottom-nav { 
    display: flex; 
    position: fixed; 
    bottom: 0; 
    left: 0; 
    width: 100%; 
    height: calc(var(--bottom-nav-h) + var(--safe-bottom)); 
    padding-bottom: var(--safe-bottom);
    background: var(--surface); 
    border-top: 1px solid var(--border-light); 
    z-index: 100; 
    justify-content: space-around; 
    align-items: center; 
    box-shadow: 0 -2px 10px rgba(33,31,28,0.02); 
  }
  .nav-item { display: flex; flex-direction: column; align-items: center; color: var(--muted); font-size: 11px; cursor: pointer; transition: color var(--transition-fast); flex: 1; }
  .nav-item.active { color: var(--accent); }
  .nav-item .el-icon { font-size: 22px; margin-bottom: 2px; }
  .add-btn-item { position: relative; top: -15px; }
  .add-circle { 
    width: 50px; 
    height: 50px; 
    background: var(--accent); 
    color: white; 
    border-radius: 50%; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    box-shadow: var(--shadow-md); 
    margin-bottom: 4px; 
    transition: transform var(--transition-fast); 
  }
  .add-circle:active { transform: scale(0.95); }
  .add-btn-item span { color: var(--accent); font-weight: bold; }

  /* 手機端 Bottom Sheet 彈窗改造 */
  .mobile-bottom-sheet {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
    margin: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    position: absolute;
    bottom: 0;
    left: 0;
  }
  .mobile-bottom-sheet.el-dialog {
    transform: translateY(0);
    animation: slideUp 300ms var(--ease-out);
  }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>

<style>
/* 手機版抽屜專屬覆寫 */
.mobile-drawer .el-drawer__body {
  padding: 0;
  background: var(--surface);
}
.mobile-drawer-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.custom-app-dialog { --el-dialog-bg-color: var(--surface); --el-dialog-border-radius: var(--radius-lg); --el-dialog-padding-primary: 24px; }
.custom-app-dialog .el-dialog__header { margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light); padding-bottom: 16px; margin-bottom: 16px; }
.custom-app-dialog .el-dialog__title { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink); }

@media (max-width: 768px) {
  .mobile-bottom-sheet .el-dialog__header { padding-top: 16px; }
  .mobile-bottom-sheet .el-dialog__footer { padding-bottom: calc(16px + var(--safe-bottom)); }
}
</style>