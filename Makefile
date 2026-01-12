.PHONY: help build run dev clean stop restart logs

# Default target
help:
	@echo "MockJ-Go Docker Commands:"
	@echo ""
	@echo "  build     Build Docker image"
	@echo "  run       Run container in background"
	@echo "  dev       Run in development mode"
	@echo "  stop      Stop and remove container"
	@echo "  restart   Restart container"
	@echo "  logs      Show container logs"
	@echo "  clean     Remove image and container"
	@echo "  backup    Backup database"
	@echo "  restore   Restore database"
	@echo ""

# Build Docker image
build:
	@echo "🔨 Building Docker image..."
	docker build -t mockj-go .

# Run container
run: build
	@echo "🚀 Starting MockJ-Go container..."
	docker run -d \
		--name mockj-go \
		-p 8080:8080 \
		-v mockj_data:/app/data \
		mockj-go

# Development mode with hot reload
dev:
	@echo "🔧 Starting development environment..."
	docker-compose -f docker-compose.dev.yml up

# Stop container
stop:
	@echo "⏹️ Stopping MockJ-Go..."
	docker stop mockj-go 2>/dev/null || true
	docker rm mockj-go 2>/dev/null || true

# Restart container
restart: stop run
	@echo "🔄 Restarting MockJ-Go..."

# Show logs
logs:
	docker logs -f mockj-go

# Clean up
clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker stop mockj-go 2>/dev/null || true
	docker rm mockj-go 2>/dev/null || true
	docker rmi mockj-go 2>/dev/null || true
	docker volume prune -f 2>/dev/null || true

# Production deployment
deploy:
	@echo "🚀 Deploying to production..."
	docker-compose -f docker-compose.prod.yml up -d

# Backup database
backup:
	@echo "💾 Creating database backup..."
	@mkdir -p ./backups
	@docker exec mockj-go cp data/mockj.db ./backups/backup-$(shell date +%Y%m%d-%H%M%S).db
	@echo "✅ Backup created in ./backups/"

# List backups
list-backups:
	@echo "📋 Available backups:"
	@ls -la ./backups/ 2>/dev/null || echo "No backups found."

# Restore database
restore:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make restore FILE=<backup-file>"; \
		exit 1; \
	fi
	@echo "🔄 Restoring database from $(FILE)..."
	@docker cp $(FILE) mockj-go:data/mockj.db
	@docker restart mockj-go
	@echo "✅ Database restored successfully"

# Health check
health:
	@echo "🏥 Checking MockJ-Go health..."
	@curl -f http://localhost:8080/health && echo "✅ Healthy" || echo "❌ Unhealthy"

# Shell access
shell:
	@echo "🐚 Opening shell in container..."
	docker exec -it mockj-go /bin/sh

# Monitor resources
monitor:
	@echo "📊 Monitoring resource usage..."
	docker stats mockj-go

# Update image
update:
	@echo "⬆️ Updating MockJ-Go..."
	docker-compose pull
	docker-compose up -d --force-recreate