import React, { useState } from 'react';
import { processImage, processText, MCQResult } from '../api/mcq';

interface MCQUploadProps {
  onResult: (result: MCQResult) => void;
  onError: (error: string) => void;
}

const MCQUpload: React.FC<MCQUploadProps> = ({ onResult, onError }) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { onError('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { onError('File size must be less than 10MB'); return; }
    setSelectedFile(file);
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
        {(['text', 'image'] as const).map((mode) => (
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
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ marginBottom: '8px', color: 'var(--text2)', fontSize: '13px' }}
          />
          {selectedFile && (
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
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
