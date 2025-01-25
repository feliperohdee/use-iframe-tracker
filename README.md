# use-iframe-tracker

🔒 A secure, iframe-based visitor tracking solution for modern web applications, with built-in protection against cross-site tracking and security vulnerabilities.

[![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/-Vitest-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 Features

- 🛡️ Secure by default with CSP, sandbox policies, and permission restrictions
- 🔄 Cross-origin and cross-tab session synchronization
- 🎯 Configurable cookie and storage management
- 🚀 Lightweight and performant implementation
- 🧩 Easy integration with any web application
- 🔒 SameSite cookie protection
- 🌐 Domain-specific cookie configuration
- ⚡ Automatic token generation using crypto.randomUUID()
- 🔄 Fallback mechanisms for token storage
- 🎭 Parent-frame synchronization options

## 📦 Installation

```bash
npm install use-iframe-tracker
# or
yarn add use-iframe-tracker
```

## 🚀 Quick Start

```typescript
import HtmlTracker from 'use-iframe-tracker';

// Initialize with minimal configuration
const tracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com'
});

// Add the tracker iframe to your page
const iframeHtml = tracker.iframe();
// Add the tracker script to your page
const trackerScript = tracker.js();
```

## 🛠️ Configuration

```typescript
type TrackerConfig = {
	baseUrl: string; // Base URL for the tracker iframe
	storageKey?: string; // localStorage key (default: 'visitor_token')
	cookieName?: string; // Cookie name (default: 'visitor_token')
	syncWithParent?: boolean; // Enable parent frame sync (default: false)
	checkInterval?: number; // Storage check interval (default: 1000ms)
	domain?: string; // Cookie domain
	secure?: boolean; // Use secure cookies (default: true)
	sameSite?: 'Strict' | 'Lax' | 'None'; // SameSite cookie policy (default: 'None')
};
```

## ☁️ Cloudflare Workers Integration

```typescript
import HtmlTracker from 'use-iframe-tracker';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Initialize tracker with your configuration
		const tracker = new HtmlTracker({
			baseUrl: 'https://your-worker-domain.com',
			secure: true,
			sameSite: 'None'
		});

		// Handle tracker endpoints
		switch (url.pathname) {
			case '/iframe':
				// Serve the tracking iframe
				return new Response(tracker.iframe(), {
					headers: {
						'content-type': 'text/html',
						'cache-control': 'public, max-age=3600'
					}
				});

			case '/snippet.js':
				// Serve the tracking script
				return new Response(tracker.js(), {
					headers: {
						'content-type': 'application/javascript',
						'cache-control': 'public, max-age=3600'
					}
				});

			default:
				return new Response('Not Found', { status: 404 });
		}
	}
};
```

### 🌐 Deploy to Cloudflare

1. Create a new Worker in your Cloudflare dashboard
2. Configure your routes (e.g., `tracker.your-domain.com/*`)
3. Deploy the code using Wrangler:

```bash
wrangler deploy
```

## 💡 Advanced Usage

### Custom Token Storage

```typescript
const tracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	storageKey: 'custom_visitor_id',
	cookieName: 'custom_visitor_cookie'
});
```

### Cross-Domain Tracking

```typescript
const tracker = new HtmlTracker({
	baseUrl: 'https://tracking.your-domain.com',
	domain: '.your-domain.com',
	sameSite: 'None',
	secure: true
});
```

## 🍪 Cookie Configuration

### Basic Cookie Setup

```typescript
const tracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	cookieName: 'visitor_id', // Custom cookie name (default: 'visitor_token')
	domain: '.your-domain.com', // Cookie domain (optional)
	secure: true, // Use secure cookie (default: true)
	sameSite: 'None' // SameSite policy (default: 'None')
});
```

### Cookie Policies

The tracker handles different cookie configurations:

```typescript
// Strict same-site policy (most secure)
const strictTracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	sameSite: 'Strict',
	secure: true
});
// Results in: 'visitor_token=abc123; path=/; secure; samesite=Strict'

// Lax same-site policy (balanced)
const laxTracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	sameSite: 'Lax'
});
// Results in: 'visitor_token=abc123; path=/; secure; samesite=Lax'

// Cross-domain tracking (least restrictive)
const crossDomainTracker = new HtmlTracker({
	baseUrl: 'https://tracking.your-domain.com',
	domain: '.your-domain.com',
	sameSite: 'None' // Will force secure=true
});
// Results in: 'visitor_token=abc123; path=/; domain=.your-domain.com; secure; samesite=None'
```

### Auto-Security Features

The tracker includes automatic cookie security features:

```typescript
// SameSite=None automatically forces secure flag
const tracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	sameSite: 'None',
	secure: false // Will be forced to true
});
// Console: "SameSite=None requires secure=true. Forcing secure=true."
// Results in: 'visitor_token=abc123; path=/; secure; samesite=None'

// Cross-domain with custom cookie
const customTracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	cookieName: 'my_visitor',
	domain: '.your-domain.com',
	sameSite: 'None',
	secure: true
});
// Results in: 'my_visitor=abc123; path=/; domain=.your-domain.com; secure; samesite=None'
```

### Cookie Persistence

The tracker maintains cookies across page loads and browser sessions:

```typescript
// Cookie is automatically synchronized with localStorage
window.getVisitorToken().then(token => {
	// Check the cookie in browser dev tools:
	// Name: visitor_token (or your custom cookieName)
	// Value: auto-generated UUID or custom token
	// Domain: your configured domain
	// Path: /
	// SameSite: your configured policy
	// Secure: true if required
	console.log('Current token:', token);
});
```

### Setup Your HTML

```html
<!-- Add the tracking script to your page -->
<script src="https://your-domain.com/snippet.js"></script>
```

### Using the Tracker APIs

```typescript
// Get the current visitor token
window.getVisitorToken().then(token => {
	console.log('Visitor token:', token);
});

// Listen for token ready events
window.addEventListener('visitor:token-ready', event => {
	const { token, timestamp } = event.detail;
	console.log('Token is ready:', token);
	console.log('Timestamp:', new Date(timestamp));
});
```

### Parent Frame Synchronization

Enable syncing between parent window and iframe:

```typescript
// Server setup
const tracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	syncWithParent: true,
	cookieName: 'my_visitor',
	storageKey: 'my_visitor_storage'
});

// In browser
// The token will automatically sync between iframe and parent
// You can listen for changes:
window.addEventListener('visitor:token-ready', event => {
	const { token, timestamp, source } = event.detail;
	console.log('Token updated from:', source);
	console.log('New token:', token);
});

// Force token refresh
window.getVisitorToken().then(token => {
	console.log('Current visitor token:', token);
});
```

### Working with Custom Storage

The tracker provides multiple storage mechanisms that work together:

```typescript
// Server setup
const tracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	cookieName: 'custom_visitor', // Custom cookie name
	storageKey: 'custom_storage_key', // Custom localStorage key
	syncWithParent: true
});

// In browser
// The token is automatically stored in:
// 1. localStorage (using storageKey)
// 2. cookies (using cookieName)
// 3. memory (fallback)
// 4. parent window (if syncWithParent is true)

// The tracker automatically syncs between all storage methods
// and recovers from storage clearing
```

### Security Features in Action

The tracker includes several security measures that work automatically:

```typescript
// Secure origin checking
window.addEventListener('message', event => {
	// Messages from unauthorized origins are automatically rejected
	// You'll see a warning in the console:
	// "Rejected message from unauthorized origin: unauthorized-domain.com"
});

// CSP violations
// If the iframe's CSP is violated, you'll see warnings:
// "Refused to load frame from 'unauthorized-domain.com' because it violates the following Content Security Policy directive..."

// Cookie security
// SameSite=None cookies automatically force secure flag
// You'll see a warning if misconfigured:
// "SameSite=None requires secure=true. Forcing secure=true."
```

## 🔒 Security Features

### Content Security Policy

The tracker implements a strict CSP that:

- Restricts resource loading to same origin
- Allows only necessary inline scripts
- Prevents unauthorized frame ancestors
- Restricts base URI manipulation

### Iframe Sandbox

Implements a secure sandbox policy allowing only:

- Essential script execution
- Same-origin communication

### Permissions Policy

Restricts access to sensitive browser features:

- Geolocation
- Camera
- Microphone
- Payment APIs
- USB access
- And more...

## 🎯 Browser Support

- ✅ Modern browsers with `crypto.randomUUID()` support
- ✅ Fallback mechanisms for token generation
- ✅ Cross-browser localStorage and cookie handling

## 🧪 Testing

```bash
# Run the test suite
npm test
# or
yarn test
```

## 🔍 Debugging

The tracker provides console warnings for:

- Invalid security configurations
- Cookie policy conflicts
- Storage synchronization issues
- Unauthorized message origins

## 🤝 Contributing

1. Fork it
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT © [Felipe Rohde](mailto:feliperohdee@gmail.com)

## ⭐ Show your support

Give a ⭐️ if this project helped you!

## 👨‍💻 Author

**Felipe Rohde**

- Twitter: [@felipe_rohde](https://twitter.com/felipe_rohde)
- Github: [@feliperohdee](https://github.com/feliperohdee)
- Email: feliperohdee@gmail.com
