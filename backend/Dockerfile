# Stage 1: Build
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2: Runtime
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER bun

EXPOSE 3001

CMD ["bun", "run", "dist/index.js"]
