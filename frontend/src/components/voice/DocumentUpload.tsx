import React, { useRef, useState } from 'react';

interface Props {
  sessionId: string;
  onUploadComplete: (result: any) => void;
}

const DocumentUpload: React.FC<Props> = ({ sessionId, onUploadComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('session_id', sessionId);
    form.append('file', file);
    try {
      const res = await fetch('/api/v1/ocr/upload', { method: 'POST', body: form });
      const data = await res.json();
      onUploadComplete(data);
    } catch (err) {
      // Error handling for upload failure
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ border: '2px dashed #ccc', borderRadius: 12, padding: 24, textAlign: 'center' }}>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} hidden />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ padding: '10px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        {uploading ? 'Uploading...' : 'Upload FIR PDF'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>PDF, JPEG, PNG (max 10MB)</p>
    </div>
  );
};

export default DocumentUpload;
