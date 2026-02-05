import { Component, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularPlugin } from '@microsoft/applicationinsights-angularplugin-js';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { Store } from '@ngrx/store';
import { environment } from 'src/environments/environment';
import { ApplicationState } from './stores/states/application-wide/app.state';
import { filter, Subscription } from 'rxjs';
import { ApplicationWideLoadingSelector } from './stores/selectors/application-wide/loading.selector';

@Component({
  selector: 'ntc-app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  title = 'nt-cloud';

  // 購読中のストリーム一覧
  private readonly subscriptions: Subscription[] = [];

  public isLoading: boolean = true;
  public loadingText: string | undefined = '';
  public subLoadingText: string | undefined = '';
  public opacity: number = 1.0;

  constructor(
    private router: Router,
    private readonly store: Store<ApplicationState>,
  ) {
    if (environment.ApplicationInsightString) {
      const angularPlugin = new AngularPlugin();
      const appInsights = new ApplicationInsights({
        config: {
          instrumentationKey: environment.ApplicationInsightString,
          extensions: [angularPlugin],
          extensionConfig: {
            [angularPlugin.identifier]: { router: this.router },
          },
        },
      });
      appInsights.loadAppInsights();
    }

    // ローディング状態取得
    this.addSubscriptionsList(
      this.store
        .select(ApplicationWideLoadingSelector.selectLoadingState)
        .pipe(filter((value) => value !== undefined))
        .subscribe((loadingState) => {
          this.isLoading = loadingState.isLoading;
          this.loadingText = loadingState.loadingText;
          this.subLoadingText = loadingState.subLoadingText;
          this.opacity = loadingState.opacity ?? 1.0;
        }),
    );
  }

  // 画面解放時
  public ngOnDestroy() {
    this.subscriptions.forEach((e) => {
      try {
        e.unsubscribe();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (exp) {
        //this.L.error(exp);
      }
    });
    this.subscriptions.length = 0;
  }

  @HostListener('contextmenu')
  preventContextMenu() {
    return false;
  }

  // Subscription待機行列に追加する
  private addSubscriptionsList(ele: Subscription) {
    this.subscriptions.push(ele);
  }
}
