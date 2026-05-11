FROM node:22-slim AS base

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json jest.config.ts eslint.config.js cspell.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM base AS runner

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./dist/generated
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]