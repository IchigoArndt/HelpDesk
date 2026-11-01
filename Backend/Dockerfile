FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --no-audit --no-fund && npm run prisma:generate
COPY prisma/migrations ./prisma/migrations
COPY src ./src
COPY tests ./tests

USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:deploy && npm run seed && exec node src/server.js"]
