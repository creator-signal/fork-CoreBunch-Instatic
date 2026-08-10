# syntax=docker/dockerfile:1

ARG BUN_BUILD_IMAGE=oven/bun:1.3.11-slim@sha256:478281fdd196871c7e51ba6a820b7803a8ae97042ec86cdbc2e1c6b6626442d9
ARG BUN_RUNTIME_IMAGE=oven/bun:1.3.11-alpine@sha256:7ed9f74c326d1c260abe247ac423ccbf5ac92af62bb442d515d1f92f21e8ea9b

FROM ${BUN_BUILD_IMAGE} AS base
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends zip \
    && rm -rf /var/lib/apt/lists/*
# vendor/pixel-art-icons is a `file:` dep — `bun install` needs it on disk to
# resolve the dependency, so copy it alongside the manifest before installing.
COPY package.json bun.lock ./
COPY vendor ./vendor
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
RUN bun run instatic-plugin build integrations/creator-signal
RUN bun run instatic-plugin build integrations/component-showcase

FROM base AS production-deps
WORKDIR /app
COPY package.json bun.lock ./
COPY vendor ./vendor
RUN bun install --frozen-lockfile --production

FROM ${BUN_RUNTIME_IMAGE} AS runtime
WORKDIR /app

RUN apk upgrade --no-cache

ARG INSTATIC_VERSION=dev
ARG INSTATIC_REVISION=unknown
ARG INSTATIC_CREATED=unknown

LABEL org.opencontainers.image.title="Instatic"
LABEL org.opencontainers.image.description="Self-hosted CMS with an integrated visual editor."
LABEL org.opencontainers.image.source="https://github.com/creator-signal/fork-CoreBunch-Instatic"
LABEL org.opencontainers.image.url="https://github.com/creator-signal/fork-CoreBunch-Instatic"
LABEL org.opencontainers.image.documentation="https://github.com/creator-signal/fork-CoreBunch-Instatic/tree/main/docs/deployment"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="${INSTATIC_VERSION}"
LABEL org.opencontainers.image.revision="${INSTATIC_REVISION}"
LABEL org.opencontainers.image.created="${INSTATIC_CREATED}"

ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_DIR=/app/dist
ENV UPLOADS_DIR=/app/uploads
ENV INSTATIC_BUILD_RELEASE="${INSTATIC_REVISION}"

COPY --from=production-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --chown=bun:bun package.json bun.lock ./
COPY --chown=bun:bun tsconfig*.json ./
COPY --chown=bun:bun server ./server
COPY --chown=bun:bun src ./src
COPY --from=build --chown=bun:bun /app/integrations/creator-signal.plugin.zip /app/starter-plugins/creator-signal.plugin.zip
COPY --from=build --chown=bun:bun /app/integrations/component-showcase.plugin.zip /app/starter-plugins/component-showcase.plugin.zip

RUN mkdir -p /app/uploads /app/data && chown -R bun:bun /app

USER bun
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["bun", "run", "server/healthcheck.ts"]

CMD ["bun", "run", "server/index.ts"]
