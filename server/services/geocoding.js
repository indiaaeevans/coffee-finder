const axios = require('axios');
const config = require('../config');

class GeocodingService {
  constructor() {
    this.apiKey = config.api.key;
    this.urls = config.api.urls;
  }

  async reverse(latitude, longitude) {
    try {
      const response = await axios.get(this.urls.reverseGeocode, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          apiKey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async forward(address) {
    try {
      const response = await axios.get(this.urls.forwardGeocode, {
        params: {
          text: address,
          filter: 'countrycode:us',
          bias: 'countrycode:us',
          format: 'json',
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
      const message = error.response.data.error || 'Geocoding service error';
      return new Error(message, { cause: { status } });
    }
    return error;
  }
}

module.exports = new GeocodingService();