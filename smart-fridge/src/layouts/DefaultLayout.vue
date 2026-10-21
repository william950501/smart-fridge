<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useUiStore } from '@/stores/ui'
import { ElMessage } from 'element-plus'
import { 
  Plus, Edit, Camera, ShoppingCart, Odometer, Refrigerator, Bell, Bowl, Calendar, 
  DataAnalysis, List, User, Avatar, Setting, Menu as MenuIcon, Grid, House, 
  SwitchButton, Collection // 新增 Collection 圖示
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const inventoryStore = useInventoryStore()
const uiStore = useUiStore()

const notifications = computed(() => inventoryStore.urgentFoods)
const searchQuery = ref('')
const drawerVisible = ref(false)

// 新增選單彈窗狀態
const addMenuVisible = ref(false)

// 登出彈窗狀態
const logoutDialogVisible = ref(false)

// 預設展開的選單 (核心功能)
const openedMenus = ref(['core'])

function handleGlobalSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/inventory', query: { search: searchQuery.value.trim() } })
    drawerVisible.value = false
  }
}

// 點擊鈴鐺跳轉到提醒中心
function goToReminder() {
  router.push('/reminder')
}

// 打開新增選單
function openAddMenu() {
  addMenuVisible.value = true
  drawerVisible.value = false // 如果在手機版漢堡選單，點擊後關閉
}

// 處理新增選項跳轉
function handleAddOption(action) {
  addMenuVisible.value = false
  if (action === 'manual') {
    router.push({ path: '/inventory', query: { action: 'add' } })
  } else if (action === 'scan') {
    router.push({ path: '/inventory', query: { action: 'scan' } })
  } else if (action === 'shopping') {
    router.push({ path: '/shopping', query: { action: 'add' } })
  }
}

watch(() => route.path, () => { searchQuery.value = ''; drawerVisible.value = false })

