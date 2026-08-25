import express from 'express';
import { connectDatabase } from '@inithium/db';

const app = express();
app.use(express.json());

const startServer = async () => {
  try {
    await connectDatabase({
      uri: process.env['MONGO_URI'],
      credentials: JSON.parse(process.env['FIREBASE_SERVICE_ACCOUNT_KEY'] || '{}'),
    });

    const port = process.env['PORT'] || 3000;
    app.listen(port, () => {
      console.log(`🚀 API listening at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
