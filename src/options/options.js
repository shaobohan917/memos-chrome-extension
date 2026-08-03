// DOM Elements
const settingsForm = document.getElementById('settingsForm');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const testBtn = document.getElementById('testBtn');
const statusMessage = document.getElementById('statusMessage');
const t = (key, substitutions) => memosI18n.getMessage(key, substitutions);

memosI18n.applyTranslations();

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
    showStatus(t('enterApiUrl'), 'error');
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
      showStatus(t('settingsSaved'), 'success');
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
    showStatus(t('enterApiUrlFirst'), 'error');
    return;
  }

  try {
    testBtn.disabled = true;
    testBtn.textContent = t('testing');
    showStatus(t('testingConnection'), 'info');

    // Send message to background service worker to test connection
    const response = await chrome.runtime.sendMessage({
      action: 'testConnection',
      apiUrl: apiUrl,
      apiKey: apiKey
    });

    if (!response) {
      showStatus(t('connectionFailedNoResponse'), 'error');
    } else if (response.success) {
      showStatus(response.message, 'success');
    } else {
      showStatus(t('connectionFailedStatus', response.error), 'error');
    }
  } catch (error) {
    showStatus(t('connectionFailedStatus', error.message), 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = t('testConnection');
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
