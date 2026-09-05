import { FriendsPanel } from '../friends/FriendsPanel';
import type { ProfileTabDescriptor, ProfileTabProps } from './registry';
import { useCurrentUser } from '../../../app/useCurrentUser';

// visibility: 'all' - unlike assets.tab.tsx, both the owned and unowned UI here are genuinely
// different shapes (My Friends/Add Friends/Pending vs Mutual/All Friends), not one component
// merely hiding a delete button - see FriendsPanel's own two-mode split.
const FriendsTab = ({ profile, isOwnProfile }: ProfileTabProps) => {
  const { currentUser } = useCurrentUser();
  if (!currentUser) return null;

  return isOwnProfile ? (
    <FriendsPanel mode="owned" currentUserId={currentUser.id} />
  ) : (
    <FriendsPanel mode="unowned" currentUserId={currentUser.id} profileUserId={profile.id} />
  );
};

const friendsTab: ProfileTabDescriptor = {
  id: 'friends',
  label: 'Friends',
  order: 20,
  visibility: 'all',
  Component: FriendsTab,
};

export default friendsTab;
