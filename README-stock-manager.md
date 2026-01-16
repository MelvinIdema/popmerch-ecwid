# Popmerch Product Variation Stock Manager

## Overview

Production-ready JavaScript for managing product variation stock availability in Ecwid storefronts. The script automatically disables variation select buttons when stock is unavailable, improving user experience and preventing orders for out-of-stock items.

## Features

✅ **Automatic Stock Detection** - Fetches real-time stock data from Ecwid API  
✅ **Smart Caching** - 60-second cache with session storage and memory fallback  
✅ **Retry Logic** - Exponential backoff for network failures  
✅ **DOM Observation** - Automatically reapplies disabled states when DOM changes  
✅ **Auto-Selection** - Selects first available option when current selection becomes unavailable  
✅ **Debug Mode** - Comprehensive logging via `?debug=true` URL parameter  
✅ **Graceful Degradation** - Fails silently without breaking the page  
✅ **Accessibility** - ARIA attributes for screen readers  
✅ **Performance Optimized** - Debounced DOM updates, efficient selectors

## Installation

1. Copy the contents of `custom-popmerch-refactored.js`
2. In your Ecwid admin panel, go to **Settings → Code**
3. Paste the code in the **Custom JavaScript** section
4. Click **Save**

## Configuration

Edit the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
  api: {
    publicToken: "YOUR_PUBLIC_TOKEN_HERE", // ⚠️ REQUIRED: Update with your token
    // ... other API settings
  },
  options: {
    targetOptionName: "Size", // Change to "Color", "Material", etc.
  },
  // ... other configuration options
};
```

### Key Configuration Options

| Option                     | Description                                      | Default       |
| -------------------------- | ------------------------------------------------ | ------------- |
| `api.publicToken`          | Your Ecwid public API token                      | (required)    |
| `options.targetOptionName` | Product option to manage (e.g., "Size", "Color") | `"Size"`      |
| `cache.ttl`                | Cache duration in milliseconds                   | `60000` (60s) |
| `logging.level`            | Log level: `ERROR`, `WARN`, `INFO`, `DEBUG`      | `INFO`        |
| `ui.disabledClass`         | CSS class for disabled variations                | `ecwid-oos`   |

## Usage

### Basic Usage

Once installed, the script works automatically:

1. Navigate to any product page with variations
2. The script fetches stock data from Ecwid API
3. Out-of-stock variations are automatically disabled
4. Visual styling indicates disabled state

### Debug Mode

For troubleshooting, enable debug mode:

1. Add `?debug=true` to any product URL
2. Open browser console (F12)
3. View detailed logs about stock fetching, caching, and DOM updates

Example: `https://yourstore.com/Product-Name-p123456?debug=true`

### Console API

Access the manager via browser console:

```javascript
// Get current status
window.PopmerchStockManager.getStatus();

// Force refresh stock data
await window.PopmerchStockManager.refresh();

// View configuration
window.PopmerchStockManager.config;
```

## How It Works

### Architecture

The script uses a modular class-based architecture:

```
PopmerchStockManager (Main Controller)
├── Logger (Logging with levels)
├── EcwidAPIClient (API communication)
├── StockManager (Business logic)
└── DOMManager (DOM manipulation)
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ 1. Page Load / Ecwid.OnPageLoaded Event                │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Check Session Cache (60s TTL)                       │
└─────────────────────┬───────────────────────────────────┘
                      ▼
         ┌────────────┴───────────┐
         │ Cache Hit?             │
         └────┬──────────────┬────┘
              │ Yes          │ No
              ▼              ▼
      ┌───────────┐   ┌────────────────┐
      │ Use Cache │   │ Fetch from API │
      └─────┬─────┘   └────────┬───────┘
            │                  │
            │         ┌────────▼────────┐
            │         │ Cache Response  │
            │         └────────┬────────┘
            └──────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Build Availability Map (Size → In Stock?)           │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Apply Disabled States to DOM                        │
│    - Disable radio inputs                              │
│    - Add .ecwid-oos class                             │
│    - Set aria-disabled attribute                       │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Auto-select First Available (if needed)             │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Start MutationObserver (reapply on DOM changes)     │
└─────────────────────────────────────────────────────────┘
```

### Stock Detection Logic

A combination is considered "in stock" if:

- `unlimited === true` OR
- `quantity > 0` OR
- `inStock === true`

### Caching Strategy

Two-tier caching for optimal performance:

1. **Session Storage** - Primary cache, survives page navigation
2. **Memory Cache** - Fallback if session storage fails

Cache TTL: 60 seconds (configurable)

## Styling

Add custom CSS to style disabled variations:

```css
/* Out of stock variations */
.ecwid-oos {
  opacity: 0.5;
  cursor: not-allowed;
  position: relative;
}

.ecwid-oos::after {
  content: "Out of Stock";
  position: absolute;
  bottom: -20px;
  left: 0;
  font-size: 10px;
  color: #999;
}

/* Disabled input wrapper */
.ecwid-oos .form-control__radio {
  cursor: not-allowed;
}

/* Strikethrough effect */
.ecwid-oos label {
  text-decoration: line-through;
}
```

## Troubleshooting

### Stock status not updating

1. Enable debug mode: `?debug=true`
2. Check console for errors
3. Verify API token is correct
4. Check that product has combinations configured in Ecwid

### Wrong variations being disabled

1. Verify `targetOptionName` matches your product option name exactly (case-sensitive)
2. Check console logs to see what option names are found
3. Ensure combinations are configured with stock quantities

### Script not running

1. Check browser console for JavaScript errors
2. Verify Ecwid storefront is loaded
3. Ensure script is added to Custom JavaScript section (not Custom CSS)
4. Clear browser cache and reload

### Performance issues

1. Increase `cache.ttl` to reduce API calls
2. Increase `dom.debounceDelay` to reduce DOM updates
3. Disable debug mode in production

## API Reference

### PopmerchStockManager

Main controller class.

**Methods:**

- `initialize()` - Initialize the manager (called automatically)
- `processProduct(productId)` - Process a specific product
- `refresh()` - Force refresh current product's stock data
- `getStatus()` - Get current status object

### Logger

Logging utility with levels.

**Methods:**

- `error(message, ...args)` - Log error
- `warn(message, ...args)` - Log warning
- `info(message, ...args)` - Log info
- `debug(message, ...args)` - Log debug (verbose)

### Configuration Object

See `CONFIG` constant in script for all available options.

## Comparison: Old vs New

| Feature                | Old Script           | New Script               |
| ---------------------- | -------------------- | ------------------------ |
| Lines of code          | 179                  | ~750 (with docs)         |
| Architecture           | Functional           | Class-based OOP          |
| Error handling         | Basic                | Comprehensive with retry |
| Logging                | Console.warn only    | Multi-level logger       |
| Debug mode             | No                   | Yes (`?debug=true`)      |
| Documentation          | Comments only        | JSDoc + README           |
| Cache                  | Session storage only | Session + memory         |
| API client             | Inline fetch         | Dedicated class          |
| DOM handling           | Inline               | Dedicated class          |
| Performance monitoring | No                   | Yes (timing logs)        |
| Global API             | No                   | Yes (debugging)          |
| Accessibility          | Basic                | Enhanced (ARIA)          |

## Browser Support

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

Requires: ES6 (classes, arrow functions, async/await, Promise)

## License

MIT License - Free to use and modify

## Support

For issues or questions:

1. Enable debug mode and check console logs
2. Review this documentation
3. Check Ecwid API documentation: https://docs.ecwid.com/storefronts

---

**Version:** 2.0.0  
**Last Updated:** January 2026
