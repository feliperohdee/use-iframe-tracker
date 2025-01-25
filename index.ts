type TrackerConfig = {
	baseUrl: string;
	storageKey?: string;
	cookieName?: string;
	syncWithParent?: boolean;
	checkInterval?: number;
	domain?: string;
	secure?: boolean;
	sameSite?: 'Strict' | 'Lax' | 'None';
};

const removeCommentsAndMinify = (code: string) => {
	return code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\s+/g, ' ');
};

class HtmlTracker {
	private baseUrl: string;
	private checkInterval: number;
	private cookieName: string;
	private domain: string;
	private sameSite: 'Strict' | 'Lax' | 'None';
	private secure: boolean;
	private storageKey: string;
	private syncWithParent: boolean;

	constructor(config: TrackerConfig) {
		this.baseUrl = config.baseUrl;
		this.checkInterval = config.checkInterval || 1000;
		this.cookieName = config.cookieName || 'visitor_token';
		this.domain = config.domain || '';
		this.sameSite = config.sameSite || 'None';
		this.secure = config.secure ?? true;
		this.storageKey = config.storageKey || 'visitor_token';
		this.syncWithParent = config.syncWithParent || false;
	}

	private getCookieOptions(): string {
		if (this.sameSite === 'None' && !this.secure) {
			console.warn('SameSite=None requires secure=true. Forcing secure=true.');
			this.secure = true;
		}

		const options = ['path=/', this.domain && `domain=${this.domain}`, this.secure && 'secure', `samesite=${this.sameSite}`].filter(
			Boolean
		);

		return options.join('; ');
	}

	private getIframeSandboxPolicy(): string {
		return ['allow-scripts', 'allow-same-origin'].join(' ');
	}

	private getCSPPolicy(): string {
		return [
			"default-src 'self'",
			"script-src 'unsafe-inline' 'self'",
			"style-src 'unsafe-inline' 'self'",
			"connect-src 'self'",
			"frame-ancestors 'self'",
			"base-uri 'self'"
		].join('; ');
	}

