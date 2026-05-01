// Constants for expense categories and application settings
import type { CategoryGroup, CategoryType } from '../types/index';

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { 
    name: 'Grocery & Dining', 
    icon: '🍽️', 
    categories: ['grocery', 'dine_out', 'coffee_snacks'], 
    color: '#FF6B6B' 
  },
  { 
    name: 'Fuel & Transportation', 
    icon: '🚗', 
    categories: ['fuel', 'public_transport', 'vehicle_maintenance'], 
    color: '#4ECDC4' 
  },
  { 
    name: 'Home & Bills', 
    icon: '🏠', 
    categories: ['bills_power', 'bills_wifi', 'bills_mobile', 'bills_water', 'rent_mortgage'], 
    color: '#45B7D1' 
  },
  { 
    name: 'Lifestyle & Entertainment', 
    icon: '🛍️', 
    categories: ['shopping_clothes', 'shopping_electronics', 'entertainment', 'subscriptions', 'personal_care', 'fitness_gym'], 
    color: '#FFA07A' 
  },
  { 
    name: 'Medical Expenses', 
    icon: '🏥', 
    categories: ['medical_consultation', 'medical_medicines', 'medical_tests', 'medical_hospitalization', 'medical_insurance'], 
    color: '#98D8C8' 
  },
  { 
    name: 'Gifting & Donations', 
    icon: '🎁', 
    categories: ['gifting_personal', 'gifting_festivals', 'donations_charity'], 
    color: '#F7DC6F' 
  },
  { 
    name: 'Agriculture & Farming', 
    icon: '🌾', 
    categories: ['agri_seeds_fertilizers', 'agri_equipment', 'agri_irrigation', 'agri_livestock', 'agri_labor', 'agri_land_lease', 'agri_crop_insurance', 'agri_loan_interest', 'agri_storage_transport', 'agri_other'], 
    color: '#82B74B' 
  },
  { 
    name: 'Education', 
    icon: '📚', 
    categories: ['education'], 
    color: '#9B59B6' 
  },
  { 
    name: 'Travel', 
    icon: '✈️', 
    categories: ['travel_vacation'], 
    color: '#3498DB' 
  },
  { 
    name: 'Financial & Others', 
    icon: '💰', 
    categories: ['insurance_general', 'investments_savings', 'pets', 'household_maintenance', 'other'], 
    color: '#95A5A6' 
  },
];

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  // Food & Dining
  grocery: 'Grocery',
  dine_out: 'Dining Out',
  coffee_snacks: 'Coffee & Snacks',
  
  // Transportation
  fuel: 'Fuel',
  public_transport: 'Public Transport',
  vehicle_maintenance: 'Vehicle Maintenance',
  
  // Bills & Utilities
  bills_power: 'Electricity Bill',
  bills_wifi: 'Internet Bill',
  bills_mobile: 'Mobile Bill',
  bills_water: 'Water Bill',
  rent_mortgage: 'Rent/Mortgage',
  
  // Lifestyle
  shopping_clothes: 'Clothing',
  shopping_electronics: 'Electronics',
  entertainment: 'Entertainment',
  subscriptions: 'Subscriptions',
  personal_care: 'Personal Care',
  fitness_gym: 'Fitness & Gym',
  
  // Medical
  medical_consultation: 'Doctor Consultation',
  medical_medicines: 'Medicines',
  medical_tests: 'Medical Tests',
  medical_hospitalization: 'Hospitalization',
  medical_insurance: 'Health Insurance',
  
  // Gifting
  gifting_personal: 'Personal Gifts',
  gifting_festivals: 'Festival Gifts',
  donations_charity: 'Donations & Charity',
  
  // Agriculture
  agri_seeds_fertilizers: 'Seeds & Fertilizers',
  agri_equipment: 'Farm Equipment',
  agri_irrigation: 'Irrigation',
  agri_livestock: 'Livestock',
  agri_labor: 'Farm Labor',
  agri_land_lease: 'Land Lease',
  agri_crop_insurance: 'Crop Insurance',
  agri_loan_interest: 'Loan Interest',
  agri_storage_transport: 'Storage & Transport',
  agri_other: 'Other Farm Expenses',
  
  // Education
  education: 'Education',
  
  // Travel
  travel_vacation: 'Travel & Vacation',
  
  // Financial & Others
  insurance_general: 'General Insurance',
  investments_savings: 'Investments & Savings',
  pets: 'Pet Care',
  household_maintenance: 'Household Maintenance',
  other: 'Other',
};

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  netbanking: 'Net Banking',
  cheque: 'Cheque',
  other: 'Other',
};

export const DATE_RANGE_PRESETS = {
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  last3Months: 'Last 3 Months',
  last6Months: 'Last 6 Months',
  last12Months: 'Last 12 Months',
  thisYear: 'This Year',
  lastYear: 'Last Year',
  custom: 'Custom Range',
};

export const DB_NAME = 'ExpenseTrackerDB';
export const DB_VERSION = 1;
export const EXPENSES_STORE_NAME = 'expenses';
export const CATEGORIES_STORE_NAME = 'categories';
export const SETTINGS_STORE_NAME = 'settings';
export const BUDGETS_STORE_NAME = 'budgets';
