// Background service worker for Memos Notes Chrome Extension
// This file runs in the background to handle extension lifecycle events

// Install event - runs when the extension is first installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Memos Notes extension installed');

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
    return true;
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
    return true;
  }

  if (request.action === 'loadNotes') {
    loadNotes(request.apiUrl, request.apiKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'addNote') {
    addNote(request.apiUrl, request.apiKey, request.content)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Build headers with Bearer token auth (Memos v0.25+)
function buildHeaders(apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

// Test connection to Memos API
async function testConnection(apiUrl, apiKey) {
  try {
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');

    const response = await fetch(`${cleanApiUrl}/api/v1/memos?limit=1`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
    });

    if (response.ok) {
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
// With Bearer token auth, Memos returns all memos for the authenticated user,
// including PRIVATE ones. No CEL filter needed.
async function loadNotes(apiUrl, apiKey) {
  try {
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');

    const params = new URLSearchParams({ limit: '10' });
    const response = await fetch(`${cleanApiUrl}/api/v1/memos?${params.toString()}`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const memos = data.memos || [];

    // Normalize field names: Memos v0.28 uses 'content', older versions use different names
    const notes = memos.map(memo => ({
      ...memo,
      content: memo.content || '',
      createTime: memo.createTime || memo.createdTs || memo.createdAt || memo.created_at || Date.now()
    }));

    return { success: true, notes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Add note to Memos API
async function addNote(apiUrl, apiKey, content) {
  try {
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');

    const response = await fetch(`${cleanApiUrl}/api/v1/memos`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        content,
        visibility: 'PUBLIC'
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
