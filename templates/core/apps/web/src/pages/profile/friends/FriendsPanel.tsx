import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Input,
  Loader,
  Pagination,
  Text,
  alert,
  dialog,
  resolveAvatarConfigProps,
  useNavigateWithTransition,
} from '@inithium/ui';
import type { IconName } from '@inithium/ui';
import {
  useDeleteFriendRequestMutation,
  useListFriendCandidatesQuery,
  useListMyFriendsQuery,
  useListUserFriendsQuery,
  useSendFriendRequestMutation,
} from '@inithium/api-client';
import type { FriendListEntry, FriendOfUserEntry, FriendStatus, FriendUserSummary } from '@inithium/api-client';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const ALERT_POSITION = 'bottom-right' as const;

export type FriendsPanelProps =
  | { mode: 'owned'; currentUserId: string }
  | { mode: 'unowned'; currentUserId: string; profileUserId: string };

type OwnedView = 'my-friends' | 'add-friends' | 'pending';
type UnownedView = 'mutual' | 'all';

const OWNED_SIDEBAR: Array<{ id: OwnedView; label: string }> = [
  { id: 'my-friends', label: 'My Friends' },
  { id: 'add-friends', label: 'Add Friends' },
  { id: 'pending', label: 'Pending Requests' },
];
const UNOWNED_SIDEBAR: Array<{ id: UnownedView; label: string }> = [
  { id: 'mutual', label: 'Mutual Friends' },
  { id: 'all', label: 'All Friends' },
];

const fullNameOf = (user: FriendUserSummary): string => [user.firstName, user.lastName].filter(Boolean).join(' ');

const StatusBadge = ({ status }: { status: FriendStatus }) =>
  status === 'accepted' ? null : (
    <Text
      as="span"
      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
      bgColor={{ color: status === 'sent' ? 'accent' : 'primary', intensity: 100 }}
      textColor={{ color: status === 'sent' ? 'accent-foreground' : 'primary-foreground', intensity: 100 }}
    >
      {status === 'sent' ? 'Sent' : 'Pending'}
    </Text>
  );

interface FriendRowAction {
  readonly icon: IconName;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

interface FriendRowProps {
  readonly user: FriendUserSummary;
  readonly showEmail: boolean;
  readonly badge?: FriendStatus;
  readonly action?: FriendRowAction;
  readonly onNavigate: () => void;
}

// The row's own name/avatar button navigates to the user's profile; the action icon (when
// present) is a sibling button, not nested inside it - a button can't legally contain another
// interactive button, and this mirrors assets.tab.tsx's own lightbox-button + sibling-delete-
// IconButton layout for the same reason.
const FriendRow = ({ user, showEmail, badge, action, onNavigate }: FriendRowProps) => {
  const fullName = fullNameOf(user);
  return (
    <Box flex={{ direction: 'row', align: 'center', gap: 8 }} className="w-full rounded-md hover:bg-surface-100">
      <Button
        variant={{ kind: 'ghost', color: 'surface' }}
        onClick={onNavigate}
        className="flex h-auto flex-1 items-center justify-start gap-3 p-2 text-left"
      >
        <Avatar {...resolveAvatarConfigProps(user.avatar, fullName)} size={40} />
        <Box flex={{ direction: 'col' }} className="min-w-0">
          <Box flex={{ direction: 'row', align: 'center', gap: 8 }}>
            <Text textColor={{ color: 'surface', intensity: 950 }} className="truncate font-medium">
              {fullName}
            </Text>
            {badge ? <StatusBadge status={badge} /> : null}
          </Box>
          {showEmail && user.email ? (
            <Text textColor={{ color: 'surface', intensity: 600 }} className="truncate text-xs">
              {user.email}
            </Text>
          ) : null}
        </Box>
      </Button>
      {action ? (
        <IconButton
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          disabled={action.disabled}
          textColor={{ color: 'surface', intensity: 600 }}
          className="mr-2 shrink-0"
        />
      ) : null}
    </Box>
  );
};

const EmptyState = ({ label }: { label: string }) => (
  <Text textColor={{ color: 'surface', intensity: 600 }} className="text-sm">
    {label}
  </Text>
);

const ListShell = ({ isLoading, isEmpty, emptyLabel, children }: { isLoading: boolean; isEmpty: boolean; emptyLabel: string; children: ReactNode }) => {
  if (isLoading) {
    return (
      <Box flex={{ justify: 'center' }} padding={{ base: 24 }}>
        <Loader variant="spinner" color={{ color: 'primary', intensity: 500 }} />
      </Box>
    );
  }
  if (isEmpty) return <EmptyState label={emptyLabel} />;
  return <Box flex={{ direction: 'col', gap: 4 }}>{children}</Box>;
};

// One component, two modes: 'owned' is the current user managing their own friends (search +
// My Friends/Add Friends/Pending Requests sidebar); 'unowned' is anyone viewing another user's
// Mutual/All Friends. Shared search bar, sidebar nav, and row rendering; the sidebar item set,
// data source, and per-row action icon differ by mode/view - see the spec's own per-view icon
// list (add/unfriend/rescind for owned, none for unowned since those rows are navigate-only).
export const FriendsPanel = (props: FriendsPanelProps) => {
  const navigate = useNavigateWithTransition();
  const [ownedView, setOwnedView] = useState<OwnedView>('my-friends');
  const [unownedView, setUnownedView] = useState<UnownedView>('mutual');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [ownedView, unownedView, search]);

