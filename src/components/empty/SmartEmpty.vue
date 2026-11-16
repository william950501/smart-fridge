<script setup>
import { computed } from 'vue'
import { 
  Box, Search, Delete, Bowl, ShoppingCart, Calendar, Bell, Warning, User,
  Plus, MagicStick, DocumentAdd, Setting
} from '@element-plus/icons-vue'

const props = defineProps({
  type: { type: String, default: 'default' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  primaryText: { type: String, default: '' },
  secondaryText: { type: String, default: '' },
  size: { type: String, default: 'medium' },
  showPrimary: { type: Boolean, default: true },
  showSecondary: { type: Boolean, default: false }
})

const emit = defineEmits(['primary', 'secondary'])

const presets = {
  inventory: {
    icon: Box, subIcon: Plus,
    title: '目前冰箱是空的',
    desc: '從新增第一樣食材開始，或套用常用食材快速建立。',
    primaryText: '新增第一樣食材',
    secondaryText: '套用常用食材',
    showSecondary: true
  },
  search: {
    icon: Search, subIcon: null,
    title: '找不到符合條件的結果',
    desc: '試著放寬篩選條件，或檢查關鍵字是否正確。',
    primaryText: '清除搜尋條件',
    showSecondary: false
  },
  trash: {
    icon: Delete, subIcon: null,
    title: '回收桶目前是空的',
    desc: '被刪除的項目會保留 30 天，超過期限將自動永久清除。',
    primaryText: '回到食材列表',
    showSecondary: false
  },
  recipe: {
    icon: Bowl, subIcon: null,
    title: '找不到符合的食譜',
    desc: '可能是冰箱食材太少，或是過敏原與忌口設定較嚴格。',
    primaryText: '放寬篩選條件',
    showSecondary: false
  },
  shopping: {
    icon: ShoppingCart, subIcon: null,
    title: '購物清單空空如也',
    desc: '加入第一筆待買物品，或從本週菜單一鍵補齊缺少的食材。',
    primaryText: '加入第一筆物品',
    secondaryText: '從菜單補齊',
    showSecondary: true
  },
  mealplan: {
    icon: Calendar, subIcon: MagicStick,
    title: '這週還沒有安排菜單',
    desc: '讓 AI 根據冰箱現有食材與家庭口味，自動規劃一週料理。',
    primaryText: 'AI 智慧排餐',
    showSecondary: false
  },
  notification: {
    icon: Bell, subIcon: null,
    title: '目前沒有通知',
    desc: '當有食材即將到期，或家庭成員更新庫存時，會在這裡顯示。',
    primaryText: '',
    showSecondary: false
  },
  reminder: {
    icon: Bell, subIcon: Warning,
    title: '目前沒有即將到期的食材',
    desc: '您的冰箱狀況良好，沒有需要緊急處理的項目。',
    primaryText: '查看所有食材',
    showSecondary: false
  },
  family: {
    icon: User, subIcon: Plus,
    title: '您目前尚未加入家庭',
    desc: '建立一個新家庭，或輸入家人給您的邀請碼加入現有家庭。',
    primaryText: '輸入邀請碼',
    secondaryText: '建立新家庭',
    showSecondary: true
  },
  default: {
    icon: DocumentAdd, subIcon: null,
    title: '目前沒有資料',
    desc: '這裡還沒有任何內容。',
    primaryText: '返回',
    showSecondary: false
  }
}

const config = computed(() => {
  const base = presets[props.type] || presets.default

  return {
    icon: base.icon,
    subIcon: base.subIcon,
    title: props.title || base.title,
    desc: props.description || base.desc,
    primaryText: props.primaryText || base.primaryText,
    secondaryText: props.secondaryText || base.secondaryText,
    showSecondary: (props.secondaryText !== '' || props.showSecondary === true) && !!(props.secondaryText || base.secondaryText)
  }
})
</script>

<template>
  <div class="smart-empty" :class="`size-${size}`">
    <!-- 圖示區：主圖示加上副圖示 -->
    <div class="empty-icon-group">
      <div class="main-icon">
        <el-icon><component :is="config.icon" /></el-icon>
      </div>
      <div v-if="config.subIcon" class="sub-icon">
        <el-icon><component :is="config.subIcon" /></el-icon>
      </div>
    </div>

    <!-- 文字區 -->
    <h3 class="empty-title">{{ config.title }}</h3>
    <p class="empty-desc">{{ config.desc }}</p>

    <!-- 按鈕區：手機端主按鈕在下、次按鈕在上 -->
    <div v-if="(showPrimary && config.primaryText) || config.showSecondary" class="empty-actions">
      <el-button 
        v-if="config.showSecondary" 
        plain 
        size="large"
        class="action-btn"
        @click="emit('secondary')"
      >
        {{ config.secondaryText }}
      </el-button>
      <el-button 
        v-if="showPrimary && config.primaryText" 
        type="primary" 
        size="large"
        class="action-btn"
        @click="emit('primary')"
      >
        {{ config.primaryText }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.smart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  /* 使用 clamp 避免手機上佔用過多垂直空間 */
  padding: clamp(24px, 8vw, 48px) var(--space-4);
  width: 100%;
  box-sizing: border-box;
}

/* =========================================
   尺寸變體
   ========================================= */
.size-small { padding: var(--space-4) var(--space-2); }
.size-large { padding: clamp(40px, 12vw, 80px) var(--space-6); }

/* =========================================
   圖示區
   ========================================= */
.empty-icon-group {
  position: relative;
  display: inline-flex;
  margin-bottom: var(--space-4);
}

.main-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  /* 使用微主題色背景，比純灰更有生命力 */
  background: var(--surface);
  border: 1px solid var(--border-light);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast);
}

