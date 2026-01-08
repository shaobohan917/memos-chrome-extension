// State management
let notes = [];
let isLoading = false;

// DOM Elements (will be initialized after DOM is ready)
let noteInput, addBtn, refreshBtn, settingsBtn, notesList, statusMessage;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM elements after DOM is ready
  noteInput = document.getElementById('noteInput');
  addBtn = document.getElementById('addBtn');
  refreshBtn = document.getElementById('refreshBtn');
  settingsBtn = document.getElementById('settingsBtn');
  notesList = document.getElementById('notesList');
  statusMessage = document.getElementById('statusMessage');

  // Attach event listeners
  addBtn.addEventListener('click', addNote);
  refreshBtn.addEventListener('click', loadNotes);
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
    showStatus('请先配置 API 地址', 'error');
    notesList.innerHTML = `
      <div class="config-prompt">
        <p>未配置 API 设置</p>
        <button class="btn-secondary" id="goToSettings">去设置</button>
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

  try {
    const config = await getConfig();
    if (!config.apiUrl) {
      showStatus('请先配置 API 地址', 'error');
      return;
    }

    showLoading();

    const headers = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.apiUrl}/api/v1/memos?rowStatus=NORMAL&limit=10`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    notes = data.memos || [];
    console.log('Notes loaded:', notes.length, notes);

    if (notes.length === 0) {
      notesList.innerHTML = '<div class="empty-state">暂无笔记，开始记录吧！</div>';
    } else {
      renderNotes();
    }

    hideStatus();
  } catch (error) {
    console.error('Load notes error:', error);
    notesList.innerHTML = `
      <div class="error-state">
        <p>加载失败</p>
        <p class="error-detail">${error.message}</p>
        <button class="btn-secondary" id="retryBtn">重试</button>
      </div>
    `;
    document.getElementById('retryBtn')?.addEventListener('click', loadNotes);
    showStatus('加载失败: ' + error.message, 'error');
  } finally {
    isLoading = false;
  }
}

// Add new note
async function addNote() {
  const content = noteInput.value.trim();
  if (!content) {
    showStatus('请输入笔记内容', 'warning');
    return;
  }

  const config = await getConfig();
  if (!config.apiUrl) {
    showStatus('请先配置 API 地址', 'error');
    return;
  }

  try {
    addBtn.disabled = true;
    addBtn.textContent = '添加中...';

    const headers = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(`${config.apiUrl}/api/v1/memos`, {
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

    noteInput.value = '';
    showStatus('笔记已添加', 'success');
    await loadNotes();
  } catch (error) {
    console.error('Add note error:', error);
    showStatus('添加失败: ' + error.message, 'error');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = '添加笔记';
  }
}

// Render notes list
function renderNotes() {
  notesList.innerHTML = notes.map(note => `
    <div class="note-item">
      <div class="note-content">${escapeHtml(note.content || '')}</div>
      <div class="note-meta">
        <span class="note-date">${formatDate(note.createTime || note.createdTs || note.created_at || note.createdAt || Date.now())}</span>
      </div>
    </div>
  `).join('');
}

// Show loading state
function showLoading() {
  notesList.innerHTML = '<div class="loading">加载中...</div>';
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
    return '刚刚';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    return Math.floor(diff / 60000) + ' 分钟前';
  }

  // Less than 1 day
  if (diff < 86400000) {
    return Math.floor(diff / 3600000) + ' 小时前';
  }

  // Less than 1 week
  if (diff < 604800000) {
    return Math.floor(diff / 86400000) + ' 天前';
  }

  // Format as date
  return d.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  });
}
