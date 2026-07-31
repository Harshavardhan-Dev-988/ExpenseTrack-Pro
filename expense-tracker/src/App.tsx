import { useState, useEffect, useMemo, Fragment } from 'react';
import { useExpenses } from './hooks/useExpenses';
import { useSettings } from './hooks/useSettings';
import { useAnalytics } from './hooks/useAnalytics';
import ExpenseForm from './components/forms/ExpenseForm';
import ExpenseList from './components/expenses/ExpenseList';
import ExpenseFilters from './components/expenses/ExpenseFilters';
import CategoryPieChart from './components/charts/CategoryPieChart';
import MonthlyTrendChart from './components/charts/MonthlyTrendChart';
import PaymentMethodChart from './components/charts/PaymentMethodChart';
import DailyExpensesChart from './components/charts/DailyExpensesChart';
import BulkUpload from './components/forms/BulkUpload';
import ExportMenu from './components/export/ExportMenu';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import BudgetManager from './components/budgets/BudgetManager';
import BudgetAlerts from './components/budgets/BudgetAlerts';
import BudgetsView from './components/budgets/BudgetsView';
import BackupRestore from './components/backup/BackupRestore';
import PDFReportGenerator from './components/reports/PDFReportGenerator';
import SavingsTracker from './components/savings/SavingsTracker';
import { generateId } from './utils/helpers';
import { db } from './services/db';
import { CATEGORY_LABELS } from './utils/constants';
import type { Expense, CategoryType, PaymentMethod, CategoryBudget } from './types';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

