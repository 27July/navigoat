/**
 * Content Script - Extracts interactive elements from webpage
 * Runs on every webpage to identify buttons, links, and actionable elements
 */

console.log('[CogniClear] Content script loaded');

// State management
let isSimplified = false;
let originalElements = [];
let simplifiedData = null;

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
 * Send elements to background script for AI processing
 */
async function processPage() {
  try {
    console.log('[CogniClear] Starting page processing...');
    
    const elements = extractInteractiveElements();
    
    if (elements.length === 0) {
      console.warn('[CogniClear] No interactive elements found');
      return null;
    }
    
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      type: 'PROCESS_ELEMENTS',
      payload: {
        elements,
        pageUrl: window.location.href,
        pageTitle: document.title
      }
    });
    
    console.log('[CogniClear] Received processed data:', response);
    return response;
    
  } catch (error) {
    console.error('[CogniClear] Error processing page:', error);
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
      // Process page if not already processed
      if (!simplifiedData) {
        processPage().then(data => {
          if (data && data.success) {
            simplifiedData = data.simplified;
            showSimplifiedOverlay(simplifiedData);
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
 * Show simplified overlay
 */
function showSimplifiedOverlay(data) {
  // Remove existing overlay if present
  hideSimplifiedOverlay();
  
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'cogniclear-overlay';
  overlay.className = 'cogniclear-overlay';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'cogniclear-header';
  header.innerHTML = `
    <h2>CogniClear - Simplified View</h2>
    <button id="cogniclear-close" class="cogniclear-close-btn">✕ Close</button>
  `;
  overlay.appendChild(header);
  
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
  
  // Create category sections
  Object.entries(categories).forEach(([category, items]) => {
    if (items.length === 0) return;
    
    const section = document.createElement('div');
    section.className = 'cogniclear-category';
    
    const categoryTitle = document.createElement('h3');
    categoryTitle.className = 'cogniclear-category-title';
    categoryTitle.textContent = category;
    section.appendChild(categoryTitle);
    
    const itemsList = document.createElement('div');
    itemsList.className = 'cogniclear-items';
    
    items.forEach(item => {
      const itemButton = document.createElement('button');
      itemButton.className = 'cogniclear-item';
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
    
    section.appendChild(itemsList);
    overlay.appendChild(section);
  });
  
  // Add close button handler
  overlay.querySelector('#cogniclear-close').addEventListener('click', () => {
    hideSimplifiedOverlay();
    isSimplified = false;
  });
  
  document.body.appendChild(overlay);
  console.log('[CogniClear] Overlay displayed');
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
console.log('[CogniClear] Content script initialized');
