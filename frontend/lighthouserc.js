module.exports = {
  ci: {
    collect: {
      // Run Lighthouse against a local server
      startServerCommand: 'npm start',
      startServerReadyPattern: 'Local:.+(https?://.+)',
      url: ['http://localhost:3000'],
      numberOfRuns: 3
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-reports',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%'
    },
    assert: {
      assertions: {
        // Performance assertions
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': 'off', // Not a PWA yet

        // Specific performance metrics
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Mobile-specific checks
        'viewport': 'error',
        'font-size': 'error',
        'tap-targets': 'error'
      }
    }
  }
};
