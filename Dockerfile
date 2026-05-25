FROM node:22-slim AS base

WORKDIR /app

ENV PORT=3000

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json jest.config.ts eslint.config.js cspell.json ./
COPY scripts ./scripts
COPY src ./src
RUN npx prisma generate && npm run build

FROM base AS runner

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./dist/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

#CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
CMD ["sh", "-c", "echo '[startup] migrate'; NODE_OPTIONS=--trace-deprecation npx prisma migrate deploy; echo '[startup] api'; NODE_OPTIONS=--trace-deprecation npm start"]