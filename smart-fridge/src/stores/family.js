import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const useFamilyStore = defineStore('family', () => {
  const familyName = ref('我的智慧家庭')
  
  const currentUser = ref({
    id: 1,
    name: '測試使用者',
    role: 'owner',
    avatar: ''
  })

  const members = ref([
    { id: 1, name: '測試使用者', role: 'owner', joinedAt: '2026-10-01' },
    { id: 2, name: '媽媽', role: 'member', joinedAt: '2026-10-05' },
    { id: 3, name: '爸爸', role: 'member', joinedAt: '2026-10-10' }
  ])

  const inviteCode = ref('')
  const inviteExpiry = ref(null)

  function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    inviteCode.value = code
    
    const now = new Date()
    inviteExpiry.value = now.getTime() + (24 * 60 * 60 * 1000)
    
    return code
  }

  function isInviteValid() {
    if (!inviteCode.value || !inviteExpiry.value) return false
    return Date.now() < inviteExpiry.value
  }

  function removeMember(memberId) {
    if (currentUser.value.role !== 'owner') return false
    if (memberId === currentUser.value.id) return false
    members.value = members.value.filter(m => m.id !== memberId)
    return true
  }

  // 新增：加入家庭 (模擬)
  function joinFamily(code) {
    if (code.length !== 8) {
      ElMessage.error('邀請碼格式錯誤，應為 8 碼')
      return false
    }

    // 模擬驗證成功 (實務上會打 API 驗證 code 是否存在)
    ElMessage.success('驗證成功！已加入家庭')
    
    // 為了 Demo 效果，模擬切換到另一個家庭
    familyName.value = '幸福美食家庭'
    currentUser.value.role = 'member'
    currentUser.value.name = '新加入的成員'
    
    members.value = [
      { id: 99, name: '家庭擁有者', role: 'owner', joinedAt: '2026-09-01' },
      { id: 1, name: '新加入的成員', role: 'member', joinedAt: new Date().toISOString().split('T')[0] }
    ]
    
    return true
  }

  // 新增：退出家庭 (模擬)
  function leaveFamily() {
    familyName.value = '未加入任何家庭'
    currentUser.value.role = 'none'
    members.value = []
    ElMessage.success('已退出家庭')
    return true
  }

  return {
    familyName,
    currentUser,
    members,
    inviteCode,
    inviteExpiry,
    generateInviteCode,
    isInviteValid,
    removeMember,
    joinFamily,
    leaveFamily
  }
})