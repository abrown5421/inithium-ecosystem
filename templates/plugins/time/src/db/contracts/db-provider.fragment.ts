import { TimeEntryRepository } from './time-entry.contract';
import { TimeEntryTypeRepository } from './time-entry-type.contract';
import { TimeSettingsRepository } from './time-settings.contract';
import { TimeAuditLogRepository } from './time-audit-log.contract';
// inithium:anchor:imports
  getTimeEntryRepository: () => TimeEntryRepository;
  getTimeEntryTypeRepository: () => TimeEntryTypeRepository;
  getTimeSettingsRepository: () => TimeSettingsRepository;
  getTimeAuditLogRepository: () => TimeAuditLogRepository;
  // inithium:anchor:members
