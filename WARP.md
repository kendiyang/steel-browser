# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Steel Browser is an open-source browser API for AI agents and apps. It provides a full-featured browser automation platform built on Fastify, Puppeteer, and Chrome DevTools Protocol (CDP), with session management, proxy support, and an extensible plugin architecture.

## Development Commands

### Setup
```bash
npm install                    # Install all workspace dependencies
npm run build                  # Build all workspaces (api + ui)
npm run build -w api          # Build API only
npm run build -w ui           # Build UI only
```

### Development
```bash
npm run dev                    # Start both API (port 3000) and UI (port 5173) with hot reload
npm run dev -w api            # Start API only
npm run dev -w ui             # Start UI only
```

### Docker Development
```bash
docker-compose -f docker-compose.dev.yml up --build   # Development with hot reload
docker-compose up                                      # Production build
docker run -p 3000:3000 -p 9223:9223 ghcr.io/steel-dev/steel-browser  # Pre-built image
```

### Code Quality
```bash
npm run lint -w api           # Lint API (max 10 warnings allowed)
npm run lint -w ui            # Lint UI (max 10 warnings allowed)
npm run pretty -w api         # Format API code with Prettier
```

### Testing
```bash
# Note: Test suite is minimal. Only one test exists currently:
# api/src/services/cdp/instrumentation/browser-logger.test.ts
npm test                      # Run tests (currently placeholder)
```

### Build Internals
```bash
# API build process (npm run build -w api):
# 1. TypeScript compilation (tsc)
# 2. Copy templates (src/templates/* -> build/templates/)
# 3. Copy fingerprint script (src/scripts/fingerprint.js -> build/scripts/)

# Extension development:
npm run prepare:recorder -w api  # Build recorder extension (must rebuild manually)
```

## Architecture

