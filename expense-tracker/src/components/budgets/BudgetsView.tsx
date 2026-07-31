import { useState, useEffect, useMemo } from 'react';
import type { CategoryType, CategoryBudget, Expense } from '../../types';
import { CATEGORY_LABELS } from '../../utils/constants';
import { db } from '../../services/db';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import BudgetAlerts from './BudgetAlerts';

interface BudgetsViewProps {
  currentSpending: Record<CategoryType, number>;
  onBudgetsUpdate: () => void;
  expenses: Expense[];
}

export default function BudgetsView({ onBudgetsUpdate, expenses }: BudgetsViewProps) {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | ''>('');
  const [budgetType, setBudgetType] = useState<'monthly' | 'yearly'>('monthly');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  
  // Filter state for viewing budgets
  const [viewPeriod, setViewPeriod] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const budgetsData = await db.getAllBudgets();
      console.log('Loaded budgets:', budgetsData);
      
      // Migrate legacy budgets without budgetType
      const migratedBudgets = budgetsData.map(budget => {
        if (!budget.budgetType) {
          console.log('Migrating legacy budget:', budget.category);
          // If budget has monthlyLimit, it's a monthly budget
          // Otherwise default to monthly
          return {
            ...budget,
            budgetType: 'monthly' as 'monthly' | 'yearly',
            monthlyLimit: budget.monthlyLimit || 0,
          };
        }
        return budget;
      });
      
      // Save migrated budgets if any were updated
      const needsMigration = budgetsData.some(b => !b.budgetType);
      if (needsMigration) {
        console.log('Saving migrated budgets...');
        for (const budget of migratedBudgets) {
          if (!budgetsData.find(b => b.category === budget.category && b.budgetType)) {
            await db.saveBudget(budget);
          }
        }
      }
      
      setBudgets(migratedBudgets);
      onBudgetsUpdate();
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!selectedCategory || !budgetLimit) return;

    setSaving(true);
    try {
      const budget: CategoryBudget = {
        category: selectedCategory as CategoryType,
        budgetType,
        ...(budgetType === 'monthly' 
          ? { monthlyLimit: parseFloat(budgetLimit) }
          : { yearlyLimit: parseFloat(budgetLimit) }
        ),
        alertThreshold: parseFloat(alertThreshold),
        isActive: true,
      };

      console.log('Saving budget:', budget);
      await db.saveBudget(budget);
      console.log('Budget saved successfully');
      
      await loadBudgets();
      const allBudgets = await db.getAllBudgets();
      console.log('All budgets after save:', allBudgets);
      
      resetForm();
    } catch (error) {
      console.error('Failed to save budget:', error);
      alert('Failed to save budget. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async (category: CategoryType) => {
    if (!confirm(`Delete budget for ${CATEGORY_LABELS[category] || category}?`)) return;

    try {
      await db.deleteBudget(category);
      await loadBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
      alert('Failed to delete budget. Please try again.');
    }
  };

  const handleEditBudget = (budget: CategoryBudget) => {
    setEditingBudget(budget);
    setSelectedCategory(budget.category);
    // Default to 'monthly' if budgetType is undefined (legacy budgets)
    setBudgetType(budget.budgetType || 'monthly');
    const limitValue = budget.budgetType === 'yearly' 
      ? budget.yearlyLimit 
      : (budget.monthlyLimit || 0);
    setBudgetLimit(limitValue?.toString() || '');
    setAlertThreshold(budget.alertThreshold.toString());
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingBudget(null);
    setSelectedCategory('');
    setBudgetType('monthly');
    setBudgetLimit('');
    setAlertThreshold('80');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressColor = (spent: number, limit: number, threshold: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= threshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (spent: number, limit: number, threshold: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-full">Over Budget</span>;
    }
    if (percentage >= threshold) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">Warning</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">On Track</span>;
  };

  // Calculate spending for the selected period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    if (viewPeriod === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = startOfMonth(new Date(year, month - 1, 1));
      const end = endOfMonth(new Date(year, month - 1, 1));
      return expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= start && expenseDate <= end;
      });
    } else {
      const year = parseInt(selectedYear);
      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(new Date(year, 0, 1));
      return expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= start && expenseDate <= end;
      });
    }
  }, [expenses, viewPeriod, selectedMonth, selectedYear]);

  const periodSpending = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<CategoryType, number>);
  }, [filteredExpenses]);

  const categories = Object.keys(CATEGORY_LABELS) as CategoryType[];
  const availableCategories = categories.filter(
    cat => !budgets.find(b => b.category === cat) || cat === selectedCategory
  );

  const getDateRangeLabel = () => {
    if (viewPeriod === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      return format(new Date(year, month - 1, 1), 'MMMM yyyy');
    } else {
      return `Year ${selectedYear}`;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            💰 Budget Management
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Set spending limits and track your expenses by category
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium shadow-md hover:shadow-lg"
          >
            + Add New Budget
          </button>
        )}
      </div>

      {/* Period Filter */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-gray-700 dark:text-gray-300">View Budget For:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={viewPeriod}
              onChange={(e) => setViewPeriod(e.target.value as 'month' | 'year')}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium shadow-sm"
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
            
            {viewPeriod === 'month' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium shadow-sm"
              />
            ) : (
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2020"
                max="2030"
                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-medium w-32 shadow-sm"
              />
            )}
            
            <span className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium text-sm">
              {getDateRangeLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Add/Edit Budget Form */}
      {showAddForm && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingBudget ? '✏️ Edit Budget' : '➕ Add New Budget'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CategoryType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={saving}
              >
                <option value="">Select category...</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] || cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget Type *
              </label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as 'monthly' | 'yearly')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={saving}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {budgetType === 'monthly' ? 'Monthly' : 'Yearly'} Limit (₹) *
              </label>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder={budgetType === 'monthly' ? 'e.g., 10000' : 'e.g., 120000'}
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alert Threshold (%)
              </label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                min="0"
                max="100"
                step="5"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get warned at {alertThreshold}% of limit
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSaveBudget}
              disabled={!selectedCategory || !budgetLimit || saving}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              {saving ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Budgets */}
      {budgets.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {viewPeriod === 'month' ? 'Monthly' : 'Yearly'} Budgets ({budgets.filter(b => (b.budgetType || 'monthly') === (viewPeriod === 'month' ? 'monthly' : 'yearly')).length})
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {budgets.filter(b => (b.budgetType || 'monthly') !== (viewPeriod === 'month' ? 'monthly' : 'yearly')).length > 0 && (
                <span>({budgets.filter(b => (b.budgetType || 'monthly') !== (viewPeriod === 'month' ? 'monthly' : 'yearly')).length} {viewPeriod === 'month' ? 'yearly' : 'monthly'} budget{budgets.filter(b => (b.budgetType || 'monthly') !== (viewPeriod === 'month' ? 'monthly' : 'yearly')).length !== 1 ? 's' : ''} hidden)</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(budget => {
              // Calculate spending based on budget type and view period
              let spent = 0;
              let limit = 0;
              let shouldDisplay = false;
              
              // Default to 'monthly' for legacy budgets without budgetType
              const budgetTypeValue = budget.budgetType || 'monthly';
              
              if (budgetTypeValue === 'monthly') {
                limit = budget.monthlyLimit || 0;
                // Show monthly budgets when viewing month
                if (viewPeriod === 'month') {
                  spent = periodSpending[budget.category] || 0;
                  shouldDisplay = true;
                }
              } else if (budgetTypeValue === 'yearly') {
                limit = budget.yearlyLimit || 0;
                // Show yearly budgets when viewing year
                if (viewPeriod === 'year') {
                  spent = periodSpending[budget.category] || 0;
                  shouldDisplay = true;
                }
              }
              
              if (!shouldDisplay) return null;
              
              const percentage = limit > 0 ? (spent / limit) * 100 : 0;
              const remaining = limit - spent;

              return (
                <div
                  key={budget.category}
                  className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {CATEGORY_LABELS[budget.category] || budget.category || 'Unknown'}
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          (budget.budgetType || 'monthly') === 'monthly' 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                        }`}>
                          {(budget.budgetType || 'monthly') === 'monthly' ? '📅 Monthly' : '📆 Yearly'}
                        </span>
                        {getStatusBadge(spent, limit, budget.alertThreshold)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditBudget(budget)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(budget.category)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Spending Info */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Spent:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Limit:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(limit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                      <span className={`font-semibold ${remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(Math.abs(remaining))} {remaining < 0 && 'over'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-300 ${getProgressColor(spent, limit, budget.alertThreshold)} flex items-center justify-center text-xs font-medium text-white`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    >
                      {percentage >= 20 && `${percentage.toFixed(0)}%`}
                    </div>
                  </div>
                  {percentage < 20 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {percentage.toFixed(1)}% used
                    </p>
                  )}

                  {/* Warning Messages */}
                  {percentage >= 100 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                      ⚠️ Over by {formatCurrency(spent - limit)}
                    </div>
                  )}
                  {percentage >= budget.alertThreshold && percentage < 100 && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
                      ⚠️ {(100 - percentage).toFixed(0)}% remaining
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        !showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Budgets Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start by setting up a budget for any category to track your spending
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium shadow-md hover:shadow-lg"
            >
              + Create Your First Budget
            </button>
          </div>
        )
      )}

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Tips</h4>
        <ul className="space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
          <li>Set realistic monthly or yearly limits based on your income and expenses</li>
          <li>Alert threshold helps you get warnings before exceeding budgets</li>
          <li>Use the period filter to view budgets for specific months or years</li>
          <li>Budget alerts appear on the Dashboard tab when limits are approaching</li>
        </ul>
      </div>

      {/* Budget Alerts Section */}
      {budgets.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            🚨 Budget Alerts - {getDateRangeLabel()}
          </h3>
          <BudgetAlerts
            budgets={budgets.filter(b => {
              const budgetTypeValue = b.budgetType || 'monthly';
              return viewPeriod === 'month' ? budgetTypeValue === 'monthly' : budgetTypeValue === 'yearly';
            })}
            expenses={filteredExpenses}
            onManageBudgets={() => {}}
            dateRangeType={viewPeriod === 'month' ? 'month' : 'year'}
            dateRangeLabel={getDateRangeLabel()}
            persistSuccessMessage={true}
          />
        </div>
      )}
    </div>
  );
}
