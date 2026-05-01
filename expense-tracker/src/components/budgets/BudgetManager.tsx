import { useState, useEffect } from 'react';
import type { CategoryType, CategoryBudget } from '../../types';
import { CATEGORY_LABELS } from '../../utils/constants';
import { db } from '../../services/db';

interface BudgetManagerProps {
  currentSpending: Record<CategoryType, number>;
  onClose: () => void;
}

export default function BudgetManager({ currentSpending, onClose }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryType | null>(null);
  const [budgetType, setBudgetType] = useState<'monthly' | 'yearly'>('monthly');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const budgetsData = await db.getAllBudgets();
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    if (!editingCategory || !budgetLimit) return;

    setSaving(true);
    try {
      const budget: CategoryBudget = {
        category: editingCategory,
        budgetType,
        ...(budgetType === 'monthly' 
          ? { monthlyLimit: parseFloat(budgetLimit) }
          : { yearlyLimit: parseFloat(budgetLimit) }
        ),
        alertThreshold: parseFloat(alertThreshold),
        isActive: true,
      };

      await db.saveBudget(budget);
      await loadBudgets();
      setEditingCategory(null);
      setBudgetType('monthly');
      setBudgetLimit('');
      setAlertThreshold('80');
    } catch (error) {
      console.error('Failed to save budget:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async (category: CategoryType) => {
    try {
      await db.deleteBudget(category);
      await loadBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const handleEditBudget = (budget: CategoryBudget) => {
    setEditingCategory(budget.category);
    // Default to 'monthly' if budgetType is undefined (legacy budgets)
    const type = budget.budgetType || 'monthly';
    setBudgetType(type);
    const limitValue = type === 'yearly' 
      ? budget.yearlyLimit 
      : (budget.monthlyLimit || 0);
    setBudgetLimit(limitValue?.toString() || '');
    setAlertThreshold(budget.alertThreshold.toString());
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

  const categories = Object.keys(CATEGORY_LABELS) as CategoryType[];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-500">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              💰 Budget Management
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading budgets...</p>
            </div>
          ) : (
            <>
              {/* Active Budgets */}
              {budgets.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Active Budgets
                  </h3>
                  <div className="space-y-4">
                    {budgets.map(budget => {
                      const spent = currentSpending[budget.category] || 0;
                      // Default to 'monthly' for legacy budgets without budgetType
                      const budgetTypeValue = budget.budgetType || 'monthly';
                      const limit = budgetTypeValue === 'monthly' ? (budget.monthlyLimit || 0) : (budget.yearlyLimit || 0);
                      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                      
                      return (
                        <div
                          key={budget.category}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {CATEGORY_LABELS[budget.category] || budget.category}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {budgetTypeValue === 'monthly' ? '📅 Monthly' : '📆 Yearly'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {formatCurrency(spent)} / {formatCurrency(limit)}
                                <span className="ml-2">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditBudget(budget)}
                                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteBudget(budget.category)}
                                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/30"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${getProgressColor(spent, limit, budget.alertThreshold)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          
                          {/* Warning Message */}
                          {percentage >= 100 && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                              ⚠️ Budget exceeded by {formatCurrency(spent - limit)}
                            </p>
                          )}
                          {percentage >= budget.alertThreshold && percentage < 100 && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                              ⚠️ Approaching budget limit ({budget.alertThreshold}% threshold)
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add/Edit Budget Form */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingCategory ? 'Edit Budget' : 'Add New Budget'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={editingCategory || ''}
                      onChange={(e) => setEditingCategory(e.target.value as CategoryType)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      disabled={saving}
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {CATEGORY_LABELS[category] || category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Budget Type
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
                      {budgetType === 'monthly' ? 'Monthly' : 'Yearly'} Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(e.target.value)}
                      placeholder="Enter budget amount"
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
                      placeholder="80"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      disabled={saving}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Get notified when spending reaches this percentage of the budget
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveBudget}
                      disabled={!editingCategory || !budgetLimit || saving}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
                    >
                      {saving ? 'Saving...' : editingCategory ? 'Update Budget' : 'Add Budget'}
                    </button>
                    {editingCategory && (
                      <button
                        onClick={() => {
                          setEditingCategory(null);
                          setBudgetType('monthly');
                          setBudgetLimit('');
                          setAlertThreshold('80');
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
