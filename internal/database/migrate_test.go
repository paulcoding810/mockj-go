package database

import (
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"mockj-go/internal/models"

	_ "github.com/mattn/go-sqlite3"
)

// TestMigrateDropsLegacyPasswordColumn verifies that opening a database created
// with the old schema (which had a NOT NULL password column) drops that column,
// preserves existing rows, and allows new inserts that no longer supply a
// password.
func TestMigrateDropsLegacyPasswordColumn(t *testing.T) {
	tmpPath := filepath.Join(t.TempDir(), "legacy.db")

	// Build a database with the OLD schema and seed one row.
	raw, err := sql.Open("sqlite3", tmpPath)
	if err != nil {
		t.Fatalf("open raw db: %v", err)
	}
	_, err = raw.Exec(`
	CREATE TABLE json (
		id TEXT PRIMARY KEY,
		json TEXT NOT NULL,
		password TEXT NOT NULL,
		created_at DATETIME NOT NULL,
		modified_at DATETIME NOT NULL,
		expires DATETIME NOT NULL
	);`)
	if err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}

	now := time.Now()
	future := now.AddDate(0, 0, 30)
	_, err = raw.Exec(
		`INSERT INTO json (id, json, password, created_at, modified_at, expires) VALUES (?, ?, ?, ?, ?, ?)`,
		"legacy-id", `{"legacy":true}`, "hashed-password", now, now, future,
	)
	if err != nil {
		t.Fatalf("seed legacy row: %v", err)
	}
	if err := raw.Close(); err != nil {
		t.Fatalf("close raw db: %v", err)
	}

	// Reopen through NewDatabase, which runs createTables + migrate.
	db, err := NewDatabase(tmpPath)
	if err != nil {
		t.Fatalf("NewDatabase: %v", err)
	}
	defer db.Close()

	// The password column must be gone.
	has, err := db.columnExists("json", "password")
	if err != nil {
		t.Fatalf("columnExists: %v", err)
	}
	if has {
		t.Errorf("expected password column to be dropped, but it still exists")
	}

	// The pre-existing row must survive.
	existing, err := db.GetJSON("legacy-id")
	if err != nil {
		t.Fatalf("GetJSON(legacy-id): %v", err)
	}
	if existing.Content != `{"legacy":true}` {
		t.Errorf("unexpected content for preserved row: %q", existing.Content)
	}

	// A new insert without a password must now succeed (previously failed with
	// a NOT NULL constraint error).
	fresh := &models.JSON{
		ID:         "fresh-id",
		Content:    `{"fresh":true}`,
		CreatedAt:  now,
		ModifiedAt: now,
		Expires:    future,
	}
	if err := db.CreateJSON(fresh); err != nil {
		t.Fatalf("CreateJSON after migration: %v", err)
	}
}
