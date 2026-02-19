import { Store, select } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';

import { Title } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ConstructionProgressSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/construction-progress.selector';
import { extractErrorMessage } from 'src/app/helper-utility/error-helper/error-helper';
import { DashboardWideAction } from 'src/app/stores/actions/project/detail/dashboard-view/dashboard-wide.action';
import { ConstructionProgressForView } from 'src/app/stores/states/project/detail/dashboard-view/construction-progress.state';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';

@Component({
  selector:
    'ntc-project-project-dashboard-view-construction-progress-list-component',
  templateUrl: './construction-progress-list.component.html',
  styleUrls: ['./construction-progress-list.component.scss'],
  providers: [Title],
})
export class ConstructionProgressListComponent extends BaseComponent {
  // 読み込み中の判定
  public readonly isLoading$: Observable<boolean>;

  public rawDataArray: ConstructionProgressForView[] | undefined;

  public isSidebarExpanded: boolean = false;

  constructor(
    private store: Store<ApplicationState>,
    private actions$: Actions,
  ) {
    super('ConstructionProgressListComponent');
    this.store
      .pipe(select(ConstructionProgressSelector.selectorConstructionProgress))
      .subscribe((item) => {
        this.rawDataArray = item?.rawData;
        if (item?.rawData) {
          const array = [...item.rawData];
          array.sort((a, b) =>
            (b.dateTime ?? '').localeCompare(a.dateTime ?? ''),
          );
          this.rawDataArray = array;
        }
      });

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
        }),
    );

    this.isLoading$ = this.store.pipe(
      select(ConstructionProgressSelector.selectorConstructionProgress),
      map((x) => {
        if (!x) {
          return true;
        } else if (true == x?.inProcess) {
          return true;
        }
        return false;
      }),
      catchError((err) => {
        // 処理でエラーが発生したら、エラーアクションをなげる
        this.store.dispatch(
          DashboardWideAction.OnErrorAction({
            message: extractErrorMessage(err),
            rawError: err,
            recoveryAction: DashboardWideAction.BulkUpdateAction(),
          }),
        );
        return of(false);
      }),
    );
  }
}
