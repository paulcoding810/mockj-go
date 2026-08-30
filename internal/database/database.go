package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"mockj-go/internal/models"

	_ "github.com/mattn/go-sqlite3"
)

type Database struct {
	db *sql.DB
}

// NewDatabase creates a new database connection
func NewDatabase(dataSourceName string) (*Database, error) {
	db, err := sql.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	database := &Database{db: db}

	if err = database.createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	if err = database.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return database, nil
}

// migrate applies one-off schema fixes to bring an existing database up to the
// current schema. Safe to run on every startup and on a fresh DB.
func (d *Database) migrate() error {
	// The password column was removed. Drop it from pre-existing databases so
	// inserts (which no longer supply a password) don't hit the leftover
	// NOT NULL constraint.
	has, err := d.columnExists("json", "password")
	if err != nil {
		return err
	}
	if has {
		if _, err := d.db.Exec(`ALTER TABLE json DROP COLUMN password`); err != nil {
			return fmt.Errorf("failed to drop legacy password column: %w", err)
		}
		log.Println("Migrated database: dropped legacy password column")
	}
	return nil
}

// columnExists reports whether the given table has the given column. The table
// name is a hard-coded constant, not user input, so string interpolation into
// the PRAGMA (which cannot be parameterized) is safe.
func (d *Database) columnExists(table, column string) (bool, error) {
	rows, err := d.db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid     int
			name    string
			colType string
			notNull int
			dflt    sql.NullString
			pk      int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			return false, err
		}
		if name == column {
			return true, nil
		}
	}
	return false, rows.Err()
}

// createTables creates the necessary database tables
func (d *Database) createTables() error {
	query := `
	CREATE TABLE IF NOT EXISTS json (
		id TEXT PRIMARY KEY,
		json TEXT NOT NULL,
		created_at DATETIME NOT NULL,
		modified_at DATETIME NOT NULL,
		expires DATETIME NOT NULL
	);
	
	CREATE INDEX IF NOT EXISTS idx_json_expires ON json(expires);
	CREATE INDEX IF NOT EXISTS idx_json_created_at ON json(created_at);
	`

	_, err := d.db.Exec(query)
	return err
}

// Close closes the database connection
func (d *Database) Close() error {
	return d.db.Close()
}

// CreateJSON inserts a new JSON entity
func (d *Database) CreateJSON(json *models.JSON) error {
	query := `
	INSERT INTO json (id, json, created_at, modified_at, expires)
	VALUES (?, ?, ?, ?, ?)
	`

	_, err := d.db.Exec(query, json.ID, json.Content, json.CreatedAt, json.ModifiedAt, json.Expires)
	return err
}

// GetJSON retrieves a JSON entity by ID
func (d *Database) GetJSON(id string) (*models.JSON, error) {
	query := `
	SELECT id, json, created_at, modified_at, expires
	FROM json
	WHERE id = ? AND expires > ?
	`

	json := &models.JSON{}
	err := d.db.QueryRow(query, id, time.Now()).Scan(
		&json.ID,
		&json.Content,
		&json.CreatedAt,
		&json.ModifiedAt,
		&json.Expires,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("json not found or expired")
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get json: %w", err)
	}

	return json, nil
}

// CleanupExpired removes expired JSON entities
func (d *Database) CleanupExpired() error {
	query := `DELETE FROM json WHERE expires <= ?`

	result, err := d.db.Exec(query, time.Now())
	if err != nil {
		return fmt.Errorf("failed to cleanup expired jsons: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected > 0 {
		log.Printf("Cleaned up %d expired JSON entities", rowsAffected)
	}

	return nil
}
