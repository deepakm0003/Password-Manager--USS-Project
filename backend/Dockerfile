FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production=false

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build && npm prune --production

FROM node:18-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]

