# Plan: Lightweight Expense Tracker Dashboard

## Overview

**TL;DR**: Build a React-based, offline-first expense tracking dashboard using IndexedDB for data persistence. The app will support adhoc and bulk expense entry (CSV, Excel, JSON), provide interactive visualizations, intelligent analytics (YoY, MoM, date ranges, trend analysis, anomaly detection), and generate downloadable reports including infographic-rich PDFs with multiple chart types, CSV, Excel, and JSON.

**Approach**: Use React + Vite for fast builds, Recharts (with d3.js for advanced charts) for comprehensive visualizations, IndexedDB for robust data storage, and jsPDF + html2canvas for generating PDFs with embedded chart images. The application will be a single-page app (SPA) that runs entirely in the browser without backend dependencies.

---

## Implementation Phases

### Phase 1: Project Setup & Foundation
1. Initialize React project with Vite (fast, lightweight bundler)
2. Install dependencies: recharts, date-fns, idb, papaparse, xlsx, jspdf, html2canvas, d3 (for advanced charts), tailwindcss
3. Set up project structure: `/src/components`, `/src/services`, `/src/hooks`, `/src/utils`, `/src/types`
4. Create TypeScript interfaces for expense data model

### Phase 2: Data Layer (*parallel with Phase 1, step 4*)
5. Implement IndexedDB service for expense storage (better than LocalStorage for large datasets)
   - Create database schema with indexes on date, category, amount
   - CRUD operations for expenses
   - Bulk insert optimization
6. Implement data migration service for backup/restore
7. Create custom React hooks: `useExpenses`, `useCategories`, `useAnalytics`

### Phase 3: Expense Entry
8. Build adhoc expense entry form
   - Fields: date, amount, category, description, payment method
   - Category dropdown with 28 predefined categories (see data model below)
   - Form validation and quick-add capability
   - Support for recurring expense templates
9. Implement bulk upload functionality (*depends on step 5*)
   - File upload component supporting CSV, Excel (.xlsx), JSON
   - Parsers for each format (papaparse, xlsx library)
   - Preview with validation errors
   - Column mapping interface for flexible uploads
   - Batch insert to IndexedDB with progress indicator

### Phase 4: Dashboard & Visualizations (*depends on steps 5, 7*)
10. Create responsive dashboard layout with grid system
11. Build interactive chart components using Recharts and d3:
    - Total expenses summary cards with icons
    - Category breakdown pie/donut charts
    - Monthly trend line charts
    - Top spending categories horizontal bar chart
    - Recent transactions list with filtering
    - Gauge charts for budget utilization
    - Mini sparklines for quick trends
12. Implement advanced filters:
    - Date range picker (presets: this month, last month, last 3/6/12 months, custom)
    - Category multi-select with search
    - Amount range slider
    - Payment method filter
    - Text search by description

### Phase 5: Analytics Engine (*depends on step 7*)
13. Implement analytics service with:
    - **Basic statistics**: total, average, min, max, median, standard deviation per category
    - **YoY (Year-over-Year)**: compare same periods across years with % change
    - **MoM (Month-over-Month)**: consecutive month comparisons with trend identification
    - **Date range analytics**: custom period comparison
    - **Trend analysis**: moving averages (7-day, 30-day), linear regression predictions
    - **Anomaly detection**: flag expenses >2 standard deviations from category average
    - **Distribution analysis**: histogram binning for expense amount distribution
    - **Seasonal patterns**: detect recurring patterns (agriculture-specific)
14. Build analytics dashboard views:
    - Comparison view (YoY/MoM with visual indicators and % change)
    - Trend charts with prediction overlay and confidence intervals
    - Anomaly highlights with drill-down capability
    - Side-by-side date range comparisons
    - Statistical summary dashboard

### Phase 6: Report Generation (*depends on steps 5, 13*)
15. Implement export service for CSV, Excel, JSON formats
    - CSV export using papaparse with custom delimiter support
    - Excel export using xlsx library with formatting
    - JSON export (raw data) for backup/migration
