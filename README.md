<div align="center">

# YAD - Yet Another Dashboard

A minimalistic and configurable dashboard for managing your services with real-time monitoring and widgets.

⚙️ [Wiki for configuration](https://github.com/danzkigg/yetanotherdashboard/wiki) | 💬 [Discord](https://discord.gg/MEPw6fHCvG)

<img width="788" height="759" alt="dashboard" src="https://github.com/user-attachments/assets/bd133960-58df-4e1a-8f80-f549e55a8935" />

</div>

## Features

- **Clean, responsive design** - Works on all devices
- **Real-time service monitoring** - Health checks with status indicators  
- **Live data widgets** - Integration with Sonarr, Radarr, Tautulli, qBittorrent, Rancher, etc...
- **Flexible layouts** - Grid and multi-column support
- **Easy YAML configuration** - Simple setup and customization with auto-reload
- **Docker ready** - One-command deployment
- **Config auto-reload** - Automatic reload on config changes

## Quick Start

Create a directory and ```docker-compose.yml``` file:

```yaml
services:
  yad:
    image: danzkigg/yad:latest
    container_name: yad
    ports:
      - "3000:3000"   # WebUI
    volumes:
      - ./config:/app/config
    restart: unless-stopped

networks:
  default:
    driver: bridge
```

Start YAD:
```bash
docker compose up -d
```

Access your dashboard at `http://<YOUR-IP>:3000`

## Configuration

YAD creates a default `config/config.yml` file on first run. Edit this file to add your services:

```yaml
settings:
  - Dashboard:
      name: "My Homelab"
      width: "narrow"

layout:
  - "Services":
      style: "grid"
      columns: 2
      groups: ["Services"]

services:
  Services:
    - Plex:
        icon: "si:plex"
        url: "http://<YOUR-PLEX-IP>:32400"
        description: "Media Server"
        widgets:
          - type: "tautulli"
            url: "http:/<YOUR-TAUTULLI-IP>:8181"
            key: "your-tautulli-api-key"

bookmarks:
  Bookmarks:
    - GitHub:
        icon: "si:github"
        url: "https://github.com"
```

## Supported Widgets

- **Sonarr** - TV show management
- **Radarr** - Movie management  
- **Tautulli** - Plex analytics
- **qBittorrent** - Torrent client
- **Rancher** - Container management
- And more...

[See all the available integrations here.](https://github.com/danzkigg/yetanotherdashboard/wiki/Widgets)

Don't see your favorite service? You can request new integrations:

1. **Check existing integrations** - [View all supported widgets](https://github.com/danzkigg/yetanotherdashboard/wiki/Widgets)
2. **Submit a request** - [Create an integration request issue](https://github.com/danzkigg/yetanotherdashboard/issues/new?assignees=&labels=enhancement%2Cintegration&template=integration_request.md&title=%5BINTEGRATION%5D+Service+Name)
3. **Provide details** - Include API documentation, use cases, and desired data points

Popular requests with good API documentation are prioritized for development.

## Management

```bash
# View logs
docker compose logs -f

# Update YAD
docker compose pull && docker compose up -d

# Backup config
cp config/config.yml config/config.yml.backup
```
