# Multi-stage build for optimized production image

# Stage 1: Build React application
FROM node:18-alpine AS react-builder

WORKDIR /app/web

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
RUN apk add --no-cache git ca-certificates build-base

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY pkg/ ./pkg/

# Build Go application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server/main.go

# Stage 3: Production image
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates sqlite tzdata && \
    addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy database

# Copy compiled Go binary from go-builder stage
COPY --from=go-builder /app/main ./

# Copy built React application from react-builder stage
COPY --from=react-builder /app/web/dist ./web/dist/

# Create data directory with proper permissions
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./main"]