const BaseIntegration = require('./base');

class PulseIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Pulse Proxmox monitoring dashboard';
    this.requiredConfig = ['url'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const cleanUrl = widgetConfig.url.replace(/\/+$/, '');
    const { apiToken, username, password, skipTLSVerify = false } = widgetConfig;
    
    const headers = {
      'Content-Type': 'application/json'
    };

    // Prioritize username/password authentication, fallback to API token
    if (username && password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    } else if (apiToken) {
      headers['X-API-Token'] = apiToken;
    }

    const requestOptions = {
      headers,
      ...(skipTLSVerify && {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      })
    };

    try {
      // Use the diagnostics endpoint which contains the cluster information
      const diagnosticsData = await this.makeRequest(`${cleanUrl}/api/diagnostics`, requestOptions);
      
      if (!diagnosticsData || !diagnosticsData.nodes) {
        throw new Error('Invalid response from Pulse diagnostics API');
      }

      // Extract data from diagnostics response
      const nodeStats = this.processNodes(diagnosticsData.nodes);
      const vmStats = this.processVMs(diagnosticsData.nodes);
      const lxcStats = this.processLXC(diagnosticsData.nodes);

      // Process detailed diagnostics information for the widget
      const diagnosticsInfo = {
        version: diagnosticsData.version,
        uptime: diagnosticsData.uptime,
        system: diagnosticsData.system,
        errors: diagnosticsData.errors || [],
        connections: diagnosticsData.nodes.map(node => ({
          name: node.name || node.id,
          connected: node.connected,
          host: node.host,
          authMethod: node.authMethod,
          nodeCount: node.details?.node_count || node.clusterInfo?.nodes,
          vmsFound: node.vmDiskCheck?.vmsFound,
          vmsWithAgent: node.vmDiskCheck?.vmsWithAgent,
          version: node.details?.version,
          problematicVMs: node.vmDiskCheck?.problematicVMs?.map(vm => ({
            name: vm.name,
            issue: vm.issue
          })) || []
        }))
      };

      return {
        nodes: nodeStats,
        vms: vmStats,
        lxc: lxcStats,
        diagnostics: diagnosticsInfo,
        status: 'online'
      };

    } catch (error) {
      console.error('Pulse integration error:', error.message);
      
      // Return safe default data instead of throwing
      return {
        nodes: { total: 0, active: 0, inactive: 0 },
        vms: { total: 0, running: 0, stopped: 0 },
        lxc: { total: 0, running: 0, stopped: 0 },
        error: error.message,
        status: 'error'
      };
    }
  }

  processNodes(diagnosticsNodes) {
    if (!Array.isArray(diagnosticsNodes)) return { total: 0, active: 0, inactive: 0 };

    let totalNodes = 0;
    let activeNodes = 0;
    let inactiveNodes = 0;

    diagnosticsNodes.forEach(connection => {
      // Get node count from cluster details
      let nodeCount = 0;
      
      if (connection.details && connection.details.node_count) {
        nodeCount = connection.details.node_count;
      } else if (connection.clusterInfo && connection.clusterInfo.nodes) {
        nodeCount = connection.clusterInfo.nodes;
      } else {
        nodeCount = 1; // Fallback for single node
      }

      totalNodes += nodeCount;

      // If this Proxmox connection is active, consider all its nodes active
      if (connection.connected === true) {
        activeNodes += nodeCount;
      } else {
        inactiveNodes += nodeCount;
      }
    });

    return {
      total: totalNodes,
      active: activeNodes,
      inactive: inactiveNodes
    };
  }

  processVMs(diagnosticsNodes) {
    if (!Array.isArray(diagnosticsNodes)) return { total: 0, running: 0, stopped: 0 };

    let totalVMs = 0;

    diagnosticsNodes.forEach(connection => {
      // Extract VM count from vmDiskCheck data
      if (connection.vmDiskCheck && connection.vmDiskCheck.vmsFound) {
        totalVMs += connection.vmDiskCheck.vmsFound;
      }
    });

    // Diagnostics doesn't provide running/stopped breakdown, 
    // so we assume all are running if the connection is active
    return {
      total: totalVMs,
      running: totalVMs, 
      stopped: 0
    };
  }

  processLXC(diagnosticsNodes) {
    if (!Array.isArray(diagnosticsNodes)) return { total: 0, running: 0, stopped: 0 };

    // Pulse diagnostics doesn't currently track LXC containers separately
    // This could be extended in the future if Pulse adds LXC diagnostics
    return {
      total: 0,
      running: 0,
      stopped: 0
    };
  }
}

module.exports = new PulseIntegration();