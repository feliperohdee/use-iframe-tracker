import tseslint from 'typescript-eslint';

export default [
	{
		ignores: ['coverage', 'dist', '**/*.d.ts', '.fingerprint.js']
	},
	...tseslint.configs.recommended,
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'prefer-const': 'off'
		}
	}
];
