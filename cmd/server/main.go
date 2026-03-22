package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"mockj-go/internal/config"
	"mockj-go/internal/database"
	"mockj-go/internal/handlers"
	"mockj-go/internal/middleware"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := database.NewDatabase(cfg.Database.DataSourceName)
	if err != nil {
		log.Fatalf("Failed to initialize database: %s %v", cfg.Database.DataSourceName, err)
	}
	defer db.Close()

	// Start cleanup routine
	go startCleanupRoutine(db, cfg.Database.CleanupInterval)

	// Initialize handlers
	jsonHandler := handlers.NewJSONHandler(db)

	// Setup router
	mux := http.NewServeMux()

	// API routes (must be registered before static files)
	mux.HandleFunc("POST /api/json", jsonHandler.CreateJSON)
	mux.HandleFunc("GET /api/json/{id}", jsonHandler.GetJSON)
	mux.HandleFunc("GET /api/json/{id}/content", jsonHandler.GetJSONContent)
	mux.HandleFunc("PUT /api/json/{id}", jsonHandler.UpdateJSON)
	mux.HandleFunc("DELETE /api/json/{id}", jsonHandler.DeleteJSON)

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// SPA fallback handler
	spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := "./web/dist" + r.URL.Path

		// Check if the requested file exists
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// For API routes or non-existent paths, serve index.html for SPA
			if !strings.HasPrefix(r.URL.Path, "/api/") {
				http.ServeFile(w, r, "./web/dist/index.html")
				return
			}
			http.NotFound(w, r)
			return
		}

		// Serve the requested file
		http.FileServer(http.Dir("./web/dist")).ServeHTTP(w, r)
	})

	// Static files (web frontend) with SPA fallback
	mux.Handle("/", spaHandler)

	// Apply middleware
	handler := middleware.Logging(mux)
	handler = middleware.CORS(handler)
	handler = middleware.ContentType(handler)

	if cfg.RateLimit.Enabled {
		handler = middleware.RateLimit(cfg.RateLimit.Requests, cfg.RateLimit.Window)(handler)
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         cfg.ServerAddr(),
		Handler:      handler,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on %s", cfg.ServerAddr())
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create a deadline for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func startCleanupRoutine(db *database.Database, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		if err := db.CleanupExpired(); err != nil {
			log.Printf("Failed to cleanup expired records: %v", err)
		}
	}
}
