import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TransactionService } from '../transaction.service';

@Component({
  selector: 'app-transactions-list',
  imports: [DecimalPipe, DatePipe, RouterLink],
  templateUrl: './transactions-list.component.html',
  styles: [],
})
export class TransactionsListComponent implements OnInit {
  private readonly txs = inject(TransactionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly rows = this.txs.transactions;
  protected readonly showSaved = signal(false);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

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
    this.errorMessage.set(null);
    try {
      await this.txs.listTransactions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load transactions.';
      this.errorMessage.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  async remove(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    this.deletingId.set(id);
    this.errorMessage.set(null);
    try {
      await this.txs.deleteTransaction(id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not delete transaction.';
      this.errorMessage.set(msg);
    } finally {
      this.deletingId.set(null);
    }
  }
}
