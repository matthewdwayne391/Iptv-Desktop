/**
 * M3U / M3U8 Playlist Parser
 * Supports: remote URLs (via main-process net.fetch) and local files (via file.readM3U).
 * Extracts: channel name, group-title, tvg-id, tvg-logo, tvg-name, stream URL.
 */

class M3UParser {

  // ----------------------------------------------------------------
  // Fetch remote M3U URL
  // ----------------------------------------------------------------
  async fetchFromUrl(playlistUrl) {
    let result;
    try {
      result = await window.api.net.fetch(playlistUrl, { timeout: 30000 });
    } catch (err) {
      throw new Error('errM3U');
    }
    if (result.status !== 200) throw new Error('errM3U');
    return this.parse(result.body, playlistUrl);
  }

  // ----------------------------------------------------------------
  // Read local file
  // ----------------------------------------------------------------
  async fetchFromFile(filePath) {
    let content;
    try {
      content = await window.api.file.readM3U(filePath);
    } catch (err) {
      throw new Error('errM3U');
    }
    return this.parse(content, filePath);
  }

  // ----------------------------------------------------------------
  // Core parser
  // ----------------------------------------------------------------
  parse(text, sourceUrl = '') {
    const lines  = text.split(/\r?\n/);
    const result = { channels: [], groups: new Set(), source: sourceUrl };

    if (!lines[0].trim().startsWith('#EXTM3U')) {
      throw new Error('Invalid M3U file — missing #EXTM3U header');
    }

    let currentMeta = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        currentMeta = this._parseExtInf(line);
        continue;
      }

      if (line.startsWith('#')) continue;

      if (currentMeta) {
        const channel = {
          id:        String(result.channels.length + 1),
          stream_id: String(result.channels.length + 1),
          name:      currentMeta.name     || 'Unknown',
          group:     currentMeta.group    || 'Uncategorized',
          category_id: currentMeta.group  || 'Uncategorized',
          logo:      currentMeta.logo     || '',
          stream_icon: currentMeta.logo   || '',
          tvgId:     currentMeta.tvgId    || '',
          tvgName:   currentMeta.tvgName  || currentMeta.name || '',
          streamUrl: line,
          type:      this._detectType(line),
          num:       currentMeta.num      || result.channels.length + 1
        };
        result.channels.push(channel);
        result.groups.add(channel.group);
        currentMeta = null;
      }
    }

    result.groups = Array.from(result.groups).sort();
    return result;
  }

  // ----------------------------------------------------------------
  // Parse #EXTINF line
  // ----------------------------------------------------------------
  _parseExtInf(line) {
    const meta = { name: '', group: '', logo: '', tvgId: '', tvgName: '', num: 0 };

    const commaIdx = line.lastIndexOf(',');
    if (commaIdx >= 0) {
      meta.name = line.substring(commaIdx + 1).trim();
    }

    meta.tvgId   = this._attr(line, 'tvg-id')      || this._attr(line, 'tvg-ID') || '';
    meta.tvgName = this._attr(line, 'tvg-name')    || '';
    meta.logo    = this._attr(line, 'tvg-logo')    || this._attr(line, 'logo') || '';
    meta.group   = this._attr(line, 'group-title') || 'Uncategorized';
    meta.num     = parseInt(this._attr(line, 'tvg-chno') || '0', 10) || 0;

    return meta;
  }

  _attr(line, key) {
    const regex = new RegExp(key + '="([^"]*)"', 'i');
    const match = line.match(regex);
    return match ? match[1].trim() : '';
  }

  _detectType(url) {
    const lower = url.toLowerCase().split('?')[0];
    if (lower.endsWith('.m3u8') || lower.includes('/hls/')) return 'hls';
    if (lower.endsWith('.ts'))   return 'ts';
    if (lower.endsWith('.mp4'))  return 'mp4';
    if (lower.endsWith('.mkv'))  return 'mkv';
    if (lower.endsWith('.avi'))  return 'avi';
    return 'hls';
  }

  // ----------------------------------------------------------------
  // Static: group channel array into { groupName: [channels] } map
  // ----------------------------------------------------------------
  static groupChannels(channels) {
    const groups = {};
    channels.forEach(ch => {
      const g = ch.group || 'Uncategorized';
      if (!groups[g]) groups[g] = [];
      groups[g].push(ch);
    });
    return groups;
  }
}

// Expose both the instance (for method calls) and the class (for static methods)
window.m3uParser  = new M3UParser();
window.M3UParser  = M3UParser;
