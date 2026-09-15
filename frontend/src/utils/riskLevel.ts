export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RiskBasis = 'cutoff' | 'goal' | 'benchmark' | 'insufficient';

export type RiskAssessment = {
  level: RiskLevel;
  movingAverage: number;
  referenceScore: number;
  gap: number;
  basis: RiskBasis;
  basisLabel: string;
  summary: string;
};

/** Same rule as backend PerformanceCalculator: gap = movingAvg − reference. */
export function assessRiskLevel(
  movingAverage: number,
  referenceScore: number | null | undefined,
  basis: Exclude<RiskBasis, 'insufficient'> = 'benchmark'
): RiskAssessment {
  if (!movingAverage || movingAverage <= 0 || referenceScore == null || referenceScore <= 0) {
    return {
      level: 'HIGH',
      movingAverage: movingAverage || 0,
      referenceScore: referenceScore || 0,
      gap: 0,
      basis: 'insufficient',
      basisLabel: 'Insufficient data',
      summary:
        'Risk needs a 3-attempt moving average and a reference score (mock cutoff, goal, or exam benchmark).',
    };
  }

  const gap = movingAverage - referenceScore;
  const level: RiskLevel = gap < 0 ? 'HIGH' : gap <= 5 ? 'MEDIUM' : 'LOW';
  const basisLabel =
    basis === 'cutoff'
      ? 'latest mock cutoff'
      : basis === 'goal'
        ? 'your goal target'
        : '60% of exam max marks';

  const summary =
    level === 'HIGH'
      ? `Moving avg ${movingAverage.toFixed(1)} is ${Math.abs(gap).toFixed(1)} below ${basisLabel} (${referenceScore.toFixed(1)}).`
      : level === 'MEDIUM'
        ? `Moving avg ${movingAverage.toFixed(1)} is within 5 marks of ${basisLabel} (${referenceScore.toFixed(1)}).`
        : `Moving avg ${movingAverage.toFixed(1)} is ${gap.toFixed(1)} above ${basisLabel} (${referenceScore.toFixed(1)}).`;

  return {
    level,
    movingAverage,
    referenceScore,
    gap,
    basis,
    basisLabel,
    summary,
  };
}

export function pyqRiskReference(options: {
  maxMarks?: number;
  goalTarget?: number | null;
}): { reference: number | null; basis: Exclude<RiskBasis, 'insufficient'> } {
  if (options.goalTarget != null && options.goalTarget > 0) {
    return { reference: options.goalTarget, basis: 'goal' };
  }
  if (options.maxMarks != null && options.maxMarks > 0) {
    return { reference: options.maxMarks * 0.6, basis: 'benchmark' };
  }
  return { reference: null, basis: 'benchmark' };
}

export function riskTooltipText(risk: RiskAssessment): string {
  if (risk.basis === 'insufficient') return risk.summary;
  return [
    'Risk = 3-attempt moving average vs reference score.',
    `Reference: ${risk.basisLabel} (${risk.referenceScore.toFixed(1)}).`,
    `Gap: ${risk.gap >= 0 ? '+' : ''}${risk.gap.toFixed(1)}.`,
    'HIGH: below reference · MEDIUM: 0–5 above · LOW: more than 5 above.',
    risk.summary,
  ].join(' ');
}
