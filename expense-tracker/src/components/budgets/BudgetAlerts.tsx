import { useMemo, useState, useEffect, memo } from 'react';
import type { CategoryBudget, Expense } from '../../types';
import { CATEGORY_LABELS } from '../../utils/constants';

interface BudgetAlertsProps {
  budgets: CategoryBudget[];
  expenses: Expense[];
  onManageBudgets: () => void;
  dateRangeType?: 'all' | 'month' | 'year' | 'today' | 'custom';
  dateRangeLabel?: string;
  persistSuccessMessage?: boolean; // Don't auto-hide in Budgets tab
  showOnlyAlerts?: boolean; // Only show when there are actual alerts (for Dashboard)
}

function BudgetAlerts({ budgets, expenses, onManageBudgets, dateRangeType = 'month', dateRangeLabel = 'this month', persistSuccessMessage = false, showOnlyAlerts = false }: BudgetAlertsProps) {
  const [showSuccessMessage, setShowSuccessMessage] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const alerts = useMemo(() => {
    console.log('BudgetAlerts: Checking alerts for date range:', dateRangeType, dateRangeLabel);
    console.log('BudgetAlerts: Total budgets:', budgets.length);
    console.log('BudgetAlerts: Total expenses provided:', expenses.length);

    // Calculate spending by category for provided expenses
    const spending = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    console.log('BudgetAlerts: Spending by category:', spending);

    // Check each budget
    const allAlerts = budgets
      .filter(budget => budget.isActive)
      .map(budget => {
        const spent = spending[budget.category] || 0;
        // Get the appropriate limit based on budget type (default to monthly for legacy budgets)
        const budgetTypeValue = budget.budgetType || 'monthly';
        const limit = budgetTypeValue === 'monthly' 
          ? (budget.monthlyLimit || 0) 
          : (budget.yearlyLimit || 0);
        const percentage = limit > 0 ? (spent / limit) * 100 : 0;
        
        return {
          budget,
          spent,
          limit,
          percentage,
          status:
            percentage >= 100
              ? 'exceeded'
              : percentage >= budget.alertThreshold
              ? 'warning'
              : 'ok',
        };
      });

    console.log('BudgetAlerts: All budget statuses:', allAlerts.map(a => ({
      category: a.budget.category,
      spent: a.spent,
      limit: a.limit,
      percentage: a.percentage.toFixed(1) + '%',
      status: a.status
    })));

    const filteredAlerts = allAlerts
      .filter(alert => alert.status !== 'ok')
      .sort((a, b) => b.percentage - a.percentage);

    console.log('BudgetAlerts: Alerts to display (non-ok):', filteredAlerts.length);

    return filteredAlerts;
  }, [budgets, expenses, dateRangeType, dateRangeLabel]);

  // Reset dismissed alerts when date range changes
  useEffect(() => {
    setDismissedAlerts(false);
    setIsVisible(true);
    setIsFadingOut(false);
  }, [dateRangeType, dateRangeLabel]);

  // Auto-dismiss alerts after 3 seconds on dashboard (when showOnlyAlerts is true)
  useEffect(() => {
    if (showOnlyAlerts && alerts.length > 0) {
      // Start fade-out at 2.5 seconds
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 2500);

      // Completely hide at 3 seconds
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setDismissedAlerts(true);
      }, 3000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [showOnlyAlerts, alerts.length, dateRangeType, dateRangeLabel]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Auto-hide success message after 5 seconds (only if not persistent)
  useEffect(() => {
    if (budgets.length > 0 && alerts.length === 0 && !persistSuccessMessage) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000); // Hide after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [budgets.length, alerts.length, persistSuccessMessage]);

  // If showOnlyAlerts is true and there are no alerts, don't render anything
  if (showOnlyAlerts && alerts.length === 0) {
    return null;
  }

  // Show positive message if no alerts but budgets exist (with auto-hide unless persistent)
  if (budgets.length > 0 && alerts.length === 0 && showSuccessMessage) {
    return (
      <div className="mb-6 animate-fade-in">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-300 dark:border-green-700 rounded-xl p-5 shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-3xl">✅</span>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 dark:text-green-100 text-lg">
                  All Budgets On Track
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Great job! You're staying within your budget limits for {dateRangeLabel}.
                </p>
                {persistSuccessMessage && budgets.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {budgets.map(budget => (
                      <div key={budget.category} className="text-xs bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 border border-green-200 dark:border-green-800">
                        <div className="font-semibold text-green-900 dark:text-green-100">
                          {CATEGORY_LABELS[budget.category] || budget.category}
                        </div>
                        <div className="text-green-700 dark:text-green-300 mt-0.5">
                          ₹0 spent • 0% used
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {!persistSuccessMessage && (
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors p-1"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (alerts.length === 0 || dismissedAlerts || !isVisible) return null;

  const exceededCount = alerts.filter((a) => a.status === 'exceeded').length;
  const warningCount = alerts.filter((a) => a.status === 'warning').length;

  return (
    <div className={`space-y-2 transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Compact Summary Banner */}
      <div className={`rounded-lg p-3 border-l-4 ${
        exceededCount > 0
          ? 'bg-red-50/50 dark:bg-red-900/10 border-red-500'
          : 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-500'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">{exceededCount > 0 ? '🚨' : '⚠️'}</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                exceededCount > 0
                  ? 'text-red-900 dark:text-red-100'
                  : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {exceededCount > 0
                  ? `${exceededCount} Budget${exceededCount !== 1 ? 's' : ''} Exceeded`
                  : `${warningCount} Budget Warning${warningCount !== 1 ? 's' : ''}`}
                {' • '}{dateRangeLabel}
              </p>
              <p className={`text-xs ${
                exceededCount > 0
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {exceededCount > 0
                  ? 'Budget limits exceeded. Consider adjusting spending.'
                  : 'Approaching budget limits. Monitor spending.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onManageBudgets}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
                exceededCount > 0
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/40'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/40'
              }`}
            >
              Manage →
            </button>
            <button
              onClick={() => setDismissedAlerts(true)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Compact Detailed Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alerts.map(({ budget, spent, limit, percentage, status }) => (
          <div
            key={budget.category}
            className={`rounded-md p-3 border ${
              status === 'exceeded'
                ? 'bg-red-50/30 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                : 'bg-yellow-50/30 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <div className="flex justify-between items-start mb-1.5">
              <h4
                className={`text-sm font-semibold ${
                  status === 'exceeded'
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-yellow-900 dark:text-yellow-100'
                }`}
              >
                {CATEGORY_LABELS[budget.category] || budget.category || 'Unknown'}
              </h4>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  status === 'exceeded'
                    ? 'bg-red-200 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : 'bg-yellow-200 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                }`}
              >
                {percentage.toFixed(0)}%
              </span>
            </div>

            <div className="space-y-1">
              <p
                className={`text-xs font-medium ${
                  status === 'exceeded'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}
              >
                {formatCurrency(spent)} / {formatCurrency(limit)}
              </p>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    status === 'exceeded' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              
              {status === 'exceeded' && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  Over by {formatCurrency(spent - limit)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders when props haven't changed
export default memo(BudgetAlerts);
