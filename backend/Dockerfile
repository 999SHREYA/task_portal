# ---------- base: install all dependencies ----------
FROM node:22-alpine AS base
WORKDIR /app
# Tests download their own MongoDB later; skip it during install.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci

# ---------- dev: used by docker-compose (hot reload with tsx) ----------
FROM base AS dev
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---------- build: compile TypeScript to dist/ ----------
FROM base AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- production: only compiled JS + production dependencies ----------
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "dist/server.js"]
