import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  BarChart as BarChartIcon,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { removeToken } from '../../api/auth';
import { useThemeMode } from '../../context/ThemeContext';

const DRAWER_WIDTH = 220;

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useThemeMode();

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/dashboard' },
    { text: 'Subject Analytics', icon: <BarChartIcon fontSize="small" />, path: '/subject-analytics' },
    { text: 'Add Mock', icon: <AddIcon fontSize="small" />, path: '/add-mock' },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" color="primary" fontWeight="bold" sx={{ fontSize: '1.125rem' }}>
          CleariXam
        </Typography>
        <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
          <IconButton onClick={toggleTheme} size="small" sx={{ ml: 1 }}>
            {mode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <List sx={{ px: 1.5, py: 0 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 1.5,
                minHeight: 36,
                py: 0.75,
                px: 1.5,
                position: 'relative',
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: '60%',
                    backgroundColor: 'white',
                    borderRadius: '0 2px 2px 0',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                transition: 'all 0.2s',
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontSize: '0.8125rem',
                  fontWeight: location.pathname === item.path ? 600 : 500,
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}

        <ListItem disablePadding sx={{ mt: 3 }}>
          <ListItemButton 
            onClick={handleLogout} 
            sx={{ 
              borderRadius: 1.5,
              minHeight: 36,
              py: 0.75,
              px: 1.5,
              '&:hover': {
                backgroundColor: 'error.main',
                color: 'white',
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
              transition: 'all 0.2s',
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary="Logout" 
              primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }} 
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};
