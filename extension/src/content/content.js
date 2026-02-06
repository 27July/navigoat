/**
 * Content Script - Extracts interactive elements from webpage with progressive updates
 * Runs on every webpage to identify buttons, links, and actionable elements
 */

console.log('[Navigoat] Content script loaded');

// State management
let isSimplified = false;
let originalElements = [];
let simplifiedData = null;
let processingInProgress = false;
let currentMode = 'normal'; // Track current accessibility mode

/**
 * Extract all interactive elements from the page
 */
function extractInteractiveElements() {
  const elements = [];
  
  // Query selectors for interactive elements
  const selectors = [
    'button',
    'a[href]',
    'input[type="submit"]',
    'input[type="button"]',
    '[role="button"]',
    '[role="link"]',
    '[onclick]'
  ];
  
  const interactiveElements = document.querySelectorAll(selectors.join(','));
  
  interactiveElements.forEach((element, index) => {
    // Skip hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return;
    }
    
    // Generate unique ID
    const elementId = element.id || `cogni-element-${index}`;
    if (!element.id) {
      element.setAttribute('data-cogni-id', elementId);
    }
    
    // Extract text content
    const text = element.innerText?.trim() || element.textContent?.trim() || element.value || '';
    
    // Extract ARIA labels
    const ariaLabel = element.getAttribute('aria-label') || '';
    const ariaDescribedBy = element.getAttribute('aria-describedby') || '';
    
    // Get parent context
    let parentText = '';
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      const parentContent = Array.from(parent.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .join(' ');
      if (parentContent) {
        parentText = parentContent;
        break;
      }
      parent = parent.parentElement;
      depth++;
    }
    
    // Get element position
    const rect = element.getBoundingClientRect();
    
    // Determine element type
    let elementType = element.tagName.toLowerCase();
    if (element.hasAttribute('role')) {
      elementType = element.getAttribute('role');
    }
    
    elements.push({
      id: elementId,
      text: text.substring(0, 200), // Limit text length
      ariaLabel,
      ariaDescribedBy,
      parentText: parentText.substring(0, 100),
      type: elementType,
      href: element.href || '',
      position: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      isVisible: rect.width > 0 && rect.height > 0
    });
  });
  
  console.log(`[CogniClear] Extracted ${elements.length} interactive elements`);
  return elements;
}

/**
 * Process page with progressive updates (show first 5 buttons immediately)
 */
async function processPageProgressive() {
  if (processingInProgress) {
    console.log('[Navigoat] Processing already in progress');
    return null;
  }
  
  try {
    processingInProgress = true;
    console.log('[Navigoat] Starting progressive page processing...');
    
    const elements = extractInteractiveElements();
    
    if (elements.length === 0) {
      console.warn('[CogniClear] No interactive elements found');
      processingInProgress = false;
      return null;
    }
    
    // Show loading state immediately
    showLoadingOverlay();
    
    // Process first chunk (5 elements) for immediate display
    const firstChunk = elements.slice(0, 5);
    const remainingElements = elements.slice(5);
    
    console.log(`[CogniClear] Processing first ${firstChunk.length} elements...`);
    
    // Send first chunk to background script
    const firstResponse = await chrome.runtime.sendMessage({
      type: 'PROCESS_ELEMENTS_PROGRESSIVE',
      payload: {
        elements: firstChunk,
        pageUrl: window.location.href,
        pageTitle: document.title,
        chunkSize: 5
      }
    });
    
    if (firstResponse && firstResponse.success) {
      console.log(`[CogniClear] First chunk processed in ${firstResponse.processingTime}ms`);
      
      // Show first chunk immediately
      updateOverlayWithData(firstResponse.simplified, true);
      
      // Process remaining elements in background
      if (remainingElements.length > 0) {
        console.log(`[CogniClear] Processing remaining ${remainingElements.length} elements...`);
        
        const remainingResponse = await chrome.runtime.sendMessage({
          type: 'PROCESS_ELEMENTS',
          payload: {
            elements: remainingElements,
            pageUrl: window.location.href,
            pageTitle: document.title
          }
        });
        
        if (remainingResponse && remainingResponse.success) {
          console.log(`[CogniClear] Remaining elements processed in ${remainingResponse.processingTime}ms`);
          
          // Append remaining elements to overlay
          const allData = [...firstResponse.simplified, ...remainingResponse.simplified];
          updateOverlayWithData(allData, false);
          simplifiedData = allData;
        }
      } else {
        simplifiedData = firstResponse.simplified;
      }
    }
    
    processingInProgress = false;
    return { success: true, data: simplifiedData };
    
  } catch (error) {
    console.error('[CogniClear] Error in progressive processing:', error);
    processingInProgress = false;
    return null;
  }
}