/* 副圖示：類似徽章點綴 */
.sub-icon {
  position: absolute;
  bottom: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-light);
  border: 2px solid var(--surface); /* 白邊切分圖層 */
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: var(--shadow-sm);
  animation: sub-icon-pop 300ms var(--ease-out) backwards;
  animation-delay: 100ms;
}

@keyframes sub-icon-pop {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* 尺寸調整 */
.size-small .main-icon { width: 48px; height: 48px; font-size: 20px; border-radius: var(--radius-md); }
.size-small .sub-icon { width: 22px; height: 22px; font-size: 12px; bottom: -4px; right: -4px; border-width: 1.5px; }

.size-large .main-icon { width: 80px; height: 80px; font-size: 36px; }
.size-large .sub-icon { width: 32px; height: 32px; font-size: 16px; bottom: -10px; right: -10px; }

/* =========================================
   文字區
   ========================================= */
.empty-title {
  margin: 0 0 var(--space-2) 0;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--ink);
  line-height: 1.3;
  padding-inline: var(--space-2);
}

.empty-desc {
  margin: 0 0 var(--space-6) 0;
  color: var(--muted);
  max-width: 340px;
  line-height: 1.6;
  padding-inline: var(--space-2);
  overflow-wrap: anywhere; /* 防止長英文網址爆版 */
}

/* 尺寸調整 */
.size-small .empty-title { font-size: var(--text-base); }
.size-small .empty-desc { font-size: var(--text-xs); margin-bottom: var(--space-4); }
.size-medium .empty-title { font-size: var(--text-lg); }
.size-medium .empty-desc { font-size: var(--text-sm); }
.size-large .empty-title { font-size: var(--text-xl); }
.size-large .empty-desc { font-size: var(--text-base); }

/* =========================================
   按鈕區
   ========================================= */
.empty-actions {
  display: flex;
  flex-direction: column-reverse; /* 手機端優先顯示主要按鈕（在下方） */
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 280px;
}

.action-btn {
  width: 100%;
  margin: 0 !important; /* 覆寫 Element Plus 的預設 margin */
}

/* 桌面端：水平並排（主按鈕在右側，視覺習慣） */
@media (min-width: 601px) {
  .empty-actions {
    flex-direction: row;
    width: auto;
    max-width: none;
  }
  .action-btn {
    width: auto;
    min-width: 120px;
  }
}
</style>