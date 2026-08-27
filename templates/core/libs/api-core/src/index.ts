import type { Express } from 'express';
import healthRouter from './routes/health.route';
import authRouter from './routes/auth.route';
import apiUtilsCheckRouter from './routes/api-utils-check.route';
import pagesRouter from './routes/pages.route';

export const registerCoreRoutes = (app: Express): void => {
  app.use(healthRouter);
  app.use(authRouter);
  app.use(apiUtilsCheckRouter);
  app.use(pagesRouter);
  console.log(
    '📋 Core routes registered: /health, /auth/*, /api/health, /api/test-error, /api/pages/*'
  );
};

export { createCrudService } from './services/createCrudService';
export type { CrudRepository, CrudService } from './services/createCrudService';
