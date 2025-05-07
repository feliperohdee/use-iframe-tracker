import { expect, describe, it } from 'vitest';
import HtmlTracker from './index';

describe('HtmlTracker', () => {
	const defaultConfig = {
		iframeUrl: 'https://example.com/iframe'
	};

	describe('initialization', () => {
		it('should initialize with default values', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body, headers } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.be.a('string');
			expect(body).to.include('visitor_token');

			expect(jsCode).to.include('samesite=None');
			expect(jsCode).to.include('visitor_token');
			expect(jsCode).to.include('VISITOR_TOKEN');
		});

		it('should override defaults with provided config', () => {
			const config = {
				checkInterval: 2000,
				cookieName: 'custom_cookie',
				domain: 'example.com',
				iframeUrl: 'https://example.com',
				javascriptKey: 'CUSTOM_TOKEN',
				redirectKey: 'CUSTOM_REDIRECT',
				sameSite: 'Strict' as const,
				secure: false,
				storageKey: 'custom_storage',
				redirectAttribute: 'custom_redirect'
			};

			const tracker = new HtmlTracker(config);
			const { body } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.include('custom_storage');
			expect(body).to.include('custom_cookie');

			expect(jsCode).to.include('custom_storage');
			expect(jsCode).to.include('CUSTOM_REDIRECT');
			expect(jsCode).to.include('CUSTOM_TOKEN');
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
			expect(headers['content-security-policy']).to.include("style-src 'unsafe-inline'");
			expect(headers['content-security-policy']).to.include("connect-src 'self'");
			expect(headers['content-security-policy']).to.include("base-uri 'self'");
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

			expect(headers['permissions-policy']).to.be.a('string');
			expect(headers['permissions-policy']).to.include('accelerometer=()');
			expect(headers['permissions-policy']).to.include('camera=()');
			expect(headers['permissions-policy']).to.include('geolocation=()');
			expect(headers['content-type']).to.equal('text/html');
		});

		it('should set secure iframe attributes', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const jsCode = tracker.js();

			expect(jsCode).to.include('referrerpolicy');
			expect(jsCode).to.include('importance');
			expect(jsCode).to.include('no-referrer');
			expect(jsCode).to.include("pointerEvents: 'none'");
			expect(jsCode).to.include("visibility: 'hidden'");
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
			expect(jsCode).to.include('class SessionTracker');
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
			expect(body).to.include('memoryToken');
		});

		it('should include proper message handling for token communication', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.include('handleMessage');
			expect(body).to.include('TOKEN_READY');
			expect(jsCode).to.include('setupSecureMessageListener');
			expect(jsCode).to.include('handleTokenReady');
			expect(jsCode).to.include('tokenReadyCallbacks');
		});

		it('should include error handling with safeExecute', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const { body } = tracker.iframe();
			const jsCode = tracker.js();

			expect(body).to.include('safeExecute');
			expect(body).to.include('console.error');
			expect(jsCode).to.include('safeExecute');
			expect(jsCode).to.include('console.error');
		});
	});
});
