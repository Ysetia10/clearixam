import React, { useState, useEffect } from 'react';
import { getRecentCorrections, RecentCorrection } from '../api/mcq';

const RecentCorrections: React.FC = () => {
  const [corrections, setCorrections] = useState<RecentCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCorrections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentCorrections();
      
      // Ensure data is an array before calling slice
      if (Array.isArray(data)) {
        setCorrections(data.slice(0, 5)); // Show only last 5
      } else {
        console.warn('Recent corrections data is not an array:', data);
        setCorrections([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load corrections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCorrections();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '20px', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div>Loading recent corrections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        border: '1px solid #dc3545', 
        padding: '20px', 
        borderRadius: '8px',
        backgroundColor: '#f8d7da',
        color: '#721c24'
      }}>
        <strong>Error:</strong> {error}
        <button
          onClick={loadCorrections}
          style={{
            marginLeft: '10px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      padding: '20px', 
      borderRadius: '8px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0 }}>Recent Corrections</h3>
        <button
          onClick={loadCorrections}
          style={{
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Refresh
        </button>
      </div>

      {corrections.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          No corrections yet
        </div>
      ) : (
        <div>
          {corrections.map((correction) => (
            <div
              key={correction.id}
              style={{
                border: '1px solid #e9ecef',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '10px',
                backgroundColor: '#f8f9fa'
              }}
            >
              <div style={{ 
                fontSize: '14px', 
                marginBottom: '8px',
                color: '#495057'
              }}>
                <strong>Question:</strong> {truncateText(correction.questionText)}
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: '#dc3545' }}>
                    {correction.original}
                  </span>
                  <span style={{ margin: '0 8px', color: '#666' }}>→</span>
                  <span style={{ color: '#28a745' }}>
                    {correction.corrected}
                  </span>
                </div>
                
                <div style={{ color: '#666' }}>
                  {formatDate(correction.correctedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentCorrections;