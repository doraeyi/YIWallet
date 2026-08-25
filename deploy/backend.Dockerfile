# 後端（FastAPI）。這份檔案是給正式機用的參考副本——後端原始碼實際放在
# kaikaizhen 上的 ~/yiwallet（沒有 git），實際部署時這份內容要放到後端
# 原始碼目錄裡，檔名就叫 Dockerfile，跟 requirements.txt 同一層。
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001"]
