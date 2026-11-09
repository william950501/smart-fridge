<script setup>
import { ref, computed } from 'vue'
import { useFamilyStore } from '@/stores/family'
import { ElMessage } from 'element-plus'
import { User, Plus, CopyDocument, Delete, Key, SwitchButton, WarningFilled } from '@element-plus/icons-vue'

const familyStore = useFamilyStore()

const inviteDialogVisible = ref(false)
const currentCode = ref('')
const inputJoinCode = ref('')

// 退出家庭彈窗狀態
const leaveDialogVisible = ref(false)

// 移除成員彈窗狀態
const removeDialogVisible = ref(false)
const currentRemoveMember = ref(null)

const isOwner = computed(() => familyStore.currentUser.role === 'owner')
const isMember = computed(() => familyStore.currentUser.role !== 'none')

function handleGenerateInvite() {
  currentCode.value = familyStore.generateInviteCode()
  inviteDialogVisible.value = true
}

async function copyInviteCode() {
  try {
    await navigator.clipboard.writeText(currentCode.value)
    ElMessage.success('邀請碼已複製到剪貼簿！')
  } catch (err) {
    ElMessage.error('複製失敗，請手動選取複製')
  }
}

function handleJoinFamily() {
  if (!inputJoinCode.value) return ElMessage.warning('請輸入邀請碼')
  const success = familyStore.joinFamily(inputJoinCode.value.toUpperCase())
  if (success) {
    inputJoinCode.value = ''
  }
}

// 打開退出家庭彈窗
function openLeaveDialog() {
  leaveDialogVisible.value = true
}

// 確認退出家庭
function confirmLeaveFamily() {
  familyStore.leaveFamily()
  leaveDialogVisible.value = false
}

// 打開移除成員彈窗
function openRemoveDialog(member) {
  currentRemoveMember.value = member
  removeDialogVisible.value = true
}

// 確認移除成員
function confirmRemoveMember() {
  if (currentRemoveMember.value) {
    const success = familyStore.removeMember(currentRemoveMember.value.id)
    if (success) {
      ElMessage.success('已移除成員')
      removeDialogVisible.value = false
    } else {
      ElMessage.error('權限不足或無法移除擁有者')
    }
  }
}
</script>

