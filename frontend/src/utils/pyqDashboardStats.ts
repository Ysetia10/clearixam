import type {
  RecentPyqAttempt,
  PyqTopicPerformanceItem,
} from '../api/papers';
import type {
  AdaptiveStrengthResponse,
  AttemptAccuracyInsightDTO,
  ImprovementDTO,
  InsightsResponse,
  WeakSubject,
} from '../api/analytics';

export type PyqDashboardOverview = {
  averageScore: number;
  movingAverage: number;
  accuracyPercent: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  consistencyScore: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
  weakSubjects: WeakSubject[];
  performanceChange: number;
  attemptCount: number;
  goalProgress: {
    goalProgressPercent: number;
    daysRemaining: number;
    onTrack: boolean;
    currentScore: number;
    targetScore: number;
  } | null;
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = avg(nums);
  return Math.sqrt(avg(nums.map((n) => (n - m) ** 2)));
}

/** Chronological oldest→newest for charts; input may be newest-first. */
function chronological(attempts: RecentPyqAttempt[]): RecentPyqAttempt[] {
  return [...attempts]
    .filter((a) => a.submittedAt)
    .sort((a, b) => new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime());
}

export function buildPyqTrend(attempts: RecentPyqAttempt[]) {
  const ordered = chronological(attempts);
  return ordered.map((a, i) => {
    const window = ordered.slice(Math.max(0, i - 2), i + 1).map((x) => x.totalScore);
    return {
      date: new Date(a.submittedAt!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      score: parseFloat(a.totalScore.toFixed(2)),
      avg: parseFloat(avg(window).toFixed(2)),
    };
  });
}

export function buildPyqImprovement(attempts: RecentPyqAttempt[]): ImprovementDTO | null {
  const newestFirst = [...attempts]
    .filter((a) => a.submittedAt)
    .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime());
  if (newestFirst.length < 2) return null;

  const last5 = newestFirst.slice(0, 5).map((a) => a.totalScore);
  const prev5 = newestFirst.slice(5, 10).map((a) => a.totalScore);
  const last5Avg = avg(last5);
  const prev5Avg = prev5.length ? avg(prev5) : last5Avg;
  const improvementRate = last5Avg - prev5Avg;
  const trend =
    improvementRate > 2 ? 'IMPROVING' : improvementRate < -2 ? 'DECLINING' : 'STABLE';

  return {
    improvementRate,
    trend,
    last5Avg,
    prev5Avg,
  };
}

export function buildPyqAttemptInsight(attempts: RecentPyqAttempt[]): AttemptAccuracyInsightDTO | null {
  const usable = attempts.filter((a) => a.questionCount > 0);
  if (usable.length < 2) return null;

  const withRate = usable.map((a) => {
    const attempted = a.correctCount + a.incorrectCount;
    const attemptRate = (attempted / a.questionCount) * 100;
    const accuracy = attempted > 0 ? (a.correctCount / attempted) * 100 : 0;
    return { attemptRate, accuracy };
  });
  const medianRate = [...withRate].sort((a, b) => a.attemptRate - b.attemptRate)[
    Math.floor(withRate.length / 2)
  ]?.attemptRate ?? 50;
  const high = withRate.filter((x) => x.attemptRate >= medianRate);
  const low = withRate.filter((x) => x.attemptRate < medianRate);
  if (!high.length || !low.length) return null;

  const highAttemptAccuracy = avg(high.map((x) => x.accuracy));
  const lowAttemptAccuracy = avg(low.map((x) => x.accuracy));
  const highAttemptAvgRate = avg(high.map((x) => x.attemptRate));
  const lowAttemptAvgRate = avg(low.map((x) => x.attemptRate));
  const diff = highAttemptAccuracy - lowAttemptAccuracy;
  const trend = diff > 3 ? 'POSITIVE' : diff < -3 ? 'NEGATIVE' : 'NEUTRAL';
  const insight =
    trend === 'POSITIVE'
      ? 'On PYQs, higher attempt rates correlate with better accuracy — keep attempting confidently.'
      : trend === 'NEGATIVE'
        ? 'On PYQs, over-attempting is hurting accuracy — be more selective on uncertain questions.'
        : 'Attempt rate and accuracy look balanced across your recent PYQs.';

  return {
    trend,
    highAttemptAccuracy,
    lowAttemptAccuracy,
    highAttemptAvgRate,
    lowAttemptAvgRate,
    insight,
  };
}

export function buildPyqAdaptiveStrength(
  topics: PyqTopicPerformanceItem[]
): AdaptiveStrengthResponse | null {
  if (!topics.length) return null;
  const bySubject = new Map<string, { correct: number; total: number }>();
  for (const t of topics) {
    const cur = bySubject.get(t.subject) || { correct: 0, total: 0 };
    cur.correct += t.correct;
    cur.total += t.total;
    bySubject.set(t.subject, cur);
  }
  const subjects = [...bySubject.entries()].map(([subjectName, v]) => ({
    subjectName,
    accuracy: v.total ? (v.correct / v.total) * 100 : 0,
  }));
  if (!subjects.length) return null;
  const overallAccuracy = avg(subjects.map((s) => s.accuracy));
  return {
    overallAccuracy,
    subjects: subjects
      .map((s) => {
        const relativeScore = s.accuracy - overallAccuracy;
        const status =
          relativeScore <= -12
            ? 'WEAK'
            : relativeScore <= -4
              ? 'BELOW_AVERAGE'
              : relativeScore >= 8
                ? 'STRONG'
                : 'AVERAGE';
        return { ...s, relativeScore, status: status as AdaptiveStrengthResponse['subjects'][0]['status'] };
      })
      .sort((a, b) => a.accuracy - b.accuracy),
  };
}

