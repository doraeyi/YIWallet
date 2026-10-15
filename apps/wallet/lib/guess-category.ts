// 從店名／備註猜支出分類，給「整理其他分類」預先帶入建議用。
// 只放把握夠高的關鍵字；便利商店這種什麼都賣的不猜，留給使用者自己選。

const RULES: [RegExp, string][] = [
  [/早餐|早午餐|蛋餅|美而美|麥味登|拉亞/, 'breakfast'],
  [/午餐|便當/, 'lunch'],
  [/晚餐|宵夜/, 'dinner'],
  [/飲料|手搖|咖啡|星巴克|STARBUCKS|路易莎|cama|50嵐|五十嵐|清心|迷客夏|可不可|麻古|CoCo|大苑子|茶湯會|得正|萬波|鮮茶|奶茶|紅茶|綠茶/i, 'drink'],
  [/豆花|甜點|蛋糕|麵包|烘焙|冰品|雪花冰|甜甜圈|Mister Donut|鬆餅|點心/i, 'snack'],
  [/麥當勞|肯德基|摩斯|漢堡王|頂呱呱|拿坡里|必勝客|達美樂|麵|飯|麻辣|火鍋|小吃|滷味|鍋貼|水餃|拉麵|壽司|牛排|燒肉|自助餐|餐廳|食堂|雞排|鹽酥雞/, 'dinner'],
  [/酒|啤酒|居酒屋|Bar\b/i, 'alcohol'],
  [/捷運|台鐵|臺鐵|高鐵|客運|公車|悠遊卡|一卡通|Uber|計程車|台灣大車隊|YouBike|iPASS/i, 'transport'],
  [/中油|台塑石化|加油|停車|洗車|機車行|汽車|輪胎|ETC|遠通/i, 'car'],
  [/全聯|家樂福|好市多|Costco|大潤發|愛買|屈臣氏|康是美|寶雅|POYA|美廉社|小北百貨|大創|DAISO|IKEA|生活百貨/i, 'daily'],
  [/電影|威秀|國賓|秀泰|Steam|PlayStation|Nintendo|KTV|錢櫃|好樂迪|Netflix|Spotify|YouTube/i, 'entertainment'],
  [/UNIQLO|\bGU\b|ZARA|H&M|衣|鞋|服飾/i, 'clothing'],
  [/蝦皮|momo|PChome|博客來|淘寶|Amazon|酷澎|Coupang/i, 'shopping'],
  [/中華電信|台灣大哥大|遠傳|台灣之星|亞太電信|電信/, 'phone'],
  [/台電|台水|自來水|瓦斯|電費|水費/, 'utilities'],
  [/診所|醫院|藥局|藥妝|牙醫|掛號/, 'health'],
  [/房租|租金/, 'rent'],
  [/寵物|動物醫院|毛孩/, 'pet'],
  [/保險|保費|人壽|產險/, 'insurance'],
  [/補習|書店|誠品|金石堂|課程|學費/, 'education'],
  [/美髮|理髮|剪髮|美甲|美容|髮廊/, 'beauty'],
]

export function guessCategory(text: string): string | undefined {
  for (const [re, id] of RULES) if (re.test(text)) return id
  return undefined
}

// 常見連鎖店：名字出現在哪都算同一家（LINE Pay／發票的店名寫法很亂，
// 例如「台灣中油一錢包支付」「中油Pa」「統一超商一新南」，「一」其實是被辨識錯的「-」）
const BRANDS: [RegExp, string][] = [
  [/統一超商|7-?ELEVEN|7-?11/i, '7-ELEVEN'],
  [/全家/, '全家便利商店'],
  [/萊爾富/, '萊爾富'],
  [/OK ?mart|OK超商/i, 'OK 超商'],
  [/中油/, '台灣中油'],
  [/台塑石化/, '台塑石化'],
  [/全聯/, '全聯'],
  [/家樂福/, '家樂福'],
  [/好市多|Costco/i, '好市多'],
  [/星巴克|STARBUCKS/i, '星巴克'],
  [/麥當勞|McDonald/i, '麥當勞'],
  [/路易莎/, '路易莎'],
  [/屈臣氏/, '屈臣氏'],
  [/康是美/, '康是美'],
  [/寶雅|POYA/i, '寶雅'],
  [/蝦皮/, '蝦皮'],
]

// 把同一家店的不同寫法、分店合成一個名字，例如「統一超商-八里」「統一超商－海王」都算「7-ELEVEN」
export function merchantKey(text: string): string {
  const t = text.trim()
  for (const [re, name] of BRANDS) if (re.test(t)) return name
  return t.split(/[-－–·・|｜(（\s]/)[0].trim() || t
}
