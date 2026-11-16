<script setup>
import { ref, computed } from 'vue'
import { useFamilyStore } from '@/stores/family'
import { ElMessage } from 'element-plus'
import { User, Plus, CopyDocument, Delete, Key, SwitchButton, WarningFilled, Monitor, List, Check, Close } from '@element-plus/icons-vue'
import TasteAggregator from '@/components/family/TasteAggregator.vue'
import dayjs from 'dayjs'

const familyStore = useFamilyStore()

const inviteDialogVisible = ref(false)
const currentCode = ref('')
const inputJoinCode = ref('')

const leaveDialogVisible = ref(false)
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

function openLeaveDialog() { leaveDialogVisible.value = true }

function confirmLeaveFamily() {
  familyStore.leaveFamily()
  leaveDialogVisible.value = false
}

function openRemoveDialog(member) {
  currentRemoveMember.value = member
  removeDialogVisible.value = true
}

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

// 🌟 加入防呆：時間為空時回傳「剛剛」
function formatLogTime(timeStr) {
  if (!timeStr) return '剛剛'
  const time = dayjs(timeStr)
  if (!time.isValid()) return '剛剛'
  
  const now = dayjs()
  const diffMin = now.diff(time, 'minute')
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  
  const diffHour = now.diff(time, 'hour')
  if (diffHour < 24) return `${diffHour} 小時前`
  
  return time.format('MM/DD HH:mm')
}

// 權限矩陣資料（結構化）
const permissionMatrix = [
  { name: '新增/編輯食材', owner: true, member: true },
  { name: '管理購物清單', owner: true, member: true },
  { name: '產生邀請碼', owner: true, member: false },
  { name: '移除成員', owner: true, member: false }
]
</script>

<template>
  <div class="family-container">
    <div class="page-header">
      <div>
        <h2>家庭管理</h2>
        <p class="hint">管理您的家庭成員，共同維護冰箱庫存與購物清單</p>
      </div>
      <div class="header-actions">
        <el-button v-if="isOwner" type="primary" @click="handleGenerateInvite" :icon="Plus">
          邀請家人加入
        </el-button>
        <el-button v-if="isMember" type="danger" plain @click="openLeaveDialog" :icon="SwitchButton">
          退出家庭
        </el-button>
      </div>
    </div>

    <!-- 未加入家庭：輸入邀請碼區塊 -->
    <el-card v-if="!isMember" shadow="never" class="join-card" data-tour="family-join">
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
            class="join-input"
            @keyup.enter="handleJoinFamily"
          />
          <el-button type="primary" @click="handleJoinFamily" class="join-btn">加入</el-button>
        </div>
      </div>
    </el-card>

    <!-- 已加入家庭：雙欄佈局 -->
    <el-row v-else :gutter="24">
      
      <!-- 左欄：總覽與成員列表 -->
      <el-col :xs="24" :md="14">
        <!-- 家庭總覽 -->
        <el-card shadow="never" class="overview-card">
          <div class="overview-content">
            <div class="family-info">
              <el-avatar :size="56" class="family-avatar">
                <el-icon size="24"><User /></el-icon>
              </el-avatar>
              <div class="family-text">
                <h3>{{ familyStore.familyName }}</h3>
                <p>共 {{ familyStore.members.length }} 位成員</p>
              </div>
            </div>
            <div class="role-badge">
              <el-tag :type="isOwner ? 'warning' : 'info'" effect="dark" size="large" round>
                {{ isOwner ? '擁有者' : '一般成員' }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <!-- 成員列表 -->
        <h3 class="section-title">家庭成員</h3>
        <div class="member-list">
          <div v-for="member in familyStore.members" :key="member.id" class="member-card">
            <div class="member-info">
              <el-avatar :size="44" class="member-avatar">
                {{ member.name.charAt(0) }}
              </el-avatar>
              <div class="member-text">
                <div class="name-row">
                  <span class="name">{{ member.name }}</span>
                  <el-tag v-if="member.role === 'owner'" type="warning" size="small" effect="plain" round>擁有者</el-tag>
                  <el-tag v-else type="info" size="small" effect="plain" round>成員</el-tag>
                </div>
                <div class="joined-date">加入時間：{{ member.joinedAt || '未知' }}</div>
              </div>
            </div>
            
            <div class="member-actions" v-if="isOwner && member.role !== 'owner'">
              <el-button type="danger" plain size="small" :icon="Delete" @click="openRemoveDialog(member)">
                移除
              </el-button>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 右欄：口味聚合、動態日誌、權限矩陣 -->
      <el-col :xs="24" :md="10">
        <!-- 家庭口味聚合 -->
        <TasteAggregator class="mb-4" />

        <!-- 家庭動態日誌 -->
        <el-card shadow="never" class="log-card">
          <template #header>
            <div class="card-header">
              <span class="card-title"><el-icon><Monitor /></el-icon> 家庭動態</span>
            </div>
          </template>
          <div v-if="familyStore.dynamicLog.length === 0" class="empty-log">
            目前沒有動態
          </div>
          <div v-else class="log-list">
            <div v-for="log in familyStore.dynamicLog.slice(0, 10)" :key="log.id" class="log-item">
              <div class="log-dot"></div>
              <div class="log-content">
                <p class="log-text">
                  <span class="log-user">{{ log.memberName }}</span> 
                  {{ log.action }}了
                  <span class="log-target">「{{ log.target }}」</span>
                </p>
                <span class="log-time">{{ formatLogTime(log.createdAt) }}</span>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 🌟 權限矩陣：重構為表格化 -->
        <el-card shadow="never" class="matrix-card">
          <template #header>
            <div class="card-header">
              <span class="card-title"><el-icon><List /></el-icon> 權限說明</span>
            </div>
          </template>
          <div class="matrix-list">
            <div class="matrix-row matrix-header">
              <span class="permission-col">權限</span>
              <span class="role-col">擁有者</span>
              <span class="role-col">成員</span>
            </div>
            <div v-for="(perm, idx) in permissionMatrix" :key="idx" class="matrix-row">
              <span class="permission-col">{{ perm.name }}</span>
              <span class="role-col">
                <el-icon v-if="perm.owner" color="var(--sage)" size="16"><Check /></el-icon>
                <el-icon v-else color="var(--muted)" size="16"><Close /></el-icon>
              </span>
              <span class="role-col">
                <el-icon v-if="perm.member" color="var(--sage)" size="16"><Check /></el-icon>
                <el-icon v-else color="var(--muted)" size="16"><Close /></el-icon>
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 邀請碼彈窗 -->
    <el-dialog v-model="inviteDialogVisible" title="邀請家人加入" width="420px" align-center class="custom-app-dialog">
      <div class="invite-content">
        <p class="invite-hint">請將以下 8 碼邀請碼傳給您的家人，<strong>邀請碼將在 24 小時後失效</strong>。</p>
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

    <!-- 退出家庭彈窗 -->
    <el-dialog v-model="leaveDialogVisible" title="退出家庭" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon size="56" color="var(--danger)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
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

    <!-- 移除成員彈窗 -->
    <el-dialog v-model="removeDialogVisible" title="移除成員" width="400px" align-center class="custom-app-dialog">
      <div class="dialog-content-center">
        <el-icon size="56" color="var(--warning)" style="margin-bottom: 16px;"><WarningFilled /></el-icon>
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
.family-container { width: 100%; max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-4); }
.page-header h2 { margin: 0 0 8px 0; font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }
.header-actions { display: flex; gap: var(--space-3); }

