import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { backupApi, BackupData } from '../api/backup';
import { removeToken } from '../api/auth';

export const AccountSettings = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<BackupData | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

  const exportMutation = useMutation({
    mutationFn: backupApi.exportData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `Clearixam_Backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('Data exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: () => {
      setError('Failed to export data. Please try again.');
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: { overwriteExisting: boolean; mocks: any[]; goals: any[] }) =>
      backupApi.importData(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-trend'] });
      queryClient.invalidateQueries({ queryKey: ['mocks'] });
      queryClient.invalidateQueries({ queryKey: ['subject-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setSuccess('Data imported successfully!');
      setImportDialogOpen(false);
      setImportData(null);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to import data. Please check the file format.');
    },
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (!data.mocks || !Array.isArray(data.mocks)) {
          setError('Invalid backup file format. Missing mocks data.');
          return;
        }

        setImportData(data);
        setImportDialogOpen(true);
        setError('');
      } catch (err) {
        setError('Invalid JSON file. Please select a valid backup file.');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImport = useCallback(() => {
    if (!importData) return;

    importMutation.mutate({
      overwriteExisting,
      mocks: importData.mocks,
      goals: importData.goals || [],
    });
  }, [importData, overwriteExisting, importMutation]);

  const handleLogout = useCallback(() => {
    removeToken();
    localStorage.removeItem('userEmail');
    navigate('/login');
  }, [navigate]);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <DashboardLayout>
      <h1 className="page-title" style={{ marginBottom: '32px' }}>Account Settings</h1>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(244,63,94,0.08)',
          border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: '8px',
          color: 'var(--red)',
          fontSize: '13px',
          marginBottom: '20px',
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: 'var(--red)',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(34,211,160,0.08)',
          border: '1px solid rgba(34,211,160,0.2)',
          borderRadius: '8px',
          color: 'var(--green)',
          fontSize: '13px',
          marginBottom: '20px',
        }}>
          {success}
          <button
            onClick={() => setSuccess('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: 'var(--green)',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Profile Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--green))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
          }}>
            {getInitials(userEmail)}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
              {userEmail.split('@')[0]}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
              {userEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>EMAIL</div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{userEmail}</div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Edit
          </button>
        </div>
      </div>

      {/* Data Backup Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 className="section-title" style={{ marginBottom: '8px' }}>Data Backup & Restore</h3>
        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px' }}>
          Export your data for backup or import previously exported data.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            className="btn btn-primary"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? '⏳ Exporting...' : '📥 Export Data'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            className="btn btn-ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            📤 Import Data
          </button>
        </div>

        <div style={{
          padding: '12px 16px',
          background: 'rgba(124,106,255,0.08)',
          border: '1px solid rgba(124,106,255,0.2)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--text2)',
        }}>
          🔒 Your data is exported in JSON format. Keep this file secure as it contains all your mock test data and goals.
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{
        background: 'rgba(244,63,94,0.04)',
        border: '1px solid rgba(244,63,94,0.2)',
      }}>
        <h3 className="section-title" style={{ marginBottom: '8px', color: 'var(--red)' }}>Danger Zone</h3>
        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>
          Logout from your account
        </p>
        <button
          className="btn btn-ghost"
          onClick={handleLogout}
          style={{
            color: 'var(--red)',
            borderColor: 'rgba(244,63,94,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(244,63,94,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface2)';
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Import Dialog */}
      {importDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 className="section-title">Confirm Data Import</h3>
            </div>

            {importData && (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>
                  You are about to import:
                </p>
                <ul style={{ paddingLeft: '20px', marginBottom: '16px', fontSize: '13px', color: 'var(--text)' }}>
                  <li>{importData.mocks.length} mock tests</li>
                  <li>{importData.goals?.length || 0} goals</li>
                </ul>

                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text2)',
                  marginBottom: '16px',
                }}>
                  <strong style={{ color: 'var(--amber)' }}>Important:</strong><br />
                  By default, this will add new data without removing existing records. 
                  If you want to replace all existing data, check the option below.
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Overwrite existing data (this will delete all current mocks and goals)</span>
                </label>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setImportDialogOpen(false)}
                disabled={importMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importMutation.isPending}
                style={overwriteExisting ? {
                  background: 'linear-gradient(135deg, var(--red), #d91f3f)',
                } : {}}
              >
                {importMutation.isPending ? 'Importing...' : overwriteExisting ? 'Overwrite & Import' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
