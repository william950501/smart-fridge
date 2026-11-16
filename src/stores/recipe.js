import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInventoryStore } from './inventory'
import { useShoppingStore } from './shopping'
import { useSettingsStore } from './settings'
import { useFamilyStore } from './family'
import { ElMessage } from 'element-plus'

// =========================================
// 50 道食譜資料庫（內容不變）
// =========================================
const mockRecipes = [
  { id: 101, name: '番茄炒蛋', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['快速'], ingredients: ['雞蛋', '番茄'], steps: ['將番茄切塊', '將雞蛋打散', '熱鍋炒蛋後盛出', '炒番茄至軟爛', '加入炒蛋拌勻調味即可'], allergens: ['蛋類'], diet: ['素食'], calories: 280, macros: { protein: 18, carbs: 12, fat: 16 }, cookTime: 15 },
  { id: 102, name: '奶油高麗菜', image: '', mainCategory: '蔬食', flavor: ['清淡'], feature: ['快速'], ingredients: ['高麗菜', '奶油', '蒜頭'], steps: ['高麗菜洗淨切塊', '蒜頭爆香', '加入高麗菜拌炒', '加點水燜煮', '起鍋前加入奶油調味'], allergens: ['乳製品'], diet: ['素食'], calories: 150, macros: { protein: 4, carbs: 10, fat: 12 }, cookTime: 10 },
  { id: 103, name: '牛奶燉肉', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: [], ingredients: ['牛奶', '豬絞肉', '洋蔥'], steps: ['洋蔥切丁炒軟', '加入豬絞肉炒至變色', '倒入牛奶煮滾', '轉小火燉煮15分鐘', '加鹽調味即可'], allergens: ['乳製品'], diet: ['葷食'], calories: 420, macros: { protein: 25, carbs: 15, fat: 28 }, cookTime: 30 },
  { id: 104, name: '麻婆豆腐', image: '', mainCategory: '配菜', flavor: ['辣'], feature: ['快速'], ingredients: ['豆腐', '豬絞肉', '辣豆瓣醬'], steps: ['豆腐切塊', '炒香豬絞肉與豆瓣醬', '加水與豆腐煮滾', '勾芡起鍋'], allergens: ['大豆'], diet: ['葷食'], calories: 350, macros: { protein: 22, carbs: 12, fat: 24 }, cookTime: 20 },
  { id: 105, name: '法式吐司', image: '', mainCategory: '早餐', flavor: ['甜'], feature: ['快速'], ingredients: ['雞蛋', '牛奶', '吐司'], steps: ['將雞蛋與牛奶打勻', '吐司沾滿蛋液', '熱鍋加奶油', '將吐司煎至兩面金黃'], allergens: ['蛋類', '乳製品', '麩質'], diet: ['素食'], calories: 380, macros: { protein: 14, carbs: 45, fat: 16 }, cookTime: 10 },
  { id: 106, name: '蒜香雞胸肉', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['低卡', '快速'], ingredients: ['雞胸肉', '蒜頭', '橄欖油'], steps: ['雞胸肉切塊', '蒜頭切末', '熱鍋後爆香蒜頭', '加入雞胸肉煎至兩面金黃'], allergens: [], diet: ['葷食'], calories: 220, macros: { protein: 35, carbs: 2, fat: 8 }, cookTime: 15 },
  { id: 107, name: '清炒青江菜', image: '', mainCategory: '蔬食', flavor: ['清淡'], feature: ['低卡', '快速'], ingredients: ['青江菜', '蒜頭', '鹽'], steps: ['青江菜洗淨切段', '蒜頭爆香', '加入青江菜快炒', '加鹽調味即可'], allergens: [], diet: ['素食'], calories: 60, macros: { protein: 3, carbs: 5, fat: 3 }, cookTime: 5 },
  { id: 108, name: '味噌豆腐湯', image: '', mainCategory: '湯品', flavor: ['清淡'], feature: ['快速'], ingredients: ['豆腐', '味噌', '蔥'], steps: ['水煮滾', '加入豆腐塊', '轉小火加入味噌攪拌', '撒上蔥花即可'], allergens: ['大豆'], diet: ['素食'], calories: 90, macros: { protein: 6, carbs: 8, fat: 4 }, cookTime: 10 },
  { id: 109, name: '馬鈴薯燉肉', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: [], ingredients: ['馬鈴薯', '豬肉塊', '紅蘿蔔'], steps: ['馬鈴薯與紅蘿蔔切塊', '豬肉塊煎至變色', '加入蔬菜與水燉煮', '收汁調味'], allergens: [], diet: ['葷食'], calories: 400, macros: { protein: 20, carbs: 30, fat: 18 }, cookTime: 40 },
  { id: 110, name: '鮭魚炒飯', image: '', mainCategory: '主食', flavor: ['清淡'], feature: [], ingredients: ['鮭魚', '白飯', '雞蛋'], steps: ['鮭魚煎熟剝碎', '炒蛋後加入白飯', '加入鮭魚拌炒', '調味起鍋'], allergens: ['海鮮', '蛋類'], diet: ['葷食'], calories: 450, macros: { protein: 22, carbs: 50, fat: 15 }, cookTime: 15 },
  { id: 111, name: '香蕉燕麥粥', image: '', mainCategory: '早餐', flavor: ['甜'], feature: ['低卡', '快速'], ingredients: ['香蕉', '燕麥', '牛奶'], steps: ['燕麥加水煮軟', '加入牛奶拌勻', '放入切片的香蕉', '煮滾即可'], allergens: ['乳製品', '麩質'], diet: ['素食'], calories: 300, macros: { protein: 10, carbs: 45, fat: 8 }, cookTime: 10 },
  { id: 112, name: '涼拌小黃瓜', image: '', mainCategory: '蔬食', flavor: ['酸'], feature: ['低卡', '快速'], ingredients: ['小黃瓜', '蒜頭', '醋'], steps: ['小黃瓜拍碎切段', '加入蒜末與醋', '攪拌均勻冰鎮'], allergens: [], diet: ['素食'], calories: 40, macros: { protein: 1, carbs: 6, fat: 1 }, cookTime: 5 },
  { id: 113, name: '紅燒牛肉麵', image: '', mainCategory: '主食', flavor: ['清淡'], feature: [], ingredients: ['牛肉', '麵條', '蔥', '薑'], steps: ['牛肉切塊川燙', '爆香蔥薑與牛肉', '加水與醬油燉煮', '煮麵條並淋上湯汁'], allergens: ['麩質', '大豆'], diet: ['葷食'], calories: 550, macros: { protein: 30, carbs: 60, fat: 20 }, cookTime: 60 },
  { id: 114, name: '可樂雞翅', image: '', mainCategory: '配菜', flavor: ['甜'], feature: [], ingredients: ['雞翅', '可樂', '醬油'], steps: ['雞翅劃刀', '煎至兩面金黃', '倒入可樂與醬油', '煮至收汁'], allergens: ['大豆'], diet: ['葷食'], calories: 320, macros: { protein: 18, carbs: 25, fat: 16 }, cookTime: 25 },
  { id: 115, name: '玉米濃湯', image: '', mainCategory: '湯品', flavor: ['甜'], feature: ['快速'], ingredients: ['玉米粒', '牛奶', '麵粉'], steps: ['玉米粒打成泥', '加入牛奶煮滾', '加入麵粉勾芡', '加鹽調味'], allergens: ['乳製品', '麩質'], diet: ['素食'], calories: 200, macros: { protein: 5, carbs: 30, fat: 7 }, cookTime: 15 },
  { id: 116, name: '蒜泥白肉', image: '', mainCategory: '配菜', flavor: ['辣'], feature: [], ingredients: ['五花肉', '蒜頭', '醬油'], steps: ['五花肉燙熟切片', '蒜頭切末', '調製蒜泥醬油', '淋在白肉上'], allergens: ['大豆'], diet: ['葷食'], calories: 420, macros: { protein: 25, carbs: 8, fat: 32 }, cookTime: 30 },
  { id: 117, name: '香菇滑雞', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['低卡'], ingredients: ['雞腿肉', '香菇', '醬油'], steps: ['香菇泡軟切片', '雞腿肉切塊', '爆香香菇與雞肉', '加入醬油與水燜煮'], allergens: ['大豆'], diet: ['葷食'], calories: 280, macros: { protein: 28, carbs: 12, fat: 12 }, cookTime: 25 },
  { id: 118, name: '番茄雞蛋麵', image: '', mainCategory: '主食', flavor: ['清淡'], feature: ['快速'], ingredients: ['番茄', '雞蛋', '麵條'], steps: ['番茄切塊炒軟', '加入蛋液拌炒', '加水煮滾', '放入麵條煮熟'], allergens: ['蛋類', '麩質'], diet: ['素食'], calories: 380, macros: { protein: 16, carbs: 55, fat: 10 }, cookTime: 15 },
  { id: 119, name: '蒜炒菠菜', image: '', mainCategory: '蔬食', flavor: ['清淡'], feature: ['低卡', '快速'], ingredients: ['菠菜', '蒜頭', '鹽'], steps: ['菠菜洗淨切段', '蒜頭爆香', '加入菠菜快炒', '加鹽調味'], allergens: [], diet: ['素食'], calories: 50, macros: { protein: 3, carbs: 4, fat: 3 }, cookTime: 5 },
  { id: 120, name: '南瓜濃湯', image: '', mainCategory: '湯品', flavor: ['甜'], feature: ['低卡'], ingredients: ['南瓜', '牛奶', '洋蔥'], steps: ['南瓜去皮切塊蒸熟', '洋蔥炒軟', '將南瓜與洋蔥打成泥', '加入牛奶煮滾'], allergens: ['乳製品'], diet: ['素食'], calories: 180, macros: { protein: 4, carbs: 28, fat: 6 }, cookTime: 20 },
  { id: 121, name: '燻鮭魚沙拉', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['低卡', '快速'], ingredients: ['燻鮭魚', '生菜', '橄欖油'], steps: ['生菜洗淨撕碎', '擺上燻鮭魚', '淋上橄欖油與檸檬汁'], allergens: ['海鮮'], diet: ['葷食'], calories: 250, macros: { protein: 22, carbs: 10, fat: 14 }, cookTime: 5 },
  { id: 122, name: '蔥爆牛肉', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['快速'], ingredients: ['牛肉片', '蔥', '醬油'], steps: ['牛肉片醃醬油', '蔥切段', '熱鍋快炒牛肉', '加入蔥段拌炒'], allergens: ['大豆'], diet: ['葷食'], calories: 350, macros: { protein: 26, carbs: 10, fat: 22 }, cookTime: 10 },
  { id: 123, name: '馬鈴薯沙拉', image: '', mainCategory: '點心', flavor: ['甜'], feature: ['快速'], ingredients: ['馬鈴薯', '雞蛋', '美乃滋'], steps: ['馬鈴薯與雞蛋煮熟', '馬鈴薯壓泥', '雞蛋切碎', '拌入美乃滋調味'], allergens: ['蛋類'], diet: ['素食'], calories: 220, macros: { protein: 6, carbs: 25, fat: 12 }, cookTime: 20 },
  { id: 124, name: '蝦仁炒蛋', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['快速'], ingredients: ['蝦仁', '雞蛋', '蔥'], steps: ['蝦仁燙熟', '雞蛋打散', '熱鍋炒蛋', '加入蝦仁拌炒'], allergens: ['海鮮', '蛋類'], diet: ['葷食'], calories: 260, macros: { protein: 24, carbs: 4, fat: 16 }, cookTime: 10 },
  { id: 125, name: '紅豆湯', image: '', mainCategory: '點心', flavor: ['甜'], feature: [], ingredients: ['紅豆', '糖', '水'], steps: ['紅豆浸泡', '加水煮滾', '轉小火煮至軟爛', '加糖調味'], allergens: [], diet: ['素食'], calories: 190, macros: { protein: 5, carbs: 40, fat: 1 }, cookTime: 60 },
  { id: 126, name: '義大利肉醬麵', image: '', mainCategory: '主食', flavor: ['清淡'], feature: [], ingredients: ['麵條', '豬絞肉', '番茄', '洋蔥'], steps: ['洋蔥炒軟', '加入豬絞肉炒至變色', '加入番茄煮成醬', '拌入煮熟的麵條'], allergens: ['麩質', '大豆'], diet: ['葷食'], calories: 500, macros: { protein: 20, carbs: 70, fat: 15 }, cookTime: 25 },
  { id: 127, name: '咖哩雞肉飯', image: '', mainCategory: '主食', flavor: ['辣'], feature: [], ingredients: ['雞肉', '馬鈴薯', '咖哩塊', '白飯'], steps: ['雞肉與馬鈴薯切塊', '炒香雞肉', '加水與咖哩塊煮滾', '轉小火燉煮', '淋在白飯上'], allergens: ['麩質'], diet: ['葷食'], calories: 550, macros: { protein: 25, carbs: 65, fat: 20 }, cookTime: 30 },
  { id: 128, name: '滷肉飯', image: '', mainCategory: '主食', flavor: ['清淡'], feature: [], ingredients: ['豬五花', '白飯', '醬油'], steps: ['五花肉切丁', '炒香五花肉', '加入醬油與水滷煮', '淋在白飯上'], allergens: ['大豆'], diet: ['葷食'], calories: 480, macros: { protein: 20, carbs: 55, fat: 22 }, cookTime: 40 },
  { id: 129, name: '水餃', image: '', mainCategory: '主食', flavor: ['清淡'], feature: ['快速'], ingredients: ['水餃', '醬油'], steps: ['水煮滾', '放入水餃', '煮沸後加冷水', '撈起沾醬油'], allergens: ['麩質', '大豆'], diet: ['葷食'], calories: 420, macros: { protein: 18, carbs: 50, fat: 18 }, cookTime: 10 },
  { id: 130, name: '宮保雞丁', image: '', mainCategory: '配菜', flavor: ['辣'], feature: ['快速'], ingredients: ['雞胸肉', '花生', '辣椒'], steps: ['雞胸肉切丁', '爆香辣椒', '快炒雞丁', '加入花生拌炒'], allergens: ['花生', '大豆'], diet: ['葷食'], calories: 380, macros: { protein: 28, carbs: 15, fat: 22 }, cookTime: 15 },
  { id: 131, name: '糖醋排骨', image: '', mainCategory: '配菜', flavor: ['甜', '酸'], feature: [], ingredients: ['豬排骨', '醋', '糖'], steps: ['排骨煎至金黃', '加入醋與糖', '轉小火燜煮', '收汁起鍋'], allergens: ['大豆'], diet: ['葷食'], calories: 450, macros: { protein: 22, carbs: 35, fat: 25 }, cookTime: 30 },
  { id: 132, name: '三杯雞', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: [], ingredients: ['雞腿肉', '九層塔', '醬油'], steps: ['雞肉切塊', '爆香薑蒜', '加入雞肉炒至變色', '加入醬油與酒燉煮', '放入九層塔'], allergens: ['大豆'], diet: ['葷食'], calories: 400, macros: { protein: 25, carbs: 10, fat: 28 }, cookTime: 25 },
  { id: 133, name: '紅燒獅子頭', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: [], ingredients: ['豬絞肉', '白菜', '醬油'], steps: ['絞肉捏成球狀', '炸至金黃', '與白菜一起紅燒', '燉煮入味'], allergens: ['大豆', '麩質'], diet: ['葷食'], calories: 480, macros: { protein: 20, carbs: 25, fat: 32 }, cookTime: 45 },
  { id: 134, name: '清蒸鱈魚', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['低卡'], ingredients: ['鱈魚', '薑', '蔥'], steps: ['鱈魚洗淨', '鋪上薑絲蔥段', '放入電鍋蒸熟', '淋上醬油'], allergens: ['海鮮'], diet: ['葷食'], calories: 180, macros: { protein: 20, carbs: 2, fat: 10 }, cookTime: 15 },
  { id: 135, name: '涼拌木耳', image: '', mainCategory: '蔬食', flavor: ['酸'], feature: ['低卡', '快速'], ingredients: ['木耳', '醋', '蒜頭'], steps: ['木耳泡發川燙', '加入醋與蒜末', '拌勻冰鎮'], allergens: [], diet: ['素食'], calories: 60, macros: { protein: 2, carbs: 8, fat: 2 }, cookTime: 10 },
  { id: 136, name: '皮蛋豆腐', image: '', mainCategory: '蔬食', flavor: ['清淡'], feature: ['快速'], ingredients: ['皮蛋', '豆腐', '醬油'], steps: ['豆腐切塊', '皮蛋切碎', '擺盤淋上醬油膏'], allergens: ['蛋類', '大豆'], diet: ['素食'], calories: 150, macros: { protein: 10, carbs: 5, fat: 10 }, cookTime: 5 },
  { id: 137, name: '烤時蔬', image: '', mainCategory: '蔬食', flavor: ['清淡'], feature: ['低卡'], ingredients: ['櫛瓜', '甜椒', '橄欖油'], steps: ['蔬菜切塊', '拌入橄欖油與鹽', '放入烤箱烤熟'], allergens: [], diet: ['素食'], calories: 120, macros: { protein: 3, carbs: 15, fat: 6 }, cookTime: 25 },
  { id: 138, name: '乾煸四季豆', image: '', mainCategory: '蔬食', flavor: ['辣'], feature: [], ingredients: ['四季豆', '辣椒', '蒜頭'], steps: ['四季豆去頭尾', '熱油煸炒至乾癟', '加入辣椒蒜末拌炒'], allergens: [], diet: ['素食'], calories: 130, macros: { protein: 4, carbs: 12, fat: 8 }, cookTime: 15 },
  { id: 139, name: '羅宋湯', image: '', mainCategory: '湯品', flavor: ['酸'], feature: [], ingredients: ['牛肉', '番茄', '馬鈴薯', '高麗菜'], steps: ['牛肉切塊川燙', '番茄炒軟', '加入蔬菜與水燉煮', '煮至食材軟爛'], allergens: ['大豆'], diet: ['葷食'], calories: 250, macros: { protein: 15, carbs: 20, fat: 12 }, cookTime: 45 },
  { id: 140, name: '紫菜蛋花湯', image: '', mainCategory: '湯品', flavor: ['清淡'], feature: ['低卡', '快速'], ingredients: ['紫菜', '雞蛋', '蔥'], steps: ['水煮滾', '加入紫菜', '淋入蛋液', '撒上蔥花'], allergens: ['蛋類'], diet: ['素食'], calories: 70, macros: { protein: 4, carbs: 5, fat: 3 }, cookTime: 10 },
  { id: 141, name: '剝皮辣椒雞湯', image: '', mainCategory: '湯品', flavor: ['辣'], feature: [], ingredients: ['雞肉', '剝皮辣椒', '薑'], steps: ['雞肉川燙', '加入剝皮辣椒與水', '燉煮至雞肉軟爛'], allergens: [], diet: ['葷食'], calories: 280, macros: { protein: 22, carbs: 10, fat: 16 }, cookTime: 60 },
  { id: 142, name: '蔬菜蛋餅', image: '', mainCategory: '早餐', flavor: ['清淡'], feature: ['快速'], ingredients: ['蛋餅皮', '雞蛋', '蔬菜'], steps: ['蔬菜切碎', '打散雞蛋拌入蔬菜', '熱鍋煎蛋液', '放上蛋餅皮煎熟'], allergens: ['蛋類', '麩質'], diet: ['素食'], calories: 250, macros: { protein: 10, carbs: 20, fat: 12 }, cookTime: 10 },
  { id: 143, name: '地瓜粥', image: '', mainCategory: '早餐', flavor: ['清淡'], feature: ['低卡', '快速'], ingredients: ['地瓜', '白米', '水'], steps: ['地瓜切塊', '白米洗淨', '加水煮成粥'], allergens: [], diet: ['素食'], calories: 180, macros: { protein: 3, carbs: 40, fat: 1 }, cookTime: 15 },
  { id: 144, name: '炸薯條', image: '', mainCategory: '點心', flavor: ['清淡'], feature: [], ingredients: ['馬鈴薯', '油', '鹽'], steps: ['馬鈴薯切條', '泡水去澱粉', '熱油炸至金黃', '撒鹽調味'], allergens: [], diet: ['素食'], calories: 300, macros: { protein: 3, carbs: 35, fat: 15 }, cookTime: 20 },
  { id: 145, name: '焦糖烤布蕾', image: '', mainCategory: '點心', flavor: ['甜'], feature: [], ingredients: ['雞蛋', '牛奶', '糖'], steps: ['牛奶加熱', '蛋液與糖拌勻', '混合後倒入模具', '烤箱烤熟撒糖燒焦'], allergens: ['蛋類', '乳製品'], diet: ['素食'], calories: 280, macros: { protein: 5, carbs: 25, fat: 15 }, cookTime: 30 },
  { id: 146, name: '蒜香烤雞腿', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['低卡'], ingredients: ['雞腿', '蒜頭', '橄欖油'], steps: ['雞腿劃刀', '蒜頭切末', '抹上蒜末與橄欖油', '放入烤箱烤熟'], allergens: [], diet: ['葷食'], calories: 300, macros: { protein: 28, carbs: 5, fat: 18 }, cookTime: 35 },
  { id: 147, name: '青椒炒肉絲', image: '', mainCategory: '配菜', flavor: ['清淡'], feature: ['快速'], ingredients: ['青椒', '豬肉絲', '醬油'], steps: ['青椒切絲', '豬肉絲醃醬油', '熱鍋炒肉絲', '加入青椒拌炒'], allergens: ['大豆'], diet: ['葷食'], calories: 260, macros: { protein: 20, carbs: 8, fat: 16 }, cookTime: 10 },
  { id: 148, name: '香菇雞湯', image: '', mainCategory: '湯品', flavor: ['清淡'], feature: ['低卡'], ingredients: ['雞肉', '香菇', '薑'], steps: ['雞肉川燙', '香菇泡軟', '加水與薑片燉煮', '調味起鍋'], allergens: [], diet: ['葷食'], calories: 220, macros: { protein: 25, carbs: 5, fat: 12 }, cookTime: 60 },
  { id: 149, name: '醋溜高麗菜', image: '', mainCategory: '蔬食', flavor: ['酸'], feature: ['低卡', '快速'], ingredients: ['高麗菜', '醋', '辣椒'], steps: ['高麗菜切塊', '爆香辣椒', '加入高麗菜快炒', '起鍋前淋醋'], allergens: [], diet: ['素食'], calories: 70, macros: { protein: 2, carbs: 8, fat: 3 }, cookTime: 10 },
  { id: 150, name: '花生湯', image: '', mainCategory: '點心', flavor: ['甜'], feature: [], ingredients: ['花生', '糖', '水'], steps: ['花生浸泡', '加水煮滾', '轉小火煮至軟爛', '加糖調味'], allergens: ['花生'], diet: ['素食'], calories: 250, macros: { protein: 8, carbs: 35, fat: 9 }, cookTime: 60 },
]

