# Steel Browser Anti-Detection Comprehensive Guide

## Executive Summary

This document provides an in-depth analysis of Reddit's detection mechanisms, steel-browser's current anti-detection implementation, identified gaps, and industrial-grade enhancements with future improvement roadmap.

## Table of Contents

1. [Reddit Detection Mechanisms](#reddit-detection-mechanisms)
2. [Steel Browser Current Implementation](#steel-browser-current-implementation)
3. [Detection Gaps Analysis](#detection-gaps-analysis)
4. [Industrial-Grade Anti-Detection Implementation](#industrial-grade-anti-detection-implementation)
5. [Future Improvement Roadmap](#future-improvement-roadmap)

---

## Reddit Detection Mechanisms

### 1. **WebDriver Detection**
Reddit (and most modern sites) detect automation through:
- `navigator.webdriver` property (returns `true` in automated browsers)
- CDP Runtime domains (`__webdriver_evaluate`, `__webdriver_script_fn`)
- Chrome CDP detection strings (`cdc_adoQpoasnfa76pfc`, `ZLmcfl_*` properties)

### 2. **Browser Fingerprinting**
- **Canvas Fingerprinting**: Unique rendering patterns
- **WebGL Fingerprinting**: GPU vendor/renderer information
- **Audio Fingerprinting**: AudioContext oscillator patterns
- **Font Fingerprinting**: Installed fonts detection
- **Hardware Fingerprinting**: CPU cores, memory, screen resolution

### 3. **Behavioral Detection**
- Mouse movement patterns (too perfect = bot)
- Typing speed and patterns
- Click timing and positioning
- Scroll behavior (instant scrolls, no momentum)
- Focus/blur events timing

### 4. **Network Fingerprinting**
- TLS fingerprinting (JA3/JA4)
- HTTP/2 fingerprinting
- Request timing patterns
- Header order and values
- Connection reuse patterns

### 5. **Advanced Detection**
- Chrome extensions detection
- Headless Chrome detection (missing features)
- Inconsistencies between properties
- Performance.now() resolution differences
- Permissions API responses
- Notification API behavior

---

## Steel Browser Current Implementation

### ✅ **Current Protections**

#### 1. **Fingerprint Script** (`api/src/scripts/fingerprint.js`)
**Coverage:**
- Removes CDP detection properties:
  - `cdc_adoQpoasnfa76pfcZLmcfl_Array`
  - `cdc_adoQpoasnfa76pfcZLmcfl_Promise`
  - `cdc_adoQpoasnfa76pfcZLmcfl_Symbol`
- Hides `navigator.webdriver`
- Masks hardware properties:
  - `hardwareConcurrency`
  - `deviceMemory`
- WebGL spoofing:
  - Vendor/Renderer information
  - GPU parameters
  - Extension support
- Console logging suppression for CDP/devtools
- Web Worker fingerprint injection

**Strengths:**
- Comprehensive WebDriver property cleanup
- WebGL parameter mocking with realistic values
- Proper Object property descriptor manipulation
- Worker context fingerprint consistency

#### 2. **Fingerprint Injection** (`cdp.service.ts`)
**Coverage:**
- User-Agent and metadata override
- Screen dimensions and device metrics
- Platform information
- Browser client hints (brands, versions)
- HTTP headers injection
- Device scale factor

**Strengths:**
- Uses `fingerprint-generator` library for realistic profiles
- Proper CDP protocol usage
- Metadata consistency across navigator properties

---

## Detection Gaps Analysis

### ❌ **Missing Protections**

#### 1. **Chrome Runtime Detection**
**Risk: HIGH**
- Missing: `window.chrome.runtime` spoofing
- Missing: Chrome extension API presence
- Missing: `chrome.loadTimes()` removal (legacy but still checked)

#### 2. **Headless Detection**
**Risk: HIGH**
- Missing: `navigator.plugins` array population
- Missing: `navigator.mimeTypes` population
- Missing: PDF viewer plugin
- Missing: Battery API realistic behavior

#### 3. **Canvas/Audio Fingerprinting**
**Risk: MEDIUM**
- Partially implemented: Canvas `toDataURL()` not modified
- Missing: Canvas `getImageData()` noise injection
- Missing: AudioContext fingerprint spoofing
- Missing: WebRTC IP leak protection

#### 4. **Permissions API**
**Risk: MEDIUM**
- Missing: Permissions query response manipulation
- Missing: Notification API behavior
- Missing: Geolocation spoofing

#### 5. **Timing Attacks**
**Risk: MEDIUM**
- Missing: `performance.now()` precision reduction
- Missing: Date.now() consistency
- Missing: Animation frame timing normalization

#### 6. **Advanced Detection**
**Risk: HIGH**
- Missing: `navigator.webdriver` getter trap (can still be detected)
- Missing: `Function.prototype.toString` source code protection
- Missing: Error stack trace sanitization
- Missing: Iframe contentWindow property consistency

---

## Industrial-Grade Anti-Detection Implementation

### Phase 1: Core Protection Plugin

```typescript
// api/src/services/cdp/plugins/stealth-plugin.ts

import { BasePlugin, PluginOptions } from './core/base-plugin.js';
import { Browser, Page } from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

export interface StealthPluginOptions extends PluginOptions {
  enableCanvasNoise?: boolean;
  enableAudioNoise?: boolean;
  enableWebRTCProtection?: boolean;
  enablePermissionsSpoof?: boolean;
  enableTimingProtection?: boolean;
}

export class StealthPlugin extends BasePlugin {
  private options: StealthPluginOptions;

  constructor(options: StealthPluginOptions = { name: 'stealth-plugin' }) {
    super(options);
    this.options = {
      enableCanvasNoise: true,
      enableAudioNoise: true,
      enableWebRTCProtection: true,
      enablePermissionsSpoof: true,
      enableTimingProtection: true,
      ...options,
    };
  }

  async onPageCreated(page: Page): Promise<void> {
    await this.injectStealthScripts(page);
  }

  private async injectStealthScripts(page: Page): Promise<void> {
    // Inject all stealth scripts before page loads
    await page.evaluateOnNewDocument(this.getChromeRuntimeSpoof());
    await page.evaluateOnNewDocument(this.getNavigatorPluginsSpoof());
    await page.evaluateOnNewDocument(this.getWebdriverProtection());
    
    if (this.options.enableCanvasNoise) {
      await page.evaluateOnNewDocument(this.getCanvasProtection());
    }
    
    if (this.options.enableAudioNoise) {
      await page.evaluateOnNewDocument(this.getAudioProtection());
    }
    
    if (this.options.enableWebRTCProtection) {
      await page.evaluateOnNewDocument(this.getWebRTCProtection());
    }
    
    if (this.options.enablePermissionsSpoof) {
      await page.evaluateOnNewDocument(this.getPermissionsSpoof());
    }
    
    if (this.options.enableTimingProtection) {
      await page.evaluateOnNewDocument(this.getTimingProtection());
    }

    await page.evaluateOnNewDocument(this.getFunctionToStringProtection());
    await page.evaluateOnNewDocument(this.getIframeProtection());
    await page.evaluateOnNewDocument(this.getErrorStackProtection());
  }

  private getChromeRuntimeSpoof(): string {
    return `
      // Chrome Runtime Spoofing
      if (!window.chrome) {
        window.chrome = {};
      }

      if (!window.chrome.runtime) {
        window.chrome.runtime = {
          connect: function() {
            return {
              onMessage: { addListener: function() {}, removeListener: function() {} },
              postMessage: function() {},
              disconnect: function() {},
              name: '',
            };
          },
          sendMessage: function() {},
          onMessage: { addListener: function() {}, removeListener: function() {} },
          id: undefined,
        };
      }

      // Chrome loadTimes (legacy but still checked)
      if (!window.chrome.loadTimes) {
        window.chrome.loadTimes = function() {
          return {
            requestTime: Date.now() / 1000 - Math.random(),
            startLoadTime: Date.now() / 1000 - Math.random(),
            commitLoadTime: Date.now() / 1000 - Math.random(),
            finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
            finishLoadTime: Date.now() / 1000 - Math.random(),
            firstPaintTime: Date.now() / 1000 - Math.random(),
            firstPaintAfterLoadTime: 0,
            navigationType: 'Other',
            wasFetchedViaSpdy: false,
            wasNpnNegotiated: true,
            npnNegotiatedProtocol: 'h2',
            wasAlternateProtocolAvailable: false,
            connectionInfo: 'h2',
          };
        };
      }

      // Chrome CSI (Chrome Speed Index)
      if (!window.chrome.csi) {
        window.chrome.csi = function() {
          return {
            startE: Date.now(),
            onloadT: Date.now(),
            pageT: Math.random() * 1000,
            tran: 15
          };
        };
      }

      // Chrome App
      if (!window.chrome.app) {
        window.chrome.app = {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        };
      }
    `;
  }

  private getNavigatorPluginsSpoof(): string {
    return `
      // Navigator Plugins & MimeTypes Spoofing
      const generatePlugins = () => {
        const plugins = [
          {
            name: 'PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            mimeTypes: [
              { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
              { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
            ]
          },
          {
            name: 'Chrome PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            mimeTypes: [
              { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
            ]
          },
          {
            name: 'Chromium PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            mimeTypes: [
              { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
            ]
          },
          {
            name: 'Microsoft Edge PDF Viewer',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            mimeTypes: [
              { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
            ]
          },
          {
            name: 'WebKit built-in PDF',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            mimeTypes: [
              { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
            ]
          }
        ];

        const pluginArray = [];
        const mimeTypeArray = [];

        plugins.forEach((plugin, index) => {
          const pluginObj = {
            name: plugin.name,
            filename: plugin.filename,
            description: plugin.description,
            length: plugin.mimeTypes.length,
          };

          plugin.mimeTypes.forEach((mimeType, mimeIndex) => {
            const mimeTypeObj = {
              type: mimeType.type,
              suffixes: mimeType.suffixes,
              description: mimeType.description,
              enabledPlugin: pluginObj,
            };
            mimeTypeArray.push(mimeTypeObj);
            pluginObj[mimeIndex] = mimeTypeObj;
            pluginObj[mimeType.type] = mimeTypeObj;
          });

          pluginArray.push(pluginObj);
        });

        return { plugins: pluginArray, mimeTypes: mimeTypeArray };
      };

      const { plugins, mimeTypes } = generatePlugins();

      Object.defineProperty(navigator, 'plugins', {
        get: () => plugins,
        configurable: true,
      });

      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => mimeTypes,
        configurable: true,
      });

      // Make plugins iterable
      plugins[Symbol.iterator] = Array.prototype[Symbol.iterator];
      mimeTypes[Symbol.iterator] = Array.prototype[Symbol.iterator];
    `;
  }

  private getWebdriverProtection(): string {
    return `
      // Advanced WebDriver Protection
      // Override navigator.webdriver with a getter trap
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
        enumerable: true
      });

      // Remove webdriver from navigator keys
      const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      Object.getOwnPropertyDescriptor = function(obj, prop) {
        if (obj === navigator && prop === 'webdriver') {
          return undefined;
        }
        return originalGetOwnPropertyDescriptor(obj, prop);
      };

      // Protect Object.getOwnPropertyNames
      const originalGetOwnPropertyNames = Object.getOwnPropertyNames;
      Object.getOwnPropertyNames = function(obj) {
        const props = originalGetOwnPropertyNames(obj);
        if (obj === navigator) {
          return props.filter(p => p !== 'webdriver');
        }
        return props;
      };

      // Protect Object.keys
      const originalObjectKeys = Object.keys;
      Object.keys = function(obj) {
        const keys = originalObjectKeys(obj);
        if (obj === navigator) {
          return keys.filter(k => k !== 'webdriver');
        }
        return keys;
      };

      // Protect hasOwnProperty
      const originalHasOwnProperty = Object.prototype.hasOwnProperty;
      Object.prototype.hasOwnProperty = function(prop) {
        if (this === navigator && prop === 'webdriver') {
          return false;
        }
        return originalHasOwnProperty.call(this, prop);
      };
    `;
  }

  private getCanvasProtection(): string {
    return `
      // Canvas Fingerprinting Protection with Noise Injection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

      // Seeded random for consistency
      const getRandomNoise = (x, y, seed = 0) => {
        const noise = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return (noise - Math.floor(noise)) * 2 - 1;
      };

      // Inject noise into canvas data
      const injectNoise = (imageData, seed) => {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const x = (i / 4) % imageData.width;
          const y = Math.floor((i / 4) / imageData.width);
          const noise = getRandomNoise(x, y, seed);
          
          // Add minimal noise (1-2 RGB values) to avoid detection
          data[i] = Math.min(255, Math.max(0, data[i] + Math.floor(noise)));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + Math.floor(noise * 0.8)));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + Math.floor(noise * 0.6)));
        }
        return imageData;
      };

      // Override getImageData
      CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        const imageData = originalGetImageData.apply(this, args);
        return injectNoise(imageData, Date.now());
      };

      // Override toDataURL
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const context = this.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          injectNoise(imageData, Date.now());
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, args);
      };

      // Override toBlob
      HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
        const context = this.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          injectNoise(imageData, Date.now());
          context.putImageData(imageData, 0, 0);
        }
        return originalToBlob.call(this, callback, ...args);
      };
    `;
  }

  private getAudioProtection(): string {
    return `
      // Audio Fingerprinting Protection
      const audioContext = window.AudioContext || window.webkitAudioContext;
      
      if (audioContext) {
        const originalCreateOscillator = audioContext.prototype.createOscillator;
        const originalCreateDynamicsCompressor = audioContext.prototype.createDynamicsCompressor;

        audioContext.prototype.createOscillator = function(...args) {
          const oscillator = originalCreateOscillator.apply(this, args);
          const originalConnect = oscillator.connect;
          
          oscillator.connect = function(destination, ...connectArgs) {
            // Add minimal frequency deviation
            if (oscillator.frequency && oscillator.frequency.value) {
              const noise = (Math.random() - 0.5) * 0.0001;
              oscillator.frequency.value += noise;
            }
            return originalConnect.call(this, destination, ...connectArgs);
          };
          
          return oscillator;
        };

        audioContext.prototype.createDynamicsCompressor = function(...args) {
          const compressor = originalCreateDynamicsCompressor.apply(this, args);
          
          if (compressor.threshold) compressor.threshold.value += (Math.random() - 0.5) * 0.1;
          if (compressor.knee) compressor.knee.value += (Math.random() - 0.5) * 0.1;
          if (compressor.ratio) compressor.ratio.value += (Math.random() - 0.5) * 0.01;
          if (compressor.attack) compressor.attack.value += (Math.random() - 0.5) * 0.001;
          if (compressor.release) compressor.release.value += (Math.random() - 0.5) * 0.001;
          
          return compressor;
        };
      }
    `;
  }

  private getWebRTCProtection(): string {
    return `
      // WebRTC IP Leak Protection
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
      const originalRTCPeerConnection = window.RTCPeerConnection;

      // Block WebRTC IP leaks
      if (originalRTCPeerConnection) {
        window.RTCPeerConnection = function(...args) {
          const pc = new originalRTCPeerConnection(...args);
          
          const originalCreateDataChannel = pc.createDataChannel;
          pc.createDataChannel = function(...dcArgs) {
            const dc = originalCreateDataChannel.apply(this, dcArgs);
            return dc;
          };

          const originalCreateOffer = pc.createOffer;
          pc.createOffer = async function(...offerArgs) {
            const offer = await originalCreateOffer.apply(this, offerArgs);
            // Remove real IP addresses from SDP
            if (offer && offer.sdp) {
              offer.sdp = offer.sdp.replace(/([0-9]{1,3}(\\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g, '0.0.0.0');
            }
            return offer;
          };

          return pc;
        };
      }

      // Mock getUserMedia to prevent camera/mic detection
      if (navigator.mediaDevices && originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = async function(constraints) {
          throw new DOMException('Permission denied', 'NotAllowedError');
        };
      }
    `;
  }

  private getPermissionsSpoof(): string {
    return `
      // Permissions API Spoofing
      if (navigator.permissions) {
        const originalQuery = navigator.permissions.query;
        
        navigator.permissions.query = function(parameters) {
          // Return realistic permission states
          const permissionStates = {
            'geolocation': 'prompt',
            'notifications': 'default',
            'push': 'prompt',
            'midi': 'prompt',
            'camera': 'prompt',
            'microphone': 'prompt',
            'speaker': 'prompt',
            'device-info': 'granted',
            'background-sync': 'granted',
            'bluetooth': 'prompt',
            'persistent-storage': 'prompt',
            'ambient-light-sensor': 'prompt',
            'accelerometer': 'prompt',
            'gyroscope': 'prompt',
            'magnetometer': 'prompt',
            'clipboard-read': 'prompt',
            'clipboard-write': 'prompt',
            'payment-handler': 'prompt',
          };

          return Promise.resolve({
            state: permissionStates[parameters.name] || 'prompt',
            onchange: null,
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return true; }
          });
        };
      }

      // Battery API (often missing in headless)
      if (!navigator.getBattery) {
        navigator.getBattery = function() {
          return Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1,
            addEventListener: function() {},
            removeEventListener: function() {},
            dispatchEvent: function() { return true; }
          });
        };
      }
    `;
  }

  private getTimingProtection(): string {
    return `
      // Timing Attack Protection
      // Reduce performance.now() precision
      const originalPerformanceNow = performance.now;
      const startTime = Date.now();
      const startPerf = originalPerformanceNow.call(performance);

      performance.now = function() {
        const realTime = originalPerformanceNow.call(performance);
        // Reduce precision to 0.1ms (from 0.005ms)
        return Math.round((realTime - startPerf + (Date.now() - startTime)) * 10) / 10;
      };

      // Date.now consistency
      const originalDateNow = Date.now;
      let lastDateNow = originalDateNow();
      
      Date.now = function() {
        const now = originalDateNow();
        // Ensure monotonic increase
        if (now <= lastDateNow) {
          lastDateNow += 1;
          return lastDateNow;
        }
        lastDateNow = now;
        return now;
      };

      // RequestAnimationFrame timing normalization
      const originalRAF = window.requestAnimationFrame;
      let rafCallCount = 0;
      
      window.requestAnimationFrame = function(callback) {
        rafCallCount++;
        return originalRAF.call(window, function(timestamp) {
          // Normalize timestamp to 60fps (16.666ms)
          const normalizedTime = rafCallCount * 16.666;
          callback(normalizedTime);
        });
      };
    `;
  }

  private getFunctionToStringProtection(): string {
    return `
      // Function.prototype.toString Protection
      const originalToString = Function.prototype.toString;
      const nativeFunctionPattern = /\\[native code\\]/;

      Function.prototype.toString = function() {
        // If this is a modified function, make it look native
        if (this === navigator.permissions.query ||
            this === navigator.mediaDevices?.getUserMedia ||
            this === HTMLCanvasElement.prototype.toDataURL ||
            this === CanvasRenderingContext2D.prototype.getImageData) {
          return 'function ' + this.name + '() { [native code] }';
        }
        return originalToString.call(this);
      };

      // Protect toString itself
      const toStringToString = Function.prototype.toString.toString();
      Function.prototype.toString.toString = () => toStringToString;
    `;
  }

  private getIframeProtection(): string {
    return `
      // Iframe ContentWindow Protection
      const originalCreateElement = document.createElement;
      
      document.createElement = function(tagName, ...args) {
        const element = originalCreateElement.call(this, tagName, ...args);
        
        if (tagName.toLowerCase() === 'iframe') {
          const originalContentWindowGetter = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get;
          
          Object.defineProperty(element, 'contentWindow', {
            get: function() {
              const win = originalContentWindowGetter.call(this);
              if (win) {
                // Ensure contentWindow has same protections
                if (!win.chrome) win.chrome = window.chrome;
                if (win.navigator) {
                  Object.defineProperty(win.navigator, 'webdriver', {
                    get: () => undefined,
                    configurable: true
                  });
                }
              }
              return win;
            },
            configurable: true
          });
        }
        
        return element;
      };
    `;
  }

  private getErrorStackProtection(): string {
    return `
      // Error Stack Trace Sanitization
      const originalError = Error;
      
      window.Error = function(...args) {
        const error = new originalError(...args);
        
        if (error.stack) {
          // Remove CDP and automation-related traces
          error.stack = error.stack
            .split('\\n')
            .filter(line => 
              !line.includes('puppeteer') &&
              !line.includes('__puppeteer') &&
              !line.includes('CDP') &&
              !line.includes('devtools') &&
              !line.includes('automation')
            )
            .join('\\n');
        }
        
        return error;
      };
      
      window.Error.prototype = originalError.prototype;
      window.Error.stackTraceLimit = originalError.stackTraceLimit;
    `;
  }
}
```

