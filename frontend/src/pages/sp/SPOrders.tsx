/**
 * SP Orders — route-namespace wrapper for /sp/orders.
 * Renders the shared PCOrders component within an SP-context wrapper.
 */
import { PCOrders } from '@/pages/pc/PCOrders';
import { SPRoleWrapper } from '@/components/sp/SPRoleWrapper';

export function SPOrders() {
  return (
    <SPRoleWrapper>
      <PCOrders />
    </SPRoleWrapper>
  );
}
