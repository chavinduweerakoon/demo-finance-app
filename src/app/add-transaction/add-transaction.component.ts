import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TransactionType } from '../transaction.model';
import { TransactionService } from '../transaction.service';

@Component({
  selector: 'app-add-transaction',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './add-transaction.component.html',
  styles: [],
})
export class AddTransactionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly txs = inject(TransactionService);
  private readonly router = inject(Router);

  protected readonly types: TransactionType[] = ['income', 'expense'];

  readonly form = this.fb.group({
    type: this.fb.nonNullable.control<TransactionType>('expense', Validators.required),
    amount: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    category: ['', [Validators.required, Validators.maxLength(64)]],
    note: ['', Validators.maxLength(256)],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  protected submitted = false;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  async submit(): Promise<void> {
    this.submitted = true;
    this.errorMessage.set(null);
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    if (v.amount == null || v.category == null || v.date == null) return;

    this.saving.set(true);
    try {
      await this.txs.createTransaction({
        type: v.type,
        amount: Number(v.amount),
        category: v.category.trim(),
        note: (v.note ?? '').trim(),
        date: v.date,
      });
      await this.router.navigate(['/transactions'], {
        queryParams: { saved: '1' },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save transaction.';
      this.errorMessage.set(msg);
    } finally {
      this.saving.set(false);
    }
  }
}
