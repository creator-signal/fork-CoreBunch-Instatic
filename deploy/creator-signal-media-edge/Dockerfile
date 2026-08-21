ARG GO_IMAGE=golang:1.26.6-alpine3.23@sha256:5978cc992ad5ef96a7469713c8af849c1433824761ce3be2c56381403cd8d9a3
ARG ALPINE_IMAGE=alpine:3.23.3@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659

FROM ${GO_IMAGE} AS build
WORKDIR /src

COPY deploy/creator-signal-media-edge/go.mod deploy/creator-signal-media-edge/go.sum ./
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -X github.com/caddyserver/caddy/v2.CustomVersion=v2.11.4-creator-signal.1" \
    -o /out/caddy \
    github.com/caddyserver/caddy/v2/cmd/caddy

FROM ${ALPINE_IMAGE}

ARG INSTATIC_VERSION=dev
ARG INSTATIC_REVISION=unknown
ARG INSTATIC_CREATED=unknown

LABEL org.opencontainers.image.title="Creator Signal Instatic media edge"
LABEL org.opencontainers.image.description="Read-only media route from Creator Signal Instatic to its MinIO bucket."
LABEL org.opencontainers.image.source="https://github.com/creator-signal/fork-CoreBunch-Instatic"
LABEL org.opencontainers.image.version="${INSTATIC_VERSION}"
LABEL org.opencontainers.image.revision="${INSTATIC_REVISION}"
LABEL org.opencontainers.image.created="${INSTATIC_CREATED}"

RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates \
    && mkdir -p /config /data /etc/caddy /srv

ENV XDG_CONFIG_HOME=/config
ENV XDG_DATA_HOME=/data

WORKDIR /srv
COPY --from=build /out/caddy /usr/bin/caddy
COPY deploy/creator-signal-media-edge/Caddyfile /etc/caddy/Caddyfile

USER 1000:1000
EXPOSE 8080

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
