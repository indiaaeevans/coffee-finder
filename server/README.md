# Coffee finder server

## Getting started

### Development with auto-reload
`npm run dev`

### Production
`npm start`

## Folder structure

server/
├── index.js          # Server startup
├── app.js            # Koa app setup and middleware
├── config/
│   └── index.js      # Configuration
├── routes/
│   └── geo.js        # Route definitions
├── services/
│   ├── geocoding.js  # Geocoding service
│   └── poi.js        # POI service
└── .env              # Environment variables

## Example usage

# Reverse geocoding
GET /api/v1/geo/reverse?latitude=40.7128&longitude=-74.0060

# Forward geocoding
GET /api/v1/geo/forward?address=1600 Pennsylvania Avenue, Washington DC

# Places search
GET /api/v1/geo/places?latitude=40.7128&longitude=-74.0060&radius=1000&limit=20