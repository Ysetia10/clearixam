import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { lazy, Suspense } from 'react';
import { getTheme } from './theme';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load all heavy pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const AddMock = lazy(() => import('./pages/AddMock').then(module => ({ default: module.AddMock })));
const SubjectAnalytics = lazy(() => import('./pages/SubjectAnalytics').then(module => ({ default: module.SubjectAnalytics })));
const AccountSettings = lazy(() => import('./pages/AccountSettings').then(module => ({ default: module.AccountSettings })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <CircularProgress size={32} />
  </Box>
);

function AppContent() {
  const { mode } = useThemeMode();
  const theme = getTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-mock"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <AddMock />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject-analytics"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <SubjectAnalytics />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <AccountSettings />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}

export default App;