export function buildPyqWeakSubjects(topics: PyqTopicPerformanceItem[]): WeakSubject[] {
  const bySubject = new Map<string, { correct: number; total: number }>();
  for (const t of topics) {
    const cur = bySubject.get(t.subject) || { correct: 0, total: 0 };
    cur.correct += t.correct;
    cur.total += t.total;
    bySubject.set(t.subject, cur);
  }
  return [...bySubject.entries()]
    .map(([subjectName, v]) => ({
      subjectName,
      accuracy: v.total ? (v.correct / v.total) * 100 : 0,
    }))
    .filter((s) => s.accuracy < 80 && s.accuracy > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
}

export function buildPyqOverview(
  attempts: RecentPyqAttempt[],
  topics: PyqTopicPerformanceItem[],
  options?: {
    maxMarks?: number;
    goal?: { targetScore: number; targetDate?: string | null } | null;
  }
): PyqDashboardOverview {
  const newestFirst = [...attempts]
    .filter((a) => a.submittedAt)
    .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime());

  const scores = newestFirst.map((a) => a.totalScore);
  const averageScore = avg(scores);
  const movingAverage = avg(scores.slice(0, 3));
  const last5 = avg(scores.slice(0, 5));
  const prev5 = avg(scores.slice(5, 10));
  const performanceChange = scores.length >= 2 ? last5 - (scores.length >= 6 ? prev5 : scores[scores.length - 1]) : 0;

  const totals = newestFirst.reduce(
    (acc, a) => {
      acc.correct += a.correctCount;
      acc.incorrect += a.incorrectCount;
      acc.unattempted += a.unattemptedCount;
      acc.questions += a.questionCount;
      return acc;
    },
    { correct: 0, incorrect: 0, unattempted: 0, questions: 0 }
  );
  const accuracyPercent = totals.questions
    ? (totals.correct / totals.questions) * 100
    : 0;

  const maxMarks = options?.maxMarks || 0;
  const pctOfMax = maxMarks > 0 ? (movingAverage / maxMarks) * 100 : accuracyPercent;
  const riskLevel: PyqDashboardOverview['riskLevel'] =
    pctOfMax >= 55 ? 'LOW' : pctOfMax >= 40 ? 'MEDIUM' : 'HIGH';

  const recentScores = scores.slice(0, 5);
  const consistencyScore: PyqDashboardOverview['consistencyScore'] =
    recentScores.length < 3
      ? 'INSUFFICIENT_DATA'
      : stdev(recentScores) <= 8
        ? 'HIGH'
        : stdev(recentScores) <= 18
          ? 'MODERATE'
          : 'LOW';

  let goalProgress: PyqDashboardOverview['goalProgress'] = null;
  const goal = options?.goal;
  if (goal && goal.targetScore > 0) {
    const currentScore = movingAverage || averageScore;
    const goalProgressPercent = Math.min(100, (currentScore / goal.targetScore) * 100);
    let daysRemaining = 0;
    if (goal.targetDate) {
      daysRemaining = Math.max(
        0,
        Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
    }
    goalProgress = {
      goalProgressPercent,
      daysRemaining,
      onTrack: goalProgressPercent >= 70 || currentScore >= goal.targetScore * 0.85,
      currentScore,
      targetScore: goal.targetScore,
    };
  }

  return {
    averageScore,
    movingAverage,
    accuracyPercent,
    riskLevel,
    consistencyScore: consistencyScore === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : consistencyScore,
    weakSubjects: buildPyqWeakSubjects(topics),
    performanceChange,
    attemptCount: newestFirst.length,
    goalProgress,
  };
}

export function buildPyqInsights(
  overview: PyqDashboardOverview,
  improvement: ImprovementDTO | null
): InsightsResponse {
  const insights: InsightsResponse['insights'] = [];
  if (overview.attemptCount === 0) {
    return { insights: [{ type: 'INFO', message: 'Take a PYQ paper to unlock score trends and topic insights.' }] };
  }
  if (improvement && improvement.trend === 'IMPROVING') {
    insights.push({
      type: 'SUCCESS',
      message: `PYQ scores are up ${improvement.improvementRate.toFixed(1)} points vs your earlier average.`,
    });
  } else if (improvement && improvement.trend === 'DECLINING') {
    insights.push({
      type: 'WARNING',
      message: `PYQ scores dipped ${Math.abs(improvement.improvementRate).toFixed(1)} points recently. Review weak topics.`,
    });
  }
  if (overview.weakSubjects[0]) {
    insights.push({
      type: 'WARNING',
      message: `${overview.weakSubjects[0].subjectName} needs focus on PYQs (${overview.weakSubjects[0].accuracy.toFixed(1)}% accuracy).`,
    });
  } else if (overview.averageScore > 0) {
    insights.push({ type: 'SUCCESS', message: 'No weak PYQ subjects below 80% accuracy. Keep the consistency going!' });
  }
  if (overview.accuracyPercent > 0 && overview.accuracyPercent < 50) {
    insights.push({
      type: 'INFO',
      message: `Overall PYQ accuracy is ${overview.accuracyPercent.toFixed(1)}%. Prioritize accuracy over speed on weak sections.`,
    });
  }
  return { insights: insights.slice(0, 4) };
}
