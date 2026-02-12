import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { filter } from 'rxjs';
import { EulaAction } from 'src/app/stores/actions/application-wide/eula.action';
import { ApplicationWideLoadingAction } from 'src/app/stores/actions/application-wide/loading.action';
import { ProjectListAction } from 'src/app/stores/actions/project-list/project-list.action';
import { EulaSelector } from 'src/app/stores/selectors/application-wide/eula.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { InitialPageTransitionModelService } from 'src/app/stores/strage/services/page-transition/initial-page-transition.model.service';

@Component({
  selector: 'ntc-project--eula-check',
  templateUrl: './eula-check.component.html',
  styleUrl: './eula-check.component.scss',
})
export class EulaCheckComponent extends BaseComponent implements OnInit {
  public error: boolean = false;
  public noAgreement: boolean = false;
  constructor(
    private readonly store: Store<ApplicationState>,
    private readonly actions$: Actions,
    private router: Router,
  ) {
    super('EulaCheckComponent');

    this.addSubscriptionsList(
      this.store
        .select(EulaSelector.selectEulaAgreed)
        .pipe(filter((value) => value !== undefined))
        .subscribe((agreed) => {
          if (agreed) {
            const path = (() => {
              const s = new InitialPageTransitionModelService();
              const m = s.get();
              // プロジェクトID指定
              if (m?.projectId) {
                return 'pages/project-existence-check/' + m.projectId;
              }
              // 開発環境：プロジェクトID指定なし
              return 'pages/project-list';
            })();
            this.router.navigate([path]);
          } else {
            // ローディング停止
            this.store.dispatch(
              ApplicationWideLoadingAction.StopLoadingAction(),
            );
            this.store.dispatch(EulaAction.ShowEulaAction({ showOnly: false }));
            this.noAgreement = true;
          }
        }),
    );
  }

  async ngOnInit(): Promise<void> {
    this.store.dispatch(
      ApplicationWideLoadingAction.OnLoadingAction({
        loadingText: '利用規約を確認中',
        subLoadingText: '利用許諾契約を確認しています。',
      }),
    );

    // サーバー初期化
    this.store.dispatch(ProjectListAction.InitializeServerAction());
  }

  /**
   * 利用許諾契約表示
   */
  public openEula() {
    this.store.dispatch(EulaAction.ShowEulaAction({ showOnly: false }));
  }
}
