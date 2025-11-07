import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { env } from './config/env';
import { logger } from './utils/logger';

// Declare Bun as optional global (for runtime detection)
declare const Bun: any;

// Import routes
import scanRoutes from './routes/scan';
import decodeRoutes from './routes/decode';
import compareRoutes from './routes/compare';

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', honoLogger());
app.use('*', prettyJSON());

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Car Sticker Scanner API',
    version: '0.1.0',
    status: 'ok',
    endpoints: {
      scan: '/api/scan',
      decode: '/api/decode',
      compare: '/api/compare',
      health: '/health',
    },
  });
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

// Mount API routes
app.route('/api/scan', scanRoutes);
app.route('/api/decode', decodeRoutes);
app.route('/api/compare', compareRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
      path: c.req.path,
    },
    404
  );
});

// Error handler
app.onError((error, c) => {
  logger.error('Unhandled error', {
    error,
    path: c.req.path,
    method: c.req.method,
  });

  return c.json(
    {
      error: 'Internal Server Error',
      message: error.message,
    },
    500
  );
});

// Start server (supports both Bun and Node.js)
if (typeof Bun !== 'undefined') {
  // Bun runtime
  const server = Bun.serve({
    fetch: app.fetch,
    port: env.PORT,
  });

  logger.info('Server started (Bun)', {
    port: env.PORT,
    environment: env.NODE_ENV,
    url: `http://localhost:${env.PORT}`,
  });

  process.on('SIGINT', () => {
    logger.info('Shutting down gracefully...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down gracefully...');
    server.stop();
    process.exit(0);
  });
} else {
  // Node.js runtime
  const { serve } = await import('@hono/node-server');

  serve({
    fetch: app.fetch,
    port: env.PORT,
  });

  logger.info('Server started (Node.js)', {
    port: env.PORT,
    environment: env.NODE_ENV,
    url: `http://localhost:${env.PORT}`,
  });

  process.on('SIGINT', () => {
    logger.info('Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down gracefully...');
    process.exit(0);
  });
}

export default app;
