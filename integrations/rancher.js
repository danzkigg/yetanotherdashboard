const BaseIntegration = require('./base');

class RancherIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Rancher cluster management';
    this.requiredConfig = ['url', 'token'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const { url, token, clusterId } = widgetConfig;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      const clustersResponse = await this.makeRequest(`${url}/v3/clusters`, { headers });
      
      if (!clustersResponse.data || clustersResponse.data.length === 0) {
        throw new Error('No clusters found in Rancher');
      }

      // Find target cluster
      let targetCluster = null;
      if (clusterId) {
        targetCluster = clustersResponse.data.find(c => c.id === clusterId || c.name === clusterId);
        if (!targetCluster) {
          throw new Error(`Cluster '${clusterId}' not found. Available: ${clustersResponse.data.map(c => c.name || c.id).join(', ')}`);
        }
      } else {
        targetCluster = clustersResponse.data[0]; // Use first cluster
      }

      const clusterName = targetCluster.name || targetCluster.id;
      const targetClusterId = targetCluster.id;

      // Determine cluster health from state and conditions
      let clusterHealth = 'unknown';
      const clusterState = targetCluster.state;
      
      if (clusterState === 'active') {
        clusterHealth = 'healthy';
      } else if (clusterState === 'provisioning' || clusterState === 'updating') {
        clusterHealth = 'updating';
      } else if (clusterState === 'error' || clusterState === 'failed') {
        clusterHealth = 'unhealthy';
      } else {
        clusterHealth = clusterState || 'unknown';
      }

      // Additional health check from conditions
      if (targetCluster.conditions) {
        const readyCondition = targetCluster.conditions.find(c => c.type === 'Ready');
        if (readyCondition) {
          if (readyCondition.status === 'True') {
            clusterHealth = clusterHealth === 'unknown' ? 'healthy' : clusterHealth;
          } else if (readyCondition.status === 'False') {
            clusterHealth = 'unhealthy';
          }
        }
      }

      // Fetch nodes using the cluster-specific endpoint
      let activeNodes = 0;
      let totalNodes = 0;

      try {
        const nodesResponse = await this.makeRequest(`${url}/v3/nodes?clusterId=${targetClusterId}`, { headers });
        
        if (nodesResponse.data) {
          totalNodes = nodesResponse.data.length;
          
          nodesResponse.data.forEach(node => {
            // Check node conditions for readiness
            if (node.conditions) {
              const readyCondition = node.conditions.find(c => c.type === 'Ready');
              if (readyCondition && readyCondition.status === 'True') {
                activeNodes++;
              }
            } else if (node.state === 'active') {
              // Fallback to state if no conditions
              activeNodes++;
            }
          });
        }
      } catch (nodeError) {
        console.log('Failed to fetch nodes:', nodeError.message);
        // Try alternative endpoint
        try {
          const altNodesResponse = await this.makeRequest(`${url}/v3/clusters/${targetClusterId}/nodes`, { headers });
          if (altNodesResponse.data) {
            totalNodes = altNodesResponse.data.length;
            activeNodes = altNodesResponse.data.filter(n => n.state === 'active').length;
          }
        } catch (altError) {
          console.log('Alternative nodes endpoint also failed:', altError.message);
        }
      }

      // Fetch workloads (deployments, daemonsets, etc.)
      let runningDeployments = 0;

      try {
        // Get all projects in the cluster first
        const projectsResponse = await this.makeRequest(`${url}/v3/projects?clusterId=${targetClusterId}`, { headers });
        
        if (projectsResponse.data && projectsResponse.data.length > 0) {
          // For each project, get workloads
          for (const project of projectsResponse.data) {
            try {
              const workloadsResponse = await this.makeRequest(`${url}/v3/projects/${project.id}/workloads`, { headers });
              if (workloadsResponse.data) {
                // Count active workloads
                const activeWorkloads = workloadsResponse.data.filter(w => 
                  w.state === 'active' || w.state === 'running'
                );
                runningDeployments += activeWorkloads.length;
              }
            } catch (workloadError) {
              console.log(`Failed to fetch workloads for project ${project.id}:`, workloadError.message);
            }
          }
        }
      } catch (projectError) {
        console.log('Failed to fetch projects:', projectError.message);
        
        // Try direct workloads endpoint as fallback
        try {
          const directWorkloads = await this.makeRequest(`${url}/v3/clusters/${targetClusterId}/workloads`, { headers });
          if (directWorkloads.data) {
            runningDeployments = directWorkloads.data.filter(w => w.state === 'active').length;
          }
        } catch (directError) {
          console.log('Direct workloads endpoint also failed:', directError.message);
        }
      }

      const result = {
        clusterHealth,
        clusterName,
        activeNodes,
        inactiveNodes: totalNodes - activeNodes,
        totalNodes,
        runningDeployments,
        totalPods: 0,
        status: 'online'
      };

      console.log('Rancher integration result:', result);
      return result;

    } catch (error) {
      console.error('Rancher integration error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Rancher authentication failed - check your Bearer token');
      } else if (error.response?.status === 403) {
        throw new Error('Rancher access denied - check token permissions');
      } else if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to Rancher - check URL and network connectivity');
      } else if (error.message.includes('timeout')) {
        throw new Error('Rancher request timed out');
      } else if (error.response?.status === 404) {
        throw new Error('Rancher API endpoint not found - verify Rancher URL');
      } else {
        throw new Error(`Rancher API error: ${error.message}`);
      }
    }
  }
}

module.exports = new RancherIntegration();