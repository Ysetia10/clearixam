import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi, GoalResponse } from '../api/goals';

interface GoalSettingDialogProps {
  open: boolean;
  onClose: () => void;
  existingGoal?: GoalResponse;
}

export const GoalSettingDialog = ({ open, onClose, existingGoal }: GoalSettingDialogProps) => {
  const queryClient = useQueryClient();
  const [targetScore, setTargetScore] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const isEditMode = !!existingGoal;

  useEffect(() => {
    if (existingGoal) {
      setTargetScore(existingGoal.targetScore.toString());
      setTargetDate(existingGoal.targetDate);
    } else {
      setTargetScore('');
      setTargetDate('');
    }
  }, [existingGoal, open]);

  const createMutation = useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      onClose();
      setTargetScore('');
      setTargetDate('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { targetScore: number; targetDate: string } }) =>
      goalsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      onClose();
      setTargetScore('');
      setTargetDate('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      targetScore: parseFloat(targetScore),
      targetDate,
    };

    if (isEditMode && existingGoal) {
      updateMutation.mutate({ id: existingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditMode ? 'Edit Your Goal' : 'Set Your Goal'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Target Score"
              type="number"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              required
              inputProps={{ step: '0.01', min: '0' }}
              fullWidth
            />
            <TextField
              label="Target Date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Goal' : 'Create Goal')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
