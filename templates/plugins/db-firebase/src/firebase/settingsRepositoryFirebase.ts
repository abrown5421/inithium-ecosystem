import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { SettingEntity, SettingsRepository, UpsertSettingInput } from '@inithium/db';

const SETTINGS_COLLECTION = 'settings';

const settingsCollection = () => getFirestore().collection(SETTINGS_COLLECTION);

const toDate = (value: unknown): Date => (value instanceof Timestamp ? value.toDate() : new Date(value as string));

const mapToSettingEntity = (doc: DocumentSnapshot | QueryDocumentSnapshot): SettingEntity => {
  const data = doc.data();
  if (!data) {
    throw new Error(`mapToSettingEntity: document ${doc.id} has no data`);
  }
  return {
    id: doc.id,
    key: data['key'],
    type: data['type'],
    value: data['value'],
    updatedAt: toDate(data['updatedAt']),
  } as SettingEntity;
};

export const settingsRepositoryFirebase: SettingsRepository = {
  findAll: async (): Promise<SettingEntity[]> => {
    const snapshot = await settingsCollection().get();
    return snapshot.docs.map(mapToSettingEntity);
  },
  findByKey: async (key: string): Promise<SettingEntity | null> => {
    const snapshot = await settingsCollection().where('key', '==', key).limit(1).get();
    return snapshot.empty ? null : mapToSettingEntity(snapshot.docs[0]!);
  },
  upsert: async (input: UpsertSettingInput): Promise<SettingEntity> => {
    const snapshot = await settingsCollection().where('key', '==', input.key).limit(1).get();
    const now = Timestamp.now();

    if (snapshot.empty) {
      const docRef = await settingsCollection().add({ key: input.key, type: input.type, value: input.value, updatedAt: now });
      const created = await docRef.get();
      return mapToSettingEntity(created);
    }

    const ref = snapshot.docs[0]!.ref;
    await ref.update({ type: input.type, value: input.value, updatedAt: now });
    const updated = await ref.get();
    return mapToSettingEntity(updated);
  },
};