16. Implement **infographic-rich PDF generator** using jsPDF + html2canvas:
    
    **PDF Structure (7 pages)**:
    
    **Page 1: Executive Summary Dashboard**
    - KPI Cards: Total expenses, average daily spend, highest category, expense count
    - Gauge Charts: Budget utilization meters for top 3 categories
    - Mini Trend Sparklines: Quick 30-day trend indicators
    
    **Page 2: Category Analysis**
    - Pie Chart: Overall spending distribution by category (with percentages)
    - Donut Chart: Sub-category breakdown
    - Horizontal Bar Chart: Top 10 spending categories (sorted by amount)
    - Stacked Bar Chart: Category spending by payment method
    
    **Page 3: Time-Based Trends**
    - Line Chart: Monthly spending trend (last 12 months)
    - Area Chart: Cumulative spending over selected period
    - Multi-line Chart: Compare multiple categories over time
    - Column/Bar Chart: Week-over-week or month-over-month comparison
    
    **Page 4: Statistical Analysis**
    - Histogram: Distribution of expense amounts (frequency analysis)
    - Box Plot: Statistical spread (min, max, median, quartiles) per category
    - Scatter Plot: Expense amount vs frequency pattern
    - Heat Map: Spending intensity by day of week/month
    
    **Page 5: Comparative Analytics**
    - Grouped Bar Chart: Year-over-Year comparison (2024 vs 2025 vs 2026)
    - Waterfall Chart: Month-over-Month changes with increase/decrease indicators
    - Radar/Spider Chart: Multi-category comparison across time periods
    - Bullet Chart: Actual vs budget targets
    
    **Page 6: Anomaly & Insights**
    - Highlighted Scatter Plot: Anomalies marked in red (unusual expenses)
    - Trend Line with Predictions: Historical data + forecasted trend
    - Funnel Chart: Top-to-bottom spending hierarchy
    - Table with Conditional Formatting: Color-coded expense details
    
    **Page 7: Agriculture-Specific** (if applicable)
    - Seasonal Bar Chart: Farm expenses by season/quarter
    - Stacked Area Chart: Crop cycle expense accumulation
    - Grouped Column Chart: Seeds vs Labor vs Equipment costs per season
    
    **Chart Rendering Quality**:
    - High DPI (2x scale) for sharp images
    - Anti-aliasing enabled for smooth rendering
    - Transparent backgrounds where appropriate
    - Consistent color palette across all charts
    - Color-coded categories with legends and icons
    - Data labels on charts for clarity
    - Grid lines for easy reading
    - Page numbers, headers/footers with report metadata
    - Section dividers with icons
    - Gradient backgrounds for visual appeal

17. Build report configuration modal:
    - Date range selector with presets
    - Report sections toggle (choose which pages to include)
    - Chart type selection
    - Format selection (PDF, CSV, Excel, JSON)
    - Download trigger with progress indicator
    - Email/share options (future enhancement)

### Phase 7: Enhancements & Polish (*parallel with testing*)
18. Add expense editing and deletion functionality
    - Edit modal with pre-filled form
    - Soft delete with undo capability
    - Bulk delete with confirmation
19. Implement category management (add custom categories, set budgets)
    - Category CRUD interface
    - Budget setting per category with alerts
    - Category icons/colors customization
    - Import/export category configurations
20. Add data backup/restore feature (full export/import)
    - One-click full data export to JSON
    - Import with conflict resolution
    - Automatic backup reminders
    - Cloud backup option (optional Google Drive integration)
21. Responsive design for mobile devices
    - Mobile-optimized dashboard layout
    - Touch-friendly controls
    - Swipe gestures for navigation
    - Progressive Web App (PWA) capabilities
22. Dark mode toggle
    - Theme switcher with system preference detection
    - Persistent theme selection
    - Chart color schemes adjusted for dark mode
23. Performance optimization:
    - List virtualization for large transaction lists (react-window)
    - Lazy loading for chart components
    - Memoization with React.memo and useMemo
    - Code splitting for bulk upload and PDF generation modules
    - Service Worker for offline capability

### Phase 8: Testing & Deployment
24. Test with datasets of varying sizes
    - Small dataset: 10-50 expenses
    - Medium dataset: 100-500 expenses
    - Large dataset: 1000+ expenses
    - Performance benchmarking at each level
25. Cross-browser testing
    - Chrome (latest)
    - Firefox (latest)
    - Safari (latest)
    - Edge (latest)
    - Mobile browsers (iOS Safari, Chrome Android)
