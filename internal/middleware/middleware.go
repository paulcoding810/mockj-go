package middleware

import (
	"log"
	"net"
	"net/http"
	"sync"
	"time"
)

// CORS middleware
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logging middleware
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a response writer wrapper to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		log.Printf("%s %s %d %v", r.Method, r.URL.Path, wrapped.statusCode, duration)
	})
}

// ContentType middleware
func ContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" || r.Method == "PUT" {
			contentType := r.Header.Get("Content-Type")
			if contentType != "application/json" {
				http.Error(w, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

// RateLimit middleware (simple fixed-window implementation).
//
// The client map is guarded by a mutex to avoid the fatal "concurrent map
// writes" panic under concurrent traffic, and stale entries are evicted
// periodically so the map cannot grow without bound (memory-exhaustion DoS).
func RateLimit(requests int, window time.Duration) func(http.Handler) http.Handler {
	type client struct {
		requests int
		window   time.Time
	}

	var mu sync.Mutex
	clients := make(map[string]*client)

	// Evict entries whose window has fully elapsed so the map size stays
	// bounded by the number of recently-active clients.
	go func() {
		ticker := time.NewTicker(window)
		defer ticker.Stop()
		for range ticker.C {
			mu.Lock()
			now := time.Now()
			for ip, c := range clients {
				if now.Sub(c.window) > window {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Key on the host only; RemoteAddr includes an ephemeral port,
			// which would otherwise make every request look like a new client.
			clientIP := r.RemoteAddr
			if host, _, err := net.SplitHostPort(clientIP); err == nil {
				clientIP = host
			}

			mu.Lock()
			c, exists := clients[clientIP]
			if !exists || time.Since(c.window) > window {
				clients[clientIP] = &client{requests: 1, window: time.Now()}
				mu.Unlock()
				next.ServeHTTP(w, r)
				return
			}

			if c.requests >= requests {
				mu.Unlock()
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			c.requests++
			mu.Unlock()
			next.ServeHTTP(w, r)
		})
	}
}

// responseWriter is a wrapper to capture the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
