import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // 從 localStorage 讀取初始狀態
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)

  const isLoggedIn = computed(() => !!token.value)

  // 模擬登入功能 (未來串接 Laravel API)
  function login(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password.length >= 6) {
          // 模擬成功登入
          token.value = 'fake-jwt-token-' + Date.now()
          user.value = {
            name: '測試使用者',
            email: email,
            familyName: '我的家'
          }
          // 存入 localStorage 以保持登入狀態
          localStorage.setItem('token', token.value)
          localStorage.setItem('user', JSON.stringify(user.value))
          resolve()
        } else {
          reject(new Error('帳號或密碼錯誤'))
        }
      }, 500)
    })
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isLoggedIn, login, logout }
})