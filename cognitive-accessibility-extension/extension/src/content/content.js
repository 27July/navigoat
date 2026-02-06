/**
 * Content Script - Extracts interactive elements from webpage with progressive updates
 * Runs on every webpage to identify buttons, links, and actionable elements
 */

console.log('[CogniClear] Content script loaded');

// State management
let isSimplified = false;
let originalElements = [];
let simplifiedData = null;
let processingInProgress = false;

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
    console.log('[CogniClear] Processing already in progress');
    return null;
  }
  
  try {
    processingInProgress = true;
    console.log('[CogniClear] Starting progressive page processing...');
    
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
  console.log('[CogniClear] Received message:', message);
  
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
    <h2>CogniClear - Simplified View</h2>
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
      itemButton.addEventListener('click', () => {
        const originalElement = document.querySelector(`[data-cogni-id="${item.id}"]`) || 
                               document.getElementById(item.id);
        if (originalElement) {
          originalElement.click();
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
  
  console.log('[CogniClear] Overlay updated with data');
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
    <h2>CogniClear - Simplified View</h2>
    <button id="cogniclear-close" class="cogniclear-close-btn">✕ Close</button>
  `;
  overlay.appendChild(header);
  
  overlay.querySelector('#cogniclear-close').addEventListener('click', () => {
    hideSimplifiedOverlay();
    isSimplified = false;
  });
  
  document.body.appendChild(overlay);
  
  updateOverlayWithData(data, false);
}

/**
 * Hide simplified overlay
 */
function hideSimplifiedOverlay() {
  const overlay = document.getElementById('cogniclear-overlay');
  if (overlay) {
    overlay.remove();
    console.log('[CogniClear] Overlay hidden');
  }
}

// Initialize
console.log('[CogniClear] Content script initialized with progressive updates');
