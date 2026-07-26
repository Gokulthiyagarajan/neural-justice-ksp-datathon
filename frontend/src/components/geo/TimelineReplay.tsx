import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { getTimeline } from '@/api/geo';
import type { TimelineSlice } from '@/types/geo';

interface TimelineReplayProps {
  visibleLayers?: Record<string, boolean>;
  onSliceChange?: (sliceIndex: number) => void;
  districtId?: string;
}

const RANGE_OPTIONS = [
  { label: '24H', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
];

const SPEED_OPTIONS = [1, 2, 5, 10];

export function TimelineReplay({ onSliceChange, districtId }: TimelineReplayProps) {
  const [slices, setSlices] = useState<TimelineSlice[]>([]);
  const [totalSlices, setTotalSlices] = useState(0);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedRange, setSelectedRange] = useState(30);
  const animFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getTimeline({
          district_id: districtId,
          days: selectedRange,
          slices: 100,
        });
        setSlices(res.slices);
        setTotalSlices(res.total_slices);
        setCurrentSlice(0);
        setIsPlaying(false);
      } catch {
        // silently fail
      }
    };
    fetchData();
  }, [districtId, selectedRange]);

  useEffect(() => {
    if (!isPlaying || slices.length === 0) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const intervalMs = 1000 / speed;
    const animate = (timestamp: number) => {
      if (timestamp - lastFrameRef.current >= intervalMs) {
        lastFrameRef.current = timestamp;
        setCurrentSlice((prev) => {
          const next = prev + 1;
          if (next >= slices.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed, slices.length]);

  useEffect(() => {
    onSliceChange?.(currentSlice);
  }, [currentSlice, onSliceChange]);

  const handlePlayPause = useCallback(() => {
    if (slices.length === 0) return;
    if (currentSlice >= slices.length - 1) {
      setCurrentSlice(0);
    }
    setIsPlaying((p) => !p);
    lastFrameRef.current = 0;
  }, [slices.length, currentSlice]);

  const handleReset = useCallback(() => {
    setCurrentSlice(0);
    setIsPlaying(false);
  }, []);

  const progress = slices.length > 0 ? (currentSlice / (slices.length - 1)) * 100 : 0;

  return (
    <div className="glass rounded-xl shadow-lg px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setSelectedRange(opt.days)}
              className={`text-[11px] px-2 py-1 rounded transition-colors ${
                selectedRange === opt.days
                  ? 'bg-[rgba(0,212,255,0.15)] text-white'
                  : 'text-text-tertiary hover:bg-hover-bg'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-1 rounded hover:bg-hover-bg text-text-tertiary"
            title="Reset"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={handlePlayPause}
            className={`p-1.5 rounded transition-colors ${
              isPlaying ? 'bg-[rgba(255,51,102,0.1)] text-[var(--alert-red)]' : 'bg-[rgba(0,212,255,0.15)] text-white hover:bg-[rgba(0,212,255,0.25)]'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setCurrentSlice((p) => Math.min(p + 1, slices.length - 1))}
            className="p-1 rounded hover:bg-hover-bg text-text-tertiary"
            title="Skip forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={Math.max(0, slices.length - 1)}
            value={currentSlice}
            onChange={(e) => {
              setCurrentSlice(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-[var(--accent-cyan)]"
          />
          <div
            className="absolute top-0 left-0 h-1.5 bg-[rgba(0,212,255,0.15)] rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                speed === s
                  ? 'bg-bg-tertiary text-text-primary font-medium'
                  : 'text-text-tertiary hover:bg-hover-bg'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="text-xs text-text-tertiary font-mono min-w-[100px] text-right">
          {slices[currentSlice]?.timestamp
            ? new Date(slices[currentSlice].timestamp).toLocaleString()
            : '—'}
        </div>

        <div className="text-xs text-text-tertiary font-mono min-w-[70px] text-right">
          Slice {currentSlice + 1}/{slices.length || totalSlices}
        </div>
      </div>
    </div>
  );
}
