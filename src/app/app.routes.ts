import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AddTransactionComponent } from './add-transaction/add-transaction.component';
import { TransactionsListComponent } from './transactions-list/transactions-list.component';
import { redirectIfAuthedGuard, requireAuthGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { AppLayoutComponent } from './app-layout/app-layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [redirectIfAuthedGuard] },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [requireAuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'add', component: AddTransactionComponent },
      { path: 'transactions', component: TransactionsListComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
