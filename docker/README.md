# Docker Deployment Guide

This guide covers deploying MockJ-Go using Docker containers.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd mockj-go

# Build and run with Docker Compose
docker-compose up -d
```

The application will be available at `http://localhost:8080`

### Using Docker Build

```bash
# Build the Docker image
docker build -t mockj-go .

# Run the container
docker run -d \
  --name mockj-go \
  -p 8080:8080 \
  -v mockj_data:/app/data \
  mockj-go
```

## Configuration

### Environment Variables

| Variable                    | Default         | Description                          |
| --------------------------- | --------------- | ------------------------------------ |
| `SERVER_HOST`               | `0.0.0.0`       | Server bind address                  |
| `SERVER_PORT`               | `8080`          | Server port                          |
| `SERVER_READ_TIMEOUT`       | `30s`           | HTTP read timeout                    |
| `SERVER_WRITE_TIMEOUT`      | `30s`           | HTTP write timeout                   |
| `SERVER_IDLE_TIMEOUT`       | `60s`           | HTTP idle timeout                    |
| `DATABASE_PATH`             | `data/mockj.db` | SQLite database path                 |
| `DATABASE_CLEANUP_INTERVAL` | `1h`            | Cleanup interval for expired records |
| `RATE_LIMIT_ENABLED`        | `true`          | Enable rate limiting                 |
| `RATE_LIMIT_REQUESTS`       | `100`           | Max requests per window              |
| `RATE_LIMIT_WINDOW`         | `1m`            | Rate limit time window               |

### Custom Configuration

```yaml
# docker-compose.yml with custom environment
services:
  mockj-go:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SERVER_PORT=8080
      - DATABASE_CLEANUP_INTERVAL=2h
      - RATE_LIMIT_REQUESTS=200
      - RATE_LIMIT_WINDOW=5m
    volumes:
      - mockj_data:/app/data
      - ./custom-config:/app/config
```

## Data Persistence

The application uses Docker volumes to persist data:

```yaml
volumes:
  mockj_data:
    driver: local
    name: mockj_go_data
```

### Backup Database

```bash
# Create backup
docker exec mockj-go cp data/mockj.db ./backup-$(date +%Y%m%d).db

# Restore backup
docker cp ./backup-20231201.db mockj-go:data/mockj.db
docker restart mockj-go
```

## Production Deployment

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  mockj-go:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - SERVER_HOST=0.0.0.0
      - SERVER_PORT=8080
      - DATABASE_PATH=data/mockj.db
      - DATABASE_CLEANUP_INTERVAL=30m
      - RATE_LIMIT_ENABLED=true
      - RATE_LIMIT_REQUESTS=1000
      - RATE_LIMIT_WINDOW=5m
    volumes:
      - /opt/mockj-go/data:/app/data
    restart: always
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:8080/health",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  mockj_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/mockj-go/data
```

### Deploy with Production Config

```bash
# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Scale the service (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale mockj-go=2
```

## Monitoring and Maintenance

### View Logs

```bash
# View real-time logs
docker-compose logs -f mockj-go

# View last 100 lines
docker-compose logs --tail=100 mockj-go

# View logs with timestamps
docker-compose logs -t mockj-go
```

### Health Checks

```bash
# Check container health
docker ps

# Check detailed health status
docker inspect mockj-go | grep Health -A 10

# Manual health check
curl http://localhost:8080/health
```

### Resource Monitoring

```bash
# View resource usage
docker stats mockj-go

# View disk usage
docker system df
```

## Security Considerations

### Network Security

```yaml
# Run behind reverse proxy
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - mockj-go

  mockj-go:
    build: .
    # No external port exposure
    expose:
      - "8080"
```

### Environment Variables Security

```bash
# Use Docker secrets or external secret management
docker run -d \
  --secret db_password \
  -e DATABASE_PATH=/run/secrets/db_password \
  mockj-go
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs for errors
docker-compose logs mockj-go

# Check if port is available
netstat -tulpn | grep 8080

# Try rebuilding image
docker-compose build --no-cache
docker-compose up -d
```

#### Database Issues

```bash
# Check database permissions
docker exec mockj-go ls -la /app/data/

# Check database integrity
docker exec mockj-go sqlite3 data/mockj.db "PRAGMA integrity_check;"

# Recreate volume if corrupted
docker-compose down
docker volume rm mockj_go_data
docker-compose up -d
```

#### Performance Issues

```bash
# Check resource limits
docker inspect mockj-go | grep -A 10 Resources

# Monitor performance
docker stats --no-stream mockj-go

# Adjust resource limits
docker-compose up -d --scale mockj-go=2
```

### Maintenance Commands

```bash
# Update application
docker-compose pull
docker-compose up -d --force-recreate

# Cleanup unused images
docker image prune -f

# Cleanup unused volumes (careful!)
docker volume prune -f

# Full reset
docker-compose down -v
docker system prune -f
docker-compose up -d
```

## Development with Docker

### Development Dockerfile

```dockerfile
# Dockerfile.dev
FROM node:18-alpine AS builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
CMD ["npm", "run", "dev"]
```

### Development Compose

```yaml
# docker-compose.dev.yml
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000" # React dev server
      - "8080:8080" # Go API server
    volumes:
      - ./web:/app/web
      - ./cmd:/app/cmd
      - ./internal:/app/internal
    environment:
      - NODE_ENV=development
```

## Multi-Architecture Builds

### Build for Multiple Architectures

```bash
# Build for amd64 and arm64
docker buildx build --platform linux/amd64,linux/arm64 -t mockj-go:latest .

# Push to registry
docker buildx build --platform linux/amd64,linux/arm64 -t your-registry/mockj-go:latest --push .
```
