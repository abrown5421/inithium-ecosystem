import timeClockRouter from './routes/time/time-clock.route';
import timeAdminRouter from './routes/time/time-admin.route';
import timeEntryTypesRouter from './routes/time/time-entry-types.route';
import timeSettingsRouter from './routes/time/time-settings.route';
import timeExportRouter from './routes/time/time-export.route';
// inithium:anchor:imports
  app.use(timeClockRouter);
  app.use(timeAdminRouter);
  app.use(timeEntryTypesRouter);
  app.use(timeSettingsRouter);
  app.use(timeExportRouter);
  // inithium:anchor:routes