  const goToProfile = (userId: string) => navigate(`/profile/${userId}`);

  const [sendFriendRequest] = useSendFriendRequestMutation();
  const [deleteFriendRequest] = useDeleteFriendRequestMutation();
  // Incoming pending rows are navigate-only in this panel - accept/decline live on the
  // requester's own profile sidebar instead (see friend-status.section.tsx), so no
  // accept-mutation is used here.

  const handleAdd = async (user: FriendUserSummary) => {
    try {
      await sendFriendRequest(user.id).unwrap();
      alert.success(`Friend request sent to ${fullNameOf(user)}.`, { position: ALERT_POSITION });
    } catch {
      alert.danger('Could not send this friend request. Please try again.', { position: ALERT_POSITION });
    }
  };

  const handleRemove = async (friendId: string, title: string, description: string, successMessage: string) => {
    const confirmed = await dialog.confirm({
      title,
      description,
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      confirmVariant: { kind: 'filled', color: 'red' },
    });
    if (!confirmed) return;
    try {
      await deleteFriendRequest(friendId).unwrap();
      alert.success(successMessage, { position: ALERT_POSITION });
    } catch {
      alert.danger('Something went wrong. Please try again.', { position: ALERT_POSITION });
    }
  };

  const sidebar =
    props.mode === 'owned' ? (
      <SidebarNav items={OWNED_SIDEBAR} active={ownedView} onSelect={setOwnedView} />
    ) : (
      <SidebarNav items={UNOWNED_SIDEBAR} active={unownedView} onSelect={setUnownedView} />
    );

