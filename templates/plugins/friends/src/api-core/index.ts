import type { Express } from 'express';
import healthRouter from './routes/health.route';
import authRouter from './routes/auth.route';
import apiUtilsCheckRouter from './routes/api-utils-check.route';
import pagesRouter from './routes/pages.route';
import presenceRouter from './routes/presence.route';
import notificationsRouter from './routes/notifications.route';
import usersRouter from './routes/users.route';
import settingsRouter from './routes/settings.route';
import blogRouter from './routes/blog.route';
import profileRouter from './routes/profile.route';
import storageRouter from './routes/storage.route';
import friendsRouter from './routes/friends.route';

export const registerCoreRoutes = (app: Express): void => {
  app.use(healthRouter);
  app.use(authRouter);
  app.use(apiUtilsCheckRouter);
  app.use(pagesRouter);
  app.use(presenceRouter);
  app.use(notificationsRouter);
  app.use(usersRouter);
  app.use(settingsRouter);
  app.use(blogRouter);
  app.use(profileRouter);
  app.use(storageRouter);
  app.use(friendsRouter);
  console.log(
    '📋 Core routes registered: /health, /auth/*, /api/health, /api/test-error, /api/pages/*, /api/users/:id/presence, /api/notifications*, /api/users*, /api/settings*, /api/blog*, /api/profile*, /api/storage*, /api/friends*'
  );
};

export { createCrudService } from './services/createCrudService';
export type { CrudRepository, CrudService } from './services/createCrudService';
