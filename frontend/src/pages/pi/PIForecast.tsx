/**
 * PI Forecast — route-namespace wrapper for /pi/forecast.
 * Renders the shared PSIForecast component within a PI-context wrapper.
 */
import { PSIForecast } from '@/pages/psi/PSIForecast';
import { PIRoleWrapper } from '@/components/pi/PIRoleWrapper';

export function PIForecast() {
  return (
    <PIRoleWrapper>
      <PSIForecast />
    </PIRoleWrapper>
  );
}
