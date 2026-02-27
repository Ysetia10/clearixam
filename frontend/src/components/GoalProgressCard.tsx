import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
  Button,
} from '@mui/material';
import { Flag, TrendingUp } from '@mui/icons-material';

interface GoalProgressCardProps {
  goalProgress: {
    goalProgressPercent: number;
    daysRemaining: number;
    onTrack: boolean;
    currentScore: number;
    targetScore: number;
  };
  onSetGoal: () => void;
}

export const GoalProgressCard = ({ goalProgress, onSetGoal }: GoalProgressCardProps) => {
  return (
    <Card sx={{ p: 2 }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Flag color="primary" sx={{ mr: 0.5, fontSize: '1.125rem' }} />
          <Typography variant="subtitle2" fontWeight="bold">
            Goal Progress
          </Typography>
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {goalProgress.goalProgressPercent.toFixed(1)}% toward your target of{' '}
              {goalProgress.targetScore.toFixed(2)}
            </Typography>
            <Chip
              label={goalProgress.onTrack ? 'On Track' : 'Needs Focus'}
              color={goalProgress.onTrack ? 'success' : 'warning'}
              size="small"
              icon={<TrendingUp sx={{ fontSize: '0.875rem' }} />}
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(goalProgress.goalProgressPercent, 100)}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Current Score
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {goalProgress.currentScore.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Days Remaining
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {goalProgress.daysRemaining}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={onSetGoal}
          fullWidth
        >
          Update Goal
        </Button>
      </CardContent>
    </Card>
  );
};
