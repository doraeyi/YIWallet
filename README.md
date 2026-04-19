# 易記帳 YiWallet

個人記帳 PWA，支援手動記帳、LINE Bot 快速記帳、班表薪資管理、財務統計圖表。

---

## 目錄

- [功能總覽](#功能總覽)
- [技術棧](#技術棧)
- [專案結構](#專案結構)
- [環境設定](#環境設定)
- [LINE Bot 完整流程](#line-bot-完整流程)
- [本地開發](#本地開發)
- [部署](#部署)

---

## 功能總覽

| 功能 | 說明 |
|------|------|
| 收支記帳 | 手動新增收入/支出，支援分類、備註、日期 |
| 預算管理 | 設定月預算，首頁即時顯示剩餘額度 |
| 財務統計 | 週/月/年維度的支出圖表與分類分析 |
| 班表管理 | 排班記錄、多工作薪資計算（時薪/月薪），含假日加倍計算 |
| LINE Bot 記帳 | 傳訊息給 Bot 自動建立支出；多使用者透過綁定碼各自連接 |
| PWA | 可安裝至手機主畫面，離線顯示提示頁 |
| 即時通知 | 網站開著時 LINE Bot 有新記錄立即彈出通知（SSE） |

---

## 技術棧

- **框架**：Next.js 16（App Router）+ React 19 + TypeScript
- **樣式**：Tailwind CSS v4 + Radix UI + Base UI
- **圖表**：Recharts
- **認證**：JWT（jose）+ Session Cookie
- **後端**：FastAPI + MySQL（Ubuntu 自架），透過 `/api/backend/[...path]` 代理
- **LINE**：LINE Messaging API Webhook
- **即時推送**：Server-Sent Events（SSE）
- **PWA**：Service Worker + Web App Manifest

---

## 專案結構

```
yiwallet/
├── app/
│   ├── layout.tsx                      # Root layout（字型、PWA、SW 註冊）
│   ├── page.tsx                        # 根路由 → 導向 /dashboard
│   ├── globals.css
│   ├── manifest.ts                     # PWA Manifest
│   ├── sw-register.tsx                 # Service Worker 註冊元件
│   ├── offline/page.tsx                # 離線提示頁
│   │
│   ├── (auth)/                         # 未登入頁面群組
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── (wallet)/                       # 需登入頁面群組
│   │   ├── layout.tsx                  # 側邊欄 + 底部導覽 + LineImportBanner
│   │   ├── dashboard/page.tsx          # 首頁：收支總覽、預算進度
│   │   ├── transactions/page.tsx       # 所有交易記錄
│   │   ├── stats/page.tsx              # 圖表統計
│   │   ├── schedule/page.tsx           # 班表排班
│   │   └── settings/page.tsx           # 設定（預算、LINE Bot 綁定、工作管理）
│   │
│   ├── actions/
│   │   └── auth.ts                     # Server Actions：login / register / logout
│   │
│   └── api/
│       ├── backend/[...path]/route.ts  # 代理後端 API（附帶 Bearer Token）
│       ├── me/token/route.ts           # 取得目前登入的 token
│       ├── invoice/sync/route.ts       # 財政部電子發票 API 代理
│       └── line/
│           ├── webhook/route.ts        # LINE Bot Webhook（簽名驗證、解析、記帳）
│           ├── link/route.ts           # 帳號綁定 CRUD（POST/GET/DELETE）
│           ├── pending/route.ts        # 待確認筆數（GET/DELETE）
│           └── sse/route.ts            # Server-Sent Events 即時推送
│
├── components/
│   ├── ui/                             # Shadcn / Base UI 基礎元件
│   └── wallet/
│       ├── sidebar.tsx                 # 桌面側邊導覽
│       ├── mobile-nav.tsx              # 手機底部導覽
│       ├── transaction-form.tsx        # 新增/編輯交易表單
│       ├── transaction-list.tsx        # 交易列表
│       ├── add-transaction-sheet.tsx   # 快速新增抽屜
│       ├── overview-chart.tsx          # 收支趨勢圖
│       ├── category-chart.tsx          # 分類圓餅圖
│       ├── stat-cards.tsx              # 統計數字卡片
│       ├── period-selector.tsx         # 週/月/年切換
│       ├── invoice-sync-sheet.tsx      # 電子發票匯入抽屜
│       └── line-import-banner.tsx      # LINE Bot 新記錄通知橫幅
│
├── contexts/
│   └── transactions-context.tsx        # 全域交易狀態、預算、refetch
│
├── hooks/
│   ├── use-transactions.ts             # useTransactions（從 context 匯出）
│   ├── use-mobile.ts
│   └── use-is-desktop.ts
│
├── lib/
│   ├── types.ts                        # TypeScript 型別定義
│   ├── api.ts                          # 前端 API Client（transactions / jobs / shifts）
│   ├── session.ts                      # JWT session 驗證（verifySession）
│   ├── finance-utils.ts                # 財務計算（分組、篩選、格式化）
│   ├── invoice-utils.ts                # 電子發票工具（HMAC、AES、分類猜測）
│   ├── line-parser.ts                  # LINE 訊息解析器
│   ├── line-links.ts                   # LINE 帳號綁定管理（打 Python API）
│   ├── line-pending.ts                 # 待確認計數 + EventEmitter
│   ├── version.ts                      # App 版本號
│   └── utils.ts                        # cn()
│
├── public/
│   ├── sw.js                           # Service Worker
│   ├── icon.png
│   └── apple-icon.png
│
├── proxy.ts                            # Middleware：保護 (wallet) 路由
├── next.config.ts
└── .env.local                    # 環境變數（本機）
```



## LINE Bot 完整流程

### 架構圖

```
使用者在 LINE 傳訊息給 Bot
          ↓
  LINE Platform
          ↓  POST /api/line/webhook（HMAC-SHA256 簽名驗證）
          ↓
┌─────────────────────────────────────────────────────────┐
│  webhook/route.ts                                       │
│                                                         │
│  /link XXXXXX  →  confirmLink()  →  綁定成功/失敗       │
│  /myid         →  回覆 LINE User ID                     │
│  其他訊息      →  getTokenForLineUser(lineUserId)       │
│                   ├─ 查無對應 → 回覆「請先綁定帳號」    │
│                   └─ 找到 token                         │
│                      → parseAny(text)                   │
│                        ├─ 解析失敗 → 回覆格式錯誤       │
│                        └─ 解析成功                      │
│                           → POST {API_URL}/transactions  │
│                           → incrementPending()           │
│                           → 回覆「✅ 已記帳 XXX $XXX」   │
└─────────────────────────────────────────────────────────┘
          ↓ incrementPending() emit('update')
          ↓
  sse/route.ts → 推送給所有連線中的瀏覽器
          ↓
  LineImportBanner（EventSource）立即彈出通知
          ↓ 使用者點「更新」
  refetch() + DELETE /api/line/pending → 資料更新、通知消失
```

### 使用者綁定流程

```
① 使用者至「設定 → LINE Bot 自動記帳」
② 點「產生綁定碼」→ 系統產生 6 碼代碼（10 分鐘有效）
③ 點「複製指令」→ 複製 /link XXXXXX 到剪貼簿
④ 開啟 LINE，傳訊息給 Bot：/link XXXXXX
⑤ Bot 呼叫 confirmLink() → Python API 驗證並寫入 MySQL
⑥ 回覆「✅ 帳號綁定成功！」
⑦ 設定頁狀態更新為「已綁定」
```

### 訊息解析格式（`lib/line-parser.ts`）

`parseAny()` 依序嘗試兩種格式：

**格式 1：結構化銀行 / LINE Pay 通知**

```
NT$242
卡末四碼：3838
交易時間：2026/04/14 19:48
商店名稱：中油一左營站
```

| 欄位 | 解析規則 |
|------|---------|
| 金額 | `NT[＄$]\s*([0-9,]+)` 或 `消費金額[：:]\s*...` |
| 日期 | `(?:交易\|消費)時間[：:]\s*YYYY/MM/DD`（找不到則用今日） |
| 商家 | `(?:商店名稱\|消費地點\|商家)[：:]\s*(.+)` |

**格式 2：快速手動輸入（語音輸入友善）**

```
全家 茶葉蛋 10
捷運28
麥當勞 大麥克 149元
```

最後一段數字為金額，前面為商家/備註，不需空格。

**自動分類**：`guessCategory()` 依商家名稱關鍵字對應系統分類（餐飲、交通、超市、娛樂…）。


### LINE Developers 設定步驟

1. 前往 [developers.line.biz](https://developers.line.biz/)，建立 Provider
2. 在 Provider 下建立 **LINE Official Account**（官方帳號）
3. 進入帳號後台 → **Messaging API** → 啟用 Messaging API
4. 取得 **Channel Secret**（Basic settings 頁）
5. 取得 **Channel Access Token**（Messaging API tab → Issue）
6. 填入 `.env.local`
7. Webhook URL 設為 `https://你的網域/api/line/webhook`，確認 Webhook 已開啟
8. 停用「自動回應訊息」和「加入好友歡迎訊息」（LINE Official Account Manager → 回應設定）

> **本地開發 Webhook**：LINE 需要公開 HTTPS，推薦 Cloudflare Tunnel（免費）：
> ```bash
> npx cloudflared tunnel --url http://localhost:3000
> ```
> 將產生的網址貼入 LINE Developers Webhook URL，點「Verify」確認回應 200。

---

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

---

## 部署

推薦部署至 **Vercel**（Next.js 原生支援）：

1. 將專案推送至 GitHub
2. 在 Vercel 匯入專案
3. 設定所有 Environment Variables（與 `.env.local` 相同內容，`API_URL` 改為 Ubuntu 後端的公開網址）
4. 部署完成後，將 Vercel 網域填入 LINE Developers Webhook URL

> LINE 綁定資料儲存在 Ubuntu 上的 MySQL，由 Python 後端管理，與 Vercel 無關，部署後資料持久不會消失。
