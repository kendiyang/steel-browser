import { BasePlugin, PluginOptions } from "./core/base-plugin.js";
import { Page } from "puppeteer-core";

export interface BehaviorSimulatorOptions extends PluginOptions {
  enableMouseMovement?: boolean;
  enableTypingPatterns?: boolean;
  enableScrollMomentum?: boolean;
  enableRandomPauses?: boolean;
  mouseMovementSpeed?: "slow" | "medium" | "fast" | "random";
  typingSpeed?: { min: number; max: number }; // WPM
  scrollSpeed?: { min: number; max: number }; // pixels per second
}

/**
 * BehaviorSimulator provides realistic human-like behavior simulation
 * including mouse movements, typing patterns, and scroll behavior
 */
export class BehaviorSimulatorPlugin extends BasePlugin {
  protected declare options: BehaviorSimulatorOptions;

  constructor(options: Partial<BehaviorSimulatorOptions> = {}) {
    const fullOptions: BehaviorSimulatorOptions = {
      name: "behavior-simulator",
      enableMouseMovement: true,
      enableTypingPatterns: true,
      enableScrollMomentum: true,
      enableRandomPauses: true,
      mouseMovementSpeed: "random",
      typingSpeed: { min: 40, max: 80 }, // 40-80 WPM
      scrollSpeed: { min: 800, max: 1500 },
      ...options,
    };
    super(fullOptions);
    this.options = fullOptions;
  }

  async onPageCreated(page: Page): Promise<void> {
    await this.injectBehaviorScripts(page);
  }

  private async injectBehaviorScripts(page: Page): Promise<void> {
    // Inject mouse movement simulation
    if (this.options.enableMouseMovement) {
      await page.evaluateOnNewDocument(this.getMouseMovementSimulation());
    }

    // Inject typing pattern simulation
    if (this.options.enableTypingPatterns) {
      await page.evaluateOnNewDocument(this.getTypingPatternSimulation());
    }

    // Inject scroll momentum
    if (this.options.enableScrollMomentum) {
      await page.evaluateOnNewDocument(this.getScrollMomentumSimulation());
    }

    // Inject random pauses
    if (this.options.enableRandomPauses) {
      await page.evaluateOnNewDocument(this.getRandomPauseSimulation());
    }
  }

  private getMouseMovementSimulation(): string {
    const speed = this.options.mouseMovementSpeed || "random";

    return `
      // Realistic Mouse Movement Simulation using Bezier curves
      (function() {
        let lastMouseX = 0;
        let lastMouseY = 0;
        let isMouseSimulated = false;

        // Bezier curve calculation for smooth paths
        function bezierCurve(t, p0, p1, p2, p3) {
          const oneMinusT = 1 - t;
          return Math.pow(oneMinusT, 3) * p0 +
                 3 * Math.pow(oneMinusT, 2) * t * p1 +
                 3 * oneMinusT * Math.pow(t, 2) * p2 +
                 Math.pow(t, 3) * p3;
        }

        // Generate realistic mouse path with curves and slight randomness
        function generateMousePath(startX, startY, endX, endY) {
          const points = [];
          const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          
          // Number of steps based on distance
          const steps = Math.max(20, Math.min(100, Math.floor(distance / 10)));
          
          // Control points for Bezier curve with randomness
          const cp1x = startX + (endX - startX) * 0.25 + (Math.random() - 0.5) * 50;
          const cp1y = startY + (endY - startY) * 0.25 + (Math.random() - 0.5) * 50;
          const cp2x = startX + (endX - startX) * 0.75 + (Math.random() - 0.5) * 50;
          const cp2y = startY + (endY - startY) * 0.75 + (Math.random() - 0.5) * 50;

          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = bezierCurve(t, startX, cp1x, cp2x, endX);
            const y = bezierCurve(t, startY, cp1y, cp2y, endY);
            
            // Add micro-movements (human tremor)
            const jitterX = (Math.random() - 0.5) * 2;
            const jitterY = (Math.random() - 0.5) * 2;
            
            points.push({
              x: Math.round(x + jitterX),
              y: Math.round(y + jitterY),
              time: i * (5 + Math.random() * 5) // Variable timing
            });
          }

          return points;
        }

        // Simulate mouse movement along path
        async function simulateMouseMovement(targetX, targetY) {
          if (isMouseSimulated) return;
          isMouseSimulated = true;

          const path = generateMousePath(lastMouseX, lastMouseY, targetX, targetY);
          
          for (const point of path) {
            const event = new MouseEvent('mousemove', {
              bubbles: true,
              cancelable: true,
              clientX: point.x,
              clientY: point.y,
              screenX: point.x,
              screenY: point.y,
            });
            
            document.dispatchEvent(event);
            lastMouseX = point.x;
            lastMouseY = point.y;
            
            // Wait with variable timing
            await new Promise(resolve => setTimeout(resolve, point.time));
          }

          isMouseSimulated = false;
        }

        // Override click events to include pre-click mouse movement
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if (type === 'click' && this instanceof Element) {
            const wrappedListener = async function(event) {
              if (!isMouseSimulated) {
                const rect = this.getBoundingClientRect();
                const targetX = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.3;
                const targetY = rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.3;
                
                await simulateMouseMovement(targetX, targetY);
                
                // Small pause before click
                await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
              }
              
              if (typeof listener === 'function') {
                listener.call(this, event);
              } else if (listener && typeof listener.handleEvent === 'function') {
                listener.handleEvent(event);
              }
            };
            
            return originalAddEventListener.call(this, type, wrappedListener, options);
          }
          
          return originalAddEventListener.call(this, type, listener, options);
        };

        // Periodic random mouse movements (idle behavior)
        setInterval(() => {
          if (!isMouseSimulated && Math.random() < 0.1) {
            const targetX = Math.random() * window.innerWidth;
            const targetY = Math.random() * window.innerHeight;
            simulateMouseMovement(targetX, targetY);
          }
        }, 5000 + Math.random() * 5000);
      })();
    `;
  }

