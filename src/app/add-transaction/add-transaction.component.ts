import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button, ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { CurrencyCode, TransactionType } from '../transaction.model';
import { TransactionService } from '../transaction.service';

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-add-transaction',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Card,
    Select,
    InputNumber,
    InputText,
    Textarea,
    DatePicker,
    Button,
    ButtonDirective,
  ],
  templateUrl: './add-transaction.component.html',
  styles: [],
})
export class AddTransactionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly txs = inject(TransactionService);
  private readonly router = inject(Router);

  protected readonly typeOptions: { label: string; value: TransactionType }[] = [
    { label: 'Income', value: 'income' },
    { label: 'Expense', value: 'expense' },
  ];
  protected readonly currencyOptions: { label: string; value: CurrencyCode }[] = [
    { label: 'LKR', value: 'LKR' },
    { label: 'USD', value: 'USD' },
  ];

  readonly form = this.fb.group({
    type: this.fb.nonNullable.control<TransactionType>('expense', Validators.required),
    currency: this.fb.nonNullable.control<CurrencyCode>('LKR', Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    category: ['', [Validators.required, Validators.maxLength(64)]],
    note: ['', Validators.maxLength(256)],
    date: this.fb.control<Date | null>(new Date(), Validators.required),
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
        currency: v.currency,
        amount: Number(v.amount),
        category: v.category.trim(),
        note: (v.note ?? '').trim(),
        date: toIsoDateLocal(v.date),
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
