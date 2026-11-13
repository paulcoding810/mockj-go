package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

	// Test case 4: Serve raw JSON content by ID (powers the /raw/{id} URL)
	t.Run("ServeContentByID", func(t *testing.T) {
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

		// Found: writes the raw content verbatim with a nosniff header.
		w = httptest.NewRecorder()
		if ok := handler.ServeContentByID(w, httptest.NewRequest("GET", "/", nil), id); !ok {
			t.Fatalf("Expected ServeContentByID to find id %s", id)
		}
		if w.Body.String() != content {
			t.Errorf("Expected raw content %q, got %q", content, w.Body.String())
		}
		if w.Header().Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type: application/json")
		}
		if w.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Errorf("Expected X-Content-Type-Options: nosniff header")
		}

		// Missing: returns false and writes nothing.
		w = httptest.NewRecorder()
		if ok := handler.ServeContentByID(w, httptest.NewRequest("GET", "/", nil), "does-not-exist"); ok {
			t.Errorf("Expected ServeContentByID to report not found")
		}
		if w.Body.Len() != 0 {
			t.Errorf("Expected empty body for missing id, got %q", w.Body.String())
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

	// Test case 6: A non-JSON content type is stored and served verbatim.
	t.Run("ServeContentByIDWithContentType", func(t *testing.T) {
		content := "<root><example>data</example></root>"
		reqBody := map[string]interface{}{
			"json":        content,
			"contentType": "application/xml",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		if w.Code != http.StatusCreated {
			t.Fatalf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)
		id := createResponse["data"].(map[string]interface{})["id"].(string)

		w = httptest.NewRecorder()
		if ok := handler.ServeContentByID(w, httptest.NewRequest("GET", "/", nil), id); !ok {
			t.Fatalf("Expected ServeContentByID to find id %s", id)
		}
		if w.Body.String() != content {
			t.Errorf("Expected raw content %q, got %q", content, w.Body.String())
		}
		if w.Header().Get("Content-Type") != "application/xml" {
			t.Errorf("Expected Content-Type: application/xml, got %q", w.Header().Get("Content-Type"))
		}
		if w.Header().Get("Content-Security-Policy") != "default-src 'none'; sandbox" {
			t.Errorf("Expected sandbox CSP, got %q", w.Header().Get("Content-Security-Policy"))
		}
		if w.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Errorf("Expected X-Content-Type-Options: nosniff header")
		}
	})

	// Test case 6b: JavaScript is stored and served with its executable type.
	t.Run("ServeJavaScript", func(t *testing.T) {
		content := "console.log('hello');"
		reqBody := map[string]interface{}{
			"json":        content,
			"contentType": "application/javascript",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		if w.Code != http.StatusCreated {
			t.Fatalf("Expected status %d, got %d", http.StatusCreated, w.Code)
		}

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)
		data := createResponse["data"].(map[string]interface{})

		if data["contentType"] != "application/javascript" {
			t.Errorf("Expected stored contentType application/javascript, got %v", data["contentType"])
		}

		w = httptest.NewRecorder()
		if ok := handler.ServeContentByID(w, httptest.NewRequest("GET", "/", nil), data["id"].(string)); !ok {
			t.Fatalf("Expected ServeContentByID to find created id")
		}
		if w.Body.String() != content {
			t.Errorf("Expected raw content %q, got %q", content, w.Body.String())
		}
		if w.Header().Get("Content-Type") != "application/javascript" {
			t.Errorf("Expected Content-Type: application/javascript, got %q", w.Header().Get("Content-Type"))
		}
	})

	// Test case 6c: the canonical /api/json/{id}/raw sub-resource and the
	// /raw/{id} short alias resolve to the same content via the router.
	t.Run("RawRoutesAreSynced", func(t *testing.T) {
		content := `{"synced": true}`
		reqBody := map[string]interface{}{"json": content}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)
		id := createResponse["data"].(map[string]interface{})["id"].(string)

		mux := http.NewServeMux()
		mux.HandleFunc("GET /api/json/{id}/raw", handler.GetRawContent)
		mux.HandleFunc("GET /raw/{id}", handler.GetRawContent)

		for _, path := range []string{"/api/json/" + id + "/raw", "/raw/" + id} {
			rw := httptest.NewRecorder()
			mux.ServeHTTP(rw, httptest.NewRequest("GET", path, nil))
			if rw.Code != http.StatusOK {
				t.Errorf("%s: expected 200, got %d", path, rw.Code)
			}
			if rw.Body.String() != content {
				t.Errorf("%s: expected %q, got %q", path, content, rw.Body.String())
			}
		}
	})

	// Test case 7: A disallowed content type is rejected.
	t.Run("CreateJSONDisallowedContentType", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"json":        "<script>alert(1)</script>",
			"contentType": "text/html",
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

	// Test case 8: Omitting contentType defaults to application/json (backward compat).
	t.Run("CreateJSONDefaultsContentType", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"json": `{"ok": true}`,
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.CreateJSON(w, req)

		var createResponse map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &createResponse)
		data := createResponse["data"].(map[string]interface{})
		if data["contentType"] != "application/json" {
			t.Errorf("Expected default contentType application/json, got %v", data["contentType"])
		}

		w = httptest.NewRecorder()
		if ok := handler.ServeContentByID(w, httptest.NewRequest("GET", "/", nil), data["id"].(string)); !ok {
			t.Fatalf("Expected ServeContentByID to find created id")
		}
		if w.Header().Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type: application/json, got %q", w.Header().Get("Content-Type"))
		}
	})
}

