import { BasePlugin, PluginOptions } from './core/base-plugin.js';
import { Page, HTTPRequest } from 'puppeteer-core';

export interface NetworkFingerprintOptions extends PluginOptions {
  enableHeaderRandomization?: boolean;
  enableTLSFingerprinting?: boolean;
  enableHTTP2Fingerprinting?: boolean;
  enableRequestTiming?: boolean;
  customHeaders?: Record<string, string>;
  headerOrder?: string[];
}

/**
 * NetworkFingerprintPlugin provides protection against network-level fingerprinting
 * including TLS, HTTP/2, header order, and request timing patterns
 */
export class NetworkFingerprintPlugin extends BasePlugin {
  protected declare options: NetworkFingerprintOptions;
  private requestTimings: Map<string, number> = new Map();

  constructor(options: Partial<NetworkFingerprintOptions> = {}) {
    const fullOptions: NetworkFingerprintOptions = {
      name: 'network-fingerprint',
      enableHeaderRandomization: true,
      enableTLSFingerprinting: true,
      enableHTTP2Fingerprinting: true,
      enableRequestTiming: true,
      customHeaders: {},
      headerOrder: [
        'host',
        'connection',
        'cache-control',
        'sec-ch-ua',
        'sec-ch-ua-mobile',
        'sec-ch-ua-platform',
        'upgrade-insecure-requests',
        'user-agent',
        'accept',
        'sec-fetch-site',
        'sec-fetch-mode',
        'sec-fetch-dest',
        'referer',
        'accept-encoding',
        'accept-language',
        'cookie',
      ],
      ...options,
    };
    super(fullOptions);
    this.options = fullOptions;
  }

  async onPageCreated(page: Page): Promise<void> {
    await this.setupNetworkInterception(page);
    await this.injectNetworkScripts(page);
  }

  private async setupNetworkInterception(page: Page): Promise<void> {
    await page.setRequestInterception(true);

    page.on('request', async (request: HTTPRequest) => {
      try {
        const overrides: any = {};

        // Randomize headers if enabled
        if (this.options.enableHeaderRandomization) {
          const headers = this.randomizeHeaders(request.headers());
          overrides.headers = headers;
        }

        // Add request timing variation
        if (this.options.enableRequestTiming) {
          await this.addRequestTimingDelay(request.url());
        }

        // Continue with modifications
        if (Object.keys(overrides).length > 0) {
          await request.continue(overrides);
        } else {
          await request.continue();
        }
      } catch (error) {
        // Request already handled or page closed
        try {
          await request.continue();
        } catch (e) {
          // Ignore
        }
      }
    });
  }

  private randomizeHeaders(headers: Record<string, string>): Record<string, string> {
    const newHeaders: Record<string, string> = { ...headers };

    // Add custom headers
    Object.assign(newHeaders, this.options.customHeaders);

    // Randomize header casing (some browsers vary this)
    const shouldVaryCase = Math.random() < 0.3;
    if (shouldVaryCase) {
      const randomHeader = ['Accept-Language', 'Accept-Encoding', 'Cache-Control'][
        Math.floor(Math.random() * 3)
      ];
      if (newHeaders[randomHeader.toLowerCase()]) {
        const value = newHeaders[randomHeader.toLowerCase()];
        delete newHeaders[randomHeader.toLowerCase()];
        newHeaders[randomHeader] = value;
      }
    }

    // Add slight variations to accept headers
    if (newHeaders['accept-language']) {
      const langs = newHeaders['accept-language'].split(',');
      if (langs.length > 1 && Math.random() < 0.2) {
        // Slightly randomize quality values
        newHeaders['accept-language'] = langs
          .map((lang, i) => {
            if (i === 0) return lang;
            const q = 0.9 - i * 0.1 + (Math.random() - 0.5) * 0.05;
            return lang.includes(';q=') ? lang.replace(/;q=[\d.]+/, `;q=${q.toFixed(2)}`) : lang;
          })
          .join(',');
      }
    }

    // Add DNT header variation
    if (Math.random() < 0.5 && !newHeaders['dnt']) {
      newHeaders['dnt'] = Math.random() < 0.7 ? '1' : '0';
    }

    // Add sec-gpc (Global Privacy Control) occasionally
    if (Math.random() < 0.3 && !newHeaders['sec-gpc']) {
      newHeaders['sec-gpc'] = '1';
    }

    return newHeaders;
  }

