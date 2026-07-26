import React, { useEffect, useRef } from 'react';

interface Props { isRecording: boolean; }

const WaveAnimation: React.FC<Props> = ({ isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bars = 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#003366';
      for (let i = 0; i < bars; i++) {
        const h = isRecording
          ? Math.sin(frame * 0.1 + i * 0.3) * 30 + 40
          : 4;
        const x = i * (canvas.width / bars);
        ctx.fillRect(x + 2, canvas.height / 2 - h / 2, canvas.width / bars - 4, h);
      }
      frame++;
      requestAnimationFrame(animate);
    };
    animate();
  }, [isRecording]);

  return <canvas ref={canvasRef} width={320} height={80} style={{ width: '100%', height: 80, borderRadius: 8 }} />;
};

export default WaveAnimation;
