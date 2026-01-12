package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"mockj-go/internal/database"
	"mockj-go/internal/models"

	"golang.org/x/crypto/bcrypt"
)

type JSONHandler struct {
	db *database.Database
}

func NewJSONHandler(db *database.Database) *JSONHandler {
	return &JSONHandler{db: db}
}

// CreateJSONRequest represents the request body for creating a JSON
type CreateJSONRequest struct {
	Content  string     `json:"json"`
	Password string     `json:"password"`
	Expires  *time.Time `json:"expires,omitempty"`
}

// UpdateJSONRequest represents the request body for updating a JSON
type UpdateJSONRequest struct {
	Content  *string    `json:"json,omitempty"`
	Password string     `json:"password"`
	Expires  *time.Time `json:"expires,omitempty"`
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	if req.Content == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_content", "JSON content cannot be empty")
		return
	}

	if req.Password == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_password", "Password is required")
		return
	}

	if req.Expires != nil && req.Expires.Before(time.Now()) {
		h.writeError(w, http.StatusBadRequest, "invalid_expires", "Expiration time must be in the future")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "hash_error", "Failed to hash password")
		return
	}

	jsonModel := models.NewJSON(req.Content, string(hashedPassword))
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

	// Set Content-Type to application/json and return the raw content
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(jsonModel.Content))
}

// UpdateJSON handles PUT /api/json/{id}
func (h *JSONHandler) UpdateJSON(w http.ResponseWriter, r *http.Request) {
	id := extractIDFromPath(r.URL.Path)
	if id == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_id", "ID is required")
		return
	}

	var req UpdateJSONRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	if req.Password == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_password", "Password is required")
		return
	}

	if req.Expires != nil && req.Expires.Before(time.Now()) {
		h.writeError(w, http.StatusBadRequest, "invalid_expires", "Expiration time must be in the future")
		return
	}

	// Get existing JSON with password
	jsonModel, err := h.db.GetJSONWithPassword(id)
	if err != nil {
		if err.Error() == "json not found or expired" {
			h.writeError(w, http.StatusNotFound, "not_found", "JSON not found or expired")
		} else {
			h.writeError(w, http.StatusInternalServerError, "database_error", "Failed to retrieve JSON")
		}
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(jsonModel.Password), []byte(req.Password)); err != nil {
		h.writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid password")
		return
	}

	// Update fields if provided
	if req.Content != nil {
		jsonModel.Content = *req.Content
	}
	if req.Expires != nil {
		jsonModel.Expires = *req.Expires
	}

	if err := h.db.UpdateJSON(jsonModel); err != nil {
		h.writeError(w, http.StatusInternalServerError, "database_error", "Failed to update JSON")
		return
	}

	// Clear password from response before sending
	jsonModel.Password = ""

	h.writeJSON(w, http.StatusOK, SuccessResponse{
		Data:    jsonModel,
		Message: "JSON updated successfully",
	})
}

// DeleteJSON handles DELETE /api/json/{id}
func (h *JSONHandler) DeleteJSON(w http.ResponseWriter, r *http.Request) {
	id := extractIDFromPath(r.URL.Path)
	if id == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_id", "ID is required")
		return
	}

	// Parse request body to get password
	var req struct {
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON body")
		return
	}

	if req.Password == "" {
		h.writeError(w, http.StatusBadRequest, "invalid_password", "Password is required")
		return
	}

	// Get existing JSON with password
	json, err := h.db.GetJSONWithPassword(id)
	if err != nil {
		if err.Error() == "json not found or expired" {
			h.writeError(w, http.StatusNotFound, "not_found", "JSON not found or expired")
		} else {
			h.writeError(w, http.StatusInternalServerError, "database_error", "Failed to retrieve JSON")
		}
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(json.Password), []byte(req.Password)); err != nil {
		h.writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid password")
		return
	}

	if err := h.db.DeleteJSON(id); err != nil {
		if err.Error() == "json not found" {
			h.writeError(w, http.StatusNotFound, "not_found", "JSON not found")
		} else {
			h.writeError(w, http.StatusInternalServerError, "database_error", "Failed to delete JSON")
		}
		return
	}

	h.writeJSON(w, http.StatusOK, SuccessResponse{
		Message: "JSON deleted successfully",
	})
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

// extractIDFromPath extracts the ID from the URL path
func extractIDFromPath(path string) string {
	parts := strings.Split(path, "/")
	if len(parts) >= 4 {
		return parts[3] // /api/json/{id} or /api/json/{id}/content
	}
	return ""
}
