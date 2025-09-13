"use client";
import TautulliWidget from "./widgets/TautulliWidget";
import SonarrWidget from "./widgets/SonarrWidget";
import RadarrWidget from "./widgets/RadarrWidget";
import QbittorrentWidget from "./widgets/QbittorrentWidget";
import RancherWidget from "./widgets/RancherWidget";
import OverseerrWidget from "./widgets/OverseerrWidget";
import PortainerWidget from "./widgets/PortainerWidget";
import ProxmoxWidget from "./widgets/ProxmoxWidget";
import PulseWidget from "./widgets/PulseWidget";

interface WidgetRendererProps {
  widget: any;
  serviceName: string;
}

export default function WidgetRenderer({ widget, serviceName }: WidgetRendererProps) {
  const WidgetComponent = getWidgetComponent(widget.type);
  if (!WidgetComponent) return null;

  return <WidgetComponent serviceName={serviceName} config={widget} />;
}

/** Map widget types to components */
function getWidgetComponent(type: string) {
  switch (type) {
    case "sonarr":
      return SonarrWidget;
    case "radarr":
      return RadarrWidget;
    case "qbittorrent":
      return QbittorrentWidget;
    case "tautulli":
      return TautulliWidget;
    case "rancher":
      return RancherWidget;
    case "overseerr":
      return OverseerrWidget;
    case "portainer":
      return PortainerWidget;
    case "proxmox":
      return ProxmoxWidget;
    case "pulse":
      return PulseWidget;  
    default:
      return null;
  }
}