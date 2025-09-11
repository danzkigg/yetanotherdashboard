const fs = require('fs').promises;
const path = require('path');

async function listIntegrations() {
  try {
    const integrationsDir = path.join(__dirname, '..', 'integrations');
    const files = await fs.readdir(integrationsDir);
    
    console.log('\n📊 Available Integrations:\n');
    
    for (const file of files.filter(f => f.endsWith('.js') && f !== 'base.js')) {
      const name = file.replace('.js', '');
      try {
        const integration = require(path.join(integrationsDir, file));
        console.log(`• ${name.padEnd(20)} - ${integration.description || 'No description'}`);
        if (integration.requiredConfig?.length > 0) {
          console.log(`  ${' '.repeat(22)} Required: ${integration.requiredConfig.join(', ')}`);
        }
      } catch (error) {
        console.log(`• ${name.padEnd(20)} - ❌ Load error: ${error.message}`);
      }
    }
    
    console.log(`\n📈 Total: ${files.filter(f => f.endsWith('.js') && f !== 'base.js').length} integrations\n`);
  } catch (error) {
    console.error('Error listing integrations:', error);
  }
}

if (require.main === module) {
  listIntegrations();
}