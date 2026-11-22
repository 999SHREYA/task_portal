# ---------- base: install all dependencies ----------
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

# ---------- dev: used by docker-compose (hot reload) ----------
FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# ---------- build: next build (standalone output) ----------
FROM base AS build
# The /api rewrite target is baked in at build time.
ARG API_URL=http://backend:5000
ENV API_URL=$API_URL
COPY . .
RUN npm run build

# ---------- production: tiny Node server from .next/standalone ----------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