/**
 * Listen for messages from background script and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Navigoat] Received message:', message);
  
  if (message.type === 'TOGGLE_SIMPLIFIED') {
    if (isSimplified) {
      hideSimplifiedOverlay();
      isSimplified = false;
      sendResponse({ success: true, state: 'original' });
    } else {
      // Process page with progressive updates
      if (!simplifiedData) {
        processPageProgressive().then(result => {
          if (result && result.success) {
            isSimplified = true;
            sendResponse({ success: true, state: 'simplified' });
          } else {
            sendResponse({ success: false, error: 'Failed to process page' });
          }
        });
        return true; // Async response
      } else {
        showSimplifiedOverlay(simplifiedData);
        isSimplified = true;
        sendResponse({ success: true, state: 'simplified' });
      }
    }
  }
  
  if (message.type === 'GET_STATE') {
    sendResponse({ isSimplified, hasData: !!simplifiedData });
  }
  
  return true;
});

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
  hideSimplifiedOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'cogniclear-overlay';
  overlay.className = 'cogniclear-overlay';
  
  const header = document.createElement('div');
  header.className = 'cogniclear-header';
  header.innerHTML = `
    <div>
      <h2>🐐 Navigoat</h2>
      <div class="navigoat-mode-toggle">
        <button class="navigoat-mode-btn active" data-mode="normal">Normal</button>
        <button class="navigoat-mode-btn" data-mode="dyslexic">Dyslexic</button>
        <button class="navigoat-mode-btn" data-mode="adhd">ADHD</button>
      </div>
    </div>
    <button id="cogniclear-close" class="cogniclear-close-btn">✕ Close</button>
  `;
  overlay.appendChild(header);
  
  const loading = document.createElement('div');
  loading.className = 'cogniclear-loading';
  loading.innerHTML = `
    <div class="cogniclear-spinner"></div>
    <p>Processing first elements...</p>
  `;
  overlay.appendChild(loading);
  
  overlay.querySelector('#cogniclear-close').addEventListener('click', () => {
    hideSimplifiedOverlay();
    isSimplified = false;
  });
  
  // Add mode switching functionality
  setupModeToggle(overlay);
  
  document.body.appendChild(overlay);
}

/**
 * Update overlay with processed data (progressive or complete)
 */
