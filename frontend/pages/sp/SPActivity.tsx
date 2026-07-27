/**
 * SP Activity — route-namespace wrapper for /sp/activity.
 * Renders the shared PCActivity component within an SP-context wrapper.
 */
import { PCActivity } from '@/pages/pc/PCActivity';
import { SPRoleWrapper } from '@/components/sp/SPRoleWrapper';

export function SPActivity() {
  return (
    <SPRoleWrapper>
      <PCActivity />
    </SPRoleWrapper>
  );
}
