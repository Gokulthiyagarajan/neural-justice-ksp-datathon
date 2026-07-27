/**
 * SP Criminal Network — District-level criminal network graph
 * Route: /sp/network
 *
 * Thin wrapper that renders the shared PINetwork component inside the
 * blue SP badge wrapper, same pattern as other SP-owned pages.
 */
import { PINetwork } from '@/pages/pi/PINetwork';
import { SPRoleWrapper } from '@/components/sp/SPRoleWrapper';

export function SPNetwork() {
  return (
    <SPRoleWrapper>
      <PINetwork />
    </SPRoleWrapper>
  );
}
