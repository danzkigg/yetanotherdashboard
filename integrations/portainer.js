const BaseIntegration = require('./base');

class PortainerIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Portainer container management';
    this.requiredConfig = ['url', 'token'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    // Clean up the URL to remove trailing slashes
    const cleanUrl = widgetConfig.url.replace(/\/+$/, '');
    const { token, endpointId = 1 } = widgetConfig;
    const headers = {
      'X-API-Key': token,
      'Content-Type': 'application/json'
    };

    try {
      // Fetch containers, stacks, and endpoint info in parallel
      const [containersResponse, stacksResponse, endpointResponse] = await Promise.allSettled([
        this.makeRequest(`${cleanUrl}/api/endpoints/${endpointId}/docker/containers/json?all=true`, { headers }),
        this.makeRequest(`${cleanUrl}/api/stacks`, { headers }),
        this.makeRequest(`${cleanUrl}/api/endpoints/${endpointId}`, { headers })
      ]);

      // Check if critical requests failed
      if (containersResponse.status === 'rejected') {
        throw new Error(`Failed to fetch containers: ${containersResponse.reason.message}`);
      }

      if (!Array.isArray(containersResponse.value)) {
        throw new Error('Invalid response from Portainer API - expected array of containers');
      }

      const containers = containersResponse.value;
      const stacks = stacksResponse.status === 'fulfilled' ? (stacksResponse.value || []) : [];
      const endpoint = endpointResponse.status === 'fulfilled' ? endpointResponse.value : null;

      // Process container statistics
      const containerStats = this.processContainers(containers);
      const stackStats = this.processStacks(stacks);

      return {
        containers: containerStats,
        stacks: stackStats,
        endpoint: {
          id: endpoint?.Id || endpointId,
          name: endpoint?.Name || 'Unknown',
          status: endpoint?.Status || 1,
          type: endpoint?.Type || 1
        },
        status: 'online'
      };

    } catch (error) {
      // Re-throw with more specific error messages for Portainer
      if (error.message.includes('Authentication failed') || error.message.includes('401')) {
        throw new Error('Portainer authentication failed - check your API token');
      } else if (error.message.includes('API endpoint not found') || error.message.includes('404')) {
        throw new Error(`Portainer API endpoint not found - check your URL (${cleanUrl}) and endpoint ID (${endpointId})`);
      } else if (error.message.includes('Connection refused')) {
        throw new Error(`Cannot connect to Portainer at ${cleanUrl} - check if service is running`);
      } else if (error.message.includes('Access forbidden') || error.message.includes('403')) {
        throw new Error('Portainer access forbidden - check API token permissions');
      } else if (error.message.includes('ENOTFOUND')) {
        throw new Error(`Cannot resolve hostname - check your URL: ${cleanUrl}`);
      } else {
        throw error;
      }
    }
  }

  processContainers(containers) {
    const stats = {
      total: containers.length,
      running: 0,
      stopped: 0,
      paused: 0,
      restarting: 0,
      created: 0,
      dead: 0,
      removing: 0,
      exited: 0
    };

    const recentContainers = [];

    containers.forEach(container => {
      const state = container.State;
      
      // Count by state
      if (state === 'running') {
        stats.running++;
      } else if (state === 'exited') {
        stats.stopped++;
        stats.exited++;
      } else if (state === 'paused') {
        stats.paused++;
      } else if (state === 'restarting') {
        stats.restarting++;
      } else if (state === 'created') {
        stats.created++;
      } else if (state === 'dead') {
        stats.dead++;
      } else if (state === 'removing') {
        stats.removing++;
      } else {
        // Handle any other states as stopped
        stats.stopped++;
      }

      // Get recent containers (last 5 created/updated)
      if (recentContainers.length < 5) {
        const names = container.Names ? container.Names.map(name => name.replace(/^\//, '')).join(', ') : 'unnamed';
        const image = container.Image || 'unknown';
        const created = new Date(container.Created * 1000);
        
        recentContainers.push({
          id: container.Id?.substring(0, 12) || 'unknown',
          name: names,
          image: image.split(':')[0],
          state: state,
          status: container.Status || 'unknown',
          created: created.toISOString(),
          ports: this.formatPorts(container.Ports || [])
        });
      }
    });

    // Sort recent containers by creation date (newest first)
    recentContainers.sort((a, b) => new Date(b.created) - new Date(a.created));

    return {
      ...stats,
      recent: recentContainers.slice(0, 5)
    };
  }

  processStacks(stacks) {
    if (!Array.isArray(stacks)) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        recent: []
      };
    }

    const stats = {
      total: stacks.length,
      active: 0,
      inactive: 0
    };

    const recentStacks = stacks.map(stack => {
      const status = stack.Status;
      
      // Count by status
      if (status === 1 || status === 'active') {
        stats.active++;
      } else {
        stats.inactive++;
      }

      return {
        id: stack.Id,
        name: stack.Name,
        status: status === 1 ? 'active' : 'inactive',
        type: stack.Type === 1 ? 'swarm' : 'compose',
        env: stack.Env?.find(env => env.name === 'ENVIRONMENT')?.value || 'unknown',
        created: stack.CreationDate ? new Date(stack.CreationDate).toISOString() : null,
        updated: stack.UpdateDate ? new Date(stack.UpdateDate).toISOString() : null
      };
    });

    // Sort by creation/update date (newest first)
    recentStacks.sort((a, b) => {
      const dateA = new Date(a.updated || a.created || 0);
      const dateB = new Date(b.updated || b.created || 0);
      return dateB - dateA;
    });

    return {
      ...stats,
      recent: recentStacks.slice(0, 5)
    };
  }

  formatPorts(ports) {
    if (!Array.isArray(ports) || ports.length === 0) {
      return [];
    }

    return ports
      .filter(port => port.PublicPort)
      .map(port => {
        const protocol = port.Type || 'tcp';
        const publicPort = port.PublicPort;
        const privatePort = port.PrivatePort;
        const ip = port.IP || '0.0.0.0';
        
        if (ip === '0.0.0.0') {
          return `${publicPort}:${privatePort}/${protocol}`;
        } else {
          return `${ip}:${publicPort}:${privatePort}/${protocol}`;
        }
      })
      .slice(0, 3);
  }
}

module.exports = new PortainerIntegration();