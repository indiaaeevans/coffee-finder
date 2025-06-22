require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  // Use 0.0.0.0 to accept connections on all network interfaces
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  // TODO defaults
  api: {
    key: process.env.GEO_API_KEY,
    urls: {
      reverseGeocode: process.env.REVERSE_GEOCODE_API_URL,
      forwardGeocode: process.env.FORWARD_GEOCODE_API_URL,
      places: process.env.PLACES_API_URL,
      autocomplete: process.env.AUTOCOMPLETE_API_URL
    },
    places: {
      tags: process.env.PLACES_TAGS,
      defaultLimit: 10,
      maxLimit: 50,
      defaultRadius: 1000, // meters
      maxRadius: 50000 // meters
    }
  }
};

module.exports = config;