  private async addRequestTimingDelay(url: string): Promise<void> {
    const lastRequest = this.requestTimings.get(url);
    const now = Date.now();

    if (lastRequest) {
      const timeSinceLastRequest = now - lastRequest;
      
      // Add realistic delays between same requests
      if (timeSinceLastRequest < 100) {
        const delay = 50 + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.requestTimings.set(url, Date.now());

    // Clean up old entries
    if (this.requestTimings.size > 1000) {
      const entries = Array.from(this.requestTimings.entries());
      entries.sort((a, b) => a[1] - b[1]);
      this.requestTimings = new Map(entries.slice(-500));
    }
  }

  private async injectNetworkScripts(page: Page): Promise<void> {
    // Inject TLS fingerprinting protection
    if (this.options.enableTLSFingerprinting) {
      await page.evaluateOnNewDocument(this.getTLSFingerprintProtection());
    }

    // Inject HTTP/2 fingerprinting protection
    if (this.options.enableHTTP2Fingerprinting) {
      await page.evaluateOnNewDocument(this.getHTTP2FingerprintProtection());
    }

    // Inject connection timing randomization
    await page.evaluateOnNewDocument(this.getConnectionTimingProtection());
  }

  private getTLSFingerprintProtection(): string {
    return `
      // TLS Fingerprint Protection
      (function() {
        // Modify connection properties to match real browsers
        if (window.RTCPeerConnection) {
          const originalRTCPeerConnection = window.RTCPeerConnection;
          
          window.RTCPeerConnection = function(...args) {
            const pc = new originalRTCPeerConnection(...args);
            
            // Modify ICE candidates to prevent fingerprinting
            const originalCreateOffer = pc.createOffer;
            pc.createOffer = async function(...offerArgs) {
              const offer = await originalCreateOffer.apply(this, offerArgs);
              
              if (offer && offer.sdp) {
                // Randomize some SDP parameters slightly
                offer.sdp = offer.sdp.replace(/a=fingerprint:sha-256 ([A-F0-9:]+)/g, (match, fingerprint) => {
                  // Keep most of fingerprint but vary last few bytes
                  const parts = fingerprint.split(':');
                  parts[parts.length - 1] = Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
                  return 'a=fingerprint:sha-256 ' + parts.join(':');
                });
              }
              
              return offer;
            };
            
            return pc;
          };
        }

        // Protect against timing attacks on crypto operations
        if (window.crypto && window.crypto.subtle) {
          const originalSubtle = window.crypto.subtle;
          const methods = ['encrypt', 'decrypt', 'sign', 'verify', 'digest', 'generateKey', 'deriveKey', 'importKey', 'exportKey'];
          
          methods.forEach(method => {
            if (originalSubtle[method]) {
              const original = originalSubtle[method];
              originalSubtle[method] = async function(...args) {
                const startTime = performance.now();
                const result = await original.apply(this, args);
                const elapsed = performance.now() - startTime;
                
                // Add small random delay to prevent timing analysis
                const jitter = Math.random() * 5;
                if (elapsed < 10) {
                  await new Promise(resolve => setTimeout(resolve, jitter));
                }
                
                return result;
              };
            }
          });
        }
      })();
    `;
  }

  private getHTTP2FingerprintProtection(): string {
    return `
      // HTTP/2 Fingerprint Protection
      (function() {
        // Modify fetch to add realistic headers and timing
        const originalFetch = window.fetch;
        
        window.fetch = async function(resource, init = {}) {
          // Add realistic headers
          init.headers = init.headers || {};
          
          // Ensure headers object is mutable
          if (init.headers instanceof Headers) {
            const headerObj = {};
            init.headers.forEach((value, key) => {
              headerObj[key] = value;
            });
            init.headers = headerObj;
          }
          
          // Add priority hints (HTTP/2 feature)
          if (!init.headers['importance'] && Math.random() < 0.5) {
            init.headers['importance'] = ['high', 'low', 'auto'][Math.floor(Math.random() * 3)];
          }
          
          // Add timing variation
          const delay = Math.random() * 10;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return originalFetch.call(this, resource, init);
        };

        // Protect XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(...args) {
          this.__requestStart = Date.now();
          return originalXHROpen.apply(this, args);
        };
        
        XMLHttpRequest.prototype.send = async function(...args) {
          // Add realistic delay
          if (this.__requestStart) {
            const elapsed = Date.now() - this.__requestStart;
            if (elapsed < 5) {
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            }
          }
          
          return originalXHRSend.apply(this, args);
        };
      })();
    `;
  }

  private getConnectionTimingProtection(): string {
    return `
      // Connection Timing Protection
      (function() {
        // Modify Resource Timing API to add noise
        const originalGetEntriesByType = Performance.prototype.getEntriesByType;
        
        Performance.prototype.getEntriesByType = function(type) {
          const entries = originalGetEntriesByType.call(this, type);
          
          if (type === 'resource' || type === 'navigation') {
            return entries.map(entry => {
              const modifiedEntry = {};
              
              for (const key in entry) {
                let value = entry[key];
                
                // Add noise to timing values
                if (typeof value === 'number' && key.includes('Time') || key.includes('Start') || key.includes('End')) {
                  value += (Math.random() - 0.5) * 10;
                }
                
                modifiedEntry[key] = value;
              }
              
              return modifiedEntry;
            });
          }
          
          return entries;
        };

        // Protect against connection counting
        const originalGetEntriesByName = Performance.prototype.getEntriesByName;
        Performance.prototype.getEntriesByName = function(name, type) {
          const entries = originalGetEntriesByName.call(this, name, type);
          
          // Limit observable connection reuse patterns
          return entries.slice(0, Math.min(entries.length, 10));
        };

        // Add noise to connection info
        if (navigator.connection) {
          const originalConnection = navigator.connection;
          const connectionProps = {};
          
          ['downlink', 'rtt', 'saveData', 'effectiveType'].forEach(prop => {
            if (prop in originalConnection) {
              let value = originalConnection[prop];
              
              Object.defineProperty(connectionProps, prop, {
                get: function() {
                  if (prop === 'downlink') {
                    return value + (Math.random() - 0.5) * 0.5;
                  } else if (prop === 'rtt') {
                    return Math.round(value + (Math.random() - 0.5) * 10);
                  }
                  return value;
                },
                enumerable: true,
              });
            }
          });
          
          Object.setPrototypeOf(connectionProps, originalConnection);
          
          Object.defineProperty(navigator, 'connection', {
            get: () => connectionProps,
            configurable: true,
          });
        }
      })();
    `;
  }

  /**
   * Update proxy configuration to prevent IP leaks
   */
  async configureProxy(page: Page, proxyUrl: string): Promise<void> {
    const client = await page.target().createCDPSession();
    
    try {
      await client.send('Network.enable');
      
      // Set proxy
      await client.send('Network.setExtraHTTPHeaders', {
        headers: {
          'Proxy-Connection': 'keep-alive',
        },
      });

      if (this.cdpService) {
        this.cdpService.getLogger('NetworkFingerprint').info(`Proxy configured: ${proxyUrl}`);
      }
    } catch (error) {
      if (this.cdpService) {
        this.cdpService.getLogger('NetworkFingerprint').error(`Error configuring proxy: ${error}`);
      }
    } finally {
      await client.detach();
    }
  }

  /**
   * Generate realistic header order based on browser type
   */
  getRealisticHeaderOrder(browserType: 'chrome' | 'firefox' | 'safari' = 'chrome'): string[] {
    const headerOrders = {
      chrome: [
        'host',
        'connection',
        'cache-control',
        'sec-ch-ua',
        'sec-ch-ua-mobile',
        'sec-ch-ua-platform',
        'upgrade-insecure-requests',
        'user-agent',
        'accept',
        'sec-fetch-site',
        'sec-fetch-mode',
        'sec-fetch-dest',
        'referer',
        'accept-encoding',
        'accept-language',
        'cookie',
      ],
      firefox: [
        'host',
        'user-agent',
        'accept',
        'accept-language',
        'accept-encoding',
        'referer',
        'connection',
        'upgrade-insecure-requests',
        'cookie',
      ],
      safari: [
        'host',
        'accept',
        'user-agent',
        'accept-language',
        'accept-encoding',
        'connection',
        'referer',
        'cookie',
      ],
    };

    return headerOrders[browserType];
  }
}
