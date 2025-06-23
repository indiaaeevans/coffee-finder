const axios = require('axios');
const config = require('../config');

class AutocompleteService {
  constructor() {
    this.apiKey = config.api.key;
    this.urls = config.api.urls;
  }
  
  async autocomplete(latitude, longitude, query) {
    try {
      const response = await axios.get(this.urls.autocomplete, {
        params: {
          text: query,
          lang: 'en',
          filter: 'countrycode:us',
          bias: `proximity:${longitude},${latitude}|countrycode:us`,
          format: 'json',
          limit: 5,
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
      const message = error.response.data.error || 'Autocomplete service error';
      return new Error(message, { cause: { status } });
    }
    return error;
  }
}

module.exports = new AutocompleteService();