# StealthPlugin Usage Guide

## Quick Start

### 1. Basic Usage

```typescript
import { StealthPlugin } from './services/cdp/plugins/stealth-plugin.js';

// Register with CDPService
const stealthPlugin = new StealthPlugin();
cdpService.registerPlugin(stealthPlugin);
```

### 2. Custom Configuration

```typescript
const stealthPlugin = new StealthPlugin({
  name: 'custom-stealth',
  enableCanvasNoise: true,
  enableAudioNoise: true,
  enableWebRTCProtection: true,
  enablePermissionsSpoof: true,
  enableTimingProtection: true,
  enableChromeRuntime: true,
  enableNavigatorPlugins: true,
  enableAdvancedWebdriverProtection: true,
});

cdpService.registerPlugin(stealthPlugin);
```

### 3. Selective Protection

```typescript
// Only enable specific protections
const minimalStealthPlugin = new StealthPlugin({
  name: 'minimal-stealth',
  enableCanvasNoise: false,
  enableAudioNoise: false,
  enableWebRTCProtection: true,
  enablePermissionsSpoof: false,
  enableTimingProtection: false,
  enableChromeRuntime: true,
  enableNavigatorPlugins: true,
  enableAdvancedWebdriverProtection: true,
});
```

## Integration with Existing Code

### Adding to CDPService

```typescript
// In api/src/services/cdp/cdp.service.ts

import { StealthPlugin } from './plugins/stealth-plugin.js';

class CDPService {
  async launch(options?: BrowserLauncherOptions) {
    // ... existing launch code ...

    // Register stealth plugin
    const stealthPlugin = new StealthPlugin({
      enableCanvasNoise: options?.enableCanvasNoise ?? true,
      enableWebRTCProtection: options?.enableWebRTCProtection ?? true,
    });
    
    this.registerPlugin(stealthPlugin);

    // ... rest of launch code ...
  }
}
```

### Environment Variable Configuration

Add to `.env`:

```bash
# Stealth Plugin Configuration
ENABLE_STEALTH_PLUGIN=true
ENABLE_CANVAS_NOISE=true
ENABLE_AUDIO_NOISE=true
ENABLE_WEBRTC_PROTECTION=true
ENABLE_PERMISSIONS_SPOOF=true
ENABLE_TIMING_PROTECTION=true
```

Update `api/src/env.ts`:

```typescript
const envSchema = z.object({
  // ... existing env vars ...
  
  ENABLE_STEALTH_PLUGIN: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),
    
  ENABLE_CANVAS_NOISE: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),
    
  // ... add other stealth options ...
});
```

## Testing

### Basic Detection Test

```typescript
// tests/stealth-plugin.test.ts

import { CDPService } from '../services/cdp/cdp.service.js';
import { StealthPlugin } from '../services/cdp/plugins/stealth-plugin.js';

describe('StealthPlugin', () => {
  let cdpService: CDPService;
  let stealthPlugin: StealthPlugin;

  beforeEach(() => {
    cdpService = new CDPService();
    stealthPlugin = new StealthPlugin();
    cdpService.registerPlugin(stealthPlugin);
  });

  test('WebDriver is hidden', async () => {
    const browser = await cdpService.launch();
    const page = await browser.newPage();
    
    const webdriverValue = await page.evaluate(() => navigator.webdriver);
    expect(webdriverValue).toBeUndefined();
    
    await browser.close();
  });

  test('Chrome runtime exists', async () => {
    const browser = await cdpService.launch();
    const page = await browser.newPage();
    
    const chromeExists = await page.evaluate(() => !!window.chrome);
    expect(chromeExists).toBe(true);
    
    await browser.close();
  });

  test('Plugins are populated', async () => {
    const browser = await cdpService.launch();
    const page = await browser.newPage();
    
    const pluginCount = await page.evaluate(() => navigator.plugins.length);
    expect(pluginCount).toBeGreaterThan(0);
    
    await browser.close();
  });
});
```

### Detection Sites Testing

