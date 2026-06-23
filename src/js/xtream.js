/**
 * Xtream Codes API Client
 * All requests go through window.api.net.fetch (main process)
 * to bypass CORS and use Node's http/https directly.
 */

class XtreamAPI {
  constructor() {
    this.serverUrl  = '';
    this.username   = '';
    this.password   = '';
    this.userInfo   = null;
  }

  _buildUrl(action, extra = '') {
    const base = this.serverUrl.replace(/\/$/, '');
    return `${base}/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}&action=${action}${extra}`;
  }

  _streamUrl(streamId, ext = 'ts') {
    const base = this.serverUrl.replace(/\/$/, '');
    return `${base}/live/${encodeURIComponent(this.username)}/${encodeURIComponent(this.password)}/${streamId}.${ext}`;
  }

  _vodUrl(streamId, ext = 'mp4') {
    const base = this.serverUrl.replace(/\/$/, '');
    return `${base}/movie/${encodeURIComponent(this.username)}/${encodeURIComponent(this.password)}/${streamId}.${ext}`;
  }

  _seriesEpUrl(streamId, ext = 'mkv') {
    const base = this.serverUrl.replace(/\/$/, '');
    return `${base}/series/${encodeURIComponent(this.username)}/${encodeURIComponent(this.password)}/${streamId}.${ext}`;
  }

  async _get(url) {
    const result = await window.api.net.fetch(url, { timeout: 15000 });
    if (result.status !== 200) {
      throw new Error(`HTTP ${result.status}`);
    }
    return JSON.parse(result.body);
  }

  // Validate credentials and retrieve user info
  async login(serverUrl, username, password) {
    this.serverUrl = serverUrl;
    this.username  = username;
    this.password  = password;

    const url = `${serverUrl.replace(/\/$/, '')}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const result = await window.api.net.fetch(url, { timeout: 10000 });

    if (result.status !== 200) throw new Error('errServer');

    let data;
    try {
      data = JSON.parse(result.body);
    } catch {
      throw new Error('errServer');
    }

    if (!data.user_info) throw new Error('errCredentials');
    if (data.user_info.auth === 0) throw new Error('errCredentials');

    this.userInfo = data.user_info;
    return {
      userInfo:  data.user_info,
      serverInfo: data.server_info || {}
    };
  }

  // Live TV
  async getLiveCategories() {
    return this._get(this._buildUrl('get_live_categories'));
  }

  async getLiveStreams(categoryId) {
    const extra = categoryId ? `&category_id=${categoryId}` : '';
    return this._get(this._buildUrl('get_live_streams', extra));
  }

  getLiveStreamUrl(streamId) {
    return this._streamUrl(streamId, 'm3u8');
  }

  // Movies (VOD)
  async getVodCategories() {
    return this._get(this._buildUrl('get_vod_categories'));
  }

  async getVodStreams(categoryId) {
    const extra = categoryId ? `&category_id=${categoryId}` : '';
    return this._get(this._buildUrl('get_vod_streams', extra));
  }

  async getVodInfo(vodId) {
    return this._get(this._buildUrl('get_vod_info', `&vod_id=${vodId}`));
  }

  getVodStreamUrl(streamId, ext) {
    return this._vodUrl(streamId, ext || 'mp4');
  }

  // Series
  async getSeriesCategories() {
    return this._get(this._buildUrl('get_series_categories'));
  }

  async getSeries(categoryId) {
    const extra = categoryId ? `&category_id=${categoryId}` : '';
    return this._get(this._buildUrl('get_series', extra));
  }

  async getSeriesInfo(seriesId) {
    return this._get(this._buildUrl('get_series_info', `&series_id=${seriesId}`));
  }

  getSeriesEpUrl(streamId, ext) {
    return this._seriesEpUrl(streamId, ext || 'mp4');
  }
}

window.xtreamAPI = new XtreamAPI();
