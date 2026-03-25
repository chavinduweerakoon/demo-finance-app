import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import type { CurrencyCode, Transaction } from '../transaction.model';
import { TransactionService } from '../transaction.service';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, RouterLink, FormsModule, BaseChartDirective, Card, Message, Tag, ButtonDirective, Select],
  templateUrl: './dashboard.component.html',
  styles: [],
})
export class DashboardComponent implements OnInit {
  private readonly txs = inject(TransactionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currencyOptions: { label: string; value: CurrencyCode }[] = [
    { label: 'LKR', value: 'LKR' },
    { label: 'USD', value: 'USD' },
  ];
  protected readonly selectedCurrency = signal<CurrencyCode>('LKR');
  protected readonly currencyCode = this.selectedCurrency.asReadonly();
  protected readonly filtered = computed<Transaction[]>(() =>
    this.txs.transactions().filter((t) => t.currency === this.selectedCurrency())
  );
  protected readonly totalIncome = computed(() =>
    this.filtered()
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
  );
  protected readonly totalExpenses = computed(() =>
    this.filtered()
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
  );
  protected readonly balance = computed(() => this.totalIncome() - this.totalExpenses());
  protected readonly recent = computed(() => this.filtered());
  protected readonly spendingByCategory = computed(() => {
    const map = new Map<string, number>();
    for (const t of this.filtered()) {
      if (t.type !== 'expense') continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  });
  protected readonly topExpenseCategoryThisMonth = computed((): { category: string; amount: number } | null => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    const map = new Map<string, number>();
    for (const t of this.filtered()) {
      if (t.type !== 'expense') continue;
      if (!this.inCalendarMonth(t.date, y, mo)) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    if (map.size === 0) return null;
    let best: { category: string; amount: number } | null = null;
    for (const [category, amount] of map) {
      if (!best || amount > best.amount) best = { category, amount };
    }
    return best;
  });

  protected readonly showSaved = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  /** Expense-only totals by category (same source as `spendingByCategory`). */
  protected readonly expenseChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.spendingByCategory();
    return {
      labels: rows.map((r) => r.category),
      datasets: [
        {
          label: 'Expenses',
          data: rows.map((r) => r.amount),
          backgroundColor: 'rgba(37, 99, 235, 0.55)',
          borderColor: 'rgba(37, 99, 235, 0.95)',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 22,
        },
      ],
    };
  });

  protected readonly expenseChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.raw as number;
            return typeof v === 'number'
              ? new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: this.selectedCurrency(),
                  maximumFractionDigits: 2,
                }).format(v)
              : '';
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(24, 24, 27, 0.08)' },
        ticks: { font: { size: 11 }, color: '#71717a' },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#71717a' },
      },
    },
  };

  protected chartHeightPx(): number {
    const n = this.spendingByCategory().length;
    return Math.min(420, Math.max(160, 40 + n * 36));
  }

  private inCalendarMonth(isoDate: string, year: number, month1to12: number): boolean {
    const parts = isoDate.split('-').map(Number);
    if (parts.length < 2) return false;
    const [y, m] = parts;
    return y === year && m === month1to12;
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('saved') === '1') {
      this.showSaved.set(true);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { saved: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      await this.txs.listTransactions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load transactions.';
      this.loadError.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

}
