// DOM Elements
const settingsForm = document.getElementById('settingsForm');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const testBtn = document.getElementById('testBtn');
const statusMessage = document.getElementById('statusMessage');

// Initialize: Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['apiUrl', 'apiKey'], (result) => {
    if (result.apiUrl) {
      apiUrlInput.value = result.apiUrl;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });
});

// Save settings
settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const apiUrl = apiUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  // Validate API URL
  if (!apiUrl) {
    showStatus('请输入 API 地址', 'error');
    return;
  }

  // Remove trailing slash
  const cleanApiUrl = apiUrl.replace(/\/+$/, '');

  // Save to storage
  chrome.storage.local.set(
    {
      apiUrl: cleanApiUrl,
      apiKey: apiKey
    },
    () => {
      showStatus('设置已保存', 'success');
      // Update input with cleaned URL
      apiUrlInput.value = cleanApiUrl;
    }
  );
});

// Test connection
testBtn.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!apiUrl) {
    showStatus('请先输入 API 地址', 'error');
    return;
  }

  try {
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';
    showStatus('正在测试连接...', 'info');

    // Send message to background service worker to test connection
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      apiUrl: apiUrl,
      apiKey: apiKey
    });

    if (!response) {
      showStatus('连接失败: 未收到响应', 'error');
    } else if (response.success) {
      showStatus(response.message, 'success');
    } else {
      showStatus(`连接失败: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus(`连接失败: ${error.message}`, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '测试连接';
  }
});

// Show status message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  setTimeout(() => {
    hideStatus();
  }, 5000);
}

function hideStatus() {
  statusMessage.className = 'status-message hidden';
}