<template>
  <div class="family-container">
    <div class="page-header">
      <div>
        <h2>家庭管理</h2>
        <p class="hint">管理您的家庭成員，共同維護冰箱庫存與購物清單</p>
      </div>
      <div class="header-actions">
        <el-button v-if="isOwner" type="primary" @click="handleGenerateInvite" icon="Plus">
          邀請家人加入
        </el-button>
        <el-button v-if="isMember" type="danger" plain @click="openLeaveDialog" icon="SwitchButton">
          退出家庭
        </el-button>
      </div>
    </div>

    <!-- 加入家庭區塊 -->
    <el-card shadow="never" class="join-card">
      <div class="join-content">
        <div class="join-icon">
          <el-icon size="24"><Key /></el-icon>
        </div>
        <div class="join-text">
          <h3>輸入邀請碼加入家庭</h3>
          <p>若您的家人已經建立家庭，請向他們索取 8 碼邀請碼</p>
        </div>
        <div class="join-input-group">
          <el-input 
            v-model="inputJoinCode" 
            placeholder="請輸入 8 碼邀請碼" 
            maxlength="8"
            style="width: 200px;"
            @keyup.enter="handleJoinFamily"
          />
          <el-button type="primary" @click="handleJoinFamily">加入</el-button>
        </div>
      </div>
    </el-card>

    <!-- 家庭總覽卡片 -->
    <el-card v-if="isMember" shadow="never" class="overview-card">
      <div class="overview-content">
        <div class="family-info">
          <el-avatar :size="64" style="background: var(--el-color-primary); font-size: 24px;">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="family-text">
            <h3>{{ familyStore.familyName }}</h3>
            <p>共 {{ familyStore.members.length }} 位成員</p>
          </div>
        </div>
        <div class="role-badge">
          <el-tag type="success" effect="dark" size="large">
            您是{{ isOwner ? '擁有者' : '一般成員' }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 成員列表 -->
    <template v-if="isMember">
      <h3 class="section-title">家庭成員列表</h3>
      <el-row :gutter="20">
        <el-col v-for="member in familyStore.members" :key="member.id" :xs="24" :sm="12" :md="8">
          <el-card shadow="hover" class="member-card">
            <div class="member-info">
              <el-avatar :size="48" style="background: var(--el-color-info);">
                {{ member.name.charAt(0) }}
              </el-avatar>
              <div class="member-text">
                <div class="name-row">
                  <span class="name">{{ member.name }}</span>
                  <el-tag v-if="member.role === 'owner'" type="warning" size="small" effect="plain">擁有者</el-tag>
                  <el-tag v-else type="info" size="small" effect="plain">成員</el-tag>
                </div>
                <div class="joined-date">加入時間：{{ member.joinedAt }}</div>
              </div>
            </div>
            
            <div class="member-actions" v-if="isOwner && member.role !== 'owner'">
              <el-button type="danger" plain size="small" :icon="Delete" @click="openRemoveDialog(member)">
                移除
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- 邀請碼彈窗 -->
    <el-dialog v-model="inviteDialogVisible" title="邀請家人加入" width="400px" align-center class="custom-app-dialog">
      <div class="invite-content">
        <p class="invite-hint">請將以下 8 碼邀請碼傳給您的家人，邀請碼將在 24 小時後失效。</p>
        <div class="code-box">
          <span class="code-text">{{ currentCode }}</span>
          <el-button type="primary" :icon="CopyDocument" circle @click="copyInviteCode" />
        </div>
        <p class="invite-footer">家人登入後，在「家庭管理」輸入此邀請碼即可加入。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="inviteDialogVisible = false">完成</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 退出家庭彈窗 (全新 UI) -->
    <el-dialog v-model="leaveDialogVisible" title="退出家庭" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon size="56" color="var(--el-color-danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
        <p class="dialog-title">確定要退出目前的家庭嗎？</p>
        <p class="dialog-subtitle">退出後，您將無法查看該家庭的食材庫存與購物清單。若您是擁有者，建議先轉移權限。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="leaveDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmLeaveFamily">確定退出</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 移除成員彈窗 (全新 UI) -->
    <el-dialog v-model="removeDialogVisible" title="移除成員" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon size="56" color="var(--el-color-warning)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
        <p class="dialog-title">確定要將「{{ currentRemoveMember?.name }}」移除嗎？</p>
        <p class="dialog-subtitle">移除後，該成員將無法再存取此家庭的食材與採買資訊。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="removeDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmRemoveMember">確定移除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.family-container { width: 100%; max-width: 900px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-header h2 { margin: 0 0 8px 0; color: var(--el-text-color-primary); }
.hint { color: var(--el-text-color-secondary); font-size: 14px; margin: 0; }
.header-actions { display: flex; gap: 12px; }

/* 加入家庭卡片 */
.join-card { border-radius: 16px; background: var(--el-color-primary-light-9); border: 1px solid var(--el-color-primary-light-5); margin-bottom: 24px; }
.join-content { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.join-icon { width: 48px; height: 48px; background: var(--el-color-primary-light-8); color: var(--el-color-primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.join-text { flex: 1; }
.join-text h3 { margin: 0 0 4px 0; color: var(--el-text-color-primary); font-size: 16px; }
.join-text p { margin: 0; color: var(--el-text-color-secondary); font-size: 13px; }
.join-input-group { display: flex; gap: 10px; }

/* 總覽卡片 */
.overview-card { border-radius: 16px; background: linear-gradient(135deg, var(--el-bg-color) 0%, var(--el-color-primary-light-9) 100%); border: 1px solid var(--el-border-color-light); margin-bottom: 30px; }
.overview-content { display: flex; justify-content: space-between; align-items: center; }
.family-info { display: flex; align-items: center; gap: 20px; }
.family-text h3 { margin: 0 0 4px 0; font-size: 22px; color: var(--el-text-color-primary); }
.family-text p { margin: 0; color: var(--el-text-color-secondary); font-size: 14px; }

/* 成員列表 */
.section-title { color: var(--el-text-color-primary); margin-bottom: 16px; font-size: 18px; }
.member-card { border-radius: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-light); margin-bottom: 20px; }
.member-info { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.member-text { flex: 1; }
.name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.name { font-weight: 600; color: var(--el-text-color-primary); font-size: 16px; }
.joined-date { font-size: 12px; color: var(--el-text-color-secondary); }
.member-actions { border-top: 1px solid var(--el-border-color-lighter); padding-top: 12px; text-align: right; }

/* 邀請碼彈窗 */
.invite-content { text-align: center; }
.invite-hint { color: var(--el-text-color-secondary); font-size: 14px; margin-bottom: 20px; }
.code-box { display: flex; justify-content: center; align-items: center; gap: 16px; background: var(--el-fill-color-light); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
.code-text { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: var(--el-color-primary); }
.invite-footer { color: var(--el-text-color-secondary); font-size: 13px; }
.dialog-footer { display: flex; justify-content: center; width: 100%; }

/* 彈窗共用樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: 18px; font-weight: 600; color: var(--el-text-color-primary); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: 14px; color: var(--el-text-color-secondary); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer .el-button { width: 120px; }

@media (max-width: 768px) {
  .join-content { flex-direction: column; align-items: flex-start; }
  .join-input-group { width: 100%; }
  .join-input-group .el-input { flex: 1; }
}
</style>

<style>
.custom-app-dialog {
  --el-dialog-bg-color: var(--el-bg-color-overlay);
  --el-dialog-border-radius: 16px;
  --el-dialog-padding-primary: 24px;
}
.custom-app-dialog .el-dialog__header {
  margin-right: 0; text-align: center; border-bottom: 1px solid var(--el-border-color-light);
  padding-bottom: 16px; margin-bottom: 16px;
}
.custom-app-dialog .el-dialog__title {
  font-size: 18px; font-weight: 600; color: var(--el-text-color-primary);
}
</style>