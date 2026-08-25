import { DbProvider } from '@inithium/db';
import { firebaseProvider } from './firebase/firebase.provider';

export const activeProvider: DbProvider = firebaseProvider;