### Phase 2: Enhanced Fingerprint Script

```javascript
// api/src/scripts/fingerprint-advanced.js

(function() {
  'use strict';

  // More comprehensive CDP property removal
  const cdpPatterns = [
    'cdc_', 'ZLmcfl_', '__webdriver', '__driver', 
    '__selenium', '__fxdriver', '__lastWatirAlert',
    '__lastWatirConfirm', '__lastWatirPrompt', 
    '_Selenium_IDE_Recorder', '_selenium', 'callSelenium',
    '_WEBDRIVER_ELEM_CACHE', 'ChromeDriverw', 'driver-evaluate',
    'webdriver-evaluate', 'selenium-evaluate', 'webdriverCommand',
    'webdriver-evaluate-response', '__webdriverFunc', '__webdriver_script_fn',
    '__driver_unwrapped', '__webdriver_unwrapped', '__driver_evaluate',
    '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate',
    '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped',
    '__fxdriver_unwrapped', '$cdc_', '$chrome_', 'domAutomation',
    'domAutomationController', '__nightmare', '_phantom', '__phantomas',
    'calledPhantom', 'callPhantom', '_phantom'
  ];

  // Remove all CDP patterns from window and document
  cdpPatterns.forEach(pattern => {
    Object.keys(window).forEach(key => {
      if (key.includes(pattern)) {
        try {
          delete window[key];
        } catch(e) {}
      }
    });
    Object.keys(document).forEach(key => {
      if (key.includes(pattern)) {
        try {
          delete document[key];
        } catch(e) {}
      }
    });
  });

  // More robust navigator.webdriver removal
  delete Object.getPrototypeOf(navigator).webdriver;
  
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    set: () => {},
    configurable: true,
    enumerable: false
  });

  // Screen consistency
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const availWidth = window.screen.availWidth;
  const availHeight = window.screen.availHeight;

  Object.defineProperties(window.screen, {
    availWidth: { get: () => availWidth, configurable: true },
    availHeight: { get: () => availHeight, configurable: true },
    width: { get: () => screenWidth, configurable: true },
    height: { get: () => screenHeight, configurable: true }
  });

  // Connection spoofing
  if (navigator.connection) {
    Object.defineProperties(navigator.connection, {
      rtt: { get: () => 100 + Math.random() * 50, configurable: true },
      downlink: { get: () => 5 + Math.random() * 5, configurable: true },
      effectiveType: { get: () => '4g', configurable: true },
      saveData: { get: () => false, configurable: true }
    });
  }

  // Platform consistency
  const platform = navigator.platform;
  Object.defineProperty(navigator, 'platform', {
    get: () => platform,
    configurable: true
  });

  // Languages consistency
  const languages = navigator.languages;
  Object.defineProperty(navigator, 'languages', {
    get: () => languages,
    configurable: true
  });

})();
```

