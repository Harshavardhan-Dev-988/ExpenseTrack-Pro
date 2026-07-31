import { useState, useMemo } from 'react';
import { format, getDay, differenceInDays } from 'date-fns';
import type { Expense, CategoryType } from '../../types';
import {
  calculateYoY,
  calculateMoM,
  calculateStatistics,
  detectAnomalies,
  type YoYComparison,
  type MoMComparison,
  type StatisticalSummary,
  type AnomalyDetection,
} from '../../services/advancedAnalytics';
import { CATEGORY_LABELS } from '../../utils/constants';

interface AnalyticsDashboardProps {
  expenses: Expense[];
}

// Helper functions for insights
const getDayName = (dayIndex: number) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

const getSpendingVelocity = (expenses: Expense[]) => {
  if (expenses.length === 0) return 0;
  const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = new Date(sortedExpenses[0].date);
  const lastDate = new Date(sortedExpenses[sortedExpenses.length - 1].date);
  const daysDiff = differenceInDays(lastDate, firstDate) || 1;
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return total / daysDiff;
};

const getCategoryConcentration = (expenses: Expense[]) => {
  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<CategoryType, number>);
  
  const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const values = Object.values(categoryTotals).map(val => val / total);
  
  // Calculate Herfindahl-Hirschman Index (HHI) for concentration
  const hhi = values.reduce((sum, share) => sum + share * share, 0);
  return hhi;
};

