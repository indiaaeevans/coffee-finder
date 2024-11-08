const axios = require('axios');
const config = require('../config');

class PlacesService {
  constructor() {
    this.apiKey = config.api.key;
    this.url = config.api.urls.places;
    this.tags = config.api.places.tags;
    this.defaultLimit = config.api.places.defaultLimit;
    this.maxLimit = config.api.places.maxLimit;
    this.defaultRadius = config.api.places.defaultRadius;
    this.maxRadius = config.api.places.maxRadius;
  }

  async search({ longitude, latitude, radius = this.defaultRadius, limit = this.defaultLimit }) {
    // Validate and clamp values
    const validatedRadius = Math.min(Math.max(0, radius), this.maxRadius);
    const validatedLimit = Math.min(Math.max(1, limit), this.maxLimit);

    try {
      const response = await axios.get(this.url, {
        params: {
          categories: this.tags,
          filter: `circle:${longitude},${latitude},${validatedRadius}`,
          bias: `proximity:${longitude},${latitude}`,
          limit: validatedLimit,
          apiKey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || 'Places service error';
      return new Error(message, { cause: { status } });
    }
    return error;
  }
}

// Make sure to export an instance of the service
module.exports = new PlacesService();