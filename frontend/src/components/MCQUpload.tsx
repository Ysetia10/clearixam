import React, { useState, useRef, useCallback } from 'react';
import { processImage, processText, MCQResult } from '../api/mcq';

interface MCQUploadProps {
  onResult: (result: MCQResult) => void;
  onError: (error: string) => void;
}

const MCQUpload: React.FC<MCQUploadProps> = ({ onResult, onError }) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('image');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { onError('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { onError('File size must be less than 10MB'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [onError]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) acceptFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const handleSubmit = async () => {
    if (inputMode === 'text' && !text.trim()) { onError('Please enter some text'); return; }
    if (inputMode === 'image' && !selectedFile) { onError('Please select an image'); return; }
    setLoading(true);
    try {
      const result = inputMode === 'text' ? await processText(text) : await processImage(selectedFile!);
      onResult(result);
      setText('');
      setSelectedFile(null);
      setPreview(null);
    } catch (error: any) {
      onError(error.response?.data?.message || error.message || 'Classification failed');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || (inputMode === 'text' && !text.trim()) || (inputMode === 'image' && !selectedFile);

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
        MCQ Classification
      </h3>

      {/* Mode Toggle */}
      <div className="tabs" style={{ marginBottom: '16px', width: 'fit-content' }}>
        {(['image', 'text'] as const).map((mode) => (
          <button
            key={mode}
            className={`tab${inputMode === mode ? ' active' : ''}`}
            onClick={() => setInputMode(mode)}
          >
            {mode === 'text' ? '📝 Text Input' : '🖼️ Image Upload'}
          </button>
        ))}
      </div>

      {/* Text Input */}
      {inputMode === 'text' && (
        <div style={{ marginBottom: '16px' }}>
          <textarea
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your MCQ text here..."
            rows={6}
            style={{ resize: 'vertical' }}
          />
        </div>
      )}

      {/* Image Input */}
      {inputMode === 'image' && (
        <div style={{ marginBottom: '16px' }}>
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : selectedFile ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '32px 20px',
              textAlign: 'center',
              cursor: selectedFile ? 'default' : 'pointer',
              background: dragging ? 'var(--accent-glow, rgba(99,102,241,0.07))' : 'var(--bg2)',
              transition: 'border-color 0.2s, background 0.2s',
              minHeight: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Preview"
                  style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }}
                />
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  {selectedFile?.name} · {((selectedFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                </div>
                <button
                  className="btn"
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '36px', lineHeight: 1 }}>🖼️</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  {dragging ? 'Drop image here' : 'Drag & drop an image here'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>or</div>
                <button
                  className="btn"
                  style={{ fontSize: '13px' }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Browse Image
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>PNG, JPG, WEBP · max 10 MB</div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className="btn btn-primary"
        style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Processing...' : 'Classify MCQ'}
      </button>
    </div>
  );
};

export default MCQUpload;