function updateOverlayWithData(data, isPartial = false) {
  let overlay = document.getElementById('cogniclear-overlay');
  
  if (!overlay) {
    showLoadingOverlay();
    overlay = document.getElementById('cogniclear-overlay');
  }
  
  // Remove loading indicator
  const loading = overlay.querySelector('.cogniclear-loading');
  if (loading) {
    loading.remove();
  }
  
  // Remove existing categories (for full refresh)
  if (!isPartial) {
    const existingCategories = overlay.querySelectorAll('.cogniclear-category');
    existingCategories.forEach(cat => cat.remove());
  }
  
  // Group elements by category
  const categories = {
    'Navigation': [],
    'Action/Task': [],
    'Help/Support': []
  };
  
  data.forEach(item => {
    if (categories[item.category]) {
      categories[item.category].push(item);
    }
  });
  
  // Create or update category sections
  Object.entries(categories).forEach(([category, items]) => {
    if (items.length === 0) return;
    
    // Check if category already exists
    let section = overlay.querySelector(`[data-category="${category}"]`);
    
    if (!section) {
      section = document.createElement('div');
      section.className = 'cogniclear-category';
      section.setAttribute('data-category', category);
      
      const categoryTitle = document.createElement('h3');
      categoryTitle.className = 'cogniclear-category-title';
      categoryTitle.textContent = category;
      section.appendChild(categoryTitle);
      
      const itemsList = document.createElement('div');
      itemsList.className = 'cogniclear-items';
      section.appendChild(itemsList);
      
      overlay.appendChild(section);
    }
    
    const itemsList = section.querySelector('.cogniclear-items');
    
    // Add new items
    items.forEach(item => {
      // Check if item already exists
      if (itemsList.querySelector(`[data-item-id="${item.id}"]`)) {
        return;
      }
      
      const itemButton = document.createElement('button');
      itemButton.className = 'cogniclear-item';
      itemButton.setAttribute('data-item-id', item.id);
      itemButton.innerHTML = `
        <span class="cogniclear-item-text">${item.simplifiedText}</span>
        ${item.originalText !== item.simplifiedText ? 
          `<span class="cogniclear-item-original">(was: "${item.originalText}")</span>` : ''}
      `;
      
      // Add click handler to trigger original element
      itemButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        
        const originalElement = document.querySelector(`[data-cogni-id="${item.id}"]`) || 
                               document.getElementById(item.id);
        if (originalElement) {
          // Check if it's a link (navigation)
          if (originalElement.tagName === 'A' && originalElement.href) {
            // For links, open in same tab but keep overlay visible
            // User can close overlay manually if they want
            originalElement.click();
          } else {
            // For buttons/actions, trigger click
            originalElement.click();
          }
          
          // Add visual feedback
          itemButton.style.background = '#e0e7ff';
          setTimeout(() => {
            itemButton.style.background = '';
          }, 300);
        }
      });
      
      itemsList.appendChild(itemButton);
    });
  });
  
  // Add status indicator if partial
  if (isPartial) {
    let statusDiv = overlay.querySelector('.cogniclear-status');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.className = 'cogniclear-status';
      statusDiv.innerHTML = `
        <div class="cogniclear-spinner-small"></div>
        <span>Loading more elements...</span>
      `;
      overlay.insertBefore(statusDiv, overlay.querySelector('.cogniclear-category'));
    }
  } else {
    // Remove status indicator when complete
    const statusDiv = overlay.querySelector('.cogniclear-status');
    if (statusDiv) {
      statusDiv.remove();
    }
  }
  
  console.log('[Navigoat] Overlay updated with data');
}

/**
 * Show simplified overlay (legacy function for cached data)
 */
function showSimplifiedOverlay(data) {
  hideSimplifiedOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'cogniclear-overlay';
  overlay.className = 'cogniclear-overlay';
  
  const header = document.createElement('div');
  header.className = 'cogniclear-header';
  header.innerHTML = `
    <div>
      <h2>🐐 Navigoat</h2>
      <div class="navigoat-mode-toggle">
        <button class="navigoat-mode-btn active" data-mode="normal">Normal</button>
        <button class="navigoat-mode-btn" data-mode="dyslexic">Dyslexic</button>
        <button class="navigoat-mode-btn" data-mode="adhd">ADHD</button>
      </div>
    </div>
    <button id="cogniclear-close" class="cogniclear-close-btn">✕ Close</button>
  `;
  overlay.appendChild(header);
  
  overlay.querySelector('#cogniclear-close').addEventListener('click', () => {
    hideSimplifiedOverlay();
    isSimplified = false;
  });
  
  // Add mode switching functionality
  setupModeToggle(overlay);
  
  document.body.appendChild(overlay);
  
  updateOverlayWithData(data, false);
}

/**
 * Setup mode toggle functionality
 */
