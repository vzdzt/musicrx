import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // Performance monitoring
  tracesSampleRate: 1.0,
  // Release tracking
  release: process.env.npm_package_version || "1.0.0",
  // Environment
  environment: process.env.NODE_ENV || "development",
  // Capture more context
  beforeSend(event) {
    // Add custom context
    event.tags = {
      ...event.tags,
      service: 'musicrx-api'
    };
    return event;
  }
});
