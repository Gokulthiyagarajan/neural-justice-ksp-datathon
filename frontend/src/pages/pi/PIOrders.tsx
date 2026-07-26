/**
 * PI Orders — route-namespace wrapper for /pi/orders.
 * Renders the shared PCOrders component within a PI-context wrapper.
 */
import { PCOrders } from '@/pages/pc/PCOrders';
import { PIRoleWrapper } from '@/components/pi/PIRoleWrapper';

export function PIOrders() {
  return (
    <PIRoleWrapper>
      <PCOrders />
    </PIRoleWrapper>
  );
}
