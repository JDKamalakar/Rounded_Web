// Content script for applying rounded corners
class RoundedWebExtension {
  constructor() {
    this.isEnabled = true;
    this.cornerRadius = 12;
    this.currentDomain = window.location.hostname;
    this.observer = null;
    this.debounceTimer = null;
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupMessageListener();
    this.applyRoundedCorners();
    this.setupMutationObserver();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['globalEnabled', 'cornerRadius', 'disabledSites']);
      
      this.isEnabled = result.globalEnabled !== false;
      this.cornerRadius = result.cornerRadius || 12;
      
      const disabledSites = result.disabledSites || [];
      const isCurrentSiteDisabled = disabledSites.includes(this.currentDomain);
      
      if (isCurrentSiteDisabled) {
        this.isEnabled = false;
      }
    } catch (error) {
      console.log('RoundedWeb: Using default settings');
    }
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
            domain: this.currentDomain
          });
          break;
      }
    });
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
    // Target specific elements for rounded corners
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

    const elements = document.querySelectorAll(selectors.join(', '));
    
    elements.forEach(element => {
      if (this.shouldApplyRounding(element)) {
        this.applyRoundingToElement(element);
      }
    });
  }

  shouldApplyRounding(element) {
    // Skip if already processed
    if (element.hasAttribute('data-rounded-web')) return false;
    
    // Skip very small elements (likely icons)
    const rect = element.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return false;
    
    // Skip if element is not visible
    if (rect.width === 0 || rect.height === 0) return false;
    
    // Skip if element has display: none or visibility: hidden
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return false;
    
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