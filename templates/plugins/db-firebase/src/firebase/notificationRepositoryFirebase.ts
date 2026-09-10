import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { CreateNotificationInput, NotificationEntity, NotificationRepository } from '@inithium/db';

const NOTIFICATIONS_COLLECTION = 'notifications';
const DEFAULT_LIST_LIMIT = 30;
// Firestore has no `$in` batching beyond 30 values per query (as of the Admin SDK's current
// `in`/`array-contains-any` limit) - deleteByActionUrls chunks into batches of this size rather
// than assuming the caller's actionUrls list is always small.
const IN_QUERY_CHUNK_SIZE = 30;

const notificationsCollection = () => getFirestore().collection(NOTIFICATIONS_COLLECTION);

const toDate = (value: unknown): Date => (value instanceof Timestamp ? value.toDate() : new Date(value as string));

const mapToNotificationEntity = (doc: DocumentSnapshot | QueryDocumentSnapshot): NotificationEntity => {
  const data = doc.data();
  if (!data) {
    throw new Error(`mapToNotificationEntity: document ${doc.id} has no data`);
  }
  return {
    id: doc.id,
    userId: data['userId'],
    type: data['type'],
    title: data['title'],
    body: data['body'],
    actionUrl: data['actionUrl'],
    icon: data['icon'],
    isRead: data['isRead'] ?? false,
    createdAt: toDate(data['createdAt']),
  };
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const notificationRepositoryFirebase: NotificationRepository = {
  create: async (input: CreateNotificationInput): Promise<NotificationEntity> => {
    const docRef = await notificationsCollection().add({ ...input, isRead: false, createdAt: Timestamp.now() });
    const created = await docRef.get();
    return mapToNotificationEntity(created);
  },
  listForUser: async (userId: string, options): Promise<NotificationEntity[]> => {
    const snapshot = await notificationsCollection()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(options?.limit ?? DEFAULT_LIST_LIMIT)
      .get();
    return snapshot.docs.map(mapToNotificationEntity);
  },
  countUnreadForUser: async (userId: string): Promise<number> => {
    const snapshot = await notificationsCollection().where('userId', '==', userId).where('isRead', '==', false).count().get();
    return snapshot.data().count;
  },
  markAsRead: async (id: string, userId: string): Promise<NotificationEntity | null> => {
    const ref = notificationsCollection().doc(id);
    const existing = await ref.get();
    // Scoped by userId on the fetched document itself (not just a query filter) so a caller can
    // never mark another user's notification as read by guessing an id - same ownership
    // guarantee notification.contract.ts's own markAsRead documents.
    if (!existing.exists || existing.data()?.['userId'] !== userId) {
      return null;
    }
    await ref.update({ isRead: true });
    const updated = await ref.get();
    return mapToNotificationEntity(updated);
  },
  markAllAsReadForUser: async (userId: string): Promise<number> => {
    const snapshot = await notificationsCollection().where('userId', '==', userId).where('isRead', '==', false).get();
    if (snapshot.empty) return 0;
    const batch = getFirestore().batch();
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { isRead: true });
    }
    await batch.commit();
    return snapshot.size;
  },
  deleteForUser: async (id: string, userId: string): Promise<boolean> => {
    const ref = notificationsCollection().doc(id);
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.['userId'] !== userId) {
      return false;
    }
    await ref.delete();
    return true;
  },
  deleteByActionUrls: async (actionUrls: string[]): Promise<number> => {
    if (actionUrls.length === 0) return 0;
    let deleted = 0;
    for (const urlsChunk of chunk(actionUrls, IN_QUERY_CHUNK_SIZE)) {
      const snapshot = await notificationsCollection().where('actionUrl', 'in', urlsChunk).get();
      if (snapshot.empty) continue;
      const batch = getFirestore().batch();
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      deleted += snapshot.size;
    }
    return deleted;
  },
};
