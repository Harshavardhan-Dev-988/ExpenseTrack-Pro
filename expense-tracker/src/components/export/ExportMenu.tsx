import { useState } from 'react';
import type { Expense, CategoryBudget } from '../../types';
import ExportService from '../../services/export';
import { CATEGORY_LABELS } from '../../utils/constants';

interface ExportMenuProps {
  expenses: Expense[];
  budgets?: CategoryBudget[];
  totalExpenses: number;
  averageExpense: number;
  categoryStats: Array<{
    category: any;
    total: number;
    count: number;
    average: number;
  }>;
  onPDFExport?: () => void;
}

export default function ExportMenu({ expenses, budgets = [], totalExpenses, averageExpense, categoryStats, onPDFExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel' | 'json') => {
    if (expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      switch (format) {
        case 'csv':
          ExportService.exportToCSV(expenses, `expenses_${timestamp}.csv`);
          break;
        case 'excel':
          ExportService.exportToExcel(expenses, budgets, `expenses_${timestamp}.xlsx`);
          break;
        case 'json':
          ExportService.exportToJSON(expenses, budgets, `expenses_${timestamp}.json`);
          break;
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummary = () => {
    if (expenses.length === 0) {
      alert('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const summary = {
        totalExpenses,
        averageExpense,
        transactionCount: expenses.length,
        categoryStats: categoryStats.map(stat => ({
          category: CATEGORY_LABELS[stat.category] || stat.category,
          total: stat.total,
          count: stat.count,
          average: stat.average,
        })),
      };

      ExportService.exportSummaryToCSV(summary as any, `expense-summary_${timestamp}.csv`);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export summary');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium shadow-md hover:shadow-lg flex items-center gap-2"
      >
        <span>📥</span>
        <span>Export</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
            <div className="p-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                📄 Export as CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                📊 Export as Excel
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                📋 Export as JSON
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              {onPDFExport && (
                <button
                  onClick={() => {
                    onPDFExport();
                    setIsOpen(false);
                  }}
                  disabled={isExporting}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  📄 Generate PDF Report
                </button>
              )}
              {onPDFExport && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
              <button
                onClick={handleExportSummary}
                disabled={isExporting}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                📈 Export Summary
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
