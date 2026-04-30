import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import MCQUpload from '../components/MCQUpload';
import MCQResult from '../components/MCQResult';
import MCQCorrection from '../components/MCQCorrection';
import RecentCorrections from '../components/RecentCorrections';
import { MCQResult as MCQResultType } from '../api/mcq';

const MCQClassification: React.FC = () => {
  const [result, setResult] = useState<MCQResultType | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [refreshCorrections, setRefreshCorrections] = useState(0);

  const handleResult = (newResult: MCQResultType) => {
    setResult(newResult);
    setShowCorrection(false);
    setMessage({ text: 'MCQ classified successfully!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleError = (error: string) => {
    setMessage({ text: error, type: 'error' });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleEdit = () => {
    setShowCorrection(true);
  };

  const handleConfirm = () => {
    setMessage({ text: 'Classification confirmed!', type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleOutcomeSet = (successMessage: string) => {
    setMessage({ text: successMessage, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCorrectionSubmitted = (successMessage: string) => {
    setShowCorrection(false);
    setMessage({ text: successMessage, type: 'success' });
    setRefreshCorrections(prev => prev + 1); // Trigger refresh of recent corrections
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCancelCorrection = () => {
    setShowCorrection(false);
  };

  return (
    <DashboardLayout>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '30px',
          color: '#333'
        }}>
          MCQ Classification Tool
        </h1>

      {/* Message Display */}
      {message && (
        <div style={{
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '30px'
      }}>
        {/* Main Content */}
        <div>
          {/* Upload Component */}
          <MCQUpload 
            onResult={handleResult}
            onError={handleError}
          />

          {/* Result Display */}
          {result && !showCorrection && (
            <MCQResult
              result={result}
              onEdit={handleEdit}
              onConfirm={handleConfirm}
              onOutcomeSet={handleOutcomeSet}
              onError={handleError}
            />
          )}

          {/* Correction Panel */}
          {result && showCorrection && (
            <MCQCorrection
              result={result}
              onCorrectionSubmitted={handleCorrectionSubmitted}
              onCancel={handleCancelCorrection}
              onError={handleError}
            />
          )}
        </div>

        {/* Sidebar */}
        <div>
          <RecentCorrections key={refreshCorrections} />
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#495057'
      }}>
        <h4 style={{ marginTop: 0 }}>How to use:</h4>
        <ol style={{ marginBottom: 0 }}>
          <li>Choose between text input or image upload</li>
          <li>Submit your MCQ for classification</li>
          <li>Review the results (subject, topic, confidence)</li>
          <li>Confirm if correct, or edit to make corrections</li>
          <li>View recent corrections in the sidebar</li>
        </ol>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default MCQClassification;