import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticatorService } from '@aws-amplify/ui-angular';

/**
 * Protects app routes. Unauthenticated users are redirected to /login.
 * Preserves the originally requested URL in a query param.
 */
export const requireAuthGuard: CanActivateFn = (route, state) => {
  const authenticator = inject(AuthenticatorService);
  const router = inject(Router);

  if (authenticator.authStatus === 'authenticated') return true;

  return router.createUrlTree(['/login'], {
    queryParams: state.url && state.url !== '/' ? { redirect: state.url } : undefined,
  });
};

/**
 * Prevents authenticated users from visiting /login.
 */
export const redirectIfAuthedGuard: CanActivateFn = () => {
  const authenticator = inject(AuthenticatorService);
  const router = inject(Router);

  // During sign-out transitions `authStatus` can still be "authenticated" for a short time.
  // Let navigation to /login complete while Amplify is pending; the layout will already be routing
  // to /login after signOut, so this avoids the "two-click" behavior.
  if (authenticator.authStatus === 'authenticated' && !authenticator.isPending) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};

