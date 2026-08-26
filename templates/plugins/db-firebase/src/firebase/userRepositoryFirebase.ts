import { getFirestore } from 'firebase-admin/firestore';
import { UserRepository, UserEntity, CreateUserInput } from '@inithium/db';

export const userRepositoryFirebase: UserRepository = {
  findById: async (id: string): Promise<UserEntity | null> => {
    const db = getFirestore();
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      email: data['email'],
      firstName: data['firstName'],
      lastName: data['lastName'],
      passwordHash: data['passwordHash'],
      createdAt: data['createdAt'] ? data['createdAt'].toDate() : new Date(),
    };
  },
  findByEmail: async (email: string): Promise<UserEntity | null> => {
    const db = getFirestore();
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      email: data['email'],
      firstName: data['firstName'],
      lastName: data['lastName'],
      passwordHash: data['passwordHash'],
      createdAt: data['createdAt'] ? data['createdAt'].toDate() : new Date(),
    };
  },
  create: async (input: CreateUserInput): Promise<UserEntity> => {
    const db = getFirestore();
    const now = new Date();
    const docRef = await db.collection('users').add({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      createdAt: now,
    });
    return {
      id: docRef.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      createdAt: now,
    };
  },
};
