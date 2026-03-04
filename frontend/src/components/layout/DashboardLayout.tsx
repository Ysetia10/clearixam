import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 230;

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <Sidebar />
      <main style={{
        flexGrow: 1,
        marginLeft: `${DRAWER_WIDTH}px`,
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '32px',
      }}>
        {children}
      </main>
    </div>
  );
};
