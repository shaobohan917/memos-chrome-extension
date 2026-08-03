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

  if (request.action === 'searchNotes') {
    searchNotes(request.apiUrl, request.apiKey, request.query)
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
    const notes = normalizeMemos(data.memos || []);

    return { success: true, notes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Search all memos through the Memos API, including archived memos.
async function searchNotes(apiUrl, apiKey, query) {
  try {
    const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
    if (!normalizedQuery) return { success: true, notes: [] };

    const [normalMemos, archivedMemos] = await Promise.all([
      listAllMemos(apiUrl, apiKey, 'NORMAL'),
      listAllMemos(apiUrl, apiKey, 'ARCHIVED')
    ]);
    const notes = [...normalMemos, ...archivedMemos]
      .filter(memo => memo.content.toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => getMemoTime(b) - getMemoTime(a));

    return { success: true, notes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function listAllMemos(apiUrl, apiKey, state) {
  const cleanApiUrl = apiUrl.replace(/\/+$/, '');
  const memos = [];
  const seenPageTokens = new Set();
  let pageToken = '';

  while (true) {
    const params = new URLSearchParams({
      pageSize: '1000',
      state,
      orderBy: 'create_time desc'
    });
    if (pageToken) {
      if (seenPageTokens.has(pageToken)) {
        throw new Error('API 返回了重复的分页令牌');
      }
      seenPageTokens.add(pageToken);
      params.set('pageToken', pageToken);
    }

    const response = await fetch(`${cleanApiUrl}/api/v1/memos?${params.toString()}`, {
      method: 'GET',
      headers: buildHeaders(apiKey)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    memos.push(...normalizeMemos(data.memos || []));
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }

  return memos;
}

function getMemoTime(memo) {
  const value = memo.createTime || memo.createdTs || memo.created_at || memo.createdAt || 0;
  const timestamp = typeof value === 'number' && value < 10000000000 ? value * 1000 : value;
  return new Date(timestamp).getTime() || 0;
}

function normalizeMemos(memos) {
  // Normalize field names: Memos v0.28 uses 'content', older versions use different names
  return memos.map(memo => ({
    ...memo,
    content: memo.content || '',
    createTime: memo.createTime || memo.createdTs || memo.createdAt || memo.created_at || Date.now()
  }));
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
