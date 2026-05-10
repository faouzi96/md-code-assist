# Dockerfile — Formatter + Diagnostics Test

Press `Shift+Alt+F` to format all blocks. Formatting and diagnostics both delegate to the [ms-azuretools.vscode-docker](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) extension (auto-installed). Diagnostics are powered by Hadolint inside the extension.
Check **View → Output → Markdown Code Assistant** if blocks are skipped.

> **Fence labels** — use ` ```dockerfile ` or ` ```docker ` (both are recognised).

---

## Formatting — Node.js app (Docker extension will normalise whitespace and ordering)

```dockerfile
FROM node:20-alpine
workdir /app
COPY package*.json ./
run npm ci --omit=dev
copy . .
expose 3000
cmd ["node","dist/index.js"]
```

## Formatting — multi-stage Python build

```dockerfile
FROM python:3.12-slim AS builder
workdir /build
COPY requirements.txt .
run pip install --no-cache-dir --target=/build/deps -r requirements.txt

FROM python:3.12-slim
workdir /app
copy --from=builder /build/deps /app/deps
ENV PYTHONPATH=/app/deps
copy . .
cmd ["python","-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
```

## Formatting — Go binary (scratch final image)

```dockerfile
FROM golang:1.22 AS builder
workdir /src
COPY go.mod go.sum ./
run go mod download
copy . .
run CGO_ENABLED=0 GOOS=linux go build -o /app ./cmd/server

FROM scratch
copy --from=builder /app /app
expose 8080
entrypoint ["/app"]
```

---

## Diagnostics — valid Dockerfile (no errors expected)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Diagnostics — Hadolint DL3006 (always tag FROM images)

```dockerfile
FROM node
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]
```

## Diagnostics — Hadolint DL3008 (pin apt-get package versions)

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl git wget
CMD ["bash"]
```

## Diagnostics — Hadolint DL3009 (delete apt-get lists after installing)

```dockerfile
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl
CMD ["bash"]
```

## Diagnostics — Hadolint DL4006 (set SHELL option for pipelines with pipe)

```dockerfile
FROM alpine:3.19
RUN wget -qO- https://example.com/install.sh | sh
CMD ["app"]
```

## Diagnostics — multiple issues combined

```dockerfile
FROM ubuntu
RUN apt-get update
RUN apt-get install curl
RUN apt-get install git
COPY . /app
RUN cd /app && npm install
CMD node /app/index.js
```
