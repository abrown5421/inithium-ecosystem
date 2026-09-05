import { Box, Button, Loader, Text, alert, dialog } from '@inithium/ui';
import {
  useAcceptFriendRequestMutation,
  useDeleteFriendRequestMutation,
  useGetFriendStatusQuery,
  useSendFriendRequestMutation,
} from '@inithium/api-client';
import { useCurrentUser } from '../../../app/useCurrentUser';
import type { ProfileSectionDescriptor, ProfileSectionProps } from './registry';

const ALERT_POSITION = 'bottom-right' as const;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const daysSince = (iso: string): number => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_DAY));
const formatDays = (days: number): string => (days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`);

// Left-column, unowned-profile-only friend status + actions (Add/Accept/Decline/Rescind/
// Unfriend) - see registry.ts's own note that sections self-guard isOwnProfile rather than
// carrying a 'owned'/'all' visibility flag the way tabs/registry.ts does.
const FriendStatusSection = ({ profile, isOwnProfile }: ProfileSectionProps) => {
  const { currentUser } = useCurrentUser();
  const { data, isLoading } = useGetFriendStatusQuery(profile.id, { skip: isOwnProfile || !currentUser });
  const [sendFriendRequest, { isLoading: isSending }] = useSendFriendRequestMutation();
  const [acceptFriendRequest, { isLoading: isAccepting }] = useAcceptFriendRequestMutation();
  const [deleteFriendRequest, { isLoading: isDeleting }] = useDeleteFriendRequestMutation();

  if (isOwnProfile || !currentUser) return null;

  if (isLoading || !data) {
    return (
      <Box flex={{ justify: 'center' }} padding={{ base: 8 }}>
        <Loader variant="spinner" size="1.5rem" color={{ color: 'primary', intensity: 500 }} />
      </Box>
    );
  }

  const busy = isSending || isAccepting || isDeleting;

  const handleAdd = async () => {
    try {
      await sendFriendRequest(profile.id).unwrap();
      alert.success('Friend request sent.', { position: ALERT_POSITION });
    } catch {
      alert.danger('Could not send this friend request. Please try again.', { position: ALERT_POSITION });
    }
  };

  const handleAccept = async () => {
    if (!data.friendId) return;
    try {
      await acceptFriendRequest(data.friendId).unwrap();
      alert.success('Friend request accepted.', { position: ALERT_POSITION });
    } catch {
      alert.danger('Could not accept this friend request. Please try again.', { position: ALERT_POSITION });
    }
  };

  const handleRemove = async (title: string, description: string, successMessage: string) => {
    if (!data.friendId) return;
    const confirmed = await dialog.confirm({
      title,
      description,
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      confirmVariant: { kind: 'filled', color: 'red' },
    });
    if (!confirmed) return;
    try {
      await deleteFriendRequest(data.friendId).unwrap();
      alert.success(successMessage, { position: ALERT_POSITION });
    } catch {
      alert.danger('Something went wrong. Please try again.', { position: ALERT_POSITION });
    }
  };

  if (!data.exists) {
    return (
      <Button variant={{ kind: 'filled', color: 'primary' }} disabled={busy} onClick={() => void handleAdd()}>
        Add Friend
      </Button>
    );
  }

  if (data.status === 'accepted') {
    return (
      <Box flex={{ direction: 'col', gap: 8 }}>
        <Text textColor={{ color: 'surface', intensity: 700 }} className="text-sm">
          Friends for {formatDays(daysSince(data.acceptedAt!))}
        </Text>
        <Button
          variant={{ kind: 'outlined', color: 'surface' }}
          disabled={busy}
          onClick={() =>
            void handleRemove('Unfriend this user?', `You and ${profile.firstName} will no longer be friends.`, 'Friend removed.')
          }
        >
          Unfriend
        </Button>
      </Box>
    );
  }

  if (data.direction === 'outgoing') {
    return (
      <Box flex={{ direction: 'col', gap: 8 }}>
        <Text textColor={{ color: 'surface', intensity: 700 }} className="text-sm">
          You requested to be friends with this user {formatDays(daysSince(data.requestedAt!))}
        </Text>
        <Button
          variant={{ kind: 'outlined', color: 'surface' }}
          disabled={busy}
          onClick={() =>
            void handleRemove(
              'Rescind this friend request?',
              `Your friend request to ${profile.firstName} will be withdrawn.`,
              'Friend request rescinded.',
            )
          }
        >
          Rescind Request
        </Button>
      </Box>
    );
  }

  return (
    <Box flex={{ direction: 'col', gap: 8 }}>
      <Text textColor={{ color: 'surface', intensity: 700 }} className="text-sm">
        {profile.firstName} wants to be friends
      </Text>
      <Box flex={{ direction: 'row', gap: 8 }}>
        <Button variant={{ kind: 'filled', color: 'primary' }} disabled={busy} onClick={() => void handleAccept()}>
          Accept
        </Button>
        <Button
          variant={{ kind: 'outlined', color: 'surface' }}
          disabled={busy}
          onClick={() =>
            void handleRemove(
              'Decline this friend request?',
              `This will remove ${profile.firstName}'s friend request.`,
              'Friend request declined.',
            )
          }
        >
          Decline
        </Button>
      </Box>
    </Box>
  );
};

const friendStatusSection: ProfileSectionDescriptor = { id: 'friend-status', order: 10, Component: FriendStatusSection };

export default friendStatusSection;
