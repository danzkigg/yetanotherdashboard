const path = require('path');

async function testIntegration(integrationName, serviceName = null) {
  try {
    // Remove .js extension if provided
    const cleanName = integrationName.replace('.js', '');
    
    console.log(`\n🧪 Testing integration: ${cleanName}`);
    
    // Try to load the integration
    const integrationPath = path.join(__dirname, '..', 'integrations', `${cleanName}.js`);
    
    // Clear require cache to get fresh instance
    delete require.cache[require.resolve(integrationPath)];
    
    const integration = require(integrationPath);
    
    console.log(`📝 Description: ${integration.description}`);
    console.log(`⚙️  Required config: ${integration.requiredConfig?.join(', ') || 'none'}`);
    
    // Load config.yml to get real service configurations
    const yaml = require('js-yaml');
    const fs = require('fs');
    const configPath = path.join(__dirname, '..', 'config.yml');
    
    let config;
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      config = yaml.load(configFile);
    } catch (configError) {
      console.log(`⚠️  Could not load config.yml: ${configError.message}`);
      console.log(`🔧 Using mock config instead...`);
      
      // Fallback to mock config
      const mockConfig = {
        url: 'http://localhost:5055',
        key: 'test-api-key-12345',
      };
      
      return await testWithConfig(integration, mockConfig, 'mock-service');
    }
    
    // Find services with the integration type
    const servicesWithIntegration = [];
    
    if (config.services && typeof config.services === 'object') {
      // New hierarchical structure: services are grouped under keys
      for (const groupName in config.services) {
        const servicesInGroup = config.services[groupName] || [];
        
        if (Array.isArray(servicesInGroup)) {
          for (const service of servicesInGroup) {
            // Each service is an object with the service name as key
            for (const serviceKey in service) {
              const serviceData = service[serviceKey];
              
              if (serviceData.widgets) {
                const widget = serviceData.widgets.find(w => w.type === cleanName);
                if (widget) {
                  servicesWithIntegration.push({
                    name: serviceKey,
                    widget: widget,
                    service: serviceData,
                    group: groupName
                  });
                }
              }
            }
          }
        }
      }
    }
    
    if (servicesWithIntegration.length === 0) {
      console.log(`❌ No services found with ${cleanName} widgets in config.yml`);
      console.log(`💡 Add a service with a ${cleanName} widget to test with real config`);
      console.log(`\n📋 Example config structure:`);
      console.log(`
services:
  Media:  # Group name
    - Overseerr:  # Service name
        icon: "di:overseerr"
        url: "http://localhost:5055"
        description: "Request Management"
        widgets:
          - type: "${cleanName}"
            url: "http://localhost:5055"
            key: "your-api-key"
      `);
      return;
    }
    
    // Test with specified service or first available
    let targetService;
    if (serviceName) {
      targetService = servicesWithIntegration.find(s => s.name === serviceName);
      if (!targetService) {
        console.log(`❌ Service '${serviceName}' not found with ${cleanName} widget`);
        console.log(`Available services: ${servicesWithIntegration.map(s => s.name).join(', ')}`);
        return;
      }
    } else {
      targetService = servicesWithIntegration[0];
      if (servicesWithIntegration.length > 1) {
        console.log(`📋 Multiple services found, testing with: ${targetService.name}`);
        console.log(`   Available: ${servicesWithIntegration.map(s => s.name).join(', ')}`);
        console.log(`   Group: ${targetService.group}`);
      }
    }
    
    await testWithConfig(integration, targetService.widget, targetService.name);
    
  } catch (error) {
    console.error(`❌ Integration test failed:`, error.message);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log(`\n💡 Available integrations:`);
      const fs = require('fs');
      const integrationsDir = path.join(__dirname, '..', 'integrations');
      try {
        const files = fs.readdirSync(integrationsDir);
        const integrations = files
          .filter(f => f.endsWith('.js') && f !== 'base.js')
          .map(f => f.replace('.js', ''));
        console.log(integrations.map(name => `  - ${name}`).join('\n'));
      } catch (e) {
        console.log('Could not list integrations directory');
      }
    }
  }
}

async function testWithConfig(integration, widgetConfig, serviceName) {
  console.log(`🔧 Using real config from service: ${serviceName}`);
  console.log(`   Config:`, JSON.stringify(widgetConfig, null, 2));
  console.log(`\n⏳ Testing with real configuration...`);
  
  try {
    const result = await integration.fetchData(widgetConfig, {});
    console.log(`✅ Integration test successful!`);
    console.log(`📊 Live result:`, JSON.stringify(result, null, 2));
  } catch (fetchError) {
    console.log(`❌ Integration failed:`, fetchError.message);
    
    // Provide helpful debugging info
    if (fetchError.message.includes('Authentication')) {
      console.log(`💡 Check your API key in config.yml`);
    } else if (fetchError.message.includes('Connection')) {
      console.log(`💡 Check if the service is running and URL is correct`);
    } else if (fetchError.message.includes('not found')) {
      console.log(`💡 Check the service URL and API endpoints`);
    }
  }
}

// Script usage
function showUsage() {
  console.log(`
Usage: node scripts/test-integration.js <integration-name> [service-name]

Examples:
  node scripts/test-integration.js overseerr
  node scripts/test-integration.js sonarr
  node scripts/test-integration.js overseerr Overseerr

This script will:
1. Load your config.yml file
2. Find services configured with the specified integration
3. Test the integration with real configuration data
  `);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\nAvailable Integrations:\n');
    
    const fs = require('fs');
    const integrationsDir = path.join(__dirname, '..', 'integrations');
    
    try {
      const files = fs.readdirSync(integrationsDir);
      
      for (const file of files.filter(f => f.endsWith('.js') && f !== 'base.js')) {
        const name = file.replace('.js', '');
        try {
          const integration = require(path.join(integrationsDir, file));
          console.log(`- ${name.padEnd(20)} - ${integration.description || 'No description'}`);
          if (integration.requiredConfig?.length > 0) {
            console.log(`  ${' '.repeat(22)} Required: ${integration.requiredConfig.join(', ')}`);
          }
        } catch (error) {
          console.log(`- ${name.padEnd(20)} - Load error: ${error.message}`);
        }
      }
      
      console.log(`\nTotal: ${files.filter(f => f.endsWith('.js') && f !== 'base.js').length} integrations\n`);
      showUsage();
    } catch (error) {
      console.error('Error listing integrations:', error.message);
    }
    
    return;
  }
  
  const [integrationName, serviceName] = args;
  await testIntegration(integrationName, serviceName);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testIntegration };