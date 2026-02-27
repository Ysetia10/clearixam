import { useState } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { mocksApi, SubjectInput } from '../api/mocks';

const SUBJECTS = ['POLITY', 'HISTORY', 'GEOGRAPHY', 'ECONOMY', 'ENVIRONMENT', 'SCIENCE'];

export const AddMock = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [testDate, setTestDate] = useState('');
  const [cutoffScore, setCutoffScore] = useState('');
  const [subjects, setSubjects] = useState<Record<string, SubjectInput>>(
    SUBJECTS.reduce((acc, subject) => ({
      ...acc,
      [subject]: { subjectName: subject, attempted: 0, correct: 0, incorrect: 0 },
    }), {})
  );
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: mocksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trend'] });
      navigate('/dashboard');
    },
    onError: () => {
      setError('Failed to create mock test');
    },
  });

  const calculateScore = (correct: number, incorrect: number) => {
    return (correct * 2 - incorrect * 0.66).toFixed(2);
  };

  const handleSubjectChange = (
    subject: string,
    field: 'attempted' | 'correct' | 'incorrect',
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setSubjects((prev) => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: numValue,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const subjectList = Object.values(subjects).filter(
      (s) => s.attempted > 0 || s.correct > 0 || s.incorrect > 0
    );

    if (subjectList.length === 0) {
      setError('Please add at least one subject');
      return;
    }

    for (const subject of subjectList) {
      if (subject.attempted < subject.correct + subject.incorrect) {
        setError(`Invalid data for ${subject.subjectName}: attempted must be >= correct + incorrect`);
        return;
      }
    }

    mutation.mutate({
      testDate,
      cutoffScore: parseFloat(cutoffScore),
      subjects: subjectList,
    });
  };

  return (
    <DashboardLayout>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Add Mock Test
      </Typography>

      <Card>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Test Date"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Cutoff Score"
                type="number"
                value={cutoffScore}
                onChange={(e) => setCutoffScore(e.target.value)}
                required
                inputProps={{ step: '0.01', min: '0' }}
                sx={{ flex: 1 }}
              />
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell align="center">Attempted</TableCell>
                    <TableCell align="center">Correct</TableCell>
                    <TableCell align="center">Incorrect</TableCell>
                    <TableCell align="center">Score Preview</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SUBJECTS.map((subject) => {
                    const data = subjects[subject];
                    return (
                      <TableRow key={subject}>
                        <TableCell>{subject}</TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={data.attempted || ''}
                            onChange={(e) =>
                              handleSubjectChange(subject, 'attempted', e.target.value)
                            }
                            inputProps={{ min: '0' }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={data.correct || ''}
                            onChange={(e) =>
                              handleSubjectChange(subject, 'correct', e.target.value)
                            }
                            inputProps={{ min: '0' }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={data.incorrect || ''}
                            onChange={(e) =>
                              handleSubjectChange(subject, 'incorrect', e.target.value)
                            }
                            inputProps={{ min: '0' }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {calculateScore(data.correct, data.incorrect)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Creating...' : 'Create Mock Test'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};
