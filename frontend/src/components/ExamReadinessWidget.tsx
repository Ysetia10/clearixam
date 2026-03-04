import { Box, Card, CardContent, Typography, CircularProgress, Chip } from '@mui/material';
import { CheckCircle, TrendingUp, Warning } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '../config/apiConfig';
import { getToken } from '../api/auth';

interface ExamReadinessData {
  score: number;
  status: 'NEEDS_IMPROVEMENT' | 'ON_TRACK' | 'EXAM_READY';
  averageScore: number;
  consistency: number;
  totalMocks: number;
  message: string;
}

export const ExamReadinessWidget = () => {
  const { data, isLoading } = useQuery<ExamReadinessData>({
    queryKey: ['examReadiness'],
    queryFn: async () => {
      const response = await fetch(`${API_CONFIG.baseURL}/api/analytics/readiness`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch readiness');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'EXAM_READY':
        return {
          color: '#4caf50',
          icon: <CheckCircle />,
          label: 'Exam Ready',
          chipColor: 'success' as const,
        };
      case 'ON_TRACK':
        return {
          color: '#2196f3',
          icon: <TrendingUp />,
          label: 'On Track',
          chipColor: 'info' as const,
        };
      default:
        return {
          color: '#ff9800',
          icon: <Warning />,
          label: 'Needs Improvement',
          chipColor: 'warning' as const,
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={40} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const statusConfig = getStatusConfig(data.status);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Exam Readiness
          </Typography>
          <Chip
            label={statusConfig.label}
            color={statusConfig.chipColor}
            size="small"
            icon={statusConfig.icon}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 3 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={data.score}
              size={120}
              thickness={6}
              sx={{
                color: statusConfig.color,
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h3" fontWeight={700} color={statusConfig.color}>
                {data.score}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                out of 100
              </Typography>
            </Box>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
          {data.message}
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Avg Score
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {data.averageScore.toFixed(1)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Consistency
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {data.consistency.toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
