

---

# Page 1

Personal Finance Tracker â€” Product Specification 
1. Product Overview 
Product name: Personal Finance Tracker 
Platform: Web application 
Primary stack: React + ASP.NET Core + PostgreSQL. Since this is the first hackathon, 
you can also use Java and Spring Boot instead of .NET. 
Primary users: Individuals who want to track income, expenses, budgets, savings 
goals, and recurring payments. 
1.1 Goal 
Build a full-stack personal finance app that helps users: - record income and expenses 
quickly - understand where money is going - manage monthly budgets - track savings 
goals - review trends and recurring payments 
1.2 Success Criteria 
A user should be able to: - create an account and log in - add a transaction in under 15 
seconds - view current month spending by category - compare budget vs actual 
spending - identify recurring payments and upcoming bills - view simple trend charts 
over time 
 
2. Product Scope 
2.1 In Scope for V1 
ï‚· Authentication 
ï‚· Dashboard 
ï‚· Transactions CRUD 
ï‚· Categories CRUD 
ï‚· Monthly budgets 
ï‚· Savings goals 
ï‚· Recurring transactions 
ï‚· Accounts/wallets (cash, bank, card) 
ï‚· Reporting and charts 
ï‚· Search and filters 
ï‚· Responsive UI for desktop and mobile web 
2.2 Out of Scope for V1 
ï‚· Open banking integrations 
ï‚· Investment portfolio tracking


---

# Page 2

ï‚· Tax filing support 
ï‚· Multi-currency conversion automation 
ï‚· Shared family accounts with advanced permissions 
ï‚· AI-driven financial advice 
 
3. User Personas 
Persona A: Young Professional 
Needs quick transaction logging, monthly budget control, and spending insights. 
Persona B: Freelancer 
Needs multiple income sources, expense categorization, and monthly cash flow 
visibility. 
Persona C: Goal-Oriented Saver 
Needs savings goals, progress tracking, and recurring contribution reminders. 
 
4. Key User Stories 
Authentication 
ï‚· As a new user, I want to sign up with email and password so I can access my 
data securely. 
ï‚· As a returning user, I want to log in and stay signed in. 
Transactions 
ï‚· As a user, I want to add income and expense transactions. 
ï‚· As a user, I want to edit or delete incorrect transactions. 
ï‚· As a user, I want to tag transactions to categories and accounts. 
Budgeting 
ï‚· As a user, I want to set a monthly budget per category. 
ï‚· As a user, I want to see whether I am over or under budget. 
Reporting 
ï‚· As a user, I want to see charts for spending trends. 
ï‚· As a user, I want to see top spending categories. 
Goals 
ï‚· As a user, I want to create savings goals with target amounts and deadlines. 
ï‚· As a user, I want to track goal progress.


---

# Page 3

Recurring Payments 
ï‚· As a user, I want to define recurring bills and subscriptions. 
ï‚· As a user, I want to see upcoming recurring expenses. 
 
5. Information Architecture 
Main Navigation 
ï‚· Dashboard 
ï‚· Transactions 
ï‚· Budgets 
ï‚· Goals 
ï‚· Reports 
ï‚· Recurring 
ï‚· Accounts 
ï‚· Settings 
Secondary Navigation / Utilities 
ï‚· Global Add Transaction button 
ï‚· Search 
ï‚· Date range picker 
ï‚· Notifications 
ï‚· User profile menu 
 
6. Functional Requirements 
6.1 Authentication 
Features 
ï‚· Sign up with email, password, display name 
ï‚· Log in / log out 
ï‚· Forgot password flow 
ï‚· JWT-based authentication 
ï‚· Refresh token support 
Validation 
ï‚· Email must be unique 
ï‚· Password minimum 8 characters 
ï‚· Password must include upper/lowercase and number


---

# Page 4

Screens 
ï‚· Sign Up 
ï‚· Login 
ï‚· Forgot Password 
ï‚· Reset Password 
 
6.2 Dashboard 
Purpose 
Give the user a one-screen financial summary. 
Widgets 
ï‚· Current month income 
ï‚· Current month expense 
ï‚· Net balance 
ï‚· Budget progress cards 
ï‚· Spending by category chart 
ï‚· Income vs expense trend chart 
ï‚· Recent transactions list 
ï‚· Upcoming recurring payments 
ï‚· Savings goal progress summary 
Actions 
ï‚· Add transaction 
ï‚· View all transactions 
ï‚· Create budget 
ï‚· Add recurring bill 
ï‚· Update goal contribution 
 
