import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart, Assessment } from '@mui/icons-material';
import { authApi, setToken, setUserEmail } from '../api/auth';
import { useToast } from '../components/Toast';

export const Login = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setToken(response.token);
      setUserEmail(email);
      showToast('Login successful', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast('Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: theme.palette.mode === 'light'
          ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-30px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          left: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 10s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />

      <Box
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: 1400,
          margin: 'auto',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: 4,
          px: 3,
          py: 4,
        }}
      >
        {/* Left Hero Section */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            <Box>
              <Typography
                variant="h3"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  mb: 2,
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
              >
                From Practice to Probability
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 400,
                  lineHeight: 1.6,
                }}
              >
                Track performance. Analyze trends. Clear confidently.
              </Typography>
            </Box>

            {/* Animated Analytics Visual */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Animated Graph Lines */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 400 300"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(79, 70, 229, 0.3))' }}
              >
                {/* Grid Lines */}
                <g opacity="0.2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={`h-${i}`}
                      x1="50"
                      y1={50 + i * 50}
                      x2="350"
                      y2={50 + i * 50}
                      stroke="white"
                      strokeWidth="1"
                    />
                  ))}
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <line
                      key={`v-${i}`}
                      x1={50 + i * 50}
                      y1="50"
                      x2={50 + i * 50}
                      y2="250"
                      stroke="white"
                      strokeWidth="1"
                    />
                  ))}
                </g>

                {/* Animated Rising Line */}
                <motion.path
                  d="M 50 200 Q 100 180, 150 150 T 250 100 T 350 70"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }}
                />

                {/* Data Points */}
                {[
                  { x: 50, y: 200 },
                  { x: 150, y: 150 },
                  { x: 250, y: 100 },
                  { x: 350, y: 70 },
                ].map((point, i) => (
                  <motion.circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill="#10B981"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.3, duration: 0.3 }}
                  />
                ))}
              </svg>

              {/* Floating Icons */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                }}
              >
                <TrendingUp sx={{ fontSize: 40, color: 'rgba(255, 255, 255, 0.8)' }} />
              </motion.div>
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                style={{
                  position: 'absolute',
                  top: '20%',
                  right: '15%',
                }}
              >
                <BarChart sx={{ fontSize: 35, color: 'rgba(255, 255, 255, 0.7)' }} />
              </motion.div>
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                style={{
                  position: 'absolute',
                  bottom: '15%',
                  right: '20%',
                }}
              >
                <Assessment sx={{ fontSize: 38, color: 'rgba(255, 255, 255, 0.75)' }} />
              </motion.div>
            </Box>

            {/* Feature Highlights */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {[
                { icon: <TrendingUp />, text: 'Performance Tracking' },
                { icon: <BarChart />, text: 'Trend Analysis' },
                { icon: <Assessment />, text: 'Smart Insights' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.2, duration: 0.5 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: 'rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    {feature.icon}
                    <Typography variant="body2">{feature.text}</Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        )}

        {/* Right Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          style={{ flex: isMobile ? 1 : 0.5, width: '100%', maxWidth: 450 }}
        >
          <Card
            sx={{
              backdropFilter: 'blur(20px)',
              background:
                theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              boxShadow: theme.palette.mode === 'light'
                ? '0 20px 60px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(139, 92, 246, 0.1)'
                : '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.2)',
              border: '1px solid',
              borderColor:
                theme.palette.mode === 'light'
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(139, 92, 246, 0.25)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{ 
                      mb: 0.5,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    CleariXam
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sign in to your account
                  </Typography>
                </Box>
              </motion.div>

              <form onSubmit={handleSubmit}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    size="small"
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.1)',
                        },
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.15)',
                        },
                      },
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    size="small"
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.1)',
                        },
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.15)',
                        },
                      },
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    disabled={loading}
                    size="medium"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
                    sx={{
                      mb: 2,
                      py: 1.2,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                      transition: 'all 0.3s',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        boxShadow: '0 6px 20px rgba(139, 92, 246, 0.6)',
                        transform: 'translateY(-2px)',
                      },
                      '&:disabled': {
                        background: 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 100%)',
                      },
                    }}
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <Typography variant="body2" align="center">
                  Don't have an account?{' '}
                  <Link
                    component="button"
                    onClick={() => navigate('/register')}
                    sx={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      '&:hover': {
                        color: 'primary.dark',
                      },
                    }}
                  >
                    Register
                  </Link>
                </Typography>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </Box>
  );
};
