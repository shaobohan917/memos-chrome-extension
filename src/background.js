// Background service worker for Memos Notes Chrome Extension
// This file runs in the background to handle extension lifecycle events

// Install event - runs when the extension is first installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Memos Notes extension installed');

    // Set default empty settings
    chrome.storage.local.set({
      apiUrl: '',
      apiKey: ''
    }, () => {
      console.log('Default settings initialized');
    });
  } else if (details.reason === 'update') {
    console.log('Memos Notes extension updated to version:', chrome.runtime.getManifest().version);
  }
});

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    chrome.storage.local.get(['apiUrl', 'apiKey'], (result) => {
      sendResponse({
        apiUrl: result.apiUrl || '',
        apiKey: result.apiKey || ''
      });
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'setConfig') {
    chrome.storage.local.set({
      apiUrl: request.apiUrl,
      apiKey: request.apiKey
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Memos Notes extension started');
});
