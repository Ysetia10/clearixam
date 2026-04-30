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
      : 'transparent',
    color: isSelected ? 'white' : (outcome === 'CORRECT' ? '#28a745' : outcome === 'INCORRECT' ? '#dc3545' : '#6c757d'),
    border: `2px solid ${outcome === 'CORRECT' ? '#28a745' : outcome === 'INCORRECT' ? '#dc3545' : '#6c757d'}`,
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: settingOutcome ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    opacity: settingOutcome ? 0.6 : 1
  });

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      padding: '20px', 
      borderRadius: '8px',
      marginBottom: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>Classification Result</h3>
      
      {/* Cleaned Text */}
      <div style={{ marginBottom: '15px' }}>
        <strong>Cleaned Text:</strong>
        <div style={{ 
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginTop: '5px',
          fontSize: '14px',
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          {result.cleanedText}
        </div>
      </div>

      {/* Classification Details */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '15px',
        marginBottom: '15px'
      }}>
        <div>
          <strong>Subject:</strong>
          <div style={{ 
            fontSize: '18px', 
            color: '#007bff',
            fontWeight: 'bold'
          }}>
            {result.subject}
          </div>
        </div>
        
        <div>
          <strong>Topic:</strong>
          <div style={{ fontSize: '16px' }}>
            {result.topic}
          </div>
        </div>
        
        <div>
          <strong>Subtopic:</strong>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {result.subtopic || 'N/A'}
          </div>
        </div>
        
        <div>
          <strong>Confidence:</strong>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: getConfidenceColor(result.confidence)
          }}>
            {result.confidence.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Status and Source */}
      <div style={{ marginBottom: '15px' }}>
        <span style={{
          backgroundColor: getSourceBadgeColor(result.source),
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          marginRight: '10px'
        }}>
          {result.source}
        </span>
        
        <span style={{
          backgroundColor: result.needsLLM ? '#ffc107' : '#28a745',
          color: result.needsLLM ? '#000' : 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {result.status}
        </span>
      </div>

      {/* Matched Keywords */}
      {result.matchedKeywords && result.matchedKeywords.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <strong>Matched Keywords:</strong>
          <div style={{ marginTop: '5px' }}>
            {result.matchedKeywords.map((keyword, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: '#e9ecef',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  marginRight: '5px',
                  marginBottom: '5px',
                  display: 'inline-block'
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
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#fff',
        border: '1px solid #e9ecef',
        borderRadius: '6px'
      }}>
        <strong style={{ display: 'block', marginBottom: '10px' }}>Mark Outcome:</strong>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleOutcomeClick('CORRECT')}
            disabled={settingOutcome}
            style={getOutcomeButtonStyle('CORRECT', selectedOutcome === 'CORRECT')}
          >
            ✅ Correct
          </button>
          
          <button
            onClick={() => handleOutcomeClick('INCORRECT')}
            disabled={settingOutcome}
            style={getOutcomeButtonStyle('INCORRECT', selectedOutcome === 'INCORRECT')}
          >
            ❌ Incorrect
          </button>
          
          <button
            onClick={() => handleOutcomeClick('UNATTEMPTED')}
            disabled={settingOutcome}
            style={getOutcomeButtonStyle('UNATTEMPTED', selectedOutcome === 'UNATTEMPTED')}
          >
            ⏭️ Unattempted
          </button>
        </div>
        
        {selectedOutcome && (
          <div style={{ 
            marginTop: '10px', 
            fontSize: '14px', 
            color: '#28a745',
            fontWeight: '500'
          }}>
            Marked as: {selectedOutcome.toLowerCase()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onConfirm}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ✓ Confirm
        </button>
        
        <button
          onClick={onEdit}
          style={{
            backgroundColor: '#ffc107',
            color: '#000',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ✏️ Edit
        </button>
      </div>
    </div>
  );
};

export default MCQResult;