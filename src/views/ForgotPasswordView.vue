<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message, Back, Promotion } from '@element-plus/icons-vue'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const countdown = ref(0)
let countdownTimer = null

const form = reactive({
  email: ''
})

const rules = {
  email: [
    { required: true, message: '請輸入您的 Email', trigger: 'blur' },
    { type: 'email', message: '請輸入正確的 Email 格式', trigger: 'blur' }
  ]
}

async function handleSend() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      setTimeout(() => {
        loading.value = false
        ElMessage.success(`重設密碼信件已發送至 ${form.email}`)
        countdown.value = 60
        countdownTimer = setInterval(() => {
          countdown.value--
          if (countdown.value <= 0) {
            clearInterval(countdownTimer)
          }
        }, 1000)
      }, 1000)
    }
  })
}

function goBack() {
  router.push('/login')
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <div class="forgot-wrapper">
    <div class="forgot-card">
      <div class="logo-area">
        <div class="logo-icon">
          <el-icon size="28"><Promotion /></el-icon>
        </div>
        <h1>忘記密碼</h1>
        <p>請輸入您的註冊信箱，我們將發送重設密碼的連結給您</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large" class="forgot-form">
        <el-form-item prop="email">
          <el-input 
            v-model="form.email" 
            placeholder="請輸入您的 Email" 
            :prefix-icon="Message" 
            @keyup.enter="handleSend"
          />
        </el-form-item>

        <el-form-item style="margin-top: 28px;">
          <el-button 
            type="primary" 
            class="submit-btn" 
            :loading="loading" 
            :disabled="countdown > 0"
            @click="handleSend"
          >
            {{ countdown > 0 ? `請於 ${countdown} 秒後重新發送` : '發送重設密碼連結' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="back-area">
        <el-button link :icon="Back" @click="goBack" class="back-btn">返回登入頁</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forgot-wrapper {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--ground);
  padding: var(--space-4);
}

.forgot-card {
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
  width: 56px; height: 56px;
  background: var(--accent);
  color: white; border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px auto;
}
.logo-area h1 { 
  margin: 0 0 8px 0; 
  font-size: clamp(22px, 5vw, 28px); 
  color: var(--ink); 
  font-family: var(--font-display); 
  font-weight: 700; 
}
.logo-area p { margin: 0; color: var(--muted); font-size: var(--text-sm); line-height: 1.5; }

.forgot-form :deep(.el-input__wrapper) {
  border-radius: var(--radius-sm);
  padding: 4px 16px;
  background-color: var(--ground) !important;
  box-shadow: none !important;
  border: 1px solid transparent;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}
.forgot-form :deep(.el-input__wrapper.is-focus) {
  background-color: var(--surface) !important;
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent) inset !important;
}

.submit-btn {
  width: 100%; height: 46px; 
  font-size: var(--text-base); 
  font-weight: 600;
  border-radius: var(--radius-md);
}

.back-area { text-align: center; margin-top: 24px; }
.back-btn {
  color: var(--muted) !important;
  transition: color var(--transition-fast);
}
.back-btn:hover { color: var(--accent) !important; }

@media (max-width: 480px) {
  .forgot-card {
    padding: 28px 20px;
    border-radius: var(--radius-md);
  }
  .logo-icon { width: 48px; height: 48px; }
}
</style>