import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { Button } from 'primeng/button';
import { Menubar } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, Menubar, Button],
  templateUrl: './app-layout.component.html',
  styles: [],
})
export class AppLayoutComponent {
  private readonly authenticator = inject(AuthenticatorService);
  private readonly router = inject(Router);

  protected readonly title = 'Finance';
  protected readonly navItems: MenuItem[] = [
    { label: 'Dashboard', routerLink: '/dashboard' },
    { label: 'Add', routerLink: '/add' },
    { label: 'Transactions', routerLink: '/transactions' },
  ];

  protected async signOut(): Promise<void> {
    // Important: `AuthenticatorService.signOut()` may return before `authStatus`
    // flips to unauthenticated. The /login guard checks authStatus, so if we
    // navigate too early, we may get redirected back to /dashboard.
    // We wait for the authStatus transition to unauthenticated before routing.
    const waitForUnauthenticated = async (): Promise<void> => {
      if (this.authenticator.authStatus !== 'authenticated') return;
      await new Promise<void>((resolve) => {
        const sub = this.authenticator.subscribe(() => {
          if (this.authenticator.authStatus !== 'authenticated') {
            sub.unsubscribe();
            resolve();
          }
        });
      });
    };

    try {
      await Promise.resolve(this.authenticator.signOut());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('no federated jwt')) {
        // eslint-disable-next-line no-console
        console.warn('Sign out error:', e);
      }
    }

    await waitForUnauthenticated();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}

