# 正式機部署（朋友的 Docker 主機）

## 目錄結構

在朋友的主機上，`docker-compose.prod.yml` 預期旁邊長這樣：

```
deploy/
  docker-compose.prod.yml
  .env                          # 從 prod.env.example 複製、填好
  secrets/
    firebase-adminsdk.json      # 從 kaikaizhen 的 ~/yiwallet 複製過來
  backend/                      # kaikaizhen 上 ~/yiwallet 的原始碼 + backend.Dockerfile（改名成 Dockerfile）
  frontend/                     # 這個 YIWallet repo 的 checkout（本身就有 Dockerfile 了）
```

`backend/` 底下要放 `Dockerfile`（複製 [backend.Dockerfile](backend.Dockerfile)）跟 `.dockerignore`（複製 [backend.dockerignore](backend.dockerignore)）。之所以要這樣手動複製，是因為後端目前沒有進 git，這幾份檔案只能先放這裡當參考副本、部署時手動放過去。

## 還沒決定、要先跟朋友確認的事

`docker-compose.prod.yml` 裡 `frontend`/`backend` 服務目前只用 `expose`（只給同一個 compose 網路內部用），還沒接外部流量。要看朋友那邊：

- 反向代理是 nginx／Caddy／Traefik 還是別的，新服務怎麼接進去。
- 網域規劃：前後端分兩個子網域，還是同網域用路徑區分。
- 是要讓反向代理直接加入這個 compose 的 network，還是這邊開 `ports` 對應到他反向代理設定的 upstream。

確認後回來改 `docker-compose.prod.yml` 裡標 `TODO` 的那幾行即可，其他都不用動。

## 上線步驟

1. **先用空白資料庫把整套架起來**：`docker compose -f docker-compose.prod.yml up -d --build`。後端 `main.py` 裡的 `models.Base.metadata.create_all(bind=engine)` 會在啟動時直接照目前 `models.py` 建出完整的資料表結構——全新資料庫不需要重跑那一長串 `migrate_*.py`，那些是給「已經有資料、只是要加欄位」的既有資料庫用的。
2. 對正式網域建一個可拋棄的測試帳號，跑過一輪核心流程（登入、記帳、班表匯入與好友標註、加好友含推播、工作共享），確認整條路徑在正式機環境下沒問題。
3. **資料搬遷**（liam 現有的 kaikaizhen 資料）：

   ```bash
   # 在 kaikaizhen 上
   mysqldump -u root campuslife > campuslife_dump.sql
   scp campuslife_dump.sql <朋友主機>:/path/to/deploy/

   # 在朋友主機上，匯入到正式機的 mysql container
   docker compose -f docker-compose.prod.yml exec -T mysql \
     mysql -u root -p"$MYSQL_ROOT_PASSWORD" campuslife < campuslife_dump.sql
   ```

   匯入前記得先核對兩邊資料庫的 schema 版本一致（也就是 kaikaizhen 上的 `models.py` 是最新的，沒有還沒 apply 的 migration）。匯入後核對關鍵資料表筆數，並用 liam 的帳號實際登入正式機確認卡片、交易、班表都在。
4. **更新外部服務登記的網址**（這三個不會因為程式碼對就自動生效，是各自在外部後台登記的網址）：
   - Google Cloud Console：OAuth Client 的授權重新導向 URI 加上正式機網域。
   - LINE Developers：Bot 的 webhook URL 改成正式機網域。
   - Firebase：不用改，前後端可以共用同一個 Firebase 專案，`NEXT_PUBLIC_FIREBASE_*` 那組 key 本身跟網域無關。
5. **kaikaizhen 收尾**：確認正式機一切正常後，把 kaikaizhen 上 `campuslife` 的正式資料清掉／重建成乾淨的測試資料，避免同一份真實財務資料留在兩台機器上。

## 容易漏掉的細節

- `NEXT_PUBLIC_*` 開頭的環境變數會在 `next build` 當下直接寫進前端 JS bundle，只能透過 `docker-compose.prod.yml` 裡 `frontend.build.args` 在建置時傳入，光設 `environment:`（執行期）沒有用——這是這份 compose 檔已經處理好的地方，之後如果要加新的 `NEXT_PUBLIC_*` 變數，兩邊（`args` 跟 `environment`）都要加。
- Firebase 服務帳戶 JSON 不要放進 image 裡（也不會被 git 追蹤），用 volume 掛進 `backend` container。
- `JWT_SECRET`（後端簽 token）跟 `SESSION_SECRET`（前端簽 cookie）是兩把不同的鑰匙，正式機都要重新產生，不要沿用 kaikaizhen 的值。
- 後端有用 `apscheduler` 跑排程（發薪日/到期提醒推播），目前假設只有一個 backend container 在跑；如果之後真的要多開幾個 backend 副本做水平擴充，排程會被重複觸發，需要另外處理（例如只在其中一個副本啟用），現階段先不用管。
