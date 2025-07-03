// Content script for applying rounded corners with enhanced features
class RoundedWebExtension {
  constructor() {
    this.isEnabled = true;
    this.cornerRadius = 12;
    this.currentDomain = window.location.hostname;
    this.observer = null;
    this.debounceTimer = null;
    this.inspectorMode = false;
    this.excludedSelectors = new Set();
    this.processedElements = new WeakSet();
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupMessageListener();
    this.checkFirstVisit();
    this.applyRoundedCorners();
    this.setupMutationObserver();
    this.setupInspectorMode();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'globalEnabled', 
        'cornerRadius', 
        'disabledSites', 
        'excludedSelectors',
        'visitedSites'
      ]);
      
      this.isEnabled = result.globalEnabled !== false;
      this.cornerRadius = result.cornerRadius || 12;
      this.excludedSelectors = new Set(result.excludedSelectors || []);
      
      const disabledSites = result.disabledSites || [];
      const isCurrentSiteDisabled = disabledSites.includes(this.currentDomain);
      
      if (isCurrentSiteDisabled) {
        this.isEnabled = false;
      }
    } catch (error) {
      console.log('RoundedWeb: Using default settings');
    }
  }

  async checkFirstVisit() {
    try {
      const result = await chrome.storage.sync.get(['visitedSites']);
      const visitedSites = result.visitedSites || [];
      
      if (!visitedSites.includes(this.currentDomain)) {
        // First visit - trigger glowing animation
        this.triggerGlowingAnimation();
        
        // Mark site as visited
        visitedSites.push(this.currentDomain);
        await chrome.storage.sync.set({ visitedSites });
      }
    } catch (error) {
      console.log('RoundedWeb: Could not check visit status');
    }
  }

  triggerGlowingAnimation() {
    if (!this.isEnabled) return;

    // Create glowing overlay
    const overlay = document.createElement('div');
    overlay.id = 'rounded-web-glow-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999999;
      background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
        rgba(147, 51, 234, 0.3) 0%, 
        rgba(147, 51, 234, 0.1) 30%, 
        transparent 70%);
      opacity: 0;
      transition: opacity 0.5s ease;
    `;
    
    document.body.appendChild(overlay);
    
    // Animate overlay
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // Apply glowing rounded corners with animation
    this.applyGlowingRoundedCorners();

    // Remove overlay after animation
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 500);
    }, 2000);
  }

  applyGlowingRoundedCorners() {
    const elements = this.getTargetElements();
    
    elements.forEach((element, index) => {
      if (this.shouldApplyRounding(element)) {
        setTimeout(() => {
          this.applyGlowingRoundingToElement(element);
        }, index * 50); // Stagger animation
      }
    });
  }

  applyGlowingRoundingToElement(element) {
    // Create glow effect
    const originalBoxShadow = element.style.boxShadow;
    const glowShadow = `0 0 20px rgba(147, 51, 234, 0.6), 0 0 40px rgba(147, 51, 234, 0.4)`;
    
    element.style.transition = 'border-radius 0.8s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.8s ease';
    element.style.boxShadow = glowShadow;
    element.style.borderRadius = `${this.cornerRadius}px`;
    element.style.overflow = 'hidden';
    element.setAttribute('data-rounded-web', 'true');
    
    // Remove glow after animation
    setTimeout(() => {
      element.style.boxShadow = originalBoxShadow;
      element.style.transition = 'border-radius 0.3s ease';
    }, 1000);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'toggle':
          this.toggleForCurrentSite();
          sendResponse({ success: true });
          break;
        case 'updateRadius':
          this.cornerRadius = message.radius;
          this.applyRoundedCorners();
          sendResponse({ success: true });
          break;
        case 'getStatus':
          sendResponse({ 
            enabled: this.isEnabled,
            radius: this.cornerRadius,
            domain: this.currentDomain,
            excludedCount: this.excludedSelectors.size
          });
          break;
        case 'toggleInspector':
          this.toggleInspectorMode();
          sendResponse({ success: true, inspectorMode: this.inspectorMode });
          break;
        case 'addExcludedSelector':
          this.addExcludedSelector(message.selector);
          sendResponse({ success: true });
          break;
        case 'getExcludedSelectors':
          sendResponse({ selectors: Array.from(this.excludedSelectors) });
          break;
        case 'removeExcludedSelector':
          this.removeExcludedSelector(message.selector);
          sendResponse({ success: true });
          break;
      }
    });
  }

  setupInspectorMode() {
    this.inspectorOverlay = null;
    this.inspectorTooltip = null;
    this.currentHoveredElement = null;
    
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  toggleInspectorMode() {
    this.inspectorMode = !this.inspectorMode;
    
    if (this.inspectorMode) {
      this.startInspectorMode();
    } else {
      this.stopInspectorMode();
    }
  }

  startInspectorMode() {
    // Create inspector overlay
    this.inspectorOverlay = document.createElement('div');
    this.inspectorOverlay.id = 'rounded-web-inspector-overlay';
    this.inspectorOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(147, 51, 234, 0.1);
      z-index: 999998;
      cursor: crosshair;
      backdrop-filter: blur(2px);
    `;
    
    // Create tooltip
    this.inspectorTooltip = document.createElement('div');
    this.inspectorTooltip.id = 'rounded-web-inspector-tooltip';
    this.inspectorTooltip.style.cssText = `
      position: fixed;
      background: rgba(17, 24, 39, 0.95);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-family: monospace;
      z-index: 999999;
      pointer-events: none;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(147, 51, 234, 0.3);
      max-width: 300px;
      word-break: break-all;
    `;
    
    document.body.appendChild(this.inspectorOverlay);
    document.body.appendChild(this.inspectorTooltip);
    
    // Add event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeyPress);
    
    // Show instructions
    this.showInspectorInstructions();
  }

  stopInspectorMode() {
    // Remove overlay and tooltip
    if (this.inspectorOverlay) {
      this.inspectorOverlay.remove();
      this.inspectorOverlay = null;
    }
    
    if (this.inspectorTooltip) {
      this.inspectorTooltip.remove();
      this.inspectorTooltip = null;
    }
    
    // Remove highlight
    if (this.currentHoveredElement) {
      this.removeElementHighlight(this.currentHoveredElement);
      this.currentHoveredElement = null;
    }
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyPress);
  }

  handleMouseMove(e) {
    if (!this.inspectorMode) return;
    
    // Update tooltip position
    this.inspectorTooltip.style.left = (e.clientX + 10) + 'px';
    this.inspectorTooltip.style.top = (e.clientY + 10) + 'px';
    
    // Get element under cursor (excluding overlay)
    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
    
    if (elementUnderCursor && elementUnderCursor !== this.currentHoveredElement) {
      // Remove previous highlight
      if (this.currentHoveredElement) {
        this.removeElementHighlight(this.currentHoveredElement);
      }
      
      // Add new highlight
      this.currentHoveredElement = elementUnderCursor;
      this.addElementHighlight(elementUnderCursor);
      
      // Update tooltip
      this.updateTooltip(elementUnderCursor);
    }
  }

  handleClick(e) {
    if (!this.inspectorMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (element) {
      const selector = this.generateSelector(element);
      this.addExcludedSelector(selector);
      
      // Show confirmation
      this.showExclusionConfirmation(element, selector);
    }
  }

  handleKeyPress(e) {
    if (e.key === 'Escape') {
      this.toggleInspectorMode();
      // Send message to popup to update UI
      chrome.runtime.sendMessage({ action: 'inspectorToggled', active: false });
    }
  }

  addElementHighlight(element) {
    element.style.outline = '2px solid #9333ea';
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = 'rgba(147, 51, 234, 0.1)';
  }

  removeElementHighlight(element) {
    element.style.outline = '';
    element.style.outlineOffset = '';
    element.style.backgroundColor = '';
  }

  updateTooltip(element) {
    const selector = this.generateSelector(element);
    const tagName = element.tagName.toLowerCase();
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const id = element.id ? `#${element.id}` : '';
    
    this.inspectorTooltip.innerHTML = `
      <div><strong>Tag:</strong> ${tagName}</div>
      ${id ? `<div><strong>ID:</strong> ${id}</div>` : ''}
      ${className ? `<div><strong>Class:</strong> ${className}</div>` : ''}
      <div><strong>Selector:</strong> ${selector}</div>
      <div style="margin-top: 4px; font-size: 10px; opacity: 0.8;">Click to exclude • ESC to exit</div>
    `;
  }

  generateSelector(element) {
    // Generate a unique selector for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }
    
    // Fallback to tag name with nth-child
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName);
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-child(${index})`;
    }
    
    return element.tagName.toLowerCase();
  }

  async addExcludedSelector(selector) {
    this.excludedSelectors.add(selector);
    
    try {
      await chrome.storage.sync.set({ 
        excludedSelectors: Array.from(this.excludedSelectors) 
      });
      
      // Remove rounding from matching elements
      this.removeRoundingFromSelector(selector);
    } catch (error) {
      console.error('RoundedWeb: Error saving excluded selector:', error);
    }
  }

  async removeExcludedSelector(selector) {
    this.excludedSelectors.delete(selector);
    
    try {
      await chrome.storage.sync.set({ 
        excludedSelectors: Array.from(this.excludedSelectors) 
      });
      
      // Reapply rounding
      this.applyRoundedCorners();
    } catch (error) {
      console.error('RoundedWeb: Error removing excluded selector:', error);
    }
  }

  removeRoundingFromSelector(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.hasAttribute('data-rounded-web')) {
          element.removeAttribute('data-rounded-web');
          element.style.borderRadius = '';
          element.style.overflow = '';
          element.style.transition = '';
        }
      });
    } catch (error) {
      console.log('RoundedWeb: Invalid selector:', selector);
    }
  }

  showExclusionConfirmation(element, selector) {
    const confirmation = document.createElement('div');
    confirmation.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(16, 185, 129, 0.95);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(16, 185, 129, 0.3);
    `;
    
    confirmation.innerHTML = `
      <div><strong>✓ Element Excluded</strong></div>
      <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">${selector}</div>
    `;
    
    document.body.appendChild(confirmation);
    
    setTimeout(() => {
      confirmation.remove();
    }, 3000);
  }

  showInspectorInstructions() {
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(17, 24, 39, 0.95);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 14px;
      z-index: 999999;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(147, 51, 234, 0.3);
      text-align: center;
    `;
    
    instructions.innerHTML = `
      <div><strong>🔍 Inspector Mode Active</strong></div>
      <div style="font-size: 12px; opacity: 0.9; margin-top: 8px;">
        Hover over elements to inspect • Click to exclude from rounding • Press ESC to exit
      </div>
    `;
    
    document.body.appendChild(instructions);
    
    setTimeout(() => {
      instructions.remove();
    }, 5000);
  }

  async toggleForCurrentSite() {
    try {
      const result = await chrome.storage.sync.get(['disabledSites']);
      let disabledSites = result.disabledSites || [];
      
      if (this.isEnabled) {
        // Disable for current site
        if (!disabledSites.includes(this.currentDomain)) {
          disabledSites.push(this.currentDomain);
        }
        this.isEnabled = false;
        this.removeRoundedCorners();
      } else {
        // Enable for current site
        disabledSites = disabledSites.filter(site => site !== this.currentDomain);
        this.isEnabled = true;
        this.applyRoundedCorners();
      }
      
      await chrome.storage.sync.set({ disabledSites });
    } catch (error) {
      console.error('RoundedWeb: Error toggling site:', error);
    }
  }

  applyRoundedCorners() {
    if (!this.isEnabled) return;

    this.debounce(() => {
      this.processElements();
    }, 100);
  }

  processElements() {
    const elements = this.getTargetElements();
    
    elements.forEach(element => {
      if (this.shouldApplyRounding(element)) {
        this.applyRoundingToElement(element);
      }
    });
  }

  getTargetElements() {
    const selectors = [
      'img',
      'video',
      'iframe',
      'canvas',
      'svg',
      '.card',
      '.container',
      '.box',
      '.panel',
      '.widget',
      'article',
      'section',
      'aside',
      'header',
      'footer',
      'nav',
      'main',
      'div[class*="content"]',
      'div[class*="wrapper"]',
      'div[class*="container"]',
      'div[class*="card"]',
      'div[class*="box"]',
      'div[class*="panel"]',
      'div[class*="item"]',
      'div[class*="block"]',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="search"]',
      'textarea',
      'select',
      'button',
      '.btn',
      'a[class*="button"]'
    ];

    return document.querySelectorAll(selectors.join(', '));
  }

  shouldApplyRounding(element) {
    // Skip if already processed
    if (element.hasAttribute('data-rounded-web')) return false;
    
    // Skip if element matches excluded selectors
    for (const selector of this.excludedSelectors) {
      try {
        if (element.matches(selector)) return false;
      } catch (error) {
        // Invalid selector, continue
      }
    }
    
    // Skip very small elements (likely icons)
    const rect = element.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return false;
    
    // Skip if element is not visible
    if (rect.width === 0 || rect.height === 0) return false;
    
    // Skip if element has display: none or visibility: hidden
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return false;
    
    // Skip if element already has significant border-radius
    const currentRadius = parseInt(computedStyle.borderRadius) || 0;
    if (currentRadius >= this.cornerRadius * 0.8) return false;
    
    return true;
  }

  applyRoundingToElement(element) {
    element.setAttribute('data-rounded-web', 'true');
    element.style.borderRadius = `${this.cornerRadius}px`;
    element.style.overflow = 'hidden';
    
    // Add smooth transition
    element.style.transition = 'border-radius 0.3s ease';
    
    // Special handling for different element types
    if (element.tagName === 'IMG' || element.tagName === 'VIDEO') {
      element.style.objectFit = 'cover';
    }
  }

  removeRoundedCorners() {
    const elements = document.querySelectorAll('[data-rounded-web]');
    elements.forEach(element => {
      element.removeAttribute('data-rounded-web');
      element.style.borderRadius = '';
      element.style.overflow = '';
      element.style.transition = '';
      element.style.objectFit = '';
    });
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldUpdate = true;
        }
      });
      
      if (shouldUpdate && this.isEnabled) {
        this.applyRoundedCorners();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  debounce(func, wait) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(func, wait);
  }
}

// Initialize the extension when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new RoundedWebExtension();
  });
} else {
  new RoundedWebExtension();
}