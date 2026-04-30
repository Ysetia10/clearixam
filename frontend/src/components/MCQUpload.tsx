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
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        onError('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        onError('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (inputMode === 'text' && !text.trim()) {
      onError('Please enter some text');
      return;
    }
    
    if (inputMode === 'image' && !selectedFile) {
      onError('Please select an image');
      return;
    }

    setLoading(true);
    
    try {
      let result: MCQResult;
      
      if (inputMode === 'text') {
        result = await processText(text);
      } else {
        result = await processImage(selectedFile!);
      }
      
      onResult(result);
      
      // Clear form
      setText('');
      setSelectedFile(null);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Classification failed';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      padding: '20px', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>MCQ Classification</h3>
      
      {/* Input Mode Toggle */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ marginRight: '15px' }}>
          <input
            type="radio"
            value="text"
            checked={inputMode === 'text'}
            onChange={(e) => setInputMode(e.target.value as 'text')}
            style={{ marginRight: '5px' }}
          />
          Text Input
        </label>
        <label>
          <input
            type="radio"
            value="image"
            checked={inputMode === 'image'}
            onChange={(e) => setInputMode(e.target.value as 'image')}
            style={{ marginRight: '5px' }}
          />
          Image Upload
        </label>
      </div>

      {/* Text Input */}
      {inputMode === 'text' && (
        <div style={{ marginBottom: '15px' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your MCQ text here..."
            rows={6}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {/* Image Input */}
      {inputMode === 'image' && (
        <div style={{ marginBottom: '15px' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ marginBottom: '10px' }}
          />
          {selectedFile && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || (inputMode === 'text' && !text.trim()) || (inputMode === 'image' && !selectedFile)}
        style={{
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {loading ? 'Processing...' : 'Classify MCQ'}
      </button>
    </div>
  );
};

export default MCQUpload;