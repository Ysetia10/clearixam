import { useState } from 'react'
import { IconButton, useMediaQuery, useTheme } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { Sidebar } from './Sidebar'
import { DRAWER_WIDTH, MOBILE_APP_BAR_HEIGHT } from './constants'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {isMobile && (
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: `${MOBILE_APP_BAR_HEIGHT}px`,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 12px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <IconButton
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            sx={{ color: 'var(--text)' }}
          >
            <MenuIcon />
          </IconButton>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '18px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--accent), var(--green))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            CleariXam
          </span>
        </header>
      )}

      <Sidebar
        isMobile={isMobile}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main
        style={{
          flexGrow: 1,
          width: isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
          marginLeft: isMobile ? 0 : `${DRAWER_WIDTH}px`,
          minHeight: '100vh',
          background: 'var(--bg)',
          padding: isMobile ? '16px' : '32px',
          paddingTop: isMobile ? `${MOBILE_APP_BAR_HEIGHT + 16}px` : '32px',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  )
}
