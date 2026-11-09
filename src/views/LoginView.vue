<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { Message, Lock, User, InfoFilled } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('login') // 'login' | 'register'
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '', // 註冊時需確認密碼
})

// 驗證規則：對齊藍圖「密碼至少 8 碼」
const rules = {
  email: [
    { required: true, message: '請輸入 Email', trigger: 'blur' },
    { type: 'email', message: '請輸入正確的 Email 格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '請輸入密碼', trigger: 'blur' },
    { min: 8, message: '密碼至少需要 8 個字元', trigger: 'blur' } // 改為 8 碼
  ],
}

const registerRules = {
  name: [{ required: true, message: '請輸入您的暱稱', trigger: 'blur' }],
  email: rules.email,
  password: [
    { required: true, message: '請設定密碼', trigger: 'blur' },
    { min: 8, message: '密碼至少需要 8 個字元', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '請再次輸入密碼', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('兩次輸入的密碼不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

async function handleLogin() {
  if (!formRef.value) return
  const currentRules = activeTab.value === 'register' ? registerRules : rules
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        if (activeTab.value === 'register') {
          // 這裡可以加上實際的註冊邏輯 (串接後端 API)
          ElMessage.success('註冊成功！即將為您建立家庭並登入...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        await authStore.login(form.email, form.password)
        ElMessage.success('歡迎回來！')
        router.push('/')
      } catch (error) {
        ElMessage.error(error.message || '登入失敗，請檢查帳號密碼')
      } finally {
        loading.value = false
      }
    }
  })
}

// 切換分頁時，清空驗證狀態
function switchTab(tab) {
  activeTab.value = tab
  formRef.value?.clearValidate()
}
</script>

<template>
  <div class="login-wrapper">
    <!-- 背景裝飾光暈 -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>
    <div class="bg-blob blob-3"></div>

    <div class="login-card">
      <div class="logo-area">
        <div class="logo-icon">
          <el-icon size="32"><Dish /></el-icon>
        </div>
        <h1>冰智庫</h1>
        <p>智慧食材管理系統</p>
      </div>

      <!-- 登入/註冊切換 -->
      <div class="tab-switcher">
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'login' }" 
          @click="switchTab('login')"
        >
          登入
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'register' }" 
          @click="switchTab('register')"
        >
          註冊
        </div>
        <div class="tab-slider" :class="{ 'is-register': activeTab === 'register' }"></div>
      </div>

      <el-form ref="formRef" :model="form" :rules="activeTab === 'login' ? rules : registerRules" size="large" class="login-form">
        
        <!-- 註冊時才顯示暱稱 -->
        <el-form-item v-if="activeTab === 'register'" prop="name">
          <el-input v-model="form.name" placeholder="您的暱稱" :prefix-icon="User" />
        </el-form-item>

        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="請輸入 Email" :prefix-icon="Message" />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="請輸入密碼 (至少 8 碼)" 
            :prefix-icon="Lock" 
            show-password 
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <!-- 註冊時顯示確認密碼與提示 -->
        <template v-if="activeTab === 'register'">
          <el-form-item prop="confirmPassword">
            <el-input 
              v-model="form.confirmPassword" 
              type="password" 
              placeholder="請再次輸入密碼" 
              :prefix-icon="Lock" 
              show-password 
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          
          <div class="password-tip">
            <el-icon color="var(--el-color-warning)"><InfoFilled /></el-icon>
            為了您的帳號安全，密碼至少需包含 8 個字元。
          </div>
        </template>

        <el-form-item style="margin-top: 24px;">
          <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
            {{ activeTab === 'login' ? '登入系統' : '建立帳號' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="footer">
        <span>© 2026 IceMind. 減少浪費，從家開始。</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-bg-color-page);
  position: relative;
  overflow: hidden;
}

/* 背景光暈 (適應深淺色) */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.5;
}
.blob-1 { width: 400px; height: 400px; background: var(--el-color-primary-light-7); top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: var(--el-color-success-light-7); bottom: -50px; right: -50px; }
.blob-3 { width: 250px; height: 250px; background: var(--el-color-warning-light-7); bottom: 20%; left: 20%; }
html.dark .bg-blob { opacity: 0.2; }

/* 登入卡片 (毛玻璃質感) */
.login-card {
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
  z-index: 1;
  margin: 20px;
}
html.dark .login-card {
  background: rgba(30, 30, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.logo-area {
  text-align: center;
  margin-bottom: 30px;
}
.logo-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--el-color-primary) 0%, #2980b9 100%);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px auto;
  box-shadow: 0 8px 16px rgba(64, 158, 255, 0.3);
}
.logo-area h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  color: var(--el-text-color-primary);
  font-weight: bold;
}
.logo-area p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

/* 切換標籤 */
.tab-switcher {
  display: flex;
  position: relative;
  background: var(--el-fill-color);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  z-index: 1;
  transition: color 0.3s;
}
.tab-item.active {
  color: var(--el-color-primary);
}
.tab-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.tab-slider.is-register {
  transform: translateX(100%);
}

/* 表單與按鈕 */
.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 16px;
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

/* 密碼提示 */
.password-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: -10px;
  margin-bottom: 16px;
  padding-left: 8px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--el-color-primary) 0%, #2980b9 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s;
}
.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.5);
}

.footer {
  text-align: center;
  margin-top: 30px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>