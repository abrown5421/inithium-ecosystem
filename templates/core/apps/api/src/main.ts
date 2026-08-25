import express from 'express';
import { connectDatabase, setDbProvider, getDbProvider, DbProvider } from '@inithium/db';

const app = express();
app.use(express.json());

const initializeDatabase = async (): Promise<void> => {
  // Check if Firebase provider exists (injected via plugin)
  try {
    // Dynamic import to handle optional plugin presence gracefully
    const firebaseModule = await import('@inithium/db/providers/firebase/firebase.provider' as string);
    if (firebaseModule?.firebaseProvider) {
      setDbProvider(firebaseModule.firebaseProvider as DbProvider);
    }
  } catch {
    // Firebase plugin not present; defaults silently to mongoProvider
  }

  // Connect using active provider (Firebase if injected, MongoDB as fallback)
  const activeProvider = getDbProvider();
  
  if (activeProvider.name === 'Firebase Firestore') {
    await connectDatabase({
      credentials: JSON.parse(process.env['FIREBASE_SERVICE_ACCOUNT_KEY'] || '{}'),
    });
  } else {
    await connectDatabase({
      uri: process.env['MONGO_URI'],
    });
  }
};

const startServer = async () => {
  try {
    await initializeDatabase();

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