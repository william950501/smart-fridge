import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from './settings' // 延遲載入，避免循環依賴

export const useFamilyStore = defineStore('family', () => {
  // =========================================
  // 狀態初始化（含 localStorage 持久化）
  // =========================================
  const familyName = ref(localStorage.getItem('familyName') || '我的智慧家庭')
  
  const currentUser = ref(JSON.parse(localStorage.getItem('currentUser')) || {
    id: 1,
    name: '測試使用者',
    role: 'owner',
    avatar: ''
  })

  // 預設成員加入 tastes 欄位，供口味聚合使用
  const members = ref(JSON.parse(localStorage.getItem('familyMembers')) || [
    { id: 1, name: '測試使用者', role: 'owner', joinedAt: '2026-10-01', lastActiveAt: new Date().toISOString(), tastes: ['清淡'] },
    { id: 2, name: '媽媽', role: 'member', joinedAt: '2026-10-05', lastActiveAt: new Date().toISOString(), tastes: ['清淡', '偏甜'] },
    { id: 3, name: '爸爸', role: 'member', joinedAt: '2026-10-10', lastActiveAt: new Date().toISOString(), tastes: ['重口味', '辛辣'] }
  ])

  const inviteCode = ref(localStorage.getItem('familyInviteCode') || '')
  const inviteExpiry = ref(Number(localStorage.getItem('familyInviteExpiry')) || null)

  // 新增：家庭動態日誌
  const dynamicLog = ref(JSON.parse(localStorage.getItem('familyDynamicLog')) || [])

  // =========================================
  // 內部工具：儲存與同步
  // =========================================
  function saveState() {
    localStorage.setItem('familyName', familyName.value)
    localStorage.setItem('currentUser', JSON.stringify(currentUser.value))
    localStorage.setItem('familyMembers', JSON.stringify(members.value))
    localStorage.setItem('familyInviteCode', inviteCode.value)
    localStorage.setItem('familyInviteExpiry', inviteExpiry.value ? inviteExpiry.value.toString() : '')
    localStorage.setItem('familyDynamicLog', JSON.stringify(dynamicLog.value))
  }

  // =========================================
  // Computed
  // =========================================
  const isOwner = computed(() => currentUser.value.role === 'owner')
  
  // 家庭口味聚合：綜合所有成員的喜好
  const aggregatedTastes = computed(() => {
    const tasteCount = {}
    
    // 1. 獲取當前使用者的最新設定
    const settingsStore = useSettingsStore()
    if (settingsStore.tastePreferences) {
      settingsStore.tastePreferences.forEach(t => {
        tasteCount[t] = (tasteCount[t] || 0) + 1
      })
    }

    // 2. 統計其他成員的喜好
    members.value.forEach(m => {
      if (m.name !== currentUser.value.name && m.tastes) {
        m.tastes.forEach(t => {
          tasteCount[t] = (tasteCount[t] || 0) + 1
        })
      }
    })

    // 3. 排序並回傳陣列
    return Object.entries(tasteCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  })

  // =========================================
  // Actions
  // =========================================

  // 初始化家庭（供註冊時呼叫）
  function initFamily(ownerName) {
    familyName.value = `${ownerName} 的家庭`
    currentUser.value = {
      id: 1,
      name: ownerName,
      role: 'owner',
      avatar: ''
    }
    members.value = [
      { 
        id: 1, 
        name: ownerName, 
        role: 'owner', 
        joinedAt: new Date().toISOString().split('T')[0],
        lastActiveAt: new Date().toISOString(),
        tastes: []
      }
    ]
    inviteCode.value = ''
    inviteExpiry.value = null
    dynamicLog.value = []
    saveState()
  }

  // 產生邀請碼
  function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789' // 去除 O, 0
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    inviteCode.value = code
    inviteExpiry.value = Date.now() + (24 * 60 * 60 * 1000) // 24小時
    saveState()
    return code
  }

  // 檢查邀請碼是否有效
  function isInviteValid(code = inviteCode.value) {
    if (!code || code !== inviteCode.value || !inviteExpiry.value) return false
    return Date.now() < inviteExpiry.value
  }

  // 加入家庭
  function joinFamily(code) {
    if (code.length !== 8) {
      ElMessage.error('邀請碼格式錯誤，應為 8 碼')
      return false
    }

    // 🌟 新增：真正驗證邀請碼是否過期
    if (!isInviteValid(code)) {
      ElMessage.error('邀請碼無效或已過期，請向家人重新索取')
      return false
    }

    // 模擬切換到另一個家庭
    familyName.value = '幸福美食家庭'
    currentUser.value.role = 'member'
    
    // 模擬加入後的成員列表
    members.value = [
      { id: 99, name: '家庭擁有者', role: 'owner', joinedAt: '2026-09-01', lastActiveAt: new Date().toISOString(), tastes: ['重口味'] },
      { 
        id: currentUser.value.id, 
        name: currentUser.value.name, 
        role: 'member', 
        joinedAt: new Date().toISOString().split('T')[0],
        lastActiveAt: new Date().toISOString(),
        tastes: []
      }
    ]
    
    saveState()
    ElMessage.success('驗證成功！已加入家庭')
    return true
  }

  // 退出家庭
  function leaveFamily() {
    familyName.value = '未加入任何家庭'
    currentUser.value.role = 'none'
    members.value = []
    inviteCode.value = ''
    inviteExpiry.value = null
    saveState()
    ElMessage.success('已退出家庭')
    return true
  }

  // 移除成員
  function removeMember(memberId) {
    if (currentUser.value.role !== 'owner') {
      ElMessage.error('權限不足：只有擁有者可以移除成員')
      return false
    }
    if (memberId === currentUser.value.id) {
      ElMessage.error('擁有者無法移除自己，請先轉移權限')
      return false
    }
    members.value = members.value.filter(m => m.id !== memberId)
    saveState()
    return true
  }

  // =========================================
  // 新增：家庭動態日誌
  // =========================================
  function addLog(memberName, action, target) {
    dynamicLog.value.unshift({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      memberName,
      action, // '新增' | '吃完' | '丟棄' | '更新'
      target,
      createdAt: new Date().toISOString()
    })
    // 限制只保留最近 50 筆
    if (dynamicLog.value.length > 50) {
      dynamicLog.value = dynamicLog.value.slice(0, 50)
    }
    saveState()
  }

  // 更新成員最後上線時間
  function updateMemberActive(memberName) {
    const member = members.value.find(m => m.name === memberName)
    if (member) {
      member.lastActiveAt = new Date().toISOString()
      saveState()
    }
  }

  return {
    familyName,
    currentUser,
    members,
    inviteCode,
    inviteExpiry,
    dynamicLog,
    isOwner,
    aggregatedTastes,
    initFamily,
    generateInviteCode,
    isInviteValid,
    joinFamily,
    leaveFamily,
    removeMember,
    addLog,
    updateMemberActive
  }
})