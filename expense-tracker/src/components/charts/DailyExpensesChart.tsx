import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import type { Expense } from '../../types';

interface DailyExpensesChartProps {
  expenses: Expense[];
}

export default function DailyExpensesChart({ expenses }: DailyExpensesChartProps) {
  // Get available months from expenses
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach(expense => {
      const monthKey = format(new Date(expense.date), 'yyyy-MM');
      months.add(monthKey);
    });
    
    // Always include current month
    const currentMonth = format(new Date(), 'yyyy-MM');
    months.add(currentMonth);
    
    return Array.from(months).sort().reverse();
  }, [expenses]);

  // Default to most recent month with expenses, or current month
  const getDefaultMonth = () => {
    if (availableMonths.length === 0) {
      return new Date();
    }
    // Find the first month that has expenses
    const monthsWithExpenses = availableMonths.filter(month => 
      expenses.some(e => format(new Date(e.date), 'yyyy-MM') === month)
    );
    const defaultMonth = monthsWithExpenses.length > 0 ? monthsWithExpenses[0] : availableMonths[0];
    return new Date(defaultMonth + '-01');
  };

  const [selectedDate, setSelectedDate] = useState(getDefaultMonth());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Generate daily data for selected month
  const dailyData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(day => {
      const dayExpenses = expenses.filter(expense => 
        isSameDay(new Date(expense.date), day)
      );
      
      const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      return {
        date: day,
        day: format(day, 'd'),
        fullDate: format(day, 'MMM dd, yyyy'),
        total: parseFloat(total.toFixed(2)),
        count: dayExpenses.length,
      };
    });
  }, [expenses, selectedDate]);

  // Calculate insights
  const insights = useMemo(() => {
    const monthTotal = dailyData.reduce((sum, d) => sum + d.total, 0);
    const daysWithExpenses = dailyData.filter(d => d.total > 0).length;
    const avgPerDay = daysWithExpenses > 0 ? monthTotal / daysWithExpenses : 0;
    const peakDay = dailyData.reduce((max, d) => d.total > max.total ? d : max, dailyData[0]);
    const totalTransactions = dailyData.reduce((sum, d) => sum + d.count, 0);

    return {
      total: monthTotal,
      avgPerDay,
      peakDay,
      daysWithExpenses,
      totalTransactions,
    };
  }, [dailyData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.fullDate}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Amount: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.total)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Transactions: <span className="font-medium text-gray-900 dark:text-white">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Daily Expenses
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Day-by-day spending • Hover for details
          </p>
        </div>
        
        {/* Month Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Select Month
          </label>
          <select
            value={format(selectedDate, 'yyyy-MM')}
            onChange={(e) => setSelectedDate(new Date(e.target.value + '-01'))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {format(new Date(month + '-01'), 'MMMM yyyy')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            Month Total
          </p>
          <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {formatCurrency(insights.total)}
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
            Avg per Day
          </p>
          <p className="text-lg font-semibold text-green-900 dark:text-green-100">
            {formatCurrency(insights.avgPerDay)}
          </p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
            Peak Day
          </p>
          <p className="text-lg font-semibold text-purple-900 dark:text-purple-100">
            {insights.peakDay ? format(insights.peakDay.date, 'MMM d') : '-'}
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-300">
            {formatCurrency(insights.peakDay?.total || 0)}
          </p>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
            Active Days
          </p>
          <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">
            {insights.daysWithExpenses}
          </p>
        </div>
        
        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-pink-600 dark:text-pink-400 mb-1">
            Transactions
          </p>
          <p className="text-lg font-semibold text-pink-900 dark:text-pink-100">
            {insights.totalTransactions}
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="day"
            stroke="#6B7280"
            style={{ fontSize: '11px' }}
            label={{ value: 'Day of Month', position: 'insideBottom', offset: 0, fontSize: 12, fill: '#6B7280' }}
            height={60}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '11px' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={(data) => setSelectedDay(data.date)}
          >
            {dailyData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.total > 0 ? '#3B82F6' : '#E5E7EB'}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                style={{
                  filter: activeIndex === index ? 'brightness(1.2)' : 'none',
                  transition: 'all 0.3s ease',
                  cursor: entry.total > 0 ? 'pointer' : 'default',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Expense List for Selected Day */}
      {selectedDay && (() => {
        const dayExpenses = expenses.filter(expense => 
          isSameDay(new Date(expense.date), selectedDay)
        );
        
        if (dayExpenses.length === 0) return null;

        return (
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Expenses on {format(selectedDay, 'MMMM d, yyyy')} ({dayExpenses.length})
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-500">
              {dayExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {expense.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {expense.paymentMethod?.toUpperCase() || 'CASH'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
