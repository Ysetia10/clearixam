import { useNavigate, useLocation } from 'react-router-dom';
import { removeToken } from '../../api/auth';

const DRAWER_WIDTH = 230;

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    { text: 'Performance History', path: '/performance-history', icon: '📋' },
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
        padding: '0 24px 28px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '22px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent), var(--green))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            CleariXam
          </span>
          <span style={{
            fontSize: '10px',
            color: 'var(--accent2)',
            background: 'rgba(124,106,255,0.12)',
            border: '1px solid rgba(124,106,255,0.2)',
            borderRadius: '4px',
            padding: '1px 6px',
            fontWeight: 600,
          }}>
            BETA
          </span>
        </div>
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
