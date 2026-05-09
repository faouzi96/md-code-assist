# YAML — Formatter Test

Press `Shift+Alt+F` to format all blocks with Prettier (bundled — no install required).

---

## Formatting — compact YAML (Prettier will expand and normalize)

```yaml
server: { host: localhost, port: 8080, debug: true }
database: { url: 'postgresql://localhost/mydb', pool: { min: 2, max: 10 } }
logging: { level: info, format: json }
```

## Formatting — GitHub Actions workflow

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run compile
      - run: npm run lint
      - run: npm test
```

## Formatting — Docker Compose style

```yaml
version: '3.9'
services:
  app:
    build: { context: ., dockerfile: Dockerfile }
    ports: ['3000:3000']
    environment: { NODE_ENV: production, PORT: 3000 }
    depends_on: [db, redis]
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: mydb, POSTGRES_USER: user, POSTGRES_PASSWORD: secret }
    volumes: ['pg_data:/var/lib/postgresql/data']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
volumes:
  pg_data:
```

## Formatting — Kubernetes manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: my-app, namespace: default, labels: { app: my-app, version: v1 } }
spec:
  replicas: 3
  selector: { matchLabels: { app: my-app } }
  template:
    metadata: { labels: { app: my-app } }
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports: [{ containerPort: 3000 }]
          env: [{ name: NODE_ENV, value: production }]
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { cpu: 500m, memory: 512Mi }
```

## Formatting — anchors and aliases

```yaml
defaults: &defaults
  timeout: 30
  retries: 3
  backoff: exponential

development:
  <<: *defaults
  debug: true
  log_level: debug

production:
  <<: *defaults
  debug: false
  log_level: warn
  replicas: 5
```

## Formatting — multiline strings

```yml
config:
  description: |
    This is a multi-line
    description that spans
    several lines.
  query: >
    SELECT id, name, email
    FROM users
    WHERE active = true
    ORDER BY name ASC;
  script: "echo 'hello' && echo 'world'"
```