  private getTypingPatternSimulation(): string {
    const { min, max } = this.options.typingSpeed || { min: 40, max: 80 };

    return `
      // Realistic Typing Pattern Simulation
      (function() {
        const avgWPM = ${min} + Math.random() * ${max - min};
        const avgCharDelay = 60000 / (avgWPM * 5); // 5 chars per word average

        // Common typing errors
        const typoRate = 0.05; // 5% typo rate
        const commonTypos = {
          'a': ['s', 'q'],
          'e': ['w', 'r'],
          't': ['r', 'y'],
          'o': ['i', 'p'],
          's': ['a', 'd'],
        };

        // Typing speed variations
        function getTypingDelay(char, prevChar) {
          let delay = avgCharDelay;
          
          // Longer delay after punctuation
          if (['.', '!', '?', ','].includes(prevChar)) {
            delay *= 1.5 + Math.random();
          }
          
          // Faster for repeated characters
          if (char === prevChar) {
            delay *= 0.7;
          }
          
          // Capital letters take slightly longer
          if (char.toUpperCase() === char && char.toLowerCase() !== char) {
            delay *= 1.2;
          }
          
          // Add natural variation
          delay *= 0.7 + Math.random() * 0.6;
          
          return Math.max(20, Math.min(500, delay));
        }

        // Simulate realistic typing for input fields
        const originalSetValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        const originalTextAreaSetValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;

        async function typeText(element, text) {
          element.focus();
          
          let currentValue = '';
          let prevChar = '';
          
          for (let i = 0; i < text.length; i++) {
            let char = text[i];
            
            // Simulate typos
            if (Math.random() < typoRate && commonTypos[char]) {
              const typo = commonTypos[char][Math.floor(Math.random() * commonTypos[char].length)];
              currentValue += typo;
              originalSetValue.call(element, currentValue);
              element.dispatchEvent(new Event('input', { bubbles: true }));
              
              // Wait before correcting
              await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
              
              // Backspace
              currentValue = currentValue.slice(0, -1);
              originalSetValue.call(element, currentValue);
              element.dispatchEvent(new Event('input', { bubbles: true }));
              
              await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
            }
            
            // Type correct character
            currentValue += char;
            originalSetValue.call(element, currentValue);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
            
            const delay = getTypingDelay(char, prevChar);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            prevChar = char;
          }
          
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Store original typing function for manual use
        window.__humanTypeText = typeText;
      })();
    `;
  }