### Monorepo Structure
- **api/**: Fastify backend with CDP service, session management, file storage
  - `src/modules/`: API route modules (actions, sessions, cdp, files, selenium, logs)
  - `src/services/`: Core services (cdp, session, file)
  - `src/plugins/`: Fastify plugins for browser integration
  - `extensions/`: Chrome extensions (e.g., recorder)
- **ui/**: React frontend with Vite, TanStack Query, Radix UI
- **repl/**: Interactive testing REPL for CDP connections

### Key Architectural Concepts

#### Plugin-Based Architecture
Steel Browser uses two complementary plugin systems:

1. **Fastify Plugin System** (`steel-browser-plugin.ts`)
   - Main entry point that can be imported as a Fastify plugin
   - Registers all services, routes, and hooks
   - Enables Steel to be embedded in other Fastify applications

2. **CDP Plugin System** (`api/src/services/cdp/plugins/`)
   - Extends browser automation behavior
   - All plugins inherit from `BasePlugin` abstract class
   - Plugin lifecycle events: `onBrowserLaunch`, `onPageCreated`, `onPageNavigate`, `onPageUnload`, `onBeforePageClose`, `onBrowserClose`, `onShutdown`
   - Plugins are managed by `PluginManager` with error isolation

#### CDP Service (`api/src/services/cdp/cdp.service.ts`)
The heart of Steel Browser:
- Manages browser lifecycle (launch, close, restart)
- Handles page creation and navigation
- Provides WebSocket proxy for CDP connections
- Coordinates plugin system
- Maintains session state and context isolation

#### Session Management (`api/src/services/session.service.ts`)
- Creates isolated browser contexts per session
- Manages cookies, localStorage, sessionStorage isolation
- Handles resource cleanup and garbage collection
- Supports concurrent sessions with independent configurations

#### API Routes Organization
- `/v1/scrape`, `/v1/screenshot`, `/v1/pdf`: Quick action endpoints
- `/v1/sessions/*`: Session management (create, list, release)
- `/v1/cdp/*`: Direct CDP access
- `/v1/files/*`: File upload/download
- `/selenium/*`: Selenium WebDriver compatibility

#### Schema Validation
All API endpoints use Zod schemas for request/response validation. Schemas are defined inline with routes.

### Important Implementation Details

#### Browser Management
- Chrome executable paths checked in this order:
  - `CHROME_EXECUTABLE_PATH` env var
  - Linux: `/usr/bin/google-chrome`
  - macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - Windows: `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`
- Browser runs in incognito contexts for session isolation
- Default timeouts: 30s for navigation and general operations

#### File Storage
- Session-scoped file storage with configurable limits
- Automatic cleanup on session end
- Location determined by `FILE_STORAGE_DIR` or defaults to `./files`

#### Fingerprinting
- Fingerprint injection via `fingerprint-generator` and `fingerprint-injector` libraries
- Fingerprint script at `api/src/scripts/fingerprint.js`
- Can be disabled with `SKIP_FINGERPRINT_INJECTION=true`

## Environment Variables

Key environment variables (see `api/src/env.ts` for complete list):

### Core Configuration
- `NODE_ENV`: "test" | "development" | "staging" | "production" | "preview" (default: "development")
- `HOST`: API host (default: "0.0.0.0")
- `PORT`: API port (default: "3000")
- `USE_SSL`: Enable SSL (default: false)
- `CDP_REDIRECT_PORT`: CDP proxy port (default: "9222")

### Chrome Configuration
- `CHROME_EXECUTABLE_PATH`: Custom Chrome binary path
- `CHROME_HEADLESS`: Run headless (default: true)
- `CHROME_ARGS`: Additional Chrome args (space-separated)
- `FILTER_CHROME_ARGS`: Chrome args to filter out (space-separated)
- `CHROME_USER_DATA_DIR`: Custom user data directory
- `DEBUG_CHROME_PROCESS`: Enable Chrome process debugging

### Development
- `ENABLE_VERBOSE_LOGGING`: Verbose logs (default: false)
- `ENABLE_CDP_LOGGING`: Log CDP traffic (default: false)
- `LOG_CUSTOM_EMIT_EVENTS`: Log custom event emissions (default: false)

### Other
- `PROXY_URL`: Default proxy for sessions
- `DEFAULT_TIMEZONE`: Browser timezone override
- `SKIP_FINGERPRINT_INJECTION`: Disable fingerprinting (default: false)
- `KILL_TIMEOUT`: Session auto-kill timeout (default: 0 = disabled)

## Development Guidelines

### TypeScript Configuration
- API uses Node16 module resolution with ESNext target
- Strict mode enabled
- Declaration files generated in `build/` directory
- Source maps enabled for debugging

### Code Style
- ESLint configured with max 10 warnings allowed
- Prettier for formatting
- Husky + commitlint for commit message enforcement (conventional commits)

### Testing Approach
Testing infrastructure exists (Vitest) but test coverage is currently minimal. When adding tests:
- Unit tests: Core services and utilities
- Integration tests: API endpoints
- E2E tests: Full browser automation workflows

### Hot Reload Behavior
- API: Uses `tsx watch` for automatic restart on TypeScript changes
- UI: Vite HMR for instant updates
- Extensions: Require manual rebuild (`npm run prepare:recorder -w api`)

### Debugging
```bash
# API debugging (port 3000 exposed, CDP on 9223)
node --inspect ./api/build/index.js

# View sessions in browser
open http://localhost:3000/ui

# Access Swagger documentation
open http://localhost:3000/documentation

# Connect to Chrome DevTools
open http://localhost:9223
```

## Plugin Development

### Creating a Custom CDP Plugin

```typescript
import { BasePlugin, PluginOptions } from '@steel-browser/api/cdp-plugin';
import { Browser, Page } from 'puppeteer-core';

export class MyPlugin extends BasePlugin {
  constructor(options: PluginOptions) {
    super({ name: 'my-plugin', ...options });
  }

  async onPageCreated(page: Page): Promise<void> {
    // Your logic here
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Handle requests
      request.continue();
    });
  }

  async onShutdown(): Promise<void> {
    // Cleanup
  }
}

// Register: fastify.cdpService.registerPlugin(new MyPlugin({}));
```

### Plugin Lifecycle Order
1. `onBrowserLaunch` - Browser process starts
2. `onPageCreated` - New page/tab created
3. `onPageNavigate` - Page navigates to URL
4. `onPageUnload` - Page unloads/navigates away
5. `onBeforePageClose` - Before page closes
6. `onBrowserClose` - Browser process closes
7. `onShutdown` - Plugin cleanup

## Common Workflows

### Adding a New API Endpoint
1. Create route in appropriate module directory (`api/src/modules/`)
2. Define Zod schema for request/response validation
3. Register route in module's plugin file
4. Update OpenAPI documentation (auto-generated from Zod schemas)

### Working with Sessions
Sessions are the primary abstraction for browser management:
- Create via `/v1/sessions` POST with config (proxy, dimensions, blockAds, etc.)
- Connect using Puppeteer, Playwright, or Selenium via returned WebSocket URL
- Sessions auto-cleanup unless explicitly configured otherwise
- Use `/v1/sessions/:id/release` to manually release resources

### Extending Browser Behavior
Prefer CDP plugins over modifying core CDP service:
- Plugins provide error isolation
- Easier to test and maintain
- Can be enabled/disabled per session
- Multiple plugins can coexist without conflicts

## Important Notes

- **Node.js Version**: Requires Node.js 22+
- **Workspaces**: This is an npm workspaces monorepo. Always use `-w` flag when running workspace-specific commands
- **Commit Messages**: Follow conventional commits format (enforced by commitlint)
- **No Production Tests**: Test suite is minimal; manual testing is primary verification method
- **Chrome Required**: Chrome/Chromium must be installed at standard paths unless `CHROME_EXECUTABLE_PATH` is set
- **Mac Silicon**: Use `DOCKER_DEFAULT_PLATFORM=linux/arm64 docker compose up` for Docker on M1/M2 Macs

## Related Documentation

- Full docs: https://docs.steel.dev/
- API Reference: https://docs.steel.dev/api-reference (also at http://localhost:3000/documentation)
- Cookbook: https://github.com/steel-dev/steel-cookbook
- Architecture details: `docs/ARCHITECTURE.md`
- Development setup: `docs/DEVELOPMENT_SETUP.md`
- Plugin development: `docs/PLUGIN_DEVELOPMENT.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
