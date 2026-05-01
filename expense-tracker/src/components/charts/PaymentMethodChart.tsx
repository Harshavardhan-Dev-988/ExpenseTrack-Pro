import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import type { Expense, PaymentMethod } from '../../types';

interface PaymentMethodChartProps {
  expenses: Expense[];
  currency: string;
}

const COLORS: Record<PaymentMethod, string> = {
  cash: '#10B981',
  card: '#3B82F6',
  upi: '#8B5CF6',
  netbanking: '#F59E0B',
  cheque: '#EF4444',
  other: '#6B7280',
};

export default function PaymentMethodChart({ expenses, currency }: PaymentMethodChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Group expenses by payment method
  const paymentMethodData = expenses.reduce((acc, expense) => {
    const method = expense.paymentMethod || 'other';
    if (!acc[method]) {
      acc[method] = { total: 0, count: 0 };
    }
    acc[method].total += expense.amount;
    acc[method].count += 1;
    return acc;
  }, {} as Record<PaymentMethod, { total: number; count: number }>);

  const chartData = Object.entries(paymentMethodData).map(([method, data]) => ({
    method: method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' '),
    methodKey: method,
    total: parseFloat(data.total.toFixed(2)),
    count: data.count,
    color: COLORS[method as PaymentMethod],
  }));

  // Sort by total descending
  chartData.sort((a, b) => b.total - a.total);

  // Calculate insights
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const mostUsed = chartData[0];
  const avgPerTransaction = totalSpent / expenses.length;
  const digitalPayments = chartData
    .filter(d => ['Card', 'Upi', 'Netbanking'].includes(d.method))
    .reduce((sum, d) => sum + d.total, 0);
  const digitalPercentage = totalSpent > 0 ? (digitalPayments / totalSpent) * 100 : 0;

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
      const percentage = ((data.total / expenses.reduce((sum, e) => sum + e.amount, 0)) * 100).toFixed(1);
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.method}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Amount: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.total)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Percentage: <span className="font-medium text-gray-900 dark:text-white">{percentage}%</span>
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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Expenses by Payment Method
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Payment distribution • Hover for details
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="method"
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            name="Total Amount"
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                style={{
                  filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Insights */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
            Most Used
          </p>
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            {mostUsed?.method || 'N/A'}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {mostUsed ? formatCurrency(mostUsed.total) : '-'}
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
            Avg per Transaction
          </p>
          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
            {formatCurrency(avgPerTransaction)}
          </p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
            Digital Payments
          </p>
          <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
            {digitalPercentage.toFixed(0)}%
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-300">
            {formatCurrency(digitalPayments)}
          </p>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors cursor-pointer">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
            Payment Methods
          </p>
          <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
            {chartData.length}
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-300">
            In use
          </p>
        </div>
      </div>
    </div>
  );
}