	iframe() {
		const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Session Manager</title>
                <meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
                <meta http-equiv="Content-Security-Policy" content="${this.getCSPPolicy()}">
                <meta http-equiv="Permissions-Policy" content="accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()">
            </head>
            <body>
                <script>
                    (() => {
                        const CONFIG = {
                            storageKey: '${this.storageKey}',
                            cookieName: '${this.cookieName}',
                            syncWithParent: ${this.syncWithParent},
                            checkInterval: ${this.checkInterval},
                            cookieOptions: '${this.getCookieOptions()}'
                        };

                        const safeExecute = (fn) => {
                            try {
                                return fn();
                            } catch (error) {
                                console.error('Session tracker error:', error);
                                return null;
                            }
                        };

                        const generateToken = () => {
                            return safeExecute(() => crypto.randomUUID());
                        };

                        const setCookie = (name, value) => {
                            safeExecute(() => {
                                document.cookie = name + '=' + value + '; ' + CONFIG.cookieOptions;
                            });
                        };

                        const getCookie = (name) => {
                            return safeExecute(() => {
                                const value = '; ' + document.cookie;
                                const parts = value.split('; ' + name + '=');
                                if (parts.length === 2) return parts.pop()?.split(';').shift();
                                return null;
                            });
                        };

                        let memoryToken = '';
                        let isInitialized = false;

                        const notifyParent = (token) => {
                            if (window.parent && token) {
                                const response = {
                                    token,
                                    timestamp: Date.now(),
                                    source: 'session-tracker'
                                };
                                window.parent.postMessage({
                                    type: 'TOKEN_READY',
                                    ...response
                                }, '*');
                            }
                        };

                        const getToken = () => {
                            return safeExecute(() => {
                                return localStorage.getItem(CONFIG.storageKey) || 
                                       getCookie(CONFIG.cookieName) || 
                                       memoryToken;
                            });
                        };

                        const setToken = (token) => {
                            if (!token) return;
                            
                            safeExecute(() => {
                                localStorage.setItem(CONFIG.storageKey, token);
                                setCookie(CONFIG.cookieName, token);
                                memoryToken = token;
                            });
                        };

                        const handleMessage = (event) => {
                            if (!event.data?.type) return;

                            switch (event.data.type) {
                                case 'GET_TOKEN':
                                    notifyParent(getToken());
                                    break;
                            }
                        };

                        const initialize = () => {
                            if (isInitialized) return;
                            
                            window.addEventListener('message', handleMessage);
                            
                            const token = getToken() || generateToken();
                            setToken(token);
                            
                            setInterval(() => {
                                const storedToken = localStorage.getItem(CONFIG.storageKey);
                                if (!storedToken && memoryToken) {
                                    setToken(memoryToken);
                                }
                            }, CONFIG.checkInterval);

                            isInitialized = true;
                        };

                        initialize();
                    })();
                </script>
            </body>
            </html>
        `;

		return removeCommentsAndMinify(html);
	}

	js() {
		const code = `(() => {
            if (window._sessionTrackerInitialized) {
                return;
            }

            const CONFIG = {
                storageKey: '${this.storageKey}',
                cookieName: '${this.cookieName}',
                syncWithParent: ${this.syncWithParent},
                cookieOptions: '${this.getCookieOptions()}'
            };

            class SessionTracker {
                constructor() {
                    this.tokenReadyCallbacks = new Set();
                    this.iframe = this.createSecureIframe();
                    this.setupSecureMessageListener();
                    window._sessionTrackerInitialized = true;
                }

                createSecureIframe() {
                    const iframe = document.createElement('iframe');
                    
                    iframe.sandbox = '${this.getIframeSandboxPolicy()}';
                    iframe.allow = '';
                    
                    iframe.setAttribute('referrerpolicy', 'no-referrer');
                    iframe.setAttribute('loading', 'lazy');
                    iframe.setAttribute('importance', 'low');
                    
                    Object.assign(iframe.style, {
                        width: '0',
                        height: '0',
                        border: 'none',
                        position: 'absolute',
                        left: '-9999px',
                        pointerEvents: 'none',
                        visibility: 'hidden'
                    });

                    iframe.src = '${this.baseUrl}/iframe';
                    document.body.appendChild(iframe);

                    return iframe;
                }

                setupSecureMessageListener() {
                    window.addEventListener('message', (event) => {
                        if (event.origin !== '${this.baseUrl}') {
                            console.warn('Rejected message from unauthorized origin:', event.origin);
                            return;
                        }

                        if (!this.iframe.contentWindow || event.source !== this.iframe.contentWindow) {
                            console.warn('Rejected message from unauthorized source');
                            return;
                        }

                        if (
                            !event.data?.type === 'TOKEN_READY' ||
                            !event.data?.source === 'session-tracker' ||
                            !event.data?.token
                        ) {
                            return;
                        }

                        this.handleTokenReady(event.data);
                    });
                }

                handleTokenReady(data) {
                    window.VISITOR_TOKEN = data.token;

                    if (CONFIG.syncWithParent) {
						localStorage.setItem(CONFIG.storageKey, data.token);
                        this.setCookie(CONFIG.cookieName, data.token);
                    }

                    window.dispatchEvent(new CustomEvent('visitor:token-ready', {
                        detail: data
                    }));

                    this.tokenReadyCallbacks.forEach(callback => callback(data.token));
                    this.tokenReadyCallbacks.clear();
                }

                setCookie(name, value) {
                    document.cookie = name + '=' + value + '; ' + CONFIG.cookieOptions;
                }

                getToken() {
                    return new Promise((resolve) => {
                        if (window.VISITOR_TOKEN) {
                            resolve(window.VISITOR_TOKEN);
                            return;
                        }

                        this.tokenReadyCallbacks.add(resolve);
                        
                        if (this.iframe.contentWindow) {
                            this.iframe.contentWindow.postMessage({
                                type: 'GET_TOKEN'
                            }, '*');
                        }
                    });
                }
            }

            const tracker = new SessionTracker();
            window.getVisitorToken = () => tracker.getToken();
        })();`;

		return removeCommentsAndMinify(code);
	}
}

export default HtmlTracker;
