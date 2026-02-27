import { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Download, Upload, Warning } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { backupApi, BackupData } from '../api/backup';

export const AccountSettings = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<BackupData | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Validate data structure
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
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (!importData) return;

    importMutation.mutate({
      overwriteExisting,
      mocks: importData.mocks,
      goals: importData.goals || [],
    });
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
          Account Settings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Data Backup Section */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Data Backup & Restore
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Export your data for backup or import previously exported data.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={exportMutation.isPending ? <CircularProgress size={16} /> : <Download />}
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? 'Exporting...' : 'Export Data'}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
              >
                Import Data
              </Button>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                Your data is exported in JSON format. Keep this file secure as it contains all your mock test data and goals.
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Account Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your account details and security information.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body2">
                  {localStorage.getItem('userEmail') || 'Not available'}
                </Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Alert severity="info" icon={false}>
                <Typography variant="caption">
                  🔒 Your data is securely stored and encrypted. We never share your information with third parties.
                </Typography>
              </Alert>
            </Box>
          </CardContent>
        </Card>

        {/* Import Confirmation Dialog */}
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="warning" />
              <Typography variant="h6">Confirm Data Import</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {importData && (
              <Box>
                <Typography variant="body2" gutterBottom>
                  You are about to import:
                </Typography>
                <Box sx={{ pl: 2, py: 1 }}>
                  <Typography variant="body2">• {importData.mocks.length} mock tests</Typography>
                  <Typography variant="body2">• {importData.goals?.length || 0} goals</Typography>
                </Box>

                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Important:</strong>
                  </Typography>
                  <Typography variant="caption">
                    By default, this will add new data without removing existing records. 
                    If you want to replace all existing data, check the option below.
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <input
                    type="checkbox"
                    id="overwrite"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                  />
                  <label htmlFor="overwrite">
                    <Typography variant="body2">
                      Overwrite existing data (this will delete all current mocks and goals)
                    </Typography>
                  </label>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importMutation.isPending}
              color={overwriteExisting ? 'error' : 'primary'}
            >
              {importMutation.isPending ? 'Importing...' : overwriteExisting ? 'Overwrite & Import' : 'Import'}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
};
