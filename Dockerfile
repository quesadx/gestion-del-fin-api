# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Install dependencies
RUN npm ci

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files for production
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY prisma ./prisma

# Expose port
EXPOSE 3000

# Health check (optional but recommended for Railway)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/system/time', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))" || exit 1

# Start the application with migrations
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm start"]

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]