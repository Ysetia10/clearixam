import React, { useState } from 'react';
import { MCQResult, submitCorrection, AVAILABLE_SUBJECTS } from '../api/mcq';

interface MCQCorrectionProps {
  result: MCQResult;
  onCorrectionSubmitted: (message: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const MCQCorrection: React.FC<MCQCorrectionProps> = ({ result, onCorrectionSubmitted, onCancel, onError }) => {
  const [subject, setSubject] = useState(result.subject);
  const [topic, setTopic] = useState(result.topic);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !topic.trim()) { onError('Subject and topic are required'); return; }
    if (!result.id) { onError('No classification ID available for correction'); return; }
    setLoading(true);
    try {
      const response = await submitCorrection({ id: result.id, subject: subject.trim(), topic: topic.trim() });
      if (response.success) onCorrectionSubmitted(response.message);
      else onError(response.message || 'Correction failed');
    } catch (error: any) {
      onError(error.response?.data?.message || error.message || 'Correction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--amber)',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      backgroundColor: 'var(--amber-glow)',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
        Correct Classification
      </h3>

      <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text2)' }}>
        <strong style={{ color: 'var(--text)' }}>Original:</strong> {result.subject} → {result.topic}
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label className="input-label">Subject</label>
        <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: '100%' }}>
          <option value="">Select Subject</option>
          {AVAILABLE_SUBJECTS.map((subj) => (
            <option key={subj} value={subj}>{subj}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label className="input-label">Topic</label>
        <input
          className="input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topic"
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSubmit}
          disabled={loading || !subject.trim() || !topic.trim()}
          className="btn"
          style={{
            backgroundColor: loading || !subject.trim() || !topic.trim() ? 'var(--surface3)' : 'var(--green)',
            color: 'var(--on-color)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Submitting...' : 'Submit Correction'}
        </button>
        <button onClick={onCancel} disabled={loading} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MCQCorrection;
