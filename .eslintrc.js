module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'react-app',
  ],
  env: { jest: true, browser: true, node: true },
  parser: '@typescript-eslint/parser',
  // parserOptions: {
  //   project: ['./tsconfig.json', './packages/*/tsconfig.json', './apps/*/tsconfig.json'],
  // },
  plugins: ['@typescript-eslint', 'import', 'node', 'prettier'],
  ignorePatterns: ['**/generated', '**/*.js'],
  rules: {
    '@typescript-eslint/member-ordering': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-require-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'prettier/prettier': 'warn',
    'import/order': ['warn', { alphabetize: { order: 'asc' } }],
    'no-console': ['warn'],
  },
  settings: {
    'import/resolver': {
      typescript: {},
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx', '.d.ts', '.ts', '.tsx', '.native.js'],
      },
    },
  },
};
