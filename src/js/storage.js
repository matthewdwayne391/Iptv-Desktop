/**
 * Storage Manager — wraps window.api.storage
 * Caches reads in memory to minimize IPC round-trips.
 */

class Storage {
  constructor() {
    this._cache = {};
  }

  async read(filename) {
    if (this._cache[filename] !== undefined) return this._cache[filename];
    const data = await window.api.storage.read(filename);
    this._cache[filename] = data;
    return data;
  }

  async write(filename, data) {
    this._cache[filename] = data;
    return window.api.storage.write(filename, data);
  }

  invalidate(filename) {
    delete this._cache[filename];
  }

  // Accounts
  async getAccounts() {
    const data = await this.read('accounts.json');
    return Array.isArray(data) ? data : [];
  }

  async saveAccount(account) {
    const accounts = await this.getAccounts();
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx >= 0) {
      accounts[idx] = account;
    } else {
      account.id = account.id || Date.now().toString();
      account.addedAt = new Date().toISOString();
      accounts.push(account);
    }
    return this.write('accounts.json', accounts);
  }

  async removeAccount(accountId) {
    const accounts = await this.getAccounts();
    const filtered = accounts.filter(a => a.id !== accountId);
    return this.write('accounts.json', filtered);
  }

  async setActiveAccount(accountId) {
    const accounts = await this.getAccounts();
    accounts.forEach(a => { a.active = (a.id === accountId); });
    return this.write('accounts.json', accounts);
  }

  async getActiveAccount() {
    const accounts = await this.getAccounts();
    return accounts.find(a => a.active) || accounts[0] || null;
  }

  // Favorites
  async getFavorites() {
    const data = await this.read('favorites.json');
    return data || { channels: [], movies: [], series: [] };
  }

  async saveFavorites(favorites) {
    return this.write('favorites.json', favorites);
  }

  async isFavorite(type, id) {
    const favs = await this.getFavorites();
    const list = favs[type] || [];
    return list.some(item => String(item.id) === String(id));
  }

  async addFavorite(type, item) {
    const favs = await this.getFavorites();
    if (!favs[type]) favs[type] = [];
    const exists = favs[type].some(i => String(i.id) === String(item.id));
    if (!exists) {
      favs[type].push({ ...item, addedAt: new Date().toISOString() });
      await this.saveFavorites(favs);
    }
    return true;
  }

  async removeFavorite(type, id) {
    const favs = await this.getFavorites();
    if (!favs[type]) return;
    favs[type] = favs[type].filter(i => String(i.id) !== String(id));
    return this.saveFavorites(favs);
  }

  // Settings
  async getSettings() {
    const data = await this.read('settings.json');
    return data || {
      language: 'en',
      theme: 'dark',
      playerBufferSize: 30,
      playerQuality: 'auto',
      autoReconnect: true,
      epgUrl: '',
      logoCache: true
    };
  }

  async saveSettings(settings) {
    return this.write('settings.json', settings);
  }
}

window.storage = new Storage();
