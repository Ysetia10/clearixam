import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { examsApi, Exam, Subject } from '../api/exams';
import {
  sectionalTestsApi,
  SectionalSubjectSummary,
} from '../api/sectionalTests';
import { useToast } from '../components/Toast';

type Tab = 'history' | 'add';

// ─── colour palette ──────────────────────────────────────────────────────────
const ACCENT   = '#7c6aff';
const GREEN    = '#22c55e';
const RED      = '#f43f5e';
const AMBER    = '#f59e0b';
const BLUE     = '#3b82f6';
const PIE_COLORS = [GREEN, RED, '#94a3b8'];

// ─── tiny helpers ────────────────────────────────────────────────────────────
const fmt1 = (n: number) => n.toFixed(1);
const fmtSec = (s: number | null) => (s == null ? '—' : `${s.toFixed(1)}s`);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

function trendColor(v: number) {
  return v > 0 ? GREEN : v < 0 ? RED : 'var(--text3)';
}

const trendLabel = (v: number) => v === 0 ? '—' : `${v > 0 ? '+' : ''}${fmt1(v)}`;

// ─── custom tooltip shared between charts ───────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '10px 14px',
      fontSize: '12px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text2)' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? fmt1(p.value) : p.value}</strong>
          {p.unit || ''}
        </div>
      ))}
    </div>
  );
};

// ─── Subject history panel ───────────────────────────────────────────────────
function SubjectHistoryPanel({
  summary,
  onDelete,
}: {
  summary: SectionalSubjectSummary;
  onDelete: (id: string) => void;
}) {
  const h = summary.history;
  const latest = h[h.length - 1];

  // pie data for latest entry
  const pieData = latest
    ? [
        { name: 'Correct', value: latest.correct },
        { name: 'Incorrect', value: latest.incorrect },
        { name: 'Unattempted', value: latest.unattempted },
      ]
    : [];

  const accColor =
    summary.latestAccuracy >= 80 ? GREEN :
    summary.latestAccuracy >= 60 ? AMBER : RED;

  const hasSpeed = h.some(p => p.secondsPerQuestion != null);

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
            {summary.subjectName}
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
            {summary.totalEntries} entr{summary.totalEntries === 1 ? 'y' : 'ies'}
          </span>
        </div>
        {/* headline stats */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Latest Score</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: ACCENT }}>{fmt1(summary.latestScore)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Accuracy</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: accColor }}>{fmt1(summary.latestAccuracy)}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Best Score</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: GREEN }}>{fmt1(summary.bestScore)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Speed (latest)</div>
            <div style={{ fontSize: '22px', fontWeight: 700 }}>{fmtSec(summary.latestSecondsPerQuestion)}</div>
          </div>
        </div>
      </div>

      {/* trend badges */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <span style={{
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          background: `${trendColor(summary.scoreTrend)}22`,
          color: trendColor(summary.scoreTrend),
        }}>
          Score trend: {trendLabel(summary.scoreTrend)}
        </span>
        {summary.speedTrend != null && (
          <span style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            background: `${trendColor(-summary.speedTrend)}22`,
            color: trendColor(-summary.speedTrend),
          }}>
            Speed: {trendLabel(summary.speedTrend)}s/q · {summary.speedTrend < 0 ? '↑ faster' : summary.speedTrend > 0 ? '↓ slower' : '→ same'}
          </span>
        )}
        <span style={{
          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          background: 'var(--surface2)', color: 'var(--text2)',
        }}>
          Avg accuracy: {fmt1(summary.avgAccuracy)}%
        </span>
      </div>

      {/* charts grid */}
      {h.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>

          {/* Score over time */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>Score over time</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={h} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="testDate" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Score" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy over time */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>Accuracy over time</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={h} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="testDate" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text3)' }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={80} stroke={GREEN} strokeDasharray="4 4" label={{ value: '80%', fill: GREEN, fontSize: 10 }} />
                <Line type="monotone" dataKey="accuracy" name="Accuracy" unit="%" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: GREEN }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Speed over time */}
          {hasSpeed && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>Time per question (seconds)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={h.filter(p => p.secondsPerQuestion != null)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="testDate" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} unit="s" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="secondsPerQuestion" name="Sec/Q" unit="s" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Latest entry pie */}
          {latest && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px' }}>
                Latest breakdown ({fmtDate(latest.testDate)})
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, '']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* history table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Total Qs', 'Attempted', 'Correct', 'Incorrect', 'Unattempted', 'Score', 'Accuracy', 'Time', 'Sec/Q', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...h].reverse().map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtDate(p.testDate)}</td>
                <td style={{ padding: '10px 12px' }}>{p.totalQuestions}</td>
                <td style={{ padding: '10px 12px' }}>{p.attempted}</td>
                <td style={{ padding: '10px 12px', color: GREEN, fontWeight: 600 }}>{p.correct}</td>
                <td style={{ padding: '10px 12px', color: RED, fontWeight: 600 }}>{p.incorrect}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text3)' }}>{p.unattempted}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: ACCENT }}>{fmt1(p.score)}</td>
                <td style={{ padding: '10px 12px', color: p.accuracy >= 80 ? GREEN : p.accuracy >= 60 ? AMBER : RED, fontWeight: 600 }}>
                  {fmt1(p.accuracy)}%
                </td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{p.timeTakenMinutes}m</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtSec(p.secondsPerQuestion)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button
                    onClick={() => onDelete(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '14px', padding: '2px 6px', borderRadius: '4px' }}
                    title="Delete entry"
                  >🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Add entry form ──────────────────────────────────────────────────────────
