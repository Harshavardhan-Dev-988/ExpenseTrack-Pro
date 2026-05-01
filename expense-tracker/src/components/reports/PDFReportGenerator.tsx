import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import {
  generatePDFReport,
  generateSimplePDFReport,
  type PDFReportConfig,
} from '../../services/pdfGenerator';
import type { Expense, CategoryBudget } from '../../types';
import CategoryPieChart from '../charts/CategoryPieChart';
import MonthlyTrendChart from '../charts/MonthlyTrendChart';
import PaymentMethodChart from '../charts/PaymentMethodChart';
import DailyExpensesChart from '../charts/DailyExpensesChart';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useSettings } from '../../hooks/useSettings';

interface PDFReportGeneratorProps {
  expenses: Expense[];
  budgets: CategoryBudget[];
  onClose: () => void;
}

export default function PDFReportGenerator({
  expenses,
  budgets,
  onClose,
}: PDFReportGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'full' | 'simple'>('simple');
  const [includeSections, setIncludeSections] = useState({
    summary: true,
    categories: true,
    trends: true,
    payments: true,
    daily: true,
  });

  // Refs for chart elements (hidden)
  const categoryChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);
  const paymentChartRef = useRef<HTMLDivElement>(null);
  const dailyChartRef = useRef<HTMLDivElement>(null);

  // Calculate analytics data for charts
  const { categoryStats } = useAnalytics(expenses);
  const { settings } = useSettings();

  const handleSectionToggle = (section: keyof typeof includeSections) => {
    setIncludeSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const captureCharts = async () => {
    const images: {
      categoryChart?: string;
      trendChart?: string;
      paymentChart?: string;
      dailyChart?: string;
    } = {};

    try {
      if (includeSections.categories && categoryChartRef.current) {
        const canvas = await html2canvas(categoryChartRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
        });
        images.categoryChart = canvas.toDataURL('image/png');
      }

      if (includeSections.trends && trendChartRef.current) {
        const canvas = await html2canvas(trendChartRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
        });
        images.trendChart = canvas.toDataURL('image/png');
      }

      if (includeSections.payments && paymentChartRef.current) {
        const canvas = await html2canvas(paymentChartRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
        });
        images.paymentChart = canvas.toDataURL('image/png');
      }

      if (includeSections.daily && dailyChartRef.current) {
        const canvas = await html2canvas(dailyChartRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
        });
        images.dailyChart = canvas.toDataURL('image/png');
      }
    } catch (err) {
      console.error('Failed to capture charts:', err);
      throw new Error('Failed to capture charts');
    }

    return images;
  };

  const handleGeneratePDF = async () => {
    setLoading(true);
    setError(null);

    try {
      const config: PDFReportConfig = {
        expenses,
        budgets,
        includeSections,
      };

      if (reportType === 'simple') {
        // Generate simple text-based report
        await generateSimplePDFReport(config);
        // Show success message briefly before closing
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Wait for charts to render properly
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Capture charts
        const chartImages = await captureCharts();

        // Validate we have at least one chart if sections are selected
        const hasCharts = Object.values(chartImages).some(img => img !== undefined);
        if (!hasCharts && !includeSections.summary) {
          throw new Error('No charts available to generate. Please select at least one section.');
        }

        // Generate full report with charts
        await generatePDFReport(config, chartImages);

        // Show success message briefly before closing
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setError((err as Error).message || 'Failed to generate PDF report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full dark:[&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              📄 Generate PDF Report
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create a comprehensive PDF report of your expenses
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Report Type Selection */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Report Type
            </h3>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
                <input
                  type="radio"
                  name="reportType"
                  value="simple"
                  checked={reportType === 'simple'}
                  onChange={(e) => setReportType(e.target.value as 'simple')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    📊 Simple Report (Recommended)
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Text-based summary with KPIs, top categories, and payment methods. Fast and
                    reliable.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
                <input
                  type="radio"
                  name="reportType"
                  value="full"
                  checked={reportType === 'full'}
                  onChange={(e) => setReportType(e.target.value as 'full')}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    📈 Full Report with Charts
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Multi-page report with captured charts and detailed insights. May take longer
                    to generate.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Section Selection (only for full report) */}
          {reportType === 'full' && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Include Sections
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  <input
                    type="checkbox"
                    checked={includeSections.summary}
                    onChange={() => handleSectionToggle('summary')}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 dark:text-white">
                    📊 Executive Summary (KPIs & Overview)
                  </span>
                </label>
                <label className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  <input
                    type="checkbox"
                    checked={includeSections.categories}
                    onChange={() => handleSectionToggle('categories')}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 dark:text-white">
                    📈 Category Analysis (Pie Chart & Breakdown)
                  </span>
                </label>
                <label className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  <input
                    type="checkbox"
                    checked={includeSections.trends}
                    onChange={() => handleSectionToggle('trends')}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 dark:text-white">
                    📉 Time Trends (Monthly Spending Chart)
                  </span>
                </label>
                <label className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  <input
                    type="checkbox"
                    checked={includeSections.payments}
                    onChange={() => handleSectionToggle('payments')}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 dark:text-white">
                    💳 Payment Methods (Distribution Chart)
                  </span>
                </label>
                <label className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30">
                  <input
                    type="checkbox"
                    checked={includeSections.daily}
                    onChange={() => handleSectionToggle('daily')}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 dark:text-white">
                    📅 Daily Expenses (Current Month Detail)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Report Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Report Info</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Expenses:</span>
                <p className="font-medium text-gray-900 dark:text-white">{expenses.length}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Date:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(new Date(), 'MMM dd, yyyy')}
                </p>
              </div>
              {expenses.length > 0 && (
                <>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Period Start:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(
                        new Date(Math.min(...expenses.map((e) => new Date(e.date).getTime()))),
                        'MMM dd, yyyy'
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Period End:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(
                        new Date(Math.max(...expenses.map((e) => new Date(e.date).getTime()))),
                        'MMM dd, yyyy'
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hidden charts for capture */}
          {reportType === 'full' && (
            <div className="hidden">
              <div ref={categoryChartRef} style={{ width: '800px', padding: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#000' }}>
                  Category Distribution
                </h3>
                <CategoryPieChart 
                  categoryStats={categoryStats.filter(stat => stat.total > 0)} 
                  currency={settings.currency} 
                />
              </div>
              <div ref={trendChartRef} style={{ width: '800px', padding: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#000' }}>
                  Monthly Spending Trend
                </h3>
                <MonthlyTrendChart expenses={expenses} currency={settings.currency} />
              </div>
              <div ref={paymentChartRef} style={{ width: '800px', padding: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#000' }}>
                  Payment Method Distribution
                </h3>
                <PaymentMethodChart expenses={expenses} currency={settings.currency} />
              </div>
              <div ref={dailyChartRef} style={{ width: '800px', padding: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#000' }}>
                  Daily Expenses (Current Month)
                </h3>
                <DailyExpensesChart expenses={expenses} />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGeneratePDF}
            disabled={loading || expenses.length === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition font-medium shadow-lg text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating PDF...
              </span>
            ) : (
              '📥 Download PDF Report'
            )}
          </button>

          {expenses.length === 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Add some expenses first to generate a report
            </p>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
