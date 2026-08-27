import mongoose, { Schema, Document } from 'mongoose';
import { NAV_LOCATIONS, PAGE_LAYOUT_TEMPLATES } from '../contracts/page.contract';
import type { NavLocation, PageLayoutTemplate } from '../contracts/page.contract';

export interface PageDocument extends Document {
  slug: string;
  title: string;
  routePattern: string;
  isPluginPage: boolean;
  pluginOrigin?: string;
  animation: { enter: string; exit: string; duration: number; delay: number };
  backgroundColor: string;
  foregroundColor: string;
  access: { isPublic: boolean; isAnonymousOnly: boolean; requiredRoles: string[] };
  navigation: { location: NavLocation; label: string; order: number; icon?: string };
  seo?: { metaTitle?: string; metaDescription?: string; ogImage?: string };
  layoutTemplate: PageLayoutTemplate;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<PageDocument>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    routePattern: { type: String, required: true, unique: true },
    isPluginPage: { type: Boolean, required: true, default: false },
    pluginOrigin: { type: String, required: false },
    animation: {
      enter: { type: String, required: true, default: 'animate__fadeIn' },
      exit: { type: String, required: true, default: 'animate__fadeOut' },
      duration: { type: Number, required: true, default: 300 },
      delay: { type: Number, required: true, default: 0 },
    },
    backgroundColor: { type: String, required: true, default: 'surface' },
    foregroundColor: { type: String, required: true, default: 'primary-foreground' },
    access: {
      isPublic: { type: Boolean, required: true, default: true },
      isAnonymousOnly: { type: Boolean, required: true, default: false },
      requiredRoles: { type: [String], required: true, default: [] },
    },
    navigation: {
      location: { type: String, required: true, enum: NAV_LOCATIONS, index: true },
      label: { type: String, required: true },
      order: { type: Number, required: true, default: 0 },
      icon: { type: String, required: false },
    },
    seo: {
      metaTitle: { type: String, required: false },
      metaDescription: { type: String, required: false },
      ogImage: { type: String, required: false },
    },
    layoutTemplate: { type: String, required: true, enum: PAGE_LAYOUT_TEMPLATES, default: 'default' },
    isPublished: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true }
);

export const PageModel = mongoose.models['Page'] || mongoose.model<PageDocument>('Page', pageSchema);
