package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"mockj-go/internal/database"
)

func TestJSONHandler(t *testing.T) {
	// Setup in-memory database for testing
	db, err := database.NewDatabase(":memory:")
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer db.Close()

	// Setup handler
	handler := NewJSONHandler(db)

	// Test case 1: Create JSON
	t.Run("CreateJSON", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"json": `{"name": "John", "age": 30}`,
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.CreateJSON(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}

		var response map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &response)

		if data, ok := response["data"].(map[string]interface{}); ok {
			if data["json"] != `{"name": "John", "age": 30}` {
				t.Errorf("Expected JSON content not found")
			}
		}
	})

	// Test case 2: Create JSON with empty content should fail
	t.Run("CreateJSONEmptyContent", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"json": "",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.CreateJSON(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	// Test case 3: Get JSON
	t.Run("GetJSON", func(t *testing.T) {
		// First create a JSON
		testJson := map[string]interface{}{
			"json": `{"name": "John", "age": 30}`,
		}

		body, _ := json.Marshal(testJson)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)

		id := createResponse["data"].(map[string]interface{})["id"].(string)

		// Now get the JSON
		req = httptest.NewRequest("GET", "/api/json/"+id, nil)
		w = httptest.NewRecorder()
		handler.GetJSON(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		var getResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &getResponse)

		if data, ok := getResponse["data"].(map[string]interface{}); ok {
			if data["id"] != id {
				t.Errorf("Expected ID %s, got %s", id, data["id"])
			}
		}
	})

	// Test case 4: Get raw JSON content
	t.Run("GetJSONContent", func(t *testing.T) {
		content := `{"name": "John", "age": 30}`
		testJson := map[string]interface{}{
			"json": content,
		}

		body, _ := json.Marshal(testJson)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)

		id := createResponse["data"].(map[string]interface{})["id"].(string)

		req = httptest.NewRequest("GET", "/api/json/"+id+"/content", nil)
		w = httptest.NewRecorder()
		handler.GetJSONContent(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}
		if w.Body.String() != content {
			t.Errorf("Expected raw content %q, got %q", content, w.Body.String())
		}
		if w.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Errorf("Expected X-Content-Type-Options: nosniff header")
		}
	})

	// Test case 5: Get non-existent JSON returns 404
	t.Run("GetJSONNotFound", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/json/does-not-exist", nil)
		w := httptest.NewRecorder()
		handler.GetJSON(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})
}
