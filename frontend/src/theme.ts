import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#4F46E5',
      },
      success: {
        main: '#10B981',
      },
      warning: {
        main: '#F59E0B',
      },
      error: {
        main: '#F43F5E',
      },
      background: {
        default: mode === 'light' ? '#F9FAFB' : '#0F1419',
        paper: mode === 'light' ? '#FFFFFF' : '#1A1F2E',
      },
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      fontSize: 13,
      fontWeightLight: 500,
      fontWeightRegular: 500,
      fontWeightMedium: 500,
      fontWeightBold: 500,
      h4: {
        fontWeight: 500,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 500,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 500,
        fontSize: '1rem',
      },
      body1: {
        fontSize: '0.875rem',
      },
      body2: {
        fontSize: '0.8125rem',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow:
              mode === 'light'
                ? '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                : '0 1px 2px 0 rgb(0 0 0 / 0.3)',
            border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '12px 16px',
            '&:last-child': {
              paddingBottom: '12px',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 6,
            fontSize: '0.8125rem',
            fontWeight: 500,
            padding: '6px 12px',
          },
          sizeSmall: {
            fontSize: '0.75rem',
            padding: '4px 8px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem',
            height: '24px',
          },
          sizeSmall: {
            fontSize: '0.6875rem',
            height: '20px',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '8px 12px',
            fontSize: '0.8125rem',
          },
          head: {
            fontWeight: 500,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: {
            '& .MuiTableRow-root:hover': {
              backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.05)',
            },
          },
        },
      },
    },
  });
