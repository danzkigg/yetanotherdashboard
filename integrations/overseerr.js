const BaseIntegration = require('./base');

class OverseerrIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Overseerr request management for Plex';
    this.requiredConfig = ['url', 'key'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const headers = this.getAuthHeaders(widgetConfig.key);
    
    try {
      // Fetch request counts, recent requests, and status
      const [requestCounts, requests, status] = await Promise.allSettled([
        this.makeRequest(`${widgetConfig.url}/api/v1/request/count`, { headers }),
        this.makeRequest(`${widgetConfig.url}/api/v1/request?take=10&skip=0&sort=added`, { headers }),
        this.makeRequest(`${widgetConfig.url}/api/v1/status`, { headers })
      ]);

      // Check if critical requests failed
      if (requestCounts.status === 'rejected') {
        throw new Error(`Failed to fetch Overseerr request counts: ${requestCounts.reason.message}`);
      }

      if (requests.status === 'rejected') {
        throw new Error(`Failed to fetch requests: ${requests.reason.message}`);
      }

      // Validate responses
      if (!requestCounts.value || typeof requestCounts.value !== 'object') {
        throw new Error('Invalid response from Overseerr request count API');
      }

      if (!requests.value || !Array.isArray(requests.value.results)) {
        throw new Error('Invalid requests response from Overseerr API');
      }

      const countsData = requestCounts.value;
      const statusData = status.status === 'fulfilled' ? status.value : {};

      // Get request statistics from count endpoint
      const pendingRequests = countsData.pending || 0;
      const approvedRequests = countsData.approved || 0;
      const availableRequests = countsData.available || 0;
      const processingRequests = countsData.processing || 0;
      const totalRequests = pendingRequests + approvedRequests + availableRequests + processingRequests;

      return {
        totalRequests,
        pendingRequests,
        approvedRequests,
        availableRequests,
        processingRequests,
        stats: {
          version: statusData.version || 'Unknown',
          uptime: statusData.uptime || 0
        },
        status: 'online'
      };

    } catch (error) {
      if (error.message.includes('Authentication failed')) {
        throw new Error('Overseerr authentication failed - check your API key');
      } else if (error.message.includes('API endpoint not found')) {
        throw new Error('Overseerr API not found - check your URL (should end without /api)');
      } else if (error.message.includes('Connection refused')) {
        throw new Error('Cannot connect to Overseerr - check if service is running');
      } else {
        throw error;
      }
    }
  }
}

module.exports = new OverseerrIntegration();