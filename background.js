// Background script for the Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({
    globalEnabled: true,
    cornerRadius: 12,
    disabledSites: [],
    excludedSelectors: [],
    visitedSites: []
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

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle inspector mode toggle messages
  if (message.action === 'inspectorToggled') {
    // Forward message to popup if it's open
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might not be open, ignore error
    });
  }
  
  sendResponse({ success: true });
});

// Clean up old visit data periodically (keep only last 100 sites)
chrome.storage.sync.get(['visitedSites']).then(result => {
  const visitedSites = result.visitedSites || [];
  if (visitedSites.length > 100) {
    const trimmedSites = visitedSites.slice(-100);
    chrome.storage.sync.set({ visitedSites: trimmedSites });
  }
});