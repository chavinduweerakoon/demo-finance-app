import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import type { CurrencyCode, Transaction } from '../transaction.model';
import { TransactionService } from '../transaction.service';

type DashboardRange = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR' | 'CUSTOM';

@Component({
  selector: 'app-dashboard',
  imports: [
    CurrencyPipe,
    RouterLink,
    FormsModule,
    BaseChartDirective,
    Card,
    Message,
    Tag,
    ButtonDirective,
    Select,
    // False-positive with external templates + control flow; keep import for <p-datepicker>.
    // eslint-disable-next-line @angular-eslint/no-unused-component-imports
    DatePicker,
  ],
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

  protected readonly rangeOptions: { label: string; value: DashboardRange }[] = [
    { label: 'All time', value: 'ALL' },
    { label: 'This month', value: 'THIS_MONTH' },
    { label: 'Last 30 days', value: 'LAST_30_DAYS' },
    { label: 'This year', value: 'THIS_YEAR' },
    { label: 'Custom', value: 'CUSTOM' },
  ];
  protected readonly selectedRange = signal<DashboardRange>('ALL');

  /**
   * PrimeNG range picker binds as [startDate, endDate] while selecting.
   * We only apply the filter when both are chosen.
   */
  protected readonly customRange = signal<Date[] | null>(null);

  protected readonly rangeLabel = computed(() => {
    const v = this.selectedRange();
    return this.rangeOptions.find((o) => o.value === v)?.label ?? 'All time';
  });

  protected readonly filtered = computed<Transaction[]>(() =>
    this.txs
      .transactions()
      .filter((t) => t.currency === this.selectedCurrency())
      .filter((t) => this.isInSelectedRange(t.date))
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
  protected readonly topExpenseCategoryThisPeriod = computed((): { category: string; amount: number } | null => {
    const map = new Map<string, number>();
    for (const t of this.filtered()) {
      if (t.type !== 'expense') continue;
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
  protected readonly expenseChartData = computed<ChartData<'pie'>>(() => {
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
        },
      ],
    };
  });

  protected readonly expenseChartOptions: ChartConfiguration<'pie'>['options'] = {
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
  };

  protected chartHeightPx(): number {
    const n = this.spendingByCategory().length;
    return Math.min(420, Math.max(160, 40 + n * 36));
  }

  private parseIsoDateUtc(isoDate: string): Date | null {
    const parts = isoDate.split('-').map(Number);
    if (parts.length < 3) return null;
    const [y, m, d] = parts;
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  private selectedRangeBoundsUtc(nowUtc: Date): { startUtc: Date; endUtc: Date } | null {
    const endUtc = nowUtc;
    switch (this.selectedRange()) {
      case 'ALL':
        return null;
      case 'THIS_MONTH': {
        const startUtc = new Date(Date.UTC(endUtc.getUTCFullYear(), endUtc.getUTCMonth(), 1));
        return { startUtc, endUtc };
      }
      case 'THIS_YEAR': {
        const startUtc = new Date(Date.UTC(endUtc.getUTCFullYear(), 0, 1));
        return { startUtc, endUtc };
      }
      case 'LAST_30_DAYS': {
        const startUtc = new Date(endUtc.getTime() - 29 * 24 * 60 * 60 * 1000);
        return { startUtc, endUtc };
      }
      case 'CUSTOM': {
        const range = this.customRange();
        const start = range?.[0] instanceof Date ? range[0] : null;
        const end = range?.[1] instanceof Date ? range[1] : null;
        if (!start || !end) return null;

        const startUtc = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0));
        const endUtc2 = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999));
        return { startUtc, endUtc: endUtc2 };
      }
    }
  }

  private isInSelectedRange(isoDate: string): boolean {
    const dUtc = this.parseIsoDateUtc(isoDate);
    if (!dUtc) return true;

    const bounds = this.selectedRangeBoundsUtc(new Date());
    if (!bounds) return true;
    return dUtc.getTime() >= bounds.startUtc.getTime() && dUtc.getTime() <= bounds.endUtc.getTime();
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
