// Popup script for the Chrome extension
class PopupController {
  constructor() {
    this.isEnabled = true;
    this.cornerRadius = 12;
    this.currentDomain = '';
    
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

    // Preview button hover effect
    this.elements.previewItems.forEach(item => {
      if (item.classList.contains('preview-button')) {
        item.addEventListener('mouseenter', () => {
          item.style.transform = 'translateY(-2px)';
          item.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        });
        
        item.addEventListener('mouseleave', () => {
          item.style.transform = 'translateY(0)';
          item.style.boxShadow = 'none';
        });
      }
    });
  }

  async loadCurrentState() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tab.url);
      this.currentDomain = url.hostname;
      
      // Update domain display
      this.elements.currentDomain.textContent = this.currentDomain;
      
      // Get status from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
      
      if (response) {
        this.isEnabled = response.enabled;
        this.cornerRadius = response.radius;
        
        this.updateUI();
      }
    } catch (error) {
      console.log('PopupController: Could not load state, using defaults');
      this.updateUI();
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
      this.elements.previewSection.classList.remove('disabled');
    } else {
      this.elements.radiusControl.classList.add('disabled');
      this.elements.previewSection.classList.add('disabled');
    }

    this.updateRadiusDisplay();
    this.updatePreview();
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
  container.style.opacity = '0';
  container.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
    container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }, 50);
});