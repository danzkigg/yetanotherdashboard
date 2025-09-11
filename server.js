const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration and integration management
let configData = null;
const CONFIG_PATH = path.join(__dirname, 'config.yml');
const integrations = new Map();

function findServiceInConfig(serviceName, configData) {
  if (!configData || !configData.services) return null;

  for (const groupName in configData.services) {
    const servicesInGroup = configData.services[groupName] || [];
    const service = servicesInGroup.find(s => serviceName in s);
    if (service) {
      return service;
    }
  }
  
  return null;
}

// Dynamic integration loader
async function loadIntegrations() {
  const integrationsDir = path.join(__dirname, 'integrations');
  
  try {
    const files = await fs.readdir(integrationsDir);
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const integrationName = file.replace('.js', '');
        const integrationPath = path.join(integrationsDir, file);
        
        // Clear require cache for hot reloading
        delete require.cache[require.resolve(integrationPath)];
        
        try {
          const integration = require(integrationPath);
          integrations.set(integrationName, integration);
          console.log(`✓ Loaded integration: ${integrationName}`);
        } catch (error) {
          console.error(`✗ Failed to load integration ${integrationName}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Failed to load integrations:', error);
  }
}

// Configuration management
async function loadConfig() {
  try {
    const fileContents = await fs.readFile(CONFIG_PATH, 'utf8');
    configData = yaml.load(fileContents);
    console.log('Config loaded successfully');
  } catch (error) {
    console.error('Failed to load config:', error);
    configData = { services: [], bookmarks: [], layout: [] };
  }
}

// File watchers
function setupWatchers() {
  // Config watcher
  chokidar.watch(CONFIG_PATH).on('change', () => {
    console.log('Config file changed, reloading...');
    loadConfig();
  });

  // Integrations watcher (for hot reloading during development)
  chokidar.watch(path.join(__dirname, 'integrations')).on('change', () => {
    console.log('Integration files changed, reloading...');
    loadIntegrations();
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/config', (req, res) => {
  res.json(configData || {});
});

app.get('/api/service/:name/status', async (req, res) => {
  const { name } = req.params;
  
  if (!configData || !configData.services) {
    return res.json({ status: 'unknown' });
  }

  const service = findServiceInConfig(name, configData);
  if (!service) {
    return res.json({ status: 'unknown' });
  }

  const serviceData = Object.values(service)[0];
  const url = serviceData.href || serviceData.url;

  try {
    const axios = require('axios');
    await axios.get(url, { 
      timeout: 2000,
      validateStatus: (status) => status < 500
    });
    res.json({ status: 'online' });
  } catch (error) {
    res.json({ status: 'offline' });
  }
});

// Universal widget endpoint - handles all integrations dynamically
app.get('/api/widget/:integrationType/:serviceName', async (req, res) => {
  const { integrationType, serviceName } = req.params;

  try {
    // Get the integration handler
    const integration = integrations.get(integrationType);
    if (!integration) {
      return res.status(404).json({ 
        error: `Integration '${integrationType}' not found`,
        available: Array.from(integrations.keys())
      });
    }

    // Find service in config
    if (!configData || !configData.services) {
      return res.status(404).json({ error: 'No services configured' });
    }

    const service = findServiceInConfig(serviceName, configData);
    if (!service) {
      return res.status(404).json({ error: `Service '${serviceName}' not found` });
    }

    const serviceData = service[serviceName];
    const widgets = serviceData.widgets || [];
    const widgetConfig = widgets.find(w => w.type === integrationType);

    if (!widgetConfig) {
      return res.status(404).json({ 
        error: `Widget '${integrationType}' not configured for service '${serviceName}'` 
      });
    }

    // Call the integration with the widget config
    const result = await integration.fetchData(widgetConfig, serviceData);
    res.json(result);

  } catch (error) {
    console.error(`Widget ${integrationType}/${serviceName} error:`, error);
    res.status(500).json({ 
      error: 'Integration failed',
      message: error.message,
      type: integrationType,
      service: serviceName
    });
  }
});

// List available integrations
app.get('/api/integrations', (req, res) => {
  const integrationList = Array.from(integrations.entries()).map(([name, integration]) => ({
    name,
    description: integration.description || 'No description available',
    requiredConfig: integration.requiredConfig || [],
    version: integration.version || '1.0.0'
  }));
  
  res.json({
    count: integrationList.length,
    integrations: integrationList
  });
});

// Health check with integration status
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    integrations: {
      loaded: integrations.size,
      available: Array.from(integrations.keys())
    },
    config: configData ? 'loaded' : 'missing'
  });
});

// Get version info
app.get('/api/version', async (req, res) => {
  try {
    // Current version from environment variable or package.json
    const currentVersion = process.env.YAD_VERSION || require('./package.json').version;
    
    // Check Docker Hub for latest version using fetch
    const response = await fetch('https://hub.docker.com/v2/repositories/danzkigg/yad/tags/?page_size=25');
    const dockerHubData = await response.json();
    
    // Find the latest semantic version (excluding 'latest' tag)
    const latestTag = dockerHubData.results
      .map(tag => tag.name)
      .filter(name => name.match(/^v?\d+\.\d+\.\d+$/))
      .sort((a, b) => {
        const versionA = a.replace('v', '').split('.').map(Number);
        const versionB = b.replace('v', '').split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
          if (versionA[i] !== versionB[i]) {
            return versionB[i] - versionA[i];
          }
        }
        return 0;
      })[0];

    const hasUpdate = latestTag && compareVersions(currentVersion, latestTag) < 0;

    res.json({
      current: currentVersion,
      latest: latestTag,
      hasUpdate,
      updateAvailable: hasUpdate
    });
  } catch (error) {
    console.error('Version check failed:', error);
    res.json({
      current: process.env.YAD_VERSION || require('./package.json').version,
      latest: null,
      hasUpdate: false,
      error: 'Unable to check for updates'
    });
  }
});

// Helper function to compare versions
function compareVersions(current, latest) {
  const currentParts = current.replace('v', '').split('.').map(Number);
  const latestParts = latest.replace('v', '').split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (currentParts[i] < latestParts[i]) return -1;
    if (currentParts[i] > latestParts[i]) return 1;
  }
  return 0;
}

// Server-side health check endpoint
app.post('/api/health-check', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'URL is required',
      online: false,
      statusCode: 400,
      statusText: 'Bad Request'
    });
  }

  try {
    const axios = require('axios');
    const https = require('https');
    
    // Create axios instance with custom config
    const response = await axios({
      url: url,
      method: 'GET',
      timeout: 2000,
      validateStatus: () => true, // Don't throw on HTTP error codes
      // Allow self-signed certificates
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YAD-Dashboard/1.0)'
      }
    });

    res.json({
      online: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      statusText: response.statusText || getStatusText(response.status)
    });

  } catch (error) {
    // Handle different error types
    let statusCode = 0;
    let statusText = "Network Error";
    
    if (error.code === 'ECONNREFUSED') {
      statusCode = 0;
      statusText = "Connection Refused";
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 0;
      statusText = "Host Not Found";
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      statusCode = 408;
      statusText = "Timeout";
    } else if (error.code === 'CERT_HAS_EXPIRED') {
      statusCode = 0;
      statusText = "SSL Certificate Expired";
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      statusCode = 0;
      statusText = "SSL Certificate Invalid";
    } else if (error.response) {
      // Server responded with error status
      statusCode = error.response.status;
      statusText = error.response.statusText || getStatusText(error.response.status);
    }

    res.json({
      online: false,
      statusCode,
      statusText
    });
  }
});

// Helper function to get status text for common HTTP status codes
function getStatusText(statusCode) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  
  return statusTexts[statusCode] || 'Unknown Status';
}

// Start server
async function startServer() {
  await loadConfig();
  await loadIntegrations();
  setupWatchers();
  
  app.listen(PORT, () => {
    console.log(`🚀 Dashboard server running on port ${PORT}`);
    console.log(`📊 Loaded ${integrations.size} integrations`);
    console.log(`⚡ Config watching enabled`);
  });
}

startServer().catch(console.error);

module.exports = app;