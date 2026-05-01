import { useState } from 'react';
import type { CategoryType, PaymentMethod } from '../../types';
import { CATEGORY_LABELS } from '../../utils/constants';

interface ExpenseFiltersProps {
  filters: {
    searchText: string;
    categories: CategoryType[];
    paymentMethods: PaymentMethod[];
    dateFrom: string;
    dateTo: string;
    minAmount: string;
    maxAmount: string;
  };
  onFilterChange: (filters: {
    searchText: string;
    categories: CategoryType[];
    paymentMethods: PaymentMethod[];
    dateFrom: string;
    dateTo: string;
    minAmount: string;
    maxAmount: string;
  }) => void;
}

export default function ExpenseFilters({ filters, onFilterChange }: ExpenseFiltersProps) {
  const [searchText, setSearchText] = useState(filters.searchText);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(filters.categories);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<PaymentMethod[]>(filters.paymentMethods);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);
  const [minAmount, setMinAmount] = useState(filters.minAmount);
  const [maxAmount, setMaxAmount] = useState(filters.maxAmount);
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = Object.keys(CATEGORY_LABELS) as CategoryType[];
  const paymentMethods: PaymentMethod[] = ['cash', 'card', 'upi', 'netbanking', 'cheque', 'other'];

  const handleFilterUpdate = (updates: any) => {
    const newFilters = {
      searchText,
      categories: selectedCategories,
      paymentMethods: selectedPaymentMethods,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      ...updates,
    };

    setSearchText(newFilters.searchText);
    setSelectedCategories(newFilters.categories);
    setSelectedPaymentMethods(newFilters.paymentMethods);
    setDateFrom(newFilters.dateFrom);
    setDateTo(newFilters.dateTo);
    setMinAmount(newFilters.minAmount);
    setMaxAmount(newFilters.maxAmount);

    onFilterChange(newFilters);
  };

  const handleCategoryToggle = (category: CategoryType) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    handleFilterUpdate({ categories: newCategories });
  };

  const handlePaymentMethodToggle = (method: PaymentMethod) => {
    const newMethods = selectedPaymentMethods.includes(method)
      ? selectedPaymentMethods.filter(m => m !== method)
      : [...selectedPaymentMethods, method];
    handleFilterUpdate({ paymentMethods: newMethods });
  };

  const handleClearFilters = () => {
    handleFilterUpdate({
      searchText: '',
      categories: [],
      paymentMethods: [],
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  const activeFilterCount =
    (searchText ? 1 : 0) +
    selectedCategories.length +
    selectedPaymentMethods.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleFilterUpdate({ searchText: e.target.value })}
            placeholder="Search by description..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium flex items-center gap-2"
        >
          🔍 Filters
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleFilterUpdate({ dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleFilterUpdate({ dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Amount (₹)
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => handleFilterUpdate({ minAmount: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Amount (₹)
              </label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => handleFilterUpdate({ maxAmount: e.target.value })}
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Methods
            </label>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map(method => (
                <button
                  key={method}
                  onClick={() => handlePaymentMethodToggle(method)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedPaymentMethods.includes(method)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categories ({selectedCategories.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-500">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {CATEGORY_LABELS[category] || category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
