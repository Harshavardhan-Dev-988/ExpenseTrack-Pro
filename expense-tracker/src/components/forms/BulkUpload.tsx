import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CategoryType, PaymentMethod } from '../../types';import { CATEGORY_LABELS } from '../../utils/constants';
interface BulkUploadProps {
  onUpload: (expenses: Array<{
    date: Date;
    amount: number;
    category: CategoryType;
    description: string;
    paymentMethod?: PaymentMethod;
    tags?: string[];
  }>) => Promise<void>;
  onCancel: () => void;
}

export default function BulkUpload({ onUpload, onCancel }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setPreview([]);
    setIsProcessing(true);

    try {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      let parsedData: any[] = [];

      if (fileExt === 'csv') {
        parsedData = await parseCSV(selectedFile);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        parsedData = await parseExcel(selectedFile);
      } else if (fileExt === 'json') {
        parsedData = await parseJSON(selectedFile);
      } else {
        throw new Error('Unsupported file format. Please use CSV, Excel, or JSON.');
      }

      setPreview(parsedData.slice(0, 10)); // Show first 10 rows
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('CSV parsing error'));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => reject(error),
      });
    });
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (err) {
          reject(new Error('Excel parsing error'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseJSON = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          resolve(Array.isArray(jsonData) ? jsonData : [jsonData]);
        } catch (err) {
          reject(new Error('Invalid JSON format'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  };

  const handleUpload = async () => {
    if (!file || preview.length === 0) return;

    setIsProcessing(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      let allData: any[] = [];

      if (fileExt === 'csv') {
        allData = await parseCSV(file);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        allData = await parseExcel(file);
      } else if (fileExt === 'json') {
        allData = await parseJSON(file);
      }

      // Create reverse mapping for category labels to keys
      const categoryLabelToKey: Record<string, CategoryType> = {};
      Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
        categoryLabelToKey[label] = key as CategoryType;
      });

      // Transform data to match expense format
      const expenses = allData.map((row) => {
        const rawCategory = row.category || row.Category;
        // Try to match as key first, then as label (for legacy exports)
        let category = rawCategory as CategoryType;
        if (categoryLabelToKey[rawCategory]) {
          category = categoryLabelToKey[rawCategory];
        }
        
        return {
          date: new Date(row.date || row.Date),
          amount: parseFloat(row.amount || row.Amount),
          category,
          description: row.description || row.Description || '',
          paymentMethod: (row.paymentMethod || row['Payment Method'] || 'cash') as PaymentMethod,
          tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : undefined,
        };
      });

      // Validate expenses
      const validExpenses = expenses.filter((exp) => 
        exp.date instanceof Date && !isNaN(exp.date.getTime()) &&
        !isNaN(exp.amount) && exp.amount > 0 &&
        exp.category && exp.description
      );

      if (validExpenses.length === 0) {
        throw new Error('No valid expenses found in file');
      }

      await onUpload(validExpenses);
    } catch (err: any) {
      setError(err.message || 'Failed to upload expenses');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Bulk Upload Expenses</h2>
          
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File (CSV, Excel, or JSON)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Expected columns: date, amount, category, description, paymentMethod (optional), tags (optional)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Preview (first 10 rows)
              </h3>
              <div className="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.date || row.Date}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.amount || row.Amount}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.category || row.Category}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{row.description || row.Description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={isProcessing || preview.length === 0}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Upload Expenses'}
            </button>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
