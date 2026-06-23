/**
 * Video Player — wraps HLS.js for m3u8 streams,
 * falls back to native <video> for mp4/ts/mkv.
 */

class Player {
  constructor(videoEl) {
    this.video      = videoEl;
    this.hls        = null;
    this.currentUrl = '';
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 3000;
    this._retryTimer = null;

    this._onError   = null;
    this._onPlay    = null;
    this._onLoading = null;

    this._attachVideoEvents();
  }

  onError(fn)   { this._onError   = fn; }
  onPlay(fn)    { this._onPlay    = fn; }
  onLoading(fn) { this._onLoading = fn; }

  // ----------------------------------------------------------------
  // Load and play a stream URL
  // ----------------------------------------------------------------
  play(streamUrl) {
    this._clearRetry();
    this.retryCount = 0;
    this.currentUrl = streamUrl;
    this._load(streamUrl);
  }

  _load(streamUrl) {
    this._destroyHls();
    this.video.pause();

    if (this._onLoading) this._onLoading(true);

    const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('/hls/') ||
                  !streamUrl.match(/\.(mp4|mkv|avi|ts)(\?|$)/i);

    if (isHLS && window.Hls && window.Hls.isSupported()) {
      this.hls = new window.Hls({
        enableWorker:      false,
        lowLatencyMode:    false,
        backBufferLength:  30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut:  10000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut:     10000,
        fragLoadingTimeOut:      20000
      });

      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(this.video);

      this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        this.video.play().catch(() => {});
      });

      this.hls.on(window.Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
            this._retry();
          } else {
            this._handleError('Stream error');
          }
        }
      });

    } else {
      // Native playback for mp4, ts, mkv, avi
      this.video.src = streamUrl;
      this.video.load();
      this.video.play().catch(() => this._retry());
    }
  }

  _attachVideoEvents() {
    this.video.addEventListener('playing', () => {
      this.retryCount = 0;
      if (this._onLoading) this._onLoading(false);
      if (this._onPlay)    this._onPlay();
    });

    this.video.addEventListener('waiting', () => {
      if (this._onLoading) this._onLoading(true);
    });

    this.video.addEventListener('error', () => {
      if (!this.hls) this._retry();
    });
  }

  _retry() {
    if (this.retryCount >= this.maxRetries) {
      this._handleError('Max retries exceeded');
      return;
    }
    this.retryCount++;
    if (this._onError) this._onError(`Retrying (${this.retryCount}/${this.maxRetries})…`);

    this._retryTimer = setTimeout(() => {
      if (this.currentUrl) this._load(this.currentUrl);
    }, this.retryDelay);
  }

  _handleError(msg) {
    if (this._onLoading) this._onLoading(false);
    if (this._onError)   this._onError(msg);
  }

  _clearRetry() {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
  }

  _destroyHls() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  stop() {
    this._clearRetry();
    this._destroyHls();
    this.video.pause();
    this.video.src = '';
    this.currentUrl = '';
  }

  setVolume(v) {
    this.video.volume = Math.max(0, Math.min(1, v));
  }

  getVolume() { return this.video.volume; }

  toggleMute() {
    this.video.muted = !this.video.muted;
    return this.video.muted;
  }

  toggleFullscreen(container) {
    const el = container || this.video;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  setBufferLength(seconds) {
    if (this.hls) {
      this.hls.config.maxMaxBufferLength = seconds;
    }
  }
}

window.Player = Player;
