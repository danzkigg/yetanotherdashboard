// integrations/base.js
class BaseIntegration {
  constructor() {
    this.name = this.constructor.name.toLowerCase().replace('integration', '');
    this.version = '1.0.0';
    this.description = 'Base integration class';
    this.requiredConfig = [];
  }

  async fetchData(widgetConfig, serviceData) {
    throw new Error('fetchData method must be implemented');
  }

  async makeRequest(url, options = {}) {
    const axios = require('axios');
    const https = require('https');
    
    const defaultOptions = {
      timeout: 5000,
      validateStatus: () => true,
      // Allow self-signed certificates
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      ...options
    };
    
    try {
      const response = await axios(url, defaultOptions);
      
      // HTTP error status codes
      if (response.status === 401) {
        throw new Error('Authentication failed - check your API key');
      } else if (response.status === 403) {
        throw new Error('Access forbidden - check your API key permissions');
      } else if (response.status === 404) {
        throw new Error('API endpoint not found - check your URL');
      } else if (response.status >= 500) {
        throw new Error(`Server error (${response.status}) - service may be down`);
      } else if (response.status >= 400) {
        throw new Error(`Client error (${response.status}) - check your configuration`);
      }
      
      return response.data;
    } catch (error) {
      // Network errors
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused - check if service is running and URL is correct');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Host not found - check your URL');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out - service may be slow or down');
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        throw new Error('SSL certificate error - certificate may be self-signed or expired');
      } else if (error.message && !error.message.includes('Authentication') && !error.message.includes('Server error')) {
        throw new Error(`Network error: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  validateConfig(config, required = this.requiredConfig) {
    const missing = required.filter(field => !config[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required config fields: ${missing.join(', ')}`);
    }
  }

  getAuthHeaders(apiKey, headerName = 'X-Api-Key') {
    return { [headerName]: apiKey };
  }
}

module.exports = BaseIntegration;