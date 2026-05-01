import { useState, useRef } from 'react';
import { format } from 'date-fns';
import {
  exportBackup,
  downloadBackup,
  parseBackupFile,
  importBackup,
  type BackupData,
} from '../../services/backup';

interface BackupRestoreProps {
  onClose: () => void;
  onRestoreComplete: () => void;
}

export default function BackupRestore({ onClose, onRestoreComplete }: BackupRestoreProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const backup = await exportBackup();
      downloadBackup(backup);
      setSuccess(`Backup exported successfully! ${backup.metadata.expenseCount} expenses saved.`);
    } catch (err) {
      setError('Failed to export backup. Please try again.');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setBackupData(null);

    try {
      const backup = await parseBackupFile(file);
      setBackupData(backup);
      setSuccess('Backup file loaded successfully! Review and import below.');
    } catch (err) {
      setError((err as Error).message || 'Failed to parse backup file');
      console.error('Parse error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!backupData) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await importBackup(backupData, importMode);
      setSuccess(
        `Backup imported successfully! ${result.imported.expenses} expenses and ${result.imported.budgets} budgets restored.`
      );
      setBackupData(null);
      
      // Notify parent to refresh data
      setTimeout(() => {
        onRestoreComplete();
        onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to import backup. Please try again.');
      console.error('Import error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full dark:[&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              💾 Backup & Restore
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Export your data or restore from a previous backup
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
            </div>
          )}

          {/* Export Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span>📤</span> Export Backup
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Download all your expenses, budgets, and settings as a single JSON file. Keep this file safe
              to restore your data later.
            </p>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium shadow-md hover:shadow-lg"
            >
              {loading ? 'Exporting...' : '📥 Download Backup'}
            </button>
          </div>

          {/* Import Section */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span>📥</span> Import Backup
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Restore your data from a previously exported backup file. Choose whether to merge with existing
              data or replace everything.
            </p>

            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium shadow-md hover:shadow-lg"
            >
              {loading ? 'Loading...' : '📂 Select Backup File'}
            </button>

            {/* Backup Preview */}
            {backupData && (
              <div className="mt-6 space-y-4">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Backup Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Export Date:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(backupData.exportDate), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Version:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {backupData.version}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Expenses:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {backupData.metadata.expenseCount}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Budgets:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {backupData.metadata.budgetCount}
                      </p>
                    </div>
                    {backupData.metadata.dateRange.earliest && (
                      <>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Earliest:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {format(new Date(backupData.metadata.dateRange.earliest), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Latest:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {format(new Date(backupData.metadata.dateRange.latest!), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Import Mode Selection */}
                <div className="space-y-3">
                  <label className="font-medium text-gray-900 dark:text-white block">
                    Import Mode:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/10 transition">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={(e) => setImportMode(e.target.value as 'merge')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Merge with existing data
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Keep your current expenses and add the backup data
                        </div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 border-2 border-red-300 dark:border-red-700 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={(e) => setImportMode(e.target.value as 'replace')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-red-900 dark:text-red-200">
                          Replace all data
                        </div>
                        <div className="text-sm text-red-700 dark:text-red-300">
                          ⚠️ Delete everything and restore only from backup
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Import Button */}
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium shadow-md hover:shadow-lg"
                >
                  {loading ? 'Importing...' : '✅ Import Backup'}
                </button>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              💡 Tips
            </h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Export backups regularly to prevent data loss</li>
              <li>Backup files are stored as JSON and contain all your data</li>
              <li>Use "Merge" mode to combine multiple backups</li>
              <li>Use "Replace" mode for a clean restore from scratch</li>
              <li>Keep backup files in a safe location (cloud storage, USB drive)</li>
            </ul>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
