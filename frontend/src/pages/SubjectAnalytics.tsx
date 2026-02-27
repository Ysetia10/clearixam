import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Collapse,
  IconButton,
  Chip,
} from '@mui/material';
import { ExpandMore, TrendingUp, TrendingDown } from '@mui/icons-material';
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

export const SubjectAnalytics = () => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subject-analytics'],
    queryFn: analyticsApi.getSubjectAnalytics,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      </DashboardLayout>
    );
  }

  const handleExpandClick = (subjectName: string) => {
    setExpandedSubject(expandedSubject === subjectName ? null : subjectName);
  };

  return (
    <DashboardLayout>
      <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
        Subject-Wise Analytics
      </Typography>

      <Grid container spacing={2}>
        {subjects?.subjects && subjects.subjects.length > 0 ? (
          subjects.subjects.map((subject) => {
            const chartData = subject.trend.dates.map((date, index) => ({
              date,
              score: subject.trend.scores[index],
              accuracy: subject.trend.accuracy[index],
            }));

            const isExpanded = expandedSubject === subject.subjectName;

            return (
              <Grid item xs={12} md={6} key={subject.subjectName}>
                <Card sx={{ p: 2 }}>
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">
                        {subject.subjectName}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleExpandClick(subject.subjectName)}
                        sx={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: '0.3s',
                        }}
                      >
                        <ExpandMore fontSize="small" />
                      </IconButton>
                    </Box>

                    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Avg Score
                        </Typography>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {subject.averageScore.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Avg Accuracy
                        </Typography>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {subject.averageAccuracy.toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          Improvement
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          {subject.improvementRate >= 0 ? (
                            <TrendingUp color="success" sx={{ fontSize: '1rem' }} />
                          ) : (
                            <TrendingDown color="error" sx={{ fontSize: '1rem' }} />
                          )}
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            color={subject.improvementRate >= 0 ? 'success.main' : 'error.main'}
                          >
                            {subject.improvementRate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Performance Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" strokeWidth={0.5} />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 11 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="score"
                              stroke="#4F46E5"
                              strokeWidth={2}
                              name="Score"
                              dot={{ r: 2 }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="accuracy"
                              stroke="#10B981"
                              strokeWidth={2}
                              name="Accuracy %"
                              dot={{ r: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Card sx={{ p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  No subject data available yet. Create some mock tests to see analytics!
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </DashboardLayout>
  );
};
