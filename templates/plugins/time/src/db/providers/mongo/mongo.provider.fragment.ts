import { TimeEntryRepository } from '../../contracts/time-entry.contract';
import { TimeEntryTypeRepository } from '../../contracts/time-entry-type.contract';
import { TimeSettingsRepository } from '../../contracts/time-settings.contract';
import { TimeAuditLogRepository } from '../../contracts/time-audit-log.contract';
import { createMongoTimeEntryRepository } from './time-entry.repository';
import { createMongoTimeEntryTypeRepository } from './time-entry-type.repository';
import { createMongoTimeSettingsRepository } from './time-settings.repository';
import { createMongoTimeAuditLogRepository } from './time-audit-log.repository';
import { TimeEntryModel } from '../../schemas/time-entry.schema';
import { TimeEntryTypeModel } from '../../schemas/time-entry-type.schema';
import { TimeSettingsModel } from '../../schemas/time-settings.schema';
import { TimeAuditLogModel } from '../../schemas/time-audit-log.schema';
// inithium:anchor:imports
const timeEntryRepository = createMongoTimeEntryRepository(TimeEntryModel);
const timeEntryTypeRepository = createMongoTimeEntryTypeRepository(TimeEntryTypeModel);
const timeSettingsRepository = createMongoTimeSettingsRepository(TimeSettingsModel);
const timeAuditLogRepository = createMongoTimeAuditLogRepository(TimeAuditLogModel);
// inithium:anchor:repository-instances
  getTimeEntryRepository: (): TimeEntryRepository => timeEntryRepository,
  getTimeEntryTypeRepository: (): TimeEntryTypeRepository => timeEntryTypeRepository,
  getTimeSettingsRepository: (): TimeSettingsRepository => timeSettingsRepository,
  getTimeAuditLogRepository: (): TimeAuditLogRepository => timeAuditLogRepository,
  // inithium:anchor:members