```typescript
// tests/detection-sites.test.ts

describe('Detection Sites', () => {
  test('BrowserLeaks WebRTC', async () => {
    const browser = await cdpService.launch();
    const page = await browser.newPage();
    
    await page.goto('https://browserleaks.com/webrtc');
    
    // Check if IP is leaked
    const ipLeak = await page.evaluate(() => {
      return document.body.textContent.includes('Public IP');
    });
    
    expect(ipLeak).toBe(false);
    await browser.close();
  });

  test('Sannysoft Bot Detection', async () => {
    const browser = await cdpService.launch();
    const page = await browser.newPage();
    
    await page.goto('https://bot.sannysoft.com/');
    await page.waitForTimeout(5000);
    
    const screenshot = await page.screenshot();
    // Manual inspection: should show green checkmarks
    
    await browser.close();
  });
});
```

## Monitoring & Debugging

### Enable Verbose Logging

```typescript
const stealthPlugin = new StealthPlugin({
  name: 'stealth-with-logging',
  // ... other options ...
});

// Override onPageCreated to add logging
const originalOnPageCreated = stealthPlugin.onPageCreated.bind(stealthPlugin);
stealthPlugin.onPageCreated = async (page) => {
  console.log('[StealthPlugin] Injecting stealth scripts...');
  await originalOnPageCreated(page);
  console.log('[StealthPlugin] Stealth scripts injected successfully');
};
```

### Validation Script

```typescript
// Validate all protections are working
async function validateStealth(page) {
  const results = await page.evaluate(() => {
    return {
      webdriver: navigator.webdriver,
      chromeRuntime: !!window.chrome?.runtime,
      plugins: navigator.plugins.length,
      mimeTypes: navigator.mimeTypes.length,
      battery: !!navigator.getBattery,
      permissions: !!navigator.permissions,
    };
  });

  console.log('Stealth Validation Results:', results);
  return results;
}
```

## Best Practices

### 1. Per-Session Configuration

```typescript
// Different stealth levels for different use cases
const getStealthConfig = (sessionType: string) => {
  switch (sessionType) {
    case 'high-security':
      return {
        enableCanvasNoise: true,
        enableAudioNoise: true,
        enableWebRTCProtection: true,
        enablePermissionsSpoof: true,
        enableTimingProtection: true,
      };
      
    case 'performance':
      return {
        enableCanvasNoise: false,
        enableAudioNoise: false,
        enableWebRTCProtection: true,
        enablePermissionsSpoof: false,
        enableTimingProtection: false,
      };
      
    default:
      return {}; // Use defaults
  }
};

const stealthPlugin = new StealthPlugin(getStealthConfig('high-security'));
```

### 2. Combine with Fingerprint Injection

```typescript
// Use both StealthPlugin and fingerprint injection
const stealthPlugin = new StealthPlugin();
cdpService.registerPlugin(stealthPlugin);

// Fingerprint injection is already part of CDPService
// They work together for maximum protection
```

### 3. Browser Launch Args

```typescript
// Combine StealthPlugin with proper launch args
const browser = await cdpService.launch({
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-background-networking',
    // ... other stealth args
  ],
});
```

## Troubleshooting

### Plugin Not Working

```typescript
// Check if plugin is registered
const registeredPlugins = cdpService.getRegisteredPlugins();
console.log('Registered plugins:', registeredPlugins);

// Verify plugin lifecycle methods are called
stealthPlugin.onPageCreated = async (page) => {
  console.log('onPageCreated called');
  // ... original code ...
};
```

### Canvas Fingerprint Still Detected

```typescript
// Verify canvas noise is actually applied
const testCanvasFingerprint = async (page) => {
  const fp1 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillText('test', 0, 0);
    return canvas.toDataURL();
  });

  const fp2 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillText('test', 0, 0);
    return canvas.toDataURL();
  });

  console.log('Fingerprints match:', fp1 === fp2);
  // Should be true - noise is consistent per session
};
```

### WebDriver Still Visible

