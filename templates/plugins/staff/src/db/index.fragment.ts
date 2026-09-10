import {
  CreateStaffInput,
  FindManyStaffOptions,
  UpdateStaffInput,
} from './contracts/staff.contract';
// inithium:anchor:imports
export const getStaffRepository = () => activeProvider.getStaffRepository();
export const listStaff = (options: FindManyStaffOptions) => getStaffRepository().findMany(options);
export const getStaffById = (id: string) => getStaffRepository().findById(id);
export const getStaffByUserId = (userId: string) => getStaffRepository().findByUserId(userId);
export const listStaffUserIds = () => getStaffRepository().listUserIds();
export const createStaff = (input: CreateStaffInput) => getStaffRepository().create(input);
export const updateStaff = (id: string, input: UpdateStaffInput) => getStaffRepository().update(id, input);
export const deleteStaff = (id: string) => getStaffRepository().delete(id);

// inithium:anchor:repositories
export { STAFF_PHOTO_SOURCE_TYPES } from './contracts/staff.contract';
export type {
  StaffEntity,
  CreateStaffInput,
  UpdateStaffInput,
  StaffPhotoSourceType,
  StaffSearchField,
  FindManyStaffOptions,
  StaffRepository,
} from './contracts/staff.contract';
// inithium:anchor:type-exports
