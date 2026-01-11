# MockJ-Go

A Go-based JSON mock API server inspired by [MockJ](https://github.com/paulcoding810/mockj). Create and manage JSON mock endpoints quickly and easily with REST API instead of RPC.

## Features

- 🚀 **REST API** - Clean RESTful endpoints for CRUD operations
- 🌐 **Web Interface** - Modern web frontend for easy endpoint management
- 💾 **SQLite Database** - Lightweight, file-based database
- 🔐 **Password Protection** - Secure edit/delete operations with password authentication
- 🛡️ **CORS Support** - Cross-origin resource sharing enabled
- 📝 **Request Logging** - Detailed request/response logging
- ⚡ **Rate Limiting** - Configurable rate limiting per client
- 🐳 **Docker Support** - Containerized deployment with web frontend
- ⏰ **Auto Cleanup** - Automatic cleanup of expired JSON records
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

### Create JSON
```http
POST /api/json
Content-Type: application/json

{
  "json": "{\"name\": \"John\", \"age\": 30}",
  "password": "your-password",
  "expires": "2024-12-31T23:59:59Z"
}
```

### Get JSON
```http
GET /api/json/{id}
```
*(No password required for read operations)*

### Update JSON
```http
PUT /api/json/{id}
Content-Type: application/json

{
  "json": "{\"name\": \"Jane\", \"age\": 25}",
  "password": "your-password",
  "expires": "2024-12-31T23:59:59Z"
}
```

### Delete JSON
```http
DELETE /api/json/{id}
Content-Type: application/json

{
  "password": "your-password"
}
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
    "createdAt": "2024-01-01T00:00:00Z",
    "modifiedAt": "2024-01-01T00:00:00Z",
    "expires": "2024-03-01T00:00:00Z"
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
- `DATABASE_URL` - Database file path (default: "./mockj.db")
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
│   ├── types/           # Public type definitions
│   └── utils/           # Utility functions
├── web/                 # Web frontend
│   ├── index.html       # Main HTML page
│   ├── styles.css       # CSS styling
│   └── script.js        # JavaScript application
├── Dockerfile
├── docker-compose.yml
├── go.mod
└── README.md
```

## Development

### Prerequisites
- Go 1.21 or later
- SQLite3

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

The application includes a modern web frontend that makes it easy to manage JSON endpoints without using curl commands.

### Accessing the Web Interface
1. Start the application: `docker-compose up -d`
2. Open your browser and navigate to: `http://localhost:8080`
3. Use the web interface to:
   - Create JSON endpoints with the built-in editor
   - View existing endpoints by ID
   - Update endpoints with password protection
   - Delete endpoints securely
   - Copy endpoint URLs easily

### Features
- **JSON Editor** with syntax validation and formatting
- **Password Protection** for secure operations
- **URL Sharing** with copy-to-clipboard functionality
- **Responsive Design** that works on all devices
- **Real-time Validation** of JSON content
- **Toast Notifications** for user feedback

## Usage Examples

### Using the Web Interface (Recommended)
1. Visit `http://localhost:8080`
2. Enter your JSON content in the editor
3. Set optional password and expiration time
4. Click "Create Endpoint"
5. Copy the generated URL for sharing

### Using cURL API

#### Create a new JSON endpoint
```bash
curl -X POST http://localhost:8080/api/json \
  -H "Content-Type: application/json" \
  -d '{
    "json": "{\"message\": \"Hello, World!\", \"status\": 200}",
    "password": "my-secret-password",
    "expires": "2024-12-31T23:59:59Z"
  }'
```

#### Retrieve the JSON
```bash
curl http://localhost:8080/api/json/{your-uuid}
```

#### Update the JSON (requires password)
```bash
curl -X PUT http://localhost:8080/api/json/{your-uuid} \
  -H "Content-Type: application/json" \
  -d '{
    "json": "{\"message\": \"Updated message\", \"status\": 200}",
    "password": "my-secret-password"
  }'
```

#### Delete the JSON (requires password)
```bash
curl -X DELETE http://localhost:8080/api/json/{your-uuid} \
  -H "Content-Type: application/json" \
  -d '{
    "password": "my-secret-password"
  }'
```

## Security

### Password Protection
- **Required**: Password is required when creating JSON entries
- **Secure Storage**: Passwords are hashed using bcrypt before storage
- **Authentication**: Password required for update and delete operations
- **Privacy**: Passwords are never included in API responses
- **Public Reads**: Get operations work without password (public access)

### Password Hashing
All passwords are securely hashed using bcrypt with the default cost factor. The original passwords are never stored in the database.

## Comparison with Original MockJ

| Feature | MockJ (Node.js) | MockJ-Go |
|---------|----------------|----------|
| Language | TypeScript/Node.js | Go |
| API | tRPC | REST API |
| Database | SQLite | SQLite |
| Framework | Next.js | Standard Library |
| Password Protection | No | Yes |
| Bundle Size | ~50MB | ~15MB |
| Memory Usage | ~100MB | ~30MB |
| Startup Time | ~2s | ~0.1s |

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