import { useMarkFriendRequestsSeenMutation } from '@inithium/api-client';
import type { NotificationHook } from '../registry';

// Bulk 'sent' -> 'pending' flip for the current user's own incoming friend requests - fired from
// the notification-center interactions below, which are the "user viewing the request via the
// notification center" moment the friends plugin's status model is tied to (see
// friends.route.ts's PATCH /api/friends/requests/seen for why this is bulk, not per-id).
const friendsNotificationHook: NotificationHook = {
  test: (notification) => notification.type === 'friend:request-received',
  useHandlers: () => {
    const [markFriendRequestsSeen] = useMarkFriendRequestsSeenMutation();
    return {
      onClick: (notification, ctx) => {
        void markFriendRequestsSeen();
        if (notification.actionUrl) ctx.navigate(notification.actionUrl);
      },
      onMarkAllRead: () => {
        void markFriendRequestsSeen();
      },
    };
  },
};

export default friendsNotificationHook;
