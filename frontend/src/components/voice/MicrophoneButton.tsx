import React from 'react';

interface Props {
  isRecording: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: number;
  className?: string;
  title?: string;
}

const MicrophoneButton: React.FC<Props> = ({
  isRecording,
  onToggle,
  disabled,
  size = 80,
  className = '',
  title,
}) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={className}
    title={title}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: 'none',
      background: isRecording ? '#d32f2f' : '#003366',
      color: 'white',
      fontSize: Math.round(size * 0.45),
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
  >
    {isRecording ? '■' : '🎤'}
  </button>
);

export default MicrophoneButton;
