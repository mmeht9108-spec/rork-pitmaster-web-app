# Этап 1: Сборка приложения
FROM node:20-slim AS builder

# Устанавливаем Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Рабочая директория
WORKDIR /app

# Копируем package.json и bun.lock (если есть) для кэширования зависимостей
COPY package.json bun.lock* ./

# Устанавливаем зависимости с помощью Bun
RUN bun install

# Копируем весь остальной код
COPY . .

# Собираем веб-версию (используем скрипт build из package.json)
RUN bun run build

# Этап 2: Сервер Nginx для отдачи статики
FROM nginx:alpine

# Копируем собранные файлы из папки dist (Expo экспортирует туда)
COPY --from=builder /app/dist /usr/share/nginx/html

# Создаём конфиг Nginx для поддержки клиентского роутинга (SPA)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]
