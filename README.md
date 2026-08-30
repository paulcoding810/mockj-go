# MockJ-Go

A Go-based JSON mock API server inspired by [MockJ](https://github.com/paulcoding810/mockj). Create shareable, read-only JSON mock endpoints quickly and easily over a simple REST API.

## Features

- 🚀 **REST API** - Create and read JSON mock endpoints
- 🌐 **Web Interface** - Modern web frontend for creating and viewing endpoints
- 💾 **SQLite Database** - Lightweight, file-based database
- 🔒 **Immutable Endpoints** - Once created, endpoints are read-only; no edits, no surprises
- ⏰ **Auto Expiry** - Every endpoint expires and is cleaned up automatically
- 🛡️ **CORS Support** - Cross-origin resource sharing enabled
- 📝 **Request Logging** - Detailed request/response logging
- ⚡ **Rate Limiting** - Configurable rate limiting per client
- 🐳 **Docker Support** - Containerized deployment with web frontend
- 🔧 **Configurable** - Environment-based configuration

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd mockj-go

# Run with Docker Compose
docker-compose up -d

# Open web interface
open http://localhost:8080

# Or check health endpoint
curl http://localhost:8080/health
```

### From Source

```bash
# Clone and build
git clone <your-repo-url>
cd mockj-go
go build -o bin/server ./cmd/server

# Run
./bin/server
```

## API Endpoints

Endpoints are **immutable**: you create one, then read it back until it expires. There are no update or delete operations.

### Create JSON

```http
POST /api/json
Content-Type: application/json

{
  "json": "{\"name\": \"John\", \"age\": 30}",
  "expires": "2025-12-31T23:59:59Z"
}
```

`expires` is optional and must be between now and one year from now. When omitted, the endpoint defaults to 60 days. Request bodies are capped at 1 MiB.

### Get JSON (metadata + content)

```http
GET /api/json/{id}
```

### Get raw JSON content

Returns just the stored content with `Content-Type: application/json` — this is the URL you point your app at.

```http
GET /api/json/{id}/content
```

### Health Check

```http
GET /health
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "uuid-string",
    "json": "{\"name\": \"John\"}",
    "createdAt": "2025-01-01T00:00:00Z",
    "modifiedAt": "2025-01-01T00:00:00Z",
    "expires": "2025-03-01T00:00:00Z"
  },
  "message": "JSON created successfully"
}
```

### Error Response

```json
{
  "error": "not_found",
  "message": "JSON not found or expired"
}
```

## Configuration

The application can be configured using environment variables:

### Server Configuration

- `SERVER_HOST` - Server host (default: "0.0.0.0")
- `SERVER_PORT` - Server port (default: 8080)
- `SERVER_READ_TIMEOUT` - Read timeout (default: 15s)
- `SERVER_WRITE_TIMEOUT` - Write timeout (default: 15s)
- `SERVER_IDLE_TIMEOUT` - Idle timeout (default: 60s)

### Database Configuration

- `DATABASE_URL` - Database file path (default: "data/mockj.db")
- `DATABASE_MAX_OPEN_CONNS` - Max open connections (default: 25)
- `DATABASE_MAX_IDLE_CONNS` - Max idle connections (default: 25)
- `DATABASE_CONN_MAX_LIFETIME` - Connection max lifetime (default: 5m)
- `DATABASE_CLEANUP_INTERVAL` - Cleanup interval (default: 1h)

### Rate Limiting Configuration

- `RATE_LIMIT_ENABLED` - Enable rate limiting (default: true)
- `RATE_LIMIT_REQUESTS` - Max requests per window (default: 100)
- `RATE_LIMIT_WINDOW` - Rate limit window (default: 1m)

## Project Structure

```
mockj-go/
├── cmd/
│   └── server/           # Main application entry point
├── internal/
│   ├── config/          # Configuration management
│   ├── database/        # Database operations
│   ├── handlers/        # HTTP request handlers
│   ├── middleware/      # HTTP middleware
│   └── models/          # Data models
├── pkg/
│   └── utils/           # Utility functions
├── web/                 # React web frontend (Vite)
│   ├── src/             # Application source
│   └── index.html       # Entry HTML
├── docker/              # Dockerfile & compose
├── go.mod
└── README.md
```

## Development

### Prerequisites

- Go 1.25 or later
- SQLite3
- Node.js (for building the web frontend)

### Setup

```bash
# Install dependencies
go mod download

# Run the application
go run ./cmd/server

# Build for production
go build -o bin/server ./cmd/server
```

### Testing

```bash
# Run tests
go test ./...

# Run tests with coverage
go test -cover ./...
```

## Web Interface

The application includes a modern React frontend that makes it easy to create and view JSON endpoints without using curl commands.

### Accessing the Web Interface

1. Start the application: `docker-compose up -d`
2. Open your browser and navigate to: `http://localhost:8080`
3. Use the web interface to:
   - Create JSON endpoints with the built-in editor
   - View existing endpoints by ID
   - Copy endpoint URLs easily

### Features

- **JSON Editor** with syntax validation and formatting
- **URL Sharing** with copy-to-clipboard functionality
- **Recent Endpoints** stored locally for quick access
- **Responsive Design** that works on all devices
- **Real-time Validation** of JSON content
- **Toast Notifications** for user feedback

## Usage Examples

### Using the Web Interface (Recommended)

1. Visit `http://localhost:8080`
2. Enter your JSON content in the editor
3. Set an expiration time
4. Click "Create Endpoint"
5. Copy the generated URL for sharing

### Using cURL API

#### Create a new JSON endpoint

```bash
curl -X POST http://localhost:8080/api/json \
  -H "Content-Type: application/json" \
  -d '{
    "json": "{\"message\": \"Hello, World!\", \"status\": 200}",
    "expires": "2025-12-31T23:59:59Z"
  }'
```

#### Retrieve the endpoint metadata

```bash
curl http://localhost:8080/api/json/{your-uuid}
```

#### Retrieve the raw JSON content

```bash
curl http://localhost:8080/api/json/{your-uuid}/content
```

## Design Notes

- **Immutable & ephemeral**: Endpoints cannot be edited or deleted through the API. Each one carries an expiry (default 60 days, max 1 year) and is removed automatically by a background cleanup routine once expired.
- **Raw content safety**: The `/content` endpoint sends `X-Content-Type-Options: nosniff` so stored content cannot be MIME-sniffed and executed as HTML by a browser.
- **Rate limiting**: A per-client fixed-window limiter guards the API; its state is concurrency-safe and bounded so it cannot leak memory under load.

## Comparison with Original MockJ

| Feature      | MockJ (Node.js)    | MockJ-Go         |
| ------------ | ------------------ | ---------------- |
| Language     | TypeScript/Node.js | Go               |
| API          | tRPC               | REST API         |
| Database     | SQLite             | SQLite           |
| Framework    | Next.js            | Standard Library |
| Bundle Size  | ~50MB              | ~15MB            |
| Memory Usage | ~100MB             | ~30MB            |
| Startup Time | ~2s                | ~0.1s            |

## License

This project is inspired by [MockJ](https://github.com/paulcoding810/mockj) and implements similar functionality in Go.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.