function AddEntryForm({
  exams,
  onSuccess,
}: {
  exams: Exam[];
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalQuestions, setTotalQuestions] = useState('');
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect] = useState('');
  const [timeTaken, setTimeTaken] = useState('');
  const [error, setError] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', examId],
    queryFn: () => examsApi.getSubjects(examId),
    enabled: !!examId,
  });

  const selectedExam = exams.find(e => e.id === examId);

  useEffect(() => {
    if (subjects.length > 0) setSubjectId(subjects[0].id);
  }, [subjects]);

  // derived preview
  const att = parseInt(attempted) || 0;
  const cor = parseInt(correct) || 0;
  const inc = att - cor;
  const unat = (parseInt(totalQuestions) || 0) - att;
  const score = selectedExam
    ? (cor * selectedExam.correctMarks - inc * selectedExam.negativeMarks).toFixed(2)
    : '—';
  const accuracy = att > 0 ? ((cor / att) * 100).toFixed(1) : '0.0';
  const secPerQ = att > 0 && timeTaken
    ? (parseInt(timeTaken) * 60 / att).toFixed(1)
    : '—';

  const mutation = useMutation({
    mutationFn: sectionalTestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectional-analytics'] });
      showToast('Sectional test entry saved', 'success');
      setAttempted('');
      setCorrect('');
      setTimeTaken('');
      setTotalQuestions('');
      onSuccess();
    },
    onError: (e: any) => {
      const msg = e.message || 'Failed to save';
      setError(msg);
      showToast(msg, 'error');
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const tq = parseInt(totalQuestions);
    const at = parseInt(attempted);
    const cr = parseInt(correct);
    const tm = parseInt(timeTaken);

    if (!examId || !subjectId) { setError('Select exam and subject'); return; }
    if (!tq || tq < 1) { setError('Total questions must be at least 1'); return; }
    if (at < 0 || at > tq) { setError('Attempted must be between 0 and total questions'); return; }
    if (cr < 0 || cr > at) { setError('Correct cannot exceed attempted'); return; }
    if (!tm || tm < 1) { setError('Time taken must be at least 1 minute'); return; }

    mutation.mutate({ examId, subjectId, testDate, totalQuestions: tq, attempted: at, correct: cr, timeTakenMinutes: tm });
  }, [examId, subjectId, testDate, totalQuestions, attempted, correct, timeTaken, mutation]);

  return (
    <div className="card" style={{ maxWidth: '680px' }}>
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '8px', color: RED, fontSize: '13px', marginBottom: '18px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* row 1 — exam + subject */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="input-label">Exam</label>
            <select className="select" value={examId} onChange={e => { setExamId(e.target.value); setSubjectId(''); }}>
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Subject</label>
            <select className="select" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              {subjects.map((s: Subject) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* row 2 — date + total qs + time */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="input-label">Date</label>
            <input type="date" className="input" value={testDate} onChange={e => setTestDate(e.target.value)} max={new Date().toISOString().split('T')[0]} required />
          </div>
          <div>
            <label className="input-label">Total Questions</label>
            <input type="number" className="input" value={totalQuestions} onChange={e => setTotalQuestions(e.target.value)} min="1" placeholder="e.g. 25" required />
          </div>
          <div>
            <label className="input-label">Time Taken (minutes)</label>
            <input type="number" className="input" value={timeTaken} onChange={e => setTimeTaken(e.target.value)} min="1" placeholder="e.g. 20" required />
          </div>
        </div>

        {/* row 3 — attempted + correct */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label className="input-label">Attempted</label>
            <input type="number" className="input" value={attempted} onChange={e => setAttempted(e.target.value)} min="0" placeholder="0" required />
          </div>
          <div>
            <label className="input-label">Correct</label>
            <input type="number" className="input" value={correct} onChange={e => setCorrect(e.target.value)} min="0" placeholder="0" required />
          </div>
        </div>

        {/* marking scheme info */}
        {selectedExam && (
          <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text3)', marginBottom: '20px' }}>
            Marking scheme: <strong style={{ color: GREEN }}>+{selectedExam.correctMarks}</strong> correct · <strong style={{ color: RED }}>−{selectedExam.negativeMarks}</strong> incorrect
          </div>
        )}

        {/* live preview */}
        {(att > 0 || cor > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', padding: '16px', background: 'var(--surface2)', borderRadius: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Incorrect', value: Math.max(0, inc), color: RED },
              { label: 'Unattempted', value: Math.max(0, unat), color: 'var(--text3)' },
              { label: 'Score', value: score, color: ACCENT },
              { label: 'Accuracy', value: `${accuracy}%`, color: cor / Math.max(att, 1) >= 0.8 ? GREEN : cor / Math.max(att, 1) >= 0.6 ? AMBER : RED },
              { label: 'Sec / Question', value: secPerQ === '—' ? '—' : `${secPerQ}s`, color: 'var(--text)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export const SectionalTests = () => {
  const [tab, setTab] = useState<Tab>('history');
  const [selectedExamId, setSelectedExamId] = useState('');
  const queryClient = useQueryClient();

  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAllOrdered,
  });

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) setSelectedExamId(exams[0].id);
  }, [exams, selectedExamId]);

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['sectional-analytics', selectedExamId],
    queryFn: () => sectionalTestsApi.getAnalytics(selectedExamId),
    enabled: !!selectedExamId && tab === 'history',
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: sectionalTestsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sectional-analytics'] });
    },
  });

  const handleDelete = useCallback((id: string) => {
    if (window.confirm('Delete this entry?')) deleteMutation.mutate(id);
  }, [deleteMutation]);

  if (examsLoading) {
    return (
      <DashboardLayout>
        <div className="empty-state"><div className="empty-icon">⏳</div><div className="empty-title">Loading…</div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Sectional Tests</h1>
        <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
          Track your single-subject practice sessions — score, accuracy and speed over time
        </p>
      </div>

      {/* top bar — tabs + exam selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="tabs">
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📈 History & Analytics</button>
          <button className={`tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>➕ Add Entry</button>
        </div>

        {tab === 'history' && exams.length > 0 && (
          <select className="select" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
            {exams.map((ex: Exam) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        )}
      </div>

      {/* ── ADD TAB ── */}
      {tab === 'add' && (
        <AddEntryForm exams={exams} onSuccess={() => setTab('history')} />
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <>
          {analyticsLoading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div><div className="empty-title">Loading analytics…</div></div>
          ) : !analytics || analytics.subjects.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <div className="empty-title">No sectional test entries yet</div>
                <div className="empty-sub">Switch to "Add Entry" and log your first session</div>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setTab('add')}>
                  Add your first entry
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* overview bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                {[
                  { label: 'Subjects tracked', value: analytics.subjects.length, color: ACCENT },
                  { label: 'Total entries', value: analytics.subjects.reduce((s, x) => s + x.totalEntries, 0), color: 'var(--text)' },
                  { label: 'Best subject', value: [...analytics.subjects].sort((a, b) => b.latestAccuracy - a.latestAccuracy)[0]?.subjectName ?? '—', color: GREEN },
                  { label: 'Needs work', value: [...analytics.subjects].sort((a, b) => a.latestAccuracy - b.latestAccuracy)[0]?.subjectName ?? '—', color: RED },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* per-subject panels */}
              {analytics.subjects.map(summary => (
                <SubjectHistoryPanel key={summary.subjectId} summary={summary} onDelete={handleDelete} />
              ))}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default SectionalTests;
