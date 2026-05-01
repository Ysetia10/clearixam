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

  const flash = (text: string, type: 'success' | 'error', duration = 3000) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), duration);
  };

  const handleResult = (newResult: MCQResultType) => {
    setResult(newResult);
    setShowCorrection(false);
    flash('MCQ classified successfully!', 'success');
  };

  const handleConfirm = () => {
    setResult(null);
    setShowCorrection(false);
    flash('Classification confirmed! Ready for next MCQ.', 'success');
  };

  const handleCorrectionSubmitted = (msg: string) => {
    setShowCorrection(false);
    setRefreshCorrections(prev => prev + 1);
    flash(msg, 'success');
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 0' }}>

        <h1 className="page-title" style={{ marginBottom: '28px' }}>MCQ Classification</h1>

        {/* Message Banner */}
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'success' ? 'var(--green-glow)' : 'var(--red-glow)',
            color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${message.type === 'success' ? 'var(--green)' : 'var(--red)'}`,
            fontSize: '14px',
          }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Main */}
          <div>
            <MCQUpload onResult={handleResult} onError={(e) => flash(e, 'error', 5000)} />

            {result && !showCorrection && (
              <MCQResult
                result={result}
                onEdit={() => setShowCorrection(true)}
                onConfirm={handleConfirm}
                onOutcomeSet={(msg) => flash(msg, 'success')}
                onError={(e) => flash(e, 'error', 5000)}
              />
            )}

            {result && showCorrection && (
              <MCQCorrection
                result={result}
                onCorrectionSubmitted={handleCorrectionSubmitted}
                onCancel={() => setShowCorrection(false)}
                onError={(e) => flash(e, 'error', 5000)}
              />
            )}
          </div>

          {/* Sidebar */}
          <div>
            <RecentCorrections key={refreshCorrections} />

            {/* How to use */}
            <div className="card" style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                How to use
              </div>
              <ol style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', color: 'var(--text2)', lineHeight: '1.8' }}>
                <li>Choose text or image input</li>
                <li>Submit your MCQ for classification</li>
                <li>Review subject, topic, and confidence</li>
                <li>Confirm if correct, or edit to fix</li>
                <li>Mark your outcome (correct / wrong / skipped)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MCQClassification;
