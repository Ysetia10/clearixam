import React, { useState } from 'react';
import { MCQResult, submitCorrection, AVAILABLE_SUBJECTS } from '../api/mcq';

interface MCQCorrectionProps {
  result: MCQResult;
  onCorrectionSubmitted: (message: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const MCQCorrection: React.FC<MCQCorrectionProps> = ({ 
  result, 
  onCorrectionSubmitted, 
  onCancel, 
  onError 
}) => {
  const [subject, setSubject] = useState(result.subject);
  const [topic, setTopic] = useState(result.topic);
  const [subtopic, setSubtopic] = useState(result.subtopic || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !topic.trim()) {
      onError('Subject and topic are required');
      return;
    }

    if (!result.id) {
      onError('No classification ID available for correction');
      return;
    }

    setLoading(true);

    try {
      const correction = {
        id: result.id,
        subject: subject.trim(),
        topic: topic.trim(),
        subtopic: subtopic.trim() || undefined
      };

      const response = await submitCorrection(correction);
      
      if (response.success) {
        onCorrectionSubmitted(response.message);
      } else {
        onError(response.message || 'Correction failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Correction failed';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ffc107', 
      padding: '20px', 
      borderRadius: '8px',
      marginBottom: '20px',
      backgroundColor: '#fff3cd'
    }}>
      <h3>Correct Classification</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Original:</strong> {result.subject} → {result.topic}
        {result.subtopic && ` → ${result.subtopic}`}
      </div>

      {/* Subject Dropdown */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Subject:
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="">Select Subject</option>
          {AVAILABLE_SUBJECTS.map((subj) => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </select>
      </div>

      {/* Topic Input */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Topic:
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topic"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Subtopic Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Subtopic (Optional):
        </label>
        <input
          type="text"
          value={subtopic}
          onChange={(e) => setSubtopic(e.target.value)}
          placeholder="Enter subtopic (optional)"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSubmit}
          disabled={loading || !subject.trim() || !topic.trim()}
          style={{
            backgroundColor: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Submitting...' : 'Submit Correction'}
        </button>
        
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MCQCorrection;