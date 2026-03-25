export type TransactionType = 'income' | 'expense';
export type CurrencyCode = 'LKR' | 'USD';

export interface Transaction {
  id: string;
  type: TransactionType;
  currency: CurrencyCode;
  amount: number;
  category: string;
  note: string;
  /** ISO date string yyyy-mm-dd (AWSDate) */
  date: string;
}
