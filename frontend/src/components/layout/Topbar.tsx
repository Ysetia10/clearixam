import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { getUserEmail } from '../../api/auth';

const DRAWER_WIDTH = 240;

export const Topbar = () => {
  const userEmail = getUserEmail();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {userEmail}
        </Typography>
      </Toolbar>
    </AppBar>
  );
};
