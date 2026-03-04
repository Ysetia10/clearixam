import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Collapse,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { performanceApi, SubjectPerformance } from '../api/performance';
import { examsApi, Exam } from '../api/exams';
import { SubjectCardSkeleton } from '../components/SkeletonLoaders';

export const SubjectAnalytics = () => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Fetch exams
  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  // Fetch performance data for selected exam
  const { data: performances = [], isLoading: performancesLoading } = useQuery({
    queryKey: ['performance', selectedExamId],
    queryFn: () => performanceApi.getByExam(selectedExamId),
    enabled: !!selectedExamId,
  });

  // Set default exam when exams load
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const handleExamChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedExamId(newValue);
    setExpandedSubject(null);
  };

  const handleExpandClick = (subjectName: string) => {
    setExpandedSubject(expandedSubject === subjectName ? null : subjectName);
  };

  // Group performances by subject
  const subjectAnalytics = performances.reduce((acc: Record<string, SubjectPerformance[]>, perf) => {
    if (!acc[perf.subjectName]) {
      acc[perf.subjectName] = [];
    }
    acc[perf.subjectName].push(perf);
    return acc;
  }, {});

  // Calculate analytics for each subject
  const subjectStats = Object.entries(subjectAnalytics).map(([subjectName, perfs]) => {
    const sortedPerfs = perfs.sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime());
    
    const avgMarks = perfs.reduce((sum, p) => sum + p.marks, 0) / perfs.length;
    const avgAccuracy = perfs.reduce((sum, p) => sum + p.accuracy, 0) / perfs.length;
    
    // Calculate improvement rate
    let improvementRate = 0;
    if (sortedPerfs.length >= 2) {
      const oldest = sortedPerfs[0].marks;
      const latest = sortedPerfs[sortedPerfs.length - 1].marks;
      if (oldest !== 0) {
        improvementRate = ((latest - oldest) / oldest) * 100;
      }
    }

    const chartData = sortedPerfs.map(p => ({
      date: new Date(p.testDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      marks: p.marks,
      accuracy: p.accuracy,
    }));

    return {
      subjectName,
      avgMarks,
      avgAccuracy,
      improvementRate,
      testCount: perfs.length,
      chartData,
    };
  });

  // Sort by average marks descending
  subjectStats.sort((a, b) => b.avgMarks - a.avgMarks);

  if (examsLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  const isLoading = performancesLoading;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
          Subject-Wise Analytics
        </Typography>

        {/* Exam Tabs */}
        <Card sx={{ mb: 2 }}>
          <Tabs
            value={selectedExamId}
            onChange={handleExamChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {exams.map((exam: Exam) => (
              <Tab 
                key={exam.id} 
                label={exam.name} 
                value={exam.id}
              />
            ))}
          </Tabs>
        </Card>

        {isLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}>
                <SubjectCardSkeleton />
              </Grid>
            ))}
          </Grid>
        ) : subjectStats.length === 0 ? (
          <Card sx={{ p: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Alert severity="info">
                No performance data available for this exam yet. Add some performance records to see analytics!
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {subjectStats.map((subject) => {
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
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {subject.subjectName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {subject.testCount} test{subject.testCount !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
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
                            Avg Marks
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {subject.avgMarks.toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Avg Accuracy
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {subject.avgAccuracy.toFixed(1)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">
                            Improvement
                          </Typography>
                          <Typography 
                            variant="subtitle1" 
                            fontWeight="bold"
                            color={subject.improvementRate >= 0 ? 'success.main' : 'error.main'}
                          >
                            {subject.improvementRate >= 0 ? '+' : ''}
                            {subject.improvementRate.toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>

                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Performance Trend
                          </Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={subject.chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" strokeWidth={0.5} />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                              <Tooltip contentStyle={{ fontSize: 11 }} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="marks"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                name="Marks"
                                dot={{ r: 3 }}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="accuracy"
                                stroke="#10B981"
                                strokeWidth={2}
                                name="Accuracy %"
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>

                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>
                              Marks Distribution
                            </Typography>
                            <ResponsiveContainer width="100%" height={150}>
                              <BarChart data={subject.chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" strokeWidth={0.5} />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ fontSize: 11 }} />
                                <Bar dataKey="marks" fill="#4F46E5" />
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </motion.div>
    </DashboardLayout>
  );
};
