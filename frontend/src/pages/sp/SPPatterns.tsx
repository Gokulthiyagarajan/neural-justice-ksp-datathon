/**
 * SP Patterns — route-namespace wrapper for /sp/patterns.
 * Renders the shared PSIPatterns component within an SP-context wrapper.
 */
import { PSIPatterns } from '@/pages/psi/PSIPatterns';
import { SPRoleWrapper } from '@/components/sp/SPRoleWrapper';

export function SPPatterns() {
  return (
    <SPRoleWrapper>
      <PSIPatterns />
    </SPRoleWrapper>
  );
}
