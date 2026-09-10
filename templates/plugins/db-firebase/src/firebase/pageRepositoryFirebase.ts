import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  CreatePageInput,
  FindManyPagesOptions,
  NavLocation,
  PageEntity,
  PageRepository,
  UpdatePageInput,
} from '@inithium/db';
import type { PaginatedResult } from '@inithium/db';

const PAGES_COLLECTION = 'pages';

// Same "starts with" prefix-query trick as userRepositoryFirebase's own search, and the same
// lazy per-call collection accessor - see that file's comments for why.
const PREFIX_QUERY_UPPER_BOUND = String.fromCharCode(0xf8ff);
const pagesCollection = () => getFirestore().collection(PAGES_COLLECTION);

const toDate = (value: unknown): Date => (value instanceof Timestamp ? value.toDate() : new Date(value as string));

const mapToPageEntity = (doc: DocumentSnapshot | QueryDocumentSnapshot): PageEntity => {
  const data = doc.data();
  if (!data) {
    throw new Error(`mapToPageEntity: document ${doc.id} has no data`);
  }
  return {
    id: doc.id,
    slug: data['slug'],
    title: data['title'],
    routePattern: data['routePattern'],
    isPluginPage: data['isPluginPage'] ?? false,
    pluginOrigin: data['pluginOrigin'],
    animation: data['animation'],
    backgroundColor: data['backgroundColor'],
    foregroundColor: data['foregroundColor'],
    access: data['access'],
    navigation: data['navigation'],
    seo: data['seo'],
    layoutTemplate: data['layoutTemplate'] ?? 'default',
    isPublished: data['isPublished'] ?? false,
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
  };
};

export const pageRepositoryFirebase: PageRepository = {
  findByRoutePattern: async (routePattern: string): Promise<PageEntity | null> => {
    const snapshot = await pagesCollection().where('routePattern', '==', routePattern).limit(1).get();
    return snapshot.empty ? null : mapToPageEntity(snapshot.docs[0]!);
  },
  findBySlug: async (slug: string): Promise<PageEntity | null> => {
    const snapshot = await pagesCollection().where('slug', '==', slug).limit(1).get();
    return snapshot.empty ? null : mapToPageEntity(snapshot.docs[0]!);
  },
  findByNavLocation: async (location: NavLocation): Promise<PageEntity[]> => {
    // Querying an array field with a scalar value matches any document whose array contains
    // that value, matching page.repository.ts's own Mongo query semantics exactly.
    const snapshot = await pagesCollection()
      .where('navigation.locations', 'array-contains', location)
      .where('isPublished', '==', true)
      .orderBy('navigation.order', 'asc')
      .get();
    return snapshot.docs.map(mapToPageEntity);
  },
  findPublished: async (): Promise<PageEntity[]> => {
    const snapshot = await pagesCollection().where('isPublished', '==', true).get();
    return snapshot.docs.map(mapToPageEntity);
  },
  findPluginPages: async (): Promise<PageEntity[]> => {
    const snapshot = await pagesCollection().where('isPluginPage', '==', true).get();
    return snapshot.docs.map(mapToPageEntity);
  },
  findMany: async (options: FindManyPagesOptions): Promise<PaginatedResult<PageEntity>> => {
    const { page, pageSize, search, searchField } = options;
    const skip = (page - 1) * pageSize;
    const isSearching = Boolean(search && searchField);

    let query = pagesCollection().orderBy(isSearching ? searchField! : 'createdAt', isSearching ? 'asc' : 'desc');
    if (isSearching) {
      query = query.where(searchField!, '>=', search).where(searchField!, '<=', `${search}${PREFIX_QUERY_UPPER_BOUND}`);
    }

    const [snapshot, countSnapshot] = await Promise.all([query.offset(skip).limit(pageSize).get(), query.count().get()]);
    return { items: snapshot.docs.map(mapToPageEntity), total: countSnapshot.data().count, page, pageSize };
  },
  create: async (input: CreatePageInput): Promise<PageEntity> => {
    const now = Timestamp.now();
    const docRef = await pagesCollection().add({ ...input, createdAt: now, updatedAt: now });
    const created = await docRef.get();
    return mapToPageEntity(created);
  },
  update: async (id: string, input: UpdatePageInput): Promise<PageEntity | null> => {
    const ref = pagesCollection().doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return null;
    }
    await ref.update({ ...input, updatedAt: Timestamp.now() });
    const updated = await ref.get();
    return mapToPageEntity(updated);
  },
  delete: async (id: string): Promise<boolean> => {
    const ref = pagesCollection().doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return false;
    }
    await ref.delete();
    return true;
  },
};
