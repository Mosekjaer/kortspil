# syntax=docker/dockerfile:1

ARG NODE_VERSION=24
ARG PNPM_VERSION=11.9.0

# --- build: install everything and build core, web and server ---
FROM node:${NODE_VERSION}-slim AS build
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm -r build

# --- prod-deps: only what the server needs at runtime ---
FROM node:${NODE_VERSION}-slim AS prod-deps
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --prod --filter "@kortspil/server..."

# --- runtime: slim image, non-root, server serves the built web app ---
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=prod-deps --chown=node:node /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/packages/core/package.json ./packages/core/
COPY --from=build --chown=node:node /app/packages/core/dist ./packages/core/dist
COPY --from=build --chown=node:node /app/apps/server/package.json ./apps/server/
COPY --from=build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
USER node
EXPOSE 3000
CMD ["node", "apps/server/dist/index.js"]
