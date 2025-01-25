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

### Parent Frame Synchronization

```typescript
const tracker = new HtmlTracker({
	baseUrl: 'https://your-domain.com',
	syncWithParent: true
});

// In parent frame:
window.getVisitorToken().then(token => {
	console.log('Current visitor token:', token);
});
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
