export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  createdAt?: string;
  updatedAt?: string;
  order?: number;
} 