### Phase 3: Advanced Browser Launch Options

```typescript
// api/src/utils/stealth-args.ts

export function getStealthChromeLaunchArgs(): string[] {
  return [
    // Basic stealth
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--allow-running-insecure-content',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    
    // Additional stealth args
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-component-extensions-with-background-pages',
    '--disable-extensions',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--password-store=basic',
    '--use-mock-keychain',
    
    // Performance
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-tools',
    
    // Fingerprinting protection
    '--disable-features=AudioServiceOutOfProcess',
    '--disable-features=WebRtcHideLocalIpsWithMdns',
    
    // User preferences
    '--enable-automation=false',
    '--disable-infobars',
  ];
}

export function getStealthPreferences(): Record<string, any> {
  return {
    'profile.default_content_setting_values': {
      'notifications': 2,
      'geolocation': 2,
      'media_stream_mic': 2,
      'media_stream_camera': 2,
    },
    'profile.managed_default_content_settings': {
      'images': 1,
    },
    'webrtc.ip_handling_policy': 'disable_non_proxied_udp',
    'webrtc.multiple_routes_enabled': false,
    'webrtc.nonproxied_udp_enabled': false,
  };
}
```

---

## Future Improvement Roadmap

### Short Term (1-3 months)

#### 1. **Machine Learning Detection**
- Implement behavior randomization engine
- Add realistic mouse movement libraries (e.g., ghost-cursor)
- Typing speed variation algorithms
- Scroll momentum simulation

