import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import type { Subscription as RxSubscription } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [AmplifyAuthenticatorModule],
  templateUrl: './login.component.html',
  styles: [],
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authenticator = inject(AuthenticatorService);

  private sub: RxSubscription | null = null;
  private navigated = false;

  ngOnInit(): void {
    // If already authenticated, guard should redirect — but handle runtime sign-in too.
    this.sub = this.authenticator.subscribe(() => {
      if (this.navigated) return;

      // Navigate only after the Authenticator finishes its internal transition.
      if (this.authenticator.authStatus === 'authenticated' && !this.authenticator.isPending) {
        this.navigated = true;
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        const target = redirect && redirect !== '/login' ? redirect : '/dashboard';
        void this.router.navigateByUrl(target, { replaceUrl: true });
      }
    }) as unknown as RxSubscription;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.sub = null;
  }
}

