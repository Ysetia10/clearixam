import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { getTopicPerformance, TopicPerformance } from '../api/mcq';

const TopicPerformancePage: React.FC = () => {
  const [performance, setPerformance] = useState<TopicPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTopicPerformance();
  }, []);

  const loadTopicPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTopicPerformance();
      setPerformance(data);
      
      // Auto-expand all subjects initially
      const subjects = new Set(data.map(item => item.subject));
      setExpandedSubjects(subjects);
    } catch (err: any) {
      setError(err.message || 'Failed to load topic performance');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return '#28a745'; // Green - Strong
    if (accuracy >= 60) return '#ffc107'; // Yellow - Average
    return '#dc3545'; // Red - Weak
  };

  const getInsightHint = (item: TopicPerformance) => {
    const total = item.correct + item.incorrect + item.unattempted;
    const unattemptedRatio = item.unattempted / total;
    
    if (item.accuracy < 50 && item.incorrect > item.correct) {
      return { text: 'High incorrect → weak topic', color: '#dc3545' };
    }
    if (unattemptedRatio > 0.5) {
      return { text: 'High unattempted → avoidance', color: '#fd7e14' };
    }
    if (item.accuracy >= 80) {
      return { text: 'Strong performance', color: '#28a745' };
    }
    return null;
  };

  // Group performance by subject
  const groupedPerformance = performance.reduce((acc, item) => {
    if (!acc[item.subject]) {
      acc[item.subject] = [];
    }
    acc[item.subject].push(item);
    return acc;
  }, {} as Record<string, TopicPerformance[]>);

  // Sort subjects by average accuracy (lowest first)
  const sortedSubjects = Object.keys(groupedPerformance).sort((a, b) => {
    const avgA = groupedPerformance[a].reduce((sum, item) => sum + item.accuracy, 0) / groupedPerformance[a].length;
    const avgB = groupedPerformance[b].reduce((sum, item) => sum + item.accuracy, 0) / groupedPerformance[b].length;
    return avgA - avgB;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          textAlign: 'center'
        }}>
          <h1>Topic Performance Analytics</h1>
          <div>Loading performance data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto'
        }}>
          <h1>Topic Performance Analytics</h1>
          <div style={{
            padding: '20px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <strong>Error:</strong> {error}
            <button
              onClick={loadTopicPerformance}
              style={{
                marginLeft: '10px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (performance.length === 0) {
    return (
      <DashboardLayout>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          textAlign: 'center'
        }}>
          <h1>Topic Performance Analytics</h1>
          <div style={{
            padding: '40px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            <h3>No Performance Data Available</h3>
            <p>Start classifying MCQs and marking their outcomes to see topic-level performance analytics.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        fontFamily: 'Arial, sans-serif'
      }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ margin: 0 }}>Topic Performance Analytics</h1>
        <button
          onClick={loadTopicPerformance}
          style={{
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>

      {/* Performance Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {performance.length}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Topics</div>
        </div>
        
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {performance.filter(p => p.accuracy >= 80).length}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>Strong Topics</div>
        </div>
        
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
            {performance.filter(p => p.accuracy < 50).length}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>Weak Topics</div>
        </div>
        
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
            {(performance.reduce((sum, p) => sum + p.accuracy, 0) / performance.length).toFixed(1)}%
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>Average Accuracy</div>
        </div>
      </div>

      {/* Subject-wise Performance */}
      {sortedSubjects.map(subject => {
        const subjectTopics = groupedPerformance[subject].sort((a, b) => a.accuracy - b.accuracy);
        const isExpanded = expandedSubjects.has(subject);
        const subjectAvg = (subjectTopics.reduce((sum, item) => sum + item.accuracy, 0) / subjectTopics.length).toFixed(1);

        return (
          <div key={subject} style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            marginBottom: '20px',
            overflow: 'hidden'
          }}>
            {/* Subject Header */}
            <div
              onClick={() => toggleSubject(subject)}
              style={{
                padding: '15px 20px',
                backgroundColor: '#f8f9fa',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isExpanded ? '1px solid #dee2e6' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{subject}</span>
                <span style={{
                  backgroundColor: getAccuracyColor(parseFloat(subjectAvg)),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {subjectAvg}%
                </span>
              </div>
              <span style={{ fontSize: '18px' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            </div>

            {/* Topics List */}
            {isExpanded && (
              <div style={{ padding: '0' }}>
                {subjectTopics.map((item, index) => {
                  const total = item.correct + item.incorrect + item.unattempted;
                  const insight = getInsightHint(item);

                  return (
                    <div
                      key={`${item.topic}-${index}`}
                      style={{
                        padding: '15px 20px',
                        borderBottom: index < subjectTopics.length - 1 ? '1px solid #f1f3f4' : 'none',
                        backgroundColor: 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
                            {item.topic}
                            {item.subtopic && (
                              <span style={{ fontWeight: 'normal', color: '#6c757d', fontSize: '14px' }}>
                                {' → ' + item.subtopic}
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '15px', fontSize: '14px', marginBottom: '8px' }}>
                            <span style={{ color: '#28a745' }}>✓ {item.correct}</span>
                            <span style={{ color: '#dc3545' }}>✗ {item.incorrect}</span>
                            <span style={{ color: '#6c757d' }}>⏭ {item.unattempted}</span>
                            <span style={{ color: '#007bff' }}>Total: {total}</span>
                          </div>

                          {insight && (
                            <div style={{
                              fontSize: '12px',
                              color: insight.color,
                              fontStyle: 'italic',
                              fontWeight: '500'
                            }}>
                              💡 {insight.text}
                            </div>
                          )}
                        </div>

                        <div style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: getAccuracyColor(item.accuracy),
                          textAlign: 'right'
                        }}>
                          {item.accuracy.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div style={{
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <strong>Color Legend:</strong>
        <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#28a745' }}>🟢 Strong (≥80%)</span>
          <span style={{ color: '#ffc107' }}>🟡 Average (60-79%)</span>
          <span style={{ color: '#dc3545' }}>🔴 Weak (&lt;60%)</span>
          <span style={{ color: '#fd7e14' }}>🟠 High Avoidance</span>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default TopicPerformancePage;