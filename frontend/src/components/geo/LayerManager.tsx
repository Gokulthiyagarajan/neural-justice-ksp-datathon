import { useRef, useState, useEffect, useCallback } from 'react';
import { Slider } from '@/design-system/components/Slider';
import { Switch } from '@/design-system/components/Switch';

/**
 * UI panel to toggle visibility, adjust opacity, and reorder map layers.
 * It reads from the central `layerRegistry` and calls the appropriate
 * `render` / `remove` functions on the MapLibre instance.
 * This version is controlled via props for external state management.
 */
export function LayerManager({
  layerSettings,
  onVisibilityToggle,
  onOpacityChange
}: {
  map: any;
  /** Current layer settings */
  layerSettings: {
    [id: string]: {
      visible: boolean;
      opacity?: number;
    };
  };
  onVisibilityToggle: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}) {
  const [currentSettings, setCurrentSettings] = useState(() => layerSettings);
  const layerElementsRef = useRef<Record<string, HTMLElement>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const toggleVisibility = useCallback((id: string) => {
    onVisibilityToggle(id);
  }, []);
  
  // Initialize DOM controls
  useEffect(() => {
    if (!rootRef.current) return;

    rootRef.current.innerHTML = '';
    Object.entries(currentSettings).forEach(([id, settings]) => {
      const layerDiv = document.createElement('div');
      layerDiv.className = 'flex items-center justify-between mb-3';
      layerDiv.dataset.layerId = id;
      
      const opacityControl = settings.opacity !== undefined ? (
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[settings.opacity ?? 1]}
          onValueChange={(value: number[]) => {
            setCurrentSettings(prev => ({
              ...prev,
              [id]: { ...prev[id], opacity: value[0] }
            }));
            onOpacityChange(id, value[0]);
          }}
          className="mt-1 w-32"
        />
      ) : (
        <Switch
          checked={settings.visible}
          onChange={() => toggleVisibility(id)}
        />
      );

      layerDiv.innerHTML = `
        <div class="flex flex-col text-xs text-text-primary">
          <span>${id}</span>
        </div>
      `;

      const controlContainer = document.createElement('div');
      controlContainer.className = 'flex items-center gap-2';
      controlContainer.appendChild(opacityControl as unknown as HTMLElement);
      
      const toggleSpan = document.createElement('span');
      toggleSpan.className = 'text-sm text-text-tertiary cursor-pointer';
      toggleSpan.textContent = settings.visible ? '👁️ On' : '👁️ Off';
      toggleSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleVisibility(id);
      });
      controlContainer.appendChild(toggleSpan);
      
      layerDiv.appendChild(controlContainer);
      rootRef.current!.appendChild(layerDiv);
      layerElementsRef.current[id] = layerDiv;
    });

    return () => {
      Object.values(layerElementsRef.current).forEach(el => el.remove());
      layerElementsRef.current = {};
    };
  }, [currentSettings, toggleVisibility, onVisibilityToggle, onOpacityChange]);

  // Sync settings with parent
  useEffect(() => {
    if (Object.keys(currentSettings).length > 0) {
      Object.entries(currentSettings).forEach(([id, settings]) => {
        if (settings.opacity !== undefined) {
          onOpacityChange(id, settings.opacity);
        }
        // Visibility changes are handled by toggle callbacks directly
      });
    }
  }, [onVisibilityToggle, onOpacityChange, currentSettings]);

  return (
    <div 
      ref={rootRef}
      className="absolute top-4 right-4 bg-bg-card rounded-lg shadow-lg border border-border-primary p-4 w-64 max-h-[80vh] overflow-y-auto z-50"
    >
      <h3 className="text-sm font-medium mb-2 text-text-primary">Layers</h3>
    </div>
  );
}