6.3 Transactions Module 
Transaction Fields 
ï‚· id 
ï‚· userId 
ï‚· accountId 
ï‚· type (income, expense, transfer) 
ï‚· amount 
ï‚· date 
ï‚· categoryId


---

# Page 5

ï‚· note 
ï‚· merchant 
ï‚· paymentMethod 
ï‚· recurringTransactionId (optional) 
ï‚· tags 
ï‚· createdAt 
ï‚· updatedAt 
Features 
ï‚· Create transaction 
ï‚· Edit transaction 
ï‚· Delete transaction 
ï‚· Filter by date, category, amount, type, account 
ï‚· Search by merchant or note 
ï‚· Bulk delete / bulk categorize (optional V1.1) 
ï‚· Pagination / infinite scroll 
Edge Cases 
ï‚· Prevent negative amount input 
ï‚· Support back-dated entries 
ï‚· Transfer transactions affect two accounts 
 
6.4 Categories Module 
Default Categories 
Expense: Food, Rent, Utilities, Transport, Entertainment, Shopping, Health, Education, 
Travel, Subscriptions, Miscellaneous 
Income: Salary, Freelance, Bonus, Investment, Gift, Refund, Other 
Features 
ï‚· Add custom category 
ï‚· Edit category icon and color 
ï‚· Archive category 
ï‚· Separate income and expense categories 
 
6.5 Accounts Module 
Account Types 
ï‚· Bank account 
ï‚· Credit card


---

# Page 6

ï‚· Cash wallet 
ï‚· Savings account 
Fields 
ï‚· id 
ï‚· userId 
ï‚· name 
ï‚· type 
ï‚· openingBalance 
ï‚· currentBalance 
ï‚· institutionName 
ï‚· lastUpdatedAt 
Features 
ï‚· Create account 
ï‚· View balance by account 
ï‚· Transfer funds between accounts 
 
6.6 Budgets Module 
Budget Fields 
ï‚· id 
ï‚· userId 
ï‚· categoryId 
ï‚· month 
ï‚· year 
ï‚· amount 
ï‚· alertThresholdPercent 
Features 
ï‚· Set monthly budget by category 
ï‚· View budget vs actual spend 
ï‚· Alert when 80%, 100%, 120% exceeded 
ï‚· Duplicate last month budget 
 
6.7 Goals Module 
Goal Fields 
ï‚· id 
ï‚· userId


---

# Page 7

ï‚· name 
ï‚· targetAmount 
ï‚· currentAmount 
ï‚· targetDate 
ï‚· linkedAccountId (optional) 
ï‚· icon 
ï‚· color 
ï‚· status 
Features 
ï‚· Create savings goal 
ï‚· Add contribution 
ï‚· Withdraw from goal 
ï‚· Track progress 
ï‚· Mark goal completed 
 
6.8 Recurring Transactions Module 
Fields 
ï‚· id 
ï‚· userId 
ï‚· title 
ï‚· type 
ï‚· amount 
ï‚· categoryId 
ï‚· accountId 
ï‚· frequency (daily, weekly, monthly, yearly) 
ï‚· startDate 
ï‚· endDate 
ï‚· nextRunDate 
ï‚· autoCreateTransaction (bool) 
Features 
ï‚· Create subscription or recurring salary 
ï‚· Show next due date 
ï‚· Auto-generate transaction with scheduled job 
ï‚· Pause or delete recurring item


---

# Page 8

6.9 Reports Module 
Reports 
ï‚· Monthly spending report 
ï‚· Category breakdown 
ï‚· Income vs expense trend 
ï‚· Account balance trend 
ï‚· Savings progress 
Filters 
ï‚· Date range 
ï‚· Account 
ï‚· Category 
ï‚· Transaction type 
Export 
ï‚· CSV export 
ï‚· PDF export (V1.1) 
 
