#!/bin/bash

# MockJ-Go API Demo Script
# This script demonstrates all the API endpoints with password protection

BASE_URL="http://localhost:8080"
PASSWORD="demo123"

echo "=== MockJ-Go API Demo (with Password Protection) ==="
echo "Make sure to start the server: ./bin/server"
echo ""

# Check if server is running
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq .
echo ""

# Create a new JSON with password
echo "2. Create JSON with Password"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/json" \
  -H "Content-Type: application/json" \
  -d "{
    \"json\": \"{\\\"name\\\": \\\"John Doe\\\", \\\"age\\\": 30, \\\"city\\\": \\\"New York\\\"}\",
    \"password\": \"$PASSWORD\",
    \"expires\": \"2024-12-31T23:59:59Z\"
  }")

echo "$CREATE_RESPONSE" | jq .

# Extract ID for subsequent requests
JSON_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')
echo ""
echo "Created JSON with ID: $JSON_ID"
echo ""

# Get the JSON (no password required)
echo "3. Get JSON (Public Access)"
curl -s "$BASE_URL/api/json/$JSON_ID" | jq .
echo ""

# Try to update JSON with wrong password (should fail)
echo "4. Try Update JSON with Wrong Password (Should Fail)"
curl -s -X PUT "$BASE_URL/api/json/$JSON_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"json\": \"{\\\"name\\\": \\\"Wrong Update\\\"}\",
    \"password\": \"wrongpassword\"
  }" | jq .
echo ""

# Update JSON with correct password
echo "5. Update JSON with Correct Password"
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/json/$JSON_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"json\": \"{\\\"name\\\": \\\"Jane Doe\\\", \\\"age\\\": 25, \\\"city\\\": \\\"Los Angeles\\\"}\",
    \"password\": \"$PASSWORD\"
  }")

echo "$UPDATE_RESPONSE" | jq .
echo ""

# Get the updated JSON
echo "6. Get Updated JSON"
curl -s "$BASE_URL/api/json/$JSON_ID" | jq .
echo ""

# Test error case - Get non-existent JSON
echo "7. Test Error - Get Non-existent JSON"
curl -s "$BASE_URL/api/json/non-existent-id" | jq .
echo ""

# Try to delete JSON with wrong password (should fail)
echo "8. Try Delete JSON with Wrong Password (Should Fail)"
curl -s -X DELETE "$BASE_URL/api/json/$JSON_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"password\": \"wrongpassword\"
  }" | jq .
echo ""

# Delete JSON with correct password
echo "9. Delete JSON with Correct Password"
curl -s -X DELETE "$BASE_URL/api/json/$JSON_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"password\": \"$PASSWORD\"
  }" | jq .
echo ""

# Verify deletion
echo "10. Verify Deletion"
curl -s "$BASE_URL/api/json/$JSON_ID" | jq .
echo ""

# Create another JSON without password (should fail)
echo "11. Try Create JSON without Password (Should Fail)"
curl -s -X POST "$BASE_URL/api/json" \
  -H "Content-Type: application/json" \
  -d '{
    "json": "{\"message\": \"This should fail\"}"
  }' | jq .
echo ""

echo "=== Demo Complete ==="
echo ""
echo "Key Security Features Demonstrated:"
echo "- Password required for JSON creation"
echo "- Password validation for updates"
echo "- Password validation for deletions"
echo "- Public access for reads"
echo "- Passwords are hashed and never exposed in responses"