/* 加入家庭卡片 */
.join-card { border-radius: var(--radius-lg); background: var(--accent-light); border: 1px dashed var(--accent); margin-bottom: var(--space-5); }
.join-content { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.join-icon { width: 48px; height: 48px; background: var(--surface); color: var(--accent); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.join-text { flex: 1; min-width: 200px; }
.join-text h3 { margin: 0 0 4px 0; color: var(--ink); font-size: var(--text-base); }
.join-text p { margin: 0; color: var(--muted); font-size: var(--text-sm); }
.join-input-group { display: flex; gap: 10px; align-items: center; }
.join-input { width: 200px; }
.join-btn { flex-shrink: 0; }

/* 總覽卡片 */
.overview-card { border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); margin-bottom: var(--space-5); }
.overview-content { display: flex; justify-content: space-between; align-items: center; }
.family-avatar { background: var(--accent); color: #FFF; font-weight: bold; }
.family-info { display: flex; align-items: center; gap: var(--space-4); }
.family-text h3 { margin: 0 0 4px 0; font-size: var(--text-lg); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.family-text p { margin: 0; color: var(--muted); font-size: var(--text-sm); }

/* 成員列表 */
.section-title { color: var(--ink); margin: 0 0 var(--space-4) 0; font-size: var(--text-lg); font-family: var(--font-display); }
.member-list { display: flex; flex-direction: column; gap: var(--space-3); }
.member-card { 
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-4); 
  background: var(--surface); 
  border: 1px solid var(--border-light); 
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.member-card:hover { border-color: var(--border); box-shadow: var(--shadow-sm); }
.member-info { display: flex; align-items: center; gap: var(--space-4); min-width: 0; }
.member-avatar { background: var(--ground); color: var(--ink); flex-shrink: 0; }
.member-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.name { font-weight: 600; color: var(--ink); font-size: var(--text-base); }
.joined-date { font-size: var(--text-xs); color: var(--muted); }

/* 家庭動態日誌 */
.mb-4 { margin-bottom: var(--space-4); }
.log-card { border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); margin-bottom: var(--space-4); }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-size: var(--text-base); font-weight: 700; color: var(--ink); font-family: var(--font-display); display: flex; align-items: center; gap: 6px; }
.empty-log { text-align: center; padding: var(--space-4) 0; color: var(--muted); font-size: var(--text-sm); }
.log-list { display: flex; flex-direction: column; position: relative; padding-left: 12px; }
.log-list::before { content: ''; position: absolute; left: 3px; top: 6px; bottom: 6px; width: 2px; background: var(--border-light); z-index: 1; }
.log-item { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); position: relative; z-index: 2; }
.log-item:last-child { margin-bottom: 0; }
.log-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-top: 6px; flex-shrink: 0; border: 2px solid var(--surface); }
.log-content { display: flex; flex-direction: column; gap: 2px; }
.log-text { margin: 0; font-size: var(--text-sm); color: var(--ink); }
.log-user { font-weight: 600; color: var(--accent); }
.log-target { font-weight: 500; }
.log-time { font-size: var(--text-xs); color: var(--muted); }

