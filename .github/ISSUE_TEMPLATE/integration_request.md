---
name: Integration Request
about: Request a new service integration for YAD
title: '[INTEGRATION] Service Name'
labels: ['request', 'integrations']
assignees: ''
---

# Integration Request: [Service Name]

## Service Information
**Service Name:** [e.g., Grafana, Proxmox, Docker, etc.]
**Service Website:** [Official website URL]
**API Documentation:** [Link to API docs if available]

## Use Case Description
Briefly describe how you would use this integration and what value it would provide to dashboard users.

**Example:** "I want to monitor my Proxmox VE cluster status, including running VMs, resource usage, and node health directly from my homepage dashboard."

## Required Data Points
What information should this integration display? Check all that apply:

- [ ] Status/Health indicators
- [ ] Numerical metrics (count, usage, etc.)
- [ ] Performance data (CPU, Memory, Network)
- [ ] Recent activity/logs
- [ ] Configuration status
- [ ] Other: _______________

## Authentication Method
How does the service authenticate API requests?

- [ ] API Key
- [ ] Username/Password
- [ ] Bearer Token
- [ ] OAuth
- [ ] No authentication required
- [ ] Other: _______________

## Sample Configuration
Provide an example of how this integration would be configured in `config.yml`:

```yaml
- name: "My Service"
  group: "Monitoring"
  widgets:
    - type: "[service-name]"
      url: "http://localhost:3000"
      key: "your-api-key"
      # Add other required fields
```

## Additional Context
- **Existing Alternatives:** [Any workarounds you're currently using]
- **API Rate Limits:** [If known, mention any API limitations]

## Screenshots (Optional)
If available, include screenshots of:
- API response examples
- Desired widget appearance

---

**Note:** Please check the [existing integrations](../integrations/) to ensure this service isn't already supported. Popular services will be prioritized based on community interest and API accessibility.