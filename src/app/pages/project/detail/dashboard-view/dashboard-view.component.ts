import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { Store, select } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import {
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  finalize,
  firstValueFrom,
  map,
  of,
  takeUntil,
} from 'rxjs';
import { NTError } from '@nikon-trimble-sok/parts-components';
import { DashboardWideSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/dashboard-wide.selector';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { DashboardWideAction } from 'src/app/stores/actions/project/detail/dashboard-view/dashboard-wide.action';
import { NavbarOuterFrameSelector } from 'src/app/stores/selectors/project/navbar-outer-frame.selector';
import {
  AlertWidthSize,
  AlertWidthSizeSideBarExpanded,
} from 'src/app/helper-utility/data-type-helper/alert-size';
import {
  ConstructionActivity,
  ConstructionProgress,
  ConstructionSettings,
  LocksService,
} from '@nikon-trimble-sok/api-sdk-d3';
import { Actions, ofType } from '@ngrx/effects';
import { ConstructionActivityAction } from 'src/app/stores/actions/project/construction-activity.action';
import { ConstructionActivitySelector } from 'src/app/stores/selectors/project/construction-activity.selector';
import { ConstructionSettingsSelector } from 'src/app/stores/selectors/project/construction-settings.selector';
import { ApplicationStateSelector } from 'src/app/stores/selectors/application-wide/application-state.selector';
import { ConstructionSettingsAction } from 'src/app/stores/actions/project/construction-settings.action';
import { FormControl, FormGroup } from '@angular/forms';
import { PLACEHOLDER_ACTIVITY } from './dashboard-view.defination';
import { AreaDisplayControlAction } from 'src/app/stores/actions/project/are-display-control.action';
import {
  MainAreaComponentType,
  NtCommand,
} from 'src/app/stores/states/project/area-display-control.state';
import { ConstructionHistoryConfirmationModalComponent } from '../common-parts/construction-history/confirmation/confirmation.component';
import { SelectDataItem } from '@nikon-trimble-sok/parts-components';
import { BasicSelectComponent } from '@nikon-trimble-sok/parts-components';
import { NotificationManipulator } from 'src/app/stores/states/delayed-task/notification-management';
import {
  ExecutionManagementState,
  ExecutiveFunctions,
} from 'src/app/stores/states/delayed-task/delayed-task-definitions';
import { NotificationManagementAction } from 'src/app/stores/actions/delayed-task/notification-management.action';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { DashBoardContentType } from 'src/app/stores/states/project/detail/dashboard-view/dashboard.state';
import { ConstructionProgressSelector } from 'src/app/stores/selectors/project/detail/dashboard-view/construction-progress.selector';
import { extractAppMessage } from '@nikon-trimble-sok/common';
import { ApplicationWideLoadingAction } from 'src/app/stores/actions/application-wide/loading.action';

@Component({
  selector: 'ntc-project-project-dashboard-view',
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.scss'],
  providers: [Title],
})
export class DashboardViewComponent
  extends BaseComponent
  implements OnInit, OnDestroy
{
  @ViewChild('selectActivityComponent')
  selectActivityComponent: BasicSelectComponent | undefined;

  @ViewChild('constructionHistoryModal')
  constructionHistoryModal:
    | ConstructionHistoryConfirmationModalComponent
    | undefined;

  // エラー情報
  public readonly errors$: Observable<NTError[] | undefined>;

  public isSidebarExpanded: boolean = false;

  public projectId: string | undefined;

  public isLoading: boolean = true;
  public isActivityLoading: boolean = false;

  public loadingText: string = '読み込み中 ...';
  public activityLoadingText: string = '計算中 ...';

  public optionsActivity: SelectDataItem[] | undefined;

  // 進捗確認設定
  private activityList: ConstructionActivity[] | undefined;

  // 選択中の進捗確認設定
  public currentActivity: ConstructionActivity | undefined;

  // 計算条件設定
  private constructionSettings?: ConstructionSettings;

  public selectActivityPlaceHolder = PLACEHOLDER_ACTIVITY;

  public form: FormGroup = new FormGroup({
    selectActivity: new FormControl(''),
  });

  public checkLocks: boolean = false;

  private lastSelectedActivityId?: string;

  private onDestroySubject$ = new Subject();

  // エラーを閉じる処理
  public errorClose(e: NTError) {
    // リカバーアクションを投げる
    this.store.dispatch(
      DashboardWideAction.ResetErrorAction({
        targetError: e,
      }),
    );
  }

  public widthSidebarExpanded: string = AlertWidthSize.Main;

  public contentType: DashBoardContentType | undefined =
    DashBoardContentType.NOT_LOADED;

  public NOT_LOADED = DashBoardContentType.NOT_LOADED;
  public CALCULATION_IN_PROGRESS = DashBoardContentType.CALCULATION_IN_PROGRESS;
  public EMPTY_ACTIVITY = DashBoardContentType.EMPTY_ACTIVITY;
  public ERROR = DashBoardContentType.ERROR;
  public HAS_ACTIVITY = DashBoardContentType.HAS_ACTIVITY;

  public currentMenu: MainAreaComponentType | undefined = undefined;

  public lastConstructionProgress: ConstructionProgress | undefined;

  private emptyDate = '0001-01-01T00:00:00+00:00';

  constructor(
    private actions$: Actions,
    private store: Store<ApplicationState>,
    public projectAccessControlService: ProjectAccessControlService,
    private locksService: LocksService,
  ) {
    super('DashboardViewComponent');

    this.addSubscriptionsList(
      this.store
        .select(NavbarOuterFrameSelector.selectorSideBarExpanded)
        .subscribe((sidebarExpanded: boolean) => {
          this.isSidebarExpanded = sidebarExpanded;
          this.widthSidebarExpanded = sidebarExpanded
            ? AlertWidthSizeSideBarExpanded.Main
            : AlertWidthSize.Main;
        }),
    );

    // Memo
    // 通常のルーティング遷移じゃなくて、コンポーネント単位の表示切り替えなので、
    // 隠れていたコンポーネントが再表示されたときにここが呼ばれないことがある。
    // そこで、effector側で再描画処理を行うようにする。

    // // 進捗確認の各カードの表示要素を更新する
    // this.store.dispatch(DashboardWideAction.BulkUpdateAction());

    // 表示画面制御
    this.addSubscriptionsList(
      this.actions$
        .pipe(ofType(DashboardWideAction.ToggleContentTypeAction))
        .subscribe((act) => {
          this.contentType = act.contentType;
          if (this.contentType === DashBoardContentType.NOT_LOADED) {
            this.showLoadingSpinner();
          } else {
            this.stopLoadingSpinner();
          }
        }),
    );

    // エラー表示用のストリーム
    this.errors$ = this.store.pipe(
      select(DashboardWideSelector.selectorDashboardWideError),
      map((x) => {
        return x?.errors;
      }),
    );

    // 開いてるメニュー取得
    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.MainAreaSelector.selectorViewType)
        .subscribe((menu) => {
          this.currentMenu = menu;
        }),
    );
  }

  ngOnInit(): void {
    // form初期状態
    this.form.controls['selectActivity'].disable({ emitEvent: false });

    // select projectId
    this.addSubscriptionsList(
      this.store
        .select(ApplicationStateSelector.selectorProjectId)
        .subscribe((projectId) => {
          this.projectId = projectId;
          this.reset();
          if (this.projectId) {
            // 計算条件設定取得
            this.store.dispatch(
              ConstructionSettingsAction.GetConstructionSettingsAction({
                projectId: this.projectId,
              }),
            );
          }
        }),
    );

    this.addSubscriptionsList(
      this.store
        .select(ConstructionSettingsSelector.selectConstructionSettings)
        .pipe(takeUntil(this.onDestroySubject$))
        .pipe(
          distinctUntilChanged((prev, curr) => {
            return prev?.inProcess === curr?.inProcess;
          }),
        )
        .subscribe((constructionSettingsState) => {
          this.isLoading = constructionSettingsState?.inProcess ?? true;

          // 計算条件設定
          if (
            constructionSettingsState?.constructionSettings &&
            JSON.stringify(this.constructionSettings) !=
              JSON.stringify(constructionSettingsState.constructionSettings)
          ) {
            this.constructionSettings = {
              ...constructionSettingsState.constructionSettings,
            };
          }

          if (!this.isLoading) {
            // 進捗確認設定の登録数と計算条件設定に応じて進捗確認設定選択タブの状態切り替え
            this.updateSelectActivityState();
            this.stopLoadingSpinner();
          } else {
            this.form.controls['selectActivity'].disable({
              emitEvent: false,
            });
          }
        }),
    );

    // ConstructionProgressSelector.selectorConstructionProgress
    this.addSubscriptionsList(
      this.store
        .select(ConstructionProgressSelector.selectorConstructionProgress)
        .subscribe((constructionProgressState) => {
          if (constructionProgressState && constructionProgressState.rawData) {
            const tmpList = [...constructionProgressState.rawData];
            const _list = tmpList.sort(constructionProgressSortByTime);
            if (_list.length > 0 && _list[0].dateTime !== this.emptyDate) {
              this.lastConstructionProgress = { ..._list[0] };
            }
          }
        }),
    );

    // on change selectActivity
    this.addSubscriptionsList(
      this.form.controls['selectActivity'].valueChanges.subscribe(
        async (value) => {
          if (
            !value ||
            (this.currentActivity &&
              this.currentActivity.id == this.lastSelectedActivityId &&
              this.lastSelectedActivityId == value)
          ) {
            return;
          }

          // アクティビティのロック確認
          if (this.projectId && this.lastSelectedActivityId) {
            this.checkLocks = true;
            // 再計算ロック確認
            const locked = await firstValueFrom(
              this.locksService
                .projectsProjectIdLocksLockflagGet(
                  this.projectId,
                  'ConstructionActivity',
                  this.lastSelectedActivityId ?? '',
                )
                .pipe(
                  map((lockInfo) => {
                    // ロックされているかどうか
                    return (
                      !!lockInfo &&
                      (lockInfo.id != '' || lockInfo.funcName != '')
                    );
                  }),
                  finalize(() => {
                    this.checkLocks = false;
                  }),
                  catchError((err) => {
                    DashboardWideAction.ShowErrorToastAction({
                      message: extractAppMessage(err),
                    });
                    return of(true);
                  }),
                ),
            );

            // ロックされている場合は変更不可
            if (locked) {
              this.form.controls['selectActivity'].patchValue(
                this.lastSelectedActivityId,
                { emitEvent: false },
              );
              this.store.dispatch(
                DashboardWideAction.ShowErrorToastAction({
                  message: extractAppMessage('SOK5001'),
                }),
              );
              return;
            }
          }

          const selectedActivity = this.activityList?.find(
            (item) => item.id === value,
          );
          if (selectedActivity && selectedActivity.id) {
            this.currentActivity = selectedActivity;
            this.lastSelectedActivityId = selectedActivity.id;
            if (
              this.lastSelectedActivityId !=
              this.constructionSettings?.constructionActivityId
            ) {
              this.updateConstructionSettings(
                this.lastSelectedActivityId,
                this.currentActivity.name ?? '',
              );
            }
          } else {
            this.currentActivity = undefined;
            this.contentType = this.EMPTY_ACTIVITY;
          }
        },
      ),
    );

    // on update
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            ConstructionActivityAction.UpdateConstructionActivityCompleteAction,
          ),
        )
        .subscribe(() => {
          if (!this.currentActivity) return;
          const selectedActivity = this.activityList?.find(
            (item) => item.id === this.currentActivity?.id,
          );
          if (selectedActivity && selectedActivity.id) {
            this.currentActivity = selectedActivity;
          }
        }),
    );

    // 進捗確認更新中
    this.addSubscriptionsList(
      this.store
        .select(ConstructionActivitySelector.selectConstructionActivityState)
        .subscribe((constructionActivityState) => {
          this.isActivityLoading =
            constructionActivityState?.inProcess ?? false;

          // 進捗確認設定
          if (
            constructionActivityState?.constructionActivityList &&
            (!this.activityList ||
              this.activityList.length !=
                constructionActivityState.constructionActivityList.length ||
              !this.isArrayEqual(
                this.activityList,
                constructionActivityState.constructionActivityList,
              ))
          ) {
            const tmpConstructionActivityList = [
              ...constructionActivityState.constructionActivityList,
            ];
            this.activityList = tmpConstructionActivityList.sort(
              constructionActivitySortByName,
            );
            this.optionsActivity = [];
            this.activityList.forEach((item) => {
              this.optionsActivity?.push({
                id: '' + item.id,
                label: item.name ?? '',
                disabled: this.isDisabled(item),
              });
            });
          }

          if (!this.isActivityLoading) {
            // 進捗確認設定の登録数と計算条件設定に応じて進捗確認設定選択タブの状態切り替え
            this.updateSelectActivityState();
          } else {
            this.form.controls['selectActivity'].disable({
              emitEvent: false,
            });
          }
        }),
    );
  }

  /**
   * 施工履歴データ更新画面を開く
   */
  public openConstructionHistoryModal(): void {
    if (!this.projectAccessControlService.isConstructionHistoryAvailable()) {
      return;
    }
    this.constructionHistoryModal?.open();
  }

  /**
   * 進捗確認設定画面を開く
   */
  openActivitySetting(): void {
    if (
      !this.projectAccessControlService.isConstructionHistoryReportAvailable()
    ) {
      return;
    }
    this.store.dispatch(
      AreaDisplayControlAction.ShowRightAreaAction({
        view_type: NtCommand.ActivitySetting,
      }),
    );
  }

  /**
   * 進捗確認設定追加画面を開く
   */
  openRegistActivitySettingModal(): void {
    if (
      !this.projectAccessControlService.isConstructionHistoryReportAvailable()
    ) {
      return;
    }
    this.store.dispatch(
      AreaDisplayControlAction.ShowRightAreaAction({
        view_type: NtCommand.AddActivitySetting,
      }),
    );
  }

  public override ngOnDestroy(): void {
    this.isLoading = true;
    this.isActivityLoading = false;
    this.optionsActivity = undefined;
    this.constructionSettings = undefined;
    this.currentActivity = undefined;
    this.contentType = undefined;
    this.lastSelectedActivityId = undefined;
    this.onDestroySubject$.next(void 0);
    super.ngOnDestroy();
  }

  /**
   * アクティビティ再計算
   */
  private updateConstructionSettings(activityId: string, activityName: string) {
    if (!this.projectId) {
      return;
    }

    // 通知メッセージ管理処理を初期化する
    this.store.dispatch(
      NotificationManagementAction.SetNotificationManipulatorAction({
        executiveFunctions: ExecutiveFunctions.updateConstructionSettings,
        manipulator: makeNotificationManipulator(activityName),
      }),
    );

    // アクティビティ再計算
    this.store.dispatch(
      ConstructionSettingsAction.UpdateConstructionSettingsAction({
        projectId: this.projectId,
        constructionActivityId: activityId,
      }),
    );
  }

  /**
   * 現場を変更した場合にリセットする
   */
  private reset(): void {
    this.showLoadingSpinner();
    if (this.selectActivityComponent) {
      this.selectActivityComponent.clearSelected();
    }
    // form初期状態
    this.form.controls['selectActivity'].disable({ emitEvent: false });
    this.isLoading = true;
    this.isActivityLoading = false;
    this.optionsActivity = undefined;
    this.constructionSettings = undefined;
    this.currentActivity = undefined;
    this.lastSelectedActivityId = undefined;
    this.lastConstructionProgress = undefined;
    this.onDestroySubject$.next(void 0);
  }

  /**
   * 計算条件設定からアクティビティを設定する
   */
  private applyCurrentActivity(): void {
    if (!this.optionsActivity || !this.constructionSettings) {
      return;
    }
    if (this.constructionSettings?.constructionActivityId) {
      const tmpItem = this.optionsActivity.find(
        (item) => item.id == this.constructionSettings?.constructionActivityId,
      );
      if (tmpItem && this.selectActivityComponent) {
        this.selectActivityComponent.select(tmpItem);
      }
    } else {
      if (this.selectActivityComponent) {
        this.currentActivity = undefined;
        this.selectActivityComponent?.clearSelected();
      }
    }
  }

  /**
   * 進捗確認設定の登録数と計算条件設定に応じて進捗確認設定選択タブの状態切り替え
   */
  private updateSelectActivityState(): void {
    if (
      !this.constructionSettings ||
      !this.optionsActivity ||
      (this.optionsActivity && this.optionsActivity.length <= 0)
    ) {
      this.currentActivity = undefined;
      this.selectActivityComponent?.clearSelected();
      this.form.controls['selectActivity'].disable({
        emitEvent: false,
      });
    } else {
      this.form.controls['selectActivity'].enable({
        emitEvent: false,
      });
      this.applyCurrentActivity();
    }
  }

  /**
   * 簡易配列比較
   */
  private isArrayEqual(
    array1: ConstructionActivity[],
    array2: ConstructionActivity[],
  ): boolean {
    array1 = [...array1];
    array2 = [...array2];

    let i = array1.length;
    if (i != array2.length) return false;

    // IDでソート
    array1 = array1.sort(constructionActivitySortByID);
    array2 = array2.sort(constructionActivitySortByID);

    while (i--) {
      if (JSON.stringify(array1[i]) !== JSON.stringify(array2[i])) return false;
    }
    return true;
  }

  /**
   * 選択可能な進捗確認設定かチェック
   */
  private isDisabled(activity: ConstructionActivity): boolean {
    return !activity.designSurfaceId || !activity.existingGroundId;
  }

  /**
   * 全体用のローディングスピナー表示
   */
  private showLoadingSpinner(): void {
    if (this.currentMenu === MainAreaComponentType.Dashboard) {
      this.store.dispatch(
        ApplicationWideLoadingAction.OnLoadingAction({
          loadingText: '施工履歴情報を取得中',
          subLoadingText: '指定された現場の施工履歴情報を取得しています。',
          opacity: 0.7,
        }),
      );
    }
  }

  /**
   * 全体用のローディングスピナー停止
   */
  private stopLoadingSpinner(): void {
    if (this.currentMenu === MainAreaComponentType.Dashboard) {
      this.store.dispatch(ApplicationWideLoadingAction.StopLoadingAction());
    }
  }
}

