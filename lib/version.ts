export const APP_VERSION = 'v1.6'

export const VERSION_HISTORY: { version: string; changes: string[] }[] = [
  {
    version: 'v1.6',
    changes: [
      '改善新增卡片的顏色選擇介面',
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

// 當前版本的更新項目，顯示在更新通知 banner
export const CHANGELOG = VERSION_HISTORY.find(v => v.version === APP_VERSION)?.changes ?? []
