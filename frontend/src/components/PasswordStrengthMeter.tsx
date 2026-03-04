import { Box, LinearProgress, Typography } from '@mui/material';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };

    let score = 0;
    
    // Length check
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 10;
    
    // Character variety checks
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[@#$%^&+=!]/.test(pwd)) score += 20;

    let label = '';
    let color = '';

    if (score < 40) {
      label = 'Weak';
      color = '#f44336';
    } else if (score < 70) {
      label = 'Fair';
      color = '#ff9800';
    } else if (score < 90) {
      label = 'Good';
      color = '#2196f3';
    } else {
      label = 'Strong';
      color = '#4caf50';
    }

    return { score, label, color };
  };

  const strength = calculateStrength(password);

  if (!password) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={strength.score}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(0,0,0,0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: strength.color,
              borderRadius: 3,
            },
          }}
        />
        <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600, minWidth: 50 }}>
          {strength.label}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
        Use 8+ characters with uppercase, lowercase, number, and special character
      </Typography>
    </Box>
  );
};
