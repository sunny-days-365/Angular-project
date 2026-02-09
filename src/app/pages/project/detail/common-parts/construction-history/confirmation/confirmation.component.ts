import { Component, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { BaseComponent } from '@nikon-trimble-sok/parts-components';
import { BasicModalComponent } from 'src/app/parts-components/basic-modal/basic-modal.component';
import { FileTreeViewAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/file-tree-view/file-tree-view.action';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ConstructionHistoryEditModalComponent } from '../edit/construction-history.component';
import { NotificationManipulator } from 'src/app/stores/states/delayed-task/notification-management';
import {
  ExecutionManagementState,
  ExecutiveFunctions,
} from 'src/app/stores/states/delayed-task/delayed-task-definitions';
import { NotificationManagementAction } from 'src/app/stores/actions/delayed-task/notification-management.action';
import { Actions, ofType } from '@ngrx/effects';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { LockFuncName } from 'src/app/helper-utility/api-helper/projects-models';
import { extractAppMessage } from '@nikon-trimble-sok/common';

@Component({
  selector: 'ntc-toolbars-3d-construction-history-confirmation-modal',
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss',
})
export class ConstructionHistoryConfirmationModalComponent
  extends BaseComponent
  implements OnInit
{
  @ViewChild('modal') modal: BasicModalComponent | undefined;

  @ViewChild('constructionHistoryEditModal')
  constructionHistoryEditModal:
    | ConstructionHistoryEditModalComponent
    | undefined;

  public showEdit: boolean = false;

  // すべての施工履歴を再取得するかどうか
  public cleanupContructionData: boolean = false;

  public checkLocks: boolean = false;

  public errorMessage: string | undefined = undefined;

  constructor(
    private actions$: Actions,
    private store: Store<ApplicationState>,
    public projectAccessControlService: ProjectAccessControlService,
  ) {
    super('ConstructionHistoryConfirmationModalComponent');
  }

  ngOnInit(): void {
    // on patch activity
    this.addSubscriptionsList(
      this.actions$
        .pipe(
          ofType(
            FileTreeViewAction.FileTreeViewWideAction
              .PostContructionActivitiesCompletedAction,
          ),
        )
        .subscribe(() => {
          this.modal?.close();
        }),
    );
  }

  public open() {
    this.errorMessage = undefined;
    this.modal?.open();
    this.cleanupContructionData = false;
    return;
  }

  public onCleanupContructionDataChange(cleanupContructionData: boolean) {
    this.cleanupContructionData = cleanupContructionData;
  }

  /**
   * 施工履歴データ更新 - OKボタン
   */
  public async onOK() {
    if (!this.projectAccessControlService.isConstructionHistoryAvailable()) {
      return;
    }
    this.errorMessage = undefined;
    this.checkLocks = true;
    const locked = await this.projectAccessControlService.isLocked(
      LockFuncName.ConstructionData,
      null,
    );
    this.checkLocks = false;
    // ロックされている場合は変更不可
    if (locked) {
      this.errorMessage = extractAppMessage('SOK5002');
      return;
    }

    // 通知メッセージ管理処理を初期化する
    this.store.dispatch(
      NotificationManagementAction.SetNotificationManipulatorAction({
        executiveFunctions:
          ExecutiveFunctions.gpuWosConstructionDataCurrentActivityPost,
        manipulator: makeNotificationManipulator(),
      }),
    );

    this.store.dispatch(
      FileTreeViewAction.FileTreeViewWideAction.PostContructionActivitiesAction(
        {
          cleanupContructionData: this.cleanupContructionData,
        },
      ),
    );

    //this.modal?.close();
    return;
  }

  /**
   * 施工履歴取得設定 - キャンセル/閉じるボタン
   */
  public onClose() {
    this.errorMessage = undefined;
    this.modal?.close();
    return;
  }

  public openEditModal() {
    this.errorMessage = undefined;
    this.showEdit = true;
  }

  public closeEditModal() {
    this.showEdit = false;
  }
}

// 補助関数

// メッセージ通知時にメッセージ内容を指定する関数
function makeNotificationManipulator(): NotificationManipulator {
  return {
    makeNotificationMessage: (data) => {
      switch (data.executionManagementState) {
        case ExecutionManagementState.Request:
          return { message: '施工履歴取得を開始しました。', showToast: true };
        case ExecutionManagementState.DelayedTaskOccurred:
          return { message: '施工履歴データを取得中 ...', showToast: false };
        case ExecutionManagementState.Completed:
          return { message: '施工履歴取得が完了しました。', showToast: true };
        case ExecutionManagementState.Error:
          return { message: '施工履歴取得に失敗しました', showToast: true };
        default:
          return { message: '', showToast: false };
      }
    },
    makeOperationName: () => {
      return '施工履歴取得';
    },
  };
}
