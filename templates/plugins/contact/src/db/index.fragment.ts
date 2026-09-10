import { AddCommunicationMessageInput, CreateCommunicationInput, FindManyCommunicationsOptions } from './contracts/communication.contract';
// inithium:anchor:imports
export const getCommunicationRepository = () => activeProvider.getCommunicationRepository();
export const listCommunications = (options: FindManyCommunicationsOptions) =>
  getCommunicationRepository().findMany(options);
export const getCommunicationById = (id: string) => getCommunicationRepository().findById(id);
export const listCommunicationsForUser = (submitterUserId: string) =>
  getCommunicationRepository().findForUser(submitterUserId);
export const createCommunication = (input: CreateCommunicationInput) => getCommunicationRepository().create(input);
export const addCommunicationMessage = (id: string, input: AddCommunicationMessageInput) =>
  getCommunicationRepository().addMessage(id, input);
export const deleteCommunication = (id: string) => getCommunicationRepository().delete(id);

// inithium:anchor:repositories
export type {
  CommunicationEntity,
  CommunicationMessage,
  CommunicationAuthorRole,
  CreateCommunicationInput,
  AddCommunicationMessageInput,
  CommunicationSearchField,
  FindManyCommunicationsOptions,
  CommunicationRepository,
} from './contracts/communication.contract';
// inithium:anchor:type-exports