7. Non-Functional Requirements 
Performance 
ï‚· Dashboard load under 2 seconds for normal users 
ï‚· API pagination for large transaction volumes 
Security 
ï‚· JWT auth 
ï‚· Password hashing with bcrypt/Argon2 
ï‚· Rate limit login endpoints 
ï‚· Server-side validation for all financial inputs 
Reliability 
ï‚· Daily backups 
ï‚· Transaction-safe balance updates 
Accessibility 
ï‚· Keyboard navigable 
ï‚· Color contrast AA-compliant 
ï‚· Labels for form fields and chart summaries


---

# Page 9

Responsiveness 
ï‚· Desktop: full analytics layout 
ï‚· Tablet: collapsed side nav 
ï‚· Mobile: stacked cards, bottom action button 
 
8. UI / UX Design System 
8.1 Design Principles 
ï‚· Clean, calm, finance-friendly visual style 
ï‚· Emphasis on clarity over decoration 
ï‚· Fast data entry with minimal friction 
ï‚· Strong hierarchy for numbers and charts 
8.2 Visual Style 
ï‚· Primary color: Deep blue or indigo 
ï‚· Success color: Green 
ï‚· Warning color: Amber 
ï‚· Danger color: Red 
ï‚· Background: Light neutral gray 
ï‚· Cards: White with subtle shadow 
8.3 Typography 
ï‚· Heading: Inter / system sans 
ï‚· Large numbers for financial summaries 
ï‚· Small muted labels for metadata 
8.4 Components 
ï‚· App shell with sidebar + topbar 
ï‚· Summary cards 
ï‚· Data tables 
ï‚· Modal form for add/edit transaction 
ï‚· Charts 
ï‚· Progress bars 
ï‚· Tabs 
ï‚· Toast notifications 
ï‚· Empty states


---

# Page 10