function setupModeToggle(overlay) {
  const modeButtons = overlay.querySelectorAll('.navigoat-mode-btn');
  
  // Load saved mode from storage
  chrome.storage.local.get(['accessibilityMode'], (result) => {
    if (result.accessibilityMode) {
      currentMode = result.accessibilityMode;
      setMode(overlay, currentMode);
      
      // Update button states
      modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === currentMode);
      });
    }
  });
  
  // Add click handlers to mode buttons
  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode;
      
      // Update active state
      modeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Apply mode
      setMode(overlay, mode);
      
      // Save mode preference
      currentMode = mode;
      chrome.storage.local.set({ accessibilityMode: mode });
      
      console.log(`[Navigoat] Switched to ${mode} mode`);
    });
  });
}

/**
 * Set accessibility mode
 */
function setMode(overlay, mode) {
  // Remove all mode classes
  overlay.removeAttribute('data-mode');
  
  // Set new mode
  overlay.setAttribute('data-mode', mode);
  
  // Update category elements with data-category attribute for ADHD mode color coding
  const categories = overlay.querySelectorAll('.cogniclear-category');
  categories.forEach(category => {
    const title = category.querySelector('.cogniclear-category-title');
    if (title) {
      const categoryName = title.textContent.trim();
      category.setAttribute('data-category', categoryName);
    }
  });
  
  currentMode = mode;
}

/**
 * Hide simplified overlay
 */
function hideSimplifiedOverlay() {
  const overlay = document.getElementById('cogniclear-overlay');
  if (overlay) {
    overlay.remove();
    console.log('[Navigoat] Overlay hidden');
  }
  // Save state when hiding
  chrome.storage.local.set({ overlayOpen: false });
}

// Detect page navigation and auto-refresh overlay
let lastUrl = window.location.href;
let navigationObserver = null;
let navigationTimeout = null;

function detectNavigation() {
  // Check if URL changed (for SPA navigation)
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    console.log('[Navigoat] Navigation detected:', lastUrl, '→', currentUrl);
    lastUrl = currentUrl;
    
    // Debounce navigation refresh to prevent false triggers from button clicks
    // Wait 1 second to see if page actually loads new content
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }
    
    navigationTimeout = setTimeout(() => {
      // If overlay was open and still exists, refresh it with new page content
      const overlay = document.getElementById('cogniclear-overlay');
      if (isSimplified && overlay) {
        console.log('[Navigoat] Auto-refreshing overlay for new page');
        refreshOverlay();
      }
    }, 1000); // Wait 1 second before refreshing
  }
}

// Refresh overlay with new page content
async function refreshOverlay() {
  // Clear old data
  simplifiedData = null;
  
  // Show loading state
  const overlay = document.getElementById('cogniclear-overlay');
  if (overlay) {
    // Clear existing content but keep header
    const categories = overlay.querySelectorAll('.cogniclear-category, .cogniclear-status, .cogniclear-loading');
    categories.forEach(cat => cat.remove());
    
    // Add loading indicator
    const loading = document.createElement('div');
    loading.className = 'cogniclear-loading';
    loading.innerHTML = `
      <div class="cogniclear-spinner"></div>
      <p>Analyzing new page...</p>
    `;
    overlay.appendChild(loading);
  }
  
  // Process new page
  await processPageProgressive();
}

// Watch for navigation changes (for SPAs)
function startNavigationWatcher() {
  // Method 1: URL change detection (works for SPAs)
  setInterval(detectNavigation, 500);
  
  // Method 2: MutationObserver for DOM changes (backup)
  navigationObserver = new MutationObserver((mutations) => {
    // Check if major DOM changes occurred (likely navigation)
    const significantChanges = mutations.some(mutation => 
      mutation.addedNodes.length > 10 || mutation.removedNodes.length > 10
    );
    
    if (significantChanges && isSimplified) {
      detectNavigation();
    }
  });
  
  navigationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[Navigoat] Navigation watcher started');
}

// Initialize
console.log('[Navigoat] Content script initialized with progressive updates');

// Start watching for navigation
startNavigationWatcher();
