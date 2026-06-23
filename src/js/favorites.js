/**
 * Favorites Manager — delegates to storage, fires UI events.
 */

class Favorites {

  async toggle(type, item) {
    const isFav = await window.storage.isFavorite(type, item.id);
    if (isFav) {
      await window.storage.removeFavorite(type, item.id);
    } else {
      await window.storage.addFavorite(type, item);
    }
    this._notify(type, item.id, !isFav);
    return !isFav;
  }

  async isFavorite(type, id) {
    return window.storage.isFavorite(type, id);
  }

  async getAll() {
    return window.storage.getFavorites();
  }

  _notify(type, id, state) {
    document.dispatchEvent(new CustomEvent('favorites:change', {
      detail: { type, id, state }
    }));
  }

  // Update star icons after renders
  async refreshUI() {
    const favs = await this.getAll();
    document.querySelectorAll('[data-fav-id]').forEach(async el => {
      const type = el.dataset.favType;
      const id   = el.dataset.favId;
      const list = (favs[type] || []);
      const isFav = list.some(i => String(i.id) === String(id));
      el.classList.toggle('active', isFav);
      el.title = isFav ? window.i18n.t('removeFavorite') : window.i18n.t('addFavorite');
    });
  }
}

window.favorites = new Favorites();