// Fisher-Yates 洗牌
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const useRecipeStore = defineStore('recipe', () => {
  const recipes = ref(mockRecipes)
  const favorites = ref(JSON.parse(localStorage.getItem('favorites')) || [])
  const deletedFavorites = ref(JSON.parse(localStorage.getItem('deletedFavorites')) || [])

  const mealPlan = ref(JSON.parse(localStorage.getItem('mealPlan')) || {
    Monday: { breakfast: null, lunch: null, dinner: null },
    Tuesday: { breakfast: null, lunch: null, dinner: null },
    Wednesday: { breakfast: null, lunch: null, dinner: null },
    Thursday: { breakfast: null, lunch: null, dinner: null },
    Friday: { breakfast: null, lunch: null, dinner: null },
    Saturday: { breakfast: null, lunch: null, dinner: null },
    Sunday: { breakfast: null, lunch: null, dinner: null },
  })

  function saveFavorites() { localStorage.setItem('favorites', JSON.stringify(favorites.value)) }
  function saveDeletedFavorites() { localStorage.setItem('deletedFavorites', JSON.stringify(deletedFavorites.value)) }
  function saveMealPlan() { localStorage.setItem('mealPlan', JSON.stringify(mealPlan.value)) }

  // 30 天自動清理回收桶
  function cleanupDeletedFavorites() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const beforeLength = deletedFavorites.value.length
    deletedFavorites.value = deletedFavorites.value.filter(f => {
      return new Date(f.deletedAt) > thirtyDaysAgo
    })
    if (deletedFavorites.value.length !== beforeLength) saveDeletedFavorites()
  }
  cleanupDeletedFavorites()

  // =========================================
  // 收藏相關
  // =========================================

  function toggleFavorite(recipeId) {
    const index = favorites.value.indexOf(recipeId)
    if (index > -1) {
      favorites.value.splice(index, 1)
      deletedFavorites.value.push({
        recipeId,
        deletedAt: new Date().toISOString()
      })
      saveDeletedFavorites()
    } else {
      favorites.value.push(recipeId)
    }
    saveFavorites()
  }

  function restoreFavorite(recipeId) {
    const index = deletedFavorites.value.findIndex(f => f.recipeId === recipeId)
    if (index > -1) {
      deletedFavorites.value.splice(index, 1)
      favorites.value.push(recipeId)
      saveFavorites()
      saveDeletedFavorites()
    }
  }

  function permanentlyDeleteFavorite(recipeId) {
    deletedFavorites.value = deletedFavorites.value.filter(f => f.recipeId !== recipeId)
    saveDeletedFavorites()
  }

  function isFavorite(recipeId) { return favorites.value.includes(recipeId) }

  // =========================================
  // 🌟 修改：安全檢查（過敏原 + 素食 + 飲食限制）
  // =========================================
  function checkIsSafe(recipe) {
    const settingsStore = useSettingsStore()
    const userAllergies = settingsStore.allergies || []
    const userDiet = settingsStore.dietaryRestrictions || []

    // 1. 過敏原檢查
    const hasAllergen = recipe.allergens?.some(allergen => userAllergies.includes(allergen))
    if (hasAllergen) return false

    // 2. 素食 / 全素檢查
    const userWantsVegetarian = userDiet.includes('素食') || userDiet.includes('全素')
    if (userWantsVegetarian && recipe.diet?.includes('葷食')) return false

    // 3. 無麩質檢查
    if (userDiet.includes('無麩質') && recipe.allergens?.includes('麩質')) return false

    // 4. 低醣/生酮檢查 (粗略過濾碳水極高者)
    if ((userDiet.includes('低醣') || userDiet.includes('生酮')) && recipe.macros?.carbs > 30) return false

    return true
  }

  // =========================================
  // 篩選標籤
  // =========================================

  const mainCategories = computed(() => ['全部', '主食', '配菜', '蔬食', '湯品', '早餐', '點心'])

  const flavorTags = computed(() => {
    const tags = new Set()
    recipes.value.forEach(r => r.flavor?.forEach(t => tags.add(t)))
    return ['全部口味', ...Array.from(tags)]
  })

  const featureTags = computed(() => {
    const tags = new Set()
    recipes.value.forEach(r => r.feature?.forEach(t => tags.add(t)))
    return ['全部特性', ...Array.from(tags)]
  })

  // =========================================
  // 🌟 推薦演算法（大幅升級）
  // =========================================
  const getRecommendations = () => {
    const inventoryStore = useInventoryStore()
    const familyStore = useFamilyStore()
    
    const availableFoods = inventoryStore.activeFoods.map(f => f.name)
    const urgentFoods = inventoryStore.urgentFoods.map(f => f.name)
    
    // 取得家庭聚合口味（取前兩名作為加權依據）
    const familyTastes = familyStore.aggregatedTastes.slice(0, 2).map(t => t.name)

    const scoredRecipes = recipes.value.map(recipe => {
      let matchCount = 0
      const missingIngredients = []
      const usedUrgentFoods = []

      // 1. 食材匹配分數
      recipe.ingredients.forEach(ing => {
        if (availableFoods.includes(ing)) {
          matchCount++
          if (urgentFoods.includes(ing)) usedUrgentFoods.push(ing)
        } else {
          missingIngredients.push(ing)
        }
      })

      const matchScore = Math.round((matchCount / recipe.ingredients.length) * 100)
      
      // 2. 即期食材加分（消耗快過期食材）
      const urgencyBonus = usedUrgentFoods.length * 20

      // 3. 家庭口味加分
      let tasteBonus = 0
      let isTasteMatch = false
      if (familyTastes.length > 0) {
        const hasMatch = recipe.flavor?.some(f => familyTastes.includes(f))
        if (hasMatch) {
          tasteBonus = 15
          isTasteMatch = true
        }
      }

      // 4. 營養均衡加分（依 PDF：蔬菜多、蛋白質高、低卡優先）
      let nutritionBonus = 0
      const veggieIngredients = recipe.ingredients.filter(ing => {
        // 粗略判斷是否為蔬菜
        const dbItem = inventoryStore.findDuplicateFood(ing) // 借用一下，雖然不一定在庫
        return ing.includes('菜') || ing.includes('瓜') || ing.includes('菇') || ing.includes('番茄') || ing.includes('洋蔥')
      }).length
      
      if (veggieIngredients >= 2) nutritionBonus += 10
      if (recipe.feature?.includes('低卡')) nutritionBonus += 10
      if (recipe.macros?.fat < 15) nutritionBonus += 5

      // 綜合總分
      const totalScore = matchScore + urgencyBonus + tasteBonus + nutritionBonus

      return {
        ...recipe,
        matchScore,
        urgencyBonus,
        tasteBonus,
        nutritionBonus,
        totalScore,
        missingIngredients,
        usedUrgentFoods,
        isSafe: checkIsSafe(recipe),
        isTasteMatch // 供 UI 顯示標籤
      }
    })

    return scoredRecipes
      .filter(r => r.matchScore > 0) // 至少要有一樣食材在冰箱才推薦
      .sort((a, b) => {
        // 安全第一：有過敏原的排最後
        if (a.isSafe !== b.isSafe) return a.isSafe ? -1 : 1
        // 其次比綜合分數
        return b.totalScore - a.totalScore
      })
  }

  // =========================================
  // 一週菜單生成
  // =========================================

  function generateWeeklyPlan() {
    const recommendations = getRecommendations().filter(r => r.isSafe)
    if (recommendations.length === 0) {
      ElMessage.warning('沒有符合您過敏原設定的食譜，無法規劃菜單！')
      return
    }

    const breakfastSource = recommendations.filter(r => r.mainCategory === '早餐')
    const mainSource = recommendations.filter(r => r.mainCategory === '主食' || r.mainCategory === '配菜')

    const breakfastPool = breakfastSource.length > 0 ? breakfastSource : recommendations
    const mainPool = mainSource.length > 0 ? mainSource : recommendations

    const breakfastQueue = shuffle(breakfastPool)
    const mainQueue = shuffle(mainPool)

    function drawFromQueue(queue, pool, excludeId = null) {
      if (queue.length === 0) {
        queue.push(...shuffle(pool))
      }
      let pickIndex = queue.findIndex(r => r.id !== excludeId)
      if (pickIndex === -1) pickIndex = 0
      const picked = queue.splice(pickIndex, 1)[0]
      queue.push(picked)
      return picked
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    days.forEach(day => {
      const breakfast = drawFromQueue(breakfastQueue, breakfastPool)
      const lunch = drawFromQueue(mainQueue, mainPool)
      const dinner = drawFromQueue(mainQueue, mainPool, lunch.id)

      mealPlan.value[day] = { breakfast, lunch, dinner }
    })

    saveMealPlan()
    ElMessage.success('已為您生成專屬的一週菜單（已綜合家庭口味與過敏原）！')
  }

  function addMissingToShoppingList() {
    const shoppingStore = useShoppingStore()
    const inventoryStore = useInventoryStore()

    const neededIngredients = new Set()
    Object.values(mealPlan.value).forEach(day => {
      ;['breakfast', 'lunch', 'dinner'].forEach(meal => {
        if (day[meal] && day[meal].ingredients) {
          day[meal].ingredients.forEach(ing => neededIngredients.add(ing))
        }
      })
    })

    const availableFoods = inventoryStore.activeFoods.map(f => f.name)
    let addedCount = 0

    neededIngredients.forEach(ing => {
      if (!availableFoods.includes(ing)) {
        const exists = shoppingStore.items.find(i => i.name === ing && !i.isPurchased)
        if (!exists) {
          shoppingStore.addItem({ name: ing, quantity: 1, unit: '份' }, true) // 傳入 true 標記為剛加入
          addedCount++
        }
      }
    })

    if (addedCount > 0) ElMessage.success(`已將 ${addedCount} 樣缺少的食材加入購物清單！`)
    else ElMessage.info('太棒了！這週菜單所需的食材冰箱裡都有。')

    return { addedCount }
  }

  function clearMealPlan() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    days.forEach(day => {
      mealPlan.value[day] = { breakfast: null, lunch: null, dinner: null }
    })
    saveMealPlan()
  }

  function setMeal(dayKey, mealKey, recipe) {
    if (!mealPlan.value[dayKey]) return
    mealPlan.value[dayKey][mealKey] = recipe
    saveMealPlan()
  }

  function clearMeal(dayKey, mealKey) {
    if (!mealPlan.value[dayKey]) return
    mealPlan.value[dayKey][mealKey] = null
    saveMealPlan()
  }

  // =========================================
  // 收藏食譜（補上 isSafe 與口味標記）
  // =========================================

  const favoriteRecipes = computed(() => {
    const familyStore = useFamilyStore()
    const familyTastes = familyStore.aggregatedTastes.map(t => t.name)

    return recipes.value
      .filter(r => favorites.value.includes(r.id))
      .map(r => ({
        ...r,
        isSafe: checkIsSafe(r),
        isTasteMatch: r.flavor?.some(f => familyTastes.includes(f)) || false,
        missingIngredients: r.ingredients.filter(
          ing => !useInventoryStore().activeFoods.some(f => f.name === ing)
        )
      }))
  })

  const deletedFavoriteRecipes = computed(() => {
    return deletedFavorites.value
      .map(df => {
        const recipe = recipes.value.find(r => r.id === df.recipeId)
        if (!recipe) return null
        return {
          ...recipe,
          deletedAt: df.deletedAt,
          daysLeft: Math.max(0, 30 - Math.floor((new Date() - new Date(df.deletedAt)) / (1000 * 60 * 60 * 24)))
        }
      })
      .filter(r => r !== null)
  })

  return {
    recipes, favorites, mealPlan, deletedFavorites,
    mainCategories, flavorTags, featureTags,
    toggleFavorite, isFavorite, getRecommendations,
    generateWeeklyPlan, addMissingToShoppingList, clearMealPlan,
    setMeal, clearMeal,
    favoriteRecipes,
    restoreFavorite, permanentlyDeleteFavorite, deletedFavoriteRecipes
  }
})