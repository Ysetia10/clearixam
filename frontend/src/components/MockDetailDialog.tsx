import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { Close, Delete, Edit } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mocksApi, MockDetailResponse } from '../api/mocks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface MockDetailDialogProps {
  open: boolean;
  onClose: () => void;
  mockDetail: MockDetailResponse | undefined;
}

export const MockDetailDialog = ({ open, onClose, mockDetail }: MockDetailDialogProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: mocksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mocks'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trend'] });
      queryClient.invalidateQueries({ queryKey: ['subject-analytics'] });
      onClose();
      setShowDeleteConfirm(false);
    },
  });

  const handleDelete = () => {
    if (mockDetail) {
      deleteMutation.mutate(mockDetail.id);
    }
  };

  const handleEdit = () => {
    // For now, navigate to add mock page
    // In future, could pre-populate form with existing data
    navigate('/add-mock');
    onClose();
  };

  if (!mockDetail) return null;

  const totalAttempted = mockDetail.subjects.reduce((sum, s) => sum + s.attempted, 0);
  const totalCorrect = mockDetail.subjects.reduce((sum, s) => sum + s.correct, 0);
  const overallAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Mock Test Details
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {showDeleteConfirm && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Box>
                <Button color="inherit" size="small" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
                </Button>
              </Box>
            }
          >
            Are you sure you want to delete this mock test? This action cannot be undone.
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Test Date
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {mockDetail.testDate}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Score
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {mockDetail.totalScore.toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Cutoff Score
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {mockDetail.cutoffScore.toFixed(2)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Overall Accuracy
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {overallAccuracy.toFixed(1)}%
              </Typography>
            </Box>
            {mockDetail.probabilityScore && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Probability
                </Typography>
                <Chip
                  label={`${mockDetail.probabilityScore}%`}
                  size="small"
                  color={
                    mockDetail.probabilityScore >= 75
                      ? 'success'
                      : mockDetail.probabilityScore >= 50
                      ? 'warning'
                      : 'error'
                  }
                  sx={{ mt: 0.25, height: 24 }}
                />
              </Box>
            )}
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          Subject Breakdown
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 0.75 }}>Subject</TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>Attempted</TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>Correct</TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>Incorrect</TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>Accuracy</TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockDetail.subjects.map((subject) => {
                const accuracy =
                  subject.attempted > 0 ? (subject.correct / subject.attempted) * 100 : 0;
                return (
                  <TableRow key={subject.subjectName}>
                    <TableCell sx={{ py: 0.75 }}>
                      <Typography variant="body2" fontWeight="bold">{subject.subjectName}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>{subject.attempted}</TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>{subject.correct}</TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>{subject.incorrect}</TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      <Chip
                        label={`${accuracy.toFixed(1)}%`}
                        size="small"
                        color={accuracy >= 75 ? 'success' : accuracy >= 60 ? 'warning' : 'error'}
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.75 }}>
                      <Typography variant="body2" fontWeight="bold">{subject.score.toFixed(2)}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell sx={{ py: 0.75 }}>
                  <Typography variant="body2" fontWeight="bold">TOTAL</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                  <Typography variant="body2" fontWeight="bold">{totalAttempted}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                  <Typography variant="body2" fontWeight="bold">{totalCorrect}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                  <Typography variant="body2" fontWeight="bold">{totalAttempted - totalCorrect}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                  <Chip
                    label={`${overallAccuracy.toFixed(1)}%`}
                    size="small"
                    color={
                      overallAccuracy >= 75 ? 'success' : overallAccuracy >= 60 ? 'warning' : 'error'
                    }
                    sx={{ height: 20, fontSize: '0.75rem' }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75 }}>
                  <Typography variant="body2" fontWeight="bold">{mockDetail.totalScore.toFixed(2)}</Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button
          startIcon={<Delete fontSize="small" />}
          color="error"
          size="small"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={showDeleteConfirm || deleteMutation.isPending}
        >
          Delete
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose}>Close</Button>
        <Button variant="contained" size="small" startIcon={<Edit fontSize="small" />} onClick={handleEdit}>
          Create Similar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
