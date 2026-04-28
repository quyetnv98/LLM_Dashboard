# Sử dụng Python image chính thức (bản slim để nhẹ hơn)
FROM python:3.10-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Thiết lập biến môi trường để Python không tạo file .pyc và log được xuất trực tiếp
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Cài đặt các thư viện hệ thống cần thiết (nếu có)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements và cài đặt dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code vào container
COPY . .

# Expose cổng (Sử dụng 8021 theo code main.py)
EXPOSE 8021

# Lệnh chạy ứng dụng
CMD ["python", "main.py"]
