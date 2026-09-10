import { dialog } from '@inithium/ui';
import { FriendsPanel } from '../pages/profile/friends/FriendsPanel';
// inithium:anchor:imports
  // A dialog rather than a second drawer - opened from a Button inside the already-open Menu
  // drawer (see Navbar.tsx's FriendsDrawerLink), which closes itself first so this doesn't stack
  // on top of it. 75vw per the "look nicer as a wide dialog" request, matching the width other
  // wide dialogs in this app already use (AvatarEditDialog/BannerEditDialog/AssetLightbox).
  const openFriendsPanel = () => {
    if (!currentUser) return;
    dialog.show(() => <FriendsPanel mode="owned" currentUserId={currentUser.id} />, { title: 'Friends', width: '75vw' });
  };
  // inithium:anchor:before-return
            friendsHref={currentUser ? `/profile/${currentUser.id}?tab=friends` : undefined}
            onOpenFriendsPanel={currentUser ? openFriendsPanel : undefined}
            // inithium:anchor:navbar-props
