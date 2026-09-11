import {
  CreateTimeEntryInput,
  FindEntriesForUsersInRangeOptions,
  FindEntriesInRangeOptions,
  UpdateTimeEntryInput,
} from './contracts/time-entry.contract';
import { CreateTimeEntryTypeInput, UpdateTimeEntryTypeInput } from './contracts/time-entry-type.contract';
import { UpdateTimeSettingsInput } from './contracts/time-settings.contract';
import { CreateTimeAuditLogInput } from './contracts/time-audit-log.contract';
// inithium:anchor:imports
export const getTimeEntryRepository = () => activeProvider.getTimeEntryRepository();
export const findTimeEntryById = (id: string) => getTimeEntryRepository().findById(id);
export const findOpenTimeEntryByUserId = (userId: string) => getTimeEntryRepository().findOpenByUserId(userId);
export const listTimeEntriesInRange = (options: FindEntriesInRangeOptions) =>
  getTimeEntryRepository().findManyInRange(options);
export const listTimeEntriesForUsersInRange = (options: FindEntriesForUsersInRangeOptions) =>
  getTimeEntryRepository().findManyForUsersInRange(options);
export const findOverlappingTimeEntries = (userId: string, startAt: Date, endAt: Date | undefined, excludeId?: string) =>
  getTimeEntryRepository().findOverlapping(userId, startAt, endAt, excludeId);
export const countTimeEntriesByTypeId = (typeId: string) => getTimeEntryRepository().countByTypeId(typeId);
export const createTimeEntry = (input: CreateTimeEntryInput) => getTimeEntryRepository().create(input);
export const updateTimeEntry = (id: string, input: UpdateTimeEntryInput) => getTimeEntryRepository().update(id, input);
export const deleteTimeEntry = (id: string) => getTimeEntryRepository().delete(id);
export const deleteTimeEntriesInRange = (from: Date, to: Date) => getTimeEntryRepository().deleteInRange(from, to);

export const getTimeEntryTypeRepository = () => activeProvider.getTimeEntryTypeRepository();
// Self-seeding: the very first caller to ever ask for entry types (an employee's clock-in
// screen, or the settings admin screen) gets "General" for free. There is no main.ts boot hook
// available to plugins (see this plugin's db-provider.contract.ts fragment header note) - this
// mirrors the same lazy-provisioning idea the auto-clockout sweep already needs for a different
// one-time-default problem.
export const listTimeEntryTypes = async () => {
  const types = await getTimeEntryTypeRepository().findAll();
  if (types.length > 0) return types;
  const seeded = await getTimeEntryTypeRepository().create({ label: 'General', order: 0 });
  return [seeded];
};
export const findTimeEntryTypeById = (id: string) => getTimeEntryTypeRepository().findById(id);
export const countTimeEntryTypes = () => getTimeEntryTypeRepository().countAll();
export const createTimeEntryType = (input: CreateTimeEntryTypeInput) => getTimeEntryTypeRepository().create(input);
export const updateTimeEntryType = (id: string, input: UpdateTimeEntryTypeInput) =>
  getTimeEntryTypeRepository().update(id, input);
export const deleteTimeEntryType = (id: string) => getTimeEntryTypeRepository().delete(id);

export const getTimeSettingsRepository = () => activeProvider.getTimeSettingsRepository();
// Same self-seeding idea as listTimeEntryTypes above - the first read ever made creates the
// singleton with defaults rather than requiring a boot hook this plugin has no access to.
export const getTimeSettings = async () => (await getTimeSettingsRepository().get()) ?? getTimeSettingsRepository().upsert({});
export const updateTimeSettings = (input: UpdateTimeSettingsInput) => getTimeSettingsRepository().upsert(input);

export const getTimeAuditLogRepository = () => activeProvider.getTimeAuditLogRepository();
export const createTimeAuditLog = (input: CreateTimeAuditLogInput) => getTimeAuditLogRepository().create(input);
export const listTimeAuditLogByEntryId = (entryId: string) => getTimeAuditLogRepository().findByEntryId(entryId);
export const deleteTimeAuditLogsByEntryIds = (entryIds: string[]) => getTimeAuditLogRepository().deleteByEntryIds(entryIds);

// inithium:anchor:repositories
export { TIME_AUDIT_ACTIONS } from './contracts/time-audit-log.contract';
export type {
  TimeEntryEntity,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  FindEntriesInRangeOptions,
  FindEntriesForUsersInRangeOptions,
  DeleteInRangeResult,
  TimeEntryRepository,
} from './contracts/time-entry.contract';
export type {
  TimeEntryTypeEntity,
  CreateTimeEntryTypeInput,
  UpdateTimeEntryTypeInput,
  TimeEntryTypeRepository,
} from './contracts/time-entry-type.contract';
export type { TimeSettingsEntity, UpdateTimeSettingsInput, TimeSettingsRepository } from './contracts/time-settings.contract';
export type {
  TimeAuditAction,
  TimeEntrySnapshot,
  TimeAuditLogEntity,
  CreateTimeAuditLogInput,
  TimeAuditLogRepository,
} from './contracts/time-audit-log.contract';
// inithium:anchor:type-exports
