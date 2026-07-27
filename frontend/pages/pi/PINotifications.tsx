/**
 * PI Notifications — route-namespace wrapper for /pi/notifications.
 * Renders the shared PCNotifications component within a PI-context wrapper.
 */
import { PCNotifications } from '@/pages/pc/PCNotifications';
import { PIRoleWrapper } from '@/components/pi/PIRoleWrapper';

export function PINotifications() {
  return (
    <PIRoleWrapper>
      <PCNotifications />
    </PIRoleWrapper>
  );
}
