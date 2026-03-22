FROM node:20-alpine AS builder
WORKDIR /app

ENV CI=1

COPY package*.json ./
RUN npm install
RUN npx expo install react-dom react-native-web @expo/metro-runtime --fix
COPY . .
RUN npx expo export -p web

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 19006
CMD ["npx", "--yes", "serve", "dist", "-l", "19006", "-s"]
