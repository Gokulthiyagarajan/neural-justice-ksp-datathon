export interface GeoLayer {
  /** Unique identifier for the layer */
  id: string;
  /** Human‑readable name shown in the UI */
  name: string;
  /** Whether the layer should be rendered */
  visible: boolean;
  /** Optional opacity (0‑1). Defaults to 1 */
  opacity?: number;
  /** Called when the map becomes ready – add sources / layers */
  render: (map: any) => void;
  /** Called when the layer is hidden or the map is destroyed */
  remove: (map: any) => void;
}