26. Build production bundle with Vite
    - Optimize for production with minification
    - Tree shaking for unused code
    - Asset optimization (images, fonts)
    - Generate source maps for debugging
27. Deploy to static hosting
    - Netlify (recommended for auto-deployments)
    - Vercel
    - GitHub Pages
    - Or run locally from file system

---

## Data Model

### Expense Interface

```typescript
interface Expense {
  id: string;                    // UUID
  date: Date;                    // Transaction date
  amount: number;                // Amount in currency
  category: CategoryType;        // Category (see below)
  description: string;           // Expense description
  paymentMethod?: PaymentMethod; // Payment type
  tags?: string[];               // Custom tags for filtering
  receiptUrl?: string;           // Optional receipt image (future)
  createdAt: Date;               // Record creation timestamp
  updatedAt: Date;               // Last update timestamp
}

type PaymentMethod = 'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'other';
```

### Category Structure (28 Categories)

```typescript
type CategoryType = 
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
  | 'entertainment'              // movies, concerts, events, gaming
  | 'subscriptions'              // Netflix, Spotify, apps, magazines
  | 'personal_care'              // salon, grooming, cosmetics
  | 'fitness_gym'
  
  // Medical Expenses (5)
  | 'medical_consultation'       // doctor visits, checkups
  | 'medical_medicines'          // pharmacy, prescriptions
  | 'medical_tests'              // lab tests, diagnostics
  | 'medical_hospitalization'    // hospital bills, procedures
  | 'medical_insurance'          // health insurance premiums
  
  // Gifting & Donations (3)
  | 'gifting_personal'           // birthday, anniversary gifts
  | 'gifting_festivals'          // holiday/festival gifts
  | 'donations_charity'          // charitable donations
  
  // Agriculture & Farming (9)
  | 'agri_seeds_fertilizers'     // seeds, fertilizers, pesticides
  | 'agri_equipment'             // tools, machinery, maintenance
  | 'agri_irrigation'            // water, pump, irrigation costs
  | 'agri_livestock'             // animal feed, veterinary, care
  | 'agri_labor'                 // farm labor, wages
  | 'agri_land_lease'            // land rent/lease payments
  | 'agri_crop_insurance'        // crop/farm insurance
  | 'agri_loan_interest'         // agricultural loan payments
  | 'agri_storage_transport'     // storage, transportation of produce
  | 'agri_other'                 // other farming expenses
  
  // Education (1)
  | 'education'                  // courses, books, tuition
  
  // Travel & Leisure (1)
  | 'travel_vacation'            // flights, hotels, trips
  
  // Financial & Others (4)
  | 'insurance_general'          // vehicle, life insurance (non-health)
  | 'investments_savings'        // money moved to savings/investments
  | 'pets'                       // pet food, vet, grooming
  | 'household_maintenance'      // repairs, furniture, appliances
  | 'other';                     // uncategorized expenses
```

### Category Groups (for UI organization)

```typescript
interface CategoryGroup {
  name: string;
  icon: string;
  categories: CategoryType[];
  color: string;
}

const categoryGroups: CategoryGroup[] = [
  { name: 'Food & Dining', icon: '🍽️', categories: ['grocery', 'dine_out', 'coffee_snacks'], color: '#FF6B6B' },
  { name: 'Transportation', icon: '🚗', categories: ['fuel', 'public_transport', 'vehicle_maintenance'], color: '#4ECDC4' },
  { name: 'Home & Bills', icon: '🏠', categories: ['bills_power', 'bills_wifi', 'bills_mobile', 'bills_water', 'rent_mortgage'], color: '#45B7D1' },
  { name: 'Lifestyle', icon: '🛍️', categories: ['shopping_clothes', 'shopping_electronics', 'entertainment', 'subscriptions', 'personal_care', 'fitness_gym'], color: '#FFA07A' },
  { name: 'Medical Expenses', icon: '🏥', categories: ['medical_consultation', 'medical_medicines', 'medical_tests', 'medical_hospitalization', 'medical_insurance'], color: '#98D8C8' },
  { name: 'Gifting & Donations', icon: '🎁', categories: ['gifting_personal', 'gifting_festivals', 'donations_charity'], color: '#F7DC6F' },
  { name: 'Agriculture & Farming', icon: '🌾', categories: ['agri_seeds_fertilizers', 'agri_equipment', 'agri_irrigation', 'agri_livestock', 'agri_labor', 'agri_land_lease', 'agri_crop_insurance', 'agri_loan_interest', 'agri_storage_transport', 'agri_other'], color: '#82B74B' },
  { name: 'Education', icon: '📚', categories: ['education'], color: '#9B59B6' },
  { name: 'Travel', icon: '✈️', categories: ['travel_vacation'], color: '#3498DB' },
  { name: 'Financial & Others', icon: '💰', categories: ['insurance_general', 'investments_savings', 'pets', 'household_maintenance', 'other'], color: '#95A5A6' },
];
```

