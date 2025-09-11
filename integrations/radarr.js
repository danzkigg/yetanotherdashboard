const BaseIntegration = require('./base');

class RadarrIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Movie management';
    this.requiredConfig = ['url', 'key'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const headers = this.getAuthHeaders(widgetConfig.key);
    
    try {
      // Fetch movies, missing movies, queue status, and calendar
      const [movies, missing, queueStatus, calendar] = await Promise.allSettled([
        this.makeRequest(`${widgetConfig.url}/api/v3/movie`, { headers }),
        this.makeRequest(`${widgetConfig.url}/api/v3/wanted/missing`, { headers }),
        this.makeRequest(`${widgetConfig.url}/api/v3/queue/status`, { headers }),
        this.makeRequest(`${widgetConfig.url}/api/v3/calendar`, { headers })
      ]);

      // Check if critical requests failed
      if (movies.status === 'rejected') {
        throw new Error(`Failed to fetch movie data: ${movies.reason.message}`);
      }

      if (missing.status === 'rejected') {
        throw new Error(`Failed to fetch missing movies: ${missing.reason.message}`);
      }

      // Validate responses
      if (!Array.isArray(movies.value)) {
        throw new Error('Invalid response from Radarr API - expected array of movies');
      }

      if (!missing.value || !Array.isArray(missing.value.records)) {
        throw new Error('Invalid missing movies response from Radarr API');
      }

      // Calculate totals
      const total = movies.value.length;
      const wanted = missing.value.records.length;

      // Get queue count (fallback to 0 if failed)
      const queue = queueStatus.status === 'fulfilled' 
        ? (queueStatus.value.totalCount || 0) 
        : 0;

      // Get upcoming movies (next 10)
      const upcoming = calendar.status === 'fulfilled' 
        ? (calendar.value || []).slice(0, 10) 
        : [];

      return {
        total,
        wanted,
        queue,
        upcoming,
        status: 'online'
      };

    } catch (error) {
      // Re-throw with more specific error messages for Radarr
      if (error.message.includes('Authentication failed')) {
        throw new Error('Radarr authentication failed - check your API key');
      } else if (error.message.includes('API endpoint not found')) {
        throw new Error('Radarr API not found - check your URL (should end without /api)');
      } else if (error.message.includes('Connection refused')) {
        throw new Error('Cannot connect to Radarr - check if service is running');
      } else {
        throw error;
      }
    }
  }
}

module.exports = new RadarrIntegration();