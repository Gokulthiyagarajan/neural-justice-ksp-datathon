/**
 * PI Activity — route-namespace wrapper for /pi/activity.
 * Renders the shared PCActivity component within a PI-context wrapper.
 */
import { PCActivity } from '@/pages/pc/PCActivity';
import { PIRoleWrapper } from '@/components/pi/PIRoleWrapper';

export function PIActivity() {
  return (
    <PIRoleWrapper>
      <PCActivity />
    </PIRoleWrapper>
  );
}
