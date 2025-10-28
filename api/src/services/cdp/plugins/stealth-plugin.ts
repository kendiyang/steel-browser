import { BasePlugin, PluginOptions } from './core/base-plugin.js';
import { Browser, Page } from 'puppeteer-core';

export interface StealthPluginOptions extends PluginOptions {
  enableCanvasNoise?: boolean;
  enableAudioNoise?: boolean;
  enableWebRTCProtection?: boolean;
  enablePermissionsSpoof?: boolean;
  enableTimingProtection?: boolean;
  enableChromeRuntime?: boolean;
  enableNavigatorPlugins?: boolean;
  enableAdvancedWebdriverProtection?: boolean;
}

/**
 * StealthPlugin provides comprehensive anti-detection capabilities
 * for browser automation, protecting against:
 * - WebDriver detection
 * - Canvas/Audio fingerprinting
 * - WebRTC IP leaks
 * - Timing attacks
 * - Chrome runtime detection
 * - Navigator plugins/mimeTypes detection
 * - Permissions API detection
 * 
 * @example
 * ```typescript
 * const stealthPlugin = new StealthPlugin({
 *   name: 'stealth',
 *   enableCanvasNoise: true,
 *   enableWebRTCProtection: true
 * });
 * cdpService.registerPlugin(stealthPlugin);
 * ```
 */
export class StealthPlugin extends BasePlugin {
  protected declare options: StealthPluginOptions;

  constructor(options: Partial<StealthPluginOptions> = {}) {
    const fullOptions: StealthPluginOptions = {
      name: 'stealth-plugin',
      enableCanvasNoise: true,
      enableAudioNoise: true,
      enableWebRTCProtection: true,
      enablePermissionsSpoof: true,
      enableTimingProtection: true,
      enableChromeRuntime: true,
      enableNavigatorPlugins: true,
      enableAdvancedWebdriverProtection: true,
      ...options,
    };
    super(fullOptions);
    this.options = fullOptions;
  }

  async onPageCreated(page: Page): Promise<void> {
    await this.injectStealthScripts(page);
  }

  private async injectStealthScripts(page: Page): Promise<void> {
    // Core protection scripts (always enabled)
    await page.evaluateOnNewDocument(this.getFunctionToStringProtection());
    await page.evaluateOnNewDocument(this.getErrorStackProtection());
    await page.evaluateOnNewDocument(this.getIframeProtection());

    // Optional protection scripts based on configuration
    if (this.options.enableChromeRuntime) {
      await page.evaluateOnNewDocument(this.getChromeRuntimeSpoof());
    }

    if (this.options.enableNavigatorPlugins) {
      await page.evaluateOnNewDocument(this.getNavigatorPluginsSpoof());
    }

    if (this.options.enableAdvancedWebdriverProtection) {
      await page.evaluateOnNewDocument(this.getWebdriverProtection());
    }

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
  }

  private getChromeRuntimeSpoof(): string {
    return `
      // Chrome Runtime Spoofing - prevents detection of automation
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

      // Chrome loadTimes (legacy but still checked by some detection systems)
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

      // Seeded random for consistency within the same session
      const getRandomNoise = (x, y, seed = 0) => {
        const noise = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return (noise - Math.floor(noise)) * 2 - 1;
      };

      // Inject minimal noise into canvas data
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

      // Battery API (often missing in headless browsers)
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
        if (this === navigator.permissions?.query ||
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
