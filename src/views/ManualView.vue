<script setup>
import { ref } from 'vue'
import { Refrigerator, Bowl, ShoppingCart, Setting, Document, Timer, TrendCharts, House, Warning, Lock, Plus } from '@element-plus/icons-vue'

const activeNames = ref(['1']) // 預設展開第一項
</script>

<template>
  <div class="manual-container">
    <div class="page-header">
      <h2>使用說明書</h2>
      <p class="hint">快速了解「鮮知」的各項功能與操作技巧。</p>
    </div>

    <!-- 精簡版說明卡片 -->
    <div class="manual-grid">
      <!-- 1. 核心功能：冰箱與食材 -->
      <el-card shadow="never" class="manual-card">
        <div class="card-header">
          <div class="icon-box bg-primary"><el-icon><Refrigerator /></el-icon></div>
          <h3>冰箱與食材管理</h3>
        </div>
        <ul class="feature-list">
          <li><strong>視覺化冰箱：</strong>點擊首頁「冰箱視圖」，可查看食材分佈。</li>
          <li><strong>拖曳移動：</strong>電腦端按住食材拖曳；手機端<strong>長按 0.5 秒</strong>進入拖曳模式。</li>
          <li><strong>跨溫區提醒：</strong>從冷藏移到冷凍時，系統會自動詢問是否延長期限。</li>
          <li><strong>新增食材：</strong>點擊「+ 新增」可手動輸入或使用 AI 拍照辨識。</li>
        </ul>
      </el-card>

      <!-- 2. 智慧應用：食譜與菜單 -->
      <el-card shadow="never" class="manual-card">
        <div class="card-header">
          <div class="icon-box bg-success"><el-icon><Bowl /></el-icon></div>
          <h3>AI 食譜與一週菜單</h3>
        </div>
        <ul class="feature-list">
          <li><strong>智慧推薦：</strong>系統會根據冰箱食材與家庭口味推薦食譜。</li>
          <li><strong>一鍵扣庫存：</strong>在食譜詳情點擊「一鍵扣庫存」，系統會自動扣除食材。</li>
          <li><strong>AI 排餐：</strong>點擊「AI 排餐」自動生成一週菜單，並搭配「一主食 + 一配菜」。</li>
          <li><strong>日期切換：</strong>點擊上方星期列，可查看不同天的菜單。</li>
        </ul>
      </el-card>

      <!-- 3. 採買與分析 -->
      <el-card shadow="never" class="manual-card">
        <div class="card-header">
          <div class="icon-box bg-warning"><el-icon><ShoppingCart /></el-icon></div>
          <h3>採買與數據分析</h3>
        </div>
        <ul class="feature-list">
          <li><strong>購物清單：</strong>可記錄單價，系統會自動對比上次購買價格。</li>
          <li><strong>登記至庫存：</strong>買完東西後勾選，點擊「登記至庫存」直接存入冰箱。</li>
          <li><strong>到期提醒：</strong>在「提醒」頁面可一鍵清理過期食材或排入菜單。</li>
          <li><strong>價值分析：</strong>在「分析」頁面可查看浪費排行與時間價值散佈圖。</li>
        </ul>
      </el-card>

      <!-- 4. 設定與家庭 -->
      <el-card shadow="never" class="manual-card">
        <div class="card-header">
          <div class="icon-box bg-info"><el-icon><House /></el-icon></div>
          <h3>家庭與個人設定</h3>
        </div>
        <ul class="feature-list">
          <li><strong>家庭共享：</strong>在「家庭管理」產生邀請碼，讓家人加入共同管理。</li>
          <li><strong>飲食偏好：</strong>設定過敏原與忌口，AI 推薦時會自動避開。</li>
          <li><strong>主題切換：</strong>在「系統設定」可切換 6 種主題或自訂顏色。</li>
          <li><strong>長輩模式：</strong>在設定中開啟，全站字體與按鈕會放大。</li>
        </ul>
      </el-card>
    </div>

    <!-- 快捷鍵與小技巧 -->
    <el-card shadow="never" class="tips-card">
      <template #header>
        <div class="tips-header"><el-icon><Document /></el-icon> 實用小技巧</div>
      </template>
      <div class="tips-content">
        <p><strong>鍵盤快捷鍵 (電腦端)：</strong>按 <code>/</code> 快速搜尋食材，按 <code>N</code> 快速新增食材。</p>
        <p><strong>回收桶：</strong>誤刪的食材或食譜會保留 30 天，可在回收桶還原。</p>
        <p><strong>拍照辨識：</strong>在新增食材時使用 AI 拍照，系統會自動帶入品名與建議期限。</p>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.manual-container { width: 100%; max-width: 1000px; margin: 0 auto; }
.page-header { margin-bottom: var(--space-5); }
.page-header h2 { margin: 0 0 8px 0; font-size: var(--text-xl); font-family: var(--font-display); font-weight: 700; color: var(--ink); }
.hint { color: var(--muted); font-size: var(--text-sm); margin: 0; }

.manual-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-5); }

.manual-card { border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border-light); }
.card-header { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
.icon-box { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.bg-primary { background: var(--accent-light); color: var(--accent); }
.bg-success { background: var(--el-color-success-light-9); color: var(--sage); }
.bg-warning { background: var(--el-color-warning-light-9); color: var(--warning); }
.bg-info { background: var(--border-light); color: var(--muted); }

.card-header h3 { margin: 0; font-size: var(--text-base); font-weight: 600; color: var(--ink); }

.feature-list { margin: 0; padding-left: 20px; color: var(--muted); font-size: var(--text-sm); line-height: 1.6; }
.feature-list li { margin-bottom: 8px; }
.feature-list li strong { color: var(--ink); }

.tips-card { border-radius: var(--radius-lg); background: var(--accent-light); border: 1px dashed var(--accent); }
.tips-header { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--accent); font-family: var(--font-display); }
.tips-content p { margin: 0 0 8px 0; font-size: var(--text-sm); color: var(--ink); line-height: 1.5; }
.tips-content p:last-child { margin-bottom: 0; }
.tips-content code { background: var(--surface); padding: 2px 6px; border-radius: var(--radius-sm); font-family: monospace; border: 1px solid var(--border-light); }

@media (max-width: 768px) {
  .manual-grid { grid-template-columns: 1fr; }
}
</style>