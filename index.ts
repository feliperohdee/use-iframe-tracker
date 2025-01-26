type TrackerConfig = {
	checkInterval?: number;
	cookieName?: string;
	domain?: string;
	iframeUrl: string;
	redirectAttribute?: string;
	sameSite?: 'Strict' | 'Lax' | 'None';
	secure?: boolean;
	storageKey?: string;
	syncWithParent?: boolean;
};

const removeCommentsAndMinify = (code: string) => {
	// First remove multi-line comments /* ... */
	let result = code.replace(/\/\*[\s\S]*?\*\//g, '');

	// Then remove single-line comments while preserving URLs
	// Negative lookbehind (?<!:) ensures we don't match // after :
	result = result.replace(/(?<!:)\/\/.*/g, '');

	// Finally, minimize whitespace while preserving single spaces
	result = result.replace(/\s+/g, ' ').trim();

	return result;
};

class HtmlTracker {
	private checkInterval: number;
	private cookieName: string;
	private domain: string;
	private iframeUrl: string;
	private redirectAttribute: string;
	private sameSite: 'Strict' | 'Lax' | 'None';
	private secure: boolean;
	private storageKey: string;
	private syncWithParent: boolean;

	constructor(config: TrackerConfig) {
		this.iframeUrl = config.iframeUrl;
		this.checkInterval = config.checkInterval || 1000;
		this.cookieName = config.cookieName || 'visitor_token';
		this.domain = config.domain || '';
		this.redirectAttribute = config.redirectAttribute || 'redirect';
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
			"base-uri 'self'"
		].join('; ');
	}

	iframe() {
		const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>You are being tracked</title>
            </head>
            <body>
                <script>
                    (() => {
                        const CONFIG = {
                            checkInterval: ${this.checkInterval},
                            cookieName: '${this.cookieName}',
                            cookieOptions: '${this.getCookieOptions()}',
                            storageKey: '${this.storageKey}',
                            syncWithParent: ${this.syncWithParent},
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
                            return safeExecute(() => {
								return crypto.randomUUID();
							});
                        };

                        const setCookie = (name, value) => {
                            safeExecute(() => {
                                document.cookie = name + '=' + value + '; ' + CONFIG.cookieOptions;
                            });
                        };

                        const getCookie = name => {
                            return safeExecute(() => {
                                const value = '; ' + document.cookie;
                                const parts = value.split('; ' + name + '=');
                                
								if (parts.length === 2) {
									return parts.pop()?.split(';').shift();
								}

                                return null;
                            });
                        };

                        let memoryToken = '';
                        let isInitialized = false;

                        const notifyParent = token => {
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

                        const setToken = token => {
                            if (!token) return;
                            
                            safeExecute(() => {
                                localStorage.setItem(CONFIG.storageKey, token);
                                setCookie(CONFIG.cookieName, token);
                                memoryToken = token;
                            });
                        };

                        const handleMessage = event => {
                            if (!event.data?.type) {
								return;
							};

                            switch (event.data.type) {
                                case 'GET_TOKEN':
                                    notifyParent(getToken());
                                    break;
                            }
                        };

                        const initialize = () => {
                            if (isInitialized) {
								return;
							}
                            
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

		return {
			body: removeCommentsAndMinify(html),
			headers: {
				'content-type': 'text/html',
				'content-security-policy': this.getCSPPolicy(),
				'permissions-policy':
					'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
			}
		};
	}

	js() {
		const iframeUrl = new URL(this.iframeUrl);

		const code = `(() => {
            if (window._sessionTrackerInitialized) {
                return;
            }

            const CONFIG = {
				redirectAttribute: '${this.redirectAttribute}',
                cookieName: '${this.cookieName}',
                cookieOptions: '${this.getCookieOptions()}',
                storageKey: '${this.storageKey}',
                syncWithParent: ${this.syncWithParent}
            };

            const safeExecute = fn => {
                try {
                    return fn();
                } catch (error) {
                    console.error('Session tracker error:', error);
                    return null;
                }
            };

            class SessionTracker {
                constructor() {
                    this.tokenReadyCallbacks = new Set();
                    this.iframe = this.createSecureIframe();
                    this.setupSecureMessageListener();
                    window._sessionTrackerInitialized = true;

					(async () => {
						await new Promise((resolve) => {
							this.iframe.onload = resolve;
						});
						await this.getToken();
						const params = new URLSearchParams(window.location.search);

						if (params.has(CONFIG.redirectAttribute)) {
							const redirect = params.get(CONFIG.redirectAttribute);

							if (redirect) {
								const redirectUrl = new URL(redirect);
								redirectUrl.searchParams.set(CONFIG.cookieName, window.VISITOR_TOKEN);

								window.location.href = redirectUrl.toString();
							}
						}
					})();
                }

                createSecureIframe() {
                    return safeExecute(() => {
                        const iframe = document.createElement('iframe');
                        
                        iframe.sandbox = '${this.getIframeSandboxPolicy()}';
                        iframe.allow = '';
                        
                        iframe.setAttribute('referrerpolicy', 'no-referrer');
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

                        iframe.src = '${iframeUrl.href}';
                        document.body.appendChild(iframe);

                        return iframe;
                    });
                }

                setupSecureMessageListener() {
                    safeExecute(() => {
                        window.addEventListener('message', event => {
                            if (
								!this.iframe.contentWindow ||
                                event.origin !== '${iframeUrl.origin}' ||
								event.source !== this.iframe.contentWindow ||
                                !event.data?.type === 'TOKEN_READY' ||
                                !event.data?.source === 'session-tracker' ||
                                !event.data?.token
                            ) {
                                return;
                            }

                            this.handleTokenReady(event.data);
                        });
                    });
                }

                handleTokenReady(data) {
                    safeExecute(() => {
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
                    });
                }

                setCookie(name, value) {
                    safeExecute(() => {
                        document.cookie = name + '=' + value + '; ' + CONFIG.cookieOptions;
                    });
                }

                getToken() {
                    return new Promise(resolve => {
                        if (window.VISITOR_TOKEN) {
                            resolve(window.VISITOR_TOKEN);
                            return;
                        }

                        this.tokenReadyCallbacks.add(resolve);
                        
                        safeExecute(() => {
                            if (this.iframe.contentWindow) {
                                this.iframe.contentWindow.postMessage({
                                    type: 'GET_TOKEN'
                                }, '*');
                            }
                        });
                    });
                }
            }

            const tracker = new SessionTracker();

            window.getVisitorToken = () => {
				return tracker.getToken();
			};
        })();`;

		return removeCommentsAndMinify(code);
	}
}

export default HtmlTracker;
