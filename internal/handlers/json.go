package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"mockj-go/internal/database"
	"mockj-go/internal/models"
)

// maxBodyBytes caps the size of a request body to prevent memory-exhaustion
// DoS from arbitrarily large payloads (1 MiB).
const maxBodyBytes = 1 << 20

type JSONHandler struct {
	db *database.Database
}

func NewJSONHandler(db *database.Database) *JSONHandler {
	return &JSONHandler{db: db}
}

// CreateJSONRequest represents the request body for creating a JSON
type CreateJSONRequest struct {
	Content string     `json:"json"`
	Expires *time.Time `json:"expires,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Data    interface{} `json:"data"`
	Message string      `json:"message,omitempty"`
}

// CreateJSON handles POST /api/json
func (h *JSONHandler) CreateJSON(w http.ResponseWriter, r *http.Request) {
	var req CreateJSONRequest
	if err := decodeBody(w, r, &req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	if req.Content == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_content", "JSON content cannot be empty")
		return
	}

	if req.Expires != nil && req.Expires.Before(time.Now()) {
		h.writeError(w, http.StatusBadRequest, "invalid_expires", "Expiration time must be in the future")
		return
	}

	if req.Expires != nil && req.Expires.After(time.Now().AddDate(1, 0, 0)) {
		h.writeError(w, http.StatusBadRequest, "invalid_expires", "Expiration time must be less than 1 year from now")
		return
	}

	jsonModel := models.NewJSON(req.Content)
	if req.Expires != nil {
		jsonModel.Expires = *req.Expires
	}

	if err := h.db.CreateJSON(jsonModel); err != nil {
		h.writeError(w, http.StatusInternalServerError, "database_error", "Failed to create JSON")
		return
	}

	h.writeJSON(w, http.StatusCreated, SuccessResponse{
		Data:    jsonModel,
		Message: "JSON created successfully",
	})
}

// GetJSON handles GET /api/json/{id}
func (h *JSONHandler) GetJSON(w http.ResponseWriter, r *http.Request) {
	id := extractIDFromPath(r.URL.Path)
	if id == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_id", "ID is required")
		return
	}

	jsonModel, err := h.db.GetJSON(id)
	if err != nil {
		if err.Error() == "json not found or expired" {
			h.writeError(w, http.StatusNotFound, "not_found", "JSON not found or expired")
		} else {
			h.writeError(w, http.StatusInternalServerError, "database_error", "Failed to retrieve JSON")
		}
		return
	}

	h.writeJSON(w, http.StatusOK, SuccessResponse{
		Data: jsonModel,
	})
}

// GetJSONContent handles GET /api/json/{id}/content - returns raw JSON content
func (h *JSONHandler) GetJSONContent(w http.ResponseWriter, r *http.Request) {
	id := extractIDFromPath(r.URL.Path)
	if id == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_id", "ID is required")
		return
	}

	jsonModel, err := h.db.GetJSON(id)
	if err != nil {
		if err.Error() == "json not found or expired" {
			h.writeError(w, http.StatusNotFound, "not_found", "JSON not found or expired")
		} else {
			h.writeError(w, http.StatusInternalServerError, "database_error", "Failed to retrieve JSON")
		}
		return
	}

	// Set Content-Type to application/json and return the raw content.
	// nosniff prevents browsers from MIME-sniffing attacker-controlled
	// content as HTML, which would enable stored XSS.
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(jsonModel.Content))
}

// writeJSON writes a JSON response
func (h *JSONHandler) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// writeError writes an error response
func (h *JSONHandler) writeError(w http.ResponseWriter, status int, errType, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errType,
		Message: message,
	})
}

// decodeBody decodes a JSON request body into dst, enforcing a maximum body
// size to guard against memory-exhaustion DoS from oversized payloads.
func decodeBody(w http.ResponseWriter, r *http.Request, dst interface{}) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	return json.NewDecoder(r.Body).Decode(dst)
}

// extractIDFromPath extracts the ID from the URL path
func extractIDFromPath(path string) string {
	parts := strings.Split(path, "/")
	if len(parts) >= 4 {
		return parts[3] // /api/json/{id} or /api/json/{id}/content
	}
	return ""
}