export default function AnalyticsDashboard({ expenses }: AnalyticsDashboardProps) {
  const [selectedView, setSelectedView] = useState<'insights' | 'yoy' | 'mom' | 'stats' | 'anomalies' | 'patterns'>('insights');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Calculate analytics
  const yoyData = useMemo(() => calculateYoY(expenses, selectedYear), [expenses, selectedYear]);
  const momData = useMemo(() => calculateMoM(expenses, 12), [expenses]);
  const statsData = useMemo(() => calculateStatistics(expenses), [expenses]);
  const anomaliesData = useMemo(() => detectAnomalies(expenses, 2), [expenses]);

  // Calculate spending patterns
  const spendingPatterns = useMemo(() => {
    const dayOfWeekSpending = expenses.reduce((acc, exp) => {
      const day = getDay(new Date(exp.date));
      acc[day] = (acc[day] || 0) + exp.amount;
      return acc;
    }, {} as Record<number, number>);

    const paymentMethodSpending = expenses.reduce((acc, exp) => {
      const method = exp.paymentMethod || 'unknown';
      acc[method] = (acc[method] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    const categoryFrequency = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + 1;
      return acc;
    }, {} as Record<CategoryType, number>);

    const mostActiveDay = Object.entries(dayOfWeekSpending)
      .sort(([, a], [, b]) => b - a)[0];
    const leastActiveDay = Object.entries(dayOfWeekSpending)
      .sort(([, a], [, b]) => a - b)[0];
    const preferredPaymentMethod = Object.entries(paymentMethodSpending)
      .sort(([, a], [, b]) => b - a)[0];
    const mostFrequentCategory = Object.entries(categoryFrequency)
      .sort(([, a], [, b]) => b - a)[0];

    return {
      dayOfWeekSpending,
      paymentMethodSpending,
      categoryFrequency,
      mostActiveDay: mostActiveDay ? { day: parseInt(mostActiveDay[0]), amount: mostActiveDay[1] } : null,
      leastActiveDay: leastActiveDay ? { day: parseInt(leastActiveDay[0]), amount: leastActiveDay[1] } : null,
      preferredPaymentMethod: preferredPaymentMethod ? { method: preferredPaymentMethod[0], amount: preferredPaymentMethod[1] } : null,
      mostFrequentCategory: mostFrequentCategory ? { category: mostFrequentCategory[0] as CategoryType, count: mostFrequentCategory[1] } : null,
    };
  }, [expenses]);

  // Calculate key insights
  const keyInsights = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const avgTransaction = total / (expenses.length || 1);
    const velocity = getSpendingVelocity(expenses);
    const concentration = getCategoryConcentration(expenses);
    
    // Largest expense
    const largestExpense = [...expenses].sort((a, b) => b.amount - a.amount)[0];
    
    // Category with highest total
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<CategoryType, number>);
    const topCategory = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)[0];

    // Recent vs older spending
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const recentTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const recentAvg = recentTotal / 30;

    return {
      total,
      avgTransaction,
      velocity,
      concentration: concentration * 100,
      largestExpense,
      topCategory: topCategory ? { category: topCategory[0] as CategoryType, amount: topCategory[1] } : null,
      recentAvg,
      diversityScore: (1 - concentration) * 100,
    };
  }, [expenses]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    expenses.forEach(e => years.add(new Date(e.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return '📈';
    if (trend === 'down') return '📉';
    return '➡️';
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-red-600 dark:text-red-400';
    if (trend === 'down') return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Data for Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add expenses to see detailed analytics and insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          📊 Advanced Analytics
        </h2>
        
        {/* View Selector */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedView('insights')}
            className={`min-w-[120px] px-4 py-2.5 rounded-lg font-medium transition whitespace-nowrap flex items-center justify-center ${
              selectedView === 'insights'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            💡 Insights
          </button>
          <button
            onClick={() => setSelectedView('patterns')}
            className={`min-w-[120px] px-4 py-2.5 rounded-lg font-medium transition whitespace-nowrap flex items-center justify-center ${
              selectedView === 'patterns'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🔄 Patterns
          </button>
          <button
            onClick={() => setSelectedView('yoy')}
            className={`min-w-[120px] px-4 py-2.5 rounded-lg font-medium transition whitespace-nowrap flex items-center justify-center ${
              selectedView === 'yoy'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📆 YoY
          </button>
          <button
            onClick={() => setSelectedView('mom')}
            className={`min-w-[120px] px-4 py-2.5 rounded-lg font-medium transition whitespace-nowrap flex items-center justify-center ${
              selectedView === 'mom'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📅 MoM
          </button>
          <button
            onClick={() => setSelectedView('stats')}
            className={`min-w-[120px] px-4 py-2.5 rounded-lg font-medium transition whitespace-nowrap flex items-center justify-center ${
              selectedView === 'stats'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📈 Statistics
          </button>
          <button
            onClick={() => setSelectedView('anomalies')}
            className={`min-w-[120px] px-4 py-2.5 rounded-lg font-medium transition whitespace-nowrap flex items-center justify-center ${
              selectedView === 'anomalies'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>🚨 Anomalies</span>
            {anomaliesData.anomalies.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {anomaliesData.anomalies.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Key Insights View */}
      {selectedView === 'insights' && (
        <div className="space-y-6">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="text-4xl">💰</div>
                <div className="text-right">
                  <p className="text-sm opacity-90">Total Spending</p>
                  <p className="text-2xl font-bold">{formatCurrency(keyInsights.total)}</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="text-4xl">📊</div>
                <div className="text-right">
                  <p className="text-sm opacity-90">Avg Transaction</p>
                  <p className="text-2xl font-bold">{formatCurrency(keyInsights.avgTransaction)}</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="text-4xl">⚡</div>
                <div className="text-right">
                  <p className="text-sm opacity-90">Daily Burn Rate</p>
                  <p className="text-2xl font-bold">{formatCurrency(keyInsights.velocity)}</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="text-4xl">🎯</div>
                <div className="text-right">
                  <p className="text-sm opacity-90">Diversity Score</p>
                  <p className="text-2xl font-bold">{keyInsights.diversityScore.toFixed(0)}%</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${keyInsights.diversityScore}%` }}></div>
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🏆</span> Top Spending Category
              </h3>
              {keyInsights.topCategory && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {CATEGORY_LABELS[keyInsights.topCategory.category] || keyInsights.topCategory.category}
                    </span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(keyInsights.topCategory.amount)}
                    </span>
                  </div>
                  <div className="relative pt-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                        style={{ width: `${(keyInsights.topCategory.amount / keyInsights.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {((keyInsights.topCategory.amount / keyInsights.total) * 100).toFixed(1)}% of total spending
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">💎</span> Largest Single Expense
              </h3>
              {keyInsights.largestExpense && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {keyInsights.largestExpense.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {CATEGORY_LABELS[keyInsights.largestExpense.category] || keyInsights.largestExpense.category}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(keyInsights.largestExpense.amount)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📅 {format(new Date(keyInsights.largestExpense.date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {((keyInsights.largestExpense.amount / keyInsights.avgTransaction)).toFixed(1)}x the average transaction
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Spending Insight */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📅</span> Last 30 Days Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Daily Average</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(keyInsights.recentAvg)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projected Monthly</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(keyInsights.recentAvg * 30)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">vs Overall Avg</p>
                <p className={`text-3xl font-bold ${keyInsights.recentAvg > keyInsights.velocity ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {keyInsights.recentAvg > keyInsights.velocity ? '+' : ''}{(((keyInsights.recentAvg - keyInsights.velocity) / keyInsights.velocity) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Spending Concentration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span> Spending Concentration Analysis
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Concentration Index</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {keyInsights.concentration < 15 ? 'Highly Diversified' :
                     keyInsights.concentration < 25 ? 'Well Balanced' :
                     keyInsights.concentration < 40 ? 'Moderately Concentrated' :
                     'Highly Concentrated'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {keyInsights.concentration.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="relative pt-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      keyInsights.concentration < 25 ? 'bg-green-500' :
                      keyInsights.concentration < 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(keyInsights.concentration, 100)}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 {keyInsights.concentration < 25 
                  ? 'Great! Your spending is well-distributed across categories.'
                  : keyInsights.concentration < 40
                  ? 'Your spending is focused on a few key categories.'
                  : 'Consider diversifying your spending across more categories for better balance.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Spending Patterns View */}
      {selectedView === 'patterns' && (
        <div className="space-y-6">
          {/* Day of Week Pattern */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📅</span> Spending by Day of Week
            </h3>
            <div className="space-y-3">
              {Object.entries(spendingPatterns.dayOfWeekSpending)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([day, amount]) => {
                  const maxAmount = Math.max(...Object.values(spendingPatterns.dayOfWeekSpending));
                  const percentage = (amount / maxAmount) * 100;
                  const isMax = amount === maxAmount;
                  const isMin = amount === Math.min(...Object.values(spendingPatterns.dayOfWeekSpending));
                  
                  return (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isMax ? 'text-red-600 dark:text-red-400' : isMin ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {getDayName(parseInt(day))} {isMax && '🔥'} {isMin && '💚'}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isMax ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                            isMin ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            'bg-gradient-to-r from-blue-500 to-cyan-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
            {spendingPatterns.mostActiveDay && spendingPatterns.leastActiveDay && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-1">Highest Spending Day</p>
                    <p className="font-bold text-lg text-red-900 dark:text-red-100">
                      {getDayName(spendingPatterns.mostActiveDay.day)}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {formatCurrency(spendingPatterns.mostActiveDay.amount)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-1">Lowest Spending Day</p>
                    <p className="font-bold text-lg text-green-900 dark:text-green-100">
                      {getDayName(spendingPatterns.leastActiveDay.day)}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {formatCurrency(spendingPatterns.leastActiveDay.amount)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">💳</span> Payment Method Preferences
            </h3>
            <div className="space-y-3">
              {Object.entries(spendingPatterns.paymentMethodSpending)
                .sort(([, a], [, b]) => b - a)
                .map(([method, amount], index) => {
                  const total = Object.values(spendingPatterns.paymentMethodSpending).reduce((sum, val) => sum + val, 0);
                  const percentage = (amount / total) * 100;
                  const icons: Record<string, string> = {
                    cash: '💵',
                    card: '💳',
                    upi: '📱',
                    netbanking: '🏦',
                    cheque: '📝',
                    other: '💰',
                    unknown: '❓'
                  };
                  
                  return (
                    <div key={method} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{icons[method] || '💰'}</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {method === 'unknown' ? 'Not Specified' : method}
                            {index === 0 && ' ⭐'}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(amount)}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            index === 0 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                            index === 1 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            'bg-gradient-to-r from-gray-400 to-gray-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Category Frequency */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">🔢</span> Most Frequent Categories
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(spendingPatterns.categoryFrequency)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([category, count], index) => (
                  <div 
                    key={category}
                    className={`rounded-lg p-4 ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-400' :
                      'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {CATEGORY_LABELS[category as CategoryType] || category}
                      </span>
                      {index === 0 && <span className="text-xl">👑</span>}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">transactions</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Year-over-Year View */}
      {selectedView === 'yoy' && (
        <div className="space-y-6">
          {/* Year Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Year Comparison
              </h3>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Overall Comparison */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Overall Comparison
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{yoyData.currentYear}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(yoyData.overall.currentYearTotal)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{yoyData.previousYear}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(yoyData.overall.previousYearTotal)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Change</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTrendIcon(yoyData.overall.trend)}</span>
                  <div>
                    <p className={`text-2xl font-bold ${getTrendColor(yoyData.overall.trend)}`}>
                      {yoyData.overall.changePercent >= 0 ? '+' : ''}
                      {yoyData.overall.changePercent.toFixed(1)}%
                    </p>
                    <p className={`text-sm ${getTrendColor(yoyData.overall.trend)}`}>
                      {formatCurrency(Math.abs(yoyData.overall.change))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Category Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {yoyData.currentYear}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {yoyData.previousYear}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {yoyData.categories
                    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
                    .map((cat) => (
                      <tr key={cat.category} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {CATEGORY_LABELS[cat.category] || cat.category || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(cat.currentYearTotal)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(cat.previousYearTotal)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${getTrendColor(cat.trend)}`}>
                          {cat.changePercent >= 0 ? '+' : ''}
                          {cat.changePercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center text-xl">
                          {getTrendIcon(cat.trend)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Month-over-Month View */}
      {selectedView === 'mom' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Average Monthly Spend
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(momData.avgMonthlySpend)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-6">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                Lowest Month
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {format(new Date(momData.lowestMonth.month + '-01'), 'MMM yyyy')}
              </p>
              <p className="text-lg text-green-700 dark:text-green-300">
                {formatCurrency(momData.lowestMonth.total)}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-6">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                Highest Month
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {format(new Date(momData.highestMonth.month + '-01'), 'MMM yyyy')}
              </p>
              <p className="text-lg text-red-700 dark:text-red-300">
                {formatCurrency(momData.highestMonth.total)}
              </p>
            </div>
          </div>

          {/* Monthly Trend Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Trend
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Change from Prev
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {momData.months.map((month) => (
                    <tr key={month.month} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {format(new Date(month.month + '-01'), 'MMMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(month.total)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${getTrendColor(month.trend)}`}>
                        {month.changePercent !== 0 && (
                          <>
                            {month.changePercent > 0 ? '+' : ''}
                            {month.changePercent.toFixed(1)}%
                          </>
                        )}
                        {month.changePercent === 0 && '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-xl">
                        {month.changePercent !== 0 && getTrendIcon(month.trend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Statistical Summary View */}
      {selectedView === 'stats' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Statistical Summary by Category
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Mean
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Median
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Min / Max
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Std Dev
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {statsData.map((stat) => (
                  <tr key={stat.category} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {CATEGORY_LABELS[stat.category] || stat.category || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      {stat.count}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(stat.total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(stat.mean)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(stat.median)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(stat.min)} / {formatCurrency(stat.max)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                      ±{formatCurrency(stat.stdDev)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anomaly Detection View */}
      {selectedView === 'anomalies' && (
        <div className="space-y-6">
          {anomaliesData.anomalies.length === 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                No Anomalies Detected
              </h3>
              <p className="text-green-700 dark:text-green-300">
                All expenses are within normal ranges for their categories.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                  🚨 {anomaliesData.anomalies.length} Unusual Expense{anomaliesData.anomalies.length !== 1 ? 's' : ''} Detected
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  These expenses are more than {anomaliesData.threshold} standard deviations from their category average.
                </p>
              </div>

              <div className="space-y-4">
                {anomaliesData.anomalies.map((anomaly, index) => {
                  const severityColors = {
                    high: 'border-red-500 bg-red-50 dark:bg-red-900/20',
                    medium: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
                    low: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
                  };

                  return (
                    <div
                      key={index}
                      className={`border-l-4 rounded-lg shadow p-6 ${severityColors[anomaly.severity]}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {anomaly.expense.description}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {CATEGORY_LABELS[anomaly.expense.category] || anomaly.expense.category || 'Unknown'} • {format(new Date(anomaly.expense.date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          anomaly.severity === 'high' ? 'bg-red-500 text-white' :
                          anomaly.severity === 'medium' ? 'bg-orange-500 text-white' :
                          'bg-yellow-500 text-gray-900'
                        }`}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Amount</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(anomaly.expense.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Category Avg</p>
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {formatCurrency(anomaly.categoryAvg)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Z-Score</p>
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {anomaly.zScore.toFixed(2)}σ
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Deviation</p>
                          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {((Math.abs(anomaly.expense.amount - anomaly.categoryAvg) / anomaly.categoryAvg) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
