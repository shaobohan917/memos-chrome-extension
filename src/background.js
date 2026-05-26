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

// Build headers with Bearer token auth (Memos v0.25+)
function buildHeaders(apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

// Resolve the current user ID. Tries multiple strategies since
// Memos API endpoints vary across versions (0.23-0.28).
async function resolveCurrentUserId(apiUrl, apiKey) {
  const cleanApiUrl = apiUrl.replace(/\/+$/, '');

  // Strategy 1: /api/v1/auth/status (v0.25+)
  try {
    const resp = await fetch(`${cleanApiUrl}/api/v1/auth/status`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.name) return data.name;
    }
  } catch { /* ignore */ }

  // Strategy 2: /api/v1/users/me
  try {
    const resp = await fetch(`${cleanApiUrl}/api/v1/users/me`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.name) return data.name;
    }
  } catch { /* ignore */ }

  // Strategy 3: GET workspace profile to get owner
  try {
    const resp = await fetch(`${cleanApiUrl}/api/v1/workspace/profile`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.owner) return data.owner;
    }
  } catch { /* ignore */ }

  // Strategy 4: probe with common user IDs
  for (const id of ['users/1', 'users/101']) {
    try {
      const params = new URLSearchParams({ limit: '1', filter: `creator == "${id}"` });
      const resp = await fetch(`${cleanApiUrl}/api/v1/memos?${params.toString()}`, {
        method: 'GET',
        headers: buildHeaders(apiKey)
      });
      if (resp.ok) {
        const data = await resp.json();
        if ((data.memos || []).length > 0) {
          return id;
        }
      }
    } catch { /* ignore */ }
  }

  throw new Error('Could not resolve current user ID');
}

// Test connection to Memos API
async function testConnection(apiUrl, apiKey) {
  try {
    const cleanApiUrl = apiUrl.replace(/\/+$/, '');

    const response = await fetch(`${cleanApiUrl}/api/v1/memos?limit=1`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
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

    // If we have a token, resolve the current user and filter by creator
    // to include PRIVATE memos that belong to this user
    let filter = '';
    if (apiKey) {
      try {
        const userId = await resolveCurrentUserId(apiUrl, apiKey);
        filter = `creator == "${userId}"`;
      } catch (e) {
        console.warn('Could not resolve user ID, showing public memos only');
      }
    }

    const params = new URLSearchParams({ limit: '10' });
    if (filter) {
      params.set('filter', filter);
    }

    const response = await fetch(`${cleanApiUrl}/api/v1/memos?${params.toString()}`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
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
