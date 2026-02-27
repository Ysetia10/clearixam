import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  Speed,
  Warning,
  CheckCircle,
  Visibility,
  TrendingDown,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { analyticsApi } from '../api/analytics';
import { mocksApi } from '../api/mocks';
import { GoalProgressCard } from '../components/GoalProgressCard';
import { GoalSettingDialog } from '../components/GoalSettingDialog';
import { MockDetailDialog } from '../components/MockDetailDialog';

export const Dashboard = () => {
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [mockDetailOpen, setMockDetailOpen] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsApi.getOverview,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: analyticsApi.getTrend,
  });

  const { data: mocks, isLoading: mocksLoading } = useQuery({
    queryKey: ['mocks'],
    queryFn: () => mocksApi.list(0, 10),
  });

  const { data: mockDetail } = useQuery({
    queryKey: ['mock-detail', selectedMockId],
    queryFn: () => mocksApi.getDetail(selectedMockId!),
    enabled: !!selectedMockId && mockDetailOpen,
  });

  if (overviewLoading || trendLoading || mocksLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
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
      <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
        Dashboard
      </Typography>

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
              <Typography variant="h5" fontWeight="bold">
                {overview?.averageScore.toFixed(2)}
              </Typography>
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
                  <Tooltip contentStyle={{ fontSize: 12 }} />
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
    </DashboardLayout>
  );
};
