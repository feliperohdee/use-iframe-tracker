import { expect, describe, it } from 'vitest';
import HtmlTracker from './index';

describe('HtmlTracker', () => {
	const defaultConfig = {
		baseUrl: 'https://example.com'
	};

	describe('initialization', () => {
		it('should initialize with default values', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body, headers } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.be.a('string');
			expect(headers).to.be.an('object');
			expect(jsCode).to.be.a('string');
			expect(body).to.include('visitor_token'); // default storage key
			expect(jsCode).to.include('visitor_token'); // default cookie name
		});

		it('should override defaults with provided config', () => {
			const config = {
				baseUrl: 'https://example.com',
				storageKey: 'custom_storage',
				cookieName: 'custom_cookie',
				checkInterval: 2000,
				domain: 'example.com',
				sameSite: 'Strict' as const,
				secure: false
			};

			const tracker = new HtmlTracker(config);
			const { body } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.include('custom_storage');
			expect(body).to.include('custom_cookie');
			expect(body).to.include('checkInterval: 2000');
			expect(jsCode).to.include('domain=example.com');
			expect(jsCode).to.include('samesite=Strict');
		});
	});

	describe('security policies', () => {
		it('should force secure=true when sameSite=None', () => {
			const config = {
				...defaultConfig,
				sameSite: 'None' as const,
				secure: false
			};

			const tracker = new HtmlTracker(config);
			const jsCode = tracker.js();

			expect(jsCode).to.include('secure');
		});

		it('should include proper CSP headers', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { headers } = tracker.iframe();

			expect(headers['content-security-policy']).to.be.a('string');
			expect(headers['content-security-policy']).to.include("default-src 'self'");
			expect(headers['content-security-policy']).to.include("script-src 'unsafe-inline'");
		});

		it('should set proper iframe sandbox attributes', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const jsCode = tracker.js();

			expect(jsCode).to.include('allow-scripts');
			expect(jsCode).to.include('allow-same-origin');
		});

		it('should include proper security headers in iframe response', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { headers } = tracker.iframe();

			expect(headers['x-frame-options']).to.equal('SAMEORIGIN');
			expect(headers['permissions-policy']).to.be.a('string');
			expect(headers['content-type']).to.equal('text/html');
		});
	});

	describe('code generation', () => {
		it('should generate minified code without comments', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).not.to.include('//');
			expect(body).not.to.include('/*');
			expect(jsCode).not.to.include('/*');
		});

		it('should generate valid HTML for iframe', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body } = tracker.iframe();

			expect(body).to.include('<!DOCTYPE html>');
			expect(body).to.include('<html>');
			expect(body).to.include('</html>');
			expect(body).to.include('<script>');
			expect(body).to.include('</script>');
		});

		it('should include necessary global functions in JS', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const jsCode = tracker.js();

			expect(jsCode).to.include('window.getVisitorToken');
			expect(jsCode).to.include('window._sessionTrackerInitialized');
		});
	});

	describe('token management', () => {
		it('should include token generation and management code in iframe', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body } = tracker.iframe();

			expect(body).to.include('generateToken');
			expect(body).to.include('getToken');
			expect(body).to.include('setToken');
			expect(body).to.include('crypto.randomUUID');
		});

		it('should handle token synchronization with parent', () => {
			const config = {
				...defaultConfig,
				syncWithParent: true
			};

			const tracker = new HtmlTracker(config);
			const { body } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.include('syncWithParent: true');
			expect(jsCode).to.include('syncWithParent: true');
			expect(jsCode).to.include('localStorage.setItem');
			expect(jsCode).to.include('setCookie');
		});

		it('should include proper message handling for token communication', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.include('handleMessage');
			expect(body).to.include('TOKEN_READY');
			expect(jsCode).to.include('setupSecureMessageListener');
			expect(jsCode).to.include('handleTokenReady');
		});
	});
});
