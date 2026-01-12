# MockJ-Go Web Interface

This project uses React with Vite for fast development and optimized builds.

## Quick Start

### Development Mode

```bash
cd web
npm install
npm run dev
```

### Production Build

```bash
# Use the build script
./build-react.sh

# Or manually:
cd web
npm install
npm run build
```

## Features

### Tab-Based Interface

- **Create Endpoint**: Create new JSON endpoints with validation
- **View & Modify Endpoint**: Load, view, update, or delete existing endpoints

### Smart URL Handling

- Visit `/{endpoint-id}` to automatically load endpoint in "View & Modify" tab
- Clean URL updates without page reloads
- Browser back/forward navigation support

### Modern Features

- **Real-time JSON Validation**: Instant feedback as you type
- **Format JSON**: Pretty-print JSON with one click
- **Copy to Clipboard**: Easy copying of URLs and JSON content
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Toast Notifications**: User-friendly feedback system
- **Material-UI**: Professional, consistent design

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── Home.jsx          # Main component with tabs
│   │   └── ToastContainer.jsx # Toast notification system
│   ├── services/
│   │   └── api.js          # API client
│   ├── utils/
│   │   └── helpers.js      # JSON, date, clipboard utilities
│   ├── App.jsx            # Main app with routing and tabs
│   ├── main.jsx           # React entry point
│   └── index.css          # Global styles
├── index.html             # HTML template
├── package.json          # Dependencies and scripts
└── vite.config.js        # Vite configuration
```

## How It Works

### Create Mode

1. Enter JSON content in the editor
2. Optionally set password and expiration
3. Click "Create Endpoint"
4. Get API URL and view/modify URL

### View & Modify Mode

1. Enter endpoint ID or navigate to `/{id}` URL
2. View endpoint details and JSON content
3. Update with password protection
4. Delete with confirmation

### Tab Navigation

- Tabs update URL without page reload
- Switch between Create and View modes seamlessly
- Maintains state when switching tabs

## Building for Production

The application uses Vite for fast builds:

```bash
cd web
npm install
npm run build
```

Build outputs to `./web/dist/` which is automatically served by the Go server.

## Development

For development with hot reload:

```bash
cd web
npm run dev
```

This starts a dev server on port 3000 with:

- Hot Module Replacement
- Fast refresh
- API proxy to Go backend on port 8080
- Better debugging experience
