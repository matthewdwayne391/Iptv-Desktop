/**
 * UI Helpers — DOM rendering utilities used by app.js
 */

const UI = {

  // ----------------------------------------------------------------
  // Spinners / loading
  // ----------------------------------------------------------------
  showLoader(el, msg) {
    if (!el) return;
    el.innerHTML = `<div class="loader-center"><div class="spinner"></div><p>${msg || ''}</p></div>`;
  },

  showError(el, msg) {
    if (!el) return;
    el.innerHTML = `<div class="empty-state"><span class="icon-error">⚠</span><p>${msg}</p></div>`;
  },

  showEmpty(el, msg) {
    if (!el) return;
    el.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
  },

  // ----------------------------------------------------------------
  // Category tabs
  // ----------------------------------------------------------------
  renderCategoryTabs(containerEl, categories, activeId, onSelect) {
    containerEl.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'cat-tab' + (!activeId ? ' active' : '');
    allBtn.textContent = window.i18n.t('allCategories');
    allBtn.addEventListener('click', () => {
      containerEl.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      onSelect(null);
    });
    containerEl.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-tab' + (cat.category_id === activeId ? ' active' : '');
      btn.textContent = cat.category_name || cat.name || cat.category_id;
      btn.dataset.catId = cat.category_id;
      btn.addEventListener('click', () => {
        containerEl.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(cat.category_id);
      });
      containerEl.appendChild(btn);
    });
  },

  // ----------------------------------------------------------------
  // Channel list
  // ----------------------------------------------------------------
  renderChannelList(containerEl, channels, activeId, opts = {}) {
    containerEl.innerHTML = '';
    if (!channels.length) {
      this.showEmpty(containerEl, window.i18n.t('noResults'));
      return;
    }

    channels.forEach(ch => {
      const item = document.createElement('div');
      item.className = 'channel-item' + (String(ch.stream_id || ch.id) === String(activeId) ? ' active' : '');
      item.dataset.id = ch.stream_id || ch.id;

      const logoDiv = document.createElement('div');
      logoDiv.className = 'channel-logo';

      if (ch.stream_icon || ch.logo) {
        const img = document.createElement('img');
        img.src = ch.stream_icon || ch.logo;
        img.alt = ch.name;
        img.onerror = () => { logoDiv.textContent = this._initials(ch.name); };
        logoDiv.appendChild(img);
      } else {
        logoDiv.textContent = this._initials(ch.name);
      }

      const info = document.createElement('div');
      info.className = 'channel-info';
      info.innerHTML = `
        <span class="channel-name">${this._esc(ch.name)}</span>
        ${ch.num ? `<span class="channel-num">${ch.num}</span>` : ''}
      `;

      const favBtn = document.createElement('button');
      favBtn.className = 'fav-btn';
      favBtn.dataset.favType = 'channels';
      favBtn.dataset.favId   = ch.stream_id || ch.id;
      favBtn.title = window.i18n.t('addFavorite');
      favBtn.innerHTML = '★';
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (opts.onFavorite) opts.onFavorite(ch, favBtn);
      });

      item.appendChild(logoDiv);
      item.appendChild(info);
      item.appendChild(favBtn);

      item.addEventListener('click', () => {
        containerEl.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        if (opts.onSelect) opts.onSelect(ch);
      });

      containerEl.appendChild(item);
    });

    // Async logo caching
    if (window.api.logo) {
      channels.forEach(ch => {
        const id   = ch.stream_id || ch.id;
        const logo = ch.stream_icon || ch.logo;
        if (!logo) return;
        window.api.logo.get(id).then(cached => {
          if (!cached && logo) {
            window.api.logo.cache(logo, id);
          }
        });
      });
    }

    // Refresh fav state
    window.favorites.refreshUI();
  },

  // ----------------------------------------------------------------
  // Movie / VOD grid
  // ----------------------------------------------------------------
  renderVodGrid(containerEl, items, opts = {}) {
    containerEl.innerHTML = '';
    if (!items.length) {
      this.showEmpty(containerEl, window.i18n.t('noResults'));
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'vod-card';

      const poster = document.createElement('div');
      poster.className = 'vod-poster';
      if (item.stream_icon || item.cover) {
        const img = document.createElement('img');
        img.src = item.stream_icon || item.cover;
        img.alt = item.name;
        img.loading = 'lazy';
        img.onerror = () => { poster.style.background = this._gradientFromName(item.name); };
        poster.appendChild(img);
      } else {
        poster.style.background = this._gradientFromName(item.name);
        poster.innerHTML = `<span class="vod-poster-title">${this._esc(item.name)}</span>`;
      }

      if (item.rating) {
        const badge = document.createElement('span');
        badge.className = 'rating-badge';
        badge.textContent = '★ ' + parseFloat(item.rating).toFixed(1);
        poster.appendChild(badge);
      }

      const favBtn = document.createElement('button');
      favBtn.className = 'fav-btn poster-fav';
      favBtn.dataset.favType = opts.type || 'movies';
      favBtn.dataset.favId   = item.stream_id || item.series_id || item.id;
      favBtn.innerHTML = '★';
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (opts.onFavorite) opts.onFavorite(item, favBtn);
      });
      poster.appendChild(favBtn);

      const meta = document.createElement('div');
      meta.className = 'vod-meta';
      meta.innerHTML = `
        <span class="vod-title">${this._esc(item.name)}</span>
        <span class="vod-sub">${item.year || ''} ${item.genre || item.category_name || ''}</span>
      `;

      card.appendChild(poster);
      card.appendChild(meta);
      card.addEventListener('click', () => { if (opts.onSelect) opts.onSelect(item); });
      containerEl.appendChild(card);
    });

    window.favorites.refreshUI();
  },

  // ----------------------------------------------------------------
  // Series episodes list
  // ----------------------------------------------------------------
  renderEpisodes(containerEl, seasons, onPlay) {
    containerEl.innerHTML = '';
    const seasonKeys = Object.keys(seasons || {}).sort((a, b) => Number(a) - Number(b));
    if (!seasonKeys.length) {
      this.showEmpty(containerEl, window.i18n.t('noResults'));
      return;
    }

    seasonKeys.forEach(seasonNum => {
      const episodes = seasons[seasonNum];
      const section  = document.createElement('div');
      section.className = 'season-section';
      section.innerHTML = `<h3 class="season-title">${window.i18n.t('season')} ${seasonNum}</h3>`;

      const list = document.createElement('div');
      list.className = 'episode-list';

      episodes.forEach(ep => {
        const el = document.createElement('div');
        el.className = 'episode-item';
        el.innerHTML = `
          <span class="ep-num">E${ep.episode_num || ep.id}</span>
          <span class="ep-title">${this._esc(ep.title || ep.name || '')}</span>
          <button class="play-btn">&#9654;</button>
        `;
        el.querySelector('.play-btn').addEventListener('click', () => onPlay && onPlay(ep));
        list.appendChild(el);
      });

      section.appendChild(list);
      containerEl.appendChild(section);
    });
  },

  // ----------------------------------------------------------------
  // Favorites list (mixed)
  // ----------------------------------------------------------------
  renderFavoritesList(containerEl, favs, opts = {}) {
    containerEl.innerHTML = '';
    const all = [
      ...(favs.channels || []).map(i => ({ ...i, _type: 'channels' })),
      ...(favs.movies   || []).map(i => ({ ...i, _type: 'movies'   })),
      ...(favs.series   || []).map(i => ({ ...i, _type: 'series'   }))
    ];

    if (!all.length) {
      this.showEmpty(containerEl, window.i18n.t('noFavorites'));
      return;
    }

    all.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    all.forEach(item => {
      const row = document.createElement('div');
      row.className = 'fav-item';

      const logoDiv = document.createElement('div');
      logoDiv.className = 'fav-logo';
      if (item.stream_icon || item.logo || item.cover) {
        const img = document.createElement('img');
        img.src = item.stream_icon || item.logo || item.cover;
        img.onerror = () => { logoDiv.textContent = this._initials(item.name); };
        logoDiv.appendChild(img);
      } else {
        logoDiv.textContent = this._initials(item.name);
      }

      const info = document.createElement('div');
      info.className = 'fav-info';
      info.innerHTML = `
        <span class="fav-name">${this._esc(item.name)}</span>
        <span class="fav-type">${item._type}</span>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.title = window.i18n.t('removeFavorite');
      removeBtn.innerHTML = '✕';
      removeBtn.addEventListener('click', () => {
        window.storage.removeFavorite(item._type, item.stream_id || item.id);
        row.remove();
        if (opts.onRemove) opts.onRemove(item);
      });

      const playBtn = document.createElement('button');
      playBtn.className = 'play-btn';
      playBtn.innerHTML = '&#9654;';
      playBtn.addEventListener('click', () => { if (opts.onPlay) opts.onPlay(item); });

      row.appendChild(logoDiv);
      row.appendChild(info);
      row.appendChild(playBtn);
      row.appendChild(removeBtn);
      containerEl.appendChild(row);
    });
  },

  // ----------------------------------------------------------------
  // EPG bar
  // ----------------------------------------------------------------
  renderEpgBar(containerEl, tvgId) {
    if (!window.epg || !window.epg.loaded) {
      containerEl.innerHTML = '';
      return;
    }
    const now  = window.epg.getNow(tvgId);
    const next = window.epg.getNext(tvgId);
    containerEl.innerHTML = `
      <div class="epg-bar">
        <span class="epg-now">${window.i18n.t('epgNow')}: ${now ? this._esc(now.title) : window.i18n.t('noEpg')}</span>
        ${next ? `<span class="epg-next">${window.i18n.t('epgNext')}: ${this._esc(next.title)}</span>` : ''}
      </div>`;
  },

  // ----------------------------------------------------------------
  // Toast notifications
  // ----------------------------------------------------------------
  toast(msg, duration = 2500) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), duration);
  },

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  _initials(name = '') {
    return name.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  },

  _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _gradientFromName(name = '') {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue},50%,20%), hsl(${(hue+40)%360},60%,30%))`;
  },

  // Highlight search terms
  highlightSearch(text, query) {
    if (!query) return this._esc(text);
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return this._esc(text).replace(re, '<mark>$1</mark>');
  },

  // Apply search filter to items
  filterBySearch(items, query, field = 'name') {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(i => (i[field] || '').toLowerCase().includes(q));
  }
};

window.UI = UI;
