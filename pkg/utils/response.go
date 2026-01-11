package utils

import (
	"encoding/json"
	"net/http"
)

// WriteJSONResponse writes a JSON response with proper headers
func WriteJSONResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// WriteErrorResponse writes an error response
func WriteErrorResponse(w http.ResponseWriter, status int, message string) {
	errorResponse := map[string]interface{}{
		"error":   http.StatusText(status),
		"message": message,
	}
	WriteJSONResponse(w, status, errorResponse)
}

// IsValidJSON checks if a string is valid JSON
func IsValidJSON(s string) bool {
	var js interface{}
	return json.Unmarshal([]byte(s), &js) == nil
}