#### 2. **Network Fingerprinting**
- HTTP/2 fingerprint spoofing
- TLS fingerprint rotation (JA3/JA4)
- TCP fingerprint normalization
- Header order randomization

#### 3. **Browser Profile Management**
- Persistent browser profiles
- Cookie jar management
- Browser history simulation
- Cached resources management

### Medium Term (3-6 months)

#### 1. **Advanced Behavioral Mimicking**
```typescript
// Planned: BehaviorSimulator Plugin
class BehaviorSimulator extends BasePlugin {
  // Mouse path generation with Bézier curves
  // Realistic typing patterns
  // Focus/blur event timing
  // Scroll behavior with momentum
}
```

#### 2. **Proxy Chain Management**
```typescript
// Planned: Residential proxy rotation
// ISP-level proxy pools
// Geo-location consistency
```

#### 3. **Session Fingerprint Rotation**
```typescript
// Planned: Automatic fingerprint rotation per session
// Fingerprint consistency validation
// Browser profile recycling
```

### Long Term (6-12 months)

#### 1. **AI-Powered Detection Evasion**
- Train ML models on detection patterns
- Adaptive evasion strategies
- Real-time detection feedback loop

#### 2. **Browser Automation Standards**
- WebDriver BiDi protocol support
- CDP alternative protocols
- Native automation API usage

