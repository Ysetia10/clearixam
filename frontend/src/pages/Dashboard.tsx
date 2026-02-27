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
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  Speed,
  Warning,
  CheckCircle,
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

export const Dashboard = () => {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsApi.getOverview,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: analyticsApi.getTrend,
  });

  if (overviewLoading || trendLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
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
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Average Score
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {overview?.averageScore.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Moving Average
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {overview?.movingAverage.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Speed color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Probability
                </Typography>
              </Box>
              <Chip
                label={`${overview?.probability}%`}
                color={getProbabilityColor(overview?.probability || 0)}
                sx={{ fontSize: '1.5rem', height: 40, fontWeight: 'bold' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Risk Level
                </Typography>
              </Box>
              <Chip
                label={overview?.riskLevel}
                color={getRiskColor(overview?.riskLevel || 'HIGH')}
                sx={{ fontSize: '1.25rem', height: 40, fontWeight: 'bold' }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Performance Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4F46E5"
                    strokeWidth={2}
                    name="Score"
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAverage"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Moving Average"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Weak Subjects
              </Typography>
              {overview?.weakSubjects && overview.weakSubjects.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {overview.weakSubjects.map((subject) => (
                    <Chip
                      key={subject.subjectName}
                      label={`${subject.subjectName} (${subject.accuracy.toFixed(1)}%)`}
                      color="error"
                    />
                  ))}
                </Box>
              ) : (
                <Alert icon={<CheckCircle />} severity="success">
                  No weak subjects detected. Great job!
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};
