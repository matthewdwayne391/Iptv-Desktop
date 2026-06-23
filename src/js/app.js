/**
 * IPTV Desktop Player — Main Application Controller
 * Orchestrates all modules: xtream, m3u-parser, player, epg, storage, favorites, ui.
 */

class App {
  constructor() {
    this.account      = null;
    this.playlistData = null;
    this.player       = null;
    this.currentView  = 'live';
    this.currentChannelId = null;

    this.liveCategories = [];
    this.liveChannels   = [];
    this.liveActiveCat  = null;
    this.liveSearch     = '';

    this.vodCategories  = [];
    this.vodStreams      = [];
    this.vodActiveCat   = null;
    this.vodSearch      = '';

    this.seriesCategories = [];
    this.seriesList       = [];
    this.seriesActiveCat  = null;
    this.seriesSearch     = '';
  }

  // ----------------------------------------------------------------
  // Boot
  // ----------------------------------------------------------------
  async init() {
    const settings = await window.storage.getSettings();
    window.i18n.setLang(settings.language || 'en');
    document.body.setAttribute('data-theme', settings.theme || 'dark');

    // Load active account first — redirect if none
    this.account = await window.storage.getActiveAccount();
    if (!this.account) {
      window.api.window.navigate('login.html');
      return;
    }

    // Restore Xtream API credentials (Fix #2: do this in init, not inline HTML script)
    if (this.account.type === 'xtream') {
      window.xtreamAPI.serverUrl = this.account.serverUrl;
      window.xtreamAPI.username  = this.account.username;
      window.xtreamAPI.password  = this.account.password;
    }

    // Restore M3U playlist (Fix #3 + #4: handle all cases here, not in inline HTML)
    if (this.account.type === 'm3u-url' || this.account.type === 'm3u-file') {
      // Try sessionStorage first (just-navigated from login page)
      const raw = sessionStorage.getItem('playlist');
      if (raw) {
        try { this.playlistData = JSON.parse(raw); } catch {}
        sessionStorage.removeItem('playlist');
      }
      // If no sessionStorage data, reload from source
      if (!this.playlistData) {
        await this._reloadPlaylist();
      }
    }

    // Update sidebar account label
    document.getElementById('account-label').textContent =
      this.account.label || this.account.serverUrl || this.account.playlistUrl || this.account.filePath || '';

    // Setup player
    const videoEl = document.getElementById('video-player');
    this.player   = new window.Player(videoEl);

    this.player.onLoading(visible => {
      document.getElementById('player-loading').classList.toggle('hidden', !visible);
    });

    this.player.onError(msg => {
      const el = document.getElementById('player-error');
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 5000);
    });

    this.player.onPlay(() => {
      document.getElementById('player-error').classList.add('hidden');
    });

