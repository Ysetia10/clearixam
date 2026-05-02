import React, { useState, useRef, useCallback } from 'react';
import { processImage, processText, setOutcome, MCQResult } from '../api/mcq';

interface MCQUploadProps {
  onResult: (result: MCQResult) => void;
  onBulkResults?: (results: MCQResult[]) => void;
  onError: (error: string) => void;
}

const OUTCOMES = [
  { value: 'CORRECT', label: 'Correct', emoji: '✅', color: 'var(--green)' },
  { value: 'INCORRECT', label: 'Incorrect', emoji: '❌', color: 'var(--red)' },
  { value: 'UNATTEMPTED', label: 'Skipped', emoji: '⏭️', color: 'var(--text2)' },
] as const;

const MAX_BULK = 15;

const MCQUpload: React.FC<MCQUploadProps> = ({ onResult, onBulkResults, onError }) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'image' | 'text' | 'bulk'>('image');
  const [dragging, setDragging] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<'CORRECT' | 'INCORRECT' | 'UNATTEMPTED' | null>(null);

  // Bulk state
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; current: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

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

  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    addBulkFiles(files);
  };

  const addBulkFiles = (files: File[]) => {
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
    const invalid = files.length - valid.length;
    if (invalid > 0) onError(`${invalid} file(s) skipped — must be images under 10MB`);
    setBulkFiles(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_BULK) {
        onError(`Max ${MAX_BULK} images allowed. Extra files removed.`);
        return combined.slice(0, MAX_BULK);
      }
      return combined;
    });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (inputMode === 'bulk') {
      addBulkFiles(Array.from(e.dataTransfer.files));
    } else {
      const file = e.dataTransfer.files?.[0];
      if (file) acceptFile(file);
    }
  };

  const handleSubmit = async () => {
    if (inputMode === 'text' && !text.trim()) { onError('Please enter some text'); return; }
    if (inputMode === 'image' && !selectedFile) { onError('Please select an image'); return; }
    setLoading(true);
    try {
      const result = inputMode === 'text' ? await processText(text) : await processImage(selectedFile!);
      if (selectedOutcome && result.id) {
        try { await setOutcome({ id: result.id, outcome: selectedOutcome }); } catch (_) {}
      }
      onResult({ ...result, presetOutcome: selectedOutcome ?? undefined });
      setText('');
      setSelectedFile(null);
      setPreview(null);
      setSelectedOutcome(null);
    } catch (error: any) {
      onError(error.response?.data?.message || error.message || 'Classification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkFiles.length === 0) { onError('Please add at least one image'); return; }
    setLoading(true);
    const results: MCQResult[] = [];
    setBulkProgress({ done: 0, total: bulkFiles.length, current: bulkFiles[0].name });

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      setBulkProgress({ done: i, total: bulkFiles.length, current: file.name });

      // Generate preview
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      try {
        const result = await processImage(file);
        if (selectedOutcome && result.id) {
          try { await setOutcome({ id: result.id, outcome: selectedOutcome }); } catch (_) {}
        }
        results.push({ ...result, presetOutcome: selectedOutcome ?? undefined, imagePreview: preview });
      } catch (err: any) {
        results.push({
          subject: 'ERROR', topic: 'Failed', confidence: 0,
          matchedKeywords: [], cleanedText: `Failed: ${file.name}`,
          status: 'ERROR', needsLLM: false, source: 'RULE', canEdit: false,
          presetOutcome: selectedOutcome ?? undefined,
          imagePreview: preview,
        });
      }
    }

    setBulkProgress({ done: bulkFiles.length, total: bulkFiles.length, current: '' });
    setLoading(false);
    setBulkFiles([]);
    setBulkProgress(null);
    setSelectedOutcome(null);
    if (onBulkResults) onBulkResults(results);
  };

  const isDisabled = loading ||
    (inputMode === 'text' && !text.trim()) ||
    (inputMode === 'image' && !selectedFile) ||
    (inputMode === 'bulk' && bulkFiles.length === 0);

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
        MCQ Classification
      </h3>

      {/* Mode Toggle */}
      <div className="tabs" style={{ marginBottom: '16px', width: 'fit-content' }}>
        {([
          { key: 'image', label: '🖼️ Image' },
          { key: 'text', label: '📝 Text' },
          { key: 'bulk', label: '📦 Bulk' },
        ] as const).map(({ key, label }) => (
          <button key={key} className={`tab${inputMode === key ? ' active' : ''}`} onClick={() => setInputMode(key)}>
            {label}
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

      {/* Single Image Input */}
      {inputMode === 'image' && (
        <div style={{ marginBottom: '16px' }}>
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
              background: dragging ? 'rgba(99,102,241,0.07)' : 'var(--bg2)',
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
                <img src={preview} alt="Preview" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                  {selectedFile?.name} · {((selectedFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                </div>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 12px' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
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
                <button className="btn" style={{ fontSize: '13px' }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Browse Image
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>PNG, JPG, WEBP · max 10 MB</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>
      )}

      {/* Bulk Image Input */}
      {inputMode === 'bulk' && (
        <div style={{ marginBottom: '16px' }}>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => bulkFiles.length < MAX_BULK && bulkInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '24px 20px',
              textAlign: 'center',
              cursor: bulkFiles.length >= MAX_BULK ? 'not-allowed' : 'pointer',
              background: dragging ? 'rgba(99,102,241,0.07)' : 'var(--bg2)',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
              {dragging ? 'Drop images here' : 'Drag & drop multiple images'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>or</div>
            <button className="btn" style={{ fontSize: '13px' }}
              onClick={(e) => { e.stopPropagation(); bulkInputRef.current?.click(); }}
              disabled={bulkFiles.length >= MAX_BULK}>
              Browse Images
            </button>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>
              Up to {MAX_BULK} images · PNG, JPG, WEBP · max 10 MB each
            </div>
          </div>
          <input ref={bulkInputRef} type="file" accept="image/*" multiple onChange={handleBulkFileSelect} style={{ display: 'none' }} />

          {/* File list */}
          {bulkFiles.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px' }}>
                {bulkFiles.length} / {MAX_BULK} images selected
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                {bulkFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg2)', borderRadius: '6px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                      {i + 1}. {f.name}
                    </span>
                    <button
                      onClick={() => setBulkFiles(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', padding: '0 4px', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {bulkProgress && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text3)', marginBottom: '4px' }}>
                <span>Processing {bulkProgress.current}</span>
                <span>{bulkProgress.done} / {bulkProgress.total}</span>
              </div>
              <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(bulkProgress.done / bulkProgress.total) * 100}%`,
                  background: 'var(--accent)',
                  borderRadius: '3px',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Outcome toggle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', letterSpacing: '0.5px', marginBottom: '8px' }}>
          How did you do on this one?
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {OUTCOMES.map(({ value, label, emoji, color }) => {
            const isSelected = selectedOutcome === value;
            return (
              <button
                key={value}
                onClick={() => setSelectedOutcome(isSelected ? null : value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: `2px solid ${isSelected ? color : 'var(--border)'}`,
                  background: isSelected ? `${color}18` : 'transparent',
                  color: isSelected ? color : 'var(--text2)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
              >
                <span>{emoji}</span> {label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={inputMode === 'bulk' ? handleBulkSubmit : handleSubmit}
        disabled={isDisabled}
        className="btn btn-primary"
        style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
      >
        {loading
          ? (inputMode === 'bulk' ? `Processing ${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? bulkFiles.length}...` : 'Processing...')
          : (inputMode === 'bulk' ? `Classify ${bulkFiles.length || ''} Images` : 'Classify MCQ')}
      </button>
    </div>
  );
};

export default MCQUpload;
