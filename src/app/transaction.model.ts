export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  /** ISO date string yyyy-mm-dd (AWSDate) */
  date: string;
}
