import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a custom registry
export const register = new Registry();

// Enable default metrics (CPU, memory, etc.) and register them
collectDefaultMetrics({ register });

// Standard HTTP metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed, labeled by method, route, and status code.',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Latency of HTTP requests in seconds, labeled by method, route, and status code.',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // detailed buckets for backend response times
});

// Register the custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);

/**
 * Middleware to measure HTTP request duration and count total requests.
 * Uses req.route.path to avoid high cardinality labels (e.g. tracking /api/v1/cron/:id instead of raw IDs).
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip tracking the /metrics endpoint itself to avoid self-scraping noise
  if (req.path === '/metrics') {
    next();
    return;
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;

    let route = 'unknown';
    if (req.route) {
      // Use matched route path (e.g. /cron/:id) to prevent high cardinality.
      route = req.baseUrl + req.route.path;
    } else if (res.statusCode === 404) {
      route = 'not_found';
    }

    const method = req.method;
    const status = res.statusCode.toString();

    // Increment request counter
    httpRequestsTotal.labels(method, route, status).inc();

    // Record latency in histogram
    httpRequestDurationSeconds.labels(method, route, status).observe(durationInSeconds);
  });

  next();
};
