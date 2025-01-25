import { expect, describe, it } from 'vitest';
import HtmlTracker from './index';

describe('/index', () => {
	const defaultConfig = {
		baseUrl: 'https://example.com'
	};

	describe('initialization', () => {
		it('should initialize with default values', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const iframeHtml = tracker.iframe();
			const jsCode = tracker.js();

			expect(iframeHtml).to.be.a('string');
			expect(jsCode).to.be.a('string');
			expect(iframeHtml).to.include('visitor_token'); // default storage key
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
			const iframeHtml = tracker.iframe();
			const jsCode = tracker.js();

			expect(iframeHtml).to.include('custom_storage');
			expect(iframeHtml).to.include('custom_cookie');
			expect(iframeHtml).to.include('checkInterval: 2000');
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
			const iframeHtml = tracker.iframe();

			expect(iframeHtml).to.include('Content-Security-Policy');
			expect(iframeHtml).to.include("default-src 'self'");
			expect(iframeHtml).to.include("script-src 'unsafe-inline'");
		});

		it('should set proper iframe sandbox attributes', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const jsCode = tracker.js();

			expect(jsCode).to.include('allow-scripts');
			expect(jsCode).to.include('allow-same-origin');
		});

		it('should include proper security headers in iframe', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const iframeHtml = tracker.iframe();

			expect(iframeHtml).to.include('X-Frame-Options');
			expect(iframeHtml).to.include('Permissions-Policy');
		});
	});

	describe('code generation', () => {
		it('should remove comments and minify code', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const iframeHtml = tracker.iframe();
			const jsCode = tracker.js();

			expect(iframeHtml).not.to.include('//');
			expect(iframeHtml).not.to.include('/*');
			expect(jsCode).not.to.include('//');
			expect(jsCode).not.to.include('/*');
		});

		it('should generate valid HTML for iframe', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const iframeHtml = tracker.iframe();

			expect(iframeHtml).to.include('<!DOCTYPE html>');
			expect(iframeHtml).to.include('<html>');
			expect(iframeHtml).to.include('</html>');
			expect(iframeHtml).to.include('<script>');
			expect(iframeHtml).to.include('</script>');
		});

		it('should include necessary global functions in JS', () => {
			const tracker = new HtmlTracker(defaultConfig);
			const jsCode = tracker.js();

			expect(jsCode).to.include('window.getVisitorToken');
			expect(jsCode).to.include('window.setVisitorToken');
			expect(jsCode).to.include('window._sessionTrackerInitialized');
		});
	});

	describe('parent sync functionality', () => {
		it('should handle syncWithParent configuration', () => {
			const config = {
				...defaultConfig,
				syncWithParent: true
			};

			const tracker = new HtmlTracker(config);
			const iframeHtml = tracker.iframe();
			const jsCode = tracker.js();

			expect(iframeHtml).to.include('syncWithParent: true');
			expect(jsCode).to.include('syncWithParent: true');
		});
	});
});
