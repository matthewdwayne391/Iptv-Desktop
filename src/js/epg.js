/**
 * EPG — XMLTV parser and matcher
 * Fetches XMLTV data from a URL and provides now/next lookups.
 */

class EPG {
  constructor() {
    this.programmes = {}; // tvg-id → [{start, stop, title, desc}]
    this.loaded     = false;
  }

  async load(epgUrl) {
    if (!epgUrl) return false;
    try {
      const result = await window.api.net.fetch(epgUrl, { timeout: 20000 });
      if (result.status !== 200) return false;
      this._parse(result.body);
      this.loaded = true;
      return true;
    } catch {
      return false;
    }
  }

  _parse(xml) {
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(xml, 'text/xml');
    const progs   = doc.querySelectorAll('programme');
    this.programmes = {};

    progs.forEach(prog => {
      const channel = prog.getAttribute('channel') || '';
      const start   = this._parseTime(prog.getAttribute('start'));
      const stop    = this._parseTime(prog.getAttribute('stop'));
      const titleEl = prog.querySelector('title');
      const descEl  = prog.querySelector('desc');
      const title   = titleEl ? titleEl.textContent.trim() : '';
      const desc    = descEl  ? descEl.textContent.trim()  : '';

      if (!channel || !start || !title) return;

      if (!this.programmes[channel]) this.programmes[channel] = [];
      this.programmes[channel].push({ start, stop, title, desc });
    });

    // Sort by start time
    Object.values(this.programmes).forEach(list => {
      list.sort((a, b) => a.start - b.start);
    });
  }

  _parseTime(str) {
    if (!str) return null;
    // Format: YYYYMMDDHHmmss [+HHMM]
    const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
    if (!m) return null;
    const isoStr = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] || '+0000'}`;
    return new Date(isoStr).getTime();
  }

  getNow(tvgId) {
    if (!tvgId || !this.programmes[tvgId]) return null;
    const now  = Date.now();
    return this.programmes[tvgId].find(p => p.start <= now && (!p.stop || p.stop > now)) || null;
  }

  getNext(tvgId) {
    if (!tvgId || !this.programmes[tvgId]) return null;
    const now  = Date.now();
    return this.programmes[tvgId].find(p => p.start > now) || null;
  }

  getSchedule(tvgId, limit = 5) {
    if (!tvgId || !this.programmes[tvgId]) return [];
    const now = Date.now();
    return this.programmes[tvgId]
      .filter(p => !p.stop || p.stop > now)
      .slice(0, limit);
  }
}

window.epg = new EPG();
