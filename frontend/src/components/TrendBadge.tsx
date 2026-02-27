import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface TrendBadgeProps {
  value: number;
  suffix?: string;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

export const TrendBadge = ({ value, suffix = '%', size = 'small', showIcon = true }: TrendBadgeProps) => {
  const isPositive = value >= 0;
  const fontSize = size === 'small' ? '0.75rem' : '0.875rem';
  const iconSize = size === 'small' ? '0.875rem' : '1rem';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        color: isPositive ? 'success.main' : 'error.main',
      }}
    >
      {showIcon && (
        isPositive ? (
          <TrendingUp sx={{ fontSize: iconSize }} />
        ) : (
          <TrendingDown sx={{ fontSize: iconSize }} />
        )
      )}
      <Typography
        variant="caption"
        sx={{
          fontSize,
          fontWeight: 600,
          color: 'inherit',
        }}
      >
        {isPositive ? '+' : ''}{value.toFixed(1)}{suffix}
      </Typography>
    </Box>
  );
};
