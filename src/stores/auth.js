import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useFamilyStore } from './family'

export const useAuthStore = defineStore('auth', () => {
  // =========================================
  // 狀態初始化（含 Token 過期檢查）
  // =========================================
  const savedToken = localStorage.getItem('token')
  const savedExpiry = localStorage.getItem('tokenExpiry')
  const now = new Date().getTime()

  // 若 Token 存在但已過期，強制登出並清除資料
  if (savedToken && savedExpiry && now > Number(savedExpiry)) {
    localStorage.removeItem('token')
    localStorage.removeItem('tokenExpiry')
    localStorage.removeItem('user')
  }

  const token = ref(localStorage.getItem('token') || '')
  
  // 解析使用者資料，若沒有 avatar 欄位則給予預設空字串
  const savedUser = JSON.parse(localStorage.getItem('user'))
  const user = ref(savedUser ? { avatar: '', ...savedUser } : null)

  const isLoggedIn = computed(() => !!token.value)

  // =========================================
  // 內部工具：儲存登入狀態與設定過期時間
  // =========================================
  function setAuthSession(newToken, newUser) {
    token.value = newToken
    user.value = newUser

    // 設定 7 天後過期
    const expiryTime = new Date().getTime() + 7 * 24 * 60 * 60 * 1000

    localStorage.setItem('token', newToken)
    localStorage.setItem('tokenExpiry', expiryTime.toString())
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  // =========================================
  // 登入與註冊
  // =========================================
  function login(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password.length >= 8) {
          const mockToken = 'fake-jwt-token-' + Date.now()
          
          const name = email.split('@')[0] || '測試使用者'
          
          const newUser = {
            name: name,
            email: email,
            familyName: '我的智慧家庭',
            avatar: '' // 🌟 預設頭像為空
          }
          
          setAuthSession(mockToken, newUser)
          resolve()
        } else {
          reject(new Error('帳號或密碼錯誤，或密碼未達 8 碼'))
        }
      }, 500)
    })
  }

  function register(email, password, name) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!email || password.length < 8) {
          return reject(new Error('註冊失敗，密碼未達 8 碼'))
        }
        if (!name || !name.trim()) {
          return reject(new Error('請輸入您的暱稱'))
        }

        const mockToken = 'fake-jwt-token-' + Date.now()
        const trimmedName = name.trim()

        const newUser = {
          name: trimmedName,
          email: email,
          familyName: '我的智慧家庭',
          avatar: '' // 🌟 預設頭像為空
        }

        setAuthSession(mockToken, newUser)

        const familyStore = useFamilyStore()
        familyStore.initFamily(trimmedName)

        resolve()
      }, 500)
    })
  }

  // =========================================
  // 🌟 新增：更新頭像
  // =========================================
  function updateAvatar(avatarString) {
    if (!user.value) return
    
    // 更新本地響應式狀態
    user.value.avatar = avatarString
    
    // 同步更新 localStorage
    const currentUser = JSON.parse(localStorage.getItem('user'))
    if (currentUser) {
      currentUser.avatar = avatarString
      localStorage.setItem('user', JSON.stringify(currentUser))
    }
  }

  // =========================================
  // 登出
  // =========================================
  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('tokenExpiry')
    localStorage.removeItem('user')
  }

  return { 
    token, 
    user, 
    isLoggedIn, 
    login, 
    register, 
    updateAvatar, // 🌟 匯出新方法
    logout 
  }
})