9. Sample Screenshots / Wireframes 
These are low-fidelity layout references for implementation. 
9.1 Login Screen 
+--------------------------------------------------+ 
|                Personal Finance Tracker          | 
|--------------------------------------------------| 
|  Welcome back                                    | 
|  Email:    [______________________________]      | 
|  Password: [______________________________]      | 
|  [ Log In ]                                      | 
|                                                  | 
|  Forgot password                                | 
|  Don't have an account Sign up                  | 
+--------------------------------------------------+ 
9.2 Dashboard Screen
+----------------------------------------------------------------------------+
| Dashboard                                                    [Add transaction]|
|----------------------------------------------------------------------------|
| Search:  [ Search merchants or notes _________________________________ ]   |
|----------------------------------------------------------------------------|
| Balance     | Income (period) | Expense (period) | Savings goals           |
|----------------------------------------------------------------------------|
| [Chart] Spending by category                     | [Chart] Income vs expense|
|----------------------------------------------------------------------------|
| Recent transactions (table)                      | Upcoming bills (table)   |
+----------------------------------------------------------------------------+
9.3 Transactions List
+----------------------------------------------------------------------------+
| Transactions                                                [Add transaction]|
|----------------------------------------------------------------------------|
| Search:  [ Search merchants or notes _________________________________ ]   |
|----------------------------------------------------------------------------|
| Summary: Entries: 12   Income: +95,000   Expenses: -33,700   Transfers: 0  |
|----------------------------------------------------------------------------|
| Date       | Merchant       | Category       | Type     | Amount           |
| 2026-03-18 | Grocery Mart   | Food           | Expense  | -42.00           |
| 2026-03-18 | Employer Inc   | Salary         | Income   | +2400.00         |
| 2026-03-19 | Uber           | Transport      | Expense  | -11.50           |
+----------------------------------------------------------------------------+
9.4 Add Transaction Modal
+----------------------------------------------------------+
| Add Transaction                                          |
|----------------------------------------------------------|
| Type:      [Expense v]                                   |
| Amount:    [________________________]                    |
| Date:      [yyyy-mm-dd]                                  |
| Category:  [Select v]                                    |
| (Transfer) To Account: [Select v]                        |
| Merchant:  [________________________]                    |
| Note:      [________________________]                    |
| Tags:      [comma, separated_________]                    |
|                                                          |
|                                   [Cancel]   [Save]      |
+----------------------------------------------------------+
9.5 Budgets Screen 
+----------------------------------------------------------------------------
+ 
| Budgets                                                     [Set Budget]   
| 
|----------------------------------------------------------------------------
| 
| Food          650 / 800        [########----] 81%                          
| 
| Transport     120 / 250        [#####-------] 48%                          
| 
| Entertainment 210 / 200        [###########-] 105%                         
| 
| Shopping       75 / 300        [###---------] 25%


---

# Page 12

| 
+----------------------------------------------------------------------------
+ 
9.6 Goals Screen 
+----------------------------------------------------------------------------
+ 
| Savings Goals                                                [Add Goal]    
| 
|----------------------------------------------------------------------------
| 
| Emergency Fund     45,000 / 100,000   [######------] 45%   Due: Dec 2026  | 
| Vacation           20,000 / 50,000    [####--------] 40%   Due: Aug 2026  | 
+----------------------------------------------------------------------------
+ 
9.7 Reports Screen 
+----------------------------------------------------------------------------
+ 
| Reports                                                                     
| 
|----------------------------------------------------------------------------
| 
| Date Range: [This Month v]   Account: [All v]   Type: [All v]               
| 
|----------------------------------------------------------------------------
| 
| [Bar Chart: Category Spend]                                                 
| 
|----------------------------------------------------------------------------
| 
| [Line Chart: Income vs Expense by Month]                                    
| 
|----------------------------------------------------------------------------
| 
| Top Categories: Food, Rent, Transport                                       
| 
+----------------------------------------------------------------------------
+ 
 
10. Detailed UI Flows 
10.1 Onboarding Flow 
1. User lands on marketing/login page. 
2. User clicks Sign Up. 
3. User enters email, password, name.


---

# Page 13

4. System validates input. 
5. Account is created. 
6. User is redirected to optional onboarding. 
7. User creates first account (e.g. Bank Account). 
8. User optionally sets first monthly budget. 
9. User lands on dashboard. 
10.2 Add Expense Flow 
1. User clicks Add Transaction. 
2. Modal opens with default type = Expense. 
3. User enters amount, date, account, category, merchant. 
4. User clicks Save. 
5. Frontend validates required fields. 
6. API stores transaction. 
7. Account balance and dashboard widgets refresh. 
8. Toast shown: â€œTransaction saved.â€ 
10.3 Create Budget Flow 
1. User navigates to Budgets. 
2. User clicks Set Budget. 
3. User chooses category, month, amount. 
4. User saves budget. 
5. Budget appears in list with progress bar. 
6. Dashboard reflects updated budget summary. 
10.4 Goal Contribution Flow 
1. User opens Goals. 
2. User selects an existing goal. 
3. User clicks Add Contribution. 
4. User enters amount and source account. 
5. API creates transaction and updates goal balance. 
6. Progress bar and account balance refresh. 
10.5 Recurring Bill Flow 
1. User opens Recurring. 
2. User clicks New Recurring Item. 
3. User enters title, amount, category, account, frequency. 
4. User saves recurring item. 
5. Scheduler sets nextRunDate. 
6. Dashboard upcoming bills widget shows new item.


---

# Page 14

10.6 Reporting Flow 
1. User opens Reports. 
2. User selects date range and filters. 
3. Frontend requests aggregated data from API. 
4. Charts and tables update. 
5. User optionally exports CSV. 
 
11. API Specification 
11.1 Auth 
ï‚· POST /api/auth/register 
ï‚· POST /api/auth/login 
ï‚· POST /api/auth/refresh 
ï‚· POST /api/auth/forgot-password 
ï‚· POST /api/auth/reset-password 
11.2 Transactions 
ï‚· GET /api/transactions 
ï‚· POST /api/transactions 
ï‚· GET /api/transactions/{id} 
ï‚· PUT /api/transactions/{id} 
ï‚· DELETE /api/transactions/{id} 
Sample Create Transaction Request 
{ 
  "type": "expense", 
  "amount": 42.50, 
  "date": "2026-03-13", 
  "accountId": "uuid", 
  "categoryId": "uuid", 
  "merchant": "Grocery Mart", 
  "note": "Weekly groceries", 
  "tags": ["family", "weekly"] 
} 
11.3 Categories 
ï‚· GET /api/categories 
ï‚· POST /api/categories 
ï‚· PUT /api/categories/{id} 
ï‚· DELETE /api/categories/{id}


---

# Page 15

11.4 Accounts 
ï‚· GET /api/accounts 
ï‚· POST /api/accounts 
ï‚· PUT /api/accounts/{id} 
ï‚· POST /api/accounts/transfer 
11.5 Budgets 
ï‚· GET /api/budgetsmonth=3&year=2026 
ï‚· POST /api/budgets 
ï‚· PUT /api/budgets/{id} 
ï‚· DELETE /api/budgets/{id} 
11.6 Goals 
ï‚· GET /api/goals 
ï‚· POST /api/goals 
ï‚· PUT /api/goals/{id} 
ï‚· POST /api/goals/{id}/contribute 
ï‚· POST /api/goals/{id}/withdraw 
11.7 Reports 
ï‚· GET /api/reports/category-spend 
ï‚· GET /api/reports/income-vs-expense 
ï‚· GET /api/reports/account-balance-trend 
11.8 Recurring 
ï‚· GET /api/recurring 
ï‚· POST /api/recurring 
ï‚· PUT /api/recurring/{id} 
ï‚· DELETE /api/recurring/{id} 
 
12. PostgreSQL Schema 
12.1 Users 
create table users ( 
  id uuid primary key, 
  email varchar(255) unique not null, 
  password_hash text not null, 
  display_name varchar(120), 
  created_at timestamp not null default now() 
);


---

# Page 16

12.2 Accounts 
create table accounts ( 
  id uuid primary key, 
  user_id uuid not null references users(id), 
  name varchar(100) not null, 
  type varchar(30) not null, 
  opening_balance numeric(12,2) not null default 0, 
  current_balance numeric(12,2) not null default 0, 
  institution_name varchar(120), 
  created_at timestamp not null default now() 
); 
12.3 Categories 
create table categories ( 
  id uuid primary key, 
  user_id uuid references users(id), 
  name varchar(100) not null, 
  type varchar(20) not null, 
  color varchar(20), 
  icon varchar(50), 
  is_archived boolean not null default false 
); 
12.4 Transactions 
create table transactions ( 
  id uuid primary key, 
  user_id uuid not null references users(id), 
  account_id uuid not null references accounts(id), 
  category_id uuid references categories(id), 
  type varchar(20) not null, 
  amount numeric(12,2) not null, 
  transaction_date date not null, 
  merchant varchar(200), 
  note text, 
  payment_method varchar(50), 
  created_at timestamp not null default now(), 
  updated_at timestamp not null default now() 
); 
12.5 Budgets 
create table budgets ( 
  id uuid primary key, 
  user_id uuid not null references users(id), 
  category_id uuid not null references categories(id), 
  month int not null, 
  year int not null, 
  amount numeric(12,2) not null,


---

# Page 17

alert_threshold_percent int default 80 
); 
12.6 Goals 
create table goals ( 
  id uuid primary key, 
  user_id uuid not null references users(id), 
  name varchar(120) not null, 
  target_amount numeric(12,2) not null, 
  current_amount numeric(12,2) not null default 0, 
  target_date date, 
  status varchar(30) not null default 'active' 
); 
12.7 Recurring Transactions 
create table recurring_transactions ( 
  id uuid primary key, 
  user_id uuid not null references users(id), 
  title varchar(120) not null, 
  type varchar(20) not null, 
  amount numeric(12,2) not null, 
  category_id uuid references categories(id), 
  account_id uuid references accounts(id), 
  frequency varchar(20) not null, 
  start_date date not null, 
  end_date date, 
  next_run_date date not null, 
  auto_create_transaction boolean not null default true 
); 
 
13. Backend Architecture 
Layers 
ï‚· Controllers 
ï‚· Application services 
ï‚· Domain models 
ï‚· Repository / EF Core layer 
ï‚· PostgreSQL 
Suggested Structure 
/backend 
  /Controllers 
  /Services 
  /DTOs 
  /Entities


---

# Page 18

/Repositories 
  /Migrations 
Cross-Cutting Concerns 
ï‚· Logging 
ï‚· Validation 
ï‚· Authentication middleware 
ï‚· Exception handling middleware 
ï‚· Background job for recurring transaction generation 
 
14. Frontend Architecture 
Suggested React Structure 
/frontend/src 
  /components 
  /pages 
  /features 
    /auth 
    /transactions 
    /budgets 
    /goals 
    /reports 
  /services 
  /hooks 
  /store 
  /types 
  /utils 
Recommended Libraries 
ï‚· React Router 
ï‚· TanStack Query 
ï‚· Zustand or Redux Toolkit 
ï‚· React Hook Form 
ï‚· Zod 
ï‚· Recharts 
ï‚· Axios 
 
15. State Management Guidelines 
Server State 
Use TanStack Query for: - transactions - budgets - dashboard summary - goals - 
reports


---

# Page 19

Local UI State 
Use Zustand or component state for: - modal open/close - active filters - selected date 
range - table sorting 
 
16. Validation Rules 
Transaction Rules 
ï‚· Amount required and greater than 0 
ï‚· Date required 
ï‚· Account required 
ï‚· Category required except transfer 
ï‚· Transfer requires source and destination account 
Budget Rules 
ï‚· One budget per category per month per user 
ï‚· Amount must be > 0 
Goal Rules 
ï‚· Target amount must be > 0 
ï‚· Contribution cannot exceed available balance if linked to account 
 
17. Notifications and Alerts 
Examples 
ï‚· Budget 80% used 
ï‚· Budget exceeded 
ï‚· Upcoming recurring payment in 3 days 
ï‚· Goal reached 
ï‚· Transaction saved successfully 
Notification Channels in V1 
ï‚· In-app toast 
ï‚· In-app alert banners 
 
18. Error States and Empty States 
Empty States 
ï‚· No transactions yet â†’ show CTA to add first transaction 
ï‚· No budgets yet â†’ suggest budget creation


---

# Page 20

ï‚· No goals yet â†’ suggest goal setup 
ï‚· No report data â†’ suggest expanding date range 
Error States 
ï‚· API unavailable 
ï‚· Unauthorized session expired 
ï‚· Validation error on form submit 
ï‚· Failed chart/report fetch 
 
19. Security and Permissions 
Access Model 
Single-user ownership of all records. All queries must be scoped by userId on backend. 
Security Controls 
ï‚· JWT access tokens 
ï‚· refresh tokens 
ï‚· hashed passwords 
ï‚· HTTPS only 
ï‚· audit logs for key money-impacting actions (recommended) 
 
20. Analytics / Telemetry 
Product Events 
ï‚· signup_completed 
ï‚· first_transaction_added 
ï‚· budget_created 
ï‚· goal_created 
ï‚· recurring_created 
ï‚· report_exported 
 
21. Milestones 
Milestone 1 
ï‚· Auth 
ï‚· Accounts 
ï‚· Transactions CRUD 
ï‚· Basic dashboard


---

# Page 21

Milestone 2 
ï‚· Categories 
ï‚· Budgets 
ï‚· Reports basics 
Milestone 3 
ï‚· Goals 
ï‚· Recurring transactions 
ï‚· Export 
ï‚· Polish and responsive design 
 
22. Acceptance Criteria Summary 
Dashboard 
ï‚· Shows month summary cards 
ï‚· Shows recent transactions 
ï‚· Shows category spending chart 
Transactions 
ï‚· User can add/edit/delete transactions 
ï‚· Filters work correctly 
ï‚· Balances update after changes 
Budgets 
ï‚· User can define monthly budgets 
ï‚· Progress reflects actual spend 
ï‚· Over-budget states are visible 
Goals 
ï‚· User can create and contribute to goals 
ï‚· Progress percentage updates correctly 
Reports 
ï‚· Date filters update charts and summary data 
ï‚· Export returns correct filtered dataset 
 
23. Future Enhancements 
ï‚· Bank sync 
ï‚· Receipt scanning 
ï‚· AI categorization suggestions


---

# Page 22

ï‚· Shared household budgets 
ï‚· Mobile app 
ï‚· Push notifications 
ï‚· Multi-currency support 
 
24. Build Order Recommendation 
1. Auth + app shell 
 
2. Accounts + categories 
 
3. Transactions CRUD 
 
4. Dashboard summary 
 
5. Budgets 
 
6. Goals 
 
7. Recurring transactions 
 
8. Reports + exports 
 
9. Responsive polish 
 
10. Tests + deployment


