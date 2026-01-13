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

  if (request.action === 'testConnection') {
    testConnection(request.apiUrl, request.apiKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'loadNotes') {
    loadNotes(request.apiUrl, request.apiKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'addNote') {
    addNote(request.apiUrl, request.apiKey, request.content)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Test connection to Memos API
async function testConnection(apiUrl, apiKey) {
  try {
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');
    const headers = {
      'Content-Type': 'application/json'
    };

    // Memos uses Cookie for authentication
    if (apiKey) {
      headers['Cookie'] = `memos.access-token=${apiKey}`;
    }

    const response = await fetch(`${cleanApiUrl}/api/v1/memos?limit=1`, {
      method: 'GET',
      headers
    });

    if (response.ok || response.status === 401) {
      return { success: true, message: '连接成功！设置正常工作' };
    } else if (response.status === 404) {
      return { success: true, message: '连接成功，但 API 路径可能不正确' };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Load notes from Memos API
async function loadNotes(apiUrl, apiKey) {
  try {
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');
    const headers = {
      'Content-Type': 'application/json'
    };

    // Memos uses Cookie for authentication
    if (apiKey) {
      headers['Cookie'] = `memos.access-token=${apiKey}`;
    }

    const response = await fetch(`${cleanApiUrl}/api/v1/memos?rowStatus=NORMAL&limit=10`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, notes: data.memos || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Add note to Memos API
async function addNote(apiUrl, apiKey, content) {
  try {
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');
    const headers = {
      'Content-Type': 'application/json'
    };

    // Memos uses Cookie for authentication
    if (apiKey) {
      headers['Cookie'] = `memos.access-token=${apiKey}`;
    }

    const response = await fetch(`${cleanApiUrl}/api/v1/memos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content,
        visibility: 'PRIVATE'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Memos Notes extension started');
});
