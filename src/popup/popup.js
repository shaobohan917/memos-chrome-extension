// State management
let notes = [];
let recentNotes = [];
let searchQuery = '';
let isLoading = false;
let searchDebounceTimer = null;
let searchRequestId = 0;

const t = (key, substitutions) => memosI18n.getMessage(key, substitutions);

// DOM Elements (will be initialized after DOM is ready)
let noteInput, addBtn, refreshBtn, openMemosBtn, searchInput, clearSearchBtn, settingsBtn, notesList, notesTitle, statusMessage;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  memosI18n.applyTranslations();

  // Initialize DOM elements after DOM is ready
  noteInput = document.getElementById('noteInput');
  addBtn = document.getElementById('addBtn');
  refreshBtn = document.getElementById('refreshBtn');
  openMemosBtn = document.getElementById('openMemosBtn');
  searchInput = document.getElementById('searchInput');
  clearSearchBtn = document.getElementById('clearSearchBtn');
  settingsBtn = document.getElementById('settingsBtn');
  notesList = document.getElementById('notesList');
  notesTitle = document.getElementById('notesTitle');
  statusMessage = document.getElementById('statusMessage');

  // Attach event listeners
  addBtn.addEventListener('click', addNote);
  refreshBtn.addEventListener('click', loadNotes);
  openMemosBtn.addEventListener('click', openMemosPage);
  searchInput.addEventListener('input', handleSearchInput);
  clearSearchBtn.addEventListener('click', clearSearch);
  notesList.addEventListener('click', (e) => {
    const noteItem = e.target.closest('.note-item');
    if (noteItem) {
      openNote(noteItem.dataset.noteName);
    }
  });
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  noteInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      addNote();
    }
  });

  await checkConfigAndLoad();
});

// Check configuration and load notes
async function checkConfigAndLoad() {
  const config = await getConfig();
  if (!config.apiUrl) {
    showStatus(t('configureApiFirst'), 'error');
    notesList.innerHTML = `
      <div class="config-prompt">
        <p>${escapeHtml(t('unconfiguredApi'))}</p>
        <button class="btn-secondary" id="goToSettings">${escapeHtml(t('goToSettings'))}</button>
      </div>
    `;
    document.getElementById('goToSettings')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    return;
  }
  await loadNotes();
}

// Get configuration from storage
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiUrl', 'apiKey'], (result) => {
      resolve({
        apiUrl: result.apiUrl || '',
        apiKey: result.apiKey || ''
      });
    });
  });
}

// Load notes from API
async function loadNotes() {
  if (isLoading) return;
  isLoading = true;
  searchRequestId++;

  try {
    const config = await getConfig();
    if (!config.apiUrl) {
      showStatus(t('configureApiFirst'), 'error');
      return;
    }

    showLoading();

    // Send message to background service worker to load recent notes
    const response = await chrome.runtime.sendMessage({
      action: 'loadNotes',
      apiUrl: config.apiUrl,
      apiKey: config.apiKey
    });

    if (!response || !response.success) {
      throw new Error(response?.error || t('responseNotReceived'));
    }

    recentNotes = response.notes || [];
    if (searchQuery) {
      await searchNotes(searchQuery);
    } else {
      notes = recentNotes;
      renderNotes();
      hideStatus();
    }
  } catch (error) {
    notesList.innerHTML = `
      <div class="error-state">
        <p>${escapeHtml(t('loadFailed'))}</p>
        <p class="error-detail">${escapeHtml(error.message)}</p>
        <button class="btn-secondary" id="retryBtn">${escapeHtml(t('retry'))}</button>
      </div>
    `;
    document.getElementById('retryBtn')?.addEventListener('click', loadNotes);
    showStatus(t('loadFailedStatus', error.message), 'error');
  } finally {
    isLoading = false;
  }
}

// Search all notes through the background service worker
async function searchNotes(query) {
  const requestId = ++searchRequestId;
  const config = await getConfig();
  if (!config.apiUrl || requestId !== searchRequestId || query !== searchQuery) return;

  showLoading();

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'searchNotes',
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      query
    });

    if (requestId !== searchRequestId || query !== searchQuery) return;
    if (!response || !response.success) {
      throw new Error(response?.error || t('responseNotReceived'));
    }

    notes = response.notes || [];
    renderNotes();
    hideStatus();
  } catch (error) {
    if (requestId !== searchRequestId || query !== searchQuery) return;

    notesList.innerHTML = `
      <div class="error-state">
        <p>${escapeHtml(t('searchFailed'))}</p>
        <p class="error-detail">${escapeHtml(error.message)}</p>
        <button class="btn-secondary" id="retrySearchBtn">${escapeHtml(t('retrySearch'))}</button>
      </div>
    `;
    document.getElementById('retrySearchBtn')?.addEventListener('click', () => searchNotes(searchQuery));
    showStatus(t('searchFailedStatus', error.message), 'error');
  }
}