```typescript
// Check all webdriver properties
const checkWebdriver = async (page) => {
  const results = await page.evaluate(() => {
    return {
      directAccess: navigator.webdriver,
      hasOwnProperty: navigator.hasOwnProperty('webdriver'),
      inKeys: Object.keys(navigator).includes('webdriver'),
      inNames: Object.getOwnPropertyNames(navigator).includes('webdriver'),
      descriptor: Object.getOwnPropertyDescriptor(navigator, 'webdriver'),
    };
  });

  console.log('WebDriver check results:', results);
  // All should be false/undefined
};
```

## Performance Impact

### Benchmarking

```typescript
async function benchmarkStealth() {
  const withoutStealth = await benchmark(async () => {
    const browser = await cdpService.launch();
    const page = await browser.newPage();
    await page.goto('https://example.com');
    await browser.close();
  });

  const withStealth = await benchmark(async () => {
    const stealthPlugin = new StealthPlugin();
    cdpService.registerPlugin(stealthPlugin);
    
    const browser = await cdpService.launch();
    const page = await browser.newPage();
    await page.goto('https://example.com');
    await browser.close();
  });

  console.log('Without stealth:', withoutStealth, 'ms');
  console.log('With stealth:', withStealth, 'ms');
  console.log('Overhead:', withStealth - withoutStealth, 'ms');
}
```

Expected overhead: 5-15ms per page load (negligible)

## Migration Guide

### From Manual Scripts to StealthPlugin

**Before:**
```typescript
await page.evaluateOnNewDocument(() => {
  delete navigator.webdriver;
  // ... manual scripts ...
});
```

**After:**
```typescript
const stealthPlugin = new StealthPlugin();
cdpService.registerPlugin(stealthPlugin);
// All protections applied automatically
```

### From Other Libraries

**From puppeteer-extra-plugin-stealth:**
```typescript
// Before
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// After (in Steel Browser)
import { StealthPlugin } from './plugins/stealth-plugin.js';
const stealthPlugin = new StealthPlugin();
cdpService.registerPlugin(stealthPlugin);
```

## Advanced Usage

### Dynamic Protection Switching

```typescript
class DynamicStealthPlugin extends StealthPlugin {
  private currentLevel: 'low' | 'medium' | 'high' = 'medium';

  setLevel(level: 'low' | 'medium' | 'high') {
    this.currentLevel = level;
    
    switch (level) {
      case 'low':
        this.options.enableCanvasNoise = false;
        this.options.enableAudioNoise = false;
        break;
      case 'medium':
        this.options.enableCanvasNoise = true;
        this.options.enableAudioNoise = false;
        break;
      case 'high':
        this.options.enableCanvasNoise = true;
        this.options.enableAudioNoise = true;
        break;
    }
  }
}
```

### Custom Noise Algorithms

```typescript
class CustomNoiseStealthPlugin extends StealthPlugin {
  protected getCanvasProtection(): string {
    // Override with custom noise algorithm
    return `
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        // Your custom noise injection logic
        return originalToDataURL.apply(this, args);
      };
    `;
  }
}
```

## Support & Resources

- Main Documentation: `docs/ANTI_DETECTION_GUIDE.md`
- Plugin API: `api/src/services/cdp/plugins/core/base-plugin.ts`
- Detection Testing Sites:
  - https://bot.sannysoft.com/
  - https://browserleaks.com/
  - https://pixelscan.net/
  - https://abrahamjuliot.github.io/creepjs/

## Contributing

To add new protections:

1. Add protection method to StealthPlugin class
2. Add configuration option to StealthPluginOptions interface
3. Call method in `injectStealthScripts()`
4. Add tests
5. Update documentation
6. Submit PR

Example:
```typescript
interface StealthPluginOptions extends PluginOptions {
  // Add new option
  enableNewProtection?: boolean;
}

class StealthPlugin extends BasePlugin {
  private getNewProtection(): string {
    return `/* Your protection code */`;
  }

  private async injectStealthScripts(page: Page): Promise<void> {
    // ... existing code ...
    
    if (this.options.enableNewProtection) {
      await page.evaluateOnNewDocument(this.getNewProtection());
    }
  }
}
```