function App() {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'expenses' | 'budgets' | 'savings' | 'analytics'>('dashboard');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [dashboardDateRange, setDashboardDateRange] = useState<{
    type: 'all' | 'month' | 'year' | 'today' | 'custom';
    startDate?: string;
    endDate?: string;
    month?: string; // Format: YYYY-MM
    year?: string; // Format: YYYY
  }>({
    type: 'all',
  });
  const [filters, setFilters] = useState<{
    searchText: string;
    categories: CategoryType[];
    paymentMethods: PaymentMethod[];
    dateFrom: string;
    dateTo: string;
    minAmount: string;
    maxAmount: string;
  }>({
    searchText: '',
    categories: [],
    paymentMethods: [],
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });

  // Load budgets
  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const budgetsData = await db.getAllBudgets();
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Failed to load budgets:', error);
    }
  };

  const { settings, loading: settingsLoading, error: settingsError } = useSettings();
  const { expenses, loading: expensesLoading, error: expensesError, addExpense, addExpenses, updateExpense, deleteExpense } = useExpenses();

  // Calculate current month spending by category for budget alerts
  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return expenses
      .filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<CategoryType, number>);
  }, [expenses]);
  
  // Generate dynamic title for expense list based on active filters
  const getExpenseListTitle = () => {
    const filterParts: string[] = [];

    if (filters.searchText) {
      filterParts.push(`"${filters.searchText}"`);
    }

    if (filters.categories.length > 0) {
      if (filters.categories.length === 1) {
        filterParts.push(CATEGORY_LABELS[filters.categories[0]] || filters.categories[0]);
      } else if (filters.categories.length <= 3) {
        filterParts.push(filters.categories.map(cat => CATEGORY_LABELS[cat] || cat).join(', '));
      } else {
        filterParts.push(`${filters.categories.length} Categories`);
      }
    }

    if (filters.paymentMethods.length > 0) {
      if (filters.paymentMethods.length === 1) {
        const methodMap: Record<PaymentMethod, string> = {
          cash: 'Cash',
          card: 'Card',
          upi: 'UPI',
          netbanking: 'Net Banking',
          cheque: 'Cheque',
          other: 'Other'
        };
        filterParts.push(methodMap[filters.paymentMethods[0]]);
      } else {
        filterParts.push(`${filters.paymentMethods.length} Payment Methods`);
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom && filters.dateTo) {
        filterParts.push(`${format(new Date(filters.dateFrom), 'MMM dd, yyyy')} - ${format(new Date(filters.dateTo), 'MMM dd, yyyy')}`);
      } else if (filters.dateFrom) {
        filterParts.push(`From ${format(new Date(filters.dateFrom), 'MMM dd, yyyy')}`);
      } else if (filters.dateTo) {
        filterParts.push(`Until ${format(new Date(filters.dateTo), 'MMM dd, yyyy')}`);
      }
    }

    if (filters.minAmount || filters.maxAmount) {
      if (filters.minAmount && filters.maxAmount) {
        filterParts.push(`₹${filters.minAmount} - ₹${filters.maxAmount}`);
      } else if (filters.minAmount) {
        filterParts.push(`≥ ₹${filters.minAmount}`);
      } else if (filters.maxAmount) {
        filterParts.push(`≤ ₹${filters.maxAmount}`);
      }
    }

    if (filterParts.length === 0) {
      return 'Recent Expenses';
    }

    return `Expenses: ${filterParts.join(' • ')}`;
  };

  // Filter expenses based on current filters
  const filteredExpenses = expenses.filter(expense => {
    // Search text filter
    if (filters.searchText && !expense.description.toLowerCase().includes(filters.searchText.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(expense.category)) {
      return false;
    }
    
    // Payment method filter
    if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(expense.paymentMethod || 'cash')) {
      return false;
    }
    
    // Date from filter
    if (filters.dateFrom && new Date(expense.date) < new Date(filters.dateFrom)) {
      return false;
    }
    
    // Date to filter
    if (filters.dateTo && new Date(expense.date) > new Date(filters.dateTo)) {
      return false;
    }
    
    // Min amount filter
    if (filters.minAmount && expense.amount < parseFloat(filters.minAmount)) {
      return false;
    }
    
    // Max amount filter
    if (filters.maxAmount && expense.amount > parseFloat(filters.maxAmount)) {
      return false;
    }
    
    return true;
  });
  
  // Filter expenses for dashboard based on date range
  const dashboardExpenses = useMemo(() => {
    const now = new Date();
    
    switch (dashboardDateRange.type) {
      case 'today':
        const today = format(now, 'yyyy-MM-dd');
        return expenses.filter(e => format(new Date(e.date), 'yyyy-MM-dd') === today);
        
      case 'month':
        if (dashboardDateRange.month) {
          const [year, month] = dashboardDateRange.month.split('-');
          const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
          const monthEnd = endOfMonth(monthStart);
          return expenses.filter(e => {
            const expDate = new Date(e.date);
            return expDate >= monthStart && expDate <= monthEnd;
          });
        }
        // Default to current month if no month specified
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        return expenses.filter(e => {
          const expDate = new Date(e.date);
          return expDate >= currentMonthStart && expDate <= currentMonthEnd;
        });
        
      case 'year':
        if (dashboardDateRange.year) {
          const yearStart = new Date(parseInt(dashboardDateRange.year), 0, 1);
          const yearEnd = endOfYear(yearStart);
          return expenses.filter(e => {
            const expDate = new Date(e.date);
            return expDate >= yearStart && expDate <= yearEnd;
          });
        }
        // Default to current year if no year specified
        const currentYearStart = startOfYear(now);
        const currentYearEnd = endOfYear(now);
        return expenses.filter(e => {
          const expDate = new Date(e.date);
          return expDate >= currentYearStart && expDate <= currentYearEnd;
        });
        
      case 'custom':
        return expenses.filter(e => {
          const expDate = new Date(e.date);
          const matchesStart = !dashboardDateRange.startDate || expDate >= new Date(dashboardDateRange.startDate);
          const matchesEnd = !dashboardDateRange.endDate || expDate <= new Date(dashboardDateRange.endDate);
          return matchesStart && matchesEnd;
        });
        
      case 'all':
      default:
        return expenses;
    }
  }, [expenses, dashboardDateRange]);
  
  // Get display text for current dashboard date range
  const getDashboardDateRangeText = () => {
    const now = new Date();
    switch (dashboardDateRange.type) {
      case 'today':
        return `Today (${format(now, 'MMM dd, yyyy')})`;
      case 'month':
        if (dashboardDateRange.month) {
          const [year, month] = dashboardDateRange.month.split('-');
          return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy');
        }
        return format(now, 'MMMM yyyy');
      case 'year':
        return dashboardDateRange.year || now.getFullYear().toString();
      case 'custom':
        const parts = [];
        if (dashboardDateRange.startDate) {
          parts.push(`From ${format(new Date(dashboardDateRange.startDate), 'MMM dd, yyyy')}`);
        }
        if (dashboardDateRange.endDate) {
          parts.push(`To ${format(new Date(dashboardDateRange.endDate), 'MMM dd, yyyy')}`);
        }
        return parts.length > 0 ? parts.join(' • ') : 'Custom Range';
      case 'all':
      default:
        return 'All Time';
    }
  };

  // Get simplified label for budget alert context  
  const getBudgetDateRangeLabel = () => {
    const now = new Date();
    switch (dashboardDateRange.type) {
      case 'today':
        return 'today';
      case 'month':
        if (dashboardDateRange.month) {
          const [year, month] = dashboardDateRange.month.split('-');
          return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy');
        }
        return 'this month';
      case 'year':
        return `year ${dashboardDateRange.year || now.getFullYear()}`;
      case 'custom':
        return 'the selected period';
      case 'all':
      default:
        return 'all time';
    }
  };
  
  const { totalExpenses, averageExpense, topCategories, categoryStats } = useAnalytics(dashboardExpenses);

  const handleAddExpense = async (expenseData: {
    date: Date;
    amount: number;
    category: any;
    description: string;
    paymentMethod?: any;
    tags?: string[];
  }) => {
    if (editingExpense) {
      // Update existing expense
      await updateExpense({
        ...editingExpense,
        ...expenseData,
        updatedAt: new Date(),
      });
      setEditingExpense(null);
    } else {
      // Add new expense
      await addExpense(expenseData);
    }
    setShowExpenseForm(false);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleBulkUpload = async (expensesData: Array<any>) => {
    // Batch import to prevent multiple re-renders
    const expensesToAdd: Expense[] = expensesData.map(expense => ({
      ...expense,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    if (addExpenses) {
      await addExpenses(expensesToAdd);
    }
    setShowBulkUpload(false);
  };

  // Show error if either service fails
  if (settingsError || expensesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow max-w-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Application</h2>
          <p className="text-gray-700 mb-4">{settingsError || expensesError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (settingsLoading || expensesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {/* Modern Logo Icon with Indian Rupee Symbol */}
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center transform hover:rotate-12 transition-transform duration-300">
                    <span className="text-3xl sm:text-4xl font-bold text-white">₹</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    ExpenseTrack Pro
                  </h1>
                  <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    <span>Smart Financial Management Dashboard</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowExpenseForm(true)}
                className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-bold shadow-lg hover:shadow-2xl transform hover:scale-105 duration-200 flex items-center justify-center gap-2.5 text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Expense</span>
              </button>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="px-5 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all font-bold shadow-lg hover:shadow-2xl transform hover:scale-105 duration-200 flex items-center justify-center gap-2.5 text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Import</span>
              </button>
              <button
                onClick={() => setShowBackupRestore(true)}
                className="px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-bold shadow-lg hover:shadow-2xl transform hover:scale-105 duration-200 flex items-center justify-center gap-2.5 text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Backup</span>
              </button>
              <div className="flex-1 sm:flex-none">
                <ExportMenu
                  expenses={expenses}
                  budgets={budgets}
                  totalExpenses={totalExpenses}
                  averageExpense={averageExpense}
                  categoryStats={categoryStats}
                  onPDFExport={() => setShowPDFGenerator(true)}
                />
              </div>
            </div>
          </div>

          {/* View Switcher - Enhanced with SVG Icons */}
          <div className="flex gap-1 sm:gap-2 bg-gray-100/50 dark:bg-gray-800/30 rounded-xl p-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 font-semibold rounded-lg transition-all duration-200 text-sm whitespace-nowrap ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setCurrentView('expenses')}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 font-semibold rounded-lg transition-all duration-200 text-sm whitespace-nowrap ${
                currentView === 'expenses'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Expenses</span>
            </button>
            <button
              onClick={() => setCurrentView('budgets')}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 font-semibold rounded-lg transition-all duration-200 text-sm whitespace-nowrap ${
                currentView === 'budgets'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Budgets</span>
            </button>
            <button
              onClick={() => setCurrentView('savings')}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 font-semibold rounded-lg transition-all duration-200 text-sm whitespace-nowrap ${
                currentView === 'savings'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span>Savings</span>
            </button>
            <button
              onClick={() => setCurrentView('analytics')}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 font-semibold rounded-lg transition-all duration-200 text-sm whitespace-nowrap ${
                currentView === 'analytics'
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30 scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span>Advanced Analytics</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Advanced Analytics View */}
        {currentView === 'analytics' && (
          <AnalyticsDashboard expenses={expenses} />
        )}

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <>
            {/* Budget Alerts - Only show if there are actual warnings or exceeded budgets */}
            {(() => {
              // Calculate budget alerts
              const categorySpending = dashboardExpenses.reduce((acc, expense) => {
                acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
                return acc;
              }, {} as Record<CategoryType, number>);

              const hasAlerts = budgets.some(budget => {
                if (!budget.isActive) return false;
                
                const spent = categorySpending[budget.category] || 0;
                const budgetTypeValue = budget.budgetType || 'monthly';
                const limit = budgetTypeValue === 'monthly' 
                  ? (budget.monthlyLimit || 0) 
                  : (budget.yearlyLimit || 0);
                const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                
                // Return true if warning (>= threshold) or exceeded (>= 100%)
                return percentage >= budget.alertThreshold;
              });

              // Only render BudgetAlerts if there are actual warnings or exceeded budgets
              return hasAlerts ? (
                <div className="mb-4">
                  <BudgetAlerts
                    budgets={budgets}
                    expenses={dashboardExpenses}
                    onManageBudgets={() => setCurrentView('budgets')}
                    dateRangeType={dashboardDateRange.type}
                    dateRangeLabel={getBudgetDateRangeLabel()}
                    showOnlyAlerts={true}
                  />
                </div>
              ) : null;
            })()}

            {/* Compact Date Range Selector */}
            <div className="mb-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Period Label and Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">📅</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setDashboardDateRange({ type: 'all' })}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                        dashboardDateRange.type === 'all'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setDashboardDateRange({ type: 'today' })}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                        dashboardDateRange.type === 'today'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setDashboardDateRange({ type: 'month' })}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                        dashboardDateRange.type === 'month'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setDashboardDateRange({ type: 'year' })}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                        dashboardDateRange.type === 'year'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Year
                    </button>
                    <button
                      onClick={() => setDashboardDateRange({ type: 'custom' })}
                      className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                        dashboardDateRange.type === 'custom'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Month Selector */}
                {dashboardDateRange.type === 'month' && (
                  <Fragment key="month-selector">
                    <span className="text-gray-400 dark:text-gray-600">|</span>
                    <input
                      type="month"
                      value={dashboardDateRange.month || format(new Date(), 'yyyy-MM')}
                      onChange={(e) => setDashboardDateRange({ type: 'month', month: e.target.value })}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </Fragment>
                )}

                {/* Year Selector */}
                {dashboardDateRange.type === 'year' && (
                  <Fragment key="year-selector">
                    <span className="text-gray-400 dark:text-gray-600">|</span>
                    <select
                      value={dashboardDateRange.year || new Date().getFullYear().toString()}
                      onChange={(e) => setDashboardDateRange({ type: 'year', year: e.target.value })}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none relative z-10"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </Fragment>
                )}

                {/* Custom Date Range */}
                {dashboardDateRange.type === 'custom' && (
                  <Fragment key="custom-selector">
                    <span className="text-gray-400 dark:text-gray-600">|</span>
                    <input
                      type="date"
                      value={dashboardDateRange.startDate || ''}
                      onChange={(e) => setDashboardDateRange({ ...dashboardDateRange, type: 'custom', startDate: e.target.value })}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                    <input
                      type="date"
                      value={dashboardDateRange.endDate || ''}
                      onChange={(e) => setDashboardDateRange({ ...dashboardDateRange, type: 'custom', endDate: e.target.value })}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </Fragment>
                )}

                {/* Summary Info - Compact */}
                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {getDashboardDateRangeText()}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full whitespace-nowrap">
                    {dashboardExpenses.length} txn{dashboardExpenses.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* No Data Message */}
            {dashboardExpenses.length === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center mb-8">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Expenses Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {dashboardDateRange.type === 'all'
                    ? "You haven't added any expenses yet. Click 'Add Expense' to get started!"
                    : `No expenses found for ${getDashboardDateRangeText()}. Try selecting a different time period.`}
                </p>
                {dashboardDateRange.type !== 'all' && (
                  <button
                    onClick={() => setDashboardDateRange({ type: 'all' })}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 duration-200 font-semibold"
                  >
                    View All Time
                  </button>
                )}
              </div>
            )}

            {/* Summary Cards */}
            {dashboardExpenses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Expenses
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(totalExpenses)}
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Transactions
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {dashboardExpenses.length}
                </p>
              </div>
              <div className="text-3xl">📝</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Average Expense
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  }).format(averageExpense)}
                </p>
              </div>
              <div className="text-3xl">💳</div>
            </div>
          </div>
        </div>
            )}

        {/* Quick Insights Section */}
        {dashboardExpenses.length > 0 && (() => {
          // Calculate insights
          const sortedByAmount = [...dashboardExpenses].sort((a, b) => b.amount - a.amount);
          const largestExpense = sortedByAmount[0];
          
          const dayOfWeekSpending = dashboardExpenses.reduce((acc, exp) => {
            const day = new Date(exp.date).getDay();
            acc[day] = (acc[day] || 0) + exp.amount;
            return acc;
          }, {} as Record<number, number>);
          const maxDaySpending = Math.max(...Object.values(dayOfWeekSpending));
          const maxDay = Object.entries(dayOfWeekSpending)
            .find(([, amount]) => amount === maxDaySpending);
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          // Calculate spending velocity (daily burn rate) - from first expense to today
          const sortedByDate = [...dashboardExpenses].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const firstDate = sortedByDate.length > 0 ? new Date(sortedByDate[0].date) : new Date();
          const today = new Date();
          const daysDiff = Math.max(1, Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          const dailyBurnRate = totalExpenses / daysDiff;
          const avgPerTransaction = dashboardExpenses.length > 0 ? totalExpenses / dashboardExpenses.length : 0;
          
          // Budget health score
          const activeBudgets = budgets.filter(b => b.isActive);
          let budgetHealth = 100;
          if (activeBudgets.length > 0) {
            const categorySpending = dashboardExpenses.reduce((acc, exp) => {
              acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
              return acc;
            }, {} as Record<string, number>);
            
            const exceededCount = activeBudgets.filter(budget => {
              const spent = categorySpending[budget.category] || 0;
              const limit = budget.budgetType === 'yearly' ? budget.yearlyLimit : budget.monthlyLimit;
              return limit && spent > limit;
            }).length;
            
            budgetHealth = activeBudgets.length > 0 
              ? Math.round(((activeBudgets.length - exceededCount) / activeBudgets.length) * 100)
              : 100;
          }

          return (
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-xl">💡</span>
                <span>Quick Insights</span>
              </h3>
              
              <div className="grid grid-cols-4 gap-3">
                {/* Daily Burn Rate */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-3 shadow-sm border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-2xl">🔥</div>
                    <div className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 rounded-full font-medium">
                      Daily
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Burn Rate
                  </p>
                  <p className="text-base font-bold text-orange-900 dark:text-orange-100 leading-tight">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(dailyBurnRate)}
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                    Since {format(firstDate, 'MMM d')}
                  </p>
                </div>

                {/* Average Per Transaction */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-3 shadow-sm border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-2xl">💳</div>
                    <div className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                      Avg
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Per Transaction
                  </p>
                  <p className="text-base font-bold text-emerald-900 dark:text-emerald-100 leading-tight">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(avgPerTransaction)}
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                    {dashboardExpenses.length} txn{dashboardExpenses.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Largest Transaction */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 shadow-sm border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-2xl">💎</div>
                    <div className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded-full font-medium">
                      Peak
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Largest Expense
                  </p>
                  <p className="text-base font-bold text-purple-900 dark:text-purple-100 leading-tight">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(largestExpense.amount)}
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {largestExpense.description}
                  </p>
                </div>

                {/* Most Active Day / Budget Health */}
                {maxDay ? (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-3 shadow-sm border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl">📅</div>
                      <div className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                        Pattern
                      </div>
                    </div>
                    <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Most Active Day
                    </p>
                    <p className="text-base font-bold text-blue-900 dark:text-blue-100 leading-tight">
                      {dayNames[parseInt(maxDay[0])]}
                    </p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(maxDay[1])}
                    </p>
                  </div>
                ) : activeBudgets.length > 0 ? (
                  <div className={`bg-gradient-to-br rounded-lg p-3 shadow-sm border ${
                    budgetHealth >= 80 
                      ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                      : budgetHealth >= 60
                      ? 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl">
                        {budgetHealth >= 80 ? '✅' : budgetHealth >= 60 ? '⚠️' : '🚨'}
                      </div>
                      <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        budgetHealth >= 80
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : budgetHealth >= 60
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      }`}>
                        {budgetHealth >= 80 ? 'Good' : budgetHealth >= 60 ? 'Fair' : 'Alert'}
                      </div>
                    </div>
                    <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Budget Health
                    </p>
                    <p className={`text-base font-bold leading-tight ${
                      budgetHealth >= 80
                        ? 'text-green-900 dark:text-green-100'
                        : budgetHealth >= 60
                        ? 'text-yellow-900 dark:text-yellow-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {budgetHealth}%
                    </p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                      {activeBudgets.length} budget{activeBudgets.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })()}

        {/* Charts Section */}
        {dashboardExpenses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CategoryPieChart categoryStats={categoryStats.filter(stat => stat.total > 0)} currency={settings.currency} />
            <PaymentMethodChart expenses={dashboardExpenses} currency={settings.currency} />
          </div>
        )}

        {dashboardExpenses.length > 0 && (
          <div className="mb-8">
            <MonthlyTrendChart 
              expenses={dashboardExpenses} 
              currency={settings.currency}
              dateRangeType={dashboardDateRange.type}
              selectedMonth={dashboardDateRange.month}
              selectedYear={dashboardDateRange.year}
              customStartDate={dashboardDateRange.startDate ? new Date(dashboardDateRange.startDate) : undefined}
              customEndDate={dashboardDateRange.endDate ? new Date(dashboardDateRange.endDate) : undefined}
            />
          </div>
        )}

        {/* Daily Expenses Chart */}
        {dashboardExpenses.length > 0 && (
          <div className="mb-8">
            <DailyExpensesChart expenses={dashboardExpenses} />
          </div>
        )}

        {/* Spending Patterns & Comparison */}
        {dashboardExpenses.length > 0 && (() => {
          // Payment method breakdown
          const paymentBreakdown = dashboardExpenses.reduce((acc, exp) => {
            const method = exp.paymentMethod || 'Not Specified';
            acc[method] = (acc[method] || 0) + exp.amount;
            return acc;
          }, {} as Record<string, number>);
          
          const paymentStats = Object.entries(paymentBreakdown)
            .map(([method, amount]) => ({
              method,
              amount,
              percentage: (amount / totalExpenses) * 100,
              count: dashboardExpenses.filter(e => (e.paymentMethod || 'Not Specified') === method).length
            }))
            .sort((a, b) => b.amount - a.amount);

          // Day of week breakdown
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const daySpending = Array.from({ length: 7 }, (_, i) => {
            const dayExpenses = dashboardExpenses.filter(e => new Date(e.date).getDay() === i);
            const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
            return { day: dayNames[i], total, count: dayExpenses.length };
          });
          
          const maxDaySpend = Math.max(...daySpending.map(d => d.total));

          // Recent vs Overall comparison (last 7 days vs all time average)
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentExpenses = dashboardExpenses.filter(e => new Date(e.date) >= sevenDaysAgo);
          const recentTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
          const recentAvgDaily = recentTotal / 7;
          
          const allDays = dashboardExpenses.length > 0 
            ? Math.max(1, Math.ceil((new Date(dashboardExpenses[0].date).getTime() - new Date(dashboardExpenses[dashboardExpenses.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)))
            : 1;
          const overallAvgDaily = totalExpenses / allDays;
          const changePercent = overallAvgDaily > 0 ? ((recentAvgDaily - overallAvgDaily) / overallAvgDaily) * 100 : 0;

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Day of Week Heatmap */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <span>Spending by Day of Week</span>
                </h3>
                <div className="space-y-3">
                  {daySpending.map((day) => (
                    <div key={day.day} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-12">
                          {day.day}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {day.count} txn
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 0,
                          }).format(day.total)}
                        </span>
                      </div>
                      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            day.total === maxDaySpend
                              ? 'bg-gradient-to-r from-red-500 to-pink-500'
                              : 'bg-gradient-to-r from-blue-400 to-blue-600'
                          }`}
                          style={{ width: `${maxDaySpend > 0 ? (day.total / maxDaySpend) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">💳</span>
                  <span>Payment Methods</span>
                </h3>
                <div className="space-y-4">
                  {paymentStats.slice(0, 5).map((stat, index) => {
                    const icons: Record<string, string> = {
                      cash: '💵',
                      card: '💳',
                      upi: '📱',
                      netbanking: '🏦',
                      cheque: '📝',
                      other: '💰',
                      'Not Specified': '❓'
                    };
                    
                    return (
                      <div key={stat.method} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{icons[stat.method] || '💰'}</span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white capitalize text-sm">
                                {stat.method}
                                {index === 0 && ' ⭐'}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {stat.count} transactions
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('en-IN', {
                                style: 'currency',
                                currency: 'INR',
                                minimumFractionDigits: 0,
                              }).format(stat.amount)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {stat.percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              index === 0 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                                : index === 1
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                : 'bg-gradient-to-r from-gray-400 to-gray-500'
                            }`}
                            style={{ width: `${stat.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Trend Comparison */}
              {recentExpenses.length > 0 && (
                <div className={`rounded-xl shadow-lg p-6 ${
                  changePercent > 10
                    ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
                    : changePercent < -10
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
                }`}>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📈</span>
                    <span>Recent Trend (Last 7 Days)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Recent Daily Avg</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          minimumFractionDigits: 0,
                        }).format(recentAvgDaily)}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Overall Daily Avg</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                          minimumFractionDigits: 0,
                        }).format(overallAvgDaily)}
                      </p>
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 ${
                    changePercent > 10
                      ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700'
                      : changePercent < -10
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700'
                      : 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Trend Change
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {changePercent > 10 ? '📈' : changePercent < -10 ? '📉' : '➡️'}
                        </span>
                        <span className={`text-2xl font-bold ${
                          changePercent > 10
                            ? 'text-red-700 dark:text-red-300'
                            : changePercent < -10
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {changePercent > 10
                        ? '⚠️ You\'re spending more than usual recently'
                        : changePercent < -10
                        ? '🎉 Great job! Your spending has decreased'
                        : '✓ Your spending is stable'}
                    </p>
                  </div>
                </div>
              )}

              {/* Category Concentration */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span>Spending Distribution</span>
                </h3>
                <div className="space-y-4">
                  {topCategories.slice(0, 5).map((stat, index) => {
                    const percentage = (stat.total / totalExpenses) * 100;
                    return (
                      <div key={stat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${index === 0 ? 'animate-pulse' : ''}`}>
                              {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐'}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white capitalize text-sm">
                              {stat.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              index === 0 
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                : index === 1
                                ? 'bg-gradient-to-r from-gray-300 to-gray-500'
                                : index === 2
                                ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                                : 'bg-gradient-to-r from-blue-400 to-blue-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 Top {Math.min(5, topCategories.length)} categories represent{' '}
                    <span className="font-bold text-gray-900 dark:text-white">
                      {topCategories.slice(0, 5).reduce((sum, stat) => sum + ((stat.total / totalExpenses) * 100), 0).toFixed(1)}%
                    </span>
                    {' '}of total spending
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4 flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <span>Top Spending Categories</span>
            </h2>
            <div className="space-y-4">
              {topCategories.map((stat) => (
                <div key={stat.category} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {stat.category.replace(/_/g, ' ')}
                    </p>
                    <div className="mt-1 flex items-center">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(stat.total / totalExpenses) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="ml-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        }).format(stat.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Welcome Message */}
        {expenses.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-4">🎉</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Expense Tracker!
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
              Get started by adding your first expense or importing data in bulk.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 sm:space-x-0">
              <button 
                onClick={() => setShowExpenseForm(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm sm:text-base"
              >
                Add Expense
              </button>
              <button 
                onClick={() => setShowBulkUpload(true)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm sm:text-base"
              >
                Import Data
              </button>
            </div>
          </div>
        )}

        </>
      )}

      {/* Expenses View */}
      {currentView === 'expenses' && (
        <>
          {expenses.length > 0 ? (
            <div className="mb-8">
              <ExpenseFilters filters={filters} onFilterChange={setFilters} />
              <ExpenseList
                expenses={filteredExpenses}
                onEdit={handleEditExpense}
                onDelete={deleteExpense}
                title={getExpenseListTitle()}
              />
              {filteredExpenses.length === 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 text-center">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    No expenses match your filters. Try adjusting your search criteria.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sm:p-12 text-center">
              <div className="text-4xl sm:text-6xl mb-4">📝</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No Expenses Yet
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                Start by adding your first expense or importing data in bulk.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 sm:space-x-0">
                <button 
                  onClick={() => setShowExpenseForm(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm sm:text-base"
                >
                  Add Expense
                </button>
                <button 
                  onClick={() => setShowBulkUpload(true)}
                  className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm sm:text-base"
                >
                  Import Data
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Budgets View */}
      {currentView === 'budgets' && (
        <BudgetsView
          currentSpending={currentMonthSpending}
          onBudgetsUpdate={loadBudgets}
          expenses={expenses}
        />
      )}

      {/* Savings View */}
      {currentView === 'savings' && (
        <SavingsTracker expenses={expenses} />
      )}
      </main>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          expense={editingExpense || undefined}
          onSubmit={handleAddExpense}
          onCancel={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUpload
          onUpload={handleBulkUpload}
          onCancel={() => setShowBulkUpload(false)}
        />
      )}

      {/* Budget Manager Modal */}
      {showBudgetManager && (
        <BudgetManager
          currentSpending={currentMonthSpending}
          onClose={() => {
            setShowBudgetManager(false);
            loadBudgets();
          }}
        />
      )}

      {/* Backup/Restore Modal */}
      {showBackupRestore && (
        <BackupRestore
          onClose={() => setShowBackupRestore(false)}
          onRestoreComplete={() => {
            // Reload data after restore
            window.location.reload();
          }}
        />
      )}

      {/* PDF Report Generator Modal */}
      {showPDFGenerator && (
        <PDFReportGenerator
          expenses={expenses}
          budgets={budgets}
          onClose={() => setShowPDFGenerator(false)}
        />
      )}
    </div>
  );
}

export default App;