  return (
    <Box flex={{ direction: 'col', gap: 16 }} className="w-full">
      <Input
        placeholder="Search by name..."
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
      />
      <Box flex={{ direction: 'col', gap: 16 }} className="w-full sm:flex-row">
        <Box flex={{ direction: 'row', gap: 4 }} className="shrink-0 sm:w-48 sm:flex-col">
          {sidebar}
        </Box>
        <Box flex={{ direction: 'col', gap: 12 }} className="min-w-0 flex-1">
          {props.mode === 'owned' ? (
            <OwnedFriendsList
              view={ownedView}
              search={search}
              page={page}
              onPageChange={setPage}
              onNavigate={goToProfile}
              onAdd={handleAdd}
              onUnfriend={(entry) =>
                void handleRemove(
                  entry.friendId,
                  'Unfriend this user?',
                  `You and ${fullNameOf(entry.user)} will no longer be friends.`,
                  'Friend removed.',
                )
              }
              onRescind={(entry) =>
                void handleRemove(
                  entry.friendId,
                  'Rescind this friend request?',
                  `Your friend request to ${fullNameOf(entry.user)} will be withdrawn.`,
                  'Friend request rescinded.',
                )
              }
            />
          ) : (
            <UnownedFriendsList
              view={unownedView}
              profileUserId={props.profileUserId}
              search={search}
              page={page}
              onPageChange={setPage}
              onNavigate={goToProfile}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const SidebarNav = <T extends string>({
  items,
  active,
  onSelect,
}: {
  items: Array<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
}) => (
  <>
    {items.map((item) => (
      <Button
        key={item.id}
        variant={active === item.id ? { kind: 'filled', color: 'primary' } : { kind: 'ghost', color: 'surface' }}
        className="justify-start"
        onClick={() => onSelect(item.id)}
      >
        {item.label}
      </Button>
    ))}
  </>
);

interface OwnedFriendsListProps {
  readonly view: OwnedView;
  readonly search: string;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly onNavigate: (userId: string) => void;
  readonly onAdd: (user: FriendUserSummary) => void;
  readonly onUnfriend: (entry: FriendListEntry) => void;
  readonly onRescind: (entry: FriendListEntry) => void;
}

const OwnedFriendsList = ({ view, search, page, onPageChange, onNavigate, onAdd, onUnfriend, onRescind }: OwnedFriendsListProps) => {
  const friendsQuery = useListMyFriendsQuery(
    { view: 'friends', search: search || undefined, page, pageSize: PAGE_SIZE },
    { skip: view !== 'my-friends' },
  );
  const pendingQuery = useListMyFriendsQuery(
    { view: 'pending', search: search || undefined, page, pageSize: PAGE_SIZE },
    { skip: view !== 'pending' },
  );
  const candidatesQuery = useListFriendCandidatesQuery(
    { search: search || undefined, page, pageSize: PAGE_SIZE },
    { skip: view !== 'add-friends' },
  );

  if (view === 'my-friends') {
    const { data, isFetching } = friendsQuery;
    return (
      <>
        <ListShell isLoading={isFetching && !data} isEmpty={Boolean(data) && data!.items.length === 0} emptyLabel="No friends yet.">
          {data?.items.map((entry) => (
            <FriendRow
              key={entry.friendId}
              user={entry.user}
              showEmail
              action={{ icon: 'UserMinus', label: `Unfriend ${fullNameOf(entry.user)}`, onClick: () => onUnfriend(entry) }}
              onNavigate={() => onNavigate(entry.user.id)}
            />
          ))}
        </ListShell>
        {data && data.totalPages > 1 ? <Pagination page={data.page} totalPages={data.totalPages} onPageChange={onPageChange} /> : null}
      </>
    );
  }

  if (view === 'add-friends') {
    const { data, isFetching } = candidatesQuery;
    return (
      <>
        <ListShell isLoading={isFetching && !data} isEmpty={Boolean(data) && data!.items.length === 0} emptyLabel="No one left to add.">
          {data?.items.map((user) => (
            <FriendRow
              key={user.id}
              user={user}
              showEmail
              action={{ icon: 'UserPlus', label: `Add ${fullNameOf(user)} as a friend`, onClick: () => onAdd(user) }}
              onNavigate={() => onNavigate(user.id)}
            />
          ))}
        </ListShell>
        {data && data.totalPages > 1 ? <Pagination page={data.page} totalPages={data.totalPages} onPageChange={onPageChange} /> : null}
      </>
    );
  }

  const { data, isFetching } = pendingQuery;
  return (
    <>
      <ListShell isLoading={isFetching && !data} isEmpty={Boolean(data) && data!.items.length === 0} emptyLabel="No pending requests.">
        {data?.items.map((entry) => (
          <FriendRow
            key={entry.friendId}
            user={entry.user}
            showEmail
            badge={entry.status}
            action={
              entry.direction === 'outgoing'
                ? { icon: 'ArrowUUpLeft', label: `Rescind request to ${fullNameOf(entry.user)}`, onClick: () => onRescind(entry) }
                : undefined
            }
            onNavigate={() => onNavigate(entry.user.id)}
          />
        ))}
      </ListShell>
      {data && data.totalPages > 1 ? <Pagination page={data.page} totalPages={data.totalPages} onPageChange={onPageChange} /> : null}
    </>
  );
};

interface UnownedFriendsListProps {
  readonly view: UnownedView;
  readonly profileUserId: string;
  readonly search: string;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly onNavigate: (userId: string) => void;
}

const UnownedFriendsList = ({ view, profileUserId, search, page, onPageChange, onNavigate }: UnownedFriendsListProps) => {
  const { data, isFetching } = useListUserFriendsQuery({
    userId: profileUserId,
    view,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const emptyLabel = view === 'mutual' ? 'No mutual friends.' : 'No friends yet.';

  return (
    <>
      <ListShell isLoading={isFetching && !data} isEmpty={Boolean(data) && data!.items.length === 0} emptyLabel={emptyLabel}>
        {data?.items.map((entry: FriendOfUserEntry) => (
          <FriendRow key={entry.user.id} user={entry.user} showEmail={false} onNavigate={() => onNavigate(entry.user.id)} />
        ))}
      </ListShell>
      {data && data.totalPages > 1 ? <Pagination page={data.page} totalPages={data.totalPages} onPageChange={onPageChange} /> : null}
    </>
  );
};

export default FriendsPanel;
