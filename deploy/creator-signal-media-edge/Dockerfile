ARG CADDY_IMAGE=caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
FROM ${CADDY_IMAGE}

LABEL org.opencontainers.image.title="Creator Signal Instatic media edge"
LABEL org.opencontainers.image.description="Read-only media route from Creator Signal Instatic to its MinIO bucket."
LABEL org.opencontainers.image.source="https://github.com/creator-signal/fork-CoreBunch-Instatic"

COPY deploy/creator-signal-media-edge/Caddyfile /etc/caddy/Caddyfile

USER root
RUN setcap -r /usr/bin/caddy

USER 1000:1000
EXPOSE 8080
