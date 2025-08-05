# Angular Integration

The recommended way to use HSM with Angular is through a service.

## The Service

```typescript
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class StateMachineService implements OnDestroy {
  private instance: any;
  private state$ = new BehaviorSubject<any>(null);
  private unsubscribe: () => void;

  init(machine: any, initialContext = {}) {
    this.instance = machine.start(initialContext);

    this.state$.next({
      current: this.instance.current,
      context: this.instance.context
    });

    this.unsubscribe = this.instance.subscribe(({ to }) => {
      this.state$.next({
        current: to,
        context: { ...this.instance.context }
      });
    });
  }

  get current$(): Observable<string> {
    return this.state$.pipe(map(state => state?.current));
  }

  get context$(): Observable<any> {
    return this.state$.pipe(map(state => state?.context));
  }

  send(event: string, payload?: any): Promise<any> {
    return this.instance.send(event, payload);
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }
}
```

## Usage Example

```typescript
import { Component, OnInit } from '@angular/core';
import { createMachine } from '@datnguyen1215/hsmjs';
import { StateMachineService } from './state-machine.service';

@Component({
  selector: 'app-auth',
  template: `
    <div *ngIf="current$ | async as current">
      <h2>State: {{ current }}</h2>

      <div *ngIf="current === 'loggedOut'">
        <input #email type="email" placeholder="Email">
        <input #password type="password" placeholder="Password">
        <button (click)="login(email.value, password.value)">Login</button>
      </div>

      <div *ngIf="current === 'authenticating'">
        <p>Logging in...</p>
      </div>

      <div *ngIf="current === 'loggedIn'">
        <p>Welcome {{ (context$ | async)?.user?.name }}!</p>
        <button (click)="logout()">Logout</button>
      </div>
    </div>
  `,
  providers: [StateMachineService]
})
export class AuthComponent implements OnInit {
  current$ = this.sm.current$;
  context$ = this.sm.context$;

  constructor(private sm: StateMachineService) {}

  ngOnInit() {
    // Define machine
    const machine = createMachine('auth');

    const loggedOut = machine.state('loggedOut');
    const authenticating = machine.state('authenticating');
    const loggedIn = machine.state('loggedIn');

    loggedOut.on('LOGIN', authenticating);

    authenticating
      .on('SUCCESS', loggedIn)
      .do(async (ctx, event) => {
        const user = await this.authService.login(event.email, event.password);
        ctx.user = user;
      })
      .on('ERROR', loggedOut);

    loggedIn.on('LOGOUT', loggedOut);

    machine.initial('loggedOut');

    // Initialize service
    this.sm.init(machine, { user: null });
  }

  async login(email: string, password: string) {
    await this.sm.send('LOGIN', { email, password });
  }

  async logout() {
    await this.sm.send('LOGOUT');
  }
}
```

## Key Points

- Service pattern works well with Angular's dependency injection
- RxJS observables for reactive state updates
- Automatic cleanup in `ngOnDestroy`
- Use async pipe in templates for clean subscriptions