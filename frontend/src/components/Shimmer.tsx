import type { CSSProperties } from 'react';
import { DashboardLayout } from './layout/DashboardLayout';

type ShimmerProps = {
  width?: string | number;
  height?: string | number;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
};

/** Single shimmer bone — use to compose page skeletons that match real layout. */
export function Shimmer({ width = '100%', height = 14, radius = 8, className = '', style }: ShimmerProps) {
  return (
    <div
      className={`shimmer ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

export function ShimmerLines({
  lines = 3,
  lastWidth = '65%',
}: {
  lines?: number;
  lastWidth?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} height={12} width={i === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  );
}

/** Dashboard: header + stat cards + chart + activity list */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <Shimmer width={160} height={28} />
          <Shimmer width={220} height={12} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Shimmer width={140} height={40} radius={10} />
          <Shimmer width={100} height={40} radius={10} />
          <Shimmer width={120} height={40} radius={10} />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <Shimmer width="40%" height={11} style={{ marginBottom: 14 }} />
            <Shimmer width="55%" height={28} />
            <Shimmer width="30%" height={10} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <Shimmer width="50%" height={11} style={{ marginBottom: 12 }} />
            <Shimmer width={90} height={24} radius={999} />
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <Shimmer width={180} height={16} style={{ marginBottom: 20 }} />
        <Shimmer height={220} radius={12} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <Shimmer width={140} height={16} style={{ marginBottom: 16 }} />
        <div style={{ display: 'grid', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                <Shimmer width="70%" height={13} />
                <Shimmer width="40%" height={10} />
              </div>
              <Shimmer width={56} height={24} radius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** PYQ paper card grid */
export function PapersGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading papers"
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <Shimmer width="75%" height={18} />
          <Shimmer width="45%" height={12} />
          <Shimmer height={40} radius={8} style={{ marginTop: 4 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Shimmer width="48%" height={36} radius={8} />
            <Shimmer width="48%" height={36} radius={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table-style history list */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '110px 1fr 110px 110px 100px 110px 110px', gap: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Shimmer key={i} height={10} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: '14px 16px',
            borderBottom: i === rows - 1 ? 'none' : '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '110px 1fr 110px 110px 100px 110px 110px',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Shimmer height={12} />
          <Shimmer height={12} width="70%" />
          <Shimmer height={12} />
          <Shimmer height={12} />
          <Shimmer height={12} />
          <Shimmer height={20} radius={999} />
          <Shimmer height={28} radius={8} />
        </div>
      ))}
    </div>
  );
}

/** Subject analytics cards */
export function AnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading analytics">
      <div style={{ marginBottom: 32, display: 'grid', gap: 8 }}>
        <Shimmer width={200} height={28} />
        <Shimmer width={260} height={12} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Shimmer width={72} height={36} radius={999} />
          <Shimmer width={110} height={36} radius={999} />
          <Shimmer width={120} height={36} radius={999} />
        </div>
        <Shimmer width={140} height={40} radius={10} />
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Shimmer width="35%" height={16} />
              <Shimmer width={80} height={22} radius={999} />
            </div>
            <Shimmer height={8} radius={999} />
            <div style={{ display: 'flex', gap: 16 }}>
              <Shimmer width={80} height={12} />
              <Shimmer width={80} height={12} />
              <Shimmer width={80} height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Topic performance page */
export function TopicPerformanceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading topic performance" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'grid', gap: 8 }}>
        <Shimmer width={240} height={28} />
        <Shimmer width={300} height={12} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Shimmer width={140} height={40} radius={10} />
        <Shimmer width={160} height={40} radius={10} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <Shimmer width="40%" height={16} />
            <Shimmer width={64} height={16} />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <Shimmer width="55%" height={12} />
                <Shimmer width={72} height={12} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Inline list of question cards (drill / corrections) */
export function QuestionListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" style={{ display: 'grid', gap: 12, padding: '8px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: 14, borderLeft: '3px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Shimmer width={100} height={12} />
            <Shimmer width={70} height={20} radius={999} />
          </div>
          <ShimmerLines lines={3} />
        </div>
      ))}
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <DashboardLayout>
      <div aria-busy="true" aria-label="Loading result">
        <Shimmer width={180} height={28} style={{ marginBottom: 8 }} />
        <Shimmer width={260} height={12} style={{ marginBottom: 24 }} />
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            marginBottom: 24,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
              <Shimmer width="50%" height={10} style={{ margin: '0 auto 10px' }} />
              <Shimmer width="40%" height={24} style={{ margin: '0 auto' }} />
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <Shimmer width={140} height={16} style={{ marginBottom: 16 }} />
          <div style={{ display: 'grid', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} height={40} radius={8} />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AnalyzeSkeleton() {
  return (
    <DashboardLayout>
      <div aria-busy="true" aria-label="Loading analysis">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <Shimmer width={120} height={28} />
            <Shimmer width={280} height={12} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Shimmer width={100} height={36} radius={8} />
            <Shimmer width={120} height={36} radius={8} />
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            marginBottom: 20,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 16 }}>
              <Shimmer width="45%" height={10} style={{ marginBottom: 10 }} />
              <Shimmer width="35%" height={22} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} width={100} height={34} radius={999} />
          ))}
        </div>
        <QuestionListSkeleton count={5} />
      </div>
    </DashboardLayout>
  );
}

/** Full-page CAT/SSC exam shell shimmer */
export function TakeTestSkeleton() {
  return (
    <div className="tt-exam-skel" aria-busy="true" aria-label="Loading test">
      <div className="tt-exam-skel-top">
        <Shimmer width={220} height={16} radius={4} style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Shimmer width={120} height={28} radius={4} style={{ background: 'rgba(255,255,255,0.12)' }} />
          <Shimmer width={120} height={28} radius={4} style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>
      </div>
      <div className="tt-exam-skel-tabs">
        <Shimmer width={220} height={36} radius={0} />
        <Shimmer width={240} height={36} radius={0} />
        <Shimmer width={180} height={36} radius={0} />
      </div>
      <div className="tt-exam-skel-time">
        <Shimmer width={200} height={12} />
        <Shimmer width={120} height={12} />
      </div>
      <div className="tt-exam-skel-body">
        <div className="tt-exam-skel-main">
          <div className="tt-exam-skel-q">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Shimmer width={110} height={14} />
              <Shimmer width={200} height={12} />
            </div>
            <ShimmerLines lines={4} />
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} height={40} radius={4} />
              ))}
            </div>
          </div>
          <div className="tt-exam-skel-foot">
            <div style={{ display: 'flex', gap: 8 }}>
              <Shimmer width={160} height={36} radius={4} />
              <Shimmer width={120} height={36} radius={4} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Shimmer width={90} height={36} radius={4} />
              <Shimmer width={110} height={36} radius={4} />
              <Shimmer width={90} height={36} radius={4} />
            </div>
          </div>
        </div>
        <aside className="tt-exam-skel-aside">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <Shimmer width={40} height={40} radius="50%" />
            <Shimmer width={100} height={14} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Shimmer width={18} height={18} radius={4} />
                <Shimmer width="70%" height={10} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <Shimmer key={i} height={34} radius={4} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Generic in-layout page fallback for Suspense */
export function PageSkeleton({ variant = 'dashboard' }: { variant?: 'dashboard' | 'papers' | 'table' | 'analytics' | 'topic' }) {
  const body =
    variant === 'papers' ? (
      <PapersGridSkeleton />
    ) : variant === 'table' ? (
      <TableSkeleton />
    ) : variant === 'analytics' ? (
      <AnalyticsSkeleton />
    ) : variant === 'topic' ? (
      <TopicPerformanceSkeleton />
    ) : (
      <DashboardSkeleton />
    );

  return <DashboardLayout>{body}</DashboardLayout>;
}

/** Route-aware Suspense fallback */
export function AppPageLoader({ pathname }: { pathname: string }) {
  if (pathname.startsWith('/take-test')) return <TakeTestSkeleton />;
  if (pathname.startsWith('/test-result')) return <ResultSkeleton />;
  if (pathname.startsWith('/pyq-analyze')) return <AnalyzeSkeleton />;
  if (pathname.startsWith('/pyq-tests')) return <PageSkeleton variant="papers" />;
  if (pathname.startsWith('/performance-history') || pathname.startsWith('/sectional-tests')) {
    return <PageSkeleton variant="table" />;
  }
  if (pathname.startsWith('/subject-analytics')) return <PageSkeleton variant="analytics" />;
  if (pathname.startsWith('/topic-performance')) return <PageSkeleton variant="topic" />;
  if (pathname.startsWith('/add-mock')) {
    return (
      <DashboardLayout>
        <div aria-busy="true" style={{ maxWidth: 720 }}>
          <Shimmer width={160} height={28} style={{ marginBottom: 8 }} />
          <Shimmer width={240} height={12} style={{ marginBottom: 24 }} />
          <div className="card" style={{ padding: 24, display: 'grid', gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Shimmer width={100} height={11} style={{ marginBottom: 8 }} />
                <Shimmer height={40} radius={8} />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }
  return <PageSkeleton variant="dashboard" />;
}
