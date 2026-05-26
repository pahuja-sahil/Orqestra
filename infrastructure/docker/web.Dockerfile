# web.Dockerfile
# This builds our Next.js frontend image

# ============================================
# STAGE 1: BASE
# ============================================
FROM node:20-alpine AS base
# node:20-alpine = Node.js 20 on minimal Alpine Linux
# Alpine = tiny Linux distro, only 5MB base
# Perfect for containers

WORKDIR /app

# ============================================
# STAGE 2: DEPENDENCIES
# Install packages separately for Docker cache
# Same reason as api.Dockerfile —
# package.json rarely changes, code changes often
# So Docker caches node_modules layer separately
# ============================================
FROM base AS dependencies

# Copy package files first
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install
# Using npm install here to allow building even if lockfile is slightly out of sync

# ============================================
# STAGE 3: DEVELOPMENT
# Hot reload enabled via Next.js dev server
# ============================================
FROM dependencies AS development

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================
# STAGE 4: PRODUCTION
# Optimized for production deployment
# ============================================
FROM dependencies AS production

COPY . .

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
CMD ["npm", "start"]