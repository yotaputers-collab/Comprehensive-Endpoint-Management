FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed (package.json + lockfile are required here)
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed. Inheriting from the dependencies
# stage keeps /app/package.json, /app/package-lock.json and /app/node_modules,
# which `npm run build` needs in order to resolve the build script.
FROM dependencies AS builder
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Production image
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

# Add a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Run the application as non-root user
USER appuser

# Expose the application port
EXPOSE 3000

# Expose WebSocket port for SOC integration
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
