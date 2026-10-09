// 發新版的流程：在 VERSION_HISTORY 最上面加一筆（版本號＋這版改了什麼），push 就好。
// APP_VERSION 自動取第一筆，不用另外改；使用者會看到「新版本 vX 可用」並按更新。
export const VERSION_HISTORY: { version: string; changes: string[] }[] = [
  {
    version: 'v1.8',
    changes: [
      '首頁「全部」新增信用卡區塊：同一家銀行的卡合併加總，列出每張卡各花多少',
      '顯示待繳金額、繳費截止日和可用額度',
      '結帳日隔天通知「本期帳單出爐」，繳費日前提醒會附上要繳的金額',
      '卡片管理依銀行分組，同一家銀行的卡排在一起',
      '修正帳單期間：結帳日當天刷的算下一期，跟銀行帳單一致',
    ],
  },
  {
    version: 'v1.7',
    changes: [
      '全新開場動畫與全站動畫，主題色統一',
      'Apple Pay 自動記帳，卡片自動對應',
      '信用卡可設定結帳日、繳費日，首頁顯示本期消費',
      '編輯紀錄可改卡片、日期、商家，也能直接刪除',
      '班表可自訂時間、加備註，改錯可以復原',
      '首頁「全部」可以自己選要計入哪些付款方式',
      '忘記密碼、匯出 CSV、刪除帳號',
    ],
  },
  {
    version: 'v1.6',
    changes: [
      '改善新增卡片的顏色選擇介面',
      '修正卡片通知時間輸入框跑版問題',
    ],
  },
  {
    version: 'v1.5',
    changes: [
      '新增 Google 帳號登入',
      '設定頁可綁定／解除 Google 帳號',
    ],
  },
  {
    version: 'v1.4',
    changes: [
      '更新 App 圖示',
    ],
  },
  {
    version: 'v1.3',
    changes: [
      '首頁加入時段問候語',
      '修正 PWA Safari 無法開啟的問題',
      '新增更新通知功能',
    ],
  },
  {
    version: 'v1.2',
    changes: [
      '新增卡片管理與交易關聯',
      '未分類交易一鍵套用常用卡',
    ],
  },
  {
    version: 'v1.1',
    changes: [
      '新增 LINE Bot 記帳功能',
      '班表薪水自動計算',
    ],
  },
]

export const APP_VERSION = VERSION_HISTORY[0].version

// 當前版本的更新項目
export const CHANGELOG = VERSION_HISTORY[0].changes

// 每次部署都不一樣的編號（Vercel 的 commit SHA），用來讓 service worker 每次部署都換新，
// 就算這次沒有升版本號（只修小 bug）也會提示使用者更新
export const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7)