#### 3. **Cloud Infrastructure**
- Distributed browser grid
- Residential IP integration
- Browser profile marketplace

---

## Implementation Priority Matrix

| Feature | Priority | Complexity | Impact | Estimated Time |
|---------|----------|------------|--------|----------------|
| Chrome Runtime Spoofing | HIGH | LOW | HIGH | 1 day |
| Navigator Plugins | HIGH | MEDIUM | HIGH | 2 days |
| Canvas Protection | HIGH | MEDIUM | HIGH | 2 days |
| WebDriver Advanced Protection | HIGH | LOW | HIGH | 1 day |
| Audio Fingerprinting | MEDIUM | MEDIUM | MEDIUM | 3 days |
| WebRTC Protection | HIGH | LOW | HIGH | 1 day |
| Permissions API | MEDIUM | LOW | MEDIUM | 1 day |
| Timing Protection | MEDIUM | MEDIUM | MEDIUM | 2 days |
| Function.toString Protection | HIGH | LOW | HIGH | 1 day |
| Error Stack Sanitization | MEDIUM | LOW | MEDIUM | 1 day |
| Iframe Protection | LOW | MEDIUM | LOW | 2 days |
| Behavior Simulation | HIGH | HIGH | HIGH | 2 weeks |
| Network Fingerprinting | MEDIUM | HIGH | MEDIUM | 1 week |