  private getScrollMomentumSimulation(): string {
    const { min, max } = this.options.scrollSpeed || { min: 800, max: 1500 };

    return `
      // Realistic Scroll Momentum Simulation
      (function() {
        let isScrolling = false;
        const scrollSpeed = ${min} + Math.random() * ${max - min};

        // Easing function for smooth deceleration
        function easeOutCubic(t) {
          return 1 - Math.pow(1 - t, 3);
        }

        // Simulate scroll with momentum
        async function simulateScroll(targetY, duration = 800) {
          if (isScrolling) return;
          isScrolling = true;

          const startY = window.scrollY;
          const distance = targetY - startY;
          const startTime = Date.now();

          function scroll() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            
            const currentY = startY + distance * easedProgress;
            
            // Add micro-variations (human isn't perfectly smooth)
            const jitter = (Math.random() - 0.5) * 5;
            
            window.scrollTo(0, currentY + jitter);

            if (progress < 1) {
              requestAnimationFrame(scroll);
            } else {
              isScrolling = false;
            }
          }

          requestAnimationFrame(scroll);
        }

        // Override smooth scroll behavior
        const originalScrollTo = window.scrollTo;
        window.scrollTo = function(x, y) {
          if (typeof x === 'object') {
            y = x.top || 0;
            if (x.behavior === 'smooth') {
              simulateScroll(y);
              return;
            }
          }
          
          if (typeof y === 'number' && Math.abs(y - window.scrollY) > 100) {
            simulateScroll(y);
          } else {
            originalScrollTo.call(this, x, y);
          }
        };

        // Random scroll pauses (reading behavior)
        let scrollPauseTimeout;
        window.addEventListener('scroll', () => {
          clearTimeout(scrollPauseTimeout);
          scrollPauseTimeout = setTimeout(() => {
            // Small random movement after pause (micro-adjustments)
            if (Math.random() < 0.3) {
              window.scrollBy(0, (Math.random() - 0.5) * 20);
            }
          }, 500 + Math.random() * 1000);
        }, { passive: true });
      })();
    `;
  }

  private getRandomPauseSimulation(): string {
    return `
      // Random Pause Simulation (think time, reading time)
      (function() {
        // Track page interactions
        let lastInteractionTime = Date.now();
        let interactionCount = 0;

        // Update last interaction time
        function updateInteraction() {
          lastInteractionTime = Date.now();
          interactionCount++;
        }

        ['click', 'mousemove', 'keydown', 'scroll'].forEach(eventType => {
          document.addEventListener(eventType, updateInteraction, { passive: true });
        });

        // Simulate reading/thinking pauses
        setInterval(() => {
          const timeSinceLastInteraction = Date.now() - lastInteractionTime;
          
          // If user has been idle for a while, simulate micro-activities
          if (timeSinceLastInteraction > 3000 && Math.random() < 0.2) {
            // Small mouse movement
            const event = new MouseEvent('mousemove', {
              bubbles: true,
              clientX: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
              clientY: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
            });
            document.dispatchEvent(event);
          }
        }, 2000 + Math.random() * 3000);

        // Simulate reading patterns (longer pauses on text-heavy areas)
        const observer = new MutationObserver(() => {
          // When new content appears, simulate reading time
          if (Math.random() < 0.5) {
            const readingTime = 1000 + Math.random() * 3000;
            setTimeout(() => {
              // Subtle scroll after "reading"
              if (Math.random() < 0.7) {
                window.scrollBy(0, 50 + Math.random() * 100);
              }
            }, readingTime);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      })();
    `;
  }

  /**
   * Utility method to simulate human-like mouse movement to an element
   */
  async moveMouseToElement(page: Page, selector: string): Promise<void> {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        const rect = element.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        // Trigger the simulated mouse movement
        if (window.__humanMouseMove) {
          window.__humanMouseMove(targetX, targetY);
        }
      }
    }, selector);
  }

  /**
   * Utility method to simulate human-like typing
   */
  async typeHumanLike(page: Page, selector: string, text: string): Promise<void> {
    await page.evaluate(
      (sel, txt) => {
        const element = document.querySelector(sel);
        if (element && element instanceof HTMLElement && window.__humanTypeText) {
          window.__humanTypeText(element, txt);
        }
      },
      selector,
      text,
    );
  }
}

// Declare global augmentations for TypeScript
declare global {
  interface Window {
    __humanMouseMove?: (x: number, y: number) => Promise<void>;
    __humanTypeText?: (element: HTMLElement, text: string) => Promise<void>;
  }
}
