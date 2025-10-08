module.exports = {
  testEnvironment: 'node',
  testMatch: process.env.CI ? [
    '**/tests/basic.test.js',
    '**/tests/contextManager.test.js'
  ] : [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],
  testPathIgnorePatterns: process.env.CI ? [
    'tests/albums.test.js',
    'tests/integration.test.js',
    'tests/media.test.js'
  ] : [
    'tests/health.test.js',
    'tests/albums.test.js',
    'tests/integration.test.js',
    'tests/media.test.js'
  ],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/server.js',
    '!backend/instrument.js',
    '!backend/test_*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  transform: {},
  transformIgnorePatterns: [
    'node_modules/(?!(mongodb-memory-server)/)'
  ]
};