---

## Testing & Validation

### Detection Testing Sites
1. **CreepJS**: https://abrahamjuliot.github.io/creepjs/
2. **BrowserLeaks**: https://browserleaks.com/
3. **PixelScan**: https://pixelscan.net/
4. **Fingerprint.js Demo**: https://fingerprintjs.com/demo/
5. **Sannysoft**: https://bot.sannysoft.com/
6. **Incolumitas**: https://bot.incolumitas.com/

### Automated Testing Framework
```typescript
// tests/anti-detection.test.ts
describe('Anti-Detection Tests', () => {
  test('WebDriver is hidden', async () => {
    const result = await page.evaluate(() => navigator.webdriver);
    expect(result).toBeUndefined();
  });

  test('Chrome runtime exists', async () => {
    const result = await page.evaluate(() => typeof window.chrome);
    expect(result).toBe('object');
  });

  test('Plugins are populated', async () => {
    const result = await page.evaluate(() => navigator.plugins.length);
    expect(result).toBeGreaterThan(0);
  });

  test('Canvas fingerprint is consistent', async () => {
    // Multiple canvas fingerprints should match
    const fp1 = await getCanvasFingerprint(page);
    const fp2 = await getCanvasFingerprint(page);
    expect(fp1).toBe(fp2);
  });
});
```

---

## Conclusion

This comprehensive guide provides industrial-grade anti-detection implementations that address all major detection vectors used by Reddit and other sophisticated platforms. The modular plugin architecture allows for easy extension and maintenance while maintaining code quality and performance.

**Key Takeaways:**
1. Steel Browser already has solid foundation (WebDriver, WebGL, fingerprint injection)
2. Critical gaps exist in Chrome runtime, plugins, and behavioral detection
3. Prioritize high-impact, low-complexity improvements first
4. Continuous testing against detection sites is essential
5. Future improvements should focus on ML-based behavior simulation

**Next Steps:**
1. Implement StealthPlugin with all core protections
2. Add comprehensive testing suite
3. Deploy to production with feature flags
4. Monitor detection rates and iterate
5. Build behavior simulation engine for long-term success
