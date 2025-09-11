# Contributing to YAD

## Requesting Integrations

To request a new service integration:

1. Check [existing integrations](./integrations/) to avoid duplicates
2. [Create an integration request](https://github.com/danzkigg/yetanotherdashboard/issues/new?assignees=&labels=enhancement%2Cintegration&template=integration_request.md&title=%5BINTEGRATION%5D+Service+Name)
3. Provide complete information including API docs and use cases

## Developing Integrations

### Setup
1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/danzkigg/yetanotherdashboard.git
   cd yetanotherdashboard
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a feature branch** from `dev`:
   ```bash
   git checkout dev
   git checkout -b integration/service-name
   ```

### Quick Start
Use the integration generator to create a new integration:

```bash
node scripts/generate-integration.js <service-name> "Description" url key
```

### Integration Structure
All integrations extend the `BaseIntegration` class and must implement:

```javascript
const BaseIntegration = require('./base');

class ServiceIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Service description';
    this.requiredConfig = ['url', 'key']; // Required config fields
  }

  async fetchData(widgetConfig, serviceData) {
    // Implementation here
    return { /* widget data */ };
  }
}
```

### Creating the Widget Component
After implementing the integration, you must create the corresponding React widget component:

1. Create `/components/widgets/ServiceNameWidget.js`:

```javascript
import { useState, useEffect } from 'react';

export default function ServiceNameWidget({ config, service }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from your integration endpoint
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/widget/${config.type}/${service.name}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [config.type, service.name]);

  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="widget">
      {/* Your widget UI here */}
      <h3>{service.name}</h3>
      <p>{data.status}</p>
    </div>
  );
}
```

2. Register the widget in `/app/components/WidgetRenderer.tsx`:

First, import your widget component:
```typescript
import ServiceNameWidget from './widgets/ServiceNameWidget';
```

Then add it to the `getWidgetComponent` switch statement:
```typescript
/** Map widget types to components */
function getWidgetComponent(type: string) {
  switch (type) {
    // Other integrations
    case "service-name":  // Add your widget here
      return ServiceNameWidget;
    default:
      return null;
  }
}
```

### Testing
Test both the integration and widget:

```bash
# Test the integration logic
node scripts/test-integration.js <service-name>

# Start the dev server to test the widget UI
npm run dev:frontend
npm run dev:backend
```

### Requirements
- Return consistent data structure from integration
- Handle errors gracefully in both integration and widget
- Validate required configuration
- Follow existing patterns in `/integrations/` and `/components/widgets/`
- Widget should handle loading and error states
- Use appropriate refresh intervals for your service

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b integration/service-name`
3. Implement and test your integration
4. Update documentation if needed
5. Submit a pull request with clear description

---

Thank you for contributing to YAD, you can PM me on discord to get a "Contributor" role on our server!