// 打開登出彈窗
function openLogoutDialog() {
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
  <el-container class="app-layout">
    <!-- 電腦版側邊欄 -->
    <el-aside width="220px" class="app-aside desktop-aside">
      <div class="logo">
        <el-icon size="24" style="margin-right: 8px;"><Dish /></el-icon>
        智慧食材管理
      </div>

      <!-- 電腦版選單：手風琴收合 + 中間大按鈕 -->
      <el-menu 
        :default-active="route.path" 
        :default-openeds="openedMenus"
        router 
        class="app-menu"
      >
        <!-- 1. 核心功能 -->
        <el-sub-menu index="core">
          <template #title>
            <el-icon><Grid /></el-icon>
            <span>核心功能</span>
          </template>
          
          <el-menu-item index="/"><el-icon><Odometer /></el-icon>首頁儀表板</el-menu-item>
          <el-menu-item index="/fridge"><el-icon><Refrigerator /></el-icon>冰箱視圖</el-menu-item>
          
          <!-- 中間醒目的新增大按鈕 -->
          <div class="add-menu-btn-wrapper">
            <el-button type="primary" class="menu-add-btn" @click="openAddMenu">
              <el-icon style="margin-right: 6px;"><Plus /></el-icon> 立即新增
            </el-button>
          </div>

          <el-menu-item index="/reminder"><el-icon><Bell /></el-icon>到期提醒</el-menu-item>
          <el-menu-item index="/shopping"><el-icon><ShoppingCart /></el-icon>購物清單</el-menu-item>
        </el-sub-menu>

        <!-- 2. 智慧應用 -->
        <el-sub-menu index="smart">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>智慧應用</span>
          </template>
          <el-menu-item index="/inventory"><el-icon><List /></el-icon>食材管理</el-menu-item>
          <el-menu-item index="/recipe"><el-icon><Bowl /></el-icon>AI 食譜推薦</el-menu-item>
          <el-menu-item index="/meal-plan"><el-icon><Calendar /></el-icon>一週菜單規劃</el-menu-item>
          <el-menu-item index="/analytics"><el-icon><DataAnalysis /></el-icon>分析報表</el-menu-item>
          <!-- 新增自訂食材管理 -->
          <el-menu-item index="/custom-food"><el-icon><Collection /></el-icon>自訂食材管理</el-menu-item>
        </el-sub-menu>

        <!-- 3. 系統與帳號 -->
        <el-sub-menu index="system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系統與帳號</span>
          </template>
          <el-menu-item index="/family"><el-icon><User /></el-icon>家庭管理</el-menu-item>
          <el-menu-item index="/profile"><el-icon><Avatar /></el-icon>我的</el-menu-item>
          <el-menu-item index="/settings"><el-icon><Setting /></el-icon>系統設定</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 手機版抽屜選單 -->
    <el-drawer v-model="drawerVisible" direction="ltr" size="220px" :with-header="false" class="mobile-drawer">
      <div class="logo" style="color: var(--el-text-color-primary);">
        <el-icon size="24" style="margin-right: 8px;"><Dish /></el-icon>
        智慧食材管理
      </div>
      <el-menu :default-active="route.path" router class="app-menu">
        <el-menu-item index="/"><el-icon><Odometer /></el-icon>首頁儀表板</el-menu-item>
        <el-menu-item index="/inventory"><el-icon><List /></el-icon>食材管理</el-menu-item>
        <el-menu-item index="/fridge"><el-icon><Refrigerator /></el-icon>冰箱視圖</el-menu-item>
        <el-menu-item index="/reminder"><el-icon><Bell /></el-icon>到期提醒</el-menu-item>
        <el-menu-item index="/recipe"><el-icon><Bowl /></el-icon>AI 食譜推薦</el-menu-item>
        <el-menu-item index="/meal-plan"><el-icon><Calendar /></el-icon>一週菜單規劃</el-menu-item>
        <el-menu-item index="/shopping"><el-icon><ShoppingCart /></el-icon>購物清單</el-menu-item>
        <el-menu-item index="/analytics"><el-icon><DataAnalysis /></el-icon>分析報表</el-menu-item>
        <el-menu-item index="/custom-food"><el-icon><Collection /></el-icon>自訂食材</el-menu-item>
        <el-menu-item index="/family"><el-icon><User /></el-icon>家庭管理</el-menu-item>
        <el-menu-item index="/profile"><el-icon><Avatar /></el-icon>我的</el-menu-item>
        <el-menu-item index="/settings"><el-icon><Setting /></el-icon>系統設定</el-menu-item>
      </el-menu>
    </el-drawer>

    <el-container class="main-wrapper">
      <el-header class="app-header">
        <div class="left-header">
          <el-button class="mobile-menu-btn" text @click="drawerVisible = true">
            <el-icon size="24"><MenuIcon /></el-icon>
          </el-button>
          <span class="page-title desktop-only">{{ route.meta.title || '智慧食材管理系統' }}</span>
          
          <div class="global-search">
            <el-input 
              v-model="searchQuery" 
              placeholder="搜尋食材... (Enter)" 
              prefix-icon="Search" 
              clearable
              @keyup.enter="handleGlobalSearch"
              size="small"
            />
          </div>
        </div>
        
        <div class="right-header">
          <el-tooltip :content="uiStore.isDark ? '切換至淺色模式' : '切換至深色模式'" placement="bottom">
            <el-button circle text class="icon-btn" @click="uiStore.toggleTheme">
              <el-icon size="20">
                <Sunny v-if="uiStore.isDark" />
                <Moon v-else />
              </el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip content="到期提醒中心" placement="bottom">
            <el-badge :value="notifications.length" :hidden="notifications.length === 0" class="notification-badge">
              <el-button circle text class="icon-btn" @click="goToReminder">
                <el-icon size="20"><Bell /></el-icon>
              </el-button>
            </el-badge>
          </el-tooltip>

          <el-dropdown @command="openLogoutDialog">
            <span class="user-info">
              <el-avatar :size="32" style="background: #409eff; margin-right: 8px;">{{ authStore.user?.name?.charAt(0) || 'U' }}</el-avatar>
              <span class="desktop-only">{{ authStore.user?.name || '使用者' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu><el-dropdown-item command="logout">登出系統</el-dropdown-item></el-dropdown-menu>
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

    <!-- 手機版底部導覽列 (嚴格遵守藍圖 5 個項目) -->
    <div class="mobile-bottom-nav">
      <div class="nav-item" :class="{ active: route.path === '/fridge' }" @click="router.push('/fridge')">
        <el-icon><Refrigerator /></el-icon><span>冰箱</span>
      </div>
      <div class="nav-item" :class="{ active: route.path === '/shopping' }" @click="router.push('/shopping')">
        <el-icon><ShoppingCart /></el-icon><span>採買</span>
      </div>
      
      <!-- 正中間的「新增 (+)」按鈕 -->
      <div class="nav-item add-btn-item" @click="openAddMenu">
        <div class="add-circle">
          <el-icon size="24"><Plus /></el-icon>
        </div>
        <span style="margin-top: 2px;">新增</span>
      </div>

      <div class="nav-item" :class="{ active: route.path === '/reminder' }" @click="router.push('/reminder')">
        <el-icon><Bell /></el-icon><span>提醒</span>
      </div>
      <div class="nav-item" :class="{ active: route.path === '/profile' }" @click="router.push('/profile')">
        <el-icon><User /></el-icon><span>我的</span>
      </div>
    </div>

    <!-- 全域「新增」選單彈窗 -->
    <el-dialog v-model="addMenuVisible" title="您想要新增什麼？" width="400px" align-center class="custom-app-dialog add-menu-dialog">
      <div class="add-options">
        <div class="add-option-card" @click="handleAddOption('manual')">
          <div class="icon-box bg-primary"><el-icon size="28"><Edit /></el-icon></div>
          <div class="text-box"><h4>手動新增食材</h4><p>輸入品名、數量與期限</p></div>
        </div>
        <div class="add-option-card" @click="handleAddOption('scan')">
          <div class="icon-box bg-success"><el-icon size="28"><Camera /></el-icon></div>
          <div class="text-box"><h4>拍照辨識食材</h4><p>透過 AI 自動填入資訊</p></div>
        </div>
        <div class="add-option-card" @click="handleAddOption('shopping')">
          <div class="icon-box bg-warning"><el-icon size="28"><ShoppingCart /></el-icon></div>
          <div class="text-box"><h4>加入購物清單</h4><p>快速記錄待買物品</p></div>
        </div>
      </div>
    </el-dialog>

    <!-- 登出確認彈窗 -->
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
  </el-container>
</template>

<style scoped>
.app-layout { height: 100vh; width: 100%; display: flex; overflow: hidden; background-color: var(--el-bg-color-page); }
.app-aside { height: 100vh; background: var(--el-bg-color); color: var(--el-text-color-primary); border-right: 1px solid var(--el-border-color-light); z-index: 10; transition: background 0.3s, border-color 0.3s; display: flex; flex-direction: column; }
html.dark .app-aside { background: #1d1e1f; border-right: 1px solid #333; }
.logo { height: 60px; box-sizing: border-box; font-size: 18px; font-weight: bold; padding: 0 20px; color: var(--el-text-color-primary); border-bottom: 1px solid var(--el-border-color-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
html.dark .logo { border-bottom: 1px solid #333; }
.app-menu { border-right: none; background: transparent; flex: 1; overflow-y: auto; padding-top: 10px; }
.app-menu :deep(.el-menu-item) { color: var(--el-text-color-regular); margin: 4px 12px; border-radius: 8px; height: 44px; line-height: 44px; transition: all 0.2s; }
.app-menu :deep(.el-menu-item:hover) { background: var(--el-fill-color-light); color: var(--el-color-primary); }
.app-menu :deep(.el-menu-item.is-active) { background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: bold; }
.app-menu :deep(.el-sub-menu__title) { color: var(--el-text-color-secondary) !important; font-weight: bold; font-size: 13px; margin: 8px 12px 4px 12px; border-radius: 8px; transition: all 0.3s; height: 40px; line-height: 40px; }
.app-menu :deep(.el-sub-menu__title:hover) { background: var(--el-fill-color-light); color: var(--el-text-color-primary) !important; }
.app-menu :deep(.el-sub-menu.is-opened > .el-sub-menu__title) { color: var(--el-text-color-primary) !important; }
.add-menu-btn-wrapper { padding: 10px 12px; margin: 4px 0; }
.menu-add-btn { width: 100%; height: 44px; font-size: 16px; font-weight: bold; border-radius: 8px; background: linear-gradient(135deg, #409eff 0%, #2980b9 100%); border: none; box-shadow: 0 4px 12px rgba(64,158,255,0.4); transition: all 0.3s; }
.menu-add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(64,158,255,0.6); }
.main-wrapper { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.app-header { height: 60px; box-sizing: border-box; flex-shrink: 0; background: var(--el-bg-color); border-bottom: 1px solid var(--el-border-color-light); display: flex; justify-content: space-between; align-items: center; padding: 0 24px; transition: background 0.3s, border-color 0.3s; z-index: 20; }
.left-header { display: flex; align-items: center; gap: 16px; }
.page-title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); white-space: nowrap; }
.global-search { width: 250px; }
.right-header { display: flex; align-items: center; gap: 12px; }
.notification-badge { cursor: pointer; }
.icon-btn { transition: all 0.3s; color: var(--el-text-color-regular); }
.icon-btn:hover { background: var(--el-fill-color-light); transform: scale(1.1); }
.user-info { display: flex; align-items: center; cursor: pointer; color: var(--el-text-color-primary); font-weight: 500; padding: 4px 8px; border-radius: 8px; transition: background 0.3s; }
.user-info:hover { background: var(--el-fill-color-light); }
.app-main { flex: 1; overflow-y: auto; background: var(--el-bg-color-page); padding: 24px; transition: background 0.3s; }
.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(20px); opacity: 0; }
.mobile-menu-btn { display: none; }
.mobile-bottom-nav { display: none; }
.add-options { display: flex; flex-direction: column; gap: 16px; padding: 10px 0; }
.add-option-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--el-fill-color-lighter); border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.add-option-card:hover { background: var(--el-fill-color-light); border-color: var(--el-color-primary-light-5); transform: translateY(-2px); }
.icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bg-primary { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
.bg-success { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.bg-warning { background: var(--el-color-warning-light-9); color: var(--el-color-warning); }
.text-box h4 { margin: 0 0 4px 0; color: var(--el-text-color-primary); font-size: 16px; }
.text-box p { margin: 0; color: var(--el-text-color-secondary); font-size: 13px; }

/* 彈窗通用樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: 14px; color: var(--el-text-color-secondary); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; gap: 16px; width: 100%; }
.dialog-footer .el-button { width: 120px; }

@media (max-width: 768px) {
  .desktop-aside { display: none; }
  .mobile-menu-btn { display: block; }
  .desktop-only { display: none; }
  .global-search { width: 150px; }
  .app-header { padding: 0 12px; }
  .app-main { padding: 16px; padding-bottom: 90px; }
  .mobile-bottom-nav { display: flex; position: fixed; bottom: 0; left: 0; width: 100%; height: 65px; background: var(--el-bg-color); border-top: 1px solid var(--el-border-color-light); z-index: 100; justify-content: space-around; align-items: center; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); }
  .nav-item { display: flex; flex-direction: column; align-items: center; color: var(--el-text-color-secondary); font-size: 11px; cursor: pointer; transition: all 0.3s; flex: 1; }
  .nav-item.active { color: var(--el-color-primary); }
  .nav-item .el-icon { font-size: 22px; margin-bottom: 2px; }
  .add-btn-item { position: relative; top: -15px; }
  .add-circle { width: 50px; height: 50px; background: var(--el-color-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(64,158,255,0.4); margin-bottom: 4px; transition: transform 0.2s; }
  .add-circle:active { transform: scale(0.9); }
  .add-btn-item span { color: var(--el-color-primary); font-weight: bold; }
}
</style>

<style>
.mobile-drawer .el-drawer__body { background-color: var(--el-bg-color); padding: 0; }
html.dark .mobile-drawer .el-drawer__body { background-color: #1d1e1f; }
.custom-app-dialog { --el-dialog-bg-color: var(--el-bg-color-overlay); --el-dialog-border-radius: 16px; --el-dialog-padding-primary: 24px; }
.custom-app-dialog .el-dialog__header { margin-right: 0; text-align: center; border-bottom: 1px solid var(--el-border-color-light); padding-bottom: 16px; margin-bottom: 16px; }
.custom-app-dialog .el-dialog__title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); }
</style>