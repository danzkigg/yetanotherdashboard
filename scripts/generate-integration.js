const fs = require('fs').promises;
const path = require('path');

const template = `const BaseIntegration = require('./base');

class {{ClassName}}Integration extends BaseIntegration {
  constructor() {
    super();
    this.description = '{{description}}';
    this.requiredConfig = {{requiredConfig}};
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    // TODO: Implement your integration logic here
    // Example:
    // const headers = this.getAuthHeaders(widgetConfig.key);
    // const data = await this.makeRequest(\`\${widgetConfig.url}/api/endpoint\`, { headers });
    
    return {
      // Return your widget data here
      example: 'Replace this with actual data'
    };
  }
}

module.exports = new {{ClassName}}Integration();
`;

async function generateIntegration() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Usage: node scripts/generate-integration.js <name> [description] [required-config...]

Examples:
  node scripts/generate-integration.js proxmox "Proxmox VE monitoring" url username password
  node scripts/generate-integration.js grafana "Grafana dashboard metrics" url token
  node scripts/generate-integration.js simple-service "Basic service monitoring" url
    `);
    process.exit(1);
  }

  const [name, description = `${name} integration`, ...requiredFields] = args;
  const className = name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  
  const content = template
    .replace(/{{ClassName}}/g, className)
    .replace(/{{description}}/g, description)
    .replace(/{{requiredConfig}}/g, JSON.stringify(requiredFields.length > 0 ? requiredFields : ['url']));

  const filename = path.join(__dirname, '..', 'integrations', `${name}.js`);
  
  try {
    await fs.writeFile(filename, content);
    console.log(`✓ Generated integration: ${filename}`);
    console.log(`✓ Class name: ${className}Integration`);
    console.log(`✓ Required config: ${requiredFields.length > 0 ? requiredFields.join(', ') : 'url'}`);
    console.log(`\nNext steps:`);
    console.log(`1. Edit ${filename} to implement your integration logic`);
    console.log(`2. Test with: curl http://localhost:3001/api/widget/${name}/your-service-name`);
  } catch (error) {
    console.error('Error generating integration:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  generateIntegration();
}

module.exports = { generateIntegration };