// 補助関数

/**
 * 進捗確認設定配列ソート用
 */
function constructionActivitySortByID(
  a: ConstructionActivity,
  b: ConstructionActivity,
): number {
  if (!a.id || !b.id) {
    if (!a.id && b.id) {
      return 1;
    } else if (a.id && !b.id) {
      return -1;
    } else {
      return 0;
    }
  } else {
    if (a.id == b.id) {
      return 0;
    } else if (a.id > b.id) {
      return -1;
    } else {
      return 1;
    }
  }
}
function constructionActivitySortByName(
  a: ConstructionActivity,
  b: ConstructionActivity,
): number {
  if (!a.name || !b.name) {
    if (!a.name && b.name) {
      return -1;
    } else if (a.name && !b.name) {
      return 1;
    } else {
      return 0;
    }
  } else {
    if (a.name == b.name) {
      return constructionActivitySortByID(a, b);
    } else if (a.name > b.name) {
      return 1;
    } else {
      return -1;
    }
  }
}

/**
 * 施工履歴配列ソート用
 */
function constructionProgressSortByTime(
  a: ConstructionProgress,
  b: ConstructionProgress,
): number {
  if (!a.dateTime || !b.dateTime) {
    if (!a.dateTime && b.dateTime) {
      return 1;
    } else if (a.dateTime && !b.dateTime) {
      return -1;
    } else {
      return 0;
    }
  } else {
    const aTime = new Date(a.dateTime).getTime();
    const bTime = new Date(b.dateTime).getTime();
    if (aTime == bTime) {
      return 0;
    } else if (aTime > bTime) {
      return -1;
    } else {
      return 1;
    }
  }
}

// メッセージ通知時にメッセージ内容を指定する関数
function makeNotificationManipulator(
  activitySettingName: string,
): NotificationManipulator {
  return {
    makeNotificationMessage: (data) => {
      switch (data.executionManagementState) {
        case ExecutionManagementState.Request:
          return {
            message: '進捗確認設定の更新を開始しました。',
            showToast: true,
          };
        case ExecutionManagementState.DelayedTaskOccurred:
          return {
            message: `${activitySettingName}を更新中 ...`,
            showToast: false,
          };
        case ExecutionManagementState.Completed:
          return {
            message: '進捗確認設定の更新が完了しました。',
            showToast: true,
          };
        case ExecutionManagementState.Error:
          return {
            message: '進捗確認設定の更新に失敗しました。',
            showToast: true,
          };
        default:
          return { message: '', showToast: false };
      }
    },
    makeOperationName: () => {
      return '進捗確認設定';
    },
  };
}
