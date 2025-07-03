# Rounded Web - Chrome Extension

A beautiful Chrome extension that adds customizable rounded corners to all webpage elements, featuring a modern glassy popup interface inspired by Android 16's QPR 1 design language.

## Features

### 🎨 Universal Rounded Corners
- Automatically applies rounded corners to images, videos, containers, and form elements
- Smart element detection that preserves small icons and logos
- Smooth transitions and hover effects for interactive elements

### 🎛️ Customizable Controls
- Adjustable corner radius from 0-30px with real-time preview
- Site-specific toggle functionality to disable for individual websites
- Settings persistence across browser sessions and devices

### ✨ Modern Design
- Glassy popup with backdrop blur and transparency effects
- Gradient accent colors with purple-blue theme
- Responsive dark mode support
- Smooth animations and micro-interactions

### 🔧 Smart Features
- Debounced updates for optimal performance
- Mutation observer for dynamic content
- Preserves aspect ratios for media elements
- Non-intrusive operation with minimal performance impact

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon will appear in your toolbar

## Usage

1. **Click the extension icon** to open the glassy popup interface
2. **Toggle for current site**: Enable or disable rounded corners for the current website
3. **Adjust corner radius**: Use the slider to customize the roundness (0-30px)
4. **Preview changes**: See real-time preview of different element types
5. **Settings persist**: Your preferences are saved automatically

## Technical Details

### Files Structure
- `manifest.json` - Extension configuration and permissions
- `content.js` - Main logic for applying rounded corners
- `content.css` - Styles for enhanced visual effects
- `popup.html` - Popup interface structure
- `popup.css` - Modern glassy design styles
- `popup.js` - Popup functionality and controls
- `background.js` - Background service worker

### Key Technologies
- Chrome Extensions Manifest V3
- CSS backdrop-filter for glassy effects
- Chrome Storage API for settings persistence
- Mutation Observer for dynamic content handling
- CSS custom properties for theming

### Performance Optimizations
- Debounced DOM updates (100ms)
- Efficient element selection with specific CSS selectors
- Minimal DOM manipulation with attribute-based tracking
- Smart element filtering to avoid processing small icons

## Permissions

- `activeTab` - Required to modify the current webpage
- `storage` - Required to save user preferences

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers with Manifest V3 support

## Privacy

This extension:
- ✅ Works entirely locally on your device
- ✅ Does not collect or transmit any personal data
- ✅ Only accesses the current tab when activated
- ✅ Stores preferences locally using Chrome's storage API

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension.

## License

MIT License - feel free to use and modify as needed.

---

**Transform your web experience with beautiful rounded corners! 🎨✨**