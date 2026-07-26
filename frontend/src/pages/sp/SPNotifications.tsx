/**
 * SP Notifications — route-namespace wrapper for /sp/notifications.
 * Renders the shared PCNotifications component within an SP-context wrapper.
 */
import { PCNotifications } from '@/pages/pc/PCNotifications';
import { SPRoleWrapper } from '@/components/sp/SPRoleWrapper';

export function SPNotifications() {
  return (
    <SPRoleWrapper>
      <PCNotifications />
    </SPRoleWrapper>
  );
}
