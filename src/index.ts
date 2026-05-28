import type {} from './types/express';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { clerkWebhookHandler } from './webhooks/clerk';
import route from './routes/route';
import { setupSwagger } from './config/swagger.setup';
import { initializeCronJobs, stopAllCronJobs } from './services/cron-scheduler.service';
import { metricsMiddleware, register } from './middleware/metrics.middleware';

const app = express();
const port = process.env.PORT || 3000;

// Apply metrics middleware to trace all incoming requests
app.use(metricsMiddleware);

// Clerk webhook route must be registered before express.json() raw parser
app.post(
  '/webhooks/clerk',
  express.raw({ type: 'application/json' }),
  clerkWebhookHandler
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'x-username', 'X-Username'],
    exposedHeaders: ['Content-Type', 'Authorization', 'authorization', 'x-username', 'X-Username'],
  })
);

// Setup Swagger documentation
setupSwagger(app);

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Mochi API' });
});

// Metrics endpoint for Prometheus monitoring
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error instanceof Error ? error.message : 'Internal Server Error');
  }
});

app.use('/api/v1', clerkMiddleware(), route);

const server = app.listen(port, async () => {
  console.log(`Server is running on port http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
  console.log(`Swagger JSON spec available at http://localhost:${port}/api-docs.json`);

  // Initialize cron jobs after server starts
  try {
    console.log('\n=== Initializing Cron Scheduler ===');
    await initializeCronJobs();
    console.log('=== Cron Scheduler Initialized ===\n');
  } catch (error) {
    console.error('Failed to initialize cron jobs:', error);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n=== Shutting down gracefully ===');
  stopAllCronJobs();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n=== Shutting down gracefully ===');
  stopAllCronJobs();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
