import express from 'express';
import { connectDatabase } from '@inithium/db';
import { getAuthProvider } from '@inithium/auth';
import { registerCoreRoutes } from '@inithium/api-core';
import { errorHandler } from '@inithium/api-utils';

const app = express();
app.use(express.json());

const startServer = async () => {
  try {
    await connectDatabase({
      uri: process.env['MONGO_URI'],
      credentials: JSON.parse(process.env['FIREBASE_SERVICE_ACCOUNT_KEY'] || '{}'),
    });

    getAuthProvider().assertConfigured?.();
    registerCoreRoutes(app);
    app.use(errorHandler);

    const port = process.env['PORT'] || 3000;
    app.listen(port, () => {
      console.log(`🚀 API listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
};

startServer();
