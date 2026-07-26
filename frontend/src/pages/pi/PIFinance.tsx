/**
 * PI Finance — route-namespace wrapper for /pi/finance.
 * Renders the shared SPFinance component within a PI-context wrapper.
 */
import { SPFinance } from '@/pages/sp/SPFinance';
import { PIRoleWrapper } from '@/components/pi/PIRoleWrapper';

export function PIFinance() {
  return (
    <PIRoleWrapper>
      <SPFinance />
    </PIRoleWrapper>
  );
}
