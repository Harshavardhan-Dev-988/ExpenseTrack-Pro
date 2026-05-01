import { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { CategoryStats } from '../../types';
import { CATEGORY_LABELS, CATEGORY_GROUPS } from '../../utils/constants';

interface CategoryPieChartProps {
  categoryStats: CategoryStats[];
  currency: string;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#06B6D4', // cyan
  '#6366F1', // indigo
  '#F59E0B', // yellow
  '#94A3B8', // gray for others
];

export default function CategoryPieChart({ categoryStats, currency }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipHovered, setTooltipHovered] = useState(false);
  const [tooltipData, setTooltipData] = useState<any>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Group categories by their main category group
  const groupedData = CATEGORY_GROUPS.map(group => {
    const groupTotal = categoryStats
      .filter(stat => group.categories.includes(stat.category))
      .reduce((sum, stat) => sum + stat.total, 0);
    
    const groupCount = categoryStats
      .filter(stat => group.categories.includes(stat.category))
      .reduce((sum, stat) => sum + stat.count, 0);
    
    // Get subcategory details for tooltip
    const subcategories = categoryStats
      .filter(stat => group.categories.includes(stat.category) && stat.total > 0)
      .map(stat => ({
        category: stat.category,
        label: CATEGORY_LABELS[stat.category] || stat.category,
        total: stat.total,
        count: stat.count,
      }))
      .sort((a, b) => b.total - a.total);
    
    return {
      name: group.name,
      value: groupTotal,
      count: groupCount,
      color: group.color,
      subcategories, // Store subcategories for tooltip
    };
  }).filter(group => group.value > 0); // Only show groups with expenses

  const chartData = groupedData;

  const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    // Store tooltip data when active, so it persists when leaving the slice
    if (active && payload && payload.length) {
      const data = payload[0];
      if (tooltipData?.name !== data.name) {
        setTooltipData(data);
      }
    }
    
    // Show tooltip if we have stored data and user is hovering
    const shouldShowTooltip = (hoveredIndex !== null || tooltipHovered) && tooltipData;
    
    if (shouldShowTooltip) {
      const data = tooltipData;
      const percentage = ((data.value / totalAmount) * 100).toFixed(1);
      const subcategories = data.payload.subcategories || [];
      
      return (
        <div 
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-2xl border-2 border-blue-500 dark:border-blue-400 max-w-md z-50"
          onMouseEnter={() => {
            if (leaveTimeoutRef.current) {
              clearTimeout(leaveTimeoutRef.current);
              leaveTimeoutRef.current = null;
            }
            setTooltipHovered(true);
            setHoveredIndex(activeIndex);
          }}
          onMouseLeave={() => {
            setTooltipHovered(false);
            // Add a small delay before hiding to allow for slight mouse movements
            leaveTimeoutRef.current = setTimeout(() => {
              setHoveredIndex(null);
              setActiveIndex(null);
              setTooltipData(null);
            }, 200);
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <p className="font-bold text-lg text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">{data.name}</p>
          
          {/* Group Summary */}
          <div className="mb-3 space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(data.value)}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Percentage: <span className="font-semibold text-gray-900 dark:text-white">{percentage}%</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transactions: <span className="font-semibold text-gray-900 dark:text-white">{data.payload.count}</span>
            </p>
          </div>
          
          {/* Subcategories Breakdown */}
          {subcategories.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">Subcategories:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {subcategories.map((sub: any, idx: number) => {
                  const subPercentage = ((sub.total / data.value) * 100).toFixed(1);
                  return (
                    <div key={idx} className="flex justify-between items-start text-xs bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{sub.label}</p>
                        <p className="text-gray-600 dark:text-gray-400">{sub.count} transaction{sub.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sub.total)}</p>
                        <p className="text-gray-600 dark:text-gray-400">{subPercentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4 max-h-32 overflow-y-auto">
        {payload.map((entry: any, index: number) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition-colors"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300 truncate text-xs">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const onPieEnter = (_: any, index: number) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setActiveIndex(index);
    setHoveredIndex(index);
    setTooltipHovered(false); // Reset tooltip hover state
  };

  const onPieLeave = () => {
    // Keep hoveredIndex set to maintain tooltip visibility
    // Give user 1000ms (1 second) to move mouse to tooltip
    // This is especially important for small pie slices
    leaveTimeoutRef.current = setTimeout(() => {
      if (!tooltipHovered) {
        setActiveIndex(null);
        setHoveredIndex(null);
        setTooltipData(null);
      }
    }, 1000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Expenses by Category
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {chartData.length} category groups • Hover for details
      </p>
      <ResponsiveContainer width="100%" height={450}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || '#94A3B8'}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                style={{
                  filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Pie>
          <Tooltip 
            content={<CustomTooltip />} 
            wrapperStyle={{ pointerEvents: 'auto', zIndex: 1000 }}
          />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
