export interface Subscription {
  id: number;
  student_id: number;
  total_lessons: number;
  price: number;
  created_at: Date;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
}

export interface Income {
  id: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  subscriptionIncome: number;
  otherIncome: number;
  rentExpense: number;
  otherExpenses: number;
} 