<div align="center">

# YAD - Yet Another Dashboard

A minimalistic and configurable dashboard for managing your services with real-time monitoring and widgets.

<img width="2510" height="2396" alt="dashboard" src="https://github.com/user-attachments/assets/5652329e-20bb-4841-ab22-cb11fb2d0315" />

</div>

## Features

- **Clean, responsive design** - Works on all devices
- **Real-time service monitoring** - Health checks with status indicators  
- **Live data widgets** - Integration with Sonarr, Radarr, Tautulli, qBittorrent, Rancher, etc...
- **Flexible layouts** - Grid and multi-column support
- **Easy YAML configuration** - Simple setup and customization
- **Docker ready** - One-command deployment
- **Config auto-reload** - Automatic reload on config changes

## Quick Start

Create a directory and docker-compose.yml file:

```yaml
services:
  yad:
    image: danzkigg/yad:latest
    container_name: yad
    ports:
      - "3000:3000"   # WebUI
    volumes:
      - ./config:/app/config
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
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

See all the available integrations here.

## Management

```bash
# View logs
docker compose logs -f

# Update YAD
docker compose pull && docker compose up -d

# Backup config
cp config/config.yml config/config.yml.backup
```
