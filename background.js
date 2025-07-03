// Background script for the Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({
    globalEnabled: true,
    cornerRadius: 12,
    disabledSites: []
  });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically
  // No additional action needed as popup is defined in manifest
});

// Listen for tab updates to refresh content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Content script will automatically run due to manifest configuration
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Currently no background processing needed
  // All logic is handled in content script and popup
  sendResponse({ success: true });
});