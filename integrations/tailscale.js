const BaseIntegration = require('./base');

class TailscaleIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Tailscale network monitoring';
    this.requiredConfig = ['apiKey', 'tailnet'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const { apiKey, tailnet } = widgetConfig;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    try {
      // Fetch devices from Tailscale API
      const devicesResponse = await this.makeRequest(
        `https://api.tailscale.com/api/v2/tailnet/${tailnet}/devices`, 
        { headers }
      );

      // Validate response
      if (!devicesResponse?.devices || !Array.isArray(devicesResponse.devices)) {
        throw new Error('Invalid response from Tailscale API - expected devices array');
      }

      const devices = devicesResponse.devices;
      const deviceStats = this.processDevices(devices);

      return {
        devices: deviceStats,
        status: 'online'
      };

    } catch (error) {
      // Re-throw with more specific error messages for Tailscale
      if (error.message.includes('Authentication failed') || error.message.includes('401')) {
        throw new Error('Tailscale authentication failed - check your API key');
      } else if (error.message.includes('API endpoint not found') || error.message.includes('404')) {
        throw new Error('Tailscale API endpoint not found - check your tailnet name');
      } else if (error.message.includes('Connection refused')) {
        throw new Error('Cannot connect to Tailscale API - check internet connection');
      } else if (error.message.includes('Access forbidden') || error.message.includes('403')) {
        throw new Error('Tailscale access forbidden - check API key permissions');
      } else if (error.message.includes('ENOTFOUND')) {
        throw new Error('Cannot resolve Tailscale API hostname - check internet connection');
      } else {
        throw error;
      }
    }
  }

  processDevices(devices) {
    const stats = {
      total: devices.length,
      online: 0,
      offline: 0,
      recentActivity: []
    };

    const now = new Date();
    const onlineThreshold = 5 * 60 * 1000; // 5 minutes

    devices.forEach(device => {
      const lastSeen = new Date(device.lastSeen);
      const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
      
      // Consider device online if seen within last 5 minutes
      if (timeSinceLastSeen <= onlineThreshold) {
        stats.online++;
      } else {
        stats.offline++;
      }

      // Collect recent activity (devices seen within last 24 hours)
      const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours
      if (timeSinceLastSeen <= recentThreshold) {
        stats.recentActivity.push({
          name: device.name || device.hostname,
          user: device.user,
          lastSeen: device.lastSeen,
          online: timeSinceLastSeen <= onlineThreshold,
          addresses: device.addresses || [],
          os: device.os
        });
      }
    });

    // Sort recent activity by last seen (most recent first)
    stats.recentActivity.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    
    // Keep only top 5 most recent
    stats.recentActivity = stats.recentActivity.slice(0, 5);

    return stats;
  }
}

module.exports = new TailscaleIntegration();