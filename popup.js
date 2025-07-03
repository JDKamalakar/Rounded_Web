// Popup script for the Chrome extension
class PopupController {
  constructor() {
    this.isEnabled = true;
    this.cornerRadius = 12;
    this.currentDomain = '';
    this.inspectorMode = false;
    this.excludedSelectors = [];
    
    this.initializeElements();
    this.setupEventListeners();
    this.loadCurrentState();
  }

  initializeElements() {
    this.elements = {
      statusIndicator: document.getElementById('statusIndicator'),
      currentDomain: document.getElementById('currentDomain'),
      siteToggle: document.getElementById('siteToggle'),
      toggleText: document.getElementById('toggleText'),
      radiusControl: document.getElementById('radiusControl'),
      radiusSlider: document.getElementById('radiusSlider'),
      radiusValue: document.getElementById('radiusValue'),
      sliderFill: document.getElementById('sliderFill'),
      inspectorControl: document.getElementById('inspectorControl'),
      inspectorToggle: document.getElementById('inspectorToggle'),
      inspectorText: document.getElementById('inspectorText'),
      manageExcluded: document.getElementById('manageExcluded'),
      excludedCount: document.getElementById('excludedCount'),
      excludedList: document.getElementById('excludedList'),
      excludedItems: document.getElementById('excludedItems'),
      closeExcluded: document.getElementById('closeExcluded'),
      previewSection: document.getElementById('previewSection'),
      previewItems: document.querySelectorAll('.preview-item')
    };
  }

