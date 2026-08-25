import type { Express } from 'express';
import healthRouter from './routes/health.route';
import authRouter from './routes/auth.route';

export const registerCoreRoutes = (app: Express): void => {
  app.use(healthRouter);
  app.use(authRouter);
};
