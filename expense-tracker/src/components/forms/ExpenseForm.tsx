import { useState, useEffect } from 'react';
import type { CategoryType, PaymentMethod, Expense } from '../../types';
import { CATEGORY_GROUPS, CATEGORY_LABELS } from '../../utils/constants';

interface ExpenseFormProps {
  expense?: Expense; // Optional: for editing existing expense
  onSubmit: (expense: {
    date: Date;
    amount: number;
    category: CategoryType;
    description: string;
    paymentMethod?: PaymentMethod;
    tags?: string[];
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ExpenseForm({ expense, onSubmit, onCancel }: ExpenseFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>('grocery');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when editing
  useEffect(() => {
    if (expense) {
      setDate(new Date(expense.date).toISOString().split('T')[0]);
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDescription(expense.description);
      setPaymentMethod(expense.paymentMethod || 'cash');
      setTags(expense.tags?.join(', ') || '');
    }
  }, [expense]);

  const paymentMethods: PaymentMethod[] = ['cash', 'card', 'upi', 'netbanking', 'cheque', 'other'];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!date) newErrors.date = 'Date is required';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!category) newErrors.category = 'Category is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        date: new Date(date),
        amount: parseFloat(amount),
        category,
        description: description.trim(),
        paymentMethod,
        tags: tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      });
      
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setCategory('grocery');
      setDescription('');
      setPaymentMethod('cash');
      setTags('');
      setErrors({});
    } catch (error) {
      setErrors({ submit: 'Failed to add expense. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-gray-900/50 to-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-500 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 transform transition-all">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {expense ? '✏️ Edit Expense' : '➕ Add New Expense'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {expense ? 'Update your expense details below' : 'Fill in the details to record your expense'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span>Date *</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">⚠️ {errors.date}</p>}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <span>Amount (₹) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
                />
                {errors.amount && <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">⚠️ {errors.amount}</p>}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <span>Category *</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
              >
                {CATEGORY_GROUPS.map(group => (
                  <optgroup key={group.name} label={`${group.icon} ${group.name}`}>
                    {group.categories.map(cat => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat] || cat}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">⚠️ {errors.category}</p>}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-lg">💳</span>
                <span>Payment Method</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-lg">📝</span>
                <span>Description *</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter expense description..."
                rows={3}
                className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white resize-none transition-all"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">⚠️ {errors.description}</p>}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <span>Tags (comma separated)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., monthly, essential, personal"
                className="w-full px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white transition-all"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">💡 Add tags to organize and filter your expenses</p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border-l-4 border-red-500 flex items-start gap-2">
                <span className="text-lg">❌</span>
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? '⏳' : expense ? '✅' : '➕'}</span>
                <span>{isSubmitting ? (expense ? 'Updating...' : 'Adding...') : (expense ? 'Update Expense' : 'Add Expense')}</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-8 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all hover:border-gray-400 dark:hover:border-gray-500 flex items-center justify-center gap-2"
              >
                <span>✕</span>
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