### Budget Interface

```typescript
interface CategoryBudget {
  category: CategoryType;
  monthlyLimit: number;
  alertThreshold: number;        // percentage (e.g., 80%)
  isActive: boolean;
}
```

---

## Technology Stack

### Core Stack
- **React 18** — UI framework
- **Vite** — Build tool (fast HMR, optimized builds)
- **TypeScript** — Type safety
- **TailwindCSS** (~10KB with PurgeCSS) — Utility-first styling

### Key Libraries (Total bundle: ~1.4MB with code-splitting)
- **idb** (~2KB) — IndexedDB wrapper for data persistence
- **recharts** (~120KB) — Declarative React charts
- **d3** (~70KB tree-shaken) — Advanced chart types (histogram, box plot, heat map)
- **date-fns** (~15KB tree-shaken) — Date manipulation and formatting
- **papaparse** (~45KB) — CSV parsing for bulk uploads
- **xlsx** (~600KB, code-split) — Excel file handling (.xlsx)
- **jspdf** (~200KB) — PDF generation
- **html2canvas** (~60KB) — Capture charts as images for PDF
- **react-window** (~6KB) — List virtualization for performance
- **react-router-dom** (~10KB, optional) — Client-side routing

### Development Tools
- **ESLint** — Code linting
- **Prettier** — Code formatting
- **Vitest** (optional) — Unit testing
- **Playwright** (optional) — E2E testing

---

## Verification & Testing

### Manual Testing Checklist

1. **Expense Entry**:
   - ✅ Create adhoc expenses across all 28 categories
   - ✅ Test form validation (required fields, amount format)
   - ✅ Quick-add functionality works
   - ✅ Payment method selection

2. **Bulk Upload**:
   - ✅ Upload CSV with 100+ records, verify all imported correctly
   - ✅ Upload Excel (.xlsx) file, verify parsing and import
   - ✅ Upload JSON file with sample data
   - ✅ Test column mapping for custom CSV formats
   - ✅ Verify error handling for invalid data
   - ✅ Progress indicator works during upload

3. **Dashboard & Visualizations**:
   - ✅ All charts render correctly (pie, bar, line, etc.)
   - ✅ Dashboard loads in <2s with 1000+ records
   - ✅ Filters work correctly (date range, category, amount)
   - ✅ Search by description works
   - ✅ Charts are interactive (tooltips, legends)

4. **Analytics**:
   - ✅ YoY comparison works (create expenses for 2024, 2025, 2026)
   - ✅ MoM trends display correctly (6+ months of data)
   - ✅ Date range analytics accurate
   - ✅ Anomaly detection flags unusual expenses correctly
   - ✅ Trend predictions show on charts
   - ✅ Statistical summaries (mean, median, std dev) accurate

5. **PDF Report Generation**:
   - ✅ Generate PDF report, verify all 7 pages render
   - ✅ Charts captured as high-quality images
   - ✅ Layout is clean and professional
   - ✅ All chart types display (pie, bar, line, histogram, box plot, heat map, waterfall, radar)
   - ✅ Page numbers and headers/footers present
   - ✅ PDF downloads successfully
   - ✅ File size reasonable (<5MB for typical report)

6. **Export Functionality**:
   - ✅ Export to CSV, verify data integrity
   - ✅ Export to Excel, verify formatting
   - ✅ Export to JSON, verify structure
   - ✅ Re-import exported data successfully

7. **Category Management**:
   - ✅ Add custom category
   - ✅ Set budget for category
   - ✅ Budget alerts trigger at threshold
   - ✅ Edit/delete custom categories
   - ✅ Custom categories persist after reload

