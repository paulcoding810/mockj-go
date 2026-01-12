# Multi-stage build for optimized production image

# Stage 1: Build React application
FROM node:18-alpine AS react-builder

WORKDIR /app

# Copy web package files
COPY web/package*.json ./

# Install dependencies
RUN npm ci
# RUN npm ci --only=production

# Copy web source code
COPY web/ ./

# Build React application with Vite
RUN npm run build

# Stage 2: Build Go application
FROM golang:1.25.5-alpine AS go-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY pkg/ ./pkg/

# Build Go application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server/main.go

# Stage 3: Production image
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite tzdata && \
    addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy compiled Go binary from go-builder stage
COPY --from=go-builder /app/main ./

# Copy built React application from react-builder stage
COPY --from=react-builder /app/web/dist ./web/dist/

# Copy original static files as fallback
COPY --from=go-builder /app/web ./web-original/

# Create data directory with proper permissions
RUN mkdir -p /app/data && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./main"]