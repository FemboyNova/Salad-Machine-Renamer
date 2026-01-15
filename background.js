// Browser API compatibility layer for Chrome and Firefox
if (typeof browser === 'undefined') {
  // In service worker contexts `window` is not available, use globalThis for safety
  globalThis.browser = chrome;
}

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    browser.storage.local.set({ showReleaseNotes: true });
  }
});
