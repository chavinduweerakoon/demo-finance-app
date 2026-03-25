import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddTransactionComponent } from './add-transaction/add-transaction.component';
import { TransactionsListComponent } from './transactions-list/transactions-list.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add', component: AddTransactionComponent },
  { path: 'transactions', component: TransactionsListComponent },
  { path: '**', redirectTo: 'dashboard' },
];
