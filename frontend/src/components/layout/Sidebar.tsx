import { useNavigate, useLocation } from 'react-router-dom';
import { removeToken } from '../../api/auth';
import { useThemeMode } from '../../context/ThemeContext';

const DRAWER_WIDTH = 230;

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useThemeMode();
  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: '📊' },
    { text: 'Subject Analytics', path: '/subject-analytics', icon: '📈' },
    { text: 'Add Mock', path: '/add-mock', icon: '➕' },
    { text: 'Mock History', path: '/performance-history', icon: '📋' },
    { text: 'Account', path: '/account', icon: '⚙️' },
  ];

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div style={{
      position: 'fixed',
      width: `${DRAWER_WIDTH}px`,
      height: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      zIndex: 1000,
    }}>
      {/* Logo Section */}
      <div style={{
        padding: '0 12px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Logo and BETA on first row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '20px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent), var(--green))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            whiteSpace: 'nowrap',
          }}>
            CleariXam
          </span>
          <span style={{
            fontSize: '9px',
            color: 'var(--accent2)',
            background: 'rgba(124,106,255,0.12)',
            border: '1px solid rgba(124,106,255,0.2)',
            borderRadius: '4px',
            padding: '1px 5px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            BETA
          </span>
        </div>
        
        {/* Theme Toggle Button on second row */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            borderRadius: '10px',
            padding: '8px',
            width: '100%',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            color: 'var(--text2)',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface3)';
            e.currentTarget.style.borderColor = 'var(--border2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface2)';
            e.currentTarget.style.borderColor = 'var(--border2)';
          }}
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mode === 'dark' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>Light Mode</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '24px 12px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--text3)',
          padding: '0 12px',
          marginBottom: '12px',
        }}>
          MAIN MENU
        </div>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                color: isActive ? 'var(--accent2)' : 'var(--text2)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.18s',
                marginBottom: '4px',
                position: 'relative',
                background: isActive ? 'linear-gradient(135deg, rgba(124,106,255,0.18), rgba(124,106,255,0.08))' : 'transparent',
                border: isActive ? '1px solid rgba(124,106,255,0.2)' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--surface2)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text2)';
                }
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: '-12px',
                  width: '3px',
                  height: '18px',
                  background: 'var(--accent)',
                  borderRadius: '0 3px 3px 0',
                }} />
              )}
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.text}</span>
            </div>
          );
        })}
      </nav>

      {/* User Chip */}
      <div style={{
        marginTop: 'auto',
        padding: '16px 12px 0',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {getInitials(userEmail)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {userEmail.split('@')[0]}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--text3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {userEmail}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{
            width: '100%',
            marginTop: '8px',
            justifyContent: 'center',
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
};
