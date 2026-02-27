import { useState } from 'react';
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
import { goalsApi } from '../api/goals';

interface GoalSettingDialogProps {
  open: boolean;
  onClose: () => void;
}

export const GoalSettingDialog = ({ open, onClose }: GoalSettingDialogProps) => {
  const queryClient = useQueryClient();
  const [targetScore, setTargetScore] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const mutation = useMutation({
    mutationFn: goalsApi.create,
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
    mutation.mutate({
      targetScore: parseFloat(targetScore),
      targetDate,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Set Your Goal</DialogTitle>
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
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Goal'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
