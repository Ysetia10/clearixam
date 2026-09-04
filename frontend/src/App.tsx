import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { lazy, Suspense, useEffect } from 'react';
import { getTheme } from './theme';
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { ApiWakeBanner } from './components/ApiWakeBanner';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const AddMock = lazy(() => import('./pages/AddMock').then(module => ({ default: module.AddMock })));
const SubjectAnalytics = lazy(() => import('./pages/SubjectAnalytics').then(module => ({ default: module.SubjectAnalytics })));
const AccountSettings = lazy(() => import('./pages/AccountSettings').then(module => ({ default: module.AccountSettings })));
const PerformanceHistory = lazy(() => import('./pages/PerformanceHistory').then(module => ({ default: module.PerformanceHistory })));
const TopicPerformance = lazy(() => import('./pages/TopicPerformance'));
const SectionalTests = lazy(() => import('./pages/SectionalTests').then(m => ({ default: m.SectionalTests })));
const PyqPapers = lazy(() => import('./pages/PyqPapers').then(m => ({ default: m.PyqPapers })));
const TakeTest = lazy(() => import('./pages/TakeTest').then(m => ({ default: m.TakeTest })));
const TestResult = lazy(() => import('./pages/TestResult').then(m => ({ default: m.TestResult })));
const PyqAnalyze = lazy(() => import('./pages/PyqAnalyze').then(m => ({ default: m.PyqAnalyze })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return false;
        }
        return failureCount < (import.meta.env.PROD ? 2 : 1);
      },
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
      staleTime: 30000,
    },
  },
});

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <ApiWakeBanner />
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
              path="/performance-history"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <PerformanceHistory />
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
            <Route
              path="/mcq-classification"
              element={<Navigate to="/topic-performance" replace />}
            />
            <Route
              path="/topic-performance"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <TopicPerformance />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sectional-tests"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SectionalTests />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pyq-tests"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <PyqPapers />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/take-test/:paperId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <TakeTest />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-result/:attemptId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <TestResult />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pyq-analyze/:attemptId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <PyqAnalyze />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
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
