const BaseIntegration = require('./base');

class TautulliIntegration extends BaseIntegration {
  constructor() {
    super();
    this.description = 'Tautulli Plex monitoring integration';
    this.requiredConfig = ['url', 'key'];
    this.version = '1.0.0';
  }

  async fetchData(widgetConfig, serviceData) {
    this.validateConfig(widgetConfig);
    
    const endpoint = `${widgetConfig.url}/api/v2?apikey=${widgetConfig.key}&cmd=get_activity`;
    const data = await this.makeRequest(endpoint);
    
    const sessionsRaw = data?.response?.data?.sessions || [];
    const sessions = this.processSessions(sessionsRaw, widgetConfig);
    
    return { sessions };
  }

  processSessions(sessionsRaw, config) {
    return sessionsRaw.map(s => {
      const viewOffset = Math.floor((s.view_offset || 0) / 1000);
      const duration = Math.floor((s.duration || 0) / 1000);

      let title, poster;
      if (s.media_type === 'episode') {
        const season = String(s.parent_media_index || 0).padStart(2, '0');
        const episode = String(s.media_index || 0).padStart(2, '0');
        title = `${s.grandparent_title} S${season}E${episode}`;
        poster = s.grandparent_thumb;
      } else {
        title = s.title;
        poster = s.thumb;
      }

      const posterUrl = poster 
        ? `${config.url}/api/v2?apikey=${config.key}&cmd=pms_image_proxy&img=${poster}`
        : null;

      return {
        user: s.username,
        type: s.media_type,
        title,
        friendly_name: s.friendly_name,
        view_offset: viewOffset,
        duration,
        state: s.state,
        poster: posterUrl,
      };
    });
  }
}

module.exports = new TautulliIntegration();