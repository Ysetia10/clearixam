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
      setCorrections(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load corrections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCorrections(); }, []);

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleString(); } catch { return dateString; }
  };

  const truncateText = (text: string, max = 60) =>
    text.length > max ? text.substring(0, max) + '...' : text;

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px' }}>
        Loading recent corrections...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        border: '1px solid var(--red)',
        padding: '16px',
        borderRadius: '10px',
        backgroundColor: 'var(--red-glow)',
        color: 'var(--red)',
      }}>
        <strong>Error:</strong> {error}
        <button onClick={loadCorrections} className="btn" style={{
          marginLeft: '10px', backgroundColor: 'var(--red)', color: 'var(--on-color)',
          border: 'none', fontSize: '12px', padding: '4px 10px',
        }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>Recent Corrections</span>
        <button onClick={loadCorrections} className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 10px' }}>
          ↻ Refresh
        </button>
      </div>

      {corrections.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>
          No corrections yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {corrections.map((correction) => (
            <div key={correction.id} style={{
              border: '1px solid var(--border)',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface2)',
            }}>
              <div style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--text2)' }}>
                <strong style={{ color: 'var(--text)' }}>Q:</strong> {truncateText(correction.questionText)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--red)' }}>{correction.original}</span>
                  <span style={{ margin: '0 8px', color: 'var(--text3)' }}>→</span>
                  <span style={{ color: 'var(--green)' }}>{correction.corrected}</span>
                </div>
                <div style={{ color: 'var(--text3)' }}>{formatDate(correction.correctedAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentCorrections;
