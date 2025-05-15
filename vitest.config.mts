import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: ['.fingerprint.js', 'dist', '**/*.spec.ts', 'eslint.config.mjs', 'vitest.config.mts']
		}
	}
});
