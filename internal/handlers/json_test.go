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

	// Test case 1: Create JSON with password
	t.Run("CreateJSON", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"json":     `{"name": "John", "age": 30}`,
			"password": "test123",
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
			// Password should not be in response
			if _, hasPassword := data["password"]; hasPassword {
				t.Errorf("Password should not be included in response")
			}
		}
	})

	// Test case 2: Create JSON without password should fail
	t.Run("CreateJSONWithoutPassword", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"json": `{"name": "John", "age": 30}`,
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

	// Test case 3: Get JSON (should work without password)
	t.Run("GetJSON", func(t *testing.T) {
		// First create a JSON
		testJson := map[string]interface{}{
			"json":     `{"name": "John", "age": 30}`,
			"password": "test123",
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

		var getResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &getResponse)

		if data, ok := getResponse["data"].(map[string]interface{}); ok {
			if data["id"] != id {
				t.Errorf("Expected ID %s, got %s", id, data["id"])
			}
			// Password should not be in response
			if _, hasPassword := data["password"]; hasPassword {
				t.Errorf("Password should not be included in response")
			}
		}
	})

	// Test case 4: Update JSON with correct password
	t.Run("UpdateJSON", func(t *testing.T) {
		// First create a JSON
		testJson := map[string]interface{}{
			"json":     `{"name": "John", "age": 30}`,
			"password": "test123",
		}

		body, _ := json.Marshal(testJson)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)

		id := createResponse["data"].(map[string]interface{})["id"].(string)

		// Now update the JSON with correct password
		updateJson := map[string]interface{}{
			"json":     `{"name": "Jane", "age": 25}`,
			"password": "test123",
		}

		body, _ = json.Marshal(updateJson)
		req = httptest.NewRequest("PUT", "/api/json/"+id, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		handler.UpdateJSON(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		var updateResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &updateResponse)

		if data, ok := updateResponse["data"].(map[string]interface{}); ok {
			if data["json"] != `{"name": "Jane", "age": 25}` {
				t.Errorf("Expected updated JSON content not found")
			}
		}
	})

	// Test case 5: Update JSON with wrong password should fail
	t.Run("UpdateJSONWrongPassword", func(t *testing.T) {
		// First create a JSON
		testJson := map[string]interface{}{
			"json":     `{"name": "John", "age": 30}`,
			"password": "test123",
		}

		body, _ := json.Marshal(testJson)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)

		id := createResponse["data"].(map[string]interface{})["id"].(string)

		// Try to update with wrong password
		updateJson := map[string]interface{}{
			"json":     `{"name": "Jane", "age": 25}`,
			"password": "wrongpassword",
		}

		body, _ = json.Marshal(updateJson)
		req = httptest.NewRequest("PUT", "/api/json/"+id, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		handler.UpdateJSON(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	// Test case 6: Delete JSON with correct password
	t.Run("DeleteJSON", func(t *testing.T) {
		// First create a JSON
		testJson := map[string]interface{}{
			"json":     `{"name": "John", "age": 30}`,
			"password": "test123",
		}

		body, _ := json.Marshal(testJson)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)

		id := createResponse["data"].(map[string]interface{})["id"].(string)

		// Delete with correct password
		deleteReq := map[string]interface{}{
			"password": "test123",
		}

		body, _ = json.Marshal(deleteReq)
		req = httptest.NewRequest("DELETE", "/api/json/"+id, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		handler.DeleteJSON(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
		}

		// Verify it's deleted
		req = httptest.NewRequest("GET", "/api/json/"+id, nil)
		w = httptest.NewRecorder()
		handler.GetJSON(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("Expected status %d after deletion, got %d", http.StatusNotFound, w.Code)
		}
	})

	// Test case 7: Delete JSON with wrong password should fail
	t.Run("DeleteJSONWrongPassword", func(t *testing.T) {
		// First create a JSON
		testJson := map[string]interface{}{
			"json":     `{"name": "John", "age": 30}`,
			"password": "test123",
		}

		body, _ := json.Marshal(testJson)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)

		id := createResponse["data"].(map[string]interface{})["id"].(string)

		// Try to delete with wrong password
		deleteReq := map[string]interface{}{
			"password": "wrongpassword",
		}

		body, _ = json.Marshal(deleteReq)
		req = httptest.NewRequest("DELETE", "/api/json/"+id, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		handler.DeleteJSON(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})
}
