# syntax=docker/dockerfile:1

ARG NODE_VERSION=24-bookworm-slim

# ---------------------------------------------------------------------------
# deps: install all dependencies once (tsx is needed at runtime, so keep dev deps)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# dev: source is bind-mounted by docker-compose.local.yml; Vite HMR runs in-process
# ---------------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development \
    HOST=0.0.0.0 \
    PORT=8030 \
    FONT_DESK_DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 8030
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# build: typecheck + vite build
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# prod: serve the built dist/ with the Node server
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8030 \
    FONT_DESK_DATA_DIR=/data
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8030
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/defaults').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "server/index.ts"]
