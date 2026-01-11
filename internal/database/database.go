package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"mockj-go/internal/models"
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

	return database, nil
}

// createTables creates the necessary database tables
func (d *Database) createTables() error {
	query := `
	CREATE TABLE IF NOT EXISTS json (
		id TEXT PRIMARY KEY,
		json TEXT NOT NULL,
		password TEXT NOT NULL,
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
	INSERT INTO json (id, json, password, created_at, modified_at, expires)
	VALUES (?, ?, ?, ?, ?, ?)
	`

	_, err := d.db.Exec(query, json.ID, json.Content, json.Password, json.CreatedAt, json.ModifiedAt, json.Expires)
	return err
}

// GetJSON retrieves a JSON entity by ID
func (d *Database) GetJSON(id string) (*models.JSON, error) {
	query := `
	SELECT id, json, password, created_at, modified_at, expires
	FROM json
	WHERE id = ? AND expires > ?
	`

	json := &models.JSON{}
	err := d.db.QueryRow(query, id, time.Now()).Scan(
		&json.ID,
		&json.Content,
		&json.Password,
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

// UpdateJSON updates an existing JSON entity
func (d *Database) UpdateJSON(json *models.JSON) error {
	query := `
	UPDATE json
	SET json = ?, password = ?, modified_at = ?, expires = ?
	WHERE id = ?
	`

	json.ModifiedAt = time.Now()

	result, err := d.db.Exec(query, json.Content, json.Password, json.ModifiedAt, json.Expires, json.ID)
	if err != nil {
		return fmt.Errorf("failed to update json: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("json not found")
	}

	return nil
}

// DeleteJSON deletes a JSON entity by ID
func (d *Database) DeleteJSON(id string) error {
	query := `DELETE FROM json WHERE id = ?`

	result, err := d.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete json: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("json not found")
	}

	return nil
}

// GetJSONWithPassword retrieves a JSON entity by ID including the password
func (d *Database) GetJSONWithPassword(id string) (*models.JSON, error) {
	query := `
	SELECT id, json, password, created_at, modified_at, expires
	FROM json
	WHERE id = ? AND expires > ?
	`

	json := &models.JSON{}
	err := d.db.QueryRow(query, id, time.Now()).Scan(
		&json.ID,
		&json.Content,
		&json.Password,
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
