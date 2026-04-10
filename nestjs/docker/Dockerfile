# ===== Stage 1: build =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build


# ===== Stage 2: production =====
FROM node:20-alpine

WORKDIR /app

# cài ffmpeg nếu project dùng
RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm install --omit=dev

# copy build từ stage builder
COPY --from=builder /app/dist ./dist

# nếu thư mục uploads không tồn tại thì tạo
RUN mkdir -p uploads

EXPOSE 10000

CMD ["node", "dist/main.js"]