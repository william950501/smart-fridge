import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/HomeView.vue'
import InventoryListView from '../views/InventoryListView.vue'
import FridgeView from '../views/FridgeView.vue'
import RecipeView from '../views/RecipeView.vue'
import MealPlanView from '../views/MealPlanView.vue'
import ShoppingListView from '../views/ShoppingListView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'
import SettingsView from '../views/SettingsView.vue'
import FamilyView from '../views/FamilyView.vue'
import ReminderView from '../views/ReminderView.vue'
import ProfileView from '../views/ProfileView.vue'
import CustomFoodView from '../views/CustomFoodView.vue' // 新增這行
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { requiresAuth: false } },
    {
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', name: 'home', component: HomeView, meta: { title: '首頁儀表板', requiresAuth: true } },
        { path: 'inventory', name: 'inventory', component: InventoryListView, meta: { title: '食材管理', requiresAuth: true } },
        { path: 'fridge', name: 'fridge', component: FridgeView, meta: { title: '冰箱視圖', requiresAuth: true } },
        { path: 'recipe', name: 'recipe', component: RecipeView, meta: { title: 'AI 食譜推薦', requiresAuth: true } },
        { path: 'meal-plan', name: 'meal-plan', component: MealPlanView, meta: { title: '一週菜單規劃', requiresAuth: true } },
        { path: 'shopping', name: 'shopping', component: ShoppingListView, meta: { title: '購物清單', requiresAuth: true } },
        { path: 'analytics', name: 'analytics', component: AnalyticsView, meta: { title: '分析報表', requiresAuth: true } },
        { path: 'family', name: 'family', component: FamilyView, meta: { title: '家庭管理', requiresAuth: true } },
        { path: 'reminder', name: 'reminder', component: ReminderView, meta: { title: '到期提醒中心', requiresAuth: true } },
        { path: 'profile', name: 'profile', component: ProfileView, meta: { title: '我的', requiresAuth: true } },
        { path: 'settings', name: 'settings', component: SettingsView, meta: { title: '系統設定', requiresAuth: true } },
        { path: 'custom-food', name: 'custom-food', component: CustomFoodView, meta: { title: '自訂食材管理', requiresAuth: true } }, // 新增這行
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router