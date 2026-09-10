import { StaffRepository } from '../../contracts/staff.contract';
import { createMongoStaffRepository } from './staff.repository';
import { StaffModel } from '../../schemas/staff.schema';
// inithium:anchor:imports
const staffRepository = createMongoStaffRepository(StaffModel);
// inithium:anchor:repository-instances
  getStaffRepository: (): StaffRepository => staffRepository,
  // inithium:anchor:members
