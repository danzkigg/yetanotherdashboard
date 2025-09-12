const BaseIntegration = require('./base');

class ProxmoxIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Proxmox VE cluster management';
    this.requiredConfig = ['url', 'token'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    // Clean up the URL to remove trailing slashes
    const cleanUrl = widgetConfig.url.replace(/\/+$/, '');
    const { token, skipTLSVerify = false } = widgetConfig;
    
    const headers = {
      'Authorization': `PVEAPIToken=${token}`,
      'Content-Type': 'application/json'
    };

    const requestOptions = {
      headers,
      ...(skipTLSVerify && {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      })
    };

    try {
      // Fetch cluster status and resources in parallel
      const [clusterResponse, resourcesResponse] = await Promise.allSettled([
        this.makeRequest(`${cleanUrl}/api2/json/cluster/status`, requestOptions),
        this.makeRequest(`${cleanUrl}/api2/json/cluster/resources`, requestOptions)
      ]);

      // Check if critical requests failed
      if (clusterResponse.status === 'rejected') {
        throw new Error(`Failed to fetch cluster status: ${clusterResponse.reason.message}`);
      }

      if (resourcesResponse.status === 'rejected') {
        throw new Error(`Failed to fetch cluster resources: ${resourcesResponse.reason.message}`);
      }

      // Validate responses
      if (!clusterResponse.value?.data || !Array.isArray(clusterResponse.value.data)) {
        throw new Error('Invalid cluster status response from Proxmox API');
      }

      if (!resourcesResponse.value?.data || !Array.isArray(resourcesResponse.value.data)) {
        throw new Error('Invalid resources response from Proxmox API');
      }

      const clusterData = clusterResponse.value.data;
      const resourcesData = resourcesResponse.value.data;

      // Process the data
      const nodeStats = this.processNodes(clusterData);
      const vmStats = this.processVMs(resourcesData);
      const lxcStats = this.processLXC(resourcesData);

      return {
        nodes: nodeStats,
        vms: vmStats,
        lxc: lxcStats,
        status: 'online'
      };

    } catch (error) {
      // Re-throw with more specific error messages for Proxmox
      if (error.message.includes('Authentication failed') || error.message.includes('401')) {
        throw new Error('Proxmox authentication failed - check your API token');
      } else if (error.message.includes('API endpoint not found') || error.message.includes('404')) {
        throw new Error(`Proxmox API not found - check your URL: ${cleanUrl}`);
      } else if (error.message.includes('Connection refused')) {
        throw new Error(`Cannot connect to Proxmox at ${cleanUrl} - check if service is running`);
      } else if (error.message.includes('Access forbidden') || error.message.includes('403')) {
        throw new Error('Proxmox access forbidden - check API token permissions');
      } else if (error.message.includes('ENOTFOUND')) {
        throw new Error(`Cannot resolve hostname - check your URL: ${cleanUrl}`);
      } else if (error.message.includes('CERT_HAS_EXPIRED') || error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
        throw new Error('SSL certificate error - try setting skipTLSVerify: true in config');
      } else {
        throw error;
      }
    }
  }

  processNodes(clusterData) {
    const nodes = clusterData.filter(item => item.type === 'node');
    
    const stats = {
      total: nodes.length,
      active: 0,
      inactive: 0
    };

    nodes.forEach(node => {
      if (node.online === 1) {
        stats.active++;
      } else {
        stats.inactive++;
      }
    });

    return stats;
  }

  processVMs(resourcesData) {
    const vms = resourcesData.filter(item => item.type === 'qemu');
    
    const stats = {
      total: vms.length,
      running: 0,
      stopped: 0
    };

    vms.forEach(vm => {
      if (vm.status === 'running') {
        stats.running++;
      } else {
        stats.stopped++;
      }
    });

    return stats;
  }

  processLXC(resourcesData) {
    const containers = resourcesData.filter(item => item.type === 'lxc');
    
    const stats = {
      total: containers.length,
      running: 0,
      stopped: 0
    };

    containers.forEach(container => {
      if (container.status === 'running') {
        stats.running++;
      } else {
        stats.stopped++;
      }
    });

    return stats;
  }
}

module.exports = new ProxmoxIntegration();