function handleSearchInput(event) {
  searchQuery = event.target.value.trim();
  clearSearchBtn.classList.toggle('hidden', !searchQuery);
  notesTitle.textContent = searchQuery ? t('searchResults') : t('recentNotes');
  clearTimeout(searchDebounceTimer);

  if (!searchQuery) {
    searchRequestId++;
    notes = recentNotes;
    renderNotes();
    return;
  }

  searchDebounceTimer = setTimeout(() => searchNotes(searchQuery), 250);
}

// Add new note
async function addNote() {
  const content = noteInput.value.trim();
  if (!content) {
    showStatus(t('enterNoteContent'), 'warning');
    return;
  }

  const config = await getConfig();
  if (!config.apiUrl) {
    showStatus(t('configureApiFirst'), 'error');
    return;
  }

  try {
    addBtn.disabled = true;
    addBtn.textContent = t('addingNote');

    // Send message to background service worker to add note
    const response = await chrome.runtime.sendMessage({
      action: 'addNote',
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      content: content
    });

    if (!response || !response.success) {
      throw new Error(response?.error || t('responseNotReceived'));
    }

    noteInput.value = '';
    showStatus(t('noteAdded'), 'success');
    await loadNotes();
  } catch (error) {
    showStatus(t('addFailedStatus', error.message), 'error');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = t('addNote');
  }
}

// Render notes list
function renderNotes() {
  notesTitle.textContent = searchQuery ? t('searchResults') : t('recentNotes');

  if (notes.length === 0) {
    notesList.innerHTML = searchQuery
      ? `
        <div class="empty-state">
          <p>${escapeHtml(t('noRelatedNotes'))}</p>
          <button class="btn-secondary" id="clearSearchStateBtn">${escapeHtml(t('clearSearch'))}</button>
        </div>
      `
      : `<div class="empty-state">${escapeHtml(t('noNotes'))}</div>`;
    document.getElementById('clearSearchStateBtn')?.addEventListener('click', clearSearch);
    return;
  }

  notesList.innerHTML = notes.map(note => `
    <button type="button" class="note-item" data-note-name="${escapeHtml(note.name || '')}" aria-label="${escapeHtml(t('openNote'))}">
      <div class="note-content">${escapeHtml(note.content || '')}</div>
      <div class="note-meta">
        <span class="note-date">${formatDate(note.createTime || note.createdTs || note.created_at || note.createdAt || Date.now())}</span>
        <span class="note-open-hint">${escapeHtml(t('openNote'))} ↗</span>
      </div>
    </button>
  `).join('');
}

// Clear the current search query
function clearSearch() {
  clearTimeout(searchDebounceTimer);
  searchRequestId++;
  searchQuery = '';
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  notes = recentNotes;
  renderNotes();
}

// Open the configured Memos home page
async function openMemosPage() {
  const config = await getConfig();
  if (!config.apiUrl) {
    showStatus(t('configureApiFirst'), 'error');
    return;
  }

  try {
    await chrome.tabs.create({ url: config.apiUrl });
  } catch (error) {
    showStatus(t('openMemosFailedStatus', error.message), 'error');
  }
}

// Open a specific memo in Memos
async function openNote(noteName) {
  const config = await getConfig();
  const memoUrl = buildMemoUrl(config.apiUrl, noteName);

  if (!memoUrl) {
    showStatus(t('noteUnavailable'), 'warning');
    return;
  }

  try {
    await chrome.tabs.create({ url: memoUrl });
  } catch (error) {
    showStatus(t('openNoteFailedStatus', error.message), 'error');
  }
}

// Memos API names are usually returned as "memos/{id}".
function buildMemoUrl(apiUrl, noteName) {
  const cleanApiUrl = String(apiUrl || '').replace(/\/+$/, '');
  const cleanName = String(noteName || '').replace(/^\/+/, '');
  if (!cleanApiUrl || !cleanName) return '';

  const memoPath = cleanName.startsWith('memos/') ? cleanName : `memos/${cleanName}`;
  return `${cleanApiUrl}/${memoPath}`;
}

// Show loading state
function showLoading() {
  notesList.innerHTML = `<div class="loading">${escapeHtml(t('loading'))}</div>`;
}

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  setTimeout(() => {
    hideStatus();
  }, 3000);
}

function hideStatus() {
  statusMessage.className = 'status-message hidden';
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper: Format date
function formatDate(date) {
  // Memos uses Unix timestamp in seconds, convert to milliseconds
  const timestamp = typeof date === 'number' && date < 10000000000 ? date * 1000 : date;
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now - d;

  // Less than 1 minute
  if (diff < 60000) {
    return t('justNow');
  }

  // Less than 1 hour
  if (diff < 3600000) {
    return t('minutesAgo', Math.floor(diff / 60000));
  }

  // Less than 1 day
  if (diff < 86400000) {
    return t('hoursAgo', Math.floor(diff / 3600000));
  }

  // Less than 1 week
  if (diff < 604800000) {
    return t('daysAgo', Math.floor(diff / 86400000));
  }

  // Format as date
  return new Intl.DateTimeFormat(memosI18n.getLocale(), {
    month: 'short',
    day: 'numeric'
  }).format(d);
}