/* 🌟 權限矩陣：表格化 */
.matrix-card { border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); }
.matrix-list { display: flex; flex-direction: column; }
.matrix-row { 
  display: grid; 
  grid-template-columns: 1fr 60px 60px; 
  align-items: center; 
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-light);
}
.matrix-row:last-child { border-bottom: none; }
.matrix-header { 
  font-size: var(--text-xs); 
  font-weight: 600; 
  color: var(--muted); 
  border-bottom: 1px solid var(--border); 
  padding-bottom: 8px;
}
.permission-col { font-size: var(--text-sm); color: var(--ink); }
.role-col { text-align: center; display: flex; align-items: center; justify-content: center; }

/* 邀請碼彈窗 */
.invite-content { text-align: center; }
.invite-hint { color: var(--muted); font-size: var(--text-sm); margin-bottom: 20px; line-height: 1.5; }
.invite-hint strong { color: var(--danger); }
.code-box { 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  gap: 12px; 
  background: var(--ground); 
  padding: 20px 16px; 
  border-radius: var(--radius-md); 
  border: 1px dashed var(--border); 
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.code-text { 
  font-size: clamp(20px, 6vw, 28px); 
  font-weight: bold; 
  letter-spacing: 3px; 
  color: var(--accent); 
  font-family: var(--font-display);
  word-break: break-all;
}
.invite-footer { color: var(--muted); font-size: var(--text-xs); }

/* 通用彈窗樣式 */
.dialog-content-center { text-align: center; padding: 10px 0; }
.dialog-title { font-size: var(--text-lg); font-weight: 600; color: var(--ink); margin: 0 0 8px 0; }
.dialog-subtitle { font-size: var(--text-sm); color: var(--muted); margin: 0 0 20px 0; line-height: 1.5; }
.dialog-footer { display: flex; justify-content: center; width: 100%; }
.dialog-footer .el-button { width: 120px; }

/* =========================================
   📱 手機端自適應
   ========================================= */
@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; }
  .header-actions .el-button { flex: 1; margin: 0 !important; }
  
  /* 1. 加入家庭區塊：輸入框全寬 */
  .join-content { flex-direction: column; align-items: stretch; gap: 16px; }
  .join-icon { display: none; } /* 手機端隱藏裝飾圖示 */
  .join-text { text-align: left; }
  .join-input-group { width: 100%; }
  .join-input { width: 100%; flex: 1; }
  
  /* 2. 總覽卡片 */
  .overview-content { flex-direction: column; align-items: flex-start; gap: 12px; }
  .role-badge { width: 100%; }
  
  /* 3. 成員卡片：按鈕靠右 */
  .member-card { flex-direction: row; align-items: center; padding: 12px; }
  .member-info { flex: 1; min-width: 0; }
  .member-text .name { font-size: var(--text-sm); }
  .member-text .joined-date { font-size: 11px; }
  .member-actions { flex-shrink: 0; }
  .member-actions .el-button { padding: 6px 10px; font-size: 12px; }

  /* 4. 權限矩陣手機端調整 */
  .matrix-row { grid-template-columns: 1fr 50px 50px; padding: 8px 0; }
  .permission-col { font-size: var(--text-xs); }
  .matrix-header .permission-col { font-size: 11px; }
}
</style>

<style>
.custom-app-dialog {
  --el-dialog-bg-color: var(--surface);
  --el-dialog-border-radius: var(--radius-lg);
  --el-dialog-padding-primary: 24px;
}
.custom-app-dialog .el-dialog__header {
  margin-right: 0; text-align: center; border-bottom: 1px solid var(--border-light);
  padding-bottom: 16px; margin-bottom: 16px;
}
.custom-app-dialog .el-dialog__title {
  font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--ink);
}
@media (max-width: 601px) {
  .custom-app-dialog { width: 92vw !important; max-width: 92vw; margin: 4vh auto !important; }
}
</style>