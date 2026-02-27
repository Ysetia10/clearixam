import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { TrendingUp, Warning, Flag, Lock, CheckCircle } from '@mui/icons-material';

interface Insight {
  type: 'success' | 'warning' | 'info' | 'goal';
  icon: 'trending' | 'warning' | 'goal' | 'stable' | 'check';
  message: string;
}

interface InsightCardProps {
  insights: Insight[];
}

const getIcon = (iconType: string) => {
  switch (iconType) {
    case 'trending':
      return <TrendingUp fontSize="small" />;
    case 'warning':
      return <Warning fontSize="small" />;
    case 'goal':
      return <Flag fontSize="small" />;
    case 'stable':
      return <Lock fontSize="small" />;
    case 'check':
      return <CheckCircle fontSize="small" />;
    default:
      return <TrendingUp fontSize="small" />;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'goal':
      return 'primary';
    default:
      return 'default';
  }
};

export const InsightCard = ({ insights }: InsightCardProps) => {
  if (insights.length === 0) return null;

  return (
    <Card sx={{ p: 2 }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Performance Insights
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {insights.map((insight, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Chip
                icon={getIcon(insight.icon)}
                label=""
                size="small"
                color={getColor(insight.type) as any}
                sx={{ width: 32, height: 24, '& .MuiChip-label': { display: 'none' } }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {insight.message}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};
