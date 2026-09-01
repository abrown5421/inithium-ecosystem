import express from 'express';
import cors from 'cors';
import { connectDatabase } from '@inithium/db';
import { getAuthProvider } from '@inithium/auth';
import { registerCoreRoutes } from '@inithium/api-core';
import { errorHandler } from '@inithium/api-utils';
import { attachRealtimeGateway, connectRealtime } from '@inithium/realtime';

const app = express();
// apps/web (Vite) runs on a different origin in dev - without this, the browser silently
// blocks every request the SPA makes to this API.
app.use(cors({ origin: process.env['WEB_ORIGIN'] || 'http://localhost:5173' }));
app.use(express.json());

const startServer = async () => {
  try {
    await connectDatabase({
      uri: process.env['MONGO_URI'],
      credentials: JSON.parse(process.env['FIREBASE_SERVICE_ACCOUNT_KEY'] || '{}'),
    });
    await connectRealtime();

    getAuthProvider().assertConfigured?.();
    registerCoreRoutes(app);
    app.use(errorHandler);

    const port = process.env['PORT'] || 3000;
    const server = app.listen(port, () => {
      console.log(`🚀 API listening at http://localhost:${port}`);
    });
    attachRealtimeGateway(server);
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
};

startServer();
