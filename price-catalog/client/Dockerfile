# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Аргументы для сборки
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - nginx
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем nginx конфиг как шаблон
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Railway передаёт PORT, nginx подставит через envsubst
ENV PORT=80

EXPOSE ${PORT}

# Nginx автоматически подставит $PORT из переменной окружения
CMD ["nginx", "-g", "daemon off;"]
