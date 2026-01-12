#!/bin/bash

echo "🔨 Building React application with Vite..."

cd web

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build React app with Vite
echo "🏗️  Building React app..."
npm run build

echo "✅ React build completed!"
echo "📁 Build files are in ./web/dist"
echo ""
echo "🚀 To start Go server:"
echo "   cd .."
echo "   go run cmd/server/main.go"
echo ""
echo "🌐 The server will now serve the React application!"