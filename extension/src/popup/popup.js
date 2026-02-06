/**
 * Popup UI Script
 * Handles user interactions in the extension popup
 */

console.log('[CogniClear] Popup script loaded');

// DOM elements
const toggleButton = document.getElementById('toggle-button');
const buttonText = document.getElementById('button-text');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const apiEndpointInput = document.getElementById('api-endpoint');
const saveSettingsButton = document.getElementById('save-settings');
const clearCacheButton = document.getElementById('clear-cache');
const cacheInfo = document.getElementById('cache-info');
const statsSection = document.getElementById('stats-section');
const processingTimeEl = document.getElementById('processing-time');
const elementsCountEl = document.getElementById('elements-count');
const cachedStatusEl = document.getElementById('cached-status');

// State
let currentState = {
  isSimplified: false,
  isProcessing: false
};

/**
 * Initialize popup
 */
async function init() {
  // Load saved settings
  const settings = await chrome.storage.sync.get(['apiEndpoint']);
  if (settings.apiEndpoint) {
    apiEndpointInput.value = settings.apiEndpoint;
  }
  
  // Get current tab state
  await updateState();
  
  // Update cache info
  updateCacheInfo();
}

/**
 * Update current state from content script
 */
async function updateState() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' });
    
    currentState.isSimplified = response.isSimplified;
    updateUI();
    
  } catch (error) {
    console.log('[CogniClear] Could not get state:', error);
    setStatus('inactive', 'Not Available');
  }
}

/**
 * Update UI based on current state
 */
function updateUI() {
  if (currentState.isProcessing) {
    toggleButton.disabled = true;
    buttonText.textContent = 'Processing...';
    setStatus('inactive', 'Processing');
  } else if (currentState.isSimplified) {
    toggleButton.disabled = false;
    buttonText.textContent = 'Show Original Page';
    setStatus('active', 'Simplified View Active');
  } else {
    toggleButton.disabled = false;
    buttonText.textContent = 'Simplify This Page';
    setStatus('ready', 'Ready');
  }
}

/**
 * Set status indicator
 */
function setStatus(state, text) {
  statusText.textContent = text;
  statusDot.className = 'status-dot';
  
  if (state === 'active') {
    statusDot.classList.add('active');
  } else if (state === 'error') {
    statusDot.classList.add('error');
  } else if (state === 'inactive') {
    statusDot.classList.add('inactive');
  }
}

/**
 * Toggle simplified view
 */
async function toggleSimplifiedView() {
  try {
    currentState.isProcessing = true;
    updateUI();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { 
      type: 'TOGGLE_SIMPLIFIED' 
    });
    
    if (response.success) {
      currentState.isSimplified = response.state === 'simplified';
      currentState.isProcessing = false;
      updateUI();
      
      // Show success message
      if (response.state === 'simplified') {
        setStatus('active', 'Simplified View Active');
      } else {
        setStatus('ready', 'Original View Restored');
      }
    } else {
      throw new Error(response.error || 'Failed to toggle view');
    }
    
  } catch (error) {
    console.error('[CogniClear] Error toggling view:', error);
    currentState.isProcessing = false;
    setStatus('error', 'Error: ' + error.message);
    updateUI();
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  const apiEndpoint = apiEndpointInput.value.trim();
  
  if (!apiEndpoint) {
    alert('Please enter a valid API endpoint');
    return;
  }
  
  try {
    await chrome.storage.sync.set({ apiEndpoint });
    
    // Show success feedback
    const originalText = saveSettingsButton.textContent;
    saveSettingsButton.textContent = 'Saved!';
    saveSettingsButton.style.background = '#10b981';
    saveSettingsButton.style.color = 'white';
    saveSettingsButton.style.borderColor = '#10b981';
    
    setTimeout(() => {
      saveSettingsButton.textContent = originalText;
      saveSettingsButton.style.background = '';
      saveSettingsButton.style.color = '';
      saveSettingsButton.style.borderColor = '';
    }, 2000);
    
  } catch (error) {
    console.error('[CogniClear] Error saving settings:', error);
    alert('Failed to save settings');
  }
}

/**
 * Clear cache
 */
async function clearCache() {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
    
    // Show success feedback
    const originalText = clearCacheButton.textContent;
    clearCacheButton.textContent = 'Cleared!';
    
    setTimeout(() => {
      clearCacheButton.textContent = originalText;
      updateCacheInfo();
    }, 2000);
    
  } catch (error) {
    console.error('[CogniClear] Error clearing cache:', error);
  }
}

/**
 * Update cache info
 */
async function updateCacheInfo() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_SIZE' });
    cacheInfo.textContent = `(${response.size} pages cached)`;
  } catch (error) {
    console.error('[CogniClear] Error getting cache size:', error);
  }
}

/**
 * Event listeners
 */
toggleButton.addEventListener('click', toggleSimplifiedView);
saveSettingsButton.addEventListener('click', saveSettings);
clearCacheButton.addEventListener('click', clearCache);

// Initialize on load
init();

console.log('[CogniClear] Popup initialized');
