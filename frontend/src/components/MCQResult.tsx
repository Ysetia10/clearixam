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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return '#28a745'; // Green
    if (confidence >= 50) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 70) return { color: '#28a745', label: 'High Confidence' };
    if (confidence >= 50) return { color: '#ffc107', label: 'Medium Confidence' };
    return { color: '#dc3545', label: 'Low Confidence' };
  };

  const getSourceBadgeColor = (source: string) => {
    return source === 'LLM' ? '#6f42c1' : '#17a2b8';
  };

  const handleOutcomeClick = async (outcome: 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED') => {
    if (!result.id) {
      onError('No classification ID available');
      return;
    }

    setSettingOutcome(true);
    
    try {
      const response = await setOutcome({
        id: result.id,
        outcome: outcome
      });

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

  const getOutcomeButtonStyle = (outcome: string, isSelected: boolean) => ({
    backgroundColor: isSelected 
      ? (outcome === 'CORRECT' ? '#28a745' : outcome === 'INCORRECT' ? '#dc3545' : '#6c757d')
      : 'white',
    color: isSelected 
      ? 'white' 
      : (outcome === 'CORRECT' ? '#28a745' : outcome === 'INCORRECT' ? '#dc3545' : '#6c757d'),
    border: `2px solid ${outcome === 'CORRECT' ? '#28a745' : outcome === 'INCORRECT' ? '#dc3545' : '#6c757d'}`,
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
    gap: '6px'
  });

  const confidenceBadge = getConfidenceBadge(result.confidence || 0);

  return (
    <div style={{ 
      backgroundColor: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '20px', 
          fontWeight: '700',
          color: '#2c3e50'
        }}>
          Classification Result
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            backgroundColor: getSourceBadgeColor(result.source),
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {result.source}
          </span>
          
          <span style={{
            backgroundColor: confidenceBadge.color,
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {confidenceBadge.label}
          </span>
        </div>
      </div>

      {/* Question Text */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: '#6c757d',
          display: 'block',
          marginBottom: '8px'
        }}>
          Question Text:
        </label>
        <div style={{ 
          backgroundColor: '#f8f9fa',
          padding: '16px',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          fontSize: '15px',
          lineHeight: '1.5',
          color: '#495057',
          maxHeight: '120px',
          overflowY: 'auto'
        }}>
          {result.cleanedText}
        </div>
      </div>

      {/* Classification Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6c757d',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '8px'
          }}>
            Subject
          </label>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '700',
            color: '#007bff'
          }}>
            {result.subject}
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6c757d',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '8px'
          }}>
            Topic
          </label>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#495057'
          }}>
            {result.topic || 'Not specified'}
          </div>
        </div>
        
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6c757d',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: '8px'
          }}>
            Confidence
          </label>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: '700',
            color: getConfidenceColor(result.confidence || 0)
          }}>
            {result.confidence ? result.confidence.toFixed(1) : '0.0'}%
          </div>
        </div>
      </div>

      {/* Matched Keywords */}
      {result.matchedKeywords && result.matchedKeywords.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#6c757d',
            display: 'block',
            marginBottom: '8px'
          }}>
            Matched Keywords:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {result.matchedKeywords.map((keyword, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: '1px solid #bbdefb'
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mark Outcome Section */}
      <div style={{ 
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '10px'
      }}>
        <label style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#495057',
          display: 'block',
          marginBottom: '12px'
        }}>
          Mark Your Performance:
        </label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleOutcomeClick('CORRECT')}
            disabled={settingOutcome}
            style={getOutcomeButtonStyle('CORRECT', selectedOutcome === 'CORRECT')}
          >
            <span>✅</span> Correct
          </button>
          
          <button
            onClick={() => handleOutcomeClick('INCORRECT')}
            disabled={settingOutcome}
            style={getOutcomeButtonStyle('INCORRECT', selectedOutcome === 'INCORRECT')}
          >
            <span>❌</span> Incorrect
          </button>
          
          <button
            onClick={() => handleOutcomeClick('UNATTEMPTED')}
            disabled={settingOutcome}
            style={getOutcomeButtonStyle('UNATTEMPTED', selectedOutcome === 'UNATTEMPTED')}
          >
            <span>⏭️</span> Skipped
          </button>
        </div>
        
        {selectedOutcome && (
          <div style={{ 
            marginTop: '12px', 
            fontSize: '14px', 
            color: '#28a745',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>✓</span> Marked as: {selectedOutcome.toLowerCase()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={onEdit}
          style={{
            backgroundColor: '#ffc107',
            color: '#000',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e0a800'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffc107'}
        >
          <span>✏️</span> Edit Classification
        </button>
        
        <button
          onClick={onConfirm}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
        >
          <span>✓</span> Confirm & Continue
        </button>
      </div>
    </div>
  );
};

export default MCQResult;