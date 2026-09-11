import type { CSSProperties, ReactNode } from 'react';
import { createElement } from 'react';

export type QuestionStatus =
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked'
  | 'answered-marked';

/** Legacy CAT default; prefer sections derived from the paper. */
export const CAT_SECTION_ORDER = ['VARC', 'DILR', 'QA'] as const;
export const SECTION_ORDER = CAT_SECTION_ORDER;
export type SectionCode = string;

export type PaperSectionMeta = {
  code: string;
  name: string;
  qFrom: number;
  qTo: number;
  durationMinutes: number;
};

export function sectionsFromPaper(paper: {
  sections?: PaperSectionMeta[];
  questions: { sectionCode: string; section: string; qNo: number }[];
  sectionDurationMinutes?: number | null;
}): PaperSectionMeta[] {
  if (paper.sections && paper.sections.length > 0) {
    return paper.sections;
  }
  const duration = paper.sectionDurationMinutes ?? 15;
  const order: PaperSectionMeta[] = [];
  const seen = new Set<string>();
  for (const q of paper.questions) {
    if (seen.has(q.sectionCode)) continue;
    seen.add(q.sectionCode);
    const nos = paper.questions.filter((x) => x.sectionCode === q.sectionCode).map((x) => x.qNo);
    order.push({
      code: q.sectionCode,
      name: q.section,
      qFrom: Math.min(...nos),
      qTo: Math.max(...nos),
      durationMinutes: duration,
    });
  }
  return order;
}

export function getQuestionStatus(
  qNo: number,
  visited: ReadonlySet<number>,
  marked: ReadonlySet<number>,
  answers: Record<string, string>
): QuestionStatus {
  const key = String(qNo);
  const hasAnswer = Boolean(answers[key]?.trim());
  const isVisited = visited.has(qNo);
  const isMarked = marked.has(qNo);

  if (!isVisited) return 'not-visited';
  if (hasAnswer && isMarked) return 'answered-marked';
  if (hasAnswer) return 'answered';
  if (isMarked) return 'marked';
  return 'not-answered';
}

/** CAT-style palette colors (light exam chrome). */
export const CAT_STATUS_COLORS = {
  answered: '#4caf50',
  notAnswered: '#e53935',
  notVisited: '#9e9e9e',
  marked: '#673ab7',
  answeredMarked: '#673ab7',
  accent: '#1a5fb4',
  accentSoft: '#2a6ebb',
} as const;

export function paletteClass(status: QuestionStatus): string {
  switch (status) {
    case 'answered':
      return 'tt-pal tt-pal-answered';
    case 'not-answered':
      return 'tt-pal tt-pal-not-answered';
    case 'not-visited':
      return 'tt-pal tt-pal-not-visited';
    case 'marked':
      return 'tt-pal tt-pal-marked';
    case 'answered-marked':
      return 'tt-pal tt-pal-answered-marked';
  }
}

/** @deprecated Prefer paletteClass + CSS shapes; kept for callers expecting inline styles. */
export function paletteStyle(status: QuestionStatus, active: boolean): CSSProperties {
  const base: CSSProperties = {
    height: 32,
    fontSize: 12,
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    color: '#fff',
    boxSizing: 'border-box',
    border: active ? '2px solid #111' : 'none',
  };

  switch (status) {
    case 'not-visited':
      return { ...base, color: '#333', background: '#e0e0e0', borderRadius: 2 };
    case 'not-answered':
      return {
        ...base,
        background: CAT_STATUS_COLORS.notAnswered,
        clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
        borderRadius: 0,
      };
    case 'answered':
      return {
        ...base,
        background: CAT_STATUS_COLORS.answered,
        clipPath: 'polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)',
        borderRadius: 0,
      };
    case 'marked':
      return { ...base, background: CAT_STATUS_COLORS.marked, borderRadius: '50%' };
    case 'answered-marked':
      return { ...base, background: CAT_STATUS_COLORS.marked, borderRadius: '50%' };
  }
}

export function StatusLegendIcon({ status }: { status: QuestionStatus }): ReactNode {
  return createElement('span', {
    className: `${paletteClass(status)} tt-pal-legend`,
    'aria-hidden': true,
  });
}

export function countByStatus(
  questionNos: number[],
  visited: ReadonlySet<number>,
  marked: ReadonlySet<number>,
  answers: Record<string, string>
) {
  const counts = {
    notVisited: 0,
    notAnswered: 0,
    answered: 0,
    marked: 0,
    answeredMarked: 0,
  };

  for (const qNo of questionNos) {
    const status = getQuestionStatus(qNo, visited, marked, answers);
    if (status === 'not-visited') counts.notVisited += 1;
    else if (status === 'not-answered') counts.notAnswered += 1;
    else if (status === 'answered') counts.answered += 1;
    else if (status === 'marked') counts.marked += 1;
    else counts.answeredMarked += 1;
  }

  return counts;
}