  setupEventListeners() {
    // Site toggle
    this.elements.siteToggle.addEventListener('click', () => {
      this.toggleSite();
    });

    // Radius slider
    this.elements.radiusSlider.addEventListener('input', (e) => {
      this.updateRadius(parseInt(e.target.value));
    });

    this.elements.radiusSlider.addEventListener('change', (e) => {
      this.saveRadius(parseInt(e.target.value));
    });

    // Inspector toggle
    this.elements.inspectorToggle.addEventListener('click', () => {
      this.toggleInspector();
    });

    // Manage excluded elements
    this.elements.manageExcluded.addEventListener('click', () => {
      this.toggleExcludedList();
    });

    // Close excluded list
    this.elements.closeExcluded.addEventListener('click', () => {
      this.hideExcludedList();
    });

    // Preview button hover effect
    this.elements.previewItems.forEach(item => {
      if (item.classList.contains('preview-button')) {
        item.addEventListener('mouseenter', () => {
          item.style.transform = 'translateY(-2px)';
          item.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
        });
        
        item.addEventListener('mouseleave', () => {
          item.style.transform = 'translateY(0)';
          item.style.boxShadow = 'none';
        });
      }
    });

    // Listen for inspector mode changes from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'inspectorToggled') {
        this.inspectorMode = message.active;
        this.updateInspectorUI();
      }
    });
  }

  async loadCurrentState() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        this.showUnsupportedPage();
        return;
      }
      
      const url = new URL(tab.url);
      this.currentDomain = url.hostname;
      
      // Update domain display
      this.elements.currentDomain.textContent = this.currentDomain;
      
      // Get status from content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
        
        if (response) {
          this.isEnabled = response.enabled;
          this.cornerRadius = response.radius;
          
          this.updateUI();
        }
      } catch (error) {
        console.log('PopupController: Content script not ready, using defaults');
        this.updateUI();
      }

      // Load excluded selectors
      await this.loadExcludedSelectors();
      
    } catch (error) {
      console.log('PopupController: Could not load state, using defaults');
      this.updateUI();
    }
  }

  showUnsupportedPage() {
    this.elements.currentDomain.textContent = 'Unsupported page';
    this.elements.siteToggle.style.display = 'none';
    this.elements.radiusControl.style.display = 'none';
    this.elements.inspectorControl.style.display = 'none';
    this.elements.previewSection.style.display = 'none';
    
    const message = document.createElement('div');
    message.style.cssText = `
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
      font-size: 14px;
    `;
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">🚫</div>
      <div><strong>Extension not available</strong></div>
      <div style="margin-top: 8px; font-size: 12px;">
        This extension doesn't work on Chrome internal pages
      </div>
    `;
    
    this.elements.content.appendChild(message);
  }

  async loadExcludedSelectors() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getExcludedSelectors' });
      
      if (response && response.selectors) {
        this.excludedSelectors = response.selectors;
        this.updateExcludedCount();
        this.renderExcludedList();
      }
    } catch (error) {
      console.log('PopupController: Could not load excluded selectors');
    }
  }

  async toggleSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      
      // Toggle local state
      this.isEnabled = !this.isEnabled;
      this.updateUI();
      
      // Add visual feedback
      this.elements.siteToggle.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.elements.siteToggle.style.transform = 'scale(1)';
      }, 150);
      
    } catch (error) {
      console.error('PopupController: Error toggling site:', error);
    }
  }

  async toggleInspector() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleInspector' });
      
      if (response) {
        this.inspectorMode = response.inspectorMode;
        this.updateInspectorUI();
        
        // Add visual feedback
        this.elements.inspectorToggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.elements.inspectorToggle.style.transform = 'scale(1)';
        }, 150);

        // Close popup if inspector is activated
        if (this.inspectorMode) {
          window.close();
        }
      }
    } catch (error) {
      console.error('PopupController: Error toggling inspector:', error);
    }
  }

  async updateRadius(radius) {
    this.cornerRadius = radius;
    this.updateRadiusDisplay();
    this.updatePreview();
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'updateRadius', 
        radius: radius 
      });
    } catch (error) {
      console.log('PopupController: Could not update radius in content script');
    }
  }

  async saveRadius(radius) {
    try {
      await chrome.storage.sync.set({ cornerRadius: radius });
    } catch (error) {
      console.log('PopupController: Could not save radius');
    }
  }

  toggleExcludedList() {
    const isVisible = this.elements.excludedList.style.display !== 'none';
    
    if (isVisible) {
      this.hideExcludedList();
    } else {
      this.showExcludedList();
    }
  }

  showExcludedList() {
    this.elements.excludedList.style.display = 'flex';
    this.renderExcludedList();
  }

  hideExcludedList() {
    this.elements.excludedList.style.display = 'none';
  }

  renderExcludedList() {
    this.elements.excludedItems.innerHTML = '';
    
    if (this.excludedSelectors.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.style.cssText = `
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        padding: 20px;
      `;
      emptyMessage.textContent = 'No excluded elements yet. Use the inspector to exclude elements.';
      this.elements.excludedItems.appendChild(emptyMessage);
      return;
    }

    this.excludedSelectors.forEach(selector => {
      const item = document.createElement('div');
      item.className = 'excluded-item';
      
      const selectorSpan = document.createElement('span');
      selectorSpan.className = 'excluded-selector';
      selectorSpan.textContent = selector;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.innerHTML = '×';
      removeBtn.addEventListener('click', () => {
        this.removeExcludedSelector(selector);
      });
      
      item.appendChild(selectorSpan);
      item.appendChild(removeBtn);
      this.elements.excludedItems.appendChild(item);
    });
  }

  async removeExcludedSelector(selector) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'removeExcludedSelector', 
        selector: selector 
      });
      
      // Update local state
      this.excludedSelectors = this.excludedSelectors.filter(s => s !== selector);
      this.updateExcludedCount();
      this.renderExcludedList();
      
    } catch (error) {
      console.error('PopupController: Error removing excluded selector:', error);
    }
  }

  updateUI() {
    // Update status indicator
    const statusDot = this.elements.statusIndicator.querySelector('.status-dot');
    if (this.isEnabled) {
      statusDot.classList.remove('disabled');
    } else {
      statusDot.classList.add('disabled');
    }

    // Update toggle button
    if (this.isEnabled) {
      this.elements.siteToggle.classList.add('active');
      this.elements.toggleText.textContent = 'Enabled';
    } else {
      this.elements.siteToggle.classList.remove('active');
      this.elements.toggleText.textContent = 'Disabled';
    }

    // Update controls visibility
    if (this.isEnabled) {
      this.elements.radiusControl.classList.remove('disabled');
      this.elements.inspectorControl.classList.remove('disabled');
      this.elements.previewSection.classList.remove('disabled');
    } else {
      this.elements.radiusControl.classList.add('disabled');
      this.elements.inspectorControl.classList.add('disabled');
      this.elements.previewSection.classList.add('disabled');
    }

    this.updateRadiusDisplay();
    this.updatePreview();
    this.updateInspectorUI();
  }

  updateInspectorUI() {
    if (this.inspectorMode) {
      this.elements.inspectorToggle.classList.add('active');
      this.elements.inspectorText.textContent = 'Stop Inspector';
    } else {
      this.elements.inspectorToggle.classList.remove('active');
      this.elements.inspectorText.textContent = 'Start Inspector';
    }
  }

  updateExcludedCount() {
    const count = this.excludedSelectors.length;
    this.elements.excludedCount.textContent = `${count} excluded`;
  }

  updateRadiusDisplay() {
    this.elements.radiusSlider.value = this.cornerRadius;
    this.elements.radiusValue.textContent = `${this.cornerRadius}px`;
    
    // Update slider fill
    const percentage = (this.cornerRadius / 30) * 100;
    this.elements.sliderFill.style.width = `${percentage}%`;
  }

  updatePreview() {
    const radius = this.isEnabled ? this.cornerRadius : 0;
    
    this.elements.previewItems.forEach(item => {
      item.style.borderRadius = `${radius}px`;
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Add smooth entrance animation
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.popup-container');
  if (container) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 50);
  }
});