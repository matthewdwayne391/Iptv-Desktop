/**
 * IPTV Desktop Player — Preload Script
 * Safely exposes main-process APIs to renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  // ----------------------------------------------------------------
  // Storage — read/write JSON files in userData/data/
  // ----------------------------------------------------------------
  storage: {
    read:   (filename)       => ipcRenderer.invoke('storage:read', filename),
    write:  (filename, data) => ipcRenderer.invoke('storage:write', filename, data),
    delete: (filename)       => ipcRenderer.invoke('storage:delete', filename)
  },

  // ----------------------------------------------------------------
  // File system — open dialog + read local M3U
  // ----------------------------------------------------------------
  dialog: {
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters)
  },
  file: {
    readM3U: (filePath) => ipcRenderer.invoke('file:readM3U', filePath)
  },

  // ----------------------------------------------------------------
  // Logo caching
  // ----------------------------------------------------------------
  logo: {
    cache:      (logoUrl, channelId) => ipcRenderer.invoke('logo:cache', logoUrl, channelId),
    get:        (channelId)          => ipcRenderer.invoke('logo:get', channelId),
    clearCache: ()                   => ipcRenderer.invoke('logo:clearCache')
  },

  // ----------------------------------------------------------------
  // Network fetch (bypasses renderer CORS for M3U URLs and EPG)
  // ----------------------------------------------------------------
  net: {
    fetch: (url, options) => ipcRenderer.invoke('net:fetch', url, options)
  },

  // ----------------------------------------------------------------
  // App utilities
  // ----------------------------------------------------------------
  app: {
    getDataPath: () => ipcRenderer.invoke('app:getDataPath'),
    getVersion:  () => ipcRenderer.invoke('app:getVersion'),
    openExternal:(href) => ipcRenderer.invoke('app:openExternal', href)
  },

  window: {
    navigate: (page) => ipcRenderer.invoke('window:navigate', page)
  }
});
