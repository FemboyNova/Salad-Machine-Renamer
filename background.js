chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'update') {
    chrome.storage.local.set({ showReleaseNotes: true });
  }
});
