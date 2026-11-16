import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LoginView from '../views/LoginView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import { useAuthStore } from '@/stores/auth'
import { useFridgeStore } from '@/stores/fridge'
import { useTourStore } from '@/stores/tour'

// 動態導入（Lazy Loading）
const OnboardingView = () => import('../views/OnboardingView.vue')
const HomeView = () => import('../views/HomeView.vue')
const InventoryListView = () => import('../views/InventoryListView.vue')
const FridgeView = () => import('../views/FridgeView.vue')
const RecipeView = () => import('../views/RecipeView.vue')
const MealPlanView = () => import('../views/MealPlanView.vue')
const ShoppingListView = () => import('../views/ShoppingListView.vue')
const AnalyticsView = () => import('../views/AnalyticsView.vue')
const SettingsView = () => import('../views/SettingsView.vue')
const FamilyView = () => import('../views/FamilyView.vue')
const ReminderView = () => import('../views/ReminderView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const TrashView = () => import('../views/TrashView.vue')
const DietaryView = () => import('../views/DietaryView.vue')
const ManualView = () => import('../views/ManualView.vue') // 🌟 新增使用說明

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
  routes: [
    // =========================================
    // 公開路由（無需登入）
    // =========================================
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: '登入', requiresAuth: false }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: { title: '忘記密碼', requiresAuth: false }
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView,
      meta: { title: '初次設定', requiresAuth: true, requiresFridge: false }
    },

    // =========================================
    // 主應用（含 Layout 的受保護路由）
    // =========================================
    {
      path: '/',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: FridgeView,
          meta: { title: '冰箱視圖', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'fridge',
          redirect: '/'
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: HomeView,
          meta: { title: '儀表板', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: InventoryListView,
          meta: { title: '食材管理', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'recipe',
          name: 'recipe',
          component: RecipeView,
          meta: { title: 'AI 食譜推薦', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'meal-plan',
          name: 'meal-plan',
          component: MealPlanView,
          meta: { title: '一週菜單規劃', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'shopping',
          name: 'shopping',
          component: ShoppingListView,
          meta: { title: '購物清單', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: AnalyticsView,
          meta: { title: '成本與浪費分析', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'dietary',
          name: 'dietary',
          component: DietaryView,
          meta: { title: '過敏及忌口設定', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'family',
          name: 'family',
          component: FamilyView,
          meta: { title: '家庭管理', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'reminder',
          name: 'reminder',
          component: ReminderView,
          meta: { title: '通知中心', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfileView,
          meta: { title: '我的', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView,
          meta: { title: '系統設定', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'trash',
          name: 'trash',
          component: TrashView,
          meta: { title: '回收桶', requiresAuth: true, requiresFridge: true }
        },
        {
          path: 'manual',
          name: 'manual',
          component: ManualView,
          meta: { title: '使用說明', requiresAuth: true, requiresFridge: true }
        },
      ],
    },

    // 未知路徑 → 回首頁（冰箱視圖）
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
})

// =========================================
// 預載入引導路由
// =========================================
export function preloadTourRoutes() {
  const tourPages = [
    InventoryListView,
    MealPlanView,
    RecipeView,
    ShoppingListView,
    ReminderView,
    DietaryView,
    AnalyticsView,
    FamilyView,
    SettingsView
  ]
  
  tourPages.forEach(importFn => {
    importFn().catch(() => {})
  })
}

// =========================================
// 路由守衛
// =========================================
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const fridgeStore = useFridgeStore()

  // 1. 未登入 → 導向登入頁
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next('/login')
  }

  // 2. 已登入但進入登入頁 → 導向首頁
  if (to.path === '/login' && authStore.isLoggedIn) {
    return next('/')
  }

  // 3. 已登入但冰箱未設定 → 導向 onboarding
  if (
    to.meta.requiresFridge &&
    authStore.isLoggedIn &&
    !fridgeStore.isFridgeConfigured &&
    to.path !== '/onboarding'
  ) {
    return next('/onboarding')
  }

  next()
})

router.afterEach((to, from) => {
  // 登入後進入首頁，且從未看過引導 → 啟動引導
  if (to.path === '/' && from.path === '/login') {
    const tourStore = useTourStore()
    if (!tourStore.hasSeenTour) {
      setTimeout(() => {
        tourStore.startTour()
      }, 1200)
    }
  }
})

export default router