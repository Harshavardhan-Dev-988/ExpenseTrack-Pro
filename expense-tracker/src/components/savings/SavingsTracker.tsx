import { useState, useEffect, useMemo } from 'react';
import { db } from '../../services/db';
import { generateId, formatCurrency } from '../../utils/helpers';
import { SAVINGS_CATEGORY_LABELS } from '../../utils/constants';
import type { SavingsEntry, SavingsGoal, SavingsCategory, Expense } from '../../types';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface SavingsTrackerProps {
  expenses: Expense[];
}

export default function SavingsTracker({ expenses }: SavingsTrackerProps) {
  const [savings, setSavings] = useState<SavingsEntry[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'year'>('all');
  
  // Form states
  const [savingsForm, setSavingsForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: 'general_savings' as SavingsCategory,
    description: '',
    account: '',
    interestRate: '',
  });

  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    category: 'general_savings' as SavingsCategory,
    deadline: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });

  useEffect(() => {
    loadSavings();
    loadGoals();
  }, []);

  const loadSavings = async () => {
    try {
      const data = await db.getAllSavings();
      setSavings(data);
    } catch (error) {
      console.error('Failed to load savings:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const data = await db.getAllSavingsGoals();
      setSavingsGoals(data);
    } catch (error) {
      console.error('Failed to load savings goals:', error);
    }
  };

  const handleAddSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newSavings: SavingsEntry = {
      id: generateId(),
      date: new Date(savingsForm.date),
      amount: parseFloat(savingsForm.amount),
      category: savingsForm.category,
      description: savingsForm.description,
      account: savingsForm.account || undefined,
      interestRate: savingsForm.interestRate ? parseFloat(savingsForm.interestRate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await db.addSavings(newSavings);
      await loadSavings();
      setShowAddSavings(false);
      setSavingsForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        category: 'general_savings',
        description: '',
        account: '',
        interestRate: '',
      });
    } catch (error) {
      console.error('Failed to add savings:', error);
      alert('Failed to add savings');
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newGoal: SavingsGoal = {
      id: generateId(),
      name: goalForm.name,
      targetAmount: parseFloat(goalForm.targetAmount),
      currentAmount: 0,
      category: goalForm.category,
      deadline: goalForm.deadline ? new Date(goalForm.deadline) : undefined,
      priority: goalForm.priority,
      isActive: true,
      createdAt: new Date(),
    };

    try {
      await db.addSavingsGoal(newGoal);
      await loadGoals();
      setShowAddGoal(false);
      setGoalForm({
        name: '',
        targetAmount: '',
        category: 'general_savings',
        deadline: '',
        priority: 'medium',
      });
    } catch (error) {
      console.error('Failed to add goal:', error);
      alert('Failed to add savings goal');
    }
  };

  const handleDeleteSavings = async (id: string) => {
    if (confirm('Are you sure you want to delete this savings entry?')) {
      try {
        await db.deleteSavings(id);
        await loadSavings();
      } catch (error) {
        console.error('Failed to delete savings:', error);
      }
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      try {
        await db.deleteSavingsGoal(id);
        await loadGoals();
      } catch (error) {
        console.error('Failed to delete goal:', error);
      }
    }
  };

  // Filter savings by date range
  const filteredSavings = useMemo(() => {
    if (dateRange === 'all') return savings;
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dateRange === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    }

    return savings.filter(s => {
      const date = new Date(s.date);
      return date >= startDate && date <= endDate;
    });
  }, [savings, dateRange]);

  // Calculate insights
  const insights = useMemo(() => {
    const totalSavings = filteredSavings.reduce((sum, s) => sum + s.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const savingsRate = totalExpenses > 0 ? (totalSavings / (totalSavings + totalExpenses)) * 100 : 0;
    
    // Category breakdown
    const categoryBreakdown = filteredSavings.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + s.amount;
      return acc;
    }, {} as Record<SavingsCategory, number>);

    // Monthly average
    const monthlyAvg = filteredSavings.length > 0 
      ? totalSavings / Math.max(1, new Set(filteredSavings.map(s => format(new Date(s.date), 'yyyy-MM'))).size)
      : 0;

    return {
      totalSavings,
      totalExpenses,
      savingsRate,
      categoryBreakdown,
      monthlyAvg,
      netCashFlow: totalSavings - totalExpenses,
    };
  }, [filteredSavings, expenses]);

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">💰 Savings Tracker</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track your savings and achieve your financial goals</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddSavings(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Savings
          </button>
          <button
            onClick={() => setShowAddGoal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Add Goal
          </button>
        </div>
      </div>

      {/* Date range selector */}
      <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 w-fit">
        <button
          onClick={() => setDateRange('all')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            dateRange === 'all'
              ? 'bg-green-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setDateRange('month')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            dateRange === 'month'
              ? 'bg-green-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setDateRange('year')}
          className={`px-4 py-2 rounded-md font-medium transition-all ${
            dateRange === 'year'
              ? 'bg-green-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          This Year
        </button>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Savings</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(insights.totalSavings)}</p>
            </div>
            <svg className="w-12 h-12 opacity-30" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Savings Rate</p>
              <p className="text-2xl font-bold mt-1">{insights.savingsRate.toFixed(1)}%</p>
            </div>
            <svg className="w-12 h-12 opacity-30" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Monthly Average</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(insights.monthlyAvg)}</p>
            </div>
            <svg className="w-12 h-12 opacity-30" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg p-4 text-white shadow-lg ${
          insights.netCashFlow >= 0 ? 'from-teal-500 to-teal-600' : 'from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Net Cash Flow</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(Math.abs(insights.netCashFlow))}</p>
              <p className="text-xs opacity-80 mt-1">{insights.netCashFlow >= 0 ? 'Surplus' : 'Deficit'}</p>
            </div>
            <svg className="w-12 h-12 opacity-30" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Savings Goals */}
      {savingsGoals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Savings Goals
          </h3>
          <div className="space-y-3">
            {savingsGoals.map(goal => {
              const progress = (goal.currentAmount / goal.targetAmount) * 100;
              return (
                <div key={goal.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{goal.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{SAVINGS_CATEGORY_LABELS[goal.category]}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{progress.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      goal.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      goal.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {goal.priority.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Savings</h3>
        {filteredSavings.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No savings entries yet. Start tracking your savings!</p>
        ) : (
          <div className="space-y-2">
            {filteredSavings
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(saving => (
                <div
                  key={saving.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{saving.description}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                        {SAVINGS_CATEGORY_LABELS[saving.category]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span>📅 {format(new Date(saving.date), 'MMM dd, yyyy')}</span>
                      {saving.account && <span>🏦 {saving.account}</span>}
                      {saving.interestRate && <span>📈 {saving.interestRate}% interest</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      +{formatCurrency(saving.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteSavings(saving.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add Savings Modal */}
      {showAddSavings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Savings Entry</h3>
            <form onSubmit={handleAddSavings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={savingsForm.date}
                  onChange={e => setSavingsForm({ ...savingsForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={savingsForm.amount}
                  onChange={e => setSavingsForm({ ...savingsForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  required
                  value={savingsForm.category}
                  onChange={e => setSavingsForm({ ...savingsForm, category: e.target.value as SavingsCategory })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.entries(SAVINGS_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={savingsForm.description}
                  onChange={e => setSavingsForm({ ...savingsForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account (Optional)</label>
                <input
                  type="text"
                  value={savingsForm.account}
                  onChange={e => setSavingsForm({ ...savingsForm, account: e.target.value })}
                  placeholder="e.g., SBI FD, HDFC Savings"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest Rate % (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={savingsForm.interestRate}
                  onChange={e => setSavingsForm({ ...savingsForm, interestRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
                >
                  Add Savings
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSavings(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Savings Goal</h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  value={goalForm.name}
                  onChange={e => setGoalForm({ ...goalForm, name: e.target.value })}
                  placeholder="e.g., Emergency Fund, New Car"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={goalForm.targetAmount}
                  onChange={e => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  required
                  value={goalForm.category}
                  onChange={e => setGoalForm({ ...goalForm, category: e.target.value as SavingsCategory })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.entries(SAVINGS_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  required
                  value={goalForm.priority}
                  onChange={e => setGoalForm({ ...goalForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline (Optional)</label>
                <input
                  type="date"
                  value={goalForm.deadline}
                  onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Add Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
