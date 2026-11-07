# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=devlibrary-pnpm11-store,target=/var/cache/devlibrary-pnpm-store,sharing=locked \
    --mount=type=cache,id=devlibrary-pnpm11-meta,target=/root/.cache/pnpm,sharing=locked \
    pnpm install --frozen-lockfile --store-dir /var/cache/devlibrary-pnpm-store \
      --network-concurrency=8 --fetch-timeout=180000

FROM dependencies AS builder
ENV DEVLIBRARY_STANDALONE=true
COPY . .
RUN node scripts/prepare-portable.mjs --in-place
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DEVLIBRARY_DATA_DIR=/app/library-data

# Standalone output contains only runtime dependencies. User files never enter
# the image; the first launch initializes the mounted volume from seed content.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/data/catalog.json ./data/catalog.json
COPY --from=builder --chown=node:node /app/courses.config.json ./courses.config.json
COPY --from=builder --chown=node:node /app/scripts/create-course.mjs /app/scripts/note-files.mjs ./scripts/
COPY --from=builder --chown=node:node /app/lib/local-library.mjs /app/lib/note-path.mjs /app/lib/course-sections.mjs ./lib/
RUN mkdir -p /app/library-data && chown node:node /app/library-data

USER node
EXPOSE 3000
VOLUME ["/app/library-data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
