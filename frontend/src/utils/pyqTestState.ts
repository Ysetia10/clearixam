import type { CSSProperties } from 'react';

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

export function paletteStyle(status: QuestionStatus, active: boolean): CSSProperties {
  const base: CSSProperties = {
    height: 32,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    color: 'var(--text)',
    boxSizing: 'border-box',
  };

  switch (status) {
    case 'not-visited':
      return {
        ...base,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: 'var(--surface2)',
      };
    case 'not-answered':
      return {
        ...base,
        border: `2px solid ${active ? 'var(--accent)' : 'var(--red)'}`,
        background: 'var(--red-glow)',
      };
    case 'answered':
      return {
        ...base,
        border: `2px solid ${active ? 'var(--accent)' : 'var(--green)'}`,
        background: 'var(--green-glow)',
      };
    case 'marked':
      return {
        ...base,
        border: `2px solid ${active ? 'var(--accent)' : '#a855f7'}`,
        background: 'rgba(168, 85, 247, 0.18)',
      };
    case 'answered-marked':
      return {
        ...base,
        border: `2px solid ${active ? 'var(--accent)' : '#a855f7'}`,
        background: 'var(--green-glow)',
        boxShadow: 'inset 0 0 0 1px #a855f7',
      };
  }
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
