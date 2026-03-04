import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  FormControl,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { mocksApi } from '../api/mocks';
import { examsApi, Exam, Subject } from '../api/exams';
import { useToast } from '../components/Toast';

interface SubjectRow {
  id: string;
  subjectId: string;
  subjectName: string;
  attempted: number;
  correct: number;
}

export const AddMock = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [testDate, setTestDate] = useState('');
  const [cutoffScore, setCutoffScore] = useState('');
  const [maxQuestions, setMaxQuestions] = useState<number>(100);
  const [maxMarks, setMaxMarks] = useState<number>(200);
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  const [error, setError] = useState('');

  // Fetch exams
  const { data: exams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: examsApi.getAll,
  });

  // Fetch subjects for selected exam
  const { data: examSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', selectedExamId],
    queryFn: () => examsApi.getSubjects(selectedExamId),
    enabled: !!selectedExamId,
  });

  const selectedExam = exams.find((e: Exam) => e.id === selectedExamId);

  // Initialize when exam changes
  useEffect(() => {
    if (selectedExam) {
      setMaxQuestions(selectedExam.maxQuestions);
      setMaxMarks(selectedExam.maxMarks);
      
      // Initialize with first 3 subjects if available
      if (examSubjects.length > 0) {
        const initialRows = examSubjects.slice(0, 3).map((subject: Subject) => ({
          id: Math.random().toString(36).substr(2, 9),
          subjectId: subject.id,
          subjectName: subject.name,
          attempted: 0,
          correct: 0,
        }));
        setSubjectRows(initialRows);
      }
    }
  }, [selectedExam, examSubjects]);

  // Set default exam when exams load
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  const mutation = useMutation({
    mutationFn: mocksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trend'] });
      queryClient.invalidateQueries({ queryKey: ['examReadiness'] });
      showToast('Mock test created successfully', 'success');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to create mock test';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    },
  });

  const calculateScore = (attempted: number, correct: number) => {
    const incorrect = attempted - correct;
    return (correct * 2 - incorrect * 0.66).toFixed(2);
  };

  const calculateTotalScore = () => {
    return subjectRows.reduce((sum, row) => {
      const score = parseFloat(calculateScore(row.attempted, row.correct));
      return sum + score;
    }, 0).toFixed(2);
  };

  const calculateTotalAttempted = () => {
    return subjectRows.reduce((sum, row) => sum + row.attempted, 0);
  };

  const calculateUnattempted = () => {
    return maxQuestions - calculateTotalAttempted();
  };

  const handleSubjectChange = (id: string, field: keyof SubjectRow, value: any) => {
    setSubjectRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleAddSubject = () => {
    if (examSubjects.length === 0) {
      showToast('No subjects available to add', 'error');
      return;
    }

    // Find first unused subject
    const usedSubjectIds = new Set(subjectRows.map(r => r.subjectId));
    const availableSubject = examSubjects.find((s: Subject) => !usedSubjectIds.has(s.id));

    if (!availableSubject) {
      showToast('All subjects have been added', 'info');
      return;
    }

    const newRow: SubjectRow = {
      id: Math.random().toString(36).substr(2, 9),
      subjectId: availableSubject.id,
      subjectName: availableSubject.name,
      attempted: 0,
      correct: 0,
    };

    setSubjectRows(prev => [...prev, newRow]);
  };

  const handleRemoveSubject = (id: string) => {
    if (subjectRows.length === 1) {
      showToast('At least one subject is required', 'error');
      return;
    }
    setSubjectRows(prev => prev.filter(row => row.id !== id));
  };

  const handleExamChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedExamId(newValue);
    setSubjectRows([]);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedExamId) {
      setError('Please select an exam');
      return;
    }

    const subjectList = subjectRows
      .filter(row => row.attempted > 0 || row.correct > 0)
      .map(row => ({
        subjectName: row.subjectName,
        subjectId: row.subjectId,
        attempted: row.attempted,
        correct: row.correct,
      }));

    if (subjectList.length === 0) {
      setError('Please add at least one subject with data');
      return;
    }

    // Validate
    const totalAttempted = calculateTotalAttempted();
    if (totalAttempted > maxQuestions) {
      setError(`Total questions attempted (${totalAttempted}) cannot exceed max questions (${maxQuestions})`);
      return;
    }

    for (const subject of subjectList) {
      if (subject.correct > subject.attempted) {
        setError(`Invalid data for ${subject.subjectName}: correct cannot exceed attempted`);
        return;
      }
    }

    const totalScore = parseFloat(calculateTotalScore());
    if (totalScore > maxMarks) {
      setError(`Total score (${totalScore}) cannot exceed max marks (${maxMarks})`);
      return;
    }

    mutation.mutate({
      testDate,
      cutoffScore: parseFloat(cutoffScore),
      subjects: subjectList,
    });
  };

  if (examsLoading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  const totalAttempted = calculateTotalAttempted();
  const unattempted = calculateUnattempted();
  const totalScore = calculateTotalScore();

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
          Add Mock Test
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

        <Card sx={{ p: 2 }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {/* Test Details */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Test Date"
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  required
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1, minWidth: 150 }}
                  inputProps={{ max: new Date().toISOString().split('T')[0] }}
                />
                <TextField
                  label="Cutoff Score"
                  type="number"
                  value={cutoffScore}
                  onChange={(e) => setCutoffScore(e.target.value)}
                  required
                  size="small"
                  inputProps={{ step: '0.01', min: '0' }}
                  sx={{ flex: 1, minWidth: 150 }}
                />
                <TextField
                  label="Max Questions"
                  type="number"
                  value={maxQuestions}
                  onChange={(e) => setMaxQuestions(parseInt(e.target.value) || 0)}
                  required
                  size="small"
                  inputProps={{ min: '1' }}
                  sx={{ flex: 1, minWidth: 150 }}
                />
                <TextField
                  label="Max Marks"
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(parseInt(e.target.value) || 0)}
                  required
                  size="small"
                  inputProps={{ min: '1' }}
                  sx={{ flex: 1, minWidth: 150 }}
                />
              </Box>

              {/* Subjects Table */}
              {subjectsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : examSubjects.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No subjects found for this exam. Please add subjects first.
                </Alert>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Subject</TableCell>
                          <TableCell align="center">Attempted</TableCell>
                          <TableCell align="center">Correct</TableCell>
                          <TableCell align="center">Score</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {subjectRows.map((row) => {
                          const usedSubjectIds = new Set(subjectRows.map(r => r.subjectId));
                          const availableSubjects = examSubjects.filter((s: Subject) => 
                            s.id === row.subjectId || !usedSubjectIds.has(s.id)
                          );

                          return (
                            <TableRow key={row.id}>
                              <TableCell>
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={row.subjectId}
                                    onChange={(e) => {
                                      const subject = examSubjects.find((s: Subject) => s.id === e.target.value);
                                      if (subject) {
                                        handleSubjectChange(row.id, 'subjectId', subject.id);
                                        handleSubjectChange(row.id, 'subjectName', subject.name);
                                      }
                                    }}
                                  >
                                    {availableSubjects.map((subject: Subject) => (
                                      <MenuItem key={subject.id} value={subject.id}>
                                        {subject.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  type="number"
                                  size="small"
                                  value={row.attempted || ''}
                                  onChange={(e) =>
                                    handleSubjectChange(row.id, 'attempted', parseInt(e.target.value) || 0)
                                  }
                                  inputProps={{ min: '0' }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  type="number"
                                  size="small"
                                  value={row.correct || ''}
                                  onChange={(e) =>
                                    handleSubjectChange(row.id, 'correct', parseInt(e.target.value) || 0)
                                  }
                                  inputProps={{ min: '0', max: row.attempted }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" fontWeight="bold">
                                  {calculateScore(row.attempted, row.correct)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveSubject(row.id)}
                                  disabled={subjectRows.length === 1}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Add Subject Button */}
                  <Button
                    startIcon={<Add />}
                    onClick={handleAddSubject}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 2 }}
                    disabled={subjectRows.length >= examSubjects.length}
                  >
                    Add Subject
                  </Button>

                  {/* Summary */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    mb: 2, 
                    p: 2, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    flexWrap: 'wrap'
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Attempted
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {totalAttempted}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Unattempted
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color={unattempted < 0 ? 'error.main' : 'text.primary'}>
                        {unattempted}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Score
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {totalScore}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Max Questions
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {maxQuestions}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Max Marks
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {maxMarks}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Validation Warnings */}
                  {totalAttempted > maxQuestions && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Total attempted ({totalAttempted}) exceeds max questions ({maxQuestions})
                    </Alert>
                  )}
                  {parseFloat(totalScore) > maxMarks && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Total score ({totalScore}) exceeds max marks ({maxMarks})
                    </Alert>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/dashboard')}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  type="submit"
                  disabled={mutation.isPending || examSubjects.length === 0 || subjectRows.length === 0}
                >
                  {mutation.isPending ? 'Creating...' : 'Create Mock Test'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};
