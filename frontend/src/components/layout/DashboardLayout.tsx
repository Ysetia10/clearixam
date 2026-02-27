import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 220;

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Topbar />
        <Box sx={{ p: 2.5, pt: 10 }}>{children}</Box>
      </Box>
    </Box>
  );
};
