import { initializeApp, getApps, cert, deleteApp } from 'firebase-admin/app';
import { DbProvider, DbConfig, UserRepository } from '@inithium/db';
import { userRepositoryFirebase } from './userRepositoryFirebase';

export const firebaseProvider: DbProvider = {
  name: 'Firebase Firestore',
  connect: async (config: DbConfig) => {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(config.credentials ?? {}),
      });
    }
  },
  disconnect: async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
  },
  getUserRepository: (): UserRepository => userRepositoryFirebase,
};
