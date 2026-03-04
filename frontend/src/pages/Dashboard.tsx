import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  Speed,
  Warning,
  CheckCircle,
  Visibility,
  TrendingDown,
  Download,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { analyticsApi } from '../api/analytics';
import { mocksApi } from '../api/mocks';
import { reportsApi } from '../api/reports';
import { GoalProgressCard } from '../components/GoalProgressCard';
import { GoalSettingDialog } from '../components/GoalSettingDialog';
import { MockDetailDialog } from '../components/MockDetailDialog';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { TrendBadge } from '../components/TrendBadge';
import { InsightCard } from '../components/InsightCard';
import { ExamReadinessWidget } from '../components/ExamReadinessWidget';
import { ExamSwitcher } from '../components/ExamSwitcher';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [mockDetailOpen, setMockDetailOpen] = useState(false);
  const [currentExamId, setCurrentExamId] = useState<string>('');

  const downloadReportMutation = useMutation({
    mutationFn: reportsApi.downloadPerformanceReport,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `Clearixam_Report_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsApi.getOverview,
    staleTime: 30000,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: analyticsApi.getTrend,
    staleTime: 30000,
  });

  const { data: mocks, isLoading: mocksLoading } = useQuery({
    queryKey: ['mocks'],
    queryFn: () => mocksApi.list(0, 10),
    staleTime: 30000,
  });

  const { data: mockDetail } = useQuery({
    queryKey: ['mock-detail', selectedMockId],
    queryFn: () => mocksApi.getDetail(selectedMockId!),
    enabled: !!selectedMockId && mockDetailOpen,
  });

  // Generate insights based on analytics data
  const insights = useMemo(() => {
    if (!overview) return [];
    
    const insightList = [];

    // Performance trend insight
    if (overview.performanceChange !== undefined) {
      if (overview.performanceChange > 3) {
        insightList.push({
          type: 'success' as const,
          icon: 'trending' as const,
          message: `Performance improving steadily (+${overview.performanceChange.toFixed(1)}% from last cycle)`,
        });
      } else if (overview.performanceChange < -3) {
        insightList.push({
          type: 'warning' as const,
          icon: 'warning' as const,
          message: `Performance declined ${overview.performanceChange.toFixed(1)}% recently. Review weak subjects.`,
        });
      }
    }

    // Weak subjects insight
    if (overview.weakSubjects && overview.weakSubjects.length > 0) {
      const weakestSubject = overview.weakSubjects[0];
      insightList.push({
        type: 'warning' as const,
        icon: 'warning' as const,
        message: `${weakestSubject.subjectName} accuracy at ${weakestSubject.accuracy.toFixed(1)}%. Focus needed.`,
      });
    }

    // Goal progress insight
    if (overview.goalProgress) {
      insightList.push({
        type: 'goal' as const,
        icon: 'goal' as const,
        message: `You are ${overview.goalProgress.goalProgressPercent.toFixed(0)}% toward your target of ${overview.goalProgress.targetScore.toFixed(2)}`,
      });
    }

    // Consistency insight
    if (overview.consistencyScore) {
      if (overview.consistencyScore === 'HIGH') {
        insightList.push({
          type: 'success' as const,
          icon: 'stable' as const,
          message: 'Consistency level: Stable. Excellent performance stability.',
        });
      } else if (overview.consistencyScore === 'LOW') {
        insightList.push({
          type: 'info' as const,
          icon: 'warning' as const,
          message: 'Performance varies significantly. Aim for more consistent scores.',
        });
      }
    }

    // No weak subjects celebration
    if (!overview.weakSubjects || overview.weakSubjects.length === 0) {
      insightList.push({
        type: 'success' as const,
        icon: 'check' as const,
        message: 'No weak subjects detected. Great job maintaining strong performance!',
      });
    }

    return insightList.slice(0, 4); // Limit to 4 insights
  }, [overview]);

  const isLoading = overviewLoading || trendLoading || mocksLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 75) return 'success';
    if (prob >= 50) return 'warning';
    return 'error';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'LOW') return 'success';
    if (risk === 'MEDIUM') return 'warning';
    return 'error';
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <ExamSwitcher currentExamId={currentExamId} onExamChange={setCurrentExamId} />
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/add-performance')}
            >
              + Add Performance
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/performance-history')}
            >
              View History
            </Button>
            
            <Tooltip title="Download Performance Report">
              <IconButton
                color="primary"
                onClick={() => downloadReportMutation.mutate()}
                disabled={downloadReportMutation.isPending}
                size="small"
              >
                <Download />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Exam Readiness Widget */}
        <Box sx={{ mb: 2 }}>
          <ExamReadinessWidget />
        </Box>

        {/* Performance Insights */}
        {insights.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <InsightCard insights={insights} />
          </Box>
        )}

        {/* KPI Cards - Compact Grid */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Assessment color="primary" sx={{ mr: 0.5, fontSize: '1.125rem' }} />
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h5" fontWeight="bold">
                    {overview?.averageScore.toFixed(2)}
                  </Typography>
                  {overview?.improvementRate !== undefined && overview.improvementRate !== 0 && (
                    <TrendBadge value={overview.improvementRate} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <TrendingUp color="primary" sx={{ mr: 0.5, fontSize: '1.125rem' }} />
                  <Typography variant="body2" color="text.secondary">
                    Moving Average
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold">
                  {overview?.movingAverage.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Speed color="primary" sx={{ mr: 0.5, fontSize: '1.125rem' }} />
                  <Typography variant="body2" color="text.secondary">
                    Probability
                  </Typography>
                </Box>
                <Chip
                  label={`${overview?.probability}%`}
                  color={getProbabilityColor(overview?.probability || 0)}
                  sx={{ fontSize: '1.125rem', height: 32, fontWeight: 'bold' }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Warning color="primary" sx={{ mr: 0.5, fontSize: '1.125rem' }} />
                  <Typography variant="body2" color="text.secondary">
                    Risk Level
                  </Typography>
                </Box>
                <Chip
                  label={overview?.riskLevel}
                  color={getRiskColor(overview?.riskLevel || 'HIGH')}
                  sx={{ fontSize: '1rem', height: 32, fontWeight: 'bold' }}
                />
              </CardContent>
            </Card>
          </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Performance Stability
              </Typography>
              <Chip
                label={overview?.consistencyScore || 'N/A'}
                size="small"
                color={
                  overview?.consistencyScore === 'HIGH' ? 'success' :
                  overview?.consistencyScore === 'MODERATE' ? 'warning' : 'default'
                }
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={6}>
          <Card sx={{ p: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Attempt Strategy
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                {overview?.recommendedAttemptRange}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {overview?.strategyNote}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recent Trend
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {overview && overview.performanceChange >= 0 ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={overview && overview.performanceChange >= 0 ? 'success.main' : 'error.main'}
                >
                  {overview && overview.performanceChange >= 0 ? '+' : ''}
                  {overview?.performanceChange?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                vs previous 5 mocks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {overview?.goalProgress && (
          <Grid item xs={12} md={8}>
            <GoalProgressCard
              goalProgress={overview.goalProgress}
              onSetGoal={() => setGoalDialogOpen(true)}
            />
          </Grid>
        )}

        {!overview?.goalProgress && (
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Set a Goal
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Track your progress toward a target score
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setGoalDialogOpen(true)}
                >
                  Create Goal
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Performance Trend
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trend?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" strokeWidth={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    name="Score"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAverage"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Moving Average"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Weak Subjects
              </Typography>
              {overview?.weakSubjects && overview.weakSubjects.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {overview.weakSubjects.map((subject) => (
                    <Chip
                      key={subject.subjectName}
                      label={`${subject.subjectName} (${subject.accuracy.toFixed(1)}%)`}
                      color="error"
                      size="small"
                    />
                  ))}
                </Box>
              ) : (
                <Alert icon={<CheckCircle />} severity="success" sx={{ py: 0.5 }}>
                  <Typography variant="caption">No weak subjects detected!</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2, p: 2 }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Mock History
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Total Score</TableCell>
                  <TableCell align="right">Cutoff</TableCell>
                  <TableCell align="center">Probability</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mocks?.content && mocks.content.length > 0 ? (
                  mocks.content.map((mock) => (
                    <TableRow key={mock.id}>
                      <TableCell>{mock.testDate}</TableCell>
                      <TableCell align="right">{mock.totalScore.toFixed(2)}</TableCell>
                      <TableCell align="right">{mock.cutoffScore.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={mock.probabilityScore ? `${mock.probabilityScore}%` : 'N/A'}
                          size="small"
                          color={getProbabilityColor(mock.probabilityScore || 0)}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<Visibility fontSize="small" />}
                          onClick={() => {
                            setSelectedMockId(mock.id);
                            setMockDetailOpen(true);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No mock tests yet. Create your first one!
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <MockDetailDialog
        open={mockDetailOpen}
        onClose={() => {
          setMockDetailOpen(false);
          setSelectedMockId(null);
        }}
        mockDetail={mockDetail}
      />

      <GoalSettingDialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
      />
      </motion.div>
    </DashboardLayout>
  );
};
