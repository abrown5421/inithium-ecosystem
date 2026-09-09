import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  CreateUserInput,
  DEFAULT_AVATAR_CONFIG,
  FindManyUsersOptions,
  UpdateUserInput,
  UserEntity,
  UserRegistrationCount,
  UserRepository,
} from '@inithium/db';
import type { PaginatedResult } from '@inithium/db';

const USERS_COLLECTION = 'users';

// Standard Firestore prefix ("starts with") query trick, used by findMany's search below - a
// very high private-use Unicode code point (U+F8FF) as the range's upper bound matches every
// string that starts with the search term. Built via String.fromCharCode, rather than an inline
// escape sequence in a template literal, so the literal character never has to round-trip
// through an editor/diff/encoding.
const PREFIX_QUERY_UPPER_BOUND = String.fromCharCode(0xf8ff);

// Lazy per-call, matching this file's own existing precedent (see firebase.provider.ts) rather
// than a module-level singleton - the Firebase app is only initialized once connect() runs, which
// can happen after this module is first imported.
const usersCollection = () => getFirestore().collection(USERS_COLLECTION);

const toDate = (value: unknown): Date => (value instanceof Timestamp ? value.toDate() : new Date(value as string));

// Firestore is fully schemaless (no Mongoose-style `required`/`default` enforcement), so these
// fallbacks matter even more here than the equivalent defensive `?? false`/`?? {}` reads in
// user.repository.ts's own mapToUserEntity - any field added to UserEntity after a document was
// written simply won't be present until an explicit update touches it.
const mapToUserEntity = (doc: DocumentSnapshot | QueryDocumentSnapshot): UserEntity => {
  const data = doc.data();
  if (!data) {
    throw new Error(`mapToUserEntity: document ${doc.id} has no data`);
  }
  return {
    id: doc.id,
    email: data['email'],
    firstName: data['firstName'],
    lastName: data['lastName'],
    passwordHash: data['passwordHash'],
    role: data['role'] ?? 'user',
    isOwner: data['isOwner'] ?? false,
    capabilityOverrides: data['capabilityOverrides'] ?? {},
    avatar: data['avatar'] ?? DEFAULT_AVATAR_CONFIG,
    profileBanner: data['profileBanner'],
    darkMode: data['darkMode'] ?? false,
    createdAt: toDate(data['createdAt']),
  };
};

