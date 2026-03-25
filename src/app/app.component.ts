import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menubar } from 'primeng/menubar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, AmplifyAuthenticatorModule, Menubar, Button],
  templateUrl: './app.component.html',
  styles: [],
})
export class AppComponent {
  protected readonly title = 'Finance';

  protected readonly navItems: MenuItem[] = [
    { label: 'Dashboard', routerLink: '/dashboard' },
    { label: 'Add', routerLink: '/add' },
    { label: 'Transactions', routerLink: '/transactions' },
  ];

  /** Exposed for auth-layout theme switching (sign-in vs app shell). */
  protected readonly authenticator = inject(AuthenticatorService);

  protected signOut(): void {
    void this.authenticator.signOut();
  }
}
