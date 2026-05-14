FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production=false

COPY . .

RUN npx vite build --outDir server/public

RUN npm prune --production

EXPOSE 4000

CMD ["node", "server/index.js"]
