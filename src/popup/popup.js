// State management
let notes = [];
let isLoading = false;

// DOM Elements
const noteInput = document.getElementById('noteInput');
const addBtn = document.getElementById('addBtn');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const notesList = document.getElementById('notesList');
const statusMessage = document.getElementById('statusMessage');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkConfigAndLoad();
});

// Event Listeners
addBtn.addEventListener('click', addNote);
refreshBtn.addEventListener('click', loadNotes);
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
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

    const response = await fetch(`${config.apiUrl}/api/notes?limit=10`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    notes = Array.isArray(data) ? data : (data.notes || data.data || []);

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

    const response = await fetch(`${config.apiUrl}/api/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content })
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
      <div class="note-content">${escapeHtml(note.content || note.text || '')}</div>
      <div class="note-meta">
        <span class="note-date">${formatDate(note.created_at || note.createdAt || note.date || Date.now())}</span>
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
  const d = new Date(date);
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

// Handle keyboard shortcut (Ctrl/Cmd + Enter to submit)
noteInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    addNote();
  }
});
