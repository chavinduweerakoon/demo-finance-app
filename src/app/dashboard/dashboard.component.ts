import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { Tag } from 'primeng/tag';
import { TransactionService } from '../transaction.service';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterLink, BaseChartDirective, Card, Message, Tag, ButtonDirective],
  templateUrl: './dashboard.component.html',
  styles: [],
})
export class DashboardComponent implements OnInit {
  private readonly txs = inject(TransactionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly totalIncome = this.txs.totalIncome;
  protected readonly totalExpenses = this.txs.totalExpenses;
  protected readonly balance = this.txs.balance;
  protected readonly recent = this.txs.transactions;
  protected readonly spendingByCategory = this.txs.spendingByCategory;
  protected readonly topExpenseCategoryThisMonth = this.txs.topExpenseCategoryThisMonth;

  protected readonly showSaved = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  /** Expense-only totals by category (same source as `spendingByCategory`). */
  protected readonly expenseChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.txs.spendingByCategory();
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
            return typeof v === 'number' ? v.toFixed(2) : '';
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
