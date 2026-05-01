// Core Data Types

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'other';

export type CategoryType = 
  // Food & Dining (3)
  | 'grocery' 
  | 'dine_out' 
  | 'coffee_snacks'
  
  // Transportation (3)
  | 'fuel'
  | 'public_transport'
  | 'vehicle_maintenance'
  
  // Bills & Utilities (5)
  | 'bills_power' 
  | 'bills_wifi' 
  | 'bills_mobile'
  | 'bills_water'
  | 'rent_mortgage'
  
  // Lifestyle (6)
  | 'shopping_clothes'
  | 'shopping_electronics'
  | 'entertainment'
  | 'subscriptions'
  | 'personal_care'
  | 'fitness_gym'
  
  // Medical Expenses (5)
  | 'medical_consultation'
  | 'medical_medicines'
  | 'medical_tests'
  | 'medical_hospitalization'
  | 'medical_insurance'
  
  // Gifting & Donations (3)
  | 'gifting_personal'
  | 'gifting_festivals'
  | 'donations_charity'
  
  // Agriculture & Farming (10)
  | 'agri_seeds_fertilizers'
  | 'agri_equipment'
  | 'agri_irrigation'
  | 'agri_livestock'
  | 'agri_labor'
  | 'agri_land_lease'
  | 'agri_crop_insurance'
  | 'agri_loan_interest'
  | 'agri_storage_transport'
  | 'agri_other'
  
  // Education (1)
  | 'education'
  
  // Travel & Leisure (1)
  | 'travel_vacation'
  
  // Financial & Others (4)
  | 'insurance_general'
  | 'investments_savings'
  | 'pets'
  | 'household_maintenance'
  | 'other';

export interface Expense {
  id: string;                    // UUID
  date: Date;                    // Transaction date
  amount: number;                // Amount in currency
  category: CategoryType;        // Category
  description: string;           // Expense description
  paymentMethod?: PaymentMethod; // Payment type
  tags?: string[];               // Custom tags for filtering
  receiptUrl?: string;           // Optional receipt image (future)
  createdAt: Date;               // Record creation timestamp
  updatedAt: Date;               // Last update timestamp
}

// Category grouping for UI organization
export interface CategoryGroup {
  name: string;
  icon: string;
  categories: CategoryType[];
  color: string;
}

export interface CategoryBudget {
  category: CategoryType;
  monthlyLimit?: number;         // Optional: for monthly budgets
  yearlyLimit?: number;          // Optional: for yearly budgets
  budgetType: 'monthly' | 'yearly';
  alertThreshold: number;        // percentage (e.g., 80%)
  isActive: boolean;
}

export interface Settings {
  currency: 'INR' | 'USD' | 'EUR' | string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  theme: 'light' | 'dark' | 'system';
  locale: string;
}

// Analytics Types

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface CategoryStats {
  category: CategoryType;
  total: number;
  average: number;
  min: number;
  max: number;
  median: number;
  stdDev: number;
  count: number;
}

export interface YoYComparison {
  year: number;
  total: number;
  percentageChange?: number;
}

export interface MoMComparison {
  month: string;
  year: number;
  total: number;
  percentageChange?: number;
}

export interface TrendData {
  date: string;
  actual: number;
  predicted?: number;
  ma7?: number;          // 7-day moving average
  ma30?: number;         // 30-day moving average
}

export interface Anomaly {
  expense: Expense;
  deviation: number;     // Number of standard deviations from mean
  categoryAverage: number;
}

// Filter Types

export interface FilterOptions {
  dateRange?: AnalyticsDateRange;
  categories?: CategoryType[];
  amountRange?: {
    min: number;
    max: number;
  };
  paymentMethods?: PaymentMethod[];
  searchQuery?: string;
}

// Export Types

export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  dateRange?: AnalyticsDateRange;
  categories?: CategoryType[];
  includeSections?: string[];
}

// Chart Data Types

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface MultiSeriesChartData {
  name: string;
  [key: string]: string | number;
}
