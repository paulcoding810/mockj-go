package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// JSON represents a JSON entity in the database
type JSON struct {
	ID         string    `json:"id" db:"id"`
	Content    string    `json:"json" db:"json"`
	Password   string    `json:"-" db:"password"` // Never include password in JSON responses
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	ModifiedAt time.Time `json:"modifiedAt" db:"modified_at"`
	Expires    time.Time `json:"expires" db:"expires"`
}

// JSONData represents the JSON content with proper validation
type JSONData struct {
	Data interface{} `json:"data"`
}

// Value implements the driver.Valuer interface for JSONData
func (j JSONData) Value() (driver.Value, error) {
	return json.Marshal(j.Data)
}

// Scan implements the sql.Scanner interface for JSONData
func (j *JSONData) Scan(value interface{}) error {
	if value == nil {
		j.Data = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, &j.Data)
	case string:
		return json.Unmarshal([]byte(v), &j.Data)
	default:
		return nil
	}
}

// NewJSON creates a new JSON entity with default values
func NewJSON(content, password string) *JSON {
	now := time.Now()
	return &JSON{
		ID:         uuid.New().String(),
		Content:    content,
		Password:   password,
		CreatedAt:  now,
		ModifiedAt: now,
		Expires:    now.AddDate(0, 0, 60), // Default 60 days
	}
}

// IsExpired checks if the JSON entity has expired
func (j *JSON) IsExpired() bool {
	return time.Now().After(j.Expires)
}
