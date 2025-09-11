const BaseIntegration = require('./base');

class QbittorrentIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'qBittorrent torrent client';
    this.requiredConfig = ['url', 'username', 'password'];
    this.version = '1.0.0';
    this.sessionCookie = null;
  }

  async authenticate(url, username, password) {
    const axios = require('axios');
    
    try {
      // Login to get session cookie
      const loginResponse = await axios.post(`${url}/api/v2/auth/login`, 
        `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000,
          withCredentials: true
        }
      );

      // Extract session cookie from response
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies) {
        this.sessionCookie = cookies.find(cookie => cookie.includes('SID='));
        if (this.sessionCookie) {
          // Extract just the SID part
          this.sessionCookie = this.sessionCookie.split(';')[0];
          return true;
        }
      }

      // Check if login was successful
      if (loginResponse.data === 'Ok.') {
        return true;
      }

      throw new Error('Authentication failed - invalid credentials');
    } catch (error) {
      this.sessionCookie = null;
      if (error.response?.status === 403) {
        throw new Error('Authentication failed - invalid username or password');
      }
      throw error;
    }
  }

  async makeAuthenticatedRequest(url, endpoint) {
    const axios = require('axios');
    
    const headers = {};
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    try {
      const response = await axios.get(`${url}${endpoint}`, {
        headers,
        timeout: 5000,
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        // Session expired, need to re-authenticate
        this.sessionCookie = null;
        throw new Error('Session expired - authentication required');
      }
      throw error;
    }
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const { url, username, password } = widgetConfig;

    try {
      // Authenticate if we don't have a valid session
      if (!this.sessionCookie) {
        await this.authenticate(url, username, password);
      }

      // Fetch transfer info (speeds, connection status)
      let transferInfo;
      try {
        transferInfo = await this.makeAuthenticatedRequest(url, '/api/v2/transfer/info');
      } catch (error) {
        if (error.message.includes('Session expired')) {
          // Re-authenticate and try again
          await this.authenticate(url, username, password);
          transferInfo = await this.makeAuthenticatedRequest(url, '/api/v2/transfer/info');
        } else {
          throw error;
        }
      }

      // Fetch torrent list to count seeding/downloading
      let torrents;
      try {
        torrents = await this.makeAuthenticatedRequest(url, '/api/v2/torrents/info');
      } catch (error) {
        if (error.message.includes('Session expired')) {
          await this.authenticate(url, username, password);
          torrents = await this.makeAuthenticatedRequest(url, '/api/v2/torrents/info');
        } else {
          throw error;
        }
      }

      // Process the data
      const downloadSpeed = transferInfo.dl_info_speed || 0; // bytes per second
      const uploadSpeed = transferInfo.up_info_speed || 0; // bytes per second
      
      // Count torrents by state
      const seedingTorrents = torrents.filter(torrent => 
        torrent.state === 'uploading' || 
        torrent.state === 'stalledUP' || 
        torrent.state === 'queuedUP'
      ).length;
      
      const downloadingTorrents = torrents.filter(torrent => 
        torrent.state === 'downloading' || 
        torrent.state === 'stalledDL' || 
        torrent.state === 'queuedDL' ||
        torrent.state === 'metaDL'
      ).length;

      // Convert bytes/sec to MB/s (1 MB = 1,000,000 bytes for display)
      const downloadSpeedMBps = (downloadSpeed / 1000000).toFixed(1);
      const uploadSpeedMBps = (uploadSpeed / 1000000).toFixed(1);

      return {
        downloadSpeed: downloadSpeedMBps,
        uploadSpeed: uploadSpeedMBps,
        seedingCount: seedingTorrents,
        downloadingCount: downloadingTorrents,
        totalTorrents: torrents.length,
        connectionStatus: transferInfo.connection_status,
        status: 'online'
      };

    } catch (error) {
      console.error('qBittorrent integration error:', error);
      
      if (error.message.includes('Authentication failed')) {
        throw new Error('qBittorrent authentication failed - check username and password');
      } else if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to qBittorrent - check if service is running');
      } else if (error.message.includes('timeout')) {
        throw new Error('qBittorrent request timed out - service may be slow');
      } else {
        throw new Error(`qBittorrent error: ${error.message}`);
      }
    }
  }
}

module.exports = new QbittorrentIntegration();