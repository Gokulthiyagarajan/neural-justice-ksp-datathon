/**
 * PI Hotspots — route-namespace wrapper for /pi/hotspots.
 * Renders the shared PSIHotspots component within a PI-context wrapper.
 */
import { PSIHotspots } from '@/pages/psi/PSIHotspots';
import { PIRoleWrapper } from '@/components/pi/PIRoleWrapper';

export function PIHotspots() {
  return (
    <PIRoleWrapper>
      <PSIHotspots />
    </PIRoleWrapper>
  );
}
