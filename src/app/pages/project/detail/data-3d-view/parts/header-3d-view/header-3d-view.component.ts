import { Component, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { ApplicationState } from 'src/app/stores/states/application-wide/app.state';
import { ProjectAccessControlService } from 'src/app/services/project/project-access-control.service';
import { ImportPopupAction } from 'src/app/stores/actions/project/detail/data-3d-view/left-panel/import-popup/import-popup.action';
import {
  ClickActions,
  List3dViewFunction,
  ListAccordion,
  ListCommandIcon,
  NameKeyPanel,
} from '../right-panel/accordion-panel/accordion-panel.definition';
import { AccordionService } from '../right-panel/accordion-panel/accordion-panel.service';
import { AreaDisplayControlAction } from 'src/app/stores/actions/project/are-display-control.action';
import { NtCommand } from 'src/app/stores/states/project/area-display-control.state';

import { ImportPopupComponent } from '../../../common-parts/import-popup/import-popup.component';

@Component({
  selector: 'ntc-header-3d-view',
  templateUrl: './header-3d-view.component.html',
  styleUrl: './header-3d-view.component.scss',
})
export class Header3DViewComponent {
  @ViewChild('importPopup') importPopupRef: ImportPopupComponent | undefined;

  public commandListItems = ListCommandIcon;

  public measurement: NameKeyPanel = List3dViewFunction.measurement; // 'チェック計算'
  public handleCloud: NameKeyPanel = List3dViewFunction.handleCloud; // '点群編集'
  public constructionSupport: NameKeyPanel =
    List3dViewFunction.constructionSupport; // '施工用データ作成'
  public report: NameKeyPanel = List3dViewFunction.report; // 'レポート'

  public sendConstructionSetting: string = '設計データ送信';

  public constructionHistory: NameKeyPanel =
    List3dViewFunction.constructionHistory; // '施工履歴取得'

  constructionSupportActions = {
    設計データ送信: () => {
      this.dispatchActionScreen(NtCommand.SendConstructionSetting);
    },
  };

  public importPopupLoaded: boolean = false;

  private get actionsClick(): ClickActions {
    return {
      ...this.constructionSupportActions,
    };
  }

  constructor(
    private store: Store<ApplicationState>,
    public projectAccessControlService: ProjectAccessControlService,
    private accordionService: AccordionService,
  ) {}

  /**
   * コマンドメニューを開く
   */
  public openNtCommandMenu(key: NameKeyPanel) {
    // チェック計算
    if (key === this.measurement) {
      if (this.projectAccessControlService.isReadOnly()) {
        return;
      }
      // 点群編集
    } else if (key === this.handleCloud) {
      if (!this.projectAccessControlService.isPointCloudAvailable()) {
        return;
      }
      // 施工用データ作成
    } else if (key === this.constructionSupport) {
      if (this.projectAccessControlService.isReadOnly()) {
        return;
      }
      // 施工履歴取得
    } else if (key === this.constructionHistory) {
      if (
        !this.projectAccessControlService.isProductConstructionHistoryAvailable() ||
        !this.projectAccessControlService.isConstructionHistoryAvailable()
      ) {
        return;
      }
      // レポート
    } else if (key === this.report) {
      if (this.projectAccessControlService.isReadOnly()) {
        return;
      }
    }
    this.store.dispatch(
      AreaDisplayControlAction.ShowRightAreaAction({
        view_type: NtCommand.Panel3D,
      }),
    );
    this.accordionService.toggleItemState(key);
  }

  /**
   * コマンド画面を直接開く
   */
  public openNtCommand(key: string) {
    if (this.checkIfDisabled(key)) {
      return;
    }
    const action = this.actionsClick[key];

    if (action) {
      action();
    }
  }

  /**
   * インポート画面を開く
   */
  public openImportPopup() {
    if (!this.projectAccessControlService.isBasicAvailable()) {
      return;
    }
    this.importPopupLoaded = true;
    this.importPopupRef?.open();
    this.store.dispatch(ImportPopupAction.OpenImportPopup());
    this.store.dispatch(
      ImportPopupAction.GetListFileSelected({
        fileSelectedList: [],
      }),
    );
  }

  /**
   * メニューの使用権限があるかどうか
   */
  public checkIfDisabled(key: string): boolean {
    // handleCloud
    if (ListAccordion[1].content.findIndex((item) => item == key) >= 0) {
      return !this.projectAccessControlService.isPointCloudAvailable();
    }
    // constructionSupport
    if (ListAccordion[2].content.findIndex((item) => item == key) >= 0) {
      if (key === '設計データ送信' || key === '送信履歴') {
        return !this.projectAccessControlService.isConstructionSupportAvailable();
      } else {
        return !this.projectAccessControlService.isConstructionSupportEditAvailable();
      }
    }
    // constructionHistory
    if (ListAccordion[3].content.findIndex((item) => item == key) >= 0) {
      return (
        !this.projectAccessControlService.isProductConstructionHistoryAvailable() ||
        !this.projectAccessControlService.isConstructionHistoryAvailable()
      );
    }
    // report
    if (ListAccordion[4].content.findIndex((item) => item == key) >= 0) {
      if (key === '土工数量レポート') {
        return !this.projectAccessControlService.isBasicAvailable();
      } else {
        return !this.projectAccessControlService.isConstructionHistoryReportAvailable();
      }
    }
    return false;
  }

  /**
   * コマンド画面を開く
   */
  private dispatchActionScreen(ntCommandType: NtCommand) {
    this.store.dispatch(
      AreaDisplayControlAction.ShowRightAreaAction({
        view_type: ntCommandType,
      }),
    );
  }
}
