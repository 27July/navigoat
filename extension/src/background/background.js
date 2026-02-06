/**
 * Background Service Worker
 * Handles communication between content script and AI backend
 */

console.log('[CogniClear] Background service worker initialized');

// Configuration
const CONFIG = {
  API_ENDPOINT: 'http://localhost:5000/api/simplify',
  CACHE_DURATION: 1000 * 60 * 30, // 30 minutes
  MAX_RETRIES: 3
};

// In-memory cache
const cache = new Map();

/**
 * Get API endpoint from storage or use default
 */
async function getApiEndpoint() {
  try {
    const result = await chrome.storage.sync.get(['apiEndpoint']);
    return result.apiEndpoint || CONFIG.API_ENDPOINT;
  } catch (error) {
    console.error('[CogniClear] Error getting API endpoint:', error);
    return CONFIG.API_ENDPOINT;
  }
}

/**
 * Generate cache key from page URL
 */
function getCacheKey(pageUrl) {
  // Remove query params and hash for caching
  try {
    const url = new URL(pageUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return pageUrl;
  }
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cacheEntry) {
  if (!cacheEntry) return false;
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CONFIG.CACHE_DURATION;
}

/**
 * Process elements with AI backend
 */
async function processElements(elements, pageUrl, pageTitle) {
  const cacheKey = getCacheKey(pageUrl);
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (isCacheValid(cachedData)) {
    console.log('[CogniClear] Using cached data for:', cacheKey);
    return {
      success: true,
      simplified: cachedData.data,
      cached: true,
      processingTime: 0
    };
  }
  
  // Call AI backend
  try {
    const apiEndpoint = await getApiEndpoint();
    console.log('[CogniClear] Calling API:', apiEndpoint);
    
    const startTime = Date.now();
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        elements,
        pageUrl,
        pageTitle
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const processingTime = Date.now() - startTime;
    
    console.log(`[CogniClear] API response received in ${processingTime}ms`);
    
    // Cache the result
    cache.set(cacheKey, {
      data: data.simplified,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      simplified: data.simplified,
      cached: false,
      processingTime
    };
    
  } catch (error) {
    console.error('[CogniClear] Error calling API:', error);
    
    // Return fallback categorization
    return {
      success: false,
      error: error.message,
      simplified: fallbackCategorization(elements)
    };
  }
}

/**
 * Fallback categorization using simple rules
 * Used when AI backend is unavailable
 */
function fallbackCategorization(elements) {
  console.log('[CogniClear] Using fallback categorization');
  
  const navigationKeywords = ['menu', 'nav', 'home', 'back', 'next', 'previous', 'page'];
  const actionKeywords = ['submit', 'send', 'save', 'buy', 'purchase', 'download', 'upload', 'delete', 'add', 'create'];
  const helpKeywords = ['help', 'support', 'faq', 'contact', 'about', 'info'];
  
  return elements.map(element => {
    const textLower = (element.text + ' ' + element.ariaLabel).toLowerCase();
    
    let category = 'Action/Task'; // Default
    let simplifiedText = element.text || element.ariaLabel || 'Click here';
    
    // Categorize based on keywords
    if (navigationKeywords.some(kw => textLower.includes(kw))) {
      category = 'Navigation';
    } else if (helpKeywords.some(kw => textLower.includes(kw))) {
      category = 'Help/Support';
    } else if (actionKeywords.some(kw => textLower.includes(kw))) {
      category = 'Action/Task';
    }
    
    // Simple text improvement
    if (simplifiedText.toLowerCase() === 'submit') {
      simplifiedText = 'Submit Form';
    } else if (simplifiedText.toLowerCase() === 'click here') {
      simplifiedText = 'Click to Continue';
    }
    
    return {
      id: element.id,
      originalText: element.text,
      simplifiedText,
      category,
      importance: 'essential'
    };
  });
}

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[CogniClear] Received message:', message.type);
  
  if (message.type === 'PROCESS_ELEMENTS') {
    const { elements, pageUrl, pageTitle } = message.payload;
    
    // Process asynchronously
    processElements(elements, pageUrl, pageTitle)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('[CogniClear] Processing error:', error);
        sendResponse({
          success: false,
          error: error.message,
          simplified: fallbackCategorization(elements)
        });
      });
    
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'CLEAR_CACHE') {
    cache.clear();
    console.log('[CogniClear] Cache cleared');
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_CACHE_SIZE') {
    sendResponse({ size: cache.size });
  }
  
  return true;
});

/**
 * Clear cache periodically
 */
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, value] of cache.entries()) {
    if (!isCacheValid(value)) {
      cache.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`[CogniClear] Cleared ${cleared} expired cache entries`);
  }
}, CONFIG.CACHE_DURATION);

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[CogniClear] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default configuration
    chrome.storage.sync.set({
      apiEndpoint: CONFIG.API_ENDPOINT,
      enabled: true
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: 'https://github.com/27July/navigoat'
    });
  }
});

console.log('[CogniClear] Background service worker ready');
