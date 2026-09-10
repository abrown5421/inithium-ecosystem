import { CommunicationRepository } from '../../contracts/communication.contract';
import { createMongoCommunicationRepository } from './communication.repository';
import { CommunicationModel } from '../../schemas/communication.schema';
// inithium:anchor:imports
const communicationRepository = createMongoCommunicationRepository(CommunicationModel);
// inithium:anchor:repository-instances
  getCommunicationRepository: (): CommunicationRepository => communicationRepository,
  // inithium:anchor:members