8. **Data Management**:
   - ✅ Edit expense, verify changes saved
   - ✅ Delete expense, verify removed
   - ✅ Bulk delete works
   - ✅ Full data backup/restore works
   - ✅ Data persists after closing browser

9. **Responsive Design**:
   - ✅ Dashboard responsive on tablet
   - ✅ Dashboard responsive on mobile
   - ✅ Touch controls work on mobile
   - ✅ Charts readable on small screens

10. **Dark Mode**:
    - ✅ Dark mode toggle works
    - ✅ All components styled for dark mode
    - ✅ Charts readable in dark mode
    - ✅ Theme preference persists

### Performance Testing

1. **Load Times**:
   - ✅ Dashboard loads in <2s with 1000+ expenses
   - ✅ Chart rendering <500ms
   - ✅ IndexedDB queries <100ms
   - ✅ Bulk upload of 500 records <3s

2. **Memory Usage**:
   - ✅ Monitor memory with 5000+ records
   - ✅ No memory leaks after multiple operations
   - ✅ List virtualization reduces memory for large lists

3. **Bundle Size**:
   - ✅ Initial bundle <500KB gzipped
   - ✅ Code-split chunks load on demand
   - ✅ Lighthouse performance score >90

### Browser Compatibility Testing

- ✅ Chrome (latest) — Full functionality
- ✅ Firefox (latest) — Full functionality
- ✅ Safari (latest) — Full functionality, especially PDF generation
- ✅ Edge (latest) — Full functionality
- ✅ Mobile Chrome (Android) — Responsive design, touch controls
- ✅ Mobile Safari (iOS) — Responsive design, PWA features

### Data Persistence Testing

- ✅ Add 100 expenses, close browser, reopen → all data present
- ✅ Edit expense, refresh page → changes persisted
- ✅ Clear browser data → data lost (expected behavior)
- ✅ Backup/restore → data restored correctly
- ✅ IndexedDB upgrade migration works (if schema changes)

---

## Decisions & Assumptions

### Technical Decisions

1. **React + Vite** — Chosen for fast development, HMR, and optimized production builds
2. **IndexedDB over LocalStorage** — Handles larger datasets efficiently (LocalStorage has 5-10MB limit)
3. **Recharts + d3** — Recharts for common charts, d3 for advanced visualizations (histogram, box plot, heat map)
4. **jsPDF + html2canvas** — Proven solution for capturing charts as images in PDFs
5. **No backend/authentication** — Fully offline, personal use only
6. **Static deployment** — Can run on any web server or file system
7. **TypeScript** — Type safety reduces bugs, improves developer experience
8. **TailwindCSS** — Rapid UI development with minimal CSS footprint

### User Assumptions

1. Modern browser with IndexedDB support (Chrome 24+, Firefox 16+, Safari 10+, Edge 12+)
2. JavaScript enabled in browser
3. Single currency (no multi-currency support in MVP)
4. Date inputs in user's local timezone
5. Personal use (single user, no collaboration features)
6. Desktop or mobile device with modern browser

### Scope Boundaries

**Included**:
- ✅ Expense tracking with 28 predefined categories
- ✅ Adhoc and bulk entry (CSV, Excel, JSON)
- ✅ Interactive visualizations (10+ chart types)
- ✅ Analytics: YoY, MoM, date range, trends, anomalies, statistics
- ✅ Infographic-rich PDF reports with embedded charts
- ✅ Export to CSV, Excel, JSON
- ✅ Category management (add custom, set budgets)
- ✅ Data backup/restore
- ✅ Responsive design, dark mode
- ✅ Offline-first architecture

**Excluded** (Future Enhancements):
- ❌ Multi-user support
- ❌ User authentication
- ❌ Cloud sync across devices
- ❌ Receipt scanning (OCR)
- ❌ Automated recurring expenses
- ❌ Push notifications for budget alerts
- ❌ Multi-currency support
- ❌ Bill reminders
- ❌ Bank account integrations
- ❌ Income tracking
- ❌ Investment portfolio tracking
- ❌ Tax calculation/filing

---

## Future Enhancements (Post-MVP)

### Phase 9: Advanced Features (Optional)

1. **Income Tracking**:
   - Add income categories (salary, business, agriculture revenue)
   - Net cash flow analysis
   - Profit/loss for agriculture

