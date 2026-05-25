FROM node:22-slim AS base

WORKDIR /app

ENV PORT=3000

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

FROM base AS deps

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM deps AS build

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json jest.config.ts eslint.config.js cspell.json ./
COPY scripts ./scripts
COPY src ./src
RUN pnpm exec prisma generate && pnpm run build

FROM base AS runner

ENV NODE_ENV=production

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./dist/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["sh", "-c", "echo '[startup] migrate'; pnpm exec prisma migrate deploy; echo '[startup] api'; pnpm start"]
