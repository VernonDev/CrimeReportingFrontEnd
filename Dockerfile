# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_DEFAULT_MAP_LAT=37.7749
ARG NEXT_PUBLIC_DEFAULT_MAP_LNG=-122.4194
ARG NEXT_PUBLIC_DEFAULT_MAP_ZOOM=12
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DEFAULT_MAP_LAT=$NEXT_PUBLIC_DEFAULT_MAP_LAT
ENV NEXT_PUBLIC_DEFAULT_MAP_LNG=$NEXT_PUBLIC_DEFAULT_MAP_LNG
ENV NEXT_PUBLIC_DEFAULT_MAP_ZOOM=$NEXT_PUBLIC_DEFAULT_MAP_ZOOM
RUN npm run build

# Stage 3: Production runtime (standalone output)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
