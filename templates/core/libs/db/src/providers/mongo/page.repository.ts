import type { Model } from 'mongoose';
import {
  CreatePageInput,
  NavLocation,
  PageEntity,
  PageRepository,
  UpdatePageInput,
} from '../../contracts/page.contract';
import { PageDocument } from '../../schemas/page.schema';

const mapToPageEntity = (doc: PageDocument): PageEntity => ({
  id: doc._id.toString(),
  slug: doc.slug,
  title: doc.title,
  routePattern: doc.routePattern,
  isPluginPage: doc.isPluginPage,
  pluginOrigin: doc.pluginOrigin,
  animation: doc.animation,
  backgroundColor: doc.backgroundColor,
  foregroundColor: doc.foregroundColor,
  access: doc.access,
  navigation: doc.navigation,
  seo: doc.seo,
  layoutTemplate: doc.layoutTemplate,
  isPublished: doc.isPublished,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createMongoPageRepository = (model: Model<PageDocument>): PageRepository => ({
  findByRoutePattern: async (routePattern: string): Promise<PageEntity | null> => {
    const page = await model.findOne({ routePattern }).exec();
    return page ? mapToPageEntity(page) : null;
  },
  findByNavLocation: async (location: NavLocation): Promise<PageEntity[]> => {
    // Querying an array field with a scalar value matches any document whose array contains
    // that value, so this also picks up pages that are in more than one nav location at once.
    const pages = await model.find({ 'navigation.locations': location }).sort({ 'navigation.order': 1 }).exec();
    return pages.map(mapToPageEntity);
  },
  findPublished: async (): Promise<PageEntity[]> => {
    const pages = await model.find({ isPublished: true }).exec();
    return pages.map(mapToPageEntity);
  },
  create: async (input: CreatePageInput): Promise<PageEntity> => {
    const page = await model.create(input);
    return mapToPageEntity(page);
  },
  update: async (id: string, input: UpdatePageInput): Promise<PageEntity | null> => {
    // $set is required here: passing a plain partial object to findByIdAndUpdate
    // with no operators makes MongoDB replace the whole document, wiping any
    // field not present in `input`. Nested objects (access, navigation, etc.)
    // are still replaced wholesale, not deep-merged.
    const page = await model.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).exec();
    return page ? mapToPageEntity(page) : null;
  },
});
