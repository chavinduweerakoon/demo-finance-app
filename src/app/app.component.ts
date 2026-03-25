import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AmplifyAuthenticatorModule],
  templateUrl: './app.component.html',
  styles: [],
})
export class AppComponent {
  protected readonly title = 'Finance';

  private readonly auth = inject(AuthenticatorService);

  protected signOut(): void {
    void this.auth.signOut();
  }
}
