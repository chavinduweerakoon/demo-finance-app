import { Injectable, computed, signal } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from './amplify/data/resource';
import type { Transaction, TransactionType } from './transaction.model';

export type CreateTransactionInput = Omit<Transaction, 'id'>;

function inCalendarMonth(isoDate: string, year: number, month1to12: number): boolean {
  const parts = isoDate.split('-').map(Number);
  if (parts.length < 2) return false;
  const [y, m] = parts;
  return y === year && m === month1to12;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly client = generateClient<Schema>();

  private readonly _list = signal<Transaction[]>([]);

  /** Newest first by `date` (also applied when loading from the API). */
  readonly transactions = computed(() => [...this._list()]);

  readonly totalIncome = computed(() =>
    this._list()
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
  );

  readonly totalExpenses = computed(() =>
    this._list()
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
  );

  readonly balance = computed(() => this.totalIncome() - this.totalExpenses());

  /** Expense totals per category (all time), highest spend first. */
  readonly spendingByCategory = computed(() => {
    const map = new Map<string, number>();
    for (const t of this._list()) {
      if (t.type !== 'expense') continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  });

  /** Largest expense category in the current calendar month, or `null` if none. */
  readonly topExpenseCategoryThisMonth = computed((): { category: string; amount: number } | null => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    const map = new Map<string, number>();
    for (const t of this._list()) {
      if (t.type !== 'expense') continue;
      if (!inCalendarMonth(t.date, y, mo)) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    if (map.size === 0) return null;
    let best: { category: string; amount: number } | null = null;
    for (const [category, amount] of map) {
      if (!best || amount > best.amount) best = { category, amount };
    }
    return best;
  });

  /**
   * Loads all `Transaction` rows for the signed-in user (owner scope via user pool).
   * Follows `nextToken` until every page is fetched, then sorts newest-by-date first in `transactions`.
   */
  async listTransactions(): Promise<Transaction[]> {
    const collected: Transaction[] = [];
    let nextToken: string | null | undefined;

    do {
      const { data, errors, nextToken: token } =
        await this.client.models.Transaction.list({
          nextToken: nextToken ?? undefined,
        });
      if (errors?.length) {
        throw new Error(errors.map((e) => e.message).join(', '));
      }
      for (const row of data ?? []) {
        collected.push(this.mapRow(row));
      }
      nextToken = token;
    } while (nextToken);

    const sorted = collected.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    this._list.set(sorted);
    return sorted;
  }

  async createTransaction(input: CreateTransactionInput): Promise<void> {
    const { errors } = await this.client.models.Transaction.create({
      type: input.type,
      amount: input.amount,
      category: input.category,
      note: input.note?.trim() ? input.note.trim() : undefined,
      date: input.date,
    });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    await this.listTransactions();
  }

  async deleteTransaction(id: string): Promise<void> {
    const { errors } = await this.client.models.Transaction.delete({ id });
    if (errors?.length) {
      throw new Error(errors.map((e) => e.message).join(', '));
    }
    await this.listTransactions();
  }

  private mapRow(row: {
    id: string;
    type: string;
    amount: number;
    category: string;
    note?: string | null;
    date: string;
  }): Transaction {
    return {
      id: row.id,
      type: row.type as TransactionType,
      amount: row.amount,
      category: row.category,
      note: row.note ?? '',
      date: row.date,
    };
  }
}
