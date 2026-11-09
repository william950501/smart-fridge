import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // 從 localStorage 讀取初始狀態
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)

  const isLoggedIn = computed(() => !!token.value)

  // 模擬登入功能 (未來串接 Laravel API)
  function login(email, password, customName = '') {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password.length >= 8) { // 配合藍圖：密碼至少 8 碼
          // 模擬成功登入
          token.value = 'fake-jwt-token-' + Date.now()
          
          // 如果有傳入自訂名稱（例如註冊時的暱稱），就用傳入的；否則預設為「測試使用者」
          const name = customName || email.split('@')[0] || '測試使用者'
          
          user.value = {
            name: name,
            email: email,
            familyName: '我的智慧家庭'
          }
          
          // 存入 localStorage 以保持登入狀態
          localStorage.setItem('token', token.value)
          localStorage.setItem('user', JSON.stringify(user.value))
          resolve()
        } else {
          reject(new Error('帳號或密碼錯誤，或密碼未達 8 碼'))
        }
      }, 500)
    })
  }

  // 登出
  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isLoggedIn, login, logout }
})