    this.player.setBufferLength(settings.playerBufferSize || 30);

    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => this.switchView(el.dataset.view));
    });

    // Sidebar buttons (Fix #8: single registration here only)
    document.getElementById('btn-refresh')?.addEventListener('click', () => this.refreshPlaylist());
    document.getElementById('btn-switch-account')?.addEventListener('click', () => {
      window.api.window.navigate('login.html');
    });

    // Player controls
    const volSlider = document.getElementById('vol-slider');
    if (volSlider) {
      volSlider.value = 80;
      volSlider.addEventListener('input', () => this.player.setVolume(volSlider.value / 100));
      this.player.setVolume(0.8);
    }

    document.getElementById('btn-fullscreen')?.addEventListener('click', () =>
      this.player.toggleFullscreen(document.getElementById('player-wrap')));

    document.getElementById('video-player')?.addEventListener('dblclick', () =>
      this.player.toggleFullscreen(document.getElementById('player-wrap')));

    document.getElementById('btn-mute')?.addEventListener('click', () => {
      const muted = this.player.toggleMute();
      document.getElementById('btn-mute').classList.toggle('muted', muted);
    });

    // Search
    document.getElementById('live-search')?.addEventListener('input', e => {
      this.liveSearch = e.target.value;
      this._renderChannelList();
    });
    document.getElementById('vod-search')?.addEventListener('input', e => {
      this.vodSearch = e.target.value;
      this._renderVodList();
    });
    document.getElementById('series-search')?.addEventListener('input', e => {
      this.seriesSearch = e.target.value;
      this._renderSeriesList();
    });

    // Settings buttons
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('btn-clear-cache')?.addEventListener('click',   () => this.clearLogoCache());
    document.getElementById('btn-manage-accounts-settings')?.addEventListener('click', () => {
      window.api.window.navigate('login.html');
    });

    // Load EPG if configured
    if (settings.epgUrl) {
      window.epg.load(settings.epgUrl).catch(() => {});
    }

    await this.switchView('live');
  }

  // ----------------------------------------------------------------
  // Reload playlist from saved account source
  // ----------------------------------------------------------------
  async _reloadPlaylist() {
    if (!this.account) return;
    try {
      if (this.account.type === 'm3u-url' && this.account.playlistUrl) {
        this.playlistData = await window.m3uParser.fetchFromUrl(this.account.playlistUrl);
      } else if (this.account.type === 'm3u-file' && this.account.filePath) {
        this.playlistData = await window.m3uParser.fetchFromFile(this.account.filePath);
      }
    } catch (err) {
      console.error('[app] Failed to reload playlist:', err.message);
    }
  }

  // ----------------------------------------------------------------
  // View switching
  // ----------------------------------------------------------------
  async switchView(view) {
    this.currentView = view;
    document.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.view === view));
    document.querySelectorAll('.view-section').forEach(el =>
      el.classList.toggle('hidden', el.dataset.section !== view));

    switch (view) {
      case 'live':      await this._loadLive();      break;
      case 'movies':    await this._loadVod();       break;
      case 'series':    await this._loadSeries();    break;
      case 'favorites': await this._loadFavorites(); break;
      case 'settings':  this._loadSettings();        break;
    }
  }

  // ----------------------------------------------------------------
  // LIVE TV
  // ----------------------------------------------------------------
  async _loadLive() {
    if (this.liveCategories.length && this.liveChannels.length) {
      this._renderChannelCategories();
      this._renderChannelList();
      return;
    }
    UI.showLoader(document.getElementById('channel-list'), window.i18n.t('loading'));
    try {
      if (this.account.type === 'xtream') {
        this.liveCategories = await window.xtreamAPI.getLiveCategories();
        this.liveChannels   = await window.xtreamAPI.getLiveStreams();
      } else {
        // M3U mode — use parsed playlist data (Fix #1, #10)
        if (!this.playlistData) {
          await this._reloadPlaylist();
        }
        if (!this.playlistData) throw new Error('No playlist loaded');
        this.liveChannels   = this.playlistData.channels;
        this.liveCategories = this.playlistData.groups.map(g => ({ category_id: g, category_name: g }));
      }
      this._renderChannelCategories();
      this._renderChannelList();
    } catch (err) {
      UI.showError(document.getElementById('channel-list'),
        err.message === 'No playlist loaded' ? window.i18n.t('errM3U') : window.i18n.t('errServer'));
    }
  }

  _renderChannelCategories() {
    const el = document.getElementById('live-cats');
    if (!el) return;
    UI.renderCategoryTabs(el, this.liveCategories, this.liveActiveCat, catId => {
      this.liveActiveCat = catId;
      this._renderChannelList();
    });
  }

  _renderChannelList() {
    let channels = this.liveChannels;
    if (this.liveActiveCat) {
      channels = channels.filter(ch =>
        String(ch.category_id) === String(this.liveActiveCat) ||
        ch.group === this.liveActiveCat
      );
    }
    if (this.liveSearch) channels = UI.filterBySearch(channels, this.liveSearch);

    UI.renderChannelList(document.getElementById('channel-list'), channels, this.currentChannelId, {
      onSelect:   ch  => this._playChannel(ch),
      onFavorite: (ch, btn) => this._toggleFav('channels', ch, btn)
    });
  }

  async _playChannel(ch) {
    const streamId = ch.stream_id || ch.id;
    this.currentChannelId = streamId;

    let streamUrl = ch.streamUrl || null;
    if (!streamUrl && this.account.type === 'xtream') {
      streamUrl = window.xtreamAPI.getLiveStreamUrl(streamId);
    }
    if (!streamUrl) {
      UI.toast(window.i18n.t('errStream'));
      return;
    }

    document.getElementById('now-playing-name').textContent = ch.name;
    document.getElementById('now-playing-wrap').classList.remove('hidden');
    this.player.play(streamUrl);

    UI.renderEpgBar(document.getElementById('epg-bar'), ch.tvgId || ch.epg_channel_id || '');
  }

  // ----------------------------------------------------------------
  // MOVIES (VOD)
  // ----------------------------------------------------------------
  async _loadVod() {
    if (this.vodStreams.length) {
      this._renderVodCategories();
      this._renderVodList();
      return;
    }
    UI.showLoader(document.getElementById('vod-grid'), window.i18n.t('loading'));
    try {
      if (this.account.type !== 'xtream') {
        UI.showEmpty(document.getElementById('vod-grid'), 'VOD requires an Xtream Codes account');
        return;
      }
      this.vodCategories = await window.xtreamAPI.getVodCategories();
      this.vodStreams     = await window.xtreamAPI.getVodStreams();
      this._renderVodCategories();
      this._renderVodList();
    } catch {
      UI.showError(document.getElementById('vod-grid'), window.i18n.t('errServer'));
    }
  }

  _renderVodCategories() {
    UI.renderCategoryTabs(document.getElementById('vod-cats'), this.vodCategories, this.vodActiveCat,
      catId => { this.vodActiveCat = catId; this._renderVodList(); });
  }

  _renderVodList() {
    let items = this.vodStreams;
    if (this.vodActiveCat) items = items.filter(i => String(i.category_id) === String(this.vodActiveCat));
    if (this.vodSearch)    items = UI.filterBySearch(items, this.vodSearch);
    UI.renderVodGrid(document.getElementById('vod-grid'), items, {
      type: 'movies',
      onSelect:   item => this._showVodDetail(item),
      onFavorite: (item, btn) => this._toggleFav('movies', item, btn)
    });
  }

  async _showVodDetail(item) {
    const id  = item.stream_id;
    const ext = item.container_extension || 'mp4';
    const streamUrl = window.xtreamAPI.getVodStreamUrl(id, ext);

    const modal = document.getElementById('detail-modal');
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="modal-inner"><div class="loader-center"><div class="spinner"></div></div></div>`;

    let info = {};
    try {
      const data = await window.xtreamAPI.getVodInfo(id);
      info = data.info || {};
    } catch {}

    modal.innerHTML = `
      <div class="modal-inner">
        <button class="modal-close" id="modal-close-btn">✕</button>
        <div class="modal-poster">
          ${item.stream_icon ? `<img src="${UI._esc(item.stream_icon)}" alt="">` : ''}
        </div>
        <div class="modal-info">
          <h2>${UI._esc(item.name)}</h2>
          <p class="meta">${UI._esc(item.year || '')} ${info.genre ? '• ' + UI._esc(info.genre) : ''} ${info.duration ? '• ' + UI._esc(info.duration) : ''}</p>
          ${info.rating ? `<p class="rating">★ ${UI._esc(info.rating)}</p>` : ''}
          <p class="plot">${UI._esc(info.plot || info.description || '')}</p>
          <div class="modal-actions">
            <button class="btn-play" id="modal-play-btn">▶ Play</button>
            <button class="fav-btn" id="modal-fav-btn" data-fav-type="movies" data-fav-id="${id}">★ Favorite</button>
          </div>
        </div>
      </div>`;

    document.getElementById('modal-close-btn').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('modal-play-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
      document.getElementById('now-playing-name').textContent = item.name;
      document.getElementById('now-playing-wrap').classList.remove('hidden');
      this.player.play(streamUrl);
      this.switchView('live');
    });
    document.getElementById('modal-fav-btn').addEventListener('click', e =>
      this._toggleFav('movies', item, e.target));
    window.favorites.refreshUI();
  }

  // ----------------------------------------------------------------
  // SERIES
  // ----------------------------------------------------------------
  async _loadSeries() {
    if (this.seriesList.length) {
      this._renderSeriesCategories();
      this._renderSeriesList();
      return;
    }
    UI.showLoader(document.getElementById('series-grid'), window.i18n.t('loading'));
    try {
      if (this.account.type !== 'xtream') {
        UI.showEmpty(document.getElementById('series-grid'), 'Series requires an Xtream Codes account');
        return;
      }
      this.seriesCategories = await window.xtreamAPI.getSeriesCategories();
      this.seriesList       = await window.xtreamAPI.getSeries();
      this._renderSeriesCategories();
      this._renderSeriesList();
    } catch {
      UI.showError(document.getElementById('series-grid'), window.i18n.t('errServer'));
    }
  }

  _renderSeriesCategories() {
    UI.renderCategoryTabs(document.getElementById('series-cats'), this.seriesCategories, this.seriesActiveCat,
      catId => { this.seriesActiveCat = catId; this._renderSeriesList(); });
  }

  _renderSeriesList() {
    let items = this.seriesList;
    if (this.seriesActiveCat) items = items.filter(i => String(i.category_id) === String(this.seriesActiveCat));
    if (this.seriesSearch)    items = UI.filterBySearch(items, this.seriesSearch);
    UI.renderVodGrid(document.getElementById('series-grid'), items, {
      type: 'series',
      onSelect:   item => this._showSeriesDetail(item),
      onFavorite: (item, btn) => this._toggleFav('series', item, btn)
    });
  }

  async _showSeriesDetail(item) {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="modal-inner"><div class="loader-center"><div class="spinner"></div></div></div>`;

    let seasons = {};
    try {
      const data = await window.xtreamAPI.getSeriesInfo(item.series_id);
      seasons    = data.episodes || {};
    } catch {}

    modal.innerHTML = `
      <div class="modal-inner">
        <button class="modal-close" id="modal-close-btn">✕</button>
        <div class="modal-poster">
          ${item.cover ? `<img src="${UI._esc(item.cover)}" alt="">` : ''}
        </div>
        <div class="modal-info">
          <h2>${UI._esc(item.name)}</h2>
          <p class="meta">${UI._esc(item.genre || '')}</p>
          <p class="plot">${UI._esc(item.plot || '')}</p>
          <div id="episodes-container"></div>
        </div>
      </div>`;

    document.getElementById('modal-close-btn').addEventListener('click', () => modal.classList.add('hidden'));
    UI.renderEpisodes(document.getElementById('episodes-container'), seasons, ep => {
      const ext = ep.container_extension || 'mp4';
      const epUrl = window.xtreamAPI.getSeriesEpUrl(ep.id, ext);
      document.getElementById('now-playing-name').textContent = `${item.name} – E${ep.episode_num || ep.id}`;
      document.getElementById('now-playing-wrap').classList.remove('hidden');
      this.player.play(epUrl);
      modal.classList.add('hidden');
      this.switchView('live');
    });
  }

  // ----------------------------------------------------------------
  // FAVORITES
  // ----------------------------------------------------------------
  async _loadFavorites() {
    const favs = await window.storage.getFavorites();
    UI.renderFavoritesList(document.getElementById('favorites-list'), favs, {
      onPlay: item => {
        let streamUrl = item.streamUrl || null;
        if (!streamUrl && item.stream_id && this.account.type === 'xtream') {
          streamUrl = window.xtreamAPI.getLiveStreamUrl(item.stream_id);
        }
        if (streamUrl) {
          document.getElementById('now-playing-name').textContent = item.name;
          document.getElementById('now-playing-wrap').classList.remove('hidden');
          this.player.play(streamUrl);
          this.switchView('live');
        }
      },
      onRemove: () => {}
    });
  }

  // ----------------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------------
  _loadSettings() {
    window.storage.getSettings().then(settings => {
      document.getElementById('set-language').value    = settings.language        || 'en';
      document.getElementById('set-theme').value       = settings.theme           || 'dark';
      document.getElementById('set-buffer').value      = settings.playerBufferSize || 30;
      document.getElementById('set-quality').value     = settings.playerQuality   || 'auto';
      document.getElementById('set-reconnect').checked = !!settings.autoReconnect;
      document.getElementById('set-epg-url').value     = settings.epgUrl          || '';
      document.getElementById('set-logo-cache').checked = !!settings.logoCache;
    });
  }

  async saveSettings() {
    const settings = {
      language:         document.getElementById('set-language').value,
      theme:            document.getElementById('set-theme').value,
      playerBufferSize: parseInt(document.getElementById('set-buffer').value, 10) || 30,
      playerQuality:    document.getElementById('set-quality').value,
      autoReconnect:    document.getElementById('set-reconnect').checked,
      epgUrl:           document.getElementById('set-epg-url').value.trim(),
      logoCache:        document.getElementById('set-logo-cache').checked
    };
    await window.storage.saveSettings(settings);
    window.i18n.setLang(settings.language);
    document.body.setAttribute('data-theme', settings.theme);
    if (this.player) this.player.setBufferLength(settings.playerBufferSize);
    UI.toast(window.i18n.t('saved'));
  }

  async clearLogoCache() {
    await window.api.logo.clearCache();
    UI.toast(window.i18n.t('clearCacheDone'));
  }

  // ----------------------------------------------------------------
  // Playlist refresh (Fix #6: handle all account types)
  // ----------------------------------------------------------------
  async refreshPlaylist() {
    if (!this.account) return;
    UI.toast(window.i18n.t('refreshing'));

    this.liveChannels     = [];
    this.liveCategories   = [];
    this.vodStreams        = [];
    this.vodCategories    = [];
    this.seriesList       = [];
    this.seriesCategories = [];
    this.playlistData     = null;

    if (this.account.type !== 'xtream') {
      await this._reloadPlaylist();
    }

    await this._loadLive();
    UI.toast(window.i18n.t('refreshDone'));
  }

  // ----------------------------------------------------------------
  // Favorites toggle
  // ----------------------------------------------------------------
  async _toggleFav(type, item, btn) {
    const id = item.stream_id || item.series_id || item.id;
    const isFav = await window.favorites.toggle(type, { ...item, id });
    if (btn) {
      btn.classList.toggle('active', isFav);
      UI.toast(window.i18n.t(isFav ? 'addFavorite' : 'removeFavorite'));
    }
  }
}

// ----------------------------------------------------------------
// Bootstrap — single DOMContentLoaded, no duplicate listeners
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  window._app = app;
  await app.init();
});
