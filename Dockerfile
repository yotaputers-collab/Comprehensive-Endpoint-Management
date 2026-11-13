FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies only when needed
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --silent

# Install TypeScript and ts-node for development
RUN npm install -g typescript ts-node

# Rebuild the source code only when needed
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY tsconfig.json .
COPY nest-cli.json .
COPY src ./src
RUN npm run build

# Production image
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

# Add a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Run the application as non-root user
USER appuser

# Expose the application port
EXPOSE 3000

# Expose WebSocket port for SOC integration
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]