2. **Budget Management**:
   - Proactive budget alerts (browser notifications)
   - Budget vs actual visual comparisons
   - Auto-rollover unused budget

3. **Recurring Expenses**:
   - Templates for recurring bills
   - Auto-fill with one click
   - Recurring expense calendar

4. **Receipt Management**:
   - Upload receipt images
   - OCR to extract amount/date/merchant
   - Link receipts to expenses

5. **Multi-device Sync**:
   - Optional cloud backup (Google Drive, Dropbox)
   - Sync across devices
   - Conflict resolution

6. **Collaboration**:
   - Share expenses with family members
   - Split expenses (roommates, partners)
   - Permission management

7. **Advanced Analytics**:
   - Machine learning predictions
   - Spending recommendations
   - Budget optimization suggestions
   - Cash flow forecasting

8. **Integrations**:
   - Bank account sync (read-only)
   - Email receipt parsing
   - SMS expense tracking
   - Webhook support

9. **Tax & Compliance**:
   - Tax-deductible expense flagging
   - Generate tax reports
   - Agriculture subsidy tracking
   - GST/VAT support

10. **Mobile App**:
    - Native iOS/Android apps
    - Camera integration for receipts
    - Push notifications
    - Offline sync

---

## Questions for Further Refinement

1. **Currency**: Which currency should be used? (default: USD, INR, EUR?)
2. **Date Format**: Preferred date format? (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD?)
3. **Fiscal Year**: Does your fiscal year differ from calendar year? (important for agriculture)
4. **Budget Period**: Should budgets be monthly, quarterly, or annual?
5. **Anomaly Threshold**: How many standard deviations for anomaly detection? (default: 2σ)
6. **Report Scheduling**: Would you like automated report generation? (weekly, monthly)
7. **Data Retention**: Should old data be archived? (e.g., data older than 5 years)
8. **Accessibility**: Any specific accessibility requirements? (screen reader support, high contrast mode)

---

## Implementation Timeline (Estimate)

**Total Time**: 4-6 weeks (1 developer, part-time)

- **Week 1**: Phase 1-2 (Setup, data layer)
- **Week 2**: Phase 3-4 (Expense entry, dashboard)
- **Week 3**: Phase 5 (Analytics engine)
- **Week 4**: Phase 6 (Report generation with infographics)
- **Week 5**: Phase 7 (Enhancements, polish)
- **Week 6**: Phase 8 (Testing, deployment)

**Fast Track** (MVP): 2-3 weeks by skipping optional enhancements in Phase 7.

---

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Modern code editor (VS Code recommended)
- Git for version control

### Initial Setup Commands

```bash
# Create project
npm create vite@latest expense-tracker -- --template react-ts

# Navigate to project
cd expense-tracker

# Install dependencies
npm install recharts date-fns idb papaparse xlsx jspdf html2canvas d3 react-window
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Start development server
npm run dev
```

### Project Structure
```
expense-tracker/
├── public/
│   └── icons/
├── src/
│   ├── components/
│   │   ├── charts/           # Chart components
│   │   ├── dashboard/        # Dashboard views
│   │   ├── forms/            # Expense entry forms
│   │   ├── reports/          # Report generation
│   │   └── ui/               # Reusable UI components
│   ├── hooks/
│   │   ├── useExpenses.ts
│   │   ├── useCategories.ts
│   │   └── useAnalytics.ts
│   ├── services/
│   │   ├── db.ts             # IndexedDB service
│   │   ├── analytics.ts      # Analytics engine
│   │   ├── export.ts         # Export service
│   │   └── pdf.ts            # PDF generation
│   ├── utils/
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   └── formatters.ts
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Support & Resources

### Documentation Links
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Recharts Documentation](https://recharts.org)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [jsPDF Documentation](https://artskydj.github.io/jsPDF/docs/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### Community Resources
- Stack Overflow for troubleshooting
- GitHub for open-source chart examples
- CodePen/CodeSandbox for chart prototypes

---

**Plan Status**: Ready for Implementation ✅

**Category Structure**: Finalized (28 categories, extensible) ✅

**Infographics**: Comprehensive (10+ chart types across 7 PDF pages) ✅

**Analytics Engine**: Robust (YoY, MoM, trends, anomalies) ✅