import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config.js';
import { initializeDatabase } from './db/index.js';
import { ApiError } from './lib/errors.js';
import { historyRouter } from './routes/history.js';
import { optionsRouter } from './routes/options.js';
import { statsRouter } from './routes/stats.js';
import { usersRouter } from './routes/users.js';
import { wheelsRouter } from './routes/wheels.js';

initializeDatabase();

const app = new Hono();

app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: (origin) => {
      if (config.corsOrigins.includes('*')) return origin ?? '*';
      return config.corsOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// Health check — handy for readiness probes and the two-command dev flow.
app.get('/health', (c) => c.json({ status: 'ok' }));

// Feature routers. `wheels` owns /api/wheels/*; options & history own their own
// nested + top-level paths under /api (see each file's header).
app.route('/api/wheels', wheelsRouter);
app.route('/api', optionsRouter);
app.route('/api', historyRouter);
app.route('/api', usersRouter);
app.route('/api', statsRouter);

// Central error handling — the only place that shapes error responses.
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  console.error('[unhandled]', err);
  return c.json({ error: { code: 'internal_error', message: 'Something went wrong' } }, 500);
});

app.notFound((c) =>
  c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404),
);

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  console.log(`🎡 Spinner Picker API listening on http://${config.host}:${info.port}`);
  console.log(`   Database: ${config.databasePath}`);
  console.log(`   Allowed origins: ${config.corsOrigins.join(', ')}`);
});
