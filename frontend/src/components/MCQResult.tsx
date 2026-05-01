import React, { useState } from 'react';
import { MCQResult as MCQResultType, setOutcome } from '../api/mcq';

interface MCQResultProps {
  result: MCQResultType;
  onEdit: () => void;
  onConfirm: () => void;
  onOutcomeSet: (message: string) => void;
  onError: (error: string) => void;
}

const MCQResult: React.FC<MCQResultProps> = ({ result, onEdit, onConfirm, onOutcomeSet, onError }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [settingOutcome, setSettingOutcome] = useState(false);

  const getConfidenceVar = (confidence: number) => {
    if (confidence >= 70) return 'var(--green)';
    if (confidence >= 50) return 'var(--amber)';
    return 'var(--red)';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 70) return { color: 'var(--green)', label: 'High Confidence' };
    if (confidence >= 50) return { color: 'var(--amber)', label: 'Medium Confidence' };
    return { color: 'var(--red)', label: 'Low Confidence' };
  };

  const getSourceBadgeColor = (source: string) =>
    source === 'LLM' ? 'var(--accent2)' : 'var(--blue)';

  const handleOutcomeClick = async (outcome: 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED') => {
    if (!result.id) { onError('No classification ID available'); return; }
    setSettingOutcome(true);
    try {
      const response = await setOutcome({ id: result.id, outcome });
      if (response.success) {
        setSelectedOutcome(outcome);
        onOutcomeSet(`Marked as ${outcome.toLowerCase()}`);
      } else {
        onError(response.message || 'Failed to set outcome');
      }
    } catch (error: any) {
      onError(error.message || 'Failed to set outcome');
    } finally {
      setSettingOutcome(false);
    }
  };

  const outcomeColor = (outcome: string) =>
    outcome === 'CORRECT' ? 'var(--green)' : outcome === 'INCORRECT' ? 'var(--red)' : 'var(--text2)';

  const getOutcomeButtonStyle = (outcome: string, isSelected: boolean): React.CSSProperties => ({
    backgroundColor: isSelected ? outcomeColor(outcome) : 'transparent',
    color: isSelected ? 'var(--on-color)' : outcomeColor(outcome),
    border: `2px solid ${outcomeColor(outcome)}`,
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: settingOutcome ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    opacity: settingOutcome ? 0.6 : 1,
    minWidth: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontFamily: 'inherit',
  });

  const confidenceBadge = getConfidenceBadge(result.confidence || 0);

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border2)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
          Classification Result
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            backgroundColor: getSourceBadgeColor(result.source),
            color: 'var(--on-color)',
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'
          }}>
            {result.source}
          </span>
          <span style={{
            backgroundColor: confidenceBadge.color,
            color: 'var(--on-color)',
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600'
          }}>
            {confidenceBadge.label}
          </span>
        </div>
      </div>

      {/* Question Text */}
      <div style={{ marginBottom: '20px' }}>
        <label className="input-label">Question Text</label>
        <div style={{
          backgroundColor: 'var(--surface2)',
          padding: '14px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--text2)',
          maxHeight: '120px',
          overflowY: 'auto',
        }}>
          {result.cleanedText}
        </div>
      </div>

      {/* Classification Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Subject', value: result.subject, color: 'var(--accent)' },
          { label: 'Topic', value: result.topic || 'Not specified', color: 'var(--text)' },
          { label: 'Confidence', value: `${result.confidence?.toFixed(1) ?? '0.0'}%`, color: getConfidenceVar(result.confidence || 0) },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: 'var(--surface2)',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}>
            <label className="input-label" style={{ marginBottom: '6px' }}>{label}</label>
            <div style={{ fontSize: '16px', fontWeight: '700', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Matched Keywords */}
      {result.matchedKeywords && result.matchedKeywords.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label className="input-label">Matched Keywords</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {result.matchedKeywords.map((keyword, index) => (
              <span key={index} style={{
                backgroundColor: 'var(--blue-glow)',
                color: 'var(--blue)',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '500',
                border: '1px solid var(--blue)',
              }}>
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mark Outcome */}
      <div style={{
        marginBottom: '20px',
        padding: '18px',
        backgroundColor: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
      }}>
        <label className="input-label" style={{ marginBottom: '12px' }}>Mark Your Performance</label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(['CORRECT', 'INCORRECT', 'UNATTEMPTED'] as const).map((o) => (
            <button key={o} onClick={() => handleOutcomeClick(o)} disabled={settingOutcome}
              style={getOutcomeButtonStyle(o, selectedOutcome === o)}>
              <span>{o === 'CORRECT' ? '✅' : o === 'INCORRECT' ? '❌' : '⏭️'}</span>
              {o === 'CORRECT' ? 'Correct' : o === 'INCORRECT' ? 'Incorrect' : 'Skipped'}
            </button>
          ))}
        </div>
        {selectedOutcome && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--green)', fontWeight: '600' }}>
            ✓ Marked as: {selectedOutcome.toLowerCase()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onEdit} className="btn" style={{
          backgroundColor: 'var(--amber)', color: 'var(--bg)', border: 'none', fontWeight: '600',
        }}>
          ✏️ Edit Classification
        </button>
        <button onClick={onConfirm} className="btn" style={{
          backgroundColor: 'var(--green)', color: 'var(--on-color)', border: 'none', fontWeight: '600',
        }}>
          ✓ Confirm & Continue
        </button>
      </div>
    </div>
  );
};

export default MCQResult;