func createForTest(t *testing.T, handler *JSONHandler, reqBody map[string]interface{}) (*httptest.ResponseRecorder, map[string]interface{}) {
	t.Helper()
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/api/json", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.CreateJSON(w, req)
	var resp map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	data, _ := resp["data"].(map[string]interface{})
	return w, data
}

func TestMockOptions(t *testing.T) {
	db, err := database.NewDatabase(":memory:")
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}
	defer db.Close()
	handler := NewJSONHandler(db)

	t.Run("NameStatusDelayAreStoredAndServed", func(t *testing.T) {
		w, data := createForTest(t, handler, map[string]interface{}{
			"json":   `{"error":"boom"}`,
			"name":   "  error case  ",
			"status": 503,
			"delay":  50,
		})
		if w.Code != http.StatusCreated {
			t.Fatalf("Expected 201, got %d: %s", w.Code, w.Body.String())
		}
		if data["name"] != "error case" || data["status"] != float64(503) || data["delay"] != float64(50) {
			t.Errorf("Unexpected stored options: %v", data)
		}

		rw := httptest.NewRecorder()
		start := time.Now()
		handler.ServeContentByID(rw, httptest.NewRequest("GET", "/", nil), data["id"].(string))
		if elapsed := time.Since(start); elapsed < 50*time.Millisecond {
			t.Errorf("Expected at least 50ms delay, got %v", elapsed)
		}
		if rw.Code != 503 {
			t.Errorf("Expected status 503, got %d", rw.Code)
		}
		if rw.Body.String() != `{"error":"boom"}` {
			t.Errorf("Unexpected body %q", rw.Body.String())
		}
	})

	t.Run("DefaultsToStatus200", func(t *testing.T) {
		_, data := createForTest(t, handler, map[string]interface{}{"json": `{}`})
		if data["status"] != float64(200) || data["delay"] != float64(0) || data["name"] != "" {
			t.Errorf("Unexpected defaults: %v", data)
		}
	})

	t.Run("RejectsInvalidOptions", func(t *testing.T) {
		for _, tc := range []map[string]interface{}{
			{"json": `{}`, "status": 199},
			{"json": `{}`, "status": 600},
			{"json": `{}`, "delay": -1},
			{"json": `{}`, "delay": 10001},
			{"json": `{}`, "name": strings.Repeat("x", 101)},
			{"json": `{not json`},
			{"json": `{not json`, "contentType": "application/json"},
		} {
			if w, _ := createForTest(t, handler, tc); w.Code != http.StatusBadRequest {
				t.Errorf("%v: expected 400, got %d", tc, w.Code)
			}
		}
	})

	t.Run("NonJSONTypesSkipJSONValidation", func(t *testing.T) {
		if w, _ := createForTest(t, handler, map[string]interface{}{"json": "{not json", "contentType": "text/plain"}); w.Code != http.StatusCreated {
			t.Errorf("Expected 201, got %d", w.Code)
		}
	})
}
