/**
 * Browser API Compatibility Layer
 * Provides a unified interface for Chrome and Firefox extensions
 * Uses 'browser' as the namespace for both Chrome and Firefox
 */

// Firefox uses 'browser', Chrome uses 'chrome'
// We'll normalize to use 'browser' throughout the extension
if (typeof browser === 'undefined') {
  window.browser = chrome;
}

// Convenience helpers for storage that work with both callback-style (Chrome) and Promise-style (Firefox)
function storageGet(keys) {
  try {
    const res = browser.storage.local.get(keys);
    if (res && typeof res.then === 'function') return res;
    return new Promise((resolve) => browser.storage.local.get(keys, resolve));
  } catch (err) {
    return new Promise((resolve, reject) => {
      try {
        browser.storage.local.get(keys, resolve);
      } catch (e) {
        reject(e);
      }
    });
  }
}

function storageSet(obj) {
  try {
    const res = browser.storage.local.set(obj);
    if (res && typeof res.then === 'function') return res;
    return new Promise((resolve) => browser.storage.local.set(obj, resolve));
  } catch (err) {
    return new Promise((resolve, reject) => {
      try {
        browser.storage.local.set(obj, resolve);
      } catch (e) {
        reject(e);
      }
    });
  }
}

// Expose helpers on the global object for convenience
window.storageGet = storageGet;
window.storageSet = storageSet;

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = browser;
}
