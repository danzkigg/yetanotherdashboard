const BaseIntegration = require('./base');

class SonarrIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Sonarr TV series management';
    this.requiredConfig = ['url', 'key'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const headers = this.getAuthHeaders(widgetConfig.key);
    
    try {
      // Fetch series data, queue status, and calendar
      const [series, queueStatus, calendar] = await Promise.allSettled([
        this.makeRequest(`${widgetConfig.url}/api/v3/series`, { headers }),
        this.makeRequest(`${widgetConfig.url}/api/v3/queue/status`, { headers }),
        this.makeRequest(`${widgetConfig.url}/api/v3/calendar`, { headers })
      ]);

      // Check if any critical requests failed
      if (series.status === 'rejected') {
        throw new Error(`Failed to fetch series data: ${series.reason.message}`);
      }

      if (queueStatus.status === 'rejected') {
        // Queue status is less critical, log but don't fail
        console.warn('Sonarr queue status failed:', queueStatus.reason.message);
      }

      // Validate series response
      if (!Array.isArray(series.value)) {
        throw new Error('Invalid response from Sonarr API - expected array of series');
      }

      // Calculate totals and wanted episodes
      const total = series.value.length;
      
      // Calculate wanted (missing) episodes
      const wanted = series.value.reduce((acc, show) => {
        if (!show.monitored) return acc;
        
        const stats = show.statistics || {};
        const episodeCount = stats.episodeCount || 0;
        const episodeFileCount = stats.episodeFileCount || 0;
        const missing = episodeCount - episodeFileCount;
        
        return acc + Math.max(0, missing);
      }, 0);

      // Get queue count (fallback to 0 if failed)
      const queue = queueStatus.status === 'fulfilled' 
        ? (queueStatus.value.totalCount || 0) 
        : 0;

      // Get upcoming episodes (next 10)
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
      // Re-throw with more specific error messages for Sonarr
      if (error.message.includes('Authentication failed')) {
        throw new Error('Sonarr authentication failed - check your API key');
      } else if (error.message.includes('API endpoint not found')) {
        throw new Error('Sonarr API not found - check your URL (should end without /api)');
      } else if (error.message.includes('Connection refused')) {
        throw new Error('Cannot connect to Sonarr - check if service is running');
      } else {
        throw error;
      }
    }
  }
}

module.exports = new SonarrIntegration();