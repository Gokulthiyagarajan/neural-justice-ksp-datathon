/**
 * PI Station — route-namespace wrapper for /pi/station.
 * Renders the shared PCStation component within a PI-context wrapper.
 */
import { PCStation } from '@/pages/pc/PCStation';
import { PIRoleWrapper } from '@/components/pi/PIRoleWrapper';

export function PIStation() {
  return (
    <PIRoleWrapper>
      <PCStation />
    </PIRoleWrapper>
  );
}