export const userRepositoryFirebase: UserRepository = {
  findById: async (id: string): Promise<UserEntity | null> => {
    const doc = await usersCollection().doc(id).get();
    return doc.exists ? mapToUserEntity(doc) : null;
  },
  findByEmail: async (email: string): Promise<UserEntity | null> => {
    const snapshot = await usersCollection().where('email', '==', email).limit(1).get();
    return snapshot.empty ? null : mapToUserEntity(snapshot.docs[0]!);
  },
  findMany: async (options: FindManyUsersOptions): Promise<PaginatedResult<UserEntity>> => {
    const { page, pageSize, search, searchField } = options;
    const skip = (page - 1) * pageSize;
    const isSearching = Boolean(search && searchField);

    // Firestore has no substring/case-insensitive text search (Mongo's $regex approach has no
    // equivalent here) - this is a prefix ("starts with") match instead, the standard Firestore
    // pattern for text search without a third-party search index. A range filter on a field
    // forces that same field to be the primary orderBy, so this branch necessarily orders by
    // searchField rather than createdAt while a search is active.
    let query = usersCollection().orderBy(isSearching ? searchField! : 'createdAt', isSearching ? 'asc' : 'desc');
    if (isSearching) {
      query = query.where(searchField!, '>=', search).where(searchField!, '<=', `${search}${PREFIX_QUERY_UPPER_BOUND}`);
    }

    const [snapshot, countSnapshot] = await Promise.all([query.offset(skip).limit(pageSize).get(), query.count().get()]);

    return { items: snapshot.docs.map(mapToUserEntity), total: countSnapshot.data().count, page, pageSize };
  },
  create: async (input: CreateUserInput): Promise<UserEntity> => {
    const docRef = await usersCollection().add({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      passwordHash: input.passwordHash,
      role: input.role ?? 'user',
      isOwner: false,
      capabilityOverrides: {},
      avatar: input.avatar ?? DEFAULT_AVATAR_CONFIG,
      // Unlike the Mongo provider, this doesn't backfill a random default banner at creation
      // time - generateDefaultProfileBannerConfig is an internal libs/db utility, not exported
      // from @inithium/db's public barrel that a provider implementation outside libs/db itself
      // (this file) resolves against. profileBanner simply stays unset unless the caller
      // supplies one, which is already a safe, fully-supported state: it's optional on
      // UserEntity, and the frontend already falls back to a client-generated mesh for any user
      // without one (see apps/web/src/pages/profileBannerConfig.ts).
      ...(input.profileBanner ? { profileBanner: input.profileBanner } : {}),
      darkMode: input.darkMode ?? false,
      createdAt: Timestamp.now(),
    });
    const created = await docRef.get();
    return mapToUserEntity(created);
  },
  update: async (id: string, input: UpdateUserInput): Promise<UserEntity | null> => {
    const ref = usersCollection().doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return null;
    }

    const updateDoc: Record<string, unknown> = {};
    if (input.email !== undefined) updateDoc['email'] = input.email;
    if (input.firstName !== undefined) updateDoc['firstName'] = input.firstName;
    if (input.lastName !== undefined) updateDoc['lastName'] = input.lastName;
    if (input.passwordHash !== undefined) updateDoc['passwordHash'] = input.passwordHash;
    if (input.role !== undefined) updateDoc['role'] = input.role;
    if (input.capabilityOverrides !== undefined) updateDoc['capabilityOverrides'] = input.capabilityOverrides;
    if (input.avatar !== undefined) updateDoc['avatar'] = input.avatar;
    if (input.profileBanner !== undefined) updateDoc['profileBanner'] = input.profileBanner;
    if (input.darkMode !== undefined) updateDoc['darkMode'] = input.darkMode;

    if (Object.keys(updateDoc).length > 0) {
      await ref.update(updateDoc);
    }
    const updated = await ref.get();
    return mapToUserEntity(updated);
  },
  delete: async (id: string): Promise<boolean> => {
    const ref = usersCollection().doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return false;
    }
    await ref.delete();
    return true;
  },
  countRegistrationsByDay: async (): Promise<UserRegistrationCount[]> => {
    // No server-side date-bucketing aggregation in Firestore (unlike Mongo's $dateToString +
    // $group) - only createdAt is fetched (Firestore's .select() projects just that field, same
    // bandwidth-saving intent as Mongo only ever needing it for this aggregation) and grouped
    // client-side. %Y-%m-%d, UTC, matching Mongo's $dateToString default exactly.
    const snapshot = await usersCollection().select('createdAt').get();
    const counts = new Map<string, number>();
    for (const doc of snapshot.docs) {
      const date = toDate(doc.data()['createdAt']).toISOString().slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
  },
  countAll: async (): Promise<number> => {
    const snapshot = await usersCollection().count().get();
    return snapshot.data().count;
  },
  transferOwnership: async (newOwnerId: string): Promise<UserEntity> => {
    const newOwnerRef = usersCollection().doc(newOwnerId);
    const [newOwnerDoc, currentOwners] = await Promise.all([
      newOwnerRef.get(),
      usersCollection().where('isOwner', '==', true).get(),
    ]);
    if (!newOwnerDoc.exists) {
      throw new Error(`transferOwnership: user ${newOwnerId} not found`);
    }

    // Firestore batched writes commit atomically, unlike user.repository.ts's Mongo equivalent
    // (which explicitly accepts a small non-atomic window between its two sequential updates,
    // since Mongoose multi-document transactions aren't used elsewhere in this codebase) - a
    // strict improvement available here for free.
    const batch = getFirestore().batch();
    for (const doc of currentOwners.docs) {
      if (doc.id !== newOwnerId) {
        batch.update(doc.ref, { isOwner: false });
      }
    }
    batch.update(newOwnerRef, { isOwner: true });
    await batch.commit();

    const updated = await newOwnerRef.get();
    return mapToUserEntity(updated);
  },
};
