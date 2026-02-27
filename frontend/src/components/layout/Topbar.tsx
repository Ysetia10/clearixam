import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import { getUserEmail } from '../../api/auth';

const DRAWER_WIDTH = 220;

export const Topbar = () => {
  const userEmail = getUserEmail();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', py: 1 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Chip 
          label={userEmail} 
          size="small"
          sx={{ 
            fontSize: '0.75rem',
            height: '28px',
            bgcolor: 'action.hover',
          }} 
        />
      </Toolbar>
    </AppBar>
  );
};
