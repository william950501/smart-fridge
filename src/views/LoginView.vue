<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { Message, Lock, User, InfoFilled, Key, Dish } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('login')
const formRef = ref(null)
const loading = ref(false)
const rememberMe = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
let countdownTimer = null

const loginAttempts = ref(0)
const lockoutTimer = ref(0)
let lockoutInterval = null
const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 60

const form = reactive({
  name: '', email: '', password: '', confirmPassword: '', verifyCode: '',
})

// 密碼強度計算
const passwordStrength = computed(() => {
  const pwd = form.password
  if (!pwd) return { level: 0, text: '未輸入', color: 'var(--border)' }
  
  let score = 0
  if (pwd.length >= 8) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z\d]/.test(pwd)) score++

  if (score <= 1) return { level: 1, text: '弱', color: 'var(--danger)' }
  if (score === 2 || score === 3) return { level: 2, text: '中', color: 'var(--warning)' }
  return { level: 3, text: '強', color: 'var(--sage)' }
})

const rules = {
  email: [
    { required: true, message: '請輸入 Email', trigger: 'blur' },
    { type: 'email', message: '請輸入正確的 Email 格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '請輸入密碼', trigger: 'blur' },
    { min: 8, message: '密碼至少需要 8 個字元', trigger: 'blur' }
  ],
}

const registerRules = {
  name: [{ required: true, message: '請輸入您的暱稱', trigger: 'blur' }],
  email: rules.email,
  verifyCode: [{ required: true, message: '請輸入驗證碼', trigger: 'blur' }],
  password: [
    { required: true, message: '請設定密碼', trigger: 'blur' },
    { min: 8, message: '密碼至少需要 8 個字元', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '請再次輸入密碼', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) callback(new Error('兩次輸入的密碼不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

onMounted(() => {
  const savedEmail = localStorage.getItem('rememberedEmail')
  if (savedEmail) {
    form.email = savedEmail
    rememberMe.value = true
  }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (lockoutInterval) clearInterval(lockoutInterval)
})

function switchTab(tab) {
  activeTab.value = tab
  formRef.value?.clearValidate()
}

function sendVerifyCode() {
  if (!form.email) return ElMessage.warning('請先輸入 Email')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return ElMessage.warning('請輸入正確的 Email 格式')

  sendingCode.value = true
  countdown.value = 60

  setTimeout(() => {
    sendingCode.value = false
    ElMessage.success(`驗證碼已發送至 ${form.email}`)
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(countdownTimer)
    }, 1000)
  }, 1000)
}

async function handleSubmit() {
  if (!formRef.value) return
  if (lockoutTimer.value > 0) return

  const currentRules = activeTab.value === 'register' ? registerRules : rules
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      if (activeTab.value === 'register') {
        await authStore.register(form.email, form.password, form.name)
        ElMessage.success('註冊成功！歡迎加入鮮知')
        router.push('/onboarding')
        return
      } else {
        await authStore.login(form.email, form.password)
        loginAttempts.value = 0
        ElMessage.success('歡迎回來！')
      }

      if (rememberMe.value) {
        localStorage.setItem('rememberedEmail', form.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      router.push('/')
    } catch (error) {
      if (activeTab.value === 'login') {
        loginAttempts.value++
        if (loginAttempts.value >= MAX_ATTEMPTS) {
          startLockout()
        } else {
          ElMessage.error(error.message || '登入失敗，請檢查帳號密碼')
        }
      } else {
        ElMessage.error(error.message || '註冊失敗')
      }
    } finally {
      loading.value = false
    }
  })
}

function startLockout() {
  lockoutTimer.value = LOCKOUT_SECONDS
  ElMessage.error(`嘗試次數過多，請等待 ${LOCKOUT_SECONDS} 秒後再試`)
  
  lockoutInterval = setInterval(() => {
    lockoutTimer.value--
    if (lockoutTimer.value <= 0) {
      clearInterval(lockoutInterval)
      loginAttempts.value = 0
    }
  }, 1000)
}

function goToForgotPassword() {
  router.push('/forgot-password')
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="logo-area">
        <div class="logo-icon">
          <el-icon size="28"><Dish /></el-icon>
        </div>
        <h1>鮮知</h1>
        <p>智慧食材管理系統</p>
      </div>

      <div class="tab-switcher">
        <div class="tab-item" :class="{ active: activeTab === 'login' }" @click="switchTab('login')">登入</div>
        <div class="tab-item" :class="{ active: activeTab === 'register' }" @click="switchTab('register')">註冊</div>
      </div>

      <el-form ref="formRef" :model="form" :rules="activeTab === 'login' ? rules : registerRules" size="large" class="login-form">
        
        <template v-if="activeTab === 'register'">
          <el-form-item prop="name">
            <el-input v-model="form.name" placeholder="您的暱稱" :prefix-icon="User" />
          </el-form-item>
        </template>

        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="請輸入 Email" :prefix-icon="Message" />
        </el-form-item>

        <template v-if="activeTab === 'register'">
          <el-form-item prop="verifyCode">
            <div class="verify-code-group">
              <el-input v-model="form.verifyCode" placeholder="請輸入驗證碼" :prefix-icon="Key" class="code-input" />
              <el-button type="primary" plain :disabled="countdown > 0 || sendingCode" @click="sendVerifyCode" class="send-btn">
                {{ sendingCode ? '發送中...' : (countdown > 0 ? `重新發送(${countdown}s)` : '發送驗證碼') }}
              </el-button>
            </div>
          </el-form-item>
        </template>
        
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="請輸入密碼 (至少 8 碼)" 
            :prefix-icon="Lock" 
            show-password 
            @keyup.enter="handleSubmit" 
          />
        </el-form-item>

        <div v-if="activeTab === 'register' && form.password" class="password-strength">
          <div class="strength-bars">
            <div class="bar" :style="{ background: passwordStrength.level >= 1 ? passwordStrength.color : 'var(--border-light)' }"></div>
            <div class="bar" :style="{ background: passwordStrength.level >= 2 ? passwordStrength.color : 'var(--border-light)' }"></div>
            <div class="bar" :style="{ background: passwordStrength.level >= 3 ? passwordStrength.color : 'var(--border-light)' }"></div>
          </div>
          <span class="strength-text" :style="{ color: passwordStrength.color }">強度：{{ passwordStrength.text }}</span>
        </div>

        <template v-if="activeTab === 'register'">
          <el-form-item prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" placeholder="請再次輸入密碼" :prefix-icon="Lock" show-password @keyup.enter="handleSubmit" />
          </el-form-item>
          <div class="password-tip"><el-icon color="var(--warning)"><InfoFilled /></el-icon> 為了您的帳號安全，密碼至少需包含 8 個字元。</div>
        </template>

        <template v-if="activeTab === 'login'">
          <div class="login-options">
            <el-checkbox v-model="rememberMe">記住我的帳號</el-checkbox>
            <el-button link class="forgot-link" @click="goToForgotPassword">忘記密碼？</el-button>
          </div>
        </template>

        <el-form-item style="margin-top: 24px;">
          <el-button 
            type="primary" 
            class="submit-btn" 
            :loading="loading" 
            :disabled="lockoutTimer > 0"
            @click="handleSubmit"
          >
            {{ lockoutTimer > 0 ? `已鎖定 (${lockoutTimer}s)` : (activeTab === 'login' ? '登入系統' : '建立帳號') }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="footer">
        <span>© 2026 鮮知. 減少浪費，從家開始。</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper { 
  min-height: 100vh; 
  min-height: 100dvh;
  display: flex; 
  justify-content: center; 
  align-items: center; 
  background-color: var(--ground); 
  position: relative; 
  padding: var(--space-4);
}

.login-card { 
  width: 100%; 
  max-width: 420px; 
  background: var(--surface); 
  border: 1px solid var(--border); 
  border-radius: var(--radius-lg); 
  padding: 40px; 
  box-shadow: var(--shadow-sm); 
  z-index: 1; 
}

.logo-area { text-align: center; margin-bottom: 28px; }
.logo-icon { 
  width: 52px; 
  height: 52px; 
  background: var(--accent); 
  color: #FFF; 
  border-radius: var(--radius-md); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  margin: 0 auto 14px auto; 
}
.logo-area h1 { 
  margin: 0 0 6px 0; 
  font-family: var(--font-display); 
  font-size: clamp(26px, 6vw, 32px); 
  font-weight: 700; 
  color: var(--ink); 
}
.logo-area p { margin: 0; color: var(--muted); font-size: var(--text-sm); }

.tab-switcher { 
  display: flex; 
  position: relative; 
  background: var(--ground); 
  border-radius: var(--radius-md); 
  padding: 4px; 
  margin-bottom: 24px; 
}
.tab-item { 
  flex: 1; 
  text-align: center; 
  padding: 10px 0; 
  font-size: 15px; 
  font-weight: 500; 
  color: var(--muted); 
  cursor: pointer; 
  z-index: 1; 
  transition: color var(--transition-fast), background-color var(--transition-fast); 
  border-radius: var(--radius-sm);
}
.tab-item.active { 
  color: var(--ink); 
  background: var(--surface); 
  box-shadow: var(--shadow-sm); 
  font-weight: 600;
}

.login-form :deep(.el-input__wrapper) { 
  border-radius: var(--radius-sm); 
  padding: 4px 16px; 
  background-color: var(--ground) !important;
  box-shadow: none !important;
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}
.login-form :deep(.el-input__wrapper.is-focus) { 
  background-color: var(--surface) !important;
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset !important; 
}

.login-form :deep(.el-input__inner) {
  background-color: transparent !important;
  color: var(--ink) !important;
}
.login-form :deep(input:-webkit-autofill),
.login-form :deep(input:-webkit-autofill:hover), 
.login-form :deep(input:-webkit-autofill:focus), 
.login-form :deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px var(--ground) inset !important;
  -webkit-text-fill-color: var(--ink) !important;
  transition: background-color 5000s ease-in-out 0s;
}

.verify-code-group { display: flex; gap: 12px; width: 100%; }
.code-input { flex: 1; }
.send-btn { width: 120px; border-radius: var(--radius-sm); flex-shrink: 0; }

.login-options { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px; flex-wrap: wrap; gap: 8px; }
.password-tip { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); margin-top: -10px; margin-bottom: 16px; padding-left: 8px; }

.forgot-link {
  color: var(--muted) !important;
  font-size: 14px;
  transition: color var(--transition-fast);
}
.forgot-link:hover {
  color: var(--accent) !important;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -8px;
  margin-bottom: 16px;
  padding: 0 4px;
}
.strength-bars {
  display: flex;
  gap: 4px;
  flex: 1;
}
.strength-bars .bar {
  height: 4px;
  flex: 1;
  border-radius: var(--radius-round);
  transition: background-color var(--transition-fast);
}
.strength-text {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.submit-btn { 
  width: 100%; 
  height: 44px; 
  font-size: 16px; 
  font-weight: 600; 
  border-radius: var(--radius-md); 
}

.footer { text-align: center; margin-top: 28px; font-size: 12px; color: var(--muted); }

/* =========================================
   📱 手機端自適應
   ========================================= */
@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
    border-radius: var(--radius-md);
  }
  
  .logo-area { margin-bottom: 24px; }
  .logo-icon { width: 48px; height: 48px; }
  
  /* 驗證碼群組改為上下排列 */
  .verify-code-group {
    flex-direction: column;
    gap: 8px;
  }
  .code-input { width: 100%; }
  .send-btn { width: 100%; }
  
  .login-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .password-strength {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .strength-bars { width: 100%; }
}
</style>