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
	private javascriptKey: string;
	private redirectAttribute: string;
	private redirectKey: string;
	private sameSite: 'Strict' | 'Lax' | 'None';
	private secure: boolean;
	private storageKey: string;
	private syncWithParent: boolean;

	constructor(config: {
		checkInterval?: number;
		cookieName?: string;
		domain?: string;
		iframeUrl: string;
		javascriptKey?: string;
		redirectAttribute?: string;
		redirectKey?: string;
		sameSite?: 'Strict' | 'Lax' | 'None';
		secure?: boolean;
		storageKey?: string;
		syncWithParent?: boolean;
	}) {
		this.iframeUrl = config.iframeUrl;
		this.checkInterval = config.checkInterval || 10000;
		this.cookieName = config.cookieName || 'visitor_token';
		this.domain = config.domain || '';
		this.javascriptKey = config.javascriptKey || 'VISITOR_TOKEN';
		this.redirectAttribute = config.redirectAttribute || 'redirect';
		this.redirectKey = config.redirectKey || 'visitor_token';
		this.sameSite = config.sameSite || 'None';
		this.secure = config.secure ?? true;
		this.storageKey = config.storageKey || 'visitor_token';
		this.syncWithParent = config.syncWithParent || false;
	}

	private getCSPPolicy(): string {
		return [
			`default-src 'self'`,
			`script-src 'unsafe-inline' 'self'`,
			`style-src 'unsafe-inline' 'self'`,
			`connect-src 'self'`,
			`base-uri 'self'`
		].join('; ');
	}

	private getSetCookieOptions(): string {
		if (this.sameSite === 'None' && !this.secure) {
			console.warn('SameSite=None requires secure=true. Forcing secure=true.');
			this.secure = true;
		}

		const expirationDate = new Date();
		expirationDate.setFullYear(expirationDate.getFullYear() + 10);

		const options = [
			'path=/',
			this.domain && `domain=${this.domain}`,
			this.secure && 'secure',
			`samesite=${this.sameSite}`,
			`expires=${expirationDate.toUTCString()}`
		].filter(Boolean);

		return options.join('; ');
	}

	private getRemoveCookieOptions(): string {
		return [
			'path=/',
			this.domain && `domain=${this.domain}`,
			this.secure && 'secure',
			`samesite=${this.sameSite}`,
			`expires=Thu, 01 Jan 1970 00:00:00 UTC`
		]
			.filter(Boolean)
			.join('; ');
	}

	iframe(options?: { title?: string; onInit?: string }) {
		const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${options?.title || 'You are being tracked'}</title>
            </head>
            <body>
                <script>
                    (() => {
						let initialized = false;
                        let memoryToken = '';

						const generateToken = () => {
                            return safeExecute(() => {
								return crypto.randomUUID();
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

						const getToken = () => {
                            return safeExecute(() => {
                                return localStorage.getItem('${this.storageKey}') || 
                                       getCookie('${this.cookieName}') || 
                                       memoryToken;
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
								case 'RESET_TOKEN':
									resetToken();
									break;
								case 'SET_TOKEN':
									setToken(event.data.token);
									break;
                            }
                        };

                        const initialize = () => {
                            if (initialized) {
								return;
							}
                            
                            window.addEventListener('message', handleMessage);
                            
                            const token = getToken() || generateToken();
                            
							setToken(token);
                            setInterval(() => {
                                const storedToken = localStorage.getItem('${this.storageKey}');

                                if (!storedToken && memoryToken) {
                                    setToken(memoryToken);
                                }
                            }, ${this.checkInterval});

                            initialized = true;

							safeExecute(() => {
								(${options?.onInit || '() => null'})({
									token: getToken(),
									timestamp: Date.now(),
									source: 'session-tracker'
								})
							});
                        };

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

						const removeCookie = (name) => {
							document.cookie = name + '=; ${this.getRemoveCookieOptions()}';
						};

						const resetToken = () => {
							safeExecute(() => {
								localStorage.removeItem('${this.storageKey}');
								removeCookie('${this.cookieName}');
								memoryToken = '';
							});
						};

                        const safeExecute = (fn) => {
                            try {
                                return fn();
                            } catch (err) {
                                console.error('Session tracker error:', err);
                                return null;
                            }
                        };

                        const setCookie = (name, value) => {
                            safeExecute(() => {
                                document.cookie = name + '=' + value + '; ${this.getSetCookieOptions()}';
                            });
                        };

                        const setToken = token => {
                            if (!token) {
								return;
							}
                            
                            safeExecute(() => {
                                localStorage.setItem('${this.storageKey}', token);
                                setCookie('${this.cookieName}', token);
                                memoryToken = token;
                            });
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

	js(options?: { onInit?: string }) {
		const iframeUrl = new URL(this.iframeUrl);

		const code = `(() => {
            if (window._sessionTrackerInitialized) {
                return;
            }
			window._sessionTrackerInitialized = true;

			let iframe;
			let tokenReadyCallbacks = new Set();

			const createSecureIframe = () => {
				return safeExecute(() => {
					const iframe = document.createElement('iframe');
					
					iframe.setAttribute('referrerpolicy', 'no-referrer');
					iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
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
			};

			const getToken = () => {
				return new Promise(resolve => {
					if (window.${this.javascriptKey}) {
						resolve(window.${this.javascriptKey});
						return;
					}

					tokenReadyCallbacks.add(resolve);
					
					safeExecute(() => {
						if (iframe.contentWindow) {
							iframe.contentWindow.postMessage({
								type: 'GET_TOKEN'
							}, '*');
						}
					});
				});
			};

			const handleTokenReady = data => {
				safeExecute(() => {
					window.${this.javascriptKey} = data.token;

					if (${this.syncWithParent}) {
						localStorage.setItem('${this.storageKey}', data.token);
						setCookie('${this.cookieName}', data.token);
					}

					window.dispatchEvent(new CustomEvent('visitor:token-ready', {
						detail: data
					}));

					tokenReadyCallbacks.forEach(callback => callback(data.token));
					tokenReadyCallbacks.clear();

					safeExecute(() => {
						(${options?.onInit || '() => null'})({
							...data,
							resetToken: resetToken.bind(this),
							setToken: setToken.bind(this)
						});
					});
				});
			};

			const resetToken = () => {
				safeExecute(() => {
					iframe.contentWindow.postMessage({
						type: 'RESET_TOKEN'
					}, '*');
				});
			};

			const safeExecute = fn => {
                try {
                    return fn();
                } catch (err) {
                    console.error('Session tracker error:', err);
                    return null;
                }
            };

			const setCookie = (name, value) => {
				safeExecute(() => {
					document.cookie = name + '=' + value + '; ${this.getSetCookieOptions()}';
				});
			};

			const setToken = token => {
				safeExecute(() => {
					iframe.contentWindow.postMessage({
						type: 'SET_TOKEN',
						token
					}, '*');
				});
			};

			const setupSecureMessageListener = () => {
				safeExecute(() => {
					window.addEventListener('message', event => {
						if (
							!iframe.contentWindow ||
							event.origin !== '${iframeUrl.origin}' ||
							event.source !== iframe.contentWindow ||
							!event.data?.type === 'TOKEN_READY' ||
							!event.data?.source === 'session-tracker' ||
							!event.data?.token
						) {
							return;
						}

						handleTokenReady(event.data);
					});
				});
			};

			iframe = createSecureIframe();
			setupSecureMessageListener();

			(async () => {
				await new Promise((resolve) => {
					iframe.onload = resolve;
				});

				await getToken();
				const params = new URLSearchParams(window.location.search);

				if (params.has('${this.redirectAttribute}')) {
					const redirect = params.get('${this.redirectAttribute}');

					if (redirect) {
						const redirectUrl = new URL(redirect);
						redirectUrl.searchParams.set('${this.redirectKey}', window.${this.javascriptKey});

						window.location.href = redirectUrl.toString();
					}
				}
			})();
        })();`;

		return removeCommentsAndMinify(code);
	}
}

export default HtmlTracker;
