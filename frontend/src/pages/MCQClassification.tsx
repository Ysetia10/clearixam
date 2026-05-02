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

  // Bulk queue
  const [bulkQueue, setBulkQueue] = useState<MCQResultType[]>([]);
  const [bulkIndex, setBulkIndex] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);

  const flash = (text: string, type: 'success' | 'error', duration = 3000) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), duration);
  };

  const handleResult = (newResult: MCQResultType) => {
    setResult(newResult);
    setShowCorrection(false);
    flash('MCQ classified successfully!', 'success');
  };

  const handleBulkResults = (results: MCQResultType[]) => {
    const valid = results.filter(r => r.subject !== 'ERROR');
    const failed = results.length - valid.length;
    if (valid.length === 0) { flash('All images failed to process.', 'error', 5000); return; }
    setBulkQueue(valid);
    setBulkIndex(0);
    setBulkMode(true);
    flash(`${valid.length} MCQs classified${failed > 0 ? `, ${failed} failed` : ''}. Review them below.`, 'success', 5000);
  };

  const handleConfirm = () => {
    if (bulkMode) {
      const next = bulkIndex + 1;
      if (next >= bulkQueue.length) {
        // done with queue
        setBulkMode(false);
        setBulkQueue([]);
        setBulkIndex(0);
        setRefreshCorrections(prev => prev + 1);
        flash('All MCQs reviewed!', 'success');
      } else {
        setBulkIndex(next);
        setShowCorrection(false);
        flash(`${next + 1} of ${bulkQueue.length}`, 'success', 1500);
      }
    } else {
      setResult(null);
      setShowCorrection(false);
      flash('Classification confirmed! Ready for next MCQ.', 'success');
    }
  };

  const handleCorrectionSubmitted = (msg: string, correctedSubject: string, correctedTopic: string) => {
    setShowCorrection(false);
    setRefreshCorrections(prev => prev + 1);
    flash(msg, 'success');
    // Update the active result with corrected values
    if (bulkMode) {
      setBulkQueue(prev => prev.map((r, i) =>
        i === bulkIndex ? { ...r, subject: correctedSubject, topic: correctedTopic } : r
      ));
    } else {
      setResult(prev => prev ? { ...prev, subject: correctedSubject, topic: correctedTopic } : prev);
    }
  };

  const activeResult = bulkMode ? bulkQueue[bulkIndex] : result;

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
            {/* Bulk progress header */}
            {bulkMode && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', marginBottom: '16px',
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
                  Reviewing {bulkIndex + 1} of {bulkQueue.length}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {bulkQueue.map((_, i) => (
                    <div key={i} style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: i < bulkIndex ? 'var(--green)' : i === bulkIndex ? 'var(--accent)' : 'var(--border)',
                    }} />
                  ))}
                </div>
                <button className="btn" style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => { setBulkMode(false); setBulkQueue([]); setBulkIndex(0); }}>
                  Exit Bulk
                </button>
              </div>
            )}

            {!bulkMode && (
              <MCQUpload
                onResult={handleResult}
                onBulkResults={handleBulkResults}
                onError={(e) => flash(e, 'error', 5000)}
              />
            )}

            {activeResult && !showCorrection && (
              <MCQResult
                result={activeResult}
                onEdit={() => setShowCorrection(true)}
                onConfirm={handleConfirm}
                onOutcomeSet={(msg) => flash(msg, 'success')}
                onError={(e) => flash(e, 'error', 5000)}
              />
            )}

            {activeResult && showCorrection && (
              <MCQCorrection
                result={activeResult}
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
                <li>Choose image, text, or bulk input</li>
                <li>Mark your outcome before submitting</li>
                <li>Submit for classification</li>
                <li>Review subject and topic</li>
                <li>Confirm or edit each result</